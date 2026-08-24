import React, { useEffect, useRef } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { C, glass, pill, tint } from '../../lib/theme';

// The seal over the SAT pillar for version one.
//
// Deliberately NOT an empty "coming soon" screen. The real panels render
// underneath at full fidelity — the sub-nav, the overview cards, the skill
// heat map — so a student can see that a whole product is sitting there,
// finished, waiting. What they cannot do is touch any of it.
//
// "Covered" here means covered in every sense, not just visually:
//
//   • blur + desaturate + dim, so no individual number, question or answer
//     under the seal is legible. Anything readable through a beta cover is a
//     score estimate we would be publishing without meaning to.
//   • pointer-events:none and user-select:none on the covered subtree, so
//     nothing under it can be clicked, dragged or copied.
//   • `inert` on the covered subtree, so Tab cannot walk into it and a screen
//     reader cannot read it out — the two routes around a purely visual cover.
//     Set imperatively because React 18 does not forward the attribute.
//   • aria-hidden, so assistive tech is told the same story the eye is.
//
// The blur also creates a containing block for position:fixed descendants,
// which is what keeps the SAT tool rail (SatToolsContext.jsx) sealed under the
// cover instead of floating over it.

/** Wraps the whole SAT pillar: children render, blurred and inert, behind the seal. */
export default function SatBetaCover({ children, isMobile = false }) {
  const sealedRef = useRef(null);

  // React 18 drops unknown attributes like `inert`, so it goes on directly.
  useEffect(() => {
    const node = sealedRef.current;
    if (!node) return;
    node.setAttribute('inert', '');
    return () => node.removeAttribute('inert');
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: isMobile ? 520 : 640 }}>
      <div
        ref={sealedRef}
        aria-hidden="true"
        style={{
          filter: 'blur(9px) saturate(0.45)',
          opacity: 0.4,
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          // The blur samples past the element's own box; clipping stops the
          // smear from bleeding over the app chrome around the tab.
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '32px 16px' : 40,
          // Sits on top of the blurred pillar and takes every event that would
          // otherwise reach it.
          background: `linear-gradient(180deg, ${C.bg}55, ${C.bg}cc)`,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          borderRadius: 16,
        }}
      >
        <div
          role="status"
          style={{
            ...glass({ padding: isMobile ? '24px 20px' : '32px 36px' }),
            maxWidth: 460,
            textAlign: 'center',
            border: `1px solid ${tint(C.sky, 0.26)}`,
            background: `linear-gradient(150deg, ${C.sky}14, ${C.surf})`,
          }}
        >
          <div
            style={{
              width: 46, height: 46, borderRadius: 12, margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tint(C.sky, 0.14), border: `1px solid ${tint(C.sky, 0.3)}`,
            }}
          >
            <Lock size={20} color={C.sky} />
          </div>

          <span style={pill(tint(C.sky, 0.16), C.sky, { fontSize: 10, letterSpacing: 0.6 })}>
            <Sparkles size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            BETA — Not yet available
          </span>

          <h2 style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: C.t1, margin: '12px 0px 8px', fontFamily: C.FD }}>
            SAT prep is still in the workshop
          </h2>

          <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.55, margin: 0 }}>
            The full SAT center — baseline, diagnostic, adaptive practice, full-length
            tests, the review log and skill mastery — is built and sitting right behind
            this screen. It is closed for version one while we finish checking the
            question bank and the score scales.
          </p>

          <p style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, margin: '12px 0px 0px' }}>
            Nothing here counts toward your XP, streak, quests or study plan yet.
            Everything else in the app works as normal.
          </p>
        </div>
      </div>
    </div>
  );
}
