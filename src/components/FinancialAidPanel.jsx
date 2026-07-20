import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, DollarSign, CalendarPlus } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';

const STATUSES = [
  { id: 'researching', label: 'Researching', color: C.t3 },
  { id: 'applying', label: 'Applying', color: C.blueL },
  { id: 'submitted', label: 'Submitted', color: C.amberL },
  { id: 'awarded', label: 'Awarded', color: C.greenL },
  { id: 'denied', label: 'Denied', color: C.roseL },
];

export default function FinancialAidPanel({ accent = C.blue }) {
  const [scholarships, setScholarships] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [deadlineCollegeIds, setDeadlineCollegeIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, d] = await Promise.all([listItems('scholarships'), listItems('colleges'), listItems('deadlines')]);
      setScholarships(s);
      setColleges(c);
      setDeadlineCollegeIds(new Set(d.filter(x => x.kind === 'css_profile' && x.college_id).map(x => x.college_id)));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addAidDeadline(college) {
    try {
      await createItem('deadlines', { college_id: college.id, title: `${college.name} — Financial Aid Deadline`, due_date: college.financial_aid_deadline, kind: 'css_profile' });
      setDeadlineCollegeIds(prev => new Set([...prev, college.id]));
      toast.success('Added to Deadlines');
    } catch (err) { toast.error(err.message); }
  }

  const aidSchools = colleges.filter(c => c.css_profile_required || c.financial_aid_deadline);

  async function addScholarship(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (amount && Number(amount) < 0) { toast.error('Amount can\'t be negative.'); return; }
    try {
      const row = await createItem('scholarships', { name: name.trim(), amount: amount ? Number(amount) : null, deadline: deadline || null, status: 'researching' });
      setScholarships(prev => [...prev, row]);
      setName(''); setAmount(''); setDeadline('');
      toast.success('Added to your list');
    } catch (err) { toast.error(err.message); }
  }

  async function updateRow(id, patch) {
    setScholarships(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    try { await updateItem('scholarships', id, patch); } catch (err) { toast.error(err.message); }
  }

  async function removeRow(id) {
    if (!window.confirm('Remove this scholarship?')) return;
    setScholarships(prev => prev.filter(s => s.id !== id));
    try { await deleteItem('scholarships', id); } catch (err) { toast.error(err.message); }
  }

  const totalAwarded = scholarships.filter(s => s.status === 'awarded').reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div style={CC({gap:22})}>
      <div>
        <div style={lbl()}>Applications</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Financial Aid & Scholarships</h2>
      </div>

      <div style={glass2({padding:16})}>
        <div style={R({gap:20,flexWrap:'wrap'})}>
          <span style={{fontSize:13,color:C.t1,fontWeight:700}}>{scholarships.length} tracked</span>
          {totalAwarded > 0 && <span style={{fontSize:13,color:C.greenL,fontWeight:700}}><DollarSign size={12} style={{display:'inline'}}/>{totalAwarded.toLocaleString()} awarded</span>}
        </div>
      </div>

      <div style={glass({padding:18})}>
        <div style={lbl()}>FAFSA & CSS Profile</div>
        <p style={{fontSize:12,color:C.t2,marginBottom:aidSchools.length?14:0,lineHeight:1.6}}>FAFSA typically opens October 1 — add it to your Deadlines tab so it counts down alongside your application deadlines. Mark CSS Profile requirements and financial aid deadlines per school on the College List tab; they'll show up here.</p>
        {aidSchools.length > 0 && (
          <div style={CC({gap:8})}>
            {aidSchools.map(c => (
              <div key={c.id} style={{...glass2({padding:'10px 12px'}),display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{c.name}</span>
                  {c.css_profile_required && <span style={{marginLeft:8,fontSize:10,color:C.violetL}}>CSS Profile</span>}
                </div>
                {c.financial_aid_deadline ? (
                  <>
                    <span style={{fontSize:11,color:C.t3}}>Due {new Date(c.financial_aid_deadline+'T00:00:00').toLocaleDateString()}</span>
                    {!deadlineCollegeIds.has(c.id) && (
                      <button style={btnSm('rgba(255,255,255,0.06)',{color:C.t2})} onClick={()=>addAidDeadline(c)}><CalendarPlus size={12}/>Track</button>
                    )}
                  </>
                ) : <span style={{fontSize:11,color:C.t3}}>No deadline set yet</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={glass({padding:18})}>
        <div style={lbl()}>Add a scholarship</div>
        <form onSubmit={addScholarship} style={R({gap:10,flexWrap:'wrap'})}>
          <input style={inp({flex:1,minWidth:160})} placeholder="Scholarship name" value={name} onChange={e=>setName(e.target.value)} />
          <input type="number" min="0" style={inp({width:120})} placeholder="Amount ($)" value={amount} onChange={e=>setAmount(e.target.value)} />
          <input type="date" style={inp({width:'auto'})} value={deadline} onChange={e=>setDeadline(e.target.value)} />
          <button type="submit" style={btn(accent!==C.blue?accent:C.blueGrad)}><Plus size={14}/>Add</button>
        </form>
      </div>

      {!loading && scholarships.length === 0 ? (
        <div style={glass({padding:30,textAlign:'center'})}>
          <div style={{fontSize:14,color:C.t2}}>No scholarships tracked yet.</div>
        </div>
      ) : (
        <div style={CC({gap:8})}>
          {scholarships.map(s => {
            const st = STATUSES.find(x => x.id === s.status) || STATUSES[0];
            return (
              <div key={s.id} style={{...glass2({padding:14}),display:'flex',alignItems:'center',gap:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{s.name}</div>
                  <div style={R({gap:8,marginTop:3})}>
                    {s.amount && <span style={{fontSize:11,color:C.t3}}>${s.amount.toLocaleString()}</span>}
                    {s.deadline && <span style={{fontSize:11,color:C.t3}}>Due {new Date(s.deadline+'T00:00:00').toLocaleDateString()}</span>}
                  </div>
                </div>
                <select style={inp({width:'auto',fontSize:12,padding:'6px 10px'})} value={s.status} onChange={e=>updateRow(s.id,{status:e.target.value})}>
                  {STATUSES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
                <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeRow(s.id)}><Trash2 size={12}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
