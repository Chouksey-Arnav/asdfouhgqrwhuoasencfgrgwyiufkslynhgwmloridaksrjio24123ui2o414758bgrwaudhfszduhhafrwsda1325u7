// "Where you're starting from" — grade and birthdate on ONE screen.
//
// These were separate steps with a Next between them, which is a page
// transition to collect what is, to the student, a single idea: who I am right
// now. The grade question is a row of tap targets rather than a scroll wheel.
//
// There used to be a third question here — an SAT/ACT track and current score
// on a 121-stop wheel. It went with the SAT pillar (src/lib/betaFlags.js):
// nothing in v1 reads a test score, so asking for one was collecting an answer
// to show back and never use.
//
// The age gate still fires on the way out; see advanceFromStartingPoint in
// Onboarding.jsx.
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GroupedStep } from './grouped';
import { useViewport, flowAccentColor, C, tint } from '../primitives';
import { BirthdateWheels } from './BirthdateStep';
import { play } from '../../../lib/sounds';
import { GRADE_STAGES } from '../../../data/constants';

const GRADE_EMOJI = ['🌱', '📗', '📘', '🎓', '🚀'];

function GradeTiles({ value, onChange, accent }) {
  const { isMobile } = useViewport();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: 9 }}>
      {GRADE_STAGES.map((g, i) => {
        const sel = value === i;
        return (
          <motion.button key={g.key} data-testid="onboarding-option" whileTap={{ scale: 0.96 }} whileHover={sel ? {} : { y: -2 }}
            onClick={() => { play('select'); onChange(i); }}
            style={{
              textAlign: 'left', padding: '13px 14px', borderRadius: 14, cursor: 'pointer',
              background: sel ? tint(accent, 0.14) : C.surf,
              border: `1px solid ${sel ? accent : C.b1}`,
              boxShadow: sel ? `0 6px 18px ${tint(accent, 0.18)}` : C.shadowSm,
              transition: 'background .18s,border-color .18s',
            }}>
            <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 7 }}>{GRADE_EMOJI[i] || '🎓'}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, lineHeight: 1.25 }}>{g.label}</div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2 }}>{g.sub}</div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function StartingPointStep({ value, onChange, onNext, accent = flowAccentColor() }) {
  return (
    <GroupedStep
      eyebrow="Your starting point"
      emoji="📍"
      accent={accent}
      title="Let's mark where you're standing today."
      subtitle="Two quick ones, both on this screen. An honest starting line is worth more than a flattering one — nothing here is a grade, and nothing is locked."
      questions={[
        {
          key: 'grade',
          prompt: 'What year are you in?',
          value: value.gradeIdx,
          answered: (v) => v != null,
          onChange: (i) => onChange({ gradeIdx: i }),
          render: ({ accent: a }) => <GradeTiles value={value.gradeIdx} onChange={i => onChange({ gradeIdx: i })} accent={a} />,
        },
        {
          key: 'birthdate',
          prompt: 'When were you born?',
          hint: "This shapes an age-appropriate plan — and it's how we check you're old enough to use MedSchoolPrep.",
          value: value.yearIdx,
          answered: () => !!value.dobTouched,
          onChange: () => {},
          render: () => <BirthdateWheels value={value} onChange={onChange} />,
        },
      ]}
      showCounter={false}
      onNext={onNext}
    />
  );
}
