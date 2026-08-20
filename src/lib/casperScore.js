// ─────────────────────────────────────────────────────────────────────────────
// CASPer scoring — quartiles, not scores.
//
// ── Why a quartile ──────────────────────────────────────────────────────────
// Real CASPer results are reported to programs as a quartile against the
// applicant pool, and the applicant is shown the same thing. There is no raw
// number, deliberately: the test's own position is that a raw score implies a
// precision the instrument does not have, and that what a program should be
// asking is roughly where this applicant sits, not whether they scored 61 or
// 63. Showing a student a raw CASPer-style score would teach them to optimise a
// number that does not exist.
//
// So this converts our per-section rubric output into a band and shows only the
// band.
//
// ── The honesty problem, stated rather than hidden ──────────────────────────
// A quartile is a statement about a population. We do not have the population.
// Our band is computed against the rubric in mmiRubric.js — which is itself
// calibrated so that a fluent, structured, generic answer lands at 4 or 5 out
// of 7, matching the real modal result — and NOT against a cohort of people who
// sat this test. That is a real limitation and it is printed with every result
// rather than being buried in a footnote, because a student who believes we
// have ranked them against real applicants would be wrong about the one thing
// the number appears to say.
//
// ── Why the short set gets no band at all ───────────────────────────────────
// Five sections is not enough to place anyone anywhere. Rather than printing a
// quartile with a disclaimer nobody reads, the short set returns
// `reportsQuartile: false` and the UI shows per-section feedback instead. The
// same argument as single-station MMI practice: the honest move is to withhold
// the aggregate, not to caveat it.
// ─────────────────────────────────────────────────────────────────────────────
import { SCALE_MAX } from './mmiRubric.js';

export const QUARTILES = [
  {
    id: 4,
    label: 'Fourth quartile',
    short: 'Q4',
    tone: 'good',
    // Written to be read by a 16-year-old who has never seen a quartile before.
    plain: 'Top quarter.',
    blurb: 'Responses that consistently reached a position, named specific people, and did something with the strongest objection rather than ignoring it.',
  },
  {
    id: 3,
    label: 'Third quartile',
    short: 'Q3',
    tone: 'mid',
    plain: 'Upper middle.',
    blurb: 'Above the midpoint. Usually this means the reasoning was there and the specificity was not — real names, real first steps, real deadlines.',
  },
  {
    id: 2,
    label: 'Second quartile',
    short: 'Q2',
    tone: 'mid',
    plain: 'Lower middle.',
    blurb: 'The most common band, and it is not a failing one. It typically comes from answering the first question well and the third one in a sentence, which is a time-management problem as much as a judgment one.',
  },
  {
    id: 1,
    label: 'First quartile',
    short: 'Q1',
    tone: 'bad',
    plain: 'Bottom quarter.',
    blurb: 'Usually one of three things: restating the scenario instead of engaging with it, moralising instead of reasoning, or running out of time before the later questions got a real answer.',
  },
];

export function quartile(id) {
  return QUARTILES.find(q => q.id === id) || QUARTILES[1];
}

/**
 * Rubric mean (out of 7) → quartile.
 *
 * The cut points follow the same distribution the per-station scale is calibrated to: 5 is the
 * modal result and means competent and forgettable, so a mean of 5 must land mid-table rather than
 * near the top. A scorer that put a 5 in the fourth quartile would be flattering students, which
 * is the one failure mode that actively harms them.
 */
export function meanToQuartile(mean) {
  if (mean == null) return null;
  if (mean >= 5.8) return 4;
  if (mean >= 5.0) return 3;
  if (mean >= 3.8) return 2;
  return 1;
}

/**
 * Score a completed CASPer attempt.
 *
 * `sections` is one entry per section the student worked through:
 *   { id, result, answered, probesAnswered, probesTotal, secondsUsed }
 * where `result` is the per-section output of scoreStation().
 *
 * `reportsQuartile` comes from the test length (src/data/casperTest.js) and is the difference
 * between a test and an exercise.
 */
export function scoreCasperAttempt(sections, { reportsQuartile = true } = {}) {
  const scored = sections.filter(s => s.result && typeof s.result.score === 'number');
  const attempted = scored.length;

  // Time pressure is half of what this test measures, so how much of it went unanswered is a
  // finding in its own right and not an asterisk on the score.
  const probesTotal = sections.reduce((n, s) => n + (s.probesTotal || 0), 0);
  const probesAnswered = sections.reduce((n, s) => n + (s.probesAnswered || 0), 0);
  const unanswered = probesTotal - probesAnswered;

  if (attempted === 0) {
    return {
      attempted: 0, sections: sections.length, mean: null, quartile: null,
      reportsQuartile: false, probesTotal, probesAnswered, unanswered,
      caveat: 'Nothing was submitted, so there is nothing to report.',
      findings: [],
    };
  }

  const mean = scored.reduce((n, s) => n + s.result.score, 0) / attempted;
  const q = reportsQuartile && attempted >= 8 ? meanToQuartile(mean) : null;

  return {
    attempted,
    sections: sections.length,
    mean,
    scale: SCALE_MAX,
    // Deliberately the only aggregate that leaves this function for display. The mean is returned
    // so the UI can reason about it, and the UI does not print it — see CasperTypedTest.
    quartile: q,
    quartileDetail: q ? quartile(q) : null,
    reportsQuartile: q !== null,
    probesTotal,
    probesAnswered,
    unanswered,
    findings: casperFindings(sections, mean, unanswered, probesTotal),
    caveat: q !== null
      ? 'CASPer reports a quartile rather than a score, and so do we. But a quartile is a statement about a population, and we do not have one: this band is computed against our own rubric, not against people who actually sat the test. Read it as "roughly where this kind of answer sits", never as a rank.'
      : `A quartile needs a full-length attempt — ${attempted} section${attempted === 1 ? '' : 's'} is not enough to place anyone anywhere, so this is per-section feedback instead.`,
  };
}

/**
 * The part a student can act on. Every finding has to be derived from something that actually
 * happened in the attempt, not from the band — a band with generic advice attached is the failure
 * mode of every practice test ever shipped.
 */
function casperFindings(sections, mean, unanswered, probesTotal) {
  const out = [];

  if (probesTotal > 0 && unanswered / probesTotal >= 0.25) {
    out.push(`You left ${unanswered} of ${probesTotal} questions unanswered. On this test that is usually not a knowledge problem — it is that the first answer took three minutes. Decide in the first fifteen seconds which question gets the long answer.`);
  }

  const lastProbeWeak = sections.filter(s => s.probesTotal && s.probesAnswered && s.probesAnswered < s.probesTotal).length;
  if (lastProbeWeak >= 2) {
    out.push(`In ${lastProbeWeak} sections you ran out before the last question. The last question is usually the one asking what you would do differently, which is the one raters weight most.`);
  }

  const scored = sections.filter(s => s.result);
  const spread = scored.length > 1
    ? Math.max(...scored.map(s => s.result.score)) - Math.min(...scored.map(s => s.result.score))
    : 0;
  if (spread >= 3) {
    out.push(`Your sections ranged by ${spread} points. A wide spread usually means one scenario type is costing you — look at which ones the low ones were.`);
  }

  // Roll up the per-section rubric reasons and surface anything that fired repeatedly, which is
  // the difference between a bad section and a habit.
  const reasonCounts = new Map();
  for (const s of scored) {
    for (const r of s.result.reasons || []) reasonCounts.set(r, (reasonCounts.get(r) || 0) + 1);
  }
  const recurring = [...reasonCounts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  for (const [reason, n] of recurring.slice(0, 3)) {
    out.push(`In ${n} sections: ${reason}`);
  }

  if (!out.length && mean >= 5) {
    out.push('Nothing recurred across sections, which is genuinely the good version of this result. The gap to the top band is specificity — named people, a first step with a time on it, and the strongest version of the argument you rejected.');
  }

  return out;
}
