// ─────────────────────────────────────────────────────────────────────────────
// What happens when a student doesn't clear the bar.
//
// THE PROBLEM THIS FIXES
// Until now, a miss did exactly one thing: nothing. The lesson stayed
// unverified, a toast said "not quite", and the student was returned to the
// same screen with the same button. Two things go wrong there.
//
// First, to a fourteen-year-old an unverified lesson sitting in a list of
// verified ones is not a neutral state — it reads as a small public failure,
// visible every time they open the app. Three of those in a row is one of the
// most common reasons a teenager quietly stops opening a study app at all. They
// don't rage-quit; they just stop, and nothing in the product ever tells us why.
//
// Second, the retry was worthless as assessment. The old code re-served the
// same bank, so a retry measured whether they remembered the answer key.
//
// So a miss now routes somewhere. Specifically:
//   1. Name the CONCEPTS they actually got wrong, not the score.
//   2. Offer a targeted Medabrain re-explanation of exactly those concepts.
//   3. Serve a genuinely DIFFERENT quiz — items they have not seen, tracked
//      per lesson (see markServed/servedStems below and quizPersonalization's
//      `excludeStems`).
//   4. Frame the whole thing as "not yet", never as failed.
//   5. Never surface the attempt to a parent. See parentSafe() and its callers.
//
// Everything here is local-only and per-device on purpose: a miss is the single
// most privacy-sensitive event this app records about a student, and the right
// blast radius for it is the smallest one that still lets the feature work.
// ─────────────────────────────────────────────────────────────────────────────

const SERVED_KEY = 'msp_verify_served';
const MISS_KEY   = 'msp_verify_misses';

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage off — degrade quietly */ }
}

// ── "A different quiz, not the same one" ─────────────────────────────────────
// Tracked by question stem rather than by index, because the draw is seeded and
// stratified: the same stem can land at a different index on the next attempt,
// and an index-based exclusion would happily re-serve it.

/** Record the stems a student has now seen for this lesson. */
export function markServed(lessonId, items) {
  if (!lessonId || !items?.length) return;
  const all = readJSON(SERVED_KEY);
  const seen = new Set(all[lessonId] || []);
  items.forEach(q => { if (q?.q) seen.add(q.q); });
  // Bounded: a student who has genuinely seen most of a 300-item bank should
  // start recycling rather than be handed an empty quiz.
  all[lessonId] = [...seen].slice(-400);
  writeJSON(SERVED_KEY, all);
}

/** Stems this student has already been served for this lesson. */
export function servedStems(lessonId) {
  return new Set(readJSON(SERVED_KEY)[lessonId] || []);
}

/** Cleared on a pass, so a later voluntary re-take starts from the full bank. */
export function clearServed(lessonId) {
  const all = readJSON(SERVED_KEY);
  delete all[lessonId];
  writeJSON(SERVED_KEY, all);
}

// ── Miss analysis ────────────────────────────────────────────────────────────

/**
 * A concept label for one item. Authored items carry `concept` explicitly
 * (see data/quizzes/appliedItems.js). For legacy bank items, fall back to the
 * lesson objective the item most overlaps with, and finally to a trimmed stem —
 * the point is to hand the student something to go relearn, and "the question
 * you got wrong" is a worse but still usable version of that.
 */
export function conceptOf(item, lesson) {
  if (item?.concept) return item.concept;
  const objectives = lesson?.objectives || [];
  if (objectives.length) {
    const text = `${item?.q || ''} ${item?.exp || ''}`.toLowerCase();
    const words = new Set(text.match(/[a-z]{5,}/g) || []);
    let best = null, bestScore = 0;
    objectives.forEach(o => {
      const oWords = (o.toLowerCase().match(/[a-z]{5,}/g) || []);
      const score = oWords.filter(w => words.has(w)).length;
      if (score > bestScore) { bestScore = score; best = o; }
    });
    // Two shared uncommon words is a weak signal but a real one; one is noise.
    if (best && bestScore >= 2) return best;
  }
  const stem = String(item?.q || '').replace(/\s+/g, ' ').trim();
  return stem.length > 90 ? `${stem.slice(0, 87)}…` : stem;
}

/**
 * Turn a finished attempt into the specific things to go back to.
 *
 * @param {Array} answers  QuizEngine's answer records:
 *                         { q, choices, sel, correct, exp, ok, concept?, kind? }
 * @param {object} lesson
 * @returns {{ missed:Array, byConcept:Array, correctCount:number, total:number }}
 */
export function analyzeAttempt(answers, lesson) {
  const rows = answers || [];
  const missed = rows.filter(a => !a.ok).map(a => ({
    stem: a.q,
    exp: a.exp,
    kind: a.kind || null,
    chose: a.choices?.[a.sel] ?? null,
    shouldHave: a.choices?.[a.correct] ?? null,
    concept: a.concept || conceptOf({ q: a.q, exp: a.exp, concept: a.concept }, lesson),
  }));

  // Group by concept. Two misses on one concept is ONE thing to go relearn —
  // presenting it as two separate failures both overstates the damage and
  // makes the recovery list look longer and more hopeless than it is.
  const grouped = new Map();
  missed.forEach(m => {
    const key = m.concept;
    if (!grouped.has(key)) grouped.set(key, { concept: key, items: [] });
    grouped.get(key).items.push(m);
  });
  const byConcept = [...grouped.values()]
    .map(g => ({ ...g, count: g.items.length }))
    .sort((a, b) => b.count - a.count);

  return {
    missed,
    byConcept,
    correctCount: rows.filter(a => a.ok).length,
    total: rows.length,
  };
}

/** Persist the concepts missed on this lesson — read by the flashcard engine. */
export function recordMiss(lessonId, analysis) {
  if (!lessonId) return;
  const all = readJSON(MISS_KEY);
  const prev = all[lessonId] || { concepts: {}, lastAt: null, attempts: 0 };
  (analysis?.byConcept || []).forEach(({ concept, count, items }) => {
    const row = prev.concepts[concept] || { misses: 0, lastAt: null, exp: null };
    row.misses += count;
    row.lastAt = Date.now();
    row.exp = row.exp || items?.[0]?.exp || null;
    prev.concepts[concept] = row;
  });
  prev.lastAt = Date.now();
  prev.attempts = (prev.attempts || 0) + 1;
  all[lessonId] = prev;
  writeJSON(MISS_KEY, all);
}

/** Concepts this student has missed on a lesson, worst first. */
export function missedConcepts(lessonId) {
  const row = readJSON(MISS_KEY)[lessonId];
  if (!row) return [];
  return Object.entries(row.concepts || {})
    .map(([concept, v]) => ({ concept, ...v }))
    .sort((a, b) => b.misses - a.misses);
}

/** Every lesson with outstanding missed concepts — the flashcard engine's feed. */
export function allMissedConcepts() {
  const all = readJSON(MISS_KEY);
  return Object.entries(all).flatMap(([lessonId, row]) =>
    Object.entries(row?.concepts || {}).map(([concept, v]) => ({ lessonId, concept, ...v }))
  );
}

/** Cleared on a pass. The concepts were the point, and they've been cleared. */
export function clearMisses(lessonId) {
  const all = readJSON(MISS_KEY);
  delete all[lessonId];
  writeJSON(MISS_KEY, all);
}

// ── Framing ──────────────────────────────────────────────────────────────────

/**
 * The words shown after a miss. "Not yet" rather than "failed", and never a
 * percentage in the headline — a number invites comparison with a bar, and the
 * bar is not the thing we want them looking at right now.
 *
 * `gap` (how far off they were) changes the copy, because "you were one
 * question away" and "there's real ground to cover here" are honestly different
 * situations and pretending otherwise reads as hollow.
 */
export function notYetCopy({ pct, threshold, conceptCount = 0 }) {
  const gap = (threshold ?? 70) - (pct ?? 0);
  const headline = 'Not yet — a couple of things to go back to first';
  let lead;
  if (gap <= 10) {
    lead = `You were close. ${conceptCount === 1 ? 'One idea' : `${conceptCount} ideas`} didn't land yet, and that's genuinely all that's between you and this one.`;
  } else if (gap <= 25) {
    lead = `${conceptCount === 1 ? 'One idea' : `${conceptCount} ideas`} from this lesson haven't clicked yet. That's normal on a first pass — go at those specifically rather than rereading the whole thing.`;
  } else {
    lead = `A fair bit of this hasn't landed yet, which usually means the lesson went by faster than the material did. Worth going back through it properly — below is exactly where to start.`;
  }
  return { headline, lead };
}

/**
 * The prompt handed to Medabrain for a targeted re-explanation. Deliberately
 * narrow: it names the concepts and forbids re-teaching the whole lesson,
 * because "here's the lesson again" is what the student just failed to learn
 * from and repeating it louder is not a strategy.
 */
export function buildReexplainPrompt(lesson, byConcept) {
  const concepts = (byConcept || []).slice(0, 3).map(c => `- ${c.concept}`).join('\n');
  return [
    `I just took the check quiz for "${lesson?.title || 'this lesson'}" and these specific ideas didn't land:`,
    '',
    concepts || '- (the lesson generally)',
    '',
    'Re-explain just those, differently from how the lesson put it — use a concrete example or an analogy rather than restating the definition. Keep it short. Do not re-teach the rest of the lesson, and please skip the encouragement preamble; I want the explanation.',
  ].join('\n');
}

// ── Adults never see this ────────────────────────────────────────────────────
//
// Nothing in this module reaches a parent-facing surface, and that is enforced
// at the two places it could leak rather than asserted here:
//
//   • Missed attempts are never written to `quizScores` or to the `lessons` row
//     (only a PASS calls DB.verifyLesson), so no failing score can reach the
//     sync snapshot the parent summary is built from in the first place.
//   • api/_lib/parentSummary.js counts `everVerified` rather than the live
//     `verified` flag, so a lesson that slipped back to needs-review after a
//     spaced re-check cannot show up in a parent's dashboard as a number going
//     down. See the comment there for why that specific leak matters most.
//
// The rule those two enforce: a parent may see that a lesson is verified and
// that their child is working. A parent may not see that an attempt happened
// and fell short, how many attempts there were, or the score on a non-passing
// one. A parent reading "tried the Biology quiz twice, didn't pass" produces
// exactly the conversation at dinner that makes a teenager stop using the app,
// and it buys the parent nothing they can act on.
