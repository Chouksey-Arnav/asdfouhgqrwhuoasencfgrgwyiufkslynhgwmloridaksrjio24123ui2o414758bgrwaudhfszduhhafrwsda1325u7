// ─────────────────────────────────────────────────────────────────────────────
// The live chart — what the student has told us so far, as data.
//
// ── The problem this solves ──────────────────────────────────────────────────
// The old flow answered "am I nearly done?" (a segmented bar, a "3 more to go")
// but never answered the question underneath it: "is any of this going
// anywhere?". A student typed twenty answers into a void and was shown a
// finished plan at the end, and nothing in between suggested the two were
// connected. That gap is most of what made the flow feel generic — the screens
// could have been any app's screens, because nothing on them was ever *theirs*.
//
// So the rail now holds a chart that fills in as they answer. Pick "I want to
// help people" and WHY is recorded, in their words, one second later. By the
// time they reach the plan, the left half of the screen is a document with
// their name on it that they watched get written. That is the whole idea: the
// personalization is not asserted at the end, it is visible the entire way.
//
// Everything here is a pure function of `answers`. Rows the student hasn't
// reached yet come back with `value: null` and render as pending — the chart is
// the shape of the whole interview from screen one, so it reads as a form being
// completed rather than a list that grows unpredictably.
// ─────────────────────────────────────────────────────────────────────────────
import {
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS,
  SCIENCE_OPTIONS, EXPERIENCE_OPTIONS, STUDY_HOURS_OPTIONS, GOAL_OPTIONS,
  OBSTACLE_OPTIONS, shortLabel,
} from './options';
import { COMMIT_LEVELS } from './personalize';
import { GRADE_STAGES } from '../../data/constants';

/** The count of real selections in a multi-select, ignoring the "none" escape. */
const realCount = (list = [], nones = ['none', 'none_yet']) =>
  list.filter(v => !nones.includes(v)).length;

/**
 * Every row of the chart, in interview order, with the value if it's known yet.
 *
 * @param {object} answers the live answer object from Onboarding.jsx
 * @returns {{key,chapter,label,value,icon,pending}[]}
 */
export function chartRows(answers = {}) {
  const a = answers;
  const sciences = realCount(a.sciences);
  const experience = realCount(a.experience);
  const pace = COMMIT_LEVELS[a.speedLevel] || null;
  const grade = a.gradeIdx != null ? GRADE_STAGES[a.gradeIdx] : null;

  const rows = [
    { key: 'why', chapter: 'why', label: 'Why', icon: 'heart-hand', value: shortLabel(WHY_MEDICINE_OPTIONS, a.whyMedicine) },
    { key: 'role', chapter: 'why', label: 'Becoming', icon: 'stethoscope', value: shortLabel(DREAM_ROLE_OPTIONS, a.dreamRole) },
    { key: 'certainty', chapter: 'why', label: 'Certainty', icon: 'flame', value: shortLabel(CERTAINTY_OPTIONS, a.certainty) },

    { key: 'year', chapter: 'you', label: 'Year', icon: 'pin', value: grade ? grade.label : null },
    { key: 'gpa', chapter: 'you', label: 'Grades', icon: 'trend-up', value: shortLabel(GPA_OPTIONS, a.gpa) },
    {
      key: 'sciences', chapter: 'you', label: 'Sciences', icon: 'dna',
      value: (a.sciences || []).length === 0 ? null : sciences === 0 ? 'None yet' : `${sciences} course${sciences === 1 ? '' : 's'}`,
      meter: (a.sciences || []).length === 0 ? null : { value: sciences, of: SCIENCE_OPTIONS.length - 1 },
    },
    {
      key: 'experience', chapter: 'you', label: 'Hands-on', icon: 'hospital',
      value: (a.experience || []).length === 0 ? null : experience === 0 ? 'Starting fresh' : `${experience} area${experience === 1 ? '' : 's'}`,
      meter: (a.experience || []).length === 0 ? null : { value: experience, of: EXPERIENCE_OPTIONS.length - 1 },
    },

    { key: 'hours', chapter: 'rhythm', label: 'Weekly', icon: 'clock', value: shortLabel(STUDY_HOURS_OPTIONS, a.studyHours) },

    { key: 'goal', chapter: 'aim', label: 'Focus', icon: 'target', value: shortLabel(GOAL_OPTIONS, a.goal) },
    { key: 'pace', chapter: 'aim', label: 'Pace', icon: 'bolt', value: pace && a.goal ? `${pace.minutes} min/day` : null },

    {
      key: 'obstacles', chapter: 'plan', label: 'Watching', icon: 'shield-check',
      value: (a.obstacles || []).length === 0 ? null
        : (a.obstacles || []).length === 1 ? shortLabel(OBSTACLE_OPTIONS, a.obstacles[0])
          : `${a.obstacles.length} things`,
    },
  ];

  return rows.map(r => ({ ...r, pending: r.value == null }));
}

/** How much of the chart is filled, 0..1 — drives the rail's completion readout. */
export function chartProgress(answers) {
  const rows = chartRows(answers);
  const done = rows.filter(r => !r.pending).length;
  return { done, total: rows.length, fraction: rows.length ? done / rows.length : 0 };
}

/**
 * The EKG trace's amplitude, 0..1, from the student's declared daily pace.
 *
 * The rail's heartbeat is not decoration once this is wired up: a student who
 * picks 20 minutes a day sees a calm trace and a student who picks 90 sees a
 * strong one, so the one control in the flow that is purely about effort has a
 * visible consequence on screen the moment they move it.
 */
export function traceEnergy(answers = {}) {
  const idx = answers.speedLevel;
  if (idx == null) return 0.55;
  const span = Math.max(1, COMMIT_LEVELS.length - 1);
  return 0.45 + (Math.min(span, Math.max(0, idx)) / span) * 0.55;
}

/**
 * The short line under the rail's chart. Says what just happened, in words,
 * rather than leaving the student to infer it from a row appearing.
 */
export function chartStatus(answers, { isQuestion, questionsLeft }) {
  const { done, total } = chartProgress(answers);
  if (done === 0) return 'Nothing recorded yet — the first answer starts your chart.';
  if (done >= total) return 'Your chart is complete. Everything here goes into the plan.';
  if (!isQuestion) return `${done} of ${total} recorded — nothing to answer on this screen.`;
  if (questionsLeft <= 0) return `${done} of ${total} recorded — the last answer finishes it.`;
  return `${done} of ${total} recorded, and it all goes into the plan.`;
}
