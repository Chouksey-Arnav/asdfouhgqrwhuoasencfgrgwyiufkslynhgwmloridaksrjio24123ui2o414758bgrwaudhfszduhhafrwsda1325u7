// ─────────────────────────────────────────────────────────────────────────────
// Ordered-process / signal-path sentences ("Signals travel from dendrites to
// the cell body, down the axon, and across the synapse to the next neuron.").
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeTerm, isUsableTerm, cleanAnswer, capitalize, lowerFirstWord } from '../text.js';

const PROCESS_RE = /^(.{2,40}?)\s+travels?\s+(from\s+.{6,350})$/i;

export function extractProcess(sentence, category) {
  const cleaned = sentence.replace(/[.!]$/, '');
  const m = cleaned.match(PROCESS_RE);
  if (!m) return [];
  const term = normalizeTerm(m[1]);
  if (!isUsableTerm(term)) return [];
  return [{
    front: `What is the path taken by ${lowerFirstWord(m[1])}?`,
    back: cleanAnswer(capitalize(m[2])),
    category,
    term,
    type: 'process',
    confidence: 4,
    hint: sentence,
  }];
}
