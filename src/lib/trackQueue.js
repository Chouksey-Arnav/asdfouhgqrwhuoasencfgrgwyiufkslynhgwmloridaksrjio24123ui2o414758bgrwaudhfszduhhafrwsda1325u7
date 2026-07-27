// ─────────────────────────────────────────────────────────────────────────────
// The Track outbox — makes "I tracked this" mean it.
//
// Every Track / Add button in the app used to be a bare `createItem()` POST straight to
// /api/data/[resource]. That is fine on a good connection and silently destructive on a bad one:
// offline, flaky wifi, a cold serverless function, or an expired session all produced a red toast
// and nothing else. The student had chosen to track a school, a scholarship, a summer program —
// and the app kept no record whatsoever that they'd asked. Reload, and it was as if they never
// clicked.
//
// Now the intent is written to IndexedDB (db.js `trackQueue`) BEFORE any network call, and only
// deleted once the server has confirmed the row exists. Between those two points the app can be
// closed, refreshed, or thrown offline for a week; the track survives and flushes when it can.
//
// The three failure modes this closes, in order of how often they actually bite:
//
//   1. NETWORK FAILURE → the entry stays queued and retries on a backoff ladder, on `online`,
//      on tab refocus, and on next app start. Never dropped, never capped out into silent loss —
//      after the ladder is exhausted it sits visible in the UI with a manual Retry.
//   2. LOST RESPONSE → a POST that succeeded but whose response never made it back would, on a
//      naive retry, create a second row. Before flushing, every entry is checked against the
//      server's current list by dedupe key (see trackingCatalog.js); an entry whose row is
//      already there is satisfied, not re-sent.
//   3. NOT SIGNED IN / EXPIRED SESSION → a 401 can't be fixed by retrying, so the entry parks in
//      `blocked` state instead of burning the ladder, and flushes the moment a session exists
//      again (flushTrackQueue is called after sign-in and on app start).
//
// Double-tapping Track is handled up front: an item already tracked, or already queued, returns
// 'duplicate'/'queued' without creating anything.
// ─────────────────────────────────────────────────────────────────────────────
import * as DB from './db';
import { getToken } from './authApi';
import { listItems, createItem } from './dataApi';
import { rowDedupeKey, findExistingByKey } from './trackingCatalog';

// Mirrors progressSync.js's ladder — a transient failure should self-heal without the student
// having to do anything, and without hammering a server that is already struggling.
const RETRY_DELAYS_MS = [2000, 5000, 15000, 45000, 120000];

let retryTimer = null;
let retryAttempt = 0;
let flushing = false;
let flushAgainAfter = false;

// ── Status pub-sub ───────────────────────────────────────────────────────────
// The UI has to be able to say "saved" vs "queued, will retry" vs "sign in to finish saving".
// Anything less and the student is back to guessing whether their track took.
let status = { pending: 0, blocked: 0, state: 'idle', lastError: null };
const listeners = new Set();

function emit(patch) {
  status = { ...status, ...patch };
  listeners.forEach(fn => { try { fn(status); } catch { /* listener's problem */ } });
}

export function getTrackStatus() { return status; }
export function subscribeTrackStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

async function refreshStatus(patch = {}) {
  const entries = await DB.getTrackQueue();
  emit({
    pending: entries.filter(e => e.status === 'pending').length,
    blocked: entries.filter(e => e.status === 'blocked').length,
    ...patch,
  });
  return entries;
}

/** The queued-but-not-yet-saved entries, for the "still saving" UI. */
export async function getPendingTracks() {
  return DB.getTrackQueue();
}

function isAuthError(err) {
  const msg = String(err?.message || '');
  return /not signed in|unauthor|401/i.test(msg);
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// ── The main entry point ─────────────────────────────────────────────────────
/**
 * Durably track `row` into `resource`.
 *
 * @param {string}   resource  a /api/data/[resource] resource name
 * @param {object}   row       the row to create
 * @param {object}   opts
 * @param {string}   opts.dedupeKey  identity of the thing being tracked (trackingCatalog.js)
 * @param {string}   opts.label      human name, for the queued-items UI
 * @param {Array}    opts.existing   rows already loaded by the caller, checked before creating
 *
 * @returns {Promise<{status:'created'|'duplicate'|'queued', row?:object, reason?:string}>}
 *   Never throws for a network/auth failure — that's the point. It throws only for a caller bug
 *   (missing resource/row), which should surface loudly in development.
 */
export async function trackItem(resource, row, { dedupeKey, label, existing } = {}) {
  if (!resource || !row) throw new Error('trackItem requires a resource and a row.');
  const key = dedupeKey || rowDedupeKey(resource, row);
  const name = label || row.name || row.position || row.title || 'item';

  // Already tracked, per what the caller has loaded.
  const alreadyTracked = findExistingByKey(resource, existing, key);
  if (alreadyTracked) return { status: 'duplicate', row: alreadyTracked };

  // Already queued from an earlier tap that hasn't flushed yet.
  const alreadyQueued = await DB.findTrackQueueEntry(resource, key);
  if (alreadyQueued) {
    scheduleFlush(0);
    return { status: 'queued', reason: alreadyQueued.status === 'blocked' ? 'auth' : 'pending' };
  }

  // Durable first, network second. If the tab dies on the very next line, the intent survives.
  const queueId = await DB.addTrackQueueEntry({ resource, row, dedupeKey: key, label: name });
  await refreshStatus({ state: 'saving' });

  if (offline()) {
    await refreshStatus({ state: 'queued' });
    return { status: 'queued', reason: 'offline' };
  }

  try {
    const created = await createItem(resource, row);
    await DB.deleteTrackQueueEntry(queueId);
    retryAttempt = 0;
    await refreshStatus({ state: 'idle', lastError: null });
    return { status: 'created', row: created };
  } catch (err) {
    if (isAuthError(err)) {
      await DB.updateTrackQueueEntry(queueId, { status: 'blocked', lastError: err.message, attempts: 1 });
      await refreshStatus({ state: 'blocked', lastError: err.message });
      return { status: 'queued', reason: 'auth' };
    }
    await DB.updateTrackQueueEntry(queueId, { lastError: err.message, attempts: 1 });
    await refreshStatus({ state: 'queued', lastError: err.message });
    scheduleRetry();
    return { status: 'queued', reason: 'offline' };
  }
}

/**
 * Drops any queued track for `resource`+`dedupeKey`. Called when a student deletes a tracked row
 * — without this, a pending entry for something they just removed would flush later and
 * resurrect it.
 */
export async function cancelQueuedTrack(resource, dedupeKey) {
  const entry = await DB.findTrackQueueEntry(resource, dedupeKey);
  if (!entry) return false;
  await DB.deleteTrackQueueEntry(entry.id);
  await refreshStatus();
  return true;
}

// ── Flush ────────────────────────────────────────────────────────────────────
/**
 * Attempts every queued entry. Safe to call at any time and from anywhere — overlapping calls
 * coalesce, and an entry is only ever removed once its row is confirmed present server-side.
 *
 * @returns {Promise<{created:number, satisfied:number, remaining:number}>}
 */
export async function flushTrackQueue() {
  // Claimed synchronously, before the first await: two callers (say an `online` event landing
  // while a retry timer fires) must not both get past this guard, read the same queue, and each
  // POST the same entry.
  if (flushing) { flushAgainAfter = true; return { created: 0, satisfied: 0, remaining: status.pending }; }
  flushing = true;

  let created = 0;
  let satisfied = 0;
  let hadAuthFailure = false;
  let lastError = null;
  let entries;

  try {
    entries = await DB.getTrackQueue();
    if (!entries.length) { emit({ pending: 0, blocked: 0, state: 'idle', lastError: null }); return { created: 0, satisfied: 0, remaining: 0 }; }

    if (!getToken()) {
      // No session to flush against. Park everything rather than spending retries on a 401.
      await Promise.all(entries.filter(e => e.status !== 'blocked').map(e => DB.updateTrackQueueEntry(e.id, { status: 'blocked', lastError: 'Not signed in.' })));
      await refreshStatus({ state: 'blocked', lastError: 'Not signed in.' });
      return { created: 0, satisfied: 0, remaining: entries.length };
    }
    if (offline()) { await refreshStatus({ state: 'queued' }); return { created: 0, satisfied: 0, remaining: entries.length }; }

    emit({ state: 'saving' });
    // One list fetch per distinct resource, reused across that resource's entries — this is the
    // idempotency check (failure mode 2 in the header), so it must happen before any POST.
    const resources = [...new Set(entries.map(e => e.resource))];
    const serverRows = {};
    for (const resource of resources) {
      try { serverRows[resource] = await listItems(resource); }
      catch (err) {
        if (isAuthError(err)) { hadAuthFailure = true; lastError = err.message; }
        // A list we couldn't fetch means we can't prove the row isn't already there. Skip this
        // resource entirely this round rather than risk creating a duplicate.
        serverRows[resource] = null;
      }
    }

    for (const entry of entries) {
      const rows = serverRows[entry.resource];
      if (rows === null) continue;
      if (findExistingByKey(entry.resource, rows, entry.dedupeKey)) {
        // The row is already there — an earlier attempt landed even if we never saw the response.
        await DB.deleteTrackQueueEntry(entry.id);
        satisfied++;
        continue;
      }
      try {
        const row = await createItem(entry.resource, entry.row);
        await DB.deleteTrackQueueEntry(entry.id);
        // Keep the local mirror honest for anything flushed later in this same pass.
        if (Array.isArray(rows)) rows.push(row);
        created++;
      } catch (err) {
        lastError = err.message;
        if (isAuthError(err)) {
          hadAuthFailure = true;
          await DB.updateTrackQueueEntry(entry.id, { status: 'blocked', lastError: err.message });
        } else {
          await DB.updateTrackQueueEntry(entry.id, {
            status: 'pending', attempts: (entry.attempts || 0) + 1, lastError: err.message,
          });
        }
      }
    }
  } finally {
    flushing = false;
  }

  const remainingEntries = await refreshStatus({
    state: hadAuthFailure ? 'blocked' : 'idle',
    lastError,
  });
  const remaining = remainingEntries.length;

  if (remaining && !hadAuthFailure) { emit({ state: 'queued' }); scheduleRetry(); }
  else if (!remaining) { retryAttempt = 0; clearTimeout(retryTimer); emit({ state: 'idle', lastError: null }); }

  if (flushAgainAfter) { flushAgainAfter = false; flushTrackQueue().catch(() => {}); }
  return { created, satisfied, remaining };
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  // Ladder exhausted: stop burning requests, but the entries stay queued and visible with a
  // manual Retry, and `online`/refocus/next-app-start will still pick them up. Nothing is dropped.
  if (retryAttempt >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[retryAttempt++];
  retryTimer = setTimeout(() => { flushTrackQueue().catch(() => {}); }, delay);
}

function scheduleFlush(delay = 0) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { flushTrackQueue().catch(() => {}); }, delay);
}

/** Student-initiated "Retry now" — resets the backoff ladder and flushes immediately. */
export function retryTracksNow() {
  retryAttempt = 0;
  clearTimeout(retryTimer);
  return flushTrackQueue();
}

// ── Lifecycle wiring ─────────────────────────────────────────────────────────
// Installed once from App.jsx's init, alongside progressSync's equivalent. Regaining
// connectivity and refocusing the tab are the two moments a stuck queue can suddenly succeed.
let lifecycleInstalled = false;
export function installTrackQueueLifecycle() {
  if (lifecycleInstalled || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  window.addEventListener('online', () => { retryAttempt = 0; flushTrackQueue().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && status.pending + status.blocked > 0) {
      retryAttempt = 0;
      flushTrackQueue().catch(() => {});
    }
  });
  // Anything left over from a previous session flushes now that we're back with a live token.
  flushTrackQueue().catch(() => {});
}
