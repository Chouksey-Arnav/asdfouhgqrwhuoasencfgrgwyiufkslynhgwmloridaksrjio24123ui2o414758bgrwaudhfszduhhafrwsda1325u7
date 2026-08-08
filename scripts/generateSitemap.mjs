#!/usr/bin/env node
/**
 * Generates public/sitemap.xml AND public/robots.txt from one route table, at build
 * time (`npm run build` runs `npm run sitemap` first).
 *
 * Why a generator instead of two hand-written files: they have to agree with each
 * other and with the app's real routes, and hand-edited copies drift. Here the
 * Sitemap: line in robots.txt is emitted from the same ORIGIN constant the <loc>s
 * are, and `lastmod` — the one sitemap field worth getting right, since Google uses
 * it to decide whether a re-crawl is worth its time — comes from the newest git
 * commit touching the files that actually render each route.
 *
 * ── Which URLs belong in here ─────────────────────────────────────────────────
 *
 * The app now has real client-side routes (/sat/practice, /portfolio/essays, …) —
 * see src/lib/routes.js. They are still NOT sitemap material, and adding them
 * would make the sitemap worse, not better:
 *
 *   Everything behind those URLs is gated on sign-in. A crawler fetching
 *   /portfolio/essays gets index.html (vercel.json rewrites all app paths to it),
 *   the app finds no session, and it renders the landing page. Listing them would
 *   hand Google a dozen URLs that all resolve to the same page — textbook
 *   duplicate content, and it burns crawl budget that should go to the real one.
 *
 * So the sitemap lists exactly the URLs a signed-out visitor can actually reach a
 * distinct page at: the landing page and the two account screens. The app routes
 * are handled the honest way instead — Disallow-ed in the robots.txt emitted
 * below, and marked noindex client-side (see applySeoMeta in src/lib/seo.js).
 *
 * When a genuinely public, crawlable page lands (a blog, public scholarship pages),
 * add it to ROUTES and it flows into both files on the next build.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Production origin. No trailing slash. */
const ORIGIN = process.env.SITE_ORIGIN || 'https://medschoolprep.cloud';

/**
 * @typedef {Object} Route
 * @property {string} loc        Path, rooted (must start with '/').
 * @property {string} changefreq Crawl hint: how often the content really moves.
 * @property {string} priority   Relative to this site only — not a global rank.
 * @property {string[]} sources  Files whose last commit date becomes <lastmod>.
 */
/** @type {Route[]} */
const ROUTES = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: '1.0',
    sources: [
      'index.html',
      'src/components/LandingPage.jsx',
      'src/components/AuthGate.jsx',
    ],
  },
  // The two account screens are addressable in their own right (src/lib/routes.js
  // AUTH_VIEWS) and render real, distinct UI to a signed-out visitor, so they are
  // legitimately crawlable — just far less important than the landing page.
  {
    loc: '/signup',
    changefreq: 'monthly',
    priority: '0.5',
    sources: ['src/components/auth/SignupView.jsx', 'src/components/auth/AuthShell.jsx'],
  },
  {
    loc: '/login',
    changefreq: 'monthly',
    priority: '0.3',
    sources: ['src/components/auth/LoginView.jsx', 'src/components/auth/AuthShell.jsx'],
  },
  // The legal documents are public by design (src/lib/routes.js LEGAL_VIEWS —
  // AuthGate renders them ahead of its signed-in/signed-out branch). They are
  // listed here because "where is your privacy policy" needs an answer that is
  // a plain, crawlable URL: ad networks, app stores, school districts and
  // regulators all check, and several of them check with a bot. `lastmod`
  // tracks the content modules rather than the renderer, so editing a clause
  // moves the date and re-rendering the page does not.
  {
    loc: '/legal/terms',
    changefreq: 'yearly',
    priority: '0.3',
    sources: ['src/legal/terms.js', 'src/legal/legalConfig.js'],
  },
  {
    loc: '/legal/privacy',
    changefreq: 'yearly',
    priority: '0.4',
    sources: ['src/legal/privacy.js', 'src/legal/legalConfig.js'],
  },
];

/**
 * Path prefixes that exist, work, and must not be indexed: every one of them is
 * behind sign-in, and a crawler that follows one just gets the landing page again.
 * Kept as prefixes (not the full route list) so new sub-tabs are covered the day
 * they ship without anyone remembering to come back here.
 */
const DISALLOW = ['/api/', '/sat', '/prep', '/portfolio', '/plans', '/progress', '/settings'];

/** Newest commit date across `files`, as YYYY-MM-DD. Null if git can't say. */
function gitLastModified(files) {
  const present = files.filter((f) => existsSync(path.join(ROOT, f)));
  if (!present.length) return null;
  let newest = null;
  for (const file of present) {
    try {
      const out = execFileSync(
        'git',
        ['log', '-1', '--format=%cs', '--', file],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim();
      if (out && (!newest || out > newest)) newest = out;
    } catch {
      // Shallow clone, no git in the image, or a file with no history yet —
      // fall through to the mtime fallback below.
    }
  }
  if (newest) return newest;
  // No git history available: mtime is a weaker but still truthful signal.
  const newestMtime = Math.max(
    ...present.map((f) => statSync(path.join(ROOT, f)).mtimeMs),
  );
  return new Date(newestMtime).toISOString().slice(0, 10);
}

function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemap(routes) {
  const entries = routes.map((route) => {
    if (!route.loc.startsWith('/')) {
      throw new Error(`Route loc must start with '/': ${route.loc}`);
    }
    const lastmod = gitLastModified(route.sources);
    const lines = [
      `    <loc>${xmlEscape(ORIGIN + route.loc)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
    ].filter(Boolean);
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobots(routes) {
  return [
    '# MedSchoolPrep — ' + ORIGIN,
    '#',
    '# Generated by scripts/generateSitemap.mjs — edit that, not this file.',
    '#',
    '# The crawlable surface is the landing page plus the two account screens (see',
    '# sitemap.xml). Everything else is a signed-in app route: it renders the landing',
    '# page to a crawler because there is no session, so indexing it would just create',
    '# duplicates of the URL we actually want ranked.',
    '',
    'User-agent: *',
    'Allow: /$',
    ...routes.filter((r) => r.loc !== '/').map((r) => `Allow: ${r.loc}`),
    ...DISALLOW.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
}

const sitemapPath = path.join(ROOT, 'public', 'sitemap.xml');
const robotsPath = path.join(ROOT, 'public', 'robots.txt');
const xml = buildSitemap(ROUTES);
writeFileSync(sitemapPath, xml, 'utf8');
writeFileSync(robotsPath, buildRobots(ROUTES), 'utf8');

// A sitemap that got written but is malformed is worse than none — search engines
// drop the whole file. Cheap sanity check rather than a real XML parser: every
// route made it in, and the document is closed.
for (const route of ROUTES) {
  if (!xml.includes(`<loc>${ORIGIN}${route.loc === '/' ? '/' : route.loc}</loc>`)) {
    throw new Error(`sitemap: route ${route.loc} did not make it into the output`);
  }
}
if (!xml.trimEnd().endsWith('</urlset>')) throw new Error('sitemap: output is truncated');

console.log(
  `sitemap: wrote ${path.relative(ROOT, sitemapPath)} + ${path.relative(ROOT, robotsPath)} — ${ROUTES.length} URL${ROUTES.length === 1 ? '' : 's'} at ${ORIGIN}`,
);
