import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Compass, Plus, Sparkles, Loader2, Info, ChevronDown, ChevronUp, Trophy, Medal } from 'lucide-react';
import { C, glass, glass2, btn, inp, R, CC, pill, tint } from '../lib/theme';
import { listItems } from '../lib/dataApi';
import { OPPORTUNITIES, OPPORTUNITY_TYPES } from '../data/opportunities';
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

const EFFORT_COLOR = { Elite: C.rose, Competitive: C.amber, Open: C.green };
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

  const results = useMemo(() => {
    const base = query.trim().length >= 2 ? fuse.search(query.trim()).map(r => r.item) : OPPORTUNITIES;
    return type === 'All' ? base : base.filter(o => o.type === type);
  }, [query, type]);

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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {OPPORTUNITY_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            style={pill(type === t ? tint(accent, 0.22) : 'rgba(255,255,255,0.05)', type === t ? '#fff' : C.t3,
              { cursor: 'pointer', border: `1px solid ${type === t ? tint(accent, 0.4) : C.b1}`, fontWeight: type === t ? 700 : 500 })}>
            {t}
          </button>
        ))}
      </div>

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
              const ec = EFFORT_COLOR[r.item.effort] || C.t2;
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
        Reference info only — search {OPPORTUNITIES.length} real programs, or browse by type above.
      </div>

      {results.length > 0 ? (
        <div style={CC({ gap: 8 })}>
          {results.slice(0, 60).map(o => {
            const isOpen = expandedId === o.id;
            const ec = EFFORT_COLOR[o.effort] || C.t2;
            const state = stateOf(o);
            return (
              <div key={o.id} style={{ ...glass2({ padding: 0, overflow: 'hidden' }), borderLeft: `3px solid ${state === 'tracked' ? C.green : ec}` }}>
                <div style={{ ...R({ gap: 12, padding: 14, cursor: 'pointer' }) }} onClick={() => setExpandedId(isOpen ? null : o.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{o.org} · {o.type} · {o.level}</div>
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
