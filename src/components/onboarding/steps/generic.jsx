// Generic, reusable step templates: the multi-select checklist, the plan
// preferences pair, and the animated proof graph. Between these and
// steps/grouped.jsx, most of the flow's screens are three components rather
// than twenty bespoke layouts.
//
// The lists lay out in two columns once there's room for them. On a phone
// that's still one column, but on a laptop a six-option list used to be a
// narrow ribbon down the middle of an empty screen — the answers now use the
// width the screen actually has, which also means fewer of them fall below the
// fold and fewer students scroll to find the Continue button.
import React from 'react';
import { PlusCircle, Repeat } from 'lucide-react';
import { StepHeader, ContinueButton, CheckRow, ToggleSwitch, MiniLineChart, useViewport, flowAccentColor, C, tint } from '../primitives';

/** Answers laid out one or two across, depending on the window. */
export function AnswerGrid({ children, columns, count = 0 }) {
  const { width } = useViewport();
  const cols = columns ?? (width >= 760 && count >= 5 ? 2 : 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 10, alignContent: 'start' }}>
      {children}
    </div>
  );
}

// (There is no SingleChoiceStep any more: every single-choice question in the
// flow now lives inside a GroupedStep alongside its siblings — see
// steps/grouped.jsx, which renders the same OptionRow list per question.)

export function ChecklistStep({ eyebrow, title, subtitle, emoji, accent, options, value, onToggle, onNext, min = 1, columns }) {
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} emoji={emoji} accent={accent} />
      <div style={{ flex: 1 }}>
        <AnswerGrid columns={columns} count={options.length}>
          {options.map(opt => (
            <CheckRow key={opt.value} checked={value.includes(opt.value)} onClick={() => onToggle(opt.value)} accent={accent}
              label={opt.label} sublabel={opt.sublabel} emoji={opt.emoji} />
          ))}
        </AnswerGrid>
      </div>
      <ContinueButton disabled={value.length < min} onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

/**
 * How the plan behaves — both toggles on one screen.
 *
 * These were a screen each, which is two page transitions spent on a pair of
 * checkboxes that most students will never change. Same settings, same copy,
 * one tap.
 */
export function PlanPreferencesStep({ prefs, onChange, onNext, accent = flowAccentColor() }) {
  return (
    <>
      <StepHeader eyebrow="Almost done" emoji="⚙️" accent={accent}
        title="Two small choices about how your plan behaves."
        subtitle="Both are on by default because both are forgiving. You can change either one in Settings whenever you like." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <TogglePreferenceRow
          icon={<PlusCircle size={22} color={accent} />} accent={accent}
          title="Count extra study time toward tomorrow"
          desc="Study more than planned today? We'll add the overflow to tomorrow's goal instead of throwing it away."
          value={prefs.addBack} onChange={v => onChange({ addBack: v })} />
        <TogglePreferenceRow
          icon={<Repeat size={22} color={accent} />} accent={accent}
          title="Roll unused time over"
          desc="Missed a session? We'll fold it into the next day's plan rather than marking the week a loss."
          value={prefs.rollover} onChange={v => onChange({ rollover: v })} />
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

/** One setting row inside PlanPreferencesStep. */
export function TogglePreferenceRow({ icon, title, desc, value, onChange, accent = flowAccentColor() }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 15, background: C.surf, border: `1px solid ${value ? tint(accent, 0.35) : C.b1}`, transition: 'border-color .18s' }}>
      <span style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.t3, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </span>
      <ToggleSwitch checked={value} onChange={onChange} />
    </div>
  );
}

// Illustrative "social proof" / progress graph screen — reused for the spots in
// the flow that show an animated chart to build conviction right before or
// after a commitment moment.
export function ProofGraphStep({ eyebrow, title, subtitle, emoji, accent, lines, xLabels, statLine, legend, startLabel, endLabel, milestones, onNext, ctaLabel = 'Continue', autoNext }) {
  React.useEffect(() => {
    if (!autoNext) return;
    const t = setTimeout(onNext, autoNext);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} emoji={emoji} accent={accent} />
      <div style={{ flex: 1 }}>
        <div style={{ background: C.surf, border: `1px solid ${C.b1}`, borderRadius: 16, padding: '20px 18px 14px' }}>
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
          <MiniLineChart lines={lines} xLabels={xLabels} startLabel={startLabel} endLabel={endLabel} milestones={milestones} height={startLabel || endLabel ? 168 : 150} />
        </div>
        {statLine && (
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.greenDim, border: `1px solid ${tint(C.green, 0.25)}`, fontSize: 13, color: C.greenL, fontWeight: 600, lineHeight: 1.5 }}>
            {statLine}
          </div>
        )}
      </div>
      {!autoNext && <ContinueButton onClick={onNext}>{ctaLabel}</ContinueButton>}
    </>
  );
}
