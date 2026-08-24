// ─────────────────────────────────────────────────────────────────────────────
// GRADUATION YEAR — the one fact about a student that changes everything else.
//
// ── Why this module exists ───────────────────────────────────────────────────
// Until now the app treated a ninth grader and a twelfth grader as the same
// person. They are not. They are functionally two different products: the
// ninth grader's problem is "what is any of this and where do I start", the
// twelfth grader's problem is a November 1 deadline that is eleven weeks away.
// Handing both of them the same foundations-upward lesson track is how you
// lose the senior in one session.
//
// ── Why graduation year and not grade ────────────────────────────────────────
// Grade is a fact with a shelf life of one school year. Store it and you have
// to remember to advance it, and every place that reads it has to know how
// stale it might be (the app already had one such patch — gradeStageYear —
// bolted onto a stored grade for exactly this reason). Graduation year is a
// fact that does not expire: "class of 2028" is true in 2025 and still true in
// 2027. Derive the grade from it and the rollover happens by itself, at the
// only moment that makes sense — August 1, when the academic year turns.
//
// So: `user.graduationYear` is the stored attribute. `gradeStageFor(user)` is
// the derived one. Nothing writes a grade.
//
// ── The rule that governs every consumer of this file ────────────────────────
// GRADE BAND CHANGES EMPHASIS AND NEVER ACCESS.
//
// Every feature stays visible and clickable to every student, at every band.
// Out-of-band features render in a preview state — fully browsable, with a
// banner that says who usually uses this and when — and are simply left out of
// the ACTIVE TASK LIST. Nothing is hidden, nothing is locked, no band ever
// gets a smaller app than another. Hidden value is unsold value: a ninth
// grader who never sees the program tracker will never ask a parent to pay for
// it. `bandStateFor()` below returns 'active' or 'preview' and there is
// deliberately no third value; scripts/verifyGradeBand.mjs fails the build if
// one appears, or if any consumer starts branching on band to decide whether
// something renders at all.
//
// Pure functions and plain data only — no React, no storage, no theme — so the
// verify script can import the whole thing under plain Node.
// ─────────────────────────────────────────────────────────────────────────────

import { academicFallYear, effectiveGradeStage, GRADE_KEYS, gradeIdxOf } from './timeline.js';

// ── The three bands ──────────────────────────────────────────────────────────
// Three, not five, because five is a taxonomy and three is a product decision.
// A freshman and a sophomore want the same thing from this app (look around,
// build a habit, find out what a pathway even is); a junior wants to build the
// thing they will apply with; a senior wants to ship it.
export const BANDS = [
  {
    id: 'explore',
    label: 'Explore',
    grades: ['freshman', 'sophomore'],
    years: '9th & 10th grade',
    // Second person, because every one of these is shown to the student.
    focus: 'Look around, find your pathway, and build a study habit that lasts.',
    // The phrase that goes in the preview banner for anything tagged to this
    // band. Written as "most students…", never "you can't…".
    previewLine: 'Most students use this in 9th or 10th grade',
  },
  {
    id: 'build',
    label: 'Build',
    grades: ['junior'],
    years: '11th grade',
    focus: 'Build the application: the list, the letters, the experiences, the essays.',
    previewLine: 'Most students use this junior year',
  },
  {
    id: 'apply',
    label: 'Apply',
    grades: ['senior', 'gap'],
    years: '12th grade',
    focus: 'Ship it — deadlines, submissions, and the decisions that come back.',
    previewLine: 'Most students use this senior year',
  },
];

export const BAND_IDS = BANDS.map(b => b.id);
export const BAND_BY_ID = Object.fromEntries(BANDS.map(b => [b.id, b]));

/** The band a grade key belongs to. Unknown/absent grade → null, which every
 *  consumer must treat as "everything is active" rather than as a mismatch:
 *  an account we know nothing about gets the whole app, not a preview of it. */
export function bandOfGrade(gradeStage) {
  const b = BANDS.find(x => x.grades.includes(gradeStage));
  return b ? b.id : null;
}

/** Band ids covered by a list of grade keys — how a thing already tagged with
 *  `gradeFocus`/`grades` (units in data/constants.js, milestones in
 *  timeline.js) gets a band tag for free, with no second list to keep in sync. */
export function bandsFromGrades(grades) {
  if (!Array.isArray(grades) || !grades.length) return [];
  const out = [];
  for (const b of BANDS) if (grades.some(g => b.grades.includes(g)) && !out.includes(b.id)) out.push(b.id);
  return out;
}

// ── Graduation year ⇄ grade ──────────────────────────────────────────────────

/**
 * The graduation year of a student who is in `gradeStage` during the academic
 * year that began in fall `fallYear`. Seniors in the 2026–27 year graduate in
 * spring 2027, so senior → fallYear + 1 and every earlier grade adds a year.
 */
export function graduationYearFor(gradeStage, now = new Date()) {
  const idx = gradeIdxOf(gradeStage);
  if (idx == null) return null;
  const fall = academicFallYear(now);
  // 'gap' (index 4) is a student who has already graduated — last spring.
  if (idx >= 4) return fall;
  return fall + 1 + (3 - idx);
}

/**
 * The inverse, and the function the whole app hangs off: what grade is a
 * student in the class of `graduationYear` in, right now?
 *
 * Because it is computed from today's date rather than read from storage, the
 * answer advances by itself on August 1 — the student who was a junior on
 * July 31 is a senior on August 1 with nothing written anywhere.
 *
 * A student past their graduation year lands on 'gap' rather than an invented
 * fifth year of high school; one whose year is far enough out that they are
 * not in high school yet reads as 'freshman', because the youngest band is
 * the right emphasis for them and there is no band below it.
 */
export function gradeStageFromGraduationYear(graduationYear, now = new Date()) {
  // Guarded against the falsy-but-numeric trap: Number(null) and Number('') are
  // both 0, which is finite, and a zero graduation year would confidently read
  // as 'gap' — i.e. "already applied" — for every account that has no year yet.
  if (graduationYear === null || graduationYear === undefined || graduationYear === '') return null;
  const g = Number(graduationYear);
  if (!Number.isFinite(g) || g < 1900) return null;
  const seniorGradYear = academicFallYear(now) + 1;
  const yearsOut = g - seniorGradYear;          // 0 = senior now, 3 = freshman now
  if (yearsOut < 0) return 'gap';
  return GRADE_KEYS[Math.max(0, 3 - Math.min(3, yearsOut))];
}

/**
 * A sensible DEFAULT graduation year from the date of birth onboarding already
 * collects — offered, never assumed. The student confirms it explicitly on the
 * next screen, because the guess is wrong for anyone who skipped a grade,
 * repeated one, started school late, or lives outside a September cutoff, and
 * a wrong graduation year silently mis-sequences the entire app.
 *
 * The arithmetic is the ordinary US cutoff: a child starts kindergarten in the
 * fall of the year they turn five (born Jan–Aug) or the year after (born
 * Sep–Dec), and graduates thirteen school years later.
 */
export function defaultGraduationYear({ year, month } = {}) {
  const y = Number(year), m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  return y + (m >= 9 ? 19 : 18);
}

/** The years worth offering as choices, newest cohort last. Wide enough to
 *  cover a student who is ahead or behind by two years in either direction. */
export function graduationYearChoices(now = new Date()) {
  const seniorGradYear = academicFallYear(now) + 1;
  const out = [];
  for (let y = seniorGradYear - 1; y <= seniorGradYear + 4; y++) out.push(y);
  return out;
}

/** Human label for a graduation year, with the grade it implies today. */
export function graduationYearLabel(graduationYear, now = new Date()) {
  const stage = gradeStageFromGraduationYear(graduationYear, now);
  const sub = {
    freshman: '9th grade this year', sophomore: '10th grade this year',
    junior: '11th grade this year', senior: '12th grade this year',
    gap: 'already graduated',
  }[stage] || '';
  return { title: `Class of ${graduationYear}`, sub, gradeStage: stage };
}

// ── Reading a user ───────────────────────────────────────────────────────────

/**
 * The grade this student is in today.
 *
 * Prefers the stored graduation year. Falls back to the legacy pair
 * (`gradeStage` + `gradeStageYear`) for accounts created before graduation
 * year existed, advancing it the same way the old effectiveGradeStage() did —
 * so no existing account gets a worse answer than it had, and the first time
 * such an account confirms its year on the August check-in it is migrated onto
 * the self-advancing attribute for good.
 */
export function gradeStageFor(user, now = new Date()) {
  // Delegated rather than reimplemented. effectiveGradeStage() already had to learn about
  // graduation years — it is what the Timeline, the Roadmap and the essay workspace call —
  // and two copies of this rule that could disagree is exactly the bug this whole module
  // exists to prevent.
  return effectiveGradeStage(user, now);
}

/** The graduation year we hold for a student, deriving one from a legacy
 *  stored grade when that is all we have, so band logic works uniformly. */
export function graduationYearFor_user(user, now = new Date()) {
  if (Number.isFinite(Number(user?.graduationYear))) return Number(user.graduationYear);
  const stage = gradeStageFor(user, now);
  return stage ? graduationYearFor(stage, now) : null;
}

/** This student's band right now. null when we don't know their year yet. */
export function bandFor(user, now = new Date()) {
  return bandOfGrade(gradeStageFor(user, now));
}

// ── The August 1 confirmation ────────────────────────────────────────────────

/**
 * True on the first login of a new academic year, once per year, for a student
 * who has a graduation year on file.
 *
 * The rollover itself needs no confirmation — it already happened, correctly,
 * the moment the date changed. This asks for one tap anyway because the one
 * case the arithmetic cannot see is the student whose year actually changed:
 * they were held back, skipped ahead, or graduated early. Once a year, at the
 * moment the app's whole emphasis shifts under them, is the right time and the
 * only time to ask.
 */
export function needsGradYearConfirmation(user, now = new Date()) {
  if (!Number.isFinite(Number(user?.graduationYear))) return false;
  const fall = academicFallYear(now);
  const confirmed = Number(user?.gradYearConfirmedFor);
  if (!Number.isFinite(confirmed)) return true;
  return confirmed < fall;
}

/** What to stamp on the user when they confirm (or correct) their year. */
export function confirmationStamp(graduationYear, now = new Date()) {
  return {
    graduationYear: Number(graduationYear),
    gradYearConfirmedFor: academicFallYear(now),
    // Kept in sync purely so legacy readers of user.gradeStage keep working;
    // nothing in this module ever reads it back when graduationYear is set.
    gradeStage: gradeStageFromGraduationYear(graduationYear, now),
    gradeStageYear: academicFallYear(now),
  };
}

// ── Emphasis, never access ───────────────────────────────────────────────────

/**
 * The ONLY two states anything tagged with a band can be in for a student.
 *
 * 'active'  — it belongs in this student's task list right now.
 * 'preview' — it is fully visible, fully browsable, fully clickable, and simply
 *             not in the task list. It wears a banner saying who it is usually
 *             for. It is NOT hidden, NOT locked, NOT disabled, NOT blurred.
 *
 * Anything untagged, and anything at all for a student whose year we don't
 * know yet, is 'active'. The default is always the whole app.
 */
export function bandStateFor(itemBands, studentBand) {
  const list = Array.isArray(itemBands) ? itemBands : (itemBands ? [itemBands] : []);
  if (!list.length || !studentBand) return 'active';
  return list.includes(studentBand) ? 'active' : 'preview';
}

export const isActiveForBand = (itemBands, studentBand) => bandStateFor(itemBands, studentBand) === 'active';

/**
 * The sentence on the preview banner. One writer, so the tone is the same on
 * every surface: it names who usually uses this and when, and then invites the
 * student in anyway. It never says "locked", "unavailable", "not yet", or any
 * other word that reads as a door being closed.
 */
export function previewBannerText(itemBands) {
  const list = (Array.isArray(itemBands) ? itemBands : [itemBands]).filter(Boolean);
  const known = BANDS.filter(b => list.includes(b.id));
  if (known.length === 1) return `${known[0].previewLine} — look around if you're curious.`;
  // More than one band — a whole section of the road rather than one screen. Stitching the
  // single-band sentences together with "or" produced the genuinely terrible "Most students
  // use this in 9th or 10th grade or Most students use this junior year or …", so a multi-band
  // banner names the years once instead of repeating the frame for each.
  if (known.length > 1) {
    const years = known.map(b => b.years);
    const joined = years.length === 2 ? years.join(' and ') : `${years.slice(0, -1).join(', ')} and ${years[years.length - 1]}`;
    return `Most students use these in ${joined} — look around if you're curious.`;
  }
  return "Most students use this later on — look around if you're curious.";
}

// ── The band tags the app's own surfaces carry ───────────────────────────────
//
// Lessons and timeline milestones already declare the grades they are timed
// for (`unit.gradeFocus`, catalog `grades`), so `bandsFromGrades()` tags those
// with no duplicate list. Portfolio destinations had no such declaration —
// this is it. Keyed by the same destination ids the router and featureUnlock
// use, so a tag can never drift from a screen that no longer exists
// (scripts/verifyGradeBand.mjs asserts every id here is a real destination).
//
// An id absent from this table is active for everybody, which is the correct
// default for anything that is genuinely year-agnostic (Home, Prep, quizzes,
// flashcards, the coach, Settings).
export const DESTINATION_BANDS = {
  // Explore-band work: the parts that reward wandering, and the two surfaces
  // whose whole point is finding out what any of this is.
  'prep/diagnostic':                 ['explore', 'build'],
  'portfolio/opportunities':         ['explore', 'build'],
  'portfolio/applying:combined':     ['explore', 'build'],

  // Build-band work: the application takes shape junior year.
  'portfolio/applying:colleges':     ['build', 'apply'],
  'portfolio/applying:recommenders': ['build', 'apply'],
  'portfolio/applying:essays':       ['build', 'apply'],
  'portfolio/applying:interview':    ['build', 'apply'],
  'portfolio/applying:calc':         ['build', 'apply'],
  'portfolio/applying:medex':        ['build', 'apply'],

  // Apply-band work: only meaningful once there is something to submit.
  'portfolio/applying':              ['build', 'apply'],
  'portfolio/applying:aid':          ['apply'],
};

/** The band state of a destination id for this student — the single call a
 *  nav row, a card, or a task-list builder makes. Always 'active'/'preview'. */
export function destinationBandState(id, studentBand) {
  return bandStateFor(DESTINATION_BANDS[id], studentBand);
}
