#!/usr/bin/env node
/**
 * The gate on the Admissions Calculator.
 *
 * This model exists because the old one was optimistic, and optimism in a
 * chancing tool is not a tuning problem — it is a set of specific, nameable
 * modelling mistakes that every tool on the market makes and that creep back in
 * the moment nobody is checking. So the properties that make this model honest
 * are asserted here rather than trusted:
 *
 *   1. A FAILED HARD GATE SHOWS NO PERCENTAGE. Not a small one. None.
 *   2. THE CEILING HOLDS. A flawless applicant at a 3% programme cannot be
 *      shown a number that implies they are a favourite.
 *   3. CLEARING THE 25TH PERCENTILE IS NOT "LIKELY". The exact failure the
 *      whole rebuild is about: benchmark at the 25th, and qualified quietly
 *      becomes likely.
 *   4. ACADEMIC LEVERAGE DECAYS WITH SELECTIVITY. Below ~15% admit, GPA and
 *      scores must stop carrying the model.
 *   5. HOOKS DEFLATE THE UNHOOKED BASE RATE, and the early-round lift shown to
 *      an unhooked applicant is smaller than the headline.
 *   6. EVERY OUTPUT IS A RANGE, and missing intake widens it rather than being
 *      assumed.
 *   7. THE DATA IS HONEST ABOUT ITSELF: weights sum to 1, no profile claims
 *      'published' without a source, every gate has a remedy, and no derived
 *      profile invents a hard gate.
 *   8. THE LOTTERY IS SAID OUT LOUD where one exists.
 *
 * Run: npm run verify:admissions
 */
import { estimateAdmission, probabilityCeiling, signalBudget, unhookedBaseRate } from '../src/lib/admissions/model.js';
import { academicLeverage, positionInBand, scoreRigor } from '../src/lib/admissions/academicFit.js';
import { evaluateGates } from '../src/lib/admissions/gates.js';
import { scoreRound } from '../src/lib/admissions/round.js';
import { assessCompleteness, buildApplicant } from '../src/lib/admissions/intake.js';
import {
  PROGRAM_PROFILES, PORTFOLIO_DIMENSIONS, allProfiles, resolveProfile, deriveUndergradProfile,
} from '../src/data/admissions/programProfiles.js';
import { SCHOOL_DATA } from '../src/data/constants.js';

let failures = 0, checks = 0;
function assert(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  ✓ ${name}`); return; }
  failures++;
  console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`);
}
function section(title) { console.log(`\n${title}`); }

// ── Fixtures ────────────────────────────────────────────────────────────────

/** A genuinely outstanding unhooked applicant. Nothing left to improve. */
const FLAWLESS = {
  applicant: {
    citizenship: 'us-citizen', stateResidency: 'MO', gradeLevel: '12',
    unweightedGpa: 4.0, weightedGpa: 4.6, hundredPointAverage: 99,
    classRank: { reported: true, percentile: 1 },
    rigor: { ap: 12, ib: 0, honors: 6, dualEnrollment: 2, offeredAdvanced: 14 },
    courses: { biology: { taken: true, grade: 'A' }, chemistry: { taken: true, grade: 'A' }, 'physics-lab': { taken: true, grade: 'A' }, precalculus: { taken: true, grade: 'A' } },
    tests: { hasOfficialScore: true, sat: { composite: 1580, sections: { ebrw: 780, math: 800 }, superscored: false }, act: { composite: 35, sections: { english: 35, math: 36, reading: 35, science: 35 }, superscored: false } },
    documentedServiceHours: 600, hooks: null,
  },
  portfolio: {
    clinical: { hours: 700, spanMonths: 30, activeMonths: 26, verifiedShare: 1 },
    shadowing: { hours: 300, spanMonths: 24, activeMonths: 18, verifiedShare: 1 },
    research: { hours: 900, spanMonths: 30, activeMonths: 26, verifiedShare: 1 },
    service: { hours: 600, spanMonths: 30, activeMonths: 26, verifiedShare: 1 },
    leadership: [{ title: 'President', months: 30, level: 'state' }, { title: 'Captain', months: 24, level: 'regional' }],
    competitions: [{ title: 'ISEF finalist', level: 'international', months: 12 }, { title: 'State science fair', level: 'state', months: 12 }],
    certifications: [{ title: 'EMT-B' }, { title: 'CNA' }, { title: 'CPR' }],
  },
};

/** A student sitting exactly on the 25th percentile with an otherwise thin record. */
const AT_25TH = {
  applicant: {
    citizenship: 'us-citizen', stateResidency: 'MO', gradeLevel: '12',
    unweightedGpa: 3.7, weightedGpa: 3.9,
    classRank: { reported: false, percentile: null },
    rigor: { ap: 4, honors: 2, offeredAdvanced: 12 },
    courses: { biology: { taken: true }, chemistry: { taken: true }, 'physics-lab': { taken: true }, precalculus: { taken: true } },
    tests: { hasOfficialScore: true, sat: { composite: 1330, sections: { ebrw: 660, math: 670 }, superscored: false } },
    documentedServiceHours: 210,
  },
  portfolio: {
    clinical: { hours: 60, spanMonths: 4, activeMonths: 3, verifiedShare: 0 },
    shadowing: { hours: 20, spanMonths: 2, activeMonths: 2, verifiedShare: 0 },
    research: { hours: 0 }, service: { hours: 210, spanMonths: 10, activeMonths: 8, verifiedShare: 0 },
    leadership: [{ title: 'Club secretary', months: 8, level: 'school' }],
    competitions: [], certifications: [],
  },
};

const EMPTY_COMPLETENESS = { missing: [] };

const ultraSelective = deriveUndergradProfile(SCHOOL_DATA.find(s => s.accept < 5) || SCHOOL_DATA[0]);
const midSelective = deriveUndergradProfile(SCHOOL_DATA.find(s => s.accept > 30 && s.accept < 55) || SCHOOL_DATA[1]);

// ─────────────────────────────────────────────────────────────────────────────
section('1. A failed hard gate shows no percentage at all');
// ─────────────────────────────────────────────────────────────────────────────
{
  const international = { ...FLAWLESS.applicant, citizenship: 'international' };
  const r = estimateAdmission({ program: 'umkc-ba-md', applicant: international, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  assert('flawless international applicant is blocked at UMKC', r.blocked === true);
  assert('no probability object is produced', r.showsProbability === false && r.probability === undefined);
  assert('the blocked result explains what would need to change', Array.isArray(r.whatWouldChange) && r.whatWouldChange.length > 0 && r.whatWouldChange.every(w => !!w.remedy));

  // The specific regression this guards: a "gate" implemented as a heavy weight.
  const ok = estimateAdmission({ program: 'umkc-ba-md', applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  assert('the same applicant with citizenship IS scored', ok.blocked === false && ok.probability.point > 0);

  const shortService = { ...FLAWLESS.applicant, documentedServiceHours: 30 };
  const drexel = estimateAdmission({ program: 'drexel-ba-bs-md', applicant: shortService, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  assert('Drexel blocks on documented service hours below 200', drexel.blocked === true && drexel.whatWouldChange.some(w => /service/i.test(w.label)));
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. Unknown is not pass and not fail');
// ─────────────────────────────────────────────────────────────────────────────
{
  const noAnswer = { ...FLAWLESS.applicant, citizenship: null };
  const g = evaluateGates(resolveProfile('umkc-ba-md'), noAnswer);
  assert('a skipped citizenship answer does not fail the gate', g.eligible === true);
  assert('…and is reported as uncheckable instead', g.uncheckable.some(u => u.kind === 'citizenship'));
  assert('…naming the field that would resolve it', g.uncheckable.some(u => u.missing.includes('citizenship')));

  const r = estimateAdmission({ program: 'umkc-ba-md', applicant: noAnswer, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  const withAnswer = estimateAdmission({ program: 'umkc-ba-md', applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  assert('an uncheckable gate widens the range rather than being assumed',
    (r.probability.high - r.probability.low) > (withAnswer.probability.high - withAnswer.probability.low));

  // "My school does not rank" must never read as "I rank badly".
  const asu = resolveProfile('asu-bsn-prelicensure');
  const noRank = evaluateGates(asu, { classRank: { reported: false }, unweightedGpa: 3.9 });
  assert('a school that does not rank still satisfies ASU via the GPA route', noRank.unmetPreferences.length === 0);
  const norankNoGpa = evaluateGates(asu, { classRank: { reported: false } });
  assert('…and with no GPA either, the route is uncheckable rather than failed', norankNoGpa.uncheckable.length === 1 && norankNoGpa.unmetPreferences.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The ceiling holds — nobody is a favourite at a 3% programme');
// ─────────────────────────────────────────────────────────────────────────────
{
  assert('ceiling at 3% base is under 20%', probabilityCeiling(0.03) < 0.20, `got ${probabilityCeiling(0.03)}`);
  assert('ceiling at 10% base is under 30%', probabilityCeiling(0.10) < 0.30, `got ${probabilityCeiling(0.10)}`);
  assert('ceiling rises with base rate', probabilityCeiling(0.5) > probabilityCeiling(0.1));
  assert('ceiling is always above the base rate itself', [0.02, 0.1, 0.3, 0.7].every(b => probabilityCeiling(b) > b));

  const r = estimateAdmission({ program: ultraSelective, applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS, roundId: 'ed' });
  assert(`a flawless ED applicant at ${ultraSelective.name} (${(ultraSelective.admitRate.value * 100).toFixed(1)}%) stays under 25%`,
    r.probability.point < 0.25, `got ${(r.probability.point * 100).toFixed(1)}%`);
  assert('…and the panel is told the ceiling was reached', r.probability.hitCeiling === false || !!r.display.ceilingNote);

  // Every profile in the catalog, worst case: nobody can be shown a coin-flip
  // at anything genuinely selective.
  const overshoots = allProfiles().filter(p => {
    const base = p.admitRate.value ?? p.admitRate.assumed;
    if (base >= 0.2) return false;
    const est = estimateAdmission({ program: p, applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS, roundId: 'ed' });
    return est.showsProbability && est.probability.high > 0.5;
  });
  assert('no sub-20% programme can show a flawless applicant above 50%', overshoots.length === 0,
    overshoots.slice(0, 3).map(p => p.name).join(', '));
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Clearing the 25th percentile is not "likely"');
// ─────────────────────────────────────────────────────────────────────────────
{
  const band = { p25: 1400, p50: 1500, p75: 1560, basis: 'derived' };
  const at25 = positionInBand(1400, band);
  const atMedian = positionInBand(1500, band);
  assert('a student exactly at the 25th scores below the median admit', at25.z < 0);
  assert('…and is labelled as such', at25.position === '25th-to-median' || at25.position === 'below-25th');
  assert('the median admit is the zero point, not the 25th', Math.abs(atMedian.z) < 1e-9);
  // The readout may NAME the "qualified → likely" slide (it does, deliberately,
  // to warn about it); what it must never do is make that claim about this
  // student. So the assertion is on the verdict, not on the vocabulary.
  assert('the readout never tells a 25th-percentile student they are qualified, likely or safe',
    !/\byou(?:'re| are| look)\s+(?:\w+\s+){0,2}(likely|qualified|safe|competitive)\b/i.test(at25.readout), at25.readout);
  assert('…and instead says how much of the admitted class is above them',
    /above you|below the median/i.test(at25.readout), at25.readout);

  const r = estimateAdmission({ program: ultraSelective, applicant: AT_25TH.applicant, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS });
  assert(`a 25th-percentile applicant at ${ultraSelective.name} stays in single digits`,
    r.probability.point < 0.10, `got ${(r.probability.point * 100).toFixed(1)}%`);

  // All three percentiles must be available to the UI, not just the flattering one.
  const bands = r.layers.academic.bands;
  assert('the model exposes p25, p50 and p75 together', ['p25', 'p50', 'p75'].every(k => bands.sat?.[k] != null || bands.gpa?.[k] != null));
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Academic leverage decays with selectivity');
// ─────────────────────────────────────────────────────────────────────────────
{
  assert('leverage at 3% is well below leverage at 50%', academicLeverage(0.03) < academicLeverage(0.5) * 0.5,
    `${academicLeverage(0.03).toFixed(2)} vs ${academicLeverage(0.5).toFixed(2)}`);
  assert('leverage is monotonic in admit rate',
    [0.02, 0.05, 0.1, 0.2, 0.4, 0.8].every((b, i, a) => i === 0 || academicLeverage(b) >= academicLeverage(a[i - 1])));
  assert('leverage never reaches zero — academics still matter, they stop discriminating', academicLeverage(0.001) > 0.1);

  // The behavioural consequence: raising your SAT is worth less at the
  // selective programme than at the mid one, for the same student.
  const gainAt = (profile) => {
    const weak = { ...AT_25TH.applicant, tests: { hasOfficialScore: true, sat: { composite: 1300, sections: { ebrw: 650, math: 650 } } } };
    const strong = { ...AT_25TH.applicant, tests: { hasOfficialScore: true, sat: { composite: 1560, sections: { ebrw: 780, math: 780 } } } };
    const a = estimateAdmission({ program: profile, applicant: weak, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS });
    const b = estimateAdmission({ program: profile, applicant: strong, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS });
    return (b.probability.point - a.probability.point) / Math.max(1e-9, a.probability.point);
  };
  assert('a 260-point SAT jump buys proportionally less at the selective school',
    gainAt(ultraSelective) < gainAt(midSelective),
    `${(gainAt(ultraSelective) * 100).toFixed(0)}% vs ${(gainAt(midSelective) * 100).toFixed(0)}% relative gain`);

  assert('the signal budget also shrinks with selectivity', signalBudget(0.03) < signalBudget(0.4));

  // Rigor is read against what the school offers, not as a raw count.
  const fourOfFive = scoreRigor({ ap: 4, offeredAdvanced: 5 });
  const sixOfTwenty = scoreRigor({ ap: 6, offeredAdvanced: 20 });
  assert('4 APs at a school offering 5 outscores 6 at a school offering 20',
    fourOfFive.z > sixOfTwenty.z, `${fourOfFive.z.toFixed(2)} vs ${sixOfTwenty.z.toFixed(2)}`);
  assert('with no "offered" figure, rigor is discounted and says so',
    scoreRigor({ ap: 6 }).needsOffered === true);
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Hooks deflate the unhooked base rate and the early-round lift');
// ─────────────────────────────────────────────────────────────────────────────
{
  const adj = unhookedBaseRate(0.05, 0.4, null);
  assert('an unhooked applicant faces a lower rate than the published one', adj.rate < 0.05, `${(adj.rate * 100).toFixed(2)}%`);
  assert('…and is told why', /recruited athletes|legacies|development/i.test(adj.note));
  const hooked = unhookedBaseRate(0.05, 0.4, { legacy: true });
  assert('a hooked applicant faces a higher rate than the published one', hooked.rate > 0.05);
  assert('no hook share means no adjustment', unhookedBaseRate(0.3, 0, null).rate === 0.3);

  const profile = { ...ultraSelective, hookSensitivity: 0.4 };
  const unhookedED = scoreRound({ profile, roundId: 'ed', hooks: null });
  const hookedED = scoreRound({ profile, roundId: 'ed', hooks: { legacy: true } });
  assert('the ED lift shown to an unhooked applicant is below the headline', unhookedED.multiplier < unhookedED.headlineMultiplier);
  assert('…and below the lift a hooked applicant gets', unhookedED.multiplier < hookedED.multiplier);
  assert('…and it says the headline number is somebody else\'s odds', /headline/i.test(unhookedED.note));

  // Round is never silently ignored.
  const rd = estimateAdmission({ program: ultraSelective, applicant: AT_25TH.applicant, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS, roundId: 'rd' });
  const ed = estimateAdmission({ program: ultraSelective, applicant: AT_25TH.applicant, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS, roundId: 'ed' });
  assert('ED produces a different estimate from RD', ed.probability.point > rd.probability.point);

  const unknownRound = estimateAdmission({ program: ultraSelective, applicant: AT_25TH.applicant, portfolio: AT_25TH.portfolio, completeness: EMPTY_COMPLETENESS, roundId: null });
  assert('not saying which round widens the range instead of assuming one',
    (unknownRound.probability.high - unknownRound.probability.low) > (rd.probability.high - rd.probability.low));

  // A programme with one deadline must not offer a round lever that does nothing.
  const rpi = scoreRound({ profile: resolveProfile('rpi-amc-physician-scientist'), roundId: null, hooks: null });
  assert('RPI, which has no early round, reports the lever as inapplicable', rpi.applicable === false && rpi.multiplier === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Never a single number — and missing data widens the range');
// ─────────────────────────────────────────────────────────────────────────────
{
  const r = estimateAdmission({ program: 'umkc-ba-md', applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
  assert('every estimate carries low and high', r.probability.low != null && r.probability.high != null);
  assert('the range is genuinely a range', r.probability.high > r.probability.low);
  assert('the display string is a range, not a number', /–/.test(r.display.range));
  assert('a confidence label is always attached', !!r.confidence?.level);
  assert('the reasons for the uncertainty are itemised', r.uncertainty.reasons.length > 0 && r.uncertainty.reasons.every(x => !!x.label));

  const gappy = estimateAdmission({
    program: 'umkc-ba-md', applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio,
    completeness: { missing: Array.from({ length: 5 }, (_, i) => ({ id: `f${i}` })) },
  });
  assert('five missing intake fields widen the range', (gappy.probability.high - gappy.probability.low) > (r.probability.high - r.probability.low));
  assert('…and lower the confidence label', ['low', 'very-low', 'moderate'].includes(gappy.confidence.level));

  // An unpublished admit rate must be labelled as an estimate everywhere.
  const est = allProfiles().filter(p => p.admitRate.basis !== 'published').slice(0, 5);
  for (const p of est) {
    const out = estimateAdmission({ program: p, applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS });
    if (!out.showsProbability) continue;
    assert(`${p.name}: unpublished admit rate is flagged as an estimate`, out.baseRate.isEstimate === true && !!out.baseRate.estimateWarning);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The research-vs-clinical axis is real, per programme');
// ─────────────────────────────────────────────────────────────────────────────
{
  const researcher = {
    ...AT_25TH.portfolio,
    research: { hours: 600, spanMonths: 24, activeMonths: 20, verifiedShare: 0.5 },
    clinical: { hours: 20, spanMonths: 2, activeMonths: 2, verifiedShare: 0 },
  };
  const clinician = {
    ...AT_25TH.portfolio,
    research: { hours: 0 },
    clinical: { hours: 600, spanMonths: 24, activeMonths: 20, verifiedShare: 0.5 },
  };
  const app = { ...FLAWLESS.applicant, documentedServiceHours: 250 };

  const rpiResearch = estimateAdmission({ program: 'rpi-amc-physician-scientist', applicant: app, portfolio: researcher, completeness: EMPTY_COMPLETENESS });
  const rpiClinical = estimateAdmission({ program: 'rpi-amc-physician-scientist', applicant: app, portfolio: clinician, completeness: EMPTY_COMPLETENESS });
  const umkcResearch = estimateAdmission({ program: 'umkc-ba-md', applicant: app, portfolio: researcher, completeness: EMPTY_COMPLETENESS });
  const umkcClinical = estimateAdmission({ program: 'umkc-ba-md', applicant: app, portfolio: clinician, completeness: EMPTY_COMPLETENESS });

  assert('at RPI (physician-scientist), the researcher outranks the clinician',
    rpiResearch.probability.point > rpiClinical.probability.point);
  assert('at UMKC (six-year clinical), the clinician outranks the researcher',
    umkcClinical.probability.point > umkcResearch.probability.point);
  assert('the axis is stated to the student, not just applied',
    !!resolveProfile('rpi-amc-physician-scientist').emphasisNote && /research/i.test(resolveProfile('rpi-amc-physician-scientist').emphasisNote));

  // Depth beats totals: the same hours, sustained, must beat the same hours crammed.
  const crammed = { ...AT_25TH.portfolio, clinical: { hours: 300, spanMonths: 2, activeMonths: 2, verifiedShare: 1 } };
  const sustained = { ...AT_25TH.portfolio, clinical: { hours: 300, spanMonths: 28, activeMonths: 24, verifiedShare: 1 } };
  const a = estimateAdmission({ program: 'umkc-ba-md', applicant: app, portfolio: crammed, completeness: EMPTY_COMPLETENESS });
  const b = estimateAdmission({ program: 'umkc-ba-md', applicant: app, portfolio: sustained, completeness: EMPTY_COMPLETENESS });
  assert('300 hours across two years beats 300 hours in one summer', b.probability.point > a.probability.point);

  // Verified evidence beats self-report.
  const unverified = { ...sustained, clinical: { ...sustained.clinical, verifiedShare: 0 } };
  const c = estimateAdmission({ program: 'umkc-ba-md', applicant: app, portfolio: unverified, completeness: EMPTY_COMPLETENESS });
  assert('verified hours count for more than self-reported ones', b.probability.point > c.probability.point);
  assert('…and verifying is offered as a driver', c.drivers.some(d => d.key === 'verification'));
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The lottery is said out loud');
// ─────────────────────────────────────────────────────────────────────────────
{
  const asu = resolveProfile('asu-bsn-prelicensure');
  assert('ASU nursing is flagged as having a genuine lottery', asu.lottery.exists === true);
  assert('…with the published wording attached', /random selection/i.test(asu.lottery.published));
  assert('…and language telling the student preparation cannot remove it', /no amount of preparation/i.test(asu.lottery.note));

  const r = estimateAdmission({ program: asu, applicant: FLAWLESS.applicant, portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS, roundId: 'priority' });
  assert('the lottery is applied, not just described', !!r.lottery && r.lottery.after !== r.lottery.before);
  assert('it pulls a strong applicant back toward the base rate', r.lottery.after < r.lottery.before);
  assert('and it widens the range', r.uncertainty.reasons.some(x => x.id === 'lottery'));
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The data is honest about itself');
// ─────────────────────────────────────────────────────────────────────────────
{
  for (const p of PROGRAM_PROFILES) {
    const sum = PORTFOLIO_DIMENSIONS.reduce((s, d) => s + (p.weights[d] ?? 0), 0);
    assert(`${p.id}: weights name every dimension and sum to 1`,
      PORTFOLIO_DIMENSIONS.every(d => p.weights[d] != null) && Math.abs(sum - 1) < 0.005, `sum ${sum.toFixed(3)}`);
    assert(`${p.id}: every gate has published wording and a remedy`,
      (p.gates || []).every(g => !!g.published && !!g.remedy && !!g.label));
    assert(`${p.id}: has at least one source URL`, (p.sources || []).length > 0 && p.sources.every(s => /^https?:\/\//.test(s.url)));

    const claimsPublished = ['gpa', 'sat', 'act'].some(k => ['published', 'mixed'].includes(p.academics?.[k]?.basis))
      || p.admitRate.basis === 'published';
    assert(`${p.id}: nothing claims 'published' without a source`, !claimsPublished || (p.sources || []).length > 0);

    if (p.admitRate.basis !== 'published') {
      assert(`${p.id}: an unpublished admit rate carries an explicit assumption and a note`,
        p.admitRate.value === null && p.admitRate.assumed != null && !!p.admitRate.note);
    }
    assert(`${p.id}: names its research-vs-clinical emphasis`, !!p.emphasis && !!p.emphasisNote);
  }

  // Derived profiles must never invent a requirement.
  const derived = SCHOOL_DATA.slice(0, 40).map(deriveUndergradProfile);
  assert('no derived school profile carries a hard gate', derived.every(p => (p.gates || []).length === 0));
  assert('every derived percentile band is labelled derived, not published',
    derived.every(p => ['derived', 'unknown'].includes(p.academics.sat.basis)));
  assert('every derived profile marks its emphasis as inferred', derived.every(p => p.emphasisBasis === 'inferred'));
  assert('derived weights also sum to 1',
    derived.every(p => Math.abs(PORTFOLIO_DIMENSIONS.reduce((s, d) => s + (p.weights[d] ?? 0), 0) - 1) < 0.005));

  assert(`every U.S. school in the app resolves to a profile (${SCHOOL_DATA.length})`,
    SCHOOL_DATA.every(s => !!resolveProfile(s.name)));
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Intake never assumes a skipped value');
// ─────────────────────────────────────────────────────────────────────────────
{
  const empty = buildApplicant({ derived: {}, answers: {}, portfolio: {} });
  assert('an empty intake produces no rigor count', empty.rigor == null || empty.rigor.ap == null);
  assert('…no citizenship', empty.citizenship == null);
  assert('…and class rank is null-reported rather than assumed', empty.classRank.reported === null && empty.classRank.percentile === null);

  const c = assessCompleteness({ applicant: empty, answers: {} });
  assert('the completeness meter counts a real total', c.total >= 10);
  assert('…reports zero answered for an empty intake', c.have === 0);
  assert('…names every missing field with what it would change', c.missing.length === c.total && c.missing.every(m => !!m.changes && !!m.why));
  assert('…and states it in the sentence the panel shows', /we would need/i.test(c.sentence));

  const partial = buildApplicant({
    derived: { unweightedGpa: 3.9, _provenance: { unweightedGpa: 'GPA term "Junior year"' } },
    answers: { citizenship: 'us-citizen', gradeLevel: '11' }, portfolio: {},
  });
  const c2 = assessCompleteness({ applicant: partial, answers: { citizenship: 'us-citizen', gradeLevel: '11' } });
  assert('answering fields moves the meter', c2.have > c.have);
  assert('provenance survives the merge', partial._provenance.unweightedGpa?.includes('GPA term'));
  assert('a student answer beats a derived value', buildApplicant({
    derived: { unweightedGpa: 3.5 }, answers: { unweightedGpa: 3.8 }, portfolio: {},
  }).unweightedGpa === 3.8);

  // The specific old bug: `Math.max(apCount, 2)` credited every student with
  // two advanced courses they may never have taken.
  assert('no advanced courses are credited to a student who reported none',
    (buildApplicant({ derived: {}, answers: { rigorOffered: 10 }, portfolio: {} }).rigor?.ap ?? null) == null);

  // A weighted GPA must never be read as an unweighted one.
  const weightedOnly = estimateAdmission({
    program: 'vcu-gmed',
    applicant: { ...FLAWLESS.applicant, unweightedGpa: null, weightedGpa: 4.6 },
    portfolio: FLAWLESS.portfolio, completeness: EMPTY_COMPLETENESS,
  });
  assert('a weighted-only student is not silently benchmarked on an unweighted scale',
    weightedOnly.blocked === true || weightedOnly.layers.academic.notes.some(n => /weighted/i.test(n)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} admission-model check(s) failed. These are the properties that keep this calculator from being optimistic — do not weaken an assertion to make it pass.`);
  process.exit(1);
}
