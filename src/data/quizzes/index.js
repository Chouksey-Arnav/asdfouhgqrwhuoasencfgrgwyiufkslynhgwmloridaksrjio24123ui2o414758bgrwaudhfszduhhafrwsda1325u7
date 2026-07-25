import { BIO_BIOCHEM_QUIZZES }    from './bioBiochem';
import { CHEM_PHYS_QUIZZES }      from './chemPhys';
import { PSYCH_SOC_QUIZZES }      from './psychSoc';
import { LESSON_QUIZZES }         from './lessonQuizzes';
import { MATH_DATA_QUIZZES }      from './mathData';
import { INTRO_LIFE_SCI_QUIZZES } from './introLifeSci';
import { INTRO_PHYS_SCI_QUIZZES } from './introPhysSci';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...LESSON_QUIZZES,
  ...MATH_DATA_QUIZZES,
  ...INTRO_LIFE_SCI_QUIZZES,
  ...INTRO_PHYS_SCI_QUIZZES,
];
