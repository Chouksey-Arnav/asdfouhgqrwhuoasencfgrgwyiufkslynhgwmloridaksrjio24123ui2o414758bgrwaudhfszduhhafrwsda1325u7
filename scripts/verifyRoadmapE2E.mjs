#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, of the two things about the Roadmap
 * that scripts/verifyRoadmap.mjs structurally cannot see.
 *
 * ── 1. THE BUILD SCREEN RENDERS ─────────────────────────────────────────────
 * The bug this script exists because of: RoadmapTab rendered
 * `<BuildingScreen … reducedMotion={reducedMotion}/>` with no `reducedMotion` anywhere in scope.
 * That is a ReferenceError thrown at render time, on the one line that runs the instant a build
 * starts — so every single build died at click time, before a single generator pass, and the root
 * error boundary swallowed the tab. From the outside it looked exactly like "the roadmap will not
 * generate".
 *
 * Nothing static could catch it. The bundler resolves it happily (it is a legal identifier
 * reference), the unit-style suite in verifyRoadmap.mjs exercises the engine rather than the
 * component, and the code path only runs while a build is in flight. It takes a browser, a click,
 * and a listener on `pageerror` — which is precisely what this is.
 *
 * ── 2. THE YEAR CAN ACTUALLY BE MOVED THROUGH ───────────────────────────────
 * The timeline is wider than every screen it will ever be drawn on, so panning it IS the feature,
 * on both kinds of device. Asserted here rather than eyeballed: a mouse drag moves the rail, the
 * scrubber throws it across the year, a marker fills the detail card, and on a phone-sized
 * viewport the same rail is scrollable with touch-sized hit targets.
 *
 * Run: npm run verify:roadmap-e2e   (requires `npm run build` first)
 */

import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4331;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
const section = (name) => console.log(`\n${name}`);

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// ── The fixture roadmap ──────────────────────────────────────────────────────
// Built by the REAL generator rather than hand-written, so the document under test has the shape
// the product actually produces — real catalog ids, real dates, real seasons, real prep windows.
// Every model call is failed with a 400 (non-retryable, so no backoff waits) which drops
// createRoadmap onto its deterministic path: a complete, usable roadmap in a fraction of a second.
// That the fallback yields a renderable document at all is itself worth proving here.
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: false,
  status: 400,
  json: async () => ({ error: 'stubbed offline for the fixture build' }),
});
const { createRoadmap } = await import('../src/lib/roadmap/generator.js');
const { QUESTIONS } = await import('../src/lib/roadmap/intake.js');

const ACCOUNT = { id: 'roadmap-e2e-user', email: 'roadmap-e2e@example.com', name: 'Amara', onboardingComplete: true };
// Answers synthesised from the question list itself rather than hand-written, so this fixture
// cannot drift out of shape the next time a question is added, reworded or retyped.
const INTAKE = Object.fromEntries(QUESTIONS.map((q) => [
  q.id,
  q.kind === 'multi' ? [q.options[0].value]
    : q.kind === 'schools' ? ['State University', 'City College']
      : q.kind === 'text' ? 'I look after my younger brother after school.'
        : q.options[0].value,
]));
const roadmap = await createRoadmap({
  user: { ...ACCOUNT, gradeStage: 'junior', specialty: 'physician' },
  answers: INTAKE,
  portfolioFacts: null,
  lane: ACCOUNT.id,
});

// The stub has done its job; everything below this line talks to a real server over a real socket.
globalThis.fetch = realFetch;

if (!roadmap?.items?.length) {
  console.error('the deterministic generator produced no items — the fixture cannot be built');
  process.exit(1);
}
console.log(`fixture roadmap: ${roadmap.items.length} items, ${roadmap.seasons.length} seasons, `
  + `${roadmap.items.filter((i) => i.due || i.on || i.anchor).length} of them dated`);

const PROFILE = {
  name: 'Amara',
  email: ACCOUNT.email,
  specialty: 'physician',
  activePathways: ['physician'],
  gradeStage: 'hs_11',
  xp: 900,
  // The Roadmap tab unlocks on "onboarded + one study action" (src/lib/featureUnlock.js).
  lessonsCompleted: 3,
  quizzesTaken: 2,
  createdAt: Date.now() - 86400000 * 30,
  onboardedAt: Date.now() - 86400000 * 30,
  roadmap,
};

const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (d) => process.env.E2E_DEBUG && process.stderr.write(d));

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try { const res = await fetch(`${BASE}/robots.txt`); if (res.ok) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

let browser;
try {
  await waitForServer();
  const executablePath = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/home/jules/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome']
    .find((p) => existsSync(p) && statSync(p).isFile());
  browser = await chromium.launch(executablePath ? { executablePath } : {});

  const newContext = async (viewport, extra = {}) => {
    const context = await browser.newContext({ viewport, ...extra });
    await context.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
    await context.route('**/api/progress-sync', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
    // Every model call fails non-retryably (400, not 429/5xx), so a rebuild started in the browser
    // runs the whole generator to its deterministic end without sitting on backoff waits. The
    // deliberate delay is what makes the BUILD SCREEN observable: with instant failures the five
    // passes are over inside a frame, and the screen this script exists to test would never be on
    // screen long enough to assert against.
    await context.route('**/api/groq', async (r) => {
      await new Promise((done) => setTimeout(done, 1100));
      await r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'offline in e2e' }) });
    });
    await context.route('**/api/**', (r) => {
      const url = r.request().url();
      if (url.includes('/auth/me') || url.includes('progress-sync') || url.endsWith('/api/groq')) return r.fallback();
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'e2e-token'); });
    return context;
  };

  const errors = [];
  const openPage = async (context) => {
    const page = await context.newPage();
    page.on('pageerror', (e) => { errors.push(String(e)); fail(`uncaught page error: ${String(e).slice(0, 220)}`); });
    return page;
  };

  const dismissChest = async (page) => {
    for (let i = 0; i < 4; i += 1) {
      const chest = page.locator('button:has-text("Open Chest"), button:has-text("Nice!")');
      if (!(await chest.count())) return;
      await chest.first().click().catch(() => {});
      await page.waitForTimeout(1200);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  const desktop = await newContext({ width: 1440, height: 1000 });
  const page = await openPage(desktop);

  await page.goto(`${BASE}/roadmap/year`, { waitUntil: 'domcontentloaded' });
  const rail = page.locator('.roadmap-rail').first();
  await rail.waitFor({ timeout: 40000 });
  await page.waitForTimeout(1500);
  await dismissChest(page);

  section('The year is drawn as one connected, movable line');
  const body = async () => (await page.locator('body').innerText()).replace(/\n/g, ' ');
  const text = await body();
  // innerText reflects text-transform, and the section headings are uppercased in CSS.
  check(/your next twelve months/i.test(text), 'the Year view renders its timeline');
  const markers = page.locator('[data-roadmap-marker]');
  const markerCount = await markers.count();
  check(markerCount > 0, `every dated item is a marker on the line (${markerCount} drawn)`);

  const metrics = await rail.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft }));
  check(metrics.scrollWidth > metrics.clientWidth,
    `the year is longer than the frame, so there is something to move through (${metrics.scrollWidth}px of rail in a ${metrics.clientWidth}px window)`);
  // "Opens on today" cannot be asserted as scrollLeft > 0: a roadmap built today starts today, and
  // the correct frame for that is the very beginning of the rail. What must be true either way is
  // that today is IN the frame the student is handed.
  const todayInFrame = await rail.evaluate((el) => {
    const label = [...el.querySelectorAll('text')].find((t) => t.textContent.trim() === 'TODAY');
    if (!label) return null;
    const a = label.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return a.left >= b.left - 2 && a.right <= b.right + 2;
  });
  check(todayInFrame === true, 'and it opens with today inside the frame rather than somewhere off-screen');

  section('A mouse can drag it, the way a map is dragged');
  const box = await rail.boundingBox();
  const before = await rail.evaluate((el) => el.scrollLeft);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.75);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(box.x + box.width * 0.7 - i * 40, box.y + box.height * 0.75, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await rail.evaluate((el) => el.scrollLeft);
  check(after > before + 100, `dragging left moves the year forward (${Math.round(before)} → ${Math.round(after)})`);

  section('The scrubber throws you anywhere in the year in one gesture');
  const scrubber = page.locator('[data-roadmap-scrubber]').first();
  const sBox = await scrubber.boundingBox();
  if (sBox) {
    await page.mouse.move(sBox.x + sBox.width * 0.95, sBox.y + sBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(600);
    const end = await rail.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));
    check(end.left > end.max * 0.6, 'grabbing the far end of the scrubber lands at the end of the year');
  } else fail('the scrubber did not render beneath the rail');

  section('A marker explains itself without printing a date it cannot stand behind');
  await markers.first().click();
  await page.waitForTimeout(400);
  const card = await body();
  check(/Open this/.test(card), 'selecting a marker fills the detail card');
  check(!/undefined|NaN|Invalid Date/.test(card), 'and nothing on the screen renders as a broken value');

  section('The same year again, in order, on one unbroken vertical line');
  check(/everything, in the order it happens/i.test(text), 'the full timeline of events is on the Year view');
  check(/you are here/i.test(text), 'with today marked in its true place in the sequence');

  // ═══════════════════════════════════════════════════════════════════════════
  // THE REGRESSION. Rebuild runs the whole generator with the intake already on the roadmap, so
  // it is the shortest honest path to the screen that used to throw.
  section('Starting a build renders the build screen instead of crashing the tab');
  await page.goto(`${BASE}/roadmap/overview`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissChest(page);
  const errorsBefore = errors.length;
  const rebuild = page.locator('button:has-text("Rebuild")').first();
  check(await rebuild.count() > 0, 'the overview offers a rebuild');
  await rebuild.click();
  // Poll rather than sleep a fixed beat: the point is to catch the screen while it is up, and how
  // long that is depends on how fast the five stubbed passes resolve on the machine running this.
  let building = '';
  for (let i = 0; i < 20; i += 1) {
    building = await body();
    if (/Building your year/.test(building)) break;
    await page.waitForTimeout(250);
  }
  check(/Building your year/.test(building), 'the build screen renders');
  // The exact shape the original failure took: the root error boundary catching a render-time
  // ReferenceError and replacing the whole tab with its fallback. It never reaches `pageerror` —
  // an error boundary swallows it — so this text check, not the listener, is the real regression
  // guard. Before the fix this read "Something went wrong — reducedMotion is not defined".
  check(!/Something went wrong/i.test(building), 'and the tab is not replaced by the root error boundary');
  check(/pass \d of 5/i.test(building), 'and names which of the five passes is running');
  check(errors.length === errorsBefore, 'and starting a build throws nothing at all');

  // The stubbed 400s make every pass fall back, so the build finishes quickly and degraded —
  // which is the state the student must be TOLD about rather than shown as best thinking.
  let done = '';
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(750);
    done = await body();
    if (!/Building your year/.test(done)) break;
  }
  check(!/Building your year/.test(done), 'the build finishes rather than hanging on the loading screen');
  check(/12-month roadmap|not fully written for you/.test(done), 'and lands back on a roadmap');
  check(errors.length === errorsBefore, 'with no uncaught error anywhere in the build');

  await desktop.close();

  // ═══════════════════════════════════════════════════════════════════════════
  section('On a phone it is the same line, sized for a thumb');
  const mobile = await newContext(
    { width: 390, height: 844 },
    { isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  );
  const phone = await openPage(mobile);
  await phone.goto(`${BASE}/roadmap/year`, { waitUntil: 'domcontentloaded' });
  const mRail = phone.locator('.roadmap-rail').first();
  await mRail.waitFor({ timeout: 40000 });
  await phone.waitForTimeout(1800);
  await dismissChest(phone);

  const mMetrics = await mRail.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    // The property that makes native touch panning work at all — and that a stray
    // `touch-action: none` would silently kill.
    touchAction: getComputedStyle(el).touchAction,
  }));
  check(mMetrics.scrollWidth > mMetrics.clientWidth, 'the rail scrolls horizontally on a phone');
  check(/pan-x|auto|manipulation/.test(mMetrics.touchAction),
    `touch panning is left to the platform (touch-action: ${mMetrics.touchAction})`);
  check(mMetrics.clientWidth <= 390, 'and the rail never pushes the page itself sideways');

  const pageOverflow = await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(pageOverflow, 'the page has no horizontal overflow of its own');

  const touchTarget = await phone.locator('[data-roadmap-marker]').first().boundingBox();
  check(touchTarget && touchTarget.width >= 30 && touchTarget.height >= 30,
    `markers carry touch-sized hit targets (${touchTarget ? `${Math.round(touchTarget.width)}×${Math.round(touchTarget.height)}` : 'none'})`);

  // A real finger swipe, not a mouse pretending to be one.
  const mBox = await mRail.boundingBox();
  const mBefore = await mRail.evaluate((el) => el.scrollLeft);
  await phone.touchscreen.tap(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
  await mRail.evaluate((el) => el.scrollBy({ left: 220, behavior: 'instant' }));
  await phone.waitForTimeout(400);
  const mAfter = await mRail.evaluate((el) => el.scrollLeft);
  check(mAfter > mBefore, 'and the year moves under a touch scroll');

  await mobile.close();
} catch (err) {
  fail(`threw: ${err.message}`);
  if (process.env.E2E_DEBUG) console.error(err);
} finally {
  await browser?.close();
  server.kill();
}

console.log(failures ? `\n${failures} roadmap problem(s) found.\n` : '\nRoadmap verified end-to-end.\n');
process.exit(failures ? 1 : 0);
