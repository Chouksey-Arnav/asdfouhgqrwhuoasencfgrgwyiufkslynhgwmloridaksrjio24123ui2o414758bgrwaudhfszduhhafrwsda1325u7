#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verifyDecisions — the local decision engine (src/lib/decisionEngine.js).
//
// This module is what makes the app look like it is thinking, and it does that
// without a model call, which means the ways it can go wrong are the ways a
// rules engine goes wrong: a rule that fires for everybody, a rule that can
// never fire, a recommendation pointing at a locked screen, or a sentence that
// quietly promises an outcome. Every one of those is invisible in review and
// obvious to a student.
//
//  1. NOTHING IS PROMISED. Same hard line as the month plan.
//  2. EVERY ROW SHOWS ITS RULE AND ITS EVIDENCE.
//  3. NOTHING POINTS AT A LOCKED SCREEN (except an 'unlock' row, which is about
//     the lock).
//  4. EVERY RULE IS REACHABLE, AND NONE FIRES ON AN EMPTY ACCOUNT.
//  5. IT DEGRADES TO SILENCE. No filler, no "keep it up", no fourth suggestion
//     invented to fill a slot.
//
// Run by `npm run verify:decisions` (and by `npm run build`).
// ─────────────────────────────────────────────────────────────────────────────
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const section = (n) => console.log(`\n${n}`);

const D = await load('src/lib/decisionEngine.js');
const { TABS, SUBVIEWS, parsePath } = await load('src/lib/routes.js');

// Every state that makes at least one rule fire, so the whole surface is
// exercised rather than the two cases somebody happened to try by hand.
const STATES = [
  ['a senior in October', { gradeStage: 'senior', onboarded: true, pathwayChosen: true, streak: 4, creditsToday: 0, colleges: 0, urgentDeadline: { title: 'Common App', dueInDays: 12 } }],
  ['a freshman on day one', { gradeStage: 'freshman', onboarded: true, pathwayChosen: false }],
  ['a junior with no hours', { gradeStage: 'junior', onboarded: true, pathwayChosen: true, lessons: 4, quizzes: 2, activities: 3, clinicalHours: 0, creditsToday: 0 }],
  ['a student who cleared today', { gradeStage: 'sophomore', onboarded: true, pathwayChosen: true, streak: 6, creditsToday: 4, goalCredits: 4 }],
  ['a lapsed student with cards due', { gradeStage: 'sophomore', onboarded: true, pathwayChosen: true, dueCards: 40, streak: 1, creditsToday: 0 }],
  ['a student with a locked next step', { gradeStage: 'freshman', onboarded: true, pathwayChosen: true, nextUnlock: { id: 'plans', label: 'Plans', hint: 'Finish onboarding first.', progress: [1, 3] } }],
  ['a sophomore with lessons and no record', { gradeStage: 'sophomore', onboarded: true, pathwayChosen: true, lessons: 5, activities: 0, creditsToday: 2, goalCredits: 4 }],
];

// ── 1. Nothing is promised ──────────────────────────────────────────────────
section('No decision promises an outcome');
{
  const PROMISE = /\b(guarantee|will get (you )?(in|accepted|admitted)|ensures? (your )?(admission|acceptance)|top[- ](10|30|ten|thirty)|secures? (your )?(spot|place))/i;
  let checked = 0;
  for (const [label, st] of STATES) {
    for (const d of D.decide(st, { limit: 9 })) {
      checked += 1;
      const text = `${d.headline} ${d.because} ${d.action?.label || ''}`;
      if (PROMISE.test(text)) fail(`${label} / ${d.id}: promises an outcome — "${text}"`);
      // A headline is a sentence a student reads. An empty one is a blank card.
      if (!d.headline?.trim() || !d.because?.trim()) fail(`${label} / ${d.id}: empty headline or evidence`);
    }
  }
  if (!failures) ok(`${checked} decisions across ${STATES.length} students, none promises anything`);
  // The scrubber itself, directly.
  if (/guarantee/i.test(D.assertNoPromise('this will guarantee admission'))) fail('assertNoPromise let a promise through');
  else ok('assertNoPromise strips a promise it is handed directly');
}

// ── 2. Rule and evidence ────────────────────────────────────────────────────
section('Every row names its rule and its evidence');
{
  for (const [label, st] of STATES) {
    for (const d of D.decide(st, { limit: 9 })) {
      if (d.source !== `rule:${d.id}`) fail(`${label} / ${d.id}: source is '${d.source}', expected 'rule:${d.id}'`);
      if (!D.RULE_IDS.includes(d.id)) fail(`${label}: decision '${d.id}' is not a declared rule`);
      if (!D.KIND_IDS.includes(d.kind)) fail(`${label} / ${d.id}: unknown kind '${d.kind}'`);
      // The evidence line must be a full sentence, not a fragment or a label.
      if (!/[.!?]$/.test(d.because)) fail(`${label} / ${d.id}: evidence is not a sentence — "${d.because}"`);
      if (!(d.confidence > 0 && d.confidence <= 1)) fail(`${label} / ${d.id}: confidence ${d.confidence} out of range`);
      if (!(d.score > 0)) fail(`${label} / ${d.id}: non-positive score`);
    }
  }
  if (!failures) ok('every decision carries its rule id, its kind, a full-sentence reason and a score');
}

// ── 3. Nothing points at a locked screen ────────────────────────────────────
section('A decision never sends a student to a closed door');
{
  // Nothing is open at all. Only 'unlock' rows — which are ABOUT the lock and
  // carry no destination — may survive.
  const shut = { canOpen: () => false };
  for (const [label, st] of STATES) {
    for (const d of D.decide({ ...st, ...shut }, { limit: 9 })) {
      if (d.action?.destination) fail(`${label} / ${d.id}: points at ${d.action.destination} with everything locked`);
    }
  }
  if (!failures) ok('with everything locked, no decision offers a destination');

  // And every destination a rule CAN produce has to be a real route.
  const seen = new Set();
  for (const [label, st] of STATES) {
    for (const d of D.decide(st, { limit: 9 })) {
      const dest = d.action?.destination;
      if (!dest || seen.has(dest)) continue;
      seen.add(dest);
      const [tab, view] = dest.split('/');
      if (!TABS.includes(tab)) fail(`${label} / ${d.id}: '${tab}' is not a tab`);
      else if (view && !SUBVIEWS[tab]?.ids.includes(view)) fail(`${label} / ${d.id}: '${view}' is not a sub-view of ${tab}`);
      else if (!parsePath(`/${dest}`)) fail(`${label} / ${d.id}: /${dest} does not parse`);
    }
  }
  if (!failures) ok(`${seen.size} distinct destinations, all parseable routes: ${[...seen].join(', ')}`);
}

// ── 4. Every rule is reachable, and none fires on an empty account ──────────
section('Every rule earns its place');
{
  const fired = new Set();
  for (const [, st] of STATES) for (const d of D.decide(st, { limit: 9 })) fired.add(d.id);
  const never = D.RULE_IDS.filter((id) => !fired.has(id));
  if (never.length) fail(`no fixture reaches ${never.join(', ')} — either the rule is dead or this file is missing a case`);
  else ok(`all ${D.RULE_IDS.length} rules fire for at least one student`);

  // The empty account. A dashboard that lectures somebody who has done nothing
  // and told us nothing is the exact failure this whole body of work is about.
  const empty = D.decide({}, { limit: 9 });
  if (empty.length) fail(`an empty account got ${empty.length} decisions: ${empty.map((d) => d.id).join(', ')}`);
  else ok('an empty account gets silence, not filler');
}

// ── 5. Ranking and shape ────────────────────────────────────────────────────
section('Ranking, caps and the celebration rule');
{
  for (const [label, st] of STATES) {
    const rows = D.decide(st, { limit: 3 });
    if (rows.length > 3) fail(`${label}: ${rows.length} rows for a limit of 3`);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].score > rows[i - 1].score) fail(`${label}: rows are not ranked (${rows[i - 1].id} then ${rows[i].id})`);
    }
    if (new Set(rows.map((r) => r.id)).size !== rows.length) fail(`${label}: the same rule fired twice`);
    // Never more than one celebration — a page of congratulations is a page
    // that told the student nothing.
    if (rows.filter((r) => r.kind === 'celebrate').length > 1) fail(`${label}: more than one celebration at once`);
  }
  if (!failures) ok('rows are ranked, capped, distinct, and never double-celebrate');

  // A closing deadline must outrank a lesson suggestion, always. This is the
  // single ordering the product cannot get wrong.
  const urgent = D.decide({
    gradeStage: 'senior', onboarded: true, pathwayChosen: true, creditsToday: 0,
    urgentDeadline: { title: 'Early action', dueInDays: 3 },
  }, { limit: 3 });
  const deadlineAt = urgent.findIndex((d) => d.id === 'deadline-closing');
  const lessonAt = urgent.findIndex((d) => d.id === 'next-lesson');
  if (deadlineAt === -1) fail('a deadline three days out did not surface at all');
  else if (lessonAt !== -1 && lessonAt < deadlineAt) fail('a lesson suggestion outranked a deadline three days out');
  else ok('a closing deadline outranks routine work');

  // While the first-run guide owns the page, only a 'protect' decision may also
  // be telling a student what to do — two systems, two first steps.
  for (const [label, st] of STATES) {
    for (const d of D.decide({ ...st, firstRun: true }, { limit: 9 })) {
      if (d.kind !== 'protect') fail(`${label}: '${d.id}' (${d.kind}) competes with the first-run guide`);
    }
  }
  if (!failures) ok('during the first week only protect-kind decisions are shown');

  // leadDecision and decide() must never disagree about what comes first.
  for (const [label, st] of STATES) {
    const lead = D.leadDecision(st);
    const first = D.decide(st, { limit: 1 })[0] || null;
    if ((lead?.id || null) !== (first?.id || null)) fail(`${label}: leadDecision and decide() disagree`);
  }
  if (!failures) ok('leadDecision always matches the top of decide()');
}

// ── 6. Junk in, silence out ─────────────────────────────────────────────────
section('Junk states degrade quietly');
{
  for (const junk of [null, undefined, {}, [], { streak: 'x' }, { creditsToday: NaN }, { goalCredits: 0 },
    { canOpen: null }, { nextUnlock: {} }, { urgentDeadline: {} }, { gradeStage: 42 }]) {
    let threw = false;
    try { D.decide(junk, { limit: 3 }); } catch { threw = true; }
    if (threw) fail(`${JSON.stringify(junk)} threw`);
  }
  // A zero goal would make every day permanently cleared, which would silence
  // the streak rules for everybody. It has to be normalized, not trusted.
  const zeroGoal = D.decide({ streak: 5, creditsToday: 0, goalCredits: 0, pathwayChosen: true, onboarded: true }, { limit: 3 });
  if (!zeroGoal.some((d) => d.id === 'streak-at-risk')) fail('a zero goal silenced the streak rules');
  else ok('a zero goal is normalized rather than trusted');
  if (!failures) ok('every junk state degrades without throwing');
}

console.log(failures ? `\n${failures} problem(s)\n` : '\nDecision engine OK\n');
process.exit(failures ? 1 : 0);
