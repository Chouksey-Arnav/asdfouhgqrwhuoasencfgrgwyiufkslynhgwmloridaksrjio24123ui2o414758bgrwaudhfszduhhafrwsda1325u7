// /api/auth/logout — deletes the current session token.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (token) {
    const supabase = getSupabaseAdmin();
    await supabase.from('sessions').delete().eq('id', token);
  }
  return res.status(200).json({ success: true });
}
