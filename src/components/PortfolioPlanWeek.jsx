import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarRange, ChevronDown, ArrowRight, FileText, CalendarClock, Users, Stethoscope, FlaskConical, GraduationCap, Building2, Mic } from 'lucide-react';
import { C, glass, pill, R } from '../lib/theme';
import { getUpcomingDays, todayStr as planTodayStr } from '../lib/masterPlanGenerator';

const TYPE_META = {
  essay: { icon: FileText, label: 'Essay', color: C.violet },
  deadline: { icon: CalendarClock, label: 'Deadline', color: C.rose },
  activity: { icon: Building2, label: 'Activity', color: C.blue },
  college: { icon: GraduationCap, label: 'College', color: C.sky },
  clinical: { icon: Stethoscope, label: 'Clinical', color: C.pink },
  research: { icon: FlaskConical, label: 'Research', color: C.amber },
  recommender: { icon: Users, label: 'Recommender', color: C.teal },
  interview: { icon: Mic, label: 'Interview', color: C.orange },
};

function dayLabel(dateStr, today) {
  if (dateStr === today) return 'Today';
  const diff = Math.round((new Date(`${dateStr}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

// Portfolio's counterpart to the Prep tab's PlanTaskStrip — but week-scoped and grouped by
// task type (essay/deadline/activity/etc.) rather than a flat same-day chip list, so it
// reads as "here's what your plan actually expects from Portfolio this week" (deadlines
// coming up, an essay due, activities to log) instead of just today's leftovers.
export default function PortfolioPlanWeek({ user, accent = C.blue, onOpenTask }) {
  const [open, setOpen] = useState(true);
  const plan = user?.masterPlan;
  if (!plan) return null;
  const today = planTodayStr();
  const items = getUpcomingDays(plan, 7).flatMap(d =>
    (d.tasks || []).filter(t => t.pillar === 'portfolio' && !t.done).map(t => ({ ...t, date: d.date }))
  );
  if (!items.length) return null;

  return (
    <div style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${accent}30` }}>
      <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: '16px 18px' }}>
        <div style={R({ justifyContent: 'space-between', gap: 10 })}>
          <div style={R({ gap: 10 })}>
            <CalendarRange size={15} color={accent} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Plan this week</span>
            <span style={pill(`${accent}18`, accent, { fontSize: 10 })}>{items.length} to do</span>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', color: C.t2 }}>
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(t => {
                const meta = TYPE_META[t.type] || { icon: CalendarRange, label: t.type, color: accent };
                const Icon = meta.icon;
                const specific = t.resourceKind && t.resourceKind !== 'view' && t.resourceLabel;
                const label = specific ? t.resourceLabel : t.title;
                return (
                  <button key={t.id} onClick={() => onOpenTask?.(t)} aria-label={`Open plan task: ${label}`}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${meta.color}25` }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                      <div style={{ fontSize: 10, color: C.t3 }}>{meta.label} · {dayLabel(t.date, today)}</div>
                    </div>
                    <ArrowRight size={12} color={meta.color} style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
