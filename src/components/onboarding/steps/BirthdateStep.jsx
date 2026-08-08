import React from 'react';
import { StepHeader, ContinueButton, WheelColumn, C } from '../primitives';
import { MIN_WHEEL_AGE, MAX_WHEEL_AGE } from '../../../lib/ageGate';
import { LEGAL } from '../../../legal/legalConfig';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const THIS_YEAR = new Date().getFullYear();

// The wheel used to start at THIS_YEAR - 12 and run backwards, which meant the
// youngest selectable age was 12 and nobody could enter a birth year that made
// them younger. An age screen whose disqualifying answers are unselectable does
// not screen anyone — it just launders under-13 users into the "12 or older"
// bucket. The range now runs from age 5 to 31 so the honest answer is always
// available, and Onboarding.jsx acts on it. See src/lib/ageGate.js.
const YEARS = Array.from(
  { length: MAX_WHEEL_AGE - MIN_WHEEL_AGE + 1 },
  (_, i) => THIS_YEAR - MIN_WHEEL_AGE - i,
);

export function BirthdateStep({ value, onChange, onNext }) {
  const { monthIdx, dayIdx, yearIdx } = value;
  return (
    <>
      <StepHeader
        title="When were you born?"
        subtitle="This helps us build an age-appropriate plan — and it's how we check you're old enough to use MedSchoolPrep."
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <WheelColumn items={MONTHS} index={monthIdx} width={92} onChange={i => onChange({ ...value, monthIdx: i })} />
          <WheelColumn items={DAYS} index={dayIdx} width={68} mono onChange={i => onChange({ ...value, dayIdx: i })} />
          <WheelColumn items={YEARS} index={yearIdx} width={92} mono onChange={i => onChange({ ...value, yearIdx: i })} />
        </div>
        {/*
          Neutral, and placed after the control rather than before it. The FTC's
          age-screen guidance asks that the screen not signal which answer gets
          you in — so this states the rule as a fact without hinting that a
          particular wheel position is the "right" one.
        */}
        <p style={{ marginTop: 22, textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: C.t3, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          You need to be at least {LEGAL.minAge} to use MedSchoolPrep. Please enter your real
          date of birth.
        </p>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

export { MONTHS, DAYS, YEARS };
