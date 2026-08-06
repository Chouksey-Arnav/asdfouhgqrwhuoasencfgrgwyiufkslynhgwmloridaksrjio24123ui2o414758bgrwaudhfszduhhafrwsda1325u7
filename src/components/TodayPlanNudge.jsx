import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PartyPopper, Flame, Sunrise, Target, Circle, Sparkles } from 'lucide-react';
import { C, glass2, pill, R, btnSm, accentFill } from '../lib/theme';
import { getTodayPlanEntry, getNextPlanDay, AUTO_VERIFIABLE_KINDS, AUTO_VERIFIABLE_TYPES } from '../lib/masterPlanGenerator';
import { pickNudge } from '../lib/nudges';

// Slim inline progress bar — mirrors App.jsx's local `Bar` component (not exported, so
// reimplemented minimally here) so today's plan progress reads as a bar, not just a fraction.
function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 999, background: color }} />
    </div>
  );
}

// Dashboard-level nudge for the Plans tab's day-by-day roadmap — surfaced on Home so
// "what do I still need to do today" is visible without opening the Plans tab at all.
// Renders nothing until a masterPlan actually exists (the Plans tab's own empty/locked
// states already cover onboarding-adjacent nudging for students without one yet).
export default function TodayPlanNudge({ user, accent = C.violet, onOpenPlan, onOpenNextDay, onOpenTask, onToggleTask, onSnoozeTask, planStreak = 0, isMobile, reducedMotion = false }) {
  const today = getTodayPlanEntry(user?.masterPlan);
  if (!today || !today.tasks?.length) return null;
  const total = today.tasks.length;
  const done = today.tasks.filter(t => t.done).length;
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (remaining === 0) {
    const nextDay = getNextPlanDay(user?.masterPlan);
    const hasNext = !!nextDay?.tasks?.length;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...glass2({ padding: 16 }), display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `2px solid ${C.green}` }}>
        <div style={R({ gap: 12, flexWrap: 'wrap' })}>
          <PartyPopper size={16} color={C.green} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: C.t1, flex: 1 }}>Today's plan is fully done — nice work.</div>
          {planStreak > 1 && (
            <span style={{ ...pill(C.amberDim, C.amberL), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Flame size={11} />{planStreak} day streak on track
            </span>
          )}
        </div>
        {hasNext && (
          <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' })}>
            <span style={{ fontSize: 11.5, color: C.t3 }}>Ready to keep going? Tomorrow's tasks are already lined up.</span>
            <button style={btnSm(accentFill(accent), { color: C.onAccent })} onClick={() => onOpenNextDay?.(nextDay.date)}>
              <Sunrise size={12} />Get a head start on tomorrow
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // "Get ahead" isn't only for a fully-finished day — a student ≥90% done by mid-afternoon
  // is clearly on pace and still has time left in the day, so nudge them toward tomorrow's
  // tasks here too rather than waiting for the very last one to be checked off.
  const showEarlyNudge = remaining > 0 && pct >= 90 && new Date().getHours() >= 15;
  const earlyNudgeNextDay = showEarlyNudge ? getNextPlanDay(user?.masterPlan) : null;

  const remainingTasks = today.tasks.filter(t => !t.done);
  // Medabrain's ONE pick for today: the first remaining task that actually points somewhere
  // (a real quiz/lesson/deck/article), not a rest/reflection day with nothing to open — falling
  // back to the first remaining task of any kind so the spotlight never just goes dark.
  const spotlightTask = remainingTasks.find(t => t.resourceKind && t.resourceKind !== 'view' && t.resourceLabel) || remainingTasks[0] || null;
  let nextTasks = remainingTasks.slice(0, 3);
  if (spotlightTask && !nextTasks.some(t => t.id === spotlightTask.id)) {
    nextTasks = [spotlightTask, ...nextTasks.slice(0, 2)];
  }
  const overflow = remaining - nextTasks.length;
  const medabrainLine = pickNudge('plan_tasks_remaining', { count: remaining, plural: remaining === 1 ? '' : 's' });
  // Each remaining task is its own tappable chip — straight to the exact quiz/lesson/deck it
  // names (via onOpenTask, same deep-link opener PlansTab uses) — rather than plain text the
  // student has to go find themselves. Tasks with no addressable resource (rest, reflection…)
  // still open the right tab as a fallback.
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass2({ padding: 16 }), display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `2px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={16} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={R({ gap: 8 })}>
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: accent }}>Medabrain</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Today's plan</span>
            <span style={pill(`${accent}18`, accent, { fontSize: 10 })}>{done}/{total} done</span>
            {planStreak > 1 && (
              <span style={{ ...pill(C.amberDim, C.amberL), display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <Flame size={10} />{planStreak}d streak
              </span>
            )}
          </div>
        </div>
        <button style={btnSm(accentFill(accent), { color: C.onAccent })} onClick={onOpenPlan}>
          Go to Plan<ArrowRight size={12} />
        </button>
      </div>
      {/* Medabrain speaking, not a generic status line — same phrase bank the evening
          "tasks remaining" toast draws from (src/data/nudgeBank.js), so the voice matches
          whether it's here on Home or in that toast. Resurfaces every time this card renders,
          i.e. every Home visit until the underlying task is actually done — no dismiss-forever. */}
      <div style={{ fontSize: 12, color: C.t2, marginLeft: isMobile ? 0 : 48, display: 'flex', alignItems: 'flex-start', gap: 6, fontStyle: 'italic' }}>
        <Sparkles size={12} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{medabrainLine}</span>
      </div>
      {planStreak > 1 && (
        <div style={{ fontSize: 11.5, color: C.t2, marginLeft: isMobile ? 0 : 48, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={12} color={C.amberL} style={{ flexShrink: 0 }} />
          <span>You're on a {planStreak}-day streak — finish today's {remaining} remaining task{remaining === 1 ? '' : 's'} to keep it.</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: isMobile ? 0 : 48 }}>
        {nextTasks.map(t => {
          const specific = t.resourceKind && t.resourceKind !== 'view' && t.resourceLabel;
          const label = specific ? t.resourceLabel : t.title;
          // Same accountability rule as the Plans tab's own TaskRow — quiz/lesson/deck tasks
          // auto-verify from actually doing them (no self-report checkbox here either).
          const autoVerify = AUTO_VERIFIABLE_KINDS.has(t.resourceKind) || AUTO_VERIFIABLE_TYPES.has(t.type);
          // Medabrain's single top pick gets a glowing ring so it visually stands out from the
          // rest of the list instead of every task reading as equally important — deliberately
          // just one (see spotlightTask above). The pulse itself respects the app's motion
          // preference (OS-level prefers-reduced-motion + the Settings override, both already
          // folded into `reducedMotion` by src/lib/a11y.js's motionReduced()) — a persistent,
          // resurfaces-every-visit glow is a real motion-sensitivity concern in a way a one-time
          // tour animation isn't, so a reduced-motion visitor gets a static accent border instead.
          const isSpotlight = spotlightTask && t.id === spotlightTask.id;
          const spotlightRing = `0 0 0 2px ${accent}55, 0 0 14px ${accent}40`;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
              {autoVerify ? (
                <span title="Verifies automatically — no self-report" style={{ display: 'flex', flexShrink: 0, opacity: 0.45 }}><Circle size={13} color={C.t3} /></span>
              ) : (
                <button onClick={() => onToggleTask?.(today.date, t.id)} aria-label="Mark task done"
                  style={{ all: 'unset', cursor: onToggleTask ? 'pointer' : 'default', display: 'flex', flexShrink: 0 }}>
                  <Circle size={13} color={C.t3} />
                </button>
              )}
              <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                animate={isSpotlight && !reducedMotion ? {
                  boxShadow: [spotlightRing, `0 0 0 3px ${accent}70, 0 0 22px ${accent}66`, spotlightRing],
                } : undefined}
                transition={isSpotlight && !reducedMotion ? { boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } } : undefined}
                onClick={() => (onOpenTask ? onOpenTask(t) : onOpenPlan?.())}
                aria-label={isSpotlight ? `Medabrain's pick: ${label}` : undefined}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                  border: isSpotlight ? `1.5px solid ${accent}` : `1px solid ${accent}45`,
                  background: isSpotlight ? `${accent}20` : `${accent}14`, color: C.t1,
                  boxShadow: isSpotlight && reducedMotion ? spotlightRing : undefined,
                  fontSize: 11, fontWeight: 600, fontFamily: C.FB, cursor: 'pointer', maxWidth: '100%', flex: 1, minWidth: 0,
                }}>
                {isSpotlight ? <Sparkles size={11} color={accent} style={{ flexShrink: 0 }} /> : <Target size={11} color={accent} style={{ flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{label}</span>
                {isSpotlight && <span style={{ fontSize: 8.5, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>Medabrain's pick</span>}
                <ArrowRight size={10} color={accent} style={{ flexShrink: 0 }} />
              </motion.button>
              {onSnoozeTask && (
                <button onClick={() => onSnoozeTask(today.date, t.id)} title="Snooze to tomorrow" aria-label="Snooze this task to tomorrow"
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexShrink: 0, color: C.t3, padding: 4 }}>
                  <Sunrise size={13} />
                </button>
              )}
            </div>
          );
        })}
        {overflow > 0 && (
          <span style={{ ...pill('rgba(255,255,255,0.04)', C.t3, { fontSize: 10.5 }), alignSelf: 'flex-start' }}>+{overflow} more</span>
        )}
      </div>
      <ProgressBar pct={pct} color={accent} />
      {earlyNudgeNextDay?.tasks?.length > 0 && (
        <div style={{ ...R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }), marginLeft: isMobile ? 0 : 48, paddingTop: 2 }}>
          <span style={{ fontSize: 11, color: C.t3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sunrise size={12} color={C.amberL} style={{ flexShrink: 0 }} />
            You're on pace today ({pct}% done) — want to start tomorrow's tasks early?
          </span>
          <button style={btnSm(accentFill(accent), { color: C.onAccent })} onClick={() => onOpenNextDay?.(earlyNudgeNextDay.date)}>
            <Sunrise size={12} />Get a head start
          </button>
        </div>
      )}
    </motion.div>
  );
}
