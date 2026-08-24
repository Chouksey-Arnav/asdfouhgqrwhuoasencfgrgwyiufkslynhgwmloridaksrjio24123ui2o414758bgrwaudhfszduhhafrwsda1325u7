import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { C, tint, getStoredMode, storeMode, watchSystemTheme } from '../lib/theme';
import { loadA11y, applyA11y } from '../lib/a11y';
import { getToken, setToken, clearToken, fetchMe, logout, revokeSession } from '../lib/authApi';
import {
  AUTH_VIEWS, parseAuthPath, isAuthPath, normalizePath, parseLegalPath, isParentInvitePath,
  isParentHubPath, isParentPath, PARENT_HUB_PATH,
} from '../lib/routes';
import { applySeoMeta } from '../lib/seo';
// Which landing page a signed-out visitor gets is one constant, in one file:
// src/components/landing/landingVersions.js. v1 (./LandingPage) is still in the
// tree and still compiles; it is simply not the active version. Nothing in this
// component knows or cares which one it rendered.
import { ActiveLandingPage } from './landing/landingVersions';
import LegalPage from './legal/LegalPage';
import { BrandLoaderScreen } from './BrandJourney';
import AuthShell from './auth/AuthShell';
import LoginView from './auth/LoginView';
import SignupView from './auth/SignupView';
import ForgotPasswordView from './auth/ForgotPasswordView';
import OAuthCallbackView from './auth/OAuthCallbackView';
import ParentApp from './parent/ParentApp';
import InviteScreen from './parent/InviteScreen';
import ParentsLanding from './parent/ParentsLanding';
import { inviteFromUrl } from '../lib/parentApi';

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
      || isParentPath(window.location.pathname)
      ? '/'
      : normalizePath(window.location.pathname),
  );
  const firstSyncRef = useRef(true);

  // ── A parent's own deep link, held across the sign-in ─────────────────────
  //
  // /family/* is the parent application, and it was the one family of URLs this component had no
  // answer for while signed out. A parent who bookmarked their dashboard — or their child's page,
  // which is the whole reason those pages have URLs — came back after their session lapsed and got
  // the student MARKETING page, rendered underneath their own /family address. Signing out of the
  // dashboard did the same thing, for the same reason: `view` fell back to 'landing' and the sync
  // below kept whatever path was in the bar. Nothing was broken in a way anybody could report; it
  // simply looked like the dashboard had ceased to exist.
  //
  // So a parent path while signed out means the parent sign-in screen, and the path is kept here
  // so they land back on the exact page they asked for rather than on the dashboard root.
  const parentReturnRef = useRef(
    isParentPath(window.location.pathname) ? normalizePath(window.location.pathname) : null,
  );

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
  const [invite, setInvite] = useState(
    () => (isParentInvitePath(window.location.pathname) ? inviteFromUrl() : { token: null, code: null }),
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

  // Runs the moment the session probe comes back empty, and only while `view` is still the default
  // — so it redirects the parent who arrived at /family, and never overrides a screen they have
  // since navigated to themselves.
  useEffect(() => {
    if (status !== 'signedOut' || !parentReturnRef.current) return;
    setView((current) => (current === 'landing' ? 'parentLogin' : current));
  }, [status]);

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

  // ── The parent's front door is not a signed-out surface ───────────────────
  //
  // This is the bug that made the whole feature look broken. /parents renders for anybody (see
  // above), but the two buttons on it — "Create a parent account" and "I already have one" — set
  // `view` and then fell straight through to the `status === 'signedIn'` branch below, which
  // renders the STUDENT app. So the overwhelmingly common way this page is read in real life —
  // a student, signed in on the family laptop, showing it to their mother — ended with the
  // mother tapping "Create a parent account" and landing on her child's dashboard. Same for
  // typing /parents/login by hand, and same for the link in the invitation email.
  //
  // A parent auth screen belongs to a DIFFERENT PERSON than whoever the browser happens to be
  // signed in as, so it renders regardless of the session, exactly like the invitation screen
  // and the legal documents. The one exception is a parent who is already signed in as a parent:
  // for them there is nothing to sign into, and they are sent on to their dashboard.
  const parentAuthView = view === 'parentSignup' || view === 'parentLogin';
  const signedInRole = status === 'signedIn' ? (user?.role === 'parent' ? 'parent' : 'student') : null;
  // True when the parent door is open over somebody else's session. While it is, this component
  // — not App.jsx — still owns the address bar, or the URL would stay stuck on whatever page the
  // button was pressed from and a back press would land nowhere.
  const parentDoorOverSession = parentAuthView && signedInRole === 'student';
  const ownsUrl = status !== 'signedIn' || parentDoorOverSession;

  // ── view → URL ────────────────────────────────────────────────────────────
  // Same invariant the app-side router uses (src/lib/useAppRouter.js): push only when
  // the address bar disagrees with the state, so a back press can never bounce forward.
  // Once signed in, App.jsx owns the URL and this stops touching it.
  useEffect(() => {
    // Spent on the first run of this effect whatever that run decides to do, because what it
    // guards is "is this the initial mount" and not "is this the first URL we wrote". Consumed
    // below the early returns, it survived them: a visitor who lands on /parents (where the hub
    // branch returns immediately) and then presses a button would have their FIRST real
    // navigation treated as the mount and replaced into history rather than pushed — so the back
    // button skipped straight past the page they came from.
    const first = firstSyncRef.current;
    firstSyncRef.current = false;

    if (!ownsUrl) return;
    // While a legal document is open the URL is /legal/…, which is not this
    // component's `view` — syncing would immediately rewrite it back to the
    // landing page and slam the document shut.
    if (legalSlug || parentHub) return;
    const current = normalizePath(window.location.pathname);
    const want = view === 'landing'
      ? (isAuthPath(current) ? landingPathRef.current : current)
      : AUTH_VIEWS[view];
    applySeoMeta(want);
    if (current === want) return;
    if (first) window.history.replaceState(window.history.state, '', want);
    else window.history.pushState({}, '', want);
  }, [view, status, legalSlug, parentHub, ownsUrl]);

  // ── URL → view ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ownsUrl) return undefined;
    function onPop() { setView(parseAuthPath(window.location.pathname) || 'landing'); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [ownsUrl]);

  function handleAuthed(token, authedUser) {
    setToken(token);
    setUser(authedUser);
    setStatus('signedIn');
  }

  /**
   * A parent signing in over a session that belongs to somebody else — the family laptop case.
   *
   * The browser holds exactly one session token, so the arriving one replaces the outgoing one
   * whatever we do here. What we can control is the row on the server: the outgoing session is
   * ended explicitly rather than left orphaned, so a student who hands their laptop to a parent
   * is signed out of THIS browser and nowhere else (a session is per-token — their phone is
   * untouched). Fire and forget: it must never delay or fail the sign-in the parent is mid-way
   * through, and a token nobody holds any more is harmless if the call does not land.
   */
  function handleAuthedOverSession(token, authedUser) {
    const outgoing = getToken();
    handleAuthed(token, authedUser);
    // After the swap, and with the outgoing token named explicitly — `logout()` would both send
    // whichever token storage holds by then (the new one) and clear it on the way out. See
    // revokeSession.
    if (outgoing && outgoing !== token) revokeSession(outgoing).catch(() => {});
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
    // A full-screen wait with nothing else on it — the brand journey belongs
    // here rather than a spinner. See src/components/BrandJourney.jsx.
    return <BrandLoaderScreen caption="Checking your session…" size={200} />;
  }

  if (invite.token || invite.code) {
    const clearInvite = () => setInvite({ token: null, code: null });
    return (
      <InviteScreen
        token={invite.token}
        code={invite.code}
        user={status === 'signedIn' ? user : null}
        // The claim flow signs the parent in itself — it creates the account, mints the session
        // and accepts the invitation in one request — so it hands the session straight back here
        // rather than sending anyone to a login form they have no password for.
        onAuthed={(token, authedUser) => { clearInvite(); handleAuthed(token, authedUser); }}
        onDone={() => { clearInvite(); restore(); }}
        onSignIn={(email) => { clearInvite(); goTo('login', email); }}
        onSignUp={(email, role) => { clearInvite(); goTo('signup', email, role); }}
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

  // `parentDoorOverSession` deliberately falls THROUGH this branch to the auth shell at the
  // bottom of the file: the person at the keyboard is not the person the session belongs to.
  if (status === 'signedIn' && !parentDoorOverSession) {
    // A parent account renders an entirely different application — it owns no progress, no local
    // database, and none of the student app's subsystems mean anything for it. See ParentApp.
    if (user?.role === 'parent') {
      return (
        <ParentApp
          user={user}
          // The page they were actually asking for before the session check bounced them to
          // sign-in. Consumed by ParentApp on mount and then forgotten, so a later sign-out and
          // sign-in as somebody else does not reopen a stranger's child's page.
          initialPath={parentReturnRef.current}
          onSignedOut={() => {
            parentReturnRef.current = null;
            setUser(null);
            setStatus('signedOut');
            // Explicitly, rather than letting `view` fall back to 'landing': the address bar still
            // says /family, and the landing branch keeps the current path — which is how signing
            // out of the dashboard used to leave the student marketing page sitting at a parent
            // URL. They came in through the parent door and they leave through it.
            setView('parentLogin');
          }}
        />
      );
    }
    // `openLegal` goes down to App so the in-app footer can open the documents
    // without a full page load, keeping the student's place in the app.
    return children({ user, setUser, openLegal });
  }

  if (view === 'landing') {
    return (
      <ActiveLandingPage
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

  // Said before the form rather than discovered after it. Somebody is about to create or sign
  // into a second account on a browser that is already signed into a first one, and the honest
  // version of what happens next — this browser stops being the student's — is short enough to
  // put above the fields. It also gives the student an obvious way back if they pressed the
  // button by accident, which is otherwise a dead end: every other route out of here assumes the
  // person reading is signed out.
  const overSessionNotice = parentDoorOverSession ? (
    <div style={{
      marginBottom: 16, padding: '12px 12px', borderRadius: 8,
      background: tint(C.amber, 0.08), border: `1px solid ${tint(C.amber, 0.3)}`,
    }}>
      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
        This browser is signed in as <strong style={{ color: C.t1 }}>{user?.email}</strong>, a student
        account. Continuing here signs that account out of this browser — nowhere else — and signs
        the parent in instead.
      </div>
      <button
        type="button"
        onClick={() => { setView('landing'); window.history.replaceState({}, '', '/'); }}
        style={{
          marginTop: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: C.blueL, fontSize: 12.5, fontWeight: 600, fontFamily: C.FB,
        }}
      >
        Not you? Go back to the student app
      </button>
    </div>
  ) : null;

  return (
    <AuthShell key={`${view}-${themeEpoch}`} themeMode={themeMode} onThemeChange={changeTheme}>
      {(view === 'login' || view === 'parentLogin') && (
        <>
          {overSessionNotice}
          <LoginView
            initialEmail={prefillEmail}
            parentMode={view === 'parentLogin'}
            onBack={() => (view === 'parentLogin' ? openParentHub() : goTo('landing'))}
            onGoSignup={(email) => goTo(view === 'parentLogin' ? 'parentSignup' : 'signup', email)}
            onGoForgot={(email) => goTo('forgot', email)}
            onGoParents={openParentHub}
            onAuthed={(token, u) => { handleAuthedOverSession(token, u); toast.success('Welcome back.'); }}
          />
        </>
      )}
      {(view === 'signup' || view === 'parentSignup') && (
        <>
          {overSessionNotice}
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
            onAuthed={handleAuthedOverSession}
          />
        </>
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
