// Keeps the per-page SEO tags honest now that the app has real URLs.
//
// index.html ships one hard-coded canonical (https://medschoolprep.cloud/) because
// that used to be the only URL in existence. It isn't any more: the address bar now
// says /portfolio/essays or /login, and leaving a blanket canonical in place would
// claim every one of those is the landing page.
//
// The rule is simple and matches robots.txt (both are generated from, or mirror,
// the same route facts):
//
//   • A public, crawlable path (/, /login, /signup) → canonical to itself.
//   • Anything behind sign-in → noindex, and canonical back to the landing page.
//     A crawler that reaches one of these sees the landing page (no session), so
//     the alternative is a pile of duplicate URLs competing with the real one.
//
// Only matters for crawlers that execute JS (Google does) — but it costs one DOM
// write per navigation and removes the one thing that would actively hurt ranking.

import { normalizePath } from './routes';

const ORIGIN = 'https://medschoolprep.cloud';

/** Paths a search engine is welcome to index. Mirrors ROUTES in scripts/generateSitemap.mjs. */
const INDEXABLE = new Set(['/', '/login', '/signup']);

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Point the canonical + robots meta at the truth for `pathname`.
 * @param {string} pathname
 */
export function applySeoMeta(pathname) {
  if (typeof document === 'undefined') return;
  const path = normalizePath(pathname);
  const indexable = INDEXABLE.has(path);

  const canonical = upsert('link[rel="canonical"]', () => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    return link;
  });
  canonical.setAttribute('href', `${ORIGIN}${indexable && path !== '/' ? path : '/'}`);

  const robots = upsert('meta[name="robots"]', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    return meta;
  });
  robots.setAttribute('content', indexable ? 'index, follow' : 'noindex, follow');

  const ogUrl = document.head.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', `${ORIGIN}${indexable && path !== '/' ? path : '/'}`);
}
