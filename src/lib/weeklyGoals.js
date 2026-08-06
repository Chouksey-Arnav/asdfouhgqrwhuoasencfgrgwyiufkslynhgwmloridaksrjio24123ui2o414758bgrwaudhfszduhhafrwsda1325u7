// ─────────────────────────────────────────────────────────────────────────────
// Weekly Portfolio goals — the engine behind the Overview tab's mini dashboards.
//
// The Portfolio used to be a set of read-only counters: 14 numbers that only ever went up, with
// nothing asking anything of the student this week. Nothing in it could be "behind" or "done",
// so nothing in it created any pull. This module is the missing half: every important part of
// the application gets a *weekly* target, a live measured value, and a progress bar.
//
// Three rules govern the design, and the first one is the important one:
//
//   1. META BRAIN NEVER SETS A GOAL. It recommends — loudly, constantly, with its reasoning
//      spelled out — and the student is the only thing that can write a target. Every function
//      below that produces a number for Meta Brain (recommendTarget) is pure and returns a
//      suggestion object; the only function that persists anything (setGoal) takes an explicit
//      `source` and is only ever called from a real user gesture. Tapping "Use Meta Brain's
//      number" is a user action that copies the recommendation into their own goal — the student
//      is still the author, which is the whole point.
//
//   2. RECOMMENDATIONS MUST BE ACHIEVABLE. A target no one can hit is worse than no target: it
//      teaches the student to ignore the bar. Every recommendation is clamped to the metric's
//      realistic per-week ceiling, floored at the smallest meaningful step, and shaped by what
//      this student has actually managed over the last few weeks (see paceOf) rather than by
//      what an idealized applicant "should" do. Deadline pressure can raise a recommendation,
//      but never past the ceiling.
//
//   3. PROGRESS IS MEASURED, NEVER SELF-REPORTED. Each metric derives its weekly value from real
//      rows the student created — timestamps on their clinical-hour entries, essay versions,
//      tracked scholarships, mock interviews. There is no "mark this week done" button, because
//      a goal you can satisfy by clicking a button measures clicking buttons.
//
// Storage lives on the user record (`user.portfolioGoals`), which rides the existing
// progress-sync snapshot (see db.js buildSyncSnapshot / mergeUserRecord), so goals follow the
// student across devices without a new table or migration.
// ─────────────────────────────────────────────────────────────────────────────
import { getIsoWeekKey, getStartOfWeek } from './gamification.js';

export { getIsoWeekKey, getStartOfWeek };

/** Monday 00:00 → next Monday 00:00 for the week containing `date`. */
export function weekRange(date = new Date()) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end, key: getIsoWeekKey(start) };
}

/** ISO week keys for the `count` weeks ending with the one containing `date`, oldest first. */
export function recentWeekKeys(count = 6, date = new Date()) {
  const out = [];
  const cursor = getStartOfWeek(date);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    out.push(getIsoWeekKey(d));
  }
  return out;
}

/** Human label for a week key's range, e.g. "Mar 3 – Mar 9". */
export function weekLabel(date = new Date()) {
  const { start } = weekRange(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Whole days left in the current week, counting today (7 on Monday, 1 on Sunday). */
export function daysLeftInWeek(date = new Date()) {
  const { end } = weekRange(date);
  return Math.max(1, Math.ceil((end - date) / 86400000));
}

// ── Timestamp helpers ────────────────────────────────────────────────────────
// Rows come back from /api/data/[resource] with Postgres timestamps (`created_at`,
// `updated_at`) and, for a few tables, a student-chosen date (`entry_date`). A date-only string
// is parsed as local midnight on purpose: an entry_date of "2026-03-09" means that day in the
// student's own week, not 00:00 UTC (which lands in the previous week for anyone west of
// Greenwich, silently misfiling every Monday entry).
export function toTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const str = String(value);
  const t = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00`).getTime() : new Date(str).getTime();
  return Number.isNaN(t) ? null : t;
}

function inRange(value, start, end) {
  const t = toTime(value);
  return t !== null && t >= start.getTime() && t < end.getTime();
}

const countIn = (rows, field, start, end) => (rows || []).filter((r) => inRange(r[field], start, end)).length;

// ── Metric registry ──────────────────────────────────────────────────────────
// Every metric is one mini dashboard on the Overview tab. `measure` receives the whole portfolio
// snapshot plus a week window and returns this week's real number; `total` is the lifetime
// context line underneath it. `view` is the Portfolio sub-view the tile's action button jumps to,
// which is what turns each dashboard from a readout into a doorway.
//
// `colorKey`/`iconKey` are strings rather than imported values so this module stays pure data +
// math (importable by the Node verify script, which has neither a DOM nor lucide-react).
export const METRICS = [
  {
    id: 'clinicalHours',
    label: 'Clinical & Shadowing Hours',
    short: 'Clinical hours',
    unit: 'hours',
    unitShort: 'hrs',
    verb: 'log',
    colorKey: 'pink',
    iconKey: 'stethoscope',
    view: 'clinical',
    step: 1,
    min: 1,
    ceiling: 20,           // rule 2: a high schooler cannot sustainably clock more than this weekly
    defaultTarget: 4,
    blurb: 'Hours at a hospital, clinic, or shadowing a provider — the single hardest part of a pre-health application to build late.',
    measure: (d, { start, end }) => Math.round(
      (d.clinicalHours || [])
        .filter((h) => inRange(h.entry_date || h.created_at, start, end))
        .reduce((s, h) => s + (Number(h.hours) || 0), 0) * 10,
    ) / 10,
    total: (d) => Math.round((d.clinicalHours || []).reduce((s, h) => s + (Number(h.hours) || 0), 0)),
    totalLabel: 'hours logged all-time',
  },
  {
    id: 'essayWords',
    label: 'Essay Writing',
    short: 'Essay words',
    unit: 'words',
    unitShort: 'words',
    verb: 'write',
    colorKey: 'violet',
    iconKey: 'scrollText',
    view: 'essays',
    step: 50,
    min: 50,
    ceiling: 2000,
    defaultTarget: 300,
    blurb: 'Words added across your drafts this week. Measured from the versions you actually save, so a week of real writing shows up and a week of staring at the page does not.',
    // Words *added*, not words present: for each essay, the best draft saved this week minus the
    // best draft saved before it. An edit that cuts 200 words is not negative progress, so each
    // essay floors at 0 rather than dragging the week's total down.
    measure: (d, { start, end }) => {
      const byEssay = new Map();
      for (const v of d.essayVersions || []) {
        const t = toTime(v.created_at);
        if (t === null) continue;
        const bucket = byEssay.get(v.essay_id) || { before: 0, during: 0 };
        const words = Number(v.word_count) || 0;
        if (t < start.getTime()) bucket.before = Math.max(bucket.before, words);
        else if (t < end.getTime()) bucket.during = Math.max(bucket.during, words);
        byEssay.set(v.essay_id, bucket);
      }
      let sum = 0;
      for (const { before, during } of byEssay.values()) sum += Math.max(0, during - before);
      return sum;
    },
    total: (d) => (d.essays || []).length,
    totalLabel: 'essays in your workspace',
  },
  {
    id: 'opportunitiesTracked',
    label: 'Opportunities Tracked',
    short: 'Opportunities',
    unit: 'programs',
    unitShort: '',
    verb: 'track',
    colorKey: 'blue',
    iconKey: 'compass',
    view: 'tracked',
    step: 1,
    min: 1,
    ceiling: 10,
    defaultTarget: 2,
    blurb: 'Programs, competitions, and scholarships you pulled out of the database into your own tracker. Finding them is the work; applying comes after.',
    measure: (d, { start, end }) =>
      countIn(d.activities, 'created_at', start, end) + countIn(d.scholarships, 'created_at', start, end),
    total: (d) => (d.activities || []).length + (d.scholarships || []).length,
    totalLabel: 'items in your tracker',
  },
  {
    id: 'applicationsSubmitted',
    label: 'Applications Moved Forward',
    short: 'Applications',
    unit: 'items',
    unitShort: '',
    verb: 'advance',
    colorKey: 'green',
    iconKey: 'send',
    view: 'tracked',
    step: 1,
    min: 1,
    ceiling: 8,
    defaultTarget: 1,
    blurb: 'Tracked scholarships and programs whose status you actually moved this week — researching → applying → submitted. Tracking without moving is a list, not an application.',
    // updated_at only diverges from created_at once a row has been edited, so a row created and
    // never touched again can't count here — which is exactly the distinction this metric exists
    // to draw between "I saved it" and "I worked on it".
    measure: (d, { start, end }) => (d.scholarships || []).filter((s) =>
      inRange(s.updated_at, start, end) && toTime(s.updated_at) !== toTime(s.created_at)).length
      + (d.colleges || []).filter((c) => inRange(c.updated_at, start, end) && toTime(c.updated_at) !== toTime(c.created_at)).length,
    total: (d) => (d.scholarships || []).filter((s) => ['applying', 'submitted', 'awarded'].includes(s.status)).length,
    totalLabel: 'scholarships in flight',
  },
  {
    id: 'collegesResearched',
    label: 'College List',
    short: 'Colleges',
    unit: 'schools',
    unitShort: '',
    verb: 'add',
    colorKey: 'sky',
    iconKey: 'graduationCap',
    view: 'colleges',
    step: 1,
    min: 1,
    ceiling: 8,
    defaultTarget: 2,
    blurb: 'Schools researched and added to your list with a real reason for being there — reach, target, and likely, not twelve reaches.',
    measure: (d, { start, end }) => countIn(d.colleges, 'created_at', start, end),
    total: (d) => (d.colleges || []).length,
    totalLabel: 'schools on your list',
  },
  {
    id: 'activityHours',
    label: 'Activity & Service Hours',
    short: 'Activity hours',
    unit: 'hours',
    unitShort: 'hrs',
    verb: 'commit',
    colorKey: 'amber',
    iconKey: 'award',
    view: 'resume',
    step: 1,
    min: 1,
    ceiling: 25,
    defaultTarget: 5,
    blurb: 'Your committed weekly hours across every ongoing activity — the number admissions reads as "what does this person actually do with their week".',
    // A commitment level, not an event count: this is the sum of hours/week the student has
    // declared across ongoing activities, so the goal is "get my real weekly commitment up to X"
    // rather than "add more rows".
    measure: (d) => Math.round((d.activities || [])
      .filter((a) => a.status === 'ongoing')
      .reduce((s, a) => s + (parseFloat(a.hours_per_week) || 0), 0) * 10) / 10,
    total: (d) => (d.activities || []).length,
    totalLabel: 'activities on your resume',
    cumulative: true, // measures a standing level, so it does not reset to 0 each Monday
  },
  {
    id: 'researchProgress',
    label: 'Research',
    short: 'Research hours',
    unit: 'hours',
    unitShort: 'hrs',
    verb: 'log',
    colorKey: 'cyan',
    iconKey: 'flask',
    view: 'research',
    step: 1,
    min: 1,
    ceiling: 20,
    defaultTarget: 3,
    blurb: 'Lab time, independent project work, or literature reading logged against a research experience.',
    measure: (d, { start, end }) => Math.round((d.research || [])
      .filter((r) => inRange(r.updated_at || r.created_at, start, end))
      .reduce((s, r) => s + (Number(r.hours) || 0), 0) * 10) / 10,
    total: (d) => (d.research || []).length,
    totalLabel: 'research experiences',
  },
  {
    id: 'interviewReps',
    label: 'Interview Practice',
    short: 'Mock interviews',
    unit: 'sessions',
    unitShort: '',
    verb: 'practice',
    colorKey: 'orange',
    iconKey: 'mic',
    view: 'interview',
    step: 1,
    min: 1,
    ceiling: 7,
    defaultTarget: 1,
    blurb: 'Mock interview and MMI/CASPer reps. The skill that decays fastest without practice, and the one nobody schedules until it is too late.',
    measure: (d, { start, end }) => (d.interviewSessions || [])
      .filter((s) => inRange(s.completedAt, start, end)).length,
    total: (d) => (d.interviewSessions || []).length,
    totalLabel: 'sessions completed',
  },
  {
    id: 'recommenderTouchpoints',
    label: 'Recommenders',
    short: 'Recommenders',
    unit: 'touchpoints',
    unitShort: '',
    verb: 'move',
    colorKey: 'fuchsia',
    iconKey: 'userCheck',
    view: 'recommenders',
    step: 1,
    min: 1,
    ceiling: 5,
    defaultTarget: 1,
    blurb: 'People added, asked, or confirmed this week. Letters are the one piece of your application someone else has to write — start early, ask in person.',
    measure: (d, { start, end }) => (d.recommenders || [])
      .filter((r) => inRange(r.updated_at || r.created_at, start, end)).length,
    total: (d) => (d.recommenders || []).filter((r) => r.status === 'confirmed' || r.status === 'received').length,
    totalLabel: 'confirmed letters',
  },
  {
    id: 'deadlinesHandled',
    label: 'Deadlines Under Control',
    short: 'Deadlines',
    unit: 'items',
    unitShort: '',
    verb: 'handle',
    colorKey: 'rose',
    iconKey: 'calendarClock',
    view: 'deadlines',
    step: 1,
    min: 1,
    ceiling: 8,
    defaultTarget: 1,
    blurb: 'Deadlines added or dated this week. Every tracked item with a real date on it is one fewer thing that can surprise you in October.',
    measure: (d, { start, end }) => countIn(d.deadlines, 'created_at', start, end),
    total: (d) => (d.deadlines || []).length,
    totalLabel: 'deadlines tracked',
  },
  {
    id: 'skillsCerts',
    label: 'Skills & Certifications',
    short: 'Certifications',
    unit: 'credentials',
    unitShort: '',
    verb: 'earn',
    colorKey: 'teal',
    iconKey: 'badgeCheck',
    view: 'skills',
    step: 1,
    min: 1,
    ceiling: 4,
    defaultTarget: 1,
    blurb: 'CPR, EMT, CNA, lab safety, language certifications — small, verifiable credentials that make a resume concrete.',
    measure: (d, { start, end }) => countIn(d.skills, 'created_at', start, end),
    total: (d) => (d.skills || []).length,
    totalLabel: 'credentials earned',
  },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m]));

/** The metrics shown by default on a fresh Overview, in priority order. */
export const DEFAULT_PINNED = ['clinicalHours', 'essayWords', 'opportunitiesTracked', 'applicationsSubmitted', 'collegesResearched', 'activityHours'];

// ── Snapshot → measurements ──────────────────────────────────────────────────
/**
 * This week's real value for every metric.
 * @param {object} data  portfolio snapshot (see buildPortfolioSnapshot in portfolioData.js)
 * @param {Date}   now
 * @returns {Record<string, number>}
 */
export function measureWeek(data = {}, now = new Date()) {
  const range = weekRange(now);
  const out = {};
  for (const m of METRICS) {
    try { out[m.id] = m.measure(data, range) || 0; }
    catch { out[m.id] = 0; }
  }
  return out;
}

/** Per-metric measurements for each of the last `count` weeks, oldest first — the sparkline. */
export function measureHistory(data = {}, count = 6, now = new Date()) {
  const series = {};
  for (const m of METRICS) series[m.id] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const anchor = new Date(now);
    anchor.setDate(anchor.getDate() - i * 7);
    const range = weekRange(anchor);
    for (const m of METRICS) {
      try { series[m.id].push(m.measure(data, range) || 0); }
      catch { series[m.id].push(0); }
    }
  }
  return series;
}

// ── Goal storage (on the synced user record) ─────────────────────────────────
// Shape:
//   user.portfolioGoals = {
//     weeks: { '2026-W32': { targets: { clinicalHours: {target, setAt, source} }, result: {…} } },
//     pinned: ['clinicalHours', …],
//     lastRecommendationSeen: { clinicalHours: 4 },
//   }
// `source` is always 'user' today — it exists so that if a future feature ever writes a target
// from somewhere else, every stored goal can still say who authored it, and the UI can keep its
// promise that Meta Brain never set one.
const EMPTY = { weeks: {}, pinned: null, lastRecommendationSeen: {} };

export function readGoals(user) {
  const g = user?.portfolioGoals;
  if (!g || typeof g !== 'object') return { ...EMPTY, weeks: {} };
  return { ...EMPTY, ...g, weeks: g.weeks || {} };
}

/** The metric ids a student has chosen to pin, or the sensible default set. */
export function pinnedMetrics(user) {
  const pinned = readGoals(user).pinned;
  if (!Array.isArray(pinned) || !pinned.length) return DEFAULT_PINNED.filter((id) => METRIC_BY_ID[id]);
  return pinned.filter((id) => METRIC_BY_ID[id]);
}

export function goalsForWeek(user, weekKey = getIsoWeekKey()) {
  return readGoals(user).weeks[weekKey]?.targets || {};
}

export function goalFor(user, metricId, weekKey = getIsoWeekKey()) {
  return goalsForWeek(user, weekKey)[metricId] || null;
}

/**
 * Returns a NEW user object with `metricId`'s target set for `weekKey`. Caller persists it
 * (App.jsx's saveUser). Pass target=null to clear.
 *
 * `source` records who authored the goal. Callers pass 'user' for a hand-typed number and
 * 'user:recommended' when the student tapped "use Meta Brain's number" — both are the student's
 * choice; the distinction exists only so the UI can honestly say which one they picked.
 */
export function setGoal(user, metricId, target, { weekKey = getIsoWeekKey(), source = 'user' } = {}) {
  const metric = METRIC_BY_ID[metricId];
  if (!metric) return user;
  const goals = readGoals(user);
  const week = goals.weeks[weekKey] || { targets: {} };
  const targets = { ...(week.targets || {}) };
  if (target == null || Number(target) <= 0) delete targets[metricId];
  else targets[metricId] = { target: clampTarget(metric, Number(target)), setAt: Date.now(), source };
  return {
    ...user,
    portfolioGoals: { ...goals, weeks: { ...goals.weeks, [weekKey]: { ...week, targets } } },
  };
}

/** A NEW user object with the pinned-metric list replaced. */
export function setPinned(user, ids) {
  const goals = readGoals(user);
  const clean = (ids || []).filter((id) => METRIC_BY_ID[id]);
  return { ...user, portfolioGoals: { ...goals, pinned: clean.length ? clean : null } };
}

/**
 * Stamps a finished week's outcome into history so streaks survive after the raw rows scroll out
 * of whatever the UI happens to have loaded. Idempotent: an already-stamped week is left alone,
 * and the current week is never stamped (it isn't over).
 */
export function recordWeekResult(user, weekKey, measurements) {
  const goals = readGoals(user);
  const week = goals.weeks[weekKey];
  if (!week || !week.targets || week.result) return user;
  if (weekKey === getIsoWeekKey()) return user;
  const result = {};
  for (const [id, g] of Object.entries(week.targets)) {
    const value = Number(measurements?.[id]) || 0;
    result[id] = { target: g.target, value, met: value >= g.target };
  }
  return {
    ...user,
    portfolioGoals: { ...goals, weeks: { ...goals.weeks, [weekKey]: { ...week, result, closedAt: Date.now() } } },
  };
}

/**
 * Consecutive completed weeks (most recent first, current week excluded) where every goal the
 * student set was met. A week with no goals set breaks the chain rather than extending it —
 * a streak you can keep by setting nothing is not a streak.
 */
export function goalStreak(user, now = new Date()) {
  const weeks = readGoals(user).weeks;
  let streak = 0;
  const cursor = getStartOfWeek(now);
  for (let i = 1; i <= 52; i += 1) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    const week = weeks[getIsoWeekKey(d)];
    const result = week?.result;
    if (!result || !Object.keys(result).length) break;
    if (!Object.values(result).every((r) => r.met)) break;
    streak += 1;
  }
  return streak;
}

// ── Recommendations (Meta Brain suggests; the student decides) ───────────────
function clampTarget(metric, value) {
  const stepped = Math.round(value / metric.step) * metric.step;
  return Math.max(metric.min, Math.min(metric.ceiling, stepped || metric.min));
}

/** Median of the student's non-zero recent weeks — their demonstrated pace, not an ideal. */
function paceOf(series = []) {
  const past = series.slice(0, -1).filter((v) => v > 0);
  if (!past.length) return null;
  const sorted = [...past].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Meta Brain's recommended weekly target for one metric, with the reasoning it will show the
 * student. PURE — never writes anything. Returns { target, rationale, basis, confidence }.
 *
 * The shape of the recommendation, in order of precedence:
 *   · demonstrated pace, nudged up ~20% (progressive overload, not a cliff)
 *   · a first-time starter value from the metric's own default
 *   · raised when a real deadline is close, lowered late in the week or when the student is
 *     already carrying a heavy load — and always clamped to the metric's ceiling (rule 2)
 */
export function recommendTarget(metricId, ctx = {}) {
  const metric = METRIC_BY_ID[metricId];
  if (!metric) return null;
  const {
    history = [], weeksToNearestDeadline = null, gradeLevel = null, benchmarkGap = null,
    daysLeft = 7, currentLoadHours = 0,
  } = ctx;

  const pace = paceOf(history);
  const reasons = [];
  let target;
  let basis;

  if (pace) {
    target = pace * 1.2;
    basis = 'pace';
    reasons.push(`you've averaged about ${round1(pace)} ${metric.unit} a week lately`);
  } else {
    target = metric.defaultTarget;
    basis = 'starter';
    reasons.push('this is your first week tracking it, so this is a starter target you can beat');
  }

  // Deadline pressure — real, dated pressure only. Never past the ceiling (rule 2).
  if (weeksToNearestDeadline != null && weeksToNearestDeadline <= 4 && ['essayWords', 'applicationsSubmitted', 'deadlinesHandled', 'recommenderTouchpoints'].includes(metricId)) {
    target *= weeksToNearestDeadline <= 2 ? 1.5 : 1.25;
    reasons.push(`your next deadline is ~${Math.max(1, Math.round(weeksToNearestDeadline))} week${Math.round(weeksToNearestDeadline) === 1 ? '' : 's'} out`);
  }

  // A benchmark gap raises the bar, but only within reach: a 200-hour clinical gap does not
  // justify recommending 20 hours this week to a student who has never logged 3.
  if (benchmarkGap != null && benchmarkGap > 0 && ['clinicalHours', 'activityHours'].includes(metricId)) {
    const spread = Math.max(8, weeksToNearestDeadline || 20);
    const needed = benchmarkGap / spread;
    if (needed > target) {
      target = Math.min(needed, (pace || metric.defaultTarget) * 1.6);
      reasons.push(`you're about ${Math.round(benchmarkGap)} ${metric.unit} short of the benchmark for your pathway`);
    }
  }

  // Freshmen/sophomores get a lighter bar than seniors on application-execution metrics —
  // there is genuinely less to execute yet, and a bar built for a senior just reads as noise.
  if (/9|fresh/i.test(String(gradeLevel)) && ['applicationsSubmitted', 'essayWords', 'collegesResearched'].includes(metricId)) {
    target *= 0.6;
    reasons.push("you've got time — this is exploration, not application season");
  }

  // Setting a goal on Friday and being asked for a full week of output is how a student learns
  // the number is fake. Pro-rate what's left, but never below one meaningful step.
  if (daysLeft < 5 && basis !== 'starter') {
    target *= Math.max(0.4, daysLeft / 7);
    reasons.push(`${daysLeft} day${daysLeft === 1 ? '' : 's'} left this week`);
  }

  // Already carrying a heavy standing commitment? Don't stack more on top of it.
  if (currentLoadHours > 15 && ['clinicalHours', 'activityHours', 'researchProgress'].includes(metricId)) {
    target *= 0.8;
    reasons.push("you're already carrying a heavy weekly load");
  }

  const final = clampTarget(metric, target);
  return {
    metricId,
    target: final,
    basis,
    confidence: pace ? 'measured' : 'starting point',
    rationale: `Meta Brain suggests ${final} ${metric.unit} — ${reasons.join(', and ')}.`,
    reasons,
  };
}

function round1(n) { return Math.round(n * 10) / 10; }

/** Recommendations for every metric at once, keyed by id. */
export function recommendAll(ctx = {}) {
  const { historyByMetric = {}, ...rest } = ctx;
  const out = {};
  for (const m of METRICS) {
    out[m.id] = recommendTarget(m.id, { ...rest, history: historyByMetric[m.id] || [] });
  }
  return out;
}

// ── Week summary ─────────────────────────────────────────────────────────────
/**
 * Everything the week header needs: per-metric rows (target, value, pct, met), plus the
 * aggregate. Metrics without a target are still returned (with `target: null`) so the UI can
 * show the live number and invite the student to set one.
 */
export function summarizeWeek({ user, measurements = {}, metricIds = null, now = new Date() }) {
  const weekKey = getIsoWeekKey(now);
  const targets = goalsForWeek(user, weekKey);
  const ids = metricIds || pinnedMetrics(user);
  const rows = ids.map((id) => {
    const metric = METRIC_BY_ID[id];
    const goal = targets[id] || null;
    const value = Number(measurements[id]) || 0;
    const target = goal?.target ?? null;
    const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
    return {
      id, metric, value, target, pct,
      met: target != null && value >= target,
      remaining: target != null ? Math.max(0, round1(target - value)) : null,
      source: goal?.source || null,
      setAt: goal?.setAt || null,
    };
  });
  const withGoals = rows.filter((r) => r.target != null);
  const met = withGoals.filter((r) => r.met).length;
  return {
    weekKey,
    rows,
    goalsSet: withGoals.length,
    goalsMet: met,
    // Averaged over goals actually set — a student with one goal at 90% is at 90%, not at 9%
    // because they left nine other metrics blank.
    overallPct: withGoals.length ? Math.round(withGoals.reduce((s, r) => s + r.pct, 0) / withGoals.length) : 0,
    allMet: withGoals.length > 0 && met === withGoals.length,
    daysLeft: daysLeftInWeek(now),
    label: weekLabel(now),
  };
}

/**
 * The one-line, deterministic thing Meta Brain says about the week as a whole. Deliberately
 * computed (not generated) so the header is never blank, never wrong, and never waiting on a
 * network call — the AI blurb layered above it in the UI is enrichment, not the substance.
 */
export function weekHeadline(summary, { hasData = true } = {}) {
  if (!hasData) return 'Nothing tracked yet — start anywhere and Meta Brain will start pacing you.';
  if (!summary.goalsSet) {
    return 'No goals set for this week yet. Meta Brain has a recommended number for each tracker below — pick the ones you actually want to own.';
  }
  if (summary.allMet) {
    return `Every goal you set this week is done — ${summary.goalsMet}/${summary.goalsSet}. Raise one for next week, or bank the win.`;
  }
  const behind = summary.rows.filter((r) => r.target != null && !r.met).sort((a, b) => a.pct - b.pct)[0];
  const daysBit = summary.daysLeft === 1 ? 'Last day of the week' : `${summary.daysLeft} days left`;
  if (behind && behind.pct === 0) {
    return `${daysBit}. ${behind.metric.short} hasn't moved yet — ${behind.target} ${behind.metric.unit} to go.`;
  }
  return `${daysBit}. You're at ${summary.overallPct}% across ${summary.goalsSet} goal${summary.goalsSet === 1 ? '' : 's'}${behind ? ` — ${behind.metric.short} needs ${behind.remaining} more ${behind.metric.unit}` : ''}.`;
}

// ── Pure snapshot derivations ────────────────────────────────────────────────
// These read a portfolio snapshot (see portfolioData.js) without touching the network, which is
// why they live here rather than beside the fetcher: portfolioData.js imports Dexie and the data
// API, so anything that imports it cannot run under plain Node — and these four are exactly the
// functions the verify script needs to test.

/** Every snapshot list key, in one place. */
export const SNAPSHOT_KEYS = [
  'activities', 'awards', 'colleges', 'deadlines', 'essays', 'essayVersions',
  'scholarships', 'research', 'skills', 'clinicalHours', 'recommenders', 'gpaEntries',
];

/** True when the student has literally nothing in their Portfolio yet. */
export function isEmptySnapshot(snapshot) {
  if (!snapshot) return true;
  return SNAPSHOT_KEYS.every((key) => !(snapshot[key] || []).length) && !(snapshot.interviewSessions || []).length;
}

/** Total rows across every resource — the "N things tracked" figure. */
export function snapshotItemCount(snapshot) {
  if (!snapshot) return 0;
  return SNAPSHOT_KEYS.reduce((sum, key) => sum + (snapshot[key] || []).length, 0);
}

/**
 * Whole weeks until the student's nearest future deadline, or null when nothing is dated.
 * Feeds recommendTarget()'s deadline-pressure term — the only thing in the recommender allowed
 * to raise a number, and only because this comes from a real date the student entered.
 */
export function weeksToNearestDeadline(snapshot, now = new Date()) {
  const dates = [
    ...(snapshot?.deadlines || []).map((d) => d.due_date),
    ...(snapshot?.scholarships || []).map((s) => s.deadline),
    ...(snapshot?.colleges || []).flatMap((c) => [c.ea_ed_deadline, c.rd_deadline, c.financial_aid_deadline]),
    ...(snapshot?.recommenders || []).map((r) => r.due_date),
  ].filter(Boolean).map((d) => toTime(String(d).slice(0, 10))).filter((t) => t !== null);
  const future = dates.filter((t) => t >= now.getTime()).sort((a, b) => a - b);
  if (!future.length) return null;
  return Math.max(0, (future[0] - now.getTime()) / (7 * 86400000));
}

/** Standing weekly commitment across ongoing activities — recommendTarget()'s load term. */
export function currentLoadHours(snapshot) {
  return (snapshot?.activities || [])
    .filter((a) => a.status === 'ongoing')
    .reduce((s, a) => s + (parseFloat(a.hours_per_week) || 0), 0);
}
