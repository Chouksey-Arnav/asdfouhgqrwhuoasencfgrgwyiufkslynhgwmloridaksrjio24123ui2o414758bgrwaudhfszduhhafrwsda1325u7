// ─────────────────────────────────────────────────────────────────────────────
// Medabrain Quiz Recommendations — ranked "what should I do next" panel.
// Pure presentation: all ranking math lives in ../lib/recommend.js. This panel
// renders the #1 pick as a featured hero card and #2+ as a numbered list, with
// an optional one-tap "Ask Medabrain why" narration powered by the same Groq
// coach that already runs the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, Sparkles, Flame, Trophy, Medal, ScrollText, Loader2, Dices } from 'lucide-react';
import { C, glass, glass2, btn, pill } from '../lib/theme';
import { rankLabel } from '../lib/recommend';
import { BONUS_TABLE } from '../lib/rewards';

const dColors = { Easy: C.green, Medium: C.cyan, Hard: C.amber, Expert: C.rose };

// A quiz's actual XP payout depends on the score you get (base = round(pct*0.5)) plus a
// variable-ratio bonus roll (see lib/rewards.js) — so the true number isn't knowable until
// you finish. What IS knowable up front is the ceiling, which is what makes a good "up to"
// dopamine preview: perfect score (base 50) hitting the rarest, biggest multiplier.
const JACKPOT = BONUS_TABLE[BONUS_TABLE.length - 1];
const MAX_QUIZ_XP = Math.round(50 * JACKPOT.multiplier);
const JACKPOT_PCT = Math.round(JACKPOT.chance * 100);

const RANK_STYLE = {
  1: { grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', glow: 'rgba(245,158,11,0.35)', icon: Trophy },
  2: { grad: 'linear-gradient(135deg,#94a3b8,#cbd5e1)', glow: 'rgba(148,163,184,0.25)', icon: Medal },
  3: { grad: 'linear-gradient(135deg,#c2733a,#e0985c)', glow: 'rgba(194,115,58,0.25)', icon: Medal },
};

function RankBadge({ rank }) {
  const style = RANK_STYLE[rank];
  if (style) {
    const Icon = style.icon;
    return (
      <div style={{ width: 34, height: 34, borderRadius: 10, background: style.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${style.glow}` }}>
        <Icon size={16} color="#0a0a0a" />
      </div>
    );
  }
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: C.s3, border: `1px solid ${C.b2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.t2, fontFamily: C.FM }}>{rank}</span>
    </div>
  );
}

/**
 * @param {Array}    ranked        output of rankQuizzes()
 * @param {Function} onStart       (quiz) => void — launch the quiz
 * @param {Function} [onAskMedabrain] async (pick) => string — optional Groq narration for #1
 */
export default function QuizRecommendationsPanel({ ranked, onStart, onAskMedabrain, compact = false }) {
  const [brainNote, setBrainNote] = useState(null); // { rank, text }
  const [brainLoading, setBrainLoading] = useState(false);

  if (!ranked || !ranked.length) {
    return (
      <div style={{ ...glass({ padding: 24, background: C.greenDim, border: `1px solid ${C.green}30` }), display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.green}18`, border: `1px solid ${C.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trophy size={18} color={C.greenL} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>You've cleared the entire quiz library</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>Incredible work — check back after new quizzes are added, or review your weakest scores to sharpen further.</div>
        </div>
      </div>
    );
  }

  const [top, ...rest] = ranked;
  const topColor = dColors[top.quiz.diff] || C.blue;

  async function askMedabrain(pick) {
    if (!onAskMedabrain || brainLoading) return;
    setBrainLoading(true);
    try {
      const text = await onAskMedabrain(pick);
      setBrainNote({ rank: pick.rank, text });
    } catch {
      setBrainNote({ rank: pick.rank, text: null });
    }
    setBrainLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Brain size={15} color={C.violetL} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>Medabrain Picks — Ranked For You</span>
      </div>

      {/* #1 — featured hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        whileHover={{ y: -2 }}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 18,
          background: `linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))`,
          border: `1px solid ${C.amber}35`, padding: compact ? 18 : 24,
          boxShadow: `0 8px 32px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.18),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', position: 'relative' }}>
          <RankBadge rank={1} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={pill(`${C.amber}20`, C.amberL, { fontSize: 10, fontWeight: 800 })}>{rankLabel(1).toUpperCase()}</span>
              <span style={pill(`${topColor}18`, topColor, { fontSize: 10 })}>{top.quiz.diff}</span>
              <span style={{ fontSize: 11, color: C.t3 }}>{top.quiz.cat}</span>
            </div>
            <div style={{ fontSize: compact ? 15 : 18, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4, lineHeight: 1.3 }}>{top.quiz.title}</div>
            <div style={{ fontSize: 12.5, color: C.t2, marginBottom: 4 }}>{top.reason}</div>
            <div style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ScrollText size={11} />{top.quiz.qs.length} questions</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.amberL }}><Dices size={11} />Up to +{MAX_QUIZ_XP} XP · {JACKPOT_PCT}% JACKPOT chance</span>
            </div>
            <AnimatePresence>
              {brainNote?.rank === 1 && brainNote.text && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: C.violetDim, border: `1px solid ${C.violet}25`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Brain size={13} color={C.violetL} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: C.t2, fontStyle: 'italic' }}>{brainNote.text}</span>
                  </div>
                </motion.div>
              )}
              {brainNote?.rank === 1 && brainNote.text === null && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: C.roseDim, border: `1px solid ${C.rose}25`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Brain size={13} color={C.roseL} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: C.t2 }}>Medabrain couldn't explain this pick right now — try again in a moment.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', minWidth: 140 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ ...btn(`linear-gradient(135deg,${C.amber},${C.amberL})`, { fontSize: 12.5, padding: '10px 20px' }), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => onStart(top.quiz)}>
              Start Now<ChevronRight size={14} />
            </motion.button>
            {onAskMedabrain && (
              <button
                style={{ ...pill('transparent', C.violetL, { fontSize: 10.5, cursor: 'pointer', border: `1px solid ${C.violet}30`, justifyContent: 'center', padding: '7px 12px' }) }}
                disabled={brainLoading}
                onClick={() => askMedabrain(top)}
              >
                {brainLoading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Loader2 size={11} className="spin" /> Thinking…</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Sparkles size={11} />Ask Medabrain why</span>}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* #2+ — compact ranked rows */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rest.map((p, i) => {
            const dc = dColors[p.quiz.diff] || C.t2;
            const canAskBrain = onAskMedabrain && p.rank <= 3;
            return (
              <motion.div
                key={p.quiz.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.05 }}
                whileHover={{ x: 2 }}
                style={glass2({ padding: '12px 14px' })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <RankBadge rank={p.rank} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{p.quiz.title}</span>
                      <span style={pill(`${dc}18`, dc, { fontSize: 9 })}>{p.quiz.diff}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.t3 }}>{p.reason}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {canAskBrain && (
                      <button
                        title="Ask Medabrain why"
                        style={{ ...pill('transparent', C.violetL, { fontSize: 9.5, cursor: 'pointer', border: `1px solid ${C.violet}30`, padding: '6px 9px' }) }}
                        disabled={brainLoading}
                        onClick={() => askMedabrain(p)}
                      >
                        {brainLoading && brainNote?.rank !== p.rank ? <Loader2 size={10} className="spin" /> : <Brain size={10} />}
                      </button>
                    )}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      style={{ ...btn(C.s3, { fontSize: 11.5, padding: '7px 14px', border: `1px solid ${C.b2}`, color: C.t1, flexShrink: 0 }), display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => onStart(p.quiz)}>
                      Start<ChevronRight size={12} />
                    </motion.button>
                  </div>
                </div>
                <AnimatePresence>
                  {brainNote?.rank === p.rank && brainNote.text && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: C.violetDim, border: `1px solid ${C.violet}25`, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <Brain size={12} color={C.violetL} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 11.5, color: C.t2, fontStyle: 'italic' }}>{brainNote.text}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
