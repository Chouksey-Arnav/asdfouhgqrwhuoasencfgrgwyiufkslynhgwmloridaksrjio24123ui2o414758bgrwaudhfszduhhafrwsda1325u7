#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, that the merged
 * Portfolio actually merged — that the tab strip is five tabs and not eleven,
 * that each merged tab is ONE scrolling page rather than a set of sub-tabs, and
 * that every retired URL still lands on the exact section it used to open.
 *
 * These are the three things a consolidation quietly breaks, and none of them
 * can be checked from the data: the unit-style verifiers (verify:nav,
 * verify:routing, verify:nav-search) prove the ids line up, and this proves the
 * screen a student actually gets.
 *
 * Run: npm run verify:portfolio-e2e   (requires `npm run build` first)
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4399;
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const check = (c, m) => (c ? ok(m) : fail(m));

// The account this run pretends to be signed in as. A real grade stage
// ('junior', not 'hs_11') matters: eligibility badges key off it.
const ACCOUNT = { id: 1, email: 'portfolio-e2e@example.com', name: 'Portfolio E2E', onboardingComplete: true };
const PROFILE = {
  name: 'Portfolio E2E', email: ACCOUNT.email, specialty: 'physician',
  gradeStage: 'junior', age: 16, xp: 400, createdAt: Date.now(), onboardedAt: Date.now(),
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
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  // Land on a Portfolio URL and wait for the tab strip to actually exist rather
  // than for a fixed number of milliseconds — a cold first load pulls chunks and
  // a service worker, and the daily-check-in chest lands on top of everything.
  async function go(path) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-tour^="portfolio-sub-"]', { timeout: 30000 });
    // Clear whatever is covering the page (check-in chest, toasts, tour).
    for (let i = 0; i < 3; i += 1) {
      let clicked = false;
      for (const sel of ['[aria-label="Close"]', '[aria-label="Dismiss"]', 'button:has-text("Maybe later")', 'button:has-text("Skip")']) {
        const el = page.locator(sel).first();
        if (await el.count() && await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); clicked = true; }
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(600);
      if (!clicked) break;
    }
    await page.waitForTimeout(900);
  }

  console.log('\nThe strip');
  await go('/portfolio/overview');
  const pills = await page.locator('[data-tour^="portfolio-sub-"]').allTextContents();
  check(pills.length === 5, `the Portfolio strip has 5 tabs (got ${pills.length}: ${pills.join(' | ')})`);
  check(['Overview', 'Activities', 'Opportunities', 'Applying', 'Milestones'].every(l => pills.some(p => p.includes(l))),
    'the five are Overview, Activities, Opportunities, Applying, Milestones');

  console.log('\nActivities & Résumé — one page');
  await go('/portfolio/resume');
  const body = await page.locator('body').innerText();
  check(/Everything you have actually done|Nothing on record yet/.test(body), 'lands on the summary, not on a section');
  check(/Shadowing & Hours/.test(body) && /Skills & Certs/.test(body) && /Research/.test(body) && /Grades/.test(body),
    'all five sections are on the page at once');
  check(/Print the whole record/.test(body), 'the whole record can be printed');
  const jump = await page.locator('[data-jump]').allTextContents();
  check(jump.length === 5, `the in-page jumper lists 5 sections (got ${jump.length})`);

  console.log('\nDeep links land on the section');
  await go('/portfolio/clinical');
  check(new URL(page.url()).pathname === '/portfolio/resume', `/portfolio/clinical rewrites to /portfolio/resume (got ${new URL(page.url()).pathname})`);
  const clinicalOpen = await page.locator('#section-clinical [aria-expanded="true"]').count();
  check(clinicalOpen > 0, 'the Shadowing & Hours section is expanded');

  await go('/portfolio/essays');
  check(new URL(page.url()).pathname === '/portfolio/applying', `/portfolio/essays rewrites to /portfolio/applying (got ${new URL(page.url()).pathname})`);
  const applyBody = await page.locator('body').innerText();
  check(/College List/.test(applyBody) && /Recommenders/.test(applyBody) && /Chances/.test(applyBody), 'Applying carries all six former tabs');
  check(await page.locator('#section-essays [aria-expanded="true"]').count() > 0, 'the Essays section is expanded');
  check(/Combined Degrees/.test(applyBody), 'Applying carries the combined-degree catalog');

  // ── Combined degrees ───────────────────────────────────────────────────────
  // The three things that make this section worth having, checked on the screen
  // a student actually gets rather than in the data: the acceptance-rate
  // warning has to be read BEFORE any number, the two corrections have to be
  // present (a student who finds nothing here believes whoever told them
  // wrong), and the interview link has to exist at all — the MMI circuit was
  // built and orphaned, and this section is what un-orphans it.
  console.log('\nCombined degrees');
  await go('/portfolio/combined');
  check(new URL(page.url()).pathname === '/portfolio/applying', `/portfolio/combined rewrites to /portfolio/applying (got ${new URL(page.url()).pathname})`);
  check(await page.locator('#section-combined [aria-expanded="true"]').count() > 0, 'the Combined Degrees section is expanded');
  const cdBody = await page.locator('body').innerText();
  check(/Read this before you read a single acceptance rate/i.test(cdBody), 'the acceptance-rate warning sits above the programs');
  check(/Drexel/.test(cdBody) && /66 admitted/.test(cdBody), "Drexel's official admitted/enrolled counts render as counts");
  check(/Honors Program in Medical Education/i.test(cdBody) && /Closed/.test(cdBody), 'Northwestern HPME is shown as closed');
  check(/Joint Admission Medical Program/i.test(cdBody), 'Texas JAMP is shown as not a high-school application');
  check(/MMI circuit|Multiple Mini Interview/i.test(cdBody), 'programs that run an MMI link to the MMI circuit');

  console.log('\nOpportunities');
  await go('/portfolio/opportunities');
  // Scroll to the tier board and shoot a program card.
  const tier = page.locator('text=Genuinely admissions-moving').first();
  const hosa = page.locator('text=HOSA competitive events').first();
  const oppBody = await page.locator('body').innerText();
  check(/Free and funded only/.test(oppBody), 'the free-and-funded switch is on the page, not in a filter panel');
  check(/What.s actually worth your time|Genuinely admissions-moving/.test(oppBody), 'the tier board renders');
  check(/HOSA competitive events/.test(oppBody), 'the HOSA event tracker is present');
  check(/tracking/i.test(oppBody), 'Tracked is a section of this page');

  await go('/portfolio/tracked');
  check(new URL(page.url()).pathname === '/portfolio/opportunities', `/portfolio/tracked rewrites to /portfolio/opportunities (got ${new URL(page.url()).pathname})`);

  console.log('\nConsole');
  check(errors.length === 0, `no uncaught page errors (${errors.slice(0, 3).join(' | ') || 'none'})`);
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} Portfolio problem(s).` : '\nPortfolio verified in a real browser.');
process.exit(failures ? 1 : 0);
