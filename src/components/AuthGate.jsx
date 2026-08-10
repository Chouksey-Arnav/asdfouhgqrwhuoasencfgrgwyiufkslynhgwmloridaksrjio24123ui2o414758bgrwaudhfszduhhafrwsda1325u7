import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { C, getStoredMode, storeMode, watchSystemTheme } from '../lib/theme';
import { loadA11y, applyA11y } from '../lib/a11y';
import { getToken, setToken, clearToken, fetchMe, logout } from '../lib/authApi';
import {
  AUTH_VIEWS, parseAuthPath, isAuthPath, normalizePath, parseLegalPath, isParentInvitePath,
  isParentHubPath, PARENT_HUB_PATH,
} from '../lib/routes';
import { applySeoMeta } from '../lib/seo';
import LandingPage from './LandingPage';
import LegalPage from './legal/LegalPage';
import AuthShell from './auth/AuthShell';
import LoginView from './auth/LoginView';
import SignupView from './auth/SignupView';
import ForgotPasswordView from './auth/ForgotPasswordView';
import OAuthCallbackView from './auth/OAuthCallbackView';
import ParentApp from './parent/ParentApp';
import InviteScreen from './parent/InviteScreen';
import ParentsLanding from './parent/ParentsLanding';
import { inviteTokenFromUrl } from '../lib/parentApi';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | signedOut | signedIn
  const [user, setUser] = useState(null);
  // The signed-out screens are addressable (/login, /signup, /forgot-password), so the
  // back button steps back through them the same way it steps through the app's tabs —
  // out of the login form to the landing page, not out of the site.
  const [view, setView] = useState(() => parseAuthPath(window.location.pathname) || 'landing');
  const [prefillEmail, setPrefillEmail] = useState('');
  // Set only by the invitation screen, which knows which kind of account the invite requires.
  const [prefillRole, setPrefillRole] = useState('student');
  // Where "landing" lives. Normally "/", but someone who followed a deep link while
  // signed out (e.g. /portfolio/essays) should keep that URL: it's what they'll be
  // dropped into the moment they sign in.
  const landingPathRef = useRef(
    isAuthPath(window.location.pathname) || isParentHubPath(window.location.pathname)
      ? '/'
      : normalizePath(window.location.pathname),
  );
  const firstSyncRef = useRef(true);

  // ── The legal documents sit outside the signed-in/signed-out split ────────
  //
  // Every other route in this app is gated one way or the other: a tab needs a
  // session, an auth screen needs the absence of one. The Terms and the Privacy
  // Policy need neither. They have to render the same for a signed-out visitor,
  // a signed-in student, a parent who was sent the link, and a crawler —
  // because a privacy policy you have to create an account to read is not
  // notice, and "agree to these Terms" above a link you cannot open until after
  // you have agreed is exactly the pattern that gets a clickwrap held
  // unenforceable.
  //
  // So this is checked before `status` is even consulted, and it listens to
  // popstate itself: the two effects further down bail out once signed in
  // (App.jsx owns the URL from then on), and without its own listener a back
  // press out of /legal/privacy would leave this component rendering the
  // document over an address bar that had already moved on.
  const [legalSlug, setLegalSlug] = useState(() => parseLegalPath(window.location.pathname));
  useEffect(() => {
    function onPop() { setLegalSlug(parseLegalPath(window.location.pathname)); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── /parents sits outside the split, for the same reason the documents do ─
  //
  // A parent deciding whether to create an account has to be able to read what the account does
  // before creating one, so the page cannot require a session. It equally cannot require the
  // ABSENCE of one: the most common way it gets opened is a student, signed in on the family
  // laptop, showing it to their mother. So it is checked ahead of `status`, exactly like the
  // Terms, and it owns its own popstate listener because the two view-sync effects below stop
  // running once App.jsx takes over the URL.
  const [parentHub, setParentHub] = useState(() => isParentHubPath(window.location.pathname));
  useEffect(() => {
    function onPop() { setParentHub(isParentHubPath(window.location.pathname)); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openParentHub = useCallback(() => {
    if (normalizePath(window.location.pathname) !== PARENT_HUB_PATH) {
      window.history.pushState({}, '', PARENT_HUB_PATH);
    }
    setParentHub(true);
    applySeoMeta(PARENT_HUB_PATH);
  }, []);

  // Leaving the hub for one of the auth screens: drop the hub first, or the effect that mirrors
  // `view` into the URL would fight the hub's own path and the screen would never appear.
  const leaveParentHub = useCallback((next) => {
    setParentHub(false);
    if (next) setView(next);
    else if (window.history.length > 1) window.history.back();
    else window.history.replaceState({}, '', '/');
  }, []);

  // ── An invitation link sits outside the split for the same reason ────────
  //
  // /parent-invite?token=… is opened by whoever the email reached: signed out, signed in as the
  // wrong account, signed in with the wrong role, or with no account at all. Every one of those
  // needs a different next step, and none of them is "the login screen" — so this is checked
  // ahead of `status` too, and the screen itself decides what to offer.
  //
  // It resolves once, from the URL this page loaded with, and is then cleared explicitly: the
  // token must not survive into the app the visitor lands in afterwards.
  const [inviteToken, setInviteToken] = useState(
    () => (isParentInvitePath(window.location.pathname) ? inviteTokenFromUrl() : null),
  );

  const openLegal = useCallback((path) => {
    window.history.pushState({}, '', path);
    setLegalSlug(parseLegalPath(path));
    applySeoMeta(path);
  }, []);

  const closeLegal = useCallback(() => {
    // Prefer a real back press so the student lands wherever they actually came
    // from — mid-signup, mid-lesson, or another site. Falling back to "/" only
    // when this page IS the history entry (someone opened the link directly).
    if (window.history.length > 1) window.history.back();
    else { window.history.replaceState({}, '', '/'); setLegalSlug(null); }
  }, []);

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

  // ── One theme, from the landing page all the way into the app ────────────
  //
  // This used to pin every signed-out surface to the Dark palette regardless of
  // what the student had chosen, on the reasoning that the marketing page was a
  // fixed-brand piece and nobody expresses a theme preference before they have
  // an account. Both halves of that turned out to be wrong in the same way.
  //
  // The visible symptom was the one users reported: a dark sign-up screen that
  // snapped to a completely different palette the instant the account was
  // created, because App.jsx then applied the real preference. A product that
  // changes its entire appearance at the exact moment you commit to it reads as
  // a bait and switch, whatever the palette. And the fix cannot be "pick a
  // nicer default", because the flip happens whenever the two ends disagree.
  //
  // So the signed-out surfaces now render in exactly the theme the app will
  // use, LandingPage and the auth screens are token-driven rather than
  // hard-coded dark, and the toggle in the nav lets a visitor change it before
  // they have an account — the preference is stored under the same key App.jsx
  // reads, so whatever they picked out here follows them in. The theme changes
  // when the student changes it, and at no other moment.
  const preAuth = status !== 'signedIn';
  const [themeMode, setThemeMode] = useState(() => getStoredMode());

  // Coming back out of the app (sign out), the stored preference is the source
  // of truth — the student may have changed it in Settings while signed in.
  useEffect(() => { if (preAuth) setThemeMode(getStoredMode()); }, [preAuth]);

  // Applying a theme MUTATES the shared `C` token object (see the header of
  // lib/theme.js), which inline styles from an already-committed render cannot
  // observe. So the apply happens in an effect and bumps an epoch, and the
  // epoch keys the pre-auth tree — the same two-pass dance App.jsx does.
  const [themeEpoch, setThemeEpoch] = useState(0);
  const appliedRef = useRef(null);
  useEffect(() => {
    if (!preAuth) return undefined;
    const apply = () => {
      // The full a11y set, not just the palette: high contrast, the readable
      // typeface and the interface scale are exactly as relevant to reading a
      // sign-up form as to reading a lesson.
      const resolved = applyA11y({ ...loadA11y(), themeMode });
      if (appliedRef.current !== resolved) { appliedRef.current = resolved; setThemeEpoch(e => e + 1); }
    };
    apply();
    if (themeMode !== 'system') return undefined;
    return watchSystemTheme(apply);
  }, [preAuth, themeMode]);

  const changeTheme = useCallback((mode) => {
    storeMode(mode);   // the key App.jsx's loadA11y() reads, so the choice carries in
    setThemeMode(mode);
  }, []);

  // ── view → URL ────────────────────────────────────────────────────────────
  // Same invariant the app-side router uses (src/lib/useAppRouter.js): push only when
  // the address bar disagrees with the state, so a back press can never bounce forward.
  // Once signed in, App.jsx owns the URL and this stops touching it.
  useEffect(() => {
    if (status === 'signedIn') return;
    // While a legal document is open the URL is /legal/…, which is not this
    // component's `view` — syncing would immediately rewrite it back to the
    // landing page and slam the document shut.
    if (legalSlug || parentHub) return;
    const current = normalizePath(window.location.pathname);
    const want = view === 'landing'
      ? (isAuthPath(current) ? landingPathRef.current : current)
      : AUTH_VIEWS[view];
    const first = firstSyncRef.current;
    firstSyncRef.current = false;
    applySeoMeta(want);
    if (current === want) return;
    if (first) window.history.replaceState(window.history.state, '', want);
    else window.history.pushState({}, '', want);
  }, [view, status, legalSlug, parentHub]);

  // ── URL → view ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'signedIn') return undefined;
    function onPop() { setView(parseAuthPath(window.location.pathname) || 'landing'); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [status]);

  function handleAuthed(token, authedUser) {
    setToken(token);
    setUser(authedUser);
    setStatus('signedIn');
  }

  function goTo(nextView, email = '', role = 'student') {
    setPrefillEmail(email);
    setPrefillRole(role);
    setView(nextView);
  }

  // Ahead of the `checking` spinner too: the documents do not depend on knowing
  // who you are, so there is no reason to make anyone wait on a session probe
  // to read them.
  if (legalSlug) {
    return <LegalPage slug={legalSlug} onBack={closeLegal} onNavigate={openLegal} />;
  }

  if (parentHub) {
    return (
      <ParentsLanding
        key={themeEpoch}
        onSignUp={() => leaveParentHub('parentSignup')}
        onLogin={() => leaveParentHub('parentLogin')}
        onHome={() => { setParentHub(false); window.history.pushState({}, '', '/'); setView('landing'); }}
        onOpenLegal={openLegal}
        themeMode={themeMode}
        onThemeChange={changeTheme}
      />
    );
  }

  if (status === 'checking') {
    return (
      <div style={{ height: 'var(--msp-vh)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <Loader2 className="spin" size={22} color={C.blueL} />
      </div>
    );
  }

  if (inviteToken) {
    return (
      <InviteScreen
        token={inviteToken}
        user={status === 'signedIn' ? user : null}
        onDone={() => { setInviteToken(null); restore(); }}
        onSignIn={(email) => { setInviteToken(null); goTo('login', email); }}
        onSignUp={(email, role) => { setInviteToken(null); goTo('signup', email, role); }}
        onSignOut={async () => {
          // Deliberately keeps the invite screen mounted rather than dropping the visitor at the
          // login page: they came here to answer an invitation, and the screen re-renders with
          // the signed-out branch, which offers exactly the two next steps they need.
          try { await logout(); } catch { clearToken(); }
          setUser(null);
          setStatus('signedOut');
        }}
      />
    );
  }

  if (status === 'signedIn') {
    // A parent account renders an entirely different application — it owns no progress, no local
    // database, and none of the student app's subsystems mean anything for it. See ParentApp.
    if (user?.role === 'parent') {
      return <ParentApp user={user} onSignedOut={() => { setUser(null); setStatus('signedOut'); setView('landing'); }} />;
    }
    // `openLegal` goes down to App so the in-app footer can open the documents
    // without a full page load, keeping the student's place in the app.
    return children({ user, setUser, openLegal });
  }

  if (view === 'landing') {
    return (
      <LandingPage
        key={themeEpoch}
        onGetStarted={() => goTo('signup')}
        onLogin={() => goTo('login')}
        onOpenParents={openParentHub}
        onOpenLegal={openLegal}
        themeMode={themeMode}
        onThemeChange={changeTheme}
      />
    );
  }

  return (
    <AuthShell key={`${view}-${themeEpoch}`} themeMode={themeMode} onThemeChange={changeTheme}>
      {(view === 'login' || view === 'parentLogin') && (
        <LoginView
          initialEmail={prefillEmail}
          parentMode={view === 'parentLogin'}
          onBack={() => (view === 'parentLogin' ? openParentHub() : goTo('landing'))}
          onGoSignup={(email) => goTo(view === 'parentLogin' ? 'parentSignup' : 'signup', email)}
          onGoForgot={(email) => goTo('forgot', email)}
          onGoParents={openParentHub}
          onAuthed={(token, u) => { handleAuthed(token, u); toast.success('Welcome back.'); }}
        />
      )}
      {(view === 'signup' || view === 'parentSignup') && (
        <SignupView
          initialEmail={prefillEmail}
          // /parents/signup is the parent's own front door, so the account type is decided by the
          // URL rather than by finding a radio button — see `lockedRole` in SignupView. A parent
          // who followed a "for parents" link should never be able to create a student account by
          // accident and then discover, three screens later, that it cannot see anything.
          initialRole={view === 'parentSignup' ? 'parent' : prefillRole}
          lockedRole={view === 'parentSignup' ? 'parent' : null}
          onBack={() => (view === 'parentSignup' ? openParentHub() : goTo('landing'))}
          onGoLogin={(email) => goTo(view === 'parentSignup' ? 'parentLogin' : 'login', email || prefillEmail)}
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
      {view === 'oauth' && (
        <OAuthCallbackView
          onBack={() => goTo('login')}
          onAuthed={(token, u) => { handleAuthed(token, u); toast.success('Welcome back.'); }}
        />
      )}
    </AuthShell>
  );
}
