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
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Moon, Monitor, Type, Contrast, Zap, MousePointer2, Eye,
  RotateCcw, Check, Accessibility, AlignLeft, Sparkles, Info, SunMoon,
  MoonStar, CloudSun,
} from 'lucide-react';
import { C, DARK, LIGHT, BALANCED, BALANCED_LIGHT, glass, glass2, btn, btnG, R, CC, pill, tint, lbl, CONTROL_TRANSITION } from '../lib/theme';
import { DEFAULTS, FONT_SCALE_STEPS, systemReducedMotion, motionReduced } from '../lib/a11y';

// Which DEFAULTS keys belong to which card, so each card can show its own
// "customized" indicator and the reset flow can be verified key-by-key
// against exactly what's rendered — no setting silently falls outside both.
const CARD_KEYS = {
  text: ['fontScale', 'lineSpacing', 'letterSpacing', 'readableFont', 'boldText', 'readingWidth'],
  contrast: ['highContrast', 'reduceTransparency', 'underlineLinks', 'alwaysShowFocus'],
  motion: ['reduceMotion', 'hideDecorative'],
  pointer: ['largeTargets', 'cursorSize'],
};

// ── Small shared controls ────────────────────────────────────────────────────

function Toggle({ id, label, description, checked, onChange, accent = C.blue, badge }) {
  return (
    <div style={{ ...R({ justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }) }}>
      <label htmlFor={id} style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
        <div style={{ ...R({ gap: 8 }), marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD }}>{label}</span>
          {badge && <span style={pill(tint(accent, 0.14), accent, { fontSize: 9, padding: '4px 8px' })}>{badge}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>{description}</div>
      </label>
      {/* A real checkbox underneath: it carries the role, the label association
          and the keyboard behavior for free. The visible switch is the styling
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
          {/* The knob is white on the accent when on, which is right in every
              theme. Off, it sat on C.s4 — a light gray in the light themes, so
              a white knob on it was a switch with no visible thumb. */}
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: checked ? '#fff' : C.s1,
            border: checked ? 'none' : `1px solid ${C.b2}`,
            position: 'absolute', top: 3, left: 3,
            // translateX rather than `left`: the knob is the one thing on the
            // screen that moves on every settings tap, and `left` relayouts.
            transform: `translateX(${checked ? 20 : 0}px)`,
            transition: 'transform 140ms cubic-bezier(.4,0,.2,1)', boxShadow: C.shadowSm,
          }} />
        </div>
      </div>
    </div>
  );
}

function Segmented({ label, description, value, options, onChange, accent = C.blue }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{label}</div>
      {description && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 8 }}>{description}</div>}
      <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: 8, background: C.s2, border: `1px solid ${C.b1}` }}>
        {options.map(o => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)} role="radio" aria-checked={on}
              onClick={() => onChange(o.value)}
              style={{
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: on ? tint(accent, 0.18) : 'transparent',
                color: on ? accent : C.t3, fontSize: 12, fontWeight: on ? 700 : 600, fontFamily: C.FB,
                transition: CONTROL_TRANSITION,
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
      <div style={R({ justifyContent: 'space-between', marginBottom: 4 })}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: C.t1, fontFamily: C.FD }}>{label}</label>
        <span style={{ fontSize: 11, color: accent, fontFamily: C.FM, fontWeight: 700 }}>{format(value)}</span>
      </div>
      {description && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 8 }}>{description}</div>}
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent, height: 24, cursor: 'pointer' }}
      />
    </div>
  );
}

const Card = React.forwardRef(function Card({ icon: Icon, title, subtitle, hue, changed, onReset, children }, ref) {
  return (
    <div ref={ref} style={{ ...glass({ padding: 20 }), scrollMarginTop: 84 }}>
      <div style={{ ...R({ gap: 12, alignItems: 'flex-start' }), marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: tint(hue, 0.14), border: `1px solid ${tint(hue, 0.28)}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={15} color={hue} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={R({ gap: 8 })}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.01px + var(--msp-letter-spacing))' }}>{title}</span>
            {changed && (
              <span
                title="Customized from default"
                style={{ width: 6, height: 6, borderRadius: '50%', background: hue, flexShrink: 0 }}
              />
            )}
          </div>
          {subtitle && <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {changed && onReset && <CardResetButton hue={hue} onClick={onReset} />}
      </div>
      <div style={CC({ gap: 16 })}>{children}</div>
    </div>
  );
});

// ── Theme preview swatch ─────────────────────────────────────────────────────
// A miniature of the real thing, built from the actual DARK/LIGHT palettes
// rather than hand-picked hex, so it can never drift out of sync with what
// picking it will actually do.
function ThemePreview({ palette }) {
  return (
    <div style={{
      height: 66, borderRadius: 8, overflow: 'hidden', border: `1px solid ${palette.b2}`,
      background: palette.bg, display: 'flex', pointerEvents: 'none',
    }}>
      <div style={{ width: 26, background: palette.s0, borderRight: `1px solid ${palette.b1}`, padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 5, borderRadius: 4, background: palette.blue }} />
        <div style={{ height: 5, borderRadius: 4, background: palette.b3 }} />
        <div style={{ height: 5, borderRadius: 4, background: palette.b2 }} />
      </div>
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 7, width: '58%', borderRadius: 4, background: palette.t1 }} />
        <div style={{ height: 5, width: '82%', borderRadius: 4, background: palette.t3 }} />
        <div style={{ flex: 1, borderRadius: 4, background: palette.s2, border: `1px solid ${palette.b1}`, display: 'flex', alignItems: 'center', padding: '0px 4px', gap: 4 }}>
          <div style={{ width: 12, height: 5, borderRadius: 4, background: palette.violet }} />
          <div style={{ width: 18, height: 5, borderRadius: 4, background: palette.green }} />
          <div style={{ width: 10, height: 5, borderRadius: 4, background: palette.amber }} />
        </div>
      </div>
    </div>
  );
}

// Ordered as an actual brightness ramp, darkest to lightest, then "follow my
// device". Balanced used to be a single option, and it was a dark one — which
// meant a student who wanted a light interface had exactly one choice and it
// was the brightest surface the app can draw. There is now a middle on both
// sides of the line, and the order of the cards is the ramp itself:
//
//   Dark ── Balanced Dark ──┼── Balanced Light ── Light
const THEME_CHOICES = [
  { value: 'dark', label: 'Dark', icon: Moon, palette: DARK,
    note: 'Deepest. Easier at night and in dim rooms.' },
  { value: 'balanced', label: 'Balanced dark', icon: MoonStar, palette: BALANCED, badge: 'Default',
    note: 'A dusk slate — dark without the glare of a black screen. Best for long evening sessions.' },
  { value: 'balancedLight', label: 'Balanced light', icon: CloudSun, palette: BALANCED_LIGHT,
    note: 'A light interface with the brightness taken off — no white panels. Best for long daytime sessions.' },
  { value: 'light', label: 'Light', icon: Sun, palette: LIGHT,
    note: 'Brightest. Best in daylight and direct sun.' },
  { value: 'system', label: 'Match device', icon: Monitor, palette: null,
    note: 'Follows your device — Balanced Light by day, Balanced Dark at night.' },
];

// A function, not a literal: a module-level array would snapshot `C` at import
// time and keep painting the previous theme's hues after a switch. Same reason
// catMeta() in lib/theme.js is computed per call.
const navSections = () => [
  { id: 'theme', label: 'Theme', icon: Sun, hue: C.amber },
  { id: 'text', label: 'Text & reading', icon: Type, hue: C.blue },
  { id: 'contrast', label: 'Contrast', icon: Contrast, hue: C.violet },
  { id: 'motion', label: 'Motion', icon: Zap, hue: C.cyan },
  { id: 'pointer', label: 'Pointer & touch', icon: MousePointer2, hue: C.green },
];

// A tiny ghost button offered on any card that's drifted from default —
// resets just that card's settings, so fixing one overcorrected slider
// doesn't force wiping every other choice the student made on purpose.
function CardResetButton({ hue, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8,
        border: `1px solid ${tint(hue, 0.3)}`, background: 'transparent', color: hue,
        fontSize: 10.5, fontWeight: 700, fontFamily: C.FB, cursor: 'pointer', flexShrink: 0,
      }}
    >
      <RotateCcw size={10} />Reset section
    </button>
  );
}

export default function AppearanceSettings({ settings, onChange, isMobile = false, accent = C.blue }) {
  const s = { ...DEFAULTS, ...settings };
  const [justReset, setJustReset] = useState(false);
  const set = (patch) => onChange(patch);
  const sectionRefs = useRef({});

  const reset = () => {
    onChange({ ...DEFAULTS, themeMode: s.themeMode });
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 2000);
  };

  const resetCard = (id) => {
    const keys = CARD_KEYS[id];
    if (!keys) return;
    onChange(Object.fromEntries(keys.map(k => [k, DEFAULTS[k]])));
  };

  const cardChanged = (id) => (CARD_KEYS[id] || []).some(k => s[k] !== DEFAULTS[k]);

  const changedCount = Object.keys(DEFAULTS)
    .filter(k => k !== 'themeMode')
    .filter(k => s[k] !== DEFAULTS[k]).length;

  const jumpTo = (id) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: motionReduced({ reduceMotion: s.reduceMotion }) ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div style={CC({ gap: 16 })}>

      {/* ── Intro + quick jump ───────────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, marginBottom: 12 }}>
          Every control below applies immediately and stays saved on this device. Jump to a section:
        </p>
        <div role="tablist" aria-label="Jump to accessibility section" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {navSections().map(sec => {
            const Icon = sec.icon;
            const on = cardChanged(sec.id);
            return (
              <button
                key={sec.id} type="button" onClick={() => jumpTo(sec.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8,
                  border: `1px solid ${on ? tint(sec.hue, 0.35) : C.b1}`, background: on ? tint(sec.hue, 0.1) : C.s2,
                  color: on ? sec.hue : C.t2, fontSize: 11.5, fontWeight: 600, fontFamily: C.FB, cursor: 'pointer',
                }}
              >
                <Icon size={11} />{sec.label}
                {on && <span style={{ width: 5, height: 5, borderRadius: '50%', background: sec.hue }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Theme ─────────────────────────────────────────────────────────── */}
      <Card
        ref={el => { sectionRefs.current.theme = el; }}
        icon={Sun} hue={C.amber}
        title="Theme"
        subtitle="Every theme is fully built out — panels, charts, AI answers and question surfaces are designed for each. The two Balanced themes are the comfortable middle of each side; Dark and Light are the ends of the range if you want them."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(184px,1fr))', gap: 12 }}>
          {THEME_CHOICES.map(choice => {
            const on = s.themeMode === choice.value;
            const Icon = choice.icon;
            // "Match device" has no palette of its own — show whichever it is
            // resolving to right now so the card isn't a blank. It resolves to
            // the Balanced variant on either side, never to an end of the ramp
            // (see resolveMode).
            const palette = choice.palette
              || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? BALANCED_LIGHT : BALANCED);
            return (
              <button
                key={choice.value}
                onClick={() => set({ themeMode: choice.value })}
                aria-pressed={on}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${on ? accent : C.b1}`,
                  background: on ? tint(accent, 0.07) : C.surf2,
                  transition: 'border-color .18s, background .18s',
                  fontFamily: C.FB,
                }}
              >
                <ThemePreview palette={palette} />
                <div style={{ ...R({ justifyContent: 'space-between' }), marginTop: 8 }}>
                  <div style={R({ gap: 4 })}>
                    <Icon size={13} color={on ? accent : C.t3} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: on ? C.t1 : C.t2 }}>{choice.label}</span>
                    {choice.badge && (
                      <span style={pill(tint(accent, 0.13), accent, { fontSize: 8.5, padding: '4px 4px', letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' })}>
                        {choice.badge}
                      </span>
                    )}
                  </div>
                  {on && <Check size={14} color={accent} />}
                </div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{choice.note}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Text & reading ────────────────────────────────────────────────── */}
      <Card
        ref={el => { sectionRefs.current.text = el; }}
        icon={Type} hue={C.blue}
        title="Text & reading"
        subtitle="Scaling resizes the whole interface, not just the words — buttons, icons and spacing grow with it."
        changed={cardChanged('text')} onReset={() => resetCard('text')}
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
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.FD, color: C.t1, marginBottom: 4, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))' }}>
              The passage below is set at your current settings
            </div>
            <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55 }}>
              A researcher studying sleep in adolescents found that students who kept a consistent bedtime scored
              higher on tests of working memory than those whose sleep varied night to night — even when total
              hours slept were the same.
            </p>
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
              <span style={pill(tint(C.violet, 0.14), C.violetL)}>A chip</span>
              <span style={pill(tint(C.green, 0.14), C.greenL)}>Correct</span>
              <button style={btn(C.blueGrad, { padding: '8px 16px', fontSize: 12 })}>A button</button>
              <button style={btnG({ padding: '8px 16px', fontSize: 12 })}>Secondary</button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Contrast & visibility ─────────────────────────────────────────── */}
      <Card
        ref={el => { sectionRefs.current.contrast = el; }}
        icon={Contrast} hue={C.violet}
        title="Contrast & visibility"
        subtitle="For low vision, glare, bright rooms, or screens that wash out."
        changed={cardChanged('contrast')} onReset={() => resetCard('contrast')}
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
          description="Marks links with an underline instead of color alone, so they're identifiable if colors are hard to tell apart."
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
        ref={el => { sectionRefs.current.motion = el; }}
        icon={Zap} hue={C.cyan}
        title="Motion & effects"
        subtitle="For motion sensitivity, vestibular conditions, or simply fewer distractions while studying."
        changed={cardChanged('motion')} onReset={() => resetCard('motion')}
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
          description="Removes the ambient color glow and film grain behind the app. Also worth turning on if your device feels sluggish."
          checked={s.hideDecorative} onChange={v => set({ hideDecorative: v })}
        />
      </Card>

      {/* ── Pointer & touch ───────────────────────────────────────────────── */}
      <Card
        ref={el => { sectionRefs.current.pointer = el; }}
        icon={MousePointer2} hue={C.green}
        title="Pointer & touch"
        subtitle="For tremor, limited dexterity, or using the app one-handed on a phone."
        changed={cardChanged('pointer')} onReset={() => resetCard('pointer')}
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
      <div style={{ ...glass({ padding: 16 }), ...R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }) }}>
        <div style={R({ gap: 12, alignItems: 'flex-start' })}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: tint(C.t3, 0.14), border: `1px solid ${tint(C.t3, 0.28)}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Accessibility size={15} color={C.t2} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
              {changedCount === 0 ? 'Everything is at its default' : `${changedCount} setting${changedCount === 1 ? '' : 's'} changed from default`}
            </div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>These apply on this device and stay put between sessions. Your theme choice is left as-is — reset just one card with its own "Reset section" button, or clear everything else here.</div>
          </div>
        </div>
        <button
          onClick={reset} disabled={changedCount === 0}
          style={btnG({ fontSize: 12.5, padding: '8px 16px', opacity: changedCount === 0 ? 0.4 : 1, cursor: changedCount === 0 ? 'default' : 'pointer', flexShrink: 0 })}
        >
          {justReset ? <><Check size={13} /> Reset</> : <><RotateCcw size={13} /> Reset everything</>}
        </button>
      </div>
    </div>
  );
}
