// ─────────────────────────────────────────────────────────────────────────────
// Design-token discipline audit.
//
// Three layers only stay three layers if something fails the build when they
// don't. This checks the parts that rot silently:
//
//   1. LAYERING     — nothing outside src/lib/tokens/ imports primitives, and
//                     the component layer never reaches past semantic.
//   2. CONTRACT     — exactly three foreground tiers and exactly three border
//                     strengths, every theme defines every semantic key the
//                     others do, and `border.strong` really is the 3:1 tier in
//                     the themes that claim it.
//   3. ONE-OFF      — hex literals and raw rgba() in component files, held to a
//      COLOURS        shrink-only baseline so the count can go down and never up.
//
// ── A note on the third check ───────────────────────────────────────────────
// The usual advice for this is "delete the default palette from the Tailwind
// config so bg-slate-800 stops resolving and becomes a build error". This app
// has no Tailwind — every style is an inline object composed from `C` — so the
// equivalent lever is the literal itself: a `#` colour or an `rgba(` in a
// component file IS the one-off, and there is no config to disarm it from.
//
// Failing hard on all of them today would fail the build on the first run
// (there are ~1,200 across 20 files). A baseline that can only shrink is what
// actually gets a codebase to zero: new code cannot add one, and every file
// someone touches ratchets down. Regenerate with --update after a cleanup pass.
//
// Run: node scripts/verifyDesignTokens.mjs [--update]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, HC_OVERLAYS, FG_TIERS, BORDER_STRENGTHS, SURFACE_STEPS, HUE_NAMES } from '../src/lib/tokens/semantic.js';
import { flatten } from '../src/lib/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'designTokenBaseline.json');
const UPDATE = process.argv.includes('--update');

const failures = [];
const notes = [];

// ── 1. Layering ──────────────────────────────────────────────────────────────
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
};

const SRC = path.join(ROOT, 'src');
const allFiles = walk(SRC);
const rel = (p) => path.relative(ROOT, p);

for (const file of allFiles) {
  const r = rel(file);
  if (r.startsWith('src/lib/tokens/')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*tokens\/primitives(\.js)?['"]/.test(text)) {
    failures.push(`${r}: imports the primitive layer. Primitives have no meaning attached — add a semantic token instead.`);
  }
}

const componentsSrc = fs.readFileSync(path.join(SRC, 'lib/tokens/components.js'), 'utf8');
if (/from\s+['"]\.\/primitives(\.js)?['"]/.test(componentsSrc)) {
  failures.push('src/lib/tokens/components.js: imports primitives. The component layer may alias semantic tokens and nothing else.');
}
const semanticSrc = fs.readFileSync(path.join(SRC, 'lib/tokens/semantic.js'), 'utf8');
for (const m of semanticSrc.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
  if (!/primitives(\.js)?$/.test(m[1])) failures.push(`src/lib/tokens/semantic.js: imports "${m[1]}"; the semantic layer may only import primitives.`);
}

// ── 2. Contract ──────────────────────────────────────────────────────────────
const relLum = (hex) => {
  const h = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const ratio = (a, b) => {
  const [la, lb] = [relLum(a), relLum(b)];
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

const themeNames = Object.keys(THEMES);
for (const name of themeNames) {
  const t = THEMES[name];

  const tiers = Object.keys(t.fg).filter(k => !['disabled', 'onSolid', 'onTint'].includes(k));
  if (tiers.length !== 3 || FG_TIERS.some(x => !tiers.includes(x))) {
    failures.push(`${name}: has ${tiers.length} foreground tiers (${tiers.join(', ')}); the contract is exactly three: ${FG_TIERS.join(', ')}. Every extra tier is a contrast liability that gets misused.`);
  }
  const strengths = Object.keys(t.border);
  if (strengths.length !== 3 || BORDER_STRENGTHS.some(x => !strengths.includes(x))) {
    failures.push(`${name}: has ${strengths.length} border strengths (${strengths.join(', ')}); the contract is exactly three: ${BORDER_STRENGTHS.join(', ')}.`);
  }
  for (const step of SURFACE_STEPS) {
    if (!t.surface[step]) failures.push(`${name}: missing surface step "${step}".`);
  }
  for (const hue of HUE_NAMES) {
    for (const k of ['fg', 'fgStrong', 'subtleBg']) {
      if (!t.hue[hue]?.[k]) failures.push(`${name}: hue "${hue}" is missing "${k}".`);
    }
  }
  // No colour may be named for what it is rather than what it does. `hue` is
  // the one scoped exception and is checked above by name, not by pattern.
  const banned = /^(blue|green|red|amber|slate|gray|grey)\d*$/i;
  for (const k of Object.keys(t)) {
    if (banned.test(k)) failures.push(`${name}: semantic token "${k}" is named for a colour, not a meaning.`);
  }
}

// `border.strong` is the only step allowed to be a control's sole boundary,
// which is only true if it actually clears the 3:1 non-text requirement.
for (const name of themeNames) {
  const t = THEMES[name];
  const strong = t.border.strong;
  if (!/^#/.test(strong)) { notes.push(`${name}: border.strong is translucent (${strong}); its effective contrast depends on what it sits on and cannot be checked statically.`); continue; }
  const worst = ['canvas', 'default', 'raised'].map(s => ({ s, r: ratio(strong, t.surface[s]) })).sort((a, b) => a.r - b.r)[0];
  if (worst.r < 3) failures.push(`${name}: border.strong is ${worst.r.toFixed(2)}:1 against surface.${worst.s}, under the 3:1 non-text minimum. Nothing may use it as a control's sole boundary.`);
  else notes.push(`${name}: border.strong clears 3:1 on every surface (tightest ${worst.r.toFixed(2)}:1 on ${worst.s}).`);
}

// A high-contrast overlay must never weaken what it patches.
for (const [name, hc] of Object.entries(HC_OVERLAYS)) {
  const base = THEMES[name];
  for (const s of BORDER_STRENGTHS) {
    const a = hc.border?.[s], b = base.border[s];
    if (!a || !b) continue;
    const alpha = (v) => Number(String(v).match(/,\s*([\d.]+)\)\s*$/)?.[1] ?? NaN);
    const [x, y] = [alpha(a), alpha(b)];
    if (Number.isFinite(x) && Number.isFinite(y) && x < y) {
      failures.push(`hc:${name}: border.${s} is weaker than the base theme's (${a} < ${b}). A high-contrast overlay may only harden.`);
    }
  }
}

// ── 2b. First-paint defaults ─────────────────────────────────────────────────
// src/index.css hard-codes the BALANCED values on :root so the very first paint
// isn't a flash of the wrong palette. That duplication is the single most
// likely thing in this system to drift, so it is asserted rather than trusted.
{
  const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const flat = flatten(THEMES.balanced);
  let checked = 0;
  for (const m of root.matchAll(/--c-([A-Za-z0-9]+):\s*([^;]+);/g)) {
    const [, key, value] = m;
    if (flat[key] == null || key === 'pageGlow') continue;
    checked += 1;
    const norm = (v) => String(v).trim().replace(/\s+/g, '').toLowerCase();
    if (norm(value) !== norm(flat[key])) {
      failures.push(`src/index.css: first-paint --c-${key} is ${value.trim()} but BALANCED.${key} is ${flat[key]}. They must match or the first frame is the wrong colour.`);
    }
  }
  if (!checked) failures.push('src/index.css: found no --c-* first-paint defaults to check; did the :root block move?');
  if (!/color-scheme:\s*dark/.test(root)) failures.push('src/index.css: :root must declare color-scheme: dark so native controls follow the default (dark) theme on the first frame.');
  notes.push(`src/index.css first-paint defaults match BALANCED (${checked} tokens).`);
}

// ── 3. One-off colours ───────────────────────────────────────────────────────
const LINTED = allFiles.filter(f => {
  const r = rel(f);
  return (r.startsWith('src/components/') || r === 'src/App.jsx') && !r.endsWith('.test.js');
});

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA = /\brgba?\(/g;

const counts = {};
for (const file of LINTED) {
  const text = fs.readFileSync(file, 'utf8');
  const hex = (text.match(HEX) || []).length;
  const rgba = (text.match(RGBA) || []).length;
  if (hex || rgba) counts[rel(file)] = { hex, rgba };
}

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`Baseline rewritten: ${Object.keys(counts).length} files, ` +
    `${Object.values(counts).reduce((n, c) => n + c.hex, 0)} hex literals, ` +
    `${Object.values(counts).reduce((n, c) => n + c.rgba, 0)} rgba() calls.`);
}

const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};

let ratcheted = 0;
for (const [file, c] of Object.entries(counts)) {
  const b = baseline[file];
  if (!b) {
    failures.push(`${file}: ${c.hex} hex literal(s) and ${c.rgba} rgba() call(s) in a file that had none. Use a semantic or component token — see src/lib/tokens/.`);
    continue;
  }
  if (c.hex > b.hex) failures.push(`${file}: hex literals went from ${b.hex} to ${c.hex}. New one-off colours are not allowed; add a token instead.`);
  if (c.rgba > b.rgba) failures.push(`${file}: rgba() calls went from ${b.rgba} to ${c.rgba}. A raw rgba() is almost always a smuggled one-off — use tint() on a token.`);
  if (c.hex < b.hex || c.rgba < b.rgba) ratcheted += 1;
}
const cleared = Object.keys(baseline).filter(f => !counts[f]);

// ── Report ───────────────────────────────────────────────────────────────────
console.log('Design token audit\n');
console.log(`  layers      ${themeNames.length} themes built from 3 layers (primitives → semantic → component)`);
console.log(`  tiers       ${FG_TIERS.length} foreground, ${BORDER_STRENGTHS.length} border, ${SURFACE_STEPS.length} surface steps per theme`);
const totalHex = Object.values(counts).reduce((n, c) => n + c.hex, 0);
const totalRgba = Object.values(counts).reduce((n, c) => n + c.rgba, 0);
const baseHex = Object.values(baseline).reduce((n, c) => n + c.hex, 0);
const baseRgba = Object.values(baseline).reduce((n, c) => n + c.rgba, 0);
console.log(`  one-offs    ${totalHex} hex (baseline ${baseHex}), ${totalRgba} rgba (baseline ${baseRgba}) across ${Object.keys(counts).length} files`);
if (ratcheted) console.log(`  ratchet     ${ratcheted} file(s) improved on the baseline — rerun with --update to lock it in`);
if (cleared.length) console.log(`  cleared     ${cleared.length} file(s) now have none: ${cleared.slice(0, 4).join(', ')}${cleared.length > 4 ? '…' : ''}`);
for (const n of notes) console.log(`  · ${n}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} token violation${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ token layers, tier counts and the one-off-colour ratchet all hold.');
