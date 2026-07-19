import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { C, btn, btnG } from '../lib/theme';

// Post-onboarding product tour — a spotlight overlay that highlights real
// nav elements (via [data-tour] attributes) and drives navigation itself
// through each step's onEnter(), so the highlighted section is actually on
// screen behind the highlight ring. Built custom (no react-joyride/driver.js)
// because the app has no router — everything is driven by the `tab` state in
// App.jsx, and a custom overlay can call setTab directly per step.

const TIP_W = 300;
const TIP_H_EST = 220;
const MARGIN = 16;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function placeTooltip(rect, vw, vh) {
  const w = Math.min(TIP_W, vw - MARGIN * 2);
  const spaceRight = vw - rect.right, spaceBottom = vh - rect.bottom, spaceTop = rect.top;
  let placement;
  if (spaceRight >= w + MARGIN) placement = 'right';
  else if (spaceBottom >= TIP_H_EST + MARGIN) placement = 'bottom';
  else if (spaceTop >= TIP_H_EST + MARGIN) placement = 'top';
  else placement = 'left';

  switch (placement) {
    case 'right': return { top: clamp(rect.top, MARGIN, Math.max(MARGIN, vh - TIP_H_EST - MARGIN)), left: rect.right + MARGIN, width: w, transform: 'none' };
    case 'left': return { top: clamp(rect.top, MARGIN, Math.max(MARGIN, vh - TIP_H_EST - MARGIN)), left: rect.left - MARGIN, width: w, transform: 'translateX(-100%)' };
    case 'bottom': return { top: rect.bottom + MARGIN, left: clamp(rect.left + rect.width / 2 - w / 2, MARGIN, vw - w - MARGIN), width: w, transform: 'none' };
    default: return { top: rect.top - MARGIN, left: clamp(rect.left + rect.width / 2 - w / 2, MARGIN, vw - w - MARGIN), width: w, transform: 'translateY(-100%)' };
  }
}

export default function AppTour({ steps, onFinish, onSkip }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];

  useEffect(() => { step?.onEnter?.(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    let raf1, raf2;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Double rAF: onEnter's setTab() needs a render + paint before the target exists/moves.
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(measure); });
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('resize', measure); };
  }, [i, step]);

  const next = useCallback(() => { if (i < steps.length - 1) setI(v => v + 1); else onFinish?.(); }, [i, steps.length, onFinish]);
  const back = useCallback(() => { if (i > 0) setI(v => v - 1); }, [i]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onSkip?.(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, back, onSkip]);

  if (!step) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const pad = 8;
  const tip = rect
    ? placeTooltip(rect, vw, vh)
    : { top: Math.max(MARGIN, vh * 0.32), left: clamp(vw / 2 - TIP_W / 2, MARGIN, vw - TIP_W - MARGIN), width: Math.min(TIP_W, vw - MARGIN * 2), transform: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, fontFamily: C.FB }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,4,10,0.78)' }} />
      {rect && (
        <motion.div
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ position: 'fixed', borderRadius: 12, border: `2px solid ${C.blue}`, boxShadow: `0 0 0 4px ${C.blueGlow}, 0 0 26px ${C.blueGlow}`, pointerEvents: 'none' }}
        />
      )}
      {/* Plain anchor div owns the placement transform (translateX/Y(-100%)) — a nested
          motion.div is used for the fade-in below because framer-motion writes its own
          `transform` for animated x/y, which would silently clobber a manual one here. */}
      <div style={{ position: 'fixed', top: `${tip.top}px`, left: `${tip.left}px`, width: `${tip.width}px`, transform: tip.transform }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}
            style={{ background: C.s1, border: `1px solid ${C.b2}`, borderRadius: 14, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.blueL, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                <Sparkles size={12} />Step {i + 1} of {steps.length}
              </div>
              <button onClick={onSkip} aria-label="Skip tour" style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', padding: 2, display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>{step.title}</div>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginBottom: 16 }}>{step.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {steps.map((_, idx) => (
                  <div key={idx} style={{ width: idx === i ? 16 : 6, height: 6, borderRadius: 3, background: idx === i ? C.blue : C.b2, transition: 'all .2s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {i > 0 && <button onClick={back} style={{ ...btnG({ fontSize: 12, padding: '7px 12px' }), display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={13} />Back</button>}
                <button onClick={next} style={{ ...btn(C.blueGrad, { fontSize: 12, padding: '7px 14px' }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>{i === steps.length - 1 ? 'Finish' : 'Next'}<ChevronRight size={13} /></button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
