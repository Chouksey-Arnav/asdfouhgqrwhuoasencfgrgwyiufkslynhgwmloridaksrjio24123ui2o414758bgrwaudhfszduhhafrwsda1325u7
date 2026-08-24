// ─────────────────────────────────────────────────────────────────────────────
// CASPer — the typed situational-judgment test some health-professional
// programs use, mirrored in its real structure rather than as a list of
// questions.
//
// ── What the real thing looks like ──────────────────────────────────────────
// A section is one scenario followed by several questions about it, and a
// single clock covering all of them. You cannot go back to a section once you
// leave it, you cannot see the questions before the scenario, and almost nobody
// finishes every question — the time pressure is not incidental, it is the
// instrument. A test is a dozen or so sections back to back, mixing video
// scenarios with word-only ones, and it takes over an hour.
//
// So this mirrors: scenario first, questions revealed with the clock already
// running, five minutes for the whole section, no going back, and a section
// count that makes it a test rather than an exercise. Practicing the questions
// without the clock teaches the wrong skill, because the skill CASPer actually
// measures under time pressure is triage — deciding, in the first fifteen
// seconds, which question you are going to answer properly and which one you
// are going to answer in one line.
//
// ── Reporting ───────────────────────────────────────────────────────────────
// Real CASPer results are reported as a QUARTILE against the applicant pool.
// Programs never see a raw score and neither does the applicant. We mirror that
// convention in src/lib/casperScore.js, and we are explicit that our quartile
// is computed against our own rubric rather than against a real cohort — see
// the caveat there, which is shown with every result.
//
// ── Level ───────────────────────────────────────────────────────────────────
// Written for a high schooler applying to BS/MD or direct-admit, like the
// station library. The scenarios are structurally the real ones; the settings
// are school, team, job, family and volunteering.
// ─────────────────────────────────────────────────────────────────────────────

// Five minutes per section covering all its questions, which is the real format.
export const SECTION_SECONDS = 300;

const section = (s) => ({
  sectionSeconds: SECTION_SECONDS,
  level: 'hs-bsmd',
  // 'word' sections present the scenario as text. 'video' sections in the real test present it as
  // a short acted clip; we present the same scenario as a described scene, and label it, because
  // pretending we are showing video would be a lie about what the student just practiced.
  kind: s.kind || 'word',
  ...s,
});

export const CASPER_SECTIONS = [
  section({
    id: 'cas-club-decision',
    kind: 'word',
    stationType: 'policy',
    title: 'The decision nobody objected to',
    scenario: 'You are part of a school club. The person running it makes a decision that most members quietly disagree with. In the meeting nobody says anything, and afterwards three separate people complain to you about it in the corridor.',
    probes: [
      'What do you do in this situation, and why?',
      'What factors would you weigh before saying anything to the group?',
      'Three people complained to you privately and none of them spoke up in the room. What does that tell you, and does it change what you do?',
    ],
    competencies: ['teamwork', 'ethicalResponsibility', 'oralCommunication', 'criticalThinking'],
  }),
  section({
    id: 'cas-friend-confides',
    kind: 'video',
    stationType: 'empathy',
    title: 'Told not to tell',
    scenario: 'A friend sits down next to you at lunch and tells you they have been struggling with something serious at home. They are not in immediate danger. They ask you, twice, not to tell anyone — including adults who could actually help.',
    probes: [
      'How do you balance respecting their trust against your concern for their wellbeing?',
      'What would have to be true for you to tell an adult anyway?',
      'What do you say to your friend, either way, before you do anything?',
    ],
    competencies: ['empathy', 'ethicalResponsibility', 'interpersonalSkills', 'selfAwareness'],
  }),
  section({
    id: 'cas-approach-wrong',
    kind: 'word',
    stationType: 'teamwork',
    title: 'The approach that will not work',
    scenario: 'Halfway through a team project you realize the approach everyone agreed on is not going to work. Changing course now means redoing about two weeks of finished work, and the person whose idea it was has put the most hours into it.',
    probes: [
      'What do you do?',
      'How do you raise it with the team, and specifically with the person whose idea it was?',
      'What would you do differently next time to catch this earlier?',
    ],
    competencies: ['teamwork', 'criticalThinking', 'interpersonalSkills', 'oralCommunication'],
  }),
  section({
    id: 'cas-credit-taken',
    kind: 'video',
    stationType: 'ethical',
    title: 'In front of people who matter',
    scenario: 'In a meeting with a teacher who is writing your recommendation, someone you work with presents an idea as theirs. It was yours. You are sitting three feet away and the teacher is nodding.',
    probes: [
      'How do you respond in the moment?',
      'Do you address it afterwards, and with whom?',
      'What outcome are you actually trying to reach, and what are you prepared to give up to reach it?',
    ],
    competencies: ['ethicalResponsibility', 'interpersonalSkills', 'selfAwareness', 'oralCommunication'],
  }),
  section({
    id: 'cas-teammate-struggling',
    kind: 'word',
    stationType: 'teamwork',
    title: 'Two days out',
    scenario: 'A teammate has been going through something difficult at home and their work has slipped badly. It is now affecting the group\'s grade and the deadline is in two days. Nobody else in the group knows what is going on with them.',
    probes: [
      'How do you approach your teammate?',
      'How do you balance compassion for them against fairness to the other three people?',
      'At what point, if any, do you involve the teacher — and what do you tell them?',
    ],
    competencies: ['teamwork', 'empathy', 'ethicalResponsibility', 'criticalThinking'],
  }),
  section({
    id: 'cas-rude-volunteer',
    kind: 'video',
    stationType: 'communication',
    title: 'The other volunteer',
    scenario: 'You are volunteering at a community health event. Another volunteer, older than you and clearly more experienced, is being dismissive and short with an elderly visitor who is confused about where to go. The visitor looks embarrassed.',
    probes: [
      'What do you do in the moment?',
      'How would you raise it with the other volunteer afterwards?',
      'What would make you report it rather than handle it yourself?',
    ],
    competencies: ['empathy', 'ethicalResponsibility', 'interpersonalSkills', 'oralCommunication'],
  }),
  section({
    id: 'cas-lie-for-friend',
    kind: 'word',
    stationType: 'ethical',
    title: 'Covering for them',
    scenario: 'Your best friend asks you to tell their parents they were at your house last Saturday. They were not. You have known their parents for years and they trust you.',
    probes: [
      'What do you say to your friend?',
      'How do you weigh loyalty to your friend against the trust their parents place in you?',
      'Would your answer change if you believed your friend might be in some kind of trouble?',
    ],
    competencies: ['ethicalResponsibility', 'interpersonalSkills', 'criticalThinking', 'selfAwareness'],
  }),
  section({
    id: 'cas-cut-from-roster',
    kind: 'word',
    stationType: 'teamwork',
    title: 'One place, two people',
    scenario: 'You are captain and have to cut one person from a small roster. Two candidates are close. One is more talented but difficult to be around; the other is less skilled but is the reason people enjoy turning up.',
    probes: [
      'How do you make the decision?',
      'How do you deliver the news to the person you cut?',
      'Which values are you weighing against each other here?',
    ],
    competencies: ['teamwork', 'criticalThinking', 'oralCommunication', 'ethicalResponsibility'],
  }),
  section({
    id: 'cas-group-chat',
    kind: 'video',
    stationType: 'ethical',
    title: 'Tagged in',
    scenario: 'A group chat you are in starts mocking a classmate who is not in the chat. Several people you like are joining in. One of them tags you and asks what you think.',
    probes: [
      'How do you respond in the chat itself?',
      'What, if anything, do you do outside the chat?',
      'How do you think about the pressure to go along with a group of people whose opinion you value?',
    ],
    competencies: ['ethicalResponsibility', 'interpersonalSkills', 'selfAwareness', 'understandingOthers'],
  }),
  section({
    id: 'cas-supervisor-overrules',
    kind: 'word',
    stationType: 'teamwork',
    title: 'Overruled, repeatedly',
    scenario: 'You have been given a leadership role on a project. An adult supervisor keeps overruling your decisions, in front of the team, in ways you think are making the project worse.',
    probes: [
      'How do you handle the disagreement?',
      'How do you decide when to push back and when to defer?',
      'How do you keep the rest of the team motivated through all of it?',
    ],
    competencies: ['teamwork', 'resilience', 'interpersonalSkills', 'selfAwareness'],
  }),
  section({
    id: 'cas-unfair-rule',
    kind: 'word',
    stationType: 'policy',
    title: 'The rule nobody else minds',
    scenario: 'A rule at your school requires students to pay for their own materials on a required course. You notice it is quietly excluding students from lower-income families from taking it at all. Nobody around you seems bothered.',
    probes: [
      'What would you do, if anything?',
      'Who would you talk to first, and why that person?',
      'How do you handle it if the people you raise it with dismiss the concern?',
    ],
    competencies: ['ethicalResponsibility', 'understandingOthers', 'criticalThinking', 'resilience'],
  }),
  section({
    id: 'cas-plagiarism-tutee',
    kind: 'word',
    stationType: 'ethical',
    title: 'The student you tutor',
    scenario: 'A younger student you tutor tells you they copied part of an assignment because they did not understand the material and were afraid to ask for help. They have already handed it in.',
    probes: [
      'How do you respond to the student?',
      'What do you do about the copied work itself?',
      'How do you help them so that it does not happen again?',
    ],
    competencies: ['ethicalResponsibility', 'empathy', 'criticalThinking', 'commitmentToLearning'],
  }),
  section({
    id: 'cas-friend-rejected',
    kind: 'video',
    stationType: 'empathy',
    title: 'You got in, they did not',
    scenario: 'You and a close friend both applied to the same competitive summer program. You were accepted and they were not. It has been a week and they have stopped replying to you.',
    probes: [
      'How do you handle the friendship from here?',
      'What do you say, and what do you deliberately avoid saying?',
      'How do you make room for their disappointment without pretending your own result is nothing?',
    ],
    competencies: ['empathy', 'selfAwareness', 'interpersonalSkills', 'understandingOthers'],
  }),
  section({
    id: 'cas-presentation-freeze',
    kind: 'video',
    stationType: 'empathy',
    title: 'The room goes quiet',
    scenario: 'During a group presentation, a teammate freezes and cannot continue speaking in front of the class. The room goes silent and everyone starts looking at each other.',
    probes: [
      'What do you do in that moment?',
      'How do you support your teammate without drawing more attention to them?',
      'How would you talk to them about it afterwards?',
    ],
    competencies: ['empathy', 'interpersonalSkills', 'oralCommunication', 'teamwork'],
  }),
  section({
    id: 'cas-job-shift-swap',
    kind: 'word',
    stationType: 'ethical',
    title: 'The shift you promised',
    scenario: 'You agreed to cover a weekend shift at your job. Two days later you are offered a place on a one-day research workshop that only runs once a year, on the same day. Your manager has already built the rota around you.',
    probes: [
      'What do you do?',
      'What do you say to your manager, and when?',
      'How do you think about the difference between a promise being inconvenient and a promise being wrong to keep?',
    ],
    competencies: ['ethicalResponsibility', 'criticalThinking', 'selfAwareness', 'oralCommunication'],
  }),
  section({
    id: 'cas-social-media-post',
    kind: 'word',
    stationType: 'policy',
    title: 'What people put online',
    scenario: 'A student at your school posted something two years ago that has resurfaced and is now being circulated. It is genuinely offensive. The student says they were fourteen and no longer think that way, and a group of students is demanding they be removed from a leadership position.',
    probes: [
      'How should the school handle this?',
      'What is the case for the students demanding removal, at its strongest?',
      'What would change your view, in either direction?',
    ],
    competencies: ['ethicalResponsibility', 'understandingOthers', 'criticalThinking', 'oralCommunication'],
  }),
];

/**
 * A test, not a question list. Two lengths, both honest about what they are: the long one is
 * roughly the shape of the real thing, the short one is a warm-up and is labeled as one.
 */
export const CASPER_TEST_LENGTHS = [
  {
    id: 'full',
    label: 'Full-length test',
    sections: 12,
    blurb: 'Twelve sections back to back, five minutes each — about an hour, and the closest this gets to the real thing. This is the only length that produces a quartile worth reading.',
    reportsQuartile: true,
  },
  {
    id: 'short',
    label: 'Short set',
    sections: 5,
    blurb: 'Five sections. Enough to learn the format and the time pressure, not enough for a meaningful band — the result is shown as practice feedback, not as a quartile.',
    reportsQuartile: false,
  },
];

export function getCasperSection(idx) {
  const n = CASPER_SECTIONS.length;
  return CASPER_SECTIONS[((idx % n) + n) % n];
}

/** The compatibility view the older single-scenario practice mode reads. */
export const CASPER_SCENARIOS = CASPER_SECTIONS.map(s => ({
  id: s.id,
  station: s.stationType,
  scenario: s.scenario,
  probes: s.probes,
}));

export function getCasperScenario(idx) {
  const n = CASPER_SCENARIOS.length;
  return CASPER_SCENARIOS[((idx % n) + n) % n];
}
