import React from 'react';
import { StepHeader, ContinueButton, C } from '../primitives';
import { play } from '../../../lib/sounds';

const LEVELS = [
  { label: 'Steady', points: '10 pts/week', desc: 'Comfortable pace, minimal time commitment.' },
  { label: 'Balanced', points: '20 pts/week', desc: 'Recommended — the pace most students stick with.', recommended: true },
  { label: 'Ambitious', points: '35 pts/week', desc: 'Faster gains, ~1 hour of focused practice daily.' },
  { label: 'Intense', points: '50 pts/week', desc: 'Maximum pace — best with a firm test date.' },
];

export function SpeedStep({ value, onChange, onNext, testTrack }) {
  const idx = value ?? 1;
  const lvl = LEVELS[idx];
  return (
    <>
      <StepHeader title="How fast do you want to improve?" subtitle={`We'll pace your ${testTrack || 'SAT'} plan around this.`} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{lvl.points}</div>
          {lvl.recommended && (
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: C.greenDim, color: C.greenL, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Recommended</span>
          )}
        </div>
        <input
          type="range" min={0} max={LEVELS.length - 1} step={1} value={idx}
          onChange={e => { onChange(Number(e.target.value)); play('click'); }}
          style={{ width: '100%', accentColor: C.blue, height: 6, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {LEVELS.map((l, i) => (
            <span key={l.label} style={{ fontSize: 10.5, fontWeight: i === idx ? 800 : 500, color: i === idx ? C.blueL : C.t4 }}>{l.label}</span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginTop: 26, textAlign: 'center' }}>{lvl.desc}</p>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
