// ─────────────────────────────────────────────────────────────────────────────
// The only celebration on the student dashboard.
//
// 200ms, scale and fade, once, at a real milestone. No confetti.
//
// ── Why this is deliberately this small ─────────────────────────────────────
// Confetti on every save is the single clearest "this product thinks you are a
// child" signal a teenager can be shown, and it is the point at which a
// seventeen-year-old decides the app is not for them. The cost is asymmetric:
// a restrained animation is invisible to the student who does not care about
// animation, while an over-the-top one actively drives away the student who
// does not want to be condescended to.
//
// It is also gated on WHAT is being celebrated, not on how often something
// happened. Firing on every lesson save teaches the animation means nothing;
// firing when a student finishes a pathway track or logs their first shadowing
// hours means the flash carries information. So this component is mounted by
// the substance milestones and by nothing else.
//
// Honors `prefers-reduced-motion` (and the app's own reducedMotion setting) by
// rendering the end state immediately — the milestone still lands, it just does
// not move.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/** The one duration, stated once. Changing it changes every celebration in the app. */
export const FLASH_MS = 200;

/**
 * Wraps a child and plays one scale-and-fade when `trigger` changes to a new
 * truthy value.
 *
 * `trigger` should be the milestone's own identity (an achievement key, a
 * pathway id) rather than a boolean, so two milestones earned in the same
 * session each get their own flash instead of the second one being swallowed.
 */
export default function MilestoneFlash({ trigger = null, reducedMotion = false, children, style = {} }) {
  const [playing, setPlaying] = useState(false);
  const lastTrigger = useRef(null);

  useEffect(() => {
    if (!trigger || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    if (reducedMotion) return;
    setPlaying(true);
    const t = setTimeout(() => setPlaying(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [trigger, reducedMotion]);

  if (reducedMotion) return <div style={style}>{children}</div>;

  return (
    <motion.div
      style={style}
      animate={playing ? { scale: [1, 1.04, 1], opacity: [1, 0.85, 1] } : { scale: 1, opacity: 1 }}
      transition={{ duration: FLASH_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
