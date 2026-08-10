// The whole application, for a parent account.
//
// ── Why a parent gets a different app rather than a different tab ───────────
// The student app is an 8,000-line shell built around one person's own work: it syncs their
// IndexedDB, runs their lessons, writes their plan. None of that has any meaning for an account
// that owns no progress, and bolting a "parent mode" onto it would mean every one of those
// subsystems growing a "…unless the viewer is a parent" branch — a permanent supply of bugs where
// the answer is "it wrote to the wrong person's data".
//
// So AuthGate renders this instead of the student app, and the two never meet. The parent app
// talks to exactly three endpoints, holds no local database, and cannot write anything about a
// student — not because it is careful, but because there is no code here that could.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, LayoutDashboard, Settings, LogOut, RefreshCw, Users } from 'lucide-react';
import { C, glass, btnG, CC, R, tint, storeMode } from '../../lib/theme';
import { loadA11y, applyA11y } from '../../lib/a11y';
import * as AuthAPI from '../../lib/authApi';
import * as ParentAPI from '../../lib/parentApi';
import { PARENT_VIEWS, parseParentPath } from '../../lib/routes';
import AnimatedLogo from '../AnimatedLogo';
import ThemeToggle from '../ThemeToggle';
import ProgressSummary from './ProgressSummary';
import ConnectionsPanel from './ConnectionsPanel';

// Long enough that a parent leaving the tab open all day is not a meaningful load, short enough
// that "did they do their revision?" is answered by looking rather than by reloading. The server
// side of this poll is cheap by construction — see parent_summary_cache in migration 0006.
const POLL_MS = 90_000;

const NAV = [
  { id: 'dashboard', label: 'Progress', icon: LayoutDashboard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function ParentApp({ user, onSignedOut }) {
  const [view, setView] = useState(() => parseParentPath(window.location.pathname) || 'dashboard');
  const [students, setStudents] = useState(null);   // null = not loaded yet
  const [refreshing, setRefreshing] = useState(false);
  const [themeMode, setThemeMode] = useState(() => loadA11y().themeMode);
  const [themeEpoch, setThemeEpoch] = useState(0);
  const appliedRef = useRef(null);

  // Same two-pass theme dance as AuthGate and App: applying a theme mutates the shared `C` token
  // object, which an already-committed render cannot observe, so the apply happens in an effect and
  // bumps an epoch that keys the tree. See the header of lib/theme.js.
  useEffect(() => {
    const resolved = applyA11y({ ...loadA11y(), themeMode });
    if (appliedRef.current !== resolved) { appliedRef.current = resolved; setThemeEpoch((e) => e + 1); }
  }, [themeMode]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const { students } = await ParentAPI.fetchSummaries();
      setStudents(students || []);
    } catch (err) {
      // A failed poll leaves the last good data on screen rather than blanking it. A parent looking
      // at yesterday's numbers is in a far better position than a parent looking at an error, and
      // the next tick usually fixes it without them ever knowing.
      if (!silent) toast.error(err.message);
      setStudents((prev) => prev || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load({ silent: true }); }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      // Polling a hidden tab is spending someone's battery to compute a screen nobody is looking
      // at. The visibility handler below catches them up the moment they come back.
      if (document.visibilityState === 'visible') load({ silent: true });
    }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  // ── view ⇄ URL ───────────────────────────────────────────────────────────
  // Same invariant as every other router in this app (src/lib/useAppRouter.js): push only when the
  // address bar disagrees with the state, so a back press can never bounce forward.
  useEffect(() => {
    const want = PARENT_VIEWS[view];
    if (window.location.pathname !== want) window.history.pushState({}, '', want);
  }, [view]);

  useEffect(() => {
    const onPop = () => setView(parseParentPath(window.location.pathname) || 'dashboard');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  async function handleSignOut() {
    try { await AuthAPI.logout(); } finally { onSignedOut?.(); }
  }

  const loading = students === null;

  return (
    <div key={themeEpoch} style={{ minHeight: 'var(--msp-vh)', background: C.bg }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: C.surf, borderBottom: `1px solid ${C.b1}`,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '12px 20px', ...R({ gap: 12 }) }}>
          <AnimatedLogo size={28} variant="pop" />
          <div style={{ marginRight: 'auto', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</div>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>Parent view</div>
          </div>
          {/* storeMode writes the same key App.jsx and AuthGate read, so a parent's choice
              survives sign-out and follows them back in — one preference, one app. */}
          <ThemeToggle mode={themeMode} onChange={(m) => { storeMode(m); setThemeMode(m); }} align="right" />
          <button type="button" onClick={handleSignOut} aria-label="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 6 }}>
            <LogOut size={16} />
          </button>
        </div>

        <nav style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4 }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = view === id;
            return (
              <button
                key={id} type="button" onClick={() => setView(id)}
                aria-current={on ? 'page' : undefined}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px',
                  background: 'none', border: 'none', borderBottom: `2px solid ${on ? C.blue : 'transparent'}`,
                  color: on ? C.t1 : C.t3, fontSize: 13, fontWeight: on ? 700 : 500,
                  fontFamily: C.FB, cursor: 'pointer',
                }}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px 20px 60px' }}>
        {view === 'dashboard' && (
          loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 className="spin" size={20} color={C.blueL} />
            </div>
          ) : students.length === 0 ? (
            <div style={glass({ ...CC({ gap: 14 }) })}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: tint(C.blue, 0.13), border: `1px solid ${tint(C.blue, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={19} color={C.blue} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
                No students connected yet
              </div>
              <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>
                Invite your student with the email address they use to sign in. They'll be asked to
                accept before anything is shared with you — and either of you can end it at any time.
              </div>
              <ConnectionsPanel role="parent" onChanged={() => load()} />
            </div>
          ) : (
            <div style={CC({ gap: 26 })}>
              <div style={R({ justifyContent: 'flex-end' })}>
                <button type="button" onClick={() => load()} disabled={refreshing} style={btnG({ fontSize: 12, padding: '6px 12px' })}>
                  {refreshing ? <Loader2 className="spin" size={12} /> : <RefreshCw size={12} />} Refresh
                </button>
              </div>
              {students.map((s) => <ProgressSummary key={s.studentId} summary={s.summary} />)}
            </div>
          )
        )}

        {view === 'settings' && (
          <div style={CC({ gap: 16 })}>
            <div style={glass({ ...CC({ gap: 14 }) })}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Your students</div>
              <ConnectionsPanel role="parent" onChanged={() => load()} />
            </div>

            <div style={glass({ ...CC({ gap: 10 }) })}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Account</div>
              <div style={{ fontSize: 13, color: C.t2 }}>{user?.email}</div>
              <button type="button" onClick={handleSignOut} style={btnG({ alignSelf: 'flex-start' })}>
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
