import React, { useState } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C } from '../primitives';

export function CalendarStep({ onNext }) {
  const [connected, setConnected] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.blueDim, border: `1px solid ${C.b2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarDays size={30} color={C.blueL} />
        </div>
      </div>
      <StepHeader title="Connect your calendar" subtitle="We'll auto-schedule your study sessions and application deadlines so nothing slips." />
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 14,
          background: connected ? C.greenDim : 'rgba(255,255,255,0.03)', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : C.b1}`,
        }}>
          {connected && <Check size={18} color={C.greenL} />}
          <span style={{ fontSize: 13.5, color: connected ? C.greenL : C.t2, fontWeight: 600 }}>
            {connected ? 'Calendar connected' : 'Not connected yet'}
          </span>
        </div>
      </div>
      <div>
        <ContinueButton onClick={() => { setConnected(true); setTimeout(onNext, 450); }}>{connected ? 'Connected' : 'Connect Calendar'}</ContinueButton>
        <TextLink onClick={onNext}>Maybe later</TextLink>
      </div>
    </>
  );
}
