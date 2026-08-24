// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY TOKENS — spacing and radius.
//
// ── The grid ────────────────────────────────────────────────────────────────
// Four-point grid, eight-point rhythm. Every value is a multiple of 4; every
// LAYOUT value — the gap between two components, the padding of a container,
// the margin under a heading — is a multiple of 8. The 4s exist only for
// optical nudges INSIDE a component: the 4px between an icon and its label, the
// 4px a badge sits off a baseline.
//
// The practical rule, and the one the lint enforces:
//
//   layout gaps start at 8. If you find yourself typing 14px of padding, the
//   component is wrong, not the scale.
//
// That last part is the whole point of writing this down. 14 is what you type
// when a component is 2px too tall and you are fixing it from the outside. The
// fix is inside the component — a line-height, an icon box that isn't square, a
// border you forgot counts. Every 14 in a codebase is a bug wearing a costume,
// and there were 90-odd of them here.
//
// ── Radius ──────────────────────────────────────────────────────────────────
// A fixed set, and one rule about nesting:
//
//   inner radius = outer radius − the padding between them
//
// Two rounded rectangles are concentric only when that holds. Get it wrong and
// the corners look subtly, unnameably off — the inner curve either crowds the
// outer one or floats inside it. `nested()` does the arithmetic; when the inset
// is larger than the outer radius the arcs can't be concentric at all and it
// returns 0, which is correct: a deeply inset box wants square corners or a
// radius small enough that nobody reads it as an arc.
// ─────────────────────────────────────────────────────────────────────────────

/** The unit. Everything is a multiple of this. */
export const GRID = 4;

/**
 * The spacing scale. Names are t-shirt sizes because the numbers ARE the
 * meaning here — `SP.md` is 16 and there is nothing more to say about it.
 *
 * `nudge` is the only sub-8 value, and it is named to be uncomfortable to
 * reach for in a layout.
 */
export const SP = Object.freeze({
  nudge: 4,   // optical only, inside a component
  xs:    8,
  sm:    12,
  md:    16,
  lg:    24,
  xl:    32,
  xxl:   48,
  huge:  64,
});

/** The smallest legal gap BETWEEN components. Below this is an optical nudge. */
export const LAYOUT_MIN = 8;

/** Is this a legal spacing value at all? */
export const onGrid = (px) => Number.isFinite(px) && px >= 0 && px % GRID === 0;

/** Is this legal as a gap/padding between components? */
export const isLayoutSpace = (px) => onGrid(px) && (px === 0 || px >= LAYOUT_MIN);

/**
 * The radius set. Nothing outside this list, so that `nested()` always has a
 * value to land on.
 */
export const RADIUS = Object.freeze({
  none: 0,
  xs:   4,   // chips, tags, the inside of a tight control
  sm:   8,   // buttons, inputs
  md:   12,  // quiet cards, wells
  lg:   16,  // cards
  xl:   24,  // modals, hero panels
  pill: 999,
});

const RADIUS_STEPS = [0, 4, 8, 12, 16, 24];

/** Snap an arbitrary radius to the nearest legal step. */
export const snapRadius = (px) => {
  if (px >= 999) return RADIUS.pill;
  return RADIUS_STEPS.reduce((best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best), 0);
};

/**
 * The radius an element should carry when it sits `inset` px inside a parent
 * whose radius is `outer`.
 *
 *   nested(16, 4)  → 12   a chip 4px inside a card
 *   nested(16, 24) → 0    a block inset further than the arc; square is right
 *
 * @param {number} outer the parent's border radius
 * @param {number} inset the padding between the two edges
 */
export function nested(outer, inset) {
  if (outer >= 999) return RADIUS.pill;
  return Math.max(0, outer - inset);
}
