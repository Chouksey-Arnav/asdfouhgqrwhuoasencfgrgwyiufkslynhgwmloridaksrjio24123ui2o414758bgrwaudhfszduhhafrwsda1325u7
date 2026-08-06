import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Compass, Plus, Sparkles, Loader2, Info, ChevronDown, ChevronUp, Trophy, Medal, SlidersHorizontal, CalendarRange, Wallet, Laptop, Users, X } from 'lucide-react';
import { C, glass, glass2, btn, inp, R, CC, pill, tint, onTint } from '../lib/theme';
import { listItems } from '../lib/dataApi';
import { OPPORTUNITIES, OPPORTUNITY_TYPES, OPPORTUNITY_LEVELS, OPPORTUNITY_COSTS, OPPORTUNITY_FORMATS, OPPORTUNITY_SEASONS, OPPORTUNITY_GRADES, fitsGrade, facetCounts } from '../data/opportunities';
import { rankOpportunities } from '../lib/recommendOpportunities';
import { showMedabrainToast } from '../lib/medabrainComments';
import { getCached, setCached, dailyKey } from '../lib/aiCache';
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
const RANK_STYLE = {
  1: { grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', glow: 'rgba(245,158,11,0.35)', Icon: Trophy },
  2: { grad: 'linear-gradient(135deg,#94a3b8,#cbd5e1)', glow: 'rgba(148,163,184,0.25)', Icon: Medal },
  3: { grad: 'linear-gradient(135deg,#c2733a,#e0985c)', glow: 'rgba(194,115,58,0.25)', Icon: Medal },
};

// This tab used to be a bare 20-item array behind a category `<select>` — no
// search, no personalization, no AI integration despite the `portfolio` Groq
// key existing exactly for this kind of surface (see GROQ_SETUP.md). Rebuilt
// to match ScholarshipDatabase.jsx's search-first pattern (Fuse.js fuzzy
// search as the primary control, category pills secondary), plus a
// deterministic "Recommended for you" ranking (rankOpportunities(), same
// shape as the Prep tab's quiz recommender) and a daily-cached Meta Brain
// blurb grounded in the student's real Portfolio activities.
// `onTrack(resource, row, { dedupeKey, label })` is the durable tracking entry point (see
// src/lib/trackQueue.js); `trackedKeys`/`pendingKeys` are `{ activities, scholarships }` maps of
// dedupe-key Sets so each row can show whether it's already saved. Both trackers are represented
// because a type:'Scholarship' entry here belongs in the Financial Aid tracker, not the activity
// list — see resourceForOpportunity().
export default function OpportunitiesDatabase({ accent = C.blue, onTrack, trackedKeys, pendingKeys, askMedabrain, pathwayKey = null, pathwayLabel = 'college prep', user = null, activityCount = 0 }) {
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
  const [portfolioSignals, setPortfolioSignals] = useState(null); // { activityTypeCounts, clinicalHours, researchCount }
  const [brainSummary, setBrainSummary] = useState(null); // { loading, content, error }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listItems('activities').catch(() => []),
      listItems('clinical_hours').catch(() => []),
      listItems('research_experience').catch(() => []),
    ]).then(([activities, clinicalHours, research]) => {
      if (cancelled) return;
      const activityTypeCounts = {};
      (activities || []).forEach(a => { activityTypeCounts[a.activity_type] = (activityTypeCounts[a.activity_type] || 0) + 1; });
      const totalClinicalHours = (clinicalHours || []).reduce((s, h) => s + (h.hours || 0), 0);
      setPortfolioSignals({ activityTypeCounts, clinicalHours: totalClinicalHours, researchCount: (research || []).length });
    });
    return () => { cancelled = true; };
  }, []);

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

  const ranked = useMemo(() => {
    if (!portfolioSignals) return [];
    return rankOpportunities({
      opportunities: OPPORTUNITIES,
      activityTypeCounts: portfolioSignals.activityTypeCounts,
      clinicalHours: portfolioSignals.clinicalHours,
      researchCount: portfolioSignals.researchCount,
      pathwayKey, pathwayLabel, count: 3,
    });
  }, [portfolioSignals, pathwayKey, pathwayLabel]);

  // Daily-cached Meta Brain blurb — keyed on the account (falls back to a
  // stable local id when signed out) AND the actual ranked-item ids plus raw
  // portfolio signal values, not just the date, so a changed portfolio (or a
  // different account on the same device) never serves a stale/mismatched
  // recommendation from cache — same convention DeadlinesPanel already uses
  // for its priority summary, just extended with the account identity too.
  const cacheKey = useMemo(() => {
    if (!portfolioSignals || !ranked.length) return null;
    const sig = `${JSON.stringify(portfolioSignals.activityTypeCounts)}|${portfolioSignals.clinicalHours}|${portfolioSignals.researchCount}|${pathwayKey}`;
    return dailyKey('opportunitiesPriority', user?.id || user?.email || 'anon', ranked.map(r => r.item.id).join(','), sig);
  }, [portfolioSignals, ranked, pathwayKey, user]);

  useEffect(() => {
    if (!askMedabrain || !cacheKey || !ranked.length) { setBrainSummary(null); return; }
    const cached = getCached(cacheKey);
    if (cached) { setBrainSummary({ loading: false, content: cached, error: null }); return; }
    let cancelled = false;
    setBrainSummary({ loading: true, content: null, error: null });
    const list = ranked.map(r => `${r.item.name} (${r.item.type}, ${r.item.effort})`).join(', ');
    askMedabrain(`Here are this student's top-ranked Opportunities & Competitions picks right now, already ranked by a deterministic algorithm against their real Portfolio activities: ${list}. In 2-3 concise sentences, tell them why these specific picks make sense for them right now. Only reference items from this exact list — never invent one.`)
      .then(content => { if (!cancelled) { setCached(cacheKey, content); setBrainSummary({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) setBrainSummary({ loading: false, content: null, error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, App.jsx recreates it every render
  }, [cacheKey]);

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
    <div style={CC({ gap: 14 })}>
      <div style={R({ gap: 8 })}>
        <Search size={14} color={C.t3} />
        <input
          style={inp({ flex: 1 })}
          placeholder="Search opportunities by name, field, or eligibility (e.g. 'research', 'volunteering', 'HOSA')…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {OPPORTUNITY_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            style={pill(type === t ? tint(accent, 0.22) : C.surf2, type === t ? onTint(accent) : C.t3,
              { cursor: 'pointer', border: `1px solid ${type === t ? tint(accent, 0.4) : C.b1}`, fontWeight: type === t ? 700 : 500 })}>
            {t}
          </button>
        ))}
        <button onClick={() => setShowFilters(f => !f)} aria-expanded={showFilters}
          style={pill(activeFilters ? tint(C.violet, 0.2) : C.surf2, activeFilters ? onTint(C.violet) : C.t3,
            { cursor: 'pointer', border: `1px solid ${activeFilters ? tint(C.violet, 0.35) : C.b1}`, gap: 5, marginLeft: 'auto' })}>
          <SlidersHorizontal size={11} />Filters{activeFilters ? ` · ${activeFilters}` : ''}
        </button>
      </div>

      {/* Secondary facets. Every chip row is generated from the exported constants in
          src/data/opportunities.js, so a new value in the data can never end up unreachable. */}
      {showFilters && (
        <div style={{ ...glass2({ padding: 14 }), display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FacetRow icon={Users} label="Grade" options={OPPORTUNITY_GRADES} value={grade} onChange={setGrade} accent={accent} format={g => `Grade ${g}`} />
          <FacetRow icon={Trophy} label="Selectivity" options={['Open', 'Competitive', 'Elite']} value={effort} onChange={setEffort} accent={accent} />
          <FacetRow icon={Wallet} label="Cost" options={OPPORTUNITY_COSTS} value={cost} onChange={setCost} accent={accent} />
          <FacetRow icon={Laptop} label="Format" options={OPPORTUNITY_FORMATS} value={format} onChange={setFormat} accent={accent} />
          <FacetRow icon={CalendarRange} label="When" options={OPPORTUNITY_SEASONS} value={season} onChange={setSeason} accent={accent} />
          <FacetRow icon={Compass} label="Reach" options={OPPORTUNITY_LEVELS} value={level} onChange={setLevel} accent={accent} />
          <div style={R({ gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: `1px solid ${C.b1}` })}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Sort</span>
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

      {ranked.length > 0 && query.trim().length < 2 && (
        <div style={CC({ gap: 10 })}>
          <div style={R({ gap: 8 })}>
            <Sparkles size={13} color={C.violetL} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>Recommended For You</span>
          </div>
          {brainSummary && (
            <div style={{ ...glass2({ padding: 14 }), background: `linear-gradient(120deg,${tint(C.violet, 0.08)},rgba(255,255,255,0.02))`, border: `1px solid ${tint(C.violet, 0.22)}` }}>
              {brainSummary.loading && <div style={R({ gap: 8, color: C.t3, fontSize: 12 })}><Loader2 size={13} className="spin" />Meta Brain is weighing your best next moves…</div>}
              {brainSummary.error && <div style={{ fontSize: 12, color: C.t3 }}>Couldn't reach Meta Brain right now — the picks below are still ranked from your real Portfolio data.</div>}
              {brainSummary.content && !brainSummary.loading && <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(brainSummary.content) }} />}
            </div>
          )}
          <div style={G2(ranked.length)}>
            {ranked.map(r => {
              const ec = effortColor(r.item.effort) || C.t2;
              const rs = RANK_STYLE[r.rank];
              return (
                <motion.div key={r.item.id} whileHover={{ y: -1 }} style={{ ...glass({ padding: 16 }), border: `1px solid ${ec}30` }}>
                  <div style={R({ gap: 8, marginBottom: 8 })}>
                    {rs ? (
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: rs.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 10px ${rs.glow}` }}>
                        <rs.Icon size={13} color="#0a0a0a" />
                      </div>
                    ) : <span style={pill(C.s3, C.t2, { fontSize: 10 })}>#{r.rank}</span>}
                    <span style={pill(`${ec}18`, ec, { fontSize: 10 })}>{r.item.effort}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: C.t3 }}>{r.item.type} · {r.item.level}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{r.item.name}</div>
                  <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5, marginBottom: 8 }}>{r.reason}</div>
                  <TrackButton state={stateOf(r.item)} busy={busyId === r.item.id} accent={accent}
                    label={resourceForOpportunity(r.item) === 'scholarships' ? 'Track scholarship' : 'Add to Portfolio'}
                    trackedLabel="In your Portfolio" onClick={() => handleAdd(r.item)} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.t3, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                <div style={{ ...R({ gap: 12, padding: 14, cursor: 'pointer' }) }} onClick={() => setExpandedId(isOpen ? null : o.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{o.org} · {o.type} · {o.level}</div>
                    {(o.cost || o.season || o.format || o.grades) && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
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
                  <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.b1}`, marginTop: 2, paddingTop: 12 }}>
                    <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 8 }}>{o.desc}</p>
                    <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.7 }}>
                      <div><b style={{ color: C.t2 }}>Eligibility:</b> {o.eligibility}</div>
                      {o.cost && <div><b style={{ color: C.t2 }}>Cost:</b> {o.cost}</div>}
                      {o.season && <div><b style={{ color: C.t2 }}>Runs:</b> {o.season}{o.format ? ` · ${o.format}` : ''}</div>}
                      {o.grades && <div><b style={{ color: C.t2 }}>Typical grades:</b> {o.grades.join(', ')}</div>}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
              <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 10 }}>
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
              <div style={{ ...R({ gap: 6, marginTop: 4 }), fontSize: 10, color: C.t4 }}>AI-generated, unverified — not from the curated database above.</div>
              <button style={{ ...btn(C.violetGrad, { fontSize: 12 }), marginTop: 10 }} onClick={addAiResultAsCustom}><Plus size={13} />Add as custom activity</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Small local grid helper — 1 column on narrow layouts (recommended cards read
// better full-width when there are 1-2), 3 columns when a full set of 3 exists.
function G2(count) {
  return { display: 'grid', gridTemplateColumns: count >= 2 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: 10 };
}

// One row of the secondary filter panel. Tapping the active chip clears that facet, so every
// filter is its own undo — no separate "off" chip, and no state you can get stuck in.
function FacetRow({ icon: Icon, label, options, value, onChange, accent, format = (v) => v }) {
  return (
    <div style={R({ gap: 8, flexWrap: 'wrap' })}>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 92 }}>
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
