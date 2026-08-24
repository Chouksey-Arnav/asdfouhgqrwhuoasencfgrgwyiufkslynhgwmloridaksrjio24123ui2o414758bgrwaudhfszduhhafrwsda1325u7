// ─────────────────────────────────────────────────────────────────────────────
// Pull the WORDS out of a codebase that has no template files.
//
// Every string a student reads in this app is a JSX text node or a string
// literal in a .jsx file, sitting a few characters away from a hex colour, a
// CSS shorthand, an import path and a Supabase column name. A copy lint that
// cannot tell those apart is a copy lint nobody can keep green — so this reads
// a real AST (@babel/parser) rather than guessing with regexes, because the
// guess is wrong in exactly the places that matter: `=>` looks like the end of
// a JSX tag, and `status: 'cancelled'` looks like a British spelling when it is
// really a PostgreSQL check constraint.
//
// It returns three kinds of span:
//
//   'jsx'      text between JSX tags — the largest share of visible copy
//   'literal'  a quoted string that reads like a sentence, or one handed to a
//              prop that is copy by definition (title, label, placeholder,
//              aria-label, …)
//   'comment'  // and /* */ — not user-facing, but it is prose written by us,
//              and it is where a house spelling habit is kept or lost
//
// Anything that reads as code is dropped: CSS values and shorthands, class
// names, module paths, colour literals, and single tokens with no space in them
// unless a copy prop is holding them.
// ─────────────────────────────────────────────────────────────────────────────
import { parse } from '@babel/parser';

/** Props whose value is copy by definition, whatever it looks like. */
export const COPY_PROPS = new Set([
  'title', 'label', 'sub', 'subtitle', 'body', 'heading', 'headline', 'caption',
  'placeholder', 'ariaLabel', 'aria-label', 'actionLabel', 'alt', 'tooltip',
  'blurb', 'desc', 'description', 'question', 'prompt', 'hint',
  'emptyLabel', 'cta', 'ctaLabel', 'eyebrow', 'summary', 'message',
  'confirmLabel', 'cancelLabel', 'nextLabel', 'backLabel', 'legend', 'note',
]);

/** Keys whose values are data the database or an API also spells. Never copy. */
export const DATA_KEYS = new Set([
  'id', 'key', 'slug', 'status', 'kind', 'type', 'code', 'value', 'field',
  'column', 'table', 'event', 'action', 'route', 'path', 'href', 'src',
  'className', 'class', 'testId', 'dataTour', 'icon', 'color', 'colour',
  'background', 'font', 'fontFamily', 'transition', 'transform', 'boxShadow',
  'reason', 'endedReason', 'method', 'role', 'variant', 'mode', 'tab', 'view',
]);

const CODE_ISH = [
  /^[\s\d.,%#()-]*$/,
  /^[a-z]+([A-Z][a-z0-9]*)+$/,
  /^[a-z0-9-]+$/,
  /^[A-Z0-9_]+$/,
  /^(\.{1,2}\/|~\/|@[\w-]+\/)/,          // a module path, not a sentence that opens with a full stop
  /^[\w-]+\/[\w-]/,
  /^\d+(\.\d+)?(px|em|rem|%|s|ms|fr|vh|vw|deg)\b/,
  /(px|em|rem)\s+(solid|dashed|dotted)/,
  /^(rgba?|hsla?|calc|var|linear-gradient|radial-gradient|translate\w*|scale\w*|rotate|cubic-bezier|blur|drop-shadow|perspective)\(/,
  /^#[0-9a-fA-F]{3,8}$/,
  /^data:/,
  /^\w+\s*:\s*[\w#.-]+;/,
  /^(inset|none|auto|hidden|flex|grid|block|inline|absolute|relative|fixed|sticky)\b/,
];

const isCodeIsh = (s) => CODE_ISH.some((re) => re.test(s.trim()));

/** Does this read like something a person wrote for another person? */
export function looksLikeCopy(text, { fromCopyProp = false } = {}) {
  const t = text.trim();
  if (!t) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (isCodeIsh(t)) return false;
  if (fromCopyProp) return true;
  if (!/\s/.test(t)) return false;
  if (!/[A-Za-z]{3}/.test(t)) return false;
  if (/(^|\s)\d+(\.\d+)?(px|em|rem|%|s|ms|fr|vh|vw|deg)(\s|$|,|;)/.test(t)) return false;
  if (/;\s*\w[\w-]*\s*:/.test(t)) return false;    // a CSS declaration block
  return true;
}

const PARSE_OPTS = {
  sourceType: 'module',
  allowReturnOutsideFunction: true,
  plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport', 'topLevelAwait'],
  errorRecovery: true,
};

/**
 * Split a source file into copy spans.
 *
 * @param {string} text the file contents
 * @returns {{kind:'jsx'|'literal'|'comment', text:string, start:number, end:number, prop?:string}[]}
 */
export function extractSpans(text) {
  let ast;
  try { ast = parse(text, PARSE_OPTS); } catch { return []; }
  const spans = [];

  for (const c of ast.comments || []) {
    spans.push({ kind: 'comment', text: c.value, start: c.start + 2, end: c.end });
  }

  // The nearest enclosing `const NAME = …`, so a caller can tell an LLM prompt
  // (STYLE_TONE, DEBRIEF_INSTRUCTION) from a string a student reads.
  // `element` is the nearest enclosing JSX tag, so a caller can tell the text
  // inside a <button> — which is a label, and 90% of this app's button copy —
  // from a paragraph of prose.
  const visit = (node, prop, scope, element) => {
    if (!node || typeof node.type !== 'string') return;

    if (node.type === 'JSXText') {
      if (node.value.trim() && /[A-Za-z]{2}/.test(node.value)) {
        spans.push({ kind: 'jsx', text: node.value, start: node.start, end: node.end, scope, element });
      }
      return;
    }
    if (node.type === 'StringLiteral') {
      if (looksLikeCopy(node.value, { fromCopyProp: COPY_PROPS.has(prop) })) {
        spans.push({ kind: 'literal', text: node.value, start: node.start + 1, end: node.end - 1, prop, scope, element });
      }
      return;
    }
    if (node.type === 'TemplateLiteral') {
      for (const q of node.quasis) {
        const raw = q.value.cooked ?? q.value.raw ?? '';
        if (looksLikeCopy(raw, { fromCopyProp: COPY_PROPS.has(prop) })) {
          spans.push({ kind: 'literal', text: raw, start: q.start, end: q.end, prop, scope, element });
        }
      }
      for (const e of node.expressions) visit(e, prop, scope, element);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      let childProp = prop;
      let childScope = scope;
      let childElement = element;
      if (node.type === 'JSXElement' && key === 'children') {
        const name = node.openingElement?.name;
        childElement = name?.name ?? name?.property?.name ?? element;
      }
      if (node.type === 'VariableDeclarator' && key === 'init') childScope = node.id?.name ?? scope;
      if (node.type === 'ObjectProperty' && key === 'value') {
        const name = node.key?.name ?? node.key?.value;
        if (DATA_KEYS.has(name)) continue;              // database and CSS values
        childProp = name;
      }
      if (node.type === 'JSXAttribute' && key === 'value') {
        const name = node.name?.name;
        if (DATA_KEYS.has(name)) continue;
        childProp = name;
      }
      if (Array.isArray(value)) value.forEach((v) => visit(v, childProp, childScope, childElement));
      else if (value && typeof value === 'object') visit(value, childProp, childScope, childElement);
    }
  };

  visit(ast.program, null, null, null);
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

/** 1-based line number for an offset. */
export const lineAt = (text, index) => text.slice(0, index).split('\n').length;
