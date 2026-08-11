// /api/parent/claim — the whole of "a parent gets into the dashboard", in one endpoint.
//
//   POST { code | token }                    → { invite }        what this invitation says
//   POST { code | token, step: 'send' }      → { sent, emailHint } a code, to the invited address
//   POST { code | token, step: 'verify', otp } → { token, user, accepted }  signed in and connected
//
// ── Why this exists ─────────────────────────────────────────────────────────
// The flow it replaces was correct and unusable. A student tapped "Invite a parent" and their
// mother then had to find an email that might never arrive, follow it to a screen that told her to
// make an account, request a second code, invent a password, confirm the password, fill in a
// six-field declaration, sign an attestation — and then go back and find the first email again,
// because the invite token had been dropped somewhere around step two. Every endpoint returned
// exactly what it promised at every step, and families still did not get connected.
//
// This is the same consent model with the ceremony removed. Three POSTs to one URL, one screen,
// no password, one visit to the inbox.
//
// ── What still has to be true, and how it is enforced here ──────────────────
// 1. NOTHING IS SHARED WITHOUT THE STUDENT'S ACT. Unchanged and untouched: only a student can
//    create the invitation this redeems, and the row it writes is the same row, accepted through
//    the same accept_parent_link() function under the same row lock (migration 0006).
//
// 2. ONLY THE INVITED MAILBOX CAN REDEEM IT. This is STRONGER than what it replaces. The old
//    token was itself the credential — whoever held it could accept, and "it came out of that
//    inbox" stops being true the moment a mail is forwarded or read off a shared screen. Here the
//    token and the code authorize nothing: they name an invitation. Redemption needs a fresh
//    one-time code sent to `link.invite_email`, read from the row and NEVER from the request
//    body. A leaked link is no longer a leaked credential.
//
// 3. ROLE IS STILL WRITE-ONCE. The account this creates is inserted with role='parent'; nothing
//    here updates the role of an account that already exists. An address that already holds a
//    student account is refused with an explanation, not upgraded — see the header of
//    find_or_create_parent_for_claim in migration 0010.
//
// 4. ONLY THE PARENT SIDE IS PASSWORDLESS. A parent account owns no work of its own: it is a
//    read-only window onto data somebody else consented to share, and it can be conjured safely
//    by a one-time code. A student account owns the person's entire body of work, so an invitation
//    running the other way (parent → student) is refused here and sent to the ordinary sign-in.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { checkOtp, issueOtp, overRequestLimit, ipOf } from '../_lib/otp.js';
import { serializeUser } from '../_lib/serializeUser.js';
import {
  LINK_SELECT, hashInviteToken, normalizeInviteCode, serializeLink, isUnknownColumn,
} from '../_lib/parentLinks.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_RE = /^[0-9a-f]{64}$/i;

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err
  && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

/**
 * `priya.shah@gmail.com` → `p•••••••h@gmail.com`.
 *
 * Enough for the recipient to recognise their own address and spot that the invitation went to
 * their work account rather than their personal one — which is the single most common reason a
 * code "never arrives". Not enough to be worth harvesting from the preview.
 */
function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!user || !domain) return '';
  if (user.length <= 2) return `${user[0]}•••@${domain}`;
  return `${user[0]}${'•'.repeat(Math.min(user.length - 2, 8))}${user.at(-1)}@${domain}`;
}

/**
 * Finds the invitation a code or a token names.
 *
 * Both are looked up against `status = 'pending'` in the same query rather than fetched and then
 * checked, so a consumed invitation is indistinguishable from a made-up one to anyone probing
 * this endpoint — and the caller cannot forget the check.
 *
 * @returns {Promise<{link: object|null, reason: string|null}>}
 */
async function findInvitation(supabase, { code, token }) {
  // invite_token_hash travels with the row because accepting goes through accept_parent_link(),
  // which is keyed on it — a code and a token are two ways of naming the same invitation, and
  // both end up redeeming it through the one function that has ever been allowed to.
  const base = `${LINK_SELECT}, invite_token_hash`;
  const select = `${base}, invite_code`;

  const run = async (columns) => {
    let query = supabase.from('parent_links').select(columns).eq('status', 'pending');
    query = token
      ? query.eq('invite_token_hash', hashInviteToken(token))
      // Stored canonically uppercase, but matched case-insensitively: a code that arrives from a
      // hand-typed URL or a copy-paste with the wrong case is the same invitation, and telling
      // somebody their correct code is wrong is the worst possible failure on this screen.
      : query.ilike('invite_code', code);
    return query.maybeSingle();
  };

  // Same degrade-don't-break rule the rest of this feature follows: on a database that has not
  // had 0010 applied by hand yet, the extra columns are absent and the query must fall back
  // rather than 500. A token still resolves; a code cannot, and says so.
  let { data, error } = await run(select);
  if (error && isUnknownColumn(error)) {
    if (!token) return { link: null, reason: 'codes_unavailable' };
    ({ data, error } = await run(base));
  }
  if (error) throw error;

  if (!data) return { link: null, reason: 'not_found' };
  if (new Date(data.invite_expires_at) < new Date()) return { link: null, reason: 'expired' };
  return { link: data, reason: null };
}

const REASONS = {
  not_found: { status: 404, error: 'We could not find that invitation. Check the code, or ask your student to send a new one.' },
  expired: { status: 410, error: 'That invitation has expired. Ask your student to send a new one — it takes them one tap.' },
  codes_unavailable: { status: 503, error: 'Invitation codes are not available on this deployment yet. Use the link in your email instead.' },
  wrong_direction: {
    status: 400,
    error: 'This invitation is for a student account. Sign in to MedSchoolPrep with the address it was sent to, and you will find it waiting.',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

  const token = TOKEN_RE.test(String(body?.token || '').trim()) ? String(body.token).trim() : null;
  const code = normalizeInviteCode(body?.code);
  if (!token && !code) {
    return res.status(400).json({ error: 'Enter the 8-character code from your invitation.', reason: 'malformed' });
  }

  const step = ['send', 'verify'].includes(body?.step) ? body.step : 'preview';
  const supabase = getSupabaseAdmin();

  try {
    const { link, reason } = await findInvitation(supabase, { code, token });
    if (!link) {
      const mapped = REASONS[reason] || REASONS.not_found;
      return res.status(mapped.status).json({ ...mapped, reason });
    }

    // Only student→parent invitations are redeemable here. The other direction needs a student
    // account, which owns the person's entire body of work and is not something a one-time code
    // should be able to conjure. See point 4 in this file's header.
    if (link.initiated_by !== 'student') {
      return res.status(400).json({ ...REASONS.wrong_direction, reason: 'wrong_direction' });
    }

    const inviteEmail = String(link.invite_email || '').toLowerCase();
    const inviter = link.student;

    // What this invitation says. Shown before anything happens and before anyone is asked for
    // anything — a screen that acts first and explains afterwards has collected a tap, not
    // consent, and consent is the entire product requirement here.
    const invite = {
      inviter: {
        name: inviter?.name || null,
        gradeLevel: inviter?.grade_level || null,
      },
      relationship: link.relationship || null,
      // Masked, never whole: the recipient needs to recognise the address, and nobody else needs
      // to be able to read it off a screen they guessed their way onto.
      emailHint: maskEmail(inviteEmail),
      expiresAt: link.invite_expires_at,
    };

    if (step === 'preview') return res.status(200).json({ invite });

    // ── Send the code ────────────────────────────────────────────────────
    if (step === 'send') {
      const ip = ipOf(req);
      if (await overRequestLimit(supabase, { email: inviteEmail, ip })) {
        return res.status(429).json({
          error: 'Too many codes requested. Wait a few minutes and try again.',
          reason: 'rate_limited',
        });
      }

      // The destination is read off the invitation row. It is never taken from the request, which
      // is the one line in this file that makes a shared link safe to share: holding the link
      // lets you ASK for a code, and only the invited mailbox can receive it.
      let sent = true;
      try {
        // `sent: false` means a code from the last minute is still live and was left alone rather
        // than replaced (see RESEND_FLOOR_MS). That is the common case on this screen — a parent
        // taps Continue, goes back to re-read what is shared, and taps it again — and reusing the
        // live code both saves an email and avoids invalidating the one already in their inbox.
        ({ sent } = await issueOtp(supabase, { email: inviteEmail, ip, purpose: 'signin' }));
      } catch (err) {
        console.error('parent claim otp send failed:', err);
        return res.status(502).json({
          error: 'We could not send the code just now. Please try again in a moment.',
          reason: 'send_failed',
        });
      }

      return res.status(200).json({ sent: true, reused: !sent, invite });
    }

    // ── Verify, sign in, connect ─────────────────────────────────────────
    const otpResult = await checkOtp(supabase, { email: inviteEmail, code: String(body?.otp || '').trim(), purpose: 'signin' });
    if (!otpResult.ok) {
      return res.status(otpResult.status).json({ error: otpResult.error, reason: otpResult.reason });
    }

    // From here the person has proven control of the invited mailbox, which is everything this
    // flow needs them to prove.
    const { data: account, error: accountErr } = await supabase
      .rpc('find_or_create_parent_for_claim', { p_email: inviteEmail });
    if (accountErr) {
      if (isMissingSchema(accountErr)) {
        return res.status(503).json({
          error: 'Parent sign-in is not available on this deployment yet. Use the link in your email instead.',
          reason: 'schema_missing',
        });
      }
      throw accountErr;
    }

    if (!account?.ok) {
      if (account?.reason === 'role_conflict') {
        // Deliberately not "log in instead": that address is a STUDENT account, and a student
        // account cannot hold a parent dashboard. Role is written once at creation and by nothing
        // afterwards, so the honest answer is that this needs a different address — and saying so
        // plainly beats sending someone round a loop that cannot close.
        return res.status(409).json({
          error: 'That email address already has a student account on MedSchoolPrep, and an account '
            + 'can only be one or the other. Ask your student to send the invitation to a different '
            + 'address of yours.',
          reason: 'role_conflict',
        });
      }
      throw new Error(`find_or_create_parent_for_claim: ${account?.reason || 'unknown'}`);
    }

    const userId = account.userId;

    // ── The session, before the link ─────────────────────────────────────
    //
    // Order matters, and this order is deliberate. If accepting fails for any reason — the
    // student revoked the invitation in the ninety seconds this took, a concurrent tab already
    // redeemed it — the person is still SIGNED IN, lands on their dashboard, and reads one
    // sentence about what happened. The other order strands somebody who did everything right on
    // an error page with no account and no way forward.
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ user_id: userId, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select('*')
      .single();
    if (sessErr) throw sessErr;

    const { data: user, error: userErr } = await supabase
      .from('app_users').select('*').eq('id', userId).single();
    if (userErr) throw userErr;

    // The same function the signed-in accept path calls, with the same row lock and the same
    // reason codes (migration 0006). Two ways in, one place where the link is actually made.
    const { data: result, error: acceptErr } = await supabase.rpc('accept_parent_link', {
      p_token_hash: link.invite_token_hash,
      p_user_id: userId,
      p_email: inviteEmail,
    });
    if (acceptErr) throw acceptErr;

    let connected = null;
    if (result?.accepted) {
      const { data: fresh } = await supabase
        .from('parent_links').select(LINK_SELECT).eq('id', result.linkId).maybeSingle();
      connected = fresh ? serializeLink(fresh, 'parent') : null;
    }

    return res.status(200).json({
      token: session.id,
      user: serializeUser(user),
      accepted: !!result?.accepted,
      // Present only when the accept did NOT go through, so the client can say which of the
      // handful of ordinary things happened rather than "something went wrong".
      reason: result?.accepted ? undefined : (result?.reason || 'unknown'),
      link: connected,
    });
  } catch (err) {
    if (isMissingSchema(err)) {
      return res.status(503).json({ error: 'Parent accounts are not available yet.', reason: 'schema_missing' });
    }
    console.error('parent claim error:', err);
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
}
