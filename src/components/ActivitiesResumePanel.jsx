import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Award, ClipboardCopy } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';

const ACT_TYPES = ['Leadership','Volunteering','Research','Athletics','Arts & Performance','Work Experience','Clubs & Organizations','Other'];
const GRADE_LEVELS = ['9','10','11','12','Post-graduate'];

function emptyActivity() {
  return { activity_type: ACT_TYPES[0], position: '', description: '', hours_per_week: '', weeks_per_year: '', grade_levels: [] };
}

export default function ActivitiesResumePanel({ accent = C.blue }) {
  const [activities, setActivities] = useState([]);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyActivity());
  const [awardDraft, setAwardDraft] = useState({ title: '', grade_level: '', level: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, w] = await Promise.all([listItems('activities'), listItems('awards')]);
      setActivities(a);
      setAwards(w);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addActivity() {
    if (!draft.position.trim()) return;
    try {
      const row = await createItem('activities', {
        ...draft,
        hours_per_week: Number(draft.hours_per_week) || 0,
        weeks_per_year: Number(draft.weeks_per_year) || 0,
        sort_order: activities.length,
      });
      setActivities(prev => [...prev, row]);
      setDraft(emptyActivity());
      toast.success('Activity added');
    } catch (err) { toast.error(err.message); }
  }

  async function removeActivity(id) {
    setActivities(prev => prev.filter(a => a.id !== id));
    try { await deleteItem('activities', id); } catch (err) { toast.error(err.message); }
  }

  async function addAward() {
    if (!awardDraft.title.trim()) return;
    try {
      const row = await createItem('awards', { ...awardDraft, sort_order: awards.length });
      setAwards(prev => [...prev, row]);
      setAwardDraft({ title: '', grade_level: '', level: '' });
      toast.success('Award added');
    } catch (err) { toast.error(err.message); }
  }

  async function removeAward(id) {
    setAwards(prev => prev.filter(a => a.id !== id));
    try { await deleteItem('awards', id); } catch (err) { toast.error(err.message); }
  }

  function toggleGrade(g) {
    setDraft(prev => ({ ...prev, grade_levels: prev.grade_levels.includes(g) ? prev.grade_levels.filter(x=>x!==g) : [...prev.grade_levels, g] }));
  }

  function exportText() {
    const lines = [];
    lines.push('ACTIVITIES\n');
    activities.forEach((a, i) => {
      lines.push(`${i+1}. ${a.activity_type} — ${a.position}`);
      if (a.description) lines.push(`   ${a.description}`);
      lines.push(`   ${a.hours_per_week} hrs/wk, ${a.weeks_per_year} wks/yr · Grades: ${(a.grade_levels||[]).join(', ')}\n`);
    });
    lines.push('\nHONORS & AWARDS\n');
    awards.forEach((a, i) => {
      lines.push(`${i+1}. ${a.title}${a.level?` (${a.level})`:''}${a.grade_level?` — Grade ${a.grade_level}`:''}`);
    });
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(
      () => toast.success('Copied — ready to paste into the Common App'),
      () => toast.error('Could not copy to clipboard')
    );
  }

  return (
    <div style={CC({gap:22})}>
      <div style={R({justifyContent:'space-between',flexWrap:'wrap'})}>
        <div>
          <div style={lbl()}>Applications</div>
          <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Resume Builder</h2>
        </div>
        {(activities.length>0||awards.length>0) && (
          <button style={btnG({fontSize:12})} onClick={exportText}><ClipboardCopy size={13}/>Copy Common App format</button>
        )}
      </div>

      <div style={glass({padding:18})}>
        <div style={lbl()}>Add an activity</div>
        <div style={G(2,10,{},true)}>
          <div>
            <label style={lbl()}>Type</label>
            <select style={inp()} value={draft.activity_type} onChange={e=>setDraft({...draft,activity_type:e.target.value})}>
              {ACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl()}>Position / Leadership</label>
            <input style={inp()} value={draft.position} onChange={e=>setDraft({...draft,position:e.target.value})} placeholder="e.g. Team Captain" />
          </div>
        </div>
        <div style={{marginTop:10}}>
          <label style={lbl()}>Description</label>
          <textarea style={{...inp(),minHeight:60,resize:'vertical'}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="What did you do and accomplish?" />
        </div>
        <div style={G(2,10,{marginTop:10},true)}>
          <div><label style={lbl()}>Hours / week</label><input type="number" style={inp()} value={draft.hours_per_week} onChange={e=>setDraft({...draft,hours_per_week:e.target.value})} /></div>
          <div><label style={lbl()}>Weeks / year</label><input type="number" style={inp()} value={draft.weeks_per_year} onChange={e=>setDraft({...draft,weeks_per_year:e.target.value})} /></div>
        </div>
        <div style={{marginTop:10}}>
          <label style={lbl()}>Grade levels involved</label>
          <div style={R({gap:6,flexWrap:'wrap'})}>
            {GRADE_LEVELS.map(g => (
              <button key={g} type="button" onClick={()=>toggleGrade(g)} style={btnSm(draft.grade_levels.includes(g)?accent:'rgba(255,255,255,0.06)',{color:'#fff'})}>{g}</button>
            ))}
          </div>
        </div>
        <button style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:14}} onClick={addActivity}><Plus size={14}/>Add Activity</button>
      </div>

      {!loading && activities.length > 0 && (
        <div style={CC({gap:8})}>
          {activities.map(a => (
            <div key={a.id} style={{...glass2({padding:14}),display:'flex',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{a.position} <span style={{color:C.t3,fontWeight:400}}>· {a.activity_type}</span></div>
                {a.description && <div style={{fontSize:12,color:C.t2,marginTop:3}}>{a.description}</div>}
                <div style={{fontSize:11,color:C.t3,marginTop:4}}>{a.hours_per_week} hrs/wk · {a.weeks_per_year} wks/yr · Grades {(a.grade_levels||[]).join(', ')||'—'}</div>
              </div>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeActivity(a.id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}

      <div style={glass({padding:18})}>
        <div style={lbl()}>Add an honor or award</div>
        <div style={G(3,10,{},true)}>
          <input style={inp()} placeholder="Award title" value={awardDraft.title} onChange={e=>setAwardDraft({...awardDraft,title:e.target.value})} />
          <select style={inp()} value={awardDraft.grade_level} onChange={e=>setAwardDraft({...awardDraft,grade_level:e.target.value})}>
            <option value="">Grade level</option>
            {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={inp()} value={awardDraft.level} onChange={e=>setAwardDraft({...awardDraft,level:e.target.value})}>
            <option value="">Recognition level</option>
            <option>School</option><option>State/Regional</option><option>National</option><option>International</option>
          </select>
        </div>
        <button style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:14}} onClick={addAward}><Plus size={14}/>Add Award</button>
      </div>

      {!loading && awards.length > 0 && (
        <div style={CC({gap:8})}>
          {awards.map(a => (
            <div key={a.id} style={{...glass2({padding:12}),display:'flex',alignItems:'center',gap:12}}>
              <Award size={14} color={accent}/>
              <div style={{flex:1}}>
                <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{a.title}</span>
                <span style={{fontSize:11,color:C.t3,marginLeft:8}}>{[a.level,a.grade_level&&`Grade ${a.grade_level}`].filter(Boolean).join(' · ')}</span>
              </div>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeAward(a.id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
