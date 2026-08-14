// ─────────────────────────────────────────────────────────────────────────────
// The daily quest pool — three small jobs, chosen fresh every morning, gone by
// midnight.
//
// ── Why this exists alongside the long quests ───────────────────────────────
// src/data/questCatalog.js is the commitment layer: one to eight weeks, hundreds
// of units of work, thousands of XP. It is the right shape for the student who
// has already decided to take this seriously, and completely the wrong shape for
// the question a fifteen-year-old actually asks at 7pm on a Tuesday, which is
// "is it worth opening this right now".
//
// A daily quest answers that question in one line, is finishable in ten to
// twenty-five minutes, and is worth enough XP to be felt. Three of them appear
// each morning, they expire at midnight, and clearing all three pays a bonus and
// opens a chest.
//
// ── Why they rotate rather than being fixed ─────────────────────────────────
// The weekly quest set this replaces was three fixed items ("3 quizzes, 15
// flashcards, 2 coach chats") which every motivated student cleared in one
// sitting on Tuesday and then had nothing to come back for until the following
// Monday. The pool below is deliberately large and the daily draw is
// deterministic per student per day (see src/lib/dailyQuests.js): today's set is
// stable no matter how many times the app is reloaded or which device it is
// opened on, and tomorrow's set is genuinely different. Variety is the entire
// mechanism — a list you have seen fifty times stops being read.
//
// ── Why they cannot be crammed either ───────────────────────────────────────
// They can, and that is fine. A daily quest is one day long by construction, so
// there is no anti-cramming problem to solve: the cap IS the day. What they must
// not do is be satisfiable by something that is not work, which is why every
// metric here is one of the QUEST_METRICS the long quests already use, produced
// by the same evidence pipeline. There is no daily-quest-specific telemetry, and
// nothing here counts an app open.
//
// ── The tiers ──────────────────────────────────────────────────────────────
// Exactly one of each is drawn per day, which guarantees the shape of the set:
// something you can finish on a bus, something that is a real session, and
// something you have to decide to do.
//
//   bronze   5-10 minutes.  A single small action.  20 XP
//   silver   15-25 minutes. One real study block.   45 XP
//   gold     30-45 minutes. A deliberate sitting.   90 XP
//
// Clearing all three pays DAILY_SET_BONUS on top, which is more than the gold
// quest — because the point of the set is the set.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tiers, and what one of each is worth.
 *
 * The XP is deliberately in the same order of magnitude as a lesson (which pays
 * low tens) rather than as a long quest (which pays hundreds). A daily quest
 * that paid like a long quest would make the commitment layer pointless, and a
 * daily quest that paid like nothing would not be read.
 */
export const DAILY_TIERS = {
  bronze: { id: 'bronze', label: 'Quick', xp: 20, color: '#f59e0b', minutes: '5–10 min' },
  silver: { id: 'silver', label: 'Session', xp: 45, color: '#94a3b8', minutes: '15–25 min' },
  gold:   { id: 'gold',   label: 'Push',   xp: 90, color: '#fbbf24', minutes: '30–45 min' },
};

export const DAILY_TIER_ORDER = ['bronze', 'silver', 'gold'];

/** Paid on top for clearing all three. Larger than the gold quest on purpose. */
export const DAILY_SET_BONUS = { xp: 120, label: 'Clean Sweep' };

/**
 * Requirements a daily quest can carry, so the draw never hands a student a job
 * they have no way to do.
 *
 * This is the difference between a daily quest system that feels personal and
 * one that feels random: offering "review ten cards" to a student with no decks
 * is not a challenge, it is a bug they have to ignore, and a set with one
 * ignorable item in it is a set nobody clears.
 *
 *   portfolio  the portfolio tab has been used
 *   plan       a study plan exists
 *   decks      at least one deck with cards in it
 *   pathway    a pathway is enrolled
 */
export const DAILY_REQUIREMENTS = ['portfolio', 'plan', 'decks', 'pathway'];

/**
 * One daily quest template.
 *
 * @typedef {object} DailyQuest
 * @property {string} id        stable; the claim key is built from it
 * @property {string} title     imperative, and specific enough to act on without reading more
 * @property {string} blurb     the one line under it
 * @property {string} tier      key of DAILY_TIERS
 * @property {string} metric    key of QUEST_METRICS — the same pipeline as long quests
 * @property {number} target    units required TODAY
 * @property {string} icon      lucide-react component name
 * @property {string} surface   which tab this is earned on, for the "go" button
 * @property {string} [requires] key of DAILY_REQUIREMENTS
 */
export const DAILY_QUESTS = [
  // ── Bronze: five to ten minutes ───────────────────────────────────────────
  { id: 'd_quiz_one',       tier: 'bronze', metric: 'quiz_completed',   target: 1,  icon: 'ListChecks',      surface: 'prep',
    title: 'Take one quiz',           blurb: 'Any quiz, any score. Five minutes and today has something in it.' },
  { id: 'd_cards_ten',      tier: 'bronze', metric: 'flashcard_review', target: 10, icon: 'Layers3',         surface: 'prep', requires: 'decks',
    title: 'Review 10 cards',         blurb: 'Ten cards is one bus ride, and it is genuinely how memory works.' },
  { id: 'd_lesson_read',    tier: 'bronze', metric: 'lesson_studied',   target: 1,  icon: 'BookOpen',        surface: 'prep', requires: 'pathway',
    title: 'Read one lesson',         blurb: 'Article and video. The quiz can wait for tomorrow.' },
  { id: 'd_note_one',       tier: 'bronze', metric: 'note_written',     target: 1,  icon: 'PenLine',         surface: 'prep',
    title: 'Write one note',          blurb: 'One sentence you want to remember, or one highlighted line.' },
  { id: 'd_coach_one',      tier: 'bronze', metric: 'coach_session',    target: 1,  icon: 'MessageCircle',   surface: 'prep',
    title: 'Ask Medabrain something', blurb: 'Anything you did not follow today. That is what it is for.' },
  { id: 'd_plan_one',       tier: 'bronze', metric: 'plan_task',        target: 1,  icon: 'CheckSquare',     surface: 'plans', requires: 'plan',
    title: 'Clear one plan task',     blurb: "The plan already picked it. You just have to do it." },
  { id: 'd_portfolio_one',  tier: 'bronze', metric: 'portfolio_entry',  target: 1,  icon: 'FilePlus2',       surface: 'portfolio',
    title: 'Log one thing you did',   blurb: 'A club, a shift, a competition. Two minutes now, remembered forever.' },
  { id: 'd_track_one',      tier: 'bronze', metric: 'opportunity_track',target: 1,  icon: 'Bookmark',        surface: 'portfolio',
    title: 'Track one opportunity',   blurb: 'One program, competition or scholarship saved before its deadline finds you.' },
  { id: 'd_college_one',    tier: 'bronze', metric: 'college_saved',    target: 1,  icon: 'School',          surface: 'portfolio',
    title: 'Add a college',           blurb: 'One school to the list. Reach, match or safety — all three count.' },

  // ── Silver: one real study block ──────────────────────────────────────────
  { id: 'd_lesson_verify',  tier: 'silver', metric: 'lesson_verified',  target: 1,  icon: 'BadgeCheck',      surface: 'prep', requires: 'pathway',
    title: 'Verify a lesson',         blurb: 'Read it, watch it, pass the quiz. This one also clears your streak day.' },
  { id: 'd_quiz_two',       tier: 'silver', metric: 'quiz_completed',   target: 2,  icon: 'ListTodo',        surface: 'prep',
    title: 'Take two quizzes',        blurb: 'Two quizzes is the other way to clear a Steady streak day.' },
  { id: 'd_cards_25',       tier: 'silver', metric: 'flashcard_review', target: 25, icon: 'Layers',          surface: 'prep', requires: 'decks',
    title: 'Review 25 cards',         blurb: 'A proper deck session. Long enough that the scheduler learns something.' },
  { id: 'd_notes_three',    tier: 'silver', metric: 'note_written',     target: 3,  icon: 'Highlighter',     surface: 'prep',
    title: 'Three notes or highlights',blurb: 'Three things worth keeping out of whatever you read today.' },
  { id: 'd_coach_three',    tier: 'silver', metric: 'coach_session',    target: 3,  icon: 'Bot',             surface: 'prep',
    title: 'Ask three questions',     blurb: 'Push on something until you actually understand it.' },
  { id: 'd_plan_three',     tier: 'silver', metric: 'plan_task',        target: 3,  icon: 'CalendarCheck',   surface: 'plans', requires: 'plan',
    title: "Finish today's plan",     blurb: 'Three tasks off the plan. Most days that is the whole plan.' },
  { id: 'd_quiz_strong',    tier: 'silver', metric: 'quiz_strong',      target: 1,  icon: 'ChevronsUp',      surface: 'prep',
    title: 'Score 80% on a quiz',     blurb: 'Not just a quiz — a quiz you actually cleared.' },
  { id: 'd_interview_one',  tier: 'silver', metric: 'interview_session',target: 1,  icon: 'Mic',             surface: 'portfolio', requires: 'portfolio',
    title: 'Practise one interview',  blurb: 'One question, answered out loud. It gets easier only this way.' },
  { id: 'd_essay_one',      tier: 'silver', metric: 'essay_work',       target: 1,  icon: 'PenTool',         surface: 'portfolio', requires: 'portfolio',
    title: 'Work on an essay',        blurb: 'One sitting with real changes saved. Not a reread.' },
  { id: 'd_college_two',    tier: 'silver', metric: 'college_saved',    target: 2,  icon: 'GraduationCap',   surface: 'portfolio',
    title: 'Add two colleges',        blurb: 'Two more schools on the list, with the numbers attached.' },
  { id: 'd_track_three',    tier: 'silver', metric: 'opportunity_track',target: 3,  icon: 'Compass',         surface: 'portfolio',
    title: 'Track three programs',    blurb: 'Twenty minutes of hunting now is an application you would not have made.' },
  { id: 'd_deck_build',     tier: 'silver', metric: 'deck_created',     target: 1,  icon: 'FolderPlus',      surface: 'prep',
    title: 'Build a deck',            blurb: 'Make cards from your own notes. Writing them is most of the learning.' },
  { id: 'd_entries_two',    tier: 'silver', metric: 'portfolio_entry',  target: 2,  icon: 'Award',           surface: 'portfolio',
    title: 'Log two entries',         blurb: 'Two more rows on the record you will be very glad exists.' },

  // ── Gold: a deliberate sitting ────────────────────────────────────────────
  { id: 'd_lesson_two',     tier: 'gold',   metric: 'lesson_verified',  target: 2,  icon: 'Route',           surface: 'prep', requires: 'pathway',
    title: 'Verify two lessons',      blurb: 'Two properly finished lessons. This is a real evening of work.' },
  { id: 'd_quiz_perfect',   tier: 'gold',   metric: 'quiz_perfect',     target: 1,  icon: 'Star',            surface: 'prep',
    title: 'Score 100% on a quiz',    blurb: 'A clean sweep. Retakes count — going back and fixing it is the point.' },
  { id: 'd_cards_50',       tier: 'gold',   metric: 'flashcard_review', target: 50, icon: 'Brain',           surface: 'prep', requires: 'decks',
    title: 'Review 50 cards',         blurb: 'A serious recall session. Split it across the day if you want.' },
  { id: 'd_quiz_strong_two',tier: 'gold',   metric: 'quiz_strong',      target: 2,  icon: 'TrendingUp',      surface: 'prep',
    title: 'Two quizzes at 80%+',     blurb: 'Two clean passes in one day. Volume plus standard.' },
  { id: 'd_lesson_ace',     tier: 'gold',   metric: 'lesson_perfect',   target: 1,  icon: 'Medal',           surface: 'prep', requires: 'pathway',
    title: 'Ace a lesson',            blurb: '100% on a lesson verification quiz. Read it properly first.' },
  { id: 'd_clinical_four',  tier: 'gold',   metric: 'clinical_hour',    target: 4,  icon: 'Stethoscope',     surface: 'portfolio', requires: 'portfolio',
    title: 'Log four clinical hours', blurb: 'An afternoon on site, logged the same day so the details are still real.' },
  { id: 'd_essay_two',      tier: 'gold',   metric: 'essay_work',       target: 2,  icon: 'FileCheck2',      surface: 'portfolio', requires: 'portfolio',
    title: 'Two essay sittings',      blurb: 'Two real passes at a draft in one day. This is how essays get finished.' },
  { id: 'd_plan_five',      tier: 'gold',   metric: 'plan_task',        target: 5,  icon: 'CalendarClock',   surface: 'plans', requires: 'plan',
    title: 'Five plan tasks',         blurb: 'Today and a bite out of tomorrow. Getting ahead is allowed.' },
  { id: 'd_unit_master',    tier: 'gold',   metric: 'unit_verified',    target: 1,  icon: 'Boxes',           surface: 'prep', requires: 'pathway',
    title: 'Master a unit',           blurb: 'Every lesson in a unit verified and the unit quiz passed. A real milestone.' },
  { id: 'd_scholar_three',  tier: 'gold',   metric: 'scholarship_track',target: 3,  icon: 'Banknote',        surface: 'portfolio',
    title: 'Track three scholarships',blurb: 'The highest hourly rate you will ever earn. Genuinely.' },
];

export const DAILY_BY_ID = Object.fromEntries(DAILY_QUESTS.map((q) => [q.id, q]));

export const getDailyQuest = (id) => DAILY_BY_ID[id] || null;

/** The XP a daily quest pays, from its tier. */
export const dailyXP = (quest) => DAILY_TIERS[quest?.tier]?.xp || 0;

/** Every daily quest of a tier. The draw picks one from each. */
export const dailyByTier = (tier) => DAILY_QUESTS.filter((q) => q.tier === tier);
