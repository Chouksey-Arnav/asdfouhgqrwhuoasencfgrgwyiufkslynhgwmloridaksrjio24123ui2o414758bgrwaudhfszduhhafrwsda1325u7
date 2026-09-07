// ─────────────────────────────────────────────────────────────────────────────
// THE AI BUDGET — making 150 students fit on a free Groq plan.
//
// ── The arithmetic this file exists to satisfy ───────────────────────────────
// Groq's free tier is bounded on two axes, and they fail in different ways:
//
//   • REQUESTS PER MINUTE (~30, model-dependent). This is the one that breaks
//     the product. It is a *shared* ceiling: thirty students opening the app in
//     the same class period is thirty concurrent requests, and the thirty-first
//     gets a 429 that surfaces as "Medabrain is unavailable".
//   • REQUESTS PER DAY (~14,400 on the models we use). Across 150 students that
//     is 96 per student per day — comfortable in the abstract and trivially
//     exceeded in practice, because the app used to fire model calls that
//     nobody asked for on almost every screen mount.
//
// So the budget here targets **20 model calls per student per day**, which
// lands total daily traffic around 3,000 — a fifth of the daily ceiling, with
// the headroom deliberately spent on the per-minute axis instead, where bursts
// actually hurt.
//
// ── The four levers, in the order they matter ────────────────────────────────
//
//  1. KILL AMBIENT CALLS. The single biggest saving, by a wide margin, and it
//     costs the student nothing. An "ambient" call is one no human asked for: a
//     narration generated on mount, a summary regenerated on every render, a
//     rationale for a card the student has not looked at. Every one of these
//     has a deterministic local version that is instant and free; several are
//     now produced by src/lib/decisionEngine.js, which is strictly better
//     because it can show its reasoning. Ambient calls are OFF by default and
//     the switch is per-purpose, not global.
//
//  2. SPEND ON INTENT. A call a student explicitly asked for — they typed a
//     message, they hit "critique my essay", they pressed "build my plan" — is
//     worth ten calls nobody asked for. Those get the budget.
//
//  3. CACHE HARD, AND SHARE THE CACHE. Prompts whose answer does not depend on
//     the individual student (a rubric explanation, a definition, "why this
//     quiz") are cached for hours, not minutes, and — server-side — across
//     students. See CACHE_TTL below and responseCache in api/groq.js.
//
//  4. DEGRADE, NEVER FAIL. Every purpose declares whether it has a local
//     fallback. When the budget is spent, a purpose WITH a fallback silently
//     uses it; only a purpose without one tells the student to come back later.
//     A student should be able to use this entire app on a spent budget and
//     notice only that it stopped writing prose at them.
//
// Pure functions plus a tiny localStorage ledger. No React, no network — so
// scripts/verifyAiBudget.mjs can assert the whole policy under plain Node.
// ─────────────────────────────────────────────────────────────────────────────

import { localDateStr } from './dateUtils.js';

/** The per-student, per-day ceiling this whole file is built around. */
export const DAILY_CALL_BUDGET = 20;

/**
 * How a call is classified, and what that classification buys it.
 *
 * `share` is the fraction of the daily budget this lane may consume. They sum
 * to more than 1 on purpose: a student who never touches the essay coach should
 * not have that allowance stranded, so lanes overlap and the global ceiling is
 * what actually binds.
 */
export const LANES = {
  // Never budgeted, never blocked, never cached. The safety classifier is not a
  // feature a student invokes — it is a pass over messages the app is already
  // sending, and a budget that switches it off switches off the detection for
  // exactly the student sending a lot of messages at one in the morning.
  safety:  { id: 'safety',  share: Infinity, ambient: false, fallback: true,  label: 'Safety' },
  // The student typed something and pressed send.
  intent:  { id: 'intent',  share: 0.75, ambient: false, fallback: false, label: 'You asked' },
  // The student pressed a build button. Expensive (several upstream calls) but
  // unambiguous, and the result is an artifact they keep.
  build:   { id: 'build',   share: 0.60, ambient: false, fallback: true,  label: 'You built' },
  // Generated because a screen MOUNTED, not because anybody asked. This is where
  // the money was going: five Portfolio panels each fired one of these the first
  // time a student opened them, every day, whether or not the student ever read
  // the paragraph it produced.
  //
  // The lane is capped at three calls a day rather than switched off, and that is
  // a deliberate compromise. Off entirely would be cheaper and would also delete
  // a genuinely good thing — the one-paragraph read on a tracked-programs report
  // is the sort of thing a student screenshots. Three a day means the panels a
  // student actually opens get their paragraph and the ones they scroll past
  // cost nothing, which is the same outcome the old code was accidentally
  // achieving in reverse.
  ambient: { id: 'ambient', share: 0.15, ambient: true,  fallback: true,  label: 'Automatic' },
};

/**
 * Every `purpose` the client sends to /api/groq, mapped onto a lane, a cache
 * TTL, and whether losing it costs the student anything.
 *
 * A purpose missing from this table is treated as `ambient` with no cache,
 * which is the conservative default: a new call site has to opt IN to spending
 * real budget, and the reviewer sees it here rather than in a fetch buried in a
 * component.
 */
export const PURPOSES = {
  // ── Intent ───────────────────────────────────────────────────────────────
  coach:      { lane: 'intent', ttlMs: 0,             fallback: false },
  portfolio:  { lane: 'intent', ttlMs: 0,             fallback: false },
  prep:       { lane: 'intent', ttlMs: 0,             fallback: false },
  essaycoach: { lane: 'intent', ttlMs: 0,             fallback: false },
  essay:      { lane: 'intent', ttlMs: 0,             fallback: false },
  interview:  { lane: 'intent', ttlMs: 0,             fallback: false },

  // ── Build ────────────────────────────────────────────────────────────────
  // Long cache TTLs: rebuilding the same plan from the same inputs twice in an
  // hour is a student clicking twice, not a student wanting a different plan.
  masterplan: { lane: 'build', ttlMs: 6 * 3600e3, fallback: true },
  plan:       { lane: 'build', ttlMs: 6 * 3600e3, fallback: true },
  roadmap:    { lane: 'build', ttlMs: 6 * 3600e3, fallback: true },

  // ── Ambient ──────────────────────────────────────────────────────────────
  // One purpose, used by every panel that generates a paragraph on mount (see
  // askAmbientMedabrain in App.jsx). It exists so those calls are visibly a
  // different KIND of spending from a student's question, and so they can be
  // capped, cached for a day, and dropped without anybody being told an error
  // occurred — a paragraph that does not appear is a paragraph that does not
  // appear, not a failure.
  ambient: { lane: 'ambient', ttlMs: 24 * 3600e3, fallback: true },

  // ── Never budgeted ───────────────────────────────────────────────────────
  safety: { lane: 'safety', ttlMs: 0, fallback: true },
};

/** The lane a purpose spends from. Unknown purposes are ambient. */
export function laneFor(purpose) {
  return LANES[PURPOSES[purpose]?.lane || 'ambient'];
}

/** How long a response for this purpose may be reused. 0 = never cache. */
export function cacheTtlFor(purpose) {
  return PURPOSES[purpose]?.ttlMs || 0;
}

/** True when losing this call costs the student a feature rather than prose. */
export function hasFallback(purpose) {
  return !!PURPOSES[purpose]?.fallback;
}

// ── The ledger ───────────────────────────────────────────────────────────────
// localStorage, keyed by day, so it resets at local midnight and survives a
// reload. Deliberately NOT authoritative: api/groq.js enforces the real limits
// server-side (a client-side budget is a suggestion to a browser). What this
// buys is the thing a server limit cannot — the call is never made, so it costs
// nothing, returns instantly, and cannot 429 the student's next real request.

const LEDGER_KEY = 'aiBudget';

function readLedger(day = localDateStr()) {
  try {
    const raw = JSON.parse(localStorage.getItem(LEDGER_KEY) || 'null');
    if (!raw || raw.day !== day) return { day, total: 0, byLane: {} };
    return { day, total: Number(raw.total) || 0, byLane: raw.byLane || {} };
  } catch {
    return { day, total: 0, byLane: {} };
  }
}

function writeLedger(ledger) {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger)); } catch { /* quota — the server limit still holds */ }
}

/** What is left today, overall and in one lane. */
export function remaining(purpose = null) {
  const l = readLedger();
  const overall = Math.max(0, DAILY_CALL_BUDGET - l.total);
  if (!purpose) return { overall, lane: overall, laneId: null };
  const lane = laneFor(purpose);
  if (lane.share === Infinity) return { overall: Infinity, lane: Infinity, laneId: lane.id };
  const cap = Math.ceil(DAILY_CALL_BUDGET * lane.share);
  return {
    overall,
    lane: Math.max(0, Math.min(overall, cap - (Number(l.byLane[lane.id]) || 0))),
    laneId: lane.id,
  };
}

/**
 * May this call be made?
 *
 * `ambientEnabled` comes from the student's own setting (Settings → Medabrain)
 * and defaults to on, because the lane cap above is what does the actual work.
 * The switch exists for the student who would rather every screen paint
 * instantly and never wait on a paragraph, and for an operator who wants
 * ambient generation off entirely without a deploy.
 */
export function allow(purpose, { ambientEnabled = true } = {}) {
  const lane = laneFor(purpose);
  if (lane.share === Infinity) return { ok: true, reason: 'unbudgeted' };
  if (lane.ambient && !ambientEnabled) {
    return { ok: false, reason: 'ambient_off', fallback: hasFallback(purpose) };
  }
  const r = remaining(purpose);
  if (r.lane <= 0) {
    return { ok: false, reason: r.overall <= 0 ? 'daily_budget' : 'lane_budget', fallback: hasFallback(purpose) };
  }
  return { ok: true, reason: 'within_budget', remaining: r.lane };
}

/** Record one call actually made. Call this on send, not on response. */
export function spend(purpose, n = 1) {
  const lane = laneFor(purpose);
  if (lane.share === Infinity) return;
  const l = readLedger();
  l.total += n;
  l.byLane[lane.id] = (Number(l.byLane[lane.id]) || 0) + n;
  writeLedger(l);
}

/** Today's usage, for the Settings screen that shows it. */
export function usage() {
  const l = readLedger();
  return {
    day: l.day,
    used: l.total,
    budget: DAILY_CALL_BUDGET,
    byLane: { ...l.byLane },
    pct: Math.min(1, l.total / DAILY_CALL_BUDGET),
  };
}

/** Test seam. Clears today's ledger. */
export function resetBudget() {
  try { localStorage.removeItem(LEDGER_KEY); } catch { /* nothing to clear */ }
}
