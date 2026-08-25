// ─────────────────────────────────────────────────────────────────────────────
// Persistence for the MedEx Score's weekly seals.
//
// Two things live here and nothing else: reading the seal history, and taking
// this week's seal exactly once. The score itself is pure (score.js) and is
// never stored except as a sealed row — see the migration for why history is
// the one part that cannot be recomputed.
//
// ── The local mirror ────────────────────────────────────────────────────────
// The Home card shows the score above the fold, and waiting on a network round
// trip to render the single largest number on the dashboard means every cold
// open flashes a skeleton where the student's score should be. So the last
// known seal is mirrored into localStorage and painted immediately, then
// reconciled when the real rows land.
//
// The mirror is a CACHE, never a source of truth: it can be stale, it can be
// from a different account on a shared browser, and it is therefore keyed by
// user id and always overwritten by the server's answer. Nothing seals from it.
// ─────────────────────────────────────────────────────────────────────────────
import { listItems, createItem } from '../dataApi';
import { weekKey, planSeal, compareWeekKeys } from './week.js';

const MIRROR_PREFIX = 'msp_medex_seal:';

let cachedRows = null;
let sealInFlight = null;
// The last non-conflict seal failure, if any. Exposed so a surface that depends on sealed history
// can say "this week's score hasn't been recorded" instead of silently rendering an empty chart.
let lastSealError = null;

/** The last real (non-409) seal failure, or null if the most recent seal attempt was healthy. */
export function getLastSealError() { return lastSealError; }

/** Newest last — every consumer here and in the chart wants chronological order. */
const sortRows = (rows) => [...(rows || [])].sort((a, b) => compareWeekKeys(a.week_key, b.week_key));

/**
 * Load the seal history.
 *
 * Accepts the shared Portfolio snapshot so the one fetch that already pulls
 * fourteen resources covers this too, rather than the Home card firing a
 * fifteenth request on every cold open.
 */
export async function loadSeals(snapshot = null) {
  if (snapshot?.medexScores) {
    cachedRows = sortRows(snapshot.medexScores);
    return cachedRows;
  }
  if (cachedRows) return cachedRows;
  const rows = await listItems('medex_scores').catch(() => null);
  // A failed read must not look like "this student has no history" — that would
  // seal a fresh row over the top of a week that already sealed, and the unique
  // index would reject it, leaving the card showing a score that is not the
  // stored one. Null means unknown, and unknown suppresses sealing.
  cachedRows = rows ? sortRows(rows) : null;
  return cachedRows;
}

/**
 * Take this week's seal if it has not been taken.
 *
 * Returns the resolved seal state either way (see planSeal). Safe to call on
 * every render — it is idempotent within a session via `sealInFlight`, and
 * idempotent across sessions and devices via the unique index on
 * (user_id, week_key).
 */
export async function sealIfNeeded({ rows, live, benchmark = null, userId = null, now = new Date() } = {}) {
  // `rows === null` means the read failed. Sealing blind would write a row for a
  // week that may already have one; the constraint would catch it, but the
  // student would see a number flicker. Report the live score as unsealed
  // instead and try again on the next load.
  if (!Array.isArray(rows)) {
    return { ...planSeal({ rows: [], liveScore: null, now }), action: 'unknown', unsealed: true };
  }

  const plan = planSeal({ rows, liveScore: live?.score ?? null, now });
  if (plan.action !== 'seal') return plan;

  // One seal per session, even if six components mount at once.
  if (sealInFlight) { await sealInFlight.catch(() => {}); return planSeal({ rows: cachedRows || rows, liveScore: live?.score ?? null, now }); }

  const payload = {
    week_key: plan.weekKey,
    score: Math.round(live.score),
    band: live.band?.id || null,
    benchmark_id: benchmark?.id || null,
    benchmark_name: benchmark?.name || null,
    pillars: pillarPayload(live),
    coverage: live.coverage?.ratio ?? null,
    confidence: live.confidence || null,
  };

  sealInFlight = createItem('medex_scores', payload);
  try {
    const created = await sealInFlight;
    cachedRows = sortRows([...(rows || []).filter(r => r.week_key !== plan.weekKey), created]);
    lastSealError = null;
  } catch (err) {
    // A 409 is the unique index doing its job — another tab or another device sealed this week
    // first. Their row is the seal; re-read rather than retrying, so the two devices converge on
    // one number instead of racing.
    //
    // Anything else is a real failure, and it must not be swallowed. This block used to catch
    // everything and re-read, which meant the seal endpoint returning 500 on every single call
    // (it did, for months — medex_scores had no WRITABLE entry) was indistinguishable from the
    // happy "someone beat us to it" path. The table stayed empty and nothing ever said so.
    if (err?.status !== 409) {
      console.error('medex: weekly seal failed', err);
      lastSealError = err;
    }
    const fresh = await listItems('medex_scores').catch(() => null);
    if (fresh) cachedRows = sortRows(fresh);
  } finally {
    sealInFlight = null;
  }

  const settled = planSeal({ rows: cachedRows || rows, liveScore: live?.score ?? null, now });
  writeMirror(settled, userId);
  return settled;
}

/** The trimmed pillar shape that goes in the row — enough to diff two weeks, not the whole estimate. */
function pillarPayload(live) {
  const out = { z: round3(live.z) };
  for (const p of live.pillars || []) {
    out[p.id] = { z: round3(p.z), score: p.score, weight: round3(p.weight) };
  }
  return out;
}

const round3 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);

// ── The local mirror ─────────────────────────────────────────────────────────

/**
 * Last known seal for this account, for first paint only.
 *
 * Returns null rather than a stale week's score when the mirror is from a week
 * that has since ended: showing last week's number as if it were this week's
 * would be wrong in exactly the way the seal mechanic exists to prevent.
 */
export function readMirror(userId, now = new Date()) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(MIRROR_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.weekKey === weekKey(now) ? parsed : null;
  } catch { return null; }
}

export function writeMirror(settled, userId) {
  if (!userId || settled?.sealedScore == null) return;
  try {
    localStorage.setItem(MIRROR_PREFIX + userId, JSON.stringify({
      weekKey: settled.weekKey,
      score: settled.sealedScore,
      delta: settled.delta ?? null,
    }));
  } catch { /* private mode — first paint just falls back to the spinner */ }
}

/** Drops every cache. Called on sign-out so a second account never sees the first one's score. */
export function resetMedexCache(userId = null) {
  cachedRows = null;
  sealInFlight = null;
  lastSealError = null;
  if (!userId) return;
  try { localStorage.removeItem(MIRROR_PREFIX + userId); } catch { /* nothing to do */ }
}
