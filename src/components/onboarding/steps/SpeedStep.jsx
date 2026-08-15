// Daily time commitment.
//
// ── Why this stopped being an `<input type="range">` ─────────────────────────
// Minutes are the one thing every student can actually control, so this is the
// most consequential control in the flow — and it was a native range input with
// `accentColor` set, which renders as a different widget in every browser, has
// a thumb that can't be styled inline (the pseudo-elements need a stylesheet
// this app doesn't have), and gives no feedback beyond a number changing.
//
// It is now four stops on a track: the fill runs in the chapter gradient, the
// thumb travels between notches, and — the part that matters — a seven-day
// preview grows underneath it as the student moves. The question is "how much
// time can you give this each day", and the honest way to help someone answer
// it is to show them what that week actually looks like, not to make them
// imagine it from the number 40.
//
// It keeps full keyboard semantics: role="slider", arrow keys, Home/End.
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { StepHeader, ContinueButton, Icon, flowHue, C } from '../primitives';
import { R, meta, display, body, numeral, GLIDE, GLIDE_FAST, POP, SETTLE, lit, panel } from '../design';
import { COMMIT_LEVELS, commitmentIntel } from '../personalize';
import { play } from '../../../lib/sounds';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_MINUTES = COMMIT_LEVELS[COMMIT_LEVELS.length - 1].minutes;

/** Seven bars, one per day, at the height the chosen pace implies. */
function WeekPreview({ minutes, g }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 74 }}>
        {DAYS.map((d, i) => {
          // Weekends sit a little lower than weekdays. Showing seven identical
          // bars would be a promise the plan doesn't make.
          const factor = i >= 5 ? 0.72 : 1;
          const pct = Math.max(0.08, (minutes / MAX_MINUTES) * factor);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: '100%', height: 56, display: 'flex', alignItems: 'flex-end', borderRadius: 6, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b0}` }}>
                <motion.div
                  animate={{ height: `${pct * 100}%` }}
                  transition={{ ...SETTLE, delay: i * 0.02 }}
                  style={{ width: '100%', background: g.bar, boxShadow: lit(0.2) }} />
              </div>
              <span style={meta(8.5, { color: C.t4, letterSpacing: '.08em' })}>{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The four-stop track. */
function PaceTrack({ index, onChange, g }) {
  const ref = useRef(null);
  const last = COMMIT_LEVELS.length - 1;
  const pct = last ? (index / last) * 100 : 0;

  const move = (next) => {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === index) return;
    play('click');
    onChange(clamped);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Minutes a day"
      aria-valuemin={0} aria-valuemax={last} aria-valuenow={index}
      aria-valuetext={`${COMMIT_LEVELS[index].minutes} minutes a day, ${COMMIT_LEVELS[index].label}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); move(index + 1); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); move(index - 1); }
        if (e.key === 'Home') { e.preventDefault(); move(0); }
        if (e.key === 'End') { e.preventDefault(); move(last); }
      }}
      style={{ position: 'relative', padding: '18px 0 4px', cursor: 'pointer', outline: 'none' }}
    >
      {/* Track */}
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: C.s3, margin: '0 11px' }}>
        <motion.div animate={{ width: `${pct}%` }} transition={SETTLE}
          style={{ position: 'absolute', inset: 0, right: 'auto', borderRadius: 3, background: g.bar, boxShadow: `0 0 12px ${g.edge}` }} />
        {COMMIT_LEVELS.map((lvl, i) => {
          const passed = i <= index;
          return (
            <button key={lvl.label} type="button" aria-label={`${lvl.minutes} minutes a day`}
              onClick={() => move(i)}
              style={{
                position: 'absolute', top: '50%', left: `${last ? (i / last) * 100 : 0}%`,
                transform: 'translate(-50%,-50%)', width: 22, height: 22, padding: 0,
                borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                // Stops already passed sit ON the filled track, so they read as
                // notches in it rather than as a second thumb.
                background: passed ? 'rgba(255,255,255,0.45)' : C.s5,
                border: `1px solid ${passed ? 'transparent' : C.b2}`,
                opacity: i === index ? 0 : 1, transition: 'background .18s, opacity .12s',
              }} />
            </button>
          );
        })}
        {/* Thumb */}
        <motion.span
          animate={{ left: `${pct}%` }} transition={SETTLE}
          style={{
            position: 'absolute', top: '50%', width: 22, height: 22, marginTop: -11, marginLeft: -11,
            borderRadius: '50%', background: '#fff', pointerEvents: 'none',
            boxShadow: `0 2px 10px rgba(0,0,0,0.28), 0 0 0 4px ${g.softer}`,
            border: `2px solid ${g.base}`,
          }} />
      </div>

      {/* Stop labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        {COMMIT_LEVELS.map((lvl, i) => (
          <button key={lvl.label} type="button" onClick={() => move(i)}
            style={{
              flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              textAlign: i === 0 ? 'left' : i === last ? 'right' : 'center',
              fontFamily: C.FB,
            }}>
            <span style={{
              display: 'block', fontSize: 11.5, fontWeight: i === index ? 800 : 600,
              color: i === index ? g.ink : C.t4, transition: 'color .18s',
            }}>{lvl.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SpeedStep({ value, answers, onChange, onNext, h }) {
  const g = h || flowHue();
  const idx = value ?? 1;
  const intel = commitmentIntel(answers, idx);

  return (
    <>
      <StepHeader eyebrow="Your commitment" icon="bolt" h={g}
        title="How much time can you give this each day?"
        subtitle="Your whole plan — coursework, experiences, and application — is paced around this. Honest beats heroic." />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
        {/* The readout */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12 }}>
          <motion.div key={intel.minutes} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={GLIDE_FAST}
            style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={numeral(52, { color: C.t1, fontWeight: 800, letterSpacing: '-.04em' })}>{intel.minutes}</span>
            <span style={meta(11, { color: C.t3 })}>min / day</span>
          </motion.div>
          {intel.recommended && (
            <motion.span initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={POP}
              style={{
                marginBottom: 8, padding: '4px 10px', borderRadius: R.pill,
                background: g.soft, border: `1px solid ${g.edgeSoft}`,
                ...meta(9, { color: g.ink }),
              }}>Recommended</motion.span>
          )}
        </div>

        <PaceTrack index={idx} onChange={onChange} g={g} />

        {/* What that week actually looks like. */}
        <div style={panel({ padding: '16px 16px 12px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <span style={{ width: 14, height: 1, background: g.edge }} />
            <span style={meta(9.5, { color: C.t3 })}>Your week at this pace</span>
            <span style={{ flex: 1 }} />
            <span style={numeral(10.5, { color: g.ink })}>{intel.hours} hrs</span>
          </div>
          <WeekPreview minutes={intel.minutes} g={g} />
        </div>

        <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={GLIDE_FAST}
          style={{
            padding: '14px 16px', borderRadius: R.md,
            background: `linear-gradient(135deg, ${g.softer}, transparent 70%), ${C.surf}`,
            border: `1px solid ${g.edgeSoft}`,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
            <span style={{ display: 'flex', color: g.ink }}><Icon name="route" size={14} /></span>
            <span style={meta(9.5, { color: g.ink })}>{intel.split}</span>
          </div>
          <p style={body(13, { margin: 0 })}>{intel.desc}</p>
        </motion.div>
      </div>

      <ContinueButton onClick={onNext} h={g}>Continue</ContinueButton>
    </>
  );
}
