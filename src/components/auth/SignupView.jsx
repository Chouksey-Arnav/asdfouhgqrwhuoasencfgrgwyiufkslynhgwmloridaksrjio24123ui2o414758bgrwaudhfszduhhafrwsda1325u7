import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { C, btn, inp, lbl, CC } from '../../lib/theme';
import * as AuthAPI from '../../lib/authApi';
import { OtpBoxes, ResendTimer, PasswordField, PasswordStrengthMeter, PasswordChecklist, passwordError, FieldError, BackButton, OrDivider } from './ui';
import GoogleButton from './GoogleButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export default function SignupView({ initialEmail = '', onBack, onGoLogin, onAuthed }) {
  const [step, setStep] = useState('email'); // email | code | password
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingAccount, setExistingAccount] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setExistingAccount(false);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError('Enter a valid email address.');

    setBusy(true);
    try {
      await AuthAPI.sendSignupCode(trimmed);
      setStep('code');
      toast.success('Code sent — check your inbox.');
    } catch (err) {
      setError(err.message);
      if (err.message.includes('already exists')) setExistingAccount(true);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    try {
      await AuthAPI.sendSignupCode(email.trim());
      toast.success('New code sent.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (!CODE_RE.test(code)) return setError('Enter the 6-digit code.');

    setBusy(true);
    try {
      const { verificationToken } = await AuthAPI.verifySignupCode(email.trim(), code);
      setVerificationToken(verificationToken);
      setStep('password');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePassword(e) {
    e.preventDefault();
    setError('');
    const pwErr = passwordError(password);
    if (pwErr) return setError(pwErr);
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const { token, user } = await AuthAPI.completeSignup(email.trim(), verificationToken, password);
      toast.success('Account created.');
      onAuthed(token, user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackButton onClick={step === 'email' ? onBack : () => { setStep('email'); setError(''); }} label={step === 'email' ? 'Back to home' : 'Use a different email'} />
      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.form key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSendCode}>
            <div style={CC({ gap: 16 })}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>Create your account</div>
                <div style={{ fontSize: 13, color: C.t2 }}>We'll email you a 6-digit code to verify it's really you.</div>
              </div>
              <GoogleButton label="Sign up with Google" />
              <OrDivider />
              <div>
                <label style={lbl()}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color={C.t3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inp({ paddingLeft: 36 })} />
                </div>
              </div>
              <FieldError>{error}</FieldError>
              {existingAccount && (
                <button type="button" onClick={() => onGoLogin(email.trim())} style={{ ...btn(C.blueGrad, { width: '100%' }) }}>Log in instead <ArrowRight size={14} /></button>
              )}
              <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
                {busy ? 'Sending…' : <>Continue <ArrowRight size={14} /></>}
              </button>
              <div style={{ textAlign: 'center', fontSize: 12.5, color: C.t3 }}>
                Already have an account?{' '}
                <button type="button" onClick={() => onGoLogin(email.trim())} className="msp-auth-link" style={{ color: C.blueL, fontWeight: 600 }}>Log in</button>
              </div>
            </div>
          </motion.form>
        )}

        {step === 'code' && (
          <motion.form key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleVerify}>
            <div style={CC({ gap: 18 })}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>Check your inbox</div>
                <div style={{ fontSize: 13, color: C.t2 }}>Enter the 6-digit code sent to <strong style={{ color: C.t1 }}>{email}</strong></div>
              </div>
              <OtpBoxes value={code} onChange={setCode} />
              <FieldError>{error}</FieldError>
              <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
                {busy ? 'Verifying…' : <>Verify code <ArrowRight size={14} /></>}
              </button>
              <div style={{ textAlign: 'center' }}>
                <ResendTimer onResend={resendCode} />
              </div>
            </div>
          </motion.form>
        )}

        {step === 'password' && (
          <motion.form key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleCreatePassword}>
            <div style={CC({ gap: 16 })}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>Create a password</div>
                <div style={{ fontSize: 13, color: C.t2 }}>Email verified. Now set a password to finish creating your account.</div>
              </div>
              <div>
                <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Create a password" autoFocus />
                <PasswordStrengthMeter password={password} />
                <PasswordChecklist password={password} />
              </div>
              <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Re-enter your password" />
              <FieldError>{error}</FieldError>
              <button type="submit" disabled={busy} style={btn(C.blueGrad, { width: '100%', opacity: busy ? 0.7 : 1 })}>
                {busy ? 'Creating account…' : <>Create account <ArrowRight size={14} /></>}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}
