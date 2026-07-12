// ─────────────────────────────────────────────────────────────────────────────
// Numeric facts: a number + unit/percentage tied to a specific claim ("the
// brain contains about 86 billion neurons", "uses roughly 20% of the body's
// total energy", "speeds up to 120 meters per second", "making up roughly 85%
// of total brain mass"). Each template is independent so a single sentence can
// yield more than one numeric card (e.g. the "contains...and uses..." sentence).
// ─────────────────────────────────────────────────────────────────────────────
import { cleanAnswer, capitalize, lowerFirstWord } from '../text.js';

export function extractNumeric(sentence, category, subjectHint) {
  const out = [];
  const subj = subjectHint || 'it';
  let m;

  m = sentence.match(/^(.{2,50}?)\s+contains?\s+(about|approximately|roughly|around)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:billion|million|thousand)?)\s+([a-z][a-z' -]{2,40}?)(?=[.,]| and\b|$)/i);
  if (m) {
    out.push({
      front: `Approximately how many ${m[4].trim()} are in ${lowerFirstWord(m[1])}?`,
      back: cleanAnswer(`${m[2] ? capitalize(m[2]) : 'About'} ${m[3].trim()}.`),
      category, type: 'numeric', confidence: 4, hint: sentence,
    });
  }

  m = sentence.match(/\buses?\s+(about|roughly|approximately|around)?\s*(\d[\d,]*(?:\.\d+)?%)\s+of\s+(.{3,60}?)(?=[.,]| and\b|$)/i);
  if (m) {
    out.push({
      front: `Roughly what percentage of ${m[3].trim()} does ${lowerFirstWord(subj)} use?`,
      back: cleanAnswer(`${m[1] ? capitalize(m[1]) : 'Roughly'} ${m[2]}.`),
      category, type: 'numeric', confidence: 4, hint: sentence,
    });
  }

  m = sentence.match(/\bmaking up\s+(about|roughly|approximately|around)?\s*(\d[\d,]*(?:\.\d+)?%)\s+of\s+(.{3,60}?)(?=[.,]|$)/i);
  if (m) {
    out.push({
      front: `What percentage of ${m[3].trim()} does ${lowerFirstWord(subj)} make up?`,
      back: cleanAnswer(`${m[1] ? capitalize(m[1]) : 'Roughly'} ${m[2]}.`),
      category, type: 'numeric', confidence: 4, hint: sentence,
    });
  }

  m = sentence.match(/\bspeeds?\s+(?:of\s+)?up to\s+(\d[\d,]*(?:\.\d+)?)\s+([a-z][a-z \/]{2,30}?)(?=[.,]|$)/i);
  if (m) {
    out.push({
      front: `How fast can ${lowerFirstWord(subj)} conduct signals?`,
      back: cleanAnswer(`Up to ${m[1]} ${m[2].trim()}.`),
      category, type: 'numeric', confidence: 4, hint: sentence,
    });
  }

  return out;
}
