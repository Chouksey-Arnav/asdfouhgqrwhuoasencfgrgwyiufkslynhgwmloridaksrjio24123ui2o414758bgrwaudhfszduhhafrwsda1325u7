// ─────────────────────────────────────────────────────────────────────────────
// The Plans tab's "master plan" generator — Medabrain's deepest, most expensive
// generation in the app. Where planGenerator.js builds ONE short onboarding
// summary, this builds a full, long-horizon, day-by-day roadmap grounded in
// every real resource MedSchoolPrep actually has (pathway units, the quiz
// library, flashcard decks, the E-Library, and every Portfolio tool) — and
// keeps extending itself as the student works through it.
//
// Routes through purpose:'masterplan' (api/groq.js), which uses Oracle
// (openai/gpt-oss-120b on Groq) — the largest-context, largest-max-output,
// Structured-Outputs-capable model Groq hosts, run with reasoning_effort so it
// actually thinks before answering. Chosen deliberately over Groq's other
// current options: Kimi K2 caps completions at 8,192 tokens (too small for a
// multi-week structured plan) and costs ~7x more per output token; Oracle's
// 32,768-token ceiling and $0.15/$0.75-per-M pricing is what makes a genuinely
// deep, multi-call plan generation both reliable and cheap enough to run per
// student, more than once, without hesitation.
//
// ── Why a roadmap + rolling day-by-day window, not one giant blob ──────────
// A truly "every single day" plan spanning months would be tens of thousands
// of JSON tokens — past what any single completion should attempt reliably,
// slow to generate, and mostly wasted (a plan for four months from now should
// adapt to what actually happened between now and then, not be locked in
// today). So generation is split in two:
//   1. generateRoadmap() — ONE call producing the durable "spine": phases,
//      milestones, and a compact one-line theme for EVERY week across the
//      whole horizon (so the plan still feels complete end-to-end).
//   2. generateDayChunk() — small calls (one term at a time) that explode the
//      NEAR-TERM window into real day-by-day tasks, referencing real app
//      resources. The window rolls forward as the student works through it
//      (see needsExtension/extendMasterPlan) — which is also how this plan
//      "keeps planning" over time instead of going stale the day it's made.
// This also keeps the stored plan small: the synced user snapshot has a
// shared 2MB ceiling (see api/progress-sync.js), so only a rolling ~2-3 weeks
// of full day detail is ever kept; older days are compacted into progressLog.
//
// Every generation call ALWAYS resolves to a complete, usable result — never
// throws, never returns a partial shape the UI has to defensively guard
// against — via the same "repair per-field from a deterministic fallback"
// pattern planGenerator.js established for the onboarding plan.
// ─────────────────────────────────────────────────────────────────────────────
import { PATHS, GRADE_STAGES, DECK_CATEGORY_ORDER, FLASH_DECKS } from '../data/constants';
import { ALL_QUIZZES } from '../data/quizzes/index';
import { ELIB } from '../data/elib';
import {
  GOAL_OPTIONS, OBSTACLE_OPTIONS, STUDY_METHOD_OPTIONS, ACCOMPLISH_OPTIONS,
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS,
  SCIENCE_OPTIONS, EXPERIENCE_OPTIONS, TEST_TIMELINE_OPTIONS,
} from '../components/onboarding/Onboarding';
import { deriveLoad } from './planGenerator';

const labelOf = (opts, v) => opts.find(o => o.value === v)?.label || null;
const labelsOf = (opts, arr) => (arr || []).map(v => labelOf(opts, v)).filter(Boolean);

// ── Date helpers ──────────────────────────────────────────────────────────────
// Always work in local-calendar YYYY-MM-DD strings (never toISOString(), which
// is UTC and can silently shift a date by a day) — same convention already
// used by DeadlinesPanel/PortfolioTimeline (`new Date(dateStr+'T00:00:00')`).
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function todayStr() { return fmtDate(new Date()); }
function addDaysStr(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return fmtDate(d); }
function weekdayIdx(dateStr) { return new Date(dateStr + 'T00:00:00').getDay(); }
function daysBetween(aStr, bStr) { return Math.round((new Date(bStr + 'T00:00:00') - new Date(aStr + 'T00:00:00')) / 86400000); }

function gradeIdxFromStage(stage) {
  const idx = GRADE_STAGES.findIndex(g => g.key === stage);
  return idx >= 0 ? idx : 2;
}

// How many weeks the roadmap should span. A set test date drives it directly;
// otherwise grade stage stands in for "how much runway does this student have"
// — a freshman gets a longer horizon than a senior, capped to something a
// human advisor would actually plan (never a multi-year mega-roadmap).
export function computeHorizonWeeks(user) {
  if (user?.examDate) {
    const days = daysBetween(todayStr(), user.examDate);
    if (days > 0) return Math.min(40, Math.max(6, Math.ceil(days / 7)));
  }
  const byGrade = [28, 24, 20, 16, 16]; // freshman, sophomore, junior, senior, gap
  return byGrade[gradeIdxFromStage(user?.gradeStage)] ?? 20;
}
function clampPhaseCount(horizonWeeks) { return Math.min(6, Math.max(3, Math.round(horizonWeeks / 5))); }

// ── Resource catalog — the real grounding for "every single resource" ─────────
// Deliberately compact (full detail for the student's OWN pathway's 3 units;
// counts + category names for everything else) so the model has concrete,
// real, nameable things to reference without the prompt ballooning to include
// all 90 lessons / 342 quizzes / ~576 library entries in the app.
export function buildResourceCatalog(specialtyKey) {
  const path = PATHS[specialtyKey] || PATHS.exploring;
  const unitTitles = path.units.map(u => u.title);
  const unitLines = path.units
    .map(u => `  • ${u.title} (quiz category: ${u.quizCat}) — lessons: ${u.lessons.map(l => l.title).join(', ')}`)
    .join('\n');
  const quizCatCounts = {};
  for (const q of ALL_QUIZZES) quizCatCounts[q.cat] = (quizCatCounts[q.cat] || 0) + 1;
  const quizCats = Object.keys(quizCatCounts);
  const quizLine = Object.entries(quizCatCounts).map(([c, n]) => `${c} (${n})`).join(', ');
  // A per-category sample of REAL quiz titles so the model can name an exact quiz
  // (which the deep-link resolver then matches to a launchable quiz id) instead
  // of inventing plausible-sounding but nonexistent practice sets.
  const quizSampleLines = quizCats
    .map(c => `  • ${c} — e.g. ${ALL_QUIZZES.filter(q => q.cat === c).slice(0, 8).map(q => `"${q.title}"`).join(', ')}`)
    .join('\n');
  const elibCats = [...new Set(ELIB.map(e => e.cat))];
  const deckNames = Object.keys(FLASH_DECKS);
  const articleSample = ELIB.slice(0, 14).map(e => `"${e.title}"`).join(', ');
  const text = [
    `PATHWAY — ${path.label} (this student's current track):`,
    unitLines,
    '',
    `QUIZ LIBRARY: ${ALL_QUIZZES.length} practice quizzes across ${quizLine}. Sample real quiz titles you may reference by exact name:`,
    quizSampleLines,
    `FLASHCARDS: these exact pre-built decks: ${deckNames.join(', ')} — plus "Smart Mix" (all due cards across every deck) and decks the student can generate from their own notes`,
    `E-LIBRARY: ~${ELIB.length} curated articles/videos/courses across ${elibCats.join(', ')} (sample titles: ${articleSample})`,
    `AI COACH: Medabrain chat tutor (inside Prep) for questions, explanations, and being quizzed out loud`,
    `PORTFOLIO TOOLS: College List, Essay Workspace, Deadlines Tracker, Financial Aid Tracker, Activities & Resume Builder, Research Experience Log, Skills & Certifications, Clinical Hours Log, Recommenders Tracker, Interview Prep practice, Test Score Tracker, Admissions Calculator`,
  ].join('\n');
  return { text, pathwayLabel: path.label, unitTitles, quizCats };
}

// Turns the same raw Portfolio resource lists buildPortfolioSystemPrompt reasons over
// (src/components/PortfolioMedabrain.jsx fetches them via listItems()) into a compact
// text block grounding plan generation in the student's ACTUAL colleges, essays,
// deadlines, and activities — not just onboarding answers and summary counts. Trimmed
// to a handful of named items per category (not full essay bodies) to keep prompt size
// reasonable; every "no X yet" case is stated explicitly so the model never invents one.
function buildPortfolioFactsText(portfolio) {
  if (!portfolio) return null;
  const {
    colleges = [], essays = [], deadlines = [], scholarships = [], activities = [],
    research = [], skills = [], clinicalHours = [], recommenders = [], testScores = [], awards = [], gpaEntries = [],
  } = portfolio;
  const lines = [];
  lines.push(colleges.length
    ? `Colleges on their list: ${colleges.slice(0, 8).map(c => `${c.name}${c.category ? ` (${c.category})` : ''}`).join(', ')}${colleges.length > 8 ? `, +${colleges.length - 8} more` : ''}.`
    : 'No colleges on their list yet.');
  const essaysNotStarted = essays.filter(e => e.status !== 'final').length;
  lines.push(essays.length
    ? `Essay drafts: ${essays.slice(0, 6).map(e => `"${e.title || 'Untitled'}"${e.status ? ` (${e.status})` : ''}`).join(', ')}${essays.length > 6 ? `, +${essays.length - 6} more` : ''}${essaysNotStarted ? ` — ${essaysNotStarted} not yet finished` : ''}.`
    : 'No essay drafts started yet.');
  const today = todayStr();
  const upcoming = deadlines
    .map(d => ({ ...d, days: daysBetween(today, d.due_date) }))
    .filter(d => Number.isFinite(d.days) && d.days >= 0)
    .sort((a, b) => a.days - b.days);
  lines.push(upcoming.length
    ? `Upcoming deadlines, soonest first: ${upcoming.slice(0, 5).map(d => `"${d.title}" in ${d.days}d`).join('; ')}.`
    : 'No upcoming deadlines tracked.');
  lines.push(activities.length
    ? `Activities logged: ${activities.slice(0, 5).map(a => `${a.position || a.activity_type}${a.organization ? ` at ${a.organization}` : ''}`).join(', ')}${activities.length > 5 ? `, +${activities.length - 5} more` : ''}.`
    : 'No activities logged yet.');
  lines.push(research.length ? `Research: ${research.slice(0, 4).map(r => r.title).join(', ')}.` : 'No research experience logged yet.');
  lines.push(clinicalHours.length ? `${clinicalHours.reduce((s, h) => s + (h.hours || 0), 0)} clinical/shadowing hour(s) logged.` : 'No clinical/shadowing hours logged yet.');
  lines.push(recommenders.length ? `${recommenders.length} recommender(s) tracked.` : 'No recommenders tracked yet.');
  lines.push(skills.length ? `Skills/certifications: ${skills.slice(0, 5).map(s => s.name).join(', ')}.` : null);
  if (testScores.length) {
    const latest = [...testScores].sort((a, b) => new Date(b.test_date || 0) - new Date(a.test_date || 0))[0];
    lines.push(`Most recent logged test score: ${latest.test_type} ${latest.composite}${latest.test_date ? ` on ${latest.test_date}` : ''}.`);
  }
  if (gpaEntries.length) {
    const latestGpa = [...gpaEntries].sort((a, b) => String(b.term || '').localeCompare(String(a.term || '')))[0];
    lines.push(`Most recent logged GPA: ${latestGpa.gpa}${latestGpa.term ? ` (${latestGpa.term})` : ''}.`);
  }
  if (awards.length) lines.push(`${awards.length} award(s)/honor(s) logged.`);
  if (scholarships.length) lines.push(`${scholarships.length} scholarship(s) tracked in Financial Aid.`);
  return lines.filter(Boolean).join('\n');
}

function buildProfileFactsText(user, liveSignals = {}, portfolio = null) {
  const { dailyMinutes, weeklyQuestions } = deriveLoad(user || {});
  const gradeLabel = GRADE_STAGES[gradeIdxFromStage(user?.gradeStage)]?.label || 'high school';
  const goalLabel = labelOf(GOAL_OPTIONS, user?.goal) || 'exploring medicine';
  const obstacles = labelsOf(OBSTACLE_OPTIONS, user?.obstacles);
  const accomplish = labelsOf(ACCOMPLISH_OPTIONS, user?.accomplish);
  const studyMethodLabel = labelOf(STUDY_METHOD_OPTIONS, user?.studyMethod);
  const lines = [
    `Name: ${user?.name || 'the student'}`,
    `Grade: ${gradeLabel}`,
    `Test track: ${user?.testTrack || 'SAT'} (current ~${user?.onboardingCurrentScore || 'unknown'}, target ~${user?.onboardingTargetScore || 'unknown'})`,
    user?.examDate ? `Test date: ${user.examDate}` : 'Test date: not set yet',
    `Weekly study time available: ${user?.studyHours || 'unsure'}`,
    `Pace: about ${dailyMinutes} minutes/day, ${weeklyQuestions} practice questions/week`,
    `Primary goal: ${goalLabel}`,
    labelOf(WHY_MEDICINE_OPTIONS, user?.whyMedicine) ? `Why they're drawn to medicine: ${labelOf(WHY_MEDICINE_OPTIONS, user?.whyMedicine)}` : null,
    (user?.dreamRole && user.dreamRole !== 'undecided') ? `Dream health role: ${labelOf(DREAM_ROLE_OPTIONS, user.dreamRole)}` : null,
    labelOf(CERTAINTY_OPTIONS, user?.certainty) ? `Certainty about medicine: ${labelOf(CERTAINTY_OPTIONS, user?.certainty)}` : null,
    (user?.gpaBand && user.gpaBand !== 'unsure') ? `Self-reported grades: ${labelOf(GPA_OPTIONS, user.gpaBand)}` : null,
    labelsOf(SCIENCE_OPTIONS, user?.sciences).length ? `Science courses: ${labelsOf(SCIENCE_OPTIONS, user.sciences).join(', ')}` : null,
    labelsOf(EXPERIENCE_OPTIONS, user?.healthExperience).length ? `Hands-on health experience: ${labelsOf(EXPERIENCE_OPTIONS, user.healthExperience).join(', ')}` : null,
    labelOf(TEST_TIMELINE_OPTIONS, user?.testTimeline) ? `Planned test timing: ${labelOf(TEST_TIMELINE_OPTIONS, user?.testTimeline)}` : null,
    accomplish.length ? `Wants to accomplish: ${accomplish.join(', ')}` : null,
    obstacles.length ? `Their stated obstacles: ${obstacles.join(', ')}` : null,
    (studyMethodLabel && user?.studyMethod !== 'none') ? `Also currently using: ${studyMethodLabel}` : null,
    liveSignals.weakestCategory ? `Weakest quiz category right now: ${liveSignals.weakestCategory} (${liveSignals.weakestScore}%)` : null,
    liveSignals.dueCards > 0 ? `${liveSignals.dueCards} flashcard(s) due for review right now` : null,
    liveSignals.nextDeadlineTitle ? `Next upcoming deadline: "${liveSignals.nextDeadlineTitle}" in ${liveSignals.nextDeadlineDays} day(s)` : null,
    liveSignals.collegeCount > 0 ? `Tracking ${liveSignals.collegeCount} college(s)${liveSignals.essayCount > 0 ? `, ${liveSignals.essayCount} essay draft(s) started` : ', no essay drafts yet'}` : null,
    liveSignals.clinicalHours > 0 ? `${liveSignals.clinicalHours} clinical/shadowing hour(s) logged so far` : null,
    liveSignals.recommendersCount > 0 ? `Tracking ${liveSignals.recommendersCount} recommender(s)` : null,
    `Current study streak: ${liveSignals.streak || 0} day(s)`,
    // Things the student said directly (typed or dictated by mic — see PlanVoiceNotes in
    // PlansTab.jsx) — the highest-signal input there is, since it's exactly what they asked for
    // in their own words, not an inference. Weight it accordingly: treat these as real
    // constraints/requests to actually build into the plan, not just background color.
    (user?.planNotes || []).length ? `The student told Medabrain directly (treat these as real, current requests to build into the plan):\n${user.planNotes.map(n => `  • ${n}`).join('\n')}` : null,
  ].filter(Boolean);
  const portfolioText = buildPortfolioFactsText(portfolio);
  if (portfolioText) lines.push(`\nTheir actual Portfolio right now (reference these by name in Portfolio-pillar tasks instead of generic busywork — e.g. an essay task should name the real college/essay, a deadline-prep task should name the real deadline):\n${portfolioText}`);
  return lines.join('\n');
}

const AGE_APPROPRIATE_RULES = `- They are years away from medical school. NEVER mention the MCAT, medical-school applications, residency, clinical rotations, MMI, or CASPer. Frame everything as high-school and undergraduate-admissions prep with an eye toward a future health career.
- SAT/ACT prep matters but is one part of a balanced plan — weave in science foundations, Portfolio-building (activities, shadowing, essays, deadlines), and honest exploration of whether medicine fits, not just test-prep.
- Be emotionally attuned to their stated obstacles and pace — this is a teenager, not a client.
- Reference their actual goal, grade, pace, pathway, and obstacles by name so it reads as built for them, not templated.
- Ground every concrete task or resource mention ONLY in things listed in the MedSchoolPrep resource catalog below — never invent a book, tool, or resource that isn't in that list.`;

// ── JSON extraction/repair — same defensive philosophy as planGenerator.js,
// adapted for this schema's nested arrays. ──────────────────────────────────
function parseLooseJSON(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const first = s.indexOf('{'); const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const body = s.slice(first, last + 1);
  const tryParse = (t) => { try { return JSON.parse(t); } catch { return null; } };
  return (
    tryParse(body) ||
    tryParse(body.replace(/,\s*([}\]])/g, '$1')) ||
    tryParse(body.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1')) ||
    null
  );
}
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function callOracle({ system, user, maxTokens, reasoningEffort = 'high' }) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 50000) : null;
  try {
    const r = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message: user, maxTokens, purpose: 'masterplan', tier: 'oracle', jsonMode: true, reasoningEffort }),
      signal: controller ? controller.signal : undefined,
    });
    if (!r.ok) return null;
    const d = await r.json();
    return parseLooseJSON(d && d.content);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function callOracleWithRetry(args) {
  return (await callOracle(args)) || (await callOracle(args));
}

// ── Deep-link destination whitelist ────────────────────────────────────────
// A model can hallucinate a tab/view that doesn't exist — validated against
// the app's real NAV/SubNav ids (src/App.jsx) so a bad value just means "no
// link" instead of a broken navigation click.
const VALID_DESTINATIONS = new Set([
  'prep:diagnostic', 'prep:pathway', 'prep:quizzes', 'prep:flashcards', 'prep:coach', 'prep:library',
  'portfolio:overview', 'portfolio:timeline', 'portfolio:colleges', 'portfolio:essays', 'portfolio:deadlines',
  'portfolio:aid', 'portfolio:resume', 'portfolio:research', 'portfolio:skills', 'portfolio:clinical',
  'portfolio:recommenders', 'portfolio:interview', 'portfolio:scores', 'portfolio:calc',
  'progress:overview', 'progress:verified', 'progress:performance', 'progress:achievements',
]);
function sanitizeDestination(tab, view) {
  if (!tab || !view || !VALID_DESTINATIONS.has(`${tab}:${view}`)) return { resourceTab: null, resourceView: null };
  return { resourceTab: tab, resourceView: view };
}
const VALID_PILLARS = new Set(['prep', 'portfolio', 'progress', 'rest']);
const VALID_TASK_TYPES = new Set(['lesson', 'quiz', 'flashcards', 'reading', 'coach', 'activity', 'college', 'essay', 'deadline', 'clinical', 'research', 'recommender', 'interview', 'reflection', 'rest']);

// ── Specific-resource resolution — the "give me the actual link" layer ─────
// A task saying "SAT practice set" is only useful if clicking it opens THE
// practice set. Every task is resolved here, deterministically and locally,
// to a concrete launchable resource: a real quiz id, a real pathway lesson
// id, a real flashcard deck name, or a real E-Library article title. The AI
// may *suggest* a resource by name (resourceName in the day-chunk schema);
// this resolver validates that suggestion against the app's actual catalogs
// and, when it doesn't match anything real, falls back to a sensible pick —
// so a link is present and working on 100% of tasks regardless of what the
// model returned.
const TYPE_DEFAULT_DEST = {
  lesson: ['prep', 'pathway'], quiz: ['prep', 'quizzes'], flashcards: ['prep', 'flashcards'],
  reading: ['prep', 'library'], coach: ['prep', 'coach'],
  activity: ['portfolio', 'resume'], college: ['portfolio', 'colleges'], essay: ['portfolio', 'essays'],
  deadline: ['portfolio', 'deadlines'], clinical: ['portfolio', 'clinical'], research: ['portfolio', 'research'],
  recommender: ['portfolio', 'recommenders'], interview: ['portfolio', 'interview'],
  reflection: ['progress', 'overview'], rest: null,
};
const VIEW_LABELS = {
  'prep:diagnostic': 'Pathway Diagnostic', 'prep:pathway': 'Your Pathway', 'prep:quizzes': 'Quiz Library',
  'prep:flashcards': 'Flashcards', 'prep:coach': 'AI Coach', 'prep:library': 'E-Library',
  'portfolio:overview': 'Portfolio Overview', 'portfolio:timeline': 'Timeline', 'portfolio:colleges': 'College List',
  'portfolio:essays': 'Essay Workspace', 'portfolio:deadlines': 'Deadlines Tracker', 'portfolio:aid': 'Financial Aid',
  'portfolio:resume': 'Activities & Resume', 'portfolio:research': 'Research Log', 'portfolio:skills': 'Skills & Certs',
  'portfolio:clinical': 'Clinical Hours Log', 'portfolio:recommenders': 'Recommenders', 'portfolio:interview': 'Interview Prep',
  'portfolio:scores': 'Test Score Tracker', 'portfolio:calc': 'Admissions Calculator',
  'progress:overview': 'Progress Overview', 'progress:verified': 'Verified Progress',
  'progress:performance': 'Performance', 'progress:achievements': 'Achievements',
};

const MATCH_STOPWORDS = new Set(['the', 'and', 'for', 'your', 'with', 'into', 'from', 'that', 'this', 'you', 'are', 'not', 'set', 'sets', 'practice', 'quiz', 'quizzes', 'deck', 'decks', 'review', 'lesson', 'lessons', 'unit', 'library', 'session', 'question', 'questions', 'flashcard', 'flashcards', 'card', 'cards', 'study', 'read', 'reading', 'article', 'video', 'complete', 'continue', 'today', 'daily']);
function matchTokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !MATCH_STOPWORDS.has(w));
}
// Best token-overlap candidate; `min` guards against coincidental one-word hits
// when matching loose free text (title+detail) rather than an exact name.
function bestMatch(text, candidates, getTitle, min = 2) {
  const qt = new Set(matchTokens(text));
  if (!qt.size) return null;
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const ct = matchTokens(getTitle(c));
    let score = 0;
    for (const t of ct) if (qt.has(t)) score++;
    if (score > bestScore || (score === bestScore && score > 0 && best && matchTokens(getTitle(best)).length > ct.length)) {
      if (score > 0) { best = c; bestScore = score; }
    }
  }
  return bestScore >= Math.min(min, matchTokens(text).length) ? best : null;
}
// Deterministic small hash so fallback picks vary day to day (and task to
// task) without any randomness — the same plan always resolves the same way.
function seedFrom(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildResourceIndex(specialtyKey) {
  const path = PATHS[specialtyKey] || PATHS.exploring;
  return {
    lessons: path.units.flatMap(u => u.lessons.map(l => ({ id: l.id, title: l.title, unitTitle: u.title }))),
    quizzes: ALL_QUIZZES.map(q => ({ id: q.id, title: q.title, cat: q.cat, diff: q.diff })),
    decks: Object.keys(FLASH_DECKS),
    articles: ELIB.map(e => ({ title: e.title, cat: e.cat })),
  };
}

// Resolves ONE task to { resourceTab, resourceView, resourceKind, resourceId,
// resourceLabel }. Never throws; always returns a complete link object (or a
// bare view link when the type has no addressable resource, e.g. coach/rest).
export function resolveTaskResource(task, index, { seedKey = '', weakestCategory = null } = {}) {
  const type = VALID_TASK_TYPES.has(task?.type) ? task.type : 'reading';
  // Destination: keep a valid AI-provided tab/view, otherwise derive from type.
  let dest = sanitizeDestination(task?.resourceTab, task?.resourceView);
  if (!dest.resourceTab) {
    const def = TYPE_DEFAULT_DEST[type];
    dest = def ? { resourceTab: def[0], resourceView: def[1] } : { resourceTab: null, resourceView: null };
  }
  const hint = [task?.resourceName, task?.title, task?.detail].filter(Boolean).join(' ');
  const exactHint = task?.resourceName || '';
  const seed = seedFrom(seedKey + (task?.title || ''));
  let kind = 'view', id = null, label = dest.resourceTab ? (VIEW_LABELS[`${dest.resourceTab}:${dest.resourceView}`] || null) : null;

  if (type === 'quiz' && dest.resourceTab === 'prep') {
    dest = { resourceTab: 'prep', resourceView: 'quizzes' };
    const hit = bestMatch(exactHint, index.quizzes, q => q.title, 1) || bestMatch(hint, index.quizzes, q => q.title, 2)
      || (() => {
        // Fallback: honour the category the task text names, else target the
        // student's weakest category, else rotate — always lands on a real quiz.
        const mentioned = index.quizzes.filter(q => hint.toLowerCase().includes(q.cat.toLowerCase()));
        const catHit = index.quizzes.filter(q => weakestCategory && q.cat === weakestCategory);
        const pool = mentioned.length ? mentioned : (catHit.length ? catHit : index.quizzes);
        return pool[seed % pool.length];
      })();
    if (hit) { kind = 'quiz'; id = hit.id; label = hit.title; }
  } else if (type === 'lesson' && dest.resourceTab === 'prep') {
    dest = { resourceTab: 'prep', resourceView: 'pathway' };
    const hit = bestMatch(exactHint, index.lessons, l => l.title, 1) || bestMatch(hint, index.lessons, l => `${l.title} ${l.unitTitle}`, 2)
      || index.lessons[seed % Math.max(1, index.lessons.length)];
    if (hit) { kind = 'lesson'; id = hit.id; label = hit.title; }
  } else if (type === 'flashcards' && dest.resourceTab === 'prep') {
    dest = { resourceTab: 'prep', resourceView: 'flashcards' };
    const named = bestMatch(exactHint, index.decks, d => d, 1) || bestMatch(hint, index.decks, d => d, 2);
    // "clear what's due" style tasks route to Smart Mix — the due-cards-across-
    // every-deck session — which always exists regardless of the student's decks.
    const dueish = /due|smart mix|review/i.test(hint);
    const pick = named || (dueish ? 'Smart Mix' : index.decks[seed % Math.max(1, index.decks.length)]);
    if (pick) { kind = 'deck'; id = pick; label = pick === 'Smart Mix' ? 'Smart Mix (due cards)' : pick; }
  } else if (dest.resourceTab === 'prep' && dest.resourceView === 'library') {
    // Any task pointed at the E-Library (reading, reflection, rest-day skims)
    // gets a specific article when one can be named or matched.
    const hit = bestMatch(exactHint, index.articles, a => a.title, 1) || bestMatch(hint, index.articles, a => a.title, 2);
    if (hit) { kind = 'article'; id = hit.title; label = hit.title; }
  }
  return { ...dest, resourceKind: kind, resourceId: id, resourceLabel: label };
}

// Walks an entire plan and (re-)resolves the link fields on every task —
// used both to upgrade plans generated before deep links existed and as a
// belt-and-braces pass after any generation, so no stored plan can ever have
// a task without a working link.
export function resolveAllTaskLinks(plan, user, liveSignals = {}) {
  if (!plan?.days?.length) return plan;
  const index = buildResourceIndex(user?.specialty || 'exploring');
  let changed = false;
  const days = plan.days.map(d => ({
    ...d,
    tasks: (d.tasks || []).map(t => {
      if (t.resourceKind && (t.resourceId || t.resourceKind === 'view')) return t;
      changed = true;
      return { ...t, ...resolveTaskResource(t, index, { seedKey: d.date, weakestCategory: liveSignals.weakestCategory }) };
    }),
  }));
  return changed ? { ...plan, days, linkVersion: 2 } : plan;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP — the durable spine of the plan
// ═══════════════════════════════════════════════════════════════════════════
const OBSTACLE_STRATEGY = {
  what_to_study: 'Every task in this plan is pre-picked — no more wondering where to start each day.',
  guidance: 'Lean on the AI Coach throughout this plan whenever a task is unclear or you need a second opinion.',
  busy: 'Tasks are sized to fit short windows — most days only need 20-40 focused minutes, not hours.',
  anxiety: 'Practice is spread out and low-stakes by design, so no single day or quiz carries outsized pressure.',
  motivation: 'Short, frequent wins are built in on purpose instead of marathon sessions — consistency compounds.',
  no_plan: 'This roadmap replaces the guesswork entirely — just follow the day-by-day tasks in order.',
};

export function heuristicRoadmap(user, horizonWeeks, catalog) {
  const track = user?.testTrack || 'SAT';
  const goalLabel = labelOf(GOAL_OPTIONS, user?.goal) || 'building a strong path into medicine';
  const obstacles = labelsOf(OBSTACLE_OPTIONS, user?.obstacles);
  const phaseCount = clampPhaseCount(horizonWeeks);
  const templates = [
    { title: 'Foundations', theme: `Get oriented in ${catalog.pathwayLabel} and build the ${track} habit`, objectives: [`Take the Pathway Diagnostic if you haven't yet`, `Establish a daily ${track} practice habit`, `Complete Unit 1 of your pathway`], resources: [catalog.unitTitles[0] || catalog.pathwayLabel, 'Quiz Library', 'Flashcards'] },
    { title: 'Momentum', theme: `Deepen ${track} skills while rounding out your Portfolio basics`, objectives: ['Grow weekly practice-question volume', 'Start your College List and log any activities', 'Complete Unit 2 of your pathway'], resources: [catalog.unitTitles[1] || catalog.pathwayLabel, 'College List', 'Activities & Resume Builder'] },
    { title: 'Application Readiness', theme: 'Turn consistent prep into real application progress', objectives: ['Hit your target practice pace every week', 'Draft at least one essay', 'Complete Unit 3 of your pathway'], resources: [catalog.unitTitles[2] || catalog.pathwayLabel, 'Essay Workspace', 'Deadlines Tracker'] },
    { title: 'Polish & Push', theme: 'Tighten weak spots and keep every deadline covered', objectives: ['Target your weakest quiz category directly', 'Review and revise essay drafts', 'Confirm recommenders and deadlines are on track'], resources: ['Quiz Library', 'Essay Workspace', 'Recommenders Tracker'] },
    { title: 'Final Stretch', theme: 'Steady, sustainable effort through to the finish', objectives: ['Keep the daily habit unbroken', 'Close out any open Portfolio items', 'Reflect on how far you have come'], resources: ['Flashcards', 'Financial Aid Tracker', 'AI Coach'] },
  ];
  const use = templates.slice(0, phaseCount);
  const weeksPer = Math.ceil(horizonWeeks / use.length);
  const phases = use.map((t, i) => {
    const weekStart = i * weeksPer + 1;
    const weekEnd = i === use.length - 1 ? horizonWeeks : Math.min(horizonWeeks, weekStart + weeksPer - 1);
    return { id: `phase-${i}`, index: i, title: t.title, weekStart, weekEnd, theme: t.theme, objectives: t.objectives, resources: t.resources, successMetric: `By week ${weekEnd}, ${t.objectives[0].toLowerCase()}.` };
  });
  const weeklyThemes = Array.from({ length: horizonWeeks }, (_, i) => {
    const week = i + 1;
    const phase = phases.find(p => week >= p.weekStart && week <= p.weekEnd) || phases[phases.length - 1];
    return { week, phaseId: phase.id, theme: phase.theme, focus: ['prep', 'portfolio'], keyResource: phase.resources[0] };
  });
  const milestoneCount = Math.min(8, Math.max(5, phases.length + 2));
  const milestones = Array.from({ length: milestoneCount }, (_, i) => {
    const week = Math.max(1, Math.round(((i + 1) / milestoneCount) * horizonWeeks));
    return { title: i === 0 ? 'Find your pathway & start the habit' : i === milestoneCount - 1 ? 'Reach your target' : `Checkpoint ${i}`, weekTarget: week, detail: `A steady-pace checkpoint for week ${week} of your plan.` };
  });
  const riskMitigation = (obstacles.length ? obstacles : ['Staying consistent']).slice(0, 4).map((label) => {
    const key = (OBSTACLE_OPTIONS.find(o => o.label === label) || {}).value;
    return { obstacle: label, strategy: OBSTACLE_STRATEGY[key] || 'Small, repeatable daily actions beat occasional long sessions — the plan is built around that.' };
  });
  return {
    headline: `Your ${horizonWeeks}-week ${track} + pre-health roadmap`,
    overview: `This is a ${horizonWeeks}-week plan built around ${goalLabel.toLowerCase()}, paced for where you are right now as a student on the ${catalog.pathwayLabel} track. It balances steady ${track} practice with the early science foundations and Portfolio-building that make a future health-career application strong — not a test-prep bootcamp, a real roadmap. Each phase below has its own focus, and every week has a concrete theme so you always know what "on track" looks like.`,
    pillarStrategy: {
      prep: `Steady ${track} practice plus your ${catalog.pathwayLabel} pathway units, quizzes, and flashcards keep your academic foundation growing every week.`,
      portfolio: `College list, activities, essays, and deadlines get built up gradually alongside prep, not crammed in at the end.`,
      progress: `Weekly themes and milestones give you a clear way to check "am I on track" without guessing.`,
    },
    phases, weeklyThemes, milestones, riskMitigation, horizonWeeks,
    ninetyDayGoal: `In 90 days: a steady daily study habit, a measurable ${track} score bump, and real Portfolio progress (college list started, at least one activity logged, one essay draft underway).`,
    encouragement: `You're building this early, which is a real advantage — small, steady days compound more than you'll notice week to week. We've got you.`,
    source: 'fallback',
  };
}

function buildRoadmapSystemPrompt(horizonWeeks, catalogText) {
  return `You are Medabrain's Oracle — the deepest planning intelligence inside MedSchoolPrep, a prep platform for high-school students (grades 9-12, ~14-18 years old) exploring a future in medicine or a health career. You are building this student's full, long-horizon Study & Application Roadmap: the master plan that both the Plans tab and the rest of Medabrain (the Scout/Guide/Sage chat coach) will read from and reference for weeks or months.

This is the single most important, highest-effort generation in the app — take real care and go deep. It should read like it was built by a human academic advisor who has read the student's entire file, not a generic study calendar. Be concrete and specific.

${AGE_APPROPRIATE_RULES}
- The plan spans exactly ${horizonWeeks} weeks, split into 3-6 phases with a clear theme and objectives each — like a real syllabus, not a vague vibe.

Here is the real MedSchoolPrep resource catalog to ground the plan in:
${catalogText}

Respond with ONLY a valid JSON object (no markdown, no code fences, no prose before or after) matching exactly this schema:
{
  "headline": "short motivating title for the whole roadmap, max 10 words",
  "overview": "3-5 sentence deep narrative overview of the whole roadmap, referencing their actual goal/situation/pace by name",
  "pillarStrategy": { "prep": "1-2 sentences on how academic/test prep fits their plan", "portfolio": "1-2 sentences on how building their application fits", "progress": "1-2 sentences on how they'll know it's working" },
  "phases": [ { "title": "short phase name", "theme": "one line", "objectives": ["3 to 5 concrete objectives"], "resources": ["2 to 4 SPECIFIC MedSchoolPrep resource names, drawn only from the catalog above"], "successMetric": "one concrete, measurable sentence" } ],
  "weeklyThemes": [ { "week": number, "theme": "short one-line theme for that week", "focus": ["prep","portfolio", or "progress" — one or two of these], "keyResource": "one specific resource name from the catalog" } ],
  "milestones": [ { "title": "short", "weekTarget": number, "detail": "one sentence" } ],
  "riskMitigation": [ { "obstacle": "their actual stated obstacle, or a likely one for their situation", "strategy": "one concrete sentence" } ],
  "ninetyDayGoal": "one concrete sentence describing where they could realistically be in 90 days",
  "encouragement": "two or three warm, personal closing sentences that name a stated obstacle or goal"
}
Provide 3-6 "phases" entries (do not include weekStart/weekEnd — they are computed separately) covering the full ${horizonWeeks}-week horizon in order. Provide EXACTLY one "weeklyThemes" entry per week, for week 1 through week ${horizonWeeks}, in order. Provide 5-8 "milestones" spread across the horizon in week order. Provide 2-4 "riskMitigation" entries.`;
}

function repairRoadmap(parsed, fallback, horizonWeeks) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  const phaseCount = clampPhaseCount(horizonWeeks);
  const rawPhases = Array.isArray(p.phases) && p.phases.length ? p.phases.slice(0, 6) : fallback.phases;
  const usePhases = rawPhases.length ? rawPhases : fallback.phases;
  const weeksPer = Math.ceil(horizonWeeks / usePhases.length);
  const phases = usePhases.map((ph, i) => {
    const fb = fallback.phases[i] || fallback.phases[fallback.phases.length - 1];
    const weekStart = i * weeksPer + 1;
    const weekEnd = i === usePhases.length - 1 ? horizonWeeks : Math.min(horizonWeeks, weekStart + weeksPer - 1);
    return {
      id: `phase-${i}`, index: i,
      title: str(ph.title) || fb.title,
      weekStart, weekEnd,
      theme: str(ph.theme) || fb.theme,
      objectives: (Array.isArray(ph.objectives) ? ph.objectives.filter(str).map(String) : []).slice(0, 5).concat(fb.objectives).slice(0, Math.max(3, Math.min(5, (ph.objectives || []).length || 3))),
      resources: (Array.isArray(ph.resources) ? ph.resources.filter(str).map(String) : []).slice(0, 4).concat(fb.resources).slice(0, Math.max(2, Math.min(4, (ph.resources || []).length || 2))),
      successMetric: str(ph.successMetric) || fb.successMetric,
    };
  });
  // weeklyThemes: guarantee full 1..horizonWeeks coverage regardless of what the model returned.
  const byWeek = new Map();
  if (Array.isArray(p.weeklyThemes)) for (const w of p.weeklyThemes) { const wk = num(w?.week); if (wk) byWeek.set(wk, w); }
  const weeklyThemes = Array.from({ length: horizonWeeks }, (_, i) => {
    const week = i + 1;
    const phase = phases.find(ph => week >= ph.weekStart && week <= ph.weekEnd) || phases[phases.length - 1];
    const w = byWeek.get(week);
    const focus = Array.isArray(w?.focus) ? w.focus.filter(f => ['prep', 'portfolio', 'progress'].includes(f)) : [];
    return {
      week, phaseId: phase.id,
      theme: str(w?.theme) || phase.theme,
      focus: focus.length ? focus : ['prep', 'portfolio'],
      keyResource: str(w?.keyResource) || phase.resources[0] || catalogFirstResource(fallback),
    };
  });
  const milestones = (Array.isArray(p.milestones) ? p.milestones : []).map(m => ({
    title: str(m?.title), weekTarget: num(m?.weekTarget), detail: str(m?.detail),
  })).filter(m => m.title && m.weekTarget).slice(0, 8);
  while (milestones.length < 5) milestones.push(fallback.milestones[milestones.length % fallback.milestones.length]);
  const riskMitigation = (Array.isArray(p.riskMitigation) ? p.riskMitigation : []).map(r => ({
    obstacle: str(r?.obstacle), strategy: str(r?.strategy),
  })).filter(r => r.obstacle && r.strategy).slice(0, 4);
  return {
    headline: str(p.headline) || fallback.headline,
    overview: str(p.overview) || fallback.overview,
    pillarStrategy: {
      prep: str(p.pillarStrategy?.prep) || fallback.pillarStrategy.prep,
      portfolio: str(p.pillarStrategy?.portfolio) || fallback.pillarStrategy.portfolio,
      progress: str(p.pillarStrategy?.progress) || fallback.pillarStrategy.progress,
    },
    phases, weeklyThemes, milestones, horizonWeeks,
    riskMitigation: riskMitigation.length ? riskMitigation : fallback.riskMitigation,
    ninetyDayGoal: str(p.ninetyDayGoal) || fallback.ninetyDayGoal,
    encouragement: str(p.encouragement) || fallback.encouragement,
    source: 'ai',
  };
}
function catalogFirstResource(fallback) { return fallback.phases[0]?.resources?.[0] || 'Pathway'; }

function looksUsableRoadmap(p) {
  if (!p || typeof p !== 'object') return false;
  return !!str(p.overview) || (Array.isArray(p.phases) && p.phases.length > 0) || (Array.isArray(p.weeklyThemes) && p.weeklyThemes.length > 0);
}

export async function generateRoadmap(user, liveSignals, catalog, portfolio) {
  const horizonWeeks = computeHorizonWeeks(user);
  const fallback = heuristicRoadmap(user, horizonWeeks, catalog);
  try {
    const system = buildRoadmapSystemPrompt(horizonWeeks, catalog.text);
    const userMsg = `Here is the student's full profile:\n${buildProfileFactsText(user, liveSignals, portfolio)}\n\nBuild their ${horizonWeeks}-week roadmap now as JSON only.`;
    const parsed = await callOracleWithRetry({ system, user: userMsg, maxTokens: 6000, reasoningEffort: 'high' });
    const roadmap = looksUsableRoadmap(parsed) ? repairRoadmap(parsed, fallback, horizonWeeks) : fallback;
    return { ...roadmap, horizonWeeks };
  } catch {
    return { ...fallback, horizonWeeks };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY-BY-DAY CHUNKS — the rolling near-term window
// ═══════════════════════════════════════════════════════════════════════════
function weekNumberForDate(plan, date) { return plan?.startDate ? Math.floor(daysBetween(plan.startDate, date) / 7) + 1 : 1; }
function weeklyThemeForWeek(plan, week) { return plan?.weeklyThemes?.find(w => w.week === week) || null; }
function phaseForWeek(plan, week) { return plan?.phases?.find(p => week >= p.weekStart && week <= p.weekEnd) || plan?.phases?.[plan.phases.length - 1] || null; }

function heuristicDays(plan, fromDate, numDays, catalog, user) {
  const track = user?.testTrack || 'SAT';
  const days = [];
  for (let i = 0; i < numDays; i++) {
    const date = addDaysStr(fromDate, i);
    const wd = weekdayIdx(date);
    const isWeekend = wd === 0 || wd === 6;
    const weekNumber = weekNumberForDate(plan, date);
    const theme = weeklyThemeForWeek(plan, weekNumber)?.theme || 'Steady progress this week';
    const phase = phaseForWeek(plan, weekNumber);
    const tasks = [];
    if (!isWeekend) {
      tasks.push({ pillar: 'prep', type: 'quiz', title: `${track} practice set`, detail: `Quiz Library — ${catalog.quizCats[i % catalog.quizCats.length]}`, estMinutes: 20, ...sanitizeDestination('prep', 'quizzes') });
      tasks.push({ pillar: 'prep', type: 'lesson', title: 'Continue your pathway', detail: `${catalog.pathwayLabel} — ${catalog.unitTitles[i % catalog.unitTitles.length]}`, estMinutes: 15, ...sanitizeDestination('prep', 'pathway') });
      tasks.push({ pillar: 'prep', type: 'flashcards', title: 'Flashcard review', detail: 'Clear any cards due today', estMinutes: 10, ...sanitizeDestination('prep', 'flashcards') });
      if (i % 3 === 2) tasks.push({ pillar: 'portfolio', type: 'activity', title: 'Portfolio check-in', detail: 'Log any new activity, clinical, or research hours', estMinutes: 10, ...sanitizeDestination('portfolio', 'resume') });
    } else {
      tasks.push({ pillar: 'rest', type: 'reflection', title: 'Light review + reflect', detail: `Skim one E-Library article related to ${catalog.pathwayLabel}`, estMinutes: 15, ...sanitizeDestination('prep', 'library') });
    }
    days.push({
      date, dayIndex: i + 1, weekday: WEEKDAY_NAMES[wd], weekNumber, phaseId: phase?.id || null, theme,
      tasks: tasks.map((t, ti) => ({ id: `${date}-t${ti}`, done: false, doneAt: null, ...t })),
      reflectionPrompt: isWeekend ? 'What felt easiest this week? What needs more attention next week?' : null,
    });
  }
  return days;
}

function buildDayChunkSystemPrompt(numDays, catalogText, prefsNote = '') {
  return `You are Medabrain's Oracle, continuing to build a student's day-by-day study plan inside MedSchoolPrep. Their full roadmap already exists — your job right now is to fill in SPECIFIC, concrete daily tasks for a ${numDays}-day window, fully consistent with the roadmap phase/week themes given below. This should read like an actual day planner a great advisor handed them — not vague ("study science") but specific ("Quiz Library → Physical Sciences → 12 questions on acid-base chemistry, tied to your Chemistry for Medicine unit").

${AGE_APPROPRIATE_RULES}
- Balance across the ${numDays} days: mix Prep (pathway lessons/quizzes/flashcards/library/coach) and Portfolio (colleges/essays/deadlines/activities/clinical hours/research/recommenders/interview prep) — do not make every day only test prep.
- Weekends should be lighter — a shorter catch-up, reflection, or reading day, not a full load.
- Vary task count 3-5 per day depending on how busy that day naturally should be.${prefsNote}

Here is the real MedSchoolPrep resource catalog to ground tasks in:
${catalogText}

Respond with ONLY valid JSON (no markdown, no code fences, no prose) matching exactly this schema:
{ "days": [ { "dayIndex": number, "theme": "short line tying the day to its week theme", "tasks": [ { "pillar": "prep|portfolio|progress|rest", "type": "lesson|quiz|flashcards|reading|coach|activity|college|essay|deadline|clinical|research|recommender|interview|reflection|rest", "title": "short specific action, max 12 words", "detail": "one specific sentence naming the actual resource", "estMinutes": number, "resourceTab": "prep|portfolio|progress or null", "resourceView": "the specific sub-view id (e.g. quizzes, pathway, colleges, essays) or null", "resourceName": "the EXACT title of the one specific quiz, lesson, flashcard deck, or E-Library resource this task uses, copied verbatim from the catalog above — or null for tasks that don't target a single named resource" } ], "reflectionPrompt": "string or null — only on the last day of the window or a natural weekly-reflection day" } ] }
Provide EXACTLY one "days" entry per dayIndex, 1 through ${numDays}, in order. For every quiz/lesson/flashcards/reading task, ALWAYS fill "resourceName" with a real name from the catalog — this becomes a clickable link that opens that exact resource for the student.`;
}

function repairDays(parsed, fallbackDays, plan, catalog) {
  const byIndex = new Map();
  if (Array.isArray(parsed?.days)) for (const d of parsed.days) { const idx = num(d?.dayIndex); if (idx) byIndex.set(idx, d); }
  return fallbackDays.map((fb, i) => {
    const d = byIndex.get(i + 1);
    if (!d) return fb;
    const rawTasks = Array.isArray(d.tasks) ? d.tasks : [];
    const tasks = rawTasks.map((t, ti) => {
      const pillar = VALID_PILLARS.has(t?.pillar) ? t.pillar : (fb.tasks[ti]?.pillar || 'prep');
      const type = VALID_TASK_TYPES.has(t?.type) ? t.type : (fb.tasks[ti]?.type || 'reading');
      const dest = sanitizeDestination(t?.resourceTab, t?.resourceView);
      return {
        id: `${fb.date}-t${ti}`, done: false, doneAt: null,
        pillar, type,
        title: str(t?.title) || fb.tasks[ti]?.title || 'Study session',
        detail: str(t?.detail) || fb.tasks[ti]?.detail || '',
        estMinutes: num(t?.estMinutes) || fb.tasks[ti]?.estMinutes || 20,
        resourceName: str(t?.resourceName) || null,
        ...dest,
      };
    });
    return {
      ...fb,
      theme: str(d.theme) || fb.theme,
      tasks: tasks.length ? tasks : fb.tasks,
      reflectionPrompt: str(d.reflectionPrompt) || fb.reflectionPrompt,
    };
  });
}

// ── Onboarding "addBack"/"rollover" prefs — real deterministic behavior ────
// Onboarding.jsx's toggleAddBack/toggleRollover steps promise two things
// ("if you study more than planned, we'll count it toward tomorrow too" /
// "missed a session? we'll fold it into tomorrow's plan") — both are applied
// here as plain post-processing on a freshly-generated day chunk, not left as
// a prompt hint the model might silently ignore. Both are pure functions over
// plain plan-day data, so they're testable independent of the LLM entirely.

// Rollover: carries not-yet-`done` tasks from the last couple of already-
// generated days into the first day of the new chunk (deduped by title, fresh
// ids, `rolledOverFrom` pointing at the original task) — capped at 2 so a
// student who's fallen behind doesn't get an ever-growing pile-up.
export function applyRolloverPrefs(days, priorDays, prefs) {
  if (!prefs?.rollover || !priorDays?.length || !days?.length) return days;
  const missed = priorDays.flatMap(d => d.tasks.filter(t => !t.done)).slice(-2);
  if (!missed.length) return days;
  const [first, ...rest] = days;
  const existingTitles = new Set(first.tasks.map(t => t.title));
  const rolled = missed
    .filter(t => !existingTitles.has(t.title))
    .map((t, i) => ({ ...t, id: `${first.date}-rollover${i}`, done: false, doneAt: null, xpAwarded: false, rolledOverFrom: t.id }));
  if (!rolled.length) return days;
  return [{ ...first, tasks: [...rolled, ...first.tasks] }, ...rest];
}

// Daily rollover — the day-boundary counterpart to applyRolloverPrefs above.
// applyRolloverPrefs only ever fires when a NEW chunk is generated (every ~7
// days), so a task missed on Monday wouldn't reach Tuesday's list until the
// next chunk boundary, days later. This runs once per calendar day instead:
// it merges any not-done tasks from the single most recent past day straight
// into TODAY's already-generated day entry (today's tasks were written days
// ago as part of a chunk — this doesn't regenerate them, only adds to them).
// Idempotent via plan.lastRolloverDate so re-running on every render/effect
// firing is safe and never duplicates a rolled-over task.
export function applyDailyRollover(plan, user) {
  if (!plan?.days?.length) return plan;
  const today = todayStr();
  if (plan.lastRolloverDate === today) return plan;
  if (!user?.rollover) return { ...plan, lastRolloverDate: today };
  const todayIdx = plan.days.findIndex(d => d.date === today);
  if (todayIdx === -1) return { ...plan, lastRolloverDate: today };
  const prior = [...plan.days].filter(d => d.date < today).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-1)[0];
  if (!prior) return { ...plan, lastRolloverDate: today };
  const missed = prior.tasks.filter(t => !t.done);
  if (!missed.length) return { ...plan, lastRolloverDate: today };
  const todayDay = plan.days[todayIdx];
  const existingTitles = new Set(todayDay.tasks.map(t => t.title));
  const rolled = missed
    .filter(t => !existingTitles.has(t.title))
    .slice(0, 2)
    .map((t, i) => ({ ...t, id: `${today}-dailyrollover${i}`, done: false, doneAt: null, xpAwarded: false, autoVerified: false, rolledOverFrom: t.id }));
  if (!rolled.length) return { ...plan, lastRolloverDate: today };
  const days = plan.days.map((d, i) => (i === todayIdx ? { ...d, tasks: [...rolled, ...d.tasks] } : d));
  return { ...plan, days, lastRolloverDate: today };
}

// Add-back: when the most recent already-generated day was fully completed
// (every task done — the "studied more than planned" signal available from
// this data model), trims one task off the new chunk's first day as a lighter
// reward day. Never trims below a 3-task floor, so a light day doesn't become
// an empty one.
export function applyAddBackPrefs(days, priorDays, prefs) {
  if (!prefs?.addBack || !priorDays?.length || !days?.length) return days;
  const lastDay = priorDays[priorDays.length - 1];
  const overCompleted = lastDay?.tasks?.length > 0 && lastDay.tasks.every(t => t.done);
  if (!overCompleted) return days;
  const [first, ...rest] = days;
  if (first.tasks.length <= 3) return days;
  return [{ ...first, tasks: first.tasks.slice(0, -1) }, ...rest];
}

// Generates the next `numDays` of daily tasks starting the day after
// plan.daysGeneratedThrough (or `fromDate` for the very first chunk).
export async function generateDayChunk(plan, user, liveSignals, catalog, fromDate, numDays = 7, portfolio) {
  const fallback = heuristicDays(plan, fromDate, numDays, catalog, user);
  // Final belt-and-braces pass: EVERY task — AI-written or fallback — leaves
  // here resolved to a concrete launchable resource (see resolveTaskResource),
  // so the "open this exact quiz/lesson/deck/article" link always works.
  const index = buildResourceIndex(user?.specialty || 'exploring');
  const linkAll = (days) => days.map(d => ({
    ...d,
    tasks: d.tasks.map(t => ({ ...t, ...resolveTaskResource(t, index, { seedKey: d.date, weakestCategory: liveSignals?.weakestCategory }) })),
  }));
  // Applied identically regardless of whether the AI call below succeeds or
  // falls back — the rollover/addBack promise shouldn't depend on that.
  const priorDays = (plan?.days || []).filter(d => d.date < fromDate).slice(-2);
  const prefs = { rollover: user?.rollover, addBack: user?.addBack };
  const applyPrefs = (days) => applyAddBackPrefs(applyRolloverPrefs(days, priorDays, prefs), priorDays, prefs);
  const prefsNote = [
    prefs.rollover ? ' This student opted into "rollover" — if a note below mentions catching up, keep today\'s load reasonable since rolled-over tasks are added separately.' : '',
    prefs.addBack ? ' This student opted into "add back" — if they\'ve been finishing early, today can be slightly lighter.' : '',
  ].join('');
  try {
    const dayTable = fallback.map(d => `Day ${d.dayIndex}: ${d.date} (${d.weekday}) — Week ${d.weekNumber}, phase "${phaseForWeek(plan, d.weekNumber)?.title || ''}", week theme: "${weeklyThemeForWeek(plan, d.weekNumber)?.theme || d.theme}"`).join('\n');
    const system = buildDayChunkSystemPrompt(numDays, catalog.text, prefsNote);
    const userMsg = `Roadmap headline: "${plan.headline}"\nOverview: ${plan.overview}\n\nStudent profile:\n${buildProfileFactsText(user, liveSignals, portfolio)}\n\nDays to fill in:\n${dayTable}\n\nGenerate the tasks for these ${numDays} days now as JSON only.`;
    const parsed = await callOracleWithRetry({ system, user: userMsg, maxTokens: 5500, reasoningEffort: fromDate === plan?.startDate ? 'high' : 'medium' });
    return applyPrefs(linkAll(parsed ? repairDays(parsed, fallback, plan, catalog) : fallback));
  } catch {
    return applyPrefs(linkAll(fallback));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration — public entry points used by the Plans tab
// ═══════════════════════════════════════════════════════════════════════════
const CHUNK_DAYS = 7;
const ROLLING_WINDOW_DAYS = 14; // how many days of full detail to keep generated ahead of today
const EXTEND_THRESHOLD_DAYS = 3; // trigger the next chunk once this many days of window remain

export async function createMasterPlan(user, liveSignals, portfolio) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const roadmap = await generateRoadmap(user, liveSignals, catalog, portfolio);
  const startDate = todayStr();
  const planShell = { ...roadmap, startDate, days: [] };
  const firstChunk = await generateDayChunk(planShell, user, liveSignals, catalog, startDate, CHUNK_DAYS, portfolio);
  const secondChunk = await generateDayChunk({ ...planShell, days: firstChunk }, user, liveSignals, catalog, addDaysStr(startDate, CHUNK_DAYS), CHUNK_DAYS, portfolio);
  const days = [...firstChunk, ...secondChunk];
  const now = Date.now();
  return {
    version: 1, linkVersion: 2, ...roadmap, startDate,
    days, daysGeneratedFrom: startDate, daysGeneratedThrough: addDaysStr(startDate, ROLLING_WINDOW_DAYS - 1),
    progressLog: [], createdAt: now, updatedAt: now, lastExtendedAt: now,
  };
}

// Rolls the window forward by one chunk — called when the plan is close to
// running out of generated days. This is the mechanism that keeps the plan
// "continuing to plan" indefinitely instead of going stale.
export async function extendMasterPlan(plan, user, liveSignals, portfolio) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const from = addDaysStr(plan.daysGeneratedThrough, 1);
  const nextChunk = await generateDayChunk(plan, user, liveSignals, catalog, from, CHUNK_DAYS, portfolio);
  const merged = pruneRollingWindow({
    ...plan,
    days: [...plan.days, ...nextChunk],
    daysGeneratedThrough: addDaysStr(from, CHUNK_DAYS - 1),
    updatedAt: Date.now(), lastExtendedAt: Date.now(),
  });
  return merged;
}

// Regenerates the roadmap from scratch (profile/goals changed enough to want
// a fresh spine) but keeps the already-generated near-term days untouched so
// in-progress work isn't lost, and re-derives their week/phase linkage
// against the new roadmap.
export async function regenerateRoadmap(plan, user, liveSignals, portfolio) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const roadmap = await generateRoadmap(user, liveSignals, catalog, portfolio);
  const startDate = plan?.startDate || todayStr();
  const days = (plan?.days || []).map(d => {
    const weekNumber = weekNumberForDate({ startDate }, d.date);
    const phase = phaseForWeek(roadmap, weekNumber);
    return { ...d, weekNumber, phaseId: phase?.id || null };
  });
  return { ...plan, ...roadmap, startDate, days, updatedAt: Date.now() };
}

// The real "Add to plan" mechanism — regenerates the roadmap spine (as
// regenerateRoadmap does) AND rewrites the not-yet-elapsed, not-yet-finished
// portion of the day-by-day window, so a note like "I have a dentist
// appointment tomorrow" visibly changes actual tomorrow tasks, not just the
// roadmap's narrative overview. Any day before today, or any day (today or
// later) whose tasks are already fully done, is left completely untouched —
// only the first still-open day onward gets a fresh, note-aware generation.
export async function adaptPlanToNotes(plan, user, liveSignals, portfolio) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const roadmap = await generateRoadmap(user, liveSignals, catalog, portfolio);
  const today = todayStr();
  const startDate = plan?.startDate || today;
  const sorted = [...(plan?.days || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const firstOpenIdx = sorted.findIndex(d => d.date >= today && !(d.tasks.length && d.tasks.every(t => t.done)));
  const keep = firstOpenIdx === -1 ? sorted : sorted.slice(0, firstOpenIdx);
  const regenFrom = firstOpenIdx === -1 ? null : sorted[firstOpenIdx].date;
  const through = plan?.daysGeneratedThrough || regenFrom;
  let freshDays = [];
  if (regenFrom && through) {
    const numDays = daysBetween(regenFrom, through) + 1;
    if (numDays > 0) {
      const shell = { ...plan, ...roadmap, startDate };
      freshDays = await generateDayChunk(shell, user, liveSignals, catalog, regenFrom, numDays, portfolio);
    }
  }
  const days = [...keep, ...freshDays].map(d => {
    const weekNumber = weekNumberForDate({ startDate }, d.date);
    const phase = phaseForWeek(roadmap, weekNumber);
    return { ...d, weekNumber, phaseId: phase?.id || null };
  });
  return { ...plan, ...roadmap, startDate, days, updatedAt: Date.now() };
}

export function needsExtension(plan) {
  if (!plan?.daysGeneratedThrough) return false;
  return daysBetween(todayStr(), plan.daysGeneratedThrough) <= EXTEND_THRESHOLD_DAYS;
}

// Archives days more than a few days in the past into a compact progressLog
// entry (date + completion count only) and drops their full task detail —
// keeps the synced blob small regardless of how long a student has been on
// the same plan. Call on load, before rendering.
export function pruneRollingWindow(plan) {
  if (!plan?.days?.length) return plan;
  const cutoff = addDaysStr(todayStr(), -3);
  const keep = []; const archive = [];
  for (const d of plan.days) (d.date < cutoff ? archive : keep).push(d);
  if (!archive.length) return plan;
  const log = [...(plan.progressLog || [])];
  for (const d of archive) log.push({ date: d.date, tasksTotal: d.tasks.length, tasksDone: d.tasks.filter(t => t.done).length });
  return { ...plan, days: keep, progressLog: log.slice(-60) };
}

// Toggling a task's checkbox flips its visible `done` state, but XP is a
// one-time reward for the underlying accomplishment — not for the checkbox.
// Without `xpAwarded` as a separate, never-reset flag, unchecking then
// rechecking the same task re-triggers the "just completed" branch and pays
// out again, indefinitely (the exact exploit: check → +XP, uncheck, check →
// +XP again). `xpAwarded` only ever flips false→true and is never cleared by
// unchecking, so a given task can earn its XP exactly once, no matter how
// many times it's toggled afterward.
export function toggleTaskDone(plan, date, taskId) {
  let justEarnedXP = false;
  const days = plan.days.map(d => {
    if (d.date !== date) return d;
    return {
      ...d,
      tasks: d.tasks.map(t => {
        if (t.id !== taskId) return t;
        const nextDone = !t.done;
        if (nextDone && !t.xpAwarded) justEarnedXP = true;
        return { ...t, done: nextDone, doneAt: nextDone ? Date.now() : null, xpAwarded: t.xpAwarded || nextDone };
      }),
    };
  });
  return { plan: { ...plan, days, updatedAt: Date.now() }, justEarnedXP };
}

// Manual rescheduling — drag-and-drop, the "Move" day picker, and one-click
// "snooze to tomorrow" all funnel through this single mutation. Moving a task
// off a day clears its `rolledOverFrom` pointer: that field means "this was
// carried here because it was missed", and a task the student *deliberately*
// relocated no longer reads as behind schedule. `toDate` may land beyond
// `plan.daysGeneratedThrough` (dragging far into the visible-but-not-yet-
// "through" tail of the rolling window, or the window boundary itself) — in
// that case a fresh day entry is created in place rather than silently
// dropping the task, so the mutation can never crash or lose data regardless
// of exactly which days already exist in the array.
export function moveTaskToDay(plan, taskId, fromDate, toDate) {
  if (!plan?.days?.length || !taskId || !fromDate || !toDate || fromDate === toDate) return plan;
  const fromDay = plan.days.find(d => d.date === fromDate);
  const task = fromDay?.tasks.find(t => t.id === taskId);
  if (!task) return plan;
  const movedTask = { ...task, id: `${toDate}-moved-${seedFrom(taskId + Date.now())}`, rolledOverFrom: null };
  let days = plan.days.map(d => (d.date === fromDate ? { ...d, tasks: d.tasks.filter(t => t.id !== taskId) } : d));
  const toIdx = days.findIndex(d => d.date === toDate);
  if (toIdx === -1) {
    const weekNumber = weekNumberForDate(plan, toDate);
    const phase = phaseForWeek(plan, weekNumber);
    const newDay = {
      date: toDate,
      dayIndex: days.length + 1,
      weekday: WEEKDAY_NAMES[weekdayIdx(toDate)],
      weekNumber,
      phaseId: phase?.id || null,
      theme: weeklyThemeForWeek(plan, weekNumber)?.theme || 'Steady progress this week',
      tasks: [movedTask],
      reflectionPrompt: null,
    };
    days = [...days, newDay].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  } else {
    days = days.map((d, i) => (i === toIdx ? { ...d, tasks: [...d.tasks, movedTask] } : d));
  }
  const daysGeneratedThrough = plan.daysGeneratedThrough && toDate > plan.daysGeneratedThrough ? toDate : plan.daysGeneratedThrough;
  return { ...plan, days, daysGeneratedThrough, updatedAt: Date.now() };
}

// Within-day drag-to-reorder — `orderedTaskIds` is the full new order for that
// day (any task id it doesn't mention, e.g. one that arrived after the drag
// started, is appended at the end rather than dropped).
export function reorderTasksInDay(plan, date, orderedTaskIds) {
  if (!plan?.days?.length || !date || !Array.isArray(orderedTaskIds) || !orderedTaskIds.length) return plan;
  let changed = false;
  const days = plan.days.map(d => {
    if (d.date !== date) return d;
    const byId = new Map(d.tasks.map(t => [t.id, t]));
    const known = new Set(orderedTaskIds);
    const reordered = orderedTaskIds.map(id => byId.get(id)).filter(Boolean);
    for (const t of d.tasks) if (!known.has(t.id)) reordered.push(t);
    changed = reordered.some((t, i) => t.id !== d.tasks[i]?.id);
    return changed ? { ...d, tasks: reordered } : d;
  });
  return changed ? { ...plan, days, updatedAt: Date.now() } : plan;
}

// Task types the app can verify actually happened, rather than trusting a
// self-reported checkbox — see resolveTaskResource for how resourceKind gets
// set. Quiz/lesson/deck all have a real "completed this in the app" event to
// hook; everything else (activities logged outside the app, essays, deadline
// admin, reflection, rest days, ...) has no such signal and stays a manual,
// self-reported checkbox.
export const AUTO_VERIFIABLE_KINDS = new Set(['quiz', 'lesson', 'deck']);

// Builds an `isMatch(task)` predicate for the common case — a task whose
// resolved resource is exactly this {kind, id} (a specific quiz/lesson/deck).
// `id` may be an array to match any of several (e.g. a Smart Mix session
// completing should also credit a task that names one specific deck).
export function resourceMatch(kind, id) {
  const ids = Array.isArray(id) ? id : [id];
  return (t) => t.resourceKind === kind && ids.includes(t.resourceId);
}

// Task types with no addressable resourceId (Portfolio actions like logging an
// activity, adding a college, sending a coach message) but still a real,
// unambiguous in-app "this happened" signal — matched by task type instead of
// a specific resource. `interview` is included for consistency even though its
// call site predates this helper and in-lines the same predicate.
export const AUTO_VERIFIABLE_TYPES = new Set(['activity', 'college', 'essay', 'clinical', 'research', 'recommender', 'coach', 'interview']);
export function typeMatch(type) { return (t) => t.type === type; }

// Auto-checks off every not-yet-done task across the whole plan (not just
// today — a student who works ahead should still get credit) that `isMatch`
// accepts. This is the real accountability mechanism: for auto-verifiable
// task types (see AUTO_VERIFIABLE_KINDS) the UI removes the manual checkbox
// entirely (see PlansTab's TaskRow), so the *only* way these ever become done
// is by actually doing the linked quiz/lesson/deck — there's no self-report
// path left to game. XP follows the same one-time-only rule as the manual
// toggle above (`xpAwarded`), just set proactively here since there's no
// separate "toggle" event to gate it on.
export function autoCompleteResourceTasks(plan, isMatch) {
  if (!plan?.days?.length || typeof isMatch !== 'function') return { plan, completed: [] };
  const completed = [];
  let changed = false;
  const days = plan.days.map(d => ({
    ...d,
    tasks: d.tasks.map(t => {
      if (t.done || !isMatch(t)) return t;
      changed = true;
      completed.push({ date: d.date, id: t.id, title: t.title });
      return { ...t, done: true, doneAt: Date.now(), xpAwarded: true, autoVerified: true };
    }),
  }));
  if (!changed) return { plan, completed: [] };
  return { plan: { ...plan, days, updatedAt: Date.now() }, completed };
}

// ── Read helpers — shared by the Plans tab UI and the coach system prompt ──
export function getTodayPlanEntry(plan) { return plan?.days?.find(d => d.date === todayStr()) || null; }
export function getCurrentWeekNumber(plan) { return plan?.startDate ? weekNumberForDate(plan, todayStr()) : null; }
export function getCurrentPhase(plan) { const w = getCurrentWeekNumber(plan); return w ? phaseForWeek(plan, w) : null; }
export function getWeekTheme(plan, week) { return weeklyThemeForWeek(plan, week); }
export function getUpcomingDays(plan, n = 7) {
  const today = todayStr();
  return (plan?.days || []).filter(d => d.date >= today).slice(0, n);
}
export function getPlanDay(plan, dateStr) { return plan?.days?.find(d => d.date === dateStr) || null; }
export function getNextPlanDay(plan) {
  const today = todayStr();
  return (plan?.days || []).filter(d => d.date > today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
}

// Plan-specific "on track" streak — distinct from the general study streak in
// db.js — counting consecutive fully-completed days walking backward from
// today. Reads both the live `plan.days` window and the compacted
// `progressLog` (pruneRollingWindow archives older days into
// {date, tasksTotal, tasksDone} entries there) so the streak survives the
// rolling window pruning older days out of full detail. Today doesn't have to
// be finished yet to keep the streak alive — only a fully-elapsed day with
// unfinished tasks breaks it.
export function getPlanStreak(plan) {
  if (!plan) return 0;
  const byDate = new Map();
  for (const d of (plan.days || [])) byDate.set(d.date, { total: d.tasks.length, done: d.tasks.filter(t => t.done).length });
  for (const l of (plan.progressLog || [])) if (!byDate.has(l.date)) byDate.set(l.date, { total: l.tasksTotal, done: l.tasksDone });
  let streak = 0;
  let date = todayStr();
  const todayEntry = byDate.get(date);
  if (todayEntry && todayEntry.total > 0 && todayEntry.done === todayEntry.total) streak++;
  date = addDaysStr(date, -1);
  while (byDate.has(date)) {
    const e = byDate.get(date);
    if (e.total > 0 && e.done === e.total) { streak++; date = addDaysStr(date, -1); }
    else break;
  }
  return streak;
}

// Compact summary folded into buildCoachSystemPrompt so Scout/Guide/Sage all
// know the plan exists and what it says for *right now* — this is the "meta
// brain" link between the Plans tab and the chat coach.
export function summarizePlanForCoach(plan) {
  if (!plan?.headline) return null;
  const weekNumber = getCurrentWeekNumber(plan);
  const phase = getCurrentPhase(plan);
  const weekTheme = weekNumber ? getWeekTheme(plan, weekNumber) : null;
  const today = getTodayPlanEntry(plan);
  return {
    headline: plan.headline,
    horizonWeeks: plan.horizonWeeks,
    weekNumber,
    phaseTitle: phase?.title || null,
    weekTheme: weekTheme?.theme || null,
    todaysTasks: (today?.tasks || []).map(t => t.title),
  };
}

export { todayStr, addDaysStr, daysBetween };
