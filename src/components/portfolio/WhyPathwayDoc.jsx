import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import toast from 'react-hot-toast';
import { Compass, Loader2, Save, Sparkles, Clock } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, R, CC, pill, tint } from '../../lib/theme';
import { listItems, createItem, updateItem } from '../../lib/dataApi';
import { SectionTitle } from '../ui/PanelHero';
import { HelpNote } from '../ui/Disclosure';
import { WHY_PATHWAY, whyPathwayStatus, countWords } from '../../lib/healthEssays';
import { buildEssayCriticPrompt, critiqueEssay } from '../../lib/essayCritique';
import { summarizeArcForPrompt, buildVersionArc } from '../../lib/essayVersions';
import EssayVersionHistory, { VersionLabelFields } from './EssayVersionHistory';
import EssayCritique from '../EssayCritique';

// ─────────────────────────────────────────────────────────────────────────────
// "Why this pathway" — the four-year working document.
//
// The one thing in the essay workspace that is not an essay, and the reason
// this workspace is a health-pathway tool rather than a generic tracker. See
// the header of src/lib/healthEssays.js for the argument; the deliberate
// omissions here are the implementation of it:
//
//   • NO WORD LIMIT and no progress bar. There is no length this is supposed to
//     be, and a bar creeping toward a target it does not have manufactures
//     exactly the anxiety this document exists to avoid.
//   • NO STATUS LADDER. It is never "final". A document that can be finished
//     gets finished in ninth grade and never opened again.
//   • NO DEADLINE, ever, anywhere. It never enters the milestone feed and never
//     appears in a task list.
//
// What it does have is version history, which is the whole point: four years of
// a document changing shape is both the raw material for every later essay and
// the clearest possible evidence that the student wrote it themselves.
//
// It is exposed through a ref so the reflection journal can pour an answer into
// it without either component owning the other's state.
// ─────────────────────────────────────────────────────────────────────────────

const WhyPathwayDoc = forwardRef(function WhyPathwayDoc({
  accent = C.cyan, user = null, gradeLabel = null, portfolioCtx = null, isMobile = false,
}, ref) {
  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingVersion, setSavingVersion] = useState(false);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [read, setRead] = useState(null); // { loading, error, critique, ofWords }
  const draftRef = useRef('');
  draftRef.current = draft;

  // ── Load, creating the document lazily ─────────────────────────────────────
  // Created on first save rather than on first view: an empty row written the
  // moment a student glances at the tab would make "have they started?" — which
  // the rest of the app reads — permanently true and permanently meaningless.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listItems('essays');
      const found = all.find(e => e.essay_kind === WHY_PATHWAY.kind) || null;
      setDoc(found);
      setDraft(found?.content || '');
      if (found) {
        const vs = await listItems('essay_versions').catch(() => []);
        setVersions(vs.filter(v => v.essay_id === found.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))));
      }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ensureDoc = useCallback(async () => {
    if (doc) return doc;
    const created = await createItem('essays', {
      title: WHY_PATHWAY.title,
      essay_kind: WHY_PATHWAY.kind,
      prompt: 'Why this pathway — your own answer, kept and revisited across all four years.',
      status: 'drafting',
      content: draftRef.current || '',
      // No word limit exists for this document. The column is not nullable in
      // spirit anywhere else, so it carries a value that is never rendered.
      word_limit: 0,
    });
    setDoc(created);
    return created;
  }, [doc]);

  // Autosave, same debounce as the essay editor so the two behave identically.
  useEffect(() => {
    if (loading) return undefined;
    if (!doc && !draft.trim()) return undefined;
    if (doc && draft === (doc.content || '')) return undefined;
    const t = setTimeout(async () => {
      try {
        const target = await ensureDoc();
        await updateItem('essays', target.id, { content: draftRef.current });
        setDoc(prev => (prev ? { ...prev, content: draftRef.current, updated_at: new Date().toISOString() } : prev));
      } catch (err) { toast.error(err.message); }
    }, 1400);
    return () => clearTimeout(t);
  }, [draft, doc, loading, ensureDoc]);

  // The bridge from the reflection journal: an answered question can be poured
  // straight in, at the top, where the newest thinking belongs.
  useImperativeHandle(ref, () => ({
    async append(text) {
      const block = String(text || '').trim();
      if (!block) return;
      const next = draftRef.current.trim() ? `${block}\n\n───\n\n${draftRef.current}` : block;
      setDraft(next);
      const target = await ensureDoc();
      await updateItem('essays', target.id, { content: next });
      setDoc(prev => (prev ? { ...prev, content: next, updated_at: new Date().toISOString() } : prev));
    },
    wordCount: () => countWords(draftRef.current),
  }), [ensureDoc]);

  async function saveVersion() {
    const content = draft.trim();
    if (!content) { toast.error('Write something first — there is nothing to keep yet.'); return; }
    setSavingVersion(true);
    try {
      const target = await ensureDoc();
      await updateItem('essays', target.id, { content: draft });
      const version = await createItem('essay_versions', {
        essay_id: target.id, content: draft, word_count: countWords(draft),
        label: label.trim() || null, note: note.trim() || null,
      });
      setVersions(prev => [...prev, version]);
      setLabel(''); setNote('');
      toast.success('Kept. You will be able to read this back in three years.');
    } catch (err) { toast.error(err.message); }
    finally { setSavingVersion(false); }
  }

  async function runRead() {
    const text = draft.trim();
    const words = countWords(text);
    if (words < 40) { toast.error('Write a bit more first — there is not enough here to read yet.'); return; }
    setRead({ loading: true, error: null, critique: null, ofWords: words });
    try {
      const arc = buildVersionArc(versions, draft);
      const system = buildEssayCriticPrompt({
        user, gradeLabel, mode: WHY_PATHWAY.critiqueMode,
        title: WHY_PATHWAY.title, portfolio: portfolioCtx,
        draftWordCount: words, arcSummary: summarizeArcForPrompt(arc),
      });
      const critique = await critiqueEssay({ draft: text, system });
      setRead({ loading: false, error: null, critique, ofWords: words });
    } catch (err) {
      setRead({ loading: false, error: err.message, critique: null, ofWords: words });
    }
  }

  const status = useMemo(() => whyPathwayStatus(doc, versions), [doc, versions]);
  const wc = countWords(draft);

  return (
    <div style={CC({ gap: 12 })}>
      <div style={{
        ...glass({ padding: isMobile ? 15 : 19 }),
        background: `linear-gradient(120deg,${tint(accent, 0.08)},rgba(255,255,255,0.02) 58%)`,
        border: `1px solid ${tint(accent, 0.26)}`,
      }}>
        <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
          <SectionTitle icon={Compass} color={accent} extra={{ marginBottom: 0 }}>{WHY_PATHWAY.title}</SectionTitle>
          <span style={pill(C.s3, C.t3, { fontSize: 9 })}>not an essay</span>
          <span style={{ flex: 1 }} />
          {wc > 0 && <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>{wc.toLocaleString()} words</span>}
        </div>
        <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{WHY_PATHWAY.blurb}</div>

        {/* Said once, above an empty document, and never again — the hardest part
            of this document is the first paragraph, and the standard advice
            ("just start writing") is exactly what does not work here. */}
        {!loading && !wc && (
          <div style={{ ...glass2({ padding: 12 }), marginTop: 12, borderLeft: `3px solid ${tint(accent, 0.5)}` }}>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{WHY_PATHWAY.opener}</div>
          </div>
        )}

        {/* Gone quiet. Never phrased as overdue: a document with no deadline
            cannot be late, and saying it is would turn the one pressure-free
            surface in the Portfolio into another red number. */}
        {status.state === 'stale' && (
          <div style={{ ...glass2({ padding: '12px 12px' }), marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', border: `1px solid ${tint(C.amber, 0.24)}` }}>
            <Clock size={13} color={C.amberL} style={{ marginTop: 4, flexShrink: 0 }} />
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
              You have not opened this in {status.days} days. Nothing is wrong — but a term has passed since you last wrote,
              and the things that happened in it are the ones that fade. Read what is here and add whatever is now missing.
            </div>
          </div>
        )}

        <textarea
          style={{ ...inp(), minHeight: 300, resize: 'vertical', lineHeight: 1.55, marginTop: 12 }}
          value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={loading ? 'Loading…' : 'Write here. There is no length this is supposed to be.'} />

        <VersionLabelFields label={label} note={note} onLabel={setLabel} onNote={setNote} />

        <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
          <button style={btn(accent, { opacity: savingVersion || !draft.trim() ? 0.55 : 1 })}
            disabled={savingVersion || !draft.trim()} onClick={saveVersion}>
            {savingVersion ? <Loader2 size={14} className="spin" /> : <Save size={14} />}Keep a copy of today's version
          </button>
          {!read && (
            <button style={btnSm(tint(C.violet, 0.16), { color: C.violetL, fontSize: 12, opacity: wc < 40 ? 0.5 : 1 })}
              disabled={wc < 40} onClick={runRead}>
              <Sparkles size={12} />Ask what questions this raises
            </button>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <HelpNote>
            This saves itself as you type. “Keep a copy” freezes today's version so that in two years you can see what you
            used to think — which is usually the most useful thing in here. Nothing about this document is ever due.
          </HelpNote>
        </div>
      </div>

      {read && (
        <EssayCritique state={read} onRun={runRead} disabled={wc < 40}
          title="What this raises"
          rerunLabel="Read it again"
          runLabel="Ask what questions this raises"
          emptyHint="Medabrain reads this as a notebook rather than as an essay: what in here is specific enough to still be usable in three years, where you are writing the answer you think you are supposed to give, and the follow-up questions an interviewer would ask — arriving three years early. It does not score it."
          footer="Not graded, and deliberately so. This document is supposed to be unfinished." />
      )}

      <EssayVersionHistory versions={versions} currentContent={draft} accent={accent} isMobile={isMobile}
        onRestore={(v) => {
          if (!window.confirm('Bring this version back into the editor? Your current text stays saved in the history as long as you have kept a copy of it.')) return;
          setDraft(v.content || '');
          toast('Older version loaded into the editor.', { icon: '↩️' });
        }} />

      {versions.length === 0 && wc > 0 && (
        <HelpNote>
          You have not kept a dated copy yet. Once you do, this is where the four-year record lives — and it is the strongest
          evidence there is that the writing in here was yours.
        </HelpNote>
      )}
    </div>
  );
});

export default WhyPathwayDoc;
