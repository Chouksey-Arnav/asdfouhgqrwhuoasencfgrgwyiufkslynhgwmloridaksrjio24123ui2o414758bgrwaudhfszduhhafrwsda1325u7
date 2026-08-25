// ─────────────────────────────────────────────────────────────────────────────
// Module 4 — The sixty-day horizon.
//
// Every dated thing in the next sixty days, color-coded by urgency.
//
// ── Why sixty and not thirty or ninety ──────────────────────────────────────
// Sixty days is the first rung of the app's own alert ladder (ALERT_OFFSETS in
// src/lib/milestoneUrgency.js: 60, 30, 7) and it is the point at which most
// application work has to START rather than the point at which it is due.
// Thirty is already too late for anything needing a recommendation letter;
// ninety is far enough out that everything looks equally distant and the
// student learns to ignore the module.
//
// ── Why urgency and not date order ──────────────────────────────────────────
// Color comes from the slack model, not from days remaining. A form due in
// thirty days that takes an afternoon is green; a program closing in fifty-five
// that needs two months of run-up is red, because the moment to start it has
// already passed. Sorting or coloring by date gets that exactly backwards, and
// getting it backwards is how a student misses the deadline that mattered while
// doing the one that did not. See milestoneUrgency.js for the full argument.
//
// Rows are laid out on a real timeline rather than as a list, so the CLUSTERS
// are visible: three things in the same week is a fact a list cannot show and
// is usually the most useful thing on this module.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { C, glass, glass2, R, CC, pill, tint } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { urgencyOf } from '../../lib/milestoneUrgency';

export const HORIZON_DAYS = 60;

// The urgency bands, mapped to the palette. Rose is not "bad" here — it is
// "the run-up for this has already started", which is information, not a
// scolding.
const BAND_TONE = {
  overdue:    { color: C.rose,   label: 'Past its date' },
  late:       { color: C.rose,   label: 'Later than you wanted' },
  start_now:  { color: C.amber,  label: 'Start now' },
  start_soon: { color: C.amber,  label: 'Start within two weeks' },
  on_track:   { color: C.sky,    label: 'Time in hand' },
};

const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function DeadlineHorizon({
  deadlines = [], onOpen, onOpenAll, accent = C.rose, m = false, today = new Date(),
}) {
  const rows = useMemo(() => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const out = [];
    for (const row of deadlines || []) {
      if (!row?.due_date || row.completed_at) continue;
      const due = new Date(`${row.due_date}T00:00:00`);
      if (Number.isNaN(due.getTime())) continue;
      const days = Math.round((due - t) / 86400000);
      // Overdue rows stay in view. A date that slipped past is the single most
      // actionable thing on this module, and dropping it the day after it
      // passes is how a missed deadline becomes an invisible missed deadline.
      if (days > HORIZON_DAYS) continue;
      const u = urgencyOf({ ...row, days });
      out.push({ ...row, days, urgency: u, tone: BAND_TONE[u.band.id] || BAND_TONE.on_track });
    }
    // Ordered by real urgency (band, then how much of the window the work
    // consumes), with the date as the last tiebreak rather than the first.
    return out.sort((a, b) =>
      (a.urgency.band.rank - b.urgency.band.rank)
      || (b.urgency.pressure - a.urgency.pressure)
      || (a.days - b.days));
  }, [deadlines, today]);

  const shown = rows.slice(0, 6);

  return (
    <div style={glass({ padding: m ? 18 : 22 })}>
      <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }) }}>
        <SectionTitle icon={CalendarClock} color={accent} extra={{ marginBottom: 0 }}>
          Next {HORIZON_DAYS} days
        </SectionTitle>
        {rows.length > 0 && (
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>
            {rows.length} dated {rows.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '8px 0 16px', lineHeight: 1.5 }}>
        Colored by when the work has to <em>start</em>, not by when it is due — which for anything
        needing a letter or a signature is weeks earlier.
      </p>

      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.5 }}>
          Nothing dated in the next {HORIZON_DAYS} days. When you save a program or a deadline, it
          shows up here with its real start-by date.
        </div>
      ) : (
        <>
          {/* The horizon strip: every item placed on the same 0–60 day axis, so
              a cluster reads as a cluster. Overdue items pin to the left edge. */}
          {!m && (
            <div style={{
              position: 'relative', height: 34, marginBottom: 16,
              borderBottom: `1px solid ${C.b1}`,
            }}>
              {rows.map((r, i) => {
                const pos = Math.max(0, Math.min(100, (Math.max(0, r.days) / HORIZON_DAYS) * 100));
                return (
                  <span
                    key={r.id || i}
                    title={`${r.title} — ${fmtDate(r.due_date)}`}
                    style={{
                      position: 'absolute', left: `${pos}%`, bottom: 0, transform: 'translateX(-50%)',
                      width: 9, height: 9, borderRadius: '50%',
                      background: r.tone.color, boxShadow: `0 0 8px ${r.tone.color}80`,
                    }}
                  />
                );
              })}
              <span style={{ position: 'absolute', left: 0, top: 0, fontSize: 9.5, color: C.t3, fontFamily: C.FM }}>today</span>
              <span style={{ position: 'absolute', right: 0, top: 0, fontSize: 9.5, color: C.t3, fontFamily: C.FM }}>+{HORIZON_DAYS}d</span>
            </div>
          )}

          <div style={CC({ gap: 8 })}>
            {shown.map((r, i) => (
              <div
                key={r.id || i}
                onClick={onOpen ? () => onOpen(r) : undefined}
                style={{
                  ...glass2({ padding: '8px 12px' }),
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderLeft: `3px solid ${r.tone.color}`,
                  cursor: onOpen ? 'pointer' : 'default',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.title || 'Untitled'}</span>
                  <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4 }}>
                    {fmtDate(r.due_date)}
                    {r.days < 0
                      ? ` · ${Math.abs(r.days)} day${Math.abs(r.days) === 1 ? '' : 's'} ago`
                      : r.days === 0 ? ' · today' : ` · in ${r.days} day${r.days === 1 ? '' : 's'}`}
                  </span>
                </span>
                <span style={{ ...pill(tint(r.tone.color, 0.14), r.tone.color, { flexShrink: 0, fontSize: 10 }) }}>
                  {r.tone.label}
                </span>
              </div>
            ))}
          </div>

          {(rows.length > shown.length || onOpenAll) && (
            <button
              type="button" onClick={onOpenAll}
              style={{
                marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                font: 'inherit', color: accent, fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {rows.length > shown.length ? `${rows.length - shown.length} more` : 'All milestones'}
              <ArrowRight size={12} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
