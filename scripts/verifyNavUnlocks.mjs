#!/usr/bin/env node
/**
 * Guards progressive feature unlocking (src/lib/featureUnlock.js).
 *
 * The failure modes here are quiet and nasty, which is why they get a build
 * gate rather than a code review:
 *
 *   1. A rule names a destination that no longer exists (a sub-tab was renamed
 *      or merged), so the gate silently stops applying and the tab is back on
 *      day one — or worse, gates an id nothing renders and the "unlocks next"
 *      list advertises a screen you can't reach.
 *   2. A rule can never be satisfied, permanently hiding a feature from every
 *      student who doesn't find the Settings escape hatch.
 *   3. A pillar's default sub-view is itself locked, so a fresh account
 *      opening /prep lands on a screen the nav says they can't have.
 *   4. Day one quietly re-inflates: someone adds a tab, doesn't add a rule,
 *      and the "four doors, not thirty-eight" property erodes one PR at a time.
 *
 * Pure static analysis + pure functions. Run by `npm run verify:nav`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const { TABS, SUBVIEWS } = await import(pathToFileURL(path.join(ROOT, 'src/lib/routes.js')).href);
const unlock = await import(pathToFileURL(path.join(ROOT, 'src/lib/featureUnlock.js')).href);
const { UNLOCK_RULES, EMPTY_SIGNALS, GATED_IDS, unlockState, seedExistingAccount, NAV_MODES, key } = unlock;

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const section = (name) => console.log(`\n${name}`);

// A student who has done everything the app can measure. Every rule must open
// for this person, or the feature it guards is unreachable by design.
const MAXED = {
  quizzes: 999, lessons: 999, satQuestions: 9999,
  satBaselineDone: true, satDiagnosticDone: true, satFullTests: 9,
  colleges: 20, essays: 20, activities: 20, trackedItems: 20,
  achievements: 40, level: 50, planBuilt: true, applicationUrgent: true,
};
const FRESH = { ...EMPTY_SIGNALS };
const NEW_USER = { name: 'A', xp: 0 };

// ── 1. Every gated id names a destination that actually renders ─────────────
section('Rules name real destinations');
const app = read('src/App.jsx');
function idsIn(constName) {
  const start = app.indexOf(`const ${constName} = [`);
  if (start === -1) return null;
  const block = app.slice(start, app.indexOf('\n];', start));
  return [...block.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]);
}
const SUBNAV_CONST = { sat: 'SAT_SUBNAV', prep: 'PREP_SUBNAV', portfolio: 'PORTFOLIO_SUBNAV', progress: 'PROGRESS_SUBNAV' };
const LABELS = {};
for (const id of idsIn('NAV') || []) LABELS[id] = null;
for (const [tab, name] of Object.entries(SUBNAV_CONST)) {
  const start = app.indexOf(`const ${name} = [`);
  const block = app.slice(start, app.indexOf('\n];', start));
  for (const m of block.matchAll(/\{id:'([^']+)',ic:\w+,label:'([^']+)'/g)) LABELS[`${tab}/${m[1]}`] = m[2];
}
for (const m of (app.slice(app.indexOf('const NAV = ['), app.indexOf('\n];', app.indexOf('const NAV = [')))).matchAll(/\{id:'([^']+)',ic:\w+,label:'([^']+)'/g)) LABELS[m[1]] = m[2];

if (new Set(GATED_IDS).size !== GATED_IDS.length) fail('UNLOCK_RULES contains a duplicate id');
for (const rule of UNLOCK_RULES) {
  const [tab, view] = rule.id.split('/');
  if (!TABS.includes(tab)) { fail(`${rule.id}: '${tab}' is not a top-level tab`); continue; }
  if (view && !SUBVIEWS[tab]?.ids.includes(view)) { fail(`${rule.id}: '${view}' is not a sub-view of ${tab}`); continue; }
  const expected = LABELS[rule.id];
  // The label is student-facing copy in the "unlocks next" list; if it drifts
  // from the nav the same screen is advertised under two different names.
  if (expected && expected.replace(/é/g, 'é') !== rule.label) {
    fail(`${rule.id}: rule label '${rule.label}' !== nav label '${expected}'`);
  }
  if (!rule.hint || !/[.!]$/.test(rule.hint)) fail(`${rule.id}: hint must be a full sentence ending in punctuation`);
  if (/lock/i.test(rule.hint) && !/unlock/i.test(rule.hint)) fail(`${rule.id}: hint states a status instead of an instruction`);
}
if (!failures) ok(`${UNLOCK_RULES.length} rules name real, correctly-labelled destinations`);

// ── 2. Nothing is gated forever, and nothing is gated for no reason ─────────
section('Every gate opens, and every gate matters');
for (const rule of UNLOCK_RULES) {
  if (!rule.at(MAXED)) fail(`${rule.id} never unlocks — no signal combination satisfies it`);
  if (rule.at(FRESH)) fail(`${rule.id} is already open on a fresh account — the rule is dead weight`);
  if (rule.progress) {
    const [have, need] = rule.progress(FRESH);
    const [haveMax, needMax] = rule.progress(MAXED);
    if (!(need > 0)) fail(`${rule.id}: progress target must be positive`);
    if (have !== 0) fail(`${rule.id}: progress should start at 0 on a fresh account, got ${have}`);
    if (haveMax < needMax) fail(`${rule.id}: progress never reaches its target`);
  }
}
if (!failures) ok('all gates are reachable and none is a no-op');

// ── 3. Day one is small, and every pillar still has a front door ────────────
section('Day one stays small');
const fresh = unlockState(NEW_USER, FRESH);
const dayOneTabs = (idsIn('NAV') || []).filter((id) => fresh.isOpen(id));
if (dayOneTabs.length > 4) fail(`day one shows ${dayOneTabs.length} top-level tabs (${dayOneTabs.join(', ')}) — cap is 4`);
else ok(`day one shows ${dayOneTabs.length} top-level tabs: ${dayOneTabs.join(', ')}`);

for (const [tab, name] of Object.entries(SUBNAV_CONST)) {
  const ids = idsIn(name) || [];
  const open = ids.filter((v) => fresh.isOpen(tab, v));
  if (!open.length) fail(`${name}: every sub-tab is locked on day one — the pillar has no front door`);
  else if (open.length > 3) fail(`${name}: ${open.length} sub-tabs open on day one (${open.join(', ')}) — cap is 3`);
  else ok(`${name}: ${open.join(', ')} (${ids.length - open.length} unlock later)`);
  // The router sends a bare /prep to SUBVIEWS.prep.default. If that view is
  // gated, a fresh account's very first navigation lands on a locked screen.
  const def = SUBVIEWS[tab].default;
  if (!fresh.isOpen(tab, def)) fail(`${name}: default sub-view '${def}' is locked on day one`);
}

// ── 4. The ladder actually climbs ───────────────────────────────────────────
section('The ladder climbs');
const STEPS = [
  ['after 1 quiz', { ...FRESH, quizzes: 1 }, ['portfolio', 'prep/quizzes', 'prep/flashcards', 'prep/coach']],
  ['after the SAT baseline', { ...FRESH, satBaselineDone: true, satQuestions: 22 }, ['sat/diagnostic', 'sat/practice', 'sat/scores', 'sat/review', 'sat/skills']],
  ['after 5 sessions', { ...FRESH, quizzes: 3, lessons: 2 }, ['portfolio', 'plans', 'progress', 'prep/library']],
  ['with a college list', { ...FRESH, quizzes: 1, colleges: 2 }, ['portfolio/essays', 'portfolio/resume', 'portfolio/aid']],
  ['with logged activities', { ...FRESH, quizzes: 1, activities: 2 }, ['portfolio/opportunities', 'portfolio/tracked', 'portfolio/recommenders', 'portfolio/interview']],
];
for (const [label, signals, expect] of STEPS) {
  const st = unlockState(NEW_USER, signals);
  const missing = expect.filter((id) => { const [t, v] = id.split('/'); return !st.isOpen(t, v || null); });
  if (missing.length) fail(`${label}: expected ${missing.join(', ')} to be open`);
  else ok(`${label} → ${expect.join(', ')}`);
}

// ── 5. Sticky, escape hatch, and existing accounts ──────────────────────────
section('Sticky unlocks, escape hatch, existing accounts');
const earned = unlockState(NEW_USER, { ...FRESH, quizzes: 9 });
const recorded = unlock.recordUnlocks(NEW_USER, earned.pending);
if (!recorded?.unlockedFeatures?.includes('portfolio')) fail('recordUnlocks did not persist an earned unlock');
// Signals regress (the student deleted the quiz) — the tab must not vanish.
if (!unlockState(recorded, FRESH).isOpen('portfolio')) fail('an unlocked tab re-locked when its signal regressed');
else ok('unlocks are sticky across signal regression');

const everything = unlockState({ ...NEW_USER, navMode: NAV_MODES.EVERYTHING }, FRESH);
const stillHidden = GATED_IDS.filter((id) => { const [t, v] = id.split('/'); return !everything.isOpen(t, v || null); });
if (stillHidden.length) fail(`navMode 'everything' still hides ${stillHidden.join(', ')}`);
else if (everything.locked().length) fail("navMode 'everything' still advertises locked features");
else ok(`Settings escape hatch opens all ${GATED_IDS.length} gated destinations`);

const legacy = seedExistingAccount({ name: 'B', xp: 4200 }, FRESH);
const lost = GATED_IDS.filter((id) => { const [t, v] = id.split('/'); return !unlockState(legacy, FRESH).isOpen(t, v || null); });
if (lost.length) fail(`an established account lost access to ${lost.join(', ')}`);
else ok('established accounts keep every feature they already had');
const brandNew = seedExistingAccount(NEW_USER, FRESH);
if (unlockState(brandNew, FRESH).isOpen('progress')) fail('a brand-new account was seeded as established');
else ok('brand-new accounts still start at the bottom of the ladder');
if (seedExistingAccount(brandNew, FRESH) !== null) fail('seedExistingAccount ran twice on the same account');

// ── 6. Locked lists are scoped and student-readable ─────────────────────────
section('"Unlocks next" copy');
const topNext = fresh.locked('');
if (!topNext.length) fail('a fresh account is shown no upcoming top-level unlocks');
if (topNext.some((r) => r.id.includes('/'))) fail("locked('') leaked a sub-view into the top-level list");
if (fresh.locked('sat').some((r) => !r.id.startsWith('sat/'))) fail("locked('sat') leaked a non-SAT destination");
if (!failures) ok(`fresh account is told about ${topNext.length} upcoming pillars, nearest first: ${topNext.map((r) => r.label).join(' → ')}`);

// ── 7. App.jsx actually routes its nav through the gate ─────────────────────
section('App.jsx wiring');
for (const [needle, why] of [
  ['unlockState(', 'App.jsx never computes the unlock state'],
  ['visibleItems(NAV', 'the sidebar/bottom nav is not filtered'],
  ['navMode', 'the Settings escape hatch is not wired'],
]) {
  if (!app.includes(needle)) fail(why);
}
if (!failures) ok('App.jsx filters its nav through featureUnlock');

console.log(failures ? `\n${failures} problem(s)\n` : '\nNav unlocking OK\n');
process.exit(failures ? 1 : 0);
