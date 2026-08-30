// ─────────────────────────────────────────────────────────────────────────────
// How hard is a lesson's verification bar, and is there one at all?
//
// THE PROBLEM THIS FIXES
// Every lesson used the same fixed 70%. That is wrong in two opposite
// directions at once:
//
//   • A lesson that later units genuinely build on (the body-systems tour, the
//     terminology that every clinical lesson afterward assumes) deserves a
//     HIGHER bar than 70. Letting a student through at 71% on the material the
//     next four lessons depend on is how a pathway quietly accumulates debt
//     that only shows up as "I don't understand any of this" three units later.
//
//   • A soft, exploratory lesson — "What PT/OT Programs Look For", "Health
//     Careers Up Close" — should not be gated at all. Putting a graded gate on
//     browsing content teaches a fourteen-year-old to read the article hunting
//     for the five facts that will be on the quiz, which is the exact opposite
//     of the behavior an exploration pathway exists to produce. The whole
//     diagnostic philosophy of this app is "go look at the field honestly";
//     quizzing that turns it into "go extract the answer key".
//
// So a lesson now sits in one of three tiers:
//
//   foundation   70%   Core science and skill lessons. The classic bar.
//   gateway      80%   Lessons that later content directly assumes. Higher bar
//                      precisely because a miss here is expensive later.
//   exploratory  none  Career-browsing and orientation content. Reading it
//                      counts; there is nothing to pass or fail.
//
// Tiers are DERIVED (from the unit's authored `stage` and its position in the
// pathway) rather than hand-stamped on 300+ lessons, with a small explicit
// override list for the cases derivation gets wrong. That keeps the policy one
// readable rule instead of a field nobody remembers to set on new content.
// ─────────────────────────────────────────────────────────────────────────────

/** Threshold, in percent, for each tier. `null` means "not gated at all". */
export const TIER_THRESHOLDS = { foundation: 70, gateway: 80, exploratory: null };

export const TIER_LABELS = {
  foundation: 'Foundation',
  gateway: 'Builds later lessons',
  exploratory: 'Explore — not graded',
};

/**
 * Lessons whose content is exploration, not competence: "what does this career
 * actually look like", "what do these programs want". A student should be able
 * to read these to find out whether a field interests them without a score
 * attached to the reading. Matched on the lesson's quiz id, because the same
 * career-orientation quiz is deliberately shared across several pathways
 * (see lessonQuizzes.js) and the tier should follow the content, not the copy.
 */
export const EXPLORATORY_QUIZ_IDS = new Set([
  'whatMedSchoolq', 'whatNursingq', 'whatPAq', 'whatPharmacyq', 'whatDentalq',
  'whatPTOTq', 'whatPublicHealthq', 'whatHealthAdminq', 'ex3l3q',
]);

/**
 * Lessons everything downstream leans on. These are the ones where a 71% pass
 * is a liability rather than a win, so they carry the 80% bar even when their
 * unit's stage would have said otherwise.
 */
export const GATEWAY_QUIZ_IDS = new Set([
  'medTermq',            // every clinical lesson afterward assumes this vocabulary
  'vitalsq',             // read by the data-interpretation items in later units
  'infectionControlq',   // assumed by every volunteering/shadowing lesson
]);

/** Explicit per-lesson-id overrides, for the handful derivation can't see. */
export const LESSON_TIER_OVERRIDES = {};

/**
 * Which tier a lesson sits in.
 *
 * @param {object} lesson  a PATHS[..].units[..].lessons[..] entry
 * @param {object} [ctx]   { unit, unitIndex, unitCount } — the unit the lesson
 *                         lives in and where that unit sits in its pathway.
 *                         Optional: without it the derivation falls back to the
 *                         quiz-id lists plus a foundation default, which is the
 *                         safe direction to be wrong in.
 */
export function tierForLesson(lesson, { unit = null, unitIndex = -1, unitCount = 0 } = {}) {
  if (!lesson) return 'foundation';
  if (LESSON_TIER_OVERRIDES[lesson.id]) return LESSON_TIER_OVERRIDES[lesson.id];

  const quizIds = lesson.quizIds || [];
  if (quizIds.some(id => EXPLORATORY_QUIZ_IDS.has(id))) return 'exploratory';
  if (quizIds.some(id => GATEWAY_QUIZ_IDS.has(id))) return 'gateway';

  const stage = unit?.stage;
  // "Next Steps" units are the pathway's application/orientation tail — nothing
  // in the pathway is built on top of them, and their content is exactly the
  // browse-and-decide material that must not be gated.
  if (stage === 'application') return 'exploratory';
  // Core and advanced units sit in the middle of a pathway: the units after
  // them assume them. The last unit of a pathway gates nothing by definition.
  if ((stage === 'core' || stage === 'advanced') && unitIndex >= 0 && unitIndex < unitCount - 1) {
    return 'gateway';
  }
  return 'foundation';
}

/**
 * The pass bar for a lesson, in percent — or `null` when the lesson is not
 * gated at all. Callers MUST handle null rather than defaulting it to a number:
 * an ungated lesson has no bar, and quietly substituting 70 would reintroduce
 * the exact gate this policy exists to remove.
 */
export function thresholdForLesson(lesson, ctx) {
  return TIER_THRESHOLDS[tierForLesson(lesson, ctx)];
}

/** True when the lesson has a graded gate at all. */
export function isGated(lesson, ctx) {
  return thresholdForLesson(lesson, ctx) !== null;
}

/**
 * Build a lessonId -> {tier, threshold} lookup across every pathway, so App
 * doesn't have to carry unit context around to every call site.
 * @param {object} paths PATHS from constants.js
 */
export function buildVerificationPolicy(paths) {
  const map = new Map();
  Object.values(paths || {}).forEach(path => {
    const units = path?.units || [];
    units.forEach((unit, unitIndex) => {
      (unit.lessons || []).forEach(lesson => {
        const ctx = { unit, unitIndex, unitCount: units.length };
        const tier = tierForLesson(lesson, ctx);
        // A lesson id can appear in more than one pathway. If two pathways
        // disagree, keep the stricter reading — a credential that means "you
        // cleared this" should not get weaker because some other track treats
        // the same material as optional browsing.
        const prev = map.get(lesson.id);
        const rank = { exploratory: 0, foundation: 1, gateway: 2 };
        if (prev && rank[prev.tier] >= rank[tier]) return;
        map.set(lesson.id, { tier, threshold: TIER_THRESHOLDS[tier] });
      });
    });
  });
  return map;
}

/** One student-facing sentence explaining this lesson's bar. */
export function describeThreshold(tier) {
  if (tier === 'exploratory') {
    return 'This one is for exploring, not for testing. Read it, look around, move on — nothing here is graded.';
  }
  if (tier === 'gateway') {
    return 'Later lessons build directly on this one, so the bar is 80% — a shaky pass here gets expensive three units from now.';
  }
  return 'Clear 70% to mark this lesson verified.';
}
