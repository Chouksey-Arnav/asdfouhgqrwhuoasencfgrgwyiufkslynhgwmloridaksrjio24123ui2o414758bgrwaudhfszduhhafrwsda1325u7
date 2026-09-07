// ─────────────────────────────────────────────────────────────────────────────
// The bridge between local learning state and the month plan.
//
// The month plan (lib/monthPlan/) reads a student out of the Supabase portfolio
// snapshot. Learning maintenance — which verified lessons are due a re-check,
// which have slipped back to needs-review, and how big today's card session is —
// deliberately never goes near that snapshot: a missed attempt is the most
// privacy-sensitive thing this app records, and the rule is that it stays on the
// device (see the "Adults never see this" note in lib/quizRecovery.js).
//
// So the plan cannot fetch this. This module assembles it locally and hands it
// in as `learning`, which readLearning() in monthPlan/signals.js treats as
// optional — with nothing passed, the plan simply has no learning items, which
// is the correct behavior anywhere this data legitimately is not available.
//
// Everything here is best-effort by construction. A student's month plan must
// never fail to build because a Dexie read went wrong, so every step degrades to
// "nothing due" rather than throwing.
// ─────────────────────────────────────────────────────────────────────────────
import * as DB from './db.js';
import { dueRechecks, nextRecheck } from './verificationSchedule.js';
import { buildSession, normalizeCap, DEFAULT_DAILY_CAP } from './flashcards/session.js';
import { allMissedConcepts } from './quizRecovery.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Assemble the `learning` argument for buildMonthSignals.
 *
 * @param {object} opts
 * @param {object} opts.user           the local user record (for the card cap)
 * @param {Map}    opts.lessonIndex    lessonId -> { lesson } | lesson, for titles
 * @param {Array}  opts.allCards       every flashcard available, already pooled
 * @returns {Promise<object|null>} null when nothing could be read at all
 */
export async function buildLearningSignal({ user = null, lessonIndex = null, allCards = null } = {}) {
  try {
    const titleFor = (lessonId) => {
      const hit = lessonIndex?.get?.(lessonId);
      return hit?.lesson?.title || hit?.title || null;
    };

    const [verifications, lastCardReviewAt, reviewedToday] = await Promise.all([
      DB.getVerifications().catch(() => []),
      DB.getLastCardReviewAt().catch(() => null),
      countReviewedToday(),
    ]);

    const rows = Array.isArray(verifications) ? verifications : [];

    const due = dueRechecks(rows).map((r) => ({
      lessonId: r.lessonId,
      title: titleFor(r.lessonId),
      items: nextRecheck(r)?.items || 2,
      daysSince: r.verifiedAt ? Math.round((Date.now() - r.verifiedAt) / DAY) : null,
    }));

    const needsReview = rows.filter((r) => r.needsReview).map((r) => ({
      lessonId: r.lessonId,
      title: titleFor(r.lessonId),
      concepts: Array.isArray(r.reviewConcepts) ? r.reviewConcepts : [],
    }));

    // The same session the Flashcards tab will actually serve, built from the
    // same function — so the plan quotes a number the student then sees, rather
    // than a second opinion computed a different way.
    let cards = { due: 0, sessionSize: 0, deferred: 0, backlog: false, daysAway: 0 };
    if (Array.isArray(allCards) && allCards.length) {
      const reviewConcepts = new Set();
      needsReview.forEach((r) => r.concepts.forEach((c) => reviewConcepts.add(String(c).toLowerCase())));
      allMissedConcepts().forEach((m) => reviewConcepts.add(String(m.concept).toLowerCase()));
      const session = buildSession(allCards, {
        cap: normalizeCap(user?.cardDailyCap ?? DEFAULT_DAILY_CAP),
        reviewedToday,
        lastStudyAt: lastCardReviewAt,
        reviewConcepts,
      });
      cards = {
        due: session.dueTotal,
        sessionSize: session.finishLine,
        deferred: session.deferred,
        backlog: session.backlog,
        daysAway: lastCardReviewAt ? Math.round((Date.now() - lastCardReviewAt) / DAY) : 0,
      };
    }

    return { dueRechecks: due, needsReview, cards };
  } catch (err) {
    console.error('learning signal unavailable', err);
    return null;
  }
}

async function countReviewedToday() {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (await DB.getCardReviewsSince(start.getTime())) || 0;
  } catch {
    return 0;
  }
}
