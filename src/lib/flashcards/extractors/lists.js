// ─────────────────────────────────────────────────────────────────────────────
// Structured list-item lines ("Term: description"), relative-clause role facts
// ("X, which does Y"), and lead-in enumeration overviews ("There are five types
// of X: ...").
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeTerm, isUsableTerm, isUsableDefinition, cleanAnswer, capitalize, isAreFor, trailingNounPhrase, wordsOf, joinWithAnd, parseCountWord } from '../text.js';

// A structured "Term: description" / "Term (extra): description" / "Term — description" line.
// The dash form requires a real standalone dash (spaces on both sides) so a numeric range like
// "4–8 Hz" is never mistaken for the term/definition separator.
const LIST_ITEM_RE = /^([A-Za-z][\w' /-]{1,60}?)\s*(?:\(([^()]{1,60})\))?\s*(?::\s+|\s[-–—]\s)(.{3,400})$/;

export function parseListItem(line) {
  const m = line.match(LIST_ITEM_RE);
  if (!m) return null;
  const term = normalizeTerm(m[1]);
  const parenthetical = m[2] ? m[2].trim() : null;
  const description = m[3].trim();
  if (!isUsableTerm(term)) return null;
  if (!isUsableDefinition(term, description)) return null;
  return { term, description, parenthetical };
}

export function buildListCard(item, category) {
  const back = item.parenthetical ? `${cleanAnswer(item.description)} (${item.parenthetical})` : cleanAnswer(item.description);
  return {
    front: `What ${isAreFor(item.term)} ${item.term}?`,
    back,
    category,
    term: item.term,
    type: 'list',
    confidence: 6,
  };
}

// "A neuron has dendrites, which receive incoming signals, and an axon, which
// carries signals away from the cell body." -> one card per "X, which Y" clause.
// The regex is intentionally loose about what precedes ", which" (it can grab
// extra leading words depending on where in the sentence it fires); we only
// ever use the trailing noun phrase as the term, so over-capture is harmless.
const RELATIVE_RE = /\b([A-Za-z][A-Za-z' -]{2,40}?),\s+which\s+([^,;.]{5,150})/gi;

export function extractRelativeClauseRoles(sentence, category) {
  const out = [];
  let m;
  RELATIVE_RE.lastIndex = 0;
  while ((m = RELATIVE_RE.exec(sentence))) {
    const term = trailingNounPhrase(m[1]);
    if (!isUsableTerm(normalizeTerm(term))) continue;
    const clause = m[2].trim();
    if (wordsOf(clause).length < 2) continue;
    out.push({
      front: `What is the function of ${term}?`,
      back: cleanAnswer(clause),
      category,
      term: normalizeTerm(term),
      type: 'relative',
      confidence: 3,
    });
  }
  return out;
}

const LEADIN_RE = /^There\s+(?:is|are)\s+(\w+)\s+(?:main\s+|primary\s+|different\s+|key\s+)?(?:types?|kinds?|forms?|categories?|classes?|stages?)\s+of\s+(.{3,60}?)\.?$/i;

export function matchEnumerationLeadIn(sentence) {
  return sentence.match(LEADIN_RE);
}

/** Synthesizes one overview card ("What are the five types of X?") from a lead-in sentence plus the per-item cards already extracted from the same section. */
export function buildEnumerationOverview(leadInMatch, sectionCandidates, category) {
  const countWord = leadInMatch[1];
  const categoryPhrase = leadInMatch[2].trim();
  const n = parseCountWord(countWord) || sectionCandidates.length;
  const terms = sectionCandidates.map(c => c.term).filter(Boolean).slice(0, n);
  if (terms.length < 2) return null;

  const lastWords = terms.map(t => (wordsOf(t).slice(-1)[0] || '').toLowerCase());
  const commonSuffix = lastWords.every(w => w && w === lastWords[0]) ? lastWords[0] : null;
  const displayTerms = commonSuffix
    ? terms.map(t => { const w = wordsOf(t); return w.length > 1 ? w.slice(0, -1).join(' ') : t; })
    : terms;

  const listStr = joinWithAnd(displayTerms);
  return {
    front: `What are the ${countWord.toLowerCase()} ${categoryPhrase}?`,
    back: cleanAnswer(`${listStr}${commonSuffix ? ` (${categoryPhrase})` : ''}`),
    category,
    type: 'list',
    confidence: 6,
  };
}
