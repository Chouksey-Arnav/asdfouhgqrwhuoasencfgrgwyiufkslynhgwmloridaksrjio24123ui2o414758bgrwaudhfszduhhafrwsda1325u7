import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarSearch, ChevronRight, Target, CheckCircle2 } from 'lucide-react';
import { C, tint, R, glass2 } from '../../lib/theme';
import { dayKey } from '../../lib/timeline';
import { allItems, effectiveDue, itemUrgency, awaitingDate } from '../../lib/roadmap/model';
import { ItemDate, TrackChip, UrgencyChip, trackColor, fmtMonth, TRACK_ICON, URGENCY_META } from './roadmapUi';

// ─────────────────────────────────────────────────────────────────────────────
// The full timeline of events: every dated thing in the year, in the order it
// happens, hung off one continuous vertical line.
//
// ── Why this exists beside the spine ────────────────────────────────────────
// RoadmapSpine.jsx answers "what shape is my year" — a horizontal drawing you
// move through, where the value is proportion and adjacency. It cannot answer
// "what actually happens, in order, and what is each one" without becoming a
// wall of labels. This does that: the same year, same order, same connected
// line, but vertical — the axis a phone actually has room on, and the axis text
// wants to run down.
//
// ── The rules that keep the line honest ─────────────────────────────────────
// · The line never breaks. Each row draws its own segment of it, so the
//   connection survives any content height, any wrap, any font size — there is
//   no measured height anywhere in here that could be wrong by a pixel.
// · The line is TRAVELLED behind today and AHEAD in front of it, with a real
//   node where today falls. A student should be able to see, without reading a
//   word, how much of their year is behind them.
// · Undated items are not dropped and are not invented into a position. They
//   get their own group at the end, titled as what they are: things whose date
//   the student has to go and find.
// · No raw date is printed here. Every date goes through <ItemDate>, the same
//   rule as everywhere else in this folder (see roadmapUi.jsx's header).
// ─────────────────────────────────────────────────────────────────────────────

const GUTTER = 38;      // width of the column the line and its nodes live in
const LINE_X = 15;      // where the line sits inside that column

export default function RoadmapTimeline({
  roadmap, today = dayKey(), onSelectItem, isMobile = false, reducedMotion = false,
}) {
  const rows = useMemo(() => buildRows(roadmap, today), [roadmap, today]);

  if (!rows.length) {
    return <div style={{ fontSize: 12, color: C.t4 }}>Nothing on your roadmap carries a date yet.</div>;
  }

  return (
    <div>
      {rows.map((row, i) => (
        <TimelineRow
          key={row.key}
          row={row}
          first={i === 0}
          last={i === rows.length - 1}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          index={i}
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  );
}

/**
 * The ordered rows: a month header before each month's items, a today node in
 * its true chronological place, and the undated group last.
 */
function buildRows(roadmap, today) {
  const items = allItems(roadmap).filter((i) => i.status !== 'skipped');
  const dated = [];
  const undated = [];
  items.forEach((i) => {
    const due = effectiveDue(i);
    if (due) dated.push({ item: i, due });
    else undated.push({ item: i });
  });
  dated.sort((a, b) => String(a.due).localeCompare(String(b.due)) || a.item.title.localeCompare(b.item.title));

  const rows = [];
  let currentMonth = null;
  let todayPlaced = false;

  const pushToday = () => {
    if (todayPlaced) return;
    todayPlaced = true;
    rows.push({ kind: 'today', key: 'today', date: today, past: true });
  };

  dated.forEach(({ item, due }) => {
    if (due > today) pushToday();
    const month = due.slice(0, 7);
    if (month !== currentMonth) {
      currentMonth = month;
      rows.push({
        kind: 'month', key: `m-${month}`, month, date: `${month}-01`,
        past: month < today.slice(0, 7),
        count: dated.filter((d) => d.due.slice(0, 7) === month).length,
      });
    }
    rows.push({ kind: 'item', key: item.id, item, date: due, past: due < today });
  });

  // A year entirely in the past still gets its today node, at the end.
  pushToday();

  if (undated.length) {
    rows.push({ kind: 'undatedHeader', key: 'undated-h', count: undated.length, past: false });
    undated.forEach(({ item }) => rows.push({ kind: 'item', key: item.id, item, date: null, past: false, undated: true }));
  }
  return rows;
}

// ── One row, drawing its own piece of the line ───────────────────────────────

function TimelineRow({ row, first, last, isMobile, reducedMotion, index, onSelectItem }) {
  const nodeTop = row.kind === 'item' ? 17 : 13;
  const lineColor = row.past ? tint(C.green, 0.42) : tint(C.violet, 0.34);

  return (
    <motion.div
      // Mount-based rather than whileInView on purpose: an intersection-driven
      // reveal that never fires — a container that starts hidden, an observer
      // that never resolves — leaves rows sitting at opacity 0, and an invisible
      // roadmap is a far worse failure than an unanimated one.
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.32, delay: Math.min(index * 0.015, 0.25), ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 10 : 13 }}
    >
      {/* The gutter: the line, and this row's node on it. */}
      <div style={{ position: 'relative', width: GUTTER, flexShrink: 0 }}>
        <span aria-hidden="true" style={{
          position: 'absolute', left: LINE_X, width: 2, borderRadius: 1,
          top: first ? nodeTop : 0,
          bottom: last ? `calc(100% - ${nodeTop + 2}px)` : 0,
          background: lineColor,
        }} />
        <RowNode row={row} top={nodeTop} reducedMotion={reducedMotion} />
      </div>

      {/* The content. */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: row.kind === 'item' ? 10 : 8 }}>
        {row.kind === 'month' && <MonthHeader row={row} />}
        {row.kind === 'today' && <TodayHeader />}
        {row.kind === 'undatedHeader' && <UndatedHeader count={row.count} />}
        {row.kind === 'item' && (
          <EventCard item={row.item} isMobile={isMobile} onSelect={onSelectItem} />
        )}
      </div>
    </motion.div>
  );
}

function RowNode({ row, top, reducedMotion }) {
  if (row.kind === 'today') {
    return (
      <span style={{ position: 'absolute', left: LINE_X - 6, top: top - 5, display: 'flex' }}>
        <motion.span
          animate={reducedMotion ? undefined : { boxShadow: [`0 0 0 0 ${tint(C.green, 0.5)}`, `0 0 0 7px ${tint(C.green, 0)}`] }}
          transition={reducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: 14, height: 14, borderRadius: '50%', background: C.green, border: `2px solid ${C.bg}` }}
        />
      </span>
    );
  }
  if (row.kind === 'month') {
    return (
      <span style={{
        position: 'absolute', left: LINE_X - 5, top: top - 4, width: 12, height: 12, borderRadius: 3,
        background: C.bg, border: `2px solid ${row.past ? tint(C.green, 0.6) : tint(C.violet, 0.7)}`,
        transform: 'rotate(45deg)',
      }} />
    );
  }
  if (row.kind === 'undatedHeader') {
    return (
      <span style={{
        position: 'absolute', left: LINE_X - 5, top: top - 4, width: 12, height: 12, borderRadius: '50%',
        background: C.bg, border: `2px dashed ${tint(C.violet, 0.7)}`,
      }} />
    );
  }
  const item = row.item;
  const done = item.status === 'done';
  const color = done ? C.green : trackColor(item.track);
  const exact = !row.undated && !awaitingDate(item);
  return (
    <span style={{
      position: 'absolute', left: LINE_X - 4, top: top - 3, width: 10, height: 10, borderRadius: '50%',
      background: exact ? color : C.bg,
      border: exact ? `2px solid ${C.bg}` : `1.8px dashed ${color}`,
      boxShadow: exact ? `0 0 0 2px ${tint(color, 0.25)}` : 'none',
      opacity: done ? 0.7 : 1,
    }} />
  );
}

function MonthHeader({ row }) {
  return (
    <div style={{ ...R({ gap: 10, marginBottom: 4 }) }}>
      <span style={{
        fontSize: 12.5, fontWeight: 800, color: row.past ? C.t3 : C.t1,
        fontFamily: C.FM, letterSpacing: '-.01em',
      }}>{fmtMonth(row.month)}</span>
      <span style={{ flex: 1, height: 1, background: C.b1 }} />
      <span style={{ fontSize: 10.5, color: C.t4 }}>{row.count} item{row.count === 1 ? '' : 's'}</span>
    </div>
  );
}

function TodayHeader() {
  return (
    <div style={{ ...R({ gap: 8, marginBottom: 4 }) }}>
      <span style={{
        fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: '.14em', textTransform: 'uppercase',
        padding: '3px 10px', borderRadius: 20, background: tint(C.green, 0.13), border: `1px solid ${tint(C.green, 0.3)}`,
      }}>You are here</span>
      <span style={{ fontSize: 11, color: C.t4 }}>everything below this line is still ahead of you</span>
    </div>
  );
}

function UndatedHeader({ count }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ ...R({ gap: 8 }) }}>
        <CalendarSearch size={13} color={C.violet} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.t1 }}>
          {count} date{count === 1 ? '' : 's'} you still have to find
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.6, marginTop: 4, maxWidth: 520 }}>
        These run on a local schedule we cannot know — your school, your chapter, your hospital. Open
        one, pin the real date, and it takes its place on the line above.
      </div>
    </div>
  );
}

// ── The event card ───────────────────────────────────────────────────────────

function EventCard({ item, isMobile, onSelect }) {
  const urgency = itemUrgency(item, dayKey());
  const done = item.status === 'done';
  const color = done ? C.green : trackColor(item.track);
  const Icon = TRACK_ICON[item.track] || Target;
  const steps = item.steps || [];
  const stepsDone = (item.doneSteps || []).length;
  const loud = !done && ['missed', 'critical', 'start-now'].includes(urgency);
  const blurb = item.howThisHelps || item.why || null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id)}
      style={{
        ...glass2({ padding: isMobile ? '12px 13px' : '13px 15px' }),
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: C.FB,
        border: `1px solid ${loud ? tint(URGENCY_META[urgency]?.color || color, 0.35) : C.b1}`,
        background: loud
          ? `linear-gradient(135deg,${tint(URGENCY_META[urgency]?.color || color, 0.08)},transparent 70%)`
          : C.surf2,
        opacity: done ? 0.72 : 1,
        transition: 'border-color .15s, transform .15s',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
          background: tint(color, 0.13), border: `1px solid ${tint(color, 0.22)}`,
        }}>
          {done ? <CheckCircle2 size={14} color={C.green} /> : <Icon size={13} color={color} />}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 13 : 13.5, fontWeight: 700, color: C.t1, lineHeight: 1.4,
            textDecoration: done ? 'line-through' : 'none',
          }}>{item.title}</div>
          {item.org && <div style={{ fontSize: 10.5, color: C.t4, marginTop: 2 }}>{item.org}</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginTop: 8 }}>
            {/* The one sanctioned way a date reaches the screen. */}
            <ItemDate item={item} size={11} />
            <TrackChip track={item.track} />
            {!done && <UrgencyChip urgency={urgency} />}
            {item.isStretch && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.fuchsia }}>long shot</span>
            )}
          </div>

          {blurb && (
            <div style={{
              fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginTop: 8,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{blurb}</div>
          )}

          {!!steps.length && (
            <div style={{ ...R({ gap: 8, marginTop: 9 }) }}>
              <span style={{ position: 'relative', flex: '0 0 66px', height: 4, borderRadius: 2, background: C.s4, overflow: 'hidden' }}>
                <span style={{
                  position: 'absolute', inset: 0, width: `${Math.round((stepsDone / steps.length) * 100)}%`,
                  background: stepsDone === steps.length ? C.green : color, borderRadius: 2,
                }} />
              </span>
              <span style={{ fontSize: 10, color: C.t4, fontFamily: C.FM }}>{stepsDone}/{steps.length} steps</span>
            </div>
          )}
        </div>

        <ChevronRight size={15} color={C.t4} style={{ flexShrink: 0, marginTop: 4 }} />
      </div>
    </button>
  );
}
