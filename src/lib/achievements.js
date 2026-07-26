// ─────────────────────────────────────────────────────────────────────────────
// Achievement system — definitions and check logic
// ─────────────────────────────────────────────────────────────────────────────

// icon values are lucide-react component names, resolved to components in App.jsx (ACH_ICONS map)
export const ACHIEVEMENTS = {
  first_quiz:   { key:'first_quiz',   name:'First Steps',      desc:'Complete your first quiz',         icon:'Target', xp:50  },
  perfect_score:{ key:'perfect_score',name:'Perfect Score',    desc:'Score 100% on any quiz',           icon:'Star', xp:100 },
  quiz_10:      { key:'quiz_10',      name:'Quiz Champion',    desc:'Complete 10 quizzes',              icon:'Trophy', xp:150 },
  // ── SAT ── deliberately weighted toward reviewing errors and re-measuring,
  // not toward raw question volume, since that is what actually moves a score.
  sat_diagnostic:  { key:'sat_diagnostic',  name:'Baseline Set',      desc:'Complete the SAT diagnostic',            icon:'Compass', xp:150 },
  sat_first_test:  { key:'sat_first_test',  name:'Full Distance',     desc:'Finish a full-length adaptive SAT test', icon:'Trophy', xp:400 },
  sat_three_tests: { key:'sat_three_tests', name:'Test Day Ready',    desc:'Finish 3 full-length SAT tests',         icon:'Crown', xp:600 },
  sat_100_q:       { key:'sat_100_q',       name:'Hundred Down',      desc:'Answer 100 SAT questions',               icon:'Layers', xp:200 },
  sat_500_q:       { key:'sat_500_q',       name:'Rep Machine',       desc:'Answer 500 SAT questions',               icon:'Dumbbell', xp:450 },
  sat_log_clear:   { key:'sat_log_clear',   name:'Nothing Left Open', desc:'Clear every item in your SAT review log', icon:'ShieldCheck', xp:350 },
  sat_skill_master:{ key:'sat_skill_master',name:'Skill Locked In',   desc:'Reach 80% mastery on an SAT skill',      icon:'Star', xp:250 },
  level_5:      { key:'level_5',      name:'Rising Star',      desc:'Reach Level 5',                   icon:'Sparkles', xp:200 },
  level_10:     { key:'level_10',     name:'Dedicated Scholar',desc:'Reach Level 10',                  icon:'Gem', xp:300 },
  streak_7:     { key:'streak_7',     name:'Week Warrior',     desc:'Study 7 days in a row',           icon:'Flame', xp:250 },
  streak_30:    { key:'streak_30',    name:'Iron Will',        desc:'Study 30 days in a row',          icon:'Dumbbell', xp:500 },
  cards_100:    { key:'cards_100',    name:'Card Master',      desc:'Review 100 flashcards',           icon:'Layers3', xp:150 },
  unit_master:  { key:'unit_master',  name:'Unit Complete',    desc:'Master all lessons in a unit',    icon:'BookOpen', xp:200 },
  course_half:  { key:'course_half',  name:'Halfway There',    desc:'Complete 50% of the course',      icon:'Milestone', xp:300 },
  ai_user:      { key:'ai_user',      name:'AI Powered',       desc:'Use Medabrain AI Coach 5 times',  icon:'MessageCircle', xp:75  },
  college_added:{ key:'college_added',name:'List Builder',     desc:'Add your first school to your college list', icon:'Building2', xp:75 },
  deadline_set: { key:'deadline_set', name:'On the Radar',     desc:'Track your first application deadline', icon:'CalendarDays', xp:50 },
  essay_started:{ key:'essay_started',name:'First Draft',      desc:'Start your first essay draft',    icon:'ScrollText', xp:100 },
  activity_logged:{ key:'activity_logged', name:'Making Moves', desc:'Log your first activity in your Portfolio', icon:'Award', xp:75 },
  resume_built: { key:'resume_built', name:'Resume Ready',     desc:'Build your first resume',         icon:'Award', xp:100 },
  interview_first:{ key:'interview_first', name:'Nervous No More', desc:'Complete your first mock interview', icon:'Mic', xp:75 },
  interview_5:  { key:'interview_5',  name:'Interview Ready',  desc:'Complete 5 mock interviews',      icon:'GraduationCap', xp:200 },
  clinical_hours_50:{ key:'clinical_hours_50', name:'Boots on the Ground', desc:'Log 50 clinical or shadowing hours', icon:'Stethoscope', xp:150 },
  recommender_added:{ key:'recommender_added', name:'Lining It Up', desc:'Add your first recommender', icon:'UserCheck', xp:75 },
  mmi_practiced:{ key:'mmi_practiced', name:'Format Familiar', desc:'Try an MMI or CASPer practice scenario', icon:'Sparkles', xp:75 },

  // Fills in milestone gaps in the original set (e.g. nothing between 7- and
  // 30-day streaks, or between 10 quizzes and mastery-based achievements) so
  // long-term users keep hitting new badges instead of going quiet after the
  // first week or two.
  quiz_50:      { key:'quiz_50',      name:'Quiz Machine',     desc:'Complete 50 quizzes',              icon:'Layers', xp:250 },
  perfect_5:    { key:'perfect_5',    name:'Perfectionist',    desc:'Score 100% on 5 different quizzes', icon:'Star', xp:200 },
  cards_500:    { key:'cards_500',    name:'Flashcard Marathoner', desc:'Review 500 flashcards',        icon:'Layers3', xp:300 },
  streak_14:    { key:'streak_14',    name:'Two-Week Habit',   desc:'Study 14 days in a row',           icon:'Flame', xp:175 },
  streak_100:   { key:'streak_100',   name:'Streak Legend',    desc:'Study 100 days in a row',          icon:'Crown', xp:750 },
  course_complete:{ key:'course_complete', name:'Course Complete', desc:'Master 100% of your pathway',  icon:'GraduationCap', xp:500 },
  level_20:     { key:'level_20',     name:'Elite Scholar',    desc:'Reach Level 20',                   icon:'Crown', xp:400 },
  ai_user_25:   { key:'ai_user_25',   name:'Medabrain Regular',    desc:'Use Medabrain AI Coach 25 times',      icon:'MessageCircle', xp:150 },
  path_explorer:{ key:'path_explorer',name:'Track Explorer',  desc:'Fully complete 3 different pathways', icon:'Compass', xp:600 },

  // Pathway completion — one per PATHS key (src/data/constants.js), unlocked when every
  // lesson across every unit in that pathway is quiz-verified. Checked via `pathwayCompletions`
  // below, a Set of pathway keys the caller has determined are fully complete.
  path_exploring_complete:            { key:'path_exploring_complete',            name:'Exploring Pre-Health Track Complete', desc:'Verify every lesson in the Exploring Pre-Health pathway', icon:'ShieldCheck', xp:400 },
  path_physician_complete:            { key:'path_physician_complete',            name:'Physician Track Complete',            desc:'Verify every lesson in the Physician (MD/DO) pathway',    icon:'ShieldCheck', xp:400 },
  path_nursing_complete:              { key:'path_nursing_complete',              name:'Nursing Track Complete',              desc:'Verify every lesson in the Nursing pathway',              icon:'ShieldCheck', xp:400 },
  path_physicianAssistant_complete:   { key:'path_physicianAssistant_complete',   name:'PA Track Complete',                   desc:'Verify every lesson in the Physician Assistant pathway',  icon:'ShieldCheck', xp:400 },
  path_pharmacy_complete:             { key:'path_pharmacy_complete',             name:'Pharmacy Track Complete',             desc:'Verify every lesson in the Pharmacy pathway',             icon:'ShieldCheck', xp:400 },
  path_dentistry_complete:            { key:'path_dentistry_complete',            name:'Dentistry Track Complete',            desc:'Verify every lesson in the Dentistry pathway',            icon:'ShieldCheck', xp:400 },
  path_biomedResearch_complete:       { key:'path_biomedResearch_complete',       name:'Research Track Complete',             desc:'Verify every lesson in the Biomedical & Clinical Research pathway', icon:'ShieldCheck', xp:400 },
  path_physicalOccupTherapy_complete: { key:'path_physicalOccupTherapy_complete', name:'PT/OT Track Complete',                desc:'Verify every lesson in the Physical & Occupational Therapy pathway', icon:'ShieldCheck', xp:400 },
  path_publicHealth_complete:         { key:'path_publicHealth_complete',         name:'Public Health Track Complete',        desc:'Verify every lesson in the Public Health pathway',        icon:'ShieldCheck', xp:400 },
  path_healthAdmin_complete:          { key:'path_healthAdmin_complete',          name:'Health Administration Track Complete',desc:'Verify every lesson in the Health Administration pathway',icon:'ShieldCheck', xp:400 },
};

// Keys PATHWAY_COMPLETIONS checks against — kept in sync with PATHS in src/data/constants.js
// by listing the same 10 keys (avoiding a cross-import from constants.js into this file).
// Exported so callers can derive a cumulative pathwayCompletions Set from already-unlocked
// path_${key}_complete achievements (see App.jsx's checkAndUnlockAchievements) instead of only
// ever passing the single pathway that just completed.
export const PATHWAY_KEYS = ['exploring','physician','nursing','physicianAssistant','pharmacy','dentistry','biomedResearch','physicalOccupTherapy','publicHealth','healthAdmin'];

/** Check which new achievements should be unlocked given current state */
export function checkAchievements({ level, quizCount, perfectScores, streak, cardReviews, mastery, aiChats, interviewSessions=0, colleges=0, essays=0, activities=0, deadlines=0, resumeBuilt=false, clinicalHours=0, recommenders=0, mmiCasperSessions=0, pathwayCompletions=new Set(), satDiagnosticDone=false, satFullTests=0, satQuestions=0, satLogCleared=false, satMasteredSkills=0, unlocked }) {
  const toUnlock = [];
  const check = (key, condition) => { if (condition && !unlocked.has(key)) toUnlock.push(ACHIEVEMENTS[key]); };

  check('first_quiz',    quizCount >= 1);
  check('perfect_score', perfectScores >= 1);
  check('quiz_10',       quizCount >= 10);
  check('sat_diagnostic',   satDiagnosticDone);
  check('sat_first_test',   satFullTests >= 1);
  check('sat_three_tests',  satFullTests >= 3);
  check('sat_100_q',        satQuestions >= 100);
  check('sat_500_q',        satQuestions >= 500);
  check('sat_log_clear',    satLogCleared);
  check('sat_skill_master', satMasteredSkills >= 1);
  check('level_5',       level >= 5);
  check('level_10',      level >= 10);
  check('streak_7',      streak >= 7);
  check('streak_30',     streak >= 30);
  check('cards_100',     cardReviews >= 100);
  check('unit_master',   mastery >= 33);   // at least 1 of 3 units mastered
  check('course_half',   mastery >= 50);
  check('ai_user',       aiChats >= 5);
  check('college_added', colleges >= 1);
  check('deadline_set',  deadlines >= 1);
  check('essay_started', essays >= 1);
  check('activity_logged', activities >= 1);
  check('resume_built',  resumeBuilt);
  check('interview_first', interviewSessions >= 1);
  check('interview_5',   interviewSessions >= 5);
  check('clinical_hours_50', clinicalHours >= 50);
  check('recommender_added', recommenders >= 1);
  check('mmi_practiced', mmiCasperSessions >= 1);

  check('quiz_50',      quizCount >= 50);
  check('perfect_5',    perfectScores >= 5);
  check('cards_500',    cardReviews >= 500);
  check('streak_14',    streak >= 14);
  check('streak_100',   streak >= 100);
  check('course_complete', mastery >= 100);
  check('level_20',     level >= 20);
  check('ai_user_25',   aiChats >= 25);
  check('path_explorer', pathwayCompletions.size >= 3);

  for (const key of PATHWAY_KEYS) {
    check(`path_${key}_complete`, pathwayCompletions.has(key));
  }

  return toUnlock;
}
