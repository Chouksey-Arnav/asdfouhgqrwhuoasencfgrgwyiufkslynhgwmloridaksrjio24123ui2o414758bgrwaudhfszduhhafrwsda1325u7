#!/usr/bin/env node
/**
 * The gate on parent accounts.
 *
 * A parent is a row in app_users with role='parent', which means their bearer token is
 * indistinguishable from a student's to every handler in this repo (see the header of
 * supabase/migrations/0006_parent_dashboard.sql for why that trade was made). Two guards make that
 * safe — requireStudent on the student endpoints, requireParent plus a per-request getActiveLink
 * on the parent ones — and the failure mode of forgetting either is SILENT: the endpoint keeps
 * working, for the wrong person.
 *
 * A code review cannot be the control for that, because the dangerous change is not "someone edits
 * the guard", it is "someone adds a new endpoint and never thinks about it". So this script is
 * structural: it enumerates the handlers that exist, not the ones anybody remembered to list, and
 * fails on any that is not explicitly accounted for.
 *
 *   1. EVERY HANDLER IS CLASSIFIED. Each file under api/ either calls exactly one guard or is on
 *      the public allowlist below, with a reason. A new file is a failure until someone decides
 *      which it is.
 *   2. THE STUDENT ENDPOINTS ARE STUDENT-ONLY, and the parent endpoints that return student data
 *      are parent-only.
 *   3. CONSENT IS RE-READ PER REQUEST, never cached on the 30-day session.
 *   4. ROLE IS WRITTEN ONLY AT ACCOUNT CREATION. A student who could flip themselves to 'parent'
 *      could invite anyone and read their progress.
 *   5. THE SUMMARY IS AN ALLOWLIST. Built against a snapshot stuffed with private content, then
 *      scanned for any trace of it — coach transcripts, notes, highlights, per-question answers.
 *   6. THE DERIVATION IS CORRECT. Streaks, calendars and trends, against known inputs.
 *
 * Run:  npm run verify:parent
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildParentSummary } from '../api/_lib/parentSummary.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'api');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); return true; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  return false;
};
const section = (name) => console.log(`\n${name}`);
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Every request handler under api/, excluding the shared _lib modules. */
function handlerFiles(dir = API_DIR, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '_lib') continue;
      handlerFiles(full, acc);
    } else if (entry.endsWith('.js')) {
      acc.push(path.relative(ROOT, full));
    }
  }
  return acc;
}

// ── The public surface, and why each one is on it ───────────────────────────
//
// These handlers deliberately answer without a session, because requiring one would make them
// impossible to use for their purpose. Every entry carries the reason, so removing one is a
// decision rather than a cleanup.
const PUBLIC_HANDLERS = {
  'api/auth/send-otp.js':        'issues the code that proves an inbox — runs before any account exists',
  'api/auth/verify-otp.js':      'redeems that code; the code is the credential',
  'api/auth/complete-signup.js': 'creates the account — there is no session to require yet',
  'api/auth/login.js':           'mints the session',
  'api/auth/google.js':          'exchanges a Google token for a session',
  'api/auth/reset-password.js':  'recovery path for someone who cannot sign in by definition',
  'api/auth/logout.js':          'drops a token; must work even for one already invalid',
  'api/send-email.js':           'contact form, reachable from the signed-out landing page',
  'api/groq.js':                 'AI proxy, rate-limited on its own terms',
};

/** Handlers that must be student-only: they read or write one student's own work. */
const STUDENT_ONLY = [
  'api/progress-sync.js',
  'api/master-plan.js',
  'api/reward-claim.js',
  'api/data/[resource].js',
];

/** Handlers that must be parent-only: they return another person's data. */
const PARENT_ONLY = ['api/parent/summary.js'];

/** Handlers legitimately used by both roles — profile, export, deletion, the link itself. */
const EITHER_ROLE = ['api/auth/me.js', 'api/auth/account.js', 'api/parent/links.js', 'api/parent/accept.js'];

const GUARDS = ['requireStudent', 'requireParent', 'requireUser'];

function guardsUsedIn(source) {
  // Counts CALLS, not imports: an import that is never invoked is exactly the bug this looks for.
  return GUARDS.filter((g) => new RegExp(`await\\s+${g}\\s*\\(`).test(source));
}

// ── 1. Every handler is classified ──────────────────────────────────────────

function checkEveryHandlerClassified(files) {
  section('Every API handler is classified');

  const classified = new Set([...Object.keys(PUBLIC_HANDLERS), ...STUDENT_ONLY, ...PARENT_ONLY, ...EITHER_ROLE]);
  const unclassified = files.filter((f) => !classified.has(f));
  assert('no handler is unaccounted for (add it to a list in this file)', unclassified.length === 0,
    unclassified.length ? `unclassified: ${unclassified.join(', ')}` : '');

  const missing = [...classified].filter((f) => !files.includes(f));
  assert('every classified handler still exists', missing.length === 0,
    missing.length ? `listed but gone: ${missing.join(', ')}` : '');

  for (const file of files) {
    if (!classified.has(file)) continue;
    const source = read(file);
    const guards = guardsUsedIn(source);
    if (PUBLIC_HANDLERS[file]) {
      assert(`${file} is public and takes no session (${PUBLIC_HANDLERS[file]})`, guards.length === 0,
        `calls: ${guards.join(', ')}`);
    } else {
      assert(`${file} calls exactly one guard`, guards.length === 1,
        guards.length ? `calls ${guards.length}: ${guards.join(', ')}` : 'calls none — anyone with any token can reach it');
    }
  }
}

// ── 2. The right guard on the right endpoint ────────────────────────────────

function checkGuardChoice() {
  section('Student endpoints are student-only, parent endpoints are parent-only');

  for (const file of STUDENT_ONLY) {
    const source = read(file);
    assert(`${file} is behind requireStudent`, guardsUsedIn(source).includes('requireStudent'),
      'a parent account could otherwise write into this student table under its own id');
    // The old shape returned a user and left the 401 to the caller, so an early `return` that was
    // forgotten meant the handler ran on for an unauthenticated request. The guard now sends the
    // response itself and returns null, which only works if the caller bails.
    assert(`${file} bails when the guard rejects`, /if\s*\(!user\)\s*return;/.test(source),
      'the guard sends the response and returns null — the handler must stop');
  }

  for (const file of PARENT_ONLY) {
    const source = read(file);
    assert(`${file} is behind requireParent`, guardsUsedIn(source).includes('requireParent'),
      'a student token must not be able to reach an endpoint that returns another person data');
  }

  // The one thing a parent endpoint must never do is trust the parent's own claim about which
  // student they are asking for.
  const summary = read('api/parent/summary.js');
  assert('api/parent/summary.js resolves consent through getActiveLink, not the request',
    /getActiveLink|getActiveLinksForParent/.test(summary));
  assert('api/parent/summary.js never selects from progress_sync directly',
    !/from\(['"]progress_sync['"]\)/.test(summary),
    'the raw snapshot must only be read through the allowlisted derivation');
}

// ── 3. Consent is re-read, not cached ───────────────────────────────────────

function checkRevocationIsImmediate() {
  section('Revocation takes effect on the next request');

  const session = read('api/_lib/session.js');
  assert("getActiveLink filters on status = 'active' in the query", /\.eq\('status',\s*'active'\)/.test(session),
    'filtering in JS after fetching means a revoked row can be read and then mis-handled');
  assert('getActiveLink takes a supabase client per call rather than memoising a result',
    /export async function getActiveLink\(supabase/.test(session));

  // A cache keyed by session or user id would survive revocation for up to the session's 30-day
  // life. The summary cache is keyed by the student's snapshot timestamp and holds no link state,
  // which is what makes it safe.
  const summaryLib = read('api/_lib/parentSummary.js');
  assert('the summary cache holds no link or consent state',
    !/parent_links/.test(summaryLib),
    'a cache that remembers who was allowed to read would outlive the permission');
}

// ── 4. Role is write-once ───────────────────────────────────────────────────

function checkRoleIsWriteOnce(files) {
  section('Role is written only at account creation');

  const writers = [];
  for (const file of files) {
    const source = read(file);
    // Matches `role` as a COLUMN being written, not as a value being read — `revoked_by: role` is
    // the caller's own role travelling into an audit field, which is the opposite of an escalation.
    if (/\.update\(\s*\{[^}]*[\s{,]role\s*:/s.test(source)) writers.push(`${file} (update)`);
  }
  assert('no endpoint updates role on an existing account', writers.length === 0,
    writers.join(', '));

  const signup = read('api/auth/complete-signup.js');
  assert('complete-signup sets role only on insert', /\.insert\(\{[^}]*role[^}]*\}\)/s.test(signup));
  assert('complete-signup coerces anything that is not "parent" to "student"',
    /role\s*=\s*body\?\.role\s*===\s*'parent'\s*\?\s*'parent'\s*:\s*'student'/.test(signup),
    'an unvalidated role would let a client name any string, including one a CHECK constraint rejects at 3am');

  const google = read('api/auth/google.js');
  assert('the Google path honours role only when it creates the account',
    /if \(!user\) \{[\s\S]{0,600}?role[\s\S]{0,200}?\.insert/.test(google)
    && !/\.update\([^)]*role/.test(google));

  const me = read('api/auth/me.js');
  assert('the profile endpoint cannot write role', !/\brole\b/.test(me.split('PATCH')[1] || ''),
    'PATCH /auth/me is the obvious place for this to leak in');

  const serialize = read('api/_lib/serializeUser.js');
  assert('serializeUser exposes role to the client', /role:/.test(serialize));
  assert('serializeUser still never exposes the password hash', !/password_hash:/.test(serialize));
}

// ── 5. The summary is an allowlist ──────────────────────────────────────────

// A snapshot with a piece of unmistakable private text in every field a parent must never see.
// Each marker is unique so a failure names exactly which one leaked.
const PRIVATE_MARKERS = {
  coachThreads: 'COACHSECRET',
  lessonNotes: 'NOTESECRET',
  lessonHighlights: 'HIGHLIGHTSECRET',
  satResponses: 'RESPONSESECRET',
  essays: 'ESSAYSECRET',
  future: 'UNKNOWNFIELDSECRET',
};

function privateSnapshot() {
  return {
    v: 1,
    user: { xp: 1200, name: 'Student', email: 'student@example.test' },
    lessons: [{ lessonId: 'l1', verified: true, completedAt: 1 }],
    quizScores: [{ quizId: 'q1', score: 80, completedAt: 2 }],
    studyDays: ['2026-01-01'],
    coachThreads: [{ key: 1, title: PRIVATE_MARKERS.coachThreads, messages: [{ role: 'user', content: PRIVATE_MARKERS.coachThreads }] }],
    lessonNotes: [{ lessonId: 'l1', text: PRIVATE_MARKERS.lessonNotes }],
    lessonHighlights: [{ lessonId: 'l1', text: PRIVATE_MARKERS.lessonHighlights }],
    satAttempts: [{ key: 1, kind: 'test', finishedAt: 3, result: { total: 1200 }, questionIds: ['x'] }],
    satResponses: [{ attemptKey: 1, questionId: PRIVATE_MARKERS.satResponses, correct: false, choice: 'B' }],
    essays: [{ text: PRIVATE_MARKERS.essays }],
    // The field nobody has written yet. An allowlist ignores it; a blocklist ships it.
    somethingAddedNextQuarter: PRIVATE_MARKERS.future,
  };
}

function checkAllowlist() {
  section('The parent summary is an allowlist, not a filter');

  const summary = buildParentSummary({
    student: { id: 'u1', name: 'Student', grade_level: '11th', email: 'student@example.test' },
    snapshot: privateSnapshot(),
    now: Date.UTC(2026, 0, 8),
  });
  const serialized = JSON.stringify(summary);

  for (const [field, marker] of Object.entries(PRIVATE_MARKERS)) {
    assert(`${field} never reaches a parent`, !serialized.includes(marker),
      `found "${marker}" in the summary`);
  }

  // The student's email is not private in the way a transcript is — the parent already has it, they
  // invited that address. It is excluded because a contact detail travelling in every poll response
  // is a detail travelling for no reason.
  assert("the student's email is not echoed in the summary", !serialized.includes('student@example.test'));

  // Per-question answers are the sharp edge of the SAT data: the aggregate score is the point of the
  // feature, and the answers are a different thing entirely.
  assert('question ids from test attempts do not travel', !/"questionIds"/.test(serialized));

  assert('the derivation is still useful (it is not empty)',
    summary.effort.xp === 1200 && summary.coursework.lessonsVerified === 1 && summary.testing?.total === 1200,
    JSON.stringify({ xp: summary.effort.xp, verified: summary.coursework.lessonsVerified, total: summary.testing?.total }));

  const lib = readFileSync(path.join(ROOT, 'api/_lib/parentSummary.js'), 'utf8');
  assert('the derivation never spreads the snapshot wholesale',
    !/\.\.\.\s*(snapshot|snap)\b/.test(lib),
    'a spread turns the allowlist back into a blocklist in one keystroke');
}

// ── 6. The derivation is correct ────────────────────────────────────────────

function checkDerivation() {
  section('Progress is derived correctly');

  const at = (y, m, d) => Date.UTC(y, m, d);
  const build = (snapshot, now) => buildParentSummary({ student: { id: 'u', name: 'S' }, snapshot, now });

  // A streak that ends yesterday still counts: the app's own streak logic has the same grace, and a
  // dashboard that disagreed with the student's screen at 00:01 would be a support ticket every
  // morning.
  const yesterdayOnly = build({ studyDays: ['2026-03-09', '2026-03-08'] }, at(2026, 2, 10));
  assert('a streak ending yesterday still counts', yesterdayOnly.effort.streakDays === 2,
    `got ${yesterdayOnly.effort.streakDays}`);

  const stale = build({ studyDays: ['2026-03-01', '2026-02-28'] }, at(2026, 2, 10));
  assert('a streak that ended a week ago is zero', stale.effort.streakDays === 0,
    `got ${stale.effort.streakDays}`);

  const gap = build({ studyDays: ['2026-03-10', '2026-03-09', '2026-03-07'] }, at(2026, 2, 10));
  assert('a gap breaks the streak rather than being counted through', gap.effort.streakDays === 2,
    `got ${gap.effort.streakDays}`);

  const calendar = build({ studyDays: ['2026-03-10'] }, at(2026, 2, 10));
  assert('the calendar is 56 days ending today', calendar.effort.calendar.length === 56
    && calendar.effort.calendar.at(-1).date === '2026-03-10'
    && calendar.effort.calendar.at(-1).active === true);

  const reviews = build({
    reviewCountsByDate: { '2026-03-10': 5, '2026-03-08': 3, '2026-01-01': 99 },
  }, at(2026, 2, 10));
  assert('review counts are windowed, not summed over all time',
    reviews.effort.cardReviewsLast7 === 8, `got ${reviews.effort.cardReviewsLast7}`);

  // "No trend yet" and "flat" are different facts about a student and the UI renders them
  // differently, so the one that means "not enough data" has to be null rather than 0.
  const fewQuizzes = build({ quizScores: [{ quizId: 'a', score: 70, completedAt: 1 }] }, at(2026, 2, 10));
  assert('a trend needs something to compare against', fewQuizzes.coursework.quizzes.trend === null,
    `got ${fewQuizzes.coursework.quizzes.trend}`);

  const manyQuizzes = build({
    quizScores: [
      ...Array.from({ length: 10 }, (_, i) => ({ quizId: `new${i}`, score: 90, completedAt: 100 + i })),
      ...Array.from({ length: 5 }, (_, i) => ({ quizId: `old${i}`, score: 60, completedAt: i })),
    ],
  }, at(2026, 2, 10));
  assert('the trend compares the last ten quizzes with everything earlier',
    manyQuizzes.coursework.quizzes.trend === 30, `got ${manyQuizzes.coursework.quizzes.trend}`);

  const improving = build({
    satAttempts: [
      { kind: 'test', finishedAt: 200, result: { total: 1300, rw: 650, math: 650 } },
      { kind: 'test', finishedAt: 100, result: { total: 1100 } },
    ],
  }, at(2026, 2, 10));
  assert('a test score reports its change from the previous one', improving.testing.change === 200,
    `got ${improving.testing.change}`);
  assert('the latest test wins regardless of array order', improving.testing.total === 1300);

  // A brand-new account must render an empty dashboard, not a broken one. Null here would have to
  // be special-cased by every caller, and one of them would forget.
  const empty = buildParentSummary({ student: { id: 'u', name: 'S' }, snapshot: null, now: at(2026, 2, 10) });
  assert('a student who has never synced yields a complete, zeroed summary',
    empty && empty.effort.xp === 0 && empty.effort.calendar.length === 56 && empty.testing === null);

  const corrupt = buildParentSummary({
    student: { id: 'u', name: 'S' },
    snapshot: { user: { xp: 'not a number' }, lessons: 'not an array', studyDays: { nope: true }, quizScores: null },
    now: at(2026, 2, 10),
  });
  assert('a malformed snapshot degrades instead of throwing',
    corrupt.effort.xp === 0 && corrupt.coursework.lessonsStarted === 0 && corrupt.effort.streakDays === 0);
}

// ── 7. The routes exist in both deployment targets ──────────────────────────

function checkRouting(files) {
  section('Parent endpoints are reachable in both deployments');

  const server = read('server.js');
  for (const file of files.filter((f) => f.startsWith('api/parent/'))) {
    const route = `/${file.replace(/^api\//, 'api/').replace(/\.js$/, '')}`;
    assert(`${route} is wired into server.js (self-hosted)`, server.includes(`'${route}'`),
      'Vercel routes these by filename; the Express server does not');
  }

  // The client must not be able to reach Supabase around the API — the whole authorization story
  // for this schema is that /api/* holds the service role and RLS denies everyone else.
  const client = read('src/lib/parentApi.js');
  assert('the parent client only ever talks to /api/parent/*',
    !/supabase/i.test(client) && /\/api\/parent/.test(client));
}

// ── Main ────────────────────────────────────────────────────────────────────

const files = handlerFiles().sort();
console.log(`Auditing ${files.length} API handlers`);

checkEveryHandlerClassified(files);
checkGuardChoice();
checkRevocationIsImmediate();
checkRoleIsWriteOnce(files);
checkAllowlist();
checkDerivation();
checkRouting(files);

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Parent dashboard verified.');
