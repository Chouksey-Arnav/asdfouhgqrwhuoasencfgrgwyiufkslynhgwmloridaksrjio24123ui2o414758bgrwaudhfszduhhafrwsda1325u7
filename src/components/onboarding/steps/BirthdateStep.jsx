import React from 'react';
import { WheelColumn, C } from '../primitives';
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

/**
 * The birthdate wheels, as a fragment rather than a whole screen.
 *
 * Every wheel sets `dobTouched`, and the screen will not let the student
 * continue until one of them has: the wheels open on an age that FAILS the
 * gate, so accepting the untouched default would permanently block students
 * for a birthday they never entered. Requiring the interaction is also the
 * neutral option — no position on the wheel is treated as an answer, which is
 * what the FTC's age-screen guidance asks for.
 *
 * This used to be a step of its own. It now shares the "where you're starting
 * from" screen with the grade and score wheels — same topic (who you are right
 * now), one Continue instead of two. The age gate still runs on the way out of
 * that screen; see advanceFromStartingPoint in Onboarding.jsx.
 */
export function BirthdateWheels({ value, onChange }) {
  const { monthIdx, dayIdx, yearIdx } = value;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <WheelColumn items={MONTHS} index={monthIdx} width={92} itemH={40} visibleRows={3} onChange={i => onChange({ monthIdx: i, dobTouched: true })} />
        <WheelColumn items={DAYS} index={dayIdx} width={68} itemH={40} visibleRows={3} mono onChange={i => onChange({ dayIdx: i, dobTouched: true })} />
        <WheelColumn items={YEARS} index={yearIdx} width={92} itemH={40} visibleRows={3} mono onChange={i => onChange({ yearIdx: i, dobTouched: true })} />
      </div>
      {/*
        Neutral, and placed after the control rather than before it. The FTC's
        age-screen guidance asks that the screen not signal which answer gets
        you in — so this states the rule as a fact without hinting that a
        particular wheel position is the "right" one.
      */}
      <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: C.t3, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
        You need to be at least {LEGAL.minAge} to use MedSchoolPrep. Please enter your real
        date of birth.
      </p>
    </div>
  );
}

export { MONTHS, DAYS, YEARS };
