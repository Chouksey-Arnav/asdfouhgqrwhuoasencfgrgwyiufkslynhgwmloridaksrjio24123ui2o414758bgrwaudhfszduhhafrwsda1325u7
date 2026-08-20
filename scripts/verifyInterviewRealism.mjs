// Assertions on the interview simulator's two hard parts: how the interviewer SOUNDS, and how the
// student is SCORED. There is no test runner configured in this repo, so this script IS the test
// suite for src/lib/voicePipeline.js, src/lib/interviewPanel.js, src/lib/turnTaking.js,
// src/lib/mmiRubric.js and src/lib/interviewScore.js.
//
// The calibration assertions are the important ones. A scorer that drifts generous is the failure
// mode that actively harms a student — it tells them a forgettable answer was a strong one — and it
// drifts silently, one prompt tweak at a time. So the sample corpus below is graded on every build.
//
//   node scripts/verifyInterviewRealism.mjs

import { register } from 'node:module';

// App modules use Vite-style extensionless imports; this is the same hook the other verify scripts
// register so they can be loaded directly by Node.
register('./_appResolve.mjs', import.meta.url);

const {
  normalizeForSpeech, planUtterance, addFilledPauses, questionStemIssue, numberToWords,
} = await import('../src/lib/voicePipeline.js');
const {
  PANEL, FIRST_TIMER_PANEL_ID, DEFAULT_PANEL_ID, STATION_TYPES, backchannelPolicy, ACTOR_PERSONAS,
} = await import('../src/lib/interviewPanel.js');
const {
  TIMING, isSemanticallyComplete, endpointDelayMs, turnGapMs, interviewerMayInterrupt, nextBackchannel,
} = await import('../src/lib/turnTaking.js');
const { scoreStation, scoreBand, parseInterviewScore, tenToSeven, SCALE_MAX } = await import('../src/lib/interviewScore.js');
const { COMPETENCY_KEYS, actionCommitments } = await import('../src/lib/mmiRubric.js');
const { MMI_STATIONS, CASPER_SCENARIOS } = await import('../src/data/mmiCasperQuestions.js');
const {
  MMI_STATION_LIBRARY, STATION_FORMATS, ARCHETYPES, READING_SECONDS, stationsForFormat,
} = await import('../src/data/mmiStations.js');
const { CASPER_SECTIONS, CASPER_TEST_LENGTHS, SECTION_SECONDS } = await import('../src/data/casperTest.js');
const {
  buildCircuit, aggregateCircuit, circuitBand, CIRCUIT_SIZES, describeCircuit,
} = await import('../src/lib/mmiCircuit.js');
const { scoreCasperAttempt, meanToQuartile, QUARTILES } = await import('../src/lib/casperScore.js');
const { interviewPrepFor, INTERVIEW_FORMATS } = await import('../src/lib/admissions/interviewFormats.js');
const { PROGRAM_PROFILES } = await import('../src/data/admissions/programProfiles.js');
const { INTERVIEW_QUESTIONS } = await import('../src/data/interviewQuestions.js');

let passed = 0;
const failures = [];
function assert(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
}
function check(label, actual, expected) {
  assert(label, actual === expected, `expected: ${expected}\n      actual:   ${actual}`);
}

// ── 1. Normalisation: mispronunciation is the real artifact ─────────────────

check('years read as pairs, not cardinals', normalizeForSpeech('in 2024'), 'in twenty twenty-four');
check('two-thousands read naturally', normalizeForSpeech('in 2007'), 'in two thousand seven');
check('MMI is spelled out', normalizeForSpeech('the MMI format'), 'the M M I format');
check('CASPer is a word, not letters', normalizeForSpeech('a CASPer test'), 'a Casper test');
check('honorifics are expanded', normalizeForSpeech('Dr. Reyes'), 'Doctor Reyes');
check('percentages are spoken', normalizeForSpeech('about 8% got in'), 'about eight percent got in');
check('ranges become "to"', normalizeForSpeech('6-10 stations'), 'six to ten stations');
check('ordinals are words', normalizeForSpeech('the 1st thing'), 'the first thing');
assert('unknown acronyms are spelled out rather than guessed', normalizeForSpeech('the WXYZ board').includes('W X Y Z'));
assert('no digits survive normalisation', !/\d/.test(normalizeForSpeech('In 2026, 1,200 of 15,000 applicants, about 8%, were seen 3 times.')));
check('numberToWords handles compounds', numberToWords(1200), 'one thousand two hundred');
assert('markdown residue is never read aloud', !/[*_`#]/.test(normalizeForSpeech('**tell me** about a `time`')));

// ── 2. Prosody: pacing must not be metronomic ───────────────────────────────

const line = 'Thanks for coming in. I want to ask you about a decision you made under pressure, and I want the specifics rather than the summary. What did you actually do?';
const plan = planUtterance(line, { persona: PANEL[1] });
assert('a line is segmented at clause boundaries', plan.segments.length >= 4, `got ${plan.segments.length} segments`);
assert('there are real pauses between segments', plan.segments.slice(0, -1).every(s => s.pauseAfter > 0));
assert('pauses are not all identical (non-metronomic)', new Set(plan.segments.slice(0, -1).map(s => s.pauseAfter)).size > 1);
assert('rate varies segment to segment', new Set(plan.segments.map(s => s.rate.toFixed(4))).size > 1);
assert('the last segment has no trailing pause', plan.segments[plan.segments.length - 1].pauseAfter === 0);
assert('clause pauses sit in a human range (100-800ms)', plan.segments.slice(0, -1).every(s => s.pauseAfter >= 100 && s.pauseAfter <= 800));
assert('planning is deterministic', JSON.stringify(planUtterance(line, { persona: PANEL[1] })) === JSON.stringify(plan));

const breathy = planUtterance('I want you to walk me through the whole thing from the beginning without skipping the part where you had to decide what to say to the person who was actually standing in front of you at the time', { persona: PANEL[1] });
assert('long unpunctuated stretches get breath pauses', breathy.segments.some(s => s.boundary === 'breath'));

const probe = planUtterance('Walk me through exactly what you did.', { persona: PANEL[0], intent: 'probe' });
const ack = planUtterance('That makes sense.', { persona: PANEL[0], intent: 'acknowledge' });
assert('a stressful probe is delivered slower than an acknowledgement', probe.segments[0].rate < ack.segments[0].rate);
assert('a probe sits before it lands, an acknowledgement does not', probe.leadMs > ack.leadMs);

const whQ = planUtterance('What would you do?', { persona: PANEL[1] });
const ynQ = planUtterance('Would you do that?', { persona: PANEL[1] });
assert('wh-questions get a falling terminal, yes/no questions do not', whQ.segments[0].pitch < ynQ.segments[0].pitch);

// ── 3. Filled pauses: actors only, never a panellist ────────────────────────

for (const p of PANEL) {
  check(`${p.id}: filled pauses are disabled`, p.allowFilledPauses, false);
  check(`${p.id}: addFilledPauses is a no-op`, addFilledPauses('I see. What happened next?', { persona: p }), 'I see. What happened next?');
}
assert('role-play actors do get filled pauses', ACTOR_PERSONAS.every(a => a.allowFilledPauses));
assert('an actor line actually gains a filler', /\b(um|uh|well),/i.test(addFilledPauses('I did not know what to say. It happened so fast.', { persona: ACTOR_PERSONAS[0] })));

// ── 4. The panel is a panel, not five of the same person ────────────────────

check('the panel has exactly five members', PANEL.length, 5);
for (const id of ['dean', 'faculty', 'nurse', 'community', 'student']) {
  assert(`the panel includes the ${id}`, PANEL.some(p => p.id === id));
}
check('a first-timer defaults to the medical student', FIRST_TIMER_PANEL_ID, 'student');
check('everyone else defaults to the mid-career faculty member', DEFAULT_PANEL_ID, 'faculty');
assert('the panel spans a real warmth range', Math.max(...PANEL.map(p => p.warmth)) - Math.min(...PANEL.map(p => p.warmth)) >= 0.5);
assert('the panel spans a real formality range', Math.max(...PANEL.map(p => p.formality)) - Math.min(...PANEL.map(p => p.formality)) >= 0.5);
assert('the senior physician is the lowest and slowest voice', PANEL.find(p => p.id === 'dean').pitch === Math.min(...PANEL.map(p => p.pitch)) && PANEL.find(p => p.id === 'dean').rate === Math.min(...PANEL.map(p => p.rate)));
assert('the medical student is the least formal', PANEL.find(p => p.id === 'student').formality === Math.min(...PANEL.map(p => p.formality)));
assert('every panellist carries a tone instruction for the model', PANEL.every(p => typeof p.toneInstruction === 'string' && p.toneInstruction.length > 80));
assert('every panellist has a voice preference list', PANEL.every(p => Array.isArray(p.prefer) && p.prefer.length >= 5));

// ── 5. Backchannelling is station-dependent ─────────────────────────────────

const nurse = PANEL.find(p => p.id === 'nurse');
const dean = PANEL.find(p => p.id === 'dean');
assert('the empathic educator backchannels in an empathy station', backchannelPolicy(nurse, 'empathy').enabled);
assert('the formal panellist never backchannels', !backchannelPolicy(dean, 'ethical').enabled);
assert('even a warm persona goes quiet in a formal station', !backchannelPolicy(nurse, 'ethical').enabled);
assert('no backchannel in the first seconds of a turn', nextBackchannel(backchannelPolicy(nurse, 'empathy'), { speakingMs: 1500 }) === null);
assert('a backchannel is possible once the student is talking', nextBackchannel(backchannelPolicy(nurse, 'empathy'), { speakingMs: 9000 }) !== null);

// ── 6. Turn-taking timing ───────────────────────────────────────────────────

check('turn gap floor', TIMING.TURN_GAP_MIN_MS, 300);
check('turn gap ceiling', TIMING.TURN_GAP_MAX_MS, 500);
check('barge-in budget', TIMING.STUDENT_BARGE_IN_MAX_MS, 150);
check('endpointing on a complete sentence', TIMING.ENDPOINT_COMPLETE_MS, 800);
check('endpointing mid-thought', TIMING.ENDPOINT_INCOMPLETE_MS, 1200);
for (const p of PANEL) {
  assert(`${p.id}: turn gap is inside the 300-500ms band`, p.turnGapMs >= 300 && p.turnGapMs <= 500, `got ${p.turnGapMs}`);
  for (let i = 0; i < 40; i++) {
    const g = turnGapMs(p);
    assert(`${p.id}: jittered turn gap stays in band`, g >= 300 && g <= 500, `got ${g}`);
  }
}
assert('the dean is the slowest to come back, the student the quickest', dean.turnGapMs > PANEL.find(p => p.id === 'student').turnGapMs);

// Barge-in asymmetry: the student always wins, the interviewer essentially never interrupts.
check('the interviewer does not interrupt by default', interviewerMayInterrupt({ studentSpeakingMs: 120000 }), false);
check('a long ramble alone is not grounds to interrupt', interviewerMayInterrupt({ scriptedPressureProbe: false, studentSpeakingMs: 90000 }), false);
check('only a scripted pressure probe may interrupt, and only late', interviewerMayInterrupt({ scriptedPressureProbe: true, studentSpeakingMs: 60000 }), true);
check('even a scripted probe does not interrupt early', interviewerMayInterrupt({ scriptedPressureProbe: true, studentSpeakingMs: 10000 }), false);

// ── 7. Endpointing tolerates a nervous pause ───────────────────────────────

const midThought = [
  'I think the first thing I would do is talk to the',
  'So there are kind of two things here and',
  'I would probably, um',
  'The main issue is that she',
  'I mean',
];
for (const t of midThought) {
  check(`mid-thought is not treated as finished: "${t}"`, isSemanticallyComplete(t), false);
  check(`mid-thought gets the longer wait: "${t}"`, endpointDelayMs(t), 1200);
}
const finished = [
  'I would talk to my supervisor before the end of the shift.',
  'That is what I would do first and I would tell her why',
];
for (const t of finished) {
  check(`a finished thought is recognised: "${t}"`, isSemanticallyComplete(t), true);
  check(`a finished thought gets the short wait: "${t}"`, endpointDelayMs(t), 800);
}
assert('a gentler persona can buy more patience', endpointDelayMs('I would probably, um', { patienceMultiplier: 1.5 }) > 1200);
assert('patience is still bounded', endpointDelayMs('and', { patienceMultiplier: 99 }) <= TIMING.ENDPOINT_HARD_CEILING_MS);

// ── 8. Committed actions, not topic words ──────────────────────────────────
// The case that breaks a topic-level grader: two responses that are semantically similar and
// opposite on empathy.

const towardFriend = "I'd sit down next to her and stay there for as long as she wanted, and I'd ask her what she needs from me tonight rather than assuming.";
const awayFromFriend = "I'd give her some space and head home, and I'd wait until she reaches out to me before I bring it up again.";
assert('moving toward someone registers as an approach commitment', actionCommitments(towardFriend).approach.length > 0);
assert('walking away does not register as an approach commitment', actionCommitments(awayFromFriend).approach.length === 0);
assert('walking away still registers as a commitment (it is one)', actionCommitments(awayFromFriend).avoid.length > 0);
assert('a value statement is not a commitment', actionCommitments('Empathy is really important and I care a lot about how people feel.').count === 0);

const empathyCtx = { stationKey: 'empathy', prompt: 'A friend has just lost a parent and is sitting alone outside. What do you do?' };
const towardScore = scoreStation(`${towardFriend} I know I can't fix it, and I'd say that out loud rather than pretending I can. If she wanted to be alone I'd tell her I'm two minutes away and I'd check in tomorrow.`, empathyCtx);
const awayScore = scoreStation(`${awayFromFriend} Grief is different for everyone and people need room to process, and I think respecting that is the most caring thing you can do for somebody in that situation.`, empathyCtx);
const empathyOf = r => r.competencies.find(c => c.key === 'empathy')?.score;
assert('the two answers are scored differently on empathy despite similar topic',
  empathyOf(towardScore) > empathyOf(awayScore),
  `toward=${empathyOf(towardScore)} away=${empathyOf(awayScore)}`);

// ── 9. Calibration: the distribution has to match real raters ──────────────
// Sample answers written to the band definitions. If a change makes these drift up, the simulator
// has started flattering students and the build fails.

const CASE = {
  stationKey: 'ethical',
  prompt: 'A classmate tells you they cheated on an exam that changed the class ranking, and asks you to keep it quiet. What do you do?',
};

const CORPUS = [
  // -- weak: 1-3 --
  { band: 'weak', text: 'Cheating is obviously wrong. You should never cheat because it is unfair to everyone else who worked hard, and honestly it says a lot about a person if they would do that. Integrity matters more than grades and I think everyone knows that deep down. It is just wrong.' },
  { band: 'weak', text: 'So the situation is that a classmate has told me they cheated on an exam that changed the class ranking, and they are asking me to keep it quiet. That is the scenario. A classmate cheated on an exam and the ranking changed and now they want me to say nothing about the cheating on the exam.' },
  { band: 'weak', text: 'That is academic fraud and it is illegal, the school policy says you get expelled for that, so the rule is clear here. Policy states that cheating is reported. That is what the rule says.' },
  { band: 'weak', text: 'I would definitely report it immediately. There is no question about it. Cheating is unacceptable and the right thing is always to be honest. I would report it and that is the only answer.' },

  // -- average: 4-5 --
  { band: 'average', text: "There's a real tension here between loyalty to my classmate and fairness to everyone whose ranking moved. On the one hand he trusted me with something difficult, and from his point of view he is frightened about what happens next. On the other hand the other students in the class did not consent to being ranked against a result that was not real. I would tell him that I understand why he told me, but that I am not able to keep this quiet, and I would encourage him to go to the teacher himself first. I think that is the defensible position: he gets the chance to disclose it himself, and the people affected are not left with a false result. I would want to be honest with him about what I was going to do rather than saying nothing and going behind his back." },
  { band: 'average', text: "The competing values are honesty and friendship. From my classmate's perspective she is scared, and from the perspective of the rest of the class this affects their ranking, so there are two sides here. That said, I would not be comfortable staying silent. I would tell her that I think she needs to tell the teacher, and that I would rather she did it than me. My position is that the result has to be corrected, but that she should be the one to correct it. I would say all of that to her directly rather than avoiding the conversation, because I think she deserves to know where I stand before anything happens." },

  // -- strong: 6-7 --
  { band: 'strong', text: "The tension is between what I owe my classmate, who trusted me, and what the rest of the class is owed once a ranking is wrong. The strongest case for keeping it quiet is genuinely strong: he came to me rather than anyone else, he is a minor under real pressure, and reporting him could end his year for a single decision. I take that seriously. But the students below him did not agree to be ranked against a false result, and the teacher is the only person who can correct that. So, first: I would talk to him today, not in a week, and I would tell him plainly that I cannot hold this and that I would rather he told Ms. Alvarez himself. I'd offer to sit with him while he does it. If he had not gone to her within a day, I would go to Ms. Alvarez myself and tell him beforehand that I was going to. I don't know whether the school treats a self-report differently from a third-party report, and that matters a lot here, so I would ask the counsellor about that before I pushed him toward one route. What would change my mind is if I found out I had the facts wrong. That is where I would start." },
  { band: 'strong', text: "There are three people here: my classmate, Ms. Reyes who set the exam, and the students whose ranking moved. The best argument for silence is that he trusted me and that a single mistake should not define him, and I can see the case for that. What I keep coming back to is that the other students cannot advocate for themselves because they do not know. First step, the same afternoon: I would tell him I am not going to keep it, and I would give him until tomorrow to go to Ms. Reyes himself. I'd escalate to my advisor if he did not. I'm not sure whether the honour code has a self-disclosure clause — I would look that up before the conversation, because it changes what I am asking him to do. And I would say to him that I am not doing this to punish him. That is my answer." },
];

const scored = CORPUS.map(c => ({ ...c, result: scoreStation(c.text, CASE) }));
for (const c of scored) {
  const s = c.result.score;
  if (c.band === 'weak') assert(`weak answer scores 1-3 (got ${s})`, s <= 3, c.text.slice(0, 60) + '…');
  if (c.band === 'average') assert(`average answer scores 4-5 (got ${s})`, s >= 4 && s <= 5, c.text.slice(0, 60) + '…');
  if (c.band === 'strong') assert(`strong answer scores 6-7 (got ${s})`, s >= 6, c.text.slice(0, 60) + '…');
}

const mean = scored.reduce((n, c) => n + c.result.score, 0) / scored.length;
assert(`corpus mean stays at or below the real modal score of 5 (got ${mean.toFixed(2)})`, mean <= 5);
const avgOnly = scored.filter(c => c.band === 'average').map(c => c.result.score);
assert('a fluent, structured, generic answer lands at 4 or 5 — the normal result', avgOnly.every(s => s === 4 || s === 5), `got ${avgOnly.join(', ')}`);

// A 7 must be genuinely rare: the best answer in the corpus is allowed to be a 6.
assert('nothing reaches 7 without every strong marker', scored.every(c => c.result.score < 7 || c.result.signals.strongCount >= 6));

// ── 10. Scoring mechanics ──────────────────────────────────────────────────

check('an empty answer is a 1', scoreStation('', CASE).score, 1);
check('three words is a 1', scoreStation('I would report it.', CASE).score, 1);
assert('the score is always an integer in 1..7', scored.every(c => Number.isInteger(c.result.score) && c.result.score >= 1 && c.result.score <= SCALE_MAX));
check('the modal score reads as normal, not as failure', scoreBand(5).label, 'Satisfactory — and forgettable');
check('a 4 is named as below the median', scoreBand(4).label, 'Below the pool median');
check('a 7 is named as rare', scoreBand(7).label, 'Outstanding — rare');

check('the model\'s /7 line is parsed', parseInterviewScore('Score: 5/7'), 5);
check('a legacy /10 line is converted, not trusted', parseInterviewScore('Overall: 8 out of 10'), 6);
check('legacy 5/10 maps to a 4, not a 5', tenToSeven(5), 4);

// Competencies: only what the station can assess, never the full ten.
for (const [key, station] of Object.entries(STATION_TYPES)) {
  assert(`${key}: assesses at least three competencies`, station.competencies.length >= 3);
  assert(`${key}: every competency is a real AAMC one`, station.competencies.every(c => COMPETENCY_KEYS.includes(c)));
  assert(`${key}: does not claim to assess all ten from one station`, station.competencies.length < COMPETENCY_KEYS.length);
}
check('there are exactly ten spoken-assessable competencies', COMPETENCY_KEYS.length, 10);
for (const dropped of ['scientificInquiry', 'quantitativeReasoning', 'writtenCommunication']) {
  assert(`${dropped} is not scored by voice`, !COMPETENCY_KEYS.includes(dropped));
}

// The honesty clause has to actually reach the student.
const oneStation = scoreStation(CORPUS[4].text, CASE);
assert('a single station carries the reliability caveat', /six to ten/i.test(oneStation.caveat));
assert('a full circuit is described differently', !/weak measurement/i.test(scoreStation(CORPUS[4].text, { ...CASE, stationCount: 8 }).caveat));
assert('no strength is invented for a weak answer', scoreStation(CORPUS[0].text, CASE).strengths.length === 0);
assert('a weak answer is told specifically what was wrong', scoreStation(CORPUS[0].text, CASE).reasons.length >= 2);

// ── 11. Question stems end on a noun, not a preposition ────────────────────

const stems = [
  ...MMI_STATIONS.map(s => ({ id: s.id, text: s.prompt })),
  // Follow-ups are spoken aloud by the same interviewer, so the same rule applies to them.
  ...MMI_STATION_LIBRARY.flatMap(s => s.followUps.map((f, i) => ({ id: `${s.id}.f${i + 1}`, text: f }))),
  ...CASPER_SCENARIOS.flatMap(s => s.probes.map((p, i) => ({ id: `${s.id}.p${i + 1}`, text: p }))),
  ...Object.entries(INTERVIEW_QUESTIONS).flatMap(([k, qs]) => qs.map((q, i) => ({ id: `${k}[${i}]`, text: q }))),
];
for (const s of stems) {
  const issue = questionStemIssue(s.text);
  assert(`${s.id}: stem ends on a noun`, !issue, `${issue}\n      "${s.text}"`);
}
assert('the lint actually catches a preposition-final stem', !!questionStemIssue('Tell me about a time you really struggled with?'));

// ── 12. The station library ────────────────────────────────────────────────
// The library replaced twenty-four one-line prompts. What makes it a library rather than a longer
// list is that every entry is a station — a door card, a room, a clock, and a rater — so these
// assertions are about the parts that would silently rot back into a question list.

assert('the library is big enough to build circuits from', MMI_STATION_LIBRARY.length >= 40, `got ${MMI_STATION_LIBRARY.length}`);
check('every station id is unique', new Set(MMI_STATION_LIBRARY.map(s => s.id)).size, MMI_STATION_LIBRARY.length);

// All five real formats are populated. A format with no stations is a format students cannot
// practise, and the two they most need — actor and collaborative — are the two most likely to be
// quietly under-built.
for (const format of Object.keys(STATION_FORMATS)) {
  const n = MMI_STATION_LIBRARY.filter(s => s.format === format).length;
  assert(`the "${format}" format has stations`, n >= 3, `got ${n}`);
}
// The four archetypes the brief asked to be built first, each with real depth.
for (const archetype of ['grief', 'inadequacy', 'ethics', 'team-conflict']) {
  const n = MMI_STATION_LIBRARY.filter(s => s.archetype === archetype).length;
  assert(`the "${archetype}" archetype has depth`, n >= 8, `got ${n}`);
}

for (const s of MMI_STATION_LIBRARY) {
  assert(`${s.id}: has a door card a student reads outside`, typeof s.door === 'string' && s.door.length > 80);
  assert(`${s.id}: has an opening line inside the room`, typeof s.prompt === 'string' && s.prompt.length > 20);
  assert(`${s.id}: has follow-ups, because the probes are the station`, Array.isArray(s.followUps) && s.followUps.length >= 2);
  assert(`${s.id}: names what the rater is listening for`, Array.isArray(s.raterLooksFor) && s.raterLooksFor.length >= 3);
  assert(`${s.id}: names how the station is usually failed`, typeof s.commonFailure === 'string' && s.commonFailure.length > 40);
  assert(`${s.id}: is a known format`, !!STATION_FORMATS[s.format]);
  assert(`${s.id}: is a known archetype`, !!ARCHETYPES[s.archetype]);
  assert(`${s.id}: is typed into a real station type`, !!STATION_TYPES[s.stationType], s.stationType);
  assert(`${s.id}: tags the competencies it assesses`, Array.isArray(s.competencies) && s.competencies.length >= 3);
  assert(`${s.id}: every competency is a real AAMC one`, s.competencies.every(c => COMPETENCY_KEYS.includes(c)));
  assert(`${s.id}: does not claim to assess all ten`, s.competencies.length < COMPETENCY_KEYS.length);
  assert(`${s.id}: tags which interview formats it is practice for`, Array.isArray(s.formats) && s.formats.length > 0);
  // Difficulty is a promise: every station is written for a high schooler applying to BS/MD, not
  // for a 24-year-old applying to medical school.
  check(`${s.id}: is written at high-school BS/MD level`, s.level, 'hs-bsmd');
}

// The clock, which is the half of the format students skip when they practise.
check('reading time is the standard two minutes', READING_SECONDS, 120);
for (const s of MMI_STATION_LIBRARY) {
  check(`${s.id}: gets two minutes of reading time`, s.readingSeconds, 120);
  assert(`${s.id}: is five to eight minutes inside`, s.stationSeconds >= 300 && s.stationSeconds <= 480, `got ${s.stationSeconds}s`);
}

// Actor stations need a brief that can actually be played, and the escalation rules are the part
// that makes the station a station rather than a prompt.
for (const s of MMI_STATION_LIBRARY.filter(x => x.format === 'actor')) {
  assert(`${s.id}: the actor has a character`, !!s.actor?.who && s.actor.who.length > 20);
  assert(`${s.id}: the actor wants something`, !!s.actor?.wants);
  assert(`${s.id}: the actor knows what makes it worse`, !!s.actor?.escalates && s.actor.escalates.length > 40);
  assert(`${s.id}: the actor knows what opens them up`, !!s.actor?.softens);
}
// Collaborative stations are only collaborative if the partner holds something the candidate does
// not — otherwise it is an interviewer station with extra steps.
for (const s of MMI_STATION_LIBRARY.filter(x => x.format === 'collaborative')) {
  assert(`${s.id}: the partner holds information the candidate does not`, !!s.task?.partnerHas && s.task.partnerHas.length > 30);
  assert(`${s.id}: the task has a stated goal`, !!s.task?.goal);
  assert(`${s.id}: the task has a constraint`, !!s.task?.constraint);
}

// Every archetype carries the sentence that separates the bands, which is the thing worth
// remembering after the feedback has faded.
for (const [key, a] of Object.entries(ARCHETYPES)) {
  assert(`archetype ${key}: has a hinge`, typeof a.hinge === 'string' && a.hinge.length > 50);
}

// ── 13. The circuit ────────────────────────────────────────────────────────
// A circuit is not a playlist. Three properties make it one, and all three are enforced in code
// rather than left to whoever writes the next station.

for (const size of [8, 9, 10]) {
  const c = buildCircuit({ size, seed: 42 });
  check(`a ${size}-station circuit has ${size} stations`, c.size, size);
  check(`a ${size}-station circuit has no repeats`, new Set(c.stations.map(s => s.id)).size, size);
  // Format spread: the reason it is a circuit.
  assert(`a ${size}-station circuit spans at least four formats`, c.formats.length >= 4, c.formats.join(', '));
  assert(`a ${size}-station circuit includes an actor station`, c.formats.includes('actor'));
  assert(`a ${size}-station circuit includes a collaborative task`, c.formats.includes('collaborative'));
  // Archetype cap: so it cannot become a grief circuit by accident.
  for (const a of c.archetypes) {
    const n = c.stations.filter(s => s.archetype === a).length;
    assert(`a ${size}-station circuit takes at most two "${a}" stations`, n <= 2, `got ${n}`);
  }
  assert(`a ${size}-station circuit reports that it scores an aggregate`, c.scoresAggregate);
  assert(`a ${size}-station circuit adds up its own clock`, c.totalSeconds === c.readingSeconds + c.stationSeconds);
  assert(`a ${size}-station circuit is at least 50 minutes`, c.totalSeconds >= 50 * 60, `got ${Math.round(c.totalSeconds / 60)}min`);
}

// Same seed, same circuit — "run that one again after reading the feedback" is the most useful
// thing a student can do with this feature and it needs the order to be identical.
const c1 = buildCircuit({ size: 9, seed: 7 });
const c2 = buildCircuit({ size: 9, seed: 7 });
check('a seeded circuit is reproducible', c1.stations.map(s => s.id).join(','), c2.stations.map(s => s.id).join(','));
assert('different seeds give different circuits', buildCircuit({ size: 9, seed: 8 }).stations.map(s => s.id).join(',') !== c1.stations.map(s => s.id).join(','));

// Running order: two stations of the same format back to back is a materially harder and less
// representative experience than the same two spaced apart.
for (let seed = 1; seed <= 25; seed++) {
  const c = buildCircuit({ size: 9, seed });
  let adjacent = 0;
  for (let i = 1; i < c.stations.length; i++) {
    if (c.stations[i].format === c.stations[i - 1].format) adjacent++;
  }
  assert(`seed ${seed}: at most one same-format adjacency in a nine-station circuit`, adjacent <= 1, `got ${adjacent}`);
}

// Size is clamped rather than trusted: a caller asking for three stations is asking for a number
// the aggregate would refuse to report anyway.
check('a circuit smaller than eight is clamped up', buildCircuit({ size: 3, seed: 1 }).size, CIRCUIT_SIZES.min);
check('a circuit larger than ten is clamped down', buildCircuit({ size: 40, seed: 1 }).size, CIRCUIT_SIZES.max);
assert('a circuit describes itself in one line', /stations · .* · about \d+ minutes/.test(describeCircuit(c1)), describeCircuit(c1));

// ── 14. The aggregate, and where the line between practice and assessment sits ─
// The whole reason circuit mode exists: one station is a weak measurement, and the product has to
// refuse to pretend otherwise rather than caveating its way out of it.

const fullCircuit = buildCircuit({ size: 9, seed: 3 });
const fakeResult = (score) => ({
  score, scale: 7,
  competencies: [
    { key: 'oralCommunication', label: 'Oral communication', short: 'Communication', score },
    { key: 'criticalThinking', label: 'Critical thinking', short: 'Critical thinking', score },
  ],
  reasons: [],
});

const modal = aggregateCircuit(Array(9).fill(null).map(() => fakeResult(5)), fullCircuit);
check('a completed circuit is reliable', modal.reliable, true);
check('a mean of 5 is the modal result, not a good one', modal.band.label, 'The modal result — competent and forgettable');
assert('and the copy says so out loud', /most real candidates land/i.test(modal.band.blurb));
assert('a completed circuit does not warn about reliability', !/not yet doing that job/i.test(modal.caveat));

const partial = aggregateCircuit([fakeResult(5), fakeResult(6), null, null, null, null, null, null, null], fullCircuit);
check('a half-finished circuit is not reliable', partial.reliable, false);
assert('and says which stations are missing', /2 of 9/.test(partial.caveat));

check('an empty circuit reports nothing rather than zero', aggregateCircuit([null, null], fullCircuit).mean, null);

// Bands are anchored to the same distribution as the per-station scale.
check('a 4.0 mean is under the median', circuitBand(4.0).label, 'Under the median');
check('a 5.0 mean is the modal band', circuitBand(5.0).label, 'The modal result — competent and forgettable');
check('a 6.0 mean is above the pool', circuitBand(6.0).label, 'Above the interviewed pool');
check('a 2.5 mean is below the pool', circuitBand(2.5).label, 'Below the interviewed pool');
assert('the modal band is not toned as a success', circuitBand(5.0).tone === 'mid');

// Competency roll-up refuses to report a competency only one station assessed — the same rule the
// per-station scorer follows, one level up.
const oneOff = aggregateCircuit([
  { score: 5, competencies: [{ key: 'teamwork', label: 'Teamwork', short: 'Teamwork', score: 5 }], reasons: [] },
  { score: 5, competencies: [{ key: 'empathy', label: 'Empathy', short: 'Empathy', score: 5 }], reasons: [] },
], { size: 2 });
check('a competency assessed by one station is not reported', oneOff.competencies.length, 0);

const spread = aggregateCircuit([fakeResult(2), fakeResult(7), ...Array(7).fill(null).map(() => fakeResult(5))], fullCircuit);
check('the spread is reported, because committees argue about it', spread.spread, 5);
check('the lowest station is identified', spread.lowestStation.score, 2);

// ── 15. CASPer: structure, and a quartile rather than a score ──────────────

assert('there are enough sections for a full-length test', CASPER_SECTIONS.length >= 12, `got ${CASPER_SECTIONS.length}`);
check('every section id is unique', new Set(CASPER_SECTIONS.map(s => s.id)).size, CASPER_SECTIONS.length);
check('a section is five minutes', SECTION_SECONDS, 300);
for (const s of CASPER_SECTIONS) {
  assert(`${s.id}: has a scenario`, typeof s.scenario === 'string' && s.scenario.length > 80);
  // The real structure: one scenario, SEVERAL questions, one clock covering all of them.
  assert(`${s.id}: asks more than one question about it`, Array.isArray(s.probes) && s.probes.length >= 3);
  check(`${s.id}: gets one five-minute clock for all its questions`, s.sectionSeconds, 300);
  assert(`${s.id}: is a word or video section`, ['word', 'video'].includes(s.kind));
  assert(`${s.id}: is typed into a real station type`, !!STATION_TYPES[s.stationType]);
  check(`${s.id}: is written at high-school BS/MD level`, s.level, 'hs-bsmd');
}
assert('the test mixes video and word sections like the real one does',
  CASPER_SECTIONS.some(s => s.kind === 'video') && CASPER_SECTIONS.some(s => s.kind === 'word'));

const full = CASPER_TEST_LENGTHS.find(l => l.id === 'full');
const short = CASPER_TEST_LENGTHS.find(l => l.id === 'short');
assert('the full-length test is at least twelve sections', full.sections >= 12);
check('and it is the one that reports a quartile', full.reportsQuartile, true);
check('the short set explicitly does not report a quartile', short.reportsQuartile, false);
assert('a full-length test runs at least an hour', (full.sections * SECTION_SECONDS) >= 3600);

// Quartile cut points follow the same distribution as the station scale: a 5 is the modal result
// and must land mid-table, never near the top.
check('a mean of 5 is not the top quartile', meanToQuartile(5.0), 3);
check('a mean of 4 sits in the second quartile', meanToQuartile(4.0), 2);
check('a mean of 3 sits in the first', meanToQuartile(3.0), 1);
check('only a genuinely strong mean reaches the fourth', meanToQuartile(6.0), 4);
check('there are exactly four quartiles', QUARTILES.length, 4);

const casperSection = (score, answered = 3) => ({
  id: 'x', section: CASPER_SECTIONS[0], probesTotal: 3, probesAnswered: answered,
  result: { score, reasons: [] },
});

const fullAttempt = scoreCasperAttempt(Array(12).fill(null).map(() => casperSection(5)), { reportsQuartile: true });
check('a full-length attempt reports a quartile', fullAttempt.reportsQuartile, true);
check('and a mean of 5 lands in the third', fullAttempt.quartile, 3);
assert('the caveat says the band is not against a real cohort', /not against people who actually sat the test/i.test(fullAttempt.caveat));

const shortAttempt = scoreCasperAttempt(Array(5).fill(null).map(() => casperSection(5)), { reportsQuartile: false });
check('a short set reports no quartile at all', shortAttempt.quartile, null);
assert('and says why rather than printing a caveated band', /not enough to place anyone/i.test(shortAttempt.caveat));

// Running out of time is half of what the real test measures, so it is a finding rather than an
// asterisk on the score.
const rushed = scoreCasperAttempt(Array(12).fill(null).map(() => casperSection(5, 1)), { reportsQuartile: true });
check('unanswered questions are counted', rushed.unanswered, 24);
assert('and surfaced as a triage finding, not a knowledge one', rushed.findings.some(f => /triage|fifteen seconds/i.test(f)));

// ── 16. Programme tracker → station library ────────────────────────────────
// The link the whole thing is for: a student applying somewhere that runs an MMI gets pointed at
// MMI stations specifically.

const drexel = PROGRAM_PROFILES.find(p => p.id === 'drexel-ba-bs-md');
const drexelPrep = interviewPrepFor(drexel);
check('Drexel is known to run an MMI', drexelPrep.status, 'known');
check('and the claim is published rather than inferred', drexelPrep.basis, 'published');
assert('and it carries the programme\'s own words', /MMI/.test(drexelPrep.published));
check('so the student is sent to the circuit', drexelPrep.recommendation.mode, 'circuit');
assert('and the station count is counted rather than asserted', drexelPrep.recommendation.stationCount === stationsForFormat('mmi').length);
assert('Drexel carries sources, which is what lets it claim published', drexel.sources.length > 0);

// The honesty rule: a format nobody published is 'unpublished', and 'unpublished' still gets a
// recommendation — it just says it is a hedge.
for (const p of PROGRAM_PROFILES) {
  const prep = interviewPrepFor(p);
  assert(`${p.id}: carries an interview block`, !!p.interview);
  assert(`${p.id}: interview basis is published or unpublished`, ['published', 'unpublished'].includes(p.interview.basis));
  if (p.interview.basis === 'published') {
    assert(`${p.id}: a published interview format must name a format`, p.interview.formats.length > 0);
    assert(`${p.id}: a published interview format must quote the programme`, !!p.interview.published);
    assert(`${p.id}: a published claim needs a source on the profile`, (p.sources || []).length > 0);
  } else {
    check(`${p.id}: an unpublished format claims no format`, p.interview.formats.length, 0);
    assert(`${p.id}: and says so rather than guessing`, ['unconfirmed', 'unknown'].includes(prep.status));
    assert(`${p.id}: and still recommends something useful`, !!prep.recommendation);
  }
  assert(`${p.id}: explains itself to the student`, typeof p.interview.note === 'string' && p.interview.note.length > 60);
}

// Every format the mapping knows about has somewhere real to send a student.
for (const [key, f] of Object.entries(INTERVIEW_FORMATS)) {
  assert(`the "${key}" format has a destination mode`, ['circuit', 'mmi', 'casper'].includes(f.mode));
  assert(`the "${key}" format has a call to action`, !!f.cta);
  if (f.stationFilter?.format) {
    const n = MMI_STATION_LIBRARY.filter(s => s.format === f.stationFilter.format).length;
    assert(`the "${key}" format's filter matches real stations`, n >= 3, `got ${n}`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n✗ interview realism: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ interview realism: ${passed} assertions passed`);
