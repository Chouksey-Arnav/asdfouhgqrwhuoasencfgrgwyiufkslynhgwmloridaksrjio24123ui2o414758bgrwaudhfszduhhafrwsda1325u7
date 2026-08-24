// ─────────────────────────────────────────────────────────────────────────────
// Parallel pathways — the switching surfaces
//
// A student running three pathways at once needs the answer to two questions to
// be permanently, effortlessly available: "which one am I in?" and "how are the
// other two doing?" Everything here exists to answer those in one glance and
// make the move between them cost one click (or one keystroke).
//
// Four surfaces, one shared vocabulary of colour + progress ring, so switching
// feels like the same gesture wherever you do it:
//
//   PathwayRail          the primary switcher — a segmented control with a
//                        sliding indicator, at the top of the Pathways view.
//   PathwayQuickSwitch   the always-present one, in the sidebar and the mobile
//                        header: current pathway + a popover holding the others.
//   ParallelPathwayBoard the at-a-glance board — every enrolled pathway's real
//                        progress and its exact next lesson, resumable in place
//                        without switching focus at all.
//   PathwayManager       add / swap / drop, over the full catalogue of ten.
//
// Design rules held in common across all four:
//   · The pathway's own accent is its identity everywhere. Never a generic
//     "selected blue" — a student learns the colour, then stops reading labels.
//   · Progress is always shown, never on hover. The reason to look at the
//     switcher is usually to compare, not to navigate.
//   · Motion is a single shared `layoutId` indicator that slides between chips,
//     so the switch reads as one object moving rather than two states blinking.
//     All of it collapses to nothing under `reducedMotion`.
//   · Every interactive element is a real button with a real accessible name,
//     and the rail implements roving-tabindex arrow-key navigation like the
//     tablist it visually is.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Stethoscope, HeartPulse, ClipboardList, Pill, Smile, Microscope,
  Dumbbell, Globe, Landmark, Plus, Check, X, ChevronRight, Play, RefreshCw,
  Layers3, Trophy, ArrowLeftRight, Sparkles,
} from 'lucide-react';
import {
  C, glass, glass2, pill, btn, btnSm, CC, G, accentText, accentGrad, onTint,
} from '../lib/theme';
import { Arc, Bar } from './ui/primitives';
import Portal from './ui/Portal';
import { MAX_ACTIVE_PATHWAYS } from '../lib/pathwayEnrollment';

/** Pathway key → icon. The single definition; App.jsx imports this one. */
export const PATH_ICONS = {
  exploring: Compass, physician: Stethoscope, nursing: HeartPulse, physicianAssistant: ClipboardList,
  pharmacy: Pill, dentistry: Smile, biomedResearch: Microscope, physicalOccupTherapy: Dumbbell,
  publicHealth: Globe, healthAdmin: Landmark,
};
export const pathIcon = (key) => PATH_ICONS[key] || Compass;

// Alt+1/2/3. Rendered as a hint on every switcher so the shortcut is discovered
// by using the mouse — nobody reads a shortcuts page.
export const SLOT_HINTS = ['⌥1', '⌥2', '⌥3'];

const springy = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

/** Width of the quick-switch popover. Fixed, because its position is clamped against it. */
const PANEL_W = 296;

/** Shorter label for the tight chips — full names blow out a three-up rail on a laptop. */
const SHORT_LABELS = {
  physicianAssistant: 'PA', physicalOccupTherapy: 'PT/OT', biomedResearch: 'Research',
  healthAdmin: 'Health Admin', publicHealth: 'Public Health', exploring: 'Exploring',
};
export const shortLabel = (key, label = '') => SHORT_LABELS[key] || label.replace(/\s*\(.*\)\s*$/, '');

// ─────────────────────────────────────────────────────────────────────────────
// PathwayRail — the primary switcher
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Array} rows        activePathwayProgress() output, one per enrolled pathway
 * @param {string} focused    focused pathway key
 * @param {(key:string)=>void} onFocus
 * @param {()=>void} onAdd    opens the manager; omitted when all slots are full
 */
export function PathwayRail({
  rows = [], focused, onFocus, onAdd, m = false, reducedMotion = false, layoutGroup = 'pathway-rail',
}) {
  const railRef = useRef(null);
  const canAdd = rows.length < MAX_ACTIVE_PATHWAYS && !!onAdd;

  // Roving arrow-key navigation, matching what the tablist role promises.
  const onKeyDown = useCallback((e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? 'first' : e.key === 'End' ? 'last' : null;
    if (!dir) return;
    e.preventDefault();
    const n = rows.length;
    const next = dir === 'first' ? 0 : dir === 'last' ? n - 1 : (i + dir + n) % n;
    const el = railRef.current?.querySelectorAll('[data-rail-chip]')[next];
    el?.focus();
    onFocus?.(rows[next].key);
  }, [rows, onFocus]);

  if (!rows.length) return null;

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label="Your pathways"
      data-tour="pathway-rail"
      style={{
        ...glass({ padding: m ? 8 : 9, borderRadius: 16 }),
        display: 'flex', gap: 8, alignItems: 'stretch',
        overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}
    >
      {rows.map((row, i) => {
        const active = row.key === focused;
        const Ic = pathIcon(row.key);
        const a = accentText(row.accent || C.blue);
        return (
          <motion.button
            key={row.key}
            data-rail-chip
            role="tab"
            id={`${layoutGroup}-tab-${row.key}`}
            aria-selected={active}
            aria-controls={`${layoutGroup}-panel`}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onFocus?.(row.key)}
            whileHover={reducedMotion ? undefined : { y: -1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.985 }}
            title={`${row.label} — ${row.done}/${row.total} lessons (${row.pct}%)`}
            style={{
              // On a phone the rail scrolls sideways, and the chip width is picked so the NEXT
              // chip always peeks in from the edge — a rail that looks like it ends at two
              // pathways is a rail nobody scrolls.
              position: 'relative', flex: m ? '0 0 auto' : '1 1 0', minWidth: m ? 146 : 0,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left', fontFamily: C.FB, color: active ? C.t1 : C.t2,
              transition: 'color .18s',
            }}
          >
            {/* One indicator for the whole rail — it physically slides from the old
                chip to the new one, which is what makes a switch feel like a move
                rather than a repaint. */}
            {active && (
              reducedMotion ? (
                <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: `${row.accent || C.blue}1f`, border: `1px solid ${row.accent || C.blue}55` }} />
              ) : (
                <motion.span
                  layoutId={`${layoutGroup}-indicator`}
                  transition={springy}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 12,
                    background: `linear-gradient(135deg,${row.accent || C.blue}26,${row.accent || C.blue}0f)`,
                    border: `1px solid ${row.accent || C.blue}55`,
                    boxShadow: `0 6px 20px ${row.accent || C.blue}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                />
              )
            )}
            <span style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Arc pct={row.pct} size={34} stroke={3} color={a} />
              <span style={{ position: 'absolute', display: 'grid', placeItems: 'center' }}>
                <Ic size={14} color={active ? a : C.t3} />
              </span>
            </span>
            <span style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 12.5, fontWeight: active ? 800 : 600,
                color: active ? a : C.t2, fontFamily: C.FD, 
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shortLabel(row.key, row.label)}
              </span>
              <span style={{ display: 'block', fontSize: 10, color: C.t3, fontFamily: C.FM, marginTop: 4 }}>
                {row.complete ? 'complete' : `${row.done}/${row.total} lessons`}
              </span>
            </span>
            {row.complete
              ? <Trophy size={12} color={C.greenL} style={{ position: 'relative', flexShrink: 0 }} />
              : !m && (
                <span style={{
                  position: 'relative', flexShrink: 0, fontSize: 9, fontFamily: C.FM,
                  color: active ? a : C.t4, opacity: active ? 0.9 : 0.55,
                  border: `1px solid ${active ? `${row.accent || C.blue}45` : C.b1}`,
                  borderRadius: 4, padding: '4px 4px',
                }}>
                  {SLOT_HINTS[i]}
                </span>
              )}
          </motion.button>
        );
      })}
      {canAdd && (
        <motion.button
          onClick={onAdd}
          whileHover={reducedMotion ? undefined : { y: -1, background: 'rgba(255,255,255,0.05)' }}
          whileTap={reducedMotion ? undefined : { scale: 0.985 }}
          title={`Add another pathway — you can run up to ${MAX_ACTIVE_PATHWAYS} at once`}
          style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8,
            padding: m ? '10px 12px' : '11px 14px', borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: `1px dashed ${C.b2}`, color: C.t3,
            fontSize: 12, fontWeight: 600, fontFamily: C.FB, whiteSpace: 'nowrap',
          }}
        >
          <Plus size={14} />
          {m ? 'Add' : `Add pathway · ${MAX_ACTIVE_PATHWAYS - rows.length} slot${MAX_ACTIVE_PATHWAYS - rows.length === 1 ? '' : 's'} left`}
        </motion.button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PathwayQuickSwitch — the always-available switcher (sidebar + mobile header)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The one that makes this feature feel like it runs through the whole app rather
 * than living on one screen: it sits in the shell, so a student deep in the SAT
 * tab or the Portfolio can see which pathway is in focus and move without
 * navigating anywhere first.
 */
export function PathwayQuickSwitch({
  rows = [], focused, onFocus, onAdd, onManage, onResume, align = 'left', compact = false, reducedMotion = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [anchor, setAnchor] = useState(null); // viewport rect of the trigger, for the portalled panel
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const current = rows.find((r) => r.key === focused) || rows[0];

  // The panel is portalled to <body> rather than positioned inside the trigger. It has to be:
  // the desktop sidebar this switcher lives in is a 236px column with `overflow: hidden`, so an
  // absolutely-positioned 296px panel was cropped mid-word — the resume buttons and the ⌥ hints
  // were simply not on screen. Portalling also escapes the transform Framer puts on the animated
  // tab wrapper, which would otherwise re-anchor `position: fixed` to that wrapper's box.
  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setAnchor(el.getBoundingClientRect());
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    place();
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') { setOpen(false); wrapRef.current?.querySelector('button')?.focus(); } };
    // Re-measure rather than close on scroll/resize: closing a menu because the page moved a
    // pixel under a trackpad is the more annoying of the two failures.
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);
  useEffect(() => { if (open) setActiveIdx(Math.max(0, rows.findIndex((r) => r.key === focused))); }, [open, rows, focused]);

  const onPanelKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = rows[activeIdx]; if (r) { onFocus?.(r.key); setOpen(false); } }
  };

  if (!current) return null;
  const CurIc = pathIcon(current.key);
  const a = accentText(current.accent || C.blue);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Pathway in focus: ${current.label}. ${rows.length > 1 ? `${rows.length - 1} more running. ` : ''}Switch pathway`}
        data-tour="pathway-quickswitch"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: compact ? 6 : 9,
          padding: compact ? '6px 8px' : '9px 11px', borderRadius: 12, cursor: 'pointer',
          background: open ? `${current.accent || C.blue}16` : C.surfHi,
          border: `1px solid ${open ? `${current.accent || C.blue}45` : C.b1}`,
          color: C.t1, fontFamily: C.FB, textAlign: 'left', transition: 'background .15s,border-color .15s',
        }}
      >
        <span style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          <Arc pct={current.pct} size={compact ? 24 : 28} stroke={compact ? 2.5 : 3} color={a} />
          <span style={{ position: 'absolute', display: 'grid', placeItems: 'center' }}>
            <CurIc size={compact ? 10 : 12} color={a} />
          </span>
        </span>
        {/* Compact — the phone header, sharing ~390px with a search button, a theme toggle, a
            streak pill, a level block and an avatar. There is no honest room for a name there,
            and a name squeezed to "P…" is worse than none: the pathway's own accent ring and
            icon ARE its identity, the dots say how many others are running, and the accessible
            name above spells all of it out for a screen reader. */}
        {!compact && (
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 8.5, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', whiteSpace: 'nowrap' }}>
              {rows.length > 1 ? `Pathway ${rows.findIndex((r) => r.key === current.key) + 1} of ${rows.length}` : 'Pathway'}
            </span>
            <span style={{
              display: 'block', fontSize: 12, fontWeight: 700, color: C.t1, fontFamily: C.FD,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {shortLabel(current.key, current.label)}
            </span>
          </span>
        )}
        {/* The other running pathways, as their own accent dots. Even collapsed,
            the shell keeps saying "two more are alive over here." */}
        {rows.length > 1 && (
          <span style={{ display: 'flex', gap: 4, flexShrink: 0 }} aria-hidden="true">
            {rows.filter((r) => r.key !== current.key).map((r) => (
              <span key={r.key} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: r.accent || C.t3, opacity: 0.85,
                boxShadow: `0 0 0 1.5px ${C.s1}`,
              }} />
            ))}
          </span>
        )}
        <ChevronRight size={13} color={C.t3} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
      </button>

      <AnimatePresence>
        {open && anchor && (
          <Portal>
          <motion.div
            ref={panelRef}
            id={panelId}
            role="menu"
            aria-label="Switch pathway"
            onKeyDown={onPanelKeyDown}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'fixed', zIndex: 400,
              top: Math.min(anchor.bottom + 8, (typeof window !== 'undefined' ? window.innerHeight : 900) - 340),
              // Clamped to the viewport on both edges so the panel is never cropped, whether it
              // hangs off a narrow sidebar (desktop) or off a right-aligned header button (phone).
              left: Math.max(8, Math.min(
                align === 'right' ? anchor.right - PANEL_W : anchor.left,
                (typeof window !== 'undefined' ? window.innerWidth : 1280) - PANEL_W - 8,
              )),
              width: PANEL_W, maxWidth: 'calc(100vw - 16px)',
              background: C.s1, border: `1px solid ${C.b2}`, borderRadius: 12,
              boxShadow: '0 20px 56px rgba(0,0,0,0.55)', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '8px 12px 8px', borderBottom: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                Running in parallel
              </div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
                {rows.length} of {MAX_ACTIVE_PATHWAYS} slots · switch anytime, nothing is lost
              </div>
            </div>
            <div style={{ padding: 4 }}>
              {rows.map((r, i) => {
                const Ic = pathIcon(r.key);
                const ra = accentText(r.accent || C.blue);
                const isFocused = r.key === focused;
                const hover = i === activeIdx;
                return (
                  <div
                    key={r.key}
                    role="menuitemradio"
                    aria-checked={isFocused}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => { onFocus?.(r.key); setOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
                      borderRadius: 8, cursor: 'pointer',
                      background: hover ? `${r.accent || C.blue}14` : 'transparent',
                      border: `1px solid ${isFocused ? `${r.accent || C.blue}40` : 'transparent'}`,
                    }}
                  >
                    <span style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                      <Arc pct={r.pct} size={30} stroke={3} color={ra} />
                      <span style={{ position: 'absolute', display: 'grid', placeItems: 'center' }}>
                        <Ic size={12} color={ra} />
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{shortLabel(r.key, r.label)}</span>
                        {isFocused && <span style={{ ...pill(`${r.accent || C.blue}20`, ra, { fontSize: 8.5, padding: '4px 4px' }) }}>IN FOCUS</span>}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                        {r.complete ? 'Every lesson verified' : r.resume ? `Next: ${r.resume.lesson.title}` : `${r.done}/${r.total} lessons`}
                      </span>
                    </span>
                    {/* No keyboard hint in the compact (phone) placement — ⌥2 is advice you
                        cannot take on a touch device. */}
                    {!compact && <span style={{ fontSize: 9, fontFamily: C.FM, color: C.t4, flexShrink: 0 }}>{SLOT_HINTS[i]}</span>}
                    {onResume && r.resume && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResume(r); setOpen(false); }}
                        aria-label={`Resume ${r.label}: ${r.resume.lesson.title}`}
                        title={`Resume without switching — ${r.resume.lesson.title}`}
                        style={{
                          flexShrink: 0, width: 26, height: 26, borderRadius: 8, cursor: 'pointer',
                          background: `${r.accent || C.blue}1c`, border: `1px solid ${r.accent || C.blue}40`,
                          display: 'grid', placeItems: 'center', color: ra,
                        }}
                      >
                        {r.resumeIsContinue ? <RefreshCw size={11} /> : <Play size={11} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '8px 8px 8px', borderTop: `1px solid ${C.b1}` }}>
              {rows.length < MAX_ACTIVE_PATHWAYS && onAdd && (
                <button onClick={() => { setOpen(false); onAdd(); }} style={{ ...btnSm(C.surfHi, { flex: 1, fontSize: 11, color: C.t2 }), display: 'inline-flex', gap: 4 }}>
                  <Plus size={11} />Add pathway
                </button>
              )}
              {onManage && (
                <button onClick={() => { setOpen(false); onManage(); }} style={{ ...btnSm(C.surfHi, { flex: 1, fontSize: 11, color: C.t2 }), display: 'inline-flex', gap: 4 }}>
                  <Layers3 size={11} />Manage
                </button>
              )}
            </div>
          </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParallelPathwayBoard — every enrolled pathway, at a glance, resumable in place
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The point of the whole feature, in one component: three pathways side by side
 * with their real progress and their exact next lesson, each startable without
 * switching focus first. "Switch between them easily" is best served by
 * sometimes not having to switch at all.
 */
export function ParallelPathwayBoard({
  rows = [], focused, onFocus, onResume, onAdd, m = false, reducedMotion = false, title = 'Your pathways, side by side',
}) {
  if (!rows.length) return null;
  const cols = Math.min(rows.length + (rows.length < MAX_ACTIVE_PATHWAYS && onAdd ? 1 : 0), 3);
  return (
    // One card per row on a phone. The shared G() helper drops a 3-up to 2-up on mobile, which
    // is right for stat tiles and wrong here: these cards carry a title, a badge, a percentage
    // ring and a full lesson name, and at half a 390px screen every one of those wrapped into
    // each other. A pathway you can't read is not a pathway you'll switch to.
    <div style={m
      ? { display: 'grid', gridTemplateColumns: '1fr', gap: 12 }
      : G(cols, 12, {}, false)}>
      {rows.map((r, i) => {
        const Ic = pathIcon(r.key);
        const a = accentText(r.accent || C.blue);
        const isFocused = r.key === focused;
        return (
          <motion.div
            key={r.key}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : i * 0.05 }}
            style={{
              ...glass({ padding: 16, borderRadius: 16 }),
              border: `1px solid ${isFocused ? `${r.accent || C.blue}55` : C.b1}`,
              background: isFocused
                ? `linear-gradient(150deg,${r.accent || C.blue}14,${C.surf} 62%)`
                : C.surf,
              display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
            }}
          >
            {isFocused && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${r.accent || C.blue},${r.accent || C.blue}00)` }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: `${r.accent || C.blue}18`, border: `1px solid ${r.accent || C.blue}38`,
              }}>
                <Ic size={17} color={a} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD}}>
                    {shortLabel(r.key, r.label)}
                  </span>
                  {isFocused
                    ? <span style={{ ...pill(`${r.accent || C.blue}1e`, a, { fontSize: 8.5, padding: '4px 4px', fontWeight: 800 }) }}>IN FOCUS</span>
                    : <span style={{ ...pill(C.s3, C.t3, { fontSize: 8.5, padding: '4px 4px' }) }}>{SLOT_HINTS[i]}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, fontFamily: C.FM }}>
                  {r.done}/{r.total} lessons · {r.pct}%
                </div>
              </div>
              <Arc pct={r.pct} size={40} stroke={4} color={r.complete ? C.green : a} label={`${r.pct}%`} />
            </div>

            <Bar pct={r.pct} color={r.complete ? C.green : a} h={4} glow={isFocused} />

            <div style={{ flex: 1, minHeight: 34 }}>
              {r.complete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: C.greenL }}>
                  <Trophy size={13} />Every lesson verified — certificate ready
                </div>
              ) : r.resume ? (
                <>
                  <div style={{ fontSize: 8.5, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                    {r.resumeIsContinue ? 'Pick back up' : r.started ? 'Up next' : 'Starts with'}
                  </div>
                  <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.resume.lesson.title}
                  </div>
                </>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {r.resume && onResume && (
                <motion.button
                  whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  onClick={() => onResume(r)}
                  style={{
                    ...btn(accentGrad(r.accent || C.blue), { flex: 1, fontSize: 11.5, padding: '8px 12px', color: onTint(r.accent || C.blue) }),
                    display: 'inline-flex', gap: 4,
                  }}
                >
                  {r.resumeIsContinue ? <RefreshCw size={12} /> : <Play size={12} />}
                  {r.resumeIsContinue ? 'Continue' : r.started ? 'Next lesson' : 'Start'}
                </motion.button>
              )}
              {!isFocused && (
                <button
                  onClick={() => onFocus?.(r.key)}
                  title={`Bring ${r.label} into focus — your plan, coach and dashboard follow it`}
                  style={{ ...btnSm(C.surfHi, { fontSize: 11, color: C.t2, flex: r.resume ? '0 0 auto' : 1 }), display: 'inline-flex', gap: 4 }}
                >
                  <ArrowLeftRight size={11} />Focus
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
      {rows.length < MAX_ACTIVE_PATHWAYS && onAdd && (
        <motion.button
          onClick={onAdd}
          whileHover={reducedMotion ? undefined : { y: -2, borderColor: `${C.violet}45` }}
          style={{
            ...glass({ padding: 16, borderRadius: 16 }),
            border: `1px dashed ${C.b2}`, background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, minHeight: 150, textAlign: 'center', fontFamily: C.FB,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: `${C.violet}16`, border: `1px solid ${C.violet}35` }}>
            <Plus size={17} color={C.violetL} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t2, fontFamily: C.FD }}>Add a pathway</div>
          <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5, maxWidth: 190 }}>
            Run up to {MAX_ACTIVE_PATHWAYS} at once — compare them for real instead of guessing.
          </div>
        </motion.button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PathwayManager — add / swap / drop across the full catalogue
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Replaces the old "Switch Study Track" grid, whose every tile silently replaced
 * the student's pathway. Here each tile states exactly what clicking it does,
 * and the destructive one (drop) is a separate control behind a confirm that
 * says progress is kept — because it is.
 */
export function PathwayManager({
  paths = {}, rows = [], focused, onEnroll, onFocus, onDrop, onSwap, onDetails,
  m = false, reducedMotion = false,
}) {
  const [swapFor, setSwapFor] = useState(null);   // key the student wants to add when full
  const [confirmDrop, setConfirmDrop] = useState(null);
  const enrolled = new Set(rows.map((r) => r.key));
  const full = rows.length >= MAX_ACTIVE_PATHWAYS;
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  return (
    <div style={CC({ gap: 12 })}>
      <div style={{ ...glass2({ padding: '12px 12px', background: `${C.violet}0d`, border: `1px solid ${C.violet}25` }), display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={14} color={C.violetL} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
          You're running <strong style={{ color: C.t1 }}>{rows.length} of {MAX_ACTIVE_PATHWAYS}</strong> pathways.
          Adding one never touches another's progress, and dropping one keeps every lesson you finished —
          so it's safe to explore.
        </span>
      </div>

      <div style={G(m ? 1 : 3, 10, {}, m)}>
        {Object.entries(paths).map(([key, p]) => {
          const Ic = pathIcon(key);
          const a = accentText(p.accent || C.blue);
          const isEnrolled = enrolled.has(key);
          const isFocused = key === focused;
          const row = byKey[key];
          const lessons = (p.units || []).reduce((s, u) => s + (u.lessons?.length || 0), 0);
          return (
            <motion.div
              key={key}
              whileHover={reducedMotion ? undefined : { borderColor: `${p.accent}45`, y: -1 }}
              style={{
                ...glass2({ padding: 12, borderRadius: 12 }),
                border: `1px solid ${isEnrolled ? `${p.accent}45` : C.b1}`,
                background: isEnrolled ? `linear-gradient(140deg,${p.accent}10,transparent 60%)` : C.surf2,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: `${p.accent}16`, border: `1px solid ${p.accent}30` }}>
                  <Ic size={15} color={a} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: isEnrolled ? a : C.t1, fontFamily: C.FD, lineHeight: 1.3 }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: C.t3, marginTop: 4, fontFamily: C.FM }}>
                    {(p.units || []).length} units · {lessons} lessons
                    {row && row.done > 0 ? ` · ${row.done} done` : ''}
                  </div>
                </div>
                {isFocused && <span style={{ ...pill(`${p.accent}1e`, a, { fontSize: 8.5, padding: '4px 4px', fontWeight: 800, flexShrink: 0 }) }}>IN FOCUS</span>}
              </div>

              {p.tagline && <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5 }}>{p.tagline}</div>}
              {isEnrolled && row && <Bar pct={row.pct} color={row.complete ? C.green : a} h={3} />}

              <div style={{ display: 'flex', gap: 4, marginTop: 'auto', flexWrap: 'wrap' }}>
                {!isEnrolled && !full && (
                  <button onClick={() => onEnroll?.(key)} style={{ ...btn(accentGrad(p.accent), { flex: 1, fontSize: 11, padding: '8px 8px', color: onTint(p.accent) }), display: 'inline-flex', gap: 4 }}>
                    <Plus size={11} />Add & study
                  </button>
                )}
                {!isEnrolled && full && (
                  <button onClick={() => setSwapFor(swapFor === key ? null : key)} style={{ ...btnSm(C.surfHi, { flex: 1, fontSize: 11, color: C.t2 }), display: 'inline-flex', gap: 4 }}>
                    <ArrowLeftRight size={11} />Swap one out
                  </button>
                )}
                {isEnrolled && !isFocused && (
                  <button onClick={() => onFocus?.(key)} style={{ ...btn(accentGrad(p.accent), { flex: 1, fontSize: 11, padding: '8px 8px', color: onTint(p.accent) }), display: 'inline-flex', gap: 4 }}>
                    <ArrowLeftRight size={11} />Focus
                  </button>
                )}
                {isEnrolled && isFocused && (
                  <span style={{ ...btnSm(`${p.accent}14`, { flex: 1, fontSize: 11, color: a, border: `1px solid ${p.accent}35`, cursor: 'default' }), display: 'inline-flex', gap: 4 }}>
                    <Check size={11} />Studying now
                  </span>
                )}
                {onDetails && (
                  <button onClick={() => onDetails(key)} title="See what this pathway covers" style={{ ...btnSm(C.surfHi, { fontSize: 11, color: C.t3, padding: '4px 8px' }) }}>
                    Details
                  </button>
                )}
                {isEnrolled && (
                  <button
                    onClick={() => setConfirmDrop(confirmDrop === key ? null : key)}
                    title="Stop studying this pathway (progress is kept)"
                    aria-label={`Stop studying ${p.label}`}
                    style={{ ...btnSm(C.surfHi, { fontSize: 11, color: C.t3, padding: '4px 8px' }) }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {confirmDrop === key && (
                  <motion.div
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ ...glass2({ padding: '8px 12px', background: `${C.amber}0e`, border: `1px solid ${C.amber}30` }) }}>
                      <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.5 }}>
                        {/* The reassurance has to be true, not just soothing — so it counts. With
                            nothing finished yet there is no progress to promise, and saying "your
                            0 finished lessons stay saved" would read as a script rather than an
                            answer to the question the student is actually asking. */}
                        {row?.done
                          ? <>Stop studying {p.label}? Your {row.done} finished lesson{row.done === 1 ? '' : 's'} stay saved — add it back anytime and it resumes exactly here.</>
                          : <>Stop studying {p.label}? Nothing is lost — you haven't finished any lessons in it yet, and it'll be waiting exactly as it is if you come back.</>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        <button onClick={() => { onDrop?.(key); setConfirmDrop(null); }} style={{ ...btnSm(`${C.amber}1e`, { fontSize: 10.5, color: C.amberL, border: `1px solid ${C.amber}40` }) }}>Stop studying it</button>
                        <button onClick={() => setConfirmDrop(null)} style={{ ...btnSm(C.surfHi, { fontSize: 10.5, color: C.t3 }) }}>Keep it</button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {swapFor === key && (
                  <motion.div
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ ...glass2({ padding: '8px 12px', background: `${C.violet}0e`, border: `1px solid ${C.violet}30` }) }}>
                      <div style={{ fontSize: 10.5, color: C.t2, lineHeight: 1.5, marginBottom: 8 }}>
                        You're at {MAX_ACTIVE_PATHWAYS}. Which one should {p.label} take over from? (Its progress is kept.)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {rows.map((r) => (
                          <button
                            key={r.key}
                            onClick={() => { onSwap?.(r.key, key); setSwapFor(null); }}
                            style={{ ...btnSm(C.surfHi, { fontSize: 10.5, color: C.t2, justifyContent: 'space-between', width: '100%' }) }}
                          >
                            <span>{shortLabel(r.key, r.label)}</span>
                            <span style={{ color: C.t4, fontFamily: C.FM }}>{r.done}/{r.total}</span>
                          </button>
                        ))}
                        <button onClick={() => setSwapFor(null)} style={{ ...btnSm('transparent', { fontSize: 10.5, color: C.t3, border: 'none' }) }}>Cancel</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PathwayRail;
