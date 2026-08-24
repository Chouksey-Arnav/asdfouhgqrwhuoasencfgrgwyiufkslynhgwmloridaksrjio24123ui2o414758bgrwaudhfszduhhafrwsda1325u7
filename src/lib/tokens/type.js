// ─────────────────────────────────────────────────────────────────────────────
// TYPE TOKENS — size, tracking, leading.
//
// Colour has three layers and a lint. Type had a font stack and 3,474 loose
// `fontSize:` numbers, which is why headings in this app read as body copy
// scaled up rather than as a display face: at 40px the browser default tracking
// is roughly a third of a millimetre too wide per letter, and the 1.6 body
// line-height inherited from <body> leaves a display line floating in a band of
// air twice as tall as the letterforms.
//
// Nobody looks at that and says "the tracking is loose". They say the app looks
// cheap. This file is the fix, and it is deliberately numeric so it stops being
// a taste argument.
//
// ── The scale ───────────────────────────────────────────────────────────────
// One ratio, held: 1.200 (minor third) from a 16px base. A denser ratio than
// the 1.25/1.333 that marketing sites use, because this is a content-dense
// application — a student's portfolio screen has eleven blocks of real
// information on it, and a scale that grows fast spends the whole viewport on
// three headings.
//
//   step  -3   -2   -1    0     1     2     3     4     5     6     7     8
//   px     9   11   13   16    19    23    28    33    40    48    57    69
//
// The app's existing sizes (9…13 for dense metadata, 15/16 for body, 20-28 for
// panel headings) land on this scale already; the scale is a description of
// where things should sit, not a migration.
//
// ── Tracking ────────────────────────────────────────────────────────────────
// Optical tracking is a function of size, not a constant, and it crosses zero
// at about 14px: below that, type needs air to stay legible; above it, the
// default spacing is progressively too loose. The anchors:
//
//   80px → −3.0    56 → −1.8    40 → −1.0    28 → −0.6
//   22px → −0.4    16 → −0.05   14 →  0      ≤13 → 0
//
// `tracking()` interpolates linearly between them, so a 34px heading gets
// −0.79 rather than whatever the nearest anchor happened to be.
//
// The one exception that goes the other way is the eyebrow label — the small
// line that sits above a heading and names the section. Small text set tight
// reads as a smudge, so it gets POSITIVE tracking (+0.4 at 13px). That is also
// the reason this app does not need uppercase eyebrows: letterspaced 13px is
// the effect people are reaching for when they type `textTransform: uppercase`,
// without the readability cost that all-caps carries (and that it carries
// worst for dyslexic readers).
//
// ── Leading ─────────────────────────────────────────────────────────────────
// Moves the opposite way to tracking: 1.55 at body sizes, tightening to 1.05 at
// display sizes. A 40px heading at 1.6 is the single most common reason a
// screen looks unset.
//
// ── The a11y knob ───────────────────────────────────────────────────────────
// Settings → Accessibility has a letter-spacing slider that widens all type up
// to +0.12em, applied as `letter-spacing` on <body>. An inline `letterSpacing`
// would silently override it, so every value this file emits is a calc() that
// ADDS the student's preference to the optical value:
//
//   letterSpacing: 'calc(-1px + var(--msp-letter-spacing))'
//
// Same for leading and `--msp-line-scale`. Design tokens that quietly disable
// an accessibility setting are worse than no tokens.
// ─────────────────────────────────────────────────────────────────────────────

/** The ratio. One, held. */
export const SCALE_RATIO = 1.2;
/** The size every other step is derived from. */
export const SCALE_BASE = 16;

/** step → px, rounded to the nearest whole pixel (sub-pixel type is blurry). */
export const step = (n) => Math.round(SCALE_BASE * SCALE_RATIO ** n);

/**
 * The named scale. Names describe role, not size, so a decision to make
 * "section" bigger is one edit here rather than a grep for `fontSize: 20`.
 */
export const SIZE = Object.freeze({
  micro:   step(-3),  //  9 — dense table metadata, chart ticks
  caption: step(-2),  // 11 — captions, pill labels
  small:   step(-1),  // 13 — secondary body, the eyebrow size
  body:    step(0),   // 16 — body copy
  lead:    step(1),   // 19 — lead paragraphs, card titles
  section: step(2),   // 23 — panel headings
  title:   step(3),   // 28 — screen titles
  display: step(5),   // 40 — hero display
  hero:    step(7),   // 57 — marketing hero
});

// ── Tracking ─────────────────────────────────────────────────────────────────

/** [px, letter-spacing in px]. Interpolated between, clamped outside. */
const TRACKING_ANCHORS = [
  [13, 0],
  [14, 0],
  [16, -0.05],
  [22, -0.4],
  [28, -0.6],
  [40, -1],
  [56, -1.8],
  [80, -3],
];

/** Positive tracking for the eyebrow label, which is the one thing set tight. */
export const EYEBROW_TRACKING = 0.4;

const interpolate = (anchors, px) => {
  if (px <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (px >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i += 1) {
    const [x1, y1] = anchors[i];
    if (px <= x1) {
      const [x0, y0] = anchors[i - 1];
      return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0);
    }
  }
  return last[1];
};

/**
 * Optical letter-spacing for a size, in px. Negative above 14, zero below.
 *
 * @param {number} px the font size the text is actually set at
 * @returns {number} px of tracking, rounded to 2dp
 */
export function tracking(px) {
  return Math.round(interpolate(TRACKING_ANCHORS, px) * 100) / 100;
}

// ── Leading ──────────────────────────────────────────────────────────────────

/** [px, unitless line-height]. Tight at display, open at body. */
const LEADING_ANCHORS = [
  [11, 1.55],
  [14, 1.55],
  [16, 1.5],
  [19, 1.45],
  [22, 1.35],
  [28, 1.25],
  [33, 1.15],
  [40, 1.1],
  [56, 1.06],
  [80, 1.05],
];

/**
 * Line-height for a size, unitless.
 *
 * @param {number} px the font size the text is actually set at
 * @returns {number} unitless line-height, rounded to 2dp
 */
export function leading(px) {
  return Math.round(interpolate(LEADING_ANCHORS, px) * 100) / 100;
}

// ── Emitters ─────────────────────────────────────────────────────────────────

/**
 * A letter-spacing value that respects the accessibility slider.
 * Returns undefined at zero tracking so we don't emit a no-op declaration that
 * would still clobber the student's preference.
 */
export function ls(px) {
  const t = tracking(px);
  if (t === 0) return undefined;
  return `calc(${t}px + var(--msp-letter-spacing))`;
}

/** A line-height that respects the accessibility line-spacing slider. */
export function lh(px) {
  return `calc(${leading(px)} * var(--msp-line-scale))`;
}

/**
 * The whole treatment for one size, ready to spread into an inline style.
 *
 *   <h2 style={{ ...type(SIZE.title), color: C.t1 }}>
 *
 * @param {number} px    the size
 * @param {object} [opt]
 * @param {number} [opt.weight]  font-weight
 * @param {string} [opt.family]  font stack (defaults to the display face at
 *                               `section` and above, body below)
 * @param {number} [opt.track]   override the optical tracking, in px
 * @param {number} [opt.lead]    override the leading, unitless
 */
export function type(px, opt = {}) {
  const { weight, family, track, lead } = opt;
  const t = track === undefined ? tracking(px) : track;
  const l = lead === undefined ? leading(px) : lead;
  const out = {
    fontSize: px,
    lineHeight: `calc(${l} * var(--msp-line-scale))`,
  };
  if (t !== 0) out.letterSpacing = `calc(${t}px + var(--msp-letter-spacing))`;
  if (weight !== undefined) out.fontWeight = weight;
  if (family !== undefined) out.fontFamily = family;
  return out;
}

/**
 * The eyebrow label: the small line that names a section above its heading.
 *
 * Sentence case, letterspaced, never uppercase — see the header note. Callers
 * pass the colour and the font stack from `C`, because this module knows
 * nothing about colour.
 */
export function eyebrow(px = SIZE.small) {
  return {
    fontSize: px,
    fontWeight: 600,
    lineHeight: `calc(1.3 * var(--msp-line-scale))`,
    letterSpacing: `calc(${EYEBROW_TRACKING}px + var(--msp-letter-spacing))`,
  };
}

/**
 * The size at and above which tracking is mandatory. Below it the optical
 * value is zero and the declaration is noise; at and above it, a missing
 * `letterSpacing` is a lint failure (scripts/verifyTypography.mjs).
 */
export const TRACKING_FLOOR = 15;

/**
 * The size at and above which an explicit line-height is mandatory. Below it,
 * inheriting the body's 1.55 is correct; above it, inheriting is the "unset"
 * look.
 */
export const LEADING_FLOOR = 22;
