// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic scoring engine — replaces the old single-vote-count finalizeDiag.
// Blends a 5-axis work-style vector (from "axis" questions) with direct
// pathway bonus votes (from "scenario" questions) to rank all pathways
// against the student's answers, instead of picking a single max-count winner
// off a hardcoded fan-out table.
// ─────────────────────────────────────────────────────────────────────────────
import { DIAG_AXES, DIAG_QS, PATHS } from '../data/constants';

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
    return { key, score: axisScore * 0.7 + bonusScore * 0.3 };
  }).sort((a, b) => b.score - a.score);

  return { vector, top: scored[0]?.key || 'exploring', ranked: scored.map(s => s.key) };
}
