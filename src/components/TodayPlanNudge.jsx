import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ArrowRight, PartyPopper } from 'lucide-react';
import { C, glass2, pill, R, btnSm } from '../lib/theme';
import { getTodayPlanEntry } from '../lib/masterPlanGenerator';

// Dashboard-level nudge for the Plans tab's day-by-day roadmap — surfaced on Home so
// "what do I still need to do today" is visible without opening the Plans tab at all.
// Renders nothing until a masterPlan actually exists (the Plans tab's own empty/locked
// states already cover onboarding-adjacent nudging for students without one yet).
export default function TodayPlanNudge({ user, accent = C.violet, onOpenPlan, isMobile }) {
  const today = getTodayPlanEntry(user?.masterPlan);
  if (!today || !today.tasks?.length) return null;
  const total = today.tasks.length;
  const done = today.tasks.filter(t => t.done).length;
  const remaining = total - done;

  if (remaining === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...glass2({ padding: 14 }), display: 'flex', alignItems: 'center', gap: 12, borderLeft: `2px solid ${C.green}` }}>
        <PartyPopper size={16} color={C.green} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: C.t1 }}>Today's plan is fully done — nice work.</div>
      </motion.div>
    );
  }

  const nextTitles = today.tasks.filter(t => !t.done).slice(0, 2).map(t => t.title);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass2({ padding: 16 }), display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderLeft: `2px solid ${accent}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CalendarClock size={16} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={R({ gap: 8 })}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Today's plan</span>
          <span style={pill(`${accent}18`, accent, { fontSize: 10 })}>{done}/{total} done</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 3 }}>
          {nextTitles.join(' · ')}{remaining > nextTitles.length ? ` +${remaining - nextTitles.length} more` : ''}
        </div>
      </div>
      <button style={btnSm(accent, { color: '#fff' })} onClick={onOpenPlan}>
        Go to Plan<ArrowRight size={12} />
      </button>
    </motion.div>
  );
}
