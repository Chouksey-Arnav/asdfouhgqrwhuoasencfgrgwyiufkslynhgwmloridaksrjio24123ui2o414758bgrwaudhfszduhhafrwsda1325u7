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
const {
  TABS, SUBVIEWS, AUTH_VIEWS, LEGAL_VIEWS, PARENT_VIEWS, PARENT_HUB_PATH, PARENT_STUDENT_PREFIX,
  formatPath, parsePath, bootRoute, normalizePath, resolveView,
  isParentPath, parseParentPath, parseParentStudentPath, parentStudentPath, isParentHubPath,
} = routes;

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

for (const [tab, name] of [['sat', 'SAT_SUBNAV'], ['prep', 'PREP_SUBNAV'], ['portfolio', 'PORTFOLIO_SUBNAV'], ['roadmap', 'ROADMAP_SUBNAV'], ['progress', 'PROGRESS_SUBNAV'], ['settings', 'SETTINGS_SUBNAV']]) {
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
allRoutes.push({ tab: 'prep', view: 'pathways', overlay: { kind: 'lesson', unitId: 'ex1', lessonId: 'ex1l1' } });
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
for (const p of ['/sitemap.xml', '/robots.txt', '/favicon.png', '/api/groq', '/login', '/signup', '/forgot-password',
  // The parent surfaces are owned by AuthGate and ParentApp, exactly like /legal/* — if the app
  // router ever started claiming them, two navigation systems would fight over the address bar.
  '/parents', '/parents/signup', '/parents/login', '/family', '/family/students', '/family/student/abc', '/parent-invite',
  '/portfolio/nonsense', '/nope', '/sat/practice/extra']) {
  if (parsePath(p) !== null) fail(`${p} should not parse as an app route (got ${JSON.stringify(parsePath(p))})`);
}
// …and the aliases that must resolve, without pretending to be canonical.
// Home is canonical at /home now, and a bare "/" is its alias — the reverse of the old rule.
// See HOME_PATH in src/lib/routes.js for why the dashboard needed a name of its own.
for (const [alias, expected] of [
  ['/sat', '/sat/overview'], ['/prep', '/prep/pathways'], ['/prep/pathway', '/prep/pathways'],
  ['/portfolio/', '/portfolio/overview'], ['/settings', '/settings/profile'],
  ['/home', '/home'], ['/', '/home'],
]) {
  const parsed = parsePath(alias);
  if (!parsed) fail(`${alias} should resolve to ${expected}`);
  else if (formatPath(parsed) !== expected) fail(`${alias} resolved to ${formatPath(parsed)}, expected ${expected}`);
}
if (Object.values(AUTH_VIEWS).some((p) => parsePath(p))) fail('an auth path parsed as an app route');
if (Object.values(PARENT_VIEWS).some((p) => parsePath(p))) fail('a parent path parsed as an app route — ParentApp owns /family/*, the student router must leave it alone');
if (Object.values(LEGAL_VIEWS).some((p) => parsePath(p))) fail('a legal path parsed as an app route — AuthGate owns /legal/*, the app router must leave it alone');
ok('files, API paths, auth screens and typos are all rejected; aliases normalize');

// ── 3a. The parent application has its own, separate address space ──────────
// Two navigation systems share one address bar (the student router in useAppRouter, and
// ParentApp's own view⇄URL effect). They stay out of each other's way only because parsePath
// refuses to claim /family/* — so that refusal is asserted here rather than assumed.
section('Parent routes are the parent app\'s, and nobody else\'s');
for (const [view, p] of Object.entries(PARENT_VIEWS)) {
  if (!isParentPath(p)) fail(`${p} is in PARENT_VIEWS but isParentPath() says no`);
  if (parseParentPath(p) !== view) fail(`${p} should parse back as '${view}', got '${parseParentPath(p)}'`);
}
const SAMPLE_STUDENT = '11111111-2222-3333-4444-555555555555';
const studentPath = parentStudentPath(SAMPLE_STUDENT);
if (!studentPath.startsWith(PARENT_STUDENT_PREFIX)) fail(`parentStudentPath() left the parent namespace: ${studentPath}`);
if (parseParentStudentPath(studentPath) !== SAMPLE_STUDENT) fail(`${studentPath} did not round-trip back to its student id`);
if (!isParentPath(studentPath)) fail(`${studentPath} is a parent screen but isParentPath() says no`);
if (parsePath(studentPath)) fail(`${studentPath} was claimed by the student router`);
if (parseParentStudentPath('/family/students')) fail('/family/students is the list, not one student');
// The public page is deliberately NOT part of the signed-in parent app: it renders for a
// signed-out visitor, a signed-in student, and a crawler (see AuthGate).
if (!isParentHubPath(PARENT_HUB_PATH)) fail(`${PARENT_HUB_PATH} should be the public parent page`);
if (isParentPath(PARENT_HUB_PATH)) fail(`${PARENT_HUB_PATH} is public and must not be treated as a signed-in parent screen`);
if (parsePath(PARENT_HUB_PATH)) fail(`${PARENT_HUB_PATH} was claimed by the student router`);
if (!failures) ok(`${Object.keys(PARENT_VIEWS).length} parent screens + per-student pages resolve, and none is an app route`);

// ── 3b. Retired sub-view ids still resolve ──────────────────────────────────
// Merging two tabs into one retires their ids, but those ids are already in
// shared links, bookmarks, PWA start URLs, persisted view state, and every
// history entry a returning student has. They must resolve to the survivor and
// must NOT be canonical, or there would be two URLs for one screen.
section('Retired sub-views alias forward');
for (const [tab, sub] of Object.entries(SUBVIEWS)) {
  for (const [alias, target] of Object.entries(sub.aliases || {})) {
    if (sub.ids.includes(alias)) fail(`SUBVIEWS.${tab}.aliases.${alias} is also a live id — it can never be reached`);
    if (!sub.ids.includes(target)) fail(`SUBVIEWS.${tab}.aliases.${alias} points at ${target}, which is not a live id`);
    const parsed = parsePath(`/${tab}/${alias}`);
    if (!parsed) { fail(`/${tab}/${alias} should still resolve`); continue; }
    if (parsed.view !== target) fail(`/${tab}/${alias} resolved to ${parsed.view}, expected ${target}`);
    if (formatPath(parsed) !== `/${tab}/${target}`) fail(`/${tab}/${alias} should normalize to /${tab}/${target}`);
    if (resolveView(tab, alias) !== target) fail(`resolveView('${tab}','${alias}') should be ${target}`);
    // …and a stale value sitting in localStorage lands on the survivor too.
    const booted = bootRoute({ tab, [sub.state]: alias }, '/');
    if (booted[sub.state] !== target) fail(`persisted ${sub.state}='${alias}' should boot into ${target}, got ${booted[sub.state]}`);
  }
}
if (!failures) ok('every retired sub-view id resolves forward, normalizes, and never round-trips out of formatPath');

// ── 4. Boot precedence: URL wins, persisted state fills the gaps ─────────────
section('Boot route');
const persisted = { tab: 'progress', prepView: 'coach', portfolioView: 'essays', progressView: 'performance', satView: 'skills' };
const bootBare = bootRoute(persisted, '/');
if (bootBare.tab !== 'progress' || bootBare.progressView !== 'performance') fail('a bare "/" should resume the persisted view');
const bootDeep = bootRoute(persisted, '/portfolio/milestones');
if (bootDeep.tab !== 'portfolio' || bootDeep.portfolioView !== 'milestones') fail('a deep link should win over persisted state');
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
  // Every sitemap URL must be reachable without an account: the landing page,
  // an auth screen, or a legal document. Anything the app itself routes is
  // gated and must not be here.
  //
  // The legal documents qualify because AuthGate renders them ahead of its
  // signed-in/signed-out branch (see LEGAL_VIEWS in src/lib/routes.js), so a
  // crawler with no session gets the actual document rather than the landing
  // page — which is the whole reason a gated route is disqualified here.
  const isAuth = Object.values(AUTH_VIEWS).includes(p);
  const isLegal = Object.values(LEGAL_VIEWS).includes(p);
  // The public parent page qualifies for the same reason the legal documents do: AuthGate renders
  // it ahead of its signed-in/signed-out branch, so a crawler with no session gets the actual
  // page rather than the landing page.
  const isParentHub = p === PARENT_HUB_PATH;
  if (p !== '/' && !isAuth && !isLegal && !isParentHub) fail(`${p} is in the sitemap but is a signed-in app route — it would render the landing page to a crawler`);
}
if (!robots.includes(`Sitemap: ${new URL(locs[0]).origin}/sitemap.xml`)) fail('robots.txt does not point at the sitemap on the same origin');
// robots.txt is deliberately wide open — every path, every user-agent, no
// Disallow lines (see DISALLOW in src/lib/seoRoutes.js). App tabs like /home
// and /family still render the landing page to a session-less crawler
// (AuthGate falls through), so this isn't a duplicate-content risk; it's a
// deliberate policy to let every bot in unconditionally, ads bots included.
if (!robots.includes('Allow: /parents')) fail('robots.txt does not Allow /parents (it is a public page)');
if (!failures) ok(`${locs.length} sitemap URLs are public and absolute, and robots.txt is open to every crawler`);

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
  for (const p of ['/sat/practice', '/prep/pathways', '/settings/family', '/parents', '/family', '/login', '/']) {
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
