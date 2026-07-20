import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C, glass } from '../primitives';

const FEATURES = [
  'Full SAT/ACT question bank & FSRS flashcards',
  'AI Coach — unlimited pathway & essay guidance',
  'Complete application portfolio & deadline tracker',
  'Pathway diagnostic + progress analytics',
];

export function PaywallStep({ onAccept, onDecline }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.blueGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(45,127,255,0.35)' }}>
          <Sparkles size={28} color="#fff" />
        </div>
      </div>
      <StepHeader title="Unlock MedSchoolPrep to reach your goals faster" subtitle="Your plan is built. Here's everything Premium unlocks." />
      <div style={{ flex: 1 }}>
        <div style={glass({ padding: 18, marginBottom: 16 })}>
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Check size={15} color={C.greenL} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>$9.99</span>
          <span style={{ fontSize: 13, color: C.t3 }}>/ month · cancel anytime</span>
        </div>
      </div>
      <div>
        <ContinueButton onClick={onAccept}>Start My Plan</ContinueButton>
        <TextLink onClick={onDecline}>Not now</TextLink>
      </div>
    </>
  );
}
