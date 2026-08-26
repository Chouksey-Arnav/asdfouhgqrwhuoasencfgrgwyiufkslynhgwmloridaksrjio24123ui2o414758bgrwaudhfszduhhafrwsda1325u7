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
// they actually have, and each student carries a stable accent color derived from their id (see
// hueFor) that follows them across every tab — so in a two-child household the two are never
// confusable at a glance, which is the failure mode that matters when the numbers are similar.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, LayoutDashboard, Settings, LogOut, RefreshCw, Users, Brain, CalendarDays,
  UserCog, ChevronRight, ShieldCheck, ArrowLeft, Link2, Pencil, LifeBuoy, Eye, EyeOff,
  Mail, KeyRound, X, WifiOff, MessageSquare, Swords, Scale,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, CC, R, autoGrid, tint, storeMode, onTint } from '../../lib/theme';
import { loadA11y, applyA11y } from '../../lib/a11y';
import { subscribeViewport } from '../../lib/useViewport';
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
import FamilyThread from './FamilyThread';
import QuestAssignPanel from './QuestAssignPanel';
import PathwayCostsPanel from './PathwayCostsPanel';

// Long enough that a parent leaving the tab open all day is not a meaningful load, short enough
// that "did they do their revision?" is answered by looking rather than by reloading. The server
// side of this poll is cheap by construction — see parent_summary_cache in migration 0006.
const POLL_MS = 90_000;

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'digest', label: 'This week', icon: Brain },
  { id: 'activity', label: 'Activity', icon: CalendarDays },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'quests', label: 'Quests', icon: Swords },
  { id: 'costs', label: 'What it costs', icon: Scale },
  { id: 'connections', label: 'Connections', icon: Link2 },
  { id: 'guide', label: 'How this works', icon: LifeBuoy },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * A stable color per student, derived from their id.
 *
 * Not decoration: in a household with two children the two dashboards carry near-identical
 * layouts and often similar numbers, and the thing that stops a parent reading the wrong one is
 * a color that never moves. Derived rather than assigned so it survives a reload, a new device,
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

/** "just now" / "4 min ago" / "2 hr ago" — for the freshness line beside Refresh. */
function agoLabel(at) {
  if (!at) return null;
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} d ago`;
}

// ── Small shared pieces ─────────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return (
    <div>
      <div style={{ fontSize: 18, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{children}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.t3, marginTop: 4, lineHeight: 1.55 }}>{sub}</div>}
    </div>
  );
}

/**
 * The shape of the answer, while the answer is loading.
 *
 * A centered spinner tells a parent that something is happening; it does not tell them what is
 * about to appear, and on a slow phone connection it reads as a page that might be broken. These
 * blocks occupy the same footprint the student cards will, so the layout does not jump when the
 * data lands and the wait feels like the page arriving rather than the page stalling.
 *
 * The shimmer is a plain CSS animation defined in src/index.css (msp-shimmer) rather than a
 * library: it is four lines and it must not cost a parent a download to watch a placeholder.
 */
function SkeletonCard() {
  const bar = (w, h = 12, extra = {}) => (
    <div className="msp-shimmer" style={{ width: w, height: h, borderRadius: 4, background: C.b1, ...extra }} />
  );
  return (
    <div style={glass({ padding: 20, ...CC({ gap: 12 }) })} aria-hidden="true">
      <div style={R({ gap: 12 })}>
        {bar(40, 40, { borderRadius: 12, flexShrink: 0 })}
        <div style={{ flex: 1, ...CC({ gap: 8 }) }}>
          {bar('45%', 15)}
          {bar('28%', 10)}
        </div>
      </div>
      {bar('85%', 11)}
      <div style={autoGrid(150, 10)}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={glass2({ padding: 12, ...CC({ gap: 4 }) })}>{bar('60%', 15)}{bar('80%', 9)}</div>)}
      </div>
    </div>
  );
}

/**
 * When these numbers last came from the server, and whether that is still working.
 *
 * ── Why a dashboard about somebody else needs this and most dashboards do not ─
 * Every figure here is a claim about a real person's week, read by someone who will act on it —
 * and the honest failure mode of a background poll is silence. Before this, a poll that started
 * failing left yesterday's numbers on screen indefinitely with nothing to distinguish them from
 * live ones, so "she hasn't studied since Tuesday" could be a fact about a student or a fact about
 * a network. Those two must never look the same on this page.
 */
function Freshness({ at, refreshing, onRefresh }) {
  const label = agoLabel(at);
  return (
    <div style={R({ gap: 8, flexWrap: 'wrap' })}>
      {label && <span style={{ fontSize: 12, color: C.t3 }}>Updated {label}</span>}
      <button
        type="button" onClick={onRefresh} disabled={refreshing}
        style={btnG({ fontSize: 12, padding: '4px 12px', opacity: refreshing ? 0.6 : 1 })}
      >
        {refreshing ? <Loader2 className="spin" size={12} /> : <RefreshCw size={12} />} Refresh
      </button>
    </div>
  );
}

/**
 * The alarm half of the same idea, carried on every tab rather than only the one with the Refresh
 * button on it. `role="status"` so a screen reader is told too — the visual cue is a color and a
 * small icon, which is precisely the kind of signal that reaches nobody who is not looking at it.
 */
function StaleBanner({ at, onRetry, refreshing }) {
  const label = agoLabel(at);
  return (
    <div role="status" style={glass2({
      ...R({ gap: 8, flexWrap: 'wrap' }),
      borderColor: tint(C.amber, 0.32), background: tint(C.amber, 0.06), marginBottom: 16,
    })}>
      <WifiOff size={15} color={C.amberL} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, flex: 1, minWidth: 180 }}>
        These numbers stopped updating{label ? ` — they are from ${label}` : ''}. Usually the
        connection; nothing has happened to the account.
      </span>
      <button type="button" onClick={onRetry} disabled={refreshing} style={btnG({ fontSize: 12, padding: '4px 12px', opacity: refreshing ? 0.6 : 1 })}>
        {refreshing ? <Loader2 className="spin" size={12} /> : <RefreshCw size={12} />} Try again
      </button>
    </div>
  );
}

/**
 * The household in four numbers, above the per-student cards.
 *
 * Only rendered for two or more students, and that restriction is the whole design. With one
 * child a rollup is the same four figures as the card underneath it, which teaches a parent that
 * the top of this page is decoration they can skip. With two it answers the question a card
 * sequence genuinely cannot — "is anyone studying this week?" — without making somebody scroll and
 * hold two sets of numbers in their head to find out.
 */
function FamilyRollup({ students }) {
  const summaries = students.map((s) => s.summary || {});
  const activeThisWeek = summaries.filter((s) => (s.effort?.activeDaysLast7 ?? 0) > 0).length;
  const totalDays = summaries.reduce((n, s) => n + (s.effort?.activeDaysLast7 ?? 0), 0);
  const lessons = summaries.reduce((n, s) => n + (s.coursework?.lessonsVerified ?? 0), 0);
  const scored = summaries.map((s) => s.coursework?.quizzes?.averageScore).filter((v) => v != null);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

  const cells = [
    { label: 'Studying this week', value: `${activeThisWeek}/${students.length}`, hue: C.green },
    { label: 'Study days, combined', value: totalDays, hue: C.blue },
    { label: 'Lessons passed', value: lessons, hue: C.violet },
    { label: 'Quiz average', value: avg != null ? `${avg}%` : '—', hue: C.cyan },
  ];

  return (
    <div style={autoGrid(150, 10)}>
      {cells.map((c) => (
        <div key={c.label} style={glass2({ padding: 12, borderColor: tint(c.hue, 0.22), background: tint(c.hue, 0.05) })}>
          <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.05 }}>{c.value}</div>
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.4 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function Empty({ icon: Icon, title, body, children }) {
  return (
    <div style={glass({ ...CC({ gap: 12 }) })}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tint(C.blue, 0.13), border: `1px solid ${tint(C.blue, 0.28)}`,
      }}>
        <Icon size={19} color={C.blue} />
      </div>
      <div style={{ fontSize: 19, letterSpacing: 'calc(-0.23px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</div>
      <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55 }}>{body}</div>
      {children}
    </div>
  );
}

/**
 * One student, compressed to the four facts a parent opens this app for, under their own color.
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
    { label: 'Units mastered', value: summary?.coursework?.unitsVerified ?? 0 },
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
          alignItems: 'center', justifyContent: 'center', fontFamily: C.FD, fontWeight: 800, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))',
          background: tint(hue, 0.16), border: `1px solid ${tint(hue, 0.36)}`, color: onTint(hue),
        }}>
          {name[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, letterSpacing: 'calc(-0.11px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{name}</div>
          <div style={{ fontSize: 12, color: C.t3 }}>
            {summary?.student?.gradeLevel ? `${summary.student.gradeLevel} · ` : ''}
            {effort.lastActiveAt ? `Last studied ${fmtDate(effort.lastActiveAt)}` : 'Not started yet'}
          </div>
        </div>
        {/* No consecutive-day chip here. The eight-week calendar further down this page shows the
            shape of the gaps, which is the thing worth knowing; a streak number collapses it into
            a score a parent can grade their child against. See api/_lib/parentSummary.js. */}
        <ChevronRight size={16} color={C.t3} />
      </div>

      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55, marginTop: 12 }}>{digest.headline}</div>

      <div style={autoGrid(140, 10, { marginTop: 12 })}>
        {facts.map((f) => (
          <div key={f.label} style={glass2({ padding: 12 })}>
            <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.1 }}>{f.value}</div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </a>
  );
}

/** Eight weeks of study days for one student, in their color. */
function ActivityStrip({ days, hue }) {
  if (!days?.length) return null;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {week.map((day) => (
              <div key={day.date} title={`${day.date}${day.active ? ' — studied' : ''}`} style={{
                height: 9, borderRadius: 4,
                background: day.active ? hue : C.b1,
                border: day.active ? 'none' : `1px solid ${C.b0}`,
              }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.t3, marginTop: 4 }}>
        <span>8 weeks ago</span><span>Today</span>
      </div>
    </div>
  );
}

/**
 * The page that explains the page.
 *
 * ── Why this is a tab and not a footnote ────────────────────────────────────
 * Every number on this dashboard is about somebody else's child, and a parent who is not sure what
 * a number means will decide anyway — usually at dinner, usually in the least generous direction
 * available. "412 XP" gets read as an achievement or an indictment depending on the mood of the
 * person reading it; the honest answer is that it is a participation count. Stating that costs one
 * paragraph and prevents an argument, which is the best trade in this entire product.
 *
 * The second half of the page is troubleshooting, and it is here because the failures a family
 * actually hits — an invitation that never arrived, a code sent to an address nobody reads, a
 * dashboard that says nothing yet because the student has not opened the app since — all look
 * identical from this side: an empty screen. Each has a different fix and none of them is obvious.
 */
function Guide({ user, onGo }) {
  const Block = ({ icon: Icon, hue, title, children }) => (
    <div style={glass({ ...CC({ gap: 8 }) })}>
      <div style={R({ gap: 8 })}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: tint(hue, 0.13), border: `1px solid ${tint(hue, 0.28)}`,
        }}>
          <Icon size={15} color={hue} />
        </div>
        <div style={{ fontSize: 15.5, letterSpacing: 'calc(-0.04px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55 }}>{children}</div>
    </div>
  );

  const Line = ({ term, children }) => (
    <div style={{ marginTop: 8 }}>
      <span style={{ color: C.t1, fontWeight: 700 }}>{term}</span>
      <span style={{ color: C.t2 }}> — {children}</span>
    </div>
  );

  return (
    <div style={CC({ gap: 16 })}>
      <SectionTitle sub="What each part of this dashboard is, where the line is drawn, and what to do when something looks wrong.">
        How this works
      </SectionTitle>

      <Block icon={Eye} hue={C.blue} title="What you can see">
        Effort and outcomes, updated within a few minutes of your student studying — there is no
        button they press to share, and nothing they can quietly turn off short of ending the
        connection entirely.
        <Line term="Days studied">
          Any work at all counts as a day. The eight-week grid on the Activity tab matters more than
          the streak number: three regular days a week is a habit, and a fourteen-day streak after
          a month off is not yet one.
        </Line>
        <Line term="XP and level">
          Time put in, not ability, and it only ever goes up. Worth watching the rate of change
          rather than the total.
        </Line>
        <Line term="Lessons passed">
          They answered the check questions correctly. Opening a lesson does not count.
        </Line>
        <Line term="Quiz average">
          Practice, not exams, and quizzes get harder as they progress — a dip usually means new
          material rather than a problem.
        </Line>
        <Line term="Units mastered">
          A whole unit finished and its unit quiz passed — the largest single chunk of the
          curriculum, and the one worth mentioning at dinner.
        </Line>
      </Block>

      <Block icon={EyeOff} hue={C.t3} title="What you will never see">
        Their conversations with the AI coach, their lesson notes and highlights, their essay
        drafts, and which questions they got wrong. Not a setting and not a promise we are asking
        you to trust: the parent view is assembled from a fixed list of progress fields, so a field
        added to the app next month is invisible here by default rather than shared until somebody
        notices.
        <div style={{ marginTop: 8 }}>
          That boundary is why students agree to share the rest of it. A study app somebody is being
          read over the shoulder in is one they stop being honest inside, and an app they are not
          honest inside stops being able to help them — which would cost you the very thing this
          dashboard is measuring.
        </div>
      </Block>

      <Block icon={Brain} hue={C.violet} title="The weekly read">
        The “This week” tab turns the numbers into a sentence, including when the honest version is
        that not much happened. It will never tell you your child is lazy, falling behind, or losing
        interest — an absence of rows is not evidence of a motive, and this page has no way of
        knowing about the exam week, the flu, or the fight with a friend that explains it.
        <div style={{ marginTop: 8 }}>
          It ends with something to <em>say</em> rather than something to enforce, and that is
          deliberate. The most useful thing this dashboard can produce is a better question at
          dinner.
        </div>
      </Block>

      <Block icon={MessageSquare} hue={C.cyan} title="Saying something back">
        The Messages tab is the one part of this dashboard that is not read-only. You can send a
        short note, ask a question, or ask them to sit a quiz on a topic — and they can answer in a
        line, mark it done, or say not this week.
        <Line term="Where it lands">
          In their app, next to their study plan. Not their inbox and not a notification: they see
          it the next time they open MedSchoolPrep, and there is no way to make it interrupt them.
        </Line>
        <Line term="What a request can and cannot do">
          A quiz request is a suggestion. It does not add anything to their plan, does not affect
          any score, and “not this week” is a real answer we store and show you as one — a request
          that cannot be refused is an instruction, and this is not that kind of product.
        </Line>
        <Line term="If nothing comes back">
          Nothing here chases them, on purpose. Silence usually means they have not opened the app,
          which the Activity tab will tell you.
        </Line>
      </Block>

      <Block icon={ShieldCheck} hue={C.green} title="Consent, and how to end it">
        Your student agreed to this and can undo it from their own Settings, in one tap, without
        asking you — it takes effect on the very next screen either of you loads. You can do exactly
        the same from{' '}
        <button
          type="button" onClick={() => onGo('connections')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.blueL, fontWeight: 600, fontSize: 13, fontFamily: C.FB }}
        >Connections</button>.
        The symmetry is the point: this is a shared arrangement, not a monitoring tool, and it only
        keeps working because both of you can walk away from it.
      </Block>

      <Block icon={KeyRound} hue={C.cyan} title="Signing in, next time">
        This account signs in with a 6-digit code emailed to <strong style={{ color: C.t1 }}>{user?.email}</strong>{' '}
        — there is no password to remember. Go to medschoolprep.cloud/parents/login, enter that
        address, and we will send one. You can set a password later from the sign-in screen if you
        would rather have one.
      </Block>

      <Block icon={LifeBuoy} hue={C.amber} title="If something looks wrong">
        <Line term="The dashboard is empty">
          Either your student has not studied since connecting — the page fills in on its own, no
          action needed — or the connection ended. Connections tells you which.
        </Line>
        <Line term="An invitation never arrived">
          Ask your student to check the address they used, then to resend it from
          Settings ▸ Family access. They can also read you the 8-character code from that screen,
          which works without any email at all.
        </Line>
        <Line term="The numbers look out of date">
          They refresh when your student's device next syncs, which needs them to open the app. A
          few hours behind is normal; a few days usually means they have not opened it.
        </Line>
        <Line term="You have two children">
          Each gets their own page and their own color, which follows them across every tab. Invite
          the second from Connections.
        </Line>
      </Block>
    </div>
  );
}

// ── The app ─────────────────────────────────────────────────────────────────

export default function ParentApp({ user, initialPath = null, onSignedOut }) {
  // `initialPath` is the /family URL the visitor asked for before the sign-in screen intercepted
  // them (see AuthGate). It only wins when the address bar has already moved on — arriving at
  // /family/student/<id> directly must still open that page, and it is the address bar that says
  // so in that case.
  const [{ view, studentId }, setRoute] = useState(() => {
    const here = window.location.pathname;
    return viewFromPath(parseParentPath(here) || parseParentStudentPath(here) ? here : (initialPath || here));
  });
  const [students, setStudents] = useState(null);   // null = not loaded yet
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);
  // Set when a poll fails while there is already data on screen. The numbers stay — see `load` —
  // but a parent reading figures that stopped updating twenty minutes ago deserves to know that is
  // what they are reading.
  const [stale, setStale] = useState(false);
  // Ticks once a minute so the "updated 4 min ago" line ages without a data fetch behind it.
  const [, setClock] = useState(0);
  // Whether the tab strip has anything scrolled off its right edge — see the fade in `shell`.
  const [navOverflows, setNavOverflows] = useState(false);
  const navObserverRef = useRef(null);
  const [themeMode, setThemeMode] = useState(() => loadA11y().themeMode);
  const [themeEpoch, setThemeEpoch] = useState(0);
  const appliedRef = useRef(null);

  // The account's own declaration. `null` while unknown — deliberately distinct from "known to be
  // missing", because rendering the intake form at someone who already finished it, for the one
  // frame before the fetch lands, is how a finished account gets asked to do its homework again.
  const [profile, setProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(null);
  const [profileAvailable, setProfileAvailable] = useState(true);
  // Per-session, not persisted. A prompt that stays dismissed forever is one nobody ever acts on;
  // a prompt that comes back every render is one everybody learns to ignore.
  const [dismissedNudge, setDismissedNudge] = useState(false);

  // How many replies are waiting on the Messages tab. Nothing about this app notifies anybody —
  // no email, no push (see supabase/migrations/0011_family_messages.sql) — so a number on the tab
  // is the ONLY way a parent learns their child answered. Failure is silent and leaves it at
  // zero, which is the right default: a badge that appears because a request failed is worse than
  // no badge.
  const [unread, setUnread] = useState(0);

  // Same two-pass theme dance as AuthGate and App: applying a theme mutates the shared `C` token
  // object, which an already-committed render cannot observe, so the apply happens in an effect and
  // bumps an epoch that keys the tree. See the header of lib/theme.js.
  useEffect(() => {
    const apply = () => {
      const resolved = applyA11y({ ...loadA11y(), themeMode });
      if (appliedRef.current !== resolved) { appliedRef.current = resolved; setThemeEpoch((e) => e + 1); }
    };
    apply();
    // And re-fit on every screen change, same as the student app — a parent
    // dashboard is read on a phone at least as often as on a laptop.
    return subscribeViewport(apply);
  }, [themeMode]);

  /**
   * A session that is no longer a session.
   *
   * Tokens last 30 days and a parent leaves this tab open for weeks, so "signed out underneath
   * you" is a normal Tuesday here rather than an edge case. Left alone it presented as a dashboard
   * that had simply stopped updating: every poll 401'd, the last good numbers stayed on screen
   * forever, and the only signal was a toast the parent had long since scrolled past. Dropping the
   * dead token and going back through the front door is the only honest answer.
   */
  const handleExpiredSession = useCallback(() => {
    AuthAPI.clearToken();
    toast('Your session expired — please sign in again.', { icon: '🔑' });
    onSignedOut?.();
  }, [onSignedOut]);

  const loadProfile = useCallback(async () => {
    try {
      const { profile, complete, available } = await ParentAPI.fetchProfile();
      setProfile(profile);
      setProfileComplete(!!complete);
      setProfileAvailable(available !== false);
    } catch (err) {
      if (err.status === 401) { handleExpiredSession(); return; }
      // Unreachable profile endpoint must not become an unreachable dashboard: the summary
      // endpoint enforces the same rule server-side, so the worst case here is that a parent sees
      // their students' cards and an explanatory 403 rather than a blank screen.
      setProfileComplete(true);
    }
  }, [handleExpiredSession]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const { students } = await ParentAPI.fetchSummaries();
      setStudents(students || []);
      setLoadedAt(Date.now());
      setStale(false);
    } catch (err) {
      if (err.status === 401) { handleExpiredSession(); return; }
      // The one error worth acting on rather than showing: the account has not finished its
      // setup, which has a screen of its own.
      if (err.reason === 'profile_incomplete') { setProfileComplete(false); setStudents([]); return; }
      // A failed poll leaves the last good data on screen rather than blanking it. A parent looking
      // at yesterday's numbers is in a far better position than a parent looking at an error, and
      // the next tick usually fixes it without them ever knowing — but it now says so on screen
      // rather than only in a toast that a background poll never shows anyone.
      setStale(true);
      if (!silent) toast.error(err.message);
      setStudents((prev) => prev || []);
    } finally {
      setRefreshing(false);
    }
  }, [handleExpiredSession]);

  // Deliberately not folded into `load`: the summary poll is the load-bearing one, and a messages
  // endpoint that is slow, missing (a deployment still short of migration 0011) or erroring must
  // not be able to make the dashboard itself look stale.
  const loadUnread = useCallback(async () => {
    try {
      const { unread } = await ParentAPI.fetchMessages();
      setUnread(unread || 0);
    } catch { /* leave the badge where it was */ }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { load({ silent: true }); }, [load]);
  useEffect(() => { loadUnread(); }, [loadUnread]);

  // Re-renders the freshness line on its own clock. Deliberately not tied to the poll: the whole
  // value of "updated 12 min ago" is that it keeps counting when the polling has stopped working.
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Polling a hidden tab is spending someone's battery to compute a screen nobody is looking
      // at. The visibility handler below catches them up the moment they come back.
      if (document.visibilityState === 'visible') { load({ silent: true }); loadUnread(); }
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') { load({ silent: true }); loadUnread(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load, loadUnread]);

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

  /**
   * Measures the tab strip whenever it mounts or changes size.
   *
   * A callback ref rather than a ref + effect because `shell` builds the nav during render and
   * omits it entirely on the loading screen: an effect keyed on anything would have to guess when
   * the element exists, and this simply runs when React attaches it. ResizeObserver covers the two
   * ways the answer changes without a re-render — the window resizing, and a font finally loading
   * and making seven tabs wider than they were.
   */
  const navRef = useCallback((el) => {
    navObserverRef.current?.disconnect();
    navObserverRef.current = null;
    if (!el) return;
    const check = () => setNavOverflows(el.scrollWidth > el.clientWidth + 4);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    navObserverRef.current = ro;
  }, []);

  useEffect(() => () => navObserverRef.current?.disconnect(), []);

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

  // ── The declaration is a prompt now, not a gate ──────────────────────────
  //
  // It used to block the entire dashboard, on the reasoning that an incomplete account could not
  // read anything anyway. That stopped being true when the server dropped the gate (see the long
  // note in api/parent/summary.js): the declaration is required to SEND an invitation, which is
  // where the impersonation risk actually lives, and it was never what kept a stranger out.
  //
  // Which means the wall was only ever standing in front of one person — a parent who had just
  // accepted their own child's invitation, being asked to prove who they were to a student who
  // had typed their address in themselves. They now land on the dashboard they were invited to,
  // and are asked for the details in the two places where asking makes sense: as a dismissible
  // note here, and as a required step if they ever go to invite somebody.
  const incompleteProfile = profileComplete === false && profileAvailable;

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
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
              {greetingName ? `${greetingName}'s family view` : 'Parent view'}
            </div>
          </div>
          {/* storeMode writes the same key App.jsx and AuthGate read, so a parent's choice
              survives sign-out and follows them back in — one preference, one app. */}
          <ThemeToggle mode={themeMode} onChange={(m) => { storeMode(m); setThemeMode(m); }} align="right" />
          <button type="button" onClick={handleSignOut} aria-label="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 4 }}>
            <LogOut size={16} />
          </button>
        </div>

        {nav && (
          // Horizontally scrollable rather than wrapped: seven tabs do not fit on a phone, and a
          // nav that reflows to two rows moves the tab you were aiming at as the page loads.
          //
          // The fade on the right edge is not decoration. A scroll container whose overflow starts
          // exactly at the viewport edge looks like a nav that ends there, and the tabs past it —
          // Connections, How this works, Settings — were the ones parents reported as missing.
          // `msp-noscrollbar` hides the bar itself (src/index.css), because a permanent scrollbar
          // under a seven-item nav is uglier than the problem it solves on the platforms that
          // still draw one.
          <div style={{ position: 'relative', maxWidth: 980, margin: '0 auto' }}>
            <nav
              ref={navRef}
              aria-label="Parent sections"
              className="msp-noscrollbar"
              style={{ padding: '0px 20px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {NAV.map(({ id, label, icon: Icon }) => {
                const on = view === id || (id === 'students' && view === 'student');
                return (
                  <a
                    key={id} href={PARENT_VIEWS[id]} onClick={(e) => onNavClick(e, id)}
                    aria-current={on ? 'page' : undefined}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px',
                      borderBottom: `2px solid ${on ? C.blue : 'transparent'}`, whiteSpace: 'nowrap',
                      color: on ? C.t1 : C.t3, fontSize: 13, fontWeight: on ? 700 : 500,
                      fontFamily: C.FB, textDecoration: 'none', borderRadius: '8px 8px 0 0',
                      background: on ? tint(C.blue, 0.07) : 'transparent',
                      transition: 'color .15s, background .15s',
                    }}
                  >
                    <Icon size={14} /> {label}
                    {id === 'messages' && unread > 0 && (
                      <span
                        aria-label={`${unread} unread`}
                        style={{
                          minWidth: 17, height: 17, padding: '0px 4px', borderRadius: 8,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: C.amber, color: onTint(C.amber), fontSize: 10.5, fontWeight: 800,
                        }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            {/* Only when there is genuinely something past the edge. Painted unconditionally it is
                a visible lighter block sitting over the last tab on any screen wide enough to fit
                all seven — C.surf is a translucent white, so "fade to the header color" fades to
                something lighter than the header rather than into it. */}
            {navOverflows && (
              <div aria-hidden="true" style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, pointerEvents: 'none',
                background: `linear-gradient(90deg,${tint(C.bg, 0)},${C.bg})`,
              }} />
            )}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '20px 20px 60px' }}>
        {/* Above whatever tab is open, because a failed poll is a fact about every number on the
            page and not only about the one screen that happens to carry a Refresh button. */}
        {nav && stale && students?.length > 0 && (
          <StaleBanner at={loadedAt} refreshing={refreshing} onRetry={() => load()} />
        )}
        {children}
      </main>
    </div>
  );

  if (loading) {
    return shell(
      <div style={CC({ gap: 16 })} role="status" aria-label="Loading your family dashboard">
        <div className="msp-shimmer" style={{ width: 220, height: 20, borderRadius: 8, background: C.b1 }} />
        <SkeletonCard />
        <SkeletonCard />
      </div>,
      { nav: false },
    );
  }

  if (view === 'setup') {
    return shell(
      <div style={CC({ gap: 16 })}>
        <div style={glass({ ...CC({ gap: 8 }) })}>
          <SectionTitle sub="Required before you can send an invitation of your own — your student sees what you write here when your request reaches them. Not required to read a dashboard somebody already invited you to.">
            Your details
          </SectionTitle>
        </div>
        <ParentSetup
          user={user}
          onDone={(saved) => { setProfile(saved); setProfileComplete(true); go('connections'); load(); }}
          onSkip={() => go(students.length ? 'dashboard' : 'connections')}
        />
      </div>,
    );
  }

  const noStudents = !students.length;

  /**
   * The empty dashboard, which is the screen a brand-new parent account is most likely to see —
   * and the one the old version handled worst. It said "no students connected yet" and offered an
   * invite form, which is exactly wrong for the common case: this parent did not come here to
   * invite anybody, they came here because their child invited THEM and something did not stick.
   *
   * So it answers that question first, and offers the invite path second.
   */
  const inviteCta = (
    <div style={CC({ gap: 16 })}>
      <div style={glass({ ...CC({ gap: 12 }) })}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tint(C.blue, 0.13), border: `1px solid ${tint(C.blue, 0.28)}`,
        }}>
          <Users size={19} color={C.blue} />
        </div>
        <div style={{ fontSize: 19, letterSpacing: 'calc(-0.23px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
          Nothing to show yet
        </div>
        <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55 }}>
          This account isn't connected to a student. Nothing about anybody is visible here until one
          of you invites the other and the other accepts.
        </div>

        <div style={glass2({ ...CC({ gap: 8 }) })}>
          <div style={R({ gap: 8 })}>
            <Mail size={14} color={C.blueL} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Your student already invited you?</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
            Open the link they sent, or ask them for the 8-character code from their
            Settings ▸ Family access and enter it at{' '}
            <a href="/parents" style={{ color: C.blueL, fontWeight: 600 }}>medschoolprep.cloud/parents</a>.
            Their invitation has to be accepted from the address it was sent to — if that isn't{' '}
            <strong style={{ color: C.t1 }}>{user?.email}</strong>, ask them to re-send it to this one.
          </div>
        </div>
      </div>

      <div style={glass({ ...CC({ gap: 12 }) })}>
        <SectionTitle sub="They'll get a request naming you, and nothing reaches you until they accept it.">
          Or invite your student
        </SectionTitle>
        {incompleteProfile ? (
          <div style={CC({ gap: 8 })}>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55 }}>
              Before you can send a request we need your name, your relationship to them, and a
              number we can reach you on. That is not paperwork for its own sake: it is what the
              request says when it lands in your student's inbox, and it is the only way they can
              tell a request from you apart from one from a stranger.
            </div>
            <button type="button" onClick={() => go('setup')} style={btn(C.blueGrad, { alignSelf: 'flex-start' })}>
              <UserCog size={14} /> Add your details
            </button>
          </div>
        ) : (
          <ConnectionsPanel role="parent" onChanged={() => load()} />
        )}
      </div>
    </div>
  );

  /** A note, not a wall — see the comment on `incompleteProfile`. Only shown where it is true. */
  const profileNudge = incompleteProfile && students.length > 0 && !dismissedNudge ? (
    <div style={glass2({ ...R({ gap: 8, alignItems: 'flex-start' }), borderColor: tint(C.amber, 0.3), background: tint(C.amber, 0.05) })}>
      <UserCog size={15} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
      <div style={{ minWidth: 0, flex: 1, fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
        We don't have your name or a contact number yet. Adding them takes a minute and is what
        lets you invite another student later — your dashboard works either way.{' '}
        <button
          type="button" onClick={() => go('setup')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.blueL, fontWeight: 600, fontSize: 12.5, fontFamily: C.FB }}
        >
          Add them now
        </button>
      </div>
      <button
        type="button" onClick={() => setDismissedNudge(true)} aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  ) : null;

  return shell(
    <>
      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 16 })}>
            {profileNudge}
            <div style={R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' })}>
              <SectionTitle sub={students.length === 1
                ? 'Effort and results, updated as they study. Coach chats, notes and essays stay private to them.'
                : `${students.length} students. Each keeps their own color across every tab.`}>
                {greetingName ? `Good to see you, ${greetingName}` : 'Your family'}
              </SectionTitle>
              <Freshness at={loadedAt} refreshing={refreshing} onRefresh={() => load()} />
            </div>
            {students.length > 1 && <FamilyRollup students={students} />}
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
          <div style={CC({ gap: 16 })}>
            <SectionTitle sub="One page each. Open a student for their full dashboard — study days, coursework and what changed recently.">
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
            style={{ ...R({ gap: 4 }), fontSize: 12.5, color: C.t3, textDecoration: 'none', width: 'fit-content' }}
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
          <div style={CC({ gap: 16 })}>
            <SectionTitle sub="What the last week actually means, in words — including when the honest answer is 'not much happened', which is a fact and not a verdict.">
              This week
            </SectionTitle>
            {students.map((s) => {
              const digest = buildParentDigest(s.summary);
              const hue = hueFor(s.studentId);
              return (
                <div key={s.studentId} style={glass({ borderColor: tint(hue, 0.28), background: tint(hue, 0.04) })}>
                  <div style={R({ gap: 8, marginBottom: 8 })}>
                    <Brain size={15} color={hue} />
                    <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
                      {s.summary?.student?.name || 'Your student'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>{digest.headline}</div>
                  <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55 }}>{digest.body}</div>
                  <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.b1}` }}>
                    {digest.suggestion}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {view === 'messages' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 16 })}>
            <SectionTitle sub="A note, a question, or a request to sit a quiz. It shows up in their app rather than their inbox — and they can mark it done, answer in a line, or say not this week. Nothing you send here changes their plan on its own.">
              Messages
            </SectionTitle>
            {students.map((s) => {
              const hue = hueFor(s.studentId);
              const name = s.summary?.student?.name || 'Your student';
              return (
                <div key={s.studentId} style={glass({ ...CC({ gap: 12 }), borderColor: tint(hue, 0.26) })}>
                  <div style={R({ gap: 8 })}>
                    <MessageSquare size={15} color={hue} />
                    <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{name}</span>
                  </div>
                  <FamilyThread
                    linkId={s.link?.linkId}
                    role="parent"
                    counterparty={name}
                    compact
                    // Opening this tab marks the thread read, so the badge on the tab strip has
                    // to hear about it — otherwise it sits at "3 new" over a screen the parent is
                    // currently reading. Recomputed rather than decremented: with two children
                    // this component is mounted twice and each only knows its own count.
                    onUnreadChange={loadUnread}
                  />
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Quests ───────────────────────────────────────────────────────── */}
      {view === 'quests' && (
        noStudents ? inviteCta : <QuestAssignPanel students={students} hueFor={hueFor} />
      )}

      {/* ── What it costs ────────────────────────────────────────────────────
          The one tab that renders with no connected student, deliberately: a
          parent evaluating whether this app is worth anything can read the
          pathway finances before their child has accepted an invitation, and
          the comparison is just as true for a family with nobody signed up. */}
      {view === 'costs' && <PathwayCostsPanel students={students} />}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {view === 'activity' && (
        noStudents ? inviteCta : (
          <div style={CC({ gap: 16 })}>
            <SectionTitle sub="Eight weeks of study days, side by side. The shape of the gaps says more than any streak number does.">
              Activity
            </SectionTitle>
            {students.map((s) => {
              const hue = hueFor(s.studentId);
              const effort = s.summary?.effort || {};
              return (
                <div key={s.studentId} style={glass({ ...CC({ gap: 12 }) })}>
                  <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' })}>
                    <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
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
                        <div key={`${m.kind}-${m.at}-${i}`} style={R({ gap: 8 })}>
                          <span style={{ width: 5, height: 5, borderRadius: 4, background: hue, flexShrink: 0 }} />
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
        <div style={CC({ gap: 16 })}>
          <SectionTitle sub="Every student you are connected to or have asked to connect with. Ending a connection takes effect on their very next screen refresh, not at the end of some session.">
            Connections
          </SectionTitle>
          <div style={glass()}>
            <ConnectionsPanel role="parent" onChanged={() => load()} />
          </div>
          <div style={glass2({ fontSize: 12.5, color: C.t2, lineHeight: 1.55 })}>
            Your student can see this connection from their own Settings, under Family Access, and
            can end it there at any time without asking you. That is deliberate: it is what makes
            this a shared arrangement rather than a monitoring tool.
          </div>
        </div>
      )}

      {/* ── How this works ───────────────────────────────────────────────── */}
      {view === 'guide' && <Guide user={user} onGo={go} />}

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      {view === 'settings' && (
        <div style={CC({ gap: 16 })}>
          <SectionTitle>Settings</SectionTitle>

          <div style={glass({ ...CC({ gap: 12 }) })}>
            <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' })}>
              <div style={R({ gap: 8 })}>
                <UserCog size={15} color={C.violet} />
                <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Your details</span>
              </div>
              <button type="button" onClick={() => go('setup')} style={btnG({ fontSize: 12, padding: '4px 12px' })}>
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
                    <span style={{ fontSize: 11, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', width: 120, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13.5, color: C.t1, minWidth: 0, overflowWrap: 'anywhere' }}>{v || '—'}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>
                  These are the details your student sees on any request you send. Editing them asks
                  you to confirm the declaration again — a claim nobody re-read is not one anybody
                  made.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.t2 }}>No details on file yet.</div>
            )}
          </div>

          <div style={glass({ ...CC({ gap: 8 }) })}>
            <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Account</div>
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
