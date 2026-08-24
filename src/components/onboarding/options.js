// Every onboarding question's option list, in one dependency-free module.
//
// These used to live inside Onboarding.jsx, but the step components and the
// personalization logic both need them too — importing them from the flow
// component would create an import cycle (Onboarding → steps → Onboarding).
// Onboarding.jsx re-exports everything here, so existing imports in App.jsx,
// planGenerator.js, studentProfile.js and masterPlanGenerator.js keep working.
//
// ── Three fields, and why each exists ────────────────────────────────────────
//   `icon`  — a NAME from src/components/onboarding/icons.jsx, not an emoji.
//             This file is plain JS with no JSX, so the mark is referenced by
//             string and resolved at render. Every option used to carry an
//             emoji; see the header of icons.jsx for why they are all gone.
//   `short` — how this answer reads in the live chart on the story rail, where
//             there is room for two or three words and no room for "Building
//             the coursework and science depth a pre-med path expects". A
//             `label` is written to be chosen; a `short` is written to be
//             read back.
//   `meter` — 0..4, only on the GPA list. That question is the one place in the
//             flow where the options are a RANKED scale rather than a set of
//             alternatives, and drawing it as a four-bar level does in one
//             glance what five differently-worded sublabels cannot.
//
// `value` and `label` are load-bearing outside this file (planGenerator,
// masterPlanGenerator, studentProfile, personalize) and are unchanged.

export const STUDY_HOURS_OPTIONS = [
  { value: '0-5', icon: 'sprout', short: '0–5 hrs/wk', label: '0-5 hrs / week', sublabel: 'Just getting started' },
  { value: '6-14', icon: 'bolt', short: '6–14 hrs/wk', label: '6-14 hrs / week', sublabel: 'Building real momentum' },
  { value: '15+', icon: 'rocket', short: '15+ hrs/wk', label: '15+ hrs / week', sublabel: 'Highly dedicated' },
];

export const GOAL_OPTIONS = [
  { value: 'boost_score', icon: 'trend-up', short: 'Academics', label: 'Strengthen my academics', sublabel: 'Build the coursework and science depth a pre-med path expects' },
  { value: 'build_application', icon: 'trophy', short: 'Application', label: 'Build a standout pre-med application', sublabel: 'Experiences, story, and a portfolio that gets noticed' },
  { value: 'explore_pathway', icon: 'compass', short: 'Exploring fit', label: 'Discover if medicine is right for me', sublabel: 'Explore careers, specialties, and what the life is really like' },
];

export const STUDY_METHOD_OPTIONS = [
  { value: 'none', icon: 'backpack', short: 'Nothing yet', label: 'No structured method yet' },
  { value: 'khan', icon: 'book', short: 'Khan Academy', label: 'Khan Academy' },
  { value: 'princeton', icon: 'books', short: 'Princeton Review', label: 'The Princeton Review' },
  { value: 'kaplan', icon: 'books', short: 'Kaplan', label: 'Kaplan' },
  { value: 'school', icon: 'school', short: 'School only', label: 'School curriculum only' },
  { value: 'tutor', icon: 'mentor', short: 'A tutor', label: 'Tutor or mentor' },
];

export const OBSTACLE_OPTIONS = [
  { value: 'what_to_study', icon: 'fog', short: 'Focus', label: 'Not knowing what to focus on' },
  { value: 'guidance', icon: 'compass', short: 'Guidance', label: 'No mentor or guidance into medicine' },
  { value: 'busy', icon: 'calendar-busy', short: 'Time', label: 'A packed schedule' },
  { value: 'anxiety', icon: 'unsteady', short: 'Exam nerves', label: 'Exam & performance anxiety' },
  { value: 'motivation', icon: 'battery-low', short: 'Motivation', label: 'Losing motivation' },
  { value: 'no_plan', icon: 'puzzle', short: 'No plan', label: 'No structured plan' },
];

export const ACCOMPLISH_OPTIONS = [
  { value: 'score', icon: 'trend-up', short: 'Grades', label: 'Strengthen my academics & grades' },
  { value: 'application', icon: 'trophy', short: 'Application', label: 'Build a competitive pre-med application' },
  { value: 'explore', icon: 'compass', short: 'My fit', label: 'Find my fit in medicine' },
  { value: 'experience', icon: 'stethoscope', short: 'Experience', label: 'Gain clinical or research experience' },
  { value: 'gpa', icon: 'books', short: 'GPA', label: 'Raise my GPA for pre-health admissions' },
  { value: 'consistency', icon: 'flame', short: 'Consistency', label: 'Stay motivated & consistent' },
];

// ── Med-focused profile questions ────────────────────────────────────────────
// Everything below exists to make the generated plan genuinely personal: each
// answer is persisted onto the user record and fed to the plan + coach prompts.

export const WHY_MEDICINE_OPTIONS = [
  { value: 'help_people', icon: 'heart-hand', short: 'To help people', label: 'I want to help people', sublabel: 'Caring for others is what drives me' },
  { value: 'science', icon: 'microscope', short: 'The science', label: 'I love science & the human body', sublabel: 'Biology and medicine fascinate me' },
  { value: 'personal', icon: 'pulse-heart', short: 'Something personal', label: 'A personal or family experience', sublabel: 'An illness or a caregiver inspired me' },
  { value: 'family_field', icon: 'physician', short: 'Family in medicine', label: 'Family or mentors in medicine', sublabel: "I've seen the life up close" },
  { value: 'challenge', icon: 'summit', short: 'The challenge', label: 'The challenge & the career', sublabel: 'A demanding, respected, secure path' },
  { value: 'unsure', icon: 'question', short: 'Still figuring it out', label: "I'm still figuring that out", sublabel: "That's a completely valid place to start" },
];

export const DREAM_ROLE_OPTIONS = [
  { value: 'physician', icon: 'stethoscope', short: 'Physician', label: 'Physician / surgeon', sublabel: 'Diagnosing, treating, operating' },
  { value: 'nurse', icon: 'syringe', short: 'Nurse', label: 'Nurse / nurse practitioner', sublabel: 'Frontline patient care' },
  { value: 'pa', icon: 'clipboard-plus', short: 'PA', label: 'Physician assistant', sublabel: 'Medicine with flexibility' },
  { value: 'mental_health', icon: 'brain', short: 'Mental health', label: 'Psychiatry / Mental health', sublabel: 'Caring for the mind' },
  { value: 'research', icon: 'atom', short: 'Research', label: 'Medical research / Biotech', sublabel: 'Discovering the next cure' },
  { value: 'other_health', icon: 'capsule', short: 'Health career', label: 'Another health career', sublabel: 'Pharmacy, PT, public health…' },
  { value: 'undecided', icon: 'star', short: 'Undecided', label: 'Not sure yet', sublabel: "We'll help you find your fit" },
];

export const CERTAINTY_OPTIONS = [
  { value: 'all_in', icon: 'flame', short: 'All in', label: "I'm all in", sublabel: 'Medicine is the plan — full stop' },
  { value: 'fairly_sure', icon: 'thumb-up', short: 'Fairly sure', label: 'Fairly sure', sublabel: 'Leaning strongly toward health care' },
  { value: 'exploring', icon: 'compass', short: 'Exploring', label: 'Still exploring', sublabel: 'Seriously curious, keeping options open' },
];

// `meter` is the ranked level drawn in place of an icon; see the header note.
export const GPA_OPTIONS = [
  { value: 'mostly_a', meter: 4, short: "Mostly A's", label: "Mostly A's", sublabel: '~3.8+ unweighted' },
  { value: 'a_b', meter: 3, short: "A's and B's", label: "A's and B's", sublabel: '~3.3 – 3.7' },
  { value: 'mostly_b', meter: 2, short: "Mostly B's", label: "Mostly B's", sublabel: '~3.0 – 3.3' },
  { value: 'below_b', meter: 1, short: "C's or below", label: "C's or below", sublabel: "We'll build from here — no judgment" },
  { value: 'unsure', icon: 'question', short: 'Not sure', label: 'Not sure', sublabel: "We'll figure it out together" },
];

export const SCIENCE_OPTIONS = [
  { value: 'biology', icon: 'dna', short: 'Biology', label: 'Biology' },
  { value: 'chemistry', icon: 'flask', short: 'Chemistry', label: 'Chemistry' },
  { value: 'physics', icon: 'magnet', short: 'Physics', label: 'Physics' },
  { value: 'ap_bio', icon: 'petri', short: 'AP Bio', label: 'AP / IB biology' },
  { value: 'ap_chem', icon: 'test-tubes', short: 'AP Chem', label: 'AP / IB chemistry' },
  { value: 'anatomy', icon: 'organ-heart', short: 'Anatomy', label: 'Anatomy / physiology' },
  { value: 'none_yet', icon: 'sprout', short: 'None yet', label: 'None of these yet' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'volunteering', icon: 'hospital', short: 'Volunteering', label: 'Hospital or clinic volunteering' },
  { value: 'shadowing', icon: 'observe', short: 'Shadowing', label: 'Shadowed a doctor or nurse' },
  { value: 'club', icon: 'medal', short: 'Med club', label: 'HOSA / med club / science fair' },
  { value: 'cpr', icon: 'pulse-heart', short: 'CPR certified', label: 'CPR / first-aid certified' },
  { value: 'family_care', icon: 'hands-care', short: 'Caregiving', label: 'Cared for a family member' },
  { value: 'none', icon: 'sprout', short: 'Starting fresh', label: 'Nothing yet — starting fresh' },
];

export const TEST_TIMELINE_OPTIONS = [
  { value: 'lt3', icon: 'hourglass', short: '< 3 months', label: 'Within 3 months', sublabel: "It's close — we'll make every day count" },
  { value: '3-6', icon: 'calendar-busy', short: '3–6 months', label: 'In 3–6 months', sublabel: 'The sweet spot for a full prep cycle' },
  { value: '6-12', icon: 'clock', short: '6–12 months', label: 'In 6–12 months', sublabel: 'Plenty of runway to build mastery' },
  { value: 'unscheduled', icon: 'question', short: 'Not scheduled', label: 'Not scheduled yet', sublabel: "We'll help you pick the right date" },
];

/** The `short` form of an answer, for the live chart. Falls back to the label. */
export function shortLabel(options, value) {
  const o = options.find(x => x.value === value);
  return o ? (o.short || o.label) : null;
}

// ── Band-specific questions ──────────────────────────────────────────────────
// Asked only of the grade band that can actually answer them usefully. See
// src/lib/onboardingFlow.js for why the tail of the flow branches at all.

// EXPLORE (9th–10th). What science are you in this year — the single fact that
// decides which lesson units land and which quizzes are worth recommending to a
// student who has not taken chemistry yet.
export const SCIENCE_CLASS_OPTIONS = [
  { value: 'bio', icon: 'dna', short: 'Biology', label: 'Biology', sublabel: 'The usual 9th or 10th grade science' },
  { value: 'chem', icon: 'flask', short: 'Chemistry', label: 'Chemistry' },
  { value: 'physics', icon: 'magnet', short: 'Physics', label: 'Physics or physical science' },
  { value: 'anatomy', icon: 'organ-heart', short: 'Anatomy', label: 'Anatomy / physiology' },
  { value: 'ap', icon: 'petri', short: 'An AP science', label: 'An AP or IB science' },
  { value: 'other', icon: 'question', short: 'Something else', label: 'Something else, or none this year' },
];

// EXPLORE + BUILD. The student's OWN weekly goal, in their words and their
// numbers — the plan is built to it, so a number they picked is worth more than
// a better one we chose for them.
export const WEEKLY_GOAL_OPTIONS = [
  { value: 'light', icon: 'sprout', short: '2 days/wk', label: 'Two days a week', sublabel: 'Realistic alongside a full course load' },
  { value: 'steady', icon: 'bolt', short: '4 days/wk', label: 'Four days a week', sublabel: 'Where most students land' },
  { value: 'daily', icon: 'flame', short: 'Every day', label: 'Almost every day', sublabel: "Ambitious — we'll hold you to it gently" },
  { value: 'weekend', icon: 'clock', short: 'Weekends', label: 'Weekends only', sublabel: 'Two longer sessions instead of five short ones' },
];

// BUILD (11th). When the test happens is the spine of a junior year plan.
export const TESTING_PLAN_OPTIONS = [
  { value: 'fall_junior', icon: 'hourglass', short: 'This fall', label: 'This fall', sublabel: 'Fall of junior year — the early attempt' },
  { value: 'spring_junior', icon: 'calendar-busy', short: 'Spring', label: 'Spring of junior year', sublabel: 'The most common first sitting' },
  { value: 'summer', icon: 'clock', short: 'Summer', label: 'Summer after junior year', sublabel: 'Before senior-year applications open' },
  { value: 'fall_senior', icon: 'flag-check', short: 'Senior fall', label: 'Fall of senior year', sublabel: 'Cutting it close, but it still works' },
  { value: 'undecided', icon: 'question', short: 'Not decided', label: "Haven't decided yet", sublabel: "We'll pick a date with you" },
  { value: 'test_optional', icon: 'eye-off', short: 'Test optional', label: 'Going test-optional', sublabel: "Then the rest of the application carries more weight" },
];

// APPLY (12th). Deadline triage — the two questions that decide whether this
// senior's real deadline is eleven weeks away or five months away.
export const EARLY_APPLICATION_OPTIONS = [
  { value: 'ed', icon: 'flame', short: 'Early decision', label: 'Yes — early decision somewhere', sublabel: 'Binding. Usually November 1 or 15.' },
  { value: 'ea', icon: 'bolt', short: 'Early action', label: 'Yes — early action', sublabel: 'Non-binding, same early deadlines' },
  { value: 'rolling', icon: 'repeat', short: 'Rolling', label: 'Rolling admissions schools', sublabel: 'Earlier is materially better on these' },
  { value: 'regular', icon: 'clock', short: 'Regular only', label: 'No — regular decision only', sublabel: 'Mostly January 1 and January 15' },
  { value: 'unsure', icon: 'question', short: 'Not sure', label: "I don't know yet", sublabel: "We'll show you both calendars" },
];

export const COMBINED_PROGRAM_OPTIONS = [
  { value: 'yes_applying', icon: 'summit', short: 'Yes, applying', label: 'Yes — I am applying to some', sublabel: 'BS/MD, BS/DO, direct-admit nursing or PA' },
  { value: 'considering', icon: 'compass', short: 'Considering', label: 'Considering it', sublabel: 'Their deadlines run earlier than everything else' },
  { value: 'no', icon: 'route', short: 'No', label: 'No — traditional applications', sublabel: 'Undergrad first, health school later' },
  { value: 'what', icon: 'question', short: 'What are those?', label: "What are those?", sublabel: "Worth two minutes — we'll show you" },
];
