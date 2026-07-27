// Verification for the adaptive baseline (src/lib/sat/baseline.js).
//
// This is a statistical instrument that reports a score to a student, so the
// things worth gating on are statistical, not structural. A unit test that only
// checked "35 questions come back" would have passed happily while the scorer
// under-reported every student by up to 136 points, which is exactly what it
// was doing before this script existed.
//
// The method: simulate students of known ability answering the real staircase,
// with a logistic response model, then check the scorer against the truth it
// was built to recover.
//
//   node scripts/verifySatBaseline.mjs
//   node scripts/verifySatBaseline.mjs --runs 500   (tighter, slower)
//
// Checks:
//   1. Blueprint shape — length, section split, skill/section agreement.
//   2. BIAS — the estimate must not systematically flatter a student. A small
//      CONSERVATIVE bias is acceptable and is the safe direction to err; an
//      optimistic one is not, because a student plans around it.
//   3. PRECISION — run-to-run standard deviation at a fixed ability.
//   4. COVERAGE — how often the reported low-high range actually contains the
//      student's true level. The range is the product's claim; if it is usually
//      wrong it is decoration.
//   5. MONOTONICITY and RESOLUTION — a stronger student must score higher, and
//      two genuinely different students must not collapse to the same number.
import {
  buildBaselineBlueprint, createBaselineSession, recordBaselineResponse, currentSlot,
  nextDifficulty, scoreBaseline, abilityToSectionScore, BASELINE_LENGTH,
  BASELINE_RW_COUNT, BASELINE_MATH_COUNT, difficultyForAbility, updateAbility,
} from '../src/lib/sat/baseline.js';
import { compositeScore } from '../src/data/sat/scoring.js';
import { sectionOfSkill } from '../src/data/sat/taxonomy.js';

const RUNS = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 200;

const errors = [];
const check = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${msg}`); if (!cond) errors.push(msg); };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };

// ── 1. Blueprint ────────────────────────────────────────────────────────────
console.log('\nBlueprint');
for (const seed of [1, 42, 999, 123456]) {
  const bp = buildBaselineBlueprint(seed);
  check(bp.length === BASELINE_LENGTH, `seed ${seed}: ${bp.length} slots (want ${BASELINE_LENGTH})`);
  check(
    bp.filter(s => s.section === 'rw').length === BASELINE_RW_COUNT
    && bp.filter(s => s.section === 'math').length === BASELINE_MATH_COUNT,
    `seed ${seed}: section split ${BASELINE_RW_COUNT}/${BASELINE_MATH_COUNT}`,
  );
  check(bp.every(s => sectionOfSkill(s.skill) === s.section), `seed ${seed}: every skill belongs to its declared section`);
  check(new Set(bp.map(s => s.skill)).size >= 12, `seed ${seed}: spans ${new Set(bp.map(s => s.skill)).size} distinct skills`);
}

// ── Response model ──────────────────────────────────────────────────────────
// Logistic in (ability - item difficulty). The slope is the one modelling
// assumption here; 6 puts a student one band above an item at roughly 85%
// correct, which is about right for well-written items.
const DISCRIMINATION = 6;
const BAND_DIFFICULTY = { E: 0.22, M: 0.51, H: 0.82 };

function simulate(trueAbility) {
  let s = createBaselineSession({ seed: Math.floor(Math.random() * 1e9) });
  while (currentSlot(s)) {
    const slot = currentSlot(s);
    const d = nextDifficulty(s);
    const p = 1 / (1 + Math.exp(-(trueAbility - BAND_DIFFICULTY[d]) * DISCRIMINATION));
    s = recordBaselineResponse(s, {
      question: { skill: slot.skill, difficulty: d },
      choice: 0, correct: Math.random() < p, seconds: 40,
    });
  }
  return scoreBaseline({ ...s, finishedAt: Date.now() });
}

const trueScore = (a) => compositeScore(abilityToSectionScore('rw', a), abilityToSectionScore('math', a));

// ── 2-4. Calibration ────────────────────────────────────────────────────────
console.log(`\nCalibration (${RUNS} simulated runs per level)`);
console.log('  ability   true    est   bias     sd   band  coverage');
for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
  const runs = Array.from({ length: RUNS }, () => simulate(t));
  const mids = runs.map(r => r.mid);
  const truth = trueScore(t);
  const bias = Math.round(mean(mids) - truth);
  const spread = Math.round(sd(mids));
  const band = Math.round(mean(runs.map(r => r.high - r.low)) / 2);
  const coverage = runs.filter(r => r.low <= truth && truth <= r.high).length / RUNS;
  console.log(`   ${t.toFixed(2)}    ${String(truth).padStart(4)}   ${String(Math.round(mean(mids))).padStart(4)}  ${(bias > 0 ? '+' : '') + bias}`.padEnd(42)
    + `${String(spread).padStart(4)}   ±${String(band).padStart(3)}    ${Math.round(coverage * 100)}%`);

  // Asymmetric on purpose. Telling a student they are stronger than they are is
  // the failure that costs them: they under-prepare, apply to the wrong list,
  // and find out on test day. Understating slightly costs them nothing but a
  // pleasant surprise, so the tolerance is generous downward and tight upward.
  check(bias > -95 && bias < 35, `ability ${t}: bias ${bias > 0 ? '+' : ''}${bias} (allowed -95..+35 — optimism is the costly direction)`);
  check(spread < 130, `ability ${t}: run-to-run sd ${spread} under 130`);
  check(coverage > 0.58, `ability ${t}: reported range covers the truth ${Math.round(coverage * 100)}% of the time`);
}

// ── 5. Monotonicity and resolution ──────────────────────────────────────────
console.log('\nMonotonicity and resolution');
const levels = [0.1, 0.3, 0.5, 0.7, 0.9];
const curve = levels.map(t => mean(Array.from({ length: Math.max(60, RUNS / 3) }, () => simulate(t).mid)));
check(curve.every((v, i) => i === 0 || v > curve[i - 1]), `score rises with ability: ${curve.map(Math.round).join(' < ')}`);
for (let i = 1; i < curve.length; i++) {
  check(curve[i] - curve[i - 1] > 70, `resolves ability ${levels[i - 1]} from ${levels[i]} (gap ${Math.round(curve[i] - curve[i - 1])} points)`);
}

// ── Invariants ──────────────────────────────────────────────────────────────
console.log('\nInvariants');
const r = simulate(0.55);
check(r.low < r.mid && r.mid < r.high, 'result is a range around its midpoint, never a bare number');
check(r.low >= 400 && r.high <= 1600, `range stays on the 400-1600 scale: ${r.low}-${r.high}`);
check(r.answered === BASELINE_LENGTH, `all ${BASELINE_LENGTH} answers recorded`);
check(r.sections.rw.answered + r.sections.math.answered === BASELINE_LENGTH, 'section counts sum to the test length');
check(r.flagged.length === r.answered - r.correct, 'every miss is flagged for the Review Log');
check(['low', 'moderate', 'good'].includes(r.confidence), `confidence reported as one of low/moderate/good (${r.confidence})`);
check(
  difficultyForAbility(0.1) === 'E' && difficultyForAbility(0.5) === 'M' && difficultyForAbility(0.9) === 'H',
  'difficulty banding maps low/mid/high ability to E/M/H',
);
check(updateAbility(0.5, true, 0) > 0.5 && updateAbility(0.5, false, 0) < 0.5, 'a correct answer raises the estimate, a wrong one lowers it');
check(
  Math.abs(updateAbility(0.5, true, 0) - 0.5) > Math.abs(updateAbility(0.5, true, 30) - 0.5),
  'step size shrinks as evidence accumulates',
);

console.log('');
if (errors.length) {
  console.log(`Baseline verification FAILED — ${errors.length} problem(s):`);
  errors.forEach(e => console.log(`  x ${e}`));
  process.exit(1);
}
console.log('Baseline verification passed.');
