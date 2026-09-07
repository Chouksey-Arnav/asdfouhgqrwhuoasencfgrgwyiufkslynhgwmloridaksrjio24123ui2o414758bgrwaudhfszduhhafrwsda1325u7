import { BIO_BIOCHEM_QUIZZES } from './bioBiochem';
import { CHEM_PHYS_QUIZZES }   from './chemPhys';
import { PSYCH_SOC_QUIZZES }   from './psychSoc';
import { LESSON_QUIZZES }      from './lessonQuizzes';
import { mergeAppliedItems }   from './appliedItems';

// Applied items (data interpretation / scenario / best-next-step) are merged in
// here rather than pasted into each bank file, so the banks stay readable as
// the recall-first content they were authored as and the deliberate shift in
// item mix stays visible in one place. See appliedItems.js for why.
export const ALL_QUIZZES = mergeAppliedItems([
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...LESSON_QUIZZES,
]);
