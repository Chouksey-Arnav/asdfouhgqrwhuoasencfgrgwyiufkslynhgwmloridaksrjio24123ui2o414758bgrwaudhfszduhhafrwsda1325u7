// ─────────────────────────────────────────────────────────────────────────────
// The Timeline engine — what actually belongs on this student's calendar.
//
// The Portfolio Timeline used to be a merge of four tables: deadlines the
// student typed in, test scores they logged, clinical hours they logged, and
// recommender due dates. That is a *record of what they already did*, not a
// timeline. A freshman who had entered nothing saw an empty screen; a senior
// six weeks from an ED deadline saw whatever they happened to have remembered
// to type. The one thing a timeline exists to do — tell you what is coming and
// when, before you knew to ask — it never did.
//
// This module is that missing half. It generates the dates a student in THEIR
// situation actually has to care about, from a hand-written milestone catalog
// gated on everything the app already knows: class year, AP/IB, test track and
// test timing, college list (including whether any school on it has an ED
// option or is a UC), essays started, recommenders asked, clinical hours
// logged, health experience from onboarding, certainty about medicine, and the
// pathway they're on. Then it merges those with the student's own real dates
// and classifies every event as done / soon / overdue / upcoming.
//
// Three rules the catalog is built around, because the failure modes are not
// symmetric:
//
//   1. GRADE GATES EVERYTHING. A freshman must never see "compare financial aid
//      offers" or "commit by May 1" — those are four years away and the only
//      thing they teach is that this list isn't about them. Every milestone
//      declares the grades it is FOR, and a small number of deliberate
//      look-aheads (a junior seeing "Common App opens Aug 1") are the only
//      cross-year leakage.
//   2. A GENERATED DATE IS NEVER A PROMISE. Milestones the student didn't enter
//      carry confidence:'typical' and say so in the UI. FAFSA has opened Oct 1
//      in recent years, and AP exams usually run over the first two weeks of
//      May. "Usually" is the honest word and it stays in the product. Only dates the student
//      (or their college list) actually supplied are 'exact'.
//   3. A MILESTONE THEY'VE ALREADY HANDLED STOPS NAGGING. Every catalog entry
//      can declare done(ctx) against real rows, so "ask two teachers for
//      letters" reads as ✓ done once two recommenders exist rather than
//      hectoring a student who is ahead of schedule.
//
// Pure functions and plain data only — no React, no network, no theme imports —
// so scripts/verifyTimeline.mjs can import and assert on the whole thing in
// plain Node. Colors are returned as theme KEY names; the component maps them.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86400000;

// ── Dates ────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in local time. Mirrors dateUtils.localDateStr, duplicated here to
 *  keep this module importable from a plain Node script with no bundler. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse a YYYY-MM-DD key as local midnight (never UTC — see dateUtils.js). */
export function parseDay(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Whole days from `from` to `to`, both YYYY-MM-DD keys. Negative = in the past. */
export function daysBetween(from, to) {
  return Math.round((parseDay(to) - parseDay(from)) / DAY);
}

export function shiftDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/**
 * The date of the Nth given weekday of a month — how a real admissions
 * calendar is actually shaped ("the first Saturday in October"), which is far
 * closer to the truth than pinning a fixed day number.
 * weekday: 0=Sun..6=Sat. n is 1-based; n=-1 means the last one in the month.
 */
export function nthWeekday(year, month1, weekday, n) {
  if (n < 0) {
    const last = new Date(year, month1, 0); // day 0 of next month = last day of this one
    const back = (last.getDay() - weekday + 7) % 7;
    last.setDate(last.getDate() - back);
    return dayKey(last);
  }
  const first = new Date(year, month1 - 1, 1);
  const forward = (weekday - first.getDay() + 7) % 7;
  first.setDate(1 + forward + (n - 1) * 7);
  return dayKey(first);
}

/**
 * The FALL year of the academic year a date falls in: Aug 2026–Jul 2027 is all
 * "2026". Every class-year calculation in this file hangs off this, because
 * "what grade are you in" only means something relative to a school year.
 */
export function academicFallYear(now = new Date()) {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

// ── Class year ───────────────────────────────────────────────────────────────

export const GRADE_KEYS = ['freshman', 'sophomore', 'junior', 'senior', 'gap'];
export const GRADE_LABELS = {
  freshman: 'Freshman', sophomore: 'Sophomore', junior: 'Junior', senior: 'Senior', gap: 'Heading to undergrad',
};

export function gradeIdxOf(gradeStage) {
  const i = GRADE_KEYS.indexOf(gradeStage);
  return i === -1 ? null : i;
}

/**
 * The grade a student is in NOW, not the one they typed at signup.
 *
 * gradeStage is captured once during onboarding and then never touched again,
 * so a sophomore who signed up in October 2025 is still stored as "sophomore"
 * in October 2027 — and a timeline built off a two-year-stale grade is worse
 * than no timeline, because it confidently shows the wrong year's deadlines.
 * We advance it by the number of academic years that have elapsed since the
 * grade was recorded, using `gradeStageYear` (stamped at onboarding) or, for
 * accounts that predate that field, `onboardingCompletedAt`.
 *
 * A student who ages past senior year lands on 'gap', which the catalog treats
 * as "applying/just applied" rather than inventing a fifth year of high school.
 */
export function effectiveGradeStage(user, now = new Date()) {
  const stage = user?.gradeStage;
  if (!stage || gradeIdxOf(stage) === null) return null;
  const recordedYear = Number.isFinite(user?.gradeStageYear)
    ? user.gradeStageYear
    : (user?.onboardingCompletedAt ? academicFallYear(new Date(user.onboardingCompletedAt)) : null);
  if (recordedYear == null) return stage;
  const elapsed = academicFallYear(now) - recordedYear;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return stage;
  const idx = Math.min(gradeIdxOf(stage) + elapsed, GRADE_KEYS.length - 1);
  return GRADE_KEYS[idx];
}

/**
 * Fall year of each high-school year for this student, so a milestone can say
 * "senior year, October 1" and get a real date out.
 *
 * 'gap' (graduated / applying now) is anchored so that SENIOR year is the
 * current academic year: someone applying in a gap year is living the senior
 * application calendar right now, just without the high-school half of it.
 */
export function classFallYears(gradeStage, now = new Date()) {
  const fall = academicFallYear(now);
  const idx = gradeIdxOf(gradeStage);
  const seniorFall = idx == null ? fall : (idx >= 4 ? fall : fall + (3 - idx));
  return {
    freshman: seniorFall - 3,
    sophomore: seniorFall - 2,
    junior: seniorFall - 1,
    senior: seniorFall,
    postgrad: seniorFall + 1,
    gradYear: seniorFall + 1, // seniors graduate in the spring of the following calendar year
  };
}

/**
 * Resolve a catalog milestone's (yearSlot, MM-DD) into a real date.
 * Months Aug–Dec belong to the fall calendar year; Jan–Jul to the next one —
 * the same split academicFallYear() uses, applied in reverse.
 */
export function resolveDate(yearSlot, monthDay, years) {
  const fall = years[yearSlot];
  if (fall == null) return null;
  const month = Number(String(monthDay).slice(0, 2));
  return `${month >= 8 ? fall : fall + 1}-${monthDay}`;
}

// ── Categories ───────────────────────────────────────────────────────────────
// colorKey names a key on src/lib/theme.js's palette; this module stays free of
// theme imports so it can run under plain Node.
export const TIMELINE_KINDS = [
  { id: 'application', label: 'Applications', colorKey: 'violet', blurb: 'Submitting to colleges — the dates that cannot slip.' },
  { id: 'aid',         label: 'Money & Aid',  colorKey: 'green',   blurb: 'FAFSA, CSS Profile, and scholarship windows.' },
  { id: 'essays',      label: 'Essays',       colorKey: 'fuchsia', blurb: 'Drafting time, not just due dates.' },
  { id: 'recommenders',label: 'Recommenders', colorKey: 'pink',    blurb: 'Asking early is the whole game here.' },
  { id: 'experience',  label: 'Experience',   colorKey: 'teal',    blurb: 'Clinical hours, shadowing, programs, certifications.' },
  { id: 'academics',   label: 'Academics',    colorKey: 'amber',   blurb: 'Grades, course selection, and exam weeks.' },
  { id: 'decision',    label: 'Decisions',    colorKey: 'gold',    blurb: 'When answers come back, and when you have to answer.' },
  { id: 'planning',    label: 'Planning',     colorKey: 'cyan',    blurb: 'College list, visits, and interview prep.' },
  { id: 'logged',      label: 'Logged',       colorKey: 'indigo',  blurb: 'What you have already done and recorded.' },
];
export const KIND_BY_ID = Object.fromEntries(TIMELINE_KINDS.map(k => [k.id, k]));

// Priority. 3 = a date with consequences if missed (application/aid deadlines,
// exam days). 2 = strongly recommended by a specific date. 1 = a good habit
// pinned to a sensible week. Drives ordering within a day and what the Home
// card and the AI summary are allowed to promote.
const P = { critical: 3, important: 2, helpful: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// THE MILESTONE CATALOG
//
// Each entry: { id, title, detail, kind, weight, grades, year, monthDay,
//               leadDays?, action?, why?, when?, done?, doneLabel? }
//   leadDays — how long the work behind this date actually takes, in elapsed
//              days. This is what the feed sorts by, because a deadline in
//              ninety days needing a two-month run-up is more urgent than one
//              in thirty that takes an afternoon. Omitted means "use the
//              per-category default" (see LEAD_DAYS_BY_KIND in
//              src/lib/milestoneUrgency.js).
//   grades   — the class years this milestone is FOR. This is the freshman gate.
//   year     — which class year's calendar it sits on (usually the same, except
//              for deliberate look-aheads like a junior seeing senior-fall dates).
//   when(ctx)— extra applicability from the student's real profile/data.
//   done(ctx)— already handled, from real rows. Renders ✓ instead of nagging.
//   why(ctx) — one sentence naming why THIS student is seeing THIS date.
//   action   — deep link: { tab, view, label }.
// ─────────────────────────────────────────────────────────────────────────────

const ALL_YEARS = ['freshman', 'sophomore', 'junior', 'senior', 'gap'];

export const MILESTONES = [
  // ── FRESHMAN ───────────────────────────────────────────────────────────────
  {
    id: 'fr_diagnostic', title: 'Find your pathway', kind: 'planning', weight: P.important,
    grades: ['freshman'], year: 'freshman', monthDay: '09-20',
    detail: 'Take the 2-minute pathway diagnostic so the rest of the app — units, quizzes, and this timeline — is pointed at the health career you are actually curious about.',
    action: { tab: 'prep', view: 'diagnostic', label: 'Take the diagnostic' },
    why: () => 'Freshman year is for finding the direction, and everything else here gets sharper once you have one.',
    done: (c) => c.diagnosticTaken, doneLabel: 'Diagnostic done',
  },
  {
    id: 'fr_first_activity', title: 'Join one health-adjacent activity', kind: 'experience', weight: P.important,
    grades: ['freshman'], year: 'freshman', monthDay: '10-10',
    detail: 'A club, a sport, a volunteer shift — one thing you can stay with for four years. Depth over a long stretch is what an activities list is actually made of.',
    action: { tab: 'portfolio', view: 'resume', label: 'Log an activity' },
    why: () => 'Nothing on a college application rewards early starts more than an activity you stuck with since ninth grade.',
    done: (c) => c.activities >= 1, doneLabel: (c) => `${c.activities} logged`,
  },
  {
    id: 'fr_q1_grades', title: 'First-quarter grade check', kind: 'academics', weight: P.important,
    grades: ['freshman'], year: 'freshman', monthDay: '11-05',
    detail: 'Freshman grades count toward the GPA on your transcript. Not the end of the world if quarter one was rough — but this is the cheapest moment all year to fix it.',
    action: { tab: 'portfolio', view: 'resume', label: 'Log your GPA' },
    why: () => 'This is the first grading period that will ever appear on a college transcript.',
  },
  {
    id: 'fr_fall_finals', title: 'Fall semester finals', kind: 'academics', weight: P.important,
    grades: ['freshman', 'sophomore', 'junior'], year: 'current', monthDay: '12-12',
    detail: 'Semester grades are the ones that land on the transcript. Two weeks of real review beats a weekend of panic.',
    action: { tab: 'prep', view: 'flashcards', label: 'Review flashcards' },
    why: () => 'Semester grades — not quarter grades — are what colleges see.',
  },
  {
    id: 'fr_log_experience', title: 'Log any shadowing or volunteering', kind: 'experience', weight: P.helpful,
    grades: ['freshman'], year: 'freshman', monthDay: '01-15',
    detail: 'Even two hours at a food bank or a morning with a family friend who is a nurse counts — and hours you never wrote down are hours you cannot put on an application.',
    action: { tab: 'portfolio', view: 'clinical', label: 'Log hours' },
    why: () => 'The hours are easy to lose track of now and impossible to reconstruct in three years.',
    done: (c) => c.clinicalHours > 0, doneLabel: (c) => `${c.clinicalHours}h logged`,
  },
  {
    id: 'fr_course_selection', title: 'Pick next year\'s science courses', kind: 'academics', weight: P.critical,
    grades: ['freshman'], year: 'freshman', monthDay: '02-10',
    detail: 'Course selection happens once a year and quietly decides what you are allowed to take as a junior and senior. Get on the biology → chemistry → physics/anatomy track now.',
    action: { tab: 'prep', view: 'pathways', label: 'See your pathway' },
    why: (c) => c.sciencesNoneYet
      ? 'You told us you have not taken a core science course yet — this is the form that fixes that.'
      : 'Course selection is the one academic decision that is genuinely hard to undo later.',
  },
  {
    id: 'fr_summer_apps', title: 'Summer program & volunteer applications close', kind: 'experience', weight: P.important,
    grades: ['freshman'], year: 'freshman', monthDay: '03-01',
    detail: 'Hospital volunteer programs, summer camps, and enrichment programs mostly take applications in late winter for the following summer. The good ones close before spring break.',
    action: { tab: 'portfolio', view: 'overview', label: 'Browse opportunities' },
    why: () => 'An empty summer is the single most common gap on a pre-health application, and it is decided in February.',
  },
  {
    id: 'fr_spring_finals', title: 'Spring finals — first full year on the transcript', kind: 'academics', weight: P.important,
    grades: ['freshman'], year: 'freshman', monthDay: '06-01',
    detail: 'Close the year cleanly. Whatever GPA you finish freshman year with is the floor everything else is averaged against.',
    why: () => 'Your first full-year GPA sets the baseline for the next three.',
  },
  {
    id: 'fr_summer_cpr', title: 'Summer: get CPR / first-aid certified', kind: 'experience', weight: P.helpful,
    grades: ['freshman', 'sophomore'], year: 'current', monthDay: '06-25',
    detail: 'A weekend course, usually under $100 through the Red Cross or a local hospital — and it is the prerequisite that unlocks most hospital volunteer roles.',
    action: { tab: 'portfolio', view: 'skills', label: 'Log a certification' },
    when: (c) => !c.hasCpr,
    why: () => 'Most hospital volunteer programs will not take you without it, so it is worth having before you need it.',
    done: (c) => c.hasCprLogged, doneLabel: 'Certified',
  },

  // ── SOPHOMORE ──────────────────────────────────────────────────────────────
  {
    id: 'so_leadership', title: 'Take on a leadership role', kind: 'experience', weight: P.important,
    grades: ['sophomore'], year: 'sophomore', monthDay: '09-15',
    detail: 'Officer, team captain, project lead, founder of something small. Sophomore year is when there is still room at the top of a club before the juniors take it.',
    action: { tab: 'portfolio', view: 'resume', label: 'Log the role' },
    why: () => 'Leadership reads as real when it lasts two years — which means it has to start now.',
    done: (c) => c.leadershipRoles > 0, doneLabel: 'Leading something',
  },
  {
    id: 'so_course_selection', title: 'Pick next year\'s courses — junior year is the one they read hardest', kind: 'academics', weight: P.critical,
    grades: ['sophomore'], year: 'sophomore', monthDay: '02-10',
    detail: 'Junior year rigor is the single most-scrutinized line on a transcript. Choose the hardest science and math load you can carry without wrecking the grade.',
    why: () => 'Junior-year course rigor is what admissions officers look at first, and it is decided this spring.',
  },
  {
    id: 'so_summer_apps', title: 'Summer program applications close', kind: 'experience', weight: P.important,
    grades: ['sophomore'], year: 'sophomore', monthDay: '02-25',
    detail: 'Hospital volunteer corps, summer research and pre-health programs, and paid internships mostly close between February and March for the coming summer.',
    action: { tab: 'portfolio', view: 'overview', label: 'Browse opportunities' },
    why: () => 'The summer after sophomore year is the first one where a real program will actually take you.',
  },
  {
    id: 'so_clinical_start', title: 'Start banking clinical hours', kind: 'experience', weight: P.important,
    grades: ['sophomore'], year: 'sophomore', monthDay: '04-01',
    detail: 'Volunteering, shadowing, caregiving, a hospital front desk — anything that puts you near patient care. Log it the same week it happens.',
    action: { tab: 'portfolio', view: 'clinical', label: 'Log clinical hours' },
    why: (c) => c.clinicalHours > 0
      ? `You have ${c.clinicalHours} hours logged — the goal now is a steady rhythm, not a burst.`
      : 'You have nothing logged yet, and hours accumulate on a calendar, not on demand.',
    done: (c) => c.clinicalHours >= 20, doneLabel: (c) => `${c.clinicalHours}h logged`,
  },
  {
    id: 'so_first_shadow', title: 'Summer: first shadowing experience', kind: 'experience', weight: P.important,
    grades: ['sophomore'], year: 'sophomore', monthDay: '06-20',
    detail: 'One day with one clinician. Ask a family doctor, a parent\'s colleague, a neighbor — most people say yes to a high schooler who asks politely and specifically.',
    action: { tab: 'portfolio', view: 'clinical', label: 'Log shadowing' },
    when: (c) => !c.hasShadowed,
    why: (c) => c.certainty === 'exploring'
      ? 'You said you are still figuring out whether medicine is for you — one day of watching the real job answers that faster than a year of reading.'
      : 'You have not shadowed anyone yet, and it is the experience every later essay tends to lean on.',
    done: (c) => c.clinicalHours > 0, doneLabel: 'Logged',
  },

  // ── JUNIOR ─────────────────────────────────────────────────────────────────
  {
    id: 'jr_year_open', title: 'Junior year begins — the transcript year', kind: 'academics', weight: P.helpful,
    grades: ['junior'], year: 'junior', monthDay: '08-25',
    detail: 'This is the last full year of grades most colleges will see before they decide. Everything from here is about consistency, not heroics.',
    why: () => 'Junior year grades carry more weight in admissions than any other single year.',
  },
  {
    id: 'jr_college_fair', title: 'Go to a college fair or info session', kind: 'planning', weight: P.helpful,
    grades: ['junior'], year: 'junior', monthDay: '10-20',
    detail: 'Most fall in September–October. Talking to three admissions reps for ten minutes each teaches you more about fit than a week of rankings.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Open your college list' },
    why: () => 'This is the cheapest way to turn a list of names into a list you actually have opinions about.',
  },
  {
    id: 'jr_build_list', title: 'Build a first college list — 8 to 12 schools', kind: 'planning', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '11-15',
    detail: 'Rough is fine. You want reaches, targets, and at least two safeties you would genuinely be happy at — plus, for pre-health, a note on whether each has a strong advising program or a BS/MD track.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Build the list' },
    why: (c) => c.colleges > 0
      ? `You have ${c.colleges} school${c.colleges === 1 ? '' : 's'} on your list — the target is 8 to 12 with real safeties.`
      : 'You have no colleges on your list yet, and everything downstream (essays, deadlines, aid) hangs off that list.',
    done: (c) => c.colleges >= 8, doneLabel: (c) => `${c.colleges} schools`,
  },
  {
    id: 'jr_list_balance', title: 'Check your list actually balances', kind: 'planning', weight: P.important,
    grades: ['junior'], year: 'junior', monthDay: '04-15',
    detail: 'Sort every school into reach / target / safety and be honest about it. A list of nine reaches is not a strategy, and a list with no safety is a bet on a coin flip.',
    action: { tab: 'portfolio', view: 'calc', label: 'Run the admissions calculator' },
    when: (c) => c.colleges > 0,
    why: (c) => c.safeties === 0
      ? 'Nothing on your list is categorized as a safety right now.'
      : `Your list is currently ${c.reaches} reach / ${c.targets} target / ${c.safeties} safety.`,
    done: (c) => c.reaches > 0 && c.targets > 0 && c.safeties >= 2, doneLabel: 'Balanced',
  },
  {
    id: 'jr_ask_recs', title: 'Ask two teachers for letters', kind: 'recommenders', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '02-15',
    detail: 'Ask junior-year teachers in person, in the spring, while you are still in their class and they remember your work. Teachers cap how many letters they will write, and the students who ask in September of senior year get the leftovers.',
    action: { tab: 'portfolio', view: 'recommenders', label: 'Track recommenders' },
    why: (c) => c.recommenders > 0
      ? `You have ${c.recommenders} recommender${c.recommenders === 1 ? '' : 's'} tracked — two strong ones from junior-year teachers is the standard ask.`
      : 'Asking now, in person, while you are in their class, is worth more than any wording you could use in September.',
    done: (c) => c.recommenders >= 2, doneLabel: (c) => `${c.recommenders} tracked`,
  },
  {
    id: 'jr_senior_courses', title: 'Choose senior-year courses — do not coast', kind: 'academics', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '02-20',
    detail: 'Colleges see your senior schedule on the application and can rescind over a collapsed one. Keep a real science and a real math.',
    why: () => 'Your senior schedule is on the application itself, chosen a year before anyone reads it.',
  },
  {
    id: 'jr_summer_research', title: 'Summer research & pre-health program deadlines', kind: 'experience', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '02-28',
    detail: 'University summer research programs, hospital internships, and selective pre-health institutes mostly close January–March for the summer after junior year — the last summer that will appear on your application.',
    action: { tab: 'portfolio', view: 'overview', label: 'Browse opportunities' },
    why: (c) => c.research > 0
      ? 'You already have research logged — a second summer of it is what turns an activity into a through-line.'
      : 'The summer after junior year is the last one colleges see, and its applications are due in winter.',
  },
  {
    id: 'jr_spring_visits', title: 'Spring break campus visits', kind: 'planning', weight: P.helpful,
    grades: ['junior'], year: 'junior', monthDay: '03-25',
    detail: 'Visit two or three, including one you are lukewarm about. Demonstrated interest matters at some schools, and the Why Us essay writes itself after you have stood on the quad.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Open your college list' },
    when: (c) => c.colleges > 0,
    why: () => 'This is the last spring break before applications, and campuses are still in session.',
  },
  {
    id: 'jr_confirm_recs', title: 'Confirm recommenders before summer', kind: 'recommenders', weight: P.important,
    grades: ['junior'], year: 'junior', monthDay: '05-10',
    detail: 'Give each one a one-page brag sheet: your activities, what you are applying for, and two specific things from their class you are proud of. Then say thank you before the last bell.',
    action: { tab: 'portfolio', view: 'recommenders', label: 'Update recommenders' },
    when: (c) => c.recommenders > 0,
    why: () => 'A teacher writing in August from memory writes a worse letter than one writing from notes you handed them in May.',
    done: (c) => c.recommendersConfirmed >= 2, doneLabel: 'Confirmed',
  },
  {
    id: 'jr_spring_finals', title: 'Spring finals — the last full-year GPA colleges see', kind: 'academics', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '06-01',
    detail: 'This is the last complete year on the transcript when your applications go out. Finish it properly.',
    why: () => 'Senior fall grades arrive too late for early deadlines; junior year is the last full picture.',
  },
  {
    id: 'jr_essay_draft', title: 'Summer: draft your personal statement', kind: 'essays', weight: P.critical,
    grades: ['junior'], year: 'junior', monthDay: '06-25',
    detail: 'The Common App prompts are published and rarely change. Writing the first draft in June, while nothing else is due, is the single biggest favor you can do for October you.',
    action: { tab: 'portfolio', view: 'essays', label: 'Open the essay workspace' },
    why: (c) => c.essays > 0 ? `You have ${c.essays} draft${c.essays === 1 ? '' : 's'} started — summer is when they get good.` : 'Every senior who is calm in October wrote their first draft in June.',
    done: (c) => c.essays >= 1, doneLabel: (c) => `${c.essays} draft${c.essays === 1 ? '' : 's'}`,
  },
  {
    id: 'jr_finalize_list', title: 'Finalize the list and check every deadline', kind: 'planning', weight: P.important,
    grades: ['junior'], year: 'junior', monthDay: '07-20',
    detail: 'Lock the list, then put every school\'s EA/ED/RD and aid dates into the app from each college\'s own admissions page. Published dates beat remembered ones.',
    action: { tab: 'portfolio', view: 'milestones', label: 'Add the real date' },
    why: () => 'The list stops being editable the moment essays start, so it should be right before August.',
    done: (c) => c.collegesWithDates >= 3, doneLabel: 'Dates entered',
  },
  // Deliberate junior look-ahead into senior fall — the only cross-year leakage,
  // because a junior who does not know the Aug 1 date plans their whole summer wrong.
  {
    id: 'jr_lookahead_commonapp', title: 'Common App opens for your class', kind: 'application', weight: P.important,
    grades: ['junior'], year: 'senior', monthDay: '08-01',
    detail: 'Accounts opened before August 1 roll over. This is when supplements for your specific schools become visible — the real start of application season.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Open your college list' },
    why: () => 'It is next year, but it is why your summer plan matters: the work you did not do in July starts being due in September.',
  },

  // ── SENIOR (and gap-year applicants) ───────────────────────────────────────
  {
    id: 'sr_commonapp_open', title: 'Common App opens', kind: 'application', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '08-01',
    detail: 'Create the account, add your schools, and read every supplemental prompt in one sitting so you know the real size of the job before September.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Open your college list' },
    why: () => 'Application season starts here, and the students who read all the supplements in August never panic in October.',
    done: (c) => c.collegesStarted > 0, doneLabel: 'Started',
  },
  {
    id: 'sr_confirm_recs', title: 'Confirm recommenders — now, not October', kind: 'recommenders', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '09-05',
    detail: 'Two teachers plus your counselor. Give each a brag sheet and your deadline list, and send the Common App invitations the same week so the system starts nagging them for you.',
    action: { tab: 'portfolio', view: 'recommenders', label: 'Track recommenders' },
    why: (c) => c.recommendersConfirmed >= 2
      ? `${c.recommendersConfirmed} confirmed — the remaining job is the deadline list and the thank-you.`
      : `You have ${c.recommenders} recommender${c.recommenders === 1 ? '' : 's'} tracked and ${c.recommendersConfirmed} confirmed; teachers fill up in September.`,
    done: (c) => c.recommendersConfirmed >= 2, doneLabel: 'Confirmed',
  },
  {
    id: 'sr_transcripts', title: 'Request transcripts from your counselor', kind: 'application', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '09-12',
    detail: 'Counseling offices batch these and get swamped in late October. Requesting in September costs you one form and buys six weeks of margin.',
    why: () => 'The one piece of your application you cannot write, submit, or speed up yourself.',
  },
  {
    id: 'sr_supplements', title: 'First drafts of every supplemental essay', kind: 'essays', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '09-20',
    detail: 'Supplements — especially "Why us" and "Why this major" — are where pre-health applications are won or lost. Draft them badly and fast; you cannot edit a blank page.',
    action: { tab: 'portfolio', view: 'essays', label: 'Open the essay workspace' },
    why: (c) => c.colleges > 0
      ? `${c.colleges} schools on your list means roughly ${Math.max(c.colleges, c.colleges * 2)} supplemental prompts, and you have ${c.essays} draft${c.essays === 1 ? '' : 's'} going.`
      : 'Supplements outnumber personal statements about three to one, and they are due at the same time.',
    done: (c) => c.essays >= 3, doneLabel: (c) => `${c.essays} drafts`,
  },
  {
    id: 'sr_fafsa', title: 'FAFSA opens', kind: 'aid', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '10-01',
    detail: 'Some aid is first-come, first-served, and several states award grants until the money runs out. File in October even if you think you will not qualify — many merit awards require a FAFSA on file.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    when: (c) => !c.hasFafsaDeadlineRow,
    why: () => 'FAFSA has opened October 1 in recent years, and the earliest filers see the best state and institutional aid.',
  },
  {
    id: 'sr_ea_essays_done', title: 'Early-round essays finished — two weeks of buffer', kind: 'essays', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '10-18',
    detail: 'Being done two weeks early is what lets a teacher read it, lets you sleep on it, and means a portal outage on October 31 is an inconvenience rather than a catastrophe.',
    action: { tab: 'portfolio', view: 'essays', label: 'Open the essay workspace' },
    why: () => 'Early deadlines are around November 1, and every year the portals crawl on the last night.',
    done: (c) => c.essaysFinal >= 2, doneLabel: (c) => `${c.essaysFinal} finished`,
  },
  {
    id: 'sr_css', title: 'CSS Profile for schools that require it', kind: 'aid', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '10-20',
    detail: 'Mostly private colleges. It asks for far more detail than FAFSA and many schools want it by the early deadline, not the regular one — check each school on your list.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    why: (c) => c.colleges > 0 ? 'Check which schools on your list require it — the ones that do usually want it with the early application.' : 'Most private colleges require it in addition to the FAFSA.',
  },
  {
    id: 'sr_ea_ed', title: 'Early Action / Early Decision deadlines', kind: 'application', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '11-01',
    detail: 'The most common early date. ED is binding — you may only apply ED to one school and you are committing to attend if admitted, before you see the aid offer.',
    action: { tab: 'portfolio', view: 'milestones', label: 'Add the real date' },
    when: (c) => !c.hasCollegeEarlyDates,
    why: () => 'None of your schools have an early deadline entered yet, so this is the typical date until you confirm each one.',
  },
  {
    id: 'sr_uc', title: 'University of California application deadline', kind: 'application', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '11-30',
    detail: 'One application for all nine campuses, on its own system with its own Personal Insight Questions — and no extensions. It closes at the end of November regardless of what the Common App is doing.',
    action: { tab: 'portfolio', view: 'milestones', label: 'Add the real date' },
    when: (c) => c.hasUC,
    why: () => 'You have a University of California campus on your list, and the UC system runs on its own calendar.',
  },
  {
    id: 'sr_thank_recs', title: 'Thank your recommenders', kind: 'recommenders', weight: P.helpful,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '11-10',
    detail: 'A handwritten note after the early round. You will likely need them again for regular decision, scholarships, and summer programs.',
    action: { tab: 'portfolio', view: 'recommenders', label: 'Open recommenders' },
    when: (c) => c.recommenders > 0,
    why: () => 'They wrote for you on their own time, and you are not finished asking them for things.',
  },
  {
    id: 'sr_scholarships', title: 'Scholarship season — the big national ones close', kind: 'aid', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '12-01',
    detail: 'Most large national scholarships close between November and February. Three applications a week through the winter is a realistic pace and a genuinely good hourly rate.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    why: (c) => c.scholarships > 0
      ? `You are tracking ${c.scholarships} scholarship${c.scholarships === 1 ? '' : 's'} — this is the window where the rest of them close.`
      : 'You are not tracking any scholarships yet, and the largest ones close first.',
    done: (c) => c.scholarships >= 5, doneLabel: (c) => `${c.scholarships} tracked`,
  },
  {
    id: 'sr_ea_decisions', title: 'Early decisions start arriving', kind: 'decision', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '12-15',
    detail: 'Mid-December for most early rounds. A deferral is not a rejection — it moves you into the regular pool, where a strong mid-year report and a short letter of continued interest still matter.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Update statuses' },
    when: (c) => !c.hasCollegeEarlyDates || c.collegesSubmitted > 0,
    why: () => 'Whatever comes back, the regular-decision work does not pause for it.',
  },
  {
    id: 'sr_fall_finals', title: 'Fall finals — these go on the mid-year report', kind: 'academics', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '12-15',
    detail: 'Senior fall grades are sent to every school you applied to. This is the semester "senioritis" costs people admissions offers.',
    why: () => 'Colleges receive these grades after you have applied and can withdraw an offer over them.',
  },
  {
    id: 'sr_rd', title: 'Regular Decision deadlines', kind: 'application', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '01-01',
    detail: 'January 1 and January 15 are the two most common. Submit on December 30 — support lines close for the holidays and portals do go down.',
    action: { tab: 'portfolio', view: 'milestones', label: 'Add the real date' },
    when: (c) => !c.hasCollegeRdDates,
    why: () => 'No regular-decision dates are entered from your college list yet, so this is the typical date until you confirm each school.',
  },
  {
    id: 'sr_midyear', title: 'Mid-year report sent by your counselor', kind: 'application', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '01-20',
    detail: 'Your counselor sends first-semester senior grades to every school. Make sure they have your final program list, including anything you added in December.',
    why: () => 'It is automatic only if your counselor has the right list.',
  },
  {
    id: 'sr_aid_priority', title: 'Priority financial aid deadlines', kind: 'aid', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '02-01',
    detail: 'Many colleges and most states have a priority aid date separate from the admissions deadline. Miss it and you are still admitted — just considered for less money.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    why: () => 'This is the date that most often costs students real money without costing them an acceptance.',
  },
  {
    id: 'sr_local_scholarships', title: 'Local scholarship season', kind: 'aid', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '02-20',
    detail: 'Rotary clubs, hospital auxiliaries, credit unions, your parents\' employers. Smaller awards, dramatically less competition — often a dozen applicants for $1,000.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    why: () => 'Local awards have the best odds of anything in the whole aid process, and almost nobody applies.',
  },
  {
    id: 'sr_interviews', title: 'Interview season', kind: 'planning', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '01-15',
    detail: 'Alumni interviews are usually offered between December and February on short notice. Do two mock runs before the first real one.',
    action: { tab: 'portfolio', view: 'interview', label: 'Practice interviewing' },
    why: (c) => c.interviewSessions > 0 ? `You have ${c.interviewSessions} practice session${c.interviewSessions === 1 ? '' : 's'} logged — keep them warm through February.` : 'Invitations come with about a week of notice, which is not enough time to start practicing.',
    done: (c) => c.interviewSessions >= 2, doneLabel: 'Practiced',
  },
  {
    id: 'sr_rd_decisions', title: 'Regular decisions released', kind: 'decision', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '03-25',
    detail: 'Most land in the last two weeks of March. Log every result so the aid comparison in April is against a real list.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Update statuses' },
    why: () => 'The month everything you have been doing since junior year comes back at once.',
  },
  {
    id: 'sr_compare_aid', title: 'Compare aid offers side by side', kind: 'aid', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '04-05',
    detail: 'Compare NET cost, not sticker price, and separate grants (yours) from loans (debt). If one school is a clear favorite but a worse offer, you can appeal — politely, in writing, with the competing letter attached.',
    action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
    why: () => 'Aid appeals work more often than students expect, and the window is about three weeks wide.',
  },
  {
    id: 'sr_admitted_days', title: 'Admitted-student days', kind: 'decision', weight: P.helpful,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '04-15',
    detail: 'Go if you can, especially to your top two. It is the only time you will see the school as an admitted student rather than a prospect.',
    why: () => 'It is the last real information you will get before committing.',
  },
  {
    id: 'sr_decision_day', title: 'National College Decision Day — deposit due', kind: 'decision', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '05-01',
    detail: 'Deposit at one school, decline the rest, and if you are on a waitlist you actually want, say so in writing the same week.',
    action: { tab: 'portfolio', view: 'colleges', label: 'Update statuses' },
    why: () => 'The one date in this whole process with no extensions and no appeals.',
  },
  {
    id: 'sr_final_transcript', title: 'Request your final transcript', kind: 'application', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '05-20',
    detail: 'Your college needs a final transcript with your graduation date on it. Enrollment gets held up over this every single summer.',
    why: () => 'A missing final transcript can block course registration in July.',
  },
  {
    id: 'sr_ap_scores', title: 'Send AP/IB scores to your college', kind: 'academics', weight: P.helpful,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '06-20',
    detail: 'Credit policies vary a lot — check what actually places you out of a requirement before paying to send anything.',
    when: (c) => c.apIb,
    why: () => 'You are an AP/IB student, and score-sending is a separate step from getting the score.',
  },
  {
    id: 'sr_orientation', title: 'Housing, orientation, and placement tests', kind: 'planning', weight: P.important,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '07-01',
    detail: 'Housing is usually first-come and orientation slots for pre-health advising fill fastest. Watch your college email daily from June.',
    why: () => 'Everything after May 1 arrives by email to an address you are not used to checking.',
  },
  {
    id: 'sr_summer_hours', title: 'Keep your clinical hours going', kind: 'experience', weight: P.helpful,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '07-15',
    detail: 'Medical schools count hours from college onward, but the habit — and the relationships with the people who supervise you — carry straight over.',
    action: { tab: 'portfolio', view: 'clinical', label: 'Log hours' },
    when: (c) => c.clinicalHours > 0,
    why: () => 'You have already built the routine; the summer before college is the easiest time to keep it.',
  },

  // ── AP / IB, every year ────────────────────────────────────────────────────
  // ── HEALTH-PATHWAY DATES, every year ───────────────────────────────────────
  //
  // The block that makes this a health-track calendar rather than a college
  // calendar. Everything above is what any applicant needs; everything here is
  // what a health-pathway student misses ENTIRELY, and misses in a specific and
  // predictable way — by looking for it in the season when the thing happens
  // rather than the season when you apply for it.
  //
  // The pattern repeats: summer research closes in December, HOSA competitive
  // eligibility is decided by a membership form in the autumn, the ISEF fair a
  // student qualifies through takes entries months before it runs, and a
  // combined-degree program's own supplement closes before the university's
  // general deadline it is attached to. A fifteen-year-old does not know what
  // they do not know, and none of this is discoverable by looking at a calendar
  // in the month it matters.
  //
  // `leadDays` on these entries is what stops the feed from burying them: a
  // February program deadline with a sixty-day run-up outranks a thirty-day
  // form, which is exactly the judgment a student cannot make for themselves
  // about programs they have never applied to. See src/lib/milestoneUrgency.js.
  {
    id: 'hp_summer_window', title: 'Summer program applications are open NOW — for next summer', kind: 'experience', weight: P.critical,
    grades: ALL_YEARS, year: 'current', monthDay: '12-01', leadDays: 45,
    detail: 'This is the single most common way a health-track summer disappears. Selective summer research, hospital internships and pre-health institutes take applications from roughly December through February FOR THE FOLLOWING SUMMER. Students look in April, which is two months after the good ones closed.',
    action: { tab: 'portfolio', view: 'opportunities', label: 'Browse programs' },
    why: () => 'Nothing about a December deadline for a June program is intuitive, and it is why most students spend the summer that matters doing nothing they can write about.',
  },
  {
    id: 'hp_summer_window_close', title: 'Most summer program deadlines close this month', kind: 'experience', weight: P.critical,
    grades: ALL_YEARS, year: 'current', monthDay: '02-01', leadDays: 45,
    detail: 'The back half of the December–February window. If you have not sent an application by the end of February, assume the competitive programs for this summer are gone and plan a local alternative — a hospital volunteer role, a lab email campaign, a certification course — rather than discovering it in May.',
    action: { tab: 'portfolio', view: 'opportunities', label: 'See what is still open' },
    why: () => 'Being told in February that the window is closing is useful. Being told in May is a post-mortem.',
  },
  {
    id: 'hp_cert_fall_enrollment', title: 'Certification course enrollment — autumn term', kind: 'experience', weight: P.important,
    grades: ALL_YEARS, year: 'current', monthDay: '08-20', leadDays: 21,
    detail: 'CPR/BLS and first aid run year-round, but the ones with real weight — CNA, EMT-Basic, pharmacy tech, medical assisting — run on a school or community-college term and close registration before the term starts. A course you enrol in this month is a credential you hold by winter.',
    action: { tab: 'portfolio', view: 'skills', label: 'Log a certification' },
    why: (c) => c.skills > 0
      ? 'You already hold at least one certification — the term-based ones (CNA, EMT) are the next step up, and they enrol now, not when you decide you want them.'
      : 'Most hospital volunteer roles need a current CPR/BLS card before they will take you, and the term-based credentials behind it enrol on a calendar nobody publishes to students.',
  },
  {
    id: 'hp_cert_spring_enrollment', title: 'Certification course enrollment — spring term', kind: 'experience', weight: P.important,
    grades: ['sophomore', 'junior', 'senior', 'gap'], year: 'current', monthDay: '12-05', leadDays: 21,
    detail: 'Spring-term dual-enrollment CNA and EMT-Basic courses register in December, before the winter break. State minimum ages vary — often 16 to start the course — so check yours before you plan around it.',
    action: { tab: 'portfolio', view: 'skills', label: 'Open skills & certs' },
    why: () => 'The registration closes weeks before the class starts, and over the break there is nobody to ask.',
  },
  {
    id: 'hp_hosa_join', title: 'HOSA membership — join before the competitive-event window', kind: 'experience', weight: P.important,
    grades: ALL_YEARS, year: 'current', monthDay: '09-25', leadDays: 14,
    detail: 'Chapter membership and national/state dues are handled in the autumn, and paid membership by the chapter\'s deadline is what makes you eligible to compete at all. The membership is not the achievement — eligibility for the competitive events is, and it is decided by a form in September.',
    action: { tab: 'portfolio', view: 'opportunities', label: 'See HOSA' },
    why: () => 'Students join HOSA in January, discover the competitive events, and find out that eligibility closed in the autumn.',
  },
  {
    id: 'hp_hosa_regionals', title: 'HOSA regional / area qualifying events', kind: 'experience', weight: P.important,
    grades: ALL_YEARS, year: 'current', monthDay: '01-25', leadDays: 60,
    detail: 'Regional and area competitions run through the winter and are the qualifying round for your State Leadership Conference. Event registration and any required written test usually close weeks before the event itself — confirm both dates with your chapter adviser.',
    why: () => 'This is the round that decides whether the rest of the HOSA year exists for you, and its registration closes before most students have thought about it.',
  },
  {
    id: 'hp_hosa_state', title: 'HOSA State Leadership Conference', kind: 'experience', weight: P.important,
    grades: ALL_YEARS, year: 'current', monthDay: '03-20', leadDays: 45,
    detail: 'State conferences run through March and April and are where qualification for the International Leadership Conference is decided. Dates vary by state — this is the typical window, not your state\'s date.',
    why: () => 'A state placement is a specific, verifiable line on an application, and it is the only route to the international conference.',
  },
  {
    id: 'hp_hosa_ilc', title: 'HOSA International Leadership Conference (ILC)', kind: 'experience', weight: P.helpful,
    grades: ALL_YEARS, year: 'current', monthDay: '06-20', leadDays: 60,
    detail: 'Late June, and you qualify for it at your state conference in the spring. Travel and registration are booked weeks in advance and are not cheap — if you are on the qualifying track, ask about chapter funding in March, not in June.',
    why: () => 'The cost, not the qualification, is what most often stops a qualified student from going, and it is solvable months earlier.',
  },
  {
    id: 'hp_sts', title: 'Regeneron Science Talent Search entry', kind: 'experience', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '11-05', leadDays: 300,
    detail: 'Early-to-mid November of senior year, for the following spring. It is an individual original research project with a written report, recommendations and transcripts — which means the entry is the last week of a project that had to start a year or more earlier. Confirm the exact date on the Society for Science site.',
    action: { tab: 'portfolio', view: 'opportunities', label: 'See the competition' },
    when: (c) => c.research > 0 || c.pathway === 'biomedResearch',
    why: (c) => c.research > 0
      ? 'You have research logged, which is the only prerequisite that cannot be produced in a hurry — this is the entry it exists for.'
      : 'The oldest pre-college science competition in the country, and being named a scholar is a line an admissions reader recognises.',
  },
  {
    id: 'hp_isef_find_fair', title: 'Find your ISEF-affiliated regional fair and note its entry deadline', kind: 'experience', weight: P.important,
    grades: ['freshman', 'sophomore', 'junior', 'senior'], year: 'current', monthDay: '11-15', leadDays: 60,
    detail: 'You cannot enter ISEF directly. You qualify through an affiliated regional or state fair — and that fair, not ISEF, is the deadline that catches students out: the fairs themselves run January through mid-April, but each one sets its own entry deadline months earlier, often before the winter break.',
    action: { tab: 'portfolio', view: 'opportunities', label: 'See ISEF' },
    why: () => 'Every year students discover ISEF in March and find that the only route into it closed in December.',
  },
  {
    id: 'hp_isef_season_end', title: 'Regional science fair season ends — ISEF qualifying closes', kind: 'experience', weight: P.important,
    grades: ['freshman', 'sophomore', 'junior', 'senior'], year: 'current', monthDay: '04-15', leadDays: 90,
    detail: 'Affiliated regional and state fairs conclude by roughly mid-April, which is when qualification for that year\'s ISEF is settled. If you did not enter a fair this cycle, the project you have keeps its value — enter it next cycle rather than starting again.',
    why: () => 'This is the wall at the end of the qualifying route, and after it the next opportunity is a full year away.',
  },
  {
    id: 'hp_combined_supplements', title: 'Combined-degree supplements — these close before everything else', kind: 'application', weight: P.critical,
    grades: ['senior', 'gap'], year: 'senior', monthDay: '10-15', leadDays: 150,
    detail: 'A BS/MD, direct-admit BSN or 0-6 PharmD program is a SECOND application with its own essays, its own recommendation requirements and — this is the part that costs people the year — its own deadline, frequently earlier than the university\'s general one and often earlier than November 1.',
    action: { tab: 'portfolio', view: 'essays', label: 'See the prompts' },
    when: (c) => c.combinedPrograms > 0,
    why: (c) => `You are tracking ${c.combinedPrograms} combined-degree program${c.combinedPrograms === 1 ? '' : 's'}. Their supplements are visible in your essay workspace — read every one now rather than in the last week of October.`,
  },
  {
    id: 'hp_combined_lookahead', title: 'Combined-degree deadlines land earlier than you think', kind: 'application', weight: P.important,
    grades: ['junior'], year: 'senior', monthDay: '10-15', leadDays: 150,
    detail: 'If a combined BS/MD or direct-admit program is on your list, its round next autumn is very likely to be earlier than the November date everything else runs on — which means its essays get written in the summer after junior year, not in the autumn of senior year.',
    action: { tab: 'portfolio', view: 'combined', label: 'See the programs' },
    when: (c) => c.combinedPrograms > 0,
    why: () => 'It is a year away, and it is the reason your summer plan matters: the work you skip in July starts being due in September.',
  },
  {
    id: 'hp_combined_requirements', title: 'Combined-degree requirements start counting now', kind: 'planning', weight: P.important,
    grades: ['freshman', 'sophomore'], year: 'current', monthDay: '09-30', leadDays: 30,
    detail: 'Programs you apply to from high school ask for documented service and clinical hours, a science record and often a single-sitting test score — over years, not months. A senior discovering this has already lost most of what it asks for; you have not.',
    action: { tab: 'portfolio', view: 'combined', label: 'See what they ask for' },
    why: () => 'This is the only medical-school decision made while you are still in high school, and the only one whose requirements begin in ninth grade.',
  },
  {
    id: 'ap_registration', title: 'AP exam registration & fees due', kind: 'academics', weight: P.critical,
    grades: ALL_YEARS, year: 'current', monthDay: '11-05',
    detail: 'Most schools set their AP order in the fall, with real late fees after. Confirm with your AP coordinator which exams you are actually registered for.',
    when: (c) => c.apIb,
    why: () => 'You are on an AP/IB track, and the exams are ordered six months before they are taken.',
  },
  {
    id: 'ap_exams', title: 'AP / IB exam window opens', kind: 'academics', weight: P.critical,
    grades: ALL_YEARS, year: 'current', monthDay: '05-05',
    detail: 'AP exams run over the first two weeks of May; IB exams from late April into May. Confirm your exact subject dates with your school — they are fixed nationally and cannot be moved.',
    action: { tab: 'prep', view: 'flashcards', label: 'Review flashcards' },
    when: (c) => c.apIb && !c.hasApDeadlineRow,
    why: () => 'You are on an AP/IB track, and this window collides with finals and (for seniors) decision season.',
  },
];

const arr = (v) => (Array.isArray(v) ? v : []);
const UC_PATTERN = /university of california|^uc\s|uc\s?(berkeley|davis|irvine|los angeles|merced|riverside|san diego|santa barbara|santa cruz)|ucla|ucsd|ucsb|ucla/i;

export function buildTimelineContext({ user = null, snapshot = {}, now = new Date(), counts = null } = {}) {
  const gradeStage = effectiveGradeStage(user, now);
  const years = classFallYears(gradeStage, now);
  const colleges = arr(snapshot.colleges);
  const clinical = arr(snapshot.clinicalHours);
  const recommenders = arr(snapshot.recommenders);
  // The "why this pathway" working document is stored as an essays row (so it inherits version
  // history and the data export) but it is not an application essay and must never be counted as
  // one — a student who opens their four-year notebook has not started a supplement, and a
  // milestone that reads "1 draft started" off the back of it is telling them something false.
  // The kind string is duplicated from src/lib/healthEssays.js rather than imported, because that
  // module imports this one and this file has to stay importable from a plain Node script.
  const essays = arr(snapshot.essays).filter(e => e?.essay_kind !== 'why_pathway');
  const skills = arr(snapshot.skills);
  const deadlines = arr(snapshot.deadlines);
  const experience = arr(user?.healthExperience);

  return {
    now, today: dayKey(now), gradeStage, years,
    gradeLabel: GRADE_LABELS[gradeStage] || null,
    gradeIdx: gradeIdxOf(gradeStage),

    // Onboarding-derived
    apIb: !!user?.apIb,
    certainty: user?.certainty || null,
    dreamRole: user?.dreamRole || null,
    pathway: user?.specialty || null,
    sciencesNoneYet: arr(user?.sciences).includes('none_yet') || arr(user?.sciences).length === 0,
    hasShadowed: experience.includes('shadowing') || clinical.length > 0,
    hasCpr: experience.includes('cpr'),
    hasCprLogged: experience.includes('cpr') || skills.some(s => /cpr|first aid|bls/i.test(s?.name || '')),
    diagnosticTaken: !!user?.diagnosticResult,
    hasPlan: !!user?.masterPlan,

    // Portfolio counts
    colleges: colleges.length,
    reaches: colleges.filter(c => c.category === 'reach').length,
    targets: colleges.filter(c => c.category === 'target').length,
    safeties: colleges.filter(c => c.category === 'safety').length,
    collegesStarted: colleges.filter(c => c.status && c.status !== 'researching').length,
    collegesSubmitted: colleges.filter(c => ['submitted', 'decision_received', 'enrolled'].includes(c.status)).length,
    collegesWithDates: colleges.filter(c => c.ea_ed_deadline || c.rd_deadline).length,
    hasCollegeEarlyDates: colleges.some(c => c.ea_ed_deadline),
    hasCollegeRdDates: colleges.some(c => c.rd_deadline),
    hasUC: colleges.some(c => UC_PATTERN.test(c.name || '')),
    essays: essays.length,
    essaysFinal: essays.filter(e => e.status === 'final').length,
    activities: arr(snapshot.activities).length,
    leadershipRoles: arr(snapshot.activities).filter(a => a.leadership_role).length,
    clinicalHours: Math.round(clinical.reduce((s, h) => s + (Number(h.hours) || 0), 0)),
    recommenders: recommenders.length,
    recommendersConfirmed: recommenders.filter(r => ['Confirmed', 'Submitted'].includes(r.status)).length,
    scholarships: arr(snapshot.scholarships).length,
    research: arr(snapshot.research).length,
    skills: skills.length,
    interviewSessions: arr(snapshot.interviewSessions).length,

    // Deadline rows the student already keeps, so generated milestones can step
    // aside rather than duplicate something they are already tracking.
    hasFafsaDeadlineRow: deadlines.some(d => d.kind === 'fafsa'),
    hasApDeadlineRow: deadlines.some(d => d.kind === 'ap_exam' || d.kind === 'ib_exam'),

    // Combined-degree and direct-admit programs the student has tracked. Derived here from the
    // `source_ref` the Combined Degrees panel stamps on the milestone rows it writes, rather than
    // by importing the program catalog — this module has to stay importable from a plain Node
    // script (scripts/verifyTimeline.mjs), and callers that hold the college rows can pass a
    // better count through `counts` (PortfolioMilestones does exactly that).
    combinedPrograms: new Set(
      deadlines.map(d => String(d.source_ref || '')).filter(r => r.startsWith('combined:'))
        .map(r => r.split(':')[1]).filter(Boolean)
    ).size,


    // Escape hatch for callers that hold real counts but not the rows behind them.
    // App.jsx keeps running totals (colleges, essays, clinical hours, recommenders…) for the
    // coach prompt without ever holding a full Portfolio snapshot, and building the coach's
    // timeline from a snapshot it does not have would tell Medabrain a student with nine
    // schools on their list has none. Anything passed here overrides the derived value; keys
    // that are not passed still derive from `snapshot` as normal.
    ...(counts || {}),
  };
}

const call = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

// ── Event construction ───────────────────────────────────────────────────────

function classify(date, today, { done = false, weight = P.helpful } = {}) {
  const days = daysBetween(today, date);
  if (done) return { status: 'done', days };
  if (days < 0) return { status: weight >= P.important ? 'missed' : 'past', days };
  if (days === 0) return { status: 'today', days };
  if (days <= 14) return { status: 'soon', days };
  return { status: 'upcoming', days };
}

function catalogEvents(ctx) {
  const out = [];
  MILESTONES.forEach(m => {
    if (!m.grades.includes(ctx.gradeStage)) return;
    if (m.when && !m.when(ctx)) return;
    const yearSlot = m.year === 'current' ? (ctx.gradeStage === 'gap' ? 'senior' : ctx.gradeStage) : m.year;
    const date = resolveDate(yearSlot, m.monthDay, ctx.years);
    if (!date) return;
    const done = m.done ? !!m.done(ctx) : false;
    out.push({
      id: m.id, date, title: m.title, detail: m.detail, kind: m.kind, weight: m.weight,
      source: 'catalog', confidence: 'typical',
      leadDays: m.leadDays || null,
      action: m.action || null,
      why: call(m.why, ctx) || null,
      doneLabel: done ? (call(m.doneLabel, ctx) || 'Done') : null,
      ...classify(date, ctx.today, { done, weight: m.weight }),
    });
  });
  return out;
}

const DEADLINE_KIND_MAP = {
  common_app_open: 'application', early_action: 'application', early_decision: 'application',
  regular_decision: 'application', fafsa: 'aid', css_profile: 'aid', scholarship: 'aid',
  ap_exam: 'academics', ib_exam: 'academics', custom: 'application',
  // Saved opportunities and their 60/30/7-day alerts (see
  // milestoneRowsFor in src/lib/opportunityEligibility.js). They belong in the
  // Experience lane: a summer research deadline is not an application to a
  // college, and filing it as one would put it in the lane a senior reads for
  // college dates.
  opportunity: 'experience',
};

/**
 * The student's Roadmap items, as timeline events.
 *
 * ── Why the Roadmap feeds the Milestones timeline at all ────────────────────
 * Because otherwise the app has two calendars, and a student with two calendars
 * has none. The Roadmap tab is where a year is decided; Milestones is where a
 * student looks to ask "what is next" — and a Roadmap item that never reaches
 * that feed is a commitment the rest of the product cannot see. Home's next-up
 * card, the coach's timeline summary, the ICS export and the parent digest all
 * read this list.
 *
 * ── The rules, which are the same honesty rules the Roadmap tab enforces ────
 *  - Only OPEN items. A done or skipped item is a decision already made.
 *  - The student's own pinned date wins over the catalog's, always.
 *  - `confidence` maps straight onto the tab's own rule: a student-pinned or
 *    structurally fixed date is 'exact', everything else is 'typical' — which is
 *    what makes the feed, the AI summary and the calendar export all say
 *    "confirm this" about exactly the same set of dates the Roadmap tab does.
 *  - `action` deep-links back into the Roadmap rather than duplicating the
 *    item's controls here. There is one place to work on a roadmap item, and it
 *    is the tab that owns it.
 *
 * Roadmap items are plain data (see src/lib/roadmap/model.js for the shape), so
 * this reads them directly rather than importing that module — which would be a
 * cycle, since model.js imports this file's date helpers.
 */
function roadmapEvents(ctx, roadmap) {
  const items = arr(roadmap?.items);
  if (!items.length) return [];
  const today = ctx.today;
  return items.flatMap(item => {
    if (item.status === 'done' || item.status === 'skipped') return [];
    const date = item.studentDate || item.due || item.on || item.anchor;
    if (!date) return [];
    const exact = !!item.studentDate || item.confidence === 'fixed' || item.addedBy === 'student';
    const weight = item.priority === 'critical' ? P.critical : item.priority === 'important' ? P.important : P.helpful;
    return [{
      id: `roadmap_${item.id}`,
      date,
      title: item.title,
      detail: item.howThisHelps || item.why || '',
      // Roadmap tracks and timeline kinds are two vocabularies for the same
      // idea; the ones that do not line up fall back to 'planning', which is
      // exactly what an un-categorized forward-looking commitment is.
      kind: ROADMAP_TRACK_KIND[item.track] || 'planning',
      weight,
      source: 'roadmap',
      confidence: exact ? 'exact' : 'typical',
      action: { tab: 'roadmap', view: 'list', label: 'Open in your roadmap' },
      why: item.startBy && item.startBy !== date
        ? `On your roadmap. The work on this needs to start around ${item.startBy}, not on the deadline.`
        : 'On your twelve-month roadmap.',
      ...classify(date, today, { weight }),
    }];
  });
}

/** Roadmap track → timeline kind. Both vocabularies live in this repo; this is the only join. */
const ROADMAP_TRACK_KIND = {
  application: 'application', competition: 'experience', program: 'experience',
  scholarship: 'aid', testing: 'academics', aid: 'aid', experience: 'experience',
  academics: 'academics', essays: 'essays', relationships: 'recommenders',
};

function profileEvents(ctx, snapshot) {
  const out = [];
  const today = ctx.today;

  arr(snapshot.deadlines).forEach(d => {
    if (!d.due_date) return;
    // `completed_at` is what makes this feed two-way: finishing a date is a different act from
    // deleting it, and a completed milestone should stop counting down without losing the record
    // that it happened. See supabase/migrations/0019_health_pathway_portfolio.sql.
    const finished = !!d.completed_at;
    out.push({
      id: `deadline_${d.id || d.title}_${d.due_date}`, date: d.due_date, title: d.title,
      kind: DEADLINE_KIND_MAP[d.kind] || 'application', weight: P.critical,
      detail: 'A date you added yourself. It counts down here and on your Home dashboard.',
      source: 'profile', confidence: 'exact',
      leadDays: Number.isFinite(Number(d.lead_days)) ? Number(d.lead_days) : null,
      sourceRef: d.source_ref || null,
      // ownerRef marks the one class of event that is a real, editable row rather than a
      // derived one — the Milestones tab renders these with a delete control so the feed is
      // where you manage your own dates, not just where you read them. Everything else on
      // the timeline is computed from data owned by another panel and must be edited there.
      ownerRef: { resource: 'deadlines', id: d.id, kind: d.kind || 'custom', sourceRef: d.source_ref || null, leadDays: d.lead_days ?? null },
      action: null,
      why: 'You added this one yourself.',
      ...classify(d.due_date, today, { done: finished, weight: P.critical }),
      ...(finished ? { doneLabel: 'Done' } : {}),
    });
  });

  arr(snapshot.colleges).forEach(c => {
    const add = (date, suffix, kind, why) => {
      if (!date) return;
      out.push({
        id: `college_${c.id || c.name}_${suffix}`, date, title: `${c.name} — ${suffix}`,
        kind, weight: P.critical,
        detail: `From ${c.name}'s entry on your college list${c.category ? ` (${c.category})` : ''}.`,
        source: 'profile', confidence: 'exact',
        action: { tab: 'portfolio', view: 'colleges', label: 'Open college list' },
        why,
        ...classify(date, today, { weight: P.critical }),
      });
    };
    add(c.ea_ed_deadline, 'Early deadline', 'application', 'You entered this date on your college list.');
    add(c.rd_deadline, 'Regular decision', 'application', 'You entered this date on your college list.');
    add(c.financial_aid_deadline, 'Financial aid deadline', 'aid', 'You entered this date on your college list.');
  });

  arr(snapshot.scholarships).forEach(s => {
    if (!s.deadline || ['awarded', 'denied'].includes(s.status)) return;
    out.push({
      id: `scholarship_${s.id || s.name}`, date: s.deadline, title: `${s.name} — scholarship deadline`,
      kind: 'aid', weight: P.critical,
      detail: `${s.amount ? `$${Number(s.amount).toLocaleString()} · ` : ''}Status: ${s.status || 'researching'}.`,
      source: 'profile', confidence: 'exact',
      action: { tab: 'portfolio', view: 'aid', label: 'Open Financial Aid' },
      why: 'A scholarship you are tracking.',
      ...classify(s.deadline, today, { weight: P.critical }),
    });
  });

  arr(snapshot.recommenders).forEach(r => {
    if (!r.due_date) return;
    out.push({
      id: `rec_${r.id || r.name}`, date: r.due_date, title: `${r.name}'s letter due`,
      kind: 'recommenders', weight: P.critical,
      detail: `Status: ${r.status || 'Planning to ask'}. Follow up two weeks out if it is not in.`,
      source: 'profile', confidence: 'exact',
      action: { tab: 'portfolio', view: 'recommenders', label: 'Open recommenders' },
      why: 'A letter deadline you are tracking.',
      ...classify(r.due_date, today, { done: r.status === 'Submitted', weight: P.critical }),
      ...(r.status === 'Submitted' ? { doneLabel: 'Submitted' } : {}),
    });
  });

  // Certifications that expire are real, dated, and quietly invisible everywhere
  // else in the app — a lapsed CPR card is how a student loses a volunteer slot.
  arr(snapshot.skills).forEach(s => {
    if (!s.expiry_date) return;
    out.push({
      id: `skill_exp_${s.id || s.name}`, date: s.expiry_date, title: `${s.name} expires`,
      kind: 'experience', weight: P.important,
      detail: `${s.issuing_body ? `Issued by ${s.issuing_body}. ` : ''}Renew before it lapses — most clinical volunteer roles require it to be current.`,
      source: 'profile', confidence: 'exact',
      action: { tab: 'portfolio', view: 'skills', label: 'Open skills & certs' },
      why: 'From the expiry date on your certification.',
      ...classify(s.expiry_date, today, { weight: P.important }),
    });
  });

  // ── Past, logged work ──────────────────────────────────────────────────────
  // Clinical hours are logged per shift, so one entry per row buries everything
  // else in the past feed. Rolled up by month, they read as the record they are.
  const byMonth = new Map();
  arr(snapshot.clinicalHours).forEach(h => {
    if (!h.entry_date) return;
    const key = h.entry_date.slice(0, 7);
    const cur = byMonth.get(key) || { hours: 0, sites: new Set(), last: h.entry_date };
    cur.hours += Number(h.hours) || 0;
    if (h.site_name) cur.sites.add(h.site_name);
    if (h.entry_date > cur.last) cur.last = h.entry_date;
    byMonth.set(key, cur);
  });
  byMonth.forEach((v, key) => {
    const siteCount = v.sites.size;
    out.push({
      id: `clinical_${key}`, date: v.last, title: `${Math.round(v.hours)} clinical hour${Math.round(v.hours) === 1 ? '' : 's'} logged`,
      kind: 'logged', weight: P.helpful,
      detail: siteCount ? `Across ${siteCount} site${siteCount === 1 ? '' : 's'}: ${[...v.sites].slice(0, 3).join(', ')}${siteCount > 3 ? '…' : ''}.` : 'Logged in the Clinical Hours panel.',
      source: 'profile', confidence: 'exact',
      action: { tab: 'portfolio', view: 'clinical', label: 'Open clinical hours' },
      why: 'Rolled up from the shifts you logged that month.',
      ...classify(v.last, today, { weight: P.helpful }),
    });
  });


  return out;
}

// ── Grouping ─────────────────────────────────────────────────────────────────

const MONTH_FMT = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Chronological buckets, coarse near today and calendar-monthly after that —
 * because "in 3 days" and "in 7 months" are not the same kind of fact and a
 * flat list makes a student read them the same way.
 */
export function groupUpcoming(events, today) {
  const groups = [];
  const push = (key, label, blurb, items) => { if (items.length) groups.push({ key, label, blurb, items }); };
  const missed = events.filter(e => e.status === 'missed');
  const rest = events.filter(e => e.status !== 'missed');
  push('missed', 'Slipped past', 'Dated in the past and still not done. Deal with these first or decide out loud that they no longer apply.', missed);
  push('now', 'This week', 'The next seven days.', rest.filter(e => e.days >= 0 && e.days <= 7));
  push('month', 'Next 30 days', 'Close enough that starting late is the whole risk.', rest.filter(e => e.days > 7 && e.days <= 30));
  const later = rest.filter(e => e.days > 30);
  const byMonth = new Map();
  later.forEach(e => {
    const key = e.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(e);
  });
  [...byMonth.keys()].sort().forEach(key => {
    const [y, m] = key.split('-').map(Number);
    push(key, `${MONTH_FMT[m - 1]} ${y}`, null, byMonth.get(key));
  });
  void today;
  return groups;
}

// ── The public entry point ───────────────────────────────────────────────────

/**
 * The whole timeline for one student.
 *
 * @param {object}   opts.user        the local user record (grade, onboarding answers)
 * @param {object}   opts.snapshot    buildPortfolioSnapshot() output
 * @param {Date}     opts.now         injectable clock (the verify script pins it)
 * @param {object}   opts.counts      optional overrides for callers holding counts, not rows
 * @param {object}   opts.roadmap     the student's Roadmap document, if they have built one
 */
export function buildTimeline({ user = null, snapshot = {}, now = new Date(), counts = null, roadmap = null } = {}) {
  const ctx = buildTimelineContext({ user, snapshot, now, counts });
  // Roadmap events go LAST so that when a roadmap item and a catalog milestone describe the
  // same thing, the dedupe below keeps the catalog's copy — which carries the richer detail,
  // the `done` state derived from the student's real rows, and the deep link to the panel that
  // owns it. The roadmap's copy adds nothing the catalog's does not already say better.
  const raw = [...catalogEvents(ctx), ...profileEvents(ctx, snapshot), ...roadmapEvents(ctx, roadmap)];

  // Dedupe by id, then sort: date first, then priority, then title — so two
  // things on the same day always come out in the same order for the same input.
  const seen = new Set();
  const events = raw.filter(e => {
    if (!e.date || seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || b.weight - a.weight || a.title.localeCompare(b.title));

  const today = ctx.today;
  // How far back the "still open" feed reaches. Logged work is a record worth
  // keeping forever; an un-done milestone from last spring is noise by now, so
  // 'missed' only stays actionable for about ten weeks.
  const missedFloor = shiftDays(today, -70);
  const upcoming = [];
  const doneList = [];
  const past = [];
  events.forEach(e => {
    // 'logged' is a record of work already done, never a thing to do. A shift logged with
    // tomorrow's date is a data-entry artifact, not a plan, and it must not turn up in the
    // Home card's "what's next" list beside a real deadline.
    if (e.kind === 'logged') past.push(e);
    else if (e.status === 'done') doneList.push(e);
    else if (e.days >= 0 || (e.status === 'missed' && e.date >= missedFloor)) upcoming.push(e);
    else past.push(e);
  });
  past.sort((a, b) => a.date.localeCompare(b.date));
  past.reverse();
  const done = doneList;
  const next = upcoming.find(e => e.days >= 0 && e.weight >= P.important) || upcoming.find(e => e.days >= 0) || null;

  const byKind = {};
  events.forEach(e => { byKind[e.kind] = (byKind[e.kind] || 0) + 1; });

  return {
    ctx, events, upcoming, past, done, next,
    groups: groupUpcoming(upcoming, today),
    stats: {
      total: events.length,
      upcoming: upcoming.length,
      missed: upcoming.filter(e => e.status === 'missed').length,
      soon: upcoming.filter(e => e.days >= 0 && e.days <= 14).length,
      done: done.length,
      generated: events.filter(e => e.source === 'catalog').length,
      fromYourData: events.filter(e => e.source === 'profile').length,
      byKind,
    },
    gradeStage: ctx.gradeStage,
    gradeLabel: ctx.gradeLabel,
    years: ctx.years,
  };
}

/**
 * A compact rendering of the timeline for Medabrain's system prompts, so the
 * coach and the Portfolio specialist reason about the same dates the student
 * is looking at instead of re-deriving an admissions calendar from scratch —
 * which is where "you should file the FAFSA" to a freshman comes from.
 */
export function summarizeTimelineForPrompt(timeline, { limit = 10 } = {}) {
  if (!timeline || !timeline.upcoming?.length) return null;
  const { gradeLabel, ctx } = timeline;
  const lines = timeline.upcoming.slice(0, limit).map(e => {
    const when = e.days < 0 ? `${Math.abs(e.days)}d OVERDUE` : e.days === 0 ? 'TODAY' : `in ${e.days}d`;
    return `- ${e.date} (${when}) ${e.title}${e.confidence === 'typical' ? ' [typical date, not confirmed]' : ' [their own date]'}`;
  });
  const missed = timeline.stats.missed;
  return `Their generated application/prep timeline (built from their class year${gradeLabel ? ` — ${gradeLabel}` : ''}, AP/IB status, test track, college list and everything logged in Portfolio). Next ${lines.length} of ${timeline.stats.upcoming} upcoming:
${lines.join('\n')}
${missed ? `${missed} milestone(s) have slipped past their date and are still not done.\n` : ''}Dates marked [typical date] are normal-year dates this app generated, not confirmed by the student — say so if you cite one, and tell them to confirm on the official site. Dates marked [their own date] came from their own tracker and can be stated flatly. Never invent a milestone that is not on this list, and never push a student toward something outside their class year — a ${gradeLabel || 'student'} does not need advice about ${ctx?.gradeIdx != null && ctx.gradeIdx <= 1 ? 'financial aid forms or decision deadlines' : 'anything beyond the next application cycle'}.`;
}
