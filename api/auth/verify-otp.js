// /api/auth/verify-otp — checks the emailed code, creates/finds the user,
// and issues a session token stored in Supabase.
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

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
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the 6-digit code sent to your email.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: otpRow, error: fetchErr } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }

    if (otpRow.code_hash !== hashCode(code)) {
      await supabase.from('otp_codes').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    await supabase.from('otp_codes').update({ consumed: true }).eq('id', otpRow.id);

    let { data: user, error: userErr } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (userErr) throw userErr;

    if (!user) {
      const { data: created, error: createErr } = await supabase
        .from('app_users')
        .insert({ email })
        .select('*')
        .single();
      if (createErr) throw createErr;
      user = created;
    }

    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select('*')
      .single();
    if (sessErr) throw sessErr;

    return res.status(200).json({
      token: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gradeLevel: user.grade_level,
        testTrack: user.test_track,
        onboardingComplete: user.onboarding_complete,
      },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ error: 'Could not verify code. Please try again.' });
  }
}
