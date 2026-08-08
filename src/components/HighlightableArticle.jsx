// Renders a lesson's article sections with smooth, cross-device text highlighting — select a
// passage (mouse-drag on desktop, long-press-and-drag on mobile) and a small floating toolbar
// appears over the selection letting the student pick a highlight color or remove an existing
// one. Highlights are stored as {sectionIdx, start, end} character offsets into that section's
// plain-text body (see lib/db.js lessonHighlights), not DOM ranges/HTML, so they survive
// re-renders and sync cleanly across devices.
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { C, glass2 } from '../lib/theme';

const COLORS = {
  yellow: { bg: 'rgba(250,204,21,0.38)', dot: '#facc15' },
  green:  { bg: 'rgba(74,222,128,0.32)', dot: '#4ade80' },
  blue:   { bg: 'rgba(96,165,250,0.32)', dot: '#60a5fa' },
  pink:   { bg: 'rgba(244,114,182,0.32)', dot: '#f472b6' },
};

// Walks a container's text nodes in document order and returns the character offset of a given
// (node, nodeOffset) point relative to the container's full plain-text content — this is what
// lets us persist a selection as portable {start,end} offsets instead of a DOM Range that would
// break the moment the section re-renders with different highlight spans.
function textOffsetWithin(container, node, nodeOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current;
  while ((current = walker.nextNode())) {
    if (current === node) return offset + nodeOffset;
    offset += current.textContent.length;
  }
  return offset;
}

function buildSegments(text, highlights) {
  // Non-overlapping, sorted by start — if a student somehow creates overlapping ranges, the
  // earliest-created one wins for the overlapped span rather than corrupting the render.
  const sorted = [...highlights].sort((a, b) => a.start - b.start || a.createdAt - b.createdAt);
  const kept = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start < cursor) continue;
    kept.push(h);
    cursor = h.end;
  }
  const segments = [];
  let pos = 0;
  for (const h of kept) {
    if (h.start > pos) segments.push({ text: text.slice(pos, h.start), highlight: null });
    segments.push({ text: text.slice(h.start, h.end), highlight: h });
    pos = h.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlight: null });
  return segments;
}

export default function HighlightableArticle({ sections, highlights = [], onAdd, onRemove, accent = C.blue, m = false, activeSectionIdx = null }) {
  const containerRef = useRef(null);
  const [toolbar, setToolbar] = useState(null); // { x, y, sectionIdx, start, end, existingId }
  // Set while a lesson is being read aloud (LessonAudioPlayer): the spoken block is tinted and
  // scrolled into view so a student can follow along with their eyes, drop out to listen, and
  // pick the thread back up without hunting for where the voice got to.
  const sectionRefs = useRef({});

  useEffect(() => {
    if (activeSectionIdx == null) return;
    sectionRefs.current[activeSectionIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSectionIdx]);

  const byLine = {};
  for (const h of highlights) (byLine[h.sectionIdx] ||= []).push(h);

  const clearToolbar = useCallback(() => setToolbar(null), []);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) return;
      // Find which section paragraph the selection lives inside.
      let node = range.commonAncestorContainer;
      let sectionEl = node.nodeType === 1 ? node : node.parentElement;
      while (sectionEl && !sectionEl.dataset?.sectionIdx) sectionEl = sectionEl.parentElement;
      if (!sectionEl) return;
      const sectionIdx = Number(sectionEl.dataset.sectionIdx);
      const start = textOffsetWithin(sectionEl, range.startContainer, range.startOffset);
      const end = textOffsetWithin(sectionEl, range.endContainer, range.endOffset);
      if (end <= start) return;
      const rect = range.getBoundingClientRect();
      const hostRect = container.getBoundingClientRect();
      setToolbar({
        x: rect.left + rect.width / 2 - hostRect.left,
        y: rect.top - hostRect.top,
        sectionIdx, start: Math.min(start, end), end: Math.max(start, end),
      });
    }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  function chooseColor(color) {
    if (!toolbar) return;
    onAdd({ sectionIdx: toolbar.sectionIdx, start: toolbar.start, end: toolbar.end, color });
    window.getSelection()?.removeAllRanges();
    clearToolbar();
  }

  function clickExistingHighlight(e, h) {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    const hostRect = containerRef.current.getBoundingClientRect();
    setToolbar({ x: rect.left + rect.width / 2 - hostRect.left, y: rect.top - hostRect.top, existingId: h.id });
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {sections.map((sec, i) => {
        const segs = buildSegments(sec.body, byLine[i] || []);
        const speaking = activeSectionIdx === i;
        return (
          <div key={i} ref={(el) => { sectionRefs.current[i] = el; }}
            style={{
              marginBottom: 22,
              // Deliberately a left rule + faint wash rather than a background block: it has to be
              // distinguishable from a student's own text highlights, not compete with them.
              borderLeft: `2px solid ${speaking ? accent : 'transparent'}`,
              paddingLeft: speaking ? 12 : 0,
              marginLeft: speaking ? -14 : 0,
              background: speaking ? `${accent}0d` : 'transparent',
              borderRadius: speaking ? 8 : 0,
              transition: 'background .35s, padding .2s, border-color .2s',
            }}>
            <h3 style={{ fontSize: m ? 15 : 17, fontWeight: 700, color: speaking ? accent : C.t1, fontFamily: C.FD, marginBottom: 8, transition: 'color .25s' }}>{sec.heading}</h3>
            <p data-section-idx={i} style={{ fontSize: m ? 13.5 : 14.5, color: C.t2, lineHeight: 1.75, margin: 0, userSelect: 'text', WebkitUserSelect: 'text' }}>
              {segs.map((s, j) => s.highlight ? (
                <mark key={j} onClick={(e) => clickExistingHighlight(e, s.highlight)}
                  style={{ background: COLORS[s.highlight.color]?.bg || COLORS.yellow.bg, color: 'inherit', borderRadius: 3, padding: '0 1px', cursor: 'pointer' }}>
                  {s.text}
                </mark>
              ) : <React.Fragment key={j}>{s.text}</React.Fragment>)}
            </p>
          </div>
        );
      })}

      <AnimatePresence>
        {toolbar && (
          <>
            <div onClick={clearToolbar} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', left: toolbar.x, top: toolbar.y, transform: 'translate(-50%, -100%) translateY(-8px)',
                zIndex: 201, ...glass2({ padding: 7 }), display: 'flex', gap: 6, alignItems: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
              }}
            >
              {toolbar.existingId ? (
                <button onClick={() => { onRemove(toolbar.existingId); clearToolbar(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: C.rose, fontSize: 11.5, padding: '4px 6px' }}>
                  <Trash2 size={13} />Remove
                </button>
              ) : Object.entries(COLORS).map(([key, c]) => (
                <button key={key} onClick={() => chooseColor(key)} title={`Highlight ${key}`}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.s0}`, background: c.dot, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
