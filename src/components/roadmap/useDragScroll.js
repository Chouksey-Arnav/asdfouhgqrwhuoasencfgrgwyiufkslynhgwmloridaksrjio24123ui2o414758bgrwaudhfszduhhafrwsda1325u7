import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Drag-to-pan for a scrollable element, with release momentum. Works on either
// axis — horizontal for the spine, vertical for the path.
//
// ── Why this is not "just add overflow: auto" ───────────────────────────────
// A twelve-month roadmap is bigger than every screen it will ever be shown on,
// so moving through it IS the interaction — not a fallback for when the window
// is narrow. On a phone that is already solved: a finger on a scroll container
// is the best pan gesture ever shipped, complete with rubber-banding and
// platform-native momentum. On a desktop it is not solved at all: the mouse has
// no pan gesture, and a scrollbar down the side of a year of someone's life is
// a control you aim at, not a document you move through.
//
// So this hook adds exactly the missing half:
//
//   MOUSE / PEN → press and drag anywhere on the surface, with velocity carried
//                 into a decaying glide on release, the same way every map and
//                 every design canvas behaves. Because it drives scrollLeft /
//                 scrollTop rather than a transform, it stays in perfect
//                 agreement with the scrollbar, the keyboard, and anything else
//                 that scrolls the same element.
//   TOUCH       → deliberately UNTOUCHED. Native scrolling is left to do its
//                 job: no preventDefault, no synthetic momentum, no touch-action
//                 lock beyond the one axis. Re-implementing inertia on top of a
//                 platform that already has it is how a timeline ends up feeling
//                 worse on the device it will mostly be read on.
//
// ── Why the vertical axis is not a copy of the horizontal one ──────────────
// One difference, and it matters: on the vertical axis the page itself scrolls.
// A drag that reaches the top or bottom of the path must not silently start
// dragging the document behind it, and a vertical drag inside a page is much
// easier to start by accident than a horizontal one. So the vertical mode only
// captures the pointer once the movement is genuinely vertical and genuinely
// past the threshold, and it releases at the ends rather than fighting them.
//
// The one subtlety worth knowing about on either axis: a drag that ends over a
// marker must not also click that marker. A capture-phase click listener
// swallows exactly one click after any drag that actually moved, which is why
// `moved` is measured against a small threshold rather than against zero — a
// 2px wobble during a click is a click, and a 40px sweep that happens to end on
// a dot is not.
// ─────────────────────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 4;     // px of movement before a press becomes a drag
const FRICTION = 0.945;       // per-frame velocity decay after release
const MIN_VELOCITY = 0.08;    // px/frame below which the glide stops
const MAX_VELOCITY = 55;      // px/frame ceiling, so a flick cannot teleport
const SAMPLE_MS = 90;         // velocity is measured over the last ~90ms only

export default function useDragScroll(ref, { enabled = true, momentum = true, axis = 'x' } = {}) {
  const [dragging, setDragging] = useState(false);
  const vertical = axis === 'y';
  const st = useRef({
    active: false, moved: false, start: 0, startCross: 0, startScroll: 0,
    samples: [], raf: 0, suppressClick: false, pointerId: null,
  });

  const stopGlide = useCallback(() => {
    if (st.current.raf) { cancelAnimationFrame(st.current.raf); st.current.raf = 0; }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;

    // The scroll property, its extent and its viewport, read through one pair of
    // accessors so the rest of the hook never branches on the axis again.
    const pos = () => (vertical ? el.scrollTop : el.scrollLeft);
    const setPos = (v) => { if (vertical) el.scrollTop = v; else el.scrollLeft = v; };
    const extent = () => (vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth);
    const along = (e) => (vertical ? e.clientY : e.clientX);
    const across = (e) => (vertical ? e.clientX : e.clientY);

    const glide = (velocity) => {
      let v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
      const step = () => {
        if (!ref.current) return;
        setPos(pos() - v);
        v *= FRICTION;
        // Stop at the ends rather than grinding against them.
        const atEnd = pos() <= 0 || pos() >= extent() - 1;
        if (Math.abs(v) < MIN_VELOCITY || atEnd) { st.current.raf = 0; return; }
        st.current.raf = requestAnimationFrame(step);
      };
      st.current.raf = requestAnimationFrame(step);
    };

    const onPointerDown = (e) => {
      // Touch keeps native scrolling — see the header. Right/middle clicks are
      // not pans either.
      if (e.pointerType === 'touch' || e.button !== 0) return;
      // A press inside a real control (a marker button, a link) still starts a
      // pan — that is what makes the whole surface feel like a document — but
      // the control keeps its click unless the press turns into a movement.
      stopGlide();
      st.current.active = true;
      st.current.moved = false;
      st.current.pointerId = e.pointerId;
      st.current.start = along(e);
      st.current.startCross = across(e);
      st.current.startScroll = pos();
      st.current.samples = [{ x: along(e), t: performance.now() }];
    };

    const onPointerMove = (e) => {
      if (!st.current.active || e.pointerId !== st.current.pointerId) return;
      const d = along(e) - st.current.start;
      if (!st.current.moved) {
        if (Math.abs(d) < DRAG_THRESHOLD) return;
        // On the vertical axis, a movement that is mostly sideways is not a pan
        // of this surface — letting it become one is how a page turns into a
        // thing that grabs at your cursor.
        if (vertical && Math.abs(across(e) - st.current.startCross) > Math.abs(d)) return;
        st.current.moved = true;
        setDragging(true);
        // Captured only once the press is genuinely a drag, so a plain click on
        // a marker never has its events redirected away from it.
        try { el.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
      }
      setPos(st.current.startScroll - d);
      const now = performance.now();
      st.current.samples.push({ x: along(e), t: now });
      while (st.current.samples.length > 2 && now - st.current.samples[0].t > SAMPLE_MS) st.current.samples.shift();
      e.preventDefault();
    };

    const end = (e) => {
      if (!st.current.active) return;
      const wasMoved = st.current.moved;
      st.current.active = false;
      st.current.pointerId = null;
      if (wasMoved) {
        setDragging(false);
        st.current.suppressClick = true;
        try { el.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
        if (momentum) {
          const s = st.current.samples;
          const first = s[0];
          const last = s[s.length - 1];
          const dt = last && first ? last.t - first.t : 0;
          if (dt > 8) glide(((last.x - first.x) / dt) * 16);
        }
      }
      st.current.samples = [];
    };

    // One click swallowed per drag, in the capture phase so it never reaches
    // the marker underneath.
    const onClickCapture = (e) => {
      if (!st.current.suppressClick) return;
      st.current.suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    // Any other way of moving the surface cancels the glide, so a wheel or a
    // "jump to today" never fights a decaying drag.
    const onWheel = () => stopGlide();
    const onTouchStart = () => stopGlide();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      stopGlide();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
    };
  }, [ref, enabled, momentum, stopGlide, vertical]);

  /** Scroll to a position along the hook's axis, cancelling any glide first. */
  const scrollToPos = useCallback((value, { smooth = true } = {}) => {
    const el = ref.current;
    if (!el) return;
    stopGlide();
    const max = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    const to = Math.max(0, Math.min(value, max));
    if (smooth && typeof el.scrollTo === 'function') el.scrollTo({ [vertical ? 'top' : 'left']: to, behavior: 'smooth' });
    else if (vertical) el.scrollTop = to;
    else el.scrollLeft = to;
  }, [ref, stopGlide, vertical]);

  // `scrollToX` is kept under its original name because RoadmapSpine.jsx calls
  // it and the horizontal case is what it means there.
  return { dragging, scrollToX: scrollToPos, scrollTo: scrollToPos, stopGlide };
}
