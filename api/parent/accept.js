// /api/parent/accept — redeems an invitation token.
//
//   POST { token | code }            → { accepted: true, link } | { accepted: false, reason }
//   POST { token | code, preview: 1 } → { invite: { from, role, relationship } }  (no state change)
//
// A code and a token are two names for one invitation (migration 0010), and both are accepted here
// so that a student handed a code by their parent is not sent back to find an email. The parent
// direction has its own passwordless path in api/parent/claim.js; this remains the route for a
// STUDENT responding to a parent's request, which needs a real student account and therefore a
// real session.
//
// The preview exists because the accept screen has to tell you what you are agreeing to BEFORE
// you agree — a page that reads "you are now sharing your progress" the first time it loads has
// collected a click, not consent. It is deliberately a POST with a body rather than a GET with a
// query string: invitation tokens in URLs end up in server logs, browser history and Referer
// headers, and this way the only place the raw token appears is the email and one request body.
//
// Everything that decides the outcome happens inside accept_parent_link() (migration 0006), under
// a row lock, for the reasons documented there. This handler's job is to authenticate the caller,
// hash the token, and translate the function's reason codes into something a person can act on.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser, roleOf } from '../_lib/session.js';
import {
  LINK_SELECT, hashInviteToken, isUnknownColumn, normalizeInviteCode, serializeLink,
} from '../_lib/parentLinks.js';

// Reason code → what the person should be told and do about it. Written out in full rather than
// falling through to a generic message because every one of these is a different next step, and
// "something went wrong" on an invitation link is how a family gives up on the feature.
const REASONS = {
  not_found:      { status: 404, error: 'That invitation link is not valid. Ask for a new one.' },
  already_used:   { status: 409, error: 'That invitation has already been used.' },
  expired:        { status: 410, error: 'That invitation has expired. Ask for a new one.' },
  email_mismatch: { status: 403, error: 'That invitation was sent to a different email address. Sign in with the address it was sent to.' },
  self_link:      { status: 400, error: 'You cannot connect an account to itself.' },
  already_linked: { status: 409, error: 'These accounts are already connected.' },
  unknown_user:   { status: 401, error: 'Sign in again and retry the link.' },
  malformed:      { status: 409, error: 'That invitation is no longer valid. Ask for a new one.' },
};

const roleMismatchMessage = (expected) => expected === 'parent'
  ? 'This invitation is for a parent account. Sign out and create a parent account with this email address to accept it.'
  : 'This invitation is for a student account. Sign in with the student account it was sent to.';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

  const raw = String(body?.token || '').trim();
  const code = normalizeInviteCode(body?.code);
  if (!/^[0-9a-f]{64}$/i.test(raw) && !code) {
    return res.status(400).json({ error: 'That invitation link is not valid. Ask for a new one.' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // A code resolves to the invitation's token hash, and everything downstream is unchanged —
    // there is still exactly one way an invitation is redeemed, and it is accept_parent_link().
    let tokenHash = raw ? hashInviteToken(raw) : null;
    if (!tokenHash) {
      const { data: byCode, error: codeErr } = await supabase
        .from('parent_links')
        .select('invite_token_hash')
        .eq('status', 'pending')
        .ilike('invite_code', code)
        .maybeSingle();
      // A database without migration 0010 has no invite_code column, so a code cannot resolve
      // there. Say so rather than 500-ing, and the emailed link still works.
      if (codeErr && isUnknownColumn(codeErr)) {
        return res.status(503).json({ error: 'Invitation codes are not available yet. Use the link in your email instead.' });
      }
      if (codeErr) throw codeErr;
      if (!byCode) return res.status(404).json(REASONS.not_found);
      tokenHash = byCode.invite_token_hash;
    }

    // ── Preview ──────────────────────────────────────────────────────────────
    if (body?.preview) {
      const { data: link } = await supabase
        .from('parent_links')
        .select(LINK_SELECT)
        .eq('invite_token_hash', tokenHash)
        .maybeSingle();

      if (!link) return res.status(404).json(REASONS.not_found);
      if (link.status !== 'pending') return res.status(409).json(REASONS.already_used);
      if (new Date(link.invite_expires_at) < new Date()) return res.status(410).json(REASONS.expired);

      const inviter = link.initiated_by === 'parent' ? link.parent : link.student;

      // The claim the requester attested to when they sent this (migration 0009). Fetched in its
      // own tolerant query rather than added to LINK_SELECT, because LINK_SELECT is used by every
      // other read in this feature and naming a column that a not-yet-migrated deployment does
      // not have would break all of them at once. Absent claim → the screen simply falls back to
      // the account's display name, which is exactly the pre-0009 behavior.
      let claim = {};
      const { data: claimRow } = await supabase
        .from('parent_links')
        .select('claimed_student_name, claimed_by_name, claimed_relationship')
        .eq('id', link.id)
        .maybeSingle();
      if (claimRow) {
        claim = {
          claimedStudentName: claimRow.claimed_student_name || null,
          claimedByName: claimRow.claimed_by_name || null,
          claimedRelationship: claimRow.claimed_relationship || null,
        };
      }

      return res.status(200).json({
        invite: {
          ...claim,
          // The attested name, when there is one, is the name the screen leads with — see
          // sendInviteEmail for why it beats the freely-editable account display name.
          from: { name: claim.claimedByName || inviter?.name || null, email: inviter?.email || null },
          // Which role the ACCEPTER must be — the inverse of who sent it. The screen uses this to
          // say "you need a parent account for this" before the attempt, rather than after.
          youWouldBe: link.initiated_by === 'parent' ? 'student' : 'parent',
          relationship: link.relationship || null,
          addressedTo: link.invite_email,
          expiresAt: link.invite_expires_at,
          // Whether the signed-in account can accept it at all. Answering this here keeps the
          // client from having to re-derive the rule and get it subtly different.
          matchesYou: String(link.invite_email || '').toLowerCase() === String(user.email || '').toLowerCase()
            && roleOf(user) === (link.initiated_by === 'parent' ? 'student' : 'parent'),
        },
      });
    }

    // ── Accept ───────────────────────────────────────────────────────────────
    const { data: result, error } = await supabase.rpc('accept_parent_link', {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      p_email: user.email,
    });
    if (error) throw error;

    if (!result?.accepted) {
      if (result?.reason === 'role_mismatch') {
        return res.status(403).json({
          error: roleMismatchMessage(result.expected),
          reason: 'role_mismatch',
          expected: result.expected,
        });
      }
      const mapped = REASONS[result?.reason] || { status: 409, error: 'That invitation could not be used.' };
      return res.status(mapped.status).json({ ...mapped, reason: result?.reason || 'unknown' });
    }

    const { data: link } = await supabase
      .from('parent_links')
      .select(LINK_SELECT)
      .eq('id', result.linkId)
      .maybeSingle();

    return res.status(200).json({
      accepted: true,
      link: link ? serializeLink(link, roleOf(user)) : null,
    });
  } catch (err) {
    console.error('parent accept error:', err);
    return res.status(500).json({ error: 'Could not complete the connection. Please try again.' });
  }
}
