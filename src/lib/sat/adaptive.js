// ─────────────────────────────────────────────────────────────────────────────
// Full-length adaptive test assembly and routing.
//
// The Digital SAT is SECTION-adaptive, not question-adaptive: everyone gets the
// same Module 1 blueprint, and performance on it routes you into an easier or
// harder Module 2. Replicating that faithfully is what makes a practice test
// worth taking — a flat, non-adaptive mock cannot tell a student the one thing
// they most need to know, which is whether they are clearing the routing bar.
//
// Test shape (see SAT_SECTIONS in the taxonomy):
//   R&W  Module 1  27q / 32min  ->  R&W  Module 2  27q / 32min
//   [10-minute break]
//   Math Module 1  22q / 35min  ->  Math Module 2  22q / 35min
// ─────────────────────────────────────────────────────────────────────────────
import {
  SAT_SECTIONS, SAT_DOMAINS, SAT_SKILLS, DOMAINS_BY_SECTION, SECTION_IDS, BREAK_MINUTES,
} from '../../data/sat/taxonomy.js';
import { pool } from '../../data/sat/questions/index.js';
import { routeModule2, scoreSection, compositeScore, compositePercentile } from '../../data/sat/scoring.js';
import { seededRandom, seededShuffle, hashString } from './shuffle.js';

// Difficulty mix per module. Module 1 is deliberately mixed so it can
// discriminate across the whole ability range. Module 2 skews to match the
// path: the upper module is genuinely harder, which is what makes its higher
// score ceiling legitimate rather than arbitrary.
export const MODULE_BLUEPRINTS = {
  module1: { E: 0.30, M: 0.45, H: 0.25 },
  upper:   { E: 0.10, M: 0.40, H: 0.50 },
  lower:   { E: 0.55, M: 0.35, H: 0.10 },
};

// ── Presentation order ──────────────────────────────────────────────────────
//
// A module is not a shuffled bag, and shipping one as if it were is the single
// most obvious way a practice test gives itself away to anyone who has actually
// sat the exam. Bluebook orders a Reading & Writing module by DOMAIN, in a
// fixed sequence, with questions testing the same skill grouped together and
// running easiest-to-hardest inside each group. A student learns to read that
// shape — they know roughly where they are in a module from the question type
// alone, and they know a question appearing late in its group is meant to be
// hard. A randomised module trains none of that and feels wrong immediately.
//
// The one documented exception is Standard English Conventions, which is
// ordered by difficulty ALONE, irrespective of which rule is being tested. So a
// comma question can sit next to a subject-verb question there, and does.
export const RW_DOMAIN_ORDER = ['craft_structure', 'info_ideas', 'conventions', 'expression'];

const DIFFICULTY_RANK = { E: 0, M: 1, H: 2 };

/**
 * Order one Reading & Writing module the way Bluebook presents it.
 *
 * Within a domain, skills appear in taxonomy order and each skill's questions
 * run easy -> hard. Conventions is the exception noted above: one flat
 * easy -> hard run, with ties broken randomly so the two Conventions skills
 * interleave rather than marching through all the comma items first.
 */
function orderRwModule(questions, rng) {
  const jitter = new Map(questions.map(q => [q.id, rng()]));
  const skillOrder = Object.keys(SAT_SKILLS);

  const byDomain = new Map(RW_DOMAIN_ORDER.map(d => [d, []]));
  const orphans = [];
  for (const q of questions) {
    if (byDomain.has(q.domain)) byDomain.get(q.domain).push(q);
    else orphans.push(q);
  }

  const out = [];
  for (const domain of RW_DOMAIN_ORDER) {
    const group = byDomain.get(domain) || [];
    group.sort((a, b) => {
      if (domain !== 'conventions') {
        const sa = skillOrder.indexOf(a.skill);
        const sb = skillOrder.indexOf(b.skill);
        if (sa !== sb) return sa - sb;
      }
      const da = DIFFICULTY_RANK[a.difficulty] ?? 1;
      const db = DIFFICULTY_RANK[b.difficulty] ?? 1;
      if (da !== db) return da - db;
      return jitter.get(a.id) - jitter.get(b.id);
    });
    out.push(...group);
  }
  return [...out, ...orphans];
}

/**
 * Order one Math module.
 *
 * Math has no domain grouping — a module walks through all four domains — but
 * it does trend easy -> hard, and grid-ins (student-produced response) are
 * scattered through rather than parked at the end the way the old paper test
 * did it. Both matter for pacing practice: a student needs to feel the ramp,
 * and needs to meet a grid-in when they are not braced for one.
 *
 * The ramp is deliberately soft, not a strict sort. A perfectly monotonic
 * module is its own tell — the moment a student notices question 18 is always
 * harder than question 17 they start using position as a difficulty cue, which
 * is a habit the real test will punish. Sorting on difficulty PLUS noise gives
 * the genuine trend with the local disorder the real thing has.
 */
function orderMathModule(questions, rng) {
  const RAMP_NOISE = 0.8; // in difficulty-rank units; ~ one band of local slop
  return [...questions]
    .map(q => ({
      q,
      key: (DIFFICULTY_RANK[q.difficulty] ?? 1) + (rng() - 0.5) * 2 * RAMP_NOISE,
    }))
    .sort((a, b) => a.key - b.key)
    .map(x => x.q);
}

/** Order a built module for presentation, per its section's real conventions. */
export function orderModule(section, questions, rng) {
  return section === 'rw' ? orderRwModule(questions, rng) : orderMathModule(questions, rng);
}

// ── Allocation ──────────────────────────────────────────────────────────────

/**
 * Largest-remainder apportionment: split `total` across `weights` so the parts
 * are proportional AND sum to exactly `total`.
 *
 * Naive per-bucket rounding was the previous approach and it leaked questions:
 * rounding four domain shares and then three difficulty shares inside each of
 * them compounds, and a 27-question module routinely came out at 24 or 25 with
 * the remainder back-filled at random from anywhere in the section. That
 * silently broke the blueprint the module is supposed to be reproducing.
 *
 * @param {number} total
 * @param {Array<{key:string, weight:number}>} weights
 * @returns {Map<string, number>}
 */
export function apportion(total, weights) {
  const sum = weights.reduce((s, w) => s + (w.weight || 0), 0);
  if (!sum || total <= 0) return new Map(weights.map(w => [w.key, 0]));

  const rows = weights.map(w => {
    const exact = (w.weight / sum) * total;
    return { key: w.key, exact, n: Math.floor(exact) };
  });
  let assigned = rows.reduce((s, r) => s + r.n, 0);
  rows.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; assigned < total; i++, assigned++) rows[i % rows.length].n += 1;

  return new Map(rows.map(r => [r.key, r.n]));
}

// Share of a Math module that is student-produced response (grid-in). College
// Board puts it at about a quarter; 22 x 0.25 rounds to 6 in practice, and a
// module that hands a student 22 multiple-choice questions in a row teaches
// them nothing about typing an answer into a box under time pressure.
export const MATH_SPR_SHARE = 0.25;

/** Ordered stages of a full test, for the player's state machine. */
export function buildTestPlan() {
  const stages = [];
  for (const section of SECTION_IDS) {
    stages.push({ type: 'module', section, module: 1 });
    stages.push({ type: 'module', section, module: 2 });
    if (section === 'rw') stages.push({ type: 'break', minutes: BREAK_MINUTES });
  }
  return stages;
}

/**
 * Assemble one module: `count` questions matching a section's domain blueprint
 * and the module's difficulty mix.
 *
 * Falls back gracefully when the bank cannot satisfy the exact mix — a thin
 * bank should yield a shorter or slightly off-mix module rather than throwing.
 * `meta.shortfall` reports the gap so the UI can be honest about it.
 */
export function buildModule({
  section, blueprint = 'module1', count, exclude = new Set(), seed = Date.now(),
}) {
  const rng = seededRandom(hashString(`${section}::${blueprint}::${seed}`));
  const target = count ?? SAT_SECTIONS[section].questionsPerModule;
  const mix = MODULE_BLUEPRINTS[blueprint] || MODULE_BLUEPRINTS.module1;
  const used = new Set(exclude);
  const picked = [];

  // Domain counts first, exactly (see apportion), then the difficulty mix
  // exactly within each domain. Two levels of largest-remainder rather than two
  // levels of Math.round.
  const domainIds = DOMAINS_BY_SECTION[section];
  const perDomain = apportion(target, domainIds.map(d => ({ key: d, weight: SAT_DOMAINS[d].share })));

  for (const domainId of domainIds) {
    const domainTarget = perDomain.get(domainId) || 0;
    if (domainTarget <= 0) continue;
    const perDifficulty = apportion(
      domainTarget,
      Object.entries(mix).map(([d, share]) => ({ key: d, weight: share })),
    );
    for (const [difficulty, want] of perDifficulty) {
      if (want <= 0) continue;
      const candidates = pool({ domain: domainId, difficulty, exclude: used });
      const take = seededShuffle(candidates, rng).slice(0, want);
      take.forEach(q => used.add(q.id));
      picked.push(...take);
      // If the bank is thin at this exact (domain, difficulty), borrow from the
      // adjacent band in the SAME domain before giving up on the domain count.
      // Content coverage is the promise a blueprint makes; the difficulty mix
      // is a means to it, so that is the one to bend first.
      let missing = want - take.length;
      if (missing > 0) {
        const nearby = difficulty === 'M' ? ['H', 'E'] : difficulty === 'E' ? ['M', 'H'] : ['M', 'E'];
        for (const alt of nearby) {
          if (missing <= 0) break;
          const extra = seededShuffle(pool({ domain: domainId, difficulty: alt, exclude: used }), rng).slice(0, missing);
          extra.forEach(q => used.add(q.id));
          picked.push(...extra);
          missing -= extra.length;
        }
      }
    }
  }

  // Top up from anywhere in the section only as a last resort — this is the
  // path that breaks the blueprint, so `shortfall` reports how far it had to go.
  if (picked.length < target) {
    const filler = seededShuffle(pool({ section, exclude: used }), rng);
    for (const q of filler.slice(0, target - picked.length)) {
      used.add(q.id);
      picked.push(q);
    }
  }

  let questions = picked.slice(0, target);

  // Math: hold the grid-in share near the real one by swapping formats within a
  // domain, so correcting the format never costs the content blueprint.
  if (section === 'math') questions = balanceSprShare(questions, used, rng);

  return {
    questions: orderModule(section, questions, rng),
    shortfall: Math.max(0, target - questions.length),
    requested: target,
    sprCount: questions.filter(q => q.format === 'spr').length,
  };
}

/**
 * Nudge a built Math module toward MATH_SPR_SHARE grid-ins by swapping items
 * for same-domain, same-difficulty items of the other format. Swapping inside
 * (domain, difficulty) is what makes this safe: the module's content and
 * difficulty blueprint are untouched, only the response format moves.
 * Best-effort — a bank with no grid-ins for a domain simply keeps what it has.
 */
function balanceSprShare(questions, used, rng) {
  const wantSpr = Math.round(questions.length * MATH_SPR_SHARE);
  const out = [...questions];

  const swapOne = (fromFormat, toFormat) => {
    const candidates = out
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.format === fromFormat);
    for (const { q, i } of seededShuffle(candidates, rng)) {
      const replacements = pool({ domain: q.domain, difficulty: q.difficulty, exclude: used })
        .filter(r => r.format === toFormat);
      if (!replacements.length) continue;
      const pick = seededShuffle(replacements, rng)[0];
      used.add(pick.id);
      used.delete(q.id);
      out[i] = pick;
      return true;
    }
    return false;
  };

  let guard = questions.length;
  while (out.filter(q => q.format === 'spr').length < wantSpr && guard-- > 0) {
    if (!swapOne('mcq', 'spr')) break;
  }
  guard = questions.length;
  while (out.filter(q => q.format === 'spr').length > wantSpr && guard-- > 0) {
    if (!swapOne('spr', 'mcq')) break;
  }
  return out;
}

/**
 * Build the first module of a section. Module 2 is NOT built here — it cannot
 * be, because which one the student gets depends on how they do on module 1.
 */
export function buildModule1(section, { exclude = new Set(), seed = Date.now() } = {}) {
  return buildModule({ section, blueprint: 'module1', exclude, seed });
}

/**
 * Decide the path from module 1 responses and build the matching module 2.
 * @returns {{path, fraction, threshold, questions, shortfall}}
 */
export function buildModule2(section, module1Responses, { exclude = new Set(), seed = Date.now() } = {}) {
  const routing = routeModule2(module1Responses);
  const built = buildModule({ section, blueprint: routing.path, exclude, seed });
  return { ...routing, ...built };
}

/**
 * Score a finished full test.
 *
 * @param {{rw:{module1:Array,module2:Array}, math:{module1:Array,module2:Array}}} responsesBySection
 * @returns {{sections:object, composite:number, percentile:number, complete:boolean}}
 */
export function scoreFullTest(responsesBySection) {
  const sections = {};
  for (const section of SECTION_IDS) {
    const s = responsesBySection[section] || {};
    sections[section] = scoreSection(section, s.module1 || [], s.module2 || []);
  }
  const composite = compositeScore(sections.rw.scaled, sections.math.scaled);
  return {
    sections,
    composite,
    percentile: compositePercentile(composite),
    complete: SECTION_IDS.every(s => (responsesBySection[s]?.module2 || []).length > 0),
  };
}

/**
 * Per-domain accuracy breakdown for the score report — the "where did the
 * points go" view, which is the part of a practice test that actually teaches.
 */
export function domainBreakdown(responses = []) {
  const byDomain = {};
  for (const r of responses) {
    if (!r.domain) continue;
    const d = (byDomain[r.domain] ||= { domain: r.domain, total: 0, correct: 0, seconds: 0, timed: 0 });
    d.total++;
    if (r.correct) d.correct++;
    if (typeof r.seconds === 'number') { d.seconds += r.seconds; d.timed++; }
  }
  return Object.values(byDomain)
    .map(d => ({
      ...d,
      label: SAT_DOMAINS[d.domain]?.label || d.domain,
      color: SAT_DOMAINS[d.domain]?.color,
      section: SAT_DOMAINS[d.domain]?.section,
      accuracy: d.total ? d.correct / d.total : 0,
      avgSeconds: d.timed ? Math.round(d.seconds / d.timed) : null,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Pacing analysis: where the student is losing time, and whether running long
 * is actually costing them accuracy.
 */
export function pacingAnalysis(responses = []) {
  const timed = responses.filter(r => typeof r.seconds === 'number' && r.seconds > 0 && r.targetSeconds);
  if (!timed.length) return null;

  const overTime = timed.filter(r => r.seconds > r.targetSeconds * 1.5);
  const rushed = timed.filter(r => r.seconds < r.targetSeconds * 0.4);
  const totalSeconds = timed.reduce((s, r) => s + r.seconds, 0);
  const targetTotal = timed.reduce((s, r) => s + r.targetSeconds, 0);

  return {
    answered: timed.length,
    avgRatio: targetTotal ? totalSeconds / targetTotal : null,
    overTimeCount: overTime.length,
    overTimeAccuracy: overTime.length ? overTime.filter(r => r.correct).length / overTime.length : null,
    rushedCount: rushed.length,
    rushedAccuracy: rushed.length ? rushed.filter(r => r.correct).length / rushed.length : null,
    onPaceAccuracy: (() => {
      const onPace = timed.filter(r => r.seconds <= r.targetSeconds * 1.5 && r.seconds >= r.targetSeconds * 0.4);
      return onPace.length ? onPace.filter(r => r.correct).length / onPace.length : null;
    })(),
  };
}

/**
 * A plain-language read on what the routing outcome means, for the score
 * report. Explaining the ceiling is the single most useful thing a practice
 * test can tell a student about the adaptive format.
 */
export function routingNarrative(sectionResult) {
  const { section, path, ceiling, scaled } = sectionResult;
  const label = SAT_SECTIONS[section].label;
  if (path === 'upper') {
    return `You cleared the routing bar on ${label} Module 1, so you got the harder Module 2 and had the full 800 available. You scored ${scaled}.`;
  }
  return `Your ${label} Module 1 fell below the routing bar, so you got the easier Module 2. That capped this section near ${ceiling} no matter how well you did afterwards — which is why Module 1 matters more than its question count suggests.`;
}
