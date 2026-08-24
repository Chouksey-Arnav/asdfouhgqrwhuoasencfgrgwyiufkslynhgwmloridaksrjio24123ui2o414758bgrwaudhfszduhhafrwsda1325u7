import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Compass, ChevronRight, Clock, Target, TrendingUp, RotateCcw, Sparkles } from 'lucide-react';
import { C, glass, glass2, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import { StatTile } from '../ui/PanelHero';
import { SatPageHeader, SatCard, satBtn, satWash } from './satUi';
import { Bar } from '../ui/primitives';
import SatQuestionPlayer from './SatQuestionPlayer';
import SatStudyPlanCard from './SatStudyPlanCard';
import { useSatSession } from './useSatSession';
import { buildDiagnostic, estimateMinutes } from '../../lib/sat/selector';
import { computeAllMastery, rankSkillsByLeverage } from '../../lib/sat/mastery';
import { buildLearnerProfile } from '../../lib/sat/learnerProfile';
import { generateSatStudyPlan } from '../../lib/sat/aiStudyPlan';
import { SAT_SECTIONS, skillMeta } from '../../data/sat/taxonomy';
import { SCORE_DISCLAIMER } from '../../data/sat/scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic — a wide, shallow placement test.
//
// Deliberately spread across all 28 skills rather than going deep on any one:
// the job here is coverage, so the prescription that follows is aimed at the
// right things. Precision comes later, from full-length tests.
//
// Note this is unrelated to src/lib/diagnosticEngine.js, which is a
// pathway-INTEREST survey with no right answers. Same word, different job.
// ─────────────────────────────────────────────────────────────────────────────

export default function SatDiagnosticPanel({
  accent = C.cyan, satData, profile = null, user = null, daysToExam = null,
  isMobile = false, onNavigate, onSessionComplete, onAskMedabrain,
}) {
  const { attempts, reload } = satData;
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const { start, recordResponse, finish, abandon, attemptId } = useSatSession();

  // ── The AI prescription ──
  // Requested explicitly rather than fired automatically the instant the last
  // question is answered: this is the deepest (and slowest) model in the app,
  // and a student who just finished 30 questions deserves to see their result
  // immediately rather than watching a spinner. The deterministic ranked
  // prescription below renders instantly and is complete on its own; the plan
  // is an enhancement on top of it.
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const planAbort = useRef(null);

  useEffect(() => () => planAbort.current?.abort(), []);

  const buildPlan = useCallback(async ({ fresh = false } = {}) => {
    planAbort.current?.abort();
    const controller = new AbortController();
    planAbort.current = controller;
    setPlanLoading(true);
    setPlanError(null);
    // SatTab's profile is built from the same snapshot every panel renders, but
    // it can lag by one render right after handleComplete() calls reload(). So
    // rebuild it here from the live satData rather than planning against the
    // state as it was *before* the diagnostic that just finished.
    const freshProfile = buildLearnerProfile({ satData, user, daysToExam }) || profile;
    const { plan: built, reason } = await generateSatStudyPlan(freshProfile, { fresh, signal: controller.signal });
    if (controller.signal.aborted) return;
    setPlan(built);
    setPlanError(built ? null : reason);
    setPlanLoading(false);
  }, [satData, user, daysToExam, profile]);

  const previous = useMemo(
    () => attempts.filter(a => a.kind === 'diagnostic' && a.status === 'complete'),
    [attempts],
  );
  const preview = useMemo(() => buildDiagnostic({ count: 30, seed: 1 }), []);

  async function begin() {
    const questions = buildDiagnostic({ count: 30, seed: Date.now() });
    const id = await start({ kind: 'diagnostic', questions, meta: {} });
    setSession({ questions, attemptId: id });
    setResult(null);
  }

  async function handleComplete(responses) {
    const masteryMap = computeAllMastery(responses);
    const ranked = rankSkillsByLeverage(masteryMap).filter(r => r.attempts > 0);
    const bySection = {};
    for (const sec of Object.keys(SAT_SECTIONS)) {
      const rows = responses.filter(r => r.section === sec);
      bySection[sec] = rows.length
        ? { total: rows.length, correct: rows.filter(r => r.correct).length }
        : null;
    }
    await finish(session.attemptId, responses, { kind: 'diagnostic' });
    setResult({ responses, ranked, bySection });
    setSession(null);
    onSessionComplete?.('sat_practice', { questions: responses.length });
    reload();
  }

  async function handleLeave() {
    if (attemptId) await abandon(attemptId);
    setSession(null);
    reload();
  }

  // ── Running ──
  if (session) {
    return (
      <SatQuestionPlayer
        profile={profile}
        questions={session.questions} mode="tutor"
        seedKey={`attempt-${session.attemptId}`} accent={accent} isMobile={isMobile}
        onAnswer={(r) => recordResponse(session.attemptId, r)}
        onComplete={handleComplete} onExit={handleLeave}
        onAskMedabrain={onAskMedabrain}
      />
    );
  }

  // ── Result / prescription ──
  if (result) {
    const total = result.responses.length;
    const correct = result.responses.filter(r => r.correct).length;
    const weakest = result.ranked.slice(0, 5);
    const strongest = [...result.ranked].reverse().filter(r => r.mastery >= 0.6).slice(0, 3);
    return (
      <div style={CC({ gap: 20 })}>
        <SatPageHeader
          accent={C.green}
          eyebrow="Diagnostic complete" title={`${correct} of ${total} correct`}
          sub="A starting map, not a score. Take a full test for a real estimate."
          m={isMobile}
        />

        <div style={G(2, 12, {}, isMobile)}>
          {Object.entries(result.bySection).map(([sec, data]) => data && (
            <StatTile
              key={sec} icon={TrendingUp} color={SAT_SECTIONS[sec].color}
              value={`${Math.round((data.correct / data.total) * 100)}%`}
              label={SAT_SECTIONS[sec].label}
              sub={`${data.correct} of ${data.total} correct`}
            />
          ))}
        </div>

        {/* ── The AI plan ──
            Offered above the ranked list because a plan is what a student came
            here for; the ranked list underneath is the evidence it was built
            from, and stands on its own if the AI is unavailable. */}
        {(plan || planLoading || planError) ? (
          <SatStudyPlanCard
            plan={plan} loading={planLoading} error={planError}
            accent={C.sky} isMobile={isMobile}
            onNavigate={onNavigate}
            onRegenerate={() => buildPlan({ fresh: true })}
            generatedFromLabel={`from this diagnostic · ${total} questions`}
          />
        ) : (
          <div style={{
            ...glass({ padding: isMobile ? 18 : 22 }),
            border: `1px solid ${tint(C.sky, 0.28)}`,
            background: satWash(C.sky, 0.07),
          }}>
            <div style={{ ...R({ gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }) }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
                  Turn this into a plan
                </div>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginTop: 4, maxWidth: 620 }}>
                  Medabrain will read everything below — your skill-by-skill result, how heavily the exam
                  tests each of them, your pacing and your target — and write you a specific few weeks of
                  work. It runs on the deepest model available, so give it a moment.
                </div>
              </div>
              <button onClick={() => buildPlan()} style={satBtn(C.sky, { flexShrink: 0 })}>
                <Sparkles size={14} /> Build my plan
              </button>
            </div>
          </div>
        )}

        <SatCard title="Your prescription" icon={Target} iconColor={C.rose} m={isMobile}>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginBottom: 16 }}>
            Ranked by leverage — how weak you were, multiplied by how heavily the real exam tests it.
            Each of these was measured from only a question or two, so treat the order as a starting hypothesis.
          </div>
          <div style={CC({ gap: 12 })}>
            {weakest.map((s, i) => (
              <div key={s.skill} style={glass2({ padding: 12 })}>
                <div style={{ ...R({ gap: 8 }), justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={R({ gap: 8 })}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: tint(s.color, 0.18), color: s.color, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.FM }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.label}</span>
                  </div>
                  <span style={pill(tint(s.color, 0.14), s.color, { fontSize: 10 })}>{s.sectionLabel}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 8 }}>{s.blurb}</div>
                <div style={R({ gap: 8 })}>
                  <div style={{ flex: 1 }}><Bar pct={s.mastery * 100} color={s.color} h={4} /></div>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, whiteSpace: 'nowrap' }}>
                    {s.correct}/{s.attempts} · ~{(s.examShare * 98).toFixed(1)} per exam
                  </span>
                </div>
                <button
                  onClick={() => onNavigate?.('practice', { skill: s.skill })}
                  style={{ ...btnG({ padding: '4px 12px', fontSize: 11.5 }), marginTop: 8 }}
                >
                  Drill this <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>

          {strongest.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
                Already solid
              </div>
              <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
                {strongest.map(s => s.label).join(' · ')} — spend less time here.
              </div>
            </div>
          )}

          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 20 }}>
            <button onClick={() => onNavigate?.('practice')} style={satBtn(accent)}>
              Start practicing <ChevronRight size={14} />
            </button>
            <button onClick={() => onNavigate?.('overview')} style={btnG()}>See your overview</button>
          </div>
        </SatCard>
      </div>
    );
  }

  // ── Intro ──
  const last = previous[0];
  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={accent}
        eyebrow="SAT · diagnostic" title="Find out where you actually stand"
        sub="~30 questions across all 28 skills — a map of where you’re losing points."
        meta={[
          { value: preview.length, label: 'questions' },
          { value: `~${estimateMinutes(preview)}`, label: 'minutes' },
        ]}
        m={isMobile}
        tourTag="sat-deep-diagnostic"
      />

      {last && (
        <div style={{ ...glass2({ padding: 16 }), borderColor: tint(C.green, 0.25) }}>
          <div style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>
            You last took this on {new Date(last.finishedAt || last.startedAt).toLocaleDateString()}
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4 }}>
            Scored {last.result?.correct ?? 0} of {last.result?.total ?? 0}. Retaking it resets your starting map — usually worth it after a month of real practice.
          </div>
        </div>
      )}

      <SatCard title="What to expect" icon={Clock} iconColor={accent} m={isMobile}>
        <div style={CC({ gap: 12 })}>
          {[
            ['Untimed, with explanations', 'You see why each answer is right immediately. This is a measurement, not a race.'],
            ['Deliberately broad', 'One or two questions per skill. Wide coverage beats depth when the goal is to find your gaps.'],
            ['Mixed difficulty', 'Easy, medium and hard items, so the result discriminates across the whole range.'],
            ['You can stop and resume', 'Progress is saved as you answer.'],
          ].map(([t, b]) => (
            <div key={t} style={R({ gap: 12, alignItems: 'flex-start' })}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, marginTop: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{t}</div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{b}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={begin} style={satBtn(accent, { marginTop: 20 })}>
          {last ? <><RotateCcw size={14} /> Retake diagnostic</> : <>Start the diagnostic <ChevronRight size={14} /></>}
        </button>
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 12, lineHeight: 1.55 }}>{SCORE_DISCLAIMER}</div>
      </SatCard>
    </div>
  );
}
