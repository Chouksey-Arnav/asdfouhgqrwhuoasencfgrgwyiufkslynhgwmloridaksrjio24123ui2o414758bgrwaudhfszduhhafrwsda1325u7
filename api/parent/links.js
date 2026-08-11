// /api/parent/links — the relationship itself, from both sides.
//
//   GET                              → { links: [...], role }
//   POST   { email, relationship? }  → { link } — invite the other side
//   PATCH  { linkId }                → { link } — resend the invitation email
//   DELETE { linkId }                → { revoked: true } — end it, or cancel/decline an invite
//
// Served to BOTH roles, which is the point: a link is one row with two owners, and a student who
// can be followed but cannot see by whom, or cannot cut it off, has not consented to anything.
// So every operation here is symmetric, and the only asymmetry is which column the caller's id
// goes in.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser, roleOf, isUuid } from '../_lib/session.js';
import {
  EMAIL_RE, INVITE_TTL_DAYS, LINK_SELECT, LINK_SELECT_SHARE, isUnknownColumn, mintInviteCode,
  mintInviteToken, queryLinks, sendInviteEmail, serializeLink,
} from '../_lib/parentLinks.js';
import { getParentProfile, isProfileComplete } from '../_lib/parentProfile.js';

// A cap on live invitations per account. Without it, this endpoint is an authenticated way to send
// branded email to arbitrary addresses — i.e. a spam relay wearing our domain's reputation. Five
// is above any real household and far below anything worth abusing.
const MAX_PENDING_INVITES = 5;

// The floor between two sends of the same invitation. Resending is the single most useful thing
// somebody can do when the mail did not arrive, so the button has to be there — and an unthrottled
// one is a mail-bomb aimed at whatever address was typed into it.
const RESEND_COOLDOWN_MS = 60 * 1000;

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
      // queryLinks asks for the migration-0010 columns and silently retries without them on a
      // database that has not had 0010 applied yet — the share kit is then simply absent, and the
      // panel falls back to what it could always do. See its header.
      const { data, error } = await queryLinks((select) => supabase
        .from('parent_links')
        .select(select)
        .eq(mine, user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false }));
      if (error) throw error;

      // An invitation addressed to THIS account that the other side started. It has no user id on
      // our column yet — it is addressed to an email — so the query above cannot see it, and
      // without this a student would never learn a request was waiting for them.
      const { data: inbound } = await queryLinks((select) => supabase
        .from('parent_links')
        .select(select)
        .is(mine, null)
        .eq('status', 'pending')
        .ilike('invite_email', user.email)
        .gt('invite_expires_at', new Date().toISOString()));

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
      // ── "I'll send it to them myself" ────────────────────────────────────
      //
      // A student sitting next to their mother, or texting her, does not need us to mail anything:
      // the invitation exists the moment the row does, and the code on it works whether or not a
      // message ever left this building. Sending anyway costs one against a metered monthly quota
      // (api/_lib/mailer.js) for a message nobody will open — and the invitation is the first mail
      // that dies when that quota runs out, so every wasted send is a family that cannot connect
      // later in the month.
      //
      // Opt-in rather than default: an address typed into a form is usually typed because the
      // person expects a mail to arrive at it.
      const notify = body?.notify !== false;

      if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      // Checked here as well as in the schema (parent_links_no_self_link) because the schema can
      // only see it once both ids exist, and this catches the far more common form: inviting your
      // own address, which would otherwise sit as a pending invite you can never accept.
      if (email === String(user.email || '').toLowerCase()) {
        return res.status(400).json({ error: "That's your own email address." });
      }

      // ── Who is asking, in the invitation itself ──────────────────────────
      //
      // A parent must have finished their declaration (name, relationship, phone, the student's
      // name, the attestation — see api/_lib/parentProfile.js) before they can send anything.
      // Two reasons, neither of which is "this proves they are a parent", because it does not:
      //
      //   1. The invitation can then NAME the requester and their claimed relationship, so the
      //      student is deciding about a person rather than about an email address. That is the
      //      only check in this whole flow capable of catching an impersonator, and it happens in
      //      the student's head — but only if we give them something to check.
      //   2. Sending branded email to an arbitrary address is the abusable part of this endpoint
      //      (see MAX_PENDING_INVITES), and making it cost a completed, attested profile raises
      //      that floor a long way.
      //
      // Students are not gated: a student inviting their own parent is the other direction of the
      // same link, and there is nobody for them to be impersonating.
      //
      // The claim columns are written only when migration 0009 is actually present. Naming a
      // column PostgREST has never heard of fails the whole insert, which would turn "this
      // deployment has not run 0009 yet" into "nobody can invite anyone" — the exact
      // degrade-don't-break rule the catch at the bottom of this handler exists for.
      let claimColumns = {};
      let claimedRelationship = relationship;
      if (role === 'parent') {
        const { row: profile, schemaMissing } = await getParentProfile(supabase, user.id);
        if (!schemaMissing) {
          if (!isProfileComplete(profile)) {
            return res.status(403).json({
              error: 'Finish setting up your parent account before you invite a student.',
              reason: 'profile_incomplete',
            });
          }
          claimedRelationship = relationship || profile.relationship || null;
          claimColumns = {
            // Copied onto the link row, not joined at read time: the student is consenting to
            // what the invitation SAID, and a parent editing their profile afterwards must not
            // rewrite what was agreed to.
            claimed_student_name: profile.student_full_name || null,
            claimed_by_name: profile.full_name || null,
            claimed_relationship: claimedRelationship,
          };
        }
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
      const code = mintInviteCode();
      const baseRow = {
        [mine]: user.id,
        status: 'pending',
        initiated_by: role,
        relationship: claimedRelationship,
        ...claimColumns,
        invite_email: email,
        invite_token_hash: hash,
        invite_expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Same shape as the claim columns above, and for the same reason: naming a column PostgREST
      // has never heard of fails the whole insert, which would turn "0010 has not been applied
      // here yet" into "nobody can invite anyone". The invitation still works through its token on
      // such a deployment — it just has no shareable code attached.
      const insert = (row) => supabase.from('parent_links').insert(row).select(LINK_SELECT_SHARE).single();
      const withCode = (c) => ({ ...baseRow, invite_code: c, last_sent_at: new Date().toISOString() });

      let sentCode = code;
      let { data: link, error } = await insert(withCode(sentCode));

      // A collision on the code index rather than on the email one. At 30^8 across the handful of
      // invitations live at any moment this is somewhere past astronomically unlikely — but the two
      // failures share the 23505 code, and the fallback below would tell a student "you already
      // have an invitation waiting for that address" about an address they had never used. One
      // retry with a fresh code costs nothing and removes the whole question.
      if (error?.code === '23505' && /invite_code/.test(error.message || error.details || '')) {
        sentCode = mintInviteCode();
        ({ data: link, error } = await insert(withCode(sentCode)));
      }

      let hasCode = !error;
      if (error && isUnknownColumn(error)) {
        ({ data: link, error } = await supabase.from('parent_links').insert(baseRow).select(LINK_SELECT).single());
        hasCode = false;
      }

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
      //
      // With a code on the row this stops being much of a failure at all. The response carries the
      // shareable link either way, so a student whose mail did not go out can text it instead and
      // the invitation completes normally — which matters, because the relay has a monthly quota
      // and the invitation is exactly the mail that dies first when it runs out.
      // A share-only invitation with no code to share is not an invitation anybody can reach: the
      // raw token is in this response and nowhere else, and the caller has no way to deliver it.
      // So on a pre-0010 deployment the mail goes out regardless of what was asked for, which is
      // the honest degradation — better an unwanted email than a dead invitation.
      let emailSent = false;
      if (notify || !hasCode) {
        emailSent = true;
        try {
          await sendInviteEmail({
            to: email,
            token,
            code: hasCode ? sentCode : null,
            inviterName: user.name,
            inviterRole: role,
            relationship: claimedRelationship,
            claimedName: claimColumns.claimed_by_name || null,
            claimedStudentName: claimColumns.claimed_student_name || null,
          });
        } catch (err) {
          console.error('parent invite email failed:', err);
          emailSent = false;
        }
      }

      return res.status(200).json({
        link: serializeLink(link, role),
        emailSent,
        // Only when a send was attempted and failed. Declining to send is not a warning.
        warning: (emailSent || !(notify || !hasCode)) ? undefined : (hasCode
          ? "We couldn't send the email just now — but the invitation is live. Share the link or code below instead, or try resending in a moment."
          : 'The invitation was created but the email could not be sent. Try resending it in a moment.'),
      });
    }

    // ── Resend ───────────────────────────────────────────────────────────────
    //
    // The recovery path for the most common way this feature fails, which is not a bug in any of
    // this code: the mail lands in Promotions, or goes to the address with the typo in it, or the
    // relay's monthly quota ran out overnight. Before this existed the only control on an
    // unanswered invitation was the one that cancelled it.
    //
    // The token is NOT re-minted. Re-minting would invalidate the link already sitting in the
    // recipient's inbox and the code already read out over the phone — so a resend that "fixed"
    // things would break the two channels most likely to be working.
    if (req.method === 'PATCH') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
      catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

      const linkId = String(body?.linkId || '').trim();
      if (!isUuid(linkId)) return res.status(400).json({ error: 'Missing link id.' });

      const { data: link, error: readErr } = await queryLinks((select) => supabase
        .from('parent_links')
        .select(select)
        .eq('id', linkId)
        .maybeSingle());
      if (readErr) throw readErr;
      if (!link) return res.status(404).json({ error: 'That invitation no longer exists.' });

      // Only the sender may resend. The recipient already has it, and anyone else has no business
      // causing mail to be sent to an address they do not own.
      if (link[mine] !== user.id || link.status !== 'pending') {
        return res.status(403).json({ error: 'That invitation is not yours to resend.' });
      }

      const lastSent = link.last_sent_at ? new Date(link.last_sent_at).getTime() : 0;
      const waitMs = lastSent + RESEND_COOLDOWN_MS - Date.now();
      if (waitMs > 0) {
        return res.status(429).json({
          error: `Just sent — wait ${Math.ceil(waitMs / 1000)} seconds before sending it again.`,
          retryAfterMs: waitMs,
        });
      }

      // The raw token only ever existed in the response to the original POST and in the mail it
      // sent; only its hash is stored (see mintInviteToken). So a resend re-sends the CODE, which
      // is the channel that survives being stored, and the emailed link is built from it.
      if (!link.invite_code) {
        return res.status(503).json({
          error: 'This invitation predates code-based sharing and cannot be resent. Cancel it and send a new one.',
          reason: 'no_code',
        });
      }

      // The claim the sender attested to when this invitation was created. Re-read in its own
      // tolerant query (same reasoning as api/parent/accept.js) and re-stated in the resent mail:
      // an invitation that named a person the first time and nobody the second time is a different
      // invitation, and the naming is the only part of it a recipient can actually check.
      let claim = {};
      const { data: claimRow } = await supabase
        .from('parent_links')
        .select('claimed_student_name, claimed_by_name')
        .eq('id', linkId)
        .maybeSingle();
      if (claimRow) {
        claim = {
          claimedName: claimRow.claimed_by_name || null,
          claimedStudentName: claimRow.claimed_student_name || null,
        };
      }

      try {
        await sendInviteEmail({
          to: link.invite_email,
          token: null,
          code: link.invite_code,
          inviterName: user.name,
          inviterRole: role,
          relationship: link.relationship,
          claimedName: claim.claimedName || null,
          claimedStudentName: claim.claimedStudentName || null,
        });
      } catch (err) {
        console.error('parent invite resend failed:', err);
        return res.status(502).json({
          error: "We couldn't send the email just now. Share the link or code directly instead.",
          reason: 'send_failed',
        });
      }

      const now = new Date().toISOString();
      await supabase.from('parent_links')
        .update({
          last_sent_at: now,
          // Resending renews the clock too. An invitation somebody is actively trying to deliver
          // should not quietly expire underneath them on day seven.
          invite_expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', linkId);
      await supabase.from('parent_link_events').insert({ link_id: linkId, event: 'resent', actor: user.id });

      return res.status(200).json({
        link: serializeLink({ ...link, last_sent_at: now }, role),
        emailSent: true,
      });
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
