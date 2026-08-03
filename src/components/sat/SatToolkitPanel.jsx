import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calculator, LineChart, Trash2, BookOpen, ChevronDown, Sparkles, Info,
  AlertTriangle, PlayCircle, Keyboard,
} from 'lucide-react';
import { C, glass, glass2, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SatPageHeader, SatCard, satBtn } from './satUi';
import DesmosSurface, { resetCalculator, calcChromeButton } from './DesmosSurface';
import { useSatTools } from './SatToolsContext';
import { CALC_MODES, USING_DEMO_KEY } from '../../lib/sat/desmos';
import { DESMOS_PLAYS, CALCULATOR_FACTS } from '../../data/sat/reference';

// ─────────────────────────────────────────────────────────────────────────────
// Calculator — Desmos at full size, plus the part nobody teaches.
//
// Handing a student the same calculator the exam uses is only half the job.
// The other half is knowing what to type into it: most students who "have a
// graphing calculator" still solve every equation by hand because nobody ever
// showed them that y = left side, y = right side, click the intersection beats
// algebra on a timed test. Each play below loads its own expressions into the
// live calculator on the left, so the technique is demonstrated rather than
// described.
//
// While this panel is mounted it claims the single live calculator instance
// (setEmbedded) so the floating window stands down — see SatToolsContext.
// ─────────────────────────────────────────────────────────────────────────────

export default function SatToolkitPanel({ accent = C.teal, isMobile = false }) {
  const { setEmbedded, openReference } = useSatTools();
  const [mode, setMode] = useState('graphing');
  const [expanded, setExpanded] = useState(DESMOS_PLAYS[0]?.id || null);
  const [status, setStatus] = useState('loading');
  const calcRef = useRef(null);

  // Claim the one live calculator for as long as this panel is on screen.
  useEffect(() => {
    setEmbedded(true);
    return () => setEmbedded(false);
  }, [setEmbedded]);

  const loadPlay = useCallback((play) => {
    const calc = calcRef.current;
    if (!calc) { toast.error('The calculator is still loading.'); return; }
    if (mode !== 'graphing') { setMode('graphing'); }
    try {
      for (let i = 0; i < 8; i++) calc.removeExpression({ id: `play-${i}` });
      (play.expressions || []).forEach((latex, i) => calc.setExpression({ id: `play-${i}`, latex }));
      toast.success(`Loaded: ${play.title}`, { icon: '📈' });
    } catch {
      toast.error('That example could not be loaded.');
    }
  }, [mode]);

  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={accent}
        eyebrow="SAT · Calculator" title="Desmos, the same one the exam gives you"
        sub="The Digital SAT builds Desmos into every Math question — both modules, no time limit on using it. It is here on every SAT screen too, and it keeps your work between questions."
        meta={[{ value: DESMOS_PLAYS.length, label: 'techniques' }]}
        m={isMobile}
        tourTag="sat-deep-toolkit"
      />

      {/* ── The calculator ── */}
      <div style={glass({ padding: isMobile ? 14 : 18 })}>
        <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={R({ gap: 6 })}>
            {Object.values(CALC_MODES).map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} title={m.blurb} style={calcChromeButton(mode === m.id, accent)}>
                {m.id === 'graphing' ? <LineChart size={11} /> : <Calculator size={11} />} {m.label}
              </button>
            ))}
          </div>
          <div style={R({ gap: 6, flexWrap: 'wrap' })}>
            <span style={pill(tint(C.t3, 0.1), C.t3, { fontSize: 10, gap: 5, border: `1px solid ${C.b1}` })}>
              <Keyboard size={10} /> Alt+C anywhere
            </span>
            <button onClick={openReference} style={btnG({ padding: '6px 12px', fontSize: 11.5 })}>
              <BookOpen size={12} /> Formula sheet
            </button>
            <button
              onClick={() => { resetCalculator(calcRef.current, mode); toast('Graph cleared.'); }}
              style={btnG({ padding: '6px 12px', fontSize: 11.5 })}
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>

        <DesmosSurface
          mode={mode}
          onCalculator={(c) => { calcRef.current = c; }}
          onStatusChange={setStatus}
          minHeight={isMobile ? 380 : 520}
          style={{ height: isMobile ? 380 : 520, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.b1}` }}
        />

        <div style={{ ...R({ gap: 7, alignItems: 'flex-start' }), marginTop: 12 }}>
          <Info size={12} color={C.t4} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>
            Anything you type here stays put — switch tabs, answer a set, come back, and your
            expressions are still on the axes. Desmos is loaded from desmos.com, so it needs a
            connection; the rest of the SAT tab works offline.
            {USING_DEMO_KEY && ' This build is using the public Desmos demo key.'}
          </span>
        </div>
      </div>

      {/* ── Policy facts ── */}
      <SatCard title="What the exam actually allows" icon={Info} iconColor={C.blue} m={isMobile}>
        <div style={CC({ gap: 9 })}>
          {CALCULATOR_FACTS.map((f, i) => (
            <div key={i} style={{ ...R({ gap: 10, alignItems: 'flex-start' }), ...glass2({ padding: '11px 13px' }) }}>
              <span style={{
                width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: tint(C.blue, 0.16), color: C.blueL, fontSize: 9.5, fontWeight: 800,
                fontFamily: C.FM, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{f}</span>
            </div>
          ))}
        </div>
      </SatCard>

      {/* ── The playbook ── */}
      <SatCard title="The Desmos playbook" icon={Sparkles} iconColor={accent} m={isMobile}>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 14, lineHeight: 1.65 }}>
          Ten techniques, ranked by how often they save time on a real Math module. Press
          "Show me" on any of them and the expressions load into the calculator above.
        </div>

        <div style={CC({ gap: 10 })}>
          {DESMOS_PLAYS.map((play, i) => {
            const isOpen = expanded === play.id;
            return (
              <div key={play.id} style={{ ...glass2({ padding: 0, overflow: 'hidden' }), border: `1px solid ${isOpen ? tint(accent, 0.3) : C.b1}` }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : play.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: isMobile ? 13 : 15,
                    background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FB,
                  }}
                >
                  <div style={R({ gap: 11 })}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                      background: tint(accent, 0.16), border: `1px solid ${tint(accent, 0.28)}`,
                      color: accent, fontSize: 10.5, fontWeight: 800, fontFamily: C.FM,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{play.title}</div>
                      <div style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.5 }}>{play.when}</div>
                    </div>
                    <ChevronDown size={14} color={C.t3} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: isMobile ? '0 13px 13px 48px' : '0 15px 15px 50px' }}>
                        <ol style={{ margin: 0, paddingLeft: 16, color: C.t2, fontSize: 12, lineHeight: 1.85 }}>
                          {play.steps.map((s, si) => <li key={si}>{s}</li>)}
                        </ol>

                        {play.caution && (
                          <div style={{ ...R({ gap: 7, alignItems: 'flex-start' }), marginTop: 11 }}>
                            <AlertTriangle size={12} color={C.amberL} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{play.caution}</span>
                          </div>
                        )}

                        {!!play.expressions?.length && (
                          <button
                            onClick={() => loadPlay(play)}
                            disabled={status !== 'ready'}
                            style={satBtn(accent, {
                              marginTop: 13, padding: '7px 14px', fontSize: 12,
                              opacity: status === 'ready' ? 1 : 0.45,
                              cursor: status === 'ready' ? 'pointer' : 'not-allowed',
                            })}
                          >
                            <PlayCircle size={13} /> Show me on the calculator
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </SatCard>
    </div>
  );
}
