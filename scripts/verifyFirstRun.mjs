#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verifyFirstRun — the guide a brand-new account meets instead of a dashboard.
//
// Five properties, each a real failure if it breaks and each invisible in code
// review:
//
//  1. IT ENDS. A first-run experience with no exit is a first-run experience
//     somebody is still in three months later. Three exits, all permanent.
//  2. IT IS TWO QUESTIONS. Not three, not a wizard, not a second onboarding.
//  3. THE ORDER IS THE STUDENT'S GRADE. A senior in October must not be told to
//     finish a lesson before their deadlines are on a calendar.
//  4. EVERY STEP POINTS SOMEWHERE REAL. A ladder that names a destination the
//     router cannot parse is a button that does nothing.
//  5. IT NEVER THROWS. Signals arrive from a dozen subsystems and several are
//     null mid-fetch; a NaN comparison is false, which would silently mark a
//     finished step unfinished.
//
// Run by `npm run verify:first-run` (and by `npm run build`).
// ─────────────────────────────────────────────────────────────────────────────
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const section = (n) => console.log(`\n${n}`);

const F = await load('src/lib/firstRun.js');
const { TABS, SUBVIEWS, parsePath } = await load('src/lib/routes.js');

const DONE_EVERYTHING = {
  lessons: 9, quizzes: 9, colleges: 9, activities: 9, deadlines: 9, streak: 9, pathwayChosen: true,
};
const NOTHING = {};

// ── 1. It ends ──────────────────────────────────────────────────────────────
section('The guide retires, three ways, permanently');
{
  const fresh = F.firstRunPlan({ name: 'A' }, NOTHING, { gradeStage: 'freshman' });
  if (!fresh.isNew) fail('a brand-new account is not shown the guide');
  else ok('a brand-new account gets the guide');

  const worked = F.firstRunPlan({ name: 'A', orientation: { focus: 'study', minutes: 'steady' } },
    DONE_EVERYTHING, { gradeStage: 'freshman' });
  if (worked.isNew) fail('the guide is still running after every required step is done');
  else ok('finishing the required steps retires it');

  if (F.firstRunPlan({ name: 'A', firstRunDismissed: true }, NOTHING, {}).isNew) fail('"skip the setup" did not retire the guide');
  else ok('dismissing it retires it');

  const old = F.firstRunPlan({ name: 'A', createdAt: Date.now() - (F.FIRST_RUN_MAX_DAYS + 2) * 86400000 }, NOTHING, {});
  if (old.isNew) fail(`an account older than ${F.FIRST_RUN_MAX_DAYS} days is still called new`);
  else ok(`an account older than ${F.FIRST_RUN_MAX_DAYS} days is not new any more`);

  // A student with a built plan has, by definition, done more than the guide is
  // for. Showing them a beginner's page would be the app forgetting them.
  if (F.firstRunPlan({ name: 'A', masterPlan: { days: [] } }, NOTHING, {}).isNew) fail('a student with a built plan is still shown the guide');
  else ok('a student with a built plan is never shown the guide');
}

// ── 2. Two questions ────────────────────────────────────────────────────────
section('Two questions, no more');
{
  if (F.ORIENTATION_QUESTIONS.length !== 2) fail(`${F.ORIENTATION_QUESTIONS.length} orientation questions — the cap is 2`);
  else ok('exactly two questions');
  for (const q of F.ORIENTATION_QUESTIONS) {
    if (!/\?$/.test(q.prompt)) fail(`"${q.id}": the prompt must be a question`);
    // Every question must say what answering it changes, or it is a survey.
    if ((q.effect || '').length < 20) fail(`"${q.id}": no statement of what the answer changes`);
    if (q.options.length < 2 || q.options.length > 4) fail(`"${q.id}": ${q.options.length} options — keep it between 2 and 4`);
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length) fail(`"${q.id}": duplicate option id`);
  }
  if (!failures) ok('both questions are real questions with stated effects');

  const answered = F.recordOrientation({ name: 'A' }, 'focus', 'apply');
  if (answered?.orientation?.focus !== 'apply') fail('recordOrientation did not record the answer');
  else ok('an answer is recorded on the user');
  if (F.recordOrientation({ name: 'A' }, 'focus', 'not-an-option')) fail('recordOrientation accepted an invented option');
  else ok('an invented option is rejected');
  if (F.pendingQuestions(answered).length !== 1) fail('an answered question is still pending');
  else ok('an answered question stops being asked');
}

// ── 3. Grade decides the order ──────────────────────────────────────────────
section('The order is the student\'s grade');
{
  const firstFor = (g) => F.firstRunPlan({ name: 'A', orientation: { focus: null, minutes: 'steady' } }, NOTHING, { gradeStage: g }).steps[0].id;
  const senior = F.ladderFor('senior');
  const freshman = F.ladderFor('freshman');
  if (freshman[0] !== 'pathway') fail(`a freshman starts on '${freshman[0]}' — it should be finding a pathway`);
  if (senior[0] !== 'college') fail(`a senior starts on '${senior[0]}' — it should be their college list`);
  // The load-bearing one: a senior must never be walked into lesson work first.
  if (senior.indexOf('lesson') !== -1 && senior.indexOf('lesson') < senior.indexOf('deadline')) {
    fail('a senior is sent to a lesson before their deadlines');
  }
  if (!failures) ok(`freshman starts at '${freshman[0]}', senior at '${senior[0]}'`);

  // An answered `focus` re-orders the ladder. An app that asks a question and
  // then ignores the answer is worse than one that never asked.
  const led = F.firstRunPlan({ name: 'A', orientation: { focus: 'apply', minutes: 'steady' } }, NOTHING, { gradeStage: 'sophomore' });
  if (led.steps[0].id !== 'college') fail(`answering "deadlines first" did not move the college list to the front (got '${led.steps[0].id}')`);
  else ok('the focus answer re-orders the ladder');

  // …but never changes its contents. Re-ordering is emphasis; dropping a step
  // would be an answer to one question quietly removing part of the product.
  const plain = F.firstRunPlan({ name: 'A', orientation: { minutes: 'steady' } }, NOTHING, { gradeStage: 'sophomore' });
  const a = [...plain.steps.map((x) => x.id)].sort().join();
  const b = [...led.steps.map((x) => x.id)].sort().join();
  if (a !== b) fail('the focus answer changed WHICH steps exist, not just their order');
  else ok('the focus answer changes order, never contents');

  for (const g of ['freshman', 'sophomore', 'junior', 'senior', 'gap', null, 'nonsense']) {
    const l = F.ladderFor(g);
    if (!l?.length) fail(`no ladder for grade '${g}'`);
    if (new Set(l).size !== l.length) fail(`ladder for '${g}' repeats a step`);
    for (const id of l) if (!F.STEP_IDS.includes(id)) fail(`ladder for '${g}' names unknown step '${id}'`);
  }
  if (!failures) ok('every grade — including an unknown one — has a well-formed ladder');
}

// ── 4. Every step points somewhere real ─────────────────────────────────────
section('Every step is a working button');
{
  const plan = F.firstRunPlan({ name: 'A', orientation: { focus: 'build', minutes: 'deep' } }, NOTHING, { gradeStage: 'junior' });
  for (const step of plan.steps) {
    if (!step.title || !/^[A-Z]/.test(step.title)) fail(`${step.id}: title must be a sentence-case phrase`);
    if ((step.why || '').length < 40) fail(`${step.id}: no reason worth reading — the whole point of the current step is its reason`);
    if (!step.action) fail(`${step.id}: no button label`);
    const [tab, view] = String(step.destination).split('/');
    if (!TABS.includes(tab)) fail(`${step.id}: destination names '${tab}', which is not a tab`);
    else if (view && !SUBVIEWS[tab]?.ids.includes(view)) fail(`${step.id}: '${view}' is not a sub-view of ${tab}`);
    else if (!parsePath(`/${step.destination}`)) fail(`${step.id}: /${step.destination} does not parse as a route`);
  }
  if (!failures) ok(`${plan.steps.length} steps all name a parseable destination with a reason attached`);

  // Required steps must be reachable in the number the headline promises.
  if (plan.total < 1 || plan.total > F.GRADUATION_STEPS) fail(`the guide promises ${plan.total} steps, cap is ${F.GRADUATION_STEPS}`);
  else ok(`the guide asks for ${plan.total} steps before it retires`);
}

// ── 5. It never throws ──────────────────────────────────────────────────────
section('Junk signals degrade quietly');
{
  for (const junk of [null, undefined, {}, { lessons: null }, { lessons: 'x' }, { quizzes: NaN },
    { colleges: '3' }, [], { activities: {} }]) {
    let out; let threw = false;
    try { out = F.firstRunPlan({ name: 'A' }, junk, { gradeStage: 'sophomore' }); } catch { threw = true; }
    if (threw) fail(`${JSON.stringify(junk)} threw`);
    else if (!out.steps.length) fail(`${JSON.stringify(junk)} produced no ladder`);
  }
  for (const u of [null, undefined, {}, { createdAt: 'nonsense' }, { orientation: null }]) {
    let threw = false;
    try { F.firstRunPlan(u, {}, {}); } catch { threw = true; }
    if (threw) fail(`user ${JSON.stringify(u)} threw`);
  }
  // A numeric string is a real shape from a database driver and must count.
  const strung = F.firstRunPlan({ name: 'A' }, { colleges: '3' }, { gradeStage: 'senior' });
  if (!strung.steps.find((x) => x.id === 'college')?.done) fail('a numeric string did not count as a number');
  if (!failures) ok('junk signals, junk users and stringly-typed numbers all degrade quietly');

  // The headline must always be a sentence, never a template with a hole in it.
  for (const g of ['freshman', 'senior', null]) {
    for (const u of [{ name: 'Ana' }, { name: '' }, {}]) {
      const p = F.firstRunPlan(u, {}, { gradeStage: g });
      if (!p.headline || /undefined|null|NaN/.test(`${p.headline} ${p.subline}`)) {
        fail(`headline leaked a placeholder for grade=${g} name=${JSON.stringify(u.name)}: "${p.headline} / ${p.subline}"`);
      }
    }
  }
  if (!failures) ok('the headline is a real sentence for every grade, named or not');
}

console.log(failures ? `\n${failures} problem(s)\n` : '\nFirst-run guide OK\n');
process.exit(failures ? 1 : 0);
