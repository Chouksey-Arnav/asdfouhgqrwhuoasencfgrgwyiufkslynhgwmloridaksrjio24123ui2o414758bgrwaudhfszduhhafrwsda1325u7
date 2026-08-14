import React from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, BrainCircuit, Library, Compass, FolderHeart, GraduationCap } from 'lucide-react';
import { StepHeader, ContinueButton, C } from '../primitives';

// The "everything you need, in one place" moment. Instead of telling students
// the app works, it shows the actual product surface: every card below is a
// real pillar of the app they're about to land in. Every card must stay a
// pillar they can actually open — the SAT/test-prep card was removed with the
// SAT pillar (src/lib/betaFlags.js), because a promise on this screen that
// lands on a locked tab is the worst possible first impression.
const FEATURES = [
  { icon: Stethoscope, color: C.tealL, dim: C.tealDim, title: 'Pathway Diagnostic', desc: 'Find your fit in medicine — specialty by specialty, honestly scored' },
  { icon: BrainCircuit, color: C.violetL, dim: C.violetDim, title: 'AI Coach', desc: 'A mentor that knows your goals, your gaps, and your week' },
  { icon: Library, color: C.blueL, dim: C.blueDim, title: 'Medical E-Library', desc: 'Structured lessons across the sciences medicine is built on' },
  { icon: Compass, color: C.amberL, dim: C.amberDim, title: 'Opportunities & Scholarships', desc: 'Real programs, internships, and funding — matched to you' },
  { icon: FolderHeart, color: C.roseL, dim: C.roseDim, title: 'Application Portfolio', desc: 'Essays, activities, college list — your story, built as you go' },
  { icon: GraduationCap, color: C.greenL, dim: C.greenDim, title: 'Quizzes & Flashcards', desc: 'Spaced repetition across the sciences, scheduled into your week' },
];

export function FeatureShowcaseStep({ onNext }) {
  return (
    <>
      <StepHeader eyebrow="Everything, one place" title="The complete path into medicine." subtitle="Most students stitch this together from six apps and a guidance counselor. Yours lives in one plan." />
      <div style={{ flex: 1 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
            style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '12px 14px', borderRadius: 13, background: C.surf, border: `1px solid ${C.b1}`, marginBottom: 9 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: f.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <f.icon size={19} color={f.color} />
            </span>
            <span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.45, marginTop: 1 }}>{f.desc}</div>
            </span>
          </motion.div>
        ))}
      </div>
      <ContinueButton onClick={onNext}>This is what I've been missing</ContinueButton>
    </>
  );
}
