import React from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, C } from '../primitives';
import { COMMIT_LEVELS, commitmentIntel } from '../personalize';
import { play } from '../../../lib/sounds';

// Daily time commitment — replaces the old "points per week" slider, which
// happily offered 50 pts/week to a student sitting at 1590. Minutes are the
// one thing every student can actually control, and commitmentIntel() adapts
// what those minutes buy to their real situation: score growth for most,
// experiences-and-application time when the score is already handled, an
// honest nudge toward the higher gears when the climb is steep.
export function SpeedStep({ value, answers, onChange, onNext }) {
  const idx = value ?? 1;
  const intel = commitmentIntel(answers, idx);
  return (
    <>
      <StepHeader eyebrow="Your commitment" title="How much time can you give this each day?"
        subtitle="Your whole plan — prep, experiences, and application — is paced around this. Honest beats heroic." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
            {intel.minutes}<span style={{ fontSize: 20, color: C.t3, fontWeight: 700 }}> min/day</span>
          </div>
          {intel.recommended && (
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, background: C.greenDim, color: C.greenL, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Recommended</span>
          )}
        </div>
        <input
          type="range" min={0} max={COMMIT_LEVELS.length - 1} step={1} value={idx}
          onChange={e => { onChange(Number(e.target.value)); play('click'); }}
          style={{ width: '100%', accentColor: C.blue, height: 6, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {COMMIT_LEVELS.map((l, i) => (
            <span key={l.label} style={{ fontSize: 10.5, fontWeight: i === idx ? 800 : 500, color: i === idx ? C.blueL : C.t4 }}>{l.label}</span>
          ))}
        </div>
        <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          style={{ marginTop: 24, padding: '14px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blueL, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{intel.split}</div>
          <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, margin: 0 }}>{intel.desc}</p>
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
