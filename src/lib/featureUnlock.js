// Progressive feature unlocking — which parts of the app a student can see yet.
//
// The problem this solves, in the words of the adult who tested it: "I couldn't
// grasp where to go." On first launch the app put seven top-level tabs and
// thirty-one sub-tabs in front of someone who had done nothing yet — a quiz
// library with no diagnostic behind it, a Review Log with nothing to review, a
// Recommenders form for a fourteen-year-old, an Admissions Calculator with no
// scores to calculate from. Every one of those is a good screen. Shown on day
// one they are all noise, and noise on day one is the whole drop-off problem:
// the student cannot tell which of the thirty-eight doors is the one they are
// supposed to walk through, so they walk out instead.
//
// So the nav is no longer a directory of everything that exists. It is a
// directory of everything that is *useful to this student right now*, and it
// grows as they do. A brand-new account sees four top-level destinations and
// two sub-tabs inside each pillar; by the time it shows the Admissions
// Calculator the student has a college list and a test score to put in it.
//
// ── The three rules that keep this honest ──────────────────────────────────
//
// 1. UNLOCKING IS STICKY AND ONE-WAY. Once a surface has been shown it is
//    recorded on the user (`unlockedFeatures`) and never hidden again. A tab
//    that vanishes because a student deleted an activity is a bug report, not
//    a feature — and re-locking would punish exactly the exploration we want.
//
// 2. NOTHING IS EVER UNREACHABLE. A locked surface still has a URL, and
//    navigating to it directly (a shared link, a bookmark, a ⌘K jump, an
//    old history entry) unlocks it on arrival rather than bouncing. A lock
//    here means "we haven't put this in front of you yet", never "you may not".
//    Settings additionally carries a one-switch escape hatch (`navMode`) for
//    the student who wants the whole map immediately.
//
// 3. LOCKS ARE VISIBLE, NOT SILENT. A surface the student hasn't reached shows
//    up as a dimmed row with the sentence that opens it ("Finish one lesson to
//    unlock your Portfolio"). Silently hiding features teaches nothing and
//    reads as a broken app; showing the next one with its condition attached
//    is what makes the product self-explaining, which is the actual goal —
//    the nav should teach the order to do things in without anyone narrating.
//
// This module is pure: signals in, visibility out. No React, no storage, no
// DOM — which is what lets `npm run verify:nav` prove every rule is reachable
// and that the ids here still match the nav arrays in App.jsx.

/** How a student refers to a destination internally: 'portfolio', 'sat/review'. */
export const key = (tab, view) => (view ? `${tab}/${view}` : tab);

/** Escape hatch values for `user.navMode`. */
export const NAV_MODES = { GUIDED: 'guided', EVERYTHING: 'everything' };

/**
 * The signal bag every rule reads. Built by `buildUnlockSignals` in App.jsx
 * from state the app already computes; defaulted here so a rule can never
 * throw on a half-loaded account (Dexie resolves after first paint, and a nav
 * that flickers its items on load is worse than one that starts small).
 */
export const EMPTY_SIGNALS = {
  quizzes: 0,            // quizzes submitted
  lessons: 0,            // pathway lessons completed
  satQuestions: 0,       // SAT questions answered, any mode
  satBaselineDone: false,
  satDiagnosticDone: false,
  satFullTests: 0,
  colleges: 0,
  essays: 0,
  activities: 0,         // portfolio activity rows (incl. clinical/research)
  trackedItems: 0,
  achievements: 0,
  level: 1,
  planBuilt: false,
  // Seniors and juniors in application season don't get to wait for the
  // application half of the product — for them it IS the product.
  applicationUrgent: false,
};

/**
 * Anything a student has done that counts as "using the app". The unlock
 * ladder is built on this rather than on any single feature so a student who
 * only does SAT work and a student who only does pathway lessons both progress
 * — the point is to gate on engagement, not to force one route through.
 */
export function studyActions(s) {
  return (s.quizzes || 0) + (s.lessons || 0) + Math.floor((s.satQuestions || 0) / 5);
}

/**
 * Every gated destination, in the order a student meets it.
 *
 * Ids not listed here are open from the first second — that list is
 * deliberately tiny (Home, SAT, Prep, Settings, and the first two sub-tabs of
 * each pillar) because it is the answer to "where do I go?" for someone who
 * has never seen the app.
 *
 * `hint` is shown to the student verbatim, so it is written as an instruction
 * ("Finish one lesson…"), not as a status ("Locked"). `at` returns true once
 * the surface should appear.
 */
export const UNLOCK_RULES = [
  // ── Top-level pillars ────────────────────────────────────────────────────
  {
    id: 'portfolio',
    label: 'Portfolio',
    hint: 'Finish one lesson, quiz, or SAT set to start building your application.',
    at: (s) => studyActions(s) >= 1 || s.applicationUrgent,
    progress: (s) => [Math.min(studyActions(s), 1), 1],
  },
  {
    id: 'plans',
    label: 'Plans',
    hint: 'Complete 3 study sessions and we\'ll build you a day-by-day plan.',
    at: (s) => studyActions(s) >= 3 || s.planBuilt,
    progress: (s) => [Math.min(studyActions(s), 3), 3],
  },
  {
    id: 'progress',
    label: 'Progress',
    // Deliberately last of the pillars. A progress dashboard opened on day one
    // shows five zeroes and a flat chart, which is the single most discouraging
    // thing this app could say to someone on their first visit.
    hint: 'Complete 5 study sessions — then there\'s a real chart to look at.',
    at: (s) => studyActions(s) >= 5 || s.level >= 2,
    progress: (s) => [Math.min(studyActions(s), 5), 5],
  },

  // ── SAT ──────────────────────────────────────────────────────────────────
  // Overview and Baseline stay open: the baseline is the one thing a new
  // student should do in this pillar, and it is what makes every other panel
  // here say something true instead of something generic.
  {
    id: 'sat/diagnostic',
    label: 'Diagnostic',
    hint: 'Take your Baseline first — the diagnostic builds on your starting score.',
    at: (s) => s.satBaselineDone || s.satQuestions >= 5,
  },
  {
    id: 'sat/practice',
    label: 'Practice',
    hint: 'Take your Baseline to unlock practice aimed at your weak spots.',
    at: (s) => s.satBaselineDone || s.satDiagnosticDone || s.satQuestions >= 5,
  },
  {
    id: 'sat/toolkit',
    label: 'Calculator',
    hint: 'Answer 5 SAT questions to unlock the Desmos calculator and formula sheet.',
    at: (s) => s.satQuestions >= 5,
    progress: (s) => [Math.min(s.satQuestions, 5), 5],
  },
  {
    id: 'sat/review',
    label: 'Review Log',
    // A review log is a list of your own mistakes. Before you have made any it
    // is an empty state pretending to be a feature.
    hint: 'Answer 10 SAT questions — anything you miss lands here to redo.',
    at: (s) => s.satQuestions >= 10,
    progress: (s) => [Math.min(s.satQuestions, 10), 10],
  },
  {
    id: 'sat/library',
    label: 'Library',
    hint: 'Answer 10 SAT questions to browse the full question bank.',
    at: (s) => s.satQuestions >= 10,
    progress: (s) => [Math.min(s.satQuestions, 10), 10],
  },
  {
    id: 'sat/scores',
    label: 'Scores',
    hint: 'Finish your Baseline to start tracking your score over time.',
    at: (s) => s.satBaselineDone || s.satFullTests >= 1,
  },
  {
    id: 'sat/skills',
    label: 'Skill Mastery',
    hint: 'Answer 20 SAT questions — mastery needs enough evidence to be honest.',
    at: (s) => s.satQuestions >= 20,
    progress: (s) => [Math.min(s.satQuestions, 20), 20],
  },
  {
    id: 'sat/tests',
    label: 'Full Tests',
    // Held back the longest on purpose: a full digital SAT is a ~2h20m sitting.
    // Offering it to someone on their first session is how you get an abandoned
    // attempt and a student who believes they are bad at the test.
    hint: 'Answer 30 SAT questions first — a full test is a 2h20m sitting.',
    at: (s) => s.satQuestions >= 30 || s.satFullTests >= 1,
    progress: (s) => [Math.min(s.satQuestions, 30), 30],
  },

  // ── Prep ─────────────────────────────────────────────────────────────────
  // Diagnostic and Pathway stay open — together they are "find out what to
  // study" and "study it", which is the entire day-one job of this pillar.
  {
    id: 'prep/quizzes',
    label: 'Quiz Library',
    hint: 'Take the pathway diagnostic or finish a lesson to open the quiz library.',
    at: (s) => s.lessons >= 1 || s.quizzes >= 1,
  },
  {
    id: 'prep/coach',
    label: 'AI Coach',
    hint: 'Finish one lesson or quiz — then the coach has something to coach on.',
    at: (s) => studyActions(s) >= 1,
  },
  {
    id: 'prep/flashcards',
    label: 'Flashcards',
    hint: 'Take one quiz — we build your first deck from what you missed.',
    at: (s) => s.quizzes >= 1,
  },
  {
    id: 'prep/library',
    label: 'E-Library',
    hint: 'Complete 3 study sessions to unlock the reading library.',
    at: (s) => studyActions(s) >= 3,
    progress: (s) => [Math.min(studyActions(s), 3), 3],
  },

  // ── Portfolio ────────────────────────────────────────────────────────────
  // Overview, Milestones and College List stay open: "where am I applying and
  // when is it due" is the question a student actually arrives with.
  {
    id: 'portfolio/essays',
    label: 'Essays',
    hint: 'Add a college to your list — essay prompts come from your schools.',
    at: (s) => s.colleges >= 1,
  },
  {
    id: 'portfolio/resume',
    label: 'Activities & Résumé',
    hint: 'Add a college to your list, then log what you\'ve actually done.',
    at: (s) => s.colleges >= 1 || s.activities >= 1,
  },
  {
    id: 'portfolio/opportunities',
    label: 'Opportunities',
    hint: 'Log one activity — matches are ranked against what you\'ve already done.',
    at: (s) => s.activities >= 1,
  },
  {
    id: 'portfolio/tracked',
    label: 'Tracked',
    hint: 'Track a program or scholarship and it shows up here with its deadline.',
    at: (s) => s.trackedItems >= 1 || s.activities >= 1,
  },
  {
    id: 'portfolio/calc',
    label: 'Admissions Calc',
    hint: 'Add a college and finish your SAT Baseline — the calculator needs both.',
    at: (s) => s.colleges >= 1 && (s.satBaselineDone || s.satFullTests >= 1),
  },
  {
    id: 'portfolio/aid',
    label: 'Financial Aid',
    hint: 'Add 2 colleges — aid is a comparison between schools, not a single number.',
    at: (s) => s.colleges >= 2,
    progress: (s) => [Math.min(s.colleges, 2), 2],
  },
  {
    id: 'portfolio/recommenders',
    label: 'Recommenders',
    // Named in the review as a day-one tab that made no sense: you cannot ask
    // for a letter about work you have not logged yet.
    hint: 'Log 2 activities first — a recommender writes about what you\'ve done.',
    at: (s) => s.activities >= 2 || s.applicationUrgent,
    progress: (s) => [Math.min(s.activities, 2), 2],
  },
  {
    id: 'portfolio/interview',
    label: 'Interview Prep',
    hint: 'Log 2 activities — interview answers are built from your own experiences.',
    at: (s) => s.activities >= 2 || s.applicationUrgent,
    progress: (s) => [Math.min(s.activities, 2), 2],
  },

  // ── Progress ─────────────────────────────────────────────────────────────
  {
    id: 'progress/performance',
    label: 'Performance',
    hint: 'Take 3 quizzes — a performance breakdown needs more than one data point.',
    at: (s) => s.quizzes >= 3,
    progress: (s) => [Math.min(s.quizzes, 3), 3],
  },
  {
    id: 'progress/verified',
    label: 'Verified Progress',
    hint: 'Verify one lesson to start your verified mastery record.',
    at: (s) => s.lessons >= 1,
  },
  {
    id: 'progress/achievements',
    label: 'Achievements',
    hint: 'Earn 3 badges — then there\'s a case worth opening.',
    at: (s) => s.achievements >= 3,
    progress: (s) => [Math.min(s.achievements, 3), 3],
  },
];

const RULE_BY_ID = new Map(UNLOCK_RULES.map((r) => [r.id, r]));

/** Every destination this module gates, in ladder order. */
export const GATED_IDS = UNLOCK_RULES.map((r) => r.id);

/**
 * The visibility snapshot for one student.
 *
 * @param {object} user   the saved user record (reads `navMode`, `unlockedFeatures`)
 * @param {object} rawSignals see EMPTY_SIGNALS
 * @returns {{
 *   isOpen: (tab:string, view?:string|null) => boolean,
 *   earned: string[],          // ids the signals currently satisfy
 *   sticky: string[],          // ids already recorded on the user
 *   pending: string[],         // earned but not yet recorded — App.jsx persists these
 *   locked: (scope?:string|null) => Array<{id,label,hint,progress:[number,number]|null}>,
 *   everything: boolean,
 * }}
 */
export function unlockState(user, rawSignals) {
  const s = { ...EMPTY_SIGNALS, ...(rawSignals || {}) };
  const everything = user?.navMode === NAV_MODES.EVERYTHING;
  const sticky = Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : [];
  const stickySet = new Set(sticky);

  const earned = [];
  const open = new Set(stickySet);
  for (const rule of UNLOCK_RULES) {
    let on = false;
    try { on = !!rule.at(s); } catch { on = false; }
    if (on) { earned.push(rule.id); open.add(rule.id); }
  }

  return {
    everything,
    earned,
    sticky,
    pending: earned.filter((id) => !stickySet.has(id)),
    isOpen(tab, view = null) {
      const id = key(tab, view);
      // Not a gated id at all → open since the first second.
      if (!RULE_BY_ID.has(id)) return true;
      if (everything) return true;
      // A locked sub-view of a locked tab is locked; a sub-view whose parent
      // tab is open is judged on its own rule.
      return open.has(id);
    },
    /**
     * What is still to come, nearest first. `scope` narrows to one pillar's
     * sub-views ('sat') or to the top level (''), which is how the sidebar
     * shows "Portfolio unlocks next" while the SAT sub-nav shows its own.
     */
    locked(scope = null) {
      if (everything) return [];
      return UNLOCK_RULES
        .filter((r) => !open.has(r.id))
        .filter((r) => {
          if (scope === null) return true;
          const slash = r.id.indexOf('/');
          return scope === '' ? slash === -1 : r.id.slice(0, slash) === scope;
        })
        .map((r) => ({
          id: r.id,
          label: r.label,
          hint: r.hint,
          progress: r.progress ? r.progress(s) : null,
        }));
    },
  };
}

/** Filters a NAV / *_SUBNAV array down to what this student can see. */
export function visibleItems(items, state, tab = null) {
  return items.filter((it) => state.isOpen(tab || it.id, tab ? it.id : null));
}

/**
 * The user patch that records newly-earned unlocks, or null when there is
 * nothing new. Kept here (rather than inline in App.jsx) so the sticky list is
 * only ever written in one shape, and so it can be unit-tested.
 */
export function recordUnlocks(user, ids) {
  if (!user || !ids?.length) return null;
  const have = new Set(Array.isArray(user.unlockedFeatures) ? user.unlockedFeatures : []);
  const added = ids.filter((id) => !have.has(id));
  if (!added.length) return null;
  return { ...user, unlockedFeatures: [...have, ...added] };
}

/**
 * Existing accounts must never wake up to a smaller app than they went to
 * sleep with. Anyone who was already using the product before progressive
 * unlocking shipped — they have XP, or a plan, or any saved work — gets every
 * gate opened once, permanently, on their next load. New accounts (no XP, no
 * activity, no prior unlock record) start at the bottom of the ladder as
 * intended. `navMode` doubles as the "this account has been through here"
 * marker so the seeding runs exactly once.
 */
export function seedExistingAccount(user, signals) {
  if (!user || user.navMode) return null;
  const established = (user.xp || 0) > 0
    || !!user.masterPlan
    || !!user.tourCompletedAt
    || studyActions({ ...EMPTY_SIGNALS, ...(signals || {}) }) > 0;
  return {
    ...user,
    navMode: NAV_MODES.GUIDED,
    unlockedFeatures: established
      ? [...new Set([...(user.unlockedFeatures || []), ...GATED_IDS])]
      : (user.unlockedFeatures || []),
  };
}
