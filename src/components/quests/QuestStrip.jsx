// ─────────────────────────────────────────────────────────────────────────────
// The quest strip — one line, everywhere.
//
// This is the component that makes quests part of the app rather than a tab in
// it. It sits at the top of Prep, Portfolio and Plans, and it shows the
// quest that is earned ON THAT SCREEN: a flashcard quest on the Flashcards tab
// is one tap from progress; the same quest on the Portfolio tab is an interruption.
// `surface` is what the engine biases on (featuredFor), and a claimable quest
// overrides the bias from anywhere, because claiming is one tap regardless.
//
// It is deliberately the same visual language as PathwayStreakStrip — a tinted
// line with an icon, a sentence and a chevron — because a student should read
// the two as the same kind of object: a live commitment with a deadline on it,
// not a banner.
//
// Renders nothing when there is no quest for this surface. A strip that appears
// on every screen with nothing useful on it is the thing people learn to skip.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { ChevronRight, Gift } from 'lucide-react';
import { C, R, pill, tint } from '../../lib/theme';
import { questHeadline, toneFor, featuredFor, getQuest, questColor } from '../../lib/quests';
import { questIcon } from './questIcons';

export default function QuestStrip({
  rows = [],
  surface = null,     // 'prep' | 'portfolio' | 'plans' | 'home'
  onOpen,             // → the board
  onClaim,
  busyId = null,
  m = false,
}) {
  const featured = featuredFor(rows, surface);
  if (!featured) return null;

  const { assignment, ev } = featured;
  const def = getQuest(assignment.questId);
  const color = questColor(def) || C.violet;
  const tone = toneFor(ev);
  const Icon = questIcon(def?.icon);

  // A finished quest turns the whole strip into the claim button. It is the one
  // state where the right next action is not "go and study".
  if (ev.done) {
    return (
      <button
        onClick={() => onClaim?.(assignment)}
        disabled={busyId === assignment.id}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
          background: tint(C.green, 0.1), border: `1px solid ${tint(C.green, 0.3)}`,
          opacity: busyId === assignment.id ? 0.6 : 1,
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: tint(C.green, 0.16), border: `1px solid ${tint(C.green, 0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Gift size={14} color={C.greenL} /></div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.t1, fontWeight: 700, lineHeight: 1.45 }}>
          {assignment.title} is finished — claim your {ev.xp} XP.
        </div>
        <ChevronRight size={13} color={C.greenL} style={{ flexShrink: 0 }} />
      </button>
    );
  }

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', cursor: onOpen ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
        background: tint(color, 0.08), border: `1px solid ${tint(color, 0.24)}`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: tint(color, 0.16), border: `1px solid ${tint(color, 0.3)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon size={14} color={color} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.t1, fontWeight: 700, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {assignment.title}
          {assignment.assignedBy === 'parent' && assignment.assignerName && (
            <span style={{ color: C.t3, fontWeight: 500 }}> · {assignment.assignerName} asked</span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: tone.color, marginTop: 4, lineHeight: 1.4 }}>{questHeadline(ev)}</div>
      </div>

      <span style={{ ...pill(tint(color, 0.13), color, { fontSize: 10, fontFamily: C.FM, fontWeight: 800, flexShrink: 0 }) }}>
        {ev.progress}/{ev.target}
      </span>
      {onOpen && <ChevronRight size={13} color={C.t3} style={{ flexShrink: 0 }} />}
    </button>
  );
}
