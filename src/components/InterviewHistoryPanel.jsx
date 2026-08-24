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
import { normalizeStoredScore, SCALE_MAX, anchorFor } from '../lib/interviewScore';

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

  // getInterviewSessions() returns newest-first. Sessions saved before the switch to the real
  // seven-point MMI scale carry a ten-point number and no `scale` field; normalizeStoredScore maps
  // those onto the new scale at their band boundaries so a single chart doesn't silently mix two
  // rulers. Old sessions therefore move DOWN when they are redrawn, which is correct — the old
  // numbers were the generous ones.
  const scored = useMemo(
    () => (sessions || [])
      .map(s => ({ ...s, score7: normalizeStoredScore(s) }))
      .filter(s => typeof s.score7 === 'number'),
    [sessions],
  );
  const avgScore = scored.length ? Math.round((scored.reduce((s, x) => s + x.score7, 0) / scored.length) * 10) / 10 : null;
  const byMode = useMemo(() => {
    const m = {};
    for (const s of (sessions || [])) m[s.mode] = (m[s.mode] || 0) + 1;
    return m;
  }, [sessions]);
  // Oldest→newest, capped to the most recent 14 scored sessions so the chart stays legible.
  const trendPoints = useMemo(() => scored.slice(0, 14).reverse(), [scored]);
  const trendDelta = trendPoints.length >= 2
    ? Math.round((trendPoints[trendPoints.length - 1].score7 - trendPoints[0].score7) * 10) / 10
    : null;

  const chartData = useMemo(() => ({
    labels: trendPoints.map(s => fmtDate(s.completedAt)),
    datasets: [{
      label: 'Score',
      data: trendPoints.map(s => s.score7),
      borderColor: accent,
      backgroundColor: `${accent}22`,
      pointBackgroundColor: accent,
      pointRadius: 3.5,
      tension: 0.35,
      fill: true,
    }],
  }), [trendPoints, accent]);

  if (sessions === null) {
    return <div style={glass({ padding: 28, textAlign: 'center' })}><div style={{ fontSize: 13, color: C.t3 }}>Loading your session history…</div></div>;
  }

  if (!sessions.length) {
    return (
      <div style={{ ...glass({ padding: 32, textAlign: 'center' }) }}>
        <Trophy size={30} color={C.t4} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>No sessions yet</div>
        <div style={{ fontSize: 12.5, color: C.t3, maxWidth: 360, margin: '0 auto' }}>Practice a mock interview in any mode above — every session, and its score, shows up here so you can watch yourself improve.</div>
      </div>
    );
  }

  return (
    <div style={CC({ gap: 16 })}>
      <div style={G(3, 12, {}, false)}>
        <div style={glass2({ padding: 12 })}>
          <div style={{ fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{sessions.length}</div>
          <div style={{ fontSize: 10, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginTop: 4 }}>Sessions practiced</div>
        </div>
        <div style={glass2({ padding: 12 })}>
          <div style={{ fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', fontWeight: 800, color: accent, fontFamily: C.FD }}>{avgScore !== null ? `${avgScore}/${SCALE_MAX}` : '—'}</div>
          <div style={{ fontSize: 10, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginTop: 4 }}>Average score</div>
          {avgScore !== null && <div style={{ fontSize: 9.5, color: C.t4, marginTop: 4, lineHeight: 1.4 }}>{anchorFor(avgScore).label}</div>}
        </div>
        <div style={glass2({ padding: 12 })}>
          <div style={{ ...R({ gap: 4 }), fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', fontWeight: 800, color: trendDelta > 0 ? C.green : trendDelta < 0 ? C.rose : C.t3, fontFamily: C.FD }}>
            {trendDelta > 0 ? <TrendingUp size={17} /> : trendDelta < 0 ? <TrendingDown size={17} /> : <Minus size={17} />}
            {trendDelta !== null ? `${trendDelta > 0 ? '+' : ''}${trendDelta}` : '—'}
          </div>
          <div style={{ fontSize: 10, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginTop: 4 }}>Trend (first → latest)</div>
        </div>
      </div>

      {trendPoints.length >= 2 && (
        <div style={glass({ padding: 16 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 12 }}>Score Trend</div>
          <div style={{ height: 190 }}>
            <Line
              data={chartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 1, max: SCALE_MAX, grid: { color: C.b1 }, ticks: { color: C.t3, font: { family: C.FM }, stepSize: 1 } },
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
              <span key={m} style={{ ...pill(`${color}15`, color, { fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon size={11} />{label} · {n}
              </span>
            );
          })}
        </div>
      )}

      <div style={glass({ padding: 0, overflow: 'hidden' })}>
        <div style={{ padding: '12px 16px 8px', fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Session Log</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.slice(0, 40).map((s, i) => {
            const { label, color, Icon } = modeMeta(s.mode);
            return (
              <motion.div key={s.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: `1px solid ${C.b1}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.question || label}</div>
                  <div style={{ ...R({ gap: 4 }), fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                    <Calendar size={10} />{fmtDateTime(s.completedAt)} · <span style={{ color }}>{label}</span>
                  </div>
                </div>
                {(() => {
                  const score = normalizeStoredScore(s);
                  if (typeof score !== 'number') return null;
                  return (
                    <span title={anchorFor(score).blurb}
                      style={pill(score >= 6 ? C.greenDim : score >= 4 ? C.amberDim : C.roseDim, score >= 6 ? C.greenL : score >= 4 ? C.amberL : C.roseL, { fontSize: 11, fontFamily: C.FM, flexShrink: 0 })}>
                      {score}/{SCALE_MAX}
                    </span>
                  );
                })()}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
