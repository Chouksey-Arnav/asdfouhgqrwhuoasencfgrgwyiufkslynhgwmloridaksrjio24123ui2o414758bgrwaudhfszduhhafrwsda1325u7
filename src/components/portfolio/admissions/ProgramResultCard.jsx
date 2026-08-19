// ─────────────────────────────────────────────────────────────────────────────
// One programme's result.
//
// The layout is an argument about what a student should read first, in order:
//
//   1. Whether they are ELIGIBLE. A failed hard gate replaces the whole card
//      with what would have to change. There is no number to scroll past.
//   2. The RANGE, with the uncertainty visible as an actual band rather than a
//      number with a disclaimer under it.
//   3. WHERE THEY SIT against the 25th, 50th and 75th — all three, on one row,
//      because showing only the 25th is how "qualified" becomes "likely".
//   4. WHAT WOULD MOVE IT MOST, three or four things, ranked by how much they
//      would actually change the estimate under this model.
//   5. WHAT THIS PROGRAMME WEIGHTS, and which of the student's own activities
//      match it.
//   6. WHY WE ARE NOT SURE — itemised, so the confidence label is auditable.
//   7. The lottery, where one genuinely exists.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, TrendingUp, Target, Microscope, Stethoscope, HeartHandshake, Dices,
  ExternalLink, Info, ArrowUpRight, Scale, CalendarClock,
} from 'lucide-react';
import { C, glass, glass2, btnSm, R, CC, G, pill, tint, accentText } from '../../../lib/theme';
import { SectionTitle } from '../../ui/PanelHero';
import Disclosure, { HelpNote } from '../../ui/Disclosure';
import { ROUND_LABELS } from '../../../lib/admissions';

const pct = (v) => (v == null ? '—' : v < 0.1 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);

const CONFIDENCE_COLOR = { high: C.green, moderate: C.blue, low: C.amber, 'very-low': C.rose };
const EMPHASIS_ICON = { research: Microscope, clinical: Stethoscope, service: HeartHandshake, balanced: Scale };

/**
 * The range bar. The width of the shaded band IS the uncertainty — a student
 * should be able to see at a glance that a wide band means we do not know,
 * without reading a word.
 */
function RangeBar({ probability, color }) {
  // Scaled to the model's own ceiling for this programme rather than to 100%,
  // so a 3–13% range at an ultra-selective programme is legible instead of
  // being four invisible pixels at the left edge. The ceiling is labelled.
  const max = Math.max(probability.ceiling, probability.high * 1.15, 0.05);
  const x = (v) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <div>
      <div style={{ position: 'relative', height: 30, borderRadius: 8, background: C.s3, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: x(probability.low), width: `calc(${x(probability.high)} - ${x(probability.low)})`,
          top: 0, bottom: 0, background: `linear-gradient(90deg,${tint(color, 0.5)},${tint(color, 0.85)})`,
          borderRadius: 8, minWidth: 4,
        }} />
        <div style={{ position: 'absolute', left: x(probability.point), top: 3, bottom: 3, width: 2, background: C.t1, opacity: 0.75 }} />
      </div>
      <div style={R({ justifyContent: 'space-between', marginTop: 5 })}>
        <span style={{ fontSize: 10, color: C.t3, fontFamily: C.FM }}>0%</span>
        <span style={{ fontSize: 10, color: C.t3 }}>the band is the uncertainty, not decoration</span>
        <span style={{ fontSize: 10, color: C.t3, fontFamily: C.FM }}>{pct(max)}</span>
      </div>
    </div>
  );
}

/** The 25th / 50th / 75th row — all three, never one. */
function PercentileRow({ band, label, isMobile }) {
  if (!band) return null;
  const marks = [
    { k: 'p25', label: '25th percentile', v: band.p25 },
    { k: 'p50', label: 'Median admit', v: band.p50 },
    { k: 'p75', label: '75th percentile', v: band.p75 },
  ].filter(m => m.v != null);
  if (!marks.length) return null;

  const fmt = (v) => (v < 10 ? v.toFixed(2) : Math.round(v));
  const color = band.position === 'at-or-above-75th' ? C.green
    : band.position === 'median-to-75th' ? C.blue
      : band.position === '25th-to-median' ? C.amber : C.rose;

  return (
    <div style={glass2({ padding: 13 })}>
      <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 9 })}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t2, fontFamily: C.FD }}>{label}</span>
        <span style={pill(tint(color, 0.16), accentText(color), { fontSize: 10 })}>you: {fmt(band.value)}</span>
      </div>
      <div style={G(marks.length, 8, {}, isMobile)}>
        {marks.map(m => {
          const isYourSide = band.value >= m.v;
          return (
            <div key={m.k} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 7, background: isYourSide ? tint(C.green, 0.07) : tint(C.rose, 0.06) }}>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: C.FM, color: isYourSide ? C.t1 : C.t3 }}>{fmt(m.v)}</div>
              <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 9, fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{band.readout}</div>
      {band.basis && band.basis !== 'published' && band.note && (
        <div style={{ marginTop: 7 }}><HelpNote color={C.amber} icon={Info}>{band.note}</HelpNote></div>
      )}
    </div>
  );
}

/** The blocked state — no percentage, only what would have to change. */
function Blocked({ result, isMobile }) {
  return (
    <div style={{ ...glass({ padding: isMobile ? 16 : 20 }), border: `1px solid ${tint(C.rose, 0.4)}`, background: `linear-gradient(120deg,${tint(C.rose, 0.07)},rgba(255,255,255,0.01))` }}>
      <div style={R({ gap: 11, marginBottom: 10 })}>
        <ShieldAlert size={19} color={C.rose} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{result.program.name}</div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2 }}>{result.program.institution}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.t1, fontWeight: 700, lineHeight: 1.6, marginBottom: 6 }}>{result.headline}</div>
      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.65, marginBottom: 14 }}>{result.explanation}</div>

      <div style={CC({ gap: 9 })}>
        {result.whatWouldChange.map((w, i) => (
          <div key={i} style={{ ...glass2({ padding: 13 }), borderLeft: `3px solid ${w.fixable === 'no' ? C.rose : w.fixable === 'timing' ? C.amber : C.blue}` }}>
            <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 5 })}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{w.label}</span>
              <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>
                {w.fixable === 'no' ? 'cannot be changed' : w.fixable === 'timing' ? 'fixable, but it takes time' : 'fixable'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{w.remedy}</div>
            {w.published && <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.55, marginTop: 6, fontStyle: 'italic' }}>Published: “{w.published}”</div>}
          </div>
        ))}
      </div>

      {result.gates.uncheckable?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <HelpNote color={C.amber}>
            {result.gates.uncheckable.length} further requirement{result.gates.uncheckable.length === 1 ? '' : 's'} we still cannot check — answer {[...new Set(result.gates.uncheckable.flatMap(g => g.missing))].join(', ')} in the intake above.
          </HelpNote>
        </div>
      )}
    </div>
  );
}

export default function ProgramResultCard({ result, portfolio, onRoundChange, roundId, isMobile }) {
  if (!result || result.error) return null;
  if (result.blocked) return <Blocked result={result} isMobile={isMobile} />;

  const { probability, confidence, program, layers, drivers, baseRate, uncertainty, lottery } = result;
  const cColor = CONFIDENCE_COLOR[confidence.level] || C.blue;
  const EmphasisIcon = EMPHASIS_ICON[layers.weighting.emphasis] || Scale;

  // Which of the student's own things matter most here — the weighting profile
  // turned into a sentence about their record rather than a table of numbers.
  const rankedDimensions = result.contributions
    .filter(c => c.key !== 'academics')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass({ padding: isMobile ? 16 : 22 }), border: `1px solid ${tint(cColor, 0.26)}` }}>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <div style={R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 })}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em' }}>{program.name}</div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 3 }}>
            {/* Derived school profiles have institution === name, and printing the
                same string twice reads as a rendering bug rather than as detail. */}
            {program.institution !== program.name ? program.institution : 'Profile derived from admitted-student midpoints'}
            {program.url && <> · <a href={program.url} target="_blank" rel="noreferrer" style={{ color: C.blueL || C.blue, textDecoration: 'none' }}>their admissions page <ExternalLink size={9} style={{ verticalAlign: 'middle' }} /></a></>}
          </div>
        </div>
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          <span style={pill(tint(cColor, 0.15), accentText(cColor), { fontSize: 10.5 })}>{confidence.label}</span>
          {program.derived && <span style={pill(C.s3, C.t3, { fontSize: 10 })}>derived profile</span>}
          {baseRate.isEstimate && <span style={pill(tint(C.amber, 0.15), accentText(C.amber), { fontSize: 10 })}>admit rate is an estimate</span>}
        </div>
      </div>

      {/* ── The range ─────────────────────────────────────────────────────── */}
      <div style={{ ...glass2({ padding: isMobile ? 14 : 18 }), marginBottom: 14 }}>
        <div style={R({ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8, marginBottom: 12 })}>
          <div>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, fontFamily: C.FM, color: cColor, letterSpacing: '-.03em', lineHeight: 1 }}>
              {result.display.range}
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 5 }}>
              Estimated chance of admission — a range, because a single number would be a claim about precision we have not earned.
            </div>
          </div>
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize: 11, color: C.t3 }}>Everyone who applies</div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.FM, color: C.t2 }}>{pct(baseRate.published ?? baseRate.assumed)}</div>
          </div>
        </div>

        <RangeBar probability={probability} color={cColor} />

        <div style={{ marginTop: 11, fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{confidence.note}</div>
        {result.display.ceilingNote && (
          <div style={{ marginTop: 8 }}><HelpNote color={C.amber} icon={Info}>{result.display.ceilingNote}</HelpNote></div>
        )}
        {baseRate.estimateWarning && (
          <div style={{ marginTop: 8 }}><HelpNote color={C.amber} icon={Info}>{baseRate.estimateWarning}</HelpNote></div>
        )}
        {baseRate.hookAdjustment?.note && (
          <div style={{ marginTop: 8 }}><HelpNote color={C.violet} icon={Info}>{baseRate.hookAdjustment.note}</HelpNote></div>
        )}
      </div>

      {/* ── The lottery, where one genuinely exists ────────────────────────── */}
      {lottery && (
        <div style={{ ...glass2({ padding: 14 }), border: `1px solid ${tint(C.violet, 0.4)}`, background: tint(C.violet, 0.05), marginBottom: 14 }}>
          <div style={R({ gap: 9, marginBottom: 7 })}>
            <Dices size={16} color={C.violet} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Some of this is genuinely random</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{lottery.note}</div>
          {lottery.published && <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.55, marginTop: 7, fontStyle: 'italic' }}>Published: “{lottery.published}”</div>}
        </div>
      )}

      {/* ── Where you sit: all three percentiles ──────────────────────────── */}
      <SectionTitle icon={Target} color={C.blue}>Where you sit against admitted students</SectionTitle>
      <div style={{ ...CC({ gap: 10 }), marginBottom: 8 }}>
        <PercentileRow band={layers.academic.bands.gpa} label="GPA" isMobile={isMobile} />
        {layers.academic.testCounts && <PercentileRow band={layers.academic.bands.sat} label="SAT" isMobile={isMobile} />}
        {layers.academic.testCounts && <PercentileRow band={layers.academic.bands.act} label="ACT" isMobile={isMobile} />}
      </div>
      <div style={{ marginBottom: 18 }}>
        <HelpNote color={C.amber} icon={Info}>{layers.academic.leverageNote}</HelpNote>
        {layers.academic.notes.map((n, i) => <div key={i} style={{ marginTop: 6 }}><HelpNote>{n}</HelpNote></div>)}
      </div>

      {/* ── What would move it most ───────────────────────────────────────── */}
      {drivers.length > 0 && (
        <>
          <SectionTitle icon={TrendingUp} color={C.green}>What would move this most</SectionTitle>
          <div style={{ ...CC({ gap: 9 }), marginBottom: 18 }}>
            {drivers.slice(0, 4).map((d, i) => (
              <div key={d.key + i} style={{ ...glass2({ padding: 13 }), borderLeft: `3px solid ${d.immovable ? C.t3 : C.green}` }}>
                <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{d.label}</span>
                  <span style={pill(tint(d.gain > 0 ? C.green : C.t3, 0.15), accentText(d.gain > 0 ? C.green : C.t3), { fontSize: 10, fontFamily: C.FM })}>
                    {d.gain > 0 ? '+' : ''}{(d.gain * 100).toFixed(1)} pts
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{d.detail}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── What this programme actually weights ──────────────────────────── */}
      <SectionTitle icon={EmphasisIcon} color={C.violet}>What this programme weights</SectionTitle>
      <div style={{ ...glass2({ padding: 14 }), marginBottom: 8 }}>
        <div style={R({ gap: 8, marginBottom: 9, flexWrap: 'wrap' })}>
          <span style={pill(tint(C.violet, 0.16), accentText(C.violet), { fontSize: 10.5 })}>{layers.weighting.emphasis}-leaning</span>
          <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>
            {layers.weighting.emphasisBasis === 'inferred' ? 'inferred from the school profile' : 'from published criteria'}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65, marginBottom: 12 }}>{layers.weighting.emphasisNote}</div>

        <div style={CC({ gap: 7 })}>
          {rankedDimensions.map(c => {
            const dim = layers.portfolio[c.key];
            const strong = c.z >= 0.6745;
            return (
              <div key={c.key} style={R({ gap: 10, alignItems: 'flex-start' })}>
                <div style={{ width: 46, flexShrink: 0 }}>
                  <div style={{ height: 6, borderRadius: 3, background: C.s3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(c.weight * 250)}%`, maxWidth: '100%', height: '100%', background: C.violet }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 3, fontFamily: C.FM }}>{Math.round(c.weight * 100)}%</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: strong ? C.t1 : C.t2 }}>
                    {DIM_LABELS[c.key] || c.key}
                    {strong && <span style={{ ...pill(tint(C.green, 0.14), accentText(C.green), { fontSize: 9, marginLeft: 7 }) }}>your strength here</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55, marginTop: 2 }}>{dim?.note}</div>
                  {dim?.sustain?.known && <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5, marginTop: 3 }}>{dim.sustain.note}</div>}
                  {dim?.evidence?.note && <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5, marginTop: 3 }}>{dim.evidence.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Round ─────────────────────────────────────────────────────────── */}
      <SectionTitle icon={CalendarClock} color={C.orange}>Which round you apply in</SectionTitle>
      <div style={{ ...glass2({ padding: 14 }), marginBottom: 8 }}>
        {layers.round.applicable ? (
          <>
            <div style={R({ gap: 6, flexWrap: 'wrap', marginBottom: 10 })}>
              {(layers.round.available || []).map(r => (
                <button key={r.id} onClick={() => onRoundChange?.(r.id)}
                  style={btnSm(roundId === r.id ? tint(C.orange, 0.2) : C.s3, {
                    fontSize: 11.5, color: roundId === r.id ? accentText(C.orange) : C.t2,
                    border: `1px solid ${roundId === r.id ? tint(C.orange, 0.45) : C.b1}`,
                  })}>{r.label || ROUND_LABELS[r.id] || r.id}</button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{layers.round.note}</div>
          </>
        ) : (
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{layers.round.note}</div>
        )}
      </div>

      {/* ── Why we are not sure ───────────────────────────────────────────── */}
      <Disclosure id={`admissions-why-${program.id}`} title="Why we're not more certain than this"
        sub={`${uncertainty.reasons.length} named reasons — the confidence label is auditable, not a vibe.`}
        icon={Info} color={C.t3} m={isMobile}>
        <div style={CC({ gap: 8 })}>
          {uncertainty.reasons.map(r => (
            <div key={r.id} style={{ ...glass2({ padding: 11, display: 'flex', gap: 9, alignItems: 'flex-start' }), borderLeft: `3px solid ${r.fixable ? C.amber : C.t3}` }}>
              <span style={{ fontSize: 10, fontFamily: C.FM, color: C.t3, flexShrink: 0, width: 30 }}>±{r.sigma.toFixed(2)}</span>
              <span style={{ flex: 1, fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{r.label}</span>
              {r.fixable && <span style={pill(tint(C.amber, 0.14), accentText(C.amber), { fontSize: 9, flexShrink: 0 })}>you can fix this</span>}
            </div>
          ))}
        </div>
        {(program.sources || []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>Sources</span>
            <div style={{ ...CC({ gap: 5 }), marginTop: 6 }}>
              {program.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blueL || C.blue, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <ArrowUpRight size={10} />{s.label} <span style={{ color: C.t3 }}>· read {s.retrieved}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Disclosure>
    </motion.div>
  );
}

const DIM_LABELS = {
  clinical: 'Clinical hours', shadowing: 'Shadowing', research: 'Research', service: 'Community service',
  leadership: 'Leadership', competitions: 'Competitions & awards', certifications: 'Certifications',
};
