// ─────────────────────────────────────────────────────────────────────────────
// The quest engine — pure logic. No React, no Dexie, no network.
//
// Everything that decides whether a quest is progressing, on pace, at risk, or
// finished lives in this one file, and it decides all of it from two inputs: the
// assignment row (a snapshot of the catalog entry, taken when it was assigned)
// and a flat list of dated events. That is what makes it testable end to end
// under plain Node (scripts/verifyQuests.mjs) and what keeps the same answer on
// the student's Home card, the quest board, and the parent's dashboard.
//
// ── The daily cap is applied HERE, not at the call site ─────────────────────
// Every producer in the app reports raw work ("a card was reviewed at 21:04").
// This module is the only place that knows a quest counts at most 25 of them per
// calendar day. Doing it anywhere else would mean a card that counted toward one
// quest but not another, and two surfaces disagreeing about the same number —
// the specific bug that makes a progress bar untrustworthy.
//
// Calendar days are LOCAL days (src/lib/dateUtils.js), matching the streak. A
// student studying at 11pm is having one evening, not two, and a quest that
// disagreed with the streak about which day it was would be a support ticket.
//
// ── Why assignments carry their own numbers ─────────────────────────────────
// `evaluate()` reads target/dailyCap/windowDays/minActiveDays off the ASSIGNMENT,
// falling back to the catalog only when a field is missing. A live quest is a
// promise already made to a student — re-pricing `flash_marathon` next month
// must not silently move the finish line of one somebody is three weeks into.
// The server snapshots the same fields for the same reason (migration 0014).
// ─────────────────────────────────────────────────────────────────────────────
import { localDateStr } from './dateUtils.js';
import {
  QUESTS, QUEST_BY_ID, QUEST_TIERS, QUEST_CATEGORIES, QUEST_METRICS,
  getQuest, questXP, questColor,
} from '../data/questCatalog.js';

export {
  QUESTS, QUEST_BY_ID, QUEST_TIERS, QUEST_CATEGORIES, QUEST_METRICS,
  getQuest, questXP, questColor,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampPos = (v) => Math.max(0, num(v));

/** Statuses an assignment row can be in. The server enforces the same set. */
export const QUEST_STATUS = {
  active: 'active',       // running; the only status that accrues progress
  completed: 'completed', // target met, XP not yet taken
  claimed: 'claimed',     // finished and paid
  expired: 'expired',     // the window closed short
  declined: 'declined',   // the student said no to a parent's assignment
  cancelled: 'cancelled', // withdrawn by whoever assigned it
};

/** Statuses that are over, one way or another. */
export const TERMINAL_STATUSES = new Set(['claimed', 'expired', 'declined', 'cancelled']);

/**
 * The parameters actually in force for an assignment: its own snapshot where it
 * has one, the catalog where it does not, and sane floors either way.
 */
export function questSpec(assignment) {
  const cat = getQuest(assignment?.questId) || {};
  const pick = (key, fallback) => {
    const v = Number(assignment?.[key]);
    return Number.isFinite(v) && v > 0 ? v : (Number(cat[key]) || fallback);
  };
  return {
    ...cat,
    questId: assignment?.questId || cat.id || null,
    title: assignment?.title || cat.title || 'Quest',
    // The metric is part of the snapshot too, and for the same reason as the
    // numbers: it is what the row was written against. Reading it off the
    // catalog alone would mean a quest whose catalog entry was retired (or
    // renamed) silently stops matching any event and sits at 0% forever.
    metric: assignment?.metric || cat.metric || null,
    tier: assignment?.tier || cat.tier || 'standard',
    xp: Number(assignment?.xp) > 0 ? Number(assignment.xp) : questXP(cat),
    target: pick('target', 1),
    windowDays: pick('windowDays', 14),
    dailyCap: pick('dailyCap', 1),
    minActiveDays: Math.max(0, Number(assignment?.minActiveDays ?? cat.minActiveDays) || 0),
  };
}

/**
 * The fewest calendar days this quest can possibly be finished in.
 *
 * Shown to both sides BEFORE anybody commits, which is the whole reason the
 * daily cap exists: "24 lessons in 28 days" reads as an arithmetic problem;
 * "at least 14 days of work, and you have 28" reads as the commitment it is.
 */
export function minimumDays(assignment) {
  const { target, dailyCap, minActiveDays } = questSpec(assignment);
  return Math.max(Math.ceil(target / Math.max(1, dailyCap)), minActiveDays, 1);
}

/** Local calendar-day key for an epoch-ms timestamp. */
const dayOf = (ms) => localDateStr(new Date(ms));

/**
 * Credit each calendar day up to the cap, oldest day first.
 *
 * Returns the per-day credited amounts so callers can draw the day-by-day bar on
 * the quest card — a student who did 60 cards on Tuesday under a 25 cap should
 * SEE the 35 that did not count, otherwise the cap feels like a bug rather than
 * the rule they agreed to.
 */
function creditByDay(events, { metric, from, to, dailyCap }) {
  const perDay = new Map();
  for (const e of events || []) {
    if (!e || e.type !== metric) continue;
    const at = num(e.at);
    if (!at || at < from || at > to) continue;
    const key = dayOf(at);
    const raw = perDay.get(key) || { raw: 0, credited: 0 };
    raw.raw += Math.max(1, num(e.value) || 1);
    perDay.set(key, raw);
  }
  let credited = 0;
  const days = [...perDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [, row] of days) {
    row.credited = Math.min(row.raw, dailyCap);
    credited += row.credited;
  }
  return {
    byDay: days.map(([date, row]) => ({ date, raw: row.raw, credited: row.credited, capped: row.raw > row.credited })),
    credited,
  };
}

/**
 * Everything any surface needs to know about one running quest.
 *
 * @param {object} assignment  the row: { questId, status, startedAt, dueAt, target, … }
 * @param {Array|null} events  [{ type, at, value }] — see buildQuestEvents.
 *   Pass `null` to skip derivation entirely and read `progress`/`activeDays` off
 *   the row instead. That is the PARENT's path: their device holds none of the
 *   evidence (it lives in their child's IndexedDB — see migration 0014), so the
 *   only honest number they have is the one the student's device reported. Every
 *   other output of this function — pace, urgency, the headline, days left — is
 *   derived from the calendar and works identically either way, which is what
 *   lets both dashboards share one engine and say the same thing.
 * @param {number} now
 */
export function evaluate(assignment, events = [], now = Date.now()) {
  const spec = questSpec(assignment);
  const startedAt = num(assignment?.startedAt) || now;
  const dueAt = num(assignment?.dueAt) || (startedAt + spec.windowDays * DAY_MS);

  const reportedOnly = events === null;
  const { byDay, credited } = reportedOnly
    ? { byDay: [], credited: clampPos(assignment?.progress) }
    : creditByDay(events, {
      metric: spec.metric,
      from: startedAt,
      // Progress is only ever counted inside the window. Work done after the
      // deadline is real work — it moves the streak, it pays its own XP — it just
      // does not retroactively rescue a quest whose time ran out.
      to: Math.min(now, dueAt),
      dailyCap: spec.dailyCap,
    });

  const progress = Math.min(credited, spec.target);
  const activeDays = reportedOnly
    ? clampPos(assignment?.activeDays)
    : byDay.filter((d) => d.credited > 0).length;
  const pct = spec.target > 0 ? Math.min(100, Math.round((progress / spec.target) * 100)) : 0;

  const targetMet = progress >= spec.target;
  const daysMet = activeDays >= spec.minActiveDays;
  const done = targetMet && daysMet;

  const msLeft = dueAt - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
  const expired = msLeft <= 0 && !done;

  // What is still owed, and whether the calendar can still deliver it. Both
  // halves matter: a student needing 20 more lessons at 2/day with 6 days left
  // is not "behind", they are mathematically finished, and telling them that
  // late is worse than telling them now.
  const remaining = Math.max(0, spec.target - progress);
  const daysStillNeeded = Math.max(
    Math.ceil(remaining / Math.max(1, spec.dailyCap)),
    Math.max(0, spec.minActiveDays - activeDays),
  );
  const impossible = !done && daysStillNeeded > daysLeft;

  // Pace: where they would be if they had spread the work evenly.
  const elapsedDays = Math.max(0, (Math.min(now, dueAt) - startedAt) / DAY_MS);
  const expected = spec.windowDays > 0
    ? Math.min(spec.target, (spec.target * elapsedDays) / spec.windowDays)
    : 0;
  const paceDelta = progress - expected;

  let state;
  if (done) state = 'done';
  else if (expired) state = 'expired';
  else if (impossible) state = 'lost';
  else if (daysLeft <= 2) state = 'urgent';
  else if (paceDelta >= spec.target * 0.1) state = 'ahead';
  else if (paceDelta <= -spec.target * 0.2) state = 'behind';
  else state = 'on_track';

  // What today would have to look like to still land this comfortably: the work
  // left, spread over the days left, respecting the cap.
  const perDayNeeded = daysLeft > 0
    ? Math.min(spec.dailyCap, Math.ceil(remaining / daysLeft))
    : remaining;

  return {
    spec,
    status: assignment?.status || QUEST_STATUS.active,
    progress, target: spec.target, pct,
    activeDays, minActiveDays: spec.minActiveDays, daysMet,
    remaining, perDayNeeded, daysStillNeeded,
    byDay,
    startedAt, dueAt, daysLeft, expired, impossible,
    expected: Math.round(expected), paceDelta: Math.round(paceDelta),
    done, state,
    // True when the numbers above came off the row rather than from evidence —
    // the parent's view. Surfaces that want to say so (and one does) can.
    reportedOnly,
    xp: spec.xp,
  };
}

/**
 * The one line a quest says about itself, wherever it is drawn small.
 *
 * Always forward-facing and always specific — "34 cards to go, 4 days left" is
 * an instruction; "68% complete" is a statistic. The strip and the home card
 * both use this so the app never says two different things about one quest.
 */
export function questHeadline(ev) {
  const unit = QUEST_METRICS[ev.spec.metric]?.unit || 'step';
  const plural = (n, u) => `${n} ${u}${n === 1 ? '' : 's'}`;
  switch (ev.state) {
    case 'done':
      return 'Finished — claim your XP.';
    case 'expired':
      return `Time ran out ${plural(ev.progress, unit)} in. It can be restarted.`;
    case 'lost':
      return `Not reachable in ${plural(ev.daysLeft, 'day')} — needs ${plural(ev.daysStillNeeded, 'day')}.`;
    case 'urgent':
      return ev.daysLeft <= 1
        ? `Last day — ${plural(ev.remaining, unit)} still owed.`
        : `${plural(ev.remaining, unit)} in the last ${plural(ev.daysLeft, 'day')}.`;
    case 'ahead':
      return `Ahead of pace — ${plural(ev.remaining, unit)} left over ${plural(ev.daysLeft, 'day')}.`;
    case 'behind':
      return `Behind pace — ${plural(ev.perDayNeeded, unit)} a day from here.`;
    default:
      return ev.daysMet || !ev.spec.minActiveDays
        ? `${plural(ev.remaining, unit)} to go, ${plural(ev.daysLeft, 'day')} left.`
        : `${plural(ev.remaining, unit)} to go — and ${plural(ev.spec.minActiveDays - ev.activeDays, 'more day')} of work.`;
  }
}

/** The tone every surface tints a quest with. Mirrors the streak's TONES idea. */
export const QUEST_TONES = {
  done:     { key: 'done',     color: '#10b981', label: 'Ready to claim' },
  urgent:   { key: 'urgent',   color: '#f97316', label: 'Deadline' },
  behind:   { key: 'behind',   color: '#f59e0b', label: 'Behind pace' },
  lost:     { key: 'lost',     color: '#ef4444', label: 'Out of runway' },
  expired:  { key: 'expired',  color: '#64748b', label: 'Expired' },
  ahead:    { key: 'ahead',    color: '#22c55e', label: 'Ahead' },
  on_track: { key: 'on_track', color: '#3b82f6', label: 'On track' },
};
export const toneFor = (ev) => QUEST_TONES[ev?.state] || QUEST_TONES.on_track;

/**
 * Where a quest is actually DONE, as a destination the app can navigate to.
 *
 * This is what turns a quest from a scoreboard into a thing you can act on: the
 * card, the strip, and the parent's read-only view all offer one button, and it
 * opens the exact surface the metric is earned on.
 */
export const QUEST_DESTINATIONS = {
  lesson_verified:   { tab: 'prep',      view: 'pathways',  label: 'Open your pathway' },
  lesson_studied:    { tab: 'prep',      view: 'pathways',  label: 'Open your pathway' },
  quiz_completed:    { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  quiz_strong:       { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  quiz_perfect:      { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  flashcard_review:  { tab: 'prep',      view: 'flashcards',label: 'Review cards' },
  sat_question:      { tab: 'sat',       view: 'practice',  label: 'Practise SAT' },
  sat_full_test:     { tab: 'sat',       view: 'tests',     label: 'Start a full test' },
  sat_review_clear:  { tab: 'sat',       view: 'review',    label: 'Open the review log' },
  plan_task:         { tab: 'plans',     view: null,        label: "Open today's plan" },
  interview_session: { tab: 'portfolio', view: 'interview', label: 'Practise an interview' },
  portfolio_entry:   { tab: 'portfolio', view: 'resume',    label: 'Log an entry' },
  clinical_hour:     { tab: 'portfolio', view: 'resume',    label: 'Log clinical hours' },
  essay_work:        { tab: 'portfolio', view: 'essays',    label: 'Open your essays' },
  opportunity_track: { tab: 'portfolio', view: 'opportunities', label: 'Find opportunities' },
  study_day:         { tab: 'prep',      view: 'pathways',  label: 'Earn today' },
};
export const destinationFor = (metric) => QUEST_DESTINATIONS[metric] || QUEST_DESTINATIONS.lesson_verified;

// ── Building the event list ──────────────────────────────────────────────────

/**
 * Turn the app's own records into the flat, dated event list `evaluate` wants.
 *
 * Every source here is something the app ALREADY stores for another reason —
 * quiz history, the card-review log, SAT responses, the day-activity ledger the
 * streak writes. Nothing new is recorded to make quests work, which matters: a
 * quest system that needs its own parallel telemetry is a quest system whose
 * numbers drift away from the rest of the product within a month.
 *
 * `dayActivity` is the interesting one. The streak already stores a per-day
 * count of every qualifying action (see recordStreakActivity in db.js), so
 * lessons, plan tasks, interviews and SAT question batches can be replayed from
 * it at day granularity — which is all a daily-capped quest ever needed. Events
 * are stamped at local noon of their day so they can never land in the
 * neighbouring day under any timezone arithmetic.
 */
export function buildQuestEvents({
  quizScores = [],
  cardReviews = [],
  satResponses = [],
  satAttempts = [],
  satReviewLog = [],
  lessons = [],
  dayActivity = [],
  portfolio = {},
} = {}) {
  const events = [];
  const push = (type, at, value = 1) => {
    const ts = num(at);
    if (ts > 0) events.push({ type, at: ts, value });
  };
  const noonOf = (dateStr) => {
    const [y, m, d] = String(dateStr || '').split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  };

  // Quizzes — one event for the attempt, plus the quality-gated variants.
  for (const q of quizScores) {
    const at = num(q?.completedAt);
    if (!at) continue;
    push('quiz_completed', at);
    if (num(q.score) >= 80) push('quiz_strong', at);
    if (num(q.score) >= 100) push('quiz_perfect', at);
  }

  // Flashcards — one event per review, which is what the cap is denominated in.
  for (const r of cardReviews) push('flashcard_review', r?.reviewedAt);

  // SAT — a response is a question answered; a completed attempt of kind
  // 'test'/'baseline' is a full-length sitting.
  for (const r of satResponses) push('sat_question', r?.answeredAt);
  for (const a of satAttempts) {
    if (a?.status !== 'complete' && !a?.finishedAt) continue;
    if (a?.kind === 'test' || a?.kind === 'baseline') push('sat_full_test', a.finishedAt || a.startedAt);
  }
  for (const item of satReviewLog) {
    if (item?.clearedAt || item?.resolvedAt) push('sat_review_clear', item.clearedAt || item.resolvedAt);
  }

  // Lessons — verified is the one that matters; studied is the softer variant.
  for (const l of lessons) {
    if (l?.verified && l?.completedAt) push('lesson_verified', l.completedAt);
    if (l?.completedAt) push('lesson_studied', l.completedAt);
  }

  // The streak ledger, replayed at day granularity.
  for (const d of dayActivity) {
    const at = noonOf(d?.date);
    if (!at) continue;
    if (d?.met) push('study_day', at);
    const counts = d?.counts || {};
    for (let i = 0; i < clampPos(counts.plan_task); i += 1) push('plan_task', at);
    for (let i = 0; i < clampPos(counts.interview_session); i += 1) push('interview_session', at);
  }

  // Portfolio — rows carry their own createdAt, so these are exact rather than
  // replayed. `hours` on a clinical row is the value, not the count.
  for (const a of (portfolio.activities || [])) push('portfolio_entry', a?.createdAt || a?.created_at);
  for (const r of (portfolio.research || [])) push('portfolio_entry', r?.createdAt || r?.created_at);
  for (const s of (portfolio.skills || [])) push('portfolio_entry', s?.createdAt || s?.created_at);
  for (const c of (portfolio.clinical || [])) {
    const at = c?.createdAt || c?.created_at;
    push('portfolio_entry', at);
    push('clinical_hour', at, Math.max(1, Math.round(num(c?.hours) || 1)));
  }
  for (const e of (portfolio.essays || [])) push('essay_work', e?.updatedAt || e?.updated_at || e?.createdAt);
  for (const t of (portfolio.tracked || [])) push('opportunity_track', t?.createdAt || t?.created_at);

  return events.sort((a, b) => a.at - b.at);
}

// ── Collections ──────────────────────────────────────────────────────────────

/**
 * Evaluate a whole list, and sort it the way every surface wants to show it:
 * claimable first, then the ones with a deadline breathing down their neck,
 * then everything else by how far along it is.
 */
export function evaluateAll(assignments = [], events = [], now = Date.now()) {
  // `events` is forwarded verbatim, so `null` reaches evaluate() as "read the
  // reported numbers" — see its doc comment. This is the parent dashboard's path.
  const RANK = { done: 0, urgent: 1, behind: 2, lost: 3, on_track: 4, ahead: 5, expired: 6 };
  return assignments
    .filter((a) => a && !TERMINAL_STATUSES.has(a.status))
    .map((a) => ({ assignment: a, ev: evaluate(a, events, now) }))
    .sort((a, b) => {
      const r = (RANK[a.ev.state] ?? 9) - (RANK[b.ev.state] ?? 9);
      if (r) return r;
      if (a.ev.daysLeft !== b.ev.daysLeft) return a.ev.daysLeft - b.ev.daysLeft;
      return b.ev.pct - a.ev.pct;
    });
}

/**
 * The counts the nav badge and every summary line read.
 *
 * `claimable` is what the badge actually shows — an unclaimed finished quest is
 * the only quest state that is urgent in the "there is money on the table" sense
 * rather than the "you should study" sense, and a badge that also counted
 * in-progress quests would be permanently lit and therefore ignored.
 */
export function summarize(rows = []) {
  const out = { active: 0, claimable: 0, urgent: 0, behind: 0, parentAssigned: 0, xpOnTable: 0 };
  for (const { assignment, ev } of rows) {
    out.active += 1;
    if (assignment.assignedBy === 'parent') out.parentAssigned += 1;
    if (ev.done) { out.claimable += 1; out.xpOnTable += ev.xp; }
    else if (ev.state === 'urgent') out.urgent += 1;
    else if (ev.state === 'behind' || ev.state === 'lost') out.behind += 1;
  }
  return out;
}

/**
 * The one quest a compact surface should show.
 *
 * `surface` biases toward a quest earned on the screen the student is already
 * looking at — a flashcard quest on the Flashcards tab is actionable in one tap,
 * whereas an SAT quest there is just an interruption. A claimable quest always
 * wins regardless of surface, because claiming is one tap from anywhere.
 */
export function featuredFor(rows = [], surface = null) {
  if (!rows.length) return null;
  const claimable = rows.find((r) => r.ev.done);
  if (claimable) return claimable;
  if (surface) {
    const local = rows.find((r) => {
      const q = getQuest(r.assignment.questId);
      return q?.surfaces?.includes(surface)
        || QUEST_METRICS[r.ev.spec.metric]?.surface === surface;
    });
    if (local) return local;
  }
  return rows[0];
}

// ── Recommendation ───────────────────────────────────────────────────────────

/**
 * What to suggest a parent assign, from what the dashboard already knows.
 *
 * This is deliberately conservative and explainable: each rule fires on one
 * observable fact and carries the sentence that justifies it, which is what the
 * parent reads. A recommender that cannot say WHY in one line is a recommender
 * a parent will not trust with their child's evenings.
 *
 * `signals` is the parent summary's shape, loosely: everything is optional and
 * a missing field simply means that rule does not fire. A brand-new student with
 * no data gets the starter set, which is the correct answer for them anyway.
 *
 * Never recommends something already running (`activeIds`).
 */
export function recommendQuests(signals = {}, activeIds = []) {
  const taken = new Set(activeIds);
  const out = [];
  const add = (id, reason, priority) => {
    if (taken.has(id) || out.some((r) => r.id === id) || !QUEST_BY_ID[id]) return;
    out.push({ id, quest: QUEST_BY_ID[id], reason, priority });
  };

  const s = signals || {};
  const activeDays7 = num(s.activeDaysLast7);
  const activeDays28 = num(s.activeDaysLast28);
  const lessonsVerified = num(s.lessonsVerified);
  const quizzes = num(s.quizzesTaken);
  const avgScore = s.averageScore == null ? null : num(s.averageScore);
  const satTests = num(s.satTestsTaken);
  const satQuestions = num(s.satQuestions);
  const cardsLast28 = num(s.cardReviewsLast28);
  const activities = num(s.activitiesLogged);
  const clinicalHours = num(s.clinicalHours);
  const gradeLevel = String(s.gradeLevel || '');
  const daysToExam = s.daysToExam == null ? null : num(s.daysToExam);
  const brandNew = lessonsVerified === 0 && quizzes === 0 && satQuestions === 0;

  // 1. Showing up at all. Nothing else is worth assigning to a student who is
  //    not opening the app, and the gentlest quest here is the right first ask.
  if (brandNew) {
    add('consist_first_week', 'They are just getting started. A short, winnable quest first — finishing one makes the next far more likely to be started.', 100);
    add('path_first_unit', 'The first five lessons, verified. This is the habit the rest of the product is built on.', 95);
  } else if (activeDays7 <= 2) {
    add('consist_first_week', `Only ${activeDays7} active day${activeDays7 === 1 ? '' : 's'} in the last week. Consistency is the thing to fix before anything else.`, 98);
  } else if (activeDays28 >= 20) {
    add('consist_month', `${activeDays28} active days in the last month — they can already hold this pace, and this is the reward for proving it.`, 70);
  } else if (activeDays7 >= 4) {
    add('consist_ten_days', `${activeDays7} active days last week. Ten out of fourteen is the next honest step up.`, 65);
  }

  // 2. The pathway — the core of the product, and the clearest thing to ask for.
  if (!brandNew) {
    if (lessonsVerified < 5) add('path_first_unit', `${lessonsVerified} lesson${lessonsVerified === 1 ? '' : 's'} verified so far. Five is one unit, and one unit is where the app starts personalising.`, 92);
    else if (lessonsVerified < 25) add('path_steady_dozen', `${lessonsVerified} lessons verified. Twelve more at two a day is a third of a pathway without wrecking a school week.`, 85);
    else add('path_crucible', `${lessonsVerified} lessons already verified — they are past the hard part, and a month at this pace would finish the track.`, 60);
  }

  // 3. SAT — driven by the test date if there is one.
  if (daysToExam != null && daysToExam > 0 && daysToExam <= 70) {
    add('sat_legend', `Test day is ${daysToExam} days out. This is the whole prep season, priced accordingly.`, 96);
    add('sat_three_tests', 'Three timed full-lengths before test day is the single most reliable predictor of the real score.', 90);
  } else if (satQuestions === 0) {
    add('sat_first_hundred', 'No SAT questions answered yet. A hundred is where the skill breakdown starts telling you which section is actually the problem.', 80);
  } else if (satQuestions < 400) {
    add('sat_grind', `${satQuestions} SAT questions so far. Volume is the part of prep with the most reliable link to a score, and the part students avoid.`, 75);
  }
  if (satTests >= 1 && satQuestions >= 100) {
    add('sat_clear_the_log', 'They have questions in the review log they got wrong and have not gone back to. That list is the highest-value work in the SAT tab.', 78);
  }

  // 4. Quality vs volume.
  if (quizzes >= 8 && avgScore != null && avgScore < 75) {
    add('mastery_strong_ten', `Quiz average is ${avgScore}%. The volume is there; this quest asks for the scores instead.`, 88);
  } else if (quizzes >= 15 && avgScore != null && avgScore >= 85) {
    add('mastery_perfect_five', `Averaging ${avgScore}% across ${quizzes} quizzes. Five clean hundreds is the next thing that is actually hard for them.`, 62);
  } else if (quizzes < 12) {
    add('quiz_dozen', 'A dozen quizzes in a fortnight gives the recommendation engine enough signal to personalise what comes next.', 55);
  }

  // 5. Retention.
  if (cardsLast28 < 100) {
    add('flash_fortnight', `${cardsLast28} card reviews in the last month. Spaced repetition only works if the spacing is real — the daily cap here enforces it.`, 68);
  } else if (cardsLast28 >= 300) {
    add('flash_marathon', 'They already review most days. This is the month-long version, and it pays like one.', 50);
  }

  // 6. Portfolio — weighted up for older students, because the deadline is real.
  const upperYear = /11|12|junior|senior/i.test(gradeLevel);
  if (activities < 5) {
    add('port_build_record', upperYear
      ? 'Applications are close and the activity record is thin. This is the cheapest gap on the list to close.'
      : 'Most students cannot remember in Year 12 what they did in Year 10. This fixes that two years early.', upperYear ? 86 : 52);
  }
  if (clinicalHours < 50) {
    add('port_clinical_fifty', 'Fifty clinical or shadowing hours is the number admissions readers start taking seriously — and most of this quest is earned outside the app.', upperYear ? 82 : 48);
  }
  if (upperYear) {
    add('port_essay_push', 'Essays are written by people who sit down twelve times, not once.', 72);
    add('port_interview_drill', 'Six separate days of speaking out loud. Interview nerves are a volume problem.', 58);
  }
  add('port_opportunity_hunt', 'Deadlines they never found are the applications they never made. Cheap, fast, high leverage.', 45);

  // 7. The plan, if they have one they are not following.
  if (s.hasPlan && num(s.planCompletionPct) < 60) {
    add('consist_plan_follow', 'The plan already says what to do each day; this quest is about actually doing it.', 84);
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * The student's own picker ordering: what they can take on right now, hardest
 * last inside each category, and with anything already running removed.
 *
 * Self-assignment is a first-class path, not a fallback — a student who chooses
 * their own quest finishes it more often than one who is handed the same quest,
 * and the catalog is identical either way. The only thing assignment changes is
 * who is watching.
 */
export function availableQuests(activeIds = []) {
  const taken = new Set(activeIds);
  return QUESTS.filter((q) => !taken.has(q.id));
}

/** Rough per-week cost of a quest, for the "what am I signing up for" line. */
export function weeklyCost(quest) {
  const spec = questSpec(quest?.id ? { questId: quest.id } : quest);
  const weeks = Math.max(1, spec.windowDays / 7);
  const unit = QUEST_METRICS[spec.metric]?.unit || 'step';
  const per = Math.ceil(spec.target / weeks);
  return `${per} ${unit}${per === 1 ? '' : 's'} a week for ${Math.round(weeks)} week${weeks < 1.5 ? '' : 's'}`;
}
