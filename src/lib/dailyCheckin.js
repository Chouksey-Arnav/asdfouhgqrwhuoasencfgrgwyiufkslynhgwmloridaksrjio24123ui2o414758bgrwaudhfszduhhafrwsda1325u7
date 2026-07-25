// ─────────────────────────────────────────────────────────────────────────────
// Daily check-in — rewards the act of opening the app, before any studying
// happens. A 7-day escalating cycle, separate from (but coordinated with) the
// study streak. Skippable without penalty: closing the prompt without
// claiming does not forfeit the day, avoiding a FOMO-driven dark pattern.
// ─────────────────────────────────────────────────────────────────────────────
import * as DB from './db';
import { localDateStr, localDateStrOffset } from './dateUtils';

// Day 7 is a mystery chest rather than a flat number — resolved by the caller
// via RewardChest's own variable pool, this table just marks it as `chest`.
export const CHECKIN_TABLE = [
  { day: 1, xp: 10 },
  { day: 2, xp: 12 },
  { day: 3, xp: 15 },
  { day: 4, xp: 18 },
  { day: 5, xp: 22 },
  { day: 6, xp: 28 },
  { day: 7, xp: 40, chest: true },
];

function todayStr() {
  return localDateStr();
}

/** Has today's check-in already been claimed (or skipped)? */
export async function getTodayCheckinStatus() {
  return DB.getCheckin(todayStr());
}

/** Which cycle day (1-7) is next, based on yesterday's entry. */
export async function getNextCheckinDay() {
  const yesterday = localDateStrOffset(-1);
  const y = await DB.getCheckin(yesterday);
  if (y && y.day < 7) return y.day + 1;
  if (y && y.day >= 7) return 1;
  // No entry yesterday — cycle continues only if a streak freeze covered the
  // gap (checked by the caller before this runs); otherwise restart at day 1.
  return 1;
}

/** Records today's check-in. Returns false if today was already claimed
 *  (e.g. a second chest queued after a reload race) so the caller can skip
 *  granting the reward a second time. */
export async function claimCheckin(day) {
  return DB.recordCheckin(todayStr(), day);
}

export function getCheckinReward(day) {
  return CHECKIN_TABLE.find(c => c.day === day) || CHECKIN_TABLE[0];
}
