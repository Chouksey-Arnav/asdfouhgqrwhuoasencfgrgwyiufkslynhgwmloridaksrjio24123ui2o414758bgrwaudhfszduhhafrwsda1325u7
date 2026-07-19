import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, FlaskConical, ExternalLink } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, pill } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';

const STATUSES = ['Ongoing', 'Completed', 'Published'];

// New Portfolio resource — part of the "crazy in-depth" database expansion (see
// supabase/migrations/0001_portfolio_credibility_expansion.sql). Research is one of the most
// differentiating things a pre-health applicant can show, so it gets its own tracked table
// instead of being crammed into the generic activities list.
export default function ResearchExperiencePanel({ accent = C.blue }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [institution, setInstitution] = useState('');
  const [description, setDescription] = useState('');
  const [publicationUrl, setPublicationUrl] = useState('');
  const [hours, setHours] = useState('');
  const [status, setStatus] = useState(STATUSES[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('research_experience')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addEntry(e) {
    e?.preventDefault();
    if (!title.trim()) { toast.error('Project title is required.'); return; }
    try {
      const row = await createItem('research_experience', {
        title: title.trim(), mentor_name: mentorName.trim() || null, institution: institution.trim() || null,
        description: description.trim() || null, publication_url: publicationUrl.trim() || null,
        hours: hours ? parseFloat(hours) : null, status,
      });
      setEntries(prev => [row, ...prev]);
      setTitle(''); setMentorName(''); setInstitution(''); setDescription(''); setPublicationUrl(''); setHours('');
      toast.success(`Added ${row.title}`);
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this research experience?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('research_experience', id); } catch (err) { toast.error(err.message); }
  }

  return (
    <div style={CC({gap:22})}>
      <div style={R()}>
        <div><div style={lbl()}>Portfolio</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Research Experience</h2></div>
        <div style={{marginLeft:'auto'}}><span style={pill(C.blueDim,C.blueL)}>{entries.length} logged</span></div>
      </div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:-14}}>Track lab work, independent projects, or mentored research — link a publication or poster if you have one; it's one of the strongest signals an application can show.</p>

      <div style={glass({padding:18})}>
        <SL>Add Research Experience</SL>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:200})} placeholder="Project title" value={title} onChange={e=>setTitle(e.target.value)} />
            <select style={inp({width:'auto'})} value={status} onChange={e=>setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input style={inp({flex:1,minWidth:160})} placeholder="Mentor / PI name (optional)" value={mentorName} onChange={e=>setMentorName(e.target.value)} />
            <input style={inp({flex:1,minWidth:160})} placeholder="Institution / lab (optional)" value={institution} onChange={e=>setInstitution(e.target.value)} />
            <input type="number" min="0" step="0.5" style={inp({width:110})} placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)} />
          </div>
          <input style={inp()} placeholder="What did you actually do? (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
          <input style={inp()} placeholder="Publication / poster / abstract link (optional)" value={publicationUrl} onChange={e=>setPublicationUrl(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Add Research</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <FlaskConical size={22} color={C.t3} style={{marginBottom:8}}/>
          <div style={{fontSize:13,color:C.t2}}>No research logged yet — even a single independent project is worth tracking here.</div>
        </div>
      )}

      <div style={CC({gap:8})}>
        {entries.map(e => (
          <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'})}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${accent}15`,border:`1px solid ${accent}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><FlaskConical size={15} color={accent}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.title}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{[e.mentor_name,e.institution].filter(Boolean).join(' · ')}{e.hours?` · ${e.hours}h`:''}</div>
              {e.description && <div style={{fontSize:11,color:C.t2,marginTop:4}}>{e.description}</div>}
              {e.publication_url && <a href={e.publication_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:accent,marginTop:4,display:'inline-flex',alignItems:'center',gap:4}}>View publication<ExternalLink size={10}/></a>}
            </div>
            <div style={{...R({gap:6}),flexShrink:0}}>
              <span style={pill(`${accent}18`,accent,{fontSize:10})}>{e.status}</span>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeEntry(e.id)}><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
