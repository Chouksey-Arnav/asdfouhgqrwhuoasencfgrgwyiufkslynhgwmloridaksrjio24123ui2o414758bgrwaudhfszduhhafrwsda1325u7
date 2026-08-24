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
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, CheckRow, ToggleSwitch, MiniLineChart, Icon, useViewport, flowHue, C } from '../primitives';
import { R, meta, body, GLIDE, lit, panel } from '../design';

/** Answers laid out one or two across, depending on the window. */
export function AnswerGrid({ children, columns, count = 0 }) {
  const { width } = useViewport();
  const cols = columns ?? (width >= 760 && count >= 5 ? 2 : 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8, alignContent: 'start' }}>
      {children}
    </div>
  );
}

// (There is no SingleChoiceStep any more: every single-choice question in the
// flow now lives inside a GroupedStep alongside its siblings — see
// steps/grouped.jsx, which renders the same OptionRow list per question.)

export function ChecklistStep({ eyebrow, title, subtitle, icon, h, options, value, onToggle, onNext, min = 1, columns }) {
  const g = h || flowHue();
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} h={g} />
      <div style={{ flex: 1 }}>
        <AnswerGrid columns={columns} count={options.length}>
          {options.map(opt => (
            <CheckRow key={opt.value} checked={value.includes(opt.value)} onClick={() => onToggle(opt.value)} h={g}
              label={opt.label} sublabel={opt.sublabel} icon={opt.icon} />
          ))}
        </AnswerGrid>
      </div>
      <ContinueButton disabled={value.length < min} onClick={onNext} h={g}>
        {value.length < min ? 'Pick at least one to continue' : 'Continue'}
      </ContinueButton>
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
export function PlanPreferencesStep({ prefs, onChange, onNext, h }) {
  const g = h || flowHue();
  return (
    <>
      <StepHeader eyebrow="Almost done" icon="sliders" h={g}
        title="Two small choices about how your plan behaves."
        subtitle="Both are on by default because both are forgiving. You can change either one in Settings whenever you like." />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TogglePreferenceRow
          icon="trend-up" h={g}
          title="Count extra study time toward tomorrow"
          desc="Study more than planned today? We'll add the overflow to tomorrow's goal instead of throwing it away."
          value={prefs.addBack} onChange={v => onChange({ addBack: v })} />
        <TogglePreferenceRow
          icon="repeat" h={g}
          title="Roll unused time over"
          desc="Missed a session? We'll fold it into the next day's plan rather than marking the week a loss."
          value={prefs.rollover} onChange={v => onChange({ rollover: v })} />
      </div>
      <ContinueButton onClick={onNext} h={g}>Continue</ContinueButton>
    </>
  );
}

/** One setting row inside PlanPreferencesStep. */
export function TogglePreferenceRow({ icon, title, desc, value, onChange, h }) {
  const g = h || flowHue();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', borderRadius: R.md,
      background: value ? `linear-gradient(135deg, ${g.softer}, transparent 70%), ${C.surf}` : C.surf,
      border: `1px solid ${value ? g.edgeSoft : C.b1}`,
      boxShadow: C.shadowSm,
      transition: 'border-color .2s, background .2s',
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: R.sm, flexShrink: 0,
        background: value ? g.grad : C.s2, border: `1px solid ${value ? 'transparent' : C.b1}`,
        color: value ? g.onFill : C.t3, boxShadow: value ? lit(0.2) : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s, color .2s',
      }}>
        <Icon name={icon} size={19} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </span>
      <ToggleSwitch checked={value} onChange={onChange} h={g} />
    </div>
  );
}

// Illustrative progress graph screen — used for the spots in the flow that show
// an animated chart to build conviction right before or after a commitment
// moment.
export function ProofGraphStep({ eyebrow, title, subtitle, icon, h, lines, xLabels, statLine, legend, startLabel, endLabel, milestones, onNext, ctaLabel = 'Continue', autoNext }) {
  const g = h || flowHue();
  React.useEffect(() => {
    if (!autoNext) return;
    const t = setTimeout(onNext, autoNext);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} h={g} />
      <div style={{ flex: 1 }}>
        <div style={panel({ padding: '16px 16px 12px' })}>
          {legend && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              {legend.map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 3, borderRadius: 4, background: l.color }} />
                  <span style={{ fontSize: 11, color: C.t3 }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
          <MiniLineChart lines={lines} xLabels={xLabels} startLabel={startLabel} endLabel={endLabel} milestones={milestones} height={startLabel || endLabel ? 168 : 150} />
        </div>
        {statLine && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.6 }}
            style={{
              marginTop: 12, padding: '12px 16px', borderRadius: R.md,
              background: `linear-gradient(135deg, ${g.soft}, ${g.softer})`,
              border: `1px solid ${g.edgeSoft}`,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
            <span style={{ color: g.ink, display: 'flex', flexShrink: 0, marginTop: 4 }}><Icon name="sparkle" size={16} /></span>
            <p style={{ fontSize: 13, color: C.t1, fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{statLine}</p>
          </motion.div>
        )}
      </div>
      {!autoNext && <ContinueButton onClick={onNext} h={g}>{ctaLabel}</ContinueButton>}
    </>
  );
}
