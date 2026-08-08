// ─────────────────────────────────────────────────────────────────────────────
// Chrome shared by every onboarding screen.
//
// This used to be a 460px column pinned to the middle of the viewport with a
// hairline progress bar on top — which on a laptop meant roughly a quarter of
// the screen in use and three quarters of empty gray, and on any screen meant a
// progress signal you could not read a number off. Both were in the reviewer's
// notes, and both are the same underlying problem: the flow never told the
// student where they were.
//
// The layout now has two modes off one measurement of the window:
//
//   Wide (≥ 1040px): two panes. The left is the story rail (scenes.jsx) — the
//     chapter, its scene, its chips, the chapter checklist. The right holds the
//     question at a comfortable reading width. Together they fill the screen.
//   Narrow: one column, full-bleed, with the rail's information compressed into
//     the header strip (chapter badge, name, "3 more to go").
//
// Progress is segmented by chapter rather than continuous, because five
// segments with names is something a student can count and a 6px bar creeping
// forward is not.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C, tint } from '../../lib/theme';
import { ChevronLeft, useViewport, setFlowAccent } from './primitives';
import { CHAPTERS, flowMeta } from './chapters';
import { StoryRail, ChapterOrb } from './scenes';

export default function OnboardingShell({ stepKey, steps = [], onBack, showBack = true, showProgress = true, footer, children }) {
  const { isWide, isMobile } = useViewport();
  const meta = flowMeta(steps, stepKey);
  const chapter = meta.chapter;
  const accent = C[chapter?.accent] || C.blue;
  // Published before the children render, so every primitive on this screen
  // picks up the chapter's color without a prop being threaded to it.
  setFlowAccent(accent);
  // The rail needs a chapter to talk about, so intro/outro screens (splash,
  // welcome, generating) keep the old single-column presentation.
  const showRail = isWide && showProgress && !!chapter;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, display: 'flex', flexDirection: 'row',
      fontFamily: C.FB, overflow: 'clip', zIndex: 50,
    }}>
      {/* Ambient wash. Anchored to the viewport, so it scales with the window
          rather than sitting in the corners of a 460px column. */}
      <div style={{ position: 'absolute', top: '-18%', right: '-8%', width: '52vw', height: '52vw', maxWidth: 720, maxHeight: 720, borderRadius: '50%', background: `radial-gradient(circle,${tint(accent, 0.12)},transparent 65%)`, pointerEvents: 'none', transition: 'background .6s' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-8%', width: '46vw', height: '46vw', maxWidth: 620, maxHeight: 620, borderRadius: '50%', background: `radial-gradient(circle,${tint(C.cyan, 0.07)},transparent 65%)`, pointerEvents: 'none' }} />

      {showRail && (
        <div style={{
          position: 'relative', zIndex: 1, flex: '0 0 42%', maxWidth: 560, minWidth: 380,
          borderRight: `1px solid ${C.b1}`, background: C.surf2,
        }}>
          <StoryRail
            chapter={chapter}
            chapters={CHAPTERS}
            chapterIndex={meta.chapterIndex}
            stepKey={stepKey}
            questionsLeft={meta.questionsLeft}
            isQuestion={meta.isQuestion}
          />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {(showBack || showProgress) && (
          <div style={{
            position: 'relative', zIndex: 2, padding: isMobile ? '14px 18px 6px' : '20px 28px 8px',
            maxWidth: showRail ? 720 : 640, margin: '0 auto', width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showBack ? (
                <motion.button whileTap={{ scale: 0.92 }} onClick={onBack} aria-label="Back"
                  style={{ background: C.surf, border: `1px solid ${C.b1}`, borderRadius: 11, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                  <ChevronLeft size={18} color={C.t2} />
                </motion.button>
              ) : <div style={{ width: showProgress ? 36 : 0, flexShrink: 0 }} />}

              {showProgress && (
                <div style={{ flex: 1, display: 'flex', gap: 5, alignItems: 'center' }}>
                  {(chapter ? meta.segments : [{ key: 'all', fill: 0 }]).map(seg => (
                    <div key={seg.key} style={{ flex: 1, height: 7, borderRadius: 4, background: C.s3, overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${Math.round(seg.fill * 100)}%` }}
                        transition={{ type: 'spring', stiffness: 240, damping: 30 }}
                        style={{ height: '100%', borderRadius: 4, background: accent, boxShadow: seg.fill > 0 ? `0 0 10px ${tint(accent, 0.6)}` : 'none' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* The literal answer to "when is this going to end". */}
            {showProgress && chapter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, paddingLeft: showBack ? 48 : 0 }}>
                {!showRail && (
                  <ChapterOrb emoji={chapter.emoji} accent={accent} size={30} pulse={false} />
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 8px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.t2, whiteSpace: 'nowrap' }}>
                    {showRail || isMobile ? '' : `Chapter ${meta.chapterIndex + 1} of ${meta.chapterCount} · `}{chapter.label}
                  </span>
                  {meta.isQuestion && (
                    <span style={{ fontSize: 11.5, color: C.t4, fontFamily: C.FM }}>
                      Q{meta.questionNumber}/{meta.questionTotal}
                    </span>
                  )}
                </div>
                <motion.span key={meta.encouragement} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontSize: 11.5, fontWeight: 700, color: accent, background: tint(accent, 0.12),
                    border: `1px solid ${tint(accent, 0.22)}`, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                  {meta.encouragement}
                </motion.span>
              </div>
            )}
          </div>
        )}

        <div style={{
          position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          // Question screens keep a comfortable reading measure; the intro and
          // generation screens lay themselves out and are given the room to do
          // it, since those are the two moments the app is selling itself.
          maxWidth: showRail ? 720 : chapter ? 640 : 1120, margin: '0 auto', width: '100%',
          padding: isMobile ? '12px 18px 0' : '18px 28px 0', boxSizing: 'border-box',
        }}>
          <AnimatePresence mode="wait">
            <motion.div key={stepKey}
              initial={{ opacity: 0, x: 22, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -22, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, opacity: { duration: 0.2 } }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {footer && (
          <div style={{ position: 'relative', zIndex: 2, padding: '10px 24px 28px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
