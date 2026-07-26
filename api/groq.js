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

const dailyMap = new Map(); // ip -> { count, resetAt }
const minuteMap = new Map(); // ip -> { count, resetAt }
// Lowered from 1200/day and 20/min — the free-tier Groq key is shared across every user of the
// app, so these caps were far looser than actual usage warranted. Combined with the response
// cache below and the client-side caching in src/lib/aiCache.js, this keeps real Groq calls to
// only the requests that actually need a fresh answer.
const DAILY_LIMIT = 300;
const MINUTE_LIMIT = 8;
const DAILY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

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
//   Scout — llama-3.1-8b-instant, fastest, for quick turns and lightweight generation. Used as
//           the default for the main chat coach, the highest-volume call in the app.
//   Guide — openai/gpt-oss-20b, the balanced tier for tasks that benefit from more structure/
//           reasoning without the cost and TPM pressure of a 70B model.
//   Sage  — llama-3.3-70b-versatile, the most capable tier, for when a student explicitly wants
//           the deepest feedback available (e.g. a full essay critique) and is fine trading
//           speed/cost for it. Was the app-wide default once; kept as the opt-in top tier.
// 'fast'/'deep' aliases are kept so any older cached client build still resolves to something.
//   Oracle — openai/gpt-oss-120b, server-side only (never offered in the student-facing Scout/
//            Guide/Sage picker). Reserved for the Plans tab's "master plan" generation: a 128K-
//            context, 32,768-max-output reasoning model with native Structured Outputs and a
//            tunable reasoning_effort — the deepest, largest-output model Groq hosts, worth the
//            extra latency for a generation that happens rarely and matters a lot.
const MODELS = {
  scout: 'llama-3.1-8b-instant',
  guide: 'openai/gpt-oss-20b',
  sage: 'llama-3.3-70b-versatile',
  oracle: 'openai/gpt-oss-120b',
};
const TIER_ALIASES = { fast: 'scout', deep: 'guide' };
const TIER_LABELS = { scout: 'Scout', guide: 'Guide', sage: 'Sage', oracle: 'Oracle' };
// gpt-oss models accept an optional reasoning_effort ('low'|'medium'|'high') that trades latency
// for deeper chain-of-thought — only meaningful for that model family, so gate on the model id
// rather than trusting every caller to know which models support it.
const REASONING_CAPABLE_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);

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
//   GROQ_API_KEY_PLAN                               → onboarding max-out plan generation
//   GROQ_API_KEY_MASTERPLAN                         → Plans tab full day-by-day plan generation
//   GROQ_API_KEY_SAT                                → SAT tab: generated drills + question explanations
const SHARED_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);
const PURPOSE_KEYS = {
  interview: [process.env.GROQ_API_KEY_INTERVIEW].filter(Boolean),
  portfolio: [process.env.GROQ_API_KEY_PORTFOLIO].filter(Boolean),
  prep: [process.env.GROQ_API_KEY_PREP].filter(Boolean),
  plan: [process.env.GROQ_API_KEY_PLAN].filter(Boolean),
  masterplan: [process.env.GROQ_API_KEY_MASTERPLAN].filter(Boolean),
  sat: [process.env.GROQ_API_KEY_SAT].filter(Boolean),
};
const VALID_PURPOSES = new Set(['coach', 'interview', 'portfolio', 'prep', 'plan', 'masterplan', 'sat']);

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
// cheapest model that's still good enough for its job (the whole point of splitting keys is to run
// high-volume surfaces cheap while reserving the 70B tier for the rare, high-value plan generation).
const PURPOSE_DEFAULT_TIER = {
  coach: 'guide',
  prep: 'scout',       // quick in-context "explain this" — cheapest, fastest
  portfolio: 'guide',  // structured reasoning over a tracker, still cheap
  interview: 'guide',  // conversational, low-latency for spoken turns
  plan: 'sage',        // one-time, max-quality — worth the 70B model
  masterplan: 'oracle', // rare, large structured generation — worth the biggest-output model
  sat: 'sage',         // generated practice questions must be correct; the 70B tier earns its cost here
};

// One rotation cursor per purpose (not a single shared counter) — otherwise unrelated purposes'
// request volume perturbs each other's rotation position for no reason. Only `primary` is ever
// rotated for load-spreading; `fallback` is appended in fixed order and only reached via the
// failover loop below, so a purpose's dedicated key(s) are always tried before the shared pool.
const keyCursors = new Map();
function keyOrderForThisRequest(purpose, { primary, fallback }) {
  let orderedPrimary = primary;
  if (primary.length > 1) {
    const cursor = keyCursors.get(purpose) || 0;
    const start = cursor % primary.length;
    keyCursors.set(purpose, (cursor + 1) % primary.length);
    orderedPrimary = [...primary.slice(start), ...primary.slice(0, start)];
  }
  return [...orderedPrimary, ...fallback];
}

function isDailyLimited(ip) {
  const now = Date.now();
  const entry = dailyMap.get(ip);
  if (!entry || now > entry.resetAt) {
    dailyMap.set(ip, { count: 0, resetAt: now + DAILY_MS });
    return false;
  }
  return entry.count >= DAILY_LIMIT;
}

function getRequestsUsedToday(ip) {
  const entry = dailyMap.get(ip);
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) return 0;
  return entry.count;
}

function addRequestToday(ip) {
  const now = Date.now();
  const entry = dailyMap.get(ip);
  if (!entry || now > entry.resetAt) {
    dailyMap.set(ip, { count: 1, resetAt: now + DAILY_MS });
  } else {
    entry.count += 1;
  }
}

function isMinuteLimited(ip) {
  const now = Date.now();
  const entry = minuteMap.get(ip);
  if (!entry || now > entry.resetAt) {
    minuteMap.set(ip, { count: 1, resetAt: now + MINUTE_MS });
    return false;
  }
  if (entry.count >= MINUTE_LIMIT) return true;
  entry.count += 1;
  return false;
}

// Most callers (chat-style coach/interview/portfolio turns) are fine with a 2500-char input cap.
// 'prep' is the exception: besides in-context lesson Q&A, it's also used by the flashcard AI
// polish pass (src/lib/flashcards/aiPolish.js), which sends a notes excerpt plus a batch of draft
// cards as JSON in a single message — comfortably larger than a chat turn, so it gets a higher cap.
// 'masterplan' prompts carry a resource catalog (real pathway/quiz/library/portfolio names) plus
// the full onboarding profile and live app-state signals, so they routinely run several thousand
// characters longer than a chat turn.
const MAX_INPUT_CHARS_BY_PURPOSE = { prep: 8000, masterplan: 9000 };
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

  // ── Per-minute rate limiting ───────────────────────────────────────────────
  if (isMinuteLimited(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before sending more messages.',
    });
  }

  // ── API key check ──────────────────────────────────────────────────────────
  if (!ALL_KEYS.length) {
    return res.status(500).json({ error: 'Medabrain is not configured. Set GROQ_API_KEY (and optionally GROQ_API_KEY_2 / GROQ_API_KEY_3) in your environment variables.' });
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
    jsonMode, reasoningEffort: rawReasoningEffort,
  } = body || {};

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
  const MAX_SYSTEM_CHARS_BY_PURPOSE = { masterplan: 9000 };
  const systemCap = MAX_SYSTEM_CHARS_BY_PURPOSE[purpose] || 4800;
  const systemPrompt = system
    ? String(system).slice(0, systemCap)
    : 'You are Medabrain, an AI coach for high school students (grades 9-12) preparing for the SAT/ACT and undergraduate admissions — not graduate or professional school. Be concise, accurate, and encouraging.';
  groqMessages.push({ role: 'system', content: systemPrompt });

  if (rawMessages) {
    const cleaned = sanitizeMessages(rawMessages, purpose);
    if (cleaned) groqMessages.push(...cleaned);
  } else if (message) {
    groqMessages.push({ role: 'user', content: String(message).slice(0, inputCharsFor(purpose)) });
  }

  if (groqMessages.length <= 1) {
    return res.status(400).json({ error: 'No valid messages to send.' });
  }

  // ── Cache lookup ────────────────────────────────────────────────────────────
  // Keyed on the exact prompt shape actually sent to Groq (post-sanitization), so a repeat of
  // the same tier/system/last-message combo — from this user or any other — is served from
  // cache without touching the daily/minute limits or the Groq API at all.
  const lastUserMsg = [...groqMessages].reverse().find(m => m.role === 'user')?.content || '';
  const cacheKey = hashKey(`${purpose}|${tier}|${systemPrompt}|${lastUserMsg}`);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json({
      content: cached.content,
      model_used: cached.model,
      tier,
      purpose,
      tierLabel: TIER_LABELS[tier] || tier,
      requestsUsedToday: getRequestsUsedToday(ip),
      requestsRemaining: Math.max(0, DAILY_LIMIT - getRequestsUsedToday(ip)),
      dailyLimit: DAILY_LIMIT,
      cached: true,
    });
  }

  // ── Check daily request limit ──────────────────────────────────────────────
  if (isDailyLimited(ip)) {
    return res.status(429).json({
      error: `Daily coaching limit reached (${DAILY_LIMIT} requests). Try again tomorrow.`,
      requestsRemaining: 0,
      dailyLimit: DAILY_LIMIT,
    });
  }

  // ── Call Groq API (with timeout + one retry on transient failure) ──────────
  // Same reasoning as the input-char cap above: 'prep' also covers the flashcard AI polish pass,
  // which returns an edit-list across a batch of cards — routinely larger than a chat reply.
  // 'masterplan' is the biggest: a week-by-week roadmap or a week of day-by-day tasks, each a
  // structured JSON array — comfortably under Oracle's 32,768-token ceiling but far above every
  // other purpose here.
  const MAX_OUTPUT_TOKENS_BY_PURPOSE = { prep: 4000, masterplan: 8000 };
  const outputCeiling = MAX_OUTPUT_TOKENS_BY_PURPOSE[purpose] || 1500;
  const clampedTokens = Math.min(Math.max(50, parseInt(maxTokens) || 700), outputCeiling);

  // JSON mode: the caller (currently only masterPlanGenerator.js) can request Groq's "JSON object"
  // response format, which guarantees syntactically valid JSON back — much more reliable than
  // asking nicely in the prompt and regex-extracting the result. Only meaningful/safe to forward
  // when the caller actually asked for it, since OpenAI-compatible APIs require the word "JSON" to
  // appear somewhere in the prompt when this is set (masterPlanGenerator.js's prompts always do).
  const responseFormat = jsonMode ? { type: 'json_object' } : undefined;
  // reasoning_effort only applies to the gpt-oss model family (Guide/Oracle) — silently ignored
  // for other tiers so a stray value on a non-reasoning model can't cause a 400.
  const reasoningEffort = (['low', 'medium', 'high'].includes(rawReasoningEffort) && REASONING_CAPABLE_MODELS.has(model))
    ? rawReasoningEffort : undefined;

  // Heavier purposes get more time before we give up — a multi-thousand-token structured
  // generation on the 120B model legitimately takes longer than a chat reply.
  const TIMEOUT_MS_BY_PURPOSE = { masterplan: 45000 };
  const primaryTimeoutMs = TIMEOUT_MS_BY_PURPOSE[purpose] || 20000;
  const retryTimeoutMs = Math.round(primaryTimeoutMs * 0.75);

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
          temperature: 0.7,
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
    const keys = keyOrderForThisRequest(purpose, keyPool);
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

  try {
    let { response, data } = await callGroqWithFailover(model, primaryTimeoutMs);

    // One more pass through the key rotation on a transient failure (5xx, network hiccup) so a
    // single blip doesn't dead-end the chat.
    if (!response.ok && response.status >= 500) {
      ({ response, data } = await callGroqWithFailover(model, retryTimeoutMs));
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || `Medabrain error (${response.status})`;
      console.error('Groq API error:', errMsg);

      if (response.status === 429 || errMsg.toLowerCase().includes('rate limit')) {
        return res.status(429).json({ error: 'Medabrain is busy right now. Please wait a moment and try again.' });
      }

      return res.status(502).json({ error: errMsg });
    }

    const content = extractText(data?.choices?.[0]?.message);
    if (!content) {
      return res.status(502).json({ error: 'Medabrain had trouble forming a response. Please try again.' });
    }

    addRequestToday(ip);
    setCachedResponse(cacheKey, content, data?.model || model);
    const requestsUsedToday = getRequestsUsedToday(ip);
    const requestsRemaining = Math.max(0, DAILY_LIMIT - requestsUsedToday);

    return res.status(200).json({
      content,
      model_used: data?.model || model,
      tier,
      purpose,
      tierLabel: TIER_LABELS[tier] || tier,
      requestsUsedToday,
      requestsRemaining,
      dailyLimit: DAILY_LIMIT,
    });

  } catch (err) {
    console.error('API handler error:', err);
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Medabrain took too long to respond. Please try again.' });
    }
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
