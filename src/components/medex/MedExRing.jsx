// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score dial.
//
// ── What this has to communicate, in priority order ─────────────────────────
// A big number alone is a vanity metric. Four things have to be readable in the
// same glance or the dial is not doing its job:
//
//   1. The score.
//   2. WHERE 850 IS. The whole scale is anchored to the median admitted student
//      at the benchmark program, and a dial without that mark is just a
//      progress bar with a nice font. It is a hard notch across the track, and
//      it does not move — so a student can see the gap they are actually
//      closing rather than a bar that always looks nearly full. It carries no
//      printed label: at the 150px size this renders at on a phone there is no
//      room for one that is not clutter, so the number is carried in words
//      beside the dial ("65 to the median admit") and in the notch's tooltip.
//   3. The uncertainty. The range is a thin arc on its own rail outside the
//      track — see the note on rangeArc for why it cannot go on the track
//      itself. If the model is not sure, the dial is visibly not sure.
//   4. The band boundaries, as ticks, so "12 points to Contender" has somewhere
//      to point at.
//
// ── pathLength ──────────────────────────────────────────────────────────────
// The arc is declared `pathLength={1000}`, which makes SVG rescale the path's
// own length to 1000 user units. Score units and dash units then become the
// same thing: strokeDashoffset = 1000 − score, exactly, at any radius and any
// sweep angle. No measuring the path in a layout effect, no magic circumference
// constant to keep in step with the geometry, and the arc stays correct if the
// dial is ever resized.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, tint } from '../../lib/theme';
import { BANDS, MEDEX_COHORT_MEDIAN, MEDEX_MAX } from '../../lib/medex';

/**
 * Band tone → palette token. Kept here so scale.js stays free of UI concerns.
 *
 * Resolved on every call rather than captured in a module-level object: `C` is
 * mutated in place by applyTheme(), so anything that reads it at import time
 * keeps whichever palette happened to be active when the module first loaded
 * and never repaints when the student switches theme.
 */
export const bandColor = (band) => {
  const byTone = {
    slate: C.t3, blue: C.blue, cyan: C.cyan, violet: C.violet, green: C.green, gold: C.gold,
  };
  return byTone[band?.tone] || C.blue;
};

/** Degrees swept by the arc, centered on 12 o'clock. 270° leaves a readable foot. */
const SWEEP = 270;
const A0 = -SWEEP / 2;
const A1 = SWEEP / 2;

const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const arcPath = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

const angleFor = (score) => A0 + (clamp(score, 0, MEDEX_MAX) / MEDEX_MAX) * SWEEP;

export default function MedExRing({
  score = 0,
  band = null,
  range = null,          // { low, high } — drawn as the uncertainty band
  size = 200,
  stroke = 14,
  /** Rendered under the number. Kept as a prop so Home and the panel can differ. */
  caption = null,
  showCohortMark = true,
  showTicks = true,
  animate = true,
  reducedMotion: reducedMotionProp = false,
  idPrefix = 'medex',
}) {
  const systemReduced = useReducedMotion();
  const reduced = reducedMotionProp || systemReduced;
  const shouldAnimate = animate && !reduced;

  const color = bandColor(band);
  const cx = size / 2, cy = size / 2;
  const r = (size - stroke) / 2 - 9;   // −9 leaves room for the uncertainty rail outside the track

  const track = useMemo(() => arcPath(cx, cy, r, A0, A1), [cx, cy, r]);

  // The uncertainty band, as its own arc segment rather than a second full ring:
  // drawing it as a partial arc between low and high is the only version that
  // reads as "somewhere in here" rather than as a second score.
  // Drawn on its own concentric rail OUTSIDE the track, not inside it.
  //
  // The obvious version — a wider, softer arc along the same path — fails for a
  // structural reason rather than a cosmetic one: the value arc is painted on
  // top of it, so the low→score half of the range is hidden and only the
  // score→high half survives. What the student sees is a stub of a different
  // color hanging off the end of their score, which reads as a rendering bug,
  // not as "we are not certain". On its own rail the whole low→high span is
  // visible at once and the score sits inside it, which is the actual claim.
  const railR = r + stroke / 2 + 5;
  const rangeArc = useMemo(() => {
    if (!range || range.low == null || range.high == null) return null;
    const a0 = angleFor(range.low), a1 = angleFor(range.high);
    return a1 - a0 < 0.5 ? null : arcPath(cx, cy, railR, a0, a1);
  }, [range, cx, cy, railR]);

  // Unique per instance: two dials on one screen sharing a gradient id would
  // both render the first one's colors.
  const gradId = `${idPrefix}-grad`;

  const cohortAngle = angleFor(MEDEX_COHORT_MEDIAN);
  const [cmx0, cmy0] = polar(cx, cy, r - stroke / 2 - 3, cohortAngle);
  const [cmx1, cmy1] = polar(cx, cy, r + stroke / 2 + 3, cohortAngle);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`MedEx Score ${Math.round(score)} out of ${MEDEX_MAX}${band ? `, ${band.label}` : ''}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tint(color, 0.55)} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>

        {/* Track */}
        <path d={track} fill="none" stroke={C.b1} strokeWidth={stroke} strokeLinecap="round" />

        {/* Band boundary ticks, drawn INSIDE the track so they never read as score */}
        {showTicks && BANDS.filter(b => b.min > 0).map(b => {
          const a = angleFor(b.min);
          const [x0, y0] = polar(cx, cy, r - stroke / 2 + 2, a);
          const [x1, y1] = polar(cx, cy, r + stroke / 2 - 2, a);
          return <line key={b.id} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.b2} strokeWidth={1.5} />;
        })}


        {/* The value */}
        <motion.path
          d={track} fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke}
          strokeLinecap="round" pathLength={MEDEX_MAX}
          strokeDasharray={MEDEX_MAX}
          initial={{ strokeDashoffset: shouldAnimate ? MEDEX_MAX : MEDEX_MAX - score }}
          animate={{ strokeDashoffset: MEDEX_MAX - clamp(score, 0, MEDEX_MAX) }}
          transition={shouldAnimate ? { duration: 1.1, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}
          style={{ filter: `drop-shadow(0 0 8px ${tint(color, 0.45)})` }}
        />

        {/* The uncertainty rail. See the note on rangeArc — its own radius,
            outside the track, so the whole low→high span stays visible. */}
        {rangeArc && (
          <path d={rangeArc} fill="none" stroke={tint(color, 0.42)}
            strokeWidth={2.5} strokeLinecap="round" />
        )}

        {/* The cohort median — the anchor the whole scale is defined by. Drawn
            last so it sits on top of the value arc even at a high score. */}
        {showCohortMark && (
          <>
            <line x1={cmx0} y1={cmy0} x2={cmx1} y2={cmy1}
              stroke={C.t1} strokeWidth={2.5} strokeLinecap="round" opacity={0.85}>
              <title>{`${MEDEX_COHORT_MEDIAN} — the median admitted student at your benchmark`}</title>
            </line>
            <circle cx={cmx1} cy={cmy1} r={2.6} fill={C.t1} opacity={0.85} />
          </>
        )}
      </svg>

      {/* Center readout */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: stroke,
      }}>
        <CountUp value={Math.round(score)} animate={shouldAnimate} style={{
          fontSize: size * 0.26, fontWeight: 900, color: C.t1, fontFamily: C.FD,
          lineHeight: 1, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))',
        }} />
        {band && (
          <div style={{
            marginTop: size * 0.045, fontSize: Math.max(9.5, size * 0.058), fontWeight: 700,
            color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', textAlign: 'center',
          }}>{band.label}</div>
        )}
        {caption && (
          <div style={{
            marginTop: 4, fontSize: Math.max(9, size * 0.048), color: C.t3,
            textAlign: 'center', lineHeight: 1.3, fontFamily: C.FM,
          }}>{caption}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Counts to the value on mount.
 *
 * `tabular-nums` matters more than it looks: without it the digits change width
 * as they tick and the whole number jitters horizontally, which on the largest
 * element of the dashboard reads as a rendering bug rather than as motion.
 */
function CountUp({ value, animate, style }) {
  const [shown, setShown] = React.useState(animate ? 0 : value);

  React.useEffect(() => {
    if (!animate) { setShown(value); return; }
    let raf = 0;
    const from = shown, delta = value - from, start = performance.now(), dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      // Same easing as the arc, so the number and the sweep land together.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `shown` is intentionally not a dependency — including it would restart the
    // animation on every frame it sets.
  }, [value, animate]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div style={{ ...style, fontVariantNumeric: 'tabular-nums' }}>{shown}</div>;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
