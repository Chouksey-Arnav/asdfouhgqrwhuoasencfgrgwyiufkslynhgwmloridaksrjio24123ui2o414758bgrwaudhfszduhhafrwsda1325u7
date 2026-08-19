// The interview panel: who is in the room, and how each of them sounds.
//
// The old roster was five variations on the same person — "Ava, warm and measured," "Nicky, bright
// and conversational" — which is what every voice product ships and is exactly wrong here. A bright,
// eager, young assistant voice is the register of a servant; the words it is saying ("tell me about
// a time you failed," "why should we believe you") are the words of a judge. A voice signalling
// servant while the words signal judge is unsettling in a way no amount of audio quality fixes.
//
// So this is cast as a real panel instead. Five people who would plausibly be sitting on the other
// side of an interview table, each with an age, a job, a register, and the stations they belong in:
//
//   dean       – senior physician / dean, late fifties. Dry, formal. Ethics and panel stations.
//   faculty    – mid-career faculty member. Moderately warm, moderately formal. The workhorse.
//   nurse      – clinical nurse educator. High warmth. Empathy, teamwork, communication.
//   community  – community member, not a clinician. Warm, informal. "Why medicine," service.
//   student    – current medical student, closest in age, least formal. The gentlest option, and
//                the default for a student's first ever attempt.
//
// Each persona carries three groups of settings:
//   • VOICE     – how to find the closest real voice on this device, and how to shape it (rate,
//                 pitch, and how much those two drift — see voicePipeline.js).
//   • REGISTER  – warmth and formality, which are fed to the model as tone instructions so the
//                 words match the voice instead of fighting it.
//   • FLOOR     – backchannelling ("mm-hm"), whether filled pauses are allowed, and how long this
//                 person sits writing notes before responding. This is the difference between an
//                 empathic nurse educator and a silent panel chair, and it is station-dependent by
//                 design: the empathic actor says "mm-hm," the formal panellist stays quiet.
//
// allowFilledPauses is false on every one of these. "Um" and "uh" raise perceived humanness and
// lower perceived competence; that trade is only worth taking for a role-play actor playing a
// distressed character (see ACTOR_PERSONAS at the bottom), never for someone judging you.

export const PANEL = [
  {
    id: 'dean',
    name: 'Dr. Halloran',
    role: 'Senior physician & admissions dean',
    age: 'late 50s',
    blurb: 'Dry, formal, unhurried. Asks the ethical dilemma and lets the silence sit afterwards.',
    bestFor: 'Ethics, policy, and panel stations',
    // Slow and low, with the least drift of anyone on the panel — seniority reads as economy of
    // movement, not as warmth.
    rate: 0.93, pitch: 0.88, rateVariance: 0.022, pitchVariance: 0.012,
    warmth: 0.25, formality: 0.95,
    backchannel: 'none',
    allowFilledPauses: false,
    notePauseMs: [1400, 2400],   // this is the one who actually writes things down
    turnGapMs: 480,              // at the slow end of the natural 300–500ms band
    prefer: [/^daniel\b/i, /^arthur\b/i, /^oliver\b/i, /google uk english male/i, /^george\b/i, /^ryan\b/i, /^brian\b/i, /^alex\b/i, /^tom\b/i, /^david\b/i, /^mark\b/i],
    toneInstruction: 'You are a senior physician and admissions dean in your late fifties. You are formal, dry, and economical — you do not gush, you do not fill silences, and you never say "great answer." You ask the question, you wait, and when they finish you let a beat pass before you respond. Your warmth shows up as fairness and patience, not as enthusiasm. Never sarcastic, never cutting: a teenager should feel they are being taken seriously by an adult, not judged by one.',
  },
  {
    id: 'faculty',
    name: 'Dr. Reyes',
    role: 'Mid-career faculty member',
    age: '40s',
    blurb: 'Professional and even-handed, with follow-ups that actually push. The realistic default.',
    bestFor: 'Standard stations and probing follow-ups',
    rate: 0.97, pitch: 0.97, rateVariance: 0.03, pitchVariance: 0.02,
    warmth: 0.5, formality: 0.7,
    backchannel: 'sparse',
    allowFilledPauses: false,
    notePauseMs: [900, 1600],
    turnGapMs: 400,
    prefer: [/^evan\b/i, /^matthew\b/i, /^nathan\b/i, /^aaron\b/i, /^serena\b/i, /^allison\b/i, /^joanna\b/i, /aria/i, /andrew/i, /christopher/i, /^kate\b/i, /^tessa\b/i],
    toneInstruction: 'You are a mid-career faculty member in your forties. Moderately warm, moderately formal — courteous and genuinely interested, but you are here to evaluate, and your follow-ups go one layer deeper than the answer went. Acknowledge briefly and specifically, then probe. You do not flatter and you do not soften a thin answer into a good one.',
  },
  {
    id: 'nurse',
    name: 'Ms. Adeyemi',
    role: 'Clinical nurse educator',
    age: '40s',
    blurb: 'The warmest voice in the room. Best when the station is about people, not positions.',
    bestFor: 'Empathy, teamwork, and communication stations',
    rate: 0.99, pitch: 1.02, rateVariance: 0.04, pitchVariance: 0.03,
    warmth: 0.95, formality: 0.45,
    backchannel: 'warm',           // the one who says "mm-hm" while you talk
    allowFilledPauses: false,
    notePauseMs: [600, 1100],
    turnGapMs: 340,
    prefer: [/^samantha\b/i, /^ava\b/i, /^karen\b/i, /^moira\b/i, /^fiona\b/i, /jenny/i, /^zira\b/i, /google us english$/i, /^victoria\b/i, /^susan\b/i],
    toneInstruction: 'You are a clinical nurse educator who has spent twenty years teaching students at the bedside. You are the warmest person on the panel: you make room for a nervous answer, you reflect back what you heard before you ask anything, and you are genuinely curious about how they treat people. Warm is not soft — you still ask what they would actually do, and you notice when an answer is about feelings instead of actions.',
  },
  {
    id: 'community',
    name: 'Mr. Okafor',
    role: 'Community member (not a clinician)',
    age: '50s',
    blurb: 'A layperson on the panel. Plain language, no jargon, wants to know why you actually care.',
    bestFor: '"Why medicine" and service stations',
    rate: 1.0, pitch: 0.95, rateVariance: 0.045, pitchVariance: 0.03,
    warmth: 0.8, formality: 0.3,
    backchannel: 'sparse',
    allowFilledPauses: false,
    notePauseMs: [500, 1000],
    turnGapMs: 330,
    prefer: [/^tom\b/i, /^alex\b/i, /^aaron\b/i, /^nathan\b/i, /\bguy\b/i, /^mark\b/i, /^david\b/i, /^evan\b/i, /^matthew\b/i],
    toneInstruction: 'You are a community member on the admissions panel — not a clinician, not an academic. You run a community organisation and you are here because patients are people from places like yours. You speak plainly, you never use jargon, and if they use jargon you ask them what it means. What you are listening for is whether they actually care about anyone specific, or whether they have memorised a story about caring.',
  },
  {
    id: 'student',
    name: 'Priya',
    role: 'Current medical student',
    age: 'mid 20s',
    blurb: 'Closest to your age, least formal, easiest room to be in. Start here if this is your first go.',
    bestFor: 'A first attempt, or a confidence-building round',
    rate: 1.03, pitch: 1.05, rateVariance: 0.05, pitchVariance: 0.035,
    warmth: 0.9, formality: 0.2,
    backchannel: 'warm',
    allowFilledPauses: false,       // still an interviewer, even a friendly one
    notePauseMs: [400, 800],
    turnGapMs: 310,                 // quickest turnaround — the least intimidating rhythm
    prefer: [/^nicky\b/i, /^zoe\b/i, /^joelle\b/i, /libby/i, /^ana\b/i, /natasha/i, /michelle/i, /^samantha\b/i, /^allison\b/i, /^kate\b/i],
    toneInstruction: 'You are a current medical student in your mid twenties, two years into the degree, helping run practice interviews. You are the least formal person they will meet in this process — you use contractions, you react like a person, and you tell them when a question is a hard one. You are not their friend and you do not hand out praise they did not earn, but your job today is to make the format survivable for someone doing it for the first time.',
    defaultForFirstTimers: true,
  },
];

export const DEFAULT_PANEL_ID = 'faculty';
export const FIRST_TIMER_PANEL_ID = PANEL.find(p => p.defaultForFirstTimers)?.id || 'student';

export function getPanelist(id) {
  return PANEL.find(p => p.id === id) || null;
}

// ── Station types ────────────────────────────────────────────────────────────
// Which panellist belongs in which station, and which AAMC competencies that station is actually
// capable of measuring (the scorer refuses to grade a competency the station never asked about —
// see mmiRubric.js). `hasActor` marks the stations where someone is playing a character rather
// than interviewing, which is the only place filled pauses and interruption are allowed.

export const STATION_TYPES = {
  ethical: {
    label: 'Ethical dilemma',
    panelist: 'dean',
    hasActor: false,
    competencies: ['ethicalResponsibility', 'criticalThinking', 'understandingOthers', 'selfAwareness', 'oralCommunication'],
  },
  policy: {
    label: 'Policy / systems',
    panelist: 'dean',
    hasActor: false,
    competencies: ['criticalThinking', 'ethicalResponsibility', 'understandingOthers', 'oralCommunication'],
  },
  standard: {
    label: 'Standard question',
    panelist: 'faculty',
    hasActor: false,
    competencies: ['oralCommunication', 'selfAwareness', 'criticalThinking', 'commitmentToLearning', 'resilience'],
  },
  empathy: {
    label: 'Empathy / actor station',
    panelist: 'nurse',
    hasActor: true,
    competencies: ['empathy', 'interpersonalSkills', 'understandingOthers', 'oralCommunication', 'selfAwareness'],
  },
  teamwork: {
    label: 'Teamwork / conflict',
    panelist: 'nurse',
    hasActor: true,
    competencies: ['teamwork', 'interpersonalSkills', 'understandingOthers', 'resilience', 'oralCommunication'],
  },
  communication: {
    label: 'Communication / breaking news',
    panelist: 'nurse',
    hasActor: true,
    competencies: ['oralCommunication', 'empathy', 'interpersonalSkills', 'understandingOthers'],
  },
  motivation: {
    label: '"Why medicine" / service',
    panelist: 'community',
    hasActor: false,
    competencies: ['selfAwareness', 'commitmentToLearning', 'understandingOthers', 'oralCommunication', 'empathy'],
  },
  resilience: {
    label: 'Setback / resilience',
    panelist: 'student',
    hasActor: false,
    competencies: ['resilience', 'selfAwareness', 'commitmentToLearning', 'oralCommunication'],
  },
};

export const DEFAULT_STATION_TYPE = 'standard';

export function getStationType(key) {
  return STATION_TYPES[key] || STATION_TYPES[DEFAULT_STATION_TYPE];
}

// The panellist a station casts itself with, unless the student has overridden the choice.
export function panelistForStation(stationKey) {
  return getPanelist(getStationType(stationKey).panelist) || getPanelist(DEFAULT_PANEL_ID);
}

// ── Backchannels ─────────────────────────────────────────────────────────────
// Short listener noises produced WHILE the student is still talking. Station-dependent on purpose:
// a nurse educator hearing a difficult disclosure says "mm-hm"; a dean chairing an ethics station
// says nothing at all, and filling that silence would be the unrealistic choice, not the kind one.
const BACKCHANNEL_TOKENS = {
  warm: ['mm-hm', 'mm', 'right', 'yeah', 'okay'],
  sparse: ['mm-hm', 'okay'],
  none: [],
};

export function backchannelPolicy(persona, stationKey) {
  const station = getStationType(stationKey);
  const mode = persona?.backchannel || 'none';
  const tokens = BACKCHANNEL_TOKENS[mode] || [];
  // Even a warm persona goes quiet in a formal ethics/policy station — the register belongs to the
  // room, not only to the person.
  const formalStation = station.panelist === 'dean';
  if (formalStation) return { enabled: false, tokens: [], minGapMs: Infinity };
  return {
    enabled: tokens.length > 0,
    tokens,
    // How much continuous speech has to pass before another one is allowed. Anything faster reads
    // as an interruption, which is the failure mode we are specifically avoiding.
    minGapMs: mode === 'warm' ? 7000 : 14000,
  };
}

// ── Role-play actors ─────────────────────────────────────────────────────────
// The only personas allowed filled pauses. An actor playing a frightened parent or a defensive
// teammate SHOULD sound hesitant — the hesitancy is the character, and the competence cost lands on
// the character rather than on the person evaluating the student.
export const ACTOR_PERSONAS = [
  {
    id: 'actor-distressed',
    name: 'Actor — distressed',
    role: 'Role-play: someone upset',
    rate: 0.95, pitch: 1.04, rateVariance: 0.07, pitchVariance: 0.05,
    warmth: 0.6, formality: 0.1,
    backchannel: 'none',
    allowFilledPauses: true,
    turnGapMs: 300,
    prefer: [/^samantha\b/i, /^ava\b/i, /^allison\b/i, /jenny/i],
    toneInstruction: 'You are playing a character who is upset and not thinking clearly. Hesitate, trail off, repeat yourself. Do not summarise your own feelings neatly — a real person in distress does not do that. Never break character to coach the student.',
  },
  {
    id: 'actor-defensive',
    name: 'Actor — defensive',
    role: 'Role-play: someone who disagrees',
    rate: 1.02, pitch: 0.98, rateVariance: 0.06, pitchVariance: 0.04,
    warmth: 0.25, formality: 0.3,
    backchannel: 'none',
    allowFilledPauses: true,
    turnGapMs: 280,
    prefer: [/^tom\b/i, /^evan\b/i, /^alex\b/i, /^matthew\b/i],
    toneInstruction: 'You are playing someone who feels accused and is defending themselves. You interrupt yourself, you justify, you do not concede quickly. Never break character to coach the student.',
  },
];

export function getActor(id) {
  return ACTOR_PERSONAS.find(a => a.id === id) || null;
}
