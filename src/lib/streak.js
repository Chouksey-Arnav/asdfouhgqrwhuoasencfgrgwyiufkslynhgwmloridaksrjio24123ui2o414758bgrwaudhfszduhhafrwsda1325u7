// ─────────────────────────────────────────────────────────────────────────────
// The streak engine — pure logic, no React, no Dexie.
//
// ── WHY THIS FILE EXISTS (and what it deliberately changes) ──────────────────
// The old streak counted DAYS THE APP WAS OPENED. `DB.recordStudyToday()` ran
// unconditionally inside App.jsx's `loadFromDb()`, which means a student who
// opened the tab, read nothing, and closed it kept a 40-day streak alive. That
// is a streak that measures tab-opening, and a student who has one learns to
// open the tab — exactly the habit we do NOT want to build.
//
// A streak here is EARNED. A calendar day counts only once the student has
// done enough real, verifiable work to clear that day's goal, where "enough"
// is measured in CREDITS (see STREAK_ACTIONS) against a goal the student picks
// themselves (see STREAK_GOALS). The default goal is 4 credits, chosen so the
// two most common honest study sessions each clear it exactly:
//
//     one verified pathway lesson  = 4 credits  ✓
//     two completed quizzes        = 2 + 2      ✓
//
// ── WHY CREDITS RATHER THAN A CHECKLIST ──────────────────────────────────────
// A checklist ("verify 1 lesson") makes every other honest study session worth
// nothing: a student who spends an hour on a full SAT test and no lessons is
// told they did not study. Credits let every real form of work count, weighted
// by how much of it there is, while still making the pathway the cheapest and
// most direct route to the goal — which is where we want students to spend
// their time.
//
// ── WHAT DOES NOT EARN CREDIT ────────────────────────────────────────────────
// Opening the app. Navigating. Reading a tab. Claiming a daily check-in. Those
// are all still worth XP or a chest where they already were — they just do not
// move the streak, because they are not study.
// ─────────────────────────────────────────────────────────────────────────────

// Explicit .js extension (unlike most sibling imports, which Vite resolves without one)
// because scripts/verifyStreak.mjs loads this module directly under Node's ESM resolver,
// which does not do extensionless resolution.
import { localDateStr } from './dateUtils.js';

// ── Qualifying actions ───────────────────────────────────────────────────────
// `credits` is the streak weight. `xp` is NOT here on purpose — XP is awarded
// at each call site through lib/rewards.js and has its own variable-ratio roll;
// mixing the two would let a jackpot XP roll also inflate the streak, which
// would make the streak a lottery instead of a record of work done.
//
// `per` documents the unit the caller is expected to batch by: flashcards fire
// one credit per 10 reviews rather than one per card, so a 60-second card blitz
// cannot clear a serious daily goal.
export const STREAK_ACTIONS = {
  lesson_verified:   { credits: 4, label: 'Verify a pathway lesson',       short: 'Lesson verified',   per: 'lesson' },
  lesson_studied:    { credits: 1, label: 'Read + watch a lesson',         short: 'Lesson studied',    per: 'lesson' },
  quiz_completed:    { credits: 2, label: 'Complete a quiz',               short: 'Quiz completed',    per: 'quiz' },
  sat_practice_set:  { credits: 2, label: 'Answer 10 SAT questions',       short: 'SAT practice',      per: '10 questions' },
  sat_full_test:     { credits: 6, label: 'Finish a full-length SAT test', short: 'Full SAT test',     per: 'test' },
  flashcards_batch:  { credits: 1, label: 'Review 10 flashcards',          short: 'Flashcards',        per: '10 cards' },
  plan_task:         { credits: 1, label: 'Complete a plan task',          short: 'Plan task',         per: 'task' },
  interview_session: { credits: 2, label: 'Practice a mock interview',     short: 'Mock interview',    per: 'session' },
  portfolio_entry:   { credits: 1, label: 'Log portfolio work',            short: 'Portfolio entry',   per: 'entry' },
};

/** Credit weight for an action id (0 for anything unrecognised — never throws,
 *  since call sites pass ids from all over the app). */
export function creditsFor(action, times = 1) {
  const def = STREAK_ACTIONS[action];
  if (!def) return 0;
  return def.credits * Math.max(0, times);
}

// ── Daily goals ──────────────────────────────────────────────────────────────
// The student's own commitment, set in the Streak tab (and offered in Settings
// → Profile & Goals). `examples` is what actually gets shown to them, because
// "4 credits" means nothing and "one lesson, or two quizzes" means everything.
export const STREAK_GOALS = [
  {
    id: 'light', label: 'Light', credits: 2, minutes: '~10 min/day',
    blurb: 'A quiz a day. Good for a busy season you still want to show up in.',
    examples: ['1 quiz', '2 plan tasks', '20 flashcards'],
  },
  {
    id: 'steady', label: 'Steady', credits: 4, minutes: '~25 min/day',
    blurb: 'One real lesson a day. This is the pace that finishes a pathway.',
    examples: ['1 verified lesson', '2 quizzes', '20 SAT questions'],
  },
  {
    id: 'serious', label: 'Serious', credits: 8, minutes: '~50 min/day',
    blurb: 'Two lessons, or a lesson plus a solid SAT block. Real daily volume.',
    examples: ['2 verified lessons', '1 lesson + 20 SAT questions', '4 quizzes'],
  },
  {
    id: 'intense', label: 'Intense', credits: 12, minutes: '~90 min/day',
    blurb: 'Test-season pace. Only pick this if you can actually hold it.',
    examples: ['3 verified lessons', '1 full SAT test + a lesson', '6 quizzes'],
  },
];

export const DEFAULT_GOAL_ID = 'steady';

export function getGoal(goalId) {
  return STREAK_GOALS.find(g => g.id === goalId) || STREAK_GOALS.find(g => g.id === DEFAULT_GOAL_ID);
}

/** The daily credit target for a user record. Reads `user.streakGoalId`. */
export function goalCreditsFor(user) {
  return getGoal(user?.streakGoalId).credits;
}

// ── Streak targets ───────────────────────────────────────────────────────────
// The OTHER goal a student sets: how long they are trying to keep the streak
// going. Separate from the daily goal because they answer different questions
// ("how hard is a day" vs "how far am I going"), and because the target is what
// every progress bar in the app measures against.
export const STREAK_TARGETS = [7, 14, 30, 60, 100, 180, 365];
export const DEFAULT_STREAK_TARGET = 30;

export function streakTargetFor(user) {
  const t = Number(user?.streakTarget);
  return Number.isFinite(t) && t > 0 ? Math.round(t) : DEFAULT_STREAK_TARGET;
}

/** Progress toward the student's own target. Once passed, the target rolls up
 *  to the next rung so the bar never sits pinned at 100% with nothing to aim at. */
export function targetProgress(streak, target) {
  const effective = streak >= target
    ? (STREAK_TARGETS.find(t => t > streak) || Math.ceil((streak + 1) / 100) * 100)
    : target;
  return {
    target: effective,
    surpassed: streak >= target,
    original: target,
    remaining: Math.max(0, effective - streak),
    pct: Math.max(0, Math.min(100, Math.round((streak / effective) * 100))),
  };
}

// ── Milestone rewards ────────────────────────────────────────────────────────
// Deterministic, never a variable roll: a milestone the student can see coming
// is only motivating if the payout is the one that was advertised. Each rung is
// claimed at most once, ever (DB.claimStreakReward, keyed `milestone:<days>`).
//
// `freezes` grants streak-freeze tokens, the loss-aversion safety net that
// already exists (DB.grantStreakFreeze, capped at 2 held). Later rungs hand out
// more because the thing a 100-day streak most needs is protection from one bad
// week — and because a student who loses a 100-day streak to a family emergency
// does not come back.
export const STREAK_REWARDS = [
  { days: 3,   xp: 40,   freezes: 0, title: 'Traction',        blurb: 'Three days is where a habit stops being an accident.' },
  { days: 7,   xp: 120,  freezes: 1, title: 'Week One',        blurb: 'A full week. Plus your first streak freeze.' },
  { days: 14,  xp: 200,  freezes: 1, title: 'Fortnight',       blurb: 'Two weeks straight — most people never get here.' },
  { days: 30,  xp: 400,  freezes: 1, title: 'Iron Month',      blurb: 'A month of daily proof that you follow through.' },
  { days: 50,  xp: 650,  freezes: 1, title: 'Fifty',           blurb: 'Fifty days. This is no longer motivation — it is routine.' },
  { days: 100, xp: 1200, freezes: 2, title: 'Century',         blurb: 'Triple digits. Genuinely elite consistency.' },
  { days: 180, xp: 2000, freezes: 2, title: 'Half a Year',     blurb: 'Six months. This is the streak that changes an application.' },
  { days: 365, xp: 5000, freezes: 2, title: 'The Full Year',   blurb: 'Three hundred and sixty-five days. Almost nobody does this.' },
];

export const rewardKey = (days) => `milestone:${days}`;

/** The next unearned rung above `streak`, or null past the top of the ladder. */
export function nextMilestone(streak) {
  return STREAK_REWARDS.find(r => r.days > streak) || null;
}

/** Every rung the current streak has reached — used to find unclaimed rewards.
 *  A streak that was broken and rebuilt does NOT re-earn a rung: the claim
 *  table is permanent, so `claimStreakReward` rejects the second claim. */
export function reachedMilestones(streak) {
  return STREAK_REWARDS.filter(r => r.days <= streak);
}

/** Rungs reached but not yet claimed, oldest first. */
export function unclaimedMilestones(streak, claimedKeys) {
  return reachedMilestones(streak).filter(r => !claimedKeys.has(rewardKey(r.days)));
}

// ── Perfect week ─────────────────────────────────────────────────────────────
// All seven days of one Monday–Sunday week cleared. Distinct from a 7-day
// streak: a streak of 7 can straddle two weeks, a perfect week cannot, and a
// student with a 60-day streak still gets a fresh perfect week to win every
// Monday. That is the point — it is the recurring goal that keeps a long streak
// from going flat, and it is the only reward in the app that resets weekly.
export const PERFECT_WEEK_REWARD = { xp: 250, freezes: 1, title: 'Perfect Week' };

export const perfectWeekKey = (weekKey) => `week:${weekKey}`;

/** Monday of the week containing `date`, at local midnight. */
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay() || 7; // Sun=7
  d.setDate(d.getDate() - (dow - 1));
  return d;
}

/** ISO-ish week key (`2026-W33`) for the week containing `date`. Matches
 *  gamification.js's getIsoWeekKey so quests and perfect weeks share a calendar. */
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The current week's seven days, each labelled with whether it was cleared.
 * `metDates` is a Set of YYYY-MM-DD keys that cleared their goal; `bridged` is
 * the Set of dates a streak freeze covered (those count toward the streak but
 * NOT toward a perfect week — a perfect week has to actually be perfect).
 */
export function weekProgress(metDates, { date = new Date(), bridged = new Set() } = {}) {
  const monday = startOfWeek(date);
  const todayKey = localDateStr(date);
  const days = [];
  let met = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateStr(d);
    const isMet = metDates.has(key);
    if (isMet) met++;
    days.push({
      key, date: d, letter: WEEKDAY_LETTERS[i],
      met: isMet,
      frozen: !isMet && bridged.has(key),
      isToday: key === todayKey,
      future: key > todayKey,
    });
  }
  const elapsed = days.filter(d => !d.future).length;
  const missed = days.filter(d => !d.future && !d.met).length;
  return {
    weekKey: isoWeekKey(date),
    days, met, needed: 7,
    remaining: 7 - met,
    elapsed,
    // Still winnable only if nothing already elapsed was missed.
    stillPossible: missed === 0,
    complete: met === 7,
    pct: Math.round((met / 7) * 100),
  };
}

// ── Streak computation ───────────────────────────────────────────────────────
/**
 * Consecutive cleared days ending today (or yesterday — a streak is not broken
 * until the day it was missed is fully over, otherwise every student's streak
 * would read 0 every morning until they studied).
 *
 * `bridged` dates (spent streak freezes) count as cleared for continuity only.
 */
export function computeStreak(metDates, { bridged = new Set(), today = new Date() } = {}) {
  const cleared = (key) => metDates.has(key) || bridged.has(key);
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  // Today not yet cleared? Start counting from yesterday — today is still open.
  if (!cleared(localDateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  // Hard ceiling so a corrupted date set can never spin forever.
  for (let i = 0; i < 4000; i++) {
    if (!cleared(localDateStr(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of cleared days anywhere in the history. Powers "personal best". */
export function longestStreak(metDates, bridged = new Set()) {
  const all = [...new Set([...metDates, ...bridged])].sort();
  let best = 0, run = 0, prev = null;
  for (const key of all) {
    if (prev) {
      const gap = Math.round((new Date(`${key}T00:00:00`) - new Date(`${prev}T00:00:00`)) / 86400000);
      run = gap === 1 ? run + 1 : 1;
    } else run = 1;
    if (run > best) best = run;
    prev = key;
  }
  return best;
}

// ── Today's status ───────────────────────────────────────────────────────────
/** How today is going against the daily goal. `credits` is today's earned total. */
export function dayStatus(credits, goalCredits) {
  const c = Math.max(0, credits || 0);
  const target = Math.max(1, goalCredits || 1);
  return {
    credits: c, goalCredits: target,
    met: c >= target,
    remaining: Math.max(0, target - c),
    pct: Math.min(100, Math.round((c / target) * 100)),
  };
}

/**
 * The single sentence that tells a student what is left today, phrased as the
 * cheapest concrete action that would finish it rather than as an abstract
 * credit count. "1 more quiz" is a decision; "2 more credits" is a puzzle.
 */
export function remainingCopy(remaining) {
  if (remaining <= 0) return 'Today is locked in.';
  if (remaining <= 1) return 'One quick win away — a plan task or 10 flashcards does it.';
  if (remaining <= 2) return 'One quiz away from locking in today.';
  if (remaining <= 4) return 'One verified lesson locks in today.';
  if (remaining <= 6) return 'A lesson plus a quiz finishes today.';
  return 'A lesson and a solid practice block finishes today.';
}

// ── Encouragement ────────────────────────────────────────────────────────────
// Deterministic phrasing picked from state rather than at random, so the same
// screen shown twice does not say two different things — a coach that changes
// its mind between renders does not read as a coach.
/**
 * The line shown after finishing a lesson, on the streak page of the completion
 * overlay. Ordered by what matters most in that moment: a milestone just hit,
 * then a perfect week within reach, then the streak itself, then a first day.
 */
export function encouragement({ streak = 0, justMet = false, week = null, milestone = null, target = null }) {
  if (milestone) return `${milestone.days}-day streak. ${milestone.blurb}`;
  if (week?.complete) return 'Seven for seven. That is a perfect week — every single day of it earned.';
  if (week && week.stillPossible && week.remaining === 1 && !week.complete) {
    return 'One more day this week and you take the Perfect Week reward.';
  }
  if (week && week.stillPossible && week.remaining === 2) {
    return 'Two days left in a clean week — Perfect Week is still on the table.';
  }
  if (justMet && streak === 1) return 'Day one, earned properly. The next one is the hard one.';
  if (justMet && target && target.remaining <= 3 && target.remaining > 0) {
    return `${target.remaining} day${target.remaining === 1 ? '' : 's'} from your ${target.target}-day goal. Do not stop here.`;
  }
  if (justMet && streak >= 2) return `${streak} days in a row. Come back tomorrow and it is ${streak + 1}.`;
  if (!justMet) return 'Good work. Finish today\'s goal and the streak moves.';
  return 'That counts. Keep it going.';
}

/**
 * The mid-pathway nudge — shown between lessons, on the pathway board, while
 * the student is still working. Short, specific, and always pointing forward to
 * the next concrete thing rather than congratulating them for stopping.
 */
export function pathwayEncouragement({ streak = 0, day, week, remainingLessons = 0 }) {
  if (day && !day.met) {
    if (day.credits === 0 && streak > 0) {
      return { tone: 'urgent', text: `Your ${streak}-day streak needs today. ${remainingCopy(day.remaining)}` };
    }
    if (day.credits > 0) {
      return { tone: 'push', text: `${day.pct}% of today's goal done. ${remainingCopy(day.remaining)}` };
    }
    return { tone: 'push', text: remainingCopy(day.remaining) };
  }
  if (week?.stillPossible && !week.complete && week.remaining <= 2) {
    return { tone: 'reward', text: `Today is locked in — and you are ${week.remaining} day${week.remaining === 1 ? '' : 's'} from a Perfect Week.` };
  }
  if (remainingLessons === 1) {
    return { tone: 'reward', text: 'One lesson left in this pathway. Finish it today and it is done.' };
  }
  if (remainingLessons > 1 && streak >= 3) {
    return { tone: 'reward', text: `${streak}-day streak, ${remainingLessons} lessons to go. At this pace you finish soon.` };
  }
  return { tone: 'calm', text: 'Today is done. Anything else today is pure gain.' };
}

// ── Calendar layout ──────────────────────────────────────────────────────────
/**
 * A Monday-first month grid for the calendar UI. Returns 6 rows × 7 cells so the
 * grid never changes height month to month (a calendar that reflows as you page
 * through it is the single most jarring thing a calendar can do).
 *
 * Each cell: { key, date, inMonth, future, isToday, met, frozen, credits, pct }.
 */
export function buildMonthGrid(monthDate, { activity = new Map(), bridged = new Set(), goalCredits = 4, today = new Date() } = {}) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const todayKey = localDateStr(today);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const key = localDateStr(d);
    const row = activity.get(key);
    const credits = row?.credits || 0;
    const met = !!row?.met;
    cells.push({
      key, date: d,
      inMonth: d.getMonth() === monthDate.getMonth(),
      future: key > todayKey,
      isToday: key === todayKey,
      met,
      frozen: !met && bridged.has(key),
      credits,
      counts: row?.counts || {},
      pct: Math.min(100, Math.round((credits / Math.max(1, row?.goalCredits || goalCredits)) * 100)),
    });
  }
  return cells;
}

/** Cleared-day count and total for a month — the calendar's header summary. */
export function monthSummary(cells) {
  const inMonth = cells.filter(c => c.inMonth && !c.future);
  return {
    met: inMonth.filter(c => c.met).length,
    elapsed: inMonth.length,
    credits: inMonth.reduce((n, c) => n + c.credits, 0),
  };
}
