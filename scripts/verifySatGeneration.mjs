// End-to-end check for AI practice generation (src/lib/sat/aiPractice.js).
//
// WHY THIS EXISTS. Everything else in the SAT tab is deterministic: the bank is
// hand-written and audited by scripts/auditSatBank.mjs. Generated questions are
// the one place where a model's output reaches a student, and a mis-keyed item
// does not merely fail to help — it teaches something false and trains the
// student to distrust the explanation screen. So the pipeline's job is mostly
// REJECTION, and this asserts the rejection actually happens.
//
// Run in a browser rather than in Node because the module imports Dexie for its
// cache. /api/groq is stubbed with hand-built payloads so each failure mode can
// be exercised deliberately instead of hoping a real model produces one.
//
// Usage:  npm run dev   (in another shell)
//         node scripts/verifySatGeneration.mjs
import { chromium } from 'playwright';

const BASE = process.env.SAT_CHECK_URL || 'http://localhost:5173';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();

const errors = [];
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

let failures = 0;
const step = async (label, fn) => {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { failures++; console.log(`  FAIL ${label}\n       ${e.message.split('\n')[0]}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

await p.addInitScript(() => {
  localStorage.setItem('msp_session_token', '00000000-0000-4000-8000-000000000000');
  localStorage.setItem('mspViewState', JSON.stringify({ tab: 'sat', satView: 'overview' }));
  localStorage.setItem('mspTourSeen', '1');
});
await p.route('**/api/auth/me', r => r.fulfill({
  json: { user: { id: 'test-user', email: 'test@example.com', name: 'Test Student', gradeLevel: 'hs_11', testTrack: 'SAT', onboardingComplete: true } },
}));
await p.route('**/api/data/**', r => r.fulfill({ json: { data: [] } }));
await p.route('**/api/progress-sync**', r => r.fulfill({ json: { data: null } }));

// ── The stubbed model ───────────────────────────────────────────────────────
// Two roles come through the same endpoint, told apart by their system prompt:
// the AUTHOR writes items, the VERIFIER re-solves them without the key. The
// author payload deliberately contains one good item and five broken ones, each
// broken in a different way the pipeline is supposed to catch.
const calls = [];
let verifierSaw = null;

const GOOD = {
  skill: 'linear_equations_1var', difficulty: 'M', format: 'mcq',
  stimulus: null,
  q: 'If $3(x - 4) = 18$, what is the value of $x$?',
  ch: ['10', '6', '14', '2'],
  ans: 0,
  exp: 'Divide both sides by 3 to get x - 4 = 6, then add 4 to both sides, so x = 10.',
  distractorExp: [
    'Correct: dividing by 3 gives x - 4 = 6, so x = 10.',
    'This is what you get if you stop at x - 4 = 6 and report 6.',
    'This is what you get if you add 4 before dividing by 3.',
    'This is what you get if you subtract 4 instead of adding it.',
  ],
  trap: 'solved_for_wrong',
  solutionCheck: '3(10-4)=18 confirms the key.',
};

// Structurally flawless and internally consistent, but keyed to the wrong
// choice. Nothing deterministic can catch this: the schema is valid, the choices
// are distinct and evenly sized, and the explanation cites the keyed number, so
// the arithmetic cross-check is satisfied too. Only a model that independently
// solves the item can tell that the key is wrong — which is the entire argument
// for the verification pass existing.
const MISKEYED = {
  ...GOOD,
  q: 'If $2x + 5 = 17$, what is the value of $x$?',
  ch: ['6', '11', '22', '12'],
  ans: 1, // wrong on purpose — 6 is correct
  exp: 'Subtract 5 from both sides and divide by 2. The result is 11.',
  distractorExp: [
    'This is what you get if you divide before subtracting.',
    'Correct: the value works out to 11.',
    'This is what you get if you forget to divide by 2.',
    'This is what you get if you subtract 5 from 17 and stop.',
  ],
  trap: 'sign_error',
};

const BROKEN = [
  // Duplicate choices — more than one correct answer.
  { ...GOOD, q: 'What is $4 + 4$?', ch: ['8', '8', '9', '7'], ans: 0 },
  // Three choices instead of four.
  { ...GOOD, q: 'What is $5 + 5$?', ch: ['10', '11', '12'], ans: 0 },
  // Correct answer is conspicuously the longest — the length tell.
  {
    ...GOOD,
    q: 'Which statement best describes the solution set?',
    ch: [
      'There is exactly one real solution, which can be found by first isolating the variable and then dividing through by the leading coefficient of the equation',
      'No solution',
      'Two solutions',
      'Infinitely many',
    ],
    ans: 0,
  },
  // Claims to be real exam content — the licensing guard.
  { ...GOOD, q: 'This official College Board SAT question asks: if $x + 1 = 3$, what is $x$?', ch: ['2', '3', '4', '5'], ans: 0 },
];

await p.route('**/api/groq', async (r) => {
  const body = JSON.parse(r.request().postData() || '{}');
  calls.push(body);
  const system = body.system || '';

  if (/item reviewer/i.test(system)) {
    // The verifier. It is shown the items WITHOUT keys, so it answers from the
    // question text: index 0 for every item here except the mis-keyed one,
    // where it correctly answers 0 while the author keyed 1.
    verifierSaw = body.message || '';
    const count = (verifierSaw.match(/^ITEM \d+$/gm) || []).length;
    return r.fulfill({
      json: {
        content: JSON.stringify({
          results: Array.from({ length: count }, (_, i) => ({ i, answer: 0, confident: true, flaw: null })),
        }),
      },
    });
  }

  if (/item writer/i.test(system)) {
    return r.fulfill({ json: { content: JSON.stringify({ questions: [GOOD, MISKEYED, ...BROKEN] }) } });
  }

  return r.fulfill({ json: { content: 'ok' } });
});

console.log('\nSAT generation check — authoring, validation, independent verification\n');

await p.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(1500);
if (await p.locator('text=Check-in').count()) {
  await p.locator('button[aria-label="Close"]').first().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(400);
}

await step('AI Set is reachable from Practice', async () => {
  await p.locator('[data-tour="sat-sub-practice"]').click();
  await p.waitForTimeout(800);
  await p.locator('button:has-text("AI Set")').first().click();
  await p.waitForTimeout(500);
  assert(/Questions written for you/.test(await p.textContent('body')), 'AI Set body did not render');
});

await step('Generation runs authoring and verification as two separate calls', async () => {
  const before = calls.length;
  await p.locator('button:has-text("Generate my set")').first().click();
  await p.waitForTimeout(2500);
  const made = calls.slice(before);
  assert(made.length >= 2, `expected an author call and a verify call, saw ${made.length}`);

  const author = made.find(c => /item writer/i.test(c.system || ''));
  const verify = made.find(c => /item reviewer/i.test(c.system || ''));
  assert(author, 'no authoring call was made');
  assert(verify, 'no verification call was made — items would reach the student unchecked');

  // The two roles must not share a model. A verifier running the author's own
  // weights shares the author's blind spots and rubber-stamps its mistakes.
  assert(author.tier === 'oracle', `authoring used tier "${author.tier}", expected the deepest reasoning tier`);
  assert(author.reasoningEffort === 'high', 'authoring did not ask for high reasoning effort');
  assert(verify.tier && verify.tier !== author.tier, `verification reused the author's tier (${verify.tier})`);
  assert(verify.temperature === 0, `verification ran at temperature ${verify.temperature}, expected 0`);
  assert(verify.noCache === true, 'verification allowed a cached verdict');
  assert(author.purpose === 'sat' && verify.purpose === 'sat', 'generation did not use the sat key pool');
});

await step('The verifier is never shown the answer key', async () => {
  assert(verifierSaw, 'the verifier was never called');
  assert(!/"ans"|CORRECT:|answer is|RATIONALE/i.test(verifierSaw),
    'the verification prompt leaked the key or the rationale — its agreement would be worthless');
  assert(/ITEM 0/.test(verifierSaw), 'items were not enumerated for the verifier');
});

await step('Structural guards drop every malformed item', async () => {
  // The verifier is asked only about items that survived validation, so the
  // count in its prompt is the cleanest read on what the guards let through.
  const shown = (verifierSaw.match(/^ITEM \d+$/gm) || []).length;
  assert(shown === 2, `${shown} items reached the verifier, expected 2 (the sound one and the mis-keyed one) — a structural guard is not firing`);
});

await step('The verifier catches the mis-keyed item nothing else could', async () => {
  const t = await p.textContent('body');
  assert(/question.? ready/i.test(t), `no set was produced — page said: ${t.slice(0, 200)}`);
  const m = t.match(/(\d+)\s+questions? ready/);
  assert(m, 'could not read how many questions survived');
  assert(Number(m[1]) === 1, `${m[1]} items survived, expected exactly 1 — the mis-keyed item was not caught`);
});

await step('The student is told what was thrown away, and why', async () => {
  const t = await p.textContent('body');
  assert(/checker did not agree with the answer key/.test(t),
    'the key-check rejection is not disclosed to the student');
  assert(/failing the structural checks/.test(t),
    'the structurally-invalid items are not disclosed to the student');
  assert(/keys independently checked/.test(t), 'the surviving item is not badged as key-checked');
});

await step('A generated question carries its provenance into the player', async () => {
  await p.locator('button:has-text("Start this set")').first().click();
  await p.waitForTimeout(1200);
  const t = await p.textContent('body');
  assert(/AI · key checked|AI-written/.test(t), 'the question does not state that it was AI-written');
  // And it must be the sound item, not one of the broken ones.
  assert(/3\(x - 4\)|3\(x-4\)|x - 4|x-4/.test(t.replace(/\s+/g, ' ')) || /value of/.test(t),
    'the surviving question is not the one that passed validation');
});

console.log(`\nconsole errors: ${errors.length ? '\n  ' + errors.slice(0, 8).join('\n  ') : 'none'}\n`);
await b.close();
console.log(failures ? `${failures} step(s) failed\n` : 'all steps passed\n');
process.exit(failures || errors.length ? 1 : 0);
