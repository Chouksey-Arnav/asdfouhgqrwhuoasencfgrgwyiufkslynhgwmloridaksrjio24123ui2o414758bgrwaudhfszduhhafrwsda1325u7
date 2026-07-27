import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, MousePointer2 } from 'lucide-react';
import { C, btn, btnG } from '../lib/theme';

// Post-onboarding product tour — a spotlight overlay that highlights real
// nav elements (via [data-tour] attributes) and drives navigation itself
// through each step's onEnter(), so the highlighted section is actually on
// screen behind the highlight ring. Built custom (no react-joyride/driver.js)
// because the app has no router — everything is driven by the `tab` state in
// App.jsx, and a custom overlay can call setTab directly per step.
//
// Deliberately short — one step per top-level pillar plus the ⌘K tip, so
// someone can finish the whole thing in under a minute instead of bailing
// out partway through. Each step carries a `section` label + `color` so it
// still reads as a sequence of distinct chapters (a colored pill + matching
// spotlight ring) rather than one undifferentiated scroll.
//
// Scrolling: the dim backdrop sits on top of the whole app and would otherwise
// swallow every wheel/touch event, making the real page underneath un-scrollable
// mid-tour. Two things fix that: (1) every step auto-scrolls its target into
// view (smooth, centered) as soon as it exists in the DOM, so a "deep" step
// several screens down doesn't leave the user hunting for it manually, and
// (2) the backdrop still forwards wheel/touch gestures to whichever scrollable
// ancestor holds the current target, so manual scrolling keeps working too —
// the spotlight ring and tooltip both track the target's live position via a
// capturing `scroll` listener, so they glide along with it either way.

const TIP_W = 300;
// Used only until the real card has rendered once and reported its actual height (body copy
// length varies a lot step to step, and wraps differently on narrow mobile widths, so a fixed
// estimate here was the root cause of a real bug: on mobile the card measured taller than this
// guess and its bottom edge quietly overflowed past the viewport, out of reach of the Next
// button). See `measuredH` below — real height always wins once known.
const TIP_H_EST = 220;
const MARGIN = 16;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Centered floating placement used whenever the target doesn't leave clean room on any side
// (very large anchors, tiny mobile viewports, or an anchor pinned to a screen edge) — every
// other branch below is allowed to assume its chosen side actually fits.
function centeredFallback(vw, vh, tipH) {
  const w = Math.min(TIP_W, vw - MARGIN * 2);
  return { top: clamp(vh * 0.32, MARGIN, Math.max(MARGIN, vh - tipH - MARGIN)), left: clamp(vw / 2 - w / 2, MARGIN, vw - w - MARGIN), width: w, transform: 'none' };
}

function placeTooltip(rect, vw, vh, tipH) {
  const w = Math.min(TIP_W, vw - MARGIN * 2);
  const spaceRight = vw - rect.right, spaceBottom = vh - rect.bottom, spaceTop = rect.top, spaceLeft = rect.left;
  let placement;
  if (spaceRight >= w + MARGIN) placement = 'right';
  else if (spaceBottom >= tipH + MARGIN) placement = 'bottom';
  else if (spaceTop >= tipH + MARGIN) placement = 'top';
  else if (spaceLeft >= w + MARGIN) placement = 'left';
  else placement = 'center'; // nothing fits cleanly on any side — float centered instead of pinning off-screen

  switch (placement) {
    case 'right': return { top: clamp(rect.top, MARGIN, Math.max(MARGIN, vh - tipH - MARGIN)), left: rect.right + MARGIN, width: w, transform: 'none' };
    case 'left': return { top: clamp(rect.top, MARGIN, Math.max(MARGIN, vh - tipH - MARGIN)), left: rect.left - MARGIN, width: w, transform: 'translateX(-100%)' };
    case 'bottom': return { top: clamp(rect.bottom + MARGIN, MARGIN, Math.max(MARGIN, vh - tipH - MARGIN)), left: clamp(rect.left + rect.width / 2 - w / 2, MARGIN, vw - w - MARGIN), width: w, transform: 'none' };
    case 'top': return { top: clamp(rect.top - MARGIN, tipH + MARGIN, vh - MARGIN), left: clamp(rect.left + rect.width / 2 - w / 2, MARGIN, vw - w - MARGIN), width: w, transform: 'translateY(-100%)' };
    default: return centeredFallback(vw, vh, tipH);
  }
}

// Walks up from a target element to find the nearest ancestor that actually
// scrolls, so manual wheel/touch input during the tour can be forwarded to it
// (the app's own scroll containers vary — the main content pane, the coach
// thread sidebar, the desktop nav list — this works for any of them).
function findScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    if (/(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function AppTour({ steps, onFinish, onSkip }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [measuredH, setMeasuredH] = useState(TIP_H_EST);
  const step = steps[i];
  const color = step?.color || C.blue;
  const backdropRef = useRef(null);
  const scrollParentRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => { step?.onEnter?.(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real card height varies a lot with body-copy length and viewport width — measure it after
  // each step's card mounts (useLayoutEffect fires before paint, so this never flickers) and use
  // the real number for placement instead of the rough estimate above.
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && h !== measuredH) setMeasuredH(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useLayoutEffect(() => {
    let raf1, raf2;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const measureAndScrollIntoView = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        scrollParentRef.current = findScrollParent(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      measure();
    };
    // Double rAF: onEnter's setTab()/goPrep() etc. need a render + paint before the
    // target exists (or has moved to its new tab/sub-view) in the DOM.
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(measureAndScrollIntoView); });
    // Scroll events don't bubble, but a capturing listener on window still sees them
    // fire from any nested scrollable ancestor — this is what keeps the spotlight ring
    // and tooltip glued to the target while the browser smooth-scrolls it into view,
    // and while the user scrolls manually afterward.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf1); cancelAnimationFrame(raf2);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [i, step]);

  // Forward wheel/touch gestures made anywhere over the dim backdrop to the current
  // target's scroll container, so the page behind the tour stays fully scrollable
  // instead of the backdrop just swallowing the input.
  useEffect(() => {
    const node = backdropRef.current;
    if (!node) return;
    const onWheel = (e) => {
      const target = scrollParentRef.current;
      if (!target) return;
      e.preventDefault();
      target.scrollBy({ top: e.deltaY, left: e.deltaX });
    };
    let touchY = null, touchX = null;
    const onTouchStart = (e) => { touchY = e.touches[0]?.clientY ?? null; touchX = e.touches[0]?.clientX ?? null; };
    const onTouchMove = (e) => {
      const target = scrollParentRef.current;
      const t = e.touches[0];
      if (!target || !t) return;
      const dy = touchY != null ? touchY - t.clientY : 0;
      const dx = touchX != null ? touchX - t.clientX : 0;
      target.scrollBy({ top: dy, left: dx });
      touchY = t.clientY; touchX = t.clientX;
      e.preventDefault();
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const next = useCallback(() => { if (i < steps.length - 1) setI(v => v + 1); else onFinish?.(); }, [i, steps.length, onFinish]);
  const back = useCallback(() => { if (i > 0) setI(v => v - 1); }, [i]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onSkip?.(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, back, onSkip]);

  if (!step) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const pad = 8;
  const tip = rect ? placeTooltip(rect, vw, vh, measuredH) : centeredFallback(vw, vh, measuredH);
  const pct = ((i + 1) / steps.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, fontFamily: C.FB }}>
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(2,4,10,0.78)', touchAction: 'none' }}
      />
      {rect && (
        <motion.div
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: [`0 0 0 4px ${color}48, 0 0 22px ${color}40`, `0 0 0 6px ${color}30, 0 0 34px ${color}5c`, `0 0 0 4px ${color}48, 0 0 22px ${color}40`] }}
          transition={{ top: { type: 'spring', stiffness: 320, damping: 32 }, left: { type: 'spring', stiffness: 320, damping: 32 }, width: { type: 'spring', stiffness: 320, damping: 32 }, height: { type: 'spring', stiffness: 320, damping: 32 }, boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
          style={{ position: 'fixed', borderRadius: 12, border: `2px solid ${color}`, pointerEvents: 'none', transition: 'border-color .2s' }}
        />
      )}
      {/* Plain anchor div owns the placement transform (translateX/Y(-100%)) — a nested
          motion.div is used for the fade-in below because framer-motion writes its own
          `transform` for animated x/y, which would silently clobber a manual one here. */}
      <div style={{ position: 'fixed', top: `${tip.top}px`, left: `${tip.left}px`, width: `${tip.width}px`, transform: tip.transform, maxHeight: `calc(var(--msp-vh) - ${MARGIN * 2}px)`, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            ref={cardRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: C.s1, border: `1px solid ${C.b2}`, borderRadius: 14, padding: 18, boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${color}22` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06, duration: 0.2 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: `${color}1e`, border: `1px solid ${color}40`, color, fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                <Sparkles size={10} />{step.section || 'Tour'}
              </motion.div>
              <button onClick={onSkip} aria-label="Skip tour" style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', padding: 6, display: 'flex', minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>{step.title}</div>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginBottom: 12 }}>{step.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14, color: C.t4, fontSize: 10.5 }}>
              <MousePointer2 size={11} /><span>You can still scroll around while this is open</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: C.t3, fontFamily: C.FM }}>Step {i + 1} of {steps.length}</span>
              <span style={{ fontSize: 10, color: C.t4, fontFamily: C.FM }}>{Math.round(pct)}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: C.b2, overflow: 'hidden', marginBottom: 16 }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} style={{ height: '100%', borderRadius: 2, background: color }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {i > 0 && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={back} style={{ ...btnG({ fontSize: 12, padding: '9px 14px' }), display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}>
                  <ChevronLeft size={13} />Back
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.94 }} onClick={next} style={{ ...btn(color, { fontSize: 12, padding: '9px 16px' }), display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}>
                {i === steps.length - 1 ? 'Finish' : 'Next'}<ChevronRight size={13} />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
