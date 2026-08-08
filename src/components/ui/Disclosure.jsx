import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { C, glass, glass2, R, tint, accentText } from '../../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Progressive disclosure for Portfolio.
//
// The Portfolio tabs grew by accretion: every dashboard, gauge, filter row and
// breakdown that was ever worth building ended up on screen at the same time,
// all of it at the same visual weight. For a student opening it for the first
// time that is not "powerful", it is unreadable — there is no way to tell which
// of eleven blocks is the one they're supposed to act on.
//
// Nothing here deletes any of that. It moves the second-order material — the
// breakdowns, the full catalogs, the advanced filters — one tap behind a named
// door, so the first screen is the handful of things a student actually needs,
// and the depth is still exactly where a returning student left it (the open/
// closed state is remembered per section, per device).
// ─────────────────────────────────────────────────────────────────────────────

const KEY = (id) => `msp_disclosure_${id}`;

function readOpen(id, fallback) {
  try {
    const v = localStorage.getItem(KEY(id));
    return v == null ? fallback : v === '1';
  } catch { return fallback; }
}

/** Whether this student has ever opened or closed this particular door. */
function hasChoice(id) {
  try { return localStorage.getItem(KEY(id)) != null; } catch { return false; }
}

/**
 * A named, remembered "show more" section.
 *
 * @param id          stable key — the open/closed state is persisted under it
 * @param title       what's inside, in plain words ("Your numbers in detail")
 * @param sub         one line saying why someone would open it
 * @param defaultOpen whether it starts open the very first time it's seen
 */
export default function Disclosure({
  id, title, sub, icon: Icon, color = C.blue, defaultOpen = false, children, m = false,
}) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));

  // Until the student has actually opened or closed this door, it keeps following whatever the
  // caller says the default should be. That matters because callers derive `defaultOpen` from
  // data they are still fetching on the first render — "open the recommendations if the college
  // list is empty" is true for the one frame before the list arrives, and a door that latched
  // onto that frame would stand open for every student who has three schools already. Once they
  // choose, the choice is theirs and nothing overrides it.
  const chosen = useRef(hasChoice(id));
  useEffect(() => { if (!chosen.current) setOpen(defaultOpen); }, [defaultOpen]);

  function toggle() {
    chosen.current = true;
    setOpen((o) => {
      const next = !o;
      try { localStorage.setItem(KEY(id), next ? '1' : '0'); } catch { /* the memory is a nicety */ }
      return next;
    });
  }

  return (
    <div style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${open ? tint(color, 0.24) : C.b1}` }}>
      <button
        type="button" onClick={toggle} aria-expanded={open}
        style={{
          boxSizing: 'border-box', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit',
          cursor: 'pointer', background: open ? tint(color, 0.06) : 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 12, padding: m ? '13px 14px' : '15px 18px',
        }}
      >
        {Icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: tint(color, 0.14), border: `1px solid ${tint(color, 0.24)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} color={accentText(color)} />
          </div>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: m ? 13 : 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</span>
          {sub && <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.5 }}>{sub}</span>}
        </span>
        <span style={R({ gap: 6, flexShrink: 0, fontSize: 11, fontWeight: 700, color: accentText(color) })}>
          {open ? 'Hide' : 'Show'}
          <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex' }}><ChevronDown size={14} /></motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: m ? '0 14px 14px' : '0 18px 18px', borderTop: `1px solid ${C.b1}`, paddingTop: m ? 14 : 16 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * One plain-English line explaining the thing directly above or below it.
 * Deliberately quiet — it is for the student who doesn't know what they're
 * looking at, and invisible to the one who does.
 */
export function HelpNote({ children, color = C.t3, icon: Icon = HelpCircle }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
      <Icon size={12} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

/**
 * "How this works" — the numbered steps a tab runs on, said once, in order, at
 * the top. Dismissible, because it's for the first few visits and then it's
 * clutter; `id` is what remembers the dismissal.
 */
export function HowItWorks({ id, title = 'How this works', steps = [], color = C.violet, m = false }) {
  const [shown, setShown] = useState(() => readOpen(`how_${id}`, true));
  if (!shown || !steps.length) return null;

  function dismiss() {
    setShown(false);
    try { localStorage.setItem(KEY(`how_${id}`), '0'); } catch { /* nicety */ }
  }

  return (
    <div style={{
      ...glass2({ padding: m ? 13 : 15 }),
      background: `linear-gradient(120deg,${tint(color, 0.08)},rgba(255,255,255,0.02) 62%)`,
      border: `1px solid ${tint(color, 0.2)}`,
    }}>
      <div style={R({ gap: 8, marginBottom: 10, flexWrap: 'wrap' })}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: accentText(color) }}>{title}</span>
        <button type="button" onClick={dismiss}
          style={{ marginLeft: 'auto', all: 'unset', cursor: 'pointer', fontSize: 10.5, color: C.t4 }}>
          Got it
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : `repeat(${steps.length}, 1fr)`, gap: m ? 10 : 14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{
              width: 19, height: 19, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: tint(color, 0.18), border: `1px solid ${tint(color, 0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, fontFamily: C.FM, color: accentText(color),
            }}>{i + 1}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.t1 }}>{s.title}</span>
              <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 2, lineHeight: 1.5 }}>{s.body}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
