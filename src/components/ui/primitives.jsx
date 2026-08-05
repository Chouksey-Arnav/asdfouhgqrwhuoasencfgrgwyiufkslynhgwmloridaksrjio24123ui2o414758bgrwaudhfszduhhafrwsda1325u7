// Small display primitives lifted out of App.jsx so standalone panels can use
// them without importing the 480 KB monolith. App.jsx now imports these too,
// so there is exactly one definition of each.
//
// Behavior is unchanged from the originals — the only difference is that they
// take their tokens from src/lib/theme.js rather than App.jsx's local copy of
// the same palette (the two were byte-identical).
import React, { useState, useEffect } from 'react';
import { C, glass, R } from '../../lib/theme';

/**
 * Matches a CSS media query reactively. The app's mobile breakpoint is
 * '(max-width: 768px)'. Previously copy-pasted into App.jsx and
 * ScoreTrackerPanel.jsx; both now import this.
 */
// Initialised synchronously from matchMedia rather than starting at `false` and
// correcting in the effect. The old version made every phone paint one frame of
// the desktop layout before snapping to mobile — harmless for a grid column
// count, very visible for anything `position: fixed` (the SAT calculator /
// formula rail flips from the desktop left edge to the mobile bottom corner).
export function useMediaQuery(query) {
  const read = () => (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(query).matches
    : false);
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    const m = window.matchMedia(query);
    // Re-read on (re)subscribe: the query may have changed, or the viewport may
    // have moved between the initial render and this effect running.
    setMatches(m.matches);
    const l = (e) => setMatches(e.matches);
    m.addEventListener('change', l);
    return () => m.removeEventListener('change', l);
  }, [query]);
  return matches;
}

/** Convenience wrapper for the app-wide mobile breakpoint. */
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');

/** Circular progress gauge with a glowing stroke and optional center label. */
export function Arc({ pct = 0, size = 52, stroke = 4, color = C.blue, label = '', sub = '' }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.s4} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)', filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size > 60 ? 14 : 10, fontWeight: 700, color, fontFamily: C.FM, lineHeight: 1 }}>{label}</span>
          {sub && <span style={{ fontSize: 9, color: C.t3, lineHeight: 1, marginTop: 1 }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

/** Horizontal progress bar. */
export function Bar({ pct = 0, color = C.blue, h = 4, glow = false }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,0.06)', borderRadius: h, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color,
        borderRadius: h, transition: 'width .6s cubic-bezier(.16,1,.3,1)',
        boxShadow: glow ? `0 0 10px ${color}45` : undefined,
      }} />
    </div>
  );
}

/** Large gradient-number stat card. */
export function Stat({ label, value, icon, color = C.blue, sub, onClick, m = false }) {
  return (
    <div onClick={onClick} style={{ ...glass({ padding: m ? 16 : 20 }), position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : undefined, transition: 'all .2s' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={R({ gap: m ? 10 : 12, alignItems: 'flex-start' })}>
        <div style={{ width: m ? 32 : 36, height: m ? 32 : 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, boxShadow: `0 4px 12px ${color}20` }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: m ? 20 : 26, fontWeight: 800, fontFamily: C.FM, lineHeight: 1, marginBottom: 4, background: `linear-gradient(135deg,${color},${color}aa)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
          <div style={{ fontSize: m ? 11 : 12, color: C.t2, fontWeight: 600 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}
