import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarRange, RefreshCw, Compass, ListChecks, CheckCircle2,
  Brain, Plus, ChevronRight, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, tint, autoGrid, accentText, inp } from '../../../lib/theme';
import PanelHero, { SectionTitle } from '../../ui/PanelHero';
import EmptyState from '../../ui/EmptyState';
import { HowItWorks, HelpNote } from '../../ui/Disclosure';
import MonthActionCard from './MonthActionCard';
import MonthCheckin from './MonthCheckin';
import {
  OpportunityPlan, ActivityPlan, LeadershipPath, ServiceDashboard,
  AcademicPanel, RiskPanel, ReminderStrip, AdaptationLog,
} from './MonthSections';
import { Meter, Chip, fmtDay } from './monthUi';
import {
  rankedActions, planStats, currentWeek, actionsInWeek, dueReminders,
  daysLeft, planIsExpired, planIsStale, toggleActionStep, recordEvidence,
  addStudentAction, OPEN_ACTION_STATES,
} from '../../../lib/monthPlan/model';
import { LEADERSHIP_LADDER, buildMonthSignals } from '../../../lib/monthPlan/signals';
import { applyActionState, reprioritize } from '../../../lib/monthPlan/adapt';
import { recordActionFeedback, logEvidence } from '../../../lib/monthPlan/store';
import {
  contextForAction, contextForOpportunity, contextForService, contextForLeadership,
} from '../../../lib/monthPlan/context';
import { askMedabrainAbout } from '../../../lib/medabrainFocus';
import { HORIZON_COPY } from '../../../lib/monthPlan/yearly';
import { dayKey } from '../../../lib/timeline';

// ─────────────────────────────────────────────────────────────────────────────
// "This month" — the free-plan roadmap, and the first screen the Roadmap tab
// shows.
//
// ── The one question this page answers ──────────────────────────────────────
// "What do I do next?" Everything on it is subordinate to that. The objective
// says what the month is for in one line, the ranked cards say what to do in
// order, and every other section exists to explain WHY the cards say what they
// say — the activity verdicts, the leadership rung, the service pace, the
// academics, the risks. A student who reads only the top third has been well
// served; one who reads all of it understands their own file.
//
// ── Why it lives beside the twelve-month roadmap rather than replacing it ───
// They answer different questions and they share their inputs. The year says
// when things happen; the month says what to do about them now. The month is
// built from the same portfolio, the same opportunity catalog and the same
// student-intelligence rows, and summarizeMonthPlanForPrompt() puts BOTH in
// front of Medabrain so the app never offers a student two different plans.
//
// ── Every mutation is optimistic and durable ────────────────────────────────
// A state change writes through `commit` (the user record, which App.jsx owns)
// and mirrors the decision into recommendation_feedback so the rest of the app
// stops suggesting the thing. The mirror is fire-and-forget: a failed write
// costs a future suppression, while blocking on it would cost the interaction.
// ─────────────────────────────────────────────────────────────────────────────

const HOW_STEPS = [
  { title: 'It reads your whole record first', body: 'Grade, graduation year, college list, GPA and rigor, test scores, every activity, your service log, your constraints and your last check-in. Nothing here is generic advice.' },
  { title: 'Then it picks a small number of things', body: 'Ranked, with a reason drawn from a real number about you, an estimate of the effort, and a definition of done so you are never guessing whether you have finished.' },
  { title: 'You tell it what happened', body: 'Done, paused, too expensive, too far, too hard, not interested, no longer eligible — every one of those changes what it suggests next, and none of them counts against you.' },
  { title: 'It refreshes every four weeks', body: 'Carrying forward anything you paused, and remembering everything you have already said no to.' },
];

export default function MonthPlanPanel({
  plan, user = null, portfolio = null, roadmap = null,
  accent = C.violet, isMobile = false,
  building = false, buildStage = '', onBuild, onRefresh, onCommit,
  goPortfolio, goOpportunities, goActivities, goAcademics, goYear,
}) {
  const today = dayKey();

  // ── The read of the student ───────────────────────────────────────────────
  // Computed here rather than in the tab so the rule engine and the opportunity
  // catalog it pulls in stay on this lazy chunk (see the note beside the lazy
  // import in RoadmapTab.jsx). Recomputed whenever the portfolio changes, which
  // is what keeps the adaptation layer arguing from live data rather than from
  // whatever was true when the plan was built.
  const signals = useMemo(() => {
    if (!user) return null;
    try { return buildMonthSignals({ user, snapshot: portfolio, roadmap }); } catch { return null; }
  }, [user, portfolio, roadmap]);

  const stale = useMemo(
    () => (plan && signals ? planIsStale(plan, { user, signals }) : false),
    [plan, signals, user],
  );
  const [busyId, setBusyId] = useState(null);
  const [showSettled, setShowSettled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const stats = useMemo(() => (plan ? planStats(plan, today) : null), [plan, today]);
  const ranked = useMemo(() => (plan ? rankedActions(plan, { includeSettled: showSettled }) : []), [plan, showSettled]);
  const week = useMemo(() => (plan ? currentWeek(plan, today) : null), [plan, today]);
  const reminders = useMemo(() => (plan ? dueReminders(plan, today) : []), [plan, today]);
  const left = plan ? daysLeft(plan, today) : 0;
  const expired = plan ? planIsExpired(plan, today) : false;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const handleState = useCallback(async (action, status, note) => {
    if (!plan) return;
    setBusyId(action.id);
    try {
      const { plan: next, added, focus, message } = applyActionState(plan, action.id, status, { note, signals, today });
      onCommit?.(next, `marked ${action.title} ${status}`);
      if (added.length) {
        toast.success(`${message} Added: ${added.map((a) => a.title).join(', ')}`, { duration: 4200 });
      } else if (message) {
        toast.success(message);
      }
      // Mirror the decision so Medabrain, the master plan and the opportunity
      // matcher all stop offering it. Deliberately not awaited by the UI path.
      recordActionFeedback(action, status, note).catch(() => {});
      if (focus) {
        const ctx = contextForAction(next, focus, { today });
        if (ctx) askMedabrainAbout(ctx);
      }
    } finally {
      setBusyId(null);
    }
  }, [plan, signals, today, onCommit]);

  const handleStep = useCallback((action, index) => {
    if (!plan) return;
    onCommit?.(toggleActionStep(plan, action.id, index), 'ticked a step');
  }, [plan, onCommit]);

  const handleEvidence = useCallback((action, text) => {
    if (!plan) return;
    onCommit?.(recordEvidence(plan, action.id, text), 'logged evidence');
    logEvidence({ text, actionTitle: action.title }).then((row) => {
      if (row) toast.success('Saved to your portfolio notes.');
    }).catch(() => {});
  }, [plan, onCommit]);

  const askAboutAction = useCallback((action) => {
    const ctx = contextForAction(plan, action, { today });
    if (ctx && askMedabrainAbout(ctx)) return;
    toast('Open the Portfolio tab to chat with Medabrain.');
  }, [plan, today]);

  const askAboutOpportunity = useCallback((entry) => {
    const ctx = contextForOpportunity(entry, { today });
    if (ctx) askMedabrainAbout(ctx);
  }, [today]);

  const askAboutService = useCallback(() => {
    const ctx = contextForService(plan?.servicePlan);
    if (ctx) askMedabrainAbout(ctx);
  }, [plan]);

  const askAboutLeadership = useCallback(() => {
    const ctx = contextForLeadership(plan?.leadershipPath);
    if (ctx) askMedabrainAbout(ctx);
  }, [plan]);

  const askAboutActivity = useCallback((a) => {
    askMedabrainAbout({
      kind: 'activity',
      ref: `activity:${a.id}`,
      label: a.name,
      question: `My plan says to ${a.verdict} ${a.name}. Talk me through whether that is right and what it would actually look like.`,
      block: `\n\n── The activity they are asking about ──\n"${a.name}"${a.org ? ` at ${a.org}` : ''}, about ${a.hoursPerYear} hours a year across ${a.years || 'an unrecorded number of'} year(s)${a.leadership ? ', with a leadership role' : ''}. Our depth read of how it is written: ${a.score}/100.${a.undescribed ? ' It has no real description written.' : ''}${a.noImpact ? ' It has no impact line.' : ''} Their month plan's verdict: ${a.verdict} — ${a.why}\nAnswer about THIS activity. Never suggest they add activities to reach a number.`,
    });
  }, []);

  const askAboutRisk = useCallback((r) => {
    askMedabrainAbout({
      kind: 'risk',
      ref: `risk:${r.id}`,
      label: r.title,
      question: `My plan flagged this: ${r.title}. Help me work out what to actually do about it.`,
      block: `\n\n── The risk they are asking about ──\n${r.title}. ${r.detail || ''} The plan's suggested remedy: ${r.remedy || 'none recorded'}.\nBe practical and specific. Do not minimize it, and do not blow it out of proportion either.`,
    });
  }, []);

  const askGeneral = useCallback(() => {
    askMedabrainAbout({
      kind: 'month-plan',
      ref: plan?.id || 'month-plan',
      label: 'This month',
      question: 'Walk me through my month plan. What is the single most important thing on it, and what would you change?',
      block: '',
    });
  }, [plan]);

  const addOwn = useCallback(() => {
    const title = newTitle.trim();
    if (!plan || !title) return;
    onCommit?.(addStudentAction(plan, { title }), 'added your own action');
    setNewTitle('');
    setAdding(false);
    toast.success('Added to your month.');
  }, [plan, newTitle, onCommit]);

  const handleCheckinSubmitted = useCallback(() => {
    if (!plan || !signals) return;
    onCommit?.(reprioritize(plan, signals, { today }), 're-ranked after a check-in');
  }, [plan, signals, today, onCommit]);

  // ── Building ──────────────────────────────────────────────────────────────

  if (building) {
    return (
      <div style={glass({ padding: isMobile ? 20 : 32, textAlign: 'center' })}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-flex' }}>
          <CalendarRange size={30} color={accent} />
        </motion.div>
        <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 700, color: C.t1, marginTop: 12 }}>Building your month</div>
        <div style={{ fontSize: 12.5, color: C.t2, marginTop: 8, lineHeight: 1.6, maxWidth: 460, margin: '6px auto 0' }}>
          {buildStage || 'Reading your whole record…'}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={CC({ gap: 16 })}>
        <EmptyState
          icon={CalendarRange}
          accent={accent}
          title="Your next month, worked out from your own record"
          body="One objective, a short ranked list of things to do, four weeks with a shape, and the deadlines that are actually live. Built from your portfolio, your college list, your grades, your activities, your service log and your constraints — not from a template."
          actionLabel="Build my month"
          onAction={onBuild}
        />
        <HowItWorks id="month-plan" title="How this works" steps={HOW_STEPS} color={accent} m={isMobile} />
      </div>
    );
  }

  const degraded = plan.generation?.degraded;

  return (
    <div style={CC({ gap: isMobile ? 14 : 18 })}>
      {/* ── The objective ────────────────────────────────────────────────── */}
      <PanelHero
        icon={CalendarRange}
        color={accent}
        color2={C.indigo}
        eyebrow={`${HORIZON_COPY[plan.horizon || 'month']?.label || 'This month'} · ${fmtDay(plan.cycleStart)} – ${fmtDay(plan.cycleEnd, { withYear: true })}`}
        title={plan.objective?.headline || 'This month'}
        sub={plan.objective?.body || ''}
        m={isMobile}
        stats={[
          { label: 'Done', value: `${stats.complete}/${stats.total}` },
          { label: 'Days left', value: left },
          { label: 'Planned', value: `${stats.plannedHours}h` },
        ]}
      />

      {plan.objective?.why && (
        <div style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${tint(accent, 0.5)}` }}>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{plan.objective.why}</div>
        </div>
      )}

      {/* ── Progress ─────────────────────────────────────────────────────── */}
      <div style={glass({ padding: isMobile ? 14 : 16 })}>
        <div style={R({ gap: 8, marginBottom: 8, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{stats.pct}% of this month done</span>
          <span style={{ flex: 1 }} />
          {stats.missed > 0 && <Chip label={`${stats.missed} overdue`} color={C.rose} strong />}
          {stats.thisWeek > 0 && <Chip label={`${stats.thisWeek} due this week`} color={C.amber} />}
          {stats.paused > 0 && <Chip label={`${stats.paused} paused`} color={C.t3} />}
          {stats.needsHelp > 0 && <Chip label={`${stats.needsHelp} needs help`} color={C.fuchsia} />}
        </div>
        <Meter pct={stats.pct} color={accent} label="Month progress" />
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, lineHeight: 1.55 }}>
          {stats.plannedHours}h of work planned against roughly {plan.capacityHours}h you have in a month.
          {stats.paused > 0 ? ' Paused items are not counted against you and come back next month.' : ''}
        </div>
        {plan.direction?.summary && (
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.s2}` }}>
            <strong style={{ color: C.t1 }}>Where you are: </strong>{plan.direction.summary}
            {plan.direction.inferredDream && (
              <span style={{ color: C.t3 }}> Nothing is marked as a dream college, so we are treating {plan.direction.inferredDream} as the hardest target on your list.</span>
            )}
          </div>
        )}
      </div>

      {/* ── Honest status banners ────────────────────────────────────────── */}
      {degraded && (
        <div style={{ ...glass({ padding: 16 }), border: `1px solid ${tint(C.amber, 0.3)}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{plan.generation.reason?.title || 'Built without Medabrain\'s framing.'}</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.6 }}>
            {plan.generation.reason?.detail || 'Every action, date and definition of done below came from your own record either way — what is missing is the part written for you personally.'}
          </div>
          {plan.generation.reason?.retryable !== false && (
            <button type="button" style={btnSm(C.s2, { fontSize: 11.5, marginTop: 8 })} onClick={onRefresh}>
              <RefreshCw size={12} />Try again
            </button>
          )}
        </div>
      )}

      {(expired || stale) && (
        <div style={{ ...glass({ padding: 16 }), border: `1px solid ${tint(accent, 0.3)}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>
            {expired ? 'This month has run its course.' : 'Your record has changed since this was built.'}
          </div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.6 }}>
            {expired
              ? 'Refresh it for the next four weeks. Anything you paused comes with you, and what you finished is remembered.'
              : 'New grades, a new school on your list, or a decision you made — the plan can be rebuilt around it.'}
          </div>
          <button type="button" style={btn(accent, { fontSize: 12, marginTop: 8 })} onClick={onRefresh}>
            <RefreshCw size={13} />{expired ? 'Start next month' : 'Rebuild this month'}
          </button>
        </div>
      )}

      {plan.previousCycle && (
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>
          Last month you finished {plan.previousCycle.completed} of {plan.previousCycle.total}. That is the baseline, not a verdict.
        </div>
      )}

      {/* ── Check-in ─────────────────────────────────────────────────────── */}
      <MonthCheckin
        accent={accent}
        isMobile={isMobile}
        due={!!plan.checkin?.due}
        academicUpdateDue={!!plan.checkin?.academicUpdateDue}
        lastAt={plan.checkin?.lastAt}
        onSubmitted={handleCheckinSubmitted}
      />

      {/* ── Reminders ────────────────────────────────────────────────────── */}
      <ReminderStrip reminders={reminders} isMobile={isMobile} />

      {/* ── The ranked actions ───────────────────────────────────────────── */}
      <div>
        <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
          <SectionTitle icon={ListChecks} color={accent} extra={{ marginBottom: 0 }}>What to do, in order</SectionTitle>
          <span style={{ flex: 1 }} />
          <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', gap: 8 })} onClick={askGeneral}>
            <Brain size={12} color={accent} />Ask about the whole month
          </button>
          <button type="button" style={btnSm(C.s2, { fontSize: 11.5, padding: '8px 12px' })} onClick={() => setShowSettled((v) => !v)}>
            {showSettled ? 'Hide finished' : 'Show finished'}
          </button>
        </div>

        {ranked.length === 0 ? (
          <div style={glass({ padding: 16, textAlign: 'center' })}>
            <CheckCircle2 size={22} color={C.green} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginTop: 8 }}>Everything on this month is settled.</div>
            <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.6 }}>
              That is a real month of work. Refresh for the next four weeks whenever you are ready.
            </div>
            <button type="button" style={btn(accent, { fontSize: 12, marginTop: 12 })} onClick={onRefresh}>
              <RefreshCw size={13} />Build next month
            </button>
          </div>
        ) : (
          <div style={CC({ gap: 12 })}>
            <AnimatePresence initial={false}>
              {ranked.map((a) => (
                <MonthActionCard
                  key={a.id}
                  action={a}
                  accent={accent}
                  isMobile={isMobile}
                  today={today}
                  busy={busyId === a.id}
                  onSetState={handleState}
                  onToggleStep={handleStep}
                  onLogEvidence={handleEvidence}
                  onAskMedabrain={askAboutAction}
                  onOpenLink={(link) => {
                    if (link?.kind === 'opportunity') goOpportunities?.();
                    else if (link?.kind === 'activity') goActivities?.();
                    else goPortfolio?.();
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Something of their own. Their date is theirs — the plan never argues with it. */}
        <div style={{ marginTop: 12 }}>
          {adding ? (
            <div style={glass2({ padding: 12 })}>
              <input
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus
                placeholder="Something you already know you need to do this month"
                style={inp({ fontSize: 12.5 })}
                onKeyDown={(e) => { if (e.key === 'Enter') addOwn(); }}
              />
              <div style={R({ gap: 8, marginTop: 8 })}>
                <button type="button" style={btn(accent, { fontSize: 12, padding: '8px 16px' })} onClick={addOwn}>Add</button>
                <button type="button" style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => { setAdding(false); setNewTitle(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', gap: 8 })} onClick={() => setAdding(true)}>
              <Plus size={12} color={accent} />Add something of your own
            </button>
          )}
        </div>
      </div>

      {/* ── The four weeks ───────────────────────────────────────────────── */}
      <div style={glass({ padding: isMobile ? 14 : 18 })}>
        <SectionTitle icon={Compass} color={C.sky}>Your four weeks</SectionTitle>
        <div style={autoGrid(isMobile ? 200 : 220, 10)}>
          {(plan.weeks || []).map((w) => {
            const rows = actionsInWeek(plan, w.index);
            const open = rows.filter((a) => OPEN_ACTION_STATES.has(a.status));
            const isNow = week?.index === w.index;
            return (
              <div key={w.index} style={{
                ...glass2({ padding: 12 }),
                border: `1px solid ${isNow ? tint(C.sky, 0.4) : C.cmp.cardBorder}`,
                background: isNow ? tint(C.sky, 0.07) : undefined,
              }}>
                <div style={R({ gap: 8, marginBottom: 4, flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isNow ? accentText(C.sky) : C.t1 }}>{w.label}</span>
                  {isNow && <Chip label="You are here" color={C.sky} strong />}
                </div>
                <div style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM, marginBottom: 8 }}>
                  {fmtDay(w.startDate)} – {fmtDay(w.endDate)}
                </div>
                {w.theme && <div style={{ fontSize: 11.5, color: C.t2, marginBottom: 8, lineHeight: 1.5 }}>{w.theme}</div>}
                {rows.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: C.t4 }}>Deliberately clear.</div>
                ) : (
                  <div style={CC({ gap: 8 })}>
                    {rows.slice(0, 4).map((a) => (
                      <div key={a.id} style={{ fontSize: 11.5, color: a.status === 'complete' ? C.t4 : C.t2, lineHeight: 1.45, textDecoration: a.status === 'complete' ? 'line-through' : 'none' }}>
                        · {a.title}
                      </div>
                    ))}
                    {rows.length > 4 && <div style={{ fontSize: 11, color: C.t4 }}>+{rows.length - 4} more</div>}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, fontFamily: C.FM }}>
                  {open.length} open · about {Math.round((w.capacityHours || 0) * 10) / 10}h
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Everything that explains the cards above ─────────────────────── */}
      <RiskPanel risks={plan.risks} isMobile={isMobile} onAsk={askAboutRisk} />

      <OpportunityPlan
        plan={plan.opportunityPlan}
        isMobile={isMobile}
        onAsk={askAboutOpportunity}
        onOpenDatabase={goOpportunities}
      />

      <ActivityPlan
        plan={plan.activityPlan}
        isMobile={isMobile}
        onAsk={askAboutActivity}
        onOpenActivities={goActivities}
      />

      <LeadershipPath
        path={plan.leadershipPath}
        ladder={LEADERSHIP_LADDER}
        isMobile={isMobile}
        onAsk={askAboutLeadership}
      />

      <ServiceDashboard
        plan={plan.servicePlan}
        isMobile={isMobile}
        onAsk={askAboutService}
        onOpenLog={goOpportunities}
      />

      <AcademicPanel
        plan={plan.academicPlan}
        isMobile={isMobile}
        onAsk={() => askMedabrainAbout({
          kind: 'academics',
          ref: 'academics',
          label: 'Academics and testing',
          question: 'Look at my grades, rigor and test scores together and tell me honestly where I stand for the schools on my list.',
          block: '',
        })}
        onOpenAcademics={goAcademics}
      />

      <AdaptationLog history={plan.history} isMobile={isMobile} />

      {/* ── The year, and what a longer plan would add ───────────────────── */}
      <div style={glass({ padding: isMobile ? 14 : 16 })}>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <Info size={14} color={C.t3} />
          <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
            This month is built to stand on its own. The twelve-month roadmap in this same tab is where the longer view lives — the dated year, the seasons, and the milestones far enough ahead to prepare for.
          </div>
          {goYear && (
            <button type="button" style={btnSm(C.s2, { fontSize: 11.5 })} onClick={goYear}>
              See the year<ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      <HowItWorks id="month-plan" title="How this month was built" steps={HOW_STEPS} color={accent} m={isMobile} />

      <HelpNote>
        Nothing here can promise an admissions result, and nothing here is trying to. What a month of this changes is what you have to show — the depth, the evidence, and the deadlines you did not miss.
      </HelpNote>

      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <button type="button" style={btnSm(C.s2, { fontSize: 11.5 })} onClick={onRefresh}>
          <RefreshCw size={12} />Rebuild this month
        </button>
      </div>
    </div>
  );
}
