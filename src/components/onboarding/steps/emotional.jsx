// The flow's emotional beats — each one mirrors something the student just
// told us back at them, personalized by personalize.js. These are the screens
// that turn a questionnaire into a journey: identity (who you're becoming),
// insight (you're not behind / you're ahead), empathy (we heard your obstacle),
// and commitment (the pledge right before the plan is built).
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles, CheckCircle2, Target, Clock3, HeartPulse, Flag } from 'lucide-react';
import { StepHeader, ContinueButton, CompareBars, C } from '../primitives';
import { LogoMark, EKGLine } from '../brand';
import { identityContent, experienceInsight, obstacleEmpathy, gradeInfo, scoreScenario, COMMIT_LEVELS } from '../personalize';
import { play } from '../../../lib/sounds';

// ── Identity: "Future Physician" ─────────────────────────────────────────────
export function IdentityStep({ answers, onNext }) {
  const c = identityContent(answers);
  useEffect(() => { const t = setTimeout(() => play('xp'), 700); return () => clearTimeout(t); }, []);
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }}>
          <LogoMark size={78} pulse />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
          style={{ marginTop: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.goldL, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>{c.eyebrow}</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.t1, margin: '0 0 6px', fontFamily: C.FD, letterSpacing: '-.03em', lineHeight: 1.15 }}>
            <span style={{ background: 'linear-gradient(120deg,#e3c47c,#5da0ff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{c.title}</span>
          </h1>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <EKGLine width={210} height={38} delay={1} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.5 }}
          style={{ fontSize: 14, color: C.t2, lineHeight: 1.75, maxWidth: 340, margin: '10px 0 0' }}>
          {c.line}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }}
          style={{ marginTop: 18, padding: '10px 16px', borderRadius: 20, background: C.blueDim, border: `1px solid ${C.b2}`, fontSize: 12.5, fontWeight: 600, color: C.blueL, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} />{c.sub}
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>{c.cta}</ContinueButton>
    </>
  );
}

// ── Experience insight: normalize a blank slate, celebrate a head start ──────
export function ExperienceInsightStep({ answers, onNext }) {
  const ins = experienceInsight(answers.experience);
  return (
    <>
      <StepHeader eyebrow={ins.variant === 'fresh' ? 'Good news' : 'Head start unlocked'} title={ins.title} subtitle={ins.sub} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '22px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>
            {ins.variant === 'fresh' ? 'How future med students actually start' : 'Hands-on experience, students your age'}
          </div>
          <CompareBars bars={ins.bars} />
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
          style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.greenDim, border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: C.greenL, fontWeight: 600, lineHeight: 1.55 }}>
          {ins.stat}
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

// ── Obstacle empathy: "we heard you" ─────────────────────────────────────────
export function ObstacleEmpathyStep({ answers, onNext }) {
  const e = obstacleEmpathy(answers.obstacles);
  if (!e) return null;
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 16 }}
          style={{ width: 62, height: 62, borderRadius: 18, background: C.violetDim, border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Quote size={26} color={C.violetL} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontSize: 25, fontWeight: 800, color: C.t1, margin: '0 0 14px', fontFamily: C.FD, letterSpacing: '-.03em', lineHeight: 1.3 }}>
          {e.title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
          style={{ fontSize: 14.5, color: C.t2, lineHeight: 1.75, margin: 0, maxWidth: 370 }}>
          {e.line}
        </motion.p>
        {e.others.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, marginTop: 16 }}>
            {e.others.length === 1 ? `And ${e.others[0].toLowerCase()}? Your plan accounts for that too.` : `And the rest — ${e.others.map(o => o.toLowerCase()).join(', ')}? Your plan accounts for those too.`}
          </motion.p>
        )}
      </div>
      <ContinueButton onClick={onNext}>We've got this</ContinueButton>
    </>
  );
}

// ── Commitment: the pledge before the payoff ─────────────────────────────────
// Recaps the student's own numbers as a personal pledge, each line landing in
// sequence, then hands straight off to plan generation — the flow's peak.
export function CommitmentStep({ answers, onNext }) {
  const { targetScore, testTrack, speedLevel, gradeIdx } = answers;
  const minutes = (COMMIT_LEVELS[speedLevel] || COMMIT_LEVELS[1]).minutes;
  const g = gradeInfo(gradeIdx);
  const sc = scoreScenario(answers);
  // The score pledge tells the truth the trajectory screen already told: an
  // already-there or nearly-done score pledges maintenance-plus-story, an
  // impossible-timeline gap pledges the honest interim number, everyone else
  // pledges their real target.
  const scorePledge = (sc.band === 'beyond' || sc.band === 'polish')
    ? `Keep my ${testTrack} sharp — and pour my real energy into experiences and my story.`
    : sc.band === 'reset'
      ? `Chase ${sc.achievable} on the ${testTrack} this sitting — then take the mapped road to ${targetScore}.`
      : `Aim for ${targetScore} on the ${testTrack} — my number, my reasons.`;
  const pledges = [
    { icon: HeartPulse, color: C.roseL, text: 'Take one real step toward medicine every week — experience, science, or story.' },
    { icon: Clock3, color: C.amberL, text: `Show up for ~${minutes} focused minutes a day. Small days, big compounding.` },
    { icon: Target, color: C.blueL, text: scorePledge },
    { icon: Flag, color: C.greenL, text: `Trust the plan, one ${g.label}-sized week at a time.` },
  ];
  const [armed, setArmed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setArmed(true), pledges.length * 350 + 500); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <StepHeader eyebrow="One last thing" title="Make it a promise to yourself." subtitle="Everything you told us becomes your plan the moment you commit." />
      <div style={{ flex: 1 }}>
        {pledges.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.35, type: 'spring', stiffness: 260, damping: 22 }}
            style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '13px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, marginBottom: 10 }}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55 + i * 0.35, type: 'spring', stiffness: 400 }}
              style={{ flexShrink: 0, marginTop: 1 }}>
              <p.icon size={18} color={p.color} />
            </motion.span>
            <span style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.55, fontWeight: 600 }}>{p.text}</span>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: armed ? 1 : 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 18 }}>
          <CheckCircle2 size={15} color={C.goldL} />
          <span style={{ fontSize: 12.5, color: C.t3 }}>Signed by showing up. That's all it takes.</span>
        </motion.div>
      </div>
      <motion.div animate={armed ? { scale: [1, 1.025, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <ContinueButton onClick={() => { play('levelUp'); onNext(); }}>I'm committing to this</ContinueButton>
      </motion.div>
    </>
  );
}
