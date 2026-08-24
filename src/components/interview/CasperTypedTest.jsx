// ─────────────────────────────────────────────────────────────────────────────
// CASPer, typed, on the clock, reported as a quartile.
//
// Three things mirror the real test and none of them are decoration:
//
//  • ONE CLOCK FOR THE WHOLE SECTION. Five minutes covering every question in
//    the section, not five minutes per question. That single design choice is
//    what makes CASPer a triage test: you have to decide in the first fifteen
//    seconds which question gets the long answer and which gets one line.
//    Practising the questions untimed teaches the wrong skill entirely.
//  • NO GOING BACK. Once a section closes it is closed.
//  • A QUARTILE, NOT A SCORE. Real results are reported to programs as a
//    quartile against the applicant pool and the applicant never sees a raw
//    number — deliberately, because a raw number implies a precision the
//    instrument does not have. We mirror the convention, and we are explicit
//    that our band is computed against our own rubric rather than against
//    people who actually sat the test. That caveat prints with every result.
//
// The short set gets no quartile at all. Five sections cannot place anyone
// anywhere, and printing a band with a disclaimer nobody reads would be worse
// than withholding it.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronRight, Flag, RefreshCw, Keyboard, BarChart3, Info, Repeat, Eye, Video, FileText,
} from 'lucide-react';
import { C, glass, glass2, btn, inp, R, CC, pill, tint } from '../../lib/theme';
import StationClock from './StationClock';
import { CASPER_SECTIONS, CASPER_TEST_LENGTHS, SECTION_SECONDS } from '../../data/casperTest';
import { scoreCasperAttempt, QUARTILES } from '../../lib/casperScore';
import { rateCasperSection } from '../../lib/interviewFeedback';
import * as DB from '../../lib/db';

const PHASE = { SETUP: 'setup', SCENARIO: 'scenario', TYPING: 'typing', SCORING: 'scoring', RESULTS: 'results' };

// Deterministic-enough section selection: shuffle once per attempt so two runs are not identical,
// but never repeat a section inside one attempt.
function pickSections(n) {
  const pool = [...CASPER_SECTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // A test longer than the library wraps rather than failing, which only happens if someone
  // shortens the library later.
  const out = [];
  while (out.length < n) out.push(...pool.slice(0, Math.min(n - out.length, pool.length)));
  return out.slice(0, n);
}

export default function CasperTypedTest({ accent = C.cyan, onSessionComplete }) {
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [lengthId, setLengthId] = useState('full');
  const [sections, setSections] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [attempt, setAttempt] = useState(null);

  // Same reasoning as the circuit runner: the buzzer must record what is on screen now, not what
  // was on screen when the clock was armed.
  const answersRef = useRef([]);
  const draftRef = useRef([]);
  const [draft, setDraft] = useState([]);

  const testLength = CASPER_TEST_LENGTHS.find(l => l.id === lengthId) || CASPER_TEST_LENGTHS[0];
  const section = sections[idx] || null;

  function start() {
    const picked = pickSections(testLength.sections);
    setSections(picked);
    setIdx(0);
    setAnswers([]);
    answersRef.current = [];
    const blank = picked[0].probes.map(() => '');
    setDraft(blank);
    draftRef.current = blank;
    setPhase(PHASE.SCENARIO);
  }

  const beginTyping = useCallback(() => setPhase(PHASE.TYPING), []);

  const closeSection = useCallback(() => {
    const s = sections[idx];
    const texts = draftRef.current;
    answersRef.current = [...answersRef.current, {
      id: s.id,
      section: s,
      // Stored per probe, and joined for the rater, so "which question did you never reach" stays
      // answerable after the fact.
      texts,
      answer: texts.map((t, i) => (t.trim() ? `Q${i + 1}: ${t.trim()}` : '')).filter(Boolean).join('\n\n'),
      probesTotal: s.probes.length,
      probesAnswered: texts.filter(t => t.trim().length > 0).length,
    }];
    setAnswers([...answersRef.current]);

    if (idx + 1 < sections.length) {
      const next = sections[idx + 1];
      const blank = next.probes.map(() => '');
      setDraft(blank);
      draftRef.current = blank;
      setIdx(i => i + 1);
      setPhase(PHASE.SCENARIO);
    } else {
      setPhase(PHASE.SCORING);
      scoreAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, idx]);

  async function scoreAll() {
    const entries = answersRef.current;
    setScoringProgress(0);
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.answer) {
        out.push({ ...e, result: null });
      } else {
        try {
          const result = await rateCasperSection({
            section: e.section, answer: e.answer, probesAnswered: e.probesAnswered,
          });
          out.push({ ...e, result });
        } catch {
          out.push({ ...e, result: null });
        }
      }
      setScoringProgress(i + 1);
    }
    const scored = scoreCasperAttempt(out, { reportsQuartile: testLength.reportsQuartile });
    setAnswers(out);
    setAttempt(scored);
    setPhase(PHASE.RESULTS);
    onSessionComplete?.('casper');
    DB.addInterviewSession({
      mode: 'casper-test',
      pathwayKey: 'casper',
      question: `CASPer ${testLength.label} — ${out.length} sections`,
      // The quartile is what the student sees; the mean is what the history chart needs to plot
      // anything at all, and it is never surfaced as a CASPer result.
      score: scored.mean == null ? null : Math.round(scored.mean * 10) / 10,
      scale: scored.scale || 7,
    }).catch(() => {});
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.SETUP) {
    return (
      <div style={CC({ gap: 16 })}>
        <div style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg, ${tint(accent, 0.09)}, transparent 65%)`, border: `1px solid ${tint(accent, 0.25)}` }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <Keyboard size={16} color={accent} />
            <span style={{ fontSize: 12, fontWeight: 800, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>CASPer — typed test</span>
          </div>
          <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.55 }}>
            A scenario, then several questions about it, then a five-minute clock covering all of them. You cannot return to a section once you leave it, and almost nobody answers every question — that is not a flaw in the test, it is the instrument. What CASPer measures under time pressure is triage: deciding in the first fifteen seconds which question gets your real answer.
          </div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 12 }}>
            <strong style={{ color: C.t1 }}>Results come back as a quartile, not a score.</strong> That is how the real test reports: programs see a band, the applicant sees a band, and nobody sees a raw number. We do the same — and our band is computed against our own rubric rather than against people who actually sat the test, which is a real limitation and is printed with the result.
          </div>
        </div>

        <div style={glass({ padding: 16 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 8 }}>How long</div>
          <div style={CC({ gap: 8, marginBottom: 16 })}>
            {CASPER_TEST_LENGTHS.map(l => (
              <button key={l.id} onClick={() => setLengthId(l.id)}
                style={{
                  ...glass2({ padding: 12 }), textAlign: 'left', cursor: 'pointer',
                  border: `1px solid ${lengthId === l.id ? tint(accent, 0.5) : C.b1}`,
                  background: lengthId === l.id ? tint(accent, 0.07) : C.s2,
                }}>
                <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 })}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{l.label}</span>
                  <span style={pill(C.s3, C.t3, { fontSize: 10 })}>
                    {l.sections} sections · ~{Math.round((l.sections * SECTION_SECONDS) / 60)} min
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{l.blurb}</div>
              </button>
            ))}
          </div>
          <button onClick={start} style={{ ...btn(accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Play size={15} />Start the test
          </button>
        </div>
      </div>
    );
  }

  // ── Scoring ───────────────────────────────────────────────────────────────
  if (phase === PHASE.SCORING) {
    return (
      <div style={glass({ padding: 28, textAlign: 'center' })}>
        <RefreshCw size={24} color={accent} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: C.t1, fontWeight: 600 }}>Rating section {Math.min(scoringProgress + 1, sections.length)} of {sections.length}</div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === PHASE.RESULTS) {
    return <CasperResults attempt={attempt} answers={answers} accent={accent} onRestart={() => setPhase(PHASE.SETUP)} />;
  }

  // ── Running ───────────────────────────────────────────────────────────────
  const showingScenario = phase === PHASE.SCENARIO;
  const KindIcon = section.kind === 'video' ? Video : FileText;

  return (
    <div style={CC({ gap: 12 })}>
      <div style={{ ...glass2({ padding: 12 }), display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Section</div>
          <div style={{ fontSize: 18, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{idx + 1}<span style={{ fontSize: 12, color: C.t3 }}> / {sections.length}</span></div>
        </div>
        {showingScenario ? (
          <div style={{ fontSize: 11.5, color: C.t3, flex: 1, textAlign: 'right' }}>The clock starts when the questions appear.</div>
        ) : (
          <StationClock
            seconds={section.sectionSeconds} resetKey={`casper-${idx}`}
            onExpire={closeSection} label="This section" warnAt={45}
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${idx}-${phase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={CC({ gap: 12 })}>
          <div style={{ ...glass2({ padding: 20 }), border: `1px solid ${tint(accent, 0.24)}` }}>
            <div style={R({ gap: 8, marginBottom: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
              <div style={R({ gap: 8 })}>
                <KindIcon size={13} color={accent} />
                <span style={{ fontSize: 10.5, fontWeight: 800, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>Scenario</span>
              </div>
              {section.kind === 'video' && (
                <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>a video section in the real test — described here</span>
              )}
            </div>
            <div style={{ fontSize: 14.5, color: C.t1, lineHeight: 1.54 }}>{section.scenario}</div>
          </div>

          {showingScenario ? (
            <button onClick={beginTyping} style={{ ...btn(accent), alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={15} />Show the questions and start the clock
            </button>
          ) : (
            <>
              {section.probes.map((p, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, marginBottom: 4, lineHeight: 1.55 }}>
                    <span style={{ color: accent, fontFamily: C.FM, marginRight: 4 }}>{i + 1}.</span>{p}
                  </div>
                  <textarea
                    autoFocus={i === 0}
                    style={inp({ minHeight: 92, resize: 'vertical', fontFamily: C.FB, lineHeight: 1.55 })}
                    value={draft[i] || ''}
                    onChange={e => {
                      const next = [...draftRef.current];
                      next[i] = e.target.value;
                      draftRef.current = next;
                      setDraft(next);
                    }}
                  />
                </div>
              ))}
              <div style={R({ gap: 12, flexWrap: 'wrap', alignItems: 'center' })}>
                <button onClick={closeSection} style={{ ...btn(accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {idx + 1 < sections.length ? <><ChevronRight size={15} />Next section</> : <><Flag size={15} />Finish the test</>}
                </button>
                <span style={{ fontSize: 11, color: C.t3 }}>
                  {draft.filter(t => t.trim()).length} of {section.probes.length} answered · you cannot come back to this section
                </span>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────

function CasperResults({ attempt, answers, accent, onRestart }) {
  const [open, setOpen] = useState(null);
  const q = attempt.quartileDetail;
  const color = q?.tone === 'good' ? C.green : q?.tone === 'bad' ? C.rose : C.amberL;

  return (
    <div style={CC({ gap: 16 })}>
      <div style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg, ${tint(q ? color : C.t3, 0.09)}, transparent 65%)`, border: `1px solid ${tint(q ? color : C.t3, 0.26)}` }}>
        <div style={R({ gap: 8, marginBottom: 12 })}>
          <BarChart3 size={16} color={q ? color : C.t3} />
          <span style={{ fontSize: 12, fontWeight: 800, color: q ? color : C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>CASPer result</span>
        </div>

        {q ? (
          <>
            {/* The whole band ladder, with the student's rung filled in — a quartile means nothing
                without the other three next to it. */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1, 2, 3, 4].map(n => {
                const here = n === q.id;
                const qq = QUARTILES.find(x => x.id === n);
                return (
                  <div key={n} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 8, textAlign: 'center',
                    background: here ? tint(color, 0.18) : C.s3,
                    border: `1px solid ${here ? tint(color, 0.5) : C.b1}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: C.FD, color: here ? color : C.t3 }}>{qq.short}</div>
                    <div style={{ fontSize: 9.5, color: here ? C.t1 : C.t3, marginTop: 4 }}>{qq.plain}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>{q.label}</div>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55 }}>{q.blurb}</div>
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.55 }}>
            No quartile for this attempt — see below for why, and for what the sections themselves showed.
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 12, fontStyle: 'italic' }}>{attempt.caveat}</div>
      </div>

      <div style={{ ...glass2({ padding: 16 }), display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Info size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
          You answered <strong style={{ color: C.t1 }}>{attempt.probesAnswered} of {attempt.probesTotal}</strong> questions across {attempt.sections} sections.
          {attempt.unanswered > 0 && ' Leaving some unanswered is normal and expected on this test — what matters is which ones you left.'}
        </div>
      </div>

      {attempt.findings.length > 0 && (
        <div style={glass({ padding: 16 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 8 }}>What showed up across sections</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attempt.findings.map((f, i) => <li key={i} style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{f}</li>)}
          </ul>
        </div>
      )}

      <div style={CC({ gap: 8 })}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Section by section</div>
        {answers.map((a, i) => {
          const isOpen = open === i;
          const done = a.probesAnswered === a.probesTotal;
          return (
            <div key={a.id + i} style={{ ...glass2({ padding: 0 }), borderLeft: `3px solid ${done ? C.green : C.amber}`, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{i + 1}. {a.section.title}</div>
                  <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>{a.probesAnswered} of {a.probesTotal} questions answered</div>
                </div>
                <Eye size={13} color={C.t3} />
              </button>
              {isOpen && (
                <div style={{ padding: '0px 16px 16px' }}>
                  {a.result ? (
                    <>
                      <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.result.text}</div>
                      {a.result.reasons?.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {a.result.reasons.map((r, j) => <li key={j} style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{r}</li>)}
                        </ul>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>Nothing was submitted for this section, so there is nothing to give feedback on.</div>
                  )}
                  <div style={{ ...glass2({ padding: 12, marginTop: 12 }), background: C.s2 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 8 }}>The questions</div>
                    <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {a.section.probes.map((p, j) => (
                        <li key={j} style={{ fontSize: 11.5, color: a.texts[j]?.trim() ? C.t2 : C.t3, lineHeight: 1.55 }}>
                          {p}{!a.texts[j]?.trim() && <span style={{ color: C.amberL }}> — never reached</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={onRestart} style={{ ...btn(accent), alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Repeat size={14} />Take another test
      </button>
    </div>
  );
}
