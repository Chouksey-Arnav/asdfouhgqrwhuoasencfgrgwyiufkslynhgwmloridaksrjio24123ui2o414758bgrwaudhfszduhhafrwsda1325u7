// Who's interviewing you — the panel picker.
//
// This used to be a dropdown over every voice the browser exposed (scroll past Zarvox and Deranged
// to find something that isn't a horror film), and then a roster of five interchangeable assistant
// voices, which was the subtler mistake: five variations on the same bright, eager, young helper,
// all of them the wrong register for someone about to ask you why you deserve a place. Now it is
// cast as an actual panel — a senior physician, a mid-career faculty member, a nurse educator, a
// community member, a current medical student — each with an age, a job, and the stations they
// belong in. See lib/interviewPanel.js for the casting and why it matters.
//
// The default is deliberate: a first-timer gets the medical student, the gentlest room in the
// building. Everyone else gets the faculty member, which is the realistic one.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Check } from 'lucide-react';
import { C, R, onTint, accentFill, pill } from '../lib/theme';
import * as speech from '../lib/speech';

// Each panellist auditions on a line they would plausibly say, in their own register — a preview
// that puts the same neutral sentence in five mouths tells you nothing about who you're choosing.
const SAMPLE_LINES = {
  dean: "Good morning. I'd like to start with a case, and I'd rather you took a moment before answering than filled the silence. Take your time.",
  faculty: "Thanks for coming in. Let's start with something straightforward, and then I'll push on a couple of the details.",
  nurse: "Hi — come on in, have a seat. Before we start on anything hard, I'd like to hear a bit about you in your own words.",
  community: "Hello. I'm not a doctor, so no jargon with me. I just want to hear what actually brought you here.",
  student: "Hey, good to meet you. I did this same interview two years ago and I was terrified, so — no pressure. Ready when you are.",
};
const FALLBACK_LINE = "Thanks for coming in today. Let's start with something straightforward — tell me a bit about yourself.";

export default function VoiceSelector({ accent = C.blue, value, onChange, firstTimer = false }) {
  const [options, setOptions] = useState([]);
  const [previewing, setPreviewing] = useState(null); // panellist id currently playing
  const cancelRef = useRef(() => {});

  useEffect(() => {
    let mounted = true;
    speech.loadVoices().then(voices => {
      if (!mounted) return;
      setOptions(speech.getInterviewerVoices(voices));
    });
    return () => { mounted = false; cancelRef.current?.(); };
  }, []);

  // If nothing's been chosen yet, default the selection (without persisting) — a saved pick first,
  // then the medical student for a first-timer, then the faculty member. The UI never shows "no
  // interviewer selected."
  useEffect(() => {
    if (value || !options.length) return;
    const def = speech.pickInterviewerVoice(options.map(o => o.voice), { firstTimer });
    onChange(options.find(o => o.id === def?.id) || options[0]);
  }, [options, value, firstTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useCallback((opt) => {
    cancelRef.current?.();
    if (previewing === opt.id) { speech.cancelSpeech(); setPreviewing(null); return; }
    setPreviewing(opt.id);
    cancelRef.current = speech.speak(SAMPLE_LINES[opt.id] || FALLBACK_LINE, {
      persona: opt,
      intent: 'greeting',
      onEnd: () => setPreviewing(p => (p === opt.id ? null : p)),
      onError: () => setPreviewing(p => (p === opt.id ? null : p)),
    });
  }, [previewing]);

  function choose(opt) {
    cancelRef.current?.(); speech.cancelSpeech(); setPreviewing(null);
    speech.setSavedVoiceId(opt.id);
    onChange(opt);
  }

  if (!speech.isTTSSupported()) return null;

  if (!options.length) {
    return <div style={{ fontSize: 12, color: C.t3 }}>Loading the interview panel…</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(232px, 1fr))', gap: 8 }}>
      {options.map(opt => {
        const selected = value?.id === opt.id;
        const playing = previewing === opt.id;
        const suggested = firstTimer && opt.id === 'student';
        return (
          <motion.div
            key={opt.id}
            whileHover={{ y: -1 }}
            onClick={() => choose(opt)}
            title={opt.blurb}
            style={{
              ...R({ gap: 8, alignItems: 'flex-start' }),
              padding: '12px 12px', borderRadius: 12, cursor: 'pointer',
              background: selected ? `${accent}14` : C.s2,
              border: `1px solid ${selected ? accent : C.b1}`,
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); preview(opt); }}
              title={playing ? 'Stop preview' : `Hear ${opt.name}`}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center', marginTop: 4,
                background: playing ? accentFill(accent) : `${accent}1c`,
                color: playing ? C.onAccent : onTint(accent),
              }}
            >
              {playing ? <Square size={10} fill="currentColor" /> : <Play size={11} fill="currentColor" style={{ marginLeft: 4 }} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...R({ gap: 4, flexWrap: 'wrap' }), fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
                {opt.name}
                {selected && <Check size={13} color={accent} style={{ flexShrink: 0 }} />}
                {suggested && !selected && <span style={pill(`${accent}18`, accent, { fontSize: 9 })}>Suggested</span>}
              </div>
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>{opt.role} · {opt.age}</div>
              <div style={{ fontSize: 10.5, color: C.t4, marginTop: 4, lineHeight: 1.45 }}>{opt.bestFor}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
