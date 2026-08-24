// ─────────────────────────────────────────────────────────────────────────────
// The MMI station library.
//
// ── What was here before ────────────────────────────────────────────────────
// Twenty-four one-line prompts and fourteen scenarios, all of them fine, none
// of them a station. A real MMI station is not a question — it is two minutes
// outside a door reading a scenario posted on it, then five to eight minutes
// inside a room where something specific happens: an interviewer with a
// scripted set of probes, an actor playing a person who is upset with you, a
// partner you have to complete a task with, or a policy question you are
// expected to reason through out loud. A student who practices the questions
// and never practices the format arrives on the day having prepared for the
// wrong thing, and the format is genuinely the harder half.
//
// So every entry here is a station: a door card, a room, a clock, and a rater.
//
// ── The five formats ────────────────────────────────────────────────────────
//   interviewer   One interviewer, a scripted opening and real probes. The
//                 classic ethical-dilemma station.
//   actor         Someone is playing a character and will not break character.
//                 You are talking to THEM, not describing what you would say.
//                 This is the format students find hardest and practice least.
//   collaborative A task with a partner who holds information you do not. The
//                 only station where communication is tested as a channel
//                 rather than as polish.
//   policy        "What should be done about X." Systems-level reasoning, and
//                 the one station where having no personal experience of the
//                 issue is fine as long as you say so.
//   traditional   A conventional interview question, in an MMI room and on the
//                 MMI clock. Some circuits include two or three of these.
//
// ── The four archetypes ─────────────────────────────────────────────────────
// Most real stations are a variation on one of four situations, and building
// depth in these four covers more ground than breadth across twenty:
//   grief          Someone has lost something and you are the one who is there.
//   inadequacy     You are not good enough at something, and it has consequences.
//   ethics         Two things you believe are in conflict and you have to choose.
//   team-conflict  People who have to work together no longer want to.
//
// ── Difficulty ──────────────────────────────────────────────────────────────
// Every station on this list is written for a 16-year-old applying to a BS/MD
// or direct-admit program, not for a 24-year-old applying to medical school.
// The scenarios are structurally the same as the real ones — that is the point,
// the format transfers — but the setting is a school, a team, a club, a
// part-time job, a hospital volunteer shift, or a family. Nobody in this file
// is anyone's patient, nobody is a resident, and nobody has authority they
// would not really have. A station that requires the candidate to have managed
// staff or carried clinical responsibility is not a harder station for this
// student, it is an unanswerable one, and unanswerable stations teach nothing.
//
// ── Question stems ──────────────────────────────────────────────────────────
// Every prompt and probe ends on a noun rather than a function word. A stem
// ending on a preposition takes a rising, uncertain terminal when spoken aloud,
// and an interviewer who sounds unsure of their own question is unsettling.
// Enforced by questionStemIssue() in src/lib/voicePipeline.js, run over this
// file by scripts/verifyInterviewRealism.mjs.
// ─────────────────────────────────────────────────────────────────────────────

export const STATION_FORMATS = {
  interviewer: {
    label: 'Interviewer station',
    short: 'Interviewer',
    blurb: 'One interviewer, one scenario, and probes that go a layer deeper than your answer went.',
    defaultSeconds: 480,
  },
  actor: {
    label: 'Actor role-play',
    short: 'Role-play',
    blurb: 'Someone is playing a character. Talk to them, not about them — and they will not break character to help you.',
    defaultSeconds: 420,
  },
  collaborative: {
    label: 'Collaborative task',
    short: 'Task',
    blurb: 'A task you cannot finish alone, with a partner who knows something you do not.',
    defaultSeconds: 480,
  },
  policy: {
    label: 'Policy / systems',
    short: 'Policy',
    blurb: 'What should be done, by whom, and what it would cost. Reasoning out loud is the skill.',
    defaultSeconds: 420,
  },
  traditional: {
    label: 'Traditional question',
    short: 'Traditional',
    blurb: 'A conventional interview question, on the MMI clock.',
    defaultSeconds: 300,
  },
};

export const ARCHETYPES = {
  grief: {
    label: 'Consoling someone in grief',
    blurb: 'Someone has lost something and you are the person who happens to be there. The station is not about finding the right words — there are none — it is about whether you stay.',
    // What separates a 6 from a 5 here, specifically. Shown after the attempt, never before.
    hinge: 'Whether you moved toward the person or away from them. "I\'d give them space" and "I\'d sit down next to them" sound equally kind and are opposite answers.',
  },
  inadequacy: {
    label: 'Facing your own inadequacy',
    blurb: 'You are not good enough at something and it has affected someone else. The station is about what you do next, not about how bad you feel.',
    hinge: 'Whether you own the specific failure or convert it into a story about growth. A candidate who cannot name what they got wrong has not actually faced it.',
  },
  ethics: {
    label: 'Navigating an ethical dilemma',
    blurb: 'Two things you believe are in conflict. There is no answer that costs nothing, and the station is looking for whether you know that.',
    hinge: 'Whether you state the strongest version of the side you did not take. Picking a side in the first sentence and defending it for six minutes is the single most common way to score a 3.',
  },
  'team-conflict': {
    label: 'Resolving a conflict on a team',
    blurb: 'People who have to keep working together no longer want to. You are in it, not above it.',
    hinge: 'Whether you do something specific with a specific person by a specific time, or describe a philosophy of communication.',
  },
  other: {
    label: 'Motivation, service, and systems',
    blurb: 'The remainder — why medicine, what you owe people, and how you think about problems bigger than a room.',
    hinge: 'Whether anything you say could only have been said by you.',
  },
};

// Standard reading time, in seconds. Two minutes outside the door is what almost every real
// circuit uses, and practicing without it removes the part of the format that is actually hard:
// deciding what your first sentence is before the clock starts.
export const READING_SECONDS = 120;

// `formats` is which real interview format a station is useful practice for, and it is what the
// program tracker matches against: a student applying somewhere that runs a traditional panel
// should be sent to the traditional stations, not to a role-play circuit. Traditional-question
// stations serve both, because an MMI circuit really does include two or three of them.
const station = (s) => ({
  readingSeconds: READING_SECONDS,
  stationSeconds: s.stationSeconds || STATION_FORMATS[s.format].defaultSeconds,
  level: 'hs-bsmd',
  formats: s.formats || (s.format === 'traditional' ? ['mmi', 'traditional-panel'] : ['mmi']),
  ...s,
});

export const MMI_STATION_LIBRARY = [
  // ═══ ARCHETYPE: GRIEF ══════════════════════════════════════════════════════
  station({
    id: 'grief-locker-room',
    title: 'The friend outside the locker room',
    format: 'actor',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'Your closest friend on the team lost their father three weeks ago. They came back to practice today for the first time. Practice ended twenty minutes ago and everyone else has gone home. You have just walked out and found them sitting on the curb by the locker room, still in kit, not crying, not doing anything. Inside the room, they are playing your friend.',
    prompt: 'Hey. I was just about to head out and I saw you sitting here.',
    followUps: [
      'What is it you actually want them to feel by the end of this conversation?',
      'What would you have done differently if they had started crying instead?',
      'Is there anything you decided not to say to them, and what was the reason?',
    ],
    actor: {
      who: 'A 16-year-old who has just come back to school three weeks after their father died. Flat, tired, not dramatic.',
      wants: 'To not be asked how they are, and to not be left alone. Both at once.',
      opens: 'I\'m fine. I just didn\'t want to go home yet.',
      escalates: 'If the candidate offers advice, reassurance, or a silver lining, get quieter and shorter. "Yeah." "Mm." If they ask a third question in a row without saying anything of their own, say "Can you stop asking me things."',
      softens: 'If the candidate sits down, says something true and small, or admits they do not know what to say, open up slightly: "Everyone keeps telling me he\'s in a better place."',
    },
    raterLooksFor: [
      'Do they sit down, or do they stand over the person for six minutes?',
      'Do they say something honest about not knowing what to say, or perform competence?',
      'Do they tolerate a silence, or fill every one of them?',
      'Do they leave the person with something concrete — a time, a plan, a next contact?',
    ],
    commonFailure: 'Treating it as a question to answer rather than a person to sit with. Candidates narrate what they would do ("I would try to make them feel supported") instead of talking to the actor, and the actor cannot respond to narration.',
    competencies: ['empathy', 'interpersonalSkills', 'oralCommunication', 'understandingOthers'],
  }),
  station({
    id: 'grief-hospital-volunteer',
    title: 'The visitor in the corridor',
    format: 'actor',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'You volunteer at a hospital on Saturdays. Your job is to bring water, give directions, and push wheelchairs. You are not clinical staff and you have been told clearly that you do not discuss anyone\'s care. A woman in her sixties is sitting alone in the family room off the surgical corridor. As you pass with the water trolley she asks you to sit down. Inside the room, she is played by an actor.',
    prompt: 'Excuse me — sorry, could you sit for a minute. I just need someone to sit for a minute.',
    followUps: [
      'You are not allowed to discuss her family member\'s care. How did you handle the limit without making it about the rule?',
      'When did you decide to bring in a member of staff, and what made that the moment?',
      'What would you do at the end of your shift about what just happened to you?',
    ],
    actor: {
      who: 'A woman waiting on news about her husband. Frightened, talking quickly, not in tears yet.',
      wants: 'Information the volunteer does not have and is not allowed to give, and company while she waits.',
      opens: 'Nobody has told me anything for two hours. Do you know anything? You work here.',
      escalates: 'If the candidate answers any clinical question at all, press harder: "So he\'s stable then? You said stable." If the candidate leaves abruptly to get staff without saying they are coming back, become upset.',
      softens: 'If the candidate says plainly that they do not know and are not allowed to know, but stays: "I know. I know you don\'t. I\'m sorry."',
    },
    raterLooksFor: [
      'Do they say what they cannot do without hiding behind policy language?',
      'Do they stay in the room while arranging for someone who can help?',
      'Do they take on a role they do not have, which is the failure the station is built to catch?',
      'Do they notice this was hard for them too?',
    ],
    commonFailure: 'Either reassuring her about a clinical outcome they know nothing about, or fleeing the room to "get someone" and never coming back. Both are common and the second is nearly invisible to the candidate.',
    competencies: ['empathy', 'ethicalResponsibility', 'interpersonalSkills', 'oralCommunication', 'selfAwareness'],
  }),
  station({
    id: 'grief-team-death',
    title: 'The empty seat on the bus',
    format: 'interviewer',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'A member of your club died over the summer. It is the first meeting of the new year. You are the club president. Twenty-two people are in the room, about half of whom knew her well and about half of whom joined this year and never met her. Nobody has said anything about it yet and everyone is waiting to see whether you will.',
    prompt: 'Tell me what you say to that room, and where in the meeting you say it.',
    followUps: [
      'Half the room never met her. What do you owe the half who did, and what do you owe the half who did not?',
      'Someone starts crying while you are speaking. What happens next in the room?',
      'A member tells you afterwards that you should not have brought it up at all. What is your response to them?',
    ],
    raterLooksFor: [
      'Do they actually produce words, or describe the kind of words they would use?',
      'Do they hold both halves of the room, or optimize for one?',
      'Do they leave a route for people who do not want to be in the room?',
      'Do they make it about themselves as president?',
    ],
    commonFailure: 'Answering in the abstract. "I would acknowledge the loss and create a space for people to share" is a description of a speech, not a speech, and raters are explicitly trained to notice the difference.',
    competencies: ['empathy', 'oralCommunication', 'understandingOthers', 'interpersonalSkills'],
  }),
  station({
    id: 'grief-pet-younger-sibling',
    title: 'Your brother and the dog',
    format: 'actor',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'Your ten-year-old brother\'s dog was put down yesterday. Your parents told him it "went to live on a farm." He does not believe them and he has asked you, directly, whether the dog is dead. Inside the room, he is played by an actor.',
    prompt: 'Is Rocket dead? Mum said he went to a farm but there isn\'t a farm.',
    followUps: [
      'Your parents told him something you know is not true. How did you weigh that against telling him yourself?',
      'What would you say to your parents afterwards, if anything?',
      'Would your answer change if he were five instead of ten, and what is the reason?',
    ],
    actor: {
      who: 'A ten-year-old, sharp, not stupid, testing whether the older sibling will also lie.',
      wants: 'The truth, and to be told it by someone he trusts.',
      opens: 'Is Rocket dead? Mum said he went to a farm but there isn\'t a farm.',
      escalates: 'If the candidate deflects or repeats the farm story, get angry: "You\'re lying too." If they give a long philosophical answer, interrupt: "Just say yes or no."',
      softens: 'If told the truth plainly and kindly, go quiet, then: "Did it hurt him?"',
    },
    raterLooksFor: [
      'Do they answer the question that was asked?',
      'Do they cope with the second, harder question rather than closing the conversation once the first is done?',
      'Do they undermine the parents to the child, which is a real cost they should notice?',
      'Do they stay at the child\'s level without being condescending?',
    ],
    commonFailure: 'Ducking. A large fraction of candidates never actually say the dog is dead, and the actor is instructed to keep asking until they do or the clock runs out.',
    competencies: ['empathy', 'oralCommunication', 'ethicalResponsibility', 'interpersonalSkills'],
  }),
  station({
    id: 'grief-friend-rejection',
    title: 'The one who did not get in',
    format: 'actor',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'You and your closest friend both applied to the same competitive summer research program. You got in. They did not. Decisions came out four days ago and they have not replied to any of your messages since. You have just run into them in the library. Inside the room, they are played by an actor.',
    prompt: 'Oh — hey. I didn\'t know you were in here.',
    followUps: [
      'How do you hold their disappointment without pretending your own result is nothing?',
      'What is the one thing you most wanted to say and deliberately did not say?',
      'What do you do over the next month about this friendship?',
    ],
    actor: {
      who: 'A friend who is hurt, embarrassed about being hurt, and covering it with brightness.',
      wants: 'To not be pitied, and to not have the thing pretended away.',
      opens: 'Hey! Congrats, by the way. Seriously. I meant to text.',
      escalates: 'If the candidate minimises their own achievement ("it was luck, honestly"), get sharper: "Don\'t do that. Don\'t make it small so I feel better." If they only talk about the program, go flat.',
      softens: 'If the candidate names the awkwardness out loud, drop the brightness: "I really wanted it."',
    },
    raterLooksFor: [
      'Do they name the awkwardness, or spend six minutes working around it?',
      'Do they diminish their own result as a kindness, which this actor is scripted to reject?',
      'Do they ask anything about the friend rather than explaining themselves?',
      'Do they leave with anything concrete between them?',
    ],
    commonFailure: 'Apologizing for having succeeded. It reads as generous and lands as condescending, and the station is built so the candidate finds that out.',
    competencies: ['empathy', 'selfAwareness', 'interpersonalSkills', 'understandingOthers'],
  }),
  station({
    id: 'grief-coach-diagnosis',
    title: 'The coach who is leaving',
    format: 'interviewer',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'Your coach of four years has told the team she is stepping down at the end of the season because she is unwell. She has not said what is wrong and has asked that nobody ask. Two members of the team have started speculating, loudly, in the group chat, and one of them has looked something up and posted it.',
    prompt: 'Tell me what you do about that group chat, and when.',
    followUps: [
      'Say what you actually type. The words, not the intention.',
      'One of the two is a close friend of yours. Does that change what you do, and how?',
      'What do you say to your coach, if anything, about any of this?',
    ],
    raterLooksFor: [
      'Do they act inside the chat, where the harm is, or only privately?',
      'Do they produce actual words when asked for them?',
      'Do they respect the coach\'s stated wish rather than deciding they know better?',
      'Do they distinguish between stopping the speculation and punishing the speculators?',
    ],
    commonFailure: 'Handling it entirely in direct messages so the twenty people who saw the post never see anything corrected, and never noticing that the public part was the problem.',
    competencies: ['empathy', 'ethicalResponsibility', 'interpersonalSkills', 'oralCommunication'],
  }),
  station({
    id: 'grief-anniversary',
    title: 'A year later',
    format: 'traditional',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. There is no scenario to read here — the two minutes are for choosing WHICH story you are going to tell, which is the decision most candidates make while already talking. Five minutes inside, and the follow-ups are where the station is won.',
    prompt: 'Most people are good at the first week after something terrible happens to someone they know, and bad at the fourth month. Tell me about a time you kept showing up long after everyone else had stopped.',
    followUps: [
      'What did you actually do, on which day?',
      'What did it cost you?',
      'Was there a point where you stopped, and what made you stop?',
    ],
    raterLooksFor: [
      'Is there a specific person, a specific month, and a specific action?',
      'Do they claim more consistency than they had?',
      'Is the cost acknowledged, or is the story frictionless?',
    ],
    commonFailure: 'A frictionless story. Real sustained support has a moment where the person got tired of it, and a candidate who does not mention one has either not done it or is not being honest about it.',
    competencies: ['empathy', 'selfAwareness', 'resilience', 'oralCommunication'],
  }),
  station({
    id: 'grief-classmate-suicide-hotline',
    title: 'The message at eleven at night',
    format: 'actor',
    archetype: 'grief',
    stationType: 'empathy',
    door: 'A classmate you know a little, not well, has messaged you at eleven at night. They are not in immediate danger and have said so, but they are clearly not all right and they have asked you not to tell anyone. Inside the room they are played by an actor, and the conversation is happening by voice.',
    prompt: 'Sorry. I know it\'s late. I didn\'t really know who else to message.',
    followUps: [
      'They asked you to keep it to yourself. What did you actually promise them?',
      'What is the line, for you, between a confidence and something you have to take to an adult?',
      'What do you do tomorrow morning?',
    ],
    actor: {
      who: 'A classmate, exhausted, embarrassed to have messaged, ready to withdraw at any sign of alarm.',
      wants: 'To be listened to without the situation being escalated over their head.',
      escalates: 'If the candidate immediately says they must tell an adult, shut down: "Forget it. I shouldn\'t have said anything." If they promise absolute secrecy, accept it and go quieter.',
      softens: 'If the candidate is honest about what they can and cannot promise, stay: "Okay. I get that."',
    },
    raterLooksFor: [
      'Do they make a promise they cannot keep, which is the single most common error here?',
      'Do they stay in the conversation rather than converting it into a referral in the first thirty seconds?',
      'Do they name a specific adult and a specific next step?',
      'Do they check what the person actually wants from them?',
    ],
    commonFailure: 'Promising total secrecy in order to keep them talking. It is the kind thing to say and it is the wrong thing to say, and this station exists to make that trade visible.',
    competencies: ['empathy', 'ethicalResponsibility', 'selfAwareness', 'interpersonalSkills'],
  }),
  station({
    id: 'grief-what-to-say',
    title: 'What people say',
    format: 'policy',
    archetype: 'grief',
    stationType: 'policy',
    door: 'Schools increasingly provide "grief protocols" — scripted announcements, designated rooms, counselors on site — when a student or staff member dies. Some people argue this makes the response consistent and fair. Others argue it makes it institutional and cold, and that scripted sympathy is worse than awkward sympathy.',
    prompt: 'Where do you come down on scripted grief protocols in schools, and what would you keep from each side?',
    followUps: [
      'Who is a protocol protecting — the students, or the institution?',
      'What would you actually put in the protocol if you had to write it?',
      'What is the strongest argument against your own position?',
    ],
    raterLooksFor: [
      'Do they engage with the institutional interest, or only with the emotional one?',
      'Do they get concrete when asked to write the thing?',
      'Do they steelman the side they did not take?',
    ],
    commonFailure: 'Answering the emotional question ("grief is personal") and never touching the systems question, which is what a policy station is actually asking.',
    competencies: ['criticalThinking', 'ethicalResponsibility', 'understandingOthers', 'oralCommunication'],
  }),
  station({
    id: 'grief-collab-memorial',
    title: 'Planning the memorial, blind',
    format: 'collaborative',
    archetype: 'grief',
    stationType: 'collaborative',
    door: 'You and another student have been asked to agree a plan for a memorial event for a teacher who died, and to present one plan at the end of eight minutes. You have each been given different information about what the family wants, and you have not been told that the other person has information you do not. You may not show each other your sheets.',
    prompt: 'You have eight minutes and you have to leave this room with one plan. Start wherever you want.',
    followUps: [
      'You disagreed on the date. Walk me through how that got resolved.',
      'What did you learn during those eight minutes that you did not know at the start, and what question got you there?',
    ],
    task: {
      goal: 'One agreed plan, stated out loud, before the clock stops.',
      partnerHas: 'The family have asked for nothing religious and nothing at the school itself. The candidate\'s own sheet says the students want it in the school hall and want the school choir to sing.',
      constraint: 'Neither of you can show the other your sheet, so the only route to the conflict is asking.',
      twist: 'At the six-minute mark the partner says the family have also asked that it happen this week.',
    },
    raterLooksFor: [
      'Do they ask what the other person has, or start by asserting what they have?',
      'Do they discover the conflict, or produce a plan that quietly violates the family\'s wishes?',
      'When the twist lands with two minutes left, do they adapt or defend the plan they already built?',
      'Do they actually reach a stated plan, or run out of time still negotiating?',
    ],
    commonFailure: 'Spending six minutes building a beautiful plan from one sheet. The station is not testing planning; it is testing whether you find out what you do not know.',
    competencies: ['teamwork', 'oralCommunication', 'interpersonalSkills', 'resilience', 'criticalThinking'],
  }),

  // ═══ ARCHETYPE: INADEQUACY ═════════════════════════════════════════════════
  station({
    id: 'inadequacy-lab-mistake',
    title: 'The samples',
    format: 'interviewer',
    archetype: 'inadequacy',
    stationType: 'ethical',
    door: 'You have a summer position in a university lab. You were asked to label and freeze a set of samples. Two weeks later you realize you almost certainly mislabelled a batch — you cannot be certain which batch, and the data from it has already gone into a graduate student\'s analysis. Nobody has noticed. Nobody would ever necessarily notice.',
    prompt: 'Tell me what you do, starting with the first thing and when you do it.',
    followUps: [
      'You are not certain you made a mistake. How does the uncertainty change what you say to your supervisor?',
      'The graduate student has a deadline in nine days. Does that change anything about your timing?',
      'What do you say, in the actual words, when you knock on your supervisor\'s door?',
    ],
    raterLooksFor: [
      'Do they disclose despite the uncertainty, and do they say so in a way that does not overstate what they know?',
      'Do they name a specific person and a specific day?',
      'Do they think about the downstream consequence for someone else rather than only their own standing?',
      'Do they propose anything to stop it recurring?',
    ],
    commonFailure: 'Waiting to be sure. A candidate who says they would "check carefully first and then decide" has not noticed that checking carefully is exactly what they cannot do alone, and that every day of checking is a day of contaminated analysis.',
    competencies: ['ethicalResponsibility', 'selfAwareness', 'criticalThinking', 'commitmentToLearning'],
  }),
  station({
    id: 'inadequacy-tutoring-out-of-depth',
    title: 'Out of your depth',
    format: 'actor',
    archetype: 'inadequacy',
    stationType: 'communication',
    door: 'You tutor a younger student in chemistry, paid, arranged through a neighbor. Three sessions in, it is clear the material they need help with is beyond you — you are getting it wrong and they are getting more confused. Their exam is in five weeks. Inside the room, the student is played by an actor.',
    prompt: 'So I did the homework the way you showed me and I got them all wrong.',
    followUps: [
      'You are being paid for this. How did that factor into what you said?',
      'What do you say to the parent who is paying you?',
      'What would have been the right moment to say this, looking back?',
    ],
    actor: {
      who: 'A 14-year-old who trusts the tutor and is now anxious about the exam.',
      wants: 'Someone competent, and not to have to start again with a stranger.',
      escalates: 'If the candidate bluffs or promises to "look it up and come back", ask a direct chemistry question they will not be able to answer. If they abandon the student outright, get upset: "So I just have nobody now?"',
      softens: 'If the candidate is honest and offers a concrete handover, relax: "Okay. Can you help me find someone?"',
    },
    raterLooksFor: [
      'Do they say plainly that they got it wrong, to the person affected?',
      'Do they leave the student with a route, or just leave?',
      'Do they handle the money without being asked?',
      'Do they resist the pull to keep bluffing for five more weeks?',
    ],
    commonFailure: 'Committing to "brushing up over the weekend". It is what most people would really do and it is the answer that scores lowest, because the exam is in five weeks and the candidate has just bought themselves another three sessions of the same problem.',
    competencies: ['selfAwareness', 'ethicalResponsibility', 'oralCommunication', 'commitmentToLearning'],
  }),
  station({
    id: 'inadequacy-first-shift',
    title: 'The volunteer shift you are bad at',
    format: 'interviewer',
    archetype: 'inadequacy',
    stationType: 'resilience',
    door: 'You volunteer at a care home. Six weeks in, one of the staff tells you, not unkindly, that residents have said you are "a bit much" — that you talk quickly, ask a lot of questions, and do not leave gaps. You had thought this was going well.',
    prompt: 'Tell me what happens in your head between hearing that and your next shift.',
    followUps: [
      'What specifically do you change, and how would anyone know you had changed it?',
      'How do you check whether the change worked, given that nobody is going to volunteer a second round of feedback?',
      'Is there a version of this feedback you would push back on, and where is that line?',
    ],
    raterLooksFor: [
      'Do they accept the feedback without collapsing under it?',
      'Do they convert it into a specific behavioral change rather than a resolution to "be more mindful"?',
      'Do they build any way of finding out whether it worked?',
      'Do they retain the right to disagree, without using that right to dismiss it?',
    ],
    commonFailure: 'Either total collapse ("I would feel awful and probably stop") or total deflection ("some people just prefer quiet"). The band is won in the middle, and the middle is narrow.',
    competencies: ['selfAwareness', 'resilience', 'commitmentToLearning', 'understandingOthers'],
  }),
  station({
    id: 'inadequacy-team-carried',
    title: 'The one who was carried',
    format: 'traditional',
    archetype: 'inadequacy',
    stationType: 'standard',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. There is no scenario to read here — the two minutes are for choosing WHICH story you are going to tell, which is the decision most candidates make while already talking. Five minutes inside, and the follow-ups are where the station is won.',
    prompt: 'Tell me about a time you were the weakest person on a team, and what the rest of the team had to do because of it.',
    followUps: [
      'What did it cost the other people, specifically?',
      'Did you ever say any of this to them at the time?',
      'What are you actually better at now, and how do you know that?',
    ],
    raterLooksFor: [
      'Do they name a real weakness rather than a strength in disguise?',
      'Do they account for the cost to other people?',
      'Is the improvement evidenced or asserted?',
    ],
    commonFailure: 'The humblebrag: "I was the weakest at delegating because I care too much about doing things properly." Raters hear this several times per circuit and score it as an unanswered question.',
    competencies: ['selfAwareness', 'teamwork', 'commitmentToLearning', 'oralCommunication'],
  }),
  station({
    id: 'inadequacy-scholarship-overstated',
    title: 'The line on the application',
    format: 'interviewer',
    archetype: 'inadequacy',
    stationType: 'ethical',
    door: 'You wrote on a scholarship application that you "led" a volunteering project. You did organize most of it, but there were two of you and the other person did at least as much. You have been shortlisted. The interview is next week and the project is listed as the main reason you were shortlisted.',
    prompt: 'Tell me what you do before that interview.',
    followUps: [
      'Is there a version of "led" that is honest here, and what is it?',
      'What do you say to the other person, if anything?',
      'If you correct it and lose the scholarship, was that the right call?',
    ],
    raterLooksFor: [
      'Do they treat this as a real problem rather than a technicality?',
      'Do they involve the other person, who has a stake and is invisible in most answers?',
      'Do they accept the cost of correcting it rather than finding a reading of "led" that gets them off?',
      'Do they distinguish between what they wrote and what they will now say out loud?',
    ],
    commonFailure: 'Lawyering the word. A candidate who spends four minutes establishing that "led" can reasonably describe co-organizing has told the rater exactly what they would do in a harder version of this.',
    competencies: ['ethicalResponsibility', 'selfAwareness', 'criticalThinking', 'commitmentToLearning'],
  }),
  station({
    id: 'inadequacy-collab-instructions',
    title: 'The thing you cannot see',
    format: 'collaborative',
    archetype: 'inadequacy',
    stationType: 'collaborative',
    door: 'Inside this room there is a diagram you can see and your partner cannot. Your partner has a pen and paper. In eight minutes they have to draw the diagram from your description alone. You may not draw, gesture, or look at their paper. They may ask you anything.',
    prompt: 'You can start whenever you are ready. Eight minutes.',
    followUps: [
      'At what point did you realize your description was not working?',
      'What did you change once you realized it, and why that?',
      'If you ran it again with a new partner, what is the first sentence out of your mouth?',
    ],
    task: {
      goal: 'A drawing that matches the diagram, produced by someone who never saw it.',
      partnerHas: 'The pen, the paper, and no idea what they are drawing.',
      constraint: 'No drawing, no gesturing, no looking at their page.',
      twist: 'The partner is instructed to follow instructions literally and never to guess intent. "Draw a house" gets a stick-figure house that is wrong in five ways.',
    },
    raterLooksFor: [
      'Do they establish a shared frame first ("the page is landscape, there are three shapes") or start describing details immediately?',
      'Do they ask the partner what they have so far, or transmit for eight minutes without checking?',
      'When it goes wrong, do they blame the instructions or change them?',
      'Do they stay calm when they are visibly failing, which is the actual thing being measured?',
    ],
    commonFailure: 'Never once asking "what have you got?". Candidates treat this as a broadcasting task and it is a feedback-loop task, and the difference is visible within ninety seconds.',
    competencies: ['oralCommunication', 'teamwork', 'resilience', 'criticalThinking', 'interpersonalSkills'],
  }),
  station({
    id: 'inadequacy-rejected-program',
    title: 'The thing you did not get',
    format: 'traditional',
    archetype: 'inadequacy',
    stationType: 'resilience',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. There is no scenario to read here — the two minutes are for choosing WHICH story you are going to tell, which is the decision most candidates make while already talking. Five minutes inside, and the follow-ups are where the station is won.',
    prompt: 'Tell me about something you wanted badly, worked for, and did not get.',
    followUps: [
      'What did you actually conclude about why?',
      'What did you do in the following month?',
      'What would you tell someone who is in that month right now?',
    ],
    raterLooksFor: [
      'Is there a real conclusion, or is the failure attributed entirely to luck or to other people?',
      'Is there a month of nothing, honestly reported, before the recovery?',
      'Does the answer end anywhere other than "it made me stronger"?',
    ],
    commonFailure: 'Compressing the middle. The recovery arriving in the next sentence after the rejection is the tell that this is a story rather than a memory.',
    competencies: ['resilience', 'selfAwareness', 'commitmentToLearning', 'oralCommunication'],
  }),
  station({
    id: 'inadequacy-actor-blamed',
    title: 'Being blamed for it',
    format: 'actor',
    archetype: 'inadequacy',
    stationType: 'teamwork',
    door: 'Your group project got a poor mark. One section was yours and it was genuinely the weakest part, though it was not the only problem. A member of the group has asked to speak to you. Inside the room, they are played by an actor.',
    prompt: 'Look — I don\'t want to make this a thing, but we need to talk about the write-up.',
    followUps: [
      'How much of that mark was actually yours, and how did you decide?',
      'They overstated it. How did you hold both — that you were at fault, and that they were being unfair?',
      'What happens on the next project the two of you are in together?',
    ],
    actor: {
      who: 'A group member who is angry, has a point, and is overstating it.',
      wants: 'An admission, and to not be the only one who cared.',
      escalates: 'If the candidate defends themselves first, escalate: "You had three weeks." If they capitulate entirely and accept blame for everything, push further: "So you agree the whole thing was your fault."',
      softens: 'If the candidate owns their part specifically and separates it from the rest, ease off: "Okay. Yeah. It wasn\'t all you."',
    },
    raterLooksFor: [
      'Do they own the specific thing before defending anything?',
      'Do they accept blame for things that were not theirs just to end the conversation?',
      'Do they get anywhere concrete about next time?',
      'Do they stay in the room emotionally when someone is angry at them?',
    ],
    commonFailure: 'Over-apologizing. The actor is scripted to escalate against total capitulation precisely because agreeing with everything is not accountability, it is conflict avoidance wearing accountability\'s clothes.',
    competencies: ['selfAwareness', 'teamwork', 'interpersonalSkills', 'resilience', 'oralCommunication'],
  }),
  station({
    id: 'inadequacy-policy-remediation',
    title: 'Students who fail',
    format: 'policy',
    archetype: 'inadequacy',
    stationType: 'policy',
    door: 'Some direct-admit medical programs guarantee a place at the medical school provided the student maintains a set GPA and test threshold during their undergraduate years. Students who fall below it lose the guarantee, sometimes in their second year. Some programs offer a remediation route; others do not.',
    prompt: 'Should a program that guarantees a place have an obligation to remediate a student who falls below the line, or is the line the point?',
    followUps: [
      'Who is harmed if the line is soft, and who is harmed if it is hard?',
      'Does it change your answer if the student fell below the line during a family crisis?',
      'What is the strongest argument against the position you just took?',
    ],
    raterLooksFor: [
      'Do they identify that the line protects future patients as well as constraining students?',
      'Do they handle the hard case without abandoning the principle entirely?',
      'Do they distinguish between a rule and its administration?',
    ],
    commonFailure: 'Answering as an anxious applicant rather than as someone reasoning about a system. The station is fair to a 16-year-old precisely because it does not require experience, only reasoning.',
    competencies: ['criticalThinking', 'ethicalResponsibility', 'understandingOthers', 'oralCommunication'],
  }),
  station({
    id: 'inadequacy-not-good-enough',
    title: 'The thing you are not good at',
    format: 'interviewer',
    archetype: 'inadequacy',
    stationType: 'standard',
    door: 'Medicine requires a set of things nobody is uniformly good at: memorizing, staying calm, being wrong in public, sitting with distress, working when tired, and asking for help.',
    prompt: 'Pick the one on that list you are worst at, and convince me you know how bad you are at it.',
    followUps: [
      'What has it cost you so far, concretely?',
      'What are you actually doing about it this month?',
      'What would someone who works with you say about it if I asked them?',
    ],
    raterLooksFor: [
      'Do they pick a real one, or the one that sounds most forgivable?',
      'Is there evidence of the cost, or only an admission?',
      'Is the remedy current, or aspirational?',
    ],
    commonFailure: 'Picking "asking for help" and describing it as excessive independence. It is the safe answer and every rater has heard it four times before lunch.',
    competencies: ['selfAwareness', 'commitmentToLearning', 'oralCommunication', 'resilience'],
  }),

  // ═══ ARCHETYPE: ETHICS ═════════════════════════════════════════════════════
  station({
    id: 'ethics-cheating-ranking',
    title: 'The exam that moved the ranking',
    format: 'interviewer',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'A classmate tells you, in confidence, that they cheated on an exam. The exam determined class ranking, and their result moved several people down, including you. They are frightened, they came to you rather than anyone else, and they have asked you to keep it to yourself.',
    prompt: 'Tell me what you do, and when.',
    followUps: [
      'Give me the strongest argument for saying nothing at all.',
      'Does it change if the school\'s policy is automatic expulsion?',
      'What do you say to them before you do whatever you are going to do?',
    ],
    raterLooksFor: [
      'Do they state the case for silence at its strongest before rejecting it?',
      'Do they name the students who cannot advocate for themselves because they do not know?',
      'Do they give the classmate a route to self-disclose, and a deadline?',
      'Do they notice their own interest in the ranking, and say so?',
    ],
    commonFailure: 'Reporting it in the first sentence with no engagement, or protecting the friend with no engagement. Both are decisions without reasoning and both sit in the bottom band.',
    competencies: ['ethicalResponsibility', 'criticalThinking', 'understandingOthers', 'selfAwareness'],
  }),
  station({
    id: 'ethics-vaccine-family',
    title: 'The relative who will not',
    format: 'actor',
    archetype: 'ethics',
    stationType: 'communication',
    door: 'A relative you are close to has decided against a vaccine that their doctor recommended. They know you are interested in medicine and have brought it up with you at a family gathering, in front of other people. Inside the room, they are played by an actor.',
    prompt: 'You\'re the one who wants to be a doctor. Tell them — tell them I\'m not being stupid about this.',
    followUps: [
      'They put you on the spot in front of other people. How much of what you did was about the room?',
      'What did you decide not to argue about, and why that?',
      'Do you follow it up privately, and what do you say?',
    ],
    actor: {
      who: 'A relative in their fifties, not hostile, has read a lot, feels talked down to by clinicians.',
      wants: 'To be taken seriously, not corrected in public.',
      escalates: 'If the candidate lectures or cites data at them, harden: "See, this is exactly what they do." If the candidate agrees with them to keep the peace, push: "So you think I\'m right?"',
      softens: 'If the candidate asks what specifically worries them, engage: "It\'s how fast it happened. Nobody will just say that plainly."',
    },
    raterLooksFor: [
      'Do they ask before they tell?',
      'Do they manage the public setting rather than pretending it is a private conversation?',
      'Do they stay honest rather than buying peace with agreement?',
      'Do they know the limits of what they actually know?',
    ],
    commonFailure: 'Winning. A candidate who successfully argues the relative into silence in front of the family has failed the station even if every fact they said was correct.',
    competencies: ['oralCommunication', 'understandingOthers', 'empathy', 'ethicalResponsibility'],
  }),
  station({
    id: 'ethics-boss-unfair',
    title: 'The instruction you think is wrong',
    format: 'interviewer',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'You work weekends at a shop. Your manager tells you to stop serving a particular regular customer, who is homeless, because he "puts people off". He is not doing anything except buying coffee. There is no rule being broken and the manager is within their rights to set who is served.',
    prompt: 'Tell me what you do on your next shift.',
    followUps: [
      'What is the strongest reason your manager might have that you have not considered?',
      'You could lose this job. Where does that sit in your reasoning?',
      'What do you actually say to the customer if he arrives while you are on the till?',
    ],
    raterLooksFor: [
      'Do they engage with the manager\'s position rather than dismissing it?',
      'Do they weigh a real personal cost honestly rather than pretending it is nothing?',
      'Do they have a plan for the actual moment at the till, which is where this gets decided?',
      'Do they escalate anywhere, and to whom?',
    ],
    commonFailure: 'Heroism with no cost. "I would refuse and explain why it is wrong" with no acknowledgement that they might be fired, and no thought about the customer\'s experience of being at the center of a scene.',
    competencies: ['ethicalResponsibility', 'criticalThinking', 'understandingOthers', 'resilience'],
  }),
  station({
    id: 'ethics-organ-allocation',
    title: 'Two patients, one liver',
    format: 'policy',
    archetype: 'ethics',
    stationType: 'policy',
    door: 'Transplant programs sometimes require a period of documented abstinence before a patient with alcohol-related liver disease can be listed. Supporters argue it predicts survival and protects a scarce organ. Critics argue it punishes a disease, and that the sickest patients cannot survive the waiting period.',
    prompt: 'Should abstinence periods be a condition of listing for a transplant?',
    followUps: [
      'What are you actually optimizing for — survival of the organ, fairness between patients, or something else?',
      'Does it matter whether the public thinks the rule is fair?',
      'Give me the best version of the argument against your answer.',
    ],
    raterLooksFor: [
      'Do they identify scarcity as the thing that makes this hard, rather than treating it as a question about deserving?',
      'Do they distinguish between predicting outcomes and assigning blame?',
      'Do they say what they do not know?',
    ],
    commonFailure: 'Moralizing in either direction. This station is famous for producing confident speeches about personal responsibility, and confident speeches score badly here because the question is about allocation under scarcity.',
    competencies: ['criticalThinking', 'ethicalResponsibility', 'understandingOthers', 'oralCommunication'],
  }),
  station({
    id: 'ethics-friend-driving',
    title: 'The keys',
    format: 'actor',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'You are at a party. A friend who has been drinking is about to drive home. Three other people are planning to get in the car. Inside the room, your friend is played by an actor, and they have the keys.',
    prompt: 'I\'ve had like two. I\'m completely fine. Move.',
    followUps: [
      'Say what you would do if they walked past you anyway.',
      'Would you call their parents, and at what point?',
      'What do you owe the three people getting in the car, as opposed to what you owe your friend?',
    ],
    actor: {
      who: 'A friend, embarrassed, defensive, in a hurry, not extremely drunk but not fit to drive.',
      wants: 'To leave without a scene.',
      escalates: 'If the candidate is timid or negotiates, walk toward the door. If they are loudly confrontational in front of everyone, get angry and dig in.',
      softens: 'If they offer a concrete alternative — a lift, a bed, the keys held until morning — hesitate: "And what, I leave my car here?"',
    },
    raterLooksFor: [
      'Do they act, or do they persuade indefinitely while the clock runs?',
      'Do they think about the three passengers, who are absent from most answers?',
      'Do they have a fallback for refusal, or does the plan end when the friend says no?',
      'Do they weigh the friendship honestly instead of pretending it costs nothing?',
    ],
    commonFailure: 'A single strategy with no plan B. The actor is instructed to refuse the first approach, so a candidate with only one approach spends four minutes repeating it.',
    competencies: ['ethicalResponsibility', 'interpersonalSkills', 'criticalThinking', 'resilience'],
  }),
  station({
    id: 'ethics-confidential-friend',
    title: 'Told in confidence',
    format: 'interviewer',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'A friend has told you something in confidence that makes you think they may be at risk. They have not asked for help, they have explicitly asked you not to tell anyone, and you promised.',
    prompt: 'Tell me how you decide whether to keep that promise.',
    followUps: [
      'What specifically would have to be true for you to break it?',
      'Do you tell them before you do it, and what is the argument on each side?',
      'What is the cost to them of you breaking it, in their terms rather than yours?',
    ],
    raterLooksFor: [
      'Do they build a threshold, or answer only for this case?',
      'Do they take the cost of breaking confidence seriously rather than treating it as obviously correct?',
      'Do they name a real adult, not "a trusted adult"?',
      'Do they tell the friend first, and can they defend the choice either way?',
    ],
    commonFailure: 'Treating the promise as void the moment risk appears. The strongest answers hold that breaking it is a real harm they are choosing to cause, and say so.',
    competencies: ['ethicalResponsibility', 'empathy', 'criticalThinking', 'selfAwareness'],
  }),
  station({
    id: 'ethics-ai-essay',
    title: 'The essay someone else wrote',
    format: 'interviewer',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'A friend tells you they used an AI tool to write most of their college application essay. They have asked what you think. The application is already submitted. You are applying to the same program.',
    prompt: 'Tell me what you say to them.',
    followUps: [
      'You are applying to the same place. How does that change what you say, or what you are entitled to do?',
      'Where is the line between using a tool and submitting someone else\'s work?',
      'Does anything change if the essay is genuinely about their own life?',
    ],
    raterLooksFor: [
      'Do they declare their own conflict of interest out loud?',
      'Do they draw a defensible line rather than a slogan?',
      'Do they distinguish between what they think, what they say, and what they do?',
    ],
    commonFailure: 'Never mentioning that they are applying to the same program. It is the most important fact in the scenario and roughly half of candidates walk past it.',
    competencies: ['ethicalResponsibility', 'selfAwareness', 'criticalThinking', 'oralCommunication'],
  }),
  station({
    id: 'ethics-collab-triage',
    title: 'Two of you, one budget',
    format: 'collaborative',
    archetype: 'ethics',
    stationType: 'collaborative',
    door: 'You and another student are the whole committee for a school hardship fund. There is enough money for two of the four applications in front of you. You each have information about two of the applicants that the other does not have. You must agree on two, together, in eight minutes.',
    prompt: 'Two of the four. Eight minutes. However you want to do it.',
    followUps: [
      'What criterion did the two of you actually end up using, and when was it agreed?',
      'Which applicant did you give up on, and how did that get decided?',
    ],
    task: {
      goal: 'Two named applicants, agreed aloud, before the clock stops.',
      partnerHas: 'Detail on two applicants the candidate knows nothing about, including one whose need is clearly greatest.',
      constraint: 'No sheets may be exchanged. Everything has to be said out loud.',
      twist: 'The partner is instructed to advocate hard for a weaker case they have a personal connection to, and to say so honestly if asked directly whether they know the applicant.',
    },
    raterLooksFor: [
      'Do they agree a criterion before comparing cases, or argue case by case forever?',
      'Do they ask the question that surfaces the partner\'s conflict of interest?',
      'Do they handle the conflict without humiliating the partner?',
      'Do they reach two names, or run out with the process unfinished?',
    ],
    commonFailure: 'Deciding by whoever argues hardest. The station is built so that the loudest advocacy is for the weakest case, and a pair with no agreed criterion will pick it.',
    competencies: ['teamwork', 'ethicalResponsibility', 'criticalThinking', 'oralCommunication', 'interpersonalSkills'],
  }),
  station({
    id: 'ethics-resource-clinic',
    title: 'The clinic that has to choose',
    format: 'policy',
    archetype: 'ethics',
    stationType: 'policy',
    door: 'A free clinic in your area can either keep evening hours open, which mostly serves people who work during the day, or expand its paediatric service, which mostly serves families who can already attend during the day. It cannot do both with its funding.',
    prompt: 'How should the clinic decide, and who should be in the room when it does?',
    followUps: [
      'Who is not represented in that room, and what would they say?',
      'Would you decide differently if you knew the evening patients were fewer but sicker?',
      'What information would you want that you do not have?',
    ],
    raterLooksFor: [
      'Do they ask who decides, not only what is decided?',
      'Do they notice the people who cannot attend a consultation about evening hours because they work?',
      'Do they name what they would need to know?',
    ],
    commonFailure: 'Picking one and defending it. The question asks how the decision should be made, and candidates who answer "which one" have answered a different question.',
    competencies: ['criticalThinking', 'understandingOthers', 'ethicalResponsibility', 'oralCommunication'],
  }),
  station({
    id: 'ethics-found-wallet',
    title: 'The wallet',
    format: 'traditional',
    archetype: 'ethics',
    stationType: 'ethical',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. There is no scenario to read here — the two minutes are for choosing WHICH story you are going to tell, which is the decision most candidates make while already talking. Five minutes inside, and the follow-ups are where the station is won.',
    prompt: 'You find a wallet in an empty school corridor with cash and a student ID inside. Walk me through exactly what you do, in order.',
    followUps: [
      'What is the argument for handing it to the office rather than to the person directly?',
      'Does the amount of cash change anything, and should it?',
      'You hand it in and later hear that the cash never reached them. What now?',
    ],
    raterLooksFor: [
      'Are the steps actually sequential and specific?',
      'Do they engage with the follow-up rather than treating the first answer as the whole station?',
      'Do they notice that "obviously hand it in" is not the end of the reasoning?',
    ],
    commonFailure: 'Finishing in forty seconds. The station is easy on the surface and the probes are the station; candidates who deliver a complete answer and then have nothing further score exactly average.',
    competencies: ['ethicalResponsibility', 'criticalThinking', 'oralCommunication'],
  }),

  // ═══ ARCHETYPE: TEAM CONFLICT ══════════════════════════════════════════════
  station({
    id: 'team-freeloader',
    title: 'The member who is not doing it',
    format: 'actor',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'A four-person project is due in six days. One member has produced nothing for three weeks and has stopped replying in the group chat. Everyone likes them. You have arranged to meet them. Inside the room, they are played by an actor.',
    prompt: 'Hey. Sorry — I know I\'ve been rubbish about the chat.',
    followUps: [
      'What did you learn in there that you did not know before the conversation?',
      'What is the actual plan for the six days, in specifics?',
      'Do you tell the teacher, and does the answer depend on what you just heard?',
    ],
    actor: {
      who: 'A group member who has been dealing with something at home and has not told anyone.',
      wants: 'To not be interrogated, and to not lose the group.',
      escalates: 'If the candidate opens with accusation or a deadline, become defensive and vague: "I said I\'d do it." If they threaten to go to the teacher early, shut down.',
      softens: 'If asked an open question about how they are before anything about the project, disclose: "My mum\'s been in hospital. I didn\'t want it to be a whole thing."',
    },
    raterLooksFor: [
      'Do they ask before they schedule?',
      'Do they hold fairness to the other three at the same time as compassion for this one?',
      'Do they produce an actual six-day plan?',
      'Do they redistribute the work, or quietly absorb it themselves and call that kindness?',
    ],
    commonFailure: 'Absorbing the work. It feels generous, it is invisible, and it teaches the rater that under pressure this candidate will do everyone\'s job instead of managing the situation.',
    competencies: ['teamwork', 'empathy', 'interpersonalSkills', 'criticalThinking'],
  }),
  station({
    id: 'team-two-friends',
    title: 'Two people you both need',
    format: 'interviewer',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'You run a club. Two members who cannot stand each other are both essential and both have supporters. The split is now affecting attendance and two other members have quietly stopped coming.',
    prompt: 'Tell me the first thing you do, and who gets that conversation.',
    followUps: [
      'Do you speak to them separately or together, and what is the case against the one you chose?',
      'What do you do about the two who have stopped coming?',
      'What if it cannot be resolved and one of them has to go?',
    ],
    raterLooksFor: [
      'Do they act on the people who have left, who are the actual harm and are absent from most answers?',
      'Do they have a reason for separate-versus-together rather than a default?',
      'Do they face the possibility that it will not be fixed?',
      'Do they distinguish between the conflict and its effects?',
    ],
    commonFailure: 'Mediating the two and never once mentioning the two members who stopped attending, even though they are the reason the scenario says this is a problem.',
    competencies: ['teamwork', 'interpersonalSkills', 'criticalThinking', 'understandingOthers'],
  }),
  station({
    id: 'team-outvoted',
    title: 'Outvoted',
    format: 'interviewer',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'Your group has voted for an approach you think will not work. You were the only one against it. The deadline is in two weeks and the work has started.',
    prompt: 'Tell me what you do on Monday.',
    followUps: [
      'How do you distinguish between being right and being outvoted?',
      'At what point, if any, do you raise it again?',
      'What do you do if you turn out to have been wrong?',
    ],
    raterLooksFor: [
      'Do they commit to the group decision while keeping a genuine trigger for revisiting it?',
      'Do they set that trigger in advance rather than reserving the right to say "I told you so"?',
      'Do they hold the possibility that they were wrong?',
    ],
    commonFailure: 'Either sabotage-by-compliance ("I would do my part and let it fail") or capitulation with no thought about what would change their mind. The band is won by naming a concrete condition for revisiting.',
    competencies: ['teamwork', 'selfAwareness', 'criticalThinking', 'resilience'],
  }),
  station({
    id: 'team-actor-credit',
    title: 'The idea that became theirs',
    format: 'actor',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'In a meeting with your teacher, a teammate presented an idea that was originally yours, as theirs. You said nothing at the time. It is now two days later and you have asked to speak to them. Inside the room, they are played by an actor.',
    prompt: 'You wanted to talk? Is this about the presentation?',
    followUps: [
      'You waited two days. What did that cost, and would you wait again?',
      'They do not accept your account. What now?',
      'Do you take it to the teacher, and what would make that the right call?',
    ],
    actor: {
      who: 'A teammate who genuinely half-believes the idea was theirs, or at least joint.',
      wants: 'Not to be called a thief.',
      escalates: 'If accused directly, deny and get defensive: "We came up with that together." If the candidate backs off entirely, accept it cheerfully and move on, leaving the issue unresolved.',
      softens: 'If the candidate describes the specific moment rather than the accusation, concede partially: "I don\'t remember it like that. But — okay, maybe."',
    },
    raterLooksFor: [
      'Do they describe evidence rather than assert theft?',
      'Do they say what they actually want to happen?',
      'Do they cope with a denial, or does the plan end there?',
      'Do they keep a working relationship intact, or win at its expense?',
    ],
    commonFailure: 'Not knowing what outcome they want. A candidate who has not decided whether they want an apology, a correction to the teacher, or just to be heard will drift, and the actor will let them.',
    competencies: ['teamwork', 'interpersonalSkills', 'oralCommunication', 'selfAwareness'],
  }),
  station({
    id: 'team-collab-build',
    title: 'Same task, different instructions',
    format: 'collaborative',
    archetype: 'team-conflict',
    stationType: 'collaborative',
    door: 'You and a partner have to produce one plan for a fundraising event in eight minutes. You have each been given a brief. The briefs are not identical and neither of you has been told that.',
    prompt: 'One plan, eight minutes, out loud at the end.',
    followUps: [
      'When did you work out that your briefs were different?',
      'What did you do once you realized it, and what was the alternative?',
    ],
    task: {
      goal: 'A single stated plan both of you endorse.',
      partnerHas: 'A brief requiring the event to raise a minimum amount. The candidate\'s brief requires it to be free to attend.',
      constraint: 'No swapping briefs.',
      twist: 'The two requirements are not strictly incompatible, but they look it for the first four minutes.',
    },
    raterLooksFor: [
      'Do they compare constraints early, or discover the conflict at minute six?',
      'When the conflict surfaces, do they treat the partner as wrong or as differently briefed?',
      'Do they find the resolution rather than splitting the difference?',
      'Do they land the plan inside the time?',
    ],
    commonFailure: 'Assuming the partner is being difficult. The station is built to look like an interpersonal conflict and to be an information problem, and candidates who never ask "what does your sheet say?" cannot solve it.',
    competencies: ['teamwork', 'criticalThinking', 'oralCommunication', 'interpersonalSkills', 'resilience'],
  }),
  station({
    id: 'team-captain-cut',
    title: 'The one you have to cut',
    format: 'interviewer',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'You are captain and the roster has one place fewer than it has people. Two candidates are close: one is clearly more skilled but is corrosive in the changing room; the other is weaker but is the reason people turn up.',
    prompt: 'Tell me who you cut and what you say to them.',
    followUps: [
      'What is this team actually for, in your view?',
      'Say the words you would use, to the person you cut.',
      'Your coach disagrees with you. Walk me through the rest of that conversation.',
    ],
    raterLooksFor: [
      'Do they name what the team is for before deciding who fits it?',
      'Do they produce actual words when asked?',
      'Do they take responsibility for the decision rather than hiding behind the coach?',
    ],
    commonFailure: 'Refusing to choose. "I would try to find a way to keep both" is disqualifying here, because the whole station is the choice.',
    competencies: ['teamwork', 'criticalThinking', 'oralCommunication', 'ethicalResponsibility'],
  }),
  station({
    id: 'team-adult-overruling',
    title: 'The adult who keeps overruling you',
    format: 'interviewer',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'You lead a student project. A staff supervisor keeps reversing your decisions in front of the team, and you think the reversals are making the project worse. The team have started asking you why you bother.',
    prompt: 'Tell me how you handle the next reversal.',
    followUps: [
      'How do you decide when to push back and when to defer?',
      'What do you say to the team about it, if anything?',
      'What if you are the one who is wrong about the decisions?',
    ],
    raterLooksFor: [
      'Do they distinguish between the decisions and the way they are being reversed in public?',
      'Do they raise it privately with the adult, specifically?',
      'Do they protect the team\'s morale without undermining the supervisor to them?',
      'Do they hold their own fallibility?',
    ],
    commonFailure: 'Framing it entirely as a competence dispute and never addressing the public reversal, which is the part actually damaging the team.',
    competencies: ['teamwork', 'interpersonalSkills', 'resilience', 'selfAwareness'],
  }),
  station({
    id: 'team-exclusion',
    title: 'The celebration nobody thought about',
    format: 'interviewer',
    archetype: 'team-conflict',
    stationType: 'teamwork',
    door: 'Your team wants to celebrate a win at a restaurant that one member cannot attend — for reasons of cost, though nobody has said so out loud and they have claimed to be busy. The plan is already in the group chat and people are excited.',
    prompt: 'Tell me what you do about that plan.',
    followUps: [
      'They have not told anyone the real reason. How do you act on something you are not supposed to know?',
      'Say what you post in the chat.',
      'What if you are wrong about why they cannot come?',
    ],
    raterLooksFor: [
      'Do they change the plan without exposing the person?',
      'Do they produce a message that does not draw attention to the one member?',
      'Do they check their assumption anywhere?',
      'Do they weigh the cost of deflating a celebration honestly?',
    ],
    commonFailure: 'Solving it by offering to pay for them, publicly. It is generous, and it does the exact thing the person was trying to avoid.',
    competencies: ['teamwork', 'empathy', 'understandingOthers', 'interpersonalSkills'],
  }),
  station({
    id: 'team-policy-group-grading',
    title: 'Group grades',
    format: 'policy',
    archetype: 'team-conflict',
    stationType: 'policy',
    door: 'Some schools grade group projects with a single shared mark; others allow peer assessment to adjust individual marks within the group. Shared marks are argued to teach collective responsibility. Peer assessment is argued to be fairer, and to be a popularity contest.',
    prompt: 'Which system would you put in place, and what would you do about its main weakness?',
    followUps: [
      'Who does each system disadvantage?',
      'How would you stop peer assessment becoming a popularity contest?',
      'What is the best argument against the system you chose?',
    ],
    raterLooksFor: [
      'Do they identify who each system harms rather than which is nicer?',
      'Do they engage seriously with the weakness of their own answer?',
      'Do they get specific about mechanism?',
    ],
    commonFailure: 'Answering from personal grievance about a group project they were once in. It is understandable and it is not systems reasoning.',
    competencies: ['criticalThinking', 'teamwork', 'ethicalResponsibility', 'oralCommunication'],
  }),
  station({
    id: 'team-traditional-disagreement',
    title: 'The last real disagreement',
    format: 'traditional',
    archetype: 'team-conflict',
    stationType: 'standard',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. There is no scenario to read here — the two minutes are for choosing WHICH story you are going to tell, which is the decision most candidates make while already talking. Five minutes inside, and the follow-ups are where the station is won.',
    prompt: 'Tell me about the last real disagreement you had with someone you were stuck working alongside.',
    followUps: [
      'What did they think was happening, from their side?',
      'What did you concede?',
      'Is it resolved now, honestly?',
    ],
    raterLooksFor: [
      'Can they state the other person\'s case in the other person\'s terms?',
      'Did they concede anything, and can they name it?',
      'Is the resolution real or tidied up for the answer?',
    ],
    commonFailure: 'A disagreement they won. Every rater is listening for whether the candidate can represent someone who disagreed with them, and a story where the other person simply came round does not demonstrate it.',
    competencies: ['understandingOthers', 'teamwork', 'selfAwareness', 'oralCommunication'],
  }),

  // ═══ REMAINDER: MOTIVATION, SERVICE, SYSTEMS ═══════════════════════════════
  station({
    id: 'other-why-medicine',
    title: 'Why this, and not the next thing',
    format: 'traditional',
    archetype: 'other',
    stationType: 'motivation',
    door: 'A traditional interview question, asked inside an MMI room and on the MMI clock. No scenario to read — use the two minutes to decide which answer you are actually giving. You are applying to a program that commits you to medicine at seventeen, and the interviewer knows that.',
    prompt: 'Name the thing that is nearly as interesting to you as medicine, and tell me why you are not applying for that.',
    followUps: [
      'What have you actually done that would be pointless if you were not going into medicine?',
      'What is the part of this job you expect to dislike?',
      'What would make you change your mind at twenty?',
    ],
    raterLooksFor: [
      'Is there a real alternative, or is medicine presented as the only conceivable option?',
      'Is the reasoning about the work itself rather than about helping people in general?',
      'Do they engage honestly with committing at seventeen?',
    ],
    commonFailure: 'Refusing the premise. A candidate who says nothing else interests them at all has told a rater that they have not examined the decision, which is the specific worry about direct-admit applicants.',
    competencies: ['selfAwareness', 'commitmentToLearning', 'oralCommunication', 'criticalThinking'],
  }),
  station({
    id: 'other-community-station',
    title: 'The person who is not a doctor',
    format: 'interviewer',
    archetype: 'other',
    stationType: 'motivation',
    door: 'This station is run by a community member on the admissions panel — not a clinician, not an academic. They run a community organization.',
    prompt: 'Tell me about someone specific, by name, whose life is different because of something you did.',
    followUps: [
      'What did they actually need, as opposed to what you offered?',
      'What did you get out of it?',
      'Are you still in touch?',
    ],
    raterLooksFor: [
      'Is there one named person, or a category of people?',
      'Do they distinguish what was needed from what was convenient to give?',
      'Do they admit their own benefit without embarrassment?',
    ],
    commonFailure: 'Talking about a program rather than a person. This panellist is specifically listening for whether the candidate cares about anyone in particular or has memorized a story about caring.',
    competencies: ['empathy', 'understandingOthers', 'selfAwareness', 'oralCommunication'],
  }),
  station({
    id: 'other-policy-rural',
    title: 'Where the doctors are not',
    format: 'policy',
    archetype: 'other',
    stationType: 'policy',
    door: 'Rural areas across the US have far fewer physicians per person than cities, and the gap is widening. Proposed responses include loan forgiveness for rural practice, rural admissions preferences, expanding what nurse practitioners and physician assistants may do independently, and telemedicine.',
    prompt: 'Which of those would you fund first, and what would you expect it to fail to fix?',
    followUps: [
      'What do rural patients lose under the option you did not choose?',
      'Who would object to your choice, and what would their strongest point be?',
      'How would you know in five years whether it had worked?',
    ],
    raterLooksFor: [
      'Do they pick one and defend a trade-off, or list all four approvingly?',
      'Do they name what their choice does not solve?',
      'Do they propose any way of measuring it?',
    ],
    commonFailure: 'Endorsing everything. A policy station scores the trade-off, and an answer with no cost in it has not made one.',
    competencies: ['criticalThinking', 'understandingOthers', 'ethicalResponsibility', 'oralCommunication'],
  }),
  station({
    id: 'other-actor-angry-parent',
    title: 'The parent at the front desk',
    format: 'actor',
    archetype: 'other',
    stationType: 'communication',
    door: 'You volunteer at a community vaccination clinic, checking people in on a tablet. A parent has been waiting ninety minutes with two small children, and their appointment slot was double-booked by the system. You did not cause this and you cannot fix it. Inside the room, the parent is played by an actor.',
    prompt: 'Ninety minutes. Ninety. Who do I actually talk to here?',
    followUps: [
      'What could you genuinely offer, and what did you have to refuse?',
      'You had no power to fix this. How did you avoid promising something you could not deliver?',
      'What would you tell the clinic manager afterwards?',
    ],
    actor: {
      who: 'A parent at the end of their patience, not abusive, with two tired small children.',
      wants: 'To be seen today, and to be treated as though the wait was real.',
      escalates: 'If the candidate defends the system or the clinic, escalate. If they promise anything specific ("I\'ll get you seen in ten minutes"), hold them to it later: "You said ten minutes."',
      softens: 'If the candidate acknowledges the wait plainly without excusing it, drop a level: "Thank you. Nobody\'s said that."',
    },
    raterLooksFor: [
      'Do they acknowledge before they explain?',
      'Do they promise something they cannot deliver, which the actor is scripted to punish?',
      'Do they find the one thing they actually can do?',
      'Do they escalate to someone with the power to help?',
    ],
    commonFailure: 'Explaining the double-booking. The explanation is true, it is not what the parent asked for, and delivering it first reliably makes the actor angrier.',
    competencies: ['oralCommunication', 'empathy', 'interpersonalSkills', 'resilience'],
  }),
];

// ── Compatibility view ───────────────────────────────────────────────────────
// The older, flatter shape — `{ id, station, prompt }` — that the single-question practice mode
// and the existing verify script read. Derived rather than duplicated, so a station cannot exist
// in one shape and not the other.

export const MMI_STATIONS = MMI_STATION_LIBRARY.map(s => ({
  id: s.id,
  station: s.stationType,
  prompt: s.prompt,
}));

export function getStationById(id) {
  return MMI_STATION_LIBRARY.find(s => s.id === id) || null;
}

export function getMmiStation(idx) {
  return MMI_STATION_LIBRARY[((idx % MMI_STATION_LIBRARY.length) + MMI_STATION_LIBRARY.length) % MMI_STATION_LIBRARY.length];
}

/** Stations usable by a given interview format ('mmi', 'casper', 'traditional-panel'). */
export function stationsForFormat(format) {
  return MMI_STATION_LIBRARY.filter(s => s.formats.includes(format));
}

/** Every competency any station in the library claims to assess. */
export const LIBRARY_COMPETENCIES = [...new Set(MMI_STATION_LIBRARY.flatMap(s => s.competencies))].sort();
