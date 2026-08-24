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

/**
 * The alphabet a human can actually read back.
 *
 * No I, L, O, 0, 1 or U. This code gets read aloud across a kitchen, typed on a phone by someone
 * who did not choose to be doing this, and photographed off a screen — every ambiguous glyph in it
 * is a failed connection that looks to the person like the product is broken.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 8;
// Spelled out rather than written as ranges: the ranges that look right (A-H, J-N, P-Z) quietly
// admit L and U, which this alphabet does not contain, and a validator that is looser than the
// generator is a validator nobody can reason about.
export const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/**
 * A short, shareable handle for an invitation.
 *
 * Deliberately NOT a credential, which is why 8 characters is enough where the token needs 32
 * bytes: holding this code authorizes nothing. Redeeming an invitation requires a one-time code
 * delivered to the address the invitation was addressed to (see api/parent/claim.js), so the worst
 * an attacker gets from guessing one is the preview screen — and 30^8 ≈ 6.5e11 with per-IP rate
 * limiting makes even that impractical.
 *
 * randomInt rather than `random() * 30`: the modulo bias is tiny here but there is no reason to
 * accept any, and this is the same primitive the OTP codes are minted with.
 */
export function mintInviteCode() {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) out += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  return out;
}

/**
 * Whatever the person typed → the canonical form, or '' if it is not a code at all.
 *
 * Spaces, hyphens and the grouping we display it in (ABCD-EFGH) are all stripped: the code is
 * shown grouped because eight characters are easier to copy by eye that way, and a person who
 * types back the hyphen they were shown must not be told their code is wrong.
 *
 * No cleverness beyond that — deliberately. It is tempting to "fix" an O into a 0, but this
 * alphabet contains neither, so any such guess turns a typo the person could correct into a
 * different code that simply does not exist, and a "not found" they cannot explain.
 */
export function normalizeInviteCode(input) {
  const cleaned = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return CODE_RE.test(cleaned) ? cleaned : '';
}

/** How the code is shown to people: four and four, which is how anyone reads eight characters. */
export const formatInviteCode = (code) => {
  const c = String(code || '');
  return c.length === CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
};

export const inviteUrl = (token) => `${ORIGIN}/parent-invite?token=${encodeURIComponent(token)}`;

/**
 * The link a student can text, WhatsApp, AirDrop or read out — the one that does not depend on an
 * email arriving at all.
 *
 * This exists because the email is the single least reliable part of this feature: the relay has a
 * monthly quota (api/_lib/mailer.js), invitations land in Promotions, and a parent who cannot find
 * a message has no way to tell that from the product being broken. A link the student can hand
 * over directly removes the whole class of failure.
 */
export const claimUrl = (code) => `${ORIGIN}/parent-invite?code=${encodeURIComponent(code)}`;

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
  // "Did I send this, or do I need to respond to it?" is the only thing the UI needs to decide
  // between a Cancel button and an Accept/Decline pair.
  const isOutgoing = row.initiated_by === viewerRole;

  return {
    id: row.id,
    status: row.status,
    relationship: row.relationship || null,
    initiatedBy: row.initiated_by,
    isOutgoing,
    counterparty: {
      name: other?.name || null,
      email: other?.email || row.invite_email,
      gradeLevel: other?.grade_level || null,
    },
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || null,
    expiresAt: row.invite_expires_at || null,
    revokedAt: row.revoked_at || null,
    lastSentAt: row.last_sent_at || null,

    // ── The share kit ────────────────────────────────────────────────────
    //
    // Returned ONLY to the person who sent the invitation, and only while it is still outstanding.
    // Two reasons it is scoped that tightly rather than just always included:
    //
    //   - The recipient has no use for it. They are already holding the invitation; handing them
    //     the code back would only invite them to forward it on.
    //   - It is how the student recovers when the email does not arrive, which is the single most
    //     common way this feature fails (see claimUrl). They can read the code out over the phone
    //     or paste the link into a text, and the invitation works exactly the same way.
    //
    // Null on a deployment that has not applied migration 0010 yet — the UI simply falls back to
    // "resend the email", which is what it could do before.
    share: isOutgoing && row.status === 'pending' && row.invite_code
      ? { code: row.invite_code, formattedCode: formatInviteCode(row.invite_code), url: claimUrl(row.invite_code) }
      : null,
  };
}

/** The PostgREST select that fills both sides of serializeLink's `counterparty`. */
export const LINK_SELECT = `
  id, status, relationship, initiated_by, invite_email, invite_expires_at,
  created_at, accepted_at, revoked_at, revoked_by, parent_user_id, student_user_id,
  parent:app_users!parent_links_parent_user_id_fkey(id, name, email, grade_level),
  student:app_users!parent_links_student_user_id_fkey(id, name, email, grade_level)
`;

/** The same, plus the columns migration 0010 adds. */
export const LINK_SELECT_SHARE = `${LINK_SELECT}, invite_code, last_sent_at`;

/** Postgres/PostgREST's several ways of saying "that column is not in this database". */
const UNKNOWN_COLUMN = new Set(['42703', 'PGRST100', 'PGRST204']);
export const isUnknownColumn = (err) => !!err
  && (UNKNOWN_COLUMN.has(err.code) || /column .* does not exist|schema cache/i.test(err.message || ''));

/**
 * Runs a link query with the 0010 columns, and again without them if this database has not been
 * migrated yet.
 *
 * Migrations here are applied by hand (see the header of any migration file), so "the code is
 * ahead of the schema" is a real state a deployment sits in, not a hypothetical. Naming an absent
 * column fails the WHOLE select, which would turn "0010 has not been run yet" into "no family can
 * see their connections" — the exact failure this feature cannot afford twice.
 *
 * @param {(select: string) => Promise<{data: any, error: any}>} run
 */
export async function queryLinks(run) {
  const attempt = await run(LINK_SELECT_SHARE);
  if (!attempt.error || !isUnknownColumn(attempt.error)) return attempt;
  return run(LINK_SELECT);
}

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
export async function sendInviteEmail({ to, token, code, inviterName, inviterRole, relationship, claimedName, claimedStudentName }) {
  // ── The token URL wins whenever there is a token ─────────────────────────
  //
  // This used to be the other way round — the code URL was preferred and the token URL was the
  // pre-0010 fallback — on the reasoning that both name the same invitation, so the shorter,
  // re-shareable handle was the better thing to put in a link. That was true right up until the
  // two handles stopped being equivalent.
  //
  // They now differ in exactly one way that matters: a token was delivered to THIS address and
  // nowhere else, so opening it finishes the invitation in one press, while a code is a thing
  // designed to be forwarded and still costs a second email to redeem (see api/parent/claim.js).
  // Putting the code in the email meant the one message we had already successfully delivered
  // arrived carrying the handle that says "we cannot tell this reached you" — and every parent
  // who clicked the button we sent them paid for a second email to prove the first one had
  // arrived.
  //
  // The code is still in the mail, below, as the fallback for a dead button and the thing they
  // can read out to somebody. Both resolve to the same invitation.
  const url = token ? inviteUrl(token) : claimUrl(code);
  // The attested name from the parent's profile wins over the account's display name: the
  // display name is a handle they can change at will, and the attested one is what they signed.
  const who = esc(claimedName || inviterName || (inviterRole === 'parent' ? 'A parent' : 'A student'));
  const rel = relationship ? ` (${esc(relationship)})` : '';

  // Names the student, in the requester's own words, when there is a claim to state. This is the
  // line that makes the email checkable by the person receiving it: a request addressed to
  // somebody else's name, or from a name they do not recognize, is visibly wrong at a glance —
  // and no server-side check can do that job. See supabase/migrations/0009_parent_profiles.sql.
  const claimLine = inviterRole === 'parent' && claimedStudentName
    ? `They say they are the parent or guardian of <strong>${esc(claimedStudentName)}</strong>. If that is not you, or you do not recognize this person, do not accept — just ignore this email, and nothing is shared.`
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

  // ── What the recipient has to do next, stated before they have to do it ──
  //
  // Only the parent side is passwordless: the claim flow creates a view-only account that owns no
  // work of its own, which is a thing a one-time code can safely conjure. A student account owns
  // eight thousand lines of the person's own progress, so it goes through the ordinary signup.
  // Saying which of those two this is, up front, is the difference between "this will take a
  // minute" and "here we go again".
  const recipientIsParent = inviterRole === 'student';
  // What the button above actually costs them, which changes with whether this mail carries a
  // token. A first send does (`token` is non-null), and opening that link is the whole check —
  // it was delivered here, to this address, which is the fact a code would otherwise be sent to
  // re-establish. See the header of api/parent/claim.js. A resend carries only the code, because
  // the raw token was never stored, and that path does still ask for six digits.
  const howLong = !recipientIsParent
    ? 'You will be asked to sign in to your own MedSchoolPrep account to respond.'
    : (token
      ? 'It takes about thirty seconds. Open the link above, read what would be shared, and press confirm — that is all of it. No password to invent, no code to wait for, and you never sign in as them.'
      : 'It takes about a minute — we email you a 6-digit code to confirm it is you, and that is your sign-in. No password to invent, and you never sign in as them.');

  const codeBlock = (code && recipientIsParent) ? `
        <p style="color:#555;font-size:13px;margin:0 0 8px">If the button does not work, open <strong>medschoolprep.cloud/parents</strong> and enter this code${token ? ' (we will email you a 6-digit code to confirm it is you)' : ''}:</p>
        <div style="font-size:26px;font-weight:700;letter-spacing:5px;text-align:center;padding:14px;background:#f4f4f5;border-radius:8px;margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc(formatInviteCode(code))}</div>
  ` : '';

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
        <p style="margin:0 0 14px">
          <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Review this request</a>
        </p>
        <p style="color:#555;font-size:13px;margin:0 0 20px">${howLong}</p>
        ${codeBlock}
        <p style="color:#777;font-size:13px;margin:0 0 8px">This invitation expires in ${INVITE_TTL_DAYS} days, and can only be completed by someone who can receive email at this address.</p>
        <p style="color:#777;font-size:13px;margin:0">Either of you can end the connection at any time from Settings. If you weren't expecting this, ignore this email — nothing is shared unless you accept.</p>
      </div>
    `,
    text: [
      asksToView,
      claimedStudentName && inviterRole === 'parent'
        ? `They say they are the parent or guardian of ${claimedStudentName}. If that is not you, or you do not recognize this person, ignore this email — nothing is shared.`
        : null,
      '',
      seeing,
      notSeeing,
      '',
      `Review this request: ${url}`,
      howLong,
      code && recipientIsParent
        ? `If that link does not work, go to medschoolprep.cloud/parents and enter code ${formatInviteCode(code)}${token ? ' — we will email you a 6-digit code to confirm it is you' : ''}.`
        : null,
      '',
      `This invitation expires in ${INVITE_TTL_DAYS} days. Nothing is shared unless you accept, and either of you can end the connection at any time.`,
    ].filter((line) => line !== null).join('\n'),
  });
}
