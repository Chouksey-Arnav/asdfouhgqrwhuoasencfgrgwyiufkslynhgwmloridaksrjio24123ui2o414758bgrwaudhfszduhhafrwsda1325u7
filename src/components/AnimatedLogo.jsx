import React, { useId } from 'react';
import { motion } from 'framer-motion';

// The single source of truth for the MedSchoolPrep crest (shield + open book + cross),
// matching public/icon.svg pixel-for-pixel. Every place the logo appears — sidebar, auth
// screens, landing page, loading screen — should render through this component so the mark
// (and its motion) stays identical everywhere instead of drifting across copy-pasted SVGs.
//
// Three variants, picked per context:
//   'pop'     — one-shot spring pop-in with a glow burst behind it. First-impression moments:
//               the loading screen, the auth brand panel, the landing-page hero.
//   'breathe' — a slow, subtle idle scale+glow loop. Places the logo sits on screen for a long
//               time (the sidebar) — alive, but not distracting.
//   'hover'   — static at rest, snaps into a small spring pop on hover/tap. Interactive contexts
//               (nav bar, footer) where constant motion would be noise.
function Crest({ idPrefix }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${idPrefix}bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#274873" /><stop offset="1" stopColor="#13233b" />
        </linearGradient>
        <linearGradient id={`${idPrefix}gold`} x1="50" y1="18" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e3c47c" /><stop offset="1" stopColor="#b3894a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill={`url(#${idPrefix}bg)`} />
      <path d="M50 21 L75 30.5 V54 C75 71 64.5 82 50 87 C35.5 82 25 71 25 54 V30.5 Z" fill="#ffffff" fillOpacity="0.06" stroke={`url(#${idPrefix}gold)`} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M50 47 V71 C46 67.5 41 65.5 34.5 65.5 V44 C41 44 46 45.5 50 47 Z" fill="#f4ecd8" fillOpacity="0.92" />
      <path d="M50 47 V71 C54 67.5 59 65.5 65.5 65.5 V44 C59 44 54 45.5 50 47 Z" fill="#f4ecd8" fillOpacity="0.75" />
      <path d="M50 47 V71" stroke="#13233b" strokeWidth="1.1" />
      <rect x="46.6" y="27" width="6.8" height="17" rx="1.2" fill={`url(#${idPrefix}gold)`} />
      <rect x="41.5" y="32.1" width="17" height="6.8" rx="1.2" fill={`url(#${idPrefix}gold)`} />
    </svg>
  );
}

const POP_TRANSITION = { type: 'spring', stiffness: 340, damping: 14, mass: 0.7 };

export default function AnimatedLogo({ size = 34, variant = 'pop', glow = true, style }) {
  const idPrefix = `msplogo${useId().replace(/[:«»]/g, '')}`;

  const glowEl = glow && (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute', inset: '-30%', borderRadius: '50%', zIndex: -1,
        background: 'radial-gradient(circle, rgba(227,196,124,0.5) 0%, rgba(45,127,255,0.28) 45%, transparent 72%)',
        filter: 'blur(10px)',
      }}
      initial={variant === 'pop' ? { opacity: 0, scale: 0.3 } : { opacity: 0.35, scale: 1 }}
      animate={
        variant === 'pop'
          ? { opacity: [0, 0.85, 0.35], scale: [0.3, 1.35, 1] }
          : variant === 'breathe'
          ? { opacity: [0.28, 0.55, 0.28], scale: [1, 1.12, 1] }
          : { opacity: 0.35, scale: 1 }
      }
      transition={
        variant === 'pop'
          ? { duration: 0.9, ease: 'easeOut', times: [0, 0.4, 1] }
          : variant === 'breathe'
          ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3 }
      }
    />
  );

  if (variant === 'breathe') {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
        {glowEl}
        <motion.div
          style={{ width: size, height: size, borderRadius: size * 0.26 }}
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.12, rotate: 3, transition: POP_TRANSITION }}
        >
          <Crest idPrefix={idPrefix} />
        </motion.div>
      </div>
    );
  }

  if (variant === 'hover') {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
        {glowEl}
        <motion.div
          style={{ width: size, height: size, borderRadius: size * 0.26 }}
          whileHover={{ scale: 1.14, rotate: -4, transition: POP_TRANSITION }}
          whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
        >
          <Crest idPrefix={idPrefix} />
        </motion.div>
      </div>
    );
  }

  // 'pop' — one-shot entrance: overshoot scale + a little rotational wobble, glow bursts and
  // settles behind it. Runs once on mount (whatever screen it's on just appeared).
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      {glowEl}
      <motion.div
        style={{ width: size, height: size, borderRadius: size * 0.26 }}
        initial={{ scale: 0, rotate: -18, opacity: 0 }}
        animate={{ scale: [0, 1.18, 0.94, 1], rotate: [-18, 6, -2, 0], opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], times: [0, 0.55, 0.8, 1] }}
        whileHover={{ scale: 1.1, transition: POP_TRANSITION }}
      >
        <Crest idPrefix={idPrefix} />
      </motion.div>
    </div>
  );
}
