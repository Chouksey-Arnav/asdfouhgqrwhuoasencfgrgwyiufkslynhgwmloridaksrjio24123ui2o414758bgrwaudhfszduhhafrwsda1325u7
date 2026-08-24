// ─────────────────────────────────────────────────────────────────────────────
// The learner profile — one canonical description of a student's SAT situation.
//
// WHY THIS IS A SEPARATE MODULE. Three surfaces need to describe the same
// student to a model: the coach (buildSatSystemPrompt), the practice generator
// (aiPractice.js) and the study-plan generator (aiStudyPlan.js). If each one
// assembled its own summary from raw Dexie rows they would drift, and a student
// would get a coach saying "your Boundaries is fine" next to a generated set
// built on the assumption that it is not. So the summary is computed once, here,
// and every prompt is rendered from this object.
//
// TWO RULES CARRIED OVER FROM src/lib/sat/mastery.js:
//
// 1. NOTHING WITHOUT ITS SAMPLE SIZE. Every mastery figure in here travels with
//    the number of questions it came from and a confidence band. A model handed
//    "62% on Boundaries" will happily build a lesson plan on it; handed "62%
//    from 4 questions, low confidence" it can hedge, and the prompts downstream
//    instruct it to.
//
// 2. ABSENCE IS DATA. `measuredSkills` vs `unmeasuredSkills` is an explicit
//    split rather than an implicit zero, because "never practiced" and "scored
//    zero" call for opposite responses and a bare 0% cannot tell them apart.
//
// Everything here is derived — it reads the same Dexie-backed snapshot the
// panels render from (see src/lib/sat/useSatData.js) and computes no state of
// its own, so it can be called on every render without a cache.
// ─────────────────────────────────────────────────────────────────────────────
import {
  SAT_SECTIONS, SAT_SKILLS, ERROR_TYPES, TRAP_TAGS, skillMeta, examShare,
} from '../../data/sat/taxonomy';
import { getQuestion } from '../../data/sat/questions/index.js';
import { confidenceBand } from './mastery';

// A skill needs at least this many attempts before its mastery is worth naming
// in a prompt as anything other than "barely measured".
const MIN_ATTEMPTS_TO_TRUST = 3;
// Pacing ratio above which a skill is called out as a timing problem rather
// than a knowledge problem. 1.3 = taking 30% longer than the benchmark.
const SLOW_RATIO = 1.3;
// And below which the student is rushing — fast *and* wrong is its own failure
// mode, and the fix (slow down) is the opposite of the fix for slow.
const RUSHED_RATIO = 0.6;
// How many recent responses define "recent form".
const RECENT_WINDOW = 30;

const pct = (x) => Math.round((x || 0) * 100);

/**
 * Build the profile.
 *
 * @param {object}  input
 * @param {object}  input.satData     the useSatData() snapshot
 * @param {object}  [input.user]      the app user record
 * @param {number|null} [input.daysToExam]
 * @returns {object} a plain, serialisable profile — see renderProfileForPrompt()
 */
export function buildLearnerProfile({ satData, user = null, daysToExam = null } = {}) {
  const {
    projection = null, ranked = [], responses = [], attempts = [],
    reviewLog = [], openReviews = [], masteryMap = {},
  } = satData || {};

  const measured = ranked.filter(r => r.attempts > 0);
  const unmeasured = ranked.filter(r => !r.attempts);

  // ── Weakest by leverage, richest first ──
  // Leverage (weakness x exam share) rather than raw weakness, so the profile
  // points at the skills where fixing something is actually worth points. Both
  // numbers are carried so a prompt can explain the ordering rather than assert it.
  const weakSkills = measured.slice(0, 6).map(s => ({
    skill: s.skill,
    label: s.label,
    section: s.section,
    sectionLabel: s.sectionLabel,
    domainLabel: s.domainLabel,
    mastery: s.mastery,
    attempts: s.attempts,
    confidence: s.confidence,
    confidenceLabel: confidenceBand(s.confidence).label,
    trusted: s.attempts >= MIN_ATTEMPTS_TO_TRUST,
    perExam: Number((s.examShare * 98).toFixed(1)),
    pacingRatio: s.pacingRatio,
    avgSeconds: s.avgSeconds,
    targetSeconds: s.targetSeconds,
  }));

  const strongSkills = [...measured]
    .filter(s => s.mastery >= 0.8 && s.attempts >= MIN_ATTEMPTS_TO_TRUST)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 4)
    .map(s => ({ skill: s.skill, label: s.label, mastery: s.mastery, attempts: s.attempts }));

  // Never-touched skills that the exam actually leans on. These are invisible
  // to a "weakest first" ordering (they have no score to be weak) but are the
  // biggest unknowns in the student's picture.
  const unmeasuredHeavy = [...unmeasured]
    .sort((a, b) => b.examShare - a.examShare)
    .slice(0, 5)
    .map(s => ({ skill: s.skill, label: s.label, sectionLabel: s.sectionLabel, perExam: Number((s.examShare * 98).toFixed(1)) }));

  // ── How they miss, in their own words ──
  // The Review Log triage is the only signal in the app that separates "did not
  // know it" from "knew it and slipped", and those need opposite prescriptions.
  const errorCounts = {};
  for (const r of reviewLog) {
    if (!r.errorType) continue;
    errorCounts[r.errorType] = (errorCounts[r.errorType] || 0) + 1;
  }
  const triagedTotal = Object.values(errorCounts).reduce((s, n) => s + n, 0);
  const errorMix = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      id,
      label: ERROR_TYPES[id]?.label || id,
      prescription: ERROR_TYPES[id]?.prescription || null,
      count,
      share: triagedTotal ? count / triagedTotal : 0,
    }));

  // ── The specific traps they keep falling for ──
  // This is the single most useful thing to hand an item generator: not "they
  // are weak at Boundaries" but "they fall for comma splices", which is a thing
  // a new question can be deliberately built to test.
  // Each trap also records WHICH SKILLS it was actually observed on. Without
  // that the only way to decide whether a trap belongs to a skill is to guess
  // from its name, and "sign error" has nothing useful to say about a
  // Transitions question. The association is free here — the review log rows
  // already resolve to questions that know their own skill.
  const trapCounts = {};
  for (const r of reviewLog) {
    const q = getQuestion(r.questionId);
    if (!q?.trap) continue;
    const entry = (trapCounts[q.trap] ||= { count: 0, skills: new Set() });
    entry.count += 1;
    entry.skills.add(q.skill);
  }
  const traps = Object.entries(trapCounts)
    .filter(([, v]) => v.count >= 2) // one instance is noise, not a pattern
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id, v]) => ({
      id,
      label: TRAP_TAGS[id] || id.replace(/_/g, ' '),
      count: v.count,
      skills: [...v.skills],
    }));

  // ── Pacing ──
  const slow = measured.filter(s => s.pacingRatio && s.pacingRatio > SLOW_RATIO)
    .sort((a, b) => b.pacingRatio - a.pacingRatio).slice(0, 4)
    .map(s => ({ label: s.label, avgSeconds: s.avgSeconds, targetSeconds: s.targetSeconds }));
  // Rushing only counts as a problem where accuracy is also poor — fast and
  // right is not a bug, it is the goal.
  const rushed = measured.filter(s => s.pacingRatio && s.pacingRatio < RUSHED_RATIO && s.mastery < 0.6)
    .slice(0, 3)
    .map(s => ({ label: s.label, avgSeconds: s.avgSeconds, targetSeconds: s.targetSeconds, mastery: s.mastery }));

  // ── Recent form vs overall ──
  // A student improving and a student plateauing need different messages, and
  // an overall accuracy number hides both.
  const sorted = [...responses].sort((a, b) => (a.answeredAt || 0) - (b.answeredAt || 0));
  const recent = sorted.slice(-RECENT_WINDOW);
  const older = sorted.slice(0, -RECENT_WINDOW);
  const accuracyOf = (rows) => (rows.length ? rows.filter(r => r.correct).length / rows.length : null);
  const recentAccuracy = accuracyOf(recent);
  const priorAccuracy = older.length >= 10 ? accuracyOf(older) : null;
  const trend = (recentAccuracy != null && priorAccuracy != null)
    ? (recentAccuracy - priorAccuracy > 0.07 ? 'improving'
      : recentAccuracy - priorAccuracy < -0.07 ? 'slipping' : 'flat')
    : 'unknown';

  // ── Per-section coverage ──
  const sections = {};
  for (const id of Object.keys(SAT_SECTIONS)) {
    const rows = responses.filter(r => r.section === id);
    sections[id] = {
      id,
      label: SAT_SECTIONS[id].label,
      answered: rows.length,
      accuracy: accuracyOf(rows),
      scaled: projection?.sections?.[id]?.scaled ?? null,
    };
  }

  const completedDiagnostic = attempts.find(a => a.kind === 'diagnostic' && a.status === 'complete');
  const fullTests = attempts.filter(a => a.kind === 'full' && a.status === 'complete');

  return {
    // Who they are
    name: user?.name || null,
    gradeStage: user?.gradeStage || null,
    targetScore: user?.onboardingTargetScore || null,
    daysToExam,
    weeklyHours: user?.studyHoursPerWeek ?? user?.onboardingStudyHours ?? null,

    // What has been measured
    questionsAnswered: responses.length,
    measuredSkillCount: measured.length,
    totalSkillCount: Object.keys(SAT_SKILLS).length,
    diagnosticDone: !!completedDiagnostic,
    diagnosticAt: completedDiagnostic?.finishedAt || null,
    diagnosticResult: completedDiagnostic?.result || null,
    fullTestsTaken: fullTests.length,
    lastFullTestAt: fullTests[0]?.finishedAt || null,
    projection,
    sections,

    // Where the points are
    weakSkills,
    strongSkills,
    unmeasuredHeavy,

    // How they fail
    errorMix,
    traps,
    slowSkills: slow,
    rushedSkills: rushed,
    openReviews: openReviews.length,
    untriagedReviews: openReviews.filter(r => !r.errorType).length,
    dueRetries: openReviews.filter(r => (r.due || 0) <= Date.now()).length,

    // Which way they are going
    recentAccuracy,
    priorAccuracy,
    trend,

    // Kept so callers can reach the raw map without re-deriving it
    masteryMap,
  };
}

/**
 * Render the profile as prompt text.
 *
 * Deliberately plain prose with explicit sample sizes rather than a JSON blob:
 * models follow hedging instructions ("do not state a low-confidence number as
 * fact") far more reliably when the hedge is attached to the number in the same
 * sentence than when it is a sibling key in an object.
 *
 * @param {object} profile  from buildLearnerProfile()
 * @param {{verbosity?: 'full'|'compact'}} [opts]
 */
export function renderProfileForPrompt(profile, { verbosity = 'full' } = {}) {
  if (!profile) return 'No data has been measured about this student yet.';
  const L = [];

  // ── Situation ──
  const who = [];
  if (profile.gradeStage) who.push(`grade stage: ${profile.gradeStage}`);
  if (profile.targetScore) who.push(`target score: ${profile.targetScore}`);
  if (profile.daysToExam != null) who.push(`test day in ${profile.daysToExam} day(s)`);
  if (profile.weeklyHours) who.push(`about ${profile.weeklyHours} study hours a week`);
  if (who.length) L.push(`SITUATION: ${who.join('; ')}.`);

  // ── Evidence base ──
  L.push(
    `EVIDENCE BASE: ${profile.questionsAnswered} SAT question(s) answered in this app, `
    + `covering ${profile.measuredSkillCount} of ${profile.totalSkillCount} tested skills. `
    + `Diagnostic ${profile.diagnosticDone ? 'completed' : 'NOT taken'}. `
    + `Full-length tests: ${profile.fullTestsTaken}.`,
  );

  if (profile.projection) {
    L.push(
      `SCORE ESTIMATE: ${profile.projection.low}–${profile.projection.high} `
      + `(midpoint ${profile.projection.mid}), ${profile.projection.confidence} confidence. `
      + 'This is a range, not a score. Never restate it as a single number.',
    );
  } else {
    L.push('SCORE ESTIMATE: none exists — too little data. Do NOT invent or guess one.');
  }

  const secLine = Object.values(profile.sections || {})
    .filter(s => s.answered)
    .map(s => `${s.label}: ${pct(s.accuracy)}% correct over ${s.answered} question(s)`)
    .join('; ');
  if (secLine) L.push(`BY SECTION: ${secLine}.`);

  // ── Weakness, with its sample size attached ──
  if (profile.weakSkills.length) {
    L.push('WEAKEST BY LEVERAGE (weakness x how heavily the real exam tests it):');
    for (const s of profile.weakSkills) {
      L.push(
        `- ${s.label} (${s.sectionLabel}): ${pct(s.mastery)}% mastery from ${s.attempts} question(s)`
        + ` — ${s.confidenceLabel}${s.trusted ? '' : ', too few attempts to be sure'};`
        + ` worth ~${s.perExam} questions per exam`
        + (s.avgSeconds ? `; averaging ${s.avgSeconds}s against a ${s.targetSeconds}s benchmark` : ''),
      );
    }
  }

  if (profile.unmeasuredHeavy.length && verbosity === 'full') {
    L.push(
      'NEVER PRACTICED (unknown, not weak — these have no data at all): '
      + profile.unmeasuredHeavy.map(s => `${s.label} (~${s.perExam} q/exam)`).join(', ') + '.',
    );
  }

  if (profile.strongSkills.length) {
    L.push(
      'ALREADY SOLID: '
      + profile.strongSkills.map(s => `${s.label} (${pct(s.mastery)}%, n=${s.attempts})`).join(', ')
      + '. Do not spend their time here.',
    );
  }

  // ── Failure mode ──
  if (profile.errorMix.length) {
    L.push(
      'HOW THEY MISS (their own triage of their misses): '
      + profile.errorMix.map(e => `${e.label} x${e.count} (${pct(e.share)}%)`).join(', ') + '.',
    );
  }
  if (profile.traps.length) {
    L.push(
      'SPECIFIC TRAPS THEY REPEATEDLY FALL FOR: '
      + profile.traps.map(t => `${t.label} (x${t.count})`).join('; ') + '.',
    );
  }
  if (profile.slowSkills.length) {
    L.push(
      'RUNNING SLOW ON: '
      + profile.slowSkills.map(s => `${s.label} (${s.avgSeconds}s vs ${s.targetSeconds}s target)`).join(', ')
      + '. This is a pacing problem, which needs different work from a knowledge problem.',
    );
  }
  if (profile.rushedSkills.length) {
    L.push(
      'RUSHING AND MISSING ON: '
      + profile.rushedSkills.map(s => `${s.label} (${s.avgSeconds}s vs ${s.targetSeconds}s, only ${pct(s.mastery)}% mastery)`).join(', ')
      + '. Fast and wrong — they need to slow down here, not speed up.',
    );
  }

  // ── Review backlog ──
  if (profile.openReviews) {
    L.push(
      `REVIEW LOG: ${profile.openReviews} open item(s)`
      + (profile.untriagedReviews ? `, ${profile.untriagedReviews} not yet diagnosed` : '')
      + (profile.dueRetries ? `, ${profile.dueRetries} due for retry` : '') + '.',
    );
  } else {
    L.push('REVIEW LOG: clear.');
  }

  // ── Direction ──
  if (profile.recentAccuracy != null) {
    L.push(
      `RECENT FORM: ${pct(profile.recentAccuracy)}% over their last ${Math.min(RECENT_WINDOW, profile.questionsAnswered)} questions`
      + (profile.priorAccuracy != null ? `, against ${pct(profile.priorAccuracy)}% before that — ${profile.trend}` : '')
      + '.',
    );
  }

  return L.join('\n');
}

/**
 * A short, stable fingerprint of the profile.
 *
 * Used as a cache key for generated content: the same student in the same state
 * should reuse what was already generated for them, but the moment their
 * measured position moves the cache should miss and the content should be
 * rebuilt against the new picture. Deliberately coarse — bucketed mastery and
 * counts, not raw floats — so a single answered question does not invalidate
 * everything, but a real shift does.
 */
export function profileFingerprint(profile) {
  if (!profile) return 'empty';
  const bucket = (x, n = 5) => (x == null ? '-' : Math.round(x * n));
  const parts = [
    `q${Math.floor((profile.questionsAnswered || 0) / 10)}`,
    `t${profile.targetScore || '-'}`,
    `d${profile.daysToExam == null ? '-' : Math.floor(profile.daysToExam / 7)}`,
    `p${profile.projection?.mid ? Math.round(profile.projection.mid / 50) : '-'}`,
    ...profile.weakSkills.slice(0, 4).map(s => `${s.skill}:${bucket(s.mastery)}`),
    ...profile.traps.slice(0, 3).map(t => t.id),
    ...profile.errorMix.slice(0, 2).map(e => e.id),
  ];
  return parts.join('|');
}

/**
 * Which skills a generated set should target, and why.
 *
 * The generator needs more than a list of skill ids — it needs a per-skill
 * instruction (difficulty, what to emphasize, which trap to build in) so the
 * items it writes are aimed at this student rather than generically on-topic.
 * Kept here rather than in aiPractice.js because it is pure profile reasoning
 * with no network involved, which makes it testable on its own.
 *
 * @param {object} profile
 * @param {{count?:number, section?:string|null, skill?:string|null}} [opts]
 * @returns {Array<{skill, label, sectionLabel, difficulty, count, why, trap}>}
 */
export function planGeneratedSet(profile, { count = 8, section = null, skill = null } = {}) {
  // An explicit single-skill request overrides the leverage ordering — the
  // student asked for this one, and second-guessing that is patronising.
  if (skill && SAT_SKILLS[skill]) {
    const meta = skillMeta(skill);
    const m = profile?.masteryMap?.[skill];
    const trap = trapForSkill(profile, skill);
    return [{
      skill,
      label: meta.label,
      sectionLabel: meta.sectionLabel,
      difficulty: difficultyFor(m?.mastery ?? 0),
      count,
      why: m?.attempts
        ? `${pct(m.mastery)}% mastery from ${m.attempts} question(s) — they chose to drill this`
        : 'they chose to drill this and have no data on it yet',
      trap,
    }];
  }

  let candidates = (profile?.weakSkills || []).filter(s => !section || s.section === section);

  // Fold in the heaviest never-practiced skills. A set built only from measured
  // weakness will never touch a skill the student has been quietly avoiding,
  // which is exactly where the unknown risk lives.
  const unknowns = (profile?.unmeasuredHeavy || [])
    .filter(s => !section || skillMeta(s.skill).section === section)
    .slice(0, 2)
    .map(s => ({ ...s, mastery: 0, attempts: 0, trusted: false }));

  candidates = [...candidates.slice(0, 4), ...unknowns].slice(0, 5);

  // Nothing measured at all: spread across the heaviest skills on the exam so
  // the first set doubles as a rough placement.
  if (!candidates.length) {
    candidates = Object.keys(SAT_SKILLS)
      .filter(id => !section || skillMeta(id).section === section)
      .sort((a, b) => examShare(b) - examShare(a))
      .slice(0, 4)
      .map(id => {
        const meta = skillMeta(id);
        return { skill: id, label: meta.label, sectionLabel: meta.sectionLabel, mastery: 0, attempts: 0, trusted: false };
      });
  }

  // Distribute the requested item count across the chosen skills, front-loaded
  // onto the highest-leverage one but never dumping the whole set on it —
  // interleaving beats blocking for retention.
  const per = distribute(count, candidates.length);
  return candidates.map((s, i) => ({
    skill: s.skill,
    label: s.label || skillMeta(s.skill).label,
    sectionLabel: s.sectionLabel || skillMeta(s.skill).sectionLabel,
    difficulty: difficultyFor(s.mastery ?? 0),
    count: per[i],
    why: s.attempts
      ? `${pct(s.mastery)}% mastery from ${s.attempts} question(s)${s.trusted ? '' : ' (thin sample)'}, worth ~${s.perExam ?? '?'} questions per exam`
      : `never practiced — worth ~${s.perExam ?? '?'} questions per exam, so it is an unknown rather than a known weakness`,
    trap: trapForSkill(profile, s.skill),
  })).filter(s => s.count > 0);
}

/**
 * Difficulty to aim a generated item at: one notch above comfort, because
 * practice entirely at your current level does not move a score. Mirrors
 * targetDifficulty() in selector.js so generated and bank items are calibrated
 * the same way.
 */
function difficultyFor(mastery) {
  if (mastery < 0.45) return 'E';
  if (mastery < 0.75) return 'M';
  return 'H';
}

/**
 * The trap this student keeps hitting ON THIS SKILL, if there is one.
 *
 * Matched on observation, not on the trap's name: a trap only counts for a skill
 * if that is where the student actually kept falling for it. Telling the
 * generator to build a "comma splice" distractor into a Circles question would
 * produce nonsense, and guessing the pairing from the tag's wording is exactly
 * how that happens.
 */
function trapForSkill(profile, skillId) {
  if (!profile?.traps?.length) return null;
  return profile.traps.find(t => t.skills?.includes(skillId)) || null;
}

/** Split `total` into `buckets` parts, largest first, all >= 1 where possible. */
function distribute(total, buckets) {
  if (buckets <= 0) return [];
  const base = Math.floor(total / buckets);
  const out = new Array(buckets).fill(base);
  let remainder = total - base * buckets;
  for (let i = 0; i < buckets && remainder > 0; i++, remainder--) out[i] += 1;
  return out;
}
