import React, { useState, useEffect } from 'react';
import { CalendarDays, TrendingUp, Stethoscope, UserCheck } from 'lucide-react';
import { C, glass, glass2, lbl, R, CC, pill } from '../lib/theme';
import { listItems } from '../lib/dataApi';

const KIND_META = {
  deadline:    { icon: CalendarDays, color: C.rose,   label: 'Deadline' },
  test:        { icon: TrendingUp,   color: C.green,  label: 'Test Date' },
  clinical:    { icon: Stethoscope,  color: C.blue,   label: 'Clinical Hours' },
  recommender: { icon: UserCheck,    color: C.violet, label: 'Recommender Due' },
};

export default function PortfolioTimeline({ accent = C.blue }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [deadlines, scores, clinical, recommenders] = await Promise.all([
          listItems('deadlines').catch(() => []),
          listItems('test_scores').catch(() => []),
          listItems('clinical_hours').catch(() => []),
          listItems('recommenders').catch(() => []),
        ]);
        const merged = [
          ...(deadlines || []).map(d => ({ date: d.due_date, kind: 'deadline', title: d.title })),
          ...(scores || []).filter(s => !s.is_target).map(s => ({ date: s.test_date, kind: 'test', title: `${s.test_type} — ${s.composite}` })),
          ...(clinical || []).map(c => ({ date: c.entry_date, kind: 'clinical', title: `${c.site_name} · ${c.hours}h logged` })),
          ...(recommenders || []).filter(r => r.due_date).map(r => ({ date: r.due_date, kind: 'recommender', title: `${r.name} letter due` })),
        ].filter(e => e.date);
        setEvents(merged.sort((a, b) => a.date.localeCompare(b.date)));
      } catch { setEvents([]); }
    })();
  }, []);

  if (events === null) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today).reverse();

  if (events.length === 0) {
    return (
      <div style={glass({ padding: 22, textAlign: 'center' })}>
        <CalendarDays size={20} color={C.t3} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: C.t2 }}>Your timeline will fill in as you add deadlines, test dates, clinical hours, and recommenders.</div>
      </div>
    );
  }

  return (
    <div style={CC({ gap: 18 })}>
      {upcoming.length > 0 && <TimelineGroup title="Upcoming" items={upcoming} />}
      {past.length > 0 && <TimelineGroup title="Past" items={past} dim />}
    </div>
  );
}

function TimelineGroup({ title, items, dim = false }) {
  return (
    <div style={glass({ padding: 18 })}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>{title}</div>
      <div style={CC({ gap: 8 })}>
        {items.map((e, i) => {
          const meta = KIND_META[e.kind];
          const Ic = meta.icon;
          return (
            <div key={i} style={{ ...glass2({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }), opacity: dim ? 0.55 : 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic size={13} color={meta.color} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>{e.title}</div>
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>{new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <span style={pill(`${meta.color}15`, meta.color, { fontSize: 9 })}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
