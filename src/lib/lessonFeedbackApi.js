import { getToken } from './authApi';
import { apiFetch, parseJson } from './http';

// Client for /api/lesson-feedback — the dedicated Supabase log of lesson difficulty answers
// (see supabase/migrations/0012_lesson_feedback.sql).
//
// Everything here is fire-and-forget on purpose. By the time any of it runs, the student's
// answer is already written to IndexedDB and queued into the next progress_sync push, so a
// failed request costs an analytics row and nothing else. Showing someone an error toast
// because we could not log that they found a lesson hard would be a strictly worse product
// than silently retrying next time.

async function post(body) {
  const token = getToken();
  if (!token) return false; // signed out / local-only session — Dexie already has it
  // No retries: this whole module is fire-and-forget (see the note above), the
  // row is already in Dexie and queued for the next progress push, and spending
  // three attempts and six seconds of a flaky connection on an analytics write
  // would compete with the requests the student is actually waiting on.
  const res = await apiFetch('/lesson-feedback', {
    method: 'POST',
    retries: 0,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/**
 * Log one answer. Called twice for a single tap: once the instant the student answers (so the
 * row exists even if they close the tab while Medabrain is generating), and again with
 * `aiText`/`resources` once the reply lands. `clientTs` is the same timestamp used by the
 * local row, and is what makes the second call an update rather than a duplicate.
 */
export async function logLessonFeedback(entry) {
  try {
    return await post({
      lessonId: entry.lessonId,
      lessonTitle: entry.lessonTitle,
      unitId: entry.unitId,
      unitTitle: entry.unitTitle,
      pathwayKey: entry.pathwayKey,
      category: entry.category,
      rating: entry.rating,
      aiText: entry.aiText || null,
      resources: entry.resources || [],
      clientTs: entry.clientTs,
    });
  } catch (err) {
    console.warn('lesson feedback log failed (kept locally):', err?.message || err);
    return false;
  }
}

/** This student's own logged history, newest first. Returns [] on any failure. */
export async function fetchLessonFeedback(lessonId = null) {
  try {
    const token = getToken();
    if (!token) return [];
    const qs = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    const res = await apiFetch(`/lesson-feedback${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await parseJson(res).catch(() => ({}));
    return data?.feedback || [];
  } catch {
    return [];
  }
}
