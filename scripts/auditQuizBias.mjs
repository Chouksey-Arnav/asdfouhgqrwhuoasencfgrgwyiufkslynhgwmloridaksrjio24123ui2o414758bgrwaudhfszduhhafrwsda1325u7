// Non-destructive audit for the "longest answer is (almost) always right" test-taking heuristic
// across the quiz bank. Reports, per quiz, how often the correct choice is the longest option
// and how that compares to chance (25% for 4 choices) — flags outliers for manual rewrite.
//
// Usage: node scripts/auditQuizBias.mjs [--ids=bb71,bb77,cp72,...]   (omit --ids to scan everything)
import { BIO_BIOCHEM_QUIZZES } from '../src/data/quizzes/bioBiochem.js';
import { CHEM_PHYS_QUIZZES } from '../src/data/quizzes/chemPhys.js';
import { PSYCH_SOC_QUIZZES } from '../src/data/quizzes/psychSoc.js';
import { LESSON_QUIZZES } from '../src/data/quizzes/lessonQuizzes.js';
const ALL_QUIZZES = [...BIO_BIOCHEM_QUIZZES, ...CHEM_PHYS_QUIZZES, ...PSYCH_SOC_QUIZZES, ...LESSON_QUIZZES];

const idsArg = process.argv.find(a => a.startsWith('--ids='));
const onlyIds = idsArg ? new Set(idsArg.slice(6).split(',')) : null;

const quizzes = onlyIds ? ALL_QUIZZES.filter(q => onlyIds.has(q.id)) : ALL_QUIZZES;

let totalQs = 0, longestIsCorrect = 0;
const flagged = [];
const posFlagged = [];

for (const quiz of quizzes) {
  let quizLongestCorrect = 0;
  const posCount = {};
  for (const q of quiz.qs) {
    totalQs++;
    const lengths = q.ch.map(c => c.length);
    const longestIdx = lengths.indexOf(Math.max(...lengths));
    if (longestIdx === q.ans) { longestIsCorrect++; quizLongestCorrect++; }
    posCount[q.ans] = (posCount[q.ans] || 0) + 1;
  }
  const rate = quiz.qs.length ? quizLongestCorrect / quiz.qs.length : 0;
  if (rate > 0.5 && quiz.qs.length >= 3) {
    flagged.push({ id: quiz.id, title: quiz.title, rate: Math.round(rate * 100), n: quiz.qs.length });
  }
  const maxPos = Math.max(...Object.values(posCount));
  const posRate = quiz.qs.length ? maxPos / quiz.qs.length : 0;
  if (posRate > 0.5 && quiz.qs.length >= 4) {
    posFlagged.push({ id: quiz.id, title: quiz.title, rate: Math.round(posRate * 100), n: quiz.qs.length });
  }
}

console.log(`Scanned ${quizzes.length} quizzes / ${totalQs} questions.`);
console.log(`Correct answer is the longest choice: ${longestIsCorrect}/${totalQs} (${Math.round(longestIsCorrect/totalQs*100)}%) — chance baseline for 4 choices is ~25%.`);
console.log(`\nQuizzes where the longest choice is correct >50% of the time (candidates for rewrite):`);
flagged.sort((a,b) => b.rate - a.rate).forEach(f => console.log(`  ${f.id} — "${f.title}" — ${f.rate}% of ${f.n} questions`));
if (!flagged.length) console.log('  (none)');

console.log(`\nQuizzes where one answer-choice position (A/B/C/D) holds the correct answer >50% of the time (predictable position, candidates for reshuffle):`);
posFlagged.sort((a,b) => b.rate - a.rate).forEach(f => console.log(`  ${f.id} — "${f.title}" — ${f.rate}% of ${f.n} questions`));
if (!posFlagged.length) console.log('  (none)');
