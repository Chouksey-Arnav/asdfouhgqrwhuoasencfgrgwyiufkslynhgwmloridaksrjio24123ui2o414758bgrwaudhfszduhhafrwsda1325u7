// ─────────────────────────────────────────────────────────────────────────────
// Offline note → flashcard engine.
//
// This is the local, zero-network fallback used when the AI engine
// (api/flashcards.js, Llama 3.3 70B via Groq) is unavailable. It used to be a
// single greedy regex pass that treated "any line with a colon" as a
// definition — which is why a document title like "The Human Brain:
// Comprehensive Study Notes" got turned into a flashcard (the title has a
// colon, so it looked exactly like "Term: definition" to the old code).
//
// This version is a small real NLP pipeline built on `compromise` (open
// source, MIT, runs fully in-browser — no API key, no network call):
//   1. classify each line as heading / structured list-item / prose
//   2. headings are dropped entirely, never used as source material
//   3. prose is segmented into real sentences (compromise handles
//      abbreviations/decimals far better than a naive `.split(/[.!?]/)`)
//   4. definitions and key terms are extracted with validation that rejects
//      title-shaped text on either side of the pattern, so a subtitle can
//      never masquerade as an answer
//   5. cards are deduplicated and quality-filtered before being returned
// ─────────────────────────────────────────────────────────────────────────────
import nlp from 'compromise';

const STOPWORD_CAP_EXEMPT = new Set(['a','an','the','of','in','on','for','and','or','to','with','&','vs','vs.']);
const LEADING_ARTICLE_RE = /^(the|a|an)\s+/i;
const BULLET_PREFIX_RE = /^\s*(?:[-*•▪◦‣]|\d+[.)])\s+/;
const PRONOUN_FRONT_RE = /^(it|this|that|these|those|they|he|she|we|you|i)$/i;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordsOf(str) {
  return str.trim().split(/\s+/).filter(Boolean);
}

/** True for short, punctuation-less, mostly-capitalized lines — i.e. titles/headings, not content. */
function isHeadingLike(raw) {
  const trimmed = raw.trim().replace(/[:\-–—]\s*$/, '');
  if (!trimmed) return true;
  if (/[.!?]$/.test(trimmed)) return false;
  const words = wordsOf(trimmed);
  if (!words.length || words.length > 10) return false;
  const content = words.filter(w => !STOPWORD_CAP_EXEMPT.has(w.toLowerCase().replace(/[^a-z&]/gi, '')));
  if (!content.length) return false;
  const capCount = content.filter(w => /^[A-Z]/.test(w)).length;
  return capCount / content.length >= 0.7;
}

/** Strips a leading article and trailing punctuation, for use as a dedup key. */
function normalizeTerm(term) {
  return term.trim().replace(LEADING_ARTICLE_RE, '').replace(/[.:;,]+$/, '').trim();
}

function isUsableTerm(term) {
  if (!term) return false;
  const words = wordsOf(term);
  if (!words.length || words.length > 6) return false;
  if (PRONOUN_FRONT_RE.test(words[0])) return false;
  return true;
}

function isUsableDefinition(term, def) {
  if (!def) return false;
  const trimmed = def.trim();
  if (wordsOf(trimmed).length < 2) return false;
  if (isHeadingLike(trimmed)) return false; // guards against a subtitle being mistaken for an answer
  const lowerDef = trimmed.toLowerCase();
  const lowerTerm = term.toLowerCase();
  if (lowerDef === lowerTerm) return false;
  if (lowerDef.includes(lowerTerm) && trimmed.length < term.length * 2) return false; // tautology ("X is X")
  return true;
}

function cleanAnswer(s) {
  return s.trim().replace(/\s+/g, ' ').replace(/[.:;,]+$/, '.').replace(/\.\.$/, '.');
}

// A structured "Term: description" / "Term (extra): description" / "Term — description" line.
// The dash form requires a real standalone dash (spaces on both sides) so a numeric range like
// "4–8 Hz" is never mistaken for the term/definition separator.
const LIST_ITEM_RE = /^([A-Za-z][\w' /-]{1,60}?)\s*(?:\(([^()]{1,60})\))?\s*(?::\s+|\s[-–—]\s)(.{3,400})$/;

function parseListItem(line) {
  const m = line.match(LIST_ITEM_RE);
  if (!m) return null;
  const term = normalizeTerm(m[1]);
  const parenthetical = m[2] ? m[2].trim() : null;
  const description = m[3].trim();
  if (!isUsableTerm(term)) return null;
  if (!isUsableDefinition(term, description)) return null;
  return { term, description, parenthetical };
}

const DEFINITION_PATTERNS = [
  /^(.{2,60}?)\s+(?:is defined as|is often defined as|are defined as)\s+(.{6,350})$/i,
  /^(.{2,50}?)\s+(?:is|are)\s+(?:a|an|the)\s+(.{6,350})$/i,
  /^(.{2,50}?)\s+(?:is|are|refers to|means?|represents?)\s+(.{6,350})$/i,
];

function parseDefinitionSentence(sentence) {
  const cleaned = sentence.replace(/[.!]$/, '');
  for (const pattern of DEFINITION_PATTERNS) {
    const m = cleaned.match(pattern);
    if (!m) continue;
    const term = normalizeTerm(m[1]);
    const definition = m[2].trim().replace(/[.!]$/, '');
    if (!isUsableTerm(term)) continue;
    if (!isUsableDefinition(term, definition)) continue;
    return { term, definition };
  }
  return null;
}

/** Ranks candidate noun phrases across a body of prose by frequency for cloze-card selection. */
function extractKeyTerms(proseText, excludeKeys) {
  const doc = nlp(proseText);
  const phrases = doc.match('#Determiner? #Adjective* #Noun+ #Noun?').out('array');
  const freq = new Map();
  const order = [];
  for (const raw of phrases) {
    const term = normalizeTerm(raw);
    if (!term || term.length < 3) continue;
    const words = wordsOf(term);
    if (words.length > 3) continue;
    if (/^\d+$/.test(term)) continue;
    const key = term.toLowerCase();
    if (excludeKeys.has(key)) continue;
    if (!freq.has(key)) { freq.set(key, { term, count: 0 }); order.push(key); }
    freq.get(key).count++;
  }
  return order
    .map(k => freq.get(k))
    .sort((a, b) => b.count - a.count || order.indexOf(a.term.toLowerCase()) - order.indexOf(b.term.toLowerCase()));
}

function dedupeCards(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    const key = c.front.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!c.back || c.back.trim().length < 2) continue;
    if (c.front.trim().toLowerCase() === c.back.trim().toLowerCase()) continue;
    out.push(c);
  }
  return out;
}

/**
 * Generate flashcards from pasted study notes — headings are excluded,
 * structured "Term: description" lines and prose definitions are extracted
 * with validation, and remaining key terms become cloze cards.
 * @param {string} text
 * @param {number} maxCards
 * @returns {Array<{front:string, back:string, hint?:string, type:string}>}
 */
const MAX_INPUT_CHARS = 20000; // keeps generation instant even on a multi-page paste

export function generateFlashcardsFromNotes(text, maxCards = 14) {
  if (!text || text.trim().length < 40) return [];

  const rawLines = text.slice(0, MAX_INPUT_CHARS).split('\n').map(l => l.replace(BULLET_PREFIX_RE, '').trim()).filter(Boolean);

  const listCards = [];
  const proseLines = [];
  const usedKeys = new Set();

  for (const line of rawLines) {
    if (isHeadingLike(line)) continue;
    const item = parseListItem(line);
    if (item) {
      const key = item.term.toLowerCase();
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const back = item.parenthetical ? `${cleanAnswer(item.description)} (${item.parenthetical})` : cleanAnswer(item.description);
      listCards.push({ front: `What is ${item.term}?`, back, type: 'list' });
    } else if (/[:]$/.test(line)) {
      // A bare "Section name:" line with nothing after the colon is a section
      // header for the list items that follow, not a sentence — drop it
      // rather than letting it glue onto the next line as prose (which would
      // smuggle the header text into the front of the next card).
      continue;
    } else {
      proseLines.push(line);
    }
  }

  const proseText = proseLines.join(' ');
  const sentences = proseText && proseText.length > 20
    ? nlp(proseText).sentences().out('array').map(s => s.trim()).filter(s => s.length > 25 && s.length < 420)
    : [];

  const definitionCards = [];
  const usedSentences = new Set();
  for (const sentence of sentences) {
    if (listCards.length + definitionCards.length >= maxCards) break;
    if (isHeadingLike(sentence)) continue;
    const def = parseDefinitionSentence(sentence);
    if (!def) continue;
    const key = def.term.toLowerCase();
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    usedSentences.add(sentence);
    definitionCards.push({ front: `What is ${def.term}?`, back: cleanAnswer(def.definition), hint: sentence, type: 'definition' });
  }

  const structuredCount = listCards.length + definitionCards.length;
  const clozeCards = [];
  if (structuredCount < maxCards && sentences.length) {
    const keyTerms = extractKeyTerms(proseText, usedKeys);
    for (const { term } of keyTerms) {
      if (structuredCount + clozeCards.length >= maxCards) break;
      const rx = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
      const sentence = sentences.find(s => !usedSentences.has(s) && rx.test(s) && s.length >= 40 && s.length <= 260);
      if (!sentence) continue;
      const match = sentence.match(rx);
      if (!match) continue;
      usedSentences.add(sentence);
      clozeCards.push({
        front: sentence.replace(rx, '_____'),
        back: cleanAnswer(match[0]),
        hint: sentence,
        type: 'cloze',
      });
    }
  }

  let cards = dedupeCards([...listCards, ...definitionCards, ...clozeCards]);

  // Last-resort fallback: only reached when notes are too short/unstructured for
  // any of the strategies above to find real content — still better than
  // failing outright, but far less likely to fire than in the old engine.
  if (cards.length < 4 && sentences.length) {
    for (const sentence of sentences) {
      if (cards.length >= maxCards) break;
      if (usedSentences.has(sentence)) continue;
      const words = sentence.split(/\s+/);
      if (words.length < 10) continue;
      const nounMatches = nlp(sentence).match('#Noun+').out('array');
      const target = nounMatches.find(n => wordsOf(n).length <= 3 && wordsOf(n).length >= 1);
      if (!target) continue;
      const rx = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
      if (!rx.test(sentence)) continue;
      usedSentences.add(sentence);
      cards.push({ front: sentence.replace(rx, '_____'), back: cleanAnswer(target), hint: sentence, type: 'cloze' });
    }
    cards = dedupeCards(cards);
  }

  return cards.slice(0, maxCards);
}

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
