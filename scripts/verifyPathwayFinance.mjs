#!/usr/bin/env node
/**
 * The gate on the pathway-finance layer: src/data/pathwayFinance.js,
 * src/lib/pathwayCost.js, src/data/healthCareerScholarships.js and
 * src/lib/scholarshipFilters.js.
 *
 * There is no test runner in this repo, so this script is the test suite for
 * those modules. It exists because every number they produce is read by a
 * seventeen-year-old as a fact about their own future, and the failure modes
 * are all silent:
 *
 *   1. AN UNSOURCED CLAIM. A figure claiming basis 'published' with no source
 *      behind it is indistinguishable on screen from one with a source. The
 *      same rule the admissions catalog is held to (verifyAdmissionModel.mjs).
 *   2. AN INVERTED OR IMPOSSIBLE RANGE. p25 above p75, or a median outside its
 *      own range, renders perfectly and means nothing.
 *   3. A TIMELINE THAT DOES NOT ADD UP. If the phases sum to nine years and the
 *      headline says twelve, the comparison table is drawing bars in one
 *      arithmetic and captioning them in another.
 *   4. THE RESIDENCY DOUBLE-COUNT. Residency bills nothing and accrues
 *      interest; a refactor that let it walk the tuition loop would silently
 *      double the physician timeline. This happened once during development
 *      and is asserted against here by name.
 *   5. AID THAT DOES NOT REDUCE DEBT, or interest that does not grow it. The
 *      calculator's whole claim is that these levers move the number.
 *   6. A SENIOR FILTER THAT HIDES THE WRONG THING. The exclusion list names
 *      four scholarship ids by hand; a renamed entry must fail the build rather
 *      than quietly rejoin the senior list, and — the expensive direction — a
 *      large award must never be hidden from a senior who can win it.
 *
 *   node scripts/verifyPathwayFinance.mjs
 */
import { register } from 'node:module';

register('./_appResolve.mjs', import.meta.url);

const {
  PATHWAY_FINANCE, SERVICE_PROGRAMS, COMMITMENT_TIMING, LOAN_ASSUMPTIONS,
  FEDERAL_LOAN_LIMITS, DEFAULT_COMPARISON, FINANCE_BY_ID, FINANCE_BY_PATHWAY, BASES,
} = await import('../src/data/pathwayFinance.js');
const {
  estimatePathwayCost, compareDebtTrajectories, publishedDebtRows, monthlyPayment,
  blendedRateForPhase, phaseCostPerYear, SCHOOL_TYPES, money, yearsLabel, serviceProgramsFor,
} = await import('../src/lib/pathwayCost.js');
const { HEALTH_SCHOLARSHIPS, OPEN_TO } = await import('../src/data/healthCareerScholarships.js');
const {
  NOT_OPEN_TO_SENIORS, openToSeniors, seniorExclusionReason, healthScholarshipsFor,
  scholarshipCounts,
} = await import('../src/lib/scholarshipFilters.js');
const { SCHOLARSHIPS } = await import('../src/data/scholarships.js');
const { PATHS } = await import('../src/data/constants.js');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) =>
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const section = (n) => console.log(`\n${n}`);

const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isHttps = (u) => /^https:\/\//.test(String(u || ''));

// ─────────────────────────────────────────────────────────────────────────────
section('1. Every figure names its basis, and a published one names its source');

for (const p of PATHWAY_FINANCE) {
  const at = `[${p.id}]`;
  assert(`${at} has a label, a short name and a credential`, !!p.label && !!p.short && !!p.credential);
  assert(`${at} maps to a real PATHS key`, !!PATHS[p.pathwayKey], `got: ${p.pathwayKey}`);

  for (const [field, obj] of [['debt', p.debt], ['earnings', p.earnings], ['costPerYear', p.costPerYear]]) {
    assert(`${at} ${field} states a basis`, BASES.includes(obj?.basis), `got: ${obj?.basis}`);
    assert(`${at} ${field} explains itself`, String(obj?.note || '').length > 40,
      'a figure with no note is a number nobody can argue with');
    if (obj?.basis === 'published') {
      assert(`${at} ${field} claims 'published' and so must carry a source`, (obj.sources || []).length > 0);
    }
    for (const s of obj?.sources || []) {
      assert(`${at} ${field} source is https`, isHttps(s.url), `got: ${s.url}`);
      assert(`${at} ${field} source records when it was read`, isISO(s.retrieved), `got: ${s.retrieved}`);
      assert(`${at} ${field} source is labelled`, !!String(s.label || '').trim());
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. Ranges are ranges, and medians sit inside them');

for (const p of PATHWAY_FINANCE) {
  const at = `[${p.id}]`;
  const d = p.debt;
  assert(`${at} debt p25 < p75`, d.p25 < d.p75, `${d.p25} / ${d.p75}`);
  assert(`${at} debt median sits inside its own range`, d.median >= d.p25 && d.median <= d.p75,
    `median ${d.median} outside ${d.p25}–${d.p75}`);
  assert(`${at} every debt figure is a positive number of dollars`,
    [d.p25, d.median, d.p75].every(v => Number.isFinite(v) && v > 0));
  assert(`${at} earnings median is a plausible annual wage`,
    p.earnings.medianAnnual > 20000 && p.earnings.medianAnnual < 1000000, `got ${p.earnings.medianAnnual}`);
}

// The comparison's one cross-pathway figure. If this inverts, the table is
// telling students the opposite of the truth about relative burden.
const ratios = Object.fromEntries(publishedDebtRows().map(r => [r.id, r.debtToIncome]));
assert('dentistry carries the heaviest debt relative to pay — the fact the table exists to show',
  ratios.dds === Math.max(...Object.values(ratios)), JSON.stringify(ratios));
assert('nursing carries the lightest', ratios.rn === Math.min(...Object.values(ratios)), JSON.stringify(ratios));

// ─────────────────────────────────────────────────────────────────────────────
section('3. Timelines add up, and residency is paid');

for (const p of PATHWAY_FINANCE) {
  const at = `[${p.id}]`;
  const sum = p.phases.reduce((s, ph) => s + ph.years, 0);
  eq(`${at} phases sum to the stated total`, sum, p.totalYearsAfterHighSchool);
  assert(`${at} every phase names a kind we render`,
    p.phases.every(ph => ['undergrad', 'professional', 'postgrad'].includes(ph.kind)));
  assert(`${at} every phase says what the student earns during it`,
    p.phases.every(ph => ['none', 'stipend', 'full'].includes(ph.earning)));
  assert(`${at} every phase explains itself`, p.phases.every(ph => String(ph.note || '').length > 30));
}

const md = FINANCE_BY_ID.md;
const residency = md.phases.find(ph => ph.kind === 'postgrad');
assert('the physician path has a residency phase', !!residency);
eq('residency is PAID — the single most misread row on the comparison', residency.earning, 'stipend');
eq('residency does not borrow', residency.borrows, false);
eq('nursing has no professional-school phase — the whole reason it is cheap',
  md && FINANCE_BY_ID.rn.phases.some(ph => ph.kind === 'professional'), false);

// ─────────────────────────────────────────────────────────────────────────────
section('4. The calculator');

const base = { undergradSchoolType: 'publicInState', professionalSchoolType: 'publicInState' };

for (const p of PATHWAY_FINANCE) {
  const r = estimatePathwayCost(p.id, base);
  const at = `[${p.id}]`;
  assert(`${at} produces a result`, !!r);
  eq(`${at} total years match the data (no double-counted residency)`, r.totalYears, p.totalYearsAfterHighSchool);
  assert(`${at} borrows something when no aid is entered`, r.totalBorrowed > 0);
  assert(`${at} balance at repayment exceeds principal — interest is real`,
    r.balanceAtRepayment > r.totalBorrowed, `${r.balanceAtRepayment} vs ${r.totalBorrowed}`);
  // Both figures are rounded to whole dollars independently, so the monthly
  // payment can be off by up to fifty cents across 120 payments. Anything
  // beyond that is an arithmetic error, not rounding.
  assert(`${at} the monthly payment amortises the balance`,
    Math.abs(r.totalRepaid - r.monthlyPayment * 12 * LOAN_ASSUMPTIONS.repaymentYears) <= 60,
    `totalRepaid ${r.totalRepaid} vs ${r.monthlyPayment} × 120`);
  assert(`${at} total repaid exceeds the balance — a positive rate costs something`,
    r.totalRepaid > r.balanceAtRepayment);
  assert(`${at} default is today's dollars, not an inflated projection`, r.assumptions.inflate === false);
  assert(`${at} says out loud that it assumed borrowing the whole cost`,
    r.assumptions.borrowsFullCostOfAttendance === true);
}

assert('an unknown pathway returns null rather than a zeroed row that reads as free',
  estimatePathwayCost('not-a-pathway', base) === null);

// Residency bills no tuition — only interest.
{
  const r = estimatePathwayCost('md', base);
  const res = r.phases.find(ph => ph.kind === 'postgrad');
  eq('residency costs no tuition', res.sticker, 0);
  eq('residency borrows nothing', res.borrowed, 0);
  assert('residency still accrues interest — the fact nobody warns students about',
    res.interestAccrued > 0, `got ${res.interestAccrued}`);
  assert('residency interest is partly paid down, not modeled at zero payments',
    res.interestPaidDuringPhase > 0);
}

// The levers have to move the number, in the right direction.
{
  const plain = estimatePathwayCost('md', base);
  const aided = estimatePathwayCost('md', { ...base, annualAidProfessional: 20000 });
  const lump = estimatePathwayCost('md', { ...base, familyContributionTotal: 50000 });
  const private_ = estimatePathwayCost('md', { ...base, professionalSchoolType: 'private' });
  const inflated = estimatePathwayCost('md', { ...base, inflate: true });

  assert('aid reduces what is borrowed', aided.totalBorrowed < plain.totalBorrowed);
  assert('aid reduces the balance at repayment', aided.balanceAtRepayment < plain.balanceAtRepayment);
  assert('a family lump sum reduces borrowing', lump.totalBorrowed < plain.totalBorrowed);
  assert('a private professional school costs more', private_.totalSticker > plain.totalSticker);
  assert('inflating costs raises the total', inflated.totalSticker > plain.totalSticker);
  assert('aid never produces negative borrowing',
    estimatePathwayCost('md', { ...base, annualAidProfessional: 500000 }).totalBorrowed >= 0);
}

// A fractional phase (the PA path's 2.5 years) must bill pro rata, not round up.
{
  const pa = estimatePathwayCost('pa', base);
  const school = pa.phases.find(ph => ph.kind === 'professional');
  const perYear = phaseCostPerYear(FINANCE_BY_ID.pa, FINANCE_BY_ID.pa.phases[1], 'publicInState');
  assert('the PA program bills its half-year as a half-year',
    Math.abs(school.sticker - perYear * 2.5) < 2, `${school.sticker} vs ${perYear * 2.5}`);
}

// Grad PLUS blending: borrowing above the annual graduate cap must cost more.
{
  const low = blendedRateForPhase({ kind: 'professional' }, 10000);
  const high = blendedRateForPhase({ kind: 'professional' }, 90000);
  assert('borrowing under the graduate cap uses the graduate rate', Math.abs(low - LOAN_ASSUMPTIONS.gradRate) < 1e-9);
  assert('borrowing far above the cap trends toward the Grad PLUS rate',
    high > LOAN_ASSUMPTIONS.gradRate && high < LOAN_ASSUMPTIONS.gradPlusRate, `got ${high}`);
  eq('undergraduate borrowing always uses the undergraduate rate',
    blendedRateForPhase({ kind: 'undergrad' }, 99999), LOAN_ASSUMPTIONS.undergradRate);
}

eq('a zero balance has a zero payment', monthlyPayment(0), 0);
assert('a real balance has a positive payment', monthlyPayment(100000) > 0);
eq('money() renders nothing as an em dash rather than $0', money(null), '—');
eq('yearsLabel renders a half year readably', yearsLabel(6.5), '6½ years');

eq('the comparison returns the five pathways the brief names',
  compareDebtTrajectories().map(r => r.pathwayId).sort().join(','),
  [...DEFAULT_COMPARISON].sort().join(','));

// ─────────────────────────────────────────────────────────────────────────────
section('5. Service programs are contracts, and say so');

for (const p of SERVICE_PROGRAMS) {
  const at = `[${p.id}]`;
  assert(`${at} names a timing we can render`, !!COMMITMENT_TIMING[p.timing], `got: ${p.timing}`);
  assert(`${at} lists at least one pathway`, (p.pathways || []).length > 0);
  assert(`${at} every listed pathway exists`, (p.pathways || []).every(id => !!FINANCE_BY_ID[id]));
  assert(`${at} states what it pays for`, String(p.covers || '').length > 40);
  // The commitment is the product. A program whose obligation is not spelled
  // out is being sold as a scholarship, which is exactly the misreading this
  // section exists to prevent.
  assert(`${at} states the commitment in years of service, not dollars`, String(p.commitment || '').length > 40);
  assert(`${at} states the catch`, String(p.catch || '').length > 40);
  assert(`${at} says when the door closes`, String(p.decidedBy || '').length > 10);
  assert(`${at} says what it means for the college list`, String(p.undergradImplication || '').length > 40);
  assert(`${at} links its official page over https`, isHttps(p.url), `got: ${p.url}`);
  for (const s of p.sources || []) {
    assert(`${at} source is https`, isHttps(s.url));
    assert(`${at} source records when it was read`, isISO(s.retrieved));
  }
}

// ROTC is the one with a deadline while they are still in high school. If this
// ever stops being surfaced first, the section has lost its reason to exist.
{
  const ordered = serviceProgramsFor(null, SERVICE_PROGRAMS, COMMITMENT_TIMING);
  eq('the high-school-deadline program is ordered first', ordered[0].timing, 'high-school');
  assert('ROTC is that program', ordered[0].id === 'rotc', `got ${ordered[0].id}`);
  assert('every pathway has at least one service route',
    PATHWAY_FINANCE.every(p => serviceProgramsFor(p.id, SERVICE_PROGRAMS, COMMITMENT_TIMING).length > 0));
}

assert('PSLF warns about refinancing federal loans — the most expensive mistake in this area',
  /refinanc/i.test(SERVICE_PROGRAMS.find(p => p.id === 'pslf').catch));

// ─────────────────────────────────────────────────────────────────────────────
section('6. Loan assumptions are stated, sourced and plausible');

assert('every stated rate is a fraction, not a percentage',
  [LOAN_ASSUMPTIONS.undergradRate, LOAN_ASSUMPTIONS.gradRate, LOAN_ASSUMPTIONS.gradPlusRate]
    .every(r => r > 0 && r < 0.25));
assert('graduate borrowing costs more than undergraduate',
  LOAN_ASSUMPTIONS.gradRate > LOAN_ASSUMPTIONS.undergradRate);
assert('Grad PLUS costs more than Direct graduate borrowing',
  LOAN_ASSUMPTIONS.gradPlusRate > LOAN_ASSUMPTIONS.gradRate);
assert('the assumptions carry a source', (LOAN_ASSUMPTIONS.sources || []).length > 0);
assert('federal caps are stated so the Grad PLUS blend can be explained',
  FEDERAL_LOAN_LIMITS.gradAnnual > 0 && FEDERAL_LOAN_LIMITS.undergradAnnual > 0);
assert('every school type the UI offers is priced for every pathway',
  PATHWAY_FINANCE.every(p => SCHOOL_TYPES.every(t =>
    phaseCostPerYear(p, p.phases[0], t.id) > 0)));

// ─────────────────────────────────────────────────────────────────────────────
section('7. The senior filter hides exactly four things, by name');

for (const id of Object.keys(NOT_OPEN_TO_SENIORS)) {
  const row = SCHOLARSHIPS.find(s => s.id === id);
  assert(`the excluded id "${id}" still exists in the database`, !!row,
    'a renamed entry would silently rejoin the senior list');
  assert(`"${id}" states why a senior cannot apply`, String(NOT_OPEN_TO_SENIORS[id]).length > 40);
  if (row) assert(`openToSeniors() actually excludes "${id}"`, openToSeniors(row) === false);
}

const counts = scholarshipCounts();
eq('everything else is senior-eligible', counts.seniorEligible, counts.total - counts.excluded);
assert('the filter hides only a handful — it is an exclusion list, not a filter that guesses',
  counts.excluded <= 6, `hiding ${counts.excluded} of ${counts.total}`);

// The expensive direction: a large award must never be hidden from a senior.
for (const id of ['questbridge-national-college-match', 'gates-scholarship', 'jkcf-college-scholarship',
  'coca-cola-scholars', 'dell-scholars', 'hsf-scholarship']) {
  const row = SCHOLARSHIPS.find(s => s.id === id);
  assert(`the senior filter does NOT hide ${id}`, !!row && openToSeniors(row),
    'hiding a major award from a senior who can win it is the worst failure this filter has');
}
assert('National Merit explains that entry happened in junior year',
  /junior/i.test(seniorExclusionReason(SCHOLARSHIPS.find(s => s.id === 'national-merit-scholarship')) || ''));

// ─────────────────────────────────────────────────────────────────────────────
section('8. Health-career scholarships');

for (const s of HEALTH_SCHOLARSHIPS) {
  const at = `[${s.id}]`;
  assert(`${at} is a kind the UI renders differently`, ['named', 'discovery'].includes(s.kind));
  assert(`${at} states who is eligible`, String(s.eligibility || '').length > 40);
  assert(`${at} says why it is worth an evening`, String(s.why || '').length > 40);
  assert(`${at} names at least one stage it is open to`, (s.openTo || []).length > 0);
  assert(`${at} every stage is one we render`, (s.openTo || []).every(k => !!OPEN_TO[k]));
  assert(`${at} every pathway exists`, (s.pathways || []).every(id => !!FINANCE_BY_ID[id]));
  if (s.kind === 'discovery') {
    // A discovery entry is a search instruction, not an award. Giving it an
    // amount or a deadline would make an invented fact look like a researched
    // one, which is the failure this whole file is written against.
    assert(`${at} a discovery entry states no amount`, s.amount == null);
    assert(`${at} a discovery entry states no deadline`, s.deadline == null);
    assert(`${at} a discovery entry says how to find it`, String(s.howToFind || '').length > 60);
  } else {
    assert(`${at} a named award links its official page`, isHttps(s.url), `got: ${s.url}`);
  }
}

assert('the discovery entries carry the hospital auxiliary route — the highest-yield one for a senior',
  HEALTH_SCHOLARSHIPS.some(s => s.id === 'hc-hospital-auxiliary' && s.kind === 'discovery'));
assert('the "not yet, you must be enrolled" trap is listed rather than hidden',
  HEALTH_SCHOLARSHIPS.some(s => (s.openTo || []).includes('undergrad') && !(s.openTo || []).includes('senior')));

{
  const senior = healthScholarshipsFor('senior');
  const undergrad = healthScholarshipsFor('undergrad');
  assert('the senior view excludes the enrolled-students-only awards',
    !senior.some(s => undergrad.includes(s) && !(s.openTo || []).includes('senior')));
  assert('the senior view is not empty', senior.length >= 4, `got ${senior.length}`);
  assert('every senior-view entry is genuinely open to a senior',
    senior.every(s => (s.openTo || []).includes('senior') || (s.openTo || []).includes('hs-any')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n`);
  failures.forEach(f => console.error(`  • ${f}`));
  process.exit(1);
}
console.log(`✓ Pathway finance verified — ${passed} assertions.`);
console.log(`  ${PATHWAY_FINANCE.length} pathways, ${SERVICE_PROGRAMS.length} service programs, `
  + `${HEALTH_SCHOLARSHIPS.length} health-career entries, ${counts.seniorEligible}/${counts.total} senior-eligible.`);
