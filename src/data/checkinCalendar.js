// ─────────────────────────────────────────────────────────────────────────────
// The check-in calendar — a 28-day cycle that rewards SHOWING UP, before any
// studying happens, and tells you days in advance what is coming.
//
// ── Why this is not the streak, and must never become it ────────────────────
// The streak (src/lib/streak.js) is a record of WORK: it moves only when a
// lesson is verified, a quiz is submitted, a test is sat. That is deliberate and
// the app is better for it — a streak that counted app opens would teach
// students to open the app.
//
// But "opening the app" is still the thing that has to happen first, every time,
// and a product that gives nothing at all for it is a product that gives a
// student on a bad Tuesday no reason to look. So there are two ladders:
//
//   the STREAK    earned by work.       Big rewards. Breaks if you skip.
//   the CHECK-IN  earned by turning up. Small rewards, escalating. Forgiving.
//
// They are drawn differently, named differently, and never share a number. A
// check-in day is never a study day and cannot clear the streak goal.
//
// ── Why 28 days, and why the rewards are on SPECIFIC days ───────────────────
// The old cycle was seven flat days: 10, 12, 15, 18, 22, 28, 40 XP. Every day
// paid roughly the same, so no day was worth planning around, and the whole
// thing was invisible after the first week.
//
// This one is 28 days and deliberately LUMPY. Most days pay a small amount. Nine
// specific days — 3, 7, 10, 14, 18, 21, 25, 28 — carry the real rewards: streak
// freezes, chests, XP boosts, and at day 28 all of them at once. The point is
// that the calendar is drawn in full, in advance, so on day 12 a student can see
// that day 14 is a chest and Double XP. That is a two-day-out reason to come
// back, renewed every few days, which is a fundamentally different mechanic from
// "a slightly larger number tomorrow".
//
// ── Why missing a day does not reset it to zero ─────────────────────────────
// A ladder that resets on the first miss is a ladder most students see the
// bottom four rungs of and nothing else. This one keeps the position across a
// gap of up to GRACE_DAYS, and only a longer absence restarts the cycle — and a
// restart is framed as "welcome back", not as a punishment. Nothing is taken
// away, ever: skipping a claim forfeits that day's XP and nothing more, which is
// what keeps this out of dark-pattern territory.
// ─────────────────────────────────────────────────────────────────────────────

// ── This file is the PURE half ───────────────────────────────────────────────
// The table, the tiles and the copy live here with no Dexie import, so
// scripts/verifyStreak.mjs can load and check them under plain Node — the same
// split src/data/questCatalog.js has from src/lib/quests.js, for the same
// reason. Anything that reads or writes the database lives in
// src/lib/dailyCheckin.js, which re-exports everything below.
import { BOOST_KINDS } from '../lib/streak.js';

export const CYCLE_LENGTH = 28;

/**
 * How many missed days the cycle survives.
 *
 * Two, which is one more than the streak's grace. The check-in ladder is the
 * forgiving one by design — it is the mechanic that gets a lapsed student back,
 * and a mechanic that punishes the lapse cannot do that job.
 */
export const GRACE_DAYS = 2;

/**
 * Reward kinds a day can carry on top of its XP.
 *
 *   chest    the unwrap ceremony (RewardChest), possibly with a cosmetic in it
 *   freeze   a streak freeze token
 *   boost    a timed XP multiplier — `boost` names a key of BOOST_KINDS
 */
export const REWARD_KINDS = ['chest', 'freeze', 'boost'];

/**
 * The 28 days.
 *
 * `xp` climbs gently within each week and resets slightly at the start of the
 * next, so the shape is a staircase rather than a ramp — the milestone days are
 * what carry the week, and a smooth ramp would flatten them out.
 *
 * `label` is set only on the days that carry something, because that is what the
 * calendar prints under the tile and an ordinary day should print nothing.
 */
export const CHECKIN_DAYS = [
  { day: 1,  xp: 10 },
  { day: 2,  xp: 12 },
  { day: 3,  xp: 15,  freeze: 1, label: 'Streak freeze', blurb: 'Three days in. Here is a freeze — one missed day is now survivable.' },
  { day: 4,  xp: 18 },
  { day: 5,  xp: 22 },
  { day: 6,  xp: 26 },
  { day: 7,  xp: 45,  chest: true, label: 'Chest', blurb: 'A full week of showing up. Open it.' },
  { day: 8,  xp: 20 },
  { day: 9,  xp: 24 },
  { day: 10, xp: 35,  boost: 'surge', label: 'XP Surge', blurb: 'Half again on everything you earn for the next 24 hours.' },
  { day: 11, xp: 26 },
  { day: 12, xp: 30 },
  { day: 13, xp: 34 },
  { day: 14, xp: 80,  chest: true, boost: 'double', label: 'Chest + Double XP', blurb: 'Halfway. A chest, and six hours at double XP — spend them on something big.' },
  { day: 15, xp: 28 },
  { day: 16, xp: 32 },
  { day: 17, xp: 36 },
  { day: 18, xp: 45,  freeze: 1, label: 'Streak freeze', blurb: 'Another freeze for the shelf. Three weeks is where they start mattering.' },
  { day: 19, xp: 38 },
  { day: 20, xp: 44 },
  { day: 21, xp: 110, chest: true, freeze: 1, label: 'Chest + freeze', blurb: 'Three weeks. Almost nobody is still on this calendar at day 21.' },
  { day: 22, xp: 36 },
  { day: 23, xp: 40 },
  { day: 24, xp: 46 },
  { day: 25, xp: 60,  boost: 'surge', label: 'XP Surge', blurb: 'A day and a half of extra XP, three days from the finish.' },
  { day: 26, xp: 50 },
  { day: 27, xp: 56 },
  { day: 28, xp: 300, chest: true, freeze: 1, boost: 'triple', label: 'The 28th', blurb: 'Four full weeks. The largest check-in reward there is: a chest, a freeze, and three hours at triple XP. Then it starts again.' },
];

/** Days that carry something beyond XP — what the calendar highlights. */
export const MILESTONE_DAYS = CHECKIN_DAYS.filter(d => d.chest || d.freeze || d.boost).map(d => d.day);

export const getCheckinReward = (day) =>
  CHECKIN_DAYS.find(c => c.day === day) || CHECKIN_DAYS[0];

/** True when this day carries more than XP. */
export const isMilestoneDay = (day) => MILESTONE_DAYS.includes(Number(day));

/**
 * The next day in the cycle that carries a real reward, and how far away it is.
 *
 * This is the single most important thing this module produces: it is the line
 * the Home card shows ("Day 12 — a chest and Double XP in 2 days"), and it is
 * what turns a calendar into a reason to come back on Thursday.
 */
export function nextMilestone(currentDay) {
  const d = Math.max(0, Number(currentDay) || 0);
  const next = CHECKIN_DAYS.find(c => c.day > d && (c.chest || c.freeze || c.boost));
  if (!next) return null;
  return { ...next, inDays: next.day - d };
}

/**
 * A one-line description of what a day pays, for the tile and the toast.
 * Always leads with the non-XP reward when there is one, because that is the
 * part somebody would change their evening for.
 */
export function rewardSummary(dayRow) {
  if (!dayRow) return '';
  const bits = [];
  if (dayRow.chest) bits.push('a chest');
  if (dayRow.freeze) bits.push(`${dayRow.freeze} streak freeze${dayRow.freeze > 1 ? 's' : ''}`);
  if (dayRow.boost) bits.push(BOOST_KINDS[dayRow.boost]?.label || 'an XP boost');
  bits.push(`+${dayRow.xp} XP`);
  if (bits.length === 1) return bits[0];
  return `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
}

/**
 * The whole calendar as tiles, relative to where the student is.
 *
 * `state` per tile: 'claimed' | 'today' | 'upcoming' | 'missed'. `missed` only
 * ever applies to days inside the current cycle that were walked past — it is
 * drawn dimmed and carries no penalty, it simply says what happened.
 */
export function buildCycle({ currentDay = 1, claimedToday = false, cyclesDone = 0 } = {}) {
  const d = Math.min(CYCLE_LENGTH, Math.max(1, Number(currentDay) || 1));
  return {
    cyclesDone,
    currentDay: d,
    claimedToday,
    next: nextMilestone(claimedToday ? d : d - 1),
    tiles: CHECKIN_DAYS.map((row) => {
      let state;
      if (row.day < d) state = 'claimed';
      else if (row.day === d) state = claimedToday ? 'claimed' : 'today';
      else state = 'upcoming';
      return { ...row, state, milestone: isMilestoneDay(row.day), summary: rewardSummary(row) };
    }),
  };
}
