import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { C, tint } from '../../lib/theme';
import { isPlainLeftClick } from '../../lib/useAppRouter';

// Pill/segmented sub-navigation bar used inside the Prep and Portfolio shells
// so several absorbed features can live under one top-level tab and switch
// between each other without leaving the page. This row routinely overflows
// (Portfolio alone has 11 tabs) so on top of native scroll it gets: a
// highlighted, accent-tinted scrollbar (see .subnav-scroll in index.css),
// fade-out edges + chevron buttons that only appear when there's actually
// more to scroll to, wheel-to-horizontal so a mouse (not just trackpad/touch)
// can scroll it, and auto-scrolling the active tab into view when it changes
// programmatically (e.g. the app tour or a deep link jumping straight to a tab).
// `hrefFor` (optional) turns each pill into a real link to that sub-view's URL. The
// click still switches views in place — the href exists so the row behaves like
// navigation actually is: ⌘-click opens a sub-tab in a new tab, the status bar shows
// where a pill goes, and "Copy link address" produces a URL that works.
export default function SubNav({ items, active, onChange, accent = C.blue, m = false, tourPrefix, hrefFor }) {
  const scrollRef = useRef(null);
  const btnRefs = useRef({});
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    window.addEventListener('resize', updateEdges);
    return () => { ro.disconnect(); window.removeEventListener('resize', updateEdges); };
  }, [updateEdges, items.length]);

  // Keep the active pill in view without ever touching vertical scroll —
  // scrollIntoView() would be simpler but can drag the whole page/ancestor
  // scroll containers along with it, which we don't want here.
  useEffect(() => {
    const el = scrollRef.current;
    const btn = btnRefs.current[active];
    if (!el || !btn) return;
    const elBox = el.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    if (btnBox.left < elBox.left) {
      el.scrollBy({ left: btnBox.left - elBox.left - 16, behavior: 'smooth' });
    } else if (btnBox.right > elBox.right) {
      el.scrollBy({ left: btnBox.right - elBox.right + 16, behavior: 'smooth' });
    }
  }, [active]);

  function scrollByStep(dir) {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  }

  // Lets a plain vertical mouse wheel scroll this row horizontally — trackpads already produce
  // horizontal deltaX naturally, so only take over when the gesture is dominantly vertical (a
  // real mouse wheel). Wired via a native, explicitly non-passive listener rather than React's
  // onWheel prop: React attaches wheel listeners as passive by default (see react-dom's
  // addTrappedEventListener), which would make preventDefault() below silently do nothing and
  // leave the page scrolling underneath this row at the same time.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <div
        ref={scrollRef}
        className="subnav-scroll"
        onScroll={updateEdges}
        style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
          WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity',
          '--subnav-accent': tint(accent, 0.55), '--subnav-accent-hover': tint(accent, 0.8),
        }}
      >
        {items.map(it => {
          const isActive = active === it.id;
          // Each item may carry its own colour so a long sub-nav reads as a
          // recognisable spectrum of sections rather than one flat accent.
          const c = it.color || accent;
          const Icon = it.icon || it.ic; // NAV configs use `ic`, older callers `icon`
          const href = hrefFor ? hrefFor(it.id) : null;
          const Pill = href ? motion.a : motion.button;
          return (
            <Pill
              key={it.id}
              ref={el => { btnRefs.current[it.id] = el; }}
              data-tour={tourPrefix ? `${tourPrefix}-${it.id}` : undefined}
              href={href || undefined}
              aria-current={href && isActive ? 'page' : undefined}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={e => {
                if (href) {
                  if (!isPlainLeftClick(e)) return; // ⌘/middle click → let the browser open a tab
                  e.preventDefault();
                }
                onChange(it.id);
              }}
              style={{
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                scrollSnapAlign: 'start',
                padding: m ? '8px 12px' : '8px 14px', borderRadius: 999,
                border: isActive ? `1px solid ${c}66` : `1px solid ${C.b1}`,
                background: isActive ? `${c}22` : 'rgba(255,255,255,0.02)',
                color: isActive ? '#fff' : C.t2, fontWeight: isActive ? 700 : 500,
                fontSize: 12.5, fontFamily: C.FB, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all .15s',
                boxShadow: isActive ? `0 4px 14px ${c}33` : 'none',
              }}
            >
              {Icon && <Icon size={13} color={isActive ? c : (it.color ? `${it.color}bb` : C.t3)} />}
              {it.label}
              {!!it.badge && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 8, background: isActive ? accent : C.s4, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '0 4px' }}>{it.badge}</span>
              )}
            </Pill>
          );
        })}
      </div>

      {/* Edge fades + chevrons — only rendered once there's actually overflow to scroll to,
          so a short sub-nav (e.g. Progress's 4 tabs) never shows a dead-end arrow. */}
      {canLeft && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 8, width: 36, background: `linear-gradient(90deg,${C.bg},transparent)`, pointerEvents: 'none' }} />
          <button aria-label="Scroll tabs left" onClick={() => scrollByStep(-1)} style={navChevronStyle('left', accent)}>
            <ChevronLeft size={13} color="#fff" />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 8, width: 36, background: `linear-gradient(270deg,${C.bg},transparent)`, pointerEvents: 'none' }} />
          <button aria-label="Scroll tabs right" onClick={() => scrollByStep(1)} style={navChevronStyle('right', accent)}>
            <ChevronRight size={13} color="#fff" />
          </button>
        </>
      )}
    </div>
  );
}

function navChevronStyle(side, accent) {
  return {
    position: 'absolute', [side]: 2, top: 'calc(50% - 4px)', transform: 'translateY(-50%)', border: 0,
    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: tint(accent, 0.85), boxShadow: `0 2px 10px ${tint(accent, 0.5)}, inset 0 0 0 1px ${tint(accent, 0.95)}`,
    cursor: 'pointer', zIndex: 2, padding: 0,
  };
}
