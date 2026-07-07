// /api/auth/send-otp — generates a 6-digit code, stores its hash in Supabase,
// and emails it via Nodemailer. Rate-limited per email and per IP using the
// database as the source of truth (an in-memory counter doesn't survive
// across ephemeral serverless instances).
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sendOtpEmail } from '../_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;

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
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

  try {
    const supabase = getSupabaseAdmin();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
      supabase.from('otp_codes').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', windowStart),
      supabase.from('otp_codes').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', windowStart),
    ]);
    if ((emailCount ?? 0) >= MAX_PER_WINDOW || (ipCount ?? 0) >= MAX_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many code requests. Try again in a few minutes.' });
    }

    // Invalidate any still-active codes for this email so a fresh request
    // can't be combined with an older one to multiply the guess budget.
    await supabase.from('otp_codes').update({ consumed: true }).eq('email', email).eq('consumed', false);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const { error: dbError } = await supabase.from('otp_codes').insert({
      email,
      ip,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    });
    if (dbError) throw dbError;

    await sendOtpEmail(email, code);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ error: 'Could not send verification code. Please try again.' });
  }
}
