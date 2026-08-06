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
assert('catalog has at least 200 programs', OPPORTUNITIES.length >= 200, `got ${OPPORTUNITIES.length}`);
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
