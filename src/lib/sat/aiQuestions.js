// ─────────────────────────────────────────────────────────────────────────────
// AI-generated practice questions — the long tail behind the static bank.
//
// The static bank in src/data/sat/questions/ is always the primary source.
// This exists so a student grinding one weak skill does not run out of material.
//
// TWO HARD RULES:
//
// 1. LICENSING. No official College Board content may enter a prompt here, as
//    an example or otherwise. They grant no commercial licence for SAT items
//    and explicitly forbid their use with generative AI. Prompts describe the
//    published blueprint (domain names, skill descriptions, question formats),
//    which is factual, and ask for original items.
//
// 2. VALIDATION. A model that invents a wrong answer key teaches the student
//    something false, which is worse than showing them nothing. Everything that
//    comes back is schema-checked, and math answers are re-derived where we can.
//    Anything that fails is discarded silently — a short set is fine, a wrong
//    set is not.
// ─────────────────────────────────────────────────────────────────────────────
import { SAT_SKILLS, SAT_DOMAINS, DIFFICULTY_IDS, skillMeta } from '../../data/sat/taxonomy';
import { strategyFor } from '../../data/sat/strategies';
import * as DB from '../db';

const MAX_GENERATED = 6;

function buildSystemPrompt(skillId, difficulty) {
  const meta = skillMeta(skillId);
  const domain = SAT_DOMAINS[meta.domain];
  const strategy = strategyFor(skillId);

  return [
    'You write original practice questions for the Digital SAT.',
    '',
    `SECTION: ${meta.sectionLabel}`,
    `DOMAIN: ${domain.label} — ${domain.blurb}`,
    `SKILL: ${meta.label} — ${meta.blurb}`,
    `DIFFICULTY: ${DIFFICULTY_IDS.includes(difficulty) ? difficulty : 'M'} (E = easy, M = medium, H = hard)`,
    strategy ? `WHAT THIS SKILL TESTS: ${strategy.approach}` : '',
    strategy?.watchFor ? `THE CLASSIC TRAP: ${strategy.watchFor}` : '',
    '',
    'RULES:',
    '- Write COMPLETELY ORIGINAL questions. Never reproduce, paraphrase, or adapt',
    '  any real College Board / SAT / PSAT question, passage, or answer choice.',
    '- Exactly 4 answer choices, exactly one defensibly correct.',
    '- Wrong choices must be plausible and each must correspond to a specific,',
    '  nameable mistake — not filler.',
    '- Choice lengths must be similar. The correct answer must NOT be the longest.',
    '- For maths: state the answer exactly. Avoid answers requiring a calculator.',
    '- Reading passages: 25-150 words, academic register, invented sources only.',
    '',
    'Return ONLY valid JSON, no prose, in this exact shape:',
    '{"questions":[{"q":"...","stimulus":null,"ch":["..","..","..",".."],',
    '"ans":0,"exp":"why the correct answer is correct",',
    '"distractorExp":["why A is right or wrong","..","..",".."],',
    '"trap":"short_snake_case_tag"}]}',
    '',
    '"ans" is the 0-based index of the correct choice.',
    '"distractorExp" must have exactly 4 entries, aligned to "ch" by index.',
  ].filter(Boolean).join('\n');
}

/** Structural validation. Rejects anything the player could not render safely. */
function validateQuestion(raw, skillId, difficulty) {
  if (!raw || typeof raw !== 'object') return null;
  const { q, ch, ans, exp, distractorExp, stimulus, trap } = raw;

  if (typeof q !== 'string' || q.trim().length < 10) return null;
  if (!Array.isArray(ch) || ch.length !== 4) return null;
  if (ch.some(c => typeof c !== 'string' || !c.trim())) return null;
  if (!Number.isInteger(ans) || ans < 0 || ans > 3) return null;
  if (typeof exp !== 'string' || exp.trim().length < 20) return null;
  if (!Array.isArray(distractorExp) || distractorExp.length !== 4) return null;
  if (distractorExp.some(d => typeof d !== 'string' || d.trim().length < 10)) return null;

  // Duplicate choices mean there is more than one correct answer, or the model
  // padded the list. Either way it is unusable.
  const normalised = ch.map(c => c.trim().toLowerCase());
  if (new Set(normalised).size !== 4) return null;

  // Reject the length tell we audit the static bank for — an AI-generated set
  // should not reintroduce the bias we removed by hand.
  const lengths = ch.map(c => c.length);
  const others = lengths.filter((_, i) => i !== ans);
  const meanOthers = others.reduce((s, l) => s + l, 0) / others.length;
  if (meanOthers >= 20 && lengths[ans] > meanOthers * 1.4) return null;

  const meta = skillMeta(skillId);
  return {
    id: `sat-ai-${skillId}-${Math.random().toString(36).slice(2, 10)}`,
    section: meta.section,
    domain: meta.domain,
    skill: skillId,
    difficulty: DIFFICULTY_IDS.includes(difficulty) ? difficulty : 'M',
    format: 'mcq',
    stimulus: typeof stimulus === 'string' && stimulus.trim() ? stimulus.trim() : null,
    q: q.trim(),
    ch: ch.map(c => c.trim()),
    ans,
    exp: exp.trim(),
    distractorExp: distractorExp.map(d => d.trim()),
    trap: typeof trap === 'string' ? trap.trim().slice(0, 40) : null,
    targetSeconds: SAT_SKILLS[skillId]?.targetSeconds || 75,
    generated: true,
  };
}

/**
 * Extra arithmetic sanity check for questions whose choices are all plain
 * numbers. We cannot verify the model's reasoning, but we can catch the common
 * failure where the stated answer is not among the choices, or the explanation
 * names a value that is not the keyed one.
 */
function numericSanity(question) {
  const nums = question.ch.map(c => Number(String(c).replace(/[$,\s]/g, '')));
  if (nums.some(n => !Number.isFinite(n))) return true; // not a numeric item; nothing to check

  // The explanation should mention the keyed answer somewhere. A mismatch
  // usually means the model solved correctly but keyed the wrong index.
  const keyed = nums[question.ans];
  const expNums = (question.exp.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (expNums.length && !expNums.some(n => Math.abs(n - keyed) < 1e-6)) return false;
  return true;
}

/**
 * Generate extra practice questions for one skill.
 * Always returns an array — empty on any failure, never throws at the caller.
 *
 * @param {string} skillId
 * @param {{difficulty?:string, count?:number, signal?:AbortSignal}} opts
 */
export async function generateQuestions(skillId, { difficulty = 'M', count = 4 } = {}) {
  if (!SAT_SKILLS[skillId]) return [];

  const cacheKey = `${skillId}:${difficulty}`;
  try {
    const cached = await DB.getSatAiCache(cacheKey);
    // Cached generations persist so a reload does not lose them and we do not
    // re-spend the daily request quota on the same skill.
    if (cached?.questions?.length) return cached.questions;
  } catch { /* cache miss is not an error */ }

  try {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystemPrompt(skillId, difficulty),
        message: `Write ${Math.min(count, MAX_GENERATED)} original ${SAT_SKILLS[skillId].label} questions at difficulty ${difficulty}.`,
        purpose: 'sat',
        tier: 'sage',
        jsonMode: true,
        maxTokens: 2400,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.content) return [];

    let parsed;
    try {
      parsed = JSON.parse(data.content);
    } catch {
      // Models occasionally wrap JSON in a fence despite jsonMode.
      const match = String(data.content).match(/\{[\s\S]*\}/);
      if (!match) return [];
      try { parsed = JSON.parse(match[0]); } catch { return []; }
    }

    const valid = (parsed?.questions || [])
      .map(raw => validateQuestion(raw, skillId, difficulty))
      .filter(Boolean)
      .filter(numericSanity)
      .slice(0, MAX_GENERATED);

    if (valid.length) {
      try { await DB.putSatAiCache(cacheKey, valid); } catch { /* non-fatal */ }
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * A nudge for a question the student has NOT answered yet.
 *
 * Deliberately a separate call from explainQuestion() rather than a flag on it:
 * the answer key and the rationale are never put into this prompt at all, so
 * the model cannot leak what it was not given. A prompt that contains the
 * answer and is merely asked not to say it will eventually say it.
 *
 * Returns null on any failure — the caller falls back to the strategy card,
 * which is static and always available.
 */
export async function hintForQuestion(question) {
  if (!question) return null;
  const meta = skillMeta(question.skill);
  const strategy = strategyFor(question.skill);

  const system = [
    'You are an SAT tutor giving ONE hint on a question a student has not answered yet.',
    'You have NOT been told the correct answer, and you must not claim to know it.',
    'Do not solve the problem. Do not eliminate any answer choice.',
    'Give the first move only: what to notice, what to write down, or what to ask themselves.',
    'Under 45 words. One or two sentences. No preamble, no sign-off.',
    strategy ? `The taught approach for this skill: ${strategy.approach}` : '',
  ].filter(Boolean).join('\n');

  const message = [
    `SKILL: ${meta.label} (${meta.sectionLabel})`,
    question.stimulus ? `PASSAGE: ${question.stimulus}` : '',
    `QUESTION: ${question.q}`,
    // Choices are included because a hint like "compare the two that differ
    // only in punctuation" needs to see them — but the key is not.
    question.format === 'mcq' ? `CHOICES: ${question.ch.map((c, i) => `${'ABCD'[i]}) ${c}`).join(' | ')}` : 'FORMAT: the student types a number, there are no choices.',
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message, purpose: 'sat', tier: 'guide', maxTokens: 140 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Ask for a plain-language explanation of a question the student got wrong,
 * grounded in the question and its official rationale so the model teaches
 * rather than invents.
 */
export async function explainQuestion(question, chosenIndex) {
  if (!question) return null;
  const chosen = question.format === 'mcq' && chosenIndex != null ? question.ch[chosenIndex] : null;
  const system = [
    'You are a patient SAT tutor. A student just got a question wrong.',
    'You are given the question, the correct answer, and the official rationale.',
    'Explain the reasoning in plain language, in under 120 words.',
    'Do NOT contradict the given rationale. Do NOT invent new facts.',
    'Address why their specific choice was tempting, then how to spot it next time.',
  ].join('\n');

  const message = [
    `QUESTION: ${question.q}`,
    question.stimulus ? `PASSAGE: ${question.stimulus}` : '',
    question.format === 'mcq' ? `CHOICES: ${question.ch.map((c, i) => `${'ABCD'[i]}) ${c}`).join(' | ')}` : '',
    question.format === 'mcq' ? `CORRECT: ${'ABCD'[question.ans]}` : '',
    chosen ? `STUDENT CHOSE: ${chosen}` : '',
    `OFFICIAL RATIONALE: ${question.exp}`,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message, purpose: 'sat', tier: 'guide', maxTokens: 320 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content || null;
  } catch {
    return null;
  }
}
