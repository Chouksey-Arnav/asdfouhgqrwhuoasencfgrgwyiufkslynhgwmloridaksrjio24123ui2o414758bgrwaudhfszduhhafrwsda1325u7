import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Minus, Maximize2, Minimize2, Trash2, GripHorizontal, Calculator, LineChart, Info,
} from 'lucide-react';
import { C, R, tint } from '../../lib/theme';
import DesmosSurface, { resetCalculator, calcChromeButton } from './DesmosSurface';
import { CALC_MODES, loadCalcUi, saveCalcUi } from '../../lib/sat/desmos';
import { satWash } from './satUi';

// ─────────────────────────────────────────────────────────────────────────────
// The floating Desmos window.
//
// On the real Digital SAT the calculator is a panel a student pops open on top
// of the question and drags out of the way of the passage — so it is a floating
// window here too, not a separate screen. Practicing on a layout the exam does
// not have is a small thing that costs real seconds on test day.
//
// It stays open across questions, across sub-tabs, and across reloads: geometry
// lives in localStorage (see desmos.js) and the graph state is saved by
// DesmosSurface. Nothing about using it is rationed.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_W = 520;
const DEFAULT_H = 460;
const MIN_W = 340;
const MIN_H = 300;
const HEADER_H = 42;
const Z = 336; // above the Medabrain slide-out (330) — both can be open at once

/** Keep a window fully reachable after a resize/rotate that shrank the viewport. */
function clampToViewport(geo) {
  if (typeof window === 'undefined') return geo;
  const w = Math.min(Math.max(geo.w, MIN_W), Math.max(MIN_W, window.innerWidth - 24));
  const h = Math.min(Math.max(geo.h, MIN_H), Math.max(MIN_H, window.innerHeight - 24));
  return {
    w, h,
    x: Math.min(Math.max(geo.x, 8), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(geo.y, 8), Math.max(8, window.innerHeight - HEADER_H - 8)),
  };
}

function defaultGeometry() {
  if (typeof window === 'undefined') return { x: 40, y: 90, w: DEFAULT_W, h: DEFAULT_H };
  return clampToViewport({
    x: Math.max(16, window.innerWidth - DEFAULT_W - 48),
    y: 96,
    w: DEFAULT_W,
    h: DEFAULT_H,
  });
}

export default function DesmosCalculator({
  open,
  onClose,
  seed = null,
  accent = C.teal,
  isMobile = false,
  /** Shown as a small note in the header — e.g. "not available on real R&W". */
  note = null,
}) {
  const saved = useRef(loadCalcUi());
  const [mode, setMode] = useState(() => saved.current?.mode || 'graphing');
  const [geo, setGeo] = useState(() => (saved.current?.geo ? clampToViewport(saved.current.geo) : defaultGeometry()));
  const [minimised, setMinimised] = useState(false);
  const [maximised, setMaximised] = useState(false);
  const calcRef = useRef(null);
  const dragRef = useRef(null);

  // Persist mode + geometry together so reopening restores the exact window.
  useEffect(() => { saveCalcUi({ mode, geo }); }, [mode, geo]);

  useEffect(() => {
    if (isMobile) return undefined;
    const onResize = () => setGeo(g => clampToViewport(g));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile]);

  // ── Drag (header) and resize (corner grip) ────────────────────────────────
  // Pointer events rather than a drag library: this needs to keep working while
  // the pointer is over the Desmos iframe-like surface, which setPointerCapture
  // handles and mouse-move-on-document does not, reliably.
  const beginPointer = useCallback((e, kind) => {
    if (isMobile || maximised) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, geo: { ...geo } };
    dragRef.current = { kind, start };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [geo, isMobile, maximised]);

  const movePointer = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.start.x;
    const dy = e.clientY - d.start.y;
    if (d.kind === 'move') {
      setGeo(clampToViewport({ ...d.start.geo, x: d.start.geo.x + dx, y: d.start.geo.y + dy }));
    } else {
      setGeo(clampToViewport({ ...d.start.geo, w: d.start.geo.w + dx, h: d.start.geo.h + dy }));
    }
  }, []);

  const endPointer = useCallback((e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const handleReset = useCallback(() => {
    resetCalculator(calcRef.current, mode);
  }, [mode]);

  // A seed arriving while the window is minimized should pop it back open —
  // the student pressed "graph this question" and expects to see a graph.
  useEffect(() => { if (seed?.token) setMinimised(false); }, [seed?.token]);

  if (!open) return null;

  const surfaceHeight = isMobile
    ? '100%'
    : maximised ? '100%' : Math.max(MIN_H - HEADER_H, geo.h - HEADER_H);

  const frame = isMobile
    ? {
      // dvh, not vh: on iOS Safari a vh-sized sheet extends under the collapsing
      // toolbar, which would put the calculator's own keypad off screen.
      position: 'fixed', left: 0, right: 0, bottom: 0, height: '78dvh', zIndex: Z,
      borderRadius: '18px 18px 0 0', borderTop: `1px solid ${tint(accent, 0.35)}`,
    }
    : maximised
      ? { position: 'fixed', left: 16, top: 16, width: 'calc(100vw - 32px)', height: 'calc(var(--msp-vh) - 32px)', zIndex: Z, borderRadius: 12, border: `1px solid ${tint(accent, 0.35)}` }
      : { position: 'fixed', left: geo.x, top: geo.y, width: geo.w, height: minimised ? HEADER_H : geo.h, zIndex: Z, borderRadius: 12, border: `1px solid ${tint(accent, 0.35)}` };

  return (
    <AnimatePresence>
      <motion.div
        key="desmos-window"
        className={isMobile ? 'sat-sheet' : undefined}
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        style={{
          ...frame,
          background: C.s0,
          boxShadow: `0 18px 60px rgba(0,0,0,0.65), 0 0 0 1px ${tint(accent, 0.14)}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* ── Title bar / drag handle ── */}
        <div
          onPointerDown={(e) => beginPointer(e, 'move')}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          style={{
            height: HEADER_H, flexShrink: 0, padding: '0px 8px 0px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: satWash(accent, 0.09),
            borderBottom: `1px solid ${C.b1}`,
            cursor: isMobile || maximised ? 'default' : 'grab',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          {!isMobile && !maximised && <GripHorizontal size={13} color={C.t4} />}
          <Calculator size={14} color={accent} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, whiteSpace: 'nowrap' }}>
            Desmos
          </span>

          {/* Mode switch — graphing is the SAT's own calculator; scientific is
              here because a plain arithmetic check should not need a graph. */}
          <div style={{ ...R({ gap: 4 }), marginLeft: 4 }} onPointerDown={e => e.stopPropagation()}>
            {Object.values(CALC_MODES).map(m => (
              <button
                key={m.id} onClick={() => setMode(m.id)} title={m.blurb}
                // A stable handle and a real accessible name. On mobile the
                // label is hidden to save header width, which left these
                // buttons announced as nothing at all to a screen reader — and
                // left anything looking for them by text matching whatever else
                // on the page happened to contain the word.
                data-calc-mode={m.id}
                aria-label={`${m.label} calculator`}
                aria-pressed={mode === m.id}
                style={calcChromeButton(mode === m.id, accent)}
              >
                {m.id === 'graphing' ? <LineChart size={11} /> : <Calculator size={11} />}
                {!isMobile && m.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={R({ gap: 4 })} onPointerDown={e => e.stopPropagation()}>
            <IconBtn title="Clear the graph" onClick={handleReset}><Trash2 size={13} /></IconBtn>
            {!isMobile && (
              <>
                <IconBtn title={minimised ? 'Expand' : 'Minimize'} onClick={() => { setMinimised(v => !v); setMaximised(false); }}>
                  <Minus size={13} />
                </IconBtn>
                <IconBtn title={maximised ? 'Restore' : 'Full screen'} onClick={() => { setMaximised(v => !v); setMinimised(false); }}>
                  {maximised ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </IconBtn>
              </>
            )}
            <IconBtn title="Close (esc)" onClick={onClose}><X size={14} /></IconBtn>
          </div>
        </div>

        {/* ── Body ── */}
        {!minimised && (
          <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {note && (
              <div style={{
                ...R({ gap: 8, alignItems: 'flex-start' }), flexShrink: 0,
                padding: '8px 12px', background: tint(C.amber, 0.09),
                borderBottom: `1px solid ${tint(C.amber, 0.2)}`,
              }}>
                <Info size={11} color={C.amberL} style={{ marginTop: 4, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: C.t2, lineHeight: 1.5 }}>{note}</span>
              </div>
            )}
            <DesmosSurface
              mode={mode}
              seed={seed}
              onCalculator={(c) => { calcRef.current = c; }}
              minHeight={0}
              style={{ flex: 1, minHeight: 0, height: surfaceHeight }}
            />
          </div>
        )}

        {/* ── Resize grip ── */}
        {!isMobile && !minimised && !maximised && (
          <div
            onPointerDown={(e) => beginPointer(e, 'resize')}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            title="Drag to resize"
            style={{
              position: 'absolute', right: 0, bottom: 0, width: 18, height: 18,
              cursor: 'nwse-resize', touchAction: 'none',
              background: `linear-gradient(135deg, transparent 45%, ${tint(accent, 0.5)} 45%, ${tint(accent, 0.5)} 60%, transparent 60%, transparent 72%, ${tint(accent, 0.5)} 72%, ${tint(accent, 0.5)} 86%, transparent 86%)`,
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function IconBtn({ children, title, onClick }) {
  return (
    <button
      onClick={onClick} title={title} aria-label={title}
      style={{
        width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent',
        color: C.t3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = C.t1; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.t3; }}
    >
      {children}
    </button>
  );
}
