import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { C, glass } from '../../lib/theme';
import AnimatedLogo from '../AnimatedLogo';

const HIGHLIGHTS = [
  { icon: GraduationCap, title: '10 health career pathways', desc: 'Physician, Nursing, PA, Pharmacy, Dentistry, and more — matched to you, not assumed.' },
  { icon: Sparkles, title: 'A full application portfolio', desc: 'College list, essays, deadlines, activities, and test scores, all synced to your account.' },
  { icon: ShieldCheck, title: '100% free, no ads', desc: 'Every lesson, flashcard deck, and portfolio tool — free for good.' },
];

function BrandPanel() {
  return (
    <div className="msp-auth-brand" style={{
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 'clamp(40px,6vw,88px)', background: 'linear-gradient(160deg,#070c18 0%,#04060b 60%)',
      borderRight: `1px solid ${C.b1}`, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(45,127,255,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 90%, rgba(6,182,212,0.08) 0%, transparent 55%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <AnimatedLogo size={38} variant="pop" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</div>
            <div style={{ fontSize: 9.5, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>Your path into medicine</div>
          </div>
        </div>

        <h1 style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 'clamp(26px,2.6vw,34px)', letterSpacing: '-0.03em', lineHeight: 1.15, color: C.t1, margin: 0 }}>
          Find your path into medicine.<br />
          <span style={{ backgroundImage: 'linear-gradient(135deg,#5da0ff,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Then actually walk it.</span>
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 44 }}>
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={C.blueL} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Split-screen shell used by every auth screen (log in / sign up / forgot password):
// a branded panel on wide viewports (hidden under 900px via CSS, see index.css) and a
// scrollable, vertically-centered form column that fills the rest of the viewport on
// every screen size, from phones up to ultrawide desktop monitors.
export default function AuthShell({ children }) {
  return (
    <div className="msp-auth-shell">
      <BrandPanel />
      <div className="msp-auth-form-col" style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '32px 24px', margin: 'auto 0' }}>
          <motion.div key={typeof children === 'object' && children?.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={glass({ padding: 32 })}>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
