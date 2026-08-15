// ─────────────────────────────────────────────────────────────────────────────
// The onboarding journey, described as five short chapters.
//
// Why this file exists: the flow used to be a flat list of ~30 screens with a
// single hairline progress bar that crept forward a percent at a time. A
// student could not tell whether they were three screens from the end or
// thirteen, and the honest reviewer reaction was "when is this going to end".
// A bar that only moves is not an answer to that question — a *count* is.
//
// So the flow now carries structure the student can see: named chapters, a
// segmented bar where each segment is a chapter, and a literal "3 more to go"
// under it. Ten questions grouped into five named beats read as five things,
// which is the whole trick — the work didn't shrink nearly as much as the
// perceived work did (though it did shrink: see Onboarding.jsx's step list).
//
// Everything here is derived from the live `steps` array rather than
// hard-coded, so the branching steps (obstacleEmpathy only exists when there's
// an obstacle) can't desync the counter from reality.
// ─────────────────────────────────────────────────────────────────────────────

// Accents are stored as TOKEN NAMES, not colors: src/lib/theme.js mutates `C`
// in place on a theme switch, so a color captured at module load would be
// frozen to whichever palette happened to be active at import time.
//
// Each chapter carries a HUE PAIR rather than one accent (see design.js): the
// pair is what lets a chapter own a gradient with direction in it, and what
// makes the whole screen — wash, rail, progress, selection, button — move as
// one when the student crosses into the next chapter. `accent` is kept as the
// first token of the pair so any caller that only wants one color still works.
//
// `mark` is a NAME from icons.jsx. Chapters used to be identified by an emoji
// (🩺 📍 ⏱️ 🎯 🚀); those are gone for the reasons written at the top of
// icons.jsx.
export const CHAPTERS = [
  {
    key: 'why',
    label: 'Your why',
    rail: 'Why medicine?',
    line: 'Before any schedules or checklists — the reason you clicked into this at all.',
    hues: ['rose', 'pink'],
    accent: 'rose',
    mark: 'pulse-heart',
  },
  {
    key: 'you',
    label: 'Where you are',
    rail: 'Where you are today',
    line: 'An honest starting line. Every doctor had one, and none of them started at the finish.',
    hues: ['sky', 'cyan'],
    accent: 'sky',
    mark: 'pin',
  },
  {
    key: 'rhythm',
    label: 'Your rhythm',
    rail: 'How you actually work',
    line: 'Your plan gets built around your real week, not an imaginary one.',
    hues: ['amber', 'orange'],
    accent: 'amber',
    mark: 'clock',
  },
  {
    key: 'aim',
    label: 'Where you’re going',
    rail: 'What you’re aiming at',
    line: 'What you want most out of this, and the time you can honestly give it.',
    hues: ['violet', 'indigo'],
    accent: 'violet',
    mark: 'target',
  },
  {
    key: 'plan',
    label: 'Your plan',
    rail: 'Building your plan',
    line: 'What’s in the way, what you want out of this, and then it’s yours.',
    hues: ['emerald', 'teal'],
    accent: 'emerald',
    mark: 'route',
  },
];

// Which chapter each step belongs to. Steps missing from this map (splash,
// welcome, generating, planReady, ageBlocked) render without chapter chrome.
export const STEP_CHAPTER = {
  why: 'why',
  identity: 'why',

  startingPoint: 'you',
  academics: 'you',
  experience: 'you',
  expInsight: 'you',

  rhythm: 'rhythm',
  showcase: 'rhythm',

  goal: 'aim',
  speed: 'aim',

  challenges: 'plan',
  obstacleEmpathy: 'plan',
  potential: 'plan',
  prefs: 'plan',
  family: 'plan',
  commitment: 'plan',
  saveProgress: 'plan',
};

// The steps that actually ask the student for something. The remaining screens
// are payoff beats — they cost a tap, not a decision — and counting them as
// "questions" is what made the old flow feel like thirty questions when it only
// ever asked about ten things.
export const QUESTION_STEPS = new Set([
  'why', 'startingPoint', 'academics', 'experience',
  'rhythm', 'goal', 'speed', 'challenges', 'prefs', 'saveProgress',
]);

export const chapterByKey = (key) => CHAPTERS.find(c => c.key === key) || null;

/**
 * Everything the shell needs to render honest progress for the current step.
 *
 * @param {string[]} steps   the live step list (already branched)
 * @param {string}   stepKey the step being rendered
 */
export function flowMeta(steps, stepKey) {
  const chapter = chapterByKey(STEP_CHAPTER[stepKey]);
  const chapterIndex = chapter ? CHAPTERS.indexOf(chapter) : -1;
  const idx = steps.indexOf(stepKey);

  // Per-chapter fill, so the segmented bar advances inside a chapter as well as
  // between them. A chapter the student has passed reads full; the one they're
  // in reads partial; the ones ahead read empty.
  const segments = CHAPTERS.map((ch, i) => {
    const own = steps.filter(s => STEP_CHAPTER[s] === ch.key);
    if (!own.length) return { key: ch.key, fill: i < chapterIndex ? 1 : 0 };
    const done = own.filter(s => steps.indexOf(s) < idx).length;
    if (i < chapterIndex) return { key: ch.key, fill: 1 };
    if (i > chapterIndex) return { key: ch.key, fill: 0 };
    // Inside the current chapter, never show 0 — landing on a chapter is itself
    // progress, and an empty segment under "Chapter 3 of 5" reads as a stall.
    return { key: ch.key, fill: Math.max(0.12, done / own.length) };
  });

  const isQuestion = QUESTION_STEPS.has(stepKey);
  const before = steps.slice(0, Math.max(0, idx)).filter(s => QUESTION_STEPS.has(s)).length;
  const total = steps.filter(s => QUESTION_STEPS.has(s)).length;
  const number = Math.min(total, before + (isQuestion ? 1 : 0));
  const left = Math.max(0, total - before - (isQuestion ? 1 : 0));

  return {
    chapter,
    chapterIndex,
    chapterCount: CHAPTERS.length,
    segments,
    isQuestion,
    questionNumber: number,
    questionTotal: total,
    questionsLeft: left,
    encouragement: encouragementFor(isQuestion, left),
    // Kept for anything that still wants one scalar (0..1) for the whole flow.
    fraction: total ? Math.min(1, (before + (isQuestion ? 0 : 1)) / total) : 0,
  };
}

/**
 * The line under the bar. This is the part the reviewer actually asked for:
 * a running "how much is left" in words, not a bar to squint at.
 */
export function encouragementFor(isQuestion, left) {
  if (!isQuestion) return 'Nothing to answer here — just for you';
  if (left <= 0) return 'Last one — then your plan';
  if (left === 1) return 'Almost there — 1 more after this';
  if (left <= 3) return `${left} more to go`;
  return `${left} questions to go`;
}
