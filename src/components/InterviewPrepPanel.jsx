import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, Shuffle, Send, RefreshCw, Sparkles, ListFilter, Info, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { C, glass, glass2, btn, btnG, btnSm, inp, lbl, R, CC, pill, tint } from '../lib/theme';
import PanelHero from './ui/PanelHero';
import { getQuestionSet, getTips, INTERVIEW_QUESTIONS } from '../data/interviewQuestions';
import { MMI_STATIONS, CASPER_SCENARIOS, getMmiStation, getCasperScenario } from '../data/mmiCasperQuestions';
import LiveVoiceInterview, { CompetencyGrid } from './LiveVoiceInterview';
import InterviewHistoryPanel from './InterviewHistoryPanel';
import { calibrateFeedback, buildRubricPrompt, SCALE_MAX } from '../lib/interviewScore';
import { getStationType } from '../lib/interviewPanel';
import * as DB from '../lib/db';

// Feedback prompts for the three written practice modes. The rubric itself — the seven-point MMI
// scale, the AAMC competencies, the band definitions — lives in lib/interviewScore.js and is built
// by buildRubricPrompt() so the instruction the model gets and the scorer that checks its work can
// never drift apart. And because prompt text alone does not hold a score down, whatever number
// comes back is capped by the deterministic rubric before the student ever sees it.
//
// The calibration is the real change here: 5 out of 7 is the modal score in a real MMI and it means
// competent, fluent and forgettable. Most students land on 4 or 5, and that has to read as normal.

const PATHWAY_LABELS = {
  general: 'General Admissions', exploring: 'Exploring Pre-Health', physician: 'Physician (MD/DO)',
  nursing: 'Nursing', physicianAssistant: 'Physician Assistant', pharmacy: 'Pharmacy', dentistry: 'Dentistry',
  biomedResearch: 'Biomedical Research', physicalOccupTherapy: 'PT/OT', publicHealth: 'Public Health',
  healthAdmin: 'Health Administration',
};

const MODES = [
  { id: 'live', label: '🎙 Live Voice Interview', color: C.rose },
  { id: 'standard', label: 'Standard', color: C.blue },
  { id: 'mmi', label: 'MMI Practice', color: C.violet },
  { id: 'casper', label: 'CASPer Practice', color: C.cyan },
  { id: 'history', label: '📊 History', color: C.green },
];

function randomIdx(len, exclude = -1) {
  if (len <= 1) return 0;
  let i = exclude;
  while (i === exclude) i = Math.floor(Math.random() * len);
  return i;
}

// A function, not a literal map: a module-level object would freeze the palette at import time
// and never follow a theme switch (see theme.js's header note).
function toneColor(tone) {
  if (tone === 'good') return { main: C.green, dim: C.greenDim };
  if (tone === 'mid') return { main: C.amberL, dim: C.amberDim };
  if (tone === 'bad') return { main: C.roseL, dim: C.roseDim };
  return { main: C.t3, dim: 'transparent' };
}

export default function InterviewPrepPanel({ accent = C.blue, pathway, pathwayKey = 'exploring', studentName, onSessionComplete }) {
  const [mode, setMode] = useState('live');
  const [setKey, setSetKey] = useState(pathwayKey);
  const questions = useMemo(() => getQuestionSet(setKey), [setKey]);
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState(0);

  const stdQuestion = questions[qIdx] || questions[0];
  const mmiStation = useMemo(() => getMmiStation(qIdx), [qIdx, mode]);
  const casperScenario = useMemo(() => getCasperScenario(qIdx), [qIdx, mode]);
  const poolLen = mode === 'mmi' ? MMI_STATIONS.length : mode === 'casper' ? CASPER_SCENARIOS.length : questions.length;

  function switchMode(m) {
    setMode(m);
    setQIdx(0);
    setAnswer('');
    setFeedback(null);
  }

  function shuffle() {
    setQIdx(i => randomIdx(poolLen, i));
    setAnswer('');
    setFeedback(null);
  }

  function step(dir) {
    setQIdx(i => (i + dir + poolLen) % poolLen);
    setAnswer('');
    setFeedback(null);
  }

  const modeColor = MODES.find(m => m.id === mode)?.color || accent;
  const tips = useMemo(() => getTips(mode === 'standard' ? setKey : mode), [mode, setKey]);
  const tip = tips[qIdx % tips.length];

  function switchSet(key) {
    setSetKey(key);
    setQIdx(0);
    setAnswer('');
    setFeedback(null);
  }

  async function getFeedback() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      const pathLabel = PATHWAY_LABELS[setKey] || pathway?.label || 'General Admissions';
      // Which station this is decides two things at once: which AAMC competencies are in scope (a
      // station that never probed teamwork does not get a teamwork score) and which band
      // definitions the model is handed. Standard questions are not MMI stations, so they are
      // typed as such rather than being graded against an ethics rubric they never invoked.
      let stationKey, questionText, framing;
      if (mode === 'standard') {
        stationKey = 'standard';
        questionText = stdQuestion;
        framing = `You are rating one practice answer from a high school student (grades 9-12) preparing for college admissions and scholarship interviews — not medical, graduate, or professional-school interviews (never reference the MMI, CASPer, or clinical vignettes). Pathway: ${pathLabel}. Question: "${questionText}". Student's answer: "${answer}".`;
      } else if (mode === 'mmi') {
        stationKey = mmiStation.station || 'ethical';
        questionText = mmiStation.prompt;
        framing = `You are rating one MMI (Multiple Mini Interview) station for a high school student who is years away from applying anywhere that uses this format — a low-stakes preview of the FORMAT, not exam prep. Never suggest this is something they need to master now. Station: "${questionText}". Student's response: "${answer}".`;
      } else {
        stationKey = casperScenario.station || 'ethical';
        questionText = `${casperScenario.scenario} — ${casperScenario.probes.join(' ')}`;
        framing = `You are rating one CASPer-style situational-judgment response from a high school student who is years away from taking it — a low-stakes preview, not exam prep. Never suggest this is something they need to master now. Scenario: "${casperScenario.scenario}" Probe questions: ${casperScenario.probes.map((p, i) => `(${i + 1}) ${p}`).join(' ')} Student's response: "${answer}". A probe they never answered is itself a finding.`;
      }
      const station = getStationType(stationKey);
      const system = `${framing}\n\n${buildRubricPrompt({ stationKey, hasActor: station.hasActor })}\n\nThey are a teenager: be blunt about the work and never unkind about the person, and make every criticism carry its fix.`;

      const r = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, message: answer, maxTokens: 260, purpose: 'interview' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
      // The model proposes a score; the deterministic rubric caps it. See lib/interviewScore.js
      // for why the raw number is never shown as-is.
      const graded = calibrateFeedback(d.content || '', answer, {
        stationKey,
        prompt: questionText,
        stationCount: 1,
      });
      setFeedback(graded);
      const next = sessions + 1;
      setSessions(next);
      DB.addInterviewSession({ mode, pathwayKey: setKey, question: questionText.slice(0, 300), score: graded.score, scale: SCALE_MAX }).catch(() => {});
      onSessionComplete?.(mode);
    } catch (e) {
      toast.error(e.message?.slice(0, 100) || 'Could not get feedback right now.');
    }
    setLoading(false);
  }

  return (
    <div style={CC({ gap: 22 })}>
      <PanelHero tourTag="portfolio-deep-interview" icon={Mic} color={accent} color2={C.rose}
        eyebrow="Interview Prep" title="Mock Interview Practice"
        sub={`Practice real college-admissions-style questions and get rated the way an actual interviewer would rate you — seven-point scale, no flattery — across ${Object.values(INTERVIEW_QUESTIONS).reduce((n, a) => n + a.length, 0)}+ curated prompts, live voice interviews, and MMI/CASPer format previews.`}
        stats={sessions > 0 ? [{ value: sessions, label: 'practiced this session', color: C.roseL }] : []}/>

      <div style={R({ gap: 6, flexWrap: 'wrap' })}>
        {MODES.map(m => (
          <motion.button key={m.id} whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: .96 }}
            style={btnSm(mode === m.id ? m.color : C.s4, { color: mode === m.id ? '#fff' : C.t2, border: mode === m.id ? 'none' : `1px solid ${C.b1}`, boxShadow: mode === m.id ? `0 4px 14px ${m.color}45` : 'none' })}
            onClick={() => switchMode(m.id)}>{m.label}</motion.button>
        ))}
      </div>

      {mode === 'live' && (
        <LiveVoiceInterview
          accent={accent}
          pathwayLabel={PATHWAY_LABELS[setKey] || pathway?.label || 'General Admissions'}
          studentName={studentName}
          onSessionComplete={onSessionComplete}
        />
      )}

      {mode === 'history' && <InterviewHistoryPanel accent={accent} />}

      {(mode === 'mmi' || mode === 'casper') && (
        <div style={{ ...glass2({ padding: 14 }), display: 'flex', gap: 10, alignItems: 'flex-start', background: C.violetDim, border: `1px solid ${C.violet}25` }}>
          <Info size={14} color={C.violetL} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{mode === 'mmi' ? 'MMI (Multiple Mini Interview)' : 'CASPer'} is a format some health-professional programs use — years from now, not something you need for college admissions. This is a low-stakes preview of the format: ethical judgment and communication scenarios, not clinical knowledge. Answers are rated on the real seven-point station scale, where <strong style={{ color: C.t1 }}>5 is the most common score</strong> and means competent, fluent and forgettable — a 4 or 5 here is the normal result, not a bad one.</span>
        </div>
      )}

      {mode !== 'live' && mode !== 'history' && (<>
      <div style={glass()}>
        {mode === 'standard' && (
          <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 })}>
            <div style={R({ gap: 6 })}><ListFilter size={13} color={C.t3} /><span style={lbl({ margin: 0 })}>Question Set</span></div>
            <div style={R({ gap: 6, flexWrap: 'wrap' })}>
              {Object.keys(INTERVIEW_QUESTIONS).map(k => (
                <motion.button key={k} whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
                  style={btnSm(setKey === k ? accent : C.s4, { color: setKey === k ? '#fff' : C.t2, border: setKey === k ? 'none' : `1px solid ${C.b1}` })}
                  onClick={() => switchSet(k)}>{PATHWAY_LABELS[k] || k}</motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={qIdx + setKey + mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={glass2({ padding: 18, marginBottom: 14 })}>
            <div style={R({ gap: 8, marginBottom: 8, justifyContent: 'space-between' })}>
              <div style={R({ gap: 8 })}><Mic size={14} color={modeColor} /><span style={{ fontSize: 11, fontWeight: 700, color: modeColor, textTransform: 'uppercase', letterSpacing: '.06em' }}>{mode === 'casper' ? 'Scenario' : 'Question'}</span></div>
              <span style={pill(`${modeColor}18`, modeColor, { fontSize: 10, fontFamily: C.FM })}>{qIdx + 1} / {poolLen}</span>
            </div>
            {mode === 'standard' && <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, fontFamily: C.FD, lineHeight: 1.5 }}>{stdQuestion}</div>}
            {mode === 'mmi' && <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, fontFamily: C.FD, lineHeight: 1.5 }}>{mmiStation.prompt}</div>}
            {mode === 'casper' && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, fontFamily: C.FD, lineHeight: 1.5, marginBottom: 10 }}>{casperScenario.scenario}</div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {casperScenario.probes.map((p, i) => <li key={i} style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{p}</li>)}
                </ol>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={R({ gap: 8, marginBottom: 14, flexWrap: 'wrap' })}>
          <button style={{ ...btnG({ fontSize: 12 }), display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => step(-1)}><ChevronLeft size={14} />Prev</button>
          <button style={{ ...btnG({ fontSize: 12 }), display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => step(1)}>Next<ChevronRight size={14} /></button>
          <button style={{ ...btnG({ fontSize: 12, borderColor: `${modeColor}40`, color: modeColor }), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={shuffle}><Shuffle size={13} />Shuffle</button>
        </div>

        {/* Rotating coaching tip for this interview type */}
        <div style={{ ...glass2({ padding: 12, marginBottom: 14 }), display: 'flex', gap: 9, alignItems: 'flex-start', background: `linear-gradient(135deg, ${C.amberDim}, transparent)`, border: `1px solid ${C.amber}22` }}>
          <Lightbulb size={14} color={C.amberL} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}><strong style={{ color: C.amberL }}>Coach tip:</strong> {tip}</span>
        </div>

        <textarea
          style={{ ...inp({ minHeight: 130, resize: 'vertical', fontFamily: C.FB, lineHeight: 1.6 }) }}
          placeholder={mode === 'casper' ? "Address the questions above — speak it out loud first if that helps, then write down what you'd actually say..." : "Type your answer here — speak it out loud first if that helps, then write down what you'd actually say..."}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
        />

        <div style={R({ gap: 10, marginTop: 14 })}>
          <button style={{ ...btn(modeColor, { fontSize: 13 }), display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading || !answer.trim() ? 0.6 : 1, boxShadow: `0 4px 16px ${modeColor}40` }} disabled={loading || !answer.trim()} onClick={getFeedback}>
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            {loading ? 'Getting feedback…' : 'Get Feedback'}
          </button>
          {sessions > 0 && <span style={pill(C.violetDim, C.violetL, { fontSize: 10, fontFamily: C.FM })}>{sessions} answer{sessions !== 1 ? 's' : ''} practiced this session</span>}
        </div>
      </div>

      <AnimatePresence>
        {feedback && (() => {
          // Deliberately not a congratulations panel. It leads with the number and the rater's own
          // anchor ("Satisfactory — and forgettable" is the modal result, and it has to read as the
          // normal outcome rather than as failure), then the competencies this station could
          // actually assess, then the specific reasons — the part a student can act on — and it
          // always ends on the reliability caveat, because a verdict from one station would be a
          // lie about how the format works.
          const t = toneColor(feedback.band.tone);
          return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg, ${t.dim}, transparent)`, border: `1px solid ${t.main}30` }}>
              <div style={R({ gap: 8, marginBottom: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                <div style={R({ gap: 8 })}><Sparkles size={15} color={t.main} /><span style={{ fontSize: 12, fontWeight: 700, color: t.main, textTransform: 'uppercase', letterSpacing: '.06em' }}>Rater Feedback</span></div>
                <div style={R({ gap: 8 })}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: t.main, fontFamily: C.FD }}>{feedback.score}<span style={{ fontSize: 13, color: C.t3 }}>/{feedback.scale}</span></span>
                  <span style={pill(`${t.main}18`, t.main, { fontSize: 10.5 })}>{feedback.anchor.label}</span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 12, lineHeight: 1.55 }}>{feedback.anchor.blurb}</div>
              <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{feedback.text}</div>
              <CompetencyGrid competencies={feedback.competencies} max={feedback.scale} />
              {feedback.reasons.length > 0 && (
                <div style={{ ...glass2({ padding: 14, marginTop: 14 }), background: C.s2 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 8 }}>What held this answer back</div>
                  <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {feedback.reasons.map((r, i) => <li key={i} style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{r}</li>)}
                  </ul>
                </div>
              )}
              {feedback.strengths.length > 0 && (
                <div style={{ ...glass2({ padding: 14, marginTop: 10 }), background: C.s2 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 8 }}>What actually worked</div>
                  <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {feedback.strengths.map((r, i) => <li key={i} style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{r}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ fontSize: 11.5, color: C.t3, marginTop: 14, lineHeight: 1.6, fontStyle: 'italic' }}>{feedback.caveat}</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      </>)}
    </div>
  );
}
