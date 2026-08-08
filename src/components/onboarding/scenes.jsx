// ─────────────────────────────────────────────────────────────────────────────
// The story rail — the left half of the onboarding screen on a desktop-sized
// window, and the compact banner above the question on a phone.
//
// Two problems this solves at once:
//
//  1. On a laptop the flow was a 460px column floating in a sea of gray. All
//     that space was doing nothing, which is exactly what makes an app feel
//     unfinished. The rail gives the empty half a job: it says which chapter
//     you're in, what it's for, and how far along you are.
//  2. The questions were plain text. The target user is fifteen. Every chapter
//     now arrives with an animated scene — a glowing orb, orbiting topic chips,
//     a heartbeat trace — so the screen has something alive on it.
//
// Everything is drawn inline (SVG + emoji + framer-motion). Nothing here loads
// a GIF or an image: the app is an offline-capable PWA and a funnel that
// depends on a CDN is a funnel that breaks on school wifi. Emoji render from
// the system font, so they cost nothing and land as color instantly.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { C, tint } from '../../lib/theme';
import { EKGLine } from './brand';

// Per-step chips. They orbit the scene and name what the chapter is actually
// about, so the rail says something specific rather than decorating.
const STEP_CHIPS = {
  why: ['❤️ Your reason', '🔭 Ten years out', '🤔 How sure'],
  identity: ['✨ Who you’re becoming'],
  startingPoint: ['🎓 Your grade', '📊 Your score', '🎂 Your birthday'],
  academics: ['📚 Your GPA', '🧪 Your sciences'],
  experience: ['🏥 Volunteering', '👩‍⚕️ Shadowing', '🫀 CPR'],
  expInsight: ['📈 How you compare'],
  rhythm: ['🗓️ Your week', '🧰 Your tools'],
  showcase: ['🧭 Everything, one place'],
  target: ['🎯 Your target', '⏳ Your test date'],
  realistic: ['🧮 The honest math'],
  speed: ['⚡ Minutes a day'],
  paceForecast: ['🛣️ The road ahead'],
  challenges: ['🧱 What’s in the way', '🏆 What you want'],
  obstacleEmpathy: ['🫂 We heard you'],
  potential: ['🥼 The white coat'],
  prefs: ['⚙️ How your plan behaves'],
  commitment: ['🤝 Your promise'],
  saveProgress: ['💾 Saved to your account'],
};

export const chipsFor = (stepKey) => STEP_CHIPS[stepKey] || [];

/**
 * The animated centerpiece. `size` drives everything so the same component can
 * be a 240px hero in the rail or a 56px badge in a mobile header.
 */
export function ChapterOrb({ emoji, accent, size = 220, pulse = true }) {
  const ring = (i) => ({
    position: 'absolute',
    inset: -size * (0.06 + i * 0.09),
    borderRadius: '50%',
    border: `1px ${i ? 'dashed' : 'solid'} ${tint(accent, 0.28 - i * 0.08)}`,
    pointerEvents: 'none',
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {pulse && [0, 1].map(i => (
        <motion.span key={`p${i}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.96, 1.28] }}
          transition={{ duration: 3.2, delay: i * 1.6, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${tint(accent, 0.55)}`, pointerEvents: 'none' }}
        />
      ))}
      {[0, 1].map(i => (
        <motion.span key={`r${i}`}
          animate={{ rotate: i % 2 ? -360 : 360 }}
          transition={{ duration: 26 + i * 12, repeat: Infinity, ease: 'linear' }}
          style={ring(i)}
        />
      ))}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: `radial-gradient(circle at 32% 28%, ${tint(accent, 0.30)}, ${tint(accent, 0.06)} 62%, transparent 78%)`,
          border: `1px solid ${tint(accent, 0.22)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 24px 70px ${tint(accent, 0.20)}`,
        }}>
        <motion.span
          key={emoji}
          initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          style={{ fontSize: size * 0.36, lineHeight: 1, filter: `drop-shadow(0 6px 18px ${tint(accent, 0.5)})` }}>
          {emoji}
        </motion.span>
      </motion.div>
    </div>
  );
}

/** The chapter checklist down the rail — five rows, ticked as they're cleared. */
function ChapterList({ chapters, activeIndex, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 320 }}>
      {chapters.map((ch, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 10, background: active ? tint(accent, 0.10) : 'transparent' }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 800, fontFamily: C.FM,
              background: done ? tint(C[ch.accent] || accent, 0.9) : active ? accent : 'transparent',
              border: done || active ? 'none' : `1px solid ${C.b2}`,
              color: done || active ? C.onAccent : C.t4,
            }}>{done ? '✓' : i + 1}</span>
            <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.t1 : done ? C.t2 : C.t4 }}>{ch.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The full rail. Rendered only when there's room for it (see OnboardingShell) —
 * on a phone the same information is carried by the compact header instead.
 */
export function StoryRail({ chapter, chapters, chapterIndex, stepKey, questionsLeft, isQuestion }) {
  const accent = C[chapter?.accent] || C.blue;
  const chips = chipsFor(stepKey);
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 26, padding: '40px 44px', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 55% at 50% 28%, ${tint(accent, 0.13)}, transparent 70%)`, pointerEvents: 'none' }} />

      <motion.div key={`orb-${chapter?.key}`} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        style={{ position: 'relative' }}>
        <ChapterOrb emoji={chapter?.emoji || '🩺'} accent={accent} size={200} />
      </motion.div>

      <motion.div key={`copy-${stepKey}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', maxWidth: 340, position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
          Chapter {chapterIndex + 1} of {chapters.length}
        </div>
        <h2 style={{ fontSize: 25, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: '0 0 10px', lineHeight: 1.2 }}>
          {chapter?.rail}
        </h2>
        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.65, margin: 0 }}>{chapter?.line}</p>
      </motion.div>

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 340, position: 'relative' }}>
          {chips.map((c, i) => (
            <motion.span key={c} initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.09, type: 'spring', stiffness: 300, damping: 22 }}
              style={{
                fontSize: 11.5, fontWeight: 600, color: C.t2, padding: '6px 11px', borderRadius: 20,
                background: C.surf, border: `1px solid ${C.b1}`, whiteSpace: 'nowrap',
              }}>{c}</motion.span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', opacity: 0.9 }}>
        <EKGLine width={220} height={34} color={accent} />
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <ChapterList chapters={chapters} activeIndex={chapterIndex} accent={accent} />
      </div>

      <motion.div key={`left-${questionsLeft}-${isQuestion}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'relative', fontSize: 12, color: C.t3, fontWeight: 600 }}>
        {isQuestion
          ? (questionsLeft === 0 ? 'Last question in the whole flow' : `${questionsLeft} question${questionsLeft === 1 ? '' : 's'} left after this one`)
          : 'Take a breath — nothing to answer here'}
      </motion.div>
    </div>
  );
}
