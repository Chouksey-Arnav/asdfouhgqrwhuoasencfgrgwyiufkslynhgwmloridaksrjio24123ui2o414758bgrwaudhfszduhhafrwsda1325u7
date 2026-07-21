// /api/progress-sync — one JSON snapshot per user of everything that used to live only in the
// browser's local IndexedDB (XP, streak, quiz scores, flashcard/FSRS state, achievements,
// pathway progress, unit mastery, coach chat threads, etc). GET pulls the latest snapshot down
// (e.g. on sign-in from a new browser); PUT upserts it (the client debounces this after local
// writes — see src/lib/progressSync.js). Never includes the local-only studyEvents log.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getUserFromRequest } from './_lib/session.js';

// Generous but bounded — a pathological payload (e.g. a corrupted client loop) shouldn't be
// able to blow up storage or the response size indefinitely.
const MAX_BYTES = 2 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('progress_sync')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ data: data?.data || null, updatedAt: data?.updated_at || null });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }
      const payload = body?.data;
      if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Missing data.' });
      if (JSON.stringify(payload).length > MAX_BYTES) return res.status(413).json({ error: 'Snapshot too large.' });

      const { data, error } = await supabase
        .from('progress_sync')
        .upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select('updated_at')
        .single();
      if (error) throw error;
      return res.status(200).json({ updatedAt: data.updated_at });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('progress-sync error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
