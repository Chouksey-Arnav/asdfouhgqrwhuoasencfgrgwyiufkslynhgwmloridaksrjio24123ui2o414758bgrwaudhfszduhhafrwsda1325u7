// ─────────────────────────────────────────────────────────────────────────────
// Auto-fit — the app sizes itself to whatever screen it was opened on.
//
// ── The problem this solves ──────────────────────────────────────────────────
// This app is opened on a 1366×768 school Chromebook, a 1440×900 MacBook Air, a
// 27" desktop monitor, an iPad in either orientation and a phone, frequently by
// the same student in the same week. Until this module existed it had exactly
// one adaptive dimension — a single `(max-width: 768px)` media query separating
// "mobile" from "everything else" — so every screen from a netbook to a 5K
// display got byte-identical layout at a fixed 1.15× zoom.
//
// That is fine on the machine the layouts were designed on and progressively
// wrong in both directions away from it. On a Chromebook, whose 768px-tall
// screen is the shortest thing this app runs on, a 1.15× zoom leaves 668
// effective pixels of height for a layout that assumes ~760, so headers and
// cards that should share a screen do not. On a large monitor the same 1.15×
// leaves body text small in the middle of a lot of space.
//
// ── What "auto-fit" actually does ────────────────────────────────────────────
// It nudges the app's existing root zoom (see the `zoom` note in index.css) by
// a factor derived from the real viewport, and it does so around whatever text
// size the student has chosen rather than replacing it. "Large" still means
// larger than "Default" on every device — auto-fit only decides how large
// "larger" should be on THIS screen.
//
// Three deliberate limits, because an auto-fit that fights the user is worse
// than none:
//
//   • It is damped (DAMPING below). A screen 35% wider than the reference does
//     not get 35% bigger type — it gets about half that. Type that tracked
//     screen size linearly would be absurd at both ends.
//   • It is clamped hard, so no screen can push the app below the readable
//     floor or past the point where nothing fits.
//   • It is snapped to a 0.02 grid and only re-applied when it actually moves,
//     so dragging a window edge does not restyle the document sixty times a
//     second — that is what made earlier "fluid" attempts feel laggy rather
//     than smooth.
//
// It also publishes what it measured (device class, orientation, the live
// viewport in CSS pixels) to the document root, so index.css and any component
// can respond to the real screen instead of guessing from one breakpoint.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The viewport the app's densest desktop layouts were composed against, in the
 * app's own post-zoom coordinate space.
 *
 * Not a phone and not a 4K monitor: it is a 1280×800 laptop, which is the
 * middle of the range this app is actually used on and the size at which the
 * existing layouts are correct by construction. A screen matching it gets a
 * factor of exactly 1 and therefore the student's chosen size, untouched.
 */
const REFERENCE = { width: 1280, height: 800 };

/**
 * How much of the screen-size difference to pass through to the scale.
 *
 * 0.45, established by working backwards from the two screens that matter most:
 * at 1.0 a 1920×1080 monitor would render body text at 21px (comic), and at 0
 * this module would do nothing at all. 0.45 puts a 1920×1080 desktop at ~1.33
 * and a 1366×768 Chromebook at ~1.13 — both a clear improvement on a flat 1.15,
 * neither a size anyone would notice as odd.
 */
const DAMPING = 0.45;

/**
 * The absolute floor and ceiling, whatever the screen and whatever the setting.
 *
 * The floor is 1.0 and not lower for the reason stated at length in a11y.js:
 * below it, this app's 13px secondary text lands under 13px, and that is not a
 * size a student should arrive at without asking for it. The ceiling is
 * generous because a student on "Largest" on a big monitor has asked for it.
 */
const MIN_SCALE = 1.0;
const MAX_SCALE = 1.75;

/** Scale changes smaller than this are not worth a restyle. */
const SNAP = 0.02;

/**
 * Device classes, by the width at which this app's layout genuinely changes
 * character rather than by any vendor's device list.
 *
 *   phone    – single column, bottom nav (the app's existing 768px breakpoint)
 *   tablet   – single column, but with room for two-up cards and a wider measure
 *   laptop   – sidebar + content; the Chromebook/MacBook Air band
 *   desktop  – sidebar + content with room to spare
 *   wide     – enough width that content must be capped or it becomes unreadable
 */
export const BREAKPOINTS = { phone: 768, tablet: 1024, laptop: 1440, desktop: 1800 };

export function deviceClass(width) {
  if (width < BREAKPOINTS.phone) return 'phone';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.laptop) return 'laptop';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  return 'wide';
}

/**
 * The live viewport, in CSS pixels.
 *
 * `visualViewport` first, and this is not a detail: on iOS and on Android
 * Chrome, `innerHeight` includes the area behind a shown keyboard and behind
 * collapsing browser chrome, so a layout sized from it is taller than the space
 * the user can actually see. `visualViewport` reports what is genuinely visible.
 * It is absent on older browsers, hence the fallback chain.
 */
export function measureViewport() {
  if (typeof window === 'undefined') {
    return { width: REFERENCE.width, height: REFERENCE.height, dpr: 1, coarse: false, orientation: 'landscape' };
  }
  const vv = window.visualViewport;
  const width = Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || REFERENCE.width);
  const height = Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || REFERENCE.height);
  let coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch { /* older browser */ }
  return {
    width,
    height,
    dpr: window.devicePixelRatio || 1,
    coarse,
    orientation: height >= width ? 'portrait' : 'landscape',
  };
}

/**
 * The scale to run the app at on this screen, given the student's chosen base.
 *
 * @param {{width:number,height:number}} viewport
 * @param {number} base  the student's setting (a11y.js FONT_SCALE_STEPS)
 */
export function fitScale(viewport, base = 1.15) {
  const { width, height } = viewport;

  // Phones are excluded from the width half of the calculation on purpose.
  // Below 768px this app is already a different layout — one column, bottom
  // nav, everything full-bleed — so there is no "does it fit across" question
  // left to answer, and scaling type down to a phone's width would only make
  // the smallest screen carry the smallest text, which is backwards. What is
  // still worth honouring is a genuinely tiny screen (an older SE-class phone,
  // a split-screen Android window), where the app's 14px body at 1.15 does
  // overflow buttons — hence the width term below 380.
  if (width < BREAKPOINTS.phone) {
    const narrow = Math.min(1, width / 380);
    const factor = 1 + (narrow - 1) * DAMPING;
    return clampSnap(base * factor);
  }

  // ── Tablets: height only, and only downwards ──────────────────────────────
  // Between the phone breakpoint and 1024px the app is still substantially a
  // single column, so "is it wide enough for the desktop layout" is not a
  // question being asked and the width term has nothing to measure. Applying it
  // anyway produced the worst result in the whole table: an iPad in portrait —
  // 820 across but 1180 down, a screen with room to spare — was scored on its
  // width against a 1280px laptop reference and had its type SHRUNK for it.
  //
  // So in this band only a genuinely short screen (a tablet in landscape) moves
  // the scale, and only ever downwards.
  if (width < BREAKPOINTS.tablet) {
    const short = Math.min(1, height / REFERENCE.height);
    return clampSnap(base * (1 + (short - 1) * DAMPING));
  }

  // `min` of the two axes, not an average: fitting means fitting in BOTH
  // directions, and the axis that fails is the one that decides. This is the
  // whole Chromebook case — 1366 wide is comfortable, 768 tall is not, and an
  // average would let the comfortable axis hide the one that is failing.
  const factor = Math.min(width / REFERENCE.width, height / REFERENCE.height);

  // Damped around 1 so the reference screen is a no-op and everything else
  // moves gently away from it.
  return clampSnap(base * (1 + (factor - 1) * DAMPING));
}

function clampSnap(value) {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  // Rounded to two places after snapping, because `Math.round(x / 0.02) * 0.02`
  // lands on values like 1.1400000000000001, and this number is written into a
  // CSS custom property that a person may well read in devtools while trying to
  // work out what the app has done to their screen.
  return Number((Math.round(clamped / SNAP) * SNAP).toFixed(2));
}

/**
 * Everything measured about this screen, in one object.
 * `fit` is the scale to apply; the rest is for components and CSS.
 */
export function readViewport(base = 1.15) {
  const vp = measureViewport();
  const fit = fitScale(vp, base);

  // ── Classify on EFFECTIVE width, not raw width ────────────────────────────
  // The app runs inside a zoomed root, so a 1024px screen at 1.15 gives its
  // layout 890 pixels to work with, not 1024. Classifying on the raw number
  // asks "how big is the screen"; classifying on the effective number asks
  // "how much room does the layout have", and the second is the question every
  // consumer of this actually has. It is also what made an iPad in portrait the
  // worst device this app ran on: 820 raw put it firmly in the desktop branch
  // of every `isMobile ?` in the codebase, which spent 236 of its 713 usable
  // pixels on a sidebar.
  const effectiveWidth = Math.round(vp.width / fit);
  const effectiveHeight = Math.round(vp.height / fit);
  const device = deviceClass(effectiveWidth);

  return {
    ...vp,
    fit,
    effectiveWidth,
    effectiveHeight,
    device,
    isMobile: device === 'phone',
    isTablet: device === 'tablet',
    isCompact: effectiveWidth < BREAKPOINTS.tablet,
    // A short screen is its own constraint independent of width: a 1366×768
    // Chromebook and a phone in landscape are both "not much vertical room",
    // and anything that wants to fill a screen height needs to know.
    isShort: effectiveHeight < 720,
  };
}

/**
 * Publish the measurement to <html> so stylesheets and inline styles can both
 * see it.
 *
 * The custom properties are the important half: this app styles almost
 * everything through inline style objects, which a stylesheet cannot reach, but
 * an inline style CAN read a custom property. `--msp-vw`/`--msp-vh-px` are
 * therefore the only way a JS-styled component gets a live, keyboard-aware
 * viewport size without subscribing to a resize event of its own.
 */
export function publishViewport(vp) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.device = vp.device;
  root.dataset.orientation = vp.orientation;
  if (vp.isShort) root.dataset.shortScreen = 'true'; else delete root.dataset.shortScreen;
  if (vp.coarse) root.dataset.coarsePointer = 'true'; else delete root.dataset.coarsePointer;
  root.style.setProperty('--msp-vw', `${vp.width}px`);
  root.style.setProperty('--msp-vh-px', `${vp.height}px`);
  // The room the layout actually has, after the root zoom. This is the number a
  // component sizing itself against the screen wants — see the note in
  // readViewport about why the raw one misleads.
  root.style.setProperty('--msp-fit-w', `${vp.effectiveWidth ?? vp.width}px`);
  root.style.setProperty('--msp-fit-h', `${vp.effectiveHeight ?? vp.height}px`);
}

/**
 * Watch the viewport and call `onChange` whenever it meaningfully moves.
 *
 * ── Why the frame throttle ───────────────────────────────────────────────────
 * A window drag fires `resize` on every frame, and each call here can restyle
 * the document root — which invalidates layout for the entire tree. Coalescing
 * to one measurement per animation frame is what makes a resize a smooth
 * re-flow instead of a stutter, and it is why the callback is additionally
 * gated on the snapped scale having actually changed.
 *
 * ── Why all four listeners ───────────────────────────────────────────────────
 *   resize                  – window drag, and desktop browser zoom
 *   orientationchange       – a tablet turning; fires before `resize` settles,
 *                             so the deferred re-read below is doing real work
 *   visualViewport.resize   – a mobile keyboard opening, browser chrome
 *                             collapsing on scroll. `resize` does NOT fire for
 *                             either, which is why a phone keyboard used to
 *                             cover content with nothing responding.
 *   visibilitychange        – a laptop lid opened on a different external
 *                             monitor, or a tab restored after the display
 *                             configuration changed. No resize event is
 *                             delivered to a hidden tab, so without this the
 *                             app comes back sized for the previous screen.
 *
 * @returns {() => void} unsubscribe
 */
export function watchViewport(onChange, { getBase = () => 1.15 } = {}) {
  if (typeof window === 'undefined') return () => {};

  let frame = 0;
  let lastFit = null;
  let lastWidth = null;
  let lastHeight = null;

  const emit = (force = false) => {
    frame = 0;
    const vp = readViewport(getBase());
    const moved = force
      || vp.fit !== lastFit
      || vp.width !== lastWidth
      || vp.height !== lastHeight;
    lastFit = vp.fit;
    lastWidth = vp.width;
    lastHeight = vp.height;
    if (moved) onChange(vp);
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => emit(false));
  };

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener?.('resize', schedule);
  window.visualViewport?.addEventListener?.('scroll', schedule);
  document.addEventListener('visibilitychange', schedule);

  // A rotation reports its new size a beat after the event on several mobile
  // browsers, so the immediate read is followed by a deferred confirmation.
  const settle = window.setTimeout(() => emit(true), 320);

  emit(true);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.clearTimeout(settle);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener?.('resize', schedule);
    window.visualViewport?.removeEventListener?.('scroll', schedule);
    document.removeEventListener('visibilitychange', schedule);
  };
}
