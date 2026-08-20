// Turn-taking: who holds the floor, when it changes hands, and how long the silences are.
//
// This is the half of "the voice sounds scary" that has nothing to do with the voice. Two people
// talking is a negotiation over a shared floor, and a system that gets the negotiation wrong reads
// as domineering no matter how pleasant its timbre is. Three rules, all of them asymmetric on
// purpose, because the two participants here are not peers — one of them is a nervous teenager and
// the other is pretending to be an authority figure:
//
//   1. TURN GAP: 300–500ms between the student finishing and the interviewer starting. Above about
//      600ms the system feels slow and broken; below 300ms it feels like it was waiting to pounce
//      rather than listening. Per-persona inside that band (see interviewPanel.js) — the dean sits
//      at the slow end, the medical student at the quick end.
//   2. BARGE-IN IS ASYMMETRIC. The student interrupting the interviewer always wins, instantly
//      (under 150ms to cut the audio). The interviewer essentially never interrupts the student —
//      the only exception is a deliberate, scripted pressure probe, which has to be requested
//      explicitly and is off by default.
//   3. ENDPOINTING IS STRICT. 800ms of silence if the sentence sounds finished, 1200ms if it does
//      not, and it keeps extending while the transcript ends mid-thought. Nervous teenagers pause
//      in the middle of sentences constantly; aggressive endpointing cuts them off, which is both
//      unrealistic and demoralising — the actual harm is that they learn to rush.
//
// Plus one thing that is not a bug fix: silence is allowed to sit. Real interviewers do not fill
// every gap, and a deliberate "the rater is writing notes" pause is more realistic than an instant
// reply and gives a student a moment to breathe. See noteTakingPause().

export const TIMING = {
  // Gap between the student's turn ending and the interviewer's beginning.
  TURN_GAP_MIN_MS: 300,
  TURN_GAP_MAX_MS: 500,
  TURN_GAP_DEFAULT_MS: 400,

  // Hard ceiling on how long it may take to silence the interviewer once the student starts
  // speaking. This is a latency budget, not a delay: cancel the audio immediately, this is what we
  // assert against.
  STUDENT_BARGE_IN_MAX_MS: 150,

  // Endpointing: how much trailing silence ends the student's turn.
  ENDPOINT_COMPLETE_MS: 800,     // sentence sounds finished
  ENDPOINT_INCOMPLETE_MS: 1200,  // sentence ends mid-thought
  ENDPOINT_HARD_CEILING_MS: 6000, // even a very long think eventually ends the turn

  // "The rater is writing notes." Occasionally the interviewer just… doesn't answer immediately.
  NOTE_PAUSE_PROBABILITY: 0.28,
};

// ── Semantic completeness ────────────────────────────────────────────────────
// A cheap, local, no-network check for whether the transcript so far sounds like a finished thought.
// It does not need to be clever; it needs to be biased toward "not finished," because the cost of
// waiting an extra 400ms is nothing and the cost of cutting a 16-year-old off mid-sentence is that
// they stop trying.

// Words that cannot end a completed spoken thought — a turn ending on any of these is someone
// pausing to think, not someone finishing.
const DANGLING = new Set([
  'and', 'but', 'or', 'so', 'because', 'since', 'while', 'when', 'if', 'that', 'which', 'who',
  'the', 'a', 'an', 'my', 'your', 'their', 'his', 'her', 'its', 'our', 'this', 'these', 'those',
  'to', 'of', 'for', 'with', 'about', 'from', 'in', 'on', 'at', 'by', 'into', 'like', 'as',
  'is', 'was', 'were', 'am', 'are', 'be', 'been', 'would', 'could', 'should', 'will', 'can',
  'i', "i'd", "i'm", "i've", "it's", 'im', 'ive',
  // Bare subject pronouns: "the main issue is that she" is someone mid-sentence, not someone done.
  'he', 'she', 'they', 'we',
  'um', 'uh', 'er', 'erm', 'hmm', 'well', 'maybe', 'probably', 'kind', 'sort', 'really', 'just',
  'very', 'more', 'most', 'also', 'then', 'than', 'not', "don't", 'dont',
]);

// A trailing phrase that reads as "I am still assembling this," even though the last word alone
// might look fine.
const MID_THOUGHT_TAIL = /\b(i think|i guess|i mean|i would say|one thing|the other thing|first of all|for example|such as|kind of|sort of|what i|the thing is|and then|but then|so like)\s*$/i;

export function isSemanticallyComplete(transcript) {
  const t = String(transcript || '').trim();
  if (!t) return false;
  // Explicit terminal punctuation from the recogniser is the strongest signal available.
  if (/[.!?]["')\]]?$/.test(t)) return true;
  if (MID_THOUGHT_TAIL.test(t)) return false;

  const words = t.toLowerCase().replace(/[^a-z\s'’]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  // Too short to be a complete answer to an interview question, whatever it ends on.
  if (words.length < 4) return false;
  if (DANGLING.has(words[words.length - 1].replace(/’/g, "'"))) return false;

  // A clause needs a verb in it somewhere before we're willing to call it finished.
  const hasVerb = /\b(is|are|was|were|am|be|been|being|have|has|had|do|does|did|would|could|should|will|can|say|said|think|thought|feel|felt|want|need|know|knew|go|went|make|made|take|took|tell|told|ask|asked|talk|talked|help|helped|try|tried|start|started|end|ended|decide|decided|\w+ed|\w+ing)\b/.test(words.join(' '));
  return hasVerb;
}

/**
 * How long to wait, from the last speech frame, before declaring the student's turn over.
 * Strict by design — see the header. Returns a value inside
 * [ENDPOINT_COMPLETE_MS, ENDPOINT_HARD_CEILING_MS].
 *
 * `elapsedSilenceMs` lets the caller ask "should I still be waiting?" repeatedly without the
 * threshold jumping around as interim results arrive.
 */
export function endpointDelayMs(transcript, { patienceMultiplier = 1 } = {}) {
  const base = isSemanticallyComplete(transcript)
    ? TIMING.ENDPOINT_COMPLETE_MS
    : TIMING.ENDPOINT_INCOMPLETE_MS;
  return Math.min(TIMING.ENDPOINT_HARD_CEILING_MS, Math.round(base * patienceMultiplier));
}

/**
 * Drives endpointing for one student answer.
 *
 * The caller feeds it every transcript update (interim results included, which is what makes this
 * work — an interim result is proof the student is still talking even when the words are wrong).
 * When enough silence has passed for the current transcript's completeness, onEndpoint fires once.
 *
 * `patienceMultiplier` above 1 buys a nervous student more room; the panel's gentlest persona uses
 * it, because the point of that persona is that nobody is rushing you.
 */
export function createEndpointer({ onEndpoint, patienceMultiplier = 1 } = {}) {
  let timer = null;
  let latest = '';
  let stopped = false;
  let lastVoiceAt = 0;

  function arm() {
    clearTimeout(timer);
    if (stopped) return;
    const delay = endpointDelayMs(latest, { patienceMultiplier });
    timer = setTimeout(() => {
      if (stopped) return;
      stopped = true;
      onEndpoint?.(latest, { reason: isSemanticallyComplete(latest) ? 'complete' : 'timeout', delay });
    }, delay);
  }

  return {
    // Called on every recogniser update. Any new text means the student is still talking, so the
    // silence clock restarts from zero.
    push(transcript) {
      if (stopped) return;
      const next = String(transcript || '');
      if (next !== latest) { latest = next; lastVoiceAt = Date.now(); }
      arm();
    },
    // Student pressed "send" — end the turn now, no waiting.
    flush() {
      if (stopped) return;
      clearTimeout(timer);
      stopped = true;
      onEndpoint?.(latest, { reason: 'manual', delay: 0 });
    },
    cancel() { stopped = true; clearTimeout(timer); },
    get transcript() { return latest; },
    get silenceMs() { return lastVoiceAt ? Date.now() - lastVoiceAt : 0; },
    get pendingDelayMs() { return endpointDelayMs(latest, { patienceMultiplier }); },
  };
}

// ── Barge-in ─────────────────────────────────────────────────────────────────

/**
 * The student started talking while the interviewer was still speaking. This ALWAYS wins, and it
 * wins immediately: returns the cancel action for the caller to run synchronously. The 150ms in
 * TIMING is the budget we hold ourselves to, not a delay to insert.
 */
export function studentBargeIn({ cancelSpeech }) {
  const at = Date.now();
  cancelSpeech?.();
  return { cancelledAt: at, latencyMs: Date.now() - at };
}

/**
 * May the interviewer cut across the student? Almost never. The single legitimate case is a
 * scripted pressure probe in a station that is explicitly designed to apply time pressure, and
 * even then only after the student has been talking long enough that a real interviewer would
 * genuinely intervene. Everything else — including "the answer is rambling" — is not a reason.
 */
export function interviewerMayInterrupt({ scriptedPressureProbe = false, studentSpeakingMs = 0 } = {}) {
  if (!scriptedPressureProbe) return false;
  return studentSpeakingMs > 45000;
}

// ── Gaps and silences ────────────────────────────────────────────────────────

/** The natural gap before the interviewer's reply, jittered slightly inside the 300–500ms band. */
export function turnGapMs(persona) {
  const base = persona?.turnGapMs ?? TIMING.TURN_GAP_DEFAULT_MS;
  const clamped = Math.min(TIMING.TURN_GAP_MAX_MS, Math.max(TIMING.TURN_GAP_MIN_MS, base));
  const spread = 40;
  const jittered = clamped + (Math.random() * 2 - 1) * spread;
  return Math.round(Math.min(TIMING.TURN_GAP_MAX_MS, Math.max(TIMING.TURN_GAP_MIN_MS, jittered)));
}

/**
 * Sometimes, instead of replying, the interviewer writes. Returns 0 when this turn isn't one of
 * those, or a duration in ms when it is — the caller shows "writing notes…" rather than a thinking
 * spinner, because that is what is actually happening in the room and it is a very different
 * feeling from a system that has hung.
 *
 * Deliberately not applied to the first turn (a pause before the greeting is just a bug) and not to
 * the debrief.
 */
export function noteTakingPause(persona, { turnIndex = 0, force = false } = {}) {
  if (turnIndex < 1) return 0;
  if (!force && Math.random() > TIMING.NOTE_PAUSE_PROBABILITY) return 0;
  const [lo, hi] = persona?.notePauseMs || [700, 1300];
  return Math.round(lo + Math.random() * (hi - lo));
}

/**
 * Should a backchannel ("mm-hm") fire right now? Station-dependent via backchannelPolicy() in
 * interviewPanel.js. Returns a token or null. Never fires twice inside the policy's minimum gap,
 * and never in the first few seconds of a turn — an immediate "mm-hm" reads as impatience.
 */
export function nextBackchannel(policy, { speakingMs = 0, lastAt = 0 } = {}) {
  if (!policy?.enabled || !policy.tokens.length) return null;
  if (speakingMs < 4000) return null;
  if (lastAt && Date.now() - lastAt < policy.minGapMs) return null;
  return policy.tokens[Math.floor(Math.random() * policy.tokens.length)];
}
