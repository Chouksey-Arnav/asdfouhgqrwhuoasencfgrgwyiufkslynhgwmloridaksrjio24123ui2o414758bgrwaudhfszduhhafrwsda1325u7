// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score as a chip.
//
// The compact form for places that are already a row of status pills — the Home
// hero's identity row beside the streak and level, and the Portfolio overview's
// header. It carries the score, the band's color, and the week's movement, and
// nothing else: a chip that tried to also explain the benchmark would be a card.
//
// Renders NOTHING when there is no score. A chip reading "—" in a row of live
// numbers is worse than a shorter row, and the states that have no score (too
// little logged, a failed gate) each have a real surface of their own on Home
// that says why.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Activity } from 'lucide-react';
import { C, pill, tint } from '../../lib/theme';
import { bandColor } from './MedExRing';

export default function MedExChip({ state = null, onClick = null, showDelta = true }) {
  const headline = state?.medex?.headline;
  if (state?.loading || !headline?.showsScore) return null;

  const seal = state.seal;
  const score = seal?.sealedScore ?? headline.score;
  const delta = seal?.delta ?? null;
  const color = bandColor(headline.band);
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      onClick={onClick || undefined}
      type={onClick ? 'button' : undefined}
      title={`MedEx Score ${score} of 1000 — ${headline.band.label}, measured against ${headline.program.name}`}
      style={{
        ...pill(tint(color, 0.14), color, { gap: 4, fontFamily: C.FM }),
        border: `1px solid ${tint(color, 0.26)}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Activity size={11} />
      <span style={{ fontWeight: 800 }}>{score}</span>
      {showDelta && delta != null && delta !== 0 && (
        <span style={{ color: delta > 0 ? C.greenL : C.roseL, fontWeight: 700 }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </Tag>
  );
}
