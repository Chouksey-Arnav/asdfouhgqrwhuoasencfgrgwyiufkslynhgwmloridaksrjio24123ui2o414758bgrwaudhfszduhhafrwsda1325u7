// ─────────────────────────────────────────────────────────────────────────────
// The Baseline — a 35-question adaptive placement test.
//
// ── Why this doesn't use SatQuestionPlayer ───────────────────────────────────
// The shared player takes an array of questions up front and lets a student
// move freely through it: back, forward, flag for later, ask for a hint. Every
// one of those affordances is correct for practice and wrong here.
//
// An adaptive sequence has no array. Question 12 does not exist until question
// 11 is answered, because its difficulty is computed from the answer. And going
// back is not merely unsupported — it is incoherent: changing an earlier answer
// would invalidate the difficulty of everything chosen after it, so the number
// at the end would describe a test the student never actually took. Hints are
// out for the same reason. This is a measurement, and a measurement you can
// lean on is not measuring you.
//
// So the interaction here is deliberately narrow: one question, four choices or
// a number, answer, next. No back button, no hints, no explanations until the
// end. All of that arrives at once on the results screen, where it belongs.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrandLoader } from '../BrandJourney';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Gauge, Sparkles, ChevronRight, Clock, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, XCircle, Target, Lock, RotateCcw,
  BarChart3, Brain, ArrowRight, ShieldCheck, Zap,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, tint, pill, lbl, inp, accentFill } from '../../lib/theme';
import { StatTile } from '../ui/PanelHero';
import { SatPageHeader, SatCard, satBtn, satWash } from './satUi';
import { SatVideoRecommendations } from './SatVideoRecs';
import { Bar } from '../ui/primitives';
import MathText from '../ui/MathText';
import * as DB from '../../lib/db';
import { generateBaselineItem } from '../../lib/sat/aiPractice';
import { shuffleChoices } from '../../lib/sat/shuffle';
import { skillMeta, SAT_SECTIONS, DIFFICULTIES } from '../../data/sat/taxonomy';
import { SCORE_DISCLAIMER } from '../../data/sat/scoring';
import { pool } from '../../data/sat/questions/index.js';
import { announce } from '../../lib/a11y';
import {
  BASELINE_LENGTH, BASELINE_COOLDOWN_DAYS,
  createBaselineSession, currentSlot, nextDifficulty, recordBaselineResponse,
  scoreBaseline, canStartBaseline, cooldownLabel, compareBaselines, difficultyForAbility,
} from '../../lib/sat/baseline';

const DIFF_LABEL = { E: 'Easier', M: 'Medium', H: 'Harder' };
const DIFF_COLOR = () => ({ E: C.green, M: C.blue, H: C.rose });

const fmtDuration = (ms) => {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function SatBaselinePanel({
  accent = C.gold, satData, profile = null, user = null, isMobile = false,
  onNavigate, onSessionComplete,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [rowId, setRowId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sprInput, setSprInput] = useState('');
  const [result, setResult] = useState(null);
  const [reviewIdx, setReviewIdx] = useState(null);

  const abortRef = useRef(null);
  const questionStart = useRef(Date.now());
  // Stems already used this run, so the generator cannot circle back to a
  // scenario it wrote four questions ago.
  const usedStems = useRef([]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Load history + any resumable run ─────────────────────────────────────
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [rows, resumable] = await Promise.all([
          DB.getSatBaselines({ limit: 8 }),
          DB.getResumableSatBaseline(),
        ]);
        if (!live) return;
        setHistory(rows);
        if (resumable) {
          setRowId(resumable.id);
          setSession(resumable);
          usedStems.current = (resumable.responses || []).map(r => r.question?.stimulus || r.question?.q).filter(Boolean);
        }
      } catch (err) {
        console.error('baseline load failed', err);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const lastCompletedAt = history[0]?.finishedAt || null;
  const gateOpen = canStartBaseline(lastCompletedAt);
  const waitLabel = cooldownLabel(lastCompletedAt);

  const answeredCount = session?.responses?.length || 0;
  const slot = session ? currentSlot(session) : null;

  // ── Fetch the next item ───────────────────────────────────────────────────
  const fetchNext = useCallback(async (activeSession) => {
    const nextSlot = currentSlot(activeSession);
    if (!nextSlot) return;
    const difficulty = nextDifficulty(activeSession);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setGenError(null);
    setSelected(null);
    setSprInput('');

    let item = null;
    try {
      item = await generateBaselineItem({
        skill: nextSlot.skill,
        difficulty,
        profile,
        avoid: usedStems.current,
        signal: controller.signal,
      });
    } catch { /* handled below */ }

    if (controller.signal.aborted) return;

    // Fall back to the static bank rather than stalling. A test that dies at
    // question 19 because of a rate limit has wasted the student's afternoon;
    // a bank item at roughly the right difficulty costs a little precision and
    // saves the run. The result screen says how many items came from where.
    if (!item) {
      const seenIds = new Set((activeSession.responses || []).map(r => r.question?.id).filter(Boolean));
      const candidates = pool({ skill: nextSlot.skill, difficulty })
        .filter(q => !seenIds.has(q.id));
      const relaxed = candidates.length ? candidates : pool({ skill: nextSlot.skill }).filter(q => !seenIds.has(q.id));
      item = relaxed.length ? { ...relaxed[Math.floor(Math.random() * relaxed.length)], generated: false } : null;
    }

    if (!item) {
      setGenError("Couldn't get a question for this slot. Try again in a moment.");
      setGenerating(false);
      return;
    }

    usedStems.current = [...usedStems.current, item.stimulus || item.q].slice(-20);
    // Shuffle even generated items: the model has its own positional habits,
    // and this is the same guarantee every other surface in the app gives.
    setQuestion(shuffleChoices(item, `${activeSession.id}:${activeSession.responses.length}`));
    questionStart.current = Date.now();
    setGenerating(false);
    announce(`Question ${activeSession.responses.length + 1} of ${BASELINE_LENGTH} ready.`);
  }, [profile]);

  // Kick off the first (or resumed) question once a session exists.
  useEffect(() => {
    if (session && !question && !generating && !result && currentSlot(session)) {
      fetchNext(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = async () => {
    const fresh = createBaselineSession({
      seed: Date.now(),
      targetScore: user?.onboardingTargetScore || null,
    });
    try {
      const id = await DB.createSatBaseline(fresh);
      setRowId(id);
    } catch (err) {
      console.error('could not persist baseline', err);
      toast.error('Could not start — try again.');
      return;
    }
    usedStems.current = [];
    setResult(null);
    setSession(fresh);
  };

  // ── Answer ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!question || !session) return;
    const isSpr = question.format === 'spr';
    if (isSpr ? !sprInput.trim() : selected == null) return;

    const correct = isSpr
      ? (question.sprAccept?.values || []).some(v => String(v).trim() === sprInput.trim())
      : selected === question.ans;

    const next = recordBaselineResponse(session, {
      question,
      choice: isSpr ? sprInput.trim() : selected,
      correct,
      seconds: Math.round((Date.now() - questionStart.current) / 1000),
    });

    setSession(next);
    setQuestion(null);
    // Persist per answer. Thirty-five generated questions and forty minutes of
    // someone's afternoon is not something to lose to a closed tab.
    if (rowId) DB.updateSatBaseline(rowId, { responses: next.responses, ability: next.ability }).catch(() => {});

    if (!currentSlot(next)) {
      await complete(next);
    } else {
      fetchNext(next);
    }
  };

  // ── Finish ────────────────────────────────────────────────────────────────
  const complete = async (finalSession) => {
    const finished = { ...finalSession, finishedAt: Date.now() };
    const scored = scoreBaseline(finished);
    const withMeta = { ...scored, takenAt: finished.finishedAt };
    setResult(withMeta);
    setSession(finished);

    try {
      if (rowId) await DB.finishSatBaseline(rowId, withMeta);
      // Every miss goes to the Review Log, triaged the same way a practice miss
      // is. A baseline that produced a number and no follow-up work would be a
      // report card, and a report card does not raise anyone's score.
      for (const miss of scored.flagged) {
        await DB.addSatReviewEntry({
          questionId: miss.question?.id || `baseline:${miss.index}`,
          skill: miss.skill,
          section: miss.section,
          chosen: miss.choice,
          correct: miss.question?.ans ?? null,
          source: 'baseline',
          question: miss.question,
        }).catch(() => {});
      }
      const rows = await DB.getSatBaselines({ limit: 8 });
      setHistory(rows);
      satData?.reload?.();
      onSessionComplete?.('sat_test');
    } catch (err) {
      console.error('could not save baseline result', err);
    }
    announce(`Baseline complete. Your estimated score is ${withMeta.low} to ${withMeta.high}.`);
  };

  const abandon = async () => {
    if (!window.confirm('End this baseline? Your answers so far are discarded — the estimate only means something from a full run.')) return;
    abortRef.current?.abort();
    if (rowId) await DB.abandonSatBaseline(rowId).catch(() => {});
    setSession(null); setQuestion(null); setRowId(null); setResult(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return <div style={glass({ padding: 40 })}><BrandLoader size={150} caption="Loading your baseline…" /></div>;
  }

  if (result) return <Results result={result} history={history} accent={accent} isMobile={isMobile} onNavigate={onNavigate} onDone={() => { setResult(null); setSession(null); setRowId(null); }} reviewIdx={reviewIdx} setReviewIdx={setReviewIdx} />;

  if (session && currentSlot(session)) {
    return (
      <Running
        session={session} question={question} generating={generating} genError={genError}
        selected={selected} setSelected={setSelected} sprInput={sprInput} setSprInput={setSprInput}
        onSubmit={submit} onRetry={() => fetchNext(session)} onAbandon={abandon}
        accent={accent} isMobile={isMobile}
      />
    );
  }

  return (
    <Intro
      history={history} gateOpen={gateOpen} waitLabel={waitLabel} accent={accent}
      isMobile={isMobile} onStart={start} user={user} onNavigate={onNavigate}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Intro
// ═════════════════════════════════════════════════════════════════════════════
function Intro({ history, gateOpen, waitLabel, accent, isMobile, onStart, user, onNavigate }) {
  const last = history[0]?.result || null;
  const prev = history[1]?.result || null;
  const delta = compareBaselines(last, prev);

  return (
    <div style={CC({ gap: 16 })}>
      <SatPageHeader
        accent={C.gold} m={isMobile}
        eyebrow="SAT · Adaptive placement"
        title="Your baseline"
        sub={`${BASELINE_LENGTH} questions, written for you one at a time. Get one right and the next gets harder; miss one and it eases off. That is how it finds your real level instead of guessing.`}
        meta={last ? [
          { label: 'Latest estimate', value: `${last.low}–${last.high}`, color: C.gold },
          { label: 'Confidence', value: last.confidence, color: last.confidence === 'good' ? C.green : last.confidence === 'moderate' ? C.amber : C.rose },
          { label: 'Taken', value: new Date(history[0].finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: C.t2 },
        ] : []}
      />

      {/* ── Previous result + movement ─────────────────────────────────── */}
      {last && (
        <SatCard title="Where you stand" icon={BarChart3} iconColor={accent} m={isMobile}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
            <StatTile icon={Target} value={`${last.low}–${last.high}`} label="Composite range" sub={`midpoint ${last.mid}`} color={accent} />
            <StatTile icon={Sparkles} value={last.sections?.rw?.scaled ?? '—'} label="Reading & writing" color={C.blue} />
            <StatTile icon={Zap} value={last.sections?.math?.scaled ?? '—'} label="Math" color={C.violet} />
          </div>
          {delta && (
            <div style={{ ...glass2({ padding: 12 }), marginTop: 12, ...R({ gap: 8 }) }}>
              {delta.direction === 'up' ? <TrendingUp size={15} color={C.greenL} />
                : delta.direction === 'down' ? <TrendingDown size={15} color={C.roseL} />
                : <Minus size={15} color={C.t3} />}
              <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
                {delta.significant
                  ? <><strong style={{ color: delta.direction === 'up' ? C.greenL : C.roseL }}>{delta.delta > 0 ? '+' : ''}{delta.delta} points</strong> against your previous baseline{delta.daysBetween ? ` ${delta.daysBetween} days ago` : ''}. That gap is bigger than the noise in the two estimates, so it is real movement.</>
                  : <>Within noise of your previous baseline{delta.daysBetween ? ` ${delta.daysBetween} days ago` : ''} ({delta.delta > 0 ? '+' : ''}{delta.delta}). Two estimates this close mean the same level, not a change — keep working the plan.</>}
              </span>
            </div>
          )}
        </SatCard>
      )}

      {/* ── How it works ───────────────────────────────────────────────── */}
      <SatCard title="How this one is different" icon={Brain} iconColor={C.violet} m={isMobile}>
        <div style={CC({ gap: 12 })}>
          {[
            { icon: Sparkles, hue: C.violet, title: 'Every question is written for you', body: 'Nothing is pulled off a shelf. Each item is authored against the exact skill and difficulty the last answer called for, using what the app already knows about you — and a second model re-solves it before you see it, so the answer key is checked, not assumed.' },
            { icon: TrendingUp, hue: C.green, title: 'It moves with you', body: 'Answer correctly and the next question steps up. Miss one and it steps down. Each section tracks separately, so being strong in maths never means you get handed harder reading than you can work with.' },
            { icon: Target, hue: accent, title: 'It ends with a range, not a number', body: 'Thirty-five questions can place you in a band; they cannot tell you that you are a 1290. You get the band, how confident it is, and exactly which skills cost you points.' },
            { icon: Lock, hue: C.amber, title: 'Once a week', body: `You can retake it every ${BASELINE_COOLDOWN_DAYS} days. Sooner than that and you would be measuring noise and reading it as progress, which is worse than not measuring — it stops you trusting the number when it finally does move.` },
          ].map(row => (
            <div key={row.title} style={{ ...R({ gap: 12, alignItems: 'flex-start' }) }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: tint(row.hue, 0.13), border: `1px solid ${tint(row.hue, 0.26)}`, display: 'grid', placeItems: 'center' }}>
                <row.icon size={13} color={row.hue} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{row.title}</div>
                <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>{row.body}</div>
              </div>
            </div>
          ))}
        </div>
      </SatCard>

      {/* ── Start / gate ───────────────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: isMobile ? 18 : 24, textAlign: 'center' }),
        border: `1px solid ${tint(gateOpen ? accent : C.t4, 0.3)}`,
        background: gateOpen ? satWash(accent, 0.07) : undefined,
      }}>
        {gateOpen ? (
          <>
            <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, fontFamily: C.FD, color: C.t1, marginBottom: 4, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
              {history.length ? 'Take a new baseline' : 'Set your baseline'}
            </div>
            <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, maxWidth: 560, margin: '0 auto 16px' }}>
              About 40 minutes, {BASELINE_LENGTH} questions, no going back. Sit somewhere you can concentrate —
              this is the number the rest of your plan gets built on, so a distracted run costs you more than it saves.
            </div>
            <button onClick={onStart} style={satBtn(accent, { padding: '12px 28px', fontSize: 14, borderRadius: 12 })}>
              <Gauge size={16} /> Start the baseline
            </button>
          </>
        ) : (
          <>
            <Lock size={22} color={C.t3} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 700, color: C.t2, fontFamily: C.FD, marginBottom: 4 }}>Next baseline in {waitLabel}</div>
            <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.55, maxWidth: 520, margin: '0 auto 14px' }}>
              One per week. Between now and then, the work that moves the number is in Practice and the Review Log —
              your baseline flagged exactly what to go after.
            </div>
            <div style={R({ gap: 8, justifyContent: 'center', flexWrap: 'wrap' })}>
              <button onClick={() => onNavigate?.('review')} style={btnG({ fontSize: 12 })}>Open the Review Log</button>
              <button onClick={() => onNavigate?.('practice')} style={btnG({ fontSize: 12 })}>Practice a weak skill</button>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.55, textAlign: 'center', padding: '0px 12px' }}>{SCORE_DISCLAIMER}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Running
// ═════════════════════════════════════════════════════════════════════════════
function Running({
  session, question, generating, genError, selected, setSelected, sprInput, setSprInput,
  onSubmit, onRetry, onAbandon, accent, isMobile,
}) {
  const answered = session.responses.length;
  const pct = (answered / BASELINE_LENGTH) * 100;
  const slot = currentSlot(session);
  const meta = slot ? skillMeta(slot.skill) : null;
  const band = nextDifficulty(session);
  const diffColors = DIFF_COLOR();
  const isSpr = question?.format === 'spr';
  const ready = isSpr ? sprInput.trim().length > 0 : selected != null;

  return (
    <div style={CC({ gap: 16 })}>
      {/* ── Progress ─────────────────────────────────────────────────── */}
      <div style={glass({ padding: isMobile ? 14 : 18 })}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 })}>
          <div style={R({ gap: 8 })}>
            <Gauge size={15} color={accent} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
              Question {Math.min(answered + 1, BASELINE_LENGTH)} of {BASELINE_LENGTH}
            </span>
            {meta && <span style={pill(tint(C.t3, 0.12), C.t2, { fontSize: 10 })}>{meta.sectionLabel}</span>}
          </div>
          <div style={R({ gap: 8 })}>
            {/* Showing the band is a deliberate call. It could be read as
                pressure — but hiding it makes the test feel arbitrary, and a
                student who just watched it step up after three right answers
                understands what the thing is doing and trusts the result. */}
            <span style={pill(tint(diffColors[band] || C.blue, 0.15), diffColors[band] || C.blue, { fontSize: 10, gap: 4 })}>
              {DIFF_LABEL[band]}
            </span>
          </div>
        </div>
        <Bar pct={pct} color={accent} h={5} />
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8 }}>
          No going back — each question's difficulty depends on the one before it. Answer as well as you can and move on.
        </div>
      </div>

      {/* ── The question ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {generating && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ ...glass({ padding: isMobile ? 28 : 44, textAlign: 'center' }) }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 12 }}>
              <Sparkles size={22} color={accent} />
            </motion.div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>
              Writing your next question
            </div>
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
              {meta ? `${meta.label} · ${DIFF_LABEL[band]?.toLowerCase()}` : ''} — and checking the answer key against a second model before it reaches you.
            </div>
          </motion.div>
        )}

        {!generating && genError && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...glass({ padding: 24, textAlign: 'center' }), border: `1px solid ${tint(C.rose, 0.3)}` }}>
            <AlertTriangle size={18} color={C.roseL} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 12, lineHeight: 1.6 }}>{genError}</div>
            <button onClick={onRetry} style={btn(C.blueGrad, { fontSize: 12 })}><RotateCcw size={13} /> Try again</button>
          </motion.div>
        )}

        {!generating && question && (
          <motion.div key={`q${answered}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={glass({ padding: isMobile ? 16 : 24 })}>
            {question.stimulus && (
              <div className="msp-prose" style={{ ...glass2({ padding: isMobile ? 14 : 18 }), marginBottom: 16, fontSize: isMobile ? 13.5 : 14.5, lineHeight: 1.8, color: C.t1 }}>
                <MathText text={question.stimulus} />
              </div>
            )}
            <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 600, color: C.t1, lineHeight: 1.7, marginBottom: 16, fontFamily: C.FB }}>
              <MathText text={question.q} />
            </div>

            {isSpr ? (
              <div>
                <label htmlFor="baseline-spr" style={lbl()}>Your answer</label>
                <input
                  id="baseline-spr" value={sprInput} onChange={e => setSprInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && ready) onSubmit(); }}
                  placeholder="Type your answer"
                  style={inp({ maxWidth: 260, fontSize: 16, fontFamily: C.FM })}
                />
              </div>
            ) : (
              <div role="radiogroup" aria-label="Answer choices" style={CC({ gap: 8 })}>
                {question.ch.map((choice, i) => {
                  const on = selected === i;
                  return (
                    <button
                      key={i} className="sat-choice sat-tap" role="radio" aria-checked={on}
                      onClick={() => setSelected(i)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                        padding: isMobile ? '13px 14px' : '14px 16px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${on ? accent : C.b1}`,
                        background: on ? tint(accent, 0.1) : C.surf2,
                        color: C.t1, fontSize: isMobile ? 13.5 : 14, lineHeight: 1.65, fontFamily: C.FB,
                      }}
                    >
                      <span style={{
                        width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                        border: `1.5px solid ${on ? accent : C.b2}`, background: on ? accentFill(accent) : 'transparent',
                        color: on ? C.onAccent : C.t3, fontSize: 12, fontWeight: 800, fontFamily: C.FM, marginTop: 4,
                      }}>{'ABCD'[i]}</span>
                      <span style={{ minWidth: 0 }}><MathText text={choice} /></span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="sat-action-bar" style={{ ...R({ justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }) }}>
              <button onClick={onAbandon} style={btnG({ fontSize: 11, padding: '8px 12px', color: C.t3 })}>End baseline</button>
              <button
                onClick={onSubmit} disabled={!ready}
                style={satBtn(accent, {
                  padding: '12px 24px', fontSize: 13.5, borderRadius: 12,
                  opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed',
                })}
              >
                {answered + 1 === BASELINE_LENGTH ? 'Finish' : 'Next'} <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Results
// ═════════════════════════════════════════════════════════════════════════════
function Results({ result, history, accent, isMobile, onNavigate, onDone, reviewIdx, setReviewIdx }) {
  const prev = history[1]?.result || null;
  const delta = compareBaselines(result, prev);
  const confColor = result.confidence === 'good' ? C.green : result.confidence === 'moderate' ? C.amber : C.rose;
  const generatedCount = result.flagged.filter(f => f.question?.generated).length;

  return (
    <div style={CC({ gap: 16 })}>
      {/* ── The number ─────────────────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: isMobile ? 22 : 32, textAlign: 'center' }),
        background: satWash(accent, 0.09),
        border: `1px solid ${tint(accent, 0.24)}`,
      }}>
        <div style={{ ...lbl({ marginBottom: 8 }), color: accent }}>Your baseline</div>
        <div style={{ fontSize: isMobile ? 40 : 56, fontWeight: 800, fontFamily: C.FD, color: C.t1, letterSpacing: 'calc(-0.04em + var(--msp-letter-spacing))', lineHeight: 1 }}>
          {result.low}<span style={{ color: C.t3, fontWeight: 500 }}>–</span>{result.high}
        </div>
        <div style={{ fontSize: 12.5, color: C.t3, marginTop: 8, lineHeight: 1.6, maxWidth: 520, margin: '10px auto 0' }}>
          A range, not a score. Thirty-five questions place you in a band — anyone who quotes you a single number
          off a practice test this length is overselling what it can tell them.
        </div>
        <div style={{ ...R({ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }), marginTop: 12 }}>
          <span style={pill(tint(confColor, 0.15), confColor, { gap: 4 })}><ShieldCheck size={11} />{result.confidence} confidence</span>
          <span style={pill(tint(C.t3, 0.12), C.t2)}>{result.correct}/{result.answered} correct</span>
          <span style={pill(tint(C.t3, 0.12), C.t2, { gap: 4 })}><Clock size={11} />{fmtDuration(result.durationMs)}</span>
          {result.percentile != null && <span style={pill(tint(C.blue, 0.14), C.blueL)}>~{result.percentile}th percentile</span>}
        </div>
        {delta && (
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 12, lineHeight: 1.6 }}>
            {delta.significant
              ? <><strong style={{ color: delta.direction === 'up' ? C.greenL : C.roseL }}>{delta.delta > 0 ? '+' : ''}{delta.delta}</strong> against your last baseline — real movement, beyond the noise in both estimates.</>
              : <>Effectively level with your last baseline ({delta.delta > 0 ? '+' : ''}{delta.delta}) — that gap is inside the margin, so treat it as the same result.</>}
          </div>
        )}
      </div>

      {/* ── Sections ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 12 }}>
        {Object.values(result.sections).map(sec => (
          <div key={sec.section} style={glass({ padding: 16 })}>
            <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{sec.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: C.FD, color: sec.section === 'rw' ? C.blueL : C.violetL, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>{sec.scaled}</span>
            </div>
            <Bar pct={((sec.scaled - 200) / 600) * 100} color={sec.section === 'rw' ? C.blue : C.violet} h={5} />
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, lineHeight: 1.6 }}>
              {sec.correct}/{sec.answered} correct.
              {sec.ceiling
                ? ` You were still reliable at ${DIFF_LABEL[sec.ceiling].toLowerCase()} questions — that's your working ceiling right now.`
                : ' Not enough answers at any one level to call a ceiling.'}
            </div>
          </div>
        ))}
      </div>

      {/* ── What to work on ────────────────────────────────────────────── */}
      {result.weakest.length > 0 && (
        <SatCard title="Where the points are" icon={Target} iconColor={C.rose} m={isMobile}>
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginBottom: 12 }}>
            Ranked by leverage — how far off you were, multiplied by how heavily the real exam tests it.
            Your single worst skill is often worth two questions on test day; starting there would waste a week.
          </div>
          <div style={CC({ gap: 8 })}>
            {result.weakest.map(s => (
              <div key={s.skill} style={{ ...glass2({ padding: 12 }), ...R({ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }) }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
                    {s.sectionLabel} · {s.correct}/{s.seen} correct{s.hardestCorrect ? ` · cleared up to ${DIFF_LABEL[s.hardestCorrect].toLowerCase()}` : ''}
                  </div>
                </div>
                <button onClick={() => onNavigate?.('practice', { skill: s.skill })} style={btnG({ fontSize: 11, padding: '4px 12px' })}>
                  Drill this <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </SatCard>
      )}

      {/* ── The misses ─────────────────────────────────────────────────── */}
      {/* Instruction, keyed to the same weakest-skills ranking shown above.
          A baseline that reports a range and a list of weak skills has told a
          student where they stand and nothing about how to move. */}
      <SatVideoRecommendations
        weakSkills={result.weakest.map(w => ({ skill: w.skill, accuracy: w.accuracy }))}
        title="Where to start this week"
        isMobile={isMobile}
        onNavigate={onNavigate}
      />

      {result.flagged.length > 0 && (
        <SatCard title="The {result.flagged.length} you missed" icon={XCircle} iconColor={C.amber} m={isMobile}>
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginBottom: 12 }}>
            All of these are already in your Review Log on a spaced schedule. Work through them there — a miss nobody
            diagnoses simply repeats.
          </div>
          <div style={CC({ gap: 8 })}>
            {result.flagged.map((miss, i) => {
              const open = reviewIdx === i;
              const m = skillMeta(miss.skill);
              return (
                <div key={i} style={glass2({ padding: 0, overflow: 'hidden' })}>
                  <button
                    onClick={() => setReviewIdx(open ? null : i)}
                    aria-expanded={open}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span style={{ fontSize: 11, fontFamily: C.FM, color: C.t4, flexShrink: 0 }}>Q{miss.index + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.t2, fontWeight: 600 }}>{m.label}</span>
                    <span style={pill(tint(DIFF_COLOR()[miss.difficulty] || C.blue, 0.14), DIFF_COLOR()[miss.difficulty] || C.blue, { fontSize: 9.5, padding: '4px 8px' })}>{DIFF_LABEL[miss.difficulty]}</span>
                    <ChevronRight size={13} color={C.t4} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
                  </button>
                  {open && miss.question && (
                    <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}` }}>
                      {miss.question.stimulus && (
                        <div className="msp-prose" style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.75, margin: '12px 0px' }}>
                          <MathText text={miss.question.stimulus} />
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: C.t1, fontWeight: 600, lineHeight: 1.65, marginBottom: 8 }}>
                        <MathText text={miss.question.q} />
                      </div>
                      {Array.isArray(miss.question.ch) && miss.question.ch.map((choice, ci) => {
                        const isAns = ci === miss.question.ans;
                        const isPick = ci === miss.choice;
                        return (
                          <div key={ci} style={{
                            padding: '8px 12px', borderRadius: 8, marginBottom: 4, fontSize: 12.5, lineHeight: 1.6,
                            background: isAns ? tint(C.green, 0.09) : isPick ? tint(C.rose, 0.09) : 'transparent',
                            border: `1px solid ${isAns ? tint(C.green, 0.3) : isPick ? tint(C.rose, 0.3) : C.b0}`,
                            color: C.t2,
                          }}>
                            <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                              {isAns ? <CheckCircle2 size={13} color={C.greenL} style={{ flexShrink: 0, marginTop: 4 }} />
                                : isPick ? <XCircle size={13} color={C.roseL} style={{ flexShrink: 0, marginTop: 4 }} />
                                : <span style={{ width: 13, flexShrink: 0 }} />}
                              <span><strong style={{ color: C.t3 }}>{'ABCD'[ci]}.</strong> <MathText text={choice} /></span>
                            </div>
                            {miss.question.distractorExp?.[ci] && (isAns || isPick) && (
                              <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, paddingLeft: 20, lineHeight: 1.6 }}>{miss.question.distractorExp[ci]}</div>
                            )}
                          </div>
                        );
                      })}
                      {miss.question.exp && (
                        <div style={{ ...glass2({ padding: 12 }), marginTop: 8, fontSize: 12, color: C.t2, lineHeight: 1.7 }}>
                          <MathText text={miss.question.exp} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SatCard>
      )}

      {/* ── Next ───────────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 16 }), ...R({ gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
        <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, flex: 1, minWidth: 220 }}>
          Your next baseline unlocks in {BASELINE_COOLDOWN_DAYS} days. Between now and then, this result is what the
          rest of the SAT tab plans against.
        </div>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <button onClick={() => onNavigate?.('review')} style={btnG({ fontSize: 12 })}>Review Log</button>
          <button onClick={() => onNavigate?.('practice')} style={btn(C.blueGrad, { fontSize: 12 })}>Start practicing <ArrowRight size={12} /></button>
          <button onClick={onDone} style={btnG({ fontSize: 12 })}>Done</button>
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.7, textAlign: 'center', padding: '0px 12px' }}>{SCORE_DISCLAIMER}</div>
    </div>
  );
}
