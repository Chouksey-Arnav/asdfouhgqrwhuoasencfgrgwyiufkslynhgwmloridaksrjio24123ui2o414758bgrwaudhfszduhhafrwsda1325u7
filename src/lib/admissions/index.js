// The Admissions Calculator's public surface. Panels import from here; the
// layer modules are implementation detail and are free to be reorganised.
//
// The layers, in the order they run and in the order they must be read:
//
//   1. gates.js        — pass/fail requirements. A failure means NO percentage.
//   2. academicFit.js  — position against the 25th, 50th AND 75th percentile,
//                        with academics' discriminating power decayed by the
//                        programme's selectivity.
//   3. portfolioFit.js — everything else, scored on depth, sustain and evidence
//                        quality rather than on totals.
//   4. model.js        — per-programme weighting (the research-vs-clinical
//                        axis), composed on the log-odds scale against a
//                        hook-corrected base rate, bounded by a selectivity
//                        ceiling.
//   5. round.js        — early vs regular, with the headline early-round lift
//                        deflated for an unhooked applicant.
//
// Plus intake.js, which reads the Portfolio for everything it already knows and
// reports exactly what is still missing and what each missing thing would
// change.
export { evaluateGates } from './gates.js';
export { scoreAcademicFit, academicLeverage, positionInBand, scoreRigor } from './academicFit.js';
export { scorePortfolioFit, depthZ, sustainFactor, evidenceFactor } from './portfolioFit.js';
export { scoreRound, ROUND_LABELS, ROUND_IDS } from './round.js';
export { DRIVER_LABELS } from './model.js';
export { estimateAdmission, probabilityCeiling, probabilityFloor, signalBudget, unhookedBaseRate, applyWeighting } from './model.js';
export {
  INTAKE_FIELDS, METER_FIELDS, derivePortfolioSignals, deriveApplicantFromPortfolio,
  buildApplicant, assessCompleteness, nextQuestions,
} from './intake.js';
export { loadIntake, saveIntake, flushIntake, unpackIntake, resetIntakeCache } from './store.js';
export {
  PROGRAM_PROFILES, getProgramProfile, resolveProfile, allProfiles, deriveUndergradProfile,
  PORTFOLIO_DIMENSIONS, DEFAULT_REFERENCE_LEVELS, CATALOG_READ_ON,
} from '../../data/admissions/programProfiles.js';
