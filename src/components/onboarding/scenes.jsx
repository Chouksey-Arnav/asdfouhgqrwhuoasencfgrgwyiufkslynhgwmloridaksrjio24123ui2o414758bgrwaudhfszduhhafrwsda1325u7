// ─────────────────────────────────────────────────────────────────────────────
// The story rail — the left half of the onboarding screen on a desktop-sized
// window, and a compact strip above the question on a phone.
//
// ── What it used to be, and why that wasn't enough ───────────────────────────
// The rail was a large emoji floating inside two rotating dashed rings, with
// the chapter name under it and a checklist beneath that. It solved the layout
// problem (a 460px column stranded in a sea of gray on a laptop) and none of
// the design one: a spinning ring around a 🩺 is motion without meaning, and
// the panel said the same thing on screen four as on screen fourteen. Nothing
// on it was ever about the student.
//
// So the rail is now their chart, and it is written while they watch. Answer
// "I want to help people" and the WHY row lands a beat later, in their words.
// Move the daily-minutes slider and the heartbeat under the chart changes
// amplitude. By the plan screen the whole left half of the window is a document
// they filled in themselves — which is the honest version of "personalized",
// as opposed to asserting it in a subtitle.
//
// Everything is drawn inline (SVG + framer-motion). Nothing loads an image: the
// app is an offline-capable PWA and a funnel that depends on a CDN is a funnel
// that breaks on school wifi.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { C, tint } from '../../lib/theme';
import { Icon } from './icons';
import { chapterHue, R, meta, display, body, numeral, pad2, chartPaper, lit, GLIDE, GLIDE_FAST, POP, step } from './design';
import { useReducedMotion, MeterBars } from './primitives';
import { chartRows, chartProgress, chartStatus, traceEnergy } from './chart';
import { EKGLine } from './brand';

// ─────────────────────────────────────────────────────────────────────────────
// The chapter mark
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The chapter's icon on a filled plate, with a slow halo behind it.
 *
 * `size` drives everything, so the same component is a 52px mark in the rail
 * and a 30px badge in the mobile header. The halo is the flow's only piece of
 * looping ambient motion, and it stops entirely under prefers-reduced-motion.
 */
export function ChapterMark({ mark, chapterKey, size = 52, pulse = true }) {
  const g = chapterHue(chapterKey);
  const reduced = useReducedMotion();
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {pulse && !reduced && [0, 1].map(i => (
        <motion.span key={i}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.4, 0], scale: [1, 1.65] }}
          transition={{ duration: 3.4, delay: i * 1.7, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: size * 0.32, border: `1.5px solid ${g.edge}`, pointerEvents: 'none' }}
        />
      ))}
      <motion.div
        key={chapterKey}
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}
        style={{
          width: size, height: size, borderRadius: size * 0.32,
          background: g.grad, color: g.onFill,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `${g.glow}, ${lit(0.22)}`,
        }}>
        <Icon name={mark} size={Math.round(size * 0.46)} stroke={1.7} />
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The live chart
// ─────────────────────────────────────────────────────────────────────────────

/** One recorded (or not-yet-recorded) line of the chart. */
function ChartRow({ row, g, index }) {
  const filled = !row.pending;
  return (
    <motion.div
      layout="position"
      initial={false}
      animate={{ opacity: filled ? 1 : 0.42 }}
      transition={GLIDE_FAST}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 8px', borderRadius: R.xs,
        background: filled ? g.softer : 'transparent',
        borderLeft: `2px solid ${filled ? g.base : C.b1}`,
      }}>
      <span style={{ display: 'flex', color: filled ? g.ink : C.t4, flexShrink: 0 }}>
        <Icon name={row.icon} size={14} stroke={1.7} />
      </span>
      <span style={{ ...meta(9, { color: C.t4, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }), flexShrink: 0, minWidth: 62 }}>{row.label}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        {row.meter && filled && <MeterBars level={row.meter.value} of={Math.min(6, row.meter.of)} h={g} height={12} />}
        <AnimatePresence mode="wait" initial={false}>
          {filled ? (
            <motion.span key={row.value}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={GLIDE_FAST}
              style={{
                fontSize: 11.5, fontWeight: 700, color: C.t1, fontFamily: C.FB,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 132, textAlign: 'right',
              }}>
              {row.value}
            </motion.span>
          ) : (
            <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: 34, height: 2, borderRadius: 4, background: C.b2, display: 'block' }} />
          )}
        </AnimatePresence>
      </span>
    </motion.div>
  );
}

/** The chart panel: a header readout and one row per thing we ask about. */
function LiveChart({ answers, g }) {
  const rows = chartRows(answers);
  const { done, total } = chartProgress(answers);
  return (
    // Opaque, not glass: the graph paper behind the rail would otherwise show
    // through the panel but not through the rows sitting on it, which inverted
    // the whole effect — recorded rows read as blank cutouts over the grid.
    <div style={{
      width: '100%', borderRadius: R.lg, overflow: 'hidden',
      background: C.s1, border: `1px solid ${C.b1}`, boxShadow: C.shadowSm,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderBottom: `1px solid ${C.b1}`, background: g.softer,
      }}>
        <motion.span
          animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: g.base, boxShadow: `0 0 8px ${g.base}`, flexShrink: 0 }} />
        <span style={meta(9.5, { color: C.t2 })}>Your chart</span>
        <span style={{ flex: 1 }} />
        <span style={numeral(10.5, { color: g.ink })}>{pad2(done)}<span style={{ color: C.t4 }}>/{pad2(total)}</span></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
        {rows.map((row, i) => <ChartRow key={row.key} row={row} g={g} index={i} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The rail
// ─────────────────────────────────────────────────────────────────────────────

/** The chapters as a spine of numbered ticks down the rail's footer. */
function ChapterTicks({ chapters, activeIndex, g }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
      {chapters.map((ch, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={ch.key} style={{ flex: active ? 2.2 : 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 200ms cubic-bezier(.4,0,.2,1)' }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done || active ? g.grad : 'transparent',
              border: done || active ? 'none' : `1px solid ${C.b2}`,
              boxShadow: active ? g.glowSm : 'none',
              ...numeral(9, { color: done || active ? g.onFill : C.t4 }),
            }}>{done ? <Check size={11} strokeWidth={3.4} /> : i + 1}</span>
            {active && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ fontSize: 11, fontWeight: 700, color: C.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ch.label}
              </motion.span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The full rail. Rendered only when there's room for it (see OnboardingShell) —
 * on a phone the same information is carried by ChartStrip in the header.
 */
export function StoryRail({ chapter, chapters, chapterIndex, stepKey, questionsLeft, isQuestion, answers = {} }) {
  const g = chapterHue(chapter?.key);
  const energy = traceEnergy(answers);
  const status = chartStatus(answers, { isQuestion, questionsLeft });

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      gap: 16, padding: '28px 32px 24px', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* ECG paper. The flow's one piece of ornament, and it means something:
          a chart is a thing printed on graph paper. */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55, ...chartPaper(g, 24) }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 78% 46% at 50% 12%, ${g.softer}, transparent 72%)` }} />

      {/* Chapter header */}
      <motion.div key={`hd-${chapter?.key}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={GLIDE}
        style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <ChapterMark mark={chapter?.mark || 'activity'} chapterKey={chapter?.key} size={50} />
        <div style={{ minWidth: 0, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={numeral(10.5, { color: g.ink })}>{pad2(chapterIndex + 1)}</span>
            <span style={{ width: 14, height: 1, background: C.b2 }} />
            <span style={meta(9, { color: C.t4 })}>of {pad2(chapters.length)}</span>
          </div>
          <h2 style={display(22, { color: C.t1, margin: 0 })}>{chapter?.rail}</h2>
        </div>
      </motion.div>

      <motion.p key={`ln-${chapter?.key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...GLIDE, delay: 0.08 }}
        style={{ ...body(13, { margin: 0, maxWidth: 360 }), position: 'relative' }}>
        {chapter?.line}
      </motion.p>

      {/* The chart itself — the reason the rail exists. It sits directly under
          the chapter copy rather than floating in the middle of the pane: it is
          a document being filled in, and a document starts at the top. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', marginTop: -2 }}>
        <LiveChart answers={answers} g={g} />
      </div>

      {/* Heartbeat. Amplitude tracks the daily commitment the student picked, so
          the one control in the flow that is purely about effort visibly does
          something the moment they move it. */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ opacity: 0.95 }}>
          <EKGLine width={300} height={34} color={g.base} energy={energy} />
        </div>
        <motion.p key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={GLIDE_FAST}
          style={{ fontSize: 11.5, color: C.t3, margin: 0, lineHeight: 1.5 }}>
          {status}
        </motion.p>
      </div>

      <div style={{ position: 'relative' }}>
        <ChapterTicks chapters={chapters} activeIndex={chapterIndex} g={g} />
      </div>
    </div>
  );
}

/**
 * The phone-sized chart: recorded answers as a horizontally scrolling row of
 * chips under the progress bar.
 *
 * It carries the same promise as the rail in a tenth of the space — the student
 * can see that what they said is being kept — and it only appears once there is
 * something to show, so screen one isn't an empty tray.
 */
export function ChartStrip({ answers, chapterKey }) {
  const g = chapterHue(chapterKey);
  const filled = chartRows(answers).filter(r => !r.pending);
  if (filled.length === 0) return null;
  // Newest first: the chip that just appeared is the one worth seeing, and on a
  // narrow screen only the first few are visible without scrolling.
  const shown = [...filled].reverse();
  return (
    <div style={{
      display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4,
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
    }}>
      <AnimatePresence initial={false}>
        {shown.map((row, i) => (
          <motion.span key={row.key}
            layout
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={POP}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '4px 8px', borderRadius: R.pill,
              background: i === 0 ? g.soft : C.surf,
              border: `1px solid ${i === 0 ? g.edge : C.b1}`,
              color: i === 0 ? C.t1 : C.t2, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
            <span style={{ display: 'flex', color: i === 0 ? g.ink : C.t3 }}><Icon name={row.icon} size={12} stroke={1.8} /></span>
            {row.value}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
