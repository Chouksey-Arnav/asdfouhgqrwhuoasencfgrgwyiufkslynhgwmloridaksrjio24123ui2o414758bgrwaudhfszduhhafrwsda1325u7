import React from 'react';
import { StepHeader, ContinueButton, WheelColumn, C } from '../primitives';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => THIS_YEAR - 12 - i); // ages ~12-31

export function BirthdateStep({ value, onChange, onNext }) {
  const { monthIdx, dayIdx, yearIdx } = value;
  return (
    <>
      <StepHeader title="When were you born?" subtitle="This helps us build an age-appropriate plan." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <WheelColumn items={MONTHS} index={monthIdx} width={92} onChange={i => onChange({ ...value, monthIdx: i })} />
          <WheelColumn items={DAYS} index={dayIdx} width={68} mono onChange={i => onChange({ ...value, dayIdx: i })} />
          <WheelColumn items={YEARS} index={yearIdx} width={92} mono onChange={i => onChange({ ...value, yearIdx: i })} />
        </div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

export { MONTHS, DAYS, YEARS };
