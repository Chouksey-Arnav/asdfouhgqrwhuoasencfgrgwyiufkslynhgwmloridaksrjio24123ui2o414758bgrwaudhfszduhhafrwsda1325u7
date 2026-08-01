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

import { SAT_SKILLS, SKILL_IDS, skillMeta } from '../taxonomy.js';

export const SAT_QUESTIONS = [
  ...RW_CRAFT_STRUCTURE_QUESTIONS, ...RW_CRAFT_STRUCTURE_B,
  ...RW_INFO_IDEAS_QUESTIONS,      ...RW_INFO_IDEAS_B,
  ...RW_CONVENTIONS_QUESTIONS,     ...RW_CONVENTIONS_B,
  ...RW_EXPRESSION_QUESTIONS,      ...RW_EXPRESSION_B,
  ...MATH_ALGEBRA_QUESTIONS,       ...MATH_ALGEBRA_B,
  ...MATH_ADVANCED_QUESTIONS,      ...MATH_ADVANCED_B,
  ...MATH_PSDA_QUESTIONS,          ...MATH_PSDA_B,
  ...MATH_GEO_TRIG_QUESTIONS,      ...MATH_GEO_TRIG_B,
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
 *          difficulty?:string, difficulties?:string[], exclude?:Set<string>|string[]}} f
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
