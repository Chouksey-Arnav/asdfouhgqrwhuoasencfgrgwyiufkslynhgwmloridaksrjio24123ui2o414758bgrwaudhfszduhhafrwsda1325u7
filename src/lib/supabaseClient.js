// Browser-only Supabase client, used exclusively to drive Google OAuth
// (supabase.auth.signInWithOAuth). Every other database operation in this app goes
// through /api/* using the service-role key (see api/_lib/supabaseAdmin.js) — this is
// the one client-side exception, since the OAuth redirect has to happen in the browser.
//
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the public anon key, never the
// service role key) to be set at build time. If they're missing, GOOGLE_OAUTH_CONFIGURED
// is false and the Google button degrades to a friendly error instead of crashing.
import { createClient } from '@supabase/supabase-js';
import { ApiNetworkError } from './http.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Every request the Supabase SDK makes, with a timeout and one retry.
 *
 * This is the one part of sign-in that does NOT go to our own origin — it goes
 * straight to the Supabase project host — which makes it the piece most likely
 * to be the odd one out on a managed device. A school or district network that
 * allows medschoolprep.cloud and has never heard of *.supabase.co will let the
 * page load perfectly and then fail only here, which reads to a student as
 * "Google sign-in is broken" rather than "this network blocks it".
 *
 * The SDK has no timeout of its own and surfaces whatever fetch rejected with,
 * so without this a blocked host produces exactly the bare "Failed to fetch"
 * this app is trying to stop showing people.
 */
async function supabaseFetch(input, init = {}) {
  const TIMEOUT_MS = 20_000;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    // The SDK passes its own signal for calls it can cancel; ours must not
    // discard it, so it is chained rather than replaced.
    const onAbort = () => controller.abort();
    init.signal?.addEventListener?.('abort', onAbort, { once: true });
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      lastErr = err;
      if (init.signal?.aborted) throw err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener?.('abort', onAbort);
    }
  }
  throw new ApiNetworkError(
    "We couldn't reach the Google sign-in service. Some school and work networks block it — you can always sign in with an email and password instead.",
    'network',
    { retryable: true, cause: lastErr },
  );
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: false },
      global: { fetch: supabaseFetch },
    })
  : null;

export const GOOGLE_OAUTH_CONFIGURED = !!supabase;

/** Kicks off the Google OAuth redirect. Resolves right before the browser navigates away. */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Google sign-in is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}
