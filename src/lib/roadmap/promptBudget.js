// ─────────────────────────────────────────────────────────────────────────────
// Prompt budgeting for roadmap generation — the client half of the fix for
// "it cannot write a roadmap when the context is too big".
//
// ── What actually went wrong ────────────────────────────────────────────────
// The select pass hands the model a catalog shortlist inside its system prompt.
// For a student eligible for a lot — a junior with aid needs, a car, research
// interest and a competitive slate — that shortlist is 48 entries, each
// carrying its dates, eligibility, lead time and a sentence on what it does for
// them. Add the stance, the date rule, the season table and the JSON contract
// and the prompt ran past the server's input cap, which cut it. From the END.
//
// Every failure that followed was a consequence of where the cut landed:
//   · The JSON contract lives at the bottom of the select prompt, so the model
//     was asked to choose from a truncated list and never told what shape to
//     answer in. It answered in prose. The parse failed.
//   · A parse failure is retryable, so the generator retried — with the exact
//     same oversized payload, three more times, each one cut in the same place.
//   · Four failures is a failed pass, and a failed pass is the deterministic
//     slate. The student got "Medabrain could not be reached for part of this
//     build" for a build in which Medabrain was reachable the whole time.
//
// ── The two halves of the fix ───────────────────────────────────────────────
// The server's caps were raised to something related to the model's actual
// context window rather than to a chat turn (see MAX_INPUT_CHARS_BY_PURPOSE in
// api/groq.js). That alone makes today's prompts fit. It does not make them
// *guaranteed* to fit, because a cap that can be exceeded eventually is — a
// student with sixty tracked items and a long personal brief is a real person.
//
// So this module makes the client responsible for fitting, and does it the way
// a cap cannot: BY PRIORITY, not by position. When something has to go, what
// goes is the lowest-scoring catalog entry and the least load-bearing paragraph
// of the portfolio digest — never the last 4,000 characters, whatever those
// happened to be.
//
// ── The ladder ──────────────────────────────────────────────────────────────
// Each pass declares a size, and a failure steps down one rung rather than
// retrying identical. The rungs are real reductions, not cosmetic ones, and
// every rung still produces a genuine roadmap:
//
//   0  full     48 entries, 6 per track, whole portfolio digest
//   1  trimmed  36 entries, 5 per track, digest squeezed
//   2  tight    24 entries, 4 per track, digest condensed to its facts
//   3  minimal  18 entries, 3 per track, digest cut to the profile lines
//
// Rung 3 is still a shortlist of eighteen real, eligible, dated programs — more
// than any roadmap selects from it — so the worst rung of this ladder is a
// better build than the best deterministic fallback. That is the point: the
// fallback should be reachable only when nobody answered, never because a
// prompt was the wrong size.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The server's caps, mirrored.
 *
 * scripts/verifyRoadmap.mjs asserts these match MAX_INPUT_CHARS_BY_PURPOSE and
 * MAX_SYSTEM_CHARS_BY_PURPOSE in api/groq.js, because the entire value of
 * budgeting on the client is that it knows the number the server will enforce.
 * A drift here is silent truncation again, with more code in the way.
 */
export const SERVER_CAPS = { system: 60000, user: 90000 };

/**
 * What we actually aim for, per prompt part.
 *
 * Deliberately under the server caps. The margin is not superstition: the
 * generator composes a system prompt from several pieces and measures the
 * assembled string, and a budget set exactly at the cap has no room for the
 * rounding, the joins and the occasional long catalog `why` line that sit
 * between "measured" and "sent".
 */
export const TARGET = { system: 52000, user: 80000 };

/** The rungs, coarsest field first. Index = rung. */
export const RUNGS = [
  { name: 'full', total: 48, perTrack: 6, digest: 1.0 },
  { name: 'trimmed', total: 36, perTrack: 5, digest: 0.7 },
  { name: 'tight', total: 24, perTrack: 4, digest: 0.45 },
  { name: 'minimal', total: 18, perTrack: 3, digest: 0.25 },
];

export const rung = (i) => RUNGS[Math.max(0, Math.min(RUNGS.length - 1, i | 0))];
export const LAST_RUNG = RUNGS.length - 1;

/**
 * Squeeze prose without cutting its tail.
 *
 * Runs cheap, meaning-preserving reductions first (collapsed blank lines,
 * collapsed runs of spaces), and only drops whole lines if it is still over —
 * shortest lines first, because in the portfolio digest the short lines are the
 * counts and the long ones are the student's own sentences about what they did,
 * which is the half a model can actually reason from.
 *
 * Never returns a string ending mid-word: if it has to stop early it stops at a
 * line boundary and says so, which is a truthful shape for a model to read.
 */
export function squeeze(text, maxChars) {
  if (!text) return '';
  let out = String(text).replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  if (out.length <= maxChars) return out;

  const lines = out.split('\n');
  // Rank droppable lines by length ascending, keeping headings (lines ending in
  // ':') and the first line, which is nearly always the section header the rest
  // of the block only makes sense underneath.
  const droppable = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line, i }) => i > 0 && line.trim() && !line.trim().endsWith(':'))
    .sort((a, b) => a.line.length - b.line.length);

  const dropped = new Set();
  let size = out.length;
  for (const { line, i } of droppable) {
    if (size <= maxChars) break;
    dropped.add(i);
    size -= line.length + 1;
  }
  out = lines.filter((_, i) => !dropped.has(i)).join('\n');
  if (out.length <= maxChars) return out;

  // Still over — a single enormous unbroken block. Cut at the last line
  // boundary that fits and say plainly that it was cut, so the model treats it
  // as a partial record rather than a complete one.
  const note = '\n[record continues — trimmed to fit]';
  const cut = out.slice(0, Math.max(0, maxChars - note.length));
  return cut.slice(0, cut.lastIndexOf('\n') + 1 || cut.length) + note;
}

/**
 * Measure a composed pass and report whether it fits.
 *
 * Returns { fits, system, user, over } so a caller can log the real numbers.
 * Kept separate from the shrinking so the generator can record what it sent at
 * each rung — a build that needed rung 2 is a fact worth having in the trace
 * when someone asks why a roadmap looked thin.
 */
export function measure({ system = '', user = '' } = {}) {
  const s = system.length;
  const u = user.length;
  return {
    system: s,
    user: u,
    fits: s <= TARGET.system && u <= TARGET.user,
    over: Math.max(0, s - TARGET.system) + Math.max(0, u - TARGET.user),
  };
}

/**
 * The rung a payload of this size should have started at.
 *
 * Used to skip rungs that provably cannot fit rather than walking down one at a
 * time and spending a real API call on each. A student whose full payload is
 * twice the budget does not need to discover that four times.
 */
export function rungForOverage({ system = 0, user = 0 } = {}) {
  const ratio = Math.max(system / TARGET.system, user / TARGET.user);
  if (ratio <= 1) return 0;
  if (ratio <= 1.3) return 1;
  if (ratio <= 1.8) return 2;
  return LAST_RUNG;
}
