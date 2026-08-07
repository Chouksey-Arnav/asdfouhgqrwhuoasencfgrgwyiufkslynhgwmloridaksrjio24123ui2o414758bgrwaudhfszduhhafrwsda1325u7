import React, { useId } from 'react';
import { motion } from 'framer-motion';

// The single source of truth for the MedSchoolPrep mark — the violet-to-cyan "M"
// whose two wings frame a figure climbing a lit stairway — matching
// public/icon.svg pixel-for-pixel. Every place the logo appears (sidebar, auth
// screens, landing page, loading screen, onboarding) renders through this
// component so the mark and its motion stay identical everywhere instead of
// drifting across copy-pasted SVGs.
//
// Three variants, picked per context:
//   'pop'     — one-shot spring pop-in, then settles into the idle pulse. First-impression
//               moments: the loading screen, the auth brand panel, the landing-page hero.
//   'breathe' — the idle pulse on its own. Places the logo sits on screen for a long
//               time (the sidebar) — alive, but not distracting.
//   'hover'   — the idle pulse at reduced amplitude, plus a spring pop on hover/tap.
//               Interactive contexts (nav bar, footer) where big motion would be noise.
//
// Every variant pulses: a slow breath on the mark itself, a glow that swells with it,
// and — unless `rings` is turned off — halo rings expanding out of the tile. The
// brand's whole idea is a steady climb, so the logo is never completely still.

const VIOLET = '168,85,247';
const CYAN = '34,211,238';

function Crest({ idPrefix, animate = true }) {
  const p = idPrefix;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`${p}tile`} cx="50" cy="54" r="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#141d45" /><stop offset="0.52" stopColor="#0a0e24" /><stop offset="1" stopColor="#03050d" />
        </radialGradient>
        <linearGradient id={`${p}sweep`} x1="10" y1="92" x2="90" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A855F7" /><stop offset="0.2" stopColor="#8B5CF6" /><stop offset="0.42" stopColor="#6366F1" />
          <stop offset="0.62" stopColor="#3B82F6" /><stop offset="0.82" stopColor="#22D3EE" /><stop offset="1" stopColor="#67E8F9" />
        </linearGradient>
        <linearGradient id={`${p}rim`} x1="50" y1="18" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#BEEBFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8FD7FF" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`${p}column`} x1="50" y1="26" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EAF9FF" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#7FB6FF" stopOpacity="0.09" />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={`${p}head`} cx="46.5" cy="13.5" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="0.35" stopColor="#C4E9FF" /><stop offset="1" stopColor="#5B8DF9" />
        </radialGradient>
        <radialGradient id={`${p}bloom`} cx="50" cy="48" r="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4C6BFF" stopOpacity="0.36" />
          <stop offset="0.62" stopColor="#3B82F6" stopOpacity="0.1" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <filter id={`${p}glow`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`${p}soft`} x="-60%" y="-40%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <clipPath id={`${p}clip`}><rect width="100" height="100" rx="22" /></clipPath>
      </defs>

      <rect width="100" height="100" rx="22" fill={`url(#${p}tile)`} />
      <g clipPath={`url(#${p}clip)`}>
        {/* Bloom behind the mark, breathing with the pulse */}
        <motion.circle
          cx="50" cy="48" r="48" fill={`url(#${p}bloom)`}
          animate={animate ? { opacity: [0.75, 1, 0.75] } : undefined}
          transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />

        {/* Light column rising through the gap between the wings */}
        <motion.path
          d="M50 26 L53.6 90 H46.4 Z" fill={`url(#${p}column)`} filter={`url(#${p}soft)`}
          animate={animate ? { opacity: [0.7, 1, 0.7] } : undefined}
          transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />

        {/* The M: two mirrored wings, each a solid blade carrying a leaf-shaped
            counter. One path per wing with evenodd, so the counter is a true
            hole and the tile reads through it. */}
        <g filter={`url(#${p}glow)`}>
          <g fill={`url(#${p}sweep)`} fillRule="evenodd">
            <path d="M12.5 88 C9.5 60 12 29 24.5 16.5 C30 11 37 12.5 40.5 19 C46 28 48.5 55 47.2 88 Z M30.5 27.5 C38 36.5 42.5 60 35 84 C25.5 76.5 21.5 48 30.5 27.5 Z" />
            <path d="M87.5 88 C90.5 60 88 29 75.5 16.5 C70 11 63 12.5 59.5 19 C54 28 51.5 55 52.8 88 Z M69.5 27.5 C62 36.5 57.5 60 65 84 C74.5 76.5 78.5 48 69.5 27.5 Z" />
          </g>
          {/* The brightest line in the mark: the two inner edges falling to centre */}
          <g fill="none" stroke={`url(#${p}rim)`} strokeWidth="1.3" strokeLinecap="round">
            <path d="M42.6 23 C46.6 30 48.6 56 47.2 88" />
            <path d="M57.4 23 C53.4 30 51.4 56 52.8 88" />
          </g>
        </g>

        {/* Stair-steps at the base of the column. They light in sequence from the
            bottom up, so the mark always reads as a climb in progress. */}
        <g fill="#E4F6FF" filter={`url(#${p}glow)`}>
          {[
            { x: 46.6, y: 74.4, w: 6.8, h: 1.7, o: 0.95 },
            { x: 45.4, y: 78.2, w: 9.2, h: 1.8, o: 0.8 },
            { x: 44.0, y: 82.2, w: 12.0, h: 1.9, o: 0.62 },
            { x: 42.5, y: 86.4, w: 15.0, h: 2.0, o: 0.44 },
            { x: 40.9, y: 90.8, w: 18.2, h: 2.1, o: 0.26 },
          ].map((s, i, all) => (
            <motion.rect
              key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.h / 2}
              animate={animate ? { opacity: [s.o, Math.min(1, s.o + 0.35), s.o] } : undefined}
              transition={animate ? {
                duration: 2.4, repeat: Infinity, ease: 'easeInOut',
                // Bottom step first, so the highlight travels upward.
                delay: (all.length - 1 - i) * 0.16,
              } : undefined}
              opacity={s.o}
            />
          ))}
        </g>

        {/* The figure rising between the wings */}
        <motion.circle
          cx="50" cy="17" r="8.4" fill={`url(#${p}head)`} filter={`url(#${p}glow)`}
          style={{ originX: '50px', originY: '17px' }}
          animate={animate ? { scale: [1, 1.07, 1], opacity: [0.92, 1, 0.92] } : undefined}
          transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      </g>
    </svg>
  );
}

const POP_TRANSITION = { type: 'spring', stiffness: 340, damping: 14, mass: 0.7 };

// Halo rings expanding out of the tile — the outermost layer of the pulse.
function PulseRings({ radius, count = 2, duration = 2.8 }) {
  return Array.from({ length: count }, (_, i) => (
    <motion.span
      key={i}
      aria-hidden
      style={{
        position: 'absolute', inset: 0, borderRadius: radius,
        border: `1.5px solid rgba(${i % 2 ? CYAN : VIOLET},0.55)`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: [0, 0.5, 0], scale: [1, 1.45] }}
      transition={{ duration, delay: (i * duration) / count, repeat: Infinity, ease: 'easeOut' }}
    />
  ));
}

export default function AnimatedLogo({ size = 34, variant = 'pop', glow = true, rings = true, style }) {
  const idPrefix = `msplogo${useId().replace(/[:«»]/g, '')}`;
  const radius = size * 0.22;

  const glowEl = glow && (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute', inset: '-30%', borderRadius: '50%', zIndex: -1,
        background: `radial-gradient(circle, rgba(${CYAN},0.45) 0%, rgba(${VIOLET},0.3) 45%, transparent 72%)`,
        filter: 'blur(10px)',
      }}
      initial={variant === 'pop' ? { opacity: 0, scale: 0.3 } : { opacity: 0.35, scale: 1 }}
      animate={
        variant === 'pop'
          ? { opacity: [0, 0.85, 0.35, 0.55, 0.35], scale: [0.3, 1.35, 1, 1.12, 1] }
          : variant === 'breathe'
          ? { opacity: [0.28, 0.58, 0.28], scale: [1, 1.14, 1] }
          : { opacity: [0.26, 0.44, 0.26], scale: [1, 1.08, 1] }
      }
      transition={
        variant === 'pop'
          ? { duration: 3.2, repeat: Infinity, repeatDelay: 0, ease: 'easeInOut', times: [0, 0.14, 0.35, 0.68, 1] }
          : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
      }
    />
  );

  // Amplitude of the idle breath, per variant. 'hover' stays quietest because it
  // lives in nav bars and footers next to text.
  const breath =
    variant === 'breathe' ? [1, 1.05, 1] : variant === 'hover' ? [1, 1.025, 1] : [1, 1.035, 1];

  const inner = (
    <motion.div
      style={{ width: size, height: size, borderRadius: radius }}
      animate={{ scale: breath }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: variant === 'hover' ? 1.14 : 1.12, rotate: variant === 'hover' ? -4 : 3, transition: POP_TRANSITION }}
      whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
    >
      <Crest idPrefix={idPrefix} />
    </motion.div>
  );

  const shell = { position: 'relative', width: size, height: size, flexShrink: 0, ...style };

  // 'pop' — one-shot entrance (overshoot scale + a little rotational wobble, glow
  // bursting behind it) that hands off to the same idle pulse everything else runs.
  if (variant === 'pop') {
    return (
      <div style={shell}>
        {glowEl}
        {rings && <PulseRings radius={radius} />}
        <motion.div
          style={{ width: size, height: size, borderRadius: radius }}
          initial={{ scale: 0, rotate: -18, opacity: 0 }}
          animate={{ scale: [0, 1.18, 0.94, 1], rotate: [-18, 6, -2, 0], opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], times: [0, 0.55, 0.8, 1] }}
        >
          {inner}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={shell}>
      {glowEl}
      {rings && variant === 'breathe' && <PulseRings radius={radius} />}
      {inner}
    </div>
  );
}
