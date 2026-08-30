// ─────────────────────────────────────────────────────────────────────────────
// The screen a student gets when a verification quiz doesn't clear the bar.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
// What used to happen: a four-second toast ("not quite — try again"), and the
// student was dropped back on the lesson screen with the same button they'd
// just pressed. No route forward, and a lesson left sitting unverified in a
// list of verified ones.
//
// To a fourteen-year-old that unverified row is not a neutral data point. It is
// a small failure, on display, every time they open the app. A few of those in
// a row is one of the most common reasons a teenager quietly stops opening a
// study app — not with a complaint, just by not coming back.
//
// So this screen does four things, in this order, and the order is the design:
//
//   1. NAMES THE FRAME.  "Not yet." Never "failed", never a big red percentage.
//      The score is available but it is not the headline, because a number
//      invites comparison against a bar and the bar is not what they should be
//      looking at right now.
//   2. NAMES THE CONCEPTS.  Two or three specific ideas, grouped so that two
//      misses on one idea read as one thing to go relearn. "Here is exactly
//      what to go back to" is the difference between a setback and a task.
//   3. OFFERS THE RE-EXPLANATION.  One button into Medabrain, pre-loaded with
//      those specific concepts and instructed to explain them DIFFERENTLY —
//      restating the lesson they just didn't learn from is not a strategy.
//   4. OFFERS A DIFFERENT QUIZ.  Explicitly labeled as different, because the
//      old behavior (same questions again) taught students that retries were
//      a memory test and worth gaming.
//
// Nothing on this screen is reported to a parent. See quizRecovery.parentSafe.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowRight, BookOpen, X, Compass } from 'lucide-react';
import { C, glass, glass2, btn, btnG, lbl, pill, R, CC, accentGrad } from '../../lib/theme';
import { notYetCopy } from '../../lib/quizRecovery';

export default function NotYetPanel({
  lesson,
  analysis,          // from quizRecovery.analyzeAttempt
  pct,
  threshold,
  onReexplain,       // (concepts) => void — opens Medabrain with the built prompt
  onRetry,           // () => void — opens a DIFFERENT draw
  onReread,          // () => void — back to the article/video
  onClose,
  m = false,
}) {
  const concepts = analysis?.byConcept || [];
  const { headline, lead } = notYetCopy({ pct, threshold, conceptCount: concepts.length });
  const correct = analysis?.correctCount ?? 0;
  const total = analysis?.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: m ? 16 : 28, maxWidth: 640, margin: '0 auto' }}
    >
      <div style={{ ...glass({ padding: m ? 20 : 28 }), background: `linear-gradient(135deg,${C.blueDim},transparent)`, border: `1px solid ${C.blue}25` }}>
        <div style={R({ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 })}>
          <span style={{ ...pill(C.blueDim, C.blueL, { fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Compass size={12} />Not yet
          </span>
          {onClose && (
            <button aria-label="Close" style={{ ...btnG({ padding: '8px 8px' }) }} onClick={onClose}><X size={14} /></button>
          )}
        </div>

        <h3 style={{ fontSize: m ? 19 : 23, fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: '0 0 8px' }}>{headline}</h3>
        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.65, margin: 0, maxWidth: 520 }}>{lead}</p>

        {/* The score is here, small, once, stated as work done rather than as a
            deficit — "5 of 8 landed" is the same fact as "you got 3 wrong" and
            is a materially different thing to read about yourself. */}
        {total > 0 && (
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, fontFamily: C.FM }}>
            {correct} of {total} landed{threshold != null ? ` · ${threshold}% clears this lesson` : ''}
          </div>
        )}
      </div>

      {concepts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={lbl({ marginBottom: 8 })}>
            Go back to {concepts.length === 1 ? 'this' : 'these'}
          </div>
          <div style={CC({ gap: 8 })}>
            {concepts.slice(0, 4).map((c, i) => (
              <div key={i} style={glass2({ padding: '16px 16px' })}>
                <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 8, background: `${C.blue}1c`, border: `1px solid ${C.blue}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 10.5, fontWeight: 700, color: C.blueL, fontFamily: C.FM,
                  }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.t1, lineHeight: 1.5 }}>{c.concept}</div>
                    {/* The explanation from the item they missed, not a generic
                        one — this is the single most useful sentence available
                        and it was previously buried behind a review carousel. */}
                    {c.items?.[0]?.exp && (
                      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>{c.items[0].exp}</div>
                    )}
                    {c.count > 1 && (
                      <div style={{ fontSize: 11, color: C.t3, marginTop: 8, fontFamily: C.FM }}>
                        came up {c.count} times
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 20 }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          style={{ ...btn(accentGrad(C.violet)), display: 'inline-flex', alignItems: 'center', gap: 8 }}
          onClick={() => onReexplain?.(concepts)}
        >
          <Sparkles size={15} />Have Medabrain re-explain {concepts.length === 1 ? 'it' : 'these'}
        </motion.button>
        {onReread && (
          <button style={{ ...btnG(), display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={onReread}>
            <BookOpen size={14} />Back to the lesson
          </button>
        )}
        <button style={{ ...btnG(), display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={onRetry}>
          <RefreshCw size={14} />Try a different quiz<ArrowRight size={13} />
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: C.t3, marginTop: 16, lineHeight: 1.6, maxWidth: 520 }}>
        The next one pulls questions you haven't seen — retaking the same five would only test
        whether you remembered the answers. Nothing about this attempt is shown to anyone else.
      </p>
    </motion.div>
  );
}
