// ─────────────────────────────────────────────────────────────────────────────
// The weekly seal — why the MedEx Score is not a live number.
//
// ── The design decision, and the reason for it ──────────────────────────────
// The score COULD recompute on every keystroke. It deliberately does not.
//
// A number that moves the instant you log two clinical hours teaches a student
// to log hours to watch a number move. That is the mechanic behind every
// engagement-optimised score, and it is the wrong one here for a specific
// reason: the underlying quantity genuinely does not change daily. Sustain,
// depth and evidence — the three things the admissions model actually scores a
// portfolio on — are measured in months. A daily score would be almost entirely
// noise dressed up as feedback, and the days it did not move (most of them)
// would read as failure.
//
// So the score seals once a week. Between seals, everything you do BANKS: the
// live number is computed continuously and the difference is shown as pending,
// with the moment it lands stated exactly. That turns the one honest property
// of the underlying data — that it changes slowly — into the mechanic, instead
// of fighting it.
//
// ── What "sealed" means precisely ───────────────────────────────────────────
// Each ISO week has at most one sealed row. The row for week W is written the
// first time the student opens the app during week W, capturing the live score
// at that moment; it does not change again for the rest of the week no matter
// what they log. So:
//
//   official score = this week's sealed row
//   banked         = live score − official score  (lands at the next seal)
//   week-on-week   = this week's seal − last week's seal
//
// A student who opens the app for the first time ever gets a sealed score
// immediately rather than waiting seven days for one, which is the whole reason
// the capture is on first-open-of-week rather than on a schedule. The cost is
// that a student whose first open of a week is Sunday night seals a number that
// re-seals hours later; `sealedAt` is stored and surfaced so that is visible
// rather than confusing.
//
// ── Local time, on purpose ──────────────────────────────────────────────────
// Weeks start Monday 00:00 in the STUDENT's timezone, not UTC. A countdown that
// says "3 days 14 hours" has to agree with the calendar on their wall or it
// reads as broken. The week key is therefore computed from local date parts and
// stored as a string; it is an identifier, never an instant, and nothing may
// parse it back into a Date.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

/** Monday 00:00 local, for the week containing `date`. */
export function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 = Sunday. Sunday belongs to the week that started six days ago.
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

/** Monday 00:00 local of the following week — the instant the next seal lands. */
export function nextSealAt(date = new Date()) {
  const start = weekStart(date);
  // Constructed via setDate rather than +7*DAY_MS so the boundary stays at local
  // midnight across a daylight-saving change, where a week is 167 or 169 hours.
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
}

/**
 * The stable identifier for a week: `YYYY-Www`, ISO-8601 week numbering.
 *
 * ISO rather than "weeks since epoch" because it is a thing a human can read in
 * a database row and check against a calendar, and because it handles the
 * year boundary correctly — 2026-W01 begins on 29 December 2025, and a naive
 * year+weekNumber would file that Monday and the Thursday of the same week
 * under different years.
 */
export function weekKey(date = new Date()) {
  const d = weekStart(date);
  // The ISO week-year is the year of that week's Thursday.
  const thursday = new Date(d);
  thursday.setDate(thursday.getDate() + 3);
  const year = thursday.getFullYear();

  const firstThursday = new Date(year, 0, 4);
  firstThursday.setHours(0, 0, 0, 0);
  const firstWeekMonday = weekStart(firstThursday);

  const week = Math.round((d - firstWeekMonday) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Ordering helper: week keys sort correctly as strings within a year and across years. */
export function compareWeekKeys(a, b) { return String(a).localeCompare(String(b)); }

/** The week key one week before `date` — what "last week's seal" is looked up by. */
export function previousWeekKey(date = new Date()) {
  const d = weekStart(date);
  d.setDate(d.getDate() - 7);
  return weekKey(d);
}

/**
 * Time remaining until the next seal, in the pieces a countdown renders.
 *
 * `progress` is how far through the week we are (0 at Monday 00:00, →1 at the
 * seal), so a ring or bar can fill without recomputing the week's length —
 * which matters in the two DST weeks a year where it is not 168 hours.
 */
export function sealCountdown(now = new Date()) {
  const target = nextSealAt(now);
  const start = weekStart(now);
  const ms = Math.max(0, target - now);
  const span = target - start;

  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return {
    ms, days, hours, minutes, seconds,
    target,
    progress: span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 0,
    /** Compact form for a chip: "3d 14h", "14h 09m", "09m 22s". */
    short: days > 0 ? `${days}d ${hours}h`
      : hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m`
        : `${minutes}m ${String(seconds).padStart(2, '0')}s`,
    /** Long form for the card: reads as a sentence fragment. */
    long: days > 1 ? `${days} days ${hours}h`
      : days === 1 ? `1 day ${hours}h`
        : hours > 0 ? `${hours}h ${minutes}m`
          : `${minutes}m`,
    /** True in the last day — the card leans on urgency only when there is some. */
    imminent: ms < DAY_MS,
  };
}

/**
 * Human label for a week key, e.g. "18–24 Aug". Used on the history chart and
 * on the sealed-at line, where a raw `2026-W34` would be accurate and useless.
 */
export function weekLabel(key, { year = false } = {}) {
  const start = weekStartFromKey(key);
  if (!start) return String(key || '');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const m = (d) => d.toLocaleDateString(undefined, { month: 'short' });
  const same = start.getMonth() === end.getMonth();
  const tail = year ? ` ${end.getFullYear()}` : '';
  return same
    ? `${start.getDate()}–${end.getDate()} ${m(end)}${tail}`
    : `${start.getDate()} ${m(start)} – ${end.getDate()} ${m(end)}${tail}`;
}

/**
 * Week key → the Monday it started, local.
 *
 * The one place a key is turned back into a date, and it exists only so labels
 * and chart axes can be rendered. Nothing in the sealing logic may use it: the
 * key is an identity, and a key written in one timezone must keep meaning the
 * same week after the student flies somewhere else.
 */
export function weekStartFromKey(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const [, y, w] = match;
  const firstThursday = new Date(Number(y), 0, 4);
  firstThursday.setHours(0, 0, 0, 0);
  const monday = weekStart(firstThursday);
  monday.setDate(monday.getDate() + (Number(w) - 1) * 7);
  return monday;
}

/**
 * Decide what to do with a freshly computed live score, given what is stored.
 *
 * Pure, and returns an intent rather than performing it — the store executes,
 * this decides, and verifyMedex.mjs can drive it through a year of weeks
 * without a database.
 *
 *   'seal'   — no row for the current week: write one at `liveScore`.
 *   'hold'   — the current week is already sealed: show the seal, bank the diff.
 *
 * There is deliberately no 'reseal'. A sealed week is immutable, including when
 * the live score has dropped since — a score that only ever seals upward is a
 * score nobody has to believe.
 */
export function planSeal({ rows = [], liveScore = null, now = new Date() } = {}) {
  const key = weekKey(now);
  const prevKey = previousWeekKey(now);
  const byKey = new Map(rows.map(r => [r.week_key, r]));

  const current = byKey.get(key) || null;
  const previous = byKey.get(prevKey) || null;

  // The most recent seal before this week, which may be older than last week if
  // the student was away — "+34 since your last check-in" beats a blank delta.
  const priorRows = rows
    .filter(r => compareWeekKeys(r.week_key, key) < 0)
    .sort((a, b) => compareWeekKeys(a.week_key, b.week_key));
  const lastSealed = priorRows[priorRows.length - 1] || null;

  const action = current ? 'hold' : (liveScore == null ? 'wait' : 'seal');
  const sealedScore = current ? current.score : (action === 'seal' ? liveScore : null);
  const comparedTo = previous || lastSealed || null;

  return {
    action,
    weekKey: key,
    previousWeekKey: prevKey,
    current,
    previous,
    lastSealed,
    comparedTo,
    sealedScore,
    /** Week-on-week change, once both ends exist. */
    delta: sealedScore != null && comparedTo?.score != null ? sealedScore - comparedTo.score : null,
    /** Movement since the seal, waiting to land at the next one. */
    banked: sealedScore != null && liveScore != null ? liveScore - sealedScore : null,
    gapWeeks: comparedTo ? weeksBetween(comparedTo.week_key, key) : null,
    isFirstEver: rows.length === 0,
  };
}

/** Whole weeks between two keys, for "you were away for 3 weeks" copy. */
export function weeksBetween(fromKey, toKey) {
  const a = weekStartFromKey(fromKey), b = weekStartFromKey(toKey);
  if (!a || !b) return null;
  return Math.round((b - a) / (7 * DAY_MS));
}
