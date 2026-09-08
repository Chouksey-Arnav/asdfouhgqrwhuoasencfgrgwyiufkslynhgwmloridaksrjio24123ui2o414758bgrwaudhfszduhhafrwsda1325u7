// ─────────────────────────────────────────────────────────────────────────────
// THE FIRST-WEEK HOME.
//
// What a brand-new account gets instead of the dashboard. The model — which
// questions, which steps, in which order for which grade, and when this screen
// retires forever — lives in src/lib/firstRun.js; this file is only the
// rendering, and the rendering has four rules of its own:
//
//   ONE THING IS BRIGHT. Exactly one row is the current step. It is the only
//   one with a button, the only one with color, and the only one carrying the
//   sentence that says why it is worth doing. The rest of the ladder is visible
//   (hiding it recreates the "where am I going" problem at a smaller scale) and
//   deliberately quiet.
//
//   THE QUESTIONS ARE NOT A WIZARD. Two questions, both on this card, no step
//   counter, no "next" button, no modal. Tapping an answer records it and the
//   card moves on. A student who ignores both still gets the ladder.
//
//   NOTHING HERE IS A BADGE. No XP, no confetti, no percentage. The reward for
//   finishing a step is that the next one appears and this screen eventually
//   goes away — which is the honest reward, since the product this is
//   introducing is the dashboard behind it.
//
//   LEAVING IS ALWAYS OFFERED. "Skip the setup" is a real button in the footer.
//   A student who wants the full app on day one is allowed to have it, and is
//   told exactly what they are choosing.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Circle, Sparkles } from 'lucide-react';
import { C, glass, glass2, CC, R, pill, tint, onTint } from '../../lib/theme';

export default function FirstRunGuide({
  plan, onAnswer, onGo, onDismiss, accent = C.blue, m = false, reducedMotion = false,
}) {
  if (!plan) return null;
  const question = plan.questions?.[0] || null;

  return (
    <div style={{
      ...glass({ padding: m ? 18 : 26 }),
      border: `1px solid ${accent}33`,
      background: `linear-gradient(135deg, ${accent}12, transparent 60%)`,
    }}>
      <div style={{ ...R({ gap: 8 }), marginBottom: 8 }}>
        <Sparkles size={15} color={accent} />
        <span style={pill(tint(accent, 0.14), accent)}>Getting started</span>
      </div>

      <h2 style={{
        fontSize: m ? 21 : 26, fontWeight: 800, color: C.t1, fontFamily: C.FD,
        letterSpacing: 'calc(-0.5px + var(--msp-letter-spacing))', margin: '0 0 8px', lineHeight: 1.15,
      }}>
        {plan.headline}
      </h2>
      <p style={{ fontSize: 13.5, color: C.t2, margin: '0 0 20px', lineHeight: 1.55, maxWidth: 560 }}>
        {plan.subline}
      </p>

      {/* ── The two questions ─────────────────────────────────────────────────
          One at a time, and the second only appears once the first is answered
          — not because a wizard is good, but because two stacked multiple
          choices on a first screen reads as a form, and a form is the thing
          this page exists to not be. */}
      {question ? (
        <div style={{ ...glass2({ padding: m ? 14 : 18 }), border: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: m ? 15 : 16.5, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
            {question.prompt}
          </div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 16, lineHeight: 1.5 }}>
            {question.effect}
          </div>
          <div style={CC({ gap: 8 })}>
            {question.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAnswer?.(question.id, opt.id)}
                style={{
                  ...R({ gap: 8, justifyContent: 'space-between' }),
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '12px 16px', borderRadius: 12,
                  background: C.s2, border: `1px solid ${C.b1}`,
                  color: C.t1, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                <span>{opt.label}</span>
                <ArrowRight size={14} color={C.t3} style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── The ladder ─────────────────────────────────────────────────── */}
          <div style={{ ...R({ gap: 8, justifyContent: 'space-between' }), marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, color: C.t3, fontWeight: 600 }}>
              {plan.completed} of {plan.total} done
            </span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: C.s2, overflow: 'hidden', maxWidth: 240 }}>
              <div style={{
                width: `${Math.round(plan.progress * 100)}%`, height: '100%',
                background: accent, borderRadius: 4,
                transition: reducedMotion ? 'none' : 'width .4s ease',
              }} />
            </div>
          </div>

          <div style={CC({ gap: 8 })}>
            {plan.steps.map((step) => {
              const isCurrent = plan.current?.id === step.id;
              const Row = reducedMotion ? 'div' : motion.div;
              const anim = reducedMotion ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };
              return (
                <Row
                  key={step.id}
                  {...anim}
                  style={{
                    padding: isCurrent ? (m ? 15 : 18) : '11px 14px',
                    borderRadius: 12,
                    background: isCurrent ? tint(accent, 0.09) : C.s1,
                    border: `1px solid ${isCurrent ? `${accent}44` : C.b1}`,
                    opacity: step.done ? 0.55 : 1,
                  }}
                >
                  <div style={R({ gap: 12, alignItems: 'flex-start' })}>
                    <div style={{ flexShrink: 0, marginTop: 0 }}>
                      {step.done
                        ? <Check size={16} color={C.green} />
                        : <Circle size={16} color={isCurrent ? accent : C.t4} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: isCurrent ? (m ? 15 : 16) : 13.5,
                        fontWeight: isCurrent ? 700 : 600,
                        color: step.done ? C.t3 : C.t1,
                        textDecoration: step.done ? 'line-through' : 'none',
                      }}>
                        {step.title}
                        {!step.required && !step.done && (
                          <span style={{ ...pill(C.s2, C.t3), marginLeft: 8, fontSize: 10 }}>optional</span>
                        )}
                      </div>
                      {/* Rule 1: the reason belongs to the current step and to
                          no other. On a finished step it is history; on a
                          future one it is a wall of text nobody reads. */}
                      {isCurrent && (
                        <>
                          <p style={{ fontSize: 12.5, color: C.t2, margin: '7px 0 13px', lineHeight: 1.55 }}>
                            {step.why}
                          </p>
                          <button
                            type="button"
                            onClick={() => onGo?.(step)}
                            style={{
                              ...R({ gap: 8 }), cursor: 'pointer',
                              padding: '8px 16px', borderRadius: 8, border: 'none',
                              background: accent, color: onTint(accent),
                              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                            }}
                          >
                            {step.action}
                            <ArrowRight size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Row>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onDismiss}
            style={{
              marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
              color: C.t3, fontSize: 12, fontFamily: 'inherit', padding: 0, textAlign: 'left',
            }}
          >
            Skip the setup and go straight to my dashboard
          </button>
        </>
      )}
    </div>
  );
}
