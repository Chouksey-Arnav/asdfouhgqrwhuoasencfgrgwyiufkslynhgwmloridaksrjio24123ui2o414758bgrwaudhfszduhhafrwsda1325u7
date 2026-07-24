import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Clock, Stethoscope, ShieldCheck, ShieldQuestion, Building2 } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';

const SITE_TYPES = [
  'Hospital', 'Outpatient Clinic', 'Physician Office', 'Dental Office',
  'Pharmacy', 'PT/Rehab Clinic', 'Research Lab', 'Community Health / Free Clinic', 'Other',
];
// Site types each get a colour so the per-site hour tiles and entry rows read
// as distinct kinds of clinical exposure at a glance.
const SITE_COLORS = {
  Hospital: C.rose, 'Outpatient Clinic': C.sky, 'Physician Office': C.blue, 'Dental Office': C.cyan,
  Pharmacy: C.green, 'PT/Rehab Clinic': C.orange, 'Research Lab': C.violet,
  'Community Health / Free Clinic': C.teal, Other: C.t3,
};

// Supabase-backed (see supabase/migrations/0001_portfolio_credibility_expansion.sql) — this
// used to be local-only Dexie data; it now syncs cross-device and carries a verification_status
// field like the rest of Portfolio, closing the credibility gap the local-only version had.
export default function ClinicalHoursPanel({ accent = C.blue, onLogged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState(SITE_TYPES[0]);
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [hours, setHours] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('clinical_hours')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addEntry(e) {
    e?.preventDefault();
    const h = parseFloat(hours);
    if (!siteName.trim() || !h || h <= 0 || !entryDate) { toast.error('Site name, hours, and date are required.'); return; }
    try {
      const row = await createItem('clinical_hours', {
        site_name: siteName.trim(), site_type: siteType,
        supervisor_name: supervisorName.trim() || null, supervisor_email: supervisorEmail.trim() || null,
        hours: h, entry_date: entryDate, notes: notes.trim() || null,
      });
      setEntries(prev => [row, ...prev].sort((a,b)=>b.entry_date.localeCompare(a.entry_date)));
      setSiteName(''); setSupervisorName(''); setSupervisorEmail(''); setHours(''); setEntryDate(''); setNotes('');
      toast.success(`Logged ${h}h at ${row.site_name}`);
      onLogged?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this logged hours entry?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('clinical_hours', id); } catch (err) { toast.error(err.message); }
  }

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);
  const bySite = SITE_TYPES.map(t => ({ type: t, hours: entries.filter(e => e.site_type === t).reduce((s, e) => s + (e.hours || 0), 0) })).filter(s => s.hours > 0);
  const verifiedHours = entries.filter(e => e.verification_status === 'verified').reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-clinical" icon={Stethoscope} color={accent} color2={C.rose}
        eyebrow="Portfolio" title="Clinical & Shadowing Hours"
        sub="Log every shadowing day, volunteer shift, or clinical hour — most health-career applications ask for this exact history, and it feeds your readiness score. Add a supervisor's contact so an entry can eventually be marked verified instead of self-reported."
        stats={[
          { value: totalHours.toLocaleString(), label: 'total hours', color: accent },
          ...(verifiedHours > 0 ? [{ icon: <ShieldCheck size={11}/>, value: `${verifiedHours}h`, label: 'verified', color: C.greenL }] : []),
          ...(entries.length > 0 ? [{ value: entries.length, label: entries.length === 1 ? 'entry' : 'entries', color: C.roseL }] : []),
        ]}/>

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Log New Hours</SectionTitle>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Site name (e.g. St. Mary's ER)" value={siteName} onChange={e=>setSiteName(e.target.value)} />
            <select style={inp({width:'auto'})} value={siteType} onChange={e=>setSiteType(e.target.value)}>
              {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Supervisor name (optional)" value={supervisorName} onChange={e=>setSupervisorName(e.target.value)} />
            <input type="email" style={inp({flex:1,minWidth:160})} placeholder="Supervisor email (optional)" value={supervisorEmail} onChange={e=>setSupervisorEmail(e.target.value)} />
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input type="number" min="0" step="0.5" style={inp({width:110})} placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)} />
            <input type="date" style={inp({width:'auto'})} value={entryDate} onChange={e=>setEntryDate(e.target.value)} />
          </div>
          <input style={inp()} placeholder="What did you actually do or observe? (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Log Hours</button>
        </form>
      </div>

      {bySite.length > 0 && (
        <div style={G3(bySite.length)}>
          {bySite.map(s => {
            const sc = SITE_COLORS[s.type] || accent;
            return <StatTile key={s.type} icon={Building2} value={`${s.hours}h`} label={s.type} color={sc}/>;
          })}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <div style={{width:46,height:46,borderRadius:14,background:tint(accent,0.12),border:`1px solid ${tint(accent,0.28)}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
            <Stethoscope size={20} color={accent}/>
          </div>
          <div style={{fontSize:13,color:C.t2}}>No hours logged yet — add your first shadowing day or volunteer shift above.</div>
        </div>
      )}

      <div style={CC({gap:8})}>
        {entries.map(e => {
          const sc = SITE_COLORS[e.site_type] || accent;
          return (
          <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'}),background:`linear-gradient(120deg,${tint(sc,0.05)},rgba(255,255,255,0.02) 55%)`}}>
            <div style={{width:4,height:44,borderRadius:2,background:`linear-gradient(180deg,${sc},${tint(sc,0.35)})`,flexShrink:0,boxShadow:`0 0 8px ${tint(sc,0.4)}`}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.site_name}{e.supervisor_name?` · ${e.supervisor_name}`:''}</div>
              <div style={{fontSize:11,marginTop:2,fontFamily:C.FM}}><span style={{color:sc,fontWeight:700}}>{e.site_type}</span><span style={{color:C.t3}}> · {new Date(e.entry_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span></div>
              {e.notes && <div style={{fontSize:11,color:C.t2,marginTop:4}}>{e.notes}</div>}
            </div>
            <div style={{...R({gap:6}),flexShrink:0}}>
              <VerificationBadge status={e.verification_status} />
              <span style={pill(tint(sc,0.13),sc,{fontFamily:C.FM})}><Clock size={10} style={{marginRight:4}}/>{e.hours}h</span>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeEntry(e.id)}><Trash2 size={12}/></button>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

function VerificationBadge({ status }) {
  if (status === 'verified') return <span style={pill(C.greenDim,C.greenL)}><ShieldCheck size={10} style={{marginRight:4}}/>Verified</span>;
  if (status === 'pending') return <span style={pill(C.amberDim,C.amberL)}><ShieldQuestion size={10} style={{marginRight:4}}/>Pending</span>;
  return <span style={pill('rgba(255,255,255,0.06)',C.t3)}><ShieldQuestion size={10} style={{marginRight:4}}/>Self-reported</span>;
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
function G3(count) { return { display:'grid', gridTemplateColumns:`repeat(${Math.min(count,4)},1fr)`, gap:10 }; }
