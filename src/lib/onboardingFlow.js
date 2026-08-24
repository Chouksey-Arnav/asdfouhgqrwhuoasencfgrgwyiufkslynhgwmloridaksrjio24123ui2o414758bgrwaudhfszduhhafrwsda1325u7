// ─────────────────────────────────────────────────────────────────────────────
// THREE ONBOARDING FLOWS, ONE PER GRADE BAND.
//
// ── The problem ──────────────────────────────────────────────────────────────
// One onboarding flow ended with every student — ninth grader and senior alike
// — deposited at the top of a foundations-upward lesson track. For the ninth
// grader that is exactly right. For the senior it is a reason to leave: their
// actual problem this week is a November 1 deadline, and an app that opens on
// "Unit 1: What doctors actually do" has told them, in the first ten seconds,
// that it does not know what season it is.
//
// So the last third of onboarding branches. The questions that are worth
// asking differ by band, and — much more importantly — WHERE THE STUDENT LANDS
// differs by band:
//
//   explore (9–10)  → diagnostic → pathway → what science are you taking →
//                     your weekly goal → the LESSON TRACK.
//                     Portfolio stays in the nav the whole time, in preview.
//   build (11)      → diagnostic → pathway → when are you taking the SAT/ACT →
//                     weekly goal → the PORTFOLIO, opened on a pre-populated
//                     junior-year timeline.
//   apply (12)      → offer to SKIP the diagnostic → confirm pathway →
//                     deadline triage (early applications? combined-degree or
//                     direct-admit programs?) → the PORTFOLIO, opened on
//                     populated deadlines. Lessons go secondary.
//
// ── Two rules this file exists to keep ───────────────────────────────────────
// 1. Branching decides ORDER AND EMPHASIS, never access. Every flow ends with
//    every pillar in the nav; the ones that are not this band's focus render in
//    preview state (see BandPreview.jsx), not hidden and not locked. A senior
//    still has the full lesson track one tap away — it is simply not what the
//    app opens on.
// 2. Nothing here can strand a student. Every step declares whether it can be
//    skipped and what happens if it is, and the whole flow is resumable —
//    progress is persisted on every answer (see Onboarding.jsx's draft store).
//
// Pure data and pure functions, so scripts/verifyGradeBand.mjs can assert the
// shape of all three flows without a bundler.
// ─────────────────────────────────────────────────────────────────────────────

import { BAND_BY_ID } from './gradeBand.js';

// ── The band-specific tail of the onboarding flow ────────────────────────────
// The head (why medicine → graduation year → academics → rhythm → goal) is the
// same for everyone: those answers are worth having at every age. These are
// the steps after it.
//
// `key` matches a case in Onboarding.jsx's switch. `question: true` means it
// counts toward the "3 more to go" counter (see chapters.js).
export const BAND_FLOWS = {
  explore: {
    band: 'explore',
    headline: 'You have four years. Let’s spend the first one finding out what fits.',
    steps: [
      { key: 'scienceClass', question: true },
      { key: 'weeklyGoal', question: true },
    ],
    // Where completeOnboarding() sends them, and what the diagnostic is for.
    diagnostic: 'required',        // offered up front, skippable via the pathway shortcut
    landing: { tab: 'prep', view: 'diagnostic' },
    // Where they end up once the diagnostic is done or skipped.
    afterDiagnostic: { tab: 'prep', view: 'pathways' },
    // Pillars that stay in the nav in preview state rather than being the focus.
    previewPillars: ['portfolio'],
    focusCopy: 'Your lesson track is the main thing. Your portfolio is in the nav whenever you want to look ahead.',
  },
  build: {
    band: 'build',
    headline: 'Junior year is the one that builds the application. Let’s set it up.',
    steps: [
      { key: 'testingPlan', question: true },
      { key: 'weeklyGoal', question: true },
    ],
    diagnostic: 'required',
    landing: { tab: 'prep', view: 'diagnostic' },
    // The payoff: the portfolio opens on a junior-year timeline that is
    // already populated, rather than on an empty screen asking them to type.
    afterDiagnostic: { tab: 'portfolio', view: 'milestones' },
    previewPillars: [],
    focusCopy: 'Your portfolio opens on a junior-year timeline we have already filled in. Lessons run alongside it.',
  },
  apply: {
    band: 'apply',
    headline: 'You are in application season. Deadlines first, everything else second.',
    steps: [
      { key: 'deadlineTriage', question: true },
    ],
    // A senior does not owe us six minutes of career quiz before they can see
    // their deadlines. It is offered, and skipping is the default-looking path.
    diagnostic: 'offered',
    landing: { tab: 'portfolio', view: 'milestones' },
    afterDiagnostic: { tab: 'portfolio', view: 'milestones' },
    previewPillars: ['prep'],
    focusCopy: 'Your portfolio opens first, with your deadlines already on it. Lessons are still there, one tap away.',
  },
};

/** The flow for a band, defaulting to explore for a student we can't place. */
export function flowForBand(band) {
  return BAND_FLOWS[band] || BAND_FLOWS.explore;
}

/** The band-specific step keys, in order. */
export function bandStepKeys(band) {
  return flowForBand(band).steps.map(s => s.key);
}

/** The tab/view a freshly onboarded student of this band lands on. */
export function landingFor(band, { skippedDiagnostic = false } = {}) {
  const flow = flowForBand(band);
  return skippedDiagnostic ? flow.afterDiagnostic : flow.landing;
}

/** One line describing what this band's app opens on — shown on the last
 *  onboarding screen so the handoff is never a surprise. */
export function focusCopyFor(band) {
  const flow = flowForBand(band);
  return { headline: flow.headline, body: flow.focusCopy, label: BAND_BY_ID[flow.band]?.label || null };
}

// ── "I already know my pathway" ──────────────────────────────────────────────
//
// A real share of juniors, seniors, and students from healthcare families walk
// in already knowing. Making them sit through a six-minute diagnostic to prove
// it is friction charged before they have seen any value, and the diagnostic is
// the single longest thing between signup and the app.
//
// So the skip is VISIBLE on the diagnostic itself — not buried, not a "no
// thanks" in small gray text — and it goes straight to picking a pathway.
// The diagnostic is then re-offered later as optional, with the framing that
// is actually true and actually persuasive: students who take it often find a
// SECOND pathway worth a look. That is an invitation, not a nag, so it is
// offered once and then lives permanently on the Pathways screen.
export const PATHWAY_SKIP_LABEL = 'I already know my pathway';
export const DIAGNOSTIC_REOFFER = {
  title: 'Still worth six minutes?',
  body: 'Students who take the diagnostic often find a second pathway worth a look — one they had not considered and score just as well on. You can keep the pathway you picked either way.',
  cta: 'Take the diagnostic',
  dismiss: 'Not now',
};

/** True when we should re-offer the diagnostic: they skipped it, they have
 *  been using the app since, and we have not already asked. */
export function shouldReofferDiagnostic(user, { studyActions = 0 } = {}) {
  if (!user || user.diagnosticResult) return false;
  if (!user.skippedDiagnostic) return false;
  if (user.diagnosticReoffered) return false;
  return studyActions >= 3;
}

// ── Coming back after a break ────────────────────────────────────────────────
//
// Usage here is extremely seasonal: it collapses during finals and again in
// mid-summer, and a student who has been gone three weeks does not come back
// to the same app they left. Dropping them into the middle of a lesson
// sequence — the exact screen they abandoned — is the worst available option:
// it has no answer to the only two questions they actually have, which are
// "what did I miss" and "what is due".
//
// So: 21 days or more away earns a screen of its own. Not a modal to dismiss —
// a landing screen with what changed and what is due, and one button into the
// most urgent real thing.
export const BREAK_DAYS = 21;

/** Days since this student was last active, or null if we have never seen them. */
export function daysAway(user, now = new Date()) {
  const last = Number(user?.lastActive);
  if (!Number.isFinite(last) || last <= 0) return null;
  return Math.floor((now.getTime() - last) / 86400000);
}

/**
 * Should the return screen be shown this session?
 *
 * Deliberately NOT once-per-break-forever: it is keyed to the break itself
 * (`welcomeBackShownFor`), so a student who comes back, reads it, and leaves
 * again for another month gets it again — while one who reads it and keeps
 * using the app that week never sees it twice.
 */
export function shouldShowReturnScreen(user, now = new Date()) {
  const away = daysAway(user, now);
  if (away == null || away < BREAK_DAYS) return false;
  const shownFor = Number(user?.welcomeBackShownFor);
  // `lastActive` is the timestamp of the visit BEFORE this one, so it is a
  // stable id for this particular break.
  return !Number.isFinite(shownFor) || shownFor !== Number(user.lastActive);
}

/** How to describe the gap, in the student's terms rather than in days. */
export function breakLabel(days) {
  if (days == null) return '';
  if (days < 35) return `${Math.round(days / 7)} weeks`;
  const months = Math.round(days / 30);
  return months >= 12 ? 'over a year' : `${months} month${months === 1 ? '' : 's'}`;
}
