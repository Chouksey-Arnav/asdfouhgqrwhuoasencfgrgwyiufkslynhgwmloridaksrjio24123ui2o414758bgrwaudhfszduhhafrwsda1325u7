// Scoring an interview station the way a real MMI rater would score it.
//
// The rubric — the seven-point scale, the AAMC competencies, and the detectors that separate the
// bands — lives in mmiRubric.js. This file is the scorer: it turns those detections into a number,
// decides what the student is told, and refuses to let the model's own generosity through.
//
// THE CENTRAL PROBLEM. Prompt instructions do not hold a score down. However bluntly the rubric is
// written, a chat model asked to grade a nervous teenager drifts back toward the top of whatever
// scale you give it. A simulator that hands out 6s and 7s teaches a student that a forgettable
// answer is an excellent one, and then the real interview is the first time anyone tells them
// otherwise. So the model's number is a proposal only. The number the student sees is the lower of
// (a) what the model said and (b) what the deterministic rubric found in the words themselves.
//
// THE TARGET DISTRIBUTION. Most students should land on 4 or 5, and the product has to make that
// feel like the normal result it is rather than like a failure — a 5 is the modal score in a real
// MMI and it means competent, fluent and forgettable. Reaching 6 requires the specific things that
// actually separate the top fifth: named stakeholders, the opposing case stated at its strongest,
// a decision AND a first concrete step AND who you'd escalate to, located uncertainty with a plan
// to resolve it, adjustment under probing, and a deliberate ending. 7 requires nearly all of them
// with nothing weak. If the average output of this scorer creeps above 5, it is broken —
// scripts/verifyInterviewRealism.mjs asserts exactly that against a corpus of sample answers.

import {
  SCALE_MAX, SCALE_ANCHORS, anchorFor, COMPETENCIES, COMPETENCY_KEYS,
  evaluateStation, WEAK_REASONS, AVERAGE_GAPS, STRONG_GAPS,
  SINGLE_STATION_CAVEAT, reliabilityNote,
} from './mmiRubric';
import { getStationType, DEFAULT_STATION_TYPE } from './interviewPanel';

export { SCALE_MAX, SCALE_ANCHORS, anchorFor, SINGLE_STATION_CAVEAT, reliabilityNote };

// ── The ceiling this simulator will never award ─────────────────────────────
// A practice tool cannot see posture, eye contact, what the room felt like, or whether the answer
// that read well on paper landed when spoken — and it is scoring one sitting, from a transcript,
// against a rubric. "Nothing here could be better" is therefore a claim it is not equipped to make,
// and it is the single most damaging thing it could say: a student told they are already at the top
// of the scale has been handed a reason to stop practising. So the top of every scale is reserved.
// The best a session can be told is "above the interviewed pool, and here is what is still missing."
export const PRACTICE_CEILING = SCALE_MAX - 1;

export const CEILING_NOTE =
  'This simulator never awards the top of the scale. A transcript cannot see how you carried yourself, and one sitting is not enough to call anything finished — there is always a next layer, and the notes below are it.';

// ── Parsing the model's proposal ────────────────────────────────────────────
// Both feedback shapes end with a predictable scored line by prompt design. Legacy sessions (and
// any model that ignores the instruction and reaches for the familiar ten-point scale) are
// converted rather than rejected — a stored history of /10 scores still has to render.

export function tenToSeven(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return null;
  // 10-point anchors map onto 7-point anchors at the bands, not linearly: the old scale's "5-6 =
  // competent and forgettable" is this scale's 5, and the old 9 is this scale's 7.
  const x = Math.max(0, Math.min(10, Number(n)));
  if (x <= 2) return 1;
  if (x <= 3.5) return 2;
  if (x <= 4.5) return 3;
  if (x <= 5.5) return 4;
  if (x <= 7) return 5;
  if (x <= 8.5) return 6;
  return 7;
}

export function parseInterviewScore(text) {
  if (!text) return null;
  const m = String(text).match(/(?:score|overall)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(7|10)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (m[2] === '10') return tenToSeven(n);
  return Math.max(1, Math.min(SCALE_MAX, n));
}

// A stored session may predate the seven-point scale. `scale` is written on everything new; its
// absence means the old ten-point number.
export function normalizeStoredScore(entry) {
  if (!entry || typeof entry.score !== 'number') return null;
  return entry.scale === 7 ? entry.score : tenToSeven(entry.score);
}

// ── The deterministic score ─────────────────────────────────────────────────

// Weak markers that cap a station at 3 on their own. These are the ones a rater would write a
// comment about — not stylistic slips but failures to do the thing the station asked for.
const CRITICAL_WEAK = [
  'noAction', 'moralizes', 'ruleWithoutAction', 'answersNearbyQuestion',
  'talkedOverDisclosure', 'fakedLegalConfidence', 'empathyVocabularyOnly',
];

/**
 * Score one station from its words alone.
 *
 * Returns { score, anchor, evidence, gaps, reasons } where `reasons` is the list the student reads.
 * Never returns above 5 without strong markers, and never above 3 with a critical weakness.
 */
export function scoreStation(answer, ctx = {}) {
  const stationKey = ctx.stationKey || DEFAULT_STATION_TYPE;
  const station = getStationType(stationKey);
  const ev = evaluateStation(answer, { ...ctx, stationKey });

  // Too short to be a station response at all. A real rater does not grade thirty seconds of
  // silence generously because the candidate seemed nice.
  if (ev.words < 15) {
    return finish(1, ev, station, ['This is not yet an answer — a station response runs a minute and a half to two minutes spoken. A rater would be sitting in silence waiting for you to continue.'], ctx);
  }

  // The average band, built literally from its definition: identifies the tension, names two
  // perspectives, reaches a defensible position, communicates clearly. All four plus a committed
  // action is a 5 — which is not praise, it is the modal score, and it means competent, fluent and
  // forgettable. Three of the four with something concrete in it is also a 5; three without is a 4.
  // The demotion work below this is done by the weak markers, because the weak band is defined by
  // those specific failures rather than by the absence of average ones.
  let score;
  if (ev.averageCount >= 4) score = ev.commitments.count > 0 ? 5 : 4;
  else if (ev.averageCount === 3) score = ev.commitments.specificCount > 0 ? 5 : 4;
  else if (ev.averageCount === 2) score = 4;
  else if (ev.averageCount === 1) score = 3;
  else score = 2;

  // Above the pool: only from a complete 5, and only on the strong markers.
  if (score === 5) {
    if (ev.strongCount >= 6 && ev.weakCount === 0) score = 7;
    else if (ev.strongCount >= 4 && ev.weakCount <= 1) score = 6;
  }

  const criticalHits = CRITICAL_WEAK.filter(k => ev.weak[k]);
  // empathyVocabularyOnly is only critical where empathy is actually in scope — elsewhere it is
  // just a style note, and capping a policy station for it would be scoring the wrong thing.
  const criticalApplicable = criticalHits.filter(k => k !== 'empathyVocabularyOnly' || station.competencies.includes('empathy'));
  if (criticalApplicable.length) score = Math.min(score, 3);

  // Everything else weak shaves half a point each — enough to move a borderline answer down a band,
  // not enough to bury an answer the caps have already judged.
  const nonCritical = Object.keys(ev.weak).filter(k => ev.weak[k] && !criticalApplicable.includes(k));
  score = Math.max(1, score - nonCritical.length * 0.5);
  score = Math.max(1, Math.min(SCALE_MAX, Math.round(score)));

  // The reasons the student reads: every weakness that fired, then the average-band gaps, then —
  // only once they are already at a 5 — what is standing between them and a 6.
  const reasons = [
    ...criticalApplicable.map(k => WEAK_REASONS[k]),
    ...nonCritical.map(k => WEAK_REASONS[k]),
    ...Object.keys(ev.average).filter(k => !ev.average[k]).map(k => AVERAGE_GAPS[k]),
  ].filter(Boolean);

  // Every strong marker that did not fire is something to work on, and at the top of the range it
  // is the ONLY thing left to work on — so the higher the score, the more of them are surfaced
  // rather than fewer. A student at the ceiling should leave with more to do than a student at a 4,
  // because the student at a 4 already knows what went wrong.
  const missingStrong = Object.keys(ev.strong)
    .filter(k => ev.strong[k] === false)
    .map(k => STRONG_GAPS[k])
    .filter(Boolean);
  if (score >= 5) reasons.push(...missingStrong.slice(0, 4));

  return finish(score, ev, station, reasons, ctx, missingStrong);
}

function finish(score, ev, station, reasons, ctx, missingStrong = []) {
  // The reserved top of the scale — see PRACTICE_CEILING. Applied here so it holds for every path
  // into this function, including the "too short to be an answer" early return.
  const capped = Math.min(score, PRACTICE_CEILING);
  // Nobody leaves with an empty list. If every detector fired and the rubric found nothing to say,
  // the honest note is not "flawless" — it is that the rubric has run out of things it can measure,
  // which is a limit of the tool rather than a verdict on the student.
  const withFloor = reasons.length ? reasons : (
    missingStrong.length ? missingStrong.slice(0, 3) : [
      'This session cleared everything the rubric can detect in a transcript, which is not the same as being finished. The next layer is delivery — pace, where you place a pause, and whether you sound like you believe the answer. Record yourself and watch it back; that is the only place the remaining work is visible.',
    ]
  );
  return {
    score: capped,
    rawScore: score,
    ceilingApplied: capped < score,
    ceiling: PRACTICE_CEILING,
    ceilingNote: CEILING_NOTE,
    reasons: withFloor,
    scale: SCALE_MAX,
    anchor: anchorFor(capped),
    band: scoreBand(capped),
    strengths: describeStrengths(ev, capped),
    competencies: scoreCompetencies(capped, ev, station),
    signals: ev,
    caveat: reliabilityNote(ctx.stationCount),
  };
}

// What genuinely worked — and nothing else. An invented strength is the single most damaging thing
// a practice tool can hand a student, so this reports only detectors that actually fired and says
// so plainly when none did.
function describeStrengths(ev, score) {
  // Below a 3 there is nothing worth listing under "what worked." Something in a two-out-of-seven
  // answer will always technically have fired a detector, and leading with it would bury the point.
  if (score <= 2) return [];
  const out = [];
  if (ev.commitments.specificCount > 0) out.push(`You committed to ${ev.commitments.specificCount} specific action${ev.commitments.specificCount > 1 ? 's' : ''} rather than describing a value — that is the part raters actually score.`);
  if (ev.strong.specificStakeholders) out.push(`You named ${ev.stakeholderCount} distinct people or roles instead of talking about "everyone involved."`);
  if (ev.strong.steelmansOpposition) out.push('You stated the opposing case at its strongest before rejecting it. That is a genuine top-band move.');
  if (ev.strong.escalationNamed) out.push('You named who you would escalate to, specifically.');
  if (ev.strong.uncertaintyFlaggedPrecisely) out.push('You located what you did not know and said how you would resolve it, instead of bluffing.');
  if (ev.strong.adjustsWhenProbed === true) out.push('You adjusted under probing rather than defending your first answer.');
  if (ev.strong.respondsToActor === true) out.push('You responded to what the actor actually said rather than delivering a prepared answer over them.');
  if (ev.strong.endsDeliberately) out.push('You ended deliberately instead of trailing off.');
  return out;
}

// ── Per-competency read-out ─────────────────────────────────────────────────
// Only the competencies the station can actually assess. A station that never asked about teamwork
// does not get a teamwork score; leaving it blank is more honest than inventing one, and it teaches
// the student that MMI stations each probe a couple of things rather than all of them.

const COMPETENCY_EVIDENCE = {
  empathy: ev => ({
    up: ev.commitments.approach.length > 0 && !ev.weak.talkedOverDisclosure,
    down: ev.weak.empathyVocabularyOnly || ev.commitments.approach.length === 0 || ev.weak.talkedOverDisclosure,
    note: ev.commitments.approach.length === 0
      ? 'No action that moves you toward the person. Empathy is scored on what you do, not on how you describe caring.'
      : 'Credited on the actions that moved you toward the person, not on the empathy vocabulary.',
  }),
  ethicalResponsibility: ev => ({
    up: ev.strong.steelmansOpposition && ev.average.reachesPosition,
    down: ev.weak.moralizes || ev.weak.ruleWithoutAction || ev.weak.noDisagreementAcknowledged,
    note: ev.weak.moralizes ? 'Stating what is right is not the same as reasoning about it.' : 'Weighed against whether you reached a defensible position and engaged the other side.',
  }),
  interpersonalSkills: ev => ({
    up: ev.stakeholderCount >= 2 && ev.commitments.approach.length > 0,
    down: ev.weak.talkedOverDisclosure || ev.commitments.count === 0,
    note: 'Read from how you said you would handle the actual people in the case.',
  }),
  oralCommunication: ev => ({
    up: ev.average.communicatesClearly && ev.strong.endsDeliberately,
    down: ev.weak.padding || ev.weak.restatesPrompt || ev.words < 60,
    note: ev.weak.padding ? 'The answer repeated itself rather than progressing.' : 'Structure, length, and whether the answer landed.',
  }),
  resilience: ev => ({
    up: ev.strong.adjustsWhenProbed === true,
    down: ev.strong.adjustsWhenProbed === false,
    note: ev.strong.adjustsWhenProbed === null ? 'Not probed here — run a station with follow-ups to get a read on this.' : 'Read from what happened when you were pushed.',
  }),
  selfAwareness: ev => ({
    up: ev.strong.uncertaintyFlaggedPrecisely,
    down: ev.weak.fakedLegalConfidence || ev.weak.sidePickedAndNeverRevisited,
    note: 'Read from how you handled the limits of what you knew.',
  }),
  teamwork: ev => ({
    up: ev.stakeholderCount >= 2 && ev.strong.escalationNamed,
    down: ev.commitments.count === 0,
    note: 'Read from who you involved and how.',
  }),
  understandingOthers: ev => ({
    up: ev.average.namesTwoPerspectives && ev.strong.steelmansOpposition,
    down: ev.weak.noDisagreementAcknowledged || !ev.average.namesTwoPerspectives,
    note: 'Read from whether the other side appeared in its own terms.',
  }),
  criticalThinking: ev => ({
    up: ev.average.identifiesTension && ev.strong.decisionPlusFirstStep,
    down: ev.weak.moralizes || !ev.average.identifiesTension,
    note: 'Read from whether you found the tension and did something with it.',
  }),
  commitmentToLearning: ev => ({
    up: ev.strong.uncertaintyFlaggedPrecisely || ev.strong.adjustsWhenProbed === true,
    down: ev.weak.fakedLegalConfidence,
    note: 'Read from how you treated the things you did not know.',
  }),
};

function scoreCompetencies(stationScore, ev, station) {
  const inScope = (station?.competencies || []).filter(k => COMPETENCY_KEYS.includes(k));
  return inScope.map(key => {
    const read = COMPETENCY_EVIDENCE[key]?.(ev) || { up: false, down: false, note: '' };
    let s = stationScore;
    if (read.up) s += 1;
    if (read.down) s -= 1;
    // Same reserved top as the overall score — a competency line reading 7/7 would tell a student
    // that one dimension of their interview is finished, which is the claim this tool cannot make.
    s = Math.max(1, Math.min(PRACTICE_CEILING, s));
    return { key, label: COMPETENCIES[key].label, short: COMPETENCIES[key].short, score: s, note: read.note };
  });
}

// ── Bands ────────────────────────────────────────────────────────────────────
// The label matters as much as the number. A 5 has to read as "this is the normal result and it is
// not a good one," which is a genuinely hard sentence to write and the whole point of the exercise.

export function scoreBand(score) {
  if (score === null || score === undefined) return { label: 'Not scored', tone: 'neutral' };
  const s = Math.round(score);
  if (s <= 2) return { label: 'Unsatisfactory', tone: 'bad' };
  if (s === 3) return { label: 'Borderline', tone: 'bad' };
  if (s === 4) return { label: 'Below the pool median', tone: 'mid' };
  if (s === 5) return { label: 'Satisfactory — and forgettable', tone: 'mid' };
  if (s === 6) return { label: 'Above the pool — with work left', tone: 'good' };
  return { label: 'Outstanding — rare', tone: 'good' };
}

// ── The prompt the model is graded with ─────────────────────────────────────
// Kept here rather than in the components so the instruction and the scorer can never drift apart.

export function buildRubricPrompt({ stationKey = DEFAULT_STATION_TYPE, hasActor = false } = {}) {
  const station = getStationType(stationKey);
  const competencyList = station.competencies.map(k => COMPETENCIES[k].label).join(', ');
  return `You are rating one MMI station the way a trained rater rates it, on a seven-point scale: 1 unsatisfactory, 3 borderline, 5 satisfactory, 7 outstanding. Score only these AAMC premed competencies, which are what this station can assess: ${competencyList}.

CALIBRATION — this is the part people get wrong. In real MMIs the modal score is 5, and a 5 means competent, fluent, and completely forgettable. A 6 is genuinely above the interviewed pool, roughly the top twenty percent. A 7 is rare. A 4 is already below the median of the interviewed pool. Assume 5 until the answer earns more, and if you are about to give a 6 or 7, re-read the response and find the reason it is not one.

WEAK (1-3) looks like: picking a side in the first sentence and never revisiting it; restating the prompt at length instead of engaging with it; answering a nearby question rather than the one asked; moralising instead of analysing; stating a rule without ever saying what they would actually do; faking confidence about law or policy instead of saying "I don't know, here is how I'd find out"; ${hasActor ? "talking over the actor's disclosure; " : ''}running out of content and padding; never acknowledging that a reasonable person could disagree.

AVERAGE (4-5) identifies the tension, names two perspectives, reaches a defensible position, and communicates clearly — but is missing stakeholder specificity, any acknowledgement of what would change their mind, any concrete first action, and any self-implication. Fluent, structured, generic.

STRONG (6-7) names stakeholders specifically rather than abstractly; states the strongest version of the opposing view before rejecting it; gives both the decision and the first concrete step, including who they would escalate to; flags uncertainty precisely and says how they would resolve it; adjusts when probed instead of defending; ${hasActor ? 'actually responds to what the actor said; ' : ''}and ends deliberately instead of trailing off.

Judge committed actions, not topic or vocabulary. "I'd sit down next to her and stay" and "I'd give her space and head home" are similar in topic and opposite on empathy — score what they said they would DO, to WHOM, and WHEN. Sentiment words earn nothing on their own.

NEVER AWARD ${SCALE_MAX}/${SCALE_MAX}. ${PRACTICE_CEILING} is the highest score available here, and it still means work remains. There is no such thing as a finished answer: if you cannot find something to improve, you have not read closely enough — go back and find the vaguest sentence, the stakeholder who stayed abstract, the step that had no time attached. Never write that an answer was perfect, flawless, or that you would not change anything.

Open with the single biggest weakness, quoting their own words — no warm-up, no softener. Then TWO more specific things to work on, each quoting what they said and each followed by a rewritten version of that exact sentence as it should have sounded — not advice about it, the actual replacement words. Only name a strength if it is genuinely there and you can point at it; if nothing stood out, say that plainly. End with a line exactly like "Score: X/7". No markdown, no bullets, plain sentences, under 230 words.`;
}

// ── Putting it together ─────────────────────────────────────────────────────

/**
 * Run a piece of AI feedback through the rubric.
 *
 * The model's number is a proposal; the deterministic score is a ceiling. The student sees the
 * lower of the two, the feedback's score line is rewritten to match (so the prose and the number
 * can never disagree), and the reliability caveat is appended — because a confident verdict from a
 * single station would be a lie about how the format works.
 */
/**
 * Score a whole live session — several answers to several questions — rather than one station.
 *
 * WHY THIS EXISTS. The live interview used to glue every answer the student gave into one string and
 * hand it to scoreStation(). That is much more generous than it looks, because the detectors are
 * ORs over the text: name a stakeholder in answer one, flag uncertainty in answer four, end answer
 * six deliberately, and the blob has three strong markers even though no single answer had more than
 * one. Eight turns of merely-competent answers therefore accumulated their way to a 6 or a 7, which
 * is exactly the "it makes you feel like you gave the best interview ever" failure.
 *
 * A rater does not score a transcript. They score answers, and their overall impression is closer to
 * the typical answer than to the best one. So each answer is scored on its own, and the session
 * lands on the mean — floored, not rounded, so one strong turn cannot round a session of 4s up.
 * Weaknesses are pooled across turns, with anything that recurred surfaced first, because a habit is
 * a more useful finding than an incident.
 */
export function scoreSession(answers, ctx = {}) {
  const list = (Array.isArray(answers) ? answers : [answers]).map(a => String(a || '').trim()).filter(Boolean);
  if (!list.length) return scoreStation('', ctx);

  const perAnswer = list.map((a, i) => scoreStation(a, {
    ...ctx,
    // Only the answers that came after a follow-up can be assessed on adjustment; crediting the
    // opening answer for adjusting to a probe it never heard is free points.
    probed: i > 0 ? ctx.probed : false,
    adjustedAfterProbe: i > 0 ? ctx.adjustedAfterProbe : false,
  }));

  const mean = perAnswer.reduce((n, r) => n + r.score, 0) / perAnswer.length;
  const score = Math.max(1, Math.min(PRACTICE_CEILING, Math.floor(mean)));

  // Recurring findings first — "you did this in four of six answers" is the sentence that changes
  // behaviour, and a one-off is worth less than a pattern.
  const counts = new Map();
  for (const r of perAnswer) for (const reason of r.reasons || []) counts.set(reason, (counts.get(reason) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const reasons = ranked.map(([reason, n]) =>
    n > 1 && perAnswer.length > 1 ? `In ${n} of your ${perAnswer.length} answers: ${reason}` : reason
  ).slice(0, 6);

  // A strength has to have shown up in most of the session to count as one. Something that happened
  // once is a moment, not a habit, and telling a student otherwise is how this tool starts lying.
  const strengthCounts = new Map();
  for (const r of perAnswer) for (const s of r.strengths || []) strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
  const threshold = Math.max(2, Math.ceil(perAnswer.length / 2));
  const strengths = perAnswer.length === 1
    ? perAnswer[0].strengths
    : [...strengthCounts.entries()].filter(([, n]) => n >= threshold).map(([s]) => s);

  const worst = perAnswer.reduce((lo, r) => (r.score < lo.score ? r : lo), perAnswer[0]);

  return {
    ...worst,
    score,
    rawScore: mean,
    mean,
    perAnswer: perAnswer.map(r => r.score),
    ceiling: PRACTICE_CEILING,
    ceilingNote: CEILING_NOTE,
    anchor: anchorFor(score),
    band: scoreBand(score),
    reasons: reasons.length ? reasons : worst.reasons,
    strengths,
    competencies: scoreCompetencies(score, worst.signals, getStationType(ctx.stationKey || DEFAULT_STATION_TYPE)),
  };
}

// ── The prose has to agree with the cap ─────────────────────────────────────
// Capping the number does nothing if the paragraph above it says "a perfect answer — I wouldn't
// change a thing." A student reads the sentence, not the arithmetic. These are the specific phrases
// a model reaches for when it is being kind to a teenager, rewritten into something true: there is
// always a next layer, and saying so is the entire premise of the feature.
const PERFECTION_REWRITES = [
  [/\b(?:that was |this was |a |an )?(?:absolutely |truly |genuinely )?(?:perfect|flawless|faultless|impeccable)\b(?: answer| response| interview)?/gi, 'a strong answer with room left'],
  [/\bI would(?:n't| not) change (?:a thing|anything)\b/gi, 'there is still something I would change'],
  [/\bnothing (?:to improve|to work on|I would change|needs improving)\b/gi, 'still something to work on'],
  [/\b(?:you )?(?:nailed|aced|crushed) (?:it|this|that)\b/gi, 'you handled that well'],
  [/\bcould(?:n't| not) (?:have been|be) better\b/gi, 'could still be sharper'],
  [/\b(?:the|a) best (?:possible )?(?:answer|response)\b/gi, 'a strong answer'],
  [/\btop marks?\b/gi, 'a good result'],
  [/\b(?:10|ten)\s*(?:\/|out of)\s*(?:10|ten)\b/gi, 'strong'],
  [/\b7\s*(?:\/|out of)\s*7\b/gi, `${PRACTICE_CEILING}/${SCALE_MAX}`],
];

export function stripPerfection(text) {
  return PERFECTION_REWRITES.reduce((s, [re, to]) => s.replace(re, to), String(text || ''));
}

export function calibrateFeedback(feedbackText, answerText, ctx = {}) {
  const proposed = parseInterviewScore(feedbackText);
  // An array of answers is a session (see scoreSession); a string is one station.
  const rated = Array.isArray(answerText) ? scoreSession(answerText, ctx) : scoreStation(answerText, ctx);
  const score = Math.min(proposed === null ? rated.score : Math.min(proposed, rated.score), PRACTICE_CEILING);
  const band = scoreBand(score);
  const anchor = anchorFor(score);

  let text = stripPerfection(String(feedbackText || '').trim());
  const scoreLine = /(?:score|overall)\s*:?\s*\d+(?:\.\d+)?\s*(?:\/|out of)\s*(?:7|10)\.?/i;
  const rendered = `Score: ${score}/${SCALE_MAX} — ${anchor.label}.`;
  if (scoreLine.test(text)) text = text.replace(scoreLine, rendered);
  else text = text ? `${text}\n\n${rendered}` : rendered;

  return {
    text,
    score,
    scale: SCALE_MAX,
    proposed,
    rubricCeiling: rated.score,
    ceiling: PRACTICE_CEILING,
    ceilingNote: CEILING_NOTE,
    mean: rated.mean ?? null,
    perAnswer: rated.perAnswer || null,
    anchor,
    band,
    reasons: rated.reasons,
    strengths: rated.strengths,
    competencies: rated.competencies,
    signals: rated.signals,
    caveat: rated.caveat,
  };
}
