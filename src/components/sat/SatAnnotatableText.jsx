import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Highlighter, X } from 'lucide-react';
import { C, tint } from '../../lib/theme';
import Portal from '../ui/Portal';

// ─────────────────────────────────────────────────────────────────────────────
// Passage highlighting, the way Bluebook does it.
//
// WHY THIS IS WORTH BUILDING RATHER THAN LISTING AS "NOT SIMULATED"
// Annotation is not a convenience feature on the digital SAT, it is a strategy.
// Strong Reading & Writing students highlight the claim before they read the
// choices, and highlight the two words a Boundaries item actually turns on.
// That habit has to be built somewhere, and a practice tool that cannot
// highlight teaches students to read without the tool they will have on test
// day — which is exactly the kind of gap that makes practice feel unlike the
// real thing.
//
// ── How the offsets work ────────────────────────────────────────────────────
// Highlights are stored as {start, end} character offsets into the RAW string,
// never as DOM ranges. DOM ranges do not survive a re-render, a resize, or the
// two-pane layout switch; character offsets survive all three and serialise
// into the attempt row for free.
//
// Mapping a browser selection back to those offsets works because every span
// this component renders carries a data-start attribute, so the offset of any
// text node is (its span's data-start) + (the offset within the span).
//
// ── Why this component and not MathText ─────────────────────────────────────
// MathText renders KaTeX, which inserts DOM nodes that have no correspondence
// to characters in the source string — offsets computed across them are wrong.
// So the player uses this component only for stimuli containing no math
// delimiters, which is every Reading & Writing passage and no Math one. Maths
// stimuli keep MathText and lose highlighting, which is the right trade: nobody
// highlights an equation, and a wrong offset would corrupt the annotation.
// ─────────────────────────────────────────────────────────────────────────────

// Bluebook offers a small fixed palette. More colors is not more useful — the
// point of a second color is to separate two KINDS of mark (the claim versus
// the trap), and past three nobody remembers their own scheme.
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'rgba(250, 204, 21, 0.32)', dot: '#facc15' },
  { id: 'blue', label: 'Blue', bg: 'rgba(56, 189, 248, 0.30)', dot: '#38bdf8' },
  { id: 'pink', label: 'Pink', bg: 'rgba(244, 114, 182, 0.30)', dot: '#f472b6' },
];

const colorOf = (id) => HIGHLIGHT_COLORS.find(c => c.id === id) || HIGHLIGHT_COLORS[0];

/** True when the string contains delimiters MathText would render. */
export function hasMathMarkup(text = '') {
  return /\$|\\\(|\\\[|\\frac|\\sqrt/.test(text);
}

/**
 * Merge a new range into an existing set, coalescing anything that overlaps or
 * abuts it and shares its color. Without this, highlighting a sentence in
 * three passes leaves three adjacent ranges that then have to be removed one at
 * a time — which is precisely the fiddliness that makes people stop using the
 * tool.
 */
export function addRange(ranges, next) {
  const out = [];
  let merged = { ...next };
  for (const r of ranges) {
    const overlaps = r.start <= merged.end && merged.start <= r.end;
    if (overlaps && r.color === merged.color) {
      merged = { color: merged.color, start: Math.min(r.start, merged.start), end: Math.max(r.end, merged.end) };
    } else if (overlaps) {
      // Different color: the new highlight wins on the overlap, and whatever
      // of the old range sticks out either side survives.
      if (r.start < merged.start) out.push({ ...r, end: merged.start });
      if (r.end > merged.end) out.push({ ...r, start: merged.end });
    } else {
      out.push(r);
    }
  }
  out.push(merged);
  return out.filter(r => r.end > r.start).sort((a, b) => a.start - b.start);
}

/** Remove whatever range covers `offset`. */
export function removeRangeAt(ranges, offset) {
  return ranges.filter(r => !(offset >= r.start && offset < r.end));
}

/**
 * Cut the raw text into rendered segments, one per highlight boundary.
 * Ranges are assumed sorted and non-overlapping (addRange guarantees both).
 */
function segment(text, ranges) {
  const out = [];
  let cursor = 0;
  for (const r of ranges) {
    const start = Math.max(cursor, r.start);
    const end = Math.min(text.length, r.end);
    if (start > cursor) out.push({ start: cursor, text: text.slice(cursor, start), color: null });
    if (end > start) out.push({ start, text: text.slice(start, end), color: r.color });
    cursor = Math.max(cursor, end);
  }
  if (cursor < text.length) out.push({ start: cursor, text: text.slice(cursor), color: null });
  return out;
}

export default function SatAnnotatableText({
  text = '',
  highlights = [],
  onChange,
  style = {},
  disabled = false,
}) {
  const hostRef = useRef(null);
  const [menu, setMenu] = useState(null); // {x, y, start, end} or {x, y, removeAt}

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segments = segment(text, sorted);

  /** Character offset of a DOM node+offset pair within the raw string. */
  const offsetOf = useCallback((node, offsetInNode) => {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== hostRef.current && el.dataset?.start === undefined) el = el.parentElement;
    if (!el || el.dataset?.start === undefined) return null;
    return Number(el.dataset.start) + offsetInNode;
  }, []);

  const handleSelection = useCallback(() => {
    if (disabled) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setMenu(null); return; }
    const host = hostRef.current;
    if (!host || !host.contains(sel.anchorNode) || !host.contains(sel.focusNode)) return;

    const a = offsetOf(sel.anchorNode, sel.anchorOffset);
    const b = offsetOf(sel.focusNode, sel.focusOffset);
    if (a == null || b == null || a === b) { setMenu(null); return; }

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setMenu({
      x: rect.left + rect.width / 2,
      y: rect.top,
      start: Math.min(a, b),
      end: Math.max(a, b),
    });
  }, [disabled, offsetOf]);

  // Close the menu on anything that invalidates its anchor position.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const apply = (colorId) => {
    if (!menu || menu.start == null) return;
    onChange?.(addRange(sorted, { start: menu.start, end: menu.end, color: colorId }));
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  };

  const clearAt = (offset) => {
    onChange?.(removeRangeAt(sorted, offset));
    setMenu(null);
  };

  return (
    <>
      <div
        ref={hostRef}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        style={{ ...style, cursor: disabled ? 'default' : 'text' }}
      >
        {segments.map((s, i) => (
          <span
            key={`${s.start}-${i}`}
            data-start={s.start}
            onClick={s.color && !disabled ? (e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenu({ x: rect.left + rect.width / 2, y: rect.top, removeAt: s.start });
            } : undefined}
            style={s.color ? {
              background: colorOf(s.color).bg,
              borderRadius: 4,
              padding: '4px 0px',
              cursor: disabled ? 'default' : 'pointer',
            } : undefined}
          >
            {s.text}
          </span>
        ))}
      </div>

      {menu && (
        <Portal>
          <div
            role="menu"
            aria-label="Highlight options"
            style={{
              position: 'fixed',
              left: Math.max(8, Math.min(window.innerWidth - 8, menu.x)),
              top: Math.max(8, menu.y - 48),
              transform: 'translateX(-50%)',
              zIndex: 4000,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              borderRadius: 8,
              background: C.surf2,
              border: `1px solid ${C.b2}`,
              boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            }}
            onMouseDown={(e) => e.preventDefault()} // keep the selection alive
          >
            {menu.removeAt != null ? (
              <button
                onClick={() => clearAt(menu.removeAt)}
                style={menuBtn()}
                title="Remove highlight"
              >
                <X size={12} color={C.t2} />
                <span style={{ fontSize: 11.5, color: C.t2 }}>Remove</span>
              </button>
            ) : (
              <>
                <Highlighter size={12} color={C.t3} style={{ marginLeft: 4, marginRight: 4 }} />
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => apply(c.id)}
                    title={`${c.label} highlight`}
                    aria-label={`${c.label} highlight`}
                    style={{
                      width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                      background: c.bg, border: `1px solid ${tint(c.dot, 0.5)}`,
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}

const menuBtn = () => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px',
  borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
  fontFamily: C.FB,
});
