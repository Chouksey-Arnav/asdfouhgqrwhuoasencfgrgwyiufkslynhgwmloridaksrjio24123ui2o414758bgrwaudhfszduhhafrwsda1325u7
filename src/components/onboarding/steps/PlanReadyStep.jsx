import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { C, ContinueButton } from '../primitives';
import { celebrateAchievement } from '../../../lib/celebrate';
import { play } from '../../../lib/sounds';

export function PlanReadyStep({ onNext }) {
  useEffect(() => { play('achieve'); celebrateAchievement(); }, []);
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          style={{ width: 88, height: 88, borderRadius: '50%', background: C.blueGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, boxShadow: '0 12px 40px rgba(45,127,255,0.4)' }}>
          <PartyPopper size={40} color="#fff" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ fontSize: 27, fontWeight: 800, color: C.t1, margin: '0 0 12px', fontFamily: C.FD, letterSpacing: '-.03em' }}>
          Congratulations!<br />Your plan is ready.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ fontSize: 14, color: C.t2, lineHeight: 1.7, maxWidth: 300 }}>
          We've built a personalized path based on everything you told us — your goals, your timeline, and where you're starting from.
        </motion.p>
      </div>
      <ContinueButton onClick={onNext}>See My Plan</ContinueButton>
    </>
  );
}
