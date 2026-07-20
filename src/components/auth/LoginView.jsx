import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { C, btn, inp, lbl, CC } from '../../lib/theme';
import * as AuthAPI from '../../lib/authApi';
import { PasswordField, FieldError, BackButton } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginView({ initialEmail = '', onBack, onGoSignup, onGoForgot, onAuthed }) {
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
      <BackButton onClick={onBack} label="Back to home" />
      <form onSubmit={handleSubmit}>
        <div style={CC({ gap: 16 })}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>Log in</div>
            <div style={{ fontSize: 13, color: C.t2 }}>Welcome back — enter your email and password.</div>
          </div>

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
            <button type="button" onClick={() => onGoSignup(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontWeight: 600 }}>Sign up</button>
          </div>
        </div>
      </form>
    </>
  );
}
