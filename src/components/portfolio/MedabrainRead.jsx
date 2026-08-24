import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Brain, Loader2, RefreshCw, AlertTriangle, Sparkles, ChevronDown } from 'lucide-react';
import { C, glass2, btnSm, btnG, R, CC, pill, tint } from '../../lib/theme';
import { renderMarkdown } from '../../lib/renderMarkdown';
import { READ_SPECS, runPortfolioRead, readBand } from '../../lib/portfolioCritique';

// ─────────────────────────────────────────────────────────────────────────────
// The shared surface for every Medabrain deep read in the Activities & Resume
// Builder — the slate read, the per-activity read, the academic read, the
// honors read. One component so all four look, behave, fail, and re-run the
// same way, and so a student learns the pattern once: violet border + brain
// icon means "Medabrain has actually read this."
//
// Two decisions worth stating:
//
// 1. IT NEVER AUTO-RUNS BY DEFAULT. These are 1400-token reads on a key pool
//    shared with the whole Portfolio tab. Firing four of them every time a
//    student opens the panel would burn the rate limit on reads nobody asked
//    for and make the panel slow to paint. `auto` exists for the one case where
//    the read IS the point (the academic reaction after saving a GPA), and
//    everything else is a button.
//
// 2. THE DETERMINISTIC READ STAYS VISIBLE UNDERNEATH. `fallback` renders
//    whenever the AI layer is idle, loading, or broken — so this card is never
//    an empty box with a button in it. There is always an opinion on screen;
//    the button just buys a deeper one. That is the whole two-layer contract
//    from activityIntel.js, made visible.
// ─────────────────────────────────────────────────────────────────────────────

const TONE = {
  critical: { fg: C.roseL, bg: C.roseDim, border: tint(C.rose, 0.32) },
  warn: { fg: C.amberL, bg: C.amberDim, border: tint(C.amber, 0.3) },
  good: { fg: C.greenL, bg: C.greenDim, border: tint(C.green, 0.3) },
  great: { fg: C.greenL, bg: C.greenDim, border: tint(C.green, 0.45) },
  neutral: { fg: C.t3, bg: 'rgba(255,255,255,0.04)', border: C.b1 },
};

export default function MedabrainRead({
  kind,                       // 'slate' | 'activity' | 'academics' | 'honors'
  args,                       // the object handed to the prompt builder
  title = "Medabrain's read",
  runLabel = 'Have Medabrain read this properly',
  idleHint = null,
  fallback = null,            // the always-on deterministic opinion
  auto = false,               // run once on mount / when `autoKey` changes
  autoKey = null,
  compact = false,
  disabled = false,
  disabledHint = null,
}) {
  const [state, setState] = useState({ loading: false, error: null, read: null });
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef(null);
  const autoRunRef = useRef(null);

  const run = useCallback(async () => {
    const spec = READ_SPECS[kind];
    if (!spec || disabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ loading: true, error: null, read: null });
    try {
      const system = spec.build(args || {});
      const read = await runPortfolioRead({
        system, message: spec.kickoff, maxTokens: spec.maxTokens, signal: controller.signal,
      });
      if (!controller.signal.aborted) setState({ loading: false, error: null, read });
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError') return;
      setState({ loading: false, error: err.message, read: null });
    }
    // args is intentionally read at call time rather than tracked: a read is a
    // snapshot of the record at the moment the student asked for it, and
    // re-running because a keystroke changed one field is the behavior this
    // feature specifically does not want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, disabled, args]);

  useEffect(() => {
    if (!auto || disabled) return;
    if (autoRunRef.current === autoKey) return;
    autoRunRef.current = autoKey;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoKey, disabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const band = state.read ? readBand(state.read.score) : null;
  const tone = band ? (TONE[band.tone] || TONE.neutral) : TONE.neutral;

  return (
    <div style={{
      ...glass2({ padding: compact ? 13 : 16 }),
      border: `1px solid ${state.read ? tone.border : tint(C.violet, 0.24)}`,
      background: `linear-gradient(120deg,${tint(C.violet, 0.07)},rgba(255,255,255,0.02) 60%)`,
    }}>
      <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 })}>
        <div style={R({ gap: 8 })}>
          <div style={{
            width: 22, height: 22, borderRadius: 8, background: tint(C.violet, 0.18),
            border: `1px solid ${tint(C.violet, 0.32)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Brain size={12} color={C.violetL} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.violetL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>{title}</span>
        </div>
        <div style={R({ gap: 8 })}>
          {state.read?.score != null && (
            <span style={pill(tone.bg, tone.fg, { border: `1px solid ${tone.border}`, fontSize: 11, fontWeight: 800 })}>
              {state.read.score}/10 · {band.label}
            </span>
          )}
          {state.read && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 4, display: 'flex' }}
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand read' : 'Collapse read'}
            >
              <ChevronDown size={15} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
            </button>
          )}
        </div>
      </div>

      {/* The deterministic opinion — always on screen, whatever the network is doing. */}
      {fallback && !state.read && <div style={{ marginBottom: 12 }}>{fallback}</div>}

      {state.loading && (
        <div style={R({ gap: 8, color: C.t2, fontSize: 12.5 })}>
          <Loader2 size={14} className="spin" color={C.violetL} />
          Medabrain is reading your actual entries — this takes a few seconds.
        </div>
      )}

      {state.error && !state.loading && (
        <div style={CC({ gap: 8 })}>
          <div style={R({ gap: 8, color: C.t3, fontSize: 12, alignItems: 'flex-start' })}>
            <AlertTriangle size={13} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
            <span>Couldn't reach Medabrain right now — everything above is computed from your own entries and is still accurate.</span>
          </div>
          <div><button style={btnG({ fontSize: 12, padding: '8px 12px' })} onClick={run}><RefreshCw size={12} />Try again</button></div>
        </div>
      )}

      {state.read && !collapsed && (
        <>
          {state.read.headline && (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.55, marginBottom: 12, paddingLeft: 12, borderLeft: `3px solid ${tone.fg}` }}>
              {state.read.headline}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.68 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(state.read.body) }} />
          {fallback && <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>{fallback}</div>}
        </>
      )}

      {!state.loading && (
        <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: state.read || state.error || fallback ? 13 : 0, paddingTop: state.read || state.error || fallback ? 11 : 0, borderTop: state.read ? `1px solid ${C.b1}` : 'none' })}>
          {!state.read && !state.error && (
            <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, flex: 1, minWidth: 200 }}>
              {disabled ? (disabledHint || 'Nothing to read yet.') : (idleHint || 'Medabrain will read every entry word by word and tell you what an admissions reader would think and not say.')}
            </span>
          )}
          {!disabled && (
            <button
              style={btnSm(tint(C.violet, 0.16), {
                color: C.violetL, border: `1px solid ${tint(C.violet, 0.3)}`, fontSize: 12, padding: '8px 12px',
              })}
              onClick={run}
            >
              {state.read ? <><RefreshCw size={12} />Re-read</> : <><Sparkles size={12} />{runLabel}</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// The small, always-present computed opinion list that `fallback` usually
// renders. Shared here so the four call sites can't drift into four styles.
export function InsightList({ insights = [], max = 6 }) {
  if (!insights.length) return null;
  const col = (t) => t === 'good' ? C.green : t === 'warn' ? C.amber : t === 'critical' ? C.rose : C.blue;
  return (
    <div style={CC({ gap: 8 })}>
      {insights.slice(0, max).map((ins, i) => {
        const c = col(ins.tone);
        return (
          <div key={i} style={{ ...R({ gap: 8, alignItems: 'flex-start', padding: '8px 12px' }), borderRadius: 8, background: tint(c, 0.06), border: `1px solid ${tint(c, 0.16)}` }}>
            <span style={{ width: 6, height: 6, borderRadius: 4, background: c, flexShrink: 0, marginTop: 4 }} />
            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}
