import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, FileText, History, ScrollText, PenLine, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import { showMedabrainToast } from '../lib/medabrainComments';
import { getCached, setCached, dailyKey } from '../lib/aiCache';
import { renderMarkdown } from '../lib/renderMarkdown';
import { getWhyMedicineLabel, getDreamRoleLabel } from '../lib/studentProfile';

const STATUSES = [
  { id: 'not_started', label: 'Not Started', color: C.t3 },
  { id: 'outlining', label: 'Outlining', color: C.violetL },
  { id: 'drafting', label: 'Drafting', color: C.blueL },
  { id: 'revising', label: 'Revising', color: C.amberL },
  { id: 'final', label: 'Final', color: C.greenL },
];

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

export default function EssayWorkspacePanel({ accent = C.blue, user = null, askMedabrain = null, onCreated = null }) {
  const [essays, setEssays] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [versions, setVersions] = useState([]);
  const [draft, setDraft] = useState('');
  const [portfolioCtx, setPortfolioCtx] = useState(null); // broader context for the ambient recommendation only — activities/research/clinical hours/awards
  const [brainTake, setBrainTake] = useState(null); // { loading, content, error }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([listItems('essays'), listItems('colleges')]);
      setEssays(e);
      setColleges(c);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Fetched once, separately from the essay/college state above — this is only ever read by the
  // ambient Meta Brain recommendation below, never rendered directly, so a failed fetch degrades
  // to "no extra context" rather than breaking the essay workspace itself.
  useEffect(() => {
    Promise.all([
      listItems('activities').catch(() => []),
      listItems('research_experience').catch(() => []),
      listItems('clinical_hours').catch(() => []),
      listItems('awards').catch(() => []),
    ]).then(([activities, research, clinicalHours, awards]) => setPortfolioCtx({ activities, research, clinicalHours, awards })).catch(() => setPortfolioCtx({ activities: [], research: [], clinicalHours: [], awards: [] }));
  }, []);

  useEffect(() => {
    if (!selected) { setVersions([]); return; }
    setDraft(selected.content || '');
    listItems('essay_versions').then(all => {
      setVersions(all.filter(v => v.essay_id === selected.id).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
    }).catch(() => {});
  }, [selected?.id]);

  // Everything else in this panel (title, status, prompt, word limit) autosaves on blur — the
  // Draft textarea shouldn't be the one field that silently discards work if the student switches
  // essays or navigates away before hitting "Save Version". This is a plain autosave of the
  // current content (not a version-history checkpoint, which stays an explicit user action).
  useEffect(() => {
    if (!selected || draft === (selected.content || '')) return;
    const id = selected.id;
    const t = setTimeout(() => {
      updateItem('essays', id, { content: draft })
        .then(() => setEssayLocal(id, { content: draft }))
        .catch(err => toast.error(err.message));
    }, 1200);
    return () => clearTimeout(t);
  }, [draft, selected]);

  // Flushes any unsaved draft immediately (not waiting for the debounce above) before switching
  // to a different essay, so a quick click right after typing can't race the autosave and lose it.
  async function flushDraft() {
    if (!selected || draft === (selected.content || '')) return;
    try {
      await updateItem('essays', selected.id, { content: draft });
      setEssayLocal(selected.id, { content: draft });
    } catch (err) { toast.error(err.message); }
  }

  async function selectEssay(essay) {
    await flushDraft();
    setSelected(essay);
  }

  async function addEssay() {
    if (!newTitle.trim()) return;
    try {
      await flushDraft();
      const essay = await createItem('essays', { title: newTitle.trim(), word_limit: 650, status: 'not_started', content: '' });
      setEssays(prev => [...prev, essay]);
      setNewTitle('');
      setSelected(essay);
      showMedabrainToast('essay_started', { title: essay.title });
      onCreated?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeEssay(id) {
    if (!window.confirm('Delete this essay and its draft? This cannot be undone.')) return;
    setEssays(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    try { await deleteItem('essays', id); } catch (err) { toast.error(err.message); }
  }

  function setEssayLocal(id, patch) {
    setEssays(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  }

  async function patchEssay(id, patch) {
    const prevEssay = essays.find(e => e.id === id);
    setEssayLocal(id, patch);
    try {
      await updateItem('essays', id, patch);
      if (patch.status === 'final' && prevEssay && prevEssay.status !== 'final') {
        showMedabrainToast('essay_completed', { title: prevEssay.title });
      }
    } catch (err) { toast.error(err.message); }
  }

  async function saveVersion() {
    if (!selected) return;
    try {
      await updateItem('essays', selected.id, { content: draft });
      const version = await createItem('essay_versions', { essay_id: selected.id, content: draft, word_count: wordCount(draft) });
      setVersions(prev => [version, ...prev]);
      setEssays(prev => prev.map(e => e.id === selected.id ? { ...e, content: draft } : e));
      toast.success('Draft saved as a new version');
    } catch (err) { toast.error(err.message); }
  }

  const wc = wordCount(draft);
  const over = selected && wc > selected.word_limit;

  const totalWords = essays.reduce((s, e) => s + wordCount(e.content), 0);
  const finals = essays.filter(e => e.status === 'final').length;
  const inFlight = essays.filter(e => ['outlining','drafting','revising'].includes(e.status)).length;

  // ── Meta Brain's take — an unasked-for, personalized recommendation on how to approach the
  // essay(s) that still need work, grounded in the real essay list AND the rest of the student's
  // portfolio/onboarding profile (not just word counts) — same "inline card, not a toast, cached
  // per-day" pattern as DeadlinesPanel/CollegeListPanel. Only fires once colleges + the broader
  // portfolioCtx fetch have both resolved, so it never reasons from a partial picture.
  const brainCacheKey = useMemo(
    () => dailyKey('essayTake', essays.map(e => `${e.title}:${e.status}:${wordCount(e.content)}`).join('|')),
    [essays]
  );
  const brainFetchedKeyRef = useRef(null);
  useEffect(() => {
    if (!askMedabrain || essays.length === 0 || !portfolioCtx) { setBrainTake(null); return; }
    const cached = getCached(brainCacheKey);
    if (cached) { setBrainTake({ loading: false, content: cached, error: null }); brainFetchedKeyRef.current = brainCacheKey; return; }
    if (brainFetchedKeyRef.current === brainCacheKey) return;
    brainFetchedKeyRef.current = brainCacheKey;
    let cancelled = false;
    setBrainTake({ loading: true, content: null, error: null });

    const essayList = essays.map(e => `"${e.title}" (${e.status}, ${wordCount(e.content)}/${e.word_limit} words${e.college_id ? `, linked to ${colleges.find(c=>c.id===e.college_id)?.name || 'a school'}` : ''})`).join('; ');
    const notStarted = essays.filter(e => e.status === 'not_started' || !wordCount(e.content));
    const whyMed = getWhyMedicineLabel(user?.whyMedicine);
    const dreamRole = getDreamRoleLabel(user?.dreamRole);
    const activityList = (portfolioCtx.activities||[]).slice(0,8).map(a => `${a.position || a.activity_type}${a.organization ? ` at ${a.organization}` : ''}`).join(', ');
    const researchList = (portfolioCtx.research||[]).slice(0,4).map(r => r.title).join(', ');
    const clinicalTotal = (portfolioCtx.clinicalHours||[]).reduce((s,h)=>s+(h.hours||0),0);
    const awardList = (portfolioCtx.awards||[]).slice(0,5).map(a => a.title).join(', ');

    const contextParts = [
      `Essays tracked: ${essayList}.`,
      notStarted.length ? `Not yet started or empty: ${notStarted.map(e=>`"${e.title}"`).join(', ')}.` : `Every tracked essay has some draft content.`,
      whyMed ? `Why they're drawn to medicine (from onboarding): "${whyMed}."` : '',
      dreamRole && dreamRole !== 'Undecided' ? `Their dream role: ${dreamRole}.` : '',
      activityList ? `Activities: ${activityList}.` : 'No activities logged yet.',
      researchList ? `Research: ${researchList}.` : '',
      clinicalTotal > 0 ? `${clinicalTotal} clinical/shadowing hours logged.` : '',
      awardList ? `Awards: ${awardList}.` : '',
    ].filter(Boolean).join(' ');

    askMedabrain(`Here is this student's real essay workspace and portfolio: ${contextParts} In 2-4 concise, warm sentences, give a specific, personalized recommendation for how to start or move forward on whichever essay most needs attention right now — suggest a concrete angle or story beat drawn from their OWN logged activities/research/why-medicine answer above, not generic essay advice. Only reference essays, activities, or experiences from this exact data — never invent one.`)
      .then(content => { if (!cancelled) { setCached(brainCacheKey, content); setBrainTake({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) { brainFetchedKeyRef.current = null; setBrainTake({ loading: false, content: null, error: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, it's a fresh closure every render (see DeadlinesPanel.jsx for the same pattern)
  }, [brainCacheKey, portfolioCtx]);

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-essays" icon={ScrollText} color={accent} color2={C.fuchsia}
        eyebrow="Applications" title="Essay Workspace"
        sub="Draft, revise, and track every personal statement and supplemental in one place — with version history so no rewrite is ever lost."
        stats={essays.length > 0 ? [{ value: essays.length, label: essays.length === 1 ? 'essay' : 'essays' }] : []}/>

      {essays.length > 0 && (
        <div style={G(3,12,{},true)}>
          <StatTile icon={PenLine} value={inFlight} label="In progress" color={C.blue}/>
          <StatTile icon={CheckCircle2} value={finals} label="Finalized" color={C.green}/>
          <StatTile icon={FileText} value={totalWords.toLocaleString()} label="Words written" color={accent}/>
        </div>
      )}

      {brainTake && (
        <div style={{...glass2({padding:16}),background:`linear-gradient(120deg,${tint(C.violet,0.08)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.25)}`}}>
          <div style={R({gap:8,marginBottom:brainTake.loading?0:8})}>
            <Sparkles size={13} color={C.violetL}/>
            <span style={{fontSize:11,fontWeight:700,color:C.violetL,textTransform:'uppercase',letterSpacing:'.06em'}}>Meta Brain's take</span>
          </div>
          {brainTake.loading && <div style={R({gap:8,color:C.t3,fontSize:12})}><Loader2 size={13} className="spin"/>Reading your essays and portfolio…</div>}
          {brainTake.error && <div style={{fontSize:12,color:C.t3}}>Couldn't reach Meta Brain right now.</div>}
          {brainTake.content && !brainTake.loading && <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:renderMarkdown(brainTake.content)}}/>}
        </div>
      )}

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Start a new essay</SectionTitle>
        <div style={R({gap:10,flexWrap:'wrap'})}>
          <input style={inp({flex:1,minWidth:180})} placeholder="e.g. Common App Personal Statement" value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEssay()} />
          <button style={btn(accent!==C.blue?accent:C.blueGrad)} onClick={addEssay}><Plus size={14}/>New Essay</button>
        </div>
      </div>

      {!loading && essays.length === 0 && (
        <div style={glass({padding:30,textAlign:'center'})}>
          <div style={{width:48,height:48,borderRadius:14,background:tint(accent,0.12),border:`1px solid ${tint(accent,0.28)}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
            <FileText size={22} color={accent}/>
          </div>
          <div style={{fontSize:14,color:C.t2}}>No essays yet. Start with your Common App personal statement.</div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns: selected ? '260px 1fr' : '1fr', gap:16}}>
        <div style={CC({gap:8})}>
          {essays.map(essay => {
            const st = STATUSES.find(s => s.id === essay.status) || STATUSES[0];
            const ewc = wordCount(essay.content);
            const wpct = essay.word_limit ? Math.min(100, Math.round((ewc / essay.word_limit) * 100)) : 0;
            return (
              <div key={essay.id} onClick={()=>selectEssay(essay)} style={{...glass2({padding:12,cursor:'pointer',border:selected?.id===essay.id?`1px solid ${accent}60`:`1px solid ${C.b1}`}),borderLeft:`3px solid ${st.color}`,background:selected?.id===essay.id?`linear-gradient(120deg,${tint(accent,0.08)},rgba(255,255,255,0.02))`:undefined}}>
                <div style={R({gap:8,justifyContent:'space-between'})}>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{essay.title}</span>
                  <button style={btnSm(C.roseDim,{color:C.rose,padding:'3px 8px'})} onClick={e=>{e.stopPropagation();removeEssay(essay.id);}}><Trash2 size={11}/></button>
                </div>
                <div style={R({gap:6,marginTop:6})}>
                  <span style={pill(`${st.color}18`, st.color, {fontSize:9})}>{st.label}</span>
                  <span style={{fontSize:10,color:C.t3}}>{ewc}/{essay.word_limit} words</span>
                </div>
                <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',marginTop:8}}>
                  <div style={{height:'100%',width:`${wpct}%`,background:ewc>essay.word_limit?C.rose:st.color,borderRadius:2,transition:'width .3s'}}/>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div style={glass({padding:18})}>
            <div style={R({gap:10,flexWrap:'wrap',marginBottom:14,justifyContent:'space-between'})}>
              <input style={{...inp({fontSize:15,fontWeight:700,width:'auto',flex:1,minWidth:160})}} value={selected.title}
                onChange={e=>setEssayLocal(selected.id,{title:e.target.value})}
                onBlur={e=>updateItem('essays', selected.id, { title: e.target.value }).catch(err=>toast.error(err.message))} />
              <select style={inp({width:'auto'})} value={selected.status} onChange={e=>patchEssay(selected.id,{status:e.target.value})}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div style={G(2,10,{},true)}>
              <div>
                <label style={lbl()}>Linked school (optional)</label>
                <select style={inp()} value={selected.college_id||''} onChange={e=>patchEssay(selected.id,{college_id:e.target.value||null})}>
                  <option value="">— Not linked —</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl()}>Word limit</label>
                <input type="number" min="1" style={inp()} value={selected.word_limit}
                  onChange={e=>setEssayLocal(selected.id,{word_limit:Math.max(1,Number(e.target.value)||650)})}
                  onBlur={e=>updateItem('essays', selected.id, { word_limit: Math.max(1,Number(e.target.value)||650) }).catch(err=>toast.error(err.message))} />
              </div>
            </div>
            <div style={{marginTop:12}}>
              <label style={lbl()}>Prompt</label>
              <input style={inp()} value={selected.prompt||''}
                onChange={e=>setEssayLocal(selected.id,{prompt:e.target.value})}
                onBlur={e=>updateItem('essays', selected.id, { prompt: e.target.value }).catch(err=>toast.error(err.message))}
                placeholder="Paste the essay prompt here…" />
            </div>
            <div style={{marginTop:12}}>
              <div style={R({justifyContent:'space-between',marginBottom:7})}>
                <label style={lbl({marginBottom:0})}>Draft</label>
                <span style={{fontSize:11,color:over?C.roseL:C.t3}}>{wc} / {selected.word_limit} words</span>
              </div>
              <textarea style={{...inp(),minHeight:260,resize:'vertical',lineHeight:1.6}} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write your essay here…" />
              <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',marginTop:8}}>
                <div style={{height:'100%',width:`${selected.word_limit?Math.min(100,Math.round((wc/selected.word_limit)*100)):0}%`,background:over?C.rose:wc>=selected.word_limit*0.85?C.amber:accent,borderRadius:3,transition:'width .3s'}}/>
              </div>
            </div>
            <button style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:12}} onClick={saveVersion}>Save Version</button>

            {versions.length > 0 && (
              <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.b1}`}}>
                <div style={R({gap:6,marginBottom:10})}><History size={13} color={C.t3}/><span style={lbl({marginBottom:0})}>Version History</span></div>
                <div style={CC({gap:6})}>
                  {versions.map(v => (
                    <div key={v.id} style={{...glass2({padding:'8px 12px'}),display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,color:C.t2}}>{new Date(v.created_at).toLocaleString()}</span>
                      <span style={{fontSize:11,color:C.t3}}>{v.word_count} words</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
