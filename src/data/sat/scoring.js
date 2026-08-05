// ─────────────────────────────────────────────────────────────────────────────
// Raw -> scaled score conversion and Module 2 routing.
//
// HONESTY NOTE — read this before touching anything here.
// College Board does not publish its conversion tables or its routing cutoff.
// Everything in this file is OUR OWN calibration, fitted to the publicly
// documented behavior of the exam:
//
//   * Each section is 200-800; the composite is 400-1600.
//   * Module 1 performance routes you to an easier or harder Module 2.
//   * The lower Module 2 path caps a section around 600 even if you answer
//     every remaining question correctly. The upper path reaches 800.
//   * Harder questions carry more weight.
//
// Because these are estimates, every surface that renders a number derived
// from this file MUST label it as an estimate. See SCORE_DISCLAIMER below —
// use that constant rather than writing your own wording, so the caveat can
// never drift out of sync with one screen.
// ─────────────────────────────────────────────────────────────────────────────
import { SAT_SECTIONS, DIFFICULTIES } from './taxonomy.js';

export const SCORE_DISCLAIMER =
  'Estimated using our own conversion, not College Board’s official table. Treat it as a range, not a guarantee.';

// ── Module 2 routing ────────────────────────────────────────────────────────
// Reported practice suggests roughly 65-70% of Module 1 correct routes a
// student to the harder Module 2. We use the weighted fraction (harder items
// count more, per DIFFICULTIES[].weight) rather than a plain count, so a
// student who cleared the hard items but slipped on an easy one still routes
// up. Tunable — this is the single most impactful constant in the file.
export const ROUTING_THRESHOLD = 0.67;

export const MODULE_PATHS = {
  upper: { id: 'upper', label: 'Harder Module 2', color: '#10b981', ceiling: 800 },
  lower: { id: 'lower', label: 'Easier Module 2', color: '#f59e0b', ceiling: 600 },
};

/**
 * Weighted fraction correct on a set of responses.
 * @param {Array<{correct:boolean, difficulty:string}>} responses
 * @returns {number} 0..1
 */
export function weightedFraction(responses) {
  if (!responses?.length) return 0;
  let earned = 0, possible = 0;
  for (const r of responses) {
    const w = DIFFICULTIES[r.difficulty]?.weight ?? 1.0;
    possible += w;
    if (r.correct) earned += w;
  }
  return possible ? earned / possible : 0;
}

/**
 * Decide which Module 2 a student routes into, from their Module 1 responses.
 * @returns {{path:'upper'|'lower', fraction:number, threshold:number}}
 */
export function routeModule2(module1Responses) {
  const fraction = weightedFraction(module1Responses);
  return {
    path: fraction >= ROUTING_THRESHOLD ? 'upper' : 'lower',
    fraction,
    threshold: ROUTING_THRESHOLD,
  };
}

// ── Conversion anchors ──────────────────────────────────────────────────────
// [rawCorrect, scaledScore] pairs, interpolated linearly between anchors and
// clamped outside them. Raw is total correct ACROSS BOTH MODULES of a section.
//
// The upper-path curves start at a non-zero raw because reaching the upper
// path already requires clearing the routing threshold on Module 1 — a student
// on that path cannot have a low total raw score.
const CONVERSION = {
  rw: {
    lower: [[0, 200], [6, 250], [12, 310], [18, 360], [24, 410], [30, 460], [36, 505], [42, 545], [48, 578], [54, 600]],
    upper: [[18, 460], [24, 510], [30, 560], [35, 605], [40, 655], [44, 700], [48, 745], [51, 775], [54, 800]],
  },
  math: {
    lower: [[0, 200], [5, 250], [10, 310], [15, 365], [20, 420], [25, 475], [30, 520], [35, 560], [40, 585], [44, 600]],
    upper: [[14, 460], [19, 510], [24, 560], [28, 605], [32, 655], [36, 705], [39, 750], [42, 780], [44, 800]],
  },
};

/** SAT section scores are always reported in multiples of 10. */
const roundTo10 = (n) => Math.round(n / 10) * 10;

/**
 * Convert a raw correct count to a scaled section score.
 * @param {'rw'|'math'} section
 * @param {number} rawCorrect  total correct across both modules of the section
 * @param {'upper'|'lower'} path  which Module 2 the student was routed to
 * @returns {number} scaled score, 200-800, rounded to the nearest 10
 */
export function rawToScaled(section, rawCorrect, path = 'lower') {
  const anchors = CONVERSION[section]?.[path];
  if (!anchors) return 200;

  const maxRaw = SAT_SECTIONS[section].questions;
  const raw = Math.max(0, Math.min(maxRaw, rawCorrect));

  // Below/above the anchor range, clamp to the end anchors rather than
  // extrapolating — extrapolation off a fitted curve is where nonsense scores
  // like 810 or 190 come from.
  if (raw <= anchors[0][0]) return roundTo10(anchors[0][1]);
  const last = anchors[anchors.length - 1];
  if (raw >= last[0]) return roundTo10(last[1]);

  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (raw >= x0 && raw <= x1) {
      const t = (raw - x0) / (x1 - x0);
      return roundTo10(y0 + t * (y1 - y0));
    }
  }
  return roundTo10(last[1]);
}

/**
 * Highest section score still reachable on a given path — what we show a
 * student when we explain what routing to the easier module 2 cost them.
 */
export const pathCeiling = (section, path) => rawToScaled(section, SAT_SECTIONS[section].questions, path);

/** Compose a 400-1600 total from two section scores. */
export function compositeScore(rwScaled, mathScaled) {
  const rw = Math.max(200, Math.min(800, rwScaled || 200));
  const math = Math.max(200, Math.min(800, mathScaled || 200));
  return rw + math;
}

/**
 * Score a completed section from its full response list.
 * @param {'rw'|'math'} section
 * @param {Array} module1  responses from module 1
 * @param {Array} module2  responses from module 2
 */
export function scoreSection(section, module1 = [], module2 = []) {
  const routing = routeModule2(module1);
  const rawCorrect = [...module1, ...module2].filter(r => r.correct).length;
  const scaled = rawToScaled(section, rawCorrect, routing.path);
  return {
    section,
    rawCorrect,
    rawPossible: SAT_SECTIONS[section].questions,
    path: routing.path,
    routingFraction: routing.fraction,
    scaled,
    ceiling: pathCeiling(section, routing.path),
  };
}

// ── Percentile estimates ────────────────────────────────────────────────────
// Anchors approximating the nationally representative percentile curve. Used
// only for context ("roughly the 78th percentile"), never for a promise.
const PERCENTILE_ANCHORS = [
  [400, 1], [600, 3], [800, 10], [900, 18], [1000, 29], [1050, 36], [1100, 44],
  [1150, 52], [1200, 61], [1250, 70], [1300, 78], [1350, 85], [1400, 91],
  [1450, 95], [1500, 98], [1550, 99], [1600, 99],
];

/** Rough national percentile for a 400-1600 composite. */
export function compositePercentile(composite) {
  const c = Math.max(400, Math.min(1600, composite || 400));
  for (let i = 0; i < PERCENTILE_ANCHORS.length - 1; i++) {
    const [x0, y0] = PERCENTILE_ANCHORS[i];
    const [x1, y1] = PERCENTILE_ANCHORS[i + 1];
    if (c >= x0 && c <= x1) {
      const t = (c - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return 99;
}

/**
 * Points a section score would gain from converting `n` more raw questions,
 * at the student's current raw level. Drives the "what is this skill worth?"
 * framing in the skill heat map — a far more motivating number than accuracy.
 */
export function marginalPointsPerQuestion(section, rawCorrect, path = 'lower') {
  const here = rawToScaled(section, rawCorrect, path);
  const next = rawToScaled(section, Math.min(SAT_SECTIONS[section].questions, rawCorrect + 1), path);
  return Math.max(0, next - here);
}
