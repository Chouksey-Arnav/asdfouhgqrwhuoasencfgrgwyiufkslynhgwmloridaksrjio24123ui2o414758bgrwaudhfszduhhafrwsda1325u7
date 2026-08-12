// ─────────────────────────────────────────────────────────────────────────────
// The check-in calendar's database half.
//
// The table itself, the tiles, and every line of copy live in
// src/data/checkinCalendar.js with no Dexie import, so the build-time checks can
// load them under plain Node. This file is everything that has to touch storage:
// what day the student is on, whether today has been claimed, and the one read
// that assembles the whole thing for the UI.
//
// Everything from the data module is re-exported, so no caller has to know about
// the split — `import { CHECKIN_DAYS, loadCheckinState } from './dailyCheckin'`
// works exactly as it reads.
//
// See the data module's header for why the cycle is 28 days, why the rewards sit
// on specific days rather than being smeared across all of them, and why missing
// a day costs that day's XP and nothing else.
// ─────────────────────────────────────────────────────────────────────────────
import * as DB from './db';
import { localDateStr, localDateStrOffset } from './dateUtils';
import {
  CYCLE_LENGTH, GRACE_DAYS, REWARD_KINDS, CHECKIN_DAYS, MILESTONE_DAYS,
  getCheckinReward, isMilestoneDay, nextMilestone, rewardSummary, buildCycle,
} from '../data/checkinCalendar.js';

export {
  CYCLE_LENGTH, GRACE_DAYS, REWARD_KINDS, CHECKIN_DAYS, MILESTONE_DAYS,
  getCheckinReward, isMilestoneDay, nextMilestone, rewardSummary, buildCycle,
};

function todayStr() {
  return localDateStr();
}

/** Has today's check-in already been claimed? */
export async function getTodayCheckinStatus() {
  return DB.getCheckin(todayStr());
}

/**
 * Which cycle day (1-28) is next.
 *
 * Walks back up to GRACE_DAYS looking for the last claimed day. Finding one
 * continues the cycle from there; finding nothing restarts at day 1. Day 28
 * wraps to day 1, which is a completed cycle rather than a reset — the caller
 * can tell the difference by `cycled`.
 */
export async function getNextCheckinDay() {
  for (let back = 1; back <= GRACE_DAYS + 1; back += 1) {
    const row = await DB.getCheckin(localDateStrOffset(-back));
    if (!row) continue;
    const day = Number(row.day) || 0;
    if (day >= CYCLE_LENGTH) return { day: 1, cycled: true, resumed: false };
    return { day: day + 1, cycled: false, resumed: back > 1 };
  }
  return { day: 1, cycled: false, resumed: false };
}

/** How many full 28-day cycles this account has finished. */
export async function getCyclesCompleted() {
  return DB.countCheckinsOnDay(CYCLE_LENGTH);
}

/** Records today's check-in. Returns false if today was already claimed
 *  (e.g. a second chest queued after a reload race) so the caller can skip
 *  granting the reward a second time. */
export async function claimCheckin(day) {
  return DB.recordCheckin(todayStr(), day);
}

/**
 * Everything the check-in surfaces need, in one read.
 *
 * Callers get the calendar, today's row, whether it is still claimable, and the
 * next milestone — so no surface has to assemble that itself and no two surfaces
 * can assemble it differently.
 */
export async function loadCheckinState() {
  const [today, next, cyclesDone, everChecked] = await Promise.all([
    getTodayCheckinStatus(),
    getNextCheckinDay(),
    getCyclesCompleted(),
    DB.hasAnyCheckin(),
  ]);
  const day = today ? Number(today.day) : next.day;
  return {
    day,
    reward: getCheckinReward(day),
    claimedToday: !!today,
    claimable: !today,
    cycled: next.cycled,
    resumed: next.resumed,
    everChecked,
    cyclesDone,
    cycle: buildCycle({ currentDay: day, claimedToday: !!today, cyclesDone }),
  };
}

/**
 * The headline the check-in card leads with.
 *
 * Four cases, in the order they matter: today's reward is big and unclaimed,
 * today is unclaimed, a milestone is close, and everything else.
 */
export function checkinHeadline(state) {
  if (!state) return '';
  const { day, reward, claimedToday, cycle } = state;
  if (!claimedToday && isMilestoneDay(day)) {
    return `Day ${day} — ${rewardSummary(reward)} waiting.`;
  }
  if (!claimedToday) return `Day ${day} of ${CYCLE_LENGTH} — claim ${rewardSummary(reward)}.`;
  const next = cycle?.next;
  if (next) {
    return next.inDays === 1
      ? `Tomorrow is day ${next.day}: ${rewardSummary(next)}.`
      : `${next.inDays} days to day ${next.day}: ${rewardSummary(next)}.`;
  }
  return `Day ${day} claimed. The cycle restarts after day ${CYCLE_LENGTH}.`;
}
