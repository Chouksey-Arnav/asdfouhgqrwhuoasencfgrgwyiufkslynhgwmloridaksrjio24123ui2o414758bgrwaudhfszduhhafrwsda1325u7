// ─────────────────────────────────────────────────────────────────────────────
// The grouped question screen — the single biggest change to how long this
// flow feels.
//
// The old flow asked ten related things across ten screens: "why medicine?"
// [Next] "who do you want to be?" [Next] "how sure are you?" [Next]. Three taps
// on three screens for one topic, and the student counts screens, not topics.
//
// A GroupedStep puts one TOPIC on one screen and reveals its questions in
// immediate sequence: answer the first and the second animates in beneath it,
// already scrolled to. The student still answers everything they answered
// before — nothing was dropped to make the flow shorter — but ten screens
// became three or four, and the rhythm inside a screen is "and one more thing"
// rather than a page transition.
//
// A question the student has already answered stays visible and editable —
// this is a screen, not a stack.
//
// ── The numbering, in the redesign ───────────────────────────────────────────
// Each question is introduced by a mono numeral on a hairline plate that fills
// with the chapter gradient once it's answered, and a rule runs from it to the
// edge of the column. That gives a grouped screen a visible spine, so three
// questions read as three steps of one thing rather than as three stacked
// forms — which is the layout problem the old bullet-and-heading version never
// solved.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { StepHeader, ContinueButton, OptionRow, CheckRow, flowHue, C } from '../primitives';
import { R, meta, numeral, GLIDE, GLIDE_FAST, POP, lit } from '../design';
import { AnswerGrid } from './generic';

const isAnswered = (q) => {
  if (typeof q.answered === 'function') return q.answered(q.value);
  if (Array.isArray(q.value)) return q.value.length > 0;
  return q.value != null && q.value !== '';
};

function QuestionBlock({ q, index, g, revealed, isLast }) {
  const ref = useRef(null);
  const answered = isAnswered(q);

  // Bring a freshly revealed question into view — a reveal the student has to
  // discover by scrolling is worse than a second screen would have been.
  useEffect(() => {
    if (!revealed || index === 0) return;
    const t = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180);
    return () => clearTimeout(t);
  }, [revealed, index]);

  return (
    <motion.div ref={ref}
      initial={index === 0 ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={GLIDE}
      style={{ paddingBottom: isLast ? 0 : 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: answered ? g.grad : 'transparent',
          border: answered ? 'none' : `1px solid ${g.edge}`,
          boxShadow: answered ? lit(0.22) : 'none',
          transition: 'background .2s, border-color .2s',
          ...numeral(10.5, { color: answered ? g.onFill : g.ink }),
        }}>
          {answered
            ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={POP} style={{ display: 'flex' }}><Check size={12} strokeWidth={3.5} /></motion.span>
            : index + 1}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em', lineHeight: 1.3 }}>{q.prompt}</span>
        <span style={{ flex: 1, height: 1, minWidth: 10, background: `linear-gradient(90deg, ${answered ? g.edge : C.b1}, transparent)` }} />
      </div>

      {q.hint && <p style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, margin: '-2px 0 12px', paddingLeft: 32 }}>{q.hint}</p>}

      {q.render ? q.render({ h: g, accent: g.base }) : (
        <AnswerGrid columns={q.columns} count={q.options?.length || 0}>
          {(q.options || []).map(opt => (
            q.type === 'multi' ? (
              <CheckRow key={opt.value} checked={(q.value || []).includes(opt.value)} onClick={() => q.onChange(opt.value)}
                h={g} label={opt.label} sublabel={opt.sublabel} icon={opt.icon} />
            ) : (
              <OptionRow key={opt.value} selected={q.value === opt.value} onClick={() => q.onChange(opt.value)}
                h={g} label={opt.label} sublabel={opt.sublabel} icon={opt.icon} meter={opt.meter} dots={opt.dots} />
            )
          ))}
        </AnswerGrid>
      )}
    </motion.div>
  );
}

/**
 * @param questions [{ key, prompt, hint, type:'single'|'multi', options, value,
 *                     onChange, optional, columns, render }]
 *   `render` escapes the list layout for the questions that aren't lists
 *   (wheel pickers, sliders, text inputs) while keeping the numbering, the
 *   reveal and the shared Continue.
 */
export function GroupedStep({ eyebrow, title, subtitle, icon, h, questions, onNext, ctaLabel = 'Continue', footerNote, showCounter = true }) {
  const g = h || flowHue();

  // How far down the list the student has got. A question is visible once every
  // required question before it has an answer.
  const revealCount = useMemo(() => {
    let n = 1;
    for (let i = 0; i < questions.length; i += 1) {
      if (isAnswered(questions[i]) || questions[i].optional) n = i + 2;
      else break;
    }
    return Math.min(questions.length, n);
  }, [questions]);

  const answeredCount = questions.filter(isAnswered).length;
  const allAnswered = questions.every(q => q.optional || isAnswered(q));

  return (
    <>
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} h={g} compact />

      {/* The in-screen twin of the chapter bar up top. A grouped screen must
          never feel open-ended. */}
      {showCounter && questions.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {questions.map((q, i) => (
              <motion.span key={q.key}
                animate={{ width: isAnswered(q) ? 22 : 11, opacity: i < revealCount ? 1 : 0.3 }}
                transition={GLIDE_FAST}
                style={{ height: 4, borderRadius: 2, background: isAnswered(q) ? g.bar : C.b3, display: 'block' }} />
            ))}
          </div>
          <span style={meta(9.5, { color: C.t3 })}>{answeredCount} of {questions.length} answered</span>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <AnimatePresence initial={false}>
          {questions.slice(0, revealCount).map((q, i) => (
            <QuestionBlock key={q.key} q={q} index={i} g={g} revealed={i < revealCount} isLast={i === revealCount - 1} />
          ))}
        </AnimatePresence>
        {footerNote && <p style={{ fontSize: 12, color: C.t4, lineHeight: 1.6, marginTop: 18 }}>{footerNote}</p>}
      </div>

      <ContinueButton disabled={!allAnswered} onClick={onNext} h={g}>
        {allAnswered ? ctaLabel : `Answer ${questions.length - answeredCount} more to continue`}
      </ContinueButton>
    </>
  );
}
