import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Map as MapIcon, Sparkles, RefreshCw, CalendarDays, Compass, ListChecks, Target,
  AlertTriangle, ShieldQuestion, Lightbulb, Plus, Download, History, Trash2,
  ChevronRight, Layers, Scale, Quote, X, Info, CheckCircle2,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, G, tint, pill, accentFill, onTint, autoGrid, inp } from '../../lib/theme';
import SubNav from '../ui/SubNav';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import EmptyState from '../ui/EmptyState';
import BrandJourney from '../BrandJourney';
import { downloadIcs } from '../../lib/icsExport';
import { TRACK_BY_ID } from '../../data/roadmap/index.js';
import * as RoadmapStore from '../../lib/roadmap/store';
import * as DB from '../../lib/db';
import { fetchPortfolio } from '../PlansTab';
import { buildProfileFactsText } from '../../lib/masterPlanGenerator';
import { intakeProgress } from '../../lib/roadmap/intake';
import {
  createRoadmap, deepenSeason, seasonNeedingDepth,
} from '../../lib/roadmap/generator';
import {
  allItems, itemsInSeason, currentSeason, nextActions, roadmapStats, roadmapToCalendarEvents,
  toggleItemDone, setItemStatus, setItemDate, moveItemToSeason, toggleItemStep,
  addStudentItem, removeItem, itemUrgency, effectiveDue, roadmapIsStale, roadmapIsExpired,
  roadmapFingerprint, validateSlate, OPEN_STATUSES, URGENCY_ORDER,
} from '../../lib/roadmap/model';
import RoadmapIntake from './RoadmapIntake';
import RoadmapItem from './RoadmapItem';
import RoadmapSpine from './RoadmapSpine';
import { DegradedNotice, TrackChip, UrgencyChip, Chip, trackColor, fmtDate, URGENCY_META } from './roadmapUi';
import { dayKey } from '../../lib/timeline';

// ─────────────────────────────────────────────────────────────────────────────
// The Roadmap tab.
//
// The product thesis, stated once: a private admissions counselor costs several
// thousand dollars a year and the students who most need one are exactly the
// students who will never have one. What that counselor actually does is not
// mystical — they know which deadlines exist, they know which ones apply to
// THIS student, they know how far ahead the work has to start, and they say so
// out loud a season before it matters. This tab does that, for free, for anyone.
//
// ── The five views, and why each exists ─────────────────────────────────────
//   overview — the answer to "what do I do now", plus the year's thesis and the
//              honest read-back. If a student only ever opens one screen in this
//              tab, this is the one that has to be worth it.
//   year     — the spine. The only view that answers "when does my year get
//              hard", months before it does.
//   seasons  — the strategy, quarter by quarter, with the items inside each.
//   list     — everything, filterable. The reference view for someone who knows
//              what they are looking for.
//   intake   — the thirteen answers, editable, because the roadmap is only as
//              good as its inputs and those change.
//
// ── What this tab is NOT allowed to do ──────────────────────────────────────
// Print a raw date. Every date on every one of these screens goes through
// <ItemDate>/dateCaption (see roadmapUi.jsx). scripts/verifyRoadmap.mjs greps
// this folder and fails the build on a raw interpolation.
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = C.violet;

export const ROADMAP_SUBNAV = [
  { id: 'overview', ic: Compass, label: 'Overview', color: C.violet },
  { id: 'year', ic: CalendarDays, label: 'Your Year', color: C.sky },
  { id: 'seasons', ic: Layers, label: 'Seasons', color: C.teal },
  { id: 'list', ic: ListChecks, label: 'Everything', color: C.amber },
  { id: 'intake', ic: Target, label: 'Your Answers', color: C.fuchsia },
];

// Stage labels while a build runs. Written to describe what is genuinely
// happening at each point rather than to imply it is nearly finished — the same
// discipline PlansTab's LOADING_STAGES adopted after the fast-and-generic
// failure mode it documents.
const BUILD_FALLBACK_STAGES = [
  'Reading your answers and your whole Portfolio…',
  'Working out what this year should actually be about…',
  'Choosing the competitions, programs and deadlines that fit you…',
  'Writing the working detail, season by season…',
  'Reading it back and being honest about it…',
];

/**
 * The student's whole Portfolio, and the digest built from it.
 *
 * Same self-fetch pattern PlansTab uses, and deliberately the SAME fetchPortfolio and the SAME
 * buildProfileFactsText — a second, drifting copy of "everything we know about this student" is
 * exactly how one of the two generators ends up blind to a category the other can see. The
 * roadmap needs every college, essay, logged hour and activity for the same reason the master
 * plan does: a roadmap that cannot see the six colleges already on their list cannot back-plan
 * from those colleges' deadlines, which is the entire point of asking.
 *
 * `ensure()` re-fetches right before a build so the roadmap is designed against the Portfolio as
 * it is at click time, not as it was when the tab mounted.
 */
function usePortfolioFacts(user, liveSignals) {
  const [portfolio, setPortfolio] = useState(null);
  const inFlight = useRef(null);
  const mounted = useRef(true);

  const load = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const p = fetchPortfolio()
      .then((data) => { if (mounted.current) setPortfolio(data); return data; })
      .catch(() => null)
      .finally(() => { inFlight.current = null; });
    inFlight.current = p;
    return p;
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  const facts = useMemo(
    () => (user ? buildProfileFactsText(user, liveSignals || {}, portfolio, user?.masterPlan || null) : null),
    [user, liveSignals, portfolio],
  );

  const ensureFacts = useCallback(async () => {
    const fresh = (await load()) || portfolio || null;
    return {
      portfolio: fresh,
      facts: user ? buildProfileFactsText(user, liveSignals || {}, fresh, user?.masterPlan || null) : null,
    };
  }, [load, portfolio, user, liveSignals]);

  return { portfolio, facts, ensureFacts };
}

export default function RoadmapTab({
  user, saveUser, liveSignals = null, accent = ACCENT, isMobile = false,
  view = 'overview', onViewChange, goPortfolio, goPlans,
  // The sub-nav is filtered for feature unlocks by App.jsx (visibleItems +
  // unlocks.locked) and rendered here, the same split every other pillar uses.
  // Defaults keep this component usable on its own — in a test, or if a caller
  // forgets — rather than rendering a tab with no way to move around it.
  subnavItems = ROADMAP_SUBNAV, hrefFor = null, lockedItem = null,
}) {
  const roadmap = user?.roadmap || null;
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState(BUILD_FALLBACK_STAGES[0]);
  const [showIntake, setShowIntake] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [trackFilter, setTrackFilter] = useState('all');
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const deepenRef = useRef(false);
  const today = dayKey();
  const { portfolio, facts: portfolioFacts, ensureFacts } = usePortfolioFacts(user, liveSignals);

  const stats = useMemo(() => (roadmap ? roadmapStats(roadmap, today) : null), [roadmap, today]);
  const upNext = useMemo(() => (roadmap ? nextActions(roadmap, { limit: 5, today }) : []), [roadmap, today]);
  const season = useMemo(() => (roadmap ? currentSeason(roadmap, today) : null), [roadmap, today]);
  const stale = useMemo(() => roadmapIsStale(roadmap, { user, answers: roadmap?.intake || {}, portfolio }), [roadmap, user, portfolio]);
  const expired = useMemo(() => roadmapIsExpired(roadmap, today), [roadmap, today]);
  const balance = useMemo(() => (roadmap ? (roadmap.balance || validateSlate(roadmap)) : null), [roadmap]);

  // ── Persistence ────────────────────────────────────────────────────────────
  // Same "local copy is the working copy" contract the master plan uses: every
  // mutation writes through saveUser (which owns the local DB + progress_sync)
  // and mirrors to the roadmap's own table on a debounce. A failed mirror is
  // invisible to the student because it never gated anything.
  //
  // saveUser REPLACES the user record rather than merging into it (see App.jsx), so every write
  // here spreads the current user first. Passing a bare `{ roadmap }` would silently wipe their
  // name, pathway, onboarding answers and master plan — the kind of bug that looks like a
  // one-field update and is not.
  const commit = useCallback((next, reason = null) => {
    if (!next) return;
    saveUser({ ...user, roadmap: next });
    RoadmapStore.scheduleRoadmapPush(next, reason);
  }, [saveUser, user]);

  // Adopt a newer roadmap from another device on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await RoadmapStore.pullRoadmap(roadmap);
      // Re-read from Dexie rather than closing over `user`: this runs once on mount and the
      // record may have been written by another surface in between. Same reason App.jsx's own
      // plan-window refresh re-reads before saving.
      if (!cancelled && remote) {
        const current = await DB.getUser();
        saveUser({ ...(current || user), roadmap: remote });
      }
    })();
    return () => { cancelled = true; };
    // Intentionally mount-only: this is a sync-on-open, not a subscription, and
    // re-running it on every local mutation would fight the debounced push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Deepening the next season, quietly, when the student reaches it ───────
  // The build only writes working detail for the first two seasons (see
  // createRoadmap) because the back half of a year gets rewritten by life. This
  // is what fills the rest in as it becomes near, so the roadmap keeps writing
  // itself forward instead of thinning out in month seven.
  useEffect(() => {
    if (!roadmap || building || deepenRef.current) return;
    const needs = seasonNeedingDepth(roadmap, today);
    if (!needs) return;
    deepenRef.current = true;
    (async () => {
      try {
        const next = await deepenSeason(roadmap, needs.id, { user, portfolioFacts, lane: user?.id || null });
        if (next !== roadmap) commit(next, `deepened ${needs.label}`);
      } finally {
        deepenRef.current = false;
      }
    })();
  }, [roadmap, building, today, user, portfolioFacts, commit]);

  // ── Build ──────────────────────────────────────────────────────────────────
  const build = useCallback(async (answers) => {
    setBuilding(true);
    setShowIntake(false);
    setStage(BUILD_FALLBACK_STAGES[0]);
    try {
      // Re-read the Portfolio at click time. A student who just added three colleges in another
      // tab and came here to build should have those colleges in the roadmap — and before this,
      // a fast enough click (or a failed first fetch) generated the whole year with the Portfolio
      // invisible, with nothing on screen to say so.
      const { portfolio: fresh, facts } = await ensureFacts();
      const next = await createRoadmap({
        user,
        answers,
        portfolioFacts: facts,
        portfolio: fresh,
        // The key-lane id. Their user id, so this student's whole multi-call
        // build stays on one of the two roadmap Groq accounts — see the
        // ROADMAP_KEYS header in api/groq.js.
        lane: user?.id || user?.email || null,
        onStage: setStage,
      });
      const current = await DB.getUser();
      saveUser({ ...(current || user), roadmap: next });
      await RoadmapStore.flushRoadmapNow(next, 'generated');
      onViewChange?.('overview');
      toast.success(next.generation?.degraded ? 'Roadmap built — but not fully personalised.' : 'Your year is mapped.');
    } catch (err) {
      // createRoadmap is contractually total, so reaching here means something
      // outside it broke. Say so plainly rather than leaving a dead spinner.
      console.error('roadmap build failed:', err);
      toast.error('Could not build your roadmap. Try again in a moment.');
    } finally {
      setBuilding(false);
    }
  }, [user, ensureFacts, saveUser, onViewChange]);

  const rebuild = useCallback(() => {
    if (!roadmap?.intake) { setShowIntake(true); return; }
    build(roadmap.intake);
  }, [roadmap, build]);

  // ── Item mutations ─────────────────────────────────────────────────────────
  const mutate = (fn, reason) => (...args) => commit(fn(roadmap, ...args), reason);
  const onToggleDone = mutate(toggleItemDone, 'toggled an item');
  const onSetStatus = mutate(setItemStatus, 'changed an item status');
  const onSetDate = mutate(setItemDate, 'pinned a real date');
  const onMoveSeason = mutate(moveItemToSeason, 'moved an item');
  const onToggleStep = mutate(toggleItemStep, 'ticked a step');
  const onRemove = mutate(removeItem, 'removed an item');

  const exportCalendar = useCallback(() => {
    const events = roadmapToCalendarEvents(roadmap);
    if (!events.length) { toast('Nothing dated to export yet.'); return; }
    downloadIcs(events, { calendarName: 'MedSchoolPrep Roadmap' });
    toast.success(`${events.length} dates exported.`);
  }, [roadmap]);

  // ── Screens ────────────────────────────────────────────────────────────────

  if (building) return <BuildingScreen stage={stage} accent={accent} isMobile={isMobile} reducedMotion={reducedMotion} />;

  if (showIntake || (!roadmap && view === 'intake')) {
    return (
      <div>
        <PanelHero icon={Target} color={C.fuchsia} color2={accent} eyebrow="Roadmap" m={isMobile}
          title="Thirteen questions" sub="Everything we already know about you is filled in. What is left is the handful of things a counselor would ask in a first meeting — and that nothing else in this app has ever asked." />
        <div style={{ marginTop: 22, maxWidth: 760 }}>
          <RoadmapIntake
            user={user}
            portfolio={portfolio}
            initialAnswers={roadmap?.intake || null}
            accent={accent}
            isMobile={isMobile}
            onComplete={build}
            onCancel={() => setShowIntake(false)}
          />
        </div>
      </div>
    );
  }

  if (!roadmap) return <IntroScreen accent={accent} isMobile={isMobile} onStart={() => setShowIntake(true)} user={user} />;

  const activeView = ROADMAP_SUBNAV.some((n) => n.id === view) ? view : 'overview';
  const viewAccent = ROADMAP_SUBNAV.find((n) => n.id === activeView)?.color || accent;

  const itemProps = {
    today,
    seasons: roadmap.seasons,
    isMobile,
    onToggleDone, onSetStatus, onSetDate, onMoveSeason, onToggleStep, onRemove,
  };

  return (
    <div>
      <PanelHero
        icon={MapIcon} color={accent} color2={C.fuchsia} eyebrow={`${roadmap.gradeLabel} · 12-month roadmap`}
        title={roadmap.headline} sub={roadmap.thesis} m={isMobile}
        stats={[
          { value: `${stats.done}/${stats.total - stats.skipped}`, label: 'done', color: C.green },
          ...(stats.startNow ? [{ value: stats.startNow, label: 'need starting', color: C.amber }] : []),
          ...(stats.missed ? [{ value: stats.missed, label: 'passed', color: C.rose }] : []),
        ]}
      />

      <div style={{ marginTop: 18 }}>
        <SubNav items={subnavItems} active={activeView} onChange={onViewChange} accent={viewAccent} m={isMobile} tourPrefix="roadmap-sub" hrefFor={hrefFor} locked={lockedItem} />
      </div>

      <div style={CC({ gap: 20 })}>
        <DegradedNotice generation={roadmap.generation} onRetry={rebuild} busy={building} />
        {(stale || expired) && (
          <StaleNotice stale={stale} expired={expired} onRebuild={rebuild} onEditAnswers={() => setShowIntake(true)} />
        )}

        {activeView === 'overview' && (
          <OverviewView
            roadmap={roadmap} stats={stats} upNext={upNext} season={season} balance={balance}
            accent={accent} isMobile={isMobile} itemProps={itemProps}
            expandedId={expandedId} setExpandedId={setExpandedId}
            onGoYear={() => onViewChange?.('year')}
            onGoSeasons={() => onViewChange?.('seasons')}
            onExport={exportCalendar}
            onRebuild={rebuild}
          />
        )}

        {activeView === 'year' && (
          <YearView
            roadmap={roadmap} today={today} isMobile={isMobile} accent={C.sky}
            onSelectItem={(id) => { setExpandedId(id); onViewChange?.('list'); }}
            onSelectSeason={() => onViewChange?.('seasons')}
            onExport={exportCalendar}
          />
        )}

        {activeView === 'seasons' && (
          <SeasonsView
            roadmap={roadmap} today={today} isMobile={isMobile} accent={C.teal}
            itemProps={itemProps} expandedId={expandedId} setExpandedId={setExpandedId}
          />
        )}

        {activeView === 'list' && (
          <ListView
            roadmap={roadmap} today={today} isMobile={isMobile} accent={C.amber}
            itemProps={itemProps} expandedId={expandedId} setExpandedId={setExpandedId}
            trackFilter={trackFilter} setTrackFilter={setTrackFilter}
            showDone={showDone} setShowDone={setShowDone}
            adding={adding} setAdding={setAdding}
            onAdd={(draft) => { commit(addStudentItem(roadmap, draft), 'added an item'); setAdding(false); }}
            onExport={exportCalendar}
          />
        )}

        {activeView === 'intake' && (
          <AnswersView roadmap={roadmap} accent={C.fuchsia} onEdit={() => setShowIntake(true)} onRebuild={rebuild} />
        )}
      </div>
    </div>
  );
}

// ── The first screen a student ever sees ─────────────────────────────────────

function IntroScreen({ accent, isMobile, onStart, user }) {
  return (
    <div>
      <PanelHero icon={MapIcon} color={accent} color2={C.fuchsia} eyebrow="Roadmap" m={isMobile}
        title="The next twelve months, mapped"
        sub="Every deadline, competition, program and scholarship that applies to you — with the date it closes, the week the work has to start, and the reason it is on your list at all." />

      <div style={{ ...glass({ padding: isMobile ? 20 : 28, marginTop: 20 }) }}>
        <div style={{ fontSize: 14.5, color: C.t2, lineHeight: 1.8, maxWidth: 700 }}>
          A private admissions counselor costs several thousand dollars a year, and the students who
          need one most are the ones who will never have one. What they actually do is not mysterious:
          they know which deadlines exist, which ones apply to <b style={{ color: C.t1 }}>you</b>, how
          far ahead each one has to start, and they say so a season before it matters.
          <br /><br />
          That is what this is. Thirteen questions — most of them already filled in from what you have
          told us — and then a year built out of real programs with real dates, sequenced so nothing
          arrives too late to act on.
        </div>

        <div style={{ ...autoGrid(230, 12, { marginTop: 24 }) }}>
          <Promise icon={CalendarDays} color={C.sky} title="Real dates, never invented"
            body="Every date comes from a hand-checked catalog. Anything we are not certain of is shown as a window with a link to confirm it — never as a fact." />
          <Promise icon={Target} color={C.amber} title="Start dates, not just deadlines"
            body="A scholarship due in October that needs eight weeks of essays is an August item. That is the whole difference between a calendar and a plan." />
          <Promise icon={Scale} color={C.teal} title="Reaches with backups"
            body="Long shots are named as long shots, and every one gets something achievable beside it. A year of rejections is not a plan." />
          <Promise icon={Quote} color={C.fuchsia} title="Told straight"
            body="It will tell you what your year is betting on and what it does not cover. No flattery — you are going to be judged by strangers on paper." />
        </div>

        <button onClick={onStart} style={{ ...btn(accentFill(accent)), color: onTint(accent), marginTop: 26, fontSize: 15, padding: '13px 26px' }}>
          <Sparkles size={16} /> Start the thirteen questions
        </button>
        <div style={{ fontSize: 11, color: C.t4, marginTop: 12 }}>
          About four minutes{user?.name ? `, ${user.name}` : ''} — most of it is confirming what we already know.
        </div>
      </div>
    </div>
  );
}

function Promise({ icon: Icon, color, title, body }) {
  return (
    <div style={{ background: `linear-gradient(135deg,${tint(color, 0.07)},transparent 75%)`, border: `1px solid ${tint(color, 0.16)}`, borderRadius: 12, padding: '15px 16px' }}>
      <div style={{ ...R({ gap: 8, marginBottom: 8 }) }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.t1 }}>{title}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.65 }}>{body}</div>
    </div>
  );
}

function BuildingScreen({ stage, accent, isMobile, reducedMotion }) {
  return (
    <div style={{ ...glass({ padding: isMobile ? 30 : 56, textAlign: 'center' }) }}>
      {/* The brand journey animation, looping — this is an open-ended wait, and
          it already honours prefers-reduced-motion internally. */}
      <BrandJourney size={isMobile ? 120 : 170} />
      <div style={{ fontSize: isMobile ? 17 : 21, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginTop: 22, letterSpacing: '-.02em' }}>
        Building your year
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          style={{ fontSize: 13, color: C.t3, marginTop: 12, lineHeight: 1.7, maxWidth: 460, marginInline: 'auto' }}
        >
          {stage}
        </motion.div>
      </AnimatePresence>
      <div style={{ fontSize: 11, color: C.t4, marginTop: 22, maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
        This takes a minute or two. It is four separate passes — the strategy, the choices, the
        working detail, and an honest read-back — and it is worth the wait.
      </div>
    </div>
  );
}

function StaleNotice({ stale, expired, onRebuild, onEditAnswers }) {
  return (
    <div style={{
      ...R({ gap: 12, flexWrap: 'wrap' }),
      background: tint(C.sky, 0.09), border: `1px solid ${tint(C.sky, 0.24)}`, borderRadius: 12, padding: '12px 16px',
    }}>
      <Info size={15} color={C.sky} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
        {expired
          ? 'This roadmap is running out of runway — it was built for a year that is nearly up. Rebuild it and it will map the next one.'
          : 'Something that shaped this roadmap has changed — your grade, your college list, or an answer you gave. It is still usable; it is just describing a slightly different you.'}
      </div>
      <div style={R({ gap: 8 })}>
        <button onClick={onEditAnswers} style={btnSm()}>Review answers</button>
        <button onClick={onRebuild} style={{ ...btnSm(tint(C.sky, 0.2), { borderColor: tint(C.sky, 0.4) }) }}>
          <RefreshCw size={12} /> Rebuild
        </button>
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewView({
  roadmap, stats, upNext, season, balance, accent, isMobile, itemProps,
  expandedId, setExpandedId, onGoYear, onGoSeasons, onExport, onRebuild,
}) {
  return (
    <>
      {/* What to do now. First, always, above everything — including above the
          year's strategy. A student opening this tab on a Tuesday needs an
          action, not a thesis. */}
      <div>
        <SectionTitle icon={Sparkles} color={C.amber}>Do this now</SectionTitle>
        {upNext.length ? (
          <div style={CC({ gap: 9 })}>
            {upNext.map((item) => (
              <RoadmapItem key={item.id} item={item} {...itemProps}
                expanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)} />
            ))}
          </div>
        ) : (
          <div style={{ ...glass2({ padding: 18 }), ...R({ gap: 11 }) }}>
            <CheckCircle2 size={17} color={C.green} />
            <span style={{ fontSize: 12.5, color: C.t2 }}>
              Nothing needs starting in the next three weeks. That is a real result — check{' '}
              <button onClick={onGoYear} style={linkish}>your year</button> to see what is coming after that.
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={autoGrid(190, 12)}>
        <StatTile icon={CheckCircle2} value={`${stats.pct}%`} label="of your year done" sub={`${stats.done} of ${stats.total - stats.skipped}`} color={C.green} />
        <StatTile icon={Layers} value={season?.label || '—'} label="this season" sub={season?.theme || ''} color={C.teal} onClick={onGoSeasons} />
        <StatTile icon={Target} value={stats.startNow} label="need starting now" color={stats.startNow ? C.amber : C.t3} />
        <StatTile icon={CalendarDays} value={stats.awaitingDate} label="dates to look up" sub="tap one to pin it" color={stats.awaitingDate ? C.violet : C.t3} />
      </div>

      {/* This season's advice */}
      {season?.advice && (
        <div style={{ ...glass({ padding: 20, background: `linear-gradient(135deg,${tint(C.teal, 0.08)},transparent 70%)`, border: `1px solid ${tint(C.teal, 0.2)}` }) }}>
          <SectionTitle icon={Compass} color={C.teal}>Getting through {season.label}</SectionTitle>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.75 }}>{season.advice}</div>
        </div>
      )}

      {/* The honest read-back. The single most distinctive thing this tab
          produces — a counselor's verdict on their own plan, including what it
          is betting on and what it does not cover. */}
      {roadmap.review && (
        <div style={{ ...glass({ padding: isMobile ? 18 : 24 }) }}>
          <SectionTitle icon={Quote} color={accent}>Straight talk about this plan</SectionTitle>
          {roadmap.review.verdict && (
            <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.8 }}>{roadmap.review.verdict}</div>
          )}
          <div style={{ ...autoGrid(240, 12, { marginTop: 18 }) }}>
            {roadmap.review.ifOnlyOneThing && (
              <Callout icon={Lightbulb} color={C.amber} label="If you do one thing">{roadmap.review.ifOnlyOneThing}</Callout>
            )}
            {roadmap.review.bet && (
              <Callout icon={ShieldQuestion} color={C.fuchsia} label="What this is betting on">{roadmap.review.bet}</Callout>
            )}
          </div>
          {!!roadmap.review.notCovered?.length && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                What this year does not cover
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.t3, lineHeight: 1.75 }}>
                {roadmap.review.notCovered.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Risks the generator named for this specific student. */}
      {!!roadmap.risks?.length && (
        <div>
          <SectionTitle icon={AlertTriangle} color={C.rose}>What will actually derail this</SectionTitle>
          <div style={CC({ gap: 9 })}>
            {roadmap.risks.map((r, i) => (
              <div key={i} style={{ ...glass2({ padding: 15 }) }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 5 }}>{r.title}</div>
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.65 }}>{r.detail}</div>
                {r.mitigation && (
                  <div style={{ ...R({ gap: 7, marginTop: 9 }) }}>
                    <Lightbulb size={12} color={C.green} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{r.mitigation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance warnings from the automated checks — surfaced to the student
          rather than hidden, because "your year leans hard on long shots" is
          something they are entitled to know about their own plan. */}
      {!!balance?.warnings?.length && (
        <div style={{ ...glass2({ padding: 16 }) }}>
          <SectionTitle icon={Scale} color={C.sky}>Shape of your year</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.t3, lineHeight: 1.75 }}>
            {balance.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* What was deliberately left out. Naming this is what makes the rest
          credible — a list that only ever says yes is a list nobody trusts. */}
      {!!roadmap.omitted?.length && (
        <div style={{ ...glass2({ padding: 16 }) }}>
          <SectionTitle icon={X} color={C.t3}>Deliberately not on your list</SectionTitle>
          <div style={CC({ gap: 8 })}>
            {roadmap.omitted.map((o, i) => (
              <div key={i} style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
                <b style={{ color: C.t2 }}>{o.name}</b> — {o.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }) }}>
        <button onClick={onExport} style={btnG({ fontSize: 12 })}><Download size={13} /> Add to my calendar</button>
        <button onClick={onGoYear} style={btnG({ fontSize: 12 })}><CalendarDays size={13} /> See the whole year</button>
        <button onClick={onRebuild} style={btnG({ fontSize: 12 })}><RefreshCw size={13} /> Rebuild</button>
      </div>
    </>
  );
}

function Callout({ icon: Icon, color, label, children }) {
  return (
    <div style={{ background: tint(color, 0.08), border: `1px solid ${tint(color, 0.2)}`, borderRadius: 11, padding: '13px 15px' }}>
      <div style={{ ...R({ gap: 7, marginBottom: 7 }) }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

// ── Year ─────────────────────────────────────────────────────────────────────

function YearView({ roadmap, today, isMobile, accent, onSelectItem, onSelectSeason, onExport }) {
  return (
    <>
      <div style={{ ...glass({ padding: isMobile ? 16 : 22 }) }}>
        <SectionTitle icon={CalendarDays} color={accent}>Your next twelve months</SectionTitle>
        <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7, marginBottom: 18, maxWidth: 640 }}>
          Taller months are busier ones — and the height counts the <b style={{ color: C.t2 }}>preparation</b>,
          not the deadlines, so a wall in March shows up here in January when you can still do something
          about it. Tap any marker to open it.
        </div>
        <RoadmapSpine roadmap={roadmap} today={today} isMobile={isMobile} onSelectItem={onSelectItem} onSelectSeason={onSelectSeason} />
      </div>

      <div style={{ ...glass2({ padding: 16 }) }}>
        <SectionTitle icon={Layers} color={accent}>Month by month</SectionTitle>
        <MonthBreakdown roadmap={roadmap} today={today} onSelectItem={onSelectItem} />
      </div>

      <button onClick={onExport} style={btnG({ fontSize: 12, alignSelf: 'flex-start' })}>
        <Download size={13} /> Add these dates to my calendar
      </button>
    </>
  );
}

function MonthBreakdown({ roadmap, today, onSelectItem }) {
  const byMonth = useMemo(() => {
    const map = new Map();
    allItems(roadmap).filter((i) => i.status !== 'skipped').forEach((i) => {
      const due = effectiveDue(i);
      if (!due) return;
      const k = due.slice(0, 7);
      map.set(k, [...(map.get(k) || []), i]);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [roadmap]);

  if (!byMonth.length) return <div style={{ fontSize: 12, color: C.t4 }}>Nothing dated yet.</div>;

  return (
    <div style={CC({ gap: 14 })}>
      {byMonth.map(([month, items]) => (
        <div key={month}>
          <div style={{ ...R({ gap: 9, marginBottom: 8 }) }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.t1, fontFamily: C.FM }}>{fmtMonthLabel(month)}</span>
            <span style={{ flex: 1, height: 1, background: C.b1 }} />
            <span style={{ fontSize: 10.5, color: C.t4 }}>{items.length} item{items.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {items.map((i) => {
              const u = itemUrgency(i, today);
              const color = i.status === 'done' ? C.green : (URGENCY_META[u]?.color || trackColor(i.track));
              return (
                <button key={i.id} onClick={() => onSelectItem?.(i.id)} style={{
                  ...pill(tint(color, 0.1), C.t1, {
                    fontSize: 11.5, fontWeight: 600, padding: '6px 11px', gap: 6,
                    border: `1px solid ${tint(color, 0.24)}`, cursor: 'pointer', fontFamily: C.FB,
                    textDecoration: i.status === 'done' ? 'line-through' : 'none',
                    opacity: i.status === 'done' ? 0.6 : 1,
                  }),
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {i.title}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtMonthLabel(key) {
  const [y, m] = String(key).split('-').map(Number);
  return y && m ? `${MONTH_LONG[m - 1]} ${y}` : key;
}

// ── Seasons ──────────────────────────────────────────────────────────────────

function SeasonsView({ roadmap, today, isMobile, accent, itemProps, expandedId, setExpandedId }) {
  const current = currentSeason(roadmap, today);
  return (
    <div style={CC({ gap: 18 })}>
      {roadmap.seasons.map((s) => {
        const items = itemsInSeason(roadmap, s.id).sort(byUrgency(today));
        const isNow = s.id === current?.id;
        const done = items.filter((i) => i.status === 'done').length;
        return (
          <div key={s.id} style={{
            ...glass({ padding: isMobile ? 16 : 22 }),
            border: `1px solid ${isNow ? tint(accent, 0.35) : C.b1}`,
            background: isNow ? `linear-gradient(135deg,${tint(accent, 0.07)},transparent 70%)` : C.surf,
          }}>
            <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }) }}>
              <div>
                <div style={{ ...R({ gap: 9 }) }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: isNow ? accent : C.t3, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                    {s.label}
                  </span>
                  {isNow && <span style={{ ...pill(tint(accent, 0.16), accent, { fontSize: 9.5, fontWeight: 800 }) }}>NOW</span>}
                  {!s.deepened && (
                    <span title="The detail for this stretch gets written when you get closer to it — it would be out of date by then otherwise."
                      style={{ ...pill(C.s4, C.t4, { fontSize: 9.5 }) }}>outline</span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginTop: 5, letterSpacing: '-.02em' }}>
                  {s.theme}
                </div>
              </div>
              <span style={{ fontSize: 11, color: C.t4, fontFamily: C.FM }}>{done}/{items.length}</span>
            </div>

            {s.narrative && <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.75, marginBottom: 14, maxWidth: 640 }}>{s.narrative}</div>}
            {s.advice && (
              <div style={{ background: tint(C.teal, 0.07), border: `1px solid ${tint(C.teal, 0.16)}`, borderRadius: 9, padding: '11px 13px', marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{s.advice}</div>
              </div>
            )}

            {items.length ? (
              <div style={CC({ gap: 8 })}>
                {items.map((item) => (
                  <RoadmapItem key={item.id} item={item} {...itemProps} dense
                    expanded={expandedId === item.id}
                    onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)} />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.t4, fontStyle: 'italic' }}>
                Deliberately clear. Not every stretch of a year should have something in it.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

function ListView({
  roadmap, today, isMobile, accent, itemProps, expandedId, setExpandedId,
  trackFilter, setTrackFilter, showDone, setShowDone, adding, setAdding, onAdd, onExport,
}) {
  const items = allItems(roadmap);
  const tracks = useMemo(() => {
    const counts = {};
    items.forEach((i) => { counts[i.track] = (counts[i.track] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = items
    .filter((i) => (trackFilter === 'all' || i.track === trackFilter))
    .filter((i) => (showDone ? true : OPEN_STATUSES.has(i.status)))
    .sort(byUrgency(today));

  return (
    <>
      <div style={{ ...glass2({ padding: 14 }) }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <FilterPill active={trackFilter === 'all'} onClick={() => setTrackFilter('all')} color={accent}>
            All {items.length}
          </FilterPill>
          {tracks.map(([t, n]) => (
            <FilterPill key={t} active={trackFilter === t} onClick={() => setTrackFilter(t)} color={trackColor(t)}>
              {TRACK_BY_ID[t]?.label || t} {n}
            </FilterPill>
          ))}
          <span style={{ flex: 1 }} />
          <label style={{ ...R({ gap: 6 }), fontSize: 11.5, color: C.t3, cursor: 'pointer' }}>
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Show finished
          </label>
        </div>
      </div>

      <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }) }}>
        <button onClick={() => setAdding((a) => !a)} style={btnSm(C.surfHi)}>
          <Plus size={12} /> Add something of your own
        </button>
        <button onClick={onExport} style={btnSm(C.surfHi)}><Download size={12} /> Export dates</button>
      </div>

      {adding && <AddItemForm roadmap={roadmap} onAdd={onAdd} onCancel={() => setAdding(false)} accent={accent} />}

      {visible.length ? (
        <div style={CC({ gap: 9 })}>
          {visible.map((item) => (
            <RoadmapItem key={item.id} item={item} {...itemProps}
              expanded={expandedId === item.id}
              onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={ListChecks} accent={accent} title="Nothing here"
          body={showDone ? 'No items on this track.' : 'Everything on this track is finished — turn on "Show finished" to see it.'} />
      )}
    </>
  );
}

function FilterPill({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      ...pill(active ? tint(color, 0.16) : 'transparent', active ? onTint(color) : C.t3, {
        fontSize: 11, fontWeight: active ? 700 : 500, padding: '5px 11px',
        border: `1px solid ${active ? tint(color, 0.4) : C.b1}`, cursor: 'pointer', fontFamily: C.FB,
      }),
    }}>{children}</button>
  );
}

/**
 * The student's own item.
 *
 * Every roadmap will be missing something — a local award only their counselor
 * knows about, their school's own deadline, a program a teacher mentioned. A
 * roadmap that cannot absorb those is a roadmap they keep a second list beside,
 * and the second list is the one that gets lost.
 */
function AddItemForm({ roadmap, onAdd, onCancel, accent }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [track, setTrack] = useState('application');
  const [note, setNote] = useState('');
  return (
    <div style={{ ...glass({ padding: 18, border: `1px solid ${tint(accent, 0.3)}` }) }}>
      <SectionTitle icon={Plus} color={accent}>Add your own</SectionTitle>
      <div style={CC({ gap: 10 })}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is it? e.g. Rotary Club scholarship" style={inp()} />
        <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }) }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Due date" style={inp({ flex: '1 1 160px', width: 'auto' })} />
          <select value={track} onChange={(e) => setTrack(e.target.value)} aria-label="Type" style={inp({ flex: '1 1 160px', width: 'auto' })}>
            {Object.values(TRACK_BY_ID).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why does this matter? (optional)" style={inp()} />
        <div style={{ ...R({ gap: 9 }) }}>
          <button disabled={!title.trim()} onClick={() => onAdd({ title, date: date || null, track, note })}
            style={{ ...btn(accentFill(accent)), color: onTint(accent), opacity: title.trim() ? 1 : 0.4, fontSize: 13 }}>Add it</button>
          <button onClick={onCancel} style={btnG({ fontSize: 13 })}>Cancel</button>
        </div>
        <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>
          Your date, your item — we will not second-guess either. Leave the date blank if you still
          need to look it up and it will sit in your "dates to find" list.
        </div>
      </div>
    </div>
  );
}

// ── Answers ──────────────────────────────────────────────────────────────────

function AnswersView({ roadmap, accent, onEdit, onRebuild }) {
  const progress = intakeProgress(roadmap.intake || {});
  return (
    <>
      <div style={{ ...glass({ padding: 22 }) }}>
        <SectionTitle icon={Target} color={accent}>What this roadmap was built from</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.75, marginBottom: 18, maxWidth: 640 }}>
          These thirteen answers, plus everything in your Portfolio and everything you told us during
          setup. Change any of them and rebuild — the roadmap is only ever as good as what it knows
          about you, and what it knows about you changes.
        </div>
        <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }) }}>
          <button onClick={onEdit} style={{ ...btn(accentFill(accent)), color: onTint(accent), fontSize: 13 }}>
            <Target size={14} /> Review my answers
          </button>
          <button onClick={onRebuild} style={btnG({ fontSize: 13 })}><RefreshCw size={13} /> Rebuild with these</button>
        </div>
        <div style={{ fontSize: 11, color: C.t4, marginTop: 12 }}>{progress.answered} of {progress.total} answered</div>
      </div>

      {!!roadmap.gaps?.length && (
        <div style={{ ...glass2({ padding: 16 }) }}>
          <SectionTitle icon={ShieldQuestion} color={C.amber}>Things our catalog does not cover</SectionTitle>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7, marginBottom: 10 }}>
            Medabrain flagged these as genuinely relevant to you and absent from the verified
            deadline catalog. We have deliberately not invented dates for them — go and find them,
            then add them to your list yourself.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.t2, lineHeight: 1.8 }}>
            {roadmap.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {roadmap.generation && (
        <div style={{ ...glass2({ padding: 14 }) }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            How this was built
          </div>
          <div style={{ fontSize: 11.5, color: C.t4, lineHeight: 1.7 }}>
            Built {fmtDate(dayKey(new Date(roadmap.generation.at)))} in {roadmap.generation.seconds}s
            across {roadmap.generation.aiCalls} Medabrain pass{roadmap.generation.aiCalls === 1 ? '' : 'es'}.
            Every date came from our verified catalog — Medabrain chose and sequenced, it never wrote a date.
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

const linkish = {
  background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
  color: C.violet, fontWeight: 700, fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline',
};

/** Sort: most urgent first, then by date. Used by every list in the tab. */
const byUrgency = (today) => (a, b) => {
  const ua = URGENCY_ORDER.indexOf(itemUrgency(a, today));
  const ub = URGENCY_ORDER.indexOf(itemUrgency(b, today));
  if (ua !== ub) return ua - ub;
  return String(effectiveDue(a) || '9999').localeCompare(String(effectiveDue(b) || '9999'));
};
