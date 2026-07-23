// ─────────────────────────────────────────────────────────────────────────────
// MMI (Multiple Mini Interview) & CASPer-style practice — an explicit opt-in
// mode inside Interview Prep, separate from Standard mode. Real MMI/CASPer
// scenarios (even for actual medical-school applicants) are built around
// ethical judgment, communication, and teamwork — not clinical knowledge —
// so this content stays entirely appropriate for a high schooler previewing
// the FORMAT years before they'll face the real thing. Framed explicitly as
// "here's what this looks like," not "here's how to ace your med school
// interview" — this student is not applying to anything like that yet.
// ─────────────────────────────────────────────────────────────────────────────

export const MMI_STATIONS = [
  { id:'mmi1', prompt:'A close friend asks you to cover for them so they can skip a commitment they promised to keep. What do you say to them, and why?' },
  { id:'mmi2', prompt:'You\'re working on a group project and one member consistently does less than their share, but is well-liked by the rest of the group. How do you handle it?' },
  { id:'mmi3', prompt:'You witness someone being treated unfairly by an authority figure (a teacher, coach, or boss) but speaking up could have consequences for you. Walk through how you\'d think about it.' },
  { id:'mmi4', prompt:'A teammate makes a mistake that affects the whole team\'s result, and they\'re clearly upset about it. What do you say to them?' },
  { id:'mmi5', prompt:'You disagree with a decision your group has made, but you\'re outvoted. Do you go along with it, and how do you handle your disagreement?' },
  { id:'mmi6', prompt:'Someone shares something with you in confidence that you think could put them at risk if they don\'t tell someone else. What do you do?' },
  { id:'mmi7', prompt:'You\'re given credit for something a teammate actually did most of the work on. How do you handle it?' },
  { id:'mmi8', prompt:'A younger student looks up to you and is about to make a decision you think is a mistake. How do you approach the conversation?' },
  { id:'mmi9', prompt:'A classmate confides that they cheated on an important test and got the top grade, which bumped you down. They ask you to keep it quiet. What do you do?' },
  { id:'mmi10', prompt:'You\'re volunteering and a supervisor asks you to do something you think is unfair to the people you\'re serving, but not against any rule. How do you respond?' },
  { id:'mmi11', prompt:'A new student in your class is being quietly excluded by your friend group. What, if anything, do you do?' },
  { id:'mmi12', prompt:'You have limited time and can either help a struggling teammate finish their part or polish your own to make the whole project shine. How do you decide?' },
  { id:'mmi13', prompt:'A family member holds a strong opinion you deeply disagree with. They bring it up at dinner in front of guests. How do you handle the moment?' },
  { id:'mmi14', prompt:'You\'re leading a club and two members you both value are in a conflict that\'s splitting the group. How do you approach it?' },
  { id:'mmi15', prompt:'You promised two different people you\'d help them at the same time, and you can\'t do both. Walk me through how you handle it.' },
  { id:'mmi16', prompt:'You realize partway through a competition that a rule is being interpreted in a way that unfairly benefits your team. Do you say anything?' },
  { id:'mmi17', prompt:'A friend is spreading a rumor you know is false about someone you don\'t particularly like. What do you do?' },
  { id:'mmi18', prompt:'Your coach or teacher asks the group to keep quiet about a decision you think other students have a right to know about. How do you think it through?' },
  { id:'mmi19', prompt:'You find a wallet with cash and an ID in the school hallway when no one is around. Walk me through exactly what you do and why.' },
  { id:'mmi20', prompt:'A peer asks to copy your homework because they were caring for a sick family member all week and truly had no time. How do you respond?' },
  { id:'mmi21', prompt:'You\'re asked to give honest feedback on a close friend\'s project that you think isn\'t very good, and it matters to them a lot. What do you say?' },
  { id:'mmi22', prompt:'Your team wants to celebrate a win in a way that would exclude one member who can\'t participate. How do you handle it?' },
  { id:'mmi23', prompt:'You strongly believe a school policy is wrong. What steps would you actually take, and where would you draw the line?' },
  { id:'mmi24', prompt:'Someone apologizes to you for something that genuinely hurt you, but you\'re not sure they really mean it. How do you respond?' },
];

export const CASPER_SCENARIOS = [
  {
    id:'cas1',
    scenario:'You\'re part of a school club, and the person running it makes a decision that most members quietly disagree with, but no one has said anything.',
    probes:[
      'What would you do in this situation, and why?',
      'What factors would you weigh before deciding whether to speak up?',
      'How would you approach the conversation if you did decide to say something?',
    ],
  },
  {
    id:'cas2',
    scenario:'A friend confides in you that they\'re struggling with something serious (stress, a family issue, anything significant) and asks you not to tell anyone, including adults who could help.',
    probes:[
      'How do you balance respecting their trust with your concern for their wellbeing?',
      'What would influence your decision here?',
      'How would you talk to your friend about it either way?',
    ],
  },
  {
    id:'cas3',
    scenario:'You\'re working on a team project and you realize partway through that the approach the team agreed on isn\'t going to work, but changing course now would mean redoing a lot of completed work.',
    probes:[
      'What do you do?',
      'How do you communicate this to the team?',
      'What would you do differently next time to avoid this?',
    ],
  },
  {
    id:'cas4',
    scenario:'Someone you\'re working with takes credit for an idea that was actually yours, in front of a group that matters to you (a teacher, a coach, a supervisor).',
    probes:[
      'How do you respond in the moment?',
      'Do you address it afterward, and how?',
      'What would you want the outcome to be?',
    ],
  },
  {
    id:'cas5',
    scenario:'A teammate on a project has been going through a hard time at home and their work has slipped, which is now affecting the group\'s grade. The deadline is in two days.',
    probes:[
      'How do you approach your teammate?',
      'How do you balance compassion for them with fairness to the rest of the group?',
      'At what point, if any, would you involve the teacher?',
    ],
  },
  {
    id:'cas6',
    scenario:'You are volunteering at a community event and overhear another volunteer being rude and dismissive to an elderly visitor who seems confused.',
    probes:[
      'What do you do in the moment?',
      'How would you address it with the other volunteer afterward?',
      'What would make you decide to report it versus handle it yourself?',
    ],
  },
  {
    id:'cas7',
    scenario:'Your best friend asks you to lie to their parents to cover for where they were last weekend. You have met their parents and they trust you.',
    probes:[
      'What do you say to your friend?',
      'How do you weigh loyalty to your friend against the trust their parents place in you?',
      'Does your answer change if you thought your friend might be in danger?',
    ],
  },
  {
    id:'cas8',
    scenario:'You are captain of a team and you have to cut one person from a small roster. Two candidates are close: one is more talented but disruptive, the other is less skilled but lifts everyone\'s morale.',
    probes:[
      'How do you make the decision?',
      'How do you deliver the news to the person you cut?',
      'What values are you weighing against each other?',
    ],
  },
  {
    id:'cas9',
    scenario:'A group chat you\'re in starts mocking a classmate who isn\'t in the chat. People you like are joining in, and one of them tags you asking what you think.',
    probes:[
      'How do you respond in the chat?',
      'What would you do outside the chat, if anything?',
      'How do you think about the pressure to go along with the group?',
    ],
  },
  {
    id:'cas10',
    scenario:'You are given a leadership role over a project, and an adult supervisor keeps overruling your decisions in ways you think are making the project worse.',
    probes:[
      'How do you handle the disagreement?',
      'How do you decide when to push back and when to defer?',
      'How do you keep the rest of the team motivated through it?',
    ],
  },
  {
    id:'cas11',
    scenario:'You notice that a rule at your school or job seems to unfairly disadvantage students from lower-income families, but no one around you seems bothered by it.',
    probes:[
      'What would you do, if anything?',
      'Who would you talk to first, and why?',
      'How do you handle it if people dismiss your concern?',
    ],
  },
  {
    id:'cas12',
    scenario:'A younger student you tutor tells you they plagiarized part of an assignment because they didn\'t understand the material and were afraid to ask for help.',
    probes:[
      'How do you respond to the student?',
      'What do you do about the plagiarism itself?',
      'How do you help them so it doesn\'t happen again?',
    ],
  },
  {
    id:'cas13',
    scenario:'You and a friend both applied for the same competitive summer program. You got in, they didn\'t, and they are clearly hurt and pulling away from you.',
    probes:[
      'How do you handle the friendship?',
      'What do you say, and what do you avoid saying?',
      'How do you hold space for their disappointment without diminishing your own achievement?',
    ],
  },
  {
    id:'cas14',
    scenario:'During a group presentation, a teammate freezes and can\'t continue speaking in front of the class. The room goes quiet and everyone is looking around.',
    probes:[
      'What do you do in that moment?',
      'How do you support your teammate without embarrassing them further?',
      'How would you talk with them about it afterward?',
    ],
  },
];

export function getMmiStation(idx) {
  return MMI_STATIONS[idx % MMI_STATIONS.length];
}
export function getCasperScenario(idx) {
  return CASPER_SCENARIOS[idx % CASPER_SCENARIOS.length];
}
