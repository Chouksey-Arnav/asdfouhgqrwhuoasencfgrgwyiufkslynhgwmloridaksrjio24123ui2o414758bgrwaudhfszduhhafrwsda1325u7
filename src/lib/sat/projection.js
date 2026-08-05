// ─────────────────────────────────────────────────────────────────────────────
// Score projection — the honest replacement for App.jsx's old `predSAT`.
//
// The metric this replaces averaged a student's scores on three MCAT-style
// SCIENCE quiz categories and mapped the percentage through
// `400 + (pct/100)*1200`. It had no relationship to the SAT whatsoever, and it
// was displayed as a confident single number.
//
// The rules this module follows instead:
//   1. Only real SAT practice data feeds a projection. No proxies.
//   2. A full practice test outranks everything else; drills are weak evidence.
//   3. The output is always a RANGE with an explicit confidence level, and the
//      range widens as the evidence thins.
//   4. With too little evidence the answer is `null` — the UI shows "take the
//      diagnostic" rather than inventing a number.
// ─────────────────────────────────────────────────────────────────────────────
import { SECTION_IDS, SAT_SECTIONS } from '../../data/sat/taxonomy';
import { rawToScaled, compositeScore, compositePercentile, SCORE_DISCLAIMER } from '../../data/sat/scoring';
import { sectionMastery } from './mastery';

// Minimum responses in a section before we will say anything about it at all.
const MIN_RESPONSES_PER_SECTION = 12;
// Minimum overall responses before we will show a composite projection.
const MIN_TOTAL_RESPONSES = 30;

// Half-width of the projected range, in points per section, by evidence level.
// These are deliberately wide. A narrow band on thin evidence is the exact
// failure mode this module exists to prevent.
const BAND = {
  full_test: 30,   // an actual completed adaptive practice test
  diagnostic: 60,  // a wide-but-shallow placement test
  practice: 90,    // accumulated drill responses only
};

const CONFIDENCE_COPY = {
  full_test: 'Based on a full-length adaptive practice test.',
  diagnostic: 'Based on your diagnostic. Take a full-length test to narrow this.',
  practice: 'Based on practice questions only — a rough estimate. Take a full-length test to narrow this.',
};

const CONFIDENCE_LEVEL = { full_test: 'high', diagnostic: 'moderate', practice: 'low' };

const roundTo10 = (n) => Math.round(n / 10) * 10;
const clampScore = (n) => Math.max(200, Math.min(800, roundTo10(n)));

/**
 * Project a section score from accumulated practice responses.
 *
 * Converts measured proportion-correct into a raw count out of the section's
 * real question total, then runs it through the same conversion table the full
 * test uses. Uses the LOWER path curve deliberately: a student practicing in
 * untimed drills has not demonstrated they can clear the routing bar under exam
 * conditions, and over-promising is the failure mode we are correcting.
 */
function projectSectionFromPractice(masteryMap, section) {
  const sm = sectionMastery(masteryMap, section);
  if (!sm) return null;
  const rawEquivalent = sm.mastery * SAT_SECTIONS[section].questions;
  return {
    section,
    scaled: rawToScaled(section, rawEquivalent, 'lower'),
    attempts: sm.attempts,
    coverage: sm.coverage,
  };
}

/**
 * The projection.
 *
 * @param {object} opts
 * @param {object} opts.masteryMap     from computeAllMastery()
 * @param {Array}  opts.attempts       satAttempts rows (most recent first)
 * @param {Array}  opts.responses      all satResponses rows
 * @returns {null | {
 *   low:number, high:number, mid:number, percentile:number,
 *   basis:'full_test'|'diagnostic'|'practice', confidence:'low'|'moderate'|'high',
 *   note:string, disclaimer:string, sections:object, evidenceCount:number,
 *   asOf:number
 * }}
 */
export function projectScore({ masteryMap = {}, attempts = [], responses = [] } = {}) {
  // ── Best evidence: the most recent completed full-length test ──
  const lastFull = attempts.find(a => a.kind === 'full' && a.status === 'complete' && a.result?.composite);
  if (lastFull) {
    const composite = lastFull.result.composite;
    const band = BAND.full_test * 2; // two sections
    return {
      low: Math.max(400, roundTo10(composite - band)),
      high: Math.min(1600, roundTo10(composite + band)),
      mid: composite,
      percentile: compositePercentile(composite),
      basis: 'full_test',
      confidence: CONFIDENCE_LEVEL.full_test,
      note: CONFIDENCE_COPY.full_test,
      disclaimer: SCORE_DISCLAIMER,
      sections: lastFull.result.sections || null,
      evidenceCount: 1,
      asOf: lastFull.finishedAt || lastFull.startedAt,
    };
  }

  // ── Next best: a completed diagnostic, or enough accumulated practice ──
  const lastDiagnostic = attempts.find(a => a.kind === 'diagnostic' && a.status === 'complete');
  const basis = lastDiagnostic ? 'diagnostic' : 'practice';

  if (responses.length < MIN_TOTAL_RESPONSES) return null;

  const sections = {};
  let usable = 0;
  for (const section of SECTION_IDS) {
    const sectionResponses = responses.filter(r => r.section === section);
    if (sectionResponses.length < MIN_RESPONSES_PER_SECTION) { sections[section] = null; continue; }
    const projected = projectSectionFromPractice(masteryMap, section);
    sections[section] = projected;
    if (projected) usable++;
  }

  // Both sections are required — projecting a 1600-scale composite off one
  // section means inventing the other half.
  if (usable < SECTION_IDS.length) return null;

  const mid = compositeScore(sections.rw.scaled, sections.math.scaled);
  const band = BAND[basis] * 2;
  // Thin coverage widens the band further: practicing only Algebra tells us
  // little about Math as a whole.
  const avgCoverage = SECTION_IDS.reduce((s, x) => s + (sections[x]?.coverage || 0), 0) / SECTION_IDS.length;
  const coveragePenalty = Math.round((1 - avgCoverage) * 100);

  return {
    low: Math.max(400, roundTo10(mid - band - coveragePenalty)),
    high: Math.min(1600, roundTo10(mid + band + coveragePenalty)),
    mid: clampScore(mid / 2) * 2 === mid ? mid : roundTo10(mid),
    percentile: compositePercentile(mid),
    basis,
    confidence: CONFIDENCE_LEVEL[basis],
    note: CONFIDENCE_COPY[basis],
    disclaimer: SCORE_DISCLAIMER,
    sections,
    evidenceCount: responses.length,
    asOf: Math.max(...responses.map(r => r.answeredAt || 0)) || Date.now(),
  };
}

/**
 * What to tell a student who has no projection yet. Returned separately so the
 * UI never has to invent copy for the empty state.
 */
export function projectionEmptyState(responseCount = 0) {
  if (responseCount === 0) {
    return {
      title: 'No score estimate yet',
      body: 'Take the diagnostic and we will show you where you actually stand — measured, not guessed.',
      cta: 'Start the diagnostic',
      view: 'diagnostic',
    };
  }
  return {
    title: 'Not enough data yet',
    body: `You have answered ${responseCount} question${responseCount === 1 ? '' : 's'}. We need at least ${MIN_TOTAL_RESPONSES} across both sections before an estimate means anything.`,
    cta: 'Keep practicing',
    view: 'practice',
  };
}

/**
 * Progress toward a target score, for the Overview header.
 * Returns null when either side is unknown — no target, no projection, no bar.
 */
export function targetProgress(projection, targetComposite) {
  if (!projection || !targetComposite) return null;
  const start = 400;
  const span = targetComposite - start;
  if (span <= 0) return null;
  return {
    target: targetComposite,
    current: projection.mid,
    pct: Math.max(0, Math.min(100, ((projection.mid - start) / span) * 100)),
    gap: Math.max(0, targetComposite - projection.mid),
    reached: projection.mid >= targetComposite,
    // Honest framing: the gap is against the midpoint, but the range may
    // already include the target.
    withinRange: projection.high >= targetComposite,
  };
}

/**
 * Score trajectory from completed full tests — the series the Scores view
 * charts. Only real measurements, in chronological order.
 */
export function scoreTrajectory(attempts = []) {
  return attempts
    .filter(a => a.kind === 'full' && a.status === 'complete' && a.result?.composite)
    .map(a => ({
      at: a.finishedAt || a.startedAt,
      composite: a.result.composite,
      rw: a.result.sections?.rw?.scaled ?? null,
      math: a.result.sections?.math?.scaled ?? null,
    }))
    .sort((a, b) => a.at - b.at);
}
