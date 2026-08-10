// /api/progress-sync — one JSON snapshot per user of everything that used to live only in the
// browser's local IndexedDB (XP, streak, quiz scores, flashcard/FSRS state, achievements,
// pathway progress, unit mastery, coach chat threads, etc). GET pulls the latest snapshot down
// (e.g. on sign-in from a new browser); PUT upserts it (the client debounces this after local
// writes — see src/lib/progressSync.js). Never includes the local-only studyEvents log.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireStudent } from './_lib/session.js';

// Generous but bounded — a pathological payload (e.g. a corrupted client loop) shouldn't be
// able to blow up storage or the response size indefinitely.
const MAX_BYTES = 2 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireStudent(req, res);
  if (!user) return;

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

      // xp/aiChatCount/interviewCount/cardReviewCount travel as an additive delta
      // (`counterDeltas`), not as part of the plain overwrite the rest of this payload gets — see
      // src/lib/db.js's mergeUserRecord/claimSyncDelta for why a blind overwrite (or a
      // client-computed Math.max merge) silently lost cross-device progress on these fields.
      // Stripped off before storing: it's a transport-only instruction, not part of the snapshot.
      const counterDeltas = payload.user?.counterDeltas || null;
      if (payload.user && 'counterDeltas' in payload.user) {
        const { counterDeltas: _drop, ...restUser } = payload.user;
        payload.user = restUser;
      }

      // bump_progress_counters is a single atomic Postgres function call (see
      // supabase/migrations/0004_reward_and_counter_sync.sql) — it upserts the full snapshot AND
      // additively applies counterDeltas within one row-locked transaction, so two concurrent
      // pushes for the same user can't race a read-then-write from this handler and lose one
      // side's increment (a classic lost-update bug a naive "SELECT, add in Node, upsert back"
      // would have reintroduced).
      const { data: mergedData, error } = await supabase.rpc('bump_progress_counters', {
        p_user_id: user.id,
        p_data: payload,
        p_deltas: counterDeltas,
      });
      if (error) throw error;
      return res.status(200).json({ updatedAt: new Date().toISOString(), counters: mergedData?.user || null });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('progress-sync error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
