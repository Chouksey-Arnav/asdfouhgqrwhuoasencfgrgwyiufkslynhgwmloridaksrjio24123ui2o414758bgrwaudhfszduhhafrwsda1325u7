// ─────────────────────────────────────────────────────────────────────────────
// AI flashcard generation client — talks to /api/flashcards, which runs on
// Groq's LPU stack against Meta's open-weight Llama 3.3 70B model (the same
// model tier used for Metabrain's deep coaching). Falls back to the local,
// offline cloze-deletion generator (src/lib/clozeGenerator.js) if the AI
// endpoint is unreachable, unconfigured, or rate-limited, so deck generation
// never hard-fails a student mid-session.
// ─────────────────────────────────────────────────────────────────────────────
import { generateClozeFromNotes, cleanNotesText } from './clozeGenerator';

/**
 * Generate a flashcard deck via the AI engine.
 * @param {{mode:'notes'|'topic', text?:string, topic?:string, count?:number, specialty?:string}} params
 * @returns {Promise<{cards:Array, engine:'ai'|'fallback', model?:string}>}
 */
export async function generateAIFlashcards({ mode, text = '', topic = '', count = 12, specialty = '' }) {
  try {
    const r = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, text, topic, count, specialty }),
    });
    let d = null;
    try { d = await r.json(); } catch { /* non-JSON response (e.g. no API route in this environment) */ }
    if (!r.ok) throw new Error(d?.error || `AI deck generator is unavailable right now (${r.status}).`);
    if (!d || !Array.isArray(d.cards) || d.cards.length < 2) throw new Error('AI returned an unusable deck.');
    return { cards: d.cards, engine: 'ai', model: d.model_used };
  } catch (e) {
    if (mode === 'notes' && text.trim().length >= 40) {
      const cards = generateClozeFromNotes(cleanNotesText(text), Math.min(count, 14));
      if (cards.length >= 2) return { cards, engine: 'fallback', error: e.message };
    }
    throw e;
  }
}
