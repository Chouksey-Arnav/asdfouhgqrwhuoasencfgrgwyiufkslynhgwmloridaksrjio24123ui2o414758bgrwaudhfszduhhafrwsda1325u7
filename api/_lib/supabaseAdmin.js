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
