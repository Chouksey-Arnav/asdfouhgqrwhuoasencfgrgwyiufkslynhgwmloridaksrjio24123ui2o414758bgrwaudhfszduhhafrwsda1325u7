// ─────────────────────────────────────────────────────────────────────────────
// Digital SAT content taxonomy — the backbone of the entire SAT tab.
//
// Every question, drill, mastery bar, error-log entry, heat-map cell and AI
// prompt keys off the leaf skills defined here. If you change a skill id you
// must migrate src/data/sat/questions/** and the satSkillStats Dexie store
// along with it, so treat these ids as a stable contract.
//
// Structure mirrors the real exam: two sections, four content domains each,
// 28 leaf skills total. Domain shares are College Board's published blueprint
// percentages; question counts are the real per-section totals.
//
// LICENSING: every question in src/data/sat/questions/** must be original.
// College Board grants no commercial licence for official SAT items and
// explicitly forbids their use with generative AI, so no scraped Bluebook or
// Question Bank content may enter this directory, and no AI prompt may pass
// official questions as examples. The taxonomy below describes the published
// *blueprint* (domain names and percentages), which is factual, not content.
// ─────────────────────────────────────────────────────────────────────────────
// Explicit .js extensions throughout src/data/sat/** so the bank can also be
// imported directly by Node (scripts/auditSatBank.mjs). Vite resolves them fine.
import { C } from '../../lib/theme.js';

// ── Sections ────────────────────────────────────────────────────────────────
// `minutesPerModule` / `questionsPerModule` describe ONE module. Each section
// is two modules, so R&W = 2 x 27q x 32min = 54q / 64min, Math = 2 x 22q x
// 35min = 44q / 70min. Total 98 questions in 134 minutes.
export const SAT_SECTIONS = {
  rw: {
    id: 'rw',
    label: 'Reading & Writing',
    short: 'R&W',
    questions: 54,
    questionsPerModule: 27,
    minutesPerModule: 32,
    color: C.violet,
    colorL: C.violetL,
  },
  math: {
    id: 'math',
    label: 'Math',
    short: 'Math',
    questions: 44,
    questionsPerModule: 22,
    minutesPerModule: 35,
    color: C.cyan,
    colorL: C.cyanL,
  },
};

export const SECTION_IDS = ['rw', 'math'];

// Length of the mandatory break between the two sections, in minutes.
export const BREAK_MINUTES = 10;

// ── Domains ─────────────────────────────────────────────────────────────────
// `share` is the fraction of that SECTION's questions the domain accounts for.
// Shares within a section sum to 1.0 (allowing for College Board's own rounding
// — see DOMAIN_SHARE_TOLERANCE in scripts/auditSatBank.mjs).
export const SAT_DOMAINS = {
  // ── Reading & Writing ──
  craft_structure: {
    id: 'craft_structure',
    section: 'rw',
    label: 'Craft and Structure',
    share: 0.28,
    color: C.violet,
    blurb: 'Vocabulary in context, how a text is built, and how two texts relate.',
  },
  info_ideas: {
    id: 'info_ideas',
    section: 'rw',
    label: 'Information and Ideas',
    share: 0.26,
    color: C.indigo,
    blurb: 'Pulling meaning and evidence out of text, tables and graphs.',
  },
  conventions: {
    id: 'conventions',
    section: 'rw',
    label: 'Standard English Conventions',
    share: 0.26,
    color: C.pink,
    blurb: 'Grammar, punctuation and sentence structure — the most learnable points on the test.',
  },
  expression: {
    id: 'expression',
    section: 'rw',
    label: 'Expression of Ideas',
    share: 0.20,
    color: C.fuchsia,
    blurb: 'Revising for a stated rhetorical goal, and connecting ideas logically.',
  },

  // ── Math ──
  algebra: {
    id: 'algebra',
    section: 'math',
    label: 'Algebra',
    share: 0.35,
    color: C.cyan,
    blurb: 'Linear equations, functions, systems and inequalities.',
  },
  advanced_math: {
    id: 'advanced_math',
    section: 'math',
    label: 'Advanced Math',
    share: 0.35,
    color: C.sky,
    blurb: 'Quadratics, exponentials, polynomials and nonlinear systems.',
  },
  psda: {
    id: 'psda',
    section: 'math',
    label: 'Problem-Solving and Data Analysis',
    share: 0.15,
    color: C.teal,
    blurb: 'Rates, percentages, statistics, probability and reading data displays.',
  },
  geo_trig: {
    id: 'geo_trig',
    section: 'math',
    label: 'Geometry and Trigonometry',
    share: 0.15,
    color: C.emerald,
    blurb: 'Angles, triangles, circles, area/volume and right-triangle trig.',
  },
};

export const DOMAIN_IDS = Object.keys(SAT_DOMAINS);

// ── Leaf skills ─────────────────────────────────────────────────────────────
// `weight` is this skill's share WITHIN its domain (each domain's weights sum
// to 1.0), so absolute exam share = domain.share x skill.weight x section size.
// `targetSeconds` is the pacing benchmark a well-prepared student should hit;
// it drives the pacing term in the mastery model and the timing analysis in
// the score report.
export const SAT_SKILLS = {
  // ── Craft and Structure (R&W, 28%) ──
  words_in_context: {
    id: 'words_in_context', domain: 'craft_structure', weight: 0.40,
    label: 'Words in Context', targetSeconds: 60,
    blurb: 'Choose the word or phrase that best fits the logic of the sentence.',
  },
  text_structure_purpose: {
    id: 'text_structure_purpose', domain: 'craft_structure', weight: 0.35,
    label: 'Text Structure and Purpose', targetSeconds: 75,
    blurb: 'Identify why a text is organised the way it is, or the function of one part.',
  },
  cross_text_connections: {
    id: 'cross_text_connections', domain: 'craft_structure', weight: 0.25,
    label: 'Cross-Text Connections', targetSeconds: 95,
    blurb: 'Compare how two authors would respond to each other.',
  },

  // ── Information and Ideas (R&W, 26%) ──
  central_ideas: {
    id: 'central_ideas', domain: 'info_ideas', weight: 0.30,
    label: 'Central Ideas and Details', targetSeconds: 70,
    blurb: 'Find the main idea, or a specific detail the text actually states.',
  },
  command_evidence_text: {
    id: 'command_evidence_text', domain: 'info_ideas', weight: 0.28,
    label: 'Command of Evidence (Textual)', targetSeconds: 80,
    blurb: 'Pick the quotation that best supports a stated claim.',
  },
  command_evidence_quant: {
    id: 'command_evidence_quant', domain: 'info_ideas', weight: 0.20,
    label: 'Command of Evidence (Quantitative)', targetSeconds: 85,
    blurb: 'Use a table or graph to complete or support an argument.',
  },
  inferences: {
    id: 'inferences', domain: 'info_ideas', weight: 0.22,
    label: 'Inferences', targetSeconds: 75,
    blurb: 'Complete the text with the most logical conclusion the evidence forces.',
  },

  // ── Standard English Conventions (R&W, 26%) ──
  boundaries: {
    id: 'boundaries', domain: 'conventions', weight: 0.50,
    label: 'Boundaries', targetSeconds: 45,
    blurb: 'Sentence boundaries: periods, semicolons, colons, commas, dashes.',
  },
  form_structure_sense: {
    id: 'form_structure_sense', domain: 'conventions', weight: 0.50,
    label: 'Form, Structure and Sense', targetSeconds: 50,
    blurb: 'Subject-verb agreement, pronouns, verb tense, modifiers, parallelism.',
  },

  // ── Expression of Ideas (R&W, 20%) ──
  rhetorical_synthesis: {
    id: 'rhetorical_synthesis', domain: 'expression', weight: 0.55,
    label: 'Rhetorical Synthesis', targetSeconds: 90,
    blurb: 'Given notes and a stated goal, choose the sentence that accomplishes it.',
  },
  transitions: {
    id: 'transitions', domain: 'expression', weight: 0.45,
    label: 'Transitions', targetSeconds: 55,
    blurb: 'Choose the transition that matches the logical relationship between ideas.',
  },

  // ── Algebra (Math, 35%) ──
  linear_equations_1var: {
    id: 'linear_equations_1var', domain: 'algebra', weight: 0.22,
    label: 'Linear Equations in One Variable', targetSeconds: 60,
    blurb: 'Solve, and recognise when an equation has no or infinitely many solutions.',
  },
  linear_equations_2var: {
    id: 'linear_equations_2var', domain: 'algebra', weight: 0.24,
    label: 'Linear Equations in Two Variables', targetSeconds: 70,
    blurb: 'Slope, intercepts, and building an equation from a described situation.',
  },
  linear_functions: {
    id: 'linear_functions', domain: 'algebra', weight: 0.22,
    label: 'Linear Functions', targetSeconds: 70,
    blurb: 'Interpret f(x) notation, rate of change and initial value in context.',
  },
  systems_linear: {
    id: 'systems_linear', domain: 'algebra', weight: 0.20,
    label: 'Systems of Linear Equations', targetSeconds: 80,
    blurb: 'Solve two-variable systems and reason about their number of solutions.',
  },
  linear_inequalities: {
    id: 'linear_inequalities', domain: 'algebra', weight: 0.12,
    label: 'Linear Inequalities', targetSeconds: 75,
    blurb: 'Solve inequalities and model constraints in word problems.',
  },

  // ── Advanced Math (Math, 35%) ──
  equivalent_expressions: {
    id: 'equivalent_expressions', domain: 'advanced_math', weight: 0.32,
    label: 'Equivalent Expressions', targetSeconds: 75,
    blurb: 'Factor, expand and rewrite expressions — including exponent rules.',
  },
  nonlinear_equations: {
    id: 'nonlinear_equations', domain: 'advanced_math', weight: 0.36,
    label: 'Nonlinear Equations and Systems', targetSeconds: 90,
    blurb: 'Quadratics, radicals, rational equations and nonlinear systems.',
  },
  nonlinear_functions: {
    id: 'nonlinear_functions', domain: 'advanced_math', weight: 0.32,
    label: 'Nonlinear Functions', targetSeconds: 85,
    blurb: 'Parabolas, exponential growth/decay, and reading nonlinear graphs.',
  },

  // ── Problem-Solving and Data Analysis (Math, 15%) ──
  ratios_rates_units: {
    id: 'ratios_rates_units', domain: 'psda', weight: 0.22,
    label: 'Ratios, Rates and Units', targetSeconds: 70,
    blurb: 'Proportional reasoning and unit conversion.',
  },
  percentages: {
    id: 'percentages', domain: 'psda', weight: 0.18,
    label: 'Percentages', targetSeconds: 65,
    blurb: 'Percent change, percent of, and successive percentage changes.',
  },
  data_distributions: {
    id: 'data_distributions', domain: 'psda', weight: 0.24,
    label: 'One- and Two-Variable Data', targetSeconds: 80,
    blurb: 'Mean/median/range, standard deviation reasoning, scatterplots and line of best fit.',
  },
  probability: {
    id: 'probability', domain: 'psda', weight: 0.18,
    label: 'Probability and Conditional Probability', targetSeconds: 75,
    blurb: 'Read two-way tables and compute simple and conditional probabilities.',
  },
  inference_margin_error: {
    id: 'inference_margin_error', domain: 'psda', weight: 0.18,
    label: 'Inference from Samples and Evaluating Claims', targetSeconds: 70,
    blurb: 'Sampling validity, margin of error, and what a study can legitimately conclude.',
  },

  // ── Geometry and Trigonometry (Math, 15%) ──
  area_volume: {
    id: 'area_volume', domain: 'geo_trig', weight: 0.26,
    label: 'Area and Volume', targetSeconds: 75,
    blurb: 'Composite figures, scaling, and the reference-sheet formulas.',
  },
  lines_angles_triangles: {
    id: 'lines_angles_triangles', domain: 'geo_trig', weight: 0.28,
    label: 'Lines, Angles and Triangles', targetSeconds: 75,
    blurb: 'Parallel lines, triangle angle rules, similarity and congruence.',
  },
  right_triangles_trig: {
    id: 'right_triangles_trig', domain: 'geo_trig', weight: 0.26,
    label: 'Right Triangles and Trigonometry', targetSeconds: 80,
    blurb: 'Pythagoras, special right triangles, SOH-CAH-TOA and cofunction identities.',
  },
  circles: {
    id: 'circles', domain: 'geo_trig', weight: 0.20,
    label: 'Circles', targetSeconds: 85,
    blurb: 'Arc length, sector area, radians, and the equation of a circle.',
  },
};

export const SKILL_IDS = Object.keys(SAT_SKILLS);

// ── Derived lookups ─────────────────────────────────────────────────────────
// Built once at module load. Prefer these over filtering SAT_SKILLS at call
// sites — the heat map, selector and score report all hit them per render.

/** Skill ids belonging to a domain, in declaration order. */
export const SKILLS_BY_DOMAIN = DOMAIN_IDS.reduce((acc, d) => {
  acc[d] = SKILL_IDS.filter(s => SAT_SKILLS[s].domain === d);
  return acc;
}, {});

/** Domain ids belonging to a section, in declaration order. */
export const DOMAINS_BY_SECTION = SECTION_IDS.reduce((acc, s) => {
  acc[s] = DOMAIN_IDS.filter(d => SAT_DOMAINS[d].section === s);
  return acc;
}, {});

/** Skill ids belonging to a section. */
export const SKILLS_BY_SECTION = SECTION_IDS.reduce((acc, s) => {
  acc[s] = DOMAINS_BY_SECTION[s].flatMap(d => SKILLS_BY_DOMAIN[d]);
  return acc;
}, {});

/** The section a skill belongs to, via its domain. */
export const sectionOfSkill = (skillId) => SAT_DOMAINS[SAT_SKILLS[skillId]?.domain]?.section || null;

/**
 * Expected number of questions for this skill on a real 98-question exam.
 * = section question count x domain share x skill weight.
 * Used to build test forms and to weight `leverage` (see src/lib/sat/mastery.js).
 */
export function expectedQuestionCount(skillId) {
  const skill = SAT_SKILLS[skillId];
  if (!skill) return 0;
  const domain = SAT_DOMAINS[skill.domain];
  const section = SAT_SECTIONS[domain.section];
  return section.questions * domain.share * skill.weight;
}

/**
 * Share of the WHOLE 98-question exam this skill represents. Sums to ~1.0
 * across all 26 skills. This is the number that answers "how many points is
 * fixing this skill actually worth?".
 */
export function examShare(skillId) {
  const total = SAT_SECTIONS.rw.questions + SAT_SECTIONS.math.questions;
  return expectedQuestionCount(skillId) / total;
}

/** Display metadata for a skill, with a safe fallback for unknown ids. */
export function skillMeta(skillId) {
  const skill = SAT_SKILLS[skillId];
  if (!skill) {
    return { id: skillId, label: skillId, domain: null, domainLabel: 'Unknown', section: null, color: C.blue, targetSeconds: 75 };
  }
  const domain = SAT_DOMAINS[skill.domain];
  const section = SAT_SECTIONS[domain.section];
  return {
    ...skill,
    domainLabel: domain.label,
    domainColor: domain.color,
    section: domain.section,
    sectionLabel: section.label,
    color: domain.color,
  };
}

// ── Difficulty ──────────────────────────────────────────────────────────────
// Three bands, matching how College Board describes its own item pool. `weight`
// is the scoring credit an item carries in our adaptive routing calculation —
// harder items count for more, which is why Module 1 routing is computed on a
// weighted raw score rather than a plain count (see src/lib/sat/adaptive.js).
export const DIFFICULTIES = {
  E: { id: 'E', label: 'Easy',   weight: 0.8, color: C.green },
  M: { id: 'M', label: 'Medium', weight: 1.0, color: C.amber },
  H: { id: 'H', label: 'Hard',   weight: 1.3, color: C.rose },
};

export const DIFFICULTY_IDS = ['E', 'M', 'H'];

// ── Error taxonomy ──────────────────────────────────────────────────────────
// The triage a student performs on every miss in the Review Log. Keeping this
// small and mutually exclusive is deliberate: a 12-option taxonomy produces
// noise, five produces a signal you can actually act on. `prescription` is the
// default remedy surfaced alongside the pattern callout.
export const ERROR_TYPES = {
  content_gap: {
    id: 'content_gap', label: "Didn't know the content", color: C.rose,
    prescription: 'Study the concept, then drill this skill until it is automatic.',
  },
  careless: {
    id: 'careless', label: 'Careless slip', color: C.amber,
    prescription: 'You knew this. Slow down by five seconds and write the step out.',
  },
  misread: {
    id: 'misread', label: 'Misread the question', color: C.orange,
    prescription: 'Underline exactly what is being asked before you look at the choices.',
  },
  ran_out_of_time: {
    id: 'ran_out_of_time', label: 'Ran out of time', color: C.violet,
    prescription: 'Practise this skill under a timer. Learn to recognise and skip time sinks.',
  },
  guessed: {
    id: 'guessed', label: 'Guessed — reasoning was wrong', color: C.sky,
    prescription: 'A right answer for the wrong reason will not repeat. Redo it properly.',
  },
};

export const ERROR_TYPE_IDS = Object.keys(ERROR_TYPES);

// ── Trap tags ───────────────────────────────────────────────────────────────
// Attached to individual questions (`trap` field) to describe the specific
// mistake the item is designed to catch. Powers the pattern detection in
// src/lib/sat/errorPatterns.js ("7 of your last 10 Boundaries misses were the
// same trap"). Extend freely — unknown tags degrade to their raw id.
export const TRAP_TAGS = {
  comma_splice:        'Comma splice — two full sentences joined by a comma',
  run_on:              'Run-on — no punctuation between full sentences',
  fragment:            'Fragment sold as a complete sentence',
  subject_verb:        'Subject-verb agreement across an interrupting phrase',
  pronoun_ambiguity:   'Pronoun with no clear antecedent',
  dangling_modifier:   'Modifier attached to the wrong noun',
  tense_shift:         'Unnecessary shift in verb tense',
  wrong_transition:    'Transition asserts the wrong logical relationship',
  out_of_scope:        'True in the world, but not stated in the passage',
  too_extreme:         'Right idea, overstated with absolute language',
  half_right:          'First half correct, second half wrong',
  answers_wrong_goal:  'Accurate sentence that ignores the stated rhetorical goal',
  sign_error:          'Dropped or flipped a negative sign',
  solved_for_wrong:    'Solved correctly, but for the wrong quantity',
  unit_mismatch:       'Forgot to convert units',
  extraneous_solution: 'Included a solution the original equation rejects',
  distributed_wrong:   'Distribution or factoring slip',
  percent_of_what:     'Took the percentage of the wrong base',
  mean_vs_median:      'Confused mean with median',
  correlation_cause:   'Read causation into a correlational study',
  degrees_radians:     'Mixed up degrees and radians',
  reference_formula:   'Misapplied a reference-sheet formula',
};
