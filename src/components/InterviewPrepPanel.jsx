import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, Shuffle, Send, RefreshCw, Sparkles, ListFilter, Info, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { C, glass, glass2, btn, btnG, btnSm, inp, lbl, R, CC, pill, tint } from '../lib/theme';
import PanelHero from './ui/PanelHero';
import { getQuestionSet, getTips, INTERVIEW_QUESTIONS } from '../data/interviewQuestions';
import { MMI_STATIONS, CASPER_SCENARIOS, getMmiStation, getCasperScenario } from '../data/mmiCasperQuestions';
import LiveVoiceInterview from './LiveVoiceInterview';
import InterviewHistoryPanel from './InterviewHistoryPanel';
import { parseInterviewScore } from '../lib/interviewScore';
import * as DB from '../lib/db';

// Shared tail on all three feedback prompts. Interview practice had the same problem the essay
// workspace did: every answer came back "great use of a specific example!" with an 8/10 attached,
// including the answers that were three vague sentences long. A score that never moves teaches
// nothing, so the calibration is stated explicitly rather than left to the model's instincts.
const HONEST_FEEDBACK_RULE = ' You are a demanding mentor, not a cheerleader: do not open with praise, do not manufacture a compliment, and score honestly against what a real interviewer expects — a vague answer with no specific example is a 3-4 no matter how sincere it sounds, 5-6 is a competent answer with one real example, and 8+ is reserved for an answer that would genuinely stand out in a room of applicants. Be blunt about the work and never unkind about the person; every criticism carries its fix. No markdown headers, plain sentences.';

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
      let system, questionText;
      if (mode === 'standard') {
        questionText = stdQuestion;
        system = `You are Medabrain's Interview Coach, helping a high school student (grades 9-12) practice for college admissions and scholarship/program interviews — not medical, graduate, or professional-school interviews (never reference the MMI, CASPer, or clinical vignettes). Pathway: ${pathLabel}. Question: "${questionText}". Student's answer: "${answer}". Open with the biggest weakness in this specific answer, named plainly and quoting their own words — vagueness, no concrete example, a story with no result, rambling, or answering a different question than the one asked. Then ONE concrete fix. Only mention something they did well if it is genuinely there and you can point at it. End with "Score: X/10".${HONEST_FEEDBACK_RULE} Under 130 words.`;
      } else if (mode === 'mmi') {
        questionText = mmiStation.prompt;
        system = `You are Medabrain's Interview Coach, previewing the MMI (Multiple Mini Interview) format for a high school student who is years away from actually applying anywhere that uses it — this is a low-stakes preview of the FORMAT (ethical/interpersonal reasoning under time pressure), not exam prep. Scenario: "${questionText}". Student's response: "${answer}". Say first what their reasoning actually missed — a perspective they never considered, a stakeholder they ignored, a position asserted with no reasoning under it — quoting their words. Then ONE concrete fix. End with "Score: X/10". Never suggest this is something they need to master now — frame it as an interesting skill to practice.${HONEST_FEEDBACK_RULE} Under 130 words.`;
      } else {
        questionText = `${casperScenario.scenario} — ${casperScenario.probes.join(' ')}`;
        system = `You are Medabrain's Interview Coach, previewing the CASPer situational-judgment-test format for a high school student who is years away from actually taking it — this is a low-stakes preview, not exam prep. Scenario: "${casperScenario.scenario}" Probe questions: ${casperScenario.probes.map((p,i)=>`(${i+1}) ${p}`).join(' ')} Student's response: "${answer}". Say first what their judgment actually missed — a probe they never answered, an assumption they made without noticing, a lack of self-awareness — quoting their words. Then ONE concrete fix. End with "Score: X/10". Never suggest this is something they need to master now.${HONEST_FEEDBACK_RULE} Under 130 words.`;
      }
      const r = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, message: answer, maxTokens: 220, purpose: 'interview' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
      setFeedback(d.content || '');
      const next = sessions + 1;
      setSessions(next);
      const score = parseInterviewScore(d.content);
      DB.addInterviewSession({ mode, pathwayKey: setKey, question: questionText.slice(0, 300), score }).catch(() => {});
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
        sub={`Practice real college-admissions-style questions with instant, encouraging feedback — ${Object.values(INTERVIEW_QUESTIONS).reduce((n, a) => n + a.length, 0)}+ curated prompts across every pathway, plus live voice interviews and MMI/CASPer format previews.`}
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
          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{mode === 'mmi' ? 'MMI (Multiple Mini Interview)' : 'CASPer'} is a format some health-professional programs use — years from now, not something you need for college admissions. This is just a fun, low-stakes preview of the format: ethical judgment and communication scenarios, not clinical knowledge.</span>
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
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ ...glass({ padding: 20 }), background: `linear-gradient(135deg,${C.greenDim},${C.blueDim})`, border: `1px solid ${C.green}20` }}>
            <div style={R({ gap: 8, marginBottom: 10 })}><Sparkles size={15} color={C.green} /><span style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '.06em' }}>Coach Feedback</span></div>
            <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{feedback}</div>
          </motion.div>
        )}
      </AnimatePresence>
      </>)}
    </div>
  );
}
