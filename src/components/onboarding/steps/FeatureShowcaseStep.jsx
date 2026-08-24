import React from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, Icon, useViewport, flowHue, C } from '../primitives';
import { hue, R, meta, numeral, GLIDE, POP, lit } from '../design';

// The "everything you need, in one place" moment. Instead of telling students
// the app works, it shows the actual product surface: every card below is a
// real pillar of the app they're about to land in. Every card must stay a
// pillar they can actually open — the SAT/test-prep card was removed with the
// SAT pillar (src/lib/betaFlags.js), because a promise on this screen that
// lands on a locked tab is the worst possible first impression.
//
// Each pillar carries its OWN hue pair rather than the chapter's. This is the
// one screen in the flow where that's right: it is a map of six different
// places, and six cards in one color would read as one place with six rows.
// The chapter hue still owns the header and the button, so the screen stays
// anchored to where the student is in the journey.
const FEATURES = [
  { icon: 'stethoscope', hues: ['teal', 'emerald'], title: 'Pathway Diagnostic', desc: 'Find your fit in medicine — specialty by specialty, honestly scored' },
  { icon: 'brain', hues: ['violet', 'indigo'], title: 'AI Coach', desc: 'A mentor that knows your goals, your gaps, and your week' },
  { icon: 'books', hues: ['sky', 'cyan'], title: 'Medical E-Library', desc: 'Structured lessons across the sciences medicine is built on' },
  { icon: 'compass', hues: ['amber', 'orange'], title: 'Opportunities & Scholarships', desc: 'Real programs, internships, and funding — matched to you' },
  { icon: 'clipboard-plus', hues: ['rose', 'pink'], title: 'Application Portfolio', desc: 'Essays, activities, college list — your story, built as you go' },
  { icon: 'petri', hues: ['emerald', 'lime'], title: 'Quizzes & Flashcards', desc: 'Spaced repetition across the sciences, scheduled into your week' },
];

export function FeatureShowcaseStep({ onNext }) {
  const g = flowHue();
  const { width } = useViewport();
  const cols = width >= 760 ? 2 : 1;
  return (
    <>
      <StepHeader eyebrow="Everything, one place" icon="grid-map" h={g}
        title="The complete path into medicine."
        subtitle="Most students stitch this together from six apps and a guidance counselor. Yours lives in one plan." />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 8 }}>
          {FEATURES.map((f, i) => {
            const fg = hue(f.hues);
            return (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...GLIDE, delay: 0.1 + i * 0.07 }}
                style={{
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px',
                  borderRadius: R.md, background: C.surf, border: `1px solid ${C.b1}`, boxShadow: C.shadowSm,
                }}>
                {/* A hairline of the pillar's own color down the left edge —
                    enough identity to tell six things apart, not so much that
                    the page becomes a paint chart. */}
                <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, borderRadius: 4, background: fg.bar }} />
                <span style={{
                  width: 36, height: 36, borderRadius: R.sm, flexShrink: 0, marginLeft: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: fg.soft, border: `1px solid ${fg.edgeSoft}`, color: fg.ink,
                }}>
                  <Icon name={f.icon} size={18} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{f.title}</div>
                  <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 4 }}>{f.desc}</div>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
      <ContinueButton onClick={onNext} h={g}>This is what I've been missing</ContinueButton>
    </>
  );
}
