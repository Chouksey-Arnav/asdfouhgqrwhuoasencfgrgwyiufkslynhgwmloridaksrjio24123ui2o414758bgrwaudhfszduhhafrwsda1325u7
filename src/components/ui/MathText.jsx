import React from 'react';
import katex from 'katex';

// KaTeX helpers, lifted out so the SAT panels can render formulas without
// importing App.jsx (which pulls in the whole 480 KB monolith).
//
// The stylesheet is imported once, globally, by App.jsx — not here — so that a
// lazy-loaded panel cannot end up shipping a second copy of it.

/** A single LaTeX expression. Never throws: bad input renders as its source. */
export function Tex({ tex, display = false, style }) {
  let html;
  try {
    html = katex.renderToString(String(tex), { displayMode: display, throwOnError: false });
  } catch {
    return <span style={{ fontFamily: 'monospace', ...style }}>{tex}</span>;
  }
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Mixed prose and math, with `$inline$` / `$$display$$` delimiters — the same
 * convention App.jsx's MathText uses, so content can move between them.
 */
export default function MathText({ text, style }) {
  if (!text) return null;
  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (p.startsWith('$$') && p.endsWith('$$') && p.length > 4) {
          return <Tex key={i} tex={p.slice(2, -2)} display />;
        }
        if (p.startsWith('$') && p.endsWith('$') && p.length > 2) {
          return <Tex key={i} tex={p.slice(1, -1)} />;
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}
