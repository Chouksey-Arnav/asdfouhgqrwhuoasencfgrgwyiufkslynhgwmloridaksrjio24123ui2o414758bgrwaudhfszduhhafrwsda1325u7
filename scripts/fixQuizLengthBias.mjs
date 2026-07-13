// Reports which questions in target quizzes have a correct answer that's disproportionately
// longer than the distractors (the length "tell"). Read-only — prints suggested edits for
// manual review rather than rewriting content unattended, since shortening a choice safely
// requires human judgment about what detail is safe to drop.
import { BIO_BIOCHEM_QUIZZES } from '../src/data/quizzes/bioBiochem.js';
import { CHEM_PHYS_QUIZZES } from '../src/data/quizzes/chemPhys.js';
const ALL = [...BIO_BIOCHEM_QUIZZES, ...CHEM_PHYS_QUIZZES];

const targetIds = process.argv[2] ? process.argv[2].split(',') : [];
for (const id of targetIds) {
  const quiz = ALL.find(q => q.id === id);
  if (!quiz) { console.log(`${id}: not found`); continue; }
  quiz.qs.forEach((q, i) => {
    const lens = q.ch.map(c => c.length);
    const correctLen = lens[q.ans];
    const others = lens.filter((_, idx) => idx !== q.ans);
    const avgOther = others.reduce((a,b)=>a+b,0)/others.length;
    if (correctLen > avgOther * 1.4) {
      console.log(`${id} Q${i+1}: correct=${correctLen}ch avgOther=${Math.round(avgOther)}ch — "${q.ch[q.ans]}"`);
    }
  });
}
