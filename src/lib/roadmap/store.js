// Client side of the roadmap's own database table (api/roadmap.js,
// supabase/migrations/0015_roadmaps.sql).
//
// Deliberately the same contract, and the same shape, as src/lib/masterPlanStore.js — read that
// file's header for the reasoning, which applies here unchanged. The short version: this is an
// UPGRADE over the local copy, never a dependency of it. The roadmap lives on the user record and
// rides the progress_sync snapshot exactly as it would without this module; everything here is
// additive durability, revision history, and cross-device conflict resolution.
//
// Every function resolves to a benign value on any failure — offline, signed out, or a deployment
// where migration 0015 has not been applied by hand yet. A student with no network still has their
// whole roadmap, because the local copy was always the working one.
//
// ── The one difference from masterPlanStore ─────────────────────────────────
// A roadmap is mutated far more often than a plan is (ticking a step, entering a local date,
// moving an item to another season) and each mutation is tiny. So the debounce is longer — there
// is no value in mirroring six step-ticks as six writes, and the local copy is authoritative
// between them either way.
import { getToken } from '../authApi';

const PUSH_DEBOUNCE_MS = 6000;

let pushTimer = null;
let pending = null;        // { roadmap, reason }
let pushing = false;
let lastPushedStamp = -1;
let unavailable = false;   // set once the server says the table is not there — stop asking

const stampOf = (r) => {
  const v = Number(r?.updatedAt);
  return Number.isFinite(v) ? Math.trunc(v) : 0;
};

/** The minimum shape a stored roadmap must have to be worth adopting. */
const looksLikeRoadmap = (r) => !!r && Array.isArray(r.items) && Array.isArray(r.seasons);

/** True when a stored roadmap is genuinely newer than the local one. */
export function isRemoteNewer(remote, local) {
  if (!looksLikeRoadmap(remote)) return false;
  if (!local) return true;
  return stampOf(remote) > stampOf(local);
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

/** The server's roadmap, or null when there isn't one / it isn't newer / anything goes wrong. */
export async function pullRoadmap(local = null) {
  if (unavailable || !getToken()) return null;
  try {
    const { roadmap, unavailable: gone } = await req('/roadmap', { method: 'GET' });
    if (gone) { unavailable = true; return null; }
    if (!looksLikeRoadmap(roadmap)) return null;
    // Remember what the server holds even when not adopting it, so the first local edit does not
    // re-push an identical body.
    lastPushedStamp = Math.max(lastPushedStamp, stampOf(roadmap));
    return isRemoteNewer(roadmap, local) ? roadmap : null;
  } catch {
    return null;
  }
}

async function doPush() {
  if (pushing || !pending) return;
  const { roadmap, reason } = pending;
  pending = null;
  if (unavailable || !getToken()) return;
  if (stampOf(roadmap) <= lastPushedStamp) return;
  pushing = true;
  try {
    const result = await req('/roadmap', { method: 'PUT', body: JSON.stringify({ roadmap, reason: reason || null }) });
    if (result?.unavailable) { unavailable = true; return; }
    if (result?.saved) lastPushedStamp = stampOf(roadmap);
    // `stale` means another device holds a newer roadmap. Nothing to do — the next pull adopts
    // it, and re-pushing this older copy is exactly what the server just declined.
  } catch {
    // Left for the next mutation to retry. The local copy is the working one regardless.
  } finally {
    pushing = false;
    if (pending) { clearTimeout(pushTimer); pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS); }
  }
}

/** Mirror to the server on a debounce. Safe to call on every mutation. */
export function scheduleRoadmapPush(roadmap, reason = null) {
  if (!looksLikeRoadmap(roadmap) || unavailable) return;
  pending = { roadmap, reason };
  clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, PUSH_DEBOUNCE_MS);
}

/** Push immediately — used right after a generation, the version most worth not losing. */
export async function flushRoadmapNow(roadmap = null, reason = null) {
  if (roadmap) pending = { roadmap, reason };
  clearTimeout(pushTimer);
  await doPush();
}

/** Archived versions, newest first. Empty array on any failure. */
export async function fetchRoadmapHistory() {
  if (unavailable || !getToken()) return [];
  try {
    const { history } = await req('/roadmap?history=1', { method: 'GET' });
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

/**
 * One archived revision, restamped so it wins every staleness comparison — restoring is a
 * deliberate choice by the student and must not lose a race with the roadmap it replaces.
 */
export async function fetchRoadmapRevision(revision) {
  if (unavailable || !getToken()) return null;
  try {
    const { roadmap } = await req(`/roadmap?revision=${encodeURIComponent(revision)}`, { method: 'GET' });
    if (!looksLikeRoadmap(roadmap)) return null;
    return { ...roadmap, updatedAt: Date.now(), restoredFromRevision: revision };
  } catch {
    return null;
  }
}

/** Clears server state — used when a student deletes their roadmap outright. */
export async function deleteStoredRoadmap() {
  if (unavailable || !getToken()) return false;
  try {
    await req('/roadmap', { method: 'DELETE' });
    lastPushedStamp = -1;
    return true;
  } catch {
    return false;
  }
}

/** Sign-out: drop every trace of the previous account's roadmap from this module. */
export function resetRoadmapStore() {
  clearTimeout(pushTimer);
  pushTimer = null;
  pending = null;
  pushing = false;
  lastPushedStamp = -1;
  unavailable = false;
}
