// ─────────────────────────────────────────────────────────────────────────────
// The in-pathway encouragement strip.
//
// The gap this closes: a student working through a pathway sees their streak on
// Home, sees it again on the completion overlay, and sees nothing at all in
// between — which is precisely the stretch where they decide whether to open one
// more lesson or close the tab. Discipline is built in that stretch, not in the
// celebration afterwards.
//
// It is a single line, always forward-facing, and it changes with state rather
// than at random (see pathwayEncouragement in lib/streak.js): unfinished day →
// what would finish it; finished day → what is now within reach. It never
// congratulates a student for stopping.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Flame, Check, Trophy, ArrowRight } from 'lucide-react';
import { C, R, tint, pill } from '../../lib/theme';
import { pathwayEncouragement } from '../../lib/streak';

const TONES = {
  urgent: { color: C.orangeL, bg: C.orange, Icon: Flame },
  push: { color: C.amberL, bg: C.amber, Icon: Flame },
  reward: { color: C.greenL, bg: C.green, Icon: Trophy },
  calm: { color: C.t2, bg: C.blue, Icon: Check },
};

export default function PathwayStreakStrip({
  streak = 0,
  day = null,
  week = null,
  remainingLessons = 0,
  onOpen,
  m = false,
}) {
  if (!day) return null;
  const { tone, text } = pathwayEncouragement({ streak, day, week, remainingLessons });
  const { color, bg, Icon } = TONES[tone] || TONES.calm;

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', cursor: onOpen ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
        background: tint(bg, 0.08), border: `1px solid ${tint(bg, 0.26)}`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: tint(bg, 0.16), border: `1px solid ${tint(bg, 0.3)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon size={14} color={color} /></div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.t1, lineHeight: 1.45, fontWeight: 600 }}>{text}</div>
      {streak > 0 && (
        <span style={{ ...pill(tint(C.amber, 0.13), C.amberL, { fontSize: 10.5, flexShrink: 0 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Flame size={10} />{streak}
        </span>
      )}
      {onOpen && <ArrowRight size={13} color={C.t3} style={{ flexShrink: 0 }} />}
    </button>
  );
}
