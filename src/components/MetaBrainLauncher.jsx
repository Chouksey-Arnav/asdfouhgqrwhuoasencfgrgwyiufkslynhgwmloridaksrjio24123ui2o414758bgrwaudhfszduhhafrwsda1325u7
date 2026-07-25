import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { C, tint } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// The "Ask Meta Brain" launcher — the always-visible pull-tab (desktop) / FAB
// (mobile) that opens PortfolioMetaBrain.jsx or PrepMetaBrain.jsx. Both used to
// carry their own copy of this markup; pulled into one shared component so the
// premium treatment (ambient breathing glow + a hover light-sweep, via the
// .mb-launcher/.msp-pulse-glow classes in index.css) stays identical everywhere
// Meta Brain is summoned from, instead of drifting between Prep and Portfolio.
// The breathing glow is deliberate, not decorative: it's the visual cue that
// Meta Brain is a standing presence reading live context, not a static menu
// item — same intent as the shimmer, which only plays on hover so it reads as
// an invitation to click rather than a constant distraction.
export default function MetaBrainLauncher({ onClick, accent = C.violet, accent2 = null, isMobile, label = 'Ask Meta Brain' }) {
  const a2 = accent2 || accent;

  if (isMobile) {
    return (
      <motion.button
        onClick={onClick} aria-label={label}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="mb-launcher msp-pulse-glow"
        style={{
          position: 'fixed', right: 16, bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)', zIndex: 320,
          width: 54, height: 54, borderRadius: '50%', border: `1.5px solid ${tint('#ffffff', 0.28)}`,
          background: `linear-gradient(135deg,${accent},${a2})`,
          boxShadow: `0 10px 30px ${tint(accent, 0.5)}, 0 0 0 1px ${tint(accent, 0.15)} inset`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
        <Brain size={23} color="#fff" strokeWidth={2.1} />
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick} aria-label={label}
      whileHover={{ x: -4 }} whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="mb-launcher msp-pulse-glow"
      style={{
        position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        padding: '16px 9px', borderRadius: '14px 0 0 14px',
        border: `1.5px solid ${tint('#ffffff', 0.22)}`, borderRight: 'none',
        background: `linear-gradient(160deg,${accent},${a2})`,
        boxShadow: `-6px 6px 28px ${tint(accent, 0.4)}, 0 0 0 1px ${tint(accent, 0.12)} inset`,
        cursor: 'pointer',
      }}>
      <Sparkles size={13} color="rgba(255,255,255,0.85)" />
      <Brain size={17} color="#fff" strokeWidth={2.1} />
      <span style={{ writingMode: 'vertical-rl', fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '.08em', fontFamily: C.FB, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>{label}</span>
    </motion.button>
  );
}
