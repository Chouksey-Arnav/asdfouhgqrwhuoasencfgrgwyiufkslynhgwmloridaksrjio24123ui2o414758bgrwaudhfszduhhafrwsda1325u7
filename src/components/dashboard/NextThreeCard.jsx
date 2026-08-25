// ─────────────────────────────────────────────────────────────────────────────
// Module 1 — Next three things.
//
// The most prominent block on the dashboard, and the only one that answers
// "what do I do in the next twenty minutes" rather than "how am I doing".
// Everything below it on this screen is context; this is the decision.
//
// The ranking lives in src/lib/nextThree.js (urgency × impact, capped at three,
// verified by scripts/verifyNextThree.mjs). This file is only the rendering,
// and the rendering has two rules of its own:
//
//   Every row states a concrete denominator. "3 of 5 clinical requirements
//   complete" is legible to a seventeen-year-old and to an admissions officer.
//   "450 XP" is legible to neither, and a progress bar with no numbers on it
//   is a picture of a number rather than a number.
//
//   Rank is shown as 1/2/3, not as a score. The student does not need to know
//   that the engine scored something 0.62; they need to know it is the first
//   thing to do. Exposing the arithmetic invites arguing with it.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, CalendarClock, Clock, Layers3, Route, ClipboardList, CheckCircle2,
} from 'lucide-react';
import { C, glass, glass2, CC, R, pill, tint, eyebrow } from '../../lib/theme';

// One icon and one accent per candidate family, so a student learns the shape
// of "this is a deadline" versus "this is hours" without reading the label.
const FAMILY = {
  deadline:   { Icon: CalendarClock,  color: C.rose,   label: 'Deadline' },
  hours:      { Icon: Clock,          color: C.green,  label: 'Hours' },
  portfolio:  { Icon: ClipboardList,  color: C.amber,  label: 'Portfolio' },
  lesson:     { Icon: Route,          color: C.blue,   label: 'Pathway' },
  flashcards: { Icon: Layers3,        color: C.violet, label: 'Review' },
};

export default function NextThreeCard({
  items = [], onGo, accent = C.blue, m = false, reducedMotion = false, loading = false,
}) {
  return (
    <div style={{
      ...glass({ padding: m ? 18 : 24 }),
      border: `1px solid ${accent}2e`,
      background: `linear-gradient(135deg, ${accent}10, transparent 55%)`,
    }}>
      <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }), marginBottom: 4 }}>
        <h2 style={{
          fontSize: m ? 19 : 22, fontWeight: 800, color: C.t1, fontFamily: C.FD,
          letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', margin: 0,
        }}>
          Do these next
        </h2>
        {items.length > 0 && (
          <span style={pill(tint(accent, 0.14), accent)}>
            {items.length === 1 ? '1 thing' : `${items.length} things`}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '0 0 16px', lineHeight: 1.5 }}>
        Ranked by what is most urgent and what moves your application most — not by what is easiest.
      </p>

      {loading ? (
        <div style={{ fontSize: 13, color: C.t3, padding: '8px 0' }}>Working out your next three…</div>
      ) : items.length === 0 ? (
        // The genuinely-nothing-to-do state, which is rare and worth saying plainly
        // rather than papering over with invented busywork. Manufacturing a fourth
        // suggestion here would undo the credibility the other three earn.
        <div style={{ ...R({ gap: 8 }), padding: '4px 0' }}>
          <CheckCircle2 size={18} color={C.green} />
          <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>
            Nothing is pressing right now. That is a real state, not an empty screen — take the evening.
          </span>
        </div>
      ) : (
        <div style={CC({ gap: 8 })}>
          {items.map((item, i) => {
            const fam = FAMILY[item.family] || FAMILY.portfolio;
            const { Icon } = fam;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onGo?.(item)}
                whileHover={reducedMotion ? undefined : { y: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.995 }}
                style={{
                  ...glass2({ padding: m ? 13 : 15 }),
                  display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                  textAlign: 'left', cursor: 'pointer', font: 'inherit',
                  borderLeft: `3px solid ${fam.color}`,
                }}
              >
                {/* Rank, not score. */}
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 4,
                  background: tint(fam.color, 0.16), color: fam.color,
                  fontSize: 12, fontWeight: 800, fontFamily: C.FM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4,
                }}>{i + 1}</span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginBottom: 4 }}>
                    <Icon size={13} color={fam.color} style={{ flexShrink: 0 }} />
                    <span style={{ ...eyebrow(), color: fam.color }}>{fam.label}</span>
                    {/* The denominator, wherever the candidate has one. This is the
                        substance framing: progress toward something real, stated as
                        a fraction a person outside this app would understand. */}
                    {item.evidence && (
                      <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>· {item.evidence}</span>
                    )}
                  </span>
                  <span style={{
                    display: 'block', fontSize: m ? 13.5 : 14.5, fontWeight: 700,
                    color: C.t1, fontFamily: C.FD, lineHeight: 1.3,
                  }}>{item.title}</span>
                  {item.detail && (
                    <span style={{
                      display: 'block', fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.45,
                    }}>{item.detail}</span>
                  )}
                </span>

                <span style={{
                  ...R({ gap: 8 }), flexShrink: 0, alignSelf: 'center',
                  fontSize: 11.5, fontWeight: 600, color: fam.color,
                }}>
                  {!m && item.cta}
                  <ArrowRight size={13} />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
