import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, ArrowDown, AlertTriangle, X, Check, Info } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, tint } from '../lib/theme';
import { researchScholarship } from '../lib/scholarshipResearch';

// Three dots, pulsing in sequence — Medabrain "thinking" while it researches a scholarship the
// student just typed the name of. A generic spinner reads as "loading a page"; this reads as
// "someone is actively working on this", which is the honest description of what's happening
// (a live model call), not a static wait.
function ThinkingDots({ color = C.violetL }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

const EMPTY_FIELDS = { org: '', amount: '', deadline: '', eligibility: '', description: '' };

/**
 * The Financial Aid tab's "Add New Scholarship" flow. Collapsed to a single button by default
 * (see FinancialAidPanel.jsx). Opening it reveals a name field; pressing Enter or the primary
 * action sends the name to Medabrain (src/lib/scholarshipResearch.js), which researches the
 * program and returns the same shape of detail a curated database entry has — org, eligibility,
 * description, typical amount/deadline. The result is editable before saving, and a student who'd
 * rather skip the AI lookup entirely can jump straight to a blank editable card instead.
 */
export default function ScholarshipResearchAdd({ accent = C.blue, onTrack }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('name'); // 'name' | 'researching' | 'review'
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [recognized, setRecognized] = useState(true);
  // Whether Medabrain actually produced these fields — distinct from `recognized` (which is about
  // confidence in an AI answer that did happen). A skipped-research row must NOT be tagged as
  // AI-researched in the saved notes; that would misrepresent a student's own free text as a model
  // lookup, which is exactly the kind of provenance drift trackingCatalog.js's markers exist to
  // prevent (see AI_RESEARCH_MARKER / CATALOG_MARKER there).
  const [researched, setResearched] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => { if (open && phase === 'name') nameRef.current?.focus(); }, [open, phase]);

  function reset() {
    setOpen(false); setName(''); setPhase('name'); setFields(EMPTY_FIELDS);
    setRecognized(true); setResearched(false); setError(null); setSaving(false);
  }

  async function runResearch() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setPhase('researching');
    try {
      const result = await researchScholarship(trimmed);
      setFields({
        org: result.org, amount: result.amount, deadline: result.deadline,
        eligibility: result.eligibility, description: result.description,
      });
      setRecognized(result.recognized);
      setResearched(true);
      setPhase('review');
    } catch (err) {
      setError(err.message);
      setPhase('name');
    }
  }

  function skipResearch() {
    if (!name.trim()) return;
    setError(null);
    setFields(EMPTY_FIELDS);
    setRecognized(true);
    setResearched(false);
    setPhase('review');
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onTrack(name.trim(), fields, researched);
      reset();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={btn(accent !== C.blue ? `linear-gradient(135deg,${accent},${C.teal})` : C.blueGrad, { padding: '11px 22px' })}>
        <Plus size={15} />Add New Scholarship
      </button>
    );
  }

  return (
    <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(accent, 0.07)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.22)}` }}>
      <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 14 }}>
        <div style={R({ gap: 8 })}>
          <Sparkles size={15} color={accent} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>Add a new scholarship</span>
        </div>
        <button onClick={reset} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.t3, display: 'flex' }}><X size={16} /></button>
      </div>

      {(phase === 'name' || phase === 'researching') && (
        <>
          <form onSubmit={e => { e.preventDefault(); runResearch(); }} style={R({ gap: 10, flexWrap: 'wrap' })}>
            <input ref={nameRef} style={inp({ flex: 1, minWidth: 200 })} placeholder="Scholarship name — e.g. Horatio Alger National Scholarship"
              value={name} onChange={e => setName(e.target.value)} disabled={phase === 'researching'} />
            <button type="submit" disabled={!name.trim() || phase === 'researching'}
              style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), opacity: !name.trim() || phase === 'researching' ? 0.6 : 1, cursor: !name.trim() || phase === 'researching' ? 'default' : 'pointer' }}>
              {phase === 'researching' ? <ThinkingDots color="#fff" /> : <><Sparkles size={13} />Research with Medabrain</>}
            </button>
          </form>
          <div style={{ marginTop: 10 }}>
            {phase === 'researching' ? (
              <div style={{ ...R({ gap: 8 }), fontSize: 12, color: C.t3 }}>
                <ThinkingDots color={C.violetL} />
                Medabrain is researching "{name.trim()}"…
              </div>
            ) : (
              <button onClick={skipResearch} disabled={!name.trim()} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: name.trim() ? C.t3 : C.t4, cursor: name.trim() ? 'pointer' : 'default', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Skip research — add it manually instead
              </button>
            )}
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: C.roseL }}>{error}</div>}
        </>
      )}

      <AnimatePresence>
        {phase === 'review' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* The connecting line + arrow — a small visual "this came from that" link between the
                name the student typed and the data Medabrain found for it, before the review card
                itself animates into place. */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{name.trim()}</div>
              <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{ width: 1, height: 16, background: tint(accent, 0.5), transformOrigin: 'top', marginLeft: 3 }} />
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.2 }}>
                <ArrowDown size={12} color={tint(accent, 0.7)} style={{ marginLeft: -2 }} />
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.25 }}
              style={{ ...glass2({ padding: 14 }) }}>
              {!recognized && (
                <div style={{ ...R({ gap: 8 }), marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: tint(C.amber, 0.1), border: `1px solid ${tint(C.amber, 0.25)}` }}>
                  <AlertTriangle size={13} color={C.amberL} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>Medabrain doesn't have confident knowledge of this program — the fields below are best-effort, or blank. Fill in what you know, or track it as-is and research it yourself later.</span>
                </div>
              )}
              <div style={CC({ gap: 10 })}>
                <div>
                  <span style={lbl()}>Organization</span>
                  <input style={inp()} placeholder="Who runs it (optional)" value={fields.org} onChange={e => setFields(f => ({ ...f, org: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <span style={lbl()}>Typical amount</span>
                    <input style={inp()} placeholder="e.g. Around $2,500" value={fields.amount} onChange={e => setFields(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <span style={lbl()}>Typical deadline</span>
                    <input style={inp()} placeholder="e.g. Due mid-fall" value={fields.deadline} onChange={e => setFields(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <span style={lbl()}>Eligibility</span>
                  <input style={inp()} placeholder="Who can apply (optional)" value={fields.eligibility} onChange={e => setFields(f => ({ ...f, eligibility: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl()}>Notes / description</span>
                  <textarea style={{ ...inp(), resize: 'vertical', minHeight: 56, fontFamily: C.FB }} placeholder="What makes this scholarship worth applying to (optional)" value={fields.description} onChange={e => setFields(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              <div style={{ ...R({ gap: 6 }), marginTop: 10, fontSize: 10.5, color: C.t4 }}>
                <Info size={11} />You can add a real deadline date later from the tracked list once you've confirmed it on the official site.
              </div>

              {error && <div style={{ marginTop: 10, fontSize: 12, color: C.roseL }}>{error}</div>}

              <div style={{ ...R({ gap: 8 }), marginTop: 14 }}>
                <button onClick={save} disabled={saving} style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), opacity: saving ? 0.7 : 1 }}>
                  {saving ? <ThinkingDots color="#fff" /> : <><Check size={13} />Track this scholarship</>}
                </button>
                <button onClick={reset} disabled={saving} style={btnSm(C.s3, { color: C.t2 })}>Cancel</button>
                <button onClick={() => setPhase('name')} disabled={saving} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: C.t3, cursor: 'pointer', marginLeft: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Start over
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
