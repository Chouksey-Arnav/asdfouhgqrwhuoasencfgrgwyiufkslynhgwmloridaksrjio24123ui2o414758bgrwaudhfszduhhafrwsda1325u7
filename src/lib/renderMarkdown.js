// ─────────────────────────────────────────────────────────────────────────────
// marked + DOMPurify — Render AI responses as beautiful markdown
//
// marked v5+ changed the custom-renderer API: override methods now receive a
// token object (e.g. `{ tokens }`) instead of a pre-rendered string, and must
// call `this.parser.parseInline(tokens)` / `this.parser.parse(tokens)` to get
// the rendered child content. Using regular `function` (not arrow) methods
// here is required so `this` resolves to the Renderer instance.
//
// ── Why every color here is a CSS custom property ────────────────────────────
// This file is the one place in the app that cannot read the `C` token object.
// It emits an HTML *string* which is handed to dangerouslySetInnerHTML, so the
// styles are baked in at parse time and are not recomputed when the theme
// remount happens — a hex literal written here is frozen for the life of the
// message, whatever theme the student switches to afterwards.
//
// That is exactly how this file shipped, and the result was the app's worst
// accessibility bug: `<strong>` was hard-coded to #eef2ff — the DARK palette's
// t1 — so every term Medabrain emphasised rendered near-white. On the dark
// themes it was the brightest text on screen; in light mode it was white on a
// white card, which reads as the bolded word having been deleted. Paragraphs,
// list items, headings, inline code and blockquotes all had the same problem to
// a lesser degree.
//
// var(--c-*) is written onto <html> by applyTheme() on every theme change, and
// because a CSS variable is resolved at paint time rather than at parse time,
// markdown that was rendered ten minutes ago in one theme repaints correctly in
// the next. The fallbacks are the Balanced values, matching index.css's
// first-paint defaults, so a message rendered before applyTheme() has ever run
// is still readable.
// ─────────────────────────────────────────────────────────────────────────────
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Kept to real tokens rather than raw values so there is exactly one definition
// of "body copy color" for AI output, and a future palette needs no edits here.
const T1 = 'var(--c-t1,#e6eaf2)';        // headings, bolded terms
const T2 = 'var(--c-t2,#a7b2c6)';        // body copy
// Note: em and blockquote deliberately use T2 (body), not T3. T3 is a
// metadata tone that lands near 4.0:1 on the dark palettes — under AA for a
// run of actual prose, and these are prose. Italics and the quote rule already
// carry the de-emphasis without spending contrast on it.
const SURF = 'var(--c-surfHi,rgba(255,255,255,0.07))';
const BORDER = 'var(--c-b1,rgba(255,255,255,0.09))';
const ACCENT = 'var(--c-blue,#4b8bf5)';

const renderer = new marked.Renderer();

renderer.code = function ({ text }) {
  const escaped = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<pre style="background:${SURF};border:1px solid ${BORDER};border-radius:8px;padding:12px 16px;overflow-x:auto;margin:8px 0;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;color:${T1}"><code>${escaped}</code></pre>`;
};

renderer.codespan = function ({ text }) {
  return `<code style="background:${SURF};border:1px solid ${BORDER};border-radius:4px;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:${T1}">${text}</code>`;
};

renderer.blockquote = function ({ tokens }) {
  return `<blockquote style="border-left:3px solid ${ACCENT};margin:8px 0;padding:4px 16px;color:${T2}">${this.parser.parse(tokens)}</blockquote>`;
};

// The one the student actually reported: bolded terms vanishing in light mode.
renderer.strong = function ({ tokens }) {
  return `<strong style="color:${T1};font-weight:700">${this.parser.parseInline(tokens)}</strong>`;
};

renderer.em = function ({ tokens }) {
  return `<em style="color:${T2}">${this.parser.parseInline(tokens)}</em>`;
};

renderer.heading = function ({ tokens, depth }) {
  const sizes = { 1:'16px', 2:'15px', 3:'14px' };
  return `<div style="font-size:${sizes[depth]||'14px'};font-weight:700;color:${T1};font-family:var(--c-FD,'Bricolage Grotesque',sans-serif);margin:12px 0 6px">${this.parser.parseInline(tokens)}</div>`;
};

renderer.list = function (token) {
  const tag = token.ordered ? 'ol' : 'ul';
  let body = '';
  for (const item of token.items) body += this.listitem(item);
  return `<${tag} style="padding-left:20px;margin:6px 0;display:flex;flex-direction:column;gap:4px">${body}</${tag}>`;
};

renderer.listitem = function (item) {
  const body = this.parser.parse(item.tokens, !!item.loose);
  return `<li style="color:${T2};line-height:1.6;font-size:13px">${body}</li>`;
};

renderer.paragraph = function ({ tokens }) {
  return `<p style="margin:6px 0;line-height:1.75;color:${T2};font-size:13px">${this.parser.parseInline(tokens)}</p>`;
};

renderer.hr = function () {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:12px 0"/>`;
};

marked.setOptions({ renderer, gfm: true, breaks: true });

export function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  const html = marked.parse(text);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','strong','em','ul','ol','li','code','pre','blockquote','h1','h2','h3','hr','br','div','span'],
    ALLOWED_ATTR: ['style','class'],
    FORBID_ATTR: ['onerror','onclick','onload'],
  });
}
