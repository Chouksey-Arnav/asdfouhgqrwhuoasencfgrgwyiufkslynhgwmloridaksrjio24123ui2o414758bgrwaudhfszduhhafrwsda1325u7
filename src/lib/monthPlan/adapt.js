// ─────────────────────────────────────────────────────────────────────────────
// What the plan DOES when a student tells it something.
//
// This is the half of the feature that makes the states worth having. A plan
// where "too expensive" is a checkbox that greys out a card has learned
// nothing; a plan where it immediately produces the funded alternative has
// turned an honest answer into a better plan, which is the only reason a
// student would ever give one.
//
// Every transformation here is PURE and SYNCHRONOUS. No model call, no network.
// The moment a student says something true about their constraints is the worst
// possible moment to show them a spinner, and rules.js already holds a ranked
// backlog exactly so the replacement is instant.
//
// ── The contract, state by state ────────────────────────────────────────────
//   complete            → the next level, plus an evidence-capture follow-on
//   in_progress         → nothing; just recorded
//   paused              → nothing added, nothing penalized; carried to next cycle
//   declined            → learn the preference, promote the next backlog item
//   not_interested      → same, and avoid the same domain for the rest of the cycle
//   too_difficult       → a genuine stepping stone toward the same goal
//   too_expensive       → a free/funded alternative, and cost preference learned
//   too_far_away        → a local/remote alternative, and travel preference learned
//   no_longer_eligible  → replaced immediately from the backlog
//   needs_help          → flagged, and the Medabrain context is preloaded
// ─────────────────────────────────────────────────────────────────────────────
import {
  setActionState, noteAdaptation, allActions, backlogActions, weekIndexFor,
} from './model.js';
import { steppingStoneFor, fundedAlternativeFor, localAlternativeFor, followOnFor } from './rules.js';
// The opportunity layer owns the write format for recommendation_feedback: the
// ref (`opportunity:<id>`), the note encoding that carries the exact button
// pressed, and the append-only rule its decay model depends on. The month plan
// writes THROUGH it rather than beside it — two writers with two formats would
// mean a refusal recorded on a roadmap card and one recorded on an opportunity
// card were two different facts about the same program.
import { feedbackRowFor as opportunityFeedbackRow, ACTION_BY_ID, ACTION_TO_STATUS } from '../opportunity/feedback.js';
import { MONTH_ACTION_TO_OPPORTUNITY_ACTION } from './model.js';
import { dayKey } from '../timeline.js';

/** Human wording for what the plan did, shown in the toast and in the history strip. */
export const ADAPTATION_COPY = {
  complete: 'Nice. Here is what that unlocks.',
  in_progress: 'Marked as started.',
  paused: 'Paused. It will come back next month, and it does not count against you.',
  declined: 'Noted — we will stop suggesting things like this.',
  not_interested: 'Noted. We will aim somewhere else.',
  too_difficult: 'Fair. Here is a smaller first step.',
  too_expensive: 'Understood. Here is a version that costs nothing.',
  too_far_away: 'Understood. Here is something you can do from where you are.',
  no_longer_eligible: 'Replaced with something you can actually do.',
  needs_help: 'Opening Medabrain with this one loaded.',
};

const nextRankAfter = (plan) => allActions(plan).length + 1;

/**
 * Apply a state change and everything that follows from it.
 *
 * @returns {{ plan, added: object[], removed: string[], focus: object|null, message: string }}
 *   `focus` is set only for 'needs_help', and is the action the caller should
 *   open Medabrain against.
 */
export function applyActionState(plan, actionId, status, { note = '', signals = null, today = dayKey() } = {}) {
  const before = allActions(plan).find((a) => a.id === actionId);
  if (!before) return { plan, added: [], removed: [], focus: null, message: '' };

  let next = setActionState(plan, actionId, status, note);
  const added = [];
  const week = weekIndexFor(next, today) ?? 0;

  const place = (action, bump = 0) => ({
    ...action,
    weekIndex: Math.min(3, week + bump),
    rank: nextRankAfter(next),
    followOnOf: actionId,
    status: 'not_started',
  });

  if (status === 'complete') {
    const follow = followOnFor(before, signals || {});
    if (follow && !hasEquivalent(next, follow)) added.push(place(follow));
  }

  if (status === 'too_difficult') {
    const stone = steppingStoneFor(before, signals || {});
    if (stone && !hasEquivalent(next, stone)) added.push(place(stone));
  }

  if (status === 'too_expensive') {
    const alt = fundedAlternativeFor(before, signals || {});
    if (alt && !hasEquivalent(next, alt)) added.push(place(alt));
  }

  if (status === 'too_far_away') {
    const alt = localAlternativeFor(before, signals || {});
    if (alt && !hasEquivalent(next, alt)) added.push(place(alt));
  }

  // A refusal or a lost eligibility leaves a hole, and a hole is what makes a
  // plan feel like it has given up on you. The backlog fills it immediately,
  // preferring something from a DIFFERENT domain for 'not_interested' (they
  // told us the category was wrong, not the item) and the same domain for
  // 'no_longer_eligible' (the category was right, the item was not).
  if (status === 'declined' || status === 'not_interested' || status === 'no_longer_eligible') {
    const preferSameDomain = status === 'no_longer_eligible';
    const replacement = pickReplacement(next, before, preferSameDomain);
    if (replacement) {
      added.push({ ...replacement, weekIndex: Math.min(3, week), rank: nextRankAfter(next), replacedId: actionId, status: 'not_started' });
      next = { ...next, backlog: backlogActions(next).filter((b) => b.id !== replacement.id) };
    }
  }

  if (added.length) {
    next = { ...next, actions: [...allActions(next), ...added] };
  }

  next = noteAdaptation(next, {
    actionId,
    title: before.title,
    status,
    note: note ? String(note).slice(0, 200) : null,
    added: added.map((a) => a.title),
  });

  return {
    plan: next,
    added,
    removed: [],
    focus: status === 'needs_help' ? { ...before, status } : null,
    message: ADAPTATION_COPY[status] || 'Noted.',
  };
}

/** True when the plan already carries something with the same rule and link — avoids duplicates. */
function hasEquivalent(plan, action) {
  return allActions(plan).some((a) => a.source === action.source && a.link?.ref === action.link?.ref);
}

/**
 * The best backlog item to put in the hole a refusal left.
 *
 * Never returns something the student has already refused (the backlog was
 * filtered at build time) and never returns a duplicate of something live.
 */
export function pickReplacement(plan, refused, preferSameDomain = false) {
  const live = new Set(allActions(plan).map((a) => `${a.source}|${a.link?.ref || ''}`));
  const pool = backlogActions(plan).filter((b) => !live.has(`${b.source}|${b.link?.ref || ''}`));
  if (!pool.length) return null;
  const sameDomain = pool.filter((b) => b.domain === refused.domain);
  const otherDomain = pool.filter((b) => b.domain !== refused.domain);
  const ordered = preferSameDomain ? [...sameDomain, ...otherDomain] : [...otherDomain, ...sameDomain];
  return ordered[0] || null;
}

/**
 * Re-rank an existing plan against fresh signals without rebuilding it.
 *
 * This is what a weekly check-in triggers: the student's own words have just
 * changed what matters, and the honest response is to reorder what they are
 * looking at — not to throw away the actions they are halfway through.
 * Completed and in-progress work keeps its place; everything else re-sorts by
 * urgency and by whatever the check-in surfaced.
 */
export function reprioritize(plan, signals, { today = dayKey() } = {}) {
  const strained = !!(signals?.wellbeing?.strained || signals?.academics?.falling);
  const scored = allActions(plan).map((a) => {
    let score = 100 - (a.rank || 50);
    if (a.status === 'in_progress') score += 40;
    if (a.status === 'needs_help') score += 30;
    if (a.priority === 'critical') score += 60;
    if (a.priority === 'high') score += 25;
    if (a.timing?.dueDate) {
      const d = Math.max(0, Math.min(60, Number(a.timing.dueDate ? dayDiff(today, a.timing.dueDate) : 60)));
      score += (60 - d) / 2;
    }
    // When they have told us they are stretched, the actions that FREE time
    // rise and the ones that spend it fall. This is the check-in's teeth.
    if (strained) {
      if (['wellbeing', 'academics'].includes(a.domain)) score += 45;
      else score -= a.effortHours * 2;
    }
    return { a, score };
  });
  const ranked = scored
    .sort((x, y) => y.score - x.score)
    .map(({ a }, i) => ({ ...a, rank: i + 1 }));
  return noteAdaptation({ ...plan, actions: ranked, updatedAt: Date.now() }, {
    kind: 'reprioritized',
    reason: strained ? 'You said the load is heavy, so the lighter and more protective work moved up.' : 'Re-ranked against your latest check-in.',
  });
}

const dayDiff = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b - a) / 86400000);
};

/**
 * The row for one action state, in the opportunity layer's format.
 *
 * Exported and pure so scripts/verifyMonthPlan.mjs can assert that both
 * features write rows the other can read back.
 */
export function feedbackRowForAction(action, status, note = '') {
  const opportunityAction = MONTH_ACTION_TO_OPPORTUNITY_ACTION[status];
  if (!opportunityAction || !ACTION_BY_ID[opportunityAction]) return null;

  // Opportunity-linked: hand it to the layer that owns the format.
  if (action?.link?.kind === 'opportunity' && action.link.ref) {
    const id = String(action.link.ref).replace(/^opportunity:/, '');
    const built = opportunityFeedbackRow(
      { id, name: action.link.label || action.title },
      opportunityAction,
      // The category is what the layer's "lessons" generalize over (a student who
      // declines three research programs has told us about research, not about
      // three programs), so it is passed explicitly exactly as recordAction()
      // does — omitting it would make a month-plan refusal teach less than the
      // identical refusal made one tab over.
      { note, category: action.link.category || null },
    );
    if (built) return built;
  }

  // Everything else, in the same shape so one reader can decode both.
  return {
    item_label: String(action?.title || '').slice(0, 200),
    item_ref: action?.link?.ref || `month-action:${action?.source || 'unknown'}`,
      status: ACTION_TO_STATUS[opportunityAction] || 'in_progress',
    note: [`action:${opportunityAction}`, `domain:${action?.domain || 'portfolio'}`, String(note || '').trim().slice(0, 400)]
      .filter(Boolean).join(' | '),
    source: 'student_entered',
  };
}
