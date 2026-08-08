// Shared building blocks for the login / signup / forgot-password screens.
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { C, inp, lbl } from '../../lib/theme';
import { LEGAL_VIEWS } from '../../lib/routes';
import { LEGAL } from '../../legal/legalConfig';

export const PASSWORD_MIN = 8;

// Mirrors api/_lib/password.js#validatePassword — keep both in sync.
export function passwordError(password) {
  if (!password) return 'Password is required.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > 128) return 'Password must be under 128 characters.';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}

export function passwordChecklist(password) {
  return [
    { label: 'At least 8 characters', met: password.length >= PASSWORD_MIN },
    { label: 'A letter and a number', met: /[a-zA-Z]/.test(password) && /[0-9]/.test(password) },
    { label: 'A symbol or extra length (recommended)', met: /[^a-zA-Z0-9]/.test(password) || password.length >= 12 },
  ];
}

function passwordScore(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN) score++;
  if (password.length >= 12) score++;
  if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

// Built per call, never as a module-level literal: a frozen literal would
// snapshot whichever palette happened to be loaded at import time and would
// then ignore every theme change. See the header note in lib/theme.js.
const strengthMeta = (score) => [
  { label: 'Too short', color: C.t4 },
  { label: 'Weak', color: C.roseL },
  { label: 'Fair', color: C.amberL },
  { label: 'Good', color: C.blueL },
  { label: 'Strong', color: C.greenL },
][score];

export function PasswordStrengthMeter({ password }) {
  const score = passwordScore(password);
  const meta = strengthMeta(score);
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < score ? meta.color : C.b1, transition: 'background .2s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: meta.color, marginTop: 5, fontWeight: 600 }}>{meta.label}</div>
    </div>
  );
}

export function PasswordChecklist({ password }) {
  const items = passwordChecklist(password);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: item.met ? C.greenL : C.t3 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${item.met ? C.greenL : C.t4}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {item.met && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.greenL }} />}
          </span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function PasswordField({ label = 'Password', value, onChange, placeholder = 'Enter your password', autoFocus, autoComplete = 'current-password', error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label style={lbl()}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          autoFocus={autoFocus}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={inp({ paddingRight: 40, borderColor: error ? `${C.rose}80` : undefined })}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 4 }}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

// Six segmented boxes for a numeric OTP. Supports typing, backspace navigation, and
// pasting the full code into any box.
export function OtpBoxes({ value, onChange, autoFocus = true }) {
  const refs = useRef([]);
  const digits = value.split('');
  while (digits.length < 6) digits.push('');

  function setDigit(i, v) {
    const next = digits.slice();
    next[i] = v;
    onChange(next.join('').slice(0, 6));
  }

  function handleChange(i, raw) {
    const v = raw.replace(/\D/g, '');
    if (!v) { setDigit(i, ''); return; }
    if (v.length > 1) {
      // Handles pasting a full code into a single box.
      const chars = v.slice(0, 6 - i).split('');
      const next = digits.slice();
      chars.forEach((c, j) => { next[i + j] = c; });
      onChange(next.join('').slice(0, 6));
      const target = Math.min(i + chars.length, 5);
      refs.current[target]?.focus();
      return;
    }
    setDigit(i, v);
    if (i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="msp-otp-box"
          style={inp({
            width: '100%', textAlign: 'center', padding: '12px 0', fontSize: 20, fontWeight: 700,
            fontFamily: C.FM, letterSpacing: 0,
          })}
        />
      ))}
    </div>
  );
}

// "Resend code" link that disables itself for `seconds` after (re)starting.
export function ResendTimer({ onResend, busy, seconds = 60 }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  async function handleClick() {
    if (remaining > 0 || busy) return;
    await onResend();
    setRemaining(seconds);
  }

  return (
    <button type="button" onClick={handleClick} disabled={remaining > 0 || busy} className="msp-auth-link" style={{ color: remaining > 0 ? C.t3 : C.blueL, fontSize: 12.5, fontWeight: 600, cursor: remaining > 0 ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {busy && <Loader2 className="spin" size={12} />}
      {remaining > 0 ? `Resend code in 0:${String(remaining).padStart(2, '0')}` : 'Resend code'}
    </button>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 12, color: C.roseL, lineHeight: 1.4 }}>{children}</div>;
}

// "or" rule between the OAuth button and the email/password form.
export function OrDivider({ label = 'or' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: C.b1 }} />
      <span style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.b1 }} />
    </div>
  );
}

/**
 * The consent line that turns "Create account" into an agreement.
 *
 * Rendered directly above whichever control actually creates the account —
 * the password submit and the "Sign up with Google" button — because that
 * adjacency is what a court looks for when deciding whether a clickwrap gave
 * reasonable notice. Terms reachable only from a page footer, or behind an
 * unlabelled icon, have repeatedly failed that test.
 *
 * The second sentence is not decoration either. Almost every user of this app
 * is a minor, and a contract with a minor is voidable — so the Terms make the
 * parent or guardian the contracting party for anyone under 18 (see
 * src/legal/terms.js § 1). This is where that structure is actually put to the
 * student, at the moment they act.
 *
 * Links open in a new tab so that reading the documents never costs a
 * half-finished signup — a user who loses their progress for reading the terms
 * learns not to read the terms.
 */
export function ConsentNotice() {
  const link = { color: C.blueL, fontWeight: 600, textDecoration: 'underline' };
  return (
    <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: C.t3 }}>
      By creating an account you agree to our{' '}
      <a href={LEGAL_VIEWS.terms} target="_blank" rel="noopener noreferrer" style={link}>Terms of Service</a>
      {' '}and{' '}
      <a href={LEGAL_VIEWS.privacy} target="_blank" rel="noopener noreferrer" style={link}>Privacy Policy</a>.
      {' '}You must be at least {LEGAL.minAge}. If you are under {LEGAL.minorAge}, a parent or
      guardian must read and agree to them with you.
    </p>
  );
}

export function BackButton({ onClick, label = 'Back' }) {
  return (
    <button type="button" onClick={onClick} className="msp-auth-link" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.t3, fontSize: 12, marginBottom: 18 }}>
      <ArrowLeft size={13} /> {label}
    </button>
  );
}
