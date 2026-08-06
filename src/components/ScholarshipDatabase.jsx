import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import { Search, Landmark, Plus, Sparkles, Loader2, ExternalLink, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { C, glass2, btn, inp, R, CC, pill, tint, onTint } from '../lib/theme';
import { SCHOLARSHIPS, SCHOLARSHIP_CATEGORIES } from '../data/scholarships';
import { renderMarkdown } from '../lib/renderMarkdown';
import TrackButton from './ui/TrackButton';
import { scholarshipRowFromCatalog, scholarshipRowFromCustom, normalizeKey } from '../lib/trackingCatalog';

const fuse = new Fuse(SCHOLARSHIPS, {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'org', weight: 0.15 },
    { name: 'tags', weight: 0.25 },
    { name: 'eligibility', weight: 0.1 },
    { name: 'description', weight: 0.1 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
});

// Row construction (and the deliberate choice not to parse the prose amount/deadline into typed
// columns) lives in src/lib/trackingCatalog.js, shared with the opportunities database so both
// Track buttons capture entries the same way.

// `trackedKeys` / `pendingKeys` are Sets of dedupe keys (trackingCatalog.normalizeKey of the
// scholarship name) for what's already saved and what's queued but not yet confirmed. Without
// them every entry rendered an identical "Track" button forever — a student who tracked something
// last week had no way to tell, so the honest thing to do was tap it again, which is exactly how
// duplicate rows got created.
export default function ScholarshipDatabase({ accent = C.blue, onTrack, trackedKeys, pendingKeys, askMedabrain }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [aiLookup, setAiLookup] = useState(null); // { query, loading, content, error }

  const results = useMemo(() => {
    const base = query.trim().length >= 2
      ? fuse.search(query.trim()).map(r => r.item)
      : SCHOLARSHIPS;
    return category === 'all' ? base : base.filter(s => s.categories.includes(category));
  }, [query, category]);

  const showAiFallback = query.trim().length >= 3 && results.length === 0;

  const stateOf = (name) => {
    const key = normalizeKey(name);
    if (trackedKeys?.has(key)) return 'tracked';
    if (pendingKeys?.has(key)) return 'pending';
    return 'idle';
  };

  async function handleAdd(s) {
    setBusyId(s.id);
    try {
      const res = await onTrack(scholarshipRowFromCatalog(s), { dedupeKey: normalizeKey(s.name), label: s.name });
      if (res?.status === 'duplicate') toast(`${s.name} is already in your tracker`, { icon: '✓' });
      else if (res?.status === 'queued') {
        toast(res.reason === 'auth'
          ? `${s.name} is saved on this device — sign in to finish saving it to your account.`
          : `${s.name} is saved on this device and will finish saving when you're back online.`,
        { icon: '📥', duration: 6000 });
      } else toast.success(`${s.name} added to your tracker`);
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  }

  async function askAboutMissingScholarship() {
    const q = query.trim();
    if (!q || !askMedabrain) return;
    setAiLookup({ query: q, loading: true, content: null, error: null });
    try {
      const content = await askMedabrain(
        `The student searched the scholarship database for "${q}" and nothing matched. Using your general knowledge, tell them in 3-4 sentences what "${q}" is (if you recognize it) — who runs it, roughly what it's for, and typical eligibility. If you don't actually recognize this as a real scholarship, say so plainly instead of inventing details. Always end by telling them to confirm exact amount/deadline/eligibility on the program's own website since you cannot browse the web.`
      );
      setAiLookup({ query: q, loading: false, content, error: null });
    } catch (err) {
      setAiLookup({ query: q, loading: false, content: null, error: err.message });
    }
  }

  async function addAiResultAsCustom() {
    if (!aiLookup?.content) return;
    try {
      const row = scholarshipRowFromCustom(
        aiLookup.query,
        `${aiLookup.content}\n\n(AI-generated summary, unverified — confirm independently before applying.)`,
      );
      const res = await onTrack(row, { dedupeKey: normalizeKey(aiLookup.query), label: aiLookup.query });
      if (res?.status === 'duplicate') toast(`${aiLookup.query} is already in your tracker`, { icon: '✓' });
      else if (res?.status === 'queued') toast(`${aiLookup.query} is saved on this device and will finish saving shortly.`, { icon: '📥', duration: 6000 });
      else toast.success(`${aiLookup.query} added to your tracker`);
      setAiLookup(null); setQuery('');
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div style={CC({ gap: 14 })}>
      <div style={R({ gap: 8 })}>
        <Search size={14} color={C.t3} />
        <input
          style={inp({ flex: 1 })}
          placeholder="Search the scholarship database by name, field, or eligibility (e.g. 'women STEM', 'need-based', 'HOSA')…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SCHOLARSHIP_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={pill(category === c.id ? tint(accent, 0.22) : C.surf2, category === c.id ? onTint(accent) : C.t3,
              { cursor: 'pointer', border: `1px solid ${category === c.id ? tint(accent, 0.4) : C.b1}`, fontWeight: category === c.id ? 700 : 500 })}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.t3, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Info size={11} />
        Reference info only — amounts and deadlines shift year to year. Always confirm current details on the program's official site before applying.
      </div>

      {results.length > 0 ? (
        <div style={CC({ gap: 8 })}>
          {results.slice(0, 60).map(s => {
            const isOpen = expandedId === s.id;
            const state = stateOf(s.name);
            return (
              <div key={s.id} style={{ ...glass2({ padding: 0, overflow: 'hidden' }), borderLeft: `3px solid ${state === 'tracked' ? C.green : accent}` }}>
                <div style={{ ...R({ gap: 12, padding: 14, cursor: 'pointer' }) }} onClick={() => setExpandedId(isOpen ? null : s.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{s.org} · {s.amount}</div>
                  </div>
                  <TrackButton state={state} busy={busyId === s.id} accent={accent}
                    onClick={e => { e.stopPropagation(); handleAdd(s); }} />
                  {isOpen ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                </div>
                {isOpen && (
                  <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.b1}`, marginTop: 2, paddingTop: 12 }}>
                    <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>{s.description}</p>
                    <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7 }}>
                      <div><b style={{ color: C.t2 }}>Eligibility:</b> {s.eligibility}</div>
                      <div><b style={{ color: C.t2 }}>Typical deadline:</b> {s.deadline}</div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {s.categories.map(cid => <span key={cid} style={pill('rgba(255,255,255,0.06)', C.t3, { fontSize: 9 })}>{SCHOLARSHIP_CATEGORIES.find(c => c.id === cid)?.label || cid}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showAiFallback ? (
        <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
          <Landmark size={20} color={C.t3} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12.5, color: C.t2 }}>No matches yet — try a broader term, or browse a category above.</div>
        </div>
      ) : null}

      {showAiFallback && (
        <div style={{ ...glass2({ padding: 16 }), background: `linear-gradient(120deg,${tint(C.violet, 0.08)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.violet, 0.25)}` }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <Sparkles size={14} color={C.violetL} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.violetL }}>Not in our database</span>
          </div>
          {!aiLookup && (
            <>
              <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 10 }}>
                "{query.trim()}" isn't in our {SCHOLARSHIPS.length}-program curated list. Meta Brain can try to tell you what it knows from general training — or you can just add it as a custom entry below with your own notes.
              </p>
              {askMedabrain && (
                <button style={btn(C.violetGrad, { fontSize: 12 })} onClick={askAboutMissingScholarship}><Sparkles size={13} />Ask Meta Brain about "{query.trim()}"</button>
              )}
            </>
          )}
          {aiLookup?.loading && (
            <div style={R({ gap: 8, color: C.t3, fontSize: 12 })}><Loader2 size={14} className="spin" />Meta Brain is thinking…</div>
          )}
          {aiLookup?.error && <div style={{ fontSize: 12, color: C.rose }}>{aiLookup.error}</div>}
          {aiLookup?.content && !aiLookup.loading && (
            <div>
              <div style={{ fontSize: 13, color: C.t2 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(aiLookup.content) }} />
              <div style={{ ...R({ gap: 6, marginTop: 4 }), fontSize: 10, color: C.t4 }}><ExternalLink size={10} />AI-generated, unverified — not from the curated database above.</div>
              <button style={{ ...btn(C.violetGrad, { fontSize: 12 }), marginTop: 10 }} onClick={addAiResultAsCustom}><Plus size={13} />Add as custom scholarship</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
