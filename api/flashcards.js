// /api/flashcards.js — Vercel serverless function
// Dedicated AI flashcard-generation engine. Runs on Groq's LPU inference
// stack against Meta's open-weight Llama 3.3 70B model — the same open-source
// model family Groq uses for "deep" Metabrain coaching — so the cards this
// endpoint returns are held to the same reasoning quality bar as the coach,
// not a cheaper/smaller model. The API key never reaches the browser.
//
// Two generation modes:
//   'notes' — extract the highest-yield concepts out of a student's pasted
//             notes and turn each into an atomic active-recall card.
//   'topic' — write a deck from scratch on a named topic, drawing on the
//             model's own subject knowledge (no source text required).
//
// Daily rate limit: 300 generations per IP per day (deck generation is a
// heavier, less frequent action than a single chat turn, so this is a
// separate, tighter budget from api/groq.js's chat quota).

const dailyMap = new Map(); // ip -> { count, resetAt }
const minuteMap = new Map(); // ip -> { count, resetAt }
const DAILY_LIMIT = 300;
const MINUTE_LIMIT = 8;
const DAILY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const MODEL = 'llama-3.3-70b-versatile';

function isDailyLimited(ip) {
  const now = Date.now();
  const entry = dailyMap.get(ip);
  if (!entry || now > entry.resetAt) {
    dailyMap.set(ip, { count: 0, resetAt: now + DAILY_MS });
    return false;
  }
  return entry.count >= DAILY_LIMIT;
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

const SYSTEM_PROMPT = `You are an expert learning scientist and flashcard author who builds spaced-repetition decks for high school students preparing for the SAT/ACT and college admissions.

Write flashcards that follow proven active-recall principles:
- Each card tests exactly ONE atomic fact, concept, or relationship — never bundle multiple ideas into one card.
- The front is a specific, unambiguous question or prompt — never a vague "define X" unless X is a single term. Prefer questions that force retrieval ("What causes...", "Why does...", "What is the relationship between...") over yes/no questions.
- The back is a concise, correct, self-contained answer (1–3 sentences) — accurate and exam-relevant, not padded.
- When a card benefits from one, add a short "hint" (a memory hook, mnemonic, or partial cue) — omit it (empty string) when it wouldn't help.
- Assign a one- or two-word "category" (e.g. "Cell Biology", "Algebra", "Grammar", "US History") and a "difficulty" of exactly "easy", "medium", or "hard".
- Avoid duplicate or near-duplicate cards. Avoid trivia that isn't actually testable knowledge.
- Never invent facts. If source notes are ambiguous or wrong, write the card to reflect standard, correct academic knowledge instead.

Respond with ONLY a JSON object of the exact shape:
{"cards":[{"front":"...","back":"...","hint":"...","category":"...","difficulty":"easy|medium|hard"}]}
No prose, no markdown fences, no commentary — JSON only.`;

function buildUserPrompt({ mode, text, topic, count, specialty }) {
  const specialtyNote = specialty && specialty !== 'undecided'
    ? ` The student is on the "${specialty}" pathway — lean examples that direction when natural, but never force it.`
    : '';
  if (mode === 'topic') {
    return `Write exactly ${count} high-yield flashcards teaching the topic: "${topic}".${specialtyNote} Cover the most important, most testable sub-concepts a strong student should know — spread across the breadth of the topic rather than one narrow slice of it.`;
  }
  return `Read the study notes below and write exactly ${count} high-yield flashcards covering the most important, most testable concepts in them.${specialtyNote} Do not copy sentences verbatim from the notes onto the back of a card — rewrite each answer in clear, concise, exam-ready language.

STUDY NOTES:
"""
${text}
"""`;
}

function extractJson(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip ```json ... ``` or ``` ... ``` fences if the model added them anyway.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) s = fenced[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function sanitizeCards(parsed, count) {
  if (!parsed || !Array.isArray(parsed.cards)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of parsed.cards) {
    if (!raw || typeof raw !== 'object') continue;
    const front = String(raw.front || '').trim().slice(0, 400);
    const back = String(raw.back || '').trim().slice(0, 800);
    if (!front || !back) continue;
    const key = front.toLowerCase().slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    const hint = String(raw.hint || '').trim().slice(0, 200);
    const category = String(raw.category || '').trim().slice(0, 40);
    const difficulty = DIFFICULTIES.has(String(raw.difficulty || '').toLowerCase())
      ? String(raw.difficulty).toLowerCase()
      : 'medium';
    out.push({ front, back, hint, category, difficulty });
    if (out.length >= count) break;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

  if (isMinuteLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before generating another deck.' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'AI deck generation is not configured. Set GROQ_API_KEY in Vercel environment variables.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const mode = body?.mode === 'topic' ? 'topic' : 'notes';
  const count = Math.min(Math.max(parseInt(body?.count, 10) || 12, 4), 24);
  const specialty = typeof body?.specialty === 'string' ? body.specialty.slice(0, 40) : '';
  const topic = mode === 'topic' ? String(body?.topic || '').trim().slice(0, 200) : '';
  const text = mode === 'notes' ? String(body?.text || '').trim().slice(0, 8000) : '';

  if (mode === 'topic' && topic.length < 2) {
    return res.status(400).json({ error: 'Enter a topic to generate a deck about.' });
  }
  if (mode === 'notes' && text.length < 40) {
    return res.status(400).json({ error: 'Paste at least a few sentences of notes to generate a deck.' });
  }

  if (isDailyLimited(ip)) {
    return res.status(429).json({ error: `Daily AI deck generation limit reached (${DAILY_LIMIT}). Try again tomorrow.` });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3200,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt({ mode, text, topic, count, specialty }) },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `AI deck generation error (${response.status})`;
      console.error('Groq flashcards API error:', errMsg);
      if (response.status === 429 || errMsg.toLowerCase().includes('rate limit')) {
        return res.status(429).json({ error: 'The AI deck generator is busy right now. Please wait a moment and try again.' });
      }
      return res.status(502).json({ error: errMsg });
    }

    const raw = data?.choices?.[0]?.message?.content;
    const parsed = extractJson(raw);
    const cards = sanitizeCards(parsed, count);

    if (cards.length < 2) {
      return res.status(502).json({ error: 'Could not generate a usable deck from that input. Try different notes or a more specific topic.' });
    }

    addRequestToday(ip);
    return res.status(200).json({ cards, model_used: MODEL });
  } catch (err) {
    console.error('flashcards handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
