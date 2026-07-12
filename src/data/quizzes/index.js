import { BIO_BIOCHEM_QUIZZES }       from './bioBiochem';
import { CHEM_PHYS_QUIZZES }         from './chemPhys';
import { PSYCH_SOC_QUIZZES }         from './psychSoc';
import { HS_LIFE_BIO_QUIZZES }       from './hsLifeBio';
import { HS_HEALTH_ENVIRO_QUIZZES }  from './hsHealthEnviro';
import { HS_CHEMISTRY_QUIZZES }      from './hsChemistry';
import { HS_PHYSICS_QUIZZES }        from './hsPhysics';
import { HS_PSYCHOLOGY_QUIZZES }     from './hsPsychology';
import { HS_HISTORY_CIVICS_QUIZZES } from './hsHistoryCivics';

export const ALL_QUIZZES = [
  ...BIO_BIOCHEM_QUIZZES,
  ...CHEM_PHYS_QUIZZES,
  ...PSYCH_SOC_QUIZZES,
  ...HS_LIFE_BIO_QUIZZES,
  ...HS_HEALTH_ENVIRO_QUIZZES,
  ...HS_CHEMISTRY_QUIZZES,
  ...HS_PHYSICS_QUIZZES,
  ...HS_PSYCHOLOGY_QUIZZES,
  ...HS_HISTORY_CIVICS_QUIZZES,
];
