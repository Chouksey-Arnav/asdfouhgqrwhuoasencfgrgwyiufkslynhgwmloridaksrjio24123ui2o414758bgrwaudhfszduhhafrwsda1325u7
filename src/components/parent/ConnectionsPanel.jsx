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
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Mail, UserPlus, X, ShieldCheck, Clock, Check } from 'lucide-react';
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
  },
};

const STATUS_PILL = {
  active: () => ({ bg: tint(C.green, 0.13), color: C.greenL, icon: ShieldCheck, label: 'Connected' }),
  pending: () => ({ bg: tint(C.amber, 0.13), color: C.amberL, icon: Clock, label: 'Waiting' }),
};

export default function ConnectionsPanel({ role = 'student', onChanged }) {
  const copy = COPY[role] || COPY.student;
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [busy, setBusy] = useState(false);
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
      if (emailSent === false) toast(warning || 'Invitation created, but the email did not send.');
      else toast.success(copy.sent);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
          <div key={link.id} style={glass2({ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' })}>
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
              {busy ? <Loader2 className="spin" size={13} /> : <Check size={13} />} Send invitation
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} style={btnG()}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
            They'll get an email explaining exactly what would be shared. Nothing is shared until
            they accept, and either of you can end it at any time.
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
