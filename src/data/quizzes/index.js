import { BIO_BIOCHEM_QUIZZES }        from './bioBiochem';
import { CHEM_PHYS_QUIZZES }          from './chemPhys';
import { PSYCH_SOC_QUIZZES }          from './psychSoc';
import { LESSON_QUIZZES }             from './lessonQuizzes';
import { LIFE_SCIENCES_BASICS }       from './lifeSciencesBasics';
import { PHYSICAL_SCIENCES_BASICS }   from './physicalSciencesBasics';
import { BEHAVIORAL_SOCIAL_BASICS }   from './behavioralSocialBasics';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...LESSON_QUIZZES,
  ...LIFE_SCIENCES_BASICS,
  ...PHYSICAL_SCIENCES_BASICS,
  ...BEHAVIORAL_SOCIAL_BASICS,
];
