#!/usr/bin/env node
/**
 * Guards the content search (src/lib/contentSearch.js).
 *
 * The nav keyword map has scripts/verifyNavSearch.mjs holding it to three
 * properties, for a reason stated at length there: a search that quietly gets
 * worse is the most expensive kind of regression, because the feature still
 * exists, the build still passes, and nobody's name is on it.
 *
 * Content search has the same failure mode and a wider blast radius, because it
 * is keyed on data that changes for reasons that have nothing to do with this
 * file. A scholarship gets renamed. A combined-degree program closes and moves
 * to MISLISTED_PROGRAMS. A view id is renamed and every record pointing at it
 * becomes a result that navigates nowhere. None of that breaks a test today.
 *
 * So the index is held to five properties, all of which fail the build:
 *
 *   1. IT IS ACTUALLY BUILT. Every source contributes; a catalog that silently
 *      stops being indexed (a renamed export, a thrown import swallowed by the
 *      per-source `safe()` wrapper) is invisible from the outside.
 *   2. EVERY DESTINATION IS REAL. Checked against routes.js and the merged
 *      pages' own section arrays, exactly as the nav map is. A result that
 *      lands on nothing is worse than no result: the student has already
 *      pressed Enter.
 *   3. EVERY FOCUS KIND HAS A PANEL THAT CONSUMES IT. The whole promise of this
 *      feature is that you land ON the record, not near it. A focus kind no
 *      component reads is that promise, silently broken.
 *   4. THE SEARCHES A STUDENT ACTUALLY TYPES FIND THE RIGHT RECORD. Real
 *      queries with the record each must return first. This is the assertion
 *      with an opinion in it: it is the specification of what the search is
 *      for.
 *   5. NOTHING IS OFFERED TWICE. The catalogs overlap by design; the palette
 *      must not.
 *
 * Run by `npm run verify:content-search`, wired into `npm run build`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import path from 'node:path';

register('./_appResolve.mjs', import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const { TABS, SUBVIEWS } = await import('../src/lib/routes.js');
const { loadContentIndex, searchContent, scoreContent, FOCUS_KINDS } = await import('../src/lib/contentSearch.js');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(detail ? `${label}\n      ${detail}` : label);
};
const section = (name) => console.log(`\n${name}`);

const index = await loadContentIndex();

// ─────────────────────────────────────────────────────────────────────────────
section('1. Every catalog is actually in the index');

const groupCounts = index.reduce((acc, e) => { acc[e.group] = (acc[e.group] || 0) + 1; return acc; }, {});
// Floors, not exact counts: the catalogs grow, and a test that fails when
// someone adds a scholarship is a test people delete. These are set low enough
// that only a source going dark trips them, which is the failure that matters —
// loadContentIndex() swallows a throwing source on purpose so one bad import
// degrades the search rather than breaking the palette, and this is what makes
// that degradation visible instead of silent.
for (const [group, floor] of [
  ['Scholarships', 100], ['Opportunities', 200], ['Combined degrees', 60],
  ['Colleges', 100], ['Lessons', 100], ['Flashcards', 30],
]) {
  assert(`the ${group} catalog is indexed`, (groupCounts[group] || 0) >= floor,
    `only ${groupCounts[group] || 0} entries, expected at least ${floor} — did a source rename an export, or is an import throwing?`);
}
assert('the index is one flat list of well-formed entries',
  index.every((e) => e.id && e.label && e.dest && e.where && Array.isArray(e.keywords) && e.focus?.kind),
  `${index.filter((e) => !(e.id && e.label && e.dest && e.where && Array.isArray(e.keywords) && e.focus?.kind)).slice(0, 3).map((e) => e.id || e.label).join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────────
section('2. Every result navigates somewhere real');

// The merged Portfolio pages each declare a sections array, and a section is a
// real destination ('portfolio/applying:aid'). Parsed from the source rather
// than copied, for the same reason verifyNavSearch.mjs parses them: a copy
// stops being true the first time somebody renames a section.
function sectionsOf(file, exportName) {
  const src = read(file);
  const start = src.indexOf(`export const ${exportName} = [`);
  return [...src.slice(start, src.indexOf('\n];', start)).matchAll(/\{ id: '([^']+)',\s*ic: \w+,\s*label: '([^']+)'/g)]
    .map((m) => m[1]);
}
const validIds = new Set(TABS);
for (const [tab, cfg] of Object.entries(SUBVIEWS)) for (const id of cfg.ids) validIds.add(`${tab}/${id}`);
for (const [view, exportName, file] of [
  ['portfolio/resume', 'RESUME_SECTIONS', 'src/components/ActivitiesResumePanel.jsx'],
  ['portfolio/applying', 'APPLYING_SECTIONS', 'src/components/portfolio/ApplyingPanel.jsx'],
]) {
  const ids = sectionsOf(file, exportName);
  assert(`${exportName} was found`, ids.length >= 4, `${ids.length}`);
  for (const id of ids) validIds.add(`${view}:${id}`);
}

const destinations = [...new Set(index.map((e) => e.dest))];
for (const dest of destinations) {
  assert(`"${dest}" is a real destination`, validIds.has(dest),
    'not in routes.js TABS/SUBVIEWS or a merged page\'s sections — this is a search result that navigates nowhere');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Every focus kind is consumed by a panel');

// A focus kind is a promise that the landing screen will open the exact card.
// Nothing about the app breaks if it is not kept — the student simply arrives
// on a page of ninety cards, which is the wall this feature exists to remove.
const componentSrc = (() => {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(path.join(ROOT, dir))) {
      const rel = path.join(dir, e);
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(jsx?|mjs)$/.test(e)) out.push(read(rel));
    }
  };
  walk('src');
  return out.join('\n');
})();

const kindsUsed = new Set(index.map((e) => e.focus.kind));
for (const kind of kindsUsed) {
  assert(`"${kind}" is a declared focus kind`, FOCUS_KINDS.includes(kind),
    `not in FOCUS_KINDS — add it there, with a note about which panel reads it`);
  if (kind === 'none') continue;
  assert(`"${kind}" is asked for somewhere in App.jsx`, componentSrc.includes(`focusFor('${kind}')`),
    'no App.jsx render site passes this focus down, so nothing will ever act on it');
}
// The receiving end: a panel that takes a focus but never reveals the card has
// done the easy half. Every consumer must use the shared hook, which is what
// puts the ref on the card and scrolls to it.
assert('the panels use the shared focus hook',
  (componentSrc.match(/useSearchFocus\(/g) || []).length >= 5,
  'fewer than five panels consume a focus — a kind was added without a receiver');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The searches a student actually types land on the right record');

/**
 * Every one of these returned NOTHING before content search existed. They are
 * the specification: names heard from a counselor, half-remembered out of
 * order, typed with the wrong punctuation or none at all.
 */
const SEARCHES = [
  // The name a counselor said out loud this morning
  ['coca cola', /Coca-Cola Scholars/],
  ['coca-cola', /Coca-Cola Scholars/],
  ['questbridge', /QuestBridge/],
  ['jack kent cooke', /Jack Kent Cooke/],
  // Competitions, which students name by nickname
  ['regeneron', /Regeneron/],
  ['brain bee', /Brain Bee/],
  ['isef', /ISEF|Science and Engineering Fair/],
  ['simr', /SIMR|Stanford Institutes of Medicine/],
  // Combined degrees — the whole reason a ninth-grader is on this page
  ['drexel', /Drexel/],
  // A program that closed in 2020 and is still recommended in guidebooks. The
  // student who searches it must find the sentence saying it is gone; finding
  // nothing teaches them their cousin was right.
  ['hpme', /HPME|Honors Program in Medical Education/],
  // Service commitments, named by what they do rather than what they are called
  ['nhsc', /NHSC/],
  ['rotc', /ROTC/],
  // Colleges
  ['johns hopkins', /Johns Hopkins/],
  // Out of order, which is how people type a name they heard rather than read
  ['merit national', /National Merit/],
];

// Study material found by the words a student remembers from CLASS rather than
// by the title of the lesson — "Punnett squares" is a learning objective, not a
// lesson name, and the lesson that teaches it is called "AP Biology Review".
for (const [query, group] of [['punnett', 'Lessons'], ['anatomy', 'Lessons']]) {
  const top = searchContent(query, index)[0];
  assert(`"${query}" finds study material`, top?.group === group,
    top ? `got "${top.label}" in ${top.group}` : 'no results at all');
}

for (const [query, want] of SEARCHES) {
  const results = searchContent(query, index);
  const top = results[0]?.label;
  assert(`"${query}" → ${want}`, top && want.test(top),
    top ? `got "${top}" (then ${results.slice(1, 3).map((r) => `"${r.label}"`).join(', ') || 'nothing'})` : 'no results at all');
}

// Each of these must land on the screen that actually holds it, not merely on
// something with the right name. The destination is the half of a search result
// the student cannot see until they have already committed to it.
for (const [query, dest] of [
  ['coca cola', 'portfolio/applying:aid'],
  ['regeneron', 'portfolio/opportunities'],
  ['hpme', 'portfolio/applying:combined'],
  ['johns hopkins', 'portfolio/applying:colleges'],
]) {
  const top = searchContent(query, index)[0];
  assert(`"${query}" opens ${dest}`, top?.dest === dest, `got ${top?.dest || 'nothing'}`);
}

// Nonsense finds nothing, rather than confidently finding something. A palette
// that always returns a first result trains people to press Enter on it.
for (const q of ['zzzzqx', 'qqqqqqq']) {
  assert(`"${q}" returns nothing`, searchContent(q, index).length === 0,
    `got ${searchContent(q, index).slice(0, 3).map((r) => r.label).join(', ')}`);
}
// One letter is not a search. Without this floor a student who taps the box and
// brushes a key gets ten confident answers to a question they did not ask.
assert('a single letter returns nothing', searchContent('a', index).length === 0);

// ─────────────────────────────────────────────────────────────────────────────
section('5. Nothing is offered twice, and the scale is shared with the nav');

const byLabel = new Map();
for (const e of index) {
  const key = e.label.toLowerCase().replace(/[^a-z0-9]/g, '');
  byLabel.set(key, [...(byLabel.get(key) || []), e]);
}
const dupes = [...byLabel.values()].filter((v) => v.length > 1);
assert('no two entries share a name', dupes.length === 0,
  dupes.slice(0, 3).map((v) => `"${v[0].label}" appears in ${v.map((e) => e.group).join(' and ')}`).join('; '));

// One prolific catalog must not bury the rest. 90 scholarships would otherwise
// crowd out the one combined-degree program that was the better answer, purely
// by weight of numbers.
const spread = searchContent('scholarship', index);
const perGroup = spread.reduce((acc, e) => { acc[e.group] = (acc[e.group] || 0) + 1; return acc; }, {});
assert('no single catalog takes over the results', Object.values(perGroup).every((n) => n <= 4),
  JSON.stringify(perGroup));

// A record and a screen are ranked on ONE scale so the palette can merge them
// into one ordered list — that is what makes Enter mean the same thing every
// time. The record sits a fixed band below an equally good screen, so typing a
// screen's exact name can never open a record instead.
const exactRecord = scoreContent('essays', { label: 'Essays', sub: '', keywords: [] });
const exactScreen = 1000; // scoreDestination's exact-label tier, see navMap.js
assert('an exact screen name outranks an identically-named record', exactScreen > exactRecord,
  `${exactScreen} vs ${exactRecord}`);
assert('an exact record name still outranks a screen the query merely starts',
  exactRecord > 900 - 'Essay workspace'.length, `${exactRecord}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${failures.length ? '✗' : '✓'} ${passed} checks passed, ${failures.length} failed.`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`  ${index.length} records indexed across ${Object.keys(groupCounts).length} catalogs.\n`);
