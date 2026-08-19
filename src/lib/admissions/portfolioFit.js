// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — everything else in the portfolio, scored on depth rather than count.
//
// ── What this fixes ─────────────────────────────────────────────────────────
// The old model scored activities as totals against small targets: 60 clinical
// hours was full marks, so a student with 62 hours logged over one summer and a
// student with 400 hours across three years scored identically. Totals are the
// easiest thing to compute and the least informative thing to read. What an
// admissions reader is actually looking for in this section is whether the
// commitment is real, which shows up as duration, continuity and escalation —
// not as a bigger number.
//
// So every dimension here is scored as:
//
//     depth (against the reference level)  ×  sustain  ×  evidence quality
//
// ── Sustain ─────────────────────────────────────────────────────────────────
// Two hundred hours compressed into six weeks of one summer and two hundred
// hours spread across two school years are different applications. The second
// one survives the obvious question ("did you keep doing it once it stopped
// being novel?") and the first one does not. `sustainFactor` reads the span and
// the continuity of the entries themselves — which the Portfolio already
// records, because every clinical row carries an entry date and every activity
// carries hours-per-week, weeks-per-year and grade levels.
//
// ── Bias #2: self-reported outcomes ─────────────────────────────────────────
// Chancing models are trained on self-reported data, and the reporting is
// asymmetric: admitted students post their results, rejected students go quiet.
// The training data is therefore biased upward before a single line of model
// code is written, and no amount of careful weighting inside the model fixes a
// biased sample.
//
// We cannot fix somebody else's training set, but we can refuse to repeat the
// mistake in our own inputs. Every hour in this Portfolio is self-reported
// unless it carries a verification status — so unverified evidence is
// discounted here, visibly, and the student is told that getting a supervisor
// to confirm it is one of the few things that moves the number without
// requiring another hundred hours. That is the honest version of the same idea:
// weight evidence by how much of it is actually evidence.
// ─────────────────────────────────────────────────────────────────────────────
import { DEFAULT_REFERENCE_LEVELS, PORTFOLIO_DIMENSIONS } from '../../data/admissions/programProfiles.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const IQR_Z = 0.6745;

/**
 * Depth of one quantity against a reference level, on a log scale.
 *
 * Log rather than linear because effort in this domain has sharply diminishing
 * returns: going from 20 to 60 clinical hours changes what you can say about
 * yourself, and going from 400 to 440 changes nothing. A linear scale rewards
 * the second as much as the first, which is how students end up grinding hours
 * that buy them nothing instead of starting the thing they are missing.
 */
export function depthZ(value, ref) {
  const v = num(value);
  if (v == null) return null;
  const p50 = num(ref?.p50), p75 = num(ref?.p75);
  if (!p50 || !p75 || p75 <= p50) return null;
  if (v <= 0) return -2;
  const z = (Math.log(v / p50) / Math.log(p75 / p50)) * IQR_Z;
  return clamp(z, -2, 2.2);
}

/**
 * How sustained a commitment is, as a multiplier on its depth.
 *
 * < 3 months  → 0.72  (a summer; real, but it is a summer)
 *   6 months  → 0.88
 *  12 months  → 1.00  (the baseline this model is calibrated on)
 *  24 months+ → 1.14  (the thing readers actually notice)
 *
 * Continuity — what share of the elapsed span had any activity in it — refines
 * that, but only where there is enough of a log to read it from. A student with
 * three entries across ten months is very often someone who logs in batches,
 * not someone who showed up three times, and penalising them for their logging
 * habit would be measuring the wrong thing. So continuity is only applied once
 * there are enough entries (ENTRIES_FOR_CONTINUITY) for the gaps to mean
 * something; below that, span alone decides.
 */
const ENTRIES_FOR_CONTINUITY = 6;

export function sustainFactor({ spanMonths, activeMonths, entries } = {}) {
  const span = num(spanMonths);
  if (span == null) return { factor: 1, known: false, note: 'No dates on these entries, so we cannot tell how sustained this is and are not adjusting for it either way.' };
  const base =
    span < 3  ? 0.72 :
    span < 6  ? 0.80 :
    span < 12 ? 0.90 :
    span < 24 ? 1.00 : 1.14;
  const active = num(activeMonths);
  const entryCount = num(entries);
  const continuityIsReadable = active != null && span > 0 && (entryCount == null || entryCount >= ENTRIES_FOR_CONTINUITY);
  // Continuity: what share of the elapsed span had any activity in it at all.
  const continuity = continuityIsReadable ? clamp(active / span, 0, 1) : null;
  // Continuity scales between 0.78 (one burst inside a long span) and 1.0
  // (something happening in essentially every month of it).
  const factor = continuity == null ? base : base * (0.78 + 0.22 * continuity);
  return {
    factor: clamp(factor, 0.6, 1.14), known: true, spanMonths: span, continuity,
    note: span < 6
      ? `Concentrated into about ${Math.round(span)} month${span === 1 ? '' : 's'}. Real, but a reader can tell the difference between a summer and a habit — continuing this into the school year is worth more than adding hours to it.`
      : span >= 24
        ? `Sustained across roughly ${Math.round(span)} months. This is the shape that reads as genuine rather than assembled, and it is the part of your application you cannot manufacture later.`
        : `Spread across about ${Math.round(span)} months.`,
  };
}

/**
 * Evidence quality: verified beats self-reported, and the gap is stated.
 * Never below 0.82 — an unverified hour is still an hour, it is just an hour we
 * have no independent reason to believe.
 */
export function evidenceFactor(verifiedShare) {
  const s = num(verifiedShare);
  if (s == null) return { factor: 0.88, share: null, note: 'These hours are self-reported. Getting a supervisor to confirm them is the cheapest thing on this whole list that moves the estimate.' };
  const factor = 0.82 + 0.18 * clamp(s, 0, 1);
  return {
    factor, share: s,
    note: s >= 0.99
      ? 'Fully verified — counted at full weight.'
      : s <= 0.01
        ? 'None of these hours are verified yet. Self-reported hours are counted at 82% of their weight here, deliberately: the whole reason chancing tools run optimistic is that they treat unverified self-reports as fact.'
        : `About ${Math.round(s * 100)}% of these hours are verified. Verifying the rest would raise what they are worth here by roughly ${Math.round((1 / factor - 1) * 100)}%.`,
  };
}

/** Scores one hours-based dimension end to end. */
function scoreHoursDimension(key, data, ref) {
  if (!data || data.hours == null) {
    return { key, available: false, z: -1.4, hours: 0, note: `Nothing logged under ${LABELS[key] || key} yet.`, empty: true };
  }
  const base = depthZ(data.hours, ref);
  const sustain = sustainFactor(data);
  const evidence = evidenceFactor(data.verifiedShare);
  // Sustain and evidence scale the ABOVE-baseline part only. Multiplying a
  // negative z by 0.72 would make a thin, unverified record look better than it
  // is, which is precisely backwards.
  const z = base == null ? -1.4 : (base >= 0 ? base * sustain.factor * evidence.factor : base);
  return {
    key, available: true, z, hours: data.hours, entries: data.entries ?? null,
    depthZ: base, sustain, evidence, ref,
    note: describeHours(key, data.hours, ref, base),
  };
}

const LABELS = {
  clinical: 'clinical hours', shadowing: 'shadowing', research: 'research',
  service: 'community service', leadership: 'leadership', competitions: 'competitions',
  certifications: 'certifications', academics: 'academics',
};

function describeHours(key, hours, ref, z) {
  const label = LABELS[key] || key;
  if (z == null) return `${Math.round(hours)} hours of ${label} logged.`;
  if (z >= IQR_Z) return `${Math.round(hours)} hours of ${label} — above the level we would expect from a typical admitted student at this kind of programme (~${ref.p75} hours is the strong band). More hours here is close to wasted effort; the leverage is elsewhere.`;
  if (z >= 0) return `${Math.round(hours)} hours of ${label} — around the level of a typical admitted student (~${ref.p50}).`;
  if (z >= -IQR_Z) return `${Math.round(hours)} hours of ${label} — below the typical admitted student (~${ref.p50}), but within reach of it.`;
  return `${Math.round(hours)} hours of ${label} — well short of the ~${ref.p50} hours a typical admitted student has. This is one of the real gaps in the application.`;
}

/** Count-based dimensions (leadership positions, competitions, certifications). */
function scoreCountDimension(key, items, ref) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return { key, available: false, z: -1.4, count: 0, note: `Nothing logged under ${LABELS[key] || key} yet.`, empty: true };

  // Depth beats breadth: two positions held for two years each outrank five
  // held for a term, and this is where that is expressed.
  const weighted = list.reduce((s, it) => {
    const months = num(it.months);
    const durationWeight = months == null ? 0.8 : months >= 24 ? 1.3 : months >= 12 ? 1.1 : months >= 6 ? 0.9 : 0.6;
    const levelWeight = { international: 1.6, national: 1.4, state: 1.2, regional: 1.1, school: 0.9, local: 0.9 }[String(it.level || '').toLowerCase()] || 1;
    return s + durationWeight * levelWeight;
  }, 0);

  const base = depthZ(weighted, ref);
  return {
    key, available: true, z: base ?? -1, count: list.length, weighted,
    ref, items: list,
    note: `${list.length} logged, weighted to ${weighted.toFixed(1)} once duration and level are taken into account (a two-year position counts for more than a one-term one; a state placement counts for more than a school one). The count on its own is not what is being read.`,
  };
}

/**
 * LAYER 3 entry point.
 *
 * @param portfolio normalised portfolio (see intake.js — derivePortfolioSignals)
 * @param profile   the programme profile, for its reference levels
 * @returns {{dimensions: Object, unknowns: string[]}} one entry per dimension in
 *          PORTFOLIO_DIMENSIONS except `academics`, which is layer 2's job.
 */
export function scorePortfolioFit({ portfolio = {}, profile = {} }) {
  const refs = { ...DEFAULT_REFERENCE_LEVELS, ...(profile.referenceLevels || {}) };
  const dimensions = {};
  const unknowns = [];

  for (const key of ['clinical', 'shadowing', 'research', 'service']) {
    dimensions[key] = scoreHoursDimension(key, portfolio[key], refs[key]);
    if (dimensions[key].empty) unknowns.push(key);
  }
  for (const key of ['leadership', 'competitions', 'certifications']) {
    dimensions[key] = scoreCountDimension(key, portfolio[key], refs[key]);
    if (dimensions[key].empty) unknowns.push(key);
  }

  return { dimensions, unknowns };
}

/** The dimensions layer 4 weights, minus academics (which layer 2 owns). */
export const NON_ACADEMIC_DIMENSIONS = PORTFOLIO_DIMENSIONS.filter(d => d !== 'academics');
