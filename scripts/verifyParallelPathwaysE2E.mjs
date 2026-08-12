#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, of the behaviour parallel pathways
 * actually promises a student. scripts/verifyParallelPathways.mjs proves the model and the
 * wiring; this proves the thing they experience:
 *
 *   1. ⌥1/⌥2/⌥3 switch pathways from anywhere — and stay out of the way while they're typing.
 *   2. A pathway that ISN'T in focus can be resumed in place, without switching to it.
 *   3. A lesson opened that way is presented as ITS OWN pathway — right name, right colour —
 *      rather than borrowing the identity of whichever pathway happens to be in focus. This is
 *      the failure mode most likely to reappear, and the one least likely to be noticed in
 *      review: everything renders, it's just quietly labelled wrong.
 *   4. Dropping a pathway confirms first, frees its slot, and says progress is kept.
 *
 * Run: npm run verify:parallel-pathways-e2e   (requires `npm run build` first)
 */

import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4327;
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

const ACCOUNT = { id: 1, email: 'parallel-e2e@example.com', name: 'Maya', onboardingComplete: true };
// Three pathways, deliberately in an order where the focused one is NOT the first: that's what
// catches a switcher that quietly re-sorts its rows and desynchronises the ⌥ shortcuts.
const PROFILE = {
  name: 'Maya',
  email: ACCOUNT.email,
  specialty: 'physician',
  activePathways: ['physician', 'nursing', 'publicHealth'],
  gradeStage: 'hs_11',
  xp: 1450,
  createdAt: Date.now() - 86400000 * 40,
  onboardedAt: Date.now() - 86400000 * 40,
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/api/auth/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
  await context.route('**/api/progress-sync', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
  await context.route('**/api/**', (r) => (r.request().url().includes('/auth/me') || r.request().url().includes('progress-sync')
    ? r.fallback()
    : r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'e2e-token'); });

  const page = await context.newPage();
  page.on('pageerror', (e) => fail(`uncaught page error: ${String(e).slice(0, 200)}`));

  // The switcher's accessible name is the source of truth for "which pathway is in focus" —
  // asserting on it also keeps the screen-reader label honest.
  const focused = async () => (await page.locator('[data-tour="pathway-quickswitch"]').first().getAttribute('aria-label')) || '';
  const railText = async () => (await page.locator('[data-tour="pathway-rail"]').innerText()).replace(/\n/g, ' ');

  await page.goto(`${BASE}/prep/pathways`, { waitUntil: 'domcontentloaded' });
  // Wait on the rail itself rather than a fixed sleep — the app boots through an auth check,
  // a Dexie open and a progress-sync round trip before it can know what's enrolled.
  await page.locator('[data-tour="pathway-rail"]').waitFor({ timeout: 30000 });
  // A first visit pops the daily check-in chest over the whole screen. It has nothing to do
  // with pathways, but it is a full-viewport overlay that swallows clicks, and it can animate
  // in a beat AFTER the rail renders — so this runs again before every click sequence below
  // rather than once at boot.
  const dismissChest = async () => {
    for (let i = 0; i < 6; i += 1) {
      const chest = page.locator('button:has-text("Open Chest"), button:has-text("Nice!")');
      if (!(await chest.count())) return;
      await chest.first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  };
  await page.waitForTimeout(1200);
  await dismissChest();
  await page.waitForTimeout(800);
  await dismissChest();

  section('The rail shows every enrolled pathway, in slot order');
  const chips = page.locator('[data-rail-chip]');
  check(await chips.count() === 3, `three chips (got ${await chips.count()})`);
  const chipTexts = await chips.allInnerTexts();
  check(/Physician[\s\S]*⌥1/.test(chipTexts[0]) && /Nursing[\s\S]*⌥2/.test(chipTexts[1]),
    'each chip prints the shortcut that actually reaches it');

  section('⌥1/⌥2/⌥3 switch pathways from the keyboard');
  await page.keyboard.press('Alt+Digit2');
  await page.waitForTimeout(1200);
  check((await focused()).includes('Nursing'), '⌥2 focuses the second-slot pathway');
  await page.keyboard.press('Alt+Digit3');
  await page.waitForTimeout(1000);
  check((await focused()).includes('Public Health'), '⌥3 focuses the third');
  await page.keyboard.press('Alt+Digit1');
  await page.waitForTimeout(1000);
  check((await focused()).includes('Physician'), '⌥1 focuses the first');

  section('...but never while the student is typing');
  await dismissChest();
  await page.locator('a:has-text("Quiz Library")').first().click();
  await page.waitForTimeout(1600);
  const search = page.locator('input[placeholder*="Search quizzes"]').first();
  if (await search.count()) {
    await search.click();
    await search.type('a');
    await page.keyboard.press('Alt+Digit2');
    await page.waitForTimeout(800);
    check((await focused()).includes('Physician'), '⌥2 inside a search box does not re-theme the app under them');
  } else fail('quiz search box not found — cannot test the typing guard');

  section('A pathway that is not in focus is resumable in place');
  await dismissChest();
  await page.locator('a:has-text("Pathways")').first().click();
  await page.waitForTimeout(1800);
  const before = await focused();
  // Second card on the parallel board = the second enrolled pathway (Nursing).
  await page.locator('button:has-text("Start")').nth(1).click();
  await page.waitForTimeout(2400);
  const body = (await page.locator('body').innerText()).replace(/\n/g, ' ');
  check(/Anatomy & Physiology Overview/.test(body), "the board's Start opens that pathway's own next lesson");
  check(/Nursing/.test(body) && !/Anatomy & Physiology Foundations · Physician/.test(body),
    'and the lesson is titled with ITS pathway, not the one in focus');
  check(/focus stays on Physician/i.test(body) || /your focus stays/i.test(body),
    'and the student is told their focus did not move');

  await page.goto(`${BASE}/prep/pathways`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  check((await focused()) === before, 'leaving the lesson, focus is exactly where it was');

  section('Dropping a pathway confirms, keeps progress, and frees the slot');
  await dismissChest();
  await page.locator('button:has-text("Add or change pathways")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('button[aria-label="Stop studying Public Health"]').first().click();
  await page.waitForTimeout(700);
  const confirm = (await page.locator('body').innerText()).replace(/\n/g, ' ');
  check(/Stop studying Public Health\?/.test(confirm), 'dropping asks first rather than acting on the click');
  check(/Nothing is lost|stay saved/.test(confirm), 'and says what happens to the work already done');
  await page.locator('button:has-text("Stop studying it")').first().click();
  await page.waitForTimeout(1500);
  check(await chips.count() === 2, `the rail is down to two chips (got ${await chips.count()})`);
  const rail = await railText();
  check(!rail.includes('Public Health'), 'the dropped pathway is gone from the rail');
  check(rail.includes('Add pathway'), 'and the freed slot is offered straight back');
  await page.locator('button:has-text("Add or change pathways")').first().click().catch(() => {});
  await page.waitForTimeout(1000);
  check(await page.locator('button:has-text("Add & study")').count() > 0,
    'with a slot free, the catalogue offers "Add & study" again instead of "Swap one out"');
} catch (err) {
  fail(`threw: ${err.message}`);
  if (process.env.E2E_DEBUG) console.error(err);
} finally {
  await browser?.close();
  server.kill();
}

console.log(failures ? `\n${failures} parallel-pathway problem(s) found.\n` : '\nParallel pathways verified end-to-end.\n');
process.exit(failures ? 1 : 0);
