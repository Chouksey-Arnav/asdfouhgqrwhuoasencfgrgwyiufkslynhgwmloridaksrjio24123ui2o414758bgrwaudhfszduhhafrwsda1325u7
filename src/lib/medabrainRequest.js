// ─────────────────────────────────────────────────────────────────────────────
// ONE DOOR TO /api/groq.
//
// ── Why this exists ──────────────────────────────────────────────────────────
// Fourteen places in this app POST to /api/groq, and until now each one built
// its own request. That was fine while the only shared concern was the lane
// (src/lib/aiLane.js, which solved it with a module-level register for exactly
// this reason). It stopped being fine the moment there were three:
//
//   • the lane            — whose rate-limit budget this spends
//   • the client budget   — whether the call should be made at all
//   • the personalization — what this particular student can actually open
//
// Three cross-cutting concerns times fourteen call sites is fourteen chances to
// forget one, and the failure when somebody does is silent: a surface that
// quietly spends unbudgeted, or a coach that confidently sends a freshman to a
// screen the nav has not given them yet.
//
// So this is the one place a Medabrain request is assembled. Call sites keep
// their own prompts, their own tiers and their own token ceilings — everything
// that is genuinely theirs — and hand the shared parts here.
//
// ── What it does NOT do ──────────────────────────────────────────────────────
// It does not retry, does not cache, and does not interpret the answer. Those
// are per-surface decisions with real differences between them (a plan build
// retries; a chat turn must not), and burying them here would make this the
// thing every future change has to fight.
// ─────────────────────────────────────────────────────────────────────────────

import { aiLane } from './aiLane.js';
import { aboutBlock } from './medabrainProfile.js';
import { allow, spend } from './aiBudget.js';

/** Thrown when the client budget refuses a call. Carries why, for the caller. */
export class BudgetError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'BudgetError';
    this.reason = reason;
  }
}

/**
 * POST one Medabrain request.
 *
 * @param {object} o
 * @param {string} o.system      the system prompt this surface built
 * @param {Array}  [o.messages]  conversation turns
 * @param {string} [o.message]   a single-turn message (the older shape)
 * @param {string} o.purpose     which subsystem — see PURPOSES in aiBudget.js
 * @param {number} [o.maxTokens]
 * @param {string} [o.tier]
 * @param {object} [o.extra]     per-request server-read fields (today safetyTier)
 * @param {boolean} [o.personalize=true] append the per-student availability
 *        block. Off for purposes whose prompt is already a complete statement of
 *        one list and whose answer is cached for a day — see the note at the
 *        call site in App.jsx.
 * @param {boolean} [o.ambientEnabled=true]
 * @param {AbortSignal} [o.signal] passed straight to fetch. Several callers
 *        cancel a request when the student edits the thing it was about; that
 *        is a per-surface concern and stays theirs.
 * @returns {Promise<Response>}
 */
export async function postMedabrain({
  system, messages = null, message = null, purpose, maxTokens, tier,
  extra = {}, personalize = true, ambientEnabled = true, signal = undefined,
}) {
  // Checked before the request is built, which is the point: a call never made
  // costs nothing, returns instantly, and does not consume a slot in the
  // per-minute window the next student's real question needs.
  const verdict = allow(purpose, { ambientEnabled });
  if (!verdict.ok) {
    throw new BudgetError(
      verdict.reason,
      verdict.reason === 'ambient_off'
        ? 'This one is answered locally.'
        : "You have used today's Medabrain allowance. It resets at midnight — everything else in the app keeps working.",
    );
  }
  spend(purpose);

  const body = {
    system: system + (personalize ? aboutBlock() : ''),
    purpose,
    ...(messages ? { messages } : {}),
    ...(message != null ? { message } : {}),
    ...(maxTokens ? { maxTokens } : {}),
    ...(tier ? { tier } : {}),
    // `extra` carries the server-read per-request fields. `lane` comes AFTER it
    // deliberately: a caller passing a lane of its own through `extra` must not
    // be able to charge someone else's allowance.
    ...extra,
    lane: aiLane(),
  };

  return fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
}
