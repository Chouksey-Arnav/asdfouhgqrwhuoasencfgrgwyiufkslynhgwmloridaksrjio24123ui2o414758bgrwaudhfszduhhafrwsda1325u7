// ─────────────────────────────────────────────────────────────────────────────
// The onboarding design system.
//
// ── Why this file exists ─────────────────────────────────────────────────────
// Every screen in this flow used to invent its own spacing, its own radius, its
// own easing curve and its own idea of what "an accent" meant, and it showed:
// thirty screens that were individually fine and collectively read as thirty
// different products. The tell was the emoji — a 🩺 in a rounded square is the
// fastest way to put a picture on a screen, and a flow built entirely out of
// that fastest way looks exactly like what it is.
//
// So the visual language is written down once, here, and every screen composes
// from it:
//
//   • ONE motion family. `EASE` for anything that travels, `POP` for anything
//     that lands under a finger. No screen picks its own stiffness.
//   • ONE radius ladder, ONE elevation ladder.
//   • Chapters are HUE PAIRS, not single colors. A pair gives a gradient with
//     real direction in it, which is the difference between "blue button" and
//     "designed button", and it lets the whole screen — wash, rail, progress,
//     selection, CTA — move together as the student advances.
//   • Data is set in the mono face and tracked out. `Q3 / 10`, `CHAPTER 02`,
//     `40 MIN` read as instrument readouts rather than as body copy, which is
//     most of what makes an interface feel engineered.
//
// ── The one rule inherited from src/lib/theme.js ─────────────────────────────
// `C` is mutated in place on a theme switch, so nothing here may capture a
// token into a module-level literal. Every export below is a FUNCTION that
// reads `C` at call time, and the chapter palette is stored as token NAMES.
// ─────────────────────────────────────────────────────────────────────────────
import { C, tint, shade, tone, isLight, accentFill, accentText, contrastRatio } from '../../lib/theme';

// ── Motion ───────────────────────────────────────────────────────────────────
// One curve for travel, one spring for touch, one slow curve for ambience.
// Durations are deliberately short: this is a form, and a form that takes 600ms
// to acknowledge a tap feels broken, not premium.
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_SOFT = [0.65, 0, 0.35, 1];
export const GLIDE = { duration: 0.42, ease: EASE };
export const GLIDE_FAST = { duration: 0.26, ease: EASE };
export const POP = { type: 'spring', stiffness: 520, damping: 26, mass: 0.7 };
export const SETTLE = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 };

/** Stagger helper so every list in the flow cascades at the same rate. */
export const step = (i, gap = 0.045, start = 0.04) => start + i * gap;

/** Entry transform shared by every block that reveals on mount. */
export const riseIn = (i = 0, gap = 0.045) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { ...GLIDE, delay: step(i, gap) },
});

// ── Geometry ─────────────────────────────────────────────────────────────────
export const R = { xs: 8, sm: 10, md: 13, lg: 16, xl: 20, xxl: 26, pill: 999 };

// ── Chapter palettes ─────────────────────────────────────────────────────────
// Stored as [fromToken, toToken]. Resolved through hue() at render time.
//
// The five pairs are a journey around the wheel rather than five arbitrary
// brand colors: warm at the start (why you're here), cool in the middle (an
// honest look at where you are), warm again for effort, deep for purpose, and
// green at the end because the end is the go signal. Adjacent chapters never
// share a hue family, so a chapter change is legible as a change.
export const CHAPTER_HUES = {
  why: ['rose', 'pink'],
  you: ['sky', 'cyan'],
  rhythm: ['amber', 'orange'],
  aim: ['violet', 'indigo'],
  plan: ['emerald', 'teal'],
};

/**
 * A chapter's live color set.
 *
 * Everything a screen needs from its accent, computed once: the two stops, a
 * gradient guaranteed to carry `C.onAccent`, the tints for soft fills and
 * hairlines, the glow, and the color a word must be to stay readable when it
 * sits on the page rather than on the fill.
 *
 * @param {[string,string]|string} pair token-name pair, a single token name, or a hex
 */
export function hue(pair) {
  const spec = Array.isArray(pair) ? pair : [pair, pair];
  const resolve = (t) => (typeof t === 'string' && C[t]) || (typeof t === 'string' && t.startsWith('#') ? t : null) || C.blue;
  const from = resolve(spec[0]);
  const to = resolve(spec[1] || spec[0]);
  const fillFrom = accentFill(from);
  const fillTo = accentFill(to);
  return {
    from,
    to,
    /** The single hue to use when only one is possible (a border, a dot). */
    base: from,
    /** Readable as TEXT on a card or the page. */
    ink: accentText(from),
    /** The filled treatment. Both stops are walked dark enough to carry a white label. */
    grad: `linear-gradient(135deg, ${fillFrom} 0%, ${fillTo} 100%)`,
    /** Same gradient, flatter — for thin things like progress segments. */
    bar: `linear-gradient(90deg, ${fillFrom} 0%, ${fillTo} 100%)`,
    // Soft fills run a touch STRONGER on a light page, not weaker. A 7% wash of
    // an accent over a dark surface is plainly visible; the same wash over a
    // white card is nothing at all, and the first cut of this file used the
    // lower number for light, which is why every tinted row in light mode read
    // as a plain white pill.
    /** Soft fill behind an icon or a chip. */
    soft: tint(from, isLight() ? 0.15 : 0.13),
    softer: tint(from, isLight() ? 0.085 : 0.07),
    /** Hairline in the chapter's color. */
    edge: tint(from, isLight() ? 0.28 : 0.24),
    edgeSoft: tint(from, isLight() ? 0.16 : 0.14),
    /** Drop shadow under a filled control. */
    glow: `0 12px 30px ${tint(from, isLight() ? 0.26 : 0.34)}`,
    glowSm: `0 6px 16px ${tint(from, isLight() ? 0.16 : 0.22)}`,
    /** The ambient page wash for this chapter. */
    wash: `radial-gradient(ellipse 62% 48% at 78% -6%, ${tint(to, isLight() ? 0.10 : 0.15)} 0%, transparent 64%),`
      + `radial-gradient(ellipse 54% 46% at 4% 96%, ${tint(from, isLight() ? 0.07 : 0.11)} 0%, transparent 62%)`,
    onFill: C.onAccent || '#ffffff',
  };
}

/** The hue set for a chapter key, falling back to the app's blue. */
export const chapterHue = (key) => hue(CHAPTER_HUES[key] || ['blue', 'indigo']);

// ── Type ─────────────────────────────────────────────────────────────────────
/**
 * Instrument type: mono, tracked out, small caps by convention.
 * Used for every number and every label that names a piece of data rather than
 * speaking to the student. This is the flow's strongest typographic signature.
 */
export const meta = (size = 10, x = {}) => ({
  fontFamily: C.FM, fontSize: size, fontWeight: 600,
  letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', 
  ...x,
});

/** Headline type. Tight tracking, display face. */
export const display = (size, x = {}) => ({
  fontFamily: C.FD, fontSize: size, fontWeight: 800,
  letterSpacing: size >= 34 ? '-.038em' : '-.028em', lineHeight: 1.14,
  ...x,
});

/** Body copy. One line-height for everything the student actually reads. */
export const body = (size = 14, x = {}) => ({
  fontFamily: C.FB, fontSize: size, lineHeight: 1.55, color: C.t2, ...x,
});

/** A number set in mono and locked to tabular width so it can't jitter. */
export const numeral = (size, x = {}) => ({
  fontFamily: C.FM, fontSize: size, fontWeight: 700,
  fontVariantNumeric: 'tabular-nums', letterSpacing: 'calc(-0.01em + var(--msp-letter-spacing))', ...x,
});

/** Two-digit chapter/step numerals: 01, 02 … */
export const pad2 = (n) => String(n).padStart(2, '0');

// ── Surfaces ─────────────────────────────────────────────────────────────────
/** The flow's standard raised panel. Flat, hairline, no glass blur. */
export const panel = (x = {}) => ({
  background: C.surf,
  border: `1px solid ${C.b1}`,
  borderRadius: R.lg,
  boxShadow: C.shadowSm,
  ...x,
});

/** A panel that belongs to the chapter — hairline and wash in the chapter hue. */
export const tintedPanel = (h, x = {}) => ({
  background: `linear-gradient(160deg, ${h.softer}, transparent 62%), ${C.surf}`,
  border: `1px solid ${h.edgeSoft}`,
  borderRadius: R.lg,
  boxShadow: C.shadowSm,
  ...x,
});

/**
 * ECG-paper texture. Two hairline gradients on a fixed grid.
 *
 * This is the flow's one piece of ambient ornament, and it earns its place by
 * meaning something: a chart printed on graph paper is what a medical record
 * physically looks like, and it costs zero bytes over the wire.
 */
export const chartPaper = (h, cell = 26, alpha = 1) => {
  // Hairlines read harder on a light page than on a dark one at equal alpha,
  // so the light values are pulled down rather than matched.
  const a = alpha * (isLight() ? 0.6 : 1);
  const fine = tint(h.from, 0.055 * a);
  const major = tint(h.from, 0.11 * a);
  return {
    backgroundImage:
      `linear-gradient(${fine} 1px, transparent 1px),`
      + `linear-gradient(90deg, ${fine} 1px, transparent 1px),`
      + `linear-gradient(${major} 1px, transparent 1px),`
      + `linear-gradient(90deg, ${major} 1px, transparent 1px)`,
    backgroundSize: `${cell}px ${cell}px, ${cell}px ${cell}px, ${cell * 5}px ${cell * 5}px, ${cell * 5}px ${cell * 5}px`,
  };
};

/**
 * The inner top highlight that makes a filled control read as a physical
 * surface catching light rather than a colored rectangle. One line, used on
 * every filled thing in the flow.
 */
export const lit = (strength = 0.16) => `inset 0 1px 0 rgba(255,255,255,${strength})`;

/** Focus ring. Keyboard users get a real one, everywhere, in the chapter hue. */
export const focusRing = (h) => ({
  outline: 'none',
  boxShadow: `0 0 0 2px ${C.bg}, 0 0 0 4px ${tint(h.from, 0.55)}`,
});

export { C, tint, shade, tone, isLight, accentFill, accentText, contrastRatio };
