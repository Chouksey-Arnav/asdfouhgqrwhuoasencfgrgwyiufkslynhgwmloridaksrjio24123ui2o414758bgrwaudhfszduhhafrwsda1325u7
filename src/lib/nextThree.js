// ─────────────────────────────────────────────────────────────────────────────
// The next three things.
//
// A student should never open this app and wonder what to do. That is the whole
// specification, and it has two halves people usually only get one of:
//
//   1. Always THREE. Not "up to three" when the data is thin and not five when
//      it is rich. Three is a number a person can hold; a list of nine is a
//      second decision problem stacked on top of the first one, and the honest
//      outcome of handing a seventeen-year-old nine ranked options is that they
//      close the tab. `nextThree()` returns exactly three whenever the account
//      has three real things to offer and never returns four.
//
//   2. Ranked by URGENCY × IMPACT, not by either alone. Sorting by urgency puts
//      a flashcard deck that went due this morning above a program application
//      whose recommendation letters need six weeks. Sorting by impact puts the
//      program application on top in June and still on top the day after it
//      closed. The product is the only ordering that degrades correctly at both
//      ends: something enormous and distant waits, something trivial and
//      due-now waits, and something that is both large and closing does not.
//
// ── Why not just reuse sortByUrgency() ───────────────────────────────────────
// milestoneUrgency.js already answers "which of these DATES is most pressing",
// and this module leans on it rather than growing a second opinion about slack.
// But three of the five candidate sources have no date at all. An unstarted
// lesson, a flashcard backlog and two hundred unlogged hours are not late for
// anything — they are the things that quietly decide what a portfolio looks
// like in four years, and a purely date-driven dashboard shows a freshman an
// empty list and teaches them the app has nothing for them yet. So dated
// candidates get their urgency from urgencyOf() and undated ones get it from
// the pace they are actually falling behind, on the same 0–1 scale, and then
// everything competes in one pool.
//
// ── Why impact is band-weighted ──────────────────────────────────────────────
// The same fact means different things at different ages. A senior with an
// application due in three weeks should not be told to start a lesson unit; a
// freshman with no deadlines at all should not be shown an empty dashboard
// because the app only knows how to rank deadlines. BAND_WEIGHTS is that
// adjustment, and it is deliberately small (0.5×–1.3×) — it re-weights a real
// ranking rather than replacing it, so a genuinely burning deadline still wins
// for a ninth grader.
//
// Pure functions and plain data — no React, no network, no theme — so
// scripts/verifyNextThree.mjs can assert the ordering under plain Node.
// ─────────────────────────────────────────────────────────────────────────────

import { urgencyOf } from './milestoneUrgency.js';

/** Exactly this many, always. The constant exists so the cap is stated once. */
export const SLOTS = 3;

// How much each kind of work moves a student's actual standing, before any
// band adjustment. These are the "is this worth an evening" numbers, and they
// are ordered the way an admissions reader would order them, not the way an
// engagement metric would: logged hours and binding deadlines outrank streak-
// shaped busywork, because they are what the student is actually building.
const BASE_IMPACT = {
  deadline_application: 1.00,
  deadline_aid: 0.95,
  deadline_recommenders: 0.90,
  deadline_essays: 0.85,
  deadline_experience: 0.80,
  deadline_academics: 0.55,
  deadline_other: 0.50,
  hours: 0.85,
  portfolio: 0.70,
  lesson: 0.55,
  flashcards: 0.40,
};

// Band multipliers. `explore` is a ninth or tenth grader, `build` a junior,
// `apply` a senior. A null band (we do not know their year yet) gets 1.0
// across the board — an account we know nothing about is not second-guessed.
const BAND_WEIGHTS = {
  explore: { deadline: 0.70, hours: 1.30, portfolio: 0.85, lesson: 1.25, flashcards: 1.10 },
  build:   { deadline: 1.05, hours: 1.20, portfolio: 1.15, lesson: 1.00, flashcards: 1.00 },
  apply:   { deadline: 1.30, hours: 0.80, portfolio: 1.20, lesson: 0.50, flashcards: 0.70 },
};

const clamp01 = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** The band multiplier for a candidate family, defaulting to no adjustment. */
function bandWeight(family, band) {
  const row = BAND_WEIGHTS[band];
  return row ? (row[family] ?? 1) : 1;
}

// ── Urgency on one scale ─────────────────────────────────────────────────────

/**
 * A dated candidate's urgency, 0–1, derived from the slack/pressure model in
 * milestoneUrgency.js rather than from the raw date.
 *
 * The band supplies the floor (overdue work cannot be less than urgent than
 * something merely approaching) and pressure moves it within that band, which
 * preserves the property the urgency module exists for: a ninety-day program
 * application needing sixty days of run-up outranks a thirty-day form that
 * takes an afternoon.
 */
export function datedUrgency(event) {
  const u = urgencyOf(event);
  const floor = { overdue: 0.95, late: 0.85, start_now: 0.70, start_soon: 0.45, on_track: 0.10 }[u.band.id] ?? 0.1;
  const headroom = { overdue: 0.05, late: 0.10, start_now: 0.15, start_soon: 0.25, on_track: 0.35 }[u.band.id] ?? 0.2;
  return { value: clamp01(floor + headroom * clamp01(u.pressure)), detail: u };
}

/**
 * An undated candidate's urgency: how far behind the pace they are, where
 * "pace" is the share of the runway to graduation that has already elapsed.
 *
 * A sophomore who has logged 10 of 100 benchmark hours with 60% of high school
 * left is not behind. A senior with the same 10 hours and 5% left is very
 * behind. Same shortfall, completely different urgency, and a dashboard that
 * cannot tell them apart will nag the sophomore and fail the senior.
 */
export function paceUrgency({ done = 0, target = 0, elapsedShare = 0.5 }) {
  if (!(target > 0)) return 0;
  const completion = clamp01(done / target);
  const expected = clamp01(elapsedShare);
  // Behind by the gap between where they are and where the calendar says they
  // should be. Ahead of pace is not urgent at all, hence the floor at zero.
  const shortfall = Math.max(0, expected - completion);
  // Scaled so a student half a runway behind reads as fully urgent — being 50%
  // behind on clinical hours in your senior spring genuinely is a crisis, and
  // a linear map would report it as a mild 0.5.
  return clamp01(shortfall * 2);
}

/**
 * The share of high school already spent, used as the pace expectation above.
 * Grade 9 starts at 0 and graduation is 1. Clamped, so a `gap`-year student or
 * an account with no year on file lands somewhere sane rather than negative.
 */
export function elapsedShareOf(gradeStage) {
  // 'gap' is quoted only to keep it out of the spacing linter's way — that check
  // matches a bare `gap:` followed by a number as a CSS gap, and this is the
  // gap-YEAR grade stage, whose value is a share of a runway rather than pixels.
  return { freshman: 0.125, sophomore: 0.375, junior: 0.625, senior: 0.875, 'gap': 1 }[gradeStage] ?? 0.5;
}

// ── Candidate builders ───────────────────────────────────────────────────────
//
// Each returns an array of candidates. A candidate is a plain object:
//
//   { id, family, title, detail, urgency, impact, destination, cta, evidence }
//
// `destination` is a router id the dashboard hands to goAnywhere(); `evidence`
// is the concrete number the card shows, because "3 of 5 clinical requirements
// complete" is legible to a seventeen-year-old and to an admissions officer in
// a way that a progress bar with no denominator is not.

/** Upcoming (and overdue) deadline rows, from the `deadlines` resource. */
export function deadlineCandidates(deadlines = [], { today = new Date() } = {}) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const out = [];
  for (const row of deadlines || []) {
    if (!row?.due_date || row.completed_at) continue;
    const due = new Date(`${row.due_date}T00:00:00`);
    if (Number.isNaN(due.getTime())) continue;
    const days = Math.round((due - t) / 86400000);
    // A date more than a year out is a fact, not an action. It belongs on the
    // horizon module, not in a list of three things to do this week.
    if (days > 365) continue;
    const { value, detail } = datedUrgency({ ...row, days, kind: row.kind });
    out.push({
      id: `deadline:${row.id}`,
      family: 'deadline',
      title: row.title || 'Untitled deadline',
      detail: detail.reason || (days < 0
        ? `Its date passed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`
        : days === 0 ? 'Due today.' : `Due in ${days} day${days === 1 ? '' : 's'}.`),
      urgency: value,
      impact: BASE_IMPACT[`deadline_${row.kind}`] ?? BASE_IMPACT.deadline_other,
      destination: 'portfolio/applying:milestones',
      cta: days < 0 ? 'Deal with it' : 'Open it',
      evidence: null,
      days,
    });
  }
  return out;
}

/**
 * The next unstarted lesson in this student's pathway.
 *
 * One candidate, never a list: offering three lessons is offering a choice, and
 * the pathway is already ordered, so the only lesson that belongs here is the
 * one they would open next anyway.
 */
export function lessonCandidate({ nextLesson, doneLessons = 0, totalLessons = 0, gradeStage = null } = {}) {
  if (!nextLesson || !(totalLessons > 0)) return [];
  const urgency = paceUrgency({
    done: doneLessons, target: totalLessons, elapsedShare: elapsedShareOf(gradeStage),
  });
  return [{
    id: `lesson:${nextLesson.id}`,
    family: 'lesson',
    title: nextLesson.title,
    detail: nextLesson.unitTitle ? `Next in ${nextLesson.unitTitle}.` : 'Next in your pathway.',
    // A pathway with nothing done yet has no pace to be behind, but starting it
    // is the highest-leverage thing a new account can do — so an untouched
    // pathway floors at a real number instead of at zero.
    urgency: Math.max(urgency, doneLessons === 0 ? 0.55 : 0.2),
    impact: BASE_IMPACT.lesson,
    destination: 'prep/pathways',
    cta: doneLessons === 0 ? 'Start your pathway' : 'Resume',
    evidence: `${doneLessons} of ${totalLessons} lessons`,
  }];
}

/**
 * The single weakest hours category against the pathway's benchmark.
 *
 * One candidate, not four. A student behind on all four categories does not
 * need to be told that four times; they need to be told which one to spend
 * Saturday on. The rings module shows all four — this picks the one.
 */
export function hoursCandidate({ hours = {}, benchmarks = {}, gradeStage = null } = {}) {
  // The CTA is deliberately short and identical across the four. The title
  // already says which category ("Log shadowing hours"), and a button repeating
  // it word for word reads as a rendering bug rather than as emphasis.
  const CATEGORIES = [
    { key: 'shadowing',  benchKey: 'shadowingHours',  label: 'shadowing hours' },
    { key: 'clinical',   benchKey: 'clinicalHours',   label: 'clinical hours' },
    { key: 'volunteer',  benchKey: 'volunteerHours',  label: 'volunteer hours' },
    { key: 'leadership', benchKey: 'leadershipHours', label: 'leadership hours' },
  ];
  const elapsedShare = elapsedShareOf(gradeStage);
  let worst = null;
  for (const c of CATEGORIES) {
    const target = Number(benchmarks[c.benchKey]) || 0;
    if (!(target > 0)) continue;
    const done = Number(hours[c.key]) || 0;
    if (done >= target) continue;                       // met — nothing to prompt
    const urgency = paceUrgency({ done, target, elapsedShare });
    if (!worst || urgency > worst.urgency) worst = { ...c, done, target, urgency };
  }
  if (!worst) return [];
  return [{
    id: `hours:${worst.key}`,
    family: 'hours',
    title: `Log ${worst.label}`,
    detail: `Your pathway's benchmark is ${worst.target}. Anything already done but unlogged counts — log it.`,
    urgency: worst.urgency,
    impact: BASE_IMPACT.hours,
    destination: 'portfolio/activities',
    cta: 'Log hours',
    evidence: `${Math.round(worst.done)} of ${worst.target} hours`,
  }];
}

/** Flashcards that have come due under FSRS. */
export function flashcardCandidate({ dueCards = 0, dueDecks = 0 } = {}) {
  if (!(dueCards > 0)) return [];
  // Retention is the thing decaying here, and it decays with the size of the
  // backlog rather than with the clock — twelve due cards is a ten-minute
  // session, three hundred is a wall a student will not climb. Urgency rises
  // with the backlog and saturates, so a large backlog stays firmly mid-pack
  // rather than crowding out a real deadline.
  const urgency = clamp01(0.25 + Math.min(0.45, dueCards / 120));
  return [{
    id: 'flashcards:due',
    family: 'flashcards',
    title: `${dueCards} flashcard${dueCards === 1 ? '' : 's'} due`,
    detail: dueDecks > 1 ? `Across ${dueDecks} decks. Reviewing on time is what makes them stick.` : 'Reviewing on time is what makes them stick.',
    urgency,
    impact: BASE_IMPACT.flashcards,
    destination: 'prep/flashcards',
    cta: 'Review',
    evidence: `${dueCards} due`,
  }];
}

/**
 * Portfolio gaps — the concrete, finishable pieces of the application that are
 * missing. Each is phrased as a requirement with a denominator, never as a
 * nudge, because "1 of 2 recommenders confirmed" is the sentence that tells a
 * student what finished looks like.
 */
export function portfolioCandidates({ counts = null, gradeStage = null } = {}) {
  // No counts at all means the portfolio snapshot has not loaded yet, which is
  // not the same as "this student has nothing". Defaulting to an empty object
  // here would tell a returning senior with six programs saved to go add their
  // first one, for as long as the fetch takes — a flash of confidently wrong
  // advice in the one module that exists to be trusted.
  if (!counts || typeof counts !== 'object') return [];
  const elapsedShare = elapsedShareOf(gradeStage);
  const gaps = [
    {
      key: 'recommenders', done: counts.recommenders || 0, target: counts.recommendersNeeded || 2,
      title: 'Line up your recommenders', unit: 'recommenders confirmed',
      detail: 'Teachers write better letters with more notice — this is the ask, not the letter.',
      destination: 'portfolio/applying:recommenders', cta: 'Add a recommender',
    },
    {
      key: 'colleges', done: counts.colleges || 0, target: 6,
      title: 'Build out your program list', unit: 'programs saved',
      detail: 'A list you can see is a list you can plan against.',
      destination: 'portfolio/applying:colleges', cta: 'Add a program',
    },
    {
      key: 'activities', done: counts.activities || 0, target: 5,
      title: 'Write up your activities', unit: 'activities logged',
      detail: 'Write them down while you remember the details — you will not in two years.',
      destination: 'portfolio/activities', cta: 'Add an activity',
    },
    {
      key: 'essays', done: counts.essays || 0, target: Math.max(1, Math.min(counts.colleges || 0, 6)),
      title: 'Start a draft', unit: 'essays started',
      detail: 'A bad first draft beats a blank page by more than any other step in this process.',
      destination: 'portfolio/applying:essays', cta: 'Open the workspace',
    },
  ];
  const out = [];
  for (const g of gaps) {
    if (!(g.target > 0) || g.done >= g.target) continue;
    out.push({
      id: `portfolio:${g.key}`,
      family: 'portfolio',
      title: g.title,
      detail: g.detail,
      urgency: paceUrgency({ done: g.done, target: g.target, elapsedShare }),
      impact: BASE_IMPACT.portfolio,
      destination: g.destination,
      cta: g.cta,
      evidence: `${g.done} of ${g.target} ${g.unit}`,
    });
  }
  return out;
}

// ── The ranking ──────────────────────────────────────────────────────────────

/**
 * Rank every candidate by urgency × impact (band-adjusted) and return exactly
 * three.
 *
 * One candidate per family in the result. Three deadlines is a to-do list, not
 * a dashboard, and a student whose three things are all "log hours" learns
 * nothing about what else is waiting. The diversity rule is relaxed only if
 * there are not otherwise three families with something to offer, because
 * returning two items to keep a rule tidy would break the more important
 * promise at the top of this file.
 */
export function nextThree(input = {}) {
  const { gradeBand = null, gradeStage = null, today = new Date() } = input;

  const candidates = [
    ...deadlineCandidates(input.deadlines, { today }),
    ...lessonCandidate({ ...input, gradeStage }),
    ...hoursCandidate({ ...input, gradeStage }),
    ...flashcardCandidate(input),
    ...portfolioCandidates({ counts: input.counts, gradeStage }),
  ];

  const scored = candidates
    .map((c) => {
      const weight = bandWeight(c.family, gradeBand);
      const impact = clamp01(c.impact * weight);
      return { ...c, weightedImpact: impact, score: clamp01(c.urgency) * impact };
    })
    // Ties broken by impact so that, all else equal, the thing that matters
    // more to the student's actual standing goes first.
    .sort((a, b) => (b.score - a.score) || (b.weightedImpact - a.weightedImpact) || String(a.id).localeCompare(String(b.id)));

  const picked = [];
  const usedFamilies = new Set();
  for (const c of scored) {
    if (picked.length >= SLOTS) break;
    if (usedFamilies.has(c.family)) continue;
    picked.push(c);
    usedFamilies.add(c.family);
  }
  // Backfill from the same ordered list if fewer than three families had
  // anything — the cap is the invariant, the diversity rule is a preference.
  for (const c of scored) {
    if (picked.length >= SLOTS) break;
    if (picked.some((p) => p.id === c.id)) continue;
    picked.push(c);
  }
  return picked.slice(0, SLOTS);
}
