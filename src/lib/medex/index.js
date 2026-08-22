// The MedEx Score's public surface. Components import from here; the modules
// below are implementation detail and are free to be reorganised.
//
// What the pieces are, in the order they matter:
//
//   scale.js     — what a number on the 0-1000 scale MEANS. 850 is the median
//                  admitted student at your benchmark; the curve decelerates
//                  above it because separation up there is decided by things no
//                  model can see.
//   benchmark.js — what it is measured against: the most selective programme on
//                  the student's own list (the headline), plus a fixed apex
//                  slate that does not move when they edit that list.
//   score.js     — the projection of src/lib/admissions/ onto one number. This
//                  file computes nothing about admissions itself, on purpose —
//                  a second scoring model would disagree with the Calculator
//                  within a week, and the more flattering one would win.
//   week.js      — the weekly seal, and why the score deliberately is not live.
//   store.js     — the seal history, which is the one part that cannot be
//                  recomputed and therefore the only part that is stored.
export {
  MEDEX_MIN, MEDEX_MAX, MEDEX_COHORT_MEDIAN, MEDEX_COPY,
  ANCHORS, BANDS, bandFor, nextBand, scoreFromZ, zFromScore,
} from './scale.js';

export {
  APEX_ACCEPT_CEILING, APEX_SLATE_SIZE,
  apexSlate, effectiveAdmitRate, resolveCollegeList, pickBenchmark, resetApexCache,
} from './benchmark.js';

export {
  PILLARS, MIN_COVERAGE,
  scoreProgram, scoreCollegeList, rankAgainstApex, computeMedEx,
} from './score.js';

export {
  weekKey, weekStart, weekLabel, weekStartFromKey, previousWeekKey,
  nextSealAt, sealCountdown, planSeal, weeksBetween, compareWeekKeys,
} from './week.js';

export {
  loadSeals, sealIfNeeded, readMirror, writeMirror, resetMedexCache,
} from './store.js';
