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

// ── Two different windows, because they are guarding two different things ───
// The per-ADDRESS cap is the anti-nuisance limit: nobody legitimately needs six codes at one
// mailbox in a quarter of an hour. The per-IP cap used to share that number, which quietly made
// this feature unusable in exactly the places it is most used — a household behind one NAT, a
// school library, a phone on carrier-grade NAT — where the fourth family member to sign in that
// afternoon was told to come back later. They are separate now, and the IP one is set where it
// bounds a relay abuser rather than a busy building.
const MAX_PER_EMAIL_WINDOW = 5;
const MAX_PER_IP_WINDOW = 20;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * The floor between two sends to the same address for the same purpose.
 *
 * ── Why this exists, and why it is the single biggest saving in the flow ─────
 * Every code costs one send against a metered relay quota (see api/_lib/mailer.js), and the
 * invitation is the first mail that dies when that quota runs out. Before this, nothing on the
 * server stopped a second send: the 60-second "Resend code" timer lived entirely in the browser,
 * so a page reload, a back-and-forward, a double-tap on a slow connection, or simply re-opening the
 * invitation link reset it to zero and burned another email — for a code that was already sitting
 * in the person's inbox, valid for another nine minutes.
 *
 * So a request inside this window does NOT mint and does NOT send. It reports success, because
 * from the caller's point of view the statement "a code is on its way to that address" is true —
 * one is, it is just the one we sent forty seconds ago. That is also why the floor must stay at or
 * under the client's resend timer: the two agree, so the button a person is offered is the button
 * that actually sends.
 */
export const RESEND_FLOOR_MS = 60 * 1000;

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
  return (emailCount ?? 0) >= MAX_PER_EMAIL_WINDOW || (ipCount ?? 0) >= MAX_PER_IP_WINDOW;
}

/**
 * How long the caller should wait before another send to this address would actually send.
 *
 * Returns 0 when there is nothing live — no unconsumed, unexpired code issued inside the floor —
 * which is the ordinary case and the one that proceeds to mint and mail. See RESEND_FLOOR_MS.
 */
export async function resendWaitMs(supabase, { email, purpose }) {
  const floorStart = new Date(Date.now() - RESEND_FLOOR_MS).toISOString();
  const { data } = await supabase
    .from('otp_codes')
    .select('created_at, expires_at, attempts')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .gte('created_at', floorStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return 0;
  // Three ways a recent code is nonetheless not a code anybody can still use. Every one of them
  // has to fall through and send, because suppressing the send would leave the person holding
  // something dead with no way to get something live:
  //
  //   - expired: ten minutes gone, so the floor cannot even be reached before it lapses today,
  //     but the TTL is a constant somebody will change one day;
  //   - out of guesses: five wrong entries burns the code (see checkOtp). Reusing it would turn a
  //     mistyped digit into a lockout that lasts as long as the floor and offers no way out —
  //     "ask for a new one" is exactly what the error tells them to do, so it must work.
  //
  // Only a code that is live AND still has guesses left is worth reusing.
  if (new Date(data.expires_at) < new Date()) return 0;
  if ((data.attempts ?? 0) >= MAX_ATTEMPTS) return 0;
  return Math.max(0, new Date(data.created_at).getTime() + RESEND_FLOOR_MS - Date.now());
}

/**
 * Mints a code, stores its hash, and emails it.
 *
 * Any code still live for this (email, purpose) is consumed first. Without that, requesting a
 * second code would ADD five guesses to the attacker's budget rather than replacing them — five
 * "resend" taps would turn a six-digit code into a thirty-guess one.
 *
 * A request that lands inside RESEND_FLOOR_MS of a still-live code is a no-op: nothing is minted,
 * nothing is consumed, and no email is sent — the code already in the person's inbox stays the
 * right answer. That is the whole point (see RESEND_FLOOR_MS) and it is why this must run BEFORE
 * the consume above: minting first and then declining to send would invalidate the code they are
 * holding and leave them with no working code at all.
 *
 * @returns {Promise<{sent: boolean, waitMs: number}>} `sent:false` means a live code was reused.
 * Throws on a mail failure, so the caller decides whether that is worth telling the user about.
 */
export async function issueOtp(supabase, { email, ip, purpose }) {
  const waitMs = await resendWaitMs(supabase, { email, purpose });
  if (waitMs > 0) return { sent: false, waitMs };

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
  return { sent: true, waitMs: RESEND_FLOOR_MS };
}

/**
 * True when the database refused a row because the value is outside a CHECK constraint — which,
 * for everything in this file and in email_verifications, means one thing: a migration that adds
 * a `purpose` has not been applied to this deployment.
 *
 * ── Why this deserves a named helper rather than a generic 500 ──────────────
 * This exact drift shipped to production and stayed there. Migration 0010 widens
 * email_verifications.purpose to include 'signin', and until it is applied EVERY passwordless
 * parent sign-in fails at the last step — the code is minted, the email is sent, the six digits
 * are correct, and the insert of the proof is rejected by the constraint. The handler logged
 * "verify-otp error" and told the parent "Could not verify code. Please try again", which is
 * indistinguishable from a typo and sends them round the loop forever, burning an email each time.
 *
 * Every one of the surrounding failures degrades quietly and deliberately (see the isMissingSchema
 * checks across api/parent/*), which is right for a missing table and exactly wrong here: quiet
 * degradation is what let a completely dead sign-in look like an empty dashboard for as long as it
 * did. So this one says what is actually wrong, in the response and in the log.
 */
export const isPurposeUnsupported = (err) => !!err
  && (err.code === '23514' || /violates check constraint/i.test(err.message || ''))
  && /purpose/i.test(`${err.message || ''}${err.details || ''}${err.constraint || ''}`);

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
