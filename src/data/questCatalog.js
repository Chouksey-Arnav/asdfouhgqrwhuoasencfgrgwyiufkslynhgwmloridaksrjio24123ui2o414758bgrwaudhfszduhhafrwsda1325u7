// ─────────────────────────────────────────────────────────────────────────────
// The quest catalog — the long-horizon, high-effort work a student commits to,
// either because a parent asked or because they picked it themselves.
//
// ── Why quests are not daily quests ─────────────────────────────────────────
// src/data/dailyQuestCatalog.js holds the OTHER half of this system: three small
// jobs that appear every morning, are worth tens of XP, and are gone by
// midnight. They exist to make opening the app on a Tuesday worth something.
// Nothing here replaces them and nothing there replaces this.
//
// This is the long game. A quest is a CONTRACT over one to eight weeks that
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
// until week two is an assignment that gets abandoned in week two.
//
// `minActiveDays` then adds the honesty floor on top: a quest can require ten
// separate days even where the raw arithmetic would allow six.
//
// ── Why the XP is large, and why that is not inflation ──────────────────────
// Level N→N+1 costs 100 + (N-1)*50 XP (src/lib/gamification.js). A quiz pays
// low tens. So a 200 XP quest is roughly "a level", and a 3,500 XP quest is most
// of the way from Level 1 to Level 10 — deliberately the largest single number
// in the product. That is the trade being offered: weeks of real, paced,
// verifiable work in exchange for a reward nothing else in the app can match.
// Small rewards for large asks is how a quest system teaches students that
// quests are not worth starting.
//
// The XP here is also the SERVER's number, not a suggestion: api/_lib/questCatalog.js
// carries a mirror of (id → xp, target, windowDays, dailyCap, minActiveDays) and
// scripts/verifyQuests.mjs fails the build if the two ever disagree. A client that
// asks to claim 50,000 XP for `flash_marathon` is told what `flash_marathon` is
// actually worth.
//
// ── Chains: why the catalog has a shape and not just a list ─────────────────
// Sixty quests presented as sixty equal options is a menu nobody orders from.
// Most quests here belong to a CHAIN — an ordered ladder from a five-day
// warm-up to an eight-week capstone — and the app leads with "the next rung of
// the road you are already on" rather than with the whole catalog. A student who
// finished `path_first_unit` is offered `path_steady_dozen` by name, with the
// finished one shown behind it. That is the difference between a quest system
// and a quest screen.
//
// Chains are advisory, never gates: any quest in the catalog can be taken at any
// time by anyone. A ladder that locks rungs punishes the student who arrives
// already good at this, and there are plenty of those.
//
// ── What a quest may measure ────────────────────────────────────────────────
// Only work the app can see happen: a verified lesson, a submitted quiz, an SAT
// question answered, a card reviewed, a cleared review-log item, a logged
// activity, a note actually written. Nothing here measures time-in-app, tab
// opens, or scroll depth — same position the streak rewrite took
// (src/lib/streak.js), for the same reason. A metric a student can satisfy by
// leaving a tab open is a metric that teaches them to leave a tab open.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tiers. `xp` is the reward; `label`/`blurb` are what a student and a parent
 * read before committing. The names climb deliberately — a student who has
 * cleared a Gauntlet should feel that a Crucible is a different proposition.
 *
 * `starter` exists because the old floor was wrong. The cheapest quest in the
 * catalog used to be a week long and worth 200 XP, which is a fine second quest
 * and a terrible first one: the students who most need the completion — the ones
 * who have never finished anything in an app — were being asked to commit before
 * they had any evidence that finishing feels good. A Warm-up is three to five
 * days, pays real XP, and exists to be finished.
 *
 * `mythic` exists for the other end. Two quests in the catalog are eight-week
 * capstones sitting at the top of their chain, and they should not be priced the
 * same as the six-week quests below them.
 */
export const QUEST_TIERS = {
  starter: {
    id: 'starter', label: 'Warm-up', xp: 75, color: '#22d3ee',
    blurb: 'Three to five days. Small on purpose — this one exists to be finished.',
  },
  standard: {
    id: 'standard', label: 'Standard', xp: 200, color: '#3b82f6',
    blurb: 'A real week of work. The smallest thing here that still counts as a commitment.',
  },
  hard: {
    id: 'hard', label: 'Gauntlet', xp: 500, color: '#8b5cf6',
    blurb: 'Two to three weeks, and it will notice if you skip four days in the middle.',
  },
  elite: {
    id: 'elite', label: 'Crucible', xp: 1000, color: '#f59e0b',
    blurb: 'Three to five weeks of sustained effort. Most students who start one finish it late or not at all.',
  },
  legendary: {
    id: 'legendary', label: 'Legend', xp: 2000, color: '#ef4444',
    blurb: 'Six weeks. Almost nothing else in the app pays like this, and it is priced honestly.',
  },
  mythic: {
    id: 'mythic', label: 'Mythic', xp: 3500, color: '#f0abfc',
    blurb: 'Eight weeks, at the top of a chain. The largest single reward in the product — a whole season of work.',
  },
};

export const TIER_ORDER = ['starter', 'standard', 'hard', 'elite', 'legendary', 'mythic'];

/** Position of a tier in the ladder, for sorting. Unknown tiers sort last. */
export const tierRank = (tier) => {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? TIER_ORDER.length : i;
};

/**
 * The event types a quest may count, and what one unit of each means.
 *
 * These ids are the contract between the catalog and every producer of events
 * in the app (src/lib/quests.js buildQuestEvents, and the call sites in
 * App.jsx that feed it). Adding a metric here without a producer gives you a
 * quest that can never progress, so scripts/verifyQuests.mjs checks that every
 * metric named by a quest is a key of this map AND is produced somewhere.
 *
 * `surface` is the tab the strip for this metric belongs on. `evidence` is the
 * one-line answer to "how does the app know" — it is shown on the quest card's
 * proof line and in the parent's picker, because a metric whose provenance is
 * unexplained is a metric a suspicious parent assumes is self-reported.
 */
export const QUEST_METRICS = {
  lesson_verified:   { label: 'lessons verified',         unit: 'lesson',   verb: 'Verify',   surface: 'prep',      evidence: 'the end-of-lesson quiz was passed' },
  lesson_studied:    { label: 'lessons studied',          unit: 'lesson',   verb: 'Study',    surface: 'prep',      evidence: 'the article and video were both completed' },
  lesson_perfect:    { label: 'lessons aced',             unit: 'lesson',   verb: 'Ace',      surface: 'prep',      evidence: 'the end-of-lesson quiz was scored 100%' },
  unit_verified:     { label: 'units mastered',           unit: 'unit',     verb: 'Master',   surface: 'prep',      evidence: 'every lesson in the unit was verified and the unit quiz passed' },
  quiz_completed:    { label: 'quizzes completed',        unit: 'quiz',     verb: 'Complete', surface: 'prep',      evidence: 'a quiz was submitted' },
  quiz_strong:       { label: 'quizzes scored 80%+',      unit: 'quiz',     verb: 'Score',    surface: 'prep',      evidence: 'a quiz was submitted at 80% or above' },
  quiz_perfect:      { label: 'perfect quizzes',          unit: 'quiz',     verb: 'Ace',      surface: 'prep',      evidence: 'a quiz was submitted at 100%' },
  flashcard_review:  { label: 'flashcards reviewed',      unit: 'card',     verb: 'Review',   surface: 'prep',      evidence: 'a card was graded in a deck session' },
  deck_created:      { label: 'decks built',              unit: 'deck',     verb: 'Build',    surface: 'prep',      evidence: 'a new deck was created or generated' },
  note_written:      { label: 'notes and highlights',     unit: 'note',     verb: 'Write',    surface: 'prep',      evidence: 'a lesson note was saved or a passage highlighted' },
  coach_session:     { label: 'questions asked of Medabrain', unit: 'question', verb: 'Ask',  surface: 'prep',      evidence: 'a question was sent to Medabrain' },
  sat_question:      { label: 'SAT questions answered',   unit: 'question', verb: 'Answer',   surface: 'sat',       evidence: 'a question was answered in Practice, a Test, or the Baseline' },
  sat_correct:       { label: 'SAT questions correct',    unit: 'question', verb: 'Get right',surface: 'sat',       evidence: 'a question was answered correctly' },
  sat_full_test:     { label: 'full-length SAT tests',    unit: 'test',     verb: 'Sit',      surface: 'sat',       evidence: 'a full-length adaptive test was finished, not abandoned' },
  sat_review_clear:  { label: 'review-log items cleared', unit: 'item',     verb: 'Clear',    surface: 'sat',       evidence: 'a missed question was reworked and marked resolved' },
  plan_task:         { label: 'plan tasks completed',     unit: 'task',     verb: 'Complete', surface: 'plans',     evidence: 'a task on the study plan was ticked or auto-verified' },
  interview_session: { label: 'mock interviews',          unit: 'session',  verb: 'Practise', surface: 'portfolio', evidence: 'a mock interview was answered end to end' },
  portfolio_entry:   { label: 'portfolio entries logged', unit: 'entry',    verb: 'Log',      surface: 'portfolio', evidence: 'an activity, research, skill or clinical row was saved' },
  clinical_hour:     { label: 'clinical hours logged',    unit: 'hour',     verb: 'Log',      surface: 'portfolio', evidence: 'hours were logged against a clinical or shadowing site' },
  award_logged:      { label: 'awards and honours',       unit: 'award',    verb: 'Log',      surface: 'portfolio', evidence: 'an award or honour was added to the record' },
  essay_work:        { label: 'essay drafts worked on',   unit: 'draft',    verb: 'Draft',    surface: 'portfolio', evidence: 'an essay draft was saved with real changes in it' },
  opportunity_track: { label: 'opportunities tracked',    unit: 'program',  verb: 'Track',    surface: 'portfolio', evidence: 'a program was tracked from the Opportunities or Scholarships catalogs' },
  scholarship_track: { label: 'scholarships tracked',     unit: 'award',    verb: 'Track',    surface: 'portfolio', evidence: 'a scholarship was saved to the tracker' },
  college_saved:     { label: 'colleges on the list',     unit: 'college',  verb: 'Add',      surface: 'portfolio', evidence: 'a college was added to the list' },
  recommender_ask:   { label: 'recommenders lined up',    unit: 'person',   verb: 'Line up',  surface: 'portfolio', evidence: 'a recommender was added to the letter tracker' },
  study_day:         { label: 'earned study days',        unit: 'day',      verb: 'Earn',     surface: 'home',      evidence: 'the day cleared the daily streak goal' },
  perfect_day:       { label: 'double-goal days',         unit: 'day',      verb: 'Double',   surface: 'home',      evidence: 'the day earned twice the daily streak goal' },
  weekend_day:       { label: 'earned weekend days',      unit: 'day',      verb: 'Earn',     surface: 'home',      evidence: 'a Saturday or Sunday cleared the daily streak goal' },
};

/**
 * Categories — how the board and the parent's picker group things, and the
 * accent each group carries everywhere it is drawn.
 *
 * `order` fixes the sequence the board renders in, which is roughly "the core of
 * the product first, the things with an application deadline on them last".
 */
export const QUEST_CATEGORIES = {
  pathway:     { id: 'pathway',     order: 1, label: 'Pathway',     color: '#3b82f6', icon: 'Route',      blurb: 'The lessons that finish a health-career track.' },
  sat:         { id: 'sat',         order: 2, label: 'SAT',         color: '#0ea5e9', icon: 'Target',     blurb: 'Score work: volume, accuracy, full tests, and the review log.' },
  retention:   { id: 'retention',   order: 3, label: 'Retention',   color: '#8b5cf6', icon: 'Layers3',    blurb: 'Flashcards and quizzes — remembering it a month later.' },
  mastery:     { id: 'mastery',     order: 4, label: 'Mastery',     color: '#ec4899', icon: 'TrendingUp', blurb: 'Doing it well, not just doing it.' },
  consistency: { id: 'consistency', order: 5, label: 'Consistency', color: '#10b981', icon: 'Flame',      blurb: 'Showing up, on days nobody is watching.' },
  exploration: { id: 'exploration', order: 6, label: 'Curiosity',   color: '#06b6d4', icon: 'Compass',    blurb: 'Asking, writing things down, and building your own material.' },
  portfolio:   { id: 'portfolio',   order: 7, label: 'Portfolio',   color: '#f59e0b', icon: 'Award',      blurb: 'The record of what you have actually done outside the app.' },
  application: { id: 'application', order: 8, label: 'Application',  color: '#f43f5e', icon: 'ScrollText', blurb: 'Colleges, money, essays and letters — the parts with real deadlines.' },
};

export const CATEGORY_ORDER = Object.values(QUEST_CATEGORIES)
  .sort((a, b) => a.order - b.order)
  .map((c) => c.id);

/**
 * Chains — the ordered ladders most of the catalog belongs to.
 *
 * A chain is the answer to "what next", which is the question a student has the
 * moment they claim something. Each entry lists its quest ids in order; the
 * quests themselves carry `chain`/`chainStep` so a single card can say "step 2
 * of 5" without a lookup.
 *
 * `finale` is the tier the last rung pays at, quoted on the chain header so the
 * whole ladder has a visible prize at the end of it rather than only a next step.
 */
export const QUEST_CHAINS = {
  pathway_road: {
    id: 'pathway_road', label: 'The Pathway Road', color: '#3b82f6', icon: 'Route',
    blurb: 'Three lessons, then five, then twelve, then a track. The spine of the whole product.',
    steps: ['path_warmup', 'path_first_unit', 'path_steady_dozen', 'path_crucible', 'path_legend'],
  },
  sat_ladder: {
    id: 'sat_ladder', label: 'The Score Ladder', color: '#0ea5e9', icon: 'Target',
    blurb: 'Thirty questions to nine hundred, with accuracy work in the middle where it belongs.',
    steps: ['sat_warmup', 'sat_first_hundred', 'sat_accuracy_drive', 'sat_grind', 'sat_legend'],
  },
  habit_ladder: {
    id: 'habit_ladder', label: 'The Habit Ladder', color: '#10b981', icon: 'Flame',
    blurb: 'Three days, then five, then ten, then a month, then a season. Nothing to do with talent.',
    steps: ['consist_warmup', 'consist_first_week', 'consist_ten_days', 'consist_month', 'consist_mythic_season'],
  },
  record_ladder: {
    id: 'record_ladder', label: 'Building the Record', color: '#f59e0b', icon: 'Award',
    blurb: 'From three entries to a full application season. This is the ladder that ends in a submitted application.',
    steps: ['port_first_entries', 'port_build_record', 'app_college_list', 'app_scholarship_sweep', 'app_season_mythic'],
  },
  retention_ladder: {
    id: 'retention_ladder', label: 'The Memory Ladder', color: '#8b5cf6', icon: 'Brain',
    blurb: 'Sixty cards to six hundred. Spaced properly, because the cap will not let you do it any other way.',
    steps: ['flash_warmup', 'flash_fortnight', 'flash_century_club', 'flash_marathon'],
  },
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
 * @property {string}  [chain]       key of QUEST_CHAINS this belongs to
 * @property {number}  [chainStep]   1-based position within that chain
 * @property {string}  [season]      'any' | 'summer' | 'school' | 'test' — a hint for
 *                                   the recommender about when this is the right ask
 */

export const QUESTS = [
  // ── Pathway ───────────────────────────────────────────────────────────────
  {
    id: 'path_warmup',
    title: 'Three Lessons, Verified',
    blurb: 'Verify 3 pathway lessons in 5 days — one a day.',
    proof: 'A lesson counts when the quiz at the end of it is passed, not when the page is scrolled.',
    why: 'The smallest honest commitment in the catalog and the right first one for anybody. One lesson a day for three days proves the loop works before asking for a fortnight of it.',
    category: 'pathway', tier: 'starter', metric: 'lesson_verified',
    target: 3, windowDays: 5, dailyCap: 1, minActiveDays: 3,
    icon: 'Sparkles', surfaces: ['prep', 'home'], chain: 'pathway_road', chainStep: 1, season: 'any',
  },
  {
    id: 'path_first_unit',
    title: 'Finish a Unit, Properly',
    blurb: 'Verify 5 pathway lessons in 10 days — no more than 2 in a day.',
    proof: 'A lesson counts when the quiz at the end of it is passed, not when the page is scrolled.',
    why: 'The single best first real quest. It is small enough to finish, and it establishes the one habit everything else in this app is built on: lessons get verified, not skimmed.',
    category: 'pathway', tier: 'standard', metric: 'lesson_verified',
    target: 5, windowDays: 10, dailyCap: 2, minActiveDays: 3,
    icon: 'Route', surfaces: ['prep', 'home'], chain: 'pathway_road', chainStep: 2, season: 'any',
  },
  {
    id: 'path_steady_dozen',
    title: 'The Steady Dozen',
    blurb: 'Verify 12 pathway lessons in 21 days — at most 2 a day, across at least 7 days.',
    proof: 'Twelve verified lessons. A day can only ever contribute two, so this cannot be finished in a weekend.',
    why: 'This is roughly a third of a pathway at a pace a student can actually hold alongside school. If you only ever assign one quest, assign this one.',
    category: 'pathway', tier: 'hard', metric: 'lesson_verified',
    target: 12, windowDays: 21, dailyCap: 2, minActiveDays: 7,
    icon: 'Route', surfaces: ['prep', 'home'], chain: 'pathway_road', chainStep: 3, season: 'school',
  },
  {
    id: 'path_crucible',
    title: 'Pathway Crucible',
    blurb: 'Verify 24 lessons in 28 days, on at least 14 separate days.',
    proof: 'Twenty-four verified lessons over four weeks, and half the days in that month have to carry work.',
    why: 'A month of genuine daily study. Assign it when they have already finished a Gauntlet and want the level jump — not as a first quest, because the completion rate on a cold start is poor.',
    category: 'pathway', tier: 'elite', metric: 'lesson_verified',
    target: 24, windowDays: 28, dailyCap: 3, minActiveDays: 14,
    icon: 'Mountain', surfaces: ['prep', 'home'], chain: 'pathway_road', chainStep: 4, season: 'any',
  },
  {
    id: 'path_legend',
    title: 'Finish the Track',
    blurb: 'Verify 50 lessons in 42 days, on at least 25 separate days.',
    proof: 'Fifty verified lessons in six weeks. Most pathways are finished by this.',
    why: 'The largest pathway ask in the app. This is a summer, or a term with a genuine target on it. Do not assign it in the middle of exam season.',
    category: 'pathway', tier: 'legendary', metric: 'lesson_verified',
    target: 50, windowDays: 42, dailyCap: 3, minActiveDays: 25,
    icon: 'Crown', surfaces: ['prep', 'home'], chain: 'pathway_road', chainStep: 5, season: 'summer',
  },
  {
    id: 'path_unit_master',
    title: 'Three Units Mastered',
    blurb: 'Master 3 pathway units in 21 days — one unit a day, maximum.',
    proof: 'A unit is mastered when every lesson inside it is verified and the unit quiz is passed.',
    why: 'Units are the level above lessons and the level the pathway is actually organised around. A student who has mastered three has finished a real, nameable chunk of a career track rather than a scattered handful of pages.',
    category: 'pathway', tier: 'hard', metric: 'unit_verified',
    target: 3, windowDays: 21, dailyCap: 1, minActiveDays: 3,
    icon: 'Boxes', surfaces: ['prep', 'home'], season: 'any',
  },
  {
    id: 'path_flawless',
    title: 'Five Flawless Lessons',
    blurb: 'Score 100% on the end-of-lesson quiz for 5 lessons in 21 days — one a day.',
    proof: 'Only a clean 100% on the verification quiz counts. A 90% is a verified lesson, not a flawless one.',
    why: 'The difference between finishing a lesson and actually knowing it. This is the quest for a student whose verified count is climbing but whose quiz scores say the reading is going in one eye and out the other.',
    category: 'pathway', tier: 'elite', metric: 'lesson_perfect',
    target: 5, windowDays: 21, dailyCap: 1, minActiveDays: 5,
    icon: 'BadgeCheck', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'path_wide_read',
    title: 'The Wide Read',
    blurb: 'Study 20 lessons in 21 days — at most 2 a day, across at least 10 days.',
    proof: 'A lesson counts as studied once both the article and the video are finished, whether or not the quiz is passed.',
    why: 'For the student who is exploring rather than committing — reading widely across pathways to work out which career actually interests them. It rewards breadth without pretending breadth is mastery.',
    category: 'pathway', tier: 'hard', metric: 'lesson_studied',
    target: 20, windowDays: 21, dailyCap: 2, minActiveDays: 10,
    icon: 'BookOpen', surfaces: ['prep'], season: 'any',
  },

  // ── SAT ───────────────────────────────────────────────────────────────────
  {
    id: 'sat_warmup',
    title: 'Thirty to Start',
    blurb: 'Answer 30 SAT questions in 7 days, capped at 10 a day.',
    proof: 'Any SAT question answered in Practice, a Full Test, or the Baseline counts once.',
    why: 'The cheapest way into the SAT tab. Thirty questions is one short session a day for three days and is enough for the skill heat map to have something to say.',
    category: 'sat', tier: 'starter', metric: 'sat_question',
    target: 30, windowDays: 7, dailyCap: 10, minActiveDays: 3,
    icon: 'Sparkles', surfaces: ['sat', 'home'], chain: 'sat_ladder', chainStep: 1, season: 'any',
  },
  {
    id: 'sat_first_hundred',
    title: 'First Hundred',
    blurb: 'Answer 100 SAT questions in 14 days, capped at 25 a day.',
    proof: 'Any SAT question answered in Practice, a Full Test, or the Baseline counts once.',
    why: 'The entry point to score work. A hundred questions is where the skill breakdown stops being noise and starts telling you which section is actually the problem.',
    category: 'sat', tier: 'standard', metric: 'sat_question',
    target: 100, windowDays: 14, dailyCap: 25, minActiveDays: 4,
    icon: 'Target', surfaces: ['sat', 'home'], chain: 'sat_ladder', chainStep: 2, season: 'any',
  },
  {
    id: 'sat_accuracy_drive',
    title: 'Two Hundred and Fifty Right',
    blurb: 'Get 250 SAT questions CORRECT in 21 days, capped at 20 a day.',
    proof: 'Only correct answers count. A wrong answer costs nothing but moves nothing.',
    why: 'The one SAT quest volume cannot brute-force. A student guessing their way through practice sees this bar barely move, which is the feedback a raw question count can never give them.',
    category: 'sat', tier: 'hard', metric: 'sat_correct',
    target: 250, windowDays: 21, dailyCap: 20, minActiveDays: 13,
    icon: 'CircleCheck', surfaces: ['sat', 'home'], chain: 'sat_ladder', chainStep: 3, season: 'test',
  },
  {
    id: 'sat_grind',
    title: 'The Question Grind',
    blurb: 'Answer 400 SAT questions in 28 days, capped at 40 a day.',
    proof: 'Four hundred questions across a month. The cap means at least ten days of real sessions.',
    why: 'Volume is the part of SAT prep with the most reliable relationship to a score, and the part students avoid. The daily cap is what makes this training rather than a cram.',
    category: 'sat', tier: 'elite', metric: 'sat_question',
    target: 400, windowDays: 28, dailyCap: 40, minActiveDays: 12,
    icon: 'Layers', surfaces: ['sat', 'home'], chain: 'sat_ladder', chainStep: 4, season: 'test',
  },
  {
    id: 'sat_legend',
    title: 'Test-Season Siege',
    blurb: '900 SAT questions in 42 days, capped at 50 a day, across at least 24 days.',
    proof: 'Nine hundred questions and twenty-four separate days of work in six weeks.',
    why: 'Assign this only against a real test date eight to ten weeks out. It is the whole of a serious prep season, and the reward is priced to match.',
    category: 'sat', tier: 'legendary', metric: 'sat_question',
    target: 900, windowDays: 42, dailyCap: 50, minActiveDays: 24,
    icon: 'Crown', surfaces: ['sat', 'home'], chain: 'sat_ladder', chainStep: 5, season: 'test',
  },
  {
    id: 'sat_three_tests',
    title: 'Three Under Timing',
    blurb: 'Sit 3 full-length SAT tests in 28 days — one per day, maximum.',
    proof: 'A full-length adaptive test, finished. A test abandoned halfway does not count.',
    why: 'Nothing predicts a real test-day score like a timed full-length test, and nothing gets postponed harder. Three of them in a month is how a projected score becomes a real one.',
    category: 'sat', tier: 'elite', metric: 'sat_full_test',
    target: 3, windowDays: 28, dailyCap: 1, minActiveDays: 3,
    icon: 'ClipboardList', surfaces: ['sat'], season: 'test',
  },
  {
    id: 'sat_review_habit',
    title: 'The Review Habit',
    blurb: 'Clear 12 review-log items in 14 days, capped at 2 a day.',
    proof: 'An item clears when the question behind it has been reworked and understood, not dismissed.',
    why: 'The gentle version of clearing the log. Two a day for six days is a habit rather than a chore, and it is the habit that stops the log becoming the intimidating pile students abandon.',
    category: 'sat', tier: 'standard', metric: 'sat_review_clear',
    target: 12, windowDays: 14, dailyCap: 2, minActiveDays: 6,
    icon: 'ListChecks', surfaces: ['sat'], season: 'any',
  },
  {
    id: 'sat_clear_the_log',
    title: 'Clear the Review Log',
    blurb: 'Clear 30 review-log items in 21 days, capped at 6 a day.',
    proof: 'An item clears when the question behind it has been reworked and understood, not dismissed.',
    why: 'The review log is the list of things they got wrong and have not fixed. It is the highest-value work in the SAT tab and the least fun, which is exactly what a quest is for.',
    category: 'sat', tier: 'hard', metric: 'sat_review_clear',
    target: 30, windowDays: 21, dailyCap: 6, minActiveDays: 6,
    icon: 'AlertTriangle', surfaces: ['sat'], season: 'test',
  },
  {
    id: 'sat_marathon_month',
    title: 'Six Hundred Right',
    blurb: 'Get 600 SAT questions correct in 42 days, capped at 30 a day, across at least 22 days.',
    proof: 'Six hundred correct answers, and twenty-two separate days of work behind them.',
    why: 'The accuracy counterpart to Test-Season Siege, and harder than it looks: a student at 60% accuracy has to answer a thousand questions to finish this. Assign it against a real test date with two months of runway.',
    category: 'sat', tier: 'legendary', metric: 'sat_correct',
    target: 600, windowDays: 42, dailyCap: 30, minActiveDays: 22,
    icon: 'Crosshair', surfaces: ['sat'], season: 'test',
  },

  // ── Retention ─────────────────────────────────────────────────────────────
  {
    id: 'flash_warmup',
    title: 'Sixty Cards',
    blurb: 'Review 60 flashcards in 7 days, capped at 15 a day.',
    proof: 'Any card graded in a deck session counts. The cap is per calendar day.',
    why: 'Four short sessions across a week. It is the smallest dose of spaced repetition that still behaves like spaced repetition, which makes it the right first retention quest.',
    category: 'retention', tier: 'starter', metric: 'flashcard_review',
    target: 60, windowDays: 7, dailyCap: 15, minActiveDays: 4,
    icon: 'Sparkles', surfaces: ['prep'], chain: 'retention_ladder', chainStep: 1, season: 'any',
  },
  {
    id: 'flash_fortnight',
    title: 'Fourteen Days of Cards',
    blurb: 'Review 200 flashcards in 14 days, capped at 25 a day.',
    proof: 'Any card reviewed in a deck session counts. The cap is per calendar day.',
    why: 'Spaced repetition only works if the spacing is real. The cap is doing the actual teaching here: it makes a fortnight of short sessions the only way through.',
    category: 'retention', tier: 'standard', metric: 'flashcard_review',
    target: 200, windowDays: 14, dailyCap: 25, minActiveDays: 8,
    icon: 'Layers3', surfaces: ['prep'], chain: 'retention_ladder', chainStep: 2, season: 'any',
  },
  {
    id: 'flash_century_club',
    title: 'The Century Club',
    blurb: 'Review 350 flashcards in 21 days, capped at 25 a day, across at least 14 days.',
    proof: 'Three hundred and fifty reviews and fourteen separate days inside three weeks.',
    why: 'The middle rung, and the one that actually builds the habit: two weeks of daily recall is the point at which students stop needing to be reminded to open the decks.',
    category: 'retention', tier: 'hard', metric: 'flashcard_review',
    target: 350, windowDays: 21, dailyCap: 25, minActiveDays: 14,
    icon: 'Layers', surfaces: ['prep'], chain: 'retention_ladder', chainStep: 3, season: 'any',
  },
  {
    id: 'flash_marathon',
    title: 'Retention Marathon',
    blurb: 'Review 600 flashcards in 30 days, capped at 35 a day, across at least 18 days.',
    proof: 'Six hundred reviews and eighteen separate days inside one month.',
    why: 'A month of near-daily recall practice. This is the quest that puts material into long-term memory rather than into next week.',
    category: 'retention', tier: 'elite', metric: 'flashcard_review',
    target: 600, windowDays: 30, dailyCap: 35, minActiveDays: 18,
    icon: 'Brain', surfaces: ['prep'], chain: 'retention_ladder', chainStep: 4, season: 'any',
  },
  {
    id: 'quiz_dozen',
    title: 'Twelve Quizzes',
    blurb: 'Complete 12 quizzes in 14 days, capped at 3 a day.',
    proof: 'Any quiz submitted, at any score. Retakes of the same quiz count once per day.',
    why: 'Quizzes are the cheapest honest measurement in the app. A dozen in a fortnight gives the recommendation engine enough signal to actually personalise what comes next.',
    category: 'retention', tier: 'standard', metric: 'quiz_completed',
    target: 12, windowDays: 14, dailyCap: 3, minActiveDays: 5,
    icon: 'Layers', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'quiz_thirty',
    title: 'Thirty in a Month',
    blurb: 'Complete 30 quizzes in 28 days, capped at 3 a day, across at least 12 days.',
    proof: 'Any quiz submitted, at any score. Three a day is the ceiling, so this needs a dozen sessions minimum.',
    why: 'Volume on the cheapest measurement in the product. By the end of it the performance breakdown is built on real data rather than on four quizzes taken in one evening.',
    category: 'retention', tier: 'hard', metric: 'quiz_completed',
    target: 30, windowDays: 28, dailyCap: 3, minActiveDays: 12,
    icon: 'ListTodo', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'deck_builder',
    title: 'Build Your Own Decks',
    blurb: 'Create 3 flashcard decks in 14 days — one a day, maximum.',
    proof: 'A deck you built yourself or generated from your own notes. The built-in decks do not count.',
    why: 'Writing the card is most of the learning; reviewing it is the rest. A student who builds their own decks has had to decide what actually matters in a lesson, which is a skill no amount of reviewing teaches.',
    category: 'retention', tier: 'standard', metric: 'deck_created',
    target: 3, windowDays: 14, dailyCap: 1, minActiveDays: 3,
    icon: 'FolderPlus', surfaces: ['prep'], season: 'any',
  },

  // ── Mastery ───────────────────────────────────────────────────────────────
  {
    id: 'mastery_strong_start',
    title: 'Five Strong Scores',
    blurb: 'Score 80% or better on 5 quizzes in 14 days — one a day, maximum.',
    proof: 'Only quizzes scored 80% or above count. A 79% is a quiz you sat, not a quiz you cleared.',
    why: 'The entry point to quality work, and the one to assign before Ten Strong Scores. Five separate days at a real standard is a much smaller ask than it sounds and a much bigger habit than it looks.',
    category: 'mastery', tier: 'standard', metric: 'quiz_strong',
    target: 5, windowDays: 14, dailyCap: 1, minActiveDays: 5,
    icon: 'ChevronsUp', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'mastery_strong_ten',
    title: 'Ten Strong Scores',
    blurb: 'Score 80% or better on 10 quizzes in 21 days, capped at 2 a day.',
    proof: 'Only quizzes scored 80% or above count. A 79% is a quiz you sat, not a quiz you cleared.',
    why: 'The difference between doing the work and doing it well. Assign this when the volume is already there but the scores are flat.',
    category: 'mastery', tier: 'hard', metric: 'quiz_strong',
    target: 10, windowDays: 21, dailyCap: 2, minActiveDays: 6,
    icon: 'TrendingUp', surfaces: ['prep', 'home'], season: 'any',
  },
  {
    id: 'mastery_perfect_five',
    title: 'Five Perfect Runs',
    blurb: 'Score 100% on 5 quizzes in 21 days — one per day, maximum.',
    proof: 'A clean 100%. The one-per-day cap means five separate days, minimum.',
    why: 'Genuinely hard, and the only quest in the catalog that cannot be brute-forced by volume. It rewards going back and actually fixing what was missed.',
    category: 'mastery', tier: 'elite', metric: 'quiz_perfect',
    target: 5, windowDays: 21, dailyCap: 1, minActiveDays: 5,
    icon: 'Star', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'mastery_relentless',
    title: 'Relentless',
    blurb: 'Score 80% or better on 30 quizzes in 42 days, capped at 2 a day, across at least 20 days.',
    proof: 'Thirty quizzes at 80% or above, over twenty separate days. Anything below the bar is invisible to this quest.',
    why: 'Six weeks of doing it properly. There is no version of finishing this that does not involve genuinely knowing the material, which is why it is priced with the six-week quests rather than with the three-week ones.',
    category: 'mastery', tier: 'legendary', metric: 'quiz_strong',
    target: 30, windowDays: 42, dailyCap: 2, minActiveDays: 20,
    icon: 'Medal', surfaces: ['prep'], season: 'any',
  },

  // ── Consistency ───────────────────────────────────────────────────────────
  {
    id: 'consist_warmup',
    title: 'Three Days Straight',
    blurb: 'Earn 3 study days inside 5 days.',
    proof: 'A day counts once it clears your daily streak goal — real work, not an app open.',
    why: 'The gentlest thing in the catalog. Three days out of five is a promise a student in a bad week can still keep, and keeping one is what makes the next one worth starting.',
    category: 'consistency', tier: 'starter', metric: 'study_day',
    target: 3, windowDays: 5, dailyCap: 1, minActiveDays: 3,
    icon: 'Sparkles', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'], chain: 'habit_ladder', chainStep: 1, season: 'any',
  },
  {
    id: 'consist_first_week',
    title: 'The First Seven',
    blurb: 'Earn 5 study days inside 7 days.',
    proof: 'Five days out of the next seven that each cleared the streak goal.',
    why: 'The right quest for a student who has just started and can already show up twice. Finishing one quest makes the next one far more likely to be started.',
    category: 'consistency', tier: 'standard', metric: 'study_day',
    target: 5, windowDays: 7, dailyCap: 1, minActiveDays: 5,
    icon: 'CalendarDays', surfaces: ['home', 'prep'], chain: 'habit_ladder', chainStep: 2, season: 'any',
  },
  {
    id: 'consist_ten_days',
    title: 'Ten Earned Days',
    blurb: 'Earn 10 study days inside 14 days.',
    proof: 'A day counts once it clears the daily streak goal — real work, not an app open.',
    why: 'The purest discipline quest in the catalog. It says nothing about what they study, only that they show up ten days out of fourteen.',
    category: 'consistency', tier: 'hard', metric: 'study_day',
    target: 10, windowDays: 14, dailyCap: 1, minActiveDays: 10,
    icon: 'Flame', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'], chain: 'habit_ladder', chainStep: 3, season: 'any',
  },
  {
    id: 'consist_month',
    title: 'Twenty-Five in Thirty',
    blurb: 'Earn 25 study days inside 30 days.',
    proof: 'Twenty-five days that each cleared the streak goal. Five days off in a month, and no more.',
    why: 'The hardest thing in this app that has nothing to do with talent. A student who finishes this has built the habit the rest of the product is trying to build.',
    category: 'consistency', tier: 'legendary', metric: 'study_day',
    target: 25, windowDays: 30, dailyCap: 1, minActiveDays: 25,
    icon: 'CalendarCheck', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'], chain: 'habit_ladder', chainStep: 4, season: 'any',
  },
  {
    id: 'consist_mythic_season',
    title: 'The Season',
    blurb: 'Earn 45 study days inside 56 days.',
    proof: 'Forty-five earned days in eight weeks. Eleven days off across two months, and no more.',
    why: 'The top of the habit ladder and the largest reward in the app. Assign this only to a student who has already finished Twenty-Five in Thirty — it is a summer, or a whole term, and starting it cold is how a student learns that quests are not finishable.',
    category: 'consistency', tier: 'mythic', metric: 'study_day',
    target: 45, windowDays: 56, dailyCap: 1, minActiveDays: 45,
    icon: 'Infinity', surfaces: ['home', 'prep', 'sat', 'portfolio', 'plans'], chain: 'habit_ladder', chainStep: 5, season: 'summer',
  },
  {
    id: 'consist_weekends',
    title: 'Weekends Count Too',
    blurb: 'Earn 6 weekend days inside 28 days.',
    proof: 'A Saturday or a Sunday that cleared the daily streak goal. Weekdays are invisible to this one.',
    why: 'Almost every broken streak in this product breaks on a Saturday. This is the quest that names the actual failure mode instead of asking for more of the days they already do.',
    category: 'consistency', tier: 'hard', metric: 'weekend_day',
    target: 6, windowDays: 28, dailyCap: 1, minActiveDays: 6,
    icon: 'Sun', surfaces: ['home', 'plans'], season: 'school',
  },
  {
    id: 'consist_perfect_days',
    title: 'Ten Double Days',
    blurb: 'Earn 10 days at double your daily goal, inside 28 days.',
    proof: 'A day counts only if it earned twice your daily streak goal — the goal you had that day, not the one you have now.',
    why: 'For the student whose streak is long but whose sessions have shrunk to the minimum that keeps it alive. It asks for depth rather than more days, and it is measured against their own goal rather than an absolute number.',
    category: 'consistency', tier: 'elite', metric: 'perfect_day',
    target: 10, windowDays: 28, dailyCap: 1, minActiveDays: 10,
    icon: 'Zap', surfaces: ['home', 'prep'], season: 'any',
  },
  {
    id: 'consist_plan_sprint',
    title: 'Two Weeks on Plan',
    blurb: 'Complete 12 plan tasks in 14 days, capped at 3 a day.',
    proof: 'Tasks from the Plans tab, ticked off or auto-verified by the work behind them.',
    why: 'The short version of Follow the Plan, and the one to start with. The plan already knows what they should do each day — this asks only that a fortnight of it actually happens.',
    category: 'consistency', tier: 'standard', metric: 'plan_task',
    target: 12, windowDays: 14, dailyCap: 3, minActiveDays: 5,
    icon: 'CalendarClock', surfaces: ['plans', 'home'], season: 'any',
  },
  {
    id: 'consist_plan_follow',
    title: 'Follow the Plan',
    blurb: 'Complete 30 plan tasks in 21 days, capped at 4 a day.',
    proof: 'Tasks from the Plans tab, ticked off or auto-verified by the work behind them.',
    why: 'The plan already knows what they should do each day. This quest is about actually doing it — and the cap means the plan gets followed daily rather than raided on Sunday.',
    category: 'consistency', tier: 'hard', metric: 'plan_task',
    target: 30, windowDays: 21, dailyCap: 4, minActiveDays: 10,
    icon: 'ClipboardCheck', surfaces: ['plans', 'home'], season: 'any',
  },

  // ── Curiosity ─────────────────────────────────────────────────────────────
  {
    id: 'explore_first_questions',
    title: 'Ask Five Questions',
    blurb: 'Ask Medabrain 5 questions in 7 days, capped at 2 a day.',
    proof: 'A question sent to Medabrain anywhere in the app — the coach, a lesson, the SAT tab.',
    why: 'Students who never ask the coach anything are the students who quietly stall on the first thing they do not understand. Five questions is enough to find out it answers properly.',
    category: 'exploration', tier: 'starter', metric: 'coach_session',
    target: 5, windowDays: 7, dailyCap: 2, minActiveDays: 3,
    icon: 'MessageCircleQuestion', surfaces: ['prep', 'home'], season: 'any',
  },
  {
    id: 'explore_coach_habit',
    title: 'The Asking Habit',
    blurb: 'Ask Medabrain 15 questions in 14 days, capped at 3 a day.',
    proof: 'Any question sent to Medabrain. The cap means this needs five separate days at least.',
    why: 'Asking for help is a learnable skill and most students are bad at it. Fifteen questions across a fortnight turns the coach from a novelty into the thing they reach for when they are stuck.',
    category: 'exploration', tier: 'standard', metric: 'coach_session',
    target: 15, windowDays: 14, dailyCap: 3, minActiveDays: 5,
    icon: 'Bot', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'explore_coach_deep',
    title: 'Interrogate Everything',
    blurb: 'Ask Medabrain 45 questions in 28 days, capped at 4 a day, across at least 12 days.',
    proof: 'Forty-five questions across twelve separate days. Four a day is the ceiling.',
    why: 'A month of treating the coach as a study partner rather than a search box. The daily cap is deliberate: it rewards a question a day for a month over forty questions in one confused evening.',
    category: 'exploration', tier: 'hard', metric: 'coach_session',
    target: 45, windowDays: 28, dailyCap: 4, minActiveDays: 12,
    icon: 'BrainCircuit', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'explore_notes',
    title: 'Write It Down',
    blurb: 'Save 15 notes or highlights in 21 days, capped at 2 a day.',
    proof: 'A saved lesson note or a highlighted passage. Opening the notes panel is not a note.',
    why: 'Note-taking is the single cheapest intervention in the whole of learning science and the one students skip first. Two a day is small enough that they will actually do it.',
    category: 'exploration', tier: 'standard', metric: 'note_written',
    target: 15, windowDays: 21, dailyCap: 2, minActiveDays: 8,
    icon: 'PenLine', surfaces: ['prep'], season: 'any',
  },
  {
    id: 'explore_deep_notes',
    title: 'The Annotated Pathway',
    blurb: 'Save 40 notes or highlights in 28 days, capped at 3 a day, across at least 14 days.',
    proof: 'Forty saved notes or highlighted passages across fourteen separate days.',
    why: 'By the end of this a student has an annotated version of their own pathway — which is both the best revision material they will ever have and the raw material Medabrain reads when they ask it about their own work.',
    category: 'exploration', tier: 'hard', metric: 'note_written',
    target: 40, windowDays: 28, dailyCap: 3, minActiveDays: 14,
    icon: 'Highlighter', surfaces: ['prep'], season: 'any',
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────
  {
    id: 'port_first_entries',
    title: 'Three Things You Did',
    blurb: 'Log 3 portfolio entries in 7 days — one a day, maximum.',
    proof: 'An activity, a research entry, a certification, or a clinical block — anything that goes on the résumé.',
    why: 'The first three are the hard ones, because a blank résumé screen is intimidating and a résumé with three rows on it is not. One a day for three days is how that wall gets cleared.',
    category: 'portfolio', tier: 'starter', metric: 'portfolio_entry',
    target: 3, windowDays: 7, dailyCap: 1, minActiveDays: 3,
    icon: 'Sparkles', surfaces: ['portfolio', 'home'], chain: 'record_ladder', chainStep: 1, season: 'any',
  },
  {
    id: 'port_build_record',
    title: 'Build the Record',
    blurb: 'Log 8 portfolio entries in 21 days, capped at 2 a day.',
    proof: 'An activity, a research entry, a certification, or a clinical block — anything that goes on the résumé.',
    why: 'Most students arrive at application season unable to remember what they did in Year 10. This is the quest that fixes that problem two years early.',
    category: 'portfolio', tier: 'standard', metric: 'portfolio_entry',
    target: 8, windowDays: 21, dailyCap: 2, minActiveDays: 4,
    icon: 'Award', surfaces: ['portfolio'], chain: 'record_ladder', chainStep: 2, season: 'any',
  },
  {
    id: 'port_clinical_start',
    title: 'First Twelve Hours',
    blurb: 'Log 12 clinical or shadowing hours in 21 days, capped at 4 a day.',
    proof: 'Hours logged in Activities & Résumé, in the clinical section.',
    why: 'Twelve hours is three afternoons. It is the version of clinical experience that a student with no contacts and no car can actually achieve, and finishing it is what makes fifty hours feel possible.',
    category: 'portfolio', tier: 'standard', metric: 'clinical_hour',
    target: 12, windowDays: 21, dailyCap: 4, minActiveDays: 3,
    icon: 'HeartPulse', surfaces: ['portfolio'], season: 'any',
  },
  {
    id: 'port_clinical_fifty',
    title: 'Fifty Hours on the Ground',
    blurb: 'Log 50 clinical or shadowing hours in 42 days, capped at 8 a day.',
    proof: 'Hours logged in Activities & Résumé, in the clinical section.',
    why: 'This one is mostly earned outside the app, which is the point — it is the quest that connects screen time to a hospital corridor. Fifty hours is the number admissions readers start taking seriously.',
    category: 'portfolio', tier: 'elite', metric: 'clinical_hour',
    target: 50, windowDays: 42, dailyCap: 8, minActiveDays: 8,
    icon: 'Stethoscope', surfaces: ['portfolio'], season: 'summer',
  },
  {
    id: 'port_clinical_legend',
    title: 'A Hundred and Fifty Hours',
    blurb: 'Log 150 clinical or shadowing hours in 42 days, capped at 8 a day, across at least 19 days.',
    proof: 'A hundred and fifty logged hours across nineteen separate days on site.',
    why: 'A serious summer placement, logged honestly. This is the number that stops being "some shadowing" and starts being the thing an interviewer asks about for ten minutes. Only assign it if a real placement exists.',
    category: 'portfolio', tier: 'legendary', metric: 'clinical_hour',
    target: 150, windowDays: 42, dailyCap: 8, minActiveDays: 19,
    icon: 'Building2', surfaces: ['portfolio'], season: 'summer',
  },
  {
    id: 'port_interview_drill',
    title: 'Interview Drill',
    blurb: 'Practise 6 mock interviews in 21 days — 1 a day, maximum.',
    proof: 'A mock interview answered end to end, including the ones that go badly.',
    why: 'Six separate days of speaking out loud. Interview nerves are a volume problem, and the one-per-day cap is what turns this into rehearsal instead of an afternoon.',
    category: 'portfolio', tier: 'hard', metric: 'interview_session',
    target: 6, windowDays: 21, dailyCap: 1, minActiveDays: 6,
    icon: 'Mic', surfaces: ['portfolio'], season: 'any',
  },
  {
    id: 'port_interview_marathon',
    title: 'Fifteen Sittings',
    blurb: 'Practise 15 mock interviews in 35 days — 1 a day, maximum.',
    proof: 'Fifteen interviews on fifteen separate days. There is no way to compress this one.',
    why: 'Fifteen separate days of being asked why medicine and having to answer out loud. Students who have done this walk into a real interview and find it familiar, which is the entire objective.',
    category: 'portfolio', tier: 'elite', metric: 'interview_session',
    target: 15, windowDays: 35, dailyCap: 1, minActiveDays: 15,
    icon: 'Users', surfaces: ['portfolio'], season: 'any',
  },
  {
    id: 'port_awards_ledger',
    title: 'The Awards Ledger',
    blurb: 'Log 5 awards or honours in 21 days — one a day, maximum.',
    proof: 'An award, honour, certification or placement added to the record.',
    why: 'Students systematically under-report their own achievements, and the ones they forget are the ones that were three years ago. One a day for five days recovers most of a résumé nobody was keeping.',
    category: 'portfolio', tier: 'standard', metric: 'award_logged',
    target: 5, windowDays: 21, dailyCap: 1, minActiveDays: 5,
    icon: 'Trophy', surfaces: ['portfolio'], season: 'any',
  },
  {
    id: 'port_opportunity_hunt',
    title: 'The Opportunity Hunt',
    blurb: 'Track 10 programs, competitions or scholarships in 14 days, capped at 3 a day.',
    proof: 'Anything tracked from the Opportunities or Scholarships databases.',
    why: 'Cheap, fast, and the highest-leverage hour a rising junior can spend. Deadlines they never found are the applications they never made.',
    category: 'portfolio', tier: 'standard', metric: 'opportunity_track',
    target: 10, windowDays: 14, dailyCap: 3, minActiveDays: 4,
    icon: 'Compass', surfaces: ['portfolio'], season: 'any',
  },

  // ── Application ───────────────────────────────────────────────────────────
  {
    id: 'app_college_list',
    title: 'Ten Colleges',
    blurb: 'Add 10 colleges to your list in 14 days, capped at 3 a day.',
    proof: 'A college saved to your list. Browsing the database is not saving.',
    why: 'A named list — reach, match and safety — is what turns "I want to do medicine" into a plan with numbers attached. Ten is enough to have a shape; three a day is enough to make them think about each one.',
    category: 'application', tier: 'standard', metric: 'college_saved',
    target: 10, windowDays: 14, dailyCap: 3, minActiveDays: 4,
    icon: 'School', surfaces: ['portfolio'], chain: 'record_ladder', chainStep: 3, season: 'any',
  },
  {
    id: 'app_scholarship_sweep',
    title: 'The Money Sweep',
    blurb: 'Track 15 scholarships in 21 days, capped at 3 a day.',
    proof: 'A scholarship saved to the tracker from the database or added by hand.',
    why: 'The highest hourly rate a high schooler will ever earn. Fifteen tracked scholarships is a few thousand dollars of expected value for a few hours of work, and the deadlines are the whole reason to do it early.',
    category: 'application', tier: 'hard', metric: 'scholarship_track',
    target: 15, windowDays: 21, dailyCap: 3, minActiveDays: 6,
    icon: 'Banknote', surfaces: ['portfolio'], chain: 'record_ladder', chainStep: 4, season: 'any',
  },
  {
    id: 'app_essay_sprint',
    title: 'Five Sittings',
    blurb: 'Work on 5 essay drafts in 14 days — one a day, maximum.',
    proof: 'A draft saved with real changes in it. Opening the editor is not a draft.',
    why: 'The starter version of the essay work. Five separate sittings is the smallest number that produces something recognisable as a draft, and the one-a-day cap is what stops it being one panicked evening.',
    category: 'application', tier: 'standard', metric: 'essay_work',
    target: 5, windowDays: 14, dailyCap: 1, minActiveDays: 5,
    icon: 'PenTool', surfaces: ['portfolio'], season: 'any',
  },
  {
    id: 'port_essay_push',
    title: 'The Essay Push',
    blurb: 'Work on 12 essay drafts in 28 days, capped at 2 a day.',
    proof: 'A draft saved with real changes in it. Opening the editor is not a draft.',
    why: 'Essays are written by people who sit down twelve times, not by people who sit down once. Assign this the summer before applications.',
    category: 'application', tier: 'hard', metric: 'essay_work',
    target: 12, windowDays: 28, dailyCap: 2, minActiveDays: 8,
    icon: 'ScrollText', surfaces: ['portfolio'], season: 'summer',
  },
  {
    id: 'app_essay_legend',
    title: 'The Finished Essay',
    blurb: 'Work on 30 essay drafts in 42 days, capped at 2 a day, across at least 20 days.',
    proof: 'Thirty saved drafts with real changes, across twenty separate days.',
    why: 'Six weeks of near-daily writing is what an essay that reads like a person actually costs. Assign it once, the summer before applications, and nothing else at the same time.',
    category: 'application', tier: 'legendary', metric: 'essay_work',
    target: 30, windowDays: 42, dailyCap: 2, minActiveDays: 20,
    icon: 'FileCheck2', surfaces: ['portfolio'], season: 'summer',
  },
  {
    id: 'app_recommenders',
    title: 'Line Up Your Letters',
    blurb: 'Add 3 recommenders to the letter tracker in 21 days — one a day, maximum.',
    proof: 'A recommender added to the tracker, with who they are and what they would say about you.',
    why: 'Letters are the part of an application a student cannot write and cannot rush, and the part they leave until October. Three names on a list in the spring is the whole intervention.',
    category: 'application', tier: 'standard', metric: 'recommender_ask',
    target: 3, windowDays: 21, dailyCap: 1, minActiveDays: 3,
    icon: 'MailCheck', surfaces: ['portfolio'], season: 'school',
  },
  {
    id: 'app_season_mythic',
    title: 'The Application Season',
    blurb: 'Log 40 portfolio entries in 56 days, capped at 2 a day, across at least 25 days.',
    proof: 'Forty résumé rows — activities, research, skills, clinical blocks — over twenty-five separate days.',
    why: 'Eight weeks of building the record properly, and the top of the ladder. A student who finishes this walks into application season with the one thing nobody can produce in a hurry: a complete, dated, honest account of what they actually did.',
    category: 'application', tier: 'mythic', metric: 'portfolio_entry',
    target: 40, windowDays: 56, dailyCap: 2, minActiveDays: 25,
    icon: 'Crown', surfaces: ['portfolio', 'home'], chain: 'record_ladder', chainStep: 5, season: 'summer',
  },
];

/** Fast lookup by id — the shape every consumer actually wants. */
export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** The XP a quest pays, from its tier. Never stored on the quest itself, so a
 *  tier re-price is one edit rather than sixty. */
export const questXP = (quest) => QUEST_TIERS[quest?.tier]?.xp || 0;

/** The accent a quest carries everywhere it is drawn (category, not tier — the
 *  tier is the size of the reward, the category is what the work IS). */
export const questColor = (quest) => QUEST_CATEGORIES[quest?.category]?.color || '#3b82f6';

export const getQuest = (id) => QUEST_BY_ID[id] || null;

/** Every quest in a category, easiest first — the order both pickers render in. */
export function questsInCategory(categoryId) {
  return QUESTS
    .filter((q) => q.category === categoryId)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
}

/** Every quest whose strip belongs on a given app surface ('prep', 'sat', …). */
export function questsForSurface(surface) {
  return QUESTS.filter((q) => q.surfaces.includes(surface));
}

/** The chain a quest belongs to, resolved to its full definition, or null. */
export function chainFor(questId) {
  const quest = getQuest(questId);
  if (!quest?.chain) return null;
  const chain = QUEST_CHAINS[quest.chain];
  if (!chain) return null;
  return { ...chain, step: quest.chainStep || (chain.steps.indexOf(questId) + 1), of: chain.steps.length };
}

/**
 * The next rung after `questId`, or null at the top of the ladder.
 *
 * This is what the completion takeover offers the moment a quest is claimed —
 * the highest-intent second a student ever has with this system, and the only
 * moment where "one more" is a genuinely welcome suggestion rather than a nag.
 */
export function nextInChain(questId) {
  const quest = getQuest(questId);
  const chain = quest?.chain ? QUEST_CHAINS[quest.chain] : null;
  if (!chain) return null;
  const i = chain.steps.indexOf(questId);
  if (i === -1 || i === chain.steps.length - 1) return null;
  return getQuest(chain.steps[i + 1]);
}

/** Every quest in a chain, in order, with the catalog entry resolved. */
export function chainQuests(chainId) {
  const chain = QUEST_CHAINS[chainId];
  if (!chain) return [];
  return chain.steps.map(getQuest).filter(Boolean);
}
