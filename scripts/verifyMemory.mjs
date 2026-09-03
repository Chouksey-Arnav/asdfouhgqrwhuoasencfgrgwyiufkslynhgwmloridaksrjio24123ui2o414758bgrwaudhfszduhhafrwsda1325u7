#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DOM weight budget — how much of the app is in the document at once.
 *
 * ── Why this script exists ──────────────────────────────────────────────────
 * The e-library rendered all 1,628 resources on every visit, and the quiz grid
 * all 342 quizzes. Measured in a real browser against a real build, opening
 * /prep/library committed 53,001 DOM nodes and ~10,500 event listeners in a
 * single render — roughly 32 nodes per card, each card also carrying a
 * framer-motion instance for its hover effect. A student who opened that tab
 * had a browser tab measured in gigabytes: the machine stopped being usable for
 * anything else, and because a detached copy of that tree stayed reachable in
 * Blink well past unmount, the cost accumulated as they moved around the app
 * rather than being paid once and released.
 *
 * That is not a rendering-speed problem, and it is not something a bundle-size
 * budget can see: every one of those nodes came from data that was already
 * downloaded and already parsed. scripts/verifyPayload.mjs measures what a
 * student DOWNLOADS. This measures what the app then BUILDS out of it, which is
 * the number that decides whether their laptop keeps working.
 *
 * ── Why a ratchet rather than a fixed limit ────────────────────────────────-
 * The safe node count for a screen is not a universal constant — a dashboard is
 * legitimately denser than a settings page. What is knowable is that a screen
 * should not suddenly get much heavier than it is today, and that a list over a
 * dataset which grows (the library gains resources every content pass) must not
 * grow its DOM with it. So each route carries its own measured baseline and a
 * tolerance, exactly like scripts/payloadBaseline.json. Adding fifty resources
 * to the library must not move these numbers at all; if it does, the window
 * came off and this fails.
 *
 * The listener count is here for its own reason: listeners are the cheapest
 * thing to leak and the hardest to see. A row that registers a handler and a
 * view that never releases it look identical on screen and identical in a
 * bundle report.
 *
 * ── The cycle check ────────────────────────────────────────────────────────-
 * Static per-route numbers cannot catch a leak, only bulk. So the second half
 * navigates the whole app repeatedly and asserts that the JS heap does not
 * climb without bound. Before the windowing fix this loop grew the document by
 * ~32,000 nodes and the heap by ~4.3 MB on EVERY lap, which is precisely the
 * shape of "it was 5 GB, and after five minutes it was 20 GB".
 *
 * Run: npm run verify:memory        (requires `npm run build` first)
 *      npm run verify:memory -- --update   to re-baseline after a deliberate change
 * ─────────────────────────────────────────────────────────────────────────────
 */
import http from 'node:http';
import { existsSync, statSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts', 'memoryBaseline.json');
const UPDATE = process.argv.includes('--update');
const PORT = process.env.E2E_PORT || 4402;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };

// The routes worth holding a number over: every screen that renders a list off a
// bulk dataset, plus the dashboard as a control. A route missing from the
// baseline is measured and reported but cannot fail the build until it is
// recorded, so adding one here is a two-step, deliberate act.
const ROUTES = [
  '/home',
  '/prep/quizzes',
  '/prep/flashcards',
  '/prep/library',
  '/prep/coach',
  '/sat/library',
  '/sat/review',
  '/sat/skills',
  '/portfolio/opportunities',
  '/portfolio/resume',
  '/portfolio/applying',
  '/roadmap',
  '/plans',
  '/progress',
];

// Headroom over the recorded number before a route fails. Generous in relative
// terms because a content pass legitimately moves a dense screen by a few nodes,
// and tight in absolute terms because the failure this guards against is not
// "5% heavier", it is "an order of magnitude heavier".
const NODE_TOLERANCE = 0.25;
const NODE_FLOOR = 250;      // ignore noise on screens that are tiny anyway
const LISTENER_TOLERANCE = 0.30;
const LISTENER_FLOOR = 80;

// Ceiling on JS heap growth per full lap of the app, after a forced GC. The
// pre-fix build measured ~4.3 MB/lap and rising; a healthy build settles well
// under 1 MB and the excess is chunk loading on first visit, not retention.
const MAX_HEAP_GROWTH_MB_PER_CYCLE = 1.5;
const CYCLES = 6;

const ACCOUNT = {
  id: 1, email: 'memory-e2e@example.com', name: 'Memory E2E',
  onboardingComplete: true, gradeLevel: 'hs-11', graduationYear: 2027,
};
const PROFILE = {
  name: ACCOUNT.name, email: ACCOUNT.email, specialty: 'physician',
  gradeStage: 'junior', age: 16, xp: 400, createdAt: Date.now(), onboardedAt: Date.now(),
};

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// Playwright's bundled browser and the image's pre-installed one drift apart by
// build number, so resolve whatever is actually on disk rather than pinning a path.
function findChromium() {
  const direct = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome'];
  for (const p of direct) if (existsSync(p) && statSync(p).isFile()) return p;
  const root = '/opt/pw-browsers';
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root).filter(d => d.startsWith('chromium')).sort().reverse()) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
      const p = path.join(root, dir, rel);
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
  }
  return null;
}

// dist/ is served from here rather than by server.js on purpose. This script
// measures what the CLIENT builds in the document; every /api/** call is stubbed
// in the browser below, so the real server would contribute nothing but a
// dependency on it booting — and a memory budget that cannot run because an
// unrelated API module failed to import is a budget nobody keeps.
const DIST = path.join(ROOT, 'dist');
const MIME = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(DIST, rel);
  // Anything that is not a real file is an app route — hand back the shell, the
  // same way the production SPA fallback does.
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const exe = findChromium();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const measured = {};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
  await context.route('**/api/progress-sync', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
  await context.route('**/api/**', r => (r.request().url().includes('/auth/me') || r.request().url().includes('progress-sync')
    ? r.fallback()
    : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'memory-token'); });

  const page = await context.newPage();
  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav a[href="/home"], a[href="/home"]', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(6000);

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');

  // Navigate the way the app does — a pushState the router hears — rather than a
  // full load. A reload would hand every route a brand-new heap and hide exactly
  // the accumulation this script is here to catch.
  const go = async (p) => {
    await page.evaluate((to) => {
      window.history.pushState({}, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, p);
    await page.waitForTimeout(850);
  };
  const settle = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(350);
  };
  // Live nodes only. Performance.getMetrics' `Nodes` also counts detached trees
  // Blink has not swept yet, which drifts between runs on the collector's own
  // schedule and would make this flaky; querySelectorAll counts what is actually
  // in the document, which is what the budget is about.
  const liveNodes = () => page.evaluate(() => document.getElementsByTagName('*').length);
  const listeners = async () => {
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    return m.JSEventListeners | 0;
  };
  const heapMB = async () => (await page.evaluate(() => performance.memory.usedJSHeapSize)) / 1048576;

  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { routes: {} };

  console.log('\nDOM weight per route');
  for (const route of ROUTES) {
    await go(route);
    await settle();
    const nodes = await liveNodes();
    const lis = await listeners();
    measured[route] = { nodes, listeners: lis };

    const prev = baseline.routes?.[route];
    if (!prev) {
      console.log(`  · ${route.padEnd(26)} ${String(nodes).padStart(6)} nodes  ${String(lis).padStart(5)} listeners  (no baseline yet)`);
      continue;
    }
    const nodeCap = Math.max(Math.round(prev.nodes * (1 + NODE_TOLERANCE)), prev.nodes + NODE_FLOOR);
    const lisCap = Math.max(Math.round(prev.listeners * (1 + LISTENER_TOLERANCE)), prev.listeners + LISTENER_FLOOR);
    const label = `${route.padEnd(26)} ${String(nodes).padStart(6)} nodes (max ${nodeCap}), ${String(lis).padStart(5)} listeners (max ${lisCap})`;
    if (nodes <= nodeCap && lis <= lisCap) ok(label);
    else fail(`${label}  ← over budget. A list on this screen is probably rendering every row; see src/lib/useWindowedList.js`);
  }

  // ── Does moving around the app cost memory that is never given back? ───────
  console.log(`\nHeap across ${CYCLES} full laps of the app`);
  await go('/home');
  await settle();
  const startHeap = await heapMB();
  for (let c = 0; c < CYCLES; c += 1) for (const route of ROUTES) await go(route);
  await go('/home');
  await settle();
  const endHeap = await heapMB();
  const perCycle = (endHeap - startHeap) / CYCLES;
  const heapResult = { startMB: +startHeap.toFixed(2), endMB: +endHeap.toFixed(2), perCycleMB: +perCycle.toFixed(3) };
  const heapLabel = `heap ${startHeap.toFixed(1)} MB → ${endHeap.toFixed(1)} MB = ${perCycle.toFixed(2)} MB per lap (max ${MAX_HEAP_GROWTH_MB_PER_CYCLE})`;
  if (perCycle <= MAX_HEAP_GROWTH_MB_PER_CYCLE) ok(heapLabel);
  else fail(`${heapLabel}  ← memory is being retained across navigation, not just allocated`);

  if (UPDATE) {
    writeFileSync(BASELINE, `${JSON.stringify({
      note: 'Measured by scripts/verifyMemory.mjs. Re-record deliberately with `npm run verify:memory -- --update`.',
      recordedAt: new Date().toISOString().slice(0, 10),
      routes: measured,
      heap: heapResult,
    }, null, 2)}\n`);
    console.log(`\nBaseline written to ${path.relative(ROOT, BASELINE)}`);
  }
} finally {
  await browser.close();
  server.close();
}

if (failures && !UPDATE) {
  console.error(`\n${failures} memory budget check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll memory budget checks passed.`);
