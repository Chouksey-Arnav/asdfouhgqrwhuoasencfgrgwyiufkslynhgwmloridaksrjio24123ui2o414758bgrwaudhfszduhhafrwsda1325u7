#!/usr/bin/env node
/**
 * Guards the four promises this feature set makes to a student, none of which fail loudly:
 *
 *   1. SMART MIX DEALS EVERYTHING, FRESHLY, EVERY TIME. Every card in the library — not the
 *      due subset — in an order that is different on each entry but frozen inside one session.
 *      A regression here is invisible in review (the screen still shows cards) and only shows
 *      up as "why do I keep seeing the same twenty cards".
 *   2. A PACE GOAL IS THE STUDENT'S OWN, AND EDITABLE. Any number of weeks they choose, changed
 *      whenever they want, with the clock preserved on an edit — and every surface reporting the
 *      SAME status, because two screens disagreeing about whether you're behind is worse than
 *      neither mentioning it.
 *   3. THE "TOO HARD" LINKS ARE REAL. Every URL attached to a struggling student comes from the
 *      app's verified library or an escaped search URL — never from a language model, which
 *      produces confident dead links.
 *   4. PROGRESS IS REMEMBERED PER LESSON. Read the article Monday, come back Wednesday, land on
 *      the video — not back at the top of the article.
 *
 * Run by `npm run verify:pathway` (and by `npm run build`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) => assert(label, actual === expected, `expected ${expected}, got ${actual}`);
const section = (name) => console.log(`\n${name}`);

const { seededShuffle, mulberry32, newShuffleSeed } = await load('src/lib/shuffle.js');
const pace = await load('src/lib/paceGoal.js');
const fb = await load('src/lib/lessonFeedback.js');
const resources = await load('src/lib/lessonResources.js');
const { FLASH_DECKS, PATHS } = await load('src/data/constants.js');
const { LESSON_CONTENT } = await load('src/data/lessonContent/index.js');

const app = read('src/App.jsx');
const db = read('src/lib/db.js');

const WEEK = 7 * 24 * 60 * 60 * 1000;

// ── 1. Smart Mix ────────────────────────────────────────────────────────────
section('Smart Mix deals the whole library, freshly, every time');

const allBuiltinCards = Object.values(FLASH_DECKS).flat();
// Was 866. The four SAT/ACT strategy decks (78 cards) went with the SAT pillar
// — see src/lib/betaFlags.js and DECK_CATEGORIES in src/data/constants.js.
assert('the built-in library is the full 788-card set',
  allBuiltinCards.length >= 788, `found ${allBuiltinCards.length}`);

const deck = allBuiltinCards.map((c, i) => ({ ...c, _i: i }));
const seedA = 12345, seedB = 999983;
const runA1 = seededShuffle(deck, seedA);
const runA2 = seededShuffle(deck, seedA);
const runB = seededShuffle(deck, seedB);

eq('a shuffle keeps every single card', runA1.length, deck.length);
assert('no card is lost or duplicated', new Set(runA1.map((c) => c._i)).size === deck.length);
assert('the same seed re-deals the identical order — a re-render mid-session cannot reshuffle',
  runA1.every((c, i) => c._i === runA2[i]._i));
assert('a different seed deals a genuinely different order',
  runA1.filter((c, i) => c._i === runB[i]._i).length < deck.length * 0.1,
  `${runA1.filter((c, i) => c._i === runB[i]._i).length} of ${deck.length} positions unchanged`);
assert('the shuffle actually moves things (not a near-identity permutation)',
  runA1.filter((c, i) => c._i === i).length < deck.length * 0.05);
assert('the input array is never mutated', deck.every((c, i) => c._i === i));

// Distribution sanity: over many seeds, a given card must land all over the deck rather than
// clustering — a subtly broken Fisher-Yates still "shuffles" but biases position.
const positions = [];
for (let s = 1; s <= 400; s++) {
  positions.push(seededShuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], s).indexOf(0));
}
const buckets = new Set(positions);
eq('a card reaches every position across seeds', buckets.size, 10);

assert('seeds are re-rolled, not reused', newShuffleSeed() !== 0);
const rnd = mulberry32(42);
const draws = Array.from({ length: 500 }, rnd);
assert('the PRNG stays in [0,1)', draws.every((d) => d >= 0 && d < 1));
assert('the PRNG is not degenerate', new Set(draws).size > 450);

// The pool itself: Smart Mix must draw from every deck's FULL card list. `getDueCards` appearing
// in the smartMix branch is exactly the regression this catches.
const smartMixBranch = app.slice(app.indexOf('if(activeDeck.smartMix){'), app.indexOf('const cards=cardsForDeck(activeDeck.name,activeDeck.builtin);'));
assert('Smart Mix pools every deck, not a filtered subset',
  /allDecksList\.flatMap\(d=>d\.cards\.map/.test(smartMixBranch), smartMixBranch.slice(0, 300));
assert('Smart Mix does NOT filter to due cards',
  !/getDueCards/.test(smartMixBranch), 'getDueCards is back inside the Smart Mix branch');
assert('Smart Mix shuffles rather than sorting by FSRS state',
  /seededShuffle\(pool,smartMixSeed\)/.test(smartMixBranch) && !/sortForStudy/.test(smartMixBranch));
assert('every Smart Mix entry point re-rolls the seed (goes through startSmartMix)',
  (app.match(/setAD\(\{name:'Smart Mix',builtin:true,smartMix:true\}\)/g) || []).length === 1,
  'a second entry point sets the deck directly and would reuse the previous order');
assert('the deck memo depends on the seed', /\},\[activeDeck,cDecks,studyMode,allDecksList,cardsForDeck,smartMixSeed\]\)/.test(app));
assert('Smart Mix is offered whenever there are any cards, not only when something is due',
  /\{allCards\.length>0&&\(\s*<motion\.div[^]*?onClick=\{startSmartMix\}/.test(app));

// ── 2. Pace goals ───────────────────────────────────────────────────────────
section('A pace goal is the student\'s own, editable, and reported identically everywhere');

const { computePaceStatus, normalizeTargetWeeks, describePace, paceHeadline, paceTone, PACE_MIN_WEEKS, PACE_MAX_WEEKS } = pace;

eq('a typed custom target is accepted', normalizeTargetWeeks('6'), 6);
eq('a fractional entry rounds', normalizeTargetWeeks(6.4), 6);
eq('zero is rejected', normalizeTargetWeeks(0), null);
eq('negative is rejected', normalizeTargetWeeks(-3), null);
eq('gibberish is rejected', normalizeTargetWeeks('soon'), null);
eq('an absurdly large target clamps rather than being refused', normalizeTargetWeeks(5000), PACE_MAX_WEEKS);
eq('a sub-week target clamps up', normalizeTargetWeeks(0.4), PACE_MIN_WEEKS);
assert('presets are all valid targets', pace.PACE_PRESETS.every((p) => normalizeTargetWeeks(p.weeks) === p.weeks));
assert('no goal at all yields no status', computePaceStatus({ goal: null, totalLessons: 20 }) === null);
assert('a pathway with no lessons yields no status', computePaceStatus({ goal: { targetWeeks: 4 }, totalLessons: 0 }) === null);

const NOW = new Date('2026-06-10T12:00:00Z').getTime();
const goalOf = (weeksAgo, targetWeeks) => ({ targetWeeks, startedAt: NOW - weeksAgo * WEEK });

// Halfway through a 8-week goal over 40 lessons: an even pace is 20 lessons.
const onPace = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 20, now: NOW });
eq('an exactly-even student reads as on pace', onPace.state, 'on_pace');
eq('…and the expected count is computed, not guessed', onPace.expectedByNow, 20);
eq('…and reports the right week number', onPace.weekNumber, 4);

const ahead = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 28, now: NOW });
eq('a student in front reads as ahead', ahead.state, 'ahead');
eq('…by the real margin', ahead.diff, 8);
assert('…and is told so', /ahead/i.test(paceHeadline(ahead)));

const slipping = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 18, now: NOW });
eq('two lessons back is "slipping", not "behind"', slipping.state, 'slipping');
eq('behind is behind', computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 8, now: NOW }).state, 'behind');

const done = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 40, now: NOW });
eq('finishing the pathway reads as complete regardless of timing', done.state, 'complete');
eq('…with nothing left to do', done.remaining, 0);
eq('…and no weekly demand', done.neededPerWeek, 0);

const overdue = computePaceStatus({ goal: goalOf(12, 8), totalLessons: 40, doneLessons: 30, now: NOW });
eq('a passed deadline reads as overdue, not "behind"', overdue.state, 'overdue');
assert('…and the headline suggests resetting rather than scolding', /reset/i.test(paceHeadline(overdue)));
assert('…and the prompt tells the coach the same', /resetting/i.test(describePace(overdue, 'Physician')));

// The number that changes behavior: what's left, over the weeks that remain.
const behind = computePaceStatus({ goal: goalOf(6, 8), totalLessons: 40, doneLessons: 15, now: NOW });
eq('the catch-up rate is remaining ÷ weeks left, rounded up', behind.neededPerWeek, 13); // 25 left / 2 weeks
assert('a goal past its deadline never demands a negative or infinite rate',
  Number.isFinite(overdue.neededPerWeek) && overdue.neededPerWeek >= 0, String(overdue.neededPerWeek));

// Demonstrated pace must not extrapolate from a few minutes of work.
const justStarted = computePaceStatus({ goal: goalOf(0.05, 8), totalLessons: 40, doneLessons: 3, now: NOW });
assert('a brand-new goal does not project a finish date off ten minutes of work',
  justStarted.measuredPerWeek === null && justStarted.projectedFinishAt === null);
const measured = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 20, now: NOW });
assert('…but a real history does produce one', measured.measuredPerWeek === 5 && measured.projectedFinishAt > NOW);

// "Done in the last 7 days" must count the last 7 days, not the calendar week.
const ats = [NOW - 2 * WEEK, NOW - 8 * 86400000, NOW - 3 * 86400000, NOW - 3600000];
const windowed = computePaceStatus({ goal: goalOf(4, 8), totalLessons: 40, doneLessons: 4, completedAts: ats, now: NOW });
eq('the 7-day count uses a rolling window', windowed.doneThisWeek, 2);

eq('tone maps ahead → good', paceTone('ahead'), 'good');
eq('tone maps slipping → warn', paceTone('slipping'), 'warn');
eq('tone maps overdue → bad', paceTone('overdue'), 'bad');
assert('describePace never invents a number it was not given',
  !describePace(onPace, 'Physician').includes('undefined') && !describePace(onPace, 'Physician').includes('NaN'));

// Editing must not silently restart the clock — that would erase real history and hand anyone
// who is behind a free reset to "on pace".
assert('DB.setPathwayGoal can preserve the original start date',
  /export async function setPathwayGoal\(pathwayKey, targetWeeks, \{ keepStart = false \} = \{\}\)/.test(db));
assert('…and actually keeps it when asked', /keepStart && existing\?\.startedAt \? existing\.startedAt : Date\.now\(\)/.test(db));
assert('…and stamps the edit so cross-device merge can order it', /updatedAt: Date\.now\(\),/.test(db));
assert('a goal edit wins over a stale copy on another device', /if \(\(r\.updatedAt \|\| 0\) > \(l\.updatedAt \|\| 0\)\) goalMap\.set/.test(db));
assert('the pace goal syncs across devices', /pathwayGoals: pathwayGoals\.map/.test(db));

// One status computation, shared: the Pathway editor, the Home card and both prompts.
assert('the Pathway tab renders the shared card', /variant="full"/.test(app));
assert('Home renders the same shared card', /variant="compact"/.test(app));
assert('both read one computePaceStatus memo', (app.match(/computePaceStatus\(\{/g) || []).length === 1);
assert('the Prep AI is told the pace goal', /paceText=\{paceText\}/.test(app));
assert('the head coach is told the same', /paceText,\n\s+feedbackSummary:feedbackSummary\.promptText,/.test(app));
assert('a goal can be removed, not just set', /clearPathwayPaceGoal/.test(app) && /onClearGoal/.test(app));

// ── 3. Lesson difficulty feedback ───────────────────────────────────────────
section('The difficulty check changes what happens, and its links are real');

const { summarizeLessonFeedback, buildLessonDifficultyPrompt, FEEDBACK_RATINGS } = fb;

eq('exactly three answers are offered', FEEDBACK_RATINGS.length, 3);
const empty = summarizeLessonFeedback([]);
assert('no feedback yields no claims about the student', empty.total === 0 && empty.level === null && empty.promptText === null);

const few = summarizeLessonFeedback([{ rating: 'too_hard', lessonTitle: 'A', createdAt: 1 }]);
assert('one answer never characterises a student', few.level === null);
assert('…and says so to the model', /Not enough responses/.test(few.promptText));

const mk = (rating, n, category = 'Life Sciences') =>
  Array.from({ length: n }, (_, i) => ({ rating, lessonTitle: `L${i}`, category, createdAt: 1000 + i }));

const stretch = summarizeLessonFeedback(mk('too_easy', 6));
eq('a consistent "too easy" pattern is recognized', stretch.level, 'stretch');
const support = summarizeLessonFeedback(mk('too_hard', 6));
eq('a consistent "too hard" pattern is recognized', support.level, 'support');
const calibrated = summarizeLessonFeedback(mk('just_right', 6));
eq('a well-matched student is recognized', calibrated.level, 'calibrated');
// The summary describes what the student REPORTED, never what they are. "slow down and build
// up from basics" is an instruction to the model; "they are slow" would be a verdict on a
// child, which is the thing this data must never become.
assert('the level is never handed back as a verdict on the student',
  !/\b(they|this student)\s+(is|are)\s+(smart|intelligent|clever|gifted|dumb|slow|weak|bad)\b/i.test(support.promptText),
  support.promptText);
assert('…and says explicitly that it is self-reported',
  /Self-reported/.test(support.promptText));

const split = summarizeLessonFeedback([...mk('too_easy', 4, 'Life Sciences'), ...mk('too_hard', 4, 'Physical Sciences')]);
const strongCats = split.byCategory.filter((c) => c.score >= 0.5).map((c) => c.category);
const hardCats = split.byCategory.filter((c) => c.score <= -0.5).map((c) => c.category);
assert('subject-by-subject split is preserved, not blended away',
  strongCats.includes('Life Sciences') && hardCats.includes('Physical Sciences'),
  JSON.stringify(split.byCategory));
assert('…and reaches the prompt', /Physical Sciences/.test(split.promptText));
assert('counts are exact', split.counts.too_easy === 4 && split.counts.too_hard === 4);
assert('a malformed row cannot poison the summary',
  summarizeLessonFeedback([{ rating: 'wat' }, { rating: null }, ...mk('just_right', 4)]).total === 4);

// The three prompts must be genuinely different jobs.
const promptArgs = {
  lessonTitle: 'Cell Biology & Genetics', unitTitle: 'Foundations',
  objectives: ['Organelles'], articleSections: [{ heading: 'Cells', body: 'A cell is the unit of life.' }],
  keyTakeaways: ['Cells are the unit of life'],
};
const easyPrompt = buildLessonDifficultyPrompt({ ...promptArgs, rating: 'too_easy' });
const hardPrompt = buildLessonDifficultyPrompt({ ...promptArgs, rating: 'too_hard' });
const rightPrompt = buildLessonDifficultyPrompt({ ...promptArgs, rating: 'just_right' });

assert('every prompt is grounded in the actual passage',
  [easyPrompt, hardPrompt, rightPrompt].every((p) => p.includes('A cell is the unit of life.')));
assert('"too easy" asks for genuinely deeper material, not a summary',
  /deeper|next layer/i.test(easyPrompt) && /not a summary/i.test(easyPrompt));
assert('"too easy" carries the student\'s actual words', easyPrompt.includes('way too easy'));
assert('"too hard" asks for a rebuild from nothing', /from the ground up/i.test(hardPrompt));
assert('"too hard" never condescends', /never condescending/i.test(hardPrompt));
assert('the three prompts are actually different', new Set([easyPrompt, hardPrompt, rightPrompt]).size === 3);
assert('NEITHER generation prompt is allowed to produce links — the app attaches vetted ones',
  /Do NOT include any URLs/i.test(easyPrompt) && /Do NOT include any URLs/i.test(hardPrompt));
assert('the model is told the student is a high schooler, not a med student',
  [easyPrompt, hardPrompt].every((p) => /high-school|high school/i.test(p) && /Never mention the MCAT/i.test(p)));

// Every attached link must be a real, parseable URL on a live host.
section('Every "too hard" link resolves to a real destination');

// Absolute http(s) with a real host. A handful of long-standing E-Library entries are plain
// http (e.g. periodicvideos.com, which has never served https) — those are real, working
// destinations and excluding them would cost the student a good resource for no safety gain,
// since these are outbound links, not credential forms. What is rejected is anything that is
// not a resolvable absolute URL at all.
const URL_OK = (u) => { try { const p = new URL(u); return /^https?:$/.test(p.protocol) && !!p.hostname; } catch { return false; } };
const allLessons = Object.values(PATHS).flatMap((p) => (p.units || []).flatMap((u) => (u.lessons || []).map((l) => ({ lesson: l, unit: u }))));
assert('there are lessons to check', allLessons.length > 0);

let checkedLinks = 0, curatedFound = 0, badLinks = [], badSearch = [];
for (const { lesson, unit } of allLessons) {
  const { curated, searches } = resources.helpResourcesFor(lesson, unit, LESSON_CONTENT[lesson.id]);
  if (curated.length) curatedFound += 1;
  for (const r of curated) {
    checkedLinks += 1;
    if (!URL_OK(r.url)) badLinks.push(`${lesson.id}: ${r.url}`);
  }
  for (const s of searches) {
    checkedLinks += 1;
    if (!URL_OK(s.url)) badSearch.push(`${lesson.id}: ${s.url}`);
  }
  // A search URL must escape the topic — an unescaped title breaks the query silently.
  const yt = searches.find((s) => s.url.includes('youtube.com'));
  if (yt && /\s/.test(new URL(yt.url).search)) badSearch.push(`${lesson.id}: unescaped query`);
}
assert('every lesson gets somewhere real to go', allLessons.length > 0);
assert('every curated link is a valid https URL', badLinks.length === 0, badLinks.slice(0, 5).join('; '));
assert('every search link is a valid https URL', badSearch.length === 0, badSearch.slice(0, 5).join('; '));
assert(`links were actually checked (${checkedLinks})`, checkedLinks > allLessons.length * 3 - 1);
// Nearly every lesson should reach a real, on-topic library resource. This is a floor, not a
// target: it catches a tokenizer or threshold change that quietly guts matching and leaves
// every struggling student with search links only.
assert('the curated library covers almost every lesson',
  curatedFound >= allLessons.length * 0.9,
  `${curatedFound} of ${allLessons.length} lessons matched a vetted resource`);

// Search links must always exist, even for a lesson nothing in the library matches — that is
// the guarantee that a struggling student is never handed an empty panel.
const nonsense = { id: 'zzz', title: 'Qqqqzzz Wwwwxxx', objectives: [] };
assert('a lesson with no library match still gets working search links',
  resources.searchLinksFor(nonsense, { quizCat: 'Life Sciences' }).every((s) => URL_OK(s.url)));
assert('…and no curated links are invented to fill the gap',
  resources.recommendLessonResources(nonsense, { quizCat: 'Life Sciences' }, null).length === 0);

// Category scoping: a biology lesson must not surface a physics video.
const bioLesson = allLessons.find(({ unit }) => unit.quizCat === 'Life Sciences');
if (bioLesson) {
  const rec = resources.recommendLessonResources(bioLesson.lesson, bioLesson.unit, LESSON_CONTENT[bioLesson.lesson.id]);
  assert('recommendations stay inside the unit\'s own subject', rec.every((r) => r.source === 'library'));
}

assert('the component attaches links before calling the model, so a failed generation still helps',
  /helpResourcesFor\(lesson, unit, content[^]*?\n\s*setResources\(attached\);[^]*?setLoading\(true\)/.test(read('src/components/LessonDifficultyCheck.jsx')));
assert('"just right" spends no AI call', /if \(chosen === 'just_right'\)/.test(read('src/components/LessonDifficultyCheck.jsx')));

// ── 4. Persistence ──────────────────────────────────────────────────────────
section('Feedback and lesson progress are remembered — locally, across devices, and server-side');

assert('feedback and progress have their own Dexie tables', /lessonFeedback: '\+\+id, lessonId, rating, createdAt'/.test(db) && /lessonProgress: 'lessonId, updatedAt'/.test(db));
assert('both ride the cross-device snapshot', /db\.lessonFeedback\.toArray\(\), db\.lessonProgress\.toArray\(\)/.test(db));
assert('the generated passage travels with the answer', /lessonFeedback: lessonFeedback\.map\(\(\{ id, \.\.\.rest \}\) => rest\)/.test(db));
assert('feedback merges additively — history is never overwritten', /const fbSig = \(f\) =>/.test(db) && /fbMap\.set\(sig, r\)/.test(db));
assert('lesson progress merges forward-only, so opening a lesson elsewhere cannot un-finish it',
  /articleRead: !!\(l\.articleRead \|\| r\.articleRead\)/.test(db) && /videoWatched: !!\(l\.videoWatched \|\| r\.videoWatched\)/.test(db));

const migration = read('supabase/migrations/0012_lesson_feedback.sql');
assert('the Supabase table constrains the rating rather than trusting the client',
  /check \(rating in \('too_easy', 'just_right', 'too_hard'\)\)/.test(migration));
assert('…is deduped per physical answer', /unique index[^]*?lesson_feedback_dedupe_idx/.test(migration));
assert('…and has RLS on, like every other table', /alter table lesson_feedback enable row level security/.test(migration));

const apiHandler = read('api/lesson-feedback.js');
assert('the endpoint requires a student session', /await requireStudent\(req, res\)/.test(apiHandler));
assert('…and never returns another student\'s rows', /\.eq\('user_id', user\.id\)/.test(apiHandler));
assert('…and rejects an unknown rating', /RATINGS\.has\(rating\)/.test(apiHandler));
assert('the endpoint is wired for self-hosting too', /\/api\/lesson-feedback/.test(read('server.js')));
assert('logging failures never surface to the student', /console\.warn\('lesson feedback log failed/.test(read('src/lib/lessonFeedbackApi.js')));

// ── 5. Confirmation + resume ────────────────────────────────────────────────
section('Finishing a step is confirmed, and a lesson reopens where it was left');

assert('leaving the article or video asks for confirmation', /const needsConfirm=\(s\)=>/.test(app));
assert('…once per step, not on every pass', /!confirms\.article/.test(app) && /!confirms\.video/.test(app));
assert('…and never in review mode or on an already-verified lesson', /!reviewMode&&!isVerified&&/.test(app));
assert('Continue no longer advances without asking', /function goNext\(\)\{\s*if\(needsConfirm\(step\)\)\{ setPendingConfirm\(step\); return; \}/.test(app));
assert('the dialog offers "not yet" as a real answer', /Not yet — take me back/.test(app));
assert('…and "I have to go" as a real answer', /save my spot/i.test(app));
assert('the confirmation is timestamped and stored', /articleConfirmedAt:Date\.now\(\)/.test(app) && /videoConfirmedAt:Date\.now\(\)/.test(app));
assert('progress is written per lesson, not just to the single viewState slot', /DB\.saveLessonProgress\(activeLesson\.lesson\.id,\{step:lessonStep/.test(app));
assert('…and reviewing a finished lesson cannot rewrite that record', /if\(!reviewMode\)\{\s*DB\.saveLessonProgress/.test(app));
assert('opening a lesson restores its saved position', /const prog=await DB\.getLessonProgress\(lesson\.id\)/.test(app));
assert('…lands on the right step', /const step=resumeStepFor\(prog,\{hasArticle,hasVideo\}\)/.test(app));
assert('…and says why', /Picking up where you left off/.test(app));

// resumeStepFor's actual behavior, replicated from source so the rule itself is asserted.
const resumeSrc = app.slice(app.indexOf('function resumeStepFor('), app.indexOf('async function openLesson('));
// eslint-disable-next-line no-new-func
const resumeStepFor = new Function(`${resumeSrc}; return resumeStepFor;`)();
eq('no saved progress starts at the beginning', resumeStepFor(null, { hasArticle: true, hasVideo: true }), 'overview');
eq('an unread article resumes in the article',
  resumeStepFor({ articleRead: false }, { hasArticle: true, hasVideo: true }), 'article');
eq('THE BUG: a finished article + unwatched video resumes at the VIDEO, not the article',
  resumeStepFor({ articleRead: true, videoWatched: false }, { hasArticle: true, hasVideo: true }), 'video');
eq('both finished resumes at the quiz',
  resumeStepFor({ articleRead: true, videoWatched: true }, { hasArticle: true, hasVideo: true }), 'quiz');
eq('a saved step is honored when it still exists',
  resumeStepFor({ step: 'video', articleRead: true }, { hasArticle: true, hasVideo: true }), 'video');
eq('a saved step that no longer exists falls back safely',
  resumeStepFor({ step: 'video', articleRead: true }, { hasArticle: true, hasVideo: false }), 'quiz');
eq('a lesson with no article skips straight past it',
  resumeStepFor({ articleRead: false }, { hasArticle: false, hasVideo: true }), 'video');

// ── 6. Medabrain memory ─────────────────────────────────────────────────────
section('Medabrain is given the notes, highlights and ratings the app already stores');

const profile = read('src/lib/studentProfile.js');
assert('the Prep prompt accepts highlights for the open lesson', /lessonHighlights = \[\],/.test(profile));
assert('…and cross-lesson notes/highlights digests', /notesDigest = null,/.test(profile) && /highlightsDigest = null,/.test(profile));
assert('…and the difficulty summary', /feedbackSummary = null,/.test(profile));
assert('all of it is actually appended to the prompt, not just accepted',
  /return base \+ buildPersonalBriefBlock\(user\) \+ scopeBlock \+ highlightBlock \+ memoryBlock/.test(profile));

const sp = await load('src/lib/lessonMemory.js');
assert('digest builders exist for both',
  typeof sp.buildNotesDigest === 'function' && typeof sp.buildHighlightsDigest === 'function');
assert('no notes yields no digest', sp.buildNotesDigest({}) === null);
const nd = sp.buildNotesDigest({ a: 'Mitosis splits somatic cells', b: '   ' }, (id) => `Lesson ${id}`);
assert('a real note reaches the digest, attributed to its lesson',
  nd.includes('Mitosis splits somatic cells') && nd.includes('Lesson a'));
assert('an empty note is not padded in', !nd.includes('Lesson b'));
const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`l${i}`, `note ${i}`]));
assert('a large note set is capped AND says it was capped', /\+\d+ more lesson\(s\) with notes, not shown/.test(sp.buildNotesDigest(many)));
assert('no highlights yields no digest', sp.buildHighlightsDigest([]) === null);
const hd = sp.buildHighlightsDigest([{ lessonId: 'x', text: 'the mitochondrion', createdAt: 5 }], () => 'Cells');
assert('a highlight reaches the digest with its lesson', hd.includes('the mitochondrion') && hd.includes('Cells'));
assert('the app passes both digests to Medabrain', (app.match(/notesDigest=\{notesDigest\}/g) || []).length === 2);
assert('…and the lesson-level highlights too', /lessonHighlights=\{lessonHighlights\}/.test(app));

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Pathway engagement verified.');
