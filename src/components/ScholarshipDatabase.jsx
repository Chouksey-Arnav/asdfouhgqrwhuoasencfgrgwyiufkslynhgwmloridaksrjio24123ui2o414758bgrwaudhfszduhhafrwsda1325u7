import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import { Search, Landmark, Plus, Sparkles, Loader2, ExternalLink, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { C, glass2, btn, inp, R, CC, pill, tint, onTint } from '../lib/theme';
import { SCHOLARSHIPS, SCHOLARSHIP_CATEGORIES } from '../data/scholarships';
import { renderMarkdown } from '../lib/renderMarkdown';
import TrackButton from './ui/TrackButton';
import { scholarshipRowFromCatalog, scholarshipRowFromCustom, normalizeKey } from '../lib/trackingCatalog';
import { openToSeniors, seniorExclusionReason, scholarshipCounts } from '../lib/scholarshipFilters';
import { useSearchFocus } from '../lib/useSearchFocus';

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
// `focus` is the app-wide search landing on one specific award: `{ id, q, n }`,
// handed down from App.jsx when a ⌘K result opened this page. See the header of
// src/lib/contentSearch.js — arriving on the Financial Aid page and leaving a
// student to find the scholarship they typed the name of among ninety cards is
// the same wall the search exists to remove, with one extra step in front of it.
export default function ScholarshipDatabase({ accent = C.blue, onTrack, trackedKeys, pendingKeys, askMedabrain, focus = null }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [aiLookup, setAiLookup] = useState(null); // { query, loading, content, error }
  // Off by default, because this database is used by ninth-graders too and a
  // senior filter left on would quietly hide the awards they should be aiming
  // at for three years. On, it hides only the four entries whose own
  // eligibility text rules a senior out — see src/lib/scholarshipFilters.js.
  const [seniorOnly, setSeniorOnly] = useState(false);
  const counts = scholarshipCounts();

  // Arriving from the app-wide search. Every filter that could hide the answer
  // is cleared on the way in — a student who searched by name did not ask to
  // keep whichever category chip they left selected a week ago, and a landing
  // that shows "no matches" for a record we just told them we had is worse than
  // never having offered it.
  const focusRef = useSearchFocus(focus, ({ id, q }) => {
    setQuery(q);
    setCategory('all');
    setSeniorOnly(false);
    setExpandedId(id);
    setAiLookup(null);
  });

  const results = useMemo(() => {
    const base = query.trim().length >= 2
      ? fuse.search(query.trim()).map(r => r.item)
      : SCHOLARSHIPS;
    const byCategory = category === 'all' ? base : base.filter(s => s.categories.includes(category));
    return seniorOnly ? byCategory.filter(openToSeniors) : byCategory;
  }, [query, category, seniorOnly]);

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
    <div style={CC({ gap: 12 })}>
      <div style={R({ gap: 8 })}>
        <Search size={14} color={C.t3} />
        <input
          style={inp({ flex: 1 })}
          placeholder="Search the scholarship database by name, field, or eligibility (e.g. 'women STEM', 'need-based', 'HOSA')…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {SCHOLARSHIP_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={pill(category === c.id ? tint(accent, 0.22) : C.surf2, category === c.id ? onTint(accent) : C.t3,
              { cursor: 'pointer', border: `1px solid ${category === c.id ? tint(accent, 0.4) : C.b1}`, fontWeight: category === c.id ? 700 : 500 })}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <button type="button" onClick={() => setSeniorOnly(v => !v)}
          style={pill(seniorOnly ? tint(C.green, 0.2) : C.surf2, seniorOnly ? C.greenL : C.t3, {
            cursor: 'pointer', border: `1px solid ${seniorOnly ? tint(C.green, 0.36) : C.b1}`,
            fontWeight: seniorOnly ? 700 : 500,
          })}>
          Only what a senior can apply for now
        </button>
        {seniorOnly && (
          <span style={{ fontSize: 11, color: C.t4 }}>
            Hiding {counts.excluded}: National Merit (entered as a junior), Goldwater (college),
            AAMC fee assistance (medical school) and the first-gen reminder entry.
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.t3, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Info size={11} />
        Reference info only — amounts and deadlines shift year to year. Always confirm current details on the program's official site before applying.
      </div>

      {results.length > 0 ? (
        <div style={CC({ gap: 8 })}>
          {results.slice(0, 60).map(s => {
            const isOpen = expandedId === s.id;
            const state = stateOf(s.name);
            return (
              <div key={s.id} ref={focus?.id === s.id ? focusRef : undefined}
                style={{ ...glass2({ padding: 0, overflow: 'hidden' }), borderLeft: `3px solid ${state === 'tracked' ? C.green : accent}` }}>
                <div style={{ ...R({ gap: 12, padding: 12, cursor: 'pointer' }) }} onClick={() => setExpandedId(isOpen ? null : s.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{s.org} · {s.amount}</div>
                  </div>
                  <TrackButton state={state} busy={busyId === s.id} accent={accent}
                    onClick={e => { e.stopPropagation(); handleAdd(s); }} />
                  {isOpen ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                </div>
                {isOpen && (
                  <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, marginTop: 4, paddingTop: 12 }}>
                    <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>{s.description}</p>
                    <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7 }}>
                      <div><b style={{ color: C.t2 }}>Eligibility:</b> {s.eligibility}</div>
                      <div><b style={{ color: C.t2 }}>Typical deadline:</b> {s.deadline}</div>
                    </div>
                    {/* A senior reading this needs to know BEFORE they start writing that this
                        particular door closed a year ago — the four entries where that is true
                        say so here rather than only being filtered out. */}
                    {seniorExclusionReason(s) && (
                      <div style={{
                        marginTop: 8, padding: '8px 8px', borderRadius: 8,
                        background: tint(C.amber, 0.06), border: `1px solid ${tint(C.amber, 0.22)}`,
                        fontSize: 11.5, color: C.t2, lineHeight: 1.55,
                      }}>
                        <b style={{ color: C.amberL }}>Not open to a current senior:</b> {seniorExclusionReason(s)}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
              <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>
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
              <div style={{ ...R({ gap: 4, marginTop: 4 }), fontSize: 10, color: C.t4 }}><ExternalLink size={10} />AI-generated, unverified — not from the curated database above.</div>
              <button style={{ ...btn(C.violetGrad, { fontSize: 12 }), marginTop: 8 }} onClick={addAiResultAsCustom}><Plus size={13} />Add as custom scholarship</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
