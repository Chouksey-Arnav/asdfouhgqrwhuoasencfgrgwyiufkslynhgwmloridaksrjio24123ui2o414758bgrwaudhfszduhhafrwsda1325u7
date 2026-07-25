// Every onboarding question's option list, in one dependency-free module.
//
// These used to live inside Onboarding.jsx, but the step components and the
// personalization logic both need them too — importing them from the flow
// component would create an import cycle (Onboarding → steps → Onboarding).
// Onboarding.jsx re-exports everything here, so existing imports in App.jsx,
// planGenerator.js, studentProfile.js and masterPlanGenerator.js keep working.

export const STUDY_HOURS_OPTIONS = [
  { value: '0-5', label: '0-5 hrs / week', sublabel: 'Just getting started', dots: 1 },
  { value: '6-14', label: '6-14 hrs / week', sublabel: 'Building real momentum', dots: 2 },
  { value: '15+', label: '15+ hrs / week', sublabel: 'Highly dedicated', dots: 3 },
];

export const GOAL_OPTIONS = [
  { value: 'boost_score', label: 'Strengthen my academics & test readiness', sublabel: 'Build the scores a pre-med path expects' },
  { value: 'build_application', label: 'Build a standout pre-med application', sublabel: 'Experiences, story, and a portfolio that gets noticed' },
  { value: 'explore_pathway', label: 'Discover if medicine is right for me', sublabel: 'Explore careers, specialties, and what the life is really like' },
];

export const STUDY_METHOD_OPTIONS = [
  { value: 'none', label: 'No structured method yet' },
  { value: 'khan', label: 'Khan Academy' },
  { value: 'princeton', label: 'The Princeton Review' },
  { value: 'kaplan', label: 'Kaplan' },
  { value: 'school', label: 'School curriculum only' },
  { value: 'tutor', label: 'Tutor or mentor' },
];

export const OBSTACLE_OPTIONS = [
  { value: 'what_to_study', label: 'Not knowing what to focus on' },
  { value: 'guidance', label: 'No mentor or guidance into medicine' },
  { value: 'busy', label: 'A packed schedule' },
  { value: 'anxiety', label: 'Test & performance anxiety' },
  { value: 'motivation', label: 'Losing motivation' },
  { value: 'no_plan', label: 'No structured plan' },
];

export const ACCOMPLISH_OPTIONS = [
  { value: 'score', label: 'Strengthen my academics & test scores' },
  { value: 'application', label: 'Build a competitive pre-med application' },
  { value: 'explore', label: 'Find my fit in medicine' },
  { value: 'experience', label: 'Gain clinical or research experience' },
  { value: 'gpa', label: 'Raise my GPA for pre-health admissions' },
  { value: 'consistency', label: 'Stay motivated & consistent' },
];

// ── Med-focused profile questions (new) ──────────────────────────────────────
// Everything below exists to make the generated plan genuinely personal: each
// answer is persisted onto the user record and fed to the plan + coach prompts.

export const WHY_MEDICINE_OPTIONS = [
  { value: 'help_people', label: 'I want to help people', sublabel: 'Caring for others is what drives me' },
  { value: 'science', label: 'I love science & the human body', sublabel: 'Biology and medicine fascinate me' },
  { value: 'personal', label: 'A personal or family experience', sublabel: 'An illness or a caregiver inspired me' },
  { value: 'family_field', label: 'Family or mentors in medicine', sublabel: "I've seen the life up close" },
  { value: 'challenge', label: 'The challenge & the career', sublabel: 'A demanding, respected, secure path' },
  { value: 'unsure', label: "I'm still figuring that out", sublabel: "That's a completely valid place to start" },
];

export const DREAM_ROLE_OPTIONS = [
  { value: 'physician', label: 'Physician / Surgeon', sublabel: 'Diagnosing, treating, operating' },
  { value: 'nurse', label: 'Nurse / Nurse Practitioner', sublabel: 'Frontline patient care' },
  { value: 'pa', label: 'Physician Assistant', sublabel: 'Medicine with flexibility' },
  { value: 'mental_health', label: 'Psychiatry / Mental health', sublabel: 'Caring for the mind' },
  { value: 'research', label: 'Medical research / Biotech', sublabel: 'Discovering the next cure' },
  { value: 'other_health', label: 'Another health career', sublabel: 'Pharmacy, PT, public health…' },
  { value: 'undecided', label: 'Not sure yet', sublabel: "We'll help you find your fit" },
];

export const CERTAINTY_OPTIONS = [
  { value: 'all_in', label: "I'm all in", sublabel: 'Medicine is the plan — full stop', dots: 3 },
  { value: 'fairly_sure', label: 'Fairly sure', sublabel: 'Leaning strongly toward health care', dots: 2 },
  { value: 'exploring', label: 'Still exploring', sublabel: 'Seriously curious, keeping options open', dots: 1 },
];

export const GPA_OPTIONS = [
  { value: 'mostly_a', label: "Mostly A's", sublabel: '~3.8+ unweighted' },
  { value: 'a_b', label: "A's and B's", sublabel: '~3.3 – 3.7' },
  { value: 'mostly_b', label: "Mostly B's", sublabel: '~3.0 – 3.3' },
  { value: 'below_b', label: "C's or below", sublabel: "We'll build from here — no judgment" },
  { value: 'unsure', label: 'Not sure', sublabel: "We'll figure it out together" },
];

export const SCIENCE_OPTIONS = [
  { value: 'biology', label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics', label: 'Physics' },
  { value: 'ap_bio', label: 'AP / IB Biology' },
  { value: 'ap_chem', label: 'AP / IB Chemistry' },
  { value: 'anatomy', label: 'Anatomy / Physiology' },
  { value: 'none_yet', label: 'None of these yet' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'volunteering', label: 'Hospital or clinic volunteering' },
  { value: 'shadowing', label: 'Shadowed a doctor or nurse' },
  { value: 'club', label: 'HOSA / med club / science fair' },
  { value: 'cpr', label: 'CPR / first-aid certified' },
  { value: 'family_care', label: 'Cared for a family member' },
  { value: 'none', label: 'Nothing yet — starting fresh' },
];

export const TEST_TIMELINE_OPTIONS = [
  { value: 'lt3', label: 'Within 3 months', sublabel: "It's close — we'll make every day count" },
  { value: '3-6', label: 'In 3–6 months', sublabel: 'The sweet spot for a full prep cycle' },
  { value: '6-12', label: 'In 6–12 months', sublabel: 'Plenty of runway to build mastery' },
  { value: 'unscheduled', label: 'Not scheduled yet', sublabel: "We'll help you pick the right date" },
];
