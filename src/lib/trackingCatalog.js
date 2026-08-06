// ─────────────────────────────────────────────────────────────────────────────
// Catalog → tracked-row normalization.
//
// When a student hits "Track" on a curated database entry (src/data/scholarships.js,
// src/data/opportunities.js) we have a rich object in hand — org, eligibility, level, effort,
// tags, typical amount, typical deadline — and a real table row to write it into. This module is
// the single place that translates between the two, so "track it" means the whole entry lands in
// the tracker rather than a name and a paragraph of prose.
//
// Two rules govern everything below:
//
//   1. NOTHING IS DROPPED. Any catalog field without a matching column is folded into the row's
//      free-text field (`notes` / `description`) rather than discarded. Previously a tracked
//      scholarship kept only { name, notes } and a tracked opportunity only
//      { activity_type, position, description } — `org` was thrown away even though the
//      `organization` column was sitting right there, empty.
//
//   2. NOTHING IS INVENTED. The catalogs deliberately record amounts and deadlines as prose
//      ranges ("Opens late summer, due mid-fall", "Around $20,000 — confirm current amount")
//      because the real values move year to year — see the header comments in both data files.
//      We do NOT regex a date or a dollar figure out of that prose into the typed `deadline` /
//      `amount` columns: a parsed-from-vibes date is worse than an empty one, because the
//      student would then see a countdown they think is real. Those columns stay null and the
//      prose stays verbatim in `notes`; DeadlinesPanel surfaces the resulting "no date yet" rows
//      as an explicit prompt to go look the real date up (see needsDeadlineDate below).
// ─────────────────────────────────────────────────────────────────────────────

// ── Provenance ───────────────────────────────────────────────────────────────
// The one string that marks a row as "this came out of our catalog, the student didn't build it
// themselves". It is written into the row's free text by the builders below and read back by the
// Tracked tab (src/lib/trackedItems.js), which uses it to tell a saved program the student still
// has to act on from an activity they already do every week.
//
// It is a shared constant rather than a phrase duplicated at both ends because the reader and the
// writer drifting apart is silent: a reworded note would simply stop matching, and every tracked
// program would quietly drop off the follow-up board with nothing failing.
export const CATALOG_MARKER = 'Sourced from the MedSchoolPrep';

/** True when `text` (a row's notes/description) carries the catalog provenance marker. */
export function isCatalogSourced(text) {
  return String(text || '').includes(CATALOG_MARKER);
}

// ── Dedupe keys ──────────────────────────────────────────────────────────────
// The stable identity of a tracked thing, used to (a) mark catalog entries as already-tracked in
// the UI, (b) short-circuit a second Track tap, and (c) make outbox retries idempotent — a retry
// that can't tell "my POST succeeded but the response was lost" from "my POST never landed" is
// how you get duplicate rows. Normalized so trivial differences (case, punctuation, spacing,
// a trailing "Program") don't read as two different scholarships.
export function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‐-―]/g, '-')   // unicode dashes → hyphen
    .replace(/['’`"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+(program|scholarship|award|competition)$/g, '')
    .replace(/\s+/g, ' ');
}

// resource -> how to derive a dedupe key from an existing table row. Kept beside the row builders
// below so a column rename can't silently desync the two halves of the same identity.
const ROW_KEY_BUILDERS = {
  scholarships: (row) => normalizeKey(row.name),
  colleges: (row) => normalizeKey(row.name),
  activities: (row) => normalizeKey(`${row.position || ''} ${row.organization || ''}`),
  deadlines: (row) => `${normalizeKey(row.title)}|${row.due_date || ''}`,
};

export function rowDedupeKey(resource, row) {
  const build = ROW_KEY_BUILDERS[resource];
  return build ? build(row) : normalizeKey(JSON.stringify(row));
}

/** The subset of `rows` already tracking `resource`, as a Set of dedupe keys. */
export function trackedKeySet(resource, rows = []) {
  return new Set((rows || []).map(r => rowDedupeKey(resource, r)));
}

/** Finds an existing row matching `key`, or undefined. */
export function findExistingByKey(resource, rows = [], key) {
  return (rows || []).find(r => rowDedupeKey(resource, r) === key);
}

// ── Scholarships ─────────────────────────────────────────────────────────────
const SCHOLARSHIP_SOURCE_NOTE =
  `${CATALOG_MARKER} scholarship database — confirm current amount/deadline/eligibility on the official program site before applying.`;

/** A curated src/data/scholarships.js entry -> a `scholarships` row. */
export function scholarshipRowFromCatalog(entry) {
  const notes = [
    entry.org,
    entry.eligibility ? `Eligibility: ${entry.eligibility}` : null,
    entry.description,
    entry.amount ? `Typical amount: ${entry.amount}.` : null,
    entry.deadline ? `Typical deadline: ${entry.deadline}.` : null,
    SCHOLARSHIP_SOURCE_NOTE,
  ].filter(Boolean).join(' ');
  // amount/deadline stay null on purpose — see rule 2 in this file's header.
  return { name: entry.name, notes, status: 'researching', amount: null, deadline: null };
}

/** A free-text / AI-fallback scholarship the student chose to track anyway. */
export function scholarshipRowFromCustom(name, notes) {
  return { name, notes: notes || null, status: 'researching', amount: null, deadline: null };
}

/**
 * Tracked scholarships that are still missing a real deadline date — the ones whose countdown
 * would silently never appear. `awarded`/`denied` are excluded (nothing left to be late for).
 */
export function needsDeadlineDate(scholarships = []) {
  return (scholarships || []).filter(s => !s.deadline && !['awarded', 'denied'].includes(s.status));
}

// ── Opportunities ────────────────────────────────────────────────────────────
// src/data/opportunities.js `type` and the Portfolio activity vocabulary (ACT_TYPES in
// ActivitiesResumePanel.jsx) are two different taxonomies. Tracking an opportunity used to write
// its catalog type straight into `activity_type`, producing rows whose type ('Competition',
// 'Program', 'Academic'…) matches no option in the activity editor's dropdown — so opening one
// for editing silently reassigned it to whatever the select fell back to. Map explicitly instead,
// and keep the catalog's own type/level/effort in the description so the mapping is never lossy.
const CLINICAL_TAG_HINTS = ['shadowing', 'clinical exposure', 'hospital', 'patient care', 'clinical'];

function looksClinical(entry) {
  const tags = (entry.tags || []).map(t => String(t).toLowerCase());
  return tags.some(t => CLINICAL_TAG_HINTS.some(hint => t.includes(hint)));
}

export function activityTypeForOpportunity(entry) {
  switch (entry.type) {
    case 'Research': return 'Research';
    case 'Volunteering': return looksClinical(entry) ? 'Clinical/Shadowing' : 'Volunteering';
    case 'Organization': return looksClinical(entry) ? 'Health Club/HOSA' : 'Clubs & Organizations';
    case 'Academic': return 'Clubs & Organizations';
    case 'Program': return looksClinical(entry) ? 'Clinical/Shadowing' : 'Other';
    // No ACT_TYPE means "competition", and inventing one would misfile it. 'Other' is honest;
    // the catalog type is preserved verbatim in the description below either way.
    case 'Competition': return 'Other';
    default: return 'Other';
  }
}

/** A curated src/data/opportunities.js entry -> an `activities` row. */
export function activityRowFromOpportunity(entry, { sortOrder = 0 } = {}) {
  const description = [
    entry.desc,
    entry.eligibility ? `Eligibility: ${entry.eligibility}` : null,
    [entry.type, entry.level, entry.effort ? `${entry.effort} entry` : null].filter(Boolean).join(' · '),
    `${CATALOG_MARKER} opportunities database — confirm current details with the program before applying.`,
  ].filter(Boolean).join('\n\n');
  return {
    activity_type: activityTypeForOpportunity(entry),
    position: entry.name,
    organization: entry.org || '',
    description,
    status: 'ongoing',
    hours_per_week: 0,
    weeks_per_year: 0,
    grade_levels: [],
    skills_tags: (entry.tags || []).slice(0, 8),
    sort_order: sortOrder,
  };
}

/**
 * Which tracker an opportunity belongs in. The catalog carries type:'Scholarship' entries, and
 * routing those into the Portfolio activity list (as every Track tap used to) meant a student who
 * tracked a scholarship from this tab never saw it on the Financial Aid tab, never got it into
 * the scholarship totals, and never got a deadline out of it. Send them where they belong.
 */
export function resourceForOpportunity(entry) {
  return entry.type === 'Scholarship' ? 'scholarships' : 'activities';
}

/** An opportunity-catalog entry tracked as a scholarship rather than an activity. */
export function scholarshipRowFromOpportunity(entry) {
  const notes = [
    entry.org,
    entry.eligibility ? `Eligibility: ${entry.eligibility}` : null,
    entry.desc,
    [entry.level, entry.effort ? `${entry.effort} entry` : null].filter(Boolean).join(' · '),
    `${CATALOG_MARKER} opportunities database — confirm current amount/deadline/eligibility on the official program site before applying.`,
  ].filter(Boolean).join(' ');
  return { name: entry.name, notes, status: 'researching', amount: null, deadline: null };
}

/** The row a Track tap on an opportunity should create, paired with its target resource. */
export function trackTargetForOpportunity(entry, { sortOrder = 0 } = {}) {
  const resource = resourceForOpportunity(entry);
  return {
    resource,
    row: resource === 'scholarships'
      ? scholarshipRowFromOpportunity(entry)
      : activityRowFromOpportunity(entry, { sortOrder }),
  };
}

/**
 * The dedupe key a catalog entry will have once tracked. Must agree with rowDedupeKey() applied
 * to the row the builders above produce, otherwise an item would read as untracked forever (and
 * re-track on every tap). Covered by scripts/verifyTracking.mjs.
 */
export function catalogDedupeKey(resource, entry) {
  if (resource === 'scholarships') return normalizeKey(entry.name);
  if (resource === 'activities') return normalizeKey(`${entry.name} ${entry.org || ''}`);
  return normalizeKey(entry.name);
}
