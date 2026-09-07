import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CalendarCheck2, Check, Loader2, X, Mic, GraduationCap } from 'lucide-react';
import { C, glass, btn, btnSm, btnG, inp, R, CC, tint } from '../../../lib/theme';
import { submitCheckin, submitAcademicUpdate } from '../../../lib/monthPlan/store';

// ─────────────────────────────────────────────────────────────────────────────
// The weekly check-in, and the quarter-boundary academic update.
//
// ── Why this exists next to the plan rather than only in the Portfolio ──────
// The Portfolio already has a check-in banner (WeeklyCheckin.jsx) and it works;
// this is the same table, the same cadence and the same in-app-only rule. What
// is different is the consequence: answering it HERE visibly re-ranks the plan
// the student is looking at, which is the only argument for answering it that
// has ever worked. So the prompts are the plan's prompts, and the submit button
// says what it will do.
//
// ── Small on purpose ────────────────────────────────────────────────────────
// A handful of high-value questions, every one skippable, free text for all of
// them. Students dictate into this — the placeholder says so — so nothing here
// requires a dropdown, a rating, or a complete sentence.
//
// In-app only, forever. Nothing in this component sends an email or a push (see
// AGENTS.md); a skipped check-in simply comes back next time they open the tab.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The questions. Deliberately eight, deliberately answerable in one line each,
 * and deliberately ordered by how much the answer changes next week's plan.
 */
export const CHECKIN_QUESTIONS = [
  { id: 'wins', label: 'Anything finished, won, or achieved since last time?' },
  { id: 'actions', label: 'Anything on your plan you did — or decided not to?' },
  { id: 'grades', label: 'New grades, GPA update, or a course change?' },
  { id: 'service', label: 'Service or volunteering hours to add?' },
  { id: 'workload', label: 'How heavy is your week right now?' },
  { id: 'energy', label: 'How are you actually doing?' },
  { id: 'barriers', label: 'Anything blocking you — money, transport, time, nerves?' },
  { id: 'interests', label: 'Changed your mind about anything you want to do?' },
];

export default function MonthCheckin({
  accent = C.violet, isMobile = false, due = false, academicUpdateDue = false,
  onSubmitted, lastAt = null,
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [gpa, setGpa] = useState('');
  const [term, setTerm] = useState('');
  const [weighted, setWeighted] = useState(false);
  const [rigor, setRigor] = useState('');
  const [workload, setWorkload] = useState('');

  const setAnswer = useCallback((id, value) => setAnswers((a) => ({ ...a, [id]: value })), []);

  const submit = useCallback(async () => {
    const structured = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => String(v || '').trim()).map(([k, v]) => [k, String(v).trim().slice(0, 400)]),
    );
    const text = draft.trim();
    if (!text && !Object.keys(structured).length) { toast('Nothing to save yet.'); return; }
    setSaving(true);
    try {
      // The free-text box and the per-question answers are stored together: the
      // raw text is what the coach reads as current, `changes` is the structured
      // half the plan re-ranks on.
      const composed = [text, ...Object.entries(structured).map(([k, v]) => {
        const q = CHECKIN_QUESTIONS.find((x) => x.id === k);
        return `${q ? q.label : k} ${v}`;
      })].filter(Boolean).join('\n');
      await submitCheckin({ text: composed, changes: structured });
      toast.success('Got it — your plan has been re-ranked around that.');
      setDraft('');
      setAnswers({});
      setOpen(false);
      onSubmitted?.({ text: composed, changes: structured });
    } catch (err) {
      toast.error(err?.message?.slice(0, 100) || 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }, [answers, draft, onSubmitted]);

  const submitAcademics = useCallback(async () => {
    if (!String(gpa).trim() && !workload.trim()) { setAcademicOpen(false); return; }
    setSaving(true);
    try {
      await submitAcademicUpdate({ gpa: String(gpa).trim() || null, term, weighted, rigor, workloadNotes: workload });
      toast.success('Academic update saved.');
      setGpa(''); setTerm(''); setRigor(''); setWorkload('');
      setAcademicOpen(false);
      onSubmitted?.({ academic: true });
    } catch (err) {
      toast.error(err?.message?.slice(0, 100) || 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }, [gpa, term, weighted, rigor, workload, onSubmitted]);

  if (dismissed && !open && !academicOpen) return null;

  // ── The quarter-boundary nudge — separate, optional, and never a blocker ──
  const academicNudge = academicUpdateDue && !academicOpen && (
    <div style={{
      ...glass({ padding: isMobile ? 12 : 14 }),
      background: `linear-gradient(120deg,${tint(C.blue, 0.1)},transparent 60%)`,
      border: `1px solid ${tint(C.blue, 0.26)}`,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <GraduationCap size={16} color={C.blue} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Quarter change — new grades yet?</div>
        <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>
          Optional. A current GPA, your course list, or a line about how heavy the term is — all of it sharpens what this plan recommends.
        </div>
      </div>
      <button type="button" style={btn(C.blue, { fontSize: 12, padding: '8px 16px' })} onClick={() => setAcademicOpen(true)}>Update</button>
      <button type="button" style={btnSm(C.s3, { fontSize: 11 })} onClick={() => setDismissed(true)}>Not now</button>
    </div>
  );

  return (
    <div style={CC({ gap: 8 })}>
      {academicNudge}

      <AnimatePresence>
        {academicOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ overflow: 'hidden' }}>
            <div style={glass({ padding: isMobile ? 14 : 16 })}>
              <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Academic update</div>
                <button type="button" onClick={() => setAcademicOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                <label style={{ fontSize: 11.5, color: C.t3 }}>Term
                  <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Grade 11, Fall" style={inp({ fontSize: 12.5, marginTop: 4 })} />
                </label>
                <label style={{ fontSize: 11.5, color: C.t3 }}>GPA
                  <input value={gpa} onChange={(e) => setGpa(e.target.value)} inputMode="decimal" placeholder="e.g. 3.82" style={inp({ fontSize: 12.5, marginTop: 4 })} />
                </label>
                <label style={{ fontSize: 11.5, color: C.t3 }}>Course rigor
                  <input value={rigor} onChange={(e) => setRigor(e.target.value)} placeholder="e.g. 3 AP, 2 honors" style={inp({ fontSize: 12.5, marginTop: 4 })} />
                </label>
                <label style={{ fontSize: 11.5, color: C.t3, display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
                  <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
                  This GPA is weighted
                </label>
              </div>
              <label style={{ fontSize: 11.5, color: C.t3, display: 'block', marginTop: 8 }}>How heavy is the workload, in your words?
                <textarea value={workload} onChange={(e) => setWorkload(e.target.value)} placeholder="Optional — but it is what stops this plan asking too much of you."
                  style={{ ...inp({ fontSize: 12.5, marginTop: 4 }), minHeight: 64, resize: 'vertical' }} />
              </label>
              <div style={R({ gap: 8, marginTop: 8 })}>
                <button type="button" style={btn(C.blue, { fontSize: 12, opacity: saving ? 0.6 : 1 })} disabled={saving} onClick={submitAcademics}>
                  {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}Save
                </button>
                <button type="button" style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => setAcademicOpen(false)}>Skip</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && due && (
        <div style={{
          ...glass({ padding: isMobile ? 12 : 14 }),
          background: `linear-gradient(120deg,${tint(accent, 0.1)},transparent 60%)`,
          border: `1px solid ${tint(accent, 0.26)}`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <CalendarCheck2 size={16} color={accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Weekly check-in</div>
            <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>
              Thirty seconds, and it re-ranks everything below. In-app only — never emailed, never pushed.
              {lastAt ? ' Last one was a while ago.' : ''}
            </div>
          </div>
          <button type="button" style={btn(accent, { fontSize: 12, padding: '8px 16px' })} onClick={() => setOpen(true)}>Answer now</button>
          <button type="button" style={btnSm(C.s3, { fontSize: 11 })} onClick={() => setDismissed(true)}>Not now</button>
        </div>
      )}

      {!open && !due && (
        <button type="button" onClick={() => setOpen(true)} style={btnG({ fontSize: 12, padding: '8px 16px', alignSelf: 'flex-start', gap: 8 })}>
          <CalendarCheck2 size={13} color={accent} />Add a check-in anyway
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ overflow: 'hidden' }}>
            <div style={glass({ padding: isMobile ? 14 : 16 })}>
              <div style={R({ justifyContent: 'space-between', marginBottom: 8 })}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>This week</div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={14} /></button>
              </div>
              <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Mic size={12} color={C.t3} />Answer whichever ones matter. Bullet points, a ramble, or dictated — all fine.
              </div>

              <textarea
                value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Anything at all, in your own words."
                style={{ ...inp(), minHeight: 84, resize: 'vertical', fontSize: 12.5, lineHeight: 1.55 }}
              />

              <div style={CC({ gap: 8, marginTop: 8 })}>
                {CHECKIN_QUESTIONS.map((q) => (
                  <label key={q.id} style={{ fontSize: 11.5, color: C.t3 }}>
                    {q.label}
                    <input
                      value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="Optional"
                      style={inp({ fontSize: 12.5, marginTop: 4, padding: '8px 12px' })}
                    />
                  </label>
                ))}
              </div>

              <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
                <button type="button" style={btn(accent, { fontSize: 12, opacity: saving ? 0.6 : 1 })} disabled={saving} onClick={submit}>
                  {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}Save and re-rank my month
                </button>
                <button type="button" style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => setOpen(false)}>Skip this week</button>
              </div>
              <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, lineHeight: 1.5 }}>
                Only you and Medabrain see this. Your most recent answer is treated as current — nothing older overrides what you just said.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
