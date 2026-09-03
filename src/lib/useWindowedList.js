// ─────────────────────────────────────────────────────────────────────────────
// Windowed rendering for long lists.
//
// ── The problem this exists to solve ────────────────────────────────────────
// The e-library is 1,628 resources and the quiz bank is comparable, and both
// screens rendered EVERY row every time the tab opened. Measured, in a real
// browser against a real build: /prep/library alone put 53,001 nodes and
// ~10,500 event listeners into the document in one commit — roughly 32 DOM
// nodes per card, each card also carrying a framer-motion instance for its
// hover effect. That is not a slow render, it is a browser tab that cannot be
// used while it is open: the tab was measured at multiple GB of resident
// memory, climbing as the student moved between tabs, because a detached copy
// of that tree stayed reachable for a long while after each unmount.
//
// The fix is to stop conflating "how many results there are" with "how many
// rows are in the document". Searching, filtering and sorting all still run
// over the FULL list — only rendering is windowed. A student sees the same
// results in the same order; the document just holds a screenful of them at a
// time instead of sixteen hundred.
//
// ── Why a hand-rolled window and not react-window ───────────────────────────
// The rows here are not fixed-height: a library card grows when its notes
// panel opens, and the grid reflows from two columns to one on a phone. A
// virtualizer needs to know row heights to position an absolutely-placed
// viewport, so making these rows work with one means pinning their heights,
// which is exactly the layout freedom the cards use. Appending in pages needs
// no height information at all, adds no dependency to a first-load budget that
// is already ratcheted (scripts/verifyPayload.mjs), and keeps the rows in
// normal document flow — so Cmd-F, tab order and screen-reader navigation
// behave the way they always did over what is rendered.
//
// ── Growth is driven by an observer AND a button, deliberately ──────────────
// The sentinel makes it feel like an ordinary long page: scroll, more arrives.
// The button is not a fallback for old browsers (IntersectionObserver is
// universal now) — it is what a keyboard user reaches, since tabbing to the
// end of the rendered rows never scrolls a sentinel into view, and it is what
// makes the behavior testable and announceable. Both are load-bearing.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// One screenful of a two-column card grid, plus enough slack that the sentinel
// starts below the fold on a tall desktop window — otherwise the observer fires
// immediately on mount and pages in twice before the student has done anything.
export const DEFAULT_PAGE = 24;

/**
 * @param {Array}  items      the FULL result list (already searched/filtered/sorted)
 * @param {object} opts
 * @param {number} opts.page  how many rows to add per step
 * @param {any}    opts.resetKey  changing this snaps the window back to the first page
 * @returns {{visible:Array, hasMore:boolean, remaining:number, total:number,
 *            showMore:()=>void, sentinelRef:React.RefObject}}
 */
export default function useWindowedList(items, { page = DEFAULT_PAGE, resetKey = null } = {}) {
  const list = Array.isArray(items) ? items : [];
  const [count, setCount] = useState(page);
  const sentinelRef = useRef(null);

  // A new search or filter is a new list, and the student is looking at the top
  // of it — carrying a grown window across would render hundreds of rows for a
  // query that matched three. `resetKey` is whatever the caller considers "a
  // different list"; the length is folded in so clearing a filter re-windows too.
  useEffect(() => { setCount(page); }, [resetKey, page, list.length]);

  const showMore = useCallback(() => {
    setCount(c => Math.min(c + page, list.length));
  }, [page, list.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || count >= list.length) return undefined;
    // rootMargin pulls the trigger a screen early so the next page is committed
    // before the student reaches the bottom and the growth is invisible to them.
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setCount(c => Math.min(c + page, list.length)); },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, list.length, page]);

  // Slicing allocates, and this runs on every keystroke in the search box while
  // `list` is stable — memoizing keeps the children's props referentially equal
  // so React can bail out of re-rendering rows that did not change.
  const visible = useMemo(() => list.slice(0, count), [list, count]);

  return {
    visible,
    hasMore: count < list.length,
    remaining: Math.max(0, list.length - count),
    total: list.length,
    showMore,
    sentinelRef,
  };
}
