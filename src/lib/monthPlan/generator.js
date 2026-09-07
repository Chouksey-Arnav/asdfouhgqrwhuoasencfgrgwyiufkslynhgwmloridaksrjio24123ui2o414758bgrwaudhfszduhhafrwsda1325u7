// ─────────────────────────────────────────────────────────────────────────────
// Building a month plan.
//
// ── One AI call, and it cannot add anything ─────────────────────────────────
// The twelve-month roadmap spends five Oracle passes because a year is a
// strategy problem. A month is not: rules.js has already decided what belongs
// on the plan, from real numbers, and the only thing a model is genuinely
// better at is saying what the month is FOR in a sentence the student
// recognizes as being about them.
//
// So there is exactly one call, it is optional, and its output is passed
// through a whitelist:
//   • `objective`   — the month's thesis. Prose only.
//   • `direction`   — one paragraph on where this student is heading.
//   • `weekThemes`  — four short phrases. Prose only.
//   • `sharpen`     — { actionId: reason } for action ids WE gave it. Any id it
//                     invents is discarded; any action it omits keeps the
//                     deterministic reason it already had.
// There is no field in which it could return a new action, a date, a program,
// or a number. A model cannot hallucinate a deadline it was never asked for.
//
// ── It never fails ──────────────────────────────────────────────────────────
// A failed, refused, slow or unconfigured call produces the deterministic plan
// with `generation.degraded = true` and a reason the UI states honestly, the
// same contract createRoadmap() established. The deterministic plan is a real
// plan — every action, every date and every definition of done is already there
// before the model is asked anything.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, shiftDays } from '../timeline.js';
import { buildMonthSignals } from './signals.js';
import { buildCandidates, scheduleCandidates, cycleCapacityHours } from './rules.js';
import {
  MONTH_PLAN_VERSION, CYCLE_WEEKS, buildWeeks, cycleEndFor, monthPlanFingerprint,
  scrubClaims, assertTraceable, allActions, ACTION_DOMAINS,
} from './model.js';
import { TERMINAL_CODES, parseLooseJSON, degradedReasonFor } from '../roadmap/generator.js';
import { PLAN_HORIZONS, defaultHorizon } from './yearly.js';

const TIMEOUT_MS = 42000;
const ATTEMPTS = 2;
const BACKOFF_MS = [1500];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const str = (v, max = 600) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// ── The one call ─────────────────────────────────────────────────────────────

async function callOnce({ system, user, lane }) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const r = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system, message: user, maxTokens: 1800,
        // The same purpose and key pool the year roadmap uses. A month plan is
        // the same kind of artifact for the same student — giving it its own
        // purpose would split one budget into two that cannot see each other.
        purpose: 'roadmap', tier: 'oracle', jsonMode: true, reasoningEffort: 'medium',
        lane,
      }),
      signal: controller ? controller.signal : undefined,
    });
    if (!r.ok) {
      let code = null;
      try {
        const body = await r.json();
        if (typeof body?.code === 'string') code = body.code;
      } catch { /* a non-JSON error body is still an error */ }
      return { ok: false, code, terminal: !!code && TERMINAL_CODES.has(code) };
    }
    const data = await r.json().catch(() => ({}));
    const content = typeof data?.content === 'string' ? data.content : null;
    if (!content) return { ok: false, code: 'unreachable', terminal: false };
    return { ok: true, json: parseLooseJSON(content) };
  } catch {
    return { ok: false, code: 'unreachable', terminal: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callWithRetry(spec) {
  let last = { ok: false, code: 'unreachable', terminal: false };
  for (let i = 0; i < ATTEMPTS; i += 1) {
    last = await callOnce(spec);
    if (last.ok || last.terminal) return last;
    if (i < ATTEMPTS - 1) await sleep(BACKOFF_MS[i] || 1500);
  }
  return last;
}

// ── The prompt ───────────────────────────────────────────────────────────────

/**
 * What the model is told about the student.
 *
 * Deliberately a DIGEST, not the portfolio. The month plan already knows every
 * fact it needs; the model is being asked for judgment about emphasis, and
 * handing it four hundred rows to re-derive that judgment from would cost
 * tokens, latency and accuracy at once. Same discipline as
 * buildStudentIntelBlock: pre-render, do not hand over raw rows.
 */
export function buildPlanPrompt(signals, actions) {
  const s = signals;
  const line = (label, value) => (value == null || value === '' ? null : `${label}: ${value}`);
  const facts = [
    line('Grade', s.student.gradeLabel),
    line('Graduating', s.student.graduationYear),
    line('Months until applications go in', s.student.monthsToApplication),
    line('Direction', [s.direction.healthcareFocus, s.direction.major].filter(Boolean).join(' / ')),
    line('Personal interests they have named', (s.direction.personal || []).join(', ')),
    line('College list', s.colleges.counts.total
      ? `${s.colleges.counts.dream} dream, ${s.colleges.counts.reach} reach, ${s.colleges.counts.target} target, ${s.colleges.counts.safety} safety${s.colleges.focusSchools.length ? `. Hardest targets: ${s.colleges.focusSchools.map((c) => c.name).join(', ')}` : ''}`
      : 'empty'),
    line('Ambition tier implied by their own list', s.colleges.ambitionTier),
    line('GPA', s.academics.hasData ? `${s.academics.latestGpa}${s.academics.latestWeighted ? ' weighted' : ''} (unweighted-equivalent ${s.academics.comparableGpa}), trend ${s.academics.trend}` : 'not logged'),
    line('Course rigor recorded', s.academics.hasRigorNote ? 'yes' : 'no'),
    line('Testing', s.testing.latestComposite ? `${s.testing.latestType} ${s.testing.latestComposite}${s.testing.impliedSat ? `, their list implies about ${s.testing.impliedSat}` : ''}` : 'no score logged'),
    line('Activities', `${s.activities.count}${s.activities.guidance ? ` (their grade usually rewards ${s.activities.guidance.min}-${s.activities.guidance.max})` : ''}, average depth ${s.activities.slate.avgScore}/100, ${s.activities.leadershipCount} with leadership, about ${s.activities.weeklyHours}h/week`),
    line('Leadership stage', s.leadership.stage),
    line('Service (SELF-REPORTED, never verified)', s.service.hasAnyLog ? `${s.service.total} logged hours at about ${s.service.monthlyRate}h/month, projecting to ${s.service.projectedTotal} against a ${s.service.targetHours}h planning reference` : 'nothing logged'),
    line('Time they say they have', s.constraints.weeklyHours ? `${s.constraints.weeklyHours}h/week` : s.constraints.timeAvailability),
    line('Cost sensitivity', s.constraints.cost),
    line('Transport limits', s.constraints.transport),
    line('Family responsibilities', s.constraints.family),
    line('Their most recent check-in, in their words', s.checkin.latestText),
    line('Self-reported strain', s.wellbeing.strained ? 'yes — they said the load is heavy' : 'no'),
    line('Things they have already declined or refused (never re-suggest)', s.feedback.suppressedLabels.map((l) => `${l.label} (${l.status.replace(/_/g, ' ')})`).join('; ')),
    line('Risks we already detected', s.risks.map((r) => r.title).join('; ')),
  ].filter(Boolean).join('\n');

  const actionList = actions.map((a) => `- ${a.id} [${a.domain}] ${a.title} — current reason: ${a.reason}`).join('\n');

  const system = `You are Medabrain, writing the framing for ONE MONTH of a high-school student's admissions and career-exploration plan. The plan itself is already built: every action, every date and every definition of done below was produced deterministically from this student's real record. You are NOT choosing what they do. You are saying what this month is FOR, and making the reasons sound like they are about this person.

Return ONLY a JSON object with exactly these keys:
{
  "objective": { "headline": "<=70 chars, the one thing this month is about", "body": "2-3 sentences, second person, concrete", "why": "1-2 sentences on what it changes" },
  "direction": "<=280 chars on where this student appears to be heading and what their profile is currently strongest and weakest at",
  "weekThemes": ["<=40 chars", "<=40 chars", "<=40 chars", "<=40 chars"],
  "sharpen": { "<action id>": "a better one-sentence reason for THIS student, <=200 chars" }
}

Hard rules, all of them non-negotiable:
- NEVER promise, guarantee or imply an admissions outcome. Never say anything will "get them in", "secure a spot", or guarantee a top-10/top-20/top-30 result. Say what an action changes about their record, not what it changes about their odds.
- NEVER invent an action, a program, a deadline, a date, a number or a fact about this student. Only use the facts given.
- Only use action ids from the list. An id that is not in the list is discarded.
- Be ambitious and specific, never generic and never flattering. If their record is thin, say what is thin. If they are overloaded, the month is about subtraction.
- Service hours are always self-reported. Never describe them as verified.
- Never tell them we can tutor them for the SAT/ACT — we set the target and the next action, outside resources do the teaching.
- Second person, plain sentences, no exclamation marks, no motivational filler.`;

  const user = `THE STUDENT
${facts}

THE ACTIONS ALREADY ON THEIR MONTH (ids are exact)
${actionList}

Write the month's framing.`;

  return { system, user };
}

// ── Assembly ─────────────────────────────────────────────────────────────────

/** The deterministic month plan — complete, usable, and built before any model is asked anything. */
export function heuristicMonthPlan({ user = null, signals, horizon = defaultHorizon() }) {
  const cycleStart = signals.today;
  const candidates = buildCandidates(signals);
  const scheduled = scheduleCandidates(candidates, signals);
  const weeks = buildWeeks(cycleStart, defaultWeekThemes(signals));

  const plan = {
    version: MONTH_PLAN_VERSION,
    id: `month-${cycleStart}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // ── Yearly-plan hook ─────────────────────────────────────────────────────
    // The horizon this document covers. Today every plan is built at 'month';
    // the yearly plan (see yearly.js) is the same document shape with a longer
    // horizon and twelve cycles instead of one, which is why it is a field
    // rather than a different type.
    horizon,
    cycleIndex: 0,
    cycleStart,
    cycleEnd: cycleEndFor(cycleStart),
    gradeStage: signals.student.gradeStage,
    gradeNumber: signals.student.gradeNumber,
    graduationYear: signals.student.graduationYear,

    objective: defaultObjective(signals),
    direction: {
      summary: defaultDirection(signals),
      ambitionTier: signals.colleges.ambitionTier,
      focusSchools: signals.colleges.focusSchools.map((c) => ({ id: c.id, name: c.name, category: c.category })),
      inferredDream: signals.colleges.inferredDream ? signals.colleges.inferredDream.name : null,
      watchOut: signals.risks.filter((r) => r.severity !== 'note').map((r) => r.title),
    },

    actions: scheduled.actions,
    backlog: scheduled.backlog,
    weeks: weeks.map((w, i) => ({ ...w, capacityHours: scheduled.weekLoad[i] })),
    capacityHours: scheduled.capacity,

    opportunityPlan: buildOpportunityPlan(signals),
    activityPlan: buildActivityPlan(signals),
    leadershipPath: buildLeadershipPath(signals),
    servicePlan: buildServicePlan(signals),
    academicPlan: buildAcademicPlan(signals),

    risks: signals.risks,
    reminders: buildReminders(scheduled.actions, signals),
    checkin: {
      due: signals.checkin.due,
      lastAt: signals.checkin.lastAt,
      academicUpdateDue: signals.checkin.academicUpdateDue,
    },

    fingerprint: monthPlanFingerprint({ user, signals }),
    generation: { degraded: false, reason: null, model: null, builtAt: Date.now() },
    history: [],
  };
  return plan;
}

/** Week themes with no model involved — the shape of a month, from the plan's own contents. */
function defaultWeekThemes(signals) {
  if (signals.wellbeing.strained || signals.academics.falling) {
    return ['Clear space', 'Steady the basics', 'One real thing', 'Check in and adjust'];
  }
  return ['Set it up', 'Do the work', 'Push the hardest one', 'Finish and write it down'];
}

function defaultObjective(signals) {
  const s = signals;
  if (s.academics.falling) {
    return {
      headline: 'Stop the slide, then everything else',
      body: 'Your transcript is the thing moving in the wrong direction, and it outranks every opportunity on this page. This month is about getting the study time back and taking something off your plate to pay for it.',
      why: 'A recovered term is worth more than anything else you could add this month.',
    };
  }
  if (s.wellbeing.strained) {
    return {
      headline: 'A lighter month, on purpose',
      body: 'You told us the load is heavy, so this plan is shorter than it would otherwise be. Subtraction first, then one thing done properly.',
      why: 'A month you can actually finish is worth more than a month that looks impressive on a screen.',
    };
  }
  if (s.deadlines.upcoming.some((d) => d.daysOut <= 21) || s.opportunities.actNow.length) {
    return {
      headline: 'Hit what is actually dated',
      body: 'There are real deadlines inside the next few weeks. Everything else on this page moves behind them.',
      why: 'Dated things are the only items where the decision is already made for you.',
    };
  }
  if ((s.student.gradeNumber || 0) >= 11) {
    return {
      headline: 'Depth, not more of everything',
      body: 'You are close enough to applications that the return is in going further into what you already do, and in writing down what you have already done.',
      why: 'Two commitments with something to show beat five with nothing written next to them.',
    };
  }
  return {
    headline: 'Build the base this month',
    body: 'You have time on your side, which means this month is for finding what holds your interest and getting the record of it started properly.',
    why: 'The commitments that carry an application are the ones started early and kept.',
  };
}

function defaultDirection(signals) {
  const s = signals;
  const bits = [];
  if (s.direction.healthcareFocus) bits.push(`Aiming at ${s.direction.healthcareFocus}`);
  else bits.push('Direction not yet named');
  if (s.colleges.focusSchools.length) bits.push(`hardest targets ${s.colleges.focusSchools.slice(0, 2).map((c) => c.name).join(' and ')}`);
  if (s.academics.hasData) bits.push(`GPA ${s.academics.latestGpa} and ${s.academics.trend}`);
  if (s.activities.count) bits.push(`${s.activities.count} activities at an average depth of ${s.activities.slate.avgScore}/100`);
  if (s.service.hasAnyLog) bits.push(`${s.service.total} self-reported service hours`);
  return `${bits.join(', ')}.`;
}

/**
 * The opportunity action plan: four buckets with an instruction attached to
 * each, read entirely from the existing opportunity system. A closed program is
 * shown as closed with the month its next cycle opens — never as open.
 */
function buildOpportunityPlan(signals) {
  const shape = (o, stance, instruction) => ({
    ref: o.ref,
    id: o.id,
    name: o.name,
    org: o.org,
    url: o.url,
    verified: o.verified,
    verifiedLabel: o.verifiedLabel,
    tier: o.tier,
    free: o.free,
    costLabel: o.costLabel,
    remote: o.remote,
    selectivity: o.selectivity,
    why: o.why,
    stance,
    instruction,
    deadline: o.deadline
      ? {
        iso: o.deadline.iso, label: o.deadline.label, precision: o.deadline.precision,
        daysOut: o.deadline.daysOut, note: o.deadline.note, passedThisCycle: !!o.deadline.passedThisCycle,
      }
      : null,
  });
  return {
    actNow: signals.opportunities.actNow.map((o) => shape(o, 'act', 'Open and close enough that this cycle is the one. Read the requirements this week.')),
    prepareNow: signals.opportunities.prepareNow.map((o) => shape(o, 'prepare', 'Open, but not yet due. The preparation is what happens this month, not the submission.')),
    monitor: signals.opportunities.monitor.map((o) => shape(o, 'monitor', 'No fixed date, or one set locally. Nothing to do but keep it in view and check the official page.')),
    nextCycle: signals.opportunities.nextCycle.map((o) => shape(o, 'closed', 'CLOSED for this cycle. Note when it comes round again and be early next time.')),
    blocked: signals.opportunities.blocked.map((o) => ({
      ...shape(o, 'blocked', o.verdict?.detail || 'Not open to you yet.'),
      altUnder: o.altUnder || null,
    })),
    note: 'Every program here comes from the app\'s own verified opportunity database, with the date it was last checked. Deadlines shift — confirm on the official page before you rely on one.',
  };
}

function buildActivityPlan(signals) {
  const a = signals.activities;
  return {
    guidance: a.guidance
      ? { label: a.guidance.label, min: a.guidance.min, max: a.guidance.max, text: a.guidance.guidance, coreOnly: !!a.guidance.coreOnly }
      : null,
    count: a.count,
    keep: a.keep,
    deepen: a.deepen,
    reduce: a.reduce,
    exit: a.exit,
    avoidAdding: a.count > 0 && (!a.guidance || a.count >= a.guidance.max),
    note: a.guidance
      ? `${a.guidance.guidance} This is an adjustable default, not a quota — sports, music, paid work, family responsibility and religious or community involvement all count, and nothing here asks you to add something in order to reach a number.`
      : 'Everything you genuinely commit time to counts — sports, music, work, family responsibility, faith community, projects and clubs alike.',
  };
}

function buildLeadershipPath(signals) {
  const l = signals.leadership;
  return {
    stage: l.stage,
    top: l.top ? { id: l.top.id, name: l.top.name, org: l.top.org, stage: l.top.stage } : null,
    nextRung: l.nextRung,
    secondCandidate: l.secondCandidate ? { id: l.secondCandidate.id, name: l.secondCandidate.name, stage: l.secondCandidate.stage } : null,
    foundingCredible: l.perActivity.some((p) => p.foundingCredible),
    ladder: [],
    note: 'Leadership that reads is responsibility somebody depended on, not a title collected. Each rung is what makes the next one credible — and founding something is only worth it where there is a real gap, a genuine fit, and a realistic way for you to run it.',
  };
}

function buildServicePlan(signals) {
  const s = signals.service;
  return {
    total: s.total,
    monthlyRate: s.monthlyRate,
    projectedTotal: s.projectedTotal,
    onPace: s.onPace,
    targetHours: s.targetHours,
    benchmarkLabel: s.benchmark?.label || null,
    benchmarkNote: s.benchmark?.note || null,
    frameNote: s.frameNote,
    suggestedMonthlyHours: s.suggestedMonthlyHours,
    topCause: s.topCause,
    concentrated: s.concentrated,
    consistency: s.consistency,
    byOrg: s.durationByOrg,
    flags: s.flags,
    preferImpactOverHours: s.preferImpactOverHours,
    selfReported: true,
  };
}

function buildAcademicPlan(signals) {
  const a = signals.academics;
  const t = signals.testing;
  return {
    hasData: a.hasData,
    latestGpa: a.latestGpa ?? null,
    comparableGpa: a.comparableGpa ?? null,
    trend: a.trend,
    band: a.band?.label || null,
    rigorRecorded: !!a.hasRigorNote,
    offersRigor: a.offersRigor,
    currentCourses: a.currentCourses,
    workloadNotes: a.workloadNotes,
    testing: {
      stage: t.stage,
      latest: t.latestComposite,
      latestType: t.latestType,
      impliedTarget: t.impliedSat,
      gap: t.gap,
      psat: t.psat ? { type: t.psat.test_type, composite: t.psat.composite, date: t.psat.test_date } : null,
      note: 'MedSchoolPrep is not an SAT/ACT tutoring product. We set the target and the next action; the studying itself belongs with a dedicated prep resource.',
    },
  };
}

/**
 * In-app reminders. Every one is anchored to a date that already exists — an
 * action's own due date — so there is no reminder for a date nobody has.
 */
function buildReminders(actions, signals) {
  const out = [];
  actions.forEach((a) => {
    const due = a.timing?.dueDate;
    if (!due) return;
    [14, 7, 2].forEach((offset) => {
      const date = shiftDays(due, -offset);
      if (date >= signals.today && date <= shiftDays(signals.today, 60)) {
        out.push({
          id: `${a.id}-t${offset}`,
          date,
          daysBefore: offset,
          actionId: a.id,
          label: `${a.title} — ${offset} day${offset === 1 ? '' : 's'} out`,
          precision: a.timing.precision,
          origin: a.timing.origin,
        });
      }
    });
  });
  return out.sort((x, y) => x.date.localeCompare(y.date)).slice(0, 24);
}

// ── The public build ─────────────────────────────────────────────────────────

/**
 * Build a month plan for this student.
 *
 * @param {object} args
 *   user, snapshot, roadmap — the inputs signals.js reads
 *   lane                     — the AI rate-limit lane (see src/lib/aiLane.js)
 *   useAi                    — false builds the deterministic plan and skips the call
 *   onStage                  — progress narration for the build screen
 */
export async function createMonthPlan({
  user = null, snapshot = null, roadmap = null, lane = null,
  useAi = true, now = new Date(), onStage = () => {},
} = {}) {
  onStage('Reading your whole record…');
  const signals = buildMonthSignals({ user, snapshot, roadmap, now });

  onStage('Working out what this month is for…');
  let plan = heuristicMonthPlan({ user, signals });

  if (!useAi || !allActions(plan).length) {
    return { plan: repairMonthPlan(plan, signals), signals };
  }

  onStage('Writing it in your words…');
  const { system, user: userMsg } = buildPlanPrompt(signals, allActions(plan));
  const res = await callWithRetry({ system, user: userMsg, lane });

  if (!res.ok || !res.json) {
    plan = {
      ...plan,
      generation: { ...plan.generation, degraded: true, reason: degradedReasonFor(res.code) },
    };
    return { plan: repairMonthPlan(plan, signals), signals };
  }

  plan = applyEnrichment(plan, res.json);
  return { plan: repairMonthPlan(plan, signals), signals };
}

/**
 * Merge the model's framing into the deterministic plan.
 *
 * Every field is optional and every one is validated. Anything unrecognized —
 * an action id we did not send, a fifth week theme, a nested object where a
 * string was asked for — is dropped in silence, because the deterministic value
 * underneath it is already correct.
 */
export function applyEnrichment(plan, json) {
  const out = { ...plan };
  const obj = json?.objective;
  if (obj && (str(obj.headline, 90) || str(obj.body, 500))) {
    out.objective = {
      headline: scrubClaims(str(obj.headline, 90) || plan.objective.headline),
      body: scrubClaims(str(obj.body, 500) || plan.objective.body),
      why: scrubClaims(str(obj.why, 300) || plan.objective.why),
    };
    // A scrubbed-empty field falls back rather than rendering blank.
    if (!out.objective.headline) out.objective.headline = plan.objective.headline;
    if (!out.objective.body) out.objective.body = plan.objective.body;
    if (!out.objective.why) out.objective.why = plan.objective.why;
  }
  const dir = str(json?.direction, 400);
  if (dir) out.direction = { ...plan.direction, summary: scrubClaims(dir) || plan.direction.summary };

  if (Array.isArray(json?.weekThemes)) {
    out.weeks = plan.weeks.map((w, i) => ({ ...w, theme: scrubClaims(str(json.weekThemes[i], 60)) || w.theme }));
  }

  const sharpen = json?.sharpen && typeof json.sharpen === 'object' ? json.sharpen : {};
  const known = new Set(allActions(plan).map((a) => a.id));
  out.actions = allActions(plan).map((a) => {
    if (!known.has(a.id)) return a;
    const better = scrubClaims(str(sharpen[a.id], 240));
    return better ? { ...a, reason: better, reasonSource: 'medabrain' } : a;
  });
  out.generation = { ...plan.generation, degraded: false, reason: null, model: 'oracle' };
  return out;
}

/**
 * The last gate before a plan reaches a student.
 *
 * Repairs anything structurally wrong, re-scrubs every string, and guarantees
 * the traceability invariant. Called on every build path, including the ones
 * that never touched a model — a deterministic plan with a broken week index is
 * just as broken as a hallucinated one.
 */
export function repairMonthPlan(plan, signals = null) {
  const out = { ...plan };
  out.version = MONTH_PLAN_VERSION;
  out.horizon = PLAN_HORIZONS.includes(out.horizon) ? out.horizon : defaultHorizon();
  if (!out.cycleStart) out.cycleStart = dayKey();
  out.cycleEnd = cycleEndFor(out.cycleStart);
  if (!Array.isArray(out.weeks) || out.weeks.length !== CYCLE_WEEKS) {
    out.weeks = buildWeeks(out.cycleStart, (plan.weeks || []).map((w) => w.theme));
  }

  const fix = (a, i) => {
    const domain = ACTION_DOMAINS.includes(a.domain) ? a.domain : 'portfolio';
    const week = Number.isInteger(a.weekIndex) ? Math.max(0, Math.min(CYCLE_WEEKS - 1, a.weekIndex)) : 0;
    return {
      ...a,
      domain,
      weekIndex: week,
      rank: Number.isFinite(a.rank) ? a.rank : i + 1,
      title: scrubClaims(a.title) || a.title,
      reason: scrubClaims(a.reason) || 'This came out of your own record.',
      whyThisMatters: scrubClaims(a.whyThisMatters || ''),
      definitionOfDone: scrubClaims(a.definitionOfDone) || 'You decide when this one is done.',
      evidenceToLog: scrubClaims(a.evidenceToLog || '') || 'Anything that proves it happened.',
      status: a.status || 'not_started',
      source: a.source && /^rule:/.test(a.source) ? a.source : 'rule:unknown',
      timing: {
        dueDate: a.timing?.dueDate || null,
        dueLabel: a.timing?.dueLabel || 'This month',
        origin: a.timing?.dueDate ? (a.timing?.origin || 'cycle') : 'cycle',
        precision: a.timing?.precision || 'flexible',
      },
    };
  };
  out.actions = allActions(plan).map(fix);
  out.backlog = (Array.isArray(plan.backlog) ? plan.backlog : []).map(fix);

  out.objective = {
    headline: scrubClaims(plan.objective?.headline || '') || 'This month',
    body: scrubClaims(plan.objective?.body || ''),
    why: scrubClaims(plan.objective?.why || ''),
  };
  out.direction = { ...(plan.direction || {}), summary: scrubClaims(plan.direction?.summary || '') };
  out.risks = (plan.risks || []).map((r) => ({
    ...r,
    title: scrubClaims(r.title) || r.title,
    detail: scrubClaims(r.detail || ''),
    remedy: scrubClaims(r.remedy || ''),
  }));

  const problems = assertTraceable(out);
  out.generation = {
    ...(plan.generation || {}),
    integrity: problems.length ? problems.slice(0, 6) : null,
  };
  // A plan that fails its own traceability check drops the offending actions
  // rather than rendering them: an untraceable action is exactly the thing this
  // document promises cannot exist.
  if (problems.length) {
    const bad = new Set(problems.map((p) => (p.match(/"([^"]+)"/) || [])[1]).filter(Boolean));
    out.actions = out.actions.filter((a) => !bad.has(a.title));
  }
  out.updatedAt = Date.now();
  return out;
}

/**
 * Rebuild the plan for a new cycle, carrying forward what should carry forward.
 *
 * Paused actions come back (that is what pausing means), completed ones do not,
 * and refused ones are already suppressed at the source through
 * recommendation_feedback. The completed count rides along so the UI can say
 * what last month actually produced instead of starting from an empty screen.
 */
export async function refreshMonthPlan(previous, args = {}) {
  const { plan, signals } = await createMonthPlan(args);
  const carried = allActions(previous)
    .filter((a) => a.status === 'paused')
    .map((a) => ({ ...a, status: 'not_started', carriedFrom: previous.id, weekIndex: 1 }));
  const merged = {
    ...plan,
    cycleIndex: (Number(previous?.cycleIndex) || 0) + 1,
    actions: [...allActions(plan), ...carried],
    previousCycle: {
      id: previous?.id || null,
      completed: allActions(previous).filter((a) => a.status === 'complete').length,
      total: allActions(previous).length,
      cycleStart: previous?.cycleStart || null,
    },
  };
  return { plan: repairMonthPlan(merged, signals), signals };
}
