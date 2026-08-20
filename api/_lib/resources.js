// The per-user data tables, in one place.
//
// This list was previously a `RESOURCES` set private to api/data/[resource].js,
// which was fine while that endpoint was the only thing that needed to know
// what a user's data consists of. api/auth/account.js needs the same answer to
// build a data export, and a second hand-maintained copy of this list would
// have exactly one failure mode: a table added to the app, wired into the CRUD
// endpoint, and silently missing from every user's export — which is the kind
// of gap that turns a GDPR Art. 20 portability request into an incomplete
// response without anyone noticing.
//
// So both import from here. Adding a table to this list is what makes it
// readable, writable, exportable, and deletable, all at once.

export const RESOURCES = [
  'colleges',
  'college_checklist_items',
  'deadlines',
  'essays',
  'essay_versions',
  'test_scores',
  'scholarships',
  'activities',
  'awards',
  'gpa_entries',
  'research_experience',
  'skills_certifications',
  'clinical_hours',
  'recommenders',
  'portfolio_evidence',
  // One row per user — the Admissions Calculator's intake (see
  // supabase/migrations/0017_admission_intake.sql). Listed here like every other
  // resource so it is exportable and deletable the moment it is writable.
  'admission_intake',
  // Credentials a student typed that the catalog does not know about, submitted for review so
  // src/data/credentials/ improves instead of the field filling with typos. Listed here like
  // every other resource so a student's suggestions are exportable and deletable with their
  // account — see supabase/migrations/0018_credential_catalog.sql.
  'credential_suggestions',
];

/** Membership test for the CRUD endpoint's `[resource]` path segment. */
export const RESOURCE_SET = new Set(RESOURCES);

/**
 * What a data export includes. Currently every resource — there is no user
 * data we hold but would decline to hand back. If that ever stops being true,
 * the exclusion belongs here with a comment explaining why, not as a silent
 * omission.
 */
export const EXPORTABLE_RESOURCES = RESOURCES;
