import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpenCheck, Target, Sparkles, Flag, CheckCircle2, Rocket } from 'lucide-react';
import { StepHeader, ContinueButton, RadialRing, C, glass } from '../primitives';
import { heuristicPlan } from '../../../lib/planGenerator';

// Renders the personalized plan built during GeneratingStep (purpose:'plan'). Falls back to a
// locally-derived plan if generation somehow didn't attach one, so this screen always has content.
export function PlanSummaryStep({ profile, plan, onNext }) {
  const p = plan && plan.summary ? plan : heuristicPlan(profile || {});
  const dailyMins = p.dailyMinutes;
  const weeklyQs = p.weeklyQuestions;

  return (
    <>
      <StepHeader eyebrow={p.source === 'ai' ? 'Made just for you' : 'Your plan'} title={p.headline || 'Your personalized plan'} subtitle="You can adjust any of this later in Settings." />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 4 }}>
        {/* Warm summary */}
        {p.summary && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...glass({ padding: 16 }), backdropFilter: 'none', marginBottom: 18, borderColor: `${C.blue}30`, background: `linear-gradient(135deg, ${C.blue}12, ${C.violet}10)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <Sparkles size={14} color={C.blueL} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueL }}>Medabrain</span>
            </div>
            <p style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.7, margin: 0 }}>{p.summary}</p>
          </motion.div>
        )}

        {/* Headline stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
          <RadialRing pct={0.7} color={C.blue} size={82}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{dailyMins}m</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>daily</div>
            </div>
          </RadialRing>
          <RadialRing pct={0.55} color={C.green} size={82}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{weeklyQs}</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>Qs/week</div>
            </div>
          </RadialRing>
          <RadialRing pct={0.85} color={C.violet} size={82}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{profile.targetScore}</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>target</div>
            </div>
          </RadialRing>
        </div>

        {/* Focus areas */}
        {p.focusAreas?.length > 0 && (
          <Section icon={<Target size={13} color={C.blueL} />} title="What we'll focus on">
            {p.focusAreas.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                style={{ ...glass({ padding: '11px 14px' }), backdropFilter: 'none', display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: `${C.blue}22`, color: C.blueL, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: C.FD }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{f.title}</div>
                  {f.why && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{f.why}</div>}
                </div>
              </motion.div>
            ))}
          </Section>
        )}

        {/* Milestones */}
        {p.milestones?.length > 0 && (
          <Section icon={<Flag size={13} color={C.violetL} />} title="Your milestones">
            {p.milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, marginBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.violet, boxShadow: `0 0 8px ${C.violet}` }} />
                  {i < p.milestones.length - 1 && <span style={{ width: 2, flex: 1, background: `${C.violet}30`, marginTop: 2 }} />}
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{m.title}</span>
                    {m.when && <span style={{ fontSize: 10, fontWeight: 700, color: C.violetL, background: `${C.violet}18`, padding: '1px 8px', borderRadius: 20 }}>{m.when}</span>}
                  </div>
                  {m.detail && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 2 }}>{m.detail}</div>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* First week */}
        {p.firstWeek?.length > 0 && (
          <Section icon={<Rocket size={13} color={C.greenL} />} title="Start this week">
            <div style={{ ...glass({ padding: '12px 14px' }), backdropFilter: 'none' }}>
              {p.firstWeek.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '5px 0' }}>
                  <CheckCircle2 size={15} color={C.greenL} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: C.t2 }}>{a}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Encouragement */}
        {p.encouragement && (
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: `${C.green}12`, border: `1px solid ${C.green}25` }}>
            <p style={{ fontSize: 13, color: C.t1, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{p.encouragement}</p>
          </div>
        )}
      </div>
      <ContinueButton onClick={onNext}>Let's go</ContinueButton>
    </>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
