// Assertions on the SAT scoring model. There is no test runner configured in
// this repo, so this script IS the test suite for src/data/sat/scoring.js —
// the one place where a silent regression would directly corrupt the number we
// show a student. Exits non-zero on any failure.
//
//   node scripts/verifySatScoring.mjs
import {
  rawToScaled, compositeScore, routeModule2, weightedFraction, scoreSection,
  pathCeiling, compositePercentile, marginalPointsPerQuestion,
  ROUTING_THRESHOLD,
} from '../src/data/sat/scoring.js';
import { SAT_SECTIONS, SECTION_IDS } from '../src/data/sat/taxonomy.js';

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

// ── Endpoints ───────────────────────────────────────────────────────────────
for (const sec of SECTION_IDS) {
  const max = SAT_SECTIONS[sec].questions;
  check(`${sec}: raw 0 on the lower path floors at 200`, rawToScaled(sec, 0, 'lower'), 200);
  check(`${sec}: perfect raw on the upper path reaches 800`, rawToScaled(sec, max, 'upper'), 800);

  const lowerCeiling = pathCeiling(sec, 'lower');
  assert(
    `${sec}: the lower path caps around 600 (got ${lowerCeiling})`,
    lowerCeiling >= 560 && lowerCeiling <= 620,
    'A student routed to the easier Module 2 must not be able to reach 800.',
  );

  // Out-of-range inputs must clamp, never extrapolate off the fitted curve.
  assert(`${sec}: negative raw clamps to 200`, rawToScaled(sec, -5, 'lower') === 200);
  assert(`${sec}: raw above the maximum clamps to 800`, rawToScaled(sec, max + 20, 'upper') === 800);
}

// ── Monotonicity ────────────────────────────────────────────────────────────
// Answering one more question right must never lower a score.
for (const sec of SECTION_IDS) {
  for (const path of ['lower', 'upper']) {
    let prev = -Infinity;
    let monotonic = true;
    let brokeAt = null;
    for (let raw = 0; raw <= SAT_SECTIONS[sec].questions; raw++) {
      const s = rawToScaled(sec, raw, path);
      if (s < prev) { monotonic = false; brokeAt = raw; break; }
      prev = s;
    }
    assert(`${sec}/${path}: conversion is monotonic non-decreasing`, monotonic,
      brokeAt !== null ? `score dropped at raw = ${brokeAt}` : '');
  }
}

// ── Every score is a legal SAT value ────────────────────────────────────────
for (const sec of SECTION_IDS) {
  for (const path of ['lower', 'upper']) {
    let allLegal = true;
    let bad = null;
    for (let raw = 0; raw <= SAT_SECTIONS[sec].questions; raw++) {
      const s = rawToScaled(sec, raw, path);
      if (s < 200 || s > 800 || s % 10 !== 0) { allLegal = false; bad = `${raw} -> ${s}`; break; }
    }
    assert(`${sec}/${path}: every score is 200-800 and a multiple of 10`, allLegal, bad ? `first bad: raw ${bad}` : '');
  }
}

// ── The upper path always beats the lower path at equal raw ─────────────────
for (const sec of SECTION_IDS) {
  let dominates = true;
  let bad = null;
  // Compare only where both curves are defined (upper starts mid-range).
  for (let raw = Math.ceil(SAT_SECTIONS[sec].questions * 0.5); raw <= SAT_SECTIONS[sec].questions; raw++) {
    if (rawToScaled(sec, raw, 'upper') <= rawToScaled(sec, raw, 'lower')) { dominates = false; bad = raw; break; }
  }
  assert(`${sec}: the harder Module 2 scores strictly higher at equal raw`, dominates,
    bad !== null ? `failed at raw = ${bad}` : '');
}

// ── Routing ─────────────────────────────────────────────────────────────────
const allEasyCorrect = Array.from({ length: 27 }, () => ({ correct: true, difficulty: 'E' }));
const allWrong = Array.from({ length: 27 }, () => ({ correct: false, difficulty: 'M' }));
check('routing: a perfect Module 1 routes up', routeModule2(allEasyCorrect).path, 'upper');
check('routing: a blank Module 1 routes down', routeModule2(allWrong).path, 'lower');
check('routing: an empty response set routes down', routeModule2([]).path, 'lower');

// Harder items must carry more weight than easy ones.
const hardRight = [{ correct: true, difficulty: 'H' }, { correct: false, difficulty: 'E' }];
const easyRight = [{ correct: false, difficulty: 'H' }, { correct: true, difficulty: 'E' }];
assert('routing: getting the hard item right beats getting the easy one right',
  weightedFraction(hardRight) > weightedFraction(easyRight),
  `hard-right=${weightedFraction(hardRight).toFixed(3)} easy-right=${weightedFraction(easyRight).toFixed(3)}`);

// The documented threshold is the one actually applied.
const atThreshold = [
  ...Array.from({ length: 67 }, () => ({ correct: true, difficulty: 'M' })),
  ...Array.from({ length: 33 }, () => ({ correct: false, difficulty: 'M' })),
];
check(`routing: 67% weighted correct routes up at threshold ${ROUTING_THRESHOLD}`,
  routeModule2(atThreshold).path, 'upper');
const belowThreshold = [
  ...Array.from({ length: 60 }, () => ({ correct: true, difficulty: 'M' })),
  ...Array.from({ length: 40 }, () => ({ correct: false, difficulty: 'M' })),
];
check('routing: 60% weighted correct routes down', routeModule2(belowThreshold).path, 'lower');

// ── Section scoring end to end ──────────────────────────────────────────────
const strongM1 = Array.from({ length: 27 }, (_, i) => ({ correct: true, difficulty: i % 3 === 0 ? 'H' : 'M' }));
const strongM2 = Array.from({ length: 27 }, (_, i) => ({ correct: i < 24, difficulty: 'H' }));
const strong = scoreSection('rw', strongM1, strongM2);
check('scoreSection: a strong performance routes to the upper path', strong.path, 'upper');
assert(`scoreSection: a strong R&W performance scores above 700 (got ${strong.scaled})`, strong.scaled > 700);
check('scoreSection: raw correct is counted across both modules', strong.rawCorrect, 27 + 24);

const weakM1 = Array.from({ length: 27 }, (_, i) => ({ correct: i < 8, difficulty: 'M' }));
const weakM2 = Array.from({ length: 27 }, (_, i) => ({ correct: i < 20, difficulty: 'E' }));
const weak = scoreSection('rw', weakM1, weakM2);
check('scoreSection: a weak Module 1 routes to the lower path', weak.path, 'lower');
assert(`scoreSection: the lower path caps the section at ~600 (got ${weak.scaled})`, weak.scaled <= 600,
  'Even 28/54 correct must not exceed the easier path ceiling.');

// ── Composite ───────────────────────────────────────────────────────────────
check('composite: 800 + 800 = 1600', compositeScore(800, 800), 1600);
check('composite: 200 + 200 = 400', compositeScore(200, 200), 400);
check('composite: out-of-range inputs clamp', compositeScore(950, 100), 1000);

// ── Percentiles ─────────────────────────────────────────────────────────────
assert('percentile: increases with score', compositePercentile(1400) > compositePercentile(1000));
assert('percentile: stays within 1-99', [400, 1000, 1600].every(s => {
  const p = compositePercentile(s);
  return p >= 1 && p <= 99;
}));

// ── Marginal value ──────────────────────────────────────────────────────────
assert('marginal points are never negative',
  SECTION_IDS.every(sec =>
    Array.from({ length: SAT_SECTIONS[sec].questions }, (_, r) =>
      marginalPointsPerQuestion(sec, r, 'lower')).every(v => v >= 0)));

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\nSAT scoring verification — ${passed} assertion(s) passed`);
if (failures.length) {
  console.log(`\n  ${failures.length} FAILURE(S):`);
  failures.forEach(f => console.log(`    x ${f}`));
  console.log('\nScoring verification FAILED.\n');
  process.exit(1);
}
console.log('All scoring assertions passed.\n');
