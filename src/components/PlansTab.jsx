import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles, Target, Flag, TrendingUp, ChevronDown, CheckCircle2, Circle, RefreshCw,
  CalendarClock, Map, Clock, ArrowRight, ShieldAlert, BookOpen, Layers, Layers3,
  MessageCircle, Award, GraduationCap, ScrollText, CalendarDays, Stethoscope,
  FlaskConical, UserCheck, Moon, Mic, Compass,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, R, CC, G, pill } from '../lib/theme';
import { awardXP, BONUS_COPY } from '../lib/rewards';
import { celebrateXP, celebrateBonusXP, celebrateJackpot } from '../lib/celebrate';
import {
  createMasterPlan, extendMasterPlan, regenerateRoadmap, pruneRollingWindow, toggleTaskDone,
  needsExtension, getUpcomingDays, getCurrentWeekNumber, getCurrentPhase, todayStr,
} from '../lib/masterPlanGenerator';

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

export default function PlansTab({ user, saveUser, accent = C.violet, isMobile, goPrep, goPortfolio, goProgress, liveSignals }) {
  const plan = user?.masterPlan || null;
  const [view, setView] = useState('week'); // 'week' | 'roadmap'
  const [generating, setGenerating] = useState(false);
  const [stageLabel, setStageLabel] = useState(LOADING_STAGES[0].label);
  const [extending, setExtending] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);

  // Compact old days into progressLog on load so the synced blob never grows unbounded.
  useEffect(() => {
    if (!plan) return;
    const pruned = pruneRollingWindow(plan);
    if (pruned !== plan) saveUser({ ...user, masterPlan: pruned });
  }, [plan?.days?.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const built = await createMasterPlan(user, liveSignals || {});
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
      const updated = await regenerateRoadmap(plan, user, liveSignals || {});
      saveUser({ ...user, masterPlan: updated });
      toast.success('Roadmap refreshed.');
    } catch {
      toast.error("Couldn't refresh your roadmap — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleToggleTask(date, taskId) {
    const { plan: updated, justCompleted } = toggleTaskDone(plan, date, taskId);
    if (!justCompleted) { saveUser({ ...user, masterPlan: updated }); return; }
    const { finalXP, tier } = awardXP(6);
    saveUser({ ...user, masterPlan: updated, xp: (user?.xp || 0) + finalXP });
    toast.success(BONUS_COPY[tier] ? BONUS_COPY[tier](finalXP) : `+${finalXP} XP`, { duration: 1800 });
    if (tier === 'jackpot') celebrateJackpot();
    else if (tier === 'big' || tier === 'bonus') celebrateBonusXP();
    else celebrateXP();
  }

  function jumpTo(tab, subview) {
    if (!tab || !subview) return;
    if (tab === 'prep') goPrep?.(subview);
    else if (tab === 'portfolio') goPortfolio?.(subview);
    else if (tab === 'progress') goProgress?.(subview);
  }

  if (generating) return <GeneratingCard label={stageLabel} accent={accent} />;
  if (!plan) return <EmptyState onBuild={handleBuild} accent={accent} isMobile={isMobile} />;

  const weekNumber = getCurrentWeekNumber(plan);
  const phase = getCurrentPhase(plan);
  const upcoming = getUpcomingDays(plan, 14);

  return (
    <div style={CC({ gap: 22 })}>
      <PlanHeader plan={plan} weekNumber={weekNumber} phase={phase} accent={accent} onRegenerate={handleRegenerate} />

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

// ── This Week / rolling day-by-day view ──────────────────────────────────
function WeekView({ plan, upcoming, accent, isMobile, expandedDay, setExpandedDay, onToggleTask, jumpTo, extending }) {
  const today = todayStr();
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

      {upcoming.map(day => (
        <DayCard
          key={day.date} day={day} isToday={day.date === today} accent={accent}
          expanded={expandedDay === day.date || day.date === today}
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
                <TaskRow key={t.id} task={t} onToggle={() => onToggleTask(day.date, t.id)} onJump={() => jumpTo(t.resourceTab, t.resourceView)} />
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
  return (
    <div style={{ ...glass2({ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }), opacity: task.done ? 0.55 : 1 }}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} aria-label="Toggle task done">
        {task.done ? <CheckCircle2 size={17} color={C.green} /> : <Circle size={17} color={C.t3} />}
      </button>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={11} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
        {task.detail && <div style={{ fontSize: 11, color: C.t3, marginTop: 2, lineHeight: 1.5 }}>{task.detail}</div>}
        <div style={R({ gap: 8, marginTop: 6 })}>
          <span style={pill(`${meta.color}15`, meta.color, { fontSize: 9 })}>{meta.label}</span>
          {task.estMinutes > 0 && <span style={R({ gap: 3 })}><Clock size={10} color={C.t3} /><span style={{ fontSize: 10, color: C.t3 }}>{task.estMinutes}m</span></span>}
        </div>
      </div>
      {canJump && (
        <button onClick={onJump} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.t3, flexShrink: 0, padding: 4 }} aria-label="Go to resource">
          <ArrowRight size={14} />
        </button>
      )}
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
