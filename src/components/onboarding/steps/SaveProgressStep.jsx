import React, { useState } from 'react';
import { GroupedStep } from './grouped';
import { SourceGrid } from './SourceStep';
import { Icon, flowHue, C } from '../primitives';
import { R, focusRing } from '../design';

/**
 * The last screen: your name, and where you found us.
 *
 * It absorbed two former steps — the standalone "where did you hear about us?"
 * screen and the standalone "thank you for trusting us" screen, whose only
 * interaction was a Continue button. The thank-you is now the subtitle here,
 * which is where it actually belongs: said once, at the door, on the way in.
 */
function NameField({ value, onChange, account, onSubmit, g }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', color: focused ? g.ink : C.t3, pointerEvents: 'none', transition: 'color .18s',
        }}>
          <Icon name="id-card" size={17} />
        </span>
        <input
          autoFocus value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="e.g., Alex" maxLength={40} aria-label="What should we call you?"
          // WCAG 1.3.5. This is the student's own given name, so it carries the
          // token for one — which is what lets a password manager, an assistive
          // tool, or the browser itself fill it, and what lets a symbol-based
          // AAC user get an icon for the field instead of a text label.
          autoComplete="given-name"
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onSubmit?.(); }}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '16px 16px 16px 40px', borderRadius: R.md, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 600,
            background: C.inputBg, color: C.t1, fontFamily: C.FB,
            border: `1px solid ${focused ? g.edge : C.inputBorder}`,
            transition: 'border-color .18s',
            ...(focused ? focusRing(g) : null),
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: C.t3, marginTop: 12, lineHeight: 1.55 }}>
        Everything you just told us is saved to <strong style={{ color: C.t2 }}>{account?.email}</strong> — synced across every device, and yours to change any time.
      </p>
    </div>
  );
}

export function SaveProgressStep({ account, value, onChange, source, onSource, onNext, h }) {
  const g = h || flowHue();
  return (
    <GroupedStep
      eyebrow="Last one"
      icon="flag-check"
      h={g}
      title="Your plan is ready to be built."
      subtitle="Thank you for trusting us with this. Getting into medicine can feel overwhelming — everything you just told us goes into making your path clear, structured, and honestly achievable."
      questions={[
        {
          key: 'name',
          prompt: 'What should we call you?',
          value: (value || '').trim(),
          onChange: () => {},
          render: ({ h: hh }) => (
            <NameField value={value} onChange={onChange} account={account} g={hh}
              onSubmit={() => { if ((value || '').trim() && source) onNext(); }} />
          ),
        },
        {
          key: 'source',
          prompt: 'Where did you hear about us?',
          hint: 'Last question, promise — it just helps us understand how students find MedSchoolPrep.',
          value: source,
          onChange: onSource,
          render: ({ h: hh }) => <SourceGrid value={source} onChange={onSource} h={hh} />,
        },
      ]}
      onNext={onNext}
      ctaLabel="Build my plan"
      footerNote={null}
      showCounter={false}
    />
  );
}
