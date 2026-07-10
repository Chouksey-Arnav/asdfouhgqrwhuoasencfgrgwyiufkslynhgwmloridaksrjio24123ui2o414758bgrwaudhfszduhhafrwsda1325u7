// ─────────────────────────────────────────────────────────────────────────────
// True/false misconception correction: sentences that explicitly name and
// correct a myth ("contrary to popular belief...", "it's a myth that...").
// ─────────────────────────────────────────────────────────────────────────────
import { cleanAnswer, capitalize } from '../text.js';

// Specific shape: "Contrary to popular belief, X do(es) not only Y — correction."
// This is common myth-busting phrasing ("we do not only use 10%...") and lets us
// state the myth positively on the front ("X only Y") while the back stays 100%
// grounded in the source's own negation + correction.
const NOT_ONLY_RE = /^(?:Contrary to popular belief|It'?s a (?:common )?myth that),?\s*(.+?)\s+do(?:es)?\s+not\s+only\s+(.+?)\s*[—–-]\s*(.+)$/i;

// Generic shape: "Contrary to popular belief, CLAIM — CORRECTION" without the
// "not only" sub-shape — states the claim exactly as given (still a valid,
// fully-grounded True/False prompt even without inverting the phrasing).
const GENERIC_RE = /^(?:Contrary to popular belief|It'?s a (?:common )?myth that|Actually,|In fact,),?\s*(.+?)\s*[—–-]\s*(.+)$/i;

export function extractMisconception(sentence, category) {
  const cleaned = sentence.replace(/\.$/, '');

  let m = cleaned.match(NOT_ONLY_RE);
  if (m) {
    const subj = m[1].trim();
    const claim = m[2].trim();
    const correction = m[3].trim();
    return [{
      front: `True or False: ${capitalize(subj)} only ${claim}.`,
      back: cleanAnswer(`False. ${capitalize(subj)} do not only ${claim} — ${correction}.`),
      category, type: 'truefalse', confidence: 4, hint: sentence,
    }];
  }

  m = cleaned.match(GENERIC_RE);
  if (m) {
    const claim = m[1].trim();
    const correction = m[2].trim();
    return [{
      front: `True or False: ${capitalize(claim)}.`,
      back: cleanAnswer(`${capitalize(correction)}.`),
      category, type: 'truefalse', confidence: 4, hint: sentence,
    }];
  }

  return [];
}
