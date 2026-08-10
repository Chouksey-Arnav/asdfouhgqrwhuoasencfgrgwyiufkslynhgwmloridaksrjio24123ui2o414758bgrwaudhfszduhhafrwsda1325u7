// /api/auth/me — returns the current user for a session token, or updates profile fields.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/session.js';
import { serializeUser as serialize } from '../_lib/serializeUser.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    return res.status(200).json({ user: serialize(user) });
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
    const updates = {};
    if (typeof body?.name === 'string') updates.name = body.name.slice(0, 100);
    if (typeof body?.gradeLevel === 'string') updates.grade_level = body.gradeLevel.slice(0, 40);
    if (typeof body?.testTrack === 'string') updates.test_track = body.testTrack.slice(0, 20);
    if (typeof body?.onboardingComplete === 'boolean') updates.onboarding_complete = body.onboardingComplete;

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Could not update profile.' });
    return res.status(200).json({ user: serialize(updated) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
