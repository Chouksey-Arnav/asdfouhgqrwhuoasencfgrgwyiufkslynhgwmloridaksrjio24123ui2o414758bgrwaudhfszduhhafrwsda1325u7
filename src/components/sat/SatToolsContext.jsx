import React, {
  createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, useSyncExternalStore,
} from 'react';
import { motion } from 'framer-motion';
import { Calculator, BookOpen } from 'lucide-react';
import { C, tint } from '../../lib/theme';
import DesmosCalculator from './DesmosCalculator';
import SatReferenceSheet from './SatReferenceSheet';
import Portal from '../ui/Portal';
import { seedForQuestion } from '../../lib/sat/desmosSeed';
import { getActiveTab, subscribeActiveTab } from '../../lib/sat/activeTabStore';

// ─────────────────────────────────────────────────────────────────────────────
// Test-day tools, available from anywhere in the SAT tab.
//
// The calculator and the reference sheet are not features of one screen — on
// the real exam they sit above every Math question, in every module, for the
// whole section. So they are mounted once at the tab root and every panel
// reaches them through this context instead of each one rendering its own.
//
// That also enforces the invariant DesmosSurface needs: exactly one live
// calculator. The Calculator sub-tab embeds a full-size one and calls
// `setEmbedded(true)` while it is mounted, which stands the floating window
// down rather than letting two graphs race each other to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

const SatToolsContext = createContext(null);

export function useSatTools() {
  return useContext(SatToolsContext) || FALLBACK;
}

// A panel rendered outside the provider (a test harness, a future embed) should
// degrade to "no tools" rather than crash on a null context.
const FALLBACK = {
  calculatorOpen: false, referenceOpen: false, embedded: false,
  openCalculator: () => {}, closeCalculator: () => {}, toggleCalculator: () => {},
  openReference: () => {}, closeReference: () => {}, toggleReference: () => {},
  graphQuestion: () => false, setCalculatorNote: () => {}, setEmbedded: () => {},
  available: false,
};

export function SatToolsProvider({ children, accent = C.teal, isMobile = false, showRail = true }) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [note, setCalculatorNote] = useState(null);
  const [seed, setSeed] = useState(null);
  const seedToken = useRef(0);

  // Whether the SAT tab is the one actually on screen right now, read from an
  // external store rather than a prop — see activeTabStore.js. This is the
  // real fix for the rail/calculator getting stuck over other tabs: it can
  // hide the portal immediately even if this provider's own unmount is
  // delayed or dropped by an interrupted AnimatePresence exit.
  const liveTab = useSyncExternalStore(subscribeActiveTab, getActiveTab, getActiveTab);
  const toolsActive = liveTab == null || liveTab === 'sat';

  const openCalculator = useCallback(() => setCalculatorOpen(true), []);
  const closeCalculator = useCallback(() => setCalculatorOpen(false), []);
  const toggleCalculator = useCallback(() => setCalculatorOpen(v => !v), []);
  const openReference = useCallback(() => setReferenceOpen(true), []);
  const closeReference = useCallback(() => setReferenceOpen(false), []);
  const toggleReference = useCallback(() => setReferenceOpen(v => !v), []);

  /**
   * Push a question's equations into the calculator and show it.
   * Returns false when the question has nothing graphable, so callers can hide
   * the button entirely rather than offering an action that does nothing.
   */
  const graphQuestion = useCallback((question) => {
    const built = seedForQuestion(question);
    if (!built.count) return false;
    seedToken.current += 1;
    setSeed({ token: seedToken.current, expressions: built.expressions, table: built.table });
    setCalculatorOpen(true);
    return true;
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // Alt-chorded so they cannot collide with typing an answer into a grid-in
  // box, and Escape closes the topmost surface the way every other overlay in
  // the app does.
  useEffect(() => {
    function onKey(e) {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'c') { e.preventDefault(); toggleCalculator(); }
        else if (k === 'r') { e.preventDefault(); toggleReference(); }
        return;
      }
      if (e.key === 'Escape') {
        if (referenceOpen) setReferenceOpen(false);
        else if (calculatorOpen) setCalculatorOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCalculator, toggleReference, referenceOpen, calculatorOpen]);

  const value = useMemo(() => ({
    calculatorOpen, referenceOpen, embedded, available: true,
    openCalculator, closeCalculator, toggleCalculator,
    openReference, closeReference, toggleReference,
    graphQuestion, setCalculatorNote, setEmbedded,
  }), [
    calculatorOpen, referenceOpen, embedded,
    openCalculator, closeCalculator, toggleCalculator,
    openReference, closeReference, toggleReference, graphQuestion,
  ]);

  return (
    <SatToolsContext.Provider value={value}>
      {children}

      {/* Every viewport-anchored surface goes through the portal. App.jsx
          animates each top-level tab with a transformed <motion.div>, and a
          transformed ancestor re-parents `position: fixed` to itself — so
          rendering these inline made the rail and the calculator appear inside
          the content column for the length of the tab transition and then jump.
          See src/components/ui/Portal.jsx. */}
      {toolsActive && (
        <Portal>
          {showRail && (
            <ToolRail
              accent={accent} isMobile={isMobile}
              calculatorOpen={calculatorOpen || embedded}
              referenceOpen={referenceOpen}
              onCalculator={embedded ? null : toggleCalculator}
              onReference={toggleReference}
            />
          )}

          <DesmosCalculator
            open={calculatorOpen && !embedded}
            onClose={closeCalculator}
            seed={seed}
            accent={accent}
            isMobile={isMobile}
            note={note}
          />

          <SatReferenceSheet
            open={referenceOpen}
            onClose={closeReference}
            accent={accent}
            isMobile={isMobile}
          />
        </Portal>
      )}
    </SatToolsContext.Provider>
  );
}

// ── The launch rail ──────────────────────────────────────────────────────────
// Left edge on desktop, bottom-left on mobile — deliberately the opposite side
// from MedabrainLauncher (right edge / bottom-right) so the two never collide
// on any viewport.
//
// The rail is `position: fixed`, so it has to be told where the content area
// starts or it lands on top of the app's left navigation. Rather than hard-code
// the sidebar's width, it measures where <main data-app-content> actually
// begins — so it stays correct if the sidebar is resized, the browser is
// zoomed, or the layout changes, instead of drifting silently.
const DESKTOP_SIDEBAR_W = 236; // fallback only, matches App.jsx's <aside>

/** Live left edge of the app's content column, in CSS pixels. */
function useContentLeft(enabled) {
  const [left, setLeft] = useState(() => {
    if (typeof document === 'undefined') return DESKTOP_SIDEBAR_W;
    const el = document.querySelector('[data-app-content]');
    return el ? Math.round(el.getBoundingClientRect().left) : DESKTOP_SIDEBAR_W;
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    const el = document.querySelector('[data-app-content]');
    if (!el) return undefined;
    const measure = () => setLeft(Math.round(el.getBoundingClientRect().left));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [enabled]);

  return left;
}

function ToolRail({ accent, isMobile, calculatorOpen, referenceOpen, onCalculator, onReference }) {
  const contentLeft = useContentLeft(!isMobile);
  const buttons = [
    onCalculator && { id: 'calc', icon: Calculator, label: 'Calculator', hint: 'Alt+C', active: calculatorOpen, onClick: onCalculator, color: accent },
    { id: 'ref', icon: BookOpen, label: 'Formulas', hint: 'Alt+R', active: referenceOpen, onClick: onReference, color: C.emerald },
  ].filter(Boolean);

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', left: 16, bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
        zIndex: 320, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {buttons.map(b => {
          const Icon = b.icon;
          return (
            <motion.button
              key={b.id} onClick={b.onClick} aria-label={b.label}
              whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }}
              style={{
                width: 46, height: 46, borderRadius: '50%', cursor: 'pointer',
                border: `1px solid ${b.active ? tint(b.color, 0.5) : C.b2}`,
                // Theme tokens, not the hard-coded navy this used to carry:
                // on the light palette a near-black pill was the loudest thing
                // on the screen, and it fought the page instead of sitting on it.
                background: b.active ? tint(b.color, 0.8) : C.s1,
                boxShadow: `0 4px 14px ${tint(b.color, b.active ? 0.28 : 0.14)}, 0 1px 0 ${tint('#ffffff', 0.10)} inset`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon size={19} color={b.active ? '#fff' : b.color} />
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', left: contentLeft, top: '50%', transform: 'translateY(-50%)', zIndex: 320,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {buttons.map(b => {
        const Icon = b.icon;
        return (
          <motion.button
            key={b.id} onClick={b.onClick} title={`${b.label} · ${b.hint}`} aria-label={b.label}
            whileHover={{ x: 6 }} whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              padding: '14px 9px', borderRadius: '0 14px 14px 0', cursor: 'pointer',
              // Longhand rather than `border` + `borderLeft: none`: React warns
              // when a shorthand and its longhand are both set on a re-render,
              // and this button re-renders every time the panel toggles.
              borderTop: `1px solid ${b.active ? tint(b.color, 0.42) : C.b2}`,
              borderRight: `1px solid ${b.active ? tint(b.color, 0.42) : C.b2}`,
              borderBottom: `1px solid ${b.active ? tint(b.color, 0.42) : C.b2}`,
              borderLeft: 'none',
              // Each tool keeps its hue, at a whisper when idle and a statement
              // when open — the same information, a third of the volume.
              background: b.active
                ? `linear-gradient(160deg, ${tint(b.color, 0.28)} 0%, ${C.s1} 100%)`
                : `linear-gradient(160deg, ${tint(b.color, 0.09)} 0%, ${C.s1} 70%)`,
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              boxShadow: `4px 4px 16px ${tint(b.color, b.active ? 0.20 : 0.10)}, 0 1px 0 ${tint('#ffffff', 0.10)} inset`,
            }}
          >
            <Icon size={16} color={b.active ? '#fff' : b.color} />
            <span style={{
              writingMode: 'vertical-rl', fontSize: 9.5, fontWeight: 700,
              color: b.active ? '#fff' : C.t2, letterSpacing: '.14em',
              textTransform: 'uppercase', fontFamily: C.FB,
            }}>
              {b.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
