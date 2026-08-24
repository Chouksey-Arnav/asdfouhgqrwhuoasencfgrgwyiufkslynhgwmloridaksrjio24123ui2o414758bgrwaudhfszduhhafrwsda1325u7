// ── Lesson difficulty feedback ────────────────────────────────────────────────
//
// At the bottom of every pathway lesson, Medabrain asks one question: was that too easy, too
// hard, or just right? Three answers, three genuinely different consequences:
//
//   too_easy    → Medabrain writes a DEEPER continuation of the same passage and appends it to
//                 the lesson. The student asked for more, so they get more — the same material
//                 taken further, not a different topic.
//   too_hard    → Medabrain re-teaches the passage from the ground up, and the app attaches
//                 real, verified outside resources (see lib/lessonResources.js — links come
//                 from the app's own vetted E-Library plus deterministic search URLs, never
//                 from the model, which cannot be trusted to invent a working URL).
//   just_right  → A short thank-you. No AI call: there is nothing to fix, and spending a
//                 generation on "great!" is how rate limits get burned for no one's benefit.
//
// Every answer is stored either way, because the pattern across lessons is the real product:
// a student who says "too easy" on nine straight biology lessons and "too hard" on chemistry
// is telling us where they actually are, and that belongs in the profile Medabrain reasons
// from. summarizeLessonFeedback() below is what turns those rows into that.

export const FEEDBACK_RATINGS = ['too_easy', 'just_right', 'too_hard'];

export const FEEDBACK_LABELS = {
  too_easy:   { label: 'Too easy',   short: 'easy',  blurb: 'I want to go deeper' },
  just_right: { label: 'Just right', short: 'right', blurb: 'This landed well' },
  too_hard:   { label: 'Too hard',   short: 'hard',  blurb: 'I need this explained' },
};

/** Weight used to score a student's overall level: -1 (needs support) … +1 (needs stretch). */
const RATING_WEIGHT = { too_easy: 1, just_right: 0, too_hard: -1 };

export function isValidRating(r) {
  return FEEDBACK_RATINGS.includes(r);
}

/**
 * Roll a student's feedback history into something both the UI and the AI prompts can use.
 *
 * Deliberately conservative about the word it puts on a student. Under 4 data points it
 * reports counts and refuses to characterise anyone — a single "too hard" on a hard day is
 * noise, and an app that decides you are struggling off one tap has earned no trust.
 *
 * @param {Array} rows  lesson_feedback rows: { rating, lessonTitle, unitTitle, category, createdAt }
 */
export function summarizeLessonFeedback(rows = []) {
  const valid = rows.filter((r) => isValidRating(r?.rating));
  const total = valid.length;
  const counts = { too_easy: 0, just_right: 0, too_hard: 0 };
  for (const r of valid) counts[r.rating] += 1;

  if (!total) {
    return { total: 0, counts, level: null, levelLabel: null, byCategory: [], recent: [], promptText: null };
  }

  const score = valid.reduce((s, r) => s + RATING_WEIGHT[r.rating], 0) / total;

  let level = null;
  let levelLabel = null;
  if (total >= 4) {
    if (score >= 0.4) { level = 'stretch'; levelLabel = 'consistently finds this material too easy — wants depth'; }
    else if (score <= -0.4) { level = 'support'; levelLabel = 'consistently finds this material hard — needs it broken down'; }
    else { level = 'calibrated'; levelLabel = 'well matched to this material at its current depth'; }
  }

  // Per-subject split — the useful signal is almost never global. "Too easy in biology, too
  // hard in chemistry" is a real, actionable fact about a student; a single blended number is not.
  const byCat = new Map();
  for (const r of valid) {
    const key = r.category || r.unitTitle || 'General';
    const c = byCat.get(key) || { category: key, too_easy: 0, just_right: 0, too_hard: 0, total: 0 };
    c[r.rating] += 1; c.total += 1;
    byCat.set(key, c);
  }
  const byCategory = [...byCat.values()]
    .map((c) => ({ ...c, score: (c.too_easy - c.too_hard) / c.total }))
    .sort((a, b) => b.total - a.total);

  const recent = [...valid].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);

  const parts = [
    `Self-reported lesson difficulty across ${total} lesson${total === 1 ? '' : 's'}: ${counts.too_easy} "too easy", ${counts.just_right} "just right", ${counts.too_hard} "too hard".`,
  ];
  if (levelLabel) parts.push(`Overall they are ${levelLabel}.`);
  else parts.push('Not enough responses yet to characterise their level — do not generalize from this.');

  const strong = byCategory.filter((c) => c.total >= 2 && c.score >= 0.5).map((c) => c.category);
  const hard = byCategory.filter((c) => c.total >= 2 && c.score <= -0.5).map((c) => c.category);
  if (strong.length) parts.push(`They ask for more depth in: ${strong.join(', ')}.`);
  if (hard.length) parts.push(`They struggle in: ${hard.join(', ')} — slow down and build up from basics there.`);
  if (recent.length) {
    parts.push(`Most recent: ${recent.slice(0, 3).map((r) => `"${r.lessonTitle}" → ${FEEDBACK_LABELS[r.rating].label.toLowerCase()}`).join('; ')}.`);
  }

  return { total, counts, score: Math.round(score * 100) / 100, level, levelLabel, byCategory, recent, promptText: parts.join(' ') };
}

/**
 * System prompt for the "too easy" / "too hard" follow-up generation.
 *
 * Both modes are pinned to the passage the student just read — the whole point is that the
 * response is about THIS text, not a generic lecture on the topic. The too_hard prompt is
 * explicitly forbidden from producing links: URLs are attached by the app from a vetted list
 * (lib/lessonResources.js), because a model asked for "a good YouTube video" will happily
 * return a plausible, dead, eleven-character video id.
 */
export function buildLessonDifficultyPrompt({
  rating,
  studentName = 'this student',
  gradeLabel = null,
  pathwayLabel = 'college prep',
  lessonTitle = '',
  unitTitle = '',
  objectives = [],
  articleSections = [],
  keyTakeaways = [],
  lessonNote = '',
  feedbackSummary = null,
} = {}) {
  const passage = articleSections.length
    ? articleSections.map((s) => `## ${s.heading}\n${s.body}`).join('\n\n')
    : '(This lesson has no in-app article text — work from the title and objectives.)';

  const shared = `You are Medabrain, the Prep tutor inside MedSchoolPrep, sitting with ${studentName}${gradeLabel ? ` (${gradeLabel})` : ''} on the ${pathwayLabel} pathway. They are a high-school student preparing for undergraduate admissions — keep everything at AP/high-school scope. Never mention the MCAT, med-school coursework, or clinical rotations as something they should be doing now.

── The lesson passage they just read ──
Lesson: "${lessonTitle}"${unitTitle ? ` (unit: "${unitTitle}")` : ''}
${objectives.length ? `Objectives: ${objectives.join('; ')}\n` : ''}
${passage}
${keyTakeaways.length ? `\nKey takeaways as written: ${keyTakeaways.join('; ')}` : ''}${lessonNote.trim() ? `\n\nTheir own notes on this lesson: "${lessonNote.trim()}"` : ''}${feedbackSummary ? `\n\n── What we know about their level ──\n${feedbackSummary}` : ''}`;

  if (rating === 'too_easy') {
    return `${shared}

── What they just told you ──
They read that passage and said it was TOO EASY. Their words: "This passage is way too easy for me. I need something a lot better."

Write a genuine EXTENSION of that passage — the next layer down, not a summary and not a restatement. This gets appended directly underneath the article they just read, so write it as a continuation of the lesson itself, addressed to them.

It must:
- Go deeper on the SAME material. Mechanism, not vocabulary: the why underneath what they were told, the step the passage skipped, the exception the simple version glosses over.
- Introduce the real terminology a strong AP-level student would want, and define each term as you use it.
- Include at least one concrete worked example, case, or number that makes the deeper idea land.
- Connect it forward — how this shows up in a harder course, in research, or in clinical reasoning.
- End with two or three genuinely hard questions they could sit with. Hard, not trivia.

Rules: 350-550 words. Markdown with ## subheadings and **bold** terms. Never say "as mentioned above" — write it as new material. Do NOT include any URLs or links; the app attaches its own vetted resources separately. Do not congratulate them for finding it easy — just give them the harder thing they asked for.`;
  }

  if (rating === 'too_hard') {
    return `${shared}

── What they just told you ──
They read that passage and said it was TOO HARD.

Re-teach it from the ground up. Assume nothing the passage assumed. This gets shown directly underneath the article, addressed to them.

It must:
- Open with the single core idea in one plain sentence, no jargon at all.
- Rebuild the passage step by step, in order, in ordinary language. Every term the article used without explaining, explain — including the ones it treated as obvious.
- Use a concrete everyday analogy for the hardest step, and then say explicitly where the analogy breaks down, so they don't carry a wrong model forward.
- Name the two or three specific places students most often get lost here, and what the confusion actually is.
- Finish with the smallest next step they can take right now to feel solid — one specific thing, not "review the material".

Rules: 350-550 words. Warm and matter-of-fact; never condescending, and never imply this is easy or that they should already know it. Markdown with ## subheadings and **bold** terms. Do NOT include any URLs, video links, or channel names — the app attaches its own verified videos and tutorials underneath your answer, and an invented link would send them nowhere.`;
  }

  return `${shared}

They said this lesson was JUST RIGHT. Reply with two warm sentences thanking them for the feedback and naming one specific thing from this passage worth carrying forward. No questions, no upsell.`;
}
