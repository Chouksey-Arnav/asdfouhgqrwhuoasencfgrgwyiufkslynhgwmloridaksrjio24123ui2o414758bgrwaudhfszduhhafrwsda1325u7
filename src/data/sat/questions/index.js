// Aggregated SAT question bank + the lookups every consumer needs.
//
// Mirrors the barrel pattern of src/data/quizzes/index.js. Import from here,
// never from the individual topic files — the derived indexes below are built
// once at module load and are what the selector, heat map and score report all
// depend on.
import { RW_CRAFT_STRUCTURE_QUESTIONS } from './rwCraftStructure.js';
import { RW_INFO_IDEAS_QUESTIONS }      from './rwInfoIdeas.js';
import { RW_CONVENTIONS_QUESTIONS }     from './rwConventions.js';
import { RW_EXPRESSION_QUESTIONS }      from './rwExpression.js';
import { MATH_ALGEBRA_QUESTIONS }       from './mathAlgebra.js';
import { MATH_ADVANCED_QUESTIONS }      from './mathAdvanced.js';
import { MATH_PSDA_QUESTIONS }          from './mathPSDA.js';
import { MATH_GEO_TRIG_QUESTIONS }      from './mathGeoTrig.js';

// Expansion batch B. Split into separate files per domain rather than appended
// to the originals for the same reason src/data/elib*.js is split: a 2,000-line
// data file is one nobody reviews carefully, and this bank's correctness is
// load-bearing for a score estimate.
import { RW_CRAFT_STRUCTURE_B } from './rwCraftStructureB.js';
import { RW_INFO_IDEAS_B }      from './rwInfoIdeasB.js';
import { RW_CONVENTIONS_B }     from './rwConventionsB.js';
import { RW_EXPRESSION_B }      from './rwExpressionB.js';
import { MATH_ALGEBRA_B }       from './mathAlgebraB.js';
import { MATH_ADVANCED_B }      from './mathAdvancedB.js';
import { MATH_PSDA_B }          from './mathPSDAB.js';
import { MATH_GEO_TRIG_B }      from './mathGeoTrigB.js';

// Expansion batch C. Batches A and B were sized so DRILLING would not repeat
// itself; batch C is sized so full-length FORMS would not. A form reserves
// roughly 130 questions across its four modules, so a 328-question bank could
// assemble exactly two tests that shared nothing, and every later form was
// mostly a reshuffle of the first two. The mix here is therefore weighted to
// the bands that ran out first — Easy everywhere, plus Hard in the two largest
// R&W domains — rather than to the bank's natural shape.
//
//   npm run verify:sat-forms    prints how many genuinely distinct forms fit
import { RW_CRAFT_STRUCTURE_C } from './rwCraftStructureC.js';
import { RW_INFO_IDEAS_C }      from './rwInfoIdeasC.js';
import { RW_CONVENTIONS_C }     from './rwConventionsC.js';
import { RW_EXPRESSION_C }      from './rwExpressionC.js';
import { MATH_ALGEBRA_C }       from './mathAlgebraC.js';
import { MATH_ADVANCED_C }      from './mathAdvancedC.js';
import { MATH_PSDA_C }          from './mathPSDAC.js';
import { MATH_GEO_TRIG_C }      from './mathGeoTrigC.js';

// Expansion batch D. Batches A–C were sized against a consumer: A and B so
// DRILLING would not repeat itself, C so full-length FORMS would not. Batch D
// is sized against the SKILL, not the consumer. Nine of the twenty-eight leaf
// skills were still sitting at eight or nine questions — below the point where
// a single ten-question drill can avoid serving the same item twice — because
// their share of the real exam is small and the bank had been kept roughly
// blueprint-shaped. That is the right shape for assembling a test form and the
// wrong shape for practicing one topic, so batch D takes EVERY skill past
// thirty and the whole bank past a thousand.
//
// It is also the first batch written directly against College Board's
// published skill/knowledge testing points and score-band descriptors rather
// than against the domain names alone; docs/SAT_BLUEPRINT_SOURCES.md records
// the sources, what each one settled, and which testing points had no
// representation in the bank before this batch.
//
//   npm run audit:sat-bank --verbose    per-skill coverage, thinnest first
import { RW_CRAFT_STRUCTURE_D } from './rwCraftStructureD.js';
import { RW_INFO_IDEAS_D }      from './rwInfoIdeasD.js';
import { RW_CONVENTIONS_D }     from './rwConventionsD.js';
import { RW_EXPRESSION_D }      from './rwExpressionD.js';
import { MATH_ALGEBRA_D }       from './mathAlgebraD.js';
import { MATH_ADVANCED_D }      from './mathAdvancedD.js';
import { MATH_PSDA_D }          from './mathPSDAD.js';
import { MATH_GEO_TRIG_D }      from './mathGeoTrigD.js';

import { SAT_SKILLS, SKILL_IDS, skillMeta } from '../taxonomy.js';

export const SAT_QUESTIONS = [
  ...RW_CRAFT_STRUCTURE_QUESTIONS, ...RW_CRAFT_STRUCTURE_B, ...RW_CRAFT_STRUCTURE_C, ...RW_CRAFT_STRUCTURE_D,
  ...RW_INFO_IDEAS_QUESTIONS,      ...RW_INFO_IDEAS_B,      ...RW_INFO_IDEAS_C,      ...RW_INFO_IDEAS_D,
  ...RW_CONVENTIONS_QUESTIONS,     ...RW_CONVENTIONS_B,     ...RW_CONVENTIONS_C,     ...RW_CONVENTIONS_D,
  ...RW_EXPRESSION_QUESTIONS,      ...RW_EXPRESSION_B,      ...RW_EXPRESSION_C,      ...RW_EXPRESSION_D,
  ...MATH_ALGEBRA_QUESTIONS,       ...MATH_ALGEBRA_B,       ...MATH_ALGEBRA_C,       ...MATH_ALGEBRA_D,
  ...MATH_ADVANCED_QUESTIONS,      ...MATH_ADVANCED_B,      ...MATH_ADVANCED_C,      ...MATH_ADVANCED_D,
  ...MATH_PSDA_QUESTIONS,          ...MATH_PSDA_B,          ...MATH_PSDA_C,          ...MATH_PSDA_D,
  ...MATH_GEO_TRIG_QUESTIONS,      ...MATH_GEO_TRIG_B,      ...MATH_GEO_TRIG_C,      ...MATH_GEO_TRIG_D,
];

// ── Indexes ─────────────────────────────────────────────────────────────────
export const QUESTIONS_BY_ID = SAT_QUESTIONS.reduce((acc, q) => { acc[q.id] = q; return acc; }, {});

export const QUESTIONS_BY_SKILL = SKILL_IDS.reduce((acc, s) => { acc[s] = []; return acc; }, {});
for (const q of SAT_QUESTIONS) {
  if (QUESTIONS_BY_SKILL[q.skill]) QUESTIONS_BY_SKILL[q.skill].push(q);
}

export const QUESTIONS_BY_SECTION = { rw: [], math: [] };
for (const q of SAT_QUESTIONS) QUESTIONS_BY_SECTION[q.section]?.push(q);

export const QUESTIONS_BY_DOMAIN = SAT_QUESTIONS.reduce((acc, q) => {
  (acc[q.domain] ||= []).push(q);
  return acc;
}, {});

// ── Accessors ───────────────────────────────────────────────────────────────
export const getQuestion = (id) => QUESTIONS_BY_ID[id] || null;

/** How many bank questions exist for a skill — drives "bank is thin here" UI. */
export const questionCountForSkill = (skillId) => QUESTIONS_BY_SKILL[skillId]?.length || 0;

/**
 * Filtered pool. Every argument is optional; omitting one means "any".
 * @param {{section?:string, domain?:string, skill?:string, skills?:string[],
 *          difficulty?:string, difficulties?:string[], format?:string,
 *          exclude?:Set<string>|string[]}} f
 */
export function pool(f = {}) {
  const exclude = f.exclude instanceof Set ? f.exclude : new Set(f.exclude || []);
  const skills = f.skills ? new Set(f.skills) : null;
  const difficulties = f.difficulties ? new Set(f.difficulties) : null;
  return SAT_QUESTIONS.filter(q => {
    if (exclude.has(q.id)) return false;
    if (f.section && q.section !== f.section) return false;
    if (f.domain && q.domain !== f.domain) return false;
    if (f.skill && q.skill !== f.skill) return false;
    if (skills && !skills.has(q.skill)) return false;
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (difficulties && !difficulties.has(q.difficulty)) return false;
    if (f.format && q.format !== f.format) return false;
    return true;
  });
}

/**
 * Coverage report — which skills the bank can and cannot currently support.
 * Surfaced in the Skill Mastery panel so a thin skill is visible to the student
 * rather than silently producing repeat questions, and asserted in
 * scripts/auditSatBank.mjs.
 */
export function bankCoverage() {
  return SKILL_IDS.map(id => ({
    skill: id,
    label: SAT_SKILLS[id].label,
    section: skillMeta(id).section,
    domain: SAT_SKILLS[id].domain,
    count: questionCountForSkill(id),
  })).sort((a, b) => a.count - b.count);
}

export const BANK_SIZE = SAT_QUESTIONS.length;
