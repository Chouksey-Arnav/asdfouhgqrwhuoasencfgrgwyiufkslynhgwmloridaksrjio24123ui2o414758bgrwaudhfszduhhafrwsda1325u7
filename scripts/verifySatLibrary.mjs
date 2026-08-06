// End-to-end check for the Library — the browsable whole-bank section.
//
// The Library is the one route into the bank that is not chosen FOR the
// student: the selector picks their drill, the form builder assembles their
// test, and this screen lets them go and get whatever they want. That makes two
// properties worth asserting, and neither is caught by auditSatBank.mjs, which
// only ever sees the data:
//
//   1. Every filter dimension the bank actually has is reachable from the UI.
//      A 1,000-question bank filtered only by section and skill is a bank the
//      student cannot get at, whatever the audit says is in it.
//
//   2. Whatever they filter to, they can PRACTICE. The Library used to offer
//      practice only once a leaf skill was selected, so "all the Hard grid-ins
//      in Geometry" was browsable and undrillable — a slice you can read but
//      not sit is a catalog, not a study tool.
//
// Usage:  npm run dev   (in another shell)
//         node scripts/verifySatLibrary.mjs
import { chromium } from 'playwright';

const BASE = process.env.SAT_CHECK_URL || 'http://localhost:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await ctx.newPage();

const errors = [];
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await p.route('**/api/auth/me', r => r.fulfill({
  json: { user: { id: 'test-user', email: 'test@example.com', name: 'Test Student', gradeLevel: 'hs_11', testTrack: 'SAT', onboardingComplete: true } },
}));
await p.route('**/api/data/**', r => r.fulfill({ json: { data: [] } }));
await p.route('**/api/progress-sync**', r => r.fulfill({ json: { data: null } }));
await p.route('**/api/groq', r => r.fulfill({ json: { content: 'stubbed' } }));

await p.addInitScript(() => {
  localStorage.setItem('msp_session_token', '00000000-0000-4000-8000-000000000000');
  localStorage.setItem('mspViewState', JSON.stringify({ tab: 'sat', satView: 'library' }));
  localStorage.setItem('mspTourSeen', '1');
});

let failed = 0;
const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { failed++; console.log(`  FAIL ${label}\n       ${e.message.split('\n')[0]}`); }
};

console.log('\nSAT Library end-to-end check\n');

await p.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(3000);

// The daily check-in reward chest opens over the app on first load each day and
// stays up after it is opened, showing its "Nice!" panel. Escape alone does not
// close that second state, and while it is up every click on the page lands on
// the modal instead — which reads in the logs as a filter that "does nothing"
// rather than as an overlay, so it is worth dismissing thoroughly.
// Mirrors dismissOverlays() in scripts/verifySatTab.mjs.
async function dismissOverlays() {
  for (let i = 0; i < 4; i++) {
    const chest = p.locator('button:has-text("Open Chest")');
    if (await chest.count()) { await chest.first().click().catch(() => {}); await p.waitForTimeout(1200); }
    const close = p.locator('button[aria-label="Close"], svg.lucide-x').first();
    if (await close.count()) { await close.click({ force: true }).catch(() => {}); await p.waitForTimeout(400); }
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(400);
    if (!(await p.locator('button:has-text("Open Chest")').count())
      && !(await p.locator('text=Added to your total').count())) break;
  }
}
await dismissOverlays();

await step('Library panel renders', async () => {
  await p.waitForSelector('text=Narrow it down', { timeout: 15000 });
});

await step('header reports the full bank size, not a page of it', async () => {
  const txt = await p.locator('body').innerText();
  const m = txt.match(/(\d[\d,]{2,})\s*\n?\s*questions/i);
  if (!m) throw new Error('no bank-size figure on the page');
  const n = Number(m[1].replace(/,/g, ''));
  if (n < 1000) throw new Error(`bank size reads ${n}, expected the full bank`);
});

for (const label of ['Section', 'Domain', 'Difficulty', 'Format']) {
  await step(`${label} filter is present`, async () => {
    const el = p.locator(`text=${label}`).first();
    if (!(await el.count())) throw new Error(`no ${label} control`);
  });
}

await step('choosing a section narrows the domain choices to that section', async () => {
  await p.locator('button.sat-seg', { hasText: /^Math$/ }).first().click({ timeout: 10000 });
  await p.waitForTimeout(600);
  const txt = await p.locator('body').innerText();
  if (!/Advanced Math/.test(txt)) throw new Error('math domains not offered');
  if (/Craft and Structure/.test(txt)) throw new Error('R&W domains still offered under Math');
});

await step('a filter with no skill selected can still be practiced', async () => {
  const btn = p.locator('button:has-text("Practice")').first();
  if (!(await btn.count())) throw new Error('no practice button for a section-only filter');
  const label = await btn.innerText();
  if (!/\d/.test(label)) throw new Error(`practice button does not state a count: "${label}"`);
});

await step('narrowing to a domain keeps the set practicable', async () => {
  await p.locator('button.sat-seg', { hasText: /^Geometry and Trigonometry$/ }).first().click({ timeout: 10000 });
  await p.waitForTimeout(600);
  const btn = p.locator('button:has-text("Practice")').first();
  if (!(await btn.count())) throw new Error('no practice button for a domain filter');
});

await step('practicing a filter starts a session on that slice', async () => {
  await p.locator('button:has-text("Practice")').first().click({ timeout: 10000 });
  await p.waitForTimeout(2500);
  const choice = p.locator('[data-sat-choice="0"]');
  const spr = p.locator('[data-sat-spr]');
  if (!(await choice.count()) && !(await spr.count())) {
    throw new Error('no question player after pressing practice');
  }
});

console.log(`\nconsole errors: ${errors.length ? '\n  ' + errors.slice(0, 5).join('\n  ') : 'none'}`);
await b.close();

if (failed || errors.length) {
  console.log(`\nLibrary check FAILED (${failed} step failure(s), ${errors.length} console error(s))\n`);
  process.exit(1);
}
console.log('\nLibrary check passed.\n');
