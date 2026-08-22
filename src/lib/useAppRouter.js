// Wires the app's navigation state to the browser's history stack.
//
// The contract is deliberately one-directional and boring, because that is what
// makes a back button trustworthy:
//
//   1. React state is the truth. The URL is a mirror of it.
//   2. Every render computes the canonical path for the current state. If the
//      address bar already says that, nothing happens — no entry, no churn.
//      If it doesn't, we push one entry (or replace, when the change wasn't a
//      navigation the student made).
//   3. popstate translates the URL back into state. That re-render then hits
//      rule 2 and finds the URL already correct, so a back press can never
//      bounce forward again or leave a stranded entry behind.
//
// That invariant — "push only when formatPath(state) !== location.pathname" —
// is the whole design. There is no queue, no in-flight flag racing a render,
// and no way for a double-render to double-push.
//
// On top of that it restores scroll position per history entry, because
// "take me back" means the screen I was looking at, not the top of it.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { formatPath, parsePath, normalizePath, HOME_ROUTE } from './routes';
import { applySeoMeta } from './seo';

/**
 * True for a click that the app should handle itself. Everything else — middle
 * click, ⌘/Ctrl-click, shift-click — is the student explicitly asking the
 * browser for a new tab or window, and a nav item rendered as a real <a href>
 * should let that happen instead of swallowing it.
 */
export function isPlainLeftClick(e) {
  return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}

/** The app's scroll container (see <main id="msp-main"> in App.jsx). */
const SCROLLER = '#msp-main';
const SCROLL_KEY = 'mspScrollPos';
/** How long to keep trying to restore a scroll offset while the view animates in. */
const RESTORE_BUDGET_MS = 900;

let keySeq = Date.now() % 1e6;
const nextKey = () => `k${(keySeq += 1)}`;

function here() {
  return normalizePath(window.location.pathname);
}

function scroller() {
  return document.querySelector(SCROLLER);
}

function readPositions() {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}'); } catch { return {}; }
}

function writePosition(key, top) {
  if (!key) return;
  try {
    const all = readPositions();
    all[key] = top;
    // Bound the map — a long session shouldn't grow sessionStorage forever.
    const keys = Object.keys(all);
    if (keys.length > 60) delete all[keys[0]];
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(all));
  } catch { /* private mode / quota — scroll restore is a nicety, never a blocker */ }
}

function readPosition(key) {
  if (!key) return 0;
  const top = readPositions()[key];
  return typeof top === 'number' ? top : 0;
}

/**
 * Scroll back to `top`, retrying across frames: the incoming view fades in and
 * its panels fill with fetched data a beat later, so the container is often
 * still too short to accept the offset on the first frame.
 */
function restoreScroll(top) {
  const started = performance.now();
  const tick = () => {
    const el = scroller();
    if (el) {
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.min(top, Math.max(max, 0));
      if (top <= 0 || Math.abs(el.scrollTop - top) < 2 || performance.now() - started > RESTORE_BUDGET_MS) return;
    } else if (performance.now() - started > RESTORE_BUDGET_MS) {
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * @param {object} opts
 * @param {{tab:string,view:string|null,overlay:object|null}} opts.route  current route, derived from state
 * @param {(route:object)=>void} opts.onNavigate  apply a route that came from history
 * @param {boolean} [opts.enabled]  false while the app isn't showing routable UI yet
 * @returns {{replaceNext:()=>void, path:string}}
 */
export default function useAppRouter({ route, onNavigate, enabled = true }) {
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  const firstSyncRef = useRef(true);
  const replaceOnceRef = useRef(false);
  const activeKeyRef = useRef(null);
  const scrollTopRef = useRef(0);

  const path = enabled ? formatPath(route) : null;

  /**
   * Ask the router to mirror the next state change into the CURRENT history
   * entry instead of a new one. For changes the student didn't navigate to —
   * restoring a lesson that was open when the tab was reloaded, a redirect —
   * where a new entry would mean "back" replays a move nobody made.
   */
  const replaceNext = useCallback(() => {
    replaceOnceRef.current = true;
    // Safety valve: if the caller marks a replace but no state change follows,
    // don't let the flag swallow the student's next real navigation.
    setTimeout(() => { replaceOnceRef.current = false; }, 0);
  }, []);

  // Browsers try to restore scroll on their own, but they only know about the
  // document scroller — ours is an inner element, so their attempt is a no-op
  // that occasionally fights ours. Own it explicitly.
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => { window.history.scrollRestoration = prev; };
    }
    return undefined;
  }, []);

  // Track the live scroll offset of whatever is scrolling. Capture phase because
  // scroll events don't bubble, and the container unmounts/remounts (the lesson
  // player replaces the entire shell) so we can't hold a ref to it.
  useEffect(() => {
    function onScroll(e) {
      const el = e.target;
      if (el && el.id === 'msp-main') scrollTopRef.current = el.scrollTop;
    }
    function persist() { writePosition(activeKeyRef.current, scrollTopRef.current); }
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('pagehide', persist);
    return () => {
      persist();
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pagehide', persist);
    };
  }, []);

  // ── State → URL ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || path == null) return;

    // Consume the replace flag on every sync, including the no-op one below:
    // leaving it armed would silently turn some later, unrelated navigation
    // into a replace and cost the student a history entry.
    const replace = replaceOnceRef.current || firstSyncRef.current;
    replaceOnceRef.current = false;
    const isFirst = firstSyncRef.current;
    firstSyncRef.current = false;

    const current = here();
    const state = window.history.state;

    if (current === path) {
      // Already correct (the usual case after a popstate). Make sure the entry
      // carries a key so its scroll offset has somewhere to live.
      if (!state?.msp?.k) {
        const k = nextKey();
        activeKeyRef.current = k;
        window.history.replaceState({ ...(state || {}), msp: { k } }, '', path);
      } else {
        activeKeyRef.current = state.msp.k;
      }
      return;
    }

    if (replace) {
      // Rewrites the current entry in place: the URL was a path we couldn't
      // honour verbatim (a bare /sat, a typo, an overlay we can't reopen), or
      // the state moved for a reason the student didn't ask for. Either way it
      // must not cost a history entry.
      const k = state?.msp?.k || nextKey();
      activeKeyRef.current = k;
      window.history.replaceState({ ...(state || {}), msp: { k } }, '', path);
      if (isFirst) scrollTopRef.current = 0;
      return;
    }

    // A real navigation: bank where they were, then open a new entry at the top.
    writePosition(activeKeyRef.current, scrollTopRef.current);
    const k = nextKey();
    activeKeyRef.current = k;
    window.history.pushState({ msp: { k } }, '', path);
    scrollTopRef.current = 0;
    const el = scroller();
    if (el) el.scrollTop = 0;
  }, [path, enabled]);

  // Canonical + robots meta follow the URL — see src/lib/seo.js for why a single
  // hard-coded canonical in index.html stopped being correct once routes existed.
  useEffect(() => { if (path != null) applySeoMeta(path); }, [path]);

  // ── URL → state ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return undefined;
    function onPop(e) {
      // Bank the outgoing entry's offset before its key is replaced, so going
      // back and then forward again lands on the same pixel both ways.
      writePosition(activeKeyRef.current, scrollTopRef.current);

      const parsed = parsePath(window.location.pathname);
      const key = e.state?.msp?.k || null;
      activeKeyRef.current = key;

      // Whatever the state change below turns out to be, it is a reaction to a
      // history move — never a new entry. (If the popped URL maps to the state
      // we're already in — /sat and /sat/overview are the same screen — no
      // re-render follows and nothing consumes the flag, so drop it on the next
      // task rather than letting it eat the student's next real navigation.)
      replaceOnceRef.current = true;
      setTimeout(() => { replaceOnceRef.current = false; }, 0);
      navigateRef.current(parsed || { ...HOME_ROUTE });

      const top = readPosition(key);
      scrollTopRef.current = top;
      restoreScroll(top);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enabled]);

  return { replaceNext, path };
}
