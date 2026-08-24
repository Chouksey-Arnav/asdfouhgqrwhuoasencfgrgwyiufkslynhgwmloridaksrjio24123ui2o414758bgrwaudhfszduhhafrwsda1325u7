// ─────────────────────────────────────────────────────────────────────────────
// Progress → Streak. The home of the whole streak system.
//
// ── WHY THIS TAB, AND WHY HERE ───────────────────────────────────────────────
// It is not Home: Home is a one-decision dashboard ("what do I do next"), and
// burying a settings surface, a month calendar, a check-in calendar and a
// fourteen-rung reward ladder in it would bury the one thing Home is for. It is
// not Settings either — the streak is not a preference, it is a record, and
// nobody browses Settings for motivation.
//
// Progress is the tab a student opens to ask "how am I actually doing", which
// is the exact question a streak answers, and it already holds the other two
// halves of that answer (Verified Progress, Achievements). It sits FIRST in the
// Progress sub-nav because it is the only one of the four with a live deadline
// attached — today is still winnable, and the others are all retrospective.
//
// ── The order of this screen ────────────────────────────────────────────────
// Ordered by "how urgent is this right now", not by "how permanent is it":
//
//   0. THE REPAIR OFFER, when there is one. A broken streak is the only thing on
//      this page with a clock on it, and it goes above everything.
//   1. TODAY. The hero — the number, the league, and whether today is earned.
//   2. THE LIVE STUFF. Perfect Week, Perfect Month, your target, running boosts.
//   3. PROTECTION. Freezes: what you hold, what it costs, what has been spent.
//   4. THE CHECK-IN CALENDAR. The other ladder — turning up, not working.
//   5. THE RECORD. The month calendar.
//   6. THE LADDERS. Milestones and leagues.
//   7. SETTINGS. Your daily goal and your streak target.
//   8. REFERENCE. What earns credit.
//
// Home still carries a compact streak card (StreakHomeCard) that links here.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Snowflake, Trophy, Target, Check, Lock, CalendarCheck, CalendarRange,
  Sparkles, TrendingUp, Info, Zap,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, pill, R, CC, lbl, tint, onTint, autoGrid, CONTROL_TRANSITION } from '../../lib/theme';
import {
  STREAK_GOALS, STREAK_TARGETS, STREAK_REWARDS, STREAK_ACTIONS,
  PERFECT_WEEK_REWARD, PERFECT_MONTH_REWARD, rewardKey, perfectWeekKey, perfectMonthKey,
  remainingCopy, nextMilestone, leagueFor, streakBonusLabel, activeBoosts,
} from '../../lib/streak';
import StreakCalendar from './StreakCalendar';
import StreakLeagueCard, { LeagueChip, LeagueLadder } from './StreakLeague';
import FreezeCard from './FreezeCard';
import StreakRepairCard from './StreakRepairCard';
import CheckInCalendar from './CheckInCalendar';
import { BoostList } from './BoostChip';

const ACCENT = C.amber;

export default function StreakPanel({
  streak = 0,
  bestStreak = 0,
  freezesHeld = 0,
  freezeHistory = [],
  xp = 0,
  day = null,              // dayStatus() for today
  week = null,             // weekProgress()
  month = null,            // monthProgress()
  targetInfo = null,       // targetProgress()
  activity = new Map(),
  bridged = new Set(),
  claimedRewards = new Set(),
  goalId,
  streakTarget,
  totalEarnedDays = 0,
  boosts = [],
  repair = null,           // repairOffer() output, or null
  checkin = null,          // loadCheckinState() output
  onSetGoal,
  onSetTarget,
  onBuyFreeze,
  onRepair,
  onClaimCheckin,
  busy = {},               // { freeze, repair, checkin }
  m = false,
}) {
  const next = useMemo(() => nextMilestone(streak), [streak]);
  const goalCredits = day?.goalCredits || 4;
  const league = useMemo(() => leagueFor(streak), [streak]);
  const bonusLabel = useMemo(() => streakBonusLabel(streak), [streak]);
  const liveBoosts = useMemo(() => activeBoosts(boosts), [boosts]);

  return (
    <div style={CC({ gap: 20 })}>
      {/* ── 0. The repair offer ──────────────────────────────────────────── */}
      {repair && (
        <StreakRepairCard offer={repair} xp={xp} onRepair={onRepair} busy={!!busy.repair} m={m} />
      )}

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: m ? 20 : 26 }),
        background: `linear-gradient(150deg, ${tint(league.color, 0.14)}, ${tint(C.orange, 0.04)})`,
        border: `1px solid ${tint(league.color, 0.3)}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -70, top: -70, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${tint(league.color, 0.22)}, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', gap: m ? 16 : 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: m ? 74 : 88, height: m ? 74 : 88, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 50% 62%, ${tint(league.color, 0.3)}, ${tint(league.color, 0.07)})`,
            border: `2px solid ${tint(league.color, 0.45)}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 44px ${tint(league.color, 0.4)}`,
          }}>
            <Flame size={m ? 22 : 26} color={league.color} fill={streak > 0 ? league.color : 'none'} />
            <div style={{ fontSize: m ? 20 : 24, fontWeight: 900, color: C.t1, fontFamily: C.FD, lineHeight: 1, marginTop: 4 }}>{streak}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: league.color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                Current streak
              </span>
              <LeagueChip streak={streak} size="sm" />
            </div>
            <h2 style={{ fontSize: m ? 22 : 26, fontWeight: 800, color: C.t1, margin: '0px 0px 8px', fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
              {streak === 0 ? 'Start one today' : `${streak} day${streak === 1 ? '' : 's'} in a row`}
            </h2>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}><Trophy size={11} style={{ marginRight: 4 }} />Best {bestStreak}</span>
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}>{totalEarnedDays} days earned all-time</span>
              {bonusLabel && (
                <span style={{ ...pill(tint(C.amber, 0.14), C.amberL), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={11} />{bonusLabel} on everything
                </span>
              )}
              {freezesHeld > 0 && (
                <span style={{ ...pill(C.blueDim, C.blueL), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Snowflake size={11} />{freezesHeld} freeze{freezesHeld > 1 ? 's' : ''}
                </span>
              )}
              {liveBoosts.length > 0 && (
                <span style={{ ...pill(C.violetDim, C.violetL), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} />{liveBoosts.length} boost{liveBoosts.length > 1 ? 's' : ''} live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today — the only live thing on this screen */}
        {day && (
          <div style={{ position: 'relative', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.b1}` }}>
            <div style={R({ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 })}>
              <span style={R({ gap: 8 })}>
                {day.met
                  ? <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color={onTint(C.green)} strokeWidth={3} /></span>
                  : <Target size={15} color={C.t2} />}
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>
                  {day.met ? 'Today is earned' : "Today's goal"}
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
            <div style={{ fontSize: 12, color: day.met ? C.greenL : C.t2, marginTop: 8 }}>
              {day.met
                ? (week?.stillPossible && !week.complete
                  ? `Locked in. ${week.remaining} more day${week.remaining === 1 ? '' : 's'} this week for the Perfect Week reward.`
                  : 'Locked in. Anything else today is pure gain.')
                : remainingCopy(day.remaining)}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. The live stuff ────────────────────────────────────────────── */}
      <div style={autoGrid(280, 16)}>
        {week && <PerfectWeekCard week={week} claimed={claimedRewards.has(perfectWeekKey(week.weekKey))} m={m} />}
        {month && <PerfectMonthCard month={month} claimed={claimedRewards.has(perfectMonthKey(month.monthKey))} m={m} />}
        {targetInfo && <TargetCard targetInfo={targetInfo} streak={streak} next={next} m={m} />}
      </div>

      {liveBoosts.length > 0 && (
        <div style={glass({ padding: m ? 16 : 20 })}>
          <div style={{ ...lbl({ marginBottom: 4 }) }}>Boosts running</div>
          <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 12 }}>
            A boost multiplies every XP award while it lasts, on top of your league bonus.
          </div>
          <BoostList boosts={boosts} streakBonusLabel={bonusLabel} m={m} />
        </div>
      )}

      {/* ── 3. Protection ────────────────────────────────────────────────── */}
      <FreezeCard
        streak={streak} held={freezesHeld} xp={xp} history={freezeHistory}
        onBuy={onBuyFreeze} busy={!!busy.freeze} m={m}
      />

      {/* ── 4. The other ladder ──────────────────────────────────────────── */}
      {checkin && (
        <CheckInCalendar state={checkin} onClaim={onClaimCheckin} busy={!!busy.checkin} m={m} />
      )}

      {/* ── 5. The record ────────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 })}>
          <div>
            <div style={{ ...lbl(), marginBottom: 4 }}>Streak calendar</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>Tap any day to see exactly what earned it.</div>
          </div>
        </div>
        <StreakCalendar activity={activity} bridged={bridged} goalCredits={goalCredits} accent={ACCENT} m={m} />
      </div>

      {/* ── 6. The ladders ───────────────────────────────────────────────── */}
      <StreakLeagueCard streak={streak} freezesHeld={freezesHeld} m={m} />

      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={{ ...lbl(), marginBottom: 4 }}>Streak rewards</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16 }}>
          Every rung pays out once, ever — automatically, the moment you reach it. The first four
          are all inside your first fortnight, because that is the part that is actually hard.
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

      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={{ ...lbl(), marginBottom: 4 }}>Leagues</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16 }}>
          Your league is your streak length, given a name. It sets how many freezes you can hold and
          how much extra XP everything you do is worth.
        </div>
        <LeagueLadder streak={streak} m={m} />
      </div>

      {/* ── 7. Settings ──────────────────────────────────────────────────── */}
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
                  ...glass2({ padding: 12, textAlign: 'left' }),
                  cursor: 'pointer', width: '100%',
                  border: `1.5px solid ${active ? ACCENT : C.b1}`,
                  background: active ? tint(ACCENT, 0.1) : C.surf2,
                  transition: CONTROL_TRANSITION,
                }}
              >
                <div style={R({ justifyContent: 'space-between', marginBottom: 4 })}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: active ? ACCENT : C.t1, fontFamily: C.FD }}>{g.label}</span>
                  {active && <Check size={14} color={ACCENT} strokeWidth={3} />}
                </div>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, marginBottom: 8 }}>{g.credits} credits · {g.minutes}</div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.45, marginBottom: 8 }}>{g.blurb}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {g.examples.map(e => <span key={e} style={pill(C.s3, C.t3, { fontSize: 9.5, padding: '4px 8px' })}>{e}</span>)}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ ...lbl(), marginTop: 24, marginBottom: 4 }}>Your streak goal</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 12 }}>
          The number you are actually aiming for. Every streak bar in the app measures against it.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STREAK_TARGETS.map(t => {
            const active = t === streakTarget;
            return (
              <button
                key={t} onClick={() => onSetTarget?.(t)}
                style={{
                  ...(active ? btn(`linear-gradient(135deg,${ACCENT},${C.orange})`, { padding: '8px 16px', fontSize: 12.5 })
                    : btnG({ padding: '8px 16px', fontSize: 12.5 })),
                  minWidth: 76,
                }}
              >{t} days</button>
            );
          })}
        </div>
      </div>

      {/* ── 8. What counts ───────────────────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 22 })}>
        <div style={R({ gap: 8, marginBottom: 4 })}>
          <Info size={13} color={C.t3} />
          <div style={{ ...lbl(), marginBottom: 0 }}>What earns credit</div>
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 16, lineHeight: 1.5 }}>
          Opening the app earns nothing here — that is what the check-in calendar above is for. A
          streak is a record of work, so only finished work moves it, which is what makes it worth
          having.
        </div>
        <div style={autoGrid(210, 10)}>
          {Object.entries(STREAK_ACTIONS).map(([key, a]) => (
            <div key={key} style={{ ...glass2({ padding: 12 }), display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: tint(ACCENT, 0.13), border: `1px solid ${tint(ACCENT, 0.28)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: ACCENT, fontFamily: C.FM,
              }}>{a.credits}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.t1, lineHeight: 1.3 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: C.t4, marginTop: 4 }}>per {a.per}</div>
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
      <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 })}>
        <span style={R({ gap: 8 })}>
          <CalendarCheck size={15} color={tone} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Perfect Week</span>
        </span>
        <span style={pill(tint(tone, 0.14), tone, { fontSize: 10.5 })}>
          {claimed ? 'Claimed' : week.complete ? 'Earned' : `${week.met}/7`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 12 }}>
        {week.days.map(d => (
          <div key={d.key} style={{ textAlign: 'center' }}>
            <div style={{
              height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: d.met ? ACCENT : d.frozen ? tint(C.blue, 0.2) : d.future ? 'transparent' : C.s2,
              border: d.isToday ? `1.5px solid ${C.t1}` : `1px solid ${d.future ? C.b1 : 'transparent'}`,
              opacity: d.future ? 0.35 : 1,
            }}>
              {d.met ? <Check size={13} color={onTint(ACCENT)} strokeWidth={3} />
                : d.frozen ? <Snowflake size={11} color={C.blueL} />
                  : <span style={{ fontSize: 10, color: C.t4 }}>·</span>}
            </div>
            <div style={{ fontSize: 9, color: d.isToday ? C.t1 : C.t4, marginTop: 4, fontWeight: d.isToday ? 800 : 600 }}>{d.letter}</div>
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

/**
 * The Perfect Month.
 *
 * Deliberately measured against ELAPSED days rather than the whole month: a bar
 * reading 26% on the 8th of a flawless month is telling a student they are
 * failing at the thing they are currently winning, which is the single fastest
 * way to make somebody stop looking at a progress bar.
 */
function PerfectMonthCard({ month, claimed, m }) {
  const tone = month.complete ? C.green : month.stillPossible ? C.violet : C.t3;
  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${month.complete ? tint(C.green, 0.35) : month.stillPossible ? tint(C.violet, 0.28) : C.b1}`,
      background: month.complete ? tint(C.green, 0.07) : month.stillPossible ? tint(C.violet, 0.05) : C.surf,
    }}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 })}>
        <span style={R({ gap: 8 })}>
          <CalendarRange size={15} color={tone} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Perfect {month.label}</span>
        </span>
        <span style={pill(tint(tone, 0.14), tone, { fontSize: 10.5 })}>
          {claimed ? 'Claimed' : month.complete ? 'Earned' : `${month.met}/${month.elapsed}`}
        </span>
      </div>

      {/* One pip per day of the month. Dense on purpose — the shape of the month
          is the information, not any individual square. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(16, month.daysInMonth)}, 1fr)`, gap: 4, marginBottom: 12 }}>
        {month.days.map(d => (
          <div
            key={d.key}
            title={`${d.key}${d.met ? ' — earned' : d.frozen ? ' — frozen' : ''}`}
            style={{
              height: 14, borderRadius: 4,
              background: d.met ? C.violet : d.frozen ? tint(C.blue, 0.22) : d.future ? 'transparent' : C.s2,
              border: d.isToday ? `1px solid ${C.t1}` : `1px solid ${d.future ? C.b0 : 'transparent'}`,
              opacity: d.future ? 0.4 : 1,
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
        {month.complete
          ? `Every day of ${month.label} earned — +${PERFECT_MONTH_REWARD.xp} XP and ${PERFECT_MONTH_REWARD.freezes} freezes.`
          : month.stillPossible
            ? `Still flawless. ${month.remaining} day${month.remaining === 1 ? '' : 's'} left in ${month.label} for +${PERFECT_MONTH_REWARD.xp} XP and ${PERFECT_MONTH_REWARD.freezes} freezes.`
            : `${month.missed} day${month.missed === 1 ? '' : 's'} missed — this one is gone, and a fresh month starts on the 1st. Freezes do not cover it.`}
      </div>
    </div>
  );
}

function TargetCard({ targetInfo, streak, next, m }) {
  return (
    <div style={glass({ padding: m ? 16 : 20 })}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 })}>
        <span style={R({ gap: 8 })}>
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
          : 'You are at your goal. Set a longer one below.'}
        {targetInfo.surpassed && ` You already passed ${targetInfo.original}.`}
      </div>
      {next && (
        <div style={{ ...R({ gap: 8 }), marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
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
        <div style={R({ justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
            {reward.days} days · {reward.title}
          </span>
          <span style={{ fontSize: 11, color: tone, fontFamily: C.FM, fontWeight: 700 }}>
            +{reward.xp} XP{reward.freezes ? ` · ${reward.freezes}❄` : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginBottom: reached ? 0 : 7, lineHeight: 1.4 }}>{reward.blurb}</div>
        {!reached && (
          <div style={{ height: 4, borderRadius: 4, background: C.s2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: tint(ACCENT, 0.6), borderRadius: 4 }} />
          </div>
        )}
      </div>
    </div>
  );
}
