import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Coffee, ChevronRight, Play, Clock, AlertTriangle, TrendingUp, Calculator } from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SatPageHeader, SatCard } from './satUi';
import SatQuestionPlayer from './SatQuestionPlayer';
import SatScoreReport from './SatScoreReport';
import { useSatSession } from './useSatSession';
import * as DB from '../../lib/db';
import { buildTestPlan, buildModule1, buildModule2, scoreFullTest } from '../../lib/sat/adaptive';
import { SAT_SECTIONS, BREAK_MINUTES } from '../../data/sat/taxonomy';
import { SCORE_DISCLAIMER, MODULE_PATHS } from '../../data/sat/scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Full-length adaptive practice test.
//
// The state machine walks buildTestPlan()'s stages:
//   rw/1 -> rw/2 -> break -> math/1 -> math/2 -> report
//
// Module 2 is assembled only AFTER module 1 is submitted, because which module
// you get depends on how you did — that is the whole point of the format.
//
// RESUMABILITY: the attempt row carries an absolute `deadline` timestamp, never
// a remaining-seconds countdown. A countdown persisted to storage would hand
// the student fresh time on every page reload.
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = buildTestPlan();

export default function SatFullTestPanel({
  accent = C.violet, satData, isMobile = false, onNavigate, onSessionComplete, onAskMedabrain,
}) {
  const { attempts, reload } = satData;
  const [state, setState] = useState(null); // {attemptId, stageIdx, questions, deadline, responses}
  const [report, setReport] = useState(null);
  const [resumable, setResumable] = useState(null);
  const { recordResponse, finish } = useSatSession();

  const completed = useMemo(
    () => attempts.filter(a => a.kind === 'full' && a.status === 'complete'),
    [attempts],
  );

  // Offer to resume an interrupted test rather than silently losing it.
  useEffect(() => {
    const inProgress = attempts.find(a => a.kind === 'full' && a.status === 'in_progress');
    setResumable(inProgress || null);
  }, [attempts]);

  const persist = useCallback(async (attemptId, patch) => {
    await DB.updateSatAttempt(attemptId, patch);
  }, []);

  async function beginTest() {
    const seed = Date.now();
    const first = STAGES[0]; // rw / module 1
    const built = buildModule1(first.section, { seed });
    if (!built.questions.length) { toast.error('Question bank is empty.'); return; }

    const deadline = Date.now() + SAT_SECTIONS[first.section].minutesPerModule * 60000;
    const attemptId = await DB.createSatAttempt({
      kind: 'full', status: 'in_progress',
      questionIds: built.questions.map(q => q.id),
      meta: { seed, stageIdx: 0, deadline, responsesByStage: {} },
    });
    setState({
      attemptId, stageIdx: 0, questions: built.questions, deadline,
      responsesByStage: {}, seed,
    });
    setReport(null);
  }

  async function resumeTest() {
    if (!resumable) return;
    const meta = resumable.meta || {};
    const stage = STAGES[meta.stageIdx ?? 0];
    if (!stage) { await DB.abandonSatAttempt(resumable.id); setResumable(null); reload(); return; }

    // Rebuild the module deterministically from the stored seed, so the same
    // questions come back in the same order.
    const responsesByStage = meta.responsesByStage || {};
    let questions;
    if (stage.module === 1) {
      questions = buildModule1(stage.section, { seed: meta.seed }).questions;
    } else {
      const m1 = responsesByStage[`${stage.section}:1`] || [];
      questions = buildModule2(stage.section, m1, { seed: meta.seed }).questions;
    }
    setState({
      attemptId: resumable.id, stageIdx: meta.stageIdx ?? 0, questions,
      deadline: meta.deadline, responsesByStage, seed: meta.seed,
    });
    setResumable(null);
  }

  async function discardResumable() {
    if (!resumable) return;
    await DB.abandonSatAttempt(resumable.id);
    setResumable(null);
    reload();
  }

  /** Advance the state machine after a module is submitted. */
  async function completeStage(responses) {
    const stage = STAGES[state.stageIdx];
    const key = `${stage.section}:${stage.module}`;
    const responsesByStage = { ...state.responsesByStage, [key]: responses };

    let nextIdx = state.stageIdx + 1;
    const nextStage = STAGES[nextIdx];

    // ── Test finished ──
    if (!nextStage) {
      await finalise(responsesByStage);
      return;
    }

    // ── Break screen ──
    if (nextStage.type === 'break') {
      const breakDeadline = Date.now() + BREAK_MINUTES * 60000;
      await persist(state.attemptId, { meta: { ...(state.meta || {}), seed: state.seed, stageIdx: nextIdx, deadline: breakDeadline, responsesByStage } });
      setState({ ...state, stageIdx: nextIdx, questions: [], deadline: breakDeadline, responsesByStage });
      return;
    }

    await moveToStage(nextIdx, responsesByStage);
  }

  async function moveToStage(stageIdx, responsesByStage) {
    const stage = STAGES[stageIdx];
    let built;
    if (stage.module === 1) {
      built = buildModule1(stage.section, { seed: state.seed });
    } else {
      const m1 = responsesByStage[`${stage.section}:1`] || [];
      built = buildModule2(stage.section, m1, { seed: state.seed });
      if (built.path) {
        toast(built.path === 'upper'
          ? 'You cleared the routing bar — this module is the harder one.'
          : 'Routed to the easier second module.',
        { icon: built.path === 'upper' ? '📈' : '📉' });
      }
    }
    const deadline = Date.now() + SAT_SECTIONS[stage.section].minutesPerModule * 60000;
    await persist(state.attemptId, { meta: { seed: state.seed, stageIdx, deadline, responsesByStage } });
    setState({ ...state, stageIdx, questions: built.questions, deadline, responsesByStage });
  }

  async function finalise(responsesByStage) {
    const bySection = {};
    for (const sec of Object.keys(SAT_SECTIONS)) {
      bySection[sec] = {
        module1: responsesByStage[`${sec}:1`] || [],
        module2: responsesByStage[`${sec}:2`] || [],
      };
    }
    const scored = scoreFullTest(bySection);
    const allResponses = Object.values(responsesByStage).flat();
    await finish(state.attemptId, allResponses, {
      composite: scored.composite,
      percentile: scored.percentile,
      sections: scored.sections,
    });
    setReport({ scored, responsesByStage, allResponses });
    setState(null);
    onSessionComplete?.('sat_test');
    reload();
  }

  async function leaveTest() {
    if (!window.confirm('Leave this test? Your progress is saved and you can resume it later.')) return;
    setState(null);
    reload();
  }

  // ── Score report ──
  if (report) {
    return (
      <SatScoreReport
        scored={report.scored} responses={report.allResponses}
        accent={accent} isMobile={isMobile}
        onNavigate={onNavigate} onDone={() => setReport(null)}
      />
    );
  }

  // ── Active test ──
  if (state) {
    const stage = STAGES[state.stageIdx];

    if (stage.type === 'break') {
      return <BreakScreen
        deadline={state.deadline} accent={accent} isMobile={isMobile}
        onContinue={() => moveToStage(state.stageIdx + 1, state.responsesByStage)}
      />;
    }

    const section = SAT_SECTIONS[stage.section];
    return (
      <div style={CC({ gap: 16 })}>
        <div style={{
          ...glass2({ padding: '12px 16px' }),
          background: `linear-gradient(120deg,${tint(section.color, 0.14)},rgba(255,255,255,0.02))`,
          border: `1px solid ${tint(section.color, 0.28)}`,
        }}>
          <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
            <div style={R({ gap: 9 })}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.t1 }}>{section.label}</span>
              <span style={pill(tint(section.color, 0.16), section.color, { fontSize: 10.5 })}>
                Module {stage.module} of 2
              </span>
            </div>
            <span style={{ fontSize: 11, color: C.t3 }}>
              Section {Object.keys(SAT_SECTIONS).indexOf(stage.section) + 1} of 2
            </span>
          </div>
        </div>

        <SatQuestionPlayer
          key={`${stage.section}-${stage.module}`}
          questions={state.questions} mode="exam"
          seedKey={`attempt-${state.attemptId}-${stage.section}-${stage.module}`}
          deadline={state.deadline} accent={section.color} isMobile={isMobile}
          onAnswer={(r) => recordResponse(state.attemptId, r)}
          onComplete={completeStage}
          onExit={leaveTest}
          onAskMedabrain={onAskMedabrain}
        />
      </div>
    );
  }

  // ── Intro ──
  const best = completed.reduce((b, a) => (!b || (a.result?.composite || 0) > (b.result?.composite || 0) ? a : b), null);
  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={accent}
        eyebrow="SAT · Full-length test" title="Adaptive practice test"
        sub="Two sections, four modules, with real routing: how you do on Module 1 decides whether you get the harder or easier Module 2 — and the easier one caps that section near 600, exactly like the real exam."
        meta={[
          { value: completed.length, label: completed.length === 1 ? 'test taken' : 'tests taken' },
          ...(best ? [{ value: best.result.composite, label: 'best score', color: C.green }] : []),
        ]}
        m={isMobile}
        tourTag="sat-deep-tests"
      />

      {resumable && (
        <div style={{ ...glass({ padding: 18 }), border: `1px solid ${tint(C.amber, 0.35)}`, background: `linear-gradient(120deg,${tint(C.amber, 0.12)},rgba(255,255,255,0.02))` }}>
          <div style={R({ gap: 9 })}>
            <AlertTriangle size={15} color={C.amberL} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>You have a test in progress</span>
          </div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 7, lineHeight: 1.6 }}>
            Started {new Date(resumable.startedAt).toLocaleString()}. Resuming picks up in the same module with the same questions — but note the module timer kept running, so it may already have expired.
          </div>
          <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginTop: 14 }}>
            <button onClick={resumeTest} style={btn(`linear-gradient(135deg,${C.amber},${C.orange})`)}>Resume test</button>
            <button onClick={discardResumable} style={btnG()}>Discard it</button>
          </div>
        </div>
      )}

      <SatCard title="Structure" icon={Clock} iconColor={accent} m={isMobile}>
        <div style={CC({ gap: 10 })}>
          {[
            ['Reading & Writing · Module 1', '27 questions · 32 minutes', 'Mixed difficulty. Your performance here decides your Module 2.'],
            ['Reading & Writing · Module 2', '27 questions · 32 minutes', 'Harder or easier, depending on how Module 1 went.'],
            [`Break`, `${BREAK_MINUTES} minutes`, 'Stand up. The timer runs, but you can continue early.'],
            ['Math · Module 1', '22 questions · 35 minutes', 'Same routing logic as Reading & Writing.'],
            ['Math · Module 2', '22 questions · 35 minutes', 'Routed from your Math Module 1.'],
          ].map(([t, meta, note], i) => (
            <div key={i} style={{ ...glass2({ padding: 13 }), display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: tint(accent, 0.16), color: accent, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.FM, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{t}</div>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, marginTop: 2 }}>{meta}</div>
                <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>{note}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...glass2({ padding: 14 }), marginTop: 16, borderColor: tint(C.teal, 0.22) }}>
          <div style={{ ...R({ gap: 6 }), marginBottom: 7 }}>
            <Calculator size={12} color={C.teal} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Your tools during the test
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.7 }}>
            The real Desmos calculator and the formula sheet stay one click away for the whole
            test — Alt+C and Alt+R, or the tabs on the left edge. Use them exactly as much as you
            would on test day, which for Math is as much as you like.
          </div>
        </div>

        <div style={{ ...glass2({ padding: 14 }), marginTop: 12, borderColor: tint(C.blue, 0.22) }}>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.7 }}>
            <b style={{ color: C.t1 }}>What we do not simulate:</b> passage annotation and highlighting.
            Everything else — module timing, the hideable timer, flagging, cross-out, the review
            screen, the calculator, the reference sheet, adaptive routing and the score ceiling —
            matches the real format.
          </div>
        </div>

        <button onClick={beginTest} disabled={!!resumable} style={btn(`linear-gradient(135deg,${accent},${C.indigo})`, { marginTop: 18, opacity: resumable ? 0.45 : 1, cursor: resumable ? 'not-allowed' : 'pointer' })}>
          <Play size={14} /> Start full test · about 2h 15m
        </button>
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 12, lineHeight: 1.6 }}>{SCORE_DISCLAIMER}</div>
      </SatCard>

      {completed.length > 0 && (
        <SatCard title="Your tests" icon={TrendingUp} iconColor={C.green} m={isMobile}>
          <div style={CC({ gap: 9 })}>
            {completed.map(a => (
              <div key={a.id} style={{ ...glass2({ padding: 13 }), ...R({ gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FM }}>{a.result?.composite ?? '—'}</div>
                  <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2 }}>
                    {new Date(a.finishedAt || a.startedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                  {a.result?.sections && Object.entries(a.result.sections).map(([sec, s]) => (
                    <span key={sec} style={pill(tint(SAT_SECTIONS[sec].color, 0.14), SAT_SECTIONS[sec].color, { fontSize: 10.5 })}>
                      {SAT_SECTIONS[sec].short} {s.scaled}
                      <span style={{ opacity: 0.7, marginLeft: 4 }}>({MODULE_PATHS[s.path]?.label.split(' ')[0].toLowerCase()})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SatCard>
      )}
    </div>
  );
}

// ── Break screen ────────────────────────────────────────────────────────────
function BreakScreen({ deadline, accent, isMobile, onContinue }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  useEffect(() => { if (left === 0) onContinue(); }, [left, onContinue]);

  return (
    <div style={{ ...glass({ padding: isMobile ? 24 : 40, textAlign: 'center' }) }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: tint(accent, 0.16), border: `1px solid ${tint(accent, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Coffee size={24} color={accent} />
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: 0 }}>Break</h3>
      <div style={{ fontSize: 13, color: C.t2, marginTop: 8, lineHeight: 1.7, maxWidth: 420, margin: '8px auto 0' }}>
        Stand up, drink some water, look at something further than arm's length away. Math starts when the timer ends, or whenever you are ready.
      </div>
      <div style={{
        fontSize: 40, fontWeight: 800, fontFamily: C.FM, color: accent, marginTop: 22, lineHeight: 1,
      }}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </div>
      <button onClick={onContinue} style={{ ...btn(`linear-gradient(135deg,${accent},${C.indigo})`), marginTop: 24 }}>
        Continue to Math <ChevronRight size={14} />
      </button>
    </div>
  );
}
