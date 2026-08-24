// ─────────────────────────────────────────────────────────────────────────────
// The theme control, as a single button the student can actually find.
//
// Every palette in this app has existed for a while, but the only way to reach
// them was Settings → Appearance → scroll — which is to say the theme was
// effectively chosen by us, not by the student. This is the same picker,
// surfaced everywhere the app has chrome: the landing page nav, the auth
// screens, the desktop sidebar, and the mobile header. Someone who dislikes the
// theme they were given should never have to go looking for the setting.
//
// It renders as an icon button (the current mode's glyph) that opens a short
// labeled menu. Icon-only at rest is deliberate — this sits in the densest
// part of the chrome, and a fifth word up there is exactly the kind of text
// this app has too much of.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Moon, MoonStar, CloudSun, Sun, Monitor, Check } from 'lucide-react';
import { C, tint } from '../lib/theme';

// The same ramp, in the same order, as the full picker in AppearanceSettings:
// darkest → lightest, then "follow my device".
export const THEME_OPTIONS = [
  { value: 'dark',          label: 'Dark',           icon: Moon,     hint: 'Deepest' },
  { value: 'balanced',      label: 'Balanced dark',  icon: MoonStar, hint: 'Default' },
  { value: 'balancedLight', label: 'Balanced light', icon: CloudSun, hint: 'Softer light' },
  { value: 'light',         label: 'Light',          icon: Sun,      hint: 'Brightest' },
  { value: 'system',        label: 'Match device',   icon: Monitor,  hint: 'Follows your OS' },
];

const optionFor = (mode) => THEME_OPTIONS.find(o => o.value === mode) || THEME_OPTIONS[1];

/**
 * @param {string}   mode      The stored theme mode ('balanced' | 'light' | 'system' | …).
 * @param {Function} onChange  Called with the newly picked mode.
 * @param {number}   size      Button edge length; the menu scales off the same tokens.
 * @param {string}   align     'left' | 'right' — which edge of the button the menu hangs from.
 * @param {string}   placement 'below' | 'above' — for the toggle pinned to the bottom of a sidebar.
 */
export default function ThemeToggle({ mode = 'balanced', onChange, size = 34, align = 'right', placement = 'below', accent = C.blue }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = optionFor(mode);
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return undefined;
    // Pointerdown rather than click: a click listener fires after the button
    // that opened the menu has already re-rendered, which on some browsers
    // reopens it immediately.
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (value) => { setOpen(false); onChange?.(value); };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Change theme`}
        title={`Theme: ${current.label}`}
        style={{
          width: size, height: size, borderRadius: 8, flexShrink: 0,
          background: open ? tint(accent, 0.14) : C.surfHi,
          border: `1px solid ${open ? tint(accent, 0.35) : C.b1}`,
          color: open ? accent : C.t2,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          transition: 'background .15s, border-color .15s, color .15s',
        }}
      >
        <Icon size={Math.round(size * 0.45)} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          style={{
            position: 'absolute',
            [placement === 'above' ? 'bottom' : 'top']: size + 8,
            [align === 'left' ? 'left' : 'right']: 0,
            zIndex: 400,
            minWidth: 210,
            padding: 4,
            borderRadius: 12,
            background: C.s1,
            border: `1px solid ${C.b2}`,
            boxShadow: C.shadow,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {THEME_OPTIONS.map(o => {
            const on = o.value === mode;
            const OIcon = o.icon;
            return (
              <button
                key={o.value}
                role="menuitemradio"
                aria-checked={on}
                onClick={() => pick(o.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
                  border: 'none', textAlign: 'left', fontFamily: C.FB,
                  background: on ? tint(accent, 0.12) : 'transparent',
                  color: on ? C.t1 : C.t2,
                }}
              >
                <OIcon size={14} color={on ? accent : C.t3} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: on ? 700 : 500 }}>{o.label}</span>
                <span style={{ fontSize: 10, color: C.t4, flexShrink: 0 }}>{o.hint}</span>
                {on && <Check size={13} color={accent} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
