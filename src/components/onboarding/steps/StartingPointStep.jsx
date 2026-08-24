// "Where you're starting from" — grade and birthdate on ONE screen.
//
// These were separate steps with a Next between them, which is a page
// transition to collect what is, to the student, a single idea: who I am right
// now.
//
// ── The grade control ────────────────────────────────────────────────────────
// It used to be five tiles each led by an emoji (🌱 📗 📘 🎓 🚀), which carried
// no information — a book is not a sophomore. It is now a timeline: five stops
// in order, each stamped with its year in the mono face, with a rule running
// through them. That says the one true thing about this question that the old
// tiles didn't: these answers are a sequence, and the student is somewhere
// along it.
//
// The age gate still fires on the way out; see advanceFromStartingPoint in
// Onboarding.jsx.
import React from 'react';
import { motion } from 'framer-motion';
import { GroupedStep } from './grouped';
import { useViewport, flowHue, C } from '../primitives';
import { R, numeral, meta, POP, lit } from '../design';
import { BirthdateWheels } from './BirthdateStep';
import { play } from '../../../lib/sounds';
import { GRADE_STAGES } from '../../../data/constants';

// The year each stage is stamped with. `UG` is the one that isn't a grade —
// the student who has already left high school — so it reads as a letter code
// rather than a number, which is exactly what it is.
const YEAR_STAMP = ['09', '10', '11', '12', 'UG'];

function GradeTiles({ value, onChange, g }) {
  const { isMobile } = useViewport();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : `repeat(${GRADE_STAGES.length}, minmax(0,1fr))`,
        gap: 8,
      }}>
        {GRADE_STAGES.map((stage, i) => {
          const sel = value === i;
          return (
            <motion.button key={stage.key} data-testid="onboarding-option"
              whileTap={{ scale: 0.97 }} whileHover={sel ? {} : { y: -2 }} transition={POP}
              aria-pressed={sel}
              onClick={() => { play('select'); onChange(i); }}
              style={{
                textAlign: 'center', padding: '8px 8px 12px', borderRadius: R.md, cursor: 'pointer',
                fontFamily: C.FB,
                background: sel ? `linear-gradient(160deg, ${g.soft}, ${g.softer})` : C.surf,
                border: `1px solid ${sel ? g.edge : C.b1}`,
                boxShadow: sel ? g.glowSm : C.shadowSm,
                transition: 'background .18s, border-color .18s, box-shadow .18s',
              }}>
              <span style={{
                width: 34, height: 34, borderRadius: '50%', margin: '0 auto 9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sel ? g.grad : C.s2,
                border: `1px solid ${sel ? 'transparent' : C.b1}`,
                boxShadow: sel ? `${g.glowSm}, ${lit(0.22)}` : 'none',
                ...numeral(12, { color: sel ? g.onFill : C.t3 }),
                transition: 'background .18s, color .18s',
              }}>{YEAR_STAMP[i] || '—'}</span>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1, lineHeight: 1.25 }}>{stage.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.3 }}>{stage.sub}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function StartingPointStep({ value, onChange, onNext, h }) {
  const g = h || flowHue();
  return (
    <GroupedStep
      eyebrow="Your starting point"
      icon="pin"
      h={g}
      title="Let's mark where you're standing today."
      subtitle="Two quick ones, both on this screen. An honest starting line is worth more than a flattering one — nothing here is a grade, and nothing is locked."
      questions={[
        {
          key: 'grade',
          prompt: 'What year are you in?',
          value: value.gradeIdx,
          answered: (v) => v != null,
          onChange: (i) => onChange({ gradeIdx: i }),
          render: ({ h: hh }) => <GradeTiles value={value.gradeIdx} onChange={i => onChange({ gradeIdx: i })} g={hh} />,
        },
        {
          key: 'birthdate',
          prompt: 'When were you born?',
          hint: "This shapes an age-appropriate plan — and it's how we check you're old enough to use MedSchoolPrep.",
          value: value.yearIdx,
          answered: () => !!value.dobTouched,
          onChange: () => {},
          render: ({ h: hh }) => <BirthdateWheels value={value} onChange={onChange} h={hh} />,
        },
      ]}
      showCounter={false}
      onNext={onNext}
    />
  );
}
