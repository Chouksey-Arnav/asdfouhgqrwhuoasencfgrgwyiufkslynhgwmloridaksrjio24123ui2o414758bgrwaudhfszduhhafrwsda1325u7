#!/usr/bin/env node
/**
 * Guards the one rule that keeps a tab switch from ending on a black screen:
 *
 *   Mounting a top-level tab is never conditional on an animation finishing.
 *
 * The Portfolio "screen goes fully black when I switch tabs" bug was exactly that
 * condition failing. The content column rendered inside `<AnimatePresence mode="wait">`,
 * so the next tab was only mounted once framer-motion reported the previous tab's exit
 * complete — and framer-motion's shared layout-projection tree (every `layout` /
 * `layoutId` component in the app joins it, and Portfolio is full of them: the weekly
 * goal tiles, the daily quest cards, the tracked rows) can leave that report permanently
 * unsent. Nothing throws, nothing is logged, the nav still works; the content area is
 * simply never filled and paints C.bg, which on the dark themes is black. Only a reload
 * fixes it, because only a reload builds a fresh AnimatePresence.
 *
 * That construct is easy to reintroduce — it is the idiomatic way to cross-fade views,
 * and it looks completely harmless. This verifier is here so it comes back as a failing
 * build rather than as a support ticket months later.
 *
 * Pure static analysis; no browser, no build. Run by `npm run verify:tab-switch`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const check = (cond, msg, why) => (cond ? ok(msg) : fail(`${msg}\n      ${why}`));

const app = read('src/App.jsx');
const guard = read('src/components/TabContentGuard.jsx');

// ── 1. The tab content column ────────────────────────────────────────────────
console.log('\nThe main content column');

// The tab renderer call — `{(tRenders[tab]||tHome)()}` — is the thing being mounted.
// Whatever wraps it decides whether mounting can be deferred.
const callIdx = app.indexOf('(tRenders[tab]||tHome)()');
check(callIdx !== -1, 'App.jsx still renders the active tab through tRenders',
  'This verifier keys off `(tRenders[tab]||tHome)()`; if that call was renamed, update this script.');

if (callIdx !== -1) {
  // Look at the JSX immediately enclosing the call, not the whole 10k-line file:
  // App.jsx legitimately uses AnimatePresence elsewhere (the video modal, the ⌘K
  // palette, overlays), and none of those gate a tab.
  const around = app.slice(Math.max(0, callIdx - 1600), callIdx + 400);
  check(!/<AnimatePresence[^>]*>/.test(around),
    'the active tab is not wrapped in an AnimatePresence',
    'A tab mounted inside AnimatePresence (especially mode="wait") is mounted only when framer-motion says the previous one finished leaving — see src/components/TabContentGuard.jsx.');
  check(around.includes('<TabContentGuard'),
    'the active tab is wrapped in TabContentGuard',
    'TabContentGuard is what keeps the fade-in without gating the mount, and what turns a blank content area into a message instead of a black screen.');
}

check(app.includes("import TabContentGuard from './components/TabContentGuard'"),
  'App.jsx imports TabContentGuard', 'The guard has to actually be wired in to do anything.');

// ── 2. The guard itself still guards ─────────────────────────────────────────
console.log('\nTabContentGuard');

// Comments stripped first — this file explains the construct at length, and naming it
// in prose is the opposite of using it.
const guardCode = guard.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
check(!/<AnimatePresence/.test(guardCode) && !/AnimatePresence/.test(guardCode.split('\n').filter((l) => l.startsWith('import')).join('\n')),
  'the guard does not reintroduce AnimatePresence',
  'The whole point of this component is that no exit-completion callback sits between a tab change and the tab being on screen.');

check(/phase === 'plain'|phase: 'plain'/.test(guard),
  'the guard has a motion-free recovery render',
  'A blank content area should first heal itself by re-rendering the tab without framer-motion, so the student never sees an error for something we can fix.');

check(guard.includes('Oops! Loading issue.'),
  'the last-resort screen says "Oops! Loading issue."',
  'This is the copy the app uses for every other unrecoverable state (ErrorBoundary, RootErrorBoundary, GlobalCrashGuard); it must stay consistent.');

check(/Refresh the page/.test(guard) && /window\.location\.reload\(\)/.test(guard),
  'the last-resort screen tells the student to refresh, and offers the button',
  'Refreshing is what actually recovers this class of failure, so the screen must both say so and do it.');

check(/document\.hidden/.test(guard),
  'the watchdog stands down while the browser tab is hidden',
  'A backgrounded tab gets no requestAnimationFrame, so animations legitimately have not advanced and any verdict drawn there would be false.');

console.log(failures === 0
  ? '\nTab switching cannot be wedged behind an animation. ✓\n'
  : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
