// ─────────────────────────────────────────────────────────────────────────────
// Answer-choice balance — the one implementation of "is this item gameable
// without reading it?"
//
// The problem it exists for: on a four-choice item, a student who has noticed
// that the longest, most-qualified choice is usually correct can score well
// above chance while ignoring the passage entirely. That is not a hypothetical
// — measured on this app's own hand-written bank, the correct choice was the
// single longest in 47.5% of Reading & Writing items against a 25% baseline,
// and the single SHORTEST in only 5.6% of items overall. A student could have
// taken "pick the longest" as a strategy and beaten the practice set. Practice
// that rewards that habit is worse than no practice, because the real exam
// does not reward it and the student finds out on test day.
//
// Why it lives here rather than in the audit script: three separate consumers
// need the identical rule, and three copies of a heuristic is three subtly
// different heuristics. The generator validates every AI-authored item against
// it before showing it to anyone; the audit script gates the hand-written bank
// on it in CI; and the baseline test screens items one at a time as they are
// generated, where there is no batch to compare against.
//
// The measures are deliberately plural. Counting "is the correct choice the
// argmax" alone lies in both directions:
//   • It flags a four-way tie ("2", "4", "6", "8") as bias, which it isn't.
//   • It misses the blatant case where the correct choice is only the second
//     longest but is still three times the length of the median.
// So a strict-maximum check, a ratio check against the other choices, and an
// absolute-gap check all run, and an item fails if any of them fires.
// ─────────────────────────────────────────────────────────────────────────────

// Correct choice may not exceed the mean of the others by more than this.
// Tightened from the 1.4 the generator used to apply: at 1.4 a 40-character
// distractor set admits a 56-character correct answer, which is a full extra
// clause and plainly visible to a student scanning the choices.
export const MAX_LENGTH_RATIO = 1.22;

// The ratio rule is meaningless when every choice is tiny — "2.8" against "3"
// is a 40% difference and no signal at all — so it only applies once the
// distractors carry real text.
export const RATIO_MIN_MEAN = 20;

// Absolute backstop. A 150-character correct answer against three 12-character
// distractors has a mean below RATIO_MIN_MEAN and would sail through the ratio
// rule while being the most blatant version of the tell there is.
export const MAX_ABSOLUTE_GAP = 18;

// How far apart the choices may be overall. Even when the CORRECT choice is not
// the outlier, a set where one distractor is three words and another is thirty
// looks unfinished and narrows the field for free.
export const MAX_SPREAD_RATIO = 2.1;
export const SPREAD_MIN_LONGEST = 30; // below this, spread is noise

const len = (c) => String(c ?? '').trim().length;

/**
 * Full measurement of one item's choice set.
 * Returns null for anything that isn't a 4-choice MCQ with a valid key.
 */
export function measureChoices(choices, ansIdx) {
  if (!Array.isArray(choices) || choices.length !== 4) return null;
  if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx > 3) return null;

  const lengths = choices.map(len);
  const max = Math.max(...lengths);
  const min = Math.min(...lengths);
  const others = lengths.filter((_, i) => i !== ansIdx);
  const meanOthers = others.reduce((s, l) => s + l, 0) / others.length;
  const longestOther = Math.max(...others);
  const shortestOther = Math.min(...others);

  // "Strict" maxima/minima only — a tie is not a signal, because a student
  // cannot act on it.
  const correctIsLongest = lengths[ansIdx] === max && lengths.filter(l => l === max).length === 1;
  const correctIsShortest = lengths[ansIdx] === min && lengths.filter(l => l === min).length === 1;

  return {
    lengths,
    max,
    min,
    meanOthers,
    longestOther,
    shortestOther,
    correctIsLongest,
    correctIsShortest,
    ratio: meanOthers > 0 ? lengths[ansIdx] / meanOthers : 1,
    gap: lengths[ansIdx] - longestOther,
    spread: min > 0 ? max / min : Infinity,
  };
}

/**
 * The gate. Returns an array of human-readable reasons; empty means the item
 * is balanced. Reasons are phrased as instructions so they can be fed straight
 * back to a generator as repair guidance.
 */
export function balanceViolations(choices, ansIdx) {
  const m = measureChoices(choices, ansIdx);
  if (!m) return ['choices must be exactly four with a valid answer index'];
  const out = [];

  if (m.meanOthers >= RATIO_MIN_MEAN && m.ratio > MAX_LENGTH_RATIO) {
    out.push(`the correct choice is ${Math.round((m.ratio - 1) * 100)}% longer than the average wrong choice — shorten it or lengthen the distractors`);
  }
  if (m.gap > MAX_ABSOLUTE_GAP) {
    out.push(`the correct choice is ${m.gap} characters longer than the longest wrong choice — bring them within ${MAX_ABSOLUTE_GAP}`);
  }
  if (m.max >= SPREAD_MIN_LONGEST && m.spread > MAX_SPREAD_RATIO) {
    out.push(`the longest choice is ${m.spread.toFixed(1)}x the shortest — all four should be within about ${MAX_SPREAD_RATIO}x of each other`);
  }
  return out;
}

/** Convenience predicate for call sites that just want yes/no. */
export function isBalanced(choices, ansIdx) {
  return balanceViolations(choices, ansIdx).length === 0;
}

// Below this, choice length carries no information a student could act on.
// "−1" against "1", "3", "5"; ", and" against ";and" — the correct choice is
// technically the longest in both, by one character, and no test-wise student
// has ever picked an answer on that basis. Including such items in the rate
// does two bad things at once: it dilutes a real bias in the prose items, and
// it makes the mirror check (how often is the correct choice the SHORTEST?)
// unsatisfiable, because a numeric choice set is usually a four-way tie and
// therefore neither. Rates are computed over TEXTUAL items only.
export const TEXTUAL_MIN_LONGEST = 25;

/** Is this an item where a student could plausibly read the answer off length? */
export function isTextualChoiceSet(choices) {
  if (!Array.isArray(choices) || choices.length !== 4) return false;
  return Math.max(...choices.map(len)) >= TEXTUAL_MIN_LONGEST;
}

/**
 * Bank-level statistics. One item being the longest is meaningless; a bank
 * where it happens half the time is a broken bank, and only an aggregate can
 * see that. Used by scripts/auditSatBank.mjs.
 *
 * `n` counts every MCQ; `textualN` counts the subset the rates are computed
 * over. Report both — a reader needs to know the denominator.
 */
export function bankBalanceStats(questions) {
  const mcqs = (questions || []).filter(q => Array.isArray(q.ch) && q.ch.length === 4 && Number.isInteger(q.ans));
  if (!mcqs.length) {
    return { n: 0, textualN: 0, longest: 0, shortest: 0, longestRate: 0, shortestRate: 0, violations: [], byPosition: [0, 0, 0, 0] };
  }

  let longest = 0;
  let shortest = 0;
  let textualN = 0;
  const violations = [];
  const byPosition = [0, 0, 0, 0];

  for (const q of mcqs) {
    const m = measureChoices(q.ch, q.ans);
    if (!m) continue;
    byPosition[q.ans] += 1;
    if (isTextualChoiceSet(q.ch)) {
      textualN++;
      if (m.correctIsLongest) longest++;
      if (m.correctIsShortest) shortest++;
    }
    const reasons = balanceViolations(q.ch, q.ans);
    if (reasons.length) violations.push({ id: q.id, section: q.section, ratio: m.ratio, gap: m.gap, reasons });
  }

  return {
    n: mcqs.length,
    textualN,
    longest,
    shortest,
    longestRate: textualN ? longest / textualN : 0,
    shortestRate: textualN ? shortest / textualN : 0,
    violations,
    byPosition,
  };
}

// ── The generator's contract ────────────────────────────────────────────────
// Shared verbatim by every prompt that authors MCQ items, so the rule the model
// is told and the rule the validator enforces cannot drift apart. Stated in
// concrete, checkable terms — "keep choices similar in length" is advice a
// model happily believes it has followed while writing a 90-character correct
// answer against three 30-character distractors.
export const CHOICE_LENGTH_CONTRACT = [
  'CHOICE LENGTH — this is a hard constraint, not a style note. A student must not be able to',
  'identify the answer by shape alone.',
  `  * All four choices must fall within about ${MAX_SPREAD_RATIO}x of each other in length. Count the words.`,
  `  * The correct choice must NOT be the longest. It must not exceed the average wrong choice by more`,
  `    than ${Math.round((MAX_LENGTH_RATIO - 1) * 100)}%, nor exceed the longest wrong choice by more than ${MAX_ABSOLUTE_GAP} characters.`,
  '  * Make the correct choice the SHORTEST as often as the longest across a set. Both extremes are tells.',
  '  * The correct choice must not be the most hedged or most qualified one. Wrong choices get "always",',
  '    "never" and "only" just as often as right ones get "may" and "tends to".',
  '  * Build each distractor to a specific misreading first, then edit it to match the others in length —',
  '    never pad a distractor with filler to hit a word count. If a choice needs padding to fit, the',
  '    misconception behind it was too thin and the choice should be replaced.',
].join('\n');
