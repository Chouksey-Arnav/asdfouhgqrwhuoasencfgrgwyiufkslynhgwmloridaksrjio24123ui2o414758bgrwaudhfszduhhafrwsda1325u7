// /parent-invite?token=… — the screen an invitation email lands on.
//
// ── Why this is its own surface, above the signed-in/signed-out split ───────
// Whoever opens this link may be signed out, signed in as the wrong account, signed in with the
// wrong role, or have no account at all. Every one of those is a normal Tuesday for an invitation
// emailed to a family, and each needs a different next step — so AuthGate renders this ahead of
// its own branch, exactly like the legal documents.
//
// ── The screen shows before it acts ─────────────────────────────────────────
// It loads a PREVIEW of the invitation and waits. A page that redeems the token on mount and then
// announces "you are now sharing your progress" has collected a click, not consent, and consent is
// the entire product requirement here — this link governs whether one person can see another
// person's data. So: who is asking, what they would see, what they would never see, and only then
// a button.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, EyeOff, Eye, ArrowRight } from 'lucide-react';
import { C, glass, glass2, btn, btnG, CC, R, tint } from '../../lib/theme';
import * as ParentAPI from '../../lib/parentApi';
import { PARENT_VIEWS } from '../../lib/routes';

const SHARED = [
  'Study streak and how many days a week they study',
  'XP, level, and lessons passed',
  'Quiz averages and practice-test scores',
];
const NOT_SHARED = [
  'Coach conversations',
  'Lesson notes and highlights',
  'Essay drafts and application writing',
];

function Bullets({ items, icon: Icon, hue, title }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <div style={CC({ gap: 7 })}>
        {items.map((item) => (
          <div key={item} style={R({ gap: 8, alignItems: 'flex-start' })}>
            <Icon size={14} color={hue} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div style={{ minHeight: 'var(--msp-vh)', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={glass({ width: '100%', maxWidth: 480 })}>{children}</div>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {string}   props.token      the raw invite token from the URL
 * @param {object?}  props.user       the signed-in account, or null
 * @param {Function} props.onDone     called after a successful accept
 * @param {Function} props.onSignIn   send the visitor to the login screen
 * @param {Function} props.onSignUp   send the visitor to signup, pre-selecting the needed role
 * @param {Function} props.onSignOut  drop the current session so another account can respond
 */
export default function InviteScreen({ token, user, onDone, onSignIn, onSignUp, onSignOut }) {
  const [state, setState] = useState('loading'); // loading | ready | error | accepted
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { invite } = await ParentAPI.previewInvite(token);
      setInvite(invite);
      setState('ready');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function accept() {
    setBusy(true);
    try {
      await ParentAPI.acceptInvite(token);
      setState('accepted');
      toast.success('Connected.');
    } catch (err) {
      setError(err.message);
      setState('error');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return <Frame><div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 className="spin" size={20} color={C.blueL} /></div></Frame>;
  }

  if (state === 'error') {
    return (
      <Frame>
        <div style={CC({ gap: 14 })}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>This link didn't work</div>
          <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>{error}</div>
          <button type="button" onClick={() => { window.location.href = '/'; }} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
            Go to MedSchoolPrep
          </button>
        </div>
      </Frame>
    );
  }

  if (state === 'accepted') {
    const goHome = () => { window.location.href = user?.role === 'parent' ? PARENT_VIEWS.dashboard : '/'; };
    return (
      <Frame>
        <div style={CC({ gap: 14 })}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: tint(C.green, 0.13), border: `1px solid ${tint(C.green, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={19} color={C.green} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>You're connected</div>
          <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>
            You can end this at any time from Settings, and it takes effect immediately.
          </div>
          <button type="button" onClick={() => { onDone?.(); goHome(); }} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
            Continue <ArrowRight size={14} />
          </button>
        </div>
      </Frame>
    );
  }

  const needsRole = invite.youWouldBe;
  const inviterIsParent = needsRole === 'student';
  const inviterName = invite.from.name || invite.from.email || (inviterIsParent ? 'A parent' : 'A student');

  // Signed in, right email, right role — the only case where the button can actually do anything.
  const canAccept = !!user && invite.matchesYou;
  // Signed in as the wrong person. Worth separating from "wrong role", because the fix is
  // different: one is "sign in as someone else", the other is "you need a different kind of
  // account", and a single generic message would send half of these families in the wrong
  // direction.
  const wrongEmail = !!user && String(user.email || '').toLowerCase() !== String(invite.addressedTo || '').toLowerCase();
  const wrongRole = !!user && !wrongEmail && !invite.matchesYou;

  return (
    <Frame>
      <div style={CC({ gap: 18 })}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>
            {inviterIsParent
              ? `${inviterName} would like to follow your progress`
              : `${inviterName} wants to share their progress with you`}
          </div>
          <div style={{ fontSize: 12.5, color: C.t3, marginTop: 6 }}>
            Sent to {invite.addressedTo}
            {invite.relationship ? ` · ${invite.relationship}` : ''}
          </div>
        </div>

        <div style={glass2({ ...CC({ gap: 16 }) })}>
          <Bullets title={inviterIsParent ? 'They would see' : "You'd see"} items={SHARED} icon={Eye} hue={C.blueL} />
          <Bullets title={inviterIsParent ? "They would never see" : "You'd never see"} items={NOT_SHARED} icon={EyeOff} hue={C.t3} />
        </div>

        {canAccept && (
          <>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <button type="button" onClick={accept} disabled={busy} style={btn(C.blueGrad, { opacity: busy ? 0.7 : 1 })}>
                {busy ? <Loader2 className="spin" size={13} /> : <ShieldCheck size={14} />} Accept and connect
              </button>
              <button type="button" onClick={() => { window.location.href = '/'; }} style={btnG()}>Not now</button>
            </div>
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
              You can end this at any time from Settings — it takes effect on their very next
              screen refresh, not at the end of some session.
            </div>
          </>
        )}

        {!user && (
          <div style={CC({ gap: 10 })}>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
              Sign in as <strong style={{ color: C.t1 }}>{invite.addressedTo}</strong> to respond
              {needsRole === 'parent' ? ', or create a parent account with that address.' : '.'}
            </div>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <button type="button" onClick={() => onSignIn?.(invite.addressedTo)} style={btn(C.blueGrad)}>Sign in</button>
              <button type="button" onClick={() => onSignUp?.(invite.addressedTo, needsRole)} style={btnG()}>
                Create a{needsRole === 'parent' ? ' parent' : ''} account
              </button>
            </div>
          </div>
        )}

        {/*
          Both mismatches end in the same action — sign out — so the button is here rather than
          duplicated into each branch. Telling someone to sign out without giving them the control
          is how an invitation dies on a screen the recipient cannot get past.
        */}
        {(wrongEmail || wrongRole) && (
          <div style={CC({ gap: 10 })}>
            <div style={{ fontSize: 13, color: C.amberL, lineHeight: 1.6 }}>
              {wrongEmail
                ? `This invitation was sent to ${invite.addressedTo}, but you're signed in as ${user.email}.`
                : needsRole === 'parent'
                  ? 'This invitation needs a parent account, and yours is a student account.'
                  : 'This invitation needs a student account.'}
            </div>
            <button type="button" onClick={() => onSignOut?.()} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
              Sign out and use a different account
            </button>
          </div>
        )}
      </div>
    </Frame>
  );
}
