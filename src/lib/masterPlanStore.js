// Client side of the master plan's own database table (api/master-plan.js,
// supabase/migrations/0005_master_plans.sql).
//
// ── The contract with the rest of the app ──────────────────────────────────
// This module is strictly an UPGRADE over the existing path, never a dependency of it. The plan
// still lives on the user record and still rides the progress_sync snapshot; everything here is
// additive:
//
//   * pushPlan()      — debounced mirror of the current plan into its own row, with revision
//                       history, so a rebuild is recoverable and a big plan can never push the
//                       shared 2MB progress snapshot over its ceiling.
//   * pullPlan()      — on sign-in, returns the server's copy ONLY if it is genuinely newer than
//                       what this device holds (compared on the plan's own updatedAt).
//   * fetchHistory()/restoreRevision() — what makes "Rebuild Roadmap" reversible.
//
// Every function resolves to a benign value on any failure — offline, signed out, or a
// deployment where migration 0005 has not been applied. Nothing here is allowed to break the
// Plans tab; a student with no network still has their plan, because the local copy was always
// the working one.
import { getToken } from './authApi';
import { apiFetch, parseJson } from './http';

const PUSH_DEBOUNCE_MS = 3000;

let pushTimer = null;
let pending = null;        // { plan, reason }
let pushing = false;
let lastPushedStamp = -1;  // plan.updatedAt of the last successfully stored plan
let unavailable = false;   // set once the server says this table isn't there — stop asking

const stampOf = (plan) => {
  const v = Number(plan?.updatedAt);
  return Number.isFinite(v) ? Math.trunc(v) : 0;
};

/** True when a stored plan is genuinely newer than the local one and should be adopted. */
export function isRemoteNewer(remotePlan, localPlan) {
  if (!remotePlan) return false;
  if (!localPlan) return true;
  return stampOf(remotePlan) > stampOf(localPlan);
}

async function req(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Not signed in.');
  // apiFetch, not fetch: a request that dies in transit on a flaky or filtered
  // network is retried with backoff instead of failing the whole sync with the
  // browser's own "Failed to fetch". See src/lib/http.js.
  const res = await apiFetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

/**
 * The server's stored plan, or null when there isn't one / it isn't newer than `localPlan` /
 * anything at all goes wrong. Callers adopt the return value as-is: a non-null result is
 * always a plan worth switching to.
 */
export async function pullPlan(localPlan = null) {
  if (unavailable || !getToken()) return null;
  try {
    const { plan, unavailable: gone } = await req('/master-plan', { method: 'GET' });
    if (gone) { unavailable = true; return null; }
    if (!plan || !Array.isArray(plan.days)) return null;
    // Remember what the server holds even when we don't adopt it, so the first local edit
    // doesn't re-push an identical body.
    lastPushedStamp = Math.max(lastPushedStamp, stampOf(plan));
    return isRemoteNewer(plan, localPlan) ? plan : null;
  } catch {
    return null;
  }
}

async function doPush() {
  if (pushing || !pending) return;
  const { plan, reason } = pending;
  pending = null;
  if (unavailable || !getToken()) return;
  // Nothing changed since the last successful store — every plan mutation bumps updatedAt.
  if (stampOf(plan) <= lastPushedStamp) return;
  pushing = true;
  try {
    const result = await req('/master-plan', { method: 'PUT', body: JSON.stringify({ plan, reason: reason || null }) });
    if (result?.unavailable) { unavailable = true; return; }
    if (result?.saved) lastPushedStamp = stampOf(plan);
    // `stale` means another device holds a newer plan. Nothing to do here — the next pull
    // adopts it, and re-pushing this older copy is exactly what the server just declined.
  } catch {
    // Left for the next mutation to retry. The local plan is the working copy either way, so a
    // failed mirror costs nothing the student can perceive.
  } finally {
    pushing = false;
    if (pending) { clearTimeout(pushTimer); pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS); }
  }
}

/**
 * Mirror `plan` to the server on a debounce. Safe to call on every plan mutation — checking a
 * task off, dragging one to another day, an auto-extension — since identical bodies are skipped
 * server-side and unchanged stamps are skipped here.
 */
export function schedulePlanPush(plan, reason = null) {
  if (!plan || !Array.isArray(plan.days) || unavailable) return;
  pending = { plan, reason };
  clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS);
}

/** Push immediately — used right after a generation, which is the version most worth not losing. */
export async function flushPlanNow(plan = null, reason = null) {
  if (plan) pending = { plan, reason };
  clearTimeout(pushTimer);
  await doPush();
}

/** Archived versions, newest first. Empty array on any failure. */
export async function fetchPlanHistory() {
  if (unavailable || !getToken()) return [];
  try {
    const { history } = await req('/master-plan?history=1', { method: 'GET' });
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

/**
 * The full plan body for one archived revision, ready to hand to saveUser(). Restamped with a
 * fresh updatedAt so it wins every staleness comparison — restoring is a deliberate choice by
 * the student, and it must not lose a race with the plan it is replacing.
 */
export async function fetchPlanRevision(revision) {
  if (unavailable || !getToken()) return null;
  try {
    const { plan } = await req(`/master-plan?revision=${encodeURIComponent(revision)}`, { method: 'GET' });
    if (!plan || !Array.isArray(plan.days)) return null;
    return { ...plan, updatedAt: Date.now(), restoredFromRevision: revision };
  } catch {
    return null;
  }
}

/** Clears server state — used when a student deletes their plan outright. */
export async function deleteStoredPlan() {
  if (unavailable || !getToken()) return false;
  try {
    await req('/master-plan', { method: 'DELETE' });
    lastPushedStamp = -1;
    return true;
  } catch {
    return false;
  }
}

/** Sign-out: drop every trace of the previous account's plan from this module. */
export function resetPlanStore() {
  clearTimeout(pushTimer);
  pushTimer = null;
  pending = null;
  pushing = false;
  lastPushedStamp = -1;
  unavailable = false;
}
