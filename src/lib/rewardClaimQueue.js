// ─────────────────────────────────────────────────────────────────────────────
// The reward-claim outbox — makes idempotent, once-only rewards (today's check-in, an
// achievement unlock, a weekly quest claim) actually mean "once," across devices.
//
// Additive delta sync (see progressSync.js/db.js's claimSyncDelta) correctly sums XP from
// naturally-repeating events — two devices completing different quizzes should both count. But a
// MILESTONE isn't like that: if two devices independently notice "today's check-in isn't claimed
// yet" (or "10 quizzes done" for an achievement, or a weekly quest's target reached) before either
// has seen the other's confirmation, additive sync would faithfully add that milestone's XP
// twice — correct for two different quizzes, wrong for the same milestone. This needs a
// server-side atomic claim with a uniqueness guarantee (api/reward-claim.js + the `reward_claims`
// table's (user_id, claim_key) primary key), not a merge strategy.
//
// This module directly mirrors trackQueue.js's proven shape (see that file's own header) rather
// than inventing a new one: the claim intent is written to IndexedDB (db.js `rewardClaimQueue`)
// BEFORE any network call, so it survives a closed tab or a dead connection; a lost-response retry
// reuses the same `attemptId` so the server can tell "it's me again" from "someone else already
// got here" (see api/reward-claim.js's `mine` field); failures self-heal on the same retry ladder,
// `online`, tab refocus, and next app start.
//
// XP is the only side effect this module manages (apply optimistically, roll back if another
// device won the claim first). Any other reward-specific UI (a cosmetic unlock, a chest reveal)
// stays the caller's responsibility, driven off this module's return value — cosmetics are unlocks
// deduped by key already (see db.js's achievements/cosmetics merge), not a scarce/competitive
// number, so there's nothing to roll back there even if the XP portion of the same claim is.
import * as DB from './db';
import { getToken } from './authApi';

const RETRY_DELAYS_MS = [2000, 5000, 15000, 45000, 120000]; // mirrors trackQueue.js's ladder

let retryTimer = null;
let retryAttempt = 0;
let flushing = false;
let flushAgainAfter = false;

let status = { pending: 0, state: 'idle', lastError: null };
const listeners = new Set();
function emit(patch) {
  status = { ...status, ...patch };
  listeners.forEach(fn => { try { fn(status); } catch { /* listener's problem */ } });
}
export function getRewardClaimStatus() { return status; }
export function subscribeRewardClaimStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

function makeAttemptId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Secure-context-less fallback (very old browser / plain-http dev server) — still unique
  // enough for this purpose, just not RFC-4122 shaped.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isAuthError(err) {
  return /not signed in|unauthor|401/i.test(String(err?.message || ''));
}
function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
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

async function applyLocalXP(amount) {
  if (!amount) return;
  const u = await DB.getUser();
  if (u) await DB.saveUser({ ...u, xp: (u.xp || 0) + amount });
  await DB.markCounterConfirmed('xp', amount);
}

/**
 * Durably claims a one-time reward. Grants XP locally right away (instant feedback, same as
 * every other XP source in the app) and reconciles with the server in the background.
 *
 * @param {string} claimKey   globally unique per-account identity for this milestone, e.g.
 *                            `checkin:2026-08-01`, `achievement:quiz_10`, `quest:2026-W31:quizzes`
 * @param {number} xpAmount   XP to grant — deterministic, decided by the caller
 * @returns {Promise<{granted: boolean|null, reason?: string}>}
 *   `granted:true` — confirmed ours (just now, or on an earlier attempt this call is re-confirming).
 *   `granted:false` — another device claimed this key first; the local XP grant has been rolled back.
 *   `granted:null`  — couldn't reach the server right now (offline/error); queued for retry, local
 *                     grant stands for now (trust local, consistent with the rest of the app).
 */
export async function claimReward(claimKey, xpAmount) {
  const already = await DB.findRewardClaimQueueEntry(claimKey);
  if (already) { scheduleFlush(0); return { granted: null, reason: 'already-queued' }; }

  const attemptId = makeAttemptId();
  // Durable first, network second — if the tab dies on the very next line, the claim survives
  // and replays with this same attemptId, so a request that actually succeeded server-side before
  // the tab died is still recognized as "mine" rather than rolled back.
  const queueId = await DB.addRewardClaimQueueEntry({ claimKey, attemptId, xpAmount });
  await applyLocalXP(xpAmount);
  await refreshStatus();

  if (offline()) { await refreshStatus({ state: 'queued' }); return { granted: null, reason: 'offline' }; }
  return resolveEntry({ id: queueId, claimKey, attemptId, xpAmount });
}

async function refreshStatus(patch = {}) {
  const entries = await DB.getRewardClaimQueue();
  emit({ pending: entries.length, ...patch });
  return entries;
}

async function resolveEntry(entry) {
  try {
    const { granted, mine } = await req('/reward-claim', {
      method: 'POST',
      body: JSON.stringify({ claimKey: entry.claimKey, attemptId: entry.attemptId, xpAmount: entry.xpAmount }),
    });
    await DB.deleteRewardClaimQueueEntry(entry.id);
    retryAttempt = 0;
    await refreshStatus({ state: 'idle', lastError: null });
    if (granted || mine) return { granted: true };
    // Someone else's device claimed this key first — undo the optimistic local grant.
    await applyLocalXP(-entry.xpAmount);
    return { granted: false };
  } catch (err) {
    if (isAuthError(err)) {
      await DB.updateRewardClaimQueueEntry(entry.id, { status: 'blocked', lastError: err.message });
      await refreshStatus({ state: 'blocked', lastError: err.message });
    } else {
      await DB.updateRewardClaimQueueEntry(entry.id, { lastError: err.message, attempts: (entry.attempts || 0) + 1 });
      await refreshStatus({ state: 'queued', lastError: err.message });
      scheduleRetry();
    }
    return { granted: null, reason: 'network' };
  }
}

/** Replays every still-queued claim — app start, reconnect, tab refocus. Each entry resolves
 *  with its ORIGINAL attemptId (never a new one), which is what makes a claim that actually
 *  succeeded while this device was offline correctly recognized as "mine" instead of rolled back. */
export async function flushRewardClaimQueue() {
  if (flushing) { flushAgainAfter = true; return; }
  flushing = true;
  try {
    const entries = await DB.getRewardClaimQueue();
    if (!entries.length) { emit({ pending: 0, state: 'idle', lastError: null }); return; }
    if (!getToken()) {
      await Promise.all(entries.map(e => DB.updateRewardClaimQueueEntry(e.id, { status: 'blocked', lastError: 'Not signed in.' })));
      await refreshStatus({ state: 'blocked', lastError: 'Not signed in.' });
      return;
    }
    if (offline()) { await refreshStatus({ state: 'queued' }); return; }
    emit({ state: 'saving' });
    for (const entry of entries) await resolveEntry(entry);
  } finally {
    flushing = false;
  }
  const remaining = await refreshStatus();
  if (remaining.length) scheduleRetry(); else { retryAttempt = 0; clearTimeout(retryTimer); }
  if (flushAgainAfter) { flushAgainAfter = false; flushRewardClaimQueue().catch(() => {}); }
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  if (retryAttempt >= RETRY_DELAYS_MS.length) return; // stays queued, visible, picked up by online/refocus/next start
  const delay = RETRY_DELAYS_MS[retryAttempt++];
  retryTimer = setTimeout(() => { flushRewardClaimQueue().catch(() => {}); }, delay);
}
function scheduleFlush(delay = 0) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { flushRewardClaimQueue().catch(() => {}); }, delay);
}

let lifecycleInstalled = false;
export function installRewardClaimQueueLifecycle() {
  if (lifecycleInstalled || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  window.addEventListener('online', () => { retryAttempt = 0; flushRewardClaimQueue().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && status.pending > 0) {
      retryAttempt = 0;
      flushRewardClaimQueue().catch(() => {});
    }
  });
  flushRewardClaimQueue().catch(() => {});
}
