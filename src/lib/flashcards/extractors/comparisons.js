// ─────────────────────────────────────────────────────────────────────────────
// Comparisons: contrastive language ("unlike", "as opposed to", "in contrast
// to", "compared to") -> a single "What is the difference between X and Y?"
// card whose answer cites both sides verbatim (grounding stays intact — no
// synthesis, just the sentence that already states the contrast).
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeTerm, cleanAnswer, capitalize, lowerFirstWord } from '../text.js';

const PATTERNS = [
  /^(.{2,60}?),?\s+unlike\s+(.{2,60}?),\s+(.{4,350})$/i,
  /^(.{2,60}?)\s*,?\s*(?:as opposed to|in contrast to|compared to)\s+(.{2,60}?)[,:]\s*(.{4,350})$/i,
];

export function extractComparison(sentence, category) {
  const cleaned = sentence.replace(/[.!]$/, '');
  for (const re of PATTERNS) {
    const m = cleaned.match(re);
    if (!m) continue;
    const a = normalizeTerm(m[1]);
    const b = normalizeTerm(m[2]);
    if (!a || !b) continue;
    return [{
      front: `What is the difference between ${lowerFirstWord(a)} and ${lowerFirstWord(b)}?`,
      back: cleanAnswer(capitalize(sentence)),
      category, type: 'comparison', confidence: 4, hint: sentence,
    }];
  }
  return [];
}
