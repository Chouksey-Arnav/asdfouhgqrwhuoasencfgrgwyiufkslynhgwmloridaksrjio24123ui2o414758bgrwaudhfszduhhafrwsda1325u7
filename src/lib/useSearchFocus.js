// ─────────────────────────────────────────────────────────────────────────────
// The panel side of the search handshake.
//
// The palette (⌘K) does not merely navigate to the screen that holds a record —
// it hands that screen the record. See the header of ./contentSearch.js for why
// arriving on the right page and leaving the student to find one card among
// ninety is the same wall with an extra step in front of it.
//
// This hook is the receiving end, and it is one hook rather than five
// near-identical copies because every focusable panel needs exactly the same
// four things: take the query, take the id, act exactly once per arrival, and
// reveal the card the moment it actually exists in the DOM.
//
// It lives apart from contentSearch.js only because that module is imported by
// the verify script under bare Node, where `react` does not resolve.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { revealFocused } from './contentSearch';

/**
 * @param {{id:string|null,q:string,n:number}|null} focus  the arrival, from App.jsx
 * @param {(f:{id:string|null,q:string}) => void} apply    sets the panel's own state:
 *   its search box, whichever filters would otherwise hide the answer, and the
 *   expanded card.
 * @returns {(el:HTMLElement|null) => void} a ref callback for the focused card.
 *
 * The nonce is what makes searching the SAME record twice work. Without it the
 * second search is a no-op — same query, same id, no state change, no scroll —
 * and to the student the palette has simply stopped working.
 *
 * The returned ref fires when React attaches the node, which is the earliest
 * moment the card can be scrolled to, and fires again on a later arrival
 * because the guard is keyed on the nonce rather than on having run once.
 */
export function useSearchFocus(focus, apply) {
  const nonce = focus?.n || 0;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const revealedFor = useRef(0);

  useEffect(() => {
    if (!nonce) return;
    applyRef.current?.({ id: focus?.id || null, q: focus?.q || '' });
    // `focus` is deliberately not a dependency: one arrival is one nonce, and
    // re-running because App re-created the object would re-open a card the
    // student had just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (el) => {
    if (!el || !nonce || revealedFor.current === nonce) return;
    revealedFor.current = nonce;
    revealFocused(el);
  };
}

export default useSearchFocus;
