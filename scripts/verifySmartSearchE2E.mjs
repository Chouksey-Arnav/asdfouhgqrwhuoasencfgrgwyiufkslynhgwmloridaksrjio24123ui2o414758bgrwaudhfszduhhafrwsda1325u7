#!/usr/bin/env node
/**
 * End-to-end proof, in a real browser against a real build, that the smart
 * search actually does the thing it promises.
 *
 * scripts/verifyContentSearch.mjs proves the index ranks the right record for
 * the right query, which is the half that can be checked from data. It cannot
 * check the half the student experiences, and that half is where this feature
 * lives or dies:
 *
 *   - that the shortcuts open it, on every keyboard, including the "/" that a
 *     Chromebook user has and the ⌘ they do not;
 *   - that pressing Enter on a scholarship actually LANDS on that scholarship —
 *     right tab, right sub-tab, right section, filters cleared, search box
 *     pre-filled, card expanded and marked — rather than on the page that
 *     contains it, which is the wall this feature exists to remove;
 *   - that a phone gets a full-screen sheet rather than a dialog whose bottom
 *     half is under the on-screen keyboard.
 *
 * None of that is visible to a unit test, and all of it is invisible to a code
 * review that reads correct-looking JSX.
 *
 * Run: npm run verify:search-e2e   (requires `npm run build` first)
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

const ACCOUNT = { id: 1, email: 'search-e2e@example.com', name: 'Search E2E', onboardingComplete: true };
const PROFILE = {
  name: 'Search E2E', email: ACCOUNT.email, specialty: 'physician',
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

async function signedInPage(viewport) {
  const context = await browser.newContext({ viewport });
  await context.route('**/api/auth/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: ACCOUNT }) }));
  await context.route('**/api/progress-sync', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: PROFILE } }) }));
  await context.route('**/api/**', r => (r.request().url().includes('/auth/me') || r.request().url().includes('progress-sync') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  await context.addInitScript(() => { localStorage.setItem('msp_session_token', 'smoke-token'); });
  return context.newPage();
}

/** Land somewhere and clear whatever the app puts on top of a fresh session. */
async function go(page, to) {
  await page.goto(`${BASE}${to}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-tour="cmdk"]', { timeout: 30000 });
  for (let i = 0; i < 3; i += 1) {
    let clicked = false;
    for (const sel of ['[aria-label="Close"]', '[aria-label="Dismiss"]', 'button:has-text("Maybe later")', 'button:has-text("Skip")']) {
      const el = page.locator(sel).first();
      if (await el.count() && await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); clicked = true; }
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    if (!clicked) break;
  }
  await page.waitForTimeout(600);
}

const palette = '[role="dialog"][aria-label="Search MedSchoolPrep"]';
const paletteInput = `${palette} input`;

const isOpen = (page) => page.locator(paletteInput).count().then(n => n > 0);

/**
 * Open it and wait until it is really open.
 *
 * The palette animates in and out, so every assertion about whether it is
 * showing has to wait on the DOM rather than on a guessed number of
 * milliseconds — otherwise the test is measuring the exit animation, not the
 * behavior.
 */
async function openPalette(page, key = 'Control+k') {
  if (await isOpen(page)) return;
  await page.keyboard.press(key);
  await page.waitForSelector(paletteInput, { state: 'visible', timeout: 10000 }).catch(() => {});
}
async function closePalette(page) {
  if (!(await isOpen(page))) return;
  await page.keyboard.press('Escape');
  await page.waitForSelector(paletteInput, { state: 'detached', timeout: 10000 }).catch(() => {});
}

/** Open the palette, type, and wait for the library results to arrive. */
async function search(page, query) {
  await openPalette(page);
  await page.fill(paletteInput, query);
  // The index is fetched on the first keystroke, so the first search of a
  // session waits on a network round trip the later ones do not.
  await page.waitForFunction(
    () => !document.body.innerText.includes('Searching scholarships, programs and lessons…'),
    null, { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(500);
}

try {
  const page = await signedInPage({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await go(page, '/home');

  // ── The ways in ────────────────────────────────────────────────────────────
  console.log('\nOpening it');
  await openPalette(page);
  check(await isOpen(page), 'Ctrl+K opens the search');
  await closePalette(page);
  check(!(await isOpen(page)), 'Escape closes it');

  // The shortcut a Chromebook user actually has. Guarded on not already typing,
  // which is the next check — stealing "/" inside an essay draft would be a bug
  // in the most expensive possible place.
  await openPalette(page, '/');
  check(await isOpen(page), '"/" opens the search with no modifier at all');
  await closePalette(page);

  await go(page, '/portfolio/applying');
  const anyInput = page.locator('input[type="text"], textarea').first();
  if (await anyInput.count()) {
    await anyInput.click({ force: true }).catch(() => {});
    await page.keyboard.press('/');
    await page.waitForTimeout(500);
    check(!(await isOpen(page)), '…and "/" is a slash, not a shortcut, while typing in a field');
    await closePalette(page);
  }

  // ── What it finds ──────────────────────────────────────────────────────────
  console.log('\nFinding a named scholarship');
  await go(page, '/home');
  await search(page, 'coca cola');
  const results = await page.locator(palette).innerText();
  check(/Coca-Cola Scholars/i.test(results), `the Coca-Cola scholarship is a result (got: ${results.slice(0, 160).replace(/\n/g, ' / ')})`);
  check(/Scholarships/.test(results), 'it is grouped under Scholarships');
  check(/Portfolio › Applying › Financial aid/.test(results),
    'the row shows WHERE it lives, so the student learns the path and not only the answer');

  // ── Where Enter takes you ──────────────────────────────────────────────────
  // The whole feature. Not "the Financial Aid page" — the card.
  console.log('\nEnter lands on the record, not near it');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  check(new URL(page.url()).pathname === '/portfolio/applying',
    `it navigated to Applying (got ${new URL(page.url()).pathname})`);
  check(await page.locator('#section-aid [aria-expanded="true"]').count() > 0,
    'the Financial aid section is expanded');
  const prefilled = await page.locator('#section-aid input[placeholder*="scholarship database"]').inputValue().catch(() => '');
  check(/Coca-Cola Scholars/i.test(prefilled),
    `the scholarship database's own search arrived pre-filled (got "${prefilled}")`);
  const aidText = await page.locator('#section-aid').innerText();
  check(/Coca-Cola Scholars Program/.test(aidText), 'the card is on screen');
  check(/Coca-Cola Scholars Foundation/.test(aidText),
    'and it is expanded — the org and eligibility are showing, not just the title');

  // ── A program that closed, and a student who has been told it has not ──────
  console.log('\nA search that corrects the student');
  await go(page, '/home');
  await search(page, 'hpme');
  const hpme = await page.locator(palette).innerText();
  check(/HPME|Honors Program in Medical Education/i.test(hpme), 'HPME is findable');
  check(/Combined degrees/.test(hpme), 'it is grouped under Combined degrees');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const combinedText = await page.locator('body').innerText();
  check(/Closed/i.test(combinedText) && /HPME/i.test(combinedText),
    'and it lands on the sentence saying the program is closed');

  // ── The screens still win ties ─────────────────────────────────────────────
  console.log('\nScreens still outrank records');
  await go(page, '/home');
  await search(page, 'flashcards');
  // The row Enter would open. A screen carries no breadcrumb (its group heading
  // already says the pillar); a record always does — so a breadcrumb on the
  // selected row is proof a deck outranked the screen that holds the decks.
  const selected = await page.locator(`${palette} [data-cmd-active="true"]`).innerText();
  check(/^Flashcards/i.test(selected.trim()) && !/›/.test(selected),
    `typing a screen's own name selects the screen, not one of its records (got "${selected.replace(/\n/g, ' / ')}")`);
  // …and this is what makes that hold. Park the pointer over a lower result,
  // close, reopen and retype WITHOUT moving the mouse: a pointer that merely
  // happens to rest where results will appear must not drag the selection off
  // the best answer, because the student presses Enter before they see it move.
  const box = await page.locator(palette).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 60);
  await page.waitForTimeout(200);
  await closePalette(page);
  await search(page, 'flashcards');
  const stillTop = await page.locator(`${palette} [data-cmd-active="true"]`).innerText();
  check(/^Flashcards/i.test(stillTop.trim()) && !/›/.test(stillTop),
    `a resting pointer does not steal the selection (got "${stillTop.replace(/\n/g, ' / ')}")`);

  // ── Nothing found says something useful ────────────────────────────────────
  console.log('\nThe empty state');
  await page.fill(paletteInput, 'zzzzqx');
  await page.waitForTimeout(600);
  const empty = await page.locator(palette).innerText();
  check(/Nothing matched/.test(empty), 'a failed search says so plainly');
  check(/scholarships, summer programs/.test(empty),
    '…and says what IS searchable, rather than leaving a dead end');
  await closePalette(page);

  // ── On a phone ─────────────────────────────────────────────────────────────
  console.log('\nOn a phone');
  const phone = await signedInPage({ width: 390, height: 844 });
  const phoneErrors = [];
  phone.on('pageerror', e => phoneErrors.push(String(e)));
  await go(phone, '/home');
  const trigger = phone.locator('[data-tour="cmdk"]').first();
  const tb = await trigger.boundingBox();
  check(!!tb && tb.width >= 36 && tb.height >= 36,
    `the search button is a real touch target (${tb ? `${Math.round(tb.width)}×${Math.round(tb.height)}` : 'missing'})`);
  await trigger.click();
  await phone.waitForSelector(paletteInput, { timeout: 10000 });
  const sheet = await phone.locator(palette).boundingBox();
  check(!!sheet && sheet.height > 700,
    `the palette is a full-screen sheet, not a card the keyboard would cover (${sheet ? Math.round(sheet.height) : 0}px tall)`);
  const fontSize = await phone.locator(paletteInput).evaluate(el => getComputedStyle(el).fontSize);
  check(parseFloat(fontSize) >= 16,
    `the input is at least 16px so iOS does not zoom the whole app on focus (got ${fontSize})`);
  check(await phone.locator(`${palette} [aria-label="Close search"]`).count() > 0,
    'there is a real way out, since a phone has no Escape key');

  await phone.fill(paletteInput, 'regeneron');
  await phone.waitForFunction(
    () => !document.body.innerText.includes('Searching scholarships, programs and lessons…'),
    null, { timeout: 20000 },
  ).catch(() => {});
  await phone.waitForTimeout(600);
  const phoneResults = await phone.locator(palette).innerText();
  check(/Regeneron/i.test(phoneResults), 'the library is searchable on a phone too');
  const row = phone.locator(`${palette} [data-cmd-active="true"]`).first();
  const rb = await row.boundingBox();
  check(!!rb && rb.height >= 44, `result rows are thumb-sized (${rb ? Math.round(rb.height) : 0}px)`);

  console.log('\nConsole');
  check(errors.length === 0, `no uncaught page errors on desktop (${errors.slice(0, 3).join(' | ') || 'none'})`);
  check(phoneErrors.length === 0, `no uncaught page errors on the phone (${phoneErrors.slice(0, 3).join(' | ') || 'none'})`);
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} smart-search problem(s).` : '\nSmart search verified in a real browser.');
process.exit(failures ? 1 : 0);
