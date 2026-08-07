// Live Voice Interview — a spoken, back-and-forth mock interview. The AI interviewer (a dedicated
// Groq key pool, purpose:'interview') asks one question at a time, listens to the student's spoken
// (or typed) answer, reacts warmly, adapts a follow-up, and at the end delivers a structured,
// encouraging debrief. The interviewer's lines are spoken aloud via the Web Speech API in a warm,
// unhurried voice (see src/lib/speech.js); the student answers with their mic (speech-to-text) or,
// where that isn't supported, by typing — the experience works either way.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, MicOff, Square, Play, Volume2, VolumeX, Send, Loader2, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, pill } from '../lib/theme';
import * as speech from '../lib/speech';
import * as DB from '../lib/db';
import { parseInterviewScore } from '../lib/interviewScore';
import VoiceSelector from './VoiceSelector';

// A rotating pool of focus areas the interviewer can draw on — passed as *inspiration*, with an
// explicit instruction to craft its own fresh questions and never repeat, so no two sessions feel
// the same. Not read to the student verbatim.
const FOCUS_AREAS = [
  'why this field / what drew them to it', 'a challenge they overcame', 'a time they helped someone',
  'a leadership or initiative moment', 'a failure and what they learned', 'how they handle stress or setbacks',
  'a meaningful activity outside class', 'curiosity — something they love learning about', 'teamwork and conflict',
  'their strengths and a genuine growth area', 'a community or volunteering experience', 'what integrity means to them',
  'balancing commitments', 'a role model and why', 'where they see themselves growing in college',
];

function pickFocus(n = 6) {
  const shuffled = [...FOCUS_AREAS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Interviewer-style presets, chosen by the student on the idle screen before starting — lets the
// same simulator serve "I just want a gentle confidence-building round" and "push me, I want a
// real stress-test" without needing separate modes. Purely a tone instruction folded into the
// system prompt (buildInterviewerPrompt) — the age-appropriateness rules and one-question-at-a-
// time flow are identical across all three; only how much the interviewer pushes back changes.
export const INTERVIEW_STYLES = [
  { id: 'warm', label: 'Warm & Encouraging', desc: 'Gentle and supportive — ideal for a first practice round.' },
  { id: 'balanced', label: 'Balanced & Realistic', desc: 'Professional and fair, like a real admissions interviewer.' },
  { id: 'rigorous', label: 'Rigorous & Challenging', desc: 'Pushes harder with tougher follow-ups — a real stress-test.' },
];
const STYLE_TONE = {
  // Note: this only softens the interviewer's manner DURING the session, which is a legitimate
  // choice for a nervous student's first attempt. It does not soften the debrief — that is scored
  // by DEBRIEF_INSTRUCTION below at the same honest bar regardless of the style chosen, because a
  // gentle practice round that ends in a fake 8/10 is worse than no practice round.
  warm: 'TONE FOR THIS SESSION: Be warm, gentle and patient in manner — this is a confidence-building session, so acknowledge each answer kindly and let a short answer pass with one gentle nudge rather than repeated pressure. Kind delivery only: never tell them an answer was strong when it was thin, and never praise something they did not actually do.',
  balanced: 'TONE FOR THIS SESSION: Be professional, courteous, and realistic — like an actual, fair college admissions interviewer. Warm but measured, not gushing; acknowledge genuinely without over-praising.',
  rigorous: 'TONE FOR THIS SESSION: Be a rigorous, higher-expectations interviewer. Press harder with pointed, specific follow-ups whenever an answer is vague, generic, or thin ("What did YOU specifically do, step by step?"), and hold a real bar for depth and evidence before moving on. Still respectful and never unkind — a teenager should feel challenged, never attacked — but do not let a weak answer slide unchallenged the way a warmer session would.',
};

// The interviewer persona + rules of engagement. Deliberately detailed: it defines who is being
// interviewed (a 14–18-year-old, college-admissions context — NOT med/grad school), the tone, the
// one-question-at-a-time cadence, how to acknowledge and adapt, hard age-appropriateness limits,
// and the fact that its lines are spoken aloud (so: no markdown, no lists, natural spoken phrasing).
function buildInterviewerPrompt({ pathwayLabel, studentName, focus, sessionSeed, style }) {
  return `You are "Medabrain," a warm, experienced college-admissions and scholarship interviewer conducting a LIVE practice interview with a high-school student${studentName ? ` named ${studentName}` : ''} (roughly 14–18 years old). Their long-term interest area is: ${pathwayLabel}. This is undergraduate-admissions and scholarship interview practice — NEVER treat it as medical school, graduate school, residency, MMI, or CASPer; never use clinical vignettes or ask about topics a teenager wouldn't have lived yet.

YOUR JOB, TURN BY TURN:
- Speak the way a kind human interviewer speaks out loud. Your entire reply is read aloud by a text-to-speech voice, so: NO markdown, NO bullet points, NO headings, NO stage directions, NO emojis. Just natural spoken sentences.
- Ask exactly ONE question per turn. Keep each turn short — 2 to 4 sentences total.
- On every turn after the first: briefly and specifically acknowledge what they just said (one warm sentence that shows you actually listened and references a detail), then ask your next question.
- Adapt. If an answer was vague or short, ask a gentle, specific follow-up ("Can you walk me through what you actually did?") instead of moving on. If it was strong, dig one layer deeper or move to a new area.
- Vary your questions across the interview so it feels like a real conversation, drawing on areas like: ${focus.join('; ')}. Invent your own fresh, well-crafted questions — do not read a list, and never ask something you've already asked. (Session variety token: ${sessionSeed}.)
- Never be cold, tricky, or interrogating — this is a teenager practicing, not an adversarial exam.

${STYLE_TONE[style] || STYLE_TONE.warm}

FLOW:
- Your FIRST turn: warmly greet them by name if you know it, put them at ease in one sentence, and ask ONE welcoming opening question (e.g. something inviting them to introduce themselves or share what excites them). Nothing else.
- Continue the back-and-forth for the rest of the interview, one question at a time.
- Do NOT give feedback, scores, or a summary during the interview — that comes only at the end when you're explicitly asked to debrief.`;
}

// The debrief is a separate call with its own instruction so the model shifts cleanly from
// "interviewer" to "coach." Structured but still spoken-friendly and kind.
const DEBRIEF_INSTRUCTION = `The interview is over. Step out of the interviewer role and give the student an honest debrief as their coach — the one they cannot get from a friend or a parent. Cover, in flowing spoken paragraphs (this is read aloud — no markdown or bullet symbols): (1) the single biggest weakness across their answers, named plainly and quoting what they actually said, opening with it rather than warming up to it; (2) two more concrete things to work on, each with a quick example of how; (3) anything that genuinely worked, but only if it did and only tied to a specific answer they gave — if nothing stood out, say that straight and move on rather than inventing a compliment. End with a line exactly like "Overall: X out of 10" where X is scored honestly against what a real interviewer expects: a session of vague, example-free answers is a 3-4 however sincere it sounded, 5-6 is competent, and 8 or above is reserved for a session that would stand out among real applicants. Be blunt about the work and never unkind about the person — they are a teenager, and every criticism you make must carry the fix with it. Under 240 words.`;

const MAX_QUESTIONS = 8; // soft cap; student can end sooner

export default function LiveVoiceInterview({ accent = C.blue, pathwayLabel = 'General Admissions', studentName, onSessionComplete }) {
  const [phase, setPhase] = useState('idle');       // idle | active | debrief | done
  const [turns, setTurns] = useState([]);            // { role:'interviewer'|'student', text }
  const [loading, setLoading] = useState(false);     // waiting on the model
  const [speaking, setSpeaking] = useState(false);   // interviewer voice is talking
  const [listening, setListening] = useState(false); // mic is capturing
  const [draft, setDraft] = useState('');            // current answer (typed or dictated)
  const [muted, setMuted] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [style, setStyle] = useState('warm');         // 'warm' | 'balanced' | 'rigorous' — picked on the idle screen
  const [chosenFocus, setChosenFocus] = useState([]);  // areas explicitly picked on the idle screen; empty = let the interviewer pick at random
  const [interviewerVoice, setInterviewerVoice] = useState(null); // SpeechSynthesisVoice — picked via VoiceSelector, defaults to pickInterviewerVoice()

  const sessionRef = useRef({ system: '', history: [] }); // history in OpenAI role format for the API
  const recognizerRef = useRef(null);
  const cancelSpeakRef = useRef(() => {});
  const scrollRef = useRef(null);
  const mutedRef = useRef(muted);
  const voiceRef = useRef(null);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { voiceRef.current = interviewerVoice; }, [interviewerVoice]);

  const ttsSupported = speech.isTTSSupported();
  const sttSupported = speech.isSTTSupported();

  // Warm up the voice list early so the first line isn't silent while voices load.
  useEffect(() => { if (ttsSupported) speech.loadVoices(); }, [ttsSupported]);

  // Clean up any in-flight speech/recognition on unmount.
  useEffect(() => () => { cancelSpeakRef.current?.(); recognizerRef.current?.abort?.(); speech.cancelSpeech(); }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [turns, debrief, loading]);

  const speakLine = useCallback((text) => {
    if (!ttsSupported || mutedRef.current) return;
    setSpeaking(true);
    cancelSpeakRef.current = speech.speak(text, {
      voice: voiceRef.current,
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [ttsSupported]);

  // One round-trip to the interviewer model. `extraUser` lets the debrief call append its
  // instruction as the final user turn without polluting the visible transcript.
  async function askInterviewer({ extraUser, maxTokens = 200 } = {}) {
    const messages = [...sessionRef.current.history];
    if (extraUser) messages.push({ role: 'user', content: extraUser });
    const r = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: sessionRef.current.system, messages, maxTokens, purpose: 'interview' }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
    return (d.content || '').trim();
  }

  async function startInterview() {
    if (loading) return;
    setLoading(true);
    setTurns([]); setDebrief(null); setQuestionCount(0);
    // Honor exactly what the student picked on the idle screen; if they left it on "surprise me"
    // (nothing selected), fall back to a random spread like before.
    const focus = chosenFocus.length ? chosenFocus : pickFocus();
    const sessionSeed = Math.random().toString(36).slice(2, 8);
    sessionRef.current = {
      system: buildInterviewerPrompt({ pathwayLabel, studentName, focus, sessionSeed, style }),
      history: [],
    };
    try {
      // Seed with a neutral user turn so the model produces its opening greeting + first question.
      sessionRef.current.history.push({ role: 'user', content: "I'm ready to start the interview. Please begin." });
      const opening = await askInterviewer({ maxTokens: 180 });
      sessionRef.current.history.push({ role: 'assistant', content: opening });
      setTurns([{ role: 'interviewer', text: opening }]);
      setQuestionCount(1);
      setPhase('active');
      speakLine(opening);
    } catch (e) {
      toast.error(e.message?.slice(0, 100) || 'Could not start the interview.');
    }
    setLoading(false);
  }

  function toggleListening() {
    if (!sttSupported) return;
    if (listening) { recognizerRef.current?.stop(); return; }
    // Don't talk over the interviewer.
    cancelSpeakRef.current?.(); speech.cancelSpeech(); setSpeaking(false);
    const rec = speech.createRecognizer({
      onResult: (transcript) => setDraft(transcript),
      onEnd: () => setListening(false),
      onError: (e) => { setListening(false); if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Mic issue — you can type your answer instead.'); },
    });
    if (!rec) return;
    recognizerRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submitAnswer() {
    const answer = draft.trim();
    if (!answer || loading) return;
    recognizerRef.current?.stop(); setListening(false);
    cancelSpeakRef.current?.(); speech.cancelSpeech(); setSpeaking(false);
    setDraft('');
    setTurns(t => [...t, { role: 'student', text: answer }]);
    sessionRef.current.history.push({ role: 'user', content: answer });
    setLoading(true);
    try {
      const reply = await askInterviewer({ maxTokens: 200 });
      sessionRef.current.history.push({ role: 'assistant', content: reply });
      setTurns(t => [...t, { role: 'interviewer', text: reply }]);
      setQuestionCount(c => c + 1);
      speakLine(reply);
    } catch (e) {
      toast.error(e.message?.slice(0, 100) || 'Could not continue the interview.');
    }
    setLoading(false);
  }

  async function endAndDebrief() {
    if (loading) return;
    recognizerRef.current?.stop(); setListening(false);
    cancelSpeakRef.current?.(); speech.cancelSpeech(); setSpeaking(false);
    setLoading(true);
    setPhase('debrief');
    try {
      const summary = await askInterviewer({ extraUser: DEBRIEF_INSTRUCTION, maxTokens: 520 });
      setDebrief(summary);
      setPhase('done');
      speakLine(summary);
      const score = parseInterviewScore(summary);
      DB.addInterviewSession({ mode: 'live', pathwayKey: 'live', question: `Live voice interview · ${questionCount} questions`, score }).catch(() => {});
      onSessionComplete?.('live');
    } catch (e) {
      toast.error(e.message?.slice(0, 100) || 'Could not generate your debrief.');
      setPhase('active');
    }
    setLoading(false);
  }

  function reset() {
    cancelSpeakRef.current?.(); speech.cancelSpeech();
    recognizerRef.current?.abort?.();
    setPhase('idle'); setTurns([]); setDebrief(null); setDraft(''); setQuestionCount(0);
    setSpeaking(false); setListening(false);
  }

  // ── Idle / start screen ──────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={{ ...glass({ padding: 26 }), background: `radial-gradient(1200px 400px at 50% -10%, ${accent}18, transparent), ${C.s1}`, textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${accent}, ${C.violet})`, boxShadow: `0 12px 40px ${accent}55` }}>
          <Mic size={30} color="#fff" />
        </motion.div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em', margin: 0 }}>Live Voice Interview</h3>
        <p style={{ fontSize: 13.5, color: C.t3, lineHeight: 1.65, maxWidth: 480, margin: '10px auto 0' }}>
          A real back-and-forth with an AI interviewer that talks to you out loud, listens, and adapts its questions to your answers — then gives you a warm, honest debrief. Speak your answers with your mic{sttSupported ? '' : ' (or type them — your browser doesn’t support voice input)'}, just like the real thing.
        </p>
        <div style={R({ gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' })}>
          <span style={pill(C.s3, C.t3, { fontSize: 11 })}>{ttsSupported ? <><Volume2 size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Voice interviewer</> : 'Text interviewer'}</span>
          <span style={pill(C.s3, C.t3, { fontSize: 11 })}>{sttSupported ? <><Mic size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Answer by voice</> : <><MessageSquare size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Answer by typing</>}</span>
          <span style={pill(C.s3, C.t3, { fontSize: 11 })}>~{MAX_QUESTIONS} questions</span>
        </div>

        {/* Customize this session — voice, interviewer tone, and optional focus areas, picked
            before Start so the same simulator can be a gentle warm-up or a real stress-test on
            demand, and always sounds like a voice the student actually chose. */}
        <div style={{ ...glass2({ padding: 16, marginTop: 20, textAlign: 'left' }) }}>
          {ttsSupported && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 10 }}>Interviewer Voice</div>
              <VoiceSelector accent={accent} value={interviewerVoice} onChange={setInterviewerVoice} />
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 10 }}>Interviewer Style</div>
          <div style={R({ gap: 7, flexWrap: 'wrap', marginBottom: 16 })}>
            {INTERVIEW_STYLES.map(s => (
              <button key={s.id} title={s.desc} onClick={() => setStyle(s.id)}
                style={{ ...btnG({ fontSize: 11.5, padding: '7px 13px' }), background: style === s.id ? accent : 'transparent', color: style === s.id ? '#fff' : C.t2, border: `1px solid ${style === s.id ? accent : C.b1}` }}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 10 }}>Focus Areas <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: C.t4 }}>(optional — pick up to 4, or leave blank to let the interviewer choose)</span></div>
          <div style={R({ gap: 6, flexWrap: 'wrap' })}>
            {FOCUS_AREAS.map(area => {
              const on = chosenFocus.includes(area);
              const label = area.charAt(0).toUpperCase() + area.slice(1);
              return (
                <button key={area} onClick={() => setChosenFocus(cur => on ? cur.filter(a => a !== area) : cur.length >= 4 ? cur : [...cur, area])}
                  style={{ ...pill(on ? `${accent}22` : 'rgba(255,255,255,0.03)', on ? accent : C.t3, { fontSize: 10.5 }), cursor: 'pointer', border: `1px solid ${on ? `${accent}55` : C.b1}` }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button style={{ ...btn(accent, { fontSize: 14, marginTop: 20, padding: '12px 26px' }), display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={startInterview} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
          {loading ? 'Starting…' : 'Start the interview'}
        </button>
        {!ttsSupported && <p style={{ fontSize: 11, color: C.t4, marginTop: 12 }}>Heads up: your browser can’t play the interviewer’s voice, so its questions will appear as text.</p>}
      </div>
    );
  }

  // ── Active / debrief / done ────────────────────────────────────────────────
  const canSubmit = draft.trim().length > 0 && !loading && phase === 'active';
  return (
    <div style={CC({ gap: 14 })}>
      {/* Status bar */}
      <div style={{ ...R({ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }), ...glass2({ padding: 12 }) }}>
        <div style={R({ gap: 10 })}>
          <div style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${accent}, ${C.violet})`, flexShrink: 0 }}>
            <Mic size={17} color="#fff" />
            {speaking && <motion.span animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${accent}` }} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>Medabrain · Interviewer</div>
            <div style={{ fontSize: 11, color: speaking ? accent : listening ? C.green : C.t3, fontWeight: 600 }}>
              {speaking ? 'Speaking…' : listening ? 'Listening…' : loading ? 'Thinking…' : phase === 'done' ? 'Interview complete' : `Question ${questionCount}`}
            </div>
          </div>
        </div>
        <div style={R({ gap: 6 })}>
          {ttsSupported && (
            <button title={muted ? 'Unmute interviewer voice' : 'Mute interviewer voice'} onClick={() => { const m = !muted; setMuted(m); if (m) { cancelSpeakRef.current?.(); speech.cancelSpeech(); setSpeaking(false); } }}
              style={{ ...iconBtn(), color: muted ? C.rose : C.t2 }}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
          )}
          {phase !== 'done' && (
            <button onClick={endAndDebrief} disabled={loading} style={{ ...btnG({ fontSize: 12 }), display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
              <Square size={12} />End & get feedback
            </button>
          )}
          {phase === 'done' && (
            <button onClick={reset} style={{ ...btn(accent, { fontSize: 12 }), display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} />New interview</button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} style={{ ...glass({ padding: 16 }), maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {turns.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: t.role === 'student' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14,
              background: t.role === 'student' ? accent : C.s3,
              color: t.role === 'student' ? '#fff' : C.t1,
              borderBottomRightRadius: t.role === 'student' ? 4 : 14, borderBottomLeftRadius: t.role === 'student' ? 14 : 4,
              fontSize: 13.5, lineHeight: 1.6 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.65, marginBottom: 3 }}>{t.role === 'student' ? 'You' : 'Interviewer'}</div>
              {t.text}
            </div>
          </motion.div>
        ))}
        {loading && phase !== 'done' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: 14, background: C.s3, color: C.t3, fontSize: 13, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />{phase === 'debrief' ? 'Preparing your debrief…' : 'Thinking…'}
            </div>
          </div>
        )}
        {debrief && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...glass2({ padding: 18 }), background: `linear-gradient(135deg, ${C.greenDim}, ${C.blueDim})`, border: `1px solid ${C.green}25`, marginTop: 4 }}>
            <div style={R({ gap: 8, marginBottom: 10 })}><Sparkles size={15} color={C.green} /><span style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '.06em' }}>Your Debrief</span></div>
            <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{debrief}</div>
          </motion.div>
        )}
      </div>

      {/* Answer composer */}
      {phase !== 'done' && (
        <div style={glass2({ padding: 12 })}>
          <textarea
            style={{ ...composerInput(), borderColor: listening ? C.green : C.b1 }}
            placeholder={listening ? 'Listening — speak your answer…' : sttSupported ? 'Tap the mic and speak, or type your answer here…' : 'Type your answer here…'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAnswer(); }}
            disabled={loading}
          />
          <div style={R({ gap: 8, marginTop: 10, justifyContent: 'space-between', flexWrap: 'wrap' })}>
            {sttSupported ? (
              <button onClick={toggleListening} disabled={loading}
                style={{ ...btn(listening ? C.rose : C.s4, { fontSize: 12.5 }), color: listening ? '#fff' : C.t1, border: listening ? 'none' : `1px solid ${C.b1}`, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {listening ? <><MicOff size={14} />Stop & use this</> : <><Mic size={14} />Answer by voice</>}
              </button>
            ) : <span style={{ fontSize: 11, color: C.t4 }}>Voice input isn’t supported here — just type.</span>}
            <button onClick={submitAnswer} disabled={!canSubmit}
              style={{ ...btn(accent, { fontSize: 13 }), display: 'inline-flex', alignItems: 'center', gap: 7, opacity: canSubmit ? 1 : 0.5 }}>
              <Send size={14} />Send answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Functions, not literals: a module-level style object freezes the palette at
// import time and never follows a theme switch (see theme.js's header note).
const iconBtn = () => ({ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: C.s3, border: `1px solid ${C.b1}`, cursor: 'pointer' });
const composerInput = () => ({ width: '100%', minHeight: 84, resize: 'vertical', background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '11px 14px', color: C.t1, fontSize: 14, lineHeight: 1.6, fontFamily: C.FB, outline: 'none' });
