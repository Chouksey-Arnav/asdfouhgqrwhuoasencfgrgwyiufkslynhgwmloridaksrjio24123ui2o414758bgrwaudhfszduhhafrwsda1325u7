// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — SEMANTIC TOKENS
//
// The only layer that changes per theme, and the only layer a component is
// allowed to read (via the flattened `C` in ../theme.js, or via the --sem-*
// custom properties in index.css).
//
// ── The naming rule ─────────────────────────────────────────────────────────
// Semantic tokens are named for what they MEAN, never for what colour they
// currently are. `accentFg`, not `blue400`. The failure mode this prevents is
// specific and happens to every design system that skips it: the brand colour
// changes, and you are left with a token called `blue` that holds green, so
// every reader of the codebase is now permanently misled about what a line of
// code does. The one deliberate exception is `hue` at the bottom of each theme,
// where the colour genuinely IS the meaning — a subject category's identity is
// its hue, the way a data series' identity is its colour — and that map is
// scoped and documented as such so it can't quietly become a general palette.
//
// ── The Radix 12-step contract ──────────────────────────────────────────────
// Steps are adopted wholesale, because the contract is what makes contrast
// compliance structural rather than something to re-audit by hand:
//
//   1–2   app background            → surfaceInset, surfaceCanvas
//   3–5   component background,     → surfaceDefault, surfaceRaised,
//         normal / hover / pressed     surfaceHover, surfacePressed
//   6–8   borders, subtle →         → borderSubtle, borderDefault,
//         interactive → strong/focus   borderStrong  (+ focusRing)
//   9–10  solid fills               → accentSolid, accentSolidHover
//   11    low-contrast text         → fgTertiary
//   12    high-contrast text        → fgPrimary   (fgSecondary sits between)
//
// Exactly three foreground tiers and exactly three border strengths, and the
// count is a hard rule enforced by scripts/verifyDesignTokens.mjs. Every extra
// tier is a contrast liability that gets reached for by feel and never
// re-measured — the app's old fourth text tier is precisely how metadata ended
// up at 2.4:1. `fgDisabled` is deliberately NOT a fourth tier: it is not live
// text, it is the absence of an affordance, and it is exempt from the contrast
// floors for that reason.
//
// Only step 8 (borderStrong) is allowed to be the sole boundary of a control,
// because it is the only border step that clears the 3:1 non-text requirement.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BLUE, GREEN, AMBER, ROSE, VIOLET, CYAN, ORANGE, TEAL, INDIGO, PINK,
  FUCHSIA, LIME, SKY, EMERALD, RED, GOLD,
  SLATE, MIDNIGHT, MIST, WHITE, BLACK,
  WHITE_A, WHITE_WASH, INK_A, SHADOW_A, SCRIM_A, FONT,
} from './primitives.js';

/** The 16 category hues, in a fixed order. */
export const HUE_NAMES = Object.freeze([
  'blue', 'green', 'amber', 'rose', 'violet', 'cyan', 'orange', 'teal',
  'indigo', 'pink', 'fuchsia', 'lime', 'sky', 'emerald', 'red', 'gold',
]);

const RAMPS = { blue: BLUE, green: GREEN, amber: AMBER, rose: ROSE, violet: VIOLET,
  cyan: CYAN, orange: ORANGE, teal: TEAL, indigo: INDIGO, pink: PINK,
  fuchsia: FUCHSIA, lime: LIME, sky: SKY, emerald: EMERALD, red: RED, gold: GOLD };

/**
 * Expand a per-hue step table into `{ hue: { fg, fgStrong, subtleBg } }`.
 *
 * `fg` is the hue used as a word on a card; `fgStrong` is the tier the app
 * designates as "the readable version of this hue" and is what carries AA;
 * `subtleBg` is the Radix step-3 tinted chip background for the same hue.
 * A missing step throws rather than falling back — a silently-absent token is
 * how a theme ends up rendering the previous theme's colour.
 */
const expandHues = (steps, subtleBg) => {
  const out = {};
  for (const name of HUE_NAMES) {
    const [base, strong] = steps[name];
    const ramp = RAMPS[name];
    if (ramp[base] == null) throw new Error(`semantic: ${name} has no primitive step ${base}`);
    if (ramp[strong] == null) throw new Error(`semantic: ${name} has no primitive step ${strong}`);
    out[name] = { fg: ramp[base], fgStrong: ramp[strong], subtleBg: subtleBg(name, ramp[base]) };
  }
  return Object.freeze(out);
};

/** A hue at 10% over whatever is behind it — the translucent chip of the pre-token era. */
const wash = (hex, a = 0.10) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ─────────────────────────────────────────────────────────────────────────────
// BALANCED (dark) — the app's default theme
//
// ── Where the surfaces sit, and why ─────────────────────────────────────────
// The base content surface is L* 22.3. For calibration: X's Dim theme sits at
// about L* 12, IBM Gray 90 at 15, GitHub dark-dimmed at about 16, Discord at
// 21. So this is a visible step lighter than every mainstream dim theme except
// Discord, while staying unambiguously dark. Each rung of the ladder is roughly
// 4 L* from the next, which is perceptible as a step without reading as
// striping.
//
// The whole ramp is a cool blue-slate (hue ≈ 262°) rather than a pure neutral.
// Two reasons, and the second is the load-bearing one: pure grays read cheap,
// and a slight blue cast lets the blue accent sit INSIDE the same hue family
// instead of vibrating against it. That is the trick X Dim uses and that most
// homegrown dim themes miss.
//
// ── Text ────────────────────────────────────────────────────────────────────
// Primary is #e7ecf2 and deliberately not pure white. Pure white maximises
// halation — the glowing-halo smearing that is markedly worse for the 30–60%
// of people with astigmatism — and capping peak contrast near 10:1 rather than
// 16:1 is the single biggest comfort move available in a dark theme. All three
// live tiers clear AA on every surface in the ladder; primary clears AAA.
//
// ── Accents ─────────────────────────────────────────────────────────────────
// Every accent is lightened to L* ≈ 72 and desaturated roughly 30% from the
// same hue in the light theme, which is the standard dark-theme rule. The light
// theme's accents are not reusable here and it is not close: light-theme blue
// #0069c2 scores 1.61:1 on this surface and is simply unreadable.
//
// ── Solid buttons ───────────────────────────────────────────────────────────
// Light fill, dark ink — #499dee carrying #12171c — rather than a dark fill
// with a white label. The light-fill version hits 6.3:1 on the label and 4.27:1
// for the button against the surface; the dark-fill version fails the component
// contrast requirement outright and looks muddy besides. That pattern is a
// large part of why Radix and Linear read as expensive.
//
// ── Depth ───────────────────────────────────────────────────────────────────
// No drop shadows. At this lightness they barely read at all, so depth comes
// from the surface ladder and 1px hairlines instead — which is what Linear
// does; they ship literally no drop shadows on dark surfaces. What is left is
// an inset 1px top highlight at 5.5% white on raised surfaces, simulating a
// light source hitting the top edge. Cheapest premium trick in dark UI.
// ─────────────────────────────────────────────────────────────────────────────
const BALANCED_HUE_STEPS = {
  blue: ['71.8', '80'],   green: ['71.8', '79.9'],  amber: ['71.8', '79.9'],
  rose: ['71.9', '80.1'], violet: ['71.8', '79.9'], cyan: ['71.7', '79.9'],
  orange: ['71.9', '80.1'], teal: ['71.8', '79.9'], indigo: ['71.9', '80'],
  pink: ['71.8', '80.1'], fuchsia: ['71.8', '80'],  lime: ['71.9', '79.9'],
  sky: ['71.9', '80.1'],  emerald: ['71.7', '80.1'], red: ['71.8', '79.9'],
  gold: ['71.9', '79.9'],
};
// Every base accent lands on the same L* rung. That uniformity is the point:
// it means "is this hue readable here?" has one answer for all sixteen, instead
// of sixteen answers that drift apart the next time someone adds a category.
const BALANCED_CHIPS = {
  blue: '29.1', green: '30.9', amber: '30.3', rose: '30.2', violet: '30.1',
  cyan: '30.1', orange: '29.9', teal: '29.9', indigo: '29.9', pink: '30',
  fuchsia: '30', lime: '30', sky: '30.1', emerald: '29.9', red: '29.7',
  gold: '30',
};

export const balanced = Object.freeze({
  id: 'balanced',
  family: 'dark',
  colorScheme: 'dark',

  // Radix 1–5.
  surface: Object.freeze({
    inset:        SLATE['15.4'],  // below step 1 — wells, code blocks, progress tracks
    canvas:       SLATE['18.2'],  // step 1 — the page itself, behind cards
    canvasSubtle: SLATE['22.3'],  // step 2 — full-bleed chrome: modals, nav bars
    default:      SLATE['22.3'],  // step 3 — the base content surface
    raised:       SLATE['25.9'],  // step 3+ — cards lifted off `default`
    hover:        SLATE['28.1'],  // step 4 — popovers, and the hover state
    pressed:      SLATE['32.1'],  // step 5 — pressed and selected
  }),
  // Radix 6–8. Only `strong` clears 3:1 and may be a control's sole boundary.
  border: Object.freeze({
    subtle:  SLATE['33.9'],   // decorative dividers ONLY
    default: SLATE['42'],     // card and input outlines
    strong:  SLATE['59.1'],   // the 3:1 tier
  }),
  // Radix 11–12, plus the two non-tier foregrounds.
  fg: Object.freeze({
    primary:   SLATE['93.2'],
    secondary: SLATE['76.1'],
    tertiary:  SLATE['71.8'],
    disabled:  SLATE['51.8'],  // not a tier; exempt from the contrast floors
    onSolid:   SLATE['7.5'],   // dark ink, for the light-fill solid buttons
    onTint:    SLATE['93.2'],  // a label sitting on a tinted chip
  }),
  // Radix 9–10.
  accent: Object.freeze({
    solid:      BLUE['63.1'],   // light fill…
    solidHover: BLUE['71.8'],
    fg:         BLUE['71.8'],
    fgStrong:   BLUE['80'],
    deep:       BLUE['63.1'],
    fgSoft:     BLUE['80'],
    subtleBg:   BLUE['29.1'],
  }),
  focusRing: BLUE['76.1'],
  status: Object.freeze({
    success: Object.freeze({ fg: GREEN['71.8'], subtleBg: GREEN['30.9'] }),
    warning: Object.freeze({ fg: AMBER['71.8'], subtleBg: AMBER['30.3'] }),
    danger:  Object.freeze({ fg: RED['71.8'],   subtleBg: RED['29.7'] }),
    info:    Object.freeze({ fg: TEAL['71.8'],  subtleBg: TEAL['29.9'] }),
  }),
  hue: expandHues(BALANCED_HUE_STEPS, (name) => RAMPS[name][BALANCED_CHIPS[name]]),

  // ── Glass surfaces are OPAQUE in this theme, and that is the point ─────────
  // The other themes paint a card as a white wash over whatever is behind it,
  // which self-adjusts but lands wherever it lands. Here the ladder above is
  // the specification, so a card gets `default` exactly rather than a 3.5%
  // wash over `canvas` that composites two L* short of it. `translucent` keeps
  // its name because that is the role these fill in every other theme.
  translucent: Object.freeze({
    surface: SLATE['22.3'],       // a card IS the default content surface
    surfaceQuiet: SLATE['21'],    // the quieter inner panel
    surfaceRaised: SLATE['25.9'], // raised cards and hover fills
    inputBg: SLATE['15.4'],       // an input is a well
    inputBorder: SLATE['42'],     // …with the default outline
  }),
  // Depth without shadows: a hairline of light on the top edge, nothing else.
  elevation: Object.freeze({
    highlight: WHITE_A['5.5'],
    raised: `inset 0 1px 0 ${WHITE_A['5.5']}`,
    quiet:  `inset 0 1px 0 ${WHITE_A[5]}`,
  }),
  scrim: SCRIM_A.slate62,
  pageGlow: 'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(114,181,248,0.055) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(176,167,245,0.035) 0%, transparent 58%)',
  noiseOpacity: '0.012',
  font: FONT,
});

// ─────────────────────────────────────────────────────────────────────────────
// DARK — the deep theme. Values are unchanged from before the token
// restructure; they are now merely expressed as steps rather than as loose hex.
// ─────────────────────────────────────────────────────────────────────────────
const DARK_HUE_STEPS = {
  blue: ['55', '65.5'], green: ['66.8', '75.8'], amber: ['72.2', '80.7'],
  rose: ['55.7', '65'], violet: ['51.6', '64.6'], cyan: ['68.2', '77.9'],
  orange: ['63.7', '70.5'], teal: ['67.4', '76.9'], indigo: ['50.1', '61.8'],
  pink: ['56.9', '65.5'], fuchsia: ['57.4', '67.8'], lime: ['74.9', '84.3'],
  sky: ['64.1', '72.2'], emerald: ['54.9', '75.8'], red: ['55', '64.1'],
  gold: ['75.9', '83.7'],
};

export const dark = Object.freeze({
  id: 'dark',
  family: 'dark',
  colorScheme: 'dark',
  surface: Object.freeze({
    inset: MIDNIGHT['12.1'], canvas: MIDNIGHT['3.9'], canvasSubtle: MIDNIGHT['5.9'],
    default: MIDNIGHT['9.7'], raised: MIDNIGHT['15.4'], hover: MIDNIGHT['19.6'],
    pressed: MIDNIGHT['24.5'],
  }),
  border: Object.freeze({ subtle: WHITE_A[4], default: WHITE_A[7], strong: WHITE_A[18] }),  // b2+b3 both land on `strong`
  fg: Object.freeze({
    primary: MIDNIGHT['94.1'], secondary: MIDNIGHT['67.9'], tertiary: MIDNIGHT['51.5'],
    disabled: MIDNIGHT['46.9'], onSolid: WHITE, onTint: WHITE,
  }),
  accent: Object.freeze({
    solid: BLUE['55'], solidHover: BLUE['65.5'], fg: BLUE['55'],
    fgStrong: BLUE['65.5'], deep: BLUE['43.4'], fgSoft: BLUE['78'], subtleBg: wash(BLUE['55']),
  }),
  focusRing: BLUE['65.5'],
  status: Object.freeze({
    success: Object.freeze({ fg: GREEN['66.8'], subtleBg: wash(GREEN['66.8']) }),
    warning: Object.freeze({ fg: AMBER['72.2'], subtleBg: wash(AMBER['72.2']) }),
    danger:  Object.freeze({ fg: RED['55'],     subtleBg: wash(RED['55']) }),
    info:    Object.freeze({ fg: TEAL['67.4'],  subtleBg: wash(TEAL['67.4']) }),
  }),
  hue: expandHues(DARK_HUE_STEPS, (_n, base) => wash(base)),
  translucent: Object.freeze({
    surface: WHITE_A[3], surfaceQuiet: WHITE_WASH[3], surfaceRaised: WHITE_A[6],
    inputBg: WHITE_A[4], inputBorder: WHITE_A[10],
  }),
  elevation: Object.freeze({
    highlight: WHITE_A[4],
    raised: `0 2px 12px ${SHADOW_A[5]},inset 0 1px 0 ${WHITE_A[4]}`,
    quiet: `0 2px 8px ${SHADOW_A[3]}`,
  }),
  scrim: SCRIM_A.midnight55,
  pageGlow: 'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(45,127,255,0.10) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(139,92,246,0.06) 0%, transparent 58%)',
  noiseOpacity: '0.018',
  font: FONT,
});

// ─────────────────────────────────────────────────────────────────────────────
// BALANCED LIGHT — overcast daylight. Unchanged values, restated as steps.
// ─────────────────────────────────────────────────────────────────────────────
const BALANCED_LIGHT_HUE_STEPS = {
  blue: ['42.4', '34.8'], green: ['42', '34.6'], amber: ['42.7', '35'],
  rose: ['42.1', '34.3'], violet: ['38.2', '32'], cyan: ['41.9', '34.6'],
  orange: ['42.8', '35'], teal: ['42.5', '35.1'], indigo: ['36.3', '30.5'],
  pink: ['42.6', '34.8'], fuchsia: ['42', '34.4'], lime: ['42.2', '34.7'],
  sky: ['42.4', '34.9'], emerald: ['39.4', '33'], red: ['41.9', '35'],
  gold: ['42.6', '35'],
};

export const balancedLight = Object.freeze({
  id: 'balancedLight',
  family: 'light',
  colorScheme: 'light',
  surface: Object.freeze({
    inset: MIST['94.3'], canvas: MIST['90.1'], canvasSubtle: MIST['92.9'],
    default: MIST['96.1'], raised: MIST['92.2'], hover: MIST['87.9'],
    pressed: MIST['82.8'],
  }),
  border: Object.freeze({ subtle: INK_A['5.5'], default: INK_A[11], strong: INK_A[27] }),
  fg: Object.freeze({
    primary: MIST['15.9'], secondary: MIST['35'], tertiary: MIST['45'],
    disabled: MIST['50.5'], onSolid: WHITE, onTint: null, // computed: see onTint()
  }),
  accent: Object.freeze({
    solid: BLUE['42.4'], solidHover: BLUE['34.8'], fg: BLUE['42.4'],
    fgStrong: BLUE['34.8'], deep: BLUE['34.8'], fgSoft: BLUE['30.5'], subtleBg: wash(BLUE['42.4']),
  }),
  focusRing: BLUE['42.4'],
  status: Object.freeze({
    success: Object.freeze({ fg: GREEN['42'], subtleBg: wash(GREEN['42']) }),
    warning: Object.freeze({ fg: AMBER['42.7'], subtleBg: wash(AMBER['42.7'], 0.11) }),
    danger:  Object.freeze({ fg: RED['41.9'], subtleBg: wash(RED['41.9']) }),
    info:    Object.freeze({ fg: TEAL['42.5'], subtleBg: wash(TEAL['42.5']) }),
  }),
  hue: expandHues(BALANCED_LIGHT_HUE_STEPS, (n, base) => wash(base, n === 'amber' || n === 'gold' ? 0.11 : 0.10)),
  translucent: Object.freeze({
    surface: WHITE_WASH[55], surfaceQuiet: WHITE_WASH[42], surfaceRaised: WHITE_WASH[72],
    inputBg: MIST['97.5'], inputBorder: INK_A[16],
  }),
  elevation: Object.freeze({
    highlight: WHITE_WASH[55],
    raised: `0 1px 2px ${INK_A[5]},0 6px 20px ${INK_A[7]}`,
    quiet: `0 1px 3px ${INK_A[8]}`,
  }),
  scrim: SCRIM_A.mist38,
  pageGlow: 'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(29,102,219,0.055) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(109,49,212,0.035) 0%, transparent 58%)',
  noiseOpacity: '0.010',
  font: FONT,
});

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT — the brightest theme. Unchanged values, restated as steps.
// ─────────────────────────────────────────────────────────────────────────────
const LIGHT_HUE_STEPS = {
  blue: ['44.1', '36.2'], green: ['44.4', '36.3'], amber: ['44', '36.1'],
  rose: ['44.1', '36.9'], violet: ['43.4', '36.5'], cyan: ['43.8', '36.9'],
  orange: ['44.2', '36.3'], teal: ['43.7', '36.6'], indigo: ['40.7', '34.2'],
  pink: ['43.7', '36.7'], fuchsia: ['43.9', '36.8'], lime: ['43.8', '36.2'],
  sky: ['44.5', '36.6'], emerald: ['44.4', '36.4'], red: ['44.7', '36.4'],
  gold: ['44.5', '36.5'],
};

export const light = Object.freeze({
  id: 'light',
  family: 'light',
  colorScheme: 'light',
  surface: Object.freeze({
    inset: MIST['97.1'], canvas: MIST['92.6'], canvasSubtle: MIST['95.7'],
    default: MIST['98.9'], raised: MIST['95'], hover: MIST['91.4'],
    pressed: MIST['86.7'],
  }),
  border: Object.freeze({ subtle: INK_A[5], default: INK_A[10], strong: INK_A[24] }),
  fg: Object.freeze({
    primary: MIST['9.3'], secondary: MIST['32.5'], tertiary: MIST['44.6'],
    disabled: MIST['52.7'], onSolid: WHITE, onTint: null,
  }),
  accent: Object.freeze({
    solid: BLUE['44.1'], solidHover: BLUE['36.2'], fg: BLUE['44.1'],
    fgStrong: BLUE['36.2'], deep: BLUE['36.2'], fgSoft: BLUE['34.2'], subtleBg: wash(BLUE['44.1']),
  }),
  focusRing: BLUE['44.1'],
  status: Object.freeze({
    success: Object.freeze({ fg: GREEN['44.4'], subtleBg: wash(GREEN['44.4']) }),
    warning: Object.freeze({ fg: AMBER['44'], subtleBg: wash(AMBER['44'], 0.11) }),
    danger:  Object.freeze({ fg: RED['44.7'], subtleBg: wash(RED['44.7']) }),
    info:    Object.freeze({ fg: TEAL['43.7'], subtleBg: wash(TEAL['43.7']) }),
  }),
  hue: expandHues(LIGHT_HUE_STEPS, (n, base) => wash(base, n === 'amber' || n === 'gold' ? 0.11 : 0.10)),
  translucent: Object.freeze({
    surface: WHITE_WASH[70], surfaceQuiet: WHITE_WASH[55], surfaceRaised: WHITE_WASH[88],
    inputBg: MIST['99.3'], inputBorder: INK_A[14],
  }),
  elevation: Object.freeze({
    highlight: WHITE_WASH[70],
    raised: `0 1px 2px ${INK_A[4]},0 6px 20px ${INK_A[6]}`,
    quiet: `0 1px 3px ${INK_A[7]}`,
  }),
  scrim: SCRIM_A.mist35,
  pageGlow: 'radial-gradient(ellipse 75% 60% at 72% -8%, rgba(45,127,255,0.07) 0%, transparent 62%), radial-gradient(ellipse 60% 50% at 2% 12%, rgba(124,58,237,0.04) 0%, transparent 58%)',
  noiseOpacity: '0.012',
  font: FONT,
});

// ─────────────────────────────────────────────────────────────────────────────
// High-contrast overlays.
//
// These are semantic PATCHES, not themes: they layer onto the chosen base and
// touch only what actually matters for contrast — foregrounds pushed to the
// extremes, borders hardened so structure survives without relying on subtle
// fills, and translucent surfaces dropped to solid so text never sits on
// something see-through. Each base gets its own overlay rather than sharing
// one, because an overlay built for a different ramp would silently move the
// student into a different theme the moment they turned the setting on.
// ─────────────────────────────────────────────────────────────────────────────
const hcHues = (steps, fallback) => {
  const out = {};
  for (const name of HUE_NAMES) {
    const [base, strong] = steps[name] || [null, null];
    const ramp = RAMPS[name];
    const e = {};
    if (base) e.fg = ramp[base];
    if (strong) e.fgStrong = ramp[strong];
    else if (fallback) e.fgStrong = fallback[name]?.fgStrong;
    out[name] = e;
  }
  return Object.freeze(out);
};

export const hcBalanced = Object.freeze({
  fg: Object.freeze({ primary: WHITE, secondary: SLATE['89.6'], tertiary: SLATE['77'], disabled: SLATE['64.3'], onTint: WHITE }),
  border: Object.freeze({ subtle: WHITE_A[22], default: WHITE_A[34], strong: WHITE_A[72] }),
  translucent: Object.freeze({ surface: SLATE['14.6'], surfaceQuiet: SLATE['16.9'], surfaceRaised: SLATE['21'], inputBg: SLATE['14.6'], inputBorder: WHITE_A[42] }),
  hue: hcHues({
    blue: [null, '86.1'], green: [null, '86'],   amber: [null, '86.1'], rose: [null, '86.1'],
    violet: [null, '86.1'], cyan: [null, '86'],  orange: [null, '86'],  teal: [null, '86'],
    indigo: [null, '86'], pink: [null, '86'],    fuchsia: [null, '86'], lime: [null, '85.9'],
    sky: [null, '85.9'], emerald: [null, '86.1'], red: [null, '86'],    gold: [null, '85.9'],
  }),
  pageGlow: 'none',
  noiseOpacity: '0',
});

export const hcDark = Object.freeze({
  fg: Object.freeze({ primary: WHITE, secondary: MIDNIGHT['88.2'], tertiary: MIDNIGHT['73.7'], disabled: MIDNIGHT['60.6'], onTint: WHITE }),
  border: Object.freeze({ subtle: WHITE_A[22], default: WHITE_A[34], strong: WHITE_A[72] }),
  translucent: Object.freeze({ surface: MIDNIGHT['6.8'], surfaceQuiet: MIDNIGHT['9.2'], surfaceRaised: MIDNIGHT['13.7'], inputBg: MIDNIGHT['6.8'], inputBorder: WHITE_A[42] }),
  hue: hcHues({
    blue: [null, '74.9'], green: [null, '83.3'], amber: [null, '84.8'], rose: [null, '72'],
    violet: [null, '74.6'], cyan: [null, '84.9'], orange: [null, '77'], teal: [null, '85'],
    indigo: [null, '73.7'], pink: [null, '72.8'], fuchsia: [null, null], lime: [null, '89.9'],
    sky: [null, '79.6'], emerald: [null, '83.3'], red: [null, '72.6'], gold: [null, '88.8'],
  }, dark.hue),
  noiseOpacity: '0',
});

export const hcBalancedLight = Object.freeze({
  fg: Object.freeze({ primary: BLACK, secondary: MIST['14.1'], tertiary: MIST['26'], disabled: MIST['37.9'], onTint: null }),
  border: Object.freeze({ subtle: INK_A[24], default: INK_A[36], strong: INK_A[76] }),
  surface: Object.freeze({ inset: MIST['96.5'], canvas: MIST['93'], canvasSubtle: MIST['96.2'], default: MIST['98.2'], raised: MIST['94'], hover: MIST['89.3'], pressed: MIST['82.9'] }),
  translucent: Object.freeze({ surface: MIST['98.2'], surfaceQuiet: MIST['98.2'], surfaceRaised: MIST['95.3'], inputBg: WHITE, inputBorder: INK_A[48] }),
  hue: hcHues({
    blue: ['34', '26.1'], green: ['35.6', '26.9'], amber: ['37.3', '29.9'], rose: ['34.6', '27.3'],
    violet: ['27.7', '21.9'], cyan: ['37', '29.9'], orange: ['37.9', '30'], teal: ['37.3', '29.2'],
    indigo: ['25.2', '19.7'], pink: ['32.1', '25.2'], fuchsia: ['31.1', '24.3'], lime: ['35.9', '27.7'],
    sky: ['35.7', '28'], emerald: ['30.7', '24'], red: ['32.1', '25.1'], gold: ['39', '31'],
  }),
  pageGlow: 'none',
  noiseOpacity: '0',
});

export const hcLight = Object.freeze({
  fg: Object.freeze({ primary: BLACK, secondary: MIST['15.1'], tertiary: MIST['29.4'], disabled: MIST['42.5'], onTint: null }),
  border: Object.freeze({ subtle: INK_A[22], default: INK_A[34], strong: INK_A[75] }),
  surface: Object.freeze({ inset: MIST['97.2'], canvas: WHITE, canvasSubtle: WHITE, default: WHITE, raised: MIST['95.4'], hover: MIST['91.4'], pressed: MIST['85.6'] }),
  translucent: Object.freeze({ surface: WHITE, surfaceQuiet: WHITE, surfaceRaised: MIST['96.4'], inputBg: WHITE, inputBorder: INK_A[45] }),
  hue: hcHues({
    blue: ['37.2', '28.6'], green: ['39.7', '30.7'], amber: ['41.6', '33.9'], rose: ['38.2', '30.1'],
    violet: ['31.1', '25.5'], cyan: ['41.6', '33.5'], orange: ['42.3', '33.7'], teal: ['41.8', '32.8'],
    indigo: ['28.3', '24.3'], pink: ['36.3', '28.6'], fuchsia: ['35.1', '27.5'], lime: ['40.1', '30.2'],
    sky: ['39.8', '31.4'], emerald: ['34.1', '26.1'], red: ['36.2', '28.4'], gold: ['43.4', '34.7'],
  }),
  pageGlow: 'none',
  noiseOpacity: '0',
});

export const THEMES = Object.freeze({ balanced, balancedLight, dark, light });
export const HC_OVERLAYS = Object.freeze({
  balanced: hcBalanced, balancedLight: hcBalancedLight, dark: hcDark, light: hcLight,
});

/** The token names each layer is contractually required to expose. */
export const FG_TIERS = Object.freeze(['primary', 'secondary', 'tertiary']);
export const BORDER_STRENGTHS = Object.freeze(['subtle', 'default', 'strong']);
export const SURFACE_STEPS = Object.freeze(['inset', 'canvas', 'canvasSubtle', 'default', 'raised', 'hover', 'pressed']);
