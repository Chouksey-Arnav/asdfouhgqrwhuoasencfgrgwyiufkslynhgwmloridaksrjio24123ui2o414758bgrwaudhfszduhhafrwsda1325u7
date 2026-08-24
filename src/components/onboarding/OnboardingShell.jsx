// ─────────────────────────────────────────────────────────────────────────────
// Chrome shared by every onboarding screen.
//
// Two modes off one measurement of the window:
//
//   Wide (≥ 1040px): two panes. The left is the story rail (scenes.jsx) — the
//     chapter, and the live chart of everything the student has told us so far.
//     The right holds the question at a comfortable reading width.
//   Narrow: one column, full-bleed, with the rail's information compressed into
//     the header strip (chapter mark, name, segmented progress, and the
//     recorded answers as chips).
//
// ── The color system, and why it lives here ─────────────────────────────────
// A chapter owns a HUE PAIR (see design.js). The shell resolves it once per
// render and publishes it to every primitive on the screen, so the ambient
// wash, the progress fill, the chapter mark, every selected answer, the focus
// ring and the Continue button are all the same two colors — and crossing into
// a new chapter visibly repaints the whole interface rather than swapping one
// badge. That is the "propelled" part: the flow doesn't just advance, it
// travels somewhere, and the screen says so.
//
// Progress is segmented by chapter rather than continuous, because five
// segments with names is something a student can count and a 6px bar creeping
// forward is not.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { C } from '../../lib/theme';
import { ChevronLeft, useViewport, setFlowHue } from './primitives';
import { chapterHue, hue, R, meta, numeral, pad2, GLIDE, GLIDE_FAST, SETTLE, EASE } from './design';
import { CHAPTERS, flowMeta } from './chapters';
import { StoryRail, ChapterMark, ChartStrip } from './scenes';

export default function OnboardingShell({ stepKey, steps = [], answers = {}, onBack, showBack = true, showProgress = true, footer, children }) {
  const { isWide, isMobile } = useViewport();
  const meta_ = flowMeta(steps, stepKey);
  const chapter = meta_.chapter;
  const g = chapter ? chapterHue(chapter.key) : hue(['blue', 'indigo']);
  // Published before the children render, so every primitive on this screen
  // picks up the chapter's colors without a prop being threaded to it.
  setFlowHue(g);
  // The rail needs a chapter to talk about, so intro/outro screens (splash,
  // welcome, generating) keep the single-column presentation.
  const showRail = isWide && showProgress && !!chapter;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg, display: 'flex', flexDirection: 'row',
      fontFamily: C.FB, overflow: 'clip', zIndex: 50,
    }}>
      {/* Ambient wash, in the chapter's own hues. Cross-fades on a chapter
          change, which is what makes the transition read as travel. */}
      <AnimatePresence>
        <motion.div key={chapter?.key || 'none'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{ position: 'absolute', inset: 0, background: g.wash, pointerEvents: 'none' }} />
      </AnimatePresence>

      {showRail && (
        <div style={{
          position: 'relative', zIndex: 1, flex: '0 0 40%', maxWidth: 520, minWidth: 380,
          borderRight: `1px solid ${C.b1}`, background: C.surf2,
        }}>
          <StoryRail
            chapter={chapter}
            chapters={CHAPTERS}
            chapterIndex={meta_.chapterIndex}
            stepKey={stepKey}
            questionsLeft={meta_.questionsLeft}
            isQuestion={meta_.isQuestion}
            answers={answers}
          />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {(showBack || showProgress) && (
          <div style={{
            position: 'relative', zIndex: 2, padding: isMobile ? '14px 18px 8px' : '20px 28px 10px',
            maxWidth: showRail ? 720 : 640, margin: '0 auto', width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showBack ? (
                <motion.button whileTap={{ scale: 0.92 }} whileHover={{ x: -1 }} onClick={onBack} aria-label="Back"
                  style={{
                    background: C.surf, border: `1px solid ${C.b1}`, borderRadius: R.sm,
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, padding: 0, color: C.t2,
                  }}>
                  <ChevronLeft size={18} />
                </motion.button>
              ) : <div style={{ width: showProgress ? 36 : 0, flexShrink: 0 }} />}

              {showProgress && (
                <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
                  {(chapter ? meta_.segments : [{ key: 'all', fill: 0 }]).map(seg => {
                    const sg = chapterHue(seg.key);
                    return (
                      <div key={seg.key} style={{ flex: 1, height: 6, borderRadius: 4, background: C.s3, overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${Math.round(seg.fill * 100)}%` }}
                          transition={SETTLE}
                          style={{
                            height: '100%', borderRadius: 4, background: sg.bar,
                            boxShadow: seg.fill > 0 ? `0 0 8px ${sg.edge}` : 'none',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* The counter, as an instrument readout rather than a sentence. */}
              {showProgress && chapter && meta_.isQuestion && (
                <span style={{ ...numeral(11, { color: C.t3 }), flexShrink: 0, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
                  {pad2(meta_.questionNumber)}<span style={{ color: C.t4 }}>/{pad2(meta_.questionTotal)}</span>
                </span>
              )}
            </div>

            {/* The literal answer to "when is this going to end", plus — on a
                phone, where there is no rail — proof that the answers are being
                kept. */}
            {showProgress && chapter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingLeft: showBack ? 48 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!showRail && <ChapterMark mark={chapter.mark} chapterKey={chapter.key} size={28} pulse={false} />}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 8px' }}>
                    {!showRail && !isMobile && (
                      <span style={meta(9.5, { color: g.ink })}>Chapter {pad2(meta_.chapterIndex + 1)}</span>
                    )}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap' }}>{chapter.label}</span>
                  </div>
                  <motion.span key={meta_.encouragement} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={GLIDE_FAST}
                    style={{
                      fontSize: 11.5, fontWeight: 700, color: g.ink, background: g.soft,
                      border: `1px solid ${g.edgeSoft}`, padding: '4px 8px', borderRadius: R.pill,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                    {meta_.encouragement}
                  </motion.span>
                </div>
                {!showRail && <ChartStrip answers={answers} chapterKey={chapter.key} />}
              </div>
            )}
          </div>
        )}

        {/* A short fade at the top of the scroll area. Without it a row that
            happens to be mid-scroll is sliced off square against the header,
            which is the single most common way a nicely-built screen still
            manages to look unfinished. */}
        {showProgress && (
          <div aria-hidden="true" style={{
            position: 'relative', zIndex: 3, height: 14, marginBottom: -14, flexShrink: 0,
            background: `linear-gradient(to bottom, ${C.bg}, transparent)`, pointerEvents: 'none',
          }} />
        )}

        <div style={{
          position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          // Question screens keep a comfortable reading measure; the intro and
          // generation screens lay themselves out and are given the room to do
          // it, since those are the two moments the app is selling itself.
          maxWidth: showRail ? 720 : chapter ? 640 : 1120, margin: '0 auto', width: '100%',
          padding: isMobile ? '10px 18px 0' : '16px 28px 0', boxSizing: 'border-box',
        }}>
          <AnimatePresence mode="wait">
            <motion.div key={stepKey}
              initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.32, ease: EASE }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {footer && (
          <div style={{ position: 'relative', zIndex: 2, padding: '8px 24px 28px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
