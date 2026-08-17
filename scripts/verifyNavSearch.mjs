#!/usr/bin/env node
/**
 * Guards the quick-jump search (src/lib/navMap.js).
 *
 * A keyword map is the most quietly rot-prone thing in a codebase. Nothing
 * breaks when a view is renamed and its keywords keep pointing at the old id —
 * the build passes, the app runs, and the search just gets worse, one rename at
 * a time, with nobody's name on it. Nothing breaks when a keyword is added that
 * matches five screens either; the results simply get less useful.
 *
 * So the map is held to three properties, all of which fail the build:
 *
 *   1. EVERY ID NAMES A REAL DESTINATION. Checked against routes.js (the
 *      router's own TABS/SUBVIEWS) and against the résumé sections, not against
 *      a copy of them.
 *   2. THE SEARCHES A STUDENT ACTUALLY TYPES FIND THE RIGHT SCREEN. A list of
 *      real queries with the destination each one must return FIRST. This is
 *      the assertion that has an opinion: it is the specification of what the
 *      search is for, and it fails loudly the moment a rename or a new keyword
 *      breaks one.
 *   3. THE RANKING RULES HOLD. A label match always beats a keyword match; a
 *      keyword match always beats a fuzzy one. Without this, one carelessly
 *      broad keyword can put the wrong screen above an exact label match, and
 *      the student has already pressed Enter by the time they see it.
 *
 * Run by `npm run verify:nav-search`, wired into `npm run build`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const { TABS, SUBVIEWS } = await import('../src/lib/routes.js');
const { NAV_KEYWORDS, KEYWORD_IDS, scoreDestination, searchNav } = await import('../src/lib/navMap.js');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(detail ? `${label}\n      ${detail}` : label);
};
const section = (name) => console.log(`\n${name}`);

// ─────────────────────────────────────────────────────────────────────────────
section('1. Every keyword points at a screen that exists');

const app = read('src/App.jsx');
const resumePanel = read('src/components/ActivitiesResumePanel.jsx');
const RESUME_SECTIONS = [...resumePanel.slice(
  resumePanel.indexOf('export const RESUME_SECTIONS = ['),
  resumePanel.indexOf('\n];', resumePanel.indexOf('export const RESUME_SECTIONS = [')),
).matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]);
assert('the résumé sections were found', RESUME_SECTIONS.length >= 4, `${RESUME_SECTIONS.length}`);

const validIds = new Set(TABS);
for (const [tab, cfg] of Object.entries(SUBVIEWS)) {
  for (const id of cfg.ids) validIds.add(`${tab}/${id}`);
}
for (const s of RESUME_SECTIONS) validIds.add(`portfolio/resume:${s}`);

for (const id of KEYWORD_IDS) {
  assert(`"${id}" is a real destination`, validIds.has(id),
    'not in routes.js TABS/SUBVIEWS or RESUME_SECTIONS — a keyword pointing at a screen that does not exist is a search result that goes nowhere');
}

// Keywords must not simply restate the label, which the scorer already matches.
const LABELS = {};
for (const [constName, tab] of [['NAV', null], ['PREP_SUBNAV', 'prep'], ['PORTFOLIO_SUBNAV', 'portfolio'],
  ['ROADMAP_SUBNAV', 'roadmap'], ['PROGRESS_SUBNAV', 'progress'], ['SETTINGS_SUBNAV', 'settings'], ['SAT_SUBNAV', 'sat']]) {
  const start = app.indexOf(`const ${constName} = [`);
  if (start === -1) continue;
  const block = app.slice(start, app.indexOf('\n];', start));
  for (const m of block.matchAll(/\{id:'([^']+)',ic:\w+,label:'([^']+)'/g)) {
    LABELS[tab ? `${tab}/${m[1]}` : m[1]] = m[2];
  }
}
assert('the nav labels were found', Object.keys(LABELS).length > 25, `${Object.keys(LABELS).length}`);

for (const [id, words] of Object.entries(NAV_KEYWORDS)) {
  const label = (LABELS[id] || '').toLowerCase();
  if (!label) continue;
  for (const w of words) {
    assert(`"${id}" does not restate its own label in "${w}"`, w.toLowerCase() !== label,
      'the scorer already matches labels — a keyword that repeats one is dead weight');
  }
}

// A keyword that matches most of the app makes the search worse. Three or more
// destinations sharing one exact keyword is the threshold where it stops
// disambiguating anything.
const byWord = new Map();
for (const [id, words] of Object.entries(NAV_KEYWORDS)) {
  for (const w of words) {
    const k = w.toLowerCase();
    byWord.set(k, [...(byWord.get(k) || []), id]);
  }
}
for (const [word, owners] of byWord) {
  assert(`"${word}" does not point at three or more screens at once`, owners.length <= 2,
    `claimed by ${owners.join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The searches a student actually types land on the right screen');

// The palette's real command list, reconstructed: every destination with the
// label the nav gives it and the keywords this map gives it. Order matches the
// order App.jsx builds them in, because searchNav is stable within a score and
// that order is the tiebreak.
const commands = [
  ...TABS.filter((t) => LABELS[t]).map((t) => ({ dest: t, label: LABELS[t], group: 'Jump to', keywords: NAV_KEYWORDS[t] || [] })),
  ...Object.entries(SUBVIEWS).flatMap(([tab, cfg]) => cfg.ids
    .filter((v) => LABELS[`${tab}/${v}`])
    .map((v) => ({ dest: `${tab}/${v}`, label: LABELS[`${tab}/${v}`], group: tab, keywords: NAV_KEYWORDS[`${tab}/${v}`] || [] }))),
  ...RESUME_SECTIONS.map((s) => ({ dest: `portfolio/resume:${s}`, label: s, group: 'portfolio', keywords: NAV_KEYWORDS[`portfolio/resume:${s}`] || [] })),
];

/**
 * Every one of these returned NOTHING before the keyword map existed, or
 * returned the wrong screen first. They are the specification.
 */
const SEARCHES = [
  // The words a student uses for a deadline
  ['deadlines', 'portfolio/milestones'],
  ['due dates', 'portfolio/milestones'],
  ['when is it due', 'portfolio/milestones'],
  // Money
  ['fafsa', 'portfolio/aid'],
  ['paying for college', 'portfolio/aid'],
  ['scholarships', 'portfolio/aid'],
  // The record of what they have done
  ['gpa', 'portfolio/resume'],
  ['grades', 'portfolio/resume'],
  ['extracurriculars', 'portfolio/resume'],
  ['shadowing', 'portfolio/resume:clinical'],
  ['hospital hours', 'portfolio/resume:clinical'],
  ['science fair', 'portfolio/resume:research'],
  ['cpr', 'portfolio/resume:credentials'],
  // Applications
  ['personal statement', 'portfolio/essays'],
  ['common app essay', 'portfolio/essays'],
  ['universities', 'portfolio/colleges'],
  ['where to apply', 'portfolio/colleges'],
  ['letters of rec', 'portfolio/recommenders'],
  ['will i get in', 'portfolio/calc'],
  // Study
  ['anki', 'prep/flashcards'],
  ['spaced repetition', 'prep/flashcards'],
  ['chatbot', 'prep/coach'],
  ['videos', 'prep/library'],
  // Settings — the ones support replies point people at
  ['dark mode', 'settings/appearance'],
  ['font size', 'settings/appearance'],
  ['parents', 'settings/family'],
  ['mum', 'settings/family'],
  ['log out', 'settings/account'],
  ['password', 'settings/account'],
  ['delete my data', 'settings/data'],
  // The two planning surfaces, which people describe by what they ask them
  ['what do i do today', 'plans'],
  ['my whole year', 'roadmap/year'],
  ['badges', 'progress/achievements'],
  // And the plain ones, which must not have been broken by any of the above
  ['essays', 'portfolio/essays'],
  ['flashcards', 'prep/flashcards'],
  ['roadmap', 'roadmap'],
  ['settings', 'settings'],
];

for (const [query, want] of SEARCHES) {
  const results = searchNav(query, commands);
  const top = results[0]?.dest;
  assert(`"${query}" → ${want}`, top === want,
    top ? `got ${top} (then ${results.slice(1, 4).map((r) => r.dest).join(', ') || 'nothing'})` : 'no results at all');
}

// A typo still finds it. Fuzzy matching is the lowest tier on purpose, so this
// is a small claim deliberately: letters in order, nothing cleverer.
for (const [query, want] of [['flshcards', 'prep/flashcards'], ['recomenders', 'portfolio/recommenders']]) {
  const top = searchNav(query, commands)[0]?.dest;
  assert(`the typo "${query}" still finds ${want}`, top === want, `got ${top || 'nothing'}`);
}

// And nonsense finds nothing, rather than confidently finding something. A
// palette that always returns a first result trains people to press Enter on it.
for (const q of ['zzzzqx', 'qqqqqqq']) {
  assert(`"${q}" returns nothing`, searchNav(q, commands).length === 0,
    `got ${searchNav(q, commands).slice(0, 3).map((r) => r.dest).join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The ranking rules hold');

const labelMatch = scoreDestination('essays', { label: 'Essays', keywords: [] });
const keywordMatch = scoreDestination('essays', { label: 'Something Else', keywords: ['essays'] });
const fuzzyMatch = scoreDestination('essays', { label: 'Extra Special Series And Yearly Statements', keywords: [] });
assert('an exact label beats an exact keyword', labelMatch > keywordMatch, `${labelMatch} vs ${keywordMatch}`);
assert('an exact keyword beats a fuzzy label', keywordMatch > fuzzyMatch, `${keywordMatch} vs ${fuzzyMatch}`);
assert('a fuzzy match still scores above nothing', fuzzyMatch > 0);
assert('two letters are not enough to fuzzy-match', scoreDestination('ex', { label: 'Extra Special', keywords: [] }) === 0
  || scoreDestination('ex', { label: 'Extra Special', keywords: [] }) >= 600,
  'a two-letter query must either prefix-match or not match — subsequence matching on two letters matches everything');
assert('an empty query shows everything', scoreDestination('', { label: 'Anything' }) > 0);
assert('the shorter of two prefix matches ranks first',
  scoreDestination('pro', { label: 'Progress' }) > scoreDestination('pro', { label: 'Progress Reports And Summaries' }));

// ─────────────────────────────────────────────────────────────────────────────
section('4. The palette is actually wired to all of this');
assert('App.jsx ranks with searchNav', /searchNav\(/.test(app));
assert('commands carry their keywords', /keywords:keywordsFor\(/.test(app));
assert('the palette leads with recent screens', /recentCmds/.test(app) && /pushRecent\(/.test(app));
assert('recents are recorded from the router, not from the palette',
  /route\?\.tab[\s\S]{0,400}pushRecent/.test(app),
  'recording only palette clicks makes the recents list circular — it must follow every route into a screen');
assert('locked screens are offered rather than hidden behind "no matches"',
  /lockedCmds/.test(app) && /Not shown yet/.test(app));
assert('and each locked row says what opens it', /cmd\.hint/.test(app));

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ Nav search verification FAILED — ${failures.length} problem(s), ${passed} assertions passed:\n`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`✓ Nav search verification passed — ${passed} assertions.`);
console.log(`  ${KEYWORD_IDS.length} destinations carry keywords, ${byWord.size} distinct words`);
console.log(`  ${SEARCHES.length} real student searches land on the right screen first`);
