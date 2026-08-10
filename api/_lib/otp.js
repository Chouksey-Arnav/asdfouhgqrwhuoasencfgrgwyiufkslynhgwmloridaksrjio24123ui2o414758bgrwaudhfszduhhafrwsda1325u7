// The one-time code machinery: minting a code, and spending one.
//
// ── Why this is a module and not just the body of two handlers ──────────────
// It used to be exactly that — the rate limit and the insert lived in api/auth/send-otp.js, and
// the attempt counting and the constant-time compare lived in api/auth/verify-otp.js. That was
// fine while there were two callers, both of which were those files.
//
// The parent claim flow (api/parent/claim.js) is a third, and it is the one where getting this
// wrong matters most: it is the only place where checking a code CREATES an account and mints a
// session in the same request. A second, subtly different copy of "is this code correct" written
// next to that would be the highest-value bug in the repo — so there is one copy, here, and the
// three callers share it.
//
// Everything in this file is deliberately unopinionated about WHY a code is being sent. Who is
// allowed to request one, and what spending it entitles you to, are decisions for the caller;
// this module only answers "did the person holding this address type the right six digits".
import crypto from 'crypto';
import { sendOtpEmail } from './mailer.js';

/** Codes are good for ten minutes. Long enough to switch apps and find the mail, short enough
 *  that a code left visible on a screen stops being useful before anyone walks past it. */
export const OTP_TTL_MS = 10 * 60 * 1000;

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

/** The client's address, as far as we can tell. Used only for rate limiting. */
export const ipOf = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

/**
 * How many codes this address and this IP have asked for lately.
 *
 * Counted in the database rather than in memory because serverless instances are ephemeral: an
 * in-process counter resets every cold start, which is to say it resets whenever an attacker
 * spaces their requests out at all.
 */
export async function overRequestLimit(supabase, { email, ip }) {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
    supabase.from('otp_codes').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', windowStart),
    supabase.from('otp_codes').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', windowStart),
  ]);
  return (emailCount ?? 0) >= MAX_PER_WINDOW || (ipCount ?? 0) >= MAX_PER_WINDOW;
}

/**
 * Mints a code, stores its hash, and emails it.
 *
 * Any code still live for this (email, purpose) is consumed first. Without that, requesting a
 * second code would ADD five guesses to the attacker's budget rather than replacing them — five
 * "resend" taps would turn a six-digit code into a thirty-guess one.
 *
 * Returns nothing on success and throws on a mail failure, so the caller decides whether a
 * failure to send is worth telling the user about.
 */
export async function issueOtp(supabase, { email, ip, purpose }) {
  await supabase.from('otp_codes').update({ consumed: true })
    .eq('email', email).eq('purpose', purpose).eq('consumed', false);

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const { error } = await supabase.from('otp_codes').insert({
    email,
    ip,
    purpose,
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (error) throw error;

  await sendOtpEmail(email, code, purpose);
}

/**
 * Spends a code.
 *
 * @returns {Promise<{ok: true} | {ok: false, status: number, error: string, reason: string}>}
 *
 * Every failure is a reason code and a sentence a person can act on, because every one of these
 * is a normal thing a human does — waiting too long, fat-fingering a digit, tapping submit twice
 * — and not an error condition.
 *
 * ── The attempt counting is the load-bearing part ──────────────────────────
 * The increment is written as an optimistic-concurrency guard (`.eq('attempts', current)`): if a
 * concurrent request already incremented this row, this update matches zero rows and we bail
 * instead of both requests getting to check a guess for free. Without it, five parallel requests
 * cost one attempt between them, and the attempt cap — which is the entire reason a six-digit
 * code is enough — quietly stops existing.
 */
export async function checkOtp(supabase, { email, code, purpose }) {
  const fail = (status, error, reason) => ({ ok: false, status, error, reason });

  if (!/^\d{6}$/.test(String(code || ''))) {
    return fail(400, 'Enter the 6-digit code from your email.', 'malformed');
  }

  const { data: latest } = await supabase
    .from('otp_codes')
    .select('id, expires_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest || new Date(latest.expires_at) < new Date()) {
    return fail(400, 'That code has expired. Ask for a new one.', 'expired');
  }

  const { data: current, error: curErr } = await supabase
    .from('otp_codes').select('*').eq('id', latest.id).single();
  if (curErr) throw curErr;

  if (current.attempts >= MAX_ATTEMPTS) {
    return fail(429, 'Too many incorrect codes. Ask for a new one.', 'too_many_attempts');
  }

  const { data: afterIncrement, error: incErr } = await supabase
    .from('otp_codes')
    .update({ attempts: current.attempts + 1 })
    .eq('id', latest.id)
    .eq('attempts', current.attempts)
    .select('*')
    .maybeSingle();
  if (incErr) throw incErr;
  if (!afterIncrement) {
    return fail(429, 'Too many attempts at once. Wait a moment and try again.', 'concurrent');
  }

  const expected = Buffer.from(afterIncrement.code_hash, 'hex');
  const actual = Buffer.from(hashCode(code), 'hex');
  const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!matches) return fail(400, 'That code is not right. Check your email and try again.', 'incorrect');

  // Consumed only on success. A wrong guess must not burn the code the person is about to type
  // correctly, and the attempt counter above is what limits the wrong guesses.
  await supabase.from('otp_codes').update({ consumed: true }).eq('id', afterIncrement.id);
  return { ok: true };
}
