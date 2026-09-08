// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE APP DECIDED.
//
// One card, one decision, and — the part that makes it worth having — the
// evidence it was made from, printed underneath. The ranking lives in
// src/lib/decisionEngine.js and is asserted by scripts/verifyDecisions.mjs;
// this file is the rendering.
//
// ── Why this is separate from "Do these next" ────────────────────────────────
// NextThreeCard answers "what are the three best uses of the next twenty
// minutes", which is a list. This answers "what does the app think is going on
// with you right now", which is a judgment — and the two want opposite
// treatments. A judgment shown as the fourth row of a list is not read as a
// judgment; it is read as a fourth row.
//
// ── The rule this card is really enforcing ───────────────────────────────────
// Every decision shows its reason and its rule id. Not because a student wants
// to read `rule:streak-at-risk` — they do not — but because a product that
// cannot show its reasoning is a product nobody can correct. The reason line is
// student-facing; the rule id is behind the "why am I seeing this" affordance,
// which is also where support and the developers look when a recommendation is
// wrong.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { ArrowRight, Brain, Info } from 'lucide-react';
import { C, glass, CC, R, pill, tint } from '../../lib/theme';

const KIND_COLOR = {
  protect: C.amber,
  fix: C.rose,
  do: C.blue,
  unlock: C.violet,
  celebrate: C.green,
};

export default function DecisionCard({ decision, onGo, m = false }) {
  const [showWhy, setShowWhy] = useState(false);
  if (!decision) return null;
  const color = KIND_COLOR[decision.kind] || C.blue;

  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${color}33`,
      background: `linear-gradient(135deg, ${tint(color, 0.10)}, transparent 62%)`,
    }}>
      <div style={{ ...R({ gap: 8, justifyContent: 'space-between' }), marginBottom: 8 }}>
        <div style={R({ gap: 8 })}>
          <Brain size={14} color={color} />
          <span style={pill(tint(color, 0.16), color)}>{decision.kindLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-label="Why am I seeing this?"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t4, padding: 8, lineHeight: 0 }}
        >
          <Info size={13} />
        </button>
      </div>

      <div style={{
        fontSize: m ? 16 : 18, fontWeight: 750, color: C.t1, fontFamily: C.FD,
        letterSpacing: 'calc(-0.25px + var(--msp-letter-spacing))', lineHeight: 1.3, marginBottom: 8,
      }}>
        {decision.headline}
      </div>
      <p style={{ fontSize: 12.5, color: C.t2, margin: 0, lineHeight: 1.55 }}>
        {decision.because}
      </p>

      {showWhy && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: C.s2, border: `1px solid ${C.b1}`,
          fontSize: 11.5, color: C.t3, lineHeight: 1.5,
        }}>
          This came from one of the app's own rules — <code style={{ color: C.t2 }}>{decision.source}</code> — read
          off your actual numbers on this device. No model was asked, and nothing left your browser to produce it.
        </div>
      )}

      {decision.action?.label && decision.action?.destination && (
        <div style={CC({ marginTop: 16 })}>
          <button
            type="button"
            onClick={() => onGo?.(decision)}
            style={{
              ...R({ gap: 8 }), cursor: 'pointer', alignSelf: 'flex-start',
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${color}55`,
              background: tint(color, 0.14), color,
              fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {decision.action.label}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
