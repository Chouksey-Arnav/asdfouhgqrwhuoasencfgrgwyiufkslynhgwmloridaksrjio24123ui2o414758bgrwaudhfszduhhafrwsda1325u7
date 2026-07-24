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
import { PATHS, GRADE_STAGES, DECK_CATEGORY_ORDER } from '../data/constants';
import { ALL_QUIZZES } from '../data/quizzes/index';
import { ELIB } from '../data/elib';
import { GOAL_OPTIONS, OBSTACLE_OPTIONS, STUDY_METHOD_OPTIONS, ACCOMPLISH_OPTIONS } from '../components/onboarding/Onboarding';
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
  const elibCats = [...new Set(ELIB.map(e => e.cat))];
  const deckCats = DECK_CATEGORY_ORDER.filter(c => c !== 'My Decks');
  const text = [
    `PATHWAY — ${path.label} (this student's current track):`,
    unitLines,
    '',
    `QUIZ LIBRARY: ${ALL_QUIZZES.length} practice quizzes across ${quizLine}`,
    `FLASHCARDS: pre-built decks across ${deckCats.join(', ')}, plus decks the student can generate from their own notes`,
    `E-LIBRARY: ~${ELIB.length} curated articles/videos/courses across ${elibCats.join(', ')}`,
    `AI COACH: Medabrain chat tutor (inside Prep) for questions, explanations, and being quizzed out loud`,
    `PORTFOLIO TOOLS: College List, Essay Workspace, Deadlines Tracker, Financial Aid Tracker, Activities & Resume Builder, Research Experience Log, Skills & Certifications, Clinical Hours Log, Recommenders Tracker, Interview Prep practice, Test Score Tracker, Admissions Calculator`,
  ].join('\n');
  return { text, pathwayLabel: path.label, unitTitles, quizCats };
}

function buildProfileFactsText(user, liveSignals = {}) {
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
  ].filter(Boolean);
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

export async function generateRoadmap(user, liveSignals, catalog) {
  const horizonWeeks = computeHorizonWeeks(user);
  const fallback = heuristicRoadmap(user, horizonWeeks, catalog);
  try {
    const system = buildRoadmapSystemPrompt(horizonWeeks, catalog.text);
    const userMsg = `Here is the student's full profile:\n${buildProfileFactsText(user, liveSignals)}\n\nBuild their ${horizonWeeks}-week roadmap now as JSON only.`;
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

function buildDayChunkSystemPrompt(numDays, catalogText) {
  return `You are Medabrain's Oracle, continuing to build a student's day-by-day study plan inside MedSchoolPrep. Their full roadmap already exists — your job right now is to fill in SPECIFIC, concrete daily tasks for a ${numDays}-day window, fully consistent with the roadmap phase/week themes given below. This should read like an actual day planner a great advisor handed them — not vague ("study science") but specific ("Quiz Library → Physical Sciences → 12 questions on acid-base chemistry, tied to your Chemistry for Medicine unit").

${AGE_APPROPRIATE_RULES}
- Balance across the ${numDays} days: mix Prep (pathway lessons/quizzes/flashcards/library/coach) and Portfolio (colleges/essays/deadlines/activities/clinical hours/research/recommenders/interview prep) — do not make every day only test prep.
- Weekends should be lighter — a shorter catch-up, reflection, or reading day, not a full load.
- Vary task count 3-5 per day depending on how busy that day naturally should be.

Here is the real MedSchoolPrep resource catalog to ground tasks in:
${catalogText}

Respond with ONLY valid JSON (no markdown, no code fences, no prose) matching exactly this schema:
{ "days": [ { "dayIndex": number, "theme": "short line tying the day to its week theme", "tasks": [ { "pillar": "prep|portfolio|progress|rest", "type": "lesson|quiz|flashcards|reading|coach|activity|college|essay|deadline|clinical|research|recommender|interview|reflection|rest", "title": "short specific action, max 12 words", "detail": "one specific sentence naming the actual resource", "estMinutes": number, "resourceTab": "prep|portfolio|progress or null", "resourceView": "the specific sub-view id (e.g. quizzes, pathway, colleges, essays) or null" } ], "reflectionPrompt": "string or null — only on the last day of the window or a natural weekly-reflection day" } ] }
Provide EXACTLY one "days" entry per dayIndex, 1 through ${numDays}, in order.`;
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

// Generates the next `numDays` of daily tasks starting the day after
// plan.daysGeneratedThrough (or `fromDate` for the very first chunk).
export async function generateDayChunk(plan, user, liveSignals, catalog, fromDate, numDays = 7) {
  const fallback = heuristicDays(plan, fromDate, numDays, catalog, user);
  try {
    const dayTable = fallback.map(d => `Day ${d.dayIndex}: ${d.date} (${d.weekday}) — Week ${d.weekNumber}, phase "${phaseForWeek(plan, d.weekNumber)?.title || ''}", week theme: "${weeklyThemeForWeek(plan, d.weekNumber)?.theme || d.theme}"`).join('\n');
    const system = buildDayChunkSystemPrompt(numDays, catalog.text);
    const userMsg = `Roadmap headline: "${plan.headline}"\nOverview: ${plan.overview}\n\nStudent profile:\n${buildProfileFactsText(user, liveSignals)}\n\nDays to fill in:\n${dayTable}\n\nGenerate the tasks for these ${numDays} days now as JSON only.`;
    const parsed = await callOracleWithRetry({ system, user: userMsg, maxTokens: 5500, reasoningEffort: fromDate === plan?.startDate ? 'high' : 'medium' });
    return parsed ? repairDays(parsed, fallback, plan, catalog) : fallback;
  } catch {
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestration — public entry points used by the Plans tab
// ═══════════════════════════════════════════════════════════════════════════
const CHUNK_DAYS = 7;
const ROLLING_WINDOW_DAYS = 14; // how many days of full detail to keep generated ahead of today
const EXTEND_THRESHOLD_DAYS = 3; // trigger the next chunk once this many days of window remain

export async function createMasterPlan(user, liveSignals) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const roadmap = await generateRoadmap(user, liveSignals, catalog);
  const startDate = todayStr();
  const planShell = { ...roadmap, startDate, days: [] };
  const firstChunk = await generateDayChunk(planShell, user, liveSignals, catalog, startDate, CHUNK_DAYS);
  const secondChunk = await generateDayChunk({ ...planShell, days: firstChunk }, user, liveSignals, catalog, addDaysStr(startDate, CHUNK_DAYS), CHUNK_DAYS);
  const days = [...firstChunk, ...secondChunk];
  const now = Date.now();
  return {
    version: 1, ...roadmap, startDate,
    days, daysGeneratedFrom: startDate, daysGeneratedThrough: addDaysStr(startDate, ROLLING_WINDOW_DAYS - 1),
    progressLog: [], createdAt: now, updatedAt: now, lastExtendedAt: now,
  };
}

// Rolls the window forward by one chunk — called when the plan is close to
// running out of generated days. This is the mechanism that keeps the plan
// "continuing to plan" indefinitely instead of going stale.
export async function extendMasterPlan(plan, user, liveSignals) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const from = addDaysStr(plan.daysGeneratedThrough, 1);
  const nextChunk = await generateDayChunk(plan, user, liveSignals, catalog, from, CHUNK_DAYS);
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
export async function regenerateRoadmap(plan, user, liveSignals) {
  const catalog = buildResourceCatalog(user?.specialty || 'exploring');
  const roadmap = await generateRoadmap(user, liveSignals, catalog);
  const startDate = plan?.startDate || todayStr();
  const days = (plan?.days || []).map(d => {
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

export function toggleTaskDone(plan, date, taskId) {
  let justCompleted = false;
  const days = plan.days.map(d => {
    if (d.date !== date) return d;
    return {
      ...d,
      tasks: d.tasks.map(t => {
        if (t.id !== taskId) return t;
        const nextDone = !t.done;
        if (nextDone) justCompleted = true;
        return { ...t, done: nextDone, doneAt: nextDone ? Date.now() : null };
      }),
    };
  });
  return { plan: { ...plan, days, updatedAt: Date.now() }, justCompleted };
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
