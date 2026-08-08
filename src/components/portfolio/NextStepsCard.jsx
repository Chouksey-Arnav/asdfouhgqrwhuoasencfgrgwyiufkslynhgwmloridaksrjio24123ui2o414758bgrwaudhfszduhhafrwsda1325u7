import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Target, Award, Stethoscope, Trophy, GraduationCap, ScrollText,
  UserCheck, ArrowRight, CheckCircle2, Compass, Lightbulb,
} from 'lucide-react';
import { C, glass, R, CC, tint, accentText, btnSm } from '../../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// "Start here" — the first thing on the Portfolio Overview.
//
// Everything else on that page reports. This one card decides. It takes the
// deterministic list from src/lib/portfolioNextSteps.js and renders it as at
// most three numbered actions, each a real button that lands on the exact
// surface where the action happens.
//
// The insight callouts the Overview already computed are folded in underneath
// rather than living in their own separate stack — a student should have ONE
// place that tells them what to do, not two that each tell them a bit of it.
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  alert: AlertTriangle, target: Target, award: Award, stethoscope: Stethoscope,
  trophy: Trophy, school: GraduationCap, essay: ScrollText, userCheck: UserCheck,
};

export default function NextStepsCard({
  steps = [], insights = [], onOpen, onOpenPrep, onScrollTo, isMobile = false, firstName = null,
}) {
  const hasSteps = steps.length > 0;
  const shownInsights = insights.slice(0, hasSteps ? 1 : 2);

  return (
    <div style={{
      ...glass({ padding: isMobile ? 15 : 20 }),
      background: `linear-gradient(125deg,${tint(C.blue, 0.11)},${tint(C.green, 0.05)} 58%,rgba(255,255,255,0.02))`,
      border: `1px solid ${tint(C.blue, 0.26)}`,
    }}>
      <div style={R({ gap: 11, marginBottom: hasSteps || shownInsights.length ? 14 : 0, flexWrap: 'wrap' })}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg,${C.blue},${C.green})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {hasSteps ? <Compass size={16} color="#fff" /> : <CheckCircle2 size={16} color="#fff" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: accentText(C.blue) }}>
            Start here
          </div>
          <div style={{ fontSize: isMobile ? 14.5 : 16, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginTop: 3, letterSpacing: '-.02em' }}>
            {hasSteps
              ? (firstName ? `${firstName}, here’s what to do next` : 'Here’s what to do next')
              : 'You’re up to date — nothing is waiting on you'}
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 3, lineHeight: 1.55, maxWidth: 600 }}>
            {hasSteps
              ? 'Pick the top one. Everything further down this page is just detail on how it’s going — you don’t have to read it.'
              : 'Keep the week’s goals below moving, or go find your next program under Opportunities.'}
          </div>
        </div>
      </div>

      {hasSteps && (
        <div style={CC({ gap: 8 })}>
          {steps.map((s, i) => {
            const col = C[s.colorKey] || C.blue;
            const Icon = ICONS[s.iconKey] || Target;
            return (
              <motion.button
                key={s.id} whileTap={{ scale: 0.995 }} type="button"
                onClick={() => (s.scrollTo ? onScrollTo?.(s.scrollTo) : onOpen?.(s.view))}
                style={{
                  boxSizing: 'border-box', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: isMobile ? 12 : '13px 15px', borderRadius: 12,
                  background: C.surf2, border: `1px solid ${C.b1}`, borderLeft: `3px solid ${col}`,
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
                  background: tint(col, 0.15), border: `1px solid ${tint(col, 0.26)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={accentText(col)} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={R({ gap: 7, flexWrap: 'wrap' })}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{s.label}</span>
                    {i === 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                        color: accentText(s.urgent ? C.rose : col), padding: '2px 7px', borderRadius: 999,
                        background: tint(s.urgent ? C.rose : col, 0.14),
                      }}>{s.urgent ? 'Do this first' : 'Start with this'}</span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 3, lineHeight: 1.55 }}>{s.why}</span>
                </span>
                <span style={{ ...R({ gap: 5, flexShrink: 0, fontSize: 11, fontWeight: 700, color: accentText(col) }), marginTop: 3 }}>
                  {!isMobile && s.ctaLabel}<ArrowRight size={12} />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {shownInsights.length > 0 && (
        <div style={{ ...CC({ gap: 7 }), marginTop: hasSteps ? 12 : 0, paddingTop: hasSteps ? 12 : 0, borderTop: hasSteps ? `1px solid ${C.b1}` : 'none' }}>
          {shownInsights.map((ins, i) => {
            const sevColor = { high: C.rose, medium: C.amber, low: C.t3, positive: C.green }[ins.severity] || C.t3;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lightbulb size={13} color={sevColor} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{ins.text}</span>
                {ins.ctaLabel && (
                  <button type="button"
                    onClick={() => (ins.ctaTab === 'prep' ? onOpenPrep?.(ins.ctaView) : onOpen?.(ins.ctaView))}
                    style={{ ...btnSm(tint(sevColor, 0.14), { color: accentText(sevColor), border: `1px solid ${tint(sevColor, 0.26)}`, fontSize: 10.5, flexShrink: 0 }) }}>
                    {ins.ctaLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
