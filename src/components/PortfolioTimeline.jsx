import React, { useState, useEffect } from 'react';
import { CalendarDays, TrendingUp, Stethoscope, UserCheck, Milestone, History, Hourglass } from 'lucide-react';
import { C, glass, glass2, R, CC, pill, tint } from '../lib/theme';
import { listItems } from '../lib/dataApi';
import { localDateStr } from '../lib/dateUtils';
import PanelHero, { SectionTitle } from './ui/PanelHero';

const KIND_META = {
  deadline:    { icon: CalendarDays, color: C.rose,   label: 'Deadline' },
  test:        { icon: TrendingUp,   color: C.lime,   label: 'Test Date' },
  clinical:    { icon: Stethoscope,  color: C.pink,   label: 'Clinical Hours' },
  recommender: { icon: UserCheck,    color: C.fuchsia, label: 'Recommender Due' },
};

export default function PortfolioTimeline({ accent = C.indigo }) {
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

  const today = localDateStr();
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today).reverse();
  const next = upcoming[0];
  const nextDays = next ? Math.ceil((new Date(next.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000) : null;

  const hero = (
    <PanelHero tourTag="portfolio-deep-timeline" icon={Milestone} color={accent} color2={C.sky}
      eyebrow="Portfolio" title="Application Timeline"
      sub="Deadlines, test dates, clinical hours, and recommender due dates merged into one chronological feed — your whole journey at a glance."
      stats={[
        { value: upcoming.length, label: 'upcoming', color: C.skyL },
        { value: past.length, label: 'past', color: C.t3 },
        ...(next ? [{ value: nextDays === 0 ? 'today' : `${nextDays}d`, label: 'until next', color: nextDays <= 7 ? C.roseL : C.indigoL }] : []),
      ]}/>
  );

  if (events.length === 0) {
    return (
      <div style={CC({ gap: 18 })}>
        {hero}
        <div style={glass({ padding: 26, textAlign: 'center' })}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CalendarDays size={20} color={accent} />
          </div>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>Your timeline will fill in as you add deadlines, test dates, clinical hours, and recommenders in the other Portfolio tabs.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={CC({ gap: 18 })}>
      {hero}
      {/* Colour legend — one chip per event kind so the rail reads at a glance */}
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        {Object.values(KIND_META).map(m => (
          <span key={m.label} style={pill(tint(m.color, 0.12), m.color, { fontSize: 10, border: `1px solid ${tint(m.color, 0.25)}`, gap: 5 })}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, boxShadow: `0 0 6px ${m.color}` }} />{m.label}
          </span>
        ))}
      </div>
      {upcoming.length > 0 && <TimelineGroup title="Upcoming" icon={Hourglass} color={accent} items={upcoming} today={today} />}
      {past.length > 0 && <TimelineGroup title="Past" icon={History} color={C.t3} items={past} today={today} dim />}
    </div>
  );
}

function TimelineGroup({ title, icon, color, items, today, dim = false }) {
  return (
    <div style={{ ...glass({ padding: 18 }), background: dim ? undefined : `linear-gradient(160deg,${tint(color, 0.05)},rgba(255,255,255,0.02) 45%)` }}>
      <SectionTitle icon={icon} color={color}>{title} ({items.length})</SectionTitle>
      <div style={{ position: 'relative' }}>
        {/* Vertical rail connecting the dots into an actual timeline */}
        <div style={{ position: 'absolute', left: 14, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${tint(color, 0.35)},${tint(color, 0.05)})`, borderRadius: 2 }} />
        <div style={CC({ gap: 8 })}>
          {items.map((e, i) => {
            const meta = KIND_META[e.kind];
            const Ic = meta.icon;
            const days = Math.ceil((new Date(e.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
            const soon = !dim && days >= 0 && days <= 14;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: dim ? 0.55 : 1, position: 'relative', paddingLeft: 34 }}>
                <div style={{ position: 'absolute', left: 8, width: 14, height: 14, borderRadius: '50%', background: C.s1, border: `2.5px solid ${meta.color}`, boxShadow: dim ? 'none' : `0 0 8px ${tint(meta.color, 0.5)}` }} />
                <div style={{ ...glass2({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', flex: 1 }), background: `linear-gradient(120deg,${tint(meta.color, 0.06)},rgba(255,255,255,0.02) 60%)`, border: `1px solid ${soon ? tint(meta.color, 0.35) : C.b1}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(meta.color, 0.13), border: `1px solid ${tint(meta.color, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic size={13} color={meta.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>
                      {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {soon && <span style={{ color: meta.color, fontWeight: 700 }}> · {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}</span>}
                    </div>
                  </div>
                  <span style={pill(tint(meta.color, 0.13), meta.color, { fontSize: 9 })}>{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
