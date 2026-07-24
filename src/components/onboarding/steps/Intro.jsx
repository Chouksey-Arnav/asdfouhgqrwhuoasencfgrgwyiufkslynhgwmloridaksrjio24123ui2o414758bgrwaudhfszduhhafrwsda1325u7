import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, LineChart, BrainCircuit, FolderHeart } from 'lucide-react';
import { C, glass } from '../../../lib/theme';
import { ContinueButton } from '../primitives';
import { LogoMark, EKGLine } from '../brand';

// Cinematic open: pulse-ringed crest, wordmark, then the EKG heartbeat drawing
// across underneath — the flow's medical signature, established on second one.
export function SplashStep({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 2350); return () => clearTimeout(t); }, [onNext]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <motion.div initial={{ scale: 0.5, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
        <LogoMark size={92} pulse />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 25, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em' }}>MedSchoolPrep</span>
        <span style={{ fontSize: 12.5, color: C.t3, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>Your path into medicine</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <EKGLine width={230} height={44} delay={1} />
      </motion.div>
    </div>
  );
}

const FEATURES = [
  { icon: Stethoscope, label: 'Pathway Diagnostic', color: C.tealL },
  { icon: LineChart, label: 'SAT/ACT Prep', color: C.blueL },
  { icon: BrainCircuit, label: 'AI Coach', color: C.violetL },
  { icon: FolderHeart, label: 'Application Portfolio', color: C.roseL },
];

export function WelcomeStep({ account, onNext }) {
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.85, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          style={{ margin: '0 0 26px' }}>
          <LogoMark size={70} float />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontSize: 31, fontWeight: 800, color: C.t1, margin: '0 0 12px', letterSpacing: '-.03em', fontFamily: C.FD, lineHeight: 1.18 }}>
          Your path into medicine,<br />
          <span style={{ background: C.auroraGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>made clear.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.5 }}
          style={{ fontSize: 14.5, color: C.t2, lineHeight: 1.7, margin: '0 0 26px', maxWidth: 360 }}>
          The next few minutes are about you — where you are, where you're headed, and what's in the way. Then we'll build your personalized plan into medicine.
        </motion.p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FEATURES.map((f, i) => (
            <motion.span key={f.label} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              style={{ ...glass({ padding: '7px 12px' }), fontSize: 11.5, fontWeight: 600, color: C.t2, backdropFilter: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <f.icon size={13} color={f.color} />{f.label}
            </motion.span>
          ))}
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <ContinueButton onClick={onNext}>Start My Journey</ContinueButton>
        {account?.email && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 14 }}>Signed in as {account.email}</p>
        )}
      </motion.div>
    </>
  );
}
