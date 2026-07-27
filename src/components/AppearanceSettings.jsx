// ─────────────────────────────────────────────────────────────────────────────
// Appearance & Accessibility settings.
//
// Split out of App.jsx's tSettings() because it's the one settings group with
// real UI of its own — theme previews, a live sample surface, sliders — and
// inlining ~400 lines of it into an already-16k-line file helps nobody.
//
// Two principles shaped the layout:
//
//   1. Every control shows its effect immediately and in place. Accessibility
//      settings are the ones a student is least able to evaluate from a label:
//      "line spacing 1.3" means nothing, a paragraph that visibly opens up
//      means everything. So the theme picker renders miniature previews of the
//      actual palettes, and a live sample card sits under the typography
//      controls showing real components at the current settings.
//   2. Nothing is buried behind a "show advanced". A student who needs larger
//      tap targets is exactly the student least able to hunt for them.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Moon, Monitor, Type, Contrast, Zap, MousePointer2, Eye,
  RotateCcw, Check, Accessibility, AlignLeft, Sparkles, Info,
} from 'lucide-react';
import { C, DARK, LIGHT, glass, glass2, btn, btnG, R, CC, pill, tint, lbl } from '../lib/theme';
import { DEFAULTS, FONT_SCALE_STEPS, systemReducedMotion } from '../lib/a11y';

// ── Small shared controls ────────────────────────────────────────────────────

function Toggle({ id, label, description, checked, onChange, accent = C.blue, badge }) {
  return (
    <div style={{ ...R({ justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }) }}>
      <label htmlFor={id} style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
        <div style={{ ...R({ gap: 7 }), marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD }}>{label}</span>
          {badge && <span style={pill(tint(accent, 0.14), accent, { fontSize: 9, padding: '1px 7px' })}>{badge}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>{description}</div>
      </label>
      {/* A real checkbox underneath: it carries the role, the label association
          and the keyboard behaviour for free. The visible switch is the styling
          on top of it, which is the only reliable way to get both. */}
      <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 24 }}>
        <input
          id={id} type="checkbox" role="switch" checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0, zIndex: 2 }}
        />
        <div style={{
          width: 44, height: 24, borderRadius: 12, pointerEvents: 'none',
          background: checked ? accent : C.s4,
          border: `1px solid ${checked ? accent : C.b2}`,
          transition: 'background .2s, border-color .2s',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3, left: checked ? 23 : 3,
            transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          }} />
        </div>
      </div>
    </div>
  );
}

function Segmented({ label, description, value, options, onChange, accent = C.blue }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD, marginBottom: 2 }}>{label}</div>
      {description && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 9 }}>{description}</div>}
      <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3, padding: 3, borderRadius: 10, background: C.s2, border: `1px solid ${C.b1}` }}>
        {options.map(o => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)} role="radio" aria-checked={on}
              onClick={() => onChange(o.value)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: on ? tint(accent, 0.18) : 'transparent',
                color: on ? accent : C.t3, fontSize: 12, fontWeight: on ? 700 : 600, fontFamily: C.FB,
                transition: 'all .15s',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Slider({ label, description, value, min, max, step, onChange, format, accent = C.blue }) {
  const id = `msp-slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div style={R({ justifyContent: 'space-between', marginBottom: 2 })}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD }}>{label}</label>
        <span style={{ fontSize: 11, color: accent, fontFamily: C.FM, fontWeight: 700 }}>{format(value)}</span>
      </div>
      {description && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 9 }}>{description}</div>}
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent, height: 24, cursor: 'pointer' }}
      />
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, hue, children }) {
  return (
    <div style={glass({ padding: 20 })}>
      <div style={{ ...R({ gap: 11, alignItems: 'flex-start' }), marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(hue, 0.14), border: `1px solid ${tint(hue, 0.28)}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={15} color={hue} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, letterSpacing: '-.01em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={CC({ gap: 18 })}>{children}</div>
    </div>
  );
}

// ── Theme preview swatch ─────────────────────────────────────────────────────
// A miniature of the real thing, built from the actual DARK/LIGHT palettes
// rather than hand-picked hex, so it can never drift out of sync with what
// picking it will actually do.
function ThemePreview({ palette }) {
  return (
    <div style={{
      height: 66, borderRadius: 10, overflow: 'hidden', border: `1px solid ${palette.b2}`,
      background: palette.bg, display: 'flex', pointerEvents: 'none',
    }}>
      <div style={{ width: 26, background: palette.s0, borderRight: `1px solid ${palette.b1}`, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 5, borderRadius: 2, background: palette.blue }} />
        <div style={{ height: 5, borderRadius: 2, background: palette.b3 }} />
        <div style={{ height: 5, borderRadius: 2, background: palette.b2 }} />
      </div>
      <div style={{ flex: 1, padding: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 7, width: '58%', borderRadius: 3, background: palette.t1 }} />
        <div style={{ height: 5, width: '82%', borderRadius: 3, background: palette.t3 }} />
        <div style={{ flex: 1, borderRadius: 6, background: palette.s2, border: `1px solid ${palette.b1}`, display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
          <div style={{ width: 12, height: 5, borderRadius: 3, background: palette.violet }} />
          <div style={{ width: 18, height: 5, borderRadius: 3, background: palette.green }} />
          <div style={{ width: 10, height: 5, borderRadius: 3, background: palette.amber }} />
        </div>
      </div>
    </div>
  );
}

const THEME_CHOICES = [
  { value: 'dark',   label: 'Dark',        icon: Moon,    palette: DARK,  note: 'Easier at night and in dim rooms' },
  { value: 'light',  label: 'Light',       icon: Sun,     palette: LIGHT, note: 'Better in daylight and for long reading' },
  { value: 'system', label: 'Match device', icon: Monitor, palette: null,  note: 'Follows your phone or computer' },
];

export default function AppearanceSettings({ settings, onChange, isMobile = false, accent = C.blue }) {
  const s = { ...DEFAULTS, ...settings };
  const [justReset, setJustReset] = useState(false);
  const set = (patch) => onChange(patch);

  const reset = () => {
    onChange({ ...DEFAULTS, themeMode: s.themeMode });
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 2000);
  };

  const changedCount = Object.keys(DEFAULTS)
    .filter(k => k !== 'themeMode')
    .filter(k => s[k] !== DEFAULTS[k]).length;

  return (
    <div style={CC({ gap: 16 })}>

      {/* ── Theme ─────────────────────────────────────────────────────────── */}
      <Card
        icon={Sun} hue={C.amber}
        title="Theme"
        subtitle="Both themes are fully built out — every panel, chart and question surface is designed for each."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
          {THEME_CHOICES.map(choice => {
            const on = s.themeMode === choice.value;
            const Icon = choice.icon;
            // "Match device" has no palette of its own — show whichever it is
            // resolving to right now so the card isn't a blank.
            const palette = choice.palette
              || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? LIGHT : DARK);
            return (
              <button
                key={choice.value}
                onClick={() => set({ themeMode: choice.value })}
                aria-pressed={on}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${on ? accent : C.b1}`,
                  background: on ? tint(accent, 0.07) : C.surf2,
                  transition: 'border-color .18s, background .18s',
                  fontFamily: C.FB,
                }}
              >
                <ThemePreview palette={palette} />
                <div style={{ ...R({ justifyContent: 'space-between' }), marginTop: 10 }}>
                  <div style={R({ gap: 6 })}>
                    <Icon size={13} color={on ? accent : C.t3} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: on ? C.t1 : C.t2 }}>{choice.label}</span>
                  </div>
                  {on && <Check size={14} color={accent} />}
                </div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.45 }}>{choice.note}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Text & reading ────────────────────────────────────────────────── */}
      <Card
        icon={Type} hue={C.blue}
        title="Text & reading"
        subtitle="Scaling resizes the whole interface, not just the words — buttons, icons and spacing grow with it."
      >
        <Segmented
          label="Interface size"
          description="Everything gets proportionally bigger. Useful on a small laptop or if you sit far from the screen."
          value={s.fontScale}
          options={FONT_SCALE_STEPS}
          onChange={v => set({ fontScale: v })}
          accent={accent}
        />

        <Slider
          label="Line spacing" description="More air between lines makes long passages easier to track."
          value={s.lineSpacing} min={1} max={1.6} step={0.1}
          onChange={v => set({ lineSpacing: v })}
          format={v => `${v.toFixed(1)}×`} accent={accent}
        />

        <Slider
          label="Letter spacing" description="Slight extra spacing between characters helps if letters crowd together when you read."
          value={s.letterSpacing} min={0} max={0.12} step={0.01}
          onChange={v => set({ letterSpacing: v })}
          format={v => (v === 0 ? 'Normal' : `+${(v * 100).toFixed(0)}%`)} accent={accent}
        />

        <Toggle
          id="a11y-readable-font" accent={accent}
          label="Easier-to-read typeface"
          description="Switches to a high-legibility font with wide letterforms and clearly distinct letters, plus extra spacing between words."
          checked={s.readableFont} onChange={v => set({ readableFont: v })}
        />

        <Toggle
          id="a11y-bold-text" accent={accent}
          label="Heavier text"
          description="Thickens body text throughout, like the iOS and Android setting of the same name."
          checked={s.boldText} onChange={v => set({ boldText: v })}
        />

        <Toggle
          id="a11y-reading-width" accent={accent}
          label="Narrower reading column"
          description="Caps long articles and lesson text at a comfortable line length instead of running the full width of a wide screen."
          checked={s.readingWidth} onChange={v => set({ readingWidth: v })}
        />

        {/* Live sample — every control above applies to it in real time. */}
        <div>
          <span style={lbl()}>Live preview</span>
          <div className="msp-prose" style={{ ...glass2({ padding: 16 }), background: C.s2 }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.FD, color: C.t1, marginBottom: 6, letterSpacing: '-.02em' }}>
              The passage below is set at your current settings
            </div>
            <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.75 }}>
              A researcher studying sleep in adolescents found that students who kept a consistent bedtime scored
              higher on tests of working memory than those whose sleep varied night to night — even when total
              hours slept were the same.
            </p>
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
              <span style={pill(tint(C.violet, 0.14), C.violetL)}>A chip</span>
              <span style={pill(tint(C.green, 0.14), C.greenL)}>Correct</span>
              <button style={btn(C.blueGrad, { padding: '7px 16px', fontSize: 12 })}>A button</button>
              <button style={btnG({ padding: '7px 16px', fontSize: 12 })}>Secondary</button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Contrast & visibility ─────────────────────────────────────────── */}
      <Card
        icon={Contrast} hue={C.violet}
        title="Contrast & visibility"
        subtitle="For low vision, glare, bright rooms, or screens that wash out."
      >
        <Toggle
          id="a11y-high-contrast" accent={C.violet}
          label="High contrast" badge="Strong"
          description="Pushes text to maximum contrast, hardens every border so structure is visible without relying on subtle fills, and makes translucent panels solid."
          checked={s.highContrast} onChange={v => set({ highContrast: v })}
        />
        <Toggle
          id="a11y-reduce-transparency" accent={C.violet}
          label="Reduce transparency"
          description="Turns off the frosted-glass effect. Text on a blurred panel changes contrast as the page scrolls underneath it — this stops that."
          checked={s.reduceTransparency} onChange={v => set({ reduceTransparency: v })}
        />
        <Toggle
          id="a11y-underline-links" accent={C.violet}
          label="Underline links"
          description="Marks links with an underline instead of colour alone, so they're identifiable if colours are hard to tell apart."
          checked={s.underlineLinks} onChange={v => set({ underlineLinks: v })}
        />
        <Toggle
          id="a11y-focus" accent={C.violet}
          label="Always show focus outline"
          description="Normally the focus ring only appears when you navigate by keyboard. Turn this on to see it whatever you're using — including switch access and eye tracking."
          checked={s.alwaysShowFocus} onChange={v => set({ alwaysShowFocus: v })}
        />
      </Card>

      {/* ── Motion ────────────────────────────────────────────────────────── */}
      <Card
        icon={Zap} hue={C.cyan}
        title="Motion & effects"
        subtitle="For motion sensitivity, vestibular conditions, or simply fewer distractions while studying."
      >
        <Segmented
          label="Animation"
          description={`Controls transitions, sliding panels and the drifting background. Your device is currently set to "${systemReducedMotion() ? 'reduce motion' : 'allow motion'}".`}
          value={s.reduceMotion}
          options={[
            { value: 'system', label: 'Match device' },
            { value: 'on', label: 'Reduce' },
            { value: 'off', label: 'Full' },
          ]}
          onChange={v => set({ reduceMotion: v })}
          accent={C.cyan}
        />
        <Toggle
          id="a11y-hide-decorative" accent={C.cyan}
          label="Hide decorative background"
          description="Removes the ambient colour glow and film grain behind the app. Also worth turning on if your device feels sluggish."
          checked={s.hideDecorative} onChange={v => set({ hideDecorative: v })}
        />
      </Card>

      {/* ── Pointer & touch ───────────────────────────────────────────────── */}
      <Card
        icon={MousePointer2} hue={C.green}
        title="Pointer & touch"
        subtitle="For tremor, limited dexterity, or using the app one-handed on a phone."
      >
        <Toggle
          id="a11y-large-targets" accent={C.green}
          label="Larger tap targets"
          description="Grows every button, tab and checkbox to at least 44×44px — the size Apple and Google both recommend as a floor."
          checked={s.largeTargets} onChange={v => set({ largeTargets: v })}
        />
        <Segmented
          label="Pointer size"
          description="Makes the mouse cursor considerably larger and higher contrast."
          value={s.cursorSize}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]}
          onChange={v => set({ cursorSize: v })}
          accent={C.green}
        />
      </Card>

      {/* ── Reset ─────────────────────────────────────────────────────────── */}
      <div style={{ ...glass2({ padding: 16 }), ...R({ justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }) }}>
        <div style={R({ gap: 10, alignItems: 'flex-start' })}>
          <Accessibility size={16} color={C.t3} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t2 }}>
              {changedCount === 0 ? 'Everything is at its default' : `${changedCount} setting${changedCount === 1 ? '' : 's'} changed from default`}
            </div>
            <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>These apply on this device and stay put between sessions.</div>
          </div>
        </div>
        <button
          onClick={reset} disabled={changedCount === 0}
          style={btnG({ fontSize: 12, padding: '8px 16px', opacity: changedCount === 0 ? 0.4 : 1, cursor: changedCount === 0 ? 'default' : 'pointer' })}
        >
          {justReset ? <><Check size={13} /> Reset</> : <><RotateCcw size={13} /> Reset to defaults</>}
        </button>
      </div>
    </div>
  );
}
