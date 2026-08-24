// A slide-out notes panel for the active pathway lesson. Auto-saves (debounced) to the
// `lessonNotes` Dexie table, keyed by lessonId (see lib/db.js), and its content is threaded into
// Meta Brain's system prompt (buildPrepSystemPrompt) so the student can ask the AI about what
// they wrote — "what did I say I found confusing?", "summarize my notes for a flashcard" — with
// full access to the actual text, not just a mention that notes exist.
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookPen, X, Check } from 'lucide-react';
import { C, glass2, tint, accentGrad } from '../lib/theme';

const SAVE_DEBOUNCE_MS = 600;

export default function LessonNotesPanel({ open, onOpenChange, lessonTitle, value, onSave, accent = C.blue, isMobile }) {
  const [draft, setDraft] = useState(value || '');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const saveTimer = useRef(null);
  const lastSavedValue = useRef(value || '');

  useEffect(() => { setDraft(value || ''); lastSavedValue.current = value || ''; }, [value]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  function handleChange(text) {
    setDraft(text);
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (text !== lastSavedValue.current) {
        lastSavedValue.current = text;
        onSave(text);
      }
      setSaveState('saved');
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500);
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          title="Lesson notes"
          style={{
            position: 'fixed', top: isMobile ? 'auto' : '50%', bottom: isMobile ? 96 : 'auto',
            left: isMobile ? 14 : 0, transform: isMobile ? 'none' : 'translateY(-50%)',
            zIndex: 320, background: accentGrad(accent), color: C.onAccent, border: 'none',
            borderRadius: isMobile ? 14 : '0 12px 12px 0', width: isMobile ? 46 : 40, height: isMobile ? 46 : 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: `0 6px 20px ${accent}55`,
          }}
        >
          <NotebookPen size={17} />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 325 }} />
            <motion.div
              key="panel"
              initial={isMobile ? { y: '100%' } : { x: '-100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              style={isMobile ? {
                position: 'fixed', left: 0, right: 0, bottom: 0, height: '78vh', zIndex: 330,
                background: C.s0, borderTop: `1px solid ${tint(accent, 0.3)}`, borderRadius: '20px 20px 0 0',
                display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              } : {
                position: 'fixed', left: 0, top: 0, bottom: 0, width: 380, maxWidth: '90vw', zIndex: 330,
                background: C.s0, borderRight: `1px solid ${tint(accent, 0.3)}`,
                display: 'flex', flexDirection: 'column', boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ padding: '16px 16px', borderBottom: `1px solid ${C.b1}`, background: `linear-gradient(120deg,${tint(accent, 0.12)},rgba(255,255,255,0.02))`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: accentGrad(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${tint(accent, 0.4)}` }}>
                    <NotebookPen size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>My Notes</div>
                    <div style={{ fontSize: 10.5, color: C.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lessonTitle}</div>
                  </div>
                  <div style={{ fontSize: 10, color: saveState === 'saved' ? C.green : C.t4, display: 'flex', alignItems: 'center', gap: 4, minWidth: 44 }}>
                    {saveState === 'saving' && 'Saving…'}
                    {saveState === 'saved' && <><Check size={11} />Saved</>}
                  </div>
                  <button onClick={() => onOpenChange(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.t3 }}>
                    <X size={17} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  autoFocus={!isMobile}
                  value={draft}
                  onChange={e => handleChange(e.target.value)}
                  placeholder="Write down anything you want to remember from this lesson — a formula, a phrase, a question to revisit. Medabrain can see and discuss these notes with you."
                  style={{
                    flex: 1, resize: 'none', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`,
                    borderRadius: 12, padding: '12px 12px', color: C.t1, fontSize: 13.5, lineHeight: 1.55,
                    fontFamily: C.FB,
                  }}
                />
                <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8 }}>Autosaves as you type · synced across your devices</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
