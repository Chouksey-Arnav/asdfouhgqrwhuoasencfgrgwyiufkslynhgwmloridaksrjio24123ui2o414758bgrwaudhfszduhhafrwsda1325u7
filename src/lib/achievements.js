// ─────────────────────────────────────────────────────────────────────────────
// Achievement system — definitions and check logic
// ─────────────────────────────────────────────────────────────────────────────

// icon values are lucide-react component names, resolved to components in App.jsx (ACH_ICONS map)
export const ACHIEVEMENTS = {
  first_quiz:   { key:'first_quiz',   name:'First Steps',      desc:'Complete your first quiz',         icon:'Target', xp:50  },
  perfect_score:{ key:'perfect_score',name:'Perfect Score',    desc:'Score 100% on any quiz',           icon:'Star', xp:100 },
  quiz_10:      { key:'quiz_10',      name:'Quiz Champion',    desc:'Complete 10 quizzes',              icon:'Trophy', xp:150 },
  level_5:      { key:'level_5',      name:'Rising Star',      desc:'Reach Level 5',                   icon:'Sparkles', xp:200 },
  level_10:     { key:'level_10',     name:'Dedicated Scholar',desc:'Reach Level 10',                  icon:'Gem', xp:300 },
  streak_7:     { key:'streak_7',     name:'Week Warrior',     desc:'Study 7 days in a row',           icon:'Flame', xp:250 },
  streak_30:    { key:'streak_30',    name:'Iron Will',        desc:'Study 30 days in a row',          icon:'Dumbbell', xp:500 },
  cards_100:    { key:'cards_100',    name:'Card Master',      desc:'Review 100 flashcards',           icon:'Layers3', xp:150 },
  unit_master:  { key:'unit_master',  name:'Unit Complete',    desc:'Master all lessons in a unit',    icon:'BookOpen', xp:200 },
  mmi_5:        { key:'mmi_5',        name:'Interview Ready',  desc:'Practice 5 MMI stations',         icon:'Mic', xp:100 },
  course_half:  { key:'course_half',  name:'Halfway There',    desc:'Complete 50% of the course',      icon:'Milestone', xp:300 },
  ai_user:      { key:'ai_user',      name:'AI Powered',       desc:'Use MetaBrain AI Coach 5 times',  icon:'MessageCircle', xp:75  },
};

/** Check which new achievements should be unlocked given current state */
export function checkAchievements({ level, quizCount, perfectScores, streak, cardReviews, mmiCount, mastery, aiChats, unlocked }) {
  const toUnlock = [];
  const check = (key, condition) => { if (condition && !unlocked.has(key)) toUnlock.push(ACHIEVEMENTS[key]); };

  check('first_quiz',    quizCount >= 1);
  check('perfect_score', perfectScores >= 1);
  check('quiz_10',       quizCount >= 10);
  check('level_5',       level >= 5);
  check('level_10',      level >= 10);
  check('streak_7',      streak >= 7);
  check('streak_30',     streak >= 30);
  check('cards_100',     cardReviews >= 100);
  check('unit_master',   mastery >= 33);   // at least 1 of 3 units mastered
  check('mmi_5',         mmiCount >= 5);
  check('course_half',   mastery >= 50);
  check('ai_user',       aiChats >= 5);

  return toUnlock;
}
