// React bindings for the Track outbox (src/lib/trackQueue.js), kept out of that module so the
// queue itself stays a plain, testable, React-free library.
import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeTrackStatus, getPendingTracks } from './trackQueue';

/**
 * Live view of what's queued but not yet confirmed saved, as
 * `{ byResource: { [resource]: Set<dedupeKey> }, entries, status, refresh }`.
 *
 * Re-reads on every status change, which is what lets a Track button flip from "Queued" to
 * "Tracked" on its own the moment a background flush succeeds — without it, a student who tracked
 * something offline would keep seeing "Queued" until they reloaded the page, and would reasonably
 * conclude it never saved.
 */
export function usePendingTrackKeys() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState({ pending: 0, blocked: 0, state: 'idle', lastError: null });

  const refresh = useCallback(() => {
    getPendingTracks().then(setEntries).catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTrackStatus((s) => { setStatus(s); refresh(); });
    return unsubscribe;
  }, [refresh]);

  const byResource = {};
  for (const e of entries) (byResource[e.resource] ||= new Set()).add(e.dedupeKey);

  return { byResource, entries, status, refresh };
}

/**
 * Calls `onDrain` when the outbox transitions from having queued items to having none — i.e. a
 * background flush just succeeded and the panel's server-loaded list is now stale.
 *
 * Fires only on that transition, never on mount. An "is the queue empty?" effect would be true
 * on first render (it almost always is) and re-run the panel's initial load a second time for
 * nothing.
 */
export function useTrackQueueDrain(onDrain) {
  const wasBusy = useRef(false);
  const handler = useRef(onDrain);
  handler.current = onDrain;

  useEffect(() => subscribeTrackStatus((s) => {
    const busy = s.pending + s.blocked > 0;
    if (wasBusy.current && !busy) handler.current?.();
    wasBusy.current = busy;
  }), []);
}
