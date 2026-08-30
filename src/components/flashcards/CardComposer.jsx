// ─────────────────────────────────────────────────────────────────────────────
// "Add my own cards" — type them, or photograph the page they're on.
//
// ── WHY THIS IS THE MOST IMPORTANT SCREEN IN THE FLASHCARD FEATURE ───────────
// Everything else this app offers is about a career that starts in four to
// twelve years. This is the one thing that is useful tonight, for the biology
// test tomorrow. That is the difference between an app a student opens
// occasionally, when they're thinking about their future, and one they open on
// a Tuesday because they have homework — and that difference is what weekly
// active use actually is.
//
// So the design commitments here are:
//
//   • The student's own material is FIRST-CLASS, not a lesser path bolted onto
//     the curated decks. Their cards go into the same FSRS scheduler, the same
//     Today's session queue, and earn the same XP and streak credit.
//   • Typing a card is TWO FIELDS. Anything more is a form, and a form is a
//     reason to close the tab and use paper.
//   • The photo path can FAIL WITHOUT BEING A DEAD END. If OCR reads nothing
//     useful, the photo stays on screen with a box to type what's on it. A
//     student who came here with material they wanted turned into cards must
//     never leave with an error message and nothing.
//   • The one-time OCR download is DISCLOSED BEFORE it happens. A meaningful
//     share of this audience is on a metered connection, and silently spending
//     15 MB of someone's data plan is not a thing we get to do.
//
// The image never leaves the device: text extraction runs in-browser, and card
// generation runs through the same fully-offline extraction engine that pasted
// notes use.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Plus, Loader2, Type, Check, AlertCircle } from 'lucide-react';
import { C, glass, glass2, btn, btnG, inp, lbl, pill, R, CC, accentGrad } from '../../lib/theme';
import { cardsFromImage, makeCard, isDuplicateCard, OCR_DOWNLOAD_NOTE, hasNativeTextDetection } from '../../lib/flashcards/capture';

export default function CardComposer({
  open,
  onClose,
  deckNames = [],       // existing deck names the student can add to
  defaultDeck = '',
  existingCards = [],   // cards already in the chosen deck, for duplicate detection
  onAddCards,           // (deckName, cards[]) => Promise<void>
  m = false,
}) {
  const [mode, setMode] = useState('type');       // 'type' | 'photo'
  const [deck, setDeck] = useState(defaultDeck || deckNames[0] || '');
  const [newDeck, setNewDeck] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [pending, setPending] = useState([]);     // cards staged but not yet saved
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [photo, setPhoto] = useState(null);       // { dataUrl, text, engine }
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  const targetDeck = (newDeck.trim() || deck || '').trim();

  function stage(card) {
    setPending(p => [...p, card]);
    setFront(''); setBack(''); setError('');
  }

  function addTyped() {
    try {
      if (isDuplicateCard([...existingCards, ...pending], front)) {
        setError('You already have a card with that front.');
        return;
      }
      stage(makeCard({ front, back }));
    } catch (e) { setError(e.message); }
  }

  async function handleFile(file) {
    if (!file) return;
    setError(''); setBusy(true); setPct(0);
    try {
      const result = await cardsFromImage(file, { count: 15, allowDownload: true, onProgress: setPct });
      setPhoto({ dataUrl: result.dataUrl, text: result.text, engine: result.engine });
      if (result.cards?.length) {
        setPending(p => [...p, ...result.cards.map(c => ({ ...c, source: 'photo' }))]);
      } else {
        // Not an error state — the photo is still on screen and the text box below
        // is now the path forward. See the header on why this must not dead-end.
        setManualText(result.text || '');
        setError(result.text
          ? "Couldn't pull enough clean sentences out of that. The text it did read is below — edit it and we'll build cards from that."
          : "Couldn't read text off that photo. Type or paste what's on the page below and we'll build cards from it.");
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong reading that photo. You can still type the material in below.");
    } finally { setBusy(false); setPct(0); }
  }

  async function buildFromText() {
    setError(''); setBusy(true);
    try {
      const { generateFlashcardsFromNotes } = await import('../../lib/flashcards/engine');
      const { cleanNotesText } = await import('../../lib/noteFlashcardEngine');
      const result = generateFlashcardsFromNotes(cleanNotesText(manualText), 15);
      if (!result.cards.length) { setError('Not enough there to build cards from — a few more sentences should do it.'); return; }
      setPending(p => [...p, ...result.cards]);
      setManualText('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function save() {
    if (!pending.length) { setError('Add at least one card first.'); return; }
    if (!targetDeck) { setError('Give the deck a name.'); return; }
    setBusy(true);
    try {
      await onAddCards(targetDeck, pending);
      setPending([]); setPhoto(null); setManualText('');
      onClose?.();
    } catch (e) { setError(e.message || 'Could not save those cards.'); } finally { setBusy(false); }
  }

  // inp() carries the design system's input tokens; the local overrides are only
  // metrics, so this composer's fields match every other field in the app in both
  // themes and in high contrast.
  const field = inp({ padding: '8px 12px' });

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Add your own flashcards"
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: C.cmp.scrimBg, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: m ? 12 : 32 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...glass({ padding: m ? 16 : 24 }), width: '100%', maxWidth: 620 }}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 16 })}>
          <div>
            <div style={{ fontSize: m ? 17 : 20, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Your own cards</div>
            <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>For the test you actually have tomorrow.</div>
          </div>
          <button aria-label="Close" style={btnG({ padding: '8px 8px' })} onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ ...R({ gap: 8 }), marginBottom: 16 }}>
          <button style={mode === 'type' ? btn(accentGrad(C.amber), { fontSize: 12, padding: '8px 16px' }) : btnG({ fontSize: 12, padding: '8px 16px' })}
            onClick={() => setMode('type')}><Type size={13} />Type them</button>
          <button style={mode === 'photo' ? btn(accentGrad(C.amber), { fontSize: 12, padding: '8px 16px' }) : btnG({ fontSize: 12, padding: '8px 16px' })}
            onClick={() => setMode('photo')}><Camera size={13} />From a photo</button>
        </div>

        {/* Deck target */}
        <div style={{ ...CC({ gap: 8 }), marginBottom: 16 }}>
          <label style={lbl({ marginBottom: 0 })}>Add to</label>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            {deckNames.length > 0 && (
              <select value={deck} onChange={e => { setDeck(e.target.value); setNewDeck(''); }} style={{ ...field, width: 'auto', minWidth: 180 }}>
                {deckNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
            <input value={newDeck} onChange={e => setNewDeck(e.target.value)} placeholder="…or name a new deck" style={{ ...field, width: 'auto', flex: 1, minWidth: 160 }} />
          </div>
        </div>

        {mode === 'type' && (
          <div style={CC({ gap: 8 })}>
            <input value={front} onChange={e => setFront(e.target.value)} placeholder="Front — the question or prompt" style={field} />
            <textarea value={back} onChange={e => setBack(e.target.value)} placeholder="Back — the answer" rows={3} style={{ ...field, resize: 'vertical' }} />
            <button style={{ ...btnG({ alignSelf: 'flex-start', fontSize: 12, padding: '8px 16px' }), display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={addTyped}>
              <Plus size={13} />Add card
            </button>
          </div>
        )}

        {mode === 'photo' && (
          <div style={CC({ gap: 8 })}>
            {/* capture="environment" opens the rear camera directly on a phone, which is
                the actual use case: the textbook is on the desk in front of them. */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])} />
            <button disabled={busy} style={{ ...btn(accentGrad(C.amber), { fontSize: 13, padding: '12px 16px' }), display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}
              onClick={() => fileRef.current?.click()}>
              {busy ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />{pct ? `Reading… ${pct}%` : 'Reading…'}</> : <><Camera size={15} />Photograph a page</>}
            </button>
            {/* Stated before it happens, not after. */}
            {!hasNativeTextDetection() && (
              <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 4 }} />
                <span>{OCR_DOWNLOAD_NOTE}</span>
              </div>
            )}
            {photo?.dataUrl && (
              <img src={photo.dataUrl} alt="The page you photographed" style={{ maxHeight: 200, width: 'auto', borderRadius: 8, border: `1px solid ${C.b1}`, alignSelf: 'flex-start' }} />
            )}
            {(manualText || error) && (
              <div style={CC({ gap: 8 })}>
                <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={5}
                  placeholder="Type or paste what's on the page" style={{ ...field, resize: 'vertical' }} />
                <button disabled={busy || manualText.trim().length < 40} style={{ ...btnG({ alignSelf: 'flex-start', fontSize: 12, padding: '8px 16px' }), opacity: manualText.trim().length < 40 ? 0.5 : 1 }}
                  onClick={buildFromText}>Build cards from this</button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ ...glass2({ padding: '8px 12px', background: C.amberDim, border: `1px solid ${C.amber}30` }), marginTop: 12, fontSize: 12, color: C.t1, lineHeight: 1.55 }}>
            {error}
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
              <span style={lbl({ marginBottom: 0 })}>Ready to save</span>
              <span style={pill(C.greenDim, C.greenL, { fontSize: 10.5 })}>{pending.length} card{pending.length === 1 ? '' : 's'}</span>
            </div>
            <div style={{ ...CC({ gap: 8 }), maxHeight: 220, overflowY: 'auto' }}>
              {pending.map((c, i) => (
                <div key={i} style={{ ...glass2({ padding: '8px 12px' }), display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Check size={13} color={C.greenL} style={{ flexShrink: 0, marginTop: 4 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, lineHeight: 1.45 }}>{c.front}</div>
                    <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>{c.back}</div>
                  </div>
                  <button aria-label="Remove card" style={btnG({ padding: '8px 8px' })} onClick={() => setPending(p => p.filter((_, j) => j !== i))}><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...R({ gap: 8, justifyContent: 'flex-end' }), marginTop: 16 }}>
          <button style={btnG({ fontSize: 12, padding: '8px 16px' })} onClick={onClose}>Cancel</button>
          <button disabled={busy || !pending.length} style={{ ...btn(accentGrad(C.green), { fontSize: 12, padding: '8px 16px', opacity: busy || !pending.length ? 0.5 : 1 }), display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={save}>
            <Plus size={13} />Save {pending.length || ''} to {targetDeck || 'deck'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
