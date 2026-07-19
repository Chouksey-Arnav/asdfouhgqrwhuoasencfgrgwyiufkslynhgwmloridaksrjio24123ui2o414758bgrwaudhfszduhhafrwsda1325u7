import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { C, btn, btnG } from '../lib/theme';

// Post-onboarding product tour — a spotlight overlay that highlights real nav
// elements (via [data-tour] attributes) and drives navigation itself through
// each step's onEnter(), so whatever's being described is actually on screen
// behind the highlight. Built custom (no react-joyride/driver.js) because the
// app has no router — everything is driven by the `tab`/`prepView`/etc state
// in App.jsx, and a custom overlay can call those setters directly per step.
//
// Steps without a `target` (the welcome and closing slides) render as a
// centered "cover" card instead of an anchored spotlight tooltip — the tour
// opens and closes with a beat that isn't just another tooltip.

const TIP_W = 300;
const TIP_H_EST = 220;
const COVER_W = 340;
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

function centerCard(vw, vh, w) {
  const width = Math.min(w, vw - MARGIN * 2);
  // top:50% + translateY(-50%) centers vertically without needing to know the
  // card's rendered height up front (its height is content-driven).
  return { top: vh / 2, left: clamp(vw / 2 - width / 2, MARGIN, vw - width - MARGIN), width, transform: 'translateY(-50%)' };
}

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir >= 0 ? 26 : -26, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir) => ({ opacity: 0, x: dir >= 0 ? -26 : 26, scale: 0.98 }),
};

export default function AppTour({ steps, accent = C.blue, onFinish, onSkip }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [rect, setRect] = useState(null);
  const step = steps[i];
  const isCover = !step?.target;

  useEffect(() => { step?.onEnter?.(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!step?.target) { setRect(null); return; }
    let raf1, raf2;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      // Prep/Portfolio's pill row scrolls horizontally on narrow viewports, so a
      // target a few pills in (e.g. Flashcards) can start out clipped off-screen.
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Double rAF: onEnter's setTab()/goPrep() need a render + paint before the target exists/moves.
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(measure); });
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('resize', measure); };
  }, [i, step]);

  const next = useCallback(() => { setDir(1); setI(v => (v < steps.length - 1 ? v + 1 : v)); if (i >= steps.length - 1) onFinish?.(); }, [i, steps.length, onFinish]);
  const back = useCallback(() => { setDir(-1); setI(v => Math.max(0, v - 1)); }, []);

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
  const pos = rect ? placeTooltip(rect, vw, vh) : centerCard(vw, vh, isCover ? COVER_W : TIP_W);
  const StepIcon = step.icon || Sparkles;
  const pct = ((i + 1) / steps.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, fontFamily: C.FB }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,4,10,0.8)' }} />

      {rect && (
        <motion.div
          animate={{
            top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
            boxShadow: [`0 0 0 4px ${accent}45, 0 0 22px ${accent}45`, `0 0 0 4px ${accent}45, 0 0 32px ${accent}60`, `0 0 0 4px ${accent}45, 0 0 22px ${accent}45`],
          }}
          transition={{
            top: { type: 'spring', stiffness: 320, damping: 32 }, left: { type: 'spring', stiffness: 320, damping: 32 },
            width: { type: 'spring', stiffness: 320, damping: 32 }, height: { type: 'spring', stiffness: 320, damping: 32 },
            boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{ position: 'fixed', borderRadius: 12, border: `2px solid ${accent}`, pointerEvents: 'none' }}
        />
      )}

      {/* Plain anchor div owns the placement transform (translateX/Y(-100%) etc.) — the
          animated content below is a nested motion.div, since framer-motion writes its own
          `transform` for x/scale animation and would silently clobber a manual one here. */}
      <div style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px`, transform: pos.transform }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: C.s1, border: `1px solid ${C.b2}`, borderRadius: 16,
              padding: isCover ? '26px 26px 24px' : 18, boxShadow: '0 24px 70px rgba(0,0,0,0.65)',
            }}
          >
            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 2, background: C.b2, overflow: 'hidden', marginBottom: 14 }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ height: '100%', background: accent, borderRadius: 2 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: isCover ? 16 : 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                <StepIcon size={12} />{step.chapter}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: C.t3, fontFamily: C.FM }}>{i + 1} / {steps.length}</span>
                <button onClick={onSkip} aria-label="Skip tour" style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', padding: 2, display: 'flex' }}><X size={15} /></button>
              </div>
            </div>

            {isCover && (
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${accent}18`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <StepIcon size={21} color={accent} />
              </div>
            )}

            <div style={{ fontSize: isCover ? 19 : 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 7, letterSpacing: isCover ? '-.02em' : 0 }}>{step.title}</div>
            <div style={{ fontSize: isCover ? 13.5 : 12.5, color: C.t2, lineHeight: 1.65, marginBottom: step.badge ? 10 : (isCover ? 22 : 16) }}>{step.body}</div>
            {step.badge && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: C.violetDim, color: C.violetL, fontSize: 10.5, fontWeight: 600, marginBottom: isCover ? 22 : 16 }}>
                <Sparkles size={10} />{step.badge}
              </div>
            )}

            {isCover ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} onClick={next} style={{ ...btn(accent, { width: '100%', padding: '12px', fontSize: 13.5 }), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {step.ctaLabel || 'Next'}<ChevronRight size={14} />
                </motion.button>
                {i > 0 && <button onClick={back} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 11.5, cursor: 'pointer', fontFamily: C.FB, alignSelf: 'center' }}>Back</button>}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                {i > 0 && <button onClick={back} style={{ ...btnG({ fontSize: 12, padding: '7px 12px' }), display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={13} />Back</button>}
                <button onClick={next} style={{ ...btn(accent, { fontSize: 12, padding: '7px 14px' }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>{i === steps.length - 1 ? (step.ctaLabel || 'Finish') : 'Next'}<ChevronRight size={13} /></button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
