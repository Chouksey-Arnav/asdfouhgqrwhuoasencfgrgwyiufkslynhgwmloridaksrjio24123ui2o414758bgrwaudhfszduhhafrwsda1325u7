// The rubric a real MMI rater carries: what they are scoring, and what actually separates the bands.
//
// WHY THIS IS SO SPECIFIC. The previous scorer was a generic "is this answer good" heuristic on a
// 0–10 scale, and it was far too generous — which is the one failure mode that actively harms a
// student, because it tells them a forgettable answer was a strong one. The fix is not "be harsher";
// it is to grade against the thing admissions committees are actually told to use, on the scale
// they actually use, with the distribution they actually produce.
//
// THE SCALE. Seven points per station, anchored at 1 = unsatisfactory, 3 = borderline,
// 5 = satisfactory, 7 = outstanding. The number that matters most is the modal one: in a real MMI
// the most common score is a 5, and a 5 means competent, fluent, and completely forgettable. A 6 is
// genuinely above the interviewed pool — roughly the top fifth. A 7 is rare. A 4 is already below
// the median of the pool, and repeated across eight or ten stations it is very likely a rejection.
// So if this simulator's average output drifts above about 5, we are more generous than real raters,
// which means we are lying to students. Most users should land at 4 or 5, and the product has to
// make that feel normal rather than like failure.
//
// THE FRAMEWORK. The AAMC premed competencies, restricted to the ten that a spoken interview can
// actually assess. The science-knowledge, quantitative-reasoning, written-communication and
// human-behavior-coursework competencies are deliberately absent: a voice interview cannot measure
// them, and pretending otherwise is how a rubric becomes decoration.
//
// THE GRADER'S TRAP. Evaluative signal lives in specific committed actions, not in topic or
// vocabulary. "I'd sit down next to her and stay there" and "I'd give her some space and head home"
// are near-identical on topic, sentiment and vocabulary, and opposite on empathy. Any grader that
// works at the topic level scores them the same. So every detector here keys on committed actions —
// what the candidate says they would DO, to WHOM, and WHEN — and topic words on their own earn
// nothing. See actionCommitments() and the approach/avoid split inside it.

export const SCALE_MAX = 7;

export const SCALE_ANCHORS = [
  { score: 1, label: 'Unsatisfactory', blurb: 'Did not engage the question, or engaged it in a way that would concern a committee.' },
  { score: 2, label: 'Poor', blurb: 'Engaged the question but missed most of what it was asking for.' },
  { score: 3, label: 'Borderline', blurb: 'Recognizable attempt with a real gap in reasoning, specificity, or action.' },
  { score: 4, label: 'Below the pool median', blurb: 'Fluent but incomplete. Repeated across a full MMI circuit this is very likely a rejection.' },
  { score: 5, label: 'Satisfactory — the most common score', blurb: 'Competent, clear, defensible, and completely forgettable. This is where most real candidates land.' },
  { score: 6, label: 'Above the interviewed pool', blurb: 'Roughly the top fifth of people who got as far as an interview.' },
  { score: 7, label: 'Outstanding — rare', blurb: 'A rater would remember this one and say so in the committee meeting.' },
];

export function anchorFor(score) {
  const s = Math.max(1, Math.min(SCALE_MAX, Math.round(score)));
  return SCALE_ANCHORS.find(a => a.score === s) || SCALE_ANCHORS[4];
}

// ── The ten spoken-assessable AAMC competencies ─────────────────────────────

export const COMPETENCIES = {
  empathy:                { label: 'Empathy & compassion',        short: 'Empathy' },
  ethicalResponsibility:  { label: 'Ethical responsibility to self & others', short: 'Ethics' },
  interpersonalSkills:    { label: 'Interpersonal skills',        short: 'Interpersonal' },
  oralCommunication:      { label: 'Oral communication',          short: 'Communication' },
  resilience:             { label: 'Resilience & adaptability',   short: 'Resilience' },
  selfAwareness:          { label: 'Self-awareness',              short: 'Self-awareness' },
  teamwork:               { label: 'Teamwork & collaboration',    short: 'Teamwork' },
  understandingOthers:    { label: 'Understanding others (cultural competence)', short: 'Understanding others' },
  criticalThinking:       { label: 'Critical thinking',           short: 'Critical thinking' },
  commitmentToLearning:   { label: 'Commitment to learning & growth', short: 'Growth' },
};

export const COMPETENCY_KEYS = Object.keys(COMPETENCIES);

// ── Committed actions ────────────────────────────────────────────────────────
// The core detector. A commitment is first-person, forward-looking, and has a verb with an object:
// "I'd ask her what she needs," "I would tell my supervisor before the shift ends." A statement of
// value ("empathy matters," "honesty is important") is not a commitment and earns nothing here, no
// matter how much of the answer it occupies.

// Verbs that move a candidate TOWARD a person or a problem.
const APPROACH_VERBS = [
  'ask', 'tell', 'talk to', 'speak to', 'speak with', 'sit (?:down )?with', 'sit next to', 'stay',
  'listen', 'check in', 'check on', 'call', 'reach out', 'go(?: over)? to', 'move toward', 'move toward',
  'offer', 'apologi[sz]e', 'acknowledge', 'explain', 'clarify', 'ask for', 'invite', 'include',
  'escalate', 'report', 'raise (?:it|this|the issue)', 'flag', 'document', 'notify', 'bring (?:it|this) to',
  'follow up', 'arrange', 'set up', 'schedule', 'volunteer', 'help', 'support', 'stay with',
  'name', 'say', 'admit', 'own', 'take responsibility', 'push back', 'disagree', 'decline', 'refuse',
  'propose', 'suggest', 'recommend', 'find out', 'look up', 'read', 'confirm', 'verify',
];

// Verbs that move a candidate AWAY. Not automatically wrong — sometimes stepping back is right —
// but they are the opposite of an approach on the empathy competency, and a grader that treats them
// as interchangeable with the list above is doing topic matching, not evaluation.
const AVOID_VERBS = [
  'walk away', 'leave', 'step back', 'back off', 'stay out of it', 'say nothing', 'keep quiet',
  'give (?:them|her|him)(?: a bit of| a little| some)? (?:space|room|time)', 'head (?:home|off)',
  'ignore', 'avoid', 'drop it', 'move on', 'not get involved', 'let it go', 'wait (?:and see|until)',
];

const COMMIT_PREFIX = "\\bI(?:'d|'ll| would| will| am going to| plan to| intend to| think I(?:'d| would))\\s+(?:probably\\s+|first\\s+|then\\s+|just\\s+|also\\s+|immediately\\s+|quietly\\s+)?";

function buildCommitRe(verbs) {
  return new RegExp(`${COMMIT_PREFIX}(${verbs.join('|')})\\b([^.!?;]{0,80})`, 'gi');
}
const APPROACH_RE = buildCommitRe(APPROACH_VERBS);
const AVOID_RE = buildCommitRe(AVOID_VERBS);

/**
 * Every action the candidate actually committed to, split by direction. `object` is the fragment
 * after the verb — a commitment with an empty object ("I'd talk to them." vs "I'd talk to the
 * charge nurse before the end of the shift") is weaker and is marked as such.
 */
export function actionCommitments(text) {
  const t = String(text || '');
  const collect = (re, direction) => {
    const out = [];
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const object = (m[2] || '').trim();
      out.push({ verb: m[1].toLowerCase(), object, direction, specific: object.split(/\s+/).filter(Boolean).length >= 2 });
    }
    return out;
  };
  const approach = collect(APPROACH_RE, 'approach');
  const avoid = collect(AVOID_RE, 'avoid');
  return {
    all: [...approach, ...avoid],
    approach,
    avoid,
    count: approach.length + avoid.length,
    specificCount: [...approach, ...avoid].filter(c => c.specific).length,
  };
}

// Vocabulary that sounds like empathy without committing to anything. Present + zero approach
// commitments is the "topic-level hand-waving" case, and it is scored as an absence.
const EMPATHY_TOPIC_WORDS = /\b(empath(y|etic)|compassion(ate)?|feelings?|emotional|support(ive)?|there for (them|her|him)|hard time|going through|understand how (they|she|he) feel)\b/i;

// ── Band markers ─────────────────────────────────────────────────────────────
// Written directly from what separates a weak, an average, and a strong MMI answer. Each detector
// returns a boolean; the scorer in interviewScore.js turns the counts into a band.

// -- Weak (1–3) --------------------------------------------------------------

const DECISIVE_OPENER = /^(?:[^.!?]{0,160}?)\b(I would definitely|I('d| would) obviously|clearly|obviously|the (right|only) (thing|answer|choice)|there'?s no question|absolutely|of course I)\b/i;
const CONCESSION = /\b(on the other hand|that said|although|however|but I could see|a reasonable person|someone could (reasonably )?(say|argue|think)|I might be wrong|if I'm wrong|the counter(-| )?argument|the (strongest|best) (case|argument) (for|against)|fair(est)? point|I can see (why|the case for)|what would change my mind)\b/i;
const MORALIZING = /\b(it('s| is) (just )?(wrong|right|unethical|immoral|unacceptable)|you should always|you should never|no one should ever|everyone knows|obviously the right thing|as a (good )?person you)\b/i;
const RULE_NO_ACTION = /\b(the rule (is|says)|policy (says|states|requires)|the law (says|requires)|you'?re not allowed|against (the )?(rules|policy|law)|confidentiality (means|requires))\b/i;
const LEGAL_CLAIM = /\b(that'?s illegal|it'?s illegal|the law (says|states|requires)|legally (you|they|I)|HIPAA (says|requires|means)|against the law|is a (felony|crime)|you could be sued|liable)\b/i;
const UNCERTAINTY_HANDLED = /\b(I don'?t know|I'?m not (sure|certain)|I'?d need to (check|find out|look up|ask)|I would (check|confirm|verify|look up|find out|ask someone)|I'?d want to know|depends on|I'?d have to (check|ask))\b/i;

// -- Average (4–5) -----------------------------------------------------------

const TENSION_NAMED = /\b(tension|conflict|competing|trade[- ]?off|pulls? in (two|different)|on one side|balance between|at odds|torn between|two (things|values|duties|obligations))\b/i;
const TWO_PERSPECTIVES = /\b(on the one hand|from (his|her|their|the \w+'s) (point of view|perspective|side)|for (him|her|them)|the other side|both sides|from where (they|she|he) sits?|if I were (in )?(their|her|his))\b/i;
const POSITION_TAKEN = /\b(I would|I'?d|my (position|view|answer) (is|would be)|in the end I|ultimately I|what I would do is|I'?d land on|I'?d choose)\b/i;

// -- Strong (6–7) ------------------------------------------------------------

// Named roles rather than abstractions. "Everyone," "people," "society" deliberately do not count.
const STAKEHOLDER_ROLE = /\b(the patient|(?:her|his|their) (?:mother|father|son|daughter|family|parents)|the family|the (?:attending|physician|doctor|nurse|charge nurse|resident|supervisor|manager|teacher|coach|principal|counsel?lor|advisor|adviser|mentor|professor|dean)|my (?:teammate|classmate|colleague|coworker|partner|friend|sister|brother|mother|father|supervisor|teacher|coach|advisor|adviser|mentor|counsel?lor|manager|professor)|the (?:teammate|classmate|colleague|volunteer|student|customer|client|neighbour|neighbor|roommate)|the (?:other|rest of the) (?:students|team|group|class|staff|volunteers)|(?:Dr|Mr|Mrs|Ms|Miss|Professor|Nurse)\.?\s+[A-Z][a-z]+)/g;
const STEELMAN = /\b(the strongest (case|argument|version)|the best argument (for|against)|steel ?man|to be fair to (them|her|him)|the case for (their|her|his)|what (they|she|he) (would|might) say is|their strongest point|I can see the case for)\b/i;
const ESCALATION_TARGET = /\b(escalate to|bring (it|this) to|tell|go to|raise it with|report it to|loop in|involve|speak to|talk to)\s+(?:the\s+|my\s+|our\s+)?(?:(attending|supervisor|manager|charge nurse|nurse|physician|doctor|teacher|coach|principal|advisor|adviser|mentor|counsel?lor|safeguarding|HR|department|professor|dean|team lead)|(?:Dr|Mr|Mrs|Ms|Miss|Professor|Nurse)\.?\s+[A-Z][a-z]+)/i;
const FIRST_STEP = /\b(first(?:[,:.]|\s+(?:thing|step|off|I'?d|I would))|the first thing I|to start (?:with|,)|before anything else|my opening|step one|right away I|in the moment I|the same (?:day|afternoon|evening)|that (?:same )?(?:day|afternoon))\b/i;
const UNCERTAINTY_PRECISE = /\b(I don'?t know (whether|if|what|how)|I'?m not sure (whether|if|what|how)|what I'?d need to know is|I'?d want to find out (whether|if|what|how)|the thing I can'?t tell from here)\b/i;
const RESOLUTION_PLAN = /\b(I'?d (check|ask|look up|confirm|verify|find out|read)|I would (check|ask|look up|confirm|verify|find out|read)|I'?d go to (the|my)|by (asking|checking|reading|looking))\b/i;
const DELIBERATE_ENDING = /(?:so|and|which is why|that'?s why|ultimately|in the end|to sum up|so to be clear)[^.!?]{0,120}[.!]$|\b(that(?:'s| is) (?:what I(?:'d| would) do|where I(?:'d| would) start|my (?:answer|position))|and that'?s the (?:first )?step)\b\s*[.!]?$/i;
const TRAILING_OFF = /\b(or something|or whatever|i guess|yeah|anyway|that'?s (about )?it|I don'?t know)\s*\.?\s*$/i;

// Padding: the same content phrase reused late in the answer, which is what running out of things
// to say sounds like.
function repetitionRatio(text) {
  const words = String(text).toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  if (words.length < 40) return 0;
  const seen = new Map();
  for (const w of words) seen.set(w, (seen.get(w) || 0) + 1);
  const repeated = [...seen.values()].filter(n => n >= 4).reduce((n, c) => n + c, 0);
  return repeated / words.length;
}

// How much of the answer is the prompt read back. Restating at length is a stall, and raters hear
// it as one.
function promptEchoRatio(answer, prompt) {
  if (!prompt) return 0;
  const norm = s => String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const promptWords = new Set(norm(prompt));
  if (!promptWords.size) return 0;
  const opening = norm(answer).slice(0, 45);
  if (!opening.length) return 0;
  return opening.filter(w => promptWords.has(w)).length / opening.length;
}

// Whether the answer engaged the question at all, as opposed to a nearby one. Very low overlap
// across the WHOLE answer (not just the opening) is the signature of answering the question they
// wished they'd been asked.
function promptEngagement(answer, prompt) {
  if (!prompt) return 1;
  const norm = s => String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
  const promptWords = [...new Set(norm(prompt))];
  if (promptWords.length < 3) return 1;
  const answerWords = new Set(norm(answer));
  return promptWords.filter(w => answerWords.has(w)).length / promptWords.length;
}

/**
 * Run every detector over one station response.
 *
 * @param {string} answer  what the student said
 * @param {object} ctx
 *   prompt        – the station prompt, for echo/engagement checks
 *   stationKey    – key into STATION_TYPES (interviewPanel.js); decides which competencies are
 *                   in scope. A competency the station never probed is not scored, ever.
 *   probed        – true if the interviewer asked a follow-up (live mode only)
 *   adjustedAfterProbe – true if the answer changed after that follow-up
 *   actorDisclosure    – true if a role-play actor disclosed something in this station
 *   talkedOverActor    – true if the student spoke over that disclosure
 */
export function evaluateStation(answer, ctx = {}) {
  const text = String(answer || '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const commitments = actionCommitments(text);
  const stakeholders = new Set((text.match(STAKEHOLDER_ROLE) || []).map(s => s.toLowerCase()));
  const echo = promptEchoRatio(text, ctx.prompt);
  const engagement = promptEngagement(text, ctx.prompt);
  const firstSentence = (text.match(/^[^.!?]+[.!?]?/) || [''])[0];

  const weak = {
    sidePickedAndNeverRevisited: DECISIVE_OPENER.test(firstSentence) && !CONCESSION.test(text),
    restatesPrompt: echo > 0.5 && words > 30,
    answersNearbyQuestion: !!ctx.prompt && engagement < 0.12 && words > 25,
    moralizes: MORALIZING.test(text) && commitments.count === 0,
    ruleWithoutAction: RULE_NO_ACTION.test(text) && commitments.count === 0,
    fakedLegalConfidence: LEGAL_CLAIM.test(text) && !UNCERTAINTY_HANDLED.test(text),
    talkedOverDisclosure: !!ctx.talkedOverActor,
    padding: repetitionRatio(text) > 0.22,
    noDisagreementAcknowledged: !CONCESSION.test(text) && !STEELMAN.test(text) && words > 60,
    noAction: commitments.count === 0,
    empathyVocabularyOnly: EMPATHY_TOPIC_WORDS.test(text) && commitments.approach.length === 0,
  };

  const average = {
    identifiesTension: TENSION_NAMED.test(text) || STEELMAN.test(text) || (CONCESSION.test(text) && words > 60),
    namesTwoPerspectives: TWO_PERSPECTIVES.test(text) || stakeholders.size >= 2,
    reachesPosition: POSITION_TAKEN.test(text) && commitments.count > 0,
    communicatesClearly: words >= 60 && !weak.padding && repetitionRatio(text) < 0.2,
  };

  const strong = {
    specificStakeholders: stakeholders.size >= 3,
    steelmansOpposition: STEELMAN.test(text),
    decisionPlusFirstStep: commitments.specificCount > 0 && FIRST_STEP.test(text),
    escalationNamed: ESCALATION_TARGET.test(text),
    uncertaintyFlaggedPrecisely: UNCERTAINTY_PRECISE.test(text) && RESOLUTION_PLAN.test(text),
    // Only assessable when a follow-up actually happened. `null` means "not measured here" and is
    // excluded from both the numerator and the denominator rather than counted as a failure.
    adjustsWhenProbed: ctx.probed ? !!ctx.adjustedAfterProbe : null,
    respondsToActor: ctx.actorDisclosure ? (!ctx.talkedOverActor && commitments.approach.length > 0) : null,
    endsDeliberately: DELIBERATE_ENDING.test(text) && !TRAILING_OFF.test(text),
  };

  return {
    words,
    commitments,
    stakeholderCount: stakeholders.size,
    promptEcho: echo,
    promptEngagement: engagement,
    weak,
    average,
    strong,
    weakCount: Object.values(weak).filter(Boolean).length,
    averageCount: Object.values(average).filter(Boolean).length,
    strongCount: Object.values(strong).filter(v => v === true).length,
    strongAssessable: Object.values(strong).filter(v => v !== null).length,
  };
}

// Plain-English text for each detector, phrased as what the student should do differently. These
// are the lines the student actually reads, so they carry the fix, not just the verdict.
export const WEAK_REASONS = {
  sidePickedAndNeverRevisited: 'You picked a side in your first sentence and never came back to it. A rater is listening for whether you considered the other position at all — committing early and never revisiting reads as not having thought about it.',
  restatesPrompt: 'A large part of your opening was the prompt read back. Raters hear that as a stall; start with the tension in the case instead.',
  answersNearbyQuestion: 'This answers a question near the one you were asked, not the one you were asked. Name the specific thing the station put in front of you before you start reasoning.',
  moralizes: 'This is moralizing rather than analyzing — it states what is right without ever getting to what you would do. Raters score the action, not the sentiment.',
  ruleWithoutAction: 'You stated a rule but never said what you would actually do under it. "That would breach confidentiality" is the start of an answer, not the answer.',
  fakedLegalConfidence: 'You made a confident claim about law or policy without hedging it. "I don\'t know the exact rule — here is how I\'d find out" scores higher than a wrong certainty, every time.',
  talkedOverDisclosure: 'You spoke over the actor while they were disclosing something. In an empathy station that single moment can decide the score.',
  padding: 'The back half repeats the front half. Running out of content and padding is more obvious out loud than it is on paper — a shorter, finished answer scores better.',
  noDisagreementAcknowledged: 'Nowhere did you acknowledge that a reasonable person could disagree with you. In an ethics station that omission alone holds an answer at average.',
  noAction: 'There is no committed action anywhere in this answer — nothing you said you would actually do, to a specific person, in a specific order. This is the single biggest gap.',
  empathyVocabularyOnly: 'You used the vocabulary of empathy without committing to a single action. "Being there for someone" and actually moving toward them are scored very differently.',
};

export const AVERAGE_GAPS = {
  identifiesTension: 'You never named the tension the station was built around. Say out loud what is pulling against what.',
  namesTwoPerspectives: 'Only one perspective appears here. Name at least two, and name whose they are.',
  reachesPosition: 'You explored the case without landing anywhere. Reach a defensible position and say it plainly.',
  communicatesClearly: 'The structure wandered. A rater should be able to repeat your position back after hearing it once.',
};

export const STRONG_GAPS = {
  specificStakeholders: 'Your stakeholders are abstract. "The family," "the attending," "the other volunteer" — name them as roles in this case, not as "everyone involved."',
  steelmansOpposition: 'You never stated the strongest version of the view you rejected. Doing that before you reject it is most of the distance between a 5 and a 6.',
  decisionPlusFirstStep: 'You gave a decision but not the first concrete step. What is the very first thing you do, and when?',
  escalationNamed: 'You never named who you would escalate to. "I\'d tell someone" is average; "I\'d tell the charge nurse before the end of the shift" is not.',
  uncertaintyFlaggedPrecisely: 'Flag what you do not know precisely, and say how you would resolve it. Vague hedging is not the same as located uncertainty.',
  adjustsWhenProbed: 'When you were probed you defended rather than adjusted. Raters read genuine adjustment as strength, not weakness.',
  respondsToActor: 'You did not respond to what the actor actually said. A prepared answer delivered over a person is the classic empathy-station failure.',
  endsDeliberately: 'The answer trailed off rather than ending. Land it: one sentence that says what you would do and stops.',
};

// The honesty clause. A single MMI station is a weak measurement — real circuits use six to ten
// stations precisely because one is not reliable enough to decide anything. Saying so is both true
// and useful: it teaches the student how the format works, and it stops one bad station from
// reading as a verdict on them.
export const SINGLE_STATION_CAVEAT =
  'One station is a weak measurement. Real MMIs run six to ten stations with a different rater at each one, because a single station is not reliable enough to say much about a candidate — raters disagree, stations vary, and nerves hit one station and not the next. Treat this score as evidence about this answer, not about you. Run several stations before you read anything into the average.';

export function reliabilityNote(stationCount) {
  if (!stationCount || stationCount < 2) return SINGLE_STATION_CAVEAT;
  if (stationCount < 6) return `${stationCount} stations is still short of a real circuit. MMIs use six to ten before the average means anything — keep going.`;
  return `${stationCount} stations is a circuit's worth. The average across them is far more meaningful than any single station's score.`;
}
