// /api/auth/reset-password — spends a 'password_reset' email_verifications token
// (issued by api/auth/verify-otp) to set a new password_hash. Also doubles as "set a
// password for the first time" for legacy OTP-only accounts. Invalidates every other
// session for the account so a stolen/expired session can't survive a reset.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { hashPassword, validatePassword } from '../_lib/password.js';
import { consumeVerificationToken } from '../_lib/verificationToken.js';
import { serializeUser } from '../_lib/serializeUser.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const email = String(body?.email || '').trim().toLowerCase();
  const verificationToken = String(body?.verificationToken || '').trim();
  const password = String(body?.password || '');

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const supabase = getSupabaseAdmin();

    const tokenOk = await consumeVerificationToken(supabase, { token: verificationToken, email, purpose: 'password_reset' });
    if (!tokenOk) {
      return res.status(400).json({ error: 'That verification has expired. Please request a new code.' });
    }

    const { data: user, error: userErr } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
    if (userErr) throw userErr;
    if (!user) return res.status(404).json({ error: 'No account found for this email.' });

    const password_hash = await hashPassword(password);
    const { data: updated, error: updErr } = await supabase
      .from('app_users').update({ password_hash }).eq('id', user.id).select('*').single();
    if (updErr) throw updErr;

    await supabase.from('sessions').delete().eq('user_id', user.id);

    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select('*')
      .single();
    if (sessErr) throw sessErr;

    return res.status(200).json({ token: session.id, user: serializeUser(updated) });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ error: 'Could not reset your password. Please try again.' });
  }
}
