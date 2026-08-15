import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '../../../lib/theme';
import { ContinueButton, Icon, useViewport, flowHue } from '../primitives';
import { hue, R, meta, display, body, numeral, GLIDE, POP, step, lit, panel } from '../design';
import { LogoMark, EKGLine } from '../brand';

// The intro screens have no chapter, so they get the brand's own hue pair
// rather than inheriting whatever the last screen was tinted with.
const BRAND = () => hue(['blue', 'violet']);

// Cinematic open: pulse-ringed crest, wordmark, then the EKG heartbeat drawing
// across underneath — the flow's medical signature, established on second one.
export function SplashStep({ onNext }) {
  const g = BRAND();
  useEffect(() => { const t = setTimeout(onNext, 2350); return () => clearTimeout(t); }, [onNext]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <motion.div initial={{ scale: 0.6, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={POP}>
        <LogoMark size={92} pulse />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.45 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
        <span style={display(26, { color: C.t1 })}>MedSchoolPrep</span>
        <span style={meta(11, { color: C.t3 })}>Your path into medicine</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ width: 240 }}>
        <EKGLine width={230} height={44} delay={1} color={g.base} />
      </motion.div>
    </div>
  );
}

// The four pillars, as the flow's own marks rather than borrowed ones — so the
// first screen of the app already speaks the icon language every question will.
const FEATURES = [
  { icon: 'stethoscope', label: 'Pathway Diagnostic', hues: ['teal', 'emerald'] },
  { icon: 'brain', label: 'AI Coach', hues: ['violet', 'indigo'] },
  { icon: 'clipboard-plus', label: 'Application Portfolio', hues: ['rose', 'pink'] },
  { icon: 'trend-up', label: 'Built-in Test Prep', hues: ['sky', 'cyan'] },
];

// What the flow promises, in three lines. Shown next to the pitch on a wide
// screen so the first real screen of the app is a hero rather than a paragraph
// stranded in the middle of an empty desktop window.
const PROMISES = [
  { icon: 'hourglass', hues: ['amber', 'orange'], title: 'About three minutes', desc: 'Ten questions, grouped into five short chapters. We tell you how many are left the whole way.' },
  { icon: 'target', hues: ['violet', 'indigo'], title: 'Built around your answers', desc: 'Your year, your coursework, your time, your reasons — the plan is generated from what you tell us, not a template.' },
  { icon: 'shield-check', hues: ['emerald', 'teal'], title: 'Honest, not flattering', desc: "If what you want doesn't fit the time you have, we'll say so and show you what does." },
];

export function WelcomeStep({ account, onNext }) {
  const { isWide } = useViewport();
  const g = BRAND();
  return (
    <>
      <div style={{
        flex: 1, display: 'grid', alignItems: 'center', gap: isWide ? 56 : 0,
        gridTemplateColumns: isWide ? 'minmax(0, 1fr) minmax(0, 0.9fr)' : '1fr',
        paddingTop: isWide ? 0 : 8,
      }}>
        <div>
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...POP, delay: 0.1 }}
            style={{ margin: '0 0 26px' }}>
            <LogoMark size={isWide ? 84 : 70} float />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.2 }}
            style={display(isWide ? 46 : 31, { color: C.t1, margin: '0 0 14px', lineHeight: 1.08 })}>
            Your path into medicine,<br />
            <span style={{ background: C.auroraGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>made clear.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.32 }}
            style={body(isWide ? 15.5 : 14.5, { margin: '0 0 24px', maxWidth: 470, lineHeight: 1.7 })}>
            The next few minutes are about you — where you are, where you're headed, and what's in the way. Then we'll build your personalized plan into medicine.
          </motion.p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FEATURES.map((f, i) => {
              const fg = hue(f.hues);
              return (
                <motion.span key={f.label} initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...POP, delay: 0.45 + i * 0.08 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px 7px 8px',
                    borderRadius: R.pill, background: C.surf, border: `1px solid ${C.b1}`,
                    fontSize: 11.5, fontWeight: 600, color: C.t2,
                  }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: fg.soft, color: fg.ink, border: `1px solid ${fg.edgeSoft}`,
                  }}><Icon name={f.icon} size={13} stroke={1.8} /></span>
                  {f.label}
                </motion.span>
              );
            })}
          </div>

          {isWide && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.75 }} style={{ maxWidth: 420, marginTop: 30 }}>
              <ContinueButton onClick={onNext} h={g}>Start my journey</ContinueButton>
              {account?.email && (
                <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 12 }}>Signed in as {account.email}</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Setting expectations up front is the cheapest anti-drop-off measure
            there is: "when does this end" is much easier to sit with when the
            answer was given before the first question. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: isWide ? 0 : 26 }}>
          {PROMISES.map((p, i) => {
            const pg = hue(p.hues);
            return (
              <motion.div key={p.title} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                transition={{ ...GLIDE, delay: 0.5 + i * 0.12 }}
                style={{ ...panel({ padding: '15px 17px' }), display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{
                  width: 36, height: 36, borderRadius: R.sm, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: pg.soft, border: `1px solid ${pg.edgeSoft}`, color: pg.ink,
                }}><Icon name={p.icon} size={18} /></span>
                <span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, marginTop: 3 }}>{p.desc}</div>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {!isWide && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.75 }}>
          <ContinueButton onClick={onNext} h={g}>Start my journey</ContinueButton>
          {account?.email && (
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, marginTop: 12, marginBottom: 8 }}>Signed in as {account.email}</p>
          )}
        </motion.div>
      )}
    </>
  );
}
