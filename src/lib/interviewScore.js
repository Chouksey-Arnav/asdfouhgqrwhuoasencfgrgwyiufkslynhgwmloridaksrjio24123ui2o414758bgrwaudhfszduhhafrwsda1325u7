// Shared score-parsing for interview practice feedback. Both feedback shapes end with a
// predictable scored line by prompt design — Standard/MMI/CASPer (InterviewPrepPanel.jsx) end
// with "Score: X/10", the Live Voice debrief (LiveVoiceInterview.jsx) ends with "Overall: X out
// of 10" — so one regex covers both instead of duplicating slightly-different parsing per file.
// Sessions are stored with `score: null` when nothing parseable comes back (a malformed AI reply
// shouldn't crash session logging), and the History panel treats null as "not yet scored" rather
// than 0.
export function parseInterviewScore(text) {
  if (!text) return null;
  const m = String(text).match(/(?:score|overall)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*10/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null;
}
