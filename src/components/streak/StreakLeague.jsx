// ─────────────────────────────────────────────────────────────────────────────
// The league badge — the streak's identity, as opposed to the streak's number.
//
// ── Why a number needed a name ──────────────────────────────────────────────
// "41" is a fact. "Wildfire" is a thing you are. For the audience this product
// is actually for, the second one is worth considerably more than the first, and
// it costs nothing to provide: the league is derived entirely from the streak
// length (see STREAK_LEAGUES in lib/streak.js), stores nothing, and cannot
// disagree with the number it is drawn next to.
//
// ── The part that is not cosmetic ───────────────────────────────────────────
// Every league carries a permanent XP multiplier and a streak-freeze hold cap,
// and this component shows both — because a badge that is only a badge gets read
// once and never again, and a badge that says "+12% on everything you earn" gets
// read every time it is drawn. That is also what makes breaking a long streak
// cost something concrete rather than only feeling bad: the benefit stops
// applying, nothing is confiscated, and it comes straight back when the streak
// does.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, TrendingUp, ChevronRight } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, lbl } from '../../lib/theme';
import { STREAK_LEAGUES, leagueProgress, leagueFor } from '../../lib/streak';
import { questIcon } from '../quests/questIcons';

/**
 * The compact badge — a pill with the league's name and colour.
 * Drawn next to the flame anywhere the streak appears.
 */
export function LeagueChip({ streak = 0, showBonus = true, size = 'md' }) {
  const league = leagueFor(streak);
  const Icon = questIcon(league.icon);
  const small = size === 'sm';
  return (
    <span style={{
      ...pill(tint(league.color, 0.15), league.color, {
        fontSize: small ? 9.5 : 10.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))',
        border: `1px solid ${tint(league.color, 0.3)}`,
        padding: small ? '2px 8px' : '3px 10px',
      }),
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <Icon size={small ? 9 : 11} />
      {league.label}
      {showBonus && league.xpBonus > 0 && (
        <span style={{ color: C.t2, fontWeight: 700 }}>+{Math.round(league.xpBonus * 100)}%</span>
      )}
    </span>
  );
}

/**
 * The full card — where you are, what it is paying you, and what the next rung
 * is worth. Lives on the Streak tab under the hero.
 */
export default function StreakLeagueCard({ streak = 0, freezesHeld = 0, m = false }) {
  const prog = leagueProgress(streak);
  const league = prog.current;
  const Icon = questIcon(league.icon);
  const next = prog.next;

  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${tint(league.color, 0.3)}`,
      background: `linear-gradient(150deg, ${tint(league.color, 0.1)}, transparent 70%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -55, top: -55, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${tint(league.color, 0.2)}, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', ...R({ gap: 12, flexWrap: 'wrap' }) }}>
        <div style={{
          width: m ? 46 : 54, height: m ? 46 : 54, borderRadius: 16, flexShrink: 0,
          background: `radial-gradient(circle at 50% 60%, ${tint(league.color, 0.3)}, ${tint(league.color, 0.08)})`,
          border: `1.5px solid ${tint(league.color, 0.45)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 26px ${tint(league.color, 0.35)}`,
        }}><Icon size={m ? 21 : 25} color={league.color} /></div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ ...lbl({ marginBottom: 4, color: league.color }) }}>League</div>
          <div style={{ fontSize: m ? 18 : 21, fontWeight: 900, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', lineHeight: 1.1 }}>
            {league.label}
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>{league.blurb}</div>
        </div>
      </div>

      {/* The two benefits, stated as benefits rather than as stats. */}
      <div style={{ position: 'relative', ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
        <span style={{ ...pill(tint(C.amber, 0.13), C.amberL, { fontSize: 11, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={11} />
          {league.xpBonus > 0 ? `+${Math.round(league.xpBonus * 100)}% on all XP` : 'No XP bonus yet'}
        </span>
        <span style={{ ...pill(C.blueDim, C.blueL, { fontSize: 11, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Snowflake size={11} />
          Hold {freezesHeld}/{league.freezeCap} freeze{league.freezeCap === 1 ? '' : 's'}
        </span>
      </div>

      {/* Progress to the next league. */}
      {next ? (
        <div style={{ position: 'relative', marginTop: 16 }}>
          <div style={{ ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }), marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.t3 }}>
              {prog.remaining} more day{prog.remaining === 1 ? '' : 's'} to <b style={{ color: next.color }}>{next.label}</b>
            </span>
            <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
              +{Math.round(next.xpBonus * 100)}% · {next.freezeCap} freezes
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b0}` }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${prog.pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${league.color}, ${next.color})`, boxShadow: `0 0 12px ${tint(league.color, 0.5)}` }}
            />
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', marginTop: 12, fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
          Top of the ladder. There is nothing above Eternal, and there does not need to be.
        </div>
      )}
    </div>
  );
}

/**
 * The whole ladder, for the Streak tab's reference section. Shows what every
 * league is worth so the current one has a context to sit in — a benefit with
 * nothing above it does not read as progress.
 */
export function LeagueLadder({ streak = 0, m = false }) {
  const current = leagueFor(streak);
  return (
    <div style={CC({ gap: 8 })}>
      {STREAK_LEAGUES.map((l) => {
        const Icon = questIcon(l.icon);
        const reached = streak >= l.min;
        const isCurrent = l.id === current.id;
        return (
          <div key={l.id} style={{
            ...glass2({ padding: m ? 10 : 12 }),
            ...R({ gap: 12 }),
            border: `1px solid ${isCurrent ? tint(l.color, 0.4) : C.b1}`,
            background: isCurrent ? tint(l.color, 0.08) : C.surf2,
            opacity: reached ? 1 : 0.66,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: tint(l.color, reached ? 0.15 : 0.07),
              border: `1px solid ${tint(l.color, reached ? 0.3 : 0.14)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon size={14} color={reached ? l.color : C.t4} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: reached ? C.t1 : C.t3, fontFamily: C.FD }}>{l.label}</span>
                <span style={{ fontSize: 10, color: C.t4, fontFamily: C.FM }}>{l.min}+ days</span>
                {isCurrent && <span style={pill(tint(l.color, 0.16), l.color, { fontSize: 9, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' })}>You</span>}
              </div>
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                {l.xpBonus > 0 ? `+${Math.round(l.xpBonus * 100)}% XP` : 'No bonus'} · {l.freezeCap} freeze{l.freezeCap === 1 ? '' : 's'} held
              </div>
            </div>
            {reached && <ChevronRight size={13} color={tint(l.color, 0.8)} style={{ flexShrink: 0, opacity: 0.5 }} />}
          </div>
        );
      })}
    </div>
  );
}
