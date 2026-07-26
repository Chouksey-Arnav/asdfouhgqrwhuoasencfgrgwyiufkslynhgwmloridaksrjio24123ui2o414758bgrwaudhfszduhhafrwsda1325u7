import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Flag, ChevronRight, ChevronLeft, Clock, Ban, Sparkles, ArrowRight } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, R, CC, tint, pill } from '../../lib/theme';
import { skillMeta, DIFFICULTIES } from '../../data/sat/taxonomy';
import { shuffleChoices } from '../../lib/sat/shuffle';

// ─────────────────────────────────────────────────────────────────────────────
// The SAT question player.
//
// Deliberately NOT a reuse of App.jsx's QuizEngine, which has no timer
// persistence, no flagging, no grid-in input, no per-question answer recording
// and no distractor rationale — every one of which the SAT tab depends on.
//
// Three modes, set by `mode`:
//   'tutor'  explanation shown immediately after each answer (drills)
//   'timed'  answers locked in silently, explanations withheld to the end
//   'exam'   as 'timed', plus module lock — no going back once submitted
// ─────────────────────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'];

/** Normalise a grid-in answer for comparison: "1/2", "0.5", ".5" all match. */
function sprMatches(input, accept) {
  if (!input || !accept?.values?.length) return false;
  const raw = String(input).trim();
  if (!raw) return false;

  const asNumber = (s) => {
    const str = String(s).trim();
    if (/^-?\d+\s*\/\s*-?\d+$/.test(str)) {
      const [n, d] = str.split('/').map(p => parseFloat(p));
      return d === 0 ? NaN : n / d;
    }
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : NaN;
  };

  const got = asNumber(raw);
  const tolerance = accept.tolerance ?? 0;
  for (const v of accept.values) {
    // Exact string match first (handles forms like "15/2" typed verbatim).
    if (String(v).trim() === raw) return true;
    const want = asNumber(v);
    if (Number.isNaN(got) || Number.isNaN(want)) continue;
    // The SAT accepts any answer that fits the grid and rounds correctly, so a
    // small epsilon covers 0.666 vs 2/3 style entries.
    if (Math.abs(got - want) <= (tolerance || Math.max(1e-9, Math.abs(want) * 0.0005))) return true;
  }
  return false;
}

function FigureTable({ figure }) {
  if (!figure || figure.type !== 'table') return null;
  return (
    <div style={{ ...glass2({ padding: 0, overflow: 'hidden' }), marginBottom: 14 }}>
      {figure.title && (
        <div style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: C.t2, borderBottom: `1px solid ${C.b1}` }}>
          {figure.title}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr>
              {figure.columns.map((c, i) => (
                <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 14px', color: C.t3, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${C.b1}`, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {figure.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '8px 14px', color: ci === 0 ? C.t2 : C.t1, fontFamily: ci === 0 ? C.FB : C.FM, borderBottom: ri < figure.rows.length - 1 ? `1px solid ${C.b0}` : 'none' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {Array}    props.questions     the assembled set
 * @param {string}   props.mode          'tutor' | 'timed' | 'exam'
 * @param {string}   props.seedKey       stable per-attempt key for choice shuffling
 * @param {number}   [props.deadline]    absolute ms timestamp; drives the countdown
 * @param {function} props.onAnswer      ({question, choice, correct, seconds, flagged}) => void
 * @param {function} props.onComplete    (responses) => void
 * @param {function} [props.onExit]
 * @param {string}   [props.title]
 * @param {string}   [props.accent]
 * @param {boolean}  [props.isMobile]
 */
export default function SatQuestionPlayer({
  questions = [], mode = 'tutor', seedKey = 'session', deadline = null,
  onAnswer, onComplete, onExit, title = 'Practice', accent = C.blue,
  isMobile = false, initialIndex = 0, initialResponses = [],
}) {
  // Shuffle once per mounted session. Choices must not reorder between renders
  // or "you picked B" stops meaning anything.
  const deck = useMemo(
    () => questions.map(q => shuffleChoices(q, seedKey)),
    [questions, seedKey],
  );

  const [idx, setIdx] = useState(initialIndex);
  const [responses, setResponses] = useState(initialResponses);
  const [selected, setSelected] = useState(null);
  const [sprInput, setSprInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [flagged, setFlagged] = useState(() => new Set());
  const [eliminated, setEliminated] = useState(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const questionStart = useRef(Date.now());

  const q = deck[idx];
  const meta = q ? skillMeta(q.skill) : null;
  const isTutor = mode === 'tutor';
  const answeredIds = useMemo(() => new Set(responses.map(r => r.questionId)), [responses]);

  // Countdown ticks off an absolute deadline, never a decrementing counter — a
  // counter silently gifts the student time on every reload.
  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);

  const secondsLeft = deadline ? Math.max(0, Math.round((deadline - now) / 1000)) : null;

  const finish = useCallback((finalResponses) => {
    onComplete?.(finalResponses);
  }, [onComplete]);

  // Time's up — submit whatever exists, exactly as the real test does.
  useEffect(() => {
    if (secondsLeft === 0) finish(responses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // Reset per-question UI whenever we move.
  useEffect(() => {
    questionStart.current = Date.now();
    setEliminated(new Set());
    const prior = responses.find(r => r.questionId === deck[idx]?.id);
    if (prior) {
      setSelected(prior.choice);
      setSprInput(prior.input || '');
      setRevealed(isTutor);
    } else {
      setSelected(null);
      setSprInput('');
      setRevealed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, deck]);

  function recordAndAdvance(choice, correct, input) {
    const seconds = Math.round((Date.now() - questionStart.current) / 1000);
    const response = {
      questionId: q.id, skill: q.skill, domain: q.domain, section: q.section,
      difficulty: q.difficulty, targetSeconds: q.targetSeconds,
      choice, input: input ?? null, correct, seconds,
      flagged: flagged.has(q.id), answeredAt: Date.now(),
    };
    const next = [...responses.filter(r => r.questionId !== q.id), response];
    setResponses(next);
    onAnswer?.(response);
    return next;
  }

  function submitAnswer() {
    if (!q) return;
    let correct, choice, input = null;
    if (q.format === 'spr') {
      input = sprInput;
      correct = sprMatches(sprInput, q.sprAccept);
      choice = null;
    } else {
      if (selected == null) return;
      choice = selected;
      correct = selected === q.ans;
    }
    const next = recordAndAdvance(choice, correct, input);

    if (isTutor) {
      setRevealed(true);
    } else if (idx < deck.length - 1) {
      setIdx(idx + 1);
    } else {
      setReviewing(true);
      void next;
    }
  }

  function goNext() {
    if (idx < deck.length - 1) setIdx(idx + 1);
    else setReviewing(true);
  }

  const canSubmit = q?.format === 'spr' ? sprInput.trim().length > 0 : selected != null;
  const answeredCount = responses.length;

  // ── Review screen (before final submit, and after a tutor run) ──
  if (reviewing || !q) {
    const unanswered = deck.filter(d => !answeredIds.has(d.id));
    const flaggedList = deck.filter(d => flagged.has(d.id));
    return (
      <div style={CC({ gap: 18 })}>
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: 0 }}>Check your work</h3>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 6, lineHeight: 1.6 }}>
            {answeredCount} of {deck.length} answered
            {flaggedList.length > 0 && ` · ${flaggedList.length} flagged`}
            {unanswered.length > 0 && ` · ${unanswered.length} left blank`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 40 : 44}px,1fr))`, gap: 8, marginTop: 18 }}>
            {deck.map((d, i) => {
              const isAnswered = answeredIds.has(d.id);
              const isFlagged = flagged.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => { setReviewing(false); setIdx(i); }}
                  style={{
                    position: 'relative', height: 40, borderRadius: 9, cursor: 'pointer',
                    border: `1px solid ${isFlagged ? C.amber : isAnswered ? tint(accent, 0.4) : C.b2}`,
                    background: isAnswered ? tint(accent, 0.16) : 'rgba(255,255,255,0.02)',
                    color: isAnswered ? C.t1 : C.t3, fontWeight: 700, fontSize: 12.5, fontFamily: C.FM,
                  }}
                >
                  {i + 1}
                  {isFlagged && <Flag size={9} color={C.amber} style={{ position: 'absolute', top: 3, right: 3 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginTop: 20 }}>
            <button onClick={() => finish(responses)} style={btn(`linear-gradient(135deg,${accent},${accent}cc)`)}>
              Submit {mode === 'exam' ? 'module' : 'set'} <ArrowRight size={14} />
            </button>
            {unanswered.length > 0 && (
              <button onClick={() => { const first = deck.findIndex(d => !answeredIds.has(d.id)); setReviewing(false); setIdx(first); }} style={btnG()}>
                Go to first unanswered
              </button>
            )}
            {onExit && <button onClick={onExit} style={btnG()}>Leave</button>}
          </div>
          {mode === 'exam' && (
            <div style={{ fontSize: 11, color: C.t3, marginTop: 12 }}>
              Once you submit this module you cannot return to it — same as the real test.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Question screen ──
  const diff = DIFFICULTIES[q.difficulty];
  return (
    <div style={CC({ gap: 14 })}>
      {/* Header: progress, timer, flag */}
      <div style={{ ...R({ gap: 12, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
        <div style={R({ gap: 10 })}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FM }}>
            {idx + 1} <span style={{ color: C.t3, fontWeight: 500 }}>/ {deck.length}</span>
          </span>
          <span style={pill(tint(meta.color, 0.14), meta.color, { fontSize: 10.5, border: `1px solid ${tint(meta.color, 0.28)}` })}>
            {meta.label}
          </span>
          {isTutor && (
            <span style={pill(tint(diff.color, 0.12), diff.color, { fontSize: 10, border: `1px solid ${tint(diff.color, 0.25)}` })}>
              {diff.label}
            </span>
          )}
        </div>
        <div style={R({ gap: 8 })}>
          {secondsLeft != null && (
            <span style={{
              ...pill(secondsLeft <= 300 ? tint(C.rose, 0.16) : 'rgba(255,255,255,0.05)', secondsLeft <= 300 ? C.roseL : C.t2,
                { fontSize: 12, fontFamily: C.FM, fontWeight: 700, gap: 5, padding: '5px 12px' }),
            }}>
              <Clock size={12} />
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </span>
          )}
          <button
            onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
            title="Flag for review"
            style={btnSm(flagged.has(q.id) ? tint(C.amber, 0.2) : 'rgba(255,255,255,0.05)', {
              border: `1px solid ${flagged.has(q.id) ? tint(C.amber, 0.4) : C.b1}`, padding: '6px 10px',
            })}
          >
            <Flag size={12} color={flagged.has(q.id) ? C.amberL : C.t3} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((idx + 1) / deck.length) * 100}%`, background: accent, transition: 'width .3s' }} />
      </div>

      {/* Stimulus + question */}
      <div style={glass({ padding: isMobile ? 18 : 24 })}>
        {q.figure && <FigureTable figure={q.figure} />}

        {q.notes && (
          <div style={{ ...glass2({ padding: 16 }), marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Student notes
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: C.t2, fontSize: 13, lineHeight: 1.75 }}>
              {q.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}

        {q.stimulus && (
          <div style={{ fontSize: isMobile ? 13.5 : 14.5, color: C.t1, lineHeight: 1.8, marginBottom: 18, whiteSpace: 'pre-wrap' }}>
            {q.stimulus}
          </div>
        )}

        <div style={{ fontSize: isMobile ? 13.5 : 14.5, color: C.t1, lineHeight: 1.7, fontWeight: 600, marginBottom: 18 }}>
          {q.q}
        </div>

        {/* Answer input */}
        {q.format === 'spr' ? (
          <div>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>
              Type your answer. Fractions like 3/4 and decimals like 0.75 are both accepted.
            </div>
            <input
              data-sat-spr="1"
              value={sprInput}
              onChange={e => setSprInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit && !revealed) submitAnswer(); }}
              placeholder="Your answer"
              disabled={revealed}
              style={inp({ maxWidth: 220, fontFamily: C.FM, fontSize: 16, textAlign: 'center' })}
            />
          </div>
        ) : (
          <div style={CC({ gap: 9 })}>
            {q.ch.map((choice, i) => {
              const isSel = selected === i;
              const isCorrect = revealed && i === q.ans;
              const isWrongPick = revealed && isSel && i !== q.ans;
              const isElim = eliminated.has(i);
              const borderColor = isCorrect ? C.green : isWrongPick ? C.rose : isSel ? accent : C.b2;
              const bg = isCorrect ? tint(C.green, 0.12) : isWrongPick ? tint(C.rose, 0.12) : isSel ? tint(accent, 0.1) : 'rgba(255,255,255,0.02)';
              return (
                <div key={i} style={R({ gap: 8, alignItems: 'stretch' })}>
                  <button
                    data-sat-choice={i}
                    onClick={() => !revealed && !isElim && setSelected(i)}
                    disabled={revealed || isElim}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                      padding: '13px 16px', borderRadius: 11, border: `1px solid ${borderColor}`,
                      background: bg, cursor: revealed || isElim ? 'default' : 'pointer',
                      opacity: isElim ? 0.35 : 1, textDecoration: isElim ? 'line-through' : 'none',
                      transition: 'all .15s', fontFamily: C.FB,
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${borderColor}`, background: isSel || isCorrect ? borderColor : 'transparent',
                      color: isSel || isCorrect ? '#fff' : C.t3, fontSize: 11.5, fontWeight: 700, fontFamily: C.FM,
                    }}>
                      {isCorrect ? <Check size={13} /> : isWrongPick ? <X size={13} /> : LETTERS[i]}
                    </span>
                    <span style={{ fontSize: isMobile ? 13 : 13.5, color: C.t1, lineHeight: 1.65 }}>{choice}</span>
                  </button>
                  {!revealed && (
                    <button
                      onClick={() => setEliminated(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); if (selected === i) setSelected(null); return n; })}
                      title="Cross out"
                      style={{
                        flexShrink: 0, width: 34, borderRadius: 9, cursor: 'pointer',
                        border: `1px solid ${isElim ? tint(C.rose, 0.35) : C.b1}`,
                        background: isElim ? tint(C.rose, 0.12) : 'rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ban size={12} color={isElim ? C.roseL : C.t4} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation — tutor mode only */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ ...glass2({ padding: 16 }), marginTop: 18, borderColor: tint(accent, 0.25) }}>
                <div style={{ ...R({ gap: 6 }), marginBottom: 8 }}>
                  <Sparkles size={13} color={accent} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    Why
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.75 }}>{q.exp}</div>

                {/* The rationale for the choice they actually picked — the single
                    most useful thing to show after a miss. */}
                {q.format === 'mcq' && selected != null && selected !== q.ans && q.distractorExp?.[selected] && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.roseL, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                      You chose {LETTERS[selected]}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>{q.distractorExp[selected]}</div>
                  </div>
                )}
                {q.format === 'spr' && q.hint && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}`, fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>
                    {q.hint}
                  </div>
                )}
                {q.trap && (
                  <div style={{ marginTop: 12 }}>
                    <span style={pill(tint(C.amber, 0.12), C.amberL, { fontSize: 10.5, border: `1px solid ${tint(C.amber, 0.25)}` })}>
                      Trap: {q.trap.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
        <div style={R({ gap: 8 })}>
          {mode !== 'exam' && idx > 0 && (
            <button onClick={() => setIdx(idx - 1)} style={btnG({ padding: '9px 14px' })}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {onExit && <button onClick={onExit} style={btnG({ padding: '9px 14px' })}>Leave</button>}
        </div>
        <div style={R({ gap: 8 })}>
          {mode !== 'tutor' && (
            <button onClick={goNext} style={btnG({ padding: '9px 16px' })}>
              Skip <ChevronRight size={14} />
            </button>
          )}
          {revealed ? (
            <button onClick={goNext} style={btn(`linear-gradient(135deg,${accent},${accent}cc)`)}>
              {idx < deck.length - 1 ? 'Next question' : 'See results'} <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={submitAnswer} disabled={!canSubmit}
              style={btn(`linear-gradient(135deg,${accent},${accent}cc)`, { opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' })}
            >
              {isTutor ? 'Check answer' : idx < deck.length - 1 ? 'Save & next' : 'Save & review'}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { sprMatches };
