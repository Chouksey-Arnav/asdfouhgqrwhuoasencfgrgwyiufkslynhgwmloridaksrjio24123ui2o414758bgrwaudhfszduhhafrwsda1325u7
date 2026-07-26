import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ArrowRight, PartyPopper, Flame, Sunrise } from 'lucide-react';
import { C, glass2, pill, R, btnSm } from '../lib/theme';
import { getTodayPlanEntry, getNextPlanDay } from '../lib/masterPlanGenerator';

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
export default function TodayPlanNudge({ user, accent = C.violet, onOpenPlan, onOpenNextDay, planStreak = 0, isMobile }) {
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

  const nextTitles = today.tasks.filter(t => !t.done).slice(0, 2).map(t => t.title);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass2({ padding: 16 }), display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `2px solid ${accent}` }}>
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
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 3 }}>
            {nextTitles.join(' · ')}{remaining > nextTitles.length ? ` +${remaining - nextTitles.length} more` : ''}
          </div>
        </div>
        <button style={btnSm(accent, { color: '#fff' })} onClick={onOpenPlan}>
          Go to Plan<ArrowRight size={12} />
        </button>
      </div>
      <ProgressBar pct={pct} color={accent} />
    </motion.div>
  );
}
