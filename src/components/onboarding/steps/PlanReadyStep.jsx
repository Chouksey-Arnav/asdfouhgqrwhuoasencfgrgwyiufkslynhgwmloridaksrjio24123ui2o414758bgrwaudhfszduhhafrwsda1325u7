import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon, ContinueButton, C } from '../primitives';
import { hue, display, body, meta, R, GLIDE, POP, lit } from '../design';
import { celebrateAchievement } from '../../../lib/celebrate';
import { play } from '../../../lib/sounds';

const BRAND = () => hue(['emerald', 'teal']);

export function PlanReadyStep({ onNext }) {
  const g = BRAND();
  useEffect(() => { play('achieve'); celebrateAchievement(); }, []);
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0, rotate: -14 }} animate={{ scale: 1, rotate: 0 }} transition={POP}
          style={{
            width: 84, height: 84, borderRadius: 24, marginBottom: 24,
            background: g.grad, color: g.onFill,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `${g.glow}, ${lit(0.24)}`,
          }}>
          <Icon name="flag-check" size={38} stroke={1.7} />
        </motion.div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ ...meta(10, { color: g.ink }), marginBottom: 12 }}>Plan generated</motion.span>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.2 }}
          style={display(27, { color: C.t1, margin: '0px 0px 12px' })}>
          Congratulations.<br />Your plan is ready.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={body(14, { maxWidth: 330, lineHeight: 1.55 })}>
          We've built a personalized path from everything you told us — your goals, your timeline, and where you're starting from.
        </motion.p>
      </div>
      <ContinueButton onClick={onNext} h={g}>See my plan</ContinueButton>
    </>
  );
}
