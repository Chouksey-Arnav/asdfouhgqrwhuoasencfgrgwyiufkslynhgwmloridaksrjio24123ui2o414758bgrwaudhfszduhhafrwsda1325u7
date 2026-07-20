// /api/auth/login — email + password sign-in. Rate-limited per email and per IP via
// the login_attempts table (same reasoning as send-otp's DB-backed rate limit: an
// in-memory counter doesn't survive across ephemeral serverless instances).
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { verifyPassword } from '../_lib/password.js';
import { serializeUser } from '../_lib/serializeUser.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 25;

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
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  if (!EMAIL_RE.test(email) || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
    const [{ count: emailFails }, { count: ipFails }] = await Promise.all([
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('email', email).eq('success', false).gte('created_at', windowStart),
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).eq('success', false).gte('created_at', windowStart),
    ]);
    if ((emailFails ?? 0) >= MAX_PER_EMAIL || (ipFails ?? 0) >= MAX_PER_IP) {
      return res.status(429).json({ error: 'Too many failed attempts. Please wait a few minutes and try again, or reset your password.' });
    }

    const record = (success) => supabase.from('login_attempts').insert({ email, ip, success }).then(() => {}, () => {});

    const { data: user, error: userErr } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
    if (userErr) throw userErr;

    if (!user) {
      await record(false);
      return res.status(401).json({ error: 'No account found with that email. Try signing up instead.' });
    }
    if (!user.password_hash) {
      await record(false);
      return res.status(401).json({ error: "This account doesn't have a password yet. Use “Forgot password” to set one.", noPassword: true });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      await record(false);
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    await record(true);

    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select('*')
      .single();
    if (sessErr) throw sessErr;

    return res.status(200).json({ token: session.id, user: serializeUser(user) });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Could not sign in. Please try again.' });
  }
}
