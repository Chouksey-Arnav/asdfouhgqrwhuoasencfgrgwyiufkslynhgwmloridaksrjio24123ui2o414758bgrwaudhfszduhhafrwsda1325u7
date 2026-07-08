import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Award, ClipboardCopy, FileDown, TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, pill, R, CC, G } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import { exportPortfolioResume } from '../lib/exportPDF';

const ACT_TYPES = ['Leadership','Volunteering','Research','Athletics','Arts & Performance','Work Experience','Clubs & Organizations','Other'];
const GRADE_LEVELS = ['9','10','11','12','Post-graduate'];
const STATUSES = ['ongoing','completed'];

function emptyActivity() {
  return { activity_type: ACT_TYPES[0], position: '', organization: '', description: '', impact: '', status: 'ongoing', hours_per_week: '', weeks_per_year: '', grade_levels: [] };
}
function emptyGpa() {
  return { term: '', gpa: '', weighted: false, course_rigor: '' };
}

export default function ActivitiesResumePanel({ accent = C.blue, onResumeExported }) {
  const [activities, setActivities] = useState([]);
  const [awards, setAwards] = useState([]);
  const [gpaEntries, setGpaEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyActivity());
  const [awardDraft, setAwardDraft] = useState({ title: '', grade_level: '', level: '' });
  const [gpaDraft, setGpaDraft] = useState(emptyGpa());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, w, g] = await Promise.all([listItems('activities'), listItems('awards'), listItems('gpa_entries')]);
      setActivities(a);
      setAwards(w);
      setGpaEntries(g);
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

  async function addGpaEntry() {
    if (!gpaDraft.term.trim() || !gpaDraft.gpa) return;
    try {
      const row = await createItem('gpa_entries', { ...gpaDraft, gpa: Number(gpaDraft.gpa) });
      setGpaEntries(prev => [...prev, row]);
      setGpaDraft(emptyGpa());
      toast.success('GPA entry added');
    } catch (err) { toast.error(err.message); }
  }

  async function removeGpaEntry(id) {
    setGpaEntries(prev => prev.filter(g => g.id !== id));
    try { await deleteItem('gpa_entries', id); } catch (err) { toast.error(err.message); }
  }

  function toggleGrade(g) {
    setDraft(prev => ({ ...prev, grade_levels: prev.grade_levels.includes(g) ? prev.grade_levels.filter(x=>x!==g) : [...prev.grade_levels, g] }));
  }

  function exportText() {
    const lines = [];
    lines.push('ACTIVITIES\n');
    activities.forEach((a, i) => {
      lines.push(`${i+1}. ${a.activity_type} — ${a.position}${a.organization?` (${a.organization})`:''}`);
      if (a.description) lines.push(`   ${a.description}`);
      if (a.impact) lines.push(`   Impact: ${a.impact}`);
      lines.push(`   ${a.hours_per_week} hrs/wk, ${a.weeks_per_year} wks/yr · ${a.status} · Grades: ${(a.grade_levels||[]).join(', ')}\n`);
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

  function exportPdf() {
    exportPortfolioResume(null, activities, awards, gpaEntries);
    toast.success('Resume PDF downloaded');
    onResumeExported?.();
  }

  const chartData = useMemo(() => ({
    labels: gpaEntries.map(g => g.term),
    datasets: [{
      label: 'GPA',
      data: gpaEntries.map(g => g.gpa),
      borderColor: accent,
      backgroundColor: `${accent}30`,
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: accent,
    }],
  }), [gpaEntries, accent]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 4.3, ticks: { color: C.t3, stepSize: 0.5 }, grid: { color: C.b1 } },
      x: { ticks: { color: C.t3 }, grid: { display: false } },
    },
  }), []);

  const latestGpa = gpaEntries.length ? gpaEntries[gpaEntries.length - 1].gpa : null;

  return (
    <div style={CC({gap:22})}>
      <div style={R({justifyContent:'space-between',flexWrap:'wrap'})}>
        <div>
          <div style={lbl()}>Applications</div>
          <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Resume Builder</h2>
        </div>
        {(activities.length>0||awards.length>0) && (
          <div style={R({gap:8})}>
            <button style={btnG({fontSize:12})} onClick={exportText}><ClipboardCopy size={13}/>Copy Common App format</button>
            <button style={{...btn(accent!==C.blue?accent:C.blueGrad,{fontSize:12}),display:'inline-flex',alignItems:'center',gap:6}} onClick={exportPdf}><FileDown size={13}/>Download Resume PDF</button>
          </div>
        )}
      </div>

      {/* Academic history / GPA tracker */}
      <div style={glass({padding:18})}>
        <div style={R({justifyContent:'space-between',marginBottom:14})}>
          <div style={lbl({marginBottom:0})}>Academic History</div>
          {latestGpa!==null && <span style={pill(`${accent}20`,accent,{fontFamily:C.FM})}>Current GPA: {latestGpa}</span>}
        </div>
        {gpaEntries.length>1 && (
          <div style={{height:180,marginBottom:18}}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
        <div style={G(4,10,{},true)}>
          <div><label style={lbl()}>Term</label><input style={inp()} placeholder="e.g. Grade 11, Fall" value={gpaDraft.term} onChange={e=>setGpaDraft({...gpaDraft,term:e.target.value})} /></div>
          <div><label style={lbl()}>GPA</label><input type="number" step="0.01" min="0" max="4.3" style={inp()} placeholder="3.85" value={gpaDraft.gpa} onChange={e=>setGpaDraft({...gpaDraft,gpa:e.target.value})} /></div>
          <div><label style={lbl()}>Course rigor (optional)</label><input style={inp()} placeholder="e.g. 4 AP classes" value={gpaDraft.course_rigor} onChange={e=>setGpaDraft({...gpaDraft,course_rigor:e.target.value})} /></div>
          <div>
            <label style={lbl()}>Weighted?</label>
            <button type="button" style={btnSm(gpaDraft.weighted?accent:'rgba(255,255,255,0.06)',{color:'#fff',width:'100%'})} onClick={()=>setGpaDraft({...gpaDraft,weighted:!gpaDraft.weighted})}>{gpaDraft.weighted?'Weighted':'Unweighted'}</button>
          </div>
        </div>
        <button style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:14,display:'inline-flex',alignItems:'center',gap:8}} onClick={addGpaEntry}><TrendingUp size={14}/>Add GPA Entry</button>

        {!loading && gpaEntries.length > 0 && (
          <div style={{...CC({gap:8}),marginTop:16}}>
            {gpaEntries.map(g => (
              <div key={g.id} style={{...glass2({padding:12}),display:'flex',alignItems:'center',gap:12}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{g.term}</span>
                  <span style={{fontSize:12,color:C.t3,marginLeft:8,fontFamily:C.FM}}>GPA {g.gpa}{g.weighted?' (weighted)':''}{g.course_rigor?` · ${g.course_rigor}`:''}</span>
                </div>
                <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeGpaEntry(g.id)}><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
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
        <div style={G(2,10,{marginTop:10},true)}>
          <div>
            <label style={lbl()}>Organization</label>
            <input style={inp()} value={draft.organization} onChange={e=>setDraft({...draft,organization:e.target.value})} placeholder="e.g. Lincoln High School Debate Club" />
          </div>
          <div>
            <label style={lbl()}>Status</label>
            <div style={R({gap:6})}>
              {STATUSES.map(s => (
                <button key={s} type="button" style={btnSm(draft.status===s?accent:'rgba(255,255,255,0.06)',{color:'#fff',flex:1,textTransform:'capitalize'})} onClick={()=>setDraft({...draft,status:s})}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{marginTop:10}}>
          <label style={lbl()}>Description</label>
          <textarea style={{...inp(),minHeight:60,resize:'vertical'}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="What did you do and accomplish?" />
        </div>
        <div style={{marginTop:10}}>
          <label style={lbl()}>Impact / results (optional)</label>
          <textarea style={{...inp(),minHeight:44,resize:'vertical'}} value={draft.impact} onChange={e=>setDraft({...draft,impact:e.target.value})} placeholder="e.g. Grew membership from 12 to 40 students" />
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
                <div style={{fontSize:13,fontWeight:700,color:C.t1}}>
                  {a.position} <span style={{color:C.t3,fontWeight:400}}>· {a.activity_type}{a.organization?` · ${a.organization}`:''}</span>
                  <span style={{...pill(a.status==='ongoing'?C.greenDim:C.blueDim,a.status==='ongoing'?C.greenL:C.blueL,{fontSize:9,marginLeft:8}),textTransform:'capitalize'}}>{a.status}</span>
                </div>
                {a.description && <div style={{fontSize:12,color:C.t2,marginTop:3}}>{a.description}</div>}
                {a.impact && <div style={{fontSize:12,color:accent,marginTop:3,fontWeight:600}}>{a.impact}</div>}
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
