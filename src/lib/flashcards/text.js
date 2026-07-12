// ─────────────────────────────────────────────────────────────────────────────
// Shared string/regex primitives used across the flashcard extraction pipeline.
// Nothing here touches the network or any external service — pure string ops.
// ─────────────────────────────────────────────────────────────────────────────

export const STOPWORD_CAP_EXEMPT = new Set(['a','an','the','of','in','on','for','and','or','to','with','&','vs','vs.']);
export const LEADING_ARTICLE_RE = /^(the|a|an)\s+/i;
export const BULLET_PREFIX_RE = /^\s*(?:[-*•▪◦‣]|\d+[.)])\s+/;
export const PRONOUN_FRONT_RE = /^(it|this|that|these|those|they|he|she|we|you|i|there)$/i;

// Verbs that plausibly mark the start of a factual predicate — used to find
// where a sentence's subject ends (permissive: matches singular or plural verb
// forms, e.g. "occur" or "occurs").
export const CLAUSE_VERB_RE = /\b(is|are|was|were|has|have|can|controls?|regulates?|measures?|produces?|contains?|causes?|involves?|stands?|travels?|occurs?|helps?|plays?|serves?|interrupts?|leads?|results?|consists?|uses?|makes?)\b/i;

// Stricter version (3rd-person-singular "-s" forms only) used solely to gate
// compound-sentence splitting — a bare noun like "impulse control" or "search
// results" must never be mistaken for a verb and trigger a bogus split.
export const SPLIT_SAFE_VERB_RE = /\b(is|are|was|were|has|have|can|controls|regulates|measures|produces|contains|causes|involves|stands|travels|occurs|helps|plays|serves|interrupts|leads|results|consists|uses|makes)\b/i;

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wordsOf(str) {
  return (str || '').trim().split(/\s+/).filter(Boolean);
}

export function capitalize(s) {
  const t = (s || '').trim();
  if (!t) return t;
  const idx = t.search(/[A-Za-z]/);
  if (idx === -1) return t;
  return t.slice(0, idx) + t.charAt(idx).toUpperCase() + t.slice(idx + 1);
}

/** Lowercases only the leading word of a phrase, unless that word is an acronym (all-caps) or a possessive proper name (e.g. "Alzheimer's"), so subjects read naturally when embedded mid-question. */
export function lowerFirstWord(phrase) {
  const words = wordsOf(phrase);
  if (!words.length) return phrase;
  const w0 = words[0];
  const isAcronym = /^[A-Z]{2,}$/.test(w0.replace(/[^A-Za-z]/g, ''));
  const hasApostrophe = /'/.test(w0);
  if (isAcronym || hasApostrophe) return words.join(' ');
  words[0] = w0.charAt(0).toLowerCase() + w0.slice(1);
  return words.join(' ');
}

/** True for short, punctuation-less, mostly-capitalized lines — i.e. titles/headings, not content. */
export function isHeadingLike(raw) {
  const trimmed = (raw || '').trim().replace(/[:\-–—]\s*$/, '');
  if (!trimmed) return true;
  if (/[.!?]$/.test(trimmed)) return false;
  const words = wordsOf(trimmed);
  if (!words.length || words.length > 10) return false;
  const content = words.filter(w => !STOPWORD_CAP_EXEMPT.has(w.toLowerCase().replace(/[^a-z&]/gi, '')));
  if (!content.length) return false;
  const capCount = content.filter(w => /^[A-Z]/.test(w)).length;
  return capCount / content.length >= 0.7;
}

/** Strips a leading article and trailing punctuation, for use as a dedup key / bare term. */
export function normalizeTerm(term) {
  return (term || '').trim().replace(LEADING_ARTICLE_RE, '').replace(/[.:;,]+$/, '').trim();
}

export function isUsableTerm(term) {
  if (!term) return false;
  const words = wordsOf(term);
  if (!words.length || words.length > 6) return false;
  if (PRONOUN_FRONT_RE.test(words[0])) return false;
  return true;
}

export function isUsableDefinition(term, def) {
  if (!def) return false;
  const trimmed = def.trim();
  if (wordsOf(trimmed).length < 2) return false;
  if (isHeadingLike(trimmed)) return false; // guards against a subtitle being mistaken for an answer
  const lowerDef = trimmed.toLowerCase();
  const lowerTerm = (term || '').toLowerCase();
  if (lowerDef === lowerTerm) return false;
  if (lowerTerm && lowerDef.includes(lowerTerm) && trimmed.length < term.length * 2) return false; // tautology ("X is X")
  return true;
}

export function cleanAnswer(s) {
  return capitalize((s || '').trim().replace(/\s+/g, ' ')).replace(/[.:;,]+$/, '.').replace(/\.\.$/, '.');
}

export function titleCase(s) {
  return wordsOf(s).map(w => {
    const bare = w.toLowerCase().replace(/[^a-z&]/gi, '');
    if (STOPWORD_CAP_EXEMPT.has(bare)) return w.toLowerCase();
    return capitalize(w);
  }).join(' ');
}

/** "is" for a singular-looking term, "are" for a plural one (crude but effective for common nouns). */
export function isAreFor(term) {
  const last = wordsOf(term).slice(-1)[0] || '';
  const plural = /s$/i.test(last) && !/(ss|us|is)$/i.test(last);
  return plural ? 'are' : 'is';
}

export function joinWithAnd(arr) {
  const items = arr.filter(Boolean);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const NUMBER_WORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
export function parseCountWord(word) {
  if (!word) return null;
  const digit = parseInt(word, 10);
  if (!Number.isNaN(digit)) return digit;
  return NUMBER_WORDS[word.toLowerCase()] || null;
}

/**
 * Removes a comma-bounded non-restrictive appositive that sits between a subject
 * and its main verb, e.g. "The hippocampus, a structure within the temporal lobe,
 * is primarily responsible for..." -> "The hippocampus is primarily responsible for...".
 * This is the fix for subject misattribution: without it, downstream extractors would
 * either choke on the long noisy "term" or (worse) blend the aside into the fact.
 */
export function stripAppositive(sentence) {
  return sentence.replace(
    new RegExp(`^([A-Z][^,]{1,60}),\\s+[^,]{3,90},\\s+(?=${CLAUSE_VERB_RE.source})`, 'i'),
    '$1 '
  );
}

/** Removes parenthetical asides for the purposes of matching subject/verb templates (acronym extraction runs on the un-stripped sentence separately, since it needs the parens). */
export function stripParentheticals(sentence) {
  return sentence.replace(/\s*\([^()]{1,80}\)/g, '').replace(/\s{2,}/g, ' ');
}

/**
 * If a sentence opens on a bare pronoun ("It is responsible for..."), substitute
 * in the most recent clear subject from earlier in the same section so the fact
 * doesn't get lost (and so it's attributed correctly instead of dropped or
 * mis-attached to whatever the extractor happens to grab next).
 */
export function resolvePronoun(sentence, lastSubject) {
  if (!lastSubject) return sentence;
  return sentence.replace(/^(It|They|This|These|Those)\b/i, capitalize(lastSubject));
}

const SUBJECT_RE = new RegExp(`^((?:[A-Za-z][\\w'.-]*)(?:\\s+[\\w'.-]+){0,5}?)\\s+${CLAUSE_VERB_RE.source}\\b`, 'i');

/** Best-effort grammatical subject: the noun phrase before the sentence's first clause-marking verb, after stripping appositives/parentheticals. */
export function getSubject(sentence) {
  const cleaned = stripParentheticals(stripAppositive(sentence));
  const m = cleaned.match(SUBJECT_RE);
  if (!m) return null;
  const subject = m[1].trim();
  if (/^there$/i.test(subject)) return null; // existential "there" is never a real subject
  return subject;
}

/** Splits a compound sentence on ", and " / ", while " / ", whereas " — but only when every resulting half plausibly has its own verb, so enumerations ("...speaking, and emotional regulation.") never get chopped into a bogus trailing card. */
export function splitCompoundClauses(sentence) {
  const parts = sentence.split(/,\s*(?:and|while|whereas)\s+/i);
  if (parts.length < 2) return [sentence];
  const good = parts.every(p => SPLIT_SAFE_VERB_RE.test(p));
  if (!good) return [sentence];
  return parts.map((p, i) => {
    const t = p.trim();
    return /[.!?]$/.test(t) ? t : `${t}.`;
  });
}

/** Trailing noun phrase of a matched fragment — used by the relative-clause extractor, where the regex may over-capture leading words but the term we want is always the tail (e.g. "neuron has dendrites" -> "dendrites", "and an axon" -> "an axon"). */
export function trailingNounPhrase(phrase) {
  const words = wordsOf(phrase);
  if (!words.length) return phrase;
  const last = words[words.length - 1];
  const prev = words[words.length - 2];
  if (prev && /^(a|an|the)$/i.test(prev)) return `${prev} ${last}`;
  return last;
}
