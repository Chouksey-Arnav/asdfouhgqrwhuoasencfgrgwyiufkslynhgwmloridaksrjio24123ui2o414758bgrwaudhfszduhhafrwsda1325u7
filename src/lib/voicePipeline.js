// The prosody pipeline that sits between the interviewer's words and the speech engine.
//
// WHY THIS EXISTS. The complaint was that the interview voices sounded "unrealistic and scary."
// The instinct is to go shopping for a better TTS vendor, but that is almost never the cause. A
// synthetic voice reads as hostile for three mechanical reasons, all of which are fixable on our
// side of the API:
//
//   1. NO EMOTIONAL LAYER ON A STRESSFUL SENTENCE. A flat, affect-free voice saying "tell me about
//      a time you failed" does not land as neutral — it lands as an accusation. Neutral prosody
//      plus a threatening proposition reads as contempt. So every line gets an intent (greeting,
//      question, probe, acknowledgement, closing) and the intent moves rate, pitch and pause
//      length. See planUtterance().
//   2. METRONOMIC PACING. Speech engines produce identical inter-word timing forever, which no
//      human does. We break the metronome by segmenting on real clause boundaries and giving each
//      segment its own micro-jitter in rate, plus genuine silence at the boundaries (Web Speech has
//      no SSML <break>, so the pauses are real scheduled gaps between utterances — see speech.js).
//   3. MISPRONUNCIATION. "MMI," "AAMC," "1,200," "Dr. Osei" spoken raw come out as garbage, and
//      garbage inside otherwise-fluent speech is the actual artifact the uncanny-valley research
//      implicates. normalizeForSpeech() rewrites numbers, acronyms, honorifics and known names into
//      spoken form BEFORE synthesis.
//
// A fourth fix is terminal contour. A question stem that ends on a preposition ("...a time you
// struggled with?") gets an upward inflection, which sounds uncertain — an uncertain authority
// figure is unsettling. Two defenses: the authored question banks are linted to end on a noun
// (questionStemIssue(), enforced by scripts/verifyInterviewRealism.mjs), and any wh-question is
// given a falling terminal contour here regardless of how it was written.
//
// Everything in this module is pure and deterministic: the same text always produces the same
// plan, so a student who previews a voice hears exactly what they'll get in the interview.

// ── Deterministic jitter ─────────────────────────────────────────────────────
// Randomness that is stable per-string. Math.random() would make the same line sound different on
// every replay, which is worse than metronomic — it makes previews meaningless.
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function jitter(seed, index, spread) {
  const h = hashString(`${seed}#${index}`);
  return ((h % 1000) / 1000 - 0.5) * 2 * spread; // uniform in [-spread, +spread]
}

// ── Normalization ────────────────────────────────────────────────────────────

// Acronyms and initialisms that appear in this product. Anything not listed is handled by the
// generic all-caps rule below (spell it out), which is the safe default: a spelled-out acronym is
// merely formal, a mis-guessed one is a glitch.
const LEXICON = {
  MMI: 'M M I',
  CASPER: 'Casper',
  CASPer: 'Casper',
  MCAT: 'em cat',
  AAMC: 'A A M C',
  GPA: 'G P A',
  SAT: 'S A T',
  ACT: 'A C T',
  MD: 'M D',
  DO: 'D O',
  PA: 'P A',
  ICU: 'I C U',
  ER: 'E R',
  AP: 'A P',
  IB: 'I B',
  STEM: 'stem',
  NHS: 'N H S',
  EMT: 'E M T',
  CPR: 'C P R',
  HIPAA: 'HIP uh',
  FAFSA: 'FAF suh',
  IEP: 'I E P',
  OK: 'okay',
};

const HONORIFICS = [
  [/\bDr\.\s*/g, 'Doctor '],
  [/\bProf\.\s*/g, 'Professor '],
  [/\bMr\.\s*/g, 'Mister '],
  [/\bMrs\.\s*/g, 'Missus '],
  [/\bMs\.\s*/g, 'Miz '],
  [/\bSt\.\s+([A-Z])/g, 'Saint $1'],
  [/\bvs\.?\b/gi, 'versus'],
  [/\be\.g\.,?/gi, 'for example,'],
  [/\bi\.e\.,?/gi, 'that is,'],
  [/\betc\.?/gi, 'and so on'],
  [/\bapprox\.?/gi, 'approximately'],
];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// Cardinal numbers up to the millions. Beyond that we leave the digits alone rather than emit
// something wrong — but nothing in this product says a number that large out loud.
export function numberToWords(n) {
  n = Math.trunc(Math.abs(Number(n)));
  if (!Number.isFinite(n)) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberToWords(n % 100)}` : ''}`;
  if (n < 1000000) return `${numberToWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberToWords(n % 1000)}` : ''}`;
  if (n < 1000000000) return `${numberToWords(Math.floor(n / 1000000))} million${n % 1000000 ? ` ${numberToWords(n % 1000000)}` : ''}`;
  return String(n);
}

const ORDINAL_WORD = {
  1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 20: 'twentieth', 30: 'thirtieth',
};
function ordinalToWords(n) {
  n = Number(n);
  if (ORDINAL_WORD[n]) return ORDINAL_WORD[n];
  if (n > 20 && n < 100 && n % 10) return `${TENS[Math.floor(n / 10)]}-${ORDINAL_WORD[n % 10] || ''}`.replace(/-$/, '');
  return `${numberToWords(n)}th`;
}

// Years read as pairs ("twenty twenty-six"), not as cardinals ("two thousand twenty-six") — the
// cardinal reading is the single most common giveaway that a machine is talking.
function yearToWords(y) {
  const n = Number(y);
  if (n >= 2000 && n <= 2009) return `two thousand${n % 2000 ? ` ${ONES[n % 2000]}` : ''}`;
  const hi = Math.floor(n / 100), lo = n % 100;
  if (lo === 0) return `${numberToWords(hi)} hundred`;
  return `${numberToWords(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : numberToWords(lo)}`;
}

// Rewrite text into something a speech engine can read without producing an artifact. Order
// matters: honorifics and lexicon entries before digits, digits before the generic acronym rule.
export function normalizeForSpeech(input) {
  let t = String(input || '');

  for (const [re, to] of HONORIFICS) t = t.replace(re, to);

  // Known acronyms — word-boundary matched so "SAT" in "SATisfied" is untouched.
  for (const [key, spoken] of Object.entries(LEXICON)) {
    t = t.replace(new RegExp(`\\b${key}\\b`, 'g'), spoken);
  }

  // Percentages, money, times, ranges, ordinals, years, decimals, plain integers.
  t = t.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => `${numberToWords(Math.trunc(n))}${String(n).includes('.') ? ` point ${String(n).split('.')[1].split('').map(d => ONES[+d]).join(' ')}` : ''} percent`);
  t = t.replace(/\$\s*(\d[\d,]*)(?:\.(\d{2}))?/g, (_, d, c) => {
    const dollars = numberToWords(d.replace(/,/g, ''));
    return `${dollars} dollar${Number(d.replace(/,/g, '')) === 1 ? '' : 's'}${c && c !== '00' ? ` and ${numberToWords(c)} cents` : ''}`;
  });
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => `${numberToWords(h)} ${m === '00' ? "o'clock" : m < 10 ? `oh ${numberToWords(m)}` : numberToWords(m)}`);
  t = t.replace(/\b(\d+)\s*[-–]\s*(\d+)\b/g, (_, a, b) => `${numberToWords(a)} to ${numberToWords(b)}`);
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, n) => ordinalToWords(n));
  t = t.replace(/\b(1[5-9]\d{2}|20\d{2})\b/g, (_, y) => yearToWords(y));
  t = t.replace(/\b(\d+)\.(\d+)\b/g, (_, a, b) => `${numberToWords(a)} point ${b.split('').map(d => ONES[+d]).join(' ')}`);
  t = t.replace(/\b\d[\d,]*\b/g, (m) => numberToWords(m.replace(/,/g, '')));

  // Generic acronym rule for anything not in the lexicon: 2–5 capitals in a row get spelled out.
  t = t.replace(/\b([A-Z]{2,5})\b/g, (m) => m.split('').join(' '));

  // Symbols a speech engine either skips or reads literally.
  t = t.replace(/&/g, ' and ').replace(/\s*\/\s*/g, ' or ').replace(/\s*\+\s*/g, ' plus ');
  // Markdown residue: the model is told not to emit it, but a stray asterisk should never be read
  // aloud as "asterisk."
  t = t.replace(/[*_`#>|]/g, ' ');

  return t.replace(/[ \t]+/g, ' ').replace(/ ([,.;:?!])/g, '$1').trim();
}

// ── Question-stem shape ──────────────────────────────────────────────────────

// A question that ends on a function word gets a rising, tentative terminal. From an authority
// figure that reads as unsure, which is exactly the register mismatch that unsettles people.
const WEAK_FINAL_WORDS = new Set([
  'about', 'with', 'for', 'to', 'from', 'of', 'on', 'in', 'at', 'by', 'into', 'over', 'under',
  'through', 'after', 'before', 'like', 'as', 'than', 'toward', 'towards', 'around', 'against',
  'up', 'out', 'off', 'down', 'and', 'or', 'but', 'so', 'because', 'if', 'then',
]);

// Returns null if the stem is fine, otherwise a short explanation. Used as a lint over the
// authored question banks (scripts/verifyInterviewRealism.mjs) — not applied to model output at
// runtime, where the falling-contour rule in planUtterance() covers us instead.
export function questionStemIssue(stem) {
  const t = String(stem || '').trim();
  if (!t) return 'empty stem';
  const words = t.replace(/["'’”)\]]+$/, '').replace(/[?.!]+$/, '').trim().split(/\s+/);
  const last = (words[words.length - 1] || '').toLowerCase().replace(/[^a-z'-]/g, '');
  if (WEAK_FINAL_WORDS.has(last)) {
    return `ends on "${last}", a function word — it takes a rising, uncertain terminal. End the stem on a noun instead.`;
  }
  return null;
}

// ── Segmentation into a prosody plan ────────────────────────────────────────

// Pause budget at each boundary type, in milliseconds. These are the "real micro-pauses at clause
// boundaries" — short enough to read as breathing, long enough that the engine's own uniform
// spacing stops being the dominant rhythm.
const BOUNDARY_PAUSE = {
  comma: 170,
  clause: 210,   // subordinating conjunction with no comma written
  dash: 260,
  colon: 300,
  sentence: 380,
  question: 430,
  paragraph: 620,
  none: 0,
};

// A long stretch with no punctuation still needs air. Every ~90 characters of unbroken text we
// insert a breath — a shorter pause than a clause boundary, placed at the nearest word gap.
const BREATH_EVERY_CHARS = 90;
const BREATH_PAUSE = 130;

// Conjunctions that open a real clause. Splitting before these gives us a boundary even when the
// writer didn't type a comma, which is most of the time in spoken-style model output.
const CLAUSE_OPENER = /\s+(?=(?:and then|but|because|so that|although|though|whereas|while|unless|until|before|after|if|when)\s)/i;

function splitSentences(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .flatMap((para, pi, paras) => {
      const sents = para.match(/[^.!?]+[.!?]*/g) || (para.trim() ? [para] : []);
      return sents.map((s, si) => ({
        text: s.trim(),
        endsParagraph: si === sents.length - 1 && pi < paras.length - 1,
      })).filter(s => s.text);
    });
}

function splitClauses(sentence) {
  // Punctuation boundaries first, then unpunctuated clause openers inside each piece. The boundary
  // is marked before splitting rather than matched with a lookbehind — older Safari doesn't
  // support lookbehind and would throw at parse time, taking the whole module with it.
  const byPunct = sentence.replace(/([,;:—–])\s+/g, '$1\n').split('\n');
  const out = [];
  for (const piece of byPunct) {
    const parts = piece.split(CLAUSE_OPENER);
    for (const p of parts) if (p.trim()) out.push(p.trim());
  }
  return out.length ? out : [sentence];
}

function boundaryAfter(clause, isLastInSentence, sentenceText, endsParagraph) {
  if (isLastInSentence) {
    if (endsParagraph) return 'paragraph';
    if (/\?\s*$/.test(sentenceText)) return 'question';
    return 'sentence';
  }
  if (/[—–-]\s*$/.test(clause)) return 'dash';
  if (/[:;]\s*$/.test(clause)) return 'colon';
  if (/,\s*$/.test(clause)) return 'comma';
  return 'clause';
}

// Split an over-long clause at word boundaries so we can put breaths inside it.
function withBreaths(clause) {
  if (clause.length <= BREATH_EVERY_CHARS * 1.4) return [{ text: clause, breathAfter: false }];
  const words = clause.split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if (cur.length + w.length + 1 > BREATH_EVERY_CHARS && cur) { out.push({ text: cur, breathAfter: true }); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push({ text: cur, breathAfter: false });
  if (out.length) out[out.length - 1].breathAfter = false;
  return out;
}

// ── Intent: the emotional layer ─────────────────────────────────────────────
// The single most likely reason a voice reads as hostile is a stressful proposition delivered with
// zero affect. Intent is what we vary instead: a probe is slower and lower and sits longer before
// it lands; an acknowledgement is quicker and lighter; a closing settles. These deltas are small
// on purpose — big pitch moves are how you get a cartoon, not a person.
export const INTENTS = {
  greeting:      { rate: +0.02, pitch: +0.02, pauseScale: 0.9, lead: 0 },
  question:      { rate: 0,     pitch: 0,     pauseScale: 1.0, lead: 220 },
  probe:         { rate: -0.04, pitch: -0.03, pauseScale: 1.25, lead: 420 },
  acknowledge:   { rate: +0.03, pitch: +0.02, pauseScale: 0.85, lead: 0 },
  closing:       { rate: -0.02, pitch: -0.02, pauseScale: 1.1, lead: 160 },
  feedback:      { rate: -0.01, pitch: 0,     pauseScale: 1.05, lead: 200 },
};

// Guess the intent of a line the model produced, so we don't have to make the model tag its own
// output (which it forgets to do, and which would leak into the transcript if it did).
export function inferIntent(text, { isFirstTurn = false } = {}) {
  const t = String(text || '').trim();
  if (isFirstTurn) return 'greeting';
  if (/\b(thanks for|that's all|we're out of time|good luck|wrap(ping)? up)\b/i.test(t)) return 'closing';
  if (/\b(walk me through|what exactly|specifically|step by step|what did you actually|push back|say more about)\b/i.test(t)) return 'probe';
  if (/\?\s*$/.test(t)) return 'question';
  return 'acknowledge';
}

/**
 * Turn one interviewer line into a list of speakable segments with real pauses and per-segment
 * prosody. speech.js walks this list, speaking each segment and waiting `pauseAfter` between them.
 *
 * @param {string} text     raw line from the model (or an authored stem)
 * @param {object} opts
 *   persona   – a resolved panel persona (see interviewPanel.js): supplies base rate/pitch, how
 *               much it varies, and whether filled pauses are allowed at all
 *   intent    – one of INTENTS; inferred from the text when omitted
 *   isFirstTurn – forces the greeting intent
 * @returns {{segments: Array, leadMs: number, intent: string, normalized: string}}
 */
export function planUtterance(text, { persona = {}, intent, isFirstTurn = false } = {}) {
  const normalized = normalizeForSpeech(text);
  const chosenIntent = intent || inferIntent(text, { isFirstTurn });
  const I = INTENTS[chosenIntent] || INTENTS.question;

  const baseRate = persona.rate ?? 1;
  const basePitch = persona.pitch ?? 1;
  // How far this persona's pacing drifts around its own baseline. A dry senior physician varies
  // less than a medical student; both vary more than zero, which is what a raw engine does.
  const rateVar = persona.rateVariance ?? 0.03;
  const pitchVar = persona.pitchVariance ?? 0.02;

  const sentences = splitSentences(normalized);
  const segments = [];
  const seed = normalized.slice(0, 64);
  let idx = 0;

  sentences.forEach((sent) => {
    const clauses = splitClauses(sent.text);
    clauses.forEach((clause, ci) => {
      const lastInSentence = ci === clauses.length - 1;
      const boundary = boundaryAfter(clause, lastInSentence, sent.text, sent.endsParagraph);
      const pieces = withBreaths(clause);

      pieces.forEach((piece, pi) => {
        const isFinalPiece = pi === pieces.length - 1;
        // Declination: within a sentence, pitch drifts down slightly as it progresses — the single
        // clearest cue that a human is completing a thought rather than reciting a list.
        const progress = clauses.length > 1 ? ci / (clauses.length - 1) : 1;
        let pitch = basePitch + jitter(seed, idx, pitchVar) + I.pitch - progress * 0.015;
        let rate = baseRate + jitter(seed, idx + 991, rateVar) + I.rate;

        // Falling terminal on the last piece of a question. Questions get an automatic rise from
        // most engines; a wh-question or an imperative stem from an interviewer should fall, and a
        // fall is also what rescues a stem that was written ending on a preposition.
        if (lastInSentence && isFinalPiece && /\?\s*$/.test(sent.text) && !/^(is|are|was|were|do|does|did|can|could|would|will|have|has|had|should)\b/i.test(sent.text)) {
          pitch -= 0.05;
          rate -= 0.02;
        }

        const pauseAfter = isFinalPiece
          ? Math.round(BOUNDARY_PAUSE[boundary] * I.pauseScale * (1 + jitter(seed, idx + 77, 0.18)))
          : Math.round(BREATH_PAUSE * (1 + jitter(seed, idx + 313, 0.2)));

        segments.push({
          text: piece.text,
          rate: clamp(rate, 0.7, 1.25),
          pitch: clamp(pitch, 0.7, 1.3),
          pauseAfter: Math.max(0, pauseAfter),
          boundary: isFinalPiece ? boundary : 'breath',
        });
        idx++;
      });
    });
  });

  if (segments.length) segments[segments.length - 1].pauseAfter = 0;

  return { segments, leadMs: I.lead, intent: chosenIntent, normalized };
}

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

// ── Filled pauses ────────────────────────────────────────────────────────────
// "Um" and "uh" make a voice sound more human AND less competent — the evidence genuinely cuts both
// ways. That trade is fine for a role-play actor (a distressed patient, a frustrated teammate),
// where hesitancy is the character. It is never fine for a formal panel interviewer, where the only
// effect is to make the person judging you sound like they don't know what they're doing. So this
// is gated on the persona, and every persona that isn't an actor has allowFilledPauses: false.
const FILLERS = ['um,', 'uh,', 'well,'];

export function addFilledPauses(text, { persona = {}, seedSalt = '' } = {}) {
  if (!persona.allowFilledPauses) return text;
  const sentences = splitSentences(text);
  if (!sentences.length) return text;
  const seed = `${seedSalt}${text.slice(0, 48)}`;
  // At most one filler per line, and only ever at the start of a sentence — mid-clause fillers
  // sound like a glitch rather than a hesitation.
  const target = hashString(seed) % sentences.length;
  return sentences.map((s, i) => {
    if (i !== target) return s.text;
    const f = FILLERS[hashString(`${seed}f`) % FILLERS.length];
    return `${f} ${s.text.charAt(0).toLowerCase()}${s.text.slice(1)}`;
  }).join(' ');
}

// Total wall-clock time a plan will take, roughly — used to decide whether a "the rater is writing
// notes" pause would leave the student sitting in silence for an uncomfortably long time.
export function estimateDurationMs(plan) {
  const chars = plan.segments.reduce((n, s) => n + s.text.length, 0);
  const pauses = plan.segments.reduce((n, s) => n + s.pauseAfter, 0);
  return Math.round(chars * 55 + pauses + plan.leadMs); // ~55ms/char ≈ 165 wpm
}
