import React, { useEffect, useRef, useState } from 'react';
import { Loader2, WifiOff, RotateCcw, ExternalLink } from 'lucide-react';
import { C, glass2, btnG, btnSm, R, tint, onTint } from '../../lib/theme';
import {
  loadDesmos, createCalculator, desmosLoadState,
  loadGraphState, saveGraphState, clearGraphState,
  DESMOS_FALLBACK_URL,
} from '../../lib/sat/desmos';

// ─────────────────────────────────────────────────────────────────────────────
// The live Desmos calculator, and nothing else.
//
// Every other calculator surface in the app (the floating window, the Calculator
// tab's full-size panel) wraps THIS — one mount path, one persistence path, one
// error path. Two independent implementations of "make a Desmos" is how you end
// up with two graphs that disagree about what the student typed.
//
// ONE INSTANCE AT A TIME. Desmos calculators are heavy and each one writes back
// to the same saved graph state, so two live instances would race and the loser
// would silently overwrite the winner's expressions. The floating window stands
// down while the Calculator tab is mounted (see SatToolsContext).
// ─────────────────────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 700;

export default function DesmosSurface({
  mode = 'graphing',
  seed = null,          // { token, expressions:[{id,latex}], table } — see desmosSeed.js
  onCalculator,         // (calc|null) => void, for callers that need the handle
  onStatusChange,       // ('loading'|'ready'|'error') => void
  minHeight = 320,
  style = {},
}) {
  const hostRef = useRef(null);
  const calcRef = useRef(null);
  const saveTimer = useRef(null);
  const seededIds = useRef([]);
  const [status, setStatus] = useState(() => (desmosLoadState() === 'ready' ? 'ready' : 'loading'));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Incremented every time a calculator is actually constructed. The seed
  // effect below keys off THIS, not `status`: once the Desmos script is cached,
  // `status` starts at 'ready' and setting it to 'ready' again is a no-op, so a
  // status-keyed effect would run before the calculator exists and never run
  // again — which is exactly how "Graph this question" silently did nothing.
  const [calcGeneration, setCalcGeneration] = useState(0);

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  // ── Mount / remount ────────────────────────────────────────────────────────
  // Keyed on mode and retry attempt: switching graphing↔scientific tears the old
  // calculator down (saving its state first) and builds the other one.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loadDesmos()
      .then((Desmos) => {
        if (cancelled || !hostRef.current) return;
        const calc = createCalculator(Desmos, hostRef.current, mode);
        if (!calc) throw new Error('This build of the Desmos API has no calculator for that mode.');
        calcRef.current = calc;

        // Restore the student's scratch work before anything else renders, so
        // the calculator never flashes empty and then fills in.
        const saved = loadGraphState(mode);
        if (saved) { try { calc.setState(saved); } catch { /* stale/incompatible state */ } }

        calc.observeEvent?.('change', () => {
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            try { saveGraphState(mode, calc.getState()); } catch { /* non-fatal */ }
          }, SAVE_DEBOUNCE_MS);
        });

        setStatus('ready');
        setCalcGeneration(g => g + 1);
        onCalculator?.(calc);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Desmos could not load.');
        setStatus('error');
        onCalculator?.(null);
      });

    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
      const calc = calcRef.current;
      if (calc) {
        // Flush before teardown — an unmount mid-typing must not lose the line
        // the student was in the middle of.
        try { saveGraphState(mode, calc.getState()); } catch { /* non-fatal */ }
        // calc.destroy() tears down Desmos's own WebGL/SVG surface, which is
        // heavy. This unmount is most often triggered by SatToolsContext hiding
        // the tools portal the instant the student leaves the SAT tab (see
        // `toolsActive` there) — the SAME commit that starts App.jsx's outer
        // AnimatePresence exit animation for the outgoing tab. Running the
        // expensive destroy synchronously in that commit can contend with the
        // animation's own frame and stall the repaint that swaps in the next
        // tab, leaving the screen blank until something else forces a repaint.
        // The rail/window are already hidden by `toolsActive` at this point, so
        // the destroy can wait one frame without the student ever seeing it.
        requestAnimationFrame(() => { try { calc.destroy(); } catch { /* already gone */ } });
      }
      calcRef.current = null;
      seededIds.current = [];
    };
    // onCalculator/onStatusChange are intentionally excluded: they are callbacks
    // whose identity would otherwise rebuild the whole calculator on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, attempt]);

  // ── Container resizing ─────────────────────────────────────────────────────
  // Desmos's `autosize` tracks the WINDOW, not its container, so dragging the
  // floating window's resize handle would otherwise leave the graph paper the
  // old size until the next window resize.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { try { calcRef.current?.resize(); } catch { /* not ready */ } });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // ── Seeding from a question ────────────────────────────────────────────────
  // `token` changes every time the student presses "Graph this question", so
  // pressing it twice re-seeds rather than doing nothing.
  useEffect(() => {
    const calc = calcRef.current;
    if (!calc || !seed?.token) return;
    if (mode !== 'graphing') return; // nothing to plot on a scientific calculator

    try {
      // Replace, never accumulate — the previous question's curves would
      // otherwise still be on the axes, which is worse than no help at all.
      for (const id of seededIds.current) calc.removeExpression({ id });
      seededIds.current = [];

      const next = [];
      for (const e of seed.expressions || []) {
        calc.setExpression({ id: e.id, latex: e.latex, color: e.color || undefined });
        next.push(e.id);
      }
      if (seed.table) {
        calc.setExpression(seed.table);
        next.push(seed.table.id);
      }
      seededIds.current = next;
      // Frame what we just added rather than leaving it off-screen.
      if (next.length && typeof calc.setMathBounds === 'function' && seed.resetViewport !== false) {
        calc.setMathBounds({ left: -10, right: 10, bottom: -10, top: 10 });
      }
    } catch { /* a malformed expression must never break the calculator */ }
  }, [seed?.token, calcGeneration, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Could not load ─────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ ...glass2({ padding: 20 }), minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: tint(C.amber, 0.14),
            border: `1px solid ${tint(C.amber, 0.3)}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <WifiOff size={19} color={C.amberL} />
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>Desmos could not load</div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>
            {error} The calculator is served from Desmos, so it needs a connection — everything
            else in the SAT tab keeps working offline.
          </div>
          <div style={{ ...R({ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }), marginTop: 12 }}>
            <button onClick={() => setAttempt(a => a + 1)} style={btnG({ padding: '8px 12px', fontSize: 12 })}>
              <RotateCcw size={12} /> Try again
            </button>
            <a href={DESMOS_FALLBACK_URL} target="_blank" rel="noopener noreferrer"
              style={{ ...btnG({ padding: '8px 12px', fontSize: 12 }), textDecoration: 'none' }}>
              Open desmos.com <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight, ...style }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, background: C.s1, color: C.t3, fontSize: 12.5, borderRadius: 8,
        }}>
          <Loader2 size={15} className="spin" /> Loading Desmos…
        </div>
      )}
    </div>
  );
}

/**
 * Wipe a calculator back to a blank graph, including its saved state.
 * Lives here rather than in the window chrome so "clear" means the same thing
 * from the floating window and from the Calculator tab.
 */
export function resetCalculator(calc, mode = 'graphing') {
  clearGraphState(mode);
  try {
    if (typeof calc?.setBlank === 'function') calc.setBlank();
    else calc?.setState({ version: 9, graph: {}, expressions: { list: [] } });
  } catch { /* non-fatal */ }
}

/** Shared chrome-button styling for the calculator's own toolbar. */
export const calcChromeButton = (active, accent = C.teal) => btnSm(
  active ? tint(accent, 0.22) : 'rgba(255,255,255,0.04)',
  { border: `1px solid ${active ? tint(accent, 0.45) : C.b1}`, padding: '4px 8px', fontSize: 11.5, color: active ? onTint(accent) : C.t2 },
);
