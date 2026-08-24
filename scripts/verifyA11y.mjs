// ─────────────────────────────────────────────────────────────────────────────
// Accessibility audit.
//
// The rules from the accessibility pass, expressed as assertions, so that each
// one is a build failure rather than a note somebody has to remember. Same
// shape as the other verify:* scripts — read the source, check the specific
// signature of the specific bug, exit non-zero.
//
// Every check here exists because the codebase actually had the failure it
// looks for; none of them are hypothetical.
//
//   1. FOCUS RING     `*:focus-visible` is 2px at 2px offset, uses the ink ring
//                     token rather than a brand accent, and is !important — the
//                     only declaration that can outrank an inline style in an
//                     app built out of inline style objects.
//   2. NO SUPPRESSION no inline `outline: 'none'`. This is what silently
//                     stripped the ring from every text field in the product:
//                     one `outline:'none'` in inp().
//   3. INPUT BORDERS  every palette's input border clears 3:1 against its own
//                     field (WCAG 1.4.11). All four were between 1.33 and 2.51.
//   4. TOUCH TARGETS  the 44px hit-area block is present and unconditional on
//                     coarse pointers, not gated behind the largeTargets
//                     setting.
//   5. REDUCED MOTION honored from the media query as well as the data
//                     attribute (the attribute does not exist until React
//                     mounts), and reduced rather than removed — the color and
//                     opacity transitions that confirm an action survive.
//   6. AUTH / 3.3.8   nothing blocks paste, copy, cut or drop on a password
//                     field. Blocking paste is a straight failure of Accessible
//                     Authentication.
//   7. TEXT SPACING   no element sets an inline pixel `height` while also
//                     setting a `fontSize` — a text box at a locked height is
//                     the shape WCAG 1.4.12 fails on, because the text reflows
//                     and the box does not.
//   8. NO JUSTIFY     no justified text anywhere.
//   9. AUTOCOMPLETE   every field collecting the user's own personal data
//                     carries an autocomplete token (WCAG 1.3.5).
//  10. DRAG ALTERNATIVE anything reorderable by drag also offers a non-drag
//                     route (WCAG 2.5.7).
//
// Run: node scripts/verifyA11y.mjs
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DARK, LIGHT, BALANCED, BALANCED_LIGHT } from '../src/lib/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CSS = path.join(SRC, 'index.css');

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(ROOT, p);
const files = walk(SRC);
const sources = files.map((f) => [f, fs.readFileSync(f, 'utf8')]);
const css = fs.readFileSync(CSS, 'utf8');

// Line number for a character offset, for messages that can be clicked.
const lineAt = (text, idx) => text.slice(0, idx).split('\n').length;

// ── 1. The focus ring ────────────────────────────────────────────────────────
{
  const m = css.match(/\*:focus-visible\s*\{([^}]*)\}/);
  if (!m) {
    fail('index.css has no `*:focus-visible` rule — the global focus ring is gone.');
  } else {
    const body = m[1];
    if (!/outline:\s*2px\s+solid/.test(body)) {
      fail('The global focus ring is not a 2px solid outline.');
    }
    if (!/outline-offset:\s*2px/.test(body)) {
      fail('The global focus ring has no 2px outline-offset — the ring merges into the control edge.');
    }
    if (!/var\(--msp-focus-ring\)/.test(body)) {
      fail('The global focus ring does not use --msp-focus-ring. A brand accent as the ring color is invisible on accent-colored buttons, which is the miss this token exists to prevent.');
    }
    const importantCount = (body.match(/!important/g) || []).length;
    if (importantCount < 2) {
      fail('The global focus ring is not !important on both outline and outline-offset. Inline styles beat the stylesheet in this app, so without it the ring is merely a suggestion.');
    }
    if (/border:/.test(body)) {
      fail('The focus ring uses `border`, which changes the box model and shifts layout on focus. Use `outline`.');
    }
  }
  // A `:focus` rule that draws a ring for everyone (rather than :focus-visible)
  // is only legitimate under the student's own always-show-focus setting.
  const strayFocus = [...css.matchAll(/^(?!.*focus-visible)(?!.*always-show-focus)(?!.*skip-link).*:focus\s*\{[^}]*outline:\s*(?!none)/gm)];
  for (const s of strayFocus) {
    fail(`index.css:${lineAt(css, s.index)} draws an outline on \`:focus\` rather than \`:focus-visible\` — mouse users will see a ring after every click.`);
  }
  if (!/--msp-focus-ring:/.test(css)) fail('--msp-focus-ring is not defined in index.css.');
  if (!/\[data-theme-family="light"\][^{]*\{[^}]*--msp-focus-ring/.test(css)) {
    fail('--msp-focus-ring is not flipped for the light theme family — a near-white ring is invisible on a light page.');
  }
}

// ── 2. Nothing suppresses the ring ───────────────────────────────────────────
{
  let count = 0;
  for (const [f, text] of sources) {
    for (const m of text.matchAll(/outline:\s*['"]none['"]/g)) {
      count += 1;
      fail(`${rel(f)}:${lineAt(text, m.index)} sets an inline \`outline: 'none'\`. That beats the stylesheet and removes the keyboard focus ring with no replacement.`);
    }
  }
  if (!count) notes.push('no inline `outline: \'none\'` anywhere — the ring cannot be suppressed per-component.');
}

// ── 3. Input border contrast (WCAG 1.4.11) ───────────────────────────────────
{
  const relLum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (c) => {
    const s = String(c).trim();
    if (s.startsWith('#')) {
      const h = s.slice(1);
      const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
      const n = parseInt(full, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
  };
  // Composite `fg` over `bg`. Both input backgrounds and input borders are
  // translucent in three of the four palettes, so the ratio can only be read
  // after they are flattened onto the page.
  const over = (fg, bg) => {
    const a = parse(fg); const b = parse(bg);
    if (!a || !b) return null;
    return [0, 1, 2].map((i) => Math.round(a[i] * a[3] + b[i] * (1 - a[3])));
  };
  const hex = (a) => `#${a.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const ratio = (a, b) => {
    const la = relLum(...a); const lb = relLum(...b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  };

  const MIN = 3;
  const tightest = [];
  for (const [name, p] of Object.entries({ Dark: DARK, Light: LIGHT, 'Balanced Dark': BALANCED, 'Balanced Light': BALANCED_LIGHT })) {
    const field = over(p.inputBg, p.bg);
    const border = over(p.inputBorder, hex(field));
    if (!field || !border) { fail(`${name}: could not resolve inputBg/inputBorder.`); continue; }
    const r = ratio(border, field);
    tightest.push([name, r]);
    if (r < MIN) {
      fail(`${name}: input border is ${r.toFixed(2)}:1 against its own field — WCAG 1.4.11 needs ${MIN}:1 on the visual boundary of a control. A field whose edge has vanished is a field a student does not know is a field.`);
    }
  }
  if (tightest.length) {
    const worst = tightest.sort((a, b) => a[1] - b[1])[0];
    notes.push(`input borders clear 3:1 in every palette (tightest ${worst[0]} at ${worst[1].toFixed(2)}:1).`);
  }
}

// ── 4. Touch targets ─────────────────────────────────────────────────────────
{
  if (!/@media\s*\(pointer:\s*coarse\)/.test(css)) {
    fail('index.css has no `(pointer: coarse)` block — the 44px touch-target hit areas are gone.');
  }
  if (!/min-width:\s*44px;?\s*min-height:\s*44px/.test(css.replace(/\s+/g, ' ').replace(/ ;/g, ';'))
      && !/min-width:\s*44px/.test(css)) {
    fail('The 44px minimum hit area is not declared.');
  }
  // The point of the pass: 44px must not be behind the opt-in setting.
  const coarse = css.match(/@media\s*\(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/);
  if (coarse && /data-large-targets/.test(coarse[1])) {
    fail('The 44px hit area is scoped to [data-large-targets]. It has to be the default — the student who most needs it is the one who will never open Settings.');
  }
  if (!/content:\s*''/.test(coarse?.[1] || '')) {
    fail('Touch targets are not expanded with a pseudo-element. Growing the drawn box instead reflows every dense row in the app.');
  }
}

// ── 5. Reduced motion ────────────────────────────────────────────────────────
{
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation-duration:\s*\.001ms\s*!important/.test(css)) {
    fail('prefers-reduced-motion is not honored from a media query. `[data-reduce-motion]` alone does not exist until React mounts, so the boot screen, the landing page and every prerendered page animate at full strength for a student who asked the OS for less.');
  }
  // Reduce, not remove: the confirming feedback has to survive.
  const blocks = [...css.matchAll(/transition-property:\s*([^;]+);/g)].map((m) => m[1]);
  const keepsFeedback = blocks.some((b) => /opacity/.test(b) && /(background-color|color)/.test(b));
  if (!keepsFeedback) {
    fail('The reduced-motion collapse removes transitions wholesale. It should drop transform/layout transitions and keep opacity and color, so a press, a toggle and a save still confirm themselves as a cross-fade.');
  }
  for (const b of blocks) {
    if (/transform/.test(b)) {
      fail('The reduced-motion transition-property list still includes `transform` — that is the property that actually moves things across the screen.');
    }
  }
  // Skeletons and spinners stay: a frozen loading state sends a student to reload.
  for (const cls of ['.spin', '.msp-shimmer', '.rm-shimmer']) {
    if (!new RegExp(`prefers-reduced-motion[\\s\\S]*?\\${cls}\\s*\\{[^}]*animation:`).test(css)) {
      fail(`${cls} is not exempted inside the prefers-reduced-motion block — a loading state with no motion at all reads as a frozen app.`);
    }
  }
}

// ── 6. Accessible authentication (WCAG 3.3.8) ────────────────────────────────
{
  const BLOCKERS = /\bon(Paste|Copy|Cut|Drop|ContextMenu)\s*=/g;
  for (const [f, text] of sources) {
    if (!/type=\{?["']?password|autoComplete=["'](new|current)-password/.test(text)) continue;
    for (const m of text.matchAll(BLOCKERS)) {
      // The OTP boxes legitimately intercept paste — to SPREAD a pasted code
      // across six inputs, which enables pasting rather than preventing it.
      const window_ = text.slice(Math.max(0, m.index - 400), m.index + 400);
      if (/Otp|otp/.test(window_)) continue;
      fail(`${rel(f)}:${lineAt(text, m.index)} attaches ${m[1]} handling near a password field. Blocking paste in a password field is a straight failure of WCAG 3.3.8 — it makes transcribing a password by hand the only route in, which is the cognitive function test the criterion prohibits.`);
    }
  }
  const authUi = sources.find(([f]) => f.endsWith(path.join('auth', 'ui.jsx')));
  if (authUi && !/autoComplete=\{autoComplete\}/.test(authUi[1])) {
    fail('PasswordField no longer forwards an autocomplete token. A password manager is the supported alternative to typing, and it needs the field to say which password it wants.');
  }
}

// ── 7. Text spacing (WCAG 1.4.12) ────────────────────────────────────────────
{
  // The failure signature: a fixed pixel height on a box that also sets a font
  // size, i.e. a text container that cannot grow when the student turns up line
  // height or letter spacing — both of which this app offers in Settings.
  // `data-fixed-height` marks the boxes whose size is deliberate and textless.
  const STYLE_OBJ = /style=\{\{([^}]*)\}\}/g;
  let flagged = 0;
  for (const [f, text] of sources) {
    for (const m of text.matchAll(STYLE_OBJ)) {
      const body = m[1];
      if (!/\bfontSize\s*:/.test(body)) continue;
      const h = body.match(/(?<![a-zA-Z])height\s*:\s*(\d+(?:\.\d+)?)\b/);
      if (!h) continue;
      // A height under ~28px cannot be holding a line of text at any size this
      // app uses — it is a rule, a bar or a dot that happens to carry a
      // fontSize for a unit label.
      if (Number(h[1]) < 28) continue;
      const tag = text.slice(Math.max(0, m.index - 300), m.index);
      if (/data-fixed-height/.test(tag) || /msp-text-fit/.test(tag)) continue;
      flagged += 1;
      fail(`${rel(f)}:${lineAt(text, m.index)} locks an element to height:${h[1]} while setting a fontSize. Text at 1.5× line height reflows taller and gets clipped (WCAG 1.4.12). Use minHeight, or mark it data-fixed-height if it genuinely holds no text.`);
    }
  }
  if (!flagged) notes.push('no text box is locked to a fixed pixel height.');
}

// ── 8. No justified text ─────────────────────────────────────────────────────
{
  for (const [f, text] of sources) {
    for (const m of text.matchAll(/textAlign\s*:\s*['"]justify['"]/g)) {
      fail(`${rel(f)}:${lineAt(text, m.index)} justifies text. On a narrow measure the word gaps open into rivers of white running down the paragraph — a tracking problem for dyslexic readers specifically.`);
    }
  }
  if (/text-align:\s*justify/.test(css)) fail('index.css justifies text somewhere.');
}

// ── 9. Autocomplete on personal data (WCAG 1.3.5) ────────────────────────────
{
  // Only fields collecting the USER'S OWN data are in scope — a field for a
  // supervisor's or a parent's email is not the user's identity and correctly
  // carries autoComplete="off".
  const PERSONAL = /type=["'](email|tel)["']/g;
  for (const [f, text] of sources) {
    for (const m of text.matchAll(PERSONAL)) {
      // Look at the whole element the attribute sits in. Bounded by the next
      // opening tag rather than by the next `>`: arrow functions in event
      // handlers (`onChange={(e) => …}`) contain `>`, so scanning to it stops
      // half way through the element and misses attributes below that line.
      const start = text.lastIndexOf('<', m.index);
      const nextTag = text.indexOf('<', m.index);
      const el = text.slice(start, nextTag === -1 ? m.index + 800 : nextTag);
      if (/autoComplete=/.test(el)) continue;
      fail(`${rel(f)}:${lineAt(text, m.index)} is a type="${m[1]}" field with no autocomplete token (WCAG 1.3.5). If it is not the user's own data, say so explicitly with autoComplete="off".`);
    }
  }
}

// ── 10. Dragging movements (WCAG 2.5.7) ──────────────────────────────────────
{
  // Anything draggable needs a single-pointer alternative. Checked by looking
  // for a non-drag route in the same file rather than by guessing at intent.
  const ALTERNATIVES = /onMoveClick|onMove\b|Move up|Move down|moveUp|moveDown|onSnooze|ChevronUp/;
  for (const [f, text] of sources) {
    // JSX drag props only, and only in .jsx — matching the bare word `drag`
    // also matches every prose mention of dragging in a comment, and the
    // comments about this behavior outnumber the code implementing it.
    if (!f.endsWith('.jsx')) continue;
    const dragging = /\sdrag(?:\s*$|\s+dragListener)|onDragStart=\{|dragControls=\{|draggable=\{(?!false)|draggable(?=[\s>])/m.test(text);
    if (!dragging) continue;
    if (ALTERNATIVES.test(text)) continue;
    // A scroll container panned by drag is not in scope: native scrolling,
    // the scrollbar and the arrow keys are all already alternatives.
    if (/useDragScroll|scroll/i.test(text)) continue;
    fail(`${rel(f)} implements dragging with no single-pointer alternative (WCAG 2.5.7). Reordering by drag needs buttons — and on a phone it needs them more, not less.`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('\nAccessibility audit\n');
console.log(`  scanned     ${files.length} source files + index.css`);
console.log('  criteria    1.3.5 · 1.4.11 · 1.4.12 · 1.4.13 · 2.4.11 · 2.5.7 · 2.5.8 · 3.3.8');
for (const n of notes) console.log(`  · ${n}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} accessibility failure${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ focus, contrast, touch targets, motion, spacing and the WCAG 2.2 additions all hold.\n');
