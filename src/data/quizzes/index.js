import { BIO_BIOCHEM_QUIZZES }         from './bioBiochem';
import { CHEM_PHYS_QUIZZES }           from './chemPhys';
import { PSYCH_SOC_QUIZZES }           from './psychSoc';
import { LESSON_QUIZZES }              from './lessonQuizzes';
import { FOUNDATIONS_LIFE_QUIZZES }       from './foundationsLife';
import { FOUNDATIONS_PHYSICAL_QUIZZES }   from './foundationsPhysical';
import { FOUNDATIONS_BEHAVIORAL_QUIZZES } from './foundationsBehavioral';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...LESSON_QUIZZES,
  ...FOUNDATIONS_LIFE_QUIZZES,
  ...FOUNDATIONS_PHYSICAL_QUIZZES,
  ...FOUNDATIONS_BEHAVIORAL_QUIZZES,
];
