// /api/groq.js — Vercel serverless function
// Proxies requests to Groq's OpenAI-compatible API server-side (key never exposed to browser)
// Powers "Metabrain" — routes deep tutoring/coaching to a larger model and
// lightweight/quick tasks to a smaller, faster model to keep free-tier usage sustainable.
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

// Model routing: 'deep' for tasks that benefit from stronger reasoning (still a
// cheap model — llama-3.3-70b-versatile was ~10x pricier for marginal gains on
// this app's short, well-scoped tasks), 'fast' for lightweight chat turns where
// speed/cost matter most and Groq's free/low-tier TPM caps bite hardest.
const MODELS = {
  deep: 'openai/gpt-oss-20b',
  fast: 'llama-3.1-8b-instant',
};

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

// Sanitize incoming messages to prevent prompt injection / oversized payloads
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  return messages
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({
      role: ['user', 'assistant'].includes(m.role) ? m.role : 'user',
      content: String(m.content).slice(0, 2500),
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
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Metabrain is not configured. Set GROQ_API_KEY in Vercel environment variables.' });
  }

  // ── Parse and validate body ────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const { system, message, messages: rawMessages, maxTokens = 700, tier = 'deep' } = body || {};

  if (!message && !rawMessages) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  const model = MODELS[tier] || MODELS.deep;

  // ── Build messages array (OpenAI-compatible format) ────────────────────────
  const groqMessages = [];
  const systemPrompt = system
    ? String(system).slice(0, 1200)
    : 'You are Metabrain, an AI coach for high school students (grades 9-12) preparing for the SAT/ACT and undergraduate admissions — not graduate or professional school. Be concise, accurate, and encouraging.';
  groqMessages.push({ role: 'system', content: systemPrompt });

  if (rawMessages) {
    const cleaned = sanitizeMessages(rawMessages);
    if (cleaned) groqMessages.push(...cleaned);
  } else if (message) {
    groqMessages.push({ role: 'user', content: String(message).slice(0, 2500) });
  }

  if (groqMessages.length <= 1) {
    return res.status(400).json({ error: 'No valid messages to send.' });
  }

  // ── Cache lookup ────────────────────────────────────────────────────────────
  // Keyed on the exact prompt shape actually sent to Groq (post-sanitization), so a repeat of
  // the same tier/system/last-message combo — from this user or any other — is served from
  // cache without touching the daily/minute limits or the Groq API at all.
  const lastUserMsg = [...groqMessages].reverse().find(m => m.role === 'user')?.content || '';
  const cacheKey = hashKey(`${tier}|${systemPrompt}|${lastUserMsg}`);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.status(200).json({
      content: cached.content,
      model_used: cached.model,
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
  const clampedTokens = Math.min(Math.max(50, parseInt(maxTokens) || 700), 1500);

  async function callGroqOnce(useModel, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: useModel,
          max_tokens: clampedTokens,
          temperature: 0.7,
          messages: groqMessages,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      return { response, data };
    } finally {
      clearTimeout(timer);
    }
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
    let { response, data } = await callGroqOnce(model, 20000);

    // One retry on transient failure (5xx, network hiccup) so a single blip
    // doesn't dead-end the chat. Skip 429s — retrying immediately into a rate
    // limit just wastes the retry.
    if (!response.ok && response.status >= 500) {
      ({ response, data } = await callGroqOnce(model, 15000));
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || `Metabrain error (${response.status})`;
      console.error('Groq API error:', errMsg);

      if (response.status === 429 || errMsg.toLowerCase().includes('rate limit')) {
        return res.status(429).json({ error: 'Metabrain is busy right now. Please wait a moment and try again.' });
      }

      return res.status(502).json({ error: errMsg });
    }

    const content = extractText(data?.choices?.[0]?.message);
    if (!content) {
      return res.status(502).json({ error: 'Metabrain had trouble forming a response. Please try again.' });
    }

    addRequestToday(ip);
    setCachedResponse(cacheKey, content, data?.model || model);
    const requestsUsedToday = getRequestsUsedToday(ip);
    const requestsRemaining = Math.max(0, DAILY_LIMIT - requestsUsedToday);

    return res.status(200).json({
      content,
      model_used: data?.model || model,
      requestsUsedToday,
      requestsRemaining,
      dailyLimit: DAILY_LIMIT,
    });

  } catch (err) {
    console.error('API handler error:', err);
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Metabrain took too long to respond. Please try again.' });
    }
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
