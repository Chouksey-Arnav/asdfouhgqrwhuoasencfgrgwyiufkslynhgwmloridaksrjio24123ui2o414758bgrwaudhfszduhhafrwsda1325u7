// ─────────────────────────────────────────────────────────────────────────────
// Adaptive item selection — the deliberate-practice engine.
//
// Three modes, all built on the same weighted sampler:
//   buildSkillDrill   one skill, easy -> hard
//   buildTimedSet     section-realistic blueprint mix, timed
//   buildSmartSet     the default: leverage-weighted, injects due review-log
//                     retries, and pushes difficulty just past current level
//
// The guiding rule is the one thing the research agrees on: practice should be
// concentrated where the student is weak AND the exam is heavy, not spread
// evenly, and not chosen by the student's own (usually wrong) sense of what
// they need.
// ─────────────────────────────────────────────────────────────────────────────
import {
  SAT_SKILLS, SKILL_IDS, SKILLS_BY_SECTION, DOMAINS_BY_SECTION, SAT_DOMAINS,
  DIFFICULTY_IDS, examShare, sectionOfSkill,
} from '../../data/sat/taxonomy';
import { pool, QUESTIONS_BY_SKILL } from '../../data/sat/questions/index.js';
import { computeLeverage } from './mastery';
import { seededRandom, seededShuffle, hashString } from './shuffle';

// Fraction of a Smart Set reserved for questions on skills the student has
// already missed — spaced retrieval of known-weak material.
const REVIEW_SHARE = 0.25;
// Fraction held at a difficulty above the student's current level. Practice
// entirely at your comfort level does not move a score.
const STRETCH_SHARE = 0.20;

/** Pick `n` items from `items` without replacement, weighted by weightFn. */
function weightedSample(items, n, weightFn, rng) {
  const remaining = [...items];
  const chosen = [];
  while (chosen.length < n && remaining.length) {
    const weights = remaining.map(weightFn);
    const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
    if (total <= 0) {
      // All weights collapsed to zero — fall back to uniform so we still fill
      // the set rather than returning short.
      chosen.push(...seededShuffle(remaining, rng).slice(0, n - chosen.length));
      break;
    }
    let roll = rng() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= Math.max(0, weights[i]);
      if (roll <= 0) { idx = i; break; }
      idx = i;
    }
    chosen.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return chosen;
}

/**
 * Which difficulty to aim for next on a skill, from its current mastery.
 * Deliberately one notch above comfort — that is where learning happens.
 */
export function targetDifficulty(mastery = 0) {
  if (mastery < 0.45) return 'E';
  if (mastery < 0.75) return 'M';
  return 'H';
}

const stretchOf = (d) => (d === 'E' ? 'M' : 'H');

/**
 * A single-skill drill: `count` questions on one skill, ordered easy -> hard so
 * the student rebuilds the concept before being tested at exam difficulty.
 */
export function buildSkillDrill(skillId, { count = 10, seen = new Set(), seed = Date.now() } = {}) {
  const rng = seededRandom(hashString(String(seed)));
  const available = pool({ skill: skillId });
  if (!available.length) return [];

  // Prefer unseen questions, but fall back to seen ones rather than returning a
  // short set — a thin bank should degrade to repetition, not to nothing.
  const unseen = available.filter(q => !seen.has(q.id));
  const primary = seededShuffle(unseen, rng).slice(0, count);
  if (primary.length < count) {
    const filler = seededShuffle(available.filter(q => !primary.includes(q)), rng);
    primary.push(...filler.slice(0, count - primary.length));
  }

  const order = { E: 0, M: 1, H: 2 };
  return primary.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
}

/**
 * A timed set built to a section's real domain blueprint, so pacing practice
 * reflects the actual mix a student will face.
 */
export function buildTimedSet(section, { count = 22, seen = new Set(), seed = Date.now() } = {}) {
  const rng = seededRandom(hashString(`timed::${seed}`));
  const domains = DOMAINS_BY_SECTION[section] || [];
  const picked = [];
  const used = new Set();

  for (const domainId of domains) {
    const target = Math.round(count * SAT_DOMAINS[domainId].share);
    const available = pool({ domain: domainId, exclude: used });
    if (!available.length) continue;
    const unseen = available.filter(q => !seen.has(q.id));
    const source = unseen.length >= target ? unseen : available;
    const take = seededShuffle(source, rng).slice(0, target);
    take.forEach(q => used.add(q.id));
    picked.push(...take);
  }

  // Top up if rounding left the set short.
  if (picked.length < count) {
    const filler = seededShuffle(pool({ section, exclude: used }), rng);
    picked.push(...filler.slice(0, count - picked.length));
  }

  return seededShuffle(picked, rng).slice(0, count);
}

/**
 * The Smart Set — the default practice mode and the heart of the tab.
 *
 * @param {object} opts
 * @param {object} opts.masteryMap    from computeAllMastery()
 * @param {Array}  opts.dueReviewIds  question ids due for retry (Review Log)
 * @param {Set}    opts.seen          already-answered question ids
 * @param {string} [opts.section]     restrict to one section
 * @param {number} [opts.count]
 * @returns {{questions:Array, rationale:Array<{skill,label,reason}>}}
 */
export function buildSmartSet({
  masteryMap = {},
  dueReviewIds = [],
  seen = new Set(),
  section = null,
  count = 12,
  seed = Date.now(),
} = {}) {
  const rng = seededRandom(hashString(`smart::${seed}`));
  const used = new Set();
  const questions = [];

  // ── 1. Due review retries ──
  // Spaced retrieval of questions the student has already missed. These come
  // first so a thin bank never crowds them out.
  const reviewTarget = Math.floor(count * REVIEW_SHARE);
  const dueSet = new Set(dueReviewIds);
  const reviewQuestions = pool({ section: section || undefined })
    .filter(q => dueSet.has(q.id))
    .slice(0, reviewTarget);
  reviewQuestions.forEach(q => { used.add(q.id); questions.push({ ...q, _source: 'review' }); });

  // ── 2. Leverage-weighted skill selection ──
  const candidateSkills = (section ? SKILLS_BY_SECTION[section] : SKILL_IDS)
    .filter(id => (QUESTIONS_BY_SKILL[id]?.length || 0) > 0);

  const remaining = count - questions.length;
  const stretchCount = Math.round(remaining * STRETCH_SHARE);
  const rationale = [];

  for (let i = 0; i < remaining; i++) {
    // Re-sample the skill each iteration so a set naturally spreads across
    // several weak skills rather than dumping all 12 questions on the worst one.
    const skillId = weightedSample(
      candidateSkills, 1,
      (id) => {
        const lev = computeLeverage(id, masteryMap[id]);
        // Damp skills already represented in this set so we get variety.
        const alreadyPicked = questions.filter(q => q.skill === id).length;
        return lev / (1 + alreadyPicked * 1.5);
      },
      rng,
    )[0];
    if (!skillId) break;

    const mastery = masteryMap[skillId]?.mastery ?? 0;
    const base = targetDifficulty(mastery);
    const wantStretch = i >= remaining - stretchCount;
    const wanted = wantStretch ? stretchOf(base) : base;

    // Try the wanted difficulty, then any difficulty, then give up on this skill.
    let candidates = pool({ skill: skillId, difficulty: wanted, exclude: used }).filter(q => !seen.has(q.id));
    if (!candidates.length) candidates = pool({ skill: skillId, difficulty: wanted, exclude: used });
    if (!candidates.length) candidates = pool({ skill: skillId, exclude: used }).filter(q => !seen.has(q.id));
    if (!candidates.length) candidates = pool({ skill: skillId, exclude: used });
    if (!candidates.length) continue;

    const q = seededShuffle(candidates, rng)[0];
    used.add(q.id);
    questions.push({ ...q, _source: wantStretch ? 'stretch' : 'target' });

    if (!rationale.some(r => r.skill === skillId)) {
      rationale.push({
        skill: skillId,
        label: SAT_SKILLS[skillId].label,
        reason: masteryMap[skillId]?.attempts
          ? `${Math.round((masteryMap[skillId].mastery) * 100)}% mastery · ${(examShare(skillId) * 98).toFixed(1)} questions per exam`
          : 'not practiced yet',
      });
    }
  }

  return { questions: seededShuffle(questions, rng), rationale };
}

/**
 * Diagnostic blueprint — spread deliberately WIDE rather than deep, because the
 * job of a diagnostic is coverage, not precision on any one skill. Aims for at
 * least one item per skill that has bank content, weighted toward heavier
 * domains, at mixed difficulty.
 */
export function buildDiagnostic({ count = 30, seed = Date.now() } = {}) {
  const rng = seededRandom(hashString(`diag::${seed}`));
  const used = new Set();
  const picked = [];

  // Pass 1 — one medium (or nearest available) item from every covered skill.
  const covered = SKILL_IDS.filter(id => (QUESTIONS_BY_SKILL[id]?.length || 0) > 0);
  const byLeverage = [...covered].sort((a, b) => examShare(b) - examShare(a));
  for (const skillId of byLeverage) {
    if (picked.length >= count) break;
    let candidates = pool({ skill: skillId, difficulty: 'M', exclude: used });
    if (!candidates.length) candidates = pool({ skill: skillId, exclude: used });
    if (!candidates.length) continue;
    const q = seededShuffle(candidates, rng)[0];
    used.add(q.id);
    picked.push(q);
  }

  // Pass 2 — spend any remaining slots on the heaviest skills, at mixed difficulty.
  while (picked.length < count) {
    const skillId = weightedSample(covered, 1, id => examShare(id), rng)[0];
    const candidates = pool({ skill: skillId, exclude: used });
    if (!candidates.length) {
      // Nothing left anywhere — stop rather than loop forever on a thin bank.
      if (!pool({ exclude: used }).length) break;
      continue;
    }
    const q = seededShuffle(candidates, rng)[0];
    used.add(q.id);
    picked.push(q);
  }

  // Interleave sections so a student does not face 15 straight math questions.
  const rw = picked.filter(q => q.section === 'rw');
  const math = picked.filter(q => q.section === 'math');
  const interleaved = [];
  for (let i = 0; i < Math.max(rw.length, math.length); i++) {
    if (rw[i]) interleaved.push(rw[i]);
    if (math[i]) interleaved.push(math[i]);
  }
  return interleaved;
}

/** Total expected minutes for a question set, from per-item target times. */
export function estimateMinutes(questions = []) {
  const seconds = questions.reduce(
    (s, q) => s + (q.targetSeconds || SAT_SKILLS[q.skill]?.targetSeconds || 75), 0,
  );
  return Math.max(1, Math.round(seconds / 60));
}
