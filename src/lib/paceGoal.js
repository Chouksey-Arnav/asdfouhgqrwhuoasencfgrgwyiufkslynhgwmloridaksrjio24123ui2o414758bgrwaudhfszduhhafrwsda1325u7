// ── Pathway pace goals ────────────────────────────────────────────────────────
//
// A pace goal is the one commitment a student makes about their own pathway: "I want to finish
// these N lessons in W weeks." Everything else in this file is derived from that plus the
// lessons they have actually verified — nothing here invents a target, and nothing here writes.
// Storage lives in src/lib/db.js (`pathwayGoals`, one row per pathway key, synced to Supabase
// through buildSyncSnapshot).
//
// The shape of a stored goal row:
//   { pathwayKey, targetWeeks, startedAt, updatedAt? }
//
// Why this is a module rather than an inline block in App.jsx (which is where it started): the
// same status now has to render in at least four places — the Pathway tab's editor card, the
// Home dashboard, the Prep Medabrain system prompt and the head coach's prompt — and four
// independent copies of "are they behind?" is exactly how two surfaces end up disagreeing with
// each other in front of the student.

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Presets offered as one-tap chips. A custom value is always allowed alongside these. */
export const PACE_PRESETS = [
  { weeks: 2,  label: '2 weeks',  blurb: 'Sprint' },
  { weeks: 4,  label: '4 weeks',  blurb: 'Focused month' },
  { weeks: 8,  label: '8 weeks',  blurb: 'Steady' },
  { weeks: 12, label: '12 weeks', blurb: 'A full term' },
  { weeks: 26, label: '26 weeks', blurb: 'Half a year' },
];

export const PACE_MIN_WEEKS = 1;
export const PACE_MAX_WEEKS = 104; // two years — past this the goal stops being a goal

/**
 * Clamp + round any user-entered week count into something storable. Returns null if unusable.
 *
 * Validity is judged on the RAW value, before rounding: "0.4 weeks" is an ambitious but real
 * intention and clamps up to one week, whereas rounding first would turn it into 0 and reject
 * it as if they had typed nothing. Zero, negatives and gibberish are still refused — those are
 * not targets.
 */
export function normalizeTargetWeeks(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(PACE_MAX_WEEKS, Math.max(PACE_MIN_WEEKS, Math.round(n) || PACE_MIN_WEEKS));
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Everything the UI and the AI prompts need to talk about a pace goal, computed in one place.
 *
 * @param {object|null} goal          stored row: { targetWeeks, startedAt }
 * @param {number} totalLessons       lessons in the pathway
 * @param {number} doneLessons        lessons verified so far
 * @param {number[]} completedAts     ms timestamps of verified lessons (any order, may be sparse)
 * @param {number} now                injectable clock, for tests
 * @returns {object|null}             null when there is no usable goal
 */
export function computePaceStatus({ goal, totalLessons = 0, doneLessons = 0, completedAts = [], now = Date.now() } = {}) {
  if (!goal?.targetWeeks || !totalLessons) return null;

  const targetWeeks = goal.targetWeeks;
  const startedAt = goal.startedAt || now;
  const deadline = startedAt + targetWeeks * WEEK_MS;
  const elapsedWeeks = Math.max(0, (now - startedAt) / WEEK_MS);
  const weekNumber = Math.min(targetWeeks, Math.max(1, Math.ceil(elapsedWeeks) || 1));
  const remaining = Math.max(0, totalLessons - doneLessons);

  // Where a perfectly even pace would have them by now.
  const expectedByNow = Math.min(totalLessons, Math.round((elapsedWeeks / targetWeeks) * totalLessons));
  const diff = doneLessons - expectedByNow;

  const plannedPerWeek = totalLessons / targetWeeks;
  const weeksLeft = Math.max(0, (deadline - now) / WEEK_MS);
  // What they need from here on out — the number that actually changes behaviour, and the one
  // that quietly climbs when someone falls behind. Rounded UP because you cannot do 2.1 lessons.
  const neededPerWeek = remaining === 0 ? 0 : (weeksLeft > 0 ? remaining / weeksLeft : remaining);

  // Demonstrated pace + a projection off it. Held back until half a week has passed, because
  // "3 lessons in 40 minutes" extrapolates to a wildly dishonest finish date.
  const measuredPerWeek = elapsedWeeks >= 0.5 && doneLessons > 0 ? doneLessons / elapsedWeeks : null;
  const projectedFinishAt = measuredPerWeek && remaining > 0
    ? now + (remaining / measuredPerWeek) * WEEK_MS
    : (remaining === 0 ? (completedAts.length ? Math.max(...completedAts) : now) : null);

  const cutoff = now - WEEK_MS;
  const doneThisWeek = completedAts.filter((t) => t && t >= cutoff).length;

  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  let state;
  if (remaining === 0) state = 'complete';
  else if (now > deadline) state = 'overdue';
  else if (diff > 0) state = 'ahead';
  else if (diff === 0) state = 'on_pace';
  else if (diff >= -2) state = 'slipping';
  else state = 'behind';

  const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400000));

  const label = {
    complete: 'Goal met',
    overdue: 'Past your target date',
    ahead: `${diff} lesson${diff === 1 ? '' : 's'} ahead`,
    on_pace: 'Right on pace',
    slipping: `${Math.abs(diff)} lesson${Math.abs(diff) === 1 ? '' : 's'} behind`,
    behind: `${Math.abs(diff)} lessons behind`,
  }[state];

  return {
    targetWeeks, startedAt, deadline, daysLeft,
    elapsedWeeks: round1(elapsedWeeks), weekNumber,
    totalLessons, doneLessons, remaining, pct,
    expectedByNow, diff, state, label,
    plannedPerWeek: round1(plannedPerWeek),
    neededPerWeek: Math.ceil(neededPerWeek),
    neededPerWeekExact: round1(neededPerWeek),
    measuredPerWeek: measuredPerWeek === null ? null : round1(measuredPerWeek),
    projectedFinishAt,
    doneThisWeek,
    onTrack: state === 'complete' || state === 'ahead' || state === 'on_pace',
  };
}

/** Tone key for the card/pill. Callers map this to their own palette. */
export function paceTone(state) {
  if (state === 'complete' || state === 'ahead' || state === 'on_pace') return 'good';
  if (state === 'slipping') return 'warn';
  return 'bad';
}

/**
 * One honest sentence about where they stand — reused verbatim by the Home card and the
 * Medabrain prompts so the app and the AI never describe the same goal two different ways.
 */
export function describePace(status, pathwayLabel = 'this pathway') {
  if (!status) return null;
  const {
    state, targetWeeks, weekNumber, doneLessons, totalLessons, remaining,
    neededPerWeek, daysLeft, doneThisWeek, diff,
  } = status;

  if (state === 'complete') {
    return `Pace goal met: all ${totalLessons} ${pathwayLabel} lessons are verified, inside the ${targetWeeks}-week target they set themselves.`;
  }

  const head = `Pace goal: finish ${pathwayLabel} (${totalLessons} lessons) in ${targetWeeks} week${targetWeeks === 1 ? '' : 's'}. They are in week ${weekNumber} of ${targetWeeks}, ${doneLessons} verified, ${remaining} to go.`;
  const week = ` They verified ${doneThisWeek} lesson${doneThisWeek === 1 ? '' : 's'} in the last 7 days.`;

  const tail = {
    overdue: ` The target date has passed with ${remaining} lesson${remaining === 1 ? '' : 's'} left — the goal needs resetting, not guilt. Suggest a new, realistic target if it comes up.`,
    ahead: ` They are ${diff} lesson${diff === 1 ? '' : 's'} AHEAD of pace — say so, it is earned.`,
    on_pace: ` They are exactly on pace. Roughly ${neededPerWeek} lesson${neededPerWeek === 1 ? '' : 's'} a week keeps it that way.`,
    slipping: ` They are ${Math.abs(diff)} lesson${Math.abs(diff) === 1 ? '' : 's'} behind — recoverable this week at about ${neededPerWeek} lesson${neededPerWeek === 1 ? '' : 's'} a week, with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`,
    behind: ` They are ${Math.abs(diff)} lessons behind and need about ${neededPerWeek} lesson${neededPerWeek === 1 ? '' : 's'} a week across the ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining. Be straight about that without piling on — and if the number has become unrealistic, say plainly that resetting the goal is the smarter move.`,
  }[state] || '';

  return head + week + tail;
}

/** Short student-facing line for cards. Keep it under a line and a half. */
export function paceHeadline(status) {
  if (!status) return null;
  switch (status.state) {
    case 'complete':
      return 'Every lesson verified — you hit your goal.';
    case 'overdue':
      return `Target date passed with ${status.remaining} lesson${status.remaining === 1 ? '' : 's'} left. Reset the goal and keep going.`;
    case 'ahead':
      return `You're ${status.diff} lesson${status.diff === 1 ? '' : 's'} ahead of your own pace. Nice.`;
    case 'on_pace':
      return `Right on pace — about ${status.neededPerWeek} lesson${status.neededPerWeek === 1 ? '' : 's'} a week from here.`;
    case 'slipping':
      return `${Math.abs(status.diff)} lesson${Math.abs(status.diff) === 1 ? '' : 's'} behind — one good session this week fixes it.`;
    default:
      return `${Math.abs(status.diff)} lessons behind. About ${status.neededPerWeek} a week gets you back on target.`;
  }
}

/** e.g. "Mar 14" — used for the target date and the projected finish. */
export function formatPaceDate(ms) {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
