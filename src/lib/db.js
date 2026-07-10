// ─────────────────────────────────────────────────────────────────────────────
// Dexie.js — IndexedDB wrapper
// Replaces all localStorage with a proper async database.
// Supports: user profile, lessons, quiz scores, flashcards (FSRS state),
//           portfolio, achievements, study sessions, streak calendar.
// ─────────────────────────────────────────────────────────────────────────────
import Dexie from 'dexie';

const db = new Dexie('MedSchoolPrep');

db.version(1).stores({
  user:          '++id, name, specialty',
  lessons:       'lessonId, completedAt',
  quizScores:    'quizId, score, completedAt',
  flashCards:    '++id, deckName, front, back',
  portfolio:     '++id, name, type, hours, date',
  catPerf:       'category',
  achievements:  'key, unlockedAt',
  studyDays:     'date',
  cardReviews:   '++id, cardId, reviewedAt',
  mmiSessions:   '++id, questionIdx, answeredAt',
});

// v2: medical-school interview (MMI) module removed — app is scoped to
// SAT/ACT prep + college admissions for high school/undergrad students.
db.version(2).stores({
  mmiSessions: null,
});

// v3: GPA tracker for the Portfolio's academic-history section (superseded by
// the Supabase-backed gpa_entries resource in v4 — kept here only so the
// version-history chain stays valid for anyone who already ran v3).
db.version(3).stores({
  gpaEntries: '++id, term, gpa, addedAt',
});

// v4: Portfolio and GPA history moved to the Supabase-backed resources
// (activities, awards, gpa_entries via api/data/[resource].js) so activity
// tracking is one consistent system instead of a local-only duplicate.
db.version(4).stores({
  portfolio: null,
  gpaEntries: null,
});

// v5: Clinical/shadowing hours, LOR/committee-letter recommenders, and
// interview practice sessions (Standard/MMI/CASPer) — student-filled logs
// rather than official application records, so they stay local-only like
// quiz/flashcard data instead of requiring new Supabase tables/RLS policies.
db.version(5).stores({
  clinicalHours:     '++id, siteName, siteType, hours, entryDate',
  recommenders:      '++id, name, relationship, status, type',
  interviewSessions: '++id, mode, pathwayKey, completedAt',
});

// v6: Dopamine-loop gamification additions — earned streak-freeze tokens
// (loss-aversion safety net), the daily check-in cycle, and cosmetic-only
// chest unlocks.
db.version(6).stores({
  streakFreezes: '++id, earnedAt, usedOn',
  checkins:      'date, day',
  cosmetics:     'key, unlockedAt',
});

// ── User ─────────────────────────────────────────────────────────────────────
export async function getUser() {
  return db.user.toCollection().first();
}
export async function saveUser(u) {
  const existing = await db.user.toCollection().first();
  if (existing) await db.user.update(existing.id, u);
  else await db.user.add({ ...u });
}

// ── Pathway ───────────────────────────────────────────────────────────────────
export async function getPathway() {
  const rows = await db.lessons.toArray();
  return Object.fromEntries(rows.map(r => [r.lessonId, r.completedAt]));
}
export async function setLessonDone(lessonId) {
  await db.lessons.put({ lessonId, completedAt: Date.now() });
}
export async function resetPathway() {
  await db.lessons.clear();
}

// ── Quiz Scores ───────────────────────────────────────────────────────────────
export async function getQuizScores() {
  const rows = await db.quizScores.toArray();
  return Object.fromEntries(rows.map(r => [r.quizId, r.score]));
}
export async function getQuizHistory() {
  return db.quizScores.orderBy('completedAt').toArray();
}
export async function saveQuizScore(quizId, score) {
  await db.quizScores.put({ quizId, score, completedAt: Date.now() });
}
export async function resetQuizScores() {
  await db.quizScores.clear();
}

// ── Flashcard Decks ───────────────────────────────────────────────────────────
export async function getFlashDecks() {
  const rows = await db.flashCards.toArray();
  // Group by deckName
  const decks = {};
  rows.forEach(r => {
    if (!decks[r.deckName]) decks[r.deckName] = [];
    decks[r.deckName].push(r);
  });
  return decks;
}
export async function saveDeck(deckName, cards) {
  // Remove existing cards for this deck, then add new ones
  await db.flashCards.where('deckName').equals(deckName).delete();
  const rows = cards.map(c => ({ deckName, ...c }));
  await db.flashCards.bulkAdd(rows);
}
export async function updateCard(id, updates) {
  await db.flashCards.update(id, updates);
}
export async function deleteDeck(deckName) {
  await db.flashCards.where('deckName').equals(deckName).delete();
}
export async function recordCardReview(cardId) {
  await db.cardReviews.add({ cardId, reviewedAt: Date.now() });
}
export async function getTotalCardReviews() {
  return db.cardReviews.count();
}
export async function getCardReviewsSince(timestamp) {
  return db.cardReviews.where('reviewedAt').aboveOrEqual(timestamp).count();
}

// ── Category Performance ───────────────────────────────────────────────────────
export async function getCatPerf() {
  const rows = await db.catPerf.toArray();
  return Object.fromEntries(rows.map(r => [r.category, { total: r.total, count: r.count }]));
}
export async function updateCatPerf(category, score) {
  const existing = await db.catPerf.get(category);
  if (existing) {
    await db.catPerf.update(category, { total: existing.total + score, count: existing.count + 1 });
  } else {
    await db.catPerf.put({ category, total: score, count: 1 });
  }
}
export async function resetCatPerf() {
  await db.catPerf.clear();
}

// ── Achievements ──────────────────────────────────────────────────────────────
export async function getAchievements() {
  const rows = await db.achievements.toArray();
  return new Set(rows.map(r => r.key));
}
export async function unlockAchievement(key) {
  try {
    await db.achievements.add({ key, unlockedAt: Date.now() });
    return true; // newly unlocked
  } catch {
    return false; // already existed
  }
}

// ── Streak / Study Days ────────────────────────────────────────────────────────
export async function recordStudyToday() {
  const today = new Date().toISOString().split('T')[0];
  try { await db.studyDays.add({ date: today }); } catch { /* already exists */ }
}
export async function getStreak() {
  const days = await db.studyDays.orderBy('date').reverse().toArray();
  if (!days.length) return 0;
  const freezes = await db.streakFreezes.toArray();
  const bridgedDates = new Set(freezes.filter(f => f.usedOn).map(f => f.usedOn));
  let streak = 0;
  let check = new Date();
  check.setHours(0,0,0,0);
  for (const { date } of days) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const diff = Math.round((check - d) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      check = d;
    } else if (diff === 2) {
      // Exactly one full day was missed — bridge it only if a streak freeze
      // was already spent to cover that specific date (see
      // checkAndApplyStreakFreeze, called once per app load).
      const missed = new Date(check);
      missed.setDate(missed.getDate() - 1);
      const missedKey = missed.toISOString().split('T')[0];
      if (bridgedDates.has(missedKey)) { streak++; check = d; }
      else break;
    } else break;
  }
  return streak;
}

// ── Streak Freezes ────────────────────────────────────────────────────────────
// Earned (not purchased) safety net against loss-aversion streak breaks —
// capped at 2 held at once so consistency still matters.
const MAX_STREAK_FREEZES = 2;

export async function getStreakFreezeCount() {
  return db.streakFreezes.filter(f => !f.usedOn).count();
}
export async function grantStreakFreeze() {
  const held = await getStreakFreezeCount();
  if (held >= MAX_STREAK_FREEZES) return false;
  await db.streakFreezes.add({ earnedAt: Date.now(), usedOn: null });
  return true;
}
/**
 * Run once per app load, before getStreak(). If exactly one day was missed
 * since the last study day and an unused freeze is available, spends it to
 * bridge that specific date so getStreak() can see it via `usedOn`.
 * Returns true if a freeze was newly applied this call.
 */
export async function checkAndApplyStreakFreeze() {
  const days = await db.studyDays.orderBy('date').reverse().toArray();
  if (!days.length) return false;
  const mostRecent = new Date(days[0].date); mostRecent.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const gapDays = Math.round((today - mostRecent) / 86400000);
  if (gapDays !== 2) return false; // only bridges a single missed day
  const missed = new Date(mostRecent); missed.setDate(missed.getDate() + 1);
  const missedKey = missed.toISOString().split('T')[0];
  const alreadyBridged = await db.streakFreezes.where('usedOn').equals(missedKey).count();
  if (alreadyBridged) return false;
  const unused = await db.streakFreezes.filter(f => !f.usedOn).first();
  if (!unused) return false;
  await db.streakFreezes.update(unused.id, { usedOn: missedKey });
  return true;
}

// ── Daily Check-in ────────────────────────────────────────────────────────────
export async function getCheckin(date) {
  return db.checkins.get(date);
}
export async function recordCheckin(date, day) {
  try { await db.checkins.add({ date, day }); return true; } catch { return false; }
}

// ── Cosmetics (chest-reveal unlocks) ─────────────────────────────────────────
export async function getCosmetics() {
  const rows = await db.cosmetics.toArray();
  return new Set(rows.map(r => r.key));
}
export async function unlockCosmetic(key) {
  try { await db.cosmetics.add({ key, unlockedAt: Date.now() }); return true; } catch { return false; }
}
export async function getStudyDaysCount() {
  return db.studyDays.count();
}
export async function getStudyDays() {
  const rows = await db.studyDays.toArray();
  return rows.map(r => r.date);
}

// ── Clinical / Shadowing Hours ────────────────────────────────────────────────
export async function getClinicalHours() {
  return db.clinicalHours.orderBy('entryDate').reverse().toArray();
}
export async function addClinicalHours(entry) {
  return db.clinicalHours.add({ ...entry, loggedAt: Date.now() });
}
export async function deleteClinicalHours(id) {
  await db.clinicalHours.delete(id);
}

// ── Recommenders (LOR writers / committee letters) ───────────────────────────
export async function getRecommenders() {
  return db.recommenders.toArray();
}
export async function addRecommender(entry) {
  return db.recommenders.add({ ...entry, addedAt: Date.now() });
}
export async function updateRecommender(id, updates) {
  await db.recommenders.update(id, updates);
}
export async function deleteRecommender(id) {
  await db.recommenders.delete(id);
}

// ── Interview Practice Sessions (Standard/MMI/CASPer) ─────────────────────────
export async function getInterviewSessions() {
  return db.interviewSessions.orderBy('completedAt').reverse().toArray();
}
export async function addInterviewSession(entry) {
  return db.interviewSessions.add({ ...entry, completedAt: Date.now() });
}

// ── Full export ────────────────────────────────────────────────────────────────
export async function exportAllData() {
  const data = {
    user: await db.user.toArray(),
    lessons: await db.lessons.toArray(),
    quizScores: await db.quizScores.toArray(),
    achievements: await db.achievements.toArray(),
    studyDays: await db.studyDays.toArray(),
    clinicalHours: await db.clinicalHours.toArray(),
    recommenders: await db.recommenders.toArray(),
    interviewSessions: await db.interviewSessions.toArray(),
    exportDate: new Date().toISOString(),
    version: '3.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `medschoolprep-backup-${data.exportDate.split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Full reset ─────────────────────────────────────────────────────────────────
export async function clearAllData() {
  await Promise.all([
    db.user.clear(), db.lessons.clear(), db.quizScores.clear(),
    db.flashCards.clear(), db.catPerf.clear(),
    db.achievements.clear(), db.studyDays.clear(), db.cardReviews.clear(),
    db.clinicalHours.clear(), db.recommenders.clear(), db.interviewSessions.clear(),
    db.streakFreezes.clear(), db.checkins.clear(), db.cosmetics.clear(),
  ]);
}
