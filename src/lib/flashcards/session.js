// ─────────────────────────────────────────────────────────────────────────────
// Building the session queue — what a student is actually handed when they
// press Study.
//
// Four failures this replaces, all of them the classic ways a spaced-repetition
// feature loses the person it was built for:
//
// 1. A DECK OF NOTHING BUT YOUR WEAKEST MATERIAL.
//    A queue assembled purely from what you got wrong is, by construction, a
//    session where everything is hard and you fail repeatedly. That is
//    demoralizing in a way that has nothing to do with how much you're
//    learning, and for a teenager it is a straightforward reason to stop. So
//    known-good cards are interleaved deliberately — not as filler, but placed
//    so the session STARTS on something they can do and ENDS on competence.
//    See interleave() for the placement rule and why the ending matters most.
//
// 2. THE FOUR-HUNDRED-CARD WALL.
//    Miss two weeks, come back, get shown 412 due cards, quit permanently. This
//    is the single most-documented failure mode in spaced repetition and it is
//    entirely a presentation problem: the cards are fine, the number is what
//    does the damage. So the queue is CAPPED, the backlog is prioritized by
//    importance rather than dumped in due order, and the rest is explicitly
//    described as waiting rather than as owed.
//
// 3. NO FINISH LINE.
//    "Due: 412" with no end in sight reads as a debt. A capped queue with a
//    visible count and a progress bar reads as a task. Same cards.
//
// 4. THE WRONG CARDS FIRST AFTER A BREAK.
//    Due-date order after a two-week gap sorts by "which card went overdue
//    first", which is noise. importanceOf() sorts by what is actually worth
//    rescuing: material tied to a lesson that has slipped to needs-review, then
//    cards the student has actually struggled with, then everything else.
// ─────────────────────────────────────────────────────────────────────────────
import { isDue } from '../fsrs.js';

/** Default cards per day. Deliberately a session, not an inbox. */
export const DEFAULT_DAILY_CAP = 30;
/** The floor and ceiling a student may set it to in Settings. */
export const CAP_RANGE = { min: 10, max: 120 };

/** A break long enough that the queue needs backlog treatment, in days. */
export const BACKLOG_GAP_DAYS = 4;

const DAY = 24 * 60 * 60 * 1000;

/**
 * How badly does this card need to come back? Higher wins a place in a capped
 * queue. Every term is a judgment about what a student loses by NOT seeing the
 * card today, not about how overdue it happens to be.
 */
export function importanceOf(card, { reviewConcepts = new Set() } = {}) {
  let score = 0;

  // A card whose concept belongs to a lesson that slipped back to needs-review
  // is the highest-value card in the library: the student demonstrably learned
  // it once, and it is demonstrably fading. That is the exact window where a
  // review is cheap and worth the most.
  if (card.concept && reviewConcepts.has(String(card.concept).toLowerCase())) score += 100;

  // Cards the student has genuinely struggled with. FSRS difficulty runs 1–10.
  score += (card.difficulty || 5) * 4;

  // Low stability = closest to actually being forgotten. Capped so a brand-new
  // card can't outrank a card that is about to be lost.
  const stability = card.stability || 0;
  if (stability > 0) score += Math.max(0, 30 - stability);
  else score += 12; // new card: worth introducing, not worth pre-empting a rescue

  // Overdue-ness matters, but only mildly and with a ceiling — this is the term
  // that, on its own, produced the "sorted by which card broke first" ordering
  // that makes a returning student's queue feel arbitrary.
  if (card.due) score += Math.min(20, Math.max(0, (Date.now() - card.due) / DAY));

  return score;
}

/**
 * Split cards into what's due and what's known-good, where "known-good" means
 * a card the student has answered well and that is NOT currently due.
 */
export function partition(cards) {
  const due = [], known = [];
  (cards || []).forEach(c => {
    if (isDue(c)) due.push(c);
    // A card with real stability that they aren't behind on. These are the
    // items that make a session feel survivable.
    else if ((c.stability || 0) >= 1) known.push(c);
  });
  return { due, known };
}

/**
 * Weave confidence cards through a queue of due cards.
 *
 * The placement is the design, not the ratio:
 *   • The FIRST card is a known-good one. The opening card sets whether the
 *     session feels doable, and opening on your hardest item is how a student
 *     decides in three seconds that they're bad at this.
 *   • The LAST two are known-good. What a session ENDS on is what the student
 *     remembers about it an hour later, and ending on a card you can do is the
 *     difference between "that went fine" and "I don't know any of this".
 *   • The middle is roughly one known card per two due ones, which is enough to
 *     break up a run of failures without diluting the actual work.
 *
 * @param {Array} due
 * @param {Array} known    known-good cards, best-known first
 * @param {number} ratio   known cards per due card in the middle stretch
 */
export function interleave(due, known, ratio = 0.5) {
  const dueCards = [...(due || [])];
  const pool = [...(known || [])];
  if (!pool.length) return dueCards;
  if (!dueCards.length) return pool.slice(0, 5);

  const out = [];
  const take = () => pool.length ? pool.shift() : null;

  const opener = take();
  if (opener) out.push(opener);

  // Reserve the closers before the middle stretch can spend them — a session
  // that runs out of known cards two thirds through would end on exactly the
  // run of hard items this function exists to prevent.
  const closers = [take(), take()].filter(Boolean);

  let sinceKnown = 0;
  const perKnown = Math.max(1, Math.round(1 / Math.max(0.05, ratio)));
  dueCards.forEach(card => {
    out.push(card);
    sinceKnown++;
    if (sinceKnown >= perKnown && pool.length) {
      out.push(take());
      sinceKnown = 0;
    }
  });

  out.push(...closers);
  return out;
}

/**
 * The whole queue for one sitting.
 *
 * @param {Array}  cards            every card available
 * @param {object} opts
 * @param {number} opts.cap         daily cap
 * @param {number} opts.reviewedToday how many already done today (the cap is a
 *                                  DAILY cap, not a per-session one)
 * @param {number} opts.lastStudyAt timestamp of the last review, for backlog detection
 * @param {Set}    opts.reviewConcepts concepts from lessons in needs-review
 * @param {number} opts.mixRatio    known-good cards per due card
 * @returns {{queue, dueTotal, shown, deferred, backlog, cap, remainingToday, finishLine}}
 */
export function buildSession(cards, {
  cap = DEFAULT_DAILY_CAP,
  reviewedToday = 0,
  lastStudyAt = null,
  reviewConcepts = new Set(),
  mixRatio = 0.5,
} = {}) {
  const { due, known } = partition(cards);
  const remainingToday = Math.max(0, cap - reviewedToday);
  const gapDays = lastStudyAt ? (Date.now() - lastStudyAt) / DAY : 0;
  const backlog = due.length > cap && gapDays >= BACKLOG_GAP_DAYS;

  // Prioritize by importance, always — not only after a break. Even a normal
  // day's queue is better served worst-first-that-matters than by due order.
  const ranked = [...due].sort((a, b) => importanceOf(b, { reviewConcepts }) - importanceOf(a, { reviewConcepts }));
  const shown = ranked.slice(0, remainingToday);
  const deferred = Math.max(0, due.length - shown.length);

  // Known-good cards, most-stable first: the point of these is that they land,
  // so pick the ones most likely to.
  const confidence = [...known].sort((a, b) => (b.stability || 0) - (a.stability || 0));

  const queue = interleave(shown, confidence, mixRatio);
  return {
    queue,
    dueTotal: due.length,
    shown: shown.length,
    deferred,
    backlog,
    cap,
    remainingToday,
    // What the student is told up front. A number they can finish.
    finishLine: queue.length,
    knownMixedIn: queue.length - shown.length,
  };
}

/**
 * The line shown above a session. Never states the raw backlog as a debt: after
 * a break the deferred cards are described as waiting, with the honest reason
 * that doing 400 in one sitting is not a thing anyone does.
 */
export function describeSession(session) {
  if (!session || !session.finishLine) {
    return { headline: 'All caught up', sub: 'Nothing is due right now. Come back tomorrow — or study any deck straight through.' };
  }
  const { finishLine, deferred, knownMixedIn, backlog } = session;
  const mixNote = knownMixedIn > 0
    ? ` ${knownMixedIn} of them are cards you already know — they're in here on purpose so the session doesn't end on a wall.`
    : '';
  if (backlog && deferred > 0) {
    return {
      headline: `${finishLine} cards today`,
      sub: `You've been away, so there's a queue. We've picked the ${finishLine} that matter most and the rest are waiting — nobody clears 400 cards in one sitting, and being shown all of them is how people quit.${mixNote}`,
    };
  }
  if (deferred > 0) {
    return {
      headline: `${finishLine} cards today`,
      sub: `That's the whole session — ${deferred} more are waiting for tomorrow so today has an actual end to it.${mixNote}`,
    };
  }
  return {
    headline: `${finishLine} cards today`,
    sub: `That's everything due. One pass and you're done.${mixNote}`,
  };
}

/** Clamp a student-chosen cap into the supported range. */
export function normalizeCap(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DAILY_CAP;
  return Math.min(CAP_RANGE.max, Math.max(CAP_RANGE.min, Math.round(n)));
}
