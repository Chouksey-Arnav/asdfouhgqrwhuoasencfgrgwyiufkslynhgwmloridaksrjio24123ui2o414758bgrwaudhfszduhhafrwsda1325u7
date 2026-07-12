// ─────────────────────────────────────────────────────────────────────────────
// Flashcard generation client. Fully offline: no API key, no network call,
// ever. Notes go through the local extraction engine (src/lib/noteFlashcardEngine.js)
// entirely in-browser. There is no hosted/generative path here — every card's
// answer is a direct quote or a trivial trim of the notes you pasted, so there's
// nothing to fall back to and nothing that can silently fail on a bad connection.
// ─────────────────────────────────────────────────────────────────────────────
import { generateFlashcardsFromNotes, cleanNotesText } from './noteFlashcardEngine';

/**
 * Generate a flashcard deck from pasted study notes.
 * @param {{text:string, count?:number}} params
 * @returns {{cards:Array, requested:number, generated:number, coverage:'full'|'partial'}}
 */
export function generateAIFlashcards({ text = '', count = 20 }) {
  if (text.trim().length < 40) {
    throw new Error('Paste at least a few sentences of notes to generate a deck.');
  }
  const result = generateFlashcardsFromNotes(cleanNotesText(text), count);
  if (result.cards.length < 2) {
    throw new Error('Could not find enough distinct facts in that text — try pasting more detailed notes.');
  }
  return result;
}
