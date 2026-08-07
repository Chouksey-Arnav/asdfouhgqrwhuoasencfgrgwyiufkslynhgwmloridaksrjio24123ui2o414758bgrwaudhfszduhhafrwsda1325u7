// The single source of truth for "which screen is the student on" ⇄ "what is in
// the address bar".
//
// Until now the app kept its whole navigation state in React (`tab`, `prepView`,
// `satView`, …) mirrored into localStorage, and never touched the URL. Every
// screen was `medschoolprep.cloud/`, so the browser's back button had exactly
// one history entry to go back to: whatever the student was looking at *before
// the app*. Tapping back from Portfolio → Deadlines left the site entirely.
//
// This module makes the URL the thing history remembers. Nothing here touches
// React or the DOM — it is pure string ⇄ object translation, which is what makes
// it testable (scripts/verifyRouting.mjs) and what keeps the round-trip honest:
//
//     parsePath(formatPath(route)) deep-equals route     (for every valid route)
//     formatPath(parsePath(path))  === path              (for every canonical path)
//
// The hook that wires this to history lives in ./useAppRouter.js.

/** Top-level tabs, in nav order. Must match NAV in src/App.jsx. */
export const TABS = ['home', 'sat', 'prep', 'portfolio', 'plans', 'progress', 'settings'];

/**
 * Tabs that own a SubNav, and the sub-view ids that bar can select.
 *
 * `state` names the React state setter's variable in App.jsx purely for
 * documentation; `ids` MUST stay in lockstep with the *_SUBNAV arrays there —
 * `npm run verify:routing` fails the build if they drift, so a new sub-tab can
 * never quietly end up without a URL.
 */
export const SUBVIEWS = {
  sat: {
    state: 'satView',
    default: 'overview',
    ids: ['overview', 'baseline', 'diagnostic', 'practice', 'tests', 'review', 'skills', 'library', 'toolkit', 'scores'],
  },
  prep: {
    state: 'prepView',
    default: 'pathway',
    ids: ['diagnostic', 'pathway', 'quizzes', 'flashcards', 'coach', 'library'],
  },
  portfolio: {
    state: 'portfolioView',
    default: 'overview',
    ids: ['overview', 'tracked', 'milestones', 'colleges', 'essays', 'aid', 'resume', 'research', 'skills', 'clinical', 'recommenders', 'interview', 'calc'],
    // 'timeline' and 'deadlines' were two sibling tabs showing two halves of the
    // same calendar; they are now one tab, 'milestones'. Both old ids stay
    // parseable forever — they are in shared links, bookmarks, PWA start URLs,
    // and every history entry a returning student already has. They resolve to
    // the merged view and the router rewrites the address bar in place, so an
    // old link works and stops being an old link. Aliases never round-trip out
    // of formatPath(), which is what keeps exactly one canonical URL per screen.
    aliases: { timeline: 'milestones', deadlines: 'milestones' },
  },
  progress: {
    state: 'progressView',
    default: 'overview',
    ids: ['overview', 'verified', 'performance', 'achievements'],
  },
};

/**
 * The signed-out surfaces. These are real destinations (AuthGate renders a
 * different screen for each), so they get real URLs and real history entries —
 * back out of the login form and you land on the landing page, not on whatever
 * site you visited before ours.
 */
export const AUTH_VIEWS = { login: '/login', signup: '/signup', forgot: '/forgot-password', oauth: '/auth/callback' };
const AUTH_PATHS = Object.values(AUTH_VIEWS);

/**
 * Full-screen surfaces that sit *on top of* a tab: the lesson player and the
 * quiz runner. They replace the entire app shell, so without a URL of their own
 * the back button would swap the tab underneath while leaving the overlay
 * covering the screen — the single worst thing a back button can do.
 */
const OVERLAY_SEGMENTS = { lesson: 'lesson', quiz: 'quiz' };

/** The route the app falls back to when a URL means nothing to us. */
export const HOME_ROUTE = { tab: 'home', view: null, overlay: null };

function seg(value) {
  return encodeURIComponent(String(value));
}

function unseg(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

/**
 * The live sub-view id for `view` on `tab`: itself if it still exists, whatever
 * replaced it if it is a retired alias, otherwise null.
 *
 * Used for persisted state as well as URLs — a student whose last screen was
 * `/portfolio/deadlines` has that id sitting in localStorage, and without this
 * they would be silently dumped on the Portfolio overview on their next visit.
 */
export function resolveView(tab, view) {
  const sub = SUBVIEWS[tab];
  if (!sub || !view) return null;
  if (sub.ids.includes(view)) return view;
  return sub.aliases?.[view] || null;
}

/** Normalizes a pathname for comparison: no trailing slash, always leading one. */
export function normalizePath(pathname) {
  const p = String(pathname || '/').split('?')[0].split('#')[0];
  const trimmed = p.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? (trimmed || '/') : `/${trimmed}`;
}

/** True when `pathname` addresses one of the signed-out auth screens. */
export function isAuthPath(pathname) {
  return AUTH_PATHS.includes(normalizePath(pathname));
}

/** The auth view (`login`/`signup`/`forgot`) a path names, or null. */
export function parseAuthPath(pathname) {
  const p = normalizePath(pathname);
  return Object.keys(AUTH_VIEWS).find((view) => AUTH_VIEWS[view] === p) || null;
}

/**
 * Route → canonical path. Total: it never throws and never returns something
 * parsePath can't read back, so a malformed route degrades to a sane URL rather
 * than corrupting history.
 *
 * @param {{tab?:string, view?:string|null, overlay?:{kind:string,unitId?:string,lessonId?:string,quizId?:string}|null}} route
 * @returns {string}
 */
export function formatPath(route) {
  const tab = TABS.includes(route?.tab) ? route.tab : 'home';
  const parts = [];
  if (tab !== 'home') parts.push(tab);

  const sub = SUBVIEWS[tab];
  if (sub) parts.push(resolveView(tab, route?.view) || sub.default);

  const overlay = route?.overlay;
  if (overlay?.kind === 'lesson' && overlay.unitId && overlay.lessonId) {
    parts.push(OVERLAY_SEGMENTS.lesson, seg(overlay.unitId), seg(overlay.lessonId));
  } else if (overlay?.kind === 'quiz' && overlay.quizId) {
    parts.push(OVERLAY_SEGMENTS.quiz, seg(overlay.quizId));
  }

  return `/${parts.join('/')}`.replace(/\/+$/, '') || '/';
}

/**
 * Path → route, or null when the path isn't an app route (an auth screen, a
 * typo, a stale link, /sitemap.xml). Callers treat null as "keep whatever the
 * app already had and rewrite the URL in place" — see useAppRouter.
 *
 * @param {string} pathname
 * @returns {{tab:string, view:string|null, overlay:object|null}|null}
 */
export function parsePath(pathname) {
  const path = normalizePath(pathname);
  if (isAuthPath(path)) return null;

  const parts = path.split('/').filter(Boolean).map(unseg);
  if (!parts.length) return { ...HOME_ROUTE };

  const tab = parts[0];
  if (!TABS.includes(tab)) return null;

  let i = 1;
  let view = null;
  const sub = SUBVIEWS[tab];
  if (sub) {
    // `/sat` (no sub-view) is a legitimate hand-typed URL: accept it and let the
    // caller's replaceState normalize it to /sat/overview.
    if (parts[1] && sub.ids.includes(parts[1])) { view = parts[1]; i = 2; }
    // A retired sub-view id (see `aliases` above) resolves to whatever replaced
    // it. The route it produces is canonical, so useAppRouter's state→URL sync
    // finds the address bar disagreeing and replaces it — the student lands on
    // the right screen with the right URL and no extra history entry.
    else if (parts[1] && sub.aliases?.[parts[1]]) { view = sub.aliases[parts[1]]; i = 2; }
    else if (!parts[1]) { view = sub.default; i = 1; }
    else if (parts[1] === OVERLAY_SEGMENTS.lesson || parts[1] === OVERLAY_SEGMENTS.quiz) { view = sub.default; i = 1; }
    else return null; // /portfolio/nonsense — unknown, don't guess
  }

  let overlay = null;
  if (parts[i] === OVERLAY_SEGMENTS.lesson && parts[i + 1] && parts[i + 2]) {
    overlay = { kind: 'lesson', unitId: parts[i + 1], lessonId: parts[i + 2] };
    i += 3;
  } else if (parts[i] === OVERLAY_SEGMENTS.quiz && parts[i + 1]) {
    overlay = { kind: 'quiz', quizId: parts[i + 1] };
    i += 2;
  }
  if (parts.length > i) return null; // trailing junk — not a route we made

  return { tab, view, overlay };
}

/**
 * The route the app should boot into: the URL wins when it names a real screen
 * (so a shared/bookmarked link, a PWA cold start, or a reload after the back
 * button all land exactly where they should), and the last-persisted view state
 * is the fallback for a bare `/`.
 *
 * @param {object} persisted result of loadViewState()
 * @param {string} [pathname]
 */
export function bootRoute(persisted = {}, pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const fromUrl = parsePath(pathname);
  const base = {
    tab: TABS.includes(persisted.tab) ? persisted.tab : 'home',
    satView: SUBVIEWS.sat.ids.includes(persisted.satView) ? persisted.satView : SUBVIEWS.sat.default,
    prepView: SUBVIEWS.prep.ids.includes(persisted.prepView) ? persisted.prepView : SUBVIEWS.prep.default,
    portfolioView: resolveView('portfolio', persisted.portfolioView) || SUBVIEWS.portfolio.default,
    progressView: SUBVIEWS.progress.ids.includes(persisted.progressView) ? persisted.progressView : SUBVIEWS.progress.default,
    overlay: null,
  };

  // A bare "/" is ambiguous — it's both the Home tab and the URL every PWA cold
  // start opens on. Treat it as "no opinion" so `start_url: '/'` resumes the
  // student's last screen exactly like a reload always has, and only an explicit
  // deep link overrides the persisted state.
  if (!fromUrl || (fromUrl.tab === 'home' && normalizePath(pathname) === '/')) return base;

  const next = { ...base, tab: fromUrl.tab, overlay: fromUrl.overlay };
  const sub = SUBVIEWS[fromUrl.tab];
  if (sub && fromUrl.view) next[sub.state] = fromUrl.view;
  return next;
}

/**
 * The route object for a set of App state values — the inverse of bootRoute,
 * used every render to decide whether the address bar is still telling the
 * truth.
 */
export function routeFromState({ tab, satView, prepView, portfolioView, progressView, overlay = null }) {
  const views = { sat: satView, prep: prepView, portfolio: portfolioView, progress: progressView };
  return { tab, view: SUBVIEWS[tab] ? views[tab] : null, overlay };
}
