import React, { useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarSearch, CheckCircle2, Flag, ChevronLeft, ChevronRight,
  Crosshair, Maximize2, Minimize2, MousePointer2, Hand,
} from 'lucide-react';
import { C, tint, R } from '../../lib/theme';
import { displaysExactDate } from '../../data/roadmap/index.js';
import { dayKey } from '../../lib/timeline';
import { effectiveDue, itemUrgency, allItems, monthlyLoad } from '../../lib/roadmap/model';
import { trackColor, fmtMonth, ItemDate, TrackChip, UrgencyChip, URGENCY_META, TRACK_ICON } from './roadmapUi';
import useDragScroll from './useDragScroll';

// ─────────────────────────────────────────────────────────────────────────────
// The spine: the student's whole year as one continuous, connected line you
// move through.
//
// ── Why the year is drawn, and what the drawing is actually for ─────────────
// The list views answer "what do I do next". This answers the two questions a
// list structurally cannot:
//
//   1. WHEN DOES MY YEAR GET HARD? Every item's load is spread across its
//      PREPARATION window rather than stacked on its deadline (see monthlyLoad
//      in model.js), so the tall stretches here are the stretches the work
//      actually lands in. A student can see in one glance that next March is a
//      wall — three months before it becomes one — which is the single most
//      useful thing a year-long plan can say, and which no calendar of due
//      dates has ever managed to.
//   2. WHERE ARE THE GAPS? A quarter with nothing in it is information. It
//      either means the roadmap is thin there, or it means that stretch is
//      deliberately clear — and the season bands underneath say which.
//
// ── The line is the whole idea ──────────────────────────────────────────────
// One rail runs unbroken from the first day to the last. It does not restart at
// a season, it does not break at a month boundary, and it does not stop at the
// edge of the viewport — it continues, and you move along it. The part of it
// the student has already lived is drawn as travelled; the part ahead is drawn
// as ahead; every marker hangs off it by a stem, so nothing on this screen is
// ever floating free of the year it belongs to. That connectedness is the
// argument the drawing is making: these are not fourteen separate things, they
// are one year with fourteen things in it.
//
// ── Moving through it, on both kinds of device ──────────────────────────────
// A year does not fit on a screen, so the rail is longer than the frame and
// moving along it IS the interaction — not a fallback for narrow windows.
//   · Phone/tablet: native scrolling, untouched. Platform momentum and
//     rubber-banding are better than anything re-implemented on top of them,
//     and the markers carry 34px touch targets so a thumb can hit them.
//   · Desktop: press and drag anywhere, with a decaying glide on release, the
//     way a map behaves (useDragScroll.js). Trackpads and shift+wheel scroll it
//     natively, arrow keys step it a month at a time, and the scrubber beneath
//     is a draggable minimap of the whole year.
// Both land on the same scrollLeft, so every route through the timeline agrees
// with every other one.
//
// ── Rendering rules ─────────────────────────────────────────────────────────
// Markers are positioned by date but THE DATE ITSELF IS NEVER PRINTED HERE.
// Unconfirmed items get a hollow marker with a dotted stem so an approximate
// position never reads as a precise one — the visual equivalent of the caveat
// dateCaption() writes in prose. Selecting a marker fills the detail card
// below, which shows date text the only sanctioned way, through <ItemDate>.
//
// The drawing is an SVG (rail, stems, bands, load) with the interactive markers
// as real HTML buttons layered over it — SVG for the geometry, buttons for the
// focus rings, tab order and screen-reader labels that geometry cannot provide.
// Deliberately not a charting library: this is the app's own palette and the
// app's own vocabulary, not an embedded widget with its own visual opinions.
// ─────────────────────────────────────────────────────────────────────────────

const PAD_X = 22;

// Two densities. "Fit" is the strategic read — the whole year in as few screens
// as possible. "Detail" spreads it out so a cluster of four deadlines in one
// fortnight stops being one blob. Both are the same drawing at different
// scales; nothing appears or disappears between them.
const MONTH_W = {
  fit: { mobile: 78, desktop: 118 },
  detail: { mobile: 152, desktop: 214 },
};

// Vertical rhythm. Everything below the season header is measured from the rail,
// and the rail's own y is derived from how many marker lanes this student's year
// actually needs — see `lanesUsed` in the geometry memo.
//   seasonHeader — room above the topmost lane for the season name and theme
//   laneGap      — rail to the nearest lane of markers
//   laneStep     — lane to lane
//   railToLoad   — rail to the top of the load band (month labels live in here)
const GEO = {
  mobile: { seasonHeader: 46, laneStep: 24, lanes: 4, laneGap: 26, railToLoad: 32, loadH: 30, dot: 10 },
  desktop: { seasonHeader: 50, laneStep: 27, lanes: 4, laneGap: 30, railToLoad: 34, loadH: 36, dot: 11 },
};

const DAYS_IN_MONTH = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const monthAfter = (key) => {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export default function RoadmapSpine({
  roadmap, today = dayKey(), onSelectItem, onSelectSeason, isMobile = false, reducedMotion = false,
}) {
  const [density, setDensity] = useState('fit');
  const [activeId, setActiveId] = useState(null);   // hovered / focused / tapped marker
  const [pinnedId, setPinnedId] = useState(null);   // tapped marker — survives the pointer leaving
  const [view, setView] = useState({ left: 0, width: 0, scrollWidth: 1 });

  const scrollRef = useRef(null);
  const { dragging, scrollToX } = useDragScroll(scrollRef, { enabled: true, momentum: !reducedMotion });

  const geo = isMobile ? GEO.mobile : GEO.desktop;
  const monthW = MONTH_W[density][isMobile ? 'mobile' : 'desktop'];

  const items = allItems(roadmap);
  const seasons = roadmap?.seasons || [];

  // ── Geometry ───────────────────────────────────────────────────────────────
  const geoData = useMemo(() => {
    const start = roadmap?.startDate;
    const end = roadmap?.endDate;
    if (!start || !end) return null;

    const monthKeys = [];
    let cursor = start.slice(0, 7);
    const endKey = end.slice(0, 7);
    for (let i = 0; i < 15 && cursor <= endKey; i += 1) { monthKeys.push(cursor); cursor = monthAfter(cursor); }
    if (!monthKeys.length) return null;

    const width = PAD_X * 2 + monthKeys.length * monthW;

    // x for a date, by real month length rather than a flat /31 — a marker on
    // the 28th of February belongs at the end of February, not four fifths of
    // the way through it.
    const xForDate = (d) => {
      if (!d) return null;
      const idx = monthKeys.indexOf(String(d).slice(0, 7));
      if (idx === -1) return null;
      const day = Number(String(d).slice(8, 10)) || 1;
      return PAD_X + (idx + (day - 1) / DAYS_IN_MONTH(monthKeys[idx])) * monthW;
    };
    // Dates outside the drawn year still need somewhere to sit on the rail:
    // clamped to the nearest end, which is honest because the rail's ends ARE
    // the year's ends.
    const clampedX = (d) => {
      const x = xForDate(d);
      if (x != null) return x;
      if (!d) return null;
      return String(d) < start ? PAD_X : width - PAD_X;
    };

    const loadByMonth = Object.fromEntries(monthlyLoad(roadmap).map((l) => [l.month, l.load]));
    const load = monthKeys.map((k) => ({ month: k, load: loadByMonth[k] || 0 }));
    const maxLoad = Math.max(1, ...load.map((l) => l.load));

    // ── Markers, and the lanes that keep a cluster countable ─────────────────
    // Four deadlines in one fortnight is a real and common shape, and stacking
    // them on one horizontal line makes it look like one deadline. Lane 0 hugs
    // the rail; each collision walks the next marker one lane further up, so a
    // quiet month stays visually quiet and a crowded one visibly stacks.
    const minGap = isMobile ? 22 : 26;
    const laneLastX = [];
    const placed = items
      .filter((i) => i.status !== 'skipped')
      .map((i) => ({ item: i, due: effectiveDue(i) }))
      .filter((m) => m.due)
      .sort((a, b) => String(a.due).localeCompare(String(b.due)))
      .map(({ item, due }) => {
        const x = clampedX(due);
        if (x == null) return null;
        let lane = laneLastX.findIndex((last) => x - last >= minGap);
        if (lane === -1) {
          if (laneLastX.length < geo.lanes) { lane = laneLastX.length; laneLastX.push(-Infinity); }
          // Genuinely more overlapping items than lanes: reuse the lane with the
          // most room rather than hiding anything.
          else lane = laneLastX.indexOf(Math.min(...laneLastX));
        }
        laneLastX[lane] = x;
        return {
          id: item.id,
          item,
          title: item.title,
          x,
          lane,
          color: trackColor(item.track),
          exact: displaysExactDate(item),
          done: item.status === 'done',
          urgency: itemUrgency(item, today),
        };
      })
      .filter(Boolean);

    // ── The drawing is only as tall as it needs to be ────────────────────────
    // Lane count is a property of THIS student's year, not a constant: a quiet
    // roadmap uses one lane and a crowded one uses four. Sizing the canvas to
    // the lanes actually used is the difference between a tight diagram and one
    // with a hundred pixels of empty sky over it — and the empty sky is what
    // makes a drawing look like a placeholder.
    const lanesUsed = Math.max(1, laneLastX.length);
    const railY = geo.seasonHeader + (lanesUsed - 1) * geo.laneStep + geo.laneGap;
    const height = railY + geo.railToLoad + geo.loadH + 12;
    const markers = placed.map((m) => ({ ...m, y: railY - geo.laneGap - m.lane * geo.laneStep }));

    const seasonBands = seasons.map((s, i) => {
      const x1 = clampedX(s.startDate);
      const x2 = clampedX(s.endDate);
      if (x1 == null || x2 == null) return null;
      return { ...s, x1, x2, w: Math.max(4, x2 - x1), index: i };
    }).filter(Boolean);

    return {
      months: monthKeys, load, maxLoad, markers, seasonBands, width, railY, height,
      todayX: today >= start && today <= end ? clampedX(today) : null,
      xForDate: clampedX,
    };
  }, [roadmap, items, seasons, today, monthW, isMobile, geo]);

  // ── Viewport tracking (drives the scrubber and the edge fades) ─────────────
  const syncView = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setView({ left: el.scrollLeft, width: el.clientWidth, scrollWidth: Math.max(1, el.scrollWidth) });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    syncView();
    el.addEventListener('scroll', syncView, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncView) : null;
    ro?.observe(el);
    return () => { el.removeEventListener('scroll', syncView); ro?.disconnect(); };
  }, [syncView, geoData]);

  // Open on today, not on January. The first thing a student should see is
  // where they are standing, with a little of the road behind them for context.
  const centerOn = useCallback((x, { smooth = true } = {}) => {
    const el = scrollRef.current;
    if (!el || x == null) return;
    scrollToX(x - el.clientWidth * 0.35, { smooth: smooth && !reducedMotion });
  }, [scrollToX, reducedMotion]);

  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (!geoData || didInitialScroll.current) return;
    didInitialScroll.current = true;
    centerOn(geoData.todayX ?? 0, { smooth: false });
  }, [geoData, centerOn]);

  // Density changes keep the same instant of the year under the eye rather than
  // dumping the student back at the start of a differently-sized drawing.
  const onDensityChange = (next) => {
    const el = scrollRef.current;
    const anchor = el && geoData ? (el.scrollLeft + el.clientWidth / 2 - PAD_X) / (geoData.width - PAD_X * 2) : 0;
    setDensity(next);
    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) return;
      const w = node.scrollWidth - PAD_X * 2;
      scrollToX(PAD_X + anchor * w - node.clientWidth / 2, { smooth: false });
    });
  };

  const onKeyDown = (e) => {
    const el = scrollRef.current;
    if (!el || !geoData) return;
    const step = monthW;
    if (e.key === 'ArrowRight') { scrollToX(el.scrollLeft + step, { smooth: !reducedMotion }); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { scrollToX(el.scrollLeft - step, { smooth: !reducedMotion }); e.preventDefault(); }
    else if (e.key === 'Home') { scrollToX(0, { smooth: !reducedMotion }); e.preventDefault(); }
    else if (e.key === 'End') { scrollToX(el.scrollWidth, { smooth: !reducedMotion }); e.preventDefault(); }
    else if (e.key === 'Escape') { setPinnedId(null); setActiveId(null); }
  };

  if (!geoData || !geoData.months.length) return null;

  const { months, load, maxLoad, markers, seasonBands, width, todayX, railY, height: H } = geoData;
  const shown = markers.find((m) => m.id === (pinnedId || activeId)) || null;
  const canLeft = view.left > 2;
  const canRight = view.left < view.scrollWidth - view.width - 2;

  // What is on screen right now, named — so the timeline never loses its "where
  // am I" while it is being dragged. A RANGE rather than the centre month:
  // "Dec 2026" over a frame whose left edge reads August is a label that argues
  // with the drawing underneath it.
  const visibleRange = (() => {
    const monthAt = (px) => Math.max(0, Math.min(months.length - 1, Math.floor((px - PAD_X) / monthW)));
    const from = months[monthAt(view.left + 4)];
    const to = months[monthAt(view.left + Math.max(0, view.width - 4))];
    return from === to ? fmtMonth(from) : `${fmtMonth(from)} – ${fmtMonth(to)}`;
  })();

  return (
    <div>
      {/* ── Frame header: where you are, and the controls ── */}
      <div style={{ ...R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 }) }}>
        <div style={{ ...R({ gap: 8 }), minWidth: 0 }}>
          <span style={{
            fontSize: 12.5, fontWeight: 800, color: C.t1, fontFamily: C.FM, 
            padding: '4px 8px', borderRadius: 8, background: tint(C.sky, 0.1), border: `1px solid ${tint(C.sky, 0.2)}`,
          }}>{visibleRange}</span>
          <span style={{ fontSize: 11, color: C.t4 }}>
            {markers.length} dated item{markers.length === 1 ? '' : 's'}
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ ...R({ gap: 4 }) }}>
          <IconBtn label="Scroll back" onClick={() => scrollToX(view.left - view.width * 0.8, { smooth: !reducedMotion })} disabled={!canLeft}>
            <ChevronLeft size={14} />
          </IconBtn>
          {todayX != null && (
            <button type="button" onClick={() => centerOn(todayX)} style={chipBtn(C.green)}>
              <Crosshair size={12} /> Today
            </button>
          )}
          <button
            type="button"
            onClick={() => onDensityChange(density === 'fit' ? 'detail' : 'fit')}
            style={chipBtn(C.violet)}
            title={density === 'fit' ? 'Spread the year out — easier to separate a cluster of deadlines' : 'Compress the year — fewer screens end to end'}
          >
            {density === 'fit' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            {density === 'fit' ? 'Spread out' : 'Fit year'}
          </button>
          <IconBtn label="Scroll forward" onClick={() => scrollToX(view.left + view.width * 0.8, { smooth: !reducedMotion })} disabled={!canRight}>
            <ChevronRight size={14} />
          </IconBtn>
        </div>
      </div>

      {/* ── The rail itself ── */}
      <div style={{ position: 'relative' }}>
        {/* Edge fades. They say "this continues" without a scrollbar having to
            say it, and they disappear at the ends so the year has visible
            beginning and end rather than fading forever in both directions. */}
        <EdgeFade side="left" show={canLeft} />
        <EdgeFade side="right" show={canRight} />

        <div
          ref={scrollRef}
          className="roadmap-rail"
          data-roadmap-rail=""
          tabIndex={0}
          role="group"
          aria-label={`Your year on a timeline: ${markers.length} dated items across ${months.length} months. Use the left and right arrow keys to move through it.`}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setActiveId(null)}
          style={{
            position: 'relative',
            overflowX: 'auto',
            overflowY: 'hidden',
            // Native panning on touch; the hook owns mouse dragging.
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: dragging ? 'none' : 'auto',
            borderRadius: 12,
            outlineOffset: 3,
          }}
        >
          <div style={{ position: 'relative', width, height: H }}>
            <svg width={width} height={H} style={{ display: 'block', pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <linearGradient id="rm-rail-ahead" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={tint(C.violet, 0.45)} />
                  <stop offset="100%" stopColor={tint(C.sky, 0.35)} />
                </linearGradient>
                <linearGradient id="rm-rail-travelled" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={tint(C.green, 0.35)} />
                  <stop offset="100%" stopColor={C.green} />
                </linearGradient>
                <linearGradient id="rm-load" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tint(C.sky, 0.42)} />
                  <stop offset="100%" stopColor={tint(C.sky, 0.06)} />
                </linearGradient>
                <linearGradient id="rm-load-heavy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tint(C.amber, 0.6)} />
                  <stop offset="100%" stopColor={tint(C.amber, 0.08)} />
                </linearGradient>
              </defs>

              {/* Season bands, behind everything: what makes the drawing a
                  strategy rather than a scatter plot. */}
              {seasonBands.map((s) => (
                <g key={s.id}>
                  <rect
                    x={s.x1} y={6} width={s.w} height={H - 12} rx={10}
                    fill={s.index % 2 === 0 ? tint(C.violet, 0.045) : 'transparent'}
                  />
                  <line x1={s.x1} y1={6} x2={s.x1} y2={H - 6} stroke={C.b1} strokeWidth={1} strokeDasharray="2 5" />
                </g>
              ))}

              {/* Month separators + labels, under the rail. */}
              {months.map((m, i) => {
                const x = PAD_X + i * monthW;
                return (
                  <g key={m}>
                    <line x1={x} y1={railY - 4} x2={x} y2={railY + 8} stroke={C.b2} strokeWidth={1} />
                    <text
                      x={x + monthW / 2} y={railY + 24} fill={C.t4} fontSize={10} textAnchor="middle"
                      fontFamily={C.FM} letterSpacing=".02em"
                    >
                      {fmtMonth(m)}
                    </text>
                  </g>
                );
              })}

              {/* THE LINE. One rail, unbroken, end to end — travelled behind
                  today, ahead in front of it. */}
              <rect x={PAD_X} y={railY - 2} width={Math.max(0, width - PAD_X * 2)} height={4} rx={2} fill="url(#rm-rail-ahead)" />
              {todayX != null && (
                <rect x={PAD_X} y={railY - 2} width={Math.max(0, todayX - PAD_X)} height={4} rx={2} fill="url(#rm-rail-travelled)" opacity={0.85} />
              )}
              {/* The two ends, so the year visibly starts and stops. */}
              <circle cx={PAD_X} cy={railY} r={5} fill={C.bg} stroke={tint(C.violet, 0.6)} strokeWidth={2} />
              <circle cx={width - PAD_X} cy={railY} r={5} fill={C.bg} stroke={tint(C.sky, 0.6)} strokeWidth={2} />

              {/* Season joints, sitting ON the rail rather than beside it — the
                  line passes through the seasons, it is not divided by them. */}
              {seasonBands.map((s) => (
                <g key={`joint-${s.id}`}>
                  <circle cx={s.x1} cy={railY} r={4} fill={C.bg} stroke={tint(C.violet, 0.7)} strokeWidth={1.6} />
                </g>
              ))}

              <line
                x1={PAD_X} y1={railY + geo.railToLoad - 2} x2={width - PAD_X} y2={railY + geo.railToLoad - 2}
                stroke={C.b1} strokeWidth={1}
              />

              {/* Load, hanging below the rail: how heavy each month actually is
                  once preparation is counted, not how many deadlines it holds. */}
              {load.map((l, i) => {
                const h = Math.round((l.load / maxLoad) * geo.loadH);
                const heavy = l.load > maxLoad * 0.7;
                const x = PAD_X + i * monthW + 6;
                const w = Math.max(2, monthW - 12);
                const top = railY + geo.railToLoad;
                if (h <= 0) return null;
                return (
                  <rect
                    key={l.month} x={x} y={top} width={w} height={Math.max(2, h)} rx={4}
                    fill={heavy ? 'url(#rm-load-heavy)' : 'url(#rm-load)'}
                  />
                );
              })}

              {/* Stems: every marker is physically attached to the line. */}
              {markers.map((mk) => (
                <line
                  key={`stem-${mk.id}`}
                  x1={mk.x} y1={mk.y} x2={mk.x} y2={railY}
                  stroke={mk.done ? tint(C.green, 0.5) : tint(mk.color, shown?.id === mk.id ? 0.9 : 0.55)}
                  strokeWidth={shown?.id === mk.id ? 2 : 1.5}
                  strokeDasharray={mk.exact ? undefined : '2 3'}
                />
              ))}

              {/* Today: a guide the whole height of the drawing, so the eye can
                  place any marker relative to now without counting months. */}
              {todayX != null && (
                <g>
                  <line x1={todayX} y1={10} x2={todayX} y2={railY + 30} stroke={tint(C.green, 0.55)} strokeWidth={1.5} strokeDasharray="4 4" />
                  <circle cx={todayX} cy={railY} r={6} fill={C.green} />
                  <circle cx={todayX} cy={railY} r={9} fill="none" stroke={tint(C.green, 0.4)} strokeWidth={1.5} />
                  <text x={todayX} y={railY - 12} fill={C.green} fontSize={9} textAnchor="middle" fontWeight={800} letterSpacing=".1em">
                    TODAY
                  </text>
                </g>
              )}
            </svg>

            {/* Season labels — real buttons over the bands, because a season is
                a place a student wants to go, not a caption. */}
            {seasonBands.map((s) => (
              <button
                key={`label-${s.id}`}
                type="button"
                onClick={() => onSelectSeason?.(s.id)}
                title={s.theme ? `${s.label} — ${s.theme}` : s.label}
                style={{
                  position: 'absolute', left: s.x1 + 8, top: 8, maxWidth: Math.max(40, s.w - 16),
                  background: 'transparent', border: 0, padding: 0, cursor: onSelectSeason ? 'pointer' : 'default',
                  textAlign: 'left', fontFamily: C.FB, overflow: 'hidden',
                }}
              >
                <span style={{
                  display: 'block', fontSize: 9, fontWeight: 800, color: C.t4,
                  letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis', overflow: 'hidden',
                }}>{s.label}</span>
                {s.theme && s.theme !== s.label && (
                  <span style={{
                    display: 'block', fontSize: 11, fontWeight: 700, color: C.t3, marginTop: 4,
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                  }}>{s.theme}</span>
                )}
              </button>
            ))}

            {/* Markers. Real buttons: focusable, labelled, and big enough for a
                thumb even though the dot they draw is small. */}
            {markers.map((mk, i) => {
              const isShown = shown?.id === mk.id;
              const urgency = URGENCY_META[mk.urgency];
              const ringColor = mk.done ? C.green : (mk.urgency === 'missed' || mk.urgency === 'critical' || mk.urgency === 'start-now')
                ? urgency.color : mk.color;
              const Icon = TRACK_ICON[mk.item.track];
              return (
                <motion.button
                  key={mk.id}
                  type="button"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reducedMotion ? { duration: 0 } : { delay: Math.min(i * 0.012, 0.4), type: 'spring', stiffness: 380, damping: 26 }}
                  onMouseEnter={() => setActiveId(mk.id)}
                  onFocus={() => setActiveId(mk.id)}
                  onBlur={() => setActiveId((cur) => (cur === mk.id ? null : cur))}
                  onClick={() => { setPinnedId((cur) => (cur === mk.id ? null : mk.id)); setActiveId(mk.id); }}
                  aria-label={`${mk.title}${mk.done ? ', done' : ''}${mk.exact ? '' : ', approximate date'} — open details`}
                  aria-pressed={pinnedId === mk.id}
                  data-roadmap-marker={mk.id}
                  style={{
                    position: 'absolute', left: mk.x, top: mk.y, transform: 'translate(-50%,-50%)',
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 0, padding: 0, cursor: 'pointer', borderRadius: '50%',
                    zIndex: isShown ? 4 : 2,
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: isShown ? geo.dot + 10 : geo.dot + (mk.done ? -1 : 1),
                    height: isShown ? geo.dot + 10 : geo.dot + (mk.done ? -1 : 1),
                    borderRadius: '50%',
                    // Selected always fills solid: the icon inside is drawn in the
                    // page colour, and on a hollow "approximate" marker that would
                    // otherwise be an invisible icon on its own background.
                    background: isShown ? ringColor : mk.done ? tint(C.green, 0.85) : mk.exact ? ringColor : C.bg,
                    border: `${isShown || mk.exact || mk.done ? 0 : 1.8}px ${mk.exact ? 'solid' : 'dashed'} ${ringColor}`,
                    boxShadow: isShown
                      ? `0 0 0 4px ${tint(ringColor, 0.22)}, 0 4px 14px ${tint(ringColor, 0.4)}`
                      : mk.urgency === 'missed' || mk.urgency === 'critical'
                        ? `0 0 0 3px ${tint(ringColor, 0.16)}` : 'none',
                    transition: reducedMotion ? 'none' : 'width .16s ease, height .16s ease, box-shadow .16s ease',
                    opacity: mk.done ? 0.75 : 1,
                  }}>
                    {isShown && Icon && <Icon size={geo.dot - 1} color={C.bg} strokeWidth={2} />}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── The scrubber: the whole year, always visible, always draggable ──
          The rail shows a few months at a time; this shows all twelve at once
          with the frame drawn on it, so the student always knows which part of
          the year they are looking at and can throw themselves to any other
          part in one gesture — the one control that makes a long document feel
          small. */}
      <Scrubber
        markers={markers} width={width} view={view} todayX={todayX}
        onScrub={(x) => scrollToX(x, { smooth: false })}
        isMobile={isMobile}
      />

      {/* ── The detail card. Fixed height, so hovering across a row of markers
          moves nothing on the page — a card that resizes under the cursor is a
          card you cannot read. ── */}
      <MarkerCard
        marker={shown} pinned={!!pinnedId} isMobile={isMobile}
        onOpen={() => shown && onSelectItem?.(shown.id)}
        onClear={() => { setPinnedId(null); setActiveId(null); }}
        markerCount={markers.length}
      />

      {/* Legend. The dotted/hollow distinction carries the honesty rule and is
          meaningless unless it is explained once, here. */}
      <div style={{ ...R({ gap: 16, flexWrap: 'wrap', marginTop: 12 }) }}>
        <LegendDot filled label="Confirmed date" />
        <LegendDot label="Approximate — exact date varies" />
        <span style={{ ...R({ gap: 4 }) }}>
          <span style={{ width: 14, height: 8, borderRadius: 4, background: tint(C.amber, 0.5) }} />
          <span style={{ fontSize: 10.5, color: C.t4 }}>Heavier stretch</span>
        </span>
        <span style={{ ...R({ gap: 4 }) }}>
          <CheckCircle2 size={11} color={C.green} />
          <span style={{ fontSize: 10.5, color: C.t4 }}>Done</span>
        </span>
        <span style={{ ...R({ gap: 4 }) }}>
          {isMobile ? <Hand size={11} color={C.t4} /> : <MousePointer2 size={11} color={C.t4} />}
          <span style={{ fontSize: 10.5, color: C.t4 }}>
            {isMobile ? 'Swipe the line to move through your year' : 'Drag the line to move through your year'}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── The detail card ──────────────────────────────────────────────────────────

function MarkerCard({ marker, pinned, onOpen, onClear, isMobile, markerCount }) {
  const empty = !marker;
  const color = marker ? (marker.done ? C.green : marker.color) : C.t4;
  return (
    <div style={{
      marginTop: 12, minHeight: isMobile ? 104 : 92,
      background: empty ? C.surf2 : `linear-gradient(135deg,${tint(color, 0.09)},transparent 72%)`,
      border: `1px solid ${empty ? C.b1 : tint(color, 0.28)}`,
      borderRadius: 12, padding: isMobile ? '13px 14px' : '14px 16px',
      transition: 'border-color .18s, background .18s',
    }}>
      {empty ? (
        <div style={{ fontSize: 12, color: C.t4, lineHeight: 1.55 }}>
          {markerCount
            ? <>Tap or hover any marker on the line to see what it is, when it runs and how urgent it is right now. Nothing here moves your roadmap — it is a reading surface.</>
            : <>Nothing on your roadmap carries a date yet. Items waiting on a date you have to look up appear in <b style={{ color: C.t3 }}>Everything</b>.</>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 800, color: C.t1, lineHeight: 1.35 }}>
              {marker.title}
            </div>
            {marker.item.org && <div style={{ fontSize: 11, color: C.t4, marginTop: 4 }}>{marker.item.org}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <TrackChip track={marker.item.track} />
              <UrgencyChip urgency={marker.urgency} />
              {/* The ONLY sanctioned way a date reaches this screen. */}
              <ItemDate item={marker.item} size={11.5} />
            </div>
          </div>
          <div style={{ ...R({ gap: 8 }) }}>
            <button type="button" onClick={onOpen} style={chipBtn(color)}>Open this</button>
            {pinned && <button type="button" onClick={onClear} style={chipBtn(C.t3)}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── The scrubber ─────────────────────────────────────────────────────────────

function Scrubber({ markers, width, view, todayX, onScrub, isMobile }) {
  const ref = useRef(null);
  const [grabbing, setGrabbing] = useState(false);
  const H = isMobile ? 30 : 34;

  const toScroll = useCallback((clientX) => {
    const el = ref.current;
    if (!el || !width) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    // The grabbed point becomes the CENTRE of the frame, which is what "throw me
    // to March" means when someone stabs at March.
    onScrub(ratio * width - view.width / 2);
  }, [onScrub, width, view.width]);

  const onPointerDown = (e) => {
    setGrabbing(true);
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
    toScroll(e.clientX);
    e.preventDefault();
  };
  const onPointerMove = (e) => { if (grabbing) { toScroll(e.clientX); e.preventDefault(); } };
  const end = (e) => {
    setGrabbing(false);
    try { ref.current?.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
  };

  const frameLeft = `${Math.max(0, Math.min(1, view.left / width)) * 100}%`;
  const frameWidth = `${Math.max(4, Math.min(100, (view.width / width) * 100))}%`;
  const covered = view.width >= width - 2; // the whole year already fits

  return (
    <div
      ref={ref}
      onPointerDown={covered ? undefined : onPointerDown}
      onPointerMove={covered ? undefined : onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      role="presentation"
      data-roadmap-scrubber=""
      style={{
        position: 'relative', height: H, marginTop: 8, borderRadius: 8,
        background: C.surf2, border: `1px solid ${C.b1}`, overflow: 'hidden',
        cursor: covered ? 'default' : grabbing ? 'grabbing' : 'pointer',
        touchAction: 'none', opacity: covered ? 0.45 : 1,
      }}
    >
      {/* Every dated item, compressed into the full year — the density map. */}
      {markers.map((mk) => (
        <span key={`s-${mk.id}`} style={{
          position: 'absolute', left: `${(mk.x / width) * 100}%`, top: H / 2 - 5,
          width: 2, height: 10, borderRadius: 4, transform: 'translateX(-1px)',
          background: mk.done ? tint(C.green, 0.7) : tint(mk.color, 0.85),
        }} />
      ))}
      {todayX != null && (
        <span style={{
          position: 'absolute', left: `${(todayX / width) * 100}%`, top: 4, bottom: 4,
          width: 2, background: C.green, transform: 'translateX(-1px)', borderRadius: 4,
        }} />
      )}
      {/* The frame: where the rail above is currently looking. */}
      <span style={{
        position: 'absolute', top: 2, bottom: 2, left: frameLeft, width: frameWidth,
        borderRadius: 8, border: `1.5px solid ${tint(C.violet, 0.75)}`,
        background: tint(C.violet, 0.13), pointerEvents: 'none',
        transition: grabbing ? 'none' : 'left .06s linear, width .12s ease',
      }} />
    </div>
  );
}

// ── Small shared pieces ──────────────────────────────────────────────────────

function EdgeFade({ side, show }) {
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 44, zIndex: 3, pointerEvents: 'none',
      background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${C.s0}, transparent)`,
      opacity: show ? 0.9 : 0, transition: 'opacity .2s ease', borderRadius: side === 'left' ? '14px 0 0 14px' : '0 14px 14px 0',
    }} />
  );
}

function IconBtn({ children, label, onClick, disabled }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.b1}`,
        background: C.surfHi, color: C.t2, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1, transition: 'opacity .15s',
      }}
    >{children}</button>
  );
}

const chipBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: tint(color, 0.14), border: `1px solid ${tint(color, 0.32)}`,
  color, borderRadius: 8, padding: '4px 12px', fontSize: 11.5, fontWeight: 700,
  fontFamily: C.FB, cursor: 'pointer', whiteSpace: 'nowrap',
});

function LegendDot({ filled = false, label }) {
  return (
    <span style={{ ...R({ gap: 4 }) }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%',
        background: filled ? C.violet : 'transparent',
        border: filled ? 'none' : `1.5px dashed ${C.violet}`,
      }} />
      <span style={{ fontSize: 10.5, color: C.t4 }}>{label}</span>
    </span>
  );
}

/** The urgency colour key, re-exported so callers can tint a spine row to match a list. */
export { URGENCY_META, CalendarSearch, Flag };
