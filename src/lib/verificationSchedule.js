// ─────────────────────────────────────────────────────────────────────────────
// Spaced re-verification — what makes "verified" mean something.
//
// THE PROBLEM THIS FIXES
// A lesson was verified once, forever. A student who cleared a quiz in October
// still had a green shield on that lesson in April, and the shield said
// "verified" while meaning "passed a quiz six months ago and has not thought
// about it since". That is a credential that decays to nothing while continuing
// to look identical, which is worse than no credential: the Portfolio, the unit
// mastery view and the student's own sense of what they know are all built on it.
//
// So verification now has a maintenance schedule: a 2–3 item check at roughly
// 30 days, and again at roughly 90. That interval is not arbitrary — it is
// where the forgetting curve for material learned once and not revisited falls
// off hardest, which is also why it is where a check is most informative.
//
// Two design rules the rest of the app depends on:
//
//   • A re-check is SMALL. Two or three items, one screen, under a minute. A
//     maintenance check that feels like a re-exam gets skipped, and a skipped
//     check tells us nothing.
//
//   • Failing one is QUIET. The lesson moves back to needs-review; nothing is
//     announced, nothing is taken away, no adult is told. The point is to route
//     the material back into the flashcard engine while it is still recoverable,
//     not to stage a second failure. `everVerified` is kept separately from
//     `verified` precisely so a needs-review lesson does not re-lock the units
//     the student has already moved past — the credential gets honest, the
//     student does not get punished for it.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

/** Stage offsets from the original verification, in days. */
export const RECHECK_STAGES = [
  { stage: 1, days: 30, items: 3 },
  { stage: 2, days: 90, items: 2 },
];

/** Items on a re-check. Small on purpose — see the header. */
export function itemCountForStage(stage) {
  return RECHECK_STAGES.find(s => s.stage === stage)?.items ?? 2;
}

/**
 * The next re-check due for a lesson, or null when the schedule is finished.
 * @param {object} row { verifiedAt, stage } — `stage` is the last COMPLETED stage.
 */
export function nextRecheck(row) {
  if (!row?.verifiedAt) return null;
  const done = row.stage || 0;
  const next = RECHECK_STAGES.find(s => s.stage > done);
  if (!next) return null;
  // A re-check that comes due while the lesson is already in needs-review is
  // pointless — the student is being routed back through the material anyway.
  return { stage: next.stage, dueAt: row.verifiedAt + next.days * DAY, items: next.items };
}

/** True when a lesson's next re-check has come due. */
export function isRecheckDue(row, now = Date.now()) {
  if (row?.needsReview) return false;
  const next = nextRecheck(row);
  return !!next && next.dueAt <= now;
}

/**
 * Every lesson whose re-check is due, soonest-overdue first.
 * @param {Array} rows verification rows
 */
export function dueRechecks(rows, now = Date.now()) {
  return (rows || [])
    .filter(r => isRecheckDue(r, now))
    .map(r => ({ ...r, ...nextRecheck(r) }))
    .sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * Pick the 2–3 items for a re-check.
 *
 * Priority order, and the reasoning for it:
 *   1. Items on concepts this student actually missed on the way to passing.
 *      Those are the shakiest parts of a pass and the most informative thing to
 *      re-ask.
 *   2. Applied items (data / scenario / next-step) over recall items, for the
 *      same reason the main draw prefers them: a maintenance check made of
 *      recall items measures maintenance of recall.
 *   3. Anything else in the bank they haven't seen recently.
 *
 * @param {object} bank        the quiz bank
 * @param {object} opts
 * @param {number} opts.count
 * @param {Set}    opts.recentStems  stems to avoid if there's an alternative
 * @param {Array}  opts.weakConcepts concept strings from quizRecovery
 * @param {(q:any)=>boolean} opts.isApplied
 */
export function pickRecheckItems(bank, { count = 2, recentStems = new Set(), weakConcepts = [], isApplied = () => false } = {}) {
  const qs = bank?.qs || [];
  if (!qs.length) return [];
  const weak = new Set(weakConcepts.map(c => String(c).toLowerCase()));
  const scoreOf = q => {
    let s = 0;
    if (q.concept && weak.has(String(q.concept).toLowerCase())) s += 4;
    if (isApplied(q)) s += 2;
    if (!recentStems.has(q.q)) s += 1;
    return s;
  };
  // Stable sort: equal-scoring items keep bank order, so the pick is
  // deterministic and a refresh mid-check doesn't reshuffle the questions.
  return [...qs]
    .map((q, i) => ({ q, i, s: scoreOf(q) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .slice(0, count)
    .map(x => x.q);
}

/**
 * Did a re-check hold? A 2–3 item check is too small for a percentage to be
 * meaningful, so the rule is stated in items: one miss out of three is a wobble
 * and the verification stands; anything worse routes the lesson back to
 * needs-review. On a two-item check, any miss is half the check.
 */
export function recheckHeld(correct, total) {
  if (total <= 0) return true;
  if (total >= 3) return correct >= total - 1;
  return correct === total;
}

/** The row update after a re-check, ready to write. */
export function applyRecheck(row, { stage, correct, total, missedConcepts = [] }) {
  const held = recheckHeld(correct, total);
  if (held) {
    return {
      ...row,
      stage,
      lastCheckAt: Date.now(),
      lastCheckHeld: 1,
      needsReview: false,
    };
  }
  return {
    ...row,
    stage,                     // the stage still counts as done — we don't loop
    lastCheckAt: Date.now(),
    lastCheckHeld: 0,
    needsReview: true,
    // Kept for the flashcard engine, which turns exactly these into cards. A
    // concept a student verified and then lost is the highest-value card the
    // engine will ever get: known to have been learnable, known to have faded.
    reviewConcepts: missedConcepts,
    reviewSince: Date.now(),
  };
}

/** A fresh row, written when a lesson is first verified. */
export function newVerificationRow(lessonId, { threshold = null, tier = 'foundation' } = {}) {
  return {
    lessonId,
    verifiedAt: Date.now(),
    stage: 0,
    threshold,
    tier,
    lastCheckAt: null,
    lastCheckHeld: null,
    needsReview: false,
    reviewConcepts: [],
  };
}

/** Quiet, non-accusatory copy for a lesson that slipped back to needs-review. */
export function needsReviewCopy(lessonTitle) {
  return {
    headline: 'Worth a refresher',
    body: `You verified "${lessonTitle}" a while back and a couple of pieces have gone quiet since. That's just how memory works — it's back on the list, and the cards for it are already in your deck.`,
  };
}

/** Human phrase for when the next check lands. */
export function recheckLabel(row, now = Date.now()) {
  const next = nextRecheck(row);
  if (!next) return 'Verified — no further checks scheduled';
  const days = Math.ceil((next.dueAt - now) / DAY);
  if (days <= 0) return `${next.items}-question check ready now`;
  if (days === 1) return `${next.items}-question check tomorrow`;
  if (days < 30) return `${next.items}-question check in ${days} days`;
  return `${next.items}-question check in ${Math.round(days / 30)} month${days >= 45 ? 's' : ''}`;
}
