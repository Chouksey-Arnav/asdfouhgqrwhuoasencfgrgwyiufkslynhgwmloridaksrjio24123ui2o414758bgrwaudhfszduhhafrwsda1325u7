// /api/auth/set-password — lets a signed-in user (verified via OTP) set or
// reset the password they can use to sign in on other devices.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getUserFromRequest } from '../_lib/session.js';
import { hashPassword } from '../_lib/password.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const newPassword = String(body?.newPassword || '');
  if (newPassword.length < 8 || newPassword.length > 200) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('app_users')
      .update({ password_hash: hashPassword(newPassword), password_updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('set-password error:', err);
    return res.status(500).json({ error: 'Could not set password. Please try again.' });
  }
}
