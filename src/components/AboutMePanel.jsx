// ─────────────────────────────────────────────────────────────────────────────
// "Tell Medabrain about yourself" — the personal brief surface.
//
// Onboarding asks a student thirty multiple-choice questions and learns almost
// nothing that changes coaching. The things that actually matter are the things
// no dropdown has an option for: "my mum is an ICU nurse and I've been around
// hospitals my whole life", "I freeze on timed sections", "I'm the first person
// in my family to apply to college", "I'm applying Duke ED and everything else
// is a backup". This panel is where a student says those things, out loud if
// they want, and every Medabrain surface in the app then treats them as the
// most authoritative thing it knows.
//
// Speaking is the primary input, not a novelty. Talking is roughly three times
// faster than typing and — more to the point — people say more when they talk.
// A student who would write two sentences into a box will happily talk for
// ninety seconds. The typing path is a first-class fallback, because Web Speech
// recognition doesn't exist in Firefox and is unreliable on several mobile
// browsers, and because some students simply don't want to talk.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Square, Sparkles, Trash2, Pin, PinOff, Pencil, Check, X,
  Brain, Volume2, Keyboard, Info, ShieldCheck, Lightbulb,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, btnSm, inp, lbl, R, CC, pill, tint } from '../lib/theme';
import { isSTTSupported, createRecognizer } from '../lib/speech';
import {
  getBriefEntries, addBriefEntry, updateBriefEntry, removeBriefEntry,
  togglePinBriefEntry, briefStats, BRIEF_ENTRY_MAX_CHARS,
} from '../lib/personalBrief';
import { announce } from '../lib/a11y';

// Conversation starters. These are not form fields — they're there because
// "tell me about yourself" is a famously paralysing prompt, and a student
// staring at an empty box needs somewhere to start. Tapping one drops it into
// the composer as a heading they can talk under, not a question to answer.
const PROMPT_GROUPS = [
  {
    label: 'Who you are',
    icon: Brain,
    hue: 'violet',
    prompts: [
      'What my family is like, and what they expect from me',
      'Why I actually want to go into medicine (the real reason)',
      'What I do outside school that matters to me',
      'Something about my situation that a coach should know',
    ],
  },
  {
    label: 'School & studying',
    icon: Lightbulb,
    hue: 'amber',
    prompts: [
      'What my school is like and which classes I am taking',
      'How I study, and what has not worked for me before',
      'Which subjects I find hardest, and why',
      'How much time I actually have in a normal week',
    ],
  },
  {
    label: 'Where you are headed',
    icon: Sparkles,
    hue: 'cyan',
    prompts: [
      'The colleges I am aiming for and why',
      'What I am worried about in my application',
      'My money situation and what that means for where I apply',
      'What I want to have done by the end of this year',
    ],
  },
];

const relTime = (ts) => {
  if (!ts) return '';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

export default function AboutMePanel({ user, onSaveUser, isMobile = false, accent = C.violet, embedded = false }) {
  const entries = useMemo(() => getBriefEntries(user), [user]);
  const stats = useMemo(() => briefStats(user), [user]);

  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [micDenied, setMicDenied] = useState(false);

  const recRef = useRef(null);
  const textareaRef = useRef(null);
  // Whatever was already typed when dictation started. Speech results replace
  // the transcript wholesale on every update (that's how the API reports), so
  // without a fixed base the student's typed text would be clobbered by the
  // first recognized word.
  const baseTextRef = useRef('');

  const sttOk = isSTTSupported();

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  // Recognition must not outlive the panel — an orphaned recognizer keeps the
  // mic indicator on in the browser chrome long after the student navigated away.
  useEffect(() => () => { recRef.current?.abort(); recRef.current = null; }, []);

  const startListening = () => {
    if (!sttOk) { toast.error('Your browser does not support voice input — you can type instead.'); return; }
    baseTextRef.current = draft ? `${draft.trim()} ` : '';
    const rec = createRecognizer({
      onResult: (transcript, isFinal) => {
        setDraft(baseTextRef.current + transcript);
        setInterim(isFinal ? '' : transcript);
      },
      onEnd: () => { setListening(false); setInterim(''); recRef.current = null; },
      onError: (e) => {
        // 'no-speech' fires constantly during natural pauses and is not an
        // error worth showing anyone.
        if (e?.error === 'no-speech' || e?.error === 'aborted') return;
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          setMicDenied(true);
          toast.error('Microphone access is blocked. Allow it in your browser settings, or type instead.');
        } else {
          toast.error('Voice input stopped unexpectedly. You can keep typing.');
        }
        setListening(false);
      },
    });
    if (!rec) { toast.error('Voice input is unavailable here.'); return; }
    recRef.current = rec;
    rec.start();
    setListening(true);
    setMicDenied(false);
    announce('Listening. Say whatever you want Medabrain to know about you.');
  };

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    if (listening) stopListening();
    onSaveUser(addBriefEntry(user, text, interim || listening ? 'voice' : 'text'));
    setDraft('');
    announce('Saved to your brief. Medabrain will use this everywhere in the app.');
    toast.success('Medabrain has it — this now shapes every answer you get.');
  };

  const usePrompt = (p) => {
    setDraft(d => (d.trim() ? `${d.trim()}\n\n${p}: ` : `${p}: `));
    textareaRef.current?.focus();
  };

  const startEdit = (e) => { setEditingId(e.id); setEditText(e.text); };
  const commitEdit = () => {
    if (!editText.trim()) { setEditingId(null); return; }
    onSaveUser(updateBriefEntry(user, editingId, editText));
    setEditingId(null);
    toast.success('Updated.');
  };

  const remove = (id) => {
    onSaveUser(removeBriefEntry(user, id));
    announce('Entry removed from your brief.');
  };

  const depthMeta = {
    empty:   { label: 'Nothing yet',      pct: 0,   color: C.t4,    note: 'Medabrain is running on your onboarding answers alone right now.' },
    started: { label: 'Getting started',  pct: 25,  color: C.amber, note: 'A good start. Another minute of talking makes a noticeable difference.' },
    good:    { label: 'Solid',            pct: 62,  color: C.blue,  note: 'Medabrain has enough to personalise most of what it says to you.' },
    rich:    { label: 'Medabrain knows you', pct: 100, color: C.green, note: 'Every answer across the app is now shaped by what you have told it here.' },
  }[stats.depth];

  const remaining = BRIEF_ENTRY_MAX_CHARS - draft.length;

  return (
    <div style={CC({ gap: 18 })}>
      {/* ── Explainer hero ─────────────────────────────────────────────── */}
      {!embedded && (
        <div style={{
          ...glass({ padding: isMobile ? 18 : 24 }),
          background: `linear-gradient(125deg,${tint(accent, 0.16)},${tint(C.indigo, 0.08)} 55%,transparent)`,
          border: `1px solid ${tint(accent, 0.3)}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},transparent)` }} />
          <div style={R({ gap: 14, alignItems: 'flex-start' })}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center',
              background: C.violetGrad, boxShadow: `0 8px 20px ${tint(accent, 0.35)}`,
            }}>
              <Volume2 size={20} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: isMobile ? 19 : 24, fontWeight: 800, fontFamily: C.FD, letterSpacing: '-.03em', color: C.t1, margin: 0 }}>
                Tell Medabrain about yourself
              </h2>
              <p style={{ fontSize: isMobile ? 12.5 : 13.5, color: C.t2, lineHeight: 1.65, marginTop: 6 }}>
                Talk to it like you would to a counsellor who actually has time for you. Your family, your school,
                what you are scared of, where you want to end up — anything. Say as much as you want, come back and
                add more whenever you want.
              </p>
              <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
                <span style={pill(tint(C.green, 0.14), C.greenL, { gap: 5 })}><ShieldCheck size={11} /> Treated as the truth</span>
                <span style={pill(tint(C.blue, 0.14), C.blueL, { gap: 5 })}><Brain size={11} /> Used across every tab</span>
                <span style={pill(tint(C.violet, 0.14), C.violetL, { gap: 5 })}><Pencil size={11} /> Editable any time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Depth meter ─────────────────────────────────────────────────── */}
      <div style={glass2({ padding: 14 })}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
          <span style={lbl({ marginBottom: 0 })}>How well Medabrain knows you</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: depthMeta.color }}>{depthMeta.label}</span>
        </div>
        <div
          role="progressbar" aria-valuenow={depthMeta.pct} aria-valuemin={0} aria-valuemax={100}
          aria-label={`How well Medabrain knows you: ${depthMeta.label}`}
          style={{ height: 6, borderRadius: 6, background: C.s4, overflow: 'hidden' }}
        >
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${depthMeta.pct}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: depthMeta.color, borderRadius: 6 }}
          />
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, lineHeight: 1.5 }}>
          {depthMeta.note}
          {stats.count > 0 && <span style={{ color: C.t4 }}>{'  '}· {stats.count} {stats.count === 1 ? 'entry' : 'entries'}, {stats.words} words</span>}
        </div>
      </div>

      {/* ── Composer ────────────────────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: isMobile ? 14 : 18 }),
        border: `1px solid ${listening ? tint(C.rose, 0.45) : C.b1}`,
        transition: 'border-color .25s',
      }}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 })}>
          <span style={lbl({ marginBottom: 0 })}>{listening ? 'Listening — just talk' : 'Say or type something'}</span>
          {!sttOk && (
            <span style={{ ...R({ gap: 5 }), fontSize: 11, color: C.t4 }}>
              <Keyboard size={11} /> Voice input isn't supported in this browser
            </span>
          )}
        </div>

        <label htmlFor="msp-brief-input" className="msp-sr-only">
          Tell Medabrain about yourself. You can type here or use the microphone button to speak.
        </label>
        <textarea
          id="msp-brief-input"
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, BRIEF_ENTRY_MAX_CHARS))}
          placeholder={listening
            ? 'Go ahead — your words will appear here as you speak…'
            : "e.g. My mum is a nurse and I've shadowed her since I was 13. I'm strong in bio but I panic on timed math. I want to stay in-state for cost reasons but Duke is my dream."}
          rows={isMobile ? 5 : 6}
          style={{
            ...inp({
              resize: 'vertical', minHeight: 120, lineHeight: 1.7, fontSize: isMobile ? 13 : 14,
              fontFamily: C.FB, borderRadius: 12, padding: '12px 14px',
            }),
          }}
        />

        {/* Live interim transcript — shows the recognizer is actually hearing
            them, which is the single most reassuring thing during dictation. */}
        <AnimatePresence>
          {listening && interim && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 12, color: C.t3, fontStyle: 'italic', marginTop: 8, overflow: 'hidden' }}
            >
              …{interim}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={R({ justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 })}>
          <div style={R({ gap: 8 })}>
            {sttOk && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={listening ? stopListening : startListening}
                aria-pressed={listening}
                aria-label={listening ? 'Stop recording' : 'Start speaking'}
                style={{
                  ...btn(listening ? `linear-gradient(135deg,${C.rose},${C.red})` : C.violetGrad, {
                    padding: '9px 16px', borderRadius: 11, gap: 7,
                  }),
                }}
              >
                {listening ? <><Square size={14} /> Stop</> : <><Mic size={15} /> Speak</>}
                {listening && (
                  <motion.span
                    animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', marginLeft: 2 }}
                  />
                )}
              </motion.button>
            )}
            {micDenied && (
              <span style={{ ...R({ gap: 5 }), fontSize: 11, color: C.amberL }}>
                <MicOff size={12} /> Mic blocked
              </span>
            )}
          </div>
          <div style={R({ gap: 10 })}>
            <span style={{ fontSize: 10.5, color: remaining < 150 ? C.amberL : C.t4, fontFamily: C.FM }}>
              {draft.length}/{BRIEF_ENTRY_MAX_CHARS}
            </span>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={save}
              disabled={!draft.trim()}
              style={btn(C.blueGrad, { padding: '9px 20px', borderRadius: 11, opacity: draft.trim() ? 1 : 0.45, cursor: draft.trim() ? 'pointer' : 'not-allowed' })}
            >
              <Check size={14} /> Save to Medabrain
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Conversation starters ───────────────────────────────────────── */}
      <div>
        <div style={{ ...R({ gap: 6 }), marginBottom: 10 }}>
          <Lightbulb size={12} color={C.t3} />
          <span style={lbl({ marginBottom: 0 })}>Not sure what to say? Start here</span>
        </div>
        <div style={CC({ gap: 14 })}>
          {PROMPT_GROUPS.map(group => {
            const GIcon = group.icon;
            const hue = C[group.hue];
            return (
              <div key={group.label}>
                <div style={{ ...R({ gap: 6 }), marginBottom: 7 }}>
                  <GIcon size={11} color={hue} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '.02em' }}>{group.label}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {group.prompts.map(p => (
                    <button
                      key={p}
                      onClick={() => usePrompt(p)}
                      style={{
                        textAlign: 'left', padding: '7px 12px', borderRadius: 20,
                        border: `1px solid ${tint(hue, 0.28)}`, background: tint(hue, 0.07),
                        color: C.t2, fontSize: 11.5, fontFamily: C.FB, cursor: 'pointer',
                        transition: 'background .15s, border-color .15s',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Saved entries ───────────────────────────────────────────────── */}
      <div>
        <div style={R({ justifyContent: 'space-between', marginBottom: 10 })}>
          <span style={lbl({ marginBottom: 0 })}>What Medabrain knows</span>
          {entries.length > 1 && (
            <span style={{ fontSize: 10.5, color: C.t4 }}>Newest last · pinned entries are never dropped</span>
          )}
        </div>

        {entries.length === 0 ? (
          <div style={{ ...glass2({ padding: 20, textAlign: 'center' }), borderStyle: 'dashed' }}>
            <Brain size={22} color={C.t4} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: C.t2, fontWeight: 600, marginBottom: 4 }}>Nothing here yet</div>
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
              Right now Medabrain only knows the boxes you ticked during sign-up. One minute of talking
              here changes more about the advice you get than anything else in the app.
            </div>
          </div>
        ) : (
          <div style={CC({ gap: 10 })}>
            <AnimatePresence initial={false}>
              {entries.map(e => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: -10 }}
                  style={{
                    ...glass2({ padding: 14 }),
                    borderLeft: `3px solid ${e.pinned ? C.amber : tint(accent, 0.5)}`,
                    background: e.pinned ? tint(C.amber, 0.05) : C.surf2,
                  }}
                >
                  {editingId === e.id ? (
                    <div style={CC({ gap: 10 })}>
                      <textarea
                        value={editText}
                        onChange={ev => setEditText(ev.target.value.slice(0, BRIEF_ENTRY_MAX_CHARS))}
                        rows={4}
                        aria-label="Edit this entry"
                        style={inp({ resize: 'vertical', lineHeight: 1.65, fontSize: 13, borderRadius: 10 })}
                      />
                      <div style={R({ gap: 8, justifyContent: 'flex-end' })}>
                        <button style={btnG({ fontSize: 11, padding: '6px 14px' })} onClick={() => setEditingId(null)}><X size={12} /> Cancel</button>
                        <button style={btn(C.blueGrad, { fontSize: 11, padding: '6px 16px' })} onClick={commitEdit}><Check size={12} /> Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.text}</div>
                      <div style={R({ justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 })}>
                        <div style={R({ gap: 7 })}>
                          <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>{relTime(e.at)}</span>
                          {e.source === 'voice' && <span style={pill(tint(C.violet, 0.12), C.violetL, { fontSize: 9.5, padding: '1px 8px', gap: 4 })}><Mic size={9} /> spoken</span>}
                          {e.pinned && <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 9.5, padding: '1px 8px', gap: 4 })}><Pin size={9} /> pinned</span>}
                        </div>
                        <div style={R({ gap: 4 })}>
                          <button
                            onClick={() => onSaveUser(togglePinBriefEntry(user, e.id))}
                            title={e.pinned ? 'Unpin' : 'Pin — always kept, even as the log grows'}
                            aria-label={e.pinned ? 'Unpin this entry' : 'Pin this entry'}
                            style={btnSm('transparent', { padding: '4px 9px', border: 'none', color: e.pinned ? C.amberL : C.t3 })}
                          >
                            {e.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                          </button>
                          <button
                            onClick={() => startEdit(e)}
                            title="Edit" aria-label="Edit this entry"
                            style={btnSm('transparent', { padding: '4px 9px', border: 'none', color: C.t3 })}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => remove(e.id)}
                            title="Delete" aria-label="Delete this entry"
                            style={btnSm('transparent', { padding: '4px 9px', border: 'none', color: C.roseL })}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── How this is used ────────────────────────────────────────────── */}
      <div style={{ ...glass2({ padding: 14 }), display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <Info size={14} color={C.t3} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.65 }}>
          Everything here is sent to Medabrain with every question you ask it — in the main coach, in Portfolio,
          and in Prep. Where it conflicts with your sign-up answers or your tracker,{' '}
          <strong style={{ color: C.t2 }}>what you said here wins</strong>, and the most recent entry wins over an older one.
          It stays on your account and is never shown to other students.
        </div>
      </div>
    </div>
  );
}
