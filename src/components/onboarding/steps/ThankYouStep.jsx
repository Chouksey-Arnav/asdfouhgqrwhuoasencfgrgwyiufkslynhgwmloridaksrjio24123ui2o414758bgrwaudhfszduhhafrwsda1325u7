import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import { C } from '../primitives';
import { ContinueButton } from '../primitives';

export function ThankYouStep({ onNext }) {
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          style={{ width: 84, height: 84, borderRadius: '50%', background: C.roseDim, border: `1px solid rgba(244,63,94,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <HeartHandshake size={38} color={C.roseL} />
        </motion.div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.t1, margin: '0 0 12px', fontFamily: C.FD, letterSpacing: '-.03em' }}>Thank you for trusting us</h1>
        <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.7, maxWidth: 320 }}>
          We know getting into medicine can feel overwhelming. We built MedSchoolPrep to make your path clear, structured, and honestly achievable — one step at a time.
        </p>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
