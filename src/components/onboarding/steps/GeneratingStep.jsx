import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { C } from '../primitives';

const LINES = [
  'Calculating your target score',
  'Building your study plan',
  'Matching your pathway',
  'Finalizing your plan',
];

export function GeneratingStep({ onNext }) {
  const [pct, setPct] = useState(0);
  const [doneIdx, setDoneIdx] = useState(-1);

  useEffect(() => {
    let raf;
    const start = Date.now();
    const DURATION = 2600;
    function tick() {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      setPct(Math.round(t * 100));
      setDoneIdx(Math.floor(t * LINES.length) - (t >= 1 ? 0 : 1));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onNext, 500);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 30 }}>
        <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={52} fill="none" stroke={C.s3} strokeWidth={7} />
          <motion.circle cx={60} cy={60} r={52} fill="none" stroke="url(#msp-gen-grad)" strokeWidth={7} strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - pct / 100)} style={{ filter: `drop-shadow(0 0 8px rgba(45,127,255,0.5))` }} />
          <defs>
            <linearGradient id="msp-gen-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2d7fff" /><stop offset="100%" stopColor="#5da0ff" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{pct}%</div>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: '0 0 24px', textAlign: 'center' }}>Building your path into medicine…</h1>
      <div style={{ width: '100%', maxWidth: 300 }}>
        {LINES.map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', opacity: i <= doneIdx ? 1 : 0.35, transition: 'opacity .3s' }}>
            {i < doneIdx ? <Check size={16} color={C.greenL} /> : i === doneIdx ? <Loader2 size={16} color={C.blueL} className="spin" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${C.t4}` }} />}
            <span style={{ fontSize: 13, color: i <= doneIdx ? C.t1 : C.t3, fontWeight: i === doneIdx ? 700 : 500 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
