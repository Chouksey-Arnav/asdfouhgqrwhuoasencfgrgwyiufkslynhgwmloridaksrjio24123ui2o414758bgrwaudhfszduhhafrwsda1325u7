// ─────────────────────────────────────────────────────────────────────────────
// Metabrain Quiz Recommendations — deterministic ranking engine
// Scores every not-yet-taken quiz against the student's real performance data
// (category averages, enrolled courses, pathway) and returns a ranked list:
// #1 pick first, #2 next, etc. No network call required — this runs instantly
// client-side so the "Recommended For You" panel never waits on an API. The
// Metabrain AI coach (Groq/Llama) can optionally narrate the #1 pick — see
// getMetabrainPickPrompt() below — but ranking itself never depends on it.
// ─────────────────────────────────────────────────────────────────────────────

const DIFF_WEIGHT = { Easy: 1, Medium: 0.86, Hard: 0.55, Expert: 0.35 };
const REASON_PRIORITY = ['course', 'weak', 'pathway', 'streak', 'new'];

function buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken }) {
  const reasons = [];
  if (catAvg !== null && catAvg !== undefined) {
    if (catAvg < 75) {
      reasons.push({ type: 'weak', text: `Your ${quiz.cat} average is ${catAvg}% — this is the fastest way to close the gap.` });
    }
  } else {
    reasons.push({ type: 'new', text: `You haven't started ${quiz.cat} yet — a fresh area to build up.` });
  }
  if (courseCats?.has(quiz.cat)) {
    reasons.push({ type: 'course', text: `Matches a course you're currently taking.` });
  }
  if (pathwayCats?.includes(quiz.cat)) {
    reasons.push({ type: 'pathway', text: `Core to your ${pathwayLabel} pathway.` });
  }
  if (totalTaken < 5 && quiz.diff === 'Easy') {
    reasons.push({ type: 'streak', text: `A quick, confidence-building win to keep your momentum going.` });
  }
  return reasons;
}

function primaryReason(reasons) {
  for (const t of REASON_PRIORITY) {
    const r = reasons.find(x => x.type === t);
    if (r) return r.text;
  }
  return 'A great next quiz to keep your streak alive.';
}

/**
 * Rank every untaken quiz for this student and return the top `count`.
 *
 * @param {Object} opts
 * @param {Array}  opts.quizzes       ALL_QUIZZES
 * @param {Object} opts.qScores       { [quizId]: pct }
 * @param {Object} opts.catAverages   { [category]: pct|null } — e.g. from secAvgs/cats3
 * @param {Set}    opts.courseCats    categories matching the student's enrolled courses
 * @param {Array}  opts.pathwayCats   PATHS[specialty].quizCats
 * @param {string} opts.pathwayLabel  PATHS[specialty].label
 * @param {number} opts.count         how many ranked picks to return (default 6)
 * @returns {Array<{rank, quiz, reason, tags}>}
 */
export function rankQuizzes({ quizzes, qScores, catAverages = {}, courseCats = new Set(), pathwayCats = [], pathwayLabel = '', count = 6 }) {
  const untaken = quizzes.filter(q => qScores[q.id] === undefined);
  if (!untaken.length) return [];

  const totalTaken = Object.keys(qScores).length;

  const scored = untaken.map(quiz => {
    const catAvg = catAverages[quiz.cat] ?? null;
    const reasons = buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken });

    let score = 50;
    if (catAvg !== null) score += Math.max(0, 100 - catAvg) * 0.6;
    else score += 18; // unexplored-category breadth bonus
    if (courseCats?.has(quiz.cat)) score += 20;
    if (pathwayCats?.includes(quiz.cat)) score += 14;
    if (totalTaken < 5 && quiz.diff === 'Easy') score += 12;
    score *= DIFF_WEIGHT[quiz.diff] ?? 0.7;

    return { quiz, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversity pass — cap 2 per category among the top picks so the list isn't
  // one-note, unless the untaken pool genuinely has nothing else left.
  const picked = [];
  const usedCats = new Map();
  const pool = [...scored];
  while (picked.length < count && pool.length) {
    let idx = pool.findIndex(c => (usedCats.get(c.quiz.cat) || 0) < 2);
    if (idx === -1) idx = 0;
    const chosen = pool.splice(idx, 1)[0];
    usedCats.set(chosen.quiz.cat, (usedCats.get(chosen.quiz.cat) || 0) + 1);
    picked.push(chosen);
  }

  return picked.map((p, i) => ({
    rank: i + 1,
    quiz: p.quiz,
    score: Math.round(p.score),
    reason: primaryReason(p.reasons),
    tags: p.reasons.map(r => r.type),
  }));
}

// Short, punchy label per rank so #1 reads as "the" pick, not just first-in-list.
export const RANK_LABELS = {
  1: 'Top pick',
  2: 'Great next step',
  3: 'Strong choice',
};
export function rankLabel(rank) {
  return RANK_LABELS[rank] || `#${rank}`;
}

// Builds the prompt for an optional Metabrain (Groq) one-liner about the #1
// pick — purely cosmetic narration on top of the deterministic ranking above,
// never required for the ranking to work.
export function getMetabrainPickPrompt({ pick, studentName, pathwayLabel }) {
  if (!pick) return null;
  return `In one encouraging sentence (max 25 words), tell ${studentName || 'the student'} why "${pick.quiz.title}" (${pick.quiz.cat}, ${pick.quiz.diff}) is their #1 recommended quiz right now. Context: ${pick.reason} They're on the ${pathwayLabel || 'college prep'} pathway. Be specific and motivating, not generic. No markdown, just one sentence.`;
}
