// ─────────────────────────────────────────────────────────────────────────────
// "Listen to this lesson" — the audio bar that sits above every lesson article.
//
// The problem it solves: lessons were text-only, and a high schooler's biggest
// blocks of free time (the bus, the walk home, chores) are exactly the ones
// where reading is impossible. This turns any article into something you can
// put in your pocket and finish with your eyes somewhere else.
//
// Behaviors that matter, and why:
//   • Paragraph-level position. Play/pause is table stakes; skipping *back one
//     paragraph* is the thing people actually reach for when they zone out on a
//     bus. Position is tracked per segment, not per article.
//   • The article follows the audio. The currently spoken block is highlighted
//     and scrolled into view, so a student can drift between reading and
//     listening mid-lesson without losing their place.
//   • Finishing the audio counts as reading. The article step gates "Continue"
//     on scrolling to the bottom, which a listener never does — so reaching the
//     end of the narration satisfies the same gate.
//   • Speed and narrator persist across lessons (lib/lessonAudio.js).
//   • It never blocks the lesson. On a browser with no speech synthesis the bar
//     collapses to a single explanatory line and the article works as before.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge, Mic2, Check } from 'lucide-react';
import { C, R, CC, glass2, pill, btnSm } from '../lib/theme';
import * as speech from '../lib/speech';
import {
  AUDIO_RATES, getSavedRate, setSavedRate, getSavedNarratorId, setSavedNarratorId,
  getNarratorVoices, pickNarrator, speakSegment, estimateListenSeconds, formatListenLength,
} from '../lib/lessonAudio';

export default function LessonAudioPlayer({
  segments = [],
  accent = C.blue,
  m = false,
  onSpeakingSection,   // (sectionIdx|null) => void — drives the in-article highlight
  onFinished,          // () => void — narration reached the end of the article
}) {
  const [supported] = useState(() => speech.isTTSSupported());
  const [narrators, setNarrators] = useState([]);
  const [narrator, setNarrator] = useState(null);
  const [rate, setRate] = useState(() => getSavedRate());
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState(null); // 'speed' | 'voice' | null

  const cancelRef = useRef(() => {});
  const playingRef = useRef(false);
  const idxRef = useRef(0);
  const rateRef = useRef(rate);
  const narratorRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { narratorRef.current = narrator; }, [narrator]);

  // Resolve the device's voice roster once, then settle on the student's saved narrator.
  useEffect(() => {
    if (!supported) return undefined;
    let mounted = true;
    speech.loadVoices().then(voices => {
      if (!mounted) return;
      const opts = getNarratorVoices(voices);
      setNarrators(opts);
      setNarrator(pickNarrator(opts));
    });
    return () => { mounted = false; };
  }, [supported]);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    cancelRef.current?.();
    speech.cancelSpeech();
    setPlaying(false);
    setPaused(false);
    onSpeakingSection?.(null);
  }, [onSpeakingSection]);

  // Leaving the article (step change, close, unmount) must never leave a voice
  // talking into an empty room.
  useEffect(() => () => { playingRef.current = false; cancelRef.current?.(); speech.cancelSpeech(); }, []);

  // Chrome silently stops long speechSynthesis runs after ~15s unless it gets
  // periodically nudged. resume() on a non-paused synth is a no-op everywhere
  // else, so this is safe to run unconditionally while we believe we're playing.
  useEffect(() => {
    if (!playing || paused) return undefined;
    const id = setInterval(() => {
      try { window.speechSynthesis.resume(); } catch { /* engine gone */ }
    }, 8000);
    return () => clearInterval(id);
  }, [playing, paused]);

  // Speaks segment `i` and chains into the next one when it ends. Reads its
  // rate/narrator from refs so a mid-playback speed change applies from the
  // next segment without restarting the whole run.
  const playFrom = useCallback((i) => {
    const seg = segments[i];
    if (!seg) {
      playingRef.current = false;
      setPlaying(false);
      onSpeakingSection?.(null);
      if (!finishedRef.current) { finishedRef.current = true; onFinished?.(); }
      return;
    }
    setIdx(i);
    idxRef.current = i;
    onSpeakingSection?.(seg.sectionIdx);
    cancelRef.current = speakSegment(seg, {
      narrator: narratorRef.current,
      rate: rateRef.current,
      onEnd: () => { if (playingRef.current) playFrom(i + 1); },
      // A single failed utterance (a voice that vanished mid-run, an engine
      // hiccup) shouldn't kill the whole listen — skip the segment and continue.
      onError: () => { if (playingRef.current) playFrom(i + 1); },
    });
  }, [segments, onSpeakingSection, onFinished]);

  function start(i = idxRef.current) {
    if (!supported || !segments.length) return;
    speech.cancelSpeech();
    playingRef.current = true;
    setPlaying(true);
    setPaused(false);
    playFrom(Math.min(i, segments.length - 1));
  }

  function toggle() {
    if (!playing) { start(); return; }
    const synth = window.speechSynthesis;
    if (paused) { try { synth.resume(); } catch { /* engine gone */ } setPaused(false); }
    else { try { synth.pause(); } catch { /* engine gone */ } setPaused(true); }
  }

  // Skipping while paused resumes from the new spot — a paused player that
  // silently stays paused after you press "next paragraph" feels broken.
  function jump(delta) {
    const next = Math.min(segments.length - 1, Math.max(0, idxRef.current + delta));
    if (playing || paused) { playingRef.current = false; cancelRef.current?.(); start(next); }
    else { setIdx(next); idxRef.current = next; }
  }

  function restart() {
    finishedRef.current = false;
    if (playing || paused) { playingRef.current = false; cancelRef.current?.(); start(0); }
    else { setIdx(0); idxRef.current = 0; }
  }

  function chooseRate(r) {
    setRate(r); rateRef.current = r; setSavedRate(r); setMenu(null);
    // Rate can't be changed on an utterance already queued, so re-speak the
    // current segment at the new speed rather than waiting for the next one.
    if (playing) { playingRef.current = false; cancelRef.current?.(); start(idxRef.current); }
  }

  function chooseNarrator(opt) {
    setNarrator(opt); narratorRef.current = opt; setSavedNarratorId(opt.id); setMenu(null);
    if (playing) { playingRef.current = false; cancelRef.current?.(); start(idxRef.current); }
  }

  if (!segments.length) return null;

  if (!supported) {
    return (
      <div style={{ ...glass2({ padding: 12 }), display: 'flex', gap: 8, alignItems: 'center' }}>
        <Headphones size={15} color={C.t3} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>
          Audio narration isn't available in this browser — try Chrome, Edge, or Safari to listen to this lesson instead of reading it.
        </div>
      </div>
    );
  }

  const total = segments.length;
  const pct = Math.round(((idx + (playing && !paused ? 0.5 : 0)) / total) * 100);
  const listenLabel = formatListenLength(estimateListenSeconds(segments, rate));

  return (
    <div style={{ ...glass2({ padding: m ? 11 : 13, background: `${accent}0c`, border: `1px solid ${accent}28` }), position: 'relative' }}>
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <motion.button
          whileTap={{ scale: 0.94 }} onClick={toggle}
          aria-label={playing && !paused ? 'Pause narration' : 'Play narration'}
          style={{
            width: 42, height: 42, minWidth: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${accent},${accent}bb)`, color: C.onAccent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {playing && !paused ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: 4 }} />}
        </motion.button>

        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Headphones size={13} color={accent} />
            {playing ? (paused ? 'Paused' : 'Listening') : 'Listen to this lesson'}
          </div>
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>
            {playing || idx > 0 ? `Part ${idx + 1} of ${total}` : `${listenLabel} · hands-free, good for the bus`}
          </div>
        </div>

        <div style={R({ gap: 4, flexShrink: 0 })}>
          <button onClick={() => jump(-1)} disabled={idx === 0} aria-label="Previous paragraph"
            style={{ ...btnSm(C.s3, { color: C.t2, padding: '8px 8px', opacity: idx === 0 ? 0.4 : 1 }) }}><SkipBack size={14} /></button>
          <button onClick={() => jump(1)} disabled={idx >= total - 1} aria-label="Next paragraph"
            style={{ ...btnSm(C.s3, { color: C.t2, padding: '8px 8px', opacity: idx >= total - 1 ? 0.4 : 1 }) }}><SkipForward size={14} /></button>
          <button onClick={restart} aria-label="Start over"
            style={{ ...btnSm(C.s3, { color: C.t2, padding: '8px 8px' }) }}><RotateCcw size={13} /></button>
          <button onClick={() => setMenu(mn => (mn === 'speed' ? null : 'speed'))} aria-label="Playback speed"
            style={{ ...btnSm(menu === 'speed' ? `${accent}22` : C.s3, { color: menu === 'speed' ? accent : C.t2, padding: '8px 8px', gap: 4, fontSize: 11.5 }) }}>
            <Gauge size={13} />{rate}×
          </button>
          {narrators.length > 1 && (
            <button onClick={() => setMenu(mn => (mn === 'voice' ? null : 'voice'))} aria-label="Narrator voice"
              style={{ ...btnSm(menu === 'voice' ? `${accent}22` : C.s3, { color: menu === 'voice' ? accent : C.t2, padding: '8px 8px', gap: 4, fontSize: 11.5 }) }}>
              <Mic2 size={13} />{narrator?.label || 'Voice'}
            </button>
          )}
        </div>
      </div>

      {/* Progress rail — segment-granular, matching what skip back/forward move by */}
      <div style={{ height: 3, borderRadius: 4, background: C.s4, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', transform: `scaleX(${(pct) / 100})`, transformOrigin: 'left', background: accent, borderRadius: 4, transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>

      <AnimatePresence>
        {menu && (
          <>
            <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.13 }}
              style={{ position: 'absolute', right: 8, top: '100%', marginTop: 4, zIndex: 31, ...glass2({ padding: 8 }), minWidth: 170, boxShadow: '0 14px 34px rgba(0,0,0,0.38)' }}
            >
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', padding: '4px 8px 4px' }}>
                {menu === 'speed' ? 'Playback speed' : 'Narrator'}
              </div>
              <div style={CC({ gap: 4 })}>
                {menu === 'speed'
                  ? AUDIO_RATES.map(r => (
                    <MenuRow key={r} active={r === rate} accent={accent} onClick={() => chooseRate(r)} label={`${r}×`} hint={r === 1 ? 'Normal' : r < 1 ? 'Slower' : 'Faster'} />
                  ))
                  : narrators.map(opt => (
                    <MenuRow key={opt.id} active={opt.id === (narrator?.id || getSavedNarratorId())} accent={accent} onClick={() => chooseNarrator(opt)} label={opt.label} hint={opt.role} />
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({ active, accent, onClick, label, hint }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
        border: 'none', borderRadius: 8, padding: '8px 8px', background: active ? `${accent}18` : 'transparent',
        color: active ? accent : C.t2, fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: 'inherit',
      }}>
      <span style={{ minWidth: 34 }}>{label}</span>
      <span style={{ ...pill('transparent', C.t3, { fontSize: 10, padding: 0 }) }}>{hint}</span>
      {active && <Check size={13} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}
