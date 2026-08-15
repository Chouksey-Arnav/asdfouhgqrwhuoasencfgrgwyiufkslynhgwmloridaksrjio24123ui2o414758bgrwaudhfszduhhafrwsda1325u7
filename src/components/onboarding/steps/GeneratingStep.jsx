import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Icon, C } from '../primitives';
import { hue, R, meta, display, numeral, GLIDE, GLIDE_FAST, POP, lit } from '../design';
import { LogoMark, EKGLine } from '../brand';
import { generateMaxOutPlan } from '../../../lib/planGenerator';

// The four steps are named after what is actually happening, and each carries
// its own mark so the list reads as work being done rather than as four rows of
// grey text with a spinner on one of them.
const LINES = [
  { icon: 'quote', text: 'Reading everything you told us' },
  { icon: 'dna', text: 'Balancing science depth with real-world steps' },
  { icon: 'route', text: 'Matching your pathway' },
  { icon: 'signature', text: 'Writing your personalized plan' },
];

const BRAND = () => hue(['violet', 'blue']);

// A real generation moment: the animation runs while generateMaxOutPlan()
// (purpose:'plan') actually builds the student's plan. We hold the last
// progress tick until the plan resolves — but never longer than a hard cap,
// since generateMaxOutPlan always returns a usable fallback.
export function GeneratingStep({ profile, onPlan, onNext }) {
  const g = BRAND();
  const [pct, setPct] = useState(0);
  const [doneIdx, setDoneIdx] = useState(-1);
  const planRef = useRef(null);
  const advancedRef = useRef(false);

  // Kick off the real plan generation once.
  useEffect(() => {
    let cancelled = false;
    generateMaxOutPlan(profile || {}).then(plan => {
      if (cancelled) return;
      planRef.current = plan;
      onPlan?.(plan);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let raf;
    const start = Date.now();
    const MIN_DURATION = 2600;   // don't flash by faster than this even if the plan is instant
    const HARD_CAP = 12000;      // never hang the flow waiting on the model
    function advance() { if (!advancedRef.current) { advancedRef.current = true; setPct(100); setDoneIdx(LINES.length); setTimeout(onNext, 500); } }
    function tick() {
      const elapsed = Date.now() - start;
      // Ease toward 92% over MIN_DURATION, then wait for the plan (or the cap) before completing.
      const t = Math.min(1, elapsed / MIN_DURATION);
      const shown = Math.min(92, Math.round(t * 92));
      setPct(shown);
      setDoneIdx(Math.floor((shown / 100) * LINES.length) - (shown >= 92 ? 0 : 1));
      const ready = planRef.current && elapsed >= MIN_DURATION;
      if (ready || elapsed >= HARD_CAP) { advance(); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const RING = 58, CIRC = 2 * Math.PI * RING;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 }}>
      <div style={{ position: 'relative', width: 132, height: 132, marginBottom: 24 }}>
        <svg width={132} height={132} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
          <circle cx={66} cy={66} r={RING} fill="none" stroke={C.s3} strokeWidth={6} />
          <motion.circle cx={66} cy={66} r={RING} fill="none" stroke="url(#msp-gen-grad)" strokeWidth={6} strokeLinecap="round"
            strokeDasharray={CIRC} animate={{ strokeDashoffset: CIRC * (1 - pct / 100) }} transition={{ duration: 0.3, ease: 'linear' }}
            style={{ filter: `drop-shadow(0 0 8px ${g.edge})` }} />
          <defs>
            <linearGradient id="msp-gen-grad" x1="0" y1="0" x2="1" y2="1">
              {/* Matches the logo's violet → cyan sweep, since this ring frames the mark. */}
              <stop offset="0%" stopColor="#A855F7" /><stop offset="55%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
        </svg>
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark size={70} glow={false} />
        </motion.div>
      </div>

      <div style={numeral(30, { color: C.t1, fontWeight: 800, marginBottom: 4 })}>{pct}<span style={{ fontSize: 16, color: C.t3 }}>%</span></div>
      <h1 style={display(19, { color: C.t1, margin: '0 0 6px', textAlign: 'center' })}>Building your path into medicine…</h1>
      <div style={{ width: 200, opacity: 0.8, marginBottom: 18 }}>
        <EKGLine width={200} height={26} color={g.base} />
      </div>

      <div style={{ width: '100%', maxWidth: 330, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LINES.map((l, i) => {
          const done = i < doneIdx;
          const active = i === doneIdx;
          return (
            <motion.div key={l.text}
              animate={{ opacity: i <= doneIdx ? 1 : 0.34 }} transition={GLIDE_FAST}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: R.xs,
                background: active ? g.softer : 'transparent',
                border: `1px solid ${active ? g.edgeSoft : 'transparent'}`,
              }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? g.grad : active ? g.soft : 'transparent',
                border: done ? 'none' : `1px solid ${active ? g.edgeSoft : C.b1}`,
                color: done ? g.onFill : active ? g.ink : C.t4,
                boxShadow: done ? lit(0.22) : 'none',
                transition: 'background .25s, color .25s, border-color .25s',
              }}>
                {done
                  ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={POP} style={{ display: 'flex' }}><Check size={14} strokeWidth={3} /></motion.span>
                  : active ? <Loader2 size={14} className="spin" /> : <Icon name={l.icon} size={14} />}
              </span>
              <span style={{ fontSize: 13, color: i <= doneIdx ? C.t1 : C.t3, fontWeight: active ? 700 : 500 }}>{l.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
