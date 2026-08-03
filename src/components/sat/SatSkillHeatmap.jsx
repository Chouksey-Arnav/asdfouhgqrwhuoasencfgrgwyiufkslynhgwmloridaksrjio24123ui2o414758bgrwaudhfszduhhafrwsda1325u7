import React from 'react';
import { C, glass2, tint } from '../../lib/theme';
import { SAT_SECTIONS, SAT_DOMAINS, DOMAINS_BY_SECTION, SKILLS_BY_DOMAIN, skillMeta } from '../../data/sat/taxonomy';
import { satWash } from './satUi';

// Skill heat map — every tested skill at a glance, grouped by section and
// domain, coloured by mastery.
//
// Two deliberate choices:
//   * Cells are sized by exam weight, so a skill worth 6 questions per test is
//     visually bigger than one worth 1. Weakness alone is the wrong prompt;
//     weakness x weight is the right one.
//   * Untouched skills render as outlined-empty rather than red. "Not measured"
//     and "measured and bad" are different facts and must not look the same.

const masteryColor = (m, attempts) => {
  if (!attempts) return C.t4;
  if (m >= 0.8) return C.green;
  if (m >= 0.6) return C.lime;
  if (m >= 0.4) return C.amber;
  if (m >= 0.2) return C.orange;
  return C.rose;
};

export default function SatSkillHeatmap({ masteryMap = {}, onSelect, isMobile = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {Object.values(SAT_SECTIONS).map(section => (
        <div key={section.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: section.color }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{section.label}</span>
            <span style={{ fontSize: 10.5, color: C.t3 }}>{section.questions} questions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DOMAINS_BY_SECTION[section.id].map(domainId => {
              const domain = SAT_DOMAINS[domainId];
              return (
                <div key={domainId}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                    {domain.label} · {Math.round(domain.share * 100)}%
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SKILLS_BY_DOMAIN[domainId].map(skillId => {
                      const m = masteryMap[skillId] || { mastery: 0, attempts: 0, confidence: 0 };
                      const meta = skillMeta(skillId);
                      const color = masteryColor(m.mastery, m.attempts);
                      const measured = m.attempts > 0;
                      // Cell width scales with the skill's share of its domain.
                      const flexGrow = Math.max(1, meta.weight * 4);
                      return (
                        <button
                          key={skillId}
                          onClick={() => onSelect?.(skillId)}
                          title={measured
                            ? `${meta.label} — ${Math.round(m.mastery * 100)}% from ${m.attempts} question${m.attempts === 1 ? '' : 's'}`
                            : `${meta.label} — not practised yet`}
                          style={{
                            flexGrow, flexBasis: isMobile ? 100 : 130, minWidth: isMobile ? 100 : 130,
                            textAlign: 'left', padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                            fontFamily: C.FB, transition: 'all .15s',
                            border: `1px solid ${measured ? tint(color, 0.28) : C.b2}`,
                            background: measured
                              ? satWash(color, 0.05 + m.mastery * 0.10)
                              : C.surf2,
                            borderStyle: measured ? 'solid' : 'dashed',
                          }}
                        >
                          <div style={{
                            fontSize: 10.5, fontWeight: 600, color: measured ? C.t1 : C.t3,
                            lineHeight: 1.35, marginBottom: 5,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {meta.label}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: C.FM, lineHeight: 1 }}>
                              {measured ? `${Math.round(m.mastery * 100)}%` : '—'}
                            </span>
                            <span style={{ fontSize: 9, color: C.t4, fontFamily: C.FM }}>
                              {measured ? `n=${m.attempts}` : 'new'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend — spells out that dashed means unmeasured, because a heat map
          that silently equates "unknown" with "bad" is exactly the kind of
          confident-but-wrong signal this tab exists to avoid. */}
      <div style={{ ...glass2({ padding: '10px 14px' }), display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {[[C.rose, '0-20%'], [C.orange, '20-40%'], [C.amber, '40-60%'], [C.lime, '60-80%'], [C.green, '80%+']].map(([col, lab]) => (
          <span key={lab} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.t3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: tint(col, 0.32), border: `1px solid ${tint(col, 0.7)}` }} />
            {lab}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.t3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: `1px dashed ${C.b3}` }} />
          not practised yet
        </span>
        <span style={{ fontSize: 10, color: C.t4 }}>Wider tile = more questions on the real exam</span>
      </div>
    </div>
  );
}
