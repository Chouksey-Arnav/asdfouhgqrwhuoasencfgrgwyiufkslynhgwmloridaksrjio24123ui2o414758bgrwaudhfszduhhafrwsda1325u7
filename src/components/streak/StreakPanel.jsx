// ─────────────────────────────────────────────────────────────────────────────
// Progress → Streak. The home of the whole streak system.
//
// ── WHY THIS TAB, AND WHY HERE ───────────────────────────────────────────────
// It is not Home: Home is a one-decision dashboard ("what do I do next"), and
// burying a settings surface, a month calendar and an eight-rung reward ladder
// in it would bury the one thing Home is for. It is not Settings either — the
// streak is not a preference, it is a record, and nobody browses Settings for
// motivation.
//
// Progress is the tab a student opens to ask "how am I actually doing", which
// is the exact question a streak answers, and it already holds the other two
// halves of that answer (Verified Progress, Achievements). It sits FIRST in the
// Progress sub-nav because it is the only one of the four with a live deadline
// attached — today is still winnable, and the others are all retrospective.
//
// Home still carries a compact streak card (StreakHomeCard) that links here.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Snowflake, Trophy, Target, Check, Lock, CalendarCheck,
  Sparkles, TrendingUp, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, pill, R, CC, lbl, tint, onTint, autoGrid } from '../../lib/theme';
import {
  STREAK_GOALS, STREAK_TARGETS, STREAK_REWARDS, STREAK_ACTIONS,
  PERFECT_WEEK_REWARD, rewardKey, perfectWeekKey, remainingCopy, nextMilestone,
} from '../../lib/streak';
import StreakCalendar from './StreakCalendar';

const ACCENT = C.amber;

export default function StreakPanel({
  streak = 0,
  bestStreak = 0,
  freezesHeld = 0,
  day = null,              // dayStatus() for today
  week = null,             // weekProgress()
  targetInfo = null,       // targetProgress()
  activity = new Map(),
  bridged = new Set(),
  claimedRewards = new Set(),
  goalId,
  streakTarget,
  totalEarnedDays = 0,
  onSetGoal,
  onSetTarget,
  m = false,
}) {
  const next = useMemo(() => nextMilestone(streak), [streak]);
  const goalCredits = day?.goalCredits || 4;

  return (
    <div style={CC({ gap: 20 })}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: m ? 20 : 26 }),
        background: `linear-gradient(150deg, ${tint(ACCENT, 0.13)}, ${tint(C.orange, 0.04)})`,
        border: `1px solid ${tint(ACCENT, 0.3)}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -70, top: -70, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}22, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', gap: m ? 16 : 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: m ? 74 : 88, height: m ? 74 : 88, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 50% 62%, ${tint(ACCENT, 0.3)}, ${tint(ACCENT, 0.07)})`,
            border: `2px solid ${tint(ACCENT, 0.45)}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 44px ${ACCENT}40`,
          }}>
            <Flame size={m ? 22 : 26} color={ACCENT} fill={streak > 0 ? ACCENT : 'none'} />
            <div style={{ fontSize: m ? 20 : 24, fontWeight: 900, color: C.t1, fontFamily: C.FD, lineHeight: 1, marginTop: 2 }}>{streak}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: ACCENT, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              Current streak
            </div>
            <h2 style={{ fontSize: m ? 22 : 26, fontWeight: 800, color: C.t1, margin: '0 0 10px', fontFamily: C.FD, letterSpacing: '-.02em' }}>
              {streak === 0 ? 'Start one today' : `${streak} day${streak === 1 ? '' : 's'} in a row`}
            </h2>
            <div style={R({ gap: 7, flexWrap: 'wrap' })}>
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}><Trophy size={11} style={{ marginRight: 4 }} />Best {bestStreak}</span>
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}>{totalEarnedDays} days earned all-time</span>
              {freezesHeld > 0 && (
                <span style={{ ...pill(C.blueDim, C.blueL), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Snowflake size={11} />{freezesHeld} freeze{freezesHeld > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today — the only live thing on this screen */}
        {day && (
          <div style={{ position: 'relative', marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.b1}` }}>
            <div style={R({ justifyContent: 'space-between', marginBottom: 9, flexWrap: 'wrap', gap: 8 })}>
              <span style={R({ gap: 7 })}>
                {day.met
                  ? <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color={onTint(C.green)} strokeWidth={3} /></span>
                  : <Target size={15} color={C.t2} />}
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>
                  {day.met ? "Today is earned" : "Today's goal"}
                </span>
              </span>
              <span style={{ fontSize: 12, color: C.t3, fontFamily: C.FM }}>{day.credits} / {day.goalCredits} credits</span>
            </div>
            <div style={{ height: 12, borderRadius: 8, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b1}` }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${day.pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', borderRadius: 8, background: day.met ? C.green : `linear-gradient(90deg,${ACCENT},${C.orange})`, boxShadow: `0 0 14px ${(day.met ? C.green : ACCENT)}60` }}
              />
            </div>
            <div style={{ fontSize: 12, color: day.met ? C.greenL : C.t2, marginTop: 9 }}>
              {day.met
                ? (week?.stillPossible && !week.complete
                  ? `Locked in. ${week.remaining} more day${week.remaining === 1 ? '' : 's'} this week for the Perfect Week reward.`
                  : 'Locked in. Anything else today is pure gain.')
                : remainingCopy(day.remaining)}
            </div>
          </div>
        )}
      </div>

      {/* ── Perfect week + your goal ──────────────────────────────────────── */}
      <div style={autoGrid(280, 16)}>
        {week && <PerfectWeekCard week={week} claimed={claimedRewards.has(perfectWeekKey(week.weekKey))} m={m} />}
        {targetInfo && <TargetCard targetInfo={targetInfo} streak={streak} next={next} m={m} />}
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 })}>
          <div>
            <div style={{ ...lbl(), marginBottom: 3 }}>Streak calendar</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>Tap any day to see exactly what earned it.</div>
          </div>
        </div>
        <StreakCalendar activity={activity} bridged={bridged} goalCredits={goalCredits} accent={ACCENT} m={m} />
      </div>

      {/* ── Rewards ladder ────────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={{ ...lbl(), marginBottom: 4 }}>Streak rewards</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16 }}>
          Every rung pays out once, ever — automatically, the moment you reach it.
        </div>
        <div style={CC({ gap: 8 })}>
          {STREAK_REWARDS.map(r => (
            <RewardRow
              key={r.days} reward={r} streak={streak}
              claimed={claimedRewards.has(rewardKey(r.days))} m={m}
            />
          ))}
        </div>
      </div>

      {/* ── Goals ─────────────────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={{ ...lbl(), marginBottom: 4 }}>Your daily goal</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16 }}>
          How much work a day has to contain before it counts toward the streak. Raising it never
          un-earns a day you already finished.
        </div>
        <div style={autoGrid(200, 12)}>
          {STREAK_GOALS.map(g => {
            const active = g.id === goalId;
            return (
              <button
                key={g.id} onClick={() => onSetGoal?.(g.id)}
                style={{
                  ...glass2({ padding: 14, textAlign: 'left' }),
                  cursor: 'pointer', width: '100%',
                  border: `1.5px solid ${active ? ACCENT : C.b1}`,
                  background: active ? tint(ACCENT, 0.1) : C.surf2,
                  transition: 'all .15s',
                }}
              >
                <div style={R({ justifyContent: 'space-between', marginBottom: 6 })}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: active ? ACCENT : C.t1, fontFamily: C.FD }}>{g.label}</span>
                  {active && <Check size={14} color={ACCENT} strokeWidth={3} />}
                </div>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, marginBottom: 7 }}>{g.credits} credits · {g.minutes}</div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.45, marginBottom: 8 }}>{g.blurb}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {g.examples.map(e => <span key={e} style={pill(C.s3, C.t3, { fontSize: 9.5, padding: '2px 8px' })}>{e}</span>)}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ ...lbl(), marginTop: 24, marginBottom: 4 }}>Your streak goal</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 14 }}>
          The number you are actually aiming for. Every streak bar in the app measures against it.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STREAK_TARGETS.map(t => {
            const active = t === streakTarget;
            return (
              <button
                key={t} onClick={() => onSetTarget?.(t)}
                style={{
                  ...(active ? btn(`linear-gradient(135deg,${ACCENT},${C.orange})`, { padding: '9px 18px', fontSize: 12.5 })
                    : btnG({ padding: '9px 18px', fontSize: 12.5 })),
                  minWidth: 76,
                }}
              >{t} days</button>
            );
          })}
        </div>
      </div>

      {/* ── What counts ───────────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={R({ gap: 7, marginBottom: 4 })}>
          <Info size={13} color={C.t3} />
          <div style={{ ...lbl(), marginBottom: 0 }}>What earns credit</div>
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16, lineHeight: 1.5 }}>
          Opening the app earns nothing. A streak here is a record of work, so only finished work
          moves it — which is what makes it worth having.
        </div>
        <div style={autoGrid(210, 10)}>
          {Object.entries(STREAK_ACTIONS).map(([key, a]) => (
            <div key={key} style={{ ...glass2({ padding: 12 }), display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: tint(ACCENT, 0.13), border: `1px solid ${tint(ACCENT, 0.28)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: ACCENT, fontFamily: C.FM,
              }}>{a.credits}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.t1, lineHeight: 1.3 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>per {a.per}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerfectWeekCard({ week, claimed, m }) {
  const tone = week.complete ? C.green : week.stillPossible ? ACCENT : C.t3;
  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${week.complete ? tint(C.green, 0.35) : C.b1}`,
      background: week.complete ? tint(C.green, 0.07) : C.surf,
    }}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 })}>
        <span style={R({ gap: 7 })}>
          <CalendarCheck size={15} color={tone} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Perfect Week</span>
        </span>
        <span style={pill(tint(tone, 0.14), tone, { fontSize: 10.5 })}>
          {claimed ? 'Claimed' : week.complete ? 'Earned' : `${week.met}/7`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 12 }}>
        {week.days.map(d => (
          <div key={d.key} style={{ textAlign: 'center' }}>
            <div style={{
              height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: d.met ? ACCENT : d.frozen ? tint(C.blue, 0.2) : d.future ? 'transparent' : C.s2,
              border: d.isToday ? `1.5px solid ${C.t1}` : `1px solid ${d.future ? C.b1 : 'transparent'}`,
              opacity: d.future ? 0.35 : 1,
            }}>
              {d.met ? <Check size={13} color={onTint(ACCENT)} strokeWidth={3} />
                : d.frozen ? <Snowflake size={11} color={C.blueL} />
                  : <span style={{ fontSize: 10, color: C.t4 }}>·</span>}
            </div>
            <div style={{ fontSize: 9, color: d.isToday ? C.t1 : C.t4, marginTop: 3, fontWeight: d.isToday ? 800 : 600 }}>{d.letter}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
        {week.complete
          ? `All seven days earned — +${PERFECT_WEEK_REWARD.xp} XP and a streak freeze.`
          : week.stillPossible
            ? `${week.remaining} more earned day${week.remaining === 1 ? '' : 's'} this week takes +${PERFECT_WEEK_REWARD.xp} XP and a streak freeze.`
            : 'Out of reach this week — it resets fresh on Monday. A freeze does not cover a perfect week.'}
      </div>
    </div>
  );
}

function TargetCard({ targetInfo, streak, next, m }) {
  return (
    <div style={glass({ padding: m ? 16 : 20 })}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 })}>
        <span style={R({ gap: 7 })}>
          <Target size={15} color={ACCENT} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Your streak goal</span>
        </span>
        <span style={pill(tint(ACCENT, 0.14), ACCENT, { fontFamily: C.FM, fontSize: 10.5 })}>{streak}/{targetInfo.target}</span>
      </div>
      <div style={{ height: 12, borderRadius: 8, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b1}`, marginBottom: 12 }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${targetInfo.pct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 8, background: `linear-gradient(90deg,${ACCENT},${C.orange})`, boxShadow: `0 0 14px ${ACCENT}55` }}
        />
      </div>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
        {targetInfo.remaining > 0
          ? `${targetInfo.remaining} more day${targetInfo.remaining === 1 ? '' : 's'} to hit ${targetInfo.target}.`
          : `You are at your goal. Set a longer one below.`}
        {targetInfo.surpassed && ` You already passed ${targetInfo.original}.`}
      </div>
      {next && (
        <div style={{ ...R({ gap: 7 }), marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
          <Trophy size={13} color={C.goldL} />
          <span style={{ fontSize: 11.5, color: C.t3 }}>
            Next reward at {next.days} days — +{next.xp} XP
          </span>
        </div>
      )}
    </div>
  );
}

function RewardRow({ reward, streak, claimed, m }) {
  const reached = streak >= reward.days;
  const pct = Math.min(100, Math.round((streak / reward.days) * 100));
  const tone = claimed ? C.green : reached ? ACCENT : C.t3;
  return (
    <div style={{
      ...glass2({ padding: m ? 12 : 14 }),
      display: 'flex', alignItems: 'center', gap: 12,
      border: `1px solid ${claimed ? tint(C.green, 0.3) : reached ? tint(ACCENT, 0.3) : C.b1}`,
      background: claimed ? tint(C.green, 0.06) : reached ? tint(ACCENT, 0.05) : C.surf2,
      opacity: reached || pct > 20 ? 1 : 0.72,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: tint(tone, 0.14), border: `1px solid ${tint(tone, 0.32)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {claimed ? <Check size={17} color={C.greenL} strokeWidth={3} />
          : reached ? <Sparkles size={16} color={ACCENT} />
            : <Lock size={14} color={C.t4} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={R({ justifyContent: 'space-between', gap: 8, marginBottom: 3, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
            {reward.days} days · {reward.title}
          </span>
          <span style={{ fontSize: 11, color: tone, fontFamily: C.FM, fontWeight: 700 }}>
            +{reward.xp} XP{reward.freezes ? ` · ${reward.freezes}❄` : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginBottom: reached ? 0 : 7, lineHeight: 1.4 }}>{reward.blurb}</div>
        {!reached && (
          <div style={{ height: 4, borderRadius: 3, background: C.s2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: tint(ACCENT, 0.6), borderRadius: 3 }} />
          </div>
        )}
      </div>
    </div>
  );
}
