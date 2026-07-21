import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../../lib/theme';
import { ChevronLeft } from './primitives';

// Chrome shared by every onboarding screen: ambient background, back chevron +
// thin progress bar up top, cross-fading content area, sticky CTA footer.
export default function OnboardingShell({ stepKey, progress, onBack, showBack = true, showProgress = true, footer, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: C.FB, overflow: 'clip', zIndex: 50 }}>
      <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '55vw', height: '55vw', maxWidth: 500, maxHeight: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,127,255,0.10),transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '45vw', height: '45vw', maxWidth: 420, maxHeight: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.07),transparent 65%)', pointerEvents: 'none' }} />

      {(showBack || showProgress) && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px 8px', maxWidth: 460, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {showBack ? (
            <button onClick={onBack} aria-label="Back" style={{ background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
              <ChevronLeft size={18} color={C.t2} />
            </button>
          ) : <div style={{ width: 34, flexShrink: 0 }} />}
          {showProgress ? (
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.s2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} style={{ height: '100%', borderRadius: 3, background: C.blueGrad, boxShadow: `0 0 10px ${C.blue}70` }} />
            </div>
          ) : <div style={{ flex: 1 }} />}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', width: '100%', padding: '10px 24px 12px', boxSizing: 'border-box' }}>
        <AnimatePresence mode="wait">
          <motion.div key={stepKey} initial={{ opacity: 0, x: 22, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -22, scale: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 28, opacity: { duration: 0.2 } }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {footer && (
        <div style={{ position: 'relative', zIndex: 2, padding: '10px 24px 28px', maxWidth: 460, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
