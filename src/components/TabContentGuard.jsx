import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { C, btn, btnG } from '../lib/theme';

// ── Why the main content area is not wrapped in <AnimatePresence mode="wait"> ──
//
// It used to be. Every top-level tab's content rendered as the single child of an
// `<AnimatePresence mode="wait">`, keyed on the active tab, so switching tabs meant:
// animate the OLD tab out, wait for framer-motion to call `onExitComplete`, and only
// THEN mount the new one. That "and only then" is the whole bug. It makes mounting a
// screen — the one thing that must never be optional — conditional on an animation
// callback firing, and framer-motion does not always fire it.
//
// The failure has one precondition and this app meets it constantly: `layout` /
// `layoutId` animations. Those share framer-motion's one global projection tree with
// whatever else is animating, including the tab-switch wrapper above them. Once a
// layout transition has actually run inside a tab, leaving that tab can leave the
// wrapper's exit permanently un-finished — `onExitComplete` never comes, `mode="wait"`
// keeps waiting for it, and the next tab is never mounted at all. The content column
// is then empty and paints nothing but C.bg, which on the dark themes is a black
// screen. Nothing recovers it, because nothing is broken enough to throw: the sidebar
// still works, the URL is right, React is idle and happy. Only a reload — which builds
// a brand-new AnimatePresence — brings the app back. This is the same wedge documented
// on the SAT sub-nav (see src/components/sat/satUi.jsx, where a layoutId indicator was
// replaced with measured offsets for exactly this reason); the Portfolio tab is simply
// where students meet it, because it is the tab densest in `layout` nodes — the weekly
// goal tiles (WeeklyGoalTile), the daily quest cards (DailyQuestRail/QuestCard) and the
// tracked-item rows (TrackedPanel) all use it, and all of them animate as a student
// sits on the tab reading and hovering. "Stay on Portfolio a while, switch tabs, screen
// goes black, reload fixes it" is that sentence from the outside.
//
// So the tab swap no longer waits on anything. The new tab is a keyed child that mounts
// the instant `tab` changes — React's own remount, no exit phase, no completion callback
// in the path — and the arrival still fades in, because `initial`/`animate` on a freshly
// keyed element needs no AnimatePresence. Switching tabs is now strictly faster too: the
// 220ms spent animating the old screen out was 220ms before the new one existed.
//
// ── And a net under it ──
//
// Removing the known wedge is the fix. This component is the promise that the NEXT one,
// whatever it is, cannot end on a black screen either — because a blank content area is
// a thing we can simply look at and detect:
//
//   motion → after a beat, is anything actually rendered and visible in there?
//   plain  → no. Re-render this tab with framer-motion taken out of the path entirely.
//            This alone fixes every "animation never finished" variant, silently and
//            without a reload, which is what makes the recovery seamless rather than an
//            apology screen for something we could have fixed.
//   failed → still nothing. Now it is not an animation problem, so say so plainly and
//            tell the student to refresh, which is what actually works.
//
// Cost of a false positive is one lost fade-in. Cost of a false negative is the bug
// report this file exists to close, so the check is deliberately eager.

const SUPPORT_EMAIL = 'medschoolprepsupport@gmail.com';

// How often to ask whether the content column is actually showing something. Comfortably
// longer than the 220ms enter animation and than a slow first paint of a heavy tab, short
// enough that a student who did hit the bug sees the recovery rather than the black screen.
const CHECK_MS = 900;

// How many consecutive empty readings before acting. A single one is not evidence — a tab
// mid-swap, a panel between two data states and a frame stolen by a long task all read
// empty for an instant. Two in a row, ~1.8s apart, is a screen that is genuinely not there.
const STRIKES = 2;

// "Nothing usable is on screen here." Three ways that can be true, and the wedge above
// produces the first one: no child element at all, because the tab never mounted.
function looksEmpty(host) {
  if (!host) return true;
  const el = host.firstElementChild;
  if (!el) return true;
  if (el.childElementCount === 0 && !(el.textContent || '').trim()) return true;
  // A wedged enter animation leaves a fully-rendered subtree sitting at opacity 0 —
  // present in the DOM, invisible on screen, and indistinguishable from the black
  // screen above for the person looking at it.
  if (!(parseFloat(getComputedStyle(el).opacity || '1') > 0.02)) return true;
  return el.getBoundingClientRect().height < 4;
}

/**
 * @param {string} tabKey       the active tab id — changing it is what starts a swap
 * @param {boolean} reducedMotion
 * @param {React.ReactNode} children  the rendered tab
 */
export default function TabContentGuard({ tabKey, reducedMotion = false, children }) {
  const hostRef = useRef(null);
  // Keyed on the tab so a new tab always starts optimistic: a tab that once needed the
  // plain fallback should not condemn every later tab to no animation.
  const [state, setState] = useState({ key: tabKey, phase: 'motion' });
  if (state.key !== tabKey) setState({ key: tabKey, phase: 'motion' });

  // Deliberately NOT "check once after the swap, then stop". The failure this exists for
  // does not only strike at mount: an animation can wedge, or a projection transform can
  // collapse a subtree, at any point while a student sits on a tab. A watchdog that stands
  // down as soon as the first paint looked fine would sleep through exactly that. So it
  // keeps watching for as long as the tab is on screen — one element measured every 900ms,
  // which costs nothing next to what it catches.
  useEffect(() => {
    if (state.key !== tabKey || state.phase === 'failed') return undefined;
    let strikes = 0;
    const id = setInterval(() => {
      // A backgrounded tab has no rAF, so framer-motion's animations genuinely have not
      // advanced and everything below would be a lie. Wait for the student to come back.
      if (document.hidden) return;
      if (!looksEmpty(hostRef.current)) { strikes = 0; return; }
      strikes += 1;
      if (strikes < STRIKES) return;
      console.error(`MSP tab guard: "${tabKey}" is showing nothing — falling back (phase: ${state.phase}).`);
      setState(s => (s.phase === 'motion' ? { ...s, phase: 'plain' } : { ...s, phase: 'failed' }));
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [tabKey, state.key, state.phase]);

  if (state.phase === 'failed') {
    return (
      <div style={{ minHeight: 'min(60vh, 460px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, padding: 40, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.roseDim, border: `1px solid ${C.rose}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={26} color={C.rose} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.t1, fontFamily: C.FD, margin: 0 }}>Oops! Loading issue.</h2>
        <p style={{ color: C.t2, maxWidth: 420, lineHeight: 1.7, fontSize: 14, margin: 0 }}>
          This section didn’t finish loading. Refresh the page and it’ll come right back —
          nothing you’ve done is lost. If it keeps happening, contact our support team at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.blueL }}>{SUPPORT_EMAIL}</a>.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" style={btn()} onClick={() => window.location.reload()}>Refresh the page</button>
          <button type="button" style={btnG()} onClick={() => setState({ key: tabKey, phase: 'motion' })}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    // data-tab-content marks the element the watchdog measures — it is what the
    // browser test (scripts/verifyTabSwitchE2E.mjs) blanks on purpose to prove the
    // recovery and the fallback both still fire.
    <div ref={hostRef} data-tab-content>
      {state.phase === 'motion' ? (
        <motion.div
          key={tabKey}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.22 }}
        >
          {children}
        </motion.div>
      ) : (
        // The recovery render. A plain element on purpose — no motion component anywhere
        // in the path, so nothing here can be waiting on an animation to finish.
        <div key={`plain-${tabKey}`}>{children}</div>
      )}
    </div>
  );
}
