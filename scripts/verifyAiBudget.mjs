#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// verifyAiBudget — the arithmetic that puts 150 students on a free Groq plan.
//
// The reason this is a build gate: every failure mode here is silent and costs
// money or availability rather than throwing.
//
//  1. THE BUDGET IS ACTUALLY ENFORCED, per lane and overall.
//  2. SAFETY IS NEVER BUDGETED. A rate limit that switches off the safety
//     classifier switches off detection for exactly the student sending a lot
//     of messages at one in the morning. That correlation is the worst one
//     available and the code must make it impossible, not unlikely.
//  3. EVERY PURPOSE THE APP ACTUALLY SENDS IS CLASSIFIED. An unmapped purpose
//     silently falls into the ambient lane, which is the conservative default
//     but would be a surprise if it happened to the coach.
//  4. AMBIENT IS CAPPED HARD. It is the highest-volume, lowest-intent traffic
//     in the product.
//  5. THE TOTALS FIT. 150 students × the per-student budget must sit well under
//     the free tier's daily ceiling, with the margin spent on burst headroom.
//
// Run by `npm run verify:ai-budget` (and by `npm run build`).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
const fail = (m) => { failures += 1; console.error(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const section = (n) => console.log(`\n${n}`);

// The module reaches for localStorage at call time. Node has none, so stand one
// up rather than making the module defensive about an environment it never runs
// in — a try//catch that hides a real quota error in a browser is worse.
globalThis.localStorage = {
  _: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._, k) ? this._[k] : null; },
  setItem(k, v) { this._[k] = String(v); },
  removeItem(k) { delete this._[k]; },
};

const B = await import(pathToFileURL(path.join(ROOT, 'src/lib/aiBudget.js')).href);

// ── 1. The budget is enforced ───────────────────────────────────────────────
section('The budget binds');
{
  B.resetBudget();
  let allowed = 0;
  // Spend the whole overall budget through the widest lane.
  for (let i = 0; i < B.DAILY_CALL_BUDGET * 3; i++) {
    if (!B.allow('coach').ok) break;
    B.spend('coach'); allowed += 1;
  }
  if (allowed >= B.DAILY_CALL_BUDGET) fail(`the coach lane allowed ${allowed} calls against a budget of ${B.DAILY_CALL_BUDGET}`);
  else ok(`the coach lane stops at ${allowed} calls (budget ${B.DAILY_CALL_BUDGET})`);
  const denied = B.allow('coach');
  if (denied.ok) fail('a spent budget still allowed a call');
  else if (!/budget/.test(denied.reason)) fail(`a spent budget refused with reason '${denied.reason}'`);
  else ok(`a spent budget refuses with '${denied.reason}'`);
  const u = B.usage();
  if (u.used !== allowed) fail(`usage() reports ${u.used} calls, ${allowed} were spent`);
  else ok('usage() reports what was actually spent');
}

// ── 2. Safety is never budgeted ─────────────────────────────────────────────
section('Safety is outside the budget, unconditionally');
{
  B.resetBudget();
  // Exhaust everything else first, then try safety.
  for (let i = 0; i < B.DAILY_CALL_BUDGET * 5; i++) { if (B.allow('coach').ok) B.spend('coach'); }
  const s = B.allow('safety');
  if (!s.ok) fail('the safety classifier was refused on a spent budget');
  else ok('the safety classifier is allowed on a fully spent budget');
  if (s.reason !== 'unbudgeted') fail(`safety was allowed as '${s.reason}' rather than 'unbudgeted'`);
  // Spending against it must be a no-op, or it would eventually starve itself.
  const before = B.usage().used;
  B.spend('safety', 50);
  if (B.usage().used !== before) fail('a safety call was charged to the budget');
  else ok('a safety call is never charged');
  // And it must not be switchable off by the ambient setting.
  if (!B.allow('safety', { ambientEnabled: false }).ok) fail('turning ambient off also turned off safety');
  else ok('the ambient switch cannot reach safety');
}

// ── 3. Every purpose the app sends is classified ────────────────────────────
section('Every purpose the app actually sends is mapped');
{
  // Read them out of the source rather than from a list somebody maintains by
  // hand — a purpose added in a component is exactly the one that gets missed.
  const found = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(js|jsx)$/.test(name)) continue;
      const src = readFileSync(full, 'utf8');
      for (const m of src.matchAll(/purpose:\s*'([a-z]+)'/g)) found.add(m[1]);
    }
  };
  walk(path.join(ROOT, 'src'));
  // 'sat' is the one deliberate exception: the pillar was pulled from the nav
  // (see RETIRED_TABS in src/lib/routes.js) so nothing can reach its call sites,
  // and mapping a purpose no student can trigger would be misleading.
  const RETIRED = new Set(['sat']);
  const unmapped = [...found].filter((p) => !B.PURPOSES[p] && !RETIRED.has(p));
  if (unmapped.length) fail(`unmapped purpose(s): ${unmapped.join(', ')} — add them to PURPOSES in src/lib/aiBudget.js`);
  else ok(`all ${found.size - [...found].filter((p) => RETIRED.has(p)).length} live purposes are classified`);

  for (const [id, cfg] of Object.entries(B.PURPOSES)) {
    if (!B.LANES[cfg.lane]) fail(`purpose '${id}' names lane '${cfg.lane}', which does not exist`);
    if (!(cfg.ttlMs >= 0)) fail(`purpose '${id}' has a negative cache TTL`);
    // A purpose with no fallback must never be silently droppable — the student
    // has to be told, so its lane must not be one that gets switched off.
    if (!cfg.fallback && B.LANES[cfg.lane]?.ambient) fail(`purpose '${id}' has no fallback but sits in a switchable lane`);
  }
  if (!failures) ok('every purpose names a real lane, a sane TTL, and is not silently droppable without a fallback');
}

// ── 4. Ambient is capped hard, and off is a real off ────────────────────────
section('Ambient traffic is capped');
{
  B.resetBudget();
  let n = 0;
  while (B.allow('ambient').ok) { B.spend('ambient'); n += 1; if (n > 100) break; }
  const cap = Math.ceil(B.DAILY_CALL_BUDGET * B.LANES.ambient.share);
  if (n !== cap) fail(`ambient allowed ${n} calls, the lane cap is ${cap}`);
  else ok(`ambient stops at ${n} calls a day (${Math.round(B.LANES.ambient.share * 100)}% of the budget)`);
  // Exhausting ambient must leave the student's own questions untouched — that
  // is the entire reason lanes exist.
  if (!B.allow('coach').ok) fail('a spent ambient lane also blocked the coach');
  else ok('a spent ambient lane leaves the student\'s own questions alone');

  B.resetBudget();
  const off = B.allow('ambient', { ambientEnabled: false });
  if (off.ok) fail('turning ambient off did not stop ambient calls');
  else if (!off.fallback) fail('a refused ambient call did not declare a local fallback — it would surface as an error');
  else ok('turning ambient off stops them, and the refusal declares its fallback');

  // Ambient answers must be cacheable for a long time; that is half the saving.
  if (B.cacheTtlFor('ambient') < 6 * 3600e3) fail('the ambient cache TTL is under six hours');
  else ok(`ambient answers are reusable for ${Math.round(B.cacheTtlFor('ambient') / 3600e3)} hours`);
}

// ── 5. The totals fit ───────────────────────────────────────────────────────
section('150 students fit inside the free tier');
{
  const STUDENTS = 150;
  // Groq's free tier on the models this app uses. Stated here rather than
  // assumed so a change to either number is a visible change to this file.
  const FREE_TIER_RPD = 14400;
  const daily = STUDENTS * B.DAILY_CALL_BUDGET;
  if (daily > FREE_TIER_RPD * 0.5) {
    fail(`${STUDENTS} students × ${B.DAILY_CALL_BUDGET} = ${daily} calls/day, over half the ${FREE_TIER_RPD}/day ceiling — the margin is what absorbs a busy evening`);
  } else {
    ok(`${STUDENTS} students × ${B.DAILY_CALL_BUDGET} = ${daily} calls/day, ${Math.round((daily / FREE_TIER_RPD) * 100)}% of the ${FREE_TIER_RPD}/day ceiling`);
  }

  // The server has to agree. A client budget the server does not back is a
  // suggestion to a browser, and a server limit tighter than the client's would
  // 429 students who were inside their own allowance.
  const groq = read('api/groq.js');
  if (!/ambient:\s*\d+/.test(groq)) fail("api/groq.js has no per-purpose limit for 'ambient'");
  else ok('api/groq.js carries its own ambient ceiling behind the client budget');
  if (!/CACHE_TTL_BY_PURPOSE/.test(groq)) fail('api/groq.js does not vary its response-cache TTL by purpose');
  else ok('api/groq.js caches ambient answers longer than conversation');
}

// ── 6. One door ─────────────────────────────────────────────────────────────
// The budget only works if every request goes through it. A component that
// builds its own fetch to /api/groq is spending money nobody counted, and the
// failure is silent — it works perfectly right up until the day the free tier
// runs out an hour early and nobody can say which surface did it.
//
// The chat and generation surfaces route through src/lib/medabrainRequest.js.
// The exceptions below are deliberate and each is named, so adding a sixth is a
// visible change to this file rather than an accident in a component.
section('Every budgeted surface goes through the one door');
{
  const EXEMPT = new Set([
    // The one door itself.
    'src/lib/medabrainRequest.js',
    // Generation jobs with their own retry, timeout and abort handling, which
    // medabrainRequest deliberately does not own (a plan build retries; a chat
    // turn must not). They are 'build'-lane and rate-limited server-side.
    'src/lib/masterPlanGenerator.js', 'src/lib/planGenerator.js', 'src/lib/roadmap/generator.js',
    // The safety classifier, which is unbudgeted by design (see section 2) and
    // must never be able to be refused by a client-side ledger.
    'src/lib/safety/classifier.js',
  ]);
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(js|jsx)$/.test(name)) continue;
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (EXEMPT.has(rel)) continue;
      // The SAT pillar is unreachable (see RETIRED_TABS in src/lib/routes.js), so
      // its call sites cannot spend anything.
      if (rel.startsWith('src/lib/sat/') || rel.startsWith('src/components/sat/')) continue;
      const src = readFileSync(full, 'utf8');
      if (/fetch\(\s*['"`]\/api\/groq/.test(src)) offenders.push(rel);
    }
  };
  walk(path.join(ROOT, 'src'));
  if (offenders.length) {
    fail(`these build their own /api/groq request instead of using postMedabrain(): ${offenders.join(', ')}`);
  } else {
    ok(`every reachable /api/groq call site outside the ${EXEMPT.size} named exceptions goes through the one door`);
  }

  // …and the one door must actually do all three jobs.
  const door = read('src/lib/medabrainRequest.js');
  for (const [needle, why] of [
    ['aiLane()', 'the one door does not attach the lane'],
    ['allow(', 'the one door does not check the budget'],
    ['spend(', 'the one door does not record the spend'],
    ['aboutBlock()', 'the one door does not attach the personalization'],
  ]) if (!door.includes(needle)) fail(why);
  // The budget must be checked BEFORE the request is built, or a refused call
  // has already cost a connection.
  if (door.indexOf('allow(') > door.indexOf('fetch(')) fail('the budget is checked after the request is sent');
  if (!failures) ok('the one door attaches the lane, checks and records the budget, and personalizes — before it sends');
}

console.log(failures ? `\n${failures} problem(s)\n` : '\nAI budget OK\n');
process.exit(failures ? 1 : 0);
