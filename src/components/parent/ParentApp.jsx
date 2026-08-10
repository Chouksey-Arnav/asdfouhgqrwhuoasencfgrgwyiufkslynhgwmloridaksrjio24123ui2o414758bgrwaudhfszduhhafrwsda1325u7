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
// talks to exactly four endpoints, holds no local database, and cannot write anything about a
// student — not because it is careful, but because there is no code here that could.
//
// ── Why it has tabs now ─────────────────────────────────────────────────────
// It launched as two screens (Progress, Settings) and one scroll that stacked every connected
// student's entire dashboard end to end. With two children that page was four thousand pixels
// long and had no way to link to the bottom half of it. Each part of the answer is its own tab
// with its own URL now — /family, /family/students, /family/digest, /family/activity,
// /family/connections, /family/settings, and a page per student at /family/student/<id> — so a
// parent can bookmark the child they are actually asking about, and the back button walks the
// same path it walks everywhere else in this product.
//
// ── Why every family's dashboard looks different ────────────────────────────
// A dashboard that renders identically for everyone reads as a report someone else generated.
// The header greets the parent by the name they attested to, the tabs adapt to how many students
// they actually have, and each student carries a stable accent colour derived from their id (see
// hueFor) that follows them across every tab — so in a two-child household the two are never
// confusable at a glance, which is the failure mode that matters when the numbers are similar.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, LayoutDashboard, Settings, LogOut, RefreshCw, Users, Brain, CalendarDays,
  UserCog, ChevronRight, ShieldCheck, Flame, ArrowLeft, Link2, Pencil,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, CC, R, G, pill, tint, storeMode, onTint } from '../../lib/theme';
import { loadA11y, applyA11y } from '../../lib/a11y';
import * as AuthAPI from '../../lib/authApi';
import * as ParentAPI from '../../lib/parentApi';
import { buildParentDigest } from '../../lib/parentDigest';
import {
  PARENT_VIEWS, parseParentPath, parseParentStudentPath, parentStudentPath, normalizePath,
} from '../../lib/routes';
import { isPlainLeftClick } from '../../lib/useAppRouter';
import AnimatedLogo from '../AnimatedLogo';
import ThemeToggle from '../ThemeToggle';
import ProgressSummary from './ProgressSummary';
import ConnectionsPanel from './ConnectionsPanel';
import ParentSetup from './ParentSetup';

// Long enough that a parent leaving the tab open all day is not a meaningful load, short enough
// that "did they do their revision?" is answered by looking rather than by reloading. The server
// side of this poll is cheap by construction — see parent_summary_cache in migration 0006.
const POLL_MS = 90_000;

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'digest', label: 'This week', icon: Brain },
  { id: 'activity', label: 'Activity', icon: CalendarDays },
  { id: 'connections', label: 'Connections', icon: Link2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * A stable colour per student, derived from their id.
 *
 * Not decoration: in a household with two children the two dashboards carry near-identical
 * layouts and often similar numbers, and the thing that stops a parent reading the wrong one is
 * a colour that never moves. Derived rather than assigned so it survives a reload, a new device,
 * and a student being disconnected and reconnected.
 */
const STUDENT_HUES = [C.violet, C.blue, C.green, C.orange, C.cyan, C.fuchsia];
function hueFor(studentId) {
  const s = String(studentId || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return STUDENT_HUES[h % STUDENT_HUES.length];
}

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(typeof value === 'number' ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** The view a URL names: a tab id, or `{ studentId }` for a single student's page. */
function viewFromPath(pathname) {
  const studentId = parseParentStudentPath(pathname);
  if (studentId) return { view: 'student', studentId };
  return { view: parseParentPath(pathname) || 'dashboard', studentId: null };
}

// ── Small shared pieces ─────────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{children}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.t3, marginTop: 3, lineHeight: 1.55 }}>{sub}</div>}
    </div>
  );
}

function Empty({ icon: Icon, title, body, children }) {
  return (
    <div style={glass({ ...CC({ gap: 14 }) })}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tint(C.blue, 0.13), border: `1px solid ${tint(C.blue, 0.28)}`,
      }}>
        <Icon size={19} color={C.blue} />
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</div>
      <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>{body}</div>
      {children}
    </div>
  );
}

/**
 * One student, compressed to the four facts a parent opens this app for, under their own colour.
 * The whole card is the link to their page — a card that shows a summary and makes you hunt for
 * the way into the detail is two clicks pretending to be one.
 */
function StudentCard({ entry, onOpen, href }) {
  const { summary } = entry;
  const hue = hueFor(entry.studentId);
  const name = summary?.student?.name || 'Your student';
  const effort = summary?.effort || {};
  const quizzes = summary?.coursework?.quizzes || {};
  const digest = buildParentDigest(summary);

  const facts = [
    { label: 'This week', value: `${effort.activeDaysLast7 ?? 0}/7 days` },
    { label: 'Lessons passed', value: summary?.coursework?.lessonsVerified ?? 0 },
    { label: 'Quiz average', value: quizzes.averageScore != null ? `${quizzes.averageScore}%` : '—' },
    { label: 'Latest test', value: summary?.testing?.total ?? '—' },
  ];

  return (
    <a
      href={href}
      onClick={(e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpen(); }}
      style={glass({
        display: 'block', textDecoration: 'none', padding: 20,
        borderColor: tint(hue, 0.3), background: `linear-gradient(135deg,${tint(hue, 0.07)},transparent 65%)`,
      })}
    >
      <div style={R({ gap: 12, flexWrap: 'wrap' })}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: C.FD, fontWeight: 800, fontSize: 16,
          background: tint(hue, 0.16), border: `1px solid ${tint(hue, 0.36)}`, color: onTint(hue),
        }}>
          {name[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{name}</div>
          <div style={{ fontSize: 12, color: C.t3 }}>
            {summary?.student?.gradeLevel ? `${summary.student.gradeLevel} · ` : ''}
            {effort.lastActiveAt ? `Last studied ${fmtDate(effort.lastActiveAt)}` : 'Not started yet'}
          </div>
        </div>
        {effort.streakDays > 0 && (
          <span style={pill(tint(C.orange, 0.14), C.orangeL)}>
            <Flame size={12} style={{ marginRight: 5 }} /> {effort.streakDays} days
          </span>
        )}
        <ChevronRight size={16} color={C.t3} />
      </div>

      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginTop: 14 }}>{digest.headline}</div>

      <div style={{ ...G(4, 10, { marginTop: 14 }, true) }}>
        {facts.map((f) => (
          <div key={f.label} style={glass2({ padding: 11 })}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.1 }}>{f.value}</div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 3 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </a>
  );
}

/** Eight weeks of study days for one student, in their colour. */
function ActivityStrip({ days, hue }) {
  if (!days?.length) return null;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {week.map((day) => (
              <div key={day.date} title={`${day.date}${day.active ? ' — studied' : ''}`} style={{
                height: 9, borderRadius: 2,
                background: day.active ? hue : C.b1,
                border: day.active ? 'none' : `1px solid ${C.b0}`,
              }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.t3, marginTop: 6 }}>
        <span>8 weeks ago</span><span>Today</span>
      </div>
    </div>
  );
}

// ── The app ─────────────────────────────────────────────────────────────────

export default function ParentApp({ user, onSignedOut }) {
  const [{ view, studentId }, setRoute] = useState(() => viewFromPath(window.location.pathname));
  const [students, setStudents] = useState(null);   // null = not loaded yet
  const [refreshing, setRefreshing] = useState(false);
  const [themeMode, setThemeMode] = useState(() => loadA11y().themeMode);
  const [themeEpoch, setThemeEpoch] = useState(0);
  const appliedRef = useRef(null);

  // The account's own declaration. `null` while unknown — deliberately distinct from "known to be
  // missing", because rendering the intake form at someone who already finished it, for the one
  // frame before the fetch lands, is how a finished account gets asked to do its homework again.
  const [profile, setProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(null);
  const [profileAvailable, setProfileAvailable] = useState(true);

  // Same two-pass theme dance as AuthGate and App: applying a theme mutates the shared `C` token
  // object, which an already-committed render cannot observe, so the apply happens in an effect and
  // bumps an epoch that keys the tree. See the header of lib/theme.js.
  useEffect(() => {
    const resolved = applyA11y({ ...loadA11y(), themeMode });
    if (appliedRef.current !== resolved) { appliedRef.current = resolved; setThemeEpoch((e) => e + 1); }
  }, [themeMode]);

  const loadProfile = useCallback(async () => {
    try {
      const { profile, complete, available } = await ParentAPI.fetchProfile();
      setProfile(profile);
      setProfileComplete(!!complete);
      setProfileAvailable(available !== false);
    } catch {
      // Unreachable profile endpoint must not become an unreachable dashboard: the summary
      // endpoint enforces the same rule server-side, so the worst case here is that a parent sees
      // their students' cards and an explanatory 403 rather than a blank screen.
      setProfileComplete(true);
    }
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const { students } = await ParentAPI.fetchSummaries();
      setStudents(students || []);
    } catch (err) {
      // The one error worth acting on rather than showing: the account has not finished its
      // setup, which has a screen of its own.
      if (err.reason === 'profile_incomplete') { setProfileComplete(false); setStudents([]); return; }
      // A failed poll leaves the last good data on screen rather than blanking it. A parent looking
      // at yesterday's numbers is in a far better position than a parent looking at an error, and
      // the next tick usually fixes it without them ever knowing.
      if (!silent) toast.error(err.message);
      setStudents((prev) => prev || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);
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
  const pathFor = useCallback((next, id) => (
    next === 'student' && id ? parentStudentPath(id) : (PARENT_VIEWS[next] || PARENT_VIEWS.dashboard)
  ), []);

  useEffect(() => {
    const want = pathFor(view, studentId);
    if (normalizePath(window.location.pathname) !== want) window.history.pushState({}, '', want);
  }, [view, studentId, pathFor]);

  useEffect(() => {
    const onPop = () => setRoute(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next, id = null) => setRoute({ view: next, studentId: id }), []);
  const onNavClick = useCallback((e, next, id = null) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    go(next, id);
  }, [go]);

  async function handleSignOut() {
    try { await AuthAPI.logout(); } finally { onSignedOut?.(); }
  }

  const loading = students === null || profileComplete === null;
  const openStudent = useMemo(
    () => (studentId ? (students || []).find((s) => s.studentId === studentId) : null),
    [students, studentId],
  );
  const greetingName = firstName(profile?.fullName || user?.name) || null;

  // ── The setup gate ───────────────────────────────────────────────────────
  // Before the declaration is finished this account cannot invite anyone or read anything (the
  // server enforces both — see api/parent/links.js and api/parent/summary.js), so showing it a
  // dashboard would be showing it a screen made entirely of 403s.
  const needsSetup = profileComplete === false && profileAvailable;

  const shell = (children, { nav = true } = {}) => (
    // flex:1 with its own scroller: #root is a flex row with overflow:hidden (src/index.css), so a
    // block child here would size to its content — a 900px column against an empty window — and
    // a dashboard taller than the viewport would have nowhere to scroll.
    <div key={themeEpoch} style={{ flex: 1, minWidth: 0, height: 'var(--msp-vh)', overflowY: 'auto', background: C.bg }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: C.surf, borderBottom: `1px solid ${C.b1}`,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '12px 20px', ...R({ gap: 12 }) }}>
          <AnimatedLogo size={28} variant="pop" />
          <div style={{ marginRight: 'auto', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</div>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {greetingName ? `${greetingName}'s family view` : 'Parent view'}
            </div>
          </div>
          {/* storeMode writes the same key App.jsx and AuthGate read, so a parent's choice
              survives sign-out and follows them back in — one preference, one app. */}
          <ThemeToggle mode={themeMode} onChange={(m) => { storeMode(m); setThemeMode(m); }} align="right" />
          <button type="button" onClick={handleSignOut} aria-label="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 6 }}>
            <LogOut size={16} />
          </button>
        </div>

        {nav && (
          // Horizontally scrollable rather than wrapped: six tabs do not fit on a phone, and a
          // nav that reflows to two rows moves the tab you were aiming at as the page loads.
          <nav aria-label="Parent sections" style={{ maxWidth: 980, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4, overflowX: 'auto' }}>
            {NAV.map(({ id, label, icon: Icon }) => {
              const on = view === id || (id === 'students' && view === 'student');
              return (
                <a
                  key={id} href={PARENT_VIEWS[id]} onClick={(e) => onNavClick(e, id)}
                  aria-current={on ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px',
                    borderBottom: `2px solid ${on ? C.blue : 'transparent'}`, whiteSpace: 'nowrap',
                    color: on ? C.t1 : C.t3, fontSize: 13, fontWeight: on ? 700 : 500,
                    fontFamily: C.FB, textDecoration: 'none',
                  }}
                >
                  <Icon size={14} /> {label}
                </a>
              );
            })}
          </nav>
        )}
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '20px 20px 60px' }}>{children}</main>
    </div>
  );

  if (loading) {
    return shell(
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 className="spin" size={20} color={C.blueL} />
      </div>,
      { nav: false },
    );
  }

  if (needsSetup || view === 'setup') {
    return shell(
      <div style={CC({ gap: 18 })}>
        {needsSetup && (
          <div style={glass({ ...CC({ gap: 8 }) })}>
            <SectionTitle sub="It takes about a minute, and your student sees what you write here when your request reaches them.">
              Set up your parent dashboard
            </SectionTitle>
          </div>
        )}
        <ParentSetup
          user={user}
          onDone={(saved) => { setProfile(saved); setProfileComplete(true); go('dashboard'); load(); }}
          onSkip={needsSetup ? null : () => go('settings')}
        />
      </div>,
      { nav: !needsSetup },
    );
  }

  const noStudents = !students.length;

  const inviteCta = (
    <Empty
      icon={Users}
      title="No students connected yet"
      body="Invite your student with the email address they use to sign in. They'll see who you are and exactly what would be shared, and they have to accept before anything reaches you — either of you can end it at any time."
    >
      <ConnectionsPanel role="parent" onChanged={() => load()} />
    </Empty>
  );

  return shell(
    <>
      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 18 })}>
            <div style={R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' })}>
              <SectionTitle sub={students.length === 1
                ? 'Effort and results, updated as they study. Coach chats, notes and essays stay private to them.'
                : `${students.length} students. Each keeps their own colour across every tab.`}>
                {greetingName ? `Good to see you, ${greetingName}` : 'Your family'}
              </SectionTitle>
              <button type="button" onClick={() => load()} disabled={refreshing} style={btnG({ fontSize: 12, padding: '6px 12px' })}>
                {refreshing ? <Loader2 className="spin" size={12} /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>
            {students.map((s) => (
              <StudentCard
                key={s.studentId} entry={s}
                href={parentStudentPath(s.studentId)}
                onOpen={() => go('student', s.studentId)}
              />
            ))}
          </div>
        )
      )}

      {/* ── Students ─────────────────────────────────────────────────────── */}
      {view === 'students' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 18 })}>
            <SectionTitle sub="One page each. Open a student for their full dashboard — study days, coursework, tests and what changed recently.">
              Students
            </SectionTitle>
            {students.map((s) => (
              <StudentCard
                key={s.studentId} entry={s}
                href={parentStudentPath(s.studentId)}
                onOpen={() => go('student', s.studentId)}
              />
            ))}
            <div style={glass({ ...CC({ gap: 12 }) })}>
              <SectionTitle sub="Another child on MedSchoolPrep? Send them a request — they accept it themselves.">
                Add another student
              </SectionTitle>
              <ConnectionsPanel role="parent" onChanged={() => load()} />
            </div>
          </div>
        )
      )}

      {/* ── One student ──────────────────────────────────────────────────── */}
      {view === 'student' && (
        <div style={CC({ gap: 16 })}>
          <a
            href={PARENT_VIEWS.students} onClick={(e) => onNavClick(e, 'students')}
            style={{ ...R({ gap: 6 }), fontSize: 12.5, color: C.t3, textDecoration: 'none', width: 'fit-content' }}
          >
            <ArrowLeft size={14} /> All students
          </a>
          {openStudent
            ? <ProgressSummary summary={openStudent.summary} />
            : (
              <Empty
                icon={ShieldCheck}
                title="That student isn't connected to you"
                body="The connection may have ended, or this link may be for a different account. Nothing about them is visible here."
              >
                <button type="button" onClick={() => go('students')} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
                  Back to your students
                </button>
              </Empty>
            )}
        </div>
      )}

      {/* ── This week ────────────────────────────────────────────────────── */}
      {view === 'digest' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 18 })}>
            <SectionTitle sub="What the last week actually means, in words — including when the honest answer is 'not much happened', which is a fact and not a verdict.">
              This week
            </SectionTitle>
            {students.map((s) => {
              const digest = buildParentDigest(s.summary);
              const hue = hueFor(s.studentId);
              return (
                <div key={s.studentId} style={glass({ borderColor: tint(hue, 0.28), background: tint(hue, 0.04) })}>
                  <div style={R({ gap: 9, marginBottom: 10 })}>
                    <Brain size={15} color={hue} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
                      {s.summary?.student?.name || 'Your student'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>{digest.headline}</div>
                  <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.65 }}>{digest.body}</div>
                  <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.65, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.b1}` }}>
                    {digest.suggestion}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {view === 'activity' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 18 })}>
            <SectionTitle sub="Eight weeks of study days, side by side. The shape of the gaps says more than any streak number does.">
              Activity
            </SectionTitle>
            {students.map((s) => {
              const hue = hueFor(s.studentId);
              const effort = s.summary?.effort || {};
              return (
                <div key={s.studentId} style={glass({ ...CC({ gap: 12 }) })}>
                  <div style={R({ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' })}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
                      {s.summary?.student?.name || 'Your student'}
                    </span>
                    <span style={{ fontSize: 12, color: C.t3 }}>
                      {effort.activeDaysLast7 ?? 0} of the last 7 days · {effort.activeDaysLast28 ?? 0} of the last 28
                    </span>
                  </div>
                  <ActivityStrip days={effort.calendar} hue={hue} />
                  {s.summary?.milestones?.length > 0 && (
                    <div style={CC({ gap: 8, marginTop: 4 })}>
                      {s.summary.milestones.slice(0, 5).map((m, i) => (
                        <div key={`${m.kind}-${m.at}-${i}`} style={R({ gap: 9 })}>
                          <span style={{ width: 5, height: 5, borderRadius: 5, background: hue, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: C.t2, textTransform: 'capitalize' }}>{m.label}</span>
                          <span style={{ fontSize: 11.5, color: C.t3, marginLeft: 'auto' }}>{fmtDate(m.at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Connections ──────────────────────────────────────────────────── */}
      {view === 'connections' && (
        <div style={CC({ gap: 18 })}>
          <SectionTitle sub="Every student you are connected to or have asked to connect with. Ending a connection takes effect on their very next screen refresh, not at the end of some session.">
            Connections
          </SectionTitle>
          <div style={glass()}>
            <ConnectionsPanel role="parent" onChanged={() => load()} />
          </div>
          <div style={glass2({ fontSize: 12.5, color: C.t2, lineHeight: 1.65 })}>
            Your student can see this connection from their own Settings, under Family Access, and
            can end it there at any time without asking you. That is deliberate: it is what makes
            this a shared arrangement rather than a monitoring tool.
          </div>
        </div>
      )}

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      {view === 'settings' && (
        <div style={CC({ gap: 16 })}>
          <SectionTitle>Settings</SectionTitle>

          <div style={glass({ ...CC({ gap: 12 }) })}>
            <div style={R({ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' })}>
              <div style={R({ gap: 9 })}>
                <UserCog size={15} color={C.violet} />
                <span style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Your details</span>
              </div>
              <button type="button" onClick={() => go('setup')} style={btnG({ fontSize: 12, padding: '6px 12px' })}>
                <Pencil size={12} /> Edit
              </button>
            </div>
            {profile ? (
              <div style={CC({ gap: 8 })}>
                {[
                  ['Name', profile.fullName],
                  ['Relationship', profile.relationship],
                  ['Phone', profile.phone],
                  ['Student named', profile.studentFullName],
                ].map(([k, v]) => (
                  <div key={k} style={R({ gap: 12, alignItems: 'baseline' })}>
                    <span style={{ fontSize: 11, color: C.t3, letterSpacing: '.08em', textTransform: 'uppercase', width: 120, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13.5, color: C.t1, minWidth: 0, overflowWrap: 'anywhere' }}>{v || '—'}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginTop: 4 }}>
                  These are the details your student sees on any request you send. Editing them asks
                  you to confirm the declaration again — a claim nobody re-read is not one anybody
                  made.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.t2 }}>No details on file yet.</div>
            )}
          </div>

          <div style={glass({ ...CC({ gap: 10 }) })}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Account</div>
            <div style={{ fontSize: 13, color: C.t2 }}>{user?.email}</div>
            <button type="button" onClick={handleSignOut} style={btnG({ alignSelf: 'flex-start' })}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      )}
    </>,
  );
}
