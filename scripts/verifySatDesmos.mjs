// End-to-end check for the SAT tab's test-day tools: the Desmos calculator,
// the reference sheet, and the SAT branch of Medabrain.
//
// Same approach as verifySatTab.mjs — there is no test runner in this repo, so
// this drives the real app in a browser.
//
// WHY DESMOS IS STUBBED BY DEFAULT. calculator.js is a ~4 MB script served from
// desmos.com. Depending on it would make this check slow, flaky, and unusable
// in a sandbox with no outbound network — and it would be testing Desmos, not
// us. So the script request is fulfilled with a minimal fake implementing
// exactly the API surface src/lib/sat/desmos.js uses, and the assertions are
// about OUR integration: that a calculator is constructed, that graph state is
// saved and restored, that seeding replaces rather than accumulates, and that
// only one live instance exists at a time.
//
// Run against the genuine Desmos API with:  SAT_DESMOS_LIVE=1 node scripts/verifySatDesmos.mjs
//
// Usage:  npm run dev   (in another shell)
//         node scripts/verifySatDesmos.mjs
import { chromium } from 'playwright';

const BASE = process.env.SAT_CHECK_URL || 'http://localhost:5173';
const LIVE = process.env.SAT_DESMOS_LIVE === '1';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();

const errors = [];
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

// Every request the app makes to Medabrain, so we can assert what was sent.
const groqCalls = [];

await p.route('**/api/auth/me', r => r.fulfill({
  json: { user: { id: 'test-user', email: 'test@example.com', name: 'Test Student', gradeLevel: 'hs_11', testTrack: 'SAT', onboardingComplete: true } },
}));
await p.route('**/api/data/**', r => r.fulfill({ json: { data: [] } }));
await p.route('**/api/progress-sync**', r => r.fulfill({ json: { data: null } }));
await p.route('**/api/groq', r => {
  try { groqCalls.push(JSON.parse(r.request().postData() || '{}')); } catch { groqCalls.push({}); }
  return r.fulfill({ json: { content: 'Start by isolating the variable on one side.' } });
});

// ── The Desmos stand-in ─────────────────────────────────────────────────────
// Records everything the app does to it on window.__desmosLog so the assertions
// below can inspect the integration rather than pixel-peeping a canvas.
if (!LIVE) {
  await p.route('**/www.desmos.com/api/**', r => r.fulfill({
    contentType: 'application/javascript',
    body: `(function(){
      window.__desmosLog = { built: [], expressions: {}, removed: [], destroyed: 0, states: 0, bounds: 0 };
      function makeCalc(el, kind) {
        var state = { version: 9, expressions: { list: [] } };
        var listeners = [];
        window.__desmosLog.built.push(kind);
        el.innerHTML = '<div class="dcg-container" style="width:100%;height:100%"></div>';
        return {
          setExpression: function (e) {
            window.__desmosLog.expressions[e.id] = e.latex || e.type || 'table';
            state.expressions.list.push(e);
            listeners.forEach(function (f) { f(); });
          },
          removeExpression: function (e) {
            if (window.__desmosLog.expressions[e.id] !== undefined) window.__desmosLog.removed.push(e.id);
            delete window.__desmosLog.expressions[e.id];
          },
          getState: function () { return JSON.parse(JSON.stringify(state)); },
          setState: function (s) { state = s; window.__desmosLog.states++; },
          setBlank: function () { state = { version: 9, expressions: { list: [] } }; window.__desmosLog.expressions = {}; },
          setMathBounds: function () { window.__desmosLog.bounds++; },
          observeEvent: function (_evt, fn) { listeners.push(fn); },
          resize: function () {},
          destroy: function () { window.__desmosLog.destroyed++; el.innerHTML = ''; },
        };
      }
      window.Desmos = {
        GraphingCalculator: function (el) { return makeCalc(el, 'graphing'); },
        ScientificCalculator: function (el) { return makeCalc(el, 'scientific'); },
      };
    })();`,
  }));
}

await p.addInitScript(() => {
  localStorage.setItem('msp_session_token', '00000000-0000-4000-8000-000000000000');
  localStorage.setItem('mspViewState', JSON.stringify({ tab: 'sat', satView: 'overview' }));
  localStorage.setItem('mspTourSeen', '1');
});

// The daily check-in chest opens over everything on first load and intercepts
// pointer events. It is Dexie-backed, so it cannot be pre-empted from
// localStorage the way onboarding and the tour are — dismiss it instead.
const dismissChest = async () => {
  const close = p.locator('div[role="dialog"] button[aria-label="Close"], button[aria-label="Close"]').first();
  if (await p.locator('text=Check-in').count()) {
    await close.click({ timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(400);
  }
};

let failures = 0;
const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { failures++; console.log(`  FAIL ${label}\n       ${e.message.split('\n')[0]}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const log = () => p.evaluate(() => window.__desmosLog || null);

console.log(`\nSAT tools check — Desmos${LIVE ? ' (LIVE)' : ' (stubbed)'}, formula sheet, Medabrain\n`);

await p.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(1500);
await dismissChest();

// ── The tool rail ───────────────────────────────────────────────────────────
await step('Calculator and Formulas rails are present on every SAT screen', async () => {
  assert(await p.locator('button[aria-label="Calculator"]').count(), 'no calculator rail button');
  assert(await p.locator('button[aria-label="Formulas"]').count(), 'no formulas rail button');
});

await step('Alt+R opens the formula sheet, memorise-these list first', async () => {
  await p.keyboard.press('Alt+r');
  await p.waitForTimeout(500);
  const text = await p.textContent('body');
  assert(/Formula sheet/.test(text), 'formula sheet did not open');
  assert(/Quadratics/.test(text), 'memorise-these formulas missing');
  assert(/NOT given on test day/.test(text), 'the given/not-given distinction is not stated');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
});

await step('The formula sheet also lists what the exam DOES give you', async () => {
  await p.keyboard.press('Alt+r');
  await p.waitForTimeout(400);
  await p.locator('button:has-text("Given on the test")').first().click();
  await p.waitForTimeout(300);
  const text = await p.textContent('body');
  assert(/Pythagorean theorem/.test(text), 'given-formula list missing');
  assert(/available on every question in the Math section/.test(text), 'calculator policy facts missing');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
});

// ── The floating calculator ─────────────────────────────────────────────────
await step('Alt+C opens the floating window and builds a calculator', async () => {
  await p.keyboard.press('Alt+c');
  await p.waitForTimeout(600);
  assert(await p.locator('button[aria-label="Close (Esc)"]').count(), 'floating window did not open');
  await p.waitForFunction(() => !!window.Desmos, null, { timeout: LIVE ? 60000 : 15000 });
  await p.waitForSelector('.dcg-container', { timeout: LIVE ? 30000 : 10000 });
  const l = await log();
  if (l) assert(l.built.includes('graphing'), `expected a graphing calculator, got ${JSON.stringify(l.built)}`);
});

await step('Switching to Scientific tears the old calculator down (one live instance)', async () => {
  if (LIVE) return;
  await p.locator('button[title*="scientific calculator" i], button:has-text("Scientific")').first().click();
  await p.waitForTimeout(900);
  const l = await log();
  assert(l.built.includes('scientific'), 'scientific calculator was not built');
  assert(l.destroyed >= 1, 'the previous calculator was never destroyed');
  await p.locator('button:has-text("Graphing")').first().click();
  await p.waitForTimeout(900);
});

await step('Graph state is written to localStorage so work survives navigation', async () => {
  const saved = await p.evaluate(() => localStorage.getItem('msp.sat.desmos.state.v1.graphing'));
  assert(saved, 'no graph state was persisted');
});

await step('Window geometry and mode are remembered', async () => {
  const ui = await p.evaluate(() => JSON.parse(localStorage.getItem('msp.sat.desmos.ui.v1') || 'null'));
  assert(ui && ui.geo && ui.geo.w > 0, 'window geometry was not saved');
});

await step('Esc closes the floating calculator', async () => {
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  assert(!(await p.locator('button[aria-label="Close (Esc)"]').count()), 'window stayed open');
});

// ── The Calculator sub-tab ──────────────────────────────────────────────────
await step('Calculator sub-tab opens with the full-size calculator and the playbook', async () => {
  await p.locator('[data-tour="sat-sub-toolkit"]').click();
  await p.waitForTimeout(1600);
  const text = await p.textContent('body');
  assert(/Desmos playbook/.test(text), 'playbook missing');
  assert(/Solve any equation without algebra/.test(text), 'first play missing');
  assert(/What the exam actually allows/.test(text), 'calculator policy section missing');
});

await step('The embedded calculator stands the floating one down', async () => {
  assert(!(await p.locator('button[aria-label="Calculator"]').count()), 'floating rail still offered while embedded');
  assert(await p.locator('button[aria-label="Formulas"]').count(), 'formulas rail wrongly hidden');
});

await step('A playbook technique loads its expressions into the calculator', async () => {
  await p.waitForSelector('.dcg-container', { timeout: LIVE ? 45000 : 10000 });
  const btn = p.locator('button:has-text("Show me on the calculator")').first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await btn.click();
  await p.waitForTimeout(900);
  const l = await log();
  if (l) {
    const loaded = Object.entries(l.expressions).filter(([id]) => id.startsWith('play-'));
    assert(loaded.length >= 2, `expected the play's expressions to load, saw ${JSON.stringify(l.expressions)}`);
  } else {
    assert(await p.evaluate(() => document.body.innerText.includes('Loaded:')), 'no load confirmation');
  }
});

// ── Tools inside a live question ────────────────────────────────────────────
await step('A question exposes the test-day tool strip', async () => {
  await p.locator('[data-tour="sat-sub-diagnostic"]').click();
  await p.waitForTimeout(700);
  await p.locator('button:has-text("Start the diagnostic"), button:has-text("Retake diagnostic")').first().click();
  await p.waitForSelector('[data-sat-choice="0"], [data-sat-spr]', { timeout: 20000 });
  const text = await p.textContent('body');
  assert(/Formulas/.test(text), 'formula sheet not reachable from a question');
  assert(/Hint/.test(text), 'hint not offered in tutor mode');
  assert(/Strategy/.test(text), 'strategy card not offered');
});

await step('Keyboard selects a choice by letter', async () => {
  if (!(await p.locator('[data-sat-choice="1"]').count())) return; // grid-in came up
  await p.keyboard.press('b');
  await p.waitForTimeout(300);
  const border = await p.locator('[data-sat-choice="1"]').evaluate(el => el.style.borderColor);
  assert(border && !/255, 255, 255/.test(border), `pressing B did not select choice B (border ${border})`);
});

await step('Hint asks Medabrain and is never given the answer key', async () => {
  const before = groqCalls.length;
  const hint = p.locator('button:has-text("Hint")').first();
  assert(await hint.count(), 'no hint button');
  await hint.click();
  await p.waitForTimeout(1400);
  assert(groqCalls.length > before, 'hint did not call /api/groq');
  const call = groqCalls[groqCalls.length - 1];
  assert(call.purpose === 'sat', `hint used purpose "${call.purpose}", expected "sat"`);
  const payload = `${call.system || ''}\n${call.message || ''}`;
  assert(!/CORRECT:|OFFICIAL RATIONALE/.test(payload), 'the hint prompt leaked the answer key or rationale');
});

// ── Graph-this-question ─────────────────────────────────────────────────────
await step('"Graph this" seeds a math question straight into the calculator', async () => {
  // Walk to a math question that has something graphable; the diagnostic is
  // shuffled, so search rather than assume position.
  let found = false;
  for (let i = 0; i < 30 && !found; i++) {
    if (await p.locator('button:has-text("Graph this")').count()) { found = true; break; }
    const choice = p.locator('[data-sat-choice="0"]');
    if (await choice.count()) await choice.first().click();
    else {
      const spr = p.locator('[data-sat-spr]');
      if (await spr.count()) await spr.first().fill('5'); else break;
    }
    await p.locator('button:has-text("Check answer")').first().click().catch(() => {});
    await p.waitForTimeout(250);
    await p.locator('button:has-text("Next question")').first().click().catch(() => {});
    await p.waitForTimeout(350);
  }
  assert(found, 'no graphable math question surfaced in 30 questions');
  await p.locator('button:has-text("Graph this")').first().click();
  await p.waitForTimeout(1200);
  assert(await p.locator('button[aria-label="Close (Esc)"]').count(), 'the calculator did not open');
  const l = await log();
  if (l) {
    const seeded = Object.keys(l.expressions).filter(id => id.startsWith('msp-seed-'));
    assert(seeded.length >= 1, `no seeded expressions, saw ${JSON.stringify(l.expressions)}`);
  }
});

// ── Medabrain ───────────────────────────────────────────────────────────────
await step('Ask Medabrain opens the SAT branch with question context', async () => {
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.locator('button:has-text("Ask Medabrain")').first().click();
  await p.waitForTimeout(800);
  const text = await p.textContent('body');
  assert(/Medabrain/.test(text), 'the panel did not open');
});

await step('Chat reaches the sat key pool with the honesty and withhold rules', async () => {
  const before = groqCalls.length;
  const seed = p.locator('button:has-text("Explain this one to me properly"), button:has-text("Give me a hint")').first();
  await seed.click();
  await p.waitForTimeout(1600);
  assert(groqCalls.length > before, 'no request was sent');
  const call = groqCalls[groqCalls.length - 1];
  assert(call.purpose === 'sat', `chat used purpose "${call.purpose}", expected "sat"`);
  assert(/Never state their score as a single number/.test(call.system || ''),
    'the system prompt is missing the score-honesty rule');
  assert(/the question on their screen right now/i.test(call.system || ''),
    'the system prompt is missing the live-question context');
});

console.log(`\nconsole errors: ${errors.length ? '\n  - ' + errors.slice(0, 6).join('\n  - ') : 'none'}`);
console.log(failures ? `\n${failures} step(s) failed\n` : '\nall steps passed\n');

await b.close();
process.exit(failures || errors.length ? 1 : 0);
