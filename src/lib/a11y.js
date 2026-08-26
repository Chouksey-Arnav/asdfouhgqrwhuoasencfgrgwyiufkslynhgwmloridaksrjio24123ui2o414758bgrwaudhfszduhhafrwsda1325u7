// ─────────────────────────────────────────────────────────────────────────────
// Accessibility preferences — one store, one apply function.
//
// Design note: almost every setting here lands as a `data-*` attribute or a CSS
// custom property on <html>, and index.css does the rest. That is deliberate.
// The alternative — threading a dozen booleans through React — would mean
// touching hundreds of components, and it would still miss everything rendered
// by dangerouslySetInnerHTML (the markdown Medabrain returns, the lesson
// articles). Styling from the root reaches all of it.
//
// The exceptions are the two settings that must change the JS token object
// itself, because inline styles can't be overridden from a stylesheet:
// high contrast and the dyslexia-friendly typeface. Those are handed to
// applyTheme() in theme.js, and the App remounts so inline styles recompute.
// ─────────────────────────────────────────────────────────────────────────────
import { applyTheme, getStoredMode, DEFAULT_THEME_MODE } from './theme';
import { readViewport, publishViewport } from './viewportFit';

const KEY = 'msp_a11y';

// OpenDyslexic isn't bundled (it's a licensed webfont and this app ships no
// self-hosted fonts), so the "dyslexia-friendly" option uses the best stack
// that is universally available: Atkinson Hyperlegible if the student has it
// installed, then Verdana/Tahoma — high x-height, wide apertures, and clearly
// differentiated letterforms, which is most of what makes a typeface easier
// for a dyslexic reader. Named honestly in the UI as "easier-to-read type".
export const READABLE_FONT_STACK = "'Atkinson Hyperlegible','Lexend',Verdana,Tahoma,-apple-system,sans-serif";

export const DEFAULTS = {
  // The app's base palette. Balanced deliberately, not Light: it is the one
  // that neither glares nor disappears, and it is what a new student should
  // meet before they know the picker exists. Every other mode stays one tap
  // away in Settings → Appearance.
  // 'balanced' (Balanced Dark) | 'balancedLight' | 'dark' | 'light' | 'system'
  themeMode: DEFAULT_THEME_MODE,
  // 1.15, not 1. This is the app's body-size floor, and it is set here rather
  // than in the type ramp because of how the app is built: there are ~3,500
  // literal `fontSize:` values in inline style objects, most of the recurring
  // body sizes are 13 and 14, and no stylesheet rule can reach any of them.
  // `zoom` on #root (see the note in index.css) is the one mechanism that
  // scales an inline-styled tree uniformly — padding, icons and hit areas move
  // with the text, so proportions hold and nothing reflows.
  //
  // At 1.15 the app's 14px body renders at 16.1px and its 13px secondary text
  // at 15px. 16 is the floor below which teenagers simply stop reading on a
  // phone; it is not a low-vision number, it is a "this looks like homework"
  // number, and the research on it does not distinguish teens from adults.
  // The long-form reading surfaces are set larger at source on top of this and
  // land at 17–18px, which is where sustained reading actually wants to be.
  //
  // The cost is honest: ~13% less fits on screen. That is the trade, and it is
  // the right way round for this audience. A student who wants the density
  // back has "Small" one tap away.
  fontScale: 1.15,            // 1 – 1.6
  // Fit the app to the screen it was opened on, sizing around `fontScale` above
  // rather than replacing it — see src/lib/viewportFit.js for the whole design.
  //
  // On by default, which is the unusual half of this decision. The argument for
  // it: the alternative default is a single fixed scale that is correct on one
  // laptop and progressively wrong on every other screen, and the students most
  // affected — the ones on 1366×768 school Chromebooks — are the least likely to
  // go looking through Settings for a fix. The argument against it is that an
  // automatic size is a size nobody chose, which is why it is damped, clamped,
  // and switched off permanently the moment a student picks a size by hand (see
  // the note on the type-size control in AppearanceSettings.jsx).
  autoFit: true,
  highContrast: false,
  readableFont: false,
  reduceMotion: 'system',     // 'system' | 'on' | 'off'
  reduceTransparency: false,
  largeTargets: false,        // pads every interactive element to >=44px
  underlineLinks: false,
  alwaysShowFocus: false,     // focus ring on click too, not just keyboard
  readingWidth: false,        // cap long prose at ~68ch
  lineSpacing: 1,             // 1 – 1.6 multiplier on body line-height
  letterSpacing: 0,           // em, 0 – 0.12
  boldText: false,
  cursorSize: 'normal',       // 'normal' | 'large'
  hideDecorative: false,      // drop the noise/glow layers entirely
};

// The ladder moved up with the default. There is no longer a step below 1:
// 0.9 put the app's 13px secondary text at 11.7px, which is not a size anyone
// should be able to choose for a whole interface by accident.
export const FONT_SCALE_STEPS = [
  { value: 1,    label: 'Small' },
  { value: 1.15, label: 'Default' },
  { value: 1.3,  label: 'Large' },
  { value: 1.45, label: 'Larger' },
  { value: 1.6,  label: 'Largest' },
];

export function loadA11y() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    // themeMode lives under its own key too (theme.js owns it) so the very
    // first paint can read it without pulling in this module.
    return { ...DEFAULTS, ...raw, themeMode: getStoredMode() };
  } catch { return { ...DEFAULTS }; }
}

export function saveA11y(settings) {
  try {
    const { themeMode, ...rest } = settings;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch { /* private mode */ }
}

/** Does the OS say "reduce motion"? */
export function systemReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/** The effective answer, after the student's override. */
export function motionReduced(settings) {
  if (settings?.reduceMotion === 'on') return true;
  if (settings?.reduceMotion === 'off') return false;
  return systemReducedMotion();
}

/**
 * Push every setting to the document root and the token object.
 * Safe to call repeatedly; it is fully declarative.
 *
 * Returns the resolved theme ('dark' | 'light') so the caller can remount.
 */
export function applyA11y(settings) {
  const s = { ...DEFAULTS, ...settings };
  const resolved = applyTheme(s.themeMode, {
    highContrast: s.highContrast,
    fontStack: s.readableFont ? READABLE_FONT_STACK : null,
  });

  if (typeof document === 'undefined') return resolved;
  const root = document.documentElement;
  const d = root.dataset;

  // ── The effective scale ────────────────────────────────────────────────────
  // `fontScale` is what the student chose; `effectiveScale` is what this screen
  // actually runs at. With auto-fit off they are the same number, which is what
  // makes this change inert for anyone who has turned it off or picked a size
  // by hand. The measurement is also published here so that the very first
  // paint already carries `data-device` and `--msp-vw` — index.css's fluid
  // rules key off those, and a frame without them is a frame of the wrong
  // layout. src/lib/useViewport.js keeps both current from then on.
  const vp = readViewport(s.fontScale);
  publishViewport(vp);
  const effectiveScale = s.autoFit === false ? s.fontScale : vp.fit;

  // Numeric knobs → custom properties consumed by index.css.
  root.style.setProperty('--msp-font-scale', String(effectiveScale));
  // The chosen value, kept separately so a settings screen can show what the
  // student picked rather than what the screen resolved it to.
  root.style.setProperty('--msp-font-scale-chosen', String(s.fontScale));
  if (s.autoFit === false) delete d.autoFit; else d.autoFit = 'true';
  root.style.setProperty('--msp-line-scale', String(s.lineSpacing));
  root.style.setProperty('--msp-letter-spacing', `${s.letterSpacing}em`);
  // 56, not 44. Every touch device already gets a 44px hit area unconditionally
  // (see the touch-target block in index.css), so this setting has to mean
  // something more than the default or turning it on does nothing — and what a
  // student with a tremor is asking for is a bigger DRAWN control, not a bigger
  // invisible one.
  root.style.setProperty('--msp-tap-min', s.largeTargets ? '56px' : '0px');
  root.style.setProperty('--msp-reading-width', s.readingWidth ? '68ch' : 'none');

  // Boolean/enum knobs → data attributes, so index.css can select on them.
  const flag = (name, on) => { if (on) d[name] = 'true'; else delete d[name]; };
  flag('reduceMotion', motionReduced(s));
  // The other direction, and the reason it needs its own attribute: index.css
  // now also collapses animation from `@media (prefers-reduced-motion: reduce)`
  // directly, so that a student who asked the OS for less motion gets it during
  // boot, on the landing page, and on the prerendered pages — none of which
  // have run this function yet. A media query cannot see an in-app override, so
  // a student whose OS says "reduce" but who has deliberately set this app's
  // toggle to "off" would be stuck with the collapse. This attribute is what
  // lets them out.
  flag('motionAllowed', s.reduceMotion === 'off');
  flag('reduceTransparency', s.reduceTransparency);
  flag('largeTargets', s.largeTargets);
  flag('underlineLinks', s.underlineLinks);
  flag('alwaysShowFocus', s.alwaysShowFocus);
  flag('boldText', s.boldText);
  flag('readableFont', s.readableFont);
  flag('highContrast', s.highContrast);
  flag('readingWidth', s.readingWidth);
  flag('hideDecorative', s.hideDecorative);
  if (s.cursorSize === 'large') d.cursorSize = 'large'; else delete d.cursorSize;

  return resolved;
}

/**
 * Announce a message to screen readers without moving focus.
 * Uses a single persistent polite live region — creating a fresh one per
 * message is a common bug, because a region added to the DOM at the same time
 * as its content is frequently not announced at all.
 */
let liveRegion = null;
export function announce(message, assertive = false) {
  if (typeof document === 'undefined' || !message) return;
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'msp-sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }
  liveRegion.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  // Clear first so an identical repeated message still fires.
  liveRegion.textContent = '';
  window.setTimeout(() => { if (liveRegion) liveRegion.textContent = String(message); }, 60);
}

/**
 * Trap Tab focus inside a container (modals, slide-overs). Returns a cleanup
 * function. Restores focus to whatever was focused before on teardown.
 */
export function trapFocus(container, { onEscape } = {}) {
  if (!container) return () => {};
  const previouslyFocused = document.activeElement;
  const SELECTOR = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const focusables = () => Array.from(container.querySelectorAll(SELECTOR)).filter(el => el.offsetParent !== null || el === document.activeElement);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { onEscape?.(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  container.addEventListener('keydown', onKeyDown);
  // Defer the initial focus so it lands after any mount animation swaps nodes.
  const t = window.setTimeout(() => { focusables()[0]?.focus(); }, 30);

  return () => {
    window.clearTimeout(t);
    container.removeEventListener('keydown', onKeyDown);
    try { previouslyFocused?.focus?.(); } catch { /* node gone */ }
  };
}
