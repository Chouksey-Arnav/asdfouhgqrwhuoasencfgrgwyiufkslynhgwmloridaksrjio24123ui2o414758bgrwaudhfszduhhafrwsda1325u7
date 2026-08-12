// ─────────────────────────────────────────────────────────────────────────────
// The Home streak card.
//
// Home's job is one decision: what do I do next. So this card is not a smaller
// copy of the Streak tab — it carries only the three things that change what a
// student does TODAY, in priority order:
//
//   1. Is today earned yet, and if not, what is the cheapest thing that earns it
//   2. Is a Perfect Week still live this week
//   3. How far to the next reward / their own goal
//
// Everything historical (the calendar, the ladder, the settings) is one tap away
// and deliberately not here.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Check, Snowflake, Trophy, ChevronRight, Target, Zap, TrendingUp } from 'lucide-react';
import { C, glass, pill, R, tint, onTint, btn } from '../../lib/theme';
import { PERFECT_WEEK_REWARD, remainingCopy, leagueFor, streakBonusLabel, activeBoosts, boostCountdown } from '../../lib/streak';
import { LeagueChip } from './StreakLeague';

const ACCENT = C.amber;

export default function StreakHomeCard({
  streak = 0,
  day = null,
  week = null,
  targetInfo = null,
  nextReward = null,
  freezesHeld = 0,
  boosts = [],
  onOpen,            // → Progress → Streak
  onStartStudying,   // → the next lesson, when today isn't earned yet
  nextLessonTitle = null,
  m = false,
  reducedMotion = false,
}) {
  const met = !!day?.met;
  const atRisk = !met && streak > 0;
  // The league is the streak's identity — it tints the whole card, so a student
  // on day 40 is looking at a visibly different object from one on day 2.
  const league = leagueFor(streak);
  const bonus = streakBonusLabel(streak);
  const live = activeBoosts(boosts);
  const topBoost = live[0] || null;

  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${atRisk ? tint(C.orange, 0.4) : met ? tint(C.green, 0.28) : tint(league.color, 0.26)}`,
      background: `linear-gradient(135deg, ${tint(atRisk ? C.orange : met ? C.green : league.color, 0.09)}, transparent 70%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -50, top: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${tint(league.color, 0.16)}, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Flame + count */}
        <div style={{
          width: 56, height: 56, borderRadius: 18, flexShrink: 0,
          background: tint(league.color, 0.15), border: `1.5px solid ${tint(league.color, 0.4)}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: streak > 0 ? `0 0 26px ${tint(league.color, 0.4)}` : 'none',
        }}>
          <Flame size={17} color={league.color} fill={streak > 0 ? league.color : 'none'} />
          <div style={{ fontSize: 16, fontWeight: 900, color: C.t1, fontFamily: C.FD, lineHeight: 1, marginTop: 1 }}>{streak}</div>
        </div>

        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
            <span style={{ ...R({ gap: 7, flexWrap: 'wrap' }) }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
                {streak === 0 ? 'No streak yet' : `${streak}-day streak`}
              </span>
              {streak > 0 && <LeagueChip streak={streak} showBonus={false} size="sm" />}
            </span>
            <button
              onClick={onOpen}
              style={{ background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: 0 }}
            >
              Streak<ChevronRight size={12} />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: met ? C.greenL : atRisk ? C.orangeL : C.t2, lineHeight: 1.45 }}>
            {met
              ? (week?.stillPossible && !week.complete
                ? `Today earned · ${week.remaining} more for a Perfect Week`
                : 'Today earned — nice.')
              : streak === 0
                ? 'One verified lesson today starts it.'
                : remainingCopy(day?.remaining ?? 4)}
          </div>
        </div>
      </div>

      {/* Week strip */}
      {week && (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginTop: 14 }}>
          {week.days.map((d, i) => (
            <motion.div
              key={d.key}
              initial={reducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              title={d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: d.met ? league.color : d.frozen ? tint(C.blue, 0.2) : d.future ? 'transparent' : C.s2,
                border: d.isToday ? `1.5px solid ${C.t1}` : `1px solid ${d.future ? C.b1 : 'transparent'}`,
                opacity: d.future ? 0.35 : 1,
                boxShadow: d.met ? `0 0 10px ${tint(league.color, 0.5)}` : 'none',
              }}>
                {d.met ? <Check size={12} color={onTint(league.color)} strokeWidth={3} />
                  : d.frozen ? <Snowflake size={10} color={C.blueL} />
                    : <span style={{ fontSize: 9, color: C.t4 }}>·</span>}
              </div>
              <div style={{ fontSize: 8.5, color: d.isToday ? C.t1 : C.t4, marginTop: 3, fontWeight: d.isToday ? 800 : 600 }}>{d.letter}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Today's progress bar — only while there is something left to do */}
      {day && !met && (
        <div style={{ position: 'relative', marginTop: 13 }}>
          <div style={{ height: 7, borderRadius: 5, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b0}` }}>
            <motion.div
              initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${day.pct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', borderRadius: 5, background: `linear-gradient(90deg,${ACCENT},${C.orange})` }}
            />
          </div>
        </div>
      )}

      {/* Footer chips + the one action */}
      <div style={{ position: 'relative', ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 13 }) }}>
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          {targetInfo && (
            <span style={pill(C.s3, C.t2, { fontSize: 10, fontFamily: C.FM })}>
              <Target size={10} style={{ marginRight: 4 }} />{streak}/{targetInfo.target}
            </span>
          )}
          {nextReward && (
            <span style={pill(tint(C.gold, 0.13), C.goldL, { fontSize: 10 })}>
              <Trophy size={10} style={{ marginRight: 4 }} />{nextReward.days - streak}d → +{nextReward.xp} XP
            </span>
          )}
          {week?.complete && (
            <span style={pill(C.greenDim, C.greenL, { fontSize: 10 })}>Perfect Week +{PERFECT_WEEK_REWARD.xp} XP</span>
          )}
          {freezesHeld > 0 && (
            <span style={pill(C.blueDim, C.blueL, { fontSize: 10 })}>
              <Snowflake size={10} style={{ marginRight: 4 }} />{freezesHeld}
            </span>
          )}
          {/* The two chips that say the streak is worth something right now,
              rather than only worth something sentimentally. */}
          {bonus && (
            <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 10 })}>
              <TrendingUp size={10} style={{ marginRight: 4 }} />{bonus}
            </span>
          )}
          {topBoost && (
            <span style={pill(tint(topBoost.def.color, 0.15), topBoost.def.color, { fontSize: 10, fontWeight: 800 })}>
              <Zap size={10} style={{ marginRight: 4 }} />×{topBoost.def.multiplier} · {boostCountdown(topBoost.msLeft)}
            </span>
          )}
        </div>
        {!met && onStartStudying && nextLessonTitle && (
          <button
            onClick={onStartStudying}
            style={btn(`linear-gradient(135deg,${ACCENT},${C.orange})`, { padding: '7px 15px', fontSize: 11.5 })}
          >
            Earn today
          </button>
        )}
      </div>
    </div>
  );
}
