import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flag, TrendingUp, Info } from 'lucide-react';
import { C, tint, pill } from '../../lib/theme';
import { dayKey } from '../../lib/timeline';
import { projectClimb, COMPONENTS, COMPONENT_WEIGHTS } from '../../lib/roadmap/projection';
import { fmtMonth } from './roadmapUi';

// ─────────────────────────────────────────────────────────────────────────────
// THE CLIMB — what this year is worth, drawn.
//
// ── The question the rest of the tab structurally cannot answer ─────────────
// Every other surface in the Roadmap answers a WHEN question. The path answers
// "where am I"; the line answers "when does it get hard"; the seasons answer
// "what is this stretch for". All three take for granted the thing a student
// has not actually been told: that doing any of it adds up to something.
//
// That gap is where roadmaps get abandoned. Twelve months of deadlines with no
// visible destination is a chore list, and a chore list is a thing you close.
// So this screen answers the only question left, and answers it with the whole
// student rather than with the roadmap alone — their Portfolio, their pathway
// mastery, their logged hours, their colleges, their essays:
//
//     "If I actually do all of this, what does it get me?"
//
// ── What it is honest about, out loud, in the UI ───────────────────────────
// It is NOT a chance of admission. See the header of
// src/lib/roadmap/projection.js for why that number is never computed here
// under any pressure. What is drawn is this app's own published 0-100
// application-strength score — measured today, projected forward under the
// stated assumption that the roadmap gets finished — and the footer says
// exactly that in words a fifteen-year-old will read.
//
// The dream schools are drawn at the SUMMIT, at the end of the line, as the
// thing the year is pointed at. Deliberately not as altitude thresholds: a
// horizontal line labelled "Duke: 82" would be a fabrication with a ruler on
// it, and it would be believed.
//
// ── Why it moves, and what each movement means ─────────────────────────────
// Three animations, each carrying a fact, the same discipline the path holds
// itself to:
//   1. The curve DRAWS ITSELF from today to the summit on arrival. The year
//      happens in order and the drawing happens in order.
//   2. The "you are here" dot breathes. It is the only thing that moves at
//      rest, so it is the thing the eye returns to.
//   3. The summit glows in proportion to the gain. A year worth twenty points
//      glows more than a year worth four, because it IS worth more.
// All three are off under prefers-reduced-motion, where the finished curve is
// simply present from the first frame and nothing is lost but the movement.
// ─────────────────────────────────────────────────────────────────────────────

const H = { mobile: 230, desktop: 290 };
// The left gutter holds the band NAMES rather than bare numbers — see BANDS —
// so it is wide enough for the longest of them ("Just Starting" is never drawn;
// "On Track" is). Narrower on a phone, where 76px is a fifth of the screen.
const PADS = {
  mobile: { left: 58, right: 16, top: 20, bottom: 26 },
  desktop: { left: 76, right: 18, top: 22, bottom: 28 },
};

// ── The y axis is a ladder with named rungs, not a number line ──────────────
// The scale is fixed at 0-100 and never rescaled to fit the data, because these
// numbers are meant to be comparable between two students and between the same
// student in March and in July — an axis that stretches to fill itself makes
// every year look equally impressive, which is the opposite of the point.
//
// The cost of that honesty is that a student starting near zero gets a curve
// pinned to the bottom of a mostly empty frame, and an empty frame reads as
// "there is nothing here" rather than as "there is a long way to go". So the
// space above the line is LABELLED: the four bands computeApplicationStrength
// already names, drawn as rungs, so the emptiness is legible as the room left
// to climb and the student can see which rung this year lands them on.
const BANDS = [
  { at: 80, label: 'Strong' },
  { at: 60, label: 'On Track' },
  { at: 35, label: 'Building' },
];

export default function RoadmapAscent({
  roadmap, strength = null, today = dayKey(), isMobile = false, reducedMotion = false,
  compact = false, onExplore = null,
}) {
  const climb = useMemo(() => projectClimb(roadmap, strength, today), [roadmap, strength, today]);
  const schools = (roadmap?.targetSchools || []).slice(0, 4);

  if (!climb.months.length) return null;

  return (
    <div>
      <ClimbHeadline climb={climb} schools={schools} isMobile={isMobile} compact={compact} />

      {climb.ok ? (
        <ClimbChart
          climb={climb} schools={schools} isMobile={isMobile}
          reducedMotion={reducedMotion} compact={compact}
        />
      ) : (
        <div style={{
          marginTop: 12, padding: '12px 16px', borderRadius: 12,
          background: C.surf2, border: `1px solid ${C.b1}`,
          fontSize: 12, color: C.t3, lineHeight: 1.55,
        }}>
          There is not enough on your roadmap yet to draw the climb — a curve through three points
          says less than the sentence above it. Add a few items, or rebuild your roadmap, and this
          fills in.
        </div>
      )}

      {!compact && <ContributionRows climb={climb} isMobile={isMobile} />}
      {!compact && <HonestyNote />}

      {compact && onExplore && (
        <button
          type="button"
          onClick={onExplore}
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4,
            background: tint(C.violet, 0.14), border: `1px solid ${tint(C.violet, 0.32)}`,
            color: C.violetL || C.violet, borderRadius: 8, padding: '8px 12px',
            fontSize: 12, fontWeight: 700, fontFamily: C.FB, cursor: 'pointer',
          }}
        >
          <TrendingUp size={13} /> See what builds what
        </button>
      )}
    </div>
  );
}

// ── The sentence the chart is a picture of ───────────────────────────────────
// Written first and read first, because a chart nobody has been told the point
// of is a chart nobody reads. The numbers are large, the verb is "moves", and
// the condition ("if you finish it") is in the sentence rather than in a
// footnote — a projection whose assumption is in small print is a claim.

function ClimbHeadline({ climb, schools, isMobile, compact }) {
  const { today: now, projected, gain } = climb;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 18,
      flexWrap: 'wrap',
    }}>
      <Score value={now.score} band={now.band} label="today" color={C.t3} isMobile={isMobile} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{
          ...pill(tint(C.green, 0.16), C.green, {
            fontSize: isMobile ? 11 : 12, fontWeight: 800, padding: '4px 12px', gap: 4,
            border: `1px solid ${tint(C.green, 0.34)}`,
          }),
        }}>
          <TrendingUp size={12} /> +{gain}
        </div>
        <div style={{ fontSize: 9, color: C.t4, whiteSpace: 'nowrap' }}>if you finish it</div>
      </div>

      <Score value={projected.score} band={projected.band} label="next August" color={C.green} isMobile={isMobile} strong />

      {!compact && !!schools.length && (
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: C.t4, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
            Pointed at
          </div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.t1, marginTop: 4, lineHeight: 1.4 }}>
            {schools.join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}

function Score({ value, band, label, color, isMobile, strong = false }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{
        fontSize: isMobile ? (strong ? 34 : 28) : (strong ? 42 : 34),
        fontWeight: 800, fontFamily: C.FD, letterSpacing: 'calc(-0.04em + var(--msp-letter-spacing))', lineHeight: 1,
        color: strong ? C.t1 : C.t2,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color, marginTop: 4 }}>{band}</div>
      <div style={{ fontSize: 9.5, color: C.t4, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── The drawing ──────────────────────────────────────────────────────────────

function ClimbChart({ climb, schools, isMobile, reducedMotion, compact }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = isMobile ? PADS.mobile : PADS.desktop;
  const h = compact ? (isMobile ? 170 : 210) : (isMobile ? H.mobile : H.desktop);
  const width = Math.max(240, w || 640);
  const innerW = width - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;

  const pts = climb.months;
  const x = (i) => PAD.left + (pts.length > 1 ? (i / (pts.length - 1)) * innerW : innerW / 2);
  const y = (v) => PAD.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  const nowIdx = Math.max(0, pts.findIndex((p) => p.isNow));

  // ── The stack ──────────────────────────────────────────────────────────────
  // Each band's thickness is that component's WEIGHTED contribution to the
  // score, so the four bands sum to exactly the total line rather than to some
  // other number that happens to look similar. That is the property that makes
  // the drawing readable as an argument: the height of the teal band literally
  // is how much of your score is experience.
  const stack = useMemo(() => {
    const layers = [];
    let below = pts.map(() => 0);
    COMPONENTS.forEach((c) => {
      const top = pts.map((p, i) => below[i] + p.parts[c.id] * COMPONENT_WEIGHTS[c.id]);
      layers.push({ ...c, lower: below, upper: top });
      below = top;
    });
    return layers;
  }, [pts]);

  const totalLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ');
  const summit = pts[pts.length - 1];
  const glow = Math.min(1, climb.gain / 30);

  const focus = hover != null ? pts[hover] : null;

  return (
    <div ref={wrapRef} style={{ marginTop: 12 }}>
      <div style={{ position: 'relative' }}>
        <svg
          width="100%" height={h} viewBox={`0 0 ${width} ${h}`}
          preserveAspectRatio="none" role="img"
          aria-label={`Your application strength today is ${climb.today.score} out of 100. Finishing this roadmap projects it to ${climb.projected.score}.`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {COMPONENTS.map((c) => (
              <linearGradient key={c.id} id={`ra-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tint(C[c.colorKey], 0.55)} />
                <stop offset="100%" stopColor={tint(C[c.colorKey], 0.18)} />
              </linearGradient>
            ))}
            <filter id="ra-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* The band this year actually lands in, shaded. The one piece of the
              empty space that is not empty: it is the rung the climb reaches,
              and highlighting it is what turns "a line near the bottom" into
              "you get from here to there". */}
          <rect
            x={PAD.left} y={y(climb.projected.score)}
            width={Math.max(0, width - PAD.left - PAD.right)}
            height={Math.max(0, y(climb.today.score) - y(climb.projected.score))}
            fill={tint(C.green, 0.07)}
          />

          {/* The rungs. Named with the words computeApplicationStrength already
              uses elsewhere in the app, so the axis teaches nothing new. */}
          {BANDS.map((b) => {
            const reached = climb.projected.score >= b.at;
            return (
              <g key={b.at}>
                <line
                  x1={PAD.left} x2={width - PAD.right} y1={y(b.at)} y2={y(b.at)}
                  stroke={reached ? tint(C.green, 0.35) : C.b1}
                  strokeWidth="1" strokeDasharray="3 6"
                />
                <text
                  x={PAD.left - 8} y={y(b.at) + 3} fontSize="9" textAnchor="end"
                  fill={reached ? C.green : C.t4} fontWeight={reached ? 700 : 500}
                >
                  {b.label}
                </text>
              </g>
            );
          })}

          {/* The gain, as a bracket at the right-hand edge. The absolute
              altitude of the curve depends on how much a student has already
              done; the DISTANCE between the two ends is what this year is worth,
              and it should be readable whether they start at 8 or at 68. */}
          {climb.gain > 0 && (
            <g>
              <line
                x1={width - PAD.right + 4} x2={width - PAD.right + 4}
                y1={y(climb.projected.score)} y2={y(climb.today.score)}
                stroke={tint(C.green, 0.55)} strokeWidth="1.5"
              />
              <line x1={width - PAD.right} x2={width - PAD.right + 8} y1={y(climb.today.score)} y2={y(climb.today.score)} stroke={tint(C.green, 0.55)} strokeWidth="1.5" />
              <line x1={width - PAD.right} x2={width - PAD.right + 8} y1={y(climb.projected.score)} y2={y(climb.projected.score)} stroke={tint(C.green, 0.55)} strokeWidth="1.5" />
            </g>
          )}

          {/* The four bands. */}
          {stack.map((layer, li) => {
            const d = [
              ...pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(layer.upper[i]).toFixed(1)}`),
              ...pts.map((_, i) => {
                const j = pts.length - 1 - i;
                return `L ${x(j).toFixed(1)} ${y(layer.lower[j]).toFixed(1)}`;
              }),
              'Z',
            ].join(' ');
            return (
              <motion.path
                key={layer.id}
                d={d}
                fill={`url(#ra-${layer.id})`}
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : li * 0.09 }}
              />
            );
          })}

          {/* The total, drawn in as the eye reads left to right. */}
          <motion.path
            d={totalLine} fill="none"
            stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reducedMotion ? 0 : 1.5, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Where they are standing. Everything left of it is measured; every-
              thing right of it is the projection, and the two must not read as
              the same kind of claim. */}
          <line
            x1={x(nowIdx)} x2={x(nowIdx)} y1={PAD.top} y2={PAD.top + innerH}
            stroke={tint(C.amber, 0.5)} strokeWidth="1.5" strokeDasharray="4 4"
          />
          {!reducedMotion && (
            <motion.circle
              cx={x(nowIdx)} cy={y(pts[nowIdx].total)} r="10"
              fill={tint(C.amber, 0.4)}
              animate={{ r: [7, 16, 7], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <circle cx={x(nowIdx)} cy={y(pts[nowIdx].total)} r="5" fill={C.amber} stroke={C.bg} strokeWidth="2" />

          {/* The summit. */}
          {!reducedMotion && glow > 0.05 && (
            <motion.circle
              cx={x(pts.length - 1)} cy={y(summit.total)} r="14"
              fill={tint(C.green, 0.5 * glow)} filter="url(#ra-glow)"
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <circle cx={x(pts.length - 1)} cy={y(summit.total)} r="5.5" fill={C.green} stroke={C.bg} strokeWidth="2" />

          {/* Month ticks. Thinned on a phone rather than rotated: a rotated axis
              label is a thing you tilt your head at, and nobody tilts their head
              at a phone. */}
          {pts.map((p, i) => {
            const every = isMobile ? 3 : 2;
            if (i % every !== 0 && i !== pts.length - 1) return null;
            return (
              <text
                key={p.month} x={x(i)} y={h - 8} fontSize="8.5" fill={C.t4}
                textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
                fontFamily={C.FM}
              >
                {fmtMonth(p.month).replace(' 20', " '")}
              </text>
            );
          })}

          {/* Invisible hit strips, so a tap anywhere in a month's column reads
              that month rather than requiring a hit on a 5px dot. */}
          {pts.map((p, i) => (
            <rect
              key={`hit-${p.month}`}
              x={x(i) - innerW / (pts.length * 2)} y={PAD.top}
              width={innerW / pts.length} height={innerH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
          {focus && (
            <line
              x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH}
              stroke={C.b3} strokeWidth="1" pointerEvents="none"
            />
          )}
        </svg>

        {/* The summit flag, as HTML over the drawing — it carries the school
            names and they are text, not a path. */}
        <div style={{
          position: 'absolute', right: PAD.right, top: PAD.top - 6,
          display: 'flex', alignItems: 'center', gap: 4,
          pointerEvents: 'none', maxWidth: '52%',
        }}>
          <Flag size={11} color={C.green} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 9.5, fontWeight: 800, color: C.green, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {schools.length ? schools[0] + (schools.length > 1 ? ` +${schools.length - 1}` : '') : 'Your target schools'}
          </span>
        </div>
      </div>

      {/* What the hovered month is, in words. Sits under the chart rather than
          floating over it: a tooltip that follows a finger on a phone covers the
          thing it is describing. */}
      <div style={{
        marginTop: 8, minHeight: 18, fontSize: 11, color: C.t3,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        {focus ? (
          <>
            <b style={{ color: C.t1, fontFamily: C.FM }}>{fmtMonth(focus.month)}</b>
            <span>· projected {Math.round(focus.total)}/100</span>
            {focus.isPast && <span style={{ color: C.t4 }}>· already behind you</span>}
            {focus.isNow && <span style={{ color: C.amber, fontWeight: 700 }}>· you are here</span>}
          </>
        ) : (
          <span style={{ color: C.t4 }}>
            {isMobile ? 'Tap the chart to read a month.' : 'Hover the chart to read a month.'}
          </span>
        )}
      </div>

      <Legend isMobile={isMobile} />
    </div>
  );
}

function Legend({ isMobile }) {
  return (
    <div style={{ display: 'flex', gap: isMobile ? 10 : 14, flexWrap: 'wrap', marginTop: 4 }}>
      {COMPONENTS.map((c) => (
        <span key={c.id} title={c.blurb} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.t3 }}>
          <span style={{ width: 9, height: 9, borderRadius: 4, background: tint(C[c.colorKey], 0.6), display: 'inline-block' }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ── What builds what ─────────────────────────────────────────────────────────
// The chart says the score goes up. This says which parts of the application go
// up and which items are doing the lifting — which is the half a student can
// act on, and the half that makes the curve believable rather than magical.

function ContributionRows({ climb, isMobile }) {
  const max = Math.max(1, ...climb.contributions.map((c) => c.to));
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8,
      }}>
        What this year builds
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {climb.contributions.map((row) => {
          const meta = COMPONENTS.find((c) => c.id === row.component);
          const color = C[meta.colorKey];
          const gain = Math.max(0, row.to - row.from);
          return (
            <div key={row.component}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 8, marginBottom: 4,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{meta.label}</span>
                <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM, whiteSpace: 'nowrap' }}>
                  {row.from} → {row.to}
                  {gain > 0 && <b style={{ color: C.green, marginLeft: 4 }}>+{gain}</b>}
                </span>
              </div>
              {/* Two stacked bars: what is already there, and what this year
                  adds. Drawn as one track so the second is visibly built ON the
                  first rather than beside it. */}
              <div style={{ height: 7, borderRadius: 4, background: C.s3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(row.from / max) * 100}%`, background: tint(color, 0.85) }} />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(gain / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: `repeating-linear-gradient(115deg,${tint(color, 0.42)},${tint(color, 0.42)} 4px,${tint(color, 0.22)} 4px,${tint(color, 0.22)} 8px)` }}
                />
              </div>
              <div style={{ fontSize: 10, color: C.t4, marginTop: 4 }}>
                {row.items
                  ? `${row.items} thing${row.items === 1 ? '' : 's'} on your roadmap build this${isMobile ? '' : ' — ' + meta.blurb.toLowerCase()}`
                  : `Nothing on your roadmap builds this yet — ${meta.blurb.toLowerCase()}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The disclaimer, written as information rather than as legal cover.
 *
 * Non-negotiable and not removable without an equivalent elsewhere. A chart
 * with a rising green line and a college name on it will be read as a
 * prediction about that college unless it says otherwise in plain words, and
 * the student reading it is fifteen and has never been told that no product can
 * compute that number.
 */
function HonestyNote() {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16,
      background: C.surf2, border: `1px solid ${C.b1}`, borderRadius: 8, padding: '12px 12px',
    }}>
      <Info size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 4 }} />
      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>
        <b style={{ color: C.t2 }}>This is not a chance of getting in.</b> Nobody outside an
        admissions office can work that number out, and anything that shows you one is guessing.
        What this draws is <b style={{ color: C.t2 }}>our own 0–100 readiness score</b> — the same
        one on your Progress tab — measured from what you have actually logged, and projected
        forward on the assumption that you finish what is on this roadmap. Skip half of it and the
        line does not happen. That is the honest version, and it is still the most useful picture of
        a year you will get for free.
      </div>
    </div>
  );
}
