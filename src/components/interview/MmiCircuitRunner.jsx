// ─────────────────────────────────────────────────────────────────────────────
// The circuit: eight to ten stations back to back, on the clock, no going back.
//
// This is the mode the whole station library exists for. Single-station practice
// is useful and it is explicitly practice; a circuit is the only thing that
// produces an aggregate worth reading, because an MMI's reliability comes from
// averaging eight or more independent raters rather than from any one of them
// being good.
//
// Three design decisions worth defending:
//
//  • THE CLOCK DOES NOT PAUSE. Reading time ends whether or not you have decided
//    what to say, and the station ends whether or not you have finished. That is
//    unpleasant and it is the point — a student who has only practised untimed
//    will discover on the day that the format is mostly a time problem.
//  • YOU CANNOT GO BACK. Real circuits move you to the next door. Allowing a
//    student to revisit station three after seeing station seven would produce a
//    score that means nothing.
//  • FEEDBACK IS WITHHELD UNTIL THE END. Being told after station two that you
//    scored a 4 changes stations three through nine, which is exactly what the
//    real format prevents by using raters who never speak to each other.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronRight, Flag, RefreshCw, Trophy, Timer, Layers, AlertTriangle, Repeat, Eye,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, R, CC, pill, tint } from '../../lib/theme';
import StationClock from './StationClock';
import { DoorCard, RoomCard, StationTags } from './StationBrief';
import DebriefCard from './DebriefCard';
import { buildCircuit, aggregateCircuit, describeCircuit, CIRCUIT_SIZES, formatClock } from '../../lib/mmiCircuit';
import { rateStation } from '../../lib/interviewFeedback';
import { COMPETENCIES } from '../../lib/mmiRubric';
import * as DB from '../../lib/db';

const PHASE = { SETUP: 'setup', READING: 'reading', INSIDE: 'inside', SCORING: 'scoring', RESULTS: 'results' };

export default function MmiCircuitRunner({ accent = C.violet, onSessionComplete }) {
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [size, setSize] = useState(CIRCUIT_SIZES.default);
  const [circuit, setCircuit] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  // One entry per station, in circuit order: { station, answer, result }.
  const [attempts, setAttempts] = useState([]);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [replaySeed, setReplaySeed] = useState(null);
  const answersRef = useRef([]);
  // The textarea's value, mirrored outside React state. advance() is called from two places — the
  // button and the expiring clock — and the clock's callback closes over whatever `answer` was
  // when the timer was armed. Reading the ref means the buzzer records what is actually on screen
  // rather than what was there two minutes ago.
  const answerRef = useRef('');

  const station = circuit?.stations[idx] || null;
  const summary = useMemo(() => (circuit ? describeCircuit(circuit) : ''), [circuit]);

  function start(seed = null) {
    const c = buildCircuit({ size, seed });
    setCircuit(c);
    setIdx(0);
    setAnswer('');
    answerRef.current = '';
    setAttempts([]);
    answersRef.current = [];
    setReplaySeed(null);
    setPhase(PHASE.READING);
  }

  const enterRoom = useCallback(() => setPhase(PHASE.INSIDE), []);

  // Advancing is the same code path whether the student pressed the button or the clock ran out,
  // which is deliberate: an empty answer at the buzzer is a real result and is recorded as one.
  const advance = useCallback(() => {
    answersRef.current = [...answersRef.current, { station: circuit.stations[idx], answer: answerRef.current.trim() }];
    answerRef.current = '';
    setAnswer('');
    if (idx + 1 < circuit.stations.length) {
      setIdx(i => i + 1);
      setPhase(PHASE.READING);
    } else {
      setPhase(PHASE.SCORING);
      scoreAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit, idx]);

  async function scoreAll() {
    const entries = answersRef.current;
    setScoringProgress(0);
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      const { station: s, answer: a } = entries[i];
      if (!a) {
        // Nothing said in the room. Recorded honestly rather than skipped: the deterministic
        // scorer floors an empty answer at 1 and the aggregate has to feel that.
        out.push({ station: s, answer: a, result: null, empty: true });
      } else {
        try {
          const result = await rateStation({ station: s, answer: a });
          out.push({ station: s, answer: a, result });
        } catch (e) {
          // A failed call must not silently become a low score — it becomes an unscored station
          // and the aggregate says how many of those there were.
          out.push({ station: s, answer: a, result: null, failed: true, error: e.message });
        }
      }
      setScoringProgress(i + 1);
      setAttempts([...out]);
    }
    setPhase(PHASE.RESULTS);
    onSessionComplete?.('circuit');
    const agg = aggregateCircuit(out.map(o => o.result), circuit);
    DB.addInterviewSession({
      mode: 'mmi-circuit',
      pathwayKey: 'mmi',
      question: `Circuit of ${circuit.size} stations (seed ${circuit.seed})`,
      score: agg.mean == null ? null : Math.round(agg.mean * 10) / 10,
      scale: agg.scale || 7,
    }).catch(() => {});
  }

  const aggregate = useMemo(
    () => (phase === PHASE.RESULTS && circuit ? aggregateCircuit(attempts.map(a => a.result), circuit) : null),
    [phase, attempts, circuit]
  );

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.SETUP) {
    const preview = buildCircuit({ size, seed: 1 });
    return (
      <div style={CC({ gap: 16 })}>
        <div style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg, ${tint(accent, 0.09)}, transparent 65%)`, border: `1px solid ${tint(accent, 0.25)}` }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <Layers size={16} color={accent} />
            <span style={{ fontSize: 12, fontWeight: 800, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>Full circuit</span>
          </div>
          <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.55 }}>
            Eight to ten stations back to back, each with two minutes of reading time outside the door and five to eight minutes inside. The clock does not pause, you cannot go back, and no feedback appears until the whole circuit is done — the same three constraints the real format uses, and the reason it measures anything.
          </div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 12 }}>
            <strong style={{ color: C.t1 }}>This is the only mode that produces an aggregate score.</strong> A single station is a weak measurement by design — the reliability comes from averaging eight or more raters who never speak to each other. Practising one station at a time is useful, and it is practice.
          </div>
        </div>

        <div style={glass({ padding: 16 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 8 }}>How many stations</div>
          <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 12 })}>
            {[8, 9, 10].map(n => (
              <button key={n} onClick={() => setSize(n)}
                style={btnSm(size === n ? accent : C.s3, { fontSize: 12.5, color: size === n ? '#fff' : C.t2, border: size === n ? 'none' : `1px solid ${C.b1}` })}>
                {n} stations
              </button>
            ))}
          </div>
          <div style={{ ...glass2({ padding: 12 }), marginBottom: 12 }}>
            <div style={R({ gap: 8, marginBottom: 4 })}>
              <Timer size={12} color={C.t3} />
              <span style={{ fontSize: 11.5, color: C.t2 }}>{describeCircuit(preview)}</span>
            </div>
            <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>
              Every circuit mixes formats deliberately: an interviewer station, a role-play with an actor, a collaborative task, a policy question, and one or two traditional questions. No archetype appears more than twice, so it cannot turn into eight ethics questions by accident.
            </div>
          </div>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <button onClick={() => start()} style={{ ...btn(accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={15} />Start the circuit
            </button>
            {replaySeed != null && (
              <button onClick={() => start(replaySeed)} style={{ ...btnG({ fontSize: 12.5 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Repeat size={13} />Run the last circuit again
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 12, lineHeight: 1.55 }}>
            Set aside the full {Math.round(preview.totalSeconds / 60)} minutes. Stopping halfway gives you a number the aggregate will refuse to report, which is the honest outcome rather than a punishment.
          </div>
        </div>
      </div>
    );
  }

  // ── Scoring ───────────────────────────────────────────────────────────────
  if (phase === PHASE.SCORING) {
    return (
      <div style={{ ...glass({ padding: 28, textAlign: 'center' }) }}>
        <RefreshCw size={24} color={accent} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: C.t1, fontWeight: 600 }}>Rating station {Math.min(scoringProgress + 1, circuit.size)} of {circuit.size}</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, lineHeight: 1.55, maxWidth: 460, margin: '8px auto 0' }}>
          Each station is rated on its own, by a rater that has not seen the others — which is how a real circuit works and why the average is worth more than any one of the numbers in it.
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === PHASE.RESULTS) {
    return (
      <CircuitResults
        circuit={circuit} attempts={attempts} aggregate={aggregate} accent={accent}
        onRestart={() => { setReplaySeed(circuit.seed); setPhase(PHASE.SETUP); }}
      />
    );
  }

  // ── Running: reading, then inside ─────────────────────────────────────────
  const reading = phase === PHASE.READING;
  return (
    <div style={CC({ gap: 12 })}>
      <div style={{ ...glass2({ padding: 12 }), display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Station</div>
          <div style={{ fontSize: 18, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{idx + 1}<span style={{ fontSize: 12, color: C.t3 }}> / {circuit.size}</span></div>
        </div>
        <StationClock
          seconds={reading ? station.readingSeconds : station.stationSeconds}
          resetKey={`${idx}-${phase}`}
          onExpire={reading ? enterRoom : advance}
          label={reading ? 'Reading time' : 'Inside the station'}
          warnAt={reading ? 20 : 60}
        />
        <div style={{ flex: 1, minWidth: 160, textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, color: C.t3 }}>{summary}</div>
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>No feedback until the circuit ends.</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${idx}-${phase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {reading ? (
            <div style={CC({ gap: 12 })}>
              <DoorCard station={station} accent={accent} />
              <button onClick={enterRoom} style={{ ...btn(accent), alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={15} />I'm ready — go in early
              </button>
            </div>
          ) : (
            <div style={CC({ gap: 12 })}>
              <RoomCard station={station} accent={accent} />
              <textarea
                autoFocus
                style={inp({ minHeight: 200, resize: 'vertical', fontFamily: C.FB, lineHeight: 1.7 })}
                placeholder={station.format === 'actor'
                  ? 'Write what you would actually say to them. Their words, then yours — a conversation, not a description of one.'
                  : 'Say it out loud first if that helps, then write down what you would actually say.'}
                value={answer}
                onChange={e => { answerRef.current = e.target.value; setAnswer(e.target.value); }}
              />
              <div style={R({ gap: 12, flexWrap: 'wrap', alignItems: 'center' })}>
                <button onClick={advance} style={{ ...btn(accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {idx + 1 < circuit.size ? <><ChevronRight size={15} />Next station</> : <><Flag size={15} />Finish the circuit</>}
                </button>
                <span style={{ fontSize: 11, color: C.t3 }}>
                  {answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'Nothing written yet — the buzzer counts an empty room as an empty room.'}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────

function CircuitResults({ circuit, attempts, aggregate, accent, onRestart }) {
  const [open, setOpen] = useState(null);
  const tone = aggregate.band?.tone;
  const color = tone === 'good' ? C.green : tone === 'bad' ? C.rose : C.amberL;
  const unscored = attempts.filter(a => !a.result).length;

  return (
    <div style={CC({ gap: 16 })}>
      <div style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg, ${tint(color, 0.09)}, transparent 65%)`, border: `1px solid ${tint(color, 0.28)}` }}>
        <div style={R({ gap: 8, marginBottom: 12, justifyContent: 'space-between', flexWrap: 'wrap' })}>
          <div style={R({ gap: 8 })}>
            <Trophy size={16} color={color} />
            <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>Circuit result</span>
          </div>
          {aggregate.mean != null && (
            <div style={R({ gap: 8 })}>
              <span style={{ fontSize: 26, fontWeight: 800, color, fontFamily: C.FD, fontVariantNumeric: 'tabular-nums' }}>
                {aggregate.mean.toFixed(1)}<span style={{ fontSize: 14, color: C.t3 }}>/{aggregate.scale}</span>
              </span>
              <span style={{ ...pill(tint(color, 0.16), color, { fontSize: 11, alignSelf: 'center' }) }}>{aggregate.band.label}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.75 }}>{aggregate.band?.blurb}</div>
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7, marginTop: 12, fontStyle: 'italic' }}>{aggregate.caveat}</div>
        {unscored > 0 && (
          <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 12 }}>
            <AlertTriangle size={13} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
              {unscored} station{unscored === 1 ? '' : 's'} could not be scored — either nothing was written or the rater could not be reached. {unscored === 1 ? 'It is' : 'They are'} excluded from the average rather than counted as a low score.
            </span>
          </div>
        )}
      </div>

      {/* The spread, which is the finding most students miss. */}
      {aggregate.mean != null && aggregate.spread >= 2 && (
        <div style={{ ...glass2({ padding: 16 }), borderLeft: `3px solid ${C.amber}` }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 8 }}>Your spread</div>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>
            Your stations ranged by {aggregate.spread} points. A committee argues about a candidate with a wide spread far more than about a flat average — the question they ask is whether the low station was a bad day or a real gap. Yours was <strong style={{ color: C.t1 }}>{aggregate.lowestStation?.score}/7</strong>, and it is the one worth re-reading first.
          </div>
        </div>
      )}

      {/* Competencies rolled up, and only those at least two stations actually assessed. */}
      {aggregate.competencies?.length > 0 && (
        <div style={glass({ padding: 16 })}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 4 }}>Across the circuit</div>
          <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6, marginBottom: 12 }}>
            Only competencies that at least two stations actually assessed. One station's read on teamwork is not a teamwork score, and inventing one is how a rubric becomes decoration.
          </div>
          <div style={CC({ gap: 8 })}>
            {aggregate.competencies.map(c => {
              const pctW = (c.mean / aggregate.scale) * 100;
              const cc = c.mean >= 5.5 ? C.green : c.mean >= 4.5 ? C.amberL : C.rose;
              return (
                <div key={c.key} style={R({ gap: 12, alignItems: 'center' })}>
                  <div style={{ width: 150, flexShrink: 0, fontSize: 11.5, color: C.t2 }}>{COMPETENCIES[c.key]?.short || c.short}</div>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: C.s3, overflow: 'hidden' }}>
                    <div style={{ width: `${pctW}%`, height: '100%', background: cc }} />
                  </div>
                  <div style={{ width: 74, textAlign: 'right', fontSize: 11, color: C.t3, fontFamily: C.FM }}>
                    {c.mean.toFixed(1)} · {c.stations}st
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-station debrief, which is where the actor briefs and rater checklists finally appear. */}
      <div style={CC({ gap: 8 })}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Station by station</div>
        {attempts.map((a, i) => {
          const score = a.result?.score;
          const sc = score == null ? C.t3 : score >= 6 ? C.green : score >= 4 ? C.amberL : C.rose;
          const isOpen = open === i;
          return (
            <div key={a.station.id} style={{ ...glass2({ padding: 0 }), borderLeft: `3px solid ${sc}`, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{i + 1}. {a.station.title}</div>
                  <div style={{ marginTop: 4 }}><StationTags station={a.station} /></div>
                </div>
                <div style={R({ gap: 8, flexShrink: 0 })}>
                  <span style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 800, color: sc, fontFamily: C.FM }}>
                    {score == null ? '—' : `${score}/7`}
                  </span>
                  <Eye size={13} color={C.t3} />
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: '0px 16px 16px' }}>
                  <DebriefCard station={a.station} answer={a.answer} result={a.result} accent={accent} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <button onClick={onRestart} style={{ ...btn(accent), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Repeat size={14} />Run another circuit
        </button>
        <span style={{ fontSize: 11, color: C.t3, alignSelf: 'center' }}>
          Circuit seed {circuit.seed} · total time {formatClock(circuit.totalSeconds)}
        </span>
      </div>
    </div>
  );
}
