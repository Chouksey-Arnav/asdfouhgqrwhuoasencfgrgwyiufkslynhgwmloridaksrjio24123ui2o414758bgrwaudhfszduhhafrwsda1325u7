import React, { useMemo, useState } from 'react';
import { History, GitCompare, RotateCcw } from 'lucide-react';
import { C, glass2, btnSm, R, CC, pill, tint, inp } from '../../lib/theme';
import Disclosure, { HelpNote } from '../ui/Disclosure';
import { buildVersionArc, diffWords } from '../../lib/essayVersions';

// ─────────────────────────────────────────────────────────────────────────────
// Version history you can read.
//
// The workspace already kept every saved draft; what it rendered was a list of
// timestamps, which proves the drafts exist and says nothing about what
// happened between them. Two people need the answer to that: the student, who
// cannot otherwise tell whether their second pass fixed anything or just moved
// sentences around, and whoever gives them feedback, who is currently reading
// one frozen paragraph with no idea whether it is the first version or the
// ninth.
//
// So the list leads with what each revision DID — expanded, cut down,
// rewritten, small edits — and any two versions can be put side by side as a
// word-level diff. Restore is offered because a student who cannot get an
// earlier draft back is a student who will not risk a bold rewrite, and the
// bold rewrite is usually the one that works.
//
// The color language is deliberately not red/green. Removing words from an
// application essay is normally the good move, and marking every cut in red
// teaches exactly the wrong instinct.
// ─────────────────────────────────────────────────────────────────────────────

const CHANGE_COLOR = {
  written: C.blue, rewritten: C.violet, cut: C.teal, grew: C.amber,
  revised: C.sky, tinkered: C.t3, none: C.t3,
};

export default function EssayVersionHistory({
  versions = [], currentContent = '', accent = C.violet, isMobile = false, onRestore = null,
}) {
  const [compare, setCompare] = useState(null); // { fromId, toId } — ids, or 'current'
  const arc = useMemo(() => buildVersionArc(versions, currentContent), [versions, currentContent]);
  if (!versions.length) return null;

  const newestFirst = [...arc].reverse();
  const byId = (id) => (id === 'current'
    ? { content: currentContent, created_at: null, label: 'Your current draft' }
    : versions.find(v => v.id === id));

  const from = compare ? byId(compare.fromId) : null;
  const to = compare ? byId(compare.toId) : null;
  const parts = from && to ? diffWords(from.content, to.content) : null;

  return (
    <Disclosure id="essays-versions" icon={History} color={accent} m={isMobile}
      title={`How this draft has changed (${versions.length} saved version${versions.length === 1 ? '' : 's'})`}
      sub="Every copy you saved, what each revision actually did, and any two of them side by side.">
      <div style={CC({ gap: 8 })}>
        {newestFirst.map(step => {
          const v = step.version;
          const col = CHANGE_COLOR[step.change.id] || C.t3;
          const id = step.unsaved ? 'current' : v.id;
          const selected = compare && (compare.fromId === id || compare.toId === id);
          return (
            <div key={id} style={{
              ...glass2({ padding: '12px 12px' }),
              borderLeft: `3px solid ${col}`,
              border: selected ? `1px solid ${tint(accent, 0.42)}` : undefined,
            }}>
              <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                <span style={{ fontSize: 11, fontFamily: C.FM, color: C.t3 }}>v{step.index}</span>
                <span style={pill(tint(col, 0.14), col, { fontSize: 9 })}>{step.change.label}</span>
                {step.unsaved
                  ? <span style={{ fontSize: 11, color: C.amberL }}>unsaved — in the editor right now</span>
                  : <span style={{ fontSize: 11, color: C.t2 }}>{new Date(v.created_at).toLocaleString()}</span>}
                <span style={{ flex: 1 }} />
                {!step.unsaved && v.word_count != null && (
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>{v.word_count} words</span>
                )}
              </div>

              {!step.unsaved && v.label && (
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginTop: 4 }}>{v.label}</div>
              )}
              {!step.unsaved && v.note && (
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{v.note}</div>
              )}

              <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>{step.change.detail}</div>

              <div style={R({ gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
                <button style={btnSm(C.s3, { color: C.t3, fontSize: 10.5, padding: '4px 8px' })}
                  onClick={() => setCompare(c => {
                    if (!c || c.toId === id) return { fromId: id, toId: 'current' };
                    return { fromId: id, toId: c.toId };
                  })}>
                  <GitCompare size={10} />Compare with current
                </button>
                {!step.unsaved && onRestore && (
                  <button style={btnSm(C.s3, { color: C.t3, fontSize: 10.5, padding: '4px 8px' })}
                    onClick={() => onRestore(v)}>
                    <RotateCcw size={10} />Bring this back
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {parts && (
          <div style={{ ...glass2({ padding: 12 }), border: `1px solid ${tint(accent, 0.28)}` }}>
            <div style={R({ gap: 8, marginBottom: 8, flexWrap: 'wrap' })}>
              <GitCompare size={12} color={accent} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>
                {from.created_at ? new Date(from.created_at).toLocaleDateString() : 'Current draft'}
                {' → '}
                {to.created_at ? new Date(to.created_at).toLocaleDateString() : 'your current draft'}
              </span>
              <span style={{ flex: 1 }} />
              <button style={btnSm(C.s3, { color: C.t3, fontSize: 10.5, padding: '4px 8px' })}
                onClick={() => setCompare(null)}>Close</button>
            </div>
            <div style={{ ...inp({ minHeight: 0, maxHeight: 420, overflowY: 'auto', cursor: 'text' }), lineHeight: 1.55, fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {parts.map((p, i) => (
                <span key={i} style={
                  p.type === 'added' ? { background: tint(C.green, 0.16), color: C.t1, borderRadius: 4 }
                  : p.type === 'removed' ? { background: tint(C.t3, 0.14), color: C.t3, textDecoration: 'line-through' }
                  : { color: C.t2 }
                }>{p.text}</span>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <HelpNote>Highlighted text is new in the later version; struck-through text was taken out. Cutting is usually the move that makes an essay better, which is why nothing here is marked in red.</HelpNote>
            </div>
          </div>
        )}

        {!parts && (
          <HelpNote>Tap “Compare with current” on any version to see, word by word, what changed between it and what you have now.</HelpNote>
        )}
      </div>
    </Disclosure>
  );
}

/** The little "what should this version be called" form, shown next to Save. */
export function VersionLabelFields({ label, note, onLabel, onNote }) {
  return (
    <div style={R({ gap: 8, flexWrap: 'wrap', marginTop: 8 })}>
      <input style={inp({ flex: 1, minWidth: 150, fontSize: 12 })} value={label} onChange={e => onLabel(e.target.value)}
        placeholder="Name this version (optional) — e.g. “after Ms. Herrera read it”" />
      <input style={inp({ flex: 1, minWidth: 150, fontSize: 12 })} value={note} onChange={e => onNote(e.target.value)}
        placeholder="What changed? (optional)" />
    </div>
  );
}
