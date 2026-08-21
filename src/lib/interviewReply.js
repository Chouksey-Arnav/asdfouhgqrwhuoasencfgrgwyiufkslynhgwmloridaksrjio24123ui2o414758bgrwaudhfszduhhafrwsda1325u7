// Nothing the interviewer "thinks" is ever shown or spoken.
//
// THE FAILURE THIS EXISTS TO PREVENT. The models behind this app are reasoning models: they
// deliberate in a separate channel and then write. When that channel leaks into the reply — because
// the visible answer ran out of token budget, because a vendor returned a different response shape,
// or because the model emitted its scratchpad inline — the mock interviewer stops being a person
// and starts narrating its own instructions in the third person:
//
//   "The user is saying 'Yeah, when I was volunteering...'. According to the instructions, we must
//    ask a single question, not give praise or feedback. We must end on a noun."
//
// Three things go wrong at once. The illusion of someone in the room is gone instantly and does not
// come back. The student never actually receives a question, so the interview stalls. And the
// confidential system prompt is read back verbatim, which is precisely what its own SECURITY
// paragraph forbids — a student who wanted to extract the prompt would only have to wait.
//
// api/groq.js strips this server-side as well. This is the client's own last line, and it is the
// more important of the two, because the speech synthesiser is downstream of here: a leaked
// monologue is far worse spoken aloud in a stranger's voice than it is written on a screen.
//
// WHY A LINE FILTER IS SAFE HERE. These patterns would be dangerous over general prose — plenty of
// legitimate writing contains "we should". They are safe over THIS text because of what an
// interviewer turn is: two to four sentences, spoken, addressed to the student in the second
// person. A real turn never refers to the student in the third person ("the user says"), never
// mentions "the instructions", and never deliberates aloud about what it must do next. Every
// pattern below is a marker of narration ABOUT the turn rather than the turn itself, so dropping
// those lines cannot cost a real sentence — which the assertions in
// scripts/verifyInterviewRealism.mjs check against real interviewer prose on every build.

const THINK_TAGS = /<think>[\s\S]*?<\/think>|<\|?(?:channel|start)\|?>\s*analysis[\s\S]*?(?=<\|?(?:message|channel|end)\|?>|$)|<\/?(?:think|analysis|reasoning)>/gi;

const META_LINE = /\b(?:the (?:user|student|candidate) (?:is |just )?(?:said|says|is saying|wants|mentioned|asked)|according to (?:the|my) instructions?|the instructions? (?:say|state|are)|per the instructions?|we (?:must|should|need to|can|could)\b|i (?:must|should) (?:ask|not|avoid|keep)|so (?:we|i) (?:should|could|can|need)|let'?s (?:ask|think|craft|write)|as an ai\b|system prompt)/i;

/**
 * Strip a model's deliberation out of a reply meant to be spoken.
 *
 * Returns '' when the whole reply was thinking. That is deliberate and the caller must handle it:
 * an empty result becomes a retry or an honest error, which is strictly better than speaking a
 * monologue. Never guess at a question the model did not actually ask.
 */
export function scrubThinking(raw) {
  const withoutTags = String(raw || '').replace(THINK_TAGS, '');

  // Pass one: whole lines. A leaked scratchpad is usually its own paragraph.
  const kept = withoutTags
    .split(/\n+/)
    .filter(line => line.trim() && !META_LINE.test(line))
    .join('\n')
    .trim();
  if (!kept) return '';

  // Pass two: sentences, for the case where deliberation and speech share a paragraph.
  const sentences = kept.match(/[^.!?]+[.!?]*/g) || [kept];
  return sentences.filter(s => !META_LINE.test(s)).join('').trim();
}

/** Whether a reply was entirely deliberation — the signal to retry rather than to display. */
export function isAllThinking(raw) {
  return !!String(raw || '').trim() && !scrubThinking(raw);
}
