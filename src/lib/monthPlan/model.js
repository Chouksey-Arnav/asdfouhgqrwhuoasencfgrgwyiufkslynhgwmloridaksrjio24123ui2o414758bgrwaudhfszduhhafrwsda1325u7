// ─────────────────────────────────────────────────────────────────────────────
// The MONTH PLAN document: its shape, its invariants, and every pure operation
// that reads or mutates one.
//
// ── Why a month, when a twelve-month roadmap already exists ──────────────────
// src/lib/roadmap/ answers "what does my year look like". It is a strategy
// document, and it is the right artifact for a student who has already decided
// to think a year ahead. It is the WRONG artifact for the question the large
// majority of students actually open the app with, which is:
//
//     "It is Tuesday. What do I do?"
//
// A season thesis does not answer that. Forty dated items do not answer that.
// The month plan does: one objective, a ranked handful of actions with a
// definition of done attached to each, four weeks with a shape, and an honest
// list of what is about to go wrong. It is the free-plan experience and it is
// deliberately the first thing the Roadmap tab shows.
//
// ── Everything here is pure ──────────────────────────────────────────────────
// No React, no network, no theme. The UI renders what this produces, the
// generator repairs into this shape, App.jsx persists it on the user record,
// and scripts/verifyMonthPlan.mjs asserts on all of it under plain Node.
//
// ── The invariant that matters most ─────────────────────────────────────────
// EVERY ACTION IS TRACEABLE TO A RULE, AND EVERY DATE IS TRACEABLE TO A SOURCE.
// An action carries `source: 'rule:<id>'` naming the deterministic rule in
// rules.js that produced it, and a dated action carries `timing.origin` naming
// where the date came from: 'catalog' (the hand-checked opportunity catalog),
// 'student' (a date they entered — a deadline row, a college deadline), or
// 'cycle' (this month's own week boundaries, which are arithmetic). There is no
// fourth category, and in particular there is no "date the model produced" —
// see assertTraceable() below, which the verify script runs against fixtures.
//
// ── The promise this document may never make ────────────────────────────────
// Nothing in a month plan may promise admission, claim to secure a result, or
// guarantee a top-10/top-30 outcome. That is not a copy guideline, it is an
// asserted property: FORBIDDEN_CLAIM_PATTERNS below is greped over every
// generated string by the verify script AND enforced at repair time by
// scrubClaims(), so a model that writes "this will get you into Hopkins" has
// the sentence removed before a student ever sees it.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, daysBetween, shiftDays } from '../timeline.js';

export const MONTH_PLAN_VERSION = 1;

/** How long a cycle runs. Four weeks, not "a calendar month": weeks are what a student schedules in. */
export const CYCLE_WEEKS = 4;
export const CYCLE_DAYS = CYCLE_WEEKS * 7;

// ── Action states ────────────────────────────────────────────────────────────
// The negative and stalled states are first-class and carry as much product
// weight as 'complete'. A student who says "too expensive" has told us something
// far more actionable than one who silently never does the thing, and the whole
// adaptation layer below exists to make saying so worth their while.
//
// These strings are deliberately the SAME vocabulary as the `status` check
// constraint on recommendation_feedback (supabase/migrations/0026), with one
// mechanical mapping (RECOMMENDATION_STATUS) rather than two parallel lists —
// so a decision made on a roadmap card suppresses the same suggestion in
// Medabrain, the master plan, and the opportunity matcher without any of them
// knowing the month plan exists.
export const ACTION_STATES = [
  'not_started',
  'in_progress',
  'complete',
  'paused',
  'declined',
  'not_interested',
  'too_difficult',
  'too_expensive',
  'too_far_away',
  'no_longer_eligible',
  'needs_help',
];

/** States that still want the student's attention this cycle. */
export const OPEN_ACTION_STATES = new Set(['not_started', 'in_progress', 'needs_help']);

/** States that mean "do not offer me this again" — mirrored into recommendation_feedback. */
export const SUPPRESSING_STATES = new Set([
  'declined', 'not_interested', 'too_difficult', 'too_expensive', 'too_far_away', 'no_longer_eligible',
]);

/** States that mean "not now, but not never". A paused action is revisited, never counted against them. */
export const DEFERRING_STATES = new Set(['paused']);

/** month-plan state → the recommendation_feedback.status it is written as. 'not_started' writes nothing. */
export const RECOMMENDATION_STATUS = {
  in_progress: 'in_progress',
  complete: 'completed',
  paused: 'paused',
  declined: 'declined',
  not_interested: 'not_interested',
  too_difficult: 'too_difficult',
  too_expensive: 'too_expensive',
  too_far_away: 'too_far_away',
  no_longer_eligible: 'no_longer_eligible',
  needs_help: 'needs_help',
};

/**
 * month-plan state → the opportunity layer's action id.
 *
 * The join between two vocabularies that describe the same student decision.
 * The month plan's states are about a PLANNED ACTION ("I paused this task");
 * OPPORTUNITY_ACTIONS in src/lib/opportunity/feedback.js are about an
 * OPPORTUNITY ("I paused this program"). Where a month-plan action is linked to
 * an opportunity these are the same event, and this table is the single place
 * that says so — so a decision made on a roadmap card lands in
 * recommendation_feedback in exactly the format the opportunity ranker reads
 * back, including its note encoding and its decay.
 *
 * scripts/verifyMonthPlan.mjs asserts every value here is a real action id and
 * that every suppressing month-plan state maps to a suppressing one.
 */
export const MONTH_ACTION_TO_OPPORTUNITY_ACTION = {
  in_progress: 'applying',
  complete: 'completed',
  paused: 'paused',
  declined: 'declined',
  not_interested: 'not_interested',
  too_difficult: 'too_difficult',
  too_expensive: 'too_expensive',
  too_far_away: 'too_far_away',
  no_longer_eligible: 'no_longer_eligible',
  needs_help: 'needs_help',
};

/** The domains an action can belong to. Order is the order they rank in a tie. */
export const ACTION_DOMAINS = [
  'academics', 'testing', 'application', 'opportunity', 'activity',
  'leadership', 'service', 'portfolio', 'wellbeing',
];

export const PRIORITIES = ['critical', 'high', 'standard', 'optional'];
const PRIORITY_WEIGHT = { critical: 0, high: 1, standard: 2, optional: 3 };

/** Where a date came from. See this file's header — there is no fourth value. */
export const DATE_ORIGINS = ['catalog', 'student', 'cycle'];

// ── The claims a plan may never make ─────────────────────────────────────────
// Greped over every student-facing string in a generated plan. Each pattern is
// a sentence shape that promises an admissions outcome; the remedy is removal
// of the offending sentence, not softening of it, because a softened promise is
// still a promise and this is the one place the product cannot be wrong.
export const FORBIDDEN_CLAIM_PATTERNS = [
  /\b(guarantee|guaranteed|guarantees)\b/i,
  /\bwill (?:get|gain|secure|earn) you (?:in|into|admission|acceptance)\b/i,
  /\bsecure(?:s|d)? (?:you )?(?:a|your) (?:spot|place|admission|acceptance)\b/i,
  /\b(?:ensures?|assures?) (?:your |you )?(?:admission|acceptance|a spot)\b/i,
  /\byou(?:'ll| will)?\s+(?:get|be)\s+accepted\s+into\b/i,
  /\bgets? you into\b/i,
  /\b(?:lock|locks|locking) in (?:a|your) (?:spot|place|acceptance|admission)\b/i,
  /\bguaranteed (?:top[- ]?(?:10|20|30)|ivy)\b/i,
];

/** True when `text` contains a promise the product may not make. */
export function makesForbiddenClaim(text) {
  const s = String(text || '');
  return FORBIDDEN_CLAIM_PATTERNS.some((re) => re.test(s));
}

/**
 * Remove any sentence making a forbidden claim, keeping the rest of the text.
 *
 * Sentence-level rather than whole-field, because a three-sentence reason whose
 * middle sentence over-promises is still two useful sentences — and blanking
 * the field would leave a card with no reason at all, which is its own failure.
 */
export function scrubClaims(text) {
  const s = String(text || '');
  if (!s) return '';
  if (!makesForbiddenClaim(s)) return s;
  const kept = s
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !makesForbiddenClaim(sentence))
    .join(' ')
    .trim();
  return kept;
}

// ── Reading a plan ───────────────────────────────────────────────────────────

export const allActions = (plan) => (Array.isArray(plan?.actions) ? plan.actions : []);
export const backlogActions = (plan) => (Array.isArray(plan?.backlog) ? plan.backlog : []);

export const actionById = (plan, id) => allActions(plan).find((a) => a.id === id) || null;

export const openActions = (plan) => allActions(plan).filter((a) => OPEN_ACTION_STATES.has(a.status));

/** Actions belonging to week `index` (0-based), open ones first. */
export function actionsInWeek(plan, index) {
  return allActions(plan)
    .filter((a) => a.weekIndex === index)
    .sort((a, b) => rankOf(a) - rankOf(b));
}

const rankOf = (a) => (Number.isFinite(a?.rank) ? a.rank : 999);

/**
 * The ranked list a student reads top-down. Priority first, then the plan's own
 * ranking, then domain order — never alphabetical and never insertion order,
 * both of which produce a list whose first item is arbitrary.
 */
export function rankedActions(plan, { includeSettled = false } = {}) {
  return allActions(plan)
    .filter((a) => includeSettled || OPEN_ACTION_STATES.has(a.status))
    .sort((a, b) => {
      const p = (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2);
      if (p !== 0) return p;
      const r = rankOf(a) - rankOf(b);
      if (r !== 0) return r;
      return ACTION_DOMAINS.indexOf(a.domain) - ACTION_DOMAINS.indexOf(b.domain);
    });
}

/** How urgent an open action is today. Mirrors the year roadmap's vocabulary so the two tabs agree. */
export function actionUrgency(action, today = dayKey()) {
  if (!action || !OPEN_ACTION_STATES.has(action.status)) return 'settled';
  const due = action?.timing?.dueDate || null;
  if (!due) return 'flexible';
  const d = daysBetween(today, due);
  if (d < 0) return 'missed';
  if (d <= 7) return 'this-week';
  if (d <= 21) return 'soon';
  return 'later';
}

/** Completion and load statistics for the whole cycle. */
export function planStats(plan, today = dayKey()) {
  const actions = allActions(plan);
  const complete = actions.filter((a) => a.status === 'complete');
  const open = actions.filter((a) => OPEN_ACTION_STATES.has(a.status));
  const paused = actions.filter((a) => a.status === 'paused');
  const declined = actions.filter((a) => SUPPRESSING_STATES.has(a.status));
  const needsHelp = actions.filter((a) => a.status === 'needs_help');
  // Declined and paused actions leave the denominator. A student who decided
  // three things were not for them has not failed at three things — the same
  // rule roadmapStats() applies to 'skipped', for the same reason.
  const counted = actions.length - declined.length - paused.length;
  const urgencies = open.map((a) => actionUrgency(a, today));
  return {
    total: actions.length,
    complete: complete.length,
    open: open.length,
    paused: paused.length,
    declined: declined.length,
    needsHelp: needsHelp.length,
    pct: counted > 0 ? Math.round((complete.length / counted) * 100) : 0,
    missed: urgencies.filter((u) => u === 'missed').length,
    thisWeek: urgencies.filter((u) => u === 'this-week').length,
    plannedHours: Math.round(open.reduce((s, a) => s + (Number(a.effortHours) || 0), 0) * 10) / 10,
    completedHours: Math.round(complete.reduce((s, a) => s + (Number(a.effortHours) || 0), 0) * 10) / 10,
  };
}

/** Which week index `date` falls in, or null when it is outside the cycle. */
export function weekIndexFor(plan, date) {
  if (!plan?.cycleStart || !date) return null;
  const offset = daysBetween(plan.cycleStart, date);
  if (offset < 0 || offset >= CYCLE_DAYS) return null;
  return Math.floor(offset / 7);
}

/** The week the student is living in right now, or the last one once the cycle has elapsed. */
export function currentWeek(plan, today = dayKey()) {
  const weeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  if (!weeks.length) return null;
  const idx = weekIndexFor(plan, today);
  if (idx == null) return today < plan.cycleStart ? weeks[0] : weeks[weeks.length - 1];
  return weeks[idx] || weeks[weeks.length - 1];
}

/**
 * The in-app reminders due today or overdue, soonest first.
 *
 * In-app only, forever: this app does not email or push a minor about a
 * deadline (see AGENTS.md), so a "reminder" is a row the UI renders when the
 * student is already here, never a message that chases them.
 */
export function dueReminders(plan, today = dayKey(), { horizonDays = 14 } = {}) {
  return (Array.isArray(plan?.reminders) ? plan.reminders : [])
    .filter((r) => r?.date)
    .map((r) => ({ ...r, daysOut: daysBetween(today, r.date) }))
    .filter((r) => r.daysOut <= horizonDays)
    .filter((r) => {
      const a = r.actionId ? actionById(plan, r.actionId) : null;
      return !a || OPEN_ACTION_STATES.has(a.status);
    })
    .sort((a, b) => a.daysOut - b.daysOut);
}

/** True when the cycle has run its course and a refresh is owed. */
export function planIsExpired(plan, today = dayKey()) {
  if (!plan?.cycleEnd) return false;
  return daysBetween(today, plan.cycleEnd) < 0;
}

/** Days left in the cycle, floored at zero. */
export function daysLeft(plan, today = dayKey()) {
  if (!plan?.cycleEnd) return 0;
  return Math.max(0, daysBetween(today, plan.cycleEnd));
}

/**
 * A fingerprint of the inputs a plan was built from. When it changes, the plan
 * is describing a student who no longer exists and the UI offers a refresh
 * rather than quietly serving stale advice. Same contract as
 * roadmapFingerprint(), deliberately: two staleness rules that disagree would
 * be worse than either alone.
 */
export function monthPlanFingerprint({ user = null, signals = null } = {}) {
  const s = signals || {};
  return [
    user?.gradeStage || '',
    s.student?.gradeNumber ?? '',
    s.student?.graduationYear ?? '',
    s.colleges?.counts ? `${s.colleges.counts.dream}/${s.colleges.counts.reach}/${s.colleges.counts.target}/${s.colleges.counts.safety}` : '',
    s.activities?.count ?? '',
    s.service?.total ?? '',
    s.academics?.latestGpa ?? '',
    s.testing?.latestComposite ?? '',
    s.constraints?.weeklyHours ?? '',
    s.feedback?.suppressedCount ?? '',
  ].join('~');
}

export function planIsStale(plan, inputs) {
  if (!plan) return false;
  return !!plan.fingerprint && plan.fingerprint !== monthPlanFingerprint(inputs);
}

// ── Invariants ───────────────────────────────────────────────────────────────

/**
 * Every action traces to a rule, and every date traces to a source.
 * Returns the list of violations, empty when clean. See this file's header.
 */
export function assertTraceable(plan) {
  const problems = [];
  const seen = new Set();
  [...allActions(plan), ...backlogActions(plan)].forEach((a) => {
    if (!a?.id) { problems.push('an action has no id'); return; }
    if (seen.has(a.id)) problems.push(`duplicate action id "${a.id}"`);
    seen.add(a.id);
    if (!a.source || !/^rule:/.test(a.source)) {
      problems.push(`"${a.title}" has no rule provenance — something invented it`);
    }
    if (!ACTION_STATES.includes(a.status)) problems.push(`"${a.title}" has unknown status "${a.status}"`);
    if (!ACTION_DOMAINS.includes(a.domain)) problems.push(`"${a.title}" has unknown domain "${a.domain}"`);
    if (a.timing?.dueDate && !DATE_ORIGINS.includes(a.timing?.origin)) {
      problems.push(`"${a.title}" carries a date with no traceable origin`);
    }
    if (!a.definitionOfDone) problems.push(`"${a.title}" has no definition of done`);
  });
  return problems;
}

/** Every student-facing string in the plan, for the forbidden-claim grep. */
export function planStrings(plan) {
  const out = [];
  const push = (v) => { if (typeof v === 'string' && v.trim()) out.push(v); };
  push(plan?.objective?.headline); push(plan?.objective?.body); push(plan?.objective?.why);
  push(plan?.direction?.summary);
  (plan?.direction?.watchOut || []).forEach(push);
  (plan?.weeks || []).forEach((w) => { push(w.label); push(w.theme); });
  (plan?.risks || []).forEach((r) => { push(r.title); push(r.detail); push(r.remedy); });
  [...allActions(plan), ...backlogActions(plan)].forEach((a) => {
    push(a.title); push(a.reason); push(a.whyThisMatters); push(a.definitionOfDone); push(a.evidenceToLog);
  });
  push(plan?.activityPlan?.note);
  push(plan?.leadershipPath?.note);
  (plan?.leadershipPath?.steps || []).forEach((s) => push(typeof s === 'string' ? s : s?.label));
  return out;
}

/** The forbidden-claim check over a whole plan. Empty array means clean. */
export function claimViolations(plan) {
  return planStrings(plan).filter(makesForbiddenClaim);
}

// ── Mutations ────────────────────────────────────────────────────────────────
// All immutable: every one returns a new plan and bumps `updatedAt`, because the
// persistence layer diffs on that stamp exactly the way roadmap/store.js does.

const touch = (plan, patch) => ({ ...plan, ...patch, updatedAt: Date.now() });

function mapAction(plan, actionId, fn) {
  let found = false;
  const actions = allActions(plan).map((a) => {
    if (a.id !== actionId) return a;
    found = true;
    return fn(a);
  });
  return found ? touch(plan, { actions }) : plan;
}

/**
 * Record a state change on one action.
 *
 * `note` is the student's own words about why, and it is kept verbatim — it is
 * the single most valuable thing the adaptation layer gets, and paraphrasing it
 * into a category would throw away the half that made it useful.
 */
export function setActionState(plan, actionId, status, note = '') {
  if (!ACTION_STATES.includes(status)) return plan;
  const now = Date.now();
  return mapAction(plan, actionId, (a) => ({
    ...a,
    status,
    statusNote: note ? String(note).slice(0, 400) : (a.statusNote || ''),
    statusAt: now,
    progress: {
      ...(a.progress || {}),
      startedAt: status === 'in_progress' && !a.progress?.startedAt ? now : (a.progress?.startedAt || null),
      completedAt: status === 'complete' ? now : null,
    },
  }));
}

/** Tick one of an action's steps. Steps are how a big action stops being intimidating. */
export function toggleActionStep(plan, actionId, stepIndex) {
  return mapAction(plan, actionId, (a) => {
    const done = new Set(a.doneSteps || []);
    if (done.has(stepIndex)) done.delete(stepIndex); else done.add(stepIndex);
    return { ...a, doneSteps: [...done].sort((x, y) => x - y) };
  });
}

/** The student attaches the evidence they logged when finishing something. */
export function recordEvidence(plan, actionId, evidence) {
  const text = String(evidence || '').trim();
  if (!text) return plan;
  return mapAction(plan, actionId, (a) => ({
    ...a,
    evidenceLogged: [...(a.evidenceLogged || []), { text: text.slice(0, 400), at: Date.now() }].slice(-6),
  }));
}

/** Move an action to a different week — the student disagreeing with the sequencing. */
export function moveActionToWeek(plan, actionId, weekIndex) {
  if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= CYCLE_WEEKS) return plan;
  return mapAction(plan, actionId, (a) => ({ ...a, weekIndex, movedByStudent: true }));
}

/** Append an adaptation event to the bounded history the UI shows as "what changed and why". */
export function noteAdaptation(plan, entry) {
  const history = [...(Array.isArray(plan?.history) ? plan.history : []), { at: Date.now(), ...entry }];
  return touch(plan, { history: history.slice(-40) });
}

/** Promote one backlog action into the live list, at the end of the given week. */
export function promoteFromBacklog(plan, backlogId, { weekIndex = null, reason = '' } = {}) {
  const candidate = backlogActions(plan).find((a) => a.id === backlogId);
  if (!candidate) return plan;
  const week = Number.isInteger(weekIndex) ? weekIndex : (weekIndexFor(plan, dayKey()) ?? 0);
  const promoted = {
    ...candidate,
    weekIndex: week,
    status: 'not_started',
    rank: allActions(plan).length + 1,
    promotedReason: reason || null,
  };
  return touch(plan, {
    actions: [...allActions(plan), promoted],
    backlog: backlogActions(plan).filter((a) => a.id !== backlogId),
  });
}

/** The student adds something of their own. Their date is theirs; it is never argued with. */
export function addStudentAction(plan, { title, domain = 'portfolio', dueDate = null, reason = '', definitionOfDone = '', effortHours = 1 }) {
  const id = `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const week = dueDate ? (weekIndexFor(plan, dueDate) ?? 0) : (weekIndexFor(plan, dayKey()) ?? 0);
  const action = {
    id,
    domain: ACTION_DOMAINS.includes(domain) ? domain : 'portfolio',
    title: String(title || 'Untitled').slice(0, 140),
    reason: String(reason || 'You added this yourself.').slice(0, 300),
    whyThisMatters: '',
    timing: dueDate
      ? { dueDate, dueLabel: 'Your own date', origin: 'student', precision: 'exact' }
      : { dueDate: null, dueLabel: 'This month', origin: 'cycle', precision: 'flexible' },
    effortHours: Number(effortHours) || 1,
    priority: 'standard',
    rank: allActions(plan).length + 1,
    definitionOfDone: String(definitionOfDone || 'You decide when this one is done.').slice(0, 300),
    evidenceToLog: 'Anything that proves it happened — a photo, a link, a line in your log.',
    link: null,
    status: 'not_started',
    statusNote: '',
    statusAt: null,
    weekIndex: week,
    steps: [],
    doneSteps: [],
    progress: { startedAt: null, completedAt: null },
    source: 'rule:student-added',
    addedBy: 'student',
  };
  return touch(plan, { actions: [...allActions(plan), action] });
}

export function removeAction(plan, actionId) {
  return touch(plan, { actions: allActions(plan).filter((a) => a.id !== actionId) });
}

// ── Cycle arithmetic ─────────────────────────────────────────────────────────

/** The four weeks of a cycle starting on `cycleStart`, as plain date ranges. */
export function buildWeeks(cycleStart, themes = []) {
  return Array.from({ length: CYCLE_WEEKS }, (_, i) => ({
    index: i,
    startDate: shiftDays(cycleStart, i * 7),
    endDate: shiftDays(cycleStart, i * 7 + 6),
    label: `Week ${i + 1}`,
    theme: themes[i] || '',
    // `origin: 'cycle'` — these dates are arithmetic on today, which is the one
    // kind of date this document is allowed to produce by itself.
    origin: 'cycle',
  }));
}

export const cycleEndFor = (cycleStart) => shiftDays(cycleStart, CYCLE_DAYS - 1);
