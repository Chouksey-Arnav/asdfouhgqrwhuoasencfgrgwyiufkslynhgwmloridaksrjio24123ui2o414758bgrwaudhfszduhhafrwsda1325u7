import React from 'react';
import { GroupedStep } from './grouped';
import { SourceGrid } from './SourceStep';
import { flowAccentColor, C } from '../primitives';
import { inp } from '../../../lib/theme';

/**
 * The last screen: your name, and where you found us.
 *
 * It absorbed two former steps — the standalone "where did you hear about us?"
 * screen and the standalone "thank you for trusting us" screen, whose only
 * interaction was a Continue button. The thank-you is now the subtitle here,
 * which is where it actually belongs: said once, at the door, on the way in.
 */
export function SaveProgressStep({ account, value, onChange, source, onSource, onNext, accent = flowAccentColor() }) {
  return (
    <GroupedStep
      eyebrow="Last one"
      emoji="🎉"
      accent={accent}
      title="Your plan is ready to be built."
      subtitle="Thank you for trusting us with this. Getting into medicine can feel overwhelming — everything you just told us goes into making your path clear, structured, and honestly achievable."
      questions={[
        {
          key: 'name',
          prompt: 'What should we call you?',
          value: (value || '').trim(),
          onChange: () => {},
          render: () => (
            <div>
              <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="e.g., Alex" maxLength={40}
                style={inp({ fontSize: 16, padding: '15px 18px', borderRadius: 14 })}
                onKeyDown={e => { if (e.key === 'Enter' && value.trim() && source) onNext(); }} />
              <p style={{ fontSize: 12, color: C.t3, marginTop: 12, lineHeight: 1.6 }}>
                Everything you just told us is saved to <strong style={{ color: C.t2 }}>{account?.email}</strong> — synced across every device, and yours to change any time.
              </p>
            </div>
          ),
        },
        {
          key: 'source',
          prompt: 'Where did you hear about us?',
          hint: 'Last question, promise — it just helps us understand how students find MedSchoolPrep.',
          value: source,
          onChange: onSource,
          render: ({ accent: a }) => <SourceGrid value={source} onChange={onSource} accent={a} />,
        },
      ]}
      onNext={onNext}
      ctaLabel="Build my plan"
      footerNote={null}
      showCounter={false}
    />
  );
}
