// ─────────────────────────────────────────────────────────────────────────────
// Interview Simulation — static, curated question bank for high school
// students practicing college admissions / scholarship / program interviews.
// Deliberately NOT medical-school-style (no MMI, no clinical vignettes, no
// MCAT-adjacent content) — every question is scoped to what a 14-18 year-old
// has actually done: school clubs, local volunteering, summer programs,
// shadowing/observing (not performing) in a health setting, research fairs.
// ─────────────────────────────────────────────────────────────────────────────

export const INTERVIEW_QUESTIONS = {
  general: [
    "Tell me about yourself — what should I know about you beyond your transcript?",
    "Why are you interested in this school / program?",
    "Tell me about an extracurricular activity you're proud of. What did you actually do, day to day?",
    "Describe a time you failed at something. What did you learn?",
    "What's a book, article, or documentary that changed how you think about something?",
    "Tell me about a time you had to work with someone you disagreed with.",
    "What do you like to do outside of school and academics?",
    "Describe a challenge you've faced and how you handled it.",
    "What's something you're curious about that has nothing to do with getting into college?",
    "Where do you see yourself contributing on this campus?",
    "Tell me about a time you took initiative without being asked.",
    "What question do you wish I'd asked you?",
  ],
  stem: [
    "Tell me about a STEM project, competition, or club you've been involved in — what was your specific role?",
    "Describe a time an experiment, project, or piece of code didn't work the way you expected. What did you do?",
    "What's a scientific or technical topic you'd explain to a friend who knows nothing about it?",
    "Tell me about a time you had to teach yourself something technical outside of class.",
    "Describe working on a team project (robotics, a hackathon, a science fair). What was your contribution vs. the team's?",
    "What's an engineering or science problem in the real world you'd want to work on?",
    "Tell me about a math or science class that challenged you, and how you got through it.",
    "Describe a time you had to explain a technical idea to someone non-technical.",
    "What draws you to STEM specifically, beyond 'I'm good at math'?",
    "Tell me about a time you debugged a problem — technical or otherwise — through trial and error.",
  ],
  humanities: [
    "Tell me about a piece of writing (yours or someone else's) that you're proud of or that moved you.",
    "Describe a time you changed your mind about something after reading or discussing it.",
    "Tell me about your experience with debate, Model UN, journalism, or another activity built around argument or writing.",
    "What historical event or period do you find yourself thinking about, and why?",
    "Describe a time you had to defend an unpopular opinion in a discussion.",
    "Tell me about a teacher or mentor who shaped how you think or write.",
    "What's a topic you'd want to write a full essay or research paper on, if you had total freedom?",
    "Describe a time your writing or argument was challenged — how did you respond?",
    "Tell me about your involvement with a school publication, literary magazine, or writing club.",
    "What does 'a strong argument' mean to you?",
  ],
  business: [
    "Tell me about DECA, FBLA, a fundraiser, or another leadership/business activity you've been part of — what was your role?",
    "Describe a time you had to lead a team or a project.",
    "Tell me about a small business idea you've had, even if you never launched it.",
    "Describe a time a plan didn't work financially or logistically, and how you adapted.",
    "What's a company or organization you admire, and why?",
    "Tell me about a time you had to negotiate or persuade someone.",
    "Describe your experience with a group project where people weren't pulling their weight.",
    "What does good leadership look like to you, based on something you've actually experienced?",
    "Tell me about a time you managed money, a budget, or resources for a project or event.",
    "What's a decision you'd make differently if you were running your school's student government?",
  ],
  socialSci: [
    "Tell me about a time you noticed a pattern in how people behave, and got curious about why.",
    "Describe your experience with a psychology, sociology, or research-methods project.",
    "Tell me about a volunteering or community-service experience — what did you actually do, and what did you learn about the community you worked with?",
    "Describe a time you had to understand a perspective very different from your own.",
    "What's a social issue you care about, and what have you actually done (even something small) related to it?",
    "Tell me about a group or club focused on people, community, or advocacy that you've been part of.",
    "Describe a time you helped resolve a conflict between people.",
    "What draws you to understanding why people think and act the way they do?",
    "Tell me about a current event you've followed closely and formed your own opinion on.",
    "Describe a time you worked directly with people from a different background than yours.",
  ],
  preHealth: [
    "Tell me about a time you shadowed, volunteered, or observed in a healthcare or health-adjacent setting — what did you actually see and learn?",
    "Describe a science fair project, research experience, or HOSA/health-club activity you've been part of.",
    "What first got you curious about a health career? Be specific — a person, an experience, a class.",
    "Tell me about a time you had to communicate clearly with someone who was stressed, in pain, or scared (a patient you observed, a teammate, a younger student you helped).",
    "Describe a volunteering experience — a hospital, clinic, food bank, or care facility — and what you learned about the people you were serving.",
    "What's a biology or chemistry topic you find genuinely fascinating, beyond what's required for a test?",
    "Tell me about a time you had to be patient or empathetic with someone going through a hard time.",
    "Describe a time you worked as part of a team under pressure (a lab group, a sports team, a club event).",
    "What have you learned about the realities of a health career from shadowing or talking to people who work in one?",
    "This is an exploratory interest for you right now, not a locked-in decision — what would help you figure out if this path is right for you?",
    "Tell me about a time you had to follow instructions precisely and why that mattered.",
    "Describe a time you noticed someone needed help before they asked for it.",
  ],
  undecided: [
    "Tell me about a class, club, or activity this year that surprised you — something you didn't expect to enjoy.",
    "What are two or three different things you're considering studying, and what pulls you toward each?",
    "Describe an activity you've stuck with even though it wasn't required.",
    "Tell me about a time you tried something completely new.",
    "What's something you learned this year that had nothing to do with a grade?",
    "Describe a time you had to make a decision without being sure it was the 'right' one.",
    "Tell me about a person — teacher, coach, family member — who's influenced how you think about your future.",
    "What questions are you still trying to answer about what you want to study?",
    "Describe an activity where you took on a leadership role, even informally.",
    "What kind of problems do you like solving, regardless of subject?",
  ],
};

export function getQuestionSet(pathwayKey) {
  return INTERVIEW_QUESTIONS[pathwayKey] || INTERVIEW_QUESTIONS.general;
}
