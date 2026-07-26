import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ArrowRight, PartyPopper, Flame, Sunrise, Target, Circle } from 'lucide-react';
import { C, glass2, pill, R, btnSm } from '../lib/theme';
import { getTodayPlanEntry, getNextPlanDay, AUTO_VERIFIABLE_KINDS, AUTO_VERIFIABLE_TYPES } from '../lib/masterPlanGenerator';

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
export default function TodayPlanNudge({ user, accent = C.violet, onOpenPlan, onOpenNextDay, onOpenTask, onToggleTask, onSnoozeTask, planStreak = 0, isMobile }) {
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
            <button style={btnSm(accent, { color: '#fff' })} onClick={() => onOpenNextDay?.(nextDay.date)}>
              <Sunrise size={12} />Get a head start on tomorrow
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  const nextTasks = today.tasks.filter(t => !t.done).slice(0, 3);
  const overflow = remaining - nextTasks.length;
  // Each remaining task is its own tappable chip — straight to the exact quiz/lesson/deck it
  // names (via onOpenTask, same deep-link opener PlansTab uses) — rather than plain text the
  // student has to go find themselves. Tasks with no addressable resource (rest, reflection…)
  // still open the right tab as a fallback.
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass2({ padding: 16 }), display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `2px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={16} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={R({ gap: 8 })}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Today's plan</span>
            <span style={pill(`${accent}18`, accent, { fontSize: 10 })}>{done}/{total} done</span>
            {planStreak > 1 && (
              <span style={{ ...pill(C.amberDim, C.amberL), display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <Flame size={10} />{planStreak}d streak
              </span>
            )}
          </div>
        </div>
        <button style={btnSm(accent, { color: '#fff' })} onClick={onOpenPlan}>
          Go to Plan<ArrowRight size={12} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: isMobile ? 0 : 48 }}>
        {nextTasks.map(t => {
          const specific = t.resourceKind && t.resourceKind !== 'view' && t.resourceLabel;
          const label = specific ? t.resourceLabel : t.title;
          // Same accountability rule as the Plans tab's own TaskRow — quiz/lesson/deck tasks
          // auto-verify from actually doing them (no self-report checkbox here either).
          const autoVerify = AUTO_VERIFIABLE_KINDS.has(t.resourceKind) || AUTO_VERIFIABLE_TYPES.has(t.type);
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
                onClick={() => (onOpenTask ? onOpenTask(t) : onOpenPlan?.())}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                  border: `1px solid ${accent}45`, background: `${accent}14`, color: C.t1,
                  fontSize: 11, fontWeight: 600, fontFamily: C.FB, cursor: 'pointer', maxWidth: '100%', flex: 1, minWidth: 0,
                }}>
                <Target size={11} color={accent} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{label}</span>
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
    </motion.div>
  );
}
