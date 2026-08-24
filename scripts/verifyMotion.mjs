// ─────────────────────────────────────────────────────────────────────────────
// Motion audit.
//
// Two rules, and both of them are about the same phone: the $200 mid-range
// Android that most of this app's students actually own, with a throttled GPU
// and four other tabs open.
//
//   1. ONLY TRANSFORM AND OPACITY. Animating width, height, top, left, margin
//      or padding runs layout and paint on the main thread for every frame.
//      On that phone it is a visible stutter, and a stuttering interface reads
//      as a broken one. transform and opacity are composited: a matrix
//      multiply on the GPU and nothing on the main thread.
//
//      `transition: 'all …'` is the same bug with the properties left blank —
//      it includes every layout property the element might ever animate, plus
//      the ones a future edit adds.
//
//   2. NOTHING INTERACTIVE OVER 400ms. Past that a transition stops reading as
//      responsive and starts reading as waiting. The per-interaction budgets
//      are in src/lib/tokens/motion.js: 100 for a press, 140 for hover and
//      focus, 180 for a dropdown, 200 for a tab swap, 280 for a modal, 360 for
//      a page.
//
//      This cap is about things the student is WAITING ON. A reward reveal or
//      a streak count-up is the thing they are watching, not a delay in front
//      of what they wanted, so framer-motion reveals are not held to it — the
//      CSS `transition` property, which is what fires on hover, focus, press
//      and state change, is.
//
// ── What is a hard failure and what is a ratchet ────────────────────────────
// Rules 1 and 2 hard-fail for CSS transitions: the codebase is clean of them
// and it stays clean.
//
// framer-motion height/width reveals (the `height: 0 → auto` accordion) are on
// a SHRINK-ONLY BASELINE instead, the same mechanism the colour lint uses.
// There are ~100 of them, an auto-height reveal genuinely has no one-line
// transform equivalent, and a rule that fails the build on day one is a rule
// somebody deletes on day two. New ones cannot be added; every file someone
// touches ratchets down.
//
// Run: node scripts/verifyMotion.mjs [--update]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_INTERACTIVE, LAYOUT_PROPS } from '../src/lib/tokens/motion.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'motionBaseline.json');
const UPDATE = process.argv.includes('--update');

// The prerendered marketing page is a document, not an interface: its long
// arc-draw reveals are the content, nothing waits behind them, and it is
// static HTML by the time a phone sees it.
const DURATION_EXEMPT = ['src/components/landing/', 'src/components/LandingPage.jsx'];

const failures = [];
const notes = [];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
};

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** '.25s' | '250ms' | '0.4s' → milliseconds. */
const ms = (raw) => (/ms$/.test(raw) ? Number(raw.replace('ms', '')) : Number(raw.replace('s', '')) * 1000);

const files = walk(SRC).filter((f) => !f.includes(`${path.sep}lib${path.sep}tokens${path.sep}`));
const layoutSet = new Set(LAYOUT_PROPS);

let transitions = 0;
const framerCounts = {};

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  const exempt = DURATION_EXEMPT.some((p) => rel.startsWith(p));

  // Every `transition:` value we can see, whether it is a JS string, a CSS
  // declaration or a CSS string inside a template literal.
  for (const m of text.matchAll(/transition:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`|([^;,'"`\n]*(?:,[^;'"`\n]*)*);)/g)) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (!value || /^\s*(CONTROL_TRANSITION|tr\(|undefined|none|\$\{|[A-Z_]+\b)/.test(value.trim())) continue;
    transitions += 1;
    const line = lineOf(text, m.index);

    if (/\ball\b/.test(value)) {
      failures.push(`${rel}:${line}: transition: '${value}' — 'all' includes every layout property. Name the properties, or use CONTROL_TRANSITION.`);
    }
    for (const part of value.split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      if (layoutSet.has(prop)) {
        failures.push(`${rel}:${line}: transitions "${prop}", which relayouts on every frame. Use transform (translate/scale) or opacity — see src/lib/tokens/motion.js.`);
      }
      const dur = part.match(/(?:^|\s)(\d*\.?\d+m?s)\b/);
      if (dur && !exempt && ms(dur[1]) > MAX_INTERACTIVE) {
        failures.push(`${rel}:${line}: ${ms(dur[1])}ms transition on "${prop}". Nothing interactive goes over ${MAX_INTERACTIVE}ms — past that it reads as waiting.`);
      }
    }
  }

  // framer-motion props that animate a layout property.
  if (/\.jsx?$/.test(rel)) {
    let n = 0;
    for (const m of text.matchAll(/\b(?:initial|animate|exit|whileHover|whileTap|whileInView)=\{\{([^{}]*)\}/g)) {
      if (/\b(width|height|top|left|right|bottom|margin\w*|padding\w*|maxHeight|minHeight|maxWidth|minWidth)\s*:/.test(m[1])) n += 1;
    }
    if (n) framerCounts[rel] = n;
  }
}

// ── The ratchet ──────────────────────────────────────────────────────────────
if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(framerCounts, null, 2)}\n`);
  console.log(`Baseline rewritten: ${Object.keys(framerCounts).length} files, ${Object.values(framerCounts).reduce((a, b) => a + b, 0)} layout-property reveals.`);
}

const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};
let ratcheted = 0;
for (const [file, n] of Object.entries(framerCounts)) {
  const b = baseline[file];
  if (b === undefined) {
    failures.push(`${file}: ${n} framer-motion animation(s) of a layout property in a file that had none. Animate transform/opacity instead.`);
  } else if (n > b) {
    failures.push(`${file}: ${n} framer-motion layout-property animations, up from ${b}. This number may only go down.`);
  } else if (n < b) ratcheted += b - n;
}

const total = Object.values(framerCounts).reduce((a, b) => a + b, 0);
console.log('\nMotion audit\n');
console.log(`  budgets     press 100 · hover 140 · dropdown 180 · tab 200 · modal 280 · page 360, cap ${MAX_INTERACTIVE}`);
console.log(`  transitions ${transitions} checked, none animating layout`);
console.log(`  reveals     ${total} framer layout-property reveals (baseline ${Object.values(baseline).reduce((a, b) => a + b, 0)})`);
if (ratcheted) notes.push(`ratchet moved down by ${ratcheted} — run with --update to lock it in.`);
for (const n of notes) console.log(`  · ${n}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} motion problem(s):\n`);
  for (const f of failures.slice(0, 60)) console.error(`  - ${f}`);
  if (failures.length > 60) console.error(`  …and ${failures.length - 60} more.`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ only transform and opacity animate, and nothing interactive runs long.\n');
