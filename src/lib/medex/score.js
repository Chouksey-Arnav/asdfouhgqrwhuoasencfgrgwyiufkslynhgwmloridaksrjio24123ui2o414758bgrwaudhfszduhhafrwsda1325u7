// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score itself.
//
// ── This file computes nothing about admissions ─────────────────────────────
// That is the most important thing to know before editing it. Every judgment
// about how a student compares to an admitted cohort — what a program
// weights, how much 200 clinical hours is worth there, how far academics can
// carry you at a 3% program, which requirements are gates rather than points
// — already lives in src/lib/admissions/ and was built to be right rather than
// encouraging. This module is a PROJECTION of that model onto one number.
//
// It has to work that way. The alternative is a second scoring model, and two
// models over the same portfolio disagree the day after they ship: the
// Calculator tells a student their research is thin at a physician-scientist
// track while the headline score on Home rewards them for the same hours,
// because the headline used flat weights. Whichever number is more flattering
// is the one they believe, and it is the wrong one.
//
// So: estimateAdmission() runs, and this module reads its `contributions` —
// the per-dimension standardized position and per-program weight the model
// already composed on — and collapses them to a single weighted z, which
// scale.js maps to 0-1000.
//
// ── What is deliberately NOT here ───────────────────────────────────────────
// XP, streak, lessons completed, quiz scores, app engagement. None of it. The
// score answers "where do I stand against the class that gets in", and no
// admissions office has ever read a study streak. Engagement is rewarded
// everywhere else in this app — quests, streaks, levels, the reward chest — and
// letting it leak in here would turn the one number that is supposed to be
// about the outside world into another number about using the product.
// ─────────────────────────────────────────────────────────────────────────────
import { estimateAdmission, signalBudget, DRIVER_LABELS } from '../admissions/model.js';
import { scoreFromZ, bandFor, nextBand, MEDEX_COHORT_MEDIAN } from './scale.js';
import { apexSlate, effectiveAdmitRate, resolveCollegeList, pickBenchmark } from './benchmark.js';

/** The z the admissions model treats as the strong band (75th percentile of a normal). */
const P75_Z = 0.6745;

/**
 * How much of what a program weights has to actually be on the record before
 * a score is shown at all.
 *
 * ── Why this gate exists ────────────────────────────────────────────────────
 * The admissions model scores an unlogged dimension at a fixed z of −1.4, which
 * means "we do not know this" rather than "this is zero" — a deliberate and
 * correct choice there, because the Calculator shows that estimate surrounded
 * by a named uncertainty band and an explicit list of what is missing.
 *
 * Collapsed to one number on a dashboard, the same choice becomes a lie. A
 * student who has logged nothing at all averages those placeholders to a
 * mid-500s "Contender" — a score built entirely out of our own ignorance,
 * presented as a position they have earned. Worse, it goes DOWN the first week
 * they log something real, because a genuine 20 clinical hours scores below the
 * unknown-placeholder. Punishing a student for their first honest entry is the
 * single worst thing this feature could do.
 *
 * So below this coverage threshold there is no score — the same rule the
 * Calculator applies to a failed hard gate, for the same reason. What they get
 * instead is the shortest list of things that would produce one.
 *
 * 0.25 is the line because it is roughly one substantial dimension at a typical
 * program's weighting: enough that the number is anchored to something the
 * student actually did, while not making the score unreachable for a ninth
 * grader who has done exactly one thing so far.
 */
export const MIN_COVERAGE = 0.25;

/**
 * The five pillars the eight model dimensions are shown as.
 *
 * The model scores eight dimensions because that is the resolution the
 * program data supports. Five is the resolution a person can hold in their
 * head on a dashboard card, and shadowing-vs-clinical-contact is a distinction
 * that matters enormously to the model and not at all to a student deciding
 * what to do on Saturday. The pairs are grouped, never averaged away: the
 * breakdown panel opens every pillar back into its component dimensions with
 * their own z and weight, so nothing is hidden — only folded.
 */
export const PILLARS = [
  {
    id: 'academics', label: 'Academics', dimensions: ['academics'],
    blurb: 'GPA, rigor and scores, positioned against the admitted band — and worth progressively less the more selective the program, because there the pool has already been filtered on it.',
  },
  {
    id: 'clinical', label: 'Clinical Exposure', dimensions: ['clinical', 'shadowing'],
    blurb: 'Patient-contact hours and shadowing hours, which the model counts separately because programs weight them very differently.',
  },
  {
    id: 'research', label: 'Research', dimensions: ['research'],
    blurb: 'Lab or field work, posters and publications. Decisive at physician-scientist tracks, close to irrelevant at six-year clinical programs.',
  },
  {
    id: 'impact', label: 'Service & Leadership', dimensions: ['service', 'leadership'],
    blurb: 'Non-clinical community service and sustained positions of responsibility — scored on how long you held them, not how many you list.',
  },
  {
    id: 'distinction', label: 'Distinction', dimensions: ['competitions', 'certifications'],
    blurb: 'Olympiads, HOSA, science fairs, and credentials like CNA, EMT or phlebotomy.',
  },
];

const PILLAR_OF = new Map();
for (const p of PILLARS) for (const d of p.dimensions) PILLAR_OF.set(d, p.id);

/**
 * Score one program.
 *
 * Returns `{ eligible: false }` with the gate detail rather than a low number
 * when a published requirement is not met. This mirrors the Calculator's
 * hardest rule and matters more here, not less: a single headline number that
 * quietly reads 340 because the student is categorically ineligible for their
 * benchmark looks exactly like a number they can study their way out of, and it
 * is not one. They get the sentence instead.
 */
export function scoreProgram({ program, applicant = {}, portfolio = {}, completeness = null, roundId = null } = {}) {
  const est = estimateAdmission({ program, applicant, portfolio, completeness, roundId });
  if (est?.error) return { error: est.error, eligible: false, showsScore: false };

  const rate = effectiveAdmitRate(typeof program === 'string' ? est.program : program);

  if (est.blocked) {
    return {
      showsScore: false,
      eligible: false,
      program: est.program,
      admitRate: rate,
      gates: est.gates,
      headline: est.headline,
      explanation: est.explanation,
      whatWouldChange: est.whatWouldChange,
    };
  }

  // ── The composite z ──────────────────────────────────────────────────────
  // `contributions` is already weight × z per dimension, with the weights
  // renormalised by the model when a dimension is unavailable. Dividing the sum
  // by the weight actually applied turns it back into a weighted MEAN, which is
  // what the scale is calibrated on: a student whose academics we cannot see
  // gets positioned on what we CAN see rather than being dragged toward zero by
  // a missing term. What that costs them instead is confidence, and the band
  // below widens to say so.
  const contributions = est.contributions || [];
  const usedWeight = contributions.reduce((s, c) => s + (c.weight || 0), 0);
  const signal = contributions.reduce((s, c) => s + (c.contribution || 0), 0);
  const z = usedWeight > 0 ? signal / usedWeight : 0;

  // ── The evidence gate ────────────────────────────────────────────────────
  // See MIN_COVERAGE. `coverage` is the share of this program's weight that
  // rests on something the student actually logged, rather than on the model's
  // unknown-placeholder — so it is program-specific, exactly like the weights
  // are. Missing research matters far more at a physician-scientist track than
  // at a six-year clinical program, and this number knows that.
  const coverage = assessCoverage({ contributions, usedWeight, layers: est.layers });
  if (coverage.ratio < MIN_COVERAGE) {
    return {
      showsScore: false,
      eligible: true,
      reason: 'insufficient-evidence',
      program: est.program,
      admitRate: rate,
      coverage,
      headline: `We are not showing you a MedEx Score for ${est.program.name} yet.`,
      explanation:
        'Not because it would be low — because it would be fiction. Almost nothing on your record has been logged yet, so a score now would be measuring our own uncertainty rather than your position, and it would go DOWN the first week you logged something real. Add any one of these and the number becomes yours.',
      whatWouldChange: coverage.missing,
    };
  }

  const score = scoreFromZ(z);

  // ── The band ─────────────────────────────────────────────────────────────
  // The model's uncertainty is a sigma in log-odds. Dividing by the program's
  // signal budget converts it back into the z units this scale lives in, which
  // keeps the two features telling one story: a wide range in the Calculator is
  // a wide range here, for the same named reasons, rather than each surface
  // inventing its own humility.
  const beta = signalBudget(rate.rate) || 1;
  const zSigma = clamp((est.uncertainty?.sigma ?? 0.5) / beta, 0.12, 1.1);
  const low = scoreFromZ(z - zSigma);
  const high = scoreFromZ(z + zSigma);

  const pillars = buildPillars({ contributions, usedWeight, z, layers: est.layers });
  const movers = buildMovers({ est, contributions, usedWeight, z, score, completeness });

  return {
    showsScore: true,
    eligible: true,
    program: est.program,
    admitRate: rate,

    score,
    band: bandFor(score),
    next: nextBand(score),
    range: { low, high, sigmaZ: zSigma },
    z,

    /** Points between here and looking like the median admit. 0 once you are there. */
    toCohort: Math.max(0, MEDEX_COHORT_MEDIAN - score),
    atOrAboveCohort: score >= MEDEX_COHORT_MEDIAN,

    pillars,
    movers,
    coverage,

    confidence: est.confidence,
    uncertainty: est.uncertainty,
    lottery: est.lottery,
    // Kept so the breakdown panel can hand off to the Calculator without
    // recomputing, and so nothing on screen is derived from a second estimate.
    estimate: est,
  };
}

/** What a student would have to log to make each dimension count. Named per
 *  dimension because "add more to your portfolio" is not an instruction. */
const COVERAGE_ASKS = {
  academics: { label: 'Your GPA', ask: 'Add your unweighted GPA — one number, and it unlocks the whole academic half of this.' },
  clinical: { label: 'Patient-contact hours', ask: 'Log any hands-on clinical hours you already have — volunteering on a ward, CNA or EMT shifts, scribing.' },
  shadowing: { label: 'Shadowing hours', ask: 'Log the hours you have spent observing a clinician. Most students have some and have never written them down.' },
  research: { label: 'Research', ask: 'Log any lab, field or science-fair research — including the project that did not go anywhere.' },
  service: { label: 'Community service', ask: 'Log non-clinical volunteering. It is weighted separately from clinical hours and most students under-report it.' },
  leadership: { label: 'A leadership role', ask: 'Add any sustained position of responsibility — club officer, team captain, tutor. Length matters far more than title.' },
  competitions: { label: 'A competition or award', ask: 'Add any olympiad, HOSA event, science fair or debate result.' },
  certifications: { label: 'A certification', ask: 'Add CPR, CNA, EMT, phlebotomy — anything you hold, including in progress.' },
};

/**
 * The share of this program's weight that rests on real logged evidence.
 *
 * A dimension counts as covered when the model marks it `available` — i.e. the
 * student logged something — and not when it is sitting on the unknown
 * placeholder. `missing` is ordered by weight AT THIS PROGRAM, so the first
 * thing we ask a physician-scientist applicant for is research and the first
 * thing we ask a six-year-program applicant for is clinical hours.
 */
function assessCoverage({ contributions, usedWeight, layers }) {
  const dims = layers?.portfolio || {};
  const academicAvailable = !!layers?.academic?.available;

  let covered = 0;
  const missing = [];
  for (const c of contributions) {
    const isAvailable = c.key === 'academics' ? academicAvailable : !!dims[c.key]?.available;
    if (isAvailable) { covered += c.weight || 0; continue; }
    const ask = COVERAGE_ASKS[c.key];
    if (ask) missing.push({ key: c.key, weight: c.weight || 0, label: ask.label, ask: ask.ask });
  }
  missing.sort((a, b) => b.weight - a.weight);

  const ratio = usedWeight > 0 ? covered / usedWeight : 0;
  return {
    ratio,
    covered,
    usedWeight,
    missing,
    /** How many of the eight dimensions carry real data. Shown as "3 of 8 logged". */
    loggedCount: contributions.length - missing.length,
    total: contributions.length,
    meetsMinimum: ratio >= MIN_COVERAGE,
  };
}

/**
 * Fold the model's eight dimensions into the five pillars, keeping the raw
 * dimensions attached.
 *
 * `share` is the fraction of the composite z this pillar is responsible for at
 * THIS program — which is the number that actually answers "what should I
 * work on", because it already accounts for the program's own weighting. A
 * pillar can be strong and carry almost no share (research at a six-year
 * clinical program), and the card has to be able to say that instead of
 * telling a student to do more of something the program has never mentioned.
 */
function buildPillars({ contributions, usedWeight, z, layers }) {
  const byKey = new Map(contributions.map(c => [c.key, c]));
  const dims = layers?.portfolio || {};

  return PILLARS.map(p => {
    const parts = p.dimensions.map(d => byKey.get(d)).filter(Boolean);
    const weight = parts.reduce((s, c) => s + (c.weight || 0), 0);
    const pz = weight > 0 ? parts.reduce((s, c) => s + c.weight * c.z, 0) / weight : null;

    // What the composite would be with this pillar removed entirely — the
    // honest way to express "how much is this pillar doing", as opposed to a
    // percentage of a total that would imply the pillars add up to the score.
    const withoutWeight = usedWeight - weight;
    const withoutZ = withoutWeight > 0
      ? (z * usedWeight - parts.reduce((s, c) => s + c.contribution, 0)) / withoutWeight
      : null;

    return {
      id: p.id,
      label: p.label,
      blurb: p.blurb,
      weight,
      share: usedWeight > 0 ? weight / usedWeight : 0,
      z: pz,
      score: pz == null ? null : scoreFromZ(pz),
      /** Points this pillar is currently adding or costing, versus not counting it at all. */
      swing: withoutZ == null ? null : scoreFromZ(z) - scoreFromZ(withoutZ),
      atOrAboveCohort: pz != null && pz >= 0,
      dimensions: p.dimensions.map(d => ({
        key: d,
        weight: byKey.get(d)?.weight ?? 0,
        z: byKey.get(d)?.z ?? null,
        detail: d === 'academics' ? (layers?.academic || null) : (dims[d] || null),
        counted: byKey.has(d),
      })),
    };
  }).sort((a, b) => b.weight - a.weight);
}

/**
 * What would move the number, denominated in POINTS.
 *
 * The Calculator expresses the same list as a change in probability, which is
 * the right unit there and the wrong unit here — "+0.4 percentage points" is
 * technically the truth and motivationally inert. Each mover is re-scored
 * through this scale rather than converted with a points-per-percent constant,
 * so the two lists can never drift into ranking the same actions differently.
 */
function buildMovers({ est, contributions, usedWeight, z, score, completeness }) {
  const out = [];
  const labelled = new Map((est.drivers || []).map(d => [d.key, d]));

  const rescore = (deltaWeightedZ) => {
    if (usedWeight <= 0) return score;
    return scoreFromZ(z + deltaWeightedZ / usedWeight);
  };

  for (const c of contributions) {
    if (c.z >= P75_Z) continue;                       // already in the strong band
    const points = rescore(c.weight * (P75_Z - c.z)) - score;
    if (points < 1) continue;                         // sub-point moves are noise
    // The model's own driver list is filtered by probability gain, which at a
    // selective program discards moves worth real points here — so this list is
    // strictly longer than that one, and the labels for the extras come from the
    // same shared table rather than being invented. See DRIVER_LABELS.
    const driver = labelled.get(c.key);
    out.push({
      key: c.key,
      pillar: PILLAR_OF.get(c.key) || null,
      kind: c.key === 'academics' ? 'academic' : 'portfolio',
      points: Math.round(points),
      label: driver?.label
        || DRIVER_LABELS[c.key]
        || (c.key === 'academics' ? 'Move your academic position to their 75th percentile' : c.key),
      detail: driver?.detail || null,
      weight: c.weight,
    });
  }

  // Verification is nearly always the cheapest real gain on the board, and the
  // only one that costs an email rather than a season. The model already
  // computed the z it is worth; we only re-denominate it.
  const verify = labelled.get('verification');
  if (verify) {
    const dims = est.layers?.portfolio || {};
    let delta = 0;
    for (const c of contributions) {
      const d = dims[c.key];
      if (!d?.available || !d.evidence || (d.evidence.share ?? 1) >= 0.99) continue;
      if (d.depthZ == null || d.depthZ < 0) continue;
      delta += c.weight * (d.depthZ * (d.sustain?.factor ?? 1) - c.z);
    }
    const points = delta > 0 ? rescore(delta) - score : 0;
    if (points >= 1) {
      out.push({
        key: 'verification', pillar: null, kind: 'evidence',
        points: Math.round(points), label: verify.label, detail: verify.detail, weight: null,
      });
    }
  }

  out.sort((a, b) => b.points - a.points);

  // Unanswered intake questions do not lower the score — they widen the band.
  // Listing them as a mover worth "+N points" would be a straightforward lie
  // (answering honestly can move the number DOWN), so this entry carries no
  // points and says what it actually buys.
  if (completeness && completeness.missing?.length) {
    out.push({
      key: 'completeness', pillar: null, kind: 'confidence', points: null,
      label: `Answer ${completeness.missing.length} more question${completeness.missing.length === 1 ? '' : 's'} about yourself`,
      detail: 'This does not raise your score and it might lower it. What it does is narrow the range around it, so the number you are acting on is the real one rather than our best guess at it.',
      weight: null,
    });
  }

  return out;
}

/**
 * Score every school on the student's list.
 *
 * "For every single college, an admission score" — this is that. The headline
 * on Home is one of these (the benchmark's), so the list view and the hero can
 * never disagree.
 */
export function scoreCollegeList({ colleges = [], applicant = {}, portfolio = {}, completeness = null, programRounds = {} } = {}) {
  const { resolved, unresolved } = resolveCollegeList(colleges);
  const rows = resolved.map(({ profile, row }) => ({
    row,
    profile,
    result: scoreProgram({
      program: profile, applicant, portfolio, completeness,
      roundId: programRounds[profile.id] || null,
    }),
  }));
  // Most selective first — the same order as the benchmark choice, so the
  // school the headline is measured against is always the top of this list.
  rows.sort((a, b) => effectiveAdmitRate(a.profile).rate - effectiveAdmitRate(b.profile).rate);
  return { rows, unresolved };
}

/**
 * Position against the fixed apex slate.
 *
 * Answers the question the student actually asked — "how do I stack up against
 * the Ivies and the top programs" — with a count and a named program rather
 * than a percentile, because "83rd percentile against top schools" is a number
 * with no referent and "you are at the admitted median at four of the
 * twenty-nine, the most selective being X" is a fact.
 */
export function rankAgainstApex({ applicant = {}, portfolio = {}, completeness = null } = {}) {
  const slate = apexSlate();
  const rows = slate.map(profile => ({
    profile,
    result: scoreProgram({ program: profile, applicant, portfolio, completeness }),
  }));

  const scored = rows.filter(r => r.result.showsScore);
  const atCohort = scored.filter(r => r.result.atOrAboveCohort);
  const blocked = rows.filter(r => !r.result.showsScore && r.result.gates);

  // Slate order is most-selective-first, so the first match IS the most
  // selective one — no second sort, and no chance of the two disagreeing.
  const topMatch = atCohort[0] || null;
  const best = scored.reduce((a, b) => (!a || b.result.score > a.result.score ? b : a), null);

  const median = scored.length
    ? Math.round(scored.map(r => r.result.score).sort((a, b) => a - b)[Math.floor(scored.length / 2)])
    : null;

  return {
    rows,
    slateSize: slate.length,
    scoredCount: scored.length,
    blockedCount: blocked.length,
    atCohortCount: atCohort.length,
    topMatch,
    best,
    median,
    sentence: !scored.length
      ? 'We could not score you against the apex slate yet.'
      : atCohort.length === 0
        ? `Across the ${scored.length} most selective programs we track, you are not yet at the admitted median at any of them. Your strongest position is ${best.profile.name}.`
        // At a count of one, "the most selective being X" is true and reads as a
        // boast about a slate of one. Name it plainly instead.
        : atCohort.length === 1
          ? `You are at or above the admitted median at 1 of the ${scored.length} most selective programs we track: ${topMatch.profile.name}.`
          : `You are at or above the admitted median at ${atCohort.length} of the ${scored.length} most selective programs we track — the most selective being ${topMatch.profile.name}.`,
  };
}

/**
 * The whole thing, in one call: benchmark, headline score, per-college scores,
 * apex position. This is what the Home card and the breakdown panel both read,
 * so there is exactly one place the headline number is decided.
 */
export function computeMedEx({
  colleges = [], applicant = {}, portfolio = {}, completeness = null,
  programRounds = {}, includeApex = true,
} = {}) {
  const benchmark = pickBenchmark(colleges);
  if (!benchmark.profile) {
    return { available: false, reason: 'no-benchmark', benchmark, colleges: { rows: [], unresolved: [] } };
  }

  const headline = scoreProgram({
    program: benchmark.profile, applicant, portfolio, completeness,
    roundId: programRounds[benchmark.profile.id] || null,
  });

  return {
    available: true,
    benchmark,
    headline,
    colleges: scoreCollegeList({ colleges, applicant, portfolio, completeness, programRounds }),
    apex: includeApex ? rankAgainstApex({ applicant, portfolio, completeness }) : null,
    computedAt: Date.now(),
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
