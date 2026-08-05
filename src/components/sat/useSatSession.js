// Runs a SAT question session end to end: creates the attempt row, records each
// response as it happens (so a mid-session crash still preserves the work),
// pushes misses into the Review Log, and awards XP on completion.
//
// Shared by the Practice, Diagnostic and Full Test panels so the persistence
// and reward rules are written once.
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as DB from '../../lib/db';
import { getQuestion } from '../../data/sat/questions/index.js';
import { awardXP } from '../../lib/rewards';
import { celebrateXP } from '../../lib/celebrate';
import { scheduleCard } from '../../lib/fsrs';

// XP is weighted toward reviewing errors rather than raw volume — the incentive
// should follow the behavior that actually raises scores.
const XP_PER_CORRECT = 3;
const XP_PER_ATTEMPT = 1;

export function useSatSession({ onFinished } = {}) {
  const [attemptId, setAttemptId] = useState(null);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async ({ kind, section = null, questions, meta = {} }) => {
    setStarting(true);
    try {
      const id = await DB.createSatAttempt({
        kind, section, status: 'in_progress',
        questionIds: questions.map(q => q.id), meta,
      });
      setAttemptId(id);
      return id;
    } finally {
      setStarting(false);
    }
  }, []);

  /** Persist one response. Safe to call before the attempt row exists. */
  const recordResponse = useCallback(async (id, response) => {
    if (!id) return;
    // The question snapshot is for the Review Log, not the response row — one
    // row per answered question times a full test is a lot of duplicated
    // stimulus text to carry in `satResponses`, which is already the largest
    // SAT store and is synced.
    const { question, ...responseRow } = response;
    await DB.recordSatResponse({ attemptId: id, ...responseRow });

    // A miss — or a correct answer the student flagged, which usually means a
    // guess — goes into the Review Log immediately, due now.
    if (!response.correct || response.flagged) {
      await DB.addSatReviewEntry({
        questionId: response.questionId,
        skill: response.skill,
        section: response.section,
        chosen: response.choice ?? response.input ?? null,
        due: Date.now(),
        wasFlaggedGuess: !!(response.correct && response.flagged),
        source: response.source || 'practice',
        // Only carry the snapshot for items the static bank cannot resolve.
        // Storing it for bank questions too would duplicate the bank into
        // IndexedDB and, worse, freeze a stale copy: a corrected explanation
        // shipped later would never reach a student whose log predates it.
        ...(question && !getQuestion(question.id) ? { question } : {}),
      });
    }
  }, []);

  /** Close out an attempt, award XP, and record the study day. */
  const finish = useCallback(async (id, responses, result = {}) => {
    if (!id) return null;
    const correct = responses.filter(r => r.correct).length;
    await DB.finishSatAttempt(id, {
      result: { correct, total: responses.length, ...result },
    });
    await DB.recordStudyToday();

    const base = correct * XP_PER_CORRECT + responses.length * XP_PER_ATTEMPT;
    const { finalXP } = awardXP(base, { allowBonus: true });
    const user = await DB.getUser();
    if (user) await DB.saveUser({ ...user, xp: (user.xp || 0) + finalXP });
    celebrateXP(finalXP);

    onFinished?.({ attemptId: id, responses, correct, xp: finalXP });
    setAttemptId(null);
    return { correct, xp: finalXP };
  }, [onFinished]);

  /** Abandon an in-progress attempt without scoring it. */
  const abandon = useCallback(async (id) => {
    if (!id) return;
    await DB.abandonSatAttempt(id);
    setAttemptId(null);
  }, []);

  return { attemptId, setAttemptId, starting, start, recordResponse, finish, abandon };
}

/**
 * Advance a Review Log entry through FSRS after a retry, reusing the same
 * scheduler the flashcard decks run on (src/lib/fsrs.js) rather than inventing
 * a second spaced-repetition system.
 */
export async function scheduleReviewRetry(entry, wasCorrect) {
  const rating = wasCorrect ? 'Good' : 'Again';
  const scheduled = scheduleCard({ fsrsState: entry.fsrsState }, rating);
  await DB.updateSatReviewEntry(entry.id, {
    fsrsState: scheduled.fsrsState,
    due: scheduled.due,
    lastRetriedAt: Date.now(),
  });
  // Two clean retries in a row retires the entry — one lucky pass is not mastery.
  if (wasCorrect && (entry.correctRetries || 0) + 1 >= 2) {
    await DB.resolveSatReviewEntry(entry.id);
    toast.success('Cleared from your review log.');
  } else {
    await DB.updateSatReviewEntry(entry.id, {
      correctRetries: wasCorrect ? (entry.correctRetries || 0) + 1 : 0,
    });
  }
}
