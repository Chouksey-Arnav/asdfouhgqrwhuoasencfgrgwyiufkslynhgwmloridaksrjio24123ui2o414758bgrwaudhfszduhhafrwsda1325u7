// ─────────────────────────────────────────────────────────────────────────────
// "Can I actually apply for this, now, as a senior?" — the filter the
// scholarship database was missing.
//
// ── Why this is a hand-curated exclusion list and not a keyword rule ────────
// The obvious implementation is to regex each entry's eligibility line for
// "senior". It fails in both directions, and both failures are expensive:
//
//   • FALSE NEGATIVE — the Gates Scholarship, the Hispanic Scholarship Fund and
//     every state grant are open to a graduating senior and several never use
//     the word. Hiding a $50,000 award behind a keyword miss is the worst
//     outcome this module can produce.
//   • FALSE POSITIVE — the National Merit Scholarship's eligibility line is
//     about JUNIORS taking the PSAT. A senior cannot enter it at all. Showing
//     it under "open to seniors" sends a student to a door that closed a year
//     ago, in the one month of their life when they have no time to waste.
//
// So the rule is inverted: everything in the curated database is open to a
// current senior EXCEPT the four entries whose own eligibility text says
// otherwise, which are named here individually with the reason. Four exceptions
// out of eighty-one is a list a human can verify by reading, which a regex over
// eighty-one prose sentences is not.
//
// scripts/verifyPathwayFinance.mjs asserts every id below still exists in the
// database, so a renamed entry fails the build instead of silently rejoining
// the senior list.
// ─────────────────────────────────────────────────────────────────────────────
import { SCHOLARSHIPS } from '../data/scholarships';
import { HEALTH_SCHOLARSHIPS } from '../data/healthCareerScholarships';

/**
 * Entries in src/data/scholarships.js that a current high school SENIOR
 * cannot apply for, with the reason taken from the entry's own eligibility
 * line. Everything not listed here is senior-eligible.
 */
export const NOT_OPEN_TO_SENIORS = {
  'national-merit-scholarship':
    'Entry is via the PSAT/NMSQT taken in JUNIOR year. A senior has already either qualified or not — there is no senior-year application.',
  'aamc-fap':
    'Not a scholarship and not for high schoolers — fee assistance at the medical school application stage, years from now.',
  'goldwater-scholarship':
    'For college sophomores and juniors already doing research. Listed in the database as a thing to aim at, not a thing to apply for.',
  'first-gen-note':
    'A reminder entry rather than an award — there is nothing to apply to.',
};

/** True when a current senior can enter this award at all. */
export function openToSeniors(entry) {
  return !!entry && !(entry.id in NOT_OPEN_TO_SENIORS);
}

/** Why an entry is hidden from the senior view — null when it isn't. */
export function seniorExclusionReason(entry) {
  return entry ? (NOT_OPEN_TO_SENIORS[entry.id] || null) : null;
}

/**
 * The health-career list, filtered by stage.
 *
 * 'senior'    — everything a graduating senior can enter now
 * 'undergrad' — the profession-specific awards that open at matriculation
 * 'all'       — both, which is the honest default for a ninth-grader
 */
export function healthScholarshipsFor(stage = 'senior') {
  if (stage === 'all') return HEALTH_SCHOLARSHIPS;
  return HEALTH_SCHOLARSHIPS.filter(s => (s.openTo || []).includes(stage)
    || (stage === 'senior' && (s.openTo || []).includes('hs-any')));
}

/** Health-career entries relevant to one pathway (a PATHWAY_FINANCE id). */
export function healthScholarshipsForPathway(pathwayId, stage = 'senior') {
  const list = healthScholarshipsFor(stage);
  if (!pathwayId) return list;
  return list.filter(s => (s.pathways || []).includes(pathwayId));
}

/**
 * Counts for the filter chips, so a chip that would show nothing can say so
 * rather than being a dead end the student taps twice.
 */
export function scholarshipCounts() {
  return {
    total: SCHOLARSHIPS.length,
    seniorEligible: SCHOLARSHIPS.filter(openToSeniors).length,
    excluded: Object.keys(NOT_OPEN_TO_SENIORS).length,
    healthNamed: HEALTH_SCHOLARSHIPS.filter(s => s.kind === 'named').length,
    healthDiscovery: HEALTH_SCHOLARSHIPS.filter(s => s.kind === 'discovery').length,
    healthSeniorOpen: healthScholarshipsFor('senior').length,
  };
}
