import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Zap, Target, Clock, ChevronRight, Sparkles, RotateCcw, Check,
  Wand2, ShieldCheck, Loader2, AlertTriangle, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import EmptyState from '../ui/EmptyState';
import { Bar } from '../ui/primitives';
import SatQuestionPlayer from './SatQuestionPlayer';
import { useSatSession } from './useSatSession';
import { buildSmartSet, buildSkillDrill, buildTimedSet, estimateMinutes, targetDifficulty } from '../../lib/sat/selector';
import { generateQuestions } from '../../lib/sat/aiQuestions';
import { generatePracticeSet } from '../../lib/sat/aiPractice';
import { planGeneratedSet } from '../../lib/sat/learnerProfile';
import { SAT_SECTIONS, skillMeta } from '../../data/sat/taxonomy';
import { questionCountForSkill } from '../../data/sat/questions/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Practice — four modes, with Smart Set as the default because choosing what to
// study is the part students reliably get wrong.
//
// Smart Set / Skill Drill / Timed Set all draw from the hand-written bank, which
// is finite and identical for every student. AI Set writes new questions for
// THIS student — see src/lib/sat/aiPractice.js, including why every generated
// item is independently re-solved by a second model before it is shown.
// ─────────────────────────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'smart', label: 'Smart Set', icon: Zap, color: C.blue,
    blurb: 'Mixed questions weighted toward your weakest high-value skills, with due retries folded in. Explanations after each one.',
  },
  {
    id: 'ai', label: 'AI Set', icon: Wand2, color: C.lime,
    blurb: 'Fresh questions written for your data — your weakest skills, at your level, built around the traps you keep falling for.',
  },
  {
    id: 'drill', label: 'Skill Drill', icon: Target, color: C.violet,
    blurb: 'One skill, easy to hard, untimed. Use this when you know what is broken.',
  },
  {
    id: 'timed', label: 'Timed Set', icon: Clock, color: C.amber,
    blurb: 'Section-realistic mix under exam pacing. Explanations held back to the end, like the real thing.',
  },
];

/** What the AI Set screen says while it works. Two stages, honestly labelled. */
const STAGE_COPY = {
  authoring: {
    title: 'Writing your questions',
    body: 'Working from your skill mastery, your review log and your pacing. This runs on the deepest model available, which is slower and much more likely to key an answer correctly.',
  },
  verifying: {
    title: 'Checking the answer keys',
    body: 'A second, different model is now solving each question without being shown the answer. Anything the two disagree on gets thrown away rather than shown to you.',
  },
};

export default function SatPracticePanel({
  accent = C.blue, satData, profile = null, params, onConsumeParams,
  isMobile = false, onNavigate, onSessionComplete, onAskMedabrain,
}) {
  const { masteryMap, ranked, openReviews, seenIds, reload } = satData;
  const [mode, setMode] = useState('smart');
  const [drillSkill, setDrillSkill] = useState(null);
  const [timedSection, setTimedSection] = useState('rw');
  const [session, setSession] = useState(null); // {questions, mode, kind, rationale, deadline}
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  // AI Set state: which stage we are in, what came back, why it failed.
  const [aiStage, setAiStage] = useState(null); // 'authoring' | 'verifying' | null
  const [aiResult, setAiResult] = useState(null); // { questions, verified, rejected, thin }
  const [aiError, setAiError] = useState(null);
  const [aiSection, setAiSection] = useState('all');
  const aiAbort = useRef(null);
  const { attemptId, setAttemptId, start, recordResponse, finish, abandon } = useSatSession();

  useEffect(() => () => aiAbort.current?.abort(), []);

  // Deep link from the Overview's next-best-action, or the Review Log.
  useEffect(() => {
    if (!params?.skill) return;
    setMode('drill');
    setDrillSkill(params.skill);
    onConsumeParams?.();
  }, [params, onConsumeParams]);

  const dueReviewIds = useMemo(
    () => openReviews.filter(r => (r.due || 0) <= Date.now()).map(r => r.questionId),
    [openReviews],
  );

  // Deliberately up here with the other hooks, above the `if (session)` and
  // `if (summary)` early returns. It used to live down beside the mode chooser
  // that consumes it, which meant React saw a different number of hooks the
  // moment a session started — "rendered fewer hooks than expected" waiting to
  // happen the first time the early return and a state update coincided.
  const smartPreview = useMemo(
    () => buildSmartSet({ masteryMap, dueReviewIds, seen: seenIds, count: 12, seed: 1 }),
    [masteryMap, dueReviewIds, seenIds],
  );

  const startSession = useCallback(async (config) => {
    if (!config.questions.length) return;
    const id = await start({
      kind: config.kind, section: config.section || null,
      questions: config.questions,
      // `generated` is recorded on the attempt so score history can tell an
      // AI-authored set apart from a bank set later. Generated items are not
      // official-form calibrated, and any future analysis that mixes the two
      // without knowing which is which would be quietly wrong.
      meta: { mode: config.mode, generated: !!config.generated },
    });
    setAttemptId(id);
    setSession({ ...config, attemptId: id });
    setSummary(null);
  }, [start, setAttemptId]);

  function beginSmart() {
    const { questions, rationale } = buildSmartSet({
      masteryMap, dueReviewIds, seen: seenIds, count: 12, seed: Date.now(),
    });
    startSession({ questions, rationale, mode: 'tutor', kind: 'drill' });
  }

  async function beginDrill(skillId) {
    let questions = buildSkillDrill(skillId, { count: 10, seen: seenIds, seed: Date.now() });

    // Top up from the AI when the static bank cannot fill a drill without
    // repeating. The bank is always primary; generated items are validated in
    // aiQuestions.js and silently dropped if they fail, so a thin skill yields
    // a shorter drill rather than a wrong one.
    const unseenCount = questions.filter(q => !seenIds.has(q.id)).length;
    if (unseenCount < 6) {
      setGenerating(true);
      try {
        const extra = await generateQuestions(skillId, {
          difficulty: targetDifficulty(masteryMap[skillId]?.mastery ?? 0),
          count: 4,
          profile,
        });
        if (extra.length) {
          const existing = new Set(questions.map(q => q.id));
          questions = [...questions, ...extra.filter(q => !existing.has(q.id))].slice(0, 12);
        }
      } finally {
        setGenerating(false);
      }
    }
    startSession({ questions, mode: 'tutor', kind: 'drill', skill: skillId });
  }

  // ── AI Set ─────────────────────────────────────────────────────────────────
  // The blueprint (which skills, at what difficulty, how many of each, and why)
  // is computed locally from the profile before any network call, so the panel
  // can show the student what it is about to ask for. That preview is not
  // decoration: "we are generating 8 questions" is opaque, "3 on Boundaries
  // because you are at 41% over 12 questions and it is worth 7 questions a
  // exam" is a claim they can check.
  const aiBlueprint = useMemo(
    () => planGeneratedSet(profile, {
      count: 8,
      section: aiSection === 'all' ? null : aiSection,
    }),
    [profile, aiSection],
  );

  const buildAiSet = useCallback(async ({ fresh = false } = {}) => {
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    setAiError(null);
    setAiResult(null);
    setAiStage('authoring');
    const result = await generatePracticeSet({
      profile,
      blueprint: aiBlueprint,
      mode: 'mixed',
      fresh,
      onStage: setAiStage,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    setAiStage(null);
    if (!result.questions.length) { setAiError(result.reason || 'nothing came back'); return; }
    setAiResult(result);
  }, [profile, aiBlueprint]);

  function beginTimed(section) {
    const questions = buildTimedSet(section, { count: 22, seen: seenIds, seed: Date.now() });
    // Real module pacing, so the timer means something.
    const deadline = Date.now() + SAT_SECTIONS[section].minutesPerModule * 60000;
    startSession({ questions, mode: 'timed', kind: 'timed', section, deadline });
  }

  async function handleComplete(responses) {
    const res = await finish(session.attemptId, responses);
    setSummary({ responses, ...res, questions: session.questions });
    setSession(null);
    onSessionComplete?.('sat_practice');
    reload();
  }

  async function handleLeave() {
    if (attemptId) await abandon(attemptId);
    setSession(null);
    reload();
  }

  // ── Active session ──
  if (session) {
    return (
      <div style={CC({ gap: 18 })}>
        <SatQuestionPlayer
          profile={profile}
          questions={session.questions}
          mode={session.mode}
          seedKey={`attempt-${session.attemptId}`}
          deadline={session.deadline}
          accent={accent}
          isMobile={isMobile}
          onAnswer={(r) => recordResponse(session.attemptId, r)}
          onComplete={handleComplete}
          onExit={handleLeave}
          onAskMedabrain={onAskMedabrain}
        />
      </div>
    );
  }

  // ── Post-session summary ──
  if (summary) {
    const pct = summary.responses.length ? Math.round((summary.correct / summary.responses.length) * 100) : 0;
    const missed = summary.responses.filter(r => !r.correct);
    const bySkill = {};
    for (const r of summary.responses) {
      const s = (bySkill[r.skill] ||= { skill: r.skill, total: 0, correct: 0 });
      s.total++;
      if (r.correct) s.correct++;
    }
    return (
      <div style={CC({ gap: 18 })}>
        <PanelHero
          icon={Check} color={pct >= 70 ? C.green : C.amber} color2={accent}
          eyebrow="Set complete" title={`${summary.correct} of ${summary.responses.length} correct`}
          sub={missed.length
            ? `${missed.length} question${missed.length === 1 ? '' : 's'} went to your review log. Sorting why you missed them is worth more than answering another set.`
            : 'Clean sweep. Nothing added to your review log.'}
          stats={[{ value: `${pct}%`, label: 'accuracy' }, { value: `+${summary.xp}`, label: 'XP' }]}
          m={isMobile}
        />

        <div style={glass({ padding: isMobile ? 18 : 22 })}>
          <SectionTitle icon={Layers} color={accent}>How each skill went</SectionTitle>
          <div style={CC({ gap: 12 })}>
            {Object.values(bySkill).sort((a, b) => (a.correct / a.total) - (b.correct / b.total)).map(s => {
              const meta = skillMeta(s.skill);
              const p = Math.round((s.correct / s.total) * 100);
              return (
                <div key={s.skill}>
                  <div style={{ ...R({ gap: 8 }), justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>{meta.label}</span>
                    <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>{s.correct}/{s.total}</span>
                  </div>
                  <Bar pct={p} color={p >= 70 ? C.green : p >= 40 ? C.amber : C.rose} h={5} />
                </div>
              );
            })}
          </div>
          <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginTop: 20 }}>
            {missed.length > 0 && (
              <button onClick={() => onNavigate?.('review')} style={btn(`linear-gradient(135deg,${C.rose},${C.roseL})`)}>
                Sort these {missed.length} misses <ChevronRight size={14} />
              </button>
            )}
            <button onClick={() => { setSummary(null); beginSmart(); }} style={btnG()}>
              <RotateCcw size={13} /> Another set
            </button>
            <button onClick={() => setSummary(null)} style={btnG()}>Back to practice</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode chooser ──
  const weakest = ranked.filter(r => questionCountForSkill(r.skill) > 0).slice(0, 8);

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        icon={Layers} color={accent} color2={C.violet}
        eyebrow="Practice" title="Targeted practice"
        sub="Answering questions is not the same as improving. These modes aim your time at the skills that are actually costing you points."
        stats={[
          { value: dueReviewIds.length, label: 'due retries' },
          { value: weakest.length ? `${Math.round(weakest[0].mastery * 100)}%` : '—', label: 'weakest skill' },
        ]}
        m={isMobile}
        tourTag="sat-deep-practice"
      />

      {/* Mode selector — four across on desktop, two-up on a phone (see G()). */}
      <div style={G(4, 12, {}, isMobile)}>
        {MODES.map(m => {
          const isActive = mode === m.id;
          const Icon = m.icon;
          return (
            <motion.button
              key={m.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={() => setMode(m.id)}
              className="sat-choice"
              aria-pressed={isActive}
              style={{
                textAlign: 'left', padding: isMobile ? 14 : 16, borderRadius: 13, cursor: 'pointer',
                border: `1px solid ${isActive ? tint(m.color, 0.45) : C.b1}`,
                background: isActive ? `linear-gradient(120deg,${tint(m.color, 0.14)},rgba(255,255,255,0.015))` : 'rgba(255,255,255,0.02)',
                fontFamily: C.FB,
              }}
            >
              <div style={{ ...R({ gap: 9 }), marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(m.color, 0.16), border: `1px solid ${tint(m.color, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={m.color} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>{m.blurb}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Mode body */}
      {mode === 'smart' && (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Sparkles} color={C.blue}>What this set will cover</SectionTitle>
          {smartPreview.rationale.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>
              We have no performance data yet, so this first set spreads across the whole test to find out where you stand.
            </div>
          ) : (
            <div style={CC({ gap: 8 })}>
              {smartPreview.rationale.slice(0, 5).map(r => (
                <div key={r.skill} style={{ ...R({ gap: 10 }), justifyContent: 'space-between', ...glass2({ padding: '10px 14px' }) }}>
                  <span style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: C.t3 }}>{r.reason}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginTop: 18 }}>
            <button onClick={beginSmart} style={btn(`linear-gradient(135deg,${C.blue},${C.blueD})`)}>
              Start Smart Set · {smartPreview.questions.length} questions <ChevronRight size={14} />
            </button>
            <span style={{ fontSize: 11.5, color: C.t3 }}>
              ~{estimateMinutes(smartPreview.questions)} min
              {dueReviewIds.length > 0 && ` · includes ${Math.min(3, dueReviewIds.length)} retries`}
            </span>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Wand2} color={C.lime}>Questions written for you</SectionTitle>

          {/* Section filter — a student two days from a Math retake does not
              want a third of their set spent on Transitions. */}
          <div style={{ ...R({ gap: 7, flexWrap: 'wrap' }), marginBottom: 16 }}>
            {[{ id: 'all', label: 'Both sections' }, ...Object.values(SAT_SECTIONS).map(s => ({ id: s.id, label: s.label }))].map(f => (
              <button
                key={f.id} onClick={() => { setAiSection(f.id); setAiResult(null); setAiError(null); }}
                style={btnSm(aiSection === f.id ? tint(C.lime, 0.2) : 'rgba(255,255,255,0.03)', {
                  border: `1px solid ${aiSection === f.id ? tint(C.lime, 0.4) : C.b1}`,
                  color: aiSection === f.id ? '#fff' : C.t2, fontSize: 11.5,
                  minHeight: 34, // comfortable thumb target on a phone
                })}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── The blueprint, shown before anything is generated ── */}
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 12, lineHeight: 1.6 }}>
            {profile?.questionsAnswered
              ? 'Built from your own answers. Here is exactly what it will ask for, and why:'
              : 'You have not answered enough questions for this to be personal yet, so this first set spreads across the heaviest skills on the exam to find out where you stand.'}
          </div>
          <div style={CC({ gap: 8 })}>
            {aiBlueprint.map(b => (
              <div key={b.skill} style={{
                ...glass2({ padding: '11px 14px' }),
                display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap',
              }}>
                <span style={pill(tint(C.lime, 0.14), C.limeL, { fontSize: 10, fontFamily: C.FM, flexShrink: 0 })}>
                  {b.count}x
                </span>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55, marginTop: 2 }}>{b.why}</div>
                  {b.trap && (
                    <div style={{ ...R({ gap: 5 }), marginTop: 5 }}>
                      <Target size={10} color={C.amberL} />
                      <span style={{ fontSize: 10.5, color: C.amberL, lineHeight: 1.5 }}>
                        targeting your repeated trap: {b.trap.label}
                      </span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: C.t4, fontFamily: C.FM, flexShrink: 0 }}>
                  difficulty {b.difficulty}
                </span>
              </div>
            ))}
          </div>

          {/* ── Progress ── */}
          <AnimatePresence>
            {aiStage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  ...glass2({ padding: 15 }), marginTop: 16,
                  borderColor: tint(C.lime, 0.3),
                  background: `linear-gradient(120deg,${tint(C.lime, 0.09)},rgba(255,255,255,0.015))`,
                }}>
                  <div style={R({ gap: 10, alignItems: 'flex-start' })}>
                    <Loader2 size={15} color={C.limeL} className="spin" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{STAGE_COPY[aiStage].title}</div>
                      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65, marginTop: 3 }}>
                        {STAGE_COPY[aiStage].body}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Failure ── */}
          {aiError && !aiStage && (
            <div style={{ ...glass2({ padding: 14 }), marginTop: 16, borderColor: tint(C.amber, 0.28) }}>
              <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                <AlertTriangle size={13} color={C.amberL} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>Could not build a set just now</div>
                  <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65, marginTop: 3 }}>
                    {aiError}. Nothing is lost — Smart Set draws on the hand-written bank and needs no
                    connection to the AI at all.
                  </div>
                  <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 11 }}>
                    <button onClick={() => buildAiSet({ fresh: true })} style={btnG({ padding: '7px 13px', fontSize: 11.5 })}>
                      <RotateCcw size={12} /> Try again
                    </button>
                    <button onClick={() => setMode('smart')} style={btnG({ padding: '7px 13px', fontSize: 11.5 })}>
                      Use a Smart Set instead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Ready ── */}
          {aiResult && !aiStage && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{
                ...glass2({ padding: 15 }), marginTop: 16,
                borderColor: tint(C.green, 0.3),
                background: `linear-gradient(120deg,${tint(C.green, 0.08)},rgba(255,255,255,0.015))`,
              }}>
                <div style={R({ gap: 9, flexWrap: 'wrap' })}>
                  <ShieldCheck size={15} color={C.greenL} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>
                    {aiResult.questions.length} question{aiResult.questions.length === 1 ? '' : 's'} ready
                  </span>
                  {aiResult.verified && (
                    <span style={pill(tint(C.green, 0.14), C.greenL, { fontSize: 10, gap: 4, border: `1px solid ${tint(C.green, 0.28)}` })}>
                      <ShieldCheck size={9} /> keys independently checked
                    </span>
                  )}
                </div>
                {/* Two different failures get two different sentences. An item
                    that came back malformed and an item whose answer key the
                    checker disagreed with are not the same event, and collapsing
                    them into "some were discarded" hides the one that matters. */}
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65, marginTop: 8 }}>
                  {aiResult.rejected > 0 || aiResult.discarded > 0 ? (
                    <>
                      {aiResult.rejected > 0 && (
                        <>
                          {aiResult.rejected} more {aiResult.rejected === 1 ? 'was' : 'were'} thrown away because
                          the checker did not agree with the answer key. A question with a wrong key teaches you
                          something false, so a short set that is right beats a long one that is nearly right.{' '}
                        </>
                      )}
                      {aiResult.discarded > 0 && (
                        <>
                          {aiResult.discarded} {aiResult.discarded === 1 ? 'was' : 'were'} discarded before that,
                          for failing the structural checks — a duplicated choice, a giveaway-length answer, that
                          sort of thing.{' '}
                        </>
                      )}
                    </>
                  ) : (
                    'Every question was written for your data and re-solved by a second model before it got here. '
                  )}
                  {aiResult.thin && 'This set came out short; run it, then generate another.'}
                </div>
                <div style={{ ...R({ gap: 9, flexWrap: 'wrap' }), marginTop: 14 }}>
                  <button
                    onClick={() => startSession({
                      questions: aiResult.questions, mode: 'tutor', kind: 'drill', generated: true,
                    })}
                    style={btn(`linear-gradient(135deg,${C.lime},${C.green})`)}
                  >
                    Start this set <ChevronRight size={14} />
                  </button>
                  <button onClick={() => buildAiSet({ fresh: true })} style={btnG({ padding: '9px 15px', fontSize: 12.5 })}>
                    <RotateCcw size={12} /> Generate different ones
                  </button>
                  <span style={{ fontSize: 11.5, color: C.t3 }}>~{estimateMinutes(aiResult.questions)} min</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Kick-off ── */}
          {!aiResult && !aiStage && (
            <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginTop: 18 }}>
              <button
                onClick={() => buildAiSet()}
                disabled={!aiBlueprint.length}
                style={btn(`linear-gradient(135deg,${C.lime},${C.green})`, {
                  opacity: aiBlueprint.length ? 1 : 0.4,
                  cursor: aiBlueprint.length ? 'pointer' : 'not-allowed',
                })}
              >
                <Wand2 size={14} /> Generate my set
              </button>
              <span style={{ fontSize: 11.5, color: C.t3 }}>
                {aiBlueprint.reduce((s, b) => s + b.count, 0)} questions · takes a few seconds
              </span>
            </div>
          )}

          {/* ── The honest caveat ── */}
          <div style={{
            ...R({ gap: 7, alignItems: 'flex-start' }),
            marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.b1}`,
          }}>
            <Info size={12} color={C.t4} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6 }}>
              These are original questions written to the published Digital SAT blueprint — never real exam
              content, which College Board does not license. Every answer key is re-derived by a second,
              different model before you see it, and anything the two disagree on is discarded. It is still
              generated material: if a question looks wrong to you, trust yourself and flag it with Medabrain.
            </span>
          </div>
        </div>
      )}

      {mode === 'drill' && (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Target} color={C.violet}>Pick a skill</SectionTitle>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>
            Ordered by leverage — how weak you are, multiplied by how heavily the exam tests it.
          </div>
          <div style={CC({ gap: 8 })}>
            {weakest.map(s => {
              const isSel = drillSkill === s.skill;
              const bankSize = questionCountForSkill(s.skill);
              return (
                <button
                  key={s.skill} onClick={() => setDrillSkill(s.skill)}
                  style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: 11, cursor: 'pointer', fontFamily: C.FB,
                    border: `1px solid ${isSel ? tint(s.color, 0.45) : C.b1}`,
                    background: isSel ? tint(s.color, 0.1) : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ ...R({ gap: 10 }), justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{s.label}</span>
                    <span style={pill(tint(s.color, 0.14), s.color, { fontSize: 10 })}>{s.sectionLabel}</span>
                  </div>
                  <div style={{ ...R({ gap: 10 }), justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}><Bar pct={s.mastery * 100} color={s.color} h={4} /></div>
                    <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, whiteSpace: 'nowrap' }}>
                      {s.attempts ? `${Math.round(s.mastery * 100)}% · ${s.attempts} seen` : 'not started'} · {bankSize} in bank
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => drillSkill && beginDrill(drillSkill)}
            disabled={!drillSkill || generating}
            style={btn(`linear-gradient(135deg,${C.violet},${C.indigo})`, { marginTop: 18, opacity: drillSkill && !generating ? 1 : 0.4, cursor: drillSkill && !generating ? 'pointer' : 'not-allowed' })}
          >
            {generating ? 'Building your drill…' : <>Start drill <ChevronRight size={14} /></>}
          </button>
        </div>
      )}

      {mode === 'timed' && (
        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Clock} color={C.amber}>Choose a section</SectionTitle>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>
            One module's worth of questions at real exam pacing. Explanations are held back until you submit, so you practise committing under time.
          </div>
          <div style={G(2, 12, {}, isMobile)}>
            {Object.values(SAT_SECTIONS).map(s => (
              <button
                key={s.id} onClick={() => setTimedSection(s.id)}
                style={{
                  textAlign: 'left', padding: 16, borderRadius: 12, cursor: 'pointer', fontFamily: C.FB,
                  border: `1px solid ${timedSection === s.id ? tint(s.color, 0.45) : C.b1}`,
                  background: timedSection === s.id ? tint(s.color, 0.1) : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: C.t2 }}>{s.questionsPerModule} questions · {s.minutesPerModule} minutes</div>
              </button>
            ))}
          </div>
          <button onClick={() => beginTimed(timedSection)} style={btn(`linear-gradient(135deg,${C.amber},${C.orange})`, { marginTop: 18 })}>
            Start timed set <ChevronRight size={14} />
          </button>
        </div>
      )}

      {weakest.length === 0 && (
        <EmptyState
          icon={Layers} title="No question bank loaded"
          body="The SAT question bank appears to be empty. This is a build problem, not something you did."
          accent={accent}
        />
      )}
    </div>
  );
}
