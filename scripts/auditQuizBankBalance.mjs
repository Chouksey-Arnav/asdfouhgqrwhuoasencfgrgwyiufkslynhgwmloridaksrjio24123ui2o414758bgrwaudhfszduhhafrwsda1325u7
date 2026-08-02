// Audits the hand-written quiz bank (bb/cp/ps/lesson) against the exact same
// answer-choice-balance rule already enforced on the SAT bank in
// src/lib/sat/answerBalance.js — one rule, one definition of "biased," shared
// across both corpora instead of a second, subtly different heuristic here.
//
// Usage:
//   node scripts/auditQuizBankBalance.mjs                  # scan everything
//   node scripts/auditQuizBankBalance.mjs --ids=bb01,bb02  # scan just these quizzes
//   node scripts/auditQuizBankBalance.mjs --prefix=bb      # scan every id starting with bb
//   node scripts/auditQuizBankBalance.mjs --range=bb01-bb100
import { BIO_BIOCHEM_QUIZZES } from '../src/data/quizzes/bioBiochem.js';
import { CHEM_PHYS_QUIZZES } from '../src/data/quizzes/chemPhys.js';
import { PSYCH_SOC_QUIZZES } from '../src/data/quizzes/psychSoc.js';
import { LESSON_QUIZZES } from '../src/data/quizzes/lessonQuizzes.js';
import { balanceViolations, measureChoices } from '../src/lib/sat/answerBalance.js';

const ALL_QUIZZES = [...BIO_BIOCHEM_QUIZZES, ...CHEM_PHYS_QUIZZES, ...PSYCH_SOC_QUIZZES, ...LESSON_QUIZZES];

const idsArg = process.argv.find(a => a.startsWith('--ids='));
const prefixArg = process.argv.find(a => a.startsWith('--prefix='));
const rangeArg = process.argv.find(a => a.startsWith('--range='));

let quizzes = ALL_QUIZZES;
if (idsArg) {
  const only = new Set(idsArg.slice(6).split(','));
  quizzes = ALL_QUIZZES.filter(q => only.has(q.id));
} else if (prefixArg) {
  const p = prefixArg.slice(9);
  quizzes = ALL_QUIZZES.filter(q => q.id.startsWith(p));
} else if (rangeArg) {
  const [from, to] = rangeArg.slice(8).split('-');
  const i0 = ALL_QUIZZES.findIndex(q => q.id === from);
  const i1 = ALL_QUIZZES.findIndex(q => q.id === to);
  quizzes = ALL_QUIZZES.slice(i0, i1 + 1);
}

let totalQs = 0, violatingQs = 0, correctIsLongestCount = 0;
const perQuiz = [];
const worstOffenders = [];

for (const quiz of quizzes) {
  let quizViolations = 0, quizLongest = 0;
  for (let i = 0; i < quiz.qs.length; i++) {
    const q = quiz.qs[i];
    totalQs++;
    const m = measureChoices(q.ch, q.ans);
    if (!m) continue;
    if (m.correctIsLongest) { correctIsLongestCount++; quizLongest++; }
    const reasons = balanceViolations(q.ch, q.ans);
    if (reasons.length) {
      violatingQs++;
      quizViolations++;
      worstOffenders.push({ id: quiz.id, qIndex: i + 1, reasons, ans: q.ch[q.ans] });
    }
  }
  perQuiz.push({ id: quiz.id, title: quiz.title, n: quiz.qs.length, violations: quizViolations, longest: quizLongest, lengthAudited: !!quiz.lengthAudited });
}

console.log(`Scanned ${quizzes.length} quizzes / ${totalQs} questions.`);
console.log(`Correct choice is the strict longest: ${correctIsLongestCount}/${totalQs} (${Math.round(correctIsLongestCount / totalQs * 100)}%) — chance baseline for 4 choices is ~25%.`);
console.log(`Questions violating the balance gate (same rule as the SAT bank): ${violatingQs}/${totalQs} (${Math.round(violatingQs / totalQs * 100)}%).`);

const flagged = perQuiz.filter(p => p.violations > 0).sort((a, b) => b.violations - a.violations);
console.log(`\nQuizzes with at least one violation: ${flagged.length}/${perQuiz.length}`);
flagged.slice(0, 40).forEach(f => console.log(`  ${f.id}${f.lengthAudited ? ' [MARKED lengthAudited — but still has violations!]' : ''} — "${f.title}" — ${f.violations}/${f.n} questions violate`));
if (flagged.length > 40) console.log(`  ... and ${flagged.length - 40} more`);

const clean = perQuiz.filter(p => p.violations === 0);
console.log(`\nQuizzes fully clean (0 violations): ${clean.length}/${perQuiz.length}`);
const cleanButUnmarked = clean.filter(p => !p.lengthAudited);
if (cleanButUnmarked.length) {
  console.log(`  ${cleanButUnmarked.length} of those are clean but NOT yet marked lengthAudited: true`);
}

if (process.argv.includes('--verbose')) {
  console.log(`\nFirst 25 violation details:`);
  worstOffenders.slice(0, 25).forEach(o => {
    console.log(`  ${o.id} Q${o.qIndex}: ans="${o.ans}"`);
    o.reasons.forEach(r => console.log(`      - ${r}`));
  });
}

// Exit non-zero if scanning a specific range/prefix/ids and anything is unbalanced —
// lets a future batch's CI or a session's own sanity check fail loudly.
if ((idsArg || prefixArg || rangeArg) && violatingQs > 0) {
  process.exitCode = 1;
}
