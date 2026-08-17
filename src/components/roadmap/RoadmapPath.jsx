import React, { useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Flag, MapPin, Crosshair, CalendarSearch, ChevronDown, ChevronUp, Hand,
} from 'lucide-react';
import { C, tint } from '../../lib/theme';
import { displaysExactDate } from '../../data/roadmap/index.js';
import { dayKey } from '../../lib/timeline';
import { effectiveDue, itemUrgency, allItems } from '../../lib/roadmap/model';
import { trackColor, ItemDate, URGENCY_META, TRACK_ICON, fmtMonth } from './roadmapUi';
import useDragScroll from './useDragScroll';

// ─────────────────────────────────────────────────────────────────────────────
// THE PATH — the student's year as a road they walk up, not a chart they read.
//
// ── Why a winding path and not another timeline ─────────────────────────────
// The spine (RoadmapSpine.jsx) draws the year to scale, so its job is
// proportion: where the year gets heavy, where the gaps are, how far through it
// you are. That is an analytical drawing and it answers analytical questions.
//
// It does not answer the question a seventeen-year-old actually opens this tab
// with, which is not "what shape is my year" but "where am I, and what is
// next". Those want a completely different drawing: not a measured axis but a
// ROUTE — a single line with a beginning behind you and an end above you, the
// next thing always one step along it, and your own position marked on it.
//
// So the path starts at the BOTTOM and climbs. That is the whole idea and it is
// not decoration:
//   · Down is where you have been, up is where you are going. Every game, every
//     mountain, every progress bar ever drawn vertically agrees, and a student
//     reads it without being told.
//   · It gives the year a TOP. A horizontal timeline runs off the edge of the
//     screen in both directions and implies nothing; a path that ends has an
//     end you can get to.
//   · It turns scrolling into travelling. You move up the path the same way you
//     move through the year, and the two gestures mean the same thing.
//
// ── The serpentine, and why it is not a straight line ───────────────────────
// A single vertical column would fit the same items in the same order, so the
// weaving has to earn itself. It does, twice over:
//   · It uses the width. Sixteen items in one column is a 4,000px scroll; the
//     same sixteen woven four-to-a-row is a quarter of that, which is the
//     difference between a route you can see and a route you scroll past.
//   · It makes adjacency visible. Items that sit near each other on the path
//     are near each other in time, and a turn is a natural place to put a
//     season break — so the shape of the year is legible in the shape of the
//     road, without a single axis label.
//
// ── The pulse ───────────────────────────────────────────────────────────────
// Three things move on this screen, and each one is a fact rather than an
// effect. This matters: an animation that means nothing is noise, and this
// screen has enough going on that noise would cost it.
//   1. A light travels the TRAVELLED part of the path, from the start towards
//      today, and stops there. It is the visible statement that the road behind
//      you is done and the road ahead is not.
//   2. The "you are here" marker breathes. It is the only node that does, so it
//      is the only node the eye returns to.
//   3. The path pulses under your finger as you move. The segment nearest the
//      middle of the viewport brightens and its nodes lift — so dragging feels
//      like running a hand along the route rather than scrolling a list.
// All three are suppressed under prefers-reduced-motion, where the path renders
// exactly as it does at rest and loses nothing but the movement.
//
// ── Moving through it ───────────────────────────────────────────────────────
//   · Phone: native vertical scrolling, untouched.
//   · Desktop: press and drag anywhere, with a glide on release (useDragScroll,
//     axis 'y'). The wheel works. So do the arrow keys, a node at a time.
//   · "Jump to today" is always one tap away, because the single most common
//     reason to open this screen is to find where you are standing.
//
// ── Rendering rules, unchanged from every other roadmap surface ─────────────
// No raw date is printed here. Everything goes through <ItemDate>, which is the
// chokepoint documented in roadmapUi.jsx and enforced by scripts/
// verifyRoadmap.mjs. Items whose date is not confirmed get a hollow node and a
// dashed segment of path, so an approximate position never reads as a precise
// one — the visual form of the same caveat the words carry.
// ─────────────────────────────────────────────────────────────────────────────

// ── How many nodes fit across a row ────────────────────────────────────────
// Chosen from the MEASURED width, not from `isMobile`. A phone and a desktop
// are not the two cases: the roadmap also renders in a split window, in a
// narrow docked panel, and inside a page whose own gutters change with the
// theme. Any of those can leave a "desktop" four columns closer together than
// the labels are wide, and labels that overlap are not a smaller version of the
// design, they are an unreadable one.
//
// The thresholds are derived rather than guessed: a column needs
// LABEL_W + 14px of gutter, and the two outer columns each need half a label
// inside the edge padding. Four columns therefore need 2·96 + 3·178 ≈ 718px,
// three need ≈ 540, and below that it is two.
const columnsFor = (width, isMobile) => {
  if (!width) return isMobile ? 2 : 4;
  if (width >= 700) return 4;
  if (width >= 530) return 3;
  return 2;
};
// Row height. Generous on purpose — a path whose rows touch reads as a grid,
// and the whole argument here is that it is a road.
const ROW_H = { mobile: 150, desktop: 168 };
// Horizontal inset of the outermost nodes. Three things have to fit in it and
// it is sized by the widest of them: half a node label (a label is centred on
// its node, so the outermost one hangs into this margin), the U-turn's bulge,
// and a few pixels of air. Undersize it and the first and last node of every
// row lose the left and right of their titles to the frame.
const PAD_X = { mobile: 74, desktop: 96 };
const TURN_BULGE = { mobile: 34, desktop: 48 };
const NODE_R = { mobile: 17, desktop: 20 };
// The widest a node's label may be. Also clamped against the real slot width at
// layout time, so on a narrow container the labels shrink rather than overlap.
const LABEL_W = { mobile: 130, desktop: 164 };
// Breathing room above the first row and below the last, so the start flag and
// the finish flag are not jammed against the edges of the frame.
const PAD_TOP = 46;
const PAD_BOTTOM = 30;
// The SVG path is given this pathLength so every dash calculation below is in
// plain 0–1000 units regardless of the path's real geometry. Without it, the
// travelled fraction would have to be recomputed from the real length every
// time the container resized.
const PATH_UNITS = 1000;

export default function RoadmapPath({
  roadmap, today = dayKey(), onSelectItem, onSelectSeason,
  isMobile = false, reducedMotion = false,
}) {
  const scrollRef = useRef(null);
  const frameRef = useRef(null);
  const [width, setWidth] = useState(0);
  // Where the middle of the viewport falls on the road, kept two ways on
  // purpose: as a fraction for the glow, which wants a continuous value, and as
  // a pixel position for "which stop am I looking at", which wants the truth.
  const [focusT, setFocusT] = useState(1);
  const [focusY, setFocusY] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const { dragging, scrollTo } = useDragScroll(scrollRef, { enabled: true, momentum: !reducedMotion, axis: 'y' });

  const perRow = columnsFor(width, isMobile);
  const rowH = isMobile ? ROW_H.mobile : ROW_H.desktop;
  const bulge = isMobile ? TURN_BULGE.mobile : TURN_BULGE.desktop;
  const nodeR = isMobile ? NODE_R.mobile : NODE_R.desktop;

  // ── Measure ────────────────────────────────────────────────────────────────
  // The path is laid out in real pixels rather than in a viewBox, because the
  // nodes are HTML buttons positioned over the drawing and they have to agree
  // with it exactly. That means the width has to be measured, not assumed.
  //
  // Measured on the SCROLLING element rather than on the frame around it, and
  // the difference is a scrollbar wide: on a platform that reserves space for
  // one, the frame is fifteen pixels wider than the content it holds, and
  // laying the road out at the frame's width while positioning the buttons
  // inside the content puts every node slightly to the left of the road it is
  // supposed to be standing on.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── The stops on the road, in order ────────────────────────────────────────
  const stops = useMemo(() => buildStops(roadmap, today), [roadmap, today]);

  // ── Geometry ───────────────────────────────────────────────────────────────
  const geo = useMemo(
    () => layout(stops, { width, perRow, rowH, bulge, maxLabel: isMobile ? LABEL_W.mobile : LABEL_W.desktop }),
    [stops, width, perRow, rowH, bulge, isMobile],
  );

  // Where today sits along the path, 0 at the start and 1 at the end. This is
  // the number the travelled stroke and the pulse are both drawn from, so it is
  // computed once from the one place it is actually known: the index of the
  // "you are here" stop in the ordered list.
  const travelled = useMemo(() => {
    if (!stops.length) return 0;
    const idx = stops.findIndex((s) => s.kind === 'today');
    if (idx <= 0) return 0;
    return Math.min(1, idx / Math.max(1, stops.length - 1));
  }, [stops]);

  // ── Land on today ──────────────────────────────────────────────────────────
  // Not the top, not the bottom. A student opening this screen is asking where
  // they are, and answering that question before they ask it is most of what
  // makes a long surface feel navigable rather than daunting.
  const jumpToToday = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el || !geo) return;
    const stop = geo.placed.find((p) => p.kind === 'today') || geo.placed[0];
    if (!stop) return;
    scrollTo(stop.y - el.clientHeight / 2, { smooth });
  }, [geo, scrollTo]);

  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !geo || !geo.placed.length || !width) return;
    landed.current = true;
    // Without smoothing on the first landing: a screen that animates itself into
    // position before the student has touched it reads as the page moving on its
    // own, which is exactly the feeling a "you are here" is meant to prevent.
    jumpToToday(false);
  }, [geo, width, jumpToToday]);

  // ── The pulse that follows you ─────────────────────────────────────────────
  // Where the middle of the viewport falls on the path, as a fraction. Read on
  // scroll and used for two things: brightening the nearby stretch of road, and
  // naming the month you are looking at in the header.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !geo) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const centre = el.scrollTop + el.clientHeight / 2;
      // The path is drawn bottom-up, so a smaller y is further ALONG it.
      const t = 1 - (centre - PAD_TOP) / Math.max(1, geo.height - PAD_TOP - PAD_BOTTOM);
      setFocusT(Math.max(0, Math.min(1, t)));
      setFocusY(centre);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [geo]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  // Arrow keys walk the path a stop at a time. A route you can only reach with
  // a pointer is a route half the reasons for building it do not serve.
  const step = useCallback((delta) => {
    if (!geo || !geo.placed.length) return;
    const el = scrollRef.current;
    if (!el) return;
    const centre = el.scrollTop + el.clientHeight / 2;
    let nearest = 0;
    let best = Infinity;
    geo.placed.forEach((p, i) => {
      const d = Math.abs(p.y - centre);
      if (d < best) { best = d; nearest = i; }
    });
    const next = geo.placed[Math.max(0, Math.min(geo.placed.length - 1, nearest + delta))];
    if (next) scrollTo(next.y - el.clientHeight / 2);
  }, [geo, scrollTo]);

  const onKeyDown = useCallback((e) => {
    // Up the path means later in the year, which is a smaller y — so ArrowUp
    // steps FORWARD. Reversing this to match scroll direction would mean the
    // arrow that moves you up the road moves you back in time.
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); step(1); }
    else if (e.key === 'Home') { e.preventDefault(); scrollTo(1e9); }        // the start is at the bottom
    else if (e.key === 'End') { e.preventDefault(); scrollTo(0); }
  }, [step, scrollTo]);

  if (!stops.length) {
    return (
      <div style={{ fontSize: 12, color: C.t4, padding: '18px 0' }}>
        Nothing on your roadmap has a place in the year yet.
      </div>
    );
  }

  // What the student is looking at right now, named. The header is the one part
  // of this screen that can use words, so it uses them for the one thing the
  // drawing genuinely cannot say out loud.
  const focused = geo ? nearestStop(geo.placed, focusY) : null;

  return (
    <div>
      <PathHeader
        focused={focused}
        travelled={travelled}
        isMobile={isMobile}
        onJumpToday={() => jumpToToday(true)}
        stops={stops}
      />

      <div
        ref={frameRef}
        style={{
          position: 'relative',
          borderRadius: 14,
          border: `1px solid ${C.b1}`,
          background: `linear-gradient(180deg, ${tint(C.violet, 0.05)}, transparent 40%)`,
          overflow: 'hidden',
        }}
      >
        <div
          ref={scrollRef}
          tabIndex={0}
          role="group"
          aria-label="Your roadmap as a path — arrow keys move along it"
          onKeyDown={onKeyDown}
          style={{
            position: 'relative',
            height: isMobile ? 460 : 560,
            overflowY: 'auto',
            overflowX: 'hidden',
            // Only the axis the drag uses, so a sideways swipe on a phone still
            // belongs to whatever is behind this.
            touchAction: 'pan-y',
            cursor: dragging ? 'grabbing' : 'grab',
            // The scrollbar is left visible: it is the only honest indication of
            // how much road there is, and hiding it to look tidy makes a long
            // path feel bottomless.
            scrollbarWidth: 'thin',
          }}
        >
          {geo && (
            <div style={{ position: 'relative', height: geo.height, width: '100%' }}>
              <PathDrawing
                geo={geo}
                travelled={travelled}
                focus={focusT}
                reducedMotion={reducedMotion}
                nodeR={nodeR}
              />
              {geo.placed.map((p) => (
                <Stop
                  key={p.key}
                  p={p}
                  today={today}
                  nodeR={nodeR}
                  labelW={geo.labelW}
                  isMobile={isMobile}
                  active={activeId === p.key}
                  reducedMotion={reducedMotion}
                  // A node's own brightness follows how close it is to the
                  // middle of the viewport — the pulse, applied per node.
                  proximity={1 - Math.min(1, Math.abs(p.y - focusY) / (rowH * 1.35))}
                  onHover={() => setActiveId(p.key)}
                  onLeave={() => setActiveId((cur) => (cur === p.key ? null : cur))}
                  onSelect={() => {
                    if (p.kind === 'item') onSelectItem?.(p.item.id);
                    else if (p.kind === 'season') onSelectSeason?.(p.season.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <PathLegend isMobile={isMobile} dragging={dragging} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The stops, in the order they are walked
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Everything on the path, earliest first.
 *
 * The ordering rules are the same ones RoadmapTimeline.jsx uses, because two
 * views of one year that disagree about what comes next are worse than either
 * one alone:
 *   · dated items in date order, using the student's pinned date when they have
 *     entered one;
 *   · a real "you are here" stop in its true chronological place, so the
 *     travelled part of the road is measured rather than estimated;
 *   · a season marker wherever the season changes, which is what turns the path
 *     into chapters;
 *   · undated items last, in their own stretch, labelled as what they are —
 *     things whose date the student has to go and find. They are not dropped and
 *     they are not invented into a position.
 */
function buildStops(roadmap, today) {
  const items = allItems(roadmap).filter((i) => i.status !== 'skipped');
  if (!items.length) return [];

  const dated = [];
  const undated = [];
  items.forEach((i) => {
    const due = effectiveDue(i);
    if (due) dated.push({ item: i, due });
    else undated.push({ item: i });
  });
  dated.sort((a, b) => String(a.due).localeCompare(String(b.due)) || String(a.item.title).localeCompare(String(b.item.title)));

  const stops = [];
  const seasonsSeen = new Set();
  let todayPlaced = false;

  // ── Which season a stop belongs to, ON THIS PATH ───────────────────────────
  // Deliberately taken from the DATE, not from `item.season`. Those two are
  // different on purpose everywhere else in the roadmap: an item is placed in
  // the season where the WORK happens, so a scholarship due in October with
  // eight weeks of essays behind it is a summer item. That is exactly right for
  // the Seasons view and exactly wrong here, because this path runs in date
  // order — reading `item.season` off a date-ordered list makes the chapters
  // jump backwards and forwards, and emits the same season heading two or three
  // times over.
  //
  // A season's date range is monotonic, so taking the chapter from the date
  // gives each season one heading, in order, where it actually begins.
  const seasons = (roadmap?.seasons || []).slice().sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  const seasonForDate = (d) => seasons.find((s) => d >= s.startDate && d <= s.endDate) || null;

  const pushToday = () => {
    if (todayPlaced) return;
    todayPlaced = true;
    stops.push({ kind: 'today', key: 'today', date: today, past: true });
  };

  stops.push({ kind: 'start', key: 'start', date: roadmap?.startDate || null, past: true });

  dated.forEach(({ item, due }) => {
    if (due > today) pushToday();
    const season = seasonForDate(due);
    if (season && !seasonsSeen.has(season.id)) {
      seasonsSeen.add(season.id);
      stops.push({ kind: 'season', key: `season-${season.id}`, season, past: due < today });
    }
    stops.push({ kind: 'item', key: item.id, item, date: due, past: due < today, done: item.status === 'done' });
  });

  // A year entirely behind them still gets its marker, at the end.
  pushToday();

  if (undated.length) {
    stops.push({ kind: 'unpinned', key: 'unpinned', count: undated.length, past: false });
    undated.forEach(({ item }) => stops.push({
      kind: 'item', key: item.id, item, date: null, past: false, undated: true, done: item.status === 'done',
    }));
  }

  stops.push({ kind: 'finish', key: 'finish', date: roadmap?.endDate || null, past: false });
  return stops;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry — where the road goes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lay the stops out as a serpentine climbing from the bottom of the canvas.
 *
 * Row 0 is the bottom row and runs left → right; row 1 sits above it and runs
 * right → left; and so on. Every node keeps the same x slots regardless of how
 * full its row is, so a half-empty final row still lines up with the ones under
 * it and the road stays regular rather than sagging at the top.
 *
 * Returns the placed stops (each with x, y, and `t`: how far along the whole
 * path it sits, 0–1) plus the SVG path string and the canvas height.
 */
function layout(stops, { width, perRow, rowH, bulge, maxLabel }) {
  if (!width || !stops.length) return null;
  const rows = Math.ceil(stops.length / perRow);
  const height = PAD_TOP + rows * rowH + PAD_BOTTOM;

  // ── Label width first, then everything else from it ───────────────────────
  // The order matters and getting it backwards is what put labels off the edge
  // of the frame. A label is centred on its node, so the outermost node's label
  // hangs half its width into the edge padding — which means the padding cannot
  // be chosen before the label width is known. Deriving it the other way round
  // (pick a padding, then fit a label to the slot it leaves) produces a label
  // wider than the margin holding it, every time the container is narrow.
  //
  // So: each column is allotted an equal share of the width, the label takes as
  // much of that share as it is allowed, and the edge padding is then whatever
  // keeps that label inside the frame — never less than the turn needs to draw
  // its bulge in.
  //
  // Floor at 76px rather than at nothing: below that a title is not shortened,
  // it is destroyed. If a column cannot afford even that, the column count was
  // wrong — which is what columnsFor exists to prevent.
  const labelW = Math.max(76, Math.min(maxLabel, width / perRow - 12));
  const padX = Math.max(bulge + 6, labelW / 2 + 8);
  const usable = Math.max(60, width - padX * 2);
  const slot = perRow > 1 ? usable / (perRow - 1) : usable;

  const placed = stops.map((stop, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    // Rows alternate direction. The bottom row (0) runs left to right, which is
    // the direction the eye starts in.
    const rightward = row % 2 === 0;
    const slotIdx = rightward ? col : perRow - 1 - col;
    const x = perRow > 1 ? padX + slotIdx * slot : width / 2;
    // Bottom-up: row 0 sits at the bottom of the canvas.
    const y = height - PAD_BOTTOM - row * rowH - rowH / 2;
    return { ...stop, x, y, row, col, rightward, index: i, t: stops.length > 1 ? i / (stops.length - 1) : 0 };
  });

  return { placed, height, width, labelW, padX, d: pathThrough(placed, { perRow, padX, width, bulge }), rows };
}

/**
 * The road itself, as one continuous SVG path.
 *
 * Straight runs along each row, and a U-turn at the end of every full row that
 * bulges past the outermost node before coming back in on the row above. The
 * bulge is what makes it read as a road bending rather than as a bracket: a
 * turn drawn inside the node column looks like a mistake in a table.
 *
 * Every point is a node centre, so the drawing and the buttons over it can never
 * disagree — there is no separate curve fitted to a guess at where they are.
 */
function pathThrough(placed, { perRow, padX, width, bulge }) {
  if (placed.length < 2) return '';
  const parts = [`M ${placed[0].x.toFixed(1)} ${placed[0].y.toFixed(1)}`];

  for (let i = 1; i < placed.length; i += 1) {
    const prev = placed[i - 1];
    const node = placed[i];
    if (node.row === prev.row) {
      parts.push(`L ${node.x.toFixed(1)} ${node.y.toFixed(1)}`);
      continue;
    }
    // A turn. It happens at whichever edge the previous row ended on; the row
    // above starts at that same edge, so the curve is a half-loop around it.
    const outward = prev.rightward ? 1 : -1;
    const edge = prev.rightward ? Math.max(prev.x, width - padX) : Math.min(prev.x, padX);
    const cx = edge + outward * bulge;
    parts.push(
      `C ${cx.toFixed(1)} ${prev.y.toFixed(1)} ${cx.toFixed(1)} ${node.y.toFixed(1)} ${node.x.toFixed(1)} ${node.y.toFixed(1)}`,
    );
  }
  return parts.join(' ');
}

const MONTH_ABBR = [
  ['January', 'Jan'], ['February', 'Feb'], ['March', 'Mar'], ['April', 'Apr'],
  ['August', 'Aug'], ['September', 'Sep'], ['October', 'Oct'], ['November', 'Nov'], ['December', 'Dec'],
];
/**
 * "February – May" → "Feb – May", for the chip on the road.
 *
 * Season labels are written out in full everywhere else, and they should be:
 * they are headings. On the path a heading has to fit inside about one node's
 * width or it truncates mid-month, which is worse than an abbreviation. May,
 * June and July are already short enough to leave alone.
 */
function shortSeason(label) {
  let out = String(label || '');
  for (const [long, short] of MONTH_ABBR) out = out.replace(long, short);
  return out;
}

/**
 * The stop nearest the middle of the viewport — what the header names.
 *
 * Measured in pixels rather than in path fraction, because those two are only
 * approximately related and the header is the one place on this screen that
 * makes a flat factual claim ("you are looking at March"). An approximation
 * there would be wrong by half a row, which is a whole month.
 */
function nearestStop(placed, centreY) {
  let best = null;
  let bestD = Infinity;
  for (const p of placed) {
    const d = Math.abs(p.y - centreY);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// The drawing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Four strokes on top of each other, each one saying something different:
 *
 *   1. the road ahead — wide, dim, the whole path;
 *   2. the road travelled — the same path, drawn in green up to today only;
 *   3. the focus glow — a short bright section following the middle of the
 *      viewport, which is the pulse you feel when you drag;
 *   4. the runner — a small light that travels the travelled section and stops
 *      at today, so the eye is led to where the student is standing.
 *
 * All of it is done with dash offsets on a path declared `pathLength=1000`,
 * which means none of the arithmetic below depends on the real pixel length of
 * the road and nothing has to be re-measured when the container resizes.
 */
function PathDrawing({ geo, travelled, focus, reducedMotion, nodeR }) {
  const aheadColor = tint(C.violet, 0.24);
  const doneColor = tint(C.green, 0.55);
  const glowWidth = 90;   // path units — about a tenth of the road
  const glowStart = Math.max(0, Math.min(PATH_UNITS - glowWidth, focus * PATH_UNITS - glowWidth / 2));

  return (
    <svg
      width="100%"
      height={geo.height}
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rp-travelled" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={tint(C.green, 0.35)} />
          <stop offset="100%" stopColor={C.green} />
        </linearGradient>
        <filter id="rp-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* 1 · the road ahead */}
      <path
        d={geo.d} pathLength={PATH_UNITS} fill="none"
        stroke={aheadColor} strokeWidth={nodeR * 0.85} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* a thin dashed centre line, purely so the road reads as a road */}
      <path
        d={geo.d} pathLength={PATH_UNITS} fill="none"
        stroke={tint(C.violet, 0.4)} strokeWidth={1.5} strokeDasharray="4 10" strokeLinecap="round"
      />

      {/* 3 · the focus glow, under the travelled stroke so it lights the road
             rather than sitting on top of it */}
      {!reducedMotion && (
        <path
          d={geo.d} pathLength={PATH_UNITS} fill="none"
          stroke={tint(C.violetL || C.violet, 0.5)} strokeWidth={nodeR * 1.25} strokeLinecap="round"
          strokeDasharray={`${glowWidth} ${PATH_UNITS}`}
          strokeDashoffset={-glowStart}
          filter="url(#rp-soft)"
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      )}

      {/* 2 · the road travelled */}
      <path
        d={geo.d} pathLength={PATH_UNITS} fill="none"
        stroke="url(#rp-travelled)" strokeWidth={nodeR * 0.85} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${travelled * PATH_UNITS} ${PATH_UNITS}`}
      />

      {/* 4 · the runner. Travels the travelled section and stops at today —
             a light that ran the whole road would be saying the year is done. */}
      {!reducedMotion && travelled > 0.02 && (
        <motion.path
          d={geo.d} pathLength={PATH_UNITS} fill="none"
          stroke={C.greenL || C.green} strokeWidth={nodeR * 0.5} strokeLinecap="round"
          strokeDasharray={`26 ${PATH_UNITS}`}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: [-0, -travelled * PATH_UNITS] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
          style={{ opacity: 0.85 }}
        />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// One stop on the road
// ─────────────────────────────────────────────────────────────────────────────

function Stop({ p, today, nodeR, labelW, isMobile, active, proximity, reducedMotion, onHover, onLeave, onSelect }) {
  const lift = reducedMotion ? 0 : Math.max(0, proximity);
  // Centred with a translate, which is correct for everything here EXCEPT the
  // item node — see the note on `itemBox` below for why that one cannot use it.
  const common = {
    position: 'absolute',
    left: p.x,
    top: p.y,
    transform: 'translate(-50%, -50%)',
  };

  if (p.kind === 'start' || p.kind === 'finish') {
    const isStart = p.kind === 'start';
    return (
      <div style={{ ...common, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: nodeR * 1.9, height: nodeR * 1.9, borderRadius: '50%',
          background: tint(isStart ? C.green : C.violet, 0.18),
          border: `2px solid ${tint(isStart ? C.green : C.violet, 0.5)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
        }}>
          <Flag size={nodeR * 0.85} color={isStart ? C.green : C.violet} />
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', color: C.t4, marginTop: 6, textTransform: 'uppercase' }}>
          {isStart ? 'Start' : 'One year'}
        </div>
      </div>
    );
  }

  if (p.kind === 'today') {
    return (
      <div style={{ ...common, textAlign: 'center', pointerEvents: 'none', zIndex: 3 }}>
        <div style={{ position: 'relative', width: nodeR * 2.2, height: nodeR * 2.2, margin: '0 auto' }}>
          {/* The breathing halo. The only thing on this screen that moves at
              rest, which is what makes it the thing the eye finds. */}
          {!reducedMotion && (
            <motion.span
              aria-hidden
              animate={{ scale: [1, 1.85, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: tint(C.amber, 0.45),
              }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: C.amber, border: `2px solid ${C.s0}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 3px ${tint(C.amber, 0.28)}`,
          }}>
            <MapPin size={nodeR} color={C.s0} />
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, marginTop: 7, whiteSpace: 'nowrap' }}>
          You are here
        </div>
      </div>
    );
  }

  if (p.kind === 'season') {
    return (
      <button
        type="button"
        onClick={onSelect}
        style={{
          ...common, background: 'none', border: 0, padding: 0, cursor: 'pointer',
          textAlign: 'center', width: labelW, zIndex: 4,
        }}
        // The season's theme is a sentence fragment and it belongs on the
        // Seasons view, not under a chip on a road — printed here it wrapped to
        // two lines and ran straight into the titles either side of it. It
        // travels in the tooltip instead, where it costs nothing.
        title={[p.season.theme, p.season.narrative].filter(Boolean).join(' — ') || p.season.label}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%',
          background: tint(C.teal, 0.18), border: `1px solid ${tint(C.teal, 0.45)}`,
          borderRadius: 999, padding: '5px 11px',
          fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: C.teal,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {shortSeason(p.season.label)}
        </span>
      </button>
    );
  }

  if (p.kind === 'unpinned') {
    return (
      <div style={{ ...common, textAlign: 'center', pointerEvents: 'none', width: labelW }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: tint(C.violet, 0.14), border: `1px dashed ${tint(C.violet, 0.45)}`,
          borderRadius: 999, padding: '4px 10px', fontSize: 9.5, fontWeight: 800, color: C.violet,
        }}>
          <CalendarSearch size={11} /> {p.count} to look up
        </div>
      </div>
    );
  }

  // ── An item ────────────────────────────────────────────────────────────────
  const item = p.item;
  const color = trackColor(item.track);
  const Icon = TRACK_ICON[item.track] || Flag;
  const urgency = itemUrgency(item, today);
  const exact = displaysExactDate(item);
  const done = p.done;
  const meta = URGENCY_META[urgency] || URGENCY_META.later;
  const loud = urgency === 'start-now' || urgency === 'critical';

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      aria-label={`${item.title}${done ? ', done' : ''} — ${meta.label}`}
      animate={reducedMotion ? undefined : { scale: 1 + lift * 0.06 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      // ── Positioned by arithmetic, not by a centring translate ──────────────
      // framer-motion composes `transform` from its own animated values, so a
      // `transform: translate(-50%,-50%)` written in the style prop is silently
      // replaced the moment `scale` animates. Every item node then rendered with
      // its top-left corner on the road instead of its centre: labels sat half a
      // width to the right, overlapped their neighbours, and the right-hand
      // column ran off the edge of the frame.
      //
      // So this one is placed by number. `left` centres the label block on the
      // node's x; `top` puts the circle's TOP at y − r, which puts its centre on
      // the road. Nothing about that can be overwritten by an animation.
      style={{
        position: 'absolute',
        left: p.x - labelW / 2,
        top: p.y - nodeR,
        width: labelW,
        transformOrigin: `50% ${nodeR}px`,
        background: 'none', border: 0, padding: 0, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        zIndex: active ? 5 : 2,
      }}
    >
      <span style={{
        position: 'relative',
        width: nodeR * 2, height: nodeR * 2, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        // Done is filled, ahead is outlined, and an unconfirmed date is dashed.
        // Three states, three shapes, no legend needed to tell them apart at a
        // glance — the legend under the frame is for confirming a guess, not for
        // making one possible.
        background: done ? tint(C.green, 0.9) : tint(color, 0.16 + lift * 0.14),
        border: `${exact ? 2 : 2}px ${exact ? 'solid' : 'dashed'} ${done ? C.green : tint(color, 0.65)}`,
        boxShadow: loud && !done ? `0 0 0 ${3 + lift * 3}px ${tint(meta.color, 0.18)}` : 'none',
        transition: 'background .2s, box-shadow .2s',
      }}>
        {done
          ? <CheckCircle2 size={nodeR * 1.05} color={C.s0} />
          : <Icon size={nodeR * 0.95} color={color} />}
      </span>

      <span style={{
        fontSize: isMobile ? 10.5 : 11.5,
        fontWeight: 700,
        color: done ? C.t3 : C.t1,
        lineHeight: 1.3,
        textAlign: 'center',
        textDecoration: done ? 'line-through' : 'none',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </span>

      {/* The date, through the one sanctioned component. Never interpolated.
          Compact, because on a road the full caveated caption is three wrapped
          lines under a circle — see the note on dateCaption's compact form for
          why saying less is allowed here and saying more never is. */}
      <span style={{ opacity: 0.9, maxWidth: '100%', overflow: 'hidden' }}>
        <ItemDate item={item} size={9.5} showIcon={false} compact />
      </span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome
// ─────────────────────────────────────────────────────────────────────────────

function PathHeader({ focused, travelled, isMobile, onJumpToday, stops }) {
  const total = stops.filter((s) => s.kind === 'item').length;
  const done = stops.filter((s) => s.kind === 'item' && s.done).length;
  const where = focused?.kind === 'item'
    ? (focused.date ? fmtMonth(String(focused.date).slice(0, 7)) : 'Undated stretch')
    : focused?.kind === 'season' ? focused.season.label
      : focused?.kind === 'today' ? 'Where you are standing'
        : focused?.kind === 'start' ? 'The start of your year'
          : focused?.kind === 'finish' ? 'The end of your year'
            : '';

  return (
    <div style={{
      // Stacked on a phone rather than wrapped. Wrapping looks like the right
      // answer and is not: with a minimum width on the left half, the right half
      // shrinks to something narrower than its own text instead of moving to a
      // second line, and "6% through the year" loses its last two words to the
      // edge of the screen.
      display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 10 : 12,
      flexDirection: isMobile ? 'column' : 'row',
      marginBottom: 12,
    }}>
      <div style={{ flex: 1, minWidth: isMobile ? 0 : 180 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.t4 }}>
          Looking at
        </div>
        <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 800, color: C.t1, marginTop: 2 }}>
          {where || '—'}
        </div>
      </div>

      {/* How far along the road they are, stated rather than implied. The
          drawing shows it; a number is what a person repeats to themselves. */}
      <div style={{
        textAlign: isMobile ? 'left' : 'right',
        display: isMobile ? 'flex' : 'block',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ fontSize: 11, color: C.t4, fontWeight: 700 }}>
          {done}/{total} done · {Math.round(travelled * 100)}% through the year
        </div>
        <button
          type="button"
          onClick={onJumpToday}
          style={{
            marginTop: isMobile ? 0 : 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
            background: tint(C.amber, 0.14), border: `1px solid ${tint(C.amber, 0.34)}`,
            color: C.amber, borderRadius: 8, padding: '5px 11px',
            fontSize: 11, fontWeight: 700, fontFamily: C.FB, cursor: 'pointer',
          }}
        >
          <Crosshair size={12} /> Jump to today
        </button>
      </div>
    </div>
  );
}

function PathLegend({ isMobile, dragging }) {
  const Item = ({ children }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.t4 }}>{children}</span>
  );
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 14px', borderTop: `1px solid ${C.b1}`, background: C.surf2,
    }}>
      <Item>
        <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${tint(C.violet, 0.65)}`, display: 'inline-block' }} />
        ahead of you
      </Item>
      <Item>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
        done
      </Item>
      <Item>
        <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px dashed ${tint(C.violet, 0.65)}`, display: 'inline-block' }} />
        date not confirmed
      </Item>
      <span style={{ flex: 1 }} />
      <Item>
        {isMobile ? <><ChevronUp size={11} />swipe up to go forward<ChevronDown size={11} /></> : <><Hand size={11} />{dragging ? 'moving…' : 'drag the path, or use ↑ ↓'}</>}
      </Item>
    </div>
  );
}
