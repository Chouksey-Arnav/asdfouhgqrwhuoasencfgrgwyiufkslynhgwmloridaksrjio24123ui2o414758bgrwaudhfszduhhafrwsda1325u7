import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { C, tint } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// The "Ask Meta Brain" launcher — the always-visible pull-tab (desktop) / FAB
// (mobile) that opens PortfolioMetaBrain.jsx or PrepMetaBrain.jsx.
//
// Design intent: a dark glass tab with a living gradient edge, instead of a
// flat colour slab. Three layers of motion, each tied to user intent:
//   1. Ambient — a slow breathing aura (msp-pulse-glow) signals Meta Brain is a
//      standing presence reading live context, not a static menu item.
//   2. Hover — a soft accent spotlight physically follows the cursor across the
//      button (CSS vars --mb-x/--mb-y set from onMouseMove), the tab eases out
//      from the edge, and the sparkle/brain icons wake up. Motion follows the
//      pointer so the button feels like it's responding to *you*.
//   3. Press — a ripple bursts from the exact click point, so the tap reads as
//      cause-and-effect rather than a generic state swap.
// All decorative layers are CSS-driven and disabled under reduced motion.
// ─────────────────────────────────────────────────────────────────────────────

// Shared cursor-tracking + click-ripple wiring for both form factors.
function useLauncherFX() {
  const ref = useRef(null);
  const [ripples, setRipples] = useState([]);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mb-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--mb-y', `${e.clientY - r.top}px`);
  }, []);

  const spawnRipple = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((rs) => [...rs.slice(-3), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((rs) => rs.filter((rp) => rp.id !== id)), 650);
  }, []);

  return { ref, ripples, onMouseMove, spawnRipple };
}

const Ripples = ({ ripples, accent }) => ripples.map((r) => (
  <span key={r.id} className="mb-ripple" style={{
    left: r.x, top: r.y,
    background: `radial-gradient(circle, rgba(255,255,255,0.55) 0%, ${tint(accent, 0.35)} 45%, transparent 70%)`,
  }} />
));

export default function MetaBrainLauncher({ onClick, accent = C.violet, accent2 = null, isMobile, label = 'Ask Meta Brain' }) {
  const a2 = accent2 || accent;
  const { ref, ripples, onMouseMove, spawnRipple } = useLauncherFX();
  const handleClick = useCallback((e) => { spawnRipple(e); onClick?.(e); }, [spawnRipple, onClick]);

  // Cursor-following spotlight layer — reads the --mb-x/--mb-y vars set above.
  const spotlight = (
    <span aria-hidden className="mb-spot" style={{
      background: `radial-gradient(140px circle at var(--mb-x, 50%) var(--mb-y, 50%), ${tint(accent, 0.55)} 0%, ${tint(a2, 0.25)} 40%, transparent 70%)`,
    }} />
  );

  if (isMobile) {
    return (
      <motion.button
        ref={ref} onClick={handleClick} onMouseMove={onMouseMove} aria-label={label}
        whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        className="mb-launcher msp-pulse-glow"
        style={{
          position: 'fixed', right: 16, bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)', zIndex: 320,
          width: 56, height: 56, borderRadius: '50%', border: `1px solid ${tint('#ffffff', 0.3)}`,
          background: `linear-gradient(135deg, ${tint(accent, 0.92)}, ${tint(a2, 0.92)}), ${C.s1}`,
          boxShadow: `0 12px 34px ${tint(accent, 0.45)}, 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px ${tint(accent, 0.2)} inset, 0 1px 0 ${tint('#ffffff', 0.25)} inset`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
        {spotlight}
        <Ripples ripples={ripples} accent={accent} />
        <Brain size={24} color="#fff" strokeWidth={2.1} className="mb-brain" style={{ position: 'relative', zIndex: 2, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.35))' }} />
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={ref} onClick={handleClick} onMouseMove={onMouseMove} aria-label={label}
      initial={false}
      whileHover={{ x: -7, transition: { type: 'spring', stiffness: 320, damping: 24 } }}
      whileTap={{ scale: 0.965, x: -5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="mb-launcher msp-pulse-glow"
      style={{
        position: 'fixed', right: 0, top: '50%', translateY: '-50%', zIndex: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
        padding: '18px 10px', borderRadius: '16px 0 0 16px',
        border: `1px solid ${tint('#ffffff', 0.16)}`, borderRight: 'none',
        // Dark glass body with the accent living in the edge + aura, not a flat fill —
        // reads quieter at rest, so the hover/press states have somewhere to go.
        background: `linear-gradient(165deg, ${tint(accent, 0.32)} 0%, rgba(10,16,32,0.85) 45%, ${tint(a2, 0.3)} 100%), ${C.s1}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        boxShadow: `-8px 8px 32px ${tint(accent, 0.35)}, -2px 2px 10px rgba(0,0,0,0.45), 0 0 0 1px ${tint(accent, 0.25)} inset, 0 1px 0 ${tint('#ffffff', 0.18)} inset`,
        cursor: 'pointer',
      }}>
      {spotlight}
      <Ripples ripples={ripples} accent={accent} />
      {/* Accent seam along the outer edge — the "pull here" affordance. */}
      <span aria-hidden className="mb-seam" style={{ background: `linear-gradient(180deg, transparent, ${accent}, ${a2}, transparent)` }} />
      <Sparkles size={13} className="mb-sparkle" color="rgba(255,255,255,0.9)" style={{ position: 'relative', zIndex: 2 }} />
      <Brain size={18} className="mb-brain" color="#fff" strokeWidth={2.1} style={{ position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 6px ${tint(accent, 0.8)})` }} />
      <span style={{
        position: 'relative', zIndex: 2, writingMode: 'vertical-rl',
        fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '.14em',
        textTransform: 'uppercase', fontFamily: C.FB, textShadow: '0 1px 3px rgba(0,0,0,0.35)',
      }}>{label}</span>
    </motion.button>
  );
}
