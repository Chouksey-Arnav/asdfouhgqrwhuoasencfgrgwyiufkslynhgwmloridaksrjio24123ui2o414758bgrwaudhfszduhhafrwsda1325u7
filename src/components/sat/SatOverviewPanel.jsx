import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight, CalendarClock, AlertTriangle, TrendingUp, Info, Layers, Calculator, BookOpen, Brain, Sparkles, Gauge } from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import { Bar } from '../ui/primitives';
import SatSkillHeatmap from './SatSkillHeatmap';
import SatStudyPlanCard from './SatStudyPlanCard';
import { loadSatStudyPlan, generateSatStudyPlan } from '../../lib/sat/aiStudyPlan';
import { nextAction, secondaryActions } from '../../lib/sat/nextAction';
import * as DB from '../../lib/db';
import { canStartBaseline, cooldownLabel, compareBaselines, BASELINE_LENGTH } from '../../lib/sat/baseline';
import { projectionEmptyState, targetProgress } from '../../lib/sat/projection';
import { SCORE_DISCLAIMER } from '../../data/sat/scoring';
import { SAT_SECTIONS } from '../../data/sat/taxonomy';
import { useSatTools } from './SatToolsContext';

// ─────────────────────────────────────────────────────────────────────────────
// Overview — the honest dashboard.
//
// This screen replaces the app's old "Predicted SAT Score", which was computed
// from MCAT-style biology quiz averages via `400 + (pct/100)*1200` and rendered
// as a single confident number. Everything here follows three rules:
//   1. No number appears without its evidence base and confidence.
//   2. A projection is a RANGE, and shows nothing at all until measured.
//   3. One primary action, chosen for the student, not a wall of options.
// ─────────────────────────────────────────────────────────────────────────────

export default function SatOverviewPanel({
  accent = C.lime, satData, profile = null, user, isMobile = false, onNavigate, onAskMedabrain,
}) {
  const { attempts, responses, reviewLog, masteryMap, projection, ranked, summary } = satData;
  const tools = useSatTools();

  // ── The study plan, if one has been built ──
  // Loaded rather than generated: the Diagnostic writes it, the Overview keeps
  // showing it. A plan that only exists on the screen where it was created is a
  // demo. Nothing is generated here without the student pressing the button.
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const planAbort = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadSatStudyPlan().then(stored => { if (!cancelled) setPlan(stored?.plan || null); });
    return () => { cancelled = true; planAbort.current?.abort(); };
  }, []);

  const buildPlan = useCallback(async ({ fresh = false } = {}) => {
    if (!profile) return;
    planAbort.current?.abort();
    const controller = new AbortController();
    planAbort.current = controller;
    setPlanLoading(true);
    setPlanError(null);
    const { plan: built, reason } = await generateSatStudyPlan(profile, { fresh, signal: controller.signal });
    if (controller.signal.aborted) return;
    setPlan(built);
    setPlanError(built ? null : reason);
    setPlanLoading(false);
  }, [profile]);

  const daysToExam = useMemo(() => {
    if (!user?.examDate) return null;
    return Math.ceil((new Date(`${user.examDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  }, [user?.examDate]);

  const action = useMemo(
    () => nextAction({ attempts, reviewLog, masteryMap, responseCount: responses.length, daysToExam }),
    [attempts, reviewLog, masteryMap, responses.length, daysToExam],
  );

  // The baseline lives in its own store rather than satAttempts (its questions
  // are generated and exist nowhere else), so it is loaded separately here to
  // surface on Overview — a placement test nobody discovers is a placement test
  // nobody takes.
  const [baselines, setBaselines] = useState([]);
  useEffect(() => {
    let live = true;
    DB.getSatBaselines({ limit: 2 })
      .then(rows => { if (live) setBaselines(rows); })
      .catch(() => {});
    return () => { live = false; };
  }, [responses.length]);

  const latestBaseline = baselines[0]?.result || null;
  const baselineDelta = compareBaselines(latestBaseline, baselines[1]?.result || null);
  const baselineOpen = canStartBaseline(baselines[0]?.finishedAt || null);
  const baselineWait = cooldownLabel(baselines[0]?.finishedAt || null);
  const secondary = useMemo(
    () => secondaryActions({ attempts, reviewLog, masteryMap }),
    [attempts, reviewLog, masteryMap],
  );

  const targetScore = user?.onboardingTargetScore || null;
  const progress = useMemo(() => targetProgress(projection, targetScore), [projection, targetScore]);
  const empty = projectionEmptyState(responses.length);
  const topWeak = ranked.filter(r => r.attempts > 0).slice(0, 4);

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        icon={Target} color={accent} color2={C.green}
        eyebrow="SAT" title="Your SAT"
        sub="Everything here is measured from SAT questions you have actually answered. Nothing is inferred from other parts of the app."
        stats={[
          ...(daysToExam != null ? [{ value: daysToExam, label: daysToExam === 1 ? 'day to test' : 'days to test', color: daysToExam <= 30 ? C.rose : undefined }] : []),
          { value: responses.length, label: 'questions answered' },
        ]}
        m={isMobile}
        tourTag="sat-deep-overview"
      />

      {/* ── Baseline ──
          Placed above the rolling score estimate because the two answer
          different questions and students conflate them. The estimate below is
          a running average over everything they have ever answered, which lags
          badly after a good week of work; the baseline is a single clean
          measurement taken under adaptive conditions. When both exist the
          baseline is the one to plan against. */}
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        border: `1px solid ${tint(latestBaseline ? C.gold : accent, 0.3)}`,
        background: latestBaseline ? undefined : `linear-gradient(135deg,${tint(C.gold, 0.1)},transparent)`,
      }}>
        <div style={{ ...R({ justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }) }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <SectionTitle icon={Gauge} color={C.gold}>Adaptive baseline</SectionTitle>
            {latestBaseline ? (
              <>
                <div style={{ ...R({ gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }) }}>
                  <span style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, fontFamily: C.FD, color: C.t1, letterSpacing: '-.03em' }}>
                    {latestBaseline.low}–{latestBaseline.high}
                  </span>
                  <span style={pill(tint(C.gold, 0.15), C.gold, { fontSize: 10 })}>{latestBaseline.confidence} confidence</span>
                  {baselineDelta?.significant && (
                    <span style={pill(tint(baselineDelta.direction === 'up' ? C.green : C.rose, 0.14), baselineDelta.direction === 'up' ? C.greenL : C.roseL, { fontSize: 10 })}>
                      {baselineDelta.delta > 0 ? '+' : ''}{baselineDelta.delta} since last
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: C.t3, marginTop: 7, lineHeight: 1.6 }}>
                  From a single {BASELINE_LENGTH}-question adaptive run — a clean measurement, unlike the running
                  estimate below which averages everything you have ever answered.
                  {baselineOpen ? ' You can take a new one now.' : ` Next one in ${baselineWait}.`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.65, maxWidth: 560 }}>
                You have not set a baseline yet. {BASELINE_LENGTH} questions, each written for you and each one
                harder or easier depending on how the last went — it is the fastest honest answer to
                &ldquo;where am I actually scoring right now?&rdquo;, and everything else here plans against it.
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate?.('baseline')}
            style={btn(`linear-gradient(135deg,${C.gold},${C.orange})`, { fontSize: 12.5, padding: '10px 20px', flexShrink: 0 })}
          >
            {latestBaseline ? (baselineOpen ? 'Retake baseline' : 'See breakdown') : 'Set your baseline'}
          </button>
        </div>
      </div>

      {/* ── Score projection ── */}
      <div style={glass({ padding: isMobile ? 18 : 24 })}>
        <SectionTitle icon={TrendingUp} color={accent}>Score estimate</SectionTitle>
        {projection ? (
          <>
            <div style={{ ...R({ gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }) }}>
              <div>
                <div style={{
                  fontSize: isMobile ? 34 : 44, fontWeight: 800, fontFamily: C.FM, lineHeight: 1,
                  background: `linear-gradient(135deg,${accent},${C.green})`, WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {projection.low}–{projection.high}
                </div>
                <div style={{ fontSize: 11.5, color: C.t3, marginTop: 6 }}>
                  midpoint {projection.mid} · roughly the {projection.percentile}th percentile
                </div>
              </div>
              <span style={pill(
                tint(projection.confidence === 'high' ? C.green : projection.confidence === 'moderate' ? C.amber : C.orange, 0.14),
                projection.confidence === 'high' ? C.greenL : projection.confidence === 'moderate' ? C.amberL : C.orangeL,
                { fontSize: 10.5, fontWeight: 700, border: `1px solid ${tint(projection.confidence === 'high' ? C.green : C.amber, 0.28)}` },
              )}>
                {projection.confidence} confidence
              </span>
            </div>

            <div style={{ fontSize: 12, color: C.t2, marginTop: 12, lineHeight: 1.65 }}>{projection.note}</div>

            {projection.sections && (
              <div style={{ ...G(2, 12, {}, isMobile), marginTop: 16 }}>
                {Object.entries(SAT_SECTIONS).map(([id, sec]) => {
                  const s = projection.sections[id];
                  if (!s) return null;
                  return (
                    <StatTile
                      key={id} icon={Layers} color={sec.color}
                      value={s.scaled} label={sec.label}
                      sub={s.attempts ? `from ${s.attempts} questions` : undefined}
                    />
                  );
                })}
              </div>
            )}

            {progress && (
              <div style={{ marginTop: 18 }}>
                <div style={{ ...R({ gap: 8 }), justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, color: C.t2, fontWeight: 600 }}>
                    Toward your {progress.target} target
                  </span>
                  <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>
                    {progress.reached ? 'at target' : progress.withinRange ? 'within range' : `${progress.gap} to go`}
                  </span>
                </div>
                <Bar pct={progress.pct} color={progress.reached ? C.green : accent} h={6} glow />
              </div>
            )}

            <div style={{ ...R({ gap: 7, alignItems: 'flex-start' }), marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.b1}` }}>
              <Info size={12} color={C.t4} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>{SCORE_DISCLAIMER}</span>
            </div>
          </>
        ) : (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{empty.title}</div>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, maxWidth: 560 }}>{empty.body}</div>
            <button onClick={() => onNavigate?.(empty.view)} style={{ ...btnG({ padding: '8px 16px' }), marginTop: 14 }}>
              {empty.cta} <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Next best action ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{
          ...glass({ padding: isMobile ? 18 : 24 }),
          background: `linear-gradient(120deg,${tint(action.tone === 'urgent' ? C.rose : accent, 0.13)},rgba(255,255,255,0.02))`,
          border: `1px solid ${tint(action.tone === 'urgent' ? C.rose : accent, 0.3)}`,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: action.tone === 'urgent' ? C.roseL : accent, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Do this next
        </div>
        <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em' }}>
          {action.title}
        </div>
        <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, marginTop: 8, maxWidth: 620 }}>{action.body}</div>
        <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginTop: 16 }}>
          <button
            onClick={() => onNavigate?.(action.view, action.params)}
            style={btn(`linear-gradient(135deg,${action.tone === 'urgent' ? C.rose : accent},${action.tone === 'urgent' ? C.roseL : C.green})`)}
          >
            {action.ctaLabel} <ChevronRight size={14} />
          </button>
          {secondary.map(s => (
            <button key={s.id} onClick={() => onNavigate?.(s.view, s.params)} style={btnG({ padding: '8px 14px', fontSize: 12 })}>
              {s.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Study plan ──
          Sits under the next action, not above it: the next action is what to do
          in the next twenty minutes, the plan is what to do over the next month,
          and a student opening this tab needs the first one first. */}
      {(plan || planLoading || planError) ? (
        <SatStudyPlanCard
          plan={plan} loading={planLoading} error={planError}
          accent={accent} isMobile={isMobile}
          onNavigate={onNavigate}
          onRegenerate={() => buildPlan({ fresh: true })}
          generatedFromLabel={plan ? `built ${relativeDay(plan.createdAt)}` : null}
        />
      ) : responses.length >= 15 && (
        // Offered only once there is enough measured data for a plan to be worth
        // anything. Below that the honest answer is "take the diagnostic", which
        // the next-action card above is already saying.
        <div style={{
          ...glass({ padding: isMobile ? 16 : 20 }),
          border: `1px dashed ${tint(accent, 0.3)}`,
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={R({ gap: 12, flexWrap: 'wrap' })}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>Want this turned into a plan?</div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 4 }}>
                Medabrain will read your mastery, your review log and your pacing, and write you a few
                specific weeks of work.
              </div>
            </div>
            <button onClick={() => buildPlan()} style={btnG({ padding: '9px 16px', fontSize: 12.5, flexShrink: 0 })}>
              <Sparkles size={13} /> Build my plan
            </button>
          </div>
        </div>
      )}

      {/* ── Quick stats ── */}
      <div style={G(3, 12, {}, isMobile)}>
        <StatTile
          icon={AlertTriangle} color={summary.open ? C.rose : C.green}
          value={summary.open} label="open review items" sub={summary.headline}
          onClick={() => onNavigate?.('review')}
        />
        <StatTile
          icon={CalendarClock} color={C.violet}
          value={attempts.filter(a => a.kind === 'full' && a.status === 'complete').length}
          label="full tests taken"
          sub={attempts.some(a => a.kind === 'full') ? undefined : 'none yet'}
          onClick={() => onNavigate?.('tests')}
        />
        <StatTile
          icon={TrendingUp} color={C.amber}
          value={Object.values(masteryMap).filter(m => m.attempts > 0).length}
          label="skills measured"
          sub={`of ${Object.keys(masteryMap).length}`}
          onClick={() => onNavigate?.('skills')}
        />
      </div>

      {/* ── Biggest opportunities ── */}
      {topWeak.length > 0 && (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Target} color={C.rose}>Where your points are</SectionTitle>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14, lineHeight: 1.6 }}>
            Ranked by leverage: how far from mastered you are, multiplied by how many questions the real exam spends on it.
          </div>
          <div style={CC({ gap: 11 })}>
            {topWeak.map(s => (
              <button
                key={s.skill} onClick={() => onNavigate?.('practice', { skill: s.skill })}
                style={{ ...glass2({ padding: 13 }), textAlign: 'left', cursor: 'pointer', fontFamily: C.FB, border: `1px solid ${C.b1}` }}
              >
                <div style={{ ...R({ gap: 10 }), justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{s.label}</span>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
                    {Math.round(s.mastery * 100)}% · n={s.attempts}
                  </span>
                </div>
                <div style={R({ gap: 10 })}>
                  <div style={{ flex: 1 }}><Bar pct={s.mastery * 100} color={s.color} h={4} /></div>
                  <span style={{ fontSize: 10, color: C.t4, whiteSpace: 'nowrap' }}>
                    ~{(s.examShare * 98).toFixed(1)} q/exam
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Heat map ── */}
      <div style={glass({ padding: isMobile ? 18 : 24 })}>
        <SectionTitle icon={Layers} color={accent}>All 28 tested skills</SectionTitle>
        <SatSkillHeatmap
          masteryMap={masteryMap}
          isMobile={isMobile}
          onSelect={(skill) => onNavigate?.('practice', { skill })}
        />
      </div>

      {/* ── Test-day tools ──
          Discoverability, not decoration: a calculator nobody knows is there is
          worth exactly as much as no calculator. The rail on the left edge is
          always available, but the first visit needs to be told. */}
      <div style={glass({ padding: isMobile ? 18 : 24 })}>
        <SectionTitle icon={Calculator} color={C.teal}>Your test-day tools</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, marginBottom: 14, maxWidth: 620 }}>
          The Digital SAT gives you Desmos on every Math question and keeps a formula sheet on
          screen for the whole section. Both are here, on every SAT screen — including mid-question
          and mid-test — so the way you practise is the way you will actually sit the exam.
        </div>
        <div style={G(3, 12, {}, isMobile)}>
          <StatTile
            icon={Calculator} color={C.teal} value="Desmos"
            label="graphing calculator" sub="Alt+C, or the left edge"
            onClick={() => tools.available ? tools.openCalculator() : onNavigate?.('toolkit')}
          />
          <StatTile
            icon={BookOpen} color={C.emerald} value="Formulas"
            label="given, and not given" sub="Alt+R"
            onClick={() => tools.available ? tools.openReference() : onNavigate?.('toolkit')}
          />
          <StatTile
            icon={Brain} color={accent} value="Medabrain"
            label="SAT coach" sub="reads the data on this page"
            onClick={() => onAskMedabrain?.()}
          />
        </div>
      </div>
    </div>
  );
}

/** "today" / "yesterday" / "6 days ago" — a date stamp reads as noise here. */
function relativeDay(ts) {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}
