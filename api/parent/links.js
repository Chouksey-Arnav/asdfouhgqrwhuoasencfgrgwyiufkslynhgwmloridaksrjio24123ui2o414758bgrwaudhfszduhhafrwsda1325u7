// /api/parent/links — the relationship itself, from both sides.
//
//   GET                              → { links: [...], role }
//   POST   { email, relationship? }  → { link } — invite the other side
//   DELETE { linkId }                → { revoked: true } — end it, or cancel/decline an invite
//
// Served to BOTH roles, which is the point: a link is one row with two owners, and a student who
// can be followed but cannot see by whom, or cannot cut it off, has not consented to anything.
// So every operation here is symmetric, and the only asymmetry is which column the caller's id
// goes in.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser, roleOf, isUuid } from '../_lib/session.js';
import {
  EMAIL_RE, INVITE_TTL_DAYS, LINK_SELECT, mintInviteToken, sendInviteEmail, serializeLink,
} from '../_lib/parentLinks.js';

// A cap on live invitations per account. Without it, this endpoint is an authenticated way to send
// branded email to arbitrary addresses — i.e. a spam relay wearing our domain's reputation. Five
// is above any real household and far below anything worth abusing.
const MAX_PENDING_INVITES = 5;

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const role = roleOf(user);
  const supabase = getSupabaseAdmin();
  const mine = role === 'parent' ? 'parent_user_id' : 'student_user_id';

  try {
    // ── List ─────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('parent_links')
        .select(LINK_SELECT)
        .eq(mine, user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      // An invitation addressed to THIS account that the other side started. It has no user id on
      // our column yet — it is addressed to an email — so the query above cannot see it, and
      // without this a student would never learn a request was waiting for them.
      const { data: inbound } = await supabase
        .from('parent_links')
        .select(LINK_SELECT)
        .is(mine, null)
        .eq('status', 'pending')
        .ilike('invite_email', user.email)
        .gt('invite_expires_at', new Date().toISOString());

      const links = [...(data || []), ...(inbound || [])].map(row => serializeLink(row, role));
      return res.status(200).json({ role, links });
    }

    // ── Invite ───────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
      catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

      const email = String(body?.email || '').trim().toLowerCase();
      const relationship = body?.relationship ? String(body.relationship).slice(0, 40) : null;

      if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }
      // Checked here as well as in the schema (parent_links_no_self_link) because the schema can
      // only see it once both ids exist, and this catches the far more common form: inviting your
      // own address, which would otherwise sit as a pending invite you can never accept.
      if (email === String(user.email || '').toLowerCase()) {
        return res.status(400).json({ error: "That's your own email address." });
      }

      const { count: pending } = await supabase
        .from('parent_links')
        .select('id', { count: 'exact', head: true })
        .eq(mine, user.id)
        .eq('status', 'pending');
      if ((pending ?? 0) >= MAX_PENDING_INVITES) {
        return res.status(429).json({ error: 'You have too many invitations waiting. Cancel one before sending another.' });
      }

      const { token, hash } = mintInviteToken();
      const { data: link, error } = await supabase
        .from('parent_links')
        .insert({
          [mine]: user.id,
          status: 'pending',
          initiated_by: role,
          relationship,
          invite_email: email,
          invite_token_hash: hash,
          invite_expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select(LINK_SELECT)
        .single();

      if (error) {
        // 23505 is the partial unique index on (inviter, lower(invite_email)) where status='pending'
        // — see migration 0006. It is the normal outcome of tapping Invite twice, not an error
        // worth showing as one.
        if (error.code === '23505') {
          return res.status(409).json({ error: 'You already have an invitation waiting for that address.' });
        }
        throw error;
      }

      await supabase.from('parent_link_events').insert({ link_id: link.id, event: 'created', actor: user.id });

      // The row is committed before the email is attempted, and a send failure does NOT roll it
      // back: the invitation genuinely exists, the client is told the email did not go out, and
      // "resend" works because the row is there to resend from. Rolling back would be the worse
      // trade — it turns a transient SMTP hiccup into a lost invitation with no trace.
      try {
        await sendInviteEmail({
          to: email,
          token,
          inviterName: user.name,
          inviterRole: role,
          relationship,
        });
      } catch (err) {
        console.error('parent invite email failed:', err);
        return res.status(200).json({
          link: serializeLink(link, role),
          emailSent: false,
          warning: 'The invitation was created but the email could not be sent. Try resending it in a moment.',
        });
      }

      return res.status(200).json({ link: serializeLink(link, role), emailSent: true });
    }

    // ── Revoke / cancel / decline ────────────────────────────────────────────
    if (req.method === 'DELETE') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
      catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

      const linkId = String(body?.linkId || '').trim();
      if (!isUuid(linkId)) return res.status(400).json({ error: 'Missing link id.' });

      const { data: link, error: readErr } = await supabase
        .from('parent_links')
        .select('id, parent_user_id, student_user_id, invite_email, status')
        .eq('id', linkId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!link) return res.status(404).json({ error: 'That connection no longer exists.' });

      // Either party to the link may end it, and so may the person an outstanding invitation is
      // addressed to — declining is how you refuse a request, and requiring an accepted link
      // before you may refuse it would be absurd. Nobody else can touch the row.
      const isParty = link.parent_user_id === user.id
        || link.student_user_id === user.id
        || (link.status === 'pending' && String(link.invite_email || '').toLowerCase() === String(user.email || '').toLowerCase());
      if (!isParty) return res.status(403).json({ error: 'That connection is not yours to change.' });

      // A pending invite the recipient turns down is 'declined'; anything else is 'revoked'. The
      // distinction is the whole audit value of the events table — "they said no" and "we were
      // connected and someone ended it" are different facts about consent.
      const isDecline = link.status === 'pending'
        && link.parent_user_id !== user.id
        && link.student_user_id !== user.id;
      const nextStatus = isDecline ? 'declined' : 'revoked';

      const { error: updErr } = await supabase
        .from('parent_links')
        .update({
          status: nextStatus,
          revoked_at: new Date().toISOString(),
          revoked_by: role,
        })
        .eq('id', linkId)
        .in('status', ['pending', 'active']);
      if (updErr) throw updErr;

      await supabase.from('parent_link_events').insert({
        link_id: linkId,
        event: isDecline ? 'declined' : 'revoked',
        actor: user.id,
        reason: `by_${role}`,
      });

      return res.status(200).json({ revoked: true, status: nextStatus });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // An un-migrated deployment (0006 applied by hand, like every migration here) must degrade to
    // "you have no connections" rather than to a 500 on a settings screen the student did not ask
    // to break. See scripts/verifyMigrations.mjs for why this failure mode is worth designing for.
    if (isMissingSchema(err)) {
      return req.method === 'GET'
        ? res.status(200).json({ role, links: [] })
        : res.status(503).json({ error: 'Parent accounts are not available yet.' });
    }
    console.error('parent links error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
