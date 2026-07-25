import React, { useState, useEffect, useMemo } from 'react';
import { C, lbl, R } from '../lib/theme';
import * as DB from '../lib/db';
import { localDateStr } from '../lib/dateUtils';

const WEEKS = 18;

export default function StreakHeatmap({ accent = C.blue }) {
  const [days, setDays] = useState(null);

  useEffect(() => { DB.getStudyDays().then(setDays).catch(() => setDays([])); }, []);

  const { cells, monthLabels, studiedCount, activeDayCount } = useMemo(() => {
    if (!days) return { cells: [], monthLabels: [], studiedCount: 0, activeDayCount: 0 };
    const studied = new Set(days);
    const today = new Date();
    today.setHours(0,0,0,0);
    const totalDays = WEEKS * 7;
    // Align the grid so the last column ends on today.
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1) - today.getDay());
    const out = [];
    let studiedCount = 0, activeDayCount = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = localDateStr(d);
      const future = d > today;
      const active = studied.has(key);
      if (!future) { activeDayCount++; if (active) studiedCount++; }
      out.push({ key, date: d, active, future, isToday: !future && d.getTime() === today.getTime(), col: Math.floor(i / 7) });
    }
    // One label per column, stamped on that column's first day of the month (if any land in it).
    const monthLabels = Array.from({ length: WEEKS }, (_, col) => {
      const colCells = out.filter(c => c.col === col);
      const firstOfMonth = colCells.find(c => c.date.getDate() <= 7);
      return firstOfMonth ? firstOfMonth.date.toLocaleDateString(undefined, { month: 'short' }) : '';
    });
    return { cells: out, monthLabels, studiedCount, activeDayCount };
  }, [days]);

  if (!days) return null;

  return (
    <div>
      <div style={R({ justifyContent: 'space-between', marginBottom: 6 })}>
        <div style={{ ...lbl(), marginBottom: 0 }}>Study Activity</div>
        <span style={{ fontSize: 11, color: C.t3 }}>{studiedCount} of last {activeDayCount} days</span>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEKS},1fr)`, gap: 3, width: 'fit-content', marginBottom: 3 }}>
          {monthLabels.map((m, i) => (
            <div key={i} style={{ fontSize: 8.5, color: C.t4, fontFamily: C.FM, height: 11 }}>{m}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${WEEKS},1fr)`,gridAutoFlow:'column',gridTemplateRows:'repeat(7,1fr)',gap:3,width:'fit-content'}}>
          {cells.map(c => (
            <div key={c.key} title={`${c.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})}${c.active?' — studied':c.future?'':' — no study logged'}`} style={{
              width:10,height:10,borderRadius:2,
              background: c.future ? 'transparent' : c.active ? accent : C.s3,
              opacity: c.future ? 0 : c.active ? 1 : 0.6,
              boxShadow: c.active ? `0 0 5px ${accent}60` : undefined,
              outline: c.isToday ? `1.5px solid ${accent}` : 'none',
              outlineOffset: c.isToday ? 1 : 0,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
