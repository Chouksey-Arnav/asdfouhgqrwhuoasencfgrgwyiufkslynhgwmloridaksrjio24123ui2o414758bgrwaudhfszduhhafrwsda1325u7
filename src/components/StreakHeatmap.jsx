import React, { useState, useEffect, useMemo } from 'react';
import { C, lbl, R } from '../lib/theme';
import * as DB from '../lib/db';

const WEEKS = 18;

export default function StreakHeatmap({ accent = C.blue }) {
  const [days, setDays] = useState(null);

  useEffect(() => { DB.getStudyDays().then(setDays).catch(() => setDays([])); }, []);

  const cells = useMemo(() => {
    if (!days) return [];
    const studied = new Set(days);
    const today = new Date();
    today.setHours(0,0,0,0);
    const totalDays = WEEKS * 7;
    // Align the grid so the last column ends on today.
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1) - today.getDay());
    const out = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().split('T')[0];
      out.push({ key, active: studied.has(key), future: d > today });
    }
    return out;
  }, [days]);

  if (!days) return null;

  return (
    <div>
      <div style={lbl()}>Study Activity</div>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${WEEKS},1fr)`,gridAutoFlow:'column',gridTemplateRows:'repeat(7,1fr)',gap:3,width:'fit-content'}}>
        {cells.map(c => (
          <div key={c.key} title={c.key} style={{
            width:10,height:10,borderRadius:2,
            background: c.future ? 'transparent' : c.active ? accent : C.s3,
            opacity: c.future ? 0 : c.active ? 1 : 0.6,
          }}/>
        ))}
      </div>
    </div>
  );
}
