// ─────────────────────────────────────────────────────────────────────────────
// Offline review.
//
// Flashcards are the one feature in this product that works perfectly with no
// connection — the decks ship inside the JS bundle (precached by the service
// worker), scheduling is FSRS running locally, and every review is a write to
// IndexedDB that the sync layer pushes whenever the network comes back. A large
// share of this audience studies on a phone with a data cap, on a bus, or in a
// school building where the wi-fi does not reach the back of the room.
//
// So the work here is NOT to make it function offline — it already does. It is
// to make that legible. An app that silently works offline and an app that
// looks broken offline are the same app to a student who doesn't know which one
// they have; the second one gets closed. `useOnlineStatus` plus one honest line
// of copy is the whole difference.
//
// The one genuinely network-dependent piece is first-time photo OCR (see
// capture.js), which is why that path asks before it downloads anything.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

/** True when the browser is confident there's no network. */
export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Live online/offline state.
 *
 * `navigator.onLine` is famously optimistic — it reports true for a captive
 * portal — but it is reliable in the direction that matters here: when it says
 * false, there is definitely no network, which is exactly when we want to
 * reassure rather than when we want to act.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => !isOffline());
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/** What actually still works with no connection, stated plainly. */
export const OFFLINE_CAPABILITIES = [
  'Every built-in deck, in full',
  'Your own cards and decks',
  'Scheduling — what is due, and when it comes back',
  'XP and streak credit for what you review',
];

export const OFFLINE_COPY = {
  badge: 'Offline — flashcards still work',
  body: 'You are offline. Reviewing works exactly as normal: the decks are already on your device, scheduling runs here, and everything you do now syncs the moment you are back on a connection. Nothing you review will be lost.',
  // The one thing that genuinely needs a connection the first time.
  limitation: 'The only thing that needs a connection is reading text out of a new photo, the first time you use it.',
};
