import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Layers, Zap, Target, Clock, ChevronRight, Sparkles, RotateCcw, Check } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import EmptyState from '../ui/EmptyState';
import { Bar } from '../ui/primitives';
import SatQuestionPlayer from './SatQuestionPlayer';
import { useSatSession } from './useSatSession';
import { buildSmartSet, buildSkillDrill, buildTimedSet, estimateMinutes, targetDifficulty } from '../../lib/sat/selector';
import { generateQuestions } from '../../lib/sat/aiQuestions';
import { SAT_SECTIONS, skillMeta } from '../../data/sat/taxonomy';
import { questionCountForSkill } from '../../data/sat/questions/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Practice — three modes, with Smart Set as the default because choosing what
// to study is the part students reliably get wrong.
// ─────────────────────────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'smart', label: 'Smart Set', icon: Zap, color: C.blue,
    blurb: 'Mixed questions weighted toward your weakest high-value skills, with due retries folded in. Explanations after each one.',
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

export default function SatPracticePanel({
  accent = C.blue, satData, params, onConsumeParams, isMobile = false, onNavigate, onSessionComplete, onAskMedabrain,
}) {
  const { masteryMap, ranked, openReviews, seenIds, reload } = satData;
  const [mode, setMode] = useState('smart');
  const [drillSkill, setDrillSkill] = useState(null);
  const [timedSection, setTimedSection] = useState('rw');
  const [session, setSession] = useState(null); // {questions, mode, kind, rationale, deadline}
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { attemptId, setAttemptId, start, recordResponse, finish, abandon } = useSatSession();

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

  const startSession = useCallback(async (config) => {
    if (!config.questions.length) return;
    const id = await start({
      kind: config.kind, section: config.section || null,
      questions: config.questions, meta: { mode: config.mode },
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
  const smartPreview = useMemo(
    () => buildSmartSet({ masteryMap, dueReviewIds, seen: seenIds, count: 12, seed: 1 }),
    [masteryMap, dueReviewIds, seenIds],
  );

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

      {/* Mode selector */}
      <div style={G(3, 12, {}, isMobile)}>
        {MODES.map(m => {
          const isActive = mode === m.id;
          const Icon = m.icon;
          return (
            <motion.button
              key={m.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={() => setMode(m.id)}
              style={{
                textAlign: 'left', padding: 16, borderRadius: 13, cursor: 'pointer',
                border: `1px solid ${isActive ? tint(m.color, 0.45) : C.b1}`,
                background: isActive ? `linear-gradient(120deg,${tint(m.color, 0.14)},rgba(255,255,255,0.015))` : 'rgba(255,255,255,0.02)',
                fontFamily: C.FB, transition: 'all .15s',
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
