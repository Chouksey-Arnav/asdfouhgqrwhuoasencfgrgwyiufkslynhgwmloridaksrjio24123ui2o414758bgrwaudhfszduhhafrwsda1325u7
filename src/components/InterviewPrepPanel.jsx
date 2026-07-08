import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, Shuffle, Send, RefreshCw, Sparkles, ListFilter } from 'lucide-react';
import { C, glass, glass2, btn, btnG, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import { getQuestionSet, INTERVIEW_QUESTIONS } from '../data/interviewQuestions';

const PATHWAY_LABELS = {
  general: 'General Admissions', undecided: 'Exploring / Undecided', stem: 'STEM & Engineering',
  humanities: 'Humanities & Writing', business: 'Business & Economics', socialSci: 'Social Sciences', preHealth: 'Pre-Health',
};

function randomIdx(len, exclude = -1) {
  if (len <= 1) return 0;
  let i = exclude;
  while (i === exclude) i = Math.floor(Math.random() * len);
  return i;
}

export default function InterviewPrepPanel({ accent = C.blue, pathway, pathwayKey = 'undecided', onSessionComplete }) {
  const [setKey, setSetKey] = useState(pathwayKey);
  const questions = useMemo(() => getQuestionSet(setKey), [setKey]);
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState(0);

  const question = questions[qIdx] || questions[0];

  function shuffle() {
    setQIdx(i => randomIdx(questions.length, i));
    setAnswer('');
    setFeedback(null);
  }

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
      const system = `You are Metabrain's Interview Coach, helping a high school student (grades 9-12) practice for college admissions and scholarship/program interviews — not medical, graduate, or professional-school interviews (never reference the MMI, CASPer, or clinical vignettes). Pathway: ${pathLabel}. Question: "${question}". Student's answer: "${answer}". Give 2-3 sentences of specific, encouraging feedback (did they answer with a concrete example? how's the structure — Situation/Task/Action/Result?), then ONE concrete tip to strengthen it, then end with "Score: X/10". Warm and constructive — this is a teenager building confidence. Under 120 words.`;
      const r = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, message: answer, maxTokens: 220, tier: 'fast' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
      setFeedback(d.content || '');
      const next = sessions + 1;
      setSessions(next);
      onSessionComplete?.();
    } catch (e) {
      toast.error(e.message?.slice(0, 100) || 'Could not get feedback right now.');
    }
    setLoading(false);
  }

  return (
    <div style={CC({ gap: 22 })}>
      <div>
        <div style={lbl()}>Interview Prep</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: 0 }}>Mock Interview Practice</h2>
        <p style={{ fontSize: 13, color: C.t3, marginTop: 6, lineHeight: 1.6 }}>Practice answering real college-admissions-style questions and get instant, encouraging feedback. Not medical or graduate school prep — just building your confidence for the interviews you'll actually have.</p>
      </div>

      <div style={glass()}>
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

        <AnimatePresence mode="wait">
          <motion.div key={qIdx + setKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={glass2({ padding: 18, marginBottom: 14 })}>
            <div style={R({ gap: 8, marginBottom: 8 })}><Mic size={14} color={accent} /><span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.06em' }}>Question</span></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, fontFamily: C.FD, lineHeight: 1.5 }}>{question}</div>
          </motion.div>
        </AnimatePresence>

        <button style={{ ...btnG({ fontSize: 12, marginBottom: 14 }), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={shuffle}><Shuffle size={13} />Shuffle Question</button>

        <textarea
          style={{ ...inp({ minHeight: 130, resize: 'vertical', fontFamily: C.FB, lineHeight: 1.6 }) }}
          placeholder="Type your answer here — speak it out loud first if that helps, then write down what you'd actually say..."
          value={answer}
          onChange={e => setAnswer(e.target.value)}
        />

        <div style={R({ gap: 10, marginTop: 14 })}>
          <button style={{ ...btn(accent !== C.blue ? accent : C.blueGrad, { fontSize: 13 }), display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading || !answer.trim() ? 0.6 : 1 }} disabled={loading || !answer.trim()} onClick={getFeedback}>
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
    </div>
  );
}
