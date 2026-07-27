#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, of the two things
 * this routing work is supposed to guarantee:
 *
 *   1. The back button walks back through tabs, sub-tabs and the lesson player
 *      exactly the way the student walked forward — including forward again,
 *      including deep links, including a reload in the middle.
 *   2. /sitemap.xml and /robots.txt serve their own bytes — even to a browser
 *      that has the app's service worker installed, which is the one condition
 *      under which they were silently being replaced by the landing page.
 *
 * Run: npm run verify:routing-e2e   (requires `npm run build` first)
 */

import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4319;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const section = (name) => console.log(`\n${name}`);

function check(cond, msg) { if (cond) ok(msg); else fail(msg); }

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// ── The account this run pretends to be signed in as ────────────────────────
const ACCOUNT = { id: 1, email: 'router-e2e@example.com', name: 'Router E2E', onboardingComplete: true };
const PROFILE = {
  name: 'Router E2E',
  email: ACCOUNT.email,
  specialty: 'exploring',
  gradeStage: 'hs_11',
  xp: 120,
  createdAt: Date.now(),
  onboardedAt: Date.now(),
};

const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (d) => process.env.E2E_DEBUG && process.stderr.write(d));

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/robots.txt`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

let browser;
try {
  await waitForServer();

  // ── 1. Static files are served as themselves ──────────────────────────────
  section('Static files (plain HTTP)');
  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  check(sitemap.status === 200, `GET /sitemap.xml → 200 (got ${sitemap.status})`);
  const sitemapBody = await sitemap.text();
  check(sitemapBody.startsWith('<?xml'), 'GET /sitemap.xml returns XML, not the app shell');
  check(/xml/.test(sitemap.headers.get('content-type') || ''), `Content-Type is XML (got ${sitemap.headers.get('content-type')})`);
  check(sitemapBody.includes('<loc>https://medschoolprep.cloud/</loc>'), 'sitemap lists the production landing URL');

  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsBody = await robots.text();
  check(robots.status === 200 && robotsBody.includes('Sitemap: https://medschoolprep.cloud/sitemap.xml'),
    'GET /robots.txt points crawlers at the sitemap');

  const missing = await fetch(`${BASE}/definitely-not-here.xml`);
  check(missing.status === 404, `a missing FILE 404s instead of returning the app (got ${missing.status})`);

  const deep = await fetch(`${BASE}/portfolio/essays`);
  check(deep.status === 200 && (await deep.text()).includes('<div id="root">'), 'a deep app route serves the app shell');

  // ── 2. The app, driven like a student would ───────────────────────────────
  // The image ships one Chromium build (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers);
  // point at it directly when the pinned playwright version expects a different one.
  const executablePath = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => existsSync(p) && statSync(p).isFile());
  browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/api/auth/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
  await context.route('**/api/progress-sync', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
  await context.route('**/api/**', (route) => (route.request().url().includes('/auth/me') || route.request().url().includes('progress-sync')
    ? route.fallback()
    : route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'e2e-token'); });

  const page = await context.newPage();
  const url = () => new URL(page.url()).pathname;
  const navLink = (label) => page.locator(`nav a:has-text("${label}")`).first();
  const pill = (label) => page.locator(`a:has-text("${label}")`).first();

  // A first-visit account gets a daily-check-in chest over the whole screen; it has
  // nothing to do with routing, but it eats clicks.
  async function dismissChest() {
    for (let i = 0; i < 4; i += 1) {
      const open = page.locator('button:has-text("Open Chest")');
      if (await open.count()) { await open.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1400); continue; }
      const nice = page.locator('button:has-text("Nice!")');
      if (await nice.count()) { await nice.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
      const close = page.locator('button[aria-label="Close"]');
      if (await close.count()) { await close.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
      return;
    }
  }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await navLink('Portfolio').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await dismissChest();

  section('Tabs move the URL');
  await navLink('SAT').click();
  await page.waitForURL('**/sat/**', { timeout: 10000 });
  check(url() === '/sat/overview', `SAT tab → /sat/overview (got ${url()})`);

  await pill('Full Tests').click();
  await page.waitForURL('**/sat/tests', { timeout: 10000 });
  check(url() === '/sat/tests', `SAT sub-tab → /sat/tests (got ${url()})`);

  await navLink('Portfolio').click();
  await page.waitForURL('**/portfolio/**', { timeout: 10000 });
  check(url() === '/portfolio/overview', `Portfolio tab → /portfolio/overview (got ${url()})`);

  await pill('Deadlines').click();
  await page.waitForURL('**/portfolio/deadlines', { timeout: 10000 });
  check(url() === '/portfolio/deadlines', `Portfolio sub-tab → /portfolio/deadlines (got ${url()})`);

  section('Back walks the exact path taken');
  const expectedBack = ['/portfolio/overview', '/sat/tests', '/sat/overview', '/'];
  for (const expected of expectedBack) {
    await page.goBack();
    await page.waitForTimeout(350);
    check(url() === expected, `back → ${expected} (got ${url()})`);
  }
  // …and the UI actually followed the URL, rather than the URL moving alone.
  check(await page.locator('nav a[aria-current="page"]:has-text("Home")').count() > 0,
    'the Home tab is the one marked active after backing all the way out');

  section('Forward replays it');
  for (const expected of ['/sat/overview', '/sat/tests', '/portfolio/overview', '/portfolio/deadlines']) {
    await page.goForward();
    await page.waitForTimeout(350);
    check(url() === expected, `forward → ${expected} (got ${url()})`);
  }
  check(await page.locator('a[aria-current="page"]:has-text("Deadlines")').count() > 0,
    'the Deadlines sub-tab is active again after going forward');

  section('A reload lands on the same screen, and back still works');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('a[aria-current="page"]:has-text("Deadlines")').waitFor({ timeout: 20000 });
  await dismissChest();
  check(url() === '/portfolio/deadlines', `reload stays on /portfolio/deadlines (got ${url()})`);
  await page.goBack();
  await page.waitForTimeout(400);
  check(url() === '/portfolio/overview', `back after a reload → /portfolio/overview (got ${url()})`);

  section('Deep links and junk URLs');
  await page.goto(`${BASE}/prep/flashcards`, { waitUntil: 'domcontentloaded' });
  await page.locator('a[aria-current="page"]:has-text("Flashcards")').waitFor({ timeout: 20000 });
  await dismissChest();
  check(url() === '/prep/flashcards', `a deep link opens that exact sub-tab (got ${url()})`);

  await page.goto(`${BASE}/sat`, { waitUntil: 'domcontentloaded' });
  await page.locator('nav a[aria-current="page"]:has-text("SAT")').waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  check(url() === '/sat/overview', `a bare /sat normalizes to /sat/overview in place (got ${url()})`);

  await page.goto(`${BASE}/total/nonsense`, { waitUntil: 'domcontentloaded' });
  await page.locator('nav a[aria-current="page"]').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  check(!url().startsWith('/total'), `an unknown URL is rewritten to a real screen (got ${url()})`);

  section('The lesson player is part of history, not on top of it');
  await page.goto(`${BASE}/prep/pathway`, { waitUntil: 'domcontentloaded' });
  await page.locator('a[aria-current="page"]:has-text("Pathway")').waitFor({ timeout: 20000 });
  await dismissChest();
  const startLesson = page.locator('button:has-text("Start Lesson")').first();
  if (await startLesson.count()) {
    await startLesson.click();
    await page.waitForTimeout(900);
    check(/\/lesson\//.test(url()), `opening a lesson gives it its own URL (got ${url()})`);
    const lessonUrl = url();
    await page.goBack();
    await page.waitForTimeout(900);
    check(url() === '/prep/pathway', `back leaves the lesson and lands on the tab under it (got ${url()})`);
    check(await page.locator('a[aria-current="page"]:has-text("Pathway")').count() > 0,
      'the Prep tab is really back on screen — the player did not stay up over it');
    await page.goForward();
    await page.waitForTimeout(1200);
    check(url() === lessonUrl, `forward re-opens the same lesson (got ${url()})`);
    check(await page.locator('a[aria-current="page"]:has-text("Pathway")').count() === 0,
      'the lesson player is showing again, not the Prep tab');
    await page.goBack();
    await page.waitForTimeout(700);
  } else {
    fail('no lesson to start — could not exercise the lesson player');
  }

  section('Scroll position comes back with the page');
  // Small viewport so an ordinary panel is guaranteed to overflow.
  await page.setViewportSize({ width: 900, height: 480 });
  await page.goto(`${BASE}/portfolio/colleges`, { waitUntil: 'domcontentloaded' });
  await page.locator('a[aria-current="page"]:has-text("College List")').waitFor({ timeout: 20000 });
  await dismissChest();
  await page.waitForTimeout(600);
  await page.evaluate(() => { const el = document.querySelector('#msp-main'); if (el) el.scrollTop = 260; });
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => document.querySelector('#msp-main')?.scrollTop || 0);
  if (scrolled < 50) {
    fail(`could not scroll the panel (scrollTop stuck at ${scrolled}) — scroll restore is untested`);
  } else {
    await pill('Essays').click();
    await page.waitForURL('**/portfolio/essays', { timeout: 10000 });
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => document.querySelector('#msp-main')?.scrollTop || 0);
    check(top < 20, `a newly opened screen starts at the top (got ${top})`);
    await page.goBack();
    await page.waitForTimeout(1400);
    const restored = await page.evaluate(() => document.querySelector('#msp-main')?.scrollTop || 0);
    check(Math.abs(restored - scrolled) < 60, `back restores the scroll offset (${scrolled} → ${restored})`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // ── 3. The service worker must not shadow the sitemap ─────────────────────
  section('Sitemap survives the service worker');
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'none';
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller ? 'controlling' : 'registered';
  });
  console.log(`  – service worker: ${swReady}`);
  if (swReady === 'controlling' || swReady === 'registered') {
    const swPage = await context.newPage();
    const res = await swPage.goto(`${BASE}/sitemap.xml`, { waitUntil: 'domcontentloaded' });
    const body = await res.text();
    check(body.startsWith('<?xml'), 'navigating to /sitemap.xml with the SW installed still returns XML');
    const robotsRes = await swPage.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
    check((await robotsRes.text()).startsWith('# MedSchoolPrep'), 'navigating to /robots.txt with the SW installed still returns the text file');
    await swPage.close();
  } else {
    fail('the service worker never registered — cannot prove the sitemap survives it');
  }

  // ── 4. Signed-out screens are addressable too ─────────────────────────────
  section('Signed-out screens');
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await anonPage.locator('input[type="password"]').first().waitFor({ timeout: 20000 });
  check(new URL(anonPage.url()).pathname === '/login', 'a /login link opens the login form directly');
  const noindex = await anonPage.locator('meta[name="robots"]').getAttribute('content');
  check((noindex || '').startsWith('index'), `/login is indexable (robots meta: ${noindex})`);
  await anonPage.goto(`${BASE}/portfolio/essays`, { waitUntil: 'domcontentloaded' });
  await anonPage.waitForTimeout(1500);
  const gatedRobots = await anonPage.locator('meta[name="robots"]').getAttribute('content');
  check((gatedRobots || '').startsWith('noindex'), `a signed-in-only route is marked noindex for crawlers (got ${gatedRobots})`);
  await anon.close();
} catch (err) {
  fail(`threw: ${err.message}`);
  if (process.env.E2E_DEBUG) console.error(err);
} finally {
  await browser?.close();
  server.kill();
}

console.log(failures ? `\n${failures} routing problem(s) found.\n` : '\nRouting verified end-to-end.\n');
process.exit(failures ? 1 : 0);
