import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { C } from '../lib/theme';
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
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
          onGoLogin={() => goTo('login', prefillEmail)}
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
