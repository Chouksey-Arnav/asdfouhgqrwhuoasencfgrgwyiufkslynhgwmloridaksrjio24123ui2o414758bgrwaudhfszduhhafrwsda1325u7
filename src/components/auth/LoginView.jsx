import React, { useState } from 'react';
import { Mail, ArrowRight, Users, KeyRound, Loader2 } from 'lucide-react';
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
      onAuthed(token, user);
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
      await AuthAPI.sendSigninCode(trimmed);
      setCodeSent(true);
      toast.success('Code sent — check your inbox.');
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
      onAuthed(token, user);
    } catch (err) {
      // The one place the deliberate "we don't say whether this address has an account" policy
      // surfaces as confusion: the send succeeded, no mail arrived, and the code they eventually
      // guess at is wrong. Naming the likely cause costs nothing an attacker did not already know
      // by this point — they have already failed to produce a code.
      setError(err.message === 'Incorrect code. Please try again.'
        ? "That code isn't right. If no email arrived, there may be no account for this address yet."
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

  // ── The emailed-code branch ─────────────────────────────────────────────
  if (method === 'code') {
    return (
      <>
        <BackButton onClick={onBack} label={parentMode ? 'Back to the parent page' : 'Back to home'} />
        <form onSubmit={codeSent ? submitCode : requestCode}>
          <div style={CC({ gap: 16 })}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{heading}</div>
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
                {codeSent
                  ? <>Enter the 6-digit code we sent to <strong style={{ color: C.t1 }}>{email.trim()}</strong>.</>
                  : <>{sub} We'll email you a 6-digit code — no password needed.</>}
              </div>
            </div>

            {!codeSent && emailField}
            {codeSent && <OtpBoxes value={code} onChange={setCode} />}

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
              <div style={{ textAlign: 'center', fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
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
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{heading}</div>
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
            <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
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
                ...R({ gap: 9, alignItems: 'flex-start' }), textDecoration: 'none',
                padding: '11px 13px', borderRadius: 10,
                background: tint(C.violet, 0.07), border: `1px solid ${tint(C.violet, 0.26)}`,
              }}
            >
              <Users size={15} color={C.violetL} style={{ flexShrink: 0, marginTop: 1 }} />
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
