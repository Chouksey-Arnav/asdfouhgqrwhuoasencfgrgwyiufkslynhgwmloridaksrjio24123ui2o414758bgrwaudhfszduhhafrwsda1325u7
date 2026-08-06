// ─────────────────────────────────────────────────────────────────────────────
// Design tokens + the app-wide theme engine (dark / light / system).
//
// ── Why `C` is a MUTABLE object rather than CSS custom properties ────────────
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
// CSS custom properties ARE still emitted (see applyTheme) — but only for the
// handful of things that live in index.css and genuinely need a variable:
// the page background, scrollbars, selection color, focus rings.
// ─────────────────────────────────────────────────────────────────────────────

// ── Dark palette ─────────────────────────────────────────────────────────────
// Lifted off pure black in the "less overstimulating" pass. The original page
// was #04060b — effectively black — which sounds restful and is the opposite:
// text at #eef2ff on near-black is a ~19:1 contrast ratio, well past the point
// where extra contrast helps and into the range where the letterforms halate
// for anyone with astigmatism. Every surface below moved up one step so the
// darkest theme is deep rather than void, and so the elevation ladder
// (bg → s5) is actually legible instead of five shades of the same black.
// Accents are untouched: someone who explicitly picks Dark is asking for this
// look, and BALANCED below is the calmer option in the picker.
export const DARK = {
  bg:'#0a0e16', s0:'#0e131d', s1:'#141b28', s2:'#18202e', s3:'#1e2735', s4:'#26303f', s5:'#2f3b4d',
  b0:'rgba(255,255,255,0.04)', b1:'rgba(255,255,255,0.07)', b2:'rgba(255,255,255,0.11)', b3:'rgba(255,255,255,0.18)',
  // t3/t4 lifted in the light-mode audit pass. They measured 2.8:1 and 1.7:1
  // against a card — "faint" past the point of being text at all, and the same
  // class of failure as the light palette's washed-out metadata, just in the
  // other direction. Still clearly the two quietest steps in the ramp.
  t1:'#e9eefb', t2:'#98a6c2', t3:'#6e7b97', t4:'#627086',
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
  // as it happens, still correct in light mode, where a white wash over a gray
  // page is exactly how a raised card looks. So the light values below are the
  // same idea at a much higher alpha rather than an inversion.
  surf:'rgba(255,255,255,0.03)', surf2:'rgba(255,255,255,0.025)', surfHi:'rgba(255,255,255,0.06)',
  inputBg:'rgba(255,255,255,0.04)', inputBorder:'rgba(255,255,255,0.10)',
  shadow:'0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)',
  shadowSm:'0 2px 8px rgba(0,0,0,0.3)',
  scrim:'rgba(0,0,0,0.55)',
  onAccent:'#ffffff',
  // Page backdrop, consumed by index.css via --c-pageGlow.
  pageGlow:'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(45,127,255,0.10) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(139,92,246,0.06) 0%, transparent 58%)',
  noiseOpacity:'0.018',
  colorScheme:'dark',

  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Light palette ────────────────────────────────────────────────────────────
// Not a mechanical inversion. Three deliberate decisions:
//
// 1. The page is a soft cool gray (#eaeef6), not white. That keeps the existing
//    white-wash surface treatment meaningful — cards read as raised because
//    they're whiter than the page — and it's markedly easier on the eyes for a
//    student staring at a reading passage for an hour.
// 2. Every `*L` token, which in dark mode means "the lighter, more readable
//    variant", becomes the DARKER variant here. Those tokens are overwhelmingly
//    used as text color, and the job of the token is legibility, not lightness.
// 3. Base accents are pulled down until a colored heading or chip label clears
//    4.5:1 against BOTH a card and the page. #2d7fff on white is about 3.1:1 —
//    fine for a border, not fine for words.
//    This originally stopped at the 600 weights and claimed the 4.5:1 result
//    without ever measuring it; the 600s actually land around 2.6–3.1:1, which
//    is why every section kicker ("SETTINGS", "PROFILE & GOALS", "UNIT 3") and
//    every stat number rendered in an accent was washed out. They now sit near
//    the 700 weights, and scripts/verifyPaletteContrast.mjs asserts it on every
//    build so the claim can't drift away from the values again.
// 4. (Added in the glare pass.) No large surface is pure #ffffff any more. A
//    full-white card under a bright screen is the single biggest source of the
//    "blinding" complaint, and dropping it two points to #fbfcfe costs nothing
//    visually — the card still reads as raised against the #e6eaf1 page —
//    while taking the peak luminance off every panel on screen at once.
//    Body text moved off near-black for the same reason: maximum contrast in
//    both directions is what makes a light UI feel like a flashbulb.
export const LIGHT = {
  bg:'#e6eaf1', s0:'#eff3f9', s1:'#fbfcfe', s2:'#f4f7fc', s3:'#edf1f8', s4:'#e0e7f1', s5:'#d0dae9',
  b0:'rgba(15,23,42,0.05)', b1:'rgba(15,23,42,0.10)', b2:'rgba(15,23,42,0.15)', b3:'rgba(15,23,42,0.24)',
  t1:'#111a2b', t2:'#3f4d66', t3:'#5c6a85', t4:'#737e96',
  // t3/t4 are darker than a mechanical inversion would give. In dark mode a
  // muted token can sit close to the page because the eye reads light-on-dark
  // detail well below the ratio it needs the other way round; on a light page
  // the same "muted" value is simply gone. The old #97a4bb t4 measured 2.4:1
  // against a card, which is where "ASSESS", "new" and every unit's metadata
  // row were disappearing.
  blue:'#1b63d4', blueL:'#1651ae', blueLL:'#423bc0', blueD:'#1651ae',
  blueDim:'rgba(27,99,212,0.1)', blueGlow:'rgba(27,99,212,0.22)',
  blueGrad:'linear-gradient(135deg,#1b63d4 0%,#1651ae 100%)',
  green:'#057855', greenL:'#046245', greenDim:'rgba(5,120,85,0.1)',
  amber:'#9d5606', amberL:'#814605', amberDim:'rgba(157,86,6,0.11)',
  rose:'#cc1940', roseL:'#ab1536', roseDim:'rgba(204,25,64,0.1)',
  violet:'#7c3aed', violetL:'#6831c7', violetDim:'rgba(124,58,237,0.1)',
  cyan:'#08718a', cyanL:'#075f74', cyanDim:'rgba(8,113,138,0.1)',
  orange:'#b5440c', orangeL:'#94380a', orangeDim:'rgba(181,68,12,0.1)',
  teal:'#0d746a', tealL:'#0b6159', tealDim:'rgba(13,116,106,0.1)',
  indigo:'#4f46e5', indigoL:'#423bc0', indigoDim:'rgba(79,70,229,0.1)',
  pink:'#c22268', pinkL:'#a31d57', pinkDim:'rgba(194,34,104,0.1)',
  fuchsia:'#ad22bf', fuchsiaL:'#911da0', fuchsiaDim:'rgba(173,34,191,0.1)',
  lime:'#48730d', limeL:'#3b5f0b', limeDim:'rgba(72,115,13,0.1)',
  sky:'#026fa7', skyL:'#025b89', skyDim:'rgba(2,111,167,0.1)',
  emerald:'#047857', emeraldL:'#036247', emeraldDim:'rgba(4,120,87,0.1)',
  red:'#cd2323', redL:'#a81c1c', redDim:'rgba(205,35,35,0.1)',
  gold:'#8d6104', goldL:'#734f03', goldDim:'rgba(141,97,4,0.11)',
  auroraGrad:'linear-gradient(120deg,#1b63d4 0%,#7c3aed 45%,#c22268 100%)',
  oceanGrad:'linear-gradient(135deg,#08718a 0%,#1b63d4 60%,#4f46e5 100%)',
  sunsetGrad:'linear-gradient(135deg,#9d5606 0%,#cc1940 55%,#ad22bf 100%)',
  forestGrad:'linear-gradient(135deg,#057855 0%,#0d746a 55%,#026fa7 100%)',
  violetGrad:'linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)',

  surf:'rgba(255,255,255,0.70)', surf2:'rgba(255,255,255,0.55)', surfHi:'rgba(255,255,255,0.88)',
  inputBg:'#fcfdff', inputBorder:'rgba(15,23,42,0.14)',
  shadow:'0 1px 2px rgba(15,23,42,0.04),0 6px 20px rgba(15,23,42,0.06)',
  shadowSm:'0 1px 3px rgba(15,23,42,0.07)',
  scrim:'rgba(15,23,42,0.35)',
  onAccent:'#ffffff',
  // Two hues, not five. The old five-color wash put a different tint in every
  // corner of the page, which is exactly the ambient busy-ness this pass is
  // removing — and at these alphas the extra three were never read as color,
  // only as unevenness.
  pageGlow:'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(45,127,255,0.07) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(124,58,237,0.04) 0%, transparent 58%)',
  noiseOpacity:'0.012',
  colorScheme:'light',

  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Balanced palette (the app's default) ─────────────────────────────────────
// The middle setting the app was missing. Dark was a near-black void and Light
// was a white flashbulb, so both extremes were uncomfortable for the two-hour
// sittings this product is actually used for, and there was nothing between
// them to pick.
//
// Balanced is a dusk slate: a page at #181d27 (light enough that the screen
// isn't a black mirror, dark enough that it never glares), text at #e6eaf2
// rather than white, and accents pulled roughly 15–20% of the way toward gray
// from the Dark palette's saturated versions. That last part is what makes it
// read as calm rather than merely dim — on a dark page, a fully-saturated
// #10b981 or #f43f5e is a light source, and a screen with six of them is the
// "overstimulating" feeling with a name.
//
// Contrast still clears WCAG AA comfortably (t1 on bg ≈ 12.5:1, t2 ≈ 6.4:1,
// t3 ≈ 3.6:1 which is body-adjacent metadata only), so calmer is not dimmer in
// the sense that matters.
export const BALANCED = {
  bg:'#181d27', s0:'#1c222d', s1:'#212834', s2:'#252d3a', s3:'#2a3341', s4:'#323c4c', s5:'#3d4959',
  b0:'rgba(255,255,255,0.05)', b1:'rgba(255,255,255,0.09)', b2:'rgba(255,255,255,0.14)', b3:'rgba(255,255,255,0.22)',
  t1:'#e6eaf2', t2:'#a7b2c6', t3:'#7c8799', t4:'#717b89',
  blue:'#4b8bf5', blueL:'#7aa9f7', blueLL:'#a9c6fa', blueD:'#2f6ad4',
  blueDim:'rgba(75,139,245,0.10)', blueGlow:'rgba(75,139,245,0.22)',
  blueGrad:'linear-gradient(135deg,#4b8bf5 0%,#2f6ad4 100%)',
  green:'#2ea37f', greenL:'#5fc7a6', greenDim:'rgba(46,163,127,0.10)',
  amber:'#d9a23c', amberL:'#e8bd6a', amberDim:'rgba(217,162,60,0.10)',
  rose:'#e0637a', roseL:'#ee8b9c', roseDim:'rgba(224,99,122,0.10)',
  violet:'#8579e6', violetL:'#a89ef2', violetDim:'rgba(133,121,230,0.10)',
  cyan:'#37a8c4', cyanDim:'rgba(55,168,196,0.10)', orange:'#e08344',
  cyanL:'#5cc4dd', orangeL:'#eda370', orangeDim:'rgba(224,131,68,0.10)',
  teal:'#2fa89b', tealL:'#5cc9bd', tealDim:'rgba(47,168,155,0.10)',
  indigo:'#6f75e0', indigoL:'#9095ec', indigoDim:'rgba(111,117,224,0.10)',
  pink:'#dd6ba4', pinkL:'#ea91be', pinkDim:'rgba(221,107,164,0.10)',
  fuchsia:'#c471dd', fuchsiaL:'#d795ea', fuchsiaDim:'rgba(196,113,221,0.10)',
  lime:'#8fb84a', limeL:'#aacf6f', limeDim:'rgba(143,184,74,0.10)',
  sky:'#3f9fd6', skyL:'#6bbbe6', skyDim:'rgba(63,159,214,0.10)',
  emerald:'#34a383', emeraldL:'#5fc7a6', emeraldDim:'rgba(52,163,131,0.10)',
  red:'#e05a5a', redL:'#ec8484', redDim:'rgba(224,90,90,0.10)',
  gold:'#d4a53c', goldL:'#e5c069', goldDim:'rgba(212,165,60,0.10)',
  auroraGrad:'linear-gradient(120deg,#4b8bf5 0%,#8579e6 45%,#dd6ba4 100%)',
  oceanGrad:'linear-gradient(135deg,#37a8c4 0%,#4b8bf5 60%,#6f75e0 100%)',
  sunsetGrad:'linear-gradient(135deg,#d9a23c 0%,#e0637a 55%,#c471dd 100%)',
  forestGrad:'linear-gradient(135deg,#2ea37f 0%,#2fa89b 55%,#3f9fd6 100%)',
  violetGrad:'linear-gradient(135deg,#8579e6 0%,#6f75e0 100%)',

  surf:'rgba(255,255,255,0.035)', surf2:'rgba(255,255,255,0.022)', surfHi:'rgba(255,255,255,0.07)',
  inputBg:'rgba(255,255,255,0.05)', inputBorder:'rgba(255,255,255,0.12)',
  shadow:'0 2px 10px rgba(0,0,0,0.30),inset 0 1px 0 rgba(255,255,255,0.03)',
  shadowSm:'0 1px 6px rgba(0,0,0,0.22)',
  scrim:'rgba(9,12,18,0.58)',
  onAccent:'#ffffff',
  pageGlow:'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(75,139,245,0.07) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(133,121,230,0.045) 0%, transparent 58%)',
  noiseOpacity:'0.014',
  colorScheme:'dark',

  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Balanced Light palette ───────────────────────────────────────────────────
// The other half of Balanced. BALANCED above is a dusk slate; this is the same
// idea walked to the light side of the line — "overcast daylight" rather than
// noon sun.
//
// It exists because "Balanced" previously only meant one thing, and that thing
// was dark. A student who wants a light interface had exactly one option, and
// that option is the brightest surface the app can draw. The two ends of the
// ramp now both have a middle:
//
//   Dark ── Balanced Dark ──┼── Balanced Light ── Light
//
// Three things separate it from LIGHT:
//   1. No surface goes above #f1f4f8. LIGHT already pulled cards off pure white
//      to #fbfcfe; this goes four more steps down, which is the single biggest
//      lever on the "the screen is a flashbulb" feeling.
//   2. The page is #dfe3ea, deeper than LIGHT's #e6eaf1, so the contrast
//      between page and card stays legible even though both moved down.
//   3. Text stops short of the extremes in both directions — #1f2836 rather
//      than #111a2b — for the same reason BALANCED's t1 is #e6eaf2 and not
//      white. Maximum contrast in both directions is what makes long reading
//      tiring, and this is the palette for the two-hour sitting.
//
// Accents are LIGHT's, unchanged where they already read as calm and pulled a
// little further down where they didn't. They are NOT desaturated toward gray
// the way BALANCED's are: on a light page, moving an accent toward gray moves
// it toward the background, so the dark-side trick for "calmer" is the
// light-side recipe for "invisible". Muting here is done with luminance only.
export const BALANCED_LIGHT = {
  bg:'#dfe3ea', s0:'#e7ebf1', s1:'#f1f4f8', s2:'#ebeff5', s3:'#e4e9f0', s4:'#d7dde7', s5:'#c6cfdd',
  b0:'rgba(15,23,42,0.055)', b1:'rgba(15,23,42,0.11)', b2:'rgba(15,23,42,0.17)', b3:'rgba(15,23,42,0.27)',
  t1:'#1f2836', t2:'#45536b', t3:'#5d6b85', t4:'#6d798d',
  blue:'#1a5fcc', blueL:'#154ea7', blueLL:'#3b36a9', blueD:'#154ea7',
  blueDim:'rgba(26,95,204,0.1)', blueGlow:'rgba(26,95,204,0.22)',
  blueGrad:'linear-gradient(135deg,#1a5fcc 0%,#154ea7 100%)',
  green:'#067156', greenL:'#055d46', greenDim:'rgba(6,113,86,0.1)',
  amber:'#905808', amberL:'#764807', amberDim:'rgba(144,88,8,0.11)',
  rose:'#c21a3e', roseL:'#9f1533', roseDim:'rgba(194,26,62,0.1)',
  violet:'#6d31d4', violetL:'#5c29b2', violetDim:'rgba(109,49,212,0.1)',
  cyan:'#0a6c84', cyanL:'#08596c', cyanDim:'rgba(10,108,132,0.1)',
  orange:'#af420a', orangeL:'#8f3608', orangeDim:'rgba(175,66,10,0.1)',
  teal:'#0b7166', tealL:'#095d54', tealDim:'rgba(11,113,102,0.1)',
  indigo:'#4640c9', indigoL:'#3b36a9', indigoDim:'rgba(70,64,201,0.1)',
  pink:'#bd2168', pinkL:'#9b1b55', pinkDim:'rgba(189,33,104,0.1)',
  fuchsia:'#a422b8', fuchsiaL:'#871c97', fuchsiaDim:'rgba(164,34,184,0.1)',
  lime:'#456f0b', limeL:'#395b09', limeDim:'rgba(69,111,11,0.1)',
  sky:'#026b97', skyL:'#02587c', skyDim:'rgba(2,107,151,0.1)',
  emerald:'#046a4f', emeraldL:'#035942', emeraldDim:'rgba(4,106,79,0.1)',
  red:'#c02121', redL:'#a11c1c', redDim:'rgba(192,33,33,0.1)',
  gold:'#865d05', goldL:'#6e4c04', goldDim:'rgba(134,93,5,0.11)',
  auroraGrad:'linear-gradient(120deg,#1a5fcc 0%,#6d31d4 45%,#bd2168 100%)',
  oceanGrad:'linear-gradient(135deg,#0a6c84 0%,#1a5fcc 60%,#4640c9 100%)',
  sunsetGrad:'linear-gradient(135deg,#905808 0%,#c21a3e 55%,#a422b8 100%)',
  forestGrad:'linear-gradient(135deg,#067156 0%,#0b7166 55%,#026b97 100%)',
  violetGrad:'linear-gradient(135deg,#6d31d4 0%,#4640c9 100%)',

  // Lower peak white than LIGHT's surfaces (0.70/0.55/0.88): a glass card here
  // lands around #f1f4f8 rather than near-white, which is the whole point.
  surf:'rgba(255,255,255,0.55)', surf2:'rgba(255,255,255,0.42)', surfHi:'rgba(255,255,255,0.72)',
  inputBg:'#f6f8fb', inputBorder:'rgba(15,23,42,0.16)',
  shadow:'0 1px 2px rgba(15,23,42,0.05),0 6px 20px rgba(15,23,42,0.07)',
  shadowSm:'0 1px 3px rgba(15,23,42,0.08)',
  scrim:'rgba(15,23,42,0.38)',
  onAccent:'#ffffff',
  pageGlow:'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(29,102,219,0.055) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(109,49,212,0.035) 0%, transparent 58%)',
  noiseOpacity:'0.010',
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
// Balanced's own overlay rather than reusing HC_DARK: the surfaces have to be
// opaque versions of *this* palette's slate, not the near-black one, or turning
// high contrast on would silently drop the student into a different theme.
export const HC_BALANCED = {
  t1:'#ffffff', t2:'#dae2ef', t3:'#b3bfd2', t4:'#8f9db3',
  b0:'rgba(255,255,255,0.22)', b1:'rgba(255,255,255,0.34)', b2:'rgba(255,255,255,0.5)', b3:'rgba(255,255,255,0.72)',
  surf:'#1f2531', surf2:'#232a37', surfHi:'#2a3341', inputBg:'#1f2531', inputBorder:'rgba(255,255,255,0.42)',
  blueL:'#94bcff', greenL:'#6fdcb8', amberL:'#ffd06b', roseL:'#ff9aab', violetL:'#c6b6ff',
  cyanL:'#6fdcf0', tealL:'#6fdcd0', indigoL:'#adb4ff', pinkL:'#ff9dc9', limeL:'#c6e97f',
  skyL:'#84cdf0', emeraldL:'#6fdcb8', redL:'#ff9a9a', goldL:'#ffd870', orangeL:'#ffb27f',
  pageGlow:'none', noiseOpacity:'0',
};
// Balanced Light's overlay. Same reasoning as HC_BALANCED: high contrast must
// stay inside the theme the student picked, so the surfaces here go to the top
// of *this* palette rather than to HC_LIGHT's pure white — which would defeat
// the one thing Balanced Light exists to do.
export const HC_BALANCED_LIGHT = {
  t1:'#000000', t2:'#1b2434', t3:'#333e51', t4:'#4e5a6e',
  b0:'rgba(15,23,42,0.24)', b1:'rgba(15,23,42,0.36)', b2:'rgba(15,23,42,0.52)', b3:'rgba(15,23,42,0.76)',
  bg:'#e8ebf0', s0:'#f2f4f8', s1:'#f8fafc', s2:'#f2f5f9', s3:'#eaeef4', s4:'#dbe1ea', s5:'#c7cfdc',
  surf:'#f8fafc', surf2:'#f8fafc', surfHi:'#eef2f7', inputBg:'#ffffff', inputBorder:'rgba(15,23,42,0.48)',
  blue:'#0a48b4', blueL:'#08388c', green:'#046045', greenL:'#034936', amber:'#874709', amberL:'#6d3907',
  rose:'#a30f2a', roseL:'#830c22', violet:'#521da4', violetL:'#421884', cyan:'#025f78', cyanL:'#014d61',
  teal:'#06635b', tealL:'#054e47', indigo:'#312b93', indigoL:'#282374', pink:'#921152', pinkL:'#750d42',
  fuchsia:'#7c1789', fuchsiaL:'#63126d', lime:'#3b5e0a', limeL:'#2e4907',
  sky:'#015a80', skyL:'#014766', emerald:'#03533b', emeraldL:'#02422f', red:'#961616', redL:'#781111',
  gold:'#7c5403', goldL:'#634302', orange:'#9e3707', orangeL:'#7e2c05',
  pageGlow:'none', noiseOpacity:'0',
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
  const base = PALETTES[resolved] || BALANCED;
  const HC = { light: HC_LIGHT, balancedLight: HC_BALANCED_LIGHT, dark: HC_DARK, balanced: HC_BALANCED };
  const overlay = opts.highContrast ? (HC[resolved] || HC_BALANCED) : null;

  // Reset first: without this, switching high-contrast back off would leave the
  // overlay's values behind, because Object.assign only ever adds.
  for (const k of Object.keys(C)) delete C[k];
  Object.assign(C, base, overlay || {});

  if (opts.fontStack) { C.FB = opts.fontStack; C.FD = opts.fontStack; }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    // The family is what stylesheet rules should key off. Every "this rule
    // assumed a dark backdrop" correction in index.css applies to Balanced
    // Light exactly as much as it applies to Light, and pinning those rules to
    // [data-theme="light"] is how a new light palette ships half-styled.
    root.dataset.themeFamily = LIGHT_FAMILY.has(resolved) ? 'light' : 'dark';
    root.style.colorScheme = C.colorScheme || resolved;
    for (const k of CSS_VAR_TOKENS) {
      if (C[k] != null) root.style.setProperty(`--c-${k}`, String(C[k]));
    }
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
 */
export const onTint = (accent, min = 4.5) => (isLight() ? accentText(accent, C.s1, min) : (C.onAccent || '#ffffff'));

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

export const glass  = (x={}) => ({ background:C.surf, border:`1px solid ${C.b1}`, borderRadius:16, padding:24, boxShadow:C.shadow, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...x });
export const glass2 = (x={}) => ({ background:C.surf2, border:`1px solid ${C.b1}`, borderRadius:10, padding:14, ...x });
export const btn    = (bg=C.blueGrad,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'none', background:bg, color:C.onAccent, fontWeight:600, fontSize:13, fontFamily:C.FB, cursor:'pointer', letterSpacing:'.01em', // A softer halo than the original 0 4px 16px @35%: the old one read as a lit
// object on every screen that had more than one button on it.
boxShadow:bg===C.blueGrad?`0 3px 12px ${tint(C.blue,0.22)},inset 0 1px 0 rgba(255,255,255,0.10)`:C.shadowSm, transition:'all .18s cubic-bezier(.16,1,.3,1)', ...x });
export const btnSm  = (bg=C.surfHi,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 14px', borderRadius:7, border:`1px solid ${C.b1}`, background:bg, color:C.t1, fontWeight:600, fontSize:12, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const btnG   = (x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:9, border:`1px solid ${C.b2}`, background:'transparent', color:C.t2, fontWeight:500, fontSize:13, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const inp    = (x={}) => ({ background:C.inputBg, border:`1px solid ${C.inputBorder}`, borderRadius:10, padding:'10px 14px', color:C.t1, fontSize:13, fontFamily:C.FB, outline:'none', width:'100%', transition:'border-color .15s,box-shadow .15s', ...x });
export const lbl    = (x={}) => ({ fontSize:10, fontWeight:700, color:C.t3, letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:7, ...x });
export const R      = (x={}) => ({ display:'flex', alignItems:'center', gap:12, ...x });
export const CC     = (x={}) => ({ display:'flex', flexDirection:'column', gap:12, ...x });
export const G      = (cols=2,gap=14,x={},m=false) => ({ display:'grid', gridTemplateColumns:m?(cols<=2?'1fr':'repeat(2,1fr)'):`repeat(${cols},1fr)`, gap, ...x });
export const pill   = (bg,color,x={}) => ({ display:'inline-flex', alignItems:'center', padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'.04em', background:bg, color, ...x });
