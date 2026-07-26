// Deterministic shuffling for question presentation.
//
// WHY THIS IS MANDATORY: the stored answer index in the bank is not evenly
// distributed (see the position-balance check in scripts/auditSatBank.mjs).
// Rather than hand-balancing hundreds of authored items — and re-balancing
// every time the bank grows — every question is passed through
// shuffleChoices() before a student sees it. The same approach App.jsx already
// takes for the science quizzes via scrambleQuiz().
//
// Determinism matters: an attempt that is resumed after a refresh, or a
// question revisited from the Review Log, must present its choices in the SAME
// order as before. A plain Math.random() shuffle would reorder them and make
// "you picked B" meaningless. So the order is derived from a seed built out of
// the attempt and question ids.

/** FNV-1a — the same cheap string hash api/groq.js uses for its cache keys. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates using a seeded generator. Returns a new array. */
export function seededShuffle(array, rng) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Present a question with its choices reordered.
 *
 * Returns a NEW question object where `ch`, `ans` and `distractorExp` have all
 * been permuted together — they must stay aligned or the Review Log would show
 * a student the rationale for a choice they did not pick. `choiceOrder` records
 * the mapping back to the original indexes, so a stored response can be
 * interpreted later.
 *
 * SPR (grid-in) questions have no choices and pass through untouched.
 *
 * @param {object} question
 * @param {string|number} seedKey  stable per attempt+question (e.g. attempt id)
 */
export function shuffleChoices(question, seedKey = '') {
  if (!question || question.format !== 'mcq' || !Array.isArray(question.ch)) return question;

  const rng = seededRandom(hashString(`${seedKey}::${question.id}`));
  // Permute the ORIGINAL indexes, then rebuild each parallel array from that
  // single permutation — this is what guarantees they stay aligned.
  const order = seededShuffle(question.ch.map((_, i) => i), rng);

  const ch = order.map(i => question.ch[i]);
  const distractorExp = Array.isArray(question.distractorExp)
    ? order.map(i => question.distractorExp[i])
    : question.distractorExp;
  const ans = order.indexOf(question.ans);

  return { ...question, ch, distractorExp, ans, choiceOrder: order, originalAns: question.ans };
}

/**
 * Map a displayed choice index back to the index stored in the bank, so
 * responses recorded before or after a re-shuffle remain comparable.
 */
export function toOriginalChoiceIndex(question, displayedIndex) {
  if (!question?.choiceOrder || displayedIndex == null) return displayedIndex;
  return question.choiceOrder[displayedIndex] ?? displayedIndex;
}
