import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Stethoscope, CheckCircle2 } from 'lucide-react';
import { StepHeader, ContinueButton, MiniLineChart, useCountUp, C } from '../primitives';
import { scoreScenario, journeyForecast } from '../personalize';

// The trajectory verdict — the screen where the onboarding proves it has a
// brain. Six honest scenarios from personalize.js instead of one cheerleading
// template: already-there, nearly-done polish (1590→1600 gets "your score is
// basically finished", not a pace slider), easy reach, solid target, ambitious
// climb, and a blunt "this gap does not fit your timeline" reset that shows
// what IS achievable by their date and maps the retake path.
const BAND_STYLE = {
  beyond: { color: C.violet, colorL: C.violetL, dim: C.violetDim, curve: [0.55, 0.6, 0.66, 0.74, 0.82, 0.92, 1] },
  polish: { color: C.teal, colorL: C.tealL, dim: C.tealDim, curve: [0.72, 0.8, 0.87, 0.92, 0.96, 0.99, 1] },
  reach: { color: C.green, colorL: C.greenL, dim: C.greenDim, curve: [0.15, 0.34, 0.52, 0.68, 0.82, 0.93, 1] },
  solid: { color: C.blue, colorL: C.blueL, dim: C.blueDim, curve: [0.08, 0.2, 0.36, 0.54, 0.72, 0.88, 1] },
  climb: { color: C.amber, colorL: C.amberL, dim: C.amberDim, curve: [0.05, 0.12, 0.24, 0.4, 0.58, 0.8, 1] },
  reset: { color: C.rose, colorL: C.roseL, dim: C.roseDim, curve: [0.06, 0.16, 0.3, 0.44, 0.56, 0.66, 0.72] },
};
const BAND_CTA = {
  beyond: 'Aim my energy right',
  polish: 'Focus on what matters now',
  climb: "I'm up for it",
  reset: 'Build the honest plan',
};

export function RealisticTargetStep({ answers, onNext }) {
  const sc = scoreScenario(answers);
  const st = BAND_STYLE[sc.band];
  const { currentScore, targetScore, testTrack } = answers;
  const shownDelta = useCountUp(Math.max(0, sc.delta), { delay: 500 });
  // For the honest-reset band the chart ends at what's actually achievable by
  // their date — never at the fantasy number.
  const endScore = sc.band === 'reset' ? sc.achievable : targetScore;
  return (
    <>
      <StepHeader eyebrow={sc.band === 'reset' ? 'The honest read' : 'Your trajectory'} title={sc.headline} subtitle={sc.sub} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '22px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.t3 }}>Today's {testTrack}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.t2, fontFamily: C.FM }}>{currentScore}</div>
            </div>
            {sc.delta > 0 && sc.band !== 'reset' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 16, background: st.dim, border: `1px solid ${st.color}40` }}>
                <TrendingUp size={13} color={st.colorL} />
                <span style={{ fontSize: 13, fontWeight: 800, color: st.colorL, fontFamily: C.FM }}>+{shownDelta}</span>
              </motion.div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.t3 }}>{sc.band === 'reset' ? 'Realistic by test day' : 'Your target'}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: st.colorL, fontFamily: C.FM }}>{endScore}</div>
            </div>
          </div>
          <MiniLineChart height={168}
            lines={[{ points: st.curve, color: st.color, width: 3, fill: true, endDot: true }]}
            xLabels={['Today', sc.band === 'beyond' ? 'Beyond' : `~${sc.months} months`]}
            milestones={sc.milestones}
            endLabel={String(endScore)} />
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: st.dim, border: `1px solid ${st.color}40`, fontSize: 13, color: st.colorL, fontWeight: 600, lineHeight: 1.55 }}>
          {sc.note}
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>{BAND_CTA[sc.band] || 'Continue'}</ContinueButton>
    </>
  );
}

// Post-commitment projection — the whole path into medicine at their chosen
// pace, not just a score curve. When the score is already handled the chart
// gives way entirely to the three threads that actually matter next.
export function PaceForecastStep({ answers, onNext }) {
  const f = journeyForecast(answers);
  const scoreDone = f.scoreDone;
  return (
    <>
      <StepHeader eyebrow="Your road into medicine" title={f.headline} subtitle={f.sub} />
      <div style={{ flex: 1 }}>
        {!scoreDone && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '18px 18px 12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              {[{ label: 'With your MedSchoolPrep plan', color: C.blue }, { label: 'Without a plan', color: C.t4 }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: C.t3 }}>{l.label}</span>
                </div>
              ))}
            </div>
            <MiniLineChart height={148}
              lines={[
                { points: [0.06, 0.24, 0.42, 0.6, 0.76, 0.9, 1], color: C.blue, width: 3, fill: true, endDot: true },
                { points: [0.06, 0.12, 0.2, 0.26, 0.3, 0.36, 0.42], color: C.t4, width: 2, dashed: true },
              ]}
              xLabels={['Today', `~${f.months} month${f.months === 1 ? '' : 's'}`]}
              startLabel={String(f.currentScore)}
              endLabel={String(f.endScore)} />
          </div>
        )}
        {f.threads.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.22, type: 'spring', stiffness: 280, damping: 24 }}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 15px', borderRadius: 13, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, marginBottom: 9 }}>
            {i === 0 && !scoreDone ? <TrendingUp size={17} color={C.blueL} style={{ flexShrink: 0, marginTop: 1 }} /> : i === 0 ? <Stethoscope size={17} color={C.roseL} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 size={17} color={i === 1 ? C.tealL : C.violetL} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{t.detail}</div>
            </span>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
          style={{ marginTop: 12, padding: '13px 16px', borderRadius: 12, background: C.greenDim, border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: C.greenL, fontWeight: 600, lineHeight: 1.5 }}>
          Students following a structured plan progress about twice as fast as students putting in the same hours without one.
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
