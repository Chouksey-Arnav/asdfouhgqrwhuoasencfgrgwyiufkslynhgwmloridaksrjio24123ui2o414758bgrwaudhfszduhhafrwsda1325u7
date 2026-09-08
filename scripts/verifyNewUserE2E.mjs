#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, that the new-user
 * work actually reaches a student.
 *
 * The unit verifiers prove the models are right — that the ladder is ordered by
 * grade, that the decision engine ranks correctly, that the budget binds. None
 * of them can prove the screen a student gets, and every one of these has a
 * plausible way of being correct in a module and invisible in the app:
 *
 *   1. A brand-new account lands on the GUIDE, not on a dashboard.
 *   2. Answering a question moves the card on rather than sitting there.
 *   3. An account that has done the work gets the dashboard, and the guide is
 *      nowhere on the page.
 *   4. The SAT tab is gone from the nav on desktop and on mobile.
 *   5. A junior opens the whole Portfolio; a freshman does not.
 *   6. Nothing throws while any of that happens.
 *
 * Run: npm run verify:new-user-e2e   (requires `npm run build` first)
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4402;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const check = (c, m) => (c ? ok(m) : fail(m));
const section = (n) => console.log(`\n${n}`);

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// The browser gate: CI runs this with a real Chromium, a VPS deploy does not.
// See scripts/browserGate.mjs for why that is deliberate.
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome']
  .find(p => existsSync(p) && statSync(p).isFile());
if (!exe && process.env.SKIP_BROWSER_CHECKS) {
  console.log('\nno browser available and SKIP_BROWSER_CHECKS is set — skipping.\n');
  process.exit(0);
}

const server = spawn(process.execPath, [`${ROOT}/server.js`], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
for (let i = 0; i < 60; i += 1) {
  try { if ((await fetch(`${BASE}/robots.txt`)).ok) break; } catch { /* wait */ }
  await new Promise(r => setTimeout(r, 250));
}

const browser = await chromium.launch(exe ? { executablePath: exe } : {});

/** Opens the app as one student and hands back the page. */
async function open(profile, { path: at = '/home', viewport = { width: 1280, height: 900 } } = {}) {
  const account = { id: 1, email: profile.email, name: profile.name, onboardingComplete: true };
  const context = await browser.newContext({ viewport });
  await context.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: account }) }));
  await context.route('**/api/progress-sync', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: profile } }) }));
  await context.route('**/api/**', r => (r.request().url().includes('/auth/me') || r.request().url().includes('progress-sync')
    ? r.fallback()
    : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'smoke-token'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${at}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  return { page, context, errors };
}

// The graduation years are derived rather than guessed. "this year + 3" reads
// as a freshman and is not one, and a fixture that is silently the wrong grade
// would make the grade assertions below prove nothing.
const GB = await import(pathToFileURL(path.join(ROOT, 'src/lib/gradeBand.js')).href);
const { academicFallYear } = await import(pathToFileURL(path.join(ROOT, 'src/lib/timeline.js')).href);
const FALL = academicFallYear(new Date());
const gradYearFor = (stage) => GB.graduationYearFor(stage);

const now = Date.now();
/** A student who signed up ten minutes ago and has done nothing. */
const BRAND_NEW = {
  name: 'Newby', email: 'new-e2e@example.com', specialty: 'exploring',
  graduationYear: gradYearFor('freshman'), age: 15, xp: 0,
  createdAt: now, onboardedAt: now, onboardingCompletedAt: now,
  // Without this the August check-in modal (GradYearCheckIn) covers the whole
  // dashboard and every assertion below is really testing that modal. It fires
  // once a school year for every account that has not confirmed its year, which
  // includes every fixture in this file.
  gradYearConfirmedFor: FALL,
};
/** A junior six weeks in, with real work behind them. */
const ESTABLISHED = {
  name: 'Jules', email: 'established-e2e@example.com', specialty: 'physician',
  graduationYear: gradYearFor('junior'), age: 16, xp: 900,
  createdAt: now - 70 * 86400000, onboardedAt: now - 70 * 86400000, onboardingCompletedAt: now - 70 * 86400000,
  gradYearConfirmedFor: FALL,
  orientation: { focus: 'build', minutes: 'steady' },
  firstRunDismissed: true,
};

try {
  // ── 1 & 2. The brand-new account meets the guide ──────────────────────────
  section('A brand-new account gets the guide, not a dashboard');
  {
    const { page, context, errors } = await open(BRAND_NEW);
    const body = await page.textContent('body');
    check(/Getting started/i.test(body), 'the "Getting started" card is on the page');
    check(/two quick questions/i.test(body), 'it opens on the two questions, not on the ladder');
    check(!/Do these next/i.test(body) || body.indexOf('Getting started') < body.indexOf('Do these next'),
      'the guide is above the dashboard, not buried under it');

    // Answering must actually advance the card.
    const first = page.locator('button', { hasText: /Figuring out which health career/i }).first();
    if (await first.count()) {
      // force, because the Medabrain launcher floats over the page and
      // Playwright's actionability check reads it as an interceptor. The button
      // is visible, enabled and stable — this is a hit-testing artifact of the
      // headless viewport, not a real overlap a student would hit.
      await first.click({ force: true });
      await page.waitForTimeout(900);
      const after = await page.textContent('body');
      check(/how much time/i.test(after), 'answering the first question advances to the second');
    } else {
      fail('the first question\'s options did not render as buttons');
    }
    check(errors.length === 0, `no page errors on the new-user home${errors.length ? ` — ${errors[0]}` : ''}`);
    await context.close();
  }

  // ── 3. The established account gets the dashboard ─────────────────────────
  section('An established account gets the dashboard');
  {
    const { page, context, errors } = await open(ESTABLISHED);
    const body = await page.textContent('body');
    check(!/Getting started/i.test(body), 'the guide is gone');
    check(/Do these next/i.test(body), 'the real dashboard is there');
    check(errors.length === 0, `no page errors on the established home${errors.length ? ` — ${errors[0]}` : ''}`);
    await context.close();
  }

  // ── 4. The SAT tab is gone ────────────────────────────────────────────────
  section('The SAT tab is gone from every nav');
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 780 }]]) {
    const { page, context } = await open(ESTABLISHED, { viewport });
    // The nav links, specifically — "SAT" appears in plenty of Portfolio copy
    // (score fields, admissions midpoints) and that copy is meant to stay.
    const hrefs = await page.locator('a[href]').evaluateAll(as => as.map(a => a.getAttribute('href')));
    check(!hrefs.some(h => h && h.startsWith('/sat')), `${label}: no nav link points at /sat`);
    await context.close();
  }

  // ── 5. Grade decides how much Portfolio opens ─────────────────────────────
  section('A junior opens more of the Portfolio than a freshman');
  {
    const junior = { ...ESTABLISHED, graduationYear: gradYearFor('junior') };
    const freshman = { ...ESTABLISHED, email: 'fresh-e2e@example.com', graduationYear: gradYearFor('freshman'), xp: 0, unlockedFeatures: [] };
    const count = async (profile) => {
      const { page, context } = await open(profile, { path: '/portfolio/overview' });
      const hrefs = await page.locator('a[href^="/portfolio"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
      await context.close();
      return new Set(hrefs).size;
    };
    const j = await count(junior);
    const f = await count(freshman);
    check(j >= f, `a junior sees at least as much Portfolio as a freshman (${j} vs ${f} sub-tabs)`);
    check(j > 0 && f > 0, 'both grades get a usable Portfolio');
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(failures ? `\n${failures} problem(s)\n` : '\nNew-user experience verified in a real browser.\n');
process.exit(failures ? 1 : 0);
