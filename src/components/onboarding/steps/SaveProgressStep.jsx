import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { StepHeader, ContinueButton, C } from '../primitives';
import { inp, lbl } from '../../../lib/theme';

export function SaveProgressStep({ account, value, onChange, onNext }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.greenDim, border: `1px solid rgba(16,185,129,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={30} color={C.greenL} />
        </div>
      </div>
      <StepHeader title="Save your progress" subtitle="One last thing — what should we call you?" />
      <div style={{ flex: 1 }}>
        <span style={lbl()}>Your first name</span>
        <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="e.g., Alex" maxLength={40}
          style={inp({ fontSize: 15, padding: '13px 16px' })} onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onNext(); }} />
        <p style={{ fontSize: 12, color: C.t3, marginTop: 14, lineHeight: 1.6 }}>
          Everything you just told us is saved to <strong style={{ color: C.t2 }}>{account?.email}</strong> — synced across every device.
        </p>
      </div>
      <ContinueButton disabled={!value.trim()} onClick={onNext}>Save & Continue</ContinueButton>
    </>
  );
}
