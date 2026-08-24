// The ask before the microphone opens.
//
// Every other path in the interview simulator was built before anyone checked what happens to a
// minor's voice when they answer out loud. The answer: on Chrome, Edge, and every Chromium browser,
// the Web Speech API streams microphone audio to the browser vendor's speech service — Google's, in
// practice — to be transcribed. We never receive or store that audio, and the interviewer's own
// voice is synthesised entirely on-device, but the student's voice does leave their machine, and
// the person it belongs to is fourteen to eighteen years old.
//
// So: voice answers are off until they are switched on, the ask happens BEFORE the browser's
// permission prompt (a padlock icon is not informed consent), and declining costs nothing — the
// whole simulator works by typing, which is why the "type instead" option is presented as an equal
// choice rather than as a downgrade. The decision is remembered and can be withdrawn at any time
// from the same place.
//
// See docs/INTERVIEW_VOICE_PRIVACY.md for the full data-handling story, and Section 6 of the
// Privacy Policy for the user-facing version.
import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Keyboard, ShieldCheck } from 'lucide-react';
import { C, glass2, btn, btnG, R } from '../lib/theme';
import * as speech from '../lib/speech';

export default function VoiceConsentGate({ accent = C.blue, onDecide }) {
  const offDevice = speech.recognitionSendsAudioOffDevice();

  function decide(value) {
    speech.setVoiceConsent(value);
    onDecide?.(value);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass2({ padding: 16 }), border: `1px solid ${accent}30` }}>
      <div style={R({ gap: 8, marginBottom: 8, alignItems: 'flex-start' })}>
        <ShieldCheck size={16} color={accent} style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
          Before you answer out loud
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
        {offDevice ? (
          <>
            Answering by voice uses your browser’s speech-to-text. On this browser, that means{' '}
            <strong style={{ color: C.t1 }}>your browser sends the audio from your microphone to its own speech service</strong>{' '}
            (usually Google’s) to turn it into text. That’s your browser doing it, under their privacy policy — we never
            receive the audio and we never store a recording. What we get is the text, and only when you send your answer.
          </>
        ) : (
          <>
            Answering by voice uses your browser’s speech-to-text. This browser looks like it transcribes on the device
            itself, so the audio should not leave your machine — but we can’t verify that from here, so treat it as
            possible that it does. We never receive the audio and we never store a recording either way.
          </>
        )}
        <div style={{ marginTop: 8 }}>
          The interviewer’s voice is made on your device and involves no microphone at all, so it works either way.{' '}
          <strong style={{ color: C.t1 }}>Everything in this simulator works by typing</strong> — nothing is locked
          behind speaking aloud, and you can change this later from this same screen.
        </div>
        {offDevice && (
          <div style={{ marginTop: 8, color: C.t3 }}>
            If you’re under 18, this is worth showing a parent or guardian first.
          </div>
        )}
      </div>
      <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
        <button onClick={() => decide('granted')}
          style={{ ...btn(accent, { fontSize: 12.5 }), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Mic size={14} />Turn on voice answers
        </button>
        <button onClick={() => decide('declined')}
          style={{ ...btnG({ fontSize: 12.5 }), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Keyboard size={14} />I’ll type instead
        </button>
      </div>
    </motion.div>
  );
}
