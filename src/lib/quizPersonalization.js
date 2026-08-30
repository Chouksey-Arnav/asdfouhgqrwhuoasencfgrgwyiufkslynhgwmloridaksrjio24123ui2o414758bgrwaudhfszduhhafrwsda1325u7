// ─────────────────────────────────────────────────────────────────────────────
// Per-student verification quizzes.
//
// THE PROBLEM THIS FIXES
// Until now, opening a lesson's verification quiz ran, literally:
//
//     const quiz = ALL_QUIZZES.find(q => lesson.quizIds?.includes(q.id));
//
// …which means every student on the planet got the same bank, in the same
// bank-authored order, on their first attempt — and got that *same* bank again
// on every retry after missing the threshold. For an app whose core promise
// is "a personalized path", the single most-repeated graded moment in the
// product was the least personalized thing in it. It also made retries close to
// worthless as assessment: re-serving the identical five questions measures
// whether a student remembered the answer key, not whether they learned.
//
// WHAT DIFFERENTIATES A STUDENT'S QUIZ NOW
//   1. Which bank, when a lesson has several (constants.js `quizIds` lists 2–3
//      for 18 lessons). Ranked by how well the bank's authored difficulty fits
//      this student's academic profile, then rotated by attempt.
//   2. Which questions, when the bank is bigger than one sitting. Most category
//      banks hold 11–300+ items for an 8-question quiz, so a seeded stratified
//      draw gives two students genuinely different first-attempt questions while
//      still covering the same span of the bank.
//   3. What order, both of questions and of choices — seeded per student, so it
//      is stable if they refresh mid-attempt but different from their friend's.
//   4. Every retry re-draws. The attempt counter feeds the seed and steps the
//      pick inside each stratum, so attempt 2 is a materially different quiz
//      about the same material, not a memory test of attempt 1.
//   5. Which KIND of thinking is asked for. Within each stratum an applied item
//      (data interpretation, a short scenario, best-next-step reasoning) is
//      preferred over a recall item covering the same material — recall items
//      are cheap to write and are exactly what students learn to game. See
//      lib/quizItemMix.js.
//
// WHAT IS DELIBERATELY *NOT* PERSONALIZED
// The pass threshold. It does not vary by STUDENT — two people on the same
// lesson face exactly the same bar, and a bar that moved per student would make
// two verified badges mean different things, which is the kind of quiet
// unfairness that makes a credential worthless.
//
// It DOES vary by LESSON, which is a different claim: 70% on foundations, 80%
// where later content builds directly on this lesson, and no gate at all on
// exploratory career-browsing content. That policy lives in
// data/quizzes/verificationPolicy.js, not here, precisely so it stays a property
// of the material rather than of the person.
//
// Determinism is the whole design: same student + same lesson + same attempt =>
// same quiz, always. That is what lets an attempt survive a refresh, and what
// lets scripts/verifyLessonDelivery.mjs assert the differentiation property
// instead of hoping for it.
// ─────────────────────────────────────────────────────────────────────────────
import { hashString, seededRandom, seededShuffle } from './sat/shuffle.js';
import { isApplied, mixOf } from './quizItemMix.js';

/** How many questions a verification sitting should be, when the bank allows. */
export const VERIFY_QUIZ_SIZE = 8;

/**
 * The DEFAULT pass bar, for a lesson with no policy tier resolved.
 *
 * NOTE — the header above says the threshold is deliberately not personalized,
 * and that is still true: it does not vary by STUDENT. It does now vary by
 * LESSON (70 for foundations, 80 for lessons later content builds on, and no
 * gate at all on exploratory content — see data/quizzes/verificationPolicy.js).
 * Those are two different claims and only the first one was ever the fairness
 * argument: two students on the same lesson still face exactly the same bar.
 */
export const VERIFY_PASS_PCT = 70;

const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2, Expert: 3 };

// ── Who is this student? ─────────────────────────────────────────────────────

/**
 * A stable, per-student seed string. Built from identity fields that never
 * change once onboarding is done, so the same person gets the same draw on
 * every device, and two people on the same device (or the same shared laptop)
 * don't. Falls back to a locally-minted id for a profile with nothing stable
 * yet, rather than silently collapsing every such student onto one seed.
 */
export function learnerSeed(user, pathwayKey = '') {
  const identity = user?.email || user?.id || null;
  const stable = identity || `${user?.name || ''}::${user?.onboardingCompletedAt || ''}`;
  const resolved = stable.trim() ? stable : localAnonId();
  return `${resolved}::${pathwayKey || user?.specialty || ''}`;
}

const ANON_KEY = 'msp_learner_seed';
function localAnonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/**
 * 0–1 estimate of how much challenge this student's profile suggests, derived
 * purely from what onboarding already collected (nothing new is asked of them).
 * Used only to *rank equally-valid banks* — never to change the pass bar, and
 * never to withhold material. A student the model reads as "still building
 * fundamentals" gets the Easy-authored bank first; one with AP sciences and
 * strong grades gets the Hard one. Both then have to clear the same bar.
 */
export function challengeLevel(user) {
  if (!user) return 0.5;
  let score = 0.5;
  const gpa = { mostly_a: 0.22, a_b: 0.1, mostly_b: -0.06, below_b: -0.18, unsure: 0 }[user.gpaBand];
  if (typeof gpa === 'number') score += gpa;

  const sciences = (user.sciences || []).filter(s => s !== 'none_yet');
  const advanced = sciences.filter(s => s === 'ap_bio' || s === 'ap_chem' || s === 'anatomy').length;
  score += Math.min(0.15, sciences.length * 0.03) + Math.min(0.1, advanced * 0.05);

  // Grade stage: a senior has had two more years of science than a freshman.
  const grade = { freshman: -0.1, sophomore: -0.04, junior: 0.04, senior: 0.1 }[user.gradeStage];
  if (typeof grade === 'number') score += grade;

  // Certainty is a motivation signal, not an ability one — it nudges, gently.
  const certainty = { all_in: 0.05, fairly_sure: 0.02, exploring: -0.03 }[user.certainty];
  if (typeof certainty === 'number') score += certainty;

  const experience = (user.healthExperience || []).filter(e => e !== 'none');
  score += Math.min(0.08, experience.length * 0.02);

  return Math.max(0, Math.min(1, score));
}

// ── Attempt tracking ─────────────────────────────────────────────────────────
// Attempt count lives in localStorage rather than the Dexie `lessons` row: it is
// purely a presentation input (which variant to draw), it must be readable
// synchronously at the moment the quiz opens, and it carries nothing worth
// syncing across devices or restoring from a backup.
const ATTEMPT_KEY = 'msp_verify_attempts';

function readAttempts() {
  try { return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || '{}') || {}; } catch { return {}; }
}

/** How many verification attempts this lesson has already had (0 on the first). */
export function getAttemptCount(lessonId) {
  const n = readAttempts()[lessonId];
  return Number.isFinite(n) ? n : 0;
}

/** Called as an attempt starts — the next draw uses the incremented count. */
export function recordAttempt(lessonId) {
  try {
    const all = readAttempts();
    all[lessonId] = getAttemptCount(lessonId) + 1;
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(all));
  } catch { /* storage disabled — everyone just keeps getting attempt 0's draw */ }
}

/** Cleared when a lesson is verified, so a later re-take starts fresh. */
export function clearAttempts(lessonId) {
  try {
    const all = readAttempts();
    delete all[lessonId];
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(all));
  } catch { /* storage disabled */ }
}

// ── Bank selection ───────────────────────────────────────────────────────────

/**
 * Pick which of a lesson's banks to serve. Ranks by |bank difficulty − student
 * level| so the best-fitting bank leads, then rotates by attempt so a retry
 * moves to the next-best bank instead of repeating the one just failed.
 */
export function pickQuizBank(lesson, allQuizzes, { user, attempt = 0 } = {}) {
  const banks = (lesson?.quizIds || [])
    .map(id => allQuizzes.find(q => q.id === id))
    .filter(Boolean);
  if (banks.length <= 1) return banks[0] || null;

  const target = challengeLevel(user) * (Object.keys(DIFF_RANK).length - 1);
  const ranked = [...banks].sort((a, b) => {
    const da = Math.abs((DIFF_RANK[a.diff] ?? 1) - target);
    const db = Math.abs((DIFF_RANK[b.diff] ?? 1) - target);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id); // stable tiebreak — never Math.random()
  });
  return ranked[attempt % ranked.length];
}

/**
 * Draw `size` questions out of a bank, seeded per student and attempt.
 *
 * Stratified rather than a flat random sample: the bank is cut into `size`
 * contiguous strata and one question is taken from each. Banks are authored
 * roughly in teaching order (foundations first, applications later), so a flat
 * sample can hand one student five warm-ups and another five edge cases, while
 * stratifying guarantees every student's quiz spans the same material — the
 * questions differ, the coverage doesn't. That property is what makes it fair
 * to hold every student on a lesson to the same bar.
 */
export function drawQuestions(bank, { seed, size = VERIFY_QUIZ_SIZE, attempt = 0, excludeStems = null } = {}) {
  const all = bank?.qs || [];
  // ── "A different quiz, not the same one" ───────────────────────────────────
  // On a retry, items this student has already been served are removed from the
  // pool outright rather than merely re-ordered. Re-serving a seen item tests
  // whether they remember the answer key, which is the specific thing a retry
  // must not measure. Falls back to the full bank once they've genuinely
  // exhausted it — an empty quiz is a worse outcome than a repeated question.
  const unseen = excludeStems?.size ? all.filter(q => !excludeStems.has(q.q)) : all;
  const qs = unseen.length >= Math.min(size, 3) ? unseen : all;
  if (qs.length <= size) return qs;

  const rng = seededRandom(hashString(`${seed}::${bank.id}::draw`));
  const picked = [];
  for (let s = 0; s < size; s++) {
    const start = Math.floor((s * qs.length) / size);
    const end = Math.floor(((s + 1) * qs.length) / size);
    const span = Math.max(1, end - start);
    // The attempt offset walks the pick forward inside the stratum, so a retry
    // draws different questions from the same regions whenever the stratum has
    // room for it (and cycles predictably when it doesn't).
    const base = Math.floor(rng() * span);
    // Within a stratum, an applied item (data interpretation, scenario, or
    // best-next-step) beats a recall item covering the same region of the bank.
    // The stratum still fixes WHICH region gets covered — stratified coverage
    // is what makes one bar fair for everyone — so this changes the kind of
    // thinking asked for without changing what the quiz spans.
    //
    // The preference has to narrow the CANDIDATE SET, not merely reorder it:
    // the seeded index below is a random position within whatever list it is
    // handed, so an applied-first ordering that still gets indexed at random
    // would prefer nothing at all.
    const stratum = qs.slice(start, start + span);
    const applied = stratum.filter(isApplied);
    const candidates = applied.length ? applied : stratum;
    picked.push(candidates[(base + attempt) % candidates.length]);
  }
  return picked;
}

/**
 * Threshold resolution, kept here so every caller reads the bar from one place.
 * `policy` is the Map built by data/quizzes/verificationPolicy.js. A lesson the
 * policy doesn't know falls back to the historical 70.
 *
 * Returns `null` for an ungated (exploratory) lesson — callers must treat null
 * as "no gate", never coerce it to a number.
 */
export function thresholdFor(lessonId, policy) {
  if (!policy) return VERIFY_PASS_PCT;
  if (!policy.has(lessonId)) return VERIFY_PASS_PCT;
  return policy.get(lessonId).threshold;
}

/**
 * Build the verification quiz one specific student sees for one specific
 * attempt. Keeps the source bank's id/cat/title so scoring, plan-task matching
 * and history all keep working — only `qs` is student-specific.
 *
 * @returns {object|null} quiz object with a `personalization` meta block, or
 *          null when the lesson has no bank wired up yet.
 */
export function buildVerificationQuiz(lesson, allQuizzes, { user, pathwayKey, attempt = 0, size = VERIFY_QUIZ_SIZE, excludeStems = null } = {}) {
  const bank = pickQuizBank(lesson, allQuizzes, { user, attempt });
  if (!bank) return null;

  const seed = `${learnerSeed(user, pathwayKey)}::${lesson.id}::a${attempt}`;
  const drawn = drawQuestions(bank, { seed, size, attempt, excludeStems });

  // Order questions and choices with the same seed. QuizEngine's own scramble is
  // skipped for these (it uses Math.random and would undo the determinism that
  // lets a refreshed attempt come back identical) — see App.jsx `preScrambled`.
  const qRng = seededRandom(hashString(`${seed}::order`));
  const ordered = seededShuffle(drawn, qRng).map((q, i) => {
    const cRng = seededRandom(hashString(`${seed}::choices::${i}`));
    const idx = seededShuffle([...Array(q.ch.length).keys()], cRng);
    return { ...q, ch: idx.map(j => q.ch[j]), ans: idx.indexOf(q.ans) };
  });

  const bankCount = (lesson?.quizIds || []).filter(id => allQuizzes.some(q => q.id === id)).length;
  return {
    ...bank,
    qs: ordered,
    preScrambled: true,
    personalization: {
      seed,
      attempt,
      bankId: bank.id,
      bankCount,
      poolSize: bank.qs?.length || 0,
      served: ordered.length,
      level: challengeLevel(user),
      // What kind of thinking this sitting actually asks for. Surfaced so the
      // shift away from recall items is measurable rather than asserted — see
      // scripts/verifyQuizRecovery.mjs, which asserts against it.
      mix: mixOf(ordered),
      appliedCount: ordered.filter(isApplied).length,
      // True when this student's draw is genuinely one of many possible ones —
      // drives the "these questions were picked for you" line in the UI, which
      // must not appear on a 5-question bank where everyone sees all five.
      differentiated: (bank.qs?.length || 0) > ordered.length || bankCount > 1,
    },
  };
}

/** One-line, student-facing explanation of what they're about to be served. */
export function describeVerificationQuiz(quiz) {
  const p = quiz?.personalization;
  if (!p) return '';
  const retry = p.attempt > 0 ? ' Because this is a retry, it pulls questions you haven\'t seen — not the same ones again.' : '';
  const applied = p.appliedCount
    ? ` ${p.appliedCount} of them ask you to use the material — read a number, work through a situation, or pick what you'd do next — rather than recite it.`
    : '';
  if (!p.differentiated) {
    return `${p.served} questions on this lesson, in an order picked for you.${applied}${retry}`;
  }
  return `${p.served} questions drawn from a ${p.poolSize}-question bank and picked for your profile and pathway — another student won't get the same set.${applied}${retry}`;
}
