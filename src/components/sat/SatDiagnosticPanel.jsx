import React, { useState, useMemo } from 'react';
import { Compass, ChevronRight, Clock, Target, TrendingUp, RotateCcw } from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, G, tint, pill } from '../../lib/theme';
import PanelHero, { SectionTitle, StatTile } from '../ui/PanelHero';
import { Bar } from '../ui/primitives';
import SatQuestionPlayer from './SatQuestionPlayer';
import { useSatSession } from './useSatSession';
import { buildDiagnostic, estimateMinutes } from '../../lib/sat/selector';
import { computeAllMastery, rankSkillsByLeverage } from '../../lib/sat/mastery';
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
  accent = C.cyan, satData, isMobile = false, onNavigate,
}) {
  const { attempts, reload } = satData;
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const { start, recordResponse, finish, abandon, attemptId } = useSatSession();

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
        questions={session.questions} mode="tutor"
        seedKey={`attempt-${session.attemptId}`} accent={accent} isMobile={isMobile}
        onAnswer={(r) => recordResponse(session.attemptId, r)}
        onComplete={handleComplete} onExit={handleLeave}
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
        <PanelHero
          icon={Target} color={C.green} color2={accent}
          eyebrow="Diagnostic complete" title={`${correct} of ${total} correct`}
          sub="This is a starting map, not a score. It is deliberately wide and shallow — enough to aim your prep, not enough to predict a test result. Take a full-length test when you want a real estimate."
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

        <div style={glass({ padding: isMobile ? 18 : 24 })}>
          <SectionTitle icon={Target} color={C.rose}>Your prescription</SectionTitle>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7, marginBottom: 16 }}>
            Ranked by leverage — how weak you were, multiplied by how heavily the real exam tests it.
            Each of these was measured from only a question or two, so treat the order as a starting hypothesis.
          </div>
          <div style={CC({ gap: 12 })}>
            {weakest.map((s, i) => (
              <div key={s.skill} style={glass2({ padding: 14 })}>
                <div style={{ ...R({ gap: 10 }), justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={R({ gap: 9 })}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: tint(s.color, 0.18), color: s.color, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.FM }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.label}</span>
                  </div>
                  <span style={pill(tint(s.color, 0.14), s.color, { fontSize: 10 })}>{s.sectionLabel}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>{s.blurb}</div>
                <div style={R({ gap: 10 })}>
                  <div style={{ flex: 1 }}><Bar pct={s.mastery * 100} color={s.color} h={4} /></div>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, whiteSpace: 'nowrap' }}>
                    {s.correct}/{s.attempts} · ~{(s.examShare * 98).toFixed(1)} per exam
                  </span>
                </div>
                <button
                  onClick={() => onNavigate?.('practice', { skill: s.skill })}
                  style={{ ...btnG({ padding: '6px 12px', fontSize: 11.5 }), marginTop: 10 }}
                >
                  Drill this <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>

          {strongest.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Already solid
              </div>
              <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>
                {strongest.map(s => s.label).join(' · ')} — spend less time here.
              </div>
            </div>
          )}

          <div style={{ ...R({ gap: 10, flexWrap: 'wrap' }), marginTop: 20 }}>
            <button onClick={() => onNavigate?.('practice')} style={btn(`linear-gradient(135deg,${accent},${C.blue})`)}>
              Start practising <ChevronRight size={14} />
            </button>
            <button onClick={() => onNavigate?.('overview')} style={btnG()}>See your overview</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Intro ──
  const last = previous[0];
  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        icon={Compass} color={accent} color2={C.blue}
        eyebrow="Diagnostic" title="Find out where you actually stand"
        sub="About 30 questions spread across all 28 tested skills. It will not give you a score — it gives you a map of which skills are costing you points, so the rest of your prep is aimed instead of scattered."
        stats={[
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

      <div style={glass({ padding: isMobile ? 18 : 24 })}>
        <SectionTitle icon={Clock} color={accent}>What to expect</SectionTitle>
        <div style={CC({ gap: 12 })}>
          {[
            ['Untimed, with explanations', 'You see why each answer is right immediately. This is a measurement, not a race.'],
            ['Deliberately broad', 'One or two questions per skill. Wide coverage beats depth when the goal is to find your gaps.'],
            ['Mixed difficulty', 'Easy, medium and hard items, so the result discriminates across the whole range.'],
            ['You can stop and resume', 'Progress is saved as you answer.'],
          ].map(([t, b]) => (
            <div key={t} style={R({ gap: 12, alignItems: 'flex-start' })}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, marginTop: 7, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{t}</div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 2 }}>{b}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={begin} style={btn(`linear-gradient(135deg,${accent},${C.blue})`, { marginTop: 20 })}>
          {last ? <><RotateCcw size={14} /> Retake diagnostic</> : <>Start the diagnostic <ChevronRight size={14} /></>}
        </button>
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 12, lineHeight: 1.6 }}>{SCORE_DISCLAIMER}</div>
      </div>
    </div>
  );
}
