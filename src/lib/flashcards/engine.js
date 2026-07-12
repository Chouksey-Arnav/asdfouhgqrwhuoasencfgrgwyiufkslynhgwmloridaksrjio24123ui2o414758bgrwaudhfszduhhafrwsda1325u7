// ─────────────────────────────────────────────────────────────────────────────
// Offline note -> flashcard engine (main orchestrator).
//
// Pipeline: (1) segment into sections + sentences, (2) run every extraction
// strategy against every sentence with no early exit, (3) globally rank/dedupe/
// select the requested count from the full candidate pool. 100% grounded — every
// card's answer is a direct quote or a trivial trim of source text; nothing is
// synthesized. Runs entirely client-side via `compromise` (MIT, no network).
// ─────────────────────────────────────────────────────────────────────────────
import { BULLET_PREFIX_RE, getSubject, resolvePronoun, normalizeTerm, stripAppositive, stripParentheticals } from './text.js';
import { splitIntoSections, sentencesFromProse, deriveCategory, MAX_INPUT_CHARS } from './segment.js';
import { parseListItem, buildListCard, extractRelativeClauseRoles, matchEnumerationLeadIn, buildEnumerationOverview } from './extractors/lists.js';
import { extractFacts, extractParentheticalFact } from './extractors/facts.js';
import { extractProcess } from './extractors/process.js';
import { extractNumeric } from './extractors/numeric.js';
import { extractAcronyms } from './extractors/acronyms.js';
import { extractComparison } from './extractors/comparisons.js';
import { extractMisconception } from './extractors/misconceptions.js';
import { extractCloze } from './extractors/cloze.js';
import { rankAndSelect } from './rank.js';

function processSection(section, sectionIndex) {
  const rawLines = section.lines.map(l => l.replace(BULLET_PREFIX_RE, '').trim()).filter(Boolean);

  const listCards = [];
  const proseLines = [];
  const usedTermKeys = new Set();

  for (const line of rawLines) {
    const item = parseListItem(line);
    if (item) {
      const key = item.term.toLowerCase();
      if (usedTermKeys.has(key)) continue;
      usedTermKeys.add(key);
      proseLines.push(null); // placeholder keeps loop simple; card built below
      listCards.push({ item });
      continue;
    }
    if (/:$/.test(line)) continue; // bare "Section name:" header line — never prose
    proseLines.push(line);
  }

  const proseText = proseLines.filter(Boolean).join(' ');
  const sentences = sentencesFromProse(proseText);
  const category = deriveCategory(section.heading, sentences);

  const sectionCandidates = listCards.map(({ item }) => buildListCard(item, category));
  const usedSentences = new Set();
  let lastSubject = null;
  let leadInMatch = null;

  for (const sentence of sentences) {
    const thisLeadIn = matchEnumerationLeadIn(sentence);
    if (thisLeadIn) {
      if (!leadInMatch) leadInMatch = thisLeadIn;
      usedSentences.add(sentence); // already folded into the enumeration overview card below
      continue;
    }

    const resolved = resolvePronoun(sentence, lastSubject);
    const subj = getSubject(resolved);
    if (subj) lastSubject = subj;
    // Facts/process templates match "subject VERB predicate" directly, so they
    // need appositives ("X, a structure within Y,") and parentheticals stripped
    // first — otherwise a long aside either breaks the term-length check (fact
    // lost) or leaks into the captured subject (fact misattributed/garbled).
    const forTemplates = stripParentheticals(stripAppositive(resolved));

    const found = [
      ...extractAcronyms(sentence, category),
      ...extractParentheticalFact(resolved, category),
      ...extractFacts(forTemplates, category),
      ...extractRelativeClauseRoles(sentence, category),
      ...extractProcess(forTemplates, category),
      ...extractNumeric(sentence, category, subj),
      ...extractComparison(sentence, category),
      ...extractMisconception(sentence, category),
    ];

    if (found.length) usedSentences.add(sentence);
    for (const c of found) sectionCandidates.push(c);
  }

  if (leadInMatch) {
    const overview = buildEnumerationOverview(leadInMatch, sectionCandidates, category);
    if (overview) sectionCandidates.push(overview);
  }

  const clozeTermKeys = new Set(sectionCandidates.map(c => c.term ? c.term.toLowerCase() : null).filter(Boolean));
  const clozeCards = extractCloze(sentences, usedSentences, category, clozeTermKeys);
  for (const c of clozeCards) sectionCandidates.push(c);

  for (const c of sectionCandidates) c.sectionIndex = sectionIndex;
  return sectionCandidates;
}

/**
 * Generate flashcards from pasted study notes.
 * @param {string} text
 * @param {number} maxCards
 * @returns {{cards:Array, requested:number, generated:number, coverage:'full'|'partial'}}
 */
export function generateFlashcardsFromNotes(text, maxCards = 20) {
  const requested = Math.max(1, Math.round(maxCards) || 20);
  if (!text || text.trim().length < 40) {
    return { cards: [], requested, generated: 0, coverage: 'partial' };
  }

  const sections = splitIntoSections(text.slice(0, MAX_INPUT_CHARS));
  const allCandidates = [];
  sections.forEach((section, i) => {
    allCandidates.push(...processSection(section, i));
  });

  const cards = rankAndSelect(allCandidates, requested);
  return {
    cards,
    requested,
    generated: cards.length,
    coverage: cards.length >= requested ? 'full' : 'partial',
  };
}

export { normalizeTerm };
