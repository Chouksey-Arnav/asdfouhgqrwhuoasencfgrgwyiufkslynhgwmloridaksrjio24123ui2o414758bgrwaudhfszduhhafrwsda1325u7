// /api/auth/verify-otp — checks the emailed code for a given purpose and, on success,
// issues a short-lived verification token (an email_verifications row). Verifying a
// code never creates an account or session by itself — the caller still has to spend
// that token at api/auth/complete-signup (purpose 'signup'), api/auth/reset-password
// (purpose 'password_reset') or api/auth/login (purpose 'signin'), which is where a
// password gets set or a session gets minted.
//
// The check itself lives in api/_lib/otp.js, shared with send-otp and the parent claim flow.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { checkOtp } from '../_lib/otp.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURPOSES = ['signup', 'password_reset', 'signin'];
const VERIFICATION_TTL_MS = 15 * 60 * 1000;

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
  const code = String(body?.code || '').trim();
  const purpose = PURPOSES.includes(body?.purpose) ? body.purpose : 'signup';
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter the 6-digit code sent to your email.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const result = await checkOtp(supabase, { email, code, purpose });
    if (!result.ok) return res.status(result.status).json({ error: result.error });

    const { data: verification, error: verErr } = await supabase
      .from('email_verifications')
      .insert({ email, purpose, expires_at: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString() })
      .select('id')
      .single();
    if (verErr) throw verErr;

    return res.status(200).json({ verified: true, verificationToken: verification.id });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ error: 'Could not verify code. Please try again.' });
  }
}
