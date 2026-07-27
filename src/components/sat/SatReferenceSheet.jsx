import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Info, Brain, ClipboardCheck } from 'lucide-react';
import { C, glass2, btnSm, R, CC, tint } from '../../lib/theme';
import { Tex } from '../ui/MathText';
import {
  GIVEN_FORMULAS, MEMORIZE_FORMULAS, CALCULATOR_FACTS, REFERENCE_DISCLAIMER,
} from '../../data/sat/reference';

// ─────────────────────────────────────────────────────────────────────────────
// The reference sheet, as a drawer you can open on top of a live question.
//
// Bluebook keeps its reference sheet one tap away for the whole Math section,
// so this is one tap away too — including mid-question, mid-timed-set and
// mid-full-test. It slides from the LEFT so it never fights the Medabrain panel
// (right) or the floating calculator (centre).
//
// The second tab is the one that actually matters. The sheet the exam gives you
// is short and mostly geometry; the formulas it withholds are where students
// lose points, so they are shown side by side and labelled honestly.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'memorize', label: 'Memorise these', icon: Brain, blurb: 'NOT given on test day. This is the list that costs points.' },
  { id: 'given', label: 'Given on the test', icon: ClipboardCheck, blurb: 'On screen for the whole Math section. Do not spend memory here.' },
];

const Z = 334;

export default function SatReferenceSheet({ open, onClose, accent = C.teal, isMobile = false }) {
  const [tab, setTab] = useState('memorize');
  const groups = tab === 'given' ? GIVEN_FORMULAS : MEMORIZE_FORMULAS;
  const active = TABS.find(t => t.id === tab);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ref-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: Z - 1 }}
          />
          <motion.div
            key="ref-panel"
            initial={isMobile ? { y: '100%' } : { x: '-100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="sat-sheet"
            style={isMobile ? {
              // 82dvh, not 82vh: iOS Safari's vh is the height with the toolbar
              // collapsed, so a vh-sized sheet is taller than the visible page
              // and its footer sits under the browser chrome. dvh tracks the
              // real viewport as the toolbar shows and hides.
              position: 'fixed', left: 0, right: 0, bottom: 0, height: '82dvh', zIndex: Z,
              background: C.s0, borderTop: `1px solid ${tint(accent, 0.3)}`, borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            } : {
              position: 'fixed', left: 0, top: 0, bottom: 0, width: 430, maxWidth: '92vw', zIndex: Z,
              background: C.s0, borderRight: `1px solid ${tint(accent, 0.3)}`,
              display: 'flex', flexDirection: 'column', boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '15px 18px', borderBottom: `1px solid ${C.b1}`, flexShrink: 0,
              background: `linear-gradient(120deg,${tint(accent, 0.14)},rgba(255,255,255,0.02))`,
            }}>
              <div style={R({ gap: 10 })}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg,${accent},${C.emerald})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BookOpen size={16} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Formula sheet</div>
                  <div style={{ fontSize: 10.5, color: C.t3 }}>{active?.blurb}</div>
                </div>
                <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: C.t3 }}>
                  <X size={17} />
                </button>
              </div>

              <div style={{ ...R({ gap: 6 }), marginTop: 12 }}>
                {TABS.map(t => {
                  const Icon = t.icon;
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id} onClick={() => setTab(t.id)}
                      style={btnSm(isActive ? tint(accent, 0.22) : 'rgba(255,255,255,0.03)', {
                        border: `1px solid ${isActive ? tint(accent, 0.45) : C.b1}`,
                        color: isActive ? '#fff' : C.t2, fontSize: 11.5, padding: '6px 12px',
                      })}
                    >
                      <Icon size={11} /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              <div style={CC({ gap: 16 })}>
                {groups.map(g => {
                  const gc = C[g.color] || accent;
                  return (
                    <div key={g.group}>
                      <div style={{
                        fontSize: 10, fontWeight: 800, color: gc, letterSpacing: '.1em',
                        textTransform: 'uppercase', marginBottom: 9,
                      }}>
                        {g.group}
                      </div>
                      <div style={CC({ gap: 7 })}>
                        {g.items.map((item, i) => (
                          <div key={i} style={{
                            ...glass2({ padding: '10px 13px' }),
                            borderColor: tint(gc, 0.18),
                            display: 'flex', flexDirection: 'column', gap: 5,
                          }}>
                            <div style={{ color: C.t1, fontSize: 14, overflowX: 'auto' }}>
                              <Tex tex={item.tex} />
                            </div>
                            <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5 }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {tab === 'given' && (
                  <div style={{ ...glass2({ padding: 14 }), borderColor: tint(C.blue, 0.22) }}>
                    <div style={{ ...R({ gap: 6 }), marginBottom: 8 }}>
                      <Info size={12} color={C.blueL} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.blueL, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                        Calculator and reference rules
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: C.t2, fontSize: 11.5, lineHeight: 1.75 }}>
                      {CALCULATOR_FACTS.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ fontSize: 10, color: C.t4, lineHeight: 1.6, paddingBottom: 8 }}>
                  {REFERENCE_DISCLAIMER}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
