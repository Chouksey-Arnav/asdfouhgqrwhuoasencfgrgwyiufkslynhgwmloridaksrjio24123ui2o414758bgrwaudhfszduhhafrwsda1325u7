// ─────────────────────────────────────────────────────────────────────────────
// The seal history.
//
// ── Why this chart is worth building at all ─────────────────────────────────
// The MedEx Score's whole claim is that it measures a position that moves
// slowly. A single number cannot demonstrate that — only a series can, and the
// series is the thing a student is actually trying to change. Two seals eight
// weeks apart is the most motivating artefact this feature produces, and it is
// the one thing the score literally cannot be recomputed into (see the
// migration: the portfolio each seal was taken from no longer exists).
//
// ── The design rules it follows ─────────────────────────────────────────────
//  1. THE COHORT LINE IS ALWAYS DRAWN, even when it is far above every point.
//     A y-axis fitted to the data makes a flat run of low scores look like
//     progress; fitted to the target, it shows the real gap. The axis therefore
//     always includes 850.
//  2. GAPS ARE GAPS. A student who did not open the app for a month has no
//     seals for those weeks, and the line breaks rather than interpolating
//     across them — a straight line through four missing weeks is a claim about
//     data we do not have.
//  3. A BENCHMARK CHANGE IS MARKED. If the score jumped 90 points because they
//     removed their reach school, that is not improvement, and the point where
//     the benchmark changed carries a marker saying so.
//  4. One point is not a chart. Below two seals it renders an honest
//     placeholder that says when the next one lands.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { CalendarClock, Info } from 'lucide-react';
import { C, tint, pill } from '../../lib/theme';
import { MEDEX_COHORT_MEDIAN, MEDEX_MAX, bandFor, weekLabel, compareWeekKeys, weekStartFromKey } from '../../lib/medex';
import { bandColor } from './MedExRing';

const VB_W = 560;
const PAD = { top: 18, right: 66, bottom: 30, left: 44 };

export default function MedExHistoryChart({
  rows = [],
  height = 190,
  maxWeeks = 26,
  m = false,
}) {
  const [hover, setHover] = useState(null);

  const series = useMemo(() => (
    [...(rows || [])]
      .filter(r => r && r.week_key && typeof r.score === 'number')
      .sort((a, b) => compareWeekKeys(a.week_key, b.week_key))
      .slice(-maxWeeks)
  ), [rows, maxWeeks]);

  if (series.length < 2) return <Placeholder count={series.length} m={m} />;

  // ── Scale ────────────────────────────────────────────────────────────────
  // Always include the cohort line. See rule 1 — this is the single decision
  // that stops the chart from flattering a flat run.
  const scores = series.map(r => r.score);
  const rawMin = Math.min(...scores, MEDEX_COHORT_MEDIAN);
  const rawMax = Math.max(...scores, MEDEX_COHORT_MEDIAN);
  const pad = Math.max(40, (rawMax - rawMin) * 0.15);
  const yMin = Math.max(0, Math.floor((rawMin - pad) / 50) * 50);
  const yMax = Math.min(MEDEX_MAX, Math.ceil((rawMax + pad) / 50) * 50);

  const W = VB_W, H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i) => PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  // ── Segments ─────────────────────────────────────────────────────────────
  // Consecutive weeks only. A break in the week sequence breaks the line: see
  // rule 2. `weekGap` is computed from position in the ISO sequence rather than
  // from dates, because the keys are the identities the seals were written with.
  const segments = [];
  let current = [];
  series.forEach((row, i) => {
    const prev = series[i - 1];
    const contiguous = !prev || isNextWeek(prev.week_key, row.week_key);
    if (!contiguous && current.length) { segments.push(current); current = []; }
    current.push({ ...row, i });
  });
  if (current.length) segments.push(current);

  const cohortY = y(MEDEX_COHORT_MEDIAN);
  const cohortVisible = MEDEX_COHORT_MEDIAN >= yMin && MEDEX_COHORT_MEDIAN <= yMax;

  const latest = series[series.length - 1];
  const color = bandColor(bandFor(latest.score));

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img" aria-label={`MedEx Score over the last ${series.length} sealed weeks`}>
        <defs>
          <linearGradient id="medex-hist-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tint(color, 0.32)} />
            <stop offset="100%" stopColor={tint(color, 0)} />
          </linearGradient>
        </defs>

        {/* y gridlines */}
        {gridValues(yMin, yMax).map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)}
              stroke={C.b1} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={PAD.left - 7} y={y(v)} textAnchor="end" dominantBaseline="middle"
              fill={C.t4} style={{ fontSize: 10, fontFamily: C.FM }}>{v}</text>
          </g>
        ))}

        {/* The cohort median — the target, always drawn */}
        {cohortVisible && (
          <>
            <line x1={PAD.left} y1={cohortY} x2={W - PAD.right} y2={cohortY}
              stroke={C.green} strokeWidth={1.4} strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke" opacity={0.75} />
            <text x={W - PAD.right} y={cohortY - 5} textAnchor="end"
              fill={C.greenL} style={{ fontSize: 10, fontWeight: 700, fontFamily: C.FM }}>
              850 · admitted median
            </text>
          </>
        )}

        {/* Area + line, per contiguous segment */}
        {segments.map((seg, si) => {
          if (seg.length === 1) {
            return <circle key={si} cx={x(seg[0].i)} cy={y(seg[0].score)} r={3.4} fill={color} />;
          }
          const line = seg.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i)} ${y(p.score)}`).join(' ');
          const area = `${line} L ${x(seg[seg.length - 1].i)} ${PAD.top + innerH} L ${x(seg[0].i)} ${PAD.top + innerH} Z`;
          return (
            <g key={si}>
              <path d={area} fill="url(#medex-hist-fill)" />
              <path d={line} fill="none" stroke={color} strokeWidth={2.4}
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}

        {/* Points, with the benchmark-change marker */}
        {series.map((row, i) => {
          const changed = i > 0 && row.benchmark_id && series[i - 1].benchmark_id
            && row.benchmark_id !== series[i - 1].benchmark_id;
          const isHover = hover === i;
          return (
            <g key={row.week_key}>
              {changed && (
                <line x1={x(i)} y1={PAD.top} x2={x(i)} y2={PAD.top + innerH}
                  stroke={C.amber} strokeWidth={1.2} strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke" opacity={0.7} />
              )}
              <circle cx={x(i)} cy={y(row.score)} r={isHover ? 5 : 3.4}
                fill={changed ? C.amber : color} stroke={C.bg} strokeWidth={1.4} />
              {/* Generous invisible hit area — the visible dots are far too small to hit. */}
              <rect x={x(i) - innerW / (series.length * 2) - 2} y={PAD.top}
                width={innerW / series.length + 4} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }} />
            </g>
          );
        })}

        {/* x labels — first, last, and the hovered one, so they never collide */}
        {series.map((row, i) => {
          const show = i === 0 || i === series.length - 1 || hover === i;
          if (!show) return null;
          return (
            <text key={row.week_key} x={x(i)} y={H - 9}
              textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
              fill={hover === i ? C.t2 : C.t4} style={{ fontSize: 10, fontFamily: C.FM }}>
              {weekLabel(row.week_key)}
            </text>
          );
        })}
      </svg>

      {/* Hover readout — outside the SVG so it can use real typography */}
      <div style={{ minHeight: 34, marginTop: 4 }}>
        {hover != null ? (
          <HoverRow row={series[hover]} prev={series[hover - 1] || null} />
        ) : (
          <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.45 }}>
            {series.length} sealed week{series.length === 1 ? '' : 's'}. Gaps are weeks you did not open the app — the line breaks rather than guessing what happened in them.
          </div>
        )}
      </div>
    </div>
  );
}

function HoverRow({ row, prev }) {
  const delta = prev ? row.score - prev.score : null;
  const changed = prev && row.benchmark_id && prev.benchmark_id && row.benchmark_id !== prev.benchmark_id;
  const band = bandFor(row.score);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.t1, fontFamily: C.FM }}>{row.score}</span>
      <span style={pill(tint(bandColor(band), 0.15), bandColor(band), { fontSize: 10 })}>{band.label}</span>
      {delta != null && (
        <span style={{ fontSize: 10.5, color: delta > 0 ? C.greenL : delta < 0 ? C.roseL : C.t3, fontFamily: C.FM }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
      <span style={{ fontSize: 10.5, color: C.t3 }}>
        {weekLabel(row.week_key, { year: true })}
        {row.benchmark_name ? ` · vs ${row.benchmark_name}` : ''}
      </span>
      {changed && (
        <span style={pill(tint(C.amber, 0.16), C.amberL, { fontSize: 10, gap: 4 })}>
          <Info size={9} />benchmark changed this week
        </span>
      )}
    </div>
  );
}

function Placeholder({ count, m }) {
  return (
    <div style={{
      border: `1px dashed ${C.b2}`, borderRadius: 12, padding: m ? 16 : 22,
      textAlign: 'center', color: C.t3,
    }}>
      <CalendarClock size={18} color={C.t3} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t2, fontFamily: C.FD, marginBottom: 4 }}>
        {count === 0 ? 'No sealed weeks yet' : 'One sealed week so far'}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, maxWidth: 380, margin: '0 auto' }}>
        {count === 0
          ? 'Your first score seals as soon as there is enough on your record to measure. After that, one seal a week builds this chart.'
          : 'The chart starts at two. Your next seal lands on Monday, and from then on this shows where your position is actually going.'}
      </div>
    </div>
  );
}

/** Four or five round gridlines, without a dependency. */
function gridValues(min, max) {
  const span = max - min;
  const step = span <= 150 ? 25 : span <= 300 ? 50 : span <= 700 ? 100 : 200;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
  return out;
}

/**
 * Is `b` the ISO week immediately after `a`?
 *
 * Compares by week START rather than by parsing the week number, because week
 * 52 → week 1 across a year boundary is contiguous and a numeric comparison
 * says it is a 51-week gap. Six to eight days of tolerance absorbs the DST
 * weeks without admitting a real two-week gap.
 */
function isNextWeek(a, b) {
  const sa = weekStartFromKey(a), sb = weekStartFromKey(b);
  if (!sa || !sb) return false;
  const days = (sb - sa) / 86400000;
  return days > 6 && days < 8.5;
}

