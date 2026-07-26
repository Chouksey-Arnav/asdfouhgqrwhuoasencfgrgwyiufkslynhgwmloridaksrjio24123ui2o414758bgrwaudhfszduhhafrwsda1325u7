// The onboarding flow's personalization brain. Pure functions that turn the
// answers collected so far into scenario-specific copy, numbers, and chart
// shapes — so two different students never see the same generic screen.
//
// This replaces the old one-size-fits-all moments (most notoriously "Reaching
// 1540 is a realistic target — it's not hard at all", shown identically to a
// student going 1000→1050 and a student going 1000→1550). Every consumer of
// these helpers renders honest, situation-aware copy instead.
import { DREAM_ROLE_OPTIONS, OBSTACLE_OPTIONS } from './options';

const GRADE_INFO = [
  { label: 'freshman', runway: 'Four full years of runway — you are starting earlier than almost everyone.', urgency: 'low' },
  { label: 'sophomore', runway: 'Three years of runway — early enough that small habits compound into a huge edge.', urgency: 'low' },
  { label: 'junior', runway: 'Junior year is exactly when this push matters most — right on time.', urgency: 'mid' },
  { label: 'senior', runway: 'Senior year moves fast — a focused plan makes every week count.', urgency: 'high' },
  { label: 'rising undergrad', runway: 'You are at the launch point — the work you do now carries straight into college.', urgency: 'high' },
];
export const gradeInfo = (gradeIdx) => GRADE_INFO[gradeIdx] || GRADE_INFO[2];

// Normalize an ACT point gap onto the SAT scale (~1 ACT point ≈ 30 SAT points)
// so one set of bands covers both tracks.
const normDelta = (testTrack, delta) => (testTrack === 'ACT' ? delta * 30 : delta);
// Convert a normalized (SAT-scale) gain back to the student's own scale.
const denorm = (testTrack, n) => (testTrack === 'ACT' ? Math.round(n / 30) : Math.round(n / 10) * 10);

// How many months of runway each test-timeline answer implies. `null` means
// the date is theirs to pick, so the timeline can flex around the goal.
const TIMELINE_MONTHS = { lt3: 2.5, '3-6': 4.5, '6-12': 9, unscheduled: null };
export const timelineMonths = (t) => TIMELINE_MONTHS[t] ?? null;

// The honest ceiling on score improvement.
//
// Anchored to the commonly cited figures for quality practice: roughly 20 hours
// of focused prep is associated with average gains around +115 points, and
// gains flatten well before the theoretical maximum. At a realistic ~5 hours a
// week, that puts a month of genuine work near +60 points, plus about 40 points
// of quick early wins available to almost everyone (pacing, format familiarity,
// knowing the answer-elimination habits).
//
// This is a CEILING used to reject impossible targets, not a promise. Nothing in
// the app should present it as an expected outcome — see scoreScenario below,
// which bands the gap rather than quoting this number to the student.
const POINTS_PER_MONTH = 60;
const EARLY_WINS = 40;
const maxPlausibleGain = (months) => Math.round(months * POINTS_PER_MONTH + EARLY_WINS);
const monthsNeededFor = (n) => Math.max(1, Math.ceil((n - EARLY_WINS) / POINTS_PER_MONTH));

// ── Target-score scenario ────────────────────────────────────────────────────
// Bands the current→target gap into one of six honest scenarios — including
// "your score is basically done" (1590→1600) and "this gap does not fit your
// timeline" (600→1600 in 3 months), which the flow states bluntly instead of
// cheering the student toward a wall. Each band carries its own headline,
// tone, timeline, and chart milestones.
export function scoreScenario(answers) {
  const { testTrack = 'SAT', currentScore = 1000, targetScore = 1200, gradeIdx = 2, testTimeline } = answers;
  const delta = targetScore - currentScore;
  const n = normDelta(testTrack, delta);
  const g = gradeInfo(gradeIdx);
  const runway = timelineMonths(testTimeline);

  // Intermediate checkpoint scores for the projection chart (quarter marks).
  const mid = (f) => testTrack === 'ACT'
    ? Math.round(currentScore + delta * f)
    : Math.round((currentScore + delta * f) / 10) * 10;

  if (n <= 0) {
    return {
      band: 'beyond', months: 2, delta,
      headline: `You're already at ${targetScore} — so the test isn't your battle.`,
      sub: `Your score clears your target today. For a future in medicine, the next points on the board are experiences, coursework, and your story.`,
      note: `We'll keep your ${testTrack} sharp with light maintenance — and pour the real energy into the parts of your application that medicine actually weighs.`,
      milestones: [],
    };
  }
  // Tiny gap (≈ 1590→1600, 34→35 ACT): fine-tuning, not a campaign. Say so.
  if (n <= 40) {
    return {
      band: 'polish', months: 1.5, delta,
      headline: `+${delta} point${Math.abs(delta) === 1 ? '' : 's'}? Honestly — your score is nearly done.`,
      sub: `A gap this small is fine-tuning, not a grind. A few targeted practice sets close it. The real growth ahead of you is clinical experience, science depth, and your application story.`,
      note: `We'll schedule light, precise ${testTrack} polish — and shift most of your weekly time to building the pre-med foundation that will actually set you apart.`,
      milestones: [{ f: 0.5, score: mid(0.6), label: 'Week 2' }],
    };
  }
  // The gap physically doesn't fit the runway they chose. Be direct: show what
  // IS reachable by their date, and what the full goal actually takes.
  if (runway != null && n > maxPlausibleGain(runway)) {
    const achievable = currentScore + denorm(testTrack, maxPlausibleGain(runway));
    const needed = monthsNeededFor(n);
    return {
      band: 'reset', months: runway, delta, achievable, monthsNeeded: needed,
      headline: `We have to be straight with you: +${delta} in ${runway < 3 ? 'under 3 months' : `~${Math.round(runway)} months`} isn't realistic.`,
      sub: `No app that respects you should promise that jump on that clock. Here's what the data supports: from ${currentScore}, disciplined daily prep gets you to about ${achievable} by your test date — a real, meaningful gain.`,
      note: `The full climb to ${targetScore} is a ~${needed}-month campaign. Your plan will target ${achievable} for this sitting and map the retake path to ${targetScore} — so every week still moves you toward medicine, without the burnout.`,
      milestones: [{ f: 0.55, score: Math.round((currentScore + (achievable - currentScore) * 0.6) / (testTrack === 'ACT' ? 1 : 10)) * (testTrack === 'ACT' ? 1 : 10), label: 'Midpoint' }],
    };
  }
  if (n <= 100) {
    return {
      band: 'reach', months: 2, delta,
      headline: `+${delta} points? That's well within your reach.`,
      sub: `Students starting near ${currentScore} typically clear ${targetScore} in about 6–8 weeks of consistent practice.`,
      note: g.runway,
      milestones: [{ f: 0.55, score: mid(0.6), label: 'Week 3' }],
    };
  }
  if (n <= 250) {
    return {
      band: 'solid', months: 3, delta,
      headline: `${targetScore} is a realistic target — with a real plan.`,
      sub: `A +${delta} jump is very doable. It won't happen by accident, but students who follow a structured ${testTrack} plan get there in about 3 months.`,
      note: g.runway,
      milestones: [{ f: 0.4, score: mid(0.45), label: 'Month 1' }, { f: 0.75, score: mid(0.8), label: 'Month 2' }],
    };
  }
  // Big but feasible gap. If we know their runway, pace the campaign to it —
  // and flag when it's tight enough that the margin for drift is basically zero.
  const months = runway != null ? Math.min(Math.max(monthsNeededFor(n), 3), Math.round(runway)) : (g.urgency === 'high' ? 5 : 6);
  const tight = runway != null && n > runway * 55;
  return {
    band: 'climb', months, delta,
    headline: `+${delta} points is an ambitious climb — and we've mapped every step.`,
    sub: tight
      ? `Straight talk: this fits your timeline, but only just. It means showing up nearly every day — no cushion for lost weeks. Students who make jumps like this treat it as a ${months}-month campaign with weekly checkpoints.`
      : `We won't pretend a jump like this is easy. Students who make it treat it as a ${months}-month campaign with weekly checkpoints — exactly the plan we'll build for you.`,
    note: g.urgency === 'high'
      ? `As a ${g.label}, your timeline is tight — which is exactly why a week-by-week plan beats cramming.`
      : g.runway,
    milestones: [{ f: 0.3, score: mid(0.35), label: 'Month 2' }, { f: 0.62, score: mid(0.68), label: `Month ${Math.max(3, months - 1)}` }],
  };
}

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
  anxiety: { title: 'You told us: "Test anxiety gets to me."', line: 'The antidote to test anxiety is familiarity. Enough low-stakes reps that test day feels like just another practice set — that\'s built into your plan.' },
  motivation: { title: 'You told us: "I lose motivation."', line: 'Motivation fades; systems don\'t. Streaks, milestones, and visible progress are wired into your plan so momentum carries you on the days willpower won\'t.' },
  no_plan: { title: 'You told us: "I\'ve never had a real plan."', line: 'You\'re about two minutes away from one — personalized to your grade, your score, your schedule, and your goal.' },
};
export function obstacleEmpathy(obstacles = []) {
  const first = obstacles.find(v => OBSTACLE_RESPONSES[v]);
  if (!first) return null;
  const others = obstacles.filter(v => v !== first).map(v => OBSTACLE_OPTIONS.find(o => o.value === v)?.label).filter(Boolean);
  return { ...OBSTACLE_RESPONSES[first], others };
}

// ── Daily commitment ─────────────────────────────────────────────────────────
// The time-commitment step (minutes/day, Cal AI-style — replaces the old
// "points per week" slider that offered a 1590 student 50 pts/week). What the
// minutes buy depends on the student's actual score gap: a nearly-done score
// means the time flows to experiences and application work, an impossible-
// timeline gap means we recommend the higher gears honestly.
export const COMMIT_LEVELS = [
  { minutes: 20, label: 'Light', tagline: 'Steady, sustainable, fits any season' },
  { minutes: 40, label: 'Balanced', tagline: 'The pace most students keep for months', recommended: true },
  { minutes: 60, label: 'Serious', tagline: 'Real momentum, visible week to week' },
  { minutes: 90, label: 'All-in', tagline: 'Maximum pace — best with a firm test date' },
];
export function commitmentIntel(answers, level = 1) {
  const sc = scoreScenario(answers);
  const lvl = COMMIT_LEVELS[level] || COMMIT_LEVELS[1];
  const hrs = Math.round((lvl.minutes * 7) / 60 * 10) / 10;
  const base = `≈ ${hrs} focused hours a week, split across everything your path needs.`;
  if (sc.band === 'beyond' || sc.band === 'polish') {
    return {
      ...lvl, hours: hrs,
      split: 'Mostly experiences, science depth & application — light score maintenance',
      desc: `${base} Since your score is ${sc.band === 'beyond' ? 'already there' : 'nearly done'}, most of this time goes where it moves you furthest now: clinical exposure, coursework, and your story.`,
    };
  }
  if (sc.band === 'reset') {
    return {
      ...lvl, hours: hrs,
      split: 'Prep-heavy — daily practice plus one pre-med move a week',
      desc: level >= 2
        ? `${base} With the climb ahead of you, this is the right gear — daily practice with weekly checkpoints, plus one pre-med step each week so the rest of your path keeps moving.`
        : `${base} Given how much ground you're covering before test day, we'd honestly recommend a higher gear — but a consistent ${lvl.minutes} minutes still beats an ambitious zero.`,
    };
  }
  return {
    ...lvl, hours: hrs,
    split: 'Score growth + one pre-med move each week',
    desc: `${base} Enough for steady progress toward ${answers.targetScore || 'your target'} — while still landing one real pre-med step (shadowing, volunteering, portfolio) every single week.`,
  };
}

// ── Journey forecast ─────────────────────────────────────────────────────────
// The projection screen after choosing a commitment: the whole path into
// medicine at their pace — score trajectory as one thread of it, not the story.
export function journeyForecast(answers) {
  const { currentScore = 1000, targetScore = 1200, testTrack = 'SAT', speedLevel = 1, testTimeline } = answers;
  const sc = scoreScenario(answers);
  const paceBoost = [0.85, 1, 1.2, 1.4][speedLevel] || 1;
  const months = Math.max(1.5, Math.round((sc.months / paceBoost) * 2) / 2);
  const urgentTest = testTimeline === 'lt3';
  const scoreDone = sc.band === 'beyond' || sc.band === 'polish';
  const endScore = sc.band === 'reset' ? sc.achievable : Math.max(targetScore, currentScore);
  return {
    months, currentScore, targetScore, testTrack,
    endScore, scoreDone,
    headline: scoreDone
      ? 'Here\'s what your time builds instead.'
      : urgentTest ? 'Your test is close — here\'s your sprint.' : 'Here\'s what your pace unlocks.',
    sub: scoreDone
      ? `With your score handled, ${months < 3 ? 'the next few months' : `the next ~${Math.round(months)} months`} go into what medicine actually screens for — real experiences, real coursework, a real story.`
      : sc.band === 'reset'
        ? `At this pace we're targeting ${endScore} by your test date — the honest maximum — with the retake path to ${targetScore} already mapped.`
        : urgentTest
          ? `With your ${testTrack} inside 3 months, we'll front-load your highest-impact weaknesses first — the fastest points on the board — while your pre-med foundation keeps building.`
          : `At this pace, students starting near ${currentScore} typically reach ${targetScore} in about ${months} month${months === 1 ? '' : 's'} — with a growing pre-med portfolio alongside it.`,
    threads: scoreDone
      ? [
        { label: 'Clinical & hands-on experience', detail: 'Shadowing, volunteering, certifications — logged and story-ready' },
        { label: 'Science foundation', detail: 'Coursework mapped to the pre-med track, gaps closed early' },
        { label: 'Application & story', detail: 'Essays, activities list, and a narrative colleges remember' },
      ]
      : [
        { label: `${testTrack} trajectory`, detail: sc.band === 'reset' ? `${currentScore} → ~${endScore} by test day, then the retake climb` : `${currentScore} → ${targetScore}, checkpoint by checkpoint` },
        { label: 'Pre-med foundation', detail: 'One real step a week — experience, science, story' },
        { label: 'Momentum you can see', detail: 'Streaks, milestones, and progress that compounds' },
      ],
  };
}
