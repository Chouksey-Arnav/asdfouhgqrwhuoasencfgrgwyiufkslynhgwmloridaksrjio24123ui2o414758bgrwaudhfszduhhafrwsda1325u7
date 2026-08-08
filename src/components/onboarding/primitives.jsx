// Shared building blocks for the onboarding flow — every step screen is built
// from these so the ~30 screens read as one consistent, polished system
// instead of 30 bespoke layouts. Visual language matches the rest of the app
// (src/lib/theme.js): dark glass surfaces, blue gradient accents.
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import { C, glass, tint, shade, accentGrad, btn as themeBtn } from '../../lib/theme';
import { play } from '../../lib/sounds';

/**
 * One live measurement of the window, shared by the shell and the steps.
 *
 * Every style in this app is an inline object, so there is no stylesheet to put
 * a media query in — the breakpoints have to come from JS. `isWide` is the line
 * where the two-pane layout turns on; below it the flow is a single column that
 * runs edge to edge instead of a 460px letterbox.
 */
// ── The chapter accent, as ambient state ─────────────────────────────────────
// Every screen in a chapter is tinted with that chapter's color: the header
// badge, the selected answers, the Continue button. Threading an `accent` prop
// through a dozen step components and every primitive they use would be a lot
// of plumbing for one value that is constant for the whole screen — so the
// shell sets it once per render and the primitives read it, exactly the way the
// app already treats the palette itself (see the `C` note in src/lib/theme.js).
// It is a render-time default, not state: any component can still pass an
// explicit `accent` and win.
let flowAccent = null;
export const setFlowAccent = (color) => { flowAccent = color || null; };
export const flowAccentColor = () => flowAccent || C.blue;

export function useViewport() {
  const read = () => (typeof window === 'undefined' ? 1024 : window.innerWidth);
  const [w, setW] = useState(read);
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setW(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', onResize); };
  }, []);
  return { width: w, isMobile: w <= 640, isTablet: w > 640 && w < 1040, isWide: w >= 1040 };
}

export function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 480);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    const onChange = () => setM(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return m;
}

/**
 * A question's headline. `emoji` is not decoration — the target user is
 * fifteen, and a screen of plain 14px prose is the thing they close. Every
 * question now leads with a mark that says at a glance what it's about.
 */
export function StepHeader({ eyebrow, title, subtitle, emoji, accent = flowAccentColor(), compact = false }) {
  const { isMobile } = useViewport();
  return (
    <div style={{ marginBottom: compact ? 18 : isMobile ? 22 : 28 }}>
      {emoji && (
        <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          style={{
            width: 52, height: 52, borderRadius: 16, marginBottom: 14, fontSize: 26, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tint(accent, 0.13), border: `1px solid ${tint(accent, 0.24)}`,
          }}>{emoji}</motion.div>
      )}
      {eyebrow && <div style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>}
      <h1 style={{ fontSize: isMobile ? 25 : 30, fontWeight: 800, color: C.t1, margin: '0 0 10px', letterSpacing: '-.03em', fontFamily: C.FD, lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: isMobile ? 14 : 15, color: C.t2, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>{subtitle}</p>}
    </div>
  );
}

/**
 * The primary CTA. It sticks to the bottom of the scroll area rather than
 * sitting at the end of the content: on a grouped screen the answers can run
 * past the fold, and a "Continue" you have to go looking for is a drop-off.
 */
export function ContinueButton({ children = 'Continue', onClick, disabled, variant = 'primary', icon: Icon, hint, accent = flowAccentColor() }) {
  const { isMobile } = useViewport();
  const styles = {
    // accentGrad guarantees the fill is dark enough to carry C.onAccent, which
    // a raw amber or rose chapter accent is not.
    primary: { background: accentGrad(accent), color: C.onAccent, border: 'none', shadow: `0 10px 30px ${tint(accent, 0.35)}` },
    ghost: { background: 'transparent', color: C.t2, border: `1px solid ${C.b2}`, shadow: 'none' },
    dark: { background: C.s2, color: C.t1, border: `1px solid ${C.b1}`, shadow: 'none' },
  }[variant];
  return (
    <div style={{
      position: 'sticky', bottom: 0, marginTop: 'auto', paddingTop: 16,
      paddingBottom: isMobile ? 16 : 24,
      background: `linear-gradient(to top, ${C.bg} 0%, ${C.bg} 68%, transparent 100%)`,
    }}>
      <motion.button
        data-testid="onboarding-cta"
        whileHover={!disabled ? { scale: 1.012 } : {}}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        disabled={disabled}
        onClick={() => { if (disabled) return; play('click'); onClick?.(); }}
        style={{
          width: '100%', padding: '17px 20px', borderRadius: 15, cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? C.s3 : styles.background, color: disabled ? C.t3 : styles.color, border: styles.border,
          fontWeight: 700, fontSize: 15.5, fontFamily: C.FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: disabled ? 'none' : styles.shadow, transition: 'box-shadow .2s,background .2s', letterSpacing: '.01em',
        }}>
        {children}{Icon && <Icon size={16} />}
      </motion.button>
      {hint && <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, margin: '10px 0 0' }}>{hint}</p>}
    </div>
  );
}

export function TextLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 13, cursor: 'pointer', fontFamily: C.FB, textAlign: 'center', width: '100%', padding: '14px 0 0' }}>
      {children}
    </button>
  );
}

/**
 * A single-select answer.
 *
 * The emoji tile on the left is the cheapest, most reliable way to give a
 * question visual interest: it renders from the system font, needs no network
 * (this is an offline-capable PWA), and reads instantly at any size. Options
 * without an emoji fall back to the old icon slot and look exactly as before.
 */
export function OptionRow({ selected, onClick, icon, emoji, label, sublabel, dots, accent = flowAccentColor() }) {
  const onAcc = C.onAccent || '#fff';
  return (
    <motion.button data-testid="onboarding-option" whileTap={{ scale: 0.97 }} whileHover={selected ? {} : { x: 3 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
        borderRadius: 15, cursor: 'pointer',
        background: selected ? accentGrad(accent) : C.surf,
        border: `1px solid ${selected ? 'transparent' : C.b1}`,
        boxShadow: selected ? `0 10px 26px ${tint(accent, 0.32)}` : C.shadowSm,
        transition: 'background .18s,box-shadow .18s,border-color .18s',
      }}>
      {emoji && (
        <span style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0, fontSize: 21, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: selected ? 'rgba(255,255,255,0.18)' : tint(accent, 0.12),
          border: `1px solid ${selected ? 'rgba(255,255,255,0.22)' : tint(accent, 0.16)}`,
        }}>{emoji}</span>
      )}
      {dots != null && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < dots ? (selected ? onAcc : accent) : (selected ? 'rgba(255,255,255,0.35)' : C.t4) }} />)}
        </div>
      )}
      {icon && !emoji && <span style={{ display: 'flex', flexShrink: 0, color: selected ? onAcc : C.t2 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: selected ? onAcc : C.t1, fontFamily: C.FB, lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.82)' : C.t3, marginTop: 3, lineHeight: 1.4 }}>{sublabel}</div>}
      </span>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${selected ? 'rgba(255,255,255,0.85)' : C.b3}`, background: selected ? 'rgba(255,255,255,0.9)' : 'transparent',
      }}>
        {selected && <Check size={12} color={shade(accent, 0.3)} strokeWidth={3.5} />}
      </span>
    </motion.button>
  );
}

export function IconOptionRow({ selected, onClick, iconBg, icon, label, accent = flowAccentColor() }) {
  return (
    <motion.button data-testid="onboarding-option" whileTap={{ scale: 0.96 }} whileHover={selected ? {} : { y: -2 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderRadius: 13, cursor: 'pointer',
        background: selected ? tint(accent, 0.12) : C.surf,
        border: `1px solid ${selected ? accent : C.b1}`,
      }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.t1, flex: 1, minWidth: 0 }}>{label}</span>
      {selected && <Check size={16} color={accent} />}
    </motion.button>
  );
}

/** A multi-select answer. Same emoji treatment as OptionRow, with a checkbox. */
export function CheckRow({ checked, onClick, label, sublabel, emoji, accent = flowAccentColor() }) {
  return (
    <motion.button data-testid="onboarding-option" whileTap={{ scale: 0.97 }} whileHover={checked ? {} : { x: 3 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderRadius: 15, cursor: 'pointer',
        background: checked ? tint(accent, 0.13) : C.surf,
        border: `1px solid ${checked ? accent : C.b1}`,
        boxShadow: checked ? `0 6px 18px ${tint(accent, 0.18)}` : C.shadowSm,
        transition: 'background .18s,border-color .18s,box-shadow .18s',
      }}>
      <span style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? accentGrad(accent) : 'transparent', border: `1.5px solid ${checked ? 'transparent' : C.b3}`,
      }}>{checked && <Check size={13} color={C.onAccent || '#fff'} strokeWidth={3} />}</span>
      {emoji && <span style={{ fontSize: 19, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>{sublabel}</div>}
      </span>
    </motion.button>
  );
}

export function ToggleSwitch({ checked, onChange }) {
  return (
    <button onClick={() => { play('click'); onChange(!checked); }}
      style={{
        width: 46, height: 27, borderRadius: 14, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? C.blueGrad : C.s3, position: 'relative', transition: 'background .2s', padding: 0,
      }}>
      <motion.span animate={{ x: checked ? 20 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{ position: 'absolute', top: 3, left: 0, width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

export function SegmentToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: C.s1, borderRadius: 11, padding: 3, border: `1px solid ${C.b1}` }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => { play('click'); onChange(opt.value); }}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: value === opt.value ? C.s3 : 'transparent', color: value === opt.value ? C.t1 : C.t3,
            fontWeight: 700, fontSize: 13, fontFamily: C.FB, transition: 'background .15s,color .15s',
          }}>{opt.label}</button>
      ))}
    </div>
  );
}

// Scroll-snap "wheel" picker — approximates a native iOS picker wheel using a
// single vertical scroll list; the center row is the selected value.
export function WheelColumn({ items, index, onChange, width = 108, itemH = 42, visibleRows = 5, mono }) {
  const ref = useRef(null);
  const pad = Math.floor(visibleRows / 2);
  const isInternalScroll = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isInternalScroll.current) return;
    el.scrollTop = index * itemH;
  }, [index, itemH]);

  function handleScroll() {
    isInternalScroll.current = true;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / itemH)));
      el.scrollTo({ top: i * itemH, behavior: 'smooth' });
      if (i !== index) { onChange(i); play('click'); }
      setTimeout(() => { isInternalScroll.current = false; }, 200);
    }, 100);
  }

  return (
    <div style={{ position: 'relative', width, height: itemH * visibleRows }}>
      <div style={{
        position: 'absolute', top: itemH * pad, left: 0, right: 0, height: itemH,
        background: C.blueDim, border: `1px solid ${C.b2}`, borderRadius: 10, pointerEvents: 'none', zIndex: 0,
      }} />
      <div ref={ref} onScroll={handleScroll}
        style={{
          position: 'relative', zIndex: 1, height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          maskImage: `linear-gradient(to bottom, transparent 0, black ${itemH * 0.6}px, black calc(100% - ${itemH * 0.6}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0, black ${itemH * 0.6}px, black calc(100% - ${itemH * 0.6}px), transparent 100%)`,
        }}>
        <div style={{ height: itemH * pad }} />
        {items.map((it, i) => (
          <div key={i} style={{
            height: itemH, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center',
            fontSize: i === index ? 17 : 14.5, fontWeight: i === index ? 800 : 500,
            color: i === index ? C.t1 : C.t4, fontFamily: mono ? C.FM : C.FB, transition: 'color .15s,font-size .15s',
          }}>{it}</div>
        ))}
        <div style={{ height: itemH * pad }} />
      </div>
    </div>
  );
}

// Animated count-up for headline numbers — the moment a stat "lands" is what
// makes the proof screens feel alive instead of static marketing copy.
export function useCountUp(target, { duration = 1200, delay = 300 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf; let start = null; let started = false;
    const timer = setTimeout(() => { started = true; raf = requestAnimationFrame(tick); }, delay);
    function tick(ts) {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    return () => { clearTimeout(timer); if (started) cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return val;
}

// Hand-rolled animated line chart for the proof/projection screens —
// deliberately lightweight (no chart.js). Upgraded from a bare polyline to a
// full "moment": glow-filtered gradient strokes, a slow area sweep, labeled
// milestone checkpoints, endpoint value badges with the student's REAL scores,
// and a pulsing end dot. All new props are optional so old call sites render
// unchanged.
//   lines: [{ points:[0..1], color, width, fill, dashed, endDot, glow }]
//   milestones: [{ f: 0..1 along line 0, score, label }]
//   startLabel/endLabel: value badges anchored to line 0's endpoints
export function MiniLineChart({ width = 380, height = 150, lines, xLabels, milestones, startLabel, endLabel }) {
  const pad = 14, padTop = startLabel || endLabel ? 30 : 14, padBottom = xLabels ? 22 : 14;
  const w = width - pad * 2, h = height - padTop - padBottom;
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const ptsOf = (ln) => ln.points.map((p, i) => [pad + (w * i) / (ln.points.length - 1), padTop + h * (1 - p)]);
  // Interpolate a point at fraction f along a line's polyline for milestones.
  const at = (pts, f) => {
    const x = pad + w * f;
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1);
        return [x, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      }
    }
    return pts[pts.length - 1];
  };
  const main = lines[0] ? ptsOf(lines[0]) : null;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {lines.map((ln, i) => ln.fill && (
          <linearGradient key={`f${i}`} id={`msp-${uid}-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ln.color} stopOpacity="0.38" />
            <stop offset="100%" stopColor={ln.color} stopOpacity="0" />
          </linearGradient>
        ))}
        {lines.map((ln, i) => (
          <linearGradient key={`s${i}`} id={`msp-${uid}-stroke-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ln.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={ln.color} stopOpacity="1" />
          </linearGradient>
        ))}
        <filter id={`msp-${uid}-glow`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={pad} x2={width - pad} y1={padTop + h * f} y2={padTop + h * f} stroke={C.b0} strokeWidth={1} />
      ))}
      <line x1={pad} x2={width - pad} y1={padTop + h} y2={padTop + h} stroke={C.b1} strokeWidth={1} />
      {lines.map((ln, li) => {
        const pts = ptsOf(ln);
        const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
        const area = `${d} L${pts[pts.length - 1][0]},${padTop + h} L${pts[0][0]},${padTop + h} Z`;
        return (
          <g key={li}>
            {ln.fill && <motion.path d={area} fill={`url(#msp-${uid}-grad-${li})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />}
            <motion.path d={d} fill="none" stroke={`url(#msp-${uid}-stroke-${li})`} strokeWidth={ln.width || 2.5} strokeLinecap="round" strokeDasharray={ln.dashed ? '5 5' : undefined}
              filter={ln.glow !== false && !ln.dashed ? `url(#msp-${uid}-glow)` : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 + li * 0.2 }} />
            {ln.endDot && (
              <g>
                <motion.circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5.5} fill={ln.color}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3 + li * 0.2, type: 'spring', stiffness: 400 }} />
                <motion.circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5.5} fill="none" stroke={ln.color} strokeWidth={1.5}
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0], scale: [1, 2.4] }}
                  transition={{ delay: 1.5, duration: 1.8, repeat: Infinity, ease: 'easeOut' }} style={{ transformOrigin: `${pts[pts.length - 1][0]}px ${pts[pts.length - 1][1]}px` }} />
              </g>
            )}
          </g>
        );
      })}
      {main && milestones && milestones.map((m, i) => {
        const [mx, my] = at(main, m.f);
        return (
          <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 + i * 0.25, type: 'spring', stiffness: 320 }} style={{ transformOrigin: `${mx}px ${my}px` }}>
            <circle cx={mx} cy={my} r={4} fill={C.bg} stroke={lines[0].color} strokeWidth={2} />
            {m.score != null && <text x={mx} y={my - 11} fontSize="10.5" fontWeight="800" fill={C.t1} fontFamily={C.FM} textAnchor="middle">{m.score}</text>}
            {m.label && <text x={mx} y={padTop + h + 14} fontSize="9" fill={C.t3} fontFamily={C.FB} textAnchor="middle">{m.label}</text>}
          </motion.g>
        );
      })}
      {main && startLabel && (
        <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <text x={main[0][0]} y={main[0][1] - 12} fontSize="12" fontWeight="800" fill={C.t2} fontFamily={C.FM} textAnchor="start">{startLabel}</text>
        </motion.g>
      )}
      {main && endLabel && (
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.45, type: 'spring', stiffness: 300 }}
          style={{ transformOrigin: `${main[main.length - 1][0]}px ${main[main.length - 1][1]}px` }}>
          <rect x={main[main.length - 1][0] - 46} y={main[main.length - 1][1] - 30} width={46} height={20} rx={10} fill={lines[0].color} />
          <text x={main[main.length - 1][0] - 23} y={main[main.length - 1][1] - 16} fontSize="11.5" fontWeight="800" fill="#fff" fontFamily={C.FM} textAnchor="middle">{endLabel}</text>
        </motion.g>
      )}
      {xLabels && xLabels.map((lbl, i) => (
        <text key={i} x={i === 0 ? pad : width - pad} y={height - 2} fontSize="10" fill={C.t4} fontFamily={C.FB} textAnchor={i === 0 ? 'start' : 'end'}>{lbl}</text>
      ))}
    </svg>
  );
}

// Horizontal comparison bars ("you vs. typical student") with animated grow-in
// and a shine sweep on the highlighted bar — used by the insight screens.
export function CompareBars({ bars }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {bars.map((b, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: b.highlight ? C.t1 : C.t3 }}>{b.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: b.highlight ? C.blueL : C.t3, fontFamily: C.FM }}>{Math.round(b.pct * 100)}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 6, background: C.s2, overflow: 'hidden', position: 'relative' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct * 100}%` }}
              transition={{ delay: 0.35 + i * 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%', borderRadius: 6, position: 'relative', overflow: 'hidden',
                background: b.highlight ? C.blueGrad : C.s4,
                boxShadow: b.highlight ? `0 0 14px ${C.blue}60` : 'none',
              }}>
              {b.highlight && (
                <motion.span initial={{ x: '-110%' }} animate={{ x: '240%' }} transition={{ delay: 1.3, duration: 1, ease: 'easeInOut' }}
                  style={{ position: 'absolute', top: 0, bottom: 0, width: '45%', background: 'linear-gradient(105deg,transparent,rgba(255,255,255,0.35),transparent)' }} />
              )}
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RadialRing({ pct, size = 92, stroke = 9, color = C.blue, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.s3} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

export function Card({ children, style }) {
  return <div style={glass({ padding: 20, ...style })}>{children}</div>;
}

export { C, glass, tint, shade, accentGrad, ChevronLeft };
