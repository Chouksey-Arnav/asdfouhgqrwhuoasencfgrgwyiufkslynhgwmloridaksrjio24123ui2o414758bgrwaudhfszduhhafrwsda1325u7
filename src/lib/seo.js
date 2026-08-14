// Keeps the per-page SEO tags honest once the app has taken over the address bar.
//
// ── What this file is now responsible for, and what it isn't ────────────────
//
// It used to be the *only* thing standing between this site and a canonical tag
// that claimed every URL was the landing page — index.html shipped one
// hard-coded `<link rel="canonical" href="…/">`, and this ran on mount to fix
// it up. That only ever worked for crawlers that execute JavaScript, which is a
// minority of them, and it is why an audit found six of seven sitemap URLs
// declaring themselves duplicates.
//
// That job now belongs to scripts/prerenderSeo.mjs, which bakes the right
// canonical, title and description into the HTML each URL is *served*. What is
// left for this module is the half a static file cannot do: the app is a SPA, so
// after the first navigation the address bar changes without a request, and the
// head has to follow it. Specifically:
//
//   • A public path (/, /login, /parents, /legal/*) → canonical to itself, its
//     own <title> and description, index/follow.
//   • Anything behind sign-in → noindex, and canonical back to the landing page.
//     A crawler that reaches one of these sees the landing page (no session), so
//     the alternative is a pile of duplicate URLs competing with the real one.
//
// The route facts live in ./seoRoutes.js, shared with the sitemap generator, the
// prerenderer and the build guard, so the served HTML and the client-side
// correction can no longer say different things about the same URL.

import { normalizePath } from './routes';
import { ORIGIN, INDEXABLE_PATHS, routeFor, absoluteUrl } from './seoRoutes';

/** Fallbacks for the signed-in surfaces, which are noindexed and have no entry. */
const APP_TITLE = 'MedSchoolPrep — Your Path Into Medicine';
const APP_DESCRIPTION =
  'Free health-career prep for high schoolers: a 10-pathway diagnostic, verified lessons, flashcards, and a full college application portfolio.';

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, name, content) {
  const el = upsert(`meta[${attr}="${name}"]`, () => {
    const meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    return meta;
  });
  el.setAttribute('content', content);
}

/**
 * Point the canonical, robots directive, title and social tags at the truth for
 * `pathname`.
 * @param {string} pathname
 */
export function applySeoMeta(pathname) {
  if (typeof document === 'undefined') return;
  const path = normalizePath(pathname);
  const indexable = INDEXABLE_PATHS.has(path);
  const route = indexable ? routeFor(path) : null;

  // A noindexed app route canonicalises to the landing page, which is what a
  // crawler would have been shown at that URL anyway.
  const url = route ? absoluteUrl(route.path) : `${ORIGIN}/`;
  const title = route ? route.title : APP_TITLE;
  const description = route ? route.description : APP_DESCRIPTION;

  const canonical = upsert('link[rel="canonical"]', () => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    return link;
  });
  canonical.setAttribute('href', url);

  setMeta('name', 'robots', indexable ? 'index, follow' : 'noindex, follow');
  setMeta('name', 'description', description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);

  // The title is the one tag here a human notices: it is the browser tab, the
  // bookmark name and the entry in the back-button's history list. Leaving it on
  // "Your Path Into Medicine" for every screen made all of them indistinguishable.
  if (document.title !== title) document.title = title;
}
