import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, CalendarClock, CalendarDays, Hourglass, AlertTriangle, History, Sparkles, Loader2, ListChecks } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import { deriveSuggestedDeadlines } from '../lib/autoDeadlines';
import { showMedabrainToast } from '../lib/medabrainComments';
import { getCached, setCached, dailyKey } from '../lib/aiCache';
import { renderMarkdown } from '../lib/renderMarkdown';

const KINDS = [
  { id: 'common_app_open', label: 'Common App Opens', color: C.blue },
  { id: 'early_action', label: 'Early Action', color: C.violet },
  { id: 'early_decision', label: 'Early Decision', color: C.fuchsia },
  { id: 'regular_decision', label: 'Regular Decision', color: C.sky },
  { id: 'fafsa', label: 'FAFSA Opens', color: C.green },
  { id: 'css_profile', label: 'CSS Profile', color: C.teal },
  { id: 'ap_exam', label: 'AP Exam', color: C.amber },
  { id: 'ib_exam', label: 'IB Exam', color: C.orange },
  { id: 'scholarship', label: 'Scholarship', color: C.gold },
  { id: 'custom', label: 'Custom', color: C.cyan },
];

const CURRENT_YEAR = new Date().getFullYear();
export const DEFAULT_DEADLINES = [
  { title: 'Common App Opens', due_date: `${CURRENT_YEAR}-08-01`, kind: 'common_app_open' },
  { title: 'Early Action / Early Decision Deadline', due_date: `${CURRENT_YEAR}-11-01`, kind: 'early_action' },
  { title: 'FAFSA Opens', due_date: `${CURRENT_YEAR}-10-01`, kind: 'fafsa' },
  { title: 'Regular Decision Deadline', due_date: `${CURRENT_YEAR+1}-01-01`, kind: 'regular_decision' },
];

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((target - now) / 86400000);
}

export function useDeadlines() {
  const [deadlines, setDeadlines] = useState(null);
  useEffect(() => {
    listItems('deadlines').then(setDeadlines).catch(() => setDeadlines([]));
  }, []);
  return deadlines;
}

export function NextDeadlineCard({ deadlines, accent = C.blue }) {
  if (!deadlines) return null;
  const upcoming = deadlines
    .map(d => ({ ...d, days: daysUntil(d.due_date) }))
    .filter(d => d.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  if (!upcoming) return null;
  const urgent = upcoming.days <= 14;
  return (
    <div style={glass({padding:18,border:urgent?`1px solid ${C.rose}40`:undefined})}>
      <div style={R({gap:8,marginBottom:6})}>
        <CalendarClock size={14} color={urgent?C.roseL:accent}/>
        <span style={lbl({marginBottom:0})}>Next Deadline</span>
      </div>
      <div style={R({gap:10,alignItems:'baseline'})}>
        <span style={{fontSize:28,fontWeight:800,color:urgent?C.roseL:C.t1,fontFamily:C.FD}}>{upcoming.days}</span>
        <span style={{fontSize:12,color:C.t3}}>day{upcoming.days===1?'':'s'} until</span>
      </div>
      <div style={{fontSize:13,fontWeight:600,color:C.t1,marginTop:4}}>{upcoming.title}</div>
      <div style={{fontSize:11,color:C.t3,marginTop:2}}>{new Date(upcoming.due_date+'T00:00:00').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</div>
    </div>
  );
}

export default function DeadlinesPanel({ accent = C.blue, apIb = false, askMedabrain, onAdded }) {
  const [deadlines, setDeadlines] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [kind, setKind] = useState('custom');
  const [addingAll, setAddingAll] = useState(false);
  const [brainSummary, setBrainSummary] = useState(null); // { loading, content, error }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c, s] = await Promise.all([listItems('deadlines'), listItems('colleges').catch(()=>[]), listItems('scholarships').catch(()=>[])]);
      setDeadlines(d); setColleges(c); setScholarships(s);
    }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addDeadline(e) {
    e?.preventDefault();
    if (!title.trim() || !date) return;
    try {
      const d = await createItem('deadlines', { title: title.trim(), due_date: date, kind });
      setDeadlines(prev => [...prev, d].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
      setTitle(''); setDate('');
      showMedabrainToast('deadline_added', { title: d.title });
      onAdded?.();
    } catch (err) { toast.error(err.message); }
  }

  async function seedDefaults() {
    try {
      const created = await Promise.all(DEFAULT_DEADLINES.map(d => createItem('deadlines', d)));
      setDeadlines(prev => [...prev, ...created].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
      toast.success('Added common admissions deadlines');
      onAdded?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeDeadline(id) {
    if (!window.confirm('Remove this deadline?')) return;
    setDeadlines(prev => prev.filter(d => d.id !== id));
    try { await deleteItem('deadlines', id); } catch (err) { toast.error(err.message); }
  }

  // ── Meta Brain auto-suggested deadlines — derived from what's already tracked in the
  // College List and Financial Aid tabs (plus FAFSA/AP/IB), not invented. See autoDeadlines.js.
  const suggestions = useMemo(
    () => deriveSuggestedDeadlines({ colleges, scholarships, apIb, existingDeadlines: deadlines }),
    [colleges, scholarships, apIb, deadlines]
  );

  async function addSuggestion(s) {
    try {
      const d = await createItem('deadlines', { title: s.title, due_date: s.due_date, kind: s.kind, college_id: s.college_id });
      setDeadlines(prev => [...prev, d].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
      showMedabrainToast('deadline_auto_suggested_added', { title: d.title });
      onAdded?.();
    } catch (err) { toast.error(err.message); }
  }

  async function addAllSuggestions() {
    setAddingAll(true);
    try {
      const created = await Promise.all(suggestions.map(s => createItem('deadlines', { title: s.title, due_date: s.due_date, kind: s.kind, college_id: s.college_id })));
      setDeadlines(prev => [...prev, ...created].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
      toast.success(`Added ${created.length} suggested deadline${created.length===1?'':'s'}`);
      onAdded?.();
    } catch (err) { toast.error(err.message); }
    finally { setAddingAll(false); }
  }

  const sorted = [...deadlines].sort((a,b)=>a.due_date.localeCompare(b.due_date));
  const upcoming = sorted.filter(d => daysUntil(d.due_date) >= 0);
  const urgentCount = upcoming.filter(d => daysUntil(d.due_date) <= 14).length;
  const pastCount = sorted.length - upcoming.length;
  const next = upcoming[0];

  // ── Meta Brain priority summary — a short, cached AI read on what's most urgent right now,
  // grounded in the real upcoming list (the prompt below embeds it directly and explicitly
  // forbids inventing a deadline not in it). Cached per-day AND per-list-shape so it only
  // re-calls Groq when the day rolls over or the actual upcoming deadlines change.
  const cacheKey = useMemo(() => dailyKey('deadlinesPriority', upcoming.map(d=>`${d.title}:${d.due_date}`).join('|')), [upcoming]);
  // App.jsx recreates askMedabrain on every render (it's a plain closure, not memoized), so it
  // must NOT be a dependency here — that would re-fire this effect (and risk a duplicate in-flight
  // Groq call) on any unrelated App.jsx re-render. cacheKey alone captures everything that should
  // actually trigger a refetch (the day rolling over, or the upcoming deadline list changing).
  // fetchedKeyRef additionally guards against firing twice for the same key before the first call
  // resolves (e.g. React StrictMode's double-invoke in dev).
  const fetchedKeyRef = useRef(null);
  useEffect(() => {
    if (!askMedabrain || upcoming.length === 0) { setBrainSummary(null); return; }
    const cached = getCached(cacheKey);
    if (cached) { setBrainSummary({ loading: false, content: cached, error: null }); fetchedKeyRef.current = cacheKey; return; }
    if (fetchedKeyRef.current === cacheKey) return;
    fetchedKeyRef.current = cacheKey;
    let cancelled = false;
    setBrainSummary({ loading: true, content: null, error: null });
    const list = upcoming.slice(0, 12).map(d => `"${d.title}" in ${daysUntil(d.due_date)}d (${d.kind})`).join('; ');
    askMedabrain(`Here are this student's real upcoming Portfolio deadlines, soonest first: ${list}. In 2-3 concise sentences, tell them what to prioritize this week and why. Only reference deadlines from this exact list — never invent one.`)
      .then(content => { if (!cancelled) { setCached(cacheKey, content); setBrainSummary({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) { fetchedKeyRef.current = null; setBrainSummary({ loading: false, content: null, error: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, see comment above
  }, [cacheKey]);

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-deadlines" icon={CalendarDays} color={accent} color2={C.orange}
        eyebrow="Applications" title="Deadlines"
        sub="Every application, scholarship, and exam date in one countdown — deadlines you add here also surface on your Home dashboard as they approach."
        stats={deadlines.length > 0 ? [{ value: upcoming.length, label: 'upcoming', color: accent }] : []}/>

      {deadlines.length > 0 && (
        <div style={G(3,12,{},true)}>
          <StatTile icon={Hourglass} value={next ? (daysUntil(next.due_date) === 0 ? 'Today' : `${daysUntil(next.due_date)}d`) : '—'} label={next ? `until ${next.title.slice(0, 26)}${next.title.length > 26 ? '…' : ''}` : 'nothing upcoming'} color={next && daysUntil(next.due_date) <= 14 ? C.rose : C.sky}/>
          <StatTile icon={AlertTriangle} value={urgentCount} label="due within 14 days" color={urgentCount > 0 ? C.amber : C.green}/>
          <StatTile icon={History} value={pastCount} label="already passed" color={C.t3}/>
        </div>
      )}

      {brainSummary && (
        <div style={{...glass2({padding:16}),background:`linear-gradient(120deg,${tint(C.violet,0.08)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.25)}`}}>
          <div style={R({gap:8,marginBottom:brainSummary.loading?0:8})}>
            <Sparkles size={13} color={C.violetL}/>
            <span style={{fontSize:11,fontWeight:700,color:C.violetL,textTransform:'uppercase',letterSpacing:'.06em'}}>Meta Brain's take</span>
          </div>
          {brainSummary.loading && <div style={R({gap:8,color:C.t3,fontSize:12})}><Loader2 size={13} className="spin"/>Weighing what's most urgent…</div>}
          {brainSummary.error && <div style={{fontSize:12,color:C.t3}}>Couldn't reach Meta Brain right now — the countdown below is still accurate.</div>}
          {brainSummary.content && !brainSummary.loading && <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:renderMarkdown(brainSummary.content)}}/>}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(C.violet,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.2)}`}}>
          <div style={R({justifyContent:'space-between',marginBottom:12})}>
            <SectionTitle icon={ListChecks} color={C.violetL} extra={{marginBottom:0}}>Suggested from your Portfolio ({suggestions.length})</SectionTitle>
            <button style={btnSm(tint(C.violet,0.2),{color:'#fff'})} disabled={addingAll} onClick={addAllSuggestions}>{addingAll?<Loader2 size={12} className="spin"/>:<Plus size={12}/>}Add all</button>
          </div>
          <p style={{fontSize:11.5,color:C.t3,marginBottom:12,lineHeight:1.5}}>Pulled automatically from dates you already entered on College List and Financial Aid (plus FAFSA/AP/IB) — nothing here is guessed.</p>
          <div style={CC({gap:6})}>
            {suggestions.map((s,i) => (
              <div key={`${s.title}-${i}`} style={{...glass2({padding:'10px 12px'}),display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{s.title}</div>
                  <div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{new Date(s.due_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} · {s.source}</div>
                </div>
                <button style={btnSm('rgba(255,255,255,0.06)',{color:C.t2})} onClick={()=>addSuggestion(s)}><Plus size={12}/>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Add a deadline</SectionTitle>
        <form onSubmit={addDeadline} style={R({gap:10,flexWrap:'wrap'})}>
          <input style={inp({flex:1,minWidth:180})} placeholder="e.g. Stanford EA deadline" value={title} onChange={e=>setTitle(e.target.value)} />
          <input type="date" style={inp({width:'auto'})} value={date} onChange={e=>setDate(e.target.value)} />
          <select style={inp({width:'auto'})} value={kind} onChange={e=>setKind(e.target.value)}>
            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <button type="submit" style={btn(accent!==C.blue?accent:C.blueGrad)}><Plus size={14}/>Add</button>
        </form>
      </div>

      {!loading && deadlines.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <div style={{fontSize:13,color:C.t2,marginBottom:12}}>No deadlines yet.</div>
          <button style={btn()} onClick={seedDefaults}>Add common admissions deadlines</button>
        </div>
      )}

      <div style={CC({gap:8})}>
        {sorted.map(d => {
          const days = daysUntil(d.due_date);
          const past = days < 0;
          const kind = KINDS.find(k=>k.id===d.kind) || KINDS[KINDS.length-1];
          // Countdown chip colour escalates with urgency: rose ≤7d, amber ≤14d,
          // sky ≤30d, calm neutral beyond that.
          const urgency = past ? C.t4 : days <= 7 ? C.rose : days <= 14 ? C.amber : days <= 30 ? C.sky : C.t3;
          return (
            <div key={d.id} style={{...glass2({padding:14}),display:'flex',alignItems:'center',gap:14,opacity:past?0.5:1,borderLeft:`3px solid ${past?C.t4:kind.color}`,background:`linear-gradient(120deg,${tint(kind.color,past?0.02:0.05)},rgba(255,255,255,0.02) 55%)`}}>
              <div style={{width:60,flexShrink:0,textAlign:'center',padding:'8px 4px',borderRadius:10,background:tint(urgency,past?0.05:0.1),border:`1px solid ${tint(urgency,past?0.12:0.28)}`}}>
                <div style={{fontSize:19,fontWeight:800,color:past?C.t4:urgency,fontFamily:C.FD,lineHeight:1}}>{past?'—':days===0?'now':days}</div>
                <div style={{fontSize:8.5,color:C.t3,textTransform:'uppercase',letterSpacing:'.05em',marginTop:3}}>{past?'past':days===0?'today':'days left'}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{d.title}</div>
                <div style={R({gap:8,marginTop:3})}>
                  <span style={{fontSize:11,color:C.t3}}>{new Date(d.due_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span>
                  <span style={pill(tint(kind.color,0.13),kind.color,{fontSize:9})}>{kind.label}</span>
                </div>
              </div>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeDeadline(d.id)}><Trash2 size={12}/></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
