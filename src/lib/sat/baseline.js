// ─────────────────────────────────────────────────────────────────────────────
// The Baseline — a 35-question adaptive placement test, generated one question
// at a time.
//
// ── Why this exists alongside the Diagnostic ─────────────────────────────────
// The Diagnostic is a fixed, wide, shallow sweep drawn from the static bank: it
// asks one or two questions per skill so the prescription that follows points
// at the right topics. It is a coverage instrument, and it is bad at the thing
// this is good at — telling a student roughly where they actually score. A
// fixed set of 30 mid-difficulty items gives a strong student 30 easy questions
// and a struggling one 30 impossible ones, and both walk away with a number
// built almost entirely from the test's difficulty rather than their ability.
//
// This is question-adaptive. Every item is chosen — and written — after seeing
// how the previous one went. Get one right and the next is harder; miss it and
// the next is easier. What that buys is precision: an adaptive sequence spends
// its questions near the student's actual ability, which is exactly where a
// question carries the most information about them. Thirty-five adaptive items
// pin an ability estimate far more tightly than sixty fixed ones.
//
// ── Why the questions are generated rather than selected ─────────────────────
// A staircase only works if there is always a question at the difficulty the
// staircase asks for, in the skill the blueprint asks for, that the student has
// not already seen. The static bank has 83 items across 28 skills; it cannot
// serve that for one student, let alone for a retake a week later. So each item
// is authored on demand against the exact (skill, difficulty) the algorithm
// just computed, grounded in the student's profile, and verified before it is
// shown. Cost is bounded: one item per turn, 35 turns, once a week.
//
// ── The ability model ────────────────────────────────────────────────────────
// A full IRT implementation would be dishonest here — three-parameter logistic
// calibration needs thousands of responses per item, and these items are new on
// every run. What this uses instead is a Robbins-Monro stochastic-approximation
// staircase: ability moves toward the observed outcome by a step that shrinks
// as evidence accumulates. Early answers move the estimate a long way; by
// question thirty each one nudges it. That converges on the ability level where
// the student gets roughly SUCCESS_TARGET of items right, which is the standard
// and well-understood way to run an adaptive sequence without a calibrated
// item pool — and, unlike a fake IRT model, it is honest about what it is.
//
// The output is deliberately a RANGE with a confidence level, never a point
// score. See projection.js for the same discipline applied elsewhere: a student
// told "you're a 1290" after 35 questions will believe it, and it is not
// something 35 questions can support.
// ─────────────────────────────────────────────────────────────────────────────
import {
  SAT_SECTIONS, SAT_DOMAINS, SAT_SKILLS, SKILLS_BY_SECTION, DOMAINS_BY_SECTION,
  SECTION_IDS, skillMeta, sectionOfSkill,
} from '../../data/sat/taxonomy.js';
import { rawToScaled, compositeScore, compositePercentile } from '../../data/sat/scoring.js';

// ── Shape ────────────────────────────────────────────────────────────────────
export const BASELINE_LENGTH = 35;
// Split follows the real exam's question counts (54 R&W / 44 Math), not an even
// split — an estimate is only transferable to a real score if the sections are
// weighted the way the real test weights them.
export const BASELINE_RW_COUNT = 19;
export const BASELINE_MATH_COUNT = BASELINE_LENGTH - BASELINE_RW_COUNT; // 16

// One baseline per week. Not an arbitrary throttle: the estimate is only
// meaningful if something changed between runs, and nothing meaningful changes
// in two days. A student who could retake nightly would be measuring noise and
// reading it as progress — which is worse than not measuring at all, because it
// erodes trust in the number when it finally does move.
export const BASELINE_COOLDOWN_DAYS = 7;

// ── Ability scale ────────────────────────────────────────────────────────────
// 0 = would not clear the easiest items; 1 = clears the hardest reliably.
// Difficulty bands are cut so the middle band is widest, matching where most
// items and most students actually sit.
export const ABILITY_START = 0.5;
export const EASY_CEILING = 0.34;
export const HARD_FLOOR = 0.68;

// The staircase targets a success rate a little above chance-corrected 50%.
// Below this the sequence feels punishing and students disengage; above it the
// items stop discriminating because almost everything is answered correctly.
export const SUCCESS_TARGET = 0.6;

// Step size at question n. Large early (the estimate is nearly uninformed),
// small late (it is mostly settled). The 1/(n+k) form is the Robbins-Monro
// schedule; k controls how fast it cools.
const STEP_K = 3.2;
const STEP_SCALE = 0.62;
export const stepSize = (n) => STEP_SCALE / (n + STEP_K);

/** Which difficulty band an ability estimate should be tested at. */
export function difficultyForAbility(ability) {
  if (ability < EASY_CEILING) return 'E';
  if (ability >= HARD_FLOOR) return 'H';
  return 'M';
}

/**
 * Update the ability estimate after one response.
 * Correct pushes up by (1 - target) x step, incorrect pulls down by
 * target x step — the asymmetry is what makes the sequence settle at
 * SUCCESS_TARGET rather than at 50%.
 */
export function updateAbility(ability, correct, questionIndex) {
  const step = stepSize(questionIndex);
  const delta = correct ? step * (1 - SUCCESS_TARGET) * 2 : -step * SUCCESS_TARGET * 2;
  return Math.min(1, Math.max(0, ability + delta));
}

// ── Blueprint ────────────────────────────────────────────────────────────────
// Which skill each slot tests. Built up-front from the real domain shares so a
// baseline is representative rather than accidentally 40% grammar, and shuffled
// within each section so the sequence does not march through one domain at a
// time (which would let a student's fatigue land entirely on one skill).

function allocateByShare(section, total) {
  const domains = DOMAINS_BY_SECTION[section] || [];
  const out = [];
  // Largest-remainder allocation: proportional shares that still sum exactly to
  // `total`. Naive rounding drifts and would leave the test at 34 or 36 items.
  const exact = domains.map(d => ({ domain: d, want: (SAT_DOMAINS[d]?.share || 0) * total }));
  let assigned = 0;
  for (const e of exact) { e.n = Math.floor(e.want); assigned += e.n; }
  exact.sort((a, b) => (b.want - Math.floor(b.want)) - (a.want - Math.floor(a.want)));
  let i = 0;
  while (assigned < total && exact.length) { exact[i % exact.length].n += 1; assigned++; i++; }

  for (const e of exact) {
    // Within a domain, spread across its skills by their own weights, always
    // hitting the heaviest skill first so a thin allocation still covers what
    // the exam actually tests most.
    const skills = (SKILLS_BY_SECTION[section] || [])
      .filter(s => SAT_SKILLS[s].domain === e.domain)
      .sort((a, b) => (SAT_SKILLS[b].weight || 0) - (SAT_SKILLS[a].weight || 0));
    if (!skills.length) continue;
    for (let k = 0; k < e.n; k++) out.push(skills[k % skills.length]);
  }
  return out;
}

/**
 * The full 35-slot plan. Each slot names a section and a skill; the difficulty
 * is NOT fixed here — it is decided at the moment the slot is reached, from the
 * ability estimate at that point. That is the whole idea.
 */
export function buildBaselineBlueprint(seed = Date.now()) {
  // Deterministic shuffle so a resumed baseline presents the same plan.
  let a = (seed >>> 0) || 1;
  const rand = () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; };
  const shuffle = (arr) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };

  const rw = shuffle(allocateByShare('rw', BASELINE_RW_COUNT)).map(skill => ({ section: 'rw', skill }));
  const math = shuffle(allocateByShare('math', BASELINE_MATH_COUNT)).map(skill => ({ section: 'math', skill }));

  // Interleave R&W and Math rather than running one section then the other.
  // Two reasons: a student who runs out of stamina otherwise contributes their
  // worst answers entirely to whichever section came last, which biases the
  // section estimate; and alternating keeps the test from feeling like an hour
  // of grammar followed by an hour of algebra.
  const plan = [];
  let ri = 0;
  let mi = 0;
  while (ri < rw.length || mi < math.length) {
    // Two R&W to roughly every two Math, tracking the 19:16 ratio closely
    // enough that neither section runs dry well before the end.
    if (ri < rw.length) plan.push(rw[ri++]);
    if (ri < rw.length && (ri * BASELINE_MATH_COUNT) / BASELINE_RW_COUNT > mi) plan.push(rw[ri++]);
    if (mi < math.length) plan.push(math[mi++]);
  }
  return plan.slice(0, BASELINE_LENGTH).map((slot, i) => ({ ...slot, index: i }));
}

// ── Session state ────────────────────────────────────────────────────────────

/** A fresh baseline session. Persisted so a closed tab doesn't lose progress. */
export function createBaselineSession({ seed = Date.now(), targetScore = null } = {}) {
  return {
    id: `bl_${seed.toString(36)}`,
    startedAt: Date.now(),
    seed,
    targetScore,
    blueprint: buildBaselineBlueprint(seed),
    responses: [],                                   // one per answered slot
    ability: { overall: ABILITY_START, rw: ABILITY_START, math: ABILITY_START },
    finishedAt: null,
  };
}

/** The slot the student is on, or null when the test is complete. */
export function currentSlot(session) {
  if (!session) return null;
  const i = session.responses.length;
  return i < session.blueprint.length ? session.blueprint[i] : null;
}

/**
 * What difficulty to author the next item at.
 * Uses the SECTION's ability rather than the overall one: a student can easily
 * be a 700 in maths and a 520 in reading, and feeding them hard reading items
 * because their algebra is strong measures neither well.
 */
export function nextDifficulty(session) {
  const slot = currentSlot(session);
  if (!slot) return null;
  return difficultyForAbility(session.ability[slot.section] ?? session.ability.overall);
}

/**
 * Record one answer and advance. Returns a NEW session object.
 *
 * `response` carries enough to rebuild the review later: the item itself is
 * stored alongside the outcome, because a generated question exists nowhere
 * else — if it isn't kept here it is gone, and the student cannot review the
 * questions they just missed.
 */
export function recordBaselineResponse(session, { question, choice, correct, seconds }) {
  const slot = currentSlot(session);
  if (!slot) return session;

  const n = session.responses.length;
  const section = slot.section;
  const responses = [...session.responses, {
    index: n,
    section,
    skill: question?.skill || slot.skill,
    difficulty: question?.difficulty || 'M',
    correct: !!correct,
    choice: choice ?? null,
    seconds: Number.isFinite(seconds) ? seconds : null,
    question,
    at: Date.now(),
  }];

  // The section estimate is updated on that section's own question count, so a
  // section's step size cools at the rate its own evidence accumulates.
  const sectionAnswered = session.responses.filter(r => r.section === section).length;

  return {
    ...session,
    responses,
    ability: {
      overall: updateAbility(session.ability.overall, correct, n),
      [section]: updateAbility(session.ability[section], correct, sectionAnswered),
      ...(section === 'rw' ? { math: session.ability.math } : { rw: session.ability.rw }),
    },
  };
}

// ── Scoring ──────────────────────────────────────────────────────────────────
//
// The estimate used for SCORING is not the same quantity as the one used for
// item SELECTION, and conflating them was a real bug worth explaining.
//
// The staircase above exists to steer: it walks toward the difficulty where the
// student succeeds about SUCCESS_TARGET of the time, and that is exactly what
// you want driving which question comes next. But it saturates. A student who
// cannot reach 60% even on the easiest band gets pushed down every single turn
// and lands on the floor — and so does a much weaker student, and so does a
// slightly stronger one. All three come out identical, which is precisely the
// resolution failure the whole test exists to avoid, and it happens at the two
// ends of the range where students most need an honest answer.
//
// So scoring uses a separate estimator over the responses actually collected:
// anchor at the mean difficulty the student was administered, then shift by how
// far their accuracy at those difficulties fell from the target the staircase
// was aiming at. Beat the target on hard items and you land above the hard
// band; miss it on easy ones and you land below the easy band. That keeps
// resolving past the point where the staircase has run out of room.

// Where each band sits on the ability scale. These are the midpoints the
// difficulty cuts imply, not free parameters.
const BAND_CENTER = { E: 0.22, M: 0.51, H: 0.82 };
// How far one unit of accuracy deviation moves the estimate. Calibrated so a
// student answering everything correctly at a band lands roughly a full band
// above it, and one answering nothing correctly lands roughly a band below.
const ACCURACY_SLOPE = 0.62;

// The reference point for SCORING is 50% success, not SUCCESS_TARGET, and the
// difference between those two numbers is worth being explicit about because
// getting it wrong silently under-scored every student.
//
// "Ability" here means the difficulty a student clears about half the time —
// the conventional definition, and the one the band centers above are stated
// in. The staircase, however, deliberately steers to a HIGHER success rate
// (SUCCESS_TARGET), which means it settles on items EASIER than the student's
// ability by construction. Score against the staircase's own target and that
// gap is baked straight into the result as a systematic underestimate: measured
// over 200 simulated runs per level it cost between 64 and 136 points, worst at
// the top of the scale where students are most attached to the number.
//
// Referencing 50% removes it. The selection target stays where it is — a
// sequence that lets a student succeed 60% of the time is far less demoralising
// than one pinned at coin-flip, and it costs nothing now that scoring no longer
// inherits it.
const SCORING_REFERENCE = 0.5;

/**
 * Ability from the responses themselves, independent of where the staircase
 * happened to stop. Returns null when there is too little to say.
 */
export function estimateAbilityFromResponses(responses) {
  if (!responses?.length) return null;
  const centers = responses.map(r => BAND_CENTER[r.difficulty] ?? BAND_CENTER.M);
  const meanCenter = centers.reduce((s, c) => s + c, 0) / centers.length;
  const accuracy = responses.filter(r => r.correct).length / responses.length;
  return Math.min(1, Math.max(0, meanCenter + ACCURACY_SLOPE * (accuracy - SCORING_REFERENCE)));
}

/**
 * The number actually used for a section's score. Blends the response-based
 * estimator with the staircase position, weighted toward the estimator — the
 * staircase still carries real information (it encodes the ORDER answers came
 * in, which accuracy alone throws away), it just cannot be trusted alone at the
 * extremes.
 */
export function blendedAbility(responses, staircase) {
  const observed = estimateAbilityFromResponses(responses);
  if (observed == null) return staircase;
  // Weighted hard toward the estimator. The staircase carries some real
  // information — it encodes the ORDER answers arrived in, which a bare
  // accuracy figure throws away — but it converges on SUCCESS_TARGET rather
  // than the 50% reference the score is defined against, so every point of
  // weight given to it reintroduces a fraction of the bias corrected above.
  // At 0.3 that residue was still worth up to 70 points at the top of the
  // scale; 0.15 keeps the ordering signal at a cost small enough to ignore.
  return observed * 0.85 + staircase * 0.15;
}


// Where a baseline ability estimate is treated as clearing the real test's
// module-2 routing bar, and how wide the blend around it is.
export const ROUTE_BAR = 0.62;
const ROUTE_BLEND = 0.08;

/**
 * Map a section ability estimate onto that section's 200-800 scale.
 *
 * The mapping goes through rawToScaled() rather than inventing a second scale,
 * so a baseline result and a full-test result are expressed in the same
 * currency. An ability of `a` is treated as "would answer a of that section's
 * questions correctly", and the module path decides the ceiling — clearing the
 * bar is what makes the upper score range reachable at all.
 *
 * The path is BLENDED across a band around the bar rather than switched at it.
 * A hard switch is faithful to how the real test routes but wrong for an
 * estimate: it puts a cliff in the middle of the scale, and a student sitting
 * on the bar — which is a very common place to sit — saw their reported score
 * swing by hundreds of points between runs purely on which side of the cliff
 * the noise landed. Measured across simulated retakes, that one discontinuity
 * accounted for a 460-point run-to-run spread at ability 0.65 against ~250 for
 * neighboring abilities.
 *
 * The uncertainty is real; the cliff was an artifact. So the score interpolates
 * smoothly here, and estimateConfidence() widens the reported band for students
 * near the bar instead — which says the true thing ("we cannot yet tell which
 * module you would route into, and that is worth a lot of points") rather than
 * asserting one side of it at random.
 */
export function abilityToSectionScore(section, ability) {
  const total = SAT_SECTIONS[section].questions;
  const rawEquivalent = Math.round(ability * total);
  const lower = rawToScaled(section, rawEquivalent, 'lower');
  const upper = rawToScaled(section, rawEquivalent, 'upper');

  if (ability <= ROUTE_BAR - ROUTE_BLEND) return lower;
  if (ability >= ROUTE_BAR + ROUTE_BLEND) return upper;
  const t = (ability - (ROUTE_BAR - ROUTE_BLEND)) / (2 * ROUTE_BLEND);
  return Math.round(lower + (upper - lower) * t);
}

/** How close a section estimate sits to the routing bar, as 0-1. */
function routingUncertainty(session) {
  let worst = 0;
  for (const section of SECTION_IDS) {
    const rs = session.responses.filter(r => r.section === section);
    if (!rs.length) continue;
    const a = blendedAbility(rs, session.ability[section] ?? ABILITY_START);
    const closeness = Math.max(0, 1 - Math.abs(a - ROUTE_BAR) / ROUTE_BLEND);
    worst = Math.max(worst, closeness);
  }
  return worst;
}

/**
 * Confidence in the estimate. Driven by how much the ability estimate was still
 * moving at the end: a sequence that settled has converged, one that was still
 * swinging on question 33 has not. Inconsistent responding — a student who
 * misses easy items and answers hard ones — widens the band, correctly.
 */
function estimateConfidence(session) {
  const rs = session.responses;
  if (rs.length < 12) return { level: 'low', spread: 90 };

  // How much did the last third of answers disagree with the estimate by then?
  const tail = rs.slice(-Math.max(8, Math.floor(rs.length / 3)));
  const tailRate = tail.filter(r => r.correct).length / tail.length;
  const drift = Math.abs(tailRate - SUCCESS_TARGET);

  // Reversals — the number of times the sequence flipped from a run of correct
  // to a run of incorrect. A well-converged staircase reverses often near the
  // end; one that never reverses never found the student's level.
  let reversals = 0;
  for (let i = 1; i < rs.length; i++) if (rs[i].correct !== rs[i - 1].correct) reversals++;
  const reversalRate = reversals / Math.max(1, rs.length - 1);

  // Sitting on the module-2 routing bar is a genuine source of uncertainty, not
  // a modeling nuisance: which module a student routes into is worth a large
  // chunk of the score, and a run that cannot tell which side they are on
  // should say so by widening the band rather than by picking one.
  // The penalty is large because the underlying uncertainty is large, and
  // shrinking it would only make the number look more confident than it is.
  // Simulated at ability 0.65 — squarely on the bar — a single baseline has a
  // run-to-run standard deviation of ~115 composite points against ~50-80
  // everywhere else, because a small movement in the estimate flips which
  // module the student is scored against and the score moves steeply with it.
  // At a 55-point penalty the reported range covered the student's true level
  // barely half the time here while managing 78-94% elsewhere: precisely the
  // students the range mattered most for were the ones it was failing.
  const onTheBar = routingUncertainty(session);
  const barPenalty = Math.round(onTheBar * 95);

  // Band half-widths. These are not a design flourish — the band is the actual
  // claim being made to the student, so it has to be wide enough to usually be
  // true. Measured over 200 simulated runs per ability level, a single 35-item
  // baseline has a run-to-run standard deviation of roughly 50-120 composite
  // points, driven mostly by there being only 16-19 items per section. The old
  // values (45/65/90) were narrower than that spread and the range contained
  // the student's true level under half the time, which makes the range
  // decoration rather than a statement. Set at roughly 1.2 standard deviations,
  // where it covers the truth about three runs in four.
  const base = (rs.length >= BASELINE_LENGTH && drift < 0.16 && reversalRate > 0.3)
    ? { level: 'good', spread: 75 }
    : (rs.length >= 24 && drift < 0.25)
      ? { level: 'moderate', spread: 100 }
      : { level: 'low', spread: 130 };

  // A run that would otherwise read "good" but sits squarely on the bar is not
  // a good estimate of a score, however well the staircase converged.
  const level = (base.level === 'good' && onTheBar > 0.6) ? 'moderate' : base.level;
  return { level, spread: base.spread + barPenalty, onTheBar };
}

const round10 = (n) => Math.round(n / 10) * 10;

/**
 * Final result. Always a range; never a single number.
 */
export function scoreBaseline(session) {
  if (!session?.responses?.length) return null;

  const bySection = {};
  for (const section of SECTION_IDS) {
    const rs = session.responses.filter(r => r.section === section);
    const ability = blendedAbility(rs, session.ability[section] ?? ABILITY_START);
    bySection[section] = {
      section,
      label: SAT_SECTIONS[section].label,
      answered: rs.length,
      correct: rs.filter(r => r.correct).length,
      ability,
      scaled: abilityToSectionScore(section, ability),
      // Where the student stopped being reliable — the hardest band they were
      // still clearing more often than not.
      ceiling: highestReliableBand(rs),
    };
  }

  const mid = compositeScore(bySection.rw.scaled, bySection.math.scaled);
  const { level, spread } = estimateConfidence(session);
  const low = Math.max(400, round10(mid - spread));
  const high = Math.min(1600, round10(mid + spread));

  return {
    mid: round10(mid),
    low,
    high,
    confidence: level,
    percentile: compositePercentile(mid),
    sections: bySection,
    answered: session.responses.length,
    correct: session.responses.filter(r => r.correct).length,
    durationMs: (session.finishedAt || Date.now()) - session.startedAt,
    skills: skillBreakdown(session.responses),
    weakest: weakestSkills(session.responses),
    flagged: session.responses.filter(r => !r.correct),
  };
}

/** The hardest difficulty band the student answered above 50% on. */
function highestReliableBand(responses) {
  for (const band of ['H', 'M', 'E']) {
    const at = responses.filter(r => r.difficulty === band);
    if (at.length >= 2 && at.filter(r => r.correct).length / at.length > 0.5) return band;
  }
  return null;
}

/** Per-skill outcomes, for the heat map and the study plan that follows. */
export function skillBreakdown(responses) {
  const map = new Map();
  for (const r of responses) {
    const cur = map.get(r.skill) || { skill: r.skill, seen: 0, correct: 0, hardestCorrect: null };
    cur.seen++;
    if (r.correct) {
      cur.correct++;
      const order = { E: 0, M: 1, H: 2 };
      if (cur.hardestCorrect == null || order[r.difficulty] > order[cur.hardestCorrect]) cur.hardestCorrect = r.difficulty;
    }
    map.set(r.skill, cur);
  }
  return [...map.values()].map(s => ({
    ...s,
    ...skillMeta(s.skill),
    accuracy: s.seen ? s.correct / s.seen : 0,
  }));
}

/**
 * What to actually work on. Ranked by leverage — a skill's weakness multiplied
 * by how heavily the exam tests it — because a student's single worst skill is
 * often one worth two questions on the real test, and telling them to start
 * there wastes the first week of their prep.
 */
export function weakestSkills(responses, limit = 6) {
  return skillBreakdown(responses)
    .filter(s => s.seen > 0 && s.accuracy < 1)
    .map(s => ({ ...s, leverage: (1 - s.accuracy) * (s.examShare || 0.02) }))
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, limit);
}

// ── Weekly gate ──────────────────────────────────────────────────────────────

export function msUntilNextBaseline(lastCompletedAt) {
  if (!lastCompletedAt) return 0;
  const elapsed = Date.now() - lastCompletedAt;
  return Math.max(0, BASELINE_COOLDOWN_DAYS * 86400000 - elapsed);
}

export function canStartBaseline(lastCompletedAt) {
  return msUntilNextBaseline(lastCompletedAt) === 0;
}

export function cooldownLabel(lastCompletedAt) {
  const ms = msUntilNextBaseline(lastCompletedAt);
  if (ms === 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return 'under an hour';
}

/**
 * Comparison against the previous baseline. The point of a weekly cadence is
 * the delta, and a delta is only honest if it clears the noise floor of the
 * two estimates it is built from.
 */
export function compareBaselines(current, previous) {
  if (!current || !previous) return null;
  const delta = current.mid - previous.mid;
  const noise = Math.max(
    (current.high - current.low) / 2,
    (previous.high - previous.low) / 2,
  );
  return {
    delta,
    significant: Math.abs(delta) > noise * 0.75,
    daysBetween: Math.round((current.takenAt - previous.takenAt) / 86400000) || null,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}
