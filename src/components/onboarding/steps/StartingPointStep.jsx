// "Where you're starting from" — grade, test score and birthdate on ONE screen.
//
// These were three separate steps (grade+score, then birthdate) with a Next
// between them, which is three page transitions to collect what is, to the
// student, a single idea: who I am right now. They're grouped here, and the
// grade question swapped from a scroll wheel to a row of tap targets — a wheel
// is the right control for 121 SAT scores and the wrong one for five grades.
//
// The age gate still fires on the way out; see advanceFromStartingPoint in
// Onboarding.jsx.
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GroupedStep } from './grouped';
import { WheelColumn, SegmentToggle, useViewport, flowAccentColor, C, tint } from '../primitives';
import { BirthdateWheels } from './BirthdateStep';
import { play } from '../../../lib/sounds';
import { GRADE_STAGES } from '../../../data/constants';

const SAT_SCORES = Array.from({ length: 121 }, (_, i) => 400 + i * 10); // 400..1600
const ACT_SCORES = Array.from({ length: 36 }, (_, i) => 1 + i); // 1..36

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

function ScoreField({ value, onChange, accent }) {
  const { testTrack, currentScore } = value;
  const scores = testTrack === 'ACT' ? ACT_SCORES : SAT_SCORES;
  const scoreIdx = useMemo(() => Math.max(0, scores.indexOf(currentScore)), [scores, currentScore]);
  return (
    <div>
      <SegmentToggle
        options={[{ value: 'SAT', label: 'SAT' }, { value: 'ACT', label: 'ACT' }]}
        value={testTrack}
        onChange={track => onChange({ testTrack: track, currentScore: track === 'ACT' ? 20 : 1000 })}
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <WheelColumn items={scores} index={scoreIdx} width={150} itemH={44} visibleRows={3} mono onChange={i => onChange({ currentScore: scores[i] })} />
      </div>
      <p style={{ fontSize: 12, color: C.t4, textAlign: 'center', marginTop: 12 }}>
        Haven't taken it yet? Pick your best guess — nothing here is locked in, and you can change it later.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.22)}`, padding: '6px 13px', borderRadius: 20 }}>
          Starting line: {currentScore} on the {testTrack}
        </span>
      </div>
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
      subtitle="Three quick ones, all on this screen. An honest starting line is worth more than a flattering one — nothing here is a grade, and nothing is locked."
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
          key: 'score',
          prompt: 'Where is your test score right now?',
          hint: 'Pick the test you plan to take, then spin to roughly where you are.',
          value: value.currentScore,
          answered: () => true,
          onChange: () => {},
          render: ({ accent: a }) => <ScoreField value={value} onChange={onChange} accent={a} />,
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
