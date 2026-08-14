// Shared Supabase admin client for serverless functions.
// Uses the service role key — never expose this key to the browser.
import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/**
 * Retries a Supabase call on a transient failure — this project's free-tier compute
 * periodically kills a PostgREST request thread under load ("Warp server error: Thread killed
 * by timeout manager" in the project logs), which surfaces here as a rejected fetch rather than
 * an ordinary {error} response. That is invisible to anything that awaits the call once: a
 * session lookup that hits it 401s a signed-in user, and a session insert that hits it strands
 * someone who just typed their password correctly on a screen with nothing to show for it.
 *
 * Both call sites this wraps are safe to retry blind — getUserFromRequest is a read, and the
 * session insert in api/auth/login.js is allowed to produce an extra row (a user can already
 * hold several sessions at once, one per device) rather than fail the sign-in.
 */
export async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * The one seam a test can use to stand in for the database.
 *
 * ── Why this is here rather than in a test helper ───────────────────────────
 * Every handler in this repo reaches the database through getSupabaseAdmin() and nothing else,
 * which is what makes "swap the database" a one-line operation instead of a mocking framework. But
 * they import it as an ES module binding, and an ES namespace object is frozen — a test cannot
 * reassign it from the outside. Without a seam the alternative is loader hooks, and the flows that
 * most need end-to-end testing (scripts/verifyParentClaimFlow.mjs drives the passwordless parent
 * claim through real requests) would go untested instead.
 *
 * Refused outright in production. This can only ever point the app at a different database, which
 * is a catastrophic thing to be able to do by accident and a harmless one in a throwaway process
 * that has no credentials in the first place.
 */
export function __setTestClient(next) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('__setTestClient is not available in production.');
  }
  client = next;
}
