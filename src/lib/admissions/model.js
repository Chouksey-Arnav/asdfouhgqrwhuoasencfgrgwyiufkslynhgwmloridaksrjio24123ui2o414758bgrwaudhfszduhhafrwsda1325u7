// ─────────────────────────────────────────────────────────────────────────────
// The admission model — layers 1 to 5 composed into a range, never a number.
//
// ── Why the arithmetic is on the log-odds scale ─────────────────────────────
// The old calculator started every school at 100 points and added bonuses:
// +15 for GPA, +12 for clinical hours, +10 for rigor, +5 for a pre-med
// committee. Two structural problems, both of which push one way — up.
//
//   1. Bonuses are additive, so a student who is good at several things
//      accumulates a score no admissions process would produce. The model had
//      no way to express "you are already past the point where this helps".
//   2. The scale had nothing to do with probability. 115 points became
//      "Likely". Likely at a school admitting 4% of applicants meant nothing,
//      and it was the most consequential word on the screen.
//
// So this model works in log-odds against the programme's actual base rate.
// Every dimension is a SHIFT relative to the median admitted student, not a
// pile of points; a shift on the log-odds scale automatically has diminishing
// returns in probability, which is the correct shape and does not need to be
// hand-tuned in.
//
// ── The four hard constraints ───────────────────────────────────────────────
// The composition is bounded by four things, and every one of them exists to
// stop a specific way this kind of tool lies:
//
//   • THE CEILING. At a programme admitting 3%, no combination of inputs may
//     produce 60%. A perfect applicant at a 3% programme is not a favourite —
//     the pool is full of them and there are not enough seats. `probabilityCeiling`
//     makes that structural rather than a thing we hope the weights achieve.
//   • ACADEMIC LEVERAGE DECAY. Below ~15% admit, GPA and scores barely
//     discriminate inside an already pre-filtered pool (see academicFit.js).
//     Their weight decays and the freed weight moves to the rest of the
//     portfolio, rather than the model leaning harder on the one thing that has
//     stopped separating anyone.
//   • THE HOOK DEFLATOR. Published admit rates include recruited athletes,
//     legacies and development admits. An unhooked applicant is not competing
//     for those seats, so their effective base rate is lower than the published
//     one — computed here rather than left in the data as noise that flatters
//     everybody.
//   • THE RANGE. Every output is an interval whose width is driven by what we
//     actually do not know: unpublished admit rates, derived percentile bands,
//     skipped intake fields, unevaluable gates, and genuine lotteries. A point
//     estimate is a claim about precision we have not earned.
// ─────────────────────────────────────────────────────────────────────────────
import { evaluateGates } from './gates.js';
import { scoreAcademicFit } from './academicFit.js';
import { scorePortfolioFit, NON_ACADEMIC_DIMENSIONS } from './portfolioFit.js';
import { scoreRound } from './round.js';
import { resolveProfile } from '../../data/admissions/programProfiles.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// ─────────────────────────────────────────────────────────────────────────────
// The ceiling.
//
// The most a well-prepared applicant can reach at a programme with base rate b.
// Deliberately expressed as "you can claim this share of the seats you are not
// already given by the base rate", because that framing makes the number at low
// base rates obviously right rather than surprisingly harsh:
//
//     b = 3%   → ceiling ≈ 13%     b = 10%  → ceiling ≈ 24%
//     b = 35%  → ceiling ≈ 58%     b = 60%  → ceiling ≈ 82%
//
// Thirteen percent at a 3% programme is a very strong applicant being told the
// truth: they are four times more likely than the average applicant and still
// far more likely to be rejected than admitted. Every tool that shows that
// student 55% is not being generous, it is being wrong.
// ─────────────────────────────────────────────────────────────────────────────
export function probabilityCeiling(base) {
  const b = clamp(Number(base) || 0, 0.001, 0.99);
  const share = clamp(0.08 + 0.8 * b, 0.08, 0.9);
  return clamp(b + (1 - b) * share, b, 0.95);
}

export function probabilityFloor(base) {
  const b = clamp(Number(base) || 0, 0.001, 0.99);
  return Math.max(0.002, b * 0.04);
}

/**
 * How much of the outcome any model can explain at this selectivity.
 *
 * At a 60% programme, an application is largely a function of the applicant. At
 * a 3% programme it is substantially a function of who else applied, which
 * reader picked it up, what the institution needed that year, and a dozen
 * things no model has access to. Shrinking the total signal budget as the base
 * rate falls is how that gets said in arithmetic rather than in a footnote.
 */
export function signalBudget(base) {
  const b = clamp(Number(base) || 0, 0.001, 0.99);
  return 0.85 + 1.35 * (1 - Math.exp(-b / 0.18));   // ≈1.05 at 3%, ≈1.36 at 10%, ≈2.0 at 35%
}

/**
 * The base rate an UNHOOKED applicant is actually facing.
 *
 * Published rate p over the whole pool. If a share `h` of the SEATS goes to
 * hooked applicants who make up a much smaller share of the POOL, the rate for
 * everyone else is lower than the headline. Modelled with hooked applicants
 * occupying `h` of the class from roughly a quarter of that share of the pool,
 * which is the conservative end of the usual estimates.
 */
export function unhookedBaseRate(base, hookShare, studentHooks) {
  const b = clamp(Number(base) || 0, 0.001, 0.99);
  const h = clamp(Number(hookShare) || 0, 0, 0.6);
  if (h <= 0) return { rate: b, adjusted: false };

  const poolShare = h * 0.25;
  const unhooked = clamp((b * (1 - h)) / Math.max(1e-6, 1 - poolShare), 0.0005, 0.99);

  const hooked = !!(studentHooks && (studentHooks.recruitedAthlete || studentHooks.legacy || studentHooks.development || studentHooks.faculty));
  if (hooked) {
    // Hooked applicants are admitted from a small pool into a large share of
    // the class. Not modelled precisely — nobody publishes it — but ignoring it
    // entirely would mean telling a recruited athlete the unhooked number.
    const hookedRate = clamp((b * h) / Math.max(1e-6, poolShare), b, 0.9);
    return {
      rate: hookedRate, adjusted: true, hooked: true, unhookedRate: unhooked, publishedRate: b, hookShare: h,
      note: `You have told us about a hook. Roughly ${Math.round(h * 100)}% of a class like this goes to recruited athletes, legacies and development admits drawn from a far smaller slice of the applicant pool — so your base rate is well above the published ${Math.round(b * 100)}%. This is an estimate of a thing no school publishes, and the range reflects that.`,
    };
  }
  return {
    rate: unhooked, adjusted: true, hooked: false, publishedRate: b, hookShare: h,
    note: `The published ${(b * 100).toFixed(1)}% includes recruited athletes, legacies and development admits — roughly ${Math.round(h * 100)}% of a class like this, drawn from a much smaller share of the applicant pool. Strip those seats out and the rate an unhooked applicant is actually facing is closer to ${(unhooked * 100).toFixed(1)}%. Every model that leaves them in the data is quietly inflating the odds for every unhooked student at the same GPA.`,
  };
}

/**
 * Layer 4 — the per-programme weighting, with academics' decayed weight
 * redistributed rather than discarded.
 *
 * This is the step that makes "research school vs clinical school" a real
 * difference rather than a label. The weights come from the programme profile,
 * which comes from what the programme publishes.
 */
export function applyWeighting({ weights, academicLeverageValue }) {
  const w = { ...weights };
  const academicWeight = (w.academics ?? 0.35) * academicLeverageValue;
  const freed = (w.academics ?? 0.35) - academicWeight;

  const otherKeys = NON_ACADEMIC_DIMENSIONS.filter(k => w[k] != null);
  const otherSum = otherKeys.reduce((s, k) => s + w[k], 0);
  const out = { academics: academicWeight };
  for (const k of otherKeys) {
    out[k] = otherSum > 0 ? w[k] + freed * (w[k] / otherSum) : w[k];
  }
  return { weights: out, freed, academicWeight };
}

/**
 * THE MODEL.
 *
 * @param {Object} opts
 * @param {Object|string} opts.program   a programme profile, or an id/name to resolve
 * @param {Object} opts.applicant        the intake object (see intake.js)
 * @param {Object} opts.portfolio        normalised portfolio signals (see intake.js)
 * @param {Object} opts.completeness     output of assessCompleteness(), for uncertainty
 * @param {string} opts.roundId          which round they intend to apply in
 */
export function estimateAdmission({ program, applicant = {}, portfolio = {}, completeness = null, roundId = null } = {}) {
  const profile = typeof program === 'string' ? resolveProfile(program) : program;
  if (!profile) return { error: 'unknown-program' };

  // ── LAYER 1 ──────────────────────────────────────────────────────────────
  const gates = evaluateGates(profile, applicant);
  if (!gates.eligible) {
    // No percentage. Not a low one — none. A student who is categorically
    // ineligible does not need a number, they need the sentence.
    return {
      program: profileSummary(profile),
      blocked: true,
      showsProbability: false,
      gates,
      headline: gates.blocked.length === 1
        ? `You do not currently meet one published requirement for ${profile.name}, so we are not showing a percentage.`
        : `You do not currently meet ${gates.blocked.length} published requirements for ${profile.name}, so we are not showing a percentage.`,
      explanation: 'A requirement is not a heavily-weighted feature — it is a yes or a no. Showing you an eight percent chance at a programme you are not eligible for would be worse than showing you nothing, so here is what would have to change instead.',
      whatWouldChange: gates.blocked.map(g => ({
        label: g.label, remedy: g.remedy, fixable: g.fixable, published: g.published,
      })),
    };
  }

  // ── Base rate, with the hook correction ──────────────────────────────────
  const rateSpec = profile.admitRate || {};
  const publishedRate = rateSpec.value ?? null;
  const base = publishedRate ?? rateSpec.assumed ?? 0.25;
  const rateIsEstimate = publishedRate == null;
  const hookAdj = unhookedBaseRate(base, profile.hookSensitivity ?? 0, applicant.hooks);

  // ── LAYER 2 ──────────────────────────────────────────────────────────────
  const academic = scoreAcademicFit({ profile, applicant });

  // ── LAYER 3 ──────────────────────────────────────────────────────────────
  const { dimensions, unknowns: portfolioUnknowns } = scorePortfolioFit({ portfolio, profile });

  // ── LAYER 4 ──────────────────────────────────────────────────────────────
  const { weights, freed, academicWeight } = applyWeighting({
    weights: profile.weights, academicLeverageValue: academic.leverage,
  });

  const contributions = [];
  let signal = 0;
  if (academic.available) {
    const c = weights.academics * academic.z;
    signal += c;
    contributions.push({ key: 'academics', z: academic.z, weight: weights.academics, contribution: c });
  }
  for (const key of NON_ACADEMIC_DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim || weights[key] == null) continue;
    const c = weights[key] * dim.z;
    signal += c;
    contributions.push({ key, z: dim.z, weight: weights[key], contribution: c });
  }

  // ── LAYER 5 ──────────────────────────────────────────────────────────────
  const round = scoreRound({ profile, roundId, hooks: applicant.hooks });

  // ── Composition ──────────────────────────────────────────────────────────
  const beta = signalBudget(base);
  const shift = beta * signal
    + Math.log(clamp(round.multiplier, 0.3, 2.5))
    + Math.log(clamp(gates.preferenceMultiplier, 0.1, 1));

  let p = sigmoid(logit(hookAdj.rate) + shift);

  const ceiling = probabilityCeiling(base);
  const floor = probabilityFloor(base);
  const hitCeiling = p > ceiling;
  p = clamp(p, floor, ceiling);

  // ── The lottery ──────────────────────────────────────────────────────────
  // Where selection is explicitly random, blend the estimate back toward the
  // base rate by the share that is genuinely a draw. This is the one place the
  // model deliberately refuses to reward preparation, because the programme has
  // said in its own words that preparation does not decide it.
  let lotteryApplied = null;
  if (profile.lottery?.exists) {
    const lambda = clamp(profile.lottery.irreducibleShare ?? 0.35, 0, 0.8);
    const before = p;
    p = p * (1 - lambda) + base * lambda;
    lotteryApplied = { lambda, before, after: p, ...profile.lottery };
  }

  // ── Uncertainty ──────────────────────────────────────────────────────────
  const uncertainty = computeUncertainty({
    profile, rateIsEstimate, academic, gates, completeness, round, portfolioUnknowns,
  });
  const lo = clamp(sigmoid(logit(p) - uncertainty.sigma), floor * 0.5, ceiling);
  const hi = clamp(sigmoid(logit(p) + uncertainty.sigma), floor, ceiling);

  // ── What would move it most ──────────────────────────────────────────────
  const drivers = computeDrivers({
    profile, base, hookRate: hookAdj.rate, beta, signal, weights, academic, dimensions,
    round, gates, ceiling, floor, p, portfolio,
  });

  return {
    program: profileSummary(profile),
    blocked: false,
    showsProbability: true,

    probability: { point: p, low: lo, high: hi, ceiling, floor, hitCeiling },
    // Never render `point` on its own. It exists so the range has a centre and
    // so the driver deltas have something to be relative to.
    display: {
      range: `${fmtPct(lo)}–${fmtPct(hi)}`,
      centre: fmtPct(p),
      ceilingNote: hitCeiling
        ? `This is the highest this model will go at a programme admitting about ${fmtPct(base)} of applicants. Past this point the deciding factors are things no model can see, and a bigger number would be a lie about precision rather than a reward for your work.`
        : null,
    },

    confidence: uncertainty.confidence,
    uncertainty,

    baseRate: {
      published: publishedRate, basis: rateSpec.basis, assumed: rateSpec.assumed ?? null,
      used: hookAdj.rate, note: rateSpec.note, hookAdjustment: hookAdj,
      isEstimate: rateIsEstimate,
      estimateWarning: rateIsEstimate
        ? `${profile.name} does not publish an admit rate. Everything below is built on an assumed ${fmtPct(base)} and should be read as an estimate of an estimate. If you find the real number, tell us — it moves this more than anything you could do this month.`
        : null,
    },

    layers: {
      gates,
      academic,
      portfolio: dimensions,
      weighting: { weights, freed, academicWeight, emphasis: profile.emphasis, emphasisNote: profile.emphasisNote, emphasisBasis: profile.emphasisBasis || 'published', weightNotes: profile.weightNotes || {} },
      round,
    },

    contributions: contributions.sort((a, b) => b.contribution - a.contribution),
    drivers,
    lottery: lotteryApplied,
  };
}

function profileSummary(p) {
  return {
    id: p.id, name: p.name, institution: p.institution, kind: p.kind, url: p.url,
    derived: !!p.derived, confidence: p.confidence, sources: p.sources || [],
    emphasis: p.emphasis,
  };
}

const fmtPct = (v) => `${v < 0.1 ? (v * 100).toFixed(1) : Math.round(v * 100)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// Uncertainty. The width of the band is the honest part of the product, so it
// is assembled from named, itemised causes the panel can list — not from a
// constant that makes the bar look appropriately humble.
// ─────────────────────────────────────────────────────────────────────────────
function computeUncertainty({ profile, rateIsEstimate, academic, gates, completeness, round, portfolioUnknowns }) {
  const reasons = [];
  let sigma = 0.30;                       // irreducible: holistic reading, that year's pool
  reasons.push({ id: 'irreducible', sigma: 0.30, label: 'Holistic review — two readers, the same file, different answers. This part never goes away.' });

  if (rateIsEstimate) { sigma += 0.32; reasons.push({ id: 'admit-rate', sigma: 0.32, label: `${profile.name} does not publish an admit rate, so the whole estimate is anchored to an assumption.`, fixable: false }); }

  const bandBases = [profile.academics?.gpa?.basis, profile.academics?.sat?.basis].filter(Boolean);
  if (bandBases.some(b => b === 'derived' || b === 'estimated')) {
    sigma += 0.18;
    reasons.push({ id: 'academic-bands', sigma: 0.18, label: 'The admitted-student percentile bands for this programme are derived from a midpoint rather than published, so your position within them is approximate.', fixable: false });
  }

  if (profile.confidence === 'low') { sigma += 0.20; reasons.push({ id: 'profile-confidence', sigma: 0.20, label: 'We hold little published information about this programme specifically.', fixable: false }); }
  else if (profile.confidence === 'medium') { sigma += 0.10; reasons.push({ id: 'profile-confidence', sigma: 0.10, label: 'We hold partial published information about this programme.', fixable: false }); }

  if (gates.uncheckable?.length) {
    const add = Math.min(0.35, 0.14 * gates.uncheckable.length);
    sigma += add;
    reasons.push({ id: 'uncheckable-gates', sigma: add, fixable: true, label: `${gates.uncheckable.length} published requirement${gates.uncheckable.length === 1 ? '' : 's'} we cannot check yet because you have not answered ${[...new Set(gates.uncheckable.flatMap(g => g.missing))].join(', ')}. Until then we genuinely do not know whether you are eligible.` });
  }

  if (academic.degraded) { sigma += 0.12; reasons.push({ id: 'superscore-policy', sigma: 0.12, fixable: true, label: 'This programme refuses superscores and we only hold a superscored result from you.' }); }

  const missing = completeness?.missing || [];
  if (missing.length) {
    const add = Math.min(0.45, 0.09 * missing.length);
    sigma += add;
    reasons.push({ id: 'missing-intake', sigma: add, fixable: true, label: `${missing.length} intake field${missing.length === 1 ? '' : 's'} you have skipped. Each one we do not have widens this range rather than being quietly assumed.` });
  }

  if (portfolioUnknowns?.length >= 4) {
    sigma += 0.12;
    reasons.push({ id: 'thin-portfolio', sigma: 0.12, fixable: true, label: 'Several portfolio sections are empty. That might be accurate, or it might be unlogged — and we cannot tell which.' });
  }

  if (round.applicable && round.unknown) {
    sigma += 0.16;
    reasons.push({ id: 'round-unknown', sigma: 0.16, fixable: true, label: 'You have not told us which round you plan to apply in, and the gap between early and regular is large here.' });
  }

  if (profile.lottery?.exists) {
    sigma += 0.35;
    reasons.push({ id: 'lottery', sigma: 0.35, fixable: false, label: profile.lottery.note });
  }

  sigma = clamp(sigma, 0.25, 1.6);

  const confidence =
    sigma <= 0.55 ? { level: 'high',     label: 'Confident',            note: 'We have this programme\'s published criteria and enough of your record to place you against them.' } :
    sigma <= 0.85 ? { level: 'moderate', label: 'Moderately confident', note: 'Enough to plan around, not enough to bet on. The list below is what would tighten it.' } :
    sigma <= 1.2  ? { level: 'low',      label: 'Low confidence',        note: 'Treat this as a rough orientation. Too much is either unpublished by the programme or unanswered by you.' } :
                    { level: 'very-low', label: 'Very low confidence',   note: 'This is barely more than the base rate. Do not make decisions on it until the gaps below are filled.' };

  return { sigma, reasons: reasons.sort((a, b) => b.sigma - a.sigma), confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Drivers — the three or four things that would actually move it.
//
// Computed by re-running the composition with one thing changed, so a driver is
// a real counterfactual under this model rather than a hand-written tip. That
// also means a driver automatically disappears when it stops mattering: at a
// programme where academics have almost no leverage left, "raise your SAT"
// falls off the list by itself instead of sitting at the top of it forever.
// ─────────────────────────────────────────────────────────────────────────────
function computeDrivers({ profile, base, hookRate, beta, signal, weights, academic, dimensions, round, gates, ceiling, floor, p, portfolio }) {
  const out = [];
  const P75_Z = 0.6745;

  const recompute = (newSignal, extraLogShift = 0) => {
    const q = sigmoid(logit(hookRate) + beta * newSignal + Math.log(clamp(round.multiplier, 0.3, 2.5)) + Math.log(clamp(gates.preferenceMultiplier, 0.1, 1)) + extraLogShift);
    return clamp(q, floor, ceiling);
  };

  // Each portfolio dimension raised to the strong band.
  for (const key of NON_ACADEMIC_DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim || weights[key] == null) continue;
    if (dim.z >= P75_Z) continue;                       // already there
    const delta = weights[key] * (P75_Z - dim.z);
    const q = recompute(signal + delta);
    if (q - p < 0.0015) continue;
    out.push({
      key, kind: 'portfolio', gain: q - p,
      label: DRIVER_LABELS[key] || key,
      detail: driverDetail(key, dim, profile),
      weight: weights[key],
    });
  }

  // Academics to the 75th.
  if (academic.available && academic.z < P75_Z) {
    const delta = weights.academics * (P75_Z - academic.z);
    const q = recompute(signal + delta);
    if (q - p >= 0.0015) {
      out.push({
        key: 'academics', kind: 'academic', gain: q - p,
        label: 'Move your academic position to their 75th percentile',
        detail: academic.leverage < 0.4
          ? `Worth less here than almost anywhere else: ${academic.leverageNote}`
          : academic.leverageNote,
        weight: weights.academics,
      });
    }
  }

  // Verifying self-reported hours — usually the cheapest real gain available.
  const unverified = ['clinical', 'shadowing', 'research', 'service']
    .map(k => dimensions[k])
    .filter(d => d?.available && d.evidence && (d.evidence.share ?? 0) < 0.99);
  if (unverified.length) {
    let delta = 0;
    for (const d of unverified) {
      if (d.depthZ == null || d.depthZ < 0) continue;
      const full = d.depthZ * (d.sustain?.factor ?? 1) * 1.0;
      delta += (weights[d.key] ?? 0) * (full - d.z);
    }
    if (delta > 0) {
      const q = recompute(signal + delta);
      if (q - p >= 0.0015) {
        out.push({
          key: 'verification', kind: 'evidence', gain: q - p,
          label: 'Get your logged hours verified by a supervisor',
          detail: 'Unverified hours are counted at 82% of their weight here — deliberately, because treating self-reports as fact is the second-biggest reason chancing tools run optimistic. This is the only item on this list that costs you an email rather than a year.',
        });
      }
    }
  }

  // Round, where the programme actually has one.
  if (round.applicable) {
    const bestEarly = (round.available || []).filter(r => (r.multiplier ?? 1) > (round.chosen?.multiplier ?? 1))
      .sort((a, b) => (b.multiplier ?? 1) - (a.multiplier ?? 1))[0];
    if (bestEarly) {
      const hookShare = clamp(profile.hookSensitivity ?? 0.15, 0, 0.6);
      const deflated = 1 + ((bestEarly.multiplier ?? 1) - 1) * (1 - hookShare * 0.8);
      const q = recompute(signal, Math.log(deflated / clamp(round.multiplier, 0.3, 2.5)));
      if (q - p >= 0.0015) {
        out.push({
          key: 'round', kind: 'round', gain: q - p,
          label: `Apply ${bestEarly.label}`,
          detail: `${bestEarly.note || ''} The gain shown is already deflated for the hooked applicants concentrated in that round — it is what an unhooked applicant gets, not the headline.`.trim(),
        });
      }
    }
  }

  // A preference gate the student does not meet is often the single largest
  // term in the whole model, so it belongs at the top of this list, not buried.
  for (const g of gates.unmetPreferences || []) {
    const q = sigmoid(logit(hookRate) + beta * signal + Math.log(clamp(round.multiplier, 0.3, 2.5)));
    out.push({
      key: g.id, kind: 'preference', gain: clamp(q, floor, ceiling) - p,
      label: g.label, detail: g.remedy, immovable: g.fixable === 'no',
    });
  }

  return out.sort((a, b) => b.gain - a.gain).slice(0, 6);
}

/**
 * Exported because the MedEx Score lists the same actions on a different filter.
 * `computeDrivers` below drops anything worth less than 0.15 percentage points of
 * admission probability, which at a 3% programme silently discards moves that are
 * genuinely worth several points on the 0-1000 scale — so src/lib/medex/score.js
 * re-filters by points and needs the labels for the items this file dropped.
 * Without sharing them it invents its own, and the two surfaces start describing
 * the same action in two different voices.
 */
export const DRIVER_LABELS = {
  clinical: 'Build your clinical hours toward the strong band',
  shadowing: 'Add shadowing hours',
  research: 'Get deeper into a research project',
  service: 'Build sustained community service',
  leadership: 'Take on a sustained leadership position',
  competitions: 'Place in a competition at state level or above',
  certifications: 'Earn a clinical certification (CNA, EMT, phlebotomy)',
};

function driverDetail(key, dim, profile) {
  const ref = dim.ref || {};
  const weightNote = profile.weightNotes?.[key];
  const base = dim.hours != null
    ? `You have about ${Math.round(dim.hours)} hours; the strong band for this kind of programme is around ${ref.p75}. ${dim.sustain?.known ? dim.sustain.note : ''}`
    : `You have ${dim.count ?? 0} logged; the strong band is around ${ref.p75} ${ref.unit || ''}.`;
  return weightNote ? `${base} ${weightNote}` : base.trim();
}
