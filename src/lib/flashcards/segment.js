// ─────────────────────────────────────────────────────────────────────────────
// Topic-aware segmentation: split raw notes into sections (so cards can carry a
// category), and each section's prose into real sentences via `compromise`.
// ─────────────────────────────────────────────────────────────────────────────
import nlp from 'compromise';
import { isHeadingLike, getSubject, normalizeTerm, titleCase, splitCompoundClauses } from './text.js';

const MAX_INPUT_CHARS = 30000; // keeps generation instant even on a multi-page paste

function cleanHeading(line) {
  return line.trim().replace(/[:\-–—]\s*$/, '').trim();
}

/**
 * Groups lines into sections. Real interior headings (>=2 detected) group
 * everything under them, matching how structured markdown-style notes are
 * usually written. With 0-1 headings (e.g. just a document title), the lone
 * heading is dropped and every remaining paragraph becomes its own section —
 * which is what unheaded notes copy/pasted from a doc actually look like
 * (one topic per line/paragraph).
 */
export function splitIntoSections(rawText) {
  const lines = rawText.split('\n').map(l => l.trim().replace(/^#{1,6}\s+/, ''));
  const headingLines = lines.filter(l => l && isHeadingLike(l));
  const hasStructuralHeadings = headingLines.length >= 2;
  const hasBlankSeparators = lines.some(l => l === '');

  const sections = [];
  let current = null;
  const flush = () => { if (current && current.lines.length) sections.push(current); current = null; };

  if (hasStructuralHeadings) {
    for (const line of lines) {
      if (!line) continue;
      if (isHeadingLike(line)) { flush(); current = { heading: cleanHeading(line), lines: [] }; continue; }
      if (!current) current = { heading: null, lines: [] };
      current.lines.push(line);
    }
    flush();
  } else if (hasBlankSeparators) {
    for (const line of lines) {
      if (!line) { flush(); continue; }
      if (isHeadingLike(line)) continue; // lone title — dropped, never used as source material
      if (!current) current = { heading: null, lines: [] };
      current.lines.push(line);
    }
    flush();
  } else {
    for (const line of lines) {
      if (!line || isHeadingLike(line)) continue;
      sections.push({ heading: null, lines: [line] });
    }
  }
  return sections;
}

/** Splits a section's prose lines into sentences with compromise (handles abbreviations/decimals far better than naive regex splitting), then further splits safe compound clauses. */
export function sentencesFromProse(proseText) {
  if (!proseText || proseText.length < 12) return [];
  const raw = nlp(proseText).sentences().out('array').map(s => s.trim()).filter(s => s.length > 12 && s.length < 500);
  return raw.flatMap(splitCompoundClauses);
}

/** Derives a human-readable category label for a section with no explicit heading, from the grammatical subject of its first sentence. */
export function deriveCategory(heading, sentences) {
  if (heading) return cleanHeading(heading);
  for (const s of sentences) {
    const subj = getSubject(s);
    if (subj) {
      const term = normalizeTerm(subj);
      if (term && term.length <= 40) return titleCase(term);
    }
  }
  return null;
}

export { MAX_INPUT_CHARS };
