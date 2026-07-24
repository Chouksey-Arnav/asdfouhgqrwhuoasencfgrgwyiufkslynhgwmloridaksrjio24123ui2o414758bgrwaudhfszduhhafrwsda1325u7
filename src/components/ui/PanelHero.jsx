import React from 'react';
import { C, glass, pill, tint } from '../../lib/theme';

// Shared hero header for every Portfolio sub-view — a gradient identity card
// (icon badge, eyebrow, title, subtitle, stat pills) so each tab opens with
// its own recognisable colour instead of a bare text heading. `color2` lets a
// tab carry a two-tone gradient identity; stats render as tinted pills on the
// right ({ icon?, value, label, color? }).
export default function PanelHero({ icon: Icon, color = C.blue, color2, eyebrow, title, sub, stats = [], right, m = false, tourTag }) {
  const c2 = color2 || color;
  const grad = `linear-gradient(135deg,${color},${c2})`;
  return (
    <div data-tour={tourTag} style={{
      ...glass({ padding: m ? '16px 16px' : '20px 24px' }),
      background: `linear-gradient(120deg,${tint(color, 0.14)},${tint(c2, 0.06)} 55%,rgba(255,255,255,0.02))`,
      border: `1px solid ${tint(color, 0.28)}`,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', gap: m ? 12 : 16, flexWrap: 'wrap',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},${tint(c2, 0)})` }} />
      <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.05, pointerEvents: 'none' }} />
      {Icon && (
        <div style={{
          position: 'relative', width: m ? 42 : 52, height: m ? 42 : 52, borderRadius: 15, background: grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 8px 22px ${tint(color, 0.42)}`,
        }}>
          <Icon size={m ? 19 : 24} color="#fff" />
        </div>
      )}
      <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
        {eyebrow && <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: m ? 19 : 24, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: 0 }}>{title}</h2>
        {sub && <div style={{ fontSize: m ? 11.5 : 12.5, color: C.t2, marginTop: 5, lineHeight: 1.6, maxWidth: 640 }}>{sub}</div>}
      </div>
      {(stats.length > 0 || right) && (
        <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
          {stats.map((s, i) => {
            const sc = s.color || color;
            return (
              <span key={i} style={{ ...pill(tint(sc, 0.14), sc, { fontSize: 11, fontWeight: 700, padding: '5px 12px', border: `1px solid ${tint(sc, 0.28)}`, gap: 5 }) }}>
                {s.icon}{s.value != null && <b style={{ fontFamily: C.FM }}>{s.value}</b>} {s.label}
              </span>
            );
          })}
          {right}
        </div>
      )}
    </div>
  );
}

// Coloured section label — same uppercase micro-heading every panel already
// uses, but with an optional icon + accent colour so sections inside a tab
// pick up its identity instead of always rendering flat grey.
export function SectionTitle({ icon: Icon, color = C.t3, children, extra = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, ...extra }}>
      {Icon && <Icon size={13} color={color} />}
      <span style={{ fontSize: 11, fontWeight: 700, color: Icon ? color : C.t3, textTransform: 'uppercase', letterSpacing: '.08em' }}>{children}</span>
    </div>
  );
}

// Compact coloured stat tile ({ icon, value, label, sub?, color }) — the
// "numbers at a glance" strip under a hero. Use inside a CSS grid.
export function StatTile({ icon: Icon, value, label, sub, color = C.blue, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: `linear-gradient(120deg,${tint(color, 0.1)},rgba(255,255,255,0.015))`,
      border: `1px solid ${tint(color, 0.22)}`, borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : undefined,
    }}>
      {Icon && (
        <div style={{ width: 34, height: 34, borderRadius: 10, background: tint(color, 0.14), border: `1px solid ${tint(color, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FM, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 9.5, color: C.t4, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}
