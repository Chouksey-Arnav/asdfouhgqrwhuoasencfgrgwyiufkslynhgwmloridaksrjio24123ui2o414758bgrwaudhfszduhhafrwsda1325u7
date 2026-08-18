// /api/groq.js — Vercel serverless function
// Proxies requests to Groq's OpenAI-compatible API server-side (key never exposed to browser).
// Powers Medabrain, routing each request to one of three named model tiers (Scout/Guide/Sage — see
// MODELS below) and, when additional Groq accounts are configured (up to 3 total), spreading/
// failing over requests across every account's key to maximize combined free-tier throughput.
//
// Daily rate limit: 300 requests per IP per day (well under Groq free-tier caps)
// Per-minute limit: 8 requests per minute per IP
// Plus a short in-memory response cache (see responseCache below) so repeated prompt shapes
// (e.g. the daily quiz-recommendation narration) don't re-hit Groq at all.

//
// ── Two layers, two vendors ─────────────────────────────────────────────────
// Everything below is LAYER 1: Groq, its per-purpose key pools, and failover
// between those keys. LAYER 2 lives in ./_lib/aiProviders.js — a second,
// independent vendor that is reached only when every Groq key in the pool has
// failed, and never as part of normal traffic. Read that file's header for why
// a deeper Groq pool could not solve the problem it solves: every key in this
// file is behind one company's rate limits and one company's uptime.
import { callWithRelief, hasRelief } from './_lib/aiProviders.js';

const dailyMap = new Map(); // bucket -> { count, resetAt }
const minuteMap = new Map(); // bucket -> { count, resetAt }
// Lowered from 1200/day and 20/min — the free-tier Groq key is shared across every user of the
// app, so these caps were far looser than actual usage warranted. Combined with the response
// cache below and the client-side caching in src/lib/aiCache.js, this keeps real Groq calls to
// only the requests that actually need a fresh answer.
const DAILY_LIMIT = 300;
const MINUTE_LIMIT = 8;
const DAILY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// ── Why the limits are per-purpose, and why plan generation gets its own ────
// A chat turn is ONE request. Building the Plans tab's plan is not: the generator makes several
// sequential Oracle calls for a single click (the roadmap spine, then the focused day window),
// each with its own retry. Under one flat 8-requests-per-minute-per-IP bucket, a single "generate
// my plan" click would burn the student's whole minute budget and then start 429-ing itself
// halfway through — and because every generation call resolves to a deterministic fallback rather
// than throwing, the student got a plan that looked finished, arrived suspiciously fast, and said
// the same three generic things every time ("Practice quiz", "Continue your pathway",
// "Flashcard review"). That is exactly the failure this split exists to make impossible.
//
// Buckets are keyed per (ip, purpose) so the budgets are genuinely independent: a plan build can
// never exhaust the coach's allowance, and normal chat use can never starve a plan build.
// 'roadmap' gets the largest per-minute allowance of any purpose and the smallest daily one, and
// the asymmetry is the point. A single build is four back-to-back Oracle calls with retries, so a
// tight minute bucket would 429 a student halfway through their own generation — the exact failure
// this per-purpose split was created to prevent. But a roadmap is a twelve-month artifact: a
// student has a legitimate reason to build one, rebuild it after a big change, and regenerate a
// season or two.
//
// ── Why the daily allowance moved from 25 ────────────────────────────────────
// A successful build spends five calls, and only successes are counted (see
// addRequestToday, which fires from respond()). Twenty-five therefore sounded
// like four builds and change. It is not, once the rest of the feature is
// counted: a student who edits their intake answers and rebuilds twice, whose
// third and fourth seasons each deepen as they come near, and who then asks for
// a repair after a bad night for the vendor, is at the cap having done nothing
// unreasonable — and the cap presents as the roadmap silently degrading, which
// is the one failure this whole subsystem is built to avoid. Forty is roughly
// eight honest builds and still nowhere near a runaway client loop, which would
// reach it inside a minute rather than across a day.
const MINUTE_LIMIT_BY_PURPOSE = { masterplan: 40, plan: 20, sat: 20, roadmap: 40 };
const DAILY_LIMIT_BY_PURPOSE = { masterplan: 150, plan: 60, sat: 200, roadmap: 40 };
function minuteLimitFor(purpose) { return MINUTE_LIMIT_BY_PURPOSE[purpose] || MINUTE_LIMIT; }
function dailyLimitFor(purpose) { return DAILY_LIMIT_BY_PURPOSE[purpose] || DAILY_LIMIT; }

// ── Response cache ────────────────────────────────────────────────────────────
// Many calls into this endpoint are near-identical across users/sessions (e.g. the quiz-
// recommendation narration, or an interview-prep rubric explanation) — cache by a hash of
// {tier, system prompt, last user message} so a repeat of the same prompt shape within the TTL
// is served for free instead of re-hitting Groq.
const responseCache = new Map(); // hash -> { content, model, expiresAt }
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

function hashKey(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function getCachedResponse(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { responseCache.delete(key); return null; }
  return entry;
}

function setCachedResponse(key, content, model) {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value); // evict oldest
  }
  responseCache.set(key, { content, model, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Model tiers ────────────────────────────────────────────────────────────
// Medabrain offers three named tiers, the same idea as picking between Claude's Haiku/Sonnet/Opus
// — each maps to a real Groq-hosted model:
//
// ── Why Scout and Sage moved off Llama, August 2026 ─────────────────────────
// Groq deprecated llama-3.1-8b-instant and llama-3.3-70b-versatile on August 16, 2026 (see
// https://console.groq.com/docs/deprecations) — both stopped being served entirely, which is what
// this whole rework was for. Groq's own migration guidance points llama-3.1-8b-instant callers at
// openai/gpt-oss-20b and llama-3.3-70b-versatile callers at openai/gpt-oss-120b or the (preview-
// only, not production-safe) qwen/qwen3.6-27b. Every text tier below is now one of the two models
// Groq actually lists as PRODUCTION: openai/gpt-oss-20b and openai/gpt-oss-120b. Nothing in this
// app calls a preview-tier or deprecated Groq model — a preview model can be pulled "at short
// notice with limited advance warning" per Groq's own docs, which is the exact failure this file
// exists to not repeat.
//
//   Scout — openai/gpt-oss-20b at low reasoning_effort, fastest/cheapest tier for quick turns and
//           lightweight generation. Used as the default for the main chat coach, the highest-
//           volume call in the app.
//   Guide — openai/gpt-oss-20b at medium reasoning_effort, the balanced tier for tasks that
//           benefit from more structure/reasoning than Scout without Sage's cost.
//   Sage  — openai/gpt-oss-20b at medium reasoning_effort, for when a student explicitly wants
//           deeper feedback (e.g. a full essay critique) and full-length answers, at Scout/Guide's
//           lighter token cost rather than Oracle's 120B one. Was the app-wide default once; kept
//           as the opt-in top tier for chat-facing surfaces.
// 'fast'/'deep' aliases are kept so any older cached client build still resolves to something.
//   Oracle — openai/gpt-oss-120b at high reasoning_effort, never offered in the student-facing
//            Scout/Guide/Sage picker; selected by code, for generation jobs where the output has
//            to be *correct* rather than merely fluent (the Plans tab's "master plan", the Roadmap
//            tab, and the SAT tab's practice item authoring). It is a 128K-context, 32,768-max-
//            output reasoning model with native Structured Outputs — the deepest, largest-output
//            model Groq hosts, worth the extra latency and token cost for a generation that
//            happens rarely and matters a lot. Authoring an SAT question is exactly that shape:
//            the model must actually solve the problem it just wrote in order to key it, which
//            is a reasoning task, not a writing task.
//
// The SAT answer-key verifier (src/lib/sat/aiPractice.js) used to run Sage on a different model
// family (Llama) than Oracle authors items on (gpt-oss), deliberately, so the verifier didn't
// share the author's blind spots. With Llama gone from Groq's production catalog, that
// cross-family independence isn't available from Groq alone anymore; the verifier still runs at a
// different reasoning_effort and temperature 0, which catches a real class of authoring mistakes,
// just not ones baked into the gpt-oss family's weights specifically.
const MODELS = {
  scout: 'openai/gpt-oss-20b',
  guide: 'openai/gpt-oss-20b',
  sage: 'openai/gpt-oss-20b',
  oracle: 'openai/gpt-oss-120b',
};
const TIER_ALIASES = { fast: 'scout', deep: 'guide' };
const TIER_LABELS = { scout: 'Scout', guide: 'Guide', sage: 'Sage', oracle: 'Oracle' };
// gpt-oss models accept an optional reasoning_effort ('low'|'medium'|'high') that trades latency
// for deeper chain-of-thought — only meaningful for that model family, so gate on the model id
// rather than trusting every caller to know which models support it.
const REASONING_CAPABLE_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
// Every tier is now a gpt-oss model, so reasoning_effort is what actually separates Scout from
// Guide from Sage rather than the model id — a caller that pins its own effort (e.g. the SAT
// verifier's temperature-0 pass) always wins; this is only the floor for callers that don't.
const TIER_DEFAULT_REASONING_EFFORT = { scout: 'low', guide: 'medium', sage: 'medium', oracle: 'high' };

// ── The Medabrain "brain" architecture — purpose-scoped key pools ───────────
// Medabrain is the head/meta brain of the app. Underneath it, distinct subsystems each get their
// own dedicated Groq account/key so their traffic (and free-tier rate limits) don't compete with
// each other, and so usage is attributable per subsystem. Every request carries a `purpose`:
//
//   coach     → the head Medabrain chat coach (the highest-volume, general-purpose surface)
//   interview → the mock-interview simulator (spoken, conversational, one live session at a time)
//   portfolio → portfolio intelligence: college-list/essay/activity/research guidance that reads a
//               student's full tracker
//   prep      → in-context prep help (a question about the current pathway lesson, quiz, or e-library
//               video) — high volume, must be cheap
//   plan      → the one-time onboarding "max-out plan" generation — low volume, deepest model
//   masterplan → the Plans tab's full day-by-day roadmap generation (see src/lib/masterPlanGenerator.js)
//               — rarest and heaviest calls in the app (multi-thousand-token structured JSON), so it
//               gets its own key pool and the biggest-output model (Oracle) rather than competing
//               with the onboarding 'plan' pool's rate limits.
//   roadmap   → the Roadmap tab's twelve-month admissions roadmap (see src/lib/roadmap/generator.js).
//               The heaviest single generation in the product: four sequential Oracle calls carrying
//               a catalog shortlist, a thirteen-question intake, and the student's whole Portfolio.
//               It is the ONLY purpose with a two-key pool of its own — see ROADMAP_KEYS below for
//               why, and for how a student is assigned to one of the two.
//
// Each purpose resolves to a POOL of keys. If purpose-specific keys are configured they're used;
// otherwise the purpose transparently falls back to the shared Medabrain pool (GROQ_API_KEY[/2/3]),
// so the app works end-to-end with a single key and only *improves* (more headroom, cleaner
// attribution) as you add dedicated ones. Within a pool the existing round-robin + failover logic
// (below) is unchanged.
//
// Env vars (see GROQ_SETUP.md):
//   GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3   → shared Medabrain head pool (also the fallback)
//   GROQ_API_KEY_INTERVIEW                          → interview simulator
//   GROQ_API_KEY_PORTFOLIO                          → portfolio tracker intelligence
//   GROQ_API_KEY_PREP                               → in-context prep help
//   GROQ_API_KEY_PLAN                               → Plans tab full day-by-day plan generation (and onboarding max-out plan fallback)
//   GROQ_API_KEY_SAT                                → SAT tab: generated practice, answer-key
//                                                      verification, study plans, hints,
//                                                      explanations and the SAT coach
//   GROQ_API_KEY_ROADMAP, GROQ_API_KEY_ROADMAP_2    → the Roadmap tab's two-key pool (see below)
const SHARED_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);

// ── The Roadmap's two-key pool, and why students are pinned to a lane ────────
// Roadmap generation is the most token-hungry thing this app does: building one
// student's year is four sequential Oracle calls, each carrying a catalog shortlist plus their
// whole Portfolio, and the output is thousands of tokens of structured JSON. One free-tier
// account's per-minute token budget cannot absorb a classroom of students doing that at once, so
// this purpose gets two accounts and spreads students across them.
//
// The spreading is DETERMINISTIC PER STUDENT (a hash of their user id picks the lane), not a
// round-robin counter, and that choice is load-bearing for three reasons:
//
//   1. SERVERLESS HAS NO SHARED COUNTER. Every warm instance of this function keeps its own
//      module-level `keyCursors` map. With N instances a round-robin does not alternate — each
//      instance independently walks its own cursor, and the actual split is whatever the
//      platform's routing happens to produce. Hashing the user id needs no shared state at all,
//      so it holds however many instances are running.
//   2. ONE STUDENT'S BUILD SHOULD NOT STRADDLE TWO ACCOUNTS. A single roadmap build is four
//      calls in a row. Alternating keys mid-build means a rate limit on either account can kill
//      a generation halfway through, and it makes "which account was this student's build on"
//      unanswerable when something goes wrong.
//   3. IT IS STABLE ACROSS RETRIES. A student who retries lands on the same account, so a retry
//      does not spend a second account's budget on work the first one already partly did.
//
// The result is exactly the alternating behaviour intended — with two keys, hashing user ids
// splits the student body ~50/50 — while surviving the fact that these are stateless functions.
// Failover to the other key on a 429/5xx is unchanged (see callGroqWithFailover), so a student
// pinned to a capped account still gets served rather than failing.
//
// With only ONE roadmap key configured, every student uses it and nothing breaks. With none, the
// purpose falls back to the shared Medabrain pool like every other purpose.
const ROADMAP_KEYS = [process.env.GROQ_API_KEY_ROADMAP, process.env.GROQ_API_KEY_ROADMAP_2].filter(Boolean);

const PURPOSE_KEYS = {
  interview: [process.env.GROQ_API_KEY_INTERVIEW].filter(Boolean),
  portfolio: [process.env.GROQ_API_KEY_PORTFOLIO].filter(Boolean),
  // Essay critique and supplemental-prompt generation. Falls back to the portfolio key when no
  // dedicated one is set (it is portfolio work), and to the shared pool when neither exists —
  // same "works with one key, improves as you add more" contract as every other purpose.
  essay: [process.env.GROQ_API_KEY_ESSAY || process.env.GROQ_API_KEY_PORTFOLIO].filter(Boolean),
  prep: [process.env.GROQ_API_KEY_PREP].filter(Boolean),
  plan: [process.env.GROQ_API_KEY_PLAN].filter(Boolean),
  masterplan: [process.env.GROQ_API_KEY_PLAN].filter(Boolean),
  sat: [process.env.GROQ_API_KEY_SAT].filter(Boolean),
  // Two keys, not one — the only purpose configured this way. See ROADMAP_KEYS above.
  roadmap: ROADMAP_KEYS,
};
const VALID_PURPOSES = new Set(['coach', 'interview', 'portfolio', 'prep', 'plan', 'masterplan', 'sat', 'essay', 'roadmap']);

// Every subsystem must still resolve to at least one real key, so a purpose with no dedicated key
// falls back to the shared Medabrain pool. Returns { primary, fallback } rather than one flat pool:
// primary is what this purpose should actually be spending its traffic on (its own dedicated
// key(s), or the shared pool if it has none of its own); fallback is the shared pool held in
// reserve for genuine failover only, never proactively mixed into primary's rotation — otherwise a
// purpose with a dedicated key configured would still routinely spend requests on the shared pool,
// defeating the entire point of giving it its own key.
function keysForPurpose(purpose) {
  const dedicated = PURPOSE_KEYS[purpose] || [];
  const primary = dedicated.length ? [...new Set(dedicated)] : [...new Set(SHARED_KEYS)];
  const fallback = dedicated.length ? SHARED_KEYS.filter(k => !dedicated.includes(k)) : [];
  return { primary, fallback };
}

// Every configured key anywhere — used only for the "is anything configured at all?" guard.
const ALL_KEYS = [...new Set([...SHARED_KEYS, ...Object.values(PURPOSE_KEYS).flat()])];

// Default model tier per purpose when the caller doesn't pin one — keeps each subsystem on the
// cheapest tier that's still good enough for its job (the whole point of splitting keys is to run
// high-volume surfaces cheap while reserving Sage's higher reasoning_effort for the rare,
// high-value plan generation).
const PURPOSE_DEFAULT_TIER = {
  coach: 'guide',
  // Prep was on Scout (low reasoning_effort) purely for cost. But this surface is a tutor: a
  // student asking "why does the loop of Henle work like that" gets an answer
  // that is either right or quietly wrong, and low effort is where quietly wrong lives.
  // Guide is the cheapest tier that reliably teaches rather than paraphrases.
  prep: 'guide',
  // Portfolio answers admissions questions with real-world specifics —
  // deadlines, ED/EA mechanics, what particular schools want. That is factual
  // recall under a reasoning task, which is exactly where Sage's higher reasoning_effort earns
  // its latency. This surface is also low-volume compared to the head coach.
  portfolio: 'sage',
  interview: 'guide',  // conversational, low-latency for spoken turns
  // A line-by-line essay critique is the single hardest judgment call the app makes: it has to
  // read 650 words closely, tell a cliché from a real detail, and defend a grade a student will
  // argue with. Sage is the floor for that — a small model reads an essay and produces exactly the
  // agreeable mush this feature exists to eliminate.
  essay: 'sage',
  plan: 'oracle',      // one-time, max-quality — worth the biggest-output model (Oracle) for max completion/reasoning
  masterplan: 'oracle', // rare, large structured generation — worth the biggest-output model
  // Oracle (openai/gpt-oss-120b), always. This is the largest-context (131K), largest-max-output
  // (32,768) model Groq hosts, with native JSON mode and a tunable reasoning_effort — and the
  // roadmap is the one generation in this app where all three matter at once: the prompt carries a
  // whole catalog shortlist plus a Portfolio, the answer is a year of structured JSON, and getting
  // the SEQUENCING right (this before that, because the letters take three weeks) is a reasoning
  // problem rather than a writing one. Nothing smaller is worth trying here.
  roadmap: 'oracle',
  // The SAT tab pins its tier per call rather than leaning on this default,
  // because its three call shapes want three different models (see
  // src/lib/sat/aiPractice.js): Oracle + high reasoning_effort to AUTHOR items,
  // Sage to independently VERIFY the answer keys those items were given, and
  // Guide for conversational coaching. Sage is the safe middle if a caller
  // forgets — never Scout, because a wrong answer key teaches something false.
  sat: 'sage',
};

// One rotation cursor per purpose (not a single shared counter) — otherwise unrelated purposes'
// request volume perturbs each other's rotation position for no reason. Only `primary` is ever
// rotated for load-spreading; `fallback` is appended in fixed order and only reached via the
// failover loop below, so a purpose's dedicated key(s) are always tried before the shared pool.
const keyCursors = new Map();

// Purposes whose key is chosen by WHO is asking rather than by arrival order. Only 'roadmap' —
// see the ROADMAP_KEYS header for the three reasons a stateless round-robin is the wrong tool
// for a multi-call generation on serverless. `lane` is a caller-supplied stable identifier for
// the student (their user id); with two keys configured this splits the student body evenly and
// keeps each student's whole build on one account.
const STICKY_LANE_PURPOSES = new Set(['roadmap']);

// FNV-1a over the lane string. Deliberately the same tiny hash `hashKey` above uses: it is not
// cryptographic and does not need to be — it needs to be stable across instances and deploys,
// which a JS string hash is and Math.random() emphatically is not.
function laneIndex(lane, size) {
  if (!lane || size <= 1) return 0;
  let h = 2166136261;
  const s = String(lane);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % size;
}

function keyOrderForThisRequest(purpose, { primary, fallback }, lane = null) {
  let orderedPrimary = primary;
  if (primary.length > 1) {
    // A sticky purpose with a lane rotates to that student's assigned key and stays there. The
    // rest of the pool still follows, so failover on a 429 works exactly as before — the lane
    // decides where a request STARTS, never where it is allowed to end up.
    const start = (STICKY_LANE_PURPOSES.has(purpose) && lane)
      ? laneIndex(lane, primary.length)
      : (() => {
        const cursor = keyCursors.get(purpose) || 0;
        keyCursors.set(purpose, (cursor + 1) % primary.length);
        return cursor % primary.length;
      })();
    orderedPrimary = [...primary.slice(start), ...primary.slice(0, start)];
  }
  return [...orderedPrimary, ...fallback];
}

// One bucket per (ip, purpose) — see MINUTE_LIMIT_BY_PURPOSE above for why they are separate.
const bucketKey = (ip, purpose) => `${ip}|${purpose}`;

function isDailyLimited(ip, purpose) {
  const key = bucketKey(ip, purpose);
  const now = Date.now();
  const entry = dailyMap.get(key);
  if (!entry || now > entry.resetAt) {
    dailyMap.set(key, { count: 0, resetAt: now + DAILY_MS });
    return false;
  }
  return entry.count >= dailyLimitFor(purpose);
}

function getRequestsUsedToday(ip, purpose) {
  const entry = dailyMap.get(bucketKey(ip, purpose));
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) return 0;
  return entry.count;
}

function addRequestToday(ip, purpose) {
  const key = bucketKey(ip, purpose);
  const now = Date.now();
  const entry = dailyMap.get(key);
  if (!entry || now > entry.resetAt) {
    dailyMap.set(key, { count: 1, resetAt: now + DAILY_MS });
  } else {
    entry.count += 1;
  }
}

// Returns 0 when the request is allowed, otherwise the milliseconds until this bucket resets —
// so the 429 can tell the caller exactly how long to back off instead of leaving it to guess.
function minuteLimitRetryMs(ip, purpose) {
  const key = bucketKey(ip, purpose);
  const now = Date.now();
  const entry = minuteMap.get(key);
  if (!entry || now > entry.resetAt) {
    minuteMap.set(key, { count: 1, resetAt: now + MINUTE_MS });
    return 0;
  }
  if (entry.count >= minuteLimitFor(purpose)) return Math.max(250, entry.resetAt - now);
  entry.count += 1;
  return 0;
}

// Most callers (chat-style coach/interview/portfolio turns) are fine with a 2500-char input cap.
// 'prep' is the exception: besides in-context lesson Q&A, it's also used by the flashcard AI
// polish pass (src/lib/flashcards/aiPolish.js), which sends a notes excerpt plus a batch of draft
// cards as JSON in a single message — comfortably larger than a chat turn, so it gets a higher cap.
// 'masterplan' prompts carry a resource catalog (real pathway/quiz/library/portfolio names) plus
// the full onboarding profile and live app-state signals, so they routinely run several thousand
// characters longer than a chat turn.
// 'sat' sits alongside them: an item-generation request carries the student's
// measured skill profile (weak skills with sample sizes, their triaged error
// mix, the specific traps they keep falling for) plus a per-skill blueprint for
// every item being asked for. That is the whole point of the feature — a
// generator that only sees "make 6 Boundaries questions" cannot personalise
// anything — and it does not fit in a chat-sized 2500-char budget.
// 'essay' carries a full draft (a 650-word personal statement is ~4000 chars on its own, and a
// student may paste one well over the limit precisely because they want it cut down) plus the
// prompt it answers and the portfolio context that lets the critique cite their real experiences.
// The chat-sized 2500-char cap would silently truncate the essay mid-paragraph and then critique
// the fragment as if it were the whole thing — a wrong verdict delivered confidently.
// 'masterplan' was raised from 9,000 once plan generation began reading the student's ENTIRE
// Portfolio row by row (every college with its own deadline, every essay with its word count and
// staleness, clinical sites, gaps, plus measured performance and plan-adherence history — see
// buildProfileFactsText in src/lib/masterPlanGenerator.js). At 9,000 that digest was silently
// truncated from the end, which for a day-chunk request cut off the list of days to generate:
// the model would return a short plan and nobody would know why. The client enforces its own
// prioritised budget under this ceiling, so this is a backstop, not the working limit.
// 'roadmap' is the largest input budget in the app, and it is spent on things that are all
// load-bearing: a shortlist of up to 48 real catalog entries (each with its dates, eligibility and
// lead time), the student's thirteen intake answers including a free-text box they were invited to
// fill, and the same full Portfolio digest masterplan carries. Truncating any of it produces a
// roadmap that silently omits whole categories of the student's year — the failure that is
// impossible to notice by reading the output, because what is missing looks like nothing at all.
//
// ── Why 'roadmap' was raised from 26,000 ────────────────────────────────────
// 26,000 chars is roughly 6,500 tokens. Oracle's context window is 131,072. The
// cap was therefore not protecting the model from anything — it was protecting
// us from a runaway client, which is a real job, but it was set two orders of
// magnitude below the only limit that physically exists. What it actually did
// was cut the tail off a full catalog shortlist on the select pass, which is the
// one pass where the tail is the point: the last entries in that list are real
// programs the student is eligible for, and losing them is invisible in the
// output because a missing option looks like nothing at all. Worse, the loss was
// silent, so the client retried the same oversized payload until it gave up and
// shipped the deterministic slate — the "context is too big" failure, in full.
//
// 90,000 chars (~22k tokens) leaves Oracle five times that in headroom for its
// reasoning and its 32k of output, and still stops a broken loop from posting a
// megabyte. The client does its own prioritised budgeting well under this
// ceiling (src/lib/roadmap/promptBudget.js), so this stays what it always should
// have been: a backstop, not the working limit.
const MAX_INPUT_CHARS_BY_PURPOSE = { prep: 8000, masterplan: 20000, sat: 9000, essay: 14000, roadmap: 90000 };
const DEFAULT_MAX_INPUT_CHARS = 2500;
function inputCharsFor(purpose) { return MAX_INPUT_CHARS_BY_PURPOSE[purpose] || DEFAULT_MAX_INPUT_CHARS; }

// Sanitize incoming messages to prevent prompt injection / oversized payloads
function sanitizeMessages(messages, purpose) {
  if (!Array.isArray(messages)) return null;
  const cap = inputCharsFor(purpose);
  return messages
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({
      role: ['user', 'assistant'].includes(m.role) ? m.role : 'user',
      content: String(m.content).slice(0, cap),
    }))
    .slice(-10); // keep last 10 messages only — trimmed from 20 to cut token cost per call
}

export default async function handler(req, res) {
  // ── CORS preflight ─────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Get client IP ──────────────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

  // Rate limiting is per (ip, purpose) and so cannot run until the body has been parsed and the
  // purpose resolved — see the checks below, after the cache lookup. Serving a cache hit before
  // spending any of the budget is deliberate: a cached answer costs Groq nothing.

  // ── API key check ──────────────────────────────────────────────────────────
  // `code` is the machine-readable half of every error this handler returns, and
  // it exists because of a real failure the roadmap generator could not tell
  // apart from a flaky one. A multi-pass generation retries a "retryable" error
  // four times per pass; with no key configured, every one of those twenty calls
  // fails identically, the build takes ninety seconds to arrive at the
  // deterministic slate, and the student's "rebuild it properly" button does the
  // exact same twenty calls again. A caller that can read `code` knows on the
  // first failure that no amount of retrying will help, and can say so out loud
  // instead of spending the student's afternoon proving it.
  //
  // The codes are a closed vocabulary — see TERMINAL_CODES in
  // src/lib/roadmap/generator.js, which is the consumer that acts on them.
  if (!ALL_KEYS.length) {
    return res.status(500).json({
      code: 'not_configured',
      error: 'Medabrain is not configured. Set GROQ_API_KEY (and optionally GROQ_API_KEY_2 / GROQ_API_KEY_3) in your environment variables.',
    });
  }

  // ── Parse and validate body ────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const {
    system, message, messages: rawMessages, maxTokens = 700, tier: rawTier, purpose: rawPurpose,
    jsonMode, reasoningEffort: rawReasoningEffort, temperature: rawTemperature, noCache,
    lane: rawLane,
  } = body || {};

  // Which key lane this caller belongs to, for the purposes that pin a student to one account
  // (currently only 'roadmap' — see STICKY_LANE_PURPOSES). It is an OPAQUE, CAPPED STRING and it
  // is used for exactly one thing: choosing an index into an array of keys. It is never logged,
  // never sent upstream, and never trusted for authorization — a caller who forges someone else's
  // lane achieves nothing except being served by the other of two interchangeable Groq accounts.
  // That is why this endpoint can keep taking a client-supplied value rather than requiring a
  // session: the blast radius of a lie is zero.
  const lane = typeof rawLane === 'string' && rawLane ? rawLane.slice(0, 64) : null;

  if (!message && !rawMessages) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  // Which Medabrain subsystem this call belongs to — selects the key pool (and, when the caller
  // doesn't pin a tier, the default model). Unknown/absent purpose falls back to the head coach,
  // which is exactly how every existing caller behaves, so this stays backward compatible.
  const purpose = VALID_PURPOSES.has(rawPurpose) ? rawPurpose : 'coach';
  const keyPool = keysForPurpose(purpose);

  // Caller may still pin a tier; otherwise use the purpose's cost-appropriate default.
  const effectiveRawTier = rawTier || PURPOSE_DEFAULT_TIER[purpose] || 'guide';
  const tier = TIER_ALIASES[effectiveRawTier] || effectiveRawTier;
  const model = MODELS[tier] || MODELS.guide;

  // ── Build messages array (OpenAI-compatible format) ────────────────────────
  const groqMessages = [];
  // Cap raised from 1200 → 4000: Medabrain's system prompt (see
  // src/lib/studentProfile.js buildCoachSystemPrompt) now folds in a
  // student's onboarding goal/obstacles/study habits alongside live
  // Prep/Portfolio signals, which runs meaningfully longer than the old
  // generic prompt. Still capped well below Groq's context window so a
  // pathological client payload can't blow up per-request token cost.
  // 'masterplan' gets a much higher cap: its system prompt carries a real resource catalog
  // (pathway units, quiz categories, library subjects, portfolio tools) the model needs intact to
  // ground the plan in things that actually exist in the app — see src/lib/masterPlanGenerator.js.
  // Default nudged 4000 → 4800: buildCoachSystemPrompt (src/lib/studentProfile.js) now also folds
  // in a condensed summary of the student's Plans-tab master plan (today's tasks, week theme),
  // and that block is appended near the end, right before the behavioral guardrail paragraph — a
  // cap that's too tight would truncate the guardrails themselves before the model ever sees them.
  // 'sat' matches masterplan's headroom: the item-authoring system prompt is the
  // longest in the app (blueprint fidelity rules, the distractor-design
  // contract, the answer-key discipline rules, the licensing prohibition and
  // the JSON schema), and truncating it would cut the safety rules at the end
  // while leaving the "write questions" instruction at the top intact — the
  // worst possible failure mode for this particular prompt.
  // Raised across the board when the prompts gained two large blocks: the
  // student's personal brief ("Tell Medabrain about yourself" — their own words,
  // treated as ground truth) and the shared knowledge policy that tells the
  // model to use its full world knowledge rather than refusing anything outside
  // the student's tracked data. Both are appended near the end, and truncation
  // here would silently cut the behavioral rules while leaving the raw data in
  // place — the exact inversion of what a cap is for. Input tokens are the cheap
  // half of a request, so headroom is the right trade.
  // 'portfolio' gets the largest budget of any purpose, and it earns it. Its prompts carry the
  // student's tracked record verbatim — every activity with the description and impact THEY
  // wrote, their term-by-term GPA history, and (for the Activities & Resume Builder's deep
  // reads) a matched school slate with real admitted-student averages attached. That verbatim
  // text is the entire point: a coach handed "4 activities logged" can only give generic advice,
  // while a coach handed the sentences can quote the weak one back. Ten activities of real text
  // plus the academic block plus the shared stance/knowledge-policy blocks runs past 12k, and
  // truncation there cuts the behavioral rules at the end while leaving the data intact — the
  // exact inversion of what a cap is for.
  // 'roadmap' carries its catalog shortlist in the SYSTEM prompt (the model is
  // selecting from a fixed list, so the list is part of its instructions rather
  // than part of the conversation). At 16,000 that list was the thing being cut:
  // stance + date rule + season table + the JSON contract is ~4,000 chars before
  // a single catalog entry, and 48 entries with their dates, eligibility and
  // lead times is ~14,000 more. See the MAX_INPUT_CHARS note above — same
  // reasoning, same arithmetic, same 131K window this is nowhere near.
  const MAX_SYSTEM_CHARS_BY_PURPOSE = { masterplan: 12000, sat: 12000, portfolio: 20000, essay: 12000, roadmap: 60000 };
  const systemCap = MAX_SYSTEM_CHARS_BY_PURPOSE[purpose] || 9000;

  // ── Truncation is reported, not swallowed ─────────────────────────────────
  // These caps have always been backstops, and a backstop that fires silently is
  // indistinguishable from one that never fires. When a roadmap's catalog
  // shortlist ran past the input cap, the tail — the last dozen real programs a
  // student could have been given — was cut off mid-entry, and the only visible
  // symptom was a build that came back thin or would not parse at all. Nothing
  // in the response said the request had been cut, so the client retried the
  // identical oversized payload three more times and then fell back to the
  // deterministic slate.
  //
  // So the handler now measures what it removed and says so in the response.
  // The roadmap generator reads it and rebuilds the same pass at a smaller size
  // (see fitToBudget in src/lib/roadmap/promptBudget.js) instead of retrying a
  // request that cannot fit. Callers that do not read it are unaffected.
  const truncated = { system: 0, input: 0 };
  const systemPrompt = system
    ? String(system).slice(0, systemCap)
    : 'You are Medabrain, an AI coach for high school students (grades 9-12) preparing for undergraduate admissions and a future health career — not graduate or professional school. Be concise, accurate, and encouraging.';
  if (system && String(system).length > systemCap) truncated.system = String(system).length - systemCap;
  groqMessages.push({ role: 'system', content: systemPrompt });

  if (rawMessages) {
    const cleaned = sanitizeMessages(rawMessages, purpose);
    if (cleaned) groqMessages.push(...cleaned);
    // Measured against the messages that were KEPT, so the ordinary "only the
    // last ten turns travel" trim of a long chat is not reported as truncation.
    // What is reported is a single message that did not fit its cap — the case
    // that silently changes what the model was asked.
    const kept = (Array.isArray(rawMessages) ? rawMessages : [])
      .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
      .slice(-10);
    const before = kept.reduce((n, m) => n + m.content.length, 0);
    const after = (cleaned || []).reduce((n, m) => n + m.content.length, 0);
    if (before > after) truncated.input = before - after;
  } else if (message) {
    const cap = inputCharsFor(purpose);
    groqMessages.push({ role: 'user', content: String(message).slice(0, cap) });
    if (String(message).length > cap) truncated.input = String(message).length - cap;
  }
  const wasTruncated = truncated.system > 0 || truncated.input > 0;

  if (groqMessages.length <= 1) {
    return res.status(400).json({ error: 'No valid messages to send.' });
  }

  // ── Cache lookup ────────────────────────────────────────────────────────────
  // Keyed on the exact prompt shape actually sent to Groq (post-sanitization), so a repeat of
  // the same tier/system/last-message combo — from this user or any other — is served from
  // cache without touching the daily/minute limits or the Groq API at all.
  //
  // `noCache` opts a caller out entirely. Generation is the case that needs it:
  // "give me another set" with the same profile and the same skill hashes to the
  // same key, so a cached response would hand the student the exact questions
  // they just finished. Correctness-critical verification calls opt out too —
  // a verifier that can be served a stale verdict is not a verifier.
  // Plan generation opts out unconditionally, not just when the caller remembers to ask. Its
  // prompts are deterministic functions of the student's profile, so "regenerate my plan" hashes
  // to the same key as the build it is trying to replace — a cache hit there hands the student
  // back the identical plan and makes the button look broken.
  // 'roadmap' joins them for the same reason: its prompts are a deterministic function of the
  // intake, so "rebuild my roadmap" hashes identically to the build it is replacing and a cache
  // hit would hand the student back the roadmap they just asked to change.
  const NEVER_CACHED_PURPOSES = new Set(['masterplan', 'plan', 'roadmap']);
  const lastUserMsg = [...groqMessages].reverse().find(m => m.role === 'user')?.content || '';
  const cacheable = !noCache && !NEVER_CACHED_PURPOSES.has(purpose);
  const cacheKey = hashKey(`${purpose}|${tier}|${systemPrompt}|${lastUserMsg}`);
  const cached = cacheable ? getCachedResponse(cacheKey) : null;
  if (cached) {
    return res.status(200).json({
      content: cached.content,
      model_used: cached.model,
      tier,
      purpose,
      tierLabel: TIER_LABELS[tier] || tier,
      requestsUsedToday: getRequestsUsedToday(ip, purpose),
      requestsRemaining: Math.max(0, dailyLimitFor(purpose) - getRequestsUsedToday(ip, purpose)),
      dailyLimit: dailyLimitFor(purpose),
      cached: true,
    });
  }

  // ── Per-minute rate limiting ───────────────────────────────────────────────
  // `retryAfterMs` travels in the body as well as the standard Retry-After header, because the
  // one caller that genuinely needs to wait and retry (plan generation) is a fetch() in the
  // browser reading JSON, not an HTTP client that honours headers on its own.
  //
  // The two 429s below are different animals and the `code` says which. A minute
  // limit clears on its own inside a minute and waiting is the correct response;
  // a daily limit does not clear until tomorrow, and retrying it — which the
  // roadmap generator did, four times a pass, five passes deep — is a minute and
  // a half of the student's time spent proving something already known.
  const retryAfterMs = minuteLimitRetryMs(ip, purpose);
  if (retryAfterMs) {
    res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
    return res.status(429).json({
      code: 'minute_limit',
      error: 'Too many requests. Please wait a moment before sending more messages.',
      retryAfterMs,
    });
  }

  // ── Check daily request limit ──────────────────────────────────────────────
  if (isDailyLimited(ip, purpose)) {
    return res.status(429).json({
      code: 'daily_limit',
      error: `Daily coaching limit reached (${dailyLimitFor(purpose)} requests). Try again tomorrow.`,
      requestsRemaining: 0,
      dailyLimit: dailyLimitFor(purpose),
    });
  }

  // ── Call Groq API (with timeout + one retry on transient failure) ──────────
  // Same reasoning as the input-char cap above: 'prep' also covers the flashcard AI polish pass,
  // which returns an edit-list across a batch of cards — routinely larger than a chat reply.
  // 'masterplan' is the biggest: a week-by-week roadmap or a week of day-by-day tasks, each a
  // structured JSON array — comfortably under Oracle's 32,768-token ceiling but far above every
  // other purpose here.
  // 'sat': a batch of eight generated items, each with a passage, four choices,
  // a rationale and four per-distractor rationales, runs a few thousand tokens.
  // Below this ceiling the JSON gets truncated mid-object and the whole batch is
  // discarded by the parser — expensive silence rather than a short set.
  // 'essay': a full critique is a verdict, a per-criterion rubric, several quoted lines with what
  // is wrong with each, and a revision plan. Truncating it drops the fixes and keeps the verdict,
  // which is the one shape of this response that would be actively harmful.
  // 'masterplan' was raised from 8,000 to 16,000 for a reason that is easy to miss: on the gpt-oss
  // family, reasoning tokens are billed against max_tokens alongside the visible answer. Oracle is
  // called here with reasoning_effort 'high' precisely so it thinks hard before writing the plan —
  // which meant a real chunk of an 8,000-token budget went to the thinking, and the JSON that
  // followed got truncated mid-object. A truncated response does not parse, and an unparseable
  // response silently becomes the deterministic fallback plan. Oracle's ceiling is 32,768, so the
  // headroom costs nothing on the calls that do not need it.
  // 'roadmap' takes Oracle's full 32,768-token ceiling, and needs it. A season pass emits a dozen
  // fully-specified items — each with its dates, its lead time, its preparation steps, its
  // rationale and its fallback — and reasoning tokens are billed against this same budget on the
  // gpt-oss family (which is the whole reason masterplan had to be raised from 8,000). A truncated
  // response does not parse, and an unparseable response silently becomes the deterministic
  // fallback roadmap, so the headroom is what stands between "a real plan" and "a plausible one".
  const MAX_OUTPUT_TOKENS_BY_PURPOSE = { prep: 4000, masterplan: 16000, sat: 8000, essay: 4000, roadmap: 32000 };
  const outputCeiling = MAX_OUTPUT_TOKENS_BY_PURPOSE[purpose] || 1500;
  const clampedTokens = Math.min(Math.max(50, parseInt(maxTokens) || 700), outputCeiling);

  // JSON mode: the caller (currently only masterPlanGenerator.js) can request Groq's "JSON object"
  // response format, which guarantees syntactically valid JSON back — much more reliable than
  // asking nicely in the prompt and regex-extracting the result. Only meaningful/safe to forward
  // when the caller actually asked for it, since OpenAI-compatible APIs require the word "JSON" to
  // appear somewhere in the prompt when this is set (masterPlanGenerator.js's prompts always do).
  const responseFormat = jsonMode ? { type: 'json_object' } : undefined;
  // reasoning_effort only applies to the gpt-oss model family — silently ignored for a non-
  // reasoning model so a stray value can't cause a 400. Every tier is gpt-oss now, so a caller
  // that doesn't pin a value still gets one: TIER_DEFAULT_REASONING_EFFORT, which is what actually
  // separates Scout/Guide/Sage now that they share a model id.
  const reasoningEffort = REASONING_CAPABLE_MODELS.has(model)
    ? (['low', 'medium', 'high'].includes(rawReasoningEffort) ? rawReasoningEffort : TIER_DEFAULT_REASONING_EFFORT[tier])
    : undefined;

  // Temperature is a per-task choice, not an app-wide constant. 0.7 is right for
  // a coach that should sound human; it is wrong for authoring a question whose
  // answer key has to be defensible, and wrong again for a verifier re-solving
  // that question, where any sampling noise is pure downside. Callers that know
  // which of those they are doing may say so; everything else keeps 0.7.
  const DEFAULT_TEMPERATURE = 0.7;
  const temperature = Number.isFinite(Number(rawTemperature))
    ? Math.min(1.5, Math.max(0, Number(rawTemperature)))
    : DEFAULT_TEMPERATURE;

  // Heavier purposes get more time before we give up — a multi-thousand-token structured
  // generation on the 120B model legitimately takes longer than a chat reply.
  // A deep, high-reasoning plan generation legitimately runs close to a minute, so it needs a much
  // longer leash than a chat turn — but it must abort ITSELF before whatever is in front of it
  // does. A self-inflicted 504 is a result the client can act on and retry; a request killed by a
  // platform or a reverse proxy just goes quiet, and the client cannot tell that from a dropped
  // connection.
  //
  // 52s is the ceiling because it clears the tightest limit any target imposes: a serverless
  // function cap (vercel.json still declares maxDuration 60 for this file) and the ~60s default
  // read timeout common to reverse proxies in front of a self-hosted deploy. Container deploys
  // have no platform cap of their own — there `server.js` runs this handler in a plain Node
  // process — so the limit there is purely our own choice, and GROQ_MASTERPLAN_TIMEOUT_MS can
  // raise it without a code change if the proxy in front allows more.
  const envTimeout = Number(process.env.GROQ_MASTERPLAN_TIMEOUT_MS);
  const masterplanTimeoutMs = Number.isFinite(envTimeout) && envTimeout >= 5000 && envTimeout <= 300000
    ? Math.round(envTimeout) : 52000;
  // 'roadmap' shares masterplan's ceiling and its env override: same model, same reasoning effort,
  // same "abort yourself before the platform does" reasoning spelled out above.
  const TIMEOUT_MS_BY_PURPOSE = { masterplan: masterplanTimeoutMs, roadmap: masterplanTimeoutMs, sat: 45000, essay: 45000 };
  const primaryTimeoutMs = TIMEOUT_MS_BY_PURPOSE[purpose] || 20000;
  const retryTimeoutMs = Math.round(primaryTimeoutMs * 0.75);
  // Whole-invocation budget, so the in-handler retry below can be skipped when there is no longer
  // room for it rather than started and then killed mid-flight.
  const FUNCTION_BUDGET_MS = primaryTimeoutMs + 5000;
  const handlerStartedAt = Date.now();

  async function callGroqOnce(useModel, apiKey, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: useModel,
          max_tokens: clampedTokens,
          temperature,
          messages: groqMessages,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      return { response, data };
    } finally {
      clearTimeout(timer);
    }
  }

  // Tries each configured Groq key in rotation order, failing over to the next account on a
  // 429 (that account's own rate limit) or a 5xx — this is what actually maximizes combined
  // usage across two accounts, rather than just splitting requests evenly and hoping neither
  // hits its cap. A genuine 4xx client error (bad request, auth) isn't retried on the other key
  // since it isn't account-specific and would just fail the same way twice.
  async function callGroqWithFailover(useModel, timeoutMs) {
    const keys = keyOrderForThisRequest(purpose, keyPool, lane);
    let last = null;
    for (const key of keys) {
      last = await callGroqOnce(useModel, key, timeoutMs);
      if (last.response.ok) return last;
      if (last.response.status !== 429 && last.response.status < 500) return last;
    }
    return last;
  }

  // Groq's message.content is normally a string, but some models/response
  // shapes can return an array of content parts (e.g. [{type:'text',text:'…'}]).
  // Coerce defensively so the client never receives anything but a string.
  function extractText(message) {
    const c = message?.content;
    if (typeof c === 'string' && c.trim()) return c;
    if (Array.isArray(c)) {
      const joined = c.map(part => (typeof part === 'string' ? part : part?.text || '')).join('');
      if (joined.trim()) return joined;
    }
    // Some reasoning models put the answer in `reasoning`/`reasoning_content`
    // when `content` is empty.
    if (typeof message?.reasoning === 'string' && message.reasoning.trim()) return message.reasoning;
    if (typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()) return message.reasoning_content;
    return '';
  }

  // ── Layer 2: the relief hop ────────────────────────────────────────────────
  // Reached only when Groq has genuinely run out of ways to answer — every key
  // in the pool tried, plus the transient-failure retry. It is not part of the
  // rotation and it never sees a request Groq could have served.
  //
  // The whole-invocation budget governs it, so a relief attempt is skipped
  // rather than started when there is no longer room to finish one: a request
  // killed halfway leaves the caller with an opaque dropped connection, which is
  // strictly worse than the honest error we already have in hand.
  const timeLeft = () => FUNCTION_BUDGET_MS - (Date.now() - handlerStartedAt);
  async function tryRelief(reason) {
    if (!hasRelief()) return null;
    const budget = Math.min(retryTimeoutMs, timeLeft());
    if (budget < 6000) return null;
    const attempts = [];
    const relief = await callWithRelief({
      tier,
      messages: groqMessages,
      opts: { maxTokens: clampedTokens, temperature, jsonMode: !!jsonMode, reasoningEffort },
      timeoutMs: budget,
      extract: extractText,
      onAttempt: (id, detail) => attempts.push(`${id}: ${detail}`),
    });
    if (!relief) {
      if (attempts.length) console.error(`relief providers all failed after ${reason}:`, attempts.join(' | '));
      return null;
    }
    console.warn(`served by relief provider ${relief.providerId} after ${reason}`);
    return relief;
  }

  function respond({ content, modelUsed, provider = 'groq', providerLabel = 'Groq' }) {
    addRequestToday(ip, purpose);
    if (cacheable) setCachedResponse(cacheKey, content, modelUsed);
    const requestsUsedToday = getRequestsUsedToday(ip, purpose);
    return res.status(200).json({
      content,
      model_used: modelUsed,
      tier,
      purpose,
      tierLabel: TIER_LABELS[tier] || tier,
      // Which vendor actually answered. The roadmap generator records it so a
      // build served during a Groq outage can say "written on the reserve model"
      // rather than claiming, or denying, more than is true.
      provider,
      providerLabel,
      relief: provider !== 'groq',
      // Non-zero when the request did not fit its caps — see the `truncated`
      // block above. Callers that can shrink a payload retry smaller instead of
      // retrying identical.
      ...(wasTruncated ? { truncated, truncatedChars: truncated.system + truncated.input } : {}),
      requestsUsedToday,
      requestsRemaining: Math.max(0, dailyLimitFor(purpose) - requestsUsedToday),
      dailyLimit: dailyLimitFor(purpose),
    });
  }

  try {
    let { response, data } = await callGroqWithFailover(model, primaryTimeoutMs);

    // One more pass through the key rotation on a transient failure (5xx, network hiccup) so a
    // single blip doesn't dead-end the chat.
    if (!response.ok && response.status >= 500 && timeLeft() > retryTimeoutMs) {
      ({ response, data } = await callGroqWithFailover(model, Math.min(retryTimeoutMs, timeLeft())));
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || `Medabrain error (${response.status})`;
      console.error('Groq API error:', errMsg);

      const relief = await tryRelief(`Groq ${response.status}`);
      if (relief) return respond({ content: relief.content, modelUsed: relief.model, provider: relief.providerId, providerLabel: relief.providerLabel });

      if (response.status === 429 || errMsg.toLowerCase().includes('rate limit')) {
        // Groq tells us how long its own bucket needs; pass that straight through so a retrying
        // caller waits the right amount instead of hammering a key that is already capped.
        const headerWait = Number(response.headers?.get?.('retry-after'));
        const upstreamWaitMs = Number.isFinite(headerWait) && headerWait > 0 ? Math.min(30000, headerWait * 1000) : 5000;
        res.setHeader('Retry-After', String(Math.ceil(upstreamWaitMs / 1000)));
        return res.status(429).json({ code: 'upstream_busy', error: 'Medabrain is busy right now. Please wait a moment and try again.', retryAfterMs: upstreamWaitMs });
      }

      // ── A 401/403 from every key in the pool is not a blip ──────────────────
      // It is a key that is missing, revoked, mistyped, or barred from this
      // model, and it will fail exactly this way on the next attempt and the one
      // after. Reported as its own code so a multi-pass caller stops rather than
      // spending nineteen more calls confirming it. Same for a 404 model id.
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({ code: 'auth_failed', error: errMsg });
      }
      if (response.status === 404) {
        return res.status(502).json({ code: 'model_unavailable', error: errMsg });
      }

      return res.status(502).json({ code: 'upstream_error', error: errMsg });
    }

    const content = extractText(data?.choices?.[0]?.message);
    if (!content) {
      // A 200 carrying nothing usable is a failure with a friendly status code,
      // and before the relief layer existed it was the single most common way a
      // roadmap pass silently became the deterministic slate.
      const relief = await tryRelief('an empty Groq response');
      if (relief) return respond({ content: relief.content, modelUsed: relief.model, provider: relief.providerId, providerLabel: relief.providerLabel });
      return res.status(502).json({ error: 'Medabrain had trouble forming a response. Please try again.' });
    }

    return respond({ content, modelUsed: data?.model || model });

  } catch (err) {
    console.error('API handler error:', err);
    // A Groq timeout or a network fault is exactly the shape of failure the
    // relief layer exists for, so it gets the same hop the error paths above do
    // — subject to the same budget check, which is what stops a timeout being
    // followed by a second timeout.
    try {
      const relief = await tryRelief(err?.name === 'AbortError' ? 'a Groq timeout' : 'a Groq network fault');
      if (relief) return respond({ content: relief.content, modelUsed: relief.model, provider: relief.providerId, providerLabel: relief.providerLabel });
    } catch (reliefErr) {
      console.error('relief hop failed:', reliefErr?.message || reliefErr);
    }
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Medabrain took too long to respond. Please try again.' });
    }
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
