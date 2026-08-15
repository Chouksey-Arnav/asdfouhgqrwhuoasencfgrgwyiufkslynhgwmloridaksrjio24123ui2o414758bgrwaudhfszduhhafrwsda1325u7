// The onboarding flow's personalization brain. Pure functions that turn the
// answers collected so far into scenario-specific copy, numbers, and chart
// shapes — so two different students never see the same generic screen.
//
// This replaces the old one-size-fits-all moments. Every consumer of these
// helpers renders honest, situation-aware copy instead.
//
// Nothing here talks about test scores any more. Standardized-test prep is the
// SAT pillar, and that pillar is sealed for version one (src/lib/betaFlags.js) —
// so the flow no longer asks for a current or target score, and no longer
// forecasts one. Promising a score jump the product cannot help a student make
// would be the same dishonesty this file was written to remove.
import { DREAM_ROLE_OPTIONS, OBSTACLE_OPTIONS } from './options';

const GRADE_INFO = [
  { label: 'freshman', runway: 'Four full years of runway — you are starting earlier than almost everyone.', urgency: 'low' },
  { label: 'sophomore', runway: 'Three years of runway — early enough that small habits compound into a huge edge.', urgency: 'low' },
  { label: 'junior', runway: 'Junior year is exactly when this push matters most — right on time.', urgency: 'mid' },
  { label: 'senior', runway: 'Senior year moves fast — a focused plan makes every week count.', urgency: 'high' },
  { label: 'rising undergrad', runway: 'You are at the launch point — the work you do now carries straight into college.', urgency: 'high' },
];
// What to say before we know. The identity beat runs BEFORE the grade question
// (see buildSteps in Onboarding.jsx), so falling back to the junior entry meant
// every student was told "Junior year is exactly when this push matters most"
// on a screen that had no idea what year they were in — a personalized line
// that was personalized to nobody, which is precisely the tell this redesign
// exists to remove. When the year is unknown we say something that is true for
// everyone instead of guessing.
const GRADE_UNKNOWN = {
  label: 'week',
  runway: 'Whatever year you are in, the next few answers set the pace.',
  urgency: 'mid',
};
export const gradeInfo = (gradeIdx) => (gradeIdx == null ? GRADE_UNKNOWN : (GRADE_INFO[gradeIdx] || GRADE_INFO[2]));

// ── Runway ───────────────────────────────────────────────────────────────────
// How many months of runway the student's own timeline answer implies. `null`
// means the date is theirs to pick, so the plan can flex around the goal.
const TIMELINE_MONTHS = { lt3: 2.5, '3-6': 4.5, '6-12': 9, unscheduled: null };
export const timelineMonths = (t) => TIMELINE_MONTHS[t] ?? null;

// ── Identity moment ──────────────────────────────────────────────────────────
// The affirmation screen right after the dream-role question. Copy adapts to
// both the role they picked and how certain they said they are.
const ROLE_TITLES = {
  physician: 'Future Physician',
  nurse: 'Future Nurse',
  pa: 'Future Physician Assistant',
  mental_health: 'Future Mental Health Clinician',
  research: 'Future Medical Researcher',
  other_health: 'Future Health Professional',
  undecided: 'Future Healer',
};
export function identityContent(answers) {
  const { dreamRole, certainty, gradeIdx } = answers;
  const roleLabel = DREAM_ROLE_OPTIONS.find(o => o.value === dreamRole)?.label;
  const title = ROLE_TITLES[dreamRole] || 'Future Health Professional';
  const g = gradeInfo(gradeIdx);
  if (certainty === 'exploring' || dreamRole === 'undecided') {
    return {
      title: 'Your path starts here',
      eyebrow: 'No pressure — just possibility',
      line: `Not being 100% sure is the smartest place to start. Most people never test the idea at all — you're actually doing it. We'll help you explore medicine honestly, so whatever you choose, you choose it with your eyes open.`,
      sub: g.runway,
      cta: "Let's find out",
    };
  }
  return {
    title,
    eyebrow: 'Say it out loud',
    line: `Every ${roleLabel ? roleLabel.toLowerCase().replace(/ \/.*$/, '') : 'doctor'} you've ever met stood exactly where you're standing — a high schooler with a goal and no map. The goal is yours. The map is our job.`,
    sub: g.runway,
    cta: "That's me",
  };
}

// ── Experience insight ───────────────────────────────────────────────────────
// After the hands-on-experience checklist: normalize a blank slate, or turn a
// non-empty one into evidence they're ahead.
export function experienceInsight(experience = []) {
  const real = experience.filter(v => v !== 'none');
  if (real.length === 0) {
    return {
      variant: 'fresh',
      title: "Starting from zero? So did almost everyone.",
      sub: 'Most students interested in medicine begin high school with no clinical exposure at all.',
      stat: 'The difference isn\'t where you start — it\'s having a plan for what to do next. Yours will include your first real-world step.',
      bars: [{ label: 'Start with no experience', pct: 0.78, highlight: true }, { label: 'Start with experience', pct: 0.22 }],
    };
  }
  return {
    variant: 'ahead',
    title: `You're already ahead of the curve.`,
    sub: `${real.length === 1 ? 'That experience' : `Those ${real.length} experiences`} put${real.length === 1 ? 's' : ''} you in front of most students your age — most start with none.`,
    stat: 'Your plan will build on what you\'ve already done — turning early exposure into a story colleges actually notice.',
    bars: [{ label: 'You', pct: Math.min(0.55 + real.length * 0.12, 0.92), highlight: true }, { label: 'Typical student', pct: 0.3 }],
  };
}

// ── Obstacle empathy ─────────────────────────────────────────────────────────
// Mirrors the student's top obstacle back with a concrete answer for it.
const OBSTACLE_RESPONSES = {
  what_to_study: { title: 'You told us: "I don\'t know what to study."', line: 'That ends today. Your plan spells out exactly what to work on every single day — no more guessing, no more doom-scrolling study tips.' },
  guidance: { title: 'You told us: "I don\'t have guidance."', line: 'Consider that solved. You\'ll have a structured pathway and an AI coach that knows your goals — the mentorship most students never get.' },
  busy: { title: 'You told us: "My schedule is packed."', line: 'Your plan is built around short, high-yield sessions that fit between practice, clubs, and life — consistency over marathon cramming.' },
  anxiety: { title: 'You told us: "Exam anxiety gets to me."', line: 'The antidote to exam anxiety is familiarity. Enough low-stakes reps that an exam feels like just another quiz — that\'s built into your plan.' },
  motivation: { title: 'You told us: "I lose motivation."', line: 'Motivation fades; systems don\'t. Streaks, milestones, and visible progress are wired into your plan so momentum carries you on the days willpower won\'t.' },
  no_plan: { title: 'You told us: "I\'ve never had a real plan."', line: 'You\'re about two minutes away from one — personalized to your grade, your coursework, your schedule, and your goal.' },
};
export function obstacleEmpathy(obstacles = []) {
  const first = obstacles.find(v => OBSTACLE_RESPONSES[v]);
  if (!first) return null;
  const others = obstacles.filter(v => v !== first).map(v => OBSTACLE_OPTIONS.find(o => o.value === v)?.label).filter(Boolean);
  return { ...OBSTACLE_RESPONSES[first], others };
}

// ── Daily commitment ─────────────────────────────────────────────────────────
// The time-commitment step (minutes/day, Cal AI-style). What the minutes buy
// is the pre-med path itself: science depth, real-world experience, and the
// application story — the three things this product actually builds.
export const COMMIT_LEVELS = [
  { minutes: 20, label: 'Light', tagline: 'Steady, sustainable, fits any season' },
  { minutes: 40, label: 'Balanced', tagline: 'The pace most students keep for months', recommended: true },
  { minutes: 60, label: 'Serious', tagline: 'Real momentum, visible week to week' },
  { minutes: 90, label: 'All-in', tagline: 'Maximum pace — best when a deadline is close' },
];
export function commitmentIntel(answers, level = 1) {
  const lvl = COMMIT_LEVELS[level] || COMMIT_LEVELS[1];
  const hrs = Math.round((lvl.minutes * 7) / 60 * 10) / 10;
  const g = gradeInfo(answers?.gradeIdx);
  const base = `≈ ${hrs} focused hours a week, split across everything your path needs.`;
  return {
    ...lvl, hours: hrs,
    split: 'Science foundation + one pre-med move each week',
    desc: `${base} Enough to keep your coursework and science depth moving — while still landing one real pre-med step (shadowing, volunteering, portfolio) every single week. ${g.runway}`,
  };
}
