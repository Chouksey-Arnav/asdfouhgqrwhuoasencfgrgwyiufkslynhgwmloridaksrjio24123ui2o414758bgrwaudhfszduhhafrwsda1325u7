// ─────────────────────────────────────────────────────────────────────────────
// Error pattern detection for the Review Log.
//
// The research on score improvement is consistent on one point: taking practice
// tests does very little on its own; what moves a score is the analysis
// afterwards. But "review your mistakes" is useless advice at scale — a student
// staring at 40 missed questions cannot see the shape of the problem.
//
// This module finds the shape: "7 of your last 10 Boundaries misses were the
// same trap — comma splice." That is actionable in a way a list is not.
// ─────────────────────────────────────────────────────────────────────────────
import { SAT_SKILLS, SAT_DOMAINS, ERROR_TYPES, TRAP_TAGS, skillMeta } from '../../data/sat/taxonomy';
import { getQuestion } from '../../data/sat/questions/index.js';

// A pattern needs this many instances before we will name it — below that we
// are pattern-matching on noise and will send the student chasing nothing.
const MIN_INSTANCES = 3;
// And it must account for at least this share of the relevant misses.
const MIN_SHARE = 0.4;

/**
 * @param {Array} misses  review-log rows, or any {questionId, errorType} list
 * @returns {Array<{id, kind, severity, title, body, cta, skill?, trap?, count}>}
 *          ordered most-actionable first
 */
/**
 * The question behind a review-log row, from whichever source has it.
 *
 * Bank first, then the snapshot the row carries, then the row's own denormalised
 * fields. That last fallback matters: rows written before snapshots were stored
 * still know their `skill` and `section`, which is enough for the skill-level
 * patterns even though the trap-level ones will skip them.
 *
 * Resolving through the bank alone — which this module used to do — quietly
 * excluded every baseline and AI-generated miss from pattern detection, so a
 * student whose entire backlog came from the baseline saw "no patterns yet"
 * with thirty entries sitting in their log.
 */
function questionFor(row) {
  if (!row) return null;
  const fromBank = getQuestion(row.questionId);
  if (fromBank) return fromBank;
  if (row.question) return row.question;
  return row.skill ? { skill: row.skill, section: row.section, difficulty: row.difficulty } : null;
}

export function detectPatterns(misses = []) {
  if (misses.length < MIN_INSTANCES) return [];

  const enriched = misses
    .map(m => {
      const q = questionFor(m);
      return q ? { ...m, skill: q.skill, domain: q.domain, section: q.section, trap: q.trap, difficulty: q.difficulty } : null;
    })
    .filter(Boolean);

  if (!enriched.length) return [];
  const patterns = [];

  // ── 1. A single trap dominating a skill ──
  // The most specific and therefore most useful pattern we can surface.
  const bySkill = groupBy(enriched, m => m.skill);
  for (const [skillId, rows] of Object.entries(bySkill)) {
    if (rows.length < MIN_INSTANCES) continue;
    const byTrap = groupBy(rows.filter(r => r.trap), r => r.trap);
    for (const [trap, trapRows] of Object.entries(byTrap)) {
      if (trapRows.length < MIN_INSTANCES) continue;
      if (trapRows.length / rows.length < MIN_SHARE) continue;
      patterns.push({
        id: `trap:${skillId}:${trap}`,
        kind: 'trap',
        severity: 3,
        count: trapRows.length,
        skill: skillId,
        trap,
        title: `${trapRows.length} of your ${rows.length} ${SAT_SKILLS[skillId]?.label || skillId} misses are the same trap`,
        body: TRAP_TAGS[trap] || trap,
        cta: { label: `Drill ${SAT_SKILLS[skillId]?.label || skillId}`, action: 'drill', skill: skillId },
      });
    }
  }

  // ── 2. A dominant error TYPE (the student's own triage) ──
  // This one changes the prescription entirely: a careless-error problem and a
  // content-gap problem look identical on a score report and need opposite fixes.
  const typed = enriched.filter(m => m.errorType);
  if (typed.length >= MIN_INSTANCES) {
    const byType = groupBy(typed, m => m.errorType);
    for (const [type, rows] of Object.entries(byType)) {
      if (rows.length < MIN_INSTANCES) continue;
      if (rows.length / typed.length < MIN_SHARE) continue;
      const meta = ERROR_TYPES[type];
      if (!meta) continue;
      patterns.push({
        id: `errtype:${type}`,
        kind: 'error_type',
        severity: type === 'content_gap' ? 3 : 2,
        count: rows.length,
        errorType: type,
        title: `${Math.round((rows.length / typed.length) * 100)}% of your triaged misses are "${meta.label.toLowerCase()}"`,
        body: meta.prescription,
        cta: type === 'ran_out_of_time'
          ? { label: 'Practise under a timer', action: 'timed' }
          : { label: 'Review these', action: 'review' },
      });
    }
  }

  // ── 3. A domain bleeding points ──
  const byDomain = groupBy(enriched, m => m.domain);
  const domainRows = Object.entries(byDomain)
    .filter(([, rows]) => rows.length >= MIN_INSTANCES)
    .sort((a, b) => b[1].length - a[1].length);
  if (domainRows.length) {
    const [domainId, rows] = domainRows[0];
    const share = rows.length / enriched.length;
    if (share >= MIN_SHARE && Object.keys(byDomain).length > 1) {
      patterns.push({
        id: `domain:${domainId}`,
        kind: 'domain',
        severity: 2,
        count: rows.length,
        domain: domainId,
        title: `${SAT_DOMAINS[domainId]?.label || domainId} accounts for ${Math.round(share * 100)}% of your misses`,
        body: SAT_DOMAINS[domainId]?.blurb || '',
        cta: { label: 'Focus here', action: 'domain', domain: domainId },
      });
    }
  }

  // ── 4. Missing questions you should be getting ──
  // Easy-item misses are the cheapest points on the whole test.
  const easyMisses = enriched.filter(m => m.difficulty === 'E');
  if (easyMisses.length >= MIN_INSTANCES) {
    patterns.push({
      id: 'easy_misses',
      kind: 'easy',
      severity: 3,
      count: easyMisses.length,
      title: `${easyMisses.length} of your misses were easy questions`,
      body: 'These are the cheapest points on the test. Easy-item misses are usually pacing or misreading, not knowledge — slow down on the front half of each module.',
      cta: { label: 'Review the easy misses', action: 'review' },
    });
  }

  return patterns.sort((a, b) => b.severity - a.severity || b.count - a.count);
}

/**
 * One-line summary of the review backlog for the Overview card.
 * Deliberately frames the backlog as opportunity rather than debt.
 */
export function reviewSummary(reviewLog = []) {
  const open = reviewLog.filter(r => !r.resolved);
  const untriaged = open.filter(r => !r.errorType);
  const due = open.filter(r => (r.due || 0) <= Date.now());
  return {
    open: open.length,
    untriaged: untriaged.length,
    due: due.length,
    headline: open.length === 0
      ? 'Review log clear'
      : untriaged.length > 0
        ? `${untriaged.length} miss${untriaged.length === 1 ? '' : 'es'} to sort`
        : `${due.length} ready to retry`,
  };
}

/**
 * Skills implicated by the current review backlog, most-missed first — used to
 * bias the Smart Set toward what the student is demonstrably getting wrong.
 */
export function weakSkillsFromLog(reviewLog = []) {
  const counts = {};
  for (const row of reviewLog.filter(r => !r.resolved)) {
    const q = questionFor(row);
    if (!q?.skill) continue;
    counts[q.skill] = (counts[q.skill] || 0) + (row.missCount || 1);
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count, label: skillMeta(skill).label }));
}

function groupBy(rows, keyFn) {
  const out = {};
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    (out[k] ||= []).push(r);
  }
  return out;
}
