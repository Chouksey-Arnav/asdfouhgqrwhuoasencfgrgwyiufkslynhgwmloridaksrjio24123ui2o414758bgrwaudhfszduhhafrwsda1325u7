#!/usr/bin/env node
/**
 * Generates public/sitemap.xml (and keeps robots.txt's Sitemap line honest).
 *
 * Why a generator instead of a hand-written file: `lastmod` is the one field in
 * a sitemap that is worth getting right — Google uses it to decide whether a
 * re-crawl is worth its time, and a stale or obviously-fabricated date gets the
 * whole signal ignored. So each route declares which source files actually
 * render it, and lastmod comes from the newest git commit touching them.
 *
 * ── A note on why this file lists exactly one URL ──────────────────────────
 *
 * MedSchoolPrep is a single-page app with no client-side router: there is no
 * history.pushState, no hash routing, no ?tab= parsing anywhere in src/. The
 * landing page is the only thing a signed-out crawler can reach; every other
 * surface (Prep, SAT, Portfolio, Plans, Progress, Settings) is React state
 * behind AuthGate and has no URL of its own.
 *
 * vercel.json rewrites everything to index.html, so a URL like /sat would
 * return 200 with the *landing page* in it. Listing such paths here would hand
 * Google a set of duplicate pages and burn crawl budget — worse than listing
 * nothing. One accurate URL beats twelve fictional ones.
 *
 * When real routes land, add them to ROUTES below and they flow into the
 * sitemap on the next build.
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
];

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

const outPath = path.join(ROOT, 'public', 'sitemap.xml');
const xml = buildSitemap(ROUTES);
writeFileSync(outPath, xml, 'utf8');
console.log(
  `sitemap: wrote ${path.relative(ROOT, outPath)} — ${ROUTES.length} URL${ROUTES.length === 1 ? '' : 's'} at ${ORIGIN}`,
);
