// Which pillars are finished enough to ship.
//
// The SAT pillar is complete as code (src/components/sat/, src/lib/sat/,
// src/data/sat/) but is NOT part of version one: the question bank, the
// adaptive form logic and the score scales all need another pass before a
// student's score estimate is something we are willing to stand behind.
//
// Rather than delete a working pillar, v1 ships it sealed. The tab is still in
// the nav and the real panels still render behind the seal — a student can see
// the shape of what is coming — but the whole surface is blurred, inert and
// unreachable by keyboard (see SatBetaCover.jsx).
//
// Everything OUTSIDE the tab treats SAT as if it does not exist: no SAT quests,
// no SAT streak actions, no SAT achievements, no SAT plan tasks, no SAT unlocks
// and no SAT copy in onboarding or marketing. A student cannot do SAT work, so
// nothing anywhere else may ask them to, count it, or promise it.
//
// Flipping SAT_ENABLED to true is the whole launch switch for the pillar's
// tab; the surrounding integrations were removed rather than flagged, and come
// back with the pillar when it ships for real.
export const SAT_ENABLED = false;

/** True while the SAT tab renders behind the beta seal. */
export const SAT_IN_BETA = !SAT_ENABLED;
