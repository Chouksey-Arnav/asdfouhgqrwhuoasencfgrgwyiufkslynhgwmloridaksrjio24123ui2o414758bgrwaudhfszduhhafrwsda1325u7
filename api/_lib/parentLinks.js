// Shared invitation mechanics for parent↔student links: minting a token, emailing it, and
// serialising a link row for either side of the relationship.
//
// The invite flow is symmetric on purpose. A parent can invite their child, and a student can
// invite their parent, and both run through the same rows, the same token, and the same
// accept_parent_link() function — because the alternative (two flows, two token formats, two
// acceptance paths) is two places for an authorization bug to live, and consent has to be mutual
// either way. Which side is empty in the row is the only difference, and the SQL function decides
// what to do about that.
import crypto from 'crypto';
import { sendMail } from './mailer.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INVITE_TTL_DAYS = 7;

const ORIGIN = process.env.SITE_ORIGIN || 'https://medschoolprep.cloud';

/**
 * A single-use invite credential.
 *
 * The raw token goes in exactly one place — the email — and only its SHA-256 hash is stored, for
 * the same reason password hashes exist: a leaked database backup should not be a set of working
 * invitations into other people's progress data. 32 bytes because the token is the entire
 * authentication for accepting an invite, so it has to be unguessable rather than merely unique.
 */
export function mintInviteToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: crypto.createHash('sha256').update(token).digest('hex') };
}

export const hashInviteToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

export const inviteUrl = (token) => `${ORIGIN}/parent-invite?token=${encodeURIComponent(token)}`;

/**
 * Row → API shape, from the point of view of whoever is asking.
 *
 * `counterparty` is the other person in the relationship — the whole reason a parent and a student
 * can be shown the same row without either learning anything they should not. It resolves to the
 * invited email address while the invitation is outstanding, because that is genuinely all that is
 * known about the other side yet.
 */
export function serializeLink(row, viewerRole) {
  const other = viewerRole === 'parent' ? row.student : row.parent;
  return {
    id: row.id,
    status: row.status,
    relationship: row.relationship || null,
    initiatedBy: row.initiated_by,
    // "Did I send this, or do I need to respond to it?" is the only thing the UI needs to decide
    // between a Cancel button and an Accept/Decline pair.
    isOutgoing: row.initiated_by === viewerRole,
    counterparty: {
      name: other?.name || null,
      email: other?.email || row.invite_email,
      gradeLevel: other?.grade_level || null,
    },
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || null,
    expiresAt: row.invite_expires_at || null,
    revokedAt: row.revoked_at || null,
  };
}

/** The PostgREST select that fills both sides of serializeLink's `counterparty`. */
export const LINK_SELECT = `
  id, status, relationship, initiated_by, invite_email, invite_expires_at,
  created_at, accepted_at, revoked_at, revoked_by, parent_user_id, student_user_id,
  parent:app_users!parent_links_parent_user_id_fkey(id, name, email, grade_level),
  student:app_users!parent_links_student_user_id_fkey(id, name, email, grade_level)
`;

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/**
 * Sends the invitation.
 *
 * The copy states plainly what the recipient is agreeing to and what the inviter will and will not
 * be able to see. That is not decoration: this email IS the consent moment for a data-sharing
 * relationship, and a student clicking "accept" on a vague message has not meaningfully consented
 * to their parent seeing their scores. It also states that either side can end it at any time,
 * because a consent that feels irreversible does not get given honestly.
 */
export async function sendInviteEmail({ to, token, inviterName, inviterRole, relationship, claimedName, claimedStudentName }) {
  const url = inviteUrl(token);
  // The attested name from the parent's profile wins over the account's display name: the
  // display name is a handle they can change at will, and the attested one is what they signed.
  const who = esc(claimedName || inviterName || (inviterRole === 'parent' ? 'A parent' : 'A student'));
  const rel = relationship ? ` (${esc(relationship)})` : '';

  // Names the student, in the requester's own words, when there is a claim to state. This is the
  // line that makes the email checkable by the person receiving it: a request addressed to
  // somebody else's name, or from a name they do not recognise, is visibly wrong at a glance —
  // and no server-side check can do that job. See supabase/migrations/0009_parent_profiles.sql.
  const claimLine = inviterRole === 'parent' && claimedStudentName
    ? `They say they are the parent or guardian of <strong>${esc(claimedStudentName)}</strong>. If that is not you, or you do not recognise this person, do not accept — just ignore this email, and nothing is shared.`
    : null;

  const asksToView = inviterRole === 'parent'
    ? `${who}${rel} is asking to follow your progress on MedSchoolPrep.`
    : `${who} wants to share their MedSchoolPrep progress with you.`;

  const seeing = inviterRole === 'parent'
    ? 'They would see your study streak, XP, quiz averages and practice-test scores.'
    : "You'll see their study streak, XP, quiz averages and practice-test scores.";

  const notSeeing = inviterRole === 'parent'
    ? 'They will never see your coach conversations, your lesson notes, or your essay drafts.'
    : 'You will never see their coach conversations, lesson notes, or essay drafts.';

  await sendMail({
    to,
    subject: inviterRole === 'parent'
      ? `${claimedName || inviterName || 'A parent'} would like to follow your MedSchoolPrep progress`
      : `${inviterName || 'A student'} wants to share their MedSchoolPrep progress with you`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">${asksToView}</h2>
        ${claimLine ? `<p style="color:#333;margin:0 0 12px">${claimLine}</p>` : ''}
        <p style="color:#555;margin:0 0 4px">${seeing}</p>
        <p style="color:#555;margin:0 0 20px">${notSeeing}</p>
        <p style="margin:0 0 20px">
          <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Review this request</a>
        </p>
        <p style="color:#777;font-size:13px;margin:0 0 8px">This link expires in ${INVITE_TTL_DAYS} days and can only be used once, from an account using this email address.</p>
        <p style="color:#777;font-size:13px;margin:0">Either of you can end the connection at any time from Settings. If you weren't expecting this, ignore this email — nothing is shared unless you accept.</p>
      </div>
    `,
    text: `${asksToView}\n${claimedStudentName && inviterRole === 'parent' ? `They say they are the parent or guardian of ${claimedStudentName}. If that is not you, or you do not recognise this person, ignore this email — nothing is shared.\n` : ''}\n${seeing}\n${notSeeing}\n\nReview this request: ${url}\n\nThis link expires in ${INVITE_TTL_DAYS} days. Nothing is shared unless you accept, and either of you can end the connection at any time.`,
  });
}
