// ─────────────────────────────────────────────────────────────────────────────
// Spacing and radius audit.
//
// The rules, from src/lib/tokens/space.js:
//
//   • Four-point grid. Every spacing value is a multiple of 4.
//   • Eight-point rhythm. Every LAYOUT value — a gap between components, a
//     container's padding, the margin under a heading — is a multiple of 8.
//     The 4s are for optical nudges INSIDE a component only.
//   • Radius comes from a fixed set: 0, 4, 8, 12, 16, 24, pill.
//   • Nested radii are concentric: inner = outer − the padding between them.
//
// ── Why this ratchets instead of failing ────────────────────────────────────
// This app has ~2,500 inline gap values and ~700 radii, and they land on every
// integer from 1 to 22. Failing the build on all of them today fails it on the
// first run, and a check that has never once passed is a check somebody deletes
// rather than fixes.
//
// So it is a SHRINK-ONLY BASELINE, the same mechanism the color lint uses and
// for the same reason: new code cannot add an off-grid value to a clean file,
// a file that already has them can only ever have fewer, and the number in the
// baseline is a public count of the debt rather than a vague feeling that the
// spacing is "a bit inconsistent".
//
// The one thing that hard-fails is the token layer itself: if SP or RADIUS
// stops being on the grid, every consumer of them is wrong at once.
//
// Run: node scripts/verifySpacing.mjs [--update]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SP, RADIUS, GRID, LAYOUT_MIN, onGrid, isLayoutSpace, nested } from '../src/lib/tokens/space.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'spacingBaseline.json');
const UPDATE = process.argv.includes('--update');

const failures = [];
const notes = [];

// ── 1. The token layer itself ────────────────────────────────────────────────
for (const [name, px] of Object.entries(SP)) {
  if (!onGrid(px)) failures.push(`SP.${name} is ${px}, which is not a multiple of ${GRID}.`);
  if (name !== 'nudge' && !isLayoutSpace(px)) failures.push(`SP.${name} is ${px}; every step except \`nudge\` must be a legal layout value (>= ${LAYOUT_MIN}).`);
}
for (const [name, px] of Object.entries(RADIUS)) {
  if (px !== RADIUS.pill && px % GRID !== 0) failures.push(`RADIUS.${name} is ${px}, which is not a multiple of ${GRID}.`);
}
if (nested(16, 4) !== 12) failures.push('nested() no longer computes inner = outer − inset; concentric corners depend on it.');

// The component layer must take its geometry from the sets, not from literals.
{
  const cmp = fs.readFileSync(path.join(SRC, 'lib/tokens/components.js'), 'utf8');
  for (const m of cmp.matchAll(/\b(cardRadius|cardPadding|cardQuietRadius|cardQuietPadding)\s*:\s*([^,\n]+)/g)) {
    if (/^\d/.test(m[2].trim())) failures.push(`components.js: ${m[1]} is the literal ${m[2].trim()}. Geometry comes from RADIUS/SP in ./space.js.`);
  }
}

// ── 2. The ratchet ───────────────────────────────────────────────────────────
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

const RADIUS_SET = new Set(Object.values(RADIUS));
const files = walk(SRC).filter((f) => !f.includes(`${path.sep}lib${path.sep}tokens${path.sep}`));

const counts = {};
let offGrid = 0;
let offSet = 0;
let subEight = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  let grid = 0;
  let radii = 0;

  // gap / padding / margin, as plain numbers.
  for (const m of text.matchAll(/\b(gap|rowGap|columnGap|padding|margin|marginTop|marginBottom|marginLeft|marginRight|paddingTop|paddingBottom|paddingLeft|paddingRight)\s*:\s*(\d+)(?![\d.%])/g)) {
    const px = Number(m[2]);
    if (px === 0) continue;
    if (!onGrid(px)) { grid += 1; offGrid += 1; }
    else if (/^(gap|rowGap|columnGap|padding)$/.test(m[1]) && px < LAYOUT_MIN) { grid += 1; subEight += 1; }
  }
  // padding shorthands: '12px 16px'
  for (const m of text.matchAll(/\bpadding\s*:\s*'([^']+)'/g)) {
    for (const part of m[1].split(/\s+/)) {
      const px = Number(part.replace('px', ''));
      if (!Number.isFinite(px) || px === 0) continue;
      if (!onGrid(px)) { grid += 1; offGrid += 1; }
    }
  }
  for (const m of text.matchAll(/\bborderRadius\s*:\s*(\d+)(?![\d.%])/g)) {
    if (!RADIUS_SET.has(Number(m[1]))) { radii += 1; offSet += 1; }
  }

  if (grid || radii) counts[rel] = { grid, radii };
}

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`Baseline rewritten: ${Object.keys(counts).length} files, ${offGrid + subEight} off-grid spacings, ${offSet} off-set radii.`);
}

const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};
let ratcheted = 0;
for (const [file, c] of Object.entries(counts)) {
  const b = baseline[file];
  if (!b) {
    failures.push(`${file}: ${c.grid} off-grid spacing value(s) and ${c.radii} off-set radius/radii in a file that had none. Use SP and RADIUS from src/lib/tokens/space.js.`);
    continue;
  }
  if (c.grid > b.grid) failures.push(`${file}: ${c.grid} off-grid spacing values, up from ${b.grid}. Layout gaps start at ${LAYOUT_MIN} and step by ${GRID}; 4 is for optical nudges inside a component. If you are typing 14px of padding, the component is wrong, not the scale.`);
  if (c.radii > b.radii) failures.push(`${file}: ${c.radii} off-set radii, up from ${b.radii}. The set is ${Object.values(RADIUS).filter((r) => r < 999).join(', ')} and pill.`);
  ratcheted += Math.max(0, b.grid - c.grid) + Math.max(0, b.radii - c.radii);
}

const baseTotal = Object.values(baseline).reduce((n, c) => n + c.grid + c.radii, 0);
console.log('\nSpacing and radius audit\n');
console.log(`  grid        ${GRID}pt, ${LAYOUT_MIN}pt rhythm for layout; radius set ${Object.values(RADIUS).filter((r) => r < 999).join('/')}/pill`);
console.log(`  off-grid    ${offGrid} not a multiple of ${GRID}, ${subEight} layout gaps under ${LAYOUT_MIN}`);
console.log(`  off-set     ${offSet} radii outside the set`);
console.log(`  ratchet     ${offGrid + subEight + offSet} of a baseline ${baseTotal}`);
if (ratcheted) notes.push(`ratchet moved down by ${ratcheted} — run with --update to lock it in.`);
for (const n of notes) console.log(`  · ${n}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} spacing problem(s):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more.`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ the grid holds at the token layer, and the off-grid count is not growing.\n');
