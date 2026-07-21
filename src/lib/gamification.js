// ─────────────────────────────────────────────────────────────────────────────
// Leveling, tiers, and weekly quests — the "make progress feel like a game"
// engine shared by Home/Analytics/level-up toasts.
// ─────────────────────────────────────────────────────────────────────────────

// XP required to go from `level` to `level+1`. Grows linearly so the first few
// levels come fast (front-loaded for early-session dopamine) while later levels
// still take meaningfully longer to earn.
export function xpForNextLevel(level) {
  return 100 + (level - 1) * 50;
}

// Named tiers every 5 levels — generic/motivational so they fit any pathway and
// any grade level (a senior could be Level 3, a freshman could be Level 12).
const TIERS = [
  { max: 4,  name: 'Spark',      icon: 'Sparkles',    color: '#64748b' },
  { max: 9,  name: 'Builder',    icon: 'Hammer',       color: '#3b82f6' },
  { max: 14, name: 'Strategist', icon: 'Compass',      color: '#8b5cf6' },
  { max: 19, name: 'Achiever',   icon: 'Trophy',        color: '#f59e0b' },
  { max: 24, name: 'Luminary',   icon: 'Sun',           color: '#10b981' },
  { max: 29, name: 'Vanguard',   icon: 'ShieldCheck',   color: '#06b6d4' },
  { max: Infinity, name: 'Legend', icon: 'Crown',       color: '#ef4444' },
];

export function getTier(level) {
  return TIERS.find(t => level <= t.max) || TIERS[TIERS.length - 1];
}

// Walk cumulative thresholds to find the student's current level, progress
// into it, and how much XP remains until the next one.
export function getLevelInfo(xp) {
  const totalXp = Math.max(0, xp || 0);
  let level = 1;
  let xpAtLevelStart = 0;
  while (true) {
    const need = xpForNextLevel(level);
    if (xpAtLevelStart + need > totalXp) break;
    xpAtLevelStart += need;
    level++;
  }
  const xpForNext = xpForNextLevel(level);
  const xpIntoLevel = totalXp - xpAtLevelStart;
  const pct = Math.round((xpIntoLevel / xpForNext) * 100);
  const tier = getTier(level);
  return { level, tier: tier.name, tierIcon: tier.icon, tierColor: tier.color, xpIntoLevel, xpForNext, xpRemaining: xpForNext - xpIntoLevel, pct };
}

// ── Encouraging due-card copy ─────────────────────────────────────────────────
// A raw flashcard "due" count (FSRS naturally lets this pile up if a student takes a break) is
// motivating when it's small — "3 cards ready" reads like a quick win — but a big bare number
// like "285 cards due" reads like an intimidating backlog, which is the opposite of what a
// spaced-repetition system should feel like. These stay honest (the true count still shows for
// small, approachable numbers) while reframing larger ones around "a session," not a debt.
export function dueCardsBadge(n) {
  if (n <= 0) return null;
  if (n <= 20) return `${n} card${n === 1 ? '' : 's'} ready`;
  if (n <= 60) return 'A review session is ready';
  return 'Loads of cards ready — dive in anytime';
}

export function dueCardsSub(n) {
  if (n <= 0) return 'All caught up';
  if (n <= 20) return `${n} card${n === 1 ? '' : 's'} ready to review`;
  if (n <= 60) return 'A full session ready whenever you are';
  return 'Plenty ready — even a few minutes helps';
}

// ── Weekly quests ─────────────────────────────────────────────────────────────
// Fixed 3-quest set, reset every Monday (ISO week key). Claim state lives in
// localStorage since it's a short-horizon, non-critical reward loop.
export const WEEKLY_QUEST_DEFS = [
  { id: 'quizzes',  label: 'Complete 3 quizzes this week',            target: 3,  xp: 30 },
  { id: 'cards',    label: 'Review 15 flashcards this week',          target: 15, xp: 30 },
  { id: 'coach',    label: 'Chat with your coach or practice an interview twice', target: 2, xp: 30 },
];

export function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // Monday = 1 ... Sunday = 7
  d.setDate(d.getDate() - (day - 1));
  return d;
}

export function getWeeklyQuests({ quizzesThisWeek = 0, cardsThisWeek = 0, coachOrInterviewThisWeek = 0 }) {
  const progressMap = { quizzes: quizzesThisWeek, cards: cardsThisWeek, coach: coachOrInterviewThisWeek };
  return WEEKLY_QUEST_DEFS.map(q => {
    const progress = Math.min(q.target, progressMap[q.id] || 0);
    return { ...q, progress, pct: Math.round((progress / q.target) * 100), done: progress >= q.target };
  });
}

export function getClaimedQuests(weekKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`quest:${weekKey}`) || '[]'));
  } catch {
    return new Set();
  }
}

export function claimQuest(weekKey, questId) {
  const claimed = getClaimedQuests(weekKey);
  claimed.add(questId);
  localStorage.setItem(`quest:${weekKey}`, JSON.stringify([...claimed]));
}

// Coach chats + interview sessions don't have per-event timestamps stored
// anywhere, so the weekly "coach" quest tracks a simple per-week counter in
// localStorage instead of querying history.
export function bumpWeeklyCoachCount(weekKey) {
  const n = getWeeklyCoachCount(weekKey) + 1;
  localStorage.setItem(`weeklyCoach:${weekKey}`, String(n));
  return n;
}
export function getWeeklyCoachCount(weekKey) {
  return parseInt(localStorage.getItem(`weeklyCoach:${weekKey}`) || '0', 10);
}
