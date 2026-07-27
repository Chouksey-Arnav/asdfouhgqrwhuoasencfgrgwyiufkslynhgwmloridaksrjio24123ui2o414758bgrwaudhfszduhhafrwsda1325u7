// ─────────────────────────────────────────────────────────────────────────────
// Personal Brief — "Tell Medabrain about yourself"
//
// Everything a student says about themselves in their OWN words, spoken or
// typed, kept as an append-only log on the user record. This is deliberately
// unstructured: onboarding gives us tidy multiple-choice answers, but the
// things that actually change coaching ("my mom is a nurse and I've shadowed
// her since I was 12", "I bomb timed sections because of anxiety", "I'm
// applying to Duke ED") never fit a dropdown.
//
// The contract with the AI layer is that this block outranks everything else.
// If the brief says the student is targeting Duke ED and an onboarding answer
// implies otherwise, the brief wins — the student told us directly, and more
// recently. Every Medabrain surface in the app (head coach, Portfolio, Prep,
// SAT, plan generation) folds this in through buildPersonalBriefBlock().
//
// Pure functions + a small persistence helper. The entries live on the user
// object so they ride along with the existing DB.saveUser() sync path rather
// than needing their own table.
// ─────────────────────────────────────────────────────────────────────────────

// Individual utterances are capped so one runaway dictation can't eat the whole
// system-prompt budget, and the log is capped so the block stays bounded as it
// grows over months of use. Both are generous: a student talking for two
// minutes lands around 1,800 characters.
export const BRIEF_ENTRY_MAX_CHARS = 2000;
export const BRIEF_MAX_ENTRIES = 40;
// How much of the brief is allowed into a single system prompt. When the log
// outgrows this we keep the most recent entries (see buildPersonalBriefBlock),
// because recency is the best available proxy for "still true".
export const BRIEF_PROMPT_MAX_CHARS = 2600;

const uid = () => `pb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Normalized entry list for a user. Always an array, newest last. */
export function getBriefEntries(user) {
  const raw = user?.personalBrief?.entries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(e => e && typeof e.text === 'string' && e.text.trim())
    .map(e => ({
      id: e.id || uid(),
      text: String(e.text).trim().slice(0, BRIEF_ENTRY_MAX_CHARS),
      at: Number(e.at) || 0,
      source: e.source === 'voice' ? 'voice' : 'text',
      pinned: !!e.pinned,
    }));
}

/**
 * Returns a NEW user object with `text` appended to the brief.
 * Caller is responsible for persisting (App.jsx's saveUser).
 */
export function addBriefEntry(user, text, source = 'text') {
  const clean = String(text || '').trim().slice(0, BRIEF_ENTRY_MAX_CHARS);
  if (!clean) return user;
  const entries = [...getBriefEntries(user), { id: uid(), text: clean, at: Date.now(), source, pinned: false }];
  // Trim the oldest UNPINNED entries first — a student who pinned "I have an
  // IEP with extended time" should never lose it to log rotation.
  while (entries.length > BRIEF_MAX_ENTRIES) {
    const dropIdx = entries.findIndex(e => !e.pinned);
    entries.splice(dropIdx === -1 ? 0 : dropIdx, 1);
  }
  return { ...user, personalBrief: { entries, updatedAt: Date.now() } };
}

export function updateBriefEntry(user, id, text) {
  const clean = String(text || '').trim().slice(0, BRIEF_ENTRY_MAX_CHARS);
  const entries = getBriefEntries(user).map(e => (e.id === id ? { ...e, text: clean || e.text, editedAt: Date.now() } : e));
  return { ...user, personalBrief: { entries, updatedAt: Date.now() } };
}

export function removeBriefEntry(user, id) {
  const entries = getBriefEntries(user).filter(e => e.id !== id);
  return { ...user, personalBrief: { entries, updatedAt: Date.now() } };
}

export function togglePinBriefEntry(user, id) {
  const entries = getBriefEntries(user).map(e => (e.id === id ? { ...e, pinned: !e.pinned } : e));
  return { ...user, personalBrief: { entries, updatedAt: Date.now() } };
}

export function clearBrief(user) {
  return { ...user, personalBrief: { entries: [], updatedAt: Date.now() } };
}

/** Rough "how much has this student told us" signal for dashboards/nudges. */
export function briefStats(user) {
  const entries = getBriefEntries(user);
  const chars = entries.reduce((n, e) => n + e.text.length, 0);
  return {
    count: entries.length,
    chars,
    words: entries.reduce((n, e) => n + e.text.split(/\s+/).filter(Boolean).length, 0),
    lastAt: entries.length ? Math.max(...entries.map(e => e.at)) : null,
    // Deliberately forgiving thresholds — the point is to encourage a first
    // pass, not to gate coaching behind a word count.
    depth: chars >= 1200 ? 'rich' : chars >= 400 ? 'good' : chars > 0 ? 'started' : 'empty',
  };
}

const dateLabel = (ts) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

/**
 * The system-prompt block. Returns '' when the student hasn't said anything
 * yet, so callers can concatenate unconditionally.
 *
 * Pinned entries always survive the character budget; after that we keep the
 * newest, because a brief is a running conversation and the recent end of it
 * is the part most likely to still describe the student accurately.
 */
export function buildPersonalBriefBlock(user) {
  const entries = getBriefEntries(user);
  if (!entries.length) return '';

  const pinned = entries.filter(e => e.pinned);
  const rest = entries.filter(e => !e.pinned).sort((a, b) => b.at - a.at); // newest first

  const chosen = [];
  let budget = BRIEF_PROMPT_MAX_CHARS;
  for (const e of [...pinned, ...rest]) {
    if (e.text.length > budget) continue;
    chosen.push(e);
    budget -= e.text.length + 24; // + framing overhead per line
  }
  if (!chosen.length) {
    // One entry longer than the whole budget — take the newest, truncated.
    chosen.push({ ...entries[entries.length - 1], text: entries[entries.length - 1].text.slice(0, BRIEF_PROMPT_MAX_CHARS) });
  }
  chosen.sort((a, b) => a.at - b.at); // chronological in the prompt

  const lines = chosen.map(e => `- ${dateLabel(e.at) ? `(${dateLabel(e.at)}) ` : ''}${e.pinned ? '[PINNED] ' : ''}"${e.text}"`).join('\n');
  const omitted = entries.length - chosen.length;

  return `\n\n══ WHAT ${(user?.name || 'THIS STUDENT').toUpperCase().split(' ')[0]} HAS TOLD YOU ABOUT THEMSELVES (HIGHEST PRIORITY — TREAT AS GROUND TRUTH) ══
These are the student's own words, spoken or typed directly to you in the "Tell Medabrain about yourself" panel. This is the most authoritative thing you know about them.

${lines}${omitted > 0 ? `\n(+${omitted} older entr${omitted === 1 ? 'y' : 'ies'} not shown)` : ''}

How to use this block:
- It OUTRANKS onboarding answers, tracked data, and your own assumptions wherever they conflict. If they said here that they are applying early decision to Duke, that is true even if their college list is empty — the tracker is just behind.
- Where two entries conflict, the more recent one wins; the older one is history, not a contradiction to point out.
- Use it proactively. Reference their actual situation, constraints, family, anxieties, interests and goals in your answers instead of waiting to be asked about them, and pitch examples at things they've told you they care about.
- Never repeat sensitive things they've shared back at them gratuitously, and never treat a hardship they mentioned as a limit on what they can do.
- If something here is clearly out of date (they mention a test date that has passed), gently ask rather than silently assuming.`;
}
