// Scoring for interview practice feedback — parsing, and (the important half) calibration.
//
// PARSING: both feedback shapes end with a predictable scored line by prompt design —
// Standard/MMI/CASPer (InterviewPrepPanel.jsx) end with "Score: X/10", the Live Voice debrief
// (LiveVoiceInterview.jsx) ends with "Overall: X out of 10" — so one regex covers both instead of
// duplicating slightly-different parsing per file. Sessions are stored with `score: null` when
// nothing parseable comes back (a malformed AI reply shouldn't crash session logging), and the
// History panel treats null as "not yet scored" rather than 0.
//
// CALIBRATION: prompt instructions alone do not hold a score down. However bluntly the rubric is
// written, a chat model asked to grade a teenager drifts back toward 7-and-8 out of 10 for answers
// a real interviewer would find vague and forgettable — and a simulator that hands out 8s teaches
// a student that a bad answer is a good one, which is worse than no practice at all. So the model's
// number is not trusted on its own: it is a proposal, capped by a deterministic ceiling computed
// from objective properties of what the student actually said (length, concrete specifics, first-
// person action, a real outcome, clichés, filler). The student sees the lower of the two, plus the
// specific reasons it was capped. The ceiling only ever lowers a score — if the model grades
// harder than the ceiling, the model's number stands.

export function parseInterviewScore(text) {
  if (!text) return null;
  const m = String(text).match(/(?:score|overall)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*10/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null;
}

// ── Objective signals in a student's answer ─────────────────────────────────

// Stock phrases that appear in roughly every applicant answer. They aren't wrong, they're just
// invisible — an interviewer hears them all day and remembers none of them.
const CLICHES = [
  /passionate about/i, /help(ing)? people/i, /make a difference/i, /hard[- ]?work(er|ing)/i,
  /(ever )?since I was (little|young|a kid|a child)/i, /team player/i, /out of my comfort zone/i,
  /learn and grow/i, /give back/i, /changed my life/i, /opened my eyes/i, /fast learner/i,
  /people person/i, /(I'?ve )?always (been interested in|loved|wanted)/i, /well[- ]rounded/i,
  /I'?m a very .{3,20} person/i,
];

const FILLER = /\b(um+|uh+|like,|you know|kind of|sort of|i guess|basically|literally|stuff like that|things like that|or whatever|i mean|honestly just)\b/gi;

// First-person, past-tense, concrete action — the difference between "I care about tutoring" and
// "I tutored." Interviewers score the second and discount the first.
const ACTION_VERB = /\bI\s+(?:\w+ly\s+)?(organi[sz]ed|led|built|created|started|founded|taught|ran|coached|volunteered|designed|wrote|raised|recruited|managed|planned|fixed|repaired|tutored|presented|launched|coded|programmed|researched|interviewed|trained|scheduled|negotiated|persuaded|apologi[sz]ed|called|emailed|asked|decided|chose|cut|sold|delivered|shadowed|assisted|drafted|filmed|edited|rebuilt|rewrote|set up|reached out|stayed late|showed up)\b/gi;

// Evidence the story actually went somewhere, rather than stopping at "and it was a good
// experience."
const OUTCOME = /\b(as a result|ended up|by the end|which meant|that led to|because of that|the outcome|we raised|we grew|increased|decreased|went from|turned into|since then|what I learned was|taught me that|I reali[sz]ed that|now we|now they)\b/i;

const TIME_MARKER = /\b(last (summer|year|fall|spring|winter|month|semester)|sophomore|junior|freshman|senior year|in (19|20)\d{2}|this (summer|year)|(two|three|four) years ago|over the summer)\b/i;

// Capitalized words that aren't sentence-openers: names of people, places, programs, teams — the
// texture that makes an answer sound like it happened to a specific person.
function properNounCount(text) {
  // Split on sentence enders without lookbehind (older Safari lacks it): mark the boundary first.
  const sentences = String(text).replace(/([.!?])\s+/g, '$1\n').split(/\n+/);
  let n = 0;
  for (const s of sentences) {
    const words = s.trim().split(/\s+/).slice(1); // skip the sentence-initial word
    for (const w of words) {
      const clean = w.replace(/[^A-Za-z'-]/g, '');
      if (clean.length > 2 && /^[A-Z][a-z]/.test(clean) && clean !== 'I') n++;
    }
  }
  return n;
}

export function analyzeAnswer(text) {
  const raw = String(text || '').trim();
  const words = raw ? raw.split(/\s+/).length : 0;
  const numbers = (raw.match(/\b\d+\b/g) || []).length;
  const nouns = properNounCount(raw);
  const actions = (raw.match(ACTION_VERB) || []).length;
  const cliches = CLICHES.filter(re => re.test(raw)).length;
  const fillers = (raw.match(FILLER) || []).length;
  return {
    words,
    // "Specifics" is the single strongest predictor of whether an answer is memorable: numbers,
    // named people/places/programs, and dated moments.
    specifics: numbers + nouns + (TIME_MARKER.test(raw) ? 1 : 0),
    actions,
    hasOutcome: OUTCOME.test(raw) || numbers >= 2,
    cliches,
    fillerRate: words ? fillers / words : 0,
  };
}

// The ceiling: the highest score this answer can earn from its observable properties alone,
// independent of how generous the model felt. Returns { ceiling, reasons } — the reasons are
// shown to the student, because "capped at 4" with no explanation is just a worse grade.
export function scoreCeiling(text) {
  const a = analyzeAnswer(text);
  const reasons = [];
  // Caps and deductions are tracked separately and every applicable problem is reported, not just
  // the one that happens to bind. A student whose answer is both too short AND has no specifics
  // needs to hear both — reporting only the binding cap would let them fix the length, score the
  // same, and have no idea why.
  const caps = [];
  const cap = (max, why) => { caps.push(max); reasons.push(why); };

  if (a.words < 20) cap(2, `At ${a.words} words this isn't an answer yet — an interviewer would sit in silence waiting for you to keep going.`);
  else if (a.words < 40) cap(3, `${a.words} words is far too short. A real answer to this runs 45 seconds to a minute and a half spoken.`);
  else if (a.words < 75) cap(4.5, `${a.words} words is thin — you named a topic without ever getting inside a story.`);
  else if (a.words < 120) cap(7, `${a.words} words leaves the interviewer wanting more detail than you gave them.`);

  if (a.specifics === 0) cap(4, 'Nothing specific in here — no names, no numbers, no dates, no moment an interviewer could picture. This answer could have been given by any applicant.');
  else if (a.specifics === 1) cap(6, 'Only one concrete detail. Interviewers remember specifics, and there is almost nothing here to remember you by.');

  if (a.actions === 0) cap(5, 'You described how you feel about the topic but never said what you actually did. Interviewers score actions, not attitudes.');

  if (!a.hasOutcome) cap(6.5, 'The story stops before the result. What changed because of what you did, and what did you take from it?');

  // Nothing is ever a 10, and a 9 means "would stand out in a room of strong applicants" — starting
  // at 9 keeps the top of the scale meaningful.
  let ceiling = Math.min(9, ...caps);

  let deduction = 0;
  if (a.cliches >= 1) {
    deduction += Math.min(1.5, a.cliches * 0.5);
    reasons.push(`${a.cliches} stock phrase${a.cliches > 1 ? 's' : ''} an interviewer hears in most answers ("passionate about," "help people," and the like) — they read as filler, not conviction.`);
  }
  if (a.fillerRate > 0.035) {
    deduction += 0.5;
    reasons.push('Heavy hedging and filler ("kind of," "I guess," "you know") — it makes a real point sound like a guess.');
  }
  if (a.words > 340 && !a.hasOutcome) {
    deduction += 0.5;
    reasons.push('Long and unresolved — length without a landing reads as rambling, and an interviewer stops listening well before the end.');
  }
  // Style deductions sharpen a score; they don't bury it. An answer already capped low for being
  // short and vague shouldn't be driven to a 1 for also saying "passionate about" — the caps have
  // already made the point, and a 1 tells the student nothing the 3 didn't.
  if (deduction) ceiling = Math.max(Math.min(ceiling, 3), ceiling - deduction);

  ceiling = Math.max(1, Math.min(9, Math.round(ceiling * 2) / 2));
  return { ceiling, reasons, signals: a };
}

// Plain-language band for a score, so the number lands as a judgment rather than a statistic.
export function scoreBand(score) {
  if (score === null || score === undefined) return { label: 'Not scored', tone: 'neutral' };
  if (score < 3) return { label: 'Well below the bar', tone: 'bad' };
  if (score < 5) return { label: 'Needs real work', tone: 'bad' };
  if (score < 6.5) return { label: 'Competent but forgettable', tone: 'mid' };
  if (score < 8) return { label: 'Solid', tone: 'good' };
  if (score < 9) return { label: 'Strong', tone: 'good' };
  return { label: 'Exceptional', tone: 'good' };
}

// Run a piece of AI feedback through the ceiling: returns the honest score, and the feedback text
// with its score line rewritten to match (so the prose and the number can never disagree) plus the
// capping reasons appended as the concrete "here is what to fix" list.
export function calibrateFeedback(feedbackText, answerText) {
  const proposed = parseInterviewScore(feedbackText);
  const { ceiling, reasons, signals } = scoreCeiling(answerText);
  const score = proposed === null ? ceiling : Math.min(proposed, ceiling);
  const band = scoreBand(score);

  let text = String(feedbackText || '').trim();
  const scoreLine = /(?:score|overall)\s*:?\s*\d+(?:\.\d+)?\s*(?:\/|out of)\s*10\.?/i;
  const rendered = `Score: ${score}/10 — ${band.label}.`;
  if (scoreLine.test(text)) text = text.replace(scoreLine, rendered);
  else text = text ? `${text}\n\n${rendered}` : rendered;

  return { text, score, proposed, ceiling, reasons, band, signals };
}
