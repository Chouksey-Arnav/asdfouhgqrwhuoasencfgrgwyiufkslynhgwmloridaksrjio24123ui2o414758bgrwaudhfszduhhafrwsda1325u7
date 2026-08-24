// ─────────────────────────────────────────────────────────────────────────────
// RewardChest — the "unwrap" moment. Anticipation + reveal is its own
// dopamine trigger, separate from the reward itself, so the underlying XP/
// cosmetic amount stays deterministic (decided by the caller before this
// mounts) while the *opening* interaction is what creates the delay/payoff.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, X } from 'lucide-react';
import { C, glass, btn, pill } from '../lib/theme';
import { play } from '../lib/sounds';
import { celebrateChestOpen } from '../lib/celebrate';

export default function RewardChest({
  open,
  title = 'Reward Chest',
  eyebrow = 'You earned a reward',
  xp = 0,
  cosmetic = null,     // { name, Icon, color }
  dismissible = true,
  onOpen,               // fires once, at the moment of reveal — apply state here
  onClose,               // fires when the modal is dismissed
}) {
  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);

  if (!open) return null;

  function handleOpen() {
    if (revealed) return;
    setShaking(true);
    play('chest');
    setTimeout(() => {
      setShaking(false);
      setRevealed(true);
      celebrateChestOpen();
      play('achieve');
      onOpen?.();
    }, 420);
  }

  function handleClose() {
    setRevealed(false);
    setShaking(false);
    onClose?.();
  }

  return (
    <AnimatePresence>
      <motion.div
        key="chest-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,11,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
        onClick={() => { if (dismissible && revealed) handleClose(); }}
      >
        <motion.div
          initial={{ scale: .85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: .85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{ ...glass({ padding: 32 }), width: 320, maxWidth: '100%', textAlign: 'center', position: 'relative', border: `1px solid ${C.amber}35`, background: `linear-gradient(160deg, ${C.s1}, ${C.s0})` }}
        >
          {dismissible && (
            <button onClick={handleClose} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', padding: 4, display: 'flex' }} aria-label="Close">
              <X size={16}/>
            </button>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.amberL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 12 }}>{eyebrow}</div>

          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div key="closed" exit={{ opacity: 0, scale: .9 }}>
                <motion.div
                  animate={shaking ? { rotate: [0, -8, 8, -6, 6, -3, 3, 0], x: [0, -3, 3, -2, 2, 0] } : {}}
                  transition={{ duration: .42 }}
                  style={{ width: 88, height: 88, margin: '0 auto 20px', borderRadius: 16, background: `${C.amber}18`, border: `1.5px solid ${C.amber}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${C.amber}25` }}
                >
                  <Package size={40} color={C.amberL}/>
                </motion.div>
                <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 20 }}>Tap to open</div>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: .95 }}
                  onClick={handleOpen}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 24px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${C.amber},${C.orange})`, color: '#1a1206', fontWeight: 700, fontSize: 13, fontFamily: C.FB, cursor: 'pointer', boxShadow: `0 4px 16px ${C.amber}40` }}
                >
                  <Sparkles size={14}/> Open Chest
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                <div style={{ width: 88, height: 88, margin: '0 auto 18px', borderRadius: 16, background: `${C.green}18`, border: `1.5px solid ${C.green}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 50px ${C.green}30` }}>
                  {cosmetic?.Icon ? <cosmetic.Icon size={40} color={cosmetic.color || C.greenL}/> : <Sparkles size={40} color={C.greenL}/>}
                </div>
                {xp > 0 && <div style={{ fontSize: 28, letterSpacing: 'calc(-0.6px + var(--msp-letter-spacing))', lineHeight: 'calc(1.25 * var(--msp-line-scale))', fontWeight: 800, fontFamily: C.FM, color: C.amberL, marginBottom: 4 }}>+{xp} XP</div>}
                {cosmetic && <div style={{ ...pill(C.violetDim, C.violetL, { fontSize: 11 }), marginBottom: 4 }}>New: {cosmetic.name}</div>}
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 20 }}>{cosmetic ? 'Added to your profile' : 'Added to your total'}</div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .95 }} onClick={handleClose} style={btn(C.blueGrad, { fontSize: 13, padding: '8px 20px' })}>Nice!</motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
