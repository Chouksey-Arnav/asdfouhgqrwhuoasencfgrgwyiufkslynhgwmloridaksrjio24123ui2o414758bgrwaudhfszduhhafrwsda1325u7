import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Check, ChevronRight } from 'lucide-react';
import { C, glass } from '../lib/theme';
import { eyebrow } from '../lib/tokens/type';
import { SP, RADIUS } from '../lib/tokens/space';
import {
  graduationYearChoices, graduationYearLabel, bandOfGrade, BAND_BY_ID, confirmationStamp,
} from '../lib/gradeBand';

// ─────────────────────────────────────────────────────────────────────────────
// The one-tap check-in on the first login of a new school year.
//
// ── Why it exists at all, given the rollover is automatic ────────────────────
// The grade advance itself needs no confirmation: it is arithmetic on a
// graduation year and a calendar, and it was already correct at 00:01 on
// August 1 with nobody doing anything. What the arithmetic cannot see is the
// student whose graduation year genuinely changed — held back, skipped ahead,
// graduated early, took a gap year. For them, every screen in the app is about
// to be wrong for ten months, and the app will never find out on its own.
//
// So once a year, at the exact moment the whole app's emphasis shifts under
// them, we show what we think and let them fix it in one tap. Not a form. Not
// a settings trip. One button that says "yes, that's me" and a second row of
// years for the small number of students for whom it isn't.
//
// ── Why it is not dismissible ────────────────────────────────────────────────
// Because "yes" IS the dismissal, and it takes one tap. A dismiss button here
// would just be a slower way to say yes that also leaves us not knowing. There
// is no third thing a student could want from this screen.
// ─────────────────────────────────────────────────────────────────────────────

export default function GradYearCheckIn({ user, onConfirm }) {
  const current = Number(user?.graduationYear);
  const [editing, setEditing] = useState(false);
  const { title, sub, gradeStage } = graduationYearLabel(current);
  const band = bandOfGrade(gradeStage);
  const meta = band ? BAND_BY_ID[band] : null;
  const choices = graduationYearChoices();
  const years = choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b);

  const confirm = (year) => onConfirm(confirmationStamp(year));

  return (
    <div style={{
      minHeight: 'var(--msp-vh)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: SP.lg, background: `radial-gradient(ellipse 90% 55% at 50% -10%, ${C.blue}18 0%, transparent 60%), ${C.bg}`,
      color: C.t1, fontFamily: C.FB,
    }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...glass({ padding: SP.xl }), maxWidth: 520, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            width: 48, height: 48, borderRadius: RADIUS.lg, background: `${C.blue}18`, border: `1px solid ${C.blue}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GraduationCap size={21} color={C.blueL} />
          </span>
          <div>
            <div style={{ ...eyebrow(11), fontWeight: 700, color: C.t3, fontFamily: C.FM }}>
              New school year
            </div>
            <h2 style={{ fontSize: 21, letterSpacing: 'calc(-0.34px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: '4px 0 0' }}>
              Still on track for {title}?
            </h2>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6, margin: '0 0 16px' }}>
          We've rolled your year forward — you're {sub}. {meta ? `${meta.focus} ` : ''}
          Everything in the app stays exactly where it was; this only changes what we put first.
        </p>

        {!editing ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => confirm(current)}
              style={{
                flex: '1 1 200px', padding: '16px 24px', borderRadius: RADIUS.md, border: 'none', cursor: 'pointer',
                background: C.oceanGrad, color: C.onAccent, fontSize: 14, fontWeight: 800, fontFamily: C.FB,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Check size={16} />That's right
            </motion.button>
            <button onClick={() => setEditing(true)}
              style={{
                flex: '1 1 160px', padding: '16px 24px', borderRadius: RADIUS.md, cursor: 'pointer',
                background: 'transparent', color: C.t2, border: `1px solid ${C.b2}`,
                fontSize: 13.5, fontWeight: 700, fontFamily: C.FB,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              My year changed<ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12.5, color: C.t3, marginBottom: 12, lineHeight: 1.55 }}>
              Pick the year you'll actually graduate. Nothing you've done is lost — your work,
              your streak and your portfolio all come with you.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {years.map(y => {
                const info = graduationYearLabel(y);
                return (
                  <button key={y} onClick={() => confirm(y)}
                    style={{
                      textAlign: 'left', padding: '12px 12px', borderRadius: RADIUS.md, cursor: 'pointer',
                      background: y === current ? `${C.blue}14` : C.s2,
                      border: `1px solid ${y === current ? `${C.blue}45` : C.b1}`,
                      color: C.t1, fontFamily: C.FB,
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: C.FM }}>{y}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{info.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
