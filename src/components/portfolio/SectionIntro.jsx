import React from 'react';
import { C, glass, pill, tint, R } from '../../lib/theme';

// The header band each section inside Activities & résumé opens with.
//
// Clinical Hours, Research and Skills & Certifications used to be four separate
// Portfolio tabs, each with its own full-width PanelHero. Merged into one tab
// they cannot each own a hero — the page would read as four products stacked on
// top of each other. This is the same identity card one size down: the section's
// icon and color, its title, the sentence that explains why the section exists
// (kept verbatim from the tab it replaced, because that copy was the only place
// it was ever said), and its live counts.
export default function SectionIntro({ icon: Icon, color = C.blue, color2, title, blurb, stats = [], right, m = false }) {
  const c2 = color2 || color;
  return (
    <div style={{
      ...glass({ padding: m ? '14px 15px' : '16px 18px' }),
      background: `linear-gradient(120deg,${tint(color, 0.1)},${tint(c2, 0.04)} 60%,rgba(255,255,255,0.02))`,
      border: `1px solid ${tint(color, 0.22)}`,
      display: 'flex', alignItems: 'center', gap: m ? 11 : 14, flexWrap: 'wrap',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},${tint(c2, 0)})` }} />
      {Icon && (
        <div style={{
          width: m ? 34 : 40, height: m ? 34 : 40, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg,${color},${c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 16px ${tint(color, 0.38)}`,
        }}>
          <Icon size={m ? 16 : 19} color="#fff" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: m ? 15 : 16.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>{title}</div>
        {blurb && <div style={{ fontSize: m ? 11 : 11.5, color: C.t3, marginTop: 4, lineHeight: 1.55, maxWidth: 620 }}>{blurb}</div>}
      </div>
      {(stats.length > 0 || right) && (
        <div style={R({ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' })}>
          {stats.map((s, i) => {
            const sc = s.color || color;
            return (
              <span key={i} style={pill(tint(sc, 0.13), sc, { fontSize: 11, fontWeight: 700, padding: '4px 12px', border: `1px solid ${tint(sc, 0.26)}`, gap: 4 })}>
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
