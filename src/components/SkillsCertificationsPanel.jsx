import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, BadgeCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';

// New Portfolio resource — part of the "crazy in-depth" database expansion (see
// supabase/migrations/0001_portfolio_credibility_expansion.sql). Certifications like CPR/BLS/EMT
// are concrete, dated, verifiable credentials — distinct from the free-text activities list.
export default function SkillsCertificationsPanel({ accent = C.blue }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [earnedDate, setEarnedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('skills_certifications')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addEntry(e) {
    e?.preventDefault();
    if (!name.trim()) { toast.error('Certification name is required.'); return; }
    try {
      const row = await createItem('skills_certifications', {
        name: name.trim(), issuing_body: issuingBody.trim() || null,
        earned_date: earnedDate || null, expiry_date: expiryDate || null,
        certificate_url: certificateUrl.trim() || null,
      });
      setEntries(prev => [row, ...prev]);
      setName(''); setIssuingBody(''); setEarnedDate(''); setExpiryDate(''); setCertificateUrl('');
      toast.success(`Added ${row.name}`);
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this certification?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('skills_certifications', id); } catch (err) { toast.error(err.message); }
  }

  const isExpired = (d) => d && new Date(d + 'T00:00:00') < new Date(new Date().toDateString());

  return (
    <div style={CC({gap:22})}>
      <div style={R()}>
        <div data-tour="portfolio-deep-skills"><div style={lbl()}>Portfolio</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Skills & Certifications</h2></div>
        <div style={{marginLeft:'auto'}}><span style={pill(C.blueDim,C.blueL)}>{entries.length} tracked</span></div>
      </div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:-14}}>CPR/BLS, EMT, lifeguard, lab safety — anything with a real certificate and an expiration date. These are concrete, checkable credentials rather than self-described skills.</p>

      <div style={glass({padding:18})}>
        <SL>Add a Certification</SL>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="e.g. CPR/BLS for Healthcare Providers" value={name} onChange={e=>setName(e.target.value)} />
            <input style={inp({flex:1,minWidth:160})} placeholder="Issuing body (e.g. American Red Cross)" value={issuingBody} onChange={e=>setIssuingBody(e.target.value)} />
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input type="date" style={inp({width:'auto'})} placeholder="Earned" value={earnedDate} onChange={e=>setEarnedDate(e.target.value)} />
            <input type="date" style={inp({width:'auto'})} placeholder="Expires" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} />
          </div>
          <input style={inp()} placeholder="Certificate link (optional)" value={certificateUrl} onChange={e=>setCertificateUrl(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Add Certification</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <BadgeCheck size={22} color={C.t3} style={{marginBottom:8}}/>
          <div style={{fontSize:13,color:C.t2}}>No certifications logged yet.</div>
        </div>
      )}

      <div style={CC({gap:8})}>
        {entries.map(e => (
          <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'})}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${accent}15`,border:`1px solid ${accent}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><BadgeCheck size={15} color={accent}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.name}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{e.issuing_body}{e.expiry_date?` · expires ${new Date(e.expiry_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:''}</div>
              {e.certificate_url && <a href={e.certificate_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:accent,marginTop:4,display:'inline-flex',alignItems:'center',gap:4}}>View certificate<ExternalLink size={10}/></a>}
            </div>
            <div style={{...R({gap:6}),flexShrink:0}}>
              {isExpired(e.expiry_date) && <span style={pill(C.roseDim,C.rose,{fontSize:10})}><AlertTriangle size={10} style={{marginRight:4}}/>Expired</span>}
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeEntry(e.id)}><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
