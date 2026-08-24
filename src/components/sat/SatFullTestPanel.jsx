import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Coffee, ChevronRight, Clock, AlertTriangle, TrendingUp, Calculator } from 'lucide-react';
import { C, glass, glass2, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SatPageHeader, SatCard, satBtn, satWash } from './satUi';
import SatQuestionPlayer from './SatQuestionPlayer';
import SatScoreReport from './SatScoreReport';
import { useSatSession } from './useSatSession';
import * as DB from '../../lib/db';
import { buildTestPlan, scoreFullTest } from '../../lib/sat/adaptive';
import { buildTestModule1, buildTestModule2 } from '../../lib/sat/forms';
import { testLabel } from '../../data/sat/forms';
import SatTestPicker from './SatTestPicker';
import { getQuestion } from '../../data/sat/questions';
import { SAT_SECTIONS, BREAK_MINUTES } from '../../data/sat/taxonomy';
import { SCORE_DISCLAIMER, MODULE_PATHS, compositePercentile } from '../../data/sat/scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Full-length adaptive practice test.
//
// The state machine walks buildTestPlan()'s stages:
//   rw/1 -> rw/2 -> break -> math/1 -> math/2 -> report
//
// Module 2 is assembled only AFTER module 1 is submitted, because which module
// you get depends on how you did — that is the whole point of the format.
//
// WHICH test gets assembled is chosen by the student from SatTestPicker: a
// named form (fixed questions, reproducible, comparable between sittings) or a
// fresh mix built to avoid everything they have already answered. The attempt
// row records `meta.testId` so the score history can say which test a number
// came from — a score with no test attached is barely a measurement.
//
// RESUMABILITY: the attempt row carries an absolute `deadline` timestamp, never
// a remaining-seconds countdown. A countdown persisted to storage would hand
// the student fresh time on every page reload. `testId` and `deliveredIds` ride
// along in the same meta so a resumed fresh mix rebuilds the same questions
// rather than silently becoming a different test halfway through.
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = buildTestPlan();

export default function SatFullTestPanel({
  accent = C.violet, satData, isMobile = false, onNavigate, onSessionComplete, onAskMedabrain,
}) {
  const { attempts, reload, seenIds } = satData;
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

  async function beginTest(testId) {
    const seed = Date.now();
    const first = STAGES[0]; // rw / module 1
    const built = buildTestModule1(testId, first.section, { seed, exclude: seenIds });
    if (!built.questions.length) { toast.error('Question bank is empty.'); return; }

    const stageKey = `${first.section}:1`;
    const questionsByStage = { [stageKey]: built.questions.map(q => q.id) };
    const deadline = Date.now() + SAT_SECTIONS[first.section].minutesPerModule * 60000;
    const attemptId = await DB.createSatAttempt({
      kind: 'full', status: 'in_progress',
      questionIds: built.questions.map(q => q.id),
      meta: { seed, testId, stageIdx: 0, deadline, responsesByStage: {}, questionsByStage },
    });
    setState({
      attemptId, testId, stageIdx: 0, questions: built.questions, deadline,
      responsesByStage: {}, questionsByStage, seed,
    });
    setReport(null);
  }

  async function resumeTest() {
    if (!resumable) return;
    const meta = resumable.meta || {};
    const stage = STAGES[meta.stageIdx ?? 0];
    if (!stage) { await DB.abandonSatAttempt(resumable.id); setResumable(null); reload(); return; }

    // Rebuild from the stored question IDS, not by re-running the builder.
    // Re-running it was fine while every test was a pure function of a stored
    // seed, but a fresh mix is also a function of what the student had already
    // seen — which the test itself changes as they answer it. Rebuilding one
    // mid-test therefore handed them a DIFFERENT paper on resume. Storing the
    // ids removes the whole class of problem: a resumed module is the module
    // they were sitting, whatever produced it.
    const responsesByStage = meta.responsesByStage || {};
    const questionsByStage = meta.questionsByStage || {};
    const stageKey = `${stage.section}:${stage.module}`;
    const questions = (questionsByStage[stageKey] || []).map(getQuestion).filter(Boolean);

    if (stage.type !== 'break' && !questions.length) {
      toast.error('That test could not be restored, so it has been discarded.');
      await DB.abandonSatAttempt(resumable.id);
      setResumable(null);
      reload();
      return;
    }

    setState({
      attemptId: resumable.id, testId: meta.testId || null,
      stageIdx: meta.stageIdx ?? 0, questions,
      deadline: meta.deadline, responsesByStage, questionsByStage, seed: meta.seed,
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
      await persist(state.attemptId, {
        meta: {
          seed: state.seed, testId: state.testId, stageIdx: nextIdx,
          deadline: breakDeadline, responsesByStage, questionsByStage: state.questionsByStage,
        },
      });
      setState({ ...state, stageIdx: nextIdx, questions: [], deadline: breakDeadline, responsesByStage });
      return;
    }

    await moveToStage(nextIdx, responsesByStage);
  }

  async function moveToStage(stageIdx, responsesByStage) {
    const stage = STAGES[stageIdx];
    // A fresh mix must avoid everything the student has ever seen AND everything
    // this test has already handed them; a named form ignores both, because its
    // questions were apportioned when the catalog was built.
    const delivered = new Set(Object.values(state.questionsByStage || {}).flat());
    const exclude = new Set([...(seenIds || []), ...delivered]);

    let built;
    if (stage.module === 1) {
      built = buildTestModule1(state.testId, stage.section, { seed: state.seed, exclude });
    } else {
      const m1 = responsesByStage[`${stage.section}:1`] || [];
      built = buildTestModule2(state.testId, stage.section, m1, { seed: state.seed, exclude });
      if (built.path) {
        toast(built.path === 'upper'
          ? 'You cleared the routing bar — this module is the harder one.'
          : 'Routed to the easier second module.',
        { icon: built.path === 'upper' ? '📈' : '📉' });
      }
    }
    const questionsByStage = {
      ...state.questionsByStage,
      [`${stage.section}:${stage.module}`]: built.questions.map(q => q.id),
    };
    const deadline = Date.now() + SAT_SECTIONS[stage.section].minutesPerModule * 60000;
    await persist(state.attemptId, {
      meta: { seed: state.seed, testId: state.testId, stageIdx, deadline, responsesByStage, questionsByStage },
    });
    setState({ ...state, stageIdx, questions: built.questions, deadline, responsesByStage, questionsByStage });
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
    onSessionComplete?.('sat_test', { questions: allResponses.length });
    reload();
  }

  async function leaveTest() {
    if (!window.confirm('Leave this test? Your progress is saved and you can resume it later.')) return;
    setState(null);
    reload();
  }

  /**
   * Record a score from a test sat elsewhere — Bluebook, or one of the printed
   * linear forms.
   *
   * Stored as a completed `full` attempt with no responses behind it, which is
   * exactly what it is: a real measurement with no per-question evidence. Every
   * consumer reads `result.composite` and `result.sections[x].scaled`, so it
   * charts, projects and reports like any other full test. The one thing it
   * cannot do is drive the skill heat map, and it should not — inventing
   * per-skill data from a section score would be a fabrication.
   */
  async function logOfficialScore(test, { rw, math, composite, label, takenAt }) {
    const sections = {
      rw: { section: 'rw', scaled: rw, path: null, rawCorrect: null, rawPossible: null, ceiling: null },
      math: { section: 'math', scaled: math, path: null, rawCorrect: null, rawPossible: null, ceiling: null },
    };
    const attemptId = await DB.createSatAttempt({
      kind: 'full',
      status: 'in_progress',
      startedAt: takenAt,
      questionIds: [],
      meta: {
        testId: test.id,
        official: { testId: test.id, org: test.org, label: label || test.label, delivery: test.delivery },
      },
    });
    await DB.finishSatAttempt(attemptId, {
      finishedAt: takenAt,
      result: { composite, percentile: compositePercentile(composite), sections, source: 'official' },
    });
    toast.success(`${test.label} logged — ${composite}.`);
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
          background: satWash(section.color, 0.08),
          border: `1px solid ${tint(section.color, 0.22)}`,
        }}>
          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
            <div style={R({ gap: 8 })}>
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
        sub="Two sections, four modules, with the real exam’s adaptive routing."
        meta={[
          { value: completed.length, label: completed.length === 1 ? 'test taken' : 'tests taken' },
          ...(best ? [{ value: best.result.composite, label: 'best score', color: C.green }] : []),
        ]}
        m={isMobile}
        tourTag="sat-deep-tests"
      />

      {resumable && (
        <div style={{ ...glass({ padding: 16 }), border: `1px solid ${tint(C.amber, 0.26)}`, background: satWash(C.amber, 0.08) }}>
          <div style={R({ gap: 8 })}>
            <AlertTriangle size={15} color={C.amberL} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>You have a test in progress</span>
          </div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 8, lineHeight: 1.55 }}>
            Started {new Date(resumable.startedAt).toLocaleString()}. Resuming picks up in the same module with the same questions — but note the module timer kept running, so it may already have expired.
          </div>
          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
            <button onClick={resumeTest} style={satBtn(C.amber)}>Resume test</button>
            <button onClick={discardResumable} style={btnG()}>Discard it</button>
          </div>
        </div>
      )}

      <SatTestPicker
        attempts={attempts}
        seenIds={seenIds}
        accent={accent}
        isMobile={isMobile}
        disabled={!!resumable}
        onStart={beginTest}
        onLogOfficial={logOfficialScore}
      />

      <SatCard title="What a full test looks like" icon={Clock} iconColor={accent} m={isMobile}>
        <div style={CC({ gap: 8 })}>
          {[
            ['Reading & Writing · Module 1', '27 questions · 32 minutes', 'Mixed difficulty. Your performance here decides your Module 2.'],
            ['Reading & Writing · Module 2', '27 questions · 32 minutes', 'Harder or easier, depending on how Module 1 went.'],
            [`Break`, `${BREAK_MINUTES} minutes`, 'Stand up. The timer runs, but you can continue early.'],
            ['Math · Module 1', '22 questions · 35 minutes', 'Same routing logic as Reading & Writing.'],
            ['Math · Module 2', '22 questions · 35 minutes', 'Routed from your Math Module 1.'],
          ].map(([t, meta, note], i) => (
            <div key={i} style={{ ...glass2({ padding: 12 }), display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: 4, background: tint(accent, 0.16), color: accent, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.FM, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{t}</div>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: C.FM, marginTop: 4 }}>{meta}</div>
                <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>{note}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...glass2({ padding: 12 }), marginTop: 16, borderColor: tint(C.teal, 0.22) }}>
          <div style={{ ...R({ gap: 4 }), marginBottom: 8 }}>
            <Calculator size={12} color={C.teal} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
              Your tools during the test
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
            The real Desmos calculator and the formula sheet stay one click away for the whole
            test — Alt+C and Alt+R, or the tabs on the left edge. Use them exactly as much as you
            would on test day, which for Math is as much as you like.
          </div>
        </div>

        <div style={{ ...glass2({ padding: 12 }), marginTop: 12, borderColor: tint(C.blue, 0.22) }}>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
            <b style={{ color: C.t1 }}>Question order matches the real thing.</b> Reading &amp; Writing
            runs Craft and Structure, then Information and Ideas, then Standard English Conventions,
            then Expression of Ideas — grouped by question type and running easiest to hardest inside
            each group, exactly as Bluebook presents it. Maths trends easy to hard with grid-ins
            scattered through, about a quarter of the module. A practice test that shuffles its
            questions teaches you to read the module wrong.
          </div>
        </div>

        <div style={{ ...glass2({ padding: 12 }), marginTop: 12, borderColor: tint(C.blue, 0.22) }}>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
            <b style={{ color: C.t1 }}>Where we still differ:</b> the score conversion is our own
            estimate rather than College Board&rsquo;s table, and highlighting has three colors
            rather than Bluebook&rsquo;s annotate-with-notes. Everything else — module timing and
            the five-minute warning, the hideable timer, flag-for-review, answer cross-out, the
            end-of-module review screen, passage highlighting, Desmos, the reference sheet, adaptive
            routing and the score ceiling on the easier Module 2 — matches the real format.
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.t3, marginTop: 16, lineHeight: 1.55 }}>
          Whichever test you pick above, this is the shape of it: about 2h 15m end to end.
        </div>
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, lineHeight: 1.55 }}>{SCORE_DISCLAIMER}</div>
      </SatCard>

      {completed.length > 0 && (
        <SatCard title="Your tests" icon={TrendingUp} iconColor={C.green} m={isMobile}>
          <div style={CC({ gap: 8 })}>
            {completed.map(a => (
              <div key={a.id} style={{ ...glass2({ padding: 12 }), ...R({ gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FM }}>{a.result?.composite ?? '—'}</div>
                  <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 4 }}>
                    <span style={{ fontSize: 10.5, color: C.t3 }}>
                      {new Date(a.finishedAt || a.startedAt).toLocaleDateString()}
                    </span>
                    {/* Which test produced this number. Attempts recorded before
                        the catalog existed have no testId and say so, rather
                        than being labeled as a form they were never sat on. */}
                    <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
                      · {a.meta?.official?.label || testLabel(a.meta?.testId)}
                    </span>
                    {a.result?.source === 'official' && (
                      <span style={pill(tint(C.gold, 0.14), C.gold, { fontSize: 9.5 })}>Official</span>
                    )}
                  </div>
                </div>
                <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                  {a.result?.sections && Object.entries(a.result.sections).map(([sec, s]) => (
                    <span key={sec} style={pill(tint(SAT_SECTIONS[sec].color, 0.14), SAT_SECTIONS[sec].color, { fontSize: 10.5 })}>
                      {SAT_SECTIONS[sec].short} {s.scaled}
                      {MODULE_PATHS[s.path] && (
                        <span style={{ opacity: 0.7, marginLeft: 4 }}>({MODULE_PATHS[s.path].label.split(' ')[0].toLowerCase()})</span>
                      )}
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
      <h3 style={{ fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: 0 }}>Break</h3>
      <div style={{ fontSize: 13, color: C.t2, marginTop: 8, lineHeight: 1.55, maxWidth: 420, margin: '8px auto 0' }}>
        Stand up, drink some water, look at something further than arm's length away. Math starts when the timer ends, or whenever you are ready.
      </div>
      <div style={{
        fontSize: 40, fontWeight: 800, fontFamily: C.FM, color: accent, marginTop: 20, lineHeight: 1,
      }}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </div>
      <button onClick={onContinue} style={satBtn(accent, { marginTop: 24 })}>
        Continue to Math <ChevronRight size={14} />
      </button>
    </div>
  );
}
