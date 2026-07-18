import { BIO_BIOCHEM_QUIZZES }        from './bioBiochem';
import { CHEM_PHYS_QUIZZES }          from './chemPhys';
import { PSYCH_SOC_QUIZZES }          from './psychSoc';
import { LESSON_QUIZZES }             from './lessonQuizzes';
import { LIFE_SCIENCES_2_QUIZZES }    from './lifeSciences2';
import { PHYSICAL_SCIENCES_2_QUIZZES } from './physicalSciences2';
import { BEHAVIORAL_SOCIAL_2_QUIZZES } from './behavioralSocial2';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...LESSON_QUIZZES,
  ...LIFE_SCIENCES_2_QUIZZES,
  ...PHYSICAL_SCIENCES_2_QUIZZES,
  ...BEHAVIORAL_SOCIAL_2_QUIZZES,
];
