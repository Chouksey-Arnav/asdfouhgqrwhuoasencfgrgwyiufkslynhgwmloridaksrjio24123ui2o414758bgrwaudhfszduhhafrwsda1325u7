// ─────────────────────────────────────────────────────────────────────────────
// "What should I do right now?" — the single decision the Overview makes for
// the student.
//
// A prep app that presents ten equally-weighted options is asking the student
// to do the hardest part of studying (choosing correctly) with the least
// information. This module makes that choice, in a fixed priority order derived
// from what actually moves scores:
//
//   1. Measure before prescribing            -> baseline, then diagnostic
//   2. Finish what you started               -> resume
//   3. Learn from misses before making more  -> review log
//   4. Re-measure periodically               -> full test
//   5. Otherwise: attack the highest-leverage weakness
// ─────────────────────────────────────────────────────────────────────────────
import { SAT_SKILLS } from '../../data/sat/taxonomy';
import { rankSkillsByLeverage } from './mastery';

// How long before a student should re-measure with a full-length test.
const FULL_TEST_STALE_DAYS = 14;
// Untriaged misses that should be cleared before piling on new practice.
const REVIEW_BACKLOG_THRESHOLD = 5;

const daysSince = (ts) => (ts ? (Date.now() - ts) / 86400000 : Infinity);

/**
 * @param {object} ctx
 * @param {Array}  ctx.attempts     satAttempts rows
 * @param {Array}  ctx.reviewLog    satReviewLog rows
 * @param {object} ctx.masteryMap   from computeAllMastery()
 * @param {number} ctx.responseCount
 * @param {boolean} ctx.hasBaseline  a completed adaptive baseline exists
 * @param {number|null} ctx.daysToExam
 * @returns {{id, title, body, ctaLabel, view, params?, tone}}
 */
export function nextAction({
  attempts = [], reviewLog = [], masteryMap = {}, responseCount = 0, hasBaseline = false, daysToExam = null,
} = {}) {
  const openReviews = reviewLog.filter(r => !r.resolved);
  const untriaged = openReviews.filter(r => !r.errorType);
  const dueReviews = openReviews.filter(r => (r.due || 0) <= Date.now());

  // ── 1. Resume anything in progress ──
  // Before anything else, because an abandoned half-test is both wasted effort
  // and a blocker (only one attempt can be in progress at a time).
  const inProgress = attempts.find(a => a.status === 'in_progress');
  if (inProgress) {
    const kindLabel = { full: 'practice test', diagnostic: 'diagnostic', timed: 'timed set', drill: 'drill' }[inProgress.kind] || 'session';
    return {
      id: 'resume',
      tone: 'urgent',
      title: `Finish your ${kindLabel}`,
      body: `You have a ${kindLabel} in progress. Picking it back up now keeps the result meaningful.`,
      ctaLabel: 'Resume',
      view: inProgress.kind === 'full' ? 'tests' : inProgress.kind === 'diagnostic' ? 'diagnostic' : 'practice',
      params: { attemptId: inProgress.id },
    };
  }

  // ── 2a. Place yourself before anything else ──
  // Ahead of the diagnostic on purpose, and it used to be the other way round.
  // Both measure, but they measure different things and cost very different
  // amounts: the baseline is ~10 adaptive minutes that answer "where am I
  // scoring right now", the diagnostic is ~30 that answer "which of the 28
  // skills is costing me points". Handing a brand-new student the 30-minute
  // one as their first ever instruction is the surest way to get a student who
  // never comes back — and every other panel's advice reads differently at
  // 1050 than at 1400, so the cheap measurement genuinely does come first.
  // This is also the order the SAT rail itself teaches (Baseline sits directly
  // after Overview) and the order progressive unlocking enforces, so all three
  // now say the same thing instead of two of them contradicting the nav.
  if (!hasBaseline) {
    return {
      id: 'baseline',
      tone: 'primary',
      title: 'Set your baseline',
      body: 'About 10 minutes, and every question adapts to how the last one went. It tells you roughly where you score today, which is what everything else here plans against.',
      ctaLabel: 'Set your baseline',
      view: 'baseline',
    };
  }

  // ── 2b. Then find out which skills are costing the points ──
  const hasDiagnostic = attempts.some(a => a.kind === 'diagnostic' && a.status === 'complete');
  if (!hasDiagnostic) {
    return {
      id: 'diagnostic',
      tone: 'primary',
      title: 'Start with the diagnostic',
      body: 'About 30 minutes. It finds which of the 28 tested skills are actually costing you points, so the rest of your prep is aimed rather than scattered.',
      ctaLabel: 'Take the diagnostic',
      view: 'diagnostic',
    };
  }

  // ── 3. Clear the review backlog ──
  // Deliberately ahead of more practice: answering new questions while your
  // last twenty misses sit unexamined is the most common way students spend
  // months on prep without moving.
  if (untriaged.length >= REVIEW_BACKLOG_THRESHOLD) {
    return {
      id: 'triage',
      tone: 'urgent',
      title: `Sort your ${untriaged.length} unreviewed misses`,
      body: 'Reviewing misses is what moves a score — the questions themselves only find them. Two minutes each.',
      ctaLabel: 'Open review log',
      view: 'review',
    };
  }

  // ── 4. Re-measure ──
  const lastFull = attempts.find(a => a.kind === 'full' && a.status === 'complete');
  const daysSinceFull = daysSince(lastFull?.finishedAt);
  const examSoon = daysToExam != null && daysToExam <= 30;
  if (!lastFull && responseCount >= 40) {
    return {
      id: 'first_full_test',
      tone: 'primary',
      title: 'Take your first full-length test',
      body: 'You have enough practice behind you. A full adaptive test is the only way to get a real score estimate and to practice the routing between modules.',
      ctaLabel: 'Start a full test',
      view: 'tests',
    };
  }
  if (lastFull && daysSinceFull >= (examSoon ? 7 : FULL_TEST_STALE_DAYS)) {
    return {
      id: 'retest',
      tone: 'primary',
      title: 'Time to re-measure',
      body: `It has been ${Math.floor(daysSinceFull)} days since your last full test.${examSoon ? ' With your test date close, every couple of weeks is worth it.' : ''}`,
      ctaLabel: 'Start a full test',
      view: 'tests',
    };
  }

  // ── 5. Retry what is due ──
  if (dueReviews.length >= 3) {
    return {
      id: 'retry',
      tone: 'primary',
      title: `${dueReviews.length} questions are due for retry`,
      body: 'Spaced retrieval on questions you have already missed. This is where the points are.',
      ctaLabel: 'Retry them',
      view: 'review',
    };
  }

  // ── 6. Attack the highest-leverage weakness ──
  const ranked = rankSkillsByLeverage(masteryMap, { limit: 1 });
  const top = ranked[0];
  if (top) {
    const perExam = (top.examShare * 98).toFixed(1);
    return {
      id: 'drill',
      tone: 'primary',
      title: `Work on ${top.label}`,
      body: top.attempts
        ? `You are at ${Math.round(top.mastery * 100)}% on this, and it is worth about ${perExam} questions per exam. That combination makes it your best available points.`
        : `You have not practiced this yet, and it is worth about ${perExam} questions per exam.`,
      ctaLabel: 'Start a drill',
      view: 'practice',
      params: { skill: top.skill },
    };
  }

  return {
    id: 'smart_set',
    tone: 'primary',
    title: 'Run a Smart Set',
    body: 'A mixed set weighted toward your weakest high-value skills.',
    ctaLabel: 'Start practicing',
    view: 'practice',
  };
}

/**
 * Secondary suggestions shown beneath the primary action, so the student always
 * has a legitimate alternative without being handed a wall of equal choices.
 */
export function secondaryActions({ attempts = [], reviewLog = [], masteryMap = {}, hasBaseline = false } = {}) {
  const out = [];
  const openReviews = reviewLog.filter(r => !r.resolved);

  // Before a baseline exists there is nothing to rank, so the "drill this
  // skill" suggestions below would be picked purely by exam share — arbitrary
  // advice dressed up as personalized advice, offered to the one student least
  // equipped to notice. The primary action already says what to do; a student
  // with no measurement gets one instruction, not four.
  if (!hasBaseline && !attempts.some(a => a.status === 'complete')) {
    return openReviews.length ? [{ id: 'review', label: `Review log (${openReviews.length})`, view: 'review' }] : [];
  }

  if (openReviews.length) {
    out.push({ id: 'review', label: `Review log (${openReviews.length})`, view: 'review' });
  }
  const ranked = rankSkillsByLeverage(masteryMap, { limit: 3 });
  for (const s of ranked.slice(1, 3)) {
    if (!SAT_SKILLS[s.skill]) continue;
    out.push({ id: `drill:${s.skill}`, label: `Drill ${s.label}`, view: 'practice', params: { skill: s.skill } });
  }
  if (attempts.some(a => a.kind === 'full' && a.status === 'complete')) {
    out.push({ id: 'scores', label: 'See your score history', view: 'scores' });
  }
  return out.slice(0, 4);
}
