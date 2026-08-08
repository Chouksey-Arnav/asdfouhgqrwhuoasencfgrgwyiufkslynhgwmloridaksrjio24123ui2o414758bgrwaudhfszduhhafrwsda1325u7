import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight, CalendarClock, AlertTriangle, TrendingUp, Info, Layers, Calculator, BookOpen, Brain, Sparkles, Gauge } from 'lucide-react';
import { C, glass2, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import { StatTile } from '../ui/PanelHero';
import { Bar } from '../ui/primitives';
import { SatPageHeader, SatCard, satBtn, satWash } from './satUi';
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
//
// Visually it is composed as a command center rather than a stack of
// look-alike cards: one score band that answers "where am I?" (estimate +
// baseline side by side, because students conflate them and the layout itself
// should teach the difference), one action band that answers "what now?", and
// the evidence below.
// ─────────────────────────────────────────────────────────────────────────────

export default function SatOverviewPanel({
  accent = C.sky, satData, profile = null, user, isMobile = false, onNavigate, onAskMedabrain,
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

  const confColor = projection?.confidence === 'high' ? C.green : projection?.confidence === 'moderate' ? C.amber : C.orange;
  const urgent = action.tone === 'urgent';

  return (
    <div style={CC({ gap: isMobile ? 14 : 18 })}>
      <SatPageHeader
        eyebrow="SAT · Digital" title="Score center"
        sub="Measured only from SAT questions you’ve actually answered."
        meta={[
          ...(daysToExam != null ? [{ value: daysToExam, label: daysToExam === 1 ? 'day to test' : 'days to test', color: daysToExam <= 30 ? C.rose : accent }] : []),
          { value: responses.length, label: 'answered' },
        ]}
        m={isMobile}
        tourTag="sat-deep-overview"
      />

      {/* ── The score band ──
          Estimate and baseline side by side, because the two answer different
          questions and students conflate them: the estimate is a running
          average over everything ever answered (it lags after a good week);
          the baseline is one clean adaptive measurement. When both exist,
          the baseline is the one to plan against — the layout says so by
          giving them equal billing rather than burying one below the other. */}
      <section style={{
        background: C.surf, border: `1px solid ${C.b1}`, borderRadius: 14, boxShadow: C.shadow,
        overflow: 'hidden', display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.35fr) minmax(0,1fr)',
      }}>
        {/* Estimate */}
        <div style={{ padding: isMobile ? 18 : 26, minWidth: 0 }}>
          <div style={{ ...R({ gap: 8 }), marginBottom: 14 }}>
            <TrendingUp size={13} color={accent} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '.09em' }}>Score estimate</span>
            {projection && (
              <span style={pill(tint(confColor, 0.13), confColor, { fontSize: 10, fontWeight: 700, border: `1px solid ${tint(confColor, 0.3)}` })}>
                {projection.confidence} confidence
              </span>
            )}
          </div>
          {projection ? (
            <>
              <div style={{ ...R({ gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }) }}>
                <span style={{
                  fontSize: isMobile ? 38 : 48, fontWeight: 800, fontFamily: C.FD, lineHeight: 1,
                  color: C.t1, letterSpacing: '-.035em', fontVariantNumeric: 'tabular-nums',
                }}>
                  {projection.low}<span style={{ color: C.t4, fontWeight: 600, padding: '0 2px' }}>–</span>{projection.high}
                </span>
                <span style={{ fontSize: 11.5, color: C.t3 }}>
                  midpoint <b style={{ color: C.t2, fontFamily: C.FM }}>{projection.mid}</b> · ~{projection.percentile}th percentile
                </span>
              </div>

              <div style={{ fontSize: 12, color: C.t2, marginTop: 12, lineHeight: 1.65, maxWidth: 520 }}>{projection.note}</div>

              {projection.sections && (
                <div style={{ ...G(2, 10, {}, isMobile), marginTop: 16 }}>
                  {Object.entries(SAT_SECTIONS).map(([id, sec]) => {
                    const s = projection.sections[id];
                    if (!s) return null;
                    return (
                      <div key={id} style={{ ...glass2({ padding: '11px 14px' }), ...R({ gap: 10, justifyContent: 'space-between' }) }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{sec.label}</div>
                          {s.attempts ? <div style={{ fontSize: 9.5, color: C.t4, marginTop: 2 }}>from {s.attempts} questions</div> : null}
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: C.FM, color: sec.color, lineHeight: 1 }}>{s.scaled}</span>
                      </div>
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

              <div style={{ ...R({ gap: 7, alignItems: 'flex-start' }), marginTop: 16, paddingTop: 13, borderTop: `1px solid ${C.b0}` }}>
                <Info size={12} color={C.t4} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>{SCORE_DISCLAIMER}</span>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{empty.title}</div>
              <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, maxWidth: 520 }}>{empty.body}</div>
              <button onClick={() => onNavigate?.(empty.view)} style={{ ...btnG({ padding: '8px 16px' }), marginTop: 14 }}>
                {empty.cta} <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Baseline */}
        <div style={{
          padding: isMobile ? 18 : 26, minWidth: 0,
          borderTop: isMobile ? `1px solid ${C.b1}` : 'none',
          borderLeft: isMobile ? 'none' : `1px solid ${C.b1}`,
          background: satWash(C.gold, 0.05),
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ ...R({ gap: 8 }), marginBottom: 14 }}>
            <Gauge size={13} color={C.gold} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: 'uppercase', letterSpacing: '.09em' }}>Adaptive baseline</span>
          </div>
          {latestBaseline ? (
            <>
              <div style={{ ...R({ gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }) }}>
                <span style={{
                  fontSize: isMobile ? 28 : 34, fontWeight: 800, fontFamily: C.FD, color: C.t1,
                  letterSpacing: '-.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>
                  {latestBaseline.low}<span style={{ color: C.t4, fontWeight: 600, padding: '0 1px' }}>–</span>{latestBaseline.high}
                </span>
                <span style={pill(tint(C.gold, 0.14), C.gold, { fontSize: 10 })}>{latestBaseline.confidence} confidence</span>
                {baselineDelta?.significant && (
                  <span style={pill(tint(baselineDelta.direction === 'up' ? C.green : C.rose, 0.14), baselineDelta.direction === 'up' ? C.greenL : C.roseL, { fontSize: 10 })}>
                    {baselineDelta.delta > 0 ? '+' : ''}{baselineDelta.delta} since last
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: C.t3, marginTop: 10, lineHeight: 1.65, flex: 1 }}>
                One clean {BASELINE_LENGTH}-question adaptive measurement — unlike the running estimate,
                which averages everything you have ever answered.
                {baselineOpen ? ' You can take a new one now.' : ` Next one in ${baselineWait}.`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7, flex: 1 }}>
              You have not set a baseline yet. {BASELINE_LENGTH} questions, each written for you and each one
              harder or easier depending on how the last went — the fastest honest answer to
              &ldquo;where am I actually scoring right now?&rdquo;. Everything else here plans against it.
            </div>
          )}
          <button
            onClick={() => onNavigate?.('baseline')}
            style={satBtn(C.gold, { fontSize: 12.5, padding: '10px 20px', marginTop: 16, alignSelf: 'flex-start' })}
          >
            {latestBaseline ? (baselineOpen ? 'Retake baseline' : 'See breakdown') : 'Set your baseline'}
          </button>
        </div>
      </section>

      {/* ── Next best action ──
          A left-rule banner, not another gradient card: one clear directive
          with the primary button, secondaries kept quiet beside it. */}
      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: C.surf, border: `1px solid ${C.b1}`,
          borderLeft: `3px solid ${urgent ? C.rose : accent}`,
          borderRadius: 14, boxShadow: C.shadowSm,
          padding: isMobile ? 16 : '20px 24px',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: urgent ? C.roseL : accent, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 7 }}>
          Do this next
        </div>
        <div style={{ ...R({ gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }) }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em' }}>
              {action.title}
            </div>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, marginTop: 6, maxWidth: 620 }}>{action.body}</div>
          </div>
          <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }) }}>
            {secondary.map(s => (
              <button key={s.id} onClick={() => onNavigate?.(s.view, s.params)} style={btnG({ padding: '8px 14px', fontSize: 12 })}>
                {s.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate?.(action.view, action.params)}
              style={satBtn(urgent ? C.rose : accent)}
            >
              {action.ctaLabel} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.section>

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
          border: `1px dashed ${tint(accent, 0.35)}`, borderRadius: 14,
          background: C.surf2, padding: isMobile ? 16 : '18px 22px',
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
          icon={CalendarClock} color={accent}
          value={attempts.filter(a => a.kind === 'full' && a.status === 'complete').length}
          label="full tests taken"
          sub={attempts.some(a => a.kind === 'full') ? undefined : 'none yet'}
          onClick={() => onNavigate?.('tests')}
        />
        <StatTile
          icon={TrendingUp} color={accent}
          value={Object.values(masteryMap).filter(m => m.attempts > 0).length}
          label="skills measured"
          sub={`of ${Object.keys(masteryMap).length}`}
          onClick={() => onNavigate?.('skills')}
        />
      </div>

      {/* ── Biggest opportunities ── */}
      {topWeak.length > 0 && (
        <SatCard
          title="Where your points are" icon={Target} iconColor={C.rose} m={isMobile}
          action={<span style={{ fontSize: 10.5, color: C.t4 }}>ranked by leverage</span>}
        >
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14, lineHeight: 1.6 }}>
            How far from mastered you are, multiplied by how many questions the real exam spends on it.
          </div>
          <div style={CC({ gap: 10 })}>
            {topWeak.map(s => (
              <button
                key={s.skill} onClick={() => onNavigate?.('practice', { skill: s.skill })}
                className="sat-choice sat-tap"
                style={{ ...glass2({ padding: 13 }), textAlign: 'left', cursor: 'pointer', fontFamily: C.FB, border: `1px solid ${C.b1}`, width: '100%' }}
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
        </SatCard>
      )}

      {/* ── Heat map ── */}
      <SatCard title="All 28 tested skills" icon={Layers} iconColor={accent} m={isMobile}>
        <SatSkillHeatmap
          masteryMap={masteryMap}
          isMobile={isMobile}
          onSelect={(skill) => onNavigate?.('practice', { skill })}
        />
      </SatCard>

      {/* ── Test-day tools ──
          Discoverability, not decoration: a calculator nobody knows is there is
          worth exactly as much as no calculator. The rail on the left edge is
          always available, but the first visit needs to be told. */}
      {/* The three tiles below used to be teal / emerald / sky — three hues for
          three things that are simply "tools", which is exactly the kind of
          color-without-meaning the SAT palette policy rules out. They share
          the pillar accent now and are told apart by their icons and labels. */}
      <SatCard title="Your test-day tools" icon={Calculator} iconColor={accent} m={isMobile}>
        <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, marginBottom: 14, maxWidth: 620 }}>
          The Digital SAT gives you Desmos on every Math question and keeps a formula sheet on
          screen for the whole section. Both are here, on every SAT screen — including mid-question
          and mid-test — so the way you practice is the way you will actually sit the exam.
        </div>
        <div style={G(3, 12, {}, isMobile)}>
          <StatTile
            icon={Calculator} color={accent} value="Desmos"
            label="graphing calculator" sub="Alt+C, or the left edge"
            onClick={() => tools.available ? tools.openCalculator() : onNavigate?.('toolkit')}
          />
          <StatTile
            icon={BookOpen} color={accent} value="Formulas"
            label="given, and not given" sub="Alt+R"
            onClick={() => tools.available ? tools.openReference() : onNavigate?.('toolkit')}
          />
          <StatTile
            icon={Brain} color={accent} value="Medabrain"
            label="SAT coach" sub="reads the data on this page"
            onClick={() => onAskMedabrain?.()}
          />
        </div>
      </SatCard>
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
