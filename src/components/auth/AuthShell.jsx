import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { C, glass, tint } from '../../lib/theme';
import AnimatedLogo from '../AnimatedLogo';
import ThemeToggle from '../ThemeToggle';

// Three lines, not three paragraphs. The brand panel is read in the two seconds
// before someone starts typing an email — it is a reason to keep going, not a
// features page, and the version this replaced ran to ~40 words a bullet.
// The claim about ads stays explicit: the product does serve Google AdSense
// (see index.html), so "free" here has to say what pays for it rather than
// implying nothing does.
const HIGHLIGHTS = [
  { icon: GraduationCap, hue: () => C.blue,   title: '10 health careers', desc: 'Matched to you, not assumed.' },
  { icon: Sparkles,      hue: () => C.violet, title: 'Your whole application', desc: 'Colleges, essays, deadlines, scores.' },
  { icon: ShieldCheck,   hue: () => C.green,  title: 'Free — nothing paywalled', desc: 'Ads keep it free, never personalised.' },
];

function BrandPanel() {
  return (
    <div className="msp-auth-brand" style={{
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 'clamp(40px,6vw,88px)', background: `linear-gradient(160deg,${C.s0} 0%,${C.bg} 60%)`,
      borderRight: `1px solid ${C.b1}`, overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 50% at 20% 10%, ${tint(C.blue, 0.14)} 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 90%, ${tint(C.cyan, 0.09)} 0%, transparent 55%)`,
      }} />
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <AnimatedLogo size={38} variant="pop" />
          <div>
            <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</div>
            <div style={{ fontSize: 9.5, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>Your path into medicine</div>
          </div>
        </div>

        <h1 style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 'clamp(26px,2.6vw,34px)', letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.15, color: C.t1, margin: 0 }}>
          Find your path into medicine.<br />
          <span style={{ backgroundImage: `linear-gradient(135deg,${C.blue},${C.cyan})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Then actually walk it.</span>
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 44 }}>
          {HIGHLIGHTS.map(({ icon: Icon, hue, title, desc }) => {
            const c = hue();
            return (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: tint(c, 0.13), border: `1px solid ${tint(c, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color={c} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: C.t3 }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Split-screen shell used by every auth screen (log in / sign up / forgot password):
// a branded panel on wide viewports (hidden under 900px via CSS, see index.css) and a
// scrollable, vertically-centered form column that fills the rest of the viewport on
// every screen size, from phones up to ultrawide desktop monitors.
//
// The theme toggle is pinned to the form column rather than the brand panel so it
// survives the 900px breakpoint that hides the panel — a phone is exactly where
// someone is most likely to want the other palette.
export default function AuthShell({ children, themeMode, onThemeChange }) {
  return (
    <div className="msp-auth-shell">
      <BrandPanel />
      <div className="msp-auth-form-col" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {onThemeChange && (
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 5 }}>
            <ThemeToggle mode={themeMode} onChange={onThemeChange} align="right" />
          </div>
        )}
        <div style={{ width: '100%', maxWidth: 420, padding: '32px 24px', margin: 'auto 0' }}>
          <motion.div key={typeof children === 'object' && children?.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={glass({ padding: 32 })}>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
