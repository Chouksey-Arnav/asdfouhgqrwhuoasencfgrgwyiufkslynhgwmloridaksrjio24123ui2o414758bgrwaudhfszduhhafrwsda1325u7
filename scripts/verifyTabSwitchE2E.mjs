#!/usr/bin/env node
/**
 * The browser half of verify:tab-switch — proof in a real Chromium against a real
 * build that the two things the black-screen fix promises actually happen:
 *
 *   1. Every top-level tab switch mounts visible content. The run dwells on
 *      Portfolio and hovers its weekly-goal tiles between switches on purpose:
 *      those tiles are `layout` components, and a layout transition having
 *      actually run is the precondition for the wedge that used to leave the
 *      content column empty and black (see src/components/TabContentGuard.jsx).
 *   2. If the content column ever IS blank, the student gets "Oops! Loading
 *      issue." and a refresh — not a black screen. Forced here by pinning the
 *      measured element to opacity 0 from CSS, which is indistinguishable from
 *      the real failure as far as the watchdog is concerned.
 *
 * Run: npm run verify:tab-switch-e2e   (requires `npm run build` first)
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4401;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const check = (c, m) => (c ? ok(m) : fail(m));

const ACCOUNT = { id: 1, email: 'tab-switch-e2e@example.com', name: 'Tab Switch E2E', onboardingComplete: true };
const PROFILE = {
  name: 'Tab Switch E2E', email: ACCOUNT.email, specialty: 'physician',
  gradeStage: 'junior', age: 16, xp: 4000, createdAt: Date.now() - 9e8, onboardedAt: Date.now() - 9e8,
};

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

const server = spawn(process.execPath, [`${ROOT}/server.js`], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
for (let i = 0; i < 60; i += 1) {
  try { if ((await fetch(`${BASE}/robots.txt`)).ok) break; } catch { /* wait */ }
  await new Promise(r => setTimeout(r, 250));
}

const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p => existsSync(p) && statSync(p).isFile());
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
  await context.route('**/api/progress-sync', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
  await context.route('**/api/**', r => (r.request().url().includes('/auth/me') || r.request().url().includes('progress-sync') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'smoke-token'); });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  await page.goto(`${BASE}/portfolio`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-tour^="portfolio-sub-"]', { timeout: 45000 });
  // Clear whatever is covering the page (daily check-in chest, toasts, the tour).
  for (let i = 0; i < 6; i += 1) {
    const chest = page.locator('text=Open Chest').first();
    if (await chest.count() && await chest.isVisible().catch(() => false)) { await chest.click({ force: true }).catch(() => {}); await page.waitForTimeout(1400); }
    for (const sel of ['[aria-label="Close"]', '[aria-label="Dismiss"]', 'button:has-text("Maybe later")', 'button:has-text("Skip")']) {
      const el = page.locator(sel).first();
      if (await el.count() && await el.isVisible().catch(() => false)) await el.click({ force: true }).catch(() => {});
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }

  const probe = () => page.evaluate(() => {
    const main = document.getElementById('msp-main');
    const wrap = document.querySelector('[data-tab-content] > *');
    return {
      text: (main?.innerText || '').trim(),
      opacity: wrap ? getComputedStyle(wrap).opacity : null,
    };
  });

  console.log('\nEvery switch mounts visible content');
  const order = ['prep', 'portfolio', 'progress', 'portfolio', 'home', 'portfolio', 'roadmap', 'portfolio', 'prep', 'portfolio'];
  let blanks = 0;
  for (const dest of order) {
    await page.locator(`[data-tour="nav-${dest}"]`).first().click({ force: true });
    await page.waitForTimeout(900);
    if (dest === 'portfolio') {
      // Run the layout animations that are the precondition for the old wedge.
      const tiles = page.locator('#portfolio-weekly-goals div');
      const n = Math.min(await tiles.count(), 6);
      for (let i = 0; i < n; i += 1) await tiles.nth(i).hover({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
    const p = await probe();
    if (p.text.length < 60 || p.opacity === '0') { blanks += 1; console.error(`      ${dest}: blank (chars=${p.text.length}, opacity=${p.opacity})`); }
  }
  check(blanks === 0, `${order.length} switches, none left the content column blank`);

  console.log('\nA blank content column becomes a message, not a black screen');
  // Blanked while the student simply sits there — no navigation involved. This is the
  // shape of the real failure (a tab that was fine a moment ago stops showing anything),
  // and it is the case a watchdog that only checked at mount time would sleep through.
  await page.addStyleTag({ content: '[data-tab-content] > * { opacity: 0 !important; }' });
  await page.waitForTimeout(9000);
  const stuck = (await probe()).text;
  check(stuck.includes('Oops! Loading issue.'), 'the fallback says "Oops! Loading issue."');
  check(/[Rr]efresh the page/.test(stuck), 'the fallback tells the student to refresh the page');
  check(pageErrors.length === 0, `no uncaught page errors (${pageErrors.slice(0, 2).join(' | ') || 'none'})`);
} finally {
  await browser.close();
  server.kill();
}

console.log(failures === 0 ? '\nTab switching is seamless, and a blank tab is impossible to end on. ✓\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
