import React, { useCallback, useEffect, useRef, useState } from 'react';
import { C, tint, shade, btn, accentFill, contrastRatio } from '../../lib/theme';
import { isPlainLeftClick } from '../../lib/useAppRouter';

// ─────────────────────────────────────────────────────────────────────────────
// SAT design system.
//
// The SAT pillar is the one surface a student compares directly against a real
// testing product (Bluebook), so it holds itself to a stricter visual standard
// than the rest of the app: ONE identity colour (C.sky) instead of a
// per-sub-tab rainbow, semantic colour reserved for meaning (green = measured
// good, rose = needs work, gold = a measurement event), and an underline tab
// rail instead of pill chips — the grammar of serious desktop software.
//
// ── The quiet pass ───────────────────────────────────────────────────────────
// Colour policy above was right; the RENDERING of it was not. Three habits had
// spread across the eleven panels and, stacked on one screen, they were what
// made a first-time student's eyes bounce:
//
//   1. Two-hue gradients on every button — gold→orange, violet→indigo,
//      amber→orange, rose→roseL. Each one is a second hue that carries no
//      meaning, so a screen with four buttons introduced eight colours.
//   2. Tinted washes at 0.10–0.16 alpha on card after card, so nothing was
//      quiet enough to make anything else look loud.
//   3. Coloured halos — glows under buttons, under the tab underline, under
//      progress bars — all of which say "look at me" simultaneously.
//
// The three helpers below replace those habits without removing a single
// element or changing what any colour MEANS. Every panel gets its semantic hue;
// it just states it once, at a lower volume, instead of three times.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The SAT primary-button fill: one hue, darkened toward its own shadow.
 * Reads as a solid, expensive object rather than a two-colour candy stripe.
 */
export const satGrad = (color = C.sky) => {
  // accentFill first: on the light palette amber/gold are far too pale to carry
  // the white label these buttons use.
  const base = accentFill(color);
  return `linear-gradient(140deg,${base},${shade(base, 0.26)})`;
};

/**
 * A page/card wash. Single stop that fades to nothing — no second colour, and
 * no `rgba(255,255,255,0.02)` tail, which only ever showed up in dark mode and
 * left light mode with a hard edge where the gradient stopped.
 */
export const satWash = (color = C.sky, a = 0.055) => `linear-gradient(135deg,${tint(color, a)},transparent 72%)`;

/**
 * Primary SAT action. Same geometry as the app's btn(), single-hue fill, and a
 * shadow that grounds the button instead of lighting it up.
 */
export const satBtn = (color = C.sky, x = {}) => {
  // Amber and gold are the two hues a white label can't sit on. Darkening them
  // to fit the label (what satGrad does for icon badges) turns a warm accent
  // muddy brown, so a filled BUTTON keeps the bright hue and flips its ink
  // instead — the same move a well-built design system makes for yellow.
  // The cutoff is deliberately low. Anything above it (blue, rose, violet, the
  // pillar's own sky) keeps a white label and gets its fill darkened by
  // accentFill instead, which is what those hues want; below it lives the warm
  // family, where darkening far enough for white text kills the colour.
  const darkInk = contrastRatio(color, C.onAccent || '#ffffff') < 2.8;
  const fill = darkInk
    ? `linear-gradient(140deg,${color},${shade(color, 0.14)})`
    : satGrad(color);
  return btn(fill, {
    color: darkInk ? '#14181f' : C.onAccent,
    boxShadow: `0 2px 10px ${tint(color, 0.20)}, inset 0 1px 0 rgba(255,255,255,0.08)`,
    ...x,
  });
};

// How the nine sub-views group into a mental model. Order within a group is
// the order a student should encounter them; anything not listed (a future
// view) falls into a trailing group rather than vanishing.
const NAV_GROUPS = [
  { id: 'home',   label: null,       ids: ['overview'] },
  { id: 'assess', label: 'Assess',   ids: ['baseline', 'diagnostic', 'tests'] },
  { id: 'train',  label: 'Train',    ids: ['practice', 'skills', 'review'] },
  { id: 'track',  label: 'Toolkit',  ids: ['library', 'toolkit', 'scores'] },
];

/**
 * The SAT sub-navigation: an underline tab rail with labelled groups.
 * Consumes the same `items` array the old pill SubNav did (id, label, ic,
 * badge) and keeps its routing contract — `hrefFor` makes every tab a real
 * link so ⌘-click and "copy link address" behave like navigation.
 */
export function SatNav({ items, active, onChange, accent = C.sky, m = false, hrefFor, tourPrefix = 'sat-sub' }) {
  const scrollRef = useRef(null);
  const btnRefs = useRef({});
  // Which edges have more rail behind them. Drives the fades below — a tab row
  // that is silently cut off at the viewport edge reads as a rendering bug, and
  // this rail overflows at any width narrower than about 1500px.
  const [edges, setEdges] = useState({ left: false, right: false });
  // The sliding underline under the active tab. Plain measured offsets animated
  // with a CSS transition rather than framer-motion's layoutId: a layoutId FLIP
  // here shares framer-motion's global projection tree with the outer
  // AnimatePresence that animates whole-tab switches (App.jsx), and once this
  // indicator has run one shared-layout transition, leaving the SAT tab entirely
  // can wedge that unrelated AnimatePresence exit forever (onExitComplete never
  // fires, so the next tab never mounts — a blank screen). Measuring it by hand
  // keeps the same sliding-underline feel without touching that shared system.
  const [ink, setInk] = useState(null);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure, items.length]);

  useEffect(() => {
    const btn = btnRefs.current[active];
    if (!btn) { setInk(null); return; }
    setInk({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, items, m]);

  // A plain vertical mouse wheel should scroll this row horizontally; trackpads
  // already emit deltaX, so only take over a dominantly-vertical gesture. The
  // listener is attached natively and non-passively because React registers
  // wheel handlers as passive, which would make preventDefault() a no-op and
  // leave the page scrolling underneath the rail at the same time.
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

  // Keep the active tab visible when it changes programmatically (deep links,
  // the app tour) without dragging vertical scroll along — same rationale as
  // the shared SubNav this replaces.
  useEffect(() => {
    const el = scrollRef.current;
    const btn = btnRefs.current[active];
    if (!el || !btn) return;
    const elBox = el.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    if (btnBox.left < elBox.left) el.scrollBy({ left: btnBox.left - elBox.left - 24, behavior: 'smooth' });
    else if (btnBox.right > elBox.right) el.scrollBy({ left: btnBox.right - elBox.right + 24, behavior: 'smooth' });
  }, [active]);

  const byId = Object.fromEntries(items.map(it => [it.id, it]));
  const grouped = NAV_GROUPS
    .map(g => ({ ...g, items: g.ids.map(id => byId[id]).filter(Boolean) }))
    .filter(g => g.items.length > 0);
  const placed = new Set(grouped.flatMap(g => g.ids));
  const rest = items.filter(it => !placed.has(it.id));
  if (rest.length) grouped.push({ id: 'more', label: null, items: rest });

  return (
    <nav aria-label="SAT sections" style={{ marginBottom: m ? 14 : 20, position: 'relative' }}>
      <div
        ref={scrollRef}
        className="sat-nav-scroll"
        onScroll={measure}
        style={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          borderBottom: `1px solid ${C.b1}`, position: 'relative',
        }}
      >
        {ink && (
          <div
            aria-hidden
            style={{
              position: 'absolute', left: ink.left + (m ? 6 : 10), width: ink.width - (m ? 12 : 20),
              bottom: -1, height: 2, borderRadius: 2, background: accent,
              // No halo. The underline is already the only moving thing in the
              // header; a glow under it made the whole rail feel electric.
              boxShadow: `0 0 6px ${tint(accent, 0.25)}`,
              transition: 'left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1)',
            }}
          />
        )}
        {grouped.map((g, gi) => (
          <div key={g.id} style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
            {gi > 0 && (
              <div aria-hidden style={{ width: 1, alignSelf: 'center', height: 18, background: C.b1, margin: m ? '0 6px' : '0 12px' }} />
            )}
            {!m && g.label && (
              <span style={{
                alignSelf: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
                textTransform: 'uppercase', color: C.t4, marginRight: 8, userSelect: 'none', whiteSpace: 'nowrap',
              }}>
                {g.label}
              </span>
            )}
            {g.items.map(it => {
              const isActive = active === it.id;
              const Icon = it.ic || it.icon;
              const href = hrefFor ? hrefFor(it.id) : null;
              const Tab = href ? 'a' : 'button';
              return (
                <Tab
                  key={it.id}
                  ref={el => { btnRefs.current[it.id] = el; }}
                  data-tour={tourPrefix ? `${tourPrefix}-${it.id}` : undefined}
                  href={href || undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className="sat-nav-tab"
                  onClick={e => {
                    if (href) {
                      if (!isPlainLeftClick(e)) return;
                      e.preventDefault();
                    }
                    onChange(it.id);
                  }}
                  style={{
                    position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: m ? '10px 10px 12px' : '10px 13px 13px',
                    background: 'none', border: 'none', textDecoration: 'none',
                    color: isActive ? C.t1 : C.t3, fontWeight: isActive ? 700 : 500,
                    fontSize: m ? 12 : 12.5, fontFamily: C.FB, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '.005em',
                  }}
                >
                  {Icon && <Icon size={m ? 13 : 14} color={isActive ? accent : C.t4} strokeWidth={isActive ? 2.4 : 2} />}
                  {it.label}
                  {!!it.badge && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                      background: isActive ? accent : C.s4, color: isActive ? C.onAccent : C.t2,
                      fontSize: 9.5, fontWeight: 700, fontFamily: C.FM,
                    }}>
                      {it.badge}
                    </span>
                  )}
                </Tab>
              );
            })}
          </div>
        ))}
      </div>

      {/* Overflow fades. Pointer-events off so they never swallow a tab click,
          and inset above the rail's bottom border so the rule stays unbroken. */}
      {edges.left && (
        <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 1, width: 40, pointerEvents: 'none', background: `linear-gradient(90deg,${C.bg},transparent)` }} />
      )}
      {edges.right && (
        <div aria-hidden style={{ position: 'absolute', right: 0, top: 0, bottom: 1, width: 40, pointerEvents: 'none', background: `linear-gradient(270deg,${C.bg},transparent)` }} />
      )}
    </nav>
  );
}

/**
 * Page header for an SAT sub-view. Deliberately quieter than the app-wide
 * PanelHero: no gradient wash, no icon badge with a glow — an eyebrow, a
 * display title, one measured sentence, and metadata chips on the right.
 */
export function SatPageHeader({ eyebrow = 'SAT', title, sub, meta = [], right, m = false, tourTag, accent = C.sky }) {
  return (
    <header data-tour={tourTag} style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', padding: m ? '2px 2px 0' : '4px 2px 0',
    }}>
      <div style={{ minWidth: 220, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>
          {eyebrow}
        </div>
        <h2 style={{ fontSize: m ? 22 : 28, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: 0, lineHeight: 1.1 }}>
          {title}
        </h2>
        {sub && (
          <p style={{ fontSize: m ? 11.5 : 12.5, color: C.t3, margin: '7px 0 0', lineHeight: 1.65, maxWidth: 620 }}>
            {sub}
          </p>
        )}
      </div>
      {(meta.length > 0 || right) && (
        // On a phone the chips take their own row rather than sitting beside
        // the copy — sharing the line squeezes the subtitle into a ~230px
        // column and turns two sentences into six ragged lines.
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: m ? '100%' : undefined }}>
          {meta.map((s, i) => (
            <MetaChip key={i} color={s.color} value={s.value} label={s.label} />
          ))}
          {right}
        </div>
      )}
    </header>
  );
}

/** Small bordered stat chip used in headers — value in mono, label muted. */
export function MetaChip({ value, label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 6,
      padding: '6px 12px', borderRadius: 9,
      background: C.surf2, border: `1px solid ${color ? tint(color, 0.24) : C.b1}`,
    }}>
      {value != null && (
        <b style={{ fontSize: 14, fontWeight: 800, fontFamily: C.FM, color: color || C.t1, lineHeight: 1 }}>{value}</b>
      )}
      <span style={{ fontSize: 10.5, color: C.t3, fontWeight: 600 }}>{label}</span>
    </span>
  );
}

/**
 * Segmented control — one bordered track, the active segment filled. Replaces
 * rows of individually-bordered pill buttons, which read as a loose pile of
 * chips rather than one control with one answer selected.
 */
export function Segmented({ options, value, onChange, accent = C.sky, label, size = 'md' }) {
  const pad = size === 'sm' ? '5px 11px' : '7px 14px';
  const font = size === 'sm' ? 11 : 11.5;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      {label && (
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: C.t4, whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <div
        role="group"
        style={{
          display: 'inline-flex', padding: 3, gap: 2, borderRadius: 10,
          background: C.surf2, border: `1px solid ${C.b1}`, maxWidth: '100%', overflowX: 'auto',
        }}
        className="sat-nav-scroll"
      >
        {options.map(o => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={on}
              className="sat-seg"
              style={{
                padding: pad, borderRadius: 7, border: 'none', cursor: 'pointer',
                background: on ? tint(accent, 0.13) : 'transparent',
                boxShadow: on ? `inset 0 0 0 1px ${tint(accent, 0.28)}` : 'none',
                color: on ? C.t1 : C.t3, fontWeight: on ? 700 : 500,
                fontSize: font, fontFamily: C.FB, whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {o.label}
              {o.count != null && (
                <span style={{ marginLeft: 6, fontFamily: C.FM, fontSize: font - 1, color: on ? accent : C.t4 }}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The standard SAT content card. One border weight, one radius, an optional
 * titled header row with a hairline rule — the repetition is the point; a
 * screen of these reads as one designed system.
 */
export function SatCard({ title, icon: Icon, iconColor = C.sky, action, children, pad, m = false, style = {}, headerStyle = {} }) {
  const padding = pad ?? (m ? 16 : 22);
  return (
    <section style={{
      background: C.surf, border: `1px solid ${C.b1}`, borderRadius: 14,
      boxShadow: C.shadowSm, overflow: 'hidden', ...style,
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: `${m ? 12 : 14}px ${padding}px`, borderBottom: `1px solid ${C.b0}`, ...headerStyle,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {Icon && <Icon size={13} color={iconColor} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '.09em' }}>
              {title}
            </span>
          </span>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
