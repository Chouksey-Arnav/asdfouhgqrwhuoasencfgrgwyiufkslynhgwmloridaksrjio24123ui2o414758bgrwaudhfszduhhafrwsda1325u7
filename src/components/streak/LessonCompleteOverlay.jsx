// ─────────────────────────────────────────────────────────────────────────────
// The lesson-complete moment — full screen, two pages, one per question.
//
// ── WHY THIS IS A TAKEOVER AND NOT A TOAST ───────────────────────────────────
// Verifying a lesson used to produce a 3-second toast in the corner. That is the
// right weight for "card saved" and completely the wrong weight for the single
// most important event in the product: the thing we spend the entire rest of the
// app trying to get a student to do. A reward that is easy to miss teaches that
// finishing does not matter much.
//
// So it takes the screen, and it answers exactly two questions, in order, one
// per page — because a single screen carrying both is a screen where neither
// lands:
//
//   PAGE 1 — "what did I just earn?"  The XP bar fills, live, from where the
//            level was before to where it is now. The bar is the payoff; the
//            number is the receipt.
//   PAGE 2 — "where does that put me?"  Streak, the week, the student's own
//            streak goal, and how close the Perfect Week reward is. This page
//            exists to make the NEXT session feel already-started.
//
// Both pages are dismissible and neither blocks progress — this is a reward, and
// a reward you cannot skip is a tax.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Flame, Trophy, ArrowRight, Snowflake, Check, ShieldCheck,
  Sparkles, Target, CalendarCheck, ChevronRight,
} from 'lucide-react';
import { C, glass2, btn, btnG, pill, R, tint, onTint, CONTROL_TRANSITION } from '../../lib/theme';
import { play } from '../../lib/sounds';
import { celebrateXP, celebrateStreak, celebrateBonusXP, celebrateJackpot } from '../../lib/celebrate';
import { getLevelInfo } from '../../lib/gamification';
import { PERFECT_WEEK_REWARD, encouragement } from '../../lib/streak';

// The bar fill and the number roll share one clock so they can never disagree
// about how far along the animation is.
const FILL_MS = 1150;

function useCountUp(to, { duration = FILL_MS, run = true } = {}) {
  const [v, setV] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run) { setV(to); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      // easeOutCubic — fast enough to feel responsive, slow enough at the tail
      // that the final number reads as arriving rather than snapping.
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, run]);
  return v;
}

export default function LessonCompleteOverlay({
  open,
  lessonTitle = 'Lesson',
  unitTitle = '',
  pathwayLabel = '',
  quizScore = null,          // % on the verification quiz, if there was one
  xpAwarded = 0,
  xpTier = 'none',           // 'none' | 'bonus' | 'big' | 'jackpot'
  xpBefore = 0,              // total XP before this award — drives the bar's start
  streak = 0,
  streakBefore = 0,
  dailyGoal = null,          // dayStatus() result for today
  week = null,               // weekProgress() result
  targetInfo = null,         // targetProgress() result
  nextReward = null,         // next unclaimed milestone
  milestoneHit = null,       // milestone crossed by this completion, if any
  perfectWeekJustEarned = false,
  freezesHeld = 0,
  nextLessonTitle = null,
  accent = C.blue,
  reducedMotion = false,
  onNextLesson,
  onOpenStreak,
  onClose,
}) {
  const [page, setPage] = useState(0);

  useEffect(() => { if (open) setPage(0); }, [open]);

  // Celebrations fire on the transition into each page, once.
  useEffect(() => {
    if (!open || reducedMotion) return;
    if (page === 0) {
      if (xpTier === 'jackpot') { celebrateJackpot(); play('jackpot'); }
      else if (xpTier === 'big' || xpTier === 'bonus') { celebrateBonusXP(); play('xp'); }
      else { celebrateXP(); play('xp'); }
    } else if (page === 1 && (streak > streakBefore || perfectWeekJustEarned)) {
      celebrateStreak(); play('achieve');
    }
  }, [open, page, reducedMotion, xpTier, streak, streakBefore, perfectWeekJustEarned]);

  // Esc closes, like every other modal in the app.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const streakAccent = C.amber;

  return (
    <AnimatePresence>
      <motion.div
        key="lesson-complete"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22 }}
        role="dialog" aria-modal="true" aria-label="Lesson complete"
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          // Full screen, edge to edge. The whole point is that nothing else is
          // on screen competing with this.
          background: `radial-gradient(ellipse 90% 60% at 50% -10%, ${tint(page === 0 ? accent : streakAccent, 0.22)} 0%, transparent 62%), ${C.bg}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Header rail — page dots + skip. Deliberately quiet: the student
            should feel free to leave, and should always know how far in they are. */}
        <div style={{ ...R({ justifyContent: 'space-between', padding: '16px 16px' }), flexShrink: 0 }}>
          <div style={R({ gap: 4 })}>
            {[0, 1].map(i => (
              <div key={i} style={{
                width: i === page ? 22 : 7, height: 7, borderRadius: 4,
                background: i === page ? (page === 0 ? accent : streakAccent) : C.b2,
                transition: CONTROL_TRANSITION,
              }} />
            ))}
          </div>
          <button
            onClick={onClose} aria-label="Close"
            style={{ ...btnG({ padding: '4px 12px', fontSize: 11.5, gap: 4 }), border: `1px solid ${C.b1}` }}
          >
            {page === 0 ? 'Skip' : 'Done'}<X size={13} />
          </button>
        </div>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0px 16px 32px', minHeight: 0,
        }}>
          <AnimatePresence mode="wait">
            {page === 0 ? (
              <XpPage
                key="xp"
                lessonTitle={lessonTitle} unitTitle={unitTitle} pathwayLabel={pathwayLabel}
                quizScore={quizScore} xpAwarded={xpAwarded} xpTier={xpTier} xpBefore={xpBefore}
                accent={accent} reducedMotion={reducedMotion}
                onNext={() => { setPage(1); play('click'); }}
              />
            ) : (
              <StreakPage
                key="streak"
                streak={streak} streakBefore={streakBefore}
                dailyGoal={dailyGoal} week={week} targetInfo={targetInfo}
                nextReward={nextReward} milestoneHit={milestoneHit}
                perfectWeekJustEarned={perfectWeekJustEarned} freezesHeld={freezesHeld}
                nextLessonTitle={nextLessonTitle}
                accent={streakAccent} reducedMotion={reducedMotion}
                onNextLesson={onNextLesson} onOpenStreak={onOpenStreak} onClose={onClose}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Page 1 — the XP bar ──────────────────────────────────────────────────────
function XpPage({ lessonTitle, unitTitle, pathwayLabel, quizScore, xpAwarded, xpTier, xpBefore, accent, reducedMotion, onNext }) {
  const before = useMemo(() => getLevelInfo(xpBefore), [xpBefore]);
  const after = useMemo(() => getLevelInfo(xpBefore + xpAwarded), [xpBefore, xpAwarded]);
  const leveledUp = after.level > before.level;

  const shownXp = useCountUp(xpAwarded, { run: !reducedMotion });

  // When the award crosses a level the bar has to run to 100% FIRST and only then
  // restart at the new level's real position. Animating straight from (say) 88% to
  // 12% shows the bar travelling backwards at the exact moment the student gained
  // a level, which reads as losing progress. Three phases: where they were, full,
  // where they are now. Without a level-up it is just the first two.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reducedMotion) { setPhase(leveledUp ? 2 : 1); return undefined; }
    const timers = [setTimeout(() => setPhase(1), 90)];
    if (leveledUp) timers.push(setTimeout(() => setPhase(2), 90 + FILL_MS));
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, leveledUp]);

  const barPct = phase === 0 ? before.pct
    : (leveledUp && phase === 1) ? 100
      : after.pct;
  // The bar has to snap, not slide, when it resets to the new level's start.
  const barInstant = leveledUp && phase === 2;

  const tierCopy = {
    none: null,
    bonus: { label: 'Bonus roll', color: C.amberL, icon: Sparkles },
    big: { label: 'Big bonus', color: C.orangeL, icon: Sparkles },
    jackpot: { label: 'JACKPOT', color: C.goldL, icon: Trophy },
  }[xpTier];

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -14 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
      style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16 }}
        style={{
          width: 74, height: 74, borderRadius: 24, margin: '0 auto 20px',
          background: tint(accent, 0.16), border: `1.5px solid ${tint(accent, 0.45)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 44px ${accent}44`,
        }}
      >
        <ShieldCheck size={34} color={accent} />
      </motion.div>

      <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
        Lesson complete
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: C.t1, margin: '0px 0px 8px', fontFamily: C.FD, letterSpacing: 'calc(-0.53px + var(--msp-letter-spacing))', lineHeight: 1.2 }}>
        {lessonTitle}
      </h2>
      <div style={R({ gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 })}>
        {pathwayLabel && <span style={pill(tint(accent, 0.14), accent, { fontSize: 11 })}>{pathwayLabel}</span>}
        {unitTitle && <span style={pill(C.s3, C.t2, { fontSize: 11 })}>{unitTitle}</span>}
        {quizScore != null && (
          <span style={pill(quizScore >= 90 ? C.greenDim : C.s3, quizScore >= 90 ? C.greenL : C.t2, { fontSize: 11, fontFamily: C.FM })}>
            {quizScore}% verified
          </span>
        )}
      </div>

      {/* The number */}
      <div style={R({ justifyContent: 'center', gap: 8, marginBottom: 4 })}>
        <Zap size={30} color={C.amberL} fill={C.amber} />
        <span style={{ fontSize: 56, fontWeight: 900, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-1.8px + var(--msp-letter-spacing))', lineHeight: 1 }}>
          +{shownXp}
        </span>
        <span style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t3, fontFamily: C.FD, alignSelf: 'flex-end', paddingBottom: 4 }}>XP</span>
      </div>
      {tierCopy && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ ...R({ gap: 4, justifyContent: 'center' }), marginBottom: 4 }}
        >
          <tierCopy.icon size={13} color={tierCopy.color} />
          <span style={{ fontSize: 12, fontWeight: 800, color: tierCopy.color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>{tierCopy.label}</span>
        </motion.div>
      )}

      {/* The bar — the actual payoff */}
      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
          <span style={R({ gap: 8 })}>
            <span style={{
              width: 24, height: 24, borderRadius: 8, background: tint(after.tierColor, 0.18),
              border: `1px solid ${tint(after.tierColor, 0.4)}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 800, color: after.tierColor, fontFamily: C.FM,
            }}>{after.level}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>
              {leveledUp ? `Level ${before.level} → ${after.level}` : `Level ${after.level} · ${after.tier}`}
            </span>
          </span>
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>
            {after.xpIntoLevel} / {after.xpForNext}
          </span>
        </div>
        <div style={{
          height: 16, borderRadius: 8, background: C.s2, overflow: 'hidden',
          border: `1px solid ${C.b1}`, position: 'relative',
        }}>
          <motion.div
            // Remounted on the level-up reset so the fill restarts from empty
            // instead of sliding leftwards across the bar.
            key={barInstant ? 'post-levelup' : 'pre-levelup'}
            initial={barInstant ? { width: 0 } : false}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: reducedMotion ? 0 : FILL_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: '100%', borderRadius: 8,
              background: `linear-gradient(90deg, ${accent}, ${C.amber})`,
              boxShadow: `0 0 18px ${accent}70`,
            }}
          />
          {/* Sheen — reads as the bar being "live" rather than a static fill */}
          {!reducedMotion && (
            <motion.div
              initial={{ x: '-40%' }} animate={{ x: '160%' }}
              transition={{ duration: 1.4, delay: 0.25, ease: 'easeInOut' }}
              style={{
                position: 'absolute', top: 0, bottom: 0, width: '35%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8 }}>
          {leveledUp
            ? `Level up — you're a ${after.tier} now.`
            : `${after.xpRemaining} XP to Level ${after.level + 1}`}
        </div>
      </div>

      <button onClick={onNext} style={{ ...btn(`linear-gradient(135deg,${accent},${C.violet})`, { marginTop: 28, padding: '12px 28px', fontSize: 14 }), gap: 8 }}>
        See your streak<ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

// ── Page 2 — streak, goal, perfect week ──────────────────────────────────────
function StreakPage({
  streak, streakBefore, dailyGoal, week, targetInfo, nextReward, milestoneHit,
  perfectWeekJustEarned, freezesHeld, nextLessonTitle, accent, reducedMotion,
  onNextLesson, onOpenStreak, onClose,
}) {
  const shownStreak = useCountUp(streak, { duration: 700, run: !reducedMotion && streak > streakBefore });
  const extended = streak > streakBefore;

  const line = encouragement({
    streak, justMet: extended, week,
    milestone: milestoneHit, target: targetInfo,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -14 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
      style={{ width: '100%', maxWidth: 560 }}
    >
      {/* Flame */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <motion.div
          initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 15 }}
          style={{
            width: 96, height: 96, borderRadius: '50%', margin: '0 auto 14px',
            background: `radial-gradient(circle at 50% 60%, ${tint(accent, 0.34)}, ${tint(accent, 0.08)})`,
            border: `2px solid ${tint(accent, 0.5)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 60px ${accent}55`,
          }}
        >
          <Flame size={44} color={accent} fill={extended ? accent : 'none'} />
        </motion.div>
        <div style={{ fontSize: 52, fontWeight: 900, color: C.t1, fontFamily: C.FD, lineHeight: 1, letterSpacing: 'calc(-1.6px + var(--msp-letter-spacing))' }}>
          {shownStreak}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginTop: 8 }}>
          {extended ? 'Day streak — extended today' : 'Day streak'}
        </div>
      </div>

      {/* The one encouraging sentence. Deterministic, so the screen never
          contradicts itself between renders. */}
      <div style={{
        ...glass2({ padding: 12, textAlign: 'center', marginBottom: 12 }),
        background: tint(accent, 0.09), border: `1px solid ${tint(accent, 0.28)}`,
      }}>
        <div style={{ fontSize: 13.5, color: C.t1, fontWeight: 600, lineHeight: 1.5 }}>{line}</div>
      </div>

      {/* Today's goal, if it isn't done yet — the honest case where finishing a
          lesson did not (on a Serious/Intense goal) clear the day. Telling them
          it did would be a lie the calendar would immediately contradict. */}
      {dailyGoal && !dailyGoal.met && (
        <div style={glass2({ padding: 12, marginBottom: 12 })}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
            <span style={R({ gap: 4 })}><Target size={13} color={C.t2} /><span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>Today's goal</span></span>
            <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>{dailyGoal.credits}/{dailyGoal.goalCredits}</span>
          </div>
          <MiniBar pct={dailyGoal.pct} color={accent} />
        </div>
      )}

      {/* Week strip — Monday to Sunday, with the Perfect Week reward attached */}
      {week && (
        <div style={glass2({ padding: 12, marginBottom: 12 })}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 4 })}>
            <span style={R({ gap: 4 })}>
              <CalendarCheck size={13} color={week.complete ? C.greenL : C.t2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>Perfect Week</span>
            </span>
            <span style={pill(
              week.complete ? C.greenDim : week.stillPossible ? tint(accent, 0.14) : C.s3,
              week.complete ? C.greenL : week.stillPossible ? accent : C.t3,
              { fontSize: 10.5 },
            )}>
              {week.complete ? `Earned · +${PERFECT_WEEK_REWARD.xp} XP`
                : week.stillPossible ? `${week.remaining} to go · +${PERFECT_WEEK_REWARD.xp} XP`
                  : 'Next week'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {week.days.map((d, i) => (
              <motion.div
                key={d.key}
                initial={reducedMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.045, type: 'spring', stiffness: 300, damping: 18 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: d.met ? accent : d.frozen ? tint(C.blue, 0.2) : d.future ? 'transparent' : C.s2,
                  border: d.isToday ? `1.5px solid ${C.t1}` : `1px solid ${d.future ? C.b1 : 'transparent'}`,
                  opacity: d.future ? 0.35 : 1,
                  boxShadow: d.met ? `0 0 12px ${accent}55` : 'none',
                }}>
                  {d.met ? <Check size={15} color={onTint(accent)} strokeWidth={3} />
                    : d.frozen ? <Snowflake size={13} color={C.blueL} />
                      : <span style={{ fontSize: 11, color: C.t4, fontFamily: C.FM }}>·</span>}
                </div>
                <div style={{ fontSize: 9.5, color: d.isToday ? C.t1 : C.t4, marginTop: 4, fontWeight: d.isToday ? 800 : 600 }}>{d.letter}</div>
              </motion.div>
            ))}
          </div>
          {perfectWeekJustEarned && (
            <div style={{ ...R({ gap: 4, justifyContent: 'center' }), marginTop: 12 }}>
              <Trophy size={13} color={C.greenL} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.greenL }}>
                Perfect Week claimed — +{PERFECT_WEEK_REWARD.xp} XP and a streak freeze.
              </span>
            </div>
          )}
        </div>
      )}

      {/* The student's own streak goal */}
      {targetInfo && (
        <div style={glass2({ padding: 12, marginBottom: 12 })}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 })}>
            <span style={R({ gap: 4 })}>
              <Target size={13} color={C.t2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>
                Your goal · {targetInfo.target} days
              </span>
            </span>
            <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>
              {targetInfo.remaining > 0 ? `${targetInfo.remaining} to go` : 'Reached'}
            </span>
          </div>
          <MiniBar pct={targetInfo.pct} color={accent} animate={!reducedMotion} />
          {targetInfo.surpassed && (
            <div style={{ fontSize: 11, color: C.greenL, marginTop: 8 }}>
              You passed your original {targetInfo.original}-day goal — this is the next rung.
            </div>
          )}
        </div>
      )}

      {/* What is waiting at the next milestone */}
      {nextReward && (
        <button
          onClick={onOpenStreak}
          style={{
            ...glass2({ padding: 12, marginBottom: 16 }), width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            border: `1px dashed ${tint(accent, 0.35)}`, background: 'transparent',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: tint(accent, 0.14), border: `1px solid ${tint(accent, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Trophy size={16} color={accent} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>
              {nextReward.days - streak} more day{nextReward.days - streak === 1 ? '' : 's'} → {nextReward.title}
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
              +{nextReward.xp} XP{nextReward.freezes ? ` · ${nextReward.freezes} streak freeze${nextReward.freezes > 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <ChevronRight size={15} color={C.t3} />
        </button>
      )}

      {freezesHeld > 0 && (
        <div style={{ ...R({ gap: 4, justifyContent: 'center' }), marginBottom: 16 }}>
          <Snowflake size={12} color={C.blueL} />
          <span style={{ fontSize: 11.5, color: C.t3 }}>
            {freezesHeld} streak freeze{freezesHeld > 1 ? 's' : ''} held — one missed day won't end this.
          </span>
        </div>
      )}

      {/* Forward, not away. The primary button is the next lesson whenever there
          is one: the best moment to start the next thing is the moment you
          finished the last one. */}
      <div style={R({ gap: 8, justifyContent: 'center', flexWrap: 'wrap' })}>
        {nextLessonTitle && onNextLesson && (
          <button onClick={onNextLesson} style={{ ...btn(`linear-gradient(135deg,${accent},${C.orange})`, { padding: '12px 24px', fontSize: 13.5 }), gap: 8 }}>
            Next lesson<ArrowRight size={15} />
          </button>
        )}
        <button onClick={onClose} style={btnG({ padding: '12px 24px', fontSize: 13.5 })}>
          {nextLessonTitle ? 'Not now' : 'Done'}
        </button>
      </div>
      {nextLessonTitle && (
        <div style={{ textAlign: 'center', fontSize: 11, color: C.t4, marginTop: 8 }}>
          Up next: {nextLessonTitle}
        </div>
      )}
    </motion.div>
  );
}

function MiniBar({ pct, color, animate = true }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b0}` }}>
      <motion.div
        initial={animate ? { width: 0 } : false}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: animate ? 0.8 : 0, ease: [0.22, 1, 0.36, 1], delay: animate ? 0.15 : 0 }}
        style={{ height: '100%', borderRadius: 4, background: color, boxShadow: `0 0 10px ${color}60` }}
      />
    </div>
  );
}
