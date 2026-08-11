// ── What the student has written down, in a form a prompt can carry ───────────
//
// Notes and highlights are the two things a student produces while studying that are entirely
// theirs, and both were already being stored and then ignored by everything except the screen
// they were made on. These builders are what let Medabrain actually remember them.
//
// They live here rather than in studentProfile.js for one practical reason: studentProfile.js
// imports a React component, so it cannot be loaded outside a bundler, and these two functions
// carry rules worth asserting directly (see scripts/verifyPathwayEngagement.mjs).

/**
 * Compact, prompt-ready digests of everything a student has written down or marked up across
 * their whole pathway — the raw tables are far too large to inline, and most of their value is
 * in the shape rather than the full text.
 *
 * Both cap hard and say when they've capped: a truncated list presented as complete is how a
 * model ends up confidently asserting a student never wrote about something they did.
 */
export function buildNotesDigest(notesByLesson = {}, lessonTitleFor = (id) => id, { limit = 8, chars = 260 } = {}) {
  const entries = Object.entries(notesByLesson).filter(([, text]) => (text || '').trim());
  if (!entries.length) return null;
  const shown = entries.slice(0, limit);
  const lines = shown.map(([id, text]) => `- On "${lessonTitleFor(id)}": "${text.trim().slice(0, chars)}${text.trim().length > chars ? '…' : ''}"`);
  const more = entries.length - shown.length;
  return `They have written notes on ${entries.length} lesson(s).\n${lines.join('\n')}${more > 0 ? `\n(+${more} more lesson(s) with notes, not shown.)` : ''}\nThese are theirs, in their own words — quote them back, build on them, and never invent one.`;
}

export function buildHighlightsDigest(highlights = [], lessonTitleFor = (id) => id, { limit = 10, chars = 160 } = {}) {
  const usable = highlights.filter((h) => (h?.text || '').trim());
  if (!usable.length) return null;
  const recent = [...usable].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit);
  const lines = recent.map((h) => `- ["${lessonTitleFor(h.lessonId)}"] "${h.text.trim().slice(0, chars)}${h.text.trim().length > chars ? '…' : ''}"`);
  const more = usable.length - recent.length;
  return `They have highlighted ${usable.length} passage(s) across their lessons. Most recent:\n${lines.join('\n')}${more > 0 ? `\n(+${more} older highlight(s), not shown.)` : ''}`;
}
