// ─────────────────────────────────────────────────────────────────────────────
// THE DOOR.
//
// The one interception in this product, fired when a student is about to leave
// having not finished today. What it says lives in src/lib/streakRetention.js
// (and is asserted by scripts/verifyStreakRetention.mjs); this file owns the
// two things a pure module cannot: DETECTING the exit, and being trivially
// dismissible once it has.
//
// ── What counts as "about to leave" ──────────────────────────────────────────
// Three signals, and deliberately not a fourth:
//
//   1. The pointer leaves through the TOP of the viewport (desktop). The
//      classic signal, and the only cursor movement that reliably means "going
//      for the tab bar, the address bar, or the close button" rather than "going
//      for the dock" or "reaching for a scroll bar".
//   2. The tab is hidden for long enough to be a real switch away, not an
//      alt-tab to check something (see AWAY_MS). This is the phone case, where
//      there is no cursor at all.
//   3. Nothing else. In particular NOT `beforeunload`: a browser will not let
//      us render anything there, the native dialog it does allow is a
//      hostage-taking device, and several browsers ignore it anyway.
//
// ── What it will not do ──────────────────────────────────────────────────────
// It fires at most once per day (the model enforces this; the key lives in
// localStorage so it survives a reload). It never fires on a session shorter
// than half a minute. It never fires when today is already cleared. It has a
// real close button, a real "leave" button with a real word on it, and Escape
// works. There is no countdown, no second prompt, and no disabled control.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, ArrowRight } from 'lucide-react';
import { C, glass, CC, R, pill, tint, onTint } from '../../lib/theme';
import { exitPrompt, mayInterrupt, seenKey } from '../../lib/streakRetention';

/** How long a hidden tab has to stay hidden before it counts as leaving. */
const AWAY_MS = 12000;

export default function StayForStreakModal({
  streak = 0, creditsToday = 0, goalCredits = 4, freezes = 0,
  smallestAction = null, optedOut = false, onAct, reducedMotion = false,
}) {
  const [prompt, setPrompt] = useState(null);
  const openedAt = useRef(Date.now());
  const firedRef = useRef(false);
  const hiddenAt = useRef(null);

  const close = useCallback(() => setPrompt(null), []);

  const tryFire = useCallback(() => {
    if (firedRef.current) return;
    const minutesInApp = (Date.now() - openedAt.current) / 60000;
    const p = exitPrompt({ streak, creditsToday, goalCredits, freezes, minutesInApp, smallestAction });
    let alreadyShownToday = false;
    try { alreadyShownToday = !!localStorage.getItem(seenKey()); } catch { alreadyShownToday = false; }
    if (!mayInterrupt({ alreadyShownToday, promptKind: p.kind, optedOut })) return;
    firedRef.current = true;
    try { localStorage.setItem(seenKey(), '1'); } catch { /* private mode — the once-a-session ref still holds */ }
    setPrompt(p);
  }, [streak, creditsToday, goalCredits, freezes, smallestAction, optedOut]);

  useEffect(() => {
    if (optedOut) return undefined;

    // Signal 1 — the pointer leaves through the top edge. `relatedTarget` being
    // null is what distinguishes leaving the window from moving between two
    // elements inside it.
    const onMouseOut = (e) => {
      if (e.relatedTarget || e.clientY > 8) return;
      tryFire();
    };
    // Signal 2 — the tab goes away and stays away.
    const onVisibility = () => {
      if (document.hidden) { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current >= AWAY_MS) tryFire();
      hiddenAt.current = null;
    };
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tryFire, optedOut]);

  useEffect(() => {
    if (!prompt) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, close]);

  const anim = reducedMotion
    ? {}
    : { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.98 } };

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: C.scrim, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            {...anim}
            role="dialog"
            aria-modal="true"
            aria-label={prompt.title}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...glass({ padding: 24 }),
              width: '100%', maxWidth: 420, position: 'relative',
              border: `1px solid ${C.amber}44`,
              background: `linear-gradient(150deg, ${tint(C.amber, 0.14)}, ${C.s1} 60%)`,
            }}
          >
            <button
              type="button" onClick={close} aria-label="Close"
              style={{
                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                cursor: 'pointer', color: C.t3, padding: 8, lineHeight: 0,
              }}
            >
              <X size={16} />
            </button>

            <div style={{ ...R({ gap: 8 }), marginBottom: 12 }}>
              <Flame size={16} color={C.amberL} />
              <span style={pill(C.amberDim, C.amberL)}>
                {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
              </span>
            </div>

            <h2 style={{
              fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD,
              letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', margin: '0 0 10px', lineHeight: 1.25,
            }}>
              {prompt.title}
            </h2>
            <p style={{ fontSize: 13.5, color: C.t2, margin: '0 0 8px', lineHeight: 1.6 }}>
              {prompt.body}
            </p>
            {prompt.action?.sublabel && (
              <p style={{ fontSize: 12, color: C.t3, margin: '0 0 18px' }}>{prompt.action.sublabel}</p>
            )}

            <div style={CC({ gap: 8, marginTop: 16 })}>
              <button
                type="button"
                onClick={() => { close(); onAct?.(prompt.action); }}
                style={{
                  ...R({ gap: 8, justifyContent: 'center' }), cursor: 'pointer', width: '100%',
                  padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: C.amber, color: onTint(C.amber), fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
                }}
              >
                {prompt.stay}
                <ArrowRight size={15} />
              </button>
              {/* Rule 3: leaving is one tap, on a real button, with a real word
                  on it, the same width as the other one. */}
              <button
                type="button"
                onClick={close}
                style={{
                  cursor: 'pointer', width: '100%', padding: '12px 16px', borderRadius: 12,
                  background: 'none', border: `1px solid ${C.b1}`,
                  color: C.t2, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                {prompt.leave}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
