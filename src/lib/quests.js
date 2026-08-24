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
  QUEST_CHAINS, CATEGORY_ORDER, TIER_ORDER, tierRank,
  getQuest, questXP, questColor, chainFor, nextInChain, chainQuests, questsInCategory,
} from '../data/questCatalog.js';

export {
  QUESTS, QUEST_BY_ID, QUEST_TIERS, QUEST_CATEGORIES, QUEST_METRICS,
  QUEST_CHAINS, CATEGORY_ORDER, TIER_ORDER, tierRank,
  getQuest, questXP, questColor, chainFor, nextInChain, chainQuests, questsInCategory,
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
  lesson_perfect:    { tab: 'prep',      view: 'pathways',  label: 'Open your pathway' },
  unit_verified:     { tab: 'prep',      view: 'pathways',  label: 'Open your pathway' },
  quiz_completed:    { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  quiz_strong:       { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  quiz_perfect:      { tab: 'prep',      view: 'quizzes',   label: 'Take a quiz' },
  flashcard_review:  { tab: 'prep',      view: 'flashcards',label: 'Review cards' },
  deck_created:      { tab: 'prep',      view: 'flashcards',label: 'Build a deck' },
  note_written:      { tab: 'prep',      view: 'pathways',  label: 'Open a lesson' },
  coach_session:     { tab: 'prep',      view: 'coach',     label: 'Ask Medabrain' },
  plan_task:         { tab: 'plans',     view: null,        label: "Open today's plan" },
  interview_session: { tab: 'portfolio', view: 'interview', label: 'Practice an interview' },
  portfolio_entry:   { tab: 'portfolio', view: 'resume',    label: 'Log an entry' },
  clinical_hour:     { tab: 'portfolio', view: 'resume',    label: 'Log clinical hours' },
  award_logged:      { tab: 'portfolio', view: 'resume',    label: 'Log an award' },
  essay_work:        { tab: 'portfolio', view: 'essays',    label: 'Open your essays' },
  opportunity_track: { tab: 'portfolio', view: 'opportunities', label: 'Find opportunities' },
  scholarship_track: { tab: 'portfolio', view: 'aid',       label: 'Find scholarships' },
  college_saved:     { tab: 'portfolio', view: 'colleges',  label: 'Build your college list' },
  recommender_ask:   { tab: 'portfolio', view: 'recommenders', label: 'Add a recommender' },
  study_day:         { tab: 'prep',      view: 'pathways',  label: 'Earn today' },
  perfect_day:       { tab: 'prep',      view: 'pathways',  label: 'Go past your goal' },
  weekend_day:       { tab: 'prep',      view: 'pathways',  label: 'Earn this weekend' },
};
export const destinationFor = (metric) => QUEST_DESTINATIONS[metric] || QUEST_DESTINATIONS.lesson_verified;

// ── Building the event list ──────────────────────────────────────────────────

/**
 * Turn the app's own records into the flat, dated event list `evaluate` wants.
 *
 * Every source here is something the app ALREADY stores for another reason —
 * quiz history, the card-review log, the day-activity ledger the
 * streak writes. Nothing new is recorded to make quests work, which matters: a
 * quest system that needs its own parallel telemetry is a quest system whose
 * numbers drift away from the rest of the product within a month.
 *
 * `dayActivity` is the interesting one. The streak already stores a per-day
 * count of every qualifying action (see recordStreakActivity in db.js), so
 * lessons, plan tasks and interviews can be replayed from
 * it at day granularity — which is all a daily-capped quest ever needed. Events
 * are stamped at local noon of their day so they can never land in the
 * neighbouring day under any timezone arithmetic.
 */
export function buildQuestEvents({
  quizScores = [],
  cardReviews = [],
  lessons = [],
  dayActivity = [],
  unitMastery = [],
  coachMessages = [],
  lessonNotes = [],
  lessonHighlights = [],
  deckMeta = [],
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

  // Lessons — verified is the one that matters; studied is the softer variant;
  // perfect is a verification quiz taken clean. The 100 threshold matches the
  // one quiz_perfect uses above, so "aced" means the same thing everywhere.
  for (const l of lessons) {
    if (l?.verified && l?.completedAt) push('lesson_verified', l.completedAt);
    if (l?.completedAt) push('lesson_studied', l.completedAt);
    if (l?.verified && l?.completedAt && num(l.quizScore) >= 100) push('lesson_perfect', l.completedAt);
  }

  // Units — the level above lessons. `unitMastery` rows are written once, when
  // the unit quiz is passed, so these are exact.
  for (const u of unitMastery) push('unit_verified', u?.verifiedAt);

  // Medabrain — the student's OWN messages only. Counting the assistant's
  // replies would double every conversation and make a quest for "ask five
  // questions" finishable by asking two.
  for (const msg of coachMessages) {
    if (msg?.role === 'user') push('coach_session', msg.ts);
  }

  // Notes and highlights are one metric, because they are one behavior: the
  // student decided a specific sentence mattered enough to keep. Splitting them
  // would mean a student who only highlights can never finish a notes quest.
  for (const n of lessonNotes) {
    // An empty note row is a panel that was opened and closed. Text is the proof.
    if (String(n?.text || '').trim().length >= 3) push('note_written', n.updatedAt);
  }
  for (const h of lessonHighlights) push('note_written', h?.createdAt);

  // Decks the student built or generated themselves. `deckMeta` only ever holds
  // custom decks — the built-in decks have no row here — so this needs no filter.
  for (const d of deckMeta) push('deck_created', d?.createdAt);

  // The streak ledger, replayed at day granularity.
  //
  // `perfect_day` and `weekend_day` are both derived here rather than stored,
  // and both are measured against the goal the day was CLEARED AGAINST rather
  // than the student's current goal — the same rule dayActivity itself follows
  // (see recordStreakActivity in db.js). Otherwise lowering your daily goal
  // would retroactively turn ordinary days into double days.
  for (const d of dayActivity) {
    const at = noonOf(d?.date);
    if (!at) continue;
    if (d?.met) {
      push('study_day', at);
      const dow = new Date(at).getDay();
      if (dow === 0 || dow === 6) push('weekend_day', at);
      const goal = clampPos(d.goalCredits);
      if (goal > 0 && clampPos(d.credits) >= goal * 2) push('perfect_day', at);
    }
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
  // An award is a portfolio entry as well as an award: a student logging five
  // honors has built five rows of their record, and a portfolio quest that
  // ignored them would be telling them otherwise.
  for (const w of (portfolio.awards || [])) {
    const at = w?.createdAt || w?.created_at;
    push('portfolio_entry', at);
    push('award_logged', at);
  }
  for (const e of (portfolio.essays || [])) push('essay_work', e?.updatedAt || e?.updated_at || e?.createdAt);
  for (const t of (portfolio.tracked || [])) push('opportunity_track', t?.createdAt || t?.created_at);
  // Scholarships are tracked opportunities too — the Money Sweep is the narrower
  // quest, the Opportunity Hunt is the broader one, and a saved scholarship
  // honestly satisfies both.
  for (const s of (portfolio.scholarships || [])) {
    const at = s?.createdAt || s?.created_at;
    push('scholarship_track', at);
    push('opportunity_track', at);
  }
  for (const c of (portfolio.colleges || [])) push('college_saved', c?.createdAt || c?.created_at);
  for (const r of (portfolio.recommenders || [])) push('recommender_ask', r?.createdAt || r?.created_at);

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
export function recommendQuests(signals = {}, activeIds = [], doneIds = []) {
  const taken = new Set(activeIds);
  // A quest already claimed is not a recommendation, it is a memory. The chain
  // rules below use the same set to offer the NEXT rung instead.
  const finished = new Set(doneIds);
  const out = [];
  const add = (id, reason, priority) => {
    if (taken.has(id) || finished.has(id) || out.some((r) => r.id === id) || !QUEST_BY_ID[id]) return;
    out.push({ id, quest: QUEST_BY_ID[id], reason, priority });
  };

  const s = signals || {};
  const activeDays7 = num(s.activeDaysLast7);
  const activeDays28 = num(s.activeDaysLast28);
  const lessonsVerified = num(s.lessonsVerified);
  const quizzes = num(s.quizzesTaken);
  const avgScore = s.averageScore == null ? null : num(s.averageScore);
  const cardsLast28 = num(s.cardReviewsLast28);
  const activities = num(s.activitiesLogged);
  const clinicalHours = num(s.clinicalHours);
  const gradeLevel = String(s.gradeLevel || '');
  const notes = num(s.notesWritten);
  const coachChats = num(s.coachChats);
  const colleges = num(s.collegeCount);
  const scholarships = num(s.scholarshipCount);
  const essays = num(s.essayCount);
  const recommenders = num(s.recommenderCount);
  const interviews = num(s.interviewCount);
  const brandNew = lessonsVerified === 0 && quizzes === 0;

  // 1. Showing up at all. Nothing else is worth assigning to a student who is
  //    not opening the app, and the gentlest quest here is the right first ask.
  //    Note the ladder: a genuinely cold student is offered the five-day
  //    Warm-up, not the seven-day quest — a first quest exists to be finished,
  //    and the difference between 3-of-5 and 5-of-7 is the difference between a
  //    student who has completed something and one who has not.
  if (brandNew) {
    add('consist_warmup', 'They are just getting started. Three days out of five is the smallest promise in the catalog — and finishing one quest is what makes the next one worth starting.', 100);
    add('path_warmup', 'Three verified lessons, one a day. It establishes the one habit everything else in this app is built on: lessons get verified, not skimmed.', 96);
  } else if (activeDays7 <= 1) {
    add('consist_warmup', `Only ${activeDays7} active day${activeDays7 === 1 ? '' : 's'} in the last week. Start smaller than feels necessary — a quest they abandon costs more than one they were not set.`, 99);
  } else if (activeDays7 <= 2) {
    add('consist_first_week', `Only ${activeDays7} active days in the last week. Consistency is the thing to fix before anything else.`, 98);
  } else if (activeDays28 >= 24) {
    add('consist_mythic_season', `${activeDays28} active days in the last month. They have already proved they can hold a month — this is the eight-week version and the largest reward in the app.`, 74);
  } else if (activeDays28 >= 20) {
    add('consist_month', `${activeDays28} active days in the last month — they can already hold this pace, and this is the reward for proving it.`, 70);
  } else if (activeDays7 >= 4) {
    add('consist_ten_days', `${activeDays7} active days last week. Ten out of fourteen is the next honest step up.`, 65);
  }
  // The specific failure mode: a student who studies on school days and stops
  // on Friday. Fires only when there is enough history for the gap to be real.
  if (activeDays28 >= 8 && activeDays28 < 20 && activeDays7 >= 3) {
    add('consist_weekends', 'They study on school days and stop at the weekend, which is where nearly every broken streak in this product breaks. This quest names that directly.', 63);
  }

  // 2. The pathway — the core of the product, and the clearest thing to ask for.
  if (!brandNew) {
    if (lessonsVerified < 3) add('path_warmup', `${lessonsVerified} lesson${lessonsVerified === 1 ? '' : 's'} verified so far. Three, one a day, is the version of this they will finish.`, 93);
    else if (lessonsVerified < 5) add('path_first_unit', `${lessonsVerified} lessons verified so far. Five is one unit, and one unit is where the app starts personalizing.`, 92);
    else if (lessonsVerified < 25) add('path_steady_dozen', `${lessonsVerified} lessons verified. Twelve more at two a day is a third of a pathway without wrecking a school week.`, 85);
    else add('path_crucible', `${lessonsVerified} lessons already verified — they are past the hard part, and a month at this pace would finish the track.`, 60);
    if (lessonsVerified >= 10) {
      add('path_unit_master', 'Units are the level the pathway is actually organized around. Three mastered is a nameable chunk of a pathway rather than a scattered handful of pages.', 58);
    }
  }

  // 3. Quality vs volume.
  if (quizzes >= 8 && avgScore != null && avgScore < 75) {
    add('mastery_strong_ten', `Quiz average is ${avgScore}%. The volume is there; this quest asks for the scores instead.`, 88);
    add('mastery_strong_start', `At ${avgScore}%, ten strong scores may be a stretch. Five, one a day, is the version that gets finished.`, 83);
  } else if (quizzes >= 20 && avgScore != null && avgScore >= 88) {
    add('mastery_relentless', `Averaging ${avgScore}% across ${quizzes} quizzes. Six weeks of holding that standard is the only quest in the catalog they cannot shortcut.`, 64);
  } else if (quizzes >= 15 && avgScore != null && avgScore >= 85) {
    add('mastery_perfect_five', `Averaging ${avgScore}% across ${quizzes} quizzes. Five clean hundreds is the next thing that is actually hard for them.`, 62);
  } else if (quizzes < 12) {
    add('quiz_dozen', 'A dozen quizzes in a fortnight gives the recommendation engine enough signal to personalize what comes next.', 55);
  }

  // 4. Retention.
  if (cardsLast28 === 0) {
    add('flash_warmup', 'No card reviews at all in the last month. Sixty across a week is four short sessions — the smallest dose that still behaves like spaced repetition.', 72);
  } else if (cardsLast28 < 100) {
    add('flash_fortnight', `${cardsLast28} card reviews in the last month. Spaced repetition only works if the spacing is real — the daily cap here enforces it.`, 68);
  } else if (cardsLast28 >= 300) {
    add('flash_marathon', 'They already review most days. This is the month-long version, and it pays like one.', 50);
  } else {
    add('flash_century_club', `${cardsLast28} reviews last month. Fourteen days of it is the point at which students stop needing to be reminded to open the decks.`, 54);
  }

  // 5. Curiosity — the quiet failure modes. A student who never asks and never
  //    writes anything down is a student who stalls silently at the first thing
  //    they do not understand, and neither gap shows up in any other number.
  if (coachChats === 0) {
    add('explore_first_questions', 'They have never asked the coach anything. Students who do not ask are the ones who quietly stall on the first thing they do not understand.', 76);
  } else if (coachChats < 15) {
    add('explore_coach_habit', 'Asking for help is a learnable skill and most students are bad at it. Fifteen questions turns the coach from a novelty into the thing they reach for when stuck.', 51);
  }
  if (notes < 5 && lessonsVerified >= 3) {
    add('explore_notes', 'They are finishing lessons without writing anything down. Note-taking is the cheapest intervention in learning science and the one students skip first.', 61);
  } else if (notes >= 15) {
    add('explore_deep_notes', 'They already take notes. Forty across a month leaves them with an annotated version of their own pathway — the best revision material they will ever have.', 46);
  }

  // 6. Portfolio — weighted up for older students, because the deadline is real.
  const upperYear = /11|12|junior|senior/i.test(gradeLevel);
  if (activities === 0) {
    add('port_first_entries', 'The résumé is empty, and a blank résumé screen is the wall students do not get past. Three entries, one a day, clears it.', upperYear ? 88 : 66);
  } else if (activities < 5) {
    add('port_build_record', upperYear
      ? 'Applications are close and the activity record is thin. This is the cheapest gap on the list to close.'
      : 'Most students cannot remember in Year 12 what they did in Year 10. This fixes that two years early.', upperYear ? 86 : 52);
  } else if (upperYear && activities >= 8) {
    add('app_season_mythic', 'The record is real now. Eight weeks of building it properly is what walking into application season prepared actually looks like.', 68);
  }
  if (clinicalHours === 0) {
    add('port_clinical_start', 'Twelve hours is three afternoons — the version of clinical experience a student with no contacts and no car can actually achieve.', upperYear ? 80 : 50);
  } else if (clinicalHours < 50) {
    add('port_clinical_fifty', 'Fifty clinical or shadowing hours is the number admissions readers start taking seriously — and most of this quest is earned outside the app.', upperYear ? 82 : 48);
  } else if (clinicalHours >= 50) {
    add('port_clinical_legend', 'They are past fifty hours. A hundred and fifty is the number that stops being "some shadowing" and starts being what an interviewer asks about for ten minutes.', 56);
  }
  if (upperYear) {
    if (essays < 3) add('app_essay_sprint', 'Five sittings is the smallest number that produces something recognizable as a draft — and the cap is what stops it being one panicked evening.', 74);
    else add('port_essay_push', 'Essays are written by people who sit down twelve times, not once.', 72);
    if (recommenders < 3) {
      add('app_recommenders', 'Letters are the part of an application a student cannot write and cannot rush, and the part they leave until October. Three names in the spring is the whole intervention.', 79);
    }
    if (interviews < 6) {
      add('port_interview_drill', 'Six separate days of speaking out loud. Interview nerves are a volume problem.', 58);
    } else {
      add('port_interview_marathon', 'They have done a few. Fifteen separate sittings is what makes a real interview feel familiar, which is the entire objective.', 53);
    }
  }
  if (colleges < 8) {
    add('app_college_list', 'A named list — reach, match and safety — is what turns "I want to do medicine" into a plan with numbers attached.', upperYear ? 84 : 49);
  }
  if (scholarships < 10) {
    add('app_scholarship_sweep', 'The highest hourly rate a high schooler will ever earn. Fifteen tracked scholarships is thousands of dollars of expected value for a few hours of work.', upperYear ? 81 : 47);
  }
  add('port_opportunity_hunt', 'Deadlines they never found are the applications they never made. Cheap, fast, high leverage.', 45);

  // 7. The plan, if they have one they are not following.
  if (s.hasPlan && num(s.planCompletionPct) < 30) {
    add('consist_plan_sprint', 'The plan is being ignored rather than followed. A fortnight of it, capped at three tasks a day, is the version that rebuilds the habit.', 85);
  } else if (s.hasPlan && num(s.planCompletionPct) < 60) {
    add('consist_plan_follow', 'The plan already says what to do each day; this quest is about actually doing it.', 84);
  }

  // 8. Chains. Finishing a rung is the single highest-intent moment this system
  //    has, so the rung above anything they have already claimed is boosted
  //    above the generic rules — but never above the "they have stopped showing
  //    up" rules at the top, because a student who is absent does not need a
  //    harder quest, they need a smaller one.
  for (const id of finished) {
    const next = nextInChain(id);
    if (!next) continue;
    const chain = QUEST_CHAINS[next.chain];
    add(next.id, `They finished ${QUEST_BY_ID[id]?.title || 'the rung below this'}. This is step ${next.chainStep} of ${chain?.steps.length || '?'} on ${chain?.label || 'the same ladder'} — the next thing on a road they are already walking.`, 89);
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * The one quest to lead a picker with, and why.
 *
 * Same engine as recommendQuests, narrowed to a single answer — because a
 * student opening the picker wants a decision made for them, and a parent
 * opening theirs wants to be told what to ask for. Both surfaces still show the
 * full catalog underneath; this is what sits above it.
 */
export function topRecommendation(signals = {}, activeIds = [], doneIds = []) {
  return recommendQuests(signals, activeIds, doneIds)[0] || null;
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

/**
 * A day's honest cost, for the same purpose as weeklyCost but at the resolution
 * a student actually plans in. Never larger than the daily cap, because the cap
 * is the ceiling on what a day is allowed to be worth.
 */
export function dailyCost(quest) {
  const spec = questSpec(quest?.id ? { questId: quest.id } : quest);
  const days = Math.max(1, minimumDays(quest?.id ? { questId: quest.id } : quest));
  const unit = QUEST_METRICS[spec.metric]?.unit || 'step';
  const per = Math.min(spec.dailyCap, Math.ceil(spec.target / days));
  return `${per} ${unit}${per === 1 ? '' : 's'} a day, ${days} day${days === 1 ? '' : 's'} minimum`;
}

// ── Chains ───────────────────────────────────────────────────────────────────

/**
 * A chain rendered as progress: every rung, with what happened to it.
 *
 * `state` per rung is one of 'done' | 'running' | 'next' | 'locked-out' | 'open'.
 * Nothing is ever actually locked — 'next' is simply the rung the app is
 * pointing at, and 'open' is everything above it. A ladder that refused to let a
 * student skip to the top would punish the ones who arrive already good at this,
 * and there are plenty of those.
 */
export function chainProgress(chainId, { activeIds = [], doneIds = [] } = {}) {
  const chain = QUEST_CHAINS[chainId];
  if (!chain) return null;
  const active = new Set(activeIds);
  const done = new Set(doneIds);
  let nextAssigned = false;
  const steps = chain.steps.map((id, i) => {
    const quest = getQuest(id);
    let state;
    if (done.has(id)) state = 'done';
    else if (active.has(id)) state = 'running';
    else if (!nextAssigned) { state = 'next'; nextAssigned = true; }
    else state = 'open';
    return { id, quest, step: i + 1, state, xp: questXP(quest) };
  });
  const completed = steps.filter((s) => s.state === 'done').length;
  return {
    ...chain,
    steps,
    completed,
    of: steps.length,
    pct: Math.round((completed / steps.length) * 100),
    complete: completed === steps.length,
    // The prize at the end, quoted on the header so a five-rung ladder has a
    // visible reason to be climbed rather than only a next step.
    finaleXP: questXP(getQuest(chain.steps[chain.steps.length - 1])),
    next: steps.find((s) => s.state === 'next')?.quest || null,
  };
}

/** Every chain, as progress. The order QUEST_CHAINS declares them in. */
export function allChainProgress(opts = {}) {
  return Object.keys(QUEST_CHAINS).map((id) => chainProgress(id, opts)).filter(Boolean);
}

/**
 * The ids a board should treat as "already done" — claimed quests only.
 *
 * Deliberately not "any terminal status": a declined or expired quest has not
 * been finished, and offering the rung above it would be the app misreading a
 * refusal as an achievement.
 */
export const claimedIds = (rows = []) => rows.filter((r) => r.status === 'claimed').map((r) => r.questId);
