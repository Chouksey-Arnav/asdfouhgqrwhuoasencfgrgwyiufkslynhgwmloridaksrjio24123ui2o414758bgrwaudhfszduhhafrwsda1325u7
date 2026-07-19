import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';

const KINDS = [
  { id: 'common_app_open', label: 'Common App Opens' },
  { id: 'early_action', label: 'Early Action' },
  { id: 'early_decision', label: 'Early Decision' },
  { id: 'regular_decision', label: 'Regular Decision' },
  { id: 'fafsa', label: 'FAFSA Opens' },
  { id: 'css_profile', label: 'CSS Profile' },
  { id: 'ap_exam', label: 'AP Exam' },
  { id: 'ib_exam', label: 'IB Exam' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'custom', label: 'Custom' },
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

export default function DeadlinesPanel({ accent = C.blue }) {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [kind, setKind] = useState('custom');

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeadlines(await listItems('deadlines')); }
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
      toast.success('Deadline added');
    } catch (err) { toast.error(err.message); }
  }

  async function seedDefaults() {
    try {
      const created = await Promise.all(DEFAULT_DEADLINES.map(d => createItem('deadlines', d)));
      setDeadlines(prev => [...prev, ...created].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
      toast.success('Added common admissions deadlines');
    } catch (err) { toast.error(err.message); }
  }

  async function removeDeadline(id) {
    if (!window.confirm('Remove this deadline?')) return;
    setDeadlines(prev => prev.filter(d => d.id !== id));
    try { await deleteItem('deadlines', id); } catch (err) { toast.error(err.message); }
  }

  const sorted = [...deadlines].sort((a,b)=>a.due_date.localeCompare(b.due_date));

  return (
    <div style={CC({gap:22})}>
      <div>
        <div style={lbl()}>Applications</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Deadlines</h2>
      </div>

      <div style={glass({padding:18})}>
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
          const urgent = !past && days <= 14;
          return (
            <div key={d.id} style={{...glass2({padding:14}),display:'flex',alignItems:'center',gap:14,opacity:past?0.5:1}}>
              <div style={{width:56,textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:20,fontWeight:800,color:urgent?C.roseL:C.t1,fontFamily:C.FD}}>{past?'—':days}</div>
                <div style={{fontSize:9,color:C.t3,textTransform:'uppercase'}}>{past?'past':'days'}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{d.title}</div>
                <div style={R({gap:8,marginTop:3})}>
                  <span style={{fontSize:11,color:C.t3}}>{new Date(d.due_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span>
                  <span style={pill(C.blueDim,C.blueL,{fontSize:9})}>{KINDS.find(k=>k.id===d.kind)?.label || 'Custom'}</span>
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
