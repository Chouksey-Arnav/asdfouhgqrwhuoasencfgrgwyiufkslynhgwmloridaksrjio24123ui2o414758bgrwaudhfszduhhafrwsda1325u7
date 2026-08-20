#!/usr/bin/env node
// Data-integrity and behavior assertions for the structured programs layer:
// src/data/opportunityPrograms.js + src/lib/opportunityEligibility.js.
//
// There is no test runner in this repo, so this script IS the test suite for
// the part of Opportunities that makes factual claims about the real world.
// What it guards, in order of how badly it hurts when it breaks:
//
//   1. A wrong or invented eligibility rule. A student who is told they qualify
//      and does not spends a week on an application they cannot submit; a
//      student told they do not qualify and does loses a program entirely.
//   2. A deadline that renders as more certain than it is. Every non-exact date
//      has to carry its precision, and the next occurrence has to roll forward
//      to next cycle once this cycle's has passed — the April student is the
//      whole reason this feature exists.
//   3. Alerts that fire in the past, or a saved program with no alerts at all.
//   4. Tier drift. In particular: the pay-to-play tier must stay OUT of the
//      browsable catalog (which excludes pay-to-attend products by design) and
//      must keep saying, in words, why it costs what it costs.
//   5. Ids that do not line up with the browsable catalog, which would fork one
//      program into two.
//
//   node scripts/verifyOpportunityPrograms.mjs
import {
  PROGRAMS, PROGRAM_TIERS, TIER_BY_ID, DEADLINE_PRECISIONS, COST_MODELS,
  HOSA_EVENTS, HOSA_CATEGORIES, HOSA_EVENTS_BY_CAT, HOSA_LEVELS,
} from '../src/data/opportunityPrograms.js';
import { OPPORTUNITIES, OPPORTUNITY_TYPES } from '../src/data/opportunities.js';
import {
  evaluateEligibility, nextDeadline, milestoneRowsFor, ALERT_OFFSETS,
  isFreeOrFunded, costLabel, verifiedLabel, studentEligibilityFacts, GENERIC_ALTERNATIVE,
} from '../src/lib/opportunityEligibility.js';
import { PATHS } from '../src/data/constants.js';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};

const TYPES = OPPORTUNITY_TYPES.filter(t => t !== 'All');
const catalogIds = new Set(OPPORTUNITIES.map(o => o.id));
const catalogById = Object.fromEntries(OPPORTUNITIES.map(o => [o.id, o]));

// ── 1. Identity and shape ────────────────────────────────────────────────────
const ids = PROGRAMS.map(p => p.id);
assert('every program id is unique', new Set(ids).size === ids.length,
  `duplicates: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);

for (const p of PROGRAMS) {
  const at = `[${p.id}]`;
  assert(`${at} has a name`, !!p.name?.trim());
  assert(`${at} has an organizing body`, !!p.org?.trim());
  assert(`${at} type is a catalog type`, TYPES.includes(p.type), `got: ${p.type}`);
  assert(`${at} is in a known tier`, !!TIER_BY_ID[p.tier], `got: ${p.tier}`);
  assert(`${at} names at least one pathway`, Array.isArray(p.pathways) && p.pathways.length > 0);
  assert(`${at} pathways all exist in PATHS`, (p.pathways || []).every(k => PATHS[k]),
    `unknown: ${(p.pathways || []).filter(k => !PATHS[k]).join(', ')}`);
  assert(`${at} explains why it matters`, (p.why || '').trim().length >= 40);
  assert(`${at} states who can apply`, (p.eligibility || '').trim().length >= 30);
  assert(`${at} carries a last-verified date`, /^\d{4}-\d{2}-\d{2}$/.test(p.verified || ''));
  assert(`${at} verified date is not in the future`, new Date(`${p.verified}T00:00:00`) <= new Date());
  assert(`${at} cost model is known`, COST_MODELS.includes(p.cost?.model), `got: ${p.cost?.model}`);
  assert(`${at} cost carries a note`, (p.cost?.note || '').trim().length > 0);
  assert(`${at} a free program never also carries a price`,
    !(p.cost?.model === 'free' && p.cost?.usd > 0));
  assert(`${at} citizenship is a known value`, p.citizenship == null || ['us', 'us_or_pr'].includes(p.citizenship));
  assert(`${at} selectivity is known`, ['elite', 'competitive', 'open'].includes(p.selectivity), `got: ${p.selectivity}`);
  if (p.deadline) {
    assert(`${at} deadline precision is known`, DEADLINE_PRECISIONS.includes(p.deadline.precision), `got: ${p.deadline.precision}`);
    assert(`${at} deadline carries a note a student can act on`, (p.deadline.note || '').trim().length >= 15);
    assert(`${at} an exact deadline names a day`, p.deadline.precision !== 'exact' || p.deadline.day != null);
    assert(`${at} a non-rolling deadline names a month or says it varies`,
      p.deadline.precision === 'rolling' || p.deadline.precision === 'varies' || p.deadline.month != null);
  }
  if (p.url) assert(`${at} url is https`, /^https:\/\//.test(p.url), p.url);
  // Grade/age gates have to be internally consistent or the badge lies.
  if (p.minGrade != null && p.maxGrade != null) assert(`${at} minGrade <= maxGrade`, p.minGrade <= p.maxGrade);
  if (p.minAge != null && p.maxAge != null) assert(`${at} minAge <= maxAge`, p.minAge <= p.maxAge);
}

// ── 2. The two catalogs agree ────────────────────────────────────────────────
for (const p of PROGRAMS) {
  if (p.tier === 'pay_to_play') {
    // opportunities.js excludes pay-to-attend products by design (see its
    // header). These live ONLY here, where the tier itself is the warning.
    assert(`[${p.id}] pay-to-play programs stay out of the browsable catalog`, !catalogIds.has(p.id));
    assert(`[${p.id}] says plainly why it costs what it costs`,
      /open enrolment|open enrollment|anyone who pays|not a selective/i.test(`${p.why} ${p.eligibility}`));
    assert(`[${p.id}] is never labelled free`, !isFreeOrFunded(p));
  } else if (catalogIds.has(p.id)) {
    assert(`[${p.id}] name matches the browsable catalog`, catalogById[p.id].name === p.name,
      `structured: ${p.name} · catalog: ${catalogById[p.id].name}`);
    assert(`[${p.id}] type matches the browsable catalog`, catalogById[p.id].type === p.type);
  } else {
    failures.push(`[${p.id}] is not in the browsable catalog — a student browsing would never see it`);
  }
}
assert('every tier has at least one program', PROGRAM_TIERS.every(t => PROGRAMS.some(p => p.tier === t.id)));
assert('the honest-about-cost tier exists and says so', /anyone who pays gets in/i.test(TIER_BY_ID.pay_to_play.blurb));

// ── 3. Eligibility ───────────────────────────────────────────────────────────
const simr = PROGRAMS.find(p => p.id === 'stanford-simr');
assert('SIMR is in the structured set', !!simr);
{
  const fourteen = { age: 14, grade: 9 };
  const v = evaluateEligibility(simr, fourteen);
  assert('a 14-year-old is told they are too young for SIMR', v.status === 'too_young');
  assert('being too young is never a dead end', !!v.alternative && v.alternative.length > 40);
  assert('the too-young verdict names the gap', v.blockers.some(b => /16/.test(b)));
  assert('the too-young verdict knows when it clears', v.waitUntil?.kind === 'age' && v.waitUntil.value === 16);

  const junior = { age: 17, grade: 11 };
  const jv = evaluateEligibility(simr, junior);
  assert('an eligible junior is not blocked from SIMR', jv.blockers.length === 0);
  assert('SIMR still surfaces its citizenship requirement', jv.notes.some(n => /green card|citizenship/i.test(n)));
  assert('a citizenship requirement is a note, never a verdict about the student', jv.status === 'citizenship');

  const unknown = evaluateEligibility(simr, { age: null, grade: null });
  assert('we never clear a student on facts we do not have', unknown.status === 'unknown');
  assert('an unknown verdict asks for the missing fact', unknown.notes.some(n => /Settings|grade/i.test(n)));
}
{
  const sts = PROGRAMS.find(p => p.id === 'regeneron-science-talent-search');
  const soph = evaluateEligibility(sts, { age: 15, grade: 10 });
  assert('a sophomore is told STS is a senior-year competition', soph.status === 'wrong_grade');
  assert('the wrong-year verdict still says what to do now', !!soph.alternative);
}
assert('every program that can block a student can answer "what instead"',
  PROGRAMS.every(p => p.altUnder || GENERIC_ALTERNATIVE));
assert('a program with no gates at all reads as likely eligible',
  evaluateEligibility({ id: 'x', name: 'x' }, { age: 14, grade: 9 }).status === 'likely');
assert('studentEligibilityFacts never invents a citizenship answer',
  studentEligibilityFacts({ user: { age: 16 } }).citizenshipKnown === false);

// ── 4. Deadlines and alerts ──────────────────────────────────────────────────
{
  // A student browsing on 1 April, after February closed. The next occurrence
  // has to be next year's, and it has to say so.
  const april = new Date(2026, 3, 1);
  const dl = nextDeadline(simr, april);
  assert('a passed deadline rolls forward to the next cycle', dl.passedThisCycle === true);
  assert('the next occurrence is in the future', dl.daysOut > 0);
  assert('an approximate date never renders as an exact one', /approx/i.test(dl.label));

  const rows = milestoneRowsFor(simr, dl.iso, april);
  assert('saving a program writes the deadline plus its alerts', rows.length === 1 + ALERT_OFFSETS.length);
  assert('the deadline row is flagged as approximate when it is', /approx/i.test(rows[0].title));
  assert('every alert row is dated before the deadline',
    rows.slice(1).every(r => r.due_date < rows[0].due_date));
  assert('every row lands in the opportunity lane', rows.every(r => r.kind === 'opportunity'));
  assert('the alerts are 60, 30 and 7 days out',
    ALERT_OFFSETS.every(o => rows.some(r => r.title.includes(`${o} days out`))));

  // Two days before the deadline: three alerts in the past are clutter, not
  // reminders, so only the deadline itself is written.
  const twoDaysBefore = new Date(new Date(`${dl.iso}T00:00:00`).getTime() - 2 * 86400000);
  const late = milestoneRowsFor(simr, dl.iso, twoDaysBefore);
  assert('alerts that would land in the past are not written', late.length === 1);
}
{
  const rolling = PROGRAMS.find(p => p.deadline?.precision === 'rolling');
  assert('a rolling program exists and says it has no deadline',
    !!rolling && /no deadline/i.test(nextDeadline(rolling).label));
  assert('a rolling program writes no milestone rows without a date', milestoneRowsFor(rolling, null).length === 0);
}
assert('every dated program produces a future deadline',
  PROGRAMS.filter(p => p.deadline?.month != null).every(p => nextDeadline(p).daysOut > 0));

// ── 5. Cost ──────────────────────────────────────────────────────────────────
assert('free-and-funded includes stipend programs',
  PROGRAMS.filter(p => p.stipend === true).every(isFreeOrFunded));
assert('the free-and-funded filter excludes every pay-to-play program',
  PROGRAMS.filter(p => p.tier === 'pay_to_play').every(p => !isFreeOrFunded(p)));
assert('a cost with no published number never renders a fake one',
  PROGRAMS.filter(p => p.cost?.usd == null && p.cost?.model !== 'free' && p.cost?.model !== 'free_plus_stipend')
    .every(p => !/\$/.test(costLabel(p))));
assert('the last-checked line is human-readable', /checked/i.test(verifiedLabel(PROGRAMS[0]) || ''));

// ── 6. HOSA ──────────────────────────────────────────────────────────────────
const hosaIds = HOSA_EVENTS.map(e => e.id);
assert('every HOSA event id is unique', new Set(hosaIds).size === hosaIds.length,
  `duplicates: ${hosaIds.filter((id, i) => hosaIds.indexOf(id) !== i).join(', ')}`);
assert('every HOSA event names a real category',
  HOSA_EVENTS.every(e => HOSA_CATEGORIES.some(c => c.id === e.cat)),
  `bad: ${HOSA_EVENTS.filter(e => !HOSA_CATEGORIES.some(c => c.id === e.cat)).map(e => e.id).join(', ')}`);
assert('HOSA\'s six categories are all represented',
  HOSA_EVENTS_BY_CAT.every(c => c.events.length > 0),
  `empty: ${HOSA_EVENTS_BY_CAT.filter(c => !c.events.length).map(c => c.id).join(', ')}`);
assert('the categories are HOSA\'s own',
  ['health_science', 'health_professions', 'emergency_preparedness', 'leadership', 'teamwork', 'recognition']
    .every(id => HOSA_CATEGORIES.some(c => c.id === id)));
assert('the qualification ladder runs interested → national',
  HOSA_LEVELS[0].id === 'interested' && HOSA_LEVELS[HOSA_LEVELS.length - 1].id === 'national');

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nStructured programs: ${PROGRAMS.length}`);
for (const t of PROGRAM_TIERS) {
  const list = PROGRAMS.filter(p => p.tier === t.id);
  console.log(`  ${t.label}: ${list.length} (${list.filter(isFreeOrFunded).length} free or funded)`);
}
console.log(`  ${PROGRAMS.filter(p => p.deadline?.month != null).length} carry a dated deadline · ${PROGRAMS.filter(p => p.citizenship).length} require US citizenship or a green card`);
console.log(`HOSA: ${HOSA_EVENTS.length} competitive events across ${HOSA_CATEGORIES.length} categories`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failed assertion(s) (${passed} passed):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n✓ ${passed} assertions passed.`);
