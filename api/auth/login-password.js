// /api/auth/login-password — email + password sign-in, no OTP required.
// Lets a returning user sign in on any device once they've set a password.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { verifyPassword } from '../_lib/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const WINDOW_MS = 15 * 60 * 1000;

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
  const password = String(body?.password || '');
  if (!EMAIL_RE.test(email) || email.length > 254 || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  try {
    const supabase = getSupabaseAdmin();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', windowStart),
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', windowStart),
    ]);
    if ((emailCount ?? 0) >= MAX_PER_WINDOW || (ipCount ?? 0) >= MAX_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    }

    const { data: user, error: userErr } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (userErr) throw userErr;

    const ok = user?.password_hash ? verifyPassword(password, user.password_hash) : false;
    if (!ok) {
      await supabase.from('login_attempts').insert({ email, ip });
      return res.status(401).json({ error: 'Incorrect email or password.' });
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
        hasPassword: !!user.password_hash,
      },
    });
  } catch (err) {
    console.error('login-password error:', err);
    return res.status(500).json({ error: 'Could not sign in. Please try again.' });
  }
}
