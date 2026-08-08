// Every onboarding question's option list, in one dependency-free module.
//
// These used to live inside Onboarding.jsx, but the step components and the
// personalization logic both need them too — importing them from the flow
// component would create an import cycle (Onboarding → steps → Onboarding).
// Onboarding.jsx re-exports everything here, so existing imports in App.jsx,
// planGenerator.js, studentProfile.js and masterPlanGenerator.js keep working.

export const STUDY_HOURS_OPTIONS = [
  { value: '0-5', emoji: '🌱', label: '0-5 hrs / week', sublabel: 'Just getting started' },
  { value: '6-14', emoji: '⚡', label: '6-14 hrs / week', sublabel: 'Building real momentum' },
  { value: '15+', emoji: '🚀', label: '15+ hrs / week', sublabel: 'Highly dedicated' },
];

export const GOAL_OPTIONS = [
  { value: 'boost_score', emoji: '📈', label: 'Strengthen my academics & test readiness', sublabel: 'Build the scores a pre-med path expects' },
  { value: 'build_application', emoji: '🏆', label: 'Build a standout pre-med application', sublabel: 'Experiences, story, and a portfolio that gets noticed' },
  { value: 'explore_pathway', emoji: '🧭', label: 'Discover if medicine is right for me', sublabel: 'Explore careers, specialties, and what the life is really like' },
];

export const STUDY_METHOD_OPTIONS = [
  { value: 'none', emoji: '🎒', label: 'No structured method yet' },
  { value: 'khan', emoji: '📗', label: 'Khan Academy' },
  { value: 'princeton', emoji: '📕', label: 'The Princeton Review' },
  { value: 'kaplan', emoji: '📘', label: 'Kaplan' },
  { value: 'school', emoji: '🏫', label: 'School curriculum only' },
  { value: 'tutor', emoji: '🧑‍🏫', label: 'Tutor or mentor' },
];

export const OBSTACLE_OPTIONS = [
  { value: 'what_to_study', emoji: '🌫️', label: 'Not knowing what to focus on' },
  { value: 'guidance', emoji: '🧭', label: 'No mentor or guidance into medicine' },
  { value: 'busy', emoji: '🗓️', label: 'A packed schedule' },
  { value: 'anxiety', emoji: '😰', label: 'Test & performance anxiety' },
  { value: 'motivation', emoji: '🔋', label: 'Losing motivation' },
  { value: 'no_plan', emoji: '🧩', label: 'No structured plan' },
];

export const ACCOMPLISH_OPTIONS = [
  { value: 'score', emoji: '📈', label: 'Strengthen my academics & test scores' },
  { value: 'application', emoji: '🏆', label: 'Build a competitive pre-med application' },
  { value: 'explore', emoji: '🧭', label: 'Find my fit in medicine' },
  { value: 'experience', emoji: '🩺', label: 'Gain clinical or research experience' },
  { value: 'gpa', emoji: '📚', label: 'Raise my GPA for pre-health admissions' },
  { value: 'consistency', emoji: '🔥', label: 'Stay motivated & consistent' },
];

// ── Med-focused profile questions (new) ──────────────────────────────────────
// Everything below exists to make the generated plan genuinely personal: each
// answer is persisted onto the user record and fed to the plan + coach prompts.

export const WHY_MEDICINE_OPTIONS = [
  { value: 'help_people', emoji: '❤️', label: 'I want to help people', sublabel: 'Caring for others is what drives me' },
  { value: 'science', emoji: '🔬', label: 'I love science & the human body', sublabel: 'Biology and medicine fascinate me' },
  { value: 'personal', emoji: '💗', label: 'A personal or family experience', sublabel: 'An illness or a caregiver inspired me' },
  { value: 'family_field', emoji: '👨‍⚕️', label: 'Family or mentors in medicine', sublabel: "I've seen the life up close" },
  { value: 'challenge', emoji: '🏔️', label: 'The challenge & the career', sublabel: 'A demanding, respected, secure path' },
  { value: 'unsure', emoji: '🤔', label: "I'm still figuring that out", sublabel: "That's a completely valid place to start" },
];

export const DREAM_ROLE_OPTIONS = [
  { value: 'physician', emoji: '🩺', label: 'Physician / Surgeon', sublabel: 'Diagnosing, treating, operating' },
  { value: 'nurse', emoji: '💉', label: 'Nurse / Nurse Practitioner', sublabel: 'Frontline patient care' },
  { value: 'pa', emoji: '🧑‍⚕️', label: 'Physician Assistant', sublabel: 'Medicine with flexibility' },
  { value: 'mental_health', emoji: '🧠', label: 'Psychiatry / Mental health', sublabel: 'Caring for the mind' },
  { value: 'research', emoji: '🧪', label: 'Medical research / Biotech', sublabel: 'Discovering the next cure' },
  { value: 'other_health', emoji: '💊', label: 'Another health career', sublabel: 'Pharmacy, PT, public health…' },
  { value: 'undecided', emoji: '🌟', label: 'Not sure yet', sublabel: "We'll help you find your fit" },
];

export const CERTAINTY_OPTIONS = [
  { value: 'all_in', emoji: '🔥', label: "I'm all in", sublabel: 'Medicine is the plan — full stop' },
  { value: 'fairly_sure', emoji: '👍', label: 'Fairly sure', sublabel: 'Leaning strongly toward health care' },
  { value: 'exploring', emoji: '🧭', label: 'Still exploring', sublabel: 'Seriously curious, keeping options open' },
];

export const GPA_OPTIONS = [
  { value: 'mostly_a', emoji: '🅰️', label: "Mostly A's", sublabel: '~3.8+ unweighted' },
  { value: 'a_b', emoji: '📗', label: "A's and B's", sublabel: '~3.3 – 3.7' },
  { value: 'mostly_b', emoji: '📘', label: "Mostly B's", sublabel: '~3.0 – 3.3' },
  { value: 'below_b', emoji: '📙', label: "C's or below", sublabel: "We'll build from here — no judgment" },
  { value: 'unsure', emoji: '🤷', label: 'Not sure', sublabel: "We'll figure it out together" },
];

export const SCIENCE_OPTIONS = [
  { value: 'biology', emoji: '🧬', label: 'Biology' },
  { value: 'chemistry', emoji: '⚗️', label: 'Chemistry' },
  { value: 'physics', emoji: '🧲', label: 'Physics' },
  { value: 'ap_bio', emoji: '🧫', label: 'AP / IB Biology' },
  { value: 'ap_chem', emoji: '🧪', label: 'AP / IB Chemistry' },
  { value: 'anatomy', emoji: '🫀', label: 'Anatomy / Physiology' },
  { value: 'none_yet', emoji: '🌱', label: 'None of these yet' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'volunteering', emoji: '🏥', label: 'Hospital or clinic volunteering' },
  { value: 'shadowing', emoji: '👩‍⚕️', label: 'Shadowed a doctor or nurse' },
  { value: 'club', emoji: '🏅', label: 'HOSA / med club / science fair' },
  { value: 'cpr', emoji: '❤️‍🩹', label: 'CPR / first-aid certified' },
  { value: 'family_care', emoji: '🤲', label: 'Cared for a family member' },
  { value: 'none', emoji: '🌱', label: 'Nothing yet — starting fresh' },
];

export const TEST_TIMELINE_OPTIONS = [
  { value: 'lt3', emoji: '⏰', label: 'Within 3 months', sublabel: "It's close — we'll make every day count" },
  { value: '3-6', emoji: '🗓️', label: 'In 3–6 months', sublabel: 'The sweet spot for a full prep cycle' },
  { value: '6-12', emoji: '🌤️', label: 'In 6–12 months', sublabel: 'Plenty of runway to build mastery' },
  { value: 'unscheduled', emoji: '❓', label: 'Not scheduled yet', sublabel: "We'll help you pick the right date" },
];
