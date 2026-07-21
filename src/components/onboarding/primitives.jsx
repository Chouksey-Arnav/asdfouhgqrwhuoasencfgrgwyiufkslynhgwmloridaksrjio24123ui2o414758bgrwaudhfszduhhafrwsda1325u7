// Shared building blocks for the onboarding flow — every step screen is built
// from these so the ~30 screens read as one consistent, polished system
// instead of 30 bespoke layouts. Visual language matches the rest of the app
// (src/lib/theme.js): dark glass surfaces, blue gradient accents.
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import { C, glass, btn as themeBtn } from '../../lib/theme';
import { play } from '../../lib/sounds';

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

export function StepHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {eyebrow && <div style={{ fontSize: 11, fontWeight: 700, color: C.blueL, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 26, fontWeight: 800, color: C.t1, margin: '0 0 10px', letterSpacing: '-.03em', fontFamily: C.FD, lineHeight: 1.25 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

export function ContinueButton({ children = 'Continue', onClick, disabled, variant = 'primary', icon: Icon }) {
  const styles = {
    primary: { background: C.blueGrad, color: '#fff', border: 'none', shadow: '0 10px 30px rgba(45,127,255,0.35)' },
    ghost: { background: 'transparent', color: C.t2, border: `1px solid ${C.b2}`, shadow: 'none' },
    dark: { background: C.s2, color: C.t1, border: `1px solid ${C.b1}`, shadow: 'none' },
  }[variant];
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.012 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      disabled={disabled}
      onClick={() => { if (disabled) return; play('click'); onClick?.(); }}
      style={{
        width: '100%', padding: '16px 20px', borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? C.s3 : styles.background, color: disabled ? C.t3 : styles.color, border: styles.border,
        fontWeight: 700, fontSize: 15, fontFamily: C.FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: disabled ? 'none' : styles.shadow, transition: 'box-shadow .2s,background .2s', letterSpacing: '.01em',
      }}>
      {children}{Icon && <Icon size={16} />}
    </motion.button>
  );
}

export function TextLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 13, cursor: 'pointer', fontFamily: C.FB, textAlign: 'center', width: '100%', padding: '14px 0 0' }}>
      {children}
    </button>
  );
}

export function OptionRow({ selected, onClick, icon, label, sublabel, dots }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
        borderRadius: 14, cursor: 'pointer', marginBottom: 10,
        background: selected ? C.blueGrad : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'transparent' : C.b1}`,
        boxShadow: selected ? '0 8px 24px rgba(45,127,255,0.30)' : 'none',
        transition: 'background .18s,box-shadow .18s',
      }}>
      {dots != null && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < dots ? (selected ? '#fff' : C.blueL) : (selected ? 'rgba(255,255,255,0.35)' : C.t4) }} />)}
        </div>
      )}
      {icon && <span style={{ display: 'flex', flexShrink: 0, color: selected ? '#fff' : C.t2 }}>{icon}</span>}
      <span style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: selected ? '#fff' : C.t1, fontFamily: C.FB }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : C.t3, marginTop: 2 }}>{sublabel}</div>}
      </span>
    </motion.button>
  );
}

export function IconOptionRow({ selected, onClick, iconBg, icon, label }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px',
        borderRadius: 13, cursor: 'pointer', marginBottom: 8,
        background: selected ? C.blueDim : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? C.blue : C.b1}`,
      }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.t1, flex: 1 }}>{label}</span>
      {selected && <Check size={16} color={C.blueL} />}
    </motion.button>
  );
}

export function CheckRow({ checked, onClick, label, sublabel }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} onClick={() => { play('select'); onClick(); }}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px',
        borderRadius: 13, cursor: 'pointer', marginBottom: 9,
        background: checked ? C.blueDim : 'rgba(255,255,255,0.03)',
        border: `1px solid ${checked ? C.blue : C.b1}`,
      }}>
      <span style={{
        width: 21, height: 21, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? C.blueGrad : 'transparent', border: `1.5px solid ${checked ? 'transparent' : C.b3}`,
      }}>{checked && <Check size={13} color="#fff" strokeWidth={3} />}</span>
      <span style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11.5, color: C.t3, marginTop: 1 }}>{sublabel}</div>}
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

// Small hand-rolled animated line chart used for the illustrative social-proof
// / progress graphs — deliberately lightweight (no chart.js) since these are
// decorative marketing graphics, not real data visualizations.
export function MiniLineChart({ width = 380, height = 150, lines, xLabels }) {
  const pad = 12;
  const w = width - pad * 2, h = height - pad * 2;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        {lines.map((ln, i) => ln.fill && (
          <linearGradient key={i} id={`msp-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ln.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={ln.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={pad} x2={width - pad} y1={pad + h * f} y2={pad + h * f} stroke={C.b0} strokeWidth={1} />
      ))}
      {lines.map((ln, li) => {
        const pts = ln.points.map((p, i) => [pad + (w * i) / (ln.points.length - 1), pad + h * (1 - p)]);
        const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
        const area = `${d} L${pts[pts.length - 1][0]},${pad + h} L${pts[0][0]},${pad + h} Z`;
        return (
          <g key={li}>
            {ln.fill && <motion.path d={area} fill={`url(#msp-grad-${li})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} />}
            <motion.path d={d} fill="none" stroke={ln.color} strokeWidth={ln.width || 2.5} strokeLinecap="round" strokeDasharray={ln.dashed ? '5 5' : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: li * 0.15 }} />
            {ln.endDot && (
              <motion.circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5} fill={ln.color}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1 + li * 0.15, type: 'spring', stiffness: 400 }} />
            )}
          </g>
        );
      })}
      {xLabels && xLabels.map((lbl, i) => (
        <text key={i} x={i === 0 ? pad : width - pad} y={height - 2} fontSize="10" fill={C.t4} fontFamily={C.FB} textAnchor={i === 0 ? 'start' : 'end'}>{lbl}</text>
      ))}
    </svg>
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

export { C, glass, ChevronLeft };
