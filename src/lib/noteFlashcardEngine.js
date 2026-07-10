// ─────────────────────────────────────────────────────────────────────────────
// Public entry point for the offline note -> flashcard engine. The actual
// pipeline (segmentation, multi-strategy extraction, ranking/dedup/selection)
// lives in `./flashcards/` — see `flashcards/engine.js` for the orchestrator.
// This is the ONLY flashcard-generation path in the app: fully offline, no API
// key, no network call, built on `compromise` (MIT-licensed, runs in-browser).
// ─────────────────────────────────────────────────────────────────────────────
export { generateFlashcardsFromNotes } from './flashcards/engine.js';

/**
 * Clean pasted text: remove URLs, page numbers, excess whitespace.
 * Headings are handled downstream in generateFlashcardsFromNotes (per-line,
 * with full context), not here.
 * @param {string} text
 * @returns {string}
 */
export function cleanNotesText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[ \t]*\d+[ \t]*$/gm, '')
    .replace(/^[A-Z\s]{10,}$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
