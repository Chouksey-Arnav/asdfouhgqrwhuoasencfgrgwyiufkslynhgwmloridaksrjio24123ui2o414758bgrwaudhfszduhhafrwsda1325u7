import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Target, CalendarDays, Flag, Timer, ChevronRight, RotateCcw, Loader2, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';

// ─────────────────────────────────────────────────────────────────────────────
// The generated study plan, rendered.
//
// Every focus area is a button, not a paragraph: the plan says "drill
// Boundaries" and the row takes them there. A plan you have to translate into
// clicks yourself is a plan most students will read once and never act on.
//
// The provenance line at the bottom is not decoration either. This screen is
// the one place in the SAT tab where a model wrote the advice rather than
// deriving it, and the tab's whole credibility rests on never blurring the line
// between measured and generated.
// ─────────────────────────────────────────────────────────────────────────────

export default function SatStudyPlanCard({
  plan, loading = false, error = null, accent = C.sky, isMobile = false,
  onNavigate, onRegenerate, generatedFromLabel = null,
}) {
  if (loading) {
    return (
      <div style={{
        ...glass({ padding: isMobile ? 18 : 24 }),
        border: `1px solid ${tint(accent, 0.28)}`,
        background: `linear-gradient(120deg,${tint(accent, 0.1)},rgba(255,255,255,0.02))`,
      }}>
        <div style={R({ gap: 10 })}>
          <Loader2 size={16} color={accent} className="spin" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
              Building your plan
            </div>
            <div style={{ fontSize: 11.5, color: C.t2, marginTop: 3, lineHeight: 1.6 }}>
              Reading your skill mastery, your review log and your pacing. This one runs on the deepest
              model, so give it a few seconds.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div style={{ ...glass2({ padding: 16 }), borderColor: tint(C.amber, 0.25) }}>
        <div style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>Could not build your plan just now</div>
        <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.6 }}>
          {error} Your ranked priorities below are computed from your own answers and do not need the AI —
          they are still the right place to start.
        </div>
        {onRegenerate && (
          <button onClick={onRegenerate} style={{ ...btnG({ padding: '7px 13px', fontSize: 11.5 }), marginTop: 12 }}>
            <RotateCcw size={12} /> Try again
          </button>
        )}
      </div>
    );
  }

  if (!plan) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...glass({ padding: isMobile ? 18 : 26 }),
        border: `1px solid ${tint(accent, 0.3)}`,
        background: `linear-gradient(125deg,${tint(accent, 0.12)},rgba(255,255,255,0.02) 60%)`,
      }}
    >
      {/* ── Headline ── */}
      <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginBottom: 12 }}>
        <span style={pill(tint(accent, 0.16), accent, {
          fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
          gap: 5, border: `1px solid ${tint(accent, 0.3)}`,
        })}>
          <Sparkles size={10} /> Your plan
        </span>
        {generatedFromLabel && (
          <span style={{ fontSize: 10.5, color: C.t4 }}>{generatedFromLabel}</span>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate} title="Rebuild this plan from your latest data"
            style={{ ...btnG({ padding: '5px 11px', fontSize: 11, marginLeft: 'auto' }) }}
          >
            <RotateCcw size={11} /> Rebuild
          </button>
        )}
      </div>

      <h3 style={{
        fontSize: isMobile ? 17 : 21, fontWeight: 800, color: C.t1, fontFamily: C.FD,
        letterSpacing: '-.025em', margin: 0, lineHeight: 1.3,
      }}>
        {plan.headline}
      </h3>
      <p style={{ fontSize: isMobile ? 12.5 : 13, color: C.t2, lineHeight: 1.75, marginTop: 10, marginBottom: 0, maxWidth: 720 }}>
        {plan.diagnosis}
      </p>

      {/* ── Focus areas ── */}
      <div style={{ marginTop: 22 }}>
        <SectionTitle icon={Target} color={C.rose}>What to work on, in order</SectionTitle>
        <div style={CC({ gap: 10 })}>
          {plan.focus.map((f, i) => (
            <motion.button
              key={f.skill}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25 }}
              whileHover={{ x: isMobile ? 0 : 3 }}
              onClick={() => onNavigate?.(f.panel, f.panel === 'practice' ? { skill: f.skill } : null)}
              style={{
                ...glass2({ padding: isMobile ? 13 : 15 }),
                textAlign: 'left', cursor: 'pointer', fontFamily: C.FB, width: '100%',
                borderColor: tint(f.color, 0.24),
                background: `linear-gradient(120deg,${tint(f.color, 0.07)},rgba(255,255,255,0.015))`,
              }}
            >
              <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginBottom: 7 }}>
                <span style={{
                  width: 21, height: 21, borderRadius: 6, flexShrink: 0,
                  background: tint(f.color, 0.2), color: f.color, fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.FM,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.title}</span>
                <span style={pill(tint(f.color, 0.13), f.color, { fontSize: 9.5 })}>{f.sectionLabel}</span>
                {f.questions && (
                  <span style={{ fontSize: 10, color: C.t4, fontFamily: C.FM, marginLeft: 'auto' }}>
                    ~{f.questions} q/week
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{f.why}</div>
              <div style={{ ...R({ gap: 6, alignItems: 'flex-start' }), marginTop: 8 }}>
                <ChevronRight size={12} color={f.color} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: C.t1, lineHeight: 1.6, fontWeight: 600 }}>{f.work}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Weekly rhythm ── */}
      {plan.weekly.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle icon={CalendarDays} color={C.cyan}>A typical week</SectionTitle>
          <div style={CC({ gap: 8 })}>
            {plan.weekly.map((w, i) => (
              <div key={i} style={{ ...R({ gap: 11, alignItems: 'flex-start' }), ...glass2({ padding: '11px 14px' }) }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%', background: C.cyan,
                  marginTop: 7, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{w.label}</div>
                  <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 2 }}>{w.detail}</div>
                </div>
                {w.minutes && (
                  <span style={pill(tint(C.cyan, 0.12), C.cyanL, { fontSize: 10, gap: 4, flexShrink: 0 })}>
                    <Timer size={9} /> {w.minutes}m
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pacing ── */}
      {plan.pacing && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle icon={Timer} color={C.amber}>Pacing on test day</SectionTitle>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.75, maxWidth: 720 }}>{plan.pacing}</div>
        </div>
      )}

      {/* ── Milestones ── */}
      {plan.milestones.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle icon={Flag} color={C.green}>You will know it is working when</SectionTitle>
          <div style={CC({ gap: 7 })}>
            {plan.milestones.map((m, i) => (
              <div key={i} style={R({ gap: 9, alignItems: 'flex-start' })}>
                <div style={{
                  width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  border: `1px solid ${tint(C.green, 0.4)}`, background: tint(C.green, 0.09),
                }} />
                <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Provenance ── */}
      <div style={{
        ...R({ gap: 7, alignItems: 'flex-start' }),
        marginTop: 22, paddingTop: 14, borderTop: `1px solid ${C.b1}`,
      }}>
        <Info size={12} color={C.t4} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>
          Written by Medabrain from your measured data — your skill mastery, your triaged misses and your
          pacing. The priorities are a hypothesis your next two weeks of practice will confirm or overturn,
          not a prediction.{plan.assumption ? ` ${plan.assumption}` : ''} Rebuild it whenever your picture changes.
        </span>
      </div>
    </motion.div>
  );
}
