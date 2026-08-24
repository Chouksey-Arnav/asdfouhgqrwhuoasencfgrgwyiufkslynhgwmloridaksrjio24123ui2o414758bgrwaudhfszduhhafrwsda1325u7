// ─────────────────────────────────────────────────────────────────────────────
// The app-wide theme engine, and the flat token view every component reads.
//
// ── The three layers ────────────────────────────────────────────────────────
// Color lives in src/lib/tokens/, in three strictly separated layers:
//
//   primitives.js  raw values, no meaning, never touched by a component
//   semantic.js    the ONLY layer that varies per theme; named by meaning
//   components.js  aliases of semantic tokens; where restyling churn localises
//
// This file is the fourth thing: the runtime that resolves a mode to a theme,
// merges in the high-contrast overlay, and FLATTENS the result into `C`.
//
// ── Why `C` is a MUTABLE flat object rather than CSS custom properties ───────
// The obvious way to theme this app would be to make every token a
// `var(--c-blue)`. That doesn't work here, and it's worth writing down why so
// nobody "fixes" it back: the codebase composes colors by string concatenation
// in ~380 places — `border: 1px solid ${C.violet}28`, `boxShadow: 0 4px 16px
// ${accent}40`. That idiom appends a two-digit hex alpha to a six-digit hex
// color. `var(--c-violet)28` is not a color, it is a syntax error, and every
// one of those borders would silently vanish.
//
// So instead `C` stays a plain object of real hex/rgba strings, and switching
// theme MUTATES it in place and then remounts the React tree. Every style in
// the app is an inline style object computed during render, so a remount is all
// it takes for the entire UI to pick up the new palette — no per-component
// wiring, no context threading through 16k lines, and the concatenation idiom
// keeps working because the tokens are still real colors.
//
// The one rule this creates: never capture a token into a module-level object
// literal, because that snapshots the value at import time and it will never
// update. Build such maps inside a function instead (see catMeta below, which
// is computed per call for exactly this reason).
//
// CSS custom properties ARE still emitted (see applyTheme) — the legacy --c-*
// set for the handful of things index.css needs, plus the full --sem-* and
// --cmp-* sets so new stylesheet work can key off the token layers directly.
//
// ── The legacy key names ────────────────────────────────────────────────────
// `bg`/`s0`…`s5`, `b0`…`b3`, `t1`…`t4` predate the token layers and are read in
// roughly 4,000 places. They are kept as a COMPATIBILITY VIEW over the semantic
// layer — see LEGACY_SURFACES below for the mapping — rather than renamed in a
// single 466-file sweep. New code should prefer the semantic names.
//
// Two consequences of enforcing the token contract on that old view are worth
// knowing about, because both are visible:
//
//   • Exactly three border strengths. The old view had four; `b2` and `b3` now
//     both resolve to `border.strong`, so the handful of `b3` sites and the
//     ~100 `b2` sites render at one shared strength instead of two adjacent
//     ones. Structure gets slightly more present, never less.
//   • Exactly three foreground tiers. `t4` was a fourth tier used for metadata
//     and it is where contrast quietly rotted (2.4:1 at its worst). It now
//     resolves to `fg.tertiary`, the same as `t3`. `fg.disabled` exists for
//     genuinely-disabled controls and is deliberately not a text tier.
// ─────────────────────────────────────────────────────────────────────────────

import { THEMES, HC_OVERLAYS, HUE_NAMES } from './tokens/semantic.js';
import { componentTokens } from './tokens/components.js';
import { eyebrow } from './tokens/type.js';
import { RADIUS } from './tokens/space.js';
import { DUR, EASE, tr } from './tokens/motion.js';

// The non-color token layers are re-exported from here so a component has one
// import for "the design system" rather than four. They are separate FILES
// because they are separate concerns with separate lints; they are one import
// because nobody should have to remember which file `SP.lg` lives in.
export { SIZE, type, ls, lh, tracking, leading, eyebrow } from './tokens/type.js';
export { SP, RADIUS, GRID, nested, snapRadius, onGrid, isLayoutSpace } from './tokens/space.js';
export { DUR, EASE, MOTION, tr, exit, LOADING, MAX_INTERACTIVE } from './tokens/motion.js';

/**
 * The transition every control shares: paint-only properties plus transform,
 * at the hover duration. Never `all` — `all` includes width, height and
 * padding, which is how a button animation ends up doing layout on every frame.
 */
export const CONTROL_TRANSITION = tr(
  ['background-color', 'border-color', 'color', 'box-shadow', 'transform', 'opacity'],
  DUR.hover,
  EASE.state,
);

/** Legacy surface slot → semantic surface step. */
const LEGACY_SURFACES = { bg: 'canvas', s0: 'canvasSubtle', s1: 'default', s2: 'inset', s3: 'raised', s4: 'hover', s5: 'pressed' };
/** Legacy border slot → semantic strength. Three strengths, four slots. */
const LEGACY_BORDERS = { b0: 'subtle', b1: 'default', b2: 'strong', b3: 'strong' };
/** Legacy text slot → semantic tier. Three tiers, four slots. */
const LEGACY_TEXT = { t1: 'primary', t2: 'secondary', t3: 'tertiary', t4: 'tertiary' };

/** Deep-merge a high-contrast overlay onto a semantic theme. */
const mergeOverlay = (sem, hc) => {
  if (!hc) return sem;
  const out = { ...sem };
  for (const [k, v] of Object.entries(hc)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...(sem[k] || {}) };
      for (const [kk, vv] of Object.entries(v)) {
        out[k][kk] = (vv && typeof vv === 'object') ? { ...(sem[k]?.[kk] || {}), ...vv } : vv;
      }
    } else out[k] = v;
  }
  return out;
};

/**
 * Flatten a resolved semantic theme into the legacy `C` shape.
 *
 * Nothing here invents a value: every entry is a lookup into the semantic
 * layer. That is the property that makes the flat view safe to keep — it cannot
 * drift away from the tokens, because it has nothing of its own to drift with.
 */
export function flatten(sem) {
  const cmp = componentTokens(sem);
  const flat = {};

  for (const [slot, step] of Object.entries(LEGACY_SURFACES)) flat[slot] = sem.surface[step];
  for (const [slot, s] of Object.entries(LEGACY_BORDERS)) flat[slot] = sem.border[s];
  for (const [slot, tier] of Object.entries(LEGACY_TEXT)) flat[slot] = sem.fg[tier];

  for (const name of HUE_NAMES) {
    const h = sem.hue[name];
    flat[name] = h.fg;
    flat[`${name}L`] = h.fgStrong;
    flat[`${name}Dim`] = h.subtleBg;
  }
  flat.blueLL = sem.accent.fgSoft;
  flat.blueD = sem.accent.deep;

  // Multi-hue gradients, composed from the flattened hues so they follow the
  // theme instead of being a second place a color is written down.
  flat.blueGrad = `linear-gradient(135deg,${flat.blue} 0%,${flat.blueD} 100%)`;
  flat.auroraGrad = `linear-gradient(120deg,${flat.blue} 0%,${flat.violet} 45%,${flat.pink} 100%)`;
  flat.oceanGrad = `linear-gradient(135deg,${flat.cyan} 0%,${flat.blue} 60%,${flat.indigo} 100%)`;
  flat.sunsetGrad = `linear-gradient(135deg,${flat.amber} 0%,${flat.rose} 55%,${flat.fuchsia} 100%)`;
  flat.forestGrad = `linear-gradient(135deg,${flat.green} 0%,${flat.teal} 55%,${flat.sky} 100%)`;
  flat.violetGrad = `linear-gradient(135deg,${flat.violet} 0%,${flat.indigo} 100%)`;

  flat.surf = sem.translucent.surface;
  flat.surf2 = sem.translucent.surfaceQuiet;
  flat.surfHi = sem.translucent.surfaceRaised;
  flat.inputBg = sem.translucent.inputBg;
  flat.inputBorder = sem.translucent.inputBorder;
  flat.shadow = sem.elevation.raised;
  flat.shadowSm = sem.elevation.quiet;
  flat.scrim = sem.scrim;
  flat.focusRing = sem.focusRing;

  // The label on a SOLID accent fill. In the dark themes this is dark ink on a
  // light fill; see the note in semantic.js.
  flat.onAccent = sem.fg.onSolid;
  // The label on a TRANSLUCENT accent TINT, which is a different problem and
  // must not reuse onAccent — on Balanced, onAccent is near-black, and a
  // near-black label on a dark tinted chip is invisible. `null` in the light
  // family means "compute it", see onTint() below.
  flat.onTintFg = sem.fg.onTint;
  flat.fgDisabled = sem.fg.disabled;

  flat.pageGlow = sem.pageGlow;
  flat.noiseOpacity = sem.noiseOpacity;
  flat.colorScheme = sem.colorScheme;

  flat.FD = sem.font.display;
  flat.FB = sem.font.body;
  flat.FM = sem.font.mono;

  // Component tokens ride along under a `cmp` namespace so a component can
  // reach for `C.cmp.cardBg` without a second import.
  flat.cmp = cmp;
  return flat;
}

/** The four palettes, in the flat shape the app has always consumed. */
export const DARK = flatten(THEMES.dark);
export const LIGHT = flatten(THEMES.light);
export const BALANCED = flatten(THEMES.balanced);
export const BALANCED_LIGHT = flatten(THEMES.balancedLight);

/**
 * High-contrast palettes: the base semantic theme with its overlay merged in,
 * then flattened. Exported flat (rather than as sparse overlays) because that
 * is what the audit script and every caller actually want.
 */
export const HC_DARK = flatten(mergeOverlay(THEMES.dark, HC_OVERLAYS.dark));
export const HC_LIGHT = flatten(mergeOverlay(THEMES.light, HC_OVERLAYS.light));
export const HC_BALANCED = flatten(mergeOverlay(THEMES.balanced, HC_OVERLAYS.balanced));
export const HC_BALANCED_LIGHT = flatten(mergeOverlay(THEMES.balancedLight, HC_OVERLAYS.balancedLight));

/** The resolved semantic theme behind each mode, for callers that want the layers. */
export const SEMANTIC = THEMES;

// ── The live token object ────────────────────────────────────────────────────
// Everything in the app imports this. It is intentionally mutable; see the
// header comment. Starts as light so the very first render (before applyTheme
// runs) matches the app's default theme.
export const C = { ...BALANCED };

/**
 * The palette a mode resolves to. 'system' is not in here — it is a pointer.
 *
 * The key for Balanced Dark stays the bare 'balanced' it has always been so
 * that every student who already picked it keeps their theme across this
 * change; 'balancedDark' is accepted as an alias for anyone reading the code
 * and expecting symmetry (see normalizeMode).
 */
export const PALETTES = {
  balanced: BALANCED,
  balancedLight: BALANCED_LIGHT,
  dark: DARK,
  light: LIGHT,
};

/** Which resolved modes are light-on-dark, and which are dark-on-light. */
export const LIGHT_FAMILY = new Set(['light', 'balancedLight']);

export const THEME_MODES = ['balanced', 'balancedLight', 'dark', 'light', 'system'];
export const DEFAULT_THEME_MODE = 'balanced';
export const THEME_STORAGE_KEY = 'msp_themeMode';

/** Accepts the spelled-out alias for Balanced Dark; everything else passes through. */
export const normalizeMode = (mode) => (mode === 'balancedDark' ? 'balanced' : mode);

/** What the OS is currently asking for. Defaults to light when unknowable. */
export function systemPrefersLight() {
  try { return window.matchMedia('(prefers-color-scheme: light)').matches; }
  catch { return true; }
}

/**
 * 'system' → the concrete palette it currently resolves to.
 *
 * "Match my device" is a request to follow the light/dark signal, not a request
 * for the most extreme palette on that side — so it resolves to the Balanced
 * variant either way: Balanced Dark on a dark device, Balanced Light on a light
 * one. Picking Dark or Light explicitly still gets the ends of the range.
 */
export function resolveMode(mode) {
  const m = normalizeMode(mode);
  if (PALETTES[m]) return m;
  return systemPrefersLight() ? 'balancedLight' : 'balanced';
}

export function getStoredMode() {
  try {
    const v = normalizeMode(localStorage.getItem(THEME_STORAGE_KEY));
    return THEME_MODES.includes(v) ? v : DEFAULT_THEME_MODE;
  } catch { return DEFAULT_THEME_MODE; }
}

export function storeMode(mode) {
  const m = normalizeMode(mode);
  try { localStorage.setItem(THEME_STORAGE_KEY, THEME_MODES.includes(m) ? m : DEFAULT_THEME_MODE); } catch { /* private mode */ }
}

// The legacy --c-* set, which is what the existing rules in index.css read.
// Kept short on purpose: the flat object is the source of truth for inline
// styles, and a second, partially-overlapping copy of it would be a bug factory.
const CSS_VAR_TOKENS = [
  'bg', 's0', 's1', 's2', 's3', 's4', 's5', 'b1', 'b2', 'b3',
  't1', 't2', 't3', 't4', 'blue', 'blueL', 'blueDim', 'violet', 'rose', 'green', 'amber',
  'surf', 'surfHi', 'inputBg', 'inputBorder', 'pageGlow', 'noiseOpacity', 'scrim',
  'FD', 'FB', 'FM',
];

/**
 * Emit the semantic and component layers as CSS custom properties.
 *
 * `--sem-surface-default`, `--cmp-card-bg`, and so on. New stylesheet work
 * should use these rather than the legacy `--c-*` names; the alpha-suffix
 * concatenation idiom that keeps inline styles on the flat object doesn't apply
 * in a stylesheet, so there is no reason for CSS to stay on the old names.
 */
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
function emitLayerVars(root, sem, cmp) {
  const set = (name, v) => { if (v != null) root.style.setProperty(name, String(v)); };
  for (const [group, val] of Object.entries(sem)) {
    if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        if (v && typeof v === 'object') {
          for (const [kk, vv] of Object.entries(v)) set(`--sem-${kebab(group)}-${kebab(k)}-${kebab(kk)}`, vv);
        } else set(`--sem-${kebab(group)}-${kebab(k)}`, v);
      }
    } else set(`--sem-${kebab(group)}`, val);
  }
  for (const [k, v] of Object.entries(cmp)) set(`--cmp-${kebab(k)}`, v);
}

let currentResolved = DEFAULT_THEME_MODE;

/**
 * Switch the palette. Mutates `C` in place and writes the CSS custom properties
 * + `data-theme` attribute. Callers must remount the React tree afterwards (the
 * App does this with a `key`) so inline styles recompute — this function alone
 * cannot repaint components that already rendered.
 *
 * `opts.highContrast` layers the HC overlay on top of the chosen base.
 * `opts.fontStack` swaps the UI typeface (the dyslexia-friendly setting).
 */
export function applyTheme(mode = DEFAULT_THEME_MODE, opts = {}) {
  const resolved = resolveMode(mode);
  const sem = opts.highContrast
    ? mergeOverlay(SEMANTIC[resolved] || SEMANTIC.balanced, HC_OVERLAYS[resolved] || HC_OVERLAYS.balanced)
    : (SEMANTIC[resolved] || SEMANTIC.balanced);
  const flat = flatten(sem);

  // Reset first: without this, switching high-contrast back off would leave the
  // overlay's values behind, because Object.assign only ever adds.
  for (const k of Object.keys(C)) delete C[k];
  Object.assign(C, flat);

  if (opts.fontStack) { C.FB = opts.fontStack; C.FD = opts.fontStack; }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    // A data attribute, not a class. There are four themes plus a high-contrast
    // axis; `dark`-as-a-boolean-class cannot express that, and every system that
    // starts with the boolean ends up with `.dark.balanced.hc` selector soup.
    root.dataset.theme = resolved;
    // The family is what stylesheet rules should key off. Every "this rule
    // assumed a dark backdrop" correction in index.css applies to Balanced
    // Light exactly as much as it applies to Light, and pinning those rules to
    // [data-theme="light"] is how a new light palette ships half-styled.
    root.dataset.themeFamily = LIGHT_FAMILY.has(resolved) ? 'light' : 'dark';
    // Both dark themes declare `color-scheme: dark` so native scrollbars, date
    // pickers and form controls follow the page instead of rendering as a light
    // rectangle punched into it.
    root.style.colorScheme = C.colorScheme || resolved;
    for (const k of CSS_VAR_TOKENS) {
      if (C[k] != null) root.style.setProperty(`--c-${k}`, String(C[k]));
    }
    emitLayerVars(root, sem, C.cmp);
  }
  currentResolved = resolved;
  return resolved;
}

export function currentMode() { return currentResolved; }
/** True for Light and Balanced Light — anything that paints dark text on a light page. */
export function isLight() { return LIGHT_FAMILY.has(currentResolved); }
/** Balanced Dark and Dark both want the "light text on a dark page" treatment. */
export function isDarkFamily() { return !LIGHT_FAMILY.has(currentResolved); }

/**
 * Re-apply on OS theme change while the student is in 'system' mode.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange) {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => onChange?.(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  } catch { return () => {}; }
}

// ── Category identity maps ───────────────────────────────────────────────────
// Built per call rather than held as module-level literals: a frozen literal
// would snapshot the dark palette at import time and never follow a theme
// switch. See the header comment.
const CAT_KEYS = {
  'Life Sciences':                ['green',   'forestGrad', '🧬'],
  'Physical Sciences':            ['cyan',    'oceanGrad',  '⚗️'],
  'Behavioral & Social Sciences': ['pink',    'sunsetGrad', '🧠'],
  'Research Methods':             ['violet',  'violetGrad', '🔬'],
  'Test Prep':                    ['amber',   'sunsetGrad', '📝'],
  'Admissions & Planning':        ['blue',    'blueGrad',   '🎯'],
  'Clinical Exposure':            ['rose',    'sunsetGrad', '🩺'],
  'Wellness & Balance':           ['teal',    'forestGrad', '🌱'],
  'Math & Data':                  ['indigo',  'oceanGrad',  '📊'],
};

const metaFor = (hue, grad, emoji) => ({
  color: C[hue], light: C[`${hue}L`] || C[hue], dim: C[`${hue}Dim`] || C.blueDim, grad: C[grad], emoji,
});

/** Live category identity — recomputed on every call so it follows the theme. */
export const catMeta = (cat) => {
  const spec = CAT_KEYS[cat];
  return spec ? metaFor(spec[0], spec[1], spec[2]) : metaFor('blue', 'blueGrad', '📚');
};

/** Back-compat for call sites that read the map directly. Values stay live. */
export const CAT_META = new Proxy({}, {
  get: (_, k) => (typeof k === 'string' && CAT_KEYS[k] ? catMeta(k) : undefined),
  has: (_, k) => typeof k === 'string' && k in CAT_KEYS,
  ownKeys: () => Object.keys(CAT_KEYS),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

/**
 * Turn any color token into a translucent tint.
 * Handles hex (the common case) and falls back to color-mix() for rgba/named
 * inputs, so a caller passing an already-translucent token gets something
 * sensible rather than the string back unchanged.
 */
export const tint = (color, a = 0.12) => {
  const h = String(color).replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
};

/**
 * Darken a color toward black by `amount` (0–1).
 *
 * Exists so a gradient can be built from ONE hue — `linear-gradient(135deg,
 * ${c}, ${shade(c)})` — instead of pairing two different accents, which is what
 * turns a screen of buttons into a paint chart. Hex in, hex out; anything else
 * falls back to color-mix so a caller passing rgba still gets a darker color
 * rather than the string back unchanged.
 */
export const shade = (color, amount = 0.22) => {
  const h = String(color).replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    const n = parseInt(h, 16);
    const f = Math.max(0, 1 - amount);
    const ch = (v) => Math.round(v * f).toString(16).padStart(2, '0');
    return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round((1 - amount) * 100)}%, black)`;
};

const relLum = (hex) => {
  const h = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

/** WCAG contrast ratio between two hex colors. Null if either isn't hex. */
export const contrastRatio = (a, b) => {
  const [la, lb] = [relLum(a), relLum(b)];
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * A version of `color` dark enough to carry white label text.
 *
 * Light mode's amber and gold sit around 2.5:1 against white, so a filled
 * "Set your baseline" button was illegible on exactly the screen it matters
 * most on. Rather than banning those hues from buttons — they carry meaning —
 * this walks the color down until the label is readable, which changes nothing
 * for hues that already pass (every accent on the dark palettes).
 */
export const accentFill = (color, min = 4.0) => {
  let c = color;
  for (let i = 0; i < 8; i += 1) {
    const r = contrastRatio(c, C.onAccent || '#ffffff');
    if (r == null || r >= min) return c;
    c = shade(c, 0.12);
  }
  return c;
};

/**
 * Lighten a color toward white by `amount` (0–1). The mirror of shade().
 */
export const tone = (color, amount = 0.22) => {
  const h = String(color).replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    const n = parseInt(h, 16);
    const ch = (v) => Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0');
    return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round((1 - amount) * 100)}%, white)`;
};

/**
 * A version of `color` readable as TEXT on the given surface (default: a card).
 *
 * The counterpart to accentFill, which solves the opposite problem — that one
 * darkens a *fill* until white sits on it safely, this one moves a *word* until
 * it separates from what's behind it. Walks away from the surface (down on a
 * light page, up on a dark one) until it clears `min`, and returns the color
 * untouched when it already does, so nothing shifts in the themes that were
 * already fine.
 *
 * The case that forced it: pathway accents live in constants.js as fixed brand
 * hex (`physician: '#2d7fff'`) because a pathway's color is its identity, not a
 * theme token. #2d7fff is 3.1:1 on a white card — a fine border, an unreadable
 * heading — so every "UNIT 3" and "Physician (MD/DO)" label rendered in it was
 * washed out in light mode with no token to fix.
 */
export const accentText = (color, surface = null, min = 4.5) => {
  const bg = surface || C.s1 || C.bg;
  const goDark = (relLum(bg) ?? 1) > 0.4;
  let c = color;
  for (let i = 0; i < 10; i += 1) {
    const r = contrastRatio(c, bg);
    if (r == null || r >= min) return c;
    c = goDark ? shade(c, 0.14) : tone(c, 0.14);
  }
  return c;
};

/**
 * The label color for text sitting on a TRANSLUCENT TINT of `accent` — the
 * `background: ${accent}22` treatment used by every active nav pill, chip,
 * badge and soft-filled button in the app.
 *
 * On a dark page a 13%-alpha accent wash is still dark, so white reads. On a
 * light page it is a pale wash of an already-light surface, and white on it is
 * *nothing* — this was the single most widespread light-mode bug in the app:
 * the selected sidebar tab, the active sub-nav tab, the avatar initial, every
 * "Track" and "Add to Portfolio" button, and the Medabrain pull-tab all
 * rendered their label in #fff on near-white.
 *
 * So: white in the dark family, and a darkened accent in the light family,
 * which also keeps the label tied to the tint's own hue instead of going flat
 * gray.
 *
 * NOTE the token this reads: `onTintFg`, never `onAccent`. Those are two
 * different jobs and Balanced is where the difference bites — `onAccent` there
 * is near-black ink for a LIGHT solid fill, and near-black on a dark tinted
 * chip is nothing at all.
 */
export const onTint = (accent, min = 4.5) => (isLight() ? accentText(accent, C.s1, min) : (C.onTintFg || C.t1 || '#ffffff'));

/**
 * The label color for text on an arbitrary SOLID fill.
 *
 * `C.onAccent` is right whenever the fill really is an accent, which is the
 * overwhelming majority of call sites. It is wrong when a "button" is filled
 * with a surface token instead — `btn(C.s3)` — because Balanced's onAccent is
 * dark ink and a dark label on a dark surface disappears. So measure the fill
 * and pick the ink that survives on it.
 */
export const onFill = (bg) => {
  const ink = C.onAccent || '#ffffff';
  const r = contrastRatio(ink, bg);
  // Non-hex (a gradient string, an rgba) can't be measured — those are accent
  // fills in practice, so keep the accent ink.
  if (r == null) return ink;
  return r >= 3.5 ? ink : (C.t1 || '#ffffff');
};

/**
 * A two-stop gradient of `accent` for background-clipped TEXT (the big numbers
 * on every Stat tile).
 *
 * The original was `${color} → ${color}aa`, and the alpha is the problem: a 67%
 * wash of an accent composites toward whatever is behind it, so on a light card
 * the tail of every stat number faded to roughly 2.9:1. Fading away from the
 * surface instead of toward it keeps the same "the number catches the light"
 * effect while the faint end stays readable — darker on a light page, lighter
 * on a dark one.
 */
/**
 * A filled-button gradient of `accent` that is guaranteed to carry C.onAccent.
 *
 * Replaces the `linear-gradient(135deg,${c},${c}cc)` idiom that this codebase
 * repeats everywhere. That one has two failure modes and hits at least one of
 * them in every theme: the `cc` tail is 80% alpha, so it composites toward the
 * card and washes out, and the base hue is used raw — a bright amber or gold
 * button carrying a white label lands near 2.2:1 whatever the page is doing.
 * accentFill handles the base, and the tail is an opaque shade of it.
 */
export const accentGrad = (accent, amount = 0.2) => {
  const base = accentFill(accent);
  return `linear-gradient(135deg,${base},${shade(base, amount)})`;
};

export const accentSweep = (accent, amount = 0.22) =>
  `linear-gradient(135deg,${accent},${isLight() ? shade(accent, amount) : tone(accent, amount)})`;

// ── The primitives every screen is built from ────────────────────────────────
// These read the COMPONENT layer (C.cmp.*), not the semantic one. That is the
// whole point of the third layer: "cards should sit on the raised surface" is
// now one edit in tokens/components.js, and it reaches every card in the app.
export const glass  = (x={}) => ({ background:C.cmp.cardBg, border:`1px solid ${C.cmp.cardBorder}`, borderRadius:C.cmp.cardRadius, padding:C.cmp.cardPadding, boxShadow:C.cmp.cardShadow, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...x });
export const glass2 = (x={}) => ({ background:C.cmp.cardQuietBg, border:`1px solid ${C.cmp.cardBorder}`, borderRadius:C.cmp.cardQuietRadius, padding:C.cmp.cardQuietPadding, ...x });
// `color` is measured against the fill rather than pinned to onAccent: a couple
// of call sites pass a SURFACE token as the button background, and Balanced's
// onAccent is dark ink meant for a light accent fill. See onFill().
export const btn    = (bg=C.blueGrad,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px', borderRadius:RADIUS.sm, border:'none', background:bg, color:onFill(bg), fontWeight:600, fontSize:13, fontFamily:C.FB, cursor:'pointer', // A softer halo than the original 0 4px 16px @35%: the old one read as a lit
// object on every screen that had more than one button on it.
boxShadow:bg===C.blueGrad?`0 3px 12px ${tint(C.blue,0.22)},inset 0 1px 0 ${C.cmp.buttonSolidTopHighlight}`:C.shadowSm, transition:CONTROL_TRANSITION, ...x });
export const btnSm  = (bg=C.surfHi,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 12px', borderRadius:RADIUS.sm, border:`1px solid ${C.cmp.buttonQuietBorder}`, background:bg, color:C.cmp.buttonQuietFg, fontWeight:600, fontSize:12, fontFamily:C.FB, cursor:'pointer', transition:CONTROL_TRANSITION, ...x });
export const btnG   = (x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px', borderRadius:RADIUS.sm, border:`1px solid ${C.cmp.buttonGhostBorder}`, background:'transparent', color:C.cmp.buttonGhostFg, fontWeight:500, fontSize:13, fontFamily:C.FB, cursor:'pointer', transition:CONTROL_TRANSITION, ...x });
export const inp    = (x={}) => ({ background:C.cmp.inputBg, border:`1px solid ${C.cmp.inputBorder}`, borderRadius:RADIUS.sm, padding:'12px 16px', color:C.cmp.inputFg, fontSize:13, fontFamily:C.FB, outline:'none', width:'100%', transition:tr(['border-color','box-shadow'], DUR.focus), ...x });
/**
 * The eyebrow label — the small line that names a section above its heading.
 *
 * This used to be 10px, weight 700, `.1em` of tracking and `textTransform:
 * uppercase`. All-caps is measurably slower to read (the word-shape cue that
 * fluent reading leans on disappears — every word becomes the same rectangle),
 * and it is worst for exactly the students this app is built for. 13px with
 * +0.4 of tracking is the effect the caps were reaching for, and it keeps the
 * word shapes. See src/lib/tokens/type.js.
 */
export const lbl    = (x={}) => ({ ...eyebrow(), color:C.cmp.kickerFg, display:'block', marginBottom:8, ...x });
export const R      = (x={}) => ({ display:'flex', alignItems:'center', gap:12, ...x });
export const CC     = (x={}) => ({ display:'flex', flexDirection:'column', gap:12, ...x });
export const G      = (cols=2,gap=16,x={},m=false) => ({ display:'grid', gridTemplateColumns:m?(cols<=2?'1fr':'repeat(2,1fr)'):`repeat(${cols},1fr)`, gap, ...x });
/**
 * A grid that reflows by the space it actually has, rather than by a guess about the device.
 *
 * ── Why this exists next to G() ─────────────────────────────────────────────
 * G(cols, gap, x, mobile) takes a boolean: `mobile` collapses to two columns, or to ONE when the
 * desktop count is two. That boolean is fixed at render and knows nothing about the viewport, so
 * `G(2, 12, {}, true)` is a permanent single column — which is what the parent dashboard's stat
 * cards were on a 1200px screen, a tower of four full-width rows with three quarters of the page
 * empty beside them.
 *
 * This asks CSS instead: as many columns as fit at `min` wide, down to one on a phone, with no
 * breakpoint to keep in step with anything. `min(100%,…)` is the part that matters — without it a
 * track wider than the container overflows instead of collapsing, which is the classic auto-fit
 * bug on narrow screens.
 */
export const autoGrid = (min=220, gap=12, x={}) => ({
  display:'grid', gap, gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, ...x,
});
export const pill   = (bg,color,x={}) => ({ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:RADIUS.pill, fontSize:11, fontWeight:600, letterSpacing:`calc(0.2px + var(--msp-letter-spacing))`, background:bg, color, ...x });
