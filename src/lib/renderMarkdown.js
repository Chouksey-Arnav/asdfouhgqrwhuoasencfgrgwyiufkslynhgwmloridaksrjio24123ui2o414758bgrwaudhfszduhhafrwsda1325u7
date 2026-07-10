// ─────────────────────────────────────────────────────────────────────────────
// marked + DOMPurify — Render AI responses as beautiful markdown
//
// marked v5+ changed the custom-renderer API: override methods now receive a
// token object (e.g. `{ tokens }`) instead of a pre-rendered string, and must
// call `this.parser.parseInline(tokens)` / `this.parser.parse(tokens)` to get
// the rendered child content. Using regular `function` (not arrow) methods
// here is required so `this` resolves to the Renderer instance.
// ─────────────────────────────────────────────────────────────────────────────
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const escaped = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<pre style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 16px;overflow-x:auto;margin:8px 0;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6"><code>${escaped}</code></pre>`;
};

renderer.codespan = function ({ text }) {
  return `<code style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:4px;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:12px">${text}</code>`;
};

renderer.blockquote = function ({ tokens }) {
  return `<blockquote style="border-left:3px solid rgba(45,127,255,0.6);margin:8px 0;padding:4px 16px;color:rgba(148,163,192,0.9)">${this.parser.parse(tokens)}</blockquote>`;
};

renderer.strong = function ({ tokens }) {
  return `<strong style="color:#eef2ff;font-weight:700">${this.parser.parseInline(tokens)}</strong>`;
};

renderer.em = function ({ tokens }) {
  return `<em style="color:#94a3c0">${this.parser.parseInline(tokens)}</em>`;
};

renderer.heading = function ({ tokens, depth }) {
  const sizes = { 1:'16px', 2:'15px', 3:'14px' };
  return `<div style="font-size:${sizes[depth]||'14px'};font-weight:700;color:#eef2ff;font-family:'Bricolage Grotesque',sans-serif;margin:12px 0 6px">${this.parser.parseInline(tokens)}</div>`;
};

renderer.list = function (token) {
  const tag = token.ordered ? 'ol' : 'ul';
  let body = '';
  for (const item of token.items) body += this.listitem(item);
  return `<${tag} style="padding-left:20px;margin:6px 0;display:flex;flex-direction:column;gap:4px">${body}</${tag}>`;
};

renderer.listitem = function (item) {
  const body = this.parser.parse(item.tokens, !!item.loose);
  return `<li style="color:#94a3c0;line-height:1.6;font-size:13px">${body}</li>`;
};

renderer.paragraph = function ({ tokens }) {
  return `<p style="margin:6px 0;line-height:1.75;color:#94a3c0;font-size:13px">${this.parser.parseInline(tokens)}</p>`;
};

renderer.hr = function () {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:12px 0"/>`;
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
