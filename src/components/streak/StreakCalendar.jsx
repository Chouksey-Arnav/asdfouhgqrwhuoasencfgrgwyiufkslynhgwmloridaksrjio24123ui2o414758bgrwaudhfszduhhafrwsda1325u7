// ─────────────────────────────────────────────────────────────────────────────
// The streak calendar — a real month grid, not a contribution heatmap.
//
// StreakHeatmap (the 18-week dot grid) answers "how consistent have I been
// lately", at a glance, in a card. This answers a different question: "what
// happened on the 14th, and why does my streak say 12 instead of 19." A student
// arguing with their own streak needs to be able to point at a day, and a
// 10px dot in an undated grid cannot be pointed at. So: dated cells, a legible
// fill that encodes how much of the day's goal was met, freeze days marked as
// what they are, and a tap that opens the day's actual breakdown.
//
// Six rows always. A calendar that changes height as you page through months is
// the most jarring thing a calendar can do.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Snowflake } from 'lucide-react';
import { C, glass2, R, pill, tint, CONTROL_TRANSITION } from '../../lib/theme';
import { STREAK_ACTIONS, buildMonthGrid, monthSummary, WEEKDAY_LETTERS } from '../../lib/streak';

const MONTH_FMT = { month: 'long', year: 'numeric' };

export default function StreakCalendar({
  activity = new Map(),   // Map<'YYYY-MM-DD', dayActivity row>
  bridged = new Set(),    // dates covered by a spent streak freeze
  goalCredits = 4,
  accent = C.amber,
  m = false,
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState(null);

  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const cells = useMemo(
    () => buildMonthGrid(monthDate, { activity, bridged, goalCredits }),
    [monthDate, activity, bridged, goalCredits],
  );
  const summary = useMemo(() => monthSummary(cells), [cells]);
  const selectedCell = selected ? cells.find(c => c.key === selected) : null;

  const cellSize = m ? 34 : 40;

  return (
    <div>
      {/* Month bar */}
      <div style={R({ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 })}>
        <div style={R({ gap: 8 })}>
          <MonthButton label="Previous month" onClick={() => { setMonthOffset(o => o - 1); setSelected(null); }}>
            <ChevronLeft size={15} />
          </MonthButton>
          <div style={{ fontSize: m ? 14 : 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, minWidth: m ? 130 : 150, textAlign: 'center' }}>
            {monthDate.toLocaleDateString(undefined, MONTH_FMT)}
          </div>
          <MonthButton label="Next month" disabled={monthOffset >= 0} onClick={() => { setMonthOffset(o => Math.min(0, o + 1)); setSelected(null); }}>
            <ChevronRight size={15} />
          </MonthButton>
        </div>
        <span style={pill(tint(accent, 0.14), accent, { fontFamily: C.FM, fontSize: 11 })}>
          {summary.met}/{summary.elapsed} days earned
        </span>
      </div>

      {/* Weekday header — Monday-first, matching the perfect-week window */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAY_LETTERS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.t4, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>{d}</div>
        ))}
      </div>

      {/* The grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map(c => (
          <DayCell
            key={c.key} cell={c} size={cellSize} accent={accent}
            selected={selected === c.key}
            onSelect={() => setSelected(s => (s === c.key ? null : c.key))}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={R({ gap: 12, marginTop: 12, flexWrap: 'wrap' })}>
        <Legend swatch={<div style={{ width: 11, height: 11, borderRadius: 4, background: accent, boxShadow: `0 0 8px ${accent}70` }} />} label="Goal earned" />
        <Legend swatch={<div style={{ width: 11, height: 11, borderRadius: 4, background: tint(accent, 0.3), border: `1px solid ${tint(accent, 0.5)}` }} />} label="Partial" />
        <Legend swatch={<Snowflake size={11} color={C.blueL} />} label="Freeze used" />
        <Legend swatch={<div style={{ width: 11, height: 11, borderRadius: 4, background: C.s3 }} />} label="Missed" />
      </div>

      {/* Day detail — the reason this is a calendar and not a heatmap */}
      {selectedCell && <DayDetail cell={selectedCell} accent={accent} goalCredits={goalCredits} />}
    </div>
  );
}

function MonthButton({ children, onClick, disabled, label }) {
  return (
    <button
      onClick={onClick} disabled={disabled} aria-label={label}
      style={{
        width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.surfHi, border: `1px solid ${C.b1}`, color: disabled ? C.t4 : C.t2,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, transition: CONTROL_TRANSITION,
      }}
    >{children}</button>
  );
}

function Legend({ swatch, label }) {
  return (
    <span style={R({ gap: 4 })}>
      {swatch}
      <span style={{ fontSize: 10.5, color: C.t3 }}>{label}</span>
    </span>
  );
}

function DayCell({ cell, size, accent, selected, onSelect }) {
  const { met, frozen, future, inMonth, isToday, pct, date } = cell;
  // Partial days are filled proportionally rather than shown as a flat "missed"
  // — 3 of 4 credits is genuinely different from doing nothing, and a student
  // who can see it is a student who knows how close they were.
  const fillAlpha = met ? 1 : Math.max(0, Math.min(0.42, (pct / 100) * 0.42));
  const bg = future ? 'transparent'
    : met ? accent
      : frozen ? tint(C.blue, 0.22)
        : pct > 0 ? tint(accent, fillAlpha)
          : inMonth ? C.s2 : 'transparent';

  const label = `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${
    future ? '' : met ? ' — goal earned' : frozen ? ' — covered by a streak freeze' : pct > 0 ? ` — ${pct}% of goal` : ' — no study logged'}`;

  return (
    <button
      onClick={future ? undefined : onSelect}
      title={label} aria-label={label}
      disabled={future}
      style={{
        height: size, borderRadius: 8, padding: 0, position: 'relative',
        background: bg,
        border: selected ? `1.5px solid ${accent}`
          : isToday ? `1.5px solid ${tint(accent, 0.55)}`
            : `1px solid ${inMonth && !future ? C.b1 : 'transparent'}`,
        color: met ? (C.onAccent || '#fff') : inMonth ? C.t2 : C.t4,
        opacity: future ? 0.3 : inMonth ? 1 : 0.4,
        cursor: future ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11.5, fontWeight: met ? 800 : 600, fontFamily: C.FM,
        boxShadow: met ? `0 0 10px ${accent}55` : 'none',
        transition: 'transform .12s, box-shadow .15s',
      }}
    >
      {date.getDate()}
      {frozen && (
        <Snowflake size={9} color={C.blueL} style={{ position: 'absolute', top: 2, right: 2 }} />
      )}
      {met && (
        <Flame size={9} color={C.onAccent || '#fff'} style={{ position: 'absolute', top: 2, right: 2, opacity: 0.75 }} />
      )}
    </button>
  );
}

function DayDetail({ cell, accent, goalCredits }) {
  const entries = Object.entries(cell.counts || {}).filter(([, n]) => n > 0);
  const target = cell.pct && cell.credits ? Math.round((cell.credits / cell.pct) * 100) : goalCredits;
  return (
    <div style={glass2({ marginTop: 12, padding: 12, borderColor: tint(accent, 0.3) })}>
      <div style={R({ justifyContent: 'space-between', marginBottom: entries.length ? 10 : 0, flexWrap: 'wrap', gap: 4 })}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
          {cell.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        <span style={pill(cell.met ? tint(accent, 0.16) : C.s3, cell.met ? accent : C.t3, { fontFamily: C.FM, fontSize: 10.5 })}>
          {cell.credits}/{Math.max(1, target)} credits
        </span>
      </div>
      {entries.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {entries.map(([action, n]) => (
            <span key={action} style={pill(C.s3, C.t2, { fontSize: 10.5 })}>
              {STREAK_ACTIONS[action]?.short || action}{n > 1 ? ` ×${n}` : ''}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: C.t3 }}>
          {cell.met
            ? 'Earned before the app started itemising days — it counts.'
            : cell.frozen
              ? 'A streak freeze covered this day, so the streak survived it.'
              : 'Nothing logged. One lesson or two quizzes would have carried it.'}
        </div>
      )}
    </div>
  );
}
