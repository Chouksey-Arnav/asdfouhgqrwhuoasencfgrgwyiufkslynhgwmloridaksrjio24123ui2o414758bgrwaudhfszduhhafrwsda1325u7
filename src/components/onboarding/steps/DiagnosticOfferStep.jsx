// ─────────────────────────────────────────────────────────────────────────────
// "I already know my pathway."
//
// The pathway diagnostic is six minutes and about twenty questions, and it is
// the single longest thing between signing up and using the product. For a
// student who genuinely does not know what draws them, that is six minutes very
// well spent. For the large share of juniors, seniors, and students from
// healthcare families who walked in already knowing — a real share, not an edge
// case — it is a toll charged before they have seen any value at all, and the
// people most likely to pay it are the people least likely to need it.
//
// So the skip is VISIBLE. Not a grayed "no thanks" under the fold, not a back
// gesture: a real, equally weighted choice, sitting beside the diagnostic, that
// asks for the one thing the diagnostic exists to produce — the pathway — and
// then gets out of the way.
//
// Skipping is not the end of the diagnostic. It is re-offered later, once, as
// optional, with the framing that is both true and actually persuasive: students
// who take it often find a SECOND pathway worth a look. See
// shouldReofferDiagnostic() in src/lib/onboardingFlow.js.
//
// This screen only appears in the APPLY flow (see buildSteps in Onboarding.jsx),
// where the case for offering the skip up front is strongest; the same skip is
// on the diagnostic screen itself in the app, for every band.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, OptionRow, C } from '../primitives';
import { R, POP } from '../design';
import { play } from '../../../lib/sounds';
import { PATHS } from '../../../data/constants';
import { PATHWAY_SKIP_LABEL } from '../../../lib/onboardingFlow';

const CHOICES = [
  {
    value: 'take',
    icon: 'compass',
    label: 'Take the diagnostic',
    sublabel: 'About six minutes. It reads how you think, not what you already know.',
  },
  {
    value: 'know',
    icon: 'flag-check',
    label: PATHWAY_SKIP_LABEL,
    sublabel: 'Pick it here and go straight to your deadlines. You can retake the diagnostic any time.',
  },
];

function PathwayPicker({ value, onChange, g }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
      {Object.entries(PATHS).map(([key, p]) => {
        const sel = value === key;
        return (
          <motion.button key={key} data-testid="onboarding-option"
            whileTap={{ scale: 0.97 }} transition={POP} aria-pressed={sel}
            onClick={() => { play('select'); onChange(key); }}
            style={{
              textAlign: 'left', padding: '12px 12px', borderRadius: R.md, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FB,
              background: sel ? `linear-gradient(160deg, ${g.soft}, ${g.softer})` : C.surf,
              border: `1px solid ${sel ? g.edge : C.b1}`,
              boxShadow: sel ? g.glowSm : C.shadowSm,
              transition: 'background .18s, border-color .18s',
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: p.accent, flexShrink: 0 }} />
              {p.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function DiagnosticOfferStep({ value, onChange, onNext, h }) {
  const g = h;
  const choice = value.skipDiagnostic ? 'know' : (value.diagnosticChoice || null);
  const ready = choice === 'take' || (choice === 'know' && !!value.pathway);

  return (
    <>
      <StepHeader
        eyebrow="Your pathway"
        icon="compass"
        h={g}
        title="Do you already know what you're aiming at?"
        subtitle="Plenty of seniors do — and if you do, there is no reason for us to spend six of your minutes confirming it. Either answer is a good answer."
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CHOICES.map(c => (
          <OptionRow key={c.value}
            selected={choice === c.value}
            label={c.label}
            sublabel={c.sublabel}
            h={g}
            icon={c.icon}
            onClick={() => {
              onChange(c.value === 'know'
                ? { diagnosticChoice: 'know', skipDiagnostic: true }
                : { diagnosticChoice: 'take', skipDiagnostic: false, pathway: null });
            }}
          />
        ))}

        {choice === 'know' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={POP} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>
              Which one?
            </div>
            <PathwayPicker value={value.pathway} onChange={p => onChange({ pathway: p })} g={g} />
            <p style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, marginTop: 12 }}>
              Nothing here is locked in — switching pathways takes one click, and the diagnostic
              stays on your Pathways screen for whenever you want a second opinion.
            </p>
          </motion.div>
        )}
      </div>
      <ContinueButton onClick={onNext} disabled={!ready} h={g}>
        {choice === 'know' ? 'Take me to my deadlines' : 'Continue'}
      </ContinueButton>
    </>
  );
}

export default DiagnosticOfferStep;
