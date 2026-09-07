// ─────────────────────────────────────────────────────────────────────────────
// EVERYTHING WE KNOW ABOUT THIS STUDENT, read once, as numbers.
//
// The month plan's rules (rules.js) are pure functions of this object and
// nothing else. That separation is the whole design: a rule that reaches into
// the raw portfolio rows is a rule nobody can test and nobody can reason about,
// and the twenty of them together would each derive "how many activities do
// they have" slightly differently. There is one derivation, here, and the rules
// argue about what to DO with it.
//
// ── What it reads ────────────────────────────────────────────────────────────
//   • the user record            — grade, graduation year, pathway, ambitions
//   • the Portfolio snapshot     — colleges, activities, awards, GPA, tests,
//                                  essays, deadlines, research, clinical hours
//   • the student-intelligence   — school context, constraints, service logs,
//     rows (migration 0026)        competitions, reflections, check-ins,
//                                  interest history, recommendation feedback,
//                                  activity role history
//   • the twelve-month roadmap   — so the month never contradicts the year
//   • the opportunity catalogs   — via opportunities.js, ONLY through the
//                                  existing eligibility engine
//
// ── What it never does ───────────────────────────────────────────────────────
// Fetch. Guess a date. Assert a fact the student did not give us. Every number
// here is arithmetic over rows that exist, and every field that could be absent
// resolves to a null the rules are required to handle — because the median
// student on the free plan has filled in perhaps a third of this.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, daysBetween, effectiveGradeStage, classFallYears, GRADE_LABELS } from '../timeline.js';
import { analyzeAcademics, gpaBand } from '../academicIntel.js';
import { analyzeSlate, hoursPerYear } from '../activityIntel.js';
import { serviceSummary } from '../studentIntel/serviceAnalytics.js';
import { activityCountGuidance, SERVICE_HOUR_BENCHMARKS, FRAME_NOTE } from '../studentIntel/benchmarks.js';
import { SUPPRESS_STATUSES, currentInterests } from '../studentIntel/context.js';
import { isCheckinDue, isAcademicUpdateDue } from '../studentIntel/checkins.js';
import { PROGRAMS } from '../../data/opportunityPrograms.js';
import { OPPORTUNITIES } from '../../data/opportunities.js';
// The opportunity-intelligence layer (src/lib/opportunity/). The month plan reads
// opportunities through it rather than through the raw catalogs, so the plan, the
// Opportunities tab, the dashboard card and Medabrain all rank the same records the
// same way against the same student — and so the month plan inherits its honesty
// model for free: data states, decaying suppression, and a closed cycle that can
// never be presented as open.
import { buildRecordPool } from '../opportunity/adapt.js';
import { buildOpportunityContext } from '../opportunity/context.js';
import { rankOpportunities } from '../opportunity/ranking.js';
import { reliabilityLine } from '../opportunity/schema.js';
import { SCHOOL_DATA } from '../../data/constants.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const txt = (v, n = 240) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, n) : null;
};

/** Grade stage key → the 9-12 number the benchmarks are keyed on. 'gap' has no number. */
export const GRADE_NUMBER = { freshman: 9, sophomore: 10, junior: 11, senior: 12, gap: null };

// ── Colleges ─────────────────────────────────────────────────────────────────

/**
 * The four-tier college list.
 *
 * `dream` is a real category a student can pick (see CATEGORIES in
 * CollegeListPanel.jsx) and it exists because "reach" flattens two genuinely
 * different things: the school you would be delighted to get into, and the one
 * whose name is written on the inside of your notebook. The strategic attention
 * a month plan gives those is different, so the data has to tell them apart.
 *
 * When nobody has marked a dream school, the most selective school on the list
 * is treated as the DE FACTO dream — inferred, flagged as inferred, and never
 * written back to their row. A student who never touched the dropdown still
 * gets a plan aimed at the hardest thing on their list.
 */
export function readColleges(rows = []) {
  if (!Array.isArray(rows)) rows = [];
  const acceptOf = (name) => {
    const hit = SCHOOL_DATA.find((s) => s.name === name);
    return hit ? num(hit.accept) : null;
  };
  const shaped = rows.map((c) => ({
    id: c.id,
    name: c.name,
    category: ['dream', 'reach', 'target', 'safety'].includes(c.category) ? c.category : (c.category || 'uncategorized'),
    status: c.status || 'researching',
    eaEd: c.ea_ed_deadline || null,
    rd: c.rd_deadline || null,
    aidDeadline: c.financial_aid_deadline || null,
    cssRequired: !!c.css_profile_required,
    acceptRate: acceptOf(c.name),
  }));
  const of = (cat) => shaped.filter((c) => c.category === cat);
  const dream = of('dream');
  const reach = of('reach');
  // The de-facto dream: most selective known school, preferring a reach.
  const pool = [...(dream.length ? [] : reach), ...(dream.length || reach.length ? [] : shaped)]
    .filter((c) => c.acceptRate != null)
    .sort((a, b) => a.acceptRate - b.acceptRate);
  const inferredDream = dream.length ? null : (pool[0] || null);

  const rates = shaped.map((c) => c.acceptRate).filter((r) => r != null);
  const minRate = rates.length ? Math.min(...rates) : null;
  // The ambition tier the service benchmark and the leadership bar are read
  // against. Derived from their OWN list, not from an aspiration they typed.
  const ambitionTier = minRate == null ? null : (minRate <= 10 ? 'top10_ivy' : minRate <= 25 ? 'top20_30' : 'broad');

  return {
    all: shaped,
    dream, reach, target: of('target'), safety: of('safety'),
    uncategorized: shaped.filter((c) => !['dream', 'reach', 'target', 'safety'].includes(c.category)),
    inferredDream,
    focusSchools: (dream.length ? dream : (inferredDream ? [inferredDream] : [])).concat(reach).slice(0, 4),
    counts: {
      total: shaped.length,
      dream: dream.length, reach: reach.length,
      target: of('target').length, safety: of('safety').length,
    },
    minAcceptRate: minRate,
    ambitionTier,
    // A list with no safety is a bad list, and it is the single most common
    // structural mistake an ambitious student makes.
    missingSafety: shaped.length >= 3 && of('safety').length === 0,
    missingTarget: shaped.length >= 3 && of('target').length === 0,
  };
}

// ── Activities ───────────────────────────────────────────────────────────────

/**
 * The activity slate, with a per-activity verdict of keep / deepen / reduce /
 * pause / exit.
 *
 * The grade-based count guidance (4-5 in ninth, 3-4 in tenth, 2-3 core in
 * eleventh, 1-2 in twelfth) is an ADJUSTABLE DEFAULT and is applied as one, not
 * as a quota: nothing here ever recommends adding an activity in order to reach
 * a number, and the 'exit' verdict is only ever reached by an activity that is
 * both thin AND competing with something stronger. Sports, music, paid work,
 * family responsibility, religious and community involvement all count — the
 * type field is never used to discount an entry, only to describe it.
 */
export function readActivities(rows = [], awards = [], roleHistory = [], gradeNumber = null) {
  if (!Array.isArray(rows)) rows = [];
  if (!Array.isArray(awards)) awards = [];
  if (!Array.isArray(roleHistory)) roleHistory = [];
  const slate = analyzeSlate(rows, awards);
  const guidance = activityCountGuidance(gradeNumber);
  const scored = slate.scored || [];
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const strongest = ranked.slice(0, Math.max(1, guidance?.max || 3)).map((s) => s.activity.id);

  const rolesFor = (activityId) => roleHistory
    .filter((r) => r.activity_id === activityId)
    .sort((a, b) => String(a.started_at || '').localeCompare(String(b.started_at || '')));

  const overCount = guidance ? Math.max(0, rows.length - guidance.max) : 0;
  const verdicts = ranked.map((entry, i) => {
    const a = entry.activity;
    const years = (a.grade_levels || []).length;
    const hrs = hoursPerYear(a);
    const isCore = strongest.includes(a.id);
    const thin = entry.score < 40;
    const undescribed = String(a.description || '').trim().length < 40;
    let verdict = 'keep';
    let why = 'It is holding its weight — keep going.';
    if (isCore && (a.leadership_role || years >= 2 || hrs >= 100)) {
      verdict = 'deepen';
      why = 'This is one of your strongest commitments. The next gain here is depth, not another activity.';
    } else if (isCore) {
      verdict = 'keep';
      why = 'A core commitment. Keep the hours steady and start writing down what you actually did.';
    } else if (thin && overCount > 0 && i >= (guidance?.max || 3)) {
      verdict = years >= 2 ? 'reduce' : 'exit';
      why = years >= 2
        ? 'You have kept this going for years, which counts — but it is taking hours your strongest commitments need. Scale back rather than drop it.'
        : 'It has not gone anywhere and it is competing for the hours your stronger commitments need.';
    } else if (thin) {
      verdict = 'deepen';
      why = 'It reads thin as written. Either give it a real project or write down what you have actually done in it.';
    } else if (overCount > 0 && i >= (guidance?.max || 3)) {
      verdict = 'reduce';
      why = 'Solid, but you are carrying more than this year usually rewards. Reducing here buys hours for your best two.';
    }
    return {
      id: a.id,
      name: a.position || a.activity_type || 'Activity',
      org: a.organization || null,
      type: a.activity_type || null,
      hoursPerYear: Math.round(hrs),
      hoursPerWeek: num(a.hours_per_week) || 0,
      years,
      leadership: !!a.leadership_role,
      score: entry.score,
      band: entry.band?.label || null,
      undescribed,
      noImpact: !String(a.impact || '').trim(),
      noNumbers: !/\d/.test(String(a.impact || '')),
      roles: rolesFor(a.id).map((r) => ({ role: r.role, from: r.started_at, to: r.ended_at, outcome: r.outcome })),
      verdict, why,
    };
  });

  const byVerdict = (v) => verdicts.filter((x) => x.verdict === v);
  return {
    rows,
    count: rows.length,
    slate,
    guidance,
    verdicts,
    keep: byVerdict('keep'),
    deepen: byVerdict('deepen'),
    reduce: byVerdict('reduce'),
    exit: byVerdict('exit'),
    weeklyHours: Math.round(slate.weeklyPeak * 10) / 10,
    // Over the grade's adjustable range, and thin with it — the specific shape
    // of "collecting activities" as opposed to simply being busy.
    accumulating: !!guidance && rows.length > guidance.max && slate.avgScore < 55,
    overCount,
    underCount: guidance ? Math.max(0, guidance.min - rows.length) : 0,
    // Believability, from analyzeSlate: 25h/week on top of school is where a
    // reader starts doing arithmetic.
    implausibleLoad: slate.weeklyPeak >= 25,
    noLeadership: slate.leadershipCount === 0 && rows.length > 0,
    leadershipCount: slate.leadershipCount,
  };
}

// ── Leadership ───────────────────────────────────────────────────────────────

/** The earned ladder. A title nobody grew into is worth less than the rung below it held honestly. */
export const LEADERSHIP_LADDER = [
  { id: 'participate', label: 'Show up consistently', detail: 'Reliable attendance and real contribution, long enough that people expect you.' },
  { id: 'responsibility', label: 'Hold a recurring responsibility', detail: 'One thing that is yours every week — the schedule, the supply run, the new-member intro.' },
  { id: 'ownership', label: 'Own a project or an event', detail: 'Something with a start, a finish and a result you can put a number on.' },
  { id: 'officer', label: 'Officer track', detail: 'An elected or appointed role with a remit and people who depend on it.' },
  { id: 'principal', label: 'President, founder, chapter lead or director', detail: 'Only where you have already done the rung below and the organization genuinely needs it.' },
];

const LADDER_INDEX = Object.fromEntries(LEADERSHIP_LADDER.map((r, i) => [r.id, i]));

/**
 * Where this student actually is on the ladder, per activity and overall.
 *
 * Deliberately conservative: a `leadership_role` flag alone is 'responsibility',
 * not 'officer'. A student who has been told they are already at the top of a
 * ladder they have not climbed gets no next step, which is the failure mode of
 * every "you're a leader!" feature ever built.
 */
export function readLeadership(activities = [], roleHistory = [], ambitionTier = null) {
  if (!Array.isArray(activities)) activities = [];
  if (!Array.isArray(roleHistory)) roleHistory = [];
  const perActivity = activities.map((a) => {
    const roles = roleHistory.filter((r) => r.activity_id === a.id);
    const titles = [a.leadership_role ? String(a.position || '') : '', ...roles.map((r) => r.role || '')].join(' ').toLowerCase();
    const years = (a.grade_levels || []).length;
    let stage = 'participate';
    if (a.leadership_role || roles.length) stage = 'responsibility';
    if (roles.some((r) => r.outcome) || /project|lead|coordinator|captain|chair/.test(titles)) stage = 'ownership';
    if (/officer|secretary|treasurer|vice[- ]president|vp\b/.test(titles)) stage = 'officer';
    if (/president|founder|chapter lead|director|editor[- ]in[- ]chief/.test(titles)) stage = 'principal';
    return {
      id: a.id,
      name: a.position || a.activity_type || 'Activity',
      org: a.organization || null,
      years,
      stage,
      stageIndex: LADDER_INDEX[stage] ?? 0,
      nextRung: LEADERSHIP_LADDER[Math.min(LEADERSHIP_LADDER.length - 1, (LADDER_INDEX[stage] ?? 0) + 1)],
      // Founding is only ever recommended where the rung below is already held
      // and the student has run something to completion. See rules.js.
      foundingCredible: (LADDER_INDEX[stage] ?? 0) >= LADDER_INDEX.ownership && years >= 2,
    };
  }).sort((a, b) => b.stageIndex - a.stageIndex || b.years - a.years);

  const top = perActivity[0] || null;
  // An ambitious student is pointed at leadership in MORE than one activity
  // where that is feasible — but only where the second one is already at least
  // showing up consistently, never as a title to go and collect.
  const secondCandidate = perActivity.slice(1).find((p) => p.stageIndex >= LADDER_INDEX.participate) || null;
  return {
    perActivity,
    top,
    stage: top?.stage || null,
    nextRung: top?.nextRung || LEADERSHIP_LADDER[0],
    secondCandidate: ambitionTier === 'top10_ivy' || ambitionTier === 'top20_30' ? secondCandidate : null,
    anyPrincipal: perActivity.some((p) => p.stage === 'principal'),
    titleWithoutSubstance: perActivity.filter((p) => p.stageIndex >= LADDER_INDEX.officer && p.years < 2),
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * The service picture: hours, pace, cause areas, consistency, and the two
 * things a coach has to be honest about — that every hour here is SELF-REPORTED,
 * and that a log which does not add up needs a gentle question rather than a
 * silent discount.
 *
 * The ~400-hour figure is an ADJUSTABLE long-term planning reference for
 * top-20/30 ambition (SERVICE_HOUR_BENCHMARKS), and the 500-600+ figure is only
 * ever surfaced for a genuine top-10/Ivy dream or reach path AND only where the
 * pace makes it realistic — otherwise the lower-hour, higher-impact alternative
 * is recommended instead, which is a legitimate profile and often the stronger
 * one. Nothing here turns volunteering into hour accumulation.
 */
export function readService(serviceLogs = [], { ambitionTier = null, applicationDate = null, activities = [] } = {}) {
  if (!Array.isArray(serviceLogs)) serviceLogs = [];
  if (!Array.isArray(activities)) activities = [];
  const benchmarkId = ambitionTier === 'top10_ivy' ? 'top10_ivy' : 'top20_30';
  const summary = serviceSummary(serviceLogs, { benchmarkId, targetDate: applicationDate });
  const benchmark = SERVICE_HOUR_BENCHMARKS.find((b) => b.id === benchmarkId) || null;
  const targetHours = benchmark?.targetHours || benchmark?.targetHoursMin || 400;

  // ── Plausibility, asked gently ─────────────────────────────────────────────
  // Two checks, both deliberately conservative, both phrased in the UI as a
  // question rather than an accusation. An unclear entry is never treated as
  // strong evidence, and it is never deleted or discounted behind their back.
  const flags = [];
  const activityWeekly = activities.reduce((s, a) => s + (num(a.hours_per_week) || 0), 0);
  const byWeek = {};
  serviceLogs.forEach((r) => {
    const k = String(r.entry_date || '').slice(0, 10);
    if (!k) return;
    byWeek[k] = (byWeek[k] || 0) + (num(r.hours) || 0);
  });
  const bigDays = Object.entries(byWeek).filter(([, h]) => h > 14);
  if (bigDays.length) {
    flags.push({
      id: 'long-day',
      severity: 'ask',
      label: `${bigDays.length} logged day${bigDays.length === 1 ? '' : 's'} above 14 hours`,
      detail: 'That is possible — a fundraiser, a trip, an overnight — but it reads as a typo more often than not. Worth a quick check so the total stands up.',
    });
  }
  const undescribed = serviceLogs.filter((r) => !String(r.description || '').trim() && !String(r.impact_note || '').trim());
  if (undescribed.length >= 3) {
    flags.push({
      id: 'undescribed',
      severity: 'ask',
      label: `${undescribed.length} entries with no description`,
      detail: 'Hours with nothing written beside them cannot be used as evidence later, and they are the first thing that looks thin to a reader. A sentence each is enough.',
    });
  }
  const weeklyService = summary.pace.monthlyRate ? summary.pace.monthlyRate / 4.3 : 0;
  if (weeklyService + activityWeekly >= 30) {
    flags.push({
      id: 'schedule-conflict',
      severity: 'ask',
      label: 'Your logged hours and your activities add up to a very full week',
      detail: `Roughly ${Math.round(weeklyService + activityWeekly)} hours a week on top of school. If that is real it is worth saying so in your descriptions; if some of it overlaps, worth correcting so the numbers hold.`,
    });
  }

  const monthsRemaining = summary.pace.monthsRemaining;
  const shortfall = monthsRemaining ? Math.max(0, targetHours - summary.pace.projectedTotal) : null;
  const suggestedMonthlyHours = monthsRemaining && shortfall
    ? Math.round(((targetHours - summary.total) / Math.max(1, monthsRemaining)) * 10) / 10
    : null;

  return {
    logs: serviceLogs,
    total: Math.round(summary.total),
    summary,
    benchmark,
    benchmarkId,
    targetHours,
    frameNote: FRAME_NOTE,
    monthlyRate: summary.pace.monthlyRate,
    projectedTotal: summary.pace.projectedTotal,
    onPace: summary.pace.onPace,
    monthsRemaining,
    suggestedMonthlyHours,
    topCause: summary.causeConcentration.topArea,
    concentrated: summary.causeConcentration.concentrated,
    consistency: summary.consistency,
    durationByOrg: summary.durationByOrg,
    flags,
    // Where a lower-hour, higher-impact path is the honest recommendation
    // instead of chasing 500-600: an Ivy-tier ambition whose current pace makes
    // the hour target unreachable without the log becoming the point.
    preferImpactOverHours: benchmarkId === 'top10_ivy' && summary.pace.onPace === false,
    hasAnyLog: serviceLogs.length > 0,
  };
}

// ── Testing ──────────────────────────────────────────────────────────────────

/**
 * SAT/ACT/PSAT status.
 *
 * MedSchoolPrep is not an SAT/ACT prep product in this feature: the month plan
 * may set a target and name the next action (register, sit a full timed section,
 * take the school PSAT) and may point at outside preparation, but it never
 * pretends to tutor. Test-optional is deliberately NOT modeled as a standard
 * pathway — it is a per-school policy a student confirms themselves, not a plan.
 */
export function readTesting(testScores = [], { gradeNumber = null, colleges = null } = {}) {
  if (!Array.isArray(testScores)) testScores = [];
  const sorted = [...testScores].sort((a, b) => String(b.test_date || '').localeCompare(String(a.test_date || '')));
  const real = sorted.filter((s) => /sat|act/i.test(s.test_type || '') && num(s.composite) != null);
  const latest = real[0] || null;
  const target = testScores.find((s) => s.is_target) || null;
  const psat = sorted.find((s) => /psat/i.test(s.test_type || '')) || null;

  // The score their own list implies, from SCHOOL_DATA midpoints — not a
  // universal "good score", which does not exist.
  const wanted = (colleges?.focusSchools || []).map((c) => {
    const hit = SCHOOL_DATA.find((s) => s.name === c.name);
    return hit ? num(hit.sat) : null;
  }).filter((v) => v != null);
  const impliedSat = wanted.length ? Math.max(...wanted) : null;

  let stage = 'not-started';
  if (psat && !real.length) stage = 'psat-only';
  if (real.length === 1) stage = 'first-sitting';
  if (real.length >= 2) stage = 'retaking';
  if (gradeNumber === 12 && real.length) stage = 'closing';

  const gap = latest && impliedSat ? impliedSat - num(latest.composite) : null;
  return {
    scores: sorted,
    latest,
    latestComposite: latest ? num(latest.composite) : null,
    latestType: latest?.test_type || null,
    target: target ? num(target.composite) : null,
    psat,
    impliedSat,
    gap,
    stage,
    // Grades 9-10 are not behind for having no score. Saying so matters more
    // than the number does.
    expectedYet: gradeNumber != null && gradeNumber >= 11,
    behind: gradeNumber != null && gradeNumber >= 11 && !real.length,
  };
}

// ── Opportunities ────────────────────────────────────────────────────────────

/**
 * The opportunity picture, read ENTIRELY through the opportunity-intelligence
 * layer (src/lib/opportunity/).
 *
 * The month plan does not rank, date, or judge an opportunity itself. It asks
 * the same `rankOpportunities()` the Opportunities tab, the dashboard card and
 * Medabrain ask, over the same pool, with the same student context — so a
 * program the tab calls a stretch is a stretch here too, a refusal recorded on a
 * card there suppresses it here, and nothing this plan says about a program can
 * contradict what the student is looking at one tab over.
 *
 * What this function does is re-bucket that ranking into the four STANCES a
 * month plan needs, which are about what to do in the next four weeks rather
 * than about fit:
 *
 *   act now      — matched, and the deadline lands inside this cycle (or the
 *                  ranker flagged it urgent).
 *   prepare now  — matched or a stretch, due later, but the work that makes the
 *                  application good starts in this cycle.
 *   monitor      — no reliable date: rolling, locally set, or timing unclear.
 *                  Nothing to do but keep it in view.
 *   next cycle   — this year's window has passed. Shown as CLOSED, with the
 *                  month the next one is expected. Never presented as open.
 *
 * ── The two honesty rules this function is responsible for ──────────────────
 * 1. A CLOSED CYCLE IS NEVER IN THE FIRST TWO BUCKETS. `rankOpportunities`
 *    already separates them; this only has to not undo it.
 * 2. AN UNVERIFIED RECORD IS NEVER TREATED AS A DATED COMMITMENT. Every record
 *    carries its `dataState`, and `datable` is false for anything AI-discovered
 *    — which is what stops rules.js building an action with a real due date out
 *    of a deadline nobody has checked. See the opportunity-verify rule.
 */
export function readOpportunities({
  user = null, snapshot = null, pathwayKey = null, intel = null,
  colleges = [], roadmap = null, deadlines = [], today = new Date(), limit = 14,
} = {}) {
  const ctx = buildOpportunityContext({
    user, snapshot, pathwayKey, intel, colleges, roadmap, deadlines, today,
  });
  const records = buildRecordPool({
    opportunities: OPPORTUNITIES,
    programs: PROGRAMS,
    // The student's own discovery inbox, when the snapshot carried it. Every row
    // here is unverified by construction (supabase/migrations/0028), which is
    // exactly what `datable` below refuses to date.
    discovered: Array.isArray(snapshot?.discoveredOpportunities) ? snapshot.discoveredOpportunities : [],
  });
  const ranked = rankOpportunities({ records, ctx });

  const todayKey = dayKey(today);

  /**
   * The date a card may show for one record, and how much to believe it.
   *
   * Two sources, in order: the record's own dated deadline when it is still
   * ahead of us, then the next expected cycle computed from the month the
   * catalog recorded (expectedNextCycle in src/lib/opportunity/schema.js — the
   * same arithmetic opportunityEligibility.nextDeadline does, so the two can
   * never disagree about which fortnight a program falls in).
   *
   * `datable` is the gate rules.js reads before it is allowed to build a dated
   * action: an AI-discovered lead and a record missing its essentials never get
   * a due date, whatever month they happen to name.
   */
  const timingOf = (r, ds) => {
    const cycle = ds?.nextCycle || null;
    const own = r.deadlineIso && daysBetween(todayKey, r.deadlineIso) >= 0 ? r.deadlineIso : null;
    const iso = own || cycle?.iso || null;
    const precision = own ? (r.deadlinePrecision || 'exact') : (cycle?.precision || null);
    const trustworthy = ds?.id !== 'ai_discovered' && ds?.id !== 'incomplete';
    return {
      iso: trustworthy ? iso : null,
      precision,
      daysOut: trustworthy && iso ? daysBetween(todayKey, iso) : null,
      rolledToNextYear: !own && !!cycle?.rolledToNextYear,
      datable: !!(trustworthy && iso),
      monthLabel: cycle?.monthLabel || null,
    };
  };

  const shape = (scored, stance, instruction) => {
    const r = scored.record;
    const ds = scored.dataState;
    const cycle = ds?.nextCycle || null;
    const t = timingOf(r, ds);
    const datable = t.datable;
    const daysOut = t.daysOut;
    return {
      ref: `opportunity:${r.id}`,
      id: r.id,
      name: r.name,
      org: r.org,
      url: r.url,
      category: r.category,
      tier: r.tier,
      why: r.description || null,
      eligibility: r.eligibility || null,
      selectivity: r.selectivity,
      remote: /virtual|hybrid/i.test(String(r.format || '')) || null,
      free: scored.flags.includes('free'),
      costLabel: r.costText || (r.costUsd === 0 ? 'Free' : null),
      match: scored.match,
      topReason: scored.reasons?.[0]?.text || null,
      flags: scored.flags,
      // The data state travels with every row and every card is required to
      // render it — the rule src/lib/opportunity/schema.js exists to enforce.
      dataState: { id: ds?.id || 'verified', label: ds?.label || 'Verified', detail: ds?.detail || '' },
      reliability: reliabilityLine(r, today),
      verifiedAt: r.verifiedAt || null,
      datable,
      stance,
      instruction,
      blockers: scored.eligibility?.blockers || [],
      altUnder: scored.eligibility?.alternative || null,
      deadline: {
        iso: t.iso,
        // Short enough for a card. The catalog's own prose — which is often a
        // paragraph — travels as `note` instead, where the card can show it
        // under the date rather than as the date.
        label: t.monthLabel
          ? (stance === 'closed'
            ? `Next cycle expected around ${t.monthLabel}`
            : `${t.precision === 'exact' ? '' : 'Around '}${t.monthLabel}${t.rolledToNextYear ? ' next year' : ''}`)
          : (r.deadlinePrecision === 'rolling' ? 'No deadline — apply any time' : 'No deadline listed'),
        precision: t.precision,
        daysOut,
        note: r.deadlineText || r.recurrence?.note || null,
        passedThisCycle: stance === 'closed',
      },
    };
  };

  const ACT = 'Open, and close enough that this cycle is the one. Read the requirements this week.';
  const PREPARE = 'Open, but not yet due. The preparation is what happens this month, not the submission.';
  const MONITOR = 'No fixed date, or one set locally. Nothing to do but keep it in view and check the official page.';
  const CLOSED = 'CLOSED for this cycle. Note when it comes round again and be early next time.';
  const VERIFY = 'A lead Medabrain found, not a checked fact. Confirm it is real and open to you before you build around it.';

  const matches = ranked.matches || [];
  const actNow = [];
  const prepareNow = [];
  const monitor = [];

  for (const m of matches) {
    if (m.dataState?.id === 'ai_discovered') { prepareNow.push(shape(m, 'verify', VERIFY)); continue; }
    const days = timingOf(m.record, m.dataState).daysOut;
    if (days != null && days >= 0 && (days <= 35 || m.flags.includes('very_urgent') || m.flags.includes('urgent'))) {
      actNow.push(shape(m, 'act', ACT));
    } else if (days != null && days > 35) {
      prepareNow.push(shape(m, 'prepare', PREPARE));
    } else {
      monitor.push(shape(m, 'monitor', MONITOR));
    }
  }
  for (const m of (ranked.stretch || [])) prepareNow.push(shape(m, 'prepare', PREPARE));

  return {
    ranked,
    ctx,
    all: matches,
    actNow: actNow.slice(0, limit),
    prepareNow: prepareNow.slice(0, limit),
    monitor: monitor.slice(0, 6),
    nextCycle: (ranked.nextCycle || []).map((m) => shape(m, 'closed', CLOSED)).slice(0, 6),
    // Everything gated by age, citizenship or grade, kept so the UI can say what
    // to do INSTEAD rather than silently hiding the program.
    blocked: (ranked.blocked || []).map((m) => shape(m, 'blocked', m.eligibility?.summary || 'Not open to you yet.')).slice(0, 6),
    needsVerification: matches.filter((m) => m.dataState?.id === 'ai_discovered').length,
    capacity: ranked.capacity,
    // The decayed, generalized feedback index. rules.js consults it so a refusal
    // recorded on an Opportunities card also stops the month plan re-offering
    // the same KIND of thing, not just the same row.
    feedback: ctx.feedback,
  };
}

// ── Deadlines ────────────────────────────────────────────────────────────────

/** Every real, student-owned deadline inside the horizon, soonest first. */
export function readDeadlines({ deadlines = [], colleges = [], scholarships = [], today = dayKey(), horizonDays = 75 } = {}) {
  const rows = [];
  deadlines.forEach((d) => {
    if (!d.due_date) return;
    rows.push({ ref: `deadline:${d.id}`, title: d.title, date: d.due_date, kind: d.kind || 'other', origin: 'student' });
  });
  colleges.forEach((c) => {
    if (c.ea_ed_deadline) rows.push({ ref: `college:${c.id}:ea`, title: `${c.name} — EA/ED application`, date: c.ea_ed_deadline, kind: 'application', origin: 'student' });
    if (c.rd_deadline) rows.push({ ref: `college:${c.id}:rd`, title: `${c.name} — regular decision`, date: c.rd_deadline, kind: 'application', origin: 'student' });
    if (c.financial_aid_deadline) rows.push({ ref: `college:${c.id}:aid`, title: `${c.name} — financial aid`, date: c.financial_aid_deadline, kind: 'aid', origin: 'student' });
  });
  scholarships.forEach((s) => {
    if (s.deadline) rows.push({ ref: `scholarship:${s.id}`, title: `${s.name} — scholarship`, date: s.deadline, kind: 'scholarship', origin: 'student' });
  });
  const withDays = rows
    .map((r) => ({ ...r, daysOut: daysBetween(today, r.date) }))
    .sort((a, b) => a.daysOut - b.daysOut);
  return {
    all: withDays,
    missed: withDays.filter((r) => r.daysOut < 0),
    upcoming: withDays.filter((r) => r.daysOut >= 0 && r.daysOut <= horizonDays),
    next: withDays.find((r) => r.daysOut >= 0) || null,
  };
}

// ── The whole picture ────────────────────────────────────────────────────────

/**
 * Everything, assembled.
 *
 * @param {object} args
 *   user      — the local user record
 *   snapshot  — buildPortfolioSnapshot()'s output, or any subset of it
 *   roadmap   — the twelve-month roadmap, if built
 *   now       — injectable clock, so the verify script can pin one
 */
export function buildMonthSignals({ user = null, snapshot = null, roadmap = null, now = new Date() } = {}) {
  // A snapshot key can arrive as null (a fetch still in flight), as a string, or
  // as anything else a partial load left behind, so every reader below guards its
  // own inputs and every list read goes through `list()`. One `.map` on a
  // non-array takes the whole tab down with it.
  const raw = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const list = (key) => (Array.isArray(raw[key]) ? raw[key] : []);
  const s = raw;
  const today = dayKey(now);
  const gradeStage = effectiveGradeStage(user, now) || user?.gradeStage || null;
  const gradeNumber = GRADE_NUMBER[gradeStage] ?? null;
  const years = classFallYears(gradeStage, now);
  // Applications go in the autumn of senior year. That is the date every
  // long-term pace calculation in this module counts down to.
  const applicationDate = `${years.senior}-11-01`;

  const colleges = readColleges(list('colleges'));
  const activities = readActivities(list('activities'), list('awards'), list('activityRoleHistory'), gradeNumber);
  const leadership = readLeadership(list('activities'), list('activityRoleHistory'), colleges.ambitionTier);
  const service = readService(list('serviceLogs'), {
    ambitionTier: colleges.ambitionTier,
    applicationDate,
    activities: list('activities'),
  });
  const academicsRaw = analyzeAcademics(list('gpaEntries'));
  const schoolContext = (list('schoolContext'))[0] || null;
  const constraintsRow = (list('constraintsProfile'))[0] || null;
  const testing = readTesting(list('testScores'), { gradeNumber, colleges });

  const feedbackRows = list('recommendationFeedback');
  const suppressedRefs = new Set(
    feedbackRows.filter((f) => SUPPRESS_STATUSES.has(f.status)).map((f) => f.item_ref).filter(Boolean),
  );
  const suppressedLabels = feedbackRows
    .filter((f) => SUPPRESS_STATUSES.has(f.status))
    .map((f) => ({ label: f.item_label, status: f.status, note: f.note || null, ref: f.item_ref || null }));

  const deadlines = readDeadlines({
    deadlines: list('deadlines'),
    colleges: colleges.all,
    scholarships: list('scholarships'),
    today,
  });

  // Ranked through the opportunity-intelligence layer, with exactly the inputs
  // App.jsx and the Portfolio coach give it — so all three surfaces rank the
  // same records the same way for the same student. `constraintsProfile` is
  // handed over whole here (not stripped) because ranking BY DISTANCE is the
  // consented purpose of the location on that row, and nothing the month plan
  // renders or sends prints it.
  const opportunities = readOpportunities({
    user,
    snapshot: raw,
    pathwayKey: user?.specialty || user?.pathway || null,
    colleges: list('colleges'),
    roadmap,
    deadlines: list('deadlines'),
    intel: {
      schoolContext,
      constraints: constraintsRow,
      interestHistory: list('interestHistory'),
      serviceLogs: list('serviceLogs'),
      competitions: list('competitions'),
      recommendationFeedback: feedbackRows,
      checkins: list('checkins'),
    },
    today: now,
  });

  const checkins = list('checkins');
  const reflections = list('reflectionsLog');
  const latestReflection = [...reflections].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
  const latestCheckin = [...checkins].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;

  const interests = currentInterests(list('interestHistory'));
  const direction = {
    healthcareFocus: interests.healthcare_focus?.interest || user?.specialty || user?.pathway || null,
    major: interests.major?.interest || null,
    personal: Object.values(interests).filter((i) => i.category === 'personal_interest').map((i) => i.interest),
    certainty: user?.certainty || null,
  };

  // Weekly hours the student actually has. Their own words first (the
  // constraints row), then the roadmap intake, then a conservative default that
  // is never used to push them harder than they said they could go.
  const weeklyHours = num(user?.studyHours)
    || num(roadmap?.intake?.weeklyHours)
    || null;

  const constraints = {
    timeAvailability: txt(constraintsRow?.time_availability),
    weeklyHours,
    transport: txt(constraintsRow?.transportation_limits),
    cost: txt(constraintsRow?.cost_sensitivity),
    accessibility: txt(constraintsRow?.accessibility_notes),
    family: txt(constraintsRow?.family_constraints),
    locationConsent: !!constraintsRow?.location_consent,
    // Only read when consent is on. Same rule the opportunity matcher and the
    // tutoring intel loader apply — see the header of studentIntel/store.js.
    state: constraintsRow?.location_consent ? (constraintsRow.state_code || null) : null,
    hasAny: !!(constraintsRow && (constraintsRow.time_availability || constraintsRow.transportation_limits || constraintsRow.cost_sensitivity || constraintsRow.family_constraints)),
  };

  const wellbeing = {
    stress: txt(latestReflection?.stress, 160),
    motivation: txt(latestReflection?.motivation, 160),
    confidence: txt(latestReflection?.confidence, 160),
    barriers: txt(latestReflection?.barriers, 160),
    // A voluntary self-report, never a diagnosis and never surfaced unprompted
    // as anything other than a reason to recommend LESS.
    strained: /\b(overwhelm\w*|exhaust\w*|burn(?:t|ed)? out|burnout|too much|drowning|can'?t keep up|cannot keep up|no time|stress(?:ed|ful))\b/i
      .test([latestReflection?.stress, latestReflection?.barriers, latestCheckin?.raw_text].filter(Boolean).join(' ')),
  };

  const academics = {
    ...academicsRaw,
    band: academicsRaw.hasData ? gpaBand(academicsRaw.comparableGpa) : null,
    rigorAvailable: schoolContext?.rigor_available || {},
    offersRigor: Object.values(schoolContext?.rigor_available || {}).some(Boolean),
    schoolType: schoolContext?.school_type || null,
    currentCourses: schoolContext?.current_courses || [],
    workloadNotes: txt(schoolContext?.workload_notes, 300),
    graduationYear: schoolContext?.graduation_year || num(user?.graduationYear) || years.gradYear,
    falling: academicsRaw.trend === 'falling',
    rising: academicsRaw.trend === 'rising',
  };

  const student = {
    name: user?.name || null,
    gradeStage,
    gradeNumber,
    gradeLabel: gradeStage ? GRADE_LABELS[gradeStage] : null,
    graduationYear: academics.graduationYear,
    applicationDate,
    monthsToApplication: Math.max(0, Math.round(daysBetween(today, applicationDate) / 30)),
    pathway: user?.pathway || null,
    specialty: user?.specialty || null,
  };

  const portfolio = {
    essays: list('essays'),
    essayCount: (list('essays')).length,
    research: (list('research')).length,
    clinicalHours: (list('clinicalHours')).reduce((a, h) => a + (num(h.hours) || 0), 0),
    recommenders: (list('recommenders')).length,
    awards: (list('awards')).length,
    competitions: (list('competitions')).length,
    skills: (list('skills')).length,
    quickNotes: (list('quickNotes')).length,
    // Evidence gaps are what the portfolio-capture actions are built from.
    activitiesMissingEvidence: activities.verdicts.filter((v) => v.noImpact || v.undescribed).length,
    serviceMissingEvidence: (list('serviceLogs')).filter((r) => !String(r.description || '').trim()).length,
  };

  const feedback = {
    rows: feedbackRows,
    suppressedRefs,
    suppressedLabels,
    suppressedCount: suppressedRefs.size,
    needsHelp: feedbackRows.filter((f) => f.status === 'needs_help').map((f) => ({ label: f.item_label, ref: f.item_ref })),
    paused: feedbackRows.filter((f) => f.status === 'paused').map((f) => ({ label: f.item_label, ref: f.item_ref })),
    tooExpensive: feedbackRows.some((f) => f.status === 'too_expensive'),
    tooFar: feedbackRows.some((f) => f.status === 'too_far_away'),
    tooDifficult: feedbackRows.some((f) => f.status === 'too_difficult'),
  };

  const checkinState = {
    rows: checkins,
    latest: latestCheckin,
    latestText: txt(latestCheckin?.raw_text, 400),
    due: isCheckinDue(checkins, now),
    academicUpdateDue: isAcademicUpdateDue(schoolContext, list('gpaEntries'), now),
    lastAt: latestCheckin?.created_at || null,
  };

  const signals = {
    today,
    student,
    direction,
    colleges,
    academics,
    testing,
    activities,
    leadership,
    service,
    opportunities,
    deadlines,
    constraints,
    wellbeing,
    portfolio,
    feedback,
    checkin: checkinState,
    roadmap: roadmap
      ? { hasRoadmap: true, seasonLabel: roadmap.seasons?.[0]?.label || null, itemCount: (roadmap.items || []).length }
      : { hasRoadmap: false, seasonLabel: null, itemCount: 0 },
    snapshotPartial: !!s.partial,
  };
  signals.risks = detectRisks(signals);
  return signals;
}

// ── Risks ────────────────────────────────────────────────────────────────────

/**
 * The things that are actually about to go wrong for THIS student.
 *
 * Every risk is arithmetic on a real number, and every one carries the remedy.
 * A risk list without remedies is a list of things to feel bad about, which is
 * the opposite of what this feature is for. Severity: 'critical' | 'warn' | 'note'.
 */
export function detectRisks(signals) {
  const out = [];
  const push = (r) => out.push(r);

  if (signals.deadlines.missed.length) {
    push({
      id: 'missed-deadlines', severity: 'critical',
      title: `${signals.deadlines.missed.length} deadline${signals.deadlines.missed.length === 1 ? '' : 's'} already passed`,
      detail: `${signals.deadlines.missed.slice(0, 3).map((d) => d.title).join(', ')}${signals.deadlines.missed.length > 3 ? ', and more' : ''}.`,
      remedy: 'Check each one — some have a late window, some run again next cycle, and a couple are worth writing off so they stop occupying the list.',
    });
  }
  if (signals.academics.falling) {
    push({
      id: 'grades-falling', severity: 'critical',
      title: 'Your GPA is trending down',
      detail: `From ${signals.academics.first?.gpa} to ${signals.academics.latestGpa} across ${signals.academics.count} terms. A falling transcript costs more with admissions readers than the average itself does.`,
      remedy: 'This month, protect study time before anything else on this page. Reducing a lower-value commitment is the right move here — adding one is not.',
    });
  }
  if (signals.wellbeing.strained) {
    push({
      id: 'overload-selfreported', severity: 'warn',
      title: 'You told us you are stretched',
      detail: 'Your own most recent check-in or reflection says the load is heavy.',
      remedy: 'This plan is deliberately shorter than it would otherwise be. Pausing an action here costs you nothing and is remembered.',
    });
  }
  if (signals.activities.implausibleLoad) {
    push({
      id: 'hours-implausible', severity: 'warn',
      title: `Your activities add up to about ${Math.round(signals.activities.weeklyHours)} hours a week`,
      detail: 'On top of full-time school, that is the point where a reader starts doing arithmetic instead of reading.',
      remedy: 'Either the numbers need correcting, or something needs to come off the list. Both are fine; leaving it as-is is the only bad option.',
    });
  }
  if (signals.activities.accumulating) {
    push({
      id: 'activity-accumulation', severity: 'warn',
      title: 'Wide and thin',
      detail: `${signals.activities.count} activities at an average depth score of ${signals.activities.slate.avgScore}/100. ${signals.activities.guidance ? `${signals.activities.guidance.label} usually rewards ${signals.activities.guidance.min}-${signals.activities.guidance.max}.` : ''}`,
      remedy: 'Pick the two with the most upside and put this month into them. Nothing here asks you to add another.',
    });
  }
  if (signals.colleges.missingSafety) {
    push({
      id: 'no-safety', severity: 'warn',
      title: 'No safety college on your list',
      detail: 'A list of reaches is not a strategy, however strong the profile behind it is.',
      remedy: 'Add two schools you would genuinely be happy to attend and would very likely get into. It costs an afternoon and it changes what next autumn feels like.',
    });
  }
  if (signals.testing.behind) {
    push({
      id: 'no-test-score', severity: 'warn',
      title: 'No SAT or ACT score logged',
      detail: `You are in ${signals.student.gradeLabel || 'high school'} and there is no sitting on record.`,
      remedy: 'Book a date. We are not a test-prep product — but the date is the thing that makes the preparation happen, and it is a fifteen-minute job.',
    });
  }
  if (signals.activities.noLeadership && (signals.student.gradeNumber || 0) >= 10) {
    push({
      id: 'no-leadership', severity: 'note',
      title: 'No leadership recorded anywhere',
      detail: 'Not a crisis, and titles are not the point — but real responsibility inside something you already do is the highest-value move available to you.',
      remedy: 'One recurring responsibility inside your strongest activity is the first rung, and it is usually available for the asking.',
    });
  }
  if (signals.leadership.titleWithoutSubstance.length) {
    push({
      id: 'thin-title', severity: 'note',
      title: 'A title with not much behind it yet',
      detail: `${signals.leadership.titleWithoutSubstance.map((t) => t.name).join(', ')} — held for under two years with no recorded outcome.`,
      remedy: 'Readers weigh what the role produced, not what it was called. One finished project under that title is what makes it count.',
    });
  }
  if (signals.service.flags.length) {
    push({
      id: 'service-clarity', severity: 'note',
      title: 'A few service entries need a second look',
      detail: signals.service.flags.map((f) => f.label).join('; '),
      remedy: 'Nothing here is being discounted — but hours with a sentence beside them are evidence, and hours without one are not.',
    });
  }
  if (signals.colleges.counts.total === 0) {
    push({
      id: 'no-colleges', severity: 'note',
      title: 'No colleges on your list yet',
      detail: 'Almost everything else in this plan is sharper once we know what you are aiming at.',
      remedy: 'Three names is enough to start. The list is meant to change.',
    });
  }
  if (signals.portfolio.activitiesMissingEvidence >= 3) {
    push({
      id: 'evidence-gap', severity: 'note',
      title: `${signals.portfolio.activitiesMissingEvidence} activities with no description or no impact line`,
      detail: 'The work happened; the record of it did not. That gap is the cheapest thing on this page to close.',
      remedy: 'Fifteen minutes and one sentence each. Do it while you still remember the numbers.',
    });
  }
  return out;
}
