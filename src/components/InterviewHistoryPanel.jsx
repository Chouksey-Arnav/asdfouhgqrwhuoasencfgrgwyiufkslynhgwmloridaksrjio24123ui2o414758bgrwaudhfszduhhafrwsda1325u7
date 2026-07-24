// Session History & Analytics for the Interview Simulator. Sessions were already being logged to
// IndexedDB (db.interviewSessions, via DB.addInterviewSession) on every practice round — mode,
// pathway, and now a parsed score (see src/lib/interviewScore.js) — but nothing ever read that
// data back. This is that missing read side: a trend chart + per-mode breakdown + a scrollable
// log of every past session, so practicing repeatedly actually feels like it's going somewhere
// instead of vanishing into IndexedDB the moment the feedback toast fades.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { Trophy, TrendingUp, TrendingDown, Minus, Calendar, Mic, MessageSquare, Layers } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, G } from '../lib/theme';
import * as DB from '../lib/db';

const MODE_META = {
  live: { label: 'Live Voice', color: C.rose, Icon: Mic },
  standard: { label: 'Standard', color: C.blue, Icon: MessageSquare },
  mmi: { label: 'MMI', color: C.violet, Icon: Layers },
  casper: { label: 'CASPer', color: C.cyan, Icon: Layers },
};
const modeMeta = (m) => MODE_META[m] || { label: m, color: C.t3, Icon: MessageSquare };

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtDateTime(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function InterviewHistoryPanel({ accent }) {
  const [sessions, setSessions] = useState(null); // null = loading

  useEffect(() => { DB.getInterviewSessions().then(setSessions).catch(() => setSessions([])); }, []);

  // getInterviewSessions() returns newest-first.
  const scored = useMemo(() => (sessions || []).filter(s => typeof s.score === 'number'), [sessions]);
  const avgScore = scored.length ? Math.round((scored.reduce((s, x) => s + x.score, 0) / scored.length) * 10) / 10 : null;
  const byMode = useMemo(() => {
    const m = {};
    for (const s of (sessions || [])) m[s.mode] = (m[s.mode] || 0) + 1;
    return m;
  }, [sessions]);
  // Oldest→newest, capped to the most recent 14 scored sessions so the chart stays legible.
  const trendPoints = useMemo(() => scored.slice(0, 14).reverse(), [scored]);
  const trendDelta = trendPoints.length >= 2
    ? Math.round((trendPoints[trendPoints.length - 1].score - trendPoints[0].score) * 10) / 10
    : null;

  const chartData = useMemo(() => ({
    labels: trendPoints.map(s => fmtDate(s.completedAt)),
    datasets: [{
      label: 'Score',
      data: trendPoints.map(s => s.score),
      borderColor: accent,
      backgroundColor: `${accent}22`,
      pointBackgroundColor: accent,
      pointRadius: 3.5,
      tension: 0.35,
      fill: true,
    }],
  }), [trendPoints, accent]);

  if (sessions === null) {
    return <div style={glass({ padding: 30, textAlign: 'center' })}><div style={{ fontSize: 13, color: C.t3 }}>Loading your session history…</div></div>;
  }

  if (!sessions.length) {
    return (
      <div style={{ ...glass({ padding: 34, textAlign: 'center' }) }}>
        <Trophy size={30} color={C.t4} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>No sessions yet</div>
        <div style={{ fontSize: 12.5, color: C.t3, maxWidth: 360, margin: '0 auto' }}>Practice a mock interview in any mode above — every session, and its score, shows up here so you can watch yourself improve.</div>
      </div>
    );
  }

  return (
    <div style={CC({ gap: 16 })}>
      <div style={G(3, 12, {}, false)}>
        <div style={glass2({ padding: 14 })}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{sessions.length}</div>
          <div style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Sessions practiced</div>
        </div>
        <div style={glass2({ padding: 14 })}>
          <div style={{ fontSize: 22, fontWeight: 800, color: accent, fontFamily: C.FD }}>{avgScore !== null ? `${avgScore}/10` : '—'}</div>
          <div style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Average score</div>
        </div>
        <div style={glass2({ padding: 14 })}>
          <div style={{ ...R({ gap: 5 }), fontSize: 22, fontWeight: 800, color: trendDelta > 0 ? C.green : trendDelta < 0 ? C.rose : C.t3, fontFamily: C.FD }}>
            {trendDelta > 0 ? <TrendingUp size={17} /> : trendDelta < 0 ? <TrendingDown size={17} /> : <Minus size={17} />}
            {trendDelta !== null ? `${trendDelta > 0 ? '+' : ''}${trendDelta}` : '—'}
          </div>
          <div style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Trend (first → latest)</div>
        </div>
      </div>

      {trendPoints.length >= 2 && (
        <div style={glass({ padding: 18 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 12 }}>Score Trend</div>
          <div style={{ height: 190 }}>
            <Line
              data={chartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: C.t3, font: { family: C.FM }, stepSize: 2 } },
                  x: { grid: { display: false }, ticks: { color: C.t3 } },
                },
              }}
            />
          </div>
        </div>
      )}

      {Object.keys(byMode).length > 1 && (
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          {Object.entries(byMode).map(([m, n]) => {
            const { label, color, Icon } = modeMeta(m);
            return (
              <span key={m} style={{ ...pill(`${color}15`, color, { fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon size={11} />{label} · {n}
              </span>
            );
          })}
        </div>
      )}

      <div style={glass({ padding: 0, overflow: 'hidden' })}>
        <div style={{ padding: '14px 18px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>Session Log</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.slice(0, 40).map((s, i) => {
            const { label, color, Icon } = modeMeta(s.mode);
            return (
              <motion.div key={s.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderTop: `1px solid ${C.b1}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.question || label}</div>
                  <div style={{ ...R({ gap: 6 }), fontSize: 10.5, color: C.t3, marginTop: 2 }}>
                    <Calendar size={10} />{fmtDateTime(s.completedAt)} · <span style={{ color }}>{label}</span>
                  </div>
                </div>
                {typeof s.score === 'number' && (
                  <span style={pill(s.score >= 8 ? C.greenDim : s.score >= 5 ? C.amberDim : C.roseDim, s.score >= 8 ? C.greenL : s.score >= 5 ? C.amberL : C.roseL, { fontSize: 11, fontFamily: C.FM, flexShrink: 0 })}>
                    {s.score}/10
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
