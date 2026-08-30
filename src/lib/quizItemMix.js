// ─────────────────────────────────────────────────────────────────────────────
// What KIND of thinking does a quiz item ask for?
//
// Recall items ("What is the NCLEX?") are cheap to write, which is why banks
// fill up with them — and they are exactly the items a student learns to game.
// Reread the article, hold five nouns in your head for ninety seconds, pass.
// Nothing about that measures whether the student can use the material, and a
// "verified" badge earned that way is a badge for short-term memory.
//
// Three kinds are worth more than recall, and this module exists so the draw
// can prefer them:
//
//   data      — interpret a number, range, trend, or reading. "A pulse ox reads
//               91% on room air. What does that number mean here?"
//   scenario  — a short situation with a person in it, where the answer depends
//               on the situation rather than on a definition.
//   nextStep  — best-next-step reasoning. Several options are defensible; one is
//               the right thing to do NEXT. This is the closest a high-school
//               item gets to how clinical reasoning actually feels.
//
// Existing items are classified heuristically rather than re-tagged by hand
// across a bank of thousands, and new items carry an explicit `kind` (see
// appliedItems.js), which always wins over the heuristic.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_KINDS = ['data', 'scenario', 'nextStep', 'recall'];

export const KIND_LABELS = {
  data: 'Data interpretation',
  scenario: 'Scenario',
  nextStep: 'Best next step',
  recall: 'Recall',
};

// "What's the most realistic first step", "what should you do next", "which is
// the most appropriate response" — the phrasings that mark a next-step item.
const NEXT_STEP_RE = /\b(what|which)\b[^?]{0,80}\b(should|would|do)\b[^?]{0,60}\b(next|first|now|first step|do about|respond|handle)\b|\bmost (appropriate|realistic|reasonable|useful|effective) (next |first )?(step|move|action|thing|response|way)\b|\bbest next\b|\byour next move\b/i;

// A person, a moment, a situation. Second person or a named actor plus a verb
// in a specific instant, rather than a definitional "X is…".
const SCENARIO_RE = /\b(a|an|your) (patient|student|classmate|volunteer|nurse|doctor|physician|pharmacist|therapist|teammate|parent|family|child|coach|mentor|shadow|visitor)\b|\byou(?:'re| are| have|'ve)\b[^?]{0,80}\b(shadowing|volunteering|observing|working|asked|told|handed|watching|sitting)\b|\bduring (a|your|the) (shift|shadowing|rotation|session|visit|appointment|day)\b/i;

// Numbers with units, ranges, percentages, readings, chart/table/graph talk.
// NOTE — no trailing \b after the unit group. `%` and `°` are non-word
// characters, so a \b between them and a following space never matches, which
// silently made every percentage-based item classify as recall.
const DATA_RE = /\b\d+(\.\d+)?\s?(%|mg|mcg|ml|mmhg|bpm|°f|°c|degrees|beats|breaths|hours|years|mmol|mEq|g\/dL)|\breference range\b|\b\d+\s?(to|–|-)\s?\d+\b|\b(graph|chart|table|dataset|trend line|the data (show|shows|suggest)|these (results|values|numbers)|the (reading|value|result) (is|was|shows))\b/i;

/**
 * Classify one quiz item. An explicit `kind` on the item always wins.
 * @param {object} q  { q, ch, ans, exp, kind? }
 * @returns {'data'|'scenario'|'nextStep'|'recall'}
 */
export function classifyItemKind(q) {
  if (!q) return 'recall';
  if (ITEM_KINDS.includes(q.kind)) return q.kind;
  const stem = String(q.q || '');
  const choices = (q.ch || []).join(' ');
  const all = `${stem} ${choices}`;

  // Order matters: a next-step item set inside a scenario is a next-step item —
  // that's the harder cognitive demand and the one worth counting.
  if (NEXT_STEP_RE.test(stem)) return 'nextStep';
  if (DATA_RE.test(all)) return 'data';
  if (SCENARIO_RE.test(all)) return 'scenario';
  return 'recall';
}

/** True for the three kinds that are not plain recall. */
export function isApplied(q) {
  return classifyItemKind(q) !== 'recall';
}

/**
 * The share of a sitting that should be applied rather than recall. Not a hard
 * quota: the draw prefers applied items within each stratum (see
 * quizPersonalization.drawQuestions), which gets as close to this as the bank
 * allows without ever serving the same three applied items every attempt. The
 * shortfall stays visible in `mixOf()` rather than being silently accepted.
 */
export const TARGET_APPLIED_SHARE = 0.6;

/** Count the kinds present in a set of items. */
export function mixOf(items) {
  const counts = { data: 0, scenario: 0, nextStep: 0, recall: 0 };
  (items || []).forEach(q => { counts[classifyItemKind(q)]++; });
  const total = items?.length || 0;
  return {
    counts,
    total,
    applied: total - counts.recall,
    appliedShare: total ? (total - counts.recall) / total : 0,
  };
}
