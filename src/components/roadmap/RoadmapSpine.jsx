import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarSearch, CheckCircle2, Flag } from 'lucide-react';
import { C, tint, R } from '../../lib/theme';
import { displaysExactDate } from '../../data/roadmap/index.js';
import { effectiveDue, itemUrgency, allItems, monthlyLoad } from '../../lib/roadmap/model';
import { trackColor, fmtMonth, URGENCY_META } from './roadmapUi';

// ─────────────────────────────────────────────────────────────────────────────
// The spine: twelve months of the student's year on one screen.
//
// ── Why the year is drawn, and what the drawing is actually for ─────────────
// The list views answer "what do I do next". This answers the two questions a
// list structurally cannot:
//
//   1. WHEN DOES MY YEAR GET HARD? Every item's load is spread across its
//      PREPARATION window rather than stacked on its deadline (see monthlyLoad
//      in model.js), so the tall months here are the months the work actually
//      lands in. A student can see in one glance that next March is a wall —
//      three months before it becomes one — which is the single most useful
//      thing a year-long plan can tell someone, and which no calendar of due
//      dates has ever managed to say.
//   2. WHERE ARE THE GAPS? A quarter with nothing in it is information. It
//      either means the roadmap is thin there, or it means that stretch is
//      deliberately clear — and the season themes underneath say which.
//
// ── Rendering rules ─────────────────────────────────────────────────────────
// Markers are positioned by date but the DATE ITSELF IS NEVER PRINTED HERE.
// Unconfirmed items get a hollow marker with a dotted stem so an approximate
// position never reads as a precise one — the visual equivalent of the caveat
// that dateCaption() writes in prose. Hovering names the item; opening it is
// what shows any date text, through <ItemDate>.
//
// Deliberately not a charting library. This is ten bars and forty dots in an
// SVG, drawn with the app's own palette so it reads as part of the product
// rather than as an embedded widget with its own visual opinions.
// ─────────────────────────────────────────────────────────────────────────────

const H = 132;          // drawing height
const RAIL_Y = 96;      // the month rail
const PAD_X = 14;

export default function RoadmapSpine({ roadmap, today, onSelectItem, onSelectSeason, isMobile = false }) {
  const items = allItems(roadmap);
  const seasons = roadmap?.seasons || [];

  const { months, load, maxLoad, markers, todayX, width } = useMemo(() => {
    const start = roadmap?.startDate;
    const end = roadmap?.endDate;
    if (!start || !end) return { months: [], load: [], maxLoad: 1, markers: [], todayX: null, width: 0 };

    // One column per month between start and end, inclusive.
    const monthKeys = [];
    let cursor = start.slice(0, 7);
    const endKey = end.slice(0, 7);
    for (let i = 0; i < 14 && cursor <= endKey; i += 1) {
      monthKeys.push(cursor);
      const [y, m] = cursor.split('-').map(Number);
      cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }

    const loadByMonth = Object.fromEntries(monthlyLoad(roadmap).map((l) => [l.month, l.load]));
    const loadSeries = monthKeys.map((k) => ({ month: k, load: loadByMonth[k] || 0 }));
    const max = Math.max(1, ...loadSeries.map((l) => l.load));

    // A fixed per-month width and a horizontally scrollable surface, rather than
    // squeezing twelve months into a phone. A year compressed to 320px is a
    // decoration; a year you can push sideways is a document.
    const colW = isMobile ? 52 : 74;
    const w = PAD_X * 2 + monthKeys.length * colW;

    const xForDate = (d) => {
      if (!d) return null;
      const key = d.slice(0, 7);
      const idx = monthKeys.indexOf(key);
      if (idx === -1) return null;
      const day = Number(d.slice(8, 10)) || 1;
      return PAD_X + idx * colW + (day / 31) * colW;
    };

    const marks = items
      .filter((i) => i.status !== 'skipped')
      .map((i) => {
        const due = effectiveDue(i);
        const x = xForDate(due);
        if (x == null) return null;
        return {
          id: i.id,
          title: i.title,
          x,
          color: trackColor(i.track),
          exact: displaysExactDate(i),
          done: i.status === 'done',
          urgency: itemUrgency(i, today),
        };
      })
      .filter(Boolean)
      // Stable draw order: done underneath, urgent on top, so an overdue marker
      // is never hidden behind three completed ones.
      .sort((a, b) => (a.done === b.done ? 0 : a.done ? -1 : 1));

    return { months: monthKeys, load: loadSeries, maxLoad: max, markers: marks, todayX: xForDate(today), width: w, colW };
  }, [roadmap, items, today, isMobile]);

  if (!months.length) return null;

  const colW = isMobile ? 52 : 74;

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 6 }} className="subnav-scroll">
        <svg width={width} height={H} role="img"
          aria-label={`Your year at a glance: ${markers.length} dated items across ${months.length} months, with busier months drawn taller.`}
          style={{ display: 'block' }}>

          {/* Season bands, behind everything. These are what make the drawing a
              strategy rather than a scatter plot. */}
          {seasons.map((s, i) => {
            const x1 = monthX(months, s.startDate, colW);
            const x2 = monthX(months, s.endDate, colW, true);
            if (x1 == null || x2 == null) return null;
            return (
              <g key={s.id}>
                <rect
                  x={x1} y={8} width={Math.max(2, x2 - x1)} height={RAIL_Y - 8}
                  fill={i % 2 === 0 ? tint(C.violet, 0.05) : 'transparent'}
                  onClick={() => onSelectSeason?.(s.id)}
                  style={{ cursor: onSelectSeason ? 'pointer' : 'default' }}
                />
                <text x={x1 + 6} y={20} fill={C.t4} fontSize={9} fontWeight={700} letterSpacing=".08em">
                  {(s.theme || s.label).toUpperCase().slice(0, Math.floor((x2 - x1) / 6))}
                </text>
              </g>
            );
          })}

          {/* Load bars — how heavy each month actually is. */}
          {load.map((l, i) => {
            const h = Math.round((l.load / maxLoad) * 46);
            const x = PAD_X + i * colW + 5;
            const heavy = l.load > maxLoad * 0.7;
            return (
              <rect
                key={l.month}
                x={x} y={RAIL_Y - 8 - h} width={colW - 10} height={Math.max(1, h)} rx={3}
                fill={heavy ? tint(C.amber, 0.5) : tint(C.blue, 0.28)}
              >
                <title>{`${fmtMonth(l.month)} — ${heavy ? 'one of your heaviest months' : 'a lighter month'}`}</title>
              </rect>
            );
          })}

          {/* The rail. */}
          <line x1={PAD_X} y1={RAIL_Y} x2={width - PAD_X} y2={RAIL_Y} stroke={C.b2} strokeWidth={1} />

          {/* Month labels. */}
          {months.map((m, i) => (
            <text key={m} x={PAD_X + i * colW + colW / 2} y={RAIL_Y + 17} fill={C.t4} fontSize={9.5} textAnchor="middle" fontFamily={C.FM}>
              {fmtMonth(m).replace(' ', ' ’').replace(/’(\d{2})(\d{2})/, '’$2')}
            </text>
          ))}

          {/* Today. */}
          {todayX != null && (
            <g>
              <line x1={todayX} y1={14} x2={todayX} y2={RAIL_Y + 4} stroke={C.green} strokeWidth={1.5} strokeDasharray="3 3" />
              <circle cx={todayX} cy={RAIL_Y} r={3.5} fill={C.green} />
              <text x={todayX} y={RAIL_Y + 30} fill={C.green} fontSize={9} textAnchor="middle" fontWeight={700}>TODAY</text>
            </g>
          )}

          {/* Item markers. Hollow + dotted stem = the position is approximate.
              A filled marker means the date is confirmed. */}
          {markers.map((mk, i) => {
            const y = RAIL_Y - 26 - (i % 3) * 9; // gentle stagger so clusters stay countable
            return (
              <g key={mk.id} onClick={() => onSelectItem?.(mk.id)} style={{ cursor: onSelectItem ? 'pointer' : 'default' }}>
                <line x1={mk.x} y1={y} x2={mk.x} y2={RAIL_Y} stroke={mk.exact ? tint(mk.color, 0.5) : tint(mk.color, 0.35)}
                  strokeWidth={1} strokeDasharray={mk.exact ? undefined : '2 3'} />
                <circle
                  cx={mk.x} cy={y} r={mk.done ? 3.5 : 4.5}
                  fill={mk.done ? C.green : mk.exact ? mk.color : C.bg}
                  stroke={mk.done ? C.green : mk.color}
                  strokeWidth={mk.exact || mk.done ? 0 : 1.6}
                  opacity={mk.done ? 0.55 : 1}
                />
                <title>{`${mk.title}${mk.done ? ' — done' : mk.exact ? '' : ' — position is approximate; the exact date varies'}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend. The dotted/hollow distinction carries the honesty rule and is
          meaningless unless it is explained once, here. */}
      <div style={{ ...R({ gap: 16, flexWrap: 'wrap', marginTop: 10 }) }}>
        <LegendDot filled label="Confirmed date" />
        <LegendDot label="Approximate — exact date varies" />
        <span style={{ ...R({ gap: 6 }) }}>
          <span style={{ width: 14, height: 7, borderRadius: 2, background: tint(C.amber, 0.5) }} />
          <span style={{ fontSize: 10.5, color: C.t4 }}>Heavier month</span>
        </span>
        <span style={{ ...R({ gap: 6 }) }}>
          <CheckCircle2 size={11} color={C.green} />
          <span style={{ fontSize: 10.5, color: C.t4 }}>Done</span>
        </span>
      </div>
    </div>
  );
}

function LegendDot({ filled = false, label }) {
  return (
    <span style={{ ...R({ gap: 6 }) }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%',
        background: filled ? C.violet : 'transparent',
        border: filled ? 'none' : `1.5px solid ${C.violet}`,
      }} />
      <span style={{ fontSize: 10.5, color: C.t4 }}>{label}</span>
    </span>
  );
}

/** x position for a date, or null when it falls outside the drawn months. */
function monthX(months, date, colW, end = false) {
  if (!date) return null;
  const idx = months.indexOf(date.slice(0, 7));
  if (idx === -1) return null;
  const day = Number(date.slice(8, 10)) || 1;
  return PAD_X + idx * colW + (end ? Math.min(colW, (day / 31) * colW + 2) : (day / 31) * colW);
}

/** The urgency colour key, re-exported so callers can tint a spine row to match a list. */
export { URGENCY_META, CalendarSearch, Flag };
