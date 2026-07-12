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
];

export function getMmiStation(idx) {
  return MMI_STATIONS[idx % MMI_STATIONS.length];
}
export function getCasperScenario(idx) {
  return CASPER_SCENARIOS[idx % CASPER_SCENARIOS.length];
}
