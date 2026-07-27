#!/usr/bin/env node
/**
 * Guards the two ways URL routing silently rots:
 *
 *   1. Someone adds a sub-tab to a *_SUBNAV array in App.jsx and forgets
 *      src/lib/routes.js, so the new tab has no URL — it works until you press
 *      back, which then skips it.
 *   2. The sitemap / robots.txt / SPA fallback stop agreeing about which paths
 *      are files, which app routes exist, and which of them are indexable —
 *      which is how a sitemap ends up "registered" but serving HTML.
 *
 * Pure static analysis + pure functions; no browser, no build. Run by
 * `npm run verify:routing`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const routes = await import(pathToFileURL(path.join(ROOT, 'src/lib/routes.js')).href);
const { TABS, SUBVIEWS, AUTH_VIEWS, formatPath, parsePath, bootRoute, normalizePath } = routes;

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function section(name) { console.log(`\n${name}`); }

// ── 1. routes.js matches the nav actually rendered in App.jsx ────────────────
section('Route table matches App.jsx');
const app = read('src/App.jsx');

function idsIn(constName) {
  const start = app.indexOf(`const ${constName} = [`);
  if (start === -1) return null;
  const end = app.indexOf('\n];', start);
  const block = app.slice(start, end);
  return [...block.matchAll(/\{id:'([^']+)'/g)].map((m) => m[1]);
}

const navIds = idsIn('NAV');
if (!navIds) fail('could not find NAV in src/App.jsx');
else if (navIds.join() !== TABS.join()) fail(`NAV ${JSON.stringify(navIds)} !== TABS ${JSON.stringify(TABS)}`);
else ok(`NAV matches TABS (${TABS.length} tabs)`);

for (const [tab, name] of [['sat', 'SAT_SUBNAV'], ['prep', 'PREP_SUBNAV'], ['portfolio', 'PORTFOLIO_SUBNAV'], ['progress', 'PROGRESS_SUBNAV']]) {
  const ids = idsIn(name);
  if (!ids) { fail(`could not find ${name} in src/App.jsx`); continue; }
  const known = SUBVIEWS[tab].ids;
  const missing = ids.filter((id) => !known.includes(id));
  const extra = known.filter((id) => !ids.includes(id));
  if (missing.length) fail(`${name}: ${missing.join(', ')} has no URL — add to SUBVIEWS.${tab}.ids in src/lib/routes.js`);
  if (extra.length) fail(`SUBVIEWS.${tab}.ids has ${extra.join(', ')}, which ${name} no longer renders`);
  if (!known.includes(SUBVIEWS[tab].default)) fail(`SUBVIEWS.${tab}.default is not one of its ids`);
  if (!missing.length && !extra.length) ok(`${name} matches SUBVIEWS.${tab} (${ids.length} sub-views)`);
}

// ── 2. Every route round-trips through the URL ───────────────────────────────
section('Route ⇄ URL round-trip');
const allRoutes = [];
for (const tab of TABS) {
  if (SUBVIEWS[tab]) for (const view of SUBVIEWS[tab].ids) allRoutes.push({ tab, view, overlay: null });
  else allRoutes.push({ tab, view: null, overlay: null });
}
allRoutes.push({ tab: 'prep', view: 'pathway', overlay: { kind: 'lesson', unitId: 'ex1', lessonId: 'ex1l1' } });
allRoutes.push({ tab: 'prep', view: 'quizzes', overlay: { kind: 'quiz', quizId: 'ex1l1q' } });

const seen = new Map();
for (const route of allRoutes) {
  const p = formatPath(route);
  if (seen.has(p)) fail(`two routes share the URL ${p}`);
  seen.set(p, route);
  const back = parsePath(p);
  if (!back) { fail(`${p} does not parse back`); continue; }
  if (JSON.stringify(back) !== JSON.stringify(route)) fail(`${p} parsed back as ${JSON.stringify(back)}, expected ${JSON.stringify(route)}`);
  if (formatPath(back) !== p) fail(`${p} is not canonical (re-formats to ${formatPath(back)})`);
}
if (!failures) ok(`${allRoutes.length} routes round-trip and are all distinct`);

// ── 3. Paths that must NOT be treated as app routes ─────────────────────────
section('Non-routes stay non-routes');
for (const p of ['/sitemap.xml', '/robots.txt', '/favicon.png', '/api/groq', '/login', '/signup', '/forgot-password', '/portfolio/nonsense', '/nope', '/sat/practice/extra']) {
  if (parsePath(p) !== null) fail(`${p} should not parse as an app route (got ${JSON.stringify(parsePath(p))})`);
}
// …and the aliases that must resolve, without pretending to be canonical.
for (const [alias, expected] of [['/sat', '/sat/overview'], ['/prep', '/prep/pathway'], ['/portfolio/', '/portfolio/overview'], ['/home', '/'], ['/', '/']]) {
  const parsed = parsePath(alias);
  if (!parsed) fail(`${alias} should resolve to ${expected}`);
  else if (formatPath(parsed) !== expected) fail(`${alias} resolved to ${formatPath(parsed)}, expected ${expected}`);
}
if (Object.values(AUTH_VIEWS).some((p) => parsePath(p))) fail('an auth path parsed as an app route');
ok('files, API paths, auth screens and typos are all rejected; aliases normalize');

// ── 4. Boot precedence: URL wins, persisted state fills the gaps ─────────────
section('Boot route');
const persisted = { tab: 'progress', prepView: 'coach', portfolioView: 'essays', progressView: 'performance', satView: 'skills' };
const bootBare = bootRoute(persisted, '/');
if (bootBare.tab !== 'progress' || bootBare.progressView !== 'performance') fail('a bare "/" should resume the persisted view');
const bootDeep = bootRoute(persisted, '/portfolio/deadlines');
if (bootDeep.tab !== 'portfolio' || bootDeep.portfolioView !== 'deadlines') fail('a deep link should win over persisted state');
if (bootDeep.prepView !== 'coach') fail('a deep link should not discard the persisted state it says nothing about');
const bootJunk = bootRoute(persisted, '/nope');
if (bootJunk.tab !== 'progress') fail('an unknown URL should fall back to persisted state');
const bootBadPersist = bootRoute({ tab: 'zzz', satView: 'zzz' }, '/');
if (bootBadPersist.tab !== 'home' || bootBadPersist.satView !== SUBVIEWS.sat.default) fail('corrupt persisted state should degrade to defaults');
if (normalizePath('/sat/practice/') !== '/sat/practice') fail('normalizePath should drop the trailing slash');
if (!failures) ok('URL beats persisted state, junk falls back, corrupt state degrades');

// ── 5. The SEO files agree with the routes ──────────────────────────────────
section('Sitemap + robots.txt');
const sitemap = read('public/sitemap.xml');
const robots = read('public/robots.txt');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) fail('sitemap.xml lists no URLs');
if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) fail('sitemap.xml is missing its XML declaration');
if (!sitemap.trimEnd().endsWith('</urlset>')) fail('sitemap.xml is truncated');
for (const loc of locs) {
  if (!loc.startsWith('https://')) fail(`sitemap <loc> must be absolute and https: ${loc}`);
  const p = normalizePath(new URL(loc).pathname);
  // Every sitemap URL must be reachable without an account: the landing page or
  // an auth screen. Anything the app itself routes is gated and must not be here.
  const isAuth = Object.values(AUTH_VIEWS).includes(p);
  if (p !== '/' && !isAuth) fail(`${p} is in the sitemap but is a signed-in app route — it would render the landing page to a crawler`);
}
if (!robots.includes(`Sitemap: ${new URL(locs[0]).origin}/sitemap.xml`)) fail('robots.txt does not point at the sitemap on the same origin');
for (const tab of TABS.filter((t) => t !== 'home')) {
  if (!robots.includes(`Disallow: /${tab}`)) fail(`robots.txt does not Disallow /${tab} (a signed-in-only route)`);
}
if (!failures) ok(`${locs.length} sitemap URLs are public, absolute, and robots.txt disallows every app tab`);

// ── 6. Nothing serves index.html in place of a file ─────────────────────────
section('Static files are never answered with the SPA shell');
const vercel = JSON.parse(read('vercel.json'));
const rewrite = vercel.rewrites?.find((r) => r.destination === '/index.html');
if (!rewrite) fail('vercel.json has no SPA rewrite');
else {
  const re = new RegExp(`^${rewrite.source}$`);
  for (const p of ['/sitemap.xml', '/robots.txt', '/assets/app.js', '/api/groq']) {
    if (re.test(p)) fail(`vercel.json would rewrite ${p} to index.html`);
  }
  for (const p of ['/sat/practice', '/prep/pathway', '/login', '/']) {
    if (!re.test(p)) fail(`vercel.json would NOT serve the app at ${p}`);
  }
}
const server = read('server.js');
if (!/FILE_REQUEST\.test\(req\.path\)/.test(server)) fail('server.js sends index.html for file requests instead of 404ing');
const vite = read('vite.config.js');
if (!/navigateFallbackDenylist/.test(vite)) fail('vite.config.js has no navigateFallbackDenylist — the service worker will shadow /sitemap.xml');
else {
  const denylist = [/\/[^/?]+\.[^/?]+$/, /^\/api\//]; // mirrors vite.config.js
  if (!denylist.some((re) => re.test('/sitemap.xml'))) fail('the service-worker denylist does not cover /sitemap.xml');
  if (denylist.some((re) => re.test('/sat/practice'))) fail('the service-worker denylist would break offline app routes');
}
if (!failures) ok('vercel.json, server.js and the service worker all pass files through');

console.log(failures ? `\n${failures} routing problem(s) found.\n` : '\nRouting verified.\n');
process.exit(failures ? 1 : 0);
