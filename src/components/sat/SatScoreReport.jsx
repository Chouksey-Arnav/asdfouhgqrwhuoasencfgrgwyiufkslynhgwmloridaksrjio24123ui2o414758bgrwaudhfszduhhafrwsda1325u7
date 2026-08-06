import React, { useMemo } from 'react';
import { Trophy, ChevronRight, Info, Clock, Layers, AlertTriangle, TrendingUp } from 'lucide-react';
import { C, glass2, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import { StatTile } from '../ui/PanelHero';
import { SatPageHeader, SatCard, satBtn } from './satUi';
import { Bar } from '../ui/primitives';
import { domainBreakdown, pacingAnalysis, routingNarrative } from '../../lib/sat/adaptive';
import { SatVideoRecommendations } from './SatVideoRecs';
import { SAT_SECTIONS, skillMeta } from '../../data/sat/taxonomy';
import { SCORE_DISCLAIMER, MODULE_PATHS, ROUTING_THRESHOLD } from '../../data/sat/scoring';

// The score report — the part of a practice test that actually teaches.
// Structured to answer, in order: what did I get, why did the adaptive format
// give me that ceiling, where did the points go, and was pacing a factor.

export default function SatScoreReport({ scored, responses = [], accent = C.violet, isMobile = false, onNavigate, onDone }) {
  const domains = useMemo(() => domainBreakdown(responses), [responses]);
  const pacing = useMemo(() => pacingAnalysis(responses), [responses]);
  const missed = useMemo(() => responses.filter(r => !r.correct), [responses]);

  const worstSkills = useMemo(() => {
    const bySkill = {};
    for (const r of responses) {
      const s = (bySkill[r.skill] ||= { skill: r.skill, total: 0, correct: 0 });
      s.total++;
      if (r.correct) s.correct++;
    }
    return Object.values(bySkill)
      .filter(s => s.total >= 2)
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
      .slice(0, 5);
  }, [responses]);

  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={C.green}
        eyebrow="Practice test complete" title={`${scored.composite}`}
        sub={`Roughly the ${scored.percentile}th percentile nationally. ${SCORE_DISCLAIMER}`}
        meta={Object.entries(scored.sections).map(([sec, s]) => ({
          value: s.scaled, label: SAT_SECTIONS[sec].short, color: SAT_SECTIONS[sec].color,
        }))}
        m={isMobile}
      />

      {/* ── Routing explanation — the most instructive part of an adaptive test ── */}
      <SatCard title="How the adaptive format shaped this" icon={Info} iconColor={accent} m={isMobile}>
        <div style={CC({ gap: 12 })}>
          {Object.entries(scored.sections).map(([sec, s]) => {
            const path = MODULE_PATHS[s.path];
            return (
              <div key={sec} style={{ ...glass2({ padding: 14 }), borderColor: tint(path.color, 0.28) }}>
                <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{SAT_SECTIONS[sec].label}</span>
                  <span style={pill(tint(path.color, 0.16), path.color, { fontSize: 10.5, border: `1px solid ${tint(path.color, 0.3)}` })}>
                    {path.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>{routingNarrative(s)}</div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...R({ gap: 8 }), justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, color: C.t3 }}>Module 1 weighted score</span>
                    <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
                      {Math.round(s.routingFraction * 100)}% · bar is {Math.round(ROUTING_THRESHOLD * 100)}%
                    </span>
                  </div>
                  <Bar pct={s.routingFraction * 100} color={path.color} h={5} />
                </div>
                <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, fontFamily: C.FM }}>
                  {s.rawCorrect} of {s.rawPossible} correct overall
                </div>
              </div>
            );
          })}
        </div>
      </SatCard>

      {/* ── Domain breakdown ── */}
      <SatCard title="Where the points went" icon={Layers} iconColor={C.blue} m={isMobile}>
        <div style={CC({ gap: 12 })}>
          {domains.map(d => (
            <div key={d.domain}>
              <div style={{ ...R({ gap: 8 }), justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>{d.label}</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>
                  {d.correct}/{d.total}
                  {d.avgSeconds != null && ` · ${d.avgSeconds}s avg`}
                </span>
              </div>
              <Bar pct={d.accuracy * 100} color={d.accuracy >= 0.7 ? C.green : d.accuracy >= 0.45 ? C.amber : C.rose} h={5} />
            </div>
          ))}
        </div>
      </SatCard>

      {/* ── Pacing ── */}
      {pacing && (
        <SatCard title="Pacing" icon={Clock} iconColor={C.amber} m={isMobile}>
          <div style={G(3, 12, {}, isMobile)}>
            <StatTile
              icon={Clock} color={pacing.avgRatio > 1.15 ? C.rose : C.green}
              value={pacing.avgRatio ? `${Math.round(pacing.avgRatio * 100)}%` : '—'}
              label="of target time" sub={pacing.avgRatio > 1.15 ? 'running long' : 'on pace'}
            />
            <StatTile
              icon={AlertTriangle} color={C.orange}
              value={pacing.overTimeCount} label="questions ran long"
              sub={pacing.overTimeAccuracy != null ? `${Math.round(pacing.overTimeAccuracy * 100)}% right on those` : undefined}
            />
            <StatTile
              icon={TrendingUp} color={C.violet}
              value={pacing.rushedCount} label="rushed"
              sub={pacing.rushedAccuracy != null ? `${Math.round(pacing.rushedAccuracy * 100)}% right on those` : undefined}
            />
          </div>
          {/* Only draw a conclusion when the comparison is actually informative. */}
          {pacing.overTimeAccuracy != null && pacing.onPaceAccuracy != null && pacing.overTimeCount >= 3 && (
            <div style={{ ...glass2({ padding: 14 }), marginTop: 14 }}>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>
                {pacing.overTimeAccuracy < pacing.onPaceAccuracy - 0.15
                  ? `When you spent well over the target time you got ${Math.round(pacing.overTimeAccuracy * 100)}% right, versus ${Math.round(pacing.onPaceAccuracy * 100)}% when on pace. Extra time is not rescuing those questions — recognizing and skipping them early would bank more points.`
                  : `Your accuracy holds up on the questions you spend longer on (${Math.round(pacing.overTimeAccuracy * 100)}% versus ${Math.round(pacing.onPaceAccuracy * 100)}% on pace), so the extra time is being spent well. The risk is running out of it.`}
              </div>
            </div>
          )}
        </SatCard>
      )}

      {/* ── Weakest skills ── */}
      {worstSkills.length > 0 && (
        <SatCard title="Skills to attack first" icon={AlertTriangle} iconColor={C.rose} m={isMobile}>
          <div style={CC({ gap: 10 })}>
            {worstSkills.map(s => {
              const meta = skillMeta(s.skill);
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <button
                  key={s.skill} onClick={() => onNavigate?.('practice', { skill: s.skill })}
                  style={{ ...glass2({ padding: 13 }), textAlign: 'left', cursor: 'pointer', fontFamily: C.FB, border: `1px solid ${C.b1}` }}
                >
                  <div style={{ ...R({ gap: 10 }), justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{meta.label}</span>
                    <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>{s.correct}/{s.total}</span>
                  </div>
                  <Bar pct={pct} color={meta.color} h={4} />
                </button>
              );
            })}
          </div>
        </SatCard>
      )}

      {/* ── What to actually do about it ──
          A score report that ends at "here is what you are bad at" hands the
          student a diagnosis and no treatment. This is the moment they are most
          willing to act, so the instruction goes here rather than three screens
          away. */}
      <SatVideoRecommendations
        weakSkills={worstSkills.map(s => ({ skill: s.skill, accuracy: s.correct / s.total }))}
        title="Start here before your next test"
        isMobile={isMobile}
        onNavigate={onNavigate}
      />

      <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }) }}>
        {missed.length > 0 && (
          <button onClick={() => onNavigate?.('review')} style={satBtn(C.rose)}>
            Review your {missed.length} misses <ChevronRight size={14} />
          </button>
        )}
        <button onClick={() => onNavigate?.('overview')} style={btnG()}>Back to overview</button>
        <button onClick={onDone} style={btnG()}>Close report</button>
      </div>
    </div>
  );
}
