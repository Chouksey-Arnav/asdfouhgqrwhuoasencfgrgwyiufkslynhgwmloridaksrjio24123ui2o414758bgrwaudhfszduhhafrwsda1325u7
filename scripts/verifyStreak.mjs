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
assert('the ladder covers the long horizons the product promises (100 and 365)',
  S.STREAK_REWARDS.some((r) => r.days === 100) && S.STREAK_REWARDS.some((r) => r.days === 365));
eq('the next milestone above 0 is the first rung', S.nextMilestone(0).days, S.STREAK_REWARDS[0].days);
eq('past the top of the ladder there is no next rung', S.nextMilestone(9999), null);
eq('a 30-day streak has reached four rungs', S.reachedMilestones(30).length, 4);
{
  const claimed = new Set([S.rewardKey(3), S.rewardKey(7)]);
  const owed = S.unclaimedMilestones(30, claimed);
  eq('already-claimed rungs are never offered again', owed.length, 2);
  assert('...and the ones owed are the unclaimed ones', owed.every((r) => [14, 30].includes(r.days)));
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

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Streak system verified.');
