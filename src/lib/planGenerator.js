// The onboarding "max-out plan" generator. Takes everything onboarding collected and produces one
// rich, personalized plan for the student — the Cal AI-style "we built your plan" payoff, but with
// a real model behind it instead of a canned animation.
//
// Routes through purpose:'plan' (the GROQ_API_KEY_PLAN pool) on the strongest model, since this is
// a once-per-student, high-value generation where quality matters more than cost. It ALWAYS resolves
// to a usable plan: if the network/model fails, a deterministic heuristic plan is returned so the
// onboarding flow can never dead-end waiting on an API.
import { GOAL_OPTIONS, OBSTACLE_OPTIONS, STUDY_METHOD_OPTIONS, ACCOMPLISH_OPTIONS } from '../components/onboarding/Onboarding';

const GRADE_LABELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Applying soon'];
const labelOf = (opts, v) => opts.find(o => o.value === v)?.label || null;
const labelsOf = (opts, arr) => (arr || []).map(v => labelOf(opts, v)).filter(Boolean);

// Study-load numbers derived from onboarding pace — also the fallback plan's headline stats and the
// guidance we hand the model so its plan stays consistent with what the student signed up for.
export function deriveLoad(profile) {
  const dailyMinutes = profile.speedLevel >= 2 ? 60 : profile.speedLevel === 1 ? 40 : 25;
  const weeklyQuestions = profile.speedLevel >= 2 ? 120 : profile.speedLevel === 1 ? 80 : 50;
  return { dailyMinutes, weeklyQuestions };
}

// A complete, sensible plan built with no network — used as the fallback and as the shape contract
// the AI plan must match, so the display code can render either identically.
export function heuristicPlan(profile) {
  const { dailyMinutes, weeklyQuestions } = deriveLoad(profile);
  const track = profile.testTrack || 'SAT';
  const goalLabel = labelOf(GOAL_OPTIONS, profile.goal) || 'building your path into medicine';
  const obstacles = labelsOf(OBSTACLE_OPTIONS, profile.obstacles);
  return {
    headline: `Your ${track} + pre-health game plan`,
    summary: `A balanced plan built around ${dailyMinutes} focused minutes a day — steady ${track} practice paired with the early pre-health foundations that make a future medicine application strong. Designed for where you are now, not where you'll be in four years.`,
    dailyMinutes,
    weeklyQuestions,
    focusAreas: [
      { title: `${track} core skills`, why: `Consistent daily reps are the single biggest lever on your score.` },
      { title: 'Science foundations', why: 'Biology and chemistry basics now make college pre-med far less of a wall later.' },
      { title: 'Early exposure', why: 'Light shadowing/volunteering helps you test whether medicine truly fits — no pressure.' },
    ],
    milestones: [
      { title: 'Find your pathway', when: 'This week', detail: 'Take the diagnostic so your prep is aimed at the health career that fits you.' },
      { title: 'First 100 questions', when: 'Weeks 1-2', detail: `Build the habit — ${weeklyQuestions} ${track} questions a week.` },
      { title: 'A real score bump', when: '~3 months', detail: 'Most students moving at this pace see meaningful gains by the first checkpoint.' },
    ],
    firstWeek: [
      'Take the Pathway Diagnostic',
      `Do your first ${track} practice set`,
      'Start one flashcard deck from your notes',
      obstacles.includes('No structured plan') ? 'Set a daily study reminder' : 'Add one activity to your Portfolio',
    ],
    encouragement: `You're starting earlier than most — that's a real advantage. Small, steady days compound. We've got you.`,
    source: 'fallback',
  };
}

// Build the model prompt from the full profile. Deliberately rich and emotionally aware (this is a
// teenager, not a client), Med-focused but honest that SAT/ACT still matters, and pinned to a strict
// JSON schema so the output renders reliably.
function buildPlanPrompt(profile) {
  const { dailyMinutes, weeklyQuestions } = deriveLoad(profile);
  const facts = [
    `Name: ${profile.name || 'the student'}`,
    `Grade: ${GRADE_LABELS[profile.gradeIdx] || 'high school'}`,
    `Test track: ${profile.testTrack || 'SAT'} (current ~${profile.currentScore}, target ~${profile.targetScore})`,
    `Weekly study time available: ${profile.studyHours || 'unsure'}`,
    `Chosen pace: ${['relaxed', 'steady', 'intense'][profile.speedLevel] || 'steady'} (≈${dailyMinutes} min/day, ${weeklyQuestions} Qs/week)`,
    `Primary goal: ${labelOf(GOAL_OPTIONS, profile.goal) || 'exploring medicine'}`,
    `What they want to accomplish: ${labelsOf(ACCOMPLISH_OPTIONS, profile.accomplish).join(', ') || 'not specified'}`,
    `What's in their way: ${labelsOf(OBSTACLE_OPTIONS, profile.obstacles).join(', ') || 'not specified'}`,
    `Current study method: ${labelOf(STUDY_METHOD_OPTIONS, profile.studyMethod) || 'none yet'}`,
  ].join('\n');

  const system = `You are Medabrain, the head coach of MedSchoolPrep — a platform for high-school students (grades 9-12, ~14-18 years old) exploring a future in medicine or health careers. You are creating this student's ONE personalized starter plan from their onboarding answers. This is the emotional payoff moment of their signup, so make it feel made-for-them, warm, and motivating — but also concrete and honest.

Rules:
- They are years away from medical school. NEVER mention the MCAT, medical-school applications, residency, clinical rotations, MMI, or CASPer. Frame everything as high-school and undergraduate-admissions prep with an eye toward a future health career.
- SAT/ACT prep matters and belongs in the plan, but it is NOT the whole story — balance it with early science foundations, exploration of whether medicine fits, and low-pressure activities. Do not make the plan feel like a test-prep bootcamp.
- Be emotionally attuned: acknowledge their stated obstacles supportively, and keep the tone encouraging and age-appropriate — this is a teenager building confidence.
- Keep the study load consistent with the pace they chose (≈${dailyMinutes} min/day, ${weeklyQuestions} questions/week).

Respond with ONLY a valid JSON object (no markdown, no code fences, no prose before or after) matching exactly this schema:
{
  "headline": "short motivating title, max 8 words",
  "summary": "2-3 warm sentences describing their plan, referencing their actual goal/situation",
  "dailyMinutes": ${dailyMinutes},
  "weeklyQuestions": ${weeklyQuestions},
  "focusAreas": [ {"title": "short", "why": "one sentence"} ],  // exactly 3, balanced across test prep, science foundations, and exploration
  "milestones": [ {"title": "short", "when": "timeframe like 'This week' or '~3 months'", "detail": "one sentence"} ],  // exactly 3, in time order
  "firstWeek": [ "concrete action", "..." ],  // exactly 4 short first-week actions
  "encouragement": "one or two warm, personal closing sentences that name a stated obstacle or goal"
}`;

  return { system, user: `Here is the student's onboarding profile:\n${facts}\n\nGenerate their plan now as JSON only.` };
}

// Defensive JSON extraction — strips accidental code fences / leading prose and grabs the outermost
// object, so a slightly-chatty model still parses.
function parsePlanJSON(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const first = s.indexOf('{'); const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

function validateShape(p) {
  return p && typeof p === 'object'
    && typeof p.summary === 'string'
    && Array.isArray(p.focusAreas) && p.focusAreas.length
    && Array.isArray(p.milestones) && p.milestones.length
    && Array.isArray(p.firstWeek) && p.firstWeek.length;
}

// Public entry point. Always resolves to a usable plan object (never throws).
export async function generateMaxOutPlan(profile) {
  const fallback = heuristicPlan(profile);
  try {
    const { system, user } = buildPlanPrompt(profile);
    const r = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message: user, maxTokens: 1100, purpose: 'plan' }),
    });
    const d = await r.json();
    if (!r.ok) return fallback;
    const parsed = parsePlanJSON(d.content);
    if (!validateShape(parsed)) return fallback;
    // Merge over the fallback so any missing optional fields (headline, stats) are still populated.
    return {
      ...fallback,
      ...parsed,
      dailyMinutes: Number(parsed.dailyMinutes) || fallback.dailyMinutes,
      weeklyQuestions: Number(parsed.weeklyQuestions) || fallback.weeklyQuestions,
      source: 'ai',
    };
  } catch {
    return fallback;
  }
}
