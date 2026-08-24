// ─────────────────────────────────────────────────────────────────────────────
// Step two: the year you graduate.
//
// ── Why this is the second screen ────────────────────────────────────────────
// It is the single most consequential thing a student tells us. Grade band
// decides which onboarding flow they get, what their first screen after
// onboarding is, which lessons and milestones are in their task list, and what
// the app spends its first session emphasizing. Asking it on screen fourteen
// means thirteen screens were built for a student we had not met yet.
//
// ── Why graduation year and not "what grade are you in" ──────────────────────
// A grade is true for ten months. A graduation year is true forever, and it
// advances itself every August 1 with nobody writing anything down. See the
// header of src/lib/gradeBand.js.
//
// ── Why it is confirmed rather than assumed ──────────────────────────────────
// We already collect date of birth (the age gate needs it), and the ordinary
// US cutoff turns a birthday into a graduation year that is right for most
// students. Most is not enough here: a student who skipped a grade, repeated
// one, started late, or went to school outside a September cutoff would be
// silently mis-sequenced through the entire product, and would have no idea
// why the app kept talking about the wrong year. So the guess is OFFERED, in
// the position of a suggestion, and the student has to tap something before
// they can continue. `confirmed` is what the Continue button waits on — not
// merely the presence of a year, because a pre-filled value nobody looked at
// is not an answer.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GroupedStep } from './grouped';
import { useViewport, C } from '../primitives';
import { R, numeral, POP } from '../design';
import { eyebrow } from '../../../lib/tokens/type';
import { BirthdateWheels } from './BirthdateStep';
import { play } from '../../../lib/sounds';
import {
  defaultGraduationYear, graduationYearChoices, graduationYearLabel, bandOfGrade, BAND_BY_ID,
} from '../../../lib/gradeBand';
import { gradeIdxOf } from '../../../lib/timeline';

// The answers object still carries `gradeIdx`, derived from the confirmed
// graduation year rather than typed by the student. Six things downstream read
// it (personalize.js, the story-rail chart, the identity beat, planGenerator),
// and none of them need to learn about graduation years to keep working — the
// year is the stored truth, this is a rendering of it for this session's
// answers only. Nothing persists gradeIdx.
const gradeIdxFromYear = (y) => {
  const i = gradeIdxOf(graduationYearLabel(y).gradeStage);
  return i == null ? null : i;
};

/** The DOB the wheels currently hold, as a plain {year, month, day}. */
export function birthdateFromAnswers(a, YEARS, DAYS) {
  return { year: YEARS[a.yearIdx], month: a.monthIdx + 1, day: DAYS[a.dayIdx] };
}

function YearTiles({ value, suggested, onChange, g }) {
  const { isMobile } = useViewport();
  const years = useMemo(() => {
    const list = graduationYearChoices();
    // A suggestion outside the usual window (a student well ahead or behind)
    // still has to be selectable, or the screen quietly contradicts itself.
    return suggested && !list.includes(suggested) ? [...list, suggested].sort((a, b) => a - b) : list;
  }, [suggested]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
      gap: 8,
    }}>
      {years.map(y => {
        const sel = value === y;
        const { sub } = graduationYearLabel(y);
        const band = bandOfGrade(graduationYearLabel(y).gradeStage);
        return (
          <motion.button key={y} data-testid="onboarding-option"
            whileTap={{ scale: 0.97 }} whileHover={sel ? {} : { y: -2 }} transition={POP}
            aria-pressed={sel}
            onClick={() => { play('select'); onChange(y); }}
            style={{
              textAlign: 'left', padding: '12px 16px', borderRadius: R.md, cursor: 'pointer',
              fontFamily: C.FB, position: 'relative',
              background: sel ? `linear-gradient(160deg, ${g.soft}, ${g.softer})` : C.surf,
              border: `1px solid ${sel ? g.edge : C.b1}`,
              boxShadow: sel ? g.glowSm : C.shadowSm,
              transition: 'background .18s, border-color .18s, box-shadow .18s',
            }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ ...numeral(15, { color: sel ? C.t1 : C.t2 }) }}>{y}</span>
              {y === suggested && (
                <span style={{
                  ...eyebrow(9), fontWeight: 700,
                  color: g.ink, background: g.soft, borderRadius: 999, padding: '4px 8px', fontFamily: C.FM,
                }}>From your birthday</span>
              )}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.35 }}>
              {sub}{band ? ` · ${BAND_BY_ID[band].label}` : ''}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * @param {object} value    the whole answers object (DOB wheels live on it)
 * @param {function} onChange  patch the answers
 * @param {function} onNext   advance (the age gate runs on the way out — see
 *                            advanceFromClassYear in Onboarding.jsx)
 */
export function GraduationYearStep({ value, onChange, onNext, h, YEARS, DAYS }) {
  const g = h;
  const suggested = useMemo(
    () => (value.dobTouched ? defaultGraduationYear(birthdateFromAnswers(value, YEARS, DAYS)) : null),
    [value, YEARS, DAYS],
  );

  // The suggestion fills the field the moment the birthday is entered, but
  // `graduationYearConfirmed` stays false until the student taps a tile — a
  // pre-filled value nobody looked at is not an answer, and this one is too
  // consequential to infer from a scroll past.
  React.useEffect(() => {
    if (suggested && value.graduationYear == null) onChange({ graduationYear: suggested, gradeIdx: gradeIdxFromYear(suggested) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  const picked = value.graduationYear;
  const band = picked ? bandOfGrade(graduationYearLabel(picked).gradeStage) : null;

  return (
    <GroupedStep
      eyebrow="Your class year"
      icon="pin"
      h={g}
      title="When do you graduate high school?"
      subtitle="This is the one answer that shapes everything else — which lessons come first, which deadlines are real for you, and what we put in front of you today. It never expires: we roll it forward every August so you never have to update it."
      questions={[
        {
          key: 'birthdate',
          prompt: 'When were you born?',
          hint: "It's how we check you're old enough to use MedSchoolPrep — and it gives us a first guess at your class year.",
          value: value.yearIdx,
          answered: () => !!value.dobTouched,
          onChange: () => {},
          render: ({ h: hh }) => <BirthdateWheels value={value} onChange={onChange} h={hh} />,
        },
        {
          key: 'graduationYear',
          prompt: 'And the year you graduate?',
          hint: 'We guessed from your birthday. Tap the right one — plenty of people are a year off from the guess, and it matters more here than anywhere else in this flow.',
          value: value.graduationYearConfirmed ? value.graduationYear : null,
          answered: () => !!value.graduationYearConfirmed,
          onChange: () => {},
          render: ({ h: hh }) => (
            <div>
              <YearTiles value={picked} suggested={suggested} g={hh}
                onChange={(y) => onChange({ graduationYear: y, graduationYearConfirmed: true, gradeIdx: gradeIdxFromYear(y) })} />
              {picked && band && (
                <p style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, marginTop: 12 }}>
                  {BAND_BY_ID[band].focus} Everything else in the app stays open to you either
                  way — this changes what we put first, never what you can reach.
                </p>
              )}
            </div>
          ),
        },
      ]}
      showCounter={false}
      onNext={onNext}
    />
  );
}

export default GraduationYearStep;
