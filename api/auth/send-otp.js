// /api/auth/send-otp — generates a 6-digit code, stores its hash in Supabase,
// and emails it via Nodemailer. Rate-limited per email and per IP.
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sendOtpEmail } from '../_lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;

const rateMap = new Map(); // key (email or ip) -> { count, resetAt }

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

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
  if (isRateLimited(`email:${email}`) || isRateLimited(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Too many code requests. Try again in a few minutes.' });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

  try {
    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase.from('otp_codes').insert({
      email,
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
