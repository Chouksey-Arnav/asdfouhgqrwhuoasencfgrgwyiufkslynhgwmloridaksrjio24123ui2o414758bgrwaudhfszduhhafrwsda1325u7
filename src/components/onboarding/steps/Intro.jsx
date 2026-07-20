import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { C, glass } from '../../../lib/theme';
import { ContinueButton } from '../primitives';

export function SplashStep({ onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 1150); return () => clearTimeout(t); }, [onNext]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        style={{ width: 76, height: 76, borderRadius: 22, overflow: 'hidden', boxShadow: '0 0 50px rgba(45,127,255,0.30),0 0 90px rgba(45,127,255,0.12)' }}>
        <img src="/icon.svg" width={76} height={76} alt="" style={{ display: 'block' }} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <GraduationCap size={22} color={C.blueL} />
        <span style={{ fontSize: 22, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em' }}>MedSchoolPrep</span>
      </motion.div>
    </div>
  );
}

export function WelcomeStep({ account, onNext }) {
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.85, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          style={{ width: 68, height: 68, borderRadius: 18, overflow: 'hidden', margin: '0 0 26px', boxShadow: '0 0 40px rgba(45,127,255,0.25)' }}>
          <img src="/icon.svg" width={68} height={68} alt="" style={{ display: 'block' }} />
        </motion.div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: C.t1, margin: '0 0 12px', letterSpacing: '-.03em', fontFamily: C.FD, lineHeight: 1.2 }}>
          Your path into medicine,<br />made clear.
        </h1>
        <p style={{ fontSize: 14.5, color: C.t2, lineHeight: 1.7, margin: '0 0 26px', maxWidth: 360 }}>
          SAT/ACT prep, a personalized health-career pathway, and an application portfolio — built around your goals, in one place.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Pathway Diagnostic', 'SAT/ACT Prep', 'AI Coach', 'Application Portfolio'].map(f => (
            <span key={f} style={{ ...glass({ padding: '6px 12px' }), fontSize: 11.5, fontWeight: 600, color: C.t2, backdropFilter: 'none' }}>{f}</span>
          ))}
        </div>
      </div>
      <div>
        <ContinueButton onClick={onNext}>Get Started</ContinueButton>
        {account?.email && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 14 }}>Signed in as {account.email}</p>
        )}
      </div>
    </>
  );
}
