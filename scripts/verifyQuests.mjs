#!/usr/bin/env node
/**
 * Guards the promises the quest system makes — all of which fail silently if broken.
 *
 *   1. THE TWO CATALOGS AGREE. The client renders from src/data/questCatalog.js; the server
 *      decides what gets written and what gets paid from api/_lib/questCatalog.js. If they drift,
 *      a card advertises one thing and the row stores another, and nobody finds out until a
 *      student claims 200 XP for a quest whose card said 2,000.
 *   2. A QUEST CANNOT BE CRAMMED. The daily cap is the whole anti-cramming mechanism. A catalog
 *      entry whose cap × window makes the target reachable in a day is a quest that lied.
 *   3. THE ENGINE MATHS IS RIGHT. Caps applied per LOCAL day, windows exclusive at both ends,
 *      the active-day floor gating completion independently of the target.
 *   4. XP IS NEVER CLIENT-CHOSEN. No numeric column of student_quests may come off a request
 *      body, and the claim path must route through the idempotent reward-claim outbox.
 *   5. A PARENT CANNOT INSTRUCT. Declining is storable, assignment is capped, and only the
 *      student can move a quest's progress or status.
 *   6. EVERY SURFACE IS WIRED. The board, the Home card, four strips, the takeover, the nav
 *      badge, both routes.
 *
 * Run by `npm run verify:quests` (and by `npm run build`).
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

const CAT = await load('src/data/questCatalog.js');
const Q = await load('src/lib/quests.js');
const SERVER = await load('api/_lib/questCatalog.js');
const { SUBVIEWS, PARENT_VIEWS } = await load('src/lib/routes.js');

const app = read('src/App.jsx');
const handler = read('api/parent/quests.js');
const migration = read('supabase/migrations/0014_quests.sql');
const db = read('src/lib/db.js');
const parentApp = read('src/components/parent/ParentApp.jsx');

// ── 1. The two catalogs agree ───────────────────────────────────────────────
section('The client catalog and the server catalog are the same catalog');

const clientIds = CAT.QUESTS.map((q) => q.id).sort();
const serverIds = SERVER.QUEST_IDS.slice().sort();
assert('every quest exists on both sides',
  JSON.stringify(clientIds) === JSON.stringify(serverIds),
  `client-only: ${clientIds.filter((i) => !serverIds.includes(i))}; server-only: ${serverIds.filter((i) => !clientIds.includes(i))}`);

for (const quest of CAT.QUESTS) {
  const spec = SERVER.QUEST_SPECS[quest.id];
  if (!spec) continue;
  for (const field of ['title', 'tier', 'metric', 'target', 'windowDays', 'dailyCap', 'minActiveDays']) {
    eq(`${quest.id}.${field} matches the server`, spec[field], quest[field]);
  }
  eq(`${quest.id} pays the same XP on both sides`, SERVER.TIER_XP[quest.tier], CAT.questXP(quest));
  eq(`${quest.id} reports the same minimum length`, SERVER.minimumDays(quest.id), Q.minimumDays({ questId: quest.id }));
}

for (const tier of Object.keys(CAT.QUEST_TIERS)) {
  eq(`tier ${tier} is priced the same on both sides`, SERVER.TIER_XP[tier], CAT.QUEST_TIERS[tier].xp);
}

// ── 2. Catalog sanity: a quest cannot be crammed ────────────────────────────
section('Every quest is a commitment, not an evening');

for (const quest of CAT.QUESTS) {
  const minDays = Q.minimumDays({ questId: quest.id });
  assert(`${quest.id} takes more than one day`, minDays >= 3,
    `daily cap ${quest.dailyCap} × target ${quest.target} makes it finishable in ${minDays} day(s)`);
  assert(`${quest.id} fits inside its own window`, minDays <= quest.windowDays,
    `needs ${minDays} days but the window is ${quest.windowDays}`);
  assert(`${quest.id} names a real metric`, !!CAT.QUEST_METRICS[quest.metric], quest.metric);
  assert(`${quest.id} names a real category`, !!CAT.QUEST_CATEGORIES[quest.category], quest.category);
  assert(`${quest.id} names a real tier`, !!CAT.QUEST_TIERS[quest.tier], quest.tier);
  assert(`${quest.id} has a destination the app can navigate to`, !!Q.QUEST_DESTINATIONS[quest.metric]);
  assert(`${quest.id} carries parent-facing rationale`, !!quest.why && quest.why.length > 30);
  assert(`${quest.id} says what counts`, !!quest.proof && quest.proof.length > 20);
  assert(`${quest.id} appears on at least one surface`, (quest.surfaces || []).length > 0);
}

assert('quest ids are unique', new Set(clientIds).size === clientIds.length);
assert('every tier is actually used by some quest',
  Object.keys(CAT.QUEST_TIERS).every((t) => CAT.QUESTS.some((q) => q.tier === t)));
assert('the top tier pays more than anything else in the app',
  CAT.QUEST_TIERS.legendary.xp >= 2000,
  'the pitch on every quest surface is "the largest reward in the app" — this is that promise');

// Every metric a quest names must actually be produced by buildQuestEvents, or the quest can
// never progress. Checked against the source rather than by running it, because several metrics
// only appear for data shapes a fixture would have to invent.
{
  const src = read('src/lib/quests.js');
  const produced = new Set([...src.matchAll(/push\('([a-z_]+)'/g)].map((m) => m[1]));
  for (const metric of new Set(CAT.QUESTS.map((q) => q.metric))) {
    assert(`buildQuestEvents actually produces '${metric}'`, produced.has(metric),
      'a quest on a metric nothing emits is a progress bar that never moves');
  }
}

// ── 3. The engine maths ─────────────────────────────────────────────────────
section('The engine counts what it says it counts');

const DAY = 24 * 60 * 60 * 1000;
// Local noon of N days ago, so fixtures land unambiguously inside one calendar day.
const noonAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime() - n * DAY; };
const ev = (type, at, value = 1) => ({ type, at, value });

{
  // A quest asking for 10, capped at 2/day, needing 5 days.
  const row = {
    questId: 'unit_test', title: 'T', xp: 500, metric: 'quiz_completed',
    target: 10, windowDays: 14, dailyCap: 2, minActiveDays: 5,
    startedAt: noonAgo(6), dueAt: noonAgo(6) + 14 * DAY, status: 'active',
  };

  // Ten events all on one day: the cap must credit two.
  const crammed = Array.from({ length: 10 }, () => ev('quiz_completed', noonAgo(1)));
  const r1 = Q.evaluate(row, crammed);
  eq('a day contributes at most its cap', r1.progress, 2);
  eq('...and counts as exactly one active day', r1.activeDays, 1);
  assert('...and does not complete the quest', !r1.done);
  assert('...and the capped day is flagged so the UI can explain it', r1.byDay[0].capped);

  // Two a day across five days: target not met, floor met.
  const spread = [1, 2, 3, 4, 5].flatMap((d) => [ev('quiz_completed', noonAgo(d)), ev('quiz_completed', noonAgo(d))]);
  const r2 = Q.evaluate(row, spread);
  eq('spread work accrues at the cap', r2.progress, 10);
  eq('...across the right number of days', r2.activeDays, 5);
  assert('...and completes when both the target and the day floor are met', r2.done);

  // The floor gates completion on its own.
  const floored = Q.evaluate({ ...row, minActiveDays: 6 }, spread);
  eq('hitting the target still leaves progress at target', floored.progress, 10);
  assert('...but the quest is NOT done while days are still owed', !floored.done,
    'without this the daily cap and the whole anti-cramming design are decorative');

  // The wrong metric never counts.
  const wrong = Q.evaluate(row, [ev('flashcard_review', noonAgo(1)), ev('sat_question', noonAgo(2))]);
  eq('another metric contributes nothing', wrong.progress, 0);

  // Work before the quest started never counts.
  const early = Q.evaluate(row, [ev('quiz_completed', noonAgo(30))]);
  eq('work from before the start is not backdated in', early.progress, 0);

  // Work after the deadline never counts.
  const lapsed = { ...row, startedAt: noonAgo(30), dueAt: noonAgo(20) };
  const late = Q.evaluate(lapsed, [ev('quiz_completed', noonAgo(2))]);
  eq('work after the deadline does not rescue an expired quest', late.progress, 0);
  eq('...and the state says so', late.state, 'expired');

  // Out of runway: 8 owed, cap 2, one day left.
  const stuck = { ...row, startedAt: noonAgo(13), dueAt: noonAgo(13) + 14 * DAY };
  const r3 = Q.evaluate(stuck, [ev('quiz_completed', noonAgo(5)), ev('quiz_completed', noonAgo(4))]);
  eq('a quest that can no longer be finished says so rather than saying "behind"', r3.state, 'lost');

  // The parent's path: no evidence, read the reported figures off the row.
  const reported = Q.evaluate({ ...row, progress: 7, activeDays: 4 }, null);
  eq('with events=null the engine reads reported progress', reported.progress, 7);
  eq('...and reported active days', reported.activeDays, 4);
  assert('...and marks the result as reported rather than derived', reported.reportedOnly);
  eq('an empty event list is NOT the same as null', Q.evaluate({ ...row, progress: 7 }, []).progress, 0);
}

{
  // Progress never exceeds the target, and pct never exceeds 100.
  const row = {
    questId: 'x', metric: 'flashcard_review', target: 5, windowDays: 7, dailyCap: 100,
    minActiveDays: 0, startedAt: noonAgo(2), dueAt: noonAgo(2) + 7 * DAY, xp: 200,
  };
  const r = Q.evaluate(row, Array.from({ length: 50 }, () => ev('flashcard_review', noonAgo(1))));
  eq('progress is clamped to the target', r.progress, 5);
  eq('percentage is clamped to 100', r.pct, 100);
}

{
  // Ordering: claimable first, then urgency.
  const base = { metric: 'quiz_completed', target: 2, windowDays: 10, dailyCap: 1, minActiveDays: 0, xp: 200, status: 'active' };
  const done = { ...base, id: 'a', questId: 'a', startedAt: noonAgo(5), dueAt: noonAgo(5) + 10 * DAY };
  const fresh = { ...base, id: 'b', questId: 'b', startedAt: noonAgo(1), dueAt: noonAgo(1) + 10 * DAY };
  const rows = Q.evaluateAll([fresh, done], [ev('quiz_completed', noonAgo(4)), ev('quiz_completed', noonAgo(3))]);
  eq('a claimable quest sorts to the front', rows[0].assignment.id, 'a');
  const stats = Q.summarize(rows);
  eq('...and is counted as claimable', stats.claimable, 1);
  eq('...with its XP on the table', stats.xpOnTable, 200);

  // Terminal rows never appear on a board.
  eq('claimed/declined/expired quests are not "running"',
    Q.evaluateAll([{ ...done, status: 'claimed' }, { ...fresh, status: 'declined' }], []).length, 0);
}

{
  // featuredFor biases to the surface being looked at, but a claimable quest wins anywhere.
  const mk = (id, questId, startedAt) => ({ id, questId, ...CAT.QUEST_BY_ID[questId], startedAt, dueAt: startedAt + CAT.QUEST_BY_ID[questId].windowDays * DAY, status: 'active', xp: CAT.questXP(CAT.QUEST_BY_ID[questId]) });
  const rows = Q.evaluateAll([mk('1', 'sat_first_hundred', noonAgo(1)), mk('2', 'flash_fortnight', noonAgo(1))], []);
  eq('the SAT tab is offered the SAT quest', Q.featuredFor(rows, 'sat').assignment.questId, 'sat_first_hundred');
  eq('the Prep tab is offered the card quest', Q.featuredFor(rows, 'prep').assignment.questId, 'flash_fortnight');
  assert('with no rows there is nothing to feature', Q.featuredFor([], 'prep') === null);
}

{
  // Headlines are always forward-facing and never empty.
  for (const state of ['done', 'expired', 'lost', 'urgent', 'ahead', 'behind', 'on_track']) {
    const fake = {
      state, progress: 3, target: 10, remaining: 7, daysLeft: 4, daysStillNeeded: 7,
      perDayNeeded: 2, activeDays: 2, daysMet: true, spec: { metric: 'quiz_completed', minActiveDays: 0 },
    };
    const line = Q.questHeadline(fake);
    assert(`the '${state}' headline says something`, typeof line === 'string' && line.length > 8, line);
    assert(`the '${state}' state has a tone`, !!Q.QUEST_TONES[state]);
  }
}

{
  // Recommendations: explainable, never duplicated, never something already running.
  const recs = Q.recommendQuests({}, []);
  assert('a brand-new student gets a starter recommendation', recs.length > 0);
  assert('...beginning with the gentlest one', recs[0].id === 'consist_first_week');
  for (const r of recs) {
    assert(`recommendation ${r.id} exists in the catalog`, !!CAT.QUEST_BY_ID[r.id]);
    assert(`recommendation ${r.id} says why`, !!r.reason && r.reason.length > 25);
  }
  eq('recommendations are never duplicated', new Set(recs.map((r) => r.id)).size, recs.length);
  const withActive = Q.recommendQuests({}, ['consist_first_week']);
  assert('a running quest is never recommended again', !withActive.some((r) => r.id === 'consist_first_week'));
  // A student close to a test date must be told about the test.
  // An engaged student (they are showing up — otherwise "fix consistency first" correctly wins)
  // with a real test date in front of them.
  const examSoon = Q.recommendQuests({
    daysToExam: 45, lessonsVerified: 30, quizzesTaken: 20, activeDaysLast7: 5, activeDaysLast28: 16,
  }, []);
  assert('an imminent test date drives the SAT recommendation to the top',
    ['sat_legend', 'sat_three_tests'].includes(examSoon[0].id), examSoon[0]?.id);
}

// ── 4. XP is never client-chosen ────────────────────────────────────────────
section('Nothing a client sends can become a reward');

assert('the handler looks numbers up from the server catalog',
  /assignableSpec\(questId\)/.test(handler));
assert('...and refuses an unknown quest id outright',
  /isKnownQuest\(questId\)/.test(handler) && /unknown_quest/.test(handler));
for (const field of ['xp', 'target', 'window_days', 'daily_cap', 'min_active_days']) {
  assert(`no ${field} is read off the request body`,
    !new RegExp(`${field}\\s*:\\s*(Number\\()?body\\.`).test(handler),
    'a numeric column sourced from a request is a client that can price its own reward');
}
assert('the insert spreads the server spec rather than the body',
  /\.insert\(\{\s*\n?\s*\.\.\.spec,/.test(handler));
assert('the claim returns the row\'s stored XP, not a requested amount',
  /xp:\s*data\.xp/.test(handler));
assert('the claim re-checks completion rather than trusting the status column',
  /meetsCompletion\(row\)/.test(handler));
assert('the claim can only move a row out of "completed"',
  /\.eq\('status',\s*'completed'\)/.test(handler),
  'without this, two devices tapping Claim both read as a success');
assert('the app routes quest XP through the idempotent reward-claim outbox',
  /claimRewardXP\(`quest:assigned:\$\{quest\.id\}`/.test(app),
  'anything else pays a milestone twice the first time two devices are online at once');
assert('...using the XP the server returned',
  /const \{ quest, xp \} = await QuestAPI\.claim/.test(app));
assert('the migration caps XP in the schema as well as in the handler',
  /xp\s+integer not null check \(xp between 0 and \d+\)/.test(migration));

// ── 5. A parent may ask, never instruct ─────────────────────────────────────
section('A parent can ask; only the student answers');

assert('"declined" is a storable outcome, not an absence',
  /status[\s\S]{0,200}'declined'/.test(migration));
assert('a parent cannot PATCH a quest at all',
  /role !== 'student'[\s\S]{0,400}Only the student can update a quest/.test(handler));
assert('a student cannot assign a quest to somebody else',
  /You can only take on your own quests/.test(handler));
assert('a parent must hold an active link to assign',
  /getActiveLink\(supabase, \{ parentUserId: user\.id, studentUserId: studentId \}\)/.test(handler));
assert('the number of quests a parent may set is capped below the total',
  /MAX_PARENT_ACTIVE = 3/.test(handler) && /MAX_ACTIVE = 5/.test(handler));
assert('a student may decline, and only an assigned quest',
  /action === 'decline'/.test(handler) && /Drop your own quests instead of declining them/.test(handler));
assert('a parent withdrawing only ever touches their own assignments',
  /\.eq\('parent_user_id', user\.id\)/.test(handler));
assert('a student dropping only ever touches quests they set themselves',
  /\.eq\('assigned_by', 'self'\)/.test(handler));
assert('progress reports are monotonic',
  /Math\.max\(row\.progress, progress\)/.test(handler),
  'a device with less history must not be able to walk a quest backwards');
assert('a lapsed quest expires on read rather than lingering',
  /status: 'expired'/.test(handler) && /\.eq\('status', 'active'\)/.test(handler));
assert('a completed-but-unclaimed quest is never expired away',
  /\.eq\('status', 'active'\)\s*\n\s*\.lt\('due_at'/.test(handler),
  'losing earned XP to a missed tap reads as a betrayal, not a rule');

// ── Schema shape ────────────────────────────────────────────────────────────
section('The table stores a promise, not a lookup');

assert('the row snapshots the quest parameters', /window_days\s+integer not null/.test(migration));
assert('RLS is on and denies everything', /enable row level security/.test(migration) && /student_quests_deny_all/.test(migration));
assert('one live copy of a quest per student, enforced in the database',
  /create unique index if not exists student_quests_one_live_per_quest/.test(migration));
assert('...and the handler names that collision instead of 500-ing',
  /already_running/.test(handler));
assert('losing a parent link does not delete a student\'s work',
  /parent_user_id\s+uuid references app_users\(id\) on delete set null/.test(migration));

// ── 6. Every surface is wired ───────────────────────────────────────────────
section('Quests are everywhere they claim to be');

assert("'quests' is a real Progress sub-view id", SUBVIEWS.progress.ids.includes('quests'));
assert('...and PROGRESS_SUBNAV renders it', /\{id:'quests',ic:Swords,label:'Quests'/.test(app));
assert('...and App.jsx mounts the board for it', /progressView==='quests'&&\(?\s*<QuestBoard/.test(app));
assert('Home carries the quest card', /<QuestHomeCard/.test(app));
assert('the completion takeover is mounted at the app root, not inside a tab',
  app.indexOf('<QuestCompleteOverlay') > app.indexOf('const tRenders='));

for (const surface of ['prep', 'portfolio', 'plans']) {
  assert(`the ${surface} tab carries the quest strip`, new RegExp(`questStripFor\\('${surface}'`).test(app));
}
assert('the SAT tab carries the quest strip', /<QuestStrip\s*\n?\s*rows=\{questBoard\} surface="sat"/.test(app));
assert('the strip picks the quest earned on the screen being looked at',
  /surface=\{surface\}/.test(read('src/components/quests/QuestStrip.jsx')) || /featuredFor\(rows, surface\)/.test(read('src/components/quests/QuestStrip.jsx')));

assert('a claimable quest badges the nav from any tab',
  /questStats\.claimable>0\?questStats\.claimable:null/.test(app));
assert('...on both the sidebar and the mobile bar',
  (app.match(/questStats\.claimable>0\?questStats\.claimable:null/g) || []).length === 2);

assert('every quest surface reads ONE evaluation',
  (app.match(/const questBoard\s*=\s*useMemo/g) || []).length === 1,
  'two evaluations is two progress bars that can disagree about the same quest');
assert('progress is derived, never stored in React state',
  !/setQuestProgress|const \[questProgress/.test(app));

assert('the parent app has a quests tab', /\{ id: 'quests', label: 'Quests', icon: Swords \}/.test(parentApp));
assert('...with a URL', PARENT_VIEWS.quests === '/family/quests');
assert('...and it mounts the assignment panel', /view === 'quests'[\s\S]{0,160}<QuestAssignPanel/.test(parentApp));
assert("the parent's board reads reported figures rather than deriving zero",
  /evaluateAll\(live, null\)/.test(read('src/components/parent/QuestAssignPanel.jsx')),
  'a parent device holds none of the evidence — deriving would show every quest at 0%');

assert('the evidence read is a single consistent snapshot of the database',
  /export async function getQuestEvidence/.test(db));
assert('...bounded by the oldest running quest', /since > 0 \? db\.cardReviews/.test(db));
// Matches a Dexie TABLE NAME, not any occurrence of the word — `mmiSessions: '++id, questionIdx'`
// is an index called questionIdx and has nothing to do with quests.
assert('quests add no storage of their own',
  !/^\s*quest\w*\s*:\s*'/im.test(db),
  'a parallel telemetry table is how quest numbers drift away from the rest of the product');

assert('the client never throws a quest error into a study surface',
  /export async function list\(\)[\s\S]{0,400}catch \{\s*\n?\s*return \{ quests: \[\], available: false \};/.test(read('src/lib/questApi.js')));

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Quest system verified.');
