import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ChevronDown, ChevronRight, Target, Lightbulb, AlertTriangle, Clock } from 'lucide-react';
import { C, glass2, btn, R, CC, tint, pill } from '../../lib/theme';
import { SatPageHeader, SatCard, Segmented } from './satUi';
import { Bar } from '../ui/primitives';
import SatSkillHeatmap from './SatSkillHeatmap';
import { strategyFor } from '../../data/sat/strategies';
import { SAT_SECTIONS } from '../../data/sat/taxonomy';
import { confidenceBand } from '../../lib/sat/mastery';
import { questionCountForSkill } from '../../data/sat/questions/index.js';
import { SatVideoRecommendations, SatSkillVideos } from './SatVideoRecs';

// Skill Mastery — every tested skill with its measured mastery, its sample
// size, its pacing, and a strategy card for how to attack it.
//
// The sample size is displayed on every row on purpose. "75% mastery" from
// three questions and from forty questions are very different claims, and a
// product that renders them identically is lying by omission.

const SORTS = [
  { id: 'leverage', label: 'By leverage' },
  { id: 'weakest', label: 'Weakest first' },
  { id: 'unpractised', label: 'Not practised' },
];

export default function SatSkillsPanel({ accent = C.sky, satData, isMobile = false, onNavigate }) {
  const { ranked, masteryMap } = satData;
  const [sort, setSort] = useState('leverage');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    let r = [...ranked];
    if (sectionFilter !== 'all') r = r.filter(x => x.section === sectionFilter);
    if (sort === 'weakest') r.sort((a, b) => (a.attempts ? a.mastery : 2) - (b.attempts ? b.mastery : 2));
    else if (sort === 'unpractised') r.sort((a, b) => a.attempts - b.attempts);
    return r;
  }, [ranked, sort, sectionFilter]);

  const measured = Object.values(masteryMap).filter(m => m.attempts > 0).length;

  // Only MEASURED skills get a video recommendation. Recommending a lesson for
  // a skill the student has never attempted is not advice, it is a table of
  // contents — and it would push the genuinely weak skills off the card.
  const videoTargets = useMemo(
    () => ranked
      .filter(r => r.attempts > 0 && r.mastery < 0.85)
      .slice(0, 3)
      .map(r => ({ skill: r.skill, accuracy: r.mastery })),
    [ranked],
  );

  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={accent}
        eyebrow="SAT · Skill mastery" title="All 28 tested skills"
        sub="Every skill the Digital SAT tests, with what we have actually measured about yours. Numbers you have barely any data for say so."
        meta={[
          { value: measured, label: `of ${Object.keys(masteryMap).length} measured` },
        ]}
        m={isMobile}
        tourTag="sat-deep-skills"
      />

      <SatCard title="Heat map" icon={Target} iconColor={accent} m={isMobile}>
        <SatSkillHeatmap masteryMap={masteryMap} isMobile={isMobile} onSelect={(s) => setExpanded(s)} />
      </SatCard>

      <SatVideoRecommendations
        weakSkills={videoTargets}
        title="Lessons for your weakest skills"
        isMobile={isMobile}
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div style={R({ gap: 14, flexWrap: 'wrap' })}>
        <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} accent={accent} />
        <Segmented
          label="Section" accent={accent} value={sectionFilter} onChange={setSectionFilter}
          options={[{ id: 'all', label: 'Both' }, ...Object.values(SAT_SECTIONS).map(s => ({ id: s.id, label: s.label }))]}
        />
      </div>

      {/* Skill rows */}
      <div style={CC({ gap: 10 })}>
        {rows.map(s => {
          const isOpen = expanded === s.skill;
          const strategy = strategyFor(s.skill);
          const bankSize = questionCountForSkill(s.skill);
          const band = confidenceBand(s.confidence);
          const pacingOff = s.pacingRatio && s.pacingRatio > 1.3;
          return (
            <div key={s.skill} style={{
              background: C.surf, border: `1px solid ${isOpen ? tint(accent, 0.35) : C.b1}`,
              borderRadius: 14, overflow: 'hidden', boxShadow: C.shadowSm, transition: 'border-color .18s ease',
            }}>
              <button
                onClick={() => setExpanded(isOpen ? null : s.skill)}
                style={{ width: '100%', textAlign: 'left', padding: isMobile ? 14 : 16, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FB }}
              >
                <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginBottom: 9 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.label}</span>
                  <span style={pill(tint(s.color, 0.13), s.color, { fontSize: 9.5 })}>{s.domainLabel}</span>
                  {pacingOff && (
                    <span style={pill(tint(C.orange, 0.14), C.orangeL, { fontSize: 9.5, gap: 4 })}>
                      <Clock size={9} /> slow
                    </span>
                  )}
                  <ChevronDown size={14} color={C.t3} style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </div>

                <div style={R({ gap: 12 })}>
                  <div style={{ flex: 1 }}>
                    <Bar pct={s.attempts ? s.mastery * 100 : 0} color={s.attempts ? s.color : C.t4} h={5} />
                  </div>
                  <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, whiteSpace: 'nowrap' }}>
                    {s.attempts
                      ? `${Math.round(s.mastery * 100)}% · ${band.label} (${s.attempts})`
                      : 'not practised'}
                  </span>
                </div>

                <div style={{ ...R({ gap: 12, flexWrap: 'wrap' }), marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: C.t4 }}>~{(s.examShare * 98).toFixed(1)} questions per exam</span>
                  {s.avgSeconds != null && (
                    <span style={{ fontSize: 10, color: pacingOff ? C.orangeL : C.t4 }}>
                      {s.avgSeconds}s avg vs {s.targetSeconds}s target
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: C.t4 }}>{bankSize} in bank</span>
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: isMobile ? '0 14px 14px' : '0 16px 16px' }}>
                      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7, marginBottom: 12 }}>{s.blurb}</div>

                      {strategy && (
                        <div style={{ ...glass2({ padding: 14 }), borderColor: tint(C.amber, 0.22) }}>
                          <div style={{ ...R({ gap: 6 }), marginBottom: 8 }}>
                            <Lightbulb size={13} color={C.amberL} />
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.amberL, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                              How to attack it
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.7, fontWeight: 600, marginBottom: 10 }}>
                            {strategy.approach}
                          </div>
                          <ol style={{ margin: 0, paddingLeft: 18, color: C.t2, fontSize: 12, lineHeight: 1.8 }}>
                            {strategy.steps.map((st, i) => <li key={i}>{st}</li>)}
                          </ol>
                          {strategy.watchFor && (
                            <div style={{ ...R({ gap: 7, alignItems: 'flex-start' }), marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.b1}` }}>
                              <AlertTriangle size={12} color={C.roseL} style={{ marginTop: 2, flexShrink: 0 }} />
                              <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{strategy.watchFor}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instruction beside the strategy. A student who has
                          just read "how to attack it" and does not follow it
                          needs someone to teach the underlying rule, not a
                          bigger drill button. */}
                      <div style={{ marginTop: 14 }}>
                        <SatSkillVideos skill={s.skill} limit={2} isMobile={isMobile} />
                      </div>

                      <button
                        onClick={() => onNavigate?.('practice', { skill: s.skill })}
                        style={{ ...btn(`linear-gradient(135deg,${s.color},${s.color}cc)`, { marginTop: 14, padding: '8px 16px', fontSize: 12 }) }}
                      >
                        Drill this skill <ChevronRight size={13} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
