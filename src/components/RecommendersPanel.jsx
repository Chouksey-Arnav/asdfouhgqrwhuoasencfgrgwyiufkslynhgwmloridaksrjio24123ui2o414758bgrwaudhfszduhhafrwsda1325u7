import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';

const STATUSES = ['Planning to ask', 'Asked', 'Confirmed', 'Submitted'];
const STATUS_COLORS = { 'Planning to ask':C.t3, 'Asked':C.amberL, 'Confirmed':C.blueL, 'Submitted':C.greenL };
const RELATIONSHIPS = ['Teacher', 'Counselor', 'Coach', 'Employer/Supervisor', 'Physician/Health Professional Shadowed', 'Research Mentor', 'Other'];

// Supabase-backed (see supabase/migrations/0001_portfolio_credibility_expansion.sql) — this
// used to be local-only Dexie data; it now syncs cross-device like the rest of Portfolio.
export default function RecommendersPanel({ accent = C.blue, onChange }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [type, setType] = useState('individual');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('recommenders')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addEntry(e) {
    e?.preventDefault();
    if (!name.trim()) { toast.error('Recommender name is required.'); return; }
    try {
      const row = await createItem('recommenders', {
        name: name.trim(), relationship, type, status: STATUSES[0],
        due_date: dueDate || null, notes: notes.trim() || null,
      });
      setEntries(prev => [row, ...prev]);
      setName(''); setDueDate(''); setNotes('');
      toast.success(`Added ${name.trim()}`);
      onChange?.();
    } catch (err) { toast.error(err.message); }
  }

  async function cycleStatus(entry) {
    const idx = STATUSES.indexOf(entry.status);
    const status = STATUSES[(idx + 1) % STATUSES.length];
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status } : e));
    try { await updateItem('recommenders', entry.id, { status }); } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('recommenders', id); onChange?.(); } catch (err) { toast.error(err.message); }
  }

  const individuals = entries.filter(e => e.type === 'individual');
  const committee = entries.filter(e => e.type === 'committee');

  return (
    <div style={CC({gap:22})}>
      <div style={R()}>
        <div><div style={lbl()}>Portfolio</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Letters of Recommendation</h2></div>
        <div style={{marginLeft:'auto'}}><span style={pill(C.blueDim,C.blueL)}>{entries.length} tracked</span></div>
      </div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:-14}}>Track who you're asking for a letter — a teacher, counselor, coach, or someone you shadowed — plus your school's pre-health committee letter if it has one.</p>

      <div style={glass({padding:18})}>
        <SL>Add a Recommender</SL>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
            <select style={inp({width:'auto'})} value={relationship} onChange={e=>setRelationship(e.target.value)}>
              {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <select style={inp({width:'auto'})} value={type} onChange={e=>setType(e.target.value)}>
              <option value="individual">Individual Letter</option>
              <option value="committee">Pre-Health Committee Letter</option>
            </select>
            <input type="date" style={inp({width:'auto'})} value={dueDate} onChange={e=>setDueDate(e.target.value)} />
          </div>
          <input style={inp()} placeholder="Notes — what you'd want them to highlight (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Add Recommender</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <Users size={22} color={C.t3} style={{marginBottom:8}}/>
          <div style={{fontSize:13,color:C.t2}}>No recommenders tracked yet — most applications need 2-3 letters, so it's worth lining these up early.</div>
        </div>
      )}

      {committee.length > 0 && <Section title="Committee Letter" items={committee} accent={accent} onCycle={cycleStatus} onRemove={removeEntry}/>}
      {individuals.length > 0 && <Section title={`Individual Letters (${individuals.length})`} items={individuals} accent={accent} onCycle={cycleStatus} onRemove={removeEntry}/>}
    </div>
  );
}

function Section({ title, items, accent, onCycle, onRemove }) {
  return (
    <div style={CC({gap:8})}>
      <SL>{title}</SL>
      {items.map(e => (
        <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'})}}>
          <div style={{width:34,height:34,borderRadius:10,background:`${accent}15`,border:`1px solid ${accent}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><UserCheck size={15} color={accent}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.name}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{e.relationship}{e.due_date?` · due ${new Date(e.due_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:''}</div>
            {e.notes && <div style={{fontSize:11,color:C.t2,marginTop:4}}>{e.notes}</div>}
          </div>
          <div style={{...R({gap:6}),flexShrink:0}}>
            <button onClick={()=>onCycle(e)} style={pill(`${STATUS_COLORS[e.status]}18`,STATUS_COLORS[e.status],{cursor:'pointer',border:'none',fontSize:10})}>{e.status}</button>
            <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>onRemove(e.id)}><Trash2 size={12}/></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
