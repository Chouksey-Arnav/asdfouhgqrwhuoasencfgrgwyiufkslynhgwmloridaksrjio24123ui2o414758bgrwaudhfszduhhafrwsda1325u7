#!/usr/bin/env node
/**
 * Guards the three lesson-delivery promises that are easy to break silently:
 *
 *   1. AUDIO — every lesson article can be listened to, not just read. A lesson
 *      whose content shape drifts (a section with no body, an article that is
 *      all headings) produces an empty narration and the audio bar quietly
 *      disappears for that lesson only, which nobody notices in review.
 *   2. LABELLING — the video step never calls itself a "verification video".
 *      Reviewers read that as "record yourself to prove you watched", which is
 *      the opposite of what the step does, and the wrong mental model is worse
 *      than no label. The step must also state its purpose.
 *   3. DIFFERENTIATION — two students with different profiles must not get an
 *      identical first-attempt verification quiz, a retry must not re-serve the
 *      attempt that just failed, and the same student must get the *same* quiz
 *      back after a refresh. All three are properties of pure functions in
 *      lib/quizPersonalization.js, so they are asserted here directly rather
 *      than trusted.
 *
 * Run by `npm run verify:lesson-delivery` (and by `npm run build`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);
const section = (name) => console.log(`\n${name}`);

// localStorage is touched by the attempt counter and the anonymous-seed
// fallback; give the module a memory-backed one so this runs under plain node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { LESSON_CONTENT } = await load('src/data/lessonContent/index.js');
const { PATHS } = await load('src/data/constants.js');
// quizzes/index.js imports its banks without file extensions (fine for Vite,
// not for node), so the four banks are composed here the same way
// scripts/auditLessonsCompleteness.mjs does it.
const ALL_QUIZZES = (await Promise.all([
  'bioBiochem', 'chemPhys', 'psychSoc', 'lessonQuizzes',
].map((f) => load(`src/data/quizzes/${f}.js`)))).flatMap((mod) => Object.values(mod)[0]);
const audio = await load('src/lib/lessonAudio.js');
const qp = await load('src/lib/quizPersonalization.js');

const app = read('src/App.jsx');
const allLessons = Object.values(PATHS).flatMap((p) => (p.units || []).flatMap((u) => u.lessons.map((l) => ({ ...l, pathway: p.label }))));

// ── 1. Audio ────────────────────────────────────────────────────────────────
section('Every lesson article is listenable');

let noSegments = 0;
let shortest = { id: null, seconds: Infinity };
for (const [id, content] of Object.entries(LESSON_CONTENT)) {
  if (!content?.article) continue;
  const lesson = allLessons.find((l) => l.id === id);
  const segments = audio.buildArticleSegments(content, lesson?.title || '');
  if (!segments.length) { fail(`${id}: article present but produces no narration segments`); noSegments += 1; continue; }
  const bodies = segments.filter((s) => s.kind === 'body');
  if (!bodies.length) fail(`${id}: narration has headings but no body prose`);
  // Every body segment must be traceable back to a rendered section so the
  // follow-along highlight can't point at a block that isn't on screen.
  for (const s of segments) {
    if ((s.kind === 'body' || s.kind === 'heading') && !content.article.sections[s.sectionIdx]) {
      fail(`${id}: segment ${s.key} references section ${s.sectionIdx}, which doesn't exist`);
    }
  }
  const seconds = audio.estimateListenSeconds(segments);
  if (seconds < shortest.seconds) shortest = { id, seconds };
}
const articleCount = Object.values(LESSON_CONTENT).filter((c) => c?.article).length;
if (!noSegments) ok(`${articleCount} lesson articles all produce narration (shortest: ${shortest.id}, ${audio.formatListenLength(shortest.seconds)})`);

// Spoken-text normalization: the abbreviations that speech engines mangle must
// not survive into narration.
const spoken = audio.speechText('Shadowing (e.g. a nurse) is ~5% of it — see Dr. Ruiz vs. the PA & the team.');
for (const bad of ['e.g.', '~', '&', 'vs.', 'Dr.', '—']) {
  if (spoken.includes(bad)) fail(`speechText left "${bad}" in narration text: ${spoken}`);
}
if (!spoken.includes('for example') || !spoken.includes('percent') || !spoken.includes('Doctor')) {
  fail(`speechText did not expand abbreviations as expected: ${spoken}`);
}
if (!failures) ok('speechText expands the abbreviations speech engines mangle');

if (!app.includes('<LessonAudioPlayer')) fail('LessonPlayer no longer renders LessonAudioPlayer — the article step is read-only again');
else ok('The article step renders the audio player');

// ── 2. The video step says what it is ───────────────────────────────────────
section('The video step is labelled as watching, not recording');

const videoStep = app.slice(app.indexOf("{step==='video'"), app.indexOf("{step==='quiz'"));
if (!videoStep) fail('Could not locate the video step in LessonPlayer');
if (/verification video/i.test(videoStep.replace(/\/\*[\s\S]*?\*\//g, ''))) {
  fail('The video step calls itself a "verification video" again — reviewers read that as "record yourself"');
} else ok('No "verification video" label in the video step');
if (!/Watch to reinforce/.test(videoStep)) fail('The video step lost its "Watch to reinforce" heading');
else ok('Video step heading states the action ("Watch to reinforce")');
if (!/helps it stick/i.test(videoStep)) fail('The video step lost its one-line explanation of why the video is there');
else ok('Video step explains its purpose in one line');
if (!/[Nn]othing is recorded/.test(videoStep)) fail('The video step no longer says nothing is being recorded');
else ok('Video step says outright that nothing is recorded');

// ── 3. Verification quizzes differentiate ───────────────────────────────────
section('Verification quizzes differ per student and per attempt');

const withBanks = allLessons.filter((l) => (l.quizIds || []).some((id) => ALL_QUIZZES.some((q) => q.id === id)));
if (!withBanks.length) fail('No lesson has a resolvable quiz bank — nothing to verify');

const studentA = { email: 'a@example.com', gpaBand: 'mostly_a', sciences: ['ap_bio', 'ap_chem'], gradeStage: 'senior', certainty: 'all_in', healthExperience: ['shadowing'] };
const studentB = { email: 'b@example.com', gpaBand: 'below_b', sciences: ['none_yet'], gradeStage: 'freshman', certainty: 'exploring', healthExperience: ['none'] };

const qsOf = (quiz) => (quiz?.qs || []).map((q) => q.q).join('|');

let differing = 0;
let poolLessons = 0;
for (const lesson of withBanks) {
  const a = qp.buildVerificationQuiz(lesson, ALL_QUIZZES, { user: studentA, pathwayKey: 'physician', attempt: 0 });
  const b = qp.buildVerificationQuiz(lesson, ALL_QUIZZES, { user: studentB, pathwayKey: 'nursing', attempt: 0 });
  if (!a || !b) { fail(`${lesson.id}: no quiz built despite having a bank`); continue; }

  // Determinism: the same inputs must rebuild the identical quiz, or a refresh
  // mid-attempt silently swaps the questions under the student.
  const again = qp.buildVerificationQuiz(lesson, ALL_QUIZZES, { user: studentA, pathwayKey: 'physician', attempt: 0 });
  if (qsOf(a) !== qsOf(again)) fail(`${lesson.id}: rebuilding the same student's attempt produced a different quiz`);

  // A retry must not be the same paper the student just failed.
  const retry = qp.buildVerificationQuiz(lesson, ALL_QUIZZES, { user: studentA, pathwayKey: 'physician', attempt: 1 });
  if (qsOf(retry) === qsOf(a)) fail(`${lesson.id}: attempt 2 serves the identical question set as attempt 1`);

  // Answer keys must survive the choice re-ordering.
  for (const q of a.qs) {
    if (!(q.ans >= 0 && q.ans < q.ch.length)) fail(`${lesson.id}: shuffled question has an out-of-range answer index`);
  }

  const pool = ALL_QUIZZES.find((q) => q.id === a.personalization.bankId)?.qs?.length || 0;
  if (pool > qp.VERIFY_QUIZ_SIZE || (lesson.quizIds || []).length > 1) {
    poolLessons += 1;
    if (qsOf(a) === qsOf(b)) fail(`${lesson.id}: two different students get an identical first-attempt quiz from a ${pool}-question pool`);
    else differing += 1;
  }
}
if (poolLessons) ok(`${differing}/${poolLessons} lessons with room to differentiate serve two profiles different first-attempt questions`);
ok(`${withBanks.length} lessons build a deterministic, retry-varying verification quiz`);

// The pass bar is explicitly NOT personalized — a verified lesson has to mean
// the same thing for everyone.
if (qp.VERIFY_PASS_PCT !== 70) fail(`Pass threshold moved to ${qp.VERIFY_PASS_PCT}% — intentional? Verified lessons gate mastery.`);
const levels = [studentA, studentB, {}].map((u) => qp.challengeLevel(u));
if (levels.some((l) => l < 0 || l > 1)) fail('challengeLevel escaped the 0–1 range');
if (!(levels[0] > levels[1])) fail('challengeLevel does not rank a senior with AP sciences above a freshman with none');
else ok('Profile signals rank students sensibly, and the 70% bar is identical for all of them');

if (!app.includes('buildVerificationQuiz(lesson,ALL_QUIZZES')) {
  fail('openVerifyQuiz no longer routes through buildVerificationQuiz — every student is back on the same quiz');
} else ok('openVerifyQuiz builds the per-student quiz');

console.log(failures ? `\n${failures} lesson-delivery check(s) failed.\n` : '\nLesson delivery OK.\n');
process.exit(failures ? 1 : 0);
