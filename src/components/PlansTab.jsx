import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles, Target, Flag, TrendingUp, ChevronDown, CheckCircle2, Circle, RefreshCw,
  CalendarClock, Map, Clock, ArrowRight, ShieldAlert, ShieldCheck, BookOpen, Layers, Layers3,
  MessageCircle, Award, GraduationCap, ScrollText, CalendarDays, Stethoscope,
  FlaskConical, UserCheck, Moon, Mic, Compass, X, Lock, Undo2,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, R, CC, G, pill } from '../lib/theme';
import { awardXP, BONUS_COPY } from '../lib/rewards';
import { celebrateXP, celebrateBonusXP, celebrateJackpot } from '../lib/celebrate';
import * as speech from '../lib/speech';
import { listItems } from '../lib/dataApi';
import { computePlanReadiness } from '../lib/studentProfile';
import {
  createMasterPlan, extendMasterPlan, regenerateRoadmap, adaptPlanToNotes, pruneRollingWindow, toggleTaskDone,
  needsExtension, getUpcomingDays, getCurrentWeekNumber, getCurrentPhase, todayStr, resolveAllTaskLinks,
  applyDailyRollover, AUTO_VERIFIABLE_KINDS, AUTO_VERIFIABLE_TYPES,
} from '../lib/masterPlanGenerator';

// Same Portfolio resource list + self-fetch pattern PortfolioMedabrain.jsx uses — lets plan
// generation ground itself in the student's ACTUAL colleges/essays/deadlines/activities
// instead of just onboarding answers and summary counts.
const PORTFOLIO_RESOURCES = ['colleges', 'essays', 'deadlines', 'scholarships', 'activities', 'research_experience', 'skills_certifications', 'clinical_hours', 'recommenders', 'test_scores', 'awards', 'gpa_entries'];
function usePortfolioData() {
  const [portfolioData, setPortfolioData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [colleges, essays, deadlines, scholarships, activities, research, skills, clinicalHours, recommenders, testScores, awards, gpaEntries] =
          await Promise.all(PORTFOLIO_RESOURCES.map(r => listItems(r).catch(() => [])));
        if (!cancelled) setPortfolioData({ colleges, essays, deadlines, scholarships, activities, research, skills, clinicalHours, recommenders, testScores, awards, gpaEntries });
      } catch { /* prompt builder treats a missing portfolio as "nothing tracked yet" */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return portfolioData;
}

const PILLAR_META = {
  prep: { color: C.violet, label: 'Prep' },
  portfolio: { color: C.green, label: 'Portfolio' },
  progress: { color: C.cyan, label: 'Progress' },
  rest: { color: C.amber, label: 'Rest & Reflect' },
};
const TYPE_ICON = {
  lesson: BookOpen, quiz: Layers, flashcards: Layers3, reading: BookOpen, coach: MessageCircle,
  activity: Award, college: GraduationCap, essay: ScrollText, deadline: CalendarDays,
  clinical: Stethoscope, research: FlaskConical, recommender: UserCheck, interview: Mic,
  reflection: Sparkles, rest: Moon,
};
const LOADING_STAGES = [
  { at: 0, label: 'Reading your full profile…' },
  { at: 5000, label: 'Mapping every MedSchoolPrep resource to your pathway…' },
  { at: 12000, label: "Medabrain's Oracle is building your roadmap…" },
  { at: 26000, label: 'Writing your day-by-day schedule…' },
  { at: 45000, label: 'Almost there — this is worth the wait…' },
];

function fmtDateLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function relTime(ts) {
  if (!ts) return '';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function PlansTab({ user, saveUser, accent = C.violet, isMobile, goPrep, goPortfolio, goProgress, goSettings, openResource, liveSignals, initialExpandedDate }) {
  const plan = user?.masterPlan || null;
  const portfolioData = usePortfolioData();
  const [view, setView] = useState('week'); // 'week' | 'roadmap'
  const [generating, setGenerating] = useState(false);
  const [stageLabel, setStageLabel] = useState(LOADING_STAGES[0].label);
  const [extending, setExtending] = useState(false);
  const [expandedDay, setExpandedDay] = useState(initialExpandedDate || null);
  const [expandedPhase, setExpandedPhase] = useState(null);

  // PlansTab can stay mounted across a Home → Plans navigation (tab switch alone doesn't
  // remount it), so a fresh initialExpandedDate (e.g. "get a head start on tomorrow") needs to
  // re-apply even when it isn't the very first render.
  useEffect(() => {
    if (initialExpandedDate) setExpandedDay(initialExpandedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExpandedDate]);

  // Daily rollover — runs once per calendar day (guarded by plan.lastRolloverDate inside
  // applyDailyRollover itself), independent of the ~7-day chunk-extension cycle below. This is
  // what actually gets a task missed yesterday onto today's list instead of waiting for the next
  // chunk boundary.
  useEffect(() => {
    if (!plan) return;
    const rolled = applyDailyRollover(plan, user);
    if (rolled !== plan) {
      saveUser({ ...user, masterPlan: rolled });
      const carried = rolled.days.find(d => d.date === todayStr())?.tasks.filter(t => t.rolledOverFrom && t.id.includes('dailyrollover')).length || 0;
      if (carried > 0) toast(`${carried} task${carried > 1 ? 's' : ''} carried over from yesterday.`, { icon: '↻' });
    }
  }, [plan?.days?.length, todayStr()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compact old days into progressLog on load so the synced blob never grows
  // unbounded — and upgrade any plan generated before deep links existed so
  // every task carries a working "open this exact resource" link.
  useEffect(() => {
    if (!plan) return;
    const upgraded = resolveAllTaskLinks(pruneRollingWindow(plan), user, liveSignals || {});
    if (upgraded !== plan) saveUser({ ...user, masterPlan: upgraded });
  }, [plan?.days?.length, plan?.linkVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-extend the rolling window in the background — this is what keeps the plan
  // "continuing to plan" instead of going stale once the generated window runs out. Re-checks
  // on mount (covers "came back after N days away") and again each time daysGeneratedThrough
  // itself moves forward (covers staying on the tab across multiple extend cycles) — `extending`
  // alone is the in-flight guard, so a later cycle can always fire once the previous one lands.
  useEffect(() => {
    if (!plan || extending) return;
    if (!needsExtension(plan)) return;
    setExtending(true);
    extendMasterPlan(plan, user, liveSignals || {})
      .then(updated => saveUser({ ...user, masterPlan: updated }))
      .catch(() => {})
      .finally(() => setExtending(false));
  }, [plan?.daysGeneratedThrough]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBuild() {
    setGenerating(true);
    setStageLabel(LOADING_STAGES[0].label);
    // Drive stage labels off real elapsed time — the actual work is 3 sequential Groq
    // calls (roadmap + 2 day chunks), so a fixed-count interval would drift from reality.
    const start = Date.now();
    const stageTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      const stage = [...LOADING_STAGES].reverse().find(s => elapsed >= s.at);
      if (stage) setStageLabel(stage.label);
    }, 700);
    try {
      const built = await createMasterPlan(user, liveSignals || {}, portfolioData);
      saveUser({ ...user, masterPlan: built });
      toast.success('Your full plan is ready.');
    } catch {
      toast.error("Couldn't build your plan — please try again.");
    } finally {
      clearInterval(stageTimer);
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    if (!window.confirm("Rebuild your roadmap? This refreshes your phases, milestones, and weekly themes based on where you are right now — your upcoming day-by-day tasks stay put.")) return;
    setGenerating(true);
    setStageLabel("Medabrain's Oracle is rebuilding your roadmap…");
    try {
      const updated = await regenerateRoadmap(plan, user, liveSignals || {}, portfolioData);
      saveUser({ ...user, masterPlan: updated });
      toast.success('Roadmap refreshed.');
    } catch {
      toast.error("Couldn't refresh your roadmap — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Manual toggling only ever applies to task types the app has no way to verify happened (see
  // AUTO_VERIFIABLE_KINDS) — quiz/lesson/deck tasks are checked off automatically, for real, from
  // inside those features (App.jsx's applyPlanAutoComplete), and TaskRow below never renders a
  // clickable checkbox for them. toggleTaskDone itself is also exploit-proof now regardless
  // (xpAwarded is a one-way flag), but keeping the checkbox off those types entirely is what
  // actually makes "check it, uncheck it, check it again" impossible rather than just unrewarding.
  function handleToggleTask(date, taskId) {
    const { plan: updated, justEarnedXP } = toggleTaskDone(plan, date, taskId);
    if (!justEarnedXP) { saveUser({ ...user, masterPlan: updated }); return; }
    const { finalXP, tier } = awardXP(6);
    saveUser({ ...user, masterPlan: updated, xp: (user?.xp || 0) + finalXP });
    toast.success(BONUS_COPY[tier] ? BONUS_COPY[tier](finalXP) : `+${finalXP} XP`, { duration: 1800 });
    if (tier === 'jackpot') celebrateJackpot();
    else if (tier === 'big' || tier === 'bonus') celebrateBonusXP();
    else celebrateXP();
  }

  // Prefer the app-provided deep-link opener (launches the exact quiz/lesson/
  // deck/article the task names); plain tab navigation is the fallback.
  function jumpTo(task) {
    if (openResource) { openResource(task); return; }
    const { resourceTab: tab, resourceView: subview } = task || {};
    if (!tab || !subview) return;
    if (tab === 'prep') goPrep?.(subview);
    else if (tab === 'portfolio') goPortfolio?.(subview);
    else if (tab === 'progress') goProgress?.(subview);
  }

  if (generating) return <GeneratingCard label={stageLabel} accent={accent} />;
  if (!plan) {
    const readiness = computePlanReadiness(user);
    if (!readiness.ready) return <LockedState readiness={readiness} accent={accent} isMobile={isMobile} goSettings={goSettings} />;
    return <EmptyState onBuild={handleBuild} accent={accent} isMobile={isMobile} />;
  }

  const weekNumber = getCurrentWeekNumber(plan);
  const phase = getCurrentPhase(plan);
  const upcoming = getUpcomingDays(plan, 14);

  return (
    <div style={CC({ gap: 22 })}>
      <PlanHeader plan={plan} weekNumber={weekNumber} phase={phase} accent={accent} onRegenerate={handleRegenerate} />

      <PlanVoiceNotes user={user} saveUser={saveUser} plan={plan} liveSignals={liveSignals} portfolioData={portfolioData} accent={accent} />

      <div style={{ display: 'flex', gap: 6 }}>
        {[{ id: 'week', label: 'This Week', icon: CalendarClock }, { id: 'roadmap', label: 'Full Roadmap', icon: Map }].map(v => {
          const active = view === v.id;
          return (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999,
              border: active ? `1px solid ${accent}66` : `1px solid ${C.b1}`, background: active ? `${accent}22` : 'rgba(255,255,255,0.02)',
              color: active ? '#fff' : C.t2, fontWeight: active ? 700 : 500, fontSize: 12.5, fontFamily: C.FB, cursor: 'pointer',
            }}>
              <v.icon size={13} color={active ? accent : C.t3} />{v.label}
            </button>
          );
        })}
      </div>

      {view === 'week' ? (
        <WeekView
          plan={plan} upcoming={upcoming} accent={accent} isMobile={isMobile} expandedDay={expandedDay} setExpandedDay={setExpandedDay}
          onToggleTask={handleToggleTask} jumpTo={jumpTo} extending={extending}
        />
      ) : (
        <RoadmapView plan={plan} accent={accent} isMobile={isMobile} expandedPhase={expandedPhase} setExpandedPhase={setExpandedPhase} />
      )}
    </div>
  );
}

// ── Locked state ───────────────────────────────────────────────────────────
// Shown instead of the "Build" CTA when the student is missing one of the six
// core facts (see computePlanReadiness) Medabrain's Oracle needs to build a
// plan it can actually be confident in. Anyone who's been through the current
// onboarding flow already has all six by construction — this only actually
// gates legacy accounts, which is exactly the intended nudge toward Settings.
function LockedState({ readiness, accent, isMobile, goSettings }) {
  return (
    <div data-tour="plans-deep-hero" style={{ ...glass({ padding: 0, overflow: 'hidden', position: 'relative' }), border: `1px solid ${C.amber}30` }}>
      <div style={{ position: 'absolute', inset: 0, background: C.auroraGrad, opacity: 0.05, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', padding: isMobile ? '28px 20px' : '46px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.amber}20`, border: `1.5px solid ${C.amber}45`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={26} color={C.amberL} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: C.amberL, marginBottom: 8 }}>Almost ready</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: 0 }}>A few things first</h2>
        </div>
        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.7, maxWidth: 460, margin: 0 }}>
          Medabrain's Oracle builds the best possible plan when it actually knows where you stand — not too much, just enough to be confident. Fill these in and your plan unlocks:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
          {readiness.missing.map(m => (
            <div key={m.field} style={{ ...glass2({ padding: '10px 14px' }), display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <Circle size={13} color={C.amberL} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>{m.label}</span>
            </div>
          ))}
        </div>
        <button style={btn(C.auroraGrad, { padding: '13px 28px', fontSize: 14 })} onClick={() => goSettings?.()}>
          Update My Profile
        </button>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onBuild, accent, isMobile }) {
  return (
    <div data-tour="plans-deep-hero" style={{ ...glass({ padding: 0, overflow: 'hidden', position: 'relative' }), border: `1px solid ${C.violet}30` }}>
      <div style={{ position: 'absolute', inset: 0, background: C.auroraGrad, opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', padding: isMobile ? '28px 20px' : '46px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.auroraGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 30px ${C.violet}45` }}>
          <CalendarClock size={28} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: C.violetL, marginBottom: 8 }}>Medabrain Oracle · Plans</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: 0 }}>Build your full plan</h2>
        </div>
        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.7, maxWidth: 480, margin: 0 }}>
          A complete, day-by-day roadmap built from your whole profile — grounded in every real resource MedSchoolPrep has: your pathway units, the quiz library, flashcards, the E-Library, and every Portfolio tool. Phases and milestones for the months ahead, plus real daily tasks that roll forward as you go — and update as your progress does.
        </p>
        <button style={btn(C.auroraGrad, { padding: '13px 28px', fontSize: 14 })} onClick={onBuild}>
          <Sparkles size={15} />Build My Full Plan
        </button>
        <div style={{ fontSize: 11, color: C.t3 }}>Takes about 20-40 seconds — Medabrain's deepest planning model reads your entire profile to build this.</div>
      </div>
    </div>
  );
}

// ── Generating state ──────────────────────────────────────────────────────
function GeneratingCard({ label, accent }) {
  return (
    <div style={{ ...glass({ padding: 40, textAlign: 'center' }), border: `1px solid ${C.violet}30` }}>
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${C.violet}25`, borderTopColor: C.violet, margin: '0 auto 20px' }}
      />
      <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>Building your full plan</div>
      <AnimatePresence mode="wait">
        <motion.div key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} style={{ fontSize: 12.5, color: C.t3 }}>
          {label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function PlanHeader({ plan, weekNumber, phase, accent, onRegenerate }) {
  return (
    <div data-tour="plans-deep-hero" style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${accent}30`, background: `linear-gradient(135deg,${accent}12,transparent 60%)`, position: 'relative' }}>
      <div style={{ padding: '22px 24px' }}>
        <div style={R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' })}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: C.violetL, marginBottom: 6 }}>Your Full Plan · Medabrain Oracle</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em', margin: 0, lineHeight: 1.25 }}>{plan.headline}</h1>
          </div>
          <div style={R({ gap: 8 })}>
            {weekNumber && <span style={pill(`${accent}18`, accent, { fontSize: 11 })}>Week {weekNumber} of {plan.horizonWeeks}</span>}
            <button style={btnSm('rgba(255,255,255,0.06)', { color: C.t2 })} onClick={onRegenerate}><RefreshCw size={11} />Rebuild Roadmap</button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.7, margin: '14px 0 0', maxWidth: 780 }}>{plan.overview}</p>
        {phase && (
          <div style={{ marginTop: 14, ...glass2({ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }) }}>
            <Target size={13} color={accent} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: C.t1 }}><b>{phase.title}</b> — {phase.theme}</div>
          </div>
        )}
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 12 }}>Updated {relTime(plan.updatedAt)} · Planned through {fmtDateLabel(plan.daysGeneratedThrough)}</div>
      </div>
    </div>
  );
}

// ── Dictation — "tell Medabrain more" ─────────────────────────────────────
// Same Web Speech API (src/lib/speech.js) the Live Voice Interview uses for its mic input,
// reused here so anything the student says gets folded straight into the plan: saved to
// user.planNotes (read by buildProfileFactsText in masterPlanGenerator.js, so every future
// generation — extend, regenerate, the next rolling day chunk — sees it too, not just this one
// rebuild) and immediately used to refresh the roadmap right now, so it's visibly "in" the plan
// rather than a note that silently waits for the next scheduled rebuild.
function PlanVoiceNotes({ user, saveUser, plan, liveSignals, portfolioData, accent }) {
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognizerRef = useRef(null);
  const sttSupported = speech.isSTTSupported();
  const notes = user?.planNotes || [];

  useEffect(() => () => { recognizerRef.current?.stop?.(); }, []);

  function toggleMic() {
    if (!sttSupported) return;
    if (listening) { recognizerRef.current?.stop(); return; }
    const rec = speech.createRecognizer({
      onResult: (t) => setDraft(t),
      onEnd: () => setListening(false),
      onError: (e) => { setListening(false); if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Mic issue — you can type instead.'); },
    });
    if (!rec) return;
    recognizerRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    const text = draft.trim();
    if (!text || submitting) return;
    recognizerRef.current?.stop(); setListening(false);
    setSubmitting(true);
    const nextNotes = [...notes, text].slice(-8); // bounded so the profile-facts prompt never grows unbounded
    const updatedUser = { ...user, planNotes: nextNotes };
    try {
      // adaptPlanToNotes (not just regenerateRoadmap) — rewrites today-forward, still-open days
      // too, so this note visibly changes actual tasks, not just the roadmap's narrative overview.
      const updated = await adaptPlanToNotes(plan, updatedUser, liveSignals || {}, portfolioData);
      saveUser({ ...updatedUser, masterPlan: updated });
      toast.success('Got it — today and the days ahead now reflect that.');
    } catch {
      saveUser(updatedUser); // note is kept even if the live refresh call fails — it'll be included next time the plan regenerates
      toast.error("Saved — but couldn't refresh your plan right now. It'll be included next time your plan updates.");
    }
    setDraft('');
    setSubmitting(false);
  }

  function removeNote(i) {
    saveUser({ ...user, planNotes: notes.filter((_, idx) => idx !== i) });
  }

  return (
    <div style={glass({ padding: 16 })}>
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <Mic size={13} color={accent} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>Tell Medabrain More</span>
      </div>
      <p style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, margin: '0 0 12px' }}>
        Anything your plan should account for — an upcoming trip, a new goal, a subject you want more of — say it or type it, and it's folded straight into your roadmap.
      </p>
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {notes.map((n, i) => (
            <span key={i} style={{ ...pill('rgba(255,255,255,0.04)', C.t2, { fontSize: 10.5 }), display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 320 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              <button onClick={() => removeNote(i)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', opacity: 0.6 }} aria-label="Remove note"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        style={{ width: '100%', minHeight: 60, resize: 'vertical', background: C.s2, border: `1px solid ${listening ? C.green : C.b1}`, borderRadius: 10, padding: '10px 12px', color: C.t1, fontSize: 12.5, lineHeight: 1.55, fontFamily: C.FB, outline: 'none', boxSizing: 'border-box' }}
        placeholder={listening ? 'Listening — speak what you want added…' : sttSupported ? 'Tap the mic and speak, or type here…' : 'Type what you want added to your plan…'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
      />
      <div style={R({ gap: 8, marginTop: 10 })}>
        {sttSupported && (
          <button onClick={toggleMic} disabled={submitting}
            style={{ ...btnSm(listening ? C.rose : 'rgba(255,255,255,0.04)', { color: listening ? '#fff' : C.t2, border: listening ? 'none' : `1px solid ${C.b1}` }), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mic size={12} />{listening ? 'Stop' : 'Speak'}
          </button>
        )}
        <button onClick={submit} disabled={!draft.trim() || submitting}
          style={{ ...btnSm(accent, { color: '#fff' }), display: 'inline-flex', alignItems: 'center', gap: 6, opacity: !draft.trim() || submitting ? 0.55 : 1 }}>
          {submitting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
          {submitting ? 'Updating plan…' : 'Add to My Plan'}
        </button>
      </div>
    </div>
  );
}

// ── This Week / rolling day-by-day view ──────────────────────────────────
function WeekView({ plan, upcoming, accent, isMobile, expandedDay, setExpandedDay, onToggleTask, jumpTo, extending }) {
  const today = todayStr();
  const todayEntry = upcoming.find(d => d.date === today) || null;
  const restOfWeek = upcoming.filter(d => d.date !== today);
  return (
    <div style={CC({ gap: 14 })}>
      <div style={G(3, 12, {}, isMobile)}>
        <PillarCard icon={Compass} title="Prep" text={plan.pillarStrategy?.prep} color={C.violet} />
        <PillarCard icon={GraduationCap} title="Portfolio" text={plan.pillarStrategy?.portfolio} color={C.green} />
        <PillarCard icon={TrendingUp} title="Progress" text={plan.pillarStrategy?.progress} color={C.cyan} />
      </div>

      {upcoming.length === 0 && (
        <div style={glass({ padding: 22, textAlign: 'center' })}>
          <div style={{ fontSize: 13, color: C.t2 }}>Your plan is between windows — it'll pick back up shortly.</div>
        </div>
      )}

      {todayEntry && <TodayHero day={todayEntry} accent={accent} onToggleTask={onToggleTask} jumpTo={jumpTo} />}

      {restOfWeek.length > 0 && (
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, margin: '4px 0 -4px' }}>Coming up</div>
      )}
      {restOfWeek.map(day => (
        <DayCard
          key={day.date} day={day} isToday={false} accent={accent}
          expanded={expandedDay === day.date}
          onToggleExpand={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
          onToggleTask={onToggleTask} jumpTo={jumpTo}
        />
      ))}

      <div style={{ fontSize: 11, color: C.t3, textAlign: 'center', padding: '4px 0' }}>
        {extending ? <span style={R({ gap: 6, justifyContent: 'center' })}><RefreshCw size={11} className="spin" />Extending your plan for the days ahead…</span> : `Planned day-by-day through ${fmtDateLabel(plan.daysGeneratedThrough)} — it keeps rolling forward automatically.`}
      </div>
    </div>
  );
}

// ── Today hero — pulled out of the rolling day list and given its own
// prominent, always-expanded treatment so "what do I do right now" never
// requires a click. A conic-gradient ring gives an at-a-glance sense of
// completion without pulling in a charting dependency.
function TodayHero({ day, accent, onToggleTask, jumpTo }) {
  const total = day.tasks.length;
  const done = day.tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${accent}55`, background: `linear-gradient(135deg,${accent}14,transparent 60%)` }}>
      <div style={{ padding: '18px 20px 6px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${accent} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.s1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.t1, fontFamily: C.FM }}>
            {done}/{total}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={pill(`${accent}22`, accent, { fontSize: 9.5, fontWeight: 800 })}>TODAY</span>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginTop: 5 }}>{fmtDateLabel(day.date)}</div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 1 }}>{day.theme}</div>
        </div>
      </div>
      <div style={{ padding: '10px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {day.tasks.map(t => (
          <TaskRow key={t.id} task={t} onToggle={() => onToggleTask(day.date, t.id)} onJump={() => jumpTo(t)} />
        ))}
        {day.reflectionPrompt && (
          <div style={{ fontSize: 11.5, color: C.t2, fontStyle: 'italic', padding: '8px 12px', borderLeft: `2px solid ${C.amber}50`, marginTop: 4 }}>
            {day.reflectionPrompt}
          </div>
        )}
      </div>
    </div>
  );
}

function PillarCard({ icon: Icon, title, text, color }) {
  if (!text) return null;
  return (
    <div style={{ ...glass2({ padding: 14 }), borderLeft: `2px solid ${color}` }}>
      <div style={R({ gap: 7, marginBottom: 6 })}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color }}>{title}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function DayCard({ day, isToday, accent, expanded, onToggleExpand, onToggleTask, jumpTo }) {
  const doneCount = day.tasks.filter(t => t.done).length;
  const total = day.tasks.length;
  return (
    <div style={{
      ...glass({ padding: 0, overflow: 'hidden' }),
      border: isToday ? `1px solid ${accent}55` : `1px solid ${C.b1}`,
      background: isToday ? `linear-gradient(135deg,${accent}10,transparent 60%)` : undefined,
    }}>
      <button onClick={onToggleExpand} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 18px' }}>
        <div style={R({ justifyContent: 'space-between', gap: 10 })}>
          <div style={R({ gap: 10 })}>
            {isToday && <span style={pill(`${accent}22`, accent, { fontSize: 9.5, fontWeight: 800 })}>TODAY</span>}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{fmtDateLabel(day.date)}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>{day.theme}</div>
            </div>
          </div>
          <div style={R({ gap: 10 })}>
            <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>{doneCount}/{total}</span>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ display: 'flex', color: C.t3 }}><ChevronDown size={16} /></motion.div>
          </div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {day.tasks.map(t => (
                <TaskRow key={t.id} task={t} onToggle={() => onToggleTask(day.date, t.id)} onJump={() => jumpTo(t)} />
              ))}
              {day.reflectionPrompt && (
                <div style={{ fontSize: 11.5, color: C.t2, fontStyle: 'italic', padding: '8px 12px', borderLeft: `2px solid ${C.amber}50`, marginTop: 4 }}>
                  {day.reflectionPrompt}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskRow({ task, onToggle, onJump }) {
  const meta = PILLAR_META[task.pillar] || PILLAR_META.prep;
  const Icon = TYPE_ICON[task.type] || BookOpen;
  const canJump = task.resourceTab && task.resourceView;
  // Accountability: quiz/lesson/deck tasks can only ever be checked off by actually doing them —
  // App.jsx's applyPlanAutoComplete flips `done` (and `autoVerified`) the moment the real quiz is
  // submitted, lesson verified, or deck session finished. No checkbox is rendered for these at
  // all, so there's no self-report path to game — see AUTO_VERIFIABLE_KINDS in
  // masterPlanGenerator.js. Everything else (activities, essays, deadlines, reflection, rest…)
  // has no in-app "this really happened" signal, so it stays an honest, manually-toggled checkbox.
  const autoVerify = AUTO_VERIFIABLE_KINDS.has(task.resourceKind) || AUTO_VERIFIABLE_TYPES.has(task.type);
  // Label the link with the EXACT resource it opens ("Open: Linear Equations
  // Practice") so the student knows the click lands on the real thing, not a
  // generic tab. Specific resources (quiz/lesson/deck/article) read "Open:",
  // bare views read "Go to".
  const specific = task.resourceKind && task.resourceKind !== 'view' && task.resourceLabel;
  const linkLabel = specific
    ? `Open: ${task.resourceLabel.length > 34 ? task.resourceLabel.slice(0, 32) + '…' : task.resourceLabel}`
    : (task.resourceLabel ? `Go to ${task.resourceLabel}` : 'Open');
  return (
    <div style={{ ...glass2({ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }), opacity: task.done ? 0.55 : 1, borderLeft: `2px solid ${meta.color}45` }}>
      {autoVerify ? (
        <span title={task.done ? 'Verified automatically — you actually did this' : 'Checks off automatically when you complete it — no self-report'}
          style={{ marginTop: 1, flexShrink: 0, display: 'flex', cursor: 'default' }} aria-label={task.done ? 'Verified' : 'Verifies automatically'}>
          {task.done ? <ShieldCheck size={17} color={C.green} /> : <ShieldCheck size={17} color={C.t4} style={{ opacity: 0.5 }} />}
        </span>
      ) : (
        <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} aria-label="Toggle task done">
          {task.done ? <CheckCircle2 size={17} color={C.green} /> : <Circle size={17} color={C.t3} />}
        </button>
      )}
      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={11} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
        {task.detail && <div style={{ fontSize: 11, color: C.t3, marginTop: 2, lineHeight: 1.5 }}>{task.detail}</div>}
        <div style={R({ gap: 8, marginTop: 6, flexWrap: 'wrap' })}>
          <span style={pill(`${meta.color}15`, meta.color, { fontSize: 9 })}>{meta.label}</span>
          {task.rolledOverFrom && (
            <span style={{ ...pill(`${C.amber}18`, C.amberL, { fontSize: 9 }), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Undo2 size={9} />Carried over
            </span>
          )}
          {autoVerify && (task.done
            ? <span style={pill(C.greenDim || `${C.green}18`, C.green, { fontSize: 9 })}><ShieldCheck size={9} style={{ marginRight: 3, verticalAlign: -1 }} />Verified</span>
            : <span style={pill('rgba(255,255,255,0.04)', C.t4, { fontSize: 9 })}>Auto-verifies</span>)}
          {task.estMinutes > 0 && <span style={R({ gap: 3 })}><Clock size={10} color={C.t3} /><span style={{ fontSize: 10, color: C.t3 }}>{task.estMinutes}m</span></span>}
          {canJump && (
            <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} onClick={onJump} aria-label="Open this task's resource"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999,
                border: `1px solid ${meta.color}45`, background: `${meta.color}16`, color: meta.color,
                fontSize: 10.5, fontWeight: 700, fontFamily: C.FB, cursor: 'pointer', maxWidth: '100%',
                boxShadow: `0 2px 8px ${meta.color}22`,
              }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkLabel}</span>
              <ArrowRight size={11} style={{ flexShrink: 0 }} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full Roadmap view ──────────────────────────────────────────────────────
function RoadmapView({ plan, accent, isMobile, expandedPhase, setExpandedPhase }) {
  return (
    <div style={CC({ gap: 18 })}>
      <div style={glass({ padding: 18 })}>
        <SectionLabel icon={Map} title="Phases" color={C.violet} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {plan.phases.map((ph, i) => (
            <PhaseCard key={ph.id} phase={ph} index={i} plan={plan} accent={accent}
              expanded={expandedPhase === ph.id} onToggle={() => setExpandedPhase(expandedPhase === ph.id ? null : ph.id)} />
          ))}
        </div>
      </div>

      <div style={glass({ padding: 18 })}>
        <SectionLabel icon={Flag} title="Milestones" color={C.blue} />
        <div style={{ marginTop: 12 }}>
          {plan.milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.blue, boxShadow: `0 0 8px ${C.blue}` }} />
                {i < plan.milestones.length - 1 && <span style={{ width: 2, flex: 1, background: `${C.blue}30`, marginTop: 2 }} />}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{m.title}</span>
                  <span style={pill(`${C.blue}18`, C.blueL, { fontSize: 9.5 })}>Week {m.weekTarget}</span>
                </div>
                {m.detail && <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{m.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {plan.riskMitigation?.length > 0 && (
        <div style={glass({ padding: 18 })}>
          <SectionLabel icon={ShieldAlert} title="Watching out for" color={C.rose} />
          <div style={G(2, 10, { marginTop: 10 }, isMobile)}>
            {plan.riskMitigation.map((r, i) => (
              <div key={i} style={{ ...glass2({ padding: 12 }), borderLeft: `2px solid ${C.rose}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 4 }}>{r.obstacle}</div>
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>{r.strategy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.ninetyDayGoal && (
        <div style={{ padding: '14px 16px', borderRadius: 11, background: `linear-gradient(135deg,${C.amber}14,transparent)`, border: `1px solid ${C.amber}30`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <TrendingUp size={15} color={C.amberL} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.amberL, marginBottom: 3 }}>Where you could be in 90 days</div>
            <p style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.6, margin: 0 }}>{plan.ninetyDayGoal}</p>
          </div>
        </div>
      )}
      {plan.encouragement && (
        <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65, margin: 0, fontStyle: 'italic', paddingLeft: 12, borderLeft: `2px solid ${C.green}40` }}>{plan.encouragement}</p>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon size={13} color={color} />
      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>{title}</span>
    </div>
  );
}

function PhaseCard({ phase, index, plan, accent, expanded, onToggle }) {
  const weeks = plan.weeklyThemes.filter(w => w.week >= phase.weekStart && w.week <= phase.weekEnd);
  return (
    <div style={glass2({ padding: 0, overflow: 'hidden' })}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 14 }}>
        <div style={R({ justifyContent: 'space-between', gap: 10 })}>
          <div style={R({ gap: 10 })}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: `${accent}22`, color: accent, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{phase.title}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>Weeks {phase.weekStart}–{phase.weekEnd} · {phase.theme}</div>
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ color: C.t3, flexShrink: 0 }}><ChevronDown size={15} /></motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.t3, marginBottom: 6 }}>Objectives</div>
                {phase.objectives.map((o, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                    <CheckCircle2 size={12} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{o}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {phase.resources.map((r, i) => <span key={i} style={pill(`${accent}15`, accent, { fontSize: 10 })}>{r}</span>)}
              </div>
              <div style={{ fontSize: 11.5, color: C.t3, fontStyle: 'italic' }}>Success looks like: {phase.successMetric}</div>
              {weeks.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.t3, marginBottom: 6 }}>Week-by-week in this phase</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {weeks.map(w => (
                      <div key={w.week} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5 }}>
                        <span style={{ color: C.t3, fontFamily: C.FM, fontSize: 10, flexShrink: 0, width: 44 }}>Wk {w.week}</span>
                        <span style={{ color: C.t2 }}>{w.theme}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
