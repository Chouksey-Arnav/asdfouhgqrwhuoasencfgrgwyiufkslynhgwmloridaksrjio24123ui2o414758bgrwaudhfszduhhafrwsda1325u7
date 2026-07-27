// ─────────────────────────────────────────────────────────────────────────────
// Design tokens + the app-wide theme engine (dark / light / system).
//
// ── Why `C` is a MUTABLE object rather than CSS custom properties ────────────
// The obvious way to theme this app would be to make every token a
// `var(--c-blue)`. That doesn't work here, and it's worth writing down why so
// nobody "fixes" it back: the codebase composes colours by string concatenation
// in ~380 places — `border: 1px solid ${C.violet}28`, `boxShadow: 0 4px 16px
// ${accent}40`. That idiom appends a two-digit hex alpha to a six-digit hex
// colour. `var(--c-violet)28` is not a colour, it is a syntax error, and every
// one of those borders would silently vanish.
//
// So instead `C` stays a plain object of real hex/rgba strings, and switching
// theme MUTATES it in place and then remounts the React tree. Every style in
// the app is an inline style object computed during render, so a remount is all
// it takes for the entire UI to pick up the new palette — no per-component
// wiring, no context threading through 16k lines, and the concatenation idiom
// keeps working because the tokens are still real colours.
//
// The one rule this creates: never capture a token into a module-level object
// literal, because that snapshots the value at import time and it will never
// update. Build such maps inside a function instead (see catMeta below, which
// is computed per call for exactly this reason).
//
// CSS custom properties ARE still emitted (see applyTheme) — but only for the
// handful of things that live in index.css and genuinely need a variable:
// the page background, scrollbars, selection colour, focus rings.
// ─────────────────────────────────────────────────────────────────────────────

// ── Dark palette (the original, unchanged) ──────────────────────────────────
export const DARK = {
  bg:'#04060b', s0:'#060a15', s1:'#0a1020', s2:'#0f1828', s3:'#162032', s4:'#1d2a40', s5:'#253350',
  b0:'rgba(255,255,255,0.04)', b1:'rgba(255,255,255,0.07)', b2:'rgba(255,255,255,0.11)', b3:'rgba(255,255,255,0.18)',
  t1:'#eef2ff', t2:'#94a3c0', t3:'#506080', t4:'#2d3f58',
  blue:'#2d7fff', blueL:'#5da0ff', blueLL:'#93c5fd', blueD:'#1d5fd9',
  blueDim:'rgba(45,127,255,0.10)', blueGlow:'rgba(45,127,255,0.28)',
  blueGrad:'linear-gradient(135deg,#2d7fff 0%,#1d5fd9 100%)',
  green:'#10b981', greenL:'#34d399', greenDim:'rgba(16,185,129,0.10)',
  amber:'#f59e0b', amberL:'#fbbf24', amberDim:'rgba(245,158,11,0.10)',
  rose:'#f43f5e', roseL:'#fb7185', roseDim:'rgba(244,63,94,0.10)',
  violet:'#8b5cf6', violetL:'#a78bfa', violetDim:'rgba(139,92,246,0.10)',
  cyan:'#06b6d4', cyanDim:'rgba(6,182,212,0.10)', orange:'#f97316',
  cyanL:'#22d3ee', orangeL:'#fb923c', orangeDim:'rgba(249,115,22,0.10)',
  teal:'#14b8a6', tealL:'#2dd4bf', tealDim:'rgba(20,184,166,0.10)',
  indigo:'#6366f1', indigoL:'#818cf8', indigoDim:'rgba(99,102,241,0.10)',
  pink:'#ec4899', pinkL:'#f472b6', pinkDim:'rgba(236,72,153,0.10)',
  fuchsia:'#d946ef', fuchsiaL:'#e879f9', fuchsiaDim:'rgba(217,70,239,0.10)',
  lime:'#84cc16', limeL:'#a3e635', limeDim:'rgba(132,204,22,0.10)',
  sky:'#0ea5e9', skyL:'#38bdf8', skyDim:'rgba(14,165,233,0.10)',
  emerald:'#059669', emeraldL:'#34d399', emeraldDim:'rgba(5,150,105,0.10)',
  red:'#ef4444', redL:'#f87171', redDim:'rgba(239,68,68,0.10)',
  gold:'#eab308', goldL:'#facc15', goldDim:'rgba(234,179,8,0.10)',
  auroraGrad:'linear-gradient(120deg,#2d7fff 0%,#8b5cf6 45%,#ec4899 100%)',
  oceanGrad:'linear-gradient(135deg,#06b6d4 0%,#2d7fff 60%,#6366f1 100%)',
  sunsetGrad:'linear-gradient(135deg,#f59e0b 0%,#f43f5e 55%,#d946ef 100%)',
  forestGrad:'linear-gradient(135deg,#10b981 0%,#14b8a6 55%,#0ea5e9 100%)',
  violetGrad:'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)',

  // ── Surface/elevation tokens ──────────────────────────────────────────────
  // Added with light mode. The app previously hard-coded
  // `rgba(255,255,255,0.03)` inline for every glass surface, which reads as
  // "lift a surface toward the light" — the correct instinct in dark mode and,
  // as it happens, still correct in light mode, where a white wash over a grey
  // page is exactly how a raised card looks. So the light values below are the
  // same idea at a much higher alpha rather than an inversion.
  surf:'rgba(255,255,255,0.03)', surf2:'rgba(255,255,255,0.025)', surfHi:'rgba(255,255,255,0.06)',
  inputBg:'rgba(255,255,255,0.04)', inputBorder:'rgba(255,255,255,0.10)',
  shadow:'0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)',
  shadowSm:'0 2px 8px rgba(0,0,0,0.3)',
  scrim:'rgba(0,0,0,0.55)',
  onAccent:'#ffffff',
  // Page backdrop, consumed by index.css via --c-pageGlow.
  pageGlow:'radial-gradient(ellipse 70% 55% at 72% -5%, rgba(45,127,255,0.10) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 5% 8%, rgba(139,92,246,0.07) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 100% 55%, rgba(236,72,153,0.05) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at -5% 100%, rgba(6,182,212,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 105%, rgba(16,185,129,0.045) 0%, transparent 55%)',
  noiseOpacity:'0.02',
  colorScheme:'dark',

  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Light palette ────────────────────────────────────────────────────────────
// Not a mechanical inversion. Three deliberate decisions:
//
// 1. The page is a soft cool grey (#eaeef6), not white. That keeps the existing
//    white-wash surface treatment meaningful — cards read as raised because
//    they're whiter than the page — and it's markedly easier on the eyes for a
//    student staring at a reading passage for an hour.
// 2. Every `*L` token, which in dark mode means "the lighter, more readable
//    variant", becomes the DARKER variant here. Those tokens are overwhelmingly
//    used as text colour, and the job of the token is legibility, not lightness.
// 3. Base accents are pulled down toward their 600-weight so a coloured heading
//    or a chip label clears roughly 4.5:1 against a light surface. #2d7fff on
//    white is about 3.1:1 — fine for a border, not fine for words.
export const LIGHT = {
  bg:'#eaeef6', s0:'#f2f5fa', s1:'#ffffff', s2:'#f7f9fd', s3:'#eff3fa', s4:'#e3eaf4', s5:'#d3ddec',
  b0:'rgba(15,23,42,0.05)', b1:'rgba(15,23,42,0.10)', b2:'rgba(15,23,42,0.15)', b3:'rgba(15,23,42,0.24)',
  t1:'#0c1424', t2:'#41506b', t3:'#697894', t4:'#95a2ba',
  blue:'#1f6feb', blueL:'#1550ba', blueLL:'#1e40af', blueD:'#0f4bb3',
  blueDim:'rgba(31,111,235,0.10)', blueGlow:'rgba(31,111,235,0.22)',
  blueGrad:'linear-gradient(135deg,#2d7fff 0%,#1550ba 100%)',
  green:'#059669', greenL:'#047857', greenDim:'rgba(5,150,105,0.10)',
  amber:'#d97706', amberL:'#b45309', amberDim:'rgba(217,119,6,0.11)',
  rose:'#e11d48', roseL:'#be123c', roseDim:'rgba(225,29,72,0.09)',
  violet:'#7c3aed', violetL:'#6d28d9', violetDim:'rgba(124,58,237,0.09)',
  cyan:'#0891b2', cyanDim:'rgba(8,145,178,0.10)', orange:'#ea580c',
  cyanL:'#0e7490', orangeL:'#c2410c', orangeDim:'rgba(234,88,12,0.10)',
  teal:'#0d9488', tealL:'#0f766e', tealDim:'rgba(13,148,136,0.10)',
  indigo:'#4f46e5', indigoL:'#4338ca', indigoDim:'rgba(79,70,229,0.09)',
  pink:'#db2777', pinkL:'#be185d', pinkDim:'rgba(219,39,119,0.09)',
  fuchsia:'#c026d3', fuchsiaL:'#a21caf', fuchsiaDim:'rgba(192,38,211,0.09)',
  lime:'#65a30d', limeL:'#4d7c0f', limeDim:'rgba(101,163,13,0.11)',
  sky:'#0284c7', skyL:'#0369a1', skyDim:'rgba(2,132,199,0.10)',
  emerald:'#047857', emeraldL:'#065f46', emeraldDim:'rgba(4,120,87,0.10)',
  red:'#dc2626', redL:'#b91c1c', redDim:'rgba(220,38,38,0.09)',
  gold:'#ca8a04', goldL:'#a16207', goldDim:'rgba(202,138,4,0.12)',
  auroraGrad:'linear-gradient(120deg,#2d7fff 0%,#7c3aed 45%,#db2777 100%)',
  oceanGrad:'linear-gradient(135deg,#0891b2 0%,#2d7fff 60%,#4f46e5 100%)',
  sunsetGrad:'linear-gradient(135deg,#f59e0b 0%,#e11d48 55%,#c026d3 100%)',
  forestGrad:'linear-gradient(135deg,#059669 0%,#0d9488 55%,#0284c7 100%)',
  violetGrad:'linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)',

  surf:'rgba(255,255,255,0.75)', surf2:'rgba(255,255,255,0.62)', surfHi:'rgba(255,255,255,0.95)',
  inputBg:'#ffffff', inputBorder:'rgba(15,23,42,0.14)',
  shadow:'0 1px 2px rgba(15,23,42,0.04),0 6px 20px rgba(15,23,42,0.07)',
  shadowSm:'0 1px 3px rgba(15,23,42,0.08)',
  scrim:'rgba(15,23,42,0.35)',
  onAccent:'#ffffff',
  pageGlow:'radial-gradient(ellipse 70% 55% at 72% -5%, rgba(45,127,255,0.10) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 5% 8%, rgba(124,58,237,0.07) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 100% 55%, rgba(219,39,119,0.05) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at -5% 100%, rgba(8,145,178,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 105%, rgba(5,150,105,0.05) 0%, transparent 55%)',
  noiseOpacity:'0.015',
  colorScheme:'light',

  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── High-contrast overlays ───────────────────────────────────────────────────
// Layered ON TOP of the chosen base palette when the student turns on the
// high-contrast accessibility setting. Only the tokens that actually matter for
// contrast are overridden: text pushed to the extremes, every border hardened
// so structure is visible without relying on subtle fills, and the translucent
// surfaces dropped to solid so text never sits on a see-through card.
export const HC_DARK = {
  t1:'#ffffff', t2:'#d5deee', t3:'#a9b6cd', t4:'#8593ac',
  b0:'rgba(255,255,255,0.22)', b1:'rgba(255,255,255,0.34)', b2:'rgba(255,255,255,0.5)', b3:'rgba(255,255,255,0.72)',
  surf:'#0d1524', surf2:'#101a2b', surfHi:'#16233a', inputBg:'#0d1524', inputBorder:'rgba(255,255,255,0.42)',
  blueL:'#8fbaff', greenL:'#5ee7b4', amberL:'#ffcd55', roseL:'#ff8fa2', violetL:'#c4aaff',
  cyanL:'#5fe6f8', tealL:'#5eead4', indigoL:'#a5b0ff', pinkL:'#ff8fc4', limeL:'#c2f34f',
  skyL:'#74d0ff', emeraldL:'#5ee7b4', redL:'#ff9494', goldL:'#ffdd57', orangeL:'#ffab6b',
  noiseOpacity:'0',
};
export const HC_LIGHT = {
  t1:'#000000', t2:'#1d2637', t3:'#3b4658', t4:'#5a6577',
  b0:'rgba(15,23,42,0.22)', b1:'rgba(15,23,42,0.34)', b2:'rgba(15,23,42,0.5)', b3:'rgba(15,23,42,0.75)',
  bg:'#ffffff', s0:'#ffffff', s1:'#ffffff', s2:'#f5f7fb', s3:'#eef2f8', s4:'#e0e7f1', s5:'#ccd7e8',
  surf:'#ffffff', surf2:'#ffffff', surfHi:'#f2f5fa', inputBg:'#ffffff', inputBorder:'rgba(15,23,42,0.45)',
  blue:'#0b4fc4', blueL:'#0a3d99', green:'#046b4d', greenL:'#03533c', amber:'#96500a', amberL:'#7a4108',
  rose:'#b3122f', roseL:'#8f0e26', violet:'#5b21b6', violetL:'#4c1d95', cyan:'#036b86', cyanL:'#02566c',
  teal:'#0a6f66', tealL:'#08574f', indigo:'#3730a3', indigoL:'#312e81', pink:'#a4145c', pinkL:'#83104a',
  fuchsia:'#8b1a99', fuchsiaL:'#6f1479', lime:'#42690b', limeL:'#334f08', sky:'#02648f', skyL:'#014f72',
  emerald:'#035c42', emeraldL:'#024734', red:'#a81919', redL:'#861414', gold:'#8a5e03', goldL:'#6e4b02',
  orange:'#b03e08', orangeL:'#8d3106',
  pageGlow:'none', noiseOpacity:'0',
};

// ── The live token object ────────────────────────────────────────────────────
// Everything in the app imports this. It is intentionally mutable; see the
// header comment. Starts as dark so the very first render (before applyTheme
// runs) matches what the app has always looked like.
export const C = { ...DARK };

export const THEME_MODES = ['dark', 'light', 'system'];
export const THEME_STORAGE_KEY = 'msp_themeMode';

/** What the OS is currently asking for. Defaults to dark when unknowable. */
export function systemPrefersLight() {
  try { return window.matchMedia('(prefers-color-scheme: light)').matches; }
  catch { return false; }
}

/** 'system' → the concrete mode it currently resolves to. */
export function resolveMode(mode) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return systemPrefersLight() ? 'light' : 'dark';
}

export function getStoredMode() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(v) ? v : 'dark';
  } catch { return 'dark'; }
}

export function storeMode(mode) {
  try { localStorage.setItem(THEME_STORAGE_KEY, THEME_MODES.includes(mode) ? mode : 'dark'); } catch { /* private mode */ }
}

// Only these tokens need to cross into index.css, so only these become CSS
// custom properties. Keeping the list short is deliberate — the inline-style
// object is the source of truth, and a second partially-overlapping one would
// be a bug factory.
const CSS_VAR_TOKENS = [
  'bg', 's0', 's1', 's2', 's3', 's4', 's5', 'b1', 'b2', 'b3',
  't1', 't2', 't3', 't4', 'blue', 'blueL', 'blueDim', 'violet', 'rose', 'green', 'amber',
  'surf', 'surfHi', 'inputBg', 'inputBorder', 'pageGlow', 'noiseOpacity', 'scrim',
  'FD', 'FB', 'FM',
];

let currentResolved = 'dark';

/**
 * Switch the palette. Mutates `C` in place and writes the CSS custom properties
 * + `data-theme` attribute. Callers must remount the React tree afterwards (the
 * App does this with a `key`) so inline styles recompute — this function alone
 * cannot repaint components that already rendered.
 *
 * `opts.highContrast` layers the HC overlay on top of the chosen base.
 * `opts.fontStack` swaps the UI typeface (the dyslexia-friendly setting).
 */
export function applyTheme(mode = 'dark', opts = {}) {
  const resolved = resolveMode(mode);
  const base = resolved === 'light' ? LIGHT : DARK;
  const overlay = opts.highContrast ? (resolved === 'light' ? HC_LIGHT : HC_DARK) : null;

  // Reset first: without this, switching high-contrast back off would leave the
  // overlay's values behind, because Object.assign only ever adds.
  for (const k of Object.keys(C)) delete C[k];
  Object.assign(C, base, overlay || {});

  if (opts.fontStack) { C.FB = opts.fontStack; C.FD = opts.fontStack; }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = C.colorScheme || resolved;
    for (const k of CSS_VAR_TOKENS) {
      if (C[k] != null) root.style.setProperty(`--c-${k}`, String(C[k]));
    }
  }
  currentResolved = resolved;
  return resolved;
}

export function currentMode() { return currentResolved; }
export function isLight() { return currentResolved === 'light'; }

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
 * Turn any colour token into a translucent tint.
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

export const glass  = (x={}) => ({ background:C.surf, border:`1px solid ${C.b1}`, borderRadius:16, padding:24, boxShadow:C.shadow, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...x });
export const glass2 = (x={}) => ({ background:C.surf2, border:`1px solid ${C.b1}`, borderRadius:10, padding:14, ...x });
export const btn    = (bg=C.blueGrad,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'none', background:bg, color:C.onAccent, fontWeight:600, fontSize:13, fontFamily:C.FB, cursor:'pointer', letterSpacing:'.01em', boxShadow:bg===C.blueGrad?`0 4px 16px ${tint(C.blue,0.35)},inset 0 1px 0 rgba(255,255,255,0.12)`:C.shadowSm, transition:'all .18s cubic-bezier(.16,1,.3,1)', ...x });
export const btnSm  = (bg=C.surfHi,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 14px', borderRadius:7, border:`1px solid ${C.b1}`, background:bg, color:C.t1, fontWeight:600, fontSize:12, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const btnG   = (x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:9, border:`1px solid ${C.b2}`, background:'transparent', color:C.t2, fontWeight:500, fontSize:13, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const inp    = (x={}) => ({ background:C.inputBg, border:`1px solid ${C.inputBorder}`, borderRadius:10, padding:'10px 14px', color:C.t1, fontSize:13, fontFamily:C.FB, outline:'none', width:'100%', transition:'border-color .15s,box-shadow .15s', ...x });
export const lbl    = (x={}) => ({ fontSize:10, fontWeight:700, color:C.t3, letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:7, ...x });
export const R      = (x={}) => ({ display:'flex', alignItems:'center', gap:12, ...x });
export const CC     = (x={}) => ({ display:'flex', flexDirection:'column', gap:12, ...x });
export const G      = (cols=2,gap=14,x={},m=false) => ({ display:'grid', gridTemplateColumns:m?(cols<=2?'1fr':'repeat(2,1fr)'):`repeat(${cols},1fr)`, gap, ...x });
export const pill   = (bg,color,x={}) => ({ display:'inline-flex', alignItems:'center', padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'.04em', background:bg, color, ...x });
