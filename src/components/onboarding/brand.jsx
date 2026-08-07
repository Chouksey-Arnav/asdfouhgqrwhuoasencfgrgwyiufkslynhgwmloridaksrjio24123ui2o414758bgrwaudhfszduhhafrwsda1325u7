// Brand marks + MedSchoolPrep logo animations used across the onboarding flow.
//
// The "Where did you hear about us?" step previously used generic lucide icons
// (a magnifying glass for the App Store, a camera for Instagram…) which read as
// placeholders. These are hand-drawn simplified SVG marks of each brand so the
// list is instantly recognizable, kept inline so the flow stays fully offline.
import React from 'react';
import { motion } from 'framer-motion';
import { C } from '../../lib/theme';
import AnimatedLogo from '../AnimatedLogo';

// ── Recognizable source/brand marks ──────────────────────────────────────────

export function AppStoreMark({ size = 18 }) {
  // White App Store glyph: the "A" built from rounded strokes inside a circle.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.4" stroke="#fff" strokeWidth="1.7" />
      <path d="M9.1 16.6 8 18.4M13.3 9.2 8.9 16.4M10.7 6.7l.8-1.3M11.5 8.9l4.5 7.5M16.9 18.4l-.9-1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.2 14.9h7.2M14.9 14.9h2.9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TikTokMark({ size = 18 }) {
  // The TikTok note with its signature cyan/red chromatic offset.
  const note = 'M14.5 4.5c.3 1.9 1.5 3.3 3.4 3.6v2.6c-1.3 0-2.5-.4-3.4-1.1v5.1c0 2.6-2.1 4.6-4.7 4.6a4.65 4.65 0 0 1-1.6-9v2.8a2 2 0 1 0 2.6 1.9V4.5h3.7Z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d={note} fill="#25f4ee" transform="translate(-0.8,0.5)" />
      <path d={note} fill="#fe2c55" transform="translate(0.8,-0.5)" />
      <path d={note} fill="#fff" />
    </svg>
  );
}

export function YouTubeMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="1.5" y="5" width="21" height="14" rx="4.4" fill="#fff" />
      <path d="M10.2 9.2v5.6l5-2.8-5-2.8Z" fill="#e11d2e" />
    </svg>
  );
}

export function TVMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.6" y="6" width="18.8" height="12.4" rx="2.6" stroke="#fff" strokeWidth="1.7" />
      <path d="m8.5 2.8 3.5 3 3.5-3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21.4h8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function XMark({ size = 18 }) {
  // The X (Twitter) logo glyph.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M17.9 3h3.1l-6.8 7.8L22.2 21h-6.3l-4.9-6.4L5.4 21H2.3l7.3-8.3L1.9 3h6.4l4.4 5.9L17.9 3Zm-1.1 16.1h1.7L7.4 4.7H5.6l11.2 14.4Z" fill="#fff" />
    </svg>
  );
}

export function InstagramMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.4" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.3" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.35" fill="#fff" />
    </svg>
  );
}

export function GoogleMark({ size = 18 }) {
  // The four-color Google "G".
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" fill="#4285F4" />
      <path d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23Z" fill="#34A853" />
      <path d="M5.6 13.7a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" fill="#FBBC05" />
      <path d="M12 5.6c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.3l3.8 3c.9-2.7 3.4-4.7 6.4-4.7Z" fill="#EA4335" />
    </svg>
  );
}

export function FriendsMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.4" stroke="#fff" strokeWidth="1.7" />
      <path d="M2.8 20c.5-3.3 3-5.4 6.2-5.4s5.7 2.1 6.2 5.4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.5 4.9a3.4 3.4 0 0 1 0 6.3M18 14.9c1.8.8 3 2.4 3.3 4.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// ── MedSchoolPrep logo, animated ─────────────────────────────────────────────

// The MedSchoolPrep mark with soft expanding pulse rings — the recurring brand
// moment of the flow (splash, identity, commitment, generating). `pulse` turns
// the rings on; `float` adds a slow drifting hover. The mark itself comes from
// AnimatedLogo so the onboarding flow shows exactly the logo (and the same idle
// pulse) as the rest of the app.
export function LogoMark({ size = 76, radius = size * 0.29, pulse = false, float = false, glow = true }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {pulse && [0, 1].map(i => (
        <motion.span key={i}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.45, 0], scale: [1, 1.75] }}
          transition={{ duration: 2.6, delay: i * 1.3, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: radius * 1.35, border: `1.5px solid ${i % 2 ? 'rgba(34,211,238,0.6)' : 'rgba(168,85,247,0.6)'}`, pointerEvents: 'none' }}
        />
      ))}
      <motion.div
        animate={float ? { y: [0, -5, 0] } : undefined}
        transition={float ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{
          width: size, height: size, borderRadius: radius, overflow: 'hidden',
          boxShadow: glow ? '0 0 44px rgba(59,130,246,0.32), 0 0 90px rgba(168,85,247,0.2)' : 'none',
        }}>
        <AnimatedLogo size={size} variant="breathe" glow={false} rings={false} />
      </motion.div>
    </div>
  );
}

// Animated EKG heartbeat line — the flow's signature medical flourish. Draws
// itself once (or loops), with a glowing tracer dot riding the beat.
export function EKGLine({ width = 220, height = 40, color = C.blueL, loop = true, delay = 0.4 }) {
  const d = `M0 ${height / 2} H${width * 0.24} l${width * 0.035} -8 l${width * 0.045} 16 l${width * 0.03} -8 H${width * 0.46} l${width * 0.025} 4 l${width * 0.035} -${height * 0.72} l${width * 0.045} ${height * 0.95} l${width * 0.03} -${height * 0.35} l${width * 0.02} ${height * 0.12} H${width * 0.78} l${width * 0.03} -7 l${width * 0.04} 14 l${width * 0.03} -7 H${width}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <filter id="msp-ekg-glow" x="-40%" y="-120%" width="180%" height="340%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={d} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth="2" />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter="url(#msp-ekg-glow)"
        initial={{ pathLength: 0, pathOffset: 0 }}
        animate={loop ? { pathLength: [0, 0.28, 0.28, 0], pathOffset: [0, 0, 0.72, 1] } : { pathLength: 1 }}
        transition={loop ? { duration: 2.4, delay, repeat: Infinity, ease: 'linear', times: [0, 0.3, 0.85, 1] } : { duration: 1.4, delay, ease: 'easeInOut' }}
      />
    </svg>
  );
}
