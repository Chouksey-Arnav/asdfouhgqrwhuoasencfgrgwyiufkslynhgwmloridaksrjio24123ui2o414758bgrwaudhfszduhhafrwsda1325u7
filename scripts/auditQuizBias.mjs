// Non-destructive audit for the "longest answer is (almost) always right" test-taking heuristic
// across the quiz bank. Reports, per quiz, how often the correct choice is the longest option
// and how that compares to chance (25% for 4 choices) — flags outliers for manual rewrite.
//
// Two metrics, because they answer different questions:
//   - "longest" — is the key strictly the longest option? Compare against the 25% chance
//     baseline. Useful, but a 3-character edge counts here and no student can see it.
//   - "tell"    — is the key longer than the next-longest option by more than 15%? That is
//     the threshold at which the difference is actually visible while scanning four choices,
//     so this is the number that reflects real guessability. Target is 0.
// LESSON_QUIZZES is included in the scan: the per-lesson bank is what the Learning Pathway
// "Verify" step actually grades against, so it needs the same scrutiny as the category banks.
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

// How much longer than the next-longest option the key has to be before the difference is
// visible at a glance rather than merely measurable.
const TELL_MARGIN = 0.15;

let totalQs = 0, longestIsCorrect = 0, perceptibleTell = 0;
const flagged = [];
const tellFlagged = [];

for (const quiz of quizzes) {
  let quizLongestCorrect = 0, quizTells = 0;
  for (const q of quiz.qs) {
    totalQs++;
    const lengths = q.ch.map(c => c.length);
    const longestIdx = lengths.indexOf(Math.max(...lengths));
    if (longestIdx === q.ans) { longestIsCorrect++; quizLongestCorrect++; }
    const nextLongest = Math.max(...lengths.filter((_, i) => i !== q.ans));
    if (lengths[q.ans] - nextLongest > nextLongest * TELL_MARGIN) { perceptibleTell++; quizTells++; }
  }
  const rate = quiz.qs.length ? quizLongestCorrect / quiz.qs.length : 0;
  if (rate > 0.5 && quiz.qs.length >= 3) {
    flagged.push({ id: quiz.id, title: quiz.title, rate: Math.round(rate * 100), n: quiz.qs.length });
  }
  if (quizTells > 0) {
    tellFlagged.push({ id: quiz.id, title: quiz.title, tells: quizTells, n: quiz.qs.length });
  }
}

console.log(`Scanned ${quizzes.length} quizzes / ${totalQs} questions.`);
console.log(`Correct answer is the longest choice: ${longestIsCorrect}/${totalQs} (${Math.round(longestIsCorrect/totalQs*100)}%) — chance baseline for 4 choices is ~25%.`);
console.log(`Correct answer is VISIBLY longest (>${Math.round(TELL_MARGIN*100)}% longer than the next option): ${perceptibleTell}/${totalQs} (${Math.round(perceptibleTell/totalQs*100)}%) — this is the number that actually makes a question guessable.`);
console.log(`\nQuizzes where the longest choice is correct >50% of the time (candidates for rewrite):`);
flagged.sort((a,b) => b.rate - a.rate).forEach(f => console.log(`  ${f.id} — "${f.title}" — ${f.rate}% of ${f.n} questions`));
if (!flagged.length) console.log('  (none)');
console.log(`\nQuizzes with at least one visibly-longest correct answer (highest priority to fix):`);
tellFlagged.sort((a,b) => b.tells - a.tells).forEach(f => console.log(`  ${f.id} — "${f.title}" — ${f.tells}/${f.n} questions`));
if (!tellFlagged.length) console.log('  (none)');
