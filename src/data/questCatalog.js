// ─────────────────────────────────────────────────────────────────────────────
// The quest catalog — the long-horizon, high-effort work a student commits to,
// either because a parent asked or because they picked it themselves.
//
// ── Why quests are not weekly quests ────────────────────────────────────────
// src/lib/gamification.js already has a three-item weekly set ("3 quizzes, 15
// flashcards, 2 coach chats"). Those are attendance prompts: they reset every
// Monday, they are worth 30 XP, and a motivated student clears all three in one
// sitting on a Tuesday evening. They are fine at what they do and nothing here
// replaces them.
//
// This is the other half. A quest is a CONTRACT over one to six weeks that
// cannot be cleared in one sitting, pays enough XP to visibly move a level, and
// is the only thing in the product a parent can put in front of their child.
//
// ── The three rules that make a quest require discipline ────────────────────
// Every quest carries the same three levers, and the combination is what stops
// a quest being an evening of cramming:
//
//   target        how much work, in total
//   dailyCap      how much of that work ONE calendar day may contribute
//   minActiveDays how many distinct days must carry work before it can complete
//
// `dailyCap` is the important one and the least obvious. Without it, "review 400
// flashcards in 21 days" is a Sunday afternoon of mashing the space bar — which
// is precisely the study behaviour spaced repetition exists to prevent. With a
// cap of 40, the same quest is a fortnight of real sessions and cannot be
// finished any faster than the calendar allows. The floor a quest imposes is
// therefore `ceil(target / dailyCap)` days, and the engine surfaces that number
// to both the student and the parent BEFORE either of them commits to it (see
// minimumDays() in src/lib/quests.js) — an assignment whose real cost is hidden
// until week two is a assignment that gets abandoned in week two.
//
// `minActiveDays` then adds the honesty floor on top: a quest can require ten
// separate days even where the raw arithmetic would allow six.
//
// ── Why the XP is large, and why that is not inflation ──────────────────────
// Level N→N+1 costs 100 + (N-1)*50 XP (src/lib/gamification.js). A quiz pays
// low tens. So a 200 XP quest is roughly "a level", and a 2,000 XP quest is
// most of the way from Level 1 to Level 8 — deliberately the largest single
// number in the product. That is the trade being offered: three weeks of real,
// paced, verifiable work in exchange for a reward nothing else in the app can
// match. Small rewards for large asks is how a quest system teaches students
// that quests are not worth starting.
//
// The XP here is also the SERVER's number, not a suggestion: api/_lib/questCatalog.js
// carries a mirror of (id → xp, target, windowDays, dailyCap, minActiveDays) and
// scripts/verifyQuests.mjs fails the build if the two ever disagree. A client that
// asks to claim 50,000 XP for `flash_marathon` is told what `flash_marathon` is
// actually worth.
//
// ── What a quest may measure ────────────────────────────────────────────────
// Only work the app can see happen: a verified lesson, a submitted quiz, an SAT
// question answered, a card reviewed, a cleared review-log item, a logged
// activity. Nothing here measures time-in-app, tab opens, or scroll depth —
// same position the streak rewrite took (src/lib/streak.js), for the same
// reason. A metric a student can satisfy by leaving a tab open is a metric that
// teaches them to leave a tab open.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tiers. `xp` is the reward; `label`/`blurb` are what a student and a parent
 * read before committing. The names climb deliberately — a student who has
 * cleared a Gauntlet should feel that a Crucible is a different proposition.
 */
export const QUEST_TIERS = {
  standard: {
    id: 'standard', label: 'Standard', xp: 200, color: '#3b82f6',
    blurb: 'A real week of work. The smallest thing here that still counts as a quest.',
  },
  hard: {
    id: 'hard', label: 'Gauntlet', xp: 500, color: '#8b5cf6',
    blurb: 'Two weeks, and it will notice if you skip four days in the middle.',
  },
  elite: {
    id: 'elite', label: 'Crucible', xp: 1000, color: '#f59e0b',
    blurb: 'Three weeks of sustained effort. Most students who start one finish it late or not at all.',
  },
  legendary: {
    id: 'legendary', label: 'Legend', xp: 2000, color: '#ef4444',
    blurb: 'Six weeks. This is the largest single reward in the app, and it is priced honestly.',
  },
};

export const TIER_ORDER = ['standard', 'hard', 'elite', 'legendary'];

/**
 * The event types a quest may count, and what one unit of each means.
 *
 * These ids are the contract between the catalog and every producer of events
 * in the app (src/lib/quests.js buildQuestEvents, and the call sites in
 * App.jsx that feed it). Adding a metric here without a producer gives you a
 * quest that can never progress, so scripts/verifyQuests.mjs checks that every
 * metric named by a quest is a key of this map AND is produced somewhere.
 */
export const QUEST_METRICS = {
  lesson_verified:   { label: 'lessons verified',        unit: 'lesson',   verb: 'Verify',   surface: 'prep' },
  lesson_studied:    { label: 'lessons studied',         unit: 'lesson',   verb: 'Study',    surface: 'prep' },
  quiz_completed:    { label: 'quizzes completed',       unit: 'quiz',     verb: 'Complete', surface: 'prep' },
  quiz_strong:       { label: 'quizzes scored 80%+',     unit: 'quiz',     verb: 'Score',    surface: 'prep' },
  quiz_perfect:      { label: 'perfect quizzes',         unit: 'quiz',     verb: 'Ace',      surface: 'prep' },
  flashcard_review:  { label: 'flashcards reviewed',     unit: 'card',     verb: 'Review',   surface: 'prep' },
  sat_question:      { label: 'SAT questions answered',  unit: 'question', verb: 'Answer',   surface: 'sat' },
  sat_full_test:     { label: 'full-length SAT tests',   unit: 'test',     verb: 'Sit',      surface: 'sat' },
  sat_review_clear:  { label: 'review-log items cleared',unit: 'item',     verb: 'Clear',    surface: 'sat' },
  plan_task:         { label: 'plan tasks completed',    unit: 'task',     verb: 'Complete', surface: 'plans' },
  interview_session: { label: 'mock interviews',         unit: 'session',  verb: 'Practise', surface: 'portfolio' },
  portfolio_entry:   { label: 'portfolio entries logged',unit: 'entry',    verb: 'Log',      surface: 'portfolio' },
  clinical_hour:     { label: 'clinical hours logged',   unit: 'hour',     verb: 'Log',      surface: 'portfolio' },
  essay_work:        { label: 'essay drafts worked on',  unit: 'draft',    verb: 'Draft',    surface: 'portfolio' },
  opportunity_track: { label: 'opportunities tracked',   unit: 'program',  verb: 'Track',    surface: 'portfolio' },
  study_day:         { label: 'earned study days',       unit: 'day',      verb: 'Earn',     surface: 'home' },
};

/**
 * Categories — how the board and the parent's picker group things, and the
 * accent each group carries everywhere it is drawn.
 */
export const QUEST_CATEGORIES = {
  pathway:     { id: 'pathway',     label: 'Pathway',        color: '#3b82f6', blurb: 'The lessons that finish a health-career track.' },
  sat:         { id: 'sat',         label: 'SAT',            color: '#0ea5e9', blurb: 'Score work: volume, full tests, and the review log.' },
  retention:   { id: 'retention',   label: 'Retention',      color: '#8b5cf6', blurb: 'Flashcards and quizzes — remembering it a month later.' },
  portfolio:   { id: 'portfolio',   label: 'Portfolio',      color: '#f59e0b', blurb: 'The record of what they have actually done outside the app.' },
  consistency: { id: 'consistency', label: 'Consistency',    color: '#10b981', blurb: 'Showing up, on days nobody is watching.' },
  mastery:     { id: 'mastery',     label: 'Mastery',        color: '#ec4899', blurb: 'Doing it well, not just doing it.' },
};

/**
 * One catalog entry.
 *
 * @typedef {object} Quest
 * @property {string}  id            stable; stored on assigned rows forever
 * @property {string}  title         what a student sees on the card
 * @property {string}  blurb         one line: what this actually asks for
 * @property {string}  proof         exactly what counts, in the student's words
 * @property {string}  why           the parent-facing case for assigning it
 * @property {string}  category      key of QUEST_CATEGORIES
 * @property {string}  tier          key of QUEST_TIERS (sets the XP)
 * @property {string}  metric        key of QUEST_METRICS
 * @property {number}  target        total units required
 * @property {number}  windowDays    days from assignment to the deadline
 * @property {number}  dailyCap      units ONE calendar day may contribute
 * @property {number}  minActiveDays distinct days that must carry work
 * @property {string}  icon          lucide-react component name
 * @property {string[]} surfaces     app surfaces whose strip should nudge this quest
 */

export const QUESTS = [
  // ── Pathway ───────────────────────────────────────────────────────────────
  {
    id: 'path_first_unit',
    title: 'Finish a Unit, Properly',
    blurb: 'Verify 5 pathway lessons in 10 days — no more than 2 in a day.',
    proof: 'A lesson counts when the quiz at the end of it is passed, not when the page is scrolled.',
    why: 'The single best first quest. It is small enough to finish, and it establishes the one habit everything else in this app is built on: lessons get verified, not skimmed.',
    category: 'pathway', tier: 'standard', metric: 'lesson_verified',
    target: 5, windowDays: 10, dailyCap: 2, minActiveDays: 3,
    icon: 'Route', surfaces: ['prep', 'home'],
  },
  {
    id: 'path_steady_dozen',
    title: 'The Steady Dozen',
    blurb: 'Verify 12 pathway lessons in 21 days — at most 2 a day, across at least 7 days.',
    proof: 'Twelve verified lessons. A day can only ever contribute two, so this cannot be finished in a weekend.',
    why: 'This is roughly a third of a pathway at a pace a student can actually hold alongside school. If you only ever assign one quest, assign this one.',
    category: 'pathway', tier: 'hard', metric: 'lesson_verified',
    target: 12, windowDays: 21, dailyCap: 2, minActiveDays: 7,
    icon: 'Route', surfaces: ['prep', 'home'],
  },
  {
    id: 'path_crucible',
    title: 'Pathway Crucible',
    blurb: 'Verify 24 lessons in 28 days, on at least 14 separate days.',
    proof: 'Twenty-four verified lessons over four weeks, and half the days in that month have to carry work.',
    why: 'A month of genuine daily study. Assign it when they have already finished a Gauntlet and want the level jump — not as a first quest, because the completion rate on a cold start is poor.',
    category: 'pathway', tier: 'elite', metric: 'lesson_verified',
    target: 24, windowDays: 28, dailyCap: 3, minActiveDays: 14,
    icon: 'Mountain', surfaces: ['prep', 'home'],
  },
  {
    id: 'path_legend',
    title: 'Finish the Track',
    blurb: 'Verify 50 lessons in 42 days, on at least 25 separate days.',
    proof: 'Fifty verified lessons in six weeks. Most pathways are finished by this.',
    why: 'The largest reward in the app, and the largest ask. This is a summer, or a term with a genuine target on it. Do not assign it in the middle of exam season.',
    category: 'pathway', tier: 'legendary', metric: 'lesson_verified',
    target: 50, windowDays: 42, dailyCap: 3, minActiveDays: 25,
    icon: 'Crown', surfaces: ['prep', 'home'],
  },

  // ── SAT ───────────────────────────────────────────────────────────────────
  {
    id: 'sat_first_hundred',
    title: 'First Hundred',
    blurb: 'Answer 100 SAT questions in 14 days, capped at 25 a day.',
    proof: 'Any SAT question answered in Practice, a Full Test, or the Baseline counts once.',
    why: 'The entry point to score work. A hundred questions is where the skill breakdown stops being noise and starts telling you which section is actually the problem.',
    category: 'sat', tier: 'standard', metric: 'sat_question',
    target: 100, windowDays: 14, dailyCap: 25, minActiveDays: 4,
    icon: 'Target', surfaces: ['sat', 'home'],
  },
  {
    id: 'sat_grind',
    title: 'The Question Grind',
    blurb: 'Answer 400 SAT questions in 28 days, capped at 40 a day.',
    proof: 'Four hundred questions across a month. The cap means at least ten days of real sessions.',
    why: 'Volume is the part of SAT prep with the most reliable relationship to a score, and the part students avoid. The daily cap is what makes this training rather than a cram.',
    category: 'sat', tier: 'elite', metric: 'sat_question',
    target: 400, windowDays: 28, dailyCap: 40, minActiveDays: 12,
    icon: 'Layers', surfaces: ['sat', 'home'],
  },
  {
    id: 'sat_three_tests',
    title: 'Three Under Timing',
    blurb: 'Sit 3 full-length SAT tests in 28 days — one per day, maximum.',
    proof: 'A full-length adaptive test, finished. A test abandoned halfway does not count.',
    why: 'Nothing predicts a real test-day score like a timed full-length test, and nothing gets postponed harder. Three of them in a month is how a projected score becomes a real one.',
    category: 'sat', tier: 'elite', metric: 'sat_full_test',
    target: 3, windowDays: 28, dailyCap: 1, minActiveDays: 3,
    icon: 'ClipboardList', surfaces: ['sat'],
  },
  {
    id: 'sat_clear_the_log',
    title: 'Clear the Review Log',
    blurb: 'Clear 30 review-log items in 21 days, capped at 6 a day.',
    proof: 'An item clears when the question behind it has been reworked and understood, not dismissed.',
    why: 'The review log is the list of things they got wrong and have not fixed. It is the highest-value work in the SAT tab and the least fun, which is exactly what a quest is for.',
    category: 'sat', tier: 'hard', metric: 'sat_review_clear',
    target: 30, windowDays: 21, dailyCap: 6, minActiveDays: 6,
    icon: 'AlertTriangle', surfaces: ['sat'],
  },
  {
    id: 'sat_legend',
    title: 'Test-Season Siege',
    blurb: '900 SAT questions in 42 days, capped at 50 a day, across at least 24 days.',
    proof: 'Nine hundred questions and twenty-four separate days of work in six weeks.',
    why: 'Assign this only against a real test date eight to ten weeks out. It is the whole of a serious prep season, and the reward is priced to match.',
    category: 'sat', tier: 'legendary', metric: 'sat_question',
    target: 900, windowDays: 42, dailyCap: 50, minActiveDays: 24,
    icon: 'Crown', surfaces: ['sat', 'home'],
  },

  // ── Retention ─────────────────────────────────────────────────────────────
  {
    id: 'flash_fortnight',
    title: 'Fourteen Days of Cards',
    blurb: 'Review 200 flashcards in 14 days, capped at 25 a day.',
    proof: 'Any card reviewed in a deck session counts. The cap is per calendar day.',
    why: 'Spaced repetition only works if the spacing is real. The cap is doing the actual teaching here: it makes a fortnight of short sessions the only way through.',
    category: 'retention', tier: 'standard', metric: 'flashcard_review',
    target: 200, windowDays: 14, dailyCap: 25, minActiveDays: 8,
    icon: 'Layers3', surfaces: ['prep'],
  },
  {
    id: 'flash_marathon',
    title: 'Retention Marathon',
    blurb: 'Review 600 flashcards in 30 days, capped at 35 a day, across at least 18 days.',
    proof: 'Six hundred reviews and eighteen separate days inside one month.',
    why: 'A month of near-daily recall practice. This is the quest that puts material into long-term memory rather than into next week.',
    category: 'retention', tier: 'elite', metric: 'flashcard_review',
    target: 600, windowDays: 30, dailyCap: 35, minActiveDays: 18,
    icon: 'Brain', surfaces: ['prep'],
  },
  {
    id: 'quiz_dozen',
    title: 'Twelve Quizzes',
    blurb: 'Complete 12 quizzes in 14 days, capped at 3 a day.',
    proof: 'Any quiz submitted, at any score. Retakes of the same quiz count once per day.',
    why: 'Quizzes are the cheapest honest measurement in the app. A dozen in a fortnight gives the recommendation engine enough signal to actually personalise what comes next.',
    category: 'retention', tier: 'standard', metric: 'quiz_completed',
    target: 12, windowDays: 14, dailyCap: 3, minActiveDays: 5,
    icon: 'Layers', surfaces: ['prep'],
  },

  // ── Mastery ───────────────────────────────────────────────────────────────
  {
    id: 'mastery_strong_ten',
    title: 'Ten Strong Scores',
    blurb: 'Score 80% or better on 10 quizzes in 21 days, capped at 2 a day.',
    proof: 'Only quizzes scored 80% or above count. A 79% is a quiz you sat, not a quiz you cleared.',
    why: 'The difference between doing the work and doing it well. Assign this when the volume is already there but the scores are flat.',
    category: 'mastery', tier: 'hard', metric: 'quiz_strong',
    target: 10, windowDays: 21, dailyCap: 2, minActiveDays: 6,
    icon: 'TrendingUp', surfaces: ['prep', 'home'],
  },
  {
    id: 'mastery_perfect_five',
    title: 'Five Perfect Runs',
    blurb: 'Score 100% on 5 quizzes in 21 days — one per day, maximum.',
    proof: 'A clean 100%. The one-per-day cap means five separate days, minimum.',
    why: 'Genuinely hard, and the only quest in the catalog that cannot be brute-forced by volume. It rewards going back and actually fixing what was missed.',
    category: 'mastery', tier: 'elite', metric: 'quiz_perfect',
    target: 5, windowDays: 21, dailyCap: 1, minActiveDays: 5,
    icon: 'Star', surfaces: ['prep'],
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────
  {
    id: 'port_build_record',
    title: 'Build the Record',
    blurb: 'Log 8 portfolio entries in 21 days, capped at 2 a day.',
    proof: 'An activity, a research entry, a certification, or a clinical block — anything that goes on the résumé.',
    why: 'Most students arrive at application season unable to remember what they did in Year 10. This is the quest that fixes that problem two years early.',
    category: 'portfolio', tier: 'standard', metric: 'portfolio_entry',
    target: 8, windowDays: 21, dailyCap: 2, minActiveDays: 4,
    icon: 'Award', surfaces: ['portfolio'],
  },
  {
    id: 'port_clinical_fifty',
    title: 'Fifty Hours on the Ground',
    blurb: 'Log 50 clinical or shadowing hours in 42 days, capped at 8 a day.',
    proof: 'Hours logged in Activities & Résumé, in the clinical section.',
    why: 'This one is mostly earned outside the app, which is the point — it is the quest that connects screen time to a hospital corridor. Fifty hours is the number admissions readers start taking seriously.',
    category: 'portfolio', tier: 'elite', metric: 'clinical_hour',
    target: 50, windowDays: 42, dailyCap: 8, minActiveDays: 8,
    icon: 'Stethoscope', surfaces: ['portfolio'],
  },
  {
    id: 'port_interview_drill',
    title: 'Interview Drill',
    blurb: 'Practise 6 mock interviews in 21 days — 1 a day, maximum.',
    proof: 'A mock interview answered end to end, including the ones that go badly.',
    why: 'Six separate days of speaking out loud. Interview nerves are a volume problem, and the one-per-day cap is what turns this into rehearsal instead of an afternoon.',
    category: 'portfolio', tier: 'hard', metric: 'interview_session',
    target: 6, windowDays: 21, dailyCap: 1, minActiveDays: 6,
    icon: 'Mic', surfaces: ['portfolio'],
  },
  {
    id: 'port_opportunity_hunt',
    title: 'The Opportunity Hunt',
    blurb: 'Track 10 programs, competitions or scholarships in 14 days, capped at 3 a day.',
    proof: 'Anything tracked from the Opportunities or Scholarships databases.',
    why: 'Cheap, fast, and the highest-leverage hour a rising junior can spend. Deadlines they never found are the applications they never made.',
    category: 'portfolio', tier: 'standard', metric: 'opportunity_track',
    target: 10, windowDays: 14, dailyCap: 3, minActiveDays: 4,
    icon: 'Trophy', surfaces: ['portfolio'],
  },
  {
    id: 'port_essay_push',
    title: 'The Essay Push',
    blurb: 'Work on 12 essay drafts in 28 days, capped at 2 a day.',
    proof: 'A draft saved with real changes in it. Opening the editor is not a draft.',
    why: 'Essays are written by people who sit down twelve times, not by people who sit down once. Assign this the summer before applications.',
    category: 'portfolio', tier: 'hard', metric: 'essay_work',
    target: 12, windowDays: 28, dailyCap: 2, minActiveDays: 8,
    icon: 'ScrollText', surfaces: ['portfolio'],
  },

  // ── Consistency ───────────────────────────────────────────────────────────
  {
    id: 'consist_ten_days',
    title: 'Ten Earned Days',
    blurb: 'Earn 10 study days inside 14 days.',
    proof: 'A day counts once it clears the daily streak goal — real work, not an app open.',
    why: 'The purest discipline quest in the catalog. It says nothing about what they study, only that they show up ten days out of fourteen.',
    category: 'consistency', tier: 'hard', metric: 'study_day',
    target: 10, windowDays: 14, dailyCap: 1, minActiveDays: 10,
    icon: 'Flame', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'],
  },
  {
    id: 'consist_month',
    title: 'Twenty-Five in Thirty',
    blurb: 'Earn 25 study days inside 30 days.',
    proof: 'Twenty-five days that each cleared the streak goal. Five days off in a month, and no more.',
    why: 'The hardest thing in this app that has nothing to do with talent. A student who finishes this has built the habit the rest of the product is trying to build.',
    category: 'consistency', tier: 'legendary', metric: 'study_day',
    target: 25, windowDays: 30, dailyCap: 1, minActiveDays: 25,
    icon: 'CalendarCheck', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'],
  },
  {
    id: 'consist_plan_follow',
    title: 'Follow the Plan',
    blurb: 'Complete 30 plan tasks in 21 days, capped at 4 a day.',
    proof: 'Tasks from the Plans tab, ticked off or auto-verified by the work behind them.',
    why: 'The plan already knows what they should do each day. This quest is about actually doing it — and the cap means the plan gets followed daily rather than raided on Sunday.',
    category: 'consistency', tier: 'hard', metric: 'plan_task',
    target: 30, windowDays: 21, dailyCap: 4, minActiveDays: 10,
    icon: 'CalendarClock', surfaces: ['plans', 'home'],
  },
  {
    id: 'consist_first_week',
    title: 'The First Seven',
    blurb: 'Earn 5 study days inside 7 days.',
    proof: 'Five days out of the next seven that each cleared the streak goal.',
    why: 'The gentlest quest here, and the right one for a student who has just started. Finishing one quest makes the next one far more likely to be started.',
    category: 'consistency', tier: 'standard', metric: 'study_day',
    target: 5, windowDays: 7, dailyCap: 1, minActiveDays: 5,
    icon: 'Sparkles', surfaces: ['home', 'prep'],
  },
];

/** Fast lookup by id — the shape every consumer actually wants. */
export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** The XP a quest pays, from its tier. Never stored on the quest itself, so a
 *  tier re-price is one edit rather than twenty-four. */
export const questXP = (quest) => QUEST_TIERS[quest?.tier]?.xp || 0;

/** The accent a quest carries everywhere it is drawn (category, not tier — the
 *  tier is the size of the reward, the category is what the work IS). */
export const questColor = (quest) => QUEST_CATEGORIES[quest?.category]?.color || '#3b82f6';

export const getQuest = (id) => QUEST_BY_ID[id] || null;

/** Every quest in a category, hardest last — the order both pickers render in. */
export function questsInCategory(categoryId) {
  return QUESTS
    .filter((q) => q.category === categoryId)
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

/** Every quest whose strip belongs on a given app surface ('prep', 'sat', …). */
export function questsForSurface(surface) {
  return QUESTS.filter((q) => q.surfaces.includes(surface));
}
