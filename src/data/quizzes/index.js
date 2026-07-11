import { BIO_BIOCHEM_QUIZZES } from './bioBiochem';
import { CHEM_PHYS_QUIZZES }   from './chemPhys';
import { PSYCH_SOC_QUIZZES }   from './psychSoc';
import { FOUNDATIONS_QUIZZES } from './foundations/index';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...FOUNDATIONS_QUIZZES,
];
