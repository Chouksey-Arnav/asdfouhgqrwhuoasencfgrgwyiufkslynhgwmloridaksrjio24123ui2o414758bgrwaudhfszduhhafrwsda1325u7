import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, C } from '../primitives';
import { play } from '../../../lib/sounds';
import { celebrateBonusXP } from '../../../lib/celebrate';

const SEGMENTS = [10, 50, 20, 30, 15, 25, 40, 20];
const COLORS = [C.blue, C.violet, C.green, C.amber, C.rose, C.cyan, C.blueL, C.greenL];

export function SpinWheelStep({ onNext }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  function spin() {
    if (spinning || result) return;
    setSpinning(true);
    const winnerIdx = Math.floor(Math.random() * SEGMENTS.length);
    const segAngle = 360 / SEGMENTS.length;
    const target = 360 * 5 + (360 - winnerIdx * segAngle - segAngle / 2);
    setRotation(target);
    setTimeout(() => {
      setResult(SEGMENTS[winnerIdx]);
      setSpinning(false);
      play('jackpot');
      celebrateBonusXP();
    }, 3200);
  }

  return (
    <>
      <StepHeader title="Spin to unlock an exclusive discount" subtitle="One spin, on the house." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: `16px solid ${C.t1}` }} />
          <motion.svg width={220} height={220} viewBox="0 0 220 220" animate={{ rotate: rotation }} transition={{ duration: 3, ease: [0.12, 0.7, 0.25, 1] }}>
            {SEGMENTS.map((val, i) => {
              const seg = 360 / SEGMENTS.length;
              const a0 = (i * seg - 90) * (Math.PI / 180), a1 = ((i + 1) * seg - 90) * (Math.PI / 180);
              const x0 = 110 + 108 * Math.cos(a0), y0 = 110 + 108 * Math.sin(a0);
              const x1 = 110 + 108 * Math.cos(a1), y1 = 110 + 108 * Math.sin(a1);
              const mid = (a0 + a1) / 2;
              return (
                <g key={i}>
                  <path d={`M110,110 L${x0},${y0} A108,108 0 0,1 ${x1},${y1} Z`} fill={COLORS[i % COLORS.length]} opacity={0.85} stroke={C.bg} strokeWidth={2} />
                  <text x={110 + 72 * Math.cos(mid)} y={110 + 72 * Math.sin(mid)} fill="#fff" fontSize="15" fontWeight="800" textAnchor="middle" dominantBaseline="middle">{val}%</text>
                </g>
              );
            })}
            <circle cx={110} cy={110} r={18} fill={C.bg} stroke={C.b2} strokeWidth={2} />
          </motion.svg>
        </div>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>You won {result}% off!</div>
            <div style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Applied automatically at checkout.</div>
          </motion.div>
        )}
      </div>
      {result ? (
        <ContinueButton onClick={onNext}>Claim {result}% Discount</ContinueButton>
      ) : (
        <ContinueButton onClick={spin} disabled={spinning}>{spinning ? 'Spinning…' : 'Spin the Wheel'}</ContinueButton>
      )}
    </>
  );
}
