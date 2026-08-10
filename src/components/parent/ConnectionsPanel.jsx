// The list of people connected to this account, and the controls to change that.
//
// ── One component, both roles ───────────────────────────────────────────────
// This renders inside the parent app AND inside the student's Settings tab, unchanged. That is a
// deliberate constraint rather than a convenience: consent here is mutual, so a student must be
// able to see exactly who can see them and cut it off with the same one tap a parent has. Two
// components would have drifted, and the half that drifts is always the student's.
//
// The API is symmetric for the same reason (see api/parent/links.js), so the only role-dependent
// thing in this file is the wording.
//
// ── Why an outstanding invitation now has a whole card ──────────────────────
// Because "Invitation sent, not accepted yet" with an X next to it was, for a lot of families, the
// end of the story. The email is the least reliable part of this feature — the relay has a monthly
// quota, invitations land in Promotions, and a parent who cannot find a message has no way to tell
// that apart from the product being broken — and the only control on that screen was the one that
// cancelled the invitation.
//
// So a pending invitation shows its code and its link, and offers Copy, Share and Resend. The code
// is not a credential (see migration 0010): redeeming it still requires a one-time code delivered
// to the invited address, so it is safe to text, read out over the phone, or write on a fridge —
// and any of those routes gets the family connected when the email does not.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Mail, UserPlus, X, ShieldCheck, Clock, Check, Copy, Send, Share2, RefreshCw,
} from 'lucide-react';
import { C, glass2, btn, btnG, inp, lbl, CC, R, pill, tint } from '../../lib/theme';
import * as ParentAPI from '../../lib/parentApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY = {
  parent: {
    title: 'Your students',
    empty: "You're not following anyone yet. Invite your student with the email address they use to sign in.",
    inviteCta: 'Invite a student',
    inviteLabel: "Student's email",
    relationshipLabel: 'They call you',
    relationshipPlaceholder: 'Mum, Dad, Guardian…',
    sent: 'Invitation sent. They have to accept it before anything is shared.',
    activeNote: 'You can see their progress.',
    shareTitle: 'Send it to them directly',
    shareBody: 'If the email does not arrive, this link works just as well. They still have to prove they can read the invited mailbox before anything connects.',
    shareText: (url) => `I'd like to follow your MedSchoolPrep progress — open this to see what it shares: ${url}`,
  },
  student: {
    title: 'Family access',
    empty: 'Nobody can see your progress. If you want to share it with a parent or guardian, invite them here.',
    inviteCta: 'Invite a parent',
    inviteLabel: "Parent's email",
    relationshipLabel: 'They are your',
    relationshipPlaceholder: 'Mum, Dad, Guardian…',
    sent: 'Invitation sent. Nothing is shared until they accept.',
    activeNote: 'They can see your effort and results — never your coach chats, notes, or essays.',
    shareTitle: 'Or just send them the link',
    shareBody: "Faster than waiting for the email, and it works the same way — they'll get a 6-digit code at the address you invited, and that's their sign-in. No password to set up.",
    shareText: (url) => `Here's the link to see my MedSchoolPrep progress — it takes about 30 seconds and there's no password: ${url}`,
  },
};

const STATUS_PILL = {
  active: () => ({ bg: tint(C.green, 0.13), color: C.greenL, icon: ShieldCheck, label: 'Connected' }),
  pending: () => ({ bg: tint(C.amber, 0.13), color: C.amberL, icon: Clock, label: 'Waiting' }),
};

/**
 * Copies text, and says so.
 *
 * navigator.clipboard is unavailable on any page not served over HTTPS and is refused outright by
 * some in-app browsers, which is exactly where a link like this gets opened. The textarea fallback
 * is ancient and ugly and works everywhere — and a Copy button that silently does nothing is worse
 * than no Copy button, because the person walks away believing they have the link.
 */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * The share kit for an outstanding invitation: the code, the link, and the three ways to hand
 * either one over.
 *
 * Only ever rendered for the person who SENT the invitation, and only while it is still pending —
 * the server decides that, not this component (see serializeLink), so there is no way to render
 * somebody else's code by getting a prop wrong.
 */
function ShareKit({ share, copy, onResend, resending }) {
  const [justCopied, setJustCopied] = useState('');

  const doCopy = async (kind, text) => {
    if (await copyText(text)) {
      setJustCopied(kind);
      setTimeout(() => setJustCopied(''), 1800);
      toast.success(kind === 'code' ? 'Code copied.' : 'Link copied.');
    } else {
      toast.error('Could not copy — select the text and copy it manually.');
    }
  };

  // The OS share sheet, where there is one. On a phone this is the difference between "copy this,
  // switch to Messages, find the contact, paste" and one tap — and a phone is where this screen is
  // being read.
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div style={glass2({ ...CC({ gap: 12 }), borderColor: tint(C.blue, 0.26), background: tint(C.blue, 0.04) })}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{copy.shareTitle}</div>
        <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginTop: 4 }}>{copy.shareBody}</div>
      </div>

      <button
        type="button"
        onClick={() => doCopy('code', share.formattedCode)}
        aria-label={`Copy the invitation code ${share.formattedCode}`}
        style={{
          ...R({ gap: 10, justifyContent: 'space-between' }),
          width: '100%', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
          background: C.surf2, border: `1px solid ${C.b1}`, fontFamily: C.FB,
        }}
      >
        <span style={{
          fontSize: 21, fontWeight: 800, letterSpacing: '.14em', color: C.t1,
          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
        }}>
          {share.formattedCode}
        </span>
        {justCopied === 'code' ? <Check size={15} color={C.greenL} /> : <Copy size={15} color={C.t3} />}
      </button>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: -4 }}>
        They can enter this at <strong style={{ color: C.t2 }}>medschoolprep.cloud/parents</strong> instead of
        following a link.
      </div>

      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <button type="button" onClick={() => doCopy('link', share.url)} style={btnG({ fontSize: 12.5 })}>
          {justCopied === 'link' ? <Check size={13} /> : <Copy size={13} />} Copy link
        </button>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ text: copy.shareText(share.url) }).catch(() => {})}
            style={btnG({ fontSize: 12.5 })}
          >
            <Share2 size={13} /> Share
          </button>
        )}
        <button type="button" onClick={onResend} disabled={resending} style={btnG({ fontSize: 12.5, opacity: resending ? 0.6 : 1 })}>
          {resending ? <Loader2 className="spin" size={13} /> : <RefreshCw size={13} />} Resend email
        </button>
      </div>
    </div>
  );
}

export default function ConnectionsPanel({ role = 'student', onChanged }) {
  const copy = COPY[role] || COPY.student;
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { links } = await ParentAPI.listLinks();
      setLinks(links || []);
    } catch {
      // A failure here means the connections list is unavailable, not that the account is broken —
      // this panel sits inside a Settings tab full of things that still work. Fail quiet, show the
      // empty state, let a retry happen on the next open.
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) return setError('Enter a valid email address.');

    setBusy(true);
    try {
      const { emailSent, warning } = await ParentAPI.invite(trimmed, relationship.trim() || null);
      setEmail(''); setRelationship(''); setShowForm(false);
      // A failed send is no longer a failed invitation: the card below carries a link and a code
      // that work regardless, so this is a note rather than an apology.
      if (emailSent === false) toast(warning || 'Invitation created — share the link below.', { icon: '📋', duration: 6000 });
      else toast.success(copy.sent);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(link) {
    setResendingId(link.id);
    try {
      await ParentAPI.resendInvite(link.id);
      toast.success(`Sent again to ${link.counterparty.email}.`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResendingId(null);
    }
  }

  async function handleRemove(link) {
    // The confirm names the consequence rather than asking "are you sure?", because the two
    // outcomes behind this one button are genuinely different — withdrawing an invitation nobody
    // acted on, versus cutting off access someone has been relying on.
    const question = link.status === 'active'
      ? (role === 'parent'
        ? `Stop following ${link.counterparty.name || link.counterparty.email}? You'll lose access to their progress.`
        : `Remove ${link.counterparty.name || link.counterparty.email}? They'll immediately stop seeing your progress.`)
      : (link.isOutgoing
        ? `Cancel the invitation to ${link.counterparty.email}?`
        : `Decline the request from ${link.counterparty.name || link.counterparty.email}?`);
    if (!window.confirm(question)) return;

    try {
      await ParentAPI.revokeLink(link.id);
      toast.success(link.status === 'active' ? 'Connection ended.' : 'Invitation removed.');
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 className="spin" size={18} color={C.blueL} /></div>;
  }

  return (
    <div style={CC({ gap: 12 })}>
      {links.length === 0 && !showForm && (
        <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{copy.empty}</div>
      )}

      {links.map((link) => {
        const meta = (STATUS_PILL[link.status] || STATUS_PILL.pending)();
        const Icon = meta.icon;
        // An invitation someone sent to THIS account still needs an answer, and the answer lives
        // on the invitation email's link — not here — because accepting is a consent decision that
        // has to be made against a screen that says what is being agreed to. See InviteScreen.
        const needsMyAnswer = link.status === 'pending' && !link.isOutgoing;
        return (
          <div key={link.id} style={CC({ gap: 10 })}>
            <div style={glass2({ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' })}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {link.counterparty.name || link.counterparty.email}
                </div>
                <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2 }}>
                  {link.relationship ? `${link.relationship} · ` : ''}
                  {link.status === 'active' ? copy.activeNote
                    : needsMyAnswer ? 'Asked to connect — check your email to respond'
                    : 'Invitation sent, not accepted yet'}
                </div>
              </div>
              <span style={pill(meta.bg, meta.color)}>
                <Icon size={11} style={{ marginRight: 5 }} /> {meta.label}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(link)}
                aria-label={link.status === 'active' ? 'End this connection' : 'Remove this invitation'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 6 }}
              >
                <X size={15} />
              </button>
            </div>
            {link.share && (
              <ShareKit
                share={link.share}
                copy={copy}
                resending={resendingId === link.id}
                onResend={() => handleResend(link)}
              />
            )}
          </div>
        );
      })}

      {showForm ? (
        <form onSubmit={handleInvite} style={glass2({ ...CC({ gap: 12 }) })}>
          <div>
            <label style={lbl()}>{copy.inviteLabel}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} color={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" autoComplete="email" style={inp({ paddingLeft: 34 })}
              />
            </div>
            {role === 'student' && (
              <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 6 }}>
                Use an address they can actually open — that is where their sign-in code goes, and
                it is the only way this connects.
              </div>
            )}
          </div>
          <div>
            <label style={lbl()}>{copy.relationshipLabel} <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>(optional)</span></label>
            <input
              value={relationship} onChange={(e) => setRelationship(e.target.value)}
              placeholder={copy.relationshipPlaceholder} maxLength={40} style={inp()}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: C.roseL }}>{error}</div>}
          <div style={R({ gap: 8 })}>
            <button type="submit" disabled={busy} style={btn(C.blueGrad, { opacity: busy ? 0.7 : 1 })}>
              {busy ? <Loader2 className="spin" size={13} /> : <Send size={13} />} Send invitation
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} style={btnG()}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
            {role === 'student'
              ? "They'll get an email explaining exactly what would be shared, plus a link and a code you can send them yourself. It takes them about thirty seconds and there's no password. Nothing is shared until they accept, and either of you can end it at any time."
              : "They'll get an email explaining exactly what would be shared. Nothing is shared until they accept, and either of you can end it at any time."}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} style={btnG({ alignSelf: 'flex-start' })}>
          <UserPlus size={13} /> {copy.inviteCta}
        </button>
      )}
    </div>
  );
}
