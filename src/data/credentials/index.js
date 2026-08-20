// The credential database, assembled.
//
// Four source files, one list, one id space. Everything downstream — the picker, the résumé
// export, the verify script — reads from here rather than from the individual files, so a record
// can move between files without breaking anything that points at it.
//
// The id is the stable key. It is what gets stored on the student's row in
// skills_certifications.credential_id, which is what lets us re-render a stored credential under a
// different state's name later, or correct a record's type without touching anyone's data. Ids are
// never reused and never renamed.
import { STATE_OCCUPATIONAL } from './stateOccupational.js';
import { NATIONAL_CERTIFICATIONS } from './nationalCertifications.js';
import { COURSE_COMPLETIONS } from './courseCompletions.js';
import { PORTFOLIO_SKILLS } from './portfolioSkills.js';

export * from './types.js';
export { STATE_OCCUPATIONAL, NATIONAL_CERTIFICATIONS, COURSE_COMPLETIONS, PORTFOLIO_SKILLS };

export const CREDENTIALS = [
  ...STATE_OCCUPATIONAL,
  ...NATIONAL_CERTIFICATIONS,
  ...COURSE_COMPLETIONS,
  ...PORTFOLIO_SKILLS,
];

const BY_ID = new Map(CREDENTIALS.map(c => [c.id, c]));

export function getCredential(id) {
  return BY_ID.get(id) || null;
}

/** Every issuing body named anywhere in the database, de-duplicated — feeds the issuer type-ahead. */
export const ISSUING_BODIES = [...new Set(CREDENTIALS.flatMap(c => c.issuers || []))].sort();

/**
 * What the picker shows before the student has typed anything. Ordered as an argument about what a
 * high schooler can actually get: the free CTE ones first, then the ones with a real paid job
 * behind them, then the research training that a lab will hand them.
 */
export const POPULAR_CREDENTIAL_IDS = [
  'aha-bls',
  'cna',
  'ccma',
  'cpt',
  'emt',
  'stop-the-bleed',
  'osha-10',
  'citi-human-subjects',
  'lifeguard-state',
  'cpht',
  'medical-spanish',
  'epic',
];

/** Every state code that any record in the database renames itself in. */
export const STATES_WITH_SYNONYMS = [...new Set(
  CREDENTIALS.flatMap(c => Object.keys(c.stateNames || {}))
)].sort();
