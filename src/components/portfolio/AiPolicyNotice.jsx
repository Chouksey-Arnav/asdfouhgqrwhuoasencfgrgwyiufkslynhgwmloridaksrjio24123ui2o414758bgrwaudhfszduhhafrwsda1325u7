import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, Check } from 'lucide-react';
import { C, glass, glass2, CC, R, pill, tint, btnSm, onTint } from '../../lib/theme';
import { AI_POLICY, HARD_RULES, hasAcknowledgedPolicy, acknowledgePolicy } from '../../lib/aiPolicy';

// ─────────────────────────────────────────────────────────────────────────────
// The AI policy, rendered where the writing happens.
//
// Two deliberate refusals in this component:
//
//   • It is NOT a Disclosure. Every other secondary thing in Portfolio sits
//     behind a door the student can close and never open again, which is right
//     for a filter panel and wrong for the one rule they can be penalized for
//     breaking. The three hard rules are always on screen in the essay
//     workspace; only the elaboration folds away.
//   • It is NOT a modal, and it does not block. A consent gate in front of a
//     draft teaches students to click past rules, which is precisely the habit
//     that gets them in trouble later. It states the rule and gets out of the
//     way.
//
// The acknowledgement is a display detail, not a permission: an unacknowledged
// policy opens expanded once, an acknowledged one opens collapsed. Nothing in
// the workspace is gated on it, because the policy binds whether or not the
// student taps a button, and pretending otherwise would be theater.
// ─────────────────────────────────────────────────────────────────────────────

export default function AiPolicyNotice({ compact = false, isMobile = false }) {
  const [acked, setAcked] = useState(() => hasAcknowledgedPolicy());
  const [open, setOpen] = useState(() => !hasAcknowledgedPolicy());

  if (compact) {
    return (
      <div style={{ ...glass2({ padding: '8px 12px' }), display: 'flex', gap: 8, alignItems: 'flex-start', border: `1px solid ${tint(C.teal, 0.22)}` }}>
        <ShieldCheck size={12} color={C.tealL || C.teal} style={{ marginTop: 4, flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>{AI_POLICY.short}</div>
      </div>
    );
  }

  return (
    <div style={{
      ...glass({ padding: isMobile ? 14 : 17 }),
      background: `linear-gradient(120deg,${tint(C.teal, 0.08)},rgba(255,255,255,0.02) 55%)`,
      border: `1px solid ${tint(C.teal, 0.28)}`,
    }}>
      <div style={R({ gap: 8, alignItems: 'flex-start' })}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: tint(C.teal, 0.14), border: `1px solid ${tint(C.teal, 0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={15} color={C.teal} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{AI_POLICY.headline}</span>
            {acked && <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 9 })}>read</span>}
          </div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{AI_POLICY.short}</div>
        </div>
      </div>

      {/* The three hard rules — always visible, never behind the door. */}
      <div style={{ ...CC({ gap: 8 }), marginTop: 12 }}>
        {HARD_RULES.map(rule => (
          <div key={rule.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: C.teal,
              marginTop: 8, flexShrink: 0,
            }} />
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
              <b style={{ color: C.t1 }}>{rule.title}.</b>{' '}
              {open ? rule.body : rule.body.split('. ')[0] + '.'}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div style={{ ...CC({ gap: 8 }), marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
          {AI_POLICY.rules.filter(r => r.tone === 'soft').map(rule => (
            <div key={rule.id} style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
              <b style={{ color: C.t2 }}>{rule.title}.</b> {rule.body}
            </div>
          ))}
        </div>
      )}

      <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
        <button onClick={() => setOpen(o => !o)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 11.5, color: C.t3,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {open ? 'Show less' : 'Read the whole policy'}
          <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        <span style={{ flex: 1 }} />
        {!acked && (
          <button onClick={() => { acknowledgePolicy(); setAcked(true); setOpen(false); }}
            style={btnSm(tint(C.teal, 0.18), { color: onTint(C.teal), fontSize: 11.5 })}>
            <Check size={12} />Got it
          </button>
        )}
      </div>
    </div>
  );
}
