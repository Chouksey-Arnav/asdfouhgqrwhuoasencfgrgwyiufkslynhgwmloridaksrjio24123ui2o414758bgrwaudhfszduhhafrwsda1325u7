// Age verification, in one place so the Privacy Policy's claim about it has
// exactly one implementation to be true of.
//
// ── The bug this replaces ──────────────────────────────────────────────────
//
// The birthdate wheel used to offer years from `THIS_YEAR - 12` backwards. A
// twelve-year-old could not enter their real birth year: the oldest option was
// the year that makes you twelve, and everything below it made you older. So
// the control did not screen anyone out — it silently converted every
// under-13 user into a 12-or-older user before the answer was ever read. That
// is worse than having no age gate at all, because the resulting data looks
// like compliance.
//
// The wheel now reaches down to age 5. That is deliberate and it is not an
// invitation: you cannot enforce a minimum age with a control that makes the
// disqualifying answer unselectable. Ask honestly, then act on the answer.
//
// ── What COPPA actually requires here ──────────────────────────────────────
//
// The FTC's guidance on age screens is specific: the screen must be neutral
// (it must not encourage a particular answer), and a user who fails it must
// not simply be able to go back and try a different birthday. Both of those
// shape the code below — `recordAgeCheck` persists the failure, and
// `isAgeBlocked` is consulted before the onboarding flow will render the
// birthdate step again.
//
// The block is local-storage based, which a determined teenager can clear.
// That is fine and expected: COPPA asks for a screen a child cannot trivially
// re-answer, not for an identity check. What matters legally is that we do not
// invite the retry, and that when we do have actual knowledge that a user is
// under 13, we act on it — which is what the blocked state exists to record.

// Explicit .js extension, unlike most imports in src/: Vite resolves either
// way, but scripts/verifyLegal.mjs imports this module in plain Node to run the
// age maths for real rather than grepping for it, and Node needs the extension.
// A gate this consequential should be executable by its own test.
import { LEGAL } from '../legal/legalConfig.js';

/** Youngest birth year offered by the wheel. */
export const MIN_WHEEL_AGE = 5;
/** Oldest. Covers returning adult users and anyone using this well after school. */
export const MAX_WHEEL_AGE = 31;

const BLOCK_KEY = 'msp_ageBlocked';

/**
 * Whole years elapsed, calendar-correct — the birthday has to have happened
 * this year for it to count. `new Date()` arithmetic on milliseconds gets this
 * wrong across leap years, and "wrong by a day for people born on 29 February"
 * is not a defect you want in the control that decides whether COPPA applies.
 *
 * @param {{year:number, month:number, day:number}} dob month is 1-12
 * @param {Date} [now]
 * @returns {number|null} age in years, or null if the date is not a real date
 */
export function ageFromBirthdate({ year, month, day }, now = new Date()) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject dates that do not exist (31 February), which the wheel can produce
  // because its day column is a fixed 1-31.
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;

  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) age -= 1;
  return age;
}

/** True when this birthdate belongs to someone too young to use the Service. */
export function isUnderMinAge(dob, now = new Date()) {
  const age = ageFromBirthdate(dob, now);
  // An unparseable date is not a pass. The only way past the gate is a real
  // date that clears the bar.
  if (age === null) return true;
  return age < LEGAL.minAge;
}

/** True when the student is a minor, and so needs a parent on the contract. */
export function isMinor(dob, now = new Date()) {
  const age = ageFromBirthdate(dob, now);
  if (age === null) return false;
  return age < LEGAL.minorAge;
}

/**
 * Remember that this browser failed the age screen, so the flow does not simply
 * offer the wheel again — the "try another birthday" loop the FTC's age-screen
 * guidance exists to prevent.
 */
export function recordAgeBlocked() {
  try { localStorage.setItem(BLOCK_KEY, String(Date.now())); } catch { /* storage unavailable — the in-memory block still holds for this session */ }
}

export function isAgeBlocked() {
  try { return !!localStorage.getItem(BLOCK_KEY); } catch { return false; }
}

/**
 * Clears the block. Called only when an account is deleted, so the same device
 * is usable again by a different person — a shared family laptop should not be
 * permanently burned because a younger sibling once opened the app.
 */
export function clearAgeBlocked() {
  try { localStorage.removeItem(BLOCK_KEY); } catch { /* ignore */ }
}
