// Browser-only Supabase client, used exclusively to drive Google OAuth
// (supabase.auth.signInWithOAuth). Every other database operation in this app goes
// through /api/* using the service-role key (see api/_lib/supabaseAdmin.js) — this is
// the one client-side exception, since the OAuth redirect has to happen in the browser.
//
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the public anon key, never the
// service role key) to be set at build time. If they're missing, GOOGLE_OAUTH_CONFIGURED
// is false and the Google button degrades to a friendly error instead of crashing.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: false },
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
