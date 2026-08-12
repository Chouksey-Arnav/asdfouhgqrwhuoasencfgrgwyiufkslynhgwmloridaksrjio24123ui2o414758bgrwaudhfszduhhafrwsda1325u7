// The server's copy of the quest catalog — the authority on what a quest costs and what it pays.
//
// ── Why this is a copy rather than an import ────────────────────────────────
// /api is a serverless bundle; src/ is a browser bundle Vite compiles. Nothing under /api may
// import from src/ (the same reason api/parent/messages.js keeps its own TOPICS list). So the
// numbers live twice, and scripts/verifyQuests.mjs — which runs in `npm run build` — fails the
// build the moment the two disagree on any field of any quest.
//
// ── Why the server needs them at all ────────────────────────────────────────
// A quest row is written from a request. If the request supplied the XP, the target and the
// window, then "assign me a quest worth 50,000 XP with a target of 1" would be a supported
// operation. Everything below is looked up by `quest_id` and nothing numeric is ever read off the
// request body — see assignableSpec(). The client's copy exists to render cards; this one exists
// to decide what gets written and what gets paid.
//
// Only the fields that must be authoritative are mirrored. Copy — titles aside — blurbs,
// rationales, icons and colours stay in src/data/questCatalog.js alone, because they change often
// and none of them can cost anybody anything.

/** XP per tier. Mirrors QUEST_TIERS in src/data/questCatalog.js. */
export const TIER_XP = {
  starter: 75,
  standard: 200,
  hard: 500,
  elite: 1000,
  legendary: 2000,
  mythic: 3500,
};

/**
 * id → the enforceable shape of the quest.
 * Mirrors QUESTS in src/data/questCatalog.js, field for field, for these fields.
 */
export const QUEST_SPECS = {
  // ── Pathway ───────────────────────────────────────────────────────────────
  path_warmup:           { title: 'Three Lessons, Verified',   tier: 'starter',   metric: 'lesson_verified',   target: 3,   windowDays: 5,  dailyCap: 1,  minActiveDays: 3 },
  path_first_unit:       { title: 'Finish a Unit, Properly',   tier: 'standard',  metric: 'lesson_verified',   target: 5,   windowDays: 10, dailyCap: 2,  minActiveDays: 3 },
  path_steady_dozen:     { title: 'The Steady Dozen',          tier: 'hard',      metric: 'lesson_verified',   target: 12,  windowDays: 21, dailyCap: 2,  minActiveDays: 7 },
  path_crucible:         { title: 'Pathway Crucible',          tier: 'elite',     metric: 'lesson_verified',   target: 24,  windowDays: 28, dailyCap: 3,  minActiveDays: 14 },
  path_legend:           { title: 'Finish the Track',          tier: 'legendary', metric: 'lesson_verified',   target: 50,  windowDays: 42, dailyCap: 3,  minActiveDays: 25 },
  path_unit_master:      { title: 'Three Units Mastered',      tier: 'hard',      metric: 'unit_verified',     target: 3,   windowDays: 21, dailyCap: 1,  minActiveDays: 3 },
  path_flawless:         { title: 'Five Flawless Lessons',     tier: 'elite',     metric: 'lesson_perfect',    target: 5,   windowDays: 21, dailyCap: 1,  minActiveDays: 5 },
  path_wide_read:        { title: 'The Wide Read',             tier: 'hard',      metric: 'lesson_studied',    target: 20,  windowDays: 21, dailyCap: 2,  minActiveDays: 10 },

  // ── SAT ───────────────────────────────────────────────────────────────────
  sat_warmup:            { title: 'Thirty to Start',           tier: 'starter',   metric: 'sat_question',      target: 30,  windowDays: 7,  dailyCap: 10, minActiveDays: 3 },
  sat_first_hundred:     { title: 'First Hundred',             tier: 'standard',  metric: 'sat_question',      target: 100, windowDays: 14, dailyCap: 25, minActiveDays: 4 },
  sat_accuracy_drive:    { title: 'Two Hundred and Fifty Right', tier: 'hard',    metric: 'sat_correct',       target: 250, windowDays: 21, dailyCap: 20, minActiveDays: 13 },
  sat_grind:             { title: 'The Question Grind',        tier: 'elite',     metric: 'sat_question',      target: 400, windowDays: 28, dailyCap: 40, minActiveDays: 12 },
  sat_legend:            { title: 'Test-Season Siege',         tier: 'legendary', metric: 'sat_question',      target: 900, windowDays: 42, dailyCap: 50, minActiveDays: 24 },
  sat_three_tests:       { title: 'Three Under Timing',        tier: 'elite',     metric: 'sat_full_test',     target: 3,   windowDays: 28, dailyCap: 1,  minActiveDays: 3 },
  sat_review_habit:      { title: 'The Review Habit',          tier: 'standard',  metric: 'sat_review_clear',  target: 12,  windowDays: 14, dailyCap: 2,  minActiveDays: 6 },
  sat_clear_the_log:     { title: 'Clear the Review Log',      tier: 'hard',      metric: 'sat_review_clear',  target: 30,  windowDays: 21, dailyCap: 6,  minActiveDays: 6 },
  sat_marathon_month:    { title: 'Six Hundred Right',         tier: 'legendary', metric: 'sat_correct',       target: 600, windowDays: 42, dailyCap: 30, minActiveDays: 22 },

  // ── Retention ─────────────────────────────────────────────────────────────
  flash_warmup:          { title: 'Sixty Cards',               tier: 'starter',   metric: 'flashcard_review',  target: 60,  windowDays: 7,  dailyCap: 15, minActiveDays: 4 },
  flash_fortnight:       { title: 'Fourteen Days of Cards',    tier: 'standard',  metric: 'flashcard_review',  target: 200, windowDays: 14, dailyCap: 25, minActiveDays: 8 },
  flash_century_club:    { title: 'The Century Club',          tier: 'hard',      metric: 'flashcard_review',  target: 350, windowDays: 21, dailyCap: 25, minActiveDays: 14 },
  flash_marathon:        { title: 'Retention Marathon',        tier: 'elite',     metric: 'flashcard_review',  target: 600, windowDays: 30, dailyCap: 35, minActiveDays: 18 },
  quiz_dozen:            { title: 'Twelve Quizzes',            tier: 'standard',  metric: 'quiz_completed',    target: 12,  windowDays: 14, dailyCap: 3,  minActiveDays: 5 },
  quiz_thirty:           { title: 'Thirty in a Month',         tier: 'hard',      metric: 'quiz_completed',    target: 30,  windowDays: 28, dailyCap: 3,  minActiveDays: 12 },
  deck_builder:          { title: 'Build Your Own Decks',      tier: 'standard',  metric: 'deck_created',      target: 3,   windowDays: 14, dailyCap: 1,  minActiveDays: 3 },

  // ── Mastery ───────────────────────────────────────────────────────────────
  mastery_strong_start:  { title: 'Five Strong Scores',        tier: 'standard',  metric: 'quiz_strong',       target: 5,   windowDays: 14, dailyCap: 1,  minActiveDays: 5 },
  mastery_strong_ten:    { title: 'Ten Strong Scores',         tier: 'hard',      metric: 'quiz_strong',       target: 10,  windowDays: 21, dailyCap: 2,  minActiveDays: 6 },
  mastery_perfect_five:  { title: 'Five Perfect Runs',         tier: 'elite',     metric: 'quiz_perfect',      target: 5,   windowDays: 21, dailyCap: 1,  minActiveDays: 5 },
  mastery_relentless:    { title: 'Relentless',                tier: 'legendary', metric: 'quiz_strong',       target: 30,  windowDays: 42, dailyCap: 2,  minActiveDays: 20 },

  // ── Consistency ───────────────────────────────────────────────────────────
  consist_warmup:        { title: 'Three Days Straight',       tier: 'starter',   metric: 'study_day',         target: 3,   windowDays: 5,  dailyCap: 1,  minActiveDays: 3 },
  consist_first_week:    { title: 'The First Seven',           tier: 'standard',  metric: 'study_day',         target: 5,   windowDays: 7,  dailyCap: 1,  minActiveDays: 5 },
  consist_ten_days:      { title: 'Ten Earned Days',           tier: 'hard',      metric: 'study_day',         target: 10,  windowDays: 14, dailyCap: 1,  minActiveDays: 10 },
  consist_month:         { title: 'Twenty-Five in Thirty',     tier: 'legendary', metric: 'study_day',         target: 25,  windowDays: 30, dailyCap: 1,  minActiveDays: 25 },
  consist_mythic_season: { title: 'The Season',                tier: 'mythic',    metric: 'study_day',         target: 45,  windowDays: 56, dailyCap: 1,  minActiveDays: 45 },
  consist_weekends:      { title: 'Weekends Count Too',        tier: 'hard',      metric: 'weekend_day',       target: 6,   windowDays: 28, dailyCap: 1,  minActiveDays: 6 },
  consist_perfect_days:  { title: 'Ten Double Days',           tier: 'elite',     metric: 'perfect_day',       target: 10,  windowDays: 28, dailyCap: 1,  minActiveDays: 10 },
  consist_plan_sprint:   { title: 'Two Weeks on Plan',         tier: 'standard',  metric: 'plan_task',         target: 12,  windowDays: 14, dailyCap: 3,  minActiveDays: 5 },
  consist_plan_follow:   { title: 'Follow the Plan',           tier: 'hard',      metric: 'plan_task',         target: 30,  windowDays: 21, dailyCap: 4,  minActiveDays: 10 },

  // ── Curiosity ─────────────────────────────────────────────────────────────
  explore_first_questions: { title: 'Ask Five Questions',      tier: 'starter',   metric: 'coach_session',     target: 5,   windowDays: 7,  dailyCap: 2,  minActiveDays: 3 },
  explore_coach_habit:   { title: 'The Asking Habit',          tier: 'standard',  metric: 'coach_session',     target: 15,  windowDays: 14, dailyCap: 3,  minActiveDays: 5 },
  explore_coach_deep:    { title: 'Interrogate Everything',    tier: 'hard',      metric: 'coach_session',     target: 45,  windowDays: 28, dailyCap: 4,  minActiveDays: 12 },
  explore_notes:         { title: 'Write It Down',             tier: 'standard',  metric: 'note_written',      target: 15,  windowDays: 21, dailyCap: 2,  minActiveDays: 8 },
  explore_deep_notes:    { title: 'The Annotated Pathway',     tier: 'hard',      metric: 'note_written',      target: 40,  windowDays: 28, dailyCap: 3,  minActiveDays: 14 },

  // ── Portfolio ─────────────────────────────────────────────────────────────
  port_first_entries:    { title: 'Three Things You Did',      tier: 'starter',   metric: 'portfolio_entry',   target: 3,   windowDays: 7,  dailyCap: 1,  minActiveDays: 3 },
  port_build_record:     { title: 'Build the Record',          tier: 'standard',  metric: 'portfolio_entry',   target: 8,   windowDays: 21, dailyCap: 2,  minActiveDays: 4 },
  port_clinical_start:   { title: 'First Twelve Hours',        tier: 'standard',  metric: 'clinical_hour',     target: 12,  windowDays: 21, dailyCap: 4,  minActiveDays: 3 },
  port_clinical_fifty:   { title: 'Fifty Hours on the Ground', tier: 'elite',     metric: 'clinical_hour',     target: 50,  windowDays: 42, dailyCap: 8,  minActiveDays: 8 },
  port_clinical_legend:  { title: 'A Hundred and Fifty Hours', tier: 'legendary', metric: 'clinical_hour',     target: 150, windowDays: 42, dailyCap: 8,  minActiveDays: 19 },
  port_interview_drill:  { title: 'Interview Drill',           tier: 'hard',      metric: 'interview_session', target: 6,   windowDays: 21, dailyCap: 1,  minActiveDays: 6 },
  port_interview_marathon:{ title: 'Fifteen Sittings',         tier: 'elite',     metric: 'interview_session', target: 15,  windowDays: 35, dailyCap: 1,  minActiveDays: 15 },
  port_awards_ledger:    { title: 'The Awards Ledger',         tier: 'standard',  metric: 'award_logged',      target: 5,   windowDays: 21, dailyCap: 1,  minActiveDays: 5 },
  port_opportunity_hunt: { title: 'The Opportunity Hunt',      tier: 'standard',  metric: 'opportunity_track', target: 10,  windowDays: 14, dailyCap: 3,  minActiveDays: 4 },

  // ── Application ───────────────────────────────────────────────────────────
  app_college_list:      { title: 'Ten Colleges',              tier: 'standard',  metric: 'college_saved',     target: 10,  windowDays: 14, dailyCap: 3,  minActiveDays: 4 },
  app_scholarship_sweep: { title: 'The Money Sweep',           tier: 'hard',      metric: 'scholarship_track', target: 15,  windowDays: 21, dailyCap: 3,  minActiveDays: 6 },
  app_essay_sprint:      { title: 'Five Sittings',             tier: 'standard',  metric: 'essay_work',        target: 5,   windowDays: 14, dailyCap: 1,  minActiveDays: 5 },
  port_essay_push:       { title: 'The Essay Push',            tier: 'hard',      metric: 'essay_work',        target: 12,  windowDays: 28, dailyCap: 2,  minActiveDays: 8 },
  app_essay_legend:      { title: 'The Finished Essay',        tier: 'legendary', metric: 'essay_work',        target: 30,  windowDays: 42, dailyCap: 2,  minActiveDays: 20 },
  app_recommenders:      { title: 'Line Up Your Letters',      tier: 'standard',  metric: 'recommender_ask',   target: 3,   windowDays: 21, dailyCap: 1,  minActiveDays: 3 },
  app_season_mythic:     { title: 'The Application Season',    tier: 'mythic',    metric: 'portfolio_entry',   target: 40,  windowDays: 56, dailyCap: 2,  minActiveDays: 25 },
};

export const QUEST_IDS = Object.keys(QUEST_SPECS);

export const isKnownQuest = (id) => Object.prototype.hasOwnProperty.call(QUEST_SPECS, String(id || ''));

/**
 * The row a quest id may be written as. Every numeric column of student_quests comes from here
 * and from nowhere else — this function IS the allowlist referenced in migration 0014's header.
 *
 * Returns null for an id the server does not know, which the handler turns into a 400. An unknown
 * id is not a quest from the future; it is a client that has been edited.
 */
export function assignableSpec(questId) {
  const id = String(questId || '');
  const spec = QUEST_SPECS[id];
  if (!spec) return null;
  return {
    quest_id: id,
    title: spec.title,
    tier: spec.tier,
    metric: spec.metric,
    xp: TIER_XP[spec.tier] || 0,
    target: spec.target,
    window_days: spec.windowDays,
    daily_cap: spec.dailyCap,
    min_active_days: spec.minActiveDays,
  };
}

/**
 * The fewest calendar days a quest can be finished in — the honest cost, mirrored from
 * minimumDays() in src/lib/quests.js. Returned to the parent's picker so an assignment's real
 * length is visible before they commit their child to it.
 */
export function minimumDays(questId) {
  const spec = QUEST_SPECS[String(questId || '')];
  if (!spec) return 1;
  return Math.max(Math.ceil(spec.target / Math.max(1, spec.dailyCap)), spec.minActiveDays, 1);
}

/**
 * Is a reported progress figure enough to finish this quest?
 *
 * Both halves are checked, because the active-day floor is the entire anti-cramming mechanism and
 * a completion check that ignored it would make every daily cap in the catalog decorative.
 */
export function meetsCompletion(row) {
  if (!row) return false;
  const target = Number(row.target) || 0;
  const minDays = Number(row.min_active_days) || 0;
  return Number(row.progress) >= target && Number(row.active_days) >= minDays;
}
