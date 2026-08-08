import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, LineChart, BrainCircuit, FolderHeart } from 'lucide-react';
import { C, glass } from '../../../lib/theme';
import { ContinueButton, useViewport } from '../primitives';
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
  { icon: BrainCircuit, label: 'AI Coach', color: C.violetL },
  { icon: FolderHeart, label: 'Application Portfolio', color: C.roseL },
  { icon: LineChart, label: 'Test Prep, Built In', color: C.blueL },
];

// What the flow promises, in three lines. Shown next to the pitch on a wide
// screen so the first real screen of the app is a hero rather than a paragraph
// stranded in the middle of an empty desktop window.
const PROMISES = [
  { emoji: '⏱️', title: 'About three minutes', desc: 'Ten questions, grouped into five short chapters. We tell you how many are left the whole way.' },
  { emoji: '🎯', title: 'Built around your answers', desc: "Your grade, your score, your time, your reasons — the plan is generated from what you tell us, not a template." },
  { emoji: '🫱', title: 'Honest, not flattering', desc: "If your target doesn't fit your timeline, we'll say so and show you the number that does." },
];

export function WelcomeStep({ account, onNext }) {
  const { isWide } = useViewport();
  return (
    <>
      <div style={{
        flex: 1, display: 'grid', alignItems: 'center', gap: isWide ? 56 : 0,
        gridTemplateColumns: isWide ? 'minmax(0, 1fr) minmax(0, 0.9fr)' : '1fr',
        paddingTop: isWide ? 0 : 8,
      }}>
        <div>
          <motion.div initial={{ scale: 0.85, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            style={{ margin: '0 0 26px' }}>
            <LogoMark size={isWide ? 84 : 70} float />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: isWide ? 46 : 31, fontWeight: 800, color: C.t1, margin: '0 0 14px', letterSpacing: '-.035em', fontFamily: C.FD, lineHeight: 1.1 }}>
            Your path into medicine,<br />
            <span style={{ background: C.auroraGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>made clear.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.5 }}
            style={{ fontSize: isWide ? 16 : 14.5, color: C.t2, lineHeight: 1.7, margin: '0 0 24px', maxWidth: 480 }}>
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

          {isWide && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} style={{ maxWidth: 420, marginTop: 30 }}>
              <ContinueButton onClick={onNext}>Start My Journey</ContinueButton>
              {account?.email && (
                <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 12 }}>Signed in as {account.email}</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Setting expectations up front is the cheapest anti-drop-off measure
            there is: "when does this end" is much easier to sit with when the
            answer was given before the first question. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: isWide ? 0 : 26 }}>
          {PROMISES.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.14, type: 'spring', stiffness: 240, damping: 24 }}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 16, background: C.surf, border: `1px solid ${C.b1}`, boxShadow: C.shadowSm }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
              <span>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{p.title}</div>
                <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, marginTop: 3 }}>{p.desc}</div>
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {!isWide && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <ContinueButton onClick={onNext}>Start My Journey</ContinueButton>
          {account?.email && (
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 12, marginBottom: 8 }}>Signed in as {account.email}</p>
          )}
        </motion.div>
      )}
    </>
  );
}
