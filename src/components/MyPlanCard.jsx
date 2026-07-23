import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, Flag, Rocket, CalendarRange, TrendingUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { C, glass, glass2, pill, R } from '../lib/theme';

// Surfaces the personalized "max-out plan" built during onboarding (stored on
// user.generatedPlan) permanently inside the app, so a student can revisit the
// plan Medabrain wrote for them any time — not just once during signup. Starts
// collapsed to a colorful summary strip and expands to the full breakdown.
export default function MyPlanCard({ plan, accent = C.blue }) {
  const [open, setOpen] = useState(false);
  if (!plan || !plan.summary) return null;

  const stats = [
    { v: `${plan.dailyMinutes || 30}m`, l: 'daily', c: C.blue },
    { v: plan.weeklyQuestions || 60, l: 'Qs/week', c: C.green },
    { v: (plan.focusAreas?.length || 3), l: 'focus areas', c: C.violet },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...glass({ padding: 0, overflow: 'hidden' }),
        border: `1px solid ${C.violet}30`,
        background: `linear-gradient(135deg, ${C.blue}10, ${C.violet}0e 45%, ${C.pink}0a)`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: C.auroraGrad, opacity: 0.05, pointerEvents: 'none' }} className="msp-aurora" />

      {/* Header strip — always visible, click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 20, position: 'relative' }}
      >
        <div style={R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' })}>
          <div style={R({ gap: 13, alignItems: 'flex-start' })}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: C.auroraGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 20px ${C.violet}45` }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: C.violetL, marginBottom: 4 }}>
                {plan.source === 'ai' ? 'Made just for you · Medabrain' : 'Your personalized plan'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em', lineHeight: 1.2 }}>
                {plan.headline || 'Your personalized plan'}
              </div>
            </div>
          </div>
          <div style={R({ gap: 8 })}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.c, fontFamily: C.FD }}>{s.v}</div>
                <div style={{ fontSize: 8.5, color: C.t3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.l}</div>
              </div>
            ))}
            <motion.div animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', alignItems: 'center', color: C.t2 }}>
              <ChevronDown size={18} />
            </motion.div>
          </div>
        </div>
        {!open && (
          <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, margin: '12px 0 0', position: 'relative' }}>{plan.summary}</p>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', position: 'relative' }}
          >
            <div style={{ padding: '0 20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, color: C.t1, lineHeight: 1.7, margin: 0 }}>{plan.summary}</p>

              {plan.focusAreas?.length > 0 && (
                <Block icon={<Target size={13} color={C.blueL} />} title="What we're focusing on" color={C.blue}>
                  {plan.focusAreas.map((f, i) => (
                    <div key={i} style={{ ...glass2({ padding: '10px 13px' }), display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 7, borderLeft: `2px solid ${C.blue}` }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: `${C.blue}22`, color: C.blueL, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{f.title}</div>
                        {f.why && <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{f.why}</div>}
                      </div>
                    </div>
                  ))}
                </Block>
              )}

              {plan.milestones?.length > 0 && (
                <Block icon={<Flag size={13} color={C.violetL} />} title="Your milestones" color={C.violet}>
                  {plan.milestones.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.violet, boxShadow: `0 0 8px ${C.violet}` }} />
                        {i < plan.milestones.length - 1 && <span style={{ width: 2, flex: 1, background: `${C.violet}30`, marginTop: 2 }} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{m.title}</span>
                          {m.when && <span style={pill(`${C.violet}18`, C.violetL, { fontSize: 9.5 })}>{m.when}</span>}
                        </div>
                        {m.detail && <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{m.detail}</div>}
                      </div>
                    </div>
                  ))}
                </Block>
              )}

              {plan.weeklyRhythm?.length > 0 && (
                <Block icon={<CalendarRange size={13} color={C.cyanL || C.cyan} />} title="Your weekly rhythm" color={C.cyan}>
                  <div style={{ ...glass2({ padding: '10px 13px' }), borderLeft: `2px solid ${C.cyan}` }}>
                    {plan.weeklyRhythm.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.t2 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              {plan.firstWeek?.length > 0 && (
                <Block icon={<Rocket size={13} color={C.greenL} />} title="Start this week" color={C.green}>
                  <div style={{ ...glass2({ padding: '10px 13px' }), borderLeft: `2px solid ${C.green}` }}>
                    {plan.firstWeek.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '4px 0' }}>
                        <CheckCircle2 size={14} color={C.greenL} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.t2 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              {plan.ninetyDayGoal && (
                <div style={{ padding: '12px 14px', borderRadius: 11, background: `linear-gradient(135deg, ${C.amber}14, transparent)`, border: `1px solid ${C.amber}30`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <TrendingUp size={15} color={C.amberL} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.amberL, marginBottom: 3 }}>Where you could be in 90 days</div>
                    <p style={{ fontSize: 12, color: C.t1, lineHeight: 1.6, margin: 0 }}>{plan.ninetyDayGoal}</p>
                  </div>
                </div>
              )}

              {plan.encouragement && (
                <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65, margin: 0, fontStyle: 'italic', paddingLeft: 12, borderLeft: `2px solid ${C.green}40` }}>{plan.encouragement}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Block({ icon, title, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        {icon}
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
