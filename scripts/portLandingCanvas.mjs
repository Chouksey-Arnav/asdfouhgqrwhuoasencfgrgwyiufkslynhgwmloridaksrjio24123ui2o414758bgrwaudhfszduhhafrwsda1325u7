#!/usr/bin/env node
// Ports the v2 landing design canvas (design/landing-v2/*.dc.html) into JSX.
//
//   node scripts/portLandingCanvas.mjs "design/landing-v2/MedSchoolPrep Landing.dc.html" /tmp/out.jsx
//
// This is NOT part of the build — src/components/landing/v2/LandingPageV2.jsx is
// a committed source file, edited like any other. The tool exists so that a
// REVISED design can be re-ported the same mechanical way it was ported the
// first time (see docs/LANDING_VERSIONS.md), instead of hand-patching 2,800
// lines of generated JSX and drifting away from the design.
//
// It emits three files: the JSX body, the `style-hover` / `style-after` rules it
// hoisted into real CSS classes, and the <helmet> block. Stitching those into
// the component — imports, the ported DCLogic class, the host wrapper — is a
// hand step, and deliberately so: that wrapper is this app's code, not the
// design's.
import fs from 'node:fs';

const SRC = process.argv[2];
const OUT_TPL = process.argv[3];
const raw = fs.readFileSync(SRC, 'utf8');

const bodyStart = raw.indexOf('<x-dc>') + '<x-dc>'.length;
const bodyEnd = raw.lastIndexOf('</x-dc>');
let body = raw.slice(bodyStart, bodyEnd);

// The <helmet> block is head material (fonts + a global stylesheet); handled by hand.
const helmetMatch = /<helmet>([\s\S]*?)<\/helmet>/.exec(body);
const helmet = helmetMatch ? helmetMatch[1] : '';
body = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
fs.writeFileSync(OUT_TPL + '.helmet.txt', helmet);

// ── Tokenizer ──────────────────────────────────────────────────────────────
const VOID = new Set(['img', 'meta', 'link', 'br', 'hr', 'input', 'source', 'use']);

function parse(html) {
  const root = { tag: '#root', attrs: [], kids: [] };
  const stack = [root];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushText(html.slice(i)); break; }
    if (lt > i) pushText(html.slice(i, lt));
    if (html.startsWith('<!--', lt)) { i = html.indexOf('-->', lt) + 3; continue; }
    const gt = findTagEnd(html, lt);
    const inner = html.slice(lt + 1, gt);
    if (inner[0] === '/') {
      const name = inner.slice(1).trim().toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag.toLowerCase() === name) { stack.length = k; break; }
      }
      i = gt + 1;
      continue;
    }
    const selfClose = inner.endsWith('/');
    const m = /^([A-Za-z][A-Za-z0-9-]*)/.exec(inner);
    const tag = m[1];
    const attrs = parseAttrs(inner.slice(tag.length).replace(/\/$/, ''));
    const node = { tag, attrs, kids: [] };
    stack[stack.length - 1].kids.push(node);
    if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(node);
    i = gt + 1;
  }
  return root;

  function pushText(t) { if (t) stack[stack.length - 1].kids.push({ text: t }); }
}

function findTagEnd(html, lt) {
  let q = null;
  for (let i = lt + 1; i < html.length; i++) {
    const c = html[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '>') return i;
  }
  return html.length;
}

function parseAttrs(s) {
  const out = [];
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1]) continue;
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : null;
    out.push([m[1], val]);
  }
  return out;
}

// ── Entities ───────────────────────────────────────────────────────────────
// The named entities the design document uses, plus the ones it is likely to
// grow. A missing entry is not a crash — it survives into the JSX as literal
// text and reaches the page as "r&eacute;sum&eacute;" — so extend this table
// rather than assume coverage, and grep the emitted file for `&[a-z]+;` after
// every re-port.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  eacute: '\u00e9', egrave: '\u00e8', agrave: '\u00e0', ccedil: '\u00e7',
  uuml: '\u00fc', ouml: '\u00f6', auml: '\u00e4', ntilde: '\u00f1',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', middot: '\u00b7',
  rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d',
  rarr: '\u2192', larr: '\u2190', times: '\u00d7', copy: '\u00a9',
};
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return NAMED[e] !== undefined ? NAMED[e] : all;
  });
}

// ── Expressions ────────────────────────────────────────────────────────────
// Every {{ hole }} is either a loop variable (a local) or a value the logic
// class puts on renderVals(); the latter get qualified with `v.` so the emitted
// JSX reads against one object instead of 180 destructured names.
const scope = [];
function qualify(expr) {
  const m = /^([A-Za-z_$][\w$]*)([\s\S]*)$/.exec(expr.trim());
  if (!m) return expr;
  const root = m[1];
  if (scope.includes(root) || ['true', 'false', 'null', 'undefined'].includes(root)) return expr;
  return 'v.' + expr.trim();
}
const HOLE = /\{\{([\s\S]+?)\}\}/;
const HOLE_G = /\{\{([\s\S]+?)\}\}/g;

/** A value that is exactly one {{ hole }} → the bare expression. */
function soleHole(v) {
  const m = /^\s*\{\{([\s\S]+?)\}\}\s*$/.exec(v);
  return m ? m[1].trim() : null;
}

/** Any string with holes → a JS expression (template literal when mixed). */
function toExpr(v) {
  const sole = soleHole(v);
  if (sole) return qualify(sole);
  if (!HOLE.test(v)) return JSON.stringify(decodeEntities(v));
  const lit = decodeEntities(v)
    .replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    .replace(HOLE_G, (all, e) => '${' + qualify(e.trim()) + '}');
  return '`' + lit + '`';
}

// ── Pseudo-class stylesheet ────────────────────────────────────────────────
const pseudoRules = [];
const pseudoCache = new Map();
function pseudoClass(kind, css) {
  const key = kind + '|' + css;
  if (pseudoCache.has(key)) return pseudoCache.get(key);
  const cls = `mspv2-${kind}-${pseudoCache.size + 1}`;
  const sel = kind === 'after' || kind === 'before' ? `.${cls}::${kind}` : `.${cls}:${kind}`;
  pseudoRules.push(`${sel} { ${decodeEntities(css)} }`);
  pseudoCache.set(key, cls);
  return cls;
}

// ── JSX emit ───────────────────────────────────────────────────────────────
const SVG_ATTR_CAMEL = {
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray', 'stroke-dashoffset': 'strokeDashoffset', 'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity', 'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'fill-opacity': 'fillOpacity',
  'text-anchor': 'textAnchor', 'gradientunits': 'gradientUnits',
};
const TAG_FIX = { lineargradient: 'linearGradient', radialgradient: 'radialGradient', clippath: 'clipPath', preserveaspectratio: 'preserveAspectRatio' };

let keySeed = 0;

function emit(node, indent) {
  const pad = '  '.repeat(indent);
  if (node.text !== undefined) return emitText(node.text, pad);
  const tag = node.tag.toLowerCase();
  if (tag === 'sc-for') return emitFor(node, indent);
  if (tag === 'sc-if') return emitIf(node, indent);
  if (tag === 'script' || tag === 'style') return '';

  const realTag = TAG_FIX[tag] || node.tag;
  const props = [];
  const classes = [];
  for (const [name, value] of node.attrs) {
    if (name === 'hint-placeholder-count' || name === 'hint-placeholder-val' || name === 'hint-size' || name === 'sc-name') continue;
    if (name.startsWith('style-')) { classes.push(pseudoClass(name.slice(6), value)); continue; }
    if (name === 'class') { classes.push(...value.split(/\s+/).filter(Boolean)); continue; }
    if (value === null) { props.push(name); continue; }
    if (name === 'style') { props.push(`style={css(${toExpr(value)})}`); continue; }
    let key = name;
    if (/^on[A-Z]/.test(name)) key = name;
    else if (/^on[a-z]/.test(name)) key = 'on' + name[2].toUpperCase() + name.slice(3);
    else if (SVG_ATTR_CAMEL[name.toLowerCase()]) key = SVG_ATTR_CAMEL[name.toLowerCase()];
    else if (name === 'for') key = 'htmlFor';
    else if (name === 'viewbox') key = 'viewBox';
    else if (name === 'tabindex') key = 'tabIndex';
    const expr = toExpr(value);
    props.push(expr.startsWith('"') && !HOLE.test(value) ? `${key}=${expr}` : `${key}={${expr}}`);
  }
  if (classes.length) props.unshift(`className="${classes.join(' ')}"`);

  const kids = node.kids.map((k) => emit(k, indent + 1)).filter(Boolean);
  const attrStr = props.length ? ' ' + props.join(' ') : '';
  if (!kids.length) {
    if (VOID.has(tag)) return `${pad}<${realTag}${attrStr} />`;
    return `${pad}<${realTag}${attrStr}></${realTag}>`;
  }
  return `${pad}<${realTag}${attrStr}>\n${kids.join('\n')}\n${pad}</${realTag}>`;
}

function emitText(txt, pad) {
  if (!HOLE.test(txt)) {
    const t = decodeEntities(txt);
    if (!t.trim()) return t.includes(' ') ? `${pad}{' '}` : '';
    return pad + '{' + JSON.stringify(t) + '}';
  }
  const parts = decodeEntities(txt).split(HOLE_G);
  const chunks = [];
  parts.forEach((p, i) => {
    if (!(i & 1)) { if (p) chunks.push(JSON.stringify(p)); }
    else chunks.push(`hole(${qualify(p.trim())})`);
  });
  return chunks.map((c) => pad + '{' + c + '}').join('\n');
}

function emitFor(node, indent) {
  const pad = '  '.repeat(indent);
  const list = node.attrs.find(([n]) => n === 'list')?.[1] || '';
  const as = node.attrs.find(([n]) => n === 'as')?.[1] || 'item';
  const listExpr = qualify(soleHole(list) || list);
  scope.push(as);
  const kids = node.kids.map((k) => emit(k, indent + 2)).filter(Boolean);
  scope.pop();
  const v = `__k${keySeed++}`;
  return `${pad}{arr(${listExpr}).map((${as}, ${v}) => (\n${'  '.repeat(indent + 1)}<Fragment key={${v}}>\n${kids.join('\n')}\n${'  '.repeat(indent + 1)}</Fragment>\n${pad}))}`;
}

function emitIf(node, indent) {
  const pad = '  '.repeat(indent);
  const value = node.attrs.find(([n]) => n === 'value')?.[1] || '';
  const expr = qualify(soleHole(value) || value);
  const kids = node.kids.map((k) => emit(k, indent + 2)).filter(Boolean);
  return `${pad}{(${expr}) ? (\n${'  '.repeat(indent + 1)}<Fragment>\n${kids.join('\n')}\n${'  '.repeat(indent + 1)}</Fragment>\n${pad}) : null}`;
}

const tree = parse(body);
const topKids = tree.kids.map((k) => emit(k, 2)).filter(Boolean);

let out = `${topKids.join('\n')}`;
// The two CTA destinations are real app routes: keep the href (so they are
// linkable, middle-clickable and crawlable) and add the client-side handler.
out = out
  .replace(/href=\{v\.loginUrl\}/g, 'href={v.loginUrl} onClick={v.onLoginClick}')
  .replace(/href=\{v\.signupUrl\}/g, 'href={v.signupUrl} onClick={v.onSignupClick}')
  .replace(/src="assets\/logo-mark\.png"/g, 'src="/logo-mark.png"')
  .replace(/src="assets\/logo\.png"/g, 'src="/logo.png"');
fs.writeFileSync(OUT_TPL, out);
fs.writeFileSync(OUT_TPL + '.css.txt', pseudoRules.join('\n'));
console.error(`emitted ${out.split('\n').length} lines, ${pseudoRules.length} pseudo rules`);
