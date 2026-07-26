import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, ChevronRight, ChevronDown, RotateCcw, Sparkles, Trash2, Filter } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import EmptyState from '../ui/EmptyState';
import SatQuestionPlayer from './SatQuestionPlayer';
import { useSatSession, scheduleReviewRetry } from './useSatSession';
import * as DB from '../../lib/db';
import { detectPatterns } from '../../lib/sat/errorPatterns';
import { getQuestion } from '../../data/sat/questions/index.js';
import { ERROR_TYPES, ERROR_TYPE_IDS, TRAP_TAGS, skillMeta } from '../../data/sat/taxonomy';
import { nextReviewLabel } from '../../lib/fsrs';

// ─────────────────────────────────────────────────────────────────────────────
// Review Log — a first-class tab, not a results footnote.
//
// The evidence on score improvement is blunt: practice tests find your
// mistakes, review fixes them. So this screen is built around one action the
// student performs on every miss — say WHY you missed it — because a content
// gap and a careless slip look identical on a score report and need opposite
// remedies.
//
// Retries are scheduled through src/lib/fsrs.js, the same ts-fsrs scheduler the
// flashcard decks already use.
// ─────────────────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'untriaged', label: 'Needs sorting' },
  { id: 'due', label: 'Due to retry' },
  { id: 'all', label: 'All open' },
  { id: 'resolved', label: 'Cleared' },
];

export default function SatReviewLogPanel({ accent = C.rose, satData, isMobile = false, onNavigate }) {
  const { reviewLog, reload } = satData;
  const [filter, setFilter] = useState('untriaged');
  const [expanded, setExpanded] = useState(null);
  const [retrySession, setRetrySession] = useState(null);
  const { start, recordResponse, finish } = useSatSession();

  const open = useMemo(() => reviewLog.filter(r => !r.resolved), [reviewLog]);
  const untriaged = useMemo(() => open.filter(r => !r.errorType), [open]);
  const due = useMemo(() => open.filter(r => (r.due || 0) <= Date.now()), [open]);
  const patterns = useMemo(() => detectPatterns(open), [open]);

  const visible = useMemo(() => {
    const source = filter === 'resolved' ? reviewLog.filter(r => r.resolved)
      : filter === 'untriaged' ? untriaged
        : filter === 'due' ? due
          : open;
    return source
      .map(r => ({ ...r, question: getQuestion(r.questionId) }))
      .filter(r => r.question);
  }, [filter, reviewLog, untriaged, due, open]);

  const triage = useCallback(async (entry, errorType) => {
    await DB.updateSatReviewEntry(entry.id, { errorType, triagedAt: Date.now() });
    toast.success(ERROR_TYPES[errorType].prescription, { duration: 4000 });
    reload();
  }, [reload]);

  const clearEntry = useCallback(async (entry) => {
    await DB.resolveSatReviewEntry(entry.id);
    reload();
  }, [reload]);

  async function startRetry() {
    const questions = due.map(r => getQuestion(r.questionId)).filter(Boolean).slice(0, 10);
    if (!questions.length) { toast('Nothing is due for retry yet.'); return; }
    const id = await start({ kind: 'review', questions, meta: {} });
    setRetrySession({ questions, attemptId: id });
  }

  async function handleRetryComplete(responses) {
    // Advance each retried entry through FSRS according to how it went.
    for (const r of responses) {
      const entry = open.find(e => e.questionId === r.questionId);
      if (entry) await scheduleReviewRetry(entry, r.correct);
    }
    await finish(retrySession.attemptId, responses);
    setRetrySession(null);
    reload();
  }

  // ── Retry session ──
  if (retrySession) {
    return (
      <SatQuestionPlayer
        questions={retrySession.questions} mode="tutor"
        seedKey={`retry-${retrySession.attemptId}`} accent={accent} isMobile={isMobile}
        onAnswer={(r) => recordResponse(retrySession.attemptId, r)}
        onComplete={handleRetryComplete}
        onExit={() => { setRetrySession(null); reload(); }}
      />
    );
  }

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        icon={AlertTriangle} color={accent} color2={C.orange}
        eyebrow="Review log" title="Your mistakes, organised"
        sub="Questions only find your gaps. Working out why you missed them is what closes them — and it is the step almost everyone skips."
        stats={[
          { value: open.length, label: 'open' },
          { value: due.length, label: 'due to retry', color: due.length ? C.amber : undefined },
        ]}
        m={isMobile}
        tourTag="sat-deep-review"
      />

      {open.length === 0 && filter !== 'resolved' ? (
        <EmptyState
          icon={Check} title="Nothing to review"
          body="Your review log is clear. It fills up as you miss questions in practice and on full tests — which is the point, so do not aim to keep it empty."
          actionLabel="Go practise" onAction={() => onNavigate?.('practice')} accent={accent}
        />
      ) : (
        <>
          {/* ── Patterns ── */}
          {patterns.length > 0 && (
            <div style={glass({ padding: isMobile ? 18 : 24 })}>
              <SectionTitle icon={Sparkles} color={C.violet}>Patterns we can see</SectionTitle>
              <div style={CC({ gap: 11 })}>
                {patterns.slice(0, 3).map(p => (
                  <div key={p.id} style={{
                    ...glass2({ padding: 14 }),
                    borderColor: tint(p.severity >= 3 ? C.rose : C.amber, 0.28),
                    background: `linear-gradient(120deg,${tint(p.severity >= 3 ? C.rose : C.amber, 0.08)},rgba(255,255,255,0.015))`,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, lineHeight: 1.5 }}>{p.title}</div>
                    <div style={{ fontSize: 11.5, color: C.t2, marginTop: 6, lineHeight: 1.65 }}>{p.body}</div>
                    {p.cta && (
                      <button
                        onClick={() => {
                          if (p.cta.action === 'drill' && p.cta.skill) onNavigate?.('practice', { skill: p.cta.skill });
                          else if (p.cta.action === 'timed') onNavigate?.('practice');
                          else setFilter('all');
                        }}
                        style={{ ...btnG({ padding: '6px 12px', fontSize: 11.5 }), marginTop: 10 }}
                      >
                        {p.cta.label} <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={G(3, 12, {}, isMobile)}>
            <StatTile icon={AlertTriangle} color={untriaged.length ? C.rose : C.green} value={untriaged.length} label="need sorting" onClick={() => setFilter('untriaged')} />
            <StatTile icon={RotateCcw} color={due.length ? C.amber : C.t3} value={due.length} label="due to retry" onClick={() => setFilter('due')} />
            <StatTile icon={Check} color={C.green} value={reviewLog.filter(r => r.resolved).length} label="cleared" onClick={() => setFilter('resolved')} />
          </div>

          {due.length > 0 && (
            <button onClick={startRetry} style={btn(`linear-gradient(135deg,${C.amber},${C.orange})`)}>
              <RotateCcw size={14} /> Retry {Math.min(10, due.length)} due question{due.length === 1 ? '' : 's'}
            </button>
          )}

          {/* ── Filters ── */}
          <div style={R({ gap: 7, flexWrap: 'wrap' })}>
            <Filter size={13} color={C.t3} />
            {FILTERS.map(f => (
              <button
                key={f.id} onClick={() => setFilter(f.id)}
                style={btnSm(filter === f.id ? tint(accent, 0.2) : 'rgba(255,255,255,0.03)', {
                  border: `1px solid ${filter === f.id ? tint(accent, 0.4) : C.b1}`,
                  color: filter === f.id ? '#fff' : C.t2, fontSize: 11.5,
                })}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Entries ── */}
          <div style={CC({ gap: 11 })}>
            {visible.length === 0 && (
              <div style={{ ...glass2({ padding: 20, textAlign: 'center' }), fontSize: 12.5, color: C.t3 }}>
                Nothing in this filter.
              </div>
            )}
            {visible.map(entry => {
              const q = entry.question;
              const meta = skillMeta(q.skill);
              const isOpen = expanded === entry.id;
              const errType = entry.errorType ? ERROR_TYPES[entry.errorType] : null;
              return (
                <div key={entry.id} style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${entry.errorType ? C.b1 : tint(C.rose, 0.3)}` }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                    style={{ width: '100%', textAlign: 'left', padding: isMobile ? 14 : 16, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FB }}
                  >
                    <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginBottom: 8 }}>
                      <span style={pill(tint(meta.color, 0.14), meta.color, { fontSize: 10 })}>{meta.label}</span>
                      {entry.missCount > 1 && (
                        <span style={pill(tint(C.rose, 0.16), C.roseL, { fontSize: 10 })}>missed {entry.missCount}x</span>
                      )}
                      {errType && (
                        <span style={pill(tint(errType.color, 0.14), errType.color, { fontSize: 10 })}>{errType.label}</span>
                      )}
                      {entry.wasFlaggedGuess && (
                        <span style={pill(tint(C.sky, 0.14), C.skyL, { fontSize: 10 })}>flagged guess</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>
                        {entry.resolved ? 'cleared' : nextReviewLabel({ due: entry.due })}
                      </span>
                      <ChevronDown size={14} color={C.t3} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                    </div>
                    <div style={{
                      fontSize: 12.5, color: C.t1, lineHeight: 1.6,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isOpen ? 99 : 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {q.q}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: isMobile ? '0 14px 14px' : '0 16px 16px' }}>
                          {q.stimulus && (
                            <div style={{ ...glass2({ padding: 12 }), fontSize: 12, color: C.t2, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                              {q.stimulus}
                            </div>
                          )}
                          <div style={{ ...glass2({ padding: 12 }), marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                              Correct answer{q.format === 'mcq' ? `: ${['A', 'B', 'C', 'D'][q.ans]}` : ''}
                            </div>
                            {q.format === 'mcq' && (
                              <div style={{ fontSize: 12.5, color: C.t1, marginBottom: 8 }}>{q.ch[q.ans]}</div>
                            )}
                            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>{q.exp}</div>
                            {q.trap && (
                              <div style={{ marginTop: 10, fontSize: 11, color: C.amberL }}>
                                Trap: {TRAP_TAGS[q.trap] || q.trap.replace(/_/g, ' ')}
                              </div>
                            )}
                          </div>

                          {!entry.resolved && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                                {entry.errorType ? 'Change your answer' : 'Why did you miss this?'}
                              </div>
                              <div style={R({ gap: 7, flexWrap: 'wrap' })}>
                                {ERROR_TYPE_IDS.map(t => (
                                  <button
                                    key={t} onClick={() => triage(entry, t)}
                                    style={btnSm(entry.errorType === t ? tint(ERROR_TYPES[t].color, 0.2) : 'rgba(255,255,255,0.03)', {
                                      border: `1px solid ${entry.errorType === t ? tint(ERROR_TYPES[t].color, 0.45) : C.b1}`,
                                      fontSize: 11.5, color: entry.errorType === t ? '#fff' : C.t2,
                                    })}
                                  >
                                    {ERROR_TYPES[t].label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 14 }}>
                                <button onClick={() => onNavigate?.('practice', { skill: q.skill })} style={btnG({ padding: '7px 13px', fontSize: 11.5 })}>
                                  Drill {meta.label} <ChevronRight size={12} />
                                </button>
                                <button onClick={() => clearEntry(entry)} style={btnG({ padding: '7px 13px', fontSize: 11.5 })}>
                                  <Trash2 size={12} /> I have got this now
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
