// ─────────────────────────────────────────────────────────────────────────────
// The core verb-predicate template table: classic "X is/are Y" definitions plus
// the common factual-verb shapes med/science notes actually use (responsible
// for, controls, measures, produces, contains, involved in, associated with,
// caused by, can cause/lead to/interrupt). Templates are tried in specificity
// order (most specific verb phrase first) and the first match wins per sentence
// — every other extractor still gets an independent shot at the same sentence.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeTerm, isUsableTerm, isUsableDefinition, cleanAnswer, capitalize, lowerFirstWord, isAreFor, wordsOf } from '../text.js';

const TEMPLATES = [
  {
    name: 'responsible-for',
    re: /^(.{2,60}?)\s+(is|are)\s+(?:primarily\s+)?responsible for\s+(.{4,350})$/i,
    build: m => ({ q: `What ${m[2].toLowerCase()} ${lowerFirstWord(m[1])} responsible for?`, a: m[3] }),
  },
  {
    name: 'controls',
    re: /^(.{2,60}?)\s+controls?\s+(.{4,350})$/i,
    build: m => ({ q: `What does ${lowerFirstWord(m[1])} control?`, a: m[2] }),
  },
  {
    name: 'measures',
    re: /^(.{2,60}?)\s+measures?\s+(.{4,350})$/i,
    build: m => ({ q: `What does ${lowerFirstWord(m[1])} measure?`, a: m[2] }),
  },
  {
    name: 'produces',
    re: /^(.{2,60}?)\s+produces?\s+(.{4,350})$/i,
    build: m => ({ q: `What does ${lowerFirstWord(m[1])} produce?`, a: m[2] }),
  },
  {
    // Numbers are left to the numeric extractor, which builds a cleaner,
    // atomic "approximately how many X" card instead of a vague "what does X
    // contain" that swallows an unrelated trailing clause too.
    name: 'contains',
    re: /^(.{2,60}?)\s+contains?\s+(?!(?:about|approximately|roughly|around)?\s*\d)(.{4,350})$/i,
    build: m => ({ q: `What does ${lowerFirstWord(m[1])} contain?`, a: m[2] }),
  },
  {
    name: 'involved-in',
    re: /^(.{2,60}?)\s+(is|are)\s+involved in\s+(.{4,350})$/i,
    build: m => ({ q: `What ${m[2].toLowerCase()} ${lowerFirstWord(m[1])} involved in?`, a: m[3] }),
  },
  {
    name: 'associated-with',
    re: /^(.{2,60}?)\s+(is|are)\s+associated with\s+(.{4,350})$/i,
    build: m => ({ q: `What ${m[2].toLowerCase()} ${lowerFirstWord(m[1])} associated with?`, a: m[3] }),
  },
  {
    name: 'caused-by',
    re: /^(.{2,60}?)\s+(?:is|are|was|were)\s+caused by\s+(.{4,350})$/i,
    build: m => ({ q: `What is ${lowerFirstWord(m[1])} caused by?`, a: m[2] }),
  },
  {
    name: 'can-cause',
    re: /^(.{2,60}?)\s+(?:can |may |often )?causes?\s+(.{4,350})$/i,
    build: m => ({ q: `What can ${lowerFirstWord(m[1])} cause?`, a: m[2] }),
  },
  {
    name: 'can-lead-to',
    re: /^(.{2,60}?)\s+can\s+lead to\s+(.{4,350})$/i,
    build: m => ({ q: `What can ${lowerFirstWord(m[1])} lead to?`, a: m[2] }),
  },
  {
    name: 'can-interrupt',
    re: /^(.{2,60}?)\s+can\s+interrupt\s+(.{4,350})$/i,
    build: m => ({ q: `What can ${lowerFirstWord(m[1])} interrupt?`, a: m[2] }),
  },
  {
    name: 'definition-article',
    re: /^(.{2,60}?)\s+(is|are)\s+(a|an|the)\s+(.{4,350})$/i,
    build: m => ({ q: `What ${m[2].toLowerCase()} ${lowerFirstWord(m[1])}?`, a: `${capitalize(m[3])} ${m[4]}` }),
  },
  {
    name: 'definition-generic',
    re: /^(.{2,60}?)\s+(is|are|refers to|means?|represents?)\s+(.{4,350})$/i,
    build: m => ({ q: `What ${/^are$/i.test(m[2]) ? 'are' : 'is'} ${lowerFirstWord(m[1])}?`, a: m[3] }),
  },
];

/** Runs the verb-predicate template table against a single (already subject-cleaned) sentence, returning at most one candidate — the most specific template that matches. */
export function extractFacts(sentence, category) {
  const cleaned = sentence.replace(/[.!]$/, '');
  for (const tpl of TEMPLATES) {
    const m = cleaned.match(tpl.re);
    if (!m) continue;
    const term = normalizeTerm(m[1]);
    if (!isUsableTerm(term)) continue;
    const { q, a } = tpl.build(m);
    if (!isUsableDefinition(term, a)) continue;
    return [{
      front: q,
      back: cleanAnswer(a),
      category,
      term,
      type: tpl.name.startsWith('definition') ? 'definition' : tpl.name.startsWith('can-') || tpl.name === 'caused-by' ? 'causal' : 'fact',
      confidence: tpl.name.startsWith('definition') ? 5 : 4,
      hint: sentence,
    }];
  }
  return [];
}

// "Delta waves (0.5–4 Hz) occur during deep, dreamless sleep." -> one combined
// card folding the parenthetical detail into the answer, rather than losing it
// (the generic templates above run on parenthetical-stripped text, so they'd
// otherwise drop the Hz range entirely).
// The term is capped at 3 words so a sentence like "Sleep occurs in cycles of
// REM (rapid eye movement) and ..." can't be mistaken for "Term (detail) verb
// ..." shape — that would swallow an unrelated clause as if it were the term.
const PAREN_FACT_RE = /^([A-Z][\w']*(?:\s+[A-Za-z][\w']*){0,2})\s*\(([^()]{1,60})\)\s+(.{4,350})$/;

export function extractParentheticalFact(sentence, category) {
  const m = sentence.match(PAREN_FACT_RE);
  if (!m) return [];
  const term = m[1].trim();
  const paren = m[2].trim();
  const rest = m[3].trim().replace(/[.!]$/, '');
  if (wordsOf(rest).length < 2) return [];
  // "EEG (electroencephalogram) measures..." — an acronym/expansion pair here
  // is already handled better by the acronym extractor (for the abbreviation)
  // and the verb-predicate templates (for what it does); this generic combined
  // card would just be a redundant, awkwardly-worded duplicate of both.
  if (/^[A-Z]{2,6}$/.test(term) || /^[A-Z]{2,6}$/.test(paren)) return [];
  return [{
    front: `What ${isAreFor(term)} ${lowerFirstWord(term)}?`,
    back: cleanAnswer(`${capitalize(rest)} (${paren}).`),
    category,
    term: normalizeTerm(term),
    type: 'definition',
    confidence: 5,
    hint: sentence,
  }];
}
