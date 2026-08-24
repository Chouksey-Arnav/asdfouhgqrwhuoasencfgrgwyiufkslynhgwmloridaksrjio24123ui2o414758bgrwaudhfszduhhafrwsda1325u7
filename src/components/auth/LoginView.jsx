import React, { useState } from 'react';
import { Mail, ArrowRight, Users, KeyRound, Loader2, GraduationCap, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { C, btn, btnG, inp, lbl, CC, R, tint } from '../../lib/theme';
import { PARENT_HUB_PATH } from '../../lib/routes';
import * as AuthAPI from '../../lib/authApi';
import { PasswordField, FieldError, BackButton, OrDivider, OtpBoxes, ResendTimer } from './ui';
import GoogleButton from './GoogleButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {boolean} parentMode  true at /parents/login — same form, addressed to a parent, and
 *   without the "are you in the right place?" prompt that the general screen carries.
 *
 * ── Two ways in, and which one leads ────────────────────────────────────────
 * A parent account created through an invitation has NO PASSWORD — that is what makes accepting an
 * invitation a thirty-second job (see api/parent/claim.js). So for a parent, "enter your password"
 * is the wrong first question: most of them do not have one and never will, and a password field
 * they cannot fill is a dead end on the screen they were sent to.
 *
 * At /parents/login the emailed code therefore leads and the password is the alternative; on the
 * general screen it is the other way round, because a student always has a password. Both paths
 * end at api/auth/login, and the code path is not a weaker credential than the password one —
 * "forgot password" has always turned control of an inbox into control of the account.
 */
export default function LoginView({ initialEmail = '', parentMode = false, onBack, onGoSignup, onGoForgot, onGoParents, onAuthed }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noPassword, setNoPassword] = useState(false);

  // 'password' | 'code' — which credential the form is asking for.
  const [method, setMethod] = useState(parentMode ? 'code' : 'password');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  // Set when a send was suppressed because a code from the last minute is still live (the server's
  // RESEND_FLOOR_MS). The person is not waiting for a second email and should not be told to.
  const [reusedCode, setReusedCode] = useState(false);
  // A signed-in account that turned out to be the other kind. See `finish` below.
  const [roleMismatch, setRoleMismatch] = useState(null);

  /**
   * Hands the session up — unless this is /parents/login and the account is a student's.
   *
   * ── Why that case needs a screen rather than a redirect ─────────────────────
   * Nothing before this point can tell the two apart. Every pre-auth endpoint deliberately refuses
   * to say whether an address has an account, let alone what kind, because an endpoint that
   * answered would be a way to enumerate the site's users. So the first honest moment is here,
   * after the person has proven they can read that mailbox.
   *
   * Left alone, AuthGate would look at `role`, decide this is a student, and drop somebody who
   * followed a "parent sign-in" link into the student app — no lessons, no dashboard, no
   * explanation, and no clue that a parent account is a separate thing they do not have. That is
   * the exact confusion /parents/login was built to end, so it is worth one screen.
   */
  function finish(token, user) {
    if (parentMode && user?.role !== 'parent') { setRoleMismatch({ token, user }); return; }
    onAuthed(token, user);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNoPassword(false);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');

    setBusy(true);
    try {
      const { token, user } = await AuthAPI.login(trimmed, password);
      finish(token, user);
    } catch (err) {
      setError(err.message);
      if (err.data?.noPassword) { setNoPassword(true); setMethod('code'); }
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(e) {
    e?.preventDefault?.();
    setError('');
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError('Enter a valid email address.');

    setBusy(true);
    try {
      const { sent } = await AuthAPI.sendSigninCode(trimmed);
      setCodeSent(true);
      setReusedCode(sent === false);
      toast.success(sent === false ? 'Use the code we already sent you.' : 'Code sent — check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');

    setBusy(true);
    try {
      const trimmed = email.trim();
      const { verificationToken } = await AuthAPI.verifySigninCode(trimmed, code);
      const { token, user } = await AuthAPI.loginWithCode(trimmed, verificationToken);
      finish(token, user);
    } catch (err) {
      // The one place the deliberate "we don't say whether this address has an account" policy
      // surfaces as confusion: the send succeeded, no mail arrived, and the code they eventually
      // guess at is wrong. Naming the likely cause costs nothing an attacker did not already know
      // by this point — they have already failed to produce a code.
      //
      // Keyed on the server's reason code, not on the wording of its message: this branch was
      // written against a sentence that had already been reworded, so the help never appeared.
      setError(err.reason === 'incorrect'
        ? "That code isn't right. If no email arrived, there may be no account for this address yet — check the spelling, or create one below."
        : err.message);
    } finally {
      setBusy(false);
    }
  }

  const heading = parentMode ? 'Parent sign-in' : 'Log in';
  const sub = parentMode
    ? "Your own parent account — the email you were invited at, not your student's."
    : 'Welcome back — enter your email and password.';

  const emailField = (
    <div>
      <label style={lbl()}>Email</label>
      <div style={{ position: 'relative' }}>
        <Mail size={15} color={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          autoFocus type="email" value={email}
          onChange={(e) => { setEmail(e.target.value); setCodeSent(false); }}
          placeholder="you@example.com" autoComplete="email" style={inp({ paddingLeft: 36 })}
        />
      </div>
    </div>
  );

  // ── Signed in, but as the other kind of account ─────────────────────────
  //
  // Both ways out are real and neither is hidden. Continuing is offered first because it is the
  // account they actually have and it is a working app; making a parent account is offered second
  // because it needs a different address, which is a thing to explain rather than a button to
  // press by reflex. Role is written once at creation and by nothing afterwards (see
  // api/auth/complete-signup.js), so "upgrade this one" is not on the menu — it does not exist.
  if (roleMismatch) {
    return (
      <div style={CC({ gap: 16 })}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tint(C.amber, 0.13), border: `1px solid ${tint(C.amber, 0.3)}`,
        }}>
          <GraduationCap size={18} color={C.amberL} />
        </div>
        <div>
          <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>
            That's a student account
          </div>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.65 }}>
            <strong style={{ color: C.t1 }}>{roleMismatch.user?.email}</strong> signs in as a student, so it
            has lessons and practice tests rather than a family dashboard. An account is one or the
            other for good — it is what stops anyone making themselves someone else's guardian — so a
            parent dashboard needs its own account at a different address of yours.
          </div>
        </div>
        <button type="button" onClick={() => onAuthed(roleMismatch.token, roleMismatch.user)} style={btn(C.blueGrad, { width: '100%' })}>
          Continue to the student app <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => { setRoleMismatch(null); onGoSignup(''); }}
          style={btnG({ width: '100%', justifyContent: 'center' })}
        >
          <Users size={13} /> Create a parent account instead
        </button>
        <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, textAlign: 'center' }}>
          If your student already invited you, open their link or enter their 8-character code at{' '}
          <a href={PARENT_HUB_PATH} style={{ color: C.blueL, fontWeight: 600 }}>medschoolprep.cloud/parents</a> —
          that makes the parent account for you, at whichever address they invited.
        </div>
      </div>
    );
  }

  // ── The emailed-code branch ─────────────────────────────────────────────
  if (method === 'code') {
    return (
      <>
        <BackButton onClick={onBack} label={parentMode ? 'Back to the parent page' : 'Back to home'} />
        <form onSubmit={codeSent ? submitCode : requestCode}>
          <div style={CC({ gap: 16 })}>
            <div>
              <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{heading}</div>
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55 }}>
                {codeSent
                  ? <>Enter the 6-digit code we sent to <strong style={{ color: C.t1 }}>{email.trim()}</strong>.</>
                  : <>{sub} We'll email you a 6-digit code — no password needed.</>}
              </div>
            </div>

            {!codeSent && emailField}
            {codeSent && <OtpBoxes value={code} onChange={setCode} />}

            {/* Said rather than left to be inferred: the server reused a code it had already
                emailed instead of burning a second send, so the mail to look for is the one that
                is already there. Without this the person waits for an email that is not coming and
                then taps Resend, which is the exact loop the reuse exists to prevent. */}
            {codeSent && reusedCode && (
              <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t3, lineHeight: 1.55 }}>
                <Inbox size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 4 }} />
                <span>You asked a moment ago, so we didn't send a second one — the code already in your inbox still works.</span>
              </div>
            )}

            <FieldError>{error}</FieldError>

            <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
              {busy ? <Loader2 className="spin" size={14} /> : <KeyRound size={14} />}
              {busy ? 'Working…' : (codeSent ? 'Sign in' : 'Email me a sign-in code')}
            </button>

            {codeSent && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <ResendTimer onResend={() => requestCode()} />
                </div>
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setCode(''); setError(''); }}
                  className="msp-auth-link"
                  style={{ color: C.t3, fontSize: 12.5, textAlign: 'center' }}
                >
                  Use a different email
                </button>
              </>
            )}

            {!codeSent && (
              <>
                <OrDivider />
                <GoogleButton label="Log in with Google" />
                <button
                  type="button"
                  onClick={() => { setMethod('password'); setError(''); }}
                  style={btnG({ width: '100%', justifyContent: 'center' })}
                >
                  Sign in with a password instead
                </button>
              </>
            )}

            {!codeSent && parentMode && (
              <div style={{ textAlign: 'center', fontSize: 12.5, color: C.t3, lineHeight: 1.55 }}>
                Not connected yet?{' '}
                <button type="button" onClick={() => onGoSignup(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontWeight: 600 }}>
                  Create a parent account
                </button>
                {' '}— or open the link your student sent you.
              </div>
            )}
          </div>
        </form>
      </>
    );
  }

  // ── The password branch ─────────────────────────────────────────────────
  return (
    <>
      <BackButton onClick={onBack} label={parentMode ? 'Back to the parent page' : 'Back to home'} />
      <form onSubmit={handleSubmit}>
        <div style={CC({ gap: 16 })}>
          <div>
            <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{heading}</div>
            <div style={{ fontSize: 13, color: C.t2 }}>{sub}</div>
          </div>

          <GoogleButton label="Log in with Google" />
          <OrDivider />

          {emailField}

          <div>
            <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button type="button" onClick={() => onGoForgot(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontSize: 12, fontWeight: 600 }}>Forgot password?</button>
            </div>
          </div>

          <FieldError>{error}</FieldError>
          {noPassword && (
            <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55 }}>
              This account signs in with an emailed code — we've switched the form over for you.
            </div>
          )}

          <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
            {busy ? 'Logging in…' : <>Log in <ArrowRight size={14} /></>}
          </button>

          {/*
            Always offered, not just in parentMode. An account with no password can land on this
            screen from a bookmark or a shared link, and without this the form is a dead end for
            them — the only visible alternative being "forgot password", which is the wrong story
            for someone who never had one.
          */}
          <button
            type="button"
            onClick={() => { setMethod('code'); setError(''); }}
            style={btnG({ width: '100%', justifyContent: 'center' })}
          >
            <KeyRound size={13} /> Email me a sign-in code instead
          </button>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: C.t3, marginTop: 4 }}>
            Don't have an account?{' '}
            <button type="button" onClick={() => onGoSignup(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontWeight: 600 }}>
              {parentMode ? 'Create a parent account' : 'Sign up'}
            </button>
          </div>

          {/*
            The parent's way out of the wrong screen.

            A parent who lands here — because /login is the URL everyone knows, or because their
            student sent them "just log in" — has no way to tell that a parent account is a
            different thing until they have already made a student one. This is one line and one
            link, on the screen where the confusion actually happens.
          */}
          {!parentMode && (
            <a
              href={PARENT_HUB_PATH}
              onClick={(e) => { if (onGoParents && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); onGoParents(); } }}
              style={{
                ...R({ gap: 8, alignItems: 'flex-start' }), textDecoration: 'none',
                padding: '12px 12px', borderRadius: 8,
                background: tint(C.violet, 0.07), border: `1px solid ${tint(C.violet, 0.26)}`,
              }}
            >
              <Users size={15} color={C.violetL} style={{ flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
                <strong style={{ color: C.t1 }}>Are you a parent?</strong> You get your own account
                and a dashboard for your student's progress — you never sign in as them.
                <span style={{ color: C.violetL, fontWeight: 600 }}> See how it works →</span>
              </span>
            </a>
          )}
        </div>
      </form>
    </>
  );
}
