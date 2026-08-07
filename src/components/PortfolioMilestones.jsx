// ─────────────────────────────────────────────────────────────────────────────
// MILESTONES — Portfolio's single dated surface.
//
// This tab is the merge of two that used to sit next to each other and quietly
// contradict each other:
//
//   • "Deadlines" — a flat table of rows the student typed in, with a countdown
//     and an AI urgency read. It could edit dates but knew nothing about the
//     application year, so a freshman who had typed nothing was told, truthfully
//     and uselessly, that they had no deadlines.
//   • "Timeline" — the generated chronological arc from src/lib/timeline.js:
//     class-year milestones, test sittings, college-list dates, logged work. It
//     knew everything and could change nothing, so the fix for anything it
//     surfaced was "go to the other tab".
//
// They were never two features. They were the read half and the write half of
// one calendar, and the seam between them was where students lost dates: a
// deadline added on one tab appeared on the other only after a reload, the two
// disagreed about what was "next", and the AI summary reasoned over half the
// picture.
//
// The name. "Milestones" is the word this codebase already uses for the unit —
// MILESTONES is literally the catalog in src/lib/timeline.js, `stats.missed`
// counts "milestones that slipped past", and the tab's icon was already
// lucide's <Milestone>. It is the only word that honestly contains both halves:
// a deadline is a milestone with consequences, and a generated timeline entry is
// a milestone with a typical date. "Timeline" drops the pressure, "Deadlines"
// drops the arc, "Calendar" promises a month grid this is not, and "Roadmap" and
// "Command Center" are both taken elsewhere in Portfolio.
//
// What the merge buys, concretely:
//   1. One feed. Your dates and generated dates interleave in true chronological
//      order, so "what is actually next" is a fact rather than a comparison
//      between two tabs.
//   2. Editing happens in the feed. Rows that came from a `deadlines` row carry
//      `ownerRef` (see profileEvents in src/lib/timeline.js) and get a delete
//      control right there. Every other row is derived from another panel and
//      links to the panel that owns it, so there is exactly one place to change
//      any given date.
//   3. The old Deadlines tab survives as a lens, not a tab: "Your dates" filters
//      the feed to `source === 'profile'`. Nothing was taken away.
//   4. The AI read is grounded in the whole calendar instead of half of it.
//   5. It exports. A calendar the student can subscribe to on their phone is
//      worth more than one they have to remember to open (src/lib/icsExport.js).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays, Milestone, History, Hourglass, AlertTriangle, CheckCircle2, ChevronRight,
  Sparkles, GraduationCap, Info, ArrowRight, Filter, ListChecks, FileText, Plus, Trash2,
  Stethoscope, TrendingUp, UserCheck, Wallet, ScrollText, Compass, Trophy, BookOpen,
  CalendarX, Loader2, CalendarPlus, Layers, X, Loader,
} from 'lucide-react';
import { C, glass, glass2, R, CC, G, pill, tint, btn, btnSm, btnG, inp, onTint } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import { buildPortfolioSnapshot } from '../lib/portfolioData';
import { buildTimeline, TIMELINE_KINDS, KIND_BY_ID } from '../lib/timeline';
import { deriveSuggestedDeadlines } from '../lib/autoDeadlines';
import { trackItem, cancelQueuedTrack } from '../lib/trackQueue';
import { usePendingTrackKeys, useTrackQueueDrain } from '../lib/useTrackQueue';
import { rowDedupeKey, needsDeadlineDate } from '../lib/trackingCatalog';
import { showMedabrainToast } from '../lib/medabrainComments';
import { getCached, setCached, dailyKey } from '../lib/aiCache';
import { renderMarkdown } from '../lib/renderMarkdown';
import { downloadIcs } from '../lib/icsExport';
import TrackQueueNotice from './ui/TrackQueueNotice';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';

// The engine returns theme KEY names (it has to stay importable from plain Node
// for scripts/verifyTimeline.mjs), so the palette lookup happens here.
const kindColor = (kind) => C[KIND_BY_ID[kind]?.colorKey] || C.blue;

const KIND_ICON = {
  application: ScrollText, testing: TrendingUp, aid: Wallet, essays: FileText,
  recommenders: UserCheck, experience: Stethoscope, academics: BookOpen,
  decision: Trophy, planning: Compass, logged: History,
};

// Status drives the whole visual language of a row: what color it borrows, what
// the right-hand chip says, and whether it reads as pressure or as a record.
const STATUS_META = {
  missed:   { label: 'slipped past', color: () => C.rose,   icon: AlertTriangle },
  today:    { label: 'today',        color: () => C.amber,  icon: Hourglass },
  soon:     { label: 'soon',         color: () => C.amber,  icon: Hourglass },
  upcoming: { label: null,           color: (k) => kindColor(k), icon: null },
  done:     { label: 'done',         color: () => C.green,  icon: CheckCircle2 },
  past:     { label: null,           color: () => C.t3,     icon: null },
};

// The `kind` values a student can pick when adding their own date. These are the
// stored `deadlines.kind` column values, which the timeline engine maps onto its
// own broader categories via DEADLINE_KIND_MAP — so this list is about how the
// student describes the date, and TIMELINE_KINDS is about how the feed groups it.
const DEADLINE_KINDS = [
  { id: 'common_app_open', label: 'Common App Opens' },
  { id: 'early_action', label: 'Early Action' },
  { id: 'early_decision', label: 'Early Decision' },
  { id: 'regular_decision', label: 'Regular Decision' },
  { id: 'fafsa', label: 'FAFSA' },
  { id: 'css_profile', label: 'CSS Profile / Aid' },
  { id: 'ap_exam', label: 'AP Exam' },
  { id: 'ib_exam', label: 'IB Exam' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'custom', label: 'Other' },
];

const CURRENT_YEAR = new Date().getFullYear();
export const DEFAULT_DEADLINES = [
  { title: 'Common App Opens', due_date: `${CURRENT_YEAR}-08-01`, kind: 'common_app_open' },
  { title: 'Early Action / Early Decision Deadline', due_date: `${CURRENT_YEAR}-11-01`, kind: 'early_action' },
  { title: 'FAFSA Opens', due_date: `${CURRENT_YEAR}-10-01`, kind: 'fafsa' },
  { title: 'Regular Decision Deadline', due_date: `${CURRENT_YEAR + 1}-01-01`, kind: 'regular_decision' },
];

// The three lenses the feed can be read through. "Yours" is the old Deadlines
// tab, preserved exactly — same rows, same authority, one click away.
const LENSES = [
  { id: 'all', label: 'Everything', icon: Layers, blurb: null },
  { id: 'mine', label: 'Your dates', icon: CheckCircle2, blurb: 'Only dates you entered yourself or that came off your college list, scholarships, and recommenders. Every one of these is exact.' },
  { id: 'generated', label: 'Typical dates', icon: Sparkles, blurb: 'Only the dates MedSchoolPrep generated from your class year and track. Treat these as a normal year, not as your year — confirm each one on the official site.' },
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtDate = (d, withYear = true) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

const countdown = (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`);

/**
 * One fetch, one timeline, one snapshot — shared by the Milestones tab and the
 * Home card so the dashboard and the tab can never disagree about what is next.
 *
 * `refreshKey` is how a write gets reflected: the tab bumps it after adding or
 * removing a date and the whole feed is rebuilt from the server rather than
 * patched locally, because a deadline row does not just add a row — it can also
 * retire a generated placeholder (the FAFSA milestone steps aside once you keep
 * your own FAFSA date; see `when` in the MILESTONES catalog).
 */
export function useMilestoneFeed(user, refreshKey = 0) {
  const [state, setState] = useState({ timeline: null, snapshot: null, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [snapshot, testScores] = await Promise.all([
        buildPortfolioSnapshot().catch(() => ({})),
        listItems('test_scores').catch(() => []),
      ]);
      if (!alive) return;
      const build = (snap) => buildTimeline({
        user,
        snapshot: snap,
        testScores: testScores || [],
        sat: { projection: user?.satProjection || null, diagnosticDone: !!user?.satDiagnostic },
      });
      let timeline;
      try { timeline = build(snapshot); } catch { timeline = build({}); }
      setState({ timeline, snapshot, loading: false });
    })();
    return () => { alive = false; };
    // Rebuilt when the identity inputs change or a write asks for it; portfolio
    // rows are re-fetched on mount, which is when this panel is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.gradeStage, user?.gradeStageYear, user?.examDate, user?.apIb, user?.testTrack, user?.onboardingTargetScore, refreshKey]);

  return state;
}

/** Timeline only — the shape the Home card and any read-only consumer wants. */
export function useTimeline(user, refreshKey = 0) {
  return useMilestoneFeed(user, refreshKey).timeline;
}

/**
 * The raw `deadlines` rows, for callers that only need the count (App.jsx's
 * achievement checks, the weekly-goal metrics). Kept here so the resource has
 * exactly one hook in the codebase.
 */
export function useDeadlines() {
  const [deadlines, setDeadlines] = useState(null);
  useEffect(() => {
    listItems('deadlines').then(setDeadlines).catch(() => setDeadlines([]));
  }, []);
  return deadlines;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PortfolioMilestones({ accent = C.indigo, user = null, apIb = false, askMedabrain, onNavigate, onAdded, isMobile = false }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const { timeline, snapshot, loading } = useMilestoneFeed(user, refreshKey);
  const { entries: pendingEntries, status: trackStatus } = usePendingTrackKeys();

  const [lens, setLens] = useState('all');
  const [kindFilter, setKindFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [seeding, setSeeding] = useState(false);
  // Rows removed in this session but not yet gone from the server round-trip.
  // Without this the delete looks like it did nothing until the refetch lands.
  const [hidden, setHidden] = useState(() => new Set());

  // Anything that flushed from the offline queue in the background belongs in
  // the feed without a manual reload.
  useTrackQueueDrain(refresh);

  const go = useCallback((action) => {
    if (!action || !onNavigate) return;
    onNavigate(action.tab, action.view);
  }, [onNavigate]);

  const deadlineRows = snapshot?.deadlines || [];

  // ── Writes ────────────────────────────────────────────────────────────────
  const addDeadline = useCallback(async (row) => {
    const res = await trackItem('deadlines', row, { dedupeKey: rowDedupeKey('deadlines', row), label: row.title, existing: deadlineRows });
    if (res.status === 'duplicate') { toast('That date is already on your timeline', { icon: '✓' }); return res; }
    if (res.status === 'created') {
      showMedabrainToast('deadline_added', { title: res.row.title });
      onAdded?.();
      refresh();
    } else {
      toast(`${row.title} is saved on this device and will finish saving shortly.`, { icon: '📥', duration: 6000 });
    }
    return res;
  }, [deadlineRows, onAdded, refresh]);

  const removeDeadline = useCallback(async (ownerRef, eventId) => {
    if (!window.confirm('Remove this date from your timeline?')) return;
    const row = deadlineRows.find(d => d.id === ownerRef.id);
    setHidden(prev => new Set(prev).add(eventId));
    if (row) await cancelQueuedTrack('deadlines', rowDedupeKey('deadlines', row));
    try { await deleteItem('deadlines', ownerRef.id); }
    catch (err) {
      toast.error(err.message);
      setHidden(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      return;
    }
    refresh();
    setHidden(new Set());
  }, [deadlineRows, refresh]);

  async function seedDefaults() {
    setSeeding(true);
    try {
      await Promise.all(DEFAULT_DEADLINES.map(d => createItem('deadlines', d)));
      toast.success('Added the common admissions dates — replace each one with your schools\' real dates as you confirm them.');
      onAdded?.();
      refresh();
    } catch (err) { toast.error(err.message); }
    finally { setSeeding(false); }
  }

  // ── Suggestions, derived from what is already tracked elsewhere ────────────
  const suggestions = useMemo(
    () => deriveSuggestedDeadlines({
      colleges: snapshot?.colleges || [],
      scholarships: snapshot?.scholarships || [],
      apIb,
      existingDeadlines: deadlineRows,
    }),
    [snapshot?.colleges, snapshot?.scholarships, apIb, deadlineRows]
  );
  const dateless = useMemo(() => needsDeadlineDate(snapshot?.scholarships || []), [snapshot?.scholarships]);

  async function addAllSuggestions() {
    setAddingAll(true);
    let created = 0;
    let queued = 0;
    try {
      // Sequential rather than Promise.all: a partial failure used to reject the whole batch
      // and lose every successfully-created row, leaving the feed out of sync until a reload.
      for (const s of suggestions) {
        const row = { title: s.title, due_date: s.due_date, kind: s.kind, college_id: s.college_id };
        const res = await trackItem('deadlines', row, { dedupeKey: rowDedupeKey('deadlines', row), label: s.title, existing: deadlineRows });
        if (res.status === 'created') created++;
        else if (res.status === 'queued') queued++;
      }
      if (created) { toast.success(`Added ${created} date${created === 1 ? '' : 's'} to your timeline`); onAdded?.(); }
      if (queued) toast(`${queued} saved on this device — they'll finish saving automatically.`, { icon: '📥', duration: 6000 });
      if (created || queued) refresh();
    } finally { setAddingAll(false); }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  // Split from the month filter on purpose: the month strip has to be drawn from
  // everything the *other* filters allow, or picking a month would collapse the
  // strip to the single bar you just clicked and there would be no way to see —
  // or reach — any other month.
  const matchesExceptMonth = useCallback((e) => {
    if (hidden.has(e.id)) return false;
    if (lens === 'mine' && e.source !== 'profile') return false;
    if (lens === 'generated' && e.source !== 'catalog') return false;
    if (kindFilter && e.kind !== kindFilter) return false;
    return true;
  }, [hidden, lens, kindFilter]);

  const matches = useCallback(
    (e) => matchesExceptMonth(e) && (!monthFilter || e.date.slice(0, 7) === monthFilter),
    [matchesExceptMonth, monthFilter]
  );

  const filteredGroups = useMemo(() => {
    if (!timeline) return [];
    return timeline.groups
      .map(g => ({ ...g, items: g.items.filter(matches) }))
      .filter(g => g.items.length);
  }, [timeline, matches]);

  const visibleUpcoming = useMemo(
    () => (timeline ? timeline.upcoming.filter(matches) : []),
    [timeline, matches]
  );
  const stripEvents = useMemo(
    () => (timeline ? timeline.upcoming.filter(matchesExceptMonth) : []),
    [timeline, matchesExceptMonth]
  );

  // ── Meta Brain's read on the merged feed ──────────────────────────────────
  // Grounded in the actual upcoming list — the prompt embeds it and forbids
  // inventing anything outside it — and cached per-day AND per-list-shape so it
  // only re-calls Groq when the day rolls over or the calendar actually changes.
  const brainList = useMemo(
    () => (timeline ? timeline.upcoming.slice(0, 12) : []),
    [timeline]
  );
  const brainSummary = useBrainTake(askMedabrain, brainList);

  const filtersOn = !!(kindFilter || monthFilter || lens !== 'all');
  const clearFilters = () => { setKindFilter(null); setMonthFilter(null); setLens('all'); };

  function exportCalendar() {
    const events = (timeline?.upcoming || []).filter(e => e.days >= 0);
    if (!events.length) { toast('Nothing upcoming to export yet.', { icon: '📅' }); return; }
    const n = downloadIcs(events, {
      calendarName: `MedSchoolPrep — ${timeline.gradeLabel || 'Milestones'}`,
      filename: 'medschoolprep-milestones.ics',
    });
    toast.success(`${n} milestone${n === 1 ? '' : 's'} exported — open the file to add them to your calendar.`);
  }

  if (!timeline) {
    return (
      <div style={CC({ gap: 18 })}>
        <Hero accent={accent} timeline={null} isMobile={isMobile} onExport={null} />
        <div style={{ ...glass({ padding: 26, textAlign: 'center' }), color: C.t3, fontSize: 13 }}>
          <Loader size={16} className="spin" style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Building your timeline…
        </div>
      </div>
    );
  }

  const { stats, gradeLabel, next } = timeline;
  const kindsPresent = TIMELINE_KINDS.filter(k => stats.byKind[k.id] && k.id !== 'logged');
  const yoursCount = deadlineRows.length;

  return (
    <div style={CC({ gap: 18 })}>
      <Hero accent={accent} timeline={timeline} isMobile={isMobile} onExport={exportCalendar} />

      <TrackQueueNotice entries={pendingEntries.filter(e => e.resource === 'deadlines')} status={trackStatus} onRetried={refresh} />

      {/* No class year on file. This is a prompt, not a gate — the old Timeline
          tab returned early here, which in a merged tab would take the deadline
          editor away from exactly the students who most need somewhere to put a
          date. Their own dates still render below; only the generated calendar
          is withheld, because a freshman's and a senior's are nothing alike and
          showing the wrong one is worse than showing none. */}
      {!gradeLabel && (
        <CalloutCard color={C.amber} icon={GraduationCap} title="Set your class year to unlock the generated calendar">
          <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.65, margin: 0 }}>
            We don't know what grade you're in, so we won't guess your admissions calendar — a freshman and a senior get
            completely different dates. Anything you add below still works right now and still counts down on your Home dashboard.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('settings', null)} style={btnG({ marginTop: 12, fontSize: 12, padding: '8px 16px' })}>
              Open Settings<ArrowRight size={12} />
            </button>
          )}
        </CalloutCard>
      )}

      {/* The numbers, as controls. Each tile is the filter for the thing it
          counts, so reading "3 slipped past" and acting on it is one click and
          not a scroll hunt. */}
      <div style={G(4, 12, {}, isMobile)}>
        <StatTile icon={Hourglass}
          value={next ? (next.days === 0 ? 'Today' : next.days < 0 ? 'Overdue' : `${next.days}d`) : '—'}
          label={next ? truncate(next.title, 30) : 'nothing ahead'}
          sub={next ? fmtDate(next.date) : null}
          color={!next ? C.t3 : next.status === 'missed' ? C.rose : next.days <= 14 ? C.amber : C.sky}
          onClick={next ? () => { clearFilters(); setOpenId(next.id); } : undefined} />
        <StatTile icon={AlertTriangle} value={stats.soon} label="due within 14 days"
          color={stats.soon > 0 ? C.amber : C.green} />
        <StatTile icon={AlertTriangle} value={stats.missed} label="slipped past, still open"
          color={stats.missed > 0 ? C.rose : C.green} />
        <StatTile icon={CheckCircle2} value={yoursCount} label="dates you added"
          sub={`${stats.fromYourData} exact · ${stats.generated} typical`}
          color={C.violet}
          onClick={() => { setKindFilter(null); setMonthFilter(null); setLens(lens === 'mine' ? 'all' : 'mine'); }} />
      </div>

      <BrainTake summary={brainSummary} />

      {/* Where these dates come from — said once, plainly, so a generated date is
          never mistaken for one the student confirmed. */}
      <div style={{ ...glass2({ padding: '11px 14px' }), display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Info size={13} color={C.t3} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
          <b style={{ color: C.t2 }}>{stats.fromYourData}</b> of these came from what you've logged — those dates are exact.{' '}
          <b style={{ color: C.t2 }}>{stats.generated}</b> are typical-year dates generated from your class year, courses, test track, and college list; they're marked <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical</span> and should be confirmed on the official site before you plan around them.
        </div>
      </div>

      <AddMilestone accent={accent} open={composerOpen} setOpen={setComposerOpen} onAdd={addDeadline} />

      {suggestions.length > 0 && (
        <CalloutCard color={C.violet} icon={ListChecks}
          title={`Ready to add from your Portfolio (${suggestions.length})`}
          right={
            <button style={btnSm(tint(C.violet, 0.2), { color: onTint(C.violet) })} disabled={addingAll} onClick={addAllSuggestions}>
              {addingAll ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}Add all
            </button>
          }>
          <p style={{ fontSize: 11.5, color: C.t3, marginBottom: 12, lineHeight: 1.5, marginTop: 0 }}>
            Pulled from dates you already entered on College List and Financial Aid (plus FAFSA/AP/IB). Nothing here is guessed —
            adding one turns it into an exact date on the feed below.
          </p>
          <div style={CC({ gap: 6 })}>
            {suggestions.map((s, i) => (
              <div key={`${s.title}-${i}`} style={{ ...glass2({ padding: '10px 12px' }), display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>{s.title}</div>
                  <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2 }}>{fmtDate(s.due_date)} · {s.source}</div>
                </div>
                <button style={btnSm('rgba(255,255,255,0.06)', { color: C.t2 })}
                  onClick={() => addDeadline({ title: s.title, due_date: s.due_date, kind: s.kind, college_id: s.college_id })}>
                  <Plus size={12} />Add
                </button>
              </div>
            ))}
          </div>
        </CalloutCard>
      )}

      {/* Tracked scholarships that can never produce a date because they have none.
          deriveSuggestedDeadlines() skips them by design, which used to mean a student
          who tracked six scholarships saw an empty suggestion list and reasonably
          concluded their deadlines were handled. Name the gap instead. */}
      {dateless.length > 0 && (
        <CalloutCard color={C.amber} icon={CalendarX}
          title={`${dateless.length} tracked scholarship${dateless.length === 1 ? '' : 's'} can't count down yet`}>
          <p style={{ fontSize: 11.5, color: C.t2, marginBottom: 12, marginTop: 0, lineHeight: 1.55 }}>
            {dateless.length === 1 ? 'This one is' : 'These are'} tracked on your Financial Aid tab but {dateless.length === 1 ? 'has' : 'have'} no
            deadline date, so {dateless.length === 1 ? 'it' : 'they'} can't appear below. Add the real date from the program's site on the
            Financial Aid tab — we don't guess deadlines.
          </p>
          <div style={CC({ gap: 6 })}>
            {dateless.slice(0, 8).map(s => (
              <div key={s.id} style={{ ...glass2({ padding: '9px 12px' }), fontSize: 12.5, color: C.t2 }}>{s.name}</div>
            ))}
            {dateless.length > 8 && <div style={{ fontSize: 11, color: C.t3 }}>…and {dateless.length - 8} more</div>}
          </div>
          {onNavigate && (
            <button onClick={() => onNavigate('portfolio', 'aid')} style={btnG({ marginTop: 12, fontSize: 11.5, padding: '7px 14px' })}>
              Open Financial Aid<ArrowRight size={11} />
            </button>
          )}
        </CalloutCard>
      )}

      {/* ── The controls for the feed ── lens, category, month. */}
      <div style={CC({ gap: 10 })}>
        <div style={R({ gap: 7, flexWrap: 'wrap' })}>
          {LENSES.map(l => {
            const on = lens === l.id;
            const Ic = l.icon;
            const col = l.id === 'mine' ? C.violet : l.id === 'generated' ? C.sky : accent;
            return (
              <button key={l.id} onClick={() => setLens(l.id)} aria-pressed={on} style={{
                ...pill(on ? tint(col, 0.18) : C.s3, on ? col : C.t3, {
                  fontSize: 11, gap: 5, fontWeight: 700, padding: '5px 13px',
                  border: `1px solid ${on ? tint(col, 0.42) : C.b1}`,
                }),
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
              }}>
                <Ic size={11} />{l.label}
                {l.id === 'mine' && <b style={{ marginLeft: 4, fontFamily: C.FM, opacity: 0.75 }}>{stats.fromYourData}</b>}
                {l.id === 'generated' && <b style={{ marginLeft: 4, fontFamily: C.FM, opacity: 0.75 }}>{stats.generated}</b>}
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          {filtersOn && (
            <button onClick={clearFilters} style={{ ...btnSm(C.s3, { fontSize: 11, color: C.t3, padding: '5px 12px' }) }}>
              <X size={11} />Clear filters
            </button>
          )}
        </div>

        {LENSES.find(l => l.id === lens)?.blurb && (
          <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>{LENSES.find(l => l.id === lens).blurb}</div>
        )}

        {kindsPresent.length > 1 && (
          <div style={R({ gap: 7, flexWrap: 'wrap' })}>
            <button onClick={() => setKindFilter(null)} style={{
              ...pill(kindFilter ? C.s3 : tint(accent, 0.16), kindFilter ? C.t3 : accent, { fontSize: 10.5, gap: 5, border: `1px solid ${kindFilter ? C.b1 : tint(accent, 0.35)}` }),
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
            }}><Filter size={10} />All categories</button>
            {kindsPresent.map(k => {
              const col = C[k.colorKey] || C.blue;
              const on = kindFilter === k.id;
              const Ic = KIND_ICON[k.id] || CalendarDays;
              return (
                <button key={k.id} onClick={() => setKindFilter(on ? null : k.id)} title={k.blurb} aria-pressed={on} style={{
                  ...pill(on ? tint(col, 0.18) : C.s3, on ? col : C.t3, { fontSize: 10.5, gap: 5, border: `1px solid ${on ? tint(col, 0.4) : C.b1}` }),
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                }}><Ic size={10} />{k.label}</button>
              );
            })}
          </div>
        )}

        <MonthStrip events={stripEvents} active={monthFilter} onPick={setMonthFilter} accent={accent} />
      </div>

      {filteredGroups.length === 0 && (
        <EmptyNote accent={accent} icon={filtersOn ? ListChecks : CalendarDays}
          text={filtersOn
            ? 'Nothing matches those filters. Clear them to see the rest of your timeline.'
            : yoursCount === 0
              ? "Nothing is on your timeline yet. Add a date above, or start from the four dates almost every applicant shares — you can edit or delete any of them afterwards."
              : 'Nothing is coming up. Everything you are tracking is either already handled or behind you.'}
          cta={filtersOn
            ? { label: 'Clear filters', onClick: clearFilters }
            : yoursCount === 0 && !loading
              ? { label: seeding ? 'Adding…' : 'Add the common admissions dates', onClick: seedDefaults }
              : null} />
      )}

      {filteredGroups.map(group => (
        <MilestoneGroup key={group.key} group={group} accent={accent} openId={openId} setOpenId={setOpenId}
          onGo={go} onDelete={removeDeadline} isMobile={isMobile} />
      ))}

      {/* Already handled — kept out of the feed so it reads as work left, but
          visible on demand so the student can see the engine noticing. */}
      {timeline.done.length > 0 && (
        <CollapsibleList
          title={`Already handled (${timeline.done.length})`} icon={CheckCircle2} color={C.green}
          open={showDone} onToggle={() => setShowDone(v => !v)}
          blurb="Milestones your logged data already satisfies. Nothing here is nagging you — it's the app noticing you're ahead."
          items={timeline.done.filter(e => !hidden.has(e.id))} onGo={go} onDelete={removeDeadline} />
      )}

      {timeline.past.length > 0 && (
        <CollapsibleList
          title={`Your record (${timeline.past.length})`} icon={History} color={C.t3}
          open={showPast} onToggle={() => setShowPast(v => !v)}
          blurb="Everything already behind you — hours logged, scores earned, dates that have passed."
          items={timeline.past.filter(e => !hidden.has(e.id))} onGo={go} onDelete={removeDeadline} dim />
      )}

      {visibleUpcoming.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={exportCalendar} style={btnG({ fontSize: 12, padding: '9px 18px' })}>
            <CalendarPlus size={13} />Export {timeline.upcoming.filter(e => e.days >= 0).length} upcoming to your calendar
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

function Hero({ accent, timeline, isMobile, onExport }) {
  const stats = timeline?.stats;
  const next = timeline?.next;
  const gradeLabel = timeline?.gradeLabel;
  const gradYear = timeline?.years?.gradYear;
  return (
    <PanelHero tourTag="portfolio-deep-milestones" icon={Milestone} color={accent} color2={C.rose} m={isMobile}
      eyebrow="Portfolio"
      title="Milestones"
      sub={gradeLabel
        ? `Every dated thing in your application, in one feed — your own deadlines merged with the dates a ${gradeLabel.toLowerCase()}${gradYear ? `, class of ${gradYear},` : ''} on your track actually has to care about, and nothing from four years away.`
        : 'Every deadline, test date, and milestone in one chronological feed. Add your own dates below; set your class year in Settings and the rest of the admissions calendar fills in around them.'}
      stats={stats ? [
        { value: stats.upcoming, label: 'ahead', color: C.skyL },
        ...(stats.missed ? [{ value: stats.missed, label: 'slipped', color: C.roseL }] : []),
        ...(stats.done ? [{ value: stats.done, label: 'handled', color: C.greenL }] : []),
        ...(next ? [{ value: next.days === 0 ? 'today' : `${next.days}d`, label: 'to next', color: next.days <= 14 ? C.amberL : C.indigoL }] : []),
      ] : []}
      right={onExport && (
        <button onClick={onExport} title="Download an .ics file of everything upcoming" style={btnSm(tint(accent, 0.18), { color: onTint(accent), fontSize: 11.5, border: `1px solid ${tint(accent, 0.32)}` })}>
          <CalendarPlus size={12} />Export
        </button>
      )} />
  );
}

/**
 * Meta Brain's urgency read. Extracted into a hook because the effect's
 * dependency discipline is the entire correctness story: askMedabrain is a plain
 * closure App.jsx recreates every render, so making it a dependency would refire
 * this (and risk a duplicate in-flight Groq call) on any unrelated re-render.
 * cacheKey alone captures everything that should trigger a refetch — the day
 * rolling over, or the actual list of dates changing.
 */
function useBrainTake(askMedabrain, events) {
  const [summary, setSummary] = useState(null);
  const cacheKey = useMemo(
    () => dailyKey('milestonesPriority', events.map(e => `${e.title}:${e.date}`).join('|')),
    [events]
  );
  const fetchedKeyRef = useRef(null);

  useEffect(() => {
    if (!askMedabrain || events.length === 0) { setSummary(null); return undefined; }
    const cached = getCached(cacheKey);
    if (cached) { setSummary({ loading: false, content: cached, error: null }); fetchedKeyRef.current = cacheKey; return undefined; }
    if (fetchedKeyRef.current === cacheKey) return undefined;
    fetchedKeyRef.current = cacheKey;
    let cancelled = false;
    setSummary({ loading: true, content: null, error: null });
    const list = events
      .map(e => `"${e.title}" ${e.days < 0 ? `${Math.abs(e.days)}d OVERDUE` : `in ${e.days}d`} (${e.kind}${e.confidence === 'typical' ? ', typical date — not confirmed' : ', their own exact date'})`)
      .join('; ');
    askMedabrain(`Here is this student's real upcoming Milestones feed, soonest first: ${list}. In 2-3 concise sentences, tell them what to prioritize this week and why. Only reference milestones from this exact list — never invent one. If you cite a date marked "typical", say it still needs confirming on the official site.`)
      .then(content => { if (!cancelled) { setCached(cacheKey, content); setSummary({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) { fetchedKeyRef.current = null; setSummary({ loading: false, content: null, error: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, see comment above
  }, [cacheKey]);

  return summary;
}

function BrainTake({ summary }) {
  if (!summary) return null;
  return (
    <div style={{ ...glass2({ padding: 16 }), background: `linear-gradient(120deg,${tint(C.violet, 0.08)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.violet, 0.25)}` }}>
      <div style={R({ gap: 8, marginBottom: summary.loading ? 0 : 8 })}>
        <Sparkles size={13} color={C.violetL} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.violetL, textTransform: 'uppercase', letterSpacing: '.06em' }}>Meta Brain's take</span>
      </div>
      {summary.loading && <div style={R({ gap: 8, color: C.t3, fontSize: 12 })}><Loader2 size={13} className="spin" />Weighing what's most urgent…</div>}
      {summary.error && <div style={{ fontSize: 12, color: C.t3 }}>Couldn't reach Meta Brain right now — the timeline below is still accurate.</div>}
      {summary.content && !summary.loading && <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(summary.content) }} />}
    </div>
  );
}

/** The composer. Collapsed by default — this tab is mostly for reading. */
function AddMilestone({ accent, open, setOpen, onAdd }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [kind, setKind] = useState('custom');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      const res = await onAdd({ title: title.trim(), due_date: date, kind });
      if (res?.status !== 'duplicate') { setTitle(''); setDate(''); setKind('custom'); }
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        ...glass({ padding: '13px 18px' }),
        background: `linear-gradient(120deg,${tint(accent, 0.07)},rgba(255,255,255,0.02) 55%)`,
        border: `1px dashed ${tint(accent, 0.34)}`,
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', width: '100%',
        textAlign: 'left', font: 'inherit', color: 'inherit',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: tint(accent, 0.14), border: `1px solid ${tint(accent, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={14} color={accent} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>Add your own date</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>A supplement, an interview, a program application — anything with a date lands in the feed below and on your Home dashboard.</div>
        </div>
      </button>
    );
  }

  return (
    <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(accent, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.2)}` }}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 12 })}>
        <SectionTitle icon={Plus} color={accent} extra={{ marginBottom: 0 }}>Add your own date</SectionTitle>
        <button onClick={() => setOpen(false)} aria-label="Close" style={btnSm(C.s3, { color: C.t3, padding: '5px 10px' })}><X size={12} /></button>
      </div>
      <form onSubmit={submit} style={R({ gap: 10, flexWrap: 'wrap' })}>
        <input style={inp({ flex: 1, minWidth: 180 })} placeholder="e.g. Stanford EA deadline" value={title} onChange={e => setTitle(e.target.value)} />
        <input type="date" aria-label="Date" style={inp({ width: 'auto' })} value={date} onChange={e => setDate(e.target.value)} />
        <select aria-label="Category" style={inp({ width: 'auto' })} value={kind} onChange={e => setKind(e.target.value)}>
          {DEADLINE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <button type="submit" disabled={saving || !title.trim() || !date} style={btn(accent !== C.blue ? accent : C.blueGrad, { opacity: saving || !title.trim() || !date ? 0.55 : 1 })}>
          {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}Add
        </button>
      </form>
    </div>
  );
}

/**
 * The next twelve months as a density strip. A chronological feed is honest but
 * flat — this is the one view that answers "when does this year actually get
 * heavy", and doubles as the month filter.
 */
function MonthStrip({ events, active, onPick, accent }) {
  const months = useMemo(() => {
    const now = new Date();
    const out = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, label: MONTH_SHORT[d.getMonth()], year: d.getFullYear(), count: 0, urgent: 0 });
    }
    const byKey = Object.fromEntries(out.map(m => [m.key, m]));
    events.forEach(e => {
      const m = byKey[e.date.slice(0, 7)];
      if (!m) return;
      m.count += 1;
      if (e.weight >= 3) m.urgent += 1;
    });
    return out;
  }, [events]);

  const peak = Math.max(1, ...months.map(m => m.count));
  if (!months.some(m => m.count)) return null;

  return (
    <div style={{ ...glass2({ padding: '12px 14px' }), overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', minWidth: 480 }}>
        {months.map(m => {
          const on = active === m.key;
          const col = m.urgent ? C.rose : m.count ? accent : C.t4;
          const h = m.count ? 8 + Math.round((m.count / peak) * 26) : 3;
          return (
            <button key={m.key}
              onClick={() => onPick(on ? null : m.count ? m.key : null)}
              disabled={!m.count}
              aria-pressed={on}
              title={m.count ? `${m.count} in ${m.label} ${m.year}${m.urgent ? ` · ${m.urgent} critical` : ''}` : `Nothing in ${m.label} ${m.year}`}
              style={{
                all: 'unset', flex: 1, minWidth: 30, cursor: m.count ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                opacity: m.count ? 1 : 0.4,
              }}>
              <span style={{ fontSize: 9.5, fontFamily: C.FM, color: on ? col : C.t3 }}>{m.count || ''}</span>
              <span style={{
                width: '100%', height: h, borderRadius: 4,
                background: m.count ? `linear-gradient(180deg,${tint(col, on ? 0.85 : 0.5)},${tint(col, on ? 0.5 : 0.2)})` : C.b1,
                border: on ? `1px solid ${tint(col, 0.7)}` : '1px solid transparent',
              }} />
              <span style={{ fontSize: 9.5, color: on ? col : C.t3, fontWeight: on ? 700 : 500 }}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneGroup({ group, accent, openId, setOpenId, onGo, onDelete, isMobile }) {
  const missed = group.key === 'missed';
  const color = missed ? C.rose : accent;
  return (
    <div style={{
      ...glass({ padding: isMobile ? 14 : 18 }),
      background: `linear-gradient(160deg,${tint(color, missed ? 0.09 : 0.05)},rgba(255,255,255,0.02) 45%)`,
      border: missed ? `1px solid ${tint(C.rose, 0.3)}` : undefined,
    }}>
      <SectionTitle icon={missed ? AlertTriangle : Hourglass} color={color}>{group.label} ({group.items.length})</SectionTitle>
      {group.blurb && <div style={{ fontSize: 11.5, color: C.t3, marginTop: -8, marginBottom: 14, lineHeight: 1.55 }}>{group.blurb}</div>}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: 10, bottom: 10, width: 2, background: `linear-gradient(180deg,${tint(color, 0.35)},${tint(color, 0.04)})`, borderRadius: 2 }} />
        <div style={CC({ gap: 8 })}>
          {group.items.map(e => (
            <MilestoneRow key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} onGo={onGo} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MilestoneRow({ e, open, onToggle, onGo, onDelete, dim = false }) {
  const meta = STATUS_META[e.status] || STATUS_META.upcoming;
  const col = meta.color(e.kind);
  const kc = kindColor(e.kind);
  const Ic = KIND_ICON[e.kind] || CalendarDays;
  const StatusIcon = meta.icon;
  const pressing = e.status === 'missed' || e.status === 'today' || e.status === 'soon';
  // Only a row backed by a real `deadlines` row is editable here. Everything
  // else is derived from a panel that owns it, and duplicating the edit would
  // mean two places to change one date.
  const owned = !!e.ownerRef && !!onDelete;

  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative', paddingLeft: 34, opacity: dim ? 0.6 : 1 }}>
      <div style={{
        position: 'absolute', left: 8, top: 16, width: 14, height: 14, borderRadius: '50%',
        background: C.s1, border: `2.5px solid ${col}`, boxShadow: pressing ? `0 0 9px ${tint(col, 0.6)}` : 'none',
      }} />
      <div style={{
        ...glass2({ padding: '11px 13px', flex: 1, minWidth: 0 }),
        background: `linear-gradient(120deg,${tint(kc, 0.06)},rgba(255,255,255,0.02) 60%)`,
        border: `1px solid ${pressing ? tint(col, 0.4) : C.b1}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onToggle} style={{
            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, boxSizing: 'border-box',
          }} aria-expanded={open}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(kc, 0.13), border: `1px solid ${tint(kc, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic size={13} color={kc} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, lineHeight: 1.35 }}>{e.title}</div>
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span>{fmtDate(e.date)}</span>
                {meta.label && <span style={{ color: col, fontWeight: 700 }}>· {e.status === 'missed' ? `${countdown(e.days)} — still open` : countdown(e.days)}</span>}
                {!meta.label && e.days >= 0 && <span>· {countdown(e.days)}</span>}
                {e.doneLabel && <span style={pill(tint(C.green, 0.14), C.greenL, { fontSize: 9 })}>{e.doneLabel}</span>}
                {e.confidence === 'typical' && <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical</span>}
                {e.confidence === 'exact' && e.source === 'profile' && <span style={pill(tint(C.sky, 0.12), C.skyL, { fontSize: 9 })}>yours</span>}
              </div>
            </div>
            {StatusIcon && <StatusIcon size={13} color={col} style={{ flexShrink: 0 }} />}
            <ChevronRight size={13} color={C.t3} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {owned && (
            <button onClick={() => onDelete(e.ownerRef, e.id)} aria-label={`Remove ${e.title}`} title="Remove this date"
              style={btnSm(C.roseDim, { color: C.rose, padding: '5px 9px', flexShrink: 0 })}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
        {open && (
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.b1}` }}>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{e.detail}</div>
            {e.why && (
              <div style={{ marginTop: 9, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Sparkles size={11} color={C.violetL} style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, fontStyle: 'italic' }}>{e.why}</div>
              </div>
            )}
            {e.action && onGo && (
              <button onClick={() => onGo(e.action)} style={btnSm(C.s3, { marginTop: 11, fontSize: 11.5, gap: 6 })}>
                {e.action.label}<ArrowRight size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleList({ title, icon: Icon, color, open, onToggle, blurb, items, onGo, onDelete, dim = false }) {
  if (!items.length) return null;
  return (
    <div style={glass({ padding: 18 })}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 8 }} aria-expanded={open}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>{title}</span>
        <ChevronRight size={14} color={C.t3} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          {blurb && <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 12, lineHeight: 1.55 }}>{blurb}</div>}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: 10, bottom: 10, width: 2, background: tint(color, 0.18), borderRadius: 2 }} />
            <div style={CC({ gap: 8 })}>
              {items.map(e => <MilestoneRow key={e.id} e={e} open={false} onToggle={() => {}} onGo={onGo} onDelete={onDelete} dim={dim} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalloutCard({ color, icon, title, right, children }) {
  return (
    <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(color, 0.07)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(color, 0.24)}` }}>
      <div style={R({ justifyContent: 'space-between', marginBottom: right ? 12 : 0, gap: 10, flexWrap: 'wrap' })}>
        <SectionTitle icon={icon} color={color} extra={{ marginBottom: right ? 0 : 12 }}>{title}</SectionTitle>
        {right}
      </div>
      {children}
    </div>
  );
}

function EmptyNote({ accent, icon: Icon = CalendarDays, text, cta }) {
  return (
    <div style={glass({ padding: 26, textAlign: 'center' })}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon size={20} color={accent} />
      </div>
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.65, maxWidth: 520, margin: '0 auto' }}>{text}</div>
      {cta && <button onClick={cta.onClick} style={btnG({ marginTop: 14, fontSize: 12, padding: '8px 16px' })}>{cta.label}</button>}
    </div>
  );
}

const truncate = (s, n) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));

// ─────────────────────────────────────────────────────────────────────────────
// The Home-page card.
//
// Home used to show a single "next deadline" countdown built only from rows the
// student had typed in — so a student who had typed nothing (which is most of
// them, and all of the freshmen) got told they had no deadlines, which was
// false. This shows the same merged feed the Milestones tab shows, trimmed to
// what is genuinely next, so the dashboard is reminding them of real dates on
// day one and the two surfaces cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────
export function TimelineNextCard({ user, accent = C.blue, onNavigate, limit = 4 }) {
  const timeline = useTimeline(user);
  if (!timeline) return null;

  const { stats, gradeLabel } = timeline;
  const items = timeline.upcoming.slice(0, limit);

  if (!items.length) {
    return (
      <div style={{ ...glass({ padding: 16 }), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: C.t2 }}>
          {gradeLabel ? 'Nothing is coming up on your timeline yet — add your colleges and deadlines and it fills in.' : 'Set your class year in Settings and your application timeline builds itself.'}
        </div>
        {onNavigate && <button style={btnG({ fontSize: 12, padding: '8px 16px' })} onClick={() => onNavigate('portfolio', 'milestones')}>Open Milestones</button>}
      </div>
    );
  }

  const lead = items[0];
  const leadUrgent = lead.days <= 14 || lead.status === 'missed';
  const leadColor = lead.status === 'missed' ? C.roseL : leadUrgent ? C.amberL : kindColor(lead.kind);

  return (
    <div style={{ ...glass({ padding: 18 }), border: leadUrgent ? `1px solid ${tint(leadColor, 0.4)}` : undefined }}>
      <div style={R({ gap: 8, marginBottom: 12 })}>
        <Milestone size={14} color={leadColor} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>What's next</span>
        {gradeLabel && <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>{gradeLabel}</span>}
        <span style={{ flex: 1 }} />
        {onNavigate && (
          <button onClick={() => onNavigate('portfolio', 'milestones')} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {stats.upcoming} ahead<ChevronRight size={12} />
          </button>
        )}
      </div>

      <div style={R({ gap: 10, alignItems: 'baseline', marginBottom: 2 })}>
        <span style={{ fontSize: 28, fontWeight: 800, color: leadColor, fontFamily: C.FD }}>
          {lead.status === 'missed' ? '!' : lead.days === 0 ? 'Today' : lead.days}
        </span>
        {lead.days > 0 && <span style={{ fontSize: 12, color: C.t3 }}>day{lead.days === 1 ? '' : 's'} until</span>}
        {lead.status === 'missed' && <span style={{ fontSize: 12, color: C.roseL }}>{countdown(lead.days)} and still open</span>}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{lead.title}</div>
      <div style={{ fontSize: 11, color: C.t3, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{fmtDate(lead.date)}</span>
        {lead.confidence === 'typical' && <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical date</span>}
      </div>
      {lead.why && <div style={{ fontSize: 11.5, color: C.t2, marginTop: 8, lineHeight: 1.6 }}>{lead.why}</div>}
      {(lead.action || lead.ownerRef) && onNavigate && (
        <button
          onClick={() => (lead.action ? onNavigate(lead.action.tab, lead.action.view) : onNavigate('portfolio', 'milestones'))}
          style={btnSm(C.s3, { marginTop: 12, fontSize: 11.5, gap: 6 })}>
          {lead.action?.label || 'Open Milestones'}<ArrowRight size={11} />
        </button>
      )}

      {items.length > 1 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(1).map(e => {
            const col = kindColor(e.kind);
            const Ic = KIND_ICON[e.kind] || CalendarDays;
            return (
              <button key={e.id} onClick={() => onNavigate?.(e.action?.tab || 'portfolio', e.action?.view || 'milestones')} style={{
                all: 'unset', cursor: onNavigate ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 9,
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: tint(col, 0.13), border: `1px solid ${tint(col, 0.26)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic size={10} color={col} />
                </div>
                <span style={{ fontSize: 12, color: C.t2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                <span style={{ fontSize: 10.5, color: e.days <= 14 ? C.amberL : C.t3, fontFamily: C.FM, flexShrink: 0 }}>{e.days === 0 ? 'today' : `${e.days}d`}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
