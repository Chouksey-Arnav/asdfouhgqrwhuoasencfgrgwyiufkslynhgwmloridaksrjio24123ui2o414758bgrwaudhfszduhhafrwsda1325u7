import React from 'react';
import { Gift } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C } from '../primitives';
import { inp as themeInp } from '../../../lib/theme';

export function ReferralStep({ value, onChange, onNext }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.violetDim, border: `1px solid rgba(139,92,246,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Gift size={30} color={C.violetL} />
        </div>
      </div>
      <StepHeader title="Enter referral code" subtitle="Optional — got a code from a friend or counselor?" />
      <div style={{ flex: 1 }}>
        <input value={value} onChange={e => onChange(e.target.value.toUpperCase())} placeholder="e.g., FUTUREDOC"
          style={themeInp({ fontSize: 15, padding: '14px 16px', letterSpacing: '.05em', textAlign: 'center', fontFamily: C.FM })} />
      </div>
      <div>
        <ContinueButton onClick={onNext}>Continue</ContinueButton>
        {!value && <TextLink onClick={onNext}>Skip</TextLink>}
      </div>
    </>
  );
}
