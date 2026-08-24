// ─────────────────────────────────────────────────────────────────────────────
// MOTION TOKENS — durations, easings, and the two properties we are allowed to
// animate.
//
// ── Durations ───────────────────────────────────────────────────────────────
// Every number here is the answer to "how far did this thing travel, and is the
// user waiting for it?". A hover state travels nothing and the user is not
// waiting; a modal travels the height of the screen and the user is.
//
//   hover / focus       100–150ms
//   press               100ms
//   dropdown, tooltip   150–200ms  entering
//   tab content swap    200ms
//   modal, sheet        250–300ms
//   page transition     300–400ms, capped
//
// Nothing interactive goes over 400ms. Past that it stops reading as
// responsive and starts reading as waiting, and the student blames the app for
// being slow when it is actually being decorative.
//
// ── Exits are faster than entrances ─────────────────────────────────────────
// About 65% of the entrance, because the user has already decided. An exit that
// takes as long as the entrance feels like the interface arguing.
//
// ── Only transform and opacity ──────────────────────────────────────────────
// Animating `width`, `height`, `top`, `left`, `margin` or `padding` puts layout
// and paint on the main thread for every frame. On the mid-range Android phones
// this app's audience actually owns — a $200 device with a throttled GPU and
// four other tabs open — that is a visible stutter, and a stuttering interface
// reads as a broken one. transform and opacity are composited: they cost a
// matrix multiply on the GPU and nothing on the main thread.
//
// The lint in scripts/verifyMotion.mjs fails the build on a transition that
// names a layout property, and on any duration over 400ms outside the
// deliberately-ambient allowlist (background drifts, the loading shimmer).
// ─────────────────────────────────────────────────────────────────────────────

/** Milliseconds, by what the motion is for. */
export const DUR = Object.freeze({
  press:     100,
  hover:     140,
  focus:     140,
  dropdown:  180,
  tooltip:   160,
  tab:       200,
  modal:     280,
  page:      360,
});

/** The hard ceiling for anything the user is waiting on. */
export const MAX_INTERACTIVE = 400;

/** Exits run at 65% of the matching entrance, rounded to 5ms. */
export const EXIT_RATIO = 0.65;
export const exit = (ms) => Math.round((ms * EXIT_RATIO) / 5) * 5;

export const EASE = Object.freeze({
  // Decelerating: things arriving on screen. Fast out of the gate, settles.
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Accelerating: things leaving. Nothing to watch, so it gets out of the way.
  exit:  'cubic-bezier(0.4, 0, 1, 1)',
  // Symmetric: state changes that neither arrive nor leave (hover, colour).
  state: 'cubic-bezier(0.4, 0, 0.2, 1)',
});

/**
 * A CSS `transition` shorthand, restricted to composited properties.
 *
 *   transition: tr(['opacity', 'transform'], DUR.hover)
 *
 * @param {string[]} props   must be transform/opacity, or a paint-only
 *                           property (colour, background, border, shadow) —
 *                           those don't trigger layout and are allowed.
 * @param {number}   ms
 * @param {string}   ease
 */
export const tr = (props, ms = DUR.hover, ease = EASE.state) =>
  props.map((p) => `${p} ${ms}ms ${ease}`).join(', ');

/** Properties that force layout on every frame. Never animate these. */
export const LAYOUT_PROPS = Object.freeze([
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'top', 'right', 'bottom', 'left', 'inset',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'font-size', 'line-height', 'border-width',
]);

// ── Framer Motion presets ────────────────────────────────────────────────────
// The app already uses framer-motion in ~40 places, mostly with hand-typed
// durations. These are the same numbers as above, in the shape framer wants.

const seconds = (ms) => ms / 1000;

export const MOTION = Object.freeze({
  /** Dropdowns, popovers, tooltips: a short rise, no scale on the way out. */
  popover: {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -4 },
    transition: { duration: seconds(DUR.dropdown), ease: [0.16, 1, 0.3, 1] },
  },
  /** Modals and sheets. */
  modal: {
    initial: { opacity: 0, scale: 0.98, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.98, y: 4 },
    transition: { duration: seconds(DUR.modal), ease: [0.16, 1, 0.3, 1] },
  },
  /** Tab content swaps. Opacity only — content that slides reads as a page. */
  tab: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: { duration: seconds(DUR.tab), ease: [0.4, 0, 0.2, 1] },
  },
  /** Whole-screen transitions. The cap. */
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0 },
    transition: { duration: seconds(DUR.page), ease: [0.16, 1, 0.3, 1] },
  },
});

// ── Loading thresholds ───────────────────────────────────────────────────────
// A spinner that flashes for 200ms makes an interaction feel SLOWER than one
// that shows nothing at all: the flash is a second event the eye has to
// resolve, and it advertises that waiting was possible.
//
//   < 300ms          show nothing. It already happened.
//   300ms – 1000ms   a skeleton, matching the real content's dimensions and
//                    radii exactly — a skeleton whose rows are the wrong height
//                    causes a visible reflow the moment data lands, which is
//                    the exact jank the skeleton existed to hide.
//   > 1000ms         skeleton plus a determinate indicator, if and only if we
//                    genuinely know the progress. A fake progress bar is a lie
//                    the user catches.
//
// And never more than five skeleton rows: past that it stops reading as "your
// content is coming" and starts reading as a screen made of grey bars.
export const LOADING = Object.freeze({
  showNothingBelow: 300,
  determinateAbove: 1000,
  maxSkeletonRows: 5,
});
