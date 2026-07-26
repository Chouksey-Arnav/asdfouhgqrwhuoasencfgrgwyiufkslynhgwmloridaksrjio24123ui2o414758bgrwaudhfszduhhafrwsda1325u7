// A proper voice picker for the live voice interview simulator. Lets the student browse every
// voice their browser/OS actually offers (grouped English-first, enhanced-quality-first), preview
// each one with a sample line, and lock in a favorite that's remembered across sessions (see
// getSavedVoiceURI/setSavedVoiceURI in lib/speech.js). We can't add new voices — the Web Speech
// API has no external provider — so the win here is making the *existing* catalogue easy to
// audition and pick from, instead of a silent hardcoded default.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Play, Square, Check, ChevronDown, Sparkles } from 'lucide-react';
import { C, glass2, R } from '../lib/theme';
import * as speech from '../lib/speech';

const SAMPLE_LINE = "Hi, thanks for coming in today — let's start with something easy. Tell me a bit about yourself.";

export default function VoiceSelector({ accent = C.blue, value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [previewing, setPreviewing] = useState(null); // voiceURI currently playing
  const cancelRef = useRef(() => {});

  useEffect(() => {
    let mounted = true;
    speech.loadVoices().then(voices => {
      if (!mounted) return;
      setOptions(speech.getVoiceOptions(voices));
    });
    return () => { mounted = false; cancelRef.current?.(); };
  }, []);

  // If nothing's been chosen yet, default the selection (without persisting) to whatever
  // pickInterviewerVoice() would pick, so the UI never shows "no voice selected."
  useEffect(() => {
    if (value || !options.length) return;
    const def = speech.pickInterviewerVoice(options.map(o => o.voice));
    if (def) onChange(def);
  }, [options, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useCallback((opt) => {
    cancelRef.current?.();
    if (previewing === opt.voiceURI) { speech.cancelSpeech(); setPreviewing(null); return; }
    setPreviewing(opt.voiceURI);
    cancelRef.current = speech.speak(SAMPLE_LINE, {
      voice: opt.voice,
      onEnd: () => setPreviewing(p => (p === opt.voiceURI ? null : p)),
      onError: () => setPreviewing(p => (p === opt.voiceURI ? null : p)),
    });
  }, [previewing]);

  function choose(opt) {
    cancelRef.current?.(); speech.cancelSpeech(); setPreviewing(null);
    speech.setSavedVoiceURI(opt.voiceURI);
    onChange(opt.voice);
    setOpen(false);
  }

  if (!speech.isTTSSupported()) return null;

  const current = options.find(o => o.voiceURI === value?.voiceURI);
  const english = options.filter(o => o.isEnglish);
  const other = options.filter(o => !o.isEnglish);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, width: compact ? 'auto' : '100%',
          padding: '10px 13px', borderRadius: 11, background: C.s2, border: `1px solid ${open ? accent : C.b1}`,
          color: C.t1, fontSize: 12.5, fontFamily: C.FB, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Volume2 size={14} color={accent} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.name.replace(/\s*\(.*?\)\s*/g, ' ').trim() : 'Choose a voice…'}
        </span>
        {current?.quality === 'Enhanced' && <Sparkles size={12} color={accent} style={{ flexShrink: 0 }} />}
        <ChevronDown size={14} color={C.t3} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 340 }} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 341,
                ...glass2({ padding: 8 }), maxHeight: 320, overflowY: 'auto', boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
              }}
            >
              {options.length === 0 && (
                <div style={{ fontSize: 12, color: C.t3, padding: '10px 8px' }}>Loading voices…</div>
              )}
              {english.length > 0 && <GroupLabel>English voices</GroupLabel>}
              {english.map(opt => (
                <VoiceRow key={opt.voiceURI} opt={opt} accent={accent} selected={value?.voiceURI === opt.voiceURI}
                  previewing={previewing === opt.voiceURI} onPreview={() => preview(opt)} onChoose={() => choose(opt)} />
              ))}
              {other.length > 0 && <GroupLabel>Other languages</GroupLabel>}
              {other.map(opt => (
                <VoiceRow key={opt.voiceURI} opt={opt} accent={accent} selected={value?.voiceURI === opt.voiceURI}
                  previewing={previewing === opt.voiceURI} onPreview={() => preview(opt)} onChoose={() => choose(opt)} />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupLabel({ children }) {
  return <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t4, padding: '8px 8px 4px' }}>{children}</div>;
}

function VoiceRow({ opt, accent, selected, previewing, onPreview, onChoose }) {
  return (
    <div style={{ ...R({ gap: 8 }), padding: '8px 8px', borderRadius: 9, background: selected ? `${accent}14` : 'transparent', cursor: 'pointer' }}
      onClick={onChoose}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        title={previewing ? 'Stop preview' : 'Preview this voice'}
        style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
          display: 'grid', placeItems: 'center', background: previewing ? accent : `${accent}1c`, color: previewing ? '#fff' : accent,
        }}
      >
        {previewing ? <Square size={10} fill="currentColor" /> : <Play size={11} fill="currentColor" style={{ marginLeft: 1 }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: C.t1, fontWeight: selected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {opt.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}
        </div>
        <div style={{ fontSize: 10, color: C.t4, marginTop: 1, display: 'flex', gap: 6 }}>
          <span>{opt.lang}</span><span>·</span><span>{opt.gender}</span>
          {opt.quality === 'Enhanced' && <><span>·</span><span style={{ color: accent }}>Enhanced</span></>}
        </div>
      </div>
      {selected && <Check size={15} color={accent} style={{ flexShrink: 0 }} />}
    </div>
  );
}
