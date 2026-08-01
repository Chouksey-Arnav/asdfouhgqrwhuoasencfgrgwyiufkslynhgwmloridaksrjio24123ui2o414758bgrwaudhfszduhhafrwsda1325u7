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
const REASON_PRIORITY = ['course', 'weak', 'pathway', 'streak', 'new'];

// Grade-stage framing — freshmen/sophomores have runway to explore broadly;
// juniors/seniors are closer to standardized tests and applications, so a
// known gap in a course category is worth more urgency than a brand-new one.
const EARLY_GRADES = new Set(['freshman', 'sophomore']);
const LATE_GRADES = new Set(['junior', 'senior', 'gap']);
const STRUGGLING_GPA = new Set(['mostly_b', 'below_b']);

function buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken, gradeKey, gpaBand }) {
  const reasons = [];
  if (catAvg !== null && catAvg !== undefined) {
    if (catAvg < 75) {
      const urgency = LATE_GRADES.has(gradeKey)
        ? ' — worth shoring up now while you still have time before applications.'
        : ' — this is the fastest way to close the gap.';
      reasons.push({ type: 'weak', text: `Your ${quiz.cat} average is ${catAvg}%${urgency}` });
    }
  } else {
    const explore = EARLY_GRADES.has(gradeKey)
      ? ' — a great time to explore now, while you still have years of runway.'
      : ' — a fresh area to build up.';
    reasons.push({ type: 'new', text: `You haven't started ${quiz.cat} yet${explore}` });
  }
  if (courseCats?.has(quiz.cat)) {
    const gradeTie = STRUGGLING_GPA.has(gpaBand) ? ' Extra reps here can reinforce what actually affects your grade in that class.' : '';
    reasons.push({ type: 'course', text: `Matches a course you're currently taking.${gradeTie}` });
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
 * @param {string} [opts.gradeKey]    GRADE_STAGES key ('freshman'..'senior'|'gap') — shifts the
 *   breadth-vs-urgency balance: early grades lean toward exploring new categories, late grades
 *   lean toward closing known gaps and course-relevant material before applications.
 * @param {string} [opts.gpaBand]     onboarding GPA_OPTIONS value — a struggling band
 *   (mostly_b/below_b) raises the weight of quizzes that match a course currently being taken,
 *   since that's the material most likely to move an actual grade.
 * @param {number} opts.count         how many ranked picks to return (default 6)
 * @returns {Array<{rank, quiz, reason, tags}>}
 */
export function rankQuizzes({ quizzes, qScores, catAverages = {}, courseCats = new Set(), pathwayCats = [], pathwayLabel = '', gradeKey = null, gpaBand = null, count = 6 }) {
  const untaken = quizzes.filter(q => qScores[q.id] === undefined);
  if (!untaken.length) return [];

  const totalTaken = Object.keys(qScores).length;
  const early = EARLY_GRADES.has(gradeKey);
  const late = LATE_GRADES.has(gradeKey);
  const strugglingGpa = STRUGGLING_GPA.has(gpaBand);

  const scored = untaken.map(quiz => {
    const catAvg = catAverages[quiz.cat] ?? null;
    const reasons = buildReasons({ quiz, catAvg, pathwayCats, pathwayLabel, courseCats, totalTaken, gradeKey, gpaBand });

    let score = 50;
    // Late grades (junior/senior/gap) weight a real, measured gap more heavily —
    // there's less runway left to close it. Early grades weight it slightly less
    // so unexplored breadth (below) can compete with it instead of dominating.
    if (catAvg !== null) score += Math.max(0, 100 - catAvg) * (late ? 0.72 : 0.6);
    // Unexplored-category breadth bonus — bigger for freshmen/sophomores, who
    // have years to sample widely; smaller for juniors/seniors, who benefit
    // more from depth on what they've already started.
    else score += early ? 24 : late ? 12 : 18;
    // Course-relevant material gets an extra boost when self-reported grades
    // are struggling — this is the practice most likely to move an actual GPA.
    if (courseCats?.has(quiz.cat)) score += strugglingGpa ? 27 : 20;
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
