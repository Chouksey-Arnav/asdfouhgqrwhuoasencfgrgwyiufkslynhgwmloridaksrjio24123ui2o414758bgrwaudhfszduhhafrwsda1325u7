// ─────────────────────────────────────────────────────────────────────────────
// Which landing page ships.
//
// There is more than one finished landing page in this repo, and only ever one
// of them is live. This file is the switch, and it is the ONLY place either
// version is chosen: AuthGate asks for `ActiveLandingPage` and does not know
// which component it got, so switching versions is a one-line change here and
// nothing else moves.
//
// ── The versions ─────────────────────────────────────────────────────────────
//
//   v1  src/components/LandingPage.jsx
//       The original. Theme-aware (light/dark via src/lib/theme.js), built from
//       the app's own design tokens, with the pathway/prep/portfolio/FAQ story.
//       Still in the tree, still compiling, deliberately NOT rendered.
//
//   v2  src/components/landing/v2/LandingPageV2.jsx          ← ACTIVE
//       The four-pillar page (Prep · Portfolio · Roadmap · Plans) with live
//       in-page demos of the diagnostic, Quiz Library, Medabrain, the Portfolio
//       tabs, the Roadmap spine and the day-by-day plan. Ported from a design
//       canvas document; see the header of that file.
//
// ── Retiring a version, and bringing one back ────────────────────────────────
//
// A version that stops being active does NOT get deleted. It stays here, it
// stays imported, and it keeps compiling — that is the whole point of keeping
// the registry: "put the old landing page back" has to be a one-line change
// that is provably the page that was live before, not a rebuild from memory.
//
// Because more than one version exists, "revert the landing page" is ambiguous
// on its own. Whoever is asked to revert should confirm WHICH version (1, 2, or
// a later one) is wanted before changing the constant below.
//
// To switch: change ACTIVE_LANDING_VERSION, and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

import LandingPageV1 from '../LandingPage';
import LandingPageV2 from './v2/LandingPageV2';

/**
 * Every landing page that has ever shipped, newest last.
 *
 * Each entry's component takes the same props — `onGetStarted`, `onLogin`,
 * `onOpenParents`, `onOpenLegal`, `themeMode`, `onThemeChange` — so they are
 * interchangeable at the call site. A version that cannot honour one of them
 * (v2 has no theme control) accepts and ignores it rather than changing the
 * contract.
 */
export const LANDING_VERSIONS = {
  1: {
    version: 1,
    label: 'v1 — original, theme-aware',
    component: LandingPageV1,
    source: 'src/components/LandingPage.jsx',
  },
  2: {
    version: 2,
    label: 'v2 — four pillars, live in-page demos',
    component: LandingPageV2,
    source: 'src/components/landing/v2/LandingPageV2.jsx',
  },
};

/** The version rendered to signed-out visitors. Change this to switch. */
export const ACTIVE_LANDING_VERSION = 2;

/** The active version's component. AuthGate renders this and nothing else. */
export const ActiveLandingPage = LANDING_VERSIONS[ACTIVE_LANDING_VERSION].component;

export default ActiveLandingPage;
