// ─────────────────────────────────────────────────────────────────────────────
// Acronyms/abbreviations: "CNS (Central Nervous System)", "Electroencephalogram
// (EEG)", "EEG stands for Electroencephalogram" -> "What does CNS stand for?"
// (the harder recall direction, per spec) with the expansion as the answer.
// ─────────────────────────────────────────────────────────────────────────────
import { cleanAnswer, capitalize, wordsOf } from '../text.js';

export function extractAcronyms(sentence, category) {
  const out = [];
  const seen = new Set();
  const push = (abbr, expansion) => {
    const key = abbr.toUpperCase();
    if (seen.has(key) || wordsOf(expansion).length > 8) return;
    seen.add(key);
    out.push({
      front: `What does ${key} stand for?`,
      back: cleanAnswer(capitalize(expansion.trim())),
      category, term: key, type: 'acronym', confidence: 5, hint: sentence,
    });
  };

  // "REM (rapid eye movement)", "EEG (electroencephalogram)"
  const reA = /\b([A-Z]{2,6})\s*\(([a-zA-Z][a-zA-Z' -]{2,60})\)/g;
  let m;
  while ((m = reA.exec(sentence))) push(m[1], m[2]);

  // "Central Nervous System (CNS)"
  const reB = /\b([A-Z][a-zA-Z' -]{3,60}?)\s*\(([A-Z]{2,6})\)/g;
  while ((m = reB.exec(sentence))) push(m[2], m[1]);

  // "CNS stands for Central Nervous System"
  const reC = /\b([A-Z]{2,6})\s+stands?\s+for\s+([A-Z][a-zA-Z' -]{3,80}?)(?=[.,;]| and\b|$)/g;
  while ((m = reC.exec(sentence))) push(m[1], m[2]);

  return out;
}
