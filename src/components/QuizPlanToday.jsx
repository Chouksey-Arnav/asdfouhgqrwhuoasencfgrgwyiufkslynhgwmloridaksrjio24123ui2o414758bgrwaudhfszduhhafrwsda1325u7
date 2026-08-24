import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, ArrowRight, CalendarClock } from 'lucide-react';
import { C, glass, pill, R } from '../lib/theme';
import { getUpcomingDays, todayStr as planTodayStr } from '../lib/masterPlanGenerator';

function dayLabel(dateStr, today) {
  if (dateStr === today) return 'Today';
  const diff = Math.round((new Date(`${dateStr}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

const PREVIEW_COUNT = 3;

// Quiz Library's own "today's plan" collapsible — same visual language as
// PortfolioPlanWeek, but scoped to just resourceKind==='quiz' tasks so it
// answers exactly "which quizzes does my plan want" instead of the whole
// pillar's mixed lesson/quiz/deck chip list PlanTaskStrip already shows up
// top of the Prep tab. Sits directly above the quiz grid, which itself
// stable-partitions today's exact targets to the front (see tQuizzes).
export default function QuizPlanToday({ user, accent = C.amber, onOpenTask }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const plan = user?.masterPlan;
  if (!plan) return null;
  const today = planTodayStr();
  const items = getUpcomingDays(plan, 7).flatMap(d =>
    (d.tasks || []).filter(t => t.resourceKind === 'quiz' && !t.done).map(t => ({ ...t, date: d.date }))
  );
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hiddenCount = items.length - shown.length;

  return (
    <div style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${accent}35` }}>
      <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px 16px' }} aria-expanded={open} aria-label="Toggle today's plan quizzes">
        <div style={R({ justifyContent: 'space-between', gap: 8 })}>
          <div style={R({ gap: 8 })}>
            <Target size={15} color={accent} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Today's Plan</span>
            <span style={pill(`${accent}18`, accent, { fontSize: 10 })}>{items.length} quiz{items.length === 1 ? '' : 'zes'}</span>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', color: C.t2 }}>
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shown.map(t => (
                <button key={t.id} onClick={() => onOpenTask?.(t)} aria-label={`Open plan quiz: ${t.resourceLabel || t.title}`}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: `${accent}0c`, border: `1px solid ${accent}30` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target size={13} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.resourceLabel || t.title}</div>
                    <div style={{ fontSize: 10, color: C.t3, display: 'flex', alignItems: 'center', gap: 4 }}><CalendarClock size={10} />{dayLabel(t.date, today)}</div>
                  </div>
                  <ArrowRight size={12} color={accent} style={{ flexShrink: 0 }} />
                </button>
              ))}
              {hiddenCount > 0 && (
                <button onClick={() => setExpanded(true)} style={{ ...pill(`${accent}12`, accent, { fontSize: 10.5, fontWeight: 700 }), all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '8px 12px', borderRadius: 8, border: `1px dashed ${accent}40` }}>
                  +{hiddenCount} more this week
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
