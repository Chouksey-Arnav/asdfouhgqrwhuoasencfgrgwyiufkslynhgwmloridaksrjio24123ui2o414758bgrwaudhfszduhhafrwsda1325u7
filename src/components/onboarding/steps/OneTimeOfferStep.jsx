import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C, glass } from '../primitives';

export function OneTimeOfferStep({ discount = 80, onAccept, onDecline }) {
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#f43f5e,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(244,63,94,0.35)' }}>
          <Flame size={28} color="#fff" />
        </div>
      </div>
      <StepHeader title="Your one-time offer" subtitle="This deal disappears once you leave this screen." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={glass({ padding: '26px 28px', textAlign: 'center' })}>
          <div style={{ fontSize: 44, fontWeight: 800, color: C.roseL, fontFamily: C.FD, lineHeight: 1 }}>{discount}% OFF</div>
          <div style={{ fontSize: 13, color: C.t2, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 6 }}>Forever</div>
          <div style={{ marginTop: 18, fontFamily: C.FM, fontSize: 22, fontWeight: 800, color: C.t1, letterSpacing: '.05em' }}>{mm}:{ss}</div>
          <div style={{ fontSize: 11, color: C.t4, marginTop: 4 }}>Offer expires</div>
        </div>
      </div>
      <div>
        <ContinueButton onClick={onAccept}>Claim {discount}% Off Forever</ContinueButton>
        <TextLink onClick={onDecline}>No thanks, I'll pay full price later</TextLink>
      </div>
    </>
  );
}
