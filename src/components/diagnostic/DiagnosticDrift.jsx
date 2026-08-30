// ─────────────────────────────────────────────────────────────────────────────
// The drift chart — how a student's diagnostic results moved across years.
//
// This is the payoff for storing every result instead of overwriting one field.
// A single result is a label; four results across four years is a record of a
// person's interests developing, dated, in their own answers. That record is
// both the reason to come back to this app across high school and — bluntly —
// the raw material for the "why medicine" essay every one of these students
// eventually has to write, where the difference between a specific dated
// account and an invented narrative is obvious to any reader.
//
// Rendered as a line per pathway rather than a single "your match" line, because
// the interesting part is usually not which one won — it is two lines crossing.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Calendar } from 'lucide-react';
import { C, glass, glass2, pill, R, CC } from '../../lib/theme';
import { describeDrift, historyRows } from '../../lib/diagnosticHistory';

export default function DiagnosticDrift({ series, paths = {}, m = false }) {
  if (!series?.points?.length) return null;
  const rows = series.points;
  const single = rows.length === 1;

  const data = {
    labels: rows.map(p => p.label),
    datasets: series.pathways.map((key) => {
      const color = paths[key]?.accent || C.blue;
      return {
        label: paths[key]?.label || key,
        data: rows.map(p => p.scores[key]),
        borderColor: color,
        backgroundColor: `${color}22`,
        borderWidth: key === series.latestTop ? 3 : 1.75,
        pointRadius: 4,
        pointBackgroundColor: color,
        tension: 0.32,
        spanGaps: true,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: C.t2, boxWidth: 10, font: { size: 11 } }, position: 'bottom' },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` } },
    },
    scales: {
      y: { min: 0, max: 100, ticks: { color: C.t3, font: { size: 10 } }, grid: { color: C.b1 }, title: { display: true, text: 'Fit', color: C.t3, font: { size: 10 } } },
      x: { ticks: { color: C.t3, font: { size: 10 } }, grid: { display: false } },
    },
  };

  return (
    <div style={glass({ padding: m ? 14 : 18 })}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 })}>
        <div style={R({ gap: 8 })}>
          <TrendingUp size={16} color={C.cyanL} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>How this has moved</span>
        </div>
        <span style={pill(C.s3, C.t3, { fontSize: 10.5 })}>{rows.length} result{rows.length === 1 ? '' : 's'}</span>
      </div>

      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, margin: '0 0 14px', maxWidth: 620 }}>
        {describeDrift(series, paths)}
      </p>

      {!single && (
        <div style={{ height: m ? 220 : 260, marginBottom: 16 }}>
          <Line data={data} options={options} />
        </div>
      )}

      {/* The dated list. This is the part that is directly usable as essay
          material, so it stays plain and factual rather than decorative. */}
      <div style={CC({ gap: 8 })}>
        {historyRows(rows.map(p => ({ takenAt: p.takenAt, top: p.top, scored: [] })), paths).map((r, i) => (
          <div key={i} style={{ ...glass2({ padding: '8px 12px' }), display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={12} color={C.t3} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM, minWidth: 86 }}>{r.date}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: paths[r.topKey]?.accent || C.t1 }}>{r.topLabel}</span>
            <span style={{ fontSize: 11, color: C.t4, marginLeft: 'auto' }}>{r.semester}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
