import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Flag, ChevronRight, ChevronLeft, Clock, Ban, Sparkles, ArrowRight,
  Calculator, BookOpen, LineChart, Brain, Lightbulb, Loader2, Eye, EyeOff, Keyboard,
  ShieldCheck, Wand2,
} from 'lucide-react';
import { C, glass, glass2, btnSm, btnG, inp, R, CC, tint, pill, onTint, accentFill } from '../../lib/theme';
import { skillMeta, DIFFICULTIES } from '../../data/sat/taxonomy';
import { strategyFor } from '../../data/sat/strategies';
import { shuffleChoices } from '../../lib/sat/shuffle';
import { hintForQuestion } from '../../lib/sat/aiQuestions';
import { canGraph } from '../../lib/sat/desmosSeed';
import { useSatTools } from './SatToolsContext';
import { useMediaQuery } from '../ui/primitives';
import MathText from '../ui/MathText';
import SatAnnotatableText, { hasMathMarkup } from './SatAnnotatableText';
import { satBtn, satWash } from './satUi';

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
//
// TEST-DAY FIDELITY. Everything a student can reach from this screen is
// something Bluebook also gives them: the Desmos calculator, the reference
// sheet, flag-for-review, cross-out, a hideable timer, and a two-pane layout
// with the passage beside the question. The two additions the real exam does
// NOT have — an AI hint and "ask Medabrain" — are gated on mode, because a hint
// available during a timed module would make the timing data meaningless.
// ─────────────────────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'];

// A passage long enough that reading it and the question in one column means
// scrolling between them — the exact friction Bluebook's split view removes.
const SPLIT_STIMULUS_CHARS = 240;

// And the narrowest total width at which two panes are still comfortably
// readable. Below this the split is a downgrade: two cramped columns, each
// needing its own scroll, instead of one that reads cleanly.
const SPLIT_MIN_WIDTH = 1080;

/** Normalize a grid-in answer for comparison: "1/2", "0.5", ".5" all match. */
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
    <div style={{ ...glass2({ padding: 0, overflow: 'hidden' }), marginBottom: 12 }}>
      {figure.title && (
        <div style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 700, color: C.t2, borderBottom: `1px solid ${C.b1}` }}>
          {figure.title}
        </div>
      )}
      <div className="sat-scroll-x">
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr>
              {figure.columns.map((c, i) => (
                <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 12px', color: C.t3, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${C.b1}`, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {figure.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '8px 12px', color: ci === 0 ? C.t2 : C.t1, fontFamily: ci === 0 ? C.FB : C.FM, borderBottom: ri < figure.rows.length - 1 ? `1px solid ${C.b0}` : 'none' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One button in the on-question tool strip. */
function ToolButton({ icon: Icon, label, onClick, color = C.t2, active = false, disabled = false, title }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title || label}
      style={btnSm(active ? tint(color, 0.2) : 'rgba(255,255,255,0.035)', {
        border: `1px solid ${active ? tint(color, 0.42) : C.b1}`,
        color: disabled ? C.t4 : active ? onTint(color) : C.t2,
        fontSize: 11.5, padding: '4px 12px', gap: 4,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      })}
    >
      <Icon size={12} color={disabled ? C.t4 : color} /> {label}
    </button>
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
 * @param {function} [props.onAskMedabrain] ({question, answered, studentChoice, wasCorrect}) => void
 * @param {string}   [props.title]
 * @param {string}   [props.accent]
 * @param {boolean}  [props.isMobile]
 */
export default function SatQuestionPlayer({
  questions = [], mode = 'tutor', seedKey = 'session', deadline = null,
  onAnswer, onComplete, onExit, onAskMedabrain, title = 'Practice', accent = C.blue,
  isMobile = false, initialIndex = 0, initialResponses = [],
  /** The learner profile, so a hint can be pitched at this student. */
  profile = null,
}) {
  // Shuffle once per mounted session. Choices must not reorder between renders
  // or "you picked B" stops meaning anything.
  const deck = useMemo(
    () => questions.map(q => shuffleChoices(q, seedKey)),
    [questions, seedKey],
  );

  const tools = useSatTools();
  // Measured against the real viewport rather than derived from `isMobile`, so
  // a half-width desktop window and a landscape tablet both get the layout that
  // actually fits them. See `splitLayout` below.
  const canSplit = useMediaQuery(`(min-width: ${SPLIT_MIN_WIDTH}px)`);
  const [idx, setIdx] = useState(initialIndex);
  const [responses, setResponses] = useState(initialResponses);
  const [selected, setSelected] = useState(null);
  const [sprInput, setSprInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [flagged, setFlagged] = useState(() => new Set());
  const [eliminated, setEliminated] = useState(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [timerHidden, setTimerHidden] = useState(false);
  // questionId -> { loading, text } — one AI hint per question, on request only.
  const [hints, setHints] = useState({});
  const [showStrategy, setShowStrategy] = useState(false);
  // questionId -> [{start, end, color}]. Kept in component state rather than
  // persisted: Bluebook discards annotations when a module ends, and a student
  // returning to a question inside the same module is exactly the case this
  // needs to survive, which component state already covers.
  const [highlights, setHighlights] = useState({});
  const questionStart = useRef(Date.now());

  const q = deck[idx];
  const meta = q ? skillMeta(q.skill) : null;
  const isTutor = mode === 'tutor';
  const isExam = mode === 'exam';
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
    setShowStrategy(false);
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

  // The calculator's header carries the one honest caveat: it exists on Math,
  // not on Reading & Writing. Set from here because this is the only place that
  // knows which section the student is actually looking at.
  useEffect(() => {
    if (!q || !tools.available) return;
    tools.setCalculatorNote(
      q.section === 'math'
        ? null
        : 'The real exam gives you no calculator on Reading & Writing. It is here so you can use it freely while you practice — just do not build a habit that test day will take away.',
    );
  }, [q?.section, tools.available]); // eslint-disable-line react-hooks/exhaustive-deps

  function recordAndAdvance(choice, correct, input) {
    const seconds = Math.round((Date.now() - questionStart.current) / 1000);
    const response = {
      questionId: q.id, skill: q.skill, domain: q.domain, section: q.section,
      difficulty: q.difficulty, targetSeconds: q.targetSeconds,
      choice, input: input ?? null, correct, seconds,
      flagged: flagged.has(q.id), answeredAt: Date.now(),
      // The question itself travels with the response so a miss can be reviewed
      // later even when the item exists nowhere else. Generated items — the
      // baseline's, and AI-authored drill sets — are not in the static bank, so
      // an id alone is a dangling reference for them. useSatSession stores this
      // on the Review Log entry only when the id is not in the bank, so the
      // common case stays a plain reference.
      question: q,
    };
    const next = [...responses.filter(r => r.questionId !== q.id), response];
    setResponses(next);
    onAnswer?.(response);
    return next;
  }

  const canSubmit = q?.format === 'spr' ? sprInput.trim().length > 0 : selected != null;
  const answeredCount = responses.length;

  const submitAnswer = useCallback(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sprInput, selected, isTutor, idx, deck.length, responses, flagged]);

  const goNext = useCallback(() => {
    if (idx < deck.length - 1) setIdx(idx + 1);
    else setReviewing(true);
  }, [idx, deck.length]);

  const toggleFlag = useCallback(() => {
    if (!q) return;
    setFlagged(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
  }, [q]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  // The real exam is a keyboard-and-mouse test and fast students drive it from
  // the keyboard. Typing into the grid-in box is exempted so digits still reach
  // the input, and Alt-chords are left alone for the tools (see SatToolsContext).
  useEffect(() => {
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) {
        if (e.key === 'Enter' && canSubmit && !revealed) { e.preventDefault(); submitAnswer(); }
        return;
      }
      if (reviewing || !q) return;

      const k = e.key.toLowerCase();
      if (!revealed && q.format === 'mcq') {
        const byLetter = LETTERS.findIndex(l => l.toLowerCase() === k);
        const byNumber = /^[1-4]$/.test(k) ? Number(k) - 1 : -1;
        const pick = byLetter >= 0 ? byLetter : byNumber;
        if (pick >= 0 && pick < q.ch.length) {
          e.preventDefault();
          if (!eliminated.has(pick)) setSelected(pick);
          return;
        }
      }
      if (k === 'f') { e.preventDefault(); toggleFlag(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealed) goNext();
        else if (canSubmit) submitAnswer();
        return;
      }
      if (e.key === 'ArrowRight' && (revealed || mode !== 'tutor')) { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' && !isExam && idx > 0) { e.preventDefault(); setIdx(idx - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, revealed, canSubmit, reviewing, eliminated, idx, isExam, mode, submitAnswer, goNext, toggleFlag]);

  // ── AI hint ────────────────────────────────────────────────────────────────
  const askForHint = useCallback(async () => {
    if (!q || hints[q.id]?.loading) return;
    setHints(h => ({ ...h, [q.id]: { loading: true, text: null } }));
    const text = await hintForQuestion(q, { profile });
    setHints(h => ({
      ...h,
      [q.id]: {
        loading: false,
        text: text || 'Could not reach the tutor right now — the strategy card below still applies.',
      },
    }));
    if (!text) setShowStrategy(true);
  }, [q, hints, profile]);

  const askMedabrain = useCallback(() => {
    if (!q) return;
    onAskMedabrain?.({
      question: q,
      answered: revealed || answeredIds.has(q.id),
      studentChoice: q.format === 'spr' ? sprInput : (selected != null ? LETTERS[selected] : null),
      wasCorrect: responses.find(r => r.questionId === q.id)?.correct ?? null,
    });
  }, [q, revealed, answeredIds, sprInput, selected, responses, onAskMedabrain]);

  // ── Review screen (before final submit, and after a tutor run) ──
  if (reviewing || !q) {
    const unanswered = deck.filter(d => !answeredIds.has(d.id));
    const flaggedList = deck.filter(d => flagged.has(d.id));
    return (
      <div style={CC({ gap: 16 })}>
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <h3 style={{ fontSize: 18, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: 0 }}>Check your work</h3>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>
            {answeredCount} of {deck.length} answered
            {flaggedList.length > 0 && ` · ${flaggedList.length} flagged`}
            {unanswered.length > 0 && ` · ${unanswered.length} left blank`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 44 : 44}px,1fr))`, gap: 8, marginTop: 16 }}>
            {deck.map((d, i) => {
              const isAnswered = answeredIds.has(d.id);
              const isFlagged = flagged.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => { setReviewing(false); setIdx(i); }}
                  className="sat-tap"
                  aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', not answered'}${isFlagged ? ', flagged' : ''}`}
                  style={{
                    position: 'relative', height: isMobile ? 44 : 40, borderRadius: 8, cursor: 'pointer',
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

          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 20 }}>
            <button onClick={() => finish(responses)} style={satBtn(accent)}>
              Submit {isExam ? 'module' : 'set'} <ArrowRight size={14} />
            </button>
            {unanswered.length > 0 && (
              <button onClick={() => { const first = deck.findIndex(d => !answeredIds.has(d.id)); setReviewing(false); setIdx(first); }} style={btnG()}>
                Go to first unanswered
              </button>
            )}
            {flaggedList.length > 0 && (
              <button onClick={() => { const first = deck.findIndex(d => flagged.has(d.id)); setReviewing(false); setIdx(first); }} style={btnG()}>
                Go to first flagged
              </button>
            )}
            {onExit && <button onClick={onExit} style={btnG()}>Leave</button>}
          </div>
          {isExam && (
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
  const strategy = strategyFor(q.skill);
  const graphable = q.section === 'math' && canGraph(q);
  const hint = hints[q.id];
  // A hint mid-module would corrupt the timing and accuracy data the whole tab
  // is built on, so it exists in tutor mode only.
  const hintsAllowed = isTutor && !revealed;
  // Bluebook's two-pane view only helps when both panes are wide enough to read
  // without their own horizontal scroll. `!isMobile` alone put two ~360px
  // columns on an 800px tablet or a half-width desktop window, which is worse
  // than one column — hence a real width gate rather than the phone breakpoint.
  const splitLayout = canSplit && !!q.stimulus && q.stimulus.length > SPLIT_STIMULUS_CHARS;
  const lowTime = secondsLeft != null && secondsLeft <= 300;

  const stimulusBlock = (
    <>
      {q.figure && <FigureTable figure={q.figure} />}
      {q.notes && (
        <div style={{ ...glass2({ padding: 16 }), marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
            Student notes
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, color: C.t2, fontSize: 13, lineHeight: 1.55 }}>
            {q.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
      {q.stimulus && (
        <div style={{ fontSize: isMobile ? 13.5 : 14.5, color: C.t1, lineHeight: 1.55, marginBottom: splitLayout ? 0 : 18, whiteSpace: 'pre-wrap' }}>
          {hasMathMarkup(q.stimulus) ? (
            // Maths stimuli go through MathText and lose highlighting: KaTeX
            // inserts nodes with no character correspondence, so any offset
            // computed across them would be wrong. See SatAnnotatableText.
            <MathText text={q.stimulus} />
          ) : (
            <SatAnnotatableText
              text={q.stimulus}
              highlights={highlights[q.id] || []}
              onChange={(next) => setHighlights(prev => ({ ...prev, [q.id]: next }))}
            />
          )}
        </div>
      )}
    </>
  );

  const answerBlock = (
    <>
      <div style={{ fontSize: isMobile ? 13.5 : 14.5, color: C.t1, lineHeight: 1.55, fontWeight: 600, marginBottom: 16 }}>
        <MathText text={q.q} />
      </div>

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
            style={inp({ maxWidth: 220, fontFamily: C.FM, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', textAlign: 'center' })}
          />
        </div>
      ) : (
        <div style={CC({ gap: 8 })}>
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
                  className="sat-choice"
                  aria-pressed={isSel}
                  onClick={() => !revealed && !isElim && setSelected(i)}
                  disabled={revealed || isElim}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                    padding: isMobile ? '14px 15px' : '13px 16px', borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: bg, cursor: revealed || isElim ? 'default' : 'pointer',
                    opacity: isElim ? 0.35 : 1, textDecoration: isElim ? 'line-through' : 'none',
                    fontFamily: C.FB,
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${borderColor}`, background: isSel || isCorrect ? accentFill(borderColor) : 'transparent',
                    color: isSel || isCorrect ? C.onAccent : C.t3, fontSize: 11.5, fontWeight: 700, fontFamily: C.FM,
                  }}>
                    {isCorrect ? <Check size={13} /> : isWrongPick ? <X size={13} /> : LETTERS[i]}
                  </span>
                  <span style={{ fontSize: isMobile ? 13 : 13.5, color: C.t1, lineHeight: 1.55 }}>
                    <MathText text={choice} />
                  </span>
                </button>
                {!revealed && (
                  <button
                    onClick={() => setEliminated(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); if (selected === i) setSelected(null); return n; })}
                    title="Cross out"
                    className="sat-tap"
                    aria-label={`Cross out choice ${LETTERS[i]}`}
                    aria-pressed={isElim}
                    style={{
                      flexShrink: 0, width: isMobile ? 44 : 34, borderRadius: 8, cursor: 'pointer',
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

      {/* ── Hint (tutor mode, before answering) ── */}
      <AnimatePresence>
        {hint?.text && !revealed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ ...glass2({ padding: 12 }), marginTop: 16, borderColor: tint(C.amber, 0.24), background: satWash(C.amber, 0.06) }}>
              <div style={{ ...R({ gap: 4 }), marginBottom: 8 }}>
                <Lightbulb size={12} color={C.amberL} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.amberL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>Hint — not the answer</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.55 }}>{hint.text}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Strategy card (always available, no network needed) ── */}
      <AnimatePresence>
        {showStrategy && strategy && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ ...glass2({ padding: 12 }), marginTop: 12, borderColor: tint(C.violet, 0.25) }}>
              <div style={{ ...R({ gap: 4 }), marginBottom: 8 }}>
                <Sparkles size={12} color={C.violetL} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.violetL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
                  How to attack {meta.label}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.55, fontWeight: 600 }}>{strategy.approach}</div>
              <ol style={{ margin: '8px 0px 0px', paddingLeft: 16, color: C.t2, fontSize: 12, lineHeight: 1.55 }}>
                {strategy.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Explanation — tutor mode only ── */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ ...glass2({ padding: 16 }), marginTop: 16, borderColor: tint(accent, 0.25) }}>
              <div style={{ ...R({ gap: 4 }), marginBottom: 8 }}>
                <Sparkles size={13} color={accent} />
                <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
                  Why
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.55 }}><MathText text={q.exp} /></div>

              {/* The rationale for the choice they actually picked — the single
                  most useful thing to show after a miss. */}
              {q.format === 'mcq' && selected != null && selected !== q.ans && q.distractorExp?.[selected] && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.roseL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>
                    You chose {LETTERS[selected]}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}><MathText text={q.distractorExp[selected]} /></div>
                </div>
              )}
              {q.format === 'spr' && q.hint && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}`, fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
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
              {onAskMedabrain && (
                <button onClick={askMedabrain} style={{ ...btnG({ padding: '8px 12px', fontSize: 11.5 }), marginTop: 12 }}>
                  <Brain size={12} /> Ask Medabrain about this one
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div style={CC({ gap: 12 })}>
      {/* Header: progress, timer, flag.
          Sticky so the countdown stays on screen through a long passage — on a
          timed module that is the difference between pacing yourself and
          discovering the clock ran out. */}
      <div className="sat-question-header" style={{ ...R({ gap: 12, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
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
          {/* Provenance, stated on the question itself rather than only on the
              screen that generated it. A student who scrolls back to a set two
              days later should still be able to tell where an item came from —
              and whether its key survived the independent check. */}
          {q.generated && (
            <span
              title={q.verified
                ? 'Written for you by Medabrain. A second, different model solved it without seeing the answer and agreed with the key.'
                : 'Written for you by Medabrain. It passed the structural checks, but the independent key check could not be completed.'}
              style={pill(
                tint(q.verified ? C.green : C.violet, 0.12),
                q.verified ? C.greenL : C.violetL,
                { fontSize: 10, gap: 4, border: `1px solid ${tint(q.verified ? C.green : C.violet, 0.25)}` },
              )}
            >
              {q.verified ? <ShieldCheck size={9} /> : <Wand2 size={9} />}
              {q.verified ? 'AI · key checked' : 'AI-written'}
            </span>
          )}
        </div>
        <div style={R({ gap: 8 })}>
          {secondsLeft != null && (
            <button
              onClick={() => setTimerHidden(v => !v)}
              title={timerHidden ? 'Show the timer' : 'Hide the timer — Bluebook lets you do this too'}
              style={{
                ...pill(lowTime && !timerHidden ? tint(C.rose, 0.16) : 'rgba(255,255,255,0.05)',
                  lowTime && !timerHidden ? C.roseL : C.t2,
                  { fontSize: 12, fontFamily: C.FM, fontWeight: 700, gap: 4, padding: '4px 12px' }),
                border: `1px solid ${lowTime && !timerHidden ? tint(C.rose, 0.3) : C.b1}`,
                cursor: 'pointer',
              }}
            >
              {timerHidden ? <EyeOff size={12} /> : <Clock size={12} />}
              {timerHidden
                ? 'Timer hidden'
                : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
            </button>
          )}
          <button
            onClick={toggleFlag}
            title="Flag for review (F)"
            style={btnSm(flagged.has(q.id) ? tint(C.amber, 0.2) : 'rgba(255,255,255,0.05)', {
              border: `1px solid ${flagged.has(q.id) ? tint(C.amber, 0.4) : C.b1}`, padding: '4px 8px',
            })}
          >
            <Flag size={12} color={flagged.has(q.id) ? C.amberL : C.t3} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', transform: `scaleX(${(((idx + 1) / deck.length) * 100) / 100})`, transformOrigin: 'left', background: accent, transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>

      {/* ── Test-day tool strip ── */}
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        {tools.available && (
          <>
            <ToolButton
              icon={Calculator} label="Calculator" color={C.teal}
              active={tools.calculatorOpen} onClick={tools.toggleCalculator}
              title="Desmos — alt+C"
            />
            <ToolButton
              icon={BookOpen} label="Formulas" color={C.emerald}
              active={tools.referenceOpen} onClick={tools.toggleReference}
              title="Reference sheet — Alt+R"
            />
            {graphable && (
              <ToolButton
                icon={LineChart} label="Graph this" color={C.cyan}
                onClick={() => tools.graphQuestion(q)}
                title="Load this question's equations into Desmos"
              />
            )}
          </>
        )}
        {hintsAllowed && (
          <ToolButton
            icon={hint?.loading ? Loader2 : Lightbulb}
            label={hint?.loading ? 'Thinking…' : hint?.text ? 'Hint shown' : 'Hint'}
            color={C.amber}
            disabled={!!hint?.loading || !!hint?.text}
            onClick={askForHint}
            title="One nudge — never the answer"
          />
        )}
        {isTutor && strategy && (
          <ToolButton
            icon={showStrategy ? Eye : Sparkles} label="Strategy" color={C.violet}
            active={showStrategy} onClick={() => setShowStrategy(v => !v)}
            title={`How to attack ${meta.label}`}
          />
        )}
        {onAskMedabrain && !isExam && (
          <ToolButton icon={Brain} label="Ask Medabrain" color={C.sky} onClick={askMedabrain} />
        )}
        {!isMobile && (
          <span style={{ ...R({ gap: 4 }), marginLeft: 'auto', fontSize: 10, color: C.t4 }}>
            <Keyboard size={11} />
            {q.format === 'mcq' ? 'A–D select · ' : ''}Enter {revealed ? 'next' : 'submit'} · F flag
          </span>
        )}
      </div>

      {/* Stimulus + question */}
      {splitLayout ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ ...glass({ padding: 20 }), position: 'sticky', top: 12, maxHeight: 'calc(var(--msp-vh) - 180px)', overflowY: 'auto' }}>
            {stimulusBlock}
          </div>
          <div style={glass({ padding: 20 })}>
            {answerBlock}
          </div>
        </div>
      ) : (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          {stimulusBlock}
          {answerBlock}
        </div>
      )}

      {/* Footer controls.
          Sticky on a phone: choices plus an explanation run past a screen
          height, and hunting for "Check answer" at the bottom of every question
          is a scroll per question across a two-hour session. On desktop it
          stays in flow — there is no scrolling to save. */}
      <div
        className={isMobile ? 'sat-action-bar' : undefined}
        style={{ ...R({ gap: 8, flexWrap: 'wrap' }), justifyContent: 'space-between' }}
      >
        <div style={R({ gap: 8 })}>
          {!isExam && idx > 0 && (
            <button onClick={() => setIdx(idx - 1)} className="sat-tap" style={btnG({ padding: '8px 12px' })}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {onExit && <button onClick={onExit} className="sat-tap" style={btnG({ padding: '8px 12px' })}>Leave</button>}
        </div>
        <div style={{ ...R({ gap: 8 }), flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'flex-end' }}>
          {!isTutor && (
            <button onClick={goNext} className="sat-tap" style={btnG({ padding: '8px 16px' })}>
              Skip <ChevronRight size={14} />
            </button>
          )}
          {revealed ? (
            <button
              onClick={goNext} className="sat-tap"
              style={satBtn(accent, isMobile ? { flex: 1, padding: '12px 20px' } : {})}
            >
              {idx < deck.length - 1 ? 'Next question' : 'See results'} <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={submitAnswer} disabled={!canSubmit} className="sat-tap"
              style={satBtn(accent, {
                opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed',
                ...(isMobile ? { flex: 1, padding: '12px 20px' } : {}),
              })}
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
