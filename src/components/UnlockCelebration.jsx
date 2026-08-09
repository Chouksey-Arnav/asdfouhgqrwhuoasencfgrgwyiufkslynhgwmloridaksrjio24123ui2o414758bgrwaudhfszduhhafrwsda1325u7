import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, Check } from 'lucide-react';
import { C, glass, btn, tint, accentFill } from '../lib/theme';
import { play } from '../lib/sounds';
import { celebrateAchievement } from '../lib/celebrate';

// "I did this, and this is what I earned."
//
// Progressive unlocking (src/lib/featureUnlock.js) already announces an opened
// area with a toast, which is the right weight for Flashcards or the Review Log
// — you glance at it and carry on. It is the wrong weight for the one gate the
// ladder actually builds toward. Plans is the app's most expensive feature: it
// reads the whole student and writes back a day-by-day schedule, and it was
// arriving as a fifth line of grey text in the corner of the screen, three
// seconds long, easy to miss entirely.
//
// A reward loop needs a moment. This is the moment: the work that earned it
// stated back ("You finished onboarding and your first lesson"), what was
// earned stated plainly, and one button that goes there — because an unlock
// nobody walks through is the same as no unlock.
//
// Deliberately modal and deliberately rare. MARQUEE_IDS is one id. If a second
// feature ever gets this treatment, that is a product decision made in the
// ladder, not something that happens by accident here.
export default function UnlockCelebration({
  open,
  label,                       // 'Plans'
  earned = null,               // the work that opened it
  reward = null,               // what it does, in one sentence
  cta = 'Open it',
  accent = C.gold,
  reducedMotion = false,
  onGo,
  onClose,
}) {
  // Confetti + chime fire once, on the transition into open — not on every
  // re-render of a modal that is already up.
  useEffect(() => {
    if (!open) return;
    if (!reducedMotion) celebrateAchievement();
    play('achieve');
  }, [open, reducedMotion]);

  if (!open) return null;

  const motionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: { scale: .88, opacity: 0, y: 22 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: .9, opacity: 0 },
      transition: { type: 'spring', stiffness: 220, damping: 21 },
    };

  return (
    <AnimatePresence>
      <motion.div
        key="unlock-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog" aria-modal="true" aria-label={`${label} unlocked`}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000, padding: 16,
          background: 'rgba(4,6,11,0.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          {...motionProps}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...glass({ padding: 28 }), width: 380, maxWidth: '100%', position: 'relative', textAlign: 'center',
            border: `1px solid ${tint(accent, 0.45)}`,
            background: `linear-gradient(165deg,${tint(accent, 0.13)},${C.s0})`,
          }}
        >
          <button onClick={onClose} aria-label="Close"
            style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>

          <div style={{ fontSize: 9.5, fontWeight: 800, color: accent, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 16 }}>
            Milestone unlocked
          </div>

          <motion.div
            initial={reducedMotion ? false : { scale: .5, rotate: -12 }}
            animate={reducedMotion ? false : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: .08 }}
            style={{
              width: 62, height: 62, borderRadius: 18, margin: '0 auto 16px',
              display: 'grid', placeItems: 'center',
              background: tint(accent, 0.18), border: `1px solid ${tint(accent, 0.42)}`,
              boxShadow: `0 10px 30px ${tint(accent, 0.28)}`,
            }}
          >
            <Sparkles size={27} color={accent} />
          </motion.div>

          <div style={{ fontSize: 21, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>{label}</div>

          {reward && (
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginBottom: 14 }}>{reward}</div>
          )}

          {/* The half students actually respond to: not "here's a feature", but
              "here is the specific thing you did that produced it". */}
          {earned && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
              padding: '9px 11px', borderRadius: 10, marginBottom: 18,
              background: C.s2, border: `1px solid ${C.b1}`,
            }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: tint(C.green, 0.18), display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Check size={11} color={C.greenL} />
              </span>
              <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>{earned}</span>
            </div>
          )}

          <button onClick={onGo} style={btn(accentFill(accent), { width: '100%', justifyContent: 'center', fontSize: 13.5, padding: '11px 16px' })}>
            {cta}<ArrowRight size={15} />
          </button>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: C.t4, fontSize: 11.5, cursor: 'pointer', marginTop: 10, font: 'inherit', fontFamily: C.FB }}>
            Later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
