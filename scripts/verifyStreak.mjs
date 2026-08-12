#!/usr/bin/env node
/**
 * Guards the promises the streak system makes, all of which fail silently if broken.
 *
 *   1. THE STREAK IS EARNED, NOT ATTENDED. Nothing on the app-load path may record a study
 *      day. This is the whole point of the rewrite, and a regression here is invisible —
 *      the app looks identical, the streak just quietly starts counting tab-opens again.
 *   2. THE DEFAULT GOAL MEANS WHAT THE UI SAYS IT MEANS. "One lesson, or two quizzes"
 *      is printed on the goal picker and in the completion overlay. If the weights drift,
 *      the copy becomes a lie and the student's day silently fails to clear.
 *   3. THE STREAK MATH IS RIGHT. Today stays open until it is over, a freeze bridges
 *      exactly one day, and a gap ends the run.
 *   4. A PERFECT WEEK IS ACTUALLY PERFECT. Seven earned days inside one Monday–Sunday
 *      window, and a streak freeze does NOT buy one.
 *   5. REWARDS PAY ONCE, EVER, AND PAY WHAT THEY ADVERTISED. A ladder that pays twice
 *      is an XP printer; one that pays a different number than the card showed is worse.
 *   6. RAISING YOUR GOAL NEVER UN-EARNS A FINISHED DAY.
 *   7. EVERY SURFACE IS WIRED. The tab exists, has a URL, and the streak ledger travels
 *      with the student across devices.
 *   8. THE LEAGUE PAYS WHAT IT SAYS. A streak's XP bonus and freeze cap are derived from the
 *      streak alone and can never disagree with the number they are drawn beside.
 *   9. A REPAIR BUYS CONTINUITY, NEVER CREDIT. A repaired day bridges the streak exactly like
 *      a freeze and can never complete a Perfect Week, a Perfect Month, or a study-day quest.
 *  10. THE CHECK-IN LADDER IS THE FORGIVING ONE. It never punishes a miss, and it is never
 *      mistaken for the streak.
 *
 * Run by `npm run verify:streak` (and by `npm run build`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) =>
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const section = (name) => console.log(`\n${name}`);

const S = await load('src/lib/streak.js');
const { SUBVIEWS } = await load('src/lib/routes.js');
const CHECKIN = await load('src/data/checkinCalendar.js');
const app = read('src/App.jsx');
const db = read('src/lib/db.js');

// Local-date key helper matching lib/dateUtils, so fixtures below read as calendar days.
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n, from = new Date()) => { const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const keysBack = (n, from = new Date()) => Array.from({ length: n }, (_, i) => key(daysAgo(i, from)));

// ── 1. Earned, not attended ─────────────────────────────────────────────────
section('The streak is earned, not attended');

assert('db.js no longer exports recordStudyToday',
  !/export async function recordStudyToday/.test(db),
  'the attendance-based recorder is still there — something can still call it');
assert('nothing in the app calls recordStudyToday',
  !/DB\.recordStudyToday\s*\(/.test(app));
assert('db.js exposes the earned-activity recorder instead',
  /export async function recordStreakActivity/.test(db));
assert('studyDays is only written from inside recordStreakActivity',
  (db.match(/db\.studyDays\.add\(/g) || []).length === 1,
  'more than one writer means "a study day" can mean two different things');
// The one place a study day is now created must be gated on the day being cleared.
{
  const start = db.indexOf('export async function recordStreakActivity');
  const body = db.slice(start, db.indexOf('\nexport ', start + 10));
  assert('the study-day write is gated on the day actually clearing',
    /if\s*\(met\s*&&\s*!wasMet\)/.test(body));
}
assert('App.jsx reaches the DB recorder from exactly one place',
  (app.match(/DB\.recordStreakActivity\(/g) || []).length === 1,
  'a second call site would bypass creditStreak() and skip milestone payouts');
{
  const cs = app.indexOf('const creditStreak');
  assert('...and that place is inside creditStreak()',
    cs !== -1 && app.indexOf('DB.recordStreakActivity(') > cs
      && app.indexOf('DB.recordStreakActivity(') < app.indexOf('// \u2500\u2500 Streak-at-risk nudge'));
}
assert('creditStreak exists and is the only caller of the DB recorder',
  /const creditStreak\s*=\s*useCallback/.test(app));

// Every action id named in App.jsx must be a real, non-zero-weight action.
const usedActions = [...app.matchAll(/creditStreak\('([a-z_]+)'/g)].map((m) => m[1]);
assert('App.jsx credits at least five different kinds of work',
  new Set(usedActions).size >= 5, `found ${[...new Set(usedActions)].join(', ')}`);
for (const a of new Set(usedActions)) {
  assert(`'${a}' is a defined action with a positive weight`,
    (S.STREAK_ACTIONS[a]?.credits || 0) > 0);
}
eq('an unknown action earns nothing rather than throwing', S.creditsFor('not_a_real_action'), 0);
eq('a negative repeat count cannot earn negative credit', S.creditsFor('quiz_completed', -5), 0);

// ── 2. The default goal means what the UI says ──────────────────────────────
section('One lesson, or two quizzes, clears the default day');

const steady = S.getGoal(S.DEFAULT_GOAL_ID);
eq('the default goal is Steady', steady.id, 'steady');
assert('one verified lesson clears the default goal exactly',
  S.creditsFor('lesson_verified') === steady.credits,
  `lesson=${S.creditsFor('lesson_verified')}, goal=${steady.credits}`);
assert('two quizzes clear the default goal exactly',
  S.creditsFor('quiz_completed', 2) === steady.credits,
  `2 quizzes=${S.creditsFor('quiz_completed', 2)}, goal=${steady.credits}`);
assert('ONE quiz does not clear it — the copy says two',
  S.creditsFor('quiz_completed') < steady.credits);
assert('ten flashcards alone cannot clear a day',
  S.creditsFor('flashcards_batch') < steady.credits,
  'a card blitz would become the cheapest way to hold a streak');
assert('every goal is reachable by a single ordinary session',
  S.STREAK_GOALS.every((g) => g.credits <= S.creditsFor('lesson_verified', 3)));
assert('goals are strictly increasing in difficulty',
  S.STREAK_GOALS.every((g, i) => i === 0 || g.credits > S.STREAK_GOALS[i - 1].credits));
assert('every goal states examples the student can act on',
  S.STREAK_GOALS.every((g) => g.examples?.length >= 2 && g.blurb && g.minutes));
eq('an unknown goal id falls back to the default rather than crashing',
  S.getGoal('nonsense').id, S.DEFAULT_GOAL_ID);
eq('a user with no goal set gets the default credits', S.goalCreditsFor(null), steady.credits);

// ── 3. Streak math ──────────────────────────────────────────────────────────
section('The streak counts what it should');

const today = new Date(); today.setHours(0, 0, 0, 0);
eq('no days is no streak', S.computeStreak(new Set()), 0);
eq('today alone is a 1-day streak', S.computeStreak(new Set([key(today)])), 1);
eq('five consecutive days ending today is 5',
  S.computeStreak(new Set(keysBack(5))), 5);
// The grace window: a streak is not broken until the missed day is actually over.
eq('yesterday-but-not-today still reads as alive',
  S.computeStreak(new Set(keysBack(4, daysAgo(1)))), 4);
eq('a two-day gap ends the run',
  S.computeStreak(new Set([key(daysAgo(3)), key(daysAgo(4))])), 0);
eq('a gap in the middle stops the count there',
  S.computeStreak(new Set([key(today), key(daysAgo(1)), key(daysAgo(3))])), 2);
eq('a spent freeze bridges exactly the day it covers',
  S.computeStreak(new Set([key(today), key(daysAgo(2))]), { bridged: new Set([key(daysAgo(1))]) }), 3);
eq('a freeze on the wrong date bridges nothing',
  S.computeStreak(new Set([key(today), key(daysAgo(2))]), { bridged: new Set([key(daysAgo(5))]) }), 1);
eq('longest streak finds a historical run, not just the current one',
  S.longestStreak(new Set([...keysBack(3, daysAgo(20)), key(today)])), 3);
eq('longest streak of nothing is 0', S.longestStreak(new Set()), 0);

// ── 4. A perfect week is actually perfect ───────────────────────────────────
section('A Perfect Week is seven earned days in one week');

const monday = S.startOfWeek(today);
eq('the week window starts on a Monday', monday.getDay(), 1);
{
  const all7 = new Set(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return key(d);
  }));
  const full = S.weekProgress(all7, { date: monday });
  assert('seven earned days completes the week', full.complete && full.met === 7);
  eq('a complete week is 100%', full.pct, 100);

  // A freeze keeps a STREAK alive but must not buy a Perfect Week.
  const six = new Set([...all7]); six.delete(key(monday));
  const frozen = S.weekProgress(six, { date: monday, bridged: new Set([key(monday)]) });
  assert('a freeze does not complete a perfect week', !frozen.complete);
  assert('...and the frozen day is labelled as frozen, not earned',
    frozen.days[0].frozen === true && frozen.days[0].met === false);
  assert('a missed elapsed day closes the week out',
    S.weekProgress(new Set(), { date: new Date(monday.getTime() + 3 * 86400000) }).stillPossible === false);
}
{
  // Mid-week, nothing missed yet: still winnable.
  const wed = new Date(monday); wed.setDate(monday.getDate() + 2);
  const clean = S.weekProgress(new Set([key(monday), key(new Date(monday.getTime() + 86400000)), key(wed)]), { date: wed });
  assert('a clean partial week is still winnable', clean.stillPossible && !clean.complete);
  eq('...and reports what is left', clean.remaining, 4);
}
assert('the week key matches the quest week key so both reset together',
  S.isoWeekKey(new Date('2026-08-12T12:00:00')) === (await load('src/lib/gamification.js')).getIsoWeekKey(new Date('2026-08-12T12:00:00')));

// ── 5. Rewards pay once, and pay what they advertised ───────────────────────
section('The reward ladder is honest');

assert('the ladder climbs', S.STREAK_REWARDS.every((r, i) => i === 0 || r.days > S.STREAK_REWARDS[i - 1].days));
assert('payouts climb with it', S.STREAK_REWARDS.every((r, i) => i === 0 || r.xp > S.STREAK_REWARDS[i - 1].xp));
assert('every rung has a title and a reason to want it',
  S.STREAK_REWARDS.every((r) => r.title && r.blurb && r.xp > 0));
assert('reward keys are unique — two rungs cannot share a claim',
  new Set(S.STREAK_REWARDS.map((r) => S.rewardKey(r.days))).size === S.STREAK_REWARDS.length);
assert('milestone and perfect-week keys can never collide',
  !S.STREAK_REWARDS.some((r) => S.rewardKey(r.days) === S.perfectWeekKey('2026-W33')));
assert('...nor with a perfect-month, a repair, or a daily-quest key',
  new Set([
    S.rewardKey(30), S.perfectWeekKey('2026-W33'), S.perfectMonthKey('2026-08'),
    S.repairKey('2026-08-12'), 'daily:2026-08-12:d_quiz_one',
  ]).size === 5,
  'every one of these lives in the same permanent ledger — a collision silently voids a reward');
assert('the ladder covers the long horizons the product promises (100 and 365)',
  S.STREAK_REWARDS.some((r) => r.days === 100) && S.STREAK_REWARDS.some((r) => r.days === 365));
eq('the next milestone above 0 is the first rung', S.nextMilestone(0).days, S.STREAK_REWARDS[0].days);
eq('past the top of the ladder there is no next rung', S.nextMilestone(9999), null);
eq('a 30-day streak has reached seven rungs', S.reachedMilestones(30).length, 7);
assert('the first four rungs all land inside the first fortnight',
  S.STREAK_REWARDS.slice(0, 4).every((r) => r.days <= 14),
  'that window is where essentially all streak abandonment happens — it is the only part of the ladder doing real work');
{
  const claimed = new Set([S.rewardKey(3), S.rewardKey(7)]);
  const owed = S.unclaimedMilestones(30, claimed);
  eq('already-claimed rungs are never offered again', owed.length, 5);
  assert('...and the ones owed are the unclaimed ones', owed.every((r) => [5, 10, 14, 21, 30].includes(r.days)));
  eq('a fully-claimed ladder owes nothing',
    S.unclaimedMilestones(30, new Set(S.STREAK_REWARDS.map((r) => S.rewardKey(r.days)))).length, 0);
}
assert('the claim ledger is permanent (no delete path anywhere)',
  !/streakRewards\.(delete|where\([^)]*\)\.delete)/.test(db),
  'a rebuilt streak could re-claim a rung it was already paid for');
assert('claiming is idempotent by construction (add on a keyed table, failure means held)',
  /export async function claimStreakReward/.test(db) && /db\.streakRewards\.add\(/.test(db));
assert('milestone XP is granted deterministically, not through the variable-bonus roll',
  !/awardXP\([^)]*milestone/i.test(app));

// ── 6. Raising your goal never un-earns a day ───────────────────────────────
section('A finished day stays finished');

{
  const start = db.indexOf('export async function recordStreakActivity');
  const body = db.slice(start, db.indexOf('\nexport async function getDayActivity', start));
  assert('a cleared day stays cleared regardless of the new goal',
    /const met\s*=\s*wasMet\s*\|\|/.test(body));
  assert('...and keeps the goal it was cleared against',
    /const effectiveGoal\s*=\s*wasMet\s*\?\s*\(existing\.goalCredits/.test(body));
  assert('...and reports that same goal back to its caller, not the new one',
    /return\s*\{[^}]*goalCredits:\s*effectiveGoal/.test(body),
    'the completion overlay would show an already-earned day as unfinished');
  assert('metAt is stamped once and never moved',
    /metAt:\s*wasMet\s*\?\s*existing\.metAt/.test(body));
}
{
  const row = { credits: 4, goalCredits: 4, met: 1 };
  const raised = S.dayStatus(row.credits, row.goalCredits);
  assert('an earned Steady day still reads as met after the goal is raised', raised.met);
}
eq('a zero-credit day is 0%', S.dayStatus(0, 4).pct, 0);
eq('an over-earned day caps at 100%', S.dayStatus(40, 4).pct, 100);
eq('a day past its goal owes nothing more', S.dayStatus(40, 4).remaining, 0);
assert('the remaining-work copy is always a concrete action, never a credit count',
  [0, 1, 2, 4, 6, 12].every((n) => !/credit/i.test(S.remainingCopy(n))));

// ── 7. Targets, calendar, and encouragement ─────────────────────────────────
section('Goals, calendar and copy');

{
  const t = S.targetProgress(10, 30);
  eq('progress toward an unreached target uses that target', t.target, 30);
  eq('...and reports the gap', t.remaining, 20);
  const passed30 = S.targetProgress(30, 30);
  assert('a reached target rolls up to the next rung rather than pinning at 100%',
    passed30.target > 30 && passed30.surpassed);
  assert('...and remembers what the student originally chose', passed30.original === 30);
  assert('a target beyond the preset list still produces a finite next rung',
    Number.isFinite(S.targetProgress(400, 365).target));
  eq('a user with no target set gets the default', S.streakTargetFor(null), S.DEFAULT_STREAK_TARGET);
  eq('a nonsense target falls back to the default', S.streakTargetFor({ streakTarget: -3 }), S.DEFAULT_STREAK_TARGET);
}
{
  const grid = S.buildMonthGrid(new Date(2026, 7, 1), { today: new Date(2026, 7, 12) });
  eq('a month grid is always 6 rows of 7', grid.length, 42);
  eq('...starting on a Monday', grid[0].date.getDay(), 1);
  assert('days after today are marked future and are not clickable state',
    grid.filter((c) => c.key > '2026-08-12').every((c) => c.future));
  assert('today is marked exactly once', grid.filter((c) => c.isToday).length === 1);
  const withData = S.buildMonthGrid(new Date(2026, 7, 1), {
    today: new Date(2026, 7, 12),
    activity: new Map([['2026-08-03', { credits: 4, met: 1, goalCredits: 4, counts: { lesson_verified: 1 } }]]),
  });
  const cell = withData.find((c) => c.key === '2026-08-03');
  assert('an earned day carries its credits and its breakdown into the calendar',
    cell.met && cell.credits === 4 && cell.counts.lesson_verified === 1);
  const summary = S.monthSummary(withData);
  assert('the month summary counts only elapsed in-month days',
    summary.met === 1 && summary.elapsed === 12);
}
{
  // Copy must never contradict state — the two cases that would be worst.
  const undone = S.encouragement({ streak: 5, justMet: false });
  assert('an unfinished day is not congratulated for finishing', /finish|goal/i.test(undone));
  const perfect = S.encouragement({ streak: 7, justMet: true, week: { complete: true, stillPossible: true, remaining: 0 } });
  assert('a completed perfect week is named as one', /perfect week/i.test(perfect));
  assert('a milestone outranks everything else in the moment',
    S.encouragement({ streak: 30, justMet: true, milestone: S.STREAK_REWARDS.find((r) => r.days === 30) }).startsWith('30-day streak'));
  assert('every encouragement branch returns a real sentence',
    [{}, { streak: 1, justMet: true }, { streak: 9, justMet: true }].every((s) => S.encouragement(s).length > 12));
  const urgent = S.pathwayEncouragement({ streak: 6, day: S.dayStatus(0, 4) });
  assert('an at-risk streak mid-pathway is urgent and names the streak',
    urgent.tone === 'urgent' && /6-day/.test(urgent.text));
  const done = S.pathwayEncouragement({ streak: 6, day: S.dayStatus(4, 4), remainingLessons: 1 });
  assert('a finished day still points at the next thing, never at stopping',
    /left|gain|Perfect/i.test(done.text));
}

// ── 8. Every surface is wired ───────────────────────────────────────────────
section('The tab exists, has a URL, and travels between devices');

assert("'streak' is a real Progress sub-view id", SUBVIEWS.progress.ids.includes('streak'));
assert('...and PROGRESS_SUBNAV renders it', /\{id:'streak',ic:Flame,label:'Streak'/.test(app));
assert('...and App.jsx actually mounts the panel for it',
  /progressView==='streak'&&\(?\s*<StreakPanel/.test(app));
assert('Home carries the streak card', /<StreakHomeCard/.test(app));
assert('the pathway carries the mid-session encouragement strip', /<PathwayStreakStrip/.test(app));
assert('the lesson-complete takeover is mounted at the app root, not inside a tab',
  app.indexOf('<LessonCompleteOverlay') > app.indexOf('const tRenders='));
assert('the takeover is opened when a lesson is verified', /setLessonCelebration\(\{/.test(app));

for (const table of ['dayActivity', 'streakRewards']) {
  assert(`${table} is created by a schema version`, new RegExp(`${table}:\\s*'`).test(db));
  assert(`${table} is included in the cross-device snapshot`,
    new RegExp(`${table}:\\s*${table}\\.map`).test(db));
  assert(`${table} is merged back on the receiving device`,
    new RegExp(`remote\\.${table}`).test(db));
  assert(`${table} is cleared on a full account reset`,
    new RegExp(`db\\.${table}\\.clear\\(\\)`).test(db));
}
assert('day credits ADD across devices rather than overwriting',
  /credits:\s*\(l\.credits\s*\|\|\s*0\)\s*\+\s*\(r\.credits\s*\|\|\s*0\)/.test(db),
  'a Math.max merge would throw away a real day of work done on the other device');
assert('a day either device considered earned stays earned after a merge',
  /met:\s*\(l\.met\s*\|\|\s*r\.met\)/.test(db));
assert('the v17 upgrade carries pre-existing study days forward as earned days',
  /db\.version\(17\)[\s\S]{0,1400}?upgrade\([\s\S]{0,600}?studyDays/.test(db),
  'without this, every existing student wakes up to a streak of 0');

// ── 9. Leagues ──────────────────────────────────────────────────────────────
section('The league is derived from the streak and pays what it says');

assert('the ladder climbs', S.STREAK_LEAGUES.every((l, i) => i === 0 || l.min > S.STREAK_LEAGUES[i - 1].min));
assert('the XP bonus climbs with it', S.STREAK_LEAGUES.every((l, i) => i === 0 || l.xpBonus >= S.STREAK_LEAGUES[i - 1].xpBonus));
assert('so does the freeze cap', S.STREAK_LEAGUES.every((l, i) => i === 0 || l.freezeCap >= S.STREAK_LEAGUES[i - 1].freezeCap));
assert('every league says what it is and what it is worth',
  S.STREAK_LEAGUES.every((l) => l.label && l.blurb?.length > 20 && l.icon && l.color && l.freezeCap >= 1));
eq('the bottom league starts at zero', S.STREAK_LEAGUES[0].min, 0);
eq('a zero streak is still in a league', S.leagueFor(0).id, S.STREAK_LEAGUES[0].id);
assert('the top bonus is capped at something sane',
  S.STREAK_LEAGUES[S.STREAK_LEAGUES.length - 1].xpBonus <= 0.25,
  'past a quarter, breaking a long streak costs so much earning power that ignoring XP becomes rational');
eq('a nonsense streak falls back rather than crashing', S.leagueFor(null).id, S.STREAK_LEAGUES[0].id);
eq('the top league has nothing above it', S.nextLeague(100000), null);
for (const l of S.STREAK_LEAGUES) {
  eq(`a streak of exactly ${l.min} is already ${l.label}`, S.leagueFor(l.min).id, l.id);
  eq(`...and one day short of it is not`, S.leagueFor(l.min - 1).id === l.id, l.min === 0);
  eq(`freezeCapFor(${l.min}) agrees with the league`, S.freezeCapFor(l.min), l.freezeCap);
  eq(`the multiplier for ${l.label} is 1 + its bonus`, S.streakXPMultiplier(l.min), 1 + l.xpBonus);
}
{
  const p = S.leagueProgress(0);
  assert('a fresh streak has somewhere to climb to', !!p.next && p.remaining === p.next.min);
  assert('...and a bar that starts empty', p.pct === 0);
  const top = S.leagueProgress(100000);
  assert('the top of the ladder reports itself as promoted', top.promoted && top.pct === 100 && top.next === null);
  assert('a streak with no bonus says so rather than showing +0%', S.streakBonusLabel(0) === null);
  assert('a streak with a bonus states it as a percentage', /^\+\d+% XP$/.test(S.streakBonusLabel(30)));
}

section('Boosts multiply, expire, and never silently apply');
{
  const now = Date.now();
  const live = { kind: 'double', expiresAt: now + 3600000 };
  const dead = { kind: 'triple', expiresAt: now - 1000 };
  eq('an expired boost multiplies nothing', S.boostMultiplier([dead], now), 1);
  eq('a live boost multiplies by its kind', S.boostMultiplier([live], now), 2);
  eq('two live boosts stack multiplicatively',
    S.boostMultiplier([live, { kind: 'surge', expiresAt: now + 1000 }], now), 3);
  eq('no boosts is no multiplier', S.boostMultiplier([], now), 1);
  eq('expired boosts are filtered out of the live list', S.activeBoosts([live, dead], now).length, 1);
  assert('...soonest to expire first',
    S.activeBoosts([{ kind: 'surge', expiresAt: now + 9e6 }, live], now)[0].kind === 'double');
  assert('every boost kind is a real, positive multiplier',
    Object.values(S.BOOST_KINDS).every((b) => b.multiplier > 1 && b.hours > 0 && b.label && b.blurb));

  const m = S.xpMultiplier({ streak: 30, boosts: [live], now });
  eq('the total is league × boost', Math.round(m.total * 1000), Math.round(1.12 * 2 * 1000));
  assert('...and both halves are reported separately so a surface can explain the number',
    m.leagueLabel && m.boostLabel && m.any);
  assert('a plain student has no multiplier and says so', !S.xpMultiplier({ streak: 0, boosts: [] }).any);
  assert('a countdown is human-readable', /left$/.test(S.boostCountdown(90 * 60000)));
}

section('The freeze economy is priced, capped, and explains itself');
{
  eq('the first freeze costs the base price', S.freezeCost(0), S.FREEZE_BASE_COST);
  assert('each one after costs more', S.freezeCost(1) > S.freezeCost(0) && S.freezeCost(2) > S.freezeCost(1),
    'stockpiling should be possible and expensive — nobody may simply buy immunity from showing up');
  const rich = S.canBuyFreeze({ streak: 30, held: 0, xp: 999999 });
  assert('a student who can afford one is told so', rich.ok && /costs/i.test(rich.reason));
  const capped = S.canBuyFreeze({ streak: 0, held: 1, xp: 999999 });
  assert('a capped student is refused', !capped.ok);
  assert('...and told how to raise the cap rather than just being disabled',
    /reach|maximum/i.test(capped.reason), capped.reason);
  const broke = S.canBuyFreeze({ streak: 30, held: 0, xp: 0 });
  assert('a student who cannot afford one is told the gap', !broke.ok && /more XP/.test(broke.reason));
}

// ── 10. Repair ──────────────────────────────────────────────────────────────
section('A repair buys continuity, never credit');

assert('a repair is priced against what was lost',
  S.repairCost(60) > S.repairCost(5), `${S.repairCost(5)} vs ${S.repairCost(60)}`);
assert('...and capped, so a very long streak is not unpurchasable',
  S.repairCost(100000) === S.REPAIR_MAX_COST);
eq('there is nothing to repair when today is already earned',
  S.repairOffer(new Set(keysBack(5)), { xp: 99999 }), null);
eq('...nor when yesterday was, because today is still open',
  S.repairOffer(new Set(keysBack(5, daysAgo(1))), { xp: 99999 }), null);
{
  // A ten-day run that ended two days ago.
  const met = new Set(keysBack(10, daysAgo(2)));
  const offer = S.repairOffer(met, { xp: 99999 });
  assert('a genuinely broken recent streak is offered a repair', !!offer);
  eq('...knowing what was lost', offer.lost, 10);
  eq('...and how many days it has to bridge', offer.missedDays, 1);
  eq('...and exactly which ones', offer.dates.length, 1);
  eq('...bridging the day that was actually missed', offer.dates[0], key(daysAgo(1)));
  assert('today is never counted as missed — it is still open',
    !offer.dates.includes(key(daysAgo(0))));
  assert('...and it names the number in its headline', /10-day/.test(offer.headline));
  assert('...and is available to somebody who can pay', offer.available);
  assert('a student who cannot pay is offered it but cannot take it',
    S.repairOffer(met, { xp: 0 })?.available === false);
  assert('a student inside the cooldown cannot take it either',
    S.repairOffer(met, { xp: 99999, lastRepairAt: Date.now() - 86400000 })?.available === false);
  assert('...and is told when they can', !!S.repairOffer(met, { xp: 99999, lastRepairAt: Date.now() - 86400000 })?.nextAvailableAt);
}
eq('a streak abandoned long ago is a fresh start, not a repair',
  S.repairOffer(new Set(keysBack(10, daysAgo(30))), { xp: 99999 }), null);
eq('a one-day streak is not worth buying back',
  S.repairOffer(new Set([key(daysAgo(2))]), { xp: 99999 }), null);
{
  // THE safety property: a bridged day is not an earned day, anywhere.
  const monday = S.startOfWeek(new Date());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return key(d);
  });
  const six = new Set(week.slice(1));
  const repaired = S.weekProgress(six, { date: monday, bridged: new Set([week[0]]) });
  assert('a repaired day cannot complete a Perfect Week', !repaired.complete);
  const monthMet = new Set();
  const now = new Date();
  for (let d = 1; d <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); d += 1) {
    if (d !== 2) monthMet.add(key(new Date(now.getFullYear(), now.getMonth(), d)));
  }
  const repairedMonth = S.monthProgress(monthMet, { date: now, bridged: new Set([key(new Date(now.getFullYear(), now.getMonth(), 2))]) });
  assert('...nor a Perfect Month', !repairedMonth.complete);
  assert('...but it does hold the streak together',
    S.computeStreak(new Set([key(daysAgo(0)), key(daysAgo(2))]), { bridged: new Set([key(daysAgo(1))]) }) === 3);
}
assert('the repair ledger key is dated, so the cooldown is per account not per device',
  /^repair:\d{4}-\d{2}-\d{2}$/.test(S.repairKey('2026-08-12')));
assert('db.js writes a repaired day as a spent freeze, not as an earned day',
  /source: 'repair'/.test(db) && /usedOn: date/.test(db),
  'anything else would sell a student credit for work they did not do');
assert('...and gates the whole repair on the ledger row landing first',
  /streakRewards\.add\(\{ key: repairKey\(today\)/.test(db),
  'two tabs must not be able to double-bridge the same gap');

section('The Perfect Month is a real month');
{
  const now = new Date();
  const all = new Set();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= dim; d += 1) all.add(key(new Date(now.getFullYear(), now.getMonth(), d)));
  const full = S.monthProgress(all, { date: now });
  assert('every day of the month completes it', full.complete && full.met === dim);
  const empty = S.monthProgress(new Set(), { date: now });
  assert('a missed elapsed day closes it out', !empty.stillPossible || now.getDate() === 1);
  eq('the month key is year-month', S.monthKeyOf(new Date(2026, 7, 12)), '2026-08');
  // The bar is measured against ELAPSED days, not the whole month.
  const soFar = new Set();
  for (let d = 1; d <= now.getDate(); d += 1) soFar.add(key(new Date(now.getFullYear(), now.getMonth(), d)));
  eq('a flawless month-so-far reads as 100%, not as a fraction of the whole month',
    S.monthProgress(soFar, { date: now }).pct, 100);
  assert('...and is still winnable', S.monthProgress(soFar, { date: now }).stillPossible);
  assert('the month reward is worth more than the week reward',
    S.PERFECT_MONTH_REWARD.xp > S.PERFECT_WEEK_REWARD.xp);
}

// ── 11. The check-in ladder ─────────────────────────────────────────────────
section('The check-in calendar rewards turning up, and forgives');

eq('the cycle is 28 days', CHECKIN.CHECKIN_DAYS.length, CHECKIN.CYCLE_LENGTH);
assert('every day is numbered in order',
  CHECKIN.CHECKIN_DAYS.every((d, i) => d.day === i + 1));
assert('every day pays something', CHECKIN.CHECKIN_DAYS.every((d) => d.xp > 0));
assert('the big days are a minority — that is what makes them big',
  CHECKIN.MILESTONE_DAYS.length >= 6 && CHECKIN.MILESTONE_DAYS.length <= CHECKIN.CYCLE_LENGTH / 2,
  `${CHECKIN.MILESTONE_DAYS.length} of ${CHECKIN.CYCLE_LENGTH}`);
assert('every milestone day says what it gives',
  CHECKIN.CHECKIN_DAYS.filter((d) => CHECKIN.isMilestoneDay(d.day)).every((d) => d.label && d.blurb?.length > 15));
assert('the last day is the biggest',
  CHECKIN.CHECKIN_DAYS[27].xp === Math.max(...CHECKIN.CHECKIN_DAYS.map((d) => d.xp)));
assert('every boost a day names is a real boost kind',
  CHECKIN.CHECKIN_DAYS.filter((d) => d.boost).every((d) => !!S.BOOST_KINDS[d.boost]));
assert('a milestone is never more than a week away from any day',
  CHECKIN.CHECKIN_DAYS.every((d) => {
    const next = CHECKIN.nextMilestone(d.day);
    return !next || next.inDays <= 7;
  }),
  'the distance to the next real reward is the mechanic; a fortnight-long gap in it is a fortnight nobody looks');
eq('past the last milestone there is nothing to promise', CHECKIN.nextMilestone(28), null);
assert('a reward summary always leads with the thing worth changing an evening for',
  /chest/.test(CHECKIN.rewardSummary(CHECKIN.getCheckinReward(7))));
assert('an ordinary day summarises as its XP', /^\+\d+ XP$/.test(CHECKIN.rewardSummary(CHECKIN.getCheckinReward(1))));
assert('the cycle survives a short gap rather than resetting',
  CHECKIN.GRACE_DAYS >= 1,
  'a ladder that resets on the first miss is one most students only ever see the bottom of');
{
  const cycle = CHECKIN.buildCycle({ currentDay: 12, claimedToday: false });
  eq('the calendar is drawn in full, always', cycle.tiles.length, CHECKIN.CYCLE_LENGTH);
  eq('...with today marked exactly once', cycle.tiles.filter((t) => t.state === 'today').length, 1);
  assert('...everything before it claimed', cycle.tiles.slice(0, 11).every((t) => t.state === 'claimed'));
  assert('...and everything after it visible in advance',
    cycle.tiles.slice(12).every((t) => t.state === 'upcoming'),
    'seeing that day 14 is a chest is the entire reason the whole cycle is drawn');
  assert('the next milestone is named', !!cycle.next && cycle.next.day > 12);
}
{
  // Scoped to the handler's own body: turning up is not studying, so nothing in the check-in
  // path may credit a streak day. A check-in that moved the streak would undo the whole rewrite.
  const start = app.indexOf('const claimTodayCheckin');
  const body = app.slice(start, app.indexOf('\n  // Load the cycle once the database is open', start));
  assert('the check-in handler exists', start !== -1 && body.length > 200);
  assert('...and never credits a streak day',
    !/creditStreak\(|recordStreakActivity\(/.test(body));
  assert('...but it does grant the day\'s freeze and boost when the calendar says so',
    /grantStreakFreeze\(/.test(body) && /grantBoost\(/.test(body));
}
assert('the check-in XP still goes through the idempotent outbox',
  /claimRewardXP\(`checkin:\$\{localDateStr\(\)\}`/.test(app));

section('The expansion is wired into the app');
assert('XP awards are scaled by the league and any live boost',
  /const awardBoostedXP\s*=\s*useCallback/.test(app) && /xpMultRef\.current/.test(app));
assert('...at every award site, with none left on the raw roll',
  (app.match(/(?<![A-Za-z])awardXP\(/g) || []).length === 1,
  'exactly one raw roll is correct — the one inside awardBoostedXP. Any other call site pays a long-streak student less than the card promised');
assert('...and there are real award sites using the wrapper',
  (app.match(/awardBoostedXP\(/g) || []).length >= 5);
assert('milestone payouts are still deterministic, never boosted',
  /Milestone\/perfect-week XP is deterministic on purpose/.test(app));
assert('freeze grants are capped by the league rather than by a constant',
  /grantStreakFreeze\(\{ ?streak/.test(app) && /freezeCapFor/.test(db));
assert('the freeze purchase debits XP before granting, and refunds on refusal',
  /const buyFreeze\s*=\s*useCallback/.test(app) && /refund — the cap was reached elsewhere/.test(app));
assert('the repair debits XP before bridging, and refunds on refusal',
  /const doStreakRepair\s*=\s*useCallback/.test(app) && /refund — another device repaired first/.test(app));
assert('the Streak tab carries the repair offer, the freeze card and the check-in calendar',
  /repair=\{streakRepair\}/.test(app) && /freezeHistory=\{freezeHistory\}/.test(app) && /checkin=\{checkinState\}/.test(app));
assert('a live boost is visible in the header rather than applied silently',
  (app.match(/<BoostChip/g) || []).length >= 2);

for (const table of ['boosts']) {
  assert(`${table} is created by a schema version`, new RegExp(`${table}:\\s*'`).test(db));
  assert(`${table} is included in the cross-device snapshot`, new RegExp(`${table}: ${table}`).test(db));
  assert(`${table} is merged back on the receiving device`, new RegExp(`remote\\.${table}`).test(db));
  assert(`${table} is cleared on a full account reset`, new RegExp(`db\\.${table}\\.clear\\(\\)`).test(db));
}
assert('an expired boost is never resurrected by a stale snapshot',
  /if \(\(r\.expiresAt \|\| 0\) <= now\) continue;/.test(db));

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Streak system verified.');
