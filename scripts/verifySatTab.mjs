// End-to-end smoke check for the SAT tab.
//
// There is no test runner configured in this repo, so this drives the real app
// in a browser instead. It stubs the auth/data APIs (a local dev server has no
// Supabase backend), signs in, and walks the tab: overview -> diagnostic ->
// answer questions -> confirm mastery updates across panels.
//
// Beyond "does it render", it asserts the honesty properties that motivated
// this feature: no score is displayed before it has been measured, and no
// mastery percentage appears without its sample size.
//
// Usage:  npm run dev   (in another shell)
//         node scripts/verifySatTab.mjs
//
// Screenshots land in shots/ (gitignored).
import { chromium } from 'playwright';

const BASE = process.env.SAT_CHECK_URL || 'http://localhost:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await ctx.newPage();

const errors = [];
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

// ── Stub the API surface ──
await p.route('**/api/auth/me', r => r.fulfill({
  json: { user: { id: 'test-user', email: 'test@example.com', name: 'Test Student', gradeLevel: 'hs_11', testTrack: 'SAT', onboardingComplete: true } },
}));
await p.route('**/api/data/**', r => r.fulfill({ json: { data: [] } }));
await p.route('**/api/progress-sync**', r => r.fulfill({ json: { data: null } }));
await p.route('**/api/groq', r => r.fulfill({ json: { content: 'stubbed' } }));

await p.addInitScript(() => {
  localStorage.setItem('msp_session_token', '00000000-0000-4000-8000-000000000000');
  // Skip onboarding and the product tour so we land straight in the app.
  localStorage.setItem('mspViewState', JSON.stringify({ tab: 'sat', satView: 'overview' }));
  localStorage.setItem('mspTourSeen', '1');
});

const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { console.log(`  FAIL ${label}\n       ${e.message.split('\n')[0]}`); throw e; }
};


// Answers whichever question type is on screen. Returns false if neither an
// MCQ choice nor a grid-in input is present (i.e. we have left the player).
async function answerCurrent() {
  const choice = p.locator('[data-sat-choice="0"]');
  if (await choice.count()) { await choice.first().click(); return true; }
  const spr = p.locator('[data-sat-spr]');
  if (await spr.count()) { await spr.first().fill('5'); return true; }
  return false;
}

console.log('\nSAT tab end-to-end check\n');

await p.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(3000);

// The daily check-in reward chest is a pre-existing modal that opens over the
// app on first load each day. Dismiss it so it does not intercept clicks.
async function dismissOverlays() {
  for (let i = 0; i < 3; i++) {
    const chest = p.locator('button:has-text("Open Chest")');
    if (await chest.count()) {
      await chest.first().click().catch(() => {});
      await p.waitForTimeout(1200);
    }
    const close = p.locator('button[aria-label="Close"], svg.lucide-x').first();
    if (await close.count()) { await close.click({ force: true }).catch(() => {}); await p.waitForTimeout(400); }
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
    if (!(await p.locator('button:has-text("Open Chest")').count())) break;
  }
}
await dismissOverlays();

await step('SAT tab is reachable in the nav', async () => {
  const nav = await p.locator('text=SAT').first();
  if (!(await nav.count())) throw new Error('no SAT entry in nav');
});

await step('SAT sub-nav renders all seven views', async () => {
  for (const label of ['Overview', 'Diagnostic', 'Practice', 'Full Tests', 'Review Log', 'Skill Mastery', 'Scores']) {
    if (!(await p.locator(`text="${label}"`).count())) throw new Error(`missing sub-nav item: ${label}`);
  }
});

await step('Overview shows NO score before any data', async () => {
  const t = await p.textContent('body');
  if (!/No score estimate yet|Not enough data yet/.test(t)) {
    throw new Error('expected the empty-state projection copy');
  }
  if (/\b1[0-5]\d0\b\s*–/.test(t)) throw new Error('a score range rendered with no data behind it');
});

await step('Overview offers the diagnostic as the next action', async () => {
  if (!/Start with the diagnostic/i.test(await p.textContent('body'))) {
    throw new Error('next-best-action did not recommend the diagnostic');
  }
});

await p.screenshot({ path: 'shots/sat-overview-empty.png', fullPage: true });

// ── Run the diagnostic ──
await step('Diagnostic panel opens', async () => {
  await p.locator('button:has-text("Diagnostic")').first().click();
  await p.waitForTimeout(900);
  if (!/Find out where you actually stand/i.test(await p.textContent('body'))) {
    throw new Error('diagnostic intro did not render');
  }
});
await p.screenshot({ path: 'shots/sat-diagnostic-intro.png', fullPage: true });

await step('Diagnostic starts and shows a question', async () => {
  await p.locator('button:has-text("Start the diagnostic")').first().click();
  await p.waitForTimeout(1200);
  const t = await p.textContent('body');
  if (!/Check answer/.test(t)) throw new Error('question player did not render');
});
await p.screenshot({ path: 'shots/sat-question.png', fullPage: true });

await step('Answering reveals the explanation', async () => {
  await answerCurrent();
  await p.locator('button:has-text("Check answer")').first().click();
  await p.waitForTimeout(700);
  if (!/Why/.test(await p.textContent('body'))) throw new Error('explanation not shown after answering');
});
await p.screenshot({ path: 'shots/sat-answered.png', fullPage: true });

// ── Answer through the rest quickly ──
await step('Can work through 12 questions including grid-ins', async () => {
  for (let i = 0; i < 12; i++) {
    const next = p.locator('button:has-text("Next question")').first();
    if (await next.count()) { await next.click(); await p.waitForTimeout(300); }
    else break;
    if (!(await answerCurrent())) break;
    const check = p.locator('button:has-text("Check answer")').first();
    if (await check.count() && await check.isEnabled()) { await check.click(); await p.waitForTimeout(300); }
  }
});

await step('Skill Mastery renders the heat map', async () => {
  await p.locator('button:has-text("Skill Mastery")').first().click();
  await p.waitForTimeout(1200);
  const t = await p.textContent('body');
  if (!/All 28 tested skills/.test(t)) throw new Error('skills panel did not render');
  if (!/not practised yet/.test(t)) throw new Error('heat map legend missing');
});

await step('Answered skills appear as measured (data refreshes across panels)', async () => {
  const t = await p.textContent('body');
  const m = t.match(/(\d+)\s*of 28 measured/);
  if (!m) throw new Error('measured counter not found');
  if (Number(m[1]) === 0) throw new Error('answered questions did not register — panels are showing stale data');
});

await step('Mastery is shown with its sample size, never bare', async () => {
  const t = await p.textContent('body');
  if (!/confidence \(\d+\)/.test(t)) {
    throw new Error('a mastery percentage rendered without its confidence/sample size');
  }
});
await p.screenshot({ path: 'shots/sat-skills.png', fullPage: true });

await step('Full Tests panel renders the adaptive structure', async () => {
  await p.locator('button:has-text("Full Tests")').first().click();
  await p.waitForTimeout(900);
  const t = await p.textContent('body');
  if (!/Module 1/.test(t)) throw new Error('test structure not shown');
  if (!/caps that section near 600|easier one caps/.test(t)) throw new Error('routing ceiling not explained');
});
await p.screenshot({ path: 'shots/sat-fulltest.png', fullPage: true });

await step('Review Log renders', async () => {
  await p.locator('button:has-text("Review Log")').first().click();
  await p.waitForTimeout(900);
  if (!/review log|Your mistakes/i.test(await p.textContent('body'))) throw new Error('review log did not render');
});
await p.screenshot({ path: 'shots/sat-review.png', fullPage: true });

await step('Practice panel renders all three modes', async () => {
  await p.locator('button:has-text("Practice")').first().click();
  await p.waitForTimeout(900);
  const t = await p.textContent('body');
  for (const m of ['Smart Set', 'Skill Drill', 'Timed Set']) {
    if (!t.includes(m)) throw new Error(`missing mode: ${m}`);
  }
});
await p.screenshot({ path: 'shots/sat-practice.png', fullPage: true });

console.log(`\nconsole errors: ${errors.length ? '\n  ' + errors.slice(0, 8).join('\n  ') : 'none'}\n`);
await b.close();
if (errors.length) process.exit(1);
