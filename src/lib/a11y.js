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
  fontScale: 1,               // 0.9 – 1.5
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

export const FONT_SCALE_STEPS = [
  { value: 0.9,  label: 'Small' },
  { value: 1,    label: 'Default' },
  { value: 1.1,  label: 'Large' },
  { value: 1.25, label: 'Larger' },
  { value: 1.5,  label: 'Largest' },
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

  // Numeric knobs → custom properties consumed by index.css.
  root.style.setProperty('--msp-font-scale', String(s.fontScale));
  root.style.setProperty('--msp-line-scale', String(s.lineSpacing));
  root.style.setProperty('--msp-letter-spacing', `${s.letterSpacing}em`);
  root.style.setProperty('--msp-tap-min', s.largeTargets ? '44px' : '0px');
  root.style.setProperty('--msp-reading-width', s.readingWidth ? '68ch' : 'none');

  // Boolean/enum knobs → data attributes, so index.css can select on them.
  const flag = (name, on) => { if (on) d[name] = 'true'; else delete d[name]; };
  flag('reduceMotion', motionReduced(s));
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
