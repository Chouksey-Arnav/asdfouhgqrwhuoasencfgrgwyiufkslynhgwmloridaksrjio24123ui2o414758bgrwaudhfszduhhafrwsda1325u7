import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Clock, Stethoscope } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import * as DB from '../lib/db';

const SITE_TYPES = [
  'Hospital', 'Outpatient Clinic', 'Physician Office', 'Dental Office',
  'Pharmacy', 'PT/Rehab Clinic', 'Research Lab', 'Community Health / Free Clinic', 'Other',
];

export default function ClinicalHoursPanel({ accent = C.blue, onLogged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState(SITE_TYPES[0]);
  const [supervisorName, setSupervisorName] = useState('');
  const [hours, setHours] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await DB.getClinicalHours()); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addEntry(e) {
    e?.preventDefault();
    const h = parseFloat(hours);
    if (!siteName.trim() || !h || h <= 0 || !entryDate) { toast.error('Site name, hours, and date are required.'); return; }
    try {
      const id = await DB.addClinicalHours({ siteName: siteName.trim(), siteType, supervisorName: supervisorName.trim(), hours: h, entryDate, notes: notes.trim() });
      const row = { id, siteName: siteName.trim(), siteType, supervisorName: supervisorName.trim(), hours: h, entryDate, notes: notes.trim() };
      setEntries(prev => [row, ...prev].sort((a,b)=>b.entryDate.localeCompare(a.entryDate)));
      setSiteName(''); setSupervisorName(''); setHours(''); setEntryDate(''); setNotes('');
      toast.success(`Logged ${h}h at ${row.siteName}`);
      onLogged?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await DB.deleteClinicalHours(id); } catch (err) { toast.error(err.message); }
  }

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);
  const bySite = SITE_TYPES.map(t => ({ type: t, hours: entries.filter(e => e.siteType === t).reduce((s, e) => s + (e.hours || 0), 0) })).filter(s => s.hours > 0);

  return (
    <div style={CC({gap:22})}>
      <div style={R()}>
        <div><div style={lbl()}>Portfolio</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Clinical & Shadowing Hours</h2></div>
        <div style={{marginLeft:'auto'}}><span style={pill(C.blueDim,C.blueL)}>{totalHours.toLocaleString()} total hours</span></div>
      </div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:-14}}>Log every shadowing day, volunteer shift, or clinical hour — most health-career applications ask for this exact history, and it feeds your readiness score on the Progress page.</p>

      <div style={glass({padding:18})}>
        <SL>Log New Hours</SL>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Site name (e.g. St. Mary's ER)" value={siteName} onChange={e=>setSiteName(e.target.value)} />
            <select style={inp({width:'auto'})} value={siteType} onChange={e=>setSiteType(e.target.value)}>
              {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Supervisor name (optional)" value={supervisorName} onChange={e=>setSupervisorName(e.target.value)} />
            <input type="number" min="0" step="0.5" style={inp({width:110})} placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)} />
            <input type="date" style={inp({width:'auto'})} value={entryDate} onChange={e=>setEntryDate(e.target.value)} />
          </div>
          <input style={inp()} placeholder="What did you actually do or observe? (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Log Hours</button>
        </form>
      </div>

      {bySite.length > 0 && (
        <div style={G3(bySite.length)}>
          {bySite.map(s => (
            <div key={s.type} style={glass2({padding:14})}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>{s.type}</div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1,marginTop:4}}>{s.hours}h</div>
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <Stethoscope size={22} color={C.t3} style={{marginBottom:8}}/>
          <div style={{fontSize:13,color:C.t2}}>No hours logged yet — add your first shadowing day or volunteer shift above.</div>
        </div>
      )}

      <div style={CC({gap:8})}>
        {entries.map(e => (
          <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'})}}>
            <div style={{width:4,height:44,borderRadius:2,background:`linear-gradient(180deg,${accent},${accent}60)`,flexShrink:0,boxShadow:`0 0 8px ${accent}40`}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.siteName}{e.supervisorName?` · ${e.supervisorName}`:''}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2,fontFamily:C.FM}}>{e.siteType} · {new Date(e.entryDate+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</div>
              {e.notes && <div style={{fontSize:11,color:C.t2,marginTop:4}}>{e.notes}</div>}
            </div>
            <div style={{...R({gap:6}),flexShrink:0}}>
              <span style={pill(C.blueDim,C.blueL,{fontFamily:C.FM})}><Clock size={10} style={{marginRight:4}}/>{e.hours}h</span>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeEntry(e.id)}><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
function G3(count) { return { display:'grid', gridTemplateColumns:`repeat(${Math.min(count,4)},1fr)`, gap:10 }; }
