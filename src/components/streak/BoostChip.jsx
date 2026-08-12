// ─────────────────────────────────────────────────────────────────────────────
// The live-boost indicator.
//
// A boost is a short, time-limited XP multiplier granted by the check-in
// calendar's milestone days. Its entire value is that it makes a SPECIFIC
// afternoon the right afternoon to study — which only works if the student can
// see it running and see it ending. A multiplier applied silently to a number
// they were going to earn anyway changes nothing.
//
// So the chip is small, it counts down, it sits in the app header where it is
// always visible, and it never appears when there is nothing running.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { C, pill, R, tint, glass2, CC } from '../../lib/theme';
import { activeBoosts, boostCountdown } from '../../lib/streak';
import { questIcon } from '../quests/questIcons';

/**
 * Re-render on a minute tick so the countdown is honest.
 *
 * A minute is the right resolution: a per-second countdown on a six-hour window
 * is a distraction machine in the corner of a study app, and a static label goes
 * stale within the first session.
 */
function useMinuteTick(enabled) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => force((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [enabled]);
}

/** The header chip — the soonest-to-expire boost, with its countdown. */
export default function BoostChip({ boosts = [], onClick, m = false }) {
  const live = activeBoosts(boosts);
  useMinuteTick(live.length > 0);
  if (!live.length) return null;

  const top = live[0];
  const Icon = questIcon(top.def.icon);
  const extra = live.length - 1;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      title={`${top.def.label} — ${top.def.blurb}`}
      aria-label={`${top.def.label} active, ${boostCountdown(top.msLeft)}`}
      style={{
        ...pill(tint(top.def.color, 0.16), top.def.color, {
          fontSize: m ? 10 : 10.5, fontWeight: 800, letterSpacing: '.03em',
          border: `1px solid ${tint(top.def.color, 0.34)}`,
          padding: m ? '3px 9px' : '4px 11px',
          cursor: onClick ? 'pointer' : 'default',
        }),
        display: 'inline-flex', alignItems: 'center', gap: 5,
        boxShadow: `0 0 14px ${tint(top.def.color, 0.3)}`,
      }}
    >
      <Icon size={m ? 10 : 11} />
      ×{top.def.multiplier}
      <span style={{ color: C.t2, fontWeight: 600, fontFamily: C.FM }}>{boostCountdown(top.msLeft)}</span>
      {extra > 0 && <span style={{ color: C.t3, fontWeight: 700 }}>+{extra}</span>}
    </motion.button>
  );
}

/**
 * The full list, for the Streak tab. Explains what each running boost does and
 * what it is stacking with, because a student looking at "×3" wants to know
 * where it came from before they trust it.
 */
export function BoostList({ boosts = [], streakBonusLabel = null, m = false }) {
  const live = activeBoosts(boosts);
  useMinuteTick(live.length > 0);
  if (!live.length) return null;

  return (
    <div style={CC({ gap: 8 })}>
      {live.map((b) => {
        const Icon = questIcon(b.def.icon);
        return (
          <div key={b.id ?? b.startedAt} style={{
            ...glass2({ padding: m ? 11 : 13 }), ...R({ gap: 11 }),
            border: `1px solid ${tint(b.def.color, 0.3)}`,
            background: tint(b.def.color, 0.07),
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: tint(b.def.color, 0.16), border: `1px solid ${tint(b.def.color, 0.32)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon size={15} color={b.def.color} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={R({ gap: 7, flexWrap: 'wrap' })}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{b.def.label}</span>
                <span style={pill(tint(b.def.color, 0.15), b.def.color, { fontSize: 9.5, fontWeight: 800, fontFamily: C.FM })}>×{b.def.multiplier}</span>
              </div>
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2, lineHeight: 1.45 }}>
                {b.def.blurb}
                {streakBonusLabel && <span style={{ color: C.t4 }}> Stacks with your league&rsquo;s {streakBonusLabel}.</span>}
              </div>
            </div>
            <span style={{ fontSize: 10.5, color: b.def.color, fontFamily: C.FM, fontWeight: 700, flexShrink: 0 }}>
              {boostCountdown(b.msLeft)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
