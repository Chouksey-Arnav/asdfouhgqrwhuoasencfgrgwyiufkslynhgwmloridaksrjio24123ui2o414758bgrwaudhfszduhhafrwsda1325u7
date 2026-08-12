#!/usr/bin/env node
/**
 * The build guard for everything the August 2026 site audit found, so that none
 * of it can come back silently.
 *
 * It checks the three artefacts that have to agree — public/sitemap.xml,
 * public/robots.txt, and the prerendered HTML in dist/ — against the one route
 * table they are all generated from (src/lib/seoRoutes.js), and fails the build
 * when they don't. The specific failures it exists to prevent, each of which was
 * a real finding rather than a hypothetical:
 *
 *   • a sitemap URL whose page canonicalises somewhere else ("non-canonical page
 *     in sitemap" — 6 URLs, and the largest single bucket of errors)
 *   • a page with no outgoing internal links, and the landing page with no
 *     incoming ones — i.e. a link graph of isolated nodes
 *   • a page with no <h1>, or more than one
 *   • a description long enough to be truncated in the result snippet
 *   • two pages sharing a title or a description
 *   • robots.txt disallowing a URL that is in the sitemap, which is the one
 *     self-contradiction that makes a search engine ignore both files
 *
 * Runs after the prerender step. When dist/ is absent (someone running the
 * script on its own) the source-level checks still run and the dist ones are
 * skipped with a note, rather than passing vacuously.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  PUBLIC_ROUTES, DISALLOW, MAX_TITLE, MAX_DESCRIPTION, absoluteUrl,
} from '../src/lib/seoRoutes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const failures = [];
const fail = (msg) => failures.push(msg);
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. The route table itself ───────────────────────────────────────────────

const seenTitles = new Map();
const seenDescriptions = new Map();

for (const route of PUBLIC_ROUTES) {
  const at = `seoRoutes ${route.path}`;

  if (!route.path.startsWith('/')) fail(`${at}: path must start with '/'`);
  if (!route.title?.trim()) fail(`${at}: has no title`);
  if (!route.description?.trim()) fail(`${at}: has no description`);
  if (!route.navLabel?.trim()) fail(`${at}: has no navLabel — it cannot be linked to`);

  if (route.title.length > MAX_TITLE) {
    fail(`${at}: title is ${route.title.length} chars (max ${MAX_TITLE}) — it will be cut off in results`);
  }
  if (route.description.length > MAX_DESCRIPTION) {
    fail(`${at}: description is ${route.description.length} chars (max ${MAX_DESCRIPTION}) — the snippet will be truncated mid-sentence`);
  }

  // Duplicate titles and descriptions are how a site tells a search engine its
  // pages are interchangeable. They are reported as errors by every auditor.
  const priorTitle = seenTitles.get(route.title);
  if (priorTitle) fail(`${at}: shares its title with ${priorTitle}`);
  seenTitles.set(route.title, route.path);

  const priorDescription = seenDescriptions.get(route.description);
  if (priorDescription) fail(`${at}: shares its description with ${priorDescription}`);
  seenDescriptions.set(route.description, route.path);

  // Content, or a legal document to render in its place — one or the other.
  if (!route.legalSlug && !route.content?.h1) {
    fail(`${at}: has neither content.h1 nor legalSlug, so the prerendered page would have no <h1>`);
  }
  if (!route.sources?.length) fail(`${at}: has no sources, so <lastmod> cannot be computed`);
}

// A route that is both public and Disallow-ed is the contradiction that makes
// robots.txt and sitemap.xml cancel each other out.
for (const route of PUBLIC_ROUTES) {
  for (const prefix of DISALLOW) {
    if (route.path === prefix || route.path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) {
      fail(`seoRoutes: ${route.path} is in the sitemap and also Disallow-ed by "${prefix}"`);
    }
  }
}

// ── 2. index.html still has what the prerenderer needs ──────────────────────

const indexHtml = read('index.html');
if (!indexHtml.includes('<div id="seo-shell"></div>')) {
  fail('index.html: the <div id="seo-shell"></div> anchor is gone — prerenderSeo.mjs has nothing to inject the static content into, and every page would ship an empty body again');
}
if (!/analytics\.ahrefs\.com\/analytics\.js/.test(indexHtml)) {
  fail('index.html: the Ahrefs Web Analytics tag is missing');
}
if (!/<script[^>]*analytics\.ahrefs\.com[^>]*data-key="[^"]+"/.test(indexHtml)) {
  fail('index.html: the Ahrefs Web Analytics tag has no data-key — it will silently collect nothing');
}

if (/application\/ld\+json/.test(indexHtml)) {
  fail('index.html: carries its own JSON-LD. Structured data is owned by scripts/prerenderSeo.mjs, which strips and rewrites every ld+json block per URL — a hand-written one here would be silently deleted from the built pages');
}

const mainJsx = read('src/main.jsx');
if (!/#seo-shell/.test(mainJsx)) {
  fail('src/main.jsx: no longer removes #seo-shell before render — the static shell would be left in the DOM underneath the app');
}

// ── 3. sitemap.xml and robots.txt ───────────────────────────────────────────

const sitemap = read('public/sitemap.xml');
const robots = read('public/robots.txt');

for (const route of PUBLIC_ROUTES) {
  if (!sitemap.includes(`<loc>${absoluteUrl(route.path)}</loc>`)) {
    fail(`sitemap.xml: ${route.path} is missing — run \`npm run sitemap\``);
  }
  const allowLine = route.path === '/' ? 'Allow: /$' : `Allow: ${route.path}`;
  if (!robots.includes(allowLine)) fail(`robots.txt: missing "${allowLine}"`);
}

const locCount = (sitemap.match(/<loc>/g) || []).length;
if (locCount !== PUBLIC_ROUTES.length) {
  fail(`sitemap.xml: has ${locCount} URLs but the route table has ${PUBLIC_ROUTES.length} — the file is stale`);
}
for (const prefix of DISALLOW) {
  if (!robots.includes(`Disallow: ${prefix}`)) fail(`robots.txt: missing "Disallow: ${prefix}"`);
}

// ── 4. The prerendered output ───────────────────────────────────────────────

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.log('verify:seo — dist/ not built, skipping the prerendered-HTML checks');
} else {
  const manifestPath = path.join(DIST, 'prerender-manifest.json');
  if (!existsSync(manifestPath)) {
    fail('dist/prerender-manifest.json is missing — server.js would serve the generic shell for every URL');
  }

  for (const route of PUBLIC_ROUTES) {
    const rel =
      route.path === '/'
        ? 'dist/index.html'
        : path.join('dist', ...route.path.split('/').filter(Boolean), 'index.html');
    if (!existsSync(path.join(ROOT, rel))) {
      fail(`${rel} was not generated for ${route.path}`);
      continue;
    }
    const raw = read(rel);
    // The structural checks below count tags, and index.html's own comments
    // *talk about* tags ("replaced with that page's real <h1>…"). A commented-out
    // or merely mentioned tag is not a tag, so strip comments before counting —
    // otherwise the guard fails on its own documentation.
    const html = raw.replace(/<!--[\s\S]*?-->/g, '');
    const at = `${rel} (${route.path})`;
    const url = absoluteUrl(route.path);

    // The finding that mattered most: every one of these pages used to canonicalise to '/'.
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1];
    if (canonical !== url) {
      fail(`${at}: canonical is "${canonical}", expected "${url}" — a sitemap URL that canonicalises elsewhere is a non-canonical page in the sitemap`);
    }

    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (!title) fail(`${at}: has no <title>`);

    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1];
    if (!description) fail(`${at}: has no meta description`);
    else if (description.length > MAX_DESCRIPTION) {
      fail(`${at}: meta description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
    }

    if (!/<meta\s+name="robots"\s+content="index, follow"/.test(html)) {
      fail(`${at}: is not marked index,follow`);
    }

    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) fail(`${at}: has ${h1s} <h1> elements, expected exactly 1`);

    const ldBlocks = (html.match(/<script type="application\/ld\+json"/g) || []).length;
    if (ldBlocks !== 1) {
      fail(`${at}: has ${ldBlocks} JSON-LD blocks, expected exactly 1 — two @graphs on one page contradict each other`);
    }

    // Outgoing links, and — because every page links to every other — incoming
    // ones for all of them, the landing page included. This is the check that
    // covers "orphan page", "page has no outgoing links" and "canonical URL has
    // no incoming internal links" in one go.
    const links = new Set([...html.matchAll(/<a\s+href="(\/[^"#]*)"/g)].map((m) => m[1]));
    for (const other of PUBLIC_ROUTES) {
      if (other.path === route.path) continue;
      if (!links.has(other.path)) {
        fail(`${at}: does not link to ${other.path} — that page would be an orphan`);
      }
    }
    if (route.path !== '/' && !links.has('/')) {
      fail(`${at}: does not link back to "/" — the landing page would have no incoming internal links`);
    }

    // The app still has to boot on these URLs. If the module script were lost in
    // rewriting, every public page would be a static document and nothing else.
    if (!/<script type="module"[^>]*src="[^"]+"/.test(html)) {
      fail(`${at}: has no module script — the React app would never mount here`);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\nverify:seo — ${failures.length} problem${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(
  `verify:seo — OK: ${PUBLIC_ROUTES.length} public URLs, each with its own canonical, title, description, <h1> and internal links`,
);
