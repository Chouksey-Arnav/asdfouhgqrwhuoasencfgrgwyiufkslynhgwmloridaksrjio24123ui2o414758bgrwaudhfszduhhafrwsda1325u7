import React, { useMemo } from 'react';
import { StepHeader, ContinueButton, WheelColumn, SegmentToggle, C } from '../primitives';
import { GRADE_STAGES } from '../../../data/constants';

const SAT_SCORES = Array.from({ length: 121 }, (_, i) => 400 + i * 10); // 400..1600
const ACT_SCORES = Array.from({ length: 36 }, (_, i) => 1 + i); // 1..36

export function GradeScoreStep({ value, onChange, onNext }) {
  const { gradeIdx, testTrack, currentScore } = value;
  const scores = testTrack === 'ACT' ? ACT_SCORES : SAT_SCORES;
  const scoreIdx = useMemo(() => Math.max(0, scores.indexOf(currentScore)), [scores, currentScore]);

  function setTrack(track) {
    onChange({ ...value, testTrack: track, currentScore: track === 'ACT' ? 20 : 1000 });
  }

  return (
    <>
      <StepHeader title="Grade & current score" subtitle="This will be used to calibrate your custom plan." />
      <div style={{ flex: 1 }}>
        <SegmentToggle options={[{ value: 'SAT', label: 'SAT' }, { value: 'ACT', label: 'ACT' }]} value={testTrack} onChange={setTrack} />
        <div style={{ display: 'flex', gap: 18, marginTop: 28, justifyContent: 'center' }}>
          <div>
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Grade</div>
            <WheelColumn items={GRADE_STAGES.map(g => g.label)} index={gradeIdx} width={168} onChange={i => onChange({ ...value, gradeIdx: i })} />
          </div>
          <div>
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Current {testTrack}</div>
            <WheelColumn items={scores} index={scoreIdx} width={100} mono onChange={i => onChange({ ...value, currentScore: scores[i] })} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.t4, textAlign: 'center', marginTop: 20 }}>Haven't taken it yet? Pick your best estimate — you can update this later.</p>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
