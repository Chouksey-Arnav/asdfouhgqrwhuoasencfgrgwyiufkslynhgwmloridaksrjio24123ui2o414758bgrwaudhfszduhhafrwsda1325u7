// ─────────────────────────────────────────────────────────────────────────────
// Recent-activity digest — turns the local studyEvents log (src/lib/eventLog.js,
// Dexie `studyEvents` table, docs/PROFILING_PLAN.md Phase 1) into one compact,
// human-readable line MedaBrain can reference on every surface: the head coach,
// the Prep/Portfolio/SAT specialists, and plan generation. Before this existed,
// the log only powered the Verified Progress view — nothing MedaBrain said ever
// referenced it, so a student's day-to-day activity across quizzes, flashcards,
// SAT practice, and Portfolio never visibly fed back into what MedaBrain "knew."
// This is what closes that loop: every surface can now say "I saw you did X
// yesterday" instead of only ever citing onboarding answers and static counts.
import * as DB from './db';

const EVENT_LABELS = {
  quiz_scored: { unit: 'practice quiz', plural: 'practice quizzes' },
  quiz_attempt: { unit: 'verification quiz attempt', plural: 'verification quiz attempts' },
  unit_lesson_verified: { unit: 'lesson verified', plural: 'lessons verified' },
  unit_verified: { unit: 'pathway unit completed', plural: 'pathway units completed' },
  lesson_video_watched: { unit: 'lesson studied', plural: 'lessons studied' },
  flashcard_reviewed: { unit: 'flashcard reviewed', plural: 'flashcards reviewed' },
  sat_attempt_completed: { unit: 'SAT practice session', plural: 'SAT practice sessions' },
  sat_diagnostic_completed: { unit: 'SAT diagnostic taken', plural: 'SAT diagnostics taken' },
  sat_baseline_completed: { unit: 'SAT baseline test taken', plural: 'SAT baseline tests taken' },
  pathway_diagnostic_completed: { unit: 'pathway diagnostic taken', plural: 'pathway diagnostics taken' },
  portfolio_item_added: { unit: 'Portfolio item added', plural: 'Portfolio items added' },
  interview_session_completed: { unit: 'mock interview completed', plural: 'mock interviews completed' },
  coach_message_sent: { unit: 'question asked in chat', plural: 'questions asked in chat' },
};

// Fixed order (most concrete/effortful first) so the digest reads consistently
// regardless of the order studyEvents happened to come back in.
const EVENT_ORDER = [
  'quiz_scored', 'quiz_attempt', 'unit_lesson_verified', 'unit_verified', 'lesson_video_watched',
  'flashcard_reviewed', 'sat_attempt_completed', 'sat_diagnostic_completed', 'sat_baseline_completed',
  'pathway_diagnostic_completed', 'portfolio_item_added', 'interview_session_completed', 'coach_message_sent',
];

function phrase(type, count) {
  const meta = EVENT_LABELS[type];
  if (!meta) return null;
  return `${count} ${count === 1 ? meta.unit : meta.plural}`;
}

// Reads the local studyEvents log and returns a compact digest of what a student
// has actually done in the last `days` days, or null if nothing was logged in
// that window — callers should skip the block entirely rather than print an
// empty "nothing happened" line.
export async function summarizeRecentActivity(days = 7) {
  let events;
  try {
    events = await DB.getStudyEvents();
  } catch {
    return null;
  }
  if (!events?.length) return null;
  const cutoff = Date.now() - days * 86400000;
  const recent = events.filter(e => e.ts >= cutoff);
  if (!recent.length) return null;

  const counts = {};
  for (const e of recent) counts[e.type] = (counts[e.type] || 0) + 1;
  const parts = EVENT_ORDER.map(type => (counts[type] ? phrase(type, counts[type]) : null)).filter(Boolean);
  if (!parts.length) return null;

  const lastActiveAt = Math.max(...recent.map(e => e.ts));
  const hoursSinceActive = (Date.now() - lastActiveAt) / 3600000;
  const recencyNote = hoursSinceActive < 20 ? ' (most recently today)' : hoursSinceActive < 44 ? ' (most recently yesterday)' : '';
  const text = `In the last ${days} days across the app: ${parts.join(', ')}${recencyNote}.`;

  return { text, counts, totalEvents: recent.length, lastActiveAt };
}
