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
 *   7. THE DAILY SET IS DETERMINISTIC. Three quests a day, the same three on every device,
 *      unrerollable by a reload, and drawn only from things the student can actually do. A
 *      daily set that changes under somebody mid-session is a set nobody trusts.
 *   8. CHAINS ARE LADDERS, NOT GATES. Every chain names real quests, in ascending difficulty,
 *      and nothing in the catalog is unreachable.
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
const DCAT = await load('src/data/dailyQuestCatalog.js');
const D = await load('src/lib/dailyQuests.js');
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
  const wrong = Q.evaluate(row, [ev('flashcard_review', noonAgo(1)), ev('lesson_verified', noonAgo(2))]);
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
  const rows = Q.evaluateAll([mk('1', 'port_first_entries', noonAgo(1)), mk('2', 'flash_fortnight', noonAgo(1))], []);
  eq('the Portfolio tab is offered the record quest', Q.featuredFor(rows, 'portfolio').assignment.questId, 'port_first_entries');
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
  assert('...beginning with the gentlest one in the catalog', recs[0].id === 'consist_warmup',
    `got ${recs[0]?.id} — a first quest exists to be finished, so the five-day Warm-up must outrank the seven-day one`);
  for (const r of recs) {
    assert(`recommendation ${r.id} exists in the catalog`, !!CAT.QUEST_BY_ID[r.id]);
    assert(`recommendation ${r.id} says why`, !!r.reason && r.reason.length > 25);
  }
  eq('recommendations are never duplicated', new Set(recs.map((r) => r.id)).size, recs.length);
  const withActive = Q.recommendQuests({}, ['consist_first_week']);
  assert('a running quest is never recommended again', !withActive.some((r) => r.id === 'consist_first_week'));
  // The recommender no longer knows about test dates: the SAT pillar is sealed
  // for v1 (src/lib/betaFlags.js), so no quest it could recommend exists. A
  // `daysToExam` signal must therefore change nothing rather than crash or
  // silently resurrect an SAT quest.
  const engaged = { lessonsVerified: 30, quizzesTaken: 20, activeDaysLast7: 5, activeDaysLast28: 16 };
  const withExam = Q.recommendQuests({ ...engaged, daysToExam: 45 }, []);
  const withoutExam = Q.recommendQuests(engaged, []);
  eq('a test date signal changes nothing',
    withExam.map((r) => r.id).join(','), withoutExam.map((r) => r.id).join(','));
  assert('no SAT quest is ever recommended', !withExam.some((r) => r.id.startsWith('sat_')),
    withExam.map((r) => r.id).join(','));
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
// The SAT tab deliberately carries NO quest strip, plan strip or daily rail: it
// renders behind SatBetaCover (src/lib/betaFlags.js), so every one of those would
// be XP shown through frosted glass, offered for work the student cannot do.
assert('the SAT tab carries no quest strip', !/surface="sat"/.test(app),
  'a rail on a sealed tab advertises work nobody can do');
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

// ── 7. Chains are ladders, not gates ────────────────────────────────────────
section('Every chain is a real ladder');

for (const [id, chain] of Object.entries(CAT.QUEST_CHAINS)) {
  eq(`chain ${id} knows its own id`, chain.id, id);
  assert(`chain ${id} has a label and a reason to climb it`, !!chain.label && chain.blurb?.length > 20);
  assert(`chain ${id} is worth climbing (3+ rungs)`, chain.steps.length >= 3, `${chain.steps.length} rungs`);
  assert(`chain ${id} names only real quests`, chain.steps.every((s) => !!CAT.QUEST_BY_ID[s]),
    chain.steps.filter((s) => !CAT.QUEST_BY_ID[s]).join(', '));
  assert(`chain ${id} never repeats a rung`, new Set(chain.steps).size === chain.steps.length);
  // Ascending difficulty. A ladder whose third rung is easier than its second is not a ladder.
  const tiers = chain.steps.map((s) => CAT.tierRank(CAT.QUEST_BY_ID[s]?.tier));
  assert(`chain ${id} climbs in difficulty`, tiers.every((t, i) => i === 0 || t >= tiers[i - 1]),
    chain.steps.map((s, i) => `${s}=${CAT.QUEST_BY_ID[s]?.tier}`).join(' → '));
  // The back-reference has to agree, or a card says "step 2 of 5" about a different ladder.
  chain.steps.forEach((qid, i) => {
    const quest = CAT.QUEST_BY_ID[qid];
    eq(`${qid} points back at ${id}`, quest.chain, id);
    eq(`${qid} knows it is step ${i + 1}`, quest.chainStep, i + 1);
  });
  // nextInChain walks it, and stops at the top.
  for (let i = 0; i < chain.steps.length - 1; i += 1) {
    eq(`nextInChain(${chain.steps[i]}) is the rung above`, CAT.nextInChain(chain.steps[i])?.id, chain.steps[i + 1]);
  }
  eq(`the top of ${id} has nothing above it`, CAT.nextInChain(chain.steps[chain.steps.length - 1]), null);
}

{
  // chainProgress marks exactly one 'next', and a fully claimed chain is complete.
  const chain = CAT.QUEST_CHAINS.pathway_road;
  const fresh = Q.chainProgress('pathway_road', { activeIds: [], doneIds: [] });
  eq('a fresh chain points at its first rung', fresh.next?.id, chain.steps[0]);
  eq('...and marks exactly one rung as next', fresh.steps.filter((s) => s.state === 'next').length, 1);
  const partial = Q.chainProgress('pathway_road', { doneIds: [chain.steps[0], chain.steps[1]] });
  eq('a partly-climbed chain counts what is done', partial.completed, 2);
  eq('...and points at the rung above', partial.next?.id, chain.steps[2]);
  const full = Q.chainProgress('pathway_road', { doneIds: chain.steps });
  assert('a fully claimed chain is complete', full.complete && full.pct === 100);
  assert('...and has nothing left to point at', full.next === null);
  assert('an unknown chain id is null rather than a crash', Q.chainProgress('nope') === null);
}

{
  // The recommender promotes the rung above anything already claimed.
  const withDone = Q.recommendQuests({ lessonsVerified: 6, quizzesTaken: 5, activeDaysLast7: 4 }, [], ['path_first_unit']);
  assert('finishing a rung recommends the one above it',
    withDone.some((r) => r.id === 'path_steady_dozen'));
  assert('...and never re-recommends the finished one',
    !withDone.some((r) => r.id === 'path_first_unit'));
}

// ── 8. The catalog is big enough to be a catalog ────────────────────────────
section('The catalog covers the product');

// Was >= 50. The nine SAT quests went with the SAT pillar (src/lib/betaFlags.js).
assert('the catalog is substantial', CAT.QUESTS.length >= 45, `${CAT.QUESTS.length} quests`);
for (const cat of Object.keys(CAT.QUEST_CATEGORIES)) {
  assert(`category '${cat}' has at least three quests`, CAT.questsInCategory(cat).length >= 3,
    `${CAT.questsInCategory(cat).length}`);
}
assert('every category is reachable from some surface',
  Object.keys(CAT.QUEST_CATEGORIES).every((c) => CAT.QUESTS.some((q) => q.category === c && q.surfaces.length)));
assert('CATEGORY_ORDER lists every category exactly once',
  CAT.CATEGORY_ORDER.length === Object.keys(CAT.QUEST_CATEGORIES).length
  && new Set(CAT.CATEGORY_ORDER).size === CAT.CATEGORY_ORDER.length);
assert('there is a five-day-or-under entry point',
  CAT.QUESTS.some((q) => q.windowDays <= 7 && CAT.QUEST_TIERS[q.tier].xp <= 100),
  'a first quest exists to be finished; the old 200 XP / 7-day floor was the wrong one');
assert('tier XP climbs monotonically with tier rank',
  CAT.TIER_ORDER.every((t, i) => i === 0 || CAT.QUEST_TIERS[t].xp > CAT.QUEST_TIERS[CAT.TIER_ORDER[i - 1]].xp));
assert('every metric a quest names carries its own evidence line',
  CAT.QUESTS.every((q) => (CAT.QUEST_METRICS[q.metric].evidence || '').length > 12),
  'a metric whose provenance is unexplained is one a suspicious parent assumes is self-reported');

// Every icon any catalog names must resolve, or a card renders the generic mark.
{
  const icons = read('src/components/quests/questIcons.js');
  const named = new Set([
    ...CAT.QUESTS.map((q) => q.icon),
    ...Object.values(CAT.QUEST_CHAINS).map((c) => c.icon),
    ...Object.values(CAT.QUEST_CATEGORIES).map((c) => c.icon),
    ...DCAT.DAILY_QUESTS.map((q) => q.icon),
  ]);
  for (const name of named) {
    assert(`icon '${name}' resolves`, new RegExp(`\\b${name}\\b`).test(icons));
  }
}

// ── 9. The daily set ────────────────────────────────────────────────────────
section("Today's three are the same three all day, on every device");

assert('the pool is big enough to feel like a rotation', DCAT.DAILY_QUESTS.length >= 30,
  `${DCAT.DAILY_QUESTS.length} templates`);
assert('daily quest ids are unique',
  new Set(DCAT.DAILY_QUESTS.map((q) => q.id)).size === DCAT.DAILY_QUESTS.length);
for (const q of DCAT.DAILY_QUESTS) {
  assert(`${q.id} names a real metric`, !!CAT.QUEST_METRICS[q.metric], q.metric);
  assert(`${q.id} names a real tier`, !!DCAT.DAILY_TIERS[q.tier], q.tier);
  assert(`${q.id} has a destination`, !!Q.QUEST_DESTINATIONS[q.metric]);
  assert(`${q.id} asks for at least one unit`, q.target >= 1);
  assert(`${q.id} says what it is`, !!q.title && q.blurb?.length > 15);
  if (q.requires) assert(`${q.id} names a real requirement`, DCAT.DAILY_REQUIREMENTS.includes(q.requires), q.requires);
}
for (const tier of DCAT.DAILY_TIER_ORDER) {
  assert(`every tier has enough templates to rotate ('${tier}')`, DCAT.dailyByTier(tier).length >= 8,
    `${DCAT.dailyByTier(tier).length}`);
}
assert('daily XP climbs with the tier',
  DCAT.DAILY_TIER_ORDER.every((t, i) => i === 0 || DCAT.DAILY_TIERS[t].xp > DCAT.DAILY_TIERS[DCAT.DAILY_TIER_ORDER[i - 1]].xp));
assert('the set bonus is worth more than any single quest in it',
  DCAT.DAILY_SET_BONUS.xp > Math.max(...Object.values(DCAT.DAILY_TIERS).map((t) => t.xp)),
  'the bonus is the mechanic that gets the third card done — pricing it below the gold quest wastes it');

{
  const caps = D.capabilities({ hasPathway: true, satQuestions: 500, hasPlan: true, deckCount: 3 });
  const a = D.dailySet({ userKey: 'abc', date: '2026-08-12', caps });
  const b = D.dailySet({ userKey: 'abc', date: '2026-08-12', caps });
  eq('the same student on the same day gets the same three',
    a.map((q) => q.id).join(','), b.map((q) => q.id).join(','));
  eq('...which is exactly three', a.length, 3);
  eq('...one of each tier', a.map((q) => q.tier).join(','), DCAT.DAILY_TIER_ORDER.join(','));
  const tomorrow = D.dailySet({ userKey: 'abc', date: '2026-08-13', caps });
  assert('a different day is a different set',
    tomorrow.map((q) => q.id).join(',') !== a.map((q) => q.id).join(','));
  const other = D.dailySet({ userKey: 'zzz', date: '2026-08-12', caps });
  assert('a different student gets a different set',
    other.map((q) => q.id).join(',') !== a.map((q) => q.id).join(','));
  eq('tomorrowSet agrees with tomorrow\'s dailySet',
    D.tomorrowSet({ userKey: 'abc', date: '2026-08-12', caps }).map((q) => q.id).join(','),
    tomorrow.map((q) => q.id).join(','));

  // A student who has never touched the SAT tab is never handed a full-length test.
  const bare = D.capabilities({ hasPathway: false, satQuestions: 0, satTouched: false, hasPlan: false, deckCount: 0 });
  for (const date of ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-09-01', '2026-10-11']) {
    const set = D.dailySet({ userKey: 'new-student', date, caps: bare });
    eq(`a brand-new student still gets three on ${date}`, set.length, 3);
    assert(`...none of which they cannot do (${date})`,
      set.every((q) => !q.requires || bare[q.requires]),
      set.filter((q) => q.requires && !bare[q.requires]).map((q) => q.id).join(', '));
  }
}

{
  // Progress, claim keys, and the set bonus.
  const caps = D.capabilities({ hasPathway: true, satQuestions: 500, hasPlan: true, deckCount: 3 });
  const date = '2026-08-12';
  const set = D.dailySet({ userKey: 'abc', date, caps });
  const at = new Date(2026, 7, 12, 13, 0, 0).getTime();
  const events = set.flatMap((q) => Array.from({ length: q.target }, () => ({ type: q.metric, at, value: 1 })));

  const empty = D.evaluateDay({ userKey: 'abc', date, caps, events: [] });
  eq('an untouched day has nothing claimable', empty.claimable, 0);
  assert('...and the set bonus is locked', !empty.setBonus.claimable && !empty.setBonus.allDone);
  assert('...and the headline points at something to do', /start with|next up|one left/i.test(empty.headline), empty.headline);

  const doneDay = D.evaluateDay({ userKey: 'abc', date, caps, events });
  eq('finishing all three makes all three claimable', doneDay.claimable, 3);
  assert('...but the set bonus waits until they are CLAIMED, not merely done',
    doneDay.setBonus.allDone && !doneDay.setBonus.claimable,
    'three claims then a chest is a better ending than a chest and then three claims');

  const claimedAll = new Set(doneDay.rows.map((r) => r.key));
  const swept = D.evaluateDay({ userKey: 'abc', date, caps, events, claimedKeys: claimedAll });
  assert('claiming all three unlocks the bonus', swept.setBonus.claimable);
  eq('...and nothing is claimable twice', swept.claimable, 0);
  const paid = D.evaluateDay({ userKey: 'abc', date, caps, events, claimedKeys: new Set([...claimedAll, swept.setBonus.key]) });
  assert('a claimed bonus stays claimed', paid.setBonus.claimed && !paid.setBonus.claimable);

  // Work from another day never counts.
  const yesterday = D.evaluateDay({
    userKey: 'abc', date, caps,
    events: events.map((e) => ({ ...e, at: e.at - 24 * 60 * 60 * 1000 })),
  });
  eq('yesterday\'s work does not finish today\'s quests', yesterday.claimable, 0);

  // Claim keys are per date and per quest, and cannot collide with the streak ledger.
  const k = D.dailyKey(date, set[0].id);
  assert('a daily claim key names its date', k.includes(date));
  assert('...and is distinguishable from every other kind of claim', D.isDailyKey(k));
  assert('...and never collides with the set bonus key', k !== D.dailySetKey(date));
  assert('a milestone key is not mistaken for a daily one', !D.isDailyKey('milestone:30'));
  assert('a repair key is not mistaken for a daily one', !D.isDailyKey('repair:2026-08-12'));

  // featuredDaily biases to the surface, but claimable wins anywhere.
  const partialEvents = events.filter((e) => e.type === set[2].metric);
  const partial = D.evaluateDay({ userKey: 'abc', date, caps, events: partialEvents });
  assert('a claimable daily quest is featured from any surface',
    D.featuredDaily(partial, 'portfolio')?.claimable === true);
  assert('with nothing claimable, the cheapest open one is offered',
    D.featuredDaily(empty, null)?.tier.id === 'bronze');
  assert('a fully swept day features nothing', D.featuredDaily(paid, null) === null);
}

section('Daily quests are wired into the app');
assert('Home carries the daily rail', /<DailyQuestRail\n?\s+day=\{dailyDay\}/.test(app));
assert('the board carries it too', /day=\{dailyDay\}/.test(app));
assert('the tab strips carry the compact form', /compact day=\{dailyDay\} surface=/.test(app));
assert('there is exactly one daily evaluation in the app',
  (app.match(/const dailyDay\s*=\s*useMemo/g) || []).length === 1,
  'two evaluations is two sets of three that can disagree about the same day');
assert('daily claims go through the permanent ledger before the XP',
  /DB\.claimStreakReward\(row\.key/.test(app) && /claimRewardXP\(row\.key, row\.xp\)/.test(app),
  'the ledger row is the idempotency gate — a second tap or a second device must fail there');
assert('the set bonus is claimed through the same outbox',
  /claimRewardXP\(bonus\.key,bonus\.xp\)/.test(app));
assert('daily quests add no storage of their own',
  !/^\s*daily\w*\s*:\s*'/im.test(db),
  'a table for something thrown away at midnight is a table that will drift');

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Quest system verified.');
