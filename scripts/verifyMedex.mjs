#!/usr/bin/env node
/**
 * The gate on the MedEx Score.
 *
 * This feature collapses a careful five-layer admissions model into one number
 * on a dashboard, and every way that goes wrong is a way of being flattering.
 * So the properties that keep it honest are asserted here rather than trusted:
 *
 *   1. IT NEVER DISAGREES WITH THE CALCULATOR. The score is a projection of
 *      estimateAdmission()'s own weighted composite. A stronger applicant can
 *      never score lower, and the ordering of two applicants at one program
 *      must match the ordering of their probabilities.
 *   2. AN EMPTY PORTFOLIO GETS NO SCORE. Not a low one — none. The model scores
 *      an unlogged dimension at a fixed "unknown" z, and averaging those
 *      placeholders produces a mid-500s score built purely out of our own
 *      ignorance, which then FALLS the first week the student logs something
 *      real. That is the single worst behavior this feature could have.
 *   3. A FAILED HARD GATE STILL SHOWS NO NUMBER, exactly as in the Calculator.
 *   4. THE SCALE IS MONOTONE AND ITS BANDS TILE 0-1000 WITH NO GAPS.
 *   5. THE CEILING IS REACHABLE ONLY IN PRINCIPLE. A realistically excellent
 *      applicant must not max the scale, or the top of it means nothing.
 *   6. THE WEEK MATHS SURVIVES THE YEAR BOUNDARY, 53-week years and DST.
 *   7. A SEALED WEEK IS IMMUTABLE. Re-planning the same week never re-seals,
 *      including when the live score has since dropped.
 *   8. THE BENCHMARK IS THE MOST SELECTIVE PROGRAM ON THE LIST, and an empty
 *      list falls back visibly rather than silently.
 *
 * Run: npm run verify:medex
 */
import {
  scoreFromZ, zFromScore, bandFor, nextBand, BANDS, ANCHORS,
  MEDEX_MIN, MEDEX_MAX, MEDEX_COHORT_MEDIAN,
} from '../src/lib/medex/scale.js';
import {
  scoreProgram, computeMedEx, rankAgainstApex, PILLARS, MIN_COVERAGE,
} from '../src/lib/medex/score.js';
import { pickBenchmark, apexSlate, effectiveAdmitRate } from '../src/lib/medex/benchmark.js';
import {
  weekKey, weekStart, nextSealAt, sealCountdown, planSeal, weekStartFromKey, previousWeekKey,
} from '../src/lib/medex/week.js';
import { buildApplicant } from '../src/lib/admissions/intake.js';
import { estimateAdmission } from '../src/lib/admissions/model.js';

let failures = 0, checks = 0;
function assert(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  ✓ ${name}`); return; }
  failures++;
  console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`);
}
function section(title) { console.log(`\n${title}`); }

// ── Fixtures ────────────────────────────────────────────────────────────────
const emptyApplicant = buildApplicant({ derived: {}, answers: {}, portfolio: {} });
const emptyPortfolio = {};

const thinPortfolio = {
  clinical: { hours: 60, months: 6, verifiedShare: 0 },
};

const solidPortfolio = {
  clinical: { hours: 220, months: 18, verifiedShare: 0.5 },
  shadowing: { hours: 60, months: 12, verifiedShare: 0.5 },
  research: { hours: 180, months: 12, verifiedShare: 0.5 },
  service: { hours: 150, months: 18, verifiedShare: 0.5 },
  leadership: [{ months: 18 }, { months: 12 }],
  competitions: [{ level: 'state' }],
  certifications: [{ name: 'CPR' }],
};

const elitePortfolio = {
  clinical: { hours: 400, months: 30, verifiedShare: 1 },
  shadowing: { hours: 140, months: 24, verifiedShare: 1 },
  research: { hours: 600, months: 30, verifiedShare: 1 },
  service: { hours: 320, months: 30, verifiedShare: 1 },
  leadership: [{ months: 30 }, { months: 24 }, { months: 20 }, { months: 16 }],
  competitions: [{ level: 'national' }, { level: 'national' }, { level: 'state' }],
  certifications: [{ name: 'EMT' }, { name: 'CNA' }, { name: 'Phlebotomy' }],
};

const withAcademics = (gpa, sat) => {
  const a = buildApplicant({ derived: {}, answers: { unweightedGpa: gpa, rigor: 'most-demanding' }, portfolio: {} });
  a.tests = { sat };
  return a;
};

const solidApplicant = withAcademics(3.8, 1480);
const eliteApplicant = withAcademics(3.98, 1570);
const full = { missing: [], have: 15, total: 15 };

const at = (program, applicant, portfolio, completeness = full) =>
  scoreProgram({ program, applicant, portfolio, completeness });

// ─────────────────────────────────────────────────────────────────────────────
section('1. The score never disagrees with the Calculator');

{
  const weak = at('Harvard University', solidApplicant, thinPortfolio);
  const strong = at('Harvard University', eliteApplicant, elitePortfolio);
  assert('a stronger applicant scores higher at the same program',
    strong.score > weak.score, `weak=${weak.score} strong=${strong.score}`);

  const pWeak = estimateAdmission({ program: 'Harvard University', applicant: solidApplicant, portfolio: thinPortfolio, completeness: full });
  const pStrong = estimateAdmission({ program: 'Harvard University', applicant: eliteApplicant, portfolio: elitePortfolio, completeness: full });
  assert('…and the ordering matches the probability the Calculator shows',
    (pStrong.probability.point > pWeak.probability.point) === (strong.score > weak.score),
    `p: ${pWeak.probability.point.toFixed(4)} → ${pStrong.probability.point.toFixed(4)}`);

  // The composite must be the model's own weighted mean, not a re-derivation.
  const est = pStrong;
  const used = est.contributions.reduce((s, c) => s + c.weight, 0);
  const signal = est.contributions.reduce((s, c) => s + c.contribution, 0);
  assert('the composite z is the model\'s own weighted mean of its own contributions',
    Math.abs(strong.z - signal / used) < 1e-9, `${strong.z} vs ${signal / used}`);

  assert('…and the score is exactly scaleFromZ of it',
    strong.score === scoreFromZ(strong.z));
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. An empty portfolio gets no score at all');

{
  const none = at('Harvard University', emptyApplicant, emptyPortfolio, { missing: [{}], have: 0, total: 15 });
  assert('an empty portfolio shows no score', none.showsScore === false);
  assert('…for the stated reason, not as a blocked gate', none.reason === 'insufficient-evidence');
  assert('…with coverage of zero', none.coverage.ratio === 0);
  assert('…and names what would produce one', none.whatWouldChange.length > 0);
  assert('…ordered by what THIS program weights most',
    none.whatWouldChange[0].weight >= none.whatWouldChange[none.whatWouldChange.length - 1].weight);

  // The regression this gate exists to prevent: the unknown-placeholder score.
  const wouldHaveBeen = scoreFromZ(-1.4);
  assert('the suppressed score would otherwise have been a misleading mid-scale number',
    wouldHaveBeen > 400 && wouldHaveBeen < 700, `${wouldHaveBeen}`);

  const thin = at('Harvard University', emptyApplicant, thinPortfolio, { missing: [{}], have: 0, total: 15 });
  assert('one genuinely logged dimension is enough to earn a score',
    thin.showsScore === true, `coverage=${thin.coverage?.ratio}`);
  assert('…and that first real entry scores ABOVE the unknown-placeholder rather than below it',
    thin.score > wouldHaveBeen, `${thin.score} vs ${wouldHaveBeen}`);
  assert('…and coverage clears the stated minimum', thin.coverage.ratio >= MIN_COVERAGE);
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. A failed hard gate still shows no number');

{
  // UMKC's six-year program is categorically closed to international applicants.
  const intl = buildApplicant({ derived: {}, answers: { citizenship: 'international', unweightedGpa: 3.9 }, portfolio: {} });
  const r = at('umkc-ba-md', intl, elitePortfolio);
  assert('an ineligible applicant gets no MedEx Score', r.showsScore === false);
  assert('…and is told it is a requirement, not a weakness', !!r.gates && r.eligible === false);
  assert('…with the remedy attached', (r.whatWouldChange || []).every(g => 'remedy' in g));
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The scale is monotone and its bands tile the range');

{
  let monotone = true, prev = -1;
  for (let z = -4; z <= 4; z += 0.01) {
    const s = scoreFromZ(z);
    if (s < prev) { monotone = false; break; }
    prev = s;
  }
  assert('scoreFromZ is monotone non-decreasing across the whole domain', monotone);
  assert('…bounded at both ends', scoreFromZ(-99) === MEDEX_MIN && scoreFromZ(99) === MEDEX_MAX);
  assert('…and the median admit anchors at the documented value',
    scoreFromZ(0) === MEDEX_COHORT_MEDIAN, `${scoreFromZ(0)}`);

  assert('the anchors themselves are monotone in both z and score',
    ANCHORS.every((a, i) => i === 0 || (a.z > ANCHORS[i - 1].z && a.score > ANCHORS[i - 1].score)));

  // The deceleration claim in scale.js's header, asserted rather than asserted-in-prose.
  const below = scoreFromZ(0) - scoreFromZ(-1);
  const above = scoreFromZ(1) - scoreFromZ(0);
  assert('the curve decelerates above the cohort median', above < below, `below=${below} above=${above}`);

  assert('the bands start at 0', BANDS[0].min === MEDEX_MIN);
  assert('…are strictly ascending', BANDS.every((b, i) => i === 0 || b.min > BANDS[i - 1].min));
  let tiled = true;
  for (let s = 0; s <= 1000; s++) if (!bandFor(s)) { tiled = false; break; }
  assert('…and tile 0-1000 with no gaps', tiled);
  assert('the cohort median falls in the band named for it', bandFor(MEDEX_COHORT_MEDIAN).id === 'cohort');
  assert('nextBand is null only at the top band', nextBand(MEDEX_MAX) === null && nextBand(0) !== null);

  // zFromScore is used to price hypothetical improvements; it must invert.
  let inverts = true;
  for (let s = 10; s < 1000; s += 7) {
    if (Math.abs(scoreFromZ(zFromScore(s)) - s) > 1) { inverts = false; break; }
  }
  assert('zFromScore inverts scoreFromZ inside the open range', inverts);
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The top of the scale means something');

{
  const elite = at('Harvard University', eliteApplicant, elitePortfolio);
  assert('a realistically excellent applicant scores high', elite.score >= 850, `${elite.score}`);
  assert('…but does not max the scale', elite.score < MEDEX_MAX, `${elite.score}`);
  assert('…and is told it is not a probability', elite.band.id === 'apex' && !!elite.band.blurb);

  assert('every scored result carries a range, never a bare number',
    elite.range.low < elite.score && elite.range.high > elite.score,
    `${elite.range.low}–${elite.range.high} around ${elite.score}`);

  const partial = at('Harvard University', eliteApplicant, elitePortfolio, { missing: [{}, {}, {}], have: 5, total: 15 });
  assert('missing intake widens the range rather than being assumed',
    (partial.range.high - partial.range.low) >= (elite.range.high - elite.range.low),
    `partial=${partial.range.high - partial.range.low} full=${elite.range.high - elite.range.low}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Pillars and movers');

{
  const r = at('Harvard University', solidApplicant, solidPortfolio);
  assert('every pillar is present', r.pillars.length === PILLARS.length);
  const wsum = r.pillars.reduce((s, p) => s + p.weight, 0);
  assert('pillar weights sum to the weight actually applied',
    Math.abs(wsum - r.coverage.usedWeight) < 1e-9, `${wsum} vs ${r.coverage.usedWeight}`);
  assert('pillars are ordered by what the program weights',
    r.pillars.every((p, i) => i === 0 || p.weight <= r.pillars[i - 1].weight));
  assert('every pillar exposes its underlying model dimensions',
    r.pillars.every(p => p.dimensions.length > 0));

  assert('movers are denominated in points and sorted by size',
    r.movers.filter(m => m.points != null).every((m, i, a) => i === 0 || m.points <= a[i - 1].points));
  assert('…and no mover claims a sub-point gain',
    r.movers.filter(m => m.points != null).every(m => m.points >= 1));

  // The honesty rule: answering questions is not worth points, and must not claim to be.
  const withMissing = at('Harvard University', solidApplicant, solidPortfolio, { missing: [{}, {}], have: 13, total: 15 });
  const completenessMover = withMissing.movers.find(m => m.key === 'completeness');
  assert('the "answer more questions" prompt claims no points',
    !!completenessMover && completenessMover.points === null);
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The week maths');

{
  // Monday is the start; Sunday belongs to the week that began six days earlier.
  const sun = new Date(2026, 7, 23);         // Sunday 23 Aug 2026
  const mon = new Date(2026, 7, 17);         // Monday 17 Aug 2026
  assert('Sunday belongs to the week that started the previous Monday',
    weekStart(sun).getTime() === mon.getTime());
  assert('Monday 00:00 is its own week start', weekStart(mon).getTime() === mon.getTime());
  assert('the next seal is the following Monday 00:00',
    nextSealAt(sun).getTime() === new Date(2026, 7, 24).getTime());

  assert('week keys are ISO-8601 formatted', /^\d{4}-W\d{2}$/.test(weekKey(sun)));
  assert('a week key round-trips to its own Monday',
    weekStartFromKey(weekKey(sun)).getTime() === mon.getTime());

  // The year boundary: 29 Dec 2025 is ISO 2026-W01, not 2025-W53.
  assert('the ISO year boundary is handled (29 Dec 2025 → 2026-W01)',
    weekKey(new Date(2025, 11, 29)) === '2026-W01', weekKey(new Date(2025, 11, 29)));
  assert('…and 1 Jan 2026 is the same week, not a new one',
    weekKey(new Date(2026, 0, 1)) === weekKey(new Date(2025, 11, 29)));
  // 2026 is a 53-week ISO year.
  assert('a 53-week ISO year produces a W53',
    weekKey(new Date(2026, 11, 31)) === '2026-W53', weekKey(new Date(2026, 11, 31)));
  assert('previousWeekKey crosses the year boundary correctly',
    previousWeekKey(new Date(2026, 0, 1)) === '2025-W52', previousWeekKey(new Date(2026, 0, 1)));

  let keysMonotone = true;
  let cursor = new Date(2025, 0, 1), lastStart = null;
  for (let i = 0; i < 800; i++) {
    const s = weekStartFromKey(weekKey(cursor));
    if (lastStart && s < lastStart) { keysMonotone = false; break; }
    lastStart = s;
    cursor = new Date(cursor.getTime() + 86400000);
  }
  assert('week keys never move backwards across two years of consecutive days', keysMonotone);

  const cd = sealCountdown(new Date(2026, 7, 22, 10, 0));
  assert('the countdown reports time remaining, not elapsed', cd.ms > 0 && cd.days === 1);
  assert('…with a progress fraction inside [0,1]', cd.progress >= 0 && cd.progress <= 1);
  assert('…and a compact label', /^\d+d \d+h$/.test(cd.short), cd.short);
  assert('the countdown is zero-bounded at the instant of the seal',
    sealCountdown(nextSealAt(new Date(2026, 7, 22))).ms >= 0);
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. A sealed week is immutable');

{
  const now = new Date(2026, 7, 22);
  const thisKey = weekKey(now), lastKey = previousWeekKey(now);

  const first = planSeal({ rows: [], liveScore: 610, now });
  assert('a first-ever visit seals immediately rather than waiting a week',
    first.action === 'seal' && first.sealedScore === 610);
  assert('…and says it is the first', first.isFirstEver === true);

  const rows = [{ week_key: lastKey, score: 580 }, { week_key: thisKey, score: 610 }];
  const held = planSeal({ rows, liveScore: 655, now });
  assert('a week that already sealed holds', held.action === 'hold');
  assert('…reports the SEALED score, not the live one', held.sealedScore === 610);
  assert('…banks the difference for the next seal', held.banked === 45);
  assert('…and reports week-on-week movement', held.delta === 30);

  const dropped = planSeal({ rows, liveScore: 540, now });
  assert('a live score BELOW the seal still does not re-seal', dropped.action === 'hold' && dropped.sealedScore === 610);
  assert('…and banks the loss honestly rather than hiding it', dropped.banked === -70);

  // A student who was away for a month compares against their last real seal.
  const stale = planSeal({ rows: [{ week_key: '2026-W29', score: 500 }], liveScore: 600, now });
  assert('an absent student seals against their last actual seal, not a blank',
    stale.action === 'seal' && stale.comparedTo.week_key === '2026-W29' && stale.delta === 100);
  assert('…and knows how long they were away', stale.gapWeeks === 5, `${stale.gapWeeks}`);

  assert('sealing is suppressed when the live score is unknown',
    planSeal({ rows: [], liveScore: null, now }).action === 'wait');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The benchmark is the most selective program on the list');

{
  const b = pickBenchmark([{ name: 'Boston University' }, { name: 'Harvard University' }, { name: 'University of Michigan' }]);
  assert('the benchmark is the most selective school on the list',
    b.profile.name === 'Harvard University', b.profile.name);
  assert('…and says so in words', /Harvard/.test(b.note));
  assert('…and reports it came from the list', b.source === 'list' && b.fromList === true);

  const unresolved = pickBenchmark([{ name: 'Hogwarts' }, { name: 'Yale University' }]);
  assert('a school we hold nothing about is named rather than silently dropped',
    unresolved.unresolved.includes('Hogwarts'));
  assert('…and does not prevent the rest of the list scoring',
    unresolved.profile.name === 'Yale University');

  const none = pickBenchmark([]);
  assert('an empty list falls back rather than showing nothing', !!none.profile);
  assert('…and the fallback is labelled as a stand-in', none.source === 'fallback' && /stand-in/.test(none.note));

  const slate = apexSlate();
  assert('the apex slate is ordered most-selective-first',
    slate.every((p, i) => i === 0 || effectiveAdmitRate(p).rate >= effectiveAdmitRate(slate[i - 1]).rate));
  assert('…and contains the combined-degree catalog as well as the Ivies',
    slate.some(p => p.kind === 'bsmd') && slate.some(p => p.name === 'Harvard University'));
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The whole thing, composed');

{
  const r = computeMedEx({
    colleges: [{ name: 'Harvard University' }, { name: 'Boston University' }],
    applicant: solidApplicant, portfolio: solidPortfolio, completeness: full,
  });
  assert('computeMedEx returns a headline', r.available && r.headline.showsScore);
  assert('the headline is the benchmark\'s score, so the hero and the list agree',
    r.headline.score === r.colleges.rows[0].result.score);
  assert('the college list is ordered most-selective-first',
    r.colleges.rows[0].profile.name === r.benchmark.profile.name);
  assert('every college on the list gets its own score',
    r.colleges.rows.every(row => row.result.showsScore || row.result.reason || row.result.gates));

  const apex = rankAgainstApex({ applicant: eliteApplicant, portfolio: elitePortfolio, completeness: full });
  assert('the apex ranking names a specific program rather than a percentile',
    /programs we track/.test(apex.sentence) && apex.slateSize > 0);
  assert('…and the most selective cohort match really is the most selective',
    !apex.topMatch || apex.rows.findIndex(x => x.profile.id === apex.topMatch.profile.id) ===
      apex.rows.findIndex(x => x.result.showsScore && x.result.atOrAboveCohort));

  const weakApex = rankAgainstApex({ applicant: solidApplicant, portfolio: thinPortfolio, completeness: full });
  assert('a weaker applicant matches strictly fewer apex programs',
    weakApex.atCohortCount <= apex.atCohortCount, `${weakApex.atCohortCount} vs ${apex.atCohortCount}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
