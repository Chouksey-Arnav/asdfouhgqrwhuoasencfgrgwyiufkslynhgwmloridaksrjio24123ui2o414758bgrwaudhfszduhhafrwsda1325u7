import React, { useState } from 'react';
import { C, CONTROL_TRANSITION } from '../../lib/theme';
import { signInWithGoogle, GOOGLE_OAUTH_CONFIGURED } from '../../lib/supabaseClient';
import { stashPendingRole } from '../../lib/authApi';
import { FieldError } from './ui';

function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18A13.94 13.94 0 0 1 10.9 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.94 21.94 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

// "Continue with Google" button, dropped into LoginView and SignupView. Kicks off
// supabase.auth.signInWithOAuth and lets the browser navigate to Google — the rest of
// the flow is picked up by OAuthCallbackView on the way back in.
export default function GoogleButton({ label = 'Continue with Google', role = null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setError('');
    if (!GOOGLE_OAUTH_CONFIGURED) {
      setError('Google sign-in is not set up for this environment yet.');
      return;
    }
    setBusy(true);
    try {
      // The browser leaves the app entirely here, so the account-type choice cannot live in React
      // state — it is parked in sessionStorage and picked back up by OAuthCallbackView.
      if (role) stashPendingRole(role);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="msp-google-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.b2}`,
          background: C.surf2, color: C.t1, fontWeight: 600, fontSize: 13, fontFamily: C.FB,
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, transition: CONTROL_TRANSITION,
        }}
      >
        <GoogleG />
        {busy ? 'Redirecting…' : label}
      </button>
      {error && <div style={{ marginTop: 8 }}><FieldError>{error}</FieldError></div>}
    </div>
  );
}
