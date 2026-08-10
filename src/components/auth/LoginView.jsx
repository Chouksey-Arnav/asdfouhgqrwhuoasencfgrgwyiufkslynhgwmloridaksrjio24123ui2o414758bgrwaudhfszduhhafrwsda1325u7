import React, { useState } from 'react';
import { Mail, ArrowRight, Users } from 'lucide-react';
import { C, btn, inp, lbl, CC, R, tint } from '../../lib/theme';
import { PARENT_HUB_PATH } from '../../lib/routes';
import * as AuthAPI from '../../lib/authApi';
import { PasswordField, FieldError, BackButton, OrDivider } from './ui';
import GoogleButton from './GoogleButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {boolean} parentMode  true at /parents/login — same form, addressed to a parent, and
 *   without the "are you in the right place?" prompt that the general screen carries.
 */
export default function LoginView({ initialEmail = '', parentMode = false, onBack, onGoSignup, onGoForgot, onGoParents, onAuthed }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noPassword, setNoPassword] = useState(false);

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
      if (err.data?.noPassword) setNoPassword(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackButton onClick={onBack} label={parentMode ? 'Back to the parent page' : 'Back to home'} />
      <form onSubmit={handleSubmit}>
        <div style={CC({ gap: 16 })}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>
              {parentMode ? 'Parent sign-in' : 'Log in'}
            </div>
            <div style={{ fontSize: 13, color: C.t2 }}>
              {parentMode
                ? 'Sign in with your own parent account — the email you created it with, not your student\'s.'
                : 'Welcome back — enter your email and password.'}
            </div>
          </div>

          <GoogleButton label="Log in with Google" />
          <OrDivider />

          <div>
            <label style={lbl()}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inp({ paddingLeft: 36 })} />
            </div>
          </div>

          <div>
            <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button type="button" onClick={() => onGoForgot(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontSize: 12, fontWeight: 600 }}>Forgot password?</button>
            </div>
          </div>

          <FieldError>{error}</FieldError>
          {noPassword && (
            <button type="button" onClick={() => onGoForgot(email.trim())} style={{ ...btn(C.blueGrad, { width: '100%', opacity: 0.92 }) }}>
              Set a password <ArrowRight size={14} />
            </button>
          )}

          <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
            {busy ? 'Logging in…' : <>Log in <ArrowRight size={14} /></>}
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
