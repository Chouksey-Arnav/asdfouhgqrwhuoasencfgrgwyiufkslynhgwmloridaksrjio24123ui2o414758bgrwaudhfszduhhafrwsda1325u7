// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for the onboarding flow.
//
// Every screen composes from these, so the flow reads as one system rather than
// thirty layouts that happen to share a font. The visual language they
// implement is written down in design.js; this file is where it becomes pixels.
//
// ── What changed in the redesign, and why ────────────────────────────────────
//  • Emoji are gone. Every mark is an icon from icons.jsx drawn on one grid at
//    one stroke weight, sitting in an "icon plate" that takes the chapter's
//    color when idle and inverts to white when the answer is chosen. An emoji
//    can do neither, which is why a screen of them never looks selected — it
//    looks like stickers on a form.
//  • A chapter is a HUE PAIR, not a color, and it is ambient rather than
//    threaded: the shell publishes it once per render and every primitive reads
//    it. Selection, focus, the button, the plate, the wheel band and the
//    progress bar are all the same two hues, so a screen is visibly one thing.
//  • Data is set in mono and tracked out. Counters, minutes, chapter numerals
//    and every "n of m" read as instrument output, which is most of the
//    difference between a form and an interface.
//  • Single-select fills; multi-select tints. That is a deliberate grammar: a
//    filled row means "this is the answer", a tinted row means "this is one of
//    the answers", and the student learns it on screen one without being told.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, ArrowRight } from 'lucide-react';
import { C, glass, tint, shade, accentGrad, btn as themeBtn } from '../../lib/theme';
import { play } from '../../lib/sounds';
import { Icon } from './icons';
import {
  hue, chapterHue, R, EASE, GLIDE, GLIDE_FAST, POP, SETTLE, step,
  meta, display, body, numeral, panel, lit, focusRing,
} from './design';

// ── The chapter hue, as ambient state ────────────────────────────────────────
// Threading two colors through a dozen step components and every primitive they
// use would be a lot of plumbing for one value that is constant for the whole
// screen — so the shell sets it once per render and the primitives read it,
// exactly the way the app already treats the palette itself (see the `C` note
// in src/lib/theme.js). It is a render-time default, not state: any component
// can still pass an explicit `hue` and win.
let flowHueValue = null;
export const setFlowHue = (h) => { flowHueValue = h || null; };
export const flowHue = () => flowHueValue || hue(['blue', 'indigo']);

// Back-compat for the handful of call sites that only ever wanted one color.
export const setFlowAccent = (color) => { flowHueValue = color ? hue(color) : null; };
export const flowAccentColor = () => flowHue().base;

/**
 * One live measurement of the window, shared by the shell and the steps.
 *
 * Every style in this app is an inline object, so there is no stylesheet to put
 * a media query in — the breakpoints have to come from JS. `isWide` is the line
 * where the two-pane layout turns on; below it the flow is a single column that
 * runs edge to edge instead of a 460px letterbox.
 */
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

/** True when the visitor has asked the OS to cut animation. Respected by the
 *  flow's ambient motion — the looping traces and drifting orbs, not the
 *  functional transitions, which stay so the UI never appears frozen. */
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => setR(mq.matches);
      on();
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch { return undefined; }
  }, []);
  return r;
}

// ── Keyboard-only focus ──────────────────────────────────────────────────────
// `:focus-visible` is the right tool and it is unavailable here: this codebase
// has no stylesheet to put a pseudo-class in (see the header of
// src/lib/theme.js), and every style is an inline object. Reacting to plain
// `onFocus` instead puts a 4px ring around every answer the moment it is
// CLICKED, which is noise for the mouse user the ring was never for.
//
// So the modality is tracked once, globally: a Tab/arrow keypress means we are
// in keyboard mode, any pointer press means we are not. Components ask
// `useKeyboardMode()` and only paint the ring when both it and their own focus
// state are true.
let keyboardMode = false;
const modeListeners = new Set();
const setMode = (v) => { if (v !== keyboardMode) { keyboardMode = v; modeListeners.forEach(fn => fn(v)); } };
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') setMode(true);
  }, true);
  window.addEventListener('pointerdown', () => setMode(false), true);
}

export function useKeyboardMode() {
  const [on, setOn] = useState(keyboardMode);
  useEffect(() => {
    modeListeners.add(setOn);
    setOn(keyboardMode);
    return () => { modeListeners.delete(setOn); };
  }, []);
  return on;
}

/** `focused && keyboard` → the ring style, otherwise nothing. */
function useRing(focused, g) {
  const kb = useKeyboardMode();
  return focused && kb ? focusRing(g) : null;
}

// ── Small type pieces ────────────────────────────────────────────────────────

/** The tracked-out label above a heading, with the chapter's rule in front. */
export function Kicker({ children, h = null, style }) {
  const g = h || flowHue();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ width: 18, height: 2, borderRadius: 4, background: g.bar, flexShrink: 0 }} />
      <span style={meta(10, { color: g.ink })}>{children}</span>
    </span>
  );
}

/** A hairline that fades out — used to close a block without drawing a box. */
export function Rule({ h = null, width = '100%', style }) {
  const g = h || flowHue();
  return <div style={{ height: 1, width, background: `linear-gradient(90deg, ${g.edge}, transparent)`, ...style }} />;
}

/** A small mono readout: `Q3 / 10`, `40 MIN`, `02`. */
export function DataChip({ children, h = null, tone: t = 'soft', style }) {
  const g = h || flowHue();
  const solid = t === 'solid';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: R.xs,
      background: solid ? g.grad : g.soft,
      border: `1px solid ${solid ? 'transparent' : g.edgeSoft}`,
      boxShadow: solid ? lit(0.18) : 'none',
      ...meta(9.5, { color: solid ? g.onFill : g.ink, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }),
      ...style,
    }}>{children}</span>
  );
}

// ── The icon plate ───────────────────────────────────────────────────────────

/**
 * The square an option's mark sits in.
 *
 * Idle it is a soft wash of the chapter hue with a hairline; selected it
 * inverts to translucent white on the filled row. That inversion is the single
 * most important detail in the flow's selection design — it is what makes a
 * chosen answer read as *lit up* rather than merely recolored, and it is only
 * possible because the marks are strokes that inherit `currentColor`.
 */
export function IconPlate({ name, meter, selected, h = null, size = 40, radius = R.sm }) {
  const g = h || flowHue();
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? 'rgba(255,255,255,0.18)' : g.soft,
      border: `1px solid ${selected ? 'rgba(255,255,255,0.26)' : g.edgeSoft}`,
      color: selected ? g.onFill : g.ink,
      transition: 'background .18s, border-color .18s, color .18s',
    }}>
      {meter != null
        ? <MeterBars level={meter} of={4} tone={selected ? 'onFill' : 'hue'} h={g} />
        : <Icon name={name} size={Math.round(size * 0.5)} stroke={1.6} />}
    </span>
  );
}

/**
 * A four-bar level, used where the options are a ranked scale rather than a set
 * of alternatives (today: the GPA question). Five differently-worded sublabels
 * cannot be compared at a glance; four bars can.
 */
export function MeterBars({ level = 0, of = 4, h = null, tone: t = 'hue', height = 18 }) {
  const g = h || flowHue();
  const on = t === 'onFill' ? g.onFill : g.ink;
  const off = t === 'onFill' ? 'rgba(255,255,255,0.30)' : tint(g.from, 0.28);
  return (
    <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height }} aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 4,
          height: `${38 + (i / (of - 1)) * 62}%`,
          background: i < level ? on : off,
          transition: 'background .18s',
        }} />
      ))}
    </span>
  );
}

// ── Headings ─────────────────────────────────────────────────────────────────

/**
 * A question's headline.
 *
 * `icon` is a name from icons.jsx and replaces the emoji tile this component
 * used to render. It sits inline with the kicker rather than stacked above it:
 * the flow's screens are tall and the old 52px block above every heading was
 * pushing the first answer under the fold on a phone for no informational gain.
 */
export function StepHeader({ eyebrow, title, subtitle, icon, h = null, compact = false }) {
  const { isMobile } = useViewport();
  const g = h || flowHue();
  return (
    <div style={{ marginBottom: compact ? 18 : isMobile ? 22 : 26 }}>
      {(icon || eyebrow) && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={GLIDE_FAST}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {icon && (
            <span style={{
              width: 34, height: 34, borderRadius: R.sm, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: g.soft, border: `1px solid ${g.edgeSoft}`, color: g.ink,
            }}>
              <Icon name={icon} size={18} />
            </span>
          )}
          {eyebrow && <Kicker h={g}>{eyebrow}</Kicker>}
        </motion.div>
      )}
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GLIDE, delay: 0.04 }}
        style={display(isMobile ? 25 : 30, { color: C.t1, margin: '0px 0px 8px' })}>
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...GLIDE, delay: 0.1 }}
          style={body(isMobile ? 13.5 : 14.5, { margin: 0, maxWidth: 540 })}>
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

// ── The primary action ───────────────────────────────────────────────────────

/**
 * The CTA. It sticks to the bottom of the scroll area rather than sitting at
 * the end of the content: on a grouped screen the answers can run past the
 * fold, and a "Continue" you have to go looking for is a drop-off.
 */
export function ContinueButton({ children = 'Continue', onClick, disabled, variant = 'primary', icon: IconCmp, hint, h = null, accent }) {
  const { isMobile } = useViewport();
  const g = h || (accent ? hue(accent) : flowHue());
  const styles = {
    primary: { background: g.grad, color: g.onFill, border: 'none', shadow: `${g.glow}, ${lit(0.18)}` },
    ghost: { background: 'transparent', color: C.t2, border: `1px solid ${C.b2}`, shadow: 'none' },
    dark: { background: C.s2, color: C.t1, border: `1px solid ${C.b1}`, shadow: 'none' },
  }[variant];
  return (
    <div style={{
      position: 'sticky', bottom: 0, marginTop: 'auto', paddingTop: 16,
      paddingBottom: isMobile ? 16 : 24,
      background: `linear-gradient(to top, ${C.bg} 0%, ${C.bg} 66%, transparent 100%)`,
    }}>
      <motion.button
        data-testid="onboarding-cta"
        whileHover={!disabled ? { y: -1.5 } : {}}
        whileTap={!disabled ? { scale: 0.985 } : {}}
        transition={POP}
        disabled={disabled}
        onClick={() => { if (disabled) return; play('click'); onClick?.(); }}
        style={{
          position: 'relative', overflow: 'hidden',
          width: '100%', padding: '16px 20px', borderRadius: R.md, cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? C.s3 : styles.background, color: disabled ? C.t3 : styles.color, border: styles.border,
          fontWeight: 700, fontSize: 15, fontFamily: C.FB, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: disabled ? 'none' : styles.shadow,
          transition: 'box-shadow .2s, background .25s, color .2s',
        }}>
        <span>{children}</span>
        {IconCmp
          ? <IconCmp size={16} />
          : (variant === 'primary' && !disabled && <ArrowRight size={16} strokeWidth={2.4} style={{ opacity: 0.9 }} />)}
      </motion.button>
      {hint && <p style={{ textAlign: 'center', fontSize: 11.5, color: C.t4, margin: '8px 0px 0px' }}>{hint}</p>}
    </div>
  );
}

export function TextLink({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: C.t3, fontSize: 13, cursor: 'pointer',
      fontFamily: C.FB, textAlign: 'center', width: '100%', padding: '12px 0px 0px',
      textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: C.b3,
    }}>
      {children}
    </button>
  );
}

// ── Answers ──────────────────────────────────────────────────────────────────

/** Shared hover/press behaviour so every answer in the flow feels identical. */
const answerMotion = (selected) => ({
  whileHover: selected ? {} : { y: -2 },
  whileTap: { scale: 0.985 },
  transition: POP,
});

/**
 * A single-select answer. Chosen answers FILL with the chapter gradient — see
 * the grammar note at the top of this file.
 */
export function OptionRow({ selected, onClick, icon, meter, label, sublabel, dots, h = null, accent }) {
  const g = h || (accent ? hue(accent) : flowHue());
  const [focused, setFocused] = useState(false);
  const ring = useRing(focused, g);
  return (
    <motion.button data-testid="onboarding-option" {...answerMotion(selected)}
      onClick={() => { play('select'); onClick(); }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      aria-pressed={!!selected}
      style={{
        position: 'relative', width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
        borderRadius: R.md, cursor: 'pointer', fontFamily: C.FB,
        background: selected ? g.grad : C.surf,
        border: `1px solid ${selected ? 'transparent' : C.b1}`,
        boxShadow: selected ? `${g.glowSm}, ${lit(0.16)}` : C.shadowSm,
        transition: 'background .2s, box-shadow .2s, border-color .2s',
        ...ring,
      }}>
      {(icon || meter != null) && <IconPlate name={icon} meter={meter} selected={selected} h={g} />}

      {dots != null && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < dots ? (selected ? g.onFill : g.ink) : (selected ? 'rgba(255,255,255,0.35)' : C.t4),
            }} />
          ))}
        </div>
      )}

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: selected ? g.onFill : C.t1, lineHeight: 1.3 }}>{label}</span>
        {sublabel && (
          <span style={{ display: 'block', fontSize: 12, color: selected ? 'rgba(255,255,255,0.84)' : C.t3, marginTop: 4, lineHeight: 1.45 }}>{sublabel}</span>
        )}
      </span>

      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${selected ? 'rgba(255,255,255,0.9)' : C.b3}`,
        background: selected ? 'rgba(255,255,255,0.94)' : 'transparent',
        transition: 'background .18s, border-color .18s',
      }}>
        {selected && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={POP} style={{ display: 'flex' }}>
            <Check size={12} color={shade(g.from, 0.34)} strokeWidth={3.5} />
          </motion.span>
        )}
      </span>
    </motion.button>
  );
}

/**
 * A multi-select answer. Chosen answers TINT rather than fill, so a screen with
 * four of six picked stays readable instead of becoming a wall of color.
 */
export function CheckRow({ checked, onClick, label, sublabel, icon, h = null, accent }) {
  const g = h || (accent ? hue(accent) : flowHue());
  const [focused, setFocused] = useState(false);
  const ring = useRing(focused, g);
  return (
    <motion.button data-testid="onboarding-option" {...answerMotion(checked)}
      onClick={() => { play('select'); onClick(); }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      aria-pressed={!!checked}
      style={{
        position: 'relative', width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
        borderRadius: R.md, cursor: 'pointer', fontFamily: C.FB,
        background: checked ? `linear-gradient(135deg, ${g.soft}, ${g.softer})` : C.surf,
        border: `1px solid ${checked ? g.edge : C.b1}`,
        boxShadow: checked ? g.glowSm : C.shadowSm,
        transition: 'background .2s, border-color .2s, box-shadow .2s',
        ...ring,
      }}>
      {icon && (
        <span style={{
          width: 34, height: 34, borderRadius: R.xs, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: checked ? g.grad : C.s2,
          border: `1px solid ${checked ? 'transparent' : C.b1}`,
          color: checked ? g.onFill : C.t3,
          boxShadow: checked ? lit(0.2) : 'none',
          transition: 'background .18s, color .18s, border-color .18s',
        }}>
          <Icon name={icon} size={17} />
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>{label}</span>
        {sublabel && <span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{sublabel}</span>}
      </span>
      <span style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? g.grad : 'transparent',
        border: `1.5px solid ${checked ? 'transparent' : C.b3}`,
        boxShadow: checked ? lit(0.24) : 'none',
        transition: 'background .18s, border-color .18s',
      }}>
        {checked && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={POP} style={{ display: 'flex' }}>
            <Check size={13} color={g.onFill} strokeWidth={3.2} />
          </motion.span>
        )}
      </span>
    </motion.button>
  );
}

/** A compact answer carrying somebody else's mark (the "where did you hear
 *  about us" brand tiles), so the tile keeps its own colors. */
export function IconOptionRow({ selected, onClick, iconBg, icon, label, h = null, accent }) {
  const g = h || (accent ? hue(accent) : flowHue());
  return (
    <motion.button data-testid="onboarding-option" {...answerMotion(selected)} onClick={() => { play('select'); onClick(); }}
      aria-pressed={!!selected}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
        borderRadius: R.sm, cursor: 'pointer', fontFamily: C.FB,
        background: selected ? `linear-gradient(135deg, ${g.soft}, ${g.softer})` : C.surf,
        border: `1px solid ${selected ? g.edge : C.b1}`,
        boxShadow: selected ? g.glowSm : C.shadowSm,
        transition: 'background .18s, border-color .18s',
      }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${C.b1}` }}>{icon}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.t1, flex: 1, minWidth: 0 }}>{label}</span>
      {selected && <Check size={16} color={g.ink} strokeWidth={2.6} />}
    </motion.button>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

export function ToggleSwitch({ checked, onChange, h = null }) {
  const g = h || flowHue();
  return (
    <button onClick={() => { play('click'); onChange(!checked); }}
      role="switch" aria-checked={!!checked}
      style={{
        width: 46, height: 27, borderRadius: R.pill, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: checked ? g.grad : C.s3, position: 'relative', transition: 'background .22s', padding: 0,
        boxShadow: checked ? `${g.glowSm}, ${lit(0.2)}` : 'inset 0 1px 2px rgba(0,0,0,0.18)',
      }}>
      <motion.span animate={{ x: checked ? 20 : 3 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        style={{ position: 'absolute', top: 3, left: 0, width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.32)' }} />
    </button>
  );
}

export function SegmentToggle({ options, value, onChange, h = null }) {
  const g = h || flowHue();
  return (
    <div style={{ display: 'flex', background: C.s1, borderRadius: R.sm, padding: 4, border: `1px solid ${C.b1}` }}>
      {options.map(opt => {
        const on = value === opt.value;
        return (
          <button key={opt.value} onClick={() => { play('click'); onChange(opt.value); }}
            style={{
              flex: 1, padding: '8px 0px', borderRadius: R.xs, border: 'none', cursor: 'pointer',
              background: on ? g.grad : 'transparent', color: on ? g.onFill : C.t3,
              boxShadow: on ? lit(0.18) : 'none',
              fontWeight: 700, fontSize: 13, fontFamily: C.FB, transition: 'background .16s, color .16s',
            }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

/**
 * Scroll-snap "wheel" picker — approximates a native iOS picker wheel using a
 * single vertical scroll list; the center row is the selected value.
 *
 * The selection used to be a filled rounded box, which fought with every other
 * selected thing on the screen. It is now a pair of hairlines in the chapter
 * hue with a faint wash between them — a caliper rather than a button, which is
 * what a value being *read off* a scale should look like.
 */
export function WheelColumn({ items, index, onChange, width = 108, itemH = 42, visibleRows = 5, mono, h = null }) {
  const g = h || flowHue();
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
        background: g.softer, borderTop: `1px solid ${g.edge}`, borderBottom: `1px solid ${g.edge}`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div ref={ref} onScroll={handleScroll}
        style={{
          position: 'relative', zIndex: 1, height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          maskImage: `linear-gradient(to bottom, transparent 0, black ${itemH * 0.62}px, black calc(100% - ${itemH * 0.62}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0, black ${itemH * 0.62}px, black calc(100% - ${itemH * 0.62}px), transparent 100%)`,
        }}>
        <div style={{ height: itemH * pad }} />
        {items.map((it, i) => (
          <div key={i} style={{
            height: itemH, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center',
            // Scale, not font-size: the picker's rows are all one size and the
            // selected one is scaled up. Animating font-size relaid out the
            // whole column on every tick of the wheel.
            fontSize: 14.5, fontWeight: i === index ? 800 : 500,
            transform: i === index ? 'scale(1.17)' : 'scale(1)',
            color: i === index ? C.t1 : C.t4,
            fontFamily: mono ? C.FM : C.FB, fontVariantNumeric: 'tabular-nums',
            transition: 'color 150ms ease, transform 150ms cubic-bezier(.4,0,.2,1)',
          }}>{it}</div>
        ))}
        <div style={{ height: itemH * pad }} />
      </div>
    </div>
  );
}

// ── Data display ─────────────────────────────────────────────────────────────

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
// deliberately lightweight (no chart.js): glow-filtered gradient strokes, a
// slow area sweep, labeled milestone checkpoints, endpoint value badges, and a
// pulsing end dot. All props are optional so old call sites render unchanged.
//   lines: [{ points:[0..1], color, width, fill, dashed, endDot, glow }]
//   milestones: [{ f: 0..1 along line 0, score, label }]
//   startLabel/endLabel: value badges anchored to line 0's endpoints
export function MiniLineChart({ width = 380, height = 150, lines, xLabels, milestones, startLabel, endLabel }) {
  const pad = 14, padTop = startLabel || endLabel ? 30 : 14, padBottom = xLabels ? 22 : 14;
  const w = width - pad * 2, h = height - padTop - padBottom;
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const ptsOf = (ln) => ln.points.map((p, i) => [pad + (w * i) / (ln.points.length - 1), padTop + h * (1 - p)]);
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
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: EASE, delay: 0.15 + li * 0.2 }} />
            {ln.endDot && (
              <g>
                <motion.circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5.5} fill={ln.color}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3 + li * 0.2, ...POP }} />
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
            transition={{ delay: 0.9 + i * 0.25, ...POP }} style={{ transformOrigin: `${mx}px ${my}px` }}>
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
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.45, ...POP }}
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
export function CompareBars({ bars, h = null }) {
  const g = h || flowHue();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {bars.map((b, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: b.highlight ? C.t1 : C.t3 }}>{b.label}</span>
            <span style={numeral(12.5, { color: b.highlight ? g.ink : C.t3 })}>{Math.round(b.pct * 100)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 4, background: C.s2, overflow: 'hidden', position: 'relative', border: `1px solid ${C.b0}` }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct * 100}%` }}
              transition={{ delay: 0.35 + i * 0.18, duration: 0.9, ease: EASE }}
              style={{
                height: '100%', borderRadius: 4, position: 'relative', overflow: 'hidden',
                background: b.highlight ? g.bar : C.s4,
                boxShadow: b.highlight ? g.glowSm : 'none',
              }}>
              {b.highlight && (
                <motion.span initial={{ x: '-110%' }} animate={{ x: '240%' }} transition={{ delay: 1.3, duration: 1, ease: 'easeInOut' }}
                  style={{ position: 'absolute', top: 0, bottom: 0, width: '45%', background: 'linear-gradient(105deg,transparent,rgba(255,255,255,0.38),transparent)' }} />
              )}
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RadialRing({ pct, size = 92, stroke = 9, color = null, children }) {
  const g = flowHue();
  const c0 = color || g.from;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.s3} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c0} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: EASE }} style={{ filter: `drop-shadow(0 0 6px ${tint(c0, 0.6)})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

export function Card({ children, style }) {
  return <div style={panel({ padding: 20, ...style })}>{children}</div>;
}

export { C, glass, tint, shade, accentGrad, ChevronLeft, Icon, hue, chapterHue, R, meta, display, body, numeral, panel, lit };
