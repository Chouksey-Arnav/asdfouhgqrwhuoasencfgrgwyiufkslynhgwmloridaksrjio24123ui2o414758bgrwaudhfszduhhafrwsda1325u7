// ─────────────────────────────────────────────────────────────────────────────
// Dexie.js — IndexedDB wrapper
// Replaces all localStorage with a proper async database.
// Supports: user profile, lessons, quiz scores, flashcards (FSRS state),
//           portfolio, achievements, study sessions, streak calendar.
// ─────────────────────────────────────────────────────────────────────────────
import Dexie from 'dexie';

const db = new Dexie('MedSchoolPrep');

// If another tab still holds an older-schema connection open, Dexie's
// version-upgrade transaction blocks indefinitely instead of erroring —
// surface it and release the stale connection so the app doesn't hang.
db.on('blocked', () => {
  console.warn('MedSchoolPrep DB upgrade blocked by another open tab');
});
db.on('versionchange', () => {
  db.close();
});

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

// v7: Per-deck creation timestamp for custom flashcard decks, so newly
// generated/created decks can be pinned to the top of the "All Decks" list
// (newest first) instead of trailing behind the built-in decks.
db.version(7).stores({
  deckMeta: 'name, createdAt',
});

// v8: `clinicalHours`/`recommenders` moved to the Supabase-backed resources (clinical_hours,
// recommenders via api/data/[resource].js) so Portfolio's credibility fields (verification
// status, evidence links) apply consistently everywhere instead of only on Supabase-backed
// panels. Unlike the v4 portfolio/gpaEntries move, we do NOT null out the old stores here —
// migrateLocalPortfolioLogs() in dataApi.js reads any existing rows out of them at runtime
// (once, gated by a migration flag) and clears them with a plain .clear() after a successful
// upload, which is safer than deleting the object store mid-version-upgrade.
// Also adds: `unitMastery` (quiz-verified pathway unit completions) and `studyEvents` (local-only
// engagement log — lesson video opens, quiz attempts, unit verifications — that powers the new
// Verified Progress view and is the seed schema for the future profiling plan in
// docs/PROFILING_PLAN.md; never transmitted anywhere).
db.version(8).stores({
  unitMastery: '++id, pathwayKey, unitId, verifiedAt',
  studyEvents: '++id, type, refId, ts',
});

// v9: per-pathway pacing goals — a student can optionally set a target number
// of weeks to finish their current pathway's 9 lessons, and the Verified
// Progress view shows an on-pace/behind-pace indicator computed from
// `unitMastery`/`lessons` timestamps against that target. Purely local
// accountability tooling, same as streaks/checkins; never transmitted.
db.version(9).stores({
  pathwayGoals: 'pathwayKey, startedAt, targetWeeks',
});

// v10: Axio multi-chat — conversations used to live only in a single
// in-memory `msgs` array (reset on every reload). Now every conversation is a
// row in `coachThreads` (title, timestamps) with its messages in
// `coachMessages`, so a student can keep several parallel chats (e.g. one for
// SAT Math, one for essay brainstorming) that persist across sessions.
db.version(10).stores({
  coachThreads:  '++id, updatedAt',
  coachMessages: '++id, threadId, ts',
});

// ── User ─────────────────────────────────────────────────────────────────────
export async function getUser() {
  return db.user.toCollection().first();
}
export async function saveUser(u) {
  const existing = await db.user.toCollection().first();
  if (existing) await db.user.update(existing.id, u);
  else await db.user.add({ ...u });
  pushDirty();
}

// ── Pathway ───────────────────────────────────────────────────────────────────
// Rows carry `verified`/`quizScore`/`studying` alongside the original `completedAt` so lessons
// that have a curated verification quiz (constants.js `quizIds`) can be told apart from the
// old self-report-only lessons — every existing `pathway[lesson.id]` truthy check in App.jsx
// still works unchanged since the returned value is always a truthy object once a row exists.
export async function getPathway() {
  const rows = await db.lessons.toArray();
  return Object.fromEntries(rows.map(r => [r.lessonId, {
    completedAt: r.completedAt || null, verified: !!r.verified, quizScore: r.quizScore ?? null,
    studying: !!r.studying, studyStartedAt: r.studyStartedAt || null,
  }]));
}
export async function setLessonDone(lessonId) {
  await db.lessons.put({ lessonId, completedAt: Date.now(), verified: false, studying: false });
  pushDirty();
}
// Called when a student opens a lesson's video/resource — marks it "in progress" without
// counting toward mastery, so credibility isn't granted just for opening a link.
export async function startLessonStudy(lessonId) {
  const existing = await db.lessons.get(lessonId);
  if (existing?.verified) return;
  await db.lessons.put({ lessonId, completedAt: existing?.completedAt || null, verified: false, studying: true, studyStartedAt: Date.now() });
  pushDirty();
}
// Called when a student passes a lesson's curated verification quiz — this is the only path
// that sets `verified: true`, which is what unit-unlock gating and the Progress tab's Verified
// Progress view actually check.
export async function verifyLesson(lessonId, quizScore) {
  await db.lessons.put({ lessonId, completedAt: Date.now(), verified: true, quizScore, studying: false });
  pushDirty();
}
export async function resetPathway() {
  await db.lessons.clear();
  pushDirty();
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
  pushDirty();
}
export async function resetQuizScores() {
  await db.quizScores.clear();
  pushDirty();
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
  // First time we see this deck name, stamp it so it can be sorted
  // newest-first in the deck list. Re-saves (editing cards) don't bump it.
  const existing = await db.deckMeta.get(deckName);
  if (!existing) await db.deckMeta.put({ name: deckName, createdAt: Date.now() });
  pushDirty();
}
export async function updateCard(id, updates) {
  await db.flashCards.update(id, updates);
  pushDirty();
}
export async function deleteDeck(deckName) {
  await db.flashCards.where('deckName').equals(deckName).delete();
  await db.deckMeta.delete(deckName);
  pushDirty();
}
export async function getDeckCreatedAtMap() {
  const rows = await db.deckMeta.toArray();
  return Object.fromEntries(rows.map(r => [r.name, r.createdAt]));
}
export async function recordCardReview(cardId) {
  await db.cardReviews.add({ cardId, reviewedAt: Date.now() });
  pushDirty();
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
  pushDirty();
}
export async function resetCatPerf() {
  await db.catPerf.clear();
  pushDirty();
}

// ── Achievements ──────────────────────────────────────────────────────────────
export async function getAchievements() {
  const rows = await db.achievements.toArray();
  return new Set(rows.map(r => r.key));
}
export async function unlockAchievement(key) {
  try {
    await db.achievements.add({ key, unlockedAt: Date.now() });
    pushDirty();
    return true; // newly unlocked
  } catch {
    return false; // already existed
  }
}

// ── Streak / Study Days ────────────────────────────────────────────────────────
export async function recordStudyToday() {
  const today = new Date().toISOString().split('T')[0];
  try { await db.studyDays.add({ date: today }); pushDirty(); } catch { /* already exists */ }
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
  pushDirty();
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
  pushDirty();
  return true;
}

// ── Daily Check-in ────────────────────────────────────────────────────────────
export async function getCheckin(date) {
  return db.checkins.get(date);
}
export async function recordCheckin(date, day) {
  try { await db.checkins.add({ date, day }); pushDirty(); return true; } catch { return false; }
}
// Whether the user has ever claimed/seen a check-in before — distinguishes a
// genuinely first-ever chest (day 1, "Welcome") from a cycle restarting at
// day 1 after a long absence ("Welcome back").
export async function hasAnyCheckin() {
  return (await db.checkins.count()) > 0;
}

// ── Cosmetics (chest-reveal unlocks) ─────────────────────────────────────────
export async function getCosmetics() {
  const rows = await db.cosmetics.toArray();
  return new Set(rows.map(r => r.key));
}
export async function unlockCosmetic(key) {
  try { await db.cosmetics.add({ key, unlockedAt: Date.now() }); pushDirty(); return true; } catch { return false; }
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

// Used only by dataApi.migrateLocalPortfolioLogs() once local rows are confirmed uploaded to
// the Supabase-backed clinical_hours/recommenders resources — see db.js v8 comment above.
export async function clearClinicalHoursLocal() { await db.clinicalHours.clear(); }
export async function clearRecommendersLocal() { await db.recommenders.clear(); }

// ── Unit Mastery (quiz-verified pathway completion) ──────────────────────────
export async function getUnitMastery(pathwayKey) {
  const rows = await db.unitMastery.where('pathwayKey').equals(pathwayKey).toArray();
  return Object.fromEntries(rows.map(r => [r.unitId, r]));
}
export async function getAllUnitMastery() {
  return db.unitMastery.toArray();
}
export async function verifyUnit(pathwayKey, unitId, quizId, score) {
  const existing = await db.unitMastery.where({ pathwayKey, unitId }).first();
  const row = { pathwayKey, unitId, quizId, score, verifiedAt: Date.now() };
  if (existing) await db.unitMastery.update(existing.id, row);
  else await db.unitMastery.add(row);
  pushDirty();
}

// ── Pathway Pacing Goals ──────────────────────────────────────────────────────
// One row per pathway a student has set a goal for (a student can only be actively
// enrolled in one pathway at a time via specialty, but a prior pathway's goal row
// is left alone rather than deleted if they switch, so switching back restores it).
export async function getPathwayGoal(pathwayKey) {
  return db.pathwayGoals.get(pathwayKey);
}
export async function setPathwayGoal(pathwayKey, targetWeeks) {
  await db.pathwayGoals.put({ pathwayKey, startedAt: Date.now(), targetWeeks });
  pushDirty();
}
export async function clearPathwayGoal(pathwayKey) {
  await db.pathwayGoals.delete(pathwayKey);
  pushDirty();
}

// ── Local study-event log (Part C profiling groundwork; never transmitted) ───
export async function logStudyEvent(type, refId) {
  await db.studyEvents.add({ type, refId, ts: Date.now() });
}
export async function getStudyEvents(type) {
  return type ? db.studyEvents.where('type').equals(type).toArray() : db.studyEvents.toArray();
}

// ── Interview Practice Sessions (Standard/MMI/CASPer) ─────────────────────────
export async function getInterviewSessions() {
  return db.interviewSessions.orderBy('completedAt').reverse().toArray();
}
export async function addInterviewSession(entry) {
  return db.interviewSessions.add({ ...entry, completedAt: Date.now() });
}

// ── Axio Chat Threads ────────────────────────────────────────────────
// A student can run as many parallel Axio conversations as they want —
// each is its own row here plus a run of rows in coachMessages, so switching
// threads is just a different IndexedDB query, and nothing is lost on reload.
export async function getCoachThreads() {
  return db.coachThreads.orderBy('updatedAt').reverse().toArray();
}
export async function createCoachThread(title = 'New chat') {
  const now = Date.now();
  const id = await db.coachThreads.add({ title, createdAt: now, updatedAt: now });
  pushDirty();
  return { id, title, createdAt: now, updatedAt: now };
}
export async function renameCoachThread(id, title) {
  await db.coachThreads.update(id, { title });
  pushDirty();
}
export async function touchCoachThread(id) {
  await db.coachThreads.update(id, { updatedAt: Date.now() });
  pushDirty();
}
export async function deleteCoachThread(id) {
  await db.coachMessages.where('threadId').equals(id).delete();
  await db.coachThreads.delete(id);
  pushDirty();
}
// Scoped alternative to a full account wipe — clears every Axio conversation without touching
// XP, streak, quiz scores, flashcards, or pathway progress.
export async function clearAllCoachThreads() {
  await db.coachMessages.clear();
  await db.coachThreads.clear();
  pushDirty();
}
export async function getCoachMessages(threadId) {
  return db.coachMessages.where('threadId').equals(threadId).sortBy('ts');
}
export async function addCoachMessage(threadId, role, content) {
  const ts = Date.now();
  const id = await db.coachMessages.add({ threadId, role, content, ts });
  await touchCoachThread(threadId);
  return { id, threadId, role, content, ts };
}
// ── Cross-device progress sync ────────────────────────────────────────────────
// Builds/restores a JSON-safe snapshot covering every store that should follow a student across
// browsers/devices (see api/progress-sync.js + src/lib/progressSync.js for the network side).
// Deliberately excludes the local-only `studyEvents` behavioral log (docs/PROFILING_PLAN.md
// Phase 1 scope — no granular behavioral tracking leaves the device without a dedicated consent
// flow) and raw per-card review identifiers (a card's local auto-increment id means nothing on
// another device) — reviews fold into a per-date count instead, which is all "reviewed this
// week" style stats actually need.
const SYNC_VERSION = 1;

function dateKeyOf(ms) { return new Date(ms).toISOString().split('T')[0]; }

export async function buildSyncSnapshot() {
  const [
    user, lessons, quizScores, flashCards, deckMetaRows, catPerf, achievements,
    studyDays, cardReviews, streakFreezes, checkins, cosmetics, unitMastery,
    pathwayGoals, coachThreads, coachMessages,
  ] = await Promise.all([
    db.user.toCollection().first(), db.lessons.toArray(), db.quizScores.toArray(),
    db.flashCards.toArray(), db.deckMeta.toArray(), db.catPerf.toArray(),
    db.achievements.toArray(), db.studyDays.toArray(), db.cardReviews.toArray(),
    db.streakFreezes.toArray(), db.checkins.toArray(), db.cosmetics.toArray(),
    db.unitMastery.toArray(), db.pathwayGoals.toArray(), db.coachThreads.toArray(),
    db.coachMessages.toArray(),
  ]);

  const reviewCountsByDate = {};
  for (const r of cardReviews) {
    const k = dateKeyOf(r.reviewedAt);
    reviewCountsByDate[k] = (reviewCountsByDate[k] || 0) + 1;
  }
  const flashDecks = {};
  for (const c of flashCards) {
    const { id, ...rest } = c;
    (flashDecks[c.deckName] ||= []).push(rest);
  }
  const messagesByThread = {};
  for (const m of coachMessages) {
    (messagesByThread[m.threadId] ||= []).push({ role: m.role, content: m.content, ts: m.ts });
  }

  return {
    v: SYNC_VERSION,
    user: user ? (({ id, ...rest }) => rest)(user) : null,
    lessons: lessons.map(({ lessonId, completedAt, verified, quizScore, studying, studyStartedAt }) =>
      ({ lessonId, completedAt: completedAt || null, verified: !!verified, quizScore: quizScore ?? null, studying: !!studying, studyStartedAt: studyStartedAt || null })),
    quizScores: quizScores.map(({ quizId, score, completedAt }) => ({ quizId, score, completedAt })),
    flashDecks,
    deckMeta: deckMetaRows.map(({ name, createdAt }) => ({ name, createdAt })),
    catPerf: catPerf.map(({ category, total, count }) => ({ category, total, count })),
    achievements: achievements.map(({ key, unlockedAt }) => ({ key, unlockedAt })),
    studyDays: studyDays.map(d => d.date),
    reviewCountsByDate,
    streakFreezes: streakFreezes.map(({ earnedAt, usedOn }) => ({ earnedAt, usedOn: usedOn || null })),
    checkins: checkins.map(({ date, day }) => ({ date, day })),
    cosmetics: cosmetics.map(({ key, unlockedAt }) => ({ key, unlockedAt })),
    unitMastery: unitMastery.map(({ pathwayKey, unitId, quizId, score, verifiedAt }) => ({ pathwayKey, unitId, quizId, score, verifiedAt })),
    pathwayGoals: pathwayGoals.map(({ pathwayKey, startedAt, targetWeeks }) => ({ pathwayKey, startedAt, targetWeeks })),
    coachThreads: coachThreads.map(t => ({
      key: t.createdAt, title: t.title, createdAt: t.createdAt, updatedAt: t.updatedAt,
      messages: messagesByThread[t.id] || [],
    })),
  };
}

function mergeUserRecord(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const merged = { ...remote, ...local };
  for (const k of ['xp', 'aiChatCount', 'interviewCount']) {
    merged[k] = Math.max(local[k] || 0, remote[k] || 0);
  }
  for (const k of ['obstacles', 'accomplish', 'courses', 'bookmarks', 'studied']) {
    if (Array.isArray(local[k]) || Array.isArray(remote[k])) {
      merged[k] = Array.from(new Set([...(remote[k] || []), ...(local[k] || [])]));
    }
  }
  if (local.resourceNotes || remote.resourceNotes) {
    merged.resourceNotes = { ...(remote.resourceNotes || {}), ...(local.resourceNotes || {}) };
  }
  return merged;
}

// Higher reps / a further-out due date means more real study progress on that specific card —
// used to pick the "more advanced" copy when the same card (by front+back text) exists on two
// devices independently.
function fsrsWeight(card) {
  return (card.reps || 0) * 1e15 + (card.due ? new Date(card.due).getTime() : 0);
}

/**
 * Merges a freshly-pulled remote snapshot into whatever is already in this browser's Dexie
 * tables (empty, in the common "signing in on a new device" case) and writes the merged result
 * back. Safe to call with remote=null (no-op). Sync push scheduling should stay disabled for
 * the duration of this call (see setSyncEnabled) so this write-back never triggers a push of
 * its own intermediate state.
 */
export async function applyRemoteSnapshot(remote) {
  if (!remote) return;

  const [
    localUser, localLessons, localQuizScores, localFlashRows, localDeckMeta,
    localCatPerf, localAchievements, localStudyDays, localCardReviews,
    localStreakFreezes, localCheckins, localCosmetics, localUnitMastery,
    localPathwayGoals, localCoachThreads, localCoachMessages,
  ] = await Promise.all([
    db.user.toCollection().first(), db.lessons.toArray(), db.quizScores.toArray(),
    db.flashCards.toArray(), db.deckMeta.toArray(), db.catPerf.toArray(),
    db.achievements.toArray(), db.studyDays.toArray(), db.cardReviews.toArray(),
    db.streakFreezes.toArray(), db.checkins.toArray(), db.cosmetics.toArray(),
    db.unitMastery.toArray(), db.pathwayGoals.toArray(), db.coachThreads.toArray(),
    db.coachMessages.toArray(),
  ]);

  // ── profile / XP ──
  const mergedUser = mergeUserRecord(localUser, remote.user);
  if (mergedUser) await saveUser(mergedUser);

  // ── pathway / lessons ──
  const lessonMap = new Map(localLessons.map(r => [r.lessonId, r]));
  for (const r of (remote.lessons || [])) {
    const l = lessonMap.get(r.lessonId);
    if (!l) { lessonMap.set(r.lessonId, r); continue; }
    const bothScores = [l.quizScore, r.quizScore].filter(s => s != null);
    const bothCompleted = [l.completedAt, r.completedAt].filter(Boolean).sort((a, b) => a - b);
    const bothStarted = [l.studyStartedAt, r.studyStartedAt].filter(Boolean).sort((a, b) => a - b);
    const verified = !!(l.verified || r.verified);
    lessonMap.set(r.lessonId, {
      lessonId: r.lessonId,
      verified,
      quizScore: bothScores.length ? Math.max(...bothScores) : null,
      completedAt: bothCompleted[0] || null,
      studying: verified ? false : !!(l.studying || r.studying),
      studyStartedAt: bothStarted[0] || null,
    });
  }
  await db.lessons.clear();
  if (lessonMap.size) await db.lessons.bulkPut([...lessonMap.values()]);

  // ── quiz scores ──
  const quizMap = new Map(localQuizScores.map(r => [r.quizId, r]));
  for (const r of (remote.quizScores || [])) {
    const l = quizMap.get(r.quizId);
    if (!l || r.score > l.score || (r.score === l.score && r.completedAt < l.completedAt)) quizMap.set(r.quizId, r);
  }
  await db.quizScores.clear();
  if (quizMap.size) await db.quizScores.bulkPut([...quizMap.values()]);

  // ── flashcard decks (merged per-deck by front+back content signature) ──
  const localByDeck = {};
  for (const c of localFlashRows) (localByDeck[c.deckName] ||= []).push(c);
  const deckNames = new Set([...Object.keys(localByDeck), ...Object.keys(remote.flashDecks || {})]);
  for (const deckName of deckNames) {
    const localCards = localByDeck[deckName] || [];
    const remoteCards = (remote.flashDecks || {})[deckName] || [];
    const bySig = new Map();
    for (const c of localCards) bySig.set(`${c.front}␟${c.back}`, c);
    for (const c of remoteCards) {
      const sig = `${c.front}␟${c.back}`;
      const existing = bySig.get(sig);
      if (!existing || fsrsWeight(c) > fsrsWeight(existing)) bySig.set(sig, c);
    }
    await db.flashCards.where('deckName').equals(deckName).delete();
    const merged = [...bySig.values()].map(({ id, ...rest }) => ({ ...rest, deckName }));
    if (merged.length) await db.flashCards.bulkAdd(merged);
  }

  // ── deck creation timestamps ──
  const deckMetaMap = new Map(localDeckMeta.map(r => [r.name, r]));
  for (const r of (remote.deckMeta || [])) {
    const l = deckMetaMap.get(r.name);
    if (!l || r.createdAt < l.createdAt) deckMetaMap.set(r.name, r);
  }
  await db.deckMeta.clear();
  if (deckMetaMap.size) await db.deckMeta.bulkPut([...deckMetaMap.values()]);

  // ── category performance (additive — see docs note in progressSync.js) ──
  const catMap = new Map(localCatPerf.map(r => [r.category, { ...r }]));
  for (const r of (remote.catPerf || [])) {
    const l = catMap.get(r.category);
    if (l) { l.total += r.total; l.count += r.count; }
    else catMap.set(r.category, { ...r });
  }
  await db.catPerf.clear();
  if (catMap.size) await db.catPerf.bulkPut([...catMap.values()]);

  // ── achievements ──
  const achMap = new Map(localAchievements.map(r => [r.key, r]));
  for (const r of (remote.achievements || [])) {
    const l = achMap.get(r.key);
    if (!l || r.unlockedAt < l.unlockedAt) achMap.set(r.key, r);
  }
  await db.achievements.clear();
  if (achMap.size) await db.achievements.bulkPut([...achMap.values()]);

  // ── streak calendar ──
  const dayKeys = new Set([...localStudyDays.map(r => r.date), ...(remote.studyDays || [])]);
  await db.studyDays.clear();
  if (dayKeys.size) await db.studyDays.bulkPut([...dayKeys].map(date => ({ date })));

  // ── review counts -> synthetic per-day cardReviews rows (see buildSyncSnapshot comment) ──
  const localCounts = {};
  for (const r of localCardReviews) { const k = dateKeyOf(r.reviewedAt); localCounts[k] = (localCounts[k] || 0) + 1; }
  const dateSet = new Set([...Object.keys(localCounts), ...Object.keys(remote.reviewCountsByDate || {})]);
  const mergedReviewRows = [];
  for (const date of dateSet) {
    const n = Math.max(localCounts[date] || 0, (remote.reviewCountsByDate || {})[date] || 0);
    const ts = new Date(`${date}T12:00:00.000Z`).getTime();
    for (let i = 0; i < n; i++) mergedReviewRows.push({ cardId: null, reviewedAt: ts });
  }
  await db.cardReviews.clear();
  if (mergedReviewRows.length) await db.cardReviews.bulkAdd(mergedReviewRows);

  // ── streak freezes ──
  const freezeMap = new Map(localStreakFreezes.map(r => [r.earnedAt, r]));
  for (const r of (remote.streakFreezes || [])) {
    const l = freezeMap.get(r.earnedAt);
    freezeMap.set(r.earnedAt, { earnedAt: r.earnedAt, usedOn: (l && l.usedOn) || r.usedOn || null });
  }
  await db.streakFreezes.clear();
  if (freezeMap.size) await db.streakFreezes.bulkPut([...freezeMap.values()]);

  // ── daily check-ins ──
  const checkinMap = new Map(localCheckins.map(r => [r.date, r]));
  for (const r of (remote.checkins || [])) if (!checkinMap.has(r.date)) checkinMap.set(r.date, r);
  await db.checkins.clear();
  if (checkinMap.size) await db.checkins.bulkPut([...checkinMap.values()]);

  // ── cosmetics ──
  const cosMap = new Map(localCosmetics.map(r => [r.key, r]));
  for (const r of (remote.cosmetics || [])) {
    const l = cosMap.get(r.key);
    if (!l || r.unlockedAt < l.unlockedAt) cosMap.set(r.key, r);
  }
  await db.cosmetics.clear();
  if (cosMap.size) await db.cosmetics.bulkPut([...cosMap.values()]);

  // ── unit mastery ──
  const unitMap = new Map(localUnitMastery.map(r => [`${r.pathwayKey}::${r.unitId}`, r]));
  for (const r of (remote.unitMastery || [])) {
    const k = `${r.pathwayKey}::${r.unitId}`;
    const l = unitMap.get(k);
    if (!l || (r.score || 0) > (l.score || 0)) {
      const verifiedAtCandidates = [l?.verifiedAt, r.verifiedAt].filter(Boolean).sort((a, b) => a - b);
      unitMap.set(k, { ...r, verifiedAt: verifiedAtCandidates[0] || r.verifiedAt });
    }
  }
  await db.unitMastery.clear();
  if (unitMap.size) await db.unitMastery.bulkPut([...unitMap.values()]);

  // ── pathway pacing goals ──
  const goalMap = new Map(localPathwayGoals.map(r => [r.pathwayKey, r]));
  for (const r of (remote.pathwayGoals || [])) {
    const l = goalMap.get(r.pathwayKey);
    if (!l || r.startedAt < l.startedAt) goalMap.set(r.pathwayKey, r);
  }
  await db.pathwayGoals.clear();
  if (goalMap.size) await db.pathwayGoals.bulkPut([...goalMap.values()]);

  // ── Axio chat threads (merged by creation time; thread/message ids are per-device) ──
  const localMsgsByThread = {};
  for (const m of localCoachMessages) (localMsgsByThread[m.threadId] ||= []).push(m);
  const localThreadByKey = new Map(localCoachThreads.map(t => [t.createdAt, t]));
  for (const rt of (remote.coachThreads || [])) {
    const existing = localThreadByKey.get(rt.key);
    if (existing) {
      const existingMsgs = localMsgsByThread[existing.id] || [];
      const seen = new Set(existingMsgs.map(m => `${m.role}␟${m.ts}`));
      const toAdd = (rt.messages || []).filter(m => !seen.has(`${m.role}␟${m.ts}`));
      if (toAdd.length) await db.coachMessages.bulkAdd(toAdd.map(m => ({ threadId: existing.id, role: m.role, content: m.content, ts: m.ts })));
      if ((rt.updatedAt || 0) > (existing.updatedAt || 0)) await db.coachThreads.update(existing.id, { updatedAt: rt.updatedAt });
    } else {
      const newId = await db.coachThreads.add({ title: rt.title, createdAt: rt.createdAt, updatedAt: rt.updatedAt });
      if ((rt.messages || []).length) {
        await db.coachMessages.bulkAdd(rt.messages.map(m => ({ threadId: newId, role: m.role, content: m.content, ts: m.ts })));
      }
    }
  }
}

// ── Sync push scheduling ──────────────────────────────────────────────────────
// src/lib/progressSync.js registers a listener here once at app start; every exported mutator
// below that touches a synced table calls pushDirty() so a debounced push follows automatically
// without every call site in App.jsx needing to remember to trigger one. Kept disabled during
// account-switch resets and while applyRemoteSnapshot() is writing back a just-pulled snapshot,
// so neither ever pushes a partial (or, in the account-switch case, empty) snapshot over real
// cloud progress.
let dirtyListener = null;
let syncEnabled = false;
export function setSyncDirtyListener(fn) { dirtyListener = fn; }
export function setSyncEnabled(on) { syncEnabled = !!on; }
export function isSyncEnabled() { return syncEnabled; }
function pushDirty() { if (syncEnabled && dirtyListener) dirtyListener(); }

// ── Full export ────────────────────────────────────────────────────────────────
export async function exportAllData() {
  const data = {
    user: await db.user.toArray(),
    lessons: await db.lessons.toArray(),
    quizScores: await db.quizScores.toArray(),
    achievements: await db.achievements.toArray(),
    studyDays: await db.studyDays.toArray(),
    interviewSessions: await db.interviewSessions.toArray(),
    unitMastery: await db.unitMastery.toArray(),
    pathwayGoals: await db.pathwayGoals.toArray(),
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
    db.deckMeta.clear(), db.unitMastery.clear(), db.studyEvents.clear(),
    db.pathwayGoals.clear(), db.coachThreads.clear(), db.coachMessages.clear(),
  ]);
}
