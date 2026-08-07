// ─────────────────────────────────────────────────────────────────────────────
// Structured scholarship notes — one format, two directions.
//
// A tracked scholarship's rich detail (org, eligibility, description, typical
// amount/deadline) has always lived in the free-text `notes` column — see
// trackingCatalog.js's rule that nothing curated gets dropped. Until now nothing
// ever read it back out again: FinancialAidPanel rendered name/amount/deadline/
// status and quietly ignored the paragraph of real detail sitting in `notes`.
//
// formatScholarshipNotes() is the one place that assembles that paragraph (used
// by both the curated-catalog builder and the Medabrain-research builder below,
// in trackingCatalog.js) and parseScholarshipNotes() is the one place that reads
// it back apart for display. Segments are joined with a blank line specifically
// so the parser can split on it deterministically — a single run-on sentence
// (the original format) can't be un-joined without guessing where one field
// ends and the next begins.
// formatScholarshipNotes lives in trackingCatalog.js (not here) — this module only reads notes
// back apart, and trackingCatalog.js's row builders need to call the formatter, so it lives
// wherever avoids a circular import between the two.
import { isCatalogSourced, isAiResearched } from './trackingCatalog.js';

/**
 * Reads a `formatScholarshipNotes` paragraph back into fields for display. Tolerant of older/
 * unstructured notes (a student's own free text, or the run-on legacy format): anything that
 * doesn't match a known "Label: " prefix falls back into `description` rather than being lost or
 * throwing, so a legacy row still renders as plain notes instead of an empty detail card.
 */
export function parseScholarshipNotes(notes) {
  const text = String(notes || '').trim();
  if (!text) return null;

  const segments = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const result = { org: null, eligibility: null, description: null, amountText: null, deadlineText: null, sourceLabel: null };
  const leftover = [];

  for (const seg of segments) {
    const eligM = seg.match(/^Eligibility:\s*([\s\S]*)$/i);
    const amtM = seg.match(/^Typical amount:\s*([\s\S]*?)\.?$/i);
    const dlM = seg.match(/^Typical deadline:\s*([\s\S]*?)\.?$/i);
    if (eligM) { result.eligibility = eligM[1].trim(); continue; }
    if (amtM) { result.amountText = amtM[1].trim(); continue; }
    if (dlM) { result.deadlineText = dlM[1].trim(); continue; }
    if (isCatalogSourced(seg)) { result.sourceLabel = 'catalog'; continue; }
    if (isAiResearched(seg)) { result.sourceLabel = 'ai'; continue; }
    leftover.push(seg);
  }

  // Only the structured builders below ever produce an "org" line (always first, always separate
  // from the description) — a single unlabeled blob with no other structured fields found is a
  // student's own free-text note, not an org name, so it belongs in `description` instead.
  const structured = result.eligibility || result.amountText || result.deadlineText || result.sourceLabel;
  if (leftover.length && structured) {
    result.org = leftover[0];
    if (leftover.length > 1) result.description = leftover.slice(1).join('\n\n');
  } else if (leftover.length) {
    result.description = leftover.join('\n\n');
  }

  const hasAnything = result.org || result.eligibility || result.description || result.amountText || result.deadlineText;
  return hasAnything ? result : null;
}
