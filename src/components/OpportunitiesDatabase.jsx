import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';
import { Search, Compass, Plus, Sparkles, Loader2, Info, ChevronDown, ChevronUp, Trophy, SlidersHorizontal, CalendarRange, Wallet, Laptop, Users, X } from 'lucide-react';
import { C, glass2, btn, inp, R, CC, pill, tint, onTint } from '../lib/theme';
import { OPPORTUNITIES, OPPORTUNITY_TYPES, OPPORTUNITY_LEVELS, OPPORTUNITY_COSTS, OPPORTUNITY_FORMATS, OPPORTUNITY_SEASONS, OPPORTUNITY_GRADES, fitsGrade, facetCounts } from '../data/opportunities';
import { showMedabrainToast } from '../lib/medabrainComments';
import { renderMarkdown } from '../lib/renderMarkdown';
import { trackTargetForOpportunity, resourceForOpportunity, catalogDedupeKey, normalizeKey } from '../lib/trackingCatalog';
import TrackButton from './ui/TrackButton';

const fuse = new Fuse(OPPORTUNITIES, {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'org', weight: 0.15 },
    { name: 'tags', weight: 0.25 },
    { name: 'desc', weight: 0.1 },
    { name: 'eligibility', weight: 0.1 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
});

// Per call, not a frozen literal — see the note in theme.js's header.
const effortColor = (effort) => ({ Elite: C.rose, Competitive: C.amber, Open: C.green }[effort]);

// The BROWSE half of Portfolio ▸ Opportunities & Competitions: search-first over
// the whole curated catalog, in ScholarshipDatabase.jsx's pattern (Fuse.js fuzzy
// search as the primary control, type pills and facet chips secondary), plus an
// honest "not in our database" path that asks Meta Brain from general knowledge
// and can save the answer as a clearly-labelled custom activity.
//
// It used to carry its own "Recommended for you" block too. That moved — and got
// substantially smarter — when Opportunities became its own tab: personalization
// now lives in OpportunitiesPanel.jsx on top of src/lib/opportunityMatch.js,
// which reasons over interests, ECs, pathway and grade rather than activity-type
// counts alone. Two competing recommenders on one screen would have been two
// different answers to the same question, so this component is deliberately just
// the catalog now.
//
// `onTrack(resource, row, { dedupeKey, label })` is the durable tracking entry point (see
// src/lib/trackQueue.js); `trackedKeys`/`pendingKeys` are `{ activities, scholarships }` maps of
// dedupe-key Sets so each row can show whether it's already saved. Both trackers are represented
// because a type:'Scholarship' entry here belongs in the Financial Aid tracker, not the activity
// list — see resourceForOpportunity().
export default function OpportunitiesDatabase({ accent = C.blue, onTrack, trackedKeys, pendingKeys, askMedabrain, activityCount = 0 }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  // Secondary facets, collapsed behind a toggle so the search-first shape of this tab survives
  // going from 120 to 220 programs. `null` on any of them means "don't filter on this".
  const [showFilters, setShowFilters] = useState(false);
  const [level, setLevel] = useState(null);
  const [effort, setEffort] = useState(null);
  const [cost, setCost] = useState(null);
  const [format, setFormat] = useState(null);
  const [season, setSeason] = useState(null);
  const [grade, setGrade] = useState(null);
  const [sort, setSort] = useState('relevance');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [aiLookup, setAiLookup] = useState(null); // { query, loading, content, error }

  // Facet filters are AND-ed, and an entry that simply doesn't declare a facet is EXCLUDED when
  // that facet is being filtered on rather than quietly assumed into a bucket — the catalog's
  // whole premise is not stating things with more confidence than they deserve (see the header
  // of src/data/opportunities.js), and "probably free" is exactly the kind of guess that gets a
  // student to show up somewhere expecting not to pay.
  const results = useMemo(() => {
    const base = query.trim().length >= 2 ? fuse.search(query.trim()).map(r => r.item) : OPPORTUNITIES;
    const filtered = base.filter(o => (
      (type === 'All' || o.type === type)
      && (!level || o.level === level)
      && (!effort || o.effort === effort)
      && (!cost || o.cost === cost)
      && (!format || o.format === format)
      && (!season || o.season === season)
      && fitsGrade(o, grade)
    ));
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'accessible') {
      // Easiest to actually get into first — the ordering a student with no résumé yet needs.
      const rank = { Open: 0, Competitive: 1, Elite: 2 };
      return [...filtered].sort((a, b) => (rank[a.effort] - rank[b.effort]) || a.name.localeCompare(b.name));
    }
    if (sort === 'selective') {
      const rank = { Elite: 0, Competitive: 1, Open: 2 };
      return [...filtered].sort((a, b) => (rank[a.effort] - rank[b.effort]) || a.name.localeCompare(b.name));
    }
    return filtered; // relevance: Fuse order when searching, curated order otherwise
  }, [query, type, level, effort, cost, format, season, grade, sort]);

  const activeFilters = [level, effort, cost, format, season, grade].filter(Boolean).length;
  const costMissing = useMemo(() => facetCounts(OPPORTUNITIES, 'cost').missing, []);
  function clearFilters() {
    setLevel(null); setEffort(null); setCost(null); setFormat(null); setSeason(null); setGrade(null);
  }

  const showAiFallback = query.trim().length >= 3 && results.length === 0;

  const stateOf = (o) => {
    const resource = resourceForOpportunity(o);
    const key = catalogDedupeKey(resource, o);
    if (trackedKeys?.[resource]?.has(key)) return 'tracked';
    if (pendingKeys?.[resource]?.has(key)) return 'pending';
    return 'idle';
  };

  async function handleAdd(o) {
    setBusyId(o.id);
    try {
      const { resource, row } = trackTargetForOpportunity(o, { sortOrder: activityCount });
      const res = await onTrack(resource, row, { dedupeKey: catalogDedupeKey(resource, o), label: o.name });
      if (res?.status === 'duplicate') {
        toast(`${o.name.slice(0, 40)} is already tracked`, { icon: '✓' });
      } else if (res?.status === 'queued') {
        toast(res.reason === 'auth'
          ? `${o.name.slice(0, 40)} is saved on this device — sign in to finish saving it to your account.`
          : `${o.name.slice(0, 40)} is saved on this device and will finish saving when you're back online.`,
        { icon: '📥', duration: 6000 });
      } else {
        showMedabrainToast('opportunity_added', { name: o.name, type: o.type });
        toast.success(resource === 'scholarships'
          ? `Added to your scholarship tracker: ${o.name.slice(0, 40)}`
          : `Added: ${o.name.slice(0, 40)}`);
      }
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  }

  async function askAboutMissingOpportunity() {
    const q = query.trim();
    if (!q || !askMedabrain) return;
    setAiLookup({ query: q, loading: true, content: null, error: null });
    try {
      const content = await askMedabrain(
        `The student searched the Opportunities & Competitions database for "${q}" and nothing matched. Using your general knowledge, tell them in 3-4 sentences what "${q}" is (if you recognize it) — who runs it, roughly what it's for, and typical eligibility. If you don't actually recognize this as a real program, say so plainly instead of inventing details. Always end by telling them to confirm current details on the program's own website since you cannot browse the web.`
      );
      setAiLookup({ query: q, loading: false, content, error: null });
    } catch (err) {
      setAiLookup({ query: q, loading: false, content: null, error: err.message });
    }
  }

  async function addAiResultAsCustom() {
    if (!aiLookup?.content) return;
    try {
      const row = {
        activity_type: 'Other', position: aiLookup.query, organization: '',
        description: `${aiLookup.content}\n\n(AI-generated summary, unverified — confirm independently.)`,
        status: 'ongoing', hours_per_week: 0, weeks_per_year: 0, grade_levels: [], sort_order: activityCount,
      };
      const res = await onTrack('activities', row, { dedupeKey: normalizeKey(aiLookup.query), label: aiLookup.query });
      if (res?.status === 'duplicate') toast(`${aiLookup.query} is already tracked`, { icon: '✓' });
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
          placeholder="Search opportunities by name, field, or eligibility (e.g. 'research', 'volunteering', 'HOSA')…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {OPPORTUNITY_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            style={pill(type === t ? tint(accent, 0.22) : C.surf2, type === t ? onTint(accent) : C.t3,
              { cursor: 'pointer', border: `1px solid ${type === t ? tint(accent, 0.4) : C.b1}`, fontWeight: type === t ? 700 : 500 })}>
            {t}
          </button>
        ))}
        <button onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
          style={pill(activeFilters ? tint(C.violet, 0.2) : C.surf2, activeFilters ? onTint(C.violet) : C.t3,
            { cursor: 'pointer', border: `1px solid ${activeFilters ? tint(C.violet, 0.35) : C.b1}`, gap: 4, marginLeft: 'auto' })}>
          <SlidersHorizontal size={11} />Filters{activeFilters ? ` · ${activeFilters}` : ''}
        </button>
      </div>

      {/* Secondary facets. Every chip row is generated from the exported constants in
          src/data/opportunities.js, so a new value in the data can never end up unreachable. */}
      {showFilters && (
        <div style={{ ...glass2({ padding: 12 }), display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FacetRow icon={Users} label="Grade" options={OPPORTUNITY_GRADES} value={grade} onChange={setGrade} accent={accent} format={g => `Grade ${g}`} />
          <FacetRow icon={Trophy} label="Selectivity" options={['Open', 'Competitive', 'Elite']} value={effort} onChange={setEffort} accent={accent} />
          <FacetRow icon={Wallet} label="Cost" options={OPPORTUNITY_COSTS} value={cost} onChange={setCost} accent={accent} />
          <FacetRow icon={Laptop} label="Format" options={OPPORTUNITY_FORMATS} value={format} onChange={setFormat} accent={accent} />
          <FacetRow icon={CalendarRange} label="When" options={OPPORTUNITY_SEASONS} value={season} onChange={setSeason} accent={accent} />
          <FacetRow icon={Compass} label="Reach" options={OPPORTUNITY_LEVELS} value={level} onChange={setLevel} accent={accent} />
          <div style={R({ gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: `1px solid ${C.b1}` })}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>Sort</span>
            {[['relevance', 'Best match'], ['accessible', 'Easiest to join'], ['selective', 'Most selective'], ['name', 'A–Z']].map(([id, label]) => (
              <button key={id} onClick={() => setSort(id)}
                style={pill(sort === id ? tint(accent, 0.2) : C.surf2, sort === id ? onTint(accent) : C.t3,
                  { cursor: 'pointer', border: `1px solid ${sort === id ? tint(accent, 0.35) : C.b1}`, fontSize: 10.5 })}>{label}</button>
            ))}
            {activeFilters > 0 && (
              <button onClick={clearFilters} style={pill('transparent', C.t3, { cursor: 'pointer', border: `1px solid ${C.b1}`, fontSize: 10.5, gap: 4, marginLeft: 'auto' })}>
                <X size={10} />Clear filters
              </button>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
            Cost, format, timing, and grade are only recorded where they're stable year to year — {costMissing} of the {OPPORTUNITIES.length} programs don't list a cost yet, and filtering on a facet hides the entries that don't declare it rather than guessing.
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.t3, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Info size={11} />
        Reference info only — {results.length} of {OPPORTUNITIES.length} real programs shown. Confirm current details with the program before applying; anything you Track lands on your Tracked tab with a daily Meta Brain report on it.
      </div>

      {results.length > 0 ? (
        <div style={CC({ gap: 8 })}>
          {results.slice(0, 60).map(o => {
            const isOpen = expandedId === o.id;
            const ec = effortColor(o.effort) || C.t2;
            const state = stateOf(o);
            return (
              <div key={o.id} style={{ ...glass2({ padding: 0, overflow: 'hidden' }), borderLeft: `3px solid ${state === 'tracked' ? C.green : ec}` }}>
                <div style={{ ...R({ gap: 12, padding: 12, cursor: 'pointer' }) }} onClick={() => setExpandedId(isOpen ? null : o.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{o.org} · {o.type} · {o.level}</div>
                    {(o.cost || o.season || o.format || o.grades) && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {o.cost && <span style={pill(tint(o.cost === 'Free' || o.cost === 'Free + stipend' || o.cost === 'Paid role' ? C.green : C.t3, 0.13), o.cost === 'Free' || o.cost === 'Free + stipend' || o.cost === 'Paid role' ? C.greenL : C.t3, { fontSize: 9 })}>{o.cost}</span>}
                        {o.season && <span style={pill('rgba(255,255,255,0.06)', C.t3, { fontSize: 9 })}>{o.season}</span>}
                        {o.format && <span style={pill('rgba(255,255,255,0.06)', C.t3, { fontSize: 9 })}>{o.format}</span>}
                        {o.grades && <span style={pill('rgba(255,255,255,0.06)', C.t3, { fontSize: 9 })}>Grades {o.grades.join(', ')}</span>}
                      </div>
                    )}
                  </div>
                  <TrackButton state={state} busy={busyId === o.id} accent={accent}
                    onClick={e => { e.stopPropagation(); handleAdd(o); }} />
                  {isOpen ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                </div>
                {isOpen && (
                  <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, marginTop: 4, paddingTop: 12 }}>
                    <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>{o.desc}</p>
                    <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7 }}>
                      <div><b style={{ color: C.t2 }}>Eligibility:</b> {o.eligibility}</div>
                      {o.cost && <div><b style={{ color: C.t2 }}>Cost:</b> {o.cost}</div>}
                      {o.season && <div><b style={{ color: C.t2 }}>Runs:</b> {o.season}{o.format ? ` · ${o.format}` : ''}</div>}
                      {o.grades && <div><b style={{ color: C.t2 }}>Typical grades:</b> {o.grades.join(', ')}</div>}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={pill(`${ec}18`, ec, { fontSize: 9 })}>{o.effort}</span>
                      {(o.tags || []).map(t => <span key={t} style={pill('rgba(255,255,255,0.06)', C.t3, { fontSize: 9 })}>{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showAiFallback ? (
        <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
          <Compass size={20} color={C.t3} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12.5, color: C.t2 }}>No matches yet — try a broader term, or browse a type above.</div>
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
                "{query.trim()}" isn't in our {OPPORTUNITIES.length}-program curated list. Meta Brain can try to tell you what it knows from general knowledge — or you can just add it as a custom entry below.
              </p>
              {askMedabrain && (
                <button style={btn(C.violetGrad, { fontSize: 12 })} onClick={askAboutMissingOpportunity}><Sparkles size={13} />Ask Meta Brain about "{query.trim()}"</button>
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
              <div style={{ ...R({ gap: 4, marginTop: 4 }), fontSize: 10, color: C.t4 }}>AI-generated, unverified — not from the curated database above.</div>
              <button style={{ ...btn(C.violetGrad, { fontSize: 12 }), marginTop: 8 }} onClick={addAiResultAsCustom}><Plus size={13} />Add as custom activity</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// One row of the secondary filter panel. Tapping the active chip clears that facet, so every
// filter is its own undo — no separate "off" chip, and no state you can get stuck in.
function FacetRow({ icon: Icon, label, options, value, onChange, accent, format = (v) => v }) {
  return (
    <div style={R({ gap: 8, flexWrap: 'wrap' })}>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 92 }}>
        <Icon size={11} />{label}
      </span>
      {options.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(active ? null : opt)} aria-pressed={active}
            style={pill(active ? tint(accent, 0.2) : C.surf2, active ? onTint(accent) : C.t3,
              { cursor: 'pointer', border: `1px solid ${active ? tint(accent, 0.35) : C.b1}`, fontSize: 10.5 })}>
            {format(opt)}
          </button>
        );
      })}
    </div>
  );
}
