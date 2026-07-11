import { LF_A_QUIZZES } from './lifeSciencesA';
import { LF_B_QUIZZES } from './lifeSciencesB';
import { LF_C_QUIZZES } from './lifeSciencesC';
import { PF_A_QUIZZES } from './physicalSciencesA';
import { PF_B_QUIZZES } from './physicalSciencesB';
import { PF_C_QUIZZES } from './physicalSciencesC';
import { SF_A_QUIZZES } from './socialSciencesA';
import { SF_B_QUIZZES } from './socialSciencesB';
import { SF_C_QUIZZES } from './socialSciencesC';

// High-school/early-undergrad-level quizzes — deliberately lighter than the
// MCAT-depth quiz library in ../bioBiochem.js, ../chemPhys.js, ../psychSoc.js.
export const FOUNDATIONS_QUIZZES = [
  ...LF_A_QUIZZES, ...LF_B_QUIZZES, ...LF_C_QUIZZES,
  ...PF_A_QUIZZES, ...PF_B_QUIZZES, ...PF_C_QUIZZES,
  ...SF_A_QUIZZES, ...SF_B_QUIZZES, ...SF_C_QUIZZES,
];
