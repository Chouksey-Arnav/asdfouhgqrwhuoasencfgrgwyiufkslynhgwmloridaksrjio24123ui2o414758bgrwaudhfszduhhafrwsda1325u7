// ─────────────────────────────────────────────────────────────────────────────
// LEAVING — what the app says in the two seconds before a student goes.
//
// ── The moment this owns ─────────────────────────────────────────────────────
// The most valuable moment in a study product is not the one where somebody
// opens it. It is the one where somebody is about to close it having done
// nothing. That student came here on purpose, got distracted or overwhelmed,
// and is thirty seconds from a day that does not count — and every existing
// surface in this app is either behind them (a dashboard they scrolled past) or
// ahead of them (an evening toast that fires at 6pm, long after they left).
//
// So this module owns the exit: a single, honest, once-a-day interception that
// names exactly what is about to be lost and offers the smallest thing that
// prevents it.
//
// ── The five rules that keep this from being a dark pattern ──────────────────
//
// 1. IT NEVER LIES ABOUT WHAT IS AT RISK. The streak in this product is EARNED
//    (see streak.js) — it counts completed work, not app opens. So the prompt
//    can never say "stay to keep your streak", because staying does not keep
//    it. It says what actually keeps it: finish one lesson, or two quizzes.
//    A retention prompt that misdescribes its own mechanic teaches the student
//    that the app's numbers are theater.
//
// 2. IT NEVER FIRES WHEN THERE IS NOTHING AT STAKE. A student who has already
//    cleared today, or who has no streak to lose, sees nothing. Ever. The
//    prompt's entire credibility rests on it being rare and true.
//
// 3. ONCE A DAY, AND LEAVING IS ALWAYS ONE TAP. There is no second prompt, no
//    confirm-your-confirm, no disabled close button, no countdown. The dismiss
//    control is a real button with a real word on it, the same size as the
//    other one.
//
// 4. IT OFFERS THE SMALLEST SUFFICIENT ACTION. Not "study now" — the specific
//    named thing that clears today, with its length. A vague ask at the door is
//    an ask that gets declined.
//
// 5. IT TELLS THE TRUTH ABOUT FREEZES. A student holding a freeze is told their
//    streak survives the night either way, and is offered the work anyway. That
//    costs us the scarier version of the message and is obviously correct:
//    frightening somebody about a loss that cannot happen is the definition of
//    the pattern this file is trying not to be.
//
// Pure functions and plain data. The DOM half — what counts as "about to
// leave" — lives in the component; see StayForStreakModal.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import { localDateStr } from './dateUtils.js';

/** localStorage key for "already interrupted this student today". */
export const seenKey = (day = localDateStr()) => `exitPrompt:${day}`;

/**
 * The kinds of exit prompt, in the order they take precedence. Four, and the
 * fourth is silence — which is the outcome for most sessions and must be a
 * first-class result rather than a null nobody thought about.
 */
export const PROMPT_KINDS = ['at_risk', 'protected', 'first_day', 'none'];

/**
 * What to say, if anything, to a student who is leaving right now.
 *
 * @param {object} s
 * @param {number} s.streak          days currently earned in a row
 * @param {number} s.creditsToday    credits earned today
 * @param {number} s.goalCredits     credits needed to clear today
 * @param {number} s.freezes         streak freezes held
 * @param {number} s.minutesInApp    how long this session has been open
 * @param {object|null} s.smallestAction  `{ label, sublabel, destination, minutes }`
 *                                        the cheapest thing that clears today
 * @returns {{kind:string, title:string|null, body:string|null,
 *            stay:string|null, leave:string|null, action:object|null}}
 */
export function exitPrompt({
  streak = 0, creditsToday = 0, goalCredits = 4, freezes = 0,
  minutesInApp = 0, smallestAction = null,
} = {}) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const s = n(streak), done = n(creditsToday), goal = Math.max(1, n(goalCredits)), held = n(freezes);

  // Rule 2, both halves: nothing at stake, nothing said.
  if (done >= goal) return silence('today is already cleared');
  // A session shorter than half a minute is a bounce or a mis-tap, not a
  // decision to leave. Interrupting it is noise.
  if (n(minutesInApp) < 0.5) return silence('the session barely started');

  const remaining = goal - done;
  const how = smallestAction
    ? `${smallestAction.label}${smallestAction.minutes ? ` — about ${smallestAction.minutes} minutes` : ''}`
    : 'one lesson, or two quizzes';

  if (s >= 1 && held >= 1) {
    // Rule 5. The honest version, which is also the less alarming one.
    return {
      kind: 'protected',
      title: `Your ${s}-day streak survives tonight either way`,
      body: `You are holding ${held} streak freeze${held === 1 ? '' : 's'}, so a missed day gets bridged automatically. A freeze is worth more later than tonight, though — ${how} keeps this one and keeps the freeze.`,
      stay: 'Do it now',
      leave: 'Use the freeze',
      action: smallestAction,
    };
  }

  if (s >= 2) {
    return {
      kind: 'at_risk',
      title: `${s} days. Today is the one that is not finished.`,
      // Rule 1: what actually keeps it, stated as the mechanic it is.
      body: `A day counts here when you finish work, not when you open the app — so ${remaining} more credit${remaining === 1 ? '' : 's'} is all that is between this and day ${s + 1}. ${capitalize(how)}.`,
      stay: 'Finish today',
      leave: 'Leave it',
      action: smallestAction,
    };
  }

  if (s === 1) {
    return {
      kind: 'at_risk',
      title: 'Day two is the whole game',
      body: `You earned yesterday. Nobody has ever found the third day harder than the second, and ${how} makes this one count.`,
      stay: 'Make it two',
      leave: 'Not today',
      action: smallestAction,
    };
  }

  // No streak at all. Offered once, framed as a start rather than a loss —
  // there is nothing to protect, so pretending otherwise would break rule 1.
  if (done === 0) {
    return {
      kind: 'first_day',
      title: 'Start a one-day streak before you go',
      body: `Nothing has counted toward today yet. ${capitalize(how)} — and tomorrow you would be defending something instead of starting over.`,
      stay: 'Start it',
      leave: 'Another time',
      action: smallestAction,
    };
  }

  return silence('partial credit with no streak behind it');
}

function silence(why) {
  return { kind: 'none', title: null, body: null, stay: null, leave: null, action: null, why };
}

const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/**
 * Should we interrupt at all this session?
 *
 * Separate from `exitPrompt` on purpose: one answers "is there something true
 * to say", the other answers "are we allowed to say it right now". Keeping them
 * apart is what lets the verify script assert the frequency cap without going
 * near the copy.
 */
export function mayInterrupt({ alreadyShownToday = false, promptKind = 'none', optedOut = false } = {}) {
  if (optedOut) return false;              // Settings switch, honored absolutely.
  if (alreadyShownToday) return false;     // Rule 3.
  return promptKind !== 'none';
}

/**
 * The cheapest thing that clears today, chosen from what the student actually
 * has available. Returns null when nothing does, which the prompt renders as
 * the generic "one lesson, or two quizzes" line rather than as a broken button.
 *
 * Ordered by how little the student has to decide, not by value: at the door,
 * a resumable lesson beats a better lesson they would have to choose.
 */
export function smallestSufficientAction({
  resumableLesson = null, nextLesson = null, dueCards = 0, canOpen = () => true,
} = {}) {
  if (resumableLesson) {
    return {
      label: `finish "${resumableLesson.title}"`,
      sublabel: 'You already started this one',
      destination: 'prep/pathways',
      minutes: resumableLesson.minutes || 12,
      lesson: resumableLesson,
    };
  }
  if (nextLesson) {
    return {
      label: `start "${nextLesson.title}"`,
      sublabel: 'Next in your pathway',
      destination: 'prep/pathways',
      minutes: nextLesson.minutes || 12,
      lesson: nextLesson,
    };
  }
  if (dueCards >= 5 && canOpen('prep', 'flashcards')) {
    return {
      label: `review ${dueCards} due cards`,
      sublabel: 'Cards you have already met once',
      destination: 'prep/flashcards',
      minutes: Math.max(3, Math.round(dueCards / 4)),
    };
  }
  return null;
}
