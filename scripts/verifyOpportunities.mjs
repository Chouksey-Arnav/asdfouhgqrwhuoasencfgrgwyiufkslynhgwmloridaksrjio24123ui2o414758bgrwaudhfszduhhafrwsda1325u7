#!/usr/bin/env node
// Data-integrity assertions for the Opportunities & Competitions database
// (src/data/opportunities.js). There is no test runner in this repo, so this script IS the test
// suite for the catalog a student browses and tracks from.
//
// What it guards, in order of how badly it hurts when it breaks:
//
//   1. Duplicate/missing ids — the id is the React key AND the dedupe identity of a tracked row.
//      Two entries sharing one id means tracking either marks both as tracked.
//   2. Enum drift — a `type`, `level`, `effort`, `season`, `cost`, or `format` value outside its
//      declared constant is invisible to the filter chips built from those constants, so the
//      entry silently becomes unreachable by browsing.
//   3. Missing prose — a card with no desc/eligibility renders as a name and a blank space, and
//      an entry nobody can evaluate is worse than one that isn't listed.
//   4. The two integrity rules from the file's own header: no `url` field (chapter/state programs
//      vary, a hardcoded link rots or points at the wrong local chapter), and no pay-to-attend
//      "youth summit" products.
//
//   node scripts/verifyOpportunities.mjs
import {
  OPPORTUNITIES, OPPORTUNITY_TYPES, OPPORTUNITY_LEVELS, OPPORTUNITY_SEASONS,
  OPPORTUNITY_COSTS, OPPORTUNITY_FORMATS, OPPORTUNITY_GRADES, fitsGrade, facetCounts,
} from '../src/data/opportunities.js';
import { PATHS } from '../src/data/constants.js';
import {
  INTEREST_THEMES, THEME_BY_ID, EFFORT_APPETITES, COST_STANCES, FORMAT_PREFS,
  buildMatchProfile, matchOpportunities, buildMatchPrompt, describeProfile,
  inferThemesFromUser, themesFromPortfolio, readPrefs, writePrefs, gradeNumberFor, themeReach, entryMatchesTheme,
} from '../src/lib/opportunityMatch.js';

const EFFORTS = ['Open', 'Competitive', 'Elite'];
const TYPES = OPPORTUNITY_TYPES.filter((t) => t !== 'All');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};

// ── 1. Identity ──────────────────────────────────────────────────────────────
const ids = OPPORTUNITIES.map((o) => o.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
assert('every entry has a unique id', dupes.length === 0, `duplicates: ${[...new Set(dupes)].join(', ')}`);
assert('every id is a kebab-case slug', ids.every((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)),
  `bad: ${ids.filter((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id)).join(', ')}`);

const names = OPPORTUNITIES.map((o) => o.name.toLowerCase().trim());
const dupeNames = names.filter((n, i) => names.indexOf(n) !== i);
assert('no two entries share a name', dupeNames.length === 0, `duplicates: ${[...new Set(dupeNames)].join(', ')}`);

// ── 2. Required fields + enums ───────────────────────────────────────────────
for (const o of OPPORTUNITIES) {
  const at = `[${o.id}]`;
  assert(`${at} has a name`, !!o.name?.trim());
  assert(`${at} has an org`, !!o.org?.trim());
  assert(`${at} type is one of ${TYPES.join('/')}`, TYPES.includes(o.type), `got: ${o.type}`);
  assert(`${at} level is a known level`, OPPORTUNITY_LEVELS.includes(o.level), `got: ${o.level}`);
  assert(`${at} effort is a known effort`, EFFORTS.includes(o.effort), `got: ${o.effort}`);
  assert(`${at} has a description of substance`, (o.desc || '').trim().length >= 40);
  assert(`${at} has eligibility guidance`, (o.eligibility || '').trim().length >= 20);
  assert(`${at} has at least one tag`, Array.isArray(o.tags) && o.tags.length > 0);
  // Rule from the data file's header: deliberately NO url field.
  assert(`${at} carries no url`, !('url' in o));
  if (o.pathways) {
    const unknown = o.pathways.filter((p) => !PATHS[p]);
    assert(`${at} pathways all exist in PATHS`, unknown.length === 0, `unknown: ${unknown.join(', ')}`);
  }
  // Optional facets — present values must be in-vocabulary, absent is always fine.
  if (o.season) assert(`${at} season is a known season`, OPPORTUNITY_SEASONS.includes(o.season), `got: ${o.season}`);
  if (o.cost) assert(`${at} cost is a known cost`, OPPORTUNITY_COSTS.includes(o.cost), `got: ${o.cost}`);
  if (o.format) assert(`${at} format is a known format`, OPPORTUNITY_FORMATS.includes(o.format), `got: ${o.format}`);
  if (o.grades) {
    assert(`${at} grades is a non-empty array`, Array.isArray(o.grades) && o.grades.length > 0);
    const bad = (o.grades || []).filter((g) => !OPPORTUNITY_GRADES.includes(g));
    assert(`${at} grades are all 9-12 strings`, bad.length === 0, `got: ${bad.join(', ')}`);
  }
}

// ── 3. Excluded categories ───────────────────────────────────────────────────
// The header commits to excluding for-profit pay-to-attend "youth leadership summits" — the ones
// mailed to teens under a prestigious-sounding name. Catch the best-known ones by name so a
// well-meaning future addition doesn't quietly reintroduce the category.
const BANNED = ['congress of future medical leaders', 'national academy of future physicians', 'nylf', 'envision experience', 'national youth leadership forum'];
for (const o of OPPORTUNITIES) {
  const hay = `${o.name} ${o.org}`.toLowerCase();
  assert(`[${o.id}] is not a pay-to-attend youth summit`, !BANNED.some((b) => hay.includes(b)), `matched: ${o.name}`);
}

// ── 4. Coverage ──────────────────────────────────────────────────────────────
// The database's usefulness is breadth: a student on any pathway, in any grade, at any effort
// level should find something. These are floors, not targets.
// Raised from 200 with the database expansion. A floor is only useful if it
// tracks what the catalog is actually for: a student on any pathway, in any
// grade, with no money, finding something. It goes up when the catalog does,
// and it never comes back down without somebody deciding to lower it.
assert('catalog has at least 300 programs', OPPORTUNITIES.length >= 300, `got ${OPPORTUNITIES.length}`);
for (const type of TYPES) {
  assert(`type "${type}" has entries`, OPPORTUNITIES.some((o) => o.type === type));
}
for (const effort of EFFORTS) {
  const n = OPPORTUNITIES.filter((o) => o.effort === effort).length;
  assert(`effort "${effort}" has at least 15 entries`, n >= 15, `got ${n}`);
}
for (const key of Object.keys(PATHS)) {
  if (key === 'exploring') continue;
  const n = OPPORTUNITIES.filter((o) => (o.pathways || []).includes(key)).length;
  assert(`pathway "${key}" has at least 3 tagged opportunities`, n >= 3, `got ${n}`);
}
// Free options must dominate the entries that declare a cost at all — this catalog exists so a
// student without money still has a list.
const { counts: costCounts, missing: costMissing } = facetCounts(OPPORTUNITIES, 'cost');
const free = (costCounts.Free || 0) + (costCounts['Free + stipend'] || 0) + (costCounts['Paid role'] || 0);
const declared = OPPORTUNITIES.length - costMissing;
assert('most cost-declared entries cost the student nothing', free >= declared * 0.5, `${free}/${declared} free-or-paid`);

// ── 5. Helper behavior ───────────────────────────────────────────────────────
assert('fitsGrade passes entries with no grade restriction', fitsGrade({ id: 'x' }, '9'));
assert('fitsGrade matches a listed grade', fitsGrade({ grades: ['11', '12'] }, 11));
assert('fitsGrade rejects an unlisted grade', !fitsGrade({ grades: ['11', '12'] }, '9'));
assert('fitsGrade passes when no grade is being filtered', fitsGrade({ grades: ['12'] }, null));
const fc = facetCounts([{ cost: 'Free' }, { cost: 'Free' }, {}], 'cost');
assert('facetCounts counts values', fc.counts.Free === 2);
assert('facetCounts reports omissions separately', fc.missing === 1);

// ── 6. The matcher (src/lib/opportunityMatch.js) ─────────────────────────────
// The Opportunities tab's whole promise is that its picks are personal, explainable, and safe to
// act on. Each block below guards one half of that promise: the themes can actually reach the
// catalog, the hard filters are really hard, the ranking really moves when the student changes,
// and the AI prompt can't be handed a program the student wasn't shown.
const themeIds = INTEREST_THEMES.map((t) => t.id);
assert('interest theme ids are unique', new Set(themeIds).size === themeIds.length);
assert('THEME_BY_ID indexes every theme', themeIds.every((id) => THEME_BY_ID[id]));
for (const t of INTEREST_THEMES) {
  assert(`theme "${t.id}" has a label, blurb and color token`, !!t.label && !!t.blurb && !!t.colorKey);
  assert(`theme "${t.id}" keywords are lowercase`, t.keywords.every((k) => k === k.toLowerCase()));
  const reach = themeReach(t.id, OPPORTUNITIES);
  // A theme a student can pick that matches nothing is a dead end in the UI — it silently returns
  // a worse list than picking nothing at all. The floor is 2 rather than something comfortable
  // because the catalog is honestly thin in places (exactly two dental programs, two global-health
  // ones); the tab tells the student when that's the case instead of padding the list.
  assert(`theme "${t.id}" reaches at least 2 programs`, reach >= 2, `reaches ${reach}`);
  assert(`theme "${t.id}" doesn't match the entire catalog`, reach < OPPORTUNITIES.length * 0.75, `reaches ${reach}/${OPPORTUNITIES.length}`);
  const unknownPaths = (t.pathways || []).filter((p) => !PATHS[p]);
  assert(`theme "${t.id}" pathways all exist`, unknownPaths.length === 0, `unknown: ${unknownPaths.join(', ')}`);
}

// Keyword matching is prefix-at-a-word-boundary, not substring. The substring version put brain
// research at the top of a DENTAL student's list, because "dent" is inside "student".
assert('a keyword never matches mid-word',
  !entryMatchesTheme({ name: 'Summer Student Program', org: '', desc: 'For students', eligibility: '', tags: ['residential'] }, 'dental_oral'));
assert('a keyword still matches a longer word it starts',
  entryMatchesTheme({ name: 'Dental Assisting CTE Pathway', org: '', desc: '', eligibility: '', tags: ['dentistry'] }, 'dental_oral')
  && entryMatchesTheme({ name: 'Neuroscience Research Prize', org: '', desc: '', eligibility: '', tags: [] }, 'neuroscience'));
assert('themeReach counts what the catalog really holds', themeReach('dental_oral', OPPORTUNITIES) === OPPORTUNITIES.filter((o) => entryMatchesTheme(o, 'dental_oral')).length);

assert('gradeNumberFor maps junior to 11', gradeNumberFor('junior') === '11');
assert('gradeNumberFor rejects the gap-year stage', gradeNumberFor('gap') === null);
assert('gradeNumberFor rejects nonsense', gradeNumberFor('zzz') === null);

const emptyProfile = buildMatchProfile({ user: {}, snapshot: null, pathwayKey: 'exploring', prefs: {} });
assert('a brand-new student still gets picks', matchOpportunities({ opportunities: OPPORTUNITIES, profile: emptyProfile, count: 6 }).length === 6);

// Onboarding answers become inferred interests, and what's already logged becomes EC interests.
const inferred = inferThemesFromUser({ dreamRole: 'research', whyMedicine: 'science', sciences: ['ap_chem'] });
assert('signup answers infer interests', inferred.includes('research_lab') && inferred.includes('chem_pharm'), inferred.join(','));
assert('an "unsure" student gets no invented interests', inferThemesFromUser({ dreamRole: 'undecided', whyMedicine: 'unsure' }).length === 0);
const ecThemes = themesFromPortfolio({ activities: [{ position: 'Robotics team captain', description: 'Built a prosthetic hand' }] }).themeIds;
assert('portfolio rows surface their own interests', ecThemes.includes('biotech_engineering'), ecThemes.join(','));

// Picking an interest must actually change the answer — otherwise the tuning panel is theater.
const neuroProfile = buildMatchProfile({ user: {}, snapshot: null, pathwayKey: 'physician', prefs: { themeIds: ['neuroscience'] } });
const neuroPicks = matchOpportunities({ opportunities: OPPORTUNITIES, profile: neuroProfile, count: 6 });
const basePicks = matchOpportunities({ opportunities: OPPORTUNITIES, profile: emptyProfile, count: 6 });
assert('picking an interest changes the shortlist', neuroPicks.map((m) => m.item.id).join() !== basePicks.map((m) => m.item.id).join());
assert('a picked interest is cited as the top reason on at least one pick',
  neuroPicks.some((m) => m.reasons.some((r) => r.type === 'passion')));
assert('every pick carries a human reason', neuroPicks.every((m) => typeof m.reason === 'string' && m.reason.length > 15));
// The strongest signal in the model is a choice the student made themselves. If a pathway tag or a
// portfolio gap can outrank it, the tuning panel is decoration: someone picks "dental" and gets a
// research list. Checked for every theme against several pathways, since the pathway bonus applies
// to a large slice of the catalog and is the thing most likely to drown an interest out.
for (const t of INTEREST_THEMES) {
  for (const pathway of ['exploring', 'physician', 'biomedResearch', 'nursing']) {
    const p = buildMatchProfile({ user: {}, snapshot: null, pathwayKey: pathway, prefs: { themeIds: [t.id] } });
    const top = matchOpportunities({ opportunities: OPPORTUNITIES, profile: p, count: 3 })[0];
    assert(`picking "${t.id}" on the ${pathway} pathway leads with an on-theme program`,
      top && entryMatchesTheme(top.item, t.id), `led with: ${top?.item.name}`);
  }
}
assert('every pick carries a 20-99 match score', neuroPicks.every((m) => m.match >= 20 && m.match <= 99));
assert('picks are ordered by score', neuroPicks.every((m, i) => i === 0 || neuroPicks[i - 1].score >= m.score));
assert('no single type dominates the shortlist',
  Object.values(neuroPicks.reduce((acc, m) => ({ ...acc, [m.item.type]: (acc[m.item.type] || 0) + 1 }), {})).every((n) => n <= 2));

// Hard filters must be hard: a student cannot be shown something they told us they can't do.
const freeOnly = buildMatchProfile({ user: {}, snapshot: null, pathwayKey: 'physician', prefs: { costStance: 'free_only' } });
const freePicks = matchOpportunities({ opportunities: OPPORTUNITIES, profile: freeOnly, count: 10 });
assert('cost:free_only never returns a paid program',
  freePicks.every((m) => ['Free', 'Free + stipend', 'Paid role'].includes(m.item.cost)),
  freePicks.filter((m) => !['Free', 'Free + stipend', 'Paid role'].includes(m.item.cost)).map((m) => `${m.item.id}:${m.item.cost}`).join(', '));
const freshman = buildMatchProfile({ user: { gradeStage: 'freshman' }, snapshot: null, pathwayKey: 'physician', prefs: {} });
const freshmanPicks = matchOpportunities({ opportunities: OPPORTUNITIES, profile: freshman, count: 10 });
assert('a freshman is never shown a program that excludes their grade',
  freshmanPicks.every((m) => !m.item.grades?.length || m.item.grades.includes('9')));
const virtualOnly = buildMatchProfile({ user: {}, snapshot: null, pathwayKey: 'physician', prefs: { formatPref: 'Virtual' } });
assert('a format preference never returns the wrong format',
  matchOpportunities({ opportunities: OPPORTUNITIES, profile: virtualOnly, count: 10 })
    .every((m) => !m.item.format || m.item.format === 'Virtual' || m.item.format === 'Varies'));
assert('an already-tracked program never comes back as a recommendation',
  matchOpportunities({ opportunities: OPPORTUNITIES, profile: emptyProfile, count: 6, excludeIds: basePicks.map((m) => m.item.id) })
    .every((m) => !basePicks.some((b) => b.item.id === m.item.id)));

// Preferences round-trip and never accept junk from a stale/corrupt user record.
const prefsUser = writePrefs({ name: 'x' }, { themeIds: ['neuroscience', 'not_a_theme'], effortAppetite: 'elite', costStance: 'nonsense' });
const roundTripped = readPrefs(prefsUser);
assert('saved prefs keep valid interests', roundTripped.themeIds.join() === 'neuroscience');
assert('saved prefs keep a valid appetite', roundTripped.effortAppetite === 'elite');
assert('saved prefs reject an unknown cost stance', roundTripped.costStance === 'any');
assert('writePrefs does not clobber the rest of the user record', prefsUser.name === 'x');
assert('every appetite/cost/format option has an id and label',
  [...EFFORT_APPETITES, ...COST_STANCES, ...FORMAT_PREFS].every((o) => o.id && o.label));

// The prompt is the one place a hallucinated program could reach a student.
const prompt = buildMatchPrompt(neuroProfile, neuroPicks);
assert('the prompt names every shortlisted program', neuroPicks.every((m) => prompt.includes(m.item.name)));
assert('the prompt forbids inventing programs', /never invent/i.test(prompt) && /only ever name programs from the numbered list/i.test(prompt));
// Dates, ages, citizenship rules and money may only come from the structured
// facts block — a model asked about SIMR will otherwise produce a February date
// from memory, and a confidently wrong deadline is worse than no deadline.
assert('the prompt forbids invented deadlines and fees',
  /never state a deadline, fee, age minimum or acceptance rate that is not in the VERIFIED FACTS block/i.test(prompt));
assert('the prompt requires honesty about reaches and cheaper options',
  /say the word "reach"/i.test(prompt) && /cheaper or free option/i.test(prompt));
assert('the prompt describes the student', describeProfile(neuroProfile).every((line) => prompt.includes(line)));
const inferredProfile = buildMatchProfile({ user: { dreamRole: 'research' }, snapshot: null, pathwayKey: 'physician', prefs: {} });
assert('a student who picked nothing is matched on inferred interests', inferredProfile.activeThemeIds.length > 0 && inferredProfile.usingInferredThemes);
assert('the profile description says when interests were inferred rather than chosen',
  describeProfile(inferredProfile).some((l) => /inferred/.test(l)) && describeProfile(neuroProfile).some((l) => /picked by the student/.test(l)));
assert('a student with nothing at all to go on is described honestly, not invented',
  describeProfile(emptyProfile).some((l) => /none picked yet/.test(l)));

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nOpportunities database: ${OPPORTUNITIES.length} programs`);
const byType = TYPES.map((t) => `${t}: ${OPPORTUNITIES.filter((o) => o.type === t).length}`).join(' · ');
console.log(`  ${byType}`);
console.log(`  ${declared} declare a cost (${free} cost the student nothing), ${costMissing} don't list one`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failed assertion(s) (${passed} passed):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n✓ ${passed} assertions passed.`);
