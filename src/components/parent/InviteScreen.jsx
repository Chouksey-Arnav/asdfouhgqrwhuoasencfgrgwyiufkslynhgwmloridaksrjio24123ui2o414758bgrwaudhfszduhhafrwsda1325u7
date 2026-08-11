// /parent-invite?code=… (or ?token=…) — the screen an invitation lands on.
//
// ── What this screen is for ─────────────────────────────────────────────────
// It is the entire onboarding for a parent account, and it has to work for someone who did not
// choose to be here: they were sent a link by their child, they are reading it on a phone, and
// their patience for this is measured in seconds. Every extra field is a family that does not get
// connected.
//
// So the parent path is three taps and no password. Read what the invitation says → "email me a
// code" → six digits → signed in, connected, looking at the dashboard. The account is created
// along the way and the invitation is accepted in the same request, which is the part that used to
// go wrong: the old flow sent people off to build an account, dropped the invite token on the way,
// and left them signed in to an empty dashboard with the invitation still sitting unaccepted and
// nothing on screen saying so.
//
// ── The screen still shows before it acts ───────────────────────────────────
// Nothing is created, sent or accepted until the visitor asks for it. This link governs whether
// one person can see another person's data, so the first thing on screen is who is asking, what
// they would see, and what they would never see — and only then a button. A page that redeems on
// mount has collected a click, not consent.
//
// ── Why it sits above the signed-in/signed-out split ────────────────────────
// Whoever opens this may be signed out, signed in as the wrong account, signed in with the wrong
// role, or have no account at all. Every one of those is a normal Tuesday for a link emailed to a
// family, and none of them is "the login screen" — so AuthGate renders this ahead of its own
// branch, exactly like the legal documents.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, ShieldCheck, EyeOff, Eye, ArrowRight, BadgeCheck, Mail, KeyRound, Lock,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, CC, R, tint } from '../../lib/theme';
import * as ParentAPI from '../../lib/parentApi';
import { PARENT_VIEWS } from '../../lib/routes';
import AnimatedLogo from '../AnimatedLogo';
import { OtpBoxes, ResendTimer, FieldError } from '../auth/ui';

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
    // flex:1 so this actually fills the flex row #root creates (src/index.css) rather than
    // collapsing to the card's own width and centring itself inside a 530px sliver.
    <div style={{ flex: 1, minWidth: 0, height: 'var(--msp-vh)', overflowY: 'auto', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, ...CC({ gap: 14 }) }}>
        <div style={{ ...R({ gap: 10 }), justifyContent: 'center' }}>
          <AnimatedLogo size={26} variant="pop" />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</span>
        </div>
        <div style={glass()}>{children}</div>
      </div>
    </div>
  );
}

function Failed({ title, body, action }) {
  return (
    <Frame>
      <div style={CC({ gap: 14 })}>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>{body}</div>
        {action || (
          <button type="button" onClick={() => { window.location.href = '/'; }} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
            Go to MedSchoolPrep
          </button>
        )}
      </div>
    </Frame>
  );
}

/**
 * @param {object}   props
 * @param {string?}  props.token      raw invite token from the URL, when the link came from email
 * @param {string?}  props.code       8-character invitation code, when the link was shared directly
 * @param {object?}  props.user       the signed-in account, or null
 * @param {Function} props.onAuthed   called with (sessionToken, user) when the claim signs someone in
 * @param {Function} props.onDone     called after a signed-in student accepts
 * @param {Function} props.onSignIn   send the visitor to the login screen
 * @param {Function} props.onSignUp   send the visitor to signup, pre-selecting the needed role
 * @param {Function} props.onSignOut  drop the current session so another account can respond
 */
export default function InviteScreen({ token, code, user, onAuthed, onDone, onSignIn, onSignUp, onSignOut }) {
  // resolving → which kind of invitation is this at all
  // claim     → student invited a parent: the passwordless path this screen exists for
  // student   → parent invited a student: needs a real student account, so it needs a session
  // error / accepted
  const [mode, setMode] = useState('resolving');
  const [stage, setStage] = useState('review'); // review | code (claim mode only)
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  // True when the last send reused a code already in the inbox rather than mailing a new one.
  const [reused, setReused] = useState(false);

  const ref = { code: code || null, token: token || null };

  const resolve = useCallback(async () => {
    // The claim preview is tried first and needs no session, which matters: the overwhelmingly
    // common case is a signed-out parent, and asking them to sign in before we can even tell them
    // what they were invited to would be the old flow again.
    try {
      const { invite } = await ParentAPI.previewClaim(ref);
      setInvite(invite);
      setMode('claim');
      return;
    } catch (err) {
      if (err.reason !== 'wrong_direction') {
        setError(err.message);
        setMode('error');
        return;
      }
    }

    // An invitation running the other way — a parent asking to follow a student. That needs the
    // student's own account, so there is nothing to preview until they are signed in.
    if (!user) { setMode('student-signed-out'); return; }
    try {
      const { invite } = await ParentAPI.previewInvite(ref);
      setInvite(invite);
      setMode('student');
    } catch (err) {
      setError(err.message);
      setMode('error');
    }
    // `ref` is rebuilt each render but its contents are the props; depending on those is correct
    // and depending on the object identity would re-resolve on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, code, user]);

  useEffect(() => { resolve(); }, [resolve]);

  // ── Claim: send the code ─────────────────────────────────────────────────
  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      // `reused` means a code from the last minute is still live and was left alone rather than
      // replaced — the common case here is a parent who taps Continue, goes back to re-read what
      // would be shared, and taps it again. Saying "Code sent" a second time would send them
      // looking for a second email that is not coming, and the code they already have is the one
      // that works. See RESEND_FLOOR_MS in api/_lib/otp.js.
      const { reused } = await ParentAPI.sendClaimCode(ref);
      setStage('code');
      setReused(!!reused);
      toast.success(reused ? 'Use the code we already emailed you.' : 'Code sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Claim: spend it ──────────────────────────────────────────────────────
  async function submitCode(e) {
    e?.preventDefault?.();
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit code from your email.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await ParentAPI.verifyClaim({ ...ref, otp });
      // Signed in either way. If the accept itself did not go through — the student cancelled the
      // invitation while this was happening, another tab already used it — the account and session
      // are real and the dashboard explains itself, which beats stranding somebody who did
      // everything right on an error page with nothing to click.
      onAuthed?.(res.token, res.user);
      if (res.accepted) toast.success("You're connected.");
      else toast('Signed in — but that invitation had already been used. Ask for a new one.', { icon: 'ℹ️' });
      window.location.href = PARENT_VIEWS.dashboard;
    } catch (err) {
      setError(err.message);
      // A wrong or stale code is a normal thing to type; it must not throw the person out of the
      // flow they are three taps into. Only a dead invitation sends them to the error screen.
      if (['not_found', 'expired', 'wrong_direction', 'role_conflict'].includes(err.reason)) setMode('error');
    } finally {
      setBusy(false);
    }
  }

  // ── Student side: the existing signed-in accept ──────────────────────────
  async function acceptAsStudent() {
    setBusy(true);
    try {
      await ParentAPI.acceptInvite(ref);
      setMode('accepted');
      toast.success('Connected.');
    } catch (err) {
      setError(err.message);
      setMode('error');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'resolving') {
    return <Frame><div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 className="spin" size={20} color={C.blueL} /></div></Frame>;
  }

  if (mode === 'error') {
    return (
      <Failed
        title="This invitation didn't work"
        body={error || 'Ask your student to send a new one — it takes them one tap from Settings ▸ Family access.'}
      />
    );
  }

  if (mode === 'accepted') {
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
          <button type="button" onClick={() => { onDone?.(); window.location.href = '/'; }} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
            Continue <ArrowRight size={14} />
          </button>
        </div>
      </Frame>
    );
  }

  // ── A parent-to-student request, opened by somebody signed out ───────────
  if (mode === 'student-signed-out') {
    return (
      <Failed
        title="Sign in to respond"
        body="This request is for a student account. Sign in to MedSchoolPrep with the address it was sent to, and it will be waiting for you."
        action={(
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <button type="button" onClick={() => onSignIn?.('')} style={btn(C.blueGrad)}>Sign in</button>
            <button type="button" onClick={() => onSignUp?.('', 'student')} style={btnG()}>Create a student account</button>
          </div>
        )}
      />
    );
  }

  // ── The parent claim ─────────────────────────────────────────────────────
  if (mode === 'claim') {
    const inviterName = invite.inviter?.name || 'Your student';

    if (stage === 'code') {
      return (
        <Frame>
          <form onSubmit={submitCode}>
            <div style={CC({ gap: 18 })}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>
                  Check your email
                </div>
                <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>
                  {reused ? (
                    <>The code we already sent to <strong style={{ color: C.t1 }}>{invite.emailHint}</strong> is
                      still good — we didn't send a second one. Enter it and you're in.</>
                  ) : (
                    <>We sent a 6-digit code to <strong style={{ color: C.t1 }}>{invite.emailHint}</strong> — the
                      address {inviterName} invited. Enter it and you're in.</>
                  )}
                </div>
              </div>

              <OtpBoxes value={otp} onChange={setOtp} />
              <FieldError>{error}</FieldError>

              <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
                {busy ? <Loader2 className="spin" size={14} /> : <ShieldCheck size={15} />}
                {busy ? 'Connecting…' : 'Verify and connect'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <ResendTimer onResend={async () => {
                  try {
                    const { reused: again } = await ParentAPI.sendClaimCode(ref);
                    setReused(!!again);
                    toast.success(again ? 'The code already in your inbox still works.' : 'New code sent.');
                  } catch (err) { toast.error(err.message); }
                }} />
              </div>

              {/*
                The one piece of troubleshooting worth putting on the screen rather than in a help
                article. "It didn't arrive" is almost always one of these two, and both are things
                only the visitor can check.
              */}
              <div style={glass2({ fontSize: 12, color: C.t3, lineHeight: 1.6 })}>
                No code? Check your spam or Promotions folder. If <strong style={{ color: C.t2 }}>{invite.emailHint}</strong> isn't
                an address you can read, ask {inviterName} to re-send the invitation to one that is.
              </div>
            </div>
          </form>
        </Frame>
      );
    }

    return (
      <Frame>
        <div style={CC({ gap: 18 })}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>
              {inviterName} wants to share their progress with you
            </div>
            <div style={{ fontSize: 12.5, color: C.t3, marginTop: 6 }}>
              Invited {invite.emailHint}
              {invite.relationship ? ` · you're their ${invite.relationship.toLowerCase()}` : ''}
            </div>
          </div>

          <div style={glass2({ ...CC({ gap: 16 }) })}>
            <Bullets title="You'd see" items={SHARED} icon={Eye} hue={C.blueL} />
            <Bullets title="You'd never see" items={NOT_SHARED} icon={EyeOff} hue={C.t3} />
          </div>

          <button type="button" onClick={requestCode} disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
            {busy ? <Loader2 className="spin" size={14} /> : <Mail size={15} />}
            {busy ? 'Sending…' : 'Continue — email me a code'}
          </button>
          <FieldError>{error}</FieldError>

          {/*
            Said before the button rather than discovered after it. "How long is this going to
            take" is the actual question in the reader's head, and a parent who is told there is no
            password and no form reads the next screen as almost done instead of as step two of
            who-knows-how-many.
          */}
          <div style={CC({ gap: 8 })}>
            {[
              [KeyRound, 'No password to invent. The code is your sign-in, and you can ask for a new one whenever you come back.'],
              [Lock, "Your own account — you never sign in as your student, and you never see their password."],
              [ShieldCheck, 'Either of you can end this at any time, and it takes effect immediately.'],
            ].map(([Icon, text]) => (
              <div key={text} style={R({ gap: 9, alignItems: 'flex-start' })}>
                <Icon size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    );
  }

  // ── A parent asking to follow a signed-in student ────────────────────────
  const inviterName = invite.from?.name || invite.from?.email || 'A parent';
  const canAccept = !!user && invite.matchesYou;
  const wrongEmail = !!user && String(user.email || '').toLowerCase() !== String(invite.addressedTo || '').toLowerCase();
  const wrongRole = !!user && !wrongEmail && !invite.matchesYou;

  return (
    <Frame>
      <div style={CC({ gap: 18 })}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>
            {inviterName} would like to follow your progress
          </div>
          <div style={{ fontSize: 12.5, color: C.t3, marginTop: 6 }}>
            Sent to {invite.addressedTo}
            {invite.relationship ? ` · ${invite.relationship}` : ''}
          </div>
        </div>

        {/*
          What the requester actually claimed, in their own words, when they sent this.

          This is the only check in the whole flow that can catch an impersonator, and it is not
          performed by a server — it is performed here, by the one person who knows whether they
          have a mother called Priya. Everything the parent had to fill in before they could send
          anything (see ParentSetup.jsx and migration 0009) exists so that this box has something
          in it. A student who reads a name they do not recognise, or their own name spelled as
          somebody else's, closes the tab and nothing has happened.
        */}
        {(invite.claimedByName || invite.claimedStudentName) && (
          <div style={glass2({ ...CC({ gap: 8 }), borderColor: tint(C.amber, 0.3), background: tint(C.amber, 0.05) })}>
            <div style={R({ gap: 8 })}>
              <BadgeCheck size={14} color={C.amberL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.amberL, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                What they told us
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
              {invite.claimedByName && (
                <>They say they are <strong style={{ color: C.t1 }}>{invite.claimedByName}</strong>
                  {invite.claimedRelationship ? `, your ${invite.claimedRelationship.toLowerCase()}` : ''}.{' '}</>
              )}
              {invite.claimedStudentName && (
                <>They named the student as <strong style={{ color: C.t1 }}>{invite.claimedStudentName}</strong>.{' '}</>
              )}
              If that is not you, or you don't recognise this person, don't accept — close this
              page and nothing is shared.
            </div>
          </div>
        )}

        <div style={glass2({ ...CC({ gap: 16 }) })}>
          <Bullets title="They would see" items={SHARED} icon={Eye} hue={C.blueL} />
          <Bullets title="They would never see" items={NOT_SHARED} icon={EyeOff} hue={C.t3} />
        </div>

        {canAccept && (
          <>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <button type="button" onClick={acceptAsStudent} disabled={busy} style={btn(C.blueGrad, { opacity: busy ? 0.7 : 1 })}>
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
