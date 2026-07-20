// Generic, reusable step templates. Cal AI's own 30-screen flow reuses a
// handful of screen templates over and over (single-choice list, multi-select
// checklist, animated proof graph, toggle question) — mirroring that here
// keeps ~20 of the 30 screens driven by 4 components instead of 20 bespoke ones.
import React from 'react';
import { StepHeader, ContinueButton, OptionRow, CheckRow, ToggleSwitch, MiniLineChart, C } from '../primitives';

export function SingleChoiceStep({ eyebrow, title, subtitle, options, value, onChange, onNext, ctaLabel = 'Continue' }) {
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div style={{ flex: 1 }}>
        {options.map(opt => (
          <OptionRow key={opt.value} selected={value === opt.value} onClick={() => onChange(opt.value)}
            label={opt.label} sublabel={opt.sublabel} icon={opt.icon} dots={opt.dots} />
        ))}
      </div>
      <ContinueButton disabled={value == null} onClick={onNext}>{ctaLabel}</ContinueButton>
    </>
  );
}

export function ChecklistStep({ eyebrow, title, subtitle, options, value, onToggle, onNext, min = 1 }) {
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div style={{ flex: 1 }}>
        {options.map(opt => (
          <CheckRow key={opt.value} checked={value.includes(opt.value)} onClick={() => onToggle(opt.value)} label={opt.label} sublabel={opt.sublabel} />
        ))}
      </div>
      <ContinueButton disabled={value.length < min} onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

export function ToggleQuestionStep({ icon, title, subtitle, note, value, onChange, onNext }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.blueDim, border: `1px solid ${C.b2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <StepHeader title={title} subtitle={subtitle} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{value ? 'Enabled' : 'Disabled'}</span>
          <ToggleSwitch checked={value} onChange={onChange} />
        </div>
        {note && <p style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, marginTop: 16 }}>{note}</p>}
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

// Illustrative "social proof" / progress graph screen — reused for the four
// spots in the Cal AI flow that show an animated chart to build conviction
// right before/after a commitment moment (steps 7, 12, 14, 18).
export function ProofGraphStep({ eyebrow, title, subtitle, lines, xLabels, statLine, legend, onNext, ctaLabel = 'Continue', autoNext }) {
  React.useEffect(() => {
    if (!autoNext) return;
    const t = setTimeout(onNext, autoNext);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16, padding: '20px 18px 14px' }}>
          {legend && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              {legend.map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: C.t3 }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
          <MiniLineChart lines={lines} xLabels={xLabels} />
        </div>
        {statLine && (
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.greenDim, border: `1px solid rgba(16,185,129,0.25)`, fontSize: 13, color: C.greenL, fontWeight: 600, lineHeight: 1.5 }}>
            {statLine}
          </div>
        )}
      </div>
      {!autoNext && <ContinueButton onClick={onNext}>{ctaLabel}</ContinueButton>}
    </>
  );
}
