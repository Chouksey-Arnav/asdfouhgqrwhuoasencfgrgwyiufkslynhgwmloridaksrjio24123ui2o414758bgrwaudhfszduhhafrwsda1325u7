// /api/reward-claim — the atomic, cross-device-safe "did I already grant this?" check for
// one-time rewards (today's daily check-in, an achievement unlock, a weekly quest claim). See
// src/lib/rewardClaimQueue.js for the client-side durable outbox that calls this, and
// supabase/migrations/0004_reward_and_counter_sync.sql for the `claim_reward` Postgres function
// and the `reward_claims` (user_id, claim_key) uniqueness guarantee this relies on.
//
// Unlike /api/progress-sync (a plain snapshot overwrite + additive counter bump),  this endpoint
// exists specifically because additive/last-write-wins merges are the WRONG tool for a milestone
// that must be granted exactly once no matter how many devices independently notice the
// condition is met — see that migration's header comment for the full reasoning.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireStudent } from './_lib/session.js';

const MAX_XP = 5000; // generous but bounded — a corrupted/malicious client shouldn't be able to
                      // grant an arbitrary amount through this path

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireStudent(req, res);
  if (!user) return;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const claimKey = typeof body?.claimKey === 'string' ? body.claimKey.trim() : '';
  const attemptId = typeof body?.attemptId === 'string' ? body.attemptId.trim() : '';
  const xpAmount = Number.isFinite(body?.xpAmount) ? Math.max(0, Math.min(MAX_XP, Math.round(body.xpAmount))) : 0;
  if (!claimKey || !attemptId) return res.status(400).json({ error: 'Missing claimKey or attemptId.' });

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase.rpc('claim_reward', {
      p_user_id: user.id,
      p_claim_key: claimKey,
      p_attempt_id: attemptId,
      p_xp_amount: xpAmount,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({ granted: !!row?.granted, mine: !!row?.mine, totalXp: row?.total_xp ?? null });
  } catch (err) {
    console.error('reward-claim error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
