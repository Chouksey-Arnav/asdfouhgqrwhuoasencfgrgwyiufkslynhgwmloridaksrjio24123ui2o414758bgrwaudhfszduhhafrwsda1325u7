import React from 'react';
import { StepHeader, ContinueButton, MiniLineChart, C } from '../primitives';

export function RealisticTargetStep({ testTrack, currentScore, targetScore, onNext }) {
  const points = [0, 0.22, 0.4, 0.58, 0.78, 0.92, 1];
  return (
    <>
      <StepHeader title={`Reaching ${targetScore} is a realistic target — it's not hard at all.`} subtitle="Based on students with a similar starting point and study plan." />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '22px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: C.t3 }}>Starting point</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.t2, fontFamily: C.FM }}>{currentScore}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.t3 }}>Your target</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.blueL, fontFamily: C.FM }}>{targetScore}</div>
            </div>
          </div>
          <MiniLineChart lines={[{ points, color: C.blue, width: 3, fill: true, endDot: true }]} xLabels={['Today', 'Test day']} />
        </div>
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.blueDim, border: `1px solid ${C.b2}`, fontSize: 13, color: C.blueL, fontWeight: 600, lineHeight: 1.5 }}>
          Students who commit to a structured {testTrack} plan reach their target score in as little as 3 months.
        </div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
