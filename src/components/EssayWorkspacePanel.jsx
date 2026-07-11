import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, FileText, History, Brain, Sparkles, Loader2 } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G, pill } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';

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

export default function EssayWorkspacePanel({ accent = C.blue }) {
  const [essays, setEssays] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [versions, setVersions] = useState([]);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

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

  useEffect(() => {
    if (!selected) { setVersions([]); return; }
    setDraft(selected.content || '');
    setFeedback(null);
    listItems('essay_versions').then(all => {
      setVersions(all.filter(v => v.essay_id === selected.id).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
    }).catch(() => {});
  }, [selected?.id]);

  async function addEssay() {
    if (!newTitle.trim()) return;
    try {
      const essay = await createItem('essays', { title: newTitle.trim(), word_limit: 650, status: 'not_started', content: '' });
      setEssays(prev => [...prev, essay]);
      setNewTitle('');
      setSelected(essay);
      toast.success('Essay created');
    } catch (err) { toast.error(err.message); }
  }

  async function removeEssay(id) {
    setEssays(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    try { await deleteItem('essays', id); } catch (err) { toast.error(err.message); }
  }

  function setEssayLocal(id, patch) {
    setEssays(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  }

  async function patchEssay(id, patch) {
    setEssayLocal(id, patch);
    try { await updateItem('essays', id, patch); } catch (err) { toast.error(err.message); }
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

  async function getEssayFeedback() {
    if (!draft.trim() || feedbackLoading) return;
    setFeedbackLoading(true);
    setFeedback(null);
    try {
      const system = `You are Metabrain, an AI writing coach inside MedSchoolPrep, helping a high school student (grades 9-12) draft a college application essay — this is a Common App / undergraduate admissions essay, not a graduate or medical school personal statement. Essay prompt: "${selected.prompt || '(no prompt given)'}" Word limit: ${selected.word_limit}. Student's draft (${wc}/${selected.word_limit} words): """${draft}""" Give feedback in this structure: 2-3 sentences on what's working well, then 2-3 specific, actionable suggestions to strengthen the essay (voice, structure, specificity, a concrete anecdote, showing vs telling), then one encouraging closing sentence. Be warm, concrete, and constructive — this is a teenager building confidence, not a professional writer. Under 180 words. No markdown formatting, just plain sentences and short line breaks between the three parts.`;
      const r = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, message: draft, maxTokens: 320, tier: 'deep' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
      setFeedback(d.content || '');
    } catch (err) {
      toast.error(err.message?.slice(0, 100) || 'Could not get feedback right now.');
    }
    setFeedbackLoading(false);
  }

  const wc = wordCount(draft);
  const over = selected && wc > selected.word_limit;

  return (
    <div style={CC({gap:22})}>
      <div>
        <div style={lbl()}>Applications</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Essay Workspace</h2>
      </div>

      <div style={glass({padding:18})}>
        <div style={R({gap:10,flexWrap:'wrap'})}>
          <input style={inp({flex:1,minWidth:180})} placeholder="e.g. Common App Personal Statement" value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEssay()} />
          <button style={btn(accent!==C.blue?accent:C.blueGrad)} onClick={addEssay}><Plus size={14}/>New Essay</button>
        </div>
      </div>

      {!loading && essays.length === 0 && (
        <div style={glass({padding:30,textAlign:'center'})}>
          <FileText size={28} color={C.t3} style={{margin:'0 auto 10px'}}/>
          <div style={{fontSize:14,color:C.t2}}>No essays yet. Start with your Common App personal statement.</div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns: selected ? '260px 1fr' : '1fr', gap:16}}>
        <div style={CC({gap:8})}>
          {essays.map(essay => {
            const st = STATUSES.find(s => s.id === essay.status) || STATUSES[0];
            return (
              <div key={essay.id} onClick={()=>setSelected(essay)} style={{...glass2({padding:12,cursor:'pointer',border:selected?.id===essay.id?`1px solid ${accent}60`:undefined})}}>
                <div style={R({gap:8,justifyContent:'space-between'})}>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{essay.title}</span>
                  <button style={btnSm(C.roseDim,{color:C.rose,padding:'3px 8px'})} onClick={e=>{e.stopPropagation();removeEssay(essay.id);}}><Trash2 size={11}/></button>
                </div>
                <div style={R({gap:6,marginTop:6})}>
                  <span style={pill(`${st.color}18`, st.color, {fontSize:9})}>{st.label}</span>
                  <span style={{fontSize:10,color:C.t3}}>{wordCount(essay.content)}/{essay.word_limit} words</span>
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
                <input type="number" style={inp()} value={selected.word_limit}
                  onChange={e=>setEssayLocal(selected.id,{word_limit:Number(e.target.value)||650})}
                  onBlur={e=>updateItem('essays', selected.id, { word_limit: Number(e.target.value)||650 }).catch(err=>toast.error(err.message))} />
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
            </div>
            <div style={R({gap:10,marginTop:12,flexWrap:'wrap'})}>
              <button style={btn(accent!==C.blue?accent:C.blueGrad)} onClick={saveVersion}>Save Version</button>
              <button
                style={{...pill('transparent', C.violetL, { fontSize:12.5, cursor:'pointer', border:`1px solid ${C.violet}35`, padding:'9px 16px' }), display:'inline-flex', alignItems:'center', gap:6, opacity: !draft.trim()||feedbackLoading?0.6:1 }}
                disabled={!draft.trim()||feedbackLoading}
                onClick={getEssayFeedback}
              >
                {feedbackLoading ? <><Loader2 size={13} className="spin"/>Metabrain is reading…</> : <><Brain size={13}/>Get Metabrain Feedback</>}
              </button>
            </div>

            {feedback && (
              <div style={{...glass2({padding:14}),marginTop:12,background:C.violetDim,border:`1px solid ${C.violet}25`}}>
                <div style={R({gap:8,marginBottom:8})}>
                  <Sparkles size={14} color={C.violetL}/>
                  <span style={{fontSize:11,fontWeight:700,color:C.violetL,textTransform:'uppercase',letterSpacing:'.06em'}}>Metabrain Feedback</span>
                </div>
                <div style={{fontSize:13.5,color:C.t1,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{feedback}</div>
              </div>
            )}

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
