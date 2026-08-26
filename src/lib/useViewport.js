// The React face of src/lib/viewportFit.js.
//
// One subscription for the whole app, not one per component. The app renders on
// the order of a hundred components that could reasonably want to know the
// screen size, and a hook that attached its own `resize` listener each time
// would put a hundred listeners on the same event, each measuring the viewport
// independently and each able to disagree with the others for a frame. Here a
// single watcher measures once per frame and pushes the same object to every
// subscriber, so every component in a given render sees identical numbers.
import { useEffect, useState } from 'react';
import { readViewport, watchViewport, publishViewport } from './viewportFit.js';

let current = null;
const listeners = new Set();
let stop = null;

/** The scale base the shared watcher computes `fit` from — see setViewportBase. */
let base = 1.15;

function ensureWatching() {
  if (stop) return;
  stop = watchViewport((vp) => {
    current = vp;
    publishViewport(vp);
    listeners.forEach((fn) => fn(vp));
  }, { getBase: () => base });
}

/**
 * Tell the shared watcher which text-size setting to fit around.
 *
 * Called by App.jsx whenever the student's accessibility settings change, so the
 * next measurement fits around their new choice rather than the old one.
 */
export function setViewportBase(next) {
  if (!next || next === base) return;
  base = next;
  if (current) {
    // Re-measure immediately rather than waiting for the next resize: the
    // student just changed a setting and is looking at the result.
    const vp = readViewport(base);
    current = vp;
    publishViewport(vp);
    listeners.forEach((fn) => fn(vp));
  }
}

/** The last measurement, measuring now if nothing has yet. */
export function getViewport() {
  if (!current) current = readViewport(base);
  return current;
}

/**
 * Subscribe to viewport changes outside React (App.jsx's a11y effect uses this).
 * @returns {() => void} unsubscribe
 */
export function subscribeViewport(fn) {
  ensureWatching();
  listeners.add(fn);
  if (current) fn(current);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) { stop?.(); stop = null; }
  };
}

/**
 * The live viewport: `{ width, height, device, orientation, fit, isMobile,
 * isTablet, isCompact, isShort, coarse, dpr }`.
 *
 * Initialized by measuring synchronously rather than starting empty and
 * correcting in an effect. The same reasoning as useMediaQuery in
 * components/ui/primitives.jsx: a first paint at the wrong size is a visible
 * jump, and it is worst on exactly the elements that care most about size.
 */
export function useViewport() {
  const [vp, setVp] = useState(getViewport);
  useEffect(() => subscribeViewport(setVp), []);
  return vp;
}
