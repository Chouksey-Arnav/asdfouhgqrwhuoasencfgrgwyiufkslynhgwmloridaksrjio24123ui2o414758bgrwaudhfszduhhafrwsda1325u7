import React, { useMemo } from 'react';
import { StepHeader, ContinueButton, WheelColumn, C } from '../primitives';
import { play } from '../../../lib/sounds';
import { TEST_TIMELINE_OPTIONS } from '../options';

const SAT_SCORES = Array.from({ length: 121 }, (_, i) => 400 + i * 10);
const ACT_SCORES = Array.from({ length: 36 }, (_, i) => 1 + i);

// One compact screen for the whole "test logistics" question: target score AND
// when they plan to sit the test. Merging these (they used to be two screens,
// three with the pace slider) is what keeps the academics beat a short chapter
// inside a medicine-first journey instead of the journey itself. The timeline
// answer also lets the very next screen (trajectory verdict) be honest about
// whether the gap fits the clock.
export function TargetScoreStep({ testTrack, currentScore, value, timeline, onChange, onTimeline, onNext }) {
  const scores = testTrack === 'ACT' ? ACT_SCORES : SAT_SCORES;
  const idx = useMemo(() => Math.max(0, scores.indexOf(value)), [scores, value]);
  const delta = value - currentScore;

  return (
    <>
      <StepHeader eyebrow="Your academics, handled" title={`Set your ${testTrack} target — then we move on to medicine.`} subtitle="Scores open doors; they don't tell your story. We'll size this piece honestly on the next screen." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: C.t3, marginBottom: 6 }}>Target {testTrack} score</div>
        <WheelColumn items={scores} index={idx} width={140} itemH={44} visibleRows={3} mono onChange={i => onChange(scores[i])} />
        <div style={{ marginTop: 14, minHeight: 34 }}>
          {delta > 0 ? (
            <div style={{ padding: '8px 16px', borderRadius: 20, background: C.blueDim, border: `1px solid ${C.b2}`, fontSize: 12.5, fontWeight: 700, color: C.blueL }}>
              +{delta} from your current {currentScore}
            </div>
          ) : (
            <div style={{ padding: '8px 16px', borderRadius: 20, background: C.greenDim, border: '1px solid rgba(16,185,129,0.25)', fontSize: 12.5, fontWeight: 700, color: C.greenL }}>
              You're already there — we'll aim your energy elsewhere
            </div>
          )}
        </div>
        <div style={{ width: '100%', marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, textAlign: 'center' }}>When do you plan to take it?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TEST_TIMELINE_OPTIONS.map(o => {
              const sel = timeline === o.value;
              return (
                <button key={o.value} onClick={() => { play('select'); onTimeline(o.value); }}
                  style={{
                    padding: '11px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    background: sel ? C.blueGrad : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sel ? 'transparent' : C.b1}`,
                    boxShadow: sel ? '0 6px 18px rgba(45,127,255,0.28)' : 'none',
                    color: sel ? '#fff' : C.t2, fontSize: 12.5, fontWeight: 700, fontFamily: C.FB,
                    transition: 'background .18s,box-shadow .18s',
                  }}>{o.label}</button>
              );
            })}
          </div>
        </div>
      </div>
      <ContinueButton disabled={!timeline} onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
