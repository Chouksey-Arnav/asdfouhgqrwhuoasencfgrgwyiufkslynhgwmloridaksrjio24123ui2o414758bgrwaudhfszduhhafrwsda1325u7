// ─────────────────────────────────────────────────────────────────────────────
// Per-skill mastery, confidence, and leverage.
//
// DESIGN PRINCIPLE: never let a number look more certain than it is. The whole
// reason this tab exists is that the app used to show a confident "Predicted
// SAT Score" computed from unrelated biology quizzes. So every figure produced
// here travels with its own sample size, and `confidence` is a first-class
// output rather than something the UI can forget to mention.
//
// Mastery is deliberately NOT just accuracy:
//   * recency-weighted, because a skill you nailed two months ago and have not
//     touched since is not a skill you currently have;
//   * difficulty-aware, because 90% on easy items is not mastery;
//   * pacing-aware, because being right in triple the target time still loses
//     you points on a timed section.
// ─────────────────────────────────────────────────────────────────────────────
import {
  SAT_SKILLS, SKILL_IDS, DIFFICULTIES, examShare, sectionOfSkill, skillMeta,
} from '../../data/sat/taxonomy';

// Weight of each component in the composite. Must sum to 1.
const W_ACCURACY = 0.55;
const W_DIFFICULTY = 0.25;
const W_PACING = 0.20;

// Recency half-life. A response 21 days old counts half as much as one today.
const HALF_LIFE_DAYS = 21;

// Confidence ramp constant: confidence = n / (n + K).
// K = 6 gives 0.33 at 3 responses, 0.5 at 6, 0.67 at 12, 0.77 at 20.
const CONFIDENCE_K = 6;

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Exponential recency weight for a response, given its age in ms. */
function recencyWeight(answeredAt, now) {
  const days = Math.max(0, (now - (answeredAt || now)) / 86400000);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/**
 * How much credit a correct answer earns, and how much a wrong one costs,
 * scaled by item difficulty. Getting a hard item right is worth more than an
 * easy one; missing an easy item hurts more than missing a hard one.
 */
function difficultyCredit(responses) {
  let earned = 0, possible = 0;
  for (const r of responses) {
    const w = DIFFICULTIES[r.difficulty]?.weight ?? 1.0;
    possible += w;
    if (r.correct) earned += w;
  }
  return possible ? earned / possible : 0;
}

/**
 * Pacing term. A correct answer inside the target time scores 1; one that took
 * twice the target scores ~0.5; wrong answers contribute 0 regardless of speed
 * (fast and wrong is not a partial success). Responses with no recorded time
 * fall back to neutral so missing telemetry never silently drags mastery down.
 */
function pacingFactor(responses) {
  const timed = responses.filter(r => r.correct && typeof r.seconds === 'number' && r.seconds > 0);
  if (!timed.length) return null; // caller redistributes the weight
  let total = 0;
  for (const r of timed) {
    const target = r.targetSeconds || SAT_SKILLS[r.skill]?.targetSeconds || 75;
    // ratio <= 1 means at or under target -> full credit.
    const ratio = r.seconds / target;
    total += clamp01(ratio <= 1 ? 1 : 1 / ratio);
  }
  return total / timed.length;
}

/** n / (n + K) — how much we trust this skill's estimate. */
export function confidenceFor(n) {
  return n > 0 ? n / (n + CONFIDENCE_K) : 0;
}

export const CONFIDENCE_BANDS = [
  { max: 0.35, id: 'low', label: 'low confidence' },
  { max: 0.65, id: 'medium', label: 'moderate confidence' },
  { max: Infinity, id: 'high', label: 'high confidence' },
];

export const confidenceBand = (c) => CONFIDENCE_BANDS.find(b => c < b.max) || CONFIDENCE_BANDS[2];

/**
 * Compute mastery for one skill from its responses.
 *
 * @param {string} skillId
 * @param {Array<{correct:boolean, difficulty:string, seconds?:number, answeredAt:number, skill:string}>} responses
 * @param {number} now
 * @returns {{
 *   skill:string, attempts:number, correct:number, accuracy:number,
 *   mastery:number, confidence:number, confidenceBand:string,
 *   effectiveMastery:number, avgSeconds:number|null, targetSeconds:number,
 *   pacingRatio:number|null, lastAnsweredAt:number|null
 * }}
 */
export function computeSkillMastery(skillId, responses = [], now = Date.now()) {
  const meta = SAT_SKILLS[skillId];
  const target = meta?.targetSeconds || 75;
  const attempts = responses.length;

  if (!attempts) {
    return {
      skill: skillId, attempts: 0, correct: 0, accuracy: 0,
      mastery: 0, confidence: 0, confidenceBand: 'low', effectiveMastery: 0,
      avgSeconds: null, targetSeconds: target, pacingRatio: null, lastAnsweredAt: null,
    };
  }

  // ── recency-weighted accuracy ──
  let wSum = 0, wCorrect = 0;
  for (const r of responses) {
    const w = recencyWeight(r.answeredAt, now);
    wSum += w;
    if (r.correct) wCorrect += w;
  }
  const recencyAccuracy = wSum ? wCorrect / wSum : 0;

  const diffCredit = difficultyCredit(responses);
  const pacing = pacingFactor(responses);

  // If we have no timing data at all, redistribute the pacing weight across the
  // other two terms rather than scoring the student zero on a term we cannot
  // measure.
  let raw;
  if (pacing === null) {
    const scale = 1 / (W_ACCURACY + W_DIFFICULTY);
    raw = (W_ACCURACY * recencyAccuracy + W_DIFFICULTY * diffCredit) * scale;
  } else {
    raw = W_ACCURACY * recencyAccuracy + W_DIFFICULTY * diffCredit + W_PACING * pacing;
  }

  const mastery = clamp01(raw);
  const confidence = confidenceFor(attempts);
  const correct = responses.filter(r => r.correct).length;
  const timed = responses.filter(r => typeof r.seconds === 'number' && r.seconds > 0);
  const avgSeconds = timed.length
    ? Math.round(timed.reduce((s, r) => s + r.seconds, 0) / timed.length)
    : null;

  return {
    skill: skillId,
    attempts,
    correct,
    accuracy: correct / attempts,
    mastery,
    confidence,
    confidenceBand: confidenceBand(confidence).id,
    // Used for ranking, never for display. Shrinking by confidence makes a
    // never-practiced skill rank as "weak", which is what we want the selector
    // and the heat map to prioritize.
    effectiveMastery: mastery * confidence,
    avgSeconds,
    targetSeconds: target,
    pacingRatio: avgSeconds ? avgSeconds / target : null,
    lastAnsweredAt: Math.max(...responses.map(r => r.answeredAt || 0)) || null,
  };
}

/**
 * Mastery for every skill in the taxonomy, from a flat response list.
 * Skills with no responses are included with zeroes — a skill you have never
 * touched is exactly the thing the heat map needs to show.
 */
export function computeAllMastery(responses = [], now = Date.now()) {
  const bySkill = {};
  for (const s of SKILL_IDS) bySkill[s] = [];
  for (const r of responses) if (bySkill[r.skill]) bySkill[r.skill].push(r);
  const out = {};
  for (const s of SKILL_IDS) out[s] = computeSkillMastery(s, bySkill[s], now);
  return out;
}

/**
 * Leverage — "how many points is fixing this skill actually worth?"
 *
 * = share of the exam this skill occupies x how far from mastered it is.
 *
 * This is what orders the heat map and drives the Smart Set. Ordering by raw
 * weakness alone sends students to polish a 1-question-per-test skill while a
 * 6-question-per-test skill stays broken.
 */
export function computeLeverage(skillId, masteryRecord) {
  const share = examShare(skillId);
  const gap = 1 - (masteryRecord?.effectiveMastery ?? 0);
  return share * gap;
}

/**
 * Skills ranked by leverage, richest first.
 * @returns {Array<{skill, label, section, domain, color, leverage, ...mastery}>}
 */
export function rankSkillsByLeverage(masteryMap, { section, limit } = {}) {
  let rows = SKILL_IDS.map(id => {
    const m = masteryMap[id] || computeSkillMastery(id, []);
    const meta = skillMeta(id);
    return {
      ...m,
      label: meta.label,
      section: meta.section,
      sectionLabel: meta.sectionLabel,
      domain: meta.domain,
      domainLabel: meta.domainLabel,
      color: meta.color,
      blurb: meta.blurb,
      examShare: examShare(id),
      leverage: computeLeverage(id, m),
    };
  });
  if (section) rows = rows.filter(r => r.section === section);
  rows.sort((a, b) => b.leverage - a.leverage);
  return limit ? rows.slice(0, limit) : rows;
}

/**
 * Roll skill mastery up to a section-level estimate of proportion-correct.
 * Weighted by each skill's real share of the section, so the estimate reflects
 * the exam's actual composition rather than what the student chose to practice.
 * Returns null when there is not enough data to say anything honest.
 */
export function sectionMastery(masteryMap, section) {
  const skills = SKILL_IDS.filter(id => sectionOfSkill(id) === section);
  let weighted = 0, weightSum = 0, attempts = 0;
  for (const id of skills) {
    const m = masteryMap[id];
    if (!m || !m.attempts) continue;
    const w = examShare(id);
    weighted += m.mastery * w;
    weightSum += w;
    attempts += m.attempts;
  }
  if (!weightSum || attempts < 5) return null;

  // Coverage: what fraction of the section's exam weight we have any data on.
  // A student who has only practiced Algebra has not measured "Math".
  const totalWeight = skills.reduce((s, id) => s + examShare(id), 0);
  return {
    section,
    mastery: weighted / weightSum,
    attempts,
    coverage: weightSum / totalWeight,
    confidence: confidenceFor(attempts) * (weightSum / totalWeight),
  };
}

/** Persisted-cache shape for the satSkillStats Dexie store. */
export const toStatRow = (m) => ({
  skill: m.skill, attempts: m.attempts, correct: m.correct, mastery: m.mastery,
  confidence: m.confidence, avgSeconds: m.avgSeconds, lastAnsweredAt: m.lastAnsweredAt,
  updatedAt: Date.now(),
});
