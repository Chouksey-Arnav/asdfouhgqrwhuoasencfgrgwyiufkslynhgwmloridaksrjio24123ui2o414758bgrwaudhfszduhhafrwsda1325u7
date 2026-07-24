// ─────────────────────────────────────────────────────────────────────────────
// Medabrain Quiz Recommendations — deterministic ranking engine
// Scores every not-yet-taken quiz against the student's real performance data
// (category averages, enrolled courses, pathway) and returns a ranked list:
// #1 pick first, #2 next, etc. No network call required — this runs instantly
// client-side so the "Recommended For You" panel never waits on an API. The
// Medabrain AI coach (Groq/Llama) can optionally narrate the #1 pick — see
// getMedabrainPickPrompt() below — but ranking itself never depends on it.
// ─────────────────────────────────────────────────────────────────────────────

const DIFF_WEIGHT = { Easy: 1, Medium: 0.86, Hard: 0.55, Expert: 0.35 };
const REASON_PRIORITY = ['course', 'weak', 'stale', 'pathway', 'streak', 'new'];

// Below this many days since a category was last touched, its untaken quizzes get a
// small "keep it fresh" nudge — a lightweight, deterministic stand-in for spaced
// repetition at the category level (real per-card FSRS scheduling already exists for
// flashcards; quizzes don't get individual review dates since each quiz is only ever
// taken once, so we approximate staleness at the category granularity instead).
const STALE_AFTER_DAYS = 10;
const STALE_MAX_BONUS_DAYS = 30; // bonus caps out once a category has been cold this long

function daysSince(ts, now) {
  if (!ts) return null;
  return Math.max(0, (now - ts) / 86400000);
}

function buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken, staleDays }) {
  const reasons = [];
  if (catAvg !== null && catAvg !== undefined) {
    if (catAvg < 75) {
      reasons.push({ type: 'weak', text: `Your ${quiz.cat} average is ${catAvg}% — this is the fastest way to close the gap.` });
    } else if (staleDays !== null && staleDays >= STALE_AFTER_DAYS) {
      reasons.push({ type: 'stale', text: `It's been ${Math.round(staleDays)} days since you tested ${quiz.cat} — a quick refresher keeps it sharp.` });
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
 * @param {Object} [opts.catLastActivity]  { [category]: lastCompletedAtMs } — last time any quiz
 *                                          in that category was completed, e.g. derived from
 *                                          qHistory. Optional — omitting it just skips staleness scoring.
 * @param {number} [opts.now]         current time in ms (defaults to Date.now()) — pass explicitly for testability
 * @param {number} opts.count         how many ranked picks to return (default 6)
 * @returns {Array<{rank, quiz, reason, tags}>}
 */
export function rankQuizzes({ quizzes, qScores, catAverages = {}, courseCats = new Set(), pathwayCats = [], pathwayLabel = '', catLastActivity = {}, now = Date.now(), count = 6 }) {
  const untaken = quizzes.filter(q => qScores[q.id] === undefined);
  if (!untaken.length) return [];

  const totalTaken = Object.keys(qScores).length;

  const scored = untaken.map(quiz => {
    const catAvg = catAverages[quiz.cat] ?? null;
    const staleDays = daysSince(catLastActivity[quiz.cat], now);
    const reasons = buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken, staleDays });

    let score = 50;
    if (catAvg !== null) score += Math.max(0, 100 - catAvg) * 0.6;
    else score += 18; // unexplored-category breadth bonus
    if (staleDays !== null && staleDays >= STALE_AFTER_DAYS) {
      // Ramps from 0 at STALE_AFTER_DAYS up to a flat +16 once a category has gone cold
      // for STALE_MAX_BONUS_DAYS+ — keeps previously-strong categories from being
      // permanently ignored just because they scored well once.
      const t = Math.min(1, (staleDays - STALE_AFTER_DAYS) / (STALE_MAX_BONUS_DAYS - STALE_AFTER_DAYS));
      score += 16 * t;
    }
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

// Builds the prompt for an optional Medabrain (Groq) one-liner about the #1
// pick — purely cosmetic narration on top of the deterministic ranking above,
// never required for the ranking to work.
export function getMedabrainPickPrompt({ pick, studentName, pathwayLabel }) {
  if (!pick) return null;
  return `In one encouraging sentence (max 25 words), tell ${studentName || 'the student'} why "${pick.quiz.title}" (${pick.quiz.cat}, ${pick.quiz.diff}) is their #1 recommended quiz right now. Context: ${pick.reason} They're on the ${pathwayLabel || 'college prep'} pathway. Be specific and motivating, not generic. No markdown, just one sentence.`;
}
