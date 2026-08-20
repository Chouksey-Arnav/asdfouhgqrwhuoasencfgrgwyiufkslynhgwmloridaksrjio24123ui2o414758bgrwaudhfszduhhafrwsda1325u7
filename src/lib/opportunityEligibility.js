// ─────────────────────────────────────────────────────────────────────────────
// Eligibility and deadlines for the structured programs in
// src/data/opportunityPrograms.js.
//
// Two failures this module exists to stop, both of which cost a student a year:
//
//   1. FINDING OUT LATE THAT YOU WERE NEVER ELIGIBLE. Age and citizenship are
//      hard gates on a lot of the good programs — most hospital volunteering
//      starts at 16, most real research programs want 16+ and rising junior or
//      senior standing, and a few (SIMR, NIH) additionally require US
//      citizenship or a green card. A student should learn that from a badge on
//      the card, before they read the description — never from a form on the
//      application page.
//
//   2. FINDING OUT LATE, FULL STOP. The good summer programs close in December
//      through February for the FOLLOWING summer. Students look in April, which
//      is eleven months late. So a saved opportunity becomes dated rows in the
//      milestone system, with alerts at 60, 30 and 7 days.
//
// Rules the whole module obeys:
//   - Missing data is 'unknown', never 'eligible'. We do not clear a student
//     for a program on facts we do not have.
//   - Ineligible-by-age is never a dead end: every verdict of that kind carries
//     what to do instead, at the age they actually are.
//   - An approximate date is never rendered as an exact one. `precision` rides
//     along with every date this module returns.
// ─────────────────────────────────────────────────────────────────────────────

import { PROGRAM_BY_ID } from '../data/opportunityPrograms.js';

const DAY = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/** Midnight local, so day arithmetic never drifts by a timezone hour. */
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * What we know about the student, from their account and their portfolio.
 * Every field is allowed to be null — that is the honest state for most
 * accounts, and the eligibility verdicts are written to survive it.
 */
export function studentEligibilityFacts({ user = null, grade = null } = {}) {
  const gradeNum = grade != null ? Number(grade) : null;
  const age = Number(user?.age) || null;
  return {
    age,
    grade: Number.isFinite(gradeNum) ? gradeNum : null,
    state: user?.state || null,
    // Citizenship is never asked for at signup and should not be: it is not
    // ours to collect. So programs that require it are reported as "requires
    // US citizenship or a green card" rather than as a verdict about them.
    citizenshipKnown: false,
  };
}

/** Verdict tones the UI maps to colors. */
export const VERDICTS = {
  eligible: { tone: 'good', label: 'You qualify' },
  likely: { tone: 'good', label: 'Likely eligible' },
  too_young: { tone: 'bad', label: 'Too young — for now' },
  wrong_grade: { tone: 'warn', label: 'Wrong year — for now' },
  citizenship: { tone: 'warn', label: 'Citizenship required' },
  unknown: { tone: 'neutral', label: 'Check eligibility' },
};

/**
 * Can this student apply, and if not, why not, and what instead?
 *
 * @returns {{ status, tone, badge, blockers[], notes[], alternative, waitUntil }}
 *   status      one of VERDICTS' keys
 *   blockers    hard reasons they cannot apply this cycle
 *   notes       requirements that are true but not disqualifying
 *   alternative what to do at their current age instead (never null for too_young)
 *   waitUntil   the age or grade at which the blocker clears, for the countdown
 */
export function evaluateEligibility(program, facts = {}) {
  if (!program) return { status: 'unknown', ...VERDICTS.unknown, blockers: [], notes: [], alternative: null, waitUntil: null };
  const blockers = [];
  const notes = [];
  let waitUntil = null;

  const { age, grade } = facts;

  if (program.minAge != null) {
    if (age == null) {
      notes.push(`Minimum age ${program.minAge}${program.minAge % 1 ? '½' : ''}. Add your age in Settings and this card will tell you straight away.`);
    } else if (age < program.minAge) {
      blockers.push(`You are ${age}; this needs ${program.minAge}${program.minAge % 1 ? '½' : ''}.`);
      waitUntil = { kind: 'age', value: program.minAge, years: Math.ceil(program.minAge - age) };
    }
  }
  if (program.maxAge != null && age != null && age > program.maxAge) {
    blockers.push(`Open to ${program.maxAge} and under.`);
  }

  if (program.minGrade != null) {
    if (grade == null) {
      notes.push(`Open to grade${program.maxGrade && program.maxGrade !== program.minGrade ? `s ${program.minGrade}–${program.maxGrade}` : ` ${program.minGrade}`}.`);
    } else if (grade < program.minGrade) {
      blockers.push(`Opens in grade ${program.minGrade}; you are in grade ${grade}.`);
      if (!waitUntil) waitUntil = { kind: 'grade', value: program.minGrade, years: program.minGrade - grade };
    }
  }
  if (program.maxGrade != null && grade != null && grade > program.maxGrade) {
    blockers.push(`Closes after grade ${program.maxGrade}.`);
  }

  if (program.citizenship) {
    notes.push(program.citizenship === 'us'
      ? 'Requires US citizenship.'
      : 'Requires US citizenship or permanent residency (a green card).');
  }

  // Status. Ordered so the most actionable thing wins the badge.
  let status;
  if (blockers.length) {
    const ageBlocked = blockers.some(b => /needs \d/.test(b)) || waitUntil?.kind === 'age';
    const gradeBlocked = waitUntil?.kind === 'grade';
    status = ageBlocked ? 'too_young' : gradeBlocked ? 'wrong_grade' : 'too_young';
  } else if (age == null && grade == null && (program.minAge != null || program.minGrade != null)) {
    // Not blocked, but only because we do not know their age or grade. That is
    // "check this yourself", never "you qualify".
    status = 'unknown';
  } else if (program.citizenship) {
    status = 'citizenship';
  } else if (program.minAge != null || program.minGrade != null) {
    status = 'eligible';
  } else {
    status = 'likely';
  }

  return {
    status,
    ...VERDICTS[status],
    blockers,
    notes,
    // Never dead-end a fourteen-year-old: if the program itself carries the
    // sentence, use it; otherwise fall back to the general answer, which is
    // always true and always actionable.
    alternative: blockers.length
      ? (program.altUnder || GENERIC_ALTERNATIVE)
      : null,
    waitUntil,
  };
}

export const GENERIC_ALTERNATIVE =
  'What works at any age: ask your local hospital for their teen-volunteer age minimum (some start at 14), get CPR/BLS certified, enter your school or regional science fair, and email three professors at the nearest university asking to help in a lab. None of those have an age gate you cannot pass, and all of them are what this program will want to see when you can apply.';

/** True when the student is under a program's age gate. */
export const isAgeBlocked = (verdict) => verdict?.status === 'too_young';

// ── Deadlines ────────────────────────────────────────────────────────────────

/**
 * The next occurrence of a program's recurring deadline.
 *
 * A program's deadline is stored as a month (+ optional day) that comes round
 * every cycle. If this year's has passed, the next one is next year's — which
 * is exactly the fact a student browsing in April needs, and exactly the fact
 * they never get told.
 *
 * @returns {{ date, iso, daysOut, precision, note, passedThisCycle, label, urgency } | null}
 */
export function nextDeadline(program, today = new Date()) {
  const d = program?.deadline;
  if (!d || d.precision === 'rolling') {
    return d ? { date: null, iso: null, daysOut: null, precision: 'rolling', note: d.note, passedThisCycle: false, label: 'No deadline — apply any time', urgency: 'none' } : null;
  }
  if (d.month == null) {
    return { date: null, iso: null, daysOut: null, precision: d.precision, note: d.note, passedThisCycle: false, label: 'Deadline set locally — check the official page', urgency: 'unknown' };
  }

  const t = startOfDay(today);
  // Day 15 is a deliberate stand-in for "some time that month" when only the
  // month is known: it never presents as an exact date (precision rides along
  // and the UI renders it as a month), and it puts the alerts in the right
  // fortnight rather than a month early or a month late.
  const day = d.day || 15;
  let date = new Date(t.getFullYear(), d.month - 1, day);
  let passedThisCycle = false;
  if (date < t) {
    passedThisCycle = true;
    date = new Date(t.getFullYear() + 1, d.month - 1, day);
  }
  const daysOut = Math.round((date - t) / DAY);
  const exact = d.precision === 'exact';
  const label = exact
    ? `${MONTHS[d.month - 1]} ${day}`
    : d.precision === 'window' ? `${MONTHS[d.month - 1]} (window)`
    : `${MONTHS[d.month - 1]} (approx.)`;

  return {
    date, iso: toISO(date), daysOut, precision: d.precision, note: d.note,
    passedThisCycle, label,
    urgency: daysOut <= 7 ? 'critical' : daysOut <= 30 ? 'urgent' : daysOut <= 60 ? 'soon' : 'later',
  };
}

/** The three alert offsets the milestone rows are built from. */
export const ALERT_OFFSETS = [60, 30, 7];

const ALERT_COPY = {
  60: (name) => `${name} — 60 days out: start the application`,
  30: (name) => `${name} — 30 days out: ask your recommender`,
  7: (name) => `${name} — 7 days out: submit, do not wait for the last night`,
};

/**
 * The rows to write into the `deadlines` table when a student saves a program:
 * the deadline itself plus whichever of the 60/30/7-day alerts are still in the
 * future. An alert dated in the past is not a reminder, it is clutter.
 *
 * `kind: 'opportunity'` is a real deadline kind (see PortfolioMilestones'
 * DEADLINE_KINDS and DEADLINE_KIND_MAP in timeline.js) so these land in the
 * Experience lane of the timeline rather than as untyped "other" rows.
 */
export function milestoneRowsFor(program, dueIso, today = new Date()) {
  if (!program || !dueIso) return [];
  const due = new Date(`${dueIso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return [];
  const t = startOfDay(today);
  const approx = program.deadline?.precision && program.deadline.precision !== 'exact';
  const rows = [{
    title: `${program.name} — application due${approx ? ' (approx. — confirm on the official site)' : ''}`,
    due_date: dueIso,
    kind: 'opportunity',
  }];
  for (const offset of ALERT_OFFSETS) {
    const when = new Date(due.getTime() - offset * DAY);
    if (when <= t) continue;
    rows.push({ title: ALERT_COPY[offset](program.name), due_date: toISO(when), kind: 'opportunity' });
  }
  return rows;
}

// ── Cost ─────────────────────────────────────────────────────────────────────

/** True when a program costs the student nothing, or pays them. */
export function isFreeOrFunded(program) {
  const m = program?.cost?.model;
  return m === 'free' || m === 'free_plus_stipend' || program?.stipend === true;
}

/** The short cost line for a card. Never guesses a number that isn't published. */
export function costLabel(program) {
  const c = program?.cost;
  if (!c) return 'Cost not listed';
  if (c.model === 'free_plus_stipend') return 'Free — and paid';
  if (c.model === 'free') return 'Free';
  if (c.usd != null) return `≈ $${c.usd.toLocaleString()}`;
  if (c.model === 'entry_fee') return 'Entry fee';
  if (c.model === 'course_fee') return 'Course fee';
  if (c.model === 'tuition') return 'Tuition';
  return 'Varies';
}

/** How stale our check is, in plain words, so the student can weigh it. */
export function verifiedLabel(program, today = new Date()) {
  if (!program?.verified) return null;
  const then = new Date(`${program.verified}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.round((startOfDay(today) - then) / DAY);
  if (days <= 0) return 'Checked today';
  if (days < 45) return `Checked ${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `Checked ${months} month${months === 1 ? '' : 's'} ago`;
}

/** Structured facts for a catalog entry, when it has any. */
export const factsFor = (id) => PROGRAM_BY_ID[id] || null;
