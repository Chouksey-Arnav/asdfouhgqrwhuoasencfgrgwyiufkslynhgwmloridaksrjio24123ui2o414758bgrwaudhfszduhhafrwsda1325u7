import React, { useMemo } from 'react';
import { StepHeader, ContinueButton, WheelColumn, C } from '../primitives';

const SAT_SCORES = Array.from({ length: 121 }, (_, i) => 400 + i * 10);
const ACT_SCORES = Array.from({ length: 36 }, (_, i) => 1 + i);

export function TargetScoreStep({ testTrack, currentScore, value, onChange, onNext }) {
  const scores = testTrack === 'ACT' ? ACT_SCORES : SAT_SCORES;
  const idx = useMemo(() => Math.max(0, scores.indexOf(value)), [scores, value]);
  const delta = value - currentScore;

  return (
    <>
      <StepHeader title="What's your target score?" subtitle="This will help us build your custom study plan." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: C.t3, marginBottom: 8 }}>Target {testTrack} score</div>
        <WheelColumn items={scores} index={idx} width={140} itemH={48} mono onChange={i => onChange(scores[i])} />
        {delta > 0 && (
          <div style={{ marginTop: 22, padding: '10px 18px', borderRadius: 20, background: C.blueDim, border: `1px solid ${C.b2}`, fontSize: 13, fontWeight: 700, color: C.blueL }}>
            +{delta} points from your current baseline
          </div>
        )}
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
