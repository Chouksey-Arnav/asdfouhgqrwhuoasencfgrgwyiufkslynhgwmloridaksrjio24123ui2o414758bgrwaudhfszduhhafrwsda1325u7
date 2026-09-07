// ─────────────────────────────────────────────────────────────────────────────
// The hooks a future YEARLY plan hangs off — declared now, deliberately, and
// enforced by scripts/verifyMonthPlan.mjs so they cannot quietly rot.
//
// ── Why this file exists before the feature does ────────────────────────────
// The same argument src/lib/entitlements.js makes about billing: retro-fitting
// a longer horizon means finding every place that assumed a month, and the ones
// you miss are the ones that break. So the month plan is built from the start
// as ONE CYCLE of a document that can have twelve, and the seams are named
// here rather than discovered later.
//
// ── What is real today ──────────────────────────────────────────────────────
// Everything in this file is inert. `defaultHorizon()` returns 'month', nothing
// reads a plan tier to decide what to render, and NOTHING IN THE APP IS GATED
// BY ANY OF IT. The monthly roadmap is the free experience and is complete on
// its own terms — there is no blurred panel, no locked card and no upsell in
// the month plan, and there must not be one added here by accident.
//
// ── What a yearly plan would add, and where it plugs in ─────────────────────
//   1. TWELVE CYCLES, NOT ONE. The document already carries `horizon`,
//      `cycleIndex` and `previousCycle`. A yearly plan is the same shape with
//      `horizon: 'year'` and a `cycles[]` array of month plans, so every UI
//      surface that renders one cycle renders a yearly plan's current cycle
//      with no change.
//   2. MONTHLY REFRESHES. refreshMonthPlan() already carries paused actions
//      forward and records what the previous cycle produced. A yearly plan
//      calls it on a schedule instead of on a button.
//   3. DEEPER OPPORTUNITY RESEARCH. readOpportunities() in signals.js returns
//      the full evaluated catalog, of which the month plan surfaces a slice.
//      OPPORTUNITY_DEPTH below names the levels; nothing consumes it yet.
//   4. LONGER MILESTONE VISIBILITY. The twelve-month roadmap (src/lib/roadmap/)
//      already models seasons and dated milestones. YEARLY_BRIDGE names the
//      exact functions a yearly plan would compose the two through, so the two
//      artifacts converge rather than fork.
// ─────────────────────────────────────────────────────────────────────────────

/** The horizons a plan document can cover. 'month' is the only one built today. */
export const PLAN_HORIZONS = ['month', 'quarter', 'year'];

/** How many four-week cycles each horizon spans. */
export const CYCLES_PER_HORIZON = { month: 1, quarter: 3, year: 12 };

/** Today, always 'month'. The single line that changes when the yearly plan ships. */
export function defaultHorizon() {
  return 'month';
}

/**
 * What each horizon is FOR, in the words a student would be shown.
 *
 * Kept here rather than in a component so the month plan's own copy and any
 * future comparison screen cannot describe the same thing two ways.
 */
export const HORIZON_COPY = {
  month: {
    label: 'This month',
    blurb: 'One objective, a ranked set of actions with a definition of done on each, four weeks with a shape, and the deadlines that are actually live.',
  },
  quarter: {
    label: 'This term',
    blurb: 'Three cycles, so a project that needs longer than four weeks can be planned as one thing rather than three.',
  },
  year: {
    label: 'The year ahead',
    blurb: 'Twelve cycles with a strategy over the top, refreshed monthly, with deeper research into the programs worth a year of preparation and milestones visible far enough ahead to prepare for.',
  },
};

/** Depth levels for opportunity research. The month plan runs at 'shortlist'. */
export const OPPORTUNITY_DEPTH = ['shortlist', 'researched', 'deep'];

/**
 * The named seams between a month plan, the twelve-month roadmap, and a future
 * yearly plan. Every entry is a real exported function today — the verify
 * script asserts each one still exists, which is what stops this from becoming
 * a comment describing an architecture nobody kept.
 */
export const YEARLY_BRIDGE = {
  // Reading the student — identical inputs at any horizon.
  signals: 'src/lib/monthPlan/signals.js#buildMonthSignals',
  // Candidate generation — a yearly plan runs the same rules per cycle.
  rules: 'src/lib/monthPlan/rules.js#buildCandidates',
  // Cycle rollover, already carrying paused work forward.
  refresh: 'src/lib/monthPlan/generator.js#refreshMonthPlan',
  // The existing twelve-month milestone artifact a yearly plan composes with.
  roadmapModel: 'src/lib/roadmap/model.js#nextActions',
  roadmapSeasons: 'src/lib/roadmap/model.js#currentSeason',
  // The compact prompt digests, so a yearly plan reaches Medabrain the same way.
  monthDigest: 'src/lib/monthPlan/context.js#summarizeMonthPlanForPrompt',
  roadmapDigest: 'src/lib/roadmap/model.js#summarizeRoadmapForPrompt',
};

/**
 * The seed a yearly plan would be built from, extracted from a finished month.
 *
 * Returns plain data only — no functions, no live references — so it can be
 * persisted, sent, or diffed. Unused today; exercised by the verify script so
 * it cannot drift away from the document shape it reads.
 */
export function monthPlanToYearlySeed(plan, signals = null) {
  if (!plan) return null;
  return {
    horizon: 'year',
    fromCycle: { id: plan.id, cycleStart: plan.cycleStart, cycleIndex: plan.cycleIndex || 0 },
    gradeStage: plan.gradeStage || null,
    graduationYear: plan.graduationYear || null,
    ambitionTier: plan.direction?.ambitionTier || null,
    focusSchools: plan.direction?.focusSchools || [],
    // What the student has already refused, so a yearly plan never re-opens a
    // decision they have made once.
    suppressed: signals?.feedback?.suppressedLabels || [],
    carryForward: (plan.actions || []).filter((a) => a.status === 'paused').map((a) => a.id),
    servicePace: plan.servicePlan ? { total: plan.servicePlan.total, monthlyRate: plan.servicePlan.monthlyRate, targetHours: plan.servicePlan.targetHours } : null,
    leadershipStage: plan.leadershipPath?.stage || null,
    openRisks: (plan.risks || []).map((r) => r.id),
  };
}
