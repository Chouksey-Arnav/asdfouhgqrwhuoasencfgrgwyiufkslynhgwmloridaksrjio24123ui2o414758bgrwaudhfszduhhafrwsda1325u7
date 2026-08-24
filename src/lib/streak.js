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
// nothing: a student who spends an hour mastering a unit and no lessons is
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
  unit_verified:     { credits: 4, label: 'Master a pathway unit',         short: 'Unit mastered',     per: 'unit' },
  quiz_completed:    { credits: 2, label: 'Complete a quiz',               short: 'Quiz completed',    per: 'quiz' },
  flashcards_batch:  { credits: 1, label: 'Review 10 flashcards',          short: 'Flashcards',        per: '10 cards' },
  deck_created:      { credits: 1, label: 'Build a flashcard deck',        short: 'Deck built',        per: 'deck' },
  notes_batch:       { credits: 1, label: 'Highlight 3 passages',          short: 'Notes written',     per: '3 highlights' },
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
    examples: ['1 verified lesson', '2 quizzes', '4 plan tasks'],
  },
  {
    id: 'serious', label: 'Serious', credits: 8, minutes: '~50 min/day',
    blurb: 'Two lessons, or a lesson plus a solid quiz block. Real daily volume.',
    examples: ['2 verified lessons', '1 lesson + 2 quizzes', '4 quizzes'],
  },
  {
    id: 'intense', label: 'Intense', credits: 12, minutes: '~90 min/day',
    blurb: 'Exam-season pace. Only pick this if you can actually hold it.',
    examples: ['3 verified lessons', '1 unit mastered + a lesson', '6 quizzes'],
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
// The ladder is deliberately dense at the bottom and sparse at the top. A
// student in their first fortnight needs a rung every few days, because nothing
// they have done yet has proved that this app pays out; a student on day 200
// does not need one at 210, because by then the streak IS the reward and an
// extra payout every ten days would only cheapen the ones that matter.
//
// The first four rungs are inside the first fortnight on purpose: that window is
// where essentially all streak abandonment happens, and it is the only part of
// the ladder where the reward schedule is doing any real work.
export const STREAK_REWARDS = [
  { days: 3,   xp: 40,   freezes: 0, title: 'Traction',       blurb: 'Three days is where a habit stops being an accident.' },
  { days: 5,   xp: 70,   freezes: 1, title: 'Five Alive',     blurb: 'Five days, and your first streak freeze — one missed day is now survivable.' },
  { days: 7,   xp: 120,  freezes: 1, title: 'Week One',       blurb: 'A full week. Most people who install a study app never see this screen.' },
  { days: 10,  xp: 160,  freezes: 0, title: 'Double Digits',  blurb: 'Ten in a row. The part where it starts feeling automatic.' },
  { days: 14,  xp: 220,  freezes: 1, title: 'Fortnight',      blurb: 'Two weeks straight. You are past the window where streaks die.' },
  { days: 21,  xp: 300,  freezes: 1, title: 'Three Weeks',    blurb: 'Twenty-one days — the number people quote when they talk about habits.' },
  { days: 30,  xp: 450,  freezes: 1, title: 'Iron Month',     blurb: 'A month of daily proof that you follow through.' },
  { days: 50,  xp: 700,  freezes: 1, title: 'Fifty',          blurb: 'Fifty days. This is no longer motivation — it is routine.' },
  { days: 75,  xp: 950,  freezes: 1, title: 'Seventy-Five',   blurb: 'Most of a school term without missing. That is a real thing to have done.' },
  { days: 100, xp: 1400, freezes: 2, title: 'Century',        blurb: 'Triple digits. Genuinely elite consistency.' },
  { days: 150, xp: 1900, freezes: 2, title: 'Hundred & Fifty',blurb: 'Five months. At this point the streak is part of how you describe yourself.' },
  { days: 180, xp: 2400, freezes: 2, title: 'Half a Year',    blurb: 'Six months. This is the streak that changes an application.' },
  { days: 270, xp: 3400, freezes: 2, title: 'Three Quarters',  blurb: 'Nine months — a whole academic year of showing up.' },
  { days: 365, xp: 5000, freezes: 3, title: 'The Full Year',  blurb: 'Three hundred and sixty-five days. Almost nobody does this.' },
  { days: 500, xp: 7500, freezes: 3, title: 'Five Hundred',   blurb: 'Five hundred days. There is no rung above this one, and there does not need to be.' },
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

// ── Leagues ──────────────────────────────────────────────────────────────────
//
// The rung ladder above pays out at fourteen specific numbers. Between those
// numbers a streak is just an integer that goes up, which is fine for an adult
// and not enough for the audience this product is actually for. A LEAGUE is the
// identity attached to the number: it changes name, color and shape at seven
// thresholds, it is drawn everywhere the streak is drawn, and — critically — it
// carries two things that are not cosmetic:
//
//   freezeCap   how many streak freezes you may hold at once
//   xpBonus     a permanent multiplier on every XP award while you hold it
//
// The XP bonus is the point. A student on day 40 earns 12% more from everything
// they do than a student on day 2, which does two jobs at once: it makes a long
// streak materially valuable rather than only sentimental, and it makes breaking
// one cost something concrete instead of only feeling bad. That is loss aversion
// used honestly — nothing is taken away as a punishment, a benefit simply stops
// applying, and it comes straight back when the streak does.
//
// The bonus tops out at 25%. It is deliberately not larger: past that point a
// student who breaks a long streak has lost so much earning power that the
// rational move is to stop caring about XP altogether, which is the exact
// opposite of what this is for.
export const STREAK_LEAGUES = [
  { id: 'spark',     min: 0,   label: 'Spark',      icon: 'Sparkle',    color: '#94a3b8', freezeCap: 1, xpBonus: 0,
    blurb: 'Every streak starts here. One earned day and you are out of it.' },
  { id: 'ember',     min: 3,   label: 'Ember',      icon: 'Flame',      color: '#fbbf24', freezeCap: 2, xpBonus: 0.02,
    blurb: 'Three days. Small, and the hardest three you will do.' },
  { id: 'kindle',    min: 7,   label: 'Kindle',     icon: 'Flame',      color: '#f59e0b', freezeCap: 2, xpBonus: 0.05,
    blurb: 'A week. Everything you earn is now worth 5% more.' },
  { id: 'blaze',     min: 14,  label: 'Blaze',      icon: 'Flame',      color: '#f97316', freezeCap: 3, xpBonus: 0.08,
    blurb: 'A fortnight. Past the window where nearly every streak dies.' },
  { id: 'wildfire',  min: 30,  label: 'Wildfire',   icon: 'Zap',        color: '#ef4444', freezeCap: 3, xpBonus: 0.12,
    blurb: 'A month unbroken. Three freezes held, and 12% on everything.' },
  { id: 'firestorm', min: 60,  label: 'Firestorm',  icon: 'Wind',       color: '#ec4899', freezeCap: 4, xpBonus: 0.16,
    blurb: 'Two months. At this point the app is a habit, not a decision.' },
  { id: 'inferno',   min: 100, label: 'Inferno',    icon: 'Crown',      color: '#a855f7', freezeCap: 5, xpBonus: 0.20,
    blurb: 'Triple digits. A fifth of everything you earn is the streak paying you.' },
  { id: 'eternal',   min: 365, label: 'Eternal',    icon: 'Infinity',   color: '#22d3ee', freezeCap: 6, xpBonus: 0.25,
    blurb: 'A full year. The top of the ladder, and it will not be taken off you lightly.' },
];

/** The league a streak length sits in. Never null — `spark` covers zero. */
export function leagueFor(streak) {
  const n = Math.max(0, Number(streak) || 0);
  let out = STREAK_LEAGUES[0];
  for (const l of STREAK_LEAGUES) if (n >= l.min) out = l;
  return out;
}

/** The league above the current one, or null at the top. */
export function nextLeague(streak) {
  const n = Math.max(0, Number(streak) || 0);
  return STREAK_LEAGUES.find(l => l.min > n) || null;
}

/** Progress toward the next league, for the bar under the league badge. */
export function leagueProgress(streak) {
  const n = Math.max(0, Number(streak) || 0);
  const current = leagueFor(n);
  const next = nextLeague(n);
  if (!next) return { current, next: null, pct: 100, remaining: 0, promoted: true };
  const span = Math.max(1, next.min - current.min);
  return {
    current,
    next,
    remaining: next.min - n,
    pct: Math.max(0, Math.min(100, Math.round(((n - current.min) / span) * 100))),
    promoted: false,
  };
}

/** How many freezes this streak length allows a student to hold at once. */
export const freezeCapFor = (streak) => leagueFor(streak).freezeCap;

/**
 * The multiplier every XP award is scaled by, from the streak alone.
 *
 * Applied at the award site (see awardXP in src/lib/rewards.js and its callers),
 * NOT folded into any base number — so every surface can still show what the
 * base was worth and what the streak added, which is the only way a bonus is
 * motivating rather than confusing.
 */
export const streakXPMultiplier = (streak) => 1 + leagueFor(streak).xpBonus;

/** "+12%" or null when the league pays nothing. For chips and tooltips. */
export function streakBonusLabel(streak) {
  const bonus = leagueFor(streak).xpBonus;
  return bonus > 0 ? `+${Math.round(bonus * 100)}% XP` : null;
}

// ── The freeze economy ───────────────────────────────────────────────────────
//
// A streak freeze covers exactly one missed day. They were previously earnable
// only from two achievements and a couple of milestone rungs, capped at two, and
// spent automatically — which meant the safety net most students needed on the
// specific Saturday they needed it usually was not there.
//
// Three changes, all of them in the direction of "the student can plan":
//
//   1. The cap is the LEAGUE's cap, so protecting a long streak is easier than
//      protecting a new one. That is the right way round: the thing worth
//      protecting is the thing that took four months to build.
//   2. Freezes can be BOUGHT with XP. Not with money — this is deliberately not
//      a monetisation surface, and a paid streak freeze is the single most
//      cynical mechanic in this category of app. Spending XP is a real cost
//      against a real budget and keeps the decision meaningful.
//   3. The price climbs with how many you already hold, so stockpiling is
//      possible but expensive, and a student cannot simply buy immunity.
export const FREEZE_BASE_COST = 250;
export const FREEZE_COST_STEP = 200;

/** What the next freeze costs, given how many are already held. */
export function freezeCost(held = 0) {
  return FREEZE_BASE_COST + Math.max(0, held) * FREEZE_COST_STEP;
}

/**
 * Can this student buy another freeze right now, and if not, why not?
 *
 * Returns a reason string rather than a bare false so the button can explain
 * itself — a disabled control with no explanation is the most common small
 * cruelty in an interface like this.
 */
export function canBuyFreeze({ streak = 0, held = 0, xp = 0 } = {}) {
  const cap = freezeCapFor(streak);
  const cost = freezeCost(held);
  if (held >= cap) {
    const next = nextLeague(streak);
    return {
      ok: false, cost, cap,
      reason: next
        ? `You can hold ${cap} at ${leagueFor(streak).label}. Reach ${next.label} at ${next.min} days to hold ${next.freezeCap}.`
        : `You can hold ${cap}, which is the maximum.`,
    };
  }
  if (xp < cost) {
    return { ok: false, cost, cap, reason: `${(cost - xp).toLocaleString()} more XP needed.` };
  }
  return { ok: true, cost, cap, reason: `Costs ${cost.toLocaleString()} XP.` };
}

// ── Streak repair ────────────────────────────────────────────────────────────
//
// What happens after a streak actually breaks is the most important unhandled
// moment in this whole system, and the old answer was nothing: the number went
// to zero and the student who had a 60-day streak on Friday opened the app on
// Monday to a 0 and, very reasonably, stopped opening it.
//
// A repair buys back a broken run — once, at a real price, and only for a short
// window afterwards. The design constraints are the ones that keep it from
// being a cheat code:
//
//   · Only within REPAIR_WINDOW_DAYS of the break. A streak you abandoned three
//     weeks ago is not a streak you are in the middle of.
//   · Priced against what was lost, so a 4-day streak is cheap to restore and a
//     200-day streak is a serious XP decision.
//   · Once per REPAIR_COOLDOWN_DAYS. It is a safety net, not a strategy.
//   · A repaired day is recorded as REPAIRED, never as earned: it bridges the
//     streak exactly like a freeze does, and — exactly like a freeze — it can
//     never complete a Perfect Week or count toward a study-day quest.
export const REPAIR_WINDOW_DAYS = 3;
export const REPAIR_COOLDOWN_DAYS = 30;
export const REPAIR_BASE_COST = 200;
export const REPAIR_PER_DAY = 25;
export const REPAIR_MAX_COST = 2500;
export const repairKey = (date) => `repair:${date}`;

/** What restoring a run of `lostStreak` days costs in XP. */
export function repairCost(lostStreak = 0) {
  return Math.min(REPAIR_MAX_COST, REPAIR_BASE_COST + Math.max(0, lostStreak) * REPAIR_PER_DAY);
}

/**
 * Is there a broken streak worth offering to repair, and what would it cost?
 *
 * Pure: give it the cleared-day set, the bridged set, and when the last repair
 * was, and it works out the rest. Returns null when there is nothing to offer,
 * which is the common case and must be cheap.
 *
 * @param {Set<string>} metDates
 * @param {object} opts
 * @param {Set<string>} opts.bridged     dates already covered by a freeze or a repair
 * @param {number|null} opts.lastRepairAt epoch ms of the last repair, or null
 * @param {number} opts.xp               the student's spendable XP
 * @param {Date}   opts.today
 */
export function repairOffer(metDates, { bridged = new Set(), lastRepairAt = null, xp = 0, today = new Date() } = {}) {
  const cleared = (key) => metDates.has(key) || bridged.has(key);
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  // Today and yesterday are both still "open" — a streak is not broken until the
  // missed day is fully over, which is the same grace computeStreak() gives.
  if (cleared(localDateStr(cursor))) return null;
  const yesterday = new Date(cursor); yesterday.setDate(cursor.getDate() - 1);
  if (cleared(localDateStr(yesterday))) return null;

  // Walk back to the most recent cleared day. The gap between it and today is
  // what a repair would have to bridge.
  let gap = 0;
  const probe = new Date(yesterday);
  while (gap < REPAIR_WINDOW_DAYS + 1) {
    if (cleared(localDateStr(probe))) break;
    gap += 1;
    probe.setDate(probe.getDate() - 1);
  }
  // Nothing cleared within the window at all — this is not a repair, it is a
  // fresh start, and offering to sell one would be dishonest.
  if (!cleared(localDateStr(probe))) return null;
  const missedDays = gap;
  if (missedDays < 1 || missedDays > REPAIR_WINDOW_DAYS) return null;

  // What the run was worth, counted back from the last cleared day.
  const lost = computeStreak(metDates, { bridged, today: probe });
  if (lost < 2) return null; // a one-day streak is not worth buying back

  const cooldownOk = !lastRepairAt
    || (today.getTime() - lastRepairAt) >= REPAIR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const cost = repairCost(lost);
  const dates = [];
  const fill = new Date(probe);
  for (let i = 0; i < missedDays; i += 1) {
    fill.setDate(fill.getDate() + 1);
    dates.push(localDateStr(fill));
  }

  return {
    lost,
    missedDays,
    dates,
    cost,
    affordable: xp >= cost,
    cooldownOk,
    available: cooldownOk && xp >= cost,
    nextAvailableAt: cooldownOk || !lastRepairAt
      ? null
      : lastRepairAt + REPAIR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    // The sentence the card leads with. Names the number that was lost, because
    // that number is the entire reason anybody would pay this.
    headline: `Your ${lost}-day streak broke ${missedDays === 1 ? 'yesterday' : `${missedDays} days ago`}.`,
  };
}

// ── Perfect month ────────────────────────────────────────────────────────────
//
// The Perfect Week resets every Monday, which keeps a long streak from going
// flat week to week. The Perfect Month is the same idea one octave down: every
// elapsed day of a calendar month cleared. It is genuinely hard — a single
// missed Sunday in week one ends it — so it pays accordingly, and it is checked
// only against days that have actually happened, so a student on the 8th is
// still in the running rather than looking at a bar that says 26%.
export const PERFECT_MONTH_REWARD = { xp: 1200, freezes: 2, title: 'Perfect Month' };
export const perfectMonthKey = (monthKey) => `month:${monthKey}`;

/** `2026-08` for the month containing `date`. */
export function monthKeyOf(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * How the current calendar month is going.
 *
 * `bridged` days count for the STREAK but not here, same rule as the Perfect
 * Week: a month you froze your way through is not a perfect month.
 */
export function monthProgress(metDates, { date = new Date(), bridged = new Set() } = {}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const todayKey = localDateStr(date);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  let met = 0;
  let missed = 0;
  for (let i = 1; i <= daysInMonth; i += 1) {
    const d = new Date(year, month, i);
    const key = localDateStr(d);
    const future = key > todayKey;
    const isMet = metDates.has(key);
    if (isMet) met += 1;
    else if (!future) missed += 1;
    days.push({ key, date: d, met: isMet, frozen: !isMet && bridged.has(key), future, isToday: key === todayKey });
  }
  const elapsed = days.filter(d => !d.future).length;
  return {
    monthKey: monthKeyOf(date),
    label: date.toLocaleDateString(undefined, { month: 'long' }),
    days, met, elapsed, missed, daysInMonth,
    remaining: daysInMonth - met,
    stillPossible: missed === 0,
    complete: met === daysInMonth,
    // Measured against elapsed days, not against the whole month — a bar that
    // reads 26% on the 8th of a perfect month is telling the student they are
    // failing at something they are currently winning.
    pct: elapsed ? Math.round((met / elapsed) * 100) : 0,
  };
}

// ── XP boosts ────────────────────────────────────────────────────────────────
//
// A time-limited multiplier on top of everything else — granted by the check-in
// calendar's milestone days and by the occasional Clean Sweep. Boosts stack
// MULTIPLICATIVELY with the league bonus and are deliberately short: the whole
// value of a boost is that it makes a specific afternoon the right afternoon to
// study, and a boost that lasts a week does not do that.
export const BOOST_KINDS = {
  double: { id: 'double', label: 'Double XP', multiplier: 2,   hours: 6,  color: '#f59e0b', icon: 'Zap',
    blurb: 'Everything you earn is worth double for the next six hours.' },
  surge:  { id: 'surge',  label: 'XP Surge',  multiplier: 1.5, hours: 24, color: '#8b5cf6', icon: 'TrendingUp',
    blurb: 'Half again on everything you earn for a full day.' },
  triple: { id: 'triple', label: 'Triple XP', multiplier: 3,   hours: 3,  color: '#ef4444', icon: 'Flame',
    blurb: 'Three times XP for three hours. Use it on something big.' },
};

export const getBoostKind = (id) => BOOST_KINDS[id] || null;

/** The combined multiplier from a list of live boost rows. */
export function boostMultiplier(boosts = [], now = Date.now()) {
  return (boosts || [])
    .filter(b => b && (b.expiresAt || 0) > now)
    .reduce((m, b) => m * (BOOST_KINDS[b.kind]?.multiplier || 1), 1);
}

/** The live boosts, soonest to expire first, with time left attached. */
export function activeBoosts(boosts = [], now = Date.now()) {
  return (boosts || [])
    .filter(b => b && (b.expiresAt || 0) > now)
    .map(b => ({
      ...b,
      def: BOOST_KINDS[b.kind] || BOOST_KINDS.surge,
      msLeft: b.expiresAt - now,
      minutesLeft: Math.max(1, Math.round((b.expiresAt - now) / 60000)),
    }))
    .sort((a, b) => a.msLeft - b.msLeft);
}

/** "2h 14m left" — the only format a countdown chip needs. */
export function boostCountdown(msLeft) {
  const mins = Math.max(0, Math.round(msLeft / 60000));
  if (mins < 60) return `${mins}m left`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m left`;
}

/**
 * The total multiplier in force right now: league × boosts.
 *
 * The one function every XP award site should call. Returns the parts as well as
 * the product, because every surface that shows a bonus has to be able to say
 * where it came from — "+240 XP" with no explanation is a number a student
 * assumes is a bug.
 */
export function xpMultiplier({ streak = 0, boosts = [], now = Date.now() } = {}) {
  const league = streakXPMultiplier(streak);
  const boost = boostMultiplier(boosts, now);
  const total = league * boost;
  return {
    total,
    league,
    boost,
    leagueLabel: streakBonusLabel(streak),
    boostLabel: boost > 1 ? `×${Number(boost.toFixed(2))} boost` : null,
    any: total > 1,
  };
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
 * The current week's seven days, each labeled with whether it was cleared.
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
