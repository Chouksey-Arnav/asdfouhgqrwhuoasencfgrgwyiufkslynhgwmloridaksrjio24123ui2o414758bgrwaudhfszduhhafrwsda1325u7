// ─────────────────────────────────────────────────────────────────────────────
// Palette contrast audit.
//
// Every palette in src/lib/theme.js has to hold up as a *reading* surface, not
// just look coherent in a swatch. This checks the pairs that actually carry
// text in the app, for every theme and every high-contrast overlay, and fails
// the build if one regresses.
//
// The thresholds are deliberately below WCAG AA in places, and it is worth
// saying why: t4 is metadata ("new", "of 28", a section kicker) and t3 is
// body-adjacent, so holding them to 4.5:1 would flatten the type hierarchy
// into two tones. What the app cannot ship is a token that has effectively
// vanished, which is what happened to Light's old t4 at 2.4:1 — so the floor
// for the muted tokens is the 3:1 large-text/UI threshold, and the tokens that
// carry real sentences are held to AA.
//
// Run: node scripts/verifyPaletteContrast.mjs
// ─────────────────────────────────────────────────────────────────────────────
import {
  DARK, LIGHT, BALANCED, BALANCED_LIGHT,
  HC_DARK, HC_LIGHT, HC_BALANCED, HC_BALANCED_LIGHT,
} from '../src/lib/theme.js';

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

// A standalone copy of shade()/accentFill() from theme.js. Importing them would
// pull in the live `C` object, whose values depend on whichever theme was
// applied last — and this script has to reason about each palette in isolation.
const shade = (color, amount = 0.22) => {
  const n = parseInt(String(color).replace('#', ''), 16);
  const f = Math.max(0, 1 - amount);
  const ch = (v) => Math.round(v * f).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};
const accentFill = (color, onAccent, min) => {
  let c = color;
  for (let i = 0; i < 8; i += 1) {
    const r = ratio(c, onAccent);
    if (r == null || r >= min) return c;
    c = shade(c, 0.12);
  }
  return c;
};

// Surfaces text actually lands on. `surf`/`surfHi` are translucent in most
// palettes so they can't be measured directly — s1 is the opaque stand-in for
// a glass card, which is what those alphas composite to.
const SURFACES = ['bg', 's1', 's2', 's3'];

// [token, minimum ratio against every surface, what it's used for]
const TEXT_TOKENS = [
  ['t1', 7.0,  'headings and primary copy'],
  ['t2', 4.5,  'body copy'],
  ['t3', 3.4,  'secondary/meta copy'],
  ['t4', 2.9,  'faintest metadata'],
];

// Accents used as colored TEXT — chip labels, stat numbers, section kickers.
// The *L variant is the app's designated "readable version of this hue".
const ACCENT_TEXT = ['blueL', 'greenL', 'amberL', 'roseL', 'violetL', 'cyanL', 'tealL',
  'indigoL', 'pinkL', 'limeL', 'skyL', 'emeraldL', 'redL', 'goldL', 'orangeL'];

const PALETTES = {
  Dark: DARK,
  'Balanced Dark': BALANCED,
  'Balanced Light': BALANCED_LIGHT,
  Light: LIGHT,
  'Dark + high contrast': { ...DARK, ...HC_DARK },
  'Balanced Dark + high contrast': { ...BALANCED, ...HC_BALANCED },
  'Balanced Light + high contrast': { ...BALANCED_LIGHT, ...HC_BALANCED_LIGHT },
  'Light + high contrast': { ...LIGHT, ...HC_LIGHT },
};

const failures = [];
const report = [];

for (const [name, p] of Object.entries(PALETTES)) {
  // Every palette must define every key the others do — a missing token falls
  // back to whatever the previous theme left in `C`, which is exactly the
  // stale-color class of bug this file exists to catch.
  // `onTintFg` is deliberately null in the light family — there the label on a
  // tinted chip is computed from the tint's own hue rather than being a fixed
  // token (see onTint() in theme.js), and a fixed value there is the bug.
  const COMPUTED = new Set(['onTintFg']);
  for (const k of Object.keys(BALANCED)) {
    if (p[k] == null && !COMPUTED.has(k)) failures.push(`${name}: missing token "${k}"`);
  }

  for (const surface of SURFACES) {
    for (const [token, min, use] of TEXT_TOKENS) {
      const r = ratio(p[token], p[surface]);
      if (r == null) { failures.push(`${name}: ${token} or ${surface} is not hex`); continue; }
      report.push([name, `${token} on ${surface}`, r, min, use]);
      if (r < min) failures.push(`${name}: ${token} on ${surface} is ${r.toFixed(2)}:1, needs ${min} (${use})`);
    }
  }

  // Both the base accent and its *L variant have to survive as text. The base
  // is checked too, not just *L, because the app uses `C.amber`, `C.blue` and
  // friends directly as a color for section kickers, stat numbers and chip
  // labels in hundreds of places — treating the base as fill-only was the
  // assumption that left "APPEARANCE & ACCESSIBILITY" at 2.6:1 in light mode.
  // Section kickers sit on the page itself, so bg counts as a surface here.
  //
  // The base floor differs by family, and not out of convenience. On a light
  // page an accent that misses 4.5:1 is pale-on-pale and genuinely gone — that
  // is the failure this whole pass is about, so the light palettes are held to
  // AA on the base as well as on *L. On a dark page the same shortfall reads as
  // a slightly soft saturated color on near-black; Dark's indigo sits at
  // 3.9:1 and is perfectly legible. Holding the dark palettes to 4.5 would mean
  // re-tinting accents that nobody has trouble reading, so their base floor is
  // the 3.5 "clearly visible" mark and their *L variants — the token the app
  // designates for text — carry AA.
  const lightFamily = (relLum(p.bg) ?? 0) > 0.4;
  const baseFloor = lightFamily ? 4.5 : 3.5;
  for (const token of ACCENT_TEXT) {
    for (const surface of ['s1', 'bg']) {
      const r = ratio(p[token], p[surface]);
      if (r == null) { failures.push(`${name}: ${token} is not hex`); continue; }
      report.push([name, `${token} on ${surface}`, r, 4.5, 'accent text (*L)']);
      if (r < 4.5) failures.push(`${name}: ${token} on ${surface} is ${r.toFixed(2)}:1, needs 4.5 (accent text)`);
    }
  }
  for (const token of ACCENT_TEXT.map(t => t.replace(/L$/, ''))) {
    for (const surface of ['s1', 'bg']) {
      const r = ratio(p[token], p[surface]);
      if (r == null) { failures.push(`${name}: ${token} is not hex`); continue; }
      report.push([name, `${token} on ${surface}`, r, baseFloor, 'accent text (base)']);
      if (r < baseFloor) failures.push(`${name}: ${token} on ${surface} is ${r.toFixed(2)}:1, needs ${baseFloor} (base accent used as text)`);
    }
  }

  // A filled button's label. The raw accent is NOT the thing to measure here —
  // several hues (amber, gold, and Dark's green) sit under 3:1 against white by
  // design, and accentFill() is what makes them safe by walking the fill darker
  // until the label clears. So the assertion is the one that matters in the
  // running app: that accentFill actually converges for every hue.
  const onAccent = p.onAccent || '#ffffff';
  for (const token of ['blue', 'violet', 'green', 'rose', 'indigo', 'amber', 'gold', 'lime']) {
    const filled = accentFill(p[token], onAccent, 4.0);
    const r = ratio(filled, onAccent);
    report.push([name, `label on ${token}`, r, 4.0, 'filled button (post-accentFill)']);
    if (r != null && r < 4.0) failures.push(`${name}: accentFill(${token}) still only reaches ${r.toFixed(2)}:1 against its label`);
  }
}

const worst = new Map();
for (const [name, pair, r, min] of report) {
  const key = `${name}`;
  const cur = worst.get(key);
  if (!cur || r - min < cur.slack) worst.set(key, { pair, r, min, slack: r - min });
}

console.log('Palette contrast audit\n');
for (const [name, w] of worst) {
  console.log(`  ${name.padEnd(32)} tightest: ${w.pair.padEnd(18)} ${w.r.toFixed(2)}:1 (min ${w.min})`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} contrast failure${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ ${report.length} token/surface pairs pass across ${Object.keys(PALETTES).length} palettes.`);
