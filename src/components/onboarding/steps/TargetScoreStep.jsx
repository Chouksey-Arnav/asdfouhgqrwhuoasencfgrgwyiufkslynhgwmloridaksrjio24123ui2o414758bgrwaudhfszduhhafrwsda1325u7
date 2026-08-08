import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GroupedStep } from './grouped';
import { WheelColumn, flowAccentColor, C, tint } from '../primitives';
import { play } from '../../../lib/sounds';
import { TEST_TIMELINE_OPTIONS, GOAL_OPTIONS } from '../options';

const SAT_SCORES = Array.from({ length: 121 }, (_, i) => 400 + i * 10);
const ACT_SCORES = Array.from({ length: 36 }, (_, i) => 1 + i);

/**
 * The whole "where are you aiming" beat on one screen: what matters most to
 * them, the number they want, and when they sit the test.
 *
 * These were three separate steps. Grouping them is not just tap-saving — the
 * three answers only mean anything together (a 400-point jump is ambitious in
 * nine months and fiction in six weeks), and the very next screen gives an
 * honest verdict on exactly that combination.
 */
export function TargetScoreStep({ testTrack, currentScore, value, timeline, goal, onGoal, onChange, onTimeline, onNext, accent = flowAccentColor() }) {
  const scores = testTrack === 'ACT' ? ACT_SCORES : SAT_SCORES;
  const idx = useMemo(() => Math.max(0, scores.indexOf(value)), [scores, value]);
  const delta = value - currentScore;

  const scoreField = (a) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <WheelColumn items={scores} index={idx} width={160} itemH={46} visibleRows={3} mono onChange={i => onChange(scores[i])} />
      <div style={{ marginTop: 14, minHeight: 34 }}>
        {delta > 0 ? (
          <motion.div key={delta} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ padding: '8px 16px', borderRadius: 20, background: tint(a, 0.12), border: `1px solid ${tint(a, 0.24)}`, fontSize: 12.5, fontWeight: 700, color: a }}>
            +{delta} from your current {currentScore}
          </motion.div>
        ) : (
          <div style={{ padding: '8px 16px', borderRadius: 20, background: C.greenDim, border: `1px solid ${tint(C.green, 0.25)}`, fontSize: 12.5, fontWeight: 700, color: C.greenL }}>
            You're already there — we'll aim your energy elsewhere
          </div>
        )}
      </div>
    </div>
  );

  const timelineField = (a) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 9 }}>
      {TEST_TIMELINE_OPTIONS.map(o => {
        const sel = timeline === o.value;
        return (
          <motion.button key={o.value} data-testid="onboarding-option" whileTap={{ scale: 0.96 }} whileHover={sel ? {} : { y: -2 }}
            onClick={() => { play('select'); onTimeline(o.value); }}
            style={{
              padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: sel ? tint(a, 0.14) : C.surf,
              border: `1px solid ${sel ? a : C.b1}`,
              boxShadow: sel ? `0 6px 18px ${tint(a, 0.18)}` : C.shadowSm,
              transition: 'background .18s,border-color .18s',
            }}>
            <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 6 }}>{o.emoji}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{o.label}</div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>{o.sublabel}</div>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <GroupedStep
      eyebrow="Where you're going"
      emoji="🎯"
      accent={accent}
      title="Now the part you get to decide."
      subtitle="What you want most, the number you're chasing, and when you sit the test. The next screen tells you honestly whether those three fit together."
      questions={[
        {
          key: 'goal',
          prompt: 'What matters most to you right now?',
          hint: 'Your plan leads with this — everything else supports it.',
          type: 'single',
          options: GOAL_OPTIONS,
          value: goal,
          onChange: onGoal,
        },
        {
          key: 'target',
          prompt: `Set your ${testTrack} target`,
          hint: "Scores open doors; they don't tell your story. This is one piece of the plan, not the plan.",
          value,
          answered: () => true,
          onChange: () => {},
          render: ({ accent: a }) => scoreField(a),
        },
        {
          key: 'timeline',
          prompt: 'When do you plan to take it?',
          value: timeline,
          onChange: onTimeline,
          render: ({ accent: a }) => timelineField(a),
        },
      ]}
      onNext={onNext}
      ctaLabel="See if that's realistic"
    />
  );
}
