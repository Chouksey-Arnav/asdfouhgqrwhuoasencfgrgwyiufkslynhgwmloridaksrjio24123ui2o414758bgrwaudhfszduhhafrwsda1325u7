import React from 'react';
import { GroupedStep } from './grouped';
import { flowHue } from '../primitives';
import { GOAL_OPTIONS } from '../options';

// "Where you're going" — what the student wants most out of this.
//
// This screen used to be three questions: the goal, an SAT/ACT target score,
// and a test date, followed by two more screens forecasting the score jump.
// The score half is gone with the SAT pillar (src/lib/betaFlags.js) — there is
// no test-prep product in v1, so a target score would be a number the app
// collects, displays back, and can do nothing about.
//
// What's left is the question that actually steers the plan: what the student
// wants this to be for. planGenerator.js and masterPlanGenerator.js both lead
// with it.
export function GoalStep({ value, onChange, onNext, h }) {
  const g = h || flowHue();
  return (
    <GroupedStep
      eyebrow="Where you're going"
      icon="target"
      h={g}
      title="Now the part you get to decide."
      subtitle="One question, and it's the one your whole plan is built around."
      questions={[
        {
          key: 'goal',
          prompt: 'What matters most to you right now?',
          hint: 'Your plan leads with this — everything else supports it.',
          type: 'single',
          options: GOAL_OPTIONS,
          value,
          onChange,
        },
      ]}
      showCounter={false}
      onNext={onNext}
      ctaLabel="That's the one"
    />
  );
}
