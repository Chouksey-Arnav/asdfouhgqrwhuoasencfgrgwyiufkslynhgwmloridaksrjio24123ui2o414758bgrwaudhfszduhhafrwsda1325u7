// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic scoring engine — replaces the old single-vote-count finalizeDiag.
// Blends a 5-axis work-style vector (from "axis" questions) with direct
// pathway bonus votes (from "scenario" questions) to rank all pathways
// against the student's answers, instead of picking a single max-count winner
// off a hardcoded fan-out table.
// ─────────────────────────────────────────────────────────────────────────────
import { DIAG_AXES, DIAG_AXIS_LABELS, DIAG_QS, PATHS } from '../data/constants';

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const axis of DIAG_AXES) {
    const va = a[axis] || 0, vb = b[axis] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// answers: array of choice-indexes, one per DIAG_QS entry (in order).
export function scorePathways(answers, { questions = DIAG_QS, paths = PATHS } = {}) {
  const vector = Object.fromEntries(DIAG_AXES.map(a => [a, 0]));
  const bonus = {};
  let axisCount = 0;

  answers.forEach((choiceIdx, i) => {
    const q = questions[i];
    const choice = q?.ch?.[choiceIdx];
    if (!choice) return;
    if (q.type === 'axis' && choice.axes) {
      DIAG_AXES.forEach(a => { vector[a] += choice.axes[a] || 0; });
      axisCount++;
    } else if (q.type === 'scenario' && choice.pathways) {
      Object.entries(choice.pathways).forEach(([k, v]) => { bonus[k] = (bonus[k] || 0) + v; });
    }
  });
  DIAG_AXES.forEach(a => { vector[a] = axisCount ? vector[a] / axisCount : 0; });

  const maxBonus = Math.max(1, ...Object.values(bonus));
  const scored = Object.entries(paths).map(([key, p]) => {
    const axisScore = cosineSimilarity(vector, p.idealVector || {});
    const bonusScore = (bonus[key] || 0) / maxBonus;
    return { key, score: axisScore * 0.7 + bonusScore * 0.3, axisScore, bonusVotes: bonus[key] || 0 };
  }).sort((a, b) => b.score - a.score);

  return { vector, bonus, scored, top: scored[0]?.key || 'exploring', ranked: scored.map(s => s.key) };
}

// Turns the raw scoring math into a short, human-readable "why this path" explanation —
// surfacing the actual decision logic instead of leaving the recommendation as a black box.
// Picks the axes this path cares about most (|idealVector| >= 0.3) where the student's own
// vector agrees most strongly with that path's ideal direction, framed using each axis's
// plain-language "A vs. B" label.
export function explainMatch(vector, topKey, { paths = PATHS, scored = null } = {}) {
  const path = paths[topKey];
  if (!path) return { reasons: [], confidence: null };
  const ideal = path.idealVector || {};
  const reasons = DIAG_AXES
    .map(axis => ({ axis, v: vector[axis] || 0, want: ideal[axis] || 0 }))
    .filter(c => Math.abs(c.want) >= 0.3 && Math.abs(c.v) >= 0.15)
    .map(c => ({ ...c, alignment: c.v * c.want }))
    .filter(c => c.alignment > 0) // only axes where the student's lean actually agrees with this path
    .sort((a, b) => b.alignment - a.alignment)
    .slice(0, 3)
    .map(c => {
      const [posLabel, negLabel] = (DIAG_AXIS_LABELS[c.axis] || '').split(' vs. ');
      return { axis: c.axis, leaning: (c.v >= 0 ? posLabel : negLabel)?.trim() };
    });

  let confidence = null;
  if (scored?.length) {
    const topScore = scored[0]?.score ?? 0;
    const runnerUpScore = scored[1]?.score ?? topScore;
    const gap = topScore - runnerUpScore;
    confidence = {
      pct: Math.round(Math.max(0, Math.min(1, (topScore + 1) / 2)) * 100),
      isClear: gap > 0.12,
      runnerUp: scored[1]?.key || null,
    };
  }
  return { reasons, confidence };
}
