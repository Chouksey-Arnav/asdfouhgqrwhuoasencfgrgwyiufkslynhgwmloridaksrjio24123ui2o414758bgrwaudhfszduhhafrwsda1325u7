// Rendered at /auth/callback, the redirectTo target GoogleButton sends the browser to.
// supabase-js (detectSessionInUrl: true, see src/lib/supabaseClient.js) parses the
// OAuth response off the URL on its own and fires onAuthStateChange — we just wait for
// that, then hand the resulting Supabase access token to /api/auth/google to mint this
// app's own session token, exactly like every other sign-in path does.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { C, btn } from '../../lib/theme';
import { supabase } from '../../lib/supabaseClient';
import * as AuthAPI from '../../lib/authApi';

const TIMEOUT_MS = 15000;

export default function OAuthCallbackView({ onAuthed, onBack }) {
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) { setError(oauthError.replace(/\+/g, ' ')); return; }

    if (!supabase) { setError('Google sign-in is not set up for this environment yet.'); return; }

    let settled = false;
    async function finish(session) {
      if (settled || !session) return;
      settled = true;
      try {
        const { token, user } = await AuthAPI.googleAuth(session.access_token);
        onAuthed(token, user);
      } catch (err) {
        settled = false;
        setError(err.message || 'Could not complete Google sign-in.');
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) finish(data.session);
    });

    const timeout = setTimeout(() => {
      if (!settled) setError('Google sign-in timed out. Please try again.');
    }, TIMEOUT_MS);

    return () => { listener?.subscription?.unsubscribe(); clearTimeout(timeout); };
  }, [onAuthed]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <AlertTriangle size={22} color={C.roseL} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, marginBottom: 6 }}>Sign-in didn't go through</div>
        <div style={{ fontSize: 12.5, color: C.t2, marginBottom: 20, lineHeight: 1.5 }}>{error}</div>
        <button type="button" onClick={onBack} style={btn(C.blueGrad, { width: '100%' })}>Back to log in</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <Loader2 className="spin" size={22} color={C.blueL} />
      <div style={{ fontSize: 13, color: C.t2 }}>Finishing sign-in with Google…</div>
    </div>
  );
}
