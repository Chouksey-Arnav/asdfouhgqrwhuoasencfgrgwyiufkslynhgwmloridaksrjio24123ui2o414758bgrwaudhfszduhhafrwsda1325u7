// Cross-device sync for study progress that used to live only in this browser's IndexedDB (see
// db.js's "Cross-device progress sync" section for the merge logic and api/progress-sync.js for
// the server side). Pulled once on sign-in, then pushed back on a short debounce after local
// writes — db.js calls scheduleSyncPush() (registered as its dirty listener) any time a synced
// table changes, so App.jsx doesn't need to remember to trigger a push at every call site.
import { getToken } from './authApi';
import * as DB from './db';

const PUSH_DEBOUNCE_MS = 4000;
let pushTimer = null;
let pushing = false;
let pushAgainAfter = false;

// ── Sync status pub-sub ─────────────────────────────────────────────────────
// Lightweight status broadcast so the UI (Settings' "Synced just now" line)
// can reflect what's actually happening instead of the sync layer being a
// black box. Not persisted — resets to 'idle' on every fresh page load,
// which is fine since a pull/push cycle always runs again on init.
let syncStatus = { state: 'idle', lastSyncedAt: null, error: null };
const statusListeners = new Set();
function setStatus(patch) {
  syncStatus = { ...syncStatus, ...patch };
  statusListeners.forEach((fn) => { try { fn(syncStatus); } catch { /* listener's problem */ } });
}
export function getSyncStatus() { return syncStatus; }
export function resetSyncStatus() { setStatus({ state: 'idle', lastSyncedAt: null, error: null }); }
export function subscribeSyncStatus(fn) {
  statusListeners.add(fn);
  fn(syncStatus);
  return () => statusListeners.delete(fn);
}

async function req(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Not signed in.');
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

// Fetches this account's latest snapshot, or null if it has never synced before (brand new
// account, or a pre-sync-feature account that hasn't pushed yet).
export async function pullSnapshot() {
  setStatus({ state: 'syncing', error: null });
  try {
    const { data } = await req('/progress-sync', { method: 'GET' });
    setStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null });
    return data || null;
  } catch (err) {
    setStatus({ state: 'error', error: err.message || 'Sync failed.' });
    throw err;
  }
}

// Pushes the current local state immediately. Coalesces overlapping calls (if a push is already
// in flight when another is requested, one more run happens right after instead of firing two
// requests concurrently against the same row).
export async function flushNow(opts = {}) {
  if (pushing) { pushAgainAfter = true; return; }
  pushing = true;
  setStatus({ state: 'syncing', error: null });
  try {
    const snapshot = await DB.buildSyncSnapshot();
    await req('/progress-sync', {
      method: 'PUT',
      body: JSON.stringify({ data: snapshot }),
      keepalive: !!opts.keepalive,
    });
    setStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null });
  } catch (err) {
    setStatus({ state: 'error', error: err.message || 'Sync failed.' });
    throw err;
  } finally {
    pushing = false;
    if (pushAgainAfter) {
      pushAgainAfter = false;
      flushNow().catch(() => {});
    }
  }
}

// Registered with DB.setSyncDirtyListener — called (a lot, potentially) after any write to a
// synced table. Debounced so a burst of writes (e.g. finishing a 20-card review session)
// collapses into a single network call a few seconds after things go quiet.
export function scheduleSyncPush() {
  setStatus({ state: 'pending', error: null });
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { flushNow().catch(() => {}); }, PUSH_DEBOUNCE_MS);
}

// Best-effort safety net: flush immediately when the tab is backgrounded or closed, so a burst
// of progress right before a student switches devices isn't stuck behind the debounce window.
let lifecycleInstalled = false;
export function installLifecycleFlush() {
  if (lifecycleInstalled || typeof document === 'undefined') return;
  lifecycleInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow({ keepalive: true }).catch(() => {});
  });
  window.addEventListener('pagehide', () => { flushNow({ keepalive: true }).catch(() => {}); });
}
