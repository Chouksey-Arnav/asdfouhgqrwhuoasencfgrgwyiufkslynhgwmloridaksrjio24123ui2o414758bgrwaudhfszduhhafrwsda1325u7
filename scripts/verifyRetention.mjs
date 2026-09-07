#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verifyRetention — the exit prompt, and the line between a nudge and a dark
// pattern.
//
// This is the one place in the product where the app interrupts somebody who is
// trying to leave. That is a genuinely dangerous thing to build, and the reason
// it gets a build gate rather than a code review is that every failure mode
// here is a copy change somebody makes in a hurry:
//
//  1. IT NEVER LIES ABOUT ITS OWN MECHANIC. The streak counts finished work, not
//     app opens (guarded by verify:streak). So the prompt may never ask a
//     student to STAY — only to finish something. A retention prompt that
//     misdescribes what it is protecting teaches a student the numbers are
//     theater.
//  2. IT NEVER FIRES WITH NOTHING AT STAKE. Cleared today, or a bounce session
//     → silence, always.
//  3. LEAVING IS ONE TAP, ALWAYS. Both buttons exist, both have real words, and
//     neither is a shame button.
//  4. ONCE A DAY, AND OPTING OUT IS ABSOLUTE.
//  5. IT IS HONEST ABOUT FREEZES. A student who cannot lose their streak
//     tonight is not told they can.
//
// Run by `npm run verify:retention` (and by `npm run build`).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const section = (n) => console.log(`\n${n}`);

const R = await load('src/lib/streakRetention.js');

const LIVE = { minutesInApp: 5, goalCredits: 4 };
const CASES = [
  ['an 11-day streak, nothing done',   { ...LIVE, streak: 11, creditsToday: 0 }, 'at_risk'],
  ['a 1-day streak, nothing done',     { ...LIVE, streak: 1, creditsToday: 0 }, 'at_risk'],
  ['no streak, nothing done',          { ...LIVE, streak: 0, creditsToday: 0 }, 'first_day'],
  ['a streak protected by a freeze',   { ...LIVE, streak: 11, creditsToday: 0, freezes: 2 }, 'protected'],
  ['today already cleared',            { ...LIVE, streak: 5, creditsToday: 4 }, 'none'],
  ['a bounce session',                 { streak: 9, creditsToday: 0, goalCredits: 4, minutesInApp: 0.2 }, 'none'],
  ['partial credit, no streak',        { ...LIVE, streak: 0, creditsToday: 2 }, 'none'],
];

// ── 1. It never lies about its own mechanic ─────────────────────────────────
section('The prompt never asks anybody to stay');
{
  // "stay", "come back", "don't go", "keep browsing" — anything that describes
  // PRESENCE as what protects the streak. The word this product is allowed to
  // use is "finish".
  const PRESENCE = /\b(stay (here|in|on)|keep (the app|browsing|scrolling)|don'?t (go|leave)|before you go,? stay|remain (here|open))\b/i;
  for (const [label, input] of CASES) {
    const p = R.exitPrompt(input);
    const text = `${p.title || ''} ${p.body || ''} ${p.stay || ''} ${p.leave || ''}`;
    if (PRESENCE.test(text)) fail(`${label}: the prompt asks the student to stay — "${text.trim()}"`);
  }
  if (!failures) ok('no prompt asks for presence; every one asks for finished work');

  // And the at-risk copy must actually say what clears a day, in the words the
  // rest of the product uses.
  const atRisk = R.exitPrompt({ ...LIVE, streak: 11, creditsToday: 0 });
  if (!/\bfinish\b|\bcredit/i.test(atRisk.body)) fail('the at-risk prompt never says what actually clears the day');
  else ok('the at-risk prompt states the real mechanic (finished work / credits)');
}

// ── 2. Nothing at stake, nothing said ───────────────────────────────────────
section('It only fires when something is genuinely at risk');
{
  for (const [label, input, expected] of CASES) {
    const got = R.exitPrompt(input).kind;
    if (got !== expected) fail(`${label}: expected '${expected}', got '${got}'`);
  }
  if (!failures) ok(`all ${CASES.length} cases classify as expected`);

  for (const p of ['none']) void p;
  // Silence is a complete result, not a half-built one.
  const silent = R.exitPrompt({ ...LIVE, streak: 5, creditsToday: 9 });
  if (silent.title || silent.body || silent.stay || silent.leave || silent.action) {
    fail('a silent result still carried copy — a caller could render it');
  } else ok('silence carries no copy at all');

  // A cleared day can never produce a prompt, at any streak length.
  for (let s = 0; s <= 60; s += 7) {
    if (R.exitPrompt({ ...LIVE, streak: s, creditsToday: 4, goalCredits: 4 }).kind !== 'none') {
      fail(`a cleared day at streak ${s} still produced a prompt`);
    }
  }
  if (!failures) ok('a cleared day is silent at every streak length');
}

// ── 3. Leaving is one tap ───────────────────────────────────────────────────
section('Leaving is always offered, on a real button');
{
  // A leave label that is a self-accusation ("No thanks, I don't care about my
  // future") is the classic confirmshaming pattern and is banned outright.
  const SHAME = /\b(i don'?t care|no thanks,? i|i'?ll fail|give up on|quit on|lazy|loser)\b/i;
  for (const [label, input] of CASES) {
    const p = R.exitPrompt(input);
    if (p.kind === 'none') continue;
    if (!p.stay?.trim()) fail(`${label}: no action button label`);
    if (!p.leave?.trim()) fail(`${label}: NO LEAVE BUTTON — leaving must always be one tap`);
    if (SHAME.test(p.leave || '')) fail(`${label}: the leave button shames the student — "${p.leave}"`);
    // Both labels short enough to sit on a button rather than be a paragraph.
    if ((p.leave || '').length > 24) fail(`${label}: leave label is too long to read as a button — "${p.leave}"`);
    if ((p.stay || '').length > 24) fail(`${label}: stay label is too long to read as a button — "${p.stay}"`);
  }
  if (!failures) ok('every prompt offers both buttons, neither of them a shame button');

  // The component half: a real close control, Escape, and no forced choice.
  const modal = read('src/components/streak/StayForStreakModal.jsx');
  for (const [needle, why] of [
    ["aria-label=\"Close\"", 'the modal has no labelled close control'],
    ["e.key === 'Escape'", 'Escape does not dismiss the modal'],
    ['role="dialog"', 'the modal is not announced as a dialog'],
    ["aria-modal=\"true\"", 'the modal does not trap assistive focus'],
  ]) if (!modal.includes(needle)) fail(why);
  // beforeunload is banned: a browser will not render anything of ours there,
  // the native dialog it does allow is a hostage-taking device, and several
  // browsers ignore it anyway. Matched on an actual listener rather than on the
  // word, so the comment in that file explaining why it is banned still passes.
  if (/addEventListener\(\s*['"`]beforeunload/.test(modal) || /onbeforeunload/.test(modal)) {
    fail('the modal hooks beforeunload — a native leave dialog is a hostage-taking device');
  }
  if (!failures) ok('the modal is a real dialog with a close control, Escape, and no beforeunload');
}

// ── 4. Frequency and opt-out ────────────────────────────────────────────────
section('Once a day, and the opt-out is absolute');
{
  if (R.mayInterrupt({ alreadyShownToday: true, promptKind: 'at_risk' })) fail('a second prompt in one day was allowed');
  else ok('a second prompt in one day is refused');
  if (R.mayInterrupt({ optedOut: true, promptKind: 'at_risk' })) fail('the opt-out was ignored');
  else ok('the opt-out is honored unconditionally');
  if (R.mayInterrupt({ promptKind: 'none' })) fail("'none' still interrupted");
  else ok("a 'none' classification never interrupts");
  if (!R.mayInterrupt({ promptKind: 'at_risk' })) fail('a genuine at-risk streak was suppressed');
  else ok('a genuine at-risk streak does interrupt');
  // The daily key must be per-day, or "once a day" is "once, ever".
  if (R.seenKey('2026-01-01') === R.seenKey('2026-01-02')) fail('the once-a-day key is not keyed on the day');
  else ok('the frequency key rolls over daily');
}

// ── 5. Honest about freezes ─────────────────────────────────────────────────
section('A student who cannot lose tonight is not told they can');
{
  const p = R.exitPrompt({ ...LIVE, streak: 11, creditsToday: 0, freezes: 1 });
  if (p.kind !== 'protected') fail('a held freeze did not change the message');
  else if (!/survives|bridge/i.test(`${p.title} ${p.body}`)) fail('the protected message does not say the streak survives');
  else ok('a held freeze produces the honest, less alarming message');
  // …and it must not also claim the streak is at risk.
  if (/at risk|about to lose|will lose/i.test(`${p.title} ${p.body}`)) fail('the protected message still claims a loss that cannot happen');
  else ok('the protected message claims no loss');
}

// ── 6. The smallest sufficient action ───────────────────────────────────────
section('The offer is specific, not "study now"');
{
  const resumable = R.smallestSufficientAction({ resumableLesson: { title: 'What doctors actually do', minutes: 9 } });
  if (!/what doctors actually do/i.test(resumable.label)) fail('a resumable lesson is not named in the offer');
  else ok('a started lesson is offered back by name');
  const next = R.smallestSufficientAction({ nextLesson: { title: 'Anatomy basics' } });
  if (!next?.destination) fail('the next lesson produced no destination');
  const cards = R.smallestSufficientAction({ dueCards: 20 });
  if (!/20/.test(cards.label)) fail('the card offer does not state how many');
  // A resumable lesson beats everything: at the door, the cheapest thing is the
  // one requiring no decision.
  const both = R.smallestSufficientAction({ resumableLesson: { title: 'A' }, nextLesson: { title: 'B' }, dueCards: 99 });
  if (!/"A"/.test(both.label)) fail('a resumable lesson did not take priority at the door');
  else ok('a resumable lesson outranks a better one that needs choosing');
  // Nothing available is null, not a broken button.
  if (R.smallestSufficientAction({}) !== null) fail('an empty account produced a phantom action');
  else ok('with nothing available the offer is null, not a dead button');
  // …and the prompt still reads as a sentence with no action to name.
  const noAction = R.exitPrompt({ ...LIVE, streak: 4, creditsToday: 0, smallestAction: null });
  if (/undefined|null|NaN/.test(`${noAction.title} ${noAction.body}`)) fail('the prompt leaked a placeholder with no action available');
  else ok('the prompt reads correctly with nothing specific to offer');
}

console.log(failures ? `\n${failures} problem(s)\n` : '\nExit prompt OK\n');
process.exit(failures ? 1 : 0);
