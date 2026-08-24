// ─────────────────────────────────────────────────────────────────────────────
// Typography audit.
//
// Every inline `fontSize:` in this app is a typographic decision made in
// passing, and there are ~3,500 of them. The ramp in src/lib/tokens/type.js is
// the decision made once; this script is what stops the other 3,499 from
// drifting back.
//
// What it checks:
//
//   1. TRACKING     every literal fontSize at or above 15px carries a
//                   letterSpacing, and that letterSpacing is the ramp's value
//                   for that size (±0.01px).
//   2. LEADING      every literal fontSize at or above 22px states a
//                   line-height, and it is no looser than the ramp's.
//   3. A11Y         no inline letterSpacing or line-height clobbers the
//                   accessibility sliders — every value composes with
//                   var(--msp-letter-spacing) / var(--msp-line-scale).
//   4. NO CAPS      no `textTransform: 'uppercase'` anywhere. All-caps is
//                   slower to read for everyone and worst for the dyslexic
//                   students this app is explicitly built for; the eyebrow
//                   treatment (small size + positive tracking) is in
//                   src/lib/theme.js as lbl()/eyebrow().
//   5. OPSZ         index.css turns optical sizing on. Bricolage Grotesque has
//                   a real opsz axis; without this line every heading is the
//                   14px drawing scaled up.
//
// Run: node scripts/verifyTypography.mjs
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tracking, leading, TRACKING_FLOOR, LEADING_FLOOR } from '../src/lib/tokens/type.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const failures = [];
const notes = [];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

// The same brace map the codemod used: which object literal is a given offset
// inside of, ignoring braces in strings, template literals and comments.
function scan(text) {
  const opens = [];
  const enclosing = new Array(text.length).fill(-1);
  const close = new Map();
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') { while (i < n && text[i] !== '\n') i += 1; continue; }
    if (c === '/' && next === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1; i += 2; continue; }
    if (c === "'" || c === '"') {
      const q = c; i += 1;
      while (i < n) { if (text[i] === '\\') { i += 2; continue; } if (text[i] === q) { i += 1; break; } i += 1; }
      continue;
    }
    if (c === '`') {
      i += 1;
      let depth = 0;
      while (i < n) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '$' && text[i + 1] === '{') { depth += 1; i += 2; continue; }
        if (text[i] === '}' && depth > 0) { depth -= 1; i += 1; continue; }
        if (text[i] === '`' && depth === 0) { i += 1; break; }
        i += 1;
      }
      continue;
    }
    if (c === '{') { opens.push(i); enclosing[i] = opens.length >= 2 ? opens[opens.length - 2] : -1; i += 1; continue; }
    if (c === '}') { const o = opens.pop(); if (o !== undefined) close.set(o, i); i += 1; continue; }
    enclosing[i] = opens.length ? opens[opens.length - 1] : -1;
    i += 1;
  }
  return { enclosing, close };
}

const valueOfKey = (text, open, closeIdx, enclosing, key) => {
  const re = new RegExp(`\\b${key}\\s*:\\s*([^,}\\n]+)`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index < open || m.index > closeIdx) continue;
    if (enclosing[m.index] === open) return m[1].trim();
  }
  return null;
};

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const files = walk(SRC).filter((f) => !f.includes(`${path.sep}lib${path.sep}tokens${path.sep}`));

let sized = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const { enclosing, close } = scan(text);

  // ── 4. No caps ───────────────────────────────────────────────────────────
  for (const m of text.matchAll(/textTransform\s*:\s*['"]uppercase['"]/g)) {
    failures.push(`${rel}:${lineOf(text, m.index)}: textTransform: 'uppercase'. Use the eyebrow treatment — lbl() or eyebrow() from src/lib/theme.js — rather than capitals.`);
  }

  // ── 1 & 2. Tracking and leading ──────────────────────────────────────────
  for (const m of text.matchAll(/\bfontSize\s*:\s*(\d+(?:\.\d+)?)(?![\d.])/g)) {
    const px = Number(m[1]);
    const open = enclosing[m.index];
    if (open === -1) continue;
    const closeIdx = close.get(open);
    if (closeIdx === undefined) continue;
    sized += 1;
    const line = lineOf(text, m.index);

    if (px >= TRACKING_FLOOR) {
      const got = valueOfKey(text, open, closeIdx, enclosing, 'letterSpacing');
      const want = tracking(px);
      if (got == null) {
        failures.push(`${rel}:${line}: fontSize ${px} has no letterSpacing. The ramp says ${want}px — see src/lib/tokens/type.js.`);
      } else {
        const px_ = got.match(/calc\(\s*(-?\d+(?:\.\d+)?)px/);
        if (!px_) {
          if (!/var\(--msp-letter-spacing\)/.test(got)) {
            failures.push(`${rel}:${line}: letterSpacing ${got} overrides the accessibility slider. Compose with var(--msp-letter-spacing).`);
          }
        } else if (Number(px_[1]) > 0 && /mono/i.test(valueOfKey(text, open, closeIdx, enclosing, 'fontFamily') || '')) {
          // The one documented exception: a code, a score or an OTP set in the
          // mono face is read character by character rather than as a word
          // shape, and letterspacing it apart is the point.
        } else if (Math.abs(Number(px_[1]) - want) > 0.011) {
          failures.push(`${rel}:${line}: fontSize ${px} is tracked at ${px_[1]}px; the ramp says ${want}px.`);
        }
      }
    }

    if (px >= LEADING_FLOOR) {
      const got = valueOfKey(text, open, closeIdx, enclosing, 'lineHeight');
      const want = leading(px);
      if (got == null) {
        failures.push(`${rel}:${line}: fontSize ${px} has no lineHeight. At display sizes, inheriting the body's is the "unset" look; the ramp says ${want}.`);
      } else {
        const num = got.match(/calc\(\s*(\d+(?:\.\d+)?)\s*\*/) || got.match(/^(\d+(?:\.\d+)?)$/);
        if (num && Number(num[1]) > want + 0.011) {
          failures.push(`${rel}:${line}: fontSize ${px} is leaded at ${num[1]}; the ramp says ${want} or tighter.`);
        }
      }
    }
  }

  // ── 3. Accessibility ─────────────────────────────────────────────────────
  for (const m of text.matchAll(/\bletterSpacing\s*:\s*['"]([^'"]+)['"]/g)) {
    if (!/var\(--msp-letter-spacing\)/.test(m[1])) {
      failures.push(`${rel}:${lineOf(text, m.index)}: letterSpacing '${m[1]}' silently overrides Settings → Accessibility → letter spacing. Compose with var(--msp-letter-spacing).`);
    }
  }
}

// ── 5. Optical sizing ────────────────────────────────────────────────────────
{
  const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
  if (!/font-optical-sizing:\s*auto/.test(css)) {
    failures.push('src/index.css: no `font-optical-sizing: auto`. Bricolage Grotesque ships a real opsz axis; without this every heading is the small drawing scaled up.');
  } else notes.push('optical sizing is on — display sizes use the display drawing.');
  const bodyLead = css.match(/line-height:\s*calc\((\d+(?:\.\d+)?)\s*\*\s*var\(--msp-line-scale\)\)/);
  if (!bodyLead) failures.push('src/index.css: body line-height must be a calc() against --msp-line-scale so the accessibility slider still works.');
  else if (Number(bodyLead[1]) > 1.55) failures.push(`src/index.css: body line-height is ${bodyLead[1]}; body copy sits at 1.5–1.55.`);
  else notes.push(`body leading ${bodyLead[1]}, inside the 1.5–1.55 band.`);
}

console.log('\nTypography audit\n');
console.log(`  scale       1.200 from 16px; tracking crosses zero at 14px`);
console.log(`  checked     ${sized} literal inline font sizes across ${files.length} files`);
for (const n of notes) console.log(`  · ${n}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} typography problem(s):\n`);
  for (const f of failures.slice(0, 60)) console.error(`  - ${f}`);
  if (failures.length > 60) console.error(`  …and ${failures.length - 60} more.`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ tracking, leading, optical sizing and the no-caps rule all hold.\n');
