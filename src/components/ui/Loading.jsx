import React, { useEffect, useRef, useState } from 'react';
import { C, glass, CC, R, RADIUS, LOADING } from '../../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Loading, by how long it actually takes.
//
// The app has 48 files that render a spinner the instant a fetch starts. Most
// of those fetches finish in 120ms, which means what a student sees is a
// spinner that flashes and vanishes — and a flashed spinner makes an
// interaction feel SLOWER than showing nothing at all. The flash is a second
// event the eye has to resolve, and it advertises that waiting was a
// possibility. Nobody ever thought "that was fast" about a strobe.
//
// So loading has three phases, by elapsed time, and the numbers are in
// src/lib/tokens/motion.js:
//
//   0 – 300ms      NOTHING. It already happened.
//   300 – 1000ms   a skeleton, in the real content's exact dimensions and
//                  radii. A skeleton whose rows are the wrong height causes a
//                  visible reflow the moment the data lands, which is the
//                  exact jank the skeleton existed to prevent — so `SkeletonRow`
//                  takes the height and radius rather than guessing.
//   over 1000ms    the skeleton plus a determinate indicator, IF we genuinely
//                  know the progress. A fake progress bar is a lie the student
//                  catches, and they only have to catch it once.
//
// And never more than five skeleton rows: past five it stops reading as "your
// content is on its way" and starts reading as a screen made of grey bars.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which loading phase to render right now.
 *
 * @param {boolean} loading whether the work is still in flight
 * @returns {'idle'|'none'|'skeleton'|'determinate'}
 *          'idle' — not loading. 'none' — loading, but too early to say so.
 */
export function useLoadingPhase(loading) {
  const [phase, setPhase] = useState(loading ? 'none' : 'idle');
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!loading) { setPhase('idle'); return undefined; }
    setPhase('none');
    timers.current.push(setTimeout(() => setPhase('skeleton'), LOADING.showNothingBelow));
    timers.current.push(setTimeout(() => setPhase('determinate'), LOADING.determinateAbove));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [loading]);

  return phase;
}

/**
 * One placeholder block, in the shape of the thing it stands in for.
 *
 * @param w      width, any CSS length
 * @param h      height in px — match the real element's line box, not a guess
 * @param radius match the real element's radius, or the layout pops when it
 *               swaps
 */
export function SkeletonRow({ w = '100%', h = 12, radius = RADIUS.xs, style = {} }) {
  return (
    <div
      className="msp-shimmer"
      style={{ width: w, height: h, borderRadius: radius, background: C.s3, flexShrink: 0, ...style }}
    />
  );
}

/**
 * A stack of placeholder rows. Capped at five — see the header.
 *
 * @param rows  how many, before the cap
 * @param h     row height
 * @param gap   space between rows; 8 is the layout minimum
 */
export function SkeletonRows({ rows = 3, h = 12, gap = 8, widths }) {
  const n = Math.min(rows, LOADING.maxSkeletonRows);
  const w = widths || ['100%', '92%', '78%', '85%', '64%'];
  return (
    <div style={CC({ gap })} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <SkeletonRow key={i} w={w[i % w.length]} h={h} />)}
    </div>
  );
}

/**
 * A determinate progress bar. Only rendered past a second, and only when
 * `value` is real.
 *
 * Animates `transform`, never `width`: a width transition puts layout on the
 * main thread for every frame of a bar that is, by definition, on screen
 * during the moment the device is busiest.
 */
export function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={CC({ gap: 8 })}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Loading'}
        style={{ height: 4, borderRadius: RADIUS.xs, background: C.cmp.progressTrackBg, overflow: 'hidden' }}
      >
        <div style={{
          height: '100%', width: '100%', background: C.cmp.progressFillBg,
          transform: `scaleX(${pct / 100})`, transformOrigin: 'left',
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      {label && <div style={{ fontSize: 11, color: C.t3 }}>{label}</div>}
    </div>
  );
}

/**
 * The whole pattern in one component.
 *
 *   <LoadingRegion loading={busy} rows={3} progress={pct} label="Scoring…">
 *     <TheRealThing />
 *   </LoadingRegion>
 *
 * @param loading   still in flight?
 * @param rows      skeleton rows (capped at five)
 * @param rowHeight match the real content
 * @param progress  0–100 if genuinely known; omit for indeterminate work
 * @param label     what is happening, in plain words
 * @param card      wrap the skeleton in the standard card, so the placeholder
 *                  has the same footprint as what replaces it
 */
export function LoadingRegion({
  loading, rows = 3, rowHeight = 12, progress = null, label, card = false, children,
}) {
  const phase = useLoadingPhase(loading);
  if (phase === 'idle') return children;
  if (phase === 'none') return null;

  const body = (
    <div style={CC({ gap: 12 })} aria-busy="true">
      <SkeletonRows rows={rows} h={rowHeight} />
      {phase === 'determinate' && progress != null && <ProgressBar value={progress} label={label} />}
    </div>
  );
  return card ? <div style={glass()}>{body}</div> : body;
}

/**
 * The one honest use of a spinner: an action the student themselves just
 * started, inside the control they pressed, where the flash is not a surprise
 * because they caused it.
 */
export function InlineSpinner({ size = 14, color = C.t3 }) {
  return (
    <span
      className="spin"
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: RADIUS.pill, display: 'inline-block',
        border: `2px solid ${C.b1}`, borderTopColor: color, flexShrink: 0,
      }}
    />
  );
}

export default LoadingRegion;

// Exported for the layout of skeletons that need a row of blocks rather than a
// stack — an avatar beside two lines, say.
export const SkeletonRowGroup = ({ gap = 12, children }) => <div style={R({ gap })} aria-hidden="true">{children}</div>;
