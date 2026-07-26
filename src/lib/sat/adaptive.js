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
  SAT_SECTIONS, SAT_DOMAINS, DOMAINS_BY_SECTION, SECTION_IDS, BREAK_MINUTES,
} from '../../data/sat/taxonomy';
import { pool } from '../../data/sat/questions/index.js';
import { routeModule2, scoreSection, compositeScore, compositePercentile } from '../../data/sat/scoring';
import { seededRandom, seededShuffle, hashString } from './shuffle';

// Difficulty mix per module. Module 1 is deliberately mixed so it can
// discriminate across the whole ability range. Module 2 skews to match the
// path: the upper module is genuinely harder, which is what makes its higher
// score ceiling legitimate rather than arbitrary.
export const MODULE_BLUEPRINTS = {
  module1: { E: 0.30, M: 0.45, H: 0.25 },
  upper:   { E: 0.10, M: 0.40, H: 0.50 },
  lower:   { E: 0.55, M: 0.35, H: 0.10 },
};

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

  // Fill domain by domain so the module matches the real content blueprint,
  // and within each domain honour the difficulty mix.
  for (const domainId of DOMAINS_BY_SECTION[section]) {
    const domainTarget = Math.round(target * SAT_DOMAINS[domainId].share);
    for (const [difficulty, share] of Object.entries(mix)) {
      const want = Math.round(domainTarget * share);
      if (want <= 0) continue;
      const candidates = pool({ domain: domainId, difficulty, exclude: used });
      const take = seededShuffle(candidates, rng).slice(0, want);
      take.forEach(q => used.add(q.id));
      picked.push(...take);
    }
  }

  // Top up from anywhere in the section if rounding or bank gaps left us short.
  if (picked.length < target) {
    const filler = seededShuffle(pool({ section, exclude: used }), rng);
    for (const q of filler.slice(0, target - picked.length)) {
      used.add(q.id);
      picked.push(q);
    }
  }

  return {
    questions: seededShuffle(picked, rng).slice(0, target),
    shortfall: Math.max(0, target - picked.length),
    requested: target,
  };
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
