// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — hover, focus and TAP, and it satisfies WCAG 1.4.13.
//
// ── Why this exists rather than `title="…"` ─────────────────────────────────
// The app had ~250 `title` attributes doing tooltip duty. A native title has
// three problems, in increasing order of severity:
//
//   1. It does not exist on touch. There is no hover on a phone, so every one
//      of those explanations was invisible to the majority of this app's users
//      — which is the whole argument for treating mobile as the primary target
//      rather than the adaptation.
//   2. It cannot be styled, cannot be read by a magnifier user at any useful
//      size, and appears after a browser-controlled delay of roughly a second.
//   3. Where it is the ONLY label on an icon button, the control has no
//      accessible name on any platform that does not surface title — which is
//      most of them.
//
// ── The three things 1.4.13 actually asks for ──────────────────────────────
// Content that appears on hover or focus must be:
//
//   DISMISSIBLE  Escape closes it without moving the pointer or focus. A
//                magnifier user at 400% frequently has the tooltip covering
//                the thing they were trying to read; without Escape their only
//                option is to move the mouse away, which moves the viewport.
//   HOVERABLE    the pointer can travel INTO the tooltip and it stays open.
//                This is the one everyone misses: a tooltip that vanishes when
//                you move toward it cannot be read at magnification, because
//                at 400% the tooltip is off-screen from where the pointer is.
//                Implemented by hanging the close on a shared timer that both
//                the trigger and the panel cancel.
//   PERSISTENT   it stays until dismissed, focus moves, or it stops being
//                valid — never on a timeout. A reader who needs longer is
//                precisely the reader a timeout fails.
//
// ── Touch ──────────────────────────────────────────────────────────────────
// On a coarse pointer the trigger becomes a real toggle button: tap opens, tap
// again or tap anywhere else closes. That is also why the trigger is always a
// <button> — it has to be reachable by Tab and operable by Enter/Space, and a
// <span> with handlers is neither.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { C } from '../../lib/theme';

/** Grace period for the pointer to cross the gap between trigger and panel. */
const LEAVE_GRACE_MS = 180;

export default function Tooltip({
  /** The tooltip text. Plain string — a tooltip that needs markup wants a popover. */
  label,
  /** What the tooltip is attached to. Receives no props; wrapped in a button. */
  children,
  /**
   * The trigger's accessible name. Required when `children` is an icon with no
   * text, because `aria-describedby` describes a control — it does not name
   * one, and a button with a description and no name is announced as "button".
   */
  ariaLabel,
  /** 'top' | 'bottom'. Falls back to the other side near a viewport edge. */
  placement = 'top',
  style,
}) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  // HOVERABLE: leaving the trigger does not close immediately — it starts a
  // timer that entering the panel cancels. Without this gap the pointer can
  // never reach the panel.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), LEAVE_GRACE_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // DISMISSIBLE. Bound to the document rather than the trigger so it fires
  // while the pointer is inside the panel, which is exactly when a magnifier
  // user needs it. Capture phase so a panel or modal underneath does not eat
  // Escape first and close itself instead of the tooltip.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    // Touch/click anywhere outside closes the tapped-open state.
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  // Flip to the other side when the preferred one would run off the top or
  // bottom of the viewport. Measured on open, not on every render.
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setFlipped(placement === 'top' ? r.top < 72 : r.bottom > window.innerHeight - 72);
  }, [open, placement]);

  const onTop = placement === 'top' ? !flipped : flipped;

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        // Focus opens it and blur closes it, so a keyboard user gets the same
        // information a mouse user does. Click toggles, which is what makes it
        // work on touch — the same handler serves both.
        onFocus={() => { cancelClose(); setOpen(true); }}
        onBlur={scheduleClose}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', padding: 0, margin: 0,
          color: 'inherit', font: 'inherit', cursor: 'pointer',
        }}
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          // The pointer moving INTO the panel keeps it open. This pair of
          // handlers is the whole of "hoverable".
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            [onTop ? 'bottom' : 'top']: 'calc(100% + 8px)',
            zIndex: 600,
            // Wide enough to hold a sentence at a readable size, capped so it
            // never becomes a paragraph on a phone.
            width: 'max-content',
            maxWidth: 'min(280px, 74vw)',
            padding: '8px 12px',
            borderRadius: 8,
            background: C.s0,
            border: `1px solid ${C.b2}`,
            boxShadow: C.shadowSm,
            color: C.t1,
            fontSize: 13,
            lineHeight: 'calc(1.5 * var(--msp-line-scale))',
            textAlign: 'left',
            fontFamily: C.FB,
            fontWeight: 500,
            // The panel is passive: it must never sit between the finger and
            // the control underneath it on a touch screen. Re-enabled for the
            // pointer case by the handlers above, which fire regardless.
            pointerEvents: 'auto',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
