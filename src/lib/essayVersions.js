// ─────────────────────────────────────────────────────────────────────────────
// Reading version history, rather than merely keeping it.
//
// The workspace already saved every draft. What it showed was a list of
// timestamps and word counts, which is a filing cabinet: it proves the drafts
// exist and tells you nothing about what happened between them. The two people
// who need this most are the student ("did my second draft actually fix
// anything, or did I just move sentences around?") and whoever gives them
// feedback, who otherwise reads one frozen paragraph with no idea whether it is
// the first thing they wrote or the ninth.
//
// So: a word-level diff between any two saved versions, plus a compact
// characterisation of the change — grew, cut, rewritten, tinkered — because the
// shape of an edit is usually the fact worth knowing before reading the words.
//
// Word-level rather than character-level on purpose: prose diffs read as
// nonsense at character granularity, and paragraph granularity marks an entire
// paragraph changed because one adjective moved. Pure functions, no React.
// ─────────────────────────────────────────────────────────────────────────────

/** Tokens are words plus their trailing whitespace, so a rebuild is lossless. */
function tokenize(text) {
  return String(text || '').match(/\S+\s*/g) || [];
}

const bare = (t) => t.trim();

/**
 * Classic LCS table. Version histories are a handful of drafts of at most a few
 * thousand words, so an O(n·m) table is comfortably fine and far easier to trust
 * than a heuristic diff — a wrong diff here quietly misrepresents a student's
 * own work to the person grading their progress.
 *
 * Guarded at 4000 tokens per side (roughly a 4,000-word draft); past that the
 * table is large enough to be worth avoiding and the summary alone is returned.
 */
const MAX_TOKENS = 4000;

export function diffWords(before, after) {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return null;

  const n = a.length, m = b.length;
  // Rolling two-row table for the lengths, then a backtrack over a full table is
  // needed for the path — so keep the full table but store small ints.
  const table = new Uint32Array((n + 1) * (m + 1));
  const at = (i, j) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[at(i, j)] = bare(a[i]) === bare(b[j])
        ? table[at(i + 1, j + 1)] + 1
        : Math.max(table[at(i + 1, j)], table[at(i, j + 1)]);
    }
  }

  const parts = [];
  const push = (type, text) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (bare(a[i]) === bare(b[j])) { push('same', b[j]); i++; j++; }
    else if (table[at(i + 1, j)] >= table[at(i, j + 1)]) { push('removed', a[i]); i++; }
    else { push('added', b[j]); j++; }
  }
  while (i < n) { push('removed', a[i]); i++; }
  while (j < m) { push('added', b[j]); j++; }
  return parts;
}

/**
 * What kind of edit this was, in one word plus one sentence.
 *
 * The thresholds are deliberately coarse. The useful distinction is not "12%
 * changed" — it is whether the student added material, took material out, or
 * replaced material with different material, because those are three different
 * kinds of revision and only the third one usually means the thinking moved.
 */
export function characterizeChange(before, after) {
  const a = tokenize(before).map(bare);
  const b = tokenize(after).map(bare);
  if (!a.length && !b.length) return { id: 'none', label: 'No change', detail: 'Both versions are empty.' };
  if (!a.length) return { id: 'written', label: 'First draft', detail: `${b.length} words written.` };

  const parts = diffWords(before, after);
  if (!parts) {
    const delta = b.length - a.length;
    return {
      id: delta > 0 ? 'grew' : delta < 0 ? 'cut' : 'edited',
      label: delta > 0 ? 'Grew' : delta < 0 ? 'Cut' : 'Edited',
      detail: `${Math.abs(delta)} word${Math.abs(delta) === 1 ? '' : 's'} ${delta >= 0 ? 'added' : 'removed'}. Too long to show word by word.`,
      added: null, removed: null,
    };
  }
  const added = parts.filter(p => p.type === 'added').reduce((n, p) => n + tokenize(p.text).length, 0);
  const removed = parts.filter(p => p.type === 'removed').reduce((n, p) => n + tokenize(p.text).length, 0);
  const churn = (added + removed) / Math.max(1, a.length);

  let id, label, detail;
  if (added === 0 && removed === 0) { id = 'none'; label = 'Identical'; detail = 'Nothing changed between these two.'; }
  else if (churn >= 0.6) { id = 'rewritten'; label = 'Rewritten'; detail = `${added} words in, ${removed} out — most of this is new material, not a polish.`; }
  else if (removed > added * 2) { id = 'cut'; label = 'Cut down'; detail = `${removed} words removed against ${added} added. Cutting is usually where an essay gets better.`; }
  else if (added > removed * 2) { id = 'grew'; label = 'Expanded'; detail = `${added} words added against ${removed} removed.`; }
  else if (churn < 0.05) { id = 'tinkered'; label = 'Small edits'; detail = `${added} in, ${removed} out — wording, not substance.`; }
  else { id = 'revised'; label = 'Revised'; detail = `${added} words in, ${removed} out.`; }

  return { id, label, detail, added, removed };
}

/**
 * The whole history as a readable arc: each version paired with what changed
 * since the one before it, oldest first — which is the order a story goes in,
 * even though the list is normally rendered newest first.
 */
export function buildVersionArc(versions = [], currentContent = null) {
  const ordered = [...versions].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const arc = ordered.map((v, i) => ({
    version: v,
    index: i + 1,
    change: characterizeChange(i === 0 ? '' : ordered[i - 1].content, v.content),
  }));
  if (currentContent != null && ordered.length) {
    const latest = ordered[ordered.length - 1];
    if (String(currentContent).trim() !== String(latest.content || '').trim()) {
      arc.push({
        version: null, index: ordered.length + 1, unsaved: true,
        change: characterizeChange(latest.content, currentContent),
      });
    }
  }
  return arc;
}

/**
 * A compact plain-text rendering of the arc for Medabrain, so feedback can be
 * about how the draft moved rather than about one frozen snapshot. Deliberately
 * carries no draft text — only the shape of each revision — so it stays small
 * enough to sit alongside the full current draft in the same request.
 */
export function summarizeArcForPrompt(arc = []) {
  if (arc.length < 2) return null;
  const lines = arc.map(step => {
    const when = step.unsaved ? 'unsaved current draft' : new Date(step.version.created_at).toLocaleDateString();
    const words = step.unsaved ? null : step.version.word_count;
    return `- v${step.index} (${when}${words != null ? `, ${words} words` : ''}): ${step.change.label} — ${step.change.detail}`;
  });
  return `How this draft has evolved across ${arc.length} saved versions:\n${lines.join('\n')}`;
}
