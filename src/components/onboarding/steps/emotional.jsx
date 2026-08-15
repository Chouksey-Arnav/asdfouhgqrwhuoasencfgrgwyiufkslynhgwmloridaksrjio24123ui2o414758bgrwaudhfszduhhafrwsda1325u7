// The flow's emotional beats — each one mirrors something the student just
// told us back at them, personalized by personalize.js. These are the screens
// that turn a questionnaire into a journey: identity (who you're becoming),
// insight (you're not behind / you're ahead), empathy (we heard your obstacle),
// and commitment (the pledge right before the plan is built).
//
// In the redesign these stopped being "a big emoji and a paragraph". Each beat
// now has a piece of composed artwork built from the flow's own marks and its
// chapter hues, so the payoff screens look like the most designed screens in
// the flow — which they should, since they are the ones doing the persuading.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, CompareBars, Icon, flowHue, C } from '../primitives';
import { hue, R, meta, display, body, numeral, GLIDE, POP, step, lit, panel } from '../design';
import { LogoMark, EKGLine } from '../brand';
import { identityContent, experienceInsight, obstacleEmpathy, gradeInfo, COMMIT_LEVELS } from '../personalize';
import { DREAM_ROLE_OPTIONS } from '../options';
import { play } from '../../../lib/sounds';

// ── Identity: "Future Physician" ─────────────────────────────────────────────
// The one screen in the flow that names the student as the thing they want to
// be. It is set as a plate — a badge with their role's own mark on it — rather
// than as a headline, because a name on a badge is a claim and a headline is
// just copy.
export function IdentityStep({ answers, onNext }) {
  const c = identityContent(answers);
  const g = flowHue();
  const roleMark = DREAM_ROLE_OPTIONS.find(o => o.value === answers.dreamRole)?.icon || 'stethoscope';
  useEffect(() => { const t = setTimeout(() => play('xp'), 700); return () => clearTimeout(t); }, []);

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: 8 }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
          <LogoMark size={72} pulse />
        </motion.div>

        {/* The badge. Hairline frame, mono kicker, the role's own mark. */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.35 }}
          style={{
            marginTop: 26, padding: '20px 26px', borderRadius: R.xl, maxWidth: 400,
            background: `linear-gradient(150deg, ${g.soft}, transparent 68%), ${C.surf}`,
            border: `1px solid ${g.edgeSoft}`, boxShadow: C.shadowSm,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 13 }}>
            <span style={{ width: 16, height: 1, background: g.edge }} />
            <span style={meta(9.5, { color: g.ink })}>{c.eyebrow}</span>
            <span style={{ width: 16, height: 1, background: g.edge }} />
          </div>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...POP, delay: 0.5 }}
            style={{
              width: 54, height: 54, borderRadius: 18, margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: g.grad, color: g.onFill, boxShadow: `${g.glow}, ${lit(0.22)}`,
            }}>
            <Icon name={roleMark} size={26} stroke={1.7} />
          </motion.div>
          <h1 style={display(28, { color: C.t1, margin: 0 })}>{c.title}</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ width: 220, marginTop: 4 }}>
          <EKGLine width={210} height={36} delay={1} color={g.base} />
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.85 }}
          style={body(14, { maxWidth: 380, margin: '6px 0 0', lineHeight: 1.72 })}>
          {c.line}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 1.1 }}
          style={{
            marginTop: 18, padding: '9px 15px', borderRadius: R.pill,
            background: C.surf, border: `1px solid ${C.b1}`,
            fontSize: 12.5, fontWeight: 600, color: C.t2, display: 'flex', alignItems: 'center', gap: 9,
          }}>
          <span style={{ display: 'flex', color: g.ink }}><Icon name="hourglass" size={14} /></span>{c.sub}
        </motion.div>
      </div>
      <ContinueButton onClick={onNext} h={g}>{c.cta}</ContinueButton>
    </>
  );
}

// ── Experience insight: normalize a blank slate, celebrate a head start ──────
export function ExperienceInsightStep({ answers, onNext }) {
  const ins = experienceInsight(answers.experience);
  const g = flowHue();
  return (
    <>
      <StepHeader
        eyebrow={ins.variant === 'fresh' ? 'Good news' : 'Head start'}
        icon={ins.variant === 'fresh' ? 'sprout' : 'medal'}
        h={g} title={ins.title} subtitle={ins.sub} />
      <div style={{ flex: 1 }}>
        <div style={panel({ padding: '20px 18px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <span style={{ width: 14, height: 1, background: g.edge }} />
            <span style={meta(9.5, { color: C.t3 })}>
              {ins.variant === 'fresh' ? 'How future med students actually start' : 'Hands-on experience, students your age'}
            </span>
          </div>
          <CompareBars bars={ins.bars} h={g} />
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 1.1 }}
          style={{
            marginTop: 14, padding: '14px 16px', borderRadius: R.md,
            background: `linear-gradient(135deg, ${g.soft}, ${g.softer})`, border: `1px solid ${g.edgeSoft}`,
            display: 'flex', gap: 11, alignItems: 'flex-start',
          }}>
          <span style={{ color: g.ink, display: 'flex', flexShrink: 0, marginTop: 1 }}><Icon name="sparkle" size={16} /></span>
          <p style={{ fontSize: 13, color: C.t1, fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{ins.stat}</p>
        </motion.div>
      </div>
      <ContinueButton onClick={onNext} h={g}>Continue</ContinueButton>
    </>
  );
}

// ── Obstacle empathy: "we heard you" ─────────────────────────────────────────
// Set as a pull-quote, because that is literally what it is: the student's own
// words, read back. The quote mark and the rule down the left are the whole
// design — a paragraph in a tinted box would have said "notice" instead.
export function ObstacleEmpathyStep({ answers, onNext }) {
  const e = obstacleEmpathy(answers.obstacles);
  const g = flowHue();
  if (!e) return null;
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}
          style={{
            width: 52, height: 52, borderRadius: R.lg, marginBottom: 22,
            background: g.soft, border: `1px solid ${g.edgeSoft}`, color: g.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon name="quote" size={24} />
        </motion.div>

        <div style={{ borderLeft: `2px solid ${g.edge}`, paddingLeft: 20 }}>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.2 }}
            style={display(25, { color: C.t1, margin: '0 0 14px', lineHeight: 1.3 })}>
            {e.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.45 }}
            style={body(14.5, { margin: 0, maxWidth: 400, lineHeight: 1.75 })}>
            {e.line}
          </motion.p>
        </div>

        {e.others.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, marginTop: 18, paddingLeft: 22 }}>
            {e.others.length === 1
              ? `And ${e.others[0].toLowerCase()}? Your plan accounts for that too.`
              : `And the rest — ${e.others.map(o => o.toLowerCase()).join(', ')}? Your plan accounts for those too.`}
          </motion.p>
        )}
      </div>
      <ContinueButton onClick={onNext} h={g}>We've got this</ContinueButton>
    </>
  );
}

// ── Commitment: the pledge before the payoff ─────────────────────────────────
// Recaps the student's own numbers as a personal pledge, each line landing in
// sequence, then hands straight off to plan generation — the flow's peak. Set
// as a signed document: a numbered list on a hairline sheet, a signature rule
// at the bottom.
export function CommitmentStep({ answers, onNext }) {
  const { speedLevel, gradeIdx } = answers;
  const g = flowHue();
  const minutes = (COMMIT_LEVELS[speedLevel] || COMMIT_LEVELS[1]).minutes;
  const grade = gradeInfo(gradeIdx);
  // The third pledge used to be a target SAT/ACT score. It went with the SAT
  // pillar (src/lib/betaFlags.js) — a pledge the product cannot help anyone
  // keep is not a pledge. What replaced it is the commitment this app is
  // actually built to support: the science foundation underneath everything.
  const pledges = [
    { icon: 'pulse-heart', text: 'Take one real step toward medicine every week — experience, science, or story.' },
    { icon: 'clock', text: `Show up for ~${minutes} focused minutes a day. Small days, big compounding.` },
    { icon: 'dna', text: 'Build the science foundation medicine runs on — one lesson, one quiz at a time.' },
    // gradeInfo returns a neutral entry when the year is unknown; by this point
    // it never is (the grade question gates its own screen), but the pledge
    // reads correctly either way rather than promising a "week-sized week".
    { icon: 'flag-check', text: gradeIdx == null ? 'Trust the plan, one week at a time.' : `Trust the plan, one ${grade.label}-sized week at a time.` },
  ];
  const [armed, setArmed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setArmed(true), pledges.length * 320 + 500); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <StepHeader eyebrow="One last thing" icon="signature" h={g}
        title="Make it a promise to yourself."
        subtitle="Everything you told us becomes your plan the moment you commit." />
      <div style={{ flex: 1 }}>
        <div style={panel({ padding: '6px 6px 0', overflow: 'hidden' })}>
          {pledges.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ ...GLIDE, delay: 0.3 + i * 0.32 }}
              style={{
                display: 'flex', gap: 13, alignItems: 'center', padding: '13px 12px',
                borderBottom: i < pledges.length - 1 ? `1px solid ${C.b0}` : 'none',
              }}>
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: 0.5 + i * 0.32 }}
                style={{
                  width: 32, height: 32, borderRadius: R.xs, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: g.soft, border: `1px solid ${g.edgeSoft}`, color: g.ink,
                }}>
                <Icon name={p.icon} size={16} />
              </motion.span>
              <span style={{ ...numeral(10, { color: C.t4 }), flexShrink: 0 }}>{`0${i + 1}`}</span>
              <span style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.55, fontWeight: 600 }}>{p.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: armed ? 1 : 0 }} transition={{ duration: 0.5 }}
          style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {/* The signature mark carries its own baseline rule, so it is the
              whole flourish — a second hairline under it just read as noise. */}
          <span style={{ color: g.ink, opacity: 0.8 }}><Icon name="signature" size={44} stroke={1.3} /></span>
          <span style={{ fontSize: 12, color: C.t3 }}>Signed by showing up. That's all it takes.</span>
        </motion.div>
      </div>
      <motion.div animate={armed ? { scale: [1, 1.012, 1] } : {}} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
        <ContinueButton onClick={() => { play('levelUp'); onNext(); }} h={g}>I'm committing to this</ContinueButton>
      </motion.div>
    </>
  );
}
