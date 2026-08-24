import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  NotebookPen, Sparkles, CalendarClock, Plus, ArrowDownToLine, Trash2, Check, Loader2,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, R, CC, pill, tint, onTint } from '../../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../../lib/dataApi';
import { SectionTitle } from '../ui/PanelHero';
import Disclosure, { HelpNote } from '../ui/Disclosure';
import {
  nextReflectionPrompt, REFLECTION_PROMPTS, REFLECTION_CADENCE_DAYS, seasonLabel, countWords,
} from '../../lib/healthEssays';

// ─────────────────────────────────────────────────────────────────────────────
// The reflection journal — and the question engine behind it.
//
// This is the surface a ninth- or tenth-grader actually works in, and it is the
// one part of the whole Portfolio that is deliberately not a task. Nothing here
// is due, nothing is overdue, nothing appears in a task list, and no counter
// goes red because a question went unanswered for two months. That restraint is
// the feature: a fifteen-year-old who is told they are behind on reflecting
// stops reflecting and starts performing, and a performed answer is worthless
// as raw material three years later.
//
// The question is asked once, in words a teenager would use, pinned to the
// weeks when the answer exists (see src/lib/healthEssays.js for why the summer
// question is a September question). If they wrote recently, nothing is asked
// at all — silence is a legitimate output.
//
// Answering writes a `reflection_entries` row, never an `essays` row, so a
// journal entry can never be counted as an application essay by anything that
// counts application essays. The one bridge is `onAppendToDoc`: the student can
// pour an answer into the four-year working document, which is exactly the move
// this whole design exists to make cheap.
// ─────────────────────────────────────────────────────────────────────────────

export default function ReflectionJournal({
  accent = C.teal, gradeStage = null, isMobile = false,
  primary = false,            // 9th/10th grade: this is the working surface, not a side panel
  onAppendToDoc = null,       // (text) => Promise — pours an answer into the working document
  onEntriesChange = null,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [appendingId, setAppendingId] = useState(null);
  // A question the student asked for instead of the one we offered. Held here rather than
  // replacing the engine's answer so "ask me something else" never loses the seasonal one.
  const [pickedId, setPickedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listItems('reflection_entries');
      setEntries(rows);
      onEntriesChange?.(rows);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [onEntriesChange]);
  useEffect(() => { load(); }, [load]);

  const due = useMemo(
    () => nextReflectionPrompt({ gradeStage, entries }),
    [gradeStage, entries],
  );
  const picked = pickedId ? REFLECTION_PROMPTS.find(p => p.id === pickedId) : null;
  const active = picked || due?.prompt || null;

  // Questions they could ask for instead — unanswered, right class year, not the one on offer.
  const alternatives = useMemo(() => {
    const answered = new Set(entries.filter(e => e.prompt_id).map(e => e.prompt_id));
    return REFLECTION_PROMPTS.filter(p =>
      (!gradeStage || p.grades.includes(gradeStage)) &&
      !answered.has(p.id) && p.id !== active?.id);
  }, [entries, gradeStage, active?.id]);

  async function saveEntry() {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    try {
      const row = await createItem('reflection_entries', {
        prompt_id: active?.id || null,
        prompt_text: active?.question || null,
        content,
      });
      const next = [...entries, row];
      setEntries(next);
      onEntriesChange?.(next);
      setDraft('');
      setPickedId(null);
      toast.success('Kept. Nobody sees this but you.');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    onEntriesChange?.(next);
    try { await deleteItem('reflection_entries', id); } catch (err) { toast.error(err.message); }
  }

  async function appendEntry(entry) {
    if (!onAppendToDoc) return;
    setAppendingId(entry.id);
    try {
      const header = entry.prompt_text ? `${entry.prompt_text}\n(${fmt(entry.entry_date)})` : `From your journal, ${fmt(entry.entry_date)}`;
      await onAppendToDoc(`${header}\n\n${entry.content}`);
      toast.success('Added to your working document.');
    } catch (err) { toast.error(err.message); }
    finally { setAppendingId(null); }
  }

  const sorted = useMemo(
    () => [...entries].sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date))),
    [entries],
  );
  const totalWords = entries.reduce((n, e) => n + countWords(e.content), 0);

  return (
    <div style={CC({ gap: 12 })}>
      {/* ── The question ────────────────────────────────────────────────────
          The engine returns null when they wrote recently. That is not an empty
          state to be filled with encouragement — it is the correct answer, and
          the free-write box below stays available regardless. */}
      {active ? (
        <div style={{
          ...glass({ padding: isMobile ? 15 : 19 }),
          background: `linear-gradient(120deg,${tint(accent, 0.09)},rgba(255,255,255,0.02) 58%)`,
          border: `1px solid ${tint(accent, 0.3)}`,
        }}>
          <div style={R({ gap: 8, marginBottom: 8, flexWrap: 'wrap' })}>
            <Sparkles size={13} color={accent} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
              {picked ? 'Your question' : due?.urgency === 'season' ? 'Ask yourself this now' : 'Your question this month'}
            </span>
            {!picked && active.season && (
              <span style={pill(C.s3, C.t3, { fontSize: 9 })}>best answered in {seasonLabel(active.season)}</span>
            )}
          </div>

          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.t1, lineHeight: 1.4, fontFamily: C.FD }}>
            {active.question}
          </div>
          {active.nudge && (
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{active.nudge}</div>
          )}

          <textarea
            style={{ ...inp(), minHeight: 150, resize: 'vertical', lineHeight: 1.55, marginTop: 12 }}
            value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="However it comes out. Nobody reads this but you." />

          <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
            <button style={btn(accent, { opacity: draft.trim() && !saving ? 1 : 0.5 })}
              disabled={!draft.trim() || saving} onClick={saveEntry}>
              {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}Keep this
            </button>
            {alternatives.length > 0 && (
              <button style={btnSm(C.s3, { color: C.t3, fontSize: 11.5 })}
                onClick={() => setPickedId(alternatives[Math.floor(Math.random() * alternatives.length)].id)}>
                Ask me something else
              </button>
            )}
          </div>

          {!picked && due?.reason && (
            <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55, marginTop: 12, fontStyle: 'italic' }}>
              {due.reason}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...glass2({ padding: 16 }), display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <CalendarClock size={14} color={C.t3} style={{ marginTop: 4, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
            {loading
              ? 'Loading your journal…'
              : entries.length
                ? `You wrote recently, so there is no question waiting. The next one comes round in about ${REFLECTION_CADENCE_DAYS} days — or write anything you like below now.`
                : 'No question waiting right now. Write whatever you want below.'}
          </div>
        </div>
      )}

      {/* Free-write, always available. A question is an offer, never a form. */}
      {!active && (
        <div style={glass({ padding: isMobile ? 14 : 17 })}>
          <SectionTitle icon={Plus} color={accent}>Write something anyway</SectionTitle>
          <textarea style={{ ...inp(), minHeight: 110, resize: 'vertical', lineHeight: 1.55 }}
            value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Anything you saw, heard or thought that you want to still have in three years." />
          <div style={{ marginTop: 8 }}>
            <button style={btn(accent, { opacity: draft.trim() && !saving ? 1 : 0.5 })}
              disabled={!draft.trim() || saving} onClick={saveEntry}>
              {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}Keep this
            </button>
          </div>
        </div>
      )}

      {/* ── What they have written ──────────────────────────────────────────
          Open by default when the journal is the student's primary surface;
          a door otherwise, so an upperclassman's essay tab is not led by it. */}
      {sorted.length > 0 && (
        <Disclosure id="reflection-entries" icon={NotebookPen} color={accent} m={isMobile}
          defaultOpen={primary}
          title={`What you've written (${sorted.length})`}
          sub={`${totalWords.toLocaleString()} words of raw material, newest first. This is what your essays get built out of.`}>
          <div style={CC({ gap: 8 })}>
            {sorted.map(entry => (
              <div key={entry.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${tint(accent, 0.5)}` }}>
                <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.t2, lineHeight: 1.45, flex: 1, minWidth: 0 }}>
                    {entry.prompt_text || 'Unprompted'}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, flexShrink: 0 }}>{fmt(entry.entry_date)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginTop: 8, whiteSpace: 'pre-wrap' }}>{entry.content}</div>
                <div style={R({ gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>{countWords(entry.content)} words</span>
                  <span style={{ flex: 1 }} />
                  {onAppendToDoc && (
                    <button style={btnSm(tint(accent, 0.16), { color: onTint(accent), fontSize: 11 })}
                      disabled={appendingId === entry.id} onClick={() => appendEntry(entry)}>
                      {appendingId === entry.id ? <Loader2 size={11} className="spin" /> : <ArrowDownToLine size={11} />}
                      Add to working document
                    </button>
                  )}
                  <button style={btnSm(C.roseDim, { color: C.rose, fontSize: 11, padding: '4px 8px' })}
                    onClick={() => removeEntry(entry.id)} aria-label="Delete entry"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <HelpNote>Nothing here is submitted anywhere or shown to anyone. It exists so that in three years you still have the actual memory rather than a summary of it.</HelpNote>
          </div>
        </Disclosure>
      )}
    </div>
  );
}

const fmt = (d) => {
  if (!d) return '';
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Exported so the panel can patch an entry without re-implementing the call. */
export const patchEntry = (id, patch) => updateItem('reflection_entries', id, patch);
