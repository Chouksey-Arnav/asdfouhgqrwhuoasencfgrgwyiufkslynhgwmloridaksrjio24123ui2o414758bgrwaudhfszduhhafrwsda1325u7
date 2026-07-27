// Assertions on the tracking layer (src/lib/trackingCatalog.js). There is no test runner in this
// repo, so this script IS the test suite for the code that decides what "Track" actually saves.
//
// Two invariants matter most, because breaking either one silently loses or duplicates a student's
// tracked school / scholarship / program:
//
//   1. catalogDedupeKey(entry) must equal rowDedupeKey(builtRow). These are computed in different
//      places — the catalog key marks a database entry as already-tracked, the row key reads an
//      existing table row — and if they ever disagree, every tracked item reads as untracked
//      forever and re-tracks on each tap.
//   2. Nothing curated is dropped on the way into a row: the org, eligibility, and description a
//      student saw before tapping Track have to survive into the saved row.
//
//   node scripts/verifyTracking.mjs
import {
  normalizeKey, rowDedupeKey, catalogDedupeKey, trackedKeySet, findExistingByKey,
  scholarshipRowFromCatalog, scholarshipRowFromOpportunity, activityRowFromOpportunity,
  activityTypeForOpportunity, resourceForOpportunity, trackTargetForOpportunity,
  needsDeadlineDate,
} from '../src/lib/trackingCatalog.js';
import { SCHOLARSHIPS } from '../src/data/scholarships.js';
import { OPPORTUNITIES } from '../src/data/opportunities.js';

// The activity vocabulary the Portfolio editor offers (ACT_TYPES in ActivitiesResumePanel.jsx).
// Duplicated here on purpose: this script's whole job is to catch the two drifting apart.
const ACT_TYPES = ['Clinical/Shadowing', 'Patient Care (paid)', 'Health Club/HOSA', 'Leadership',
  'Volunteering', 'Research', 'Athletics', 'Arts & Performance', 'Work Experience',
  'Clubs & Organizations', 'Other'];

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) { passed++; return; }
  failures.push(`${label}\n      expected: ${expected}\n      actual:   ${actual}`);
}
function assert(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
}

// ── normalizeKey ─────────────────────────────────────────────────────────────
check('normalizeKey is case-insensitive', normalizeKey('Coca-Cola Scholars'), normalizeKey('coca cola scholars'));
check('normalizeKey ignores punctuation', normalizeKey("Jack Kent Cooke Foundation"), normalizeKey('Jack Kent Cooke Foundation!'));
check('normalizeKey collapses whitespace', normalizeKey('  National   Merit  '), 'national merit');
check('normalizeKey normalizes curly apostrophes', normalizeKey('Dean’s List'), normalizeKey("Dean's List"));
check('normalizeKey expands ampersands', normalizeKey('Science & Engineering'), 'science and engineering');
assert('normalizeKey distinguishes genuinely different names',
  normalizeKey('Gates Scholarship') !== normalizeKey('Coca-Cola Scholars'));

// ── Invariant 1: catalog key === row key, across the entire curated corpus ───
for (const s of SCHOLARSHIPS) {
  const row = scholarshipRowFromCatalog(s);
  check(`scholarship key round-trips: ${s.id}`, rowDedupeKey('scholarships', row), catalogDedupeKey('scholarships', s));
}
for (const o of OPPORTUNITIES) {
  const { resource, row } = trackTargetForOpportunity(o);
  check(`opportunity key round-trips: ${o.id}`, rowDedupeKey(resource, row), catalogDedupeKey(resource, o));
}

// ── Invariant 2: nothing curated is dropped ──────────────────────────────────
for (const s of SCHOLARSHIPS) {
  const row = scholarshipRowFromCatalog(s);
  check(`scholarship keeps its name: ${s.id}`, row.name, s.name);
  assert(`scholarship keeps its org in notes: ${s.id}`, row.notes.includes(s.org));
  if (s.eligibility) assert(`scholarship keeps its eligibility: ${s.id}`, row.notes.includes(s.eligibility));
  if (s.description) assert(`scholarship keeps its description: ${s.id}`, row.notes.includes(s.description));
  if (s.deadline) assert(`scholarship keeps its published deadline prose: ${s.id}`, row.notes.includes(s.deadline));
  if (s.amount) assert(`scholarship keeps its published amount prose: ${s.id}`, row.notes.includes(s.amount));
  assert(`scholarship carries the confirm-on-official-site warning: ${s.id}`, /confirm current/i.test(row.notes));
}

for (const o of OPPORTUNITIES.filter(x => resourceForOpportunity(x) === 'activities')) {
  const row = activityRowFromOpportunity(o);
  check(`opportunity keeps its name: ${o.id}`, row.position, o.name);
  check(`opportunity keeps its org in the organization column: ${o.id}`, row.organization, o.org || '');
  assert(`opportunity keeps its description: ${o.id}`, row.description.includes(o.desc));
  if (o.eligibility) assert(`opportunity keeps its eligibility: ${o.id}`, row.description.includes(o.eligibility));
  assert(`opportunity keeps its catalog type: ${o.id}`, row.description.includes(o.type));
}

// ── The activity-type mapping must land inside the editor's own vocabulary ───
// An activity_type outside ACT_TYPES has no matching <option> in the activity editor's select,
// so opening a tracked opportunity for editing silently reassigns it to whatever the select falls
// back to. This is the exact bug the mapping exists to fix — assert it stays fixed.
for (const o of OPPORTUNITIES) {
  const t = activityTypeForOpportunity(o);
  assert(`activity type for ${o.id} is a real ACT_TYPE`, ACT_TYPES.includes(t), `got "${t}"`);
}

// ── Scholarship-typed opportunities route to the scholarship tracker ────────
const scholarshipOpps = OPPORTUNITIES.filter(o => o.type === 'Scholarship');
assert('the opportunities catalog still contains Scholarship-typed entries to route', scholarshipOpps.length > 0);
for (const o of scholarshipOpps) {
  check(`${o.id} routes to the scholarship tracker`, resourceForOpportunity(o), 'scholarships');
  const row = scholarshipRowFromOpportunity(o);
  check(`${o.id} builds a scholarship row`, row.name, o.name);
  check(`${o.id} starts as researching`, row.status, 'researching');
}
for (const o of OPPORTUNITIES.filter(x => x.type !== 'Scholarship')) {
  check(`${o.id} routes to the activity tracker`, resourceForOpportunity(o), 'activities');
}

// ── Nothing is invented ──────────────────────────────────────────────────────
// The catalogs record amounts/deadlines as prose ranges. Parsing those into the typed columns
// would put a fabricated countdown in front of a student, so both must stay null on every entry.
for (const s of SCHOLARSHIPS) {
  check(`scholarship ${s.id} does not fabricate a deadline date`, scholarshipRowFromCatalog(s).deadline, null);
  check(`scholarship ${s.id} does not fabricate an amount`, scholarshipRowFromCatalog(s).amount, null);
}

// ── Dedupe against already-tracked rows ──────────────────────────────────────
const sample = SCHOLARSHIPS[0];
const tracked = [{ id: 'row-1', name: sample.name, status: 'researching' }];
const keys = trackedKeySet('scholarships', tracked);
assert('an already-tracked scholarship is recognized', keys.has(catalogDedupeKey('scholarships', sample)));
assert('a differently-cased/spaced copy is still recognized',
  trackedKeySet('scholarships', [{ name: `  ${sample.name.toUpperCase()} ` }]).has(catalogDedupeKey('scholarships', sample)));
check('findExistingByKey returns the tracked row',
  findExistingByKey('scholarships', tracked, catalogDedupeKey('scholarships', sample))?.id, 'row-1');
check('findExistingByKey returns undefined for an untracked item',
  findExistingByKey('scholarships', tracked, normalizeKey('Some Scholarship Nobody Tracked')), undefined);

// Activities dedupe on position+organization, so two different roles at the same org stay distinct.
const actA = activityRowFromOpportunity(OPPORTUNITIES[0]);
const actB = { ...actA, position: 'A Completely Different Role' };
assert('two roles at the same org are not treated as duplicates',
  rowDedupeKey('activities', actA) !== rowDedupeKey('activities', actB));

// Deadlines dedupe on title+date, so the same title at a new date is a new deadline.
check('deadline key includes the date',
  rowDedupeKey('deadlines', { title: 'X — EA Deadline', due_date: '2026-11-01' }),
  `${normalizeKey('X — EA Deadline')}|2026-11-01`);
assert('the same deadline title on a different date is not a duplicate',
  rowDedupeKey('deadlines', { title: 'X', due_date: '2026-11-01' }) !== rowDedupeKey('deadlines', { title: 'X', due_date: '2027-11-01' }));

// ── needsDeadlineDate ────────────────────────────────────────────────────────
const mixed = [
  { id: 1, name: 'No date', status: 'researching', deadline: null },
  { id: 2, name: 'Has date', status: 'researching', deadline: '2026-01-15' },
  { id: 3, name: 'Awarded, no date', status: 'awarded', deadline: null },
  { id: 4, name: 'Denied, no date', status: 'denied', deadline: null },
  { id: 5, name: 'Applying, no date', status: 'applying', deadline: null },
];
check('needsDeadlineDate finds only actionable dateless scholarships', needsDeadlineDate(mixed).map(s => s.id).join(','), '1,5');
check('needsDeadlineDate tolerates an empty list', needsDeadlineDate([]).length, 0);
check('needsDeadlineDate tolerates undefined', needsDeadlineDate(undefined).length, 0);

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\ntracking: ${passed} assertions passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:\n' + failures.map(f => `  ✗ ${f}`).join('\n'));
  process.exit(1);
}
console.log('✓ scholarship + opportunity tracking is lossless, deduped, and invents nothing\n');
