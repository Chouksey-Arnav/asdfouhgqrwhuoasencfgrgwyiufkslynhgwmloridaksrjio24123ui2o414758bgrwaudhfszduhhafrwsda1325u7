// Interviewer voice picker for the live voice interview simulator.
//
// This used to be a dropdown over *every* voice the browser exposed — which on macOS/iOS meant
// scrolling past Zarvox, Deranged, Bahh and Whisper to find something that didn't sound like a
// horror film, and on any device meant a long, random, meaningless list. Now it renders the fixed
// five-persona roster from lib/speech.js (Apple-Voices style: a short named lineup, each slot
// resolved to the best real voice that device ships and tuned to a natural cadence). The student
// auditions five options, picks one, and it's remembered across sessions by persona id.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Check } from 'lucide-react';
import { C, R, onTint, accentFill } from '../lib/theme';
import * as speech from '../lib/speech';

const SAMPLE_LINE = "Hi, thanks for coming in today. Let's start with something easy — tell me a bit about yourself.";

export default function VoiceSelector({ accent = C.blue, value, onChange }) {
  const [options, setOptions] = useState([]);
  const [previewing, setPreviewing] = useState(null); // persona id currently playing
  const cancelRef = useRef(() => {});

  useEffect(() => {
    let mounted = true;
    speech.loadVoices().then(voices => {
      if (!mounted) return;
      setOptions(speech.getInterviewerVoices(voices));
    });
    return () => { mounted = false; cancelRef.current?.(); };
  }, []);

  // If nothing's been chosen yet, default the selection (without persisting) to the saved
  // persona, or the top of the roster — the UI never shows "no voice selected."
  useEffect(() => {
    if (value || !options.length) return;
    const def = speech.pickInterviewerVoice(options.map(o => o.voice));
    onChange(options.find(o => o.id === def?.id) || options[0]);
  }, [options, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useCallback((opt) => {
    cancelRef.current?.();
    if (previewing === opt.id) { speech.cancelSpeech(); setPreviewing(null); return; }
    setPreviewing(opt.id);
    cancelRef.current = speech.speak(SAMPLE_LINE, {
      persona: opt,
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
    return <div style={{ fontSize: 12, color: C.t3 }}>Loading interviewer voices…</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 8 }}>
      {options.map(opt => {
        const selected = value?.id === opt.id;
        const playing = previewing === opt.id;
        return (
          <motion.div
            key={opt.id}
            whileHover={{ y: -1 }}
            onClick={() => choose(opt)}
            title={opt.blurb}
            style={{
              ...R({ gap: 9, alignItems: 'flex-start' }),
              padding: '10px 11px', borderRadius: 12, cursor: 'pointer',
              background: selected ? `${accent}14` : C.s2,
              border: `1px solid ${selected ? accent : C.b1}`,
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); preview(opt); }}
              title={playing ? 'Stop preview' : `Hear ${opt.label}`}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center', marginTop: 1,
                background: playing ? accentFill(accent) : `${accent}1c`,
                color: playing ? C.onAccent : onTint(accent),
              }}
            >
              {playing ? <Square size={10} fill="currentColor" /> : <Play size={11} fill="currentColor" style={{ marginLeft: 1 }} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...R({ gap: 5 }), fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
                {opt.label}
                {selected && <Check size={13} color={accent} style={{ flexShrink: 0 }} />}
              </div>
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>{opt.role}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
