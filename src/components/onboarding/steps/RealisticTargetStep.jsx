import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { StepHeader, ContinueButton, MiniLineChart, useCountUp, C } from '../primitives';
import { scoreScenario, paceForecast } from '../personalize';

// The old version of this screen told every single student "Reaching X is a
// realistic target — it's not hard at all", whether they were 40 points or 500
// points from their goal. It now renders one of four honest scenarios from
// personalize.js (already-there / easy reach / solid target / ambitious climb),
// each with its own tone, timeline, and a projection chart annotated with the
// student's REAL scores and intermediate checkpoints.
const BAND_STYLE = {
  beyond: { color: C.violet, colorL: C.violetL, dim: C.violetDim, curve: [0.55, 0.6, 0.66, 0.74, 0.82, 0.92, 1] },
  reach: { color: C.green, colorL: C.greenL, dim: C.greenDim, curve: [0.15, 0.34, 0.52, 0.68, 0.82, 0.93, 1] },
  solid: { color: C.blue, colorL: C.blueL, dim: C.blueDim, curve: [0.08, 0.2, 0.36, 0.54, 0.72, 0.88, 1] },
  climb: { color: C.amber, colorL: C.amberL, dim: C.amberDim, curve: [0.05, 0.12, 0.24, 0.4, 0.58, 0.8, 1] },
};

export function RealisticTargetStep({ answers, onNext }) {
  const sc = scoreScenario(answers);
  const st = BAND_STYLE[sc.band];
  const { currentScore, targetScore, testTrack } = answers;
  const shownDelta = useCountUp(Math.max(0, sc.delta), { delay: 500 });
  return (
    <>
      <StepHeader eyebrow="Your trajectory" title={sc.headline} subtitle={sc.sub} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '22px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.t3 }}>Today's {testTrack}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.t2, fontFamily: C.FM }}>{currentScore}</div>
            </div>
            {sc.delta > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 16, background: st.dim, border: `1px solid ${st.color}40` }}>
                <TrendingUp size={13} color={st.colorL} />
                <span style={{ fontSize: 13, fontWeight: 800, color: st.colorL, fontFamily: C.FM }}>+{shownDelta}</span>
              </motion.div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.t3 }}>Your target</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: st.colorL, fontFamily: C.FM }}>{targetScore}</div>
            </div>
          </div>
          <MiniLineChart height={168}
            lines={[{ points: st.curve, color: st.color, width: 3, fill: true, endDot: true }]}
            xLabels={['Today', sc.band === 'beyond' ? 'Beyond' : `~${sc.months} months`]}
            milestones={sc.milestones}
            endLabel={String(targetScore)} />
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: st.dim, border: `1px solid ${st.color}40`, fontSize: 13, color: st.colorL, fontWeight: 600, lineHeight: 1.55 }}>
          {sc.note}
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>{sc.band === 'climb' ? "I'm up for it" : 'Continue'}</ContinueButton>
    </>
  );
}

// Post-pace projection: shows what the chosen pace + timeline actually buys
// them, in their own numbers — replaces the generic "improve 2x faster" chart.
export function PaceForecastStep({ answers, onNext }) {
  const f = paceForecast(answers);
  return (
    <>
      <StepHeader eyebrow="Your projection" title={f.headline} subtitle={f.sub} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '20px 18px 14px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {[{ label: 'With your MedSchoolPrep plan', color: C.blue }, { label: 'Without a plan', color: C.t4 }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: C.t3 }}>{l.label}</span>
              </div>
            ))}
          </div>
          <MiniLineChart height={170}
            lines={[
              { points: [0.06, 0.24, 0.42, 0.6, 0.76, 0.9, 1], color: C.blue, width: 3, fill: true, endDot: true },
              { points: [0.06, 0.12, 0.2, 0.26, 0.3, 0.36, 0.42], color: C.t4, width: 2, dashed: true },
            ]}
            xLabels={['Today', `~${f.months} month${f.months === 1 ? '' : 's'}`]}
            startLabel={String(f.currentScore)}
            endLabel={String(f.targetScore)} />
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.greenDim, border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: C.greenL, fontWeight: 600, lineHeight: 1.5 }}>
          Students following a structured plan improve about twice as fast as students studying the same hours without one.
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
