// ─────────────────────────────────────────────────────────────────────────────
// verify:next-three — the build gate on the student dashboard's first module.
//
// Two promises are checked here, and they are the two that are easy to break by
// accident six months from now when somebody adds a sixth candidate source:
//
//   NEVER MORE THAN THREE. The cap is the feature. A list of five is a second
//   decision problem stacked on the first one.
//
//   URGENCY × IMPACT, NOT EITHER ALONE. The ordering is checked against the
//   worked examples from the module header, because both degenerate sorts
//   (pure urgency, pure impact) look correct on most inputs and get exactly
//   these cases backwards.
//
// The dashboard's own source is also read, so the streak counter cannot drift
// back onto the parent dashboard — see the last section for why that rule is
// enforced by the build rather than by memory.
//
// Plain Node, no bundler: everything imported here is pure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  SLOTS, nextThree, datedUrgency, paceUrgency, elapsedShareOf,
  deadlineCandidates, lessonCandidate, hoursCandidate, flashcardCandidate, portfolioCandidates,
} from '../src/lib/nextThree.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, '..', p), 'utf8');

let passed = 0, failed = 0;
const problems = [];
const assert = (label, cond) => {
  if (cond) { passed++; return; }
  failed++; problems.push(`  ✗ ${label}`);
};

const TODAY = new Date('2026-09-15T12:00:00');
const dayOut = (n) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── The cap ─────────────────────────────────────────────────────────────────
{
  assert('SLOTS is three', SLOTS === 3);

  // A maximally rich account: every source has something to offer.
  const rich = {
    today: TODAY,
    gradeBand: 'build', gradeStage: 'junior',
    deadlines: Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`, title: `Deadline ${i}`, due_date: dayOut(5 + i * 3), kind: 'application',
    })),
    nextLesson: { id: 'l1', title: 'Cardiac cycle', unitTitle: 'Physiology' },
    doneLessons: 2, totalLessons: 40,
    hours: { shadowing: 0, clinical: 0, volunteer: 0, leadership: 0 },
    benchmarks: { shadowingHours: 40, clinicalHours: 100, volunteerHours: 100, leadershipHours: 50 },
    dueCards: 200, dueDecks: 6,
    counts: { recommenders: 0, colleges: 0, activities: 0, essays: 0 },
  };
  const out = nextThree(rich);
  assert('a maximally rich account still returns exactly three', out.length === 3);
  assert('the three are distinct', new Set(out.map(c => c.id)).size === 3);
  assert('a rich account gets three distinct families', new Set(out.map(c => c.family)).size === 3);

  // An empty account returns nothing rather than inventing filler.
  assert('an empty account returns an empty list', nextThree({ today: TODAY }).length === 0);

  // Fewer than three families available: the cap still holds, and backfill runs
  // rather than under-filling to keep the diversity preference tidy.
  const deadlinesOnly = nextThree({
    today: TODAY, gradeBand: 'apply', gradeStage: 'senior',
    deadlines: [
      { id: 'a', title: 'A', due_date: dayOut(3), kind: 'application' },
      { id: 'b', title: 'B', due_date: dayOut(9), kind: 'application' },
      { id: 'c', title: 'C', due_date: dayOut(20), kind: 'application' },
      { id: 'd', title: 'D', due_date: dayOut(40), kind: 'application' },
    ],
  });
  assert('a deadlines-only account backfills to three', deadlinesOnly.length === 3);
  assert('backfill never exceeds three', deadlinesOnly.length <= SLOTS);
}

// ─── Urgency × impact, not either alone ──────────────────────────────────────
{
  // The worked example from milestoneUrgency.js, carried through to this
  // module: a 95-day program application needing ~60 days of run-up must
  // outrank a 30-day form that takes an afternoon. Pure date order gets this
  // backwards, and so does pure slack.
  const cands = deadlineCandidates([
    { id: 'prog', title: 'Summer research program', due_date: dayOut(95), kind: 'experience', lead_days: 60 },
    { id: 'form', title: 'Club fundraiser form', due_date: dayOut(30), kind: 'planning', lead_days: 1 },
  ], { today: TODAY });
  const prog = cands.find(c => c.id === 'deadline:prog');
  const form = cands.find(c => c.id === 'deadline:form');
  assert('the long-lead program is more urgent than the sooner afternoon form',
    prog.urgency > form.urgency);
  assert('the long-lead program also outranks it on urgency × impact',
    prog.urgency * prog.impact > form.urgency * form.impact);

  // Pure impact would put a huge-but-distant item first forever.
  const distant = deadlineCandidates([
    { id: 'far', title: 'Application', due_date: dayOut(300), kind: 'application' },
    { id: 'near', title: 'Aid form', due_date: dayOut(2), kind: 'aid' },
  ], { today: TODAY });
  const far = distant.find(c => c.id === 'deadline:far');
  const near = distant.find(c => c.id === 'deadline:near');
  assert('a higher-impact but distant item does not outrank an imminent one',
    near.urgency * near.impact > far.urgency * far.impact);

  // Pure urgency would let a flashcard backlog beat a closing application.
  const mixed = nextThree({
    today: TODAY, gradeBand: 'apply', gradeStage: 'senior',
    deadlines: [{ id: 'app', title: 'Application due', due_date: dayOut(10), kind: 'application' }],
    dueCards: 400, dueDecks: 9,
  });
  assert('a closing application outranks a large flashcard backlog',
    mixed[0].family === 'deadline');
}

// ─── Pace, not raw shortfall ─────────────────────────────────────────────────
{
  // Same shortfall, different year: the senior is behind, the sophomore is not.
  const soph = paceUrgency({ done: 10, target: 100, elapsedShare: elapsedShareOf('sophomore') });
  const senior = paceUrgency({ done: 10, target: 100, elapsedShare: elapsedShareOf('senior') });
  assert('the same shortfall is more urgent for a senior than a sophomore', senior > soph);
  assert('ahead of pace is not urgent at all',
    paceUrgency({ done: 90, target: 100, elapsedShare: elapsedShareOf('freshman') }) === 0);
  assert('a zero target never divides by zero', paceUrgency({ done: 0, target: 0 }) === 0);

  assert('elapsed share rises monotonically through high school',
    elapsedShareOf('freshman') < elapsedShareOf('sophomore')
    && elapsedShareOf('sophomore') < elapsedShareOf('junior')
    && elapsedShareOf('junior') < elapsedShareOf('senior'));
  assert('an unknown grade lands mid-runway rather than at an extreme',
    elapsedShareOf(null) > 0 && elapsedShareOf(null) < 1);
}

// ─── The freshman must never see an empty dashboard ──────────────────────────
{
  // The case the module exists for: a ninth grader with no deadlines, no
  // portfolio and an untouched pathway. A date-driven dashboard shows them
  // nothing and teaches them the app has nothing for them yet.
  const freshman = nextThree({
    today: TODAY, gradeBand: 'explore', gradeStage: 'freshman',
    nextLesson: { id: 'l1', title: 'What a physician actually does', unitTitle: 'Orientation' },
    doneLessons: 0, totalLessons: 40,
    hours: { shadowing: 0, clinical: 0, volunteer: 0, leadership: 0 },
    benchmarks: { shadowingHours: 15, clinicalHours: 40, volunteerHours: 60, leadershipHours: 30 },
    counts: { recommenders: 0, colleges: 0, activities: 0, essays: 0 },
  });
  assert('a freshman with no deadlines still gets three things', freshman.length === 3);
  assert('a freshman is offered their pathway, not application paperwork',
    freshman.some(c => c.family === 'lesson'));

  // And the senior's emphasis is the opposite one.
  const senior = nextThree({
    today: TODAY, gradeBand: 'apply', gradeStage: 'senior',
    deadlines: [{ id: 'x', title: 'Early action', due_date: dayOut(45), kind: 'application' }],
    nextLesson: { id: 'l1', title: 'A lesson', unitTitle: 'Unit' },
    doneLessons: 5, totalLessons: 40,
    counts: { recommenders: 0, colleges: 0, activities: 0, essays: 0 },
  });
  assert('a senior leads with the deadline, not the lesson', senior[0].family === 'deadline');
}

// ─── Candidate hygiene ───────────────────────────────────────────────────────
{
  assert('a completed deadline is never offered',
    deadlineCandidates([{ id: 'c', title: 'Done', due_date: dayOut(3), kind: 'application', completed_at: '2026-09-01' }], { today: TODAY }).length === 0);
  assert('a deadline more than a year out is not an action',
    deadlineCandidates([{ id: 'f', title: 'Far', due_date: dayOut(500), kind: 'application' }], { today: TODAY }).length === 0);
  assert('a dateless row is skipped rather than read as due today',
    deadlineCandidates([{ id: 'n', title: 'No date', kind: 'application' }], { today: TODAY }).length === 0);

  assert('a met hours benchmark is not prompted',
    hoursCandidate({ hours: { shadowing: 50 }, benchmarks: { shadowingHours: 40 }, gradeStage: 'senior' }).length === 0);
  assert('only the single weakest hours category is offered',
    hoursCandidate({
      hours: { shadowing: 0, clinical: 0, volunteer: 0, leadership: 0 },
      benchmarks: { shadowingHours: 40, clinicalHours: 100, volunteerHours: 100, leadershipHours: 50 },
      gradeStage: 'junior',
    }).length === 1);
  assert('no flashcard candidate when nothing is due', flashcardCandidate({ dueCards: 0 }).length === 0);
  assert('no lesson candidate without a next lesson', lessonCandidate({ totalLessons: 40 }).length === 0);

  // Every candidate carries the concrete denominator the dashboard renders.
  // "3 of 5 clinical requirements complete" beats "450 XP", and a candidate
  // with no evidence string quietly becomes the latter.
  const withEvidence = [
    ...lessonCandidate({ nextLesson: { id: 'l', title: 'T', unitTitle: 'U' }, doneLessons: 3, totalLessons: 10, gradeStage: 'junior' }),
    ...hoursCandidate({ hours: { clinical: 12 }, benchmarks: { clinicalHours: 100 }, gradeStage: 'junior' }),
    ...portfolioCandidates({ counts: { recommenders: 1, colleges: 2, activities: 0, essays: 0 }, gradeStage: 'junior' }),
  ];
  assert('every progress candidate states a concrete denominator',
    withEvidence.length > 0 && withEvidence.every(c => typeof c.evidence === 'string' && /\d+\s+of\s+\d+/.test(c.evidence)));

  // Scores stay on a comparable scale, or the product ordering is meaningless.
  const all = nextThree({
    today: TODAY, gradeBand: 'build', gradeStage: 'junior',
    deadlines: [{ id: 'd', title: 'D', due_date: dayOut(1), kind: 'application' }],
    dueCards: 500, dueDecks: 9,
    hours: { shadowing: 0 }, benchmarks: { shadowingHours: 40 },
    counts: { recommenders: 0, colleges: 0 },
  });
  assert('every score stays within 0–1', all.every(c => c.score >= 0 && c.score <= 1));
  assert('results are ordered by descending score',
    all.every((c, i) => i === 0 || all[i - 1].score >= c.score));
  assert('every result carries a destination and a call to action',
    all.every(c => typeof c.destination === 'string' && c.destination && typeof c.cta === 'string' && c.cta));
}

// ─── The streak lives on the student dashboard and nowhere else ──────────────
//
// Streaks reward students with free time and punish students with jobs, caregiving
// duties or a heavy sports season — disproportionately the students this product
// most wants to serve. It is kept as one small line on the student's own dashboard
// and deliberately never shown to a parent, because a parent looking at a broken
// streak is a conversation about compliance rather than about progress. That is a
// product decision that a well-meaning one-line change can undo, so the build
// enforces it.
{
  const parentSources = [
    'src/components/parent/ParentApp.jsx',
    'src/components/parent/ProgressSummary.jsx',
    'src/lib/parentDigest.js',
    'src/lib/parentApi.js',
    'api/_lib/parentSummary.js',
  ];
  // What is forbidden is READING a streak value, not saying the word. Both parent surfaces
  // explain in prose why they show a calendar instead of a streak, and that copy is the rule
  // being honoured rather than broken — so this matches field access (`streakDays`,
  // `effort.streak…`, a `streak:` payload key) and leaves comments and sentences alone.
  const STREAK_FIELD = /(\bstreak[A-Z_]\w*)|([.?]\s*streak\b)|(\bstreak\s*:)|(\bcurrentStreak\b)/;
  for (const path of parentSources) {
    let src = '';
    try { src = read(path); } catch { continue; }
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')       // block and JSX comments
      .replace(/(^|[^:])\/\/.*$/gm, '$1');    // line comments, sparing protocol-relative URLs
    const hit = code.split('\n').findIndex(l => STREAK_FIELD.test(l));
    assert(`${path} reads no streak field${hit >= 0 ? ` (line ${hit + 1}: ${code.split('\n')[hit].trim().slice(0, 70)})` : ''}`, hit < 0);
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────
if (failed) {
  console.error(`\n✗ Next-three verification FAILED — ${failed} problem(s), ${passed} passed:\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`✓ Next-three verification passed — ${passed} assertions.`);
console.log(`  Cap holds at ${SLOTS}; ordering is urgency × impact, not either alone.`);
console.log('  Streak stays on the student dashboard and off every parent surface.');
