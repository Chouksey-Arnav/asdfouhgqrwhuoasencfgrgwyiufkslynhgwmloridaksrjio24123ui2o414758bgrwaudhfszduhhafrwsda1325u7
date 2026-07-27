import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { C, applyTheme, getStoredMode } from '../lib/theme';
import { getToken, setToken, clearToken, fetchMe } from '../lib/authApi';
import LandingPage from './LandingPage';
import AuthShell from './auth/AuthShell';
import LoginView from './auth/LoginView';
import SignupView from './auth/SignupView';
import ForgotPasswordView from './auth/ForgotPasswordView';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); // landing | login | signup | forgot
  const [prefillEmail, setPrefillEmail] = useState('');

  const restore = useCallback(async () => {
    if (!getToken()) { setStatus('signedOut'); return; }
    try {
      const { user } = await fetchMe();
      setUser(user);
      setStatus('signedIn');
    } catch {
      clearToken();
      setStatus('signedOut');
    }
  }, []);

  useEffect(() => { restore(); }, [restore]);

  // ── The signed-out surfaces stay dark, whatever theme is stored ──────────
  //
  // Light mode is an APP setting, not a site-wide one. The landing page and the
  // auth screens are a fixed-brand marketing piece: a dark hero with gradient
  // headline text (WebkitTextFillColor: transparent over a light-on-dark
  // gradient), a dark navigation bar, and a dark product mockup that is
  // deliberately a picture of the app rather than the page's own chrome. Run
  // that through the light palette and the headline renders near-white on
  // near-white and the secondary call-to-action disappears entirely — which is
  // exactly what happened before this existed.
  //
  // Making 1,200 lines of marketing markup theme-aware would be a real project
  // for no user benefit: nobody has expressed a theme preference before they
  // have an account, and the stored one is very often just the default. So the
  // pre-auth surfaces pin to dark, and the student's actual preference is
  // reapplied by App.jsx the moment they are signed in.
  const preAuth = status !== 'signedIn';
  useEffect(() => {
    if (preAuth) applyTheme('dark');
    // Signing in remounts App, whose own effect applies the stored preference,
    // so there is nothing to restore here — but a student who signs OUT stays
    // on this page, and should see it in the brand's dark, not their light.
    return () => { if (preAuth) applyTheme(getStoredMode()); };
  }, [preAuth]);

  function handleAuthed(token, authedUser) {
    setToken(token);
    setUser(authedUser);
    setStatus('signedIn');
  }

  function goTo(nextView, email = '') {
    setPrefillEmail(email);
    setView(nextView);
  }

  if (status === 'checking') {
    return (
      <div style={{ height: 'var(--msp-vh)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <Loader2 className="spin" size={22} color={C.blueL} />
      </div>
    );
  }

  if (status === 'signedIn') {
    return children({ user, setUser });
  }

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => goTo('signup')} onLogin={() => goTo('login')} />;
  }

  return (
    <AuthShell key={view}>
      {view === 'login' && (
        <LoginView
          initialEmail={prefillEmail}
          onBack={() => goTo('landing')}
          onGoSignup={(email) => goTo('signup', email)}
          onGoForgot={(email) => goTo('forgot', email)}
          onAuthed={(token, u) => { handleAuthed(token, u); toast.success('Welcome back.'); }}
        />
      )}
      {view === 'signup' && (
        <SignupView
          initialEmail={prefillEmail}
          onBack={() => goTo('landing')}
          onGoLogin={(email) => goTo('login', email || prefillEmail)}
          onAuthed={handleAuthed}
        />
      )}
      {view === 'forgot' && (
        <ForgotPasswordView
          initialEmail={prefillEmail}
          onBack={() => goTo('login', prefillEmail)}
          onAuthed={handleAuthed}
        />
      )}
    </AuthShell>
  );
}
