// /api/groq.js — Vercel serverless function
// Proxies requests to Groq's OpenAI-compatible API server-side (key never exposed to browser)
// Powers "Metabrain" — routes deep tutoring/coaching to a larger model and
// lightweight/quick tasks to a smaller, faster model to keep free-tier usage sustainable.
//
// Daily rate limit: 1200 requests per IP per day (well under Groq free-tier caps)
// Per-minute limit: 20 requests per minute per IP

const dailyMap = new Map(); // ip -> { count, resetAt }
const minuteMap = new Map(); // ip -> { count, resetAt }
const DAILY_LIMIT = 1200;
const MINUTE_LIMIT = 20;
const DAILY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

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
      content: String(m.content).slice(0, 4000),
    }))
    .slice(-20); // keep last 20 messages only
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
    ? String(system).slice(0, 2000)
    : 'You are Metabrain, an AI coach for high school students (grades 9-12) preparing for the SAT/ACT and undergraduate admissions — not graduate or professional school. Be concise, accurate, and encouraging.';
  groqMessages.push({ role: 'system', content: systemPrompt });

  if (rawMessages) {
    const cleaned = sanitizeMessages(rawMessages);
    if (cleaned) groqMessages.push(...cleaned);
  } else if (message) {
    groqMessages.push({ role: 'user', content: String(message).slice(0, 4000) });
  }

  if (groqMessages.length <= 1) {
    return res.status(400).json({ error: 'No valid messages to send.' });
  }

  // ── Check daily request limit ──────────────────────────────────────────────
  if (isDailyLimited(ip)) {
    return res.status(429).json({
      error: `Daily coaching limit reached (${DAILY_LIMIT} requests). Try again tomorrow.`,
      requestsRemaining: 0,
      dailyLimit: DAILY_LIMIT,
    });
  }

  // ── Call Groq API ──────────────────────────────────────────────────────────
  try {
    const clampedTokens = Math.min(Math.max(50, parseInt(maxTokens) || 700), 1500);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: clampedTokens,
        temperature: 0.7,
        messages: groqMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `Metabrain error (${response.status})`;
      console.error('Groq API error:', errMsg);

      if (response.status === 429 || errMsg.toLowerCase().includes('rate limit')) {
        return res.status(429).json({ error: 'Metabrain is busy right now. Please wait a moment and try again.' });
      }

      return res.status(502).json({ error: errMsg });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty response from Metabrain.' });
    }

    addRequestToday(ip);
    const requestsUsedToday = getRequestsUsedToday(ip);
    const requestsRemaining = Math.max(0, DAILY_LIMIT - requestsUsedToday);

    return res.status(200).json({
      content,
      model_used: model,
      requestsUsedToday,
      requestsRemaining,
      dailyLimit: DAILY_LIMIT,
    });

  } catch (err) {
    console.error('API handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
