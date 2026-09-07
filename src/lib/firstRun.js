// ─────────────────────────────────────────────────────────────────────────────
// THE FIRST WEEK — what a brand-new student sees instead of the dashboard.
//
// ── The problem this closes ──────────────────────────────────────────────────
// Onboarding ends, the student lands on Home, and Home is a dashboard. A
// dashboard is a *reading instrument*: it answers "how am I doing" for someone
// who has been doing something. On day one there is nothing to read, so the
// page answers a question nobody asked and leaves the actual question — "okay…
// what now?" — unanswered. dashboardStages.js already shrank the page to its
// three always-on modules, which stopped it being discouraging. It did not make
// it INSTRUCTIVE. A small dashboard is still a dashboard.
//
// So for the first few real actions of an account, Home is not a dashboard at
// all. It is a guide: it says out loud that the student is new, it asks two
// short questions (not a second onboarding — two), and it hands them ONE next
// step at a time with the reason attached, in an order chosen for their grade.
//
// ── The four rules ───────────────────────────────────────────────────────────
//
// 1. TWO QUESTIONS, EVER. Onboarding already asked a dozen. These two exist
//    because they are the two the app cannot infer and cannot work well
//    without: what the student wants *first*, and how much time they actually
//    have. Both are skippable, both have a sane default, and neither is ever
//    asked twice. If you are tempted to add a third, add it to onboarding.
//
// 2. ONE STEP AT A TIME, WITH ITS REASON. The ladder shows the whole list —
//    hiding it would just recreate the "where am I going" problem at a smaller
//    scale — but exactly one row is *current*, and that row carries a sentence
//    saying why it is worth twenty minutes. A checklist without reasons is a
//    chore list.
//
// 3. THE ORDER IS THE STUDENT'S GRADE, NOT OURS. A freshman's first step is
//    finding a pathway; a senior's is their college list. Handing a senior in
//    October "finish your first lesson" is the same mistake the band system was
//    built to stop, one screen earlier.
//
// 4. IT ENDS BY ITSELF, AND IT CAN BE ENDED BY HAND. Once the required steps
//    are done the guide retires permanently and Home becomes the dashboard —
//    no toggle, no announcement, no way to fall back into it. A student who
//    wants the dashboard sooner dismisses it once (`firstRunDismissed`).
//
// Pure functions and plain data — no React, no storage, no DOM — so
// scripts/verifyFirstRun.mjs can assert the whole ladder under plain Node.
// ─────────────────────────────────────────────────────────────────────────────

/** How many ladder steps must be finished before Home becomes the dashboard. */
export const GRADUATION_STEPS = 3;

/**
 * The hard ceiling on how long an account can be "new", in days since signup.
 *
 * Without it, an account that signs up and does nothing for four months still
 * gets the beginner's page in February — which is both wrong (they are not new,
 * they are lapsed, and ReturningBreakScreen owns that case) and faintly
 * insulting. Three weeks is long enough for a student who uses the app twice a
 * month to still be walked through it.
 */
export const FIRST_RUN_MAX_DAYS = 21;

// ── The two questions ────────────────────────────────────────────────────────
//
// Asked on Home, one card, no wizard, no progress bar, no "step 1 of 2". Each
// answer is written straight onto the user record under `orientation`, and each
// one changes something the student can see within the same session — which is
// the only honest reason to ask a question at all.
export const ORIENTATION_QUESTIONS = [
  {
    id: 'focus',
    // Deliberately phrased as help rather than as a goal. "What is your goal"
    // invites the answer a student thinks we want ("become a doctor"); "what
    // would help most right now" gets the true one.
    prompt: 'What would help most right now?',
    // What the answer changes, shown under the question so it is not a survey.
    effect: 'This decides what the app opens on and what it puts first.',
    options: [
      { id: 'explore', label: 'Figuring out which health career fits me', destination: 'prep/diagnostic' },
      { id: 'study',   label: 'Getting stronger in the science I am taking', destination: 'prep/pathways' },
      { id: 'build',   label: 'Starting to build my application', destination: 'portfolio/resume' },
      { id: 'apply',   label: 'I am applying this year — deadlines first', destination: 'portfolio/milestones' },
    ],
  },
  {
    id: 'minutes',
    prompt: 'Honestly, how much time do you have in a week?',
    effect: 'This sets your daily goal. You can change it any time in Settings.',
    // `credits` maps onto the streak goal ladder in streak.js — a light week is
    // a two-credit day, which one quiz clears. Promising a student four credits
    // a day when they told us they have thirty minutes a week is how a streak
    // system teaches somebody that they are failing.
    options: [
      { id: 'light',  label: 'Around half an hour', credits: 2 },
      { id: 'steady', label: 'A couple of hours',   credits: 4 },
      { id: 'deep',   label: 'Most days of the week', credits: 6 },
    ],
  },
];

export const ORIENTATION_IDS = ORIENTATION_QUESTIONS.map((q) => q.id);

/** The option object a student picked for one question, or null. */
export function orientationChoice(user, questionId) {
  const q = ORIENTATION_QUESTIONS.find((x) => x.id === questionId);
  const picked = user?.orientation?.[questionId];
  return q?.options.find((o) => o.id === picked) || null;
}

/** The questions this student has not answered yet, in order. */
export function pendingQuestions(user) {
  const answers = user?.orientation || {};
  return ORIENTATION_QUESTIONS.filter((q) => !answers[q.id]);
}

/** The user patch that records one answer. Merges, never replaces. */
export function recordOrientation(user, questionId, optionId) {
  if (!user) return null;
  const q = ORIENTATION_QUESTIONS.find((x) => x.id === questionId);
  if (!q || !q.options.some((o) => o.id === optionId)) return null;
  return { ...user, orientation: { ...(user.orientation || {}), [questionId]: optionId } };
}

// ── The ladder ───────────────────────────────────────────────────────────────
//
// `done` is asked of the same signal bag featureUnlock.js reads, so a step can
// never claim to be incomplete for work the nav has already unlocked a tab for.
// `required` marks the steps that count toward GRADUATION_STEPS; the rest are
// genuinely optional and are shown as such.
//
// `why` is the sentence under the current step. It is written to be true for a
// specific student rather than motivational in general — "this is what fills in
// the rest of the app" is a fact; "you've got this!" is not.
const STEPS = {
  pathway: {
    id: 'pathway',
    title: 'Choose your pathway',
    why: 'Everything else — the lessons, the hours you log, the programs we surface — is scoped to one health career. Picking one takes a minute and you can switch whenever.',
    action: 'Pick a pathway',
    destination: 'prep/pathways',
    required: true,
    done: (s) => !!s.pathwayChosen,
  },
  lesson: {
    id: 'lesson',
    title: 'Finish one lesson',
    why: 'One lesson is what turns this from an app you signed up for into an app you have used. It is also what opens your Plans tab later.',
    action: 'Open the lesson track',
    destination: 'prep/pathways',
    required: true,
    done: (s) => (s.lessons || 0) >= 1,
  },
  quiz: {
    id: 'quiz',
    title: 'Take one quiz',
    why: 'Quizzes are how the app finds out what you already know, so it can stop showing you that and start showing you the rest.',
    action: 'Open the quiz library',
    destination: 'prep/quizzes',
    required: true,
    done: (s) => (s.quizzes || 0) >= 1,
  },
  college: {
    id: 'college',
    title: 'Add one college to your list',
    why: 'One school is enough for the app to start working backwards from a real deadline — essay prompts, aid comparisons and your chances all key off this list.',
    action: 'Open your college list',
    destination: 'portfolio/applying',
    required: true,
    done: (s) => (s.colleges || 0) >= 1,
  },
  activity: {
    id: 'activity',
    title: 'Log one thing you have already done',
    why: 'A club, a job, a sport, a volunteer shift — anything. Your résumé is built out of things you did before you found this app, not only things you do after it.',
    action: 'Log an activity',
    destination: 'portfolio/resume',
    required: true,
    done: (s) => (s.activities || 0) >= 1,
  },
  deadline: {
    id: 'deadline',
    title: 'Put your deadlines on the calendar',
    why: 'Application season runs on dates. Once yours are in, the app can tell you what has to start now rather than what is due later.',
    action: 'Open milestones',
    destination: 'portfolio/milestones',
    required: true,
    done: (s) => (s.deadlines || 0) >= 1 || (s.colleges || 0) >= 1,
  },
  streak: {
    id: 'streak',
    title: 'Come back tomorrow',
    why: 'Two days in a row is the only hard part of a streak. Everything after it is easier than the first repeat.',
    action: 'See your streak',
    destination: 'progress/streak',
    required: false,
    done: (s) => (s.streak || 0) >= 2,
  },
};

export const STEP_IDS = Object.keys(STEPS);

/**
 * The ladder for one grade, in order.
 *
 * The lists differ in ORDER far more than in content — every student meets
 * every step eventually — because the argument here is about what deserves the
 * first twenty minutes, not about what a student is allowed to do. The one real
 * difference is the senior's: a twelfth grader in October has no business being
 * told to finish a lesson before their deadlines are on a calendar, so 'lesson'
 * and 'quiz' drop off their required list entirely.
 */
const LADDERS = {
  freshman:  ['pathway', 'lesson', 'quiz', 'activity', 'streak'],
  sophomore: ['pathway', 'lesson', 'quiz', 'activity', 'college', 'streak'],
  junior:    ['pathway', 'college', 'activity', 'lesson', 'quiz', 'streak'],
  senior:    ['college', 'deadline', 'activity', 'pathway', 'streak'],
  gap:       ['college', 'deadline', 'activity', 'pathway', 'streak'],
};
/** The ladder for a student whose grade we do not know yet. */
const DEFAULT_LADDER = LADDERS.sophomore;

/** The step ids this grade is walked through, in order. */
export function ladderFor(gradeStage) {
  return LADDERS[gradeStage] || DEFAULT_LADDER;
}

/**
 * The `focus` answer re-orders the ladder without changing its contents: a
 * student who said "deadlines first" gets their college list first even in
 * tenth grade, because they told us so and an app that asks a question and then
 * ignores the answer is worse than one that never asked.
 */
const FOCUS_FIRST = {
  explore: ['pathway'],
  study:   ['lesson', 'quiz'],
  build:   ['activity', 'college'],
  apply:   ['college', 'deadline'],
};

function orderedSteps(gradeStage, focus) {
  const base = ladderFor(gradeStage);
  const lead = (FOCUS_FIRST[focus] || []).filter((id) => base.includes(id));
  return [...lead, ...base.filter((id) => !lead.includes(id))];
}

// ── Days since signup ────────────────────────────────────────────────────────

/** Whole days since this account was created, or null when we cannot tell. */
export function daysSinceSignup(user, now = new Date()) {
  const raw = user?.createdAt ?? user?.created_at ?? user?.signupAt;
  const t = typeof raw === 'string' ? Date.parse(raw) : Number(raw);
  if (!Number.isFinite(t) || t <= 0) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86400000));
}

/**
 * The whole first-week state for one student.
 *
 * @param {object} user     the saved user record
 * @param {object} signals  the featureUnlock signal bag, plus `pathwayChosen`,
 *                          `deadlines` and `streak`
 * @param {object} [opts]   `{ gradeStage, now }`
 */
export function firstRunPlan(user, signals = {}, { gradeStage = null, now = new Date() } = {}) {
  const s = signals || {};
  const focus = user?.orientation?.focus || null;
  const ids = orderedSteps(gradeStage, focus);

  const steps = ids.map((id) => {
    const step = STEPS[id];
    let done = false;
    try { done = !!step.done(s); } catch { done = false; }
    return { ...step, done };
  });

  const requiredDone = steps.filter((x) => x.required && x.done).length;
  const requiredTotal = Math.min(GRADUATION_STEPS, steps.filter((x) => x.required).length);
  const current = steps.find((x) => !x.done) || null;

  const age = daysSinceSignup(user, now);
  const questions = pendingQuestions(user);

  // ── When the guide retires ────────────────────────────────────────────────
  // Three ways out, and every one of them is permanent: they finished the
  // required steps, they dismissed it, or the account is simply not new any
  // more. A student who has done real work — enough to have unlocked Plans —
  // is never shown a beginner's page, whatever their step count says.
  const graduated = requiredDone >= requiredTotal
    || !!user?.firstRunDismissed
    || !!user?.masterPlan
    || (age !== null && age > FIRST_RUN_MAX_DAYS);

  return {
    /** True while Home should render the guide instead of the dashboard. */
    isNew: !graduated,
    /** The unanswered orientation questions, in order. Usually 0 or 2. */
    questions,
    steps,
    current,
    completed: requiredDone,
    total: requiredTotal,
    /** 0–1, for a progress rail. */
    progress: requiredTotal ? Math.min(1, requiredDone / requiredTotal) : 1,
    gradeStage,
    focus,
    ...headlineFor({ user, requiredDone, current, questions }),
  };
}

/**
 * What the guide says at the top of the page.
 *
 * Four states, and the distinction that matters is the first one: a student who
 * has done nothing at all is told they are new, in those words, because the
 * single most common thing a confused first-time user needs is confirmation
 * that they have not missed a step. Everyone else is told what they finished.
 */
function headlineFor({ user, requiredDone, current, questions }) {
  const name = (user?.name || '').split(' ')[0] || null;
  if (questions.length) {
    return {
      headline: name ? `Two quick questions, ${name}` : 'Two quick questions',
      subline: 'Then the app sets itself up around your answers. Nothing here takes more than a tap.',
    };
  }
  if (requiredDone === 0) {
    return {
      headline: name ? `You are new here, ${name}` : 'You are new here',
      subline: current
        ? `Start with one thing: ${current.title.toLowerCase()}. The rest of the app fills in behind it.`
        : 'Start with one thing. The rest of the app fills in behind it.',
    };
  }
  return {
    headline: requiredDone === 1 ? 'One down' : `${requiredDone} down`,
    subline: current
      ? `Next: ${current.title.toLowerCase()}.`
      : 'That is the setup finished — your dashboard takes over from here.',
  };
}

/** The user patch that retires the guide by hand. */
export function dismissFirstRun(user) {
  if (!user || user.firstRunDismissed) return null;
  return { ...user, firstRunDismissed: true };
}
