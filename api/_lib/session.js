// Shared session-lookup helper for serverless functions.
import { getSupabaseAdmin } from './supabaseAdmin.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUserFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token || !UUID_RE.test(token)) return null;

  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase
    .from('sessions')
    .select('*, app_users(*)')
    .eq('id', token)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session.app_users;
}
