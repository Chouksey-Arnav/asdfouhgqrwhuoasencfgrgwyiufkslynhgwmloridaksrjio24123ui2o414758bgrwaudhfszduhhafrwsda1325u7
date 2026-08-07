import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, BadgeCheck, ExternalLink, AlertTriangle, ShieldCheck, CalendarClock, Sparkles } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import SuggestInput from './ui/SuggestInput';
import { showMedabrainToast } from '../lib/medabrainComments';
import {
  SKILL_CERT_CATALOG, POPULAR_SKILL_CERTS, ISSUING_BODIES,
  searchSkillCerts, findCatalogEntry, computeExpiry,
} from '../data/skillsCertifications';

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
  // The catalog row behind the current name, when there is one. It drives the issuing-body
  // suggestions and the auto-computed expiry date.
  const [picked, setPicked] = useState(null);
  // True while the expiry field holds a date we filled in from the credential's renewal cycle —
  // it may be recomputed. The moment the student edits the field themselves, this clears and we
  // stop touching their value.
  const [expiryAuto, setExpiryAuto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('skills_certifications')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const trackedNames = useMemo(
    () => new Set(entries.map(e => (e.name || '').trim().toLowerCase())),
    [entries]
  );

  const toOption = useCallback((item) => ({
    key: item.name,
    label: item.name,
    group: item.group,
    sub: item.issuers[0] || (item.kind === 'skill' ? 'Skill / proficiency' : ''),
    meta: trackedNames.has(item.name.toLowerCase())
      ? 'Already added'
      : item.validMonths ? `renews ${item.validMonths}mo` : '',
  }), [trackedNames]);

  // Empty query → the popular shortlist, so the menu is useful the instant the field is focused.
  const nameOptions = useCallback((q) => {
    const items = q.trim()
      ? searchSkillCerts(q)
      : POPULAR_SKILL_CERTS.map(findCatalogEntry).filter(Boolean);
    return items.map(toOption);
  }, [toOption]);

  const issuerOptions = useCallback((q) => {
    const needle = q.trim().toLowerCase();
    // Issuers of the selected credential float to the top — for BLS that's AHA and Red Cross
    // rather than the full alphabetical list of every organization in the catalog.
    const preferred = picked?.issuers || [];
    const ordered = [...preferred, ...ISSUING_BODIES.filter(b => !preferred.includes(b))];
    return ordered
      .filter(b => !needle || b.toLowerCase().includes(needle))
      .slice(0, 12)
      .map(b => ({ key: b, label: b, group: preferred.includes(b) ? 'Issues this credential' : 'All issuing bodies' }));
  }, [picked]);

  function pickCatalogEntry(opt) {
    const item = findCatalogEntry(opt.label);
    setPicked(item);
    if (!item) return;
    // Only fill fields the student has left alone — never overwrite something they typed.
    if (!issuingBody.trim() && item.issuers[0]) setIssuingBody(item.issuers[0]);
    if (item.validMonths && earnedDate && (!expiryDate || expiryAuto)) {
      setExpiryDate(computeExpiry(earnedDate, item.validMonths));
      setExpiryAuto(true);
    }
  }

  function changeName(v) {
    setName(v);
    // Typing away from a picked credential (or onto an exact catalog name) re-syncs the link.
    const match = findCatalogEntry(v);
    if (match?.name !== picked?.name) setPicked(match);
  }

  function changeEarnedDate(v) {
    setEarnedDate(v);
    if (picked?.validMonths && (!expiryDate || expiryAuto)) {
      setExpiryDate(computeExpiry(v, picked.validMonths));
      setExpiryAuto(true);
    }
  }

  function resetForm() {
    setName(''); setIssuingBody(''); setEarnedDate(''); setExpiryDate(''); setCertificateUrl('');
    setPicked(null); setExpiryAuto(false);
  }

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
      resetForm();
      showMedabrainToast('skill_added', { name: row.name });
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this certification?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('skills_certifications', id); } catch (err) { toast.error(err.message); }
  }

  const isExpired = (d) => d && new Date(d + 'T00:00:00') < new Date(new Date().toDateString());
  // "Expiring soon" = within 60 days — enough runway to actually book a renewal.
  const isExpiringSoon = (d) => {
    if (!d || isExpired(d)) return false;
    return (new Date(d + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000 <= 60;
  };
  const activeCount = entries.filter(e => !isExpired(e.expiry_date)).length;
  const expiredCount = entries.length - activeCount;
  const expiringSoon = entries.filter(e => isExpiringSoon(e.expiry_date)).length;

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-skills" icon={BadgeCheck} color={accent} color2={C.cyan}
        eyebrow="Portfolio" title="Skills & Certifications"
        sub="CPR/BLS, EMT, lifeguard, lab safety — anything with a real certificate and an expiration date. Concrete, checkable credentials rather than self-described skills."
        stats={entries.length > 0 ? [{ value: entries.length, label: 'tracked' }] : []}/>

      {entries.length > 0 && (
        <div style={G(3,12,{},true)}>
          <StatTile icon={ShieldCheck} value={activeCount} label="Active credentials" color={C.green}/>
          <StatTile icon={CalendarClock} value={expiringSoon} label="Expiring within 60 days" color={expiringSoon > 0 ? C.amber : accent}/>
          <StatTile icon={AlertTriangle} value={expiredCount} label="Expired" color={expiredCount > 0 ? C.rose : C.t3}/>
        </div>
      )}

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Add a Skill or Certification</SectionTitle>
        <form onSubmit={addEntry} style={CC({gap:10})}>
          <div style={R({gap:10,flexWrap:'wrap',alignItems:'flex-start'})}>
            <SuggestInput
              value={name} onChange={changeName} onPick={pickCatalogEntry}
              getOptions={nameOptions}
              placeholder="Start typing — e.g. CPR, EMT, CITI, phlebotomy"
              emptyHint={`Most common credentials — or type any of ${SKILL_CERT_CATALOG.length}+ skills and certifications`}
              inputStyle={{width:'100%'}} wrapperStyle={{flex:1,minWidth:200}}
            />
            <SuggestInput
              value={issuingBody} onChange={v=>{ setIssuingBody(v); }}
              getOptions={issuerOptions}
              placeholder="Issuing body (e.g. American Red Cross)"
              inputStyle={{width:'100%'}} wrapperStyle={{flex:1,minWidth:200}}
            />
          </div>
          {picked && (
            <div style={{...R({gap:6,alignItems:'center'}),fontSize:11,color:C.t3}}>
              <Sparkles size={11} color={accent}/>
              <span>
                {picked.group} · {picked.kind === 'skill' ? 'proficiency, no expiration' : picked.validMonths
                  ? `typically renews every ${picked.validMonths} months — set the earned date and we'll fill in the expiry`
                  : 'no expiration date'}
              </span>
            </div>
          )}
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input type="date" style={inp({width:'auto'})} placeholder="Earned" value={earnedDate} onChange={e=>changeEarnedDate(e.target.value)} />
            <input type="date" style={inp({width:'auto'})} placeholder="Expires" value={expiryDate} onChange={e=>{ setExpiryDate(e.target.value); setExpiryAuto(false); }} />
            {expiryAuto && expiryDate && <span style={pill(tint(accent,0.12),accent,{fontSize:10,alignSelf:'center'})}>auto-filled · editable</span>}
          </div>
          <input style={inp()} placeholder="Certificate link (optional)" value={certificateUrl} onChange={e=>setCertificateUrl(e.target.value)} />
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),alignSelf:'flex-start'}}><Plus size={14}/>Add to Portfolio</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({padding:24,textAlign:'center'})}>
          <div style={{width:46,height:46,borderRadius:14,background:tint(accent,0.12),border:`1px solid ${tint(accent,0.28)}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
            <BadgeCheck size={20} color={accent}/>
          </div>
          <div style={{fontSize:13,color:C.t2}}>No certifications logged yet.</div>
        </div>
      )}

      <div style={CC({gap:8})}>
        {entries.map(e => {
          const expired = isExpired(e.expiry_date);
          const soon = isExpiringSoon(e.expiry_date);
          const sc = expired ? C.rose : soon ? C.amber : C.green;
          return (
          <div key={e.id} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'}),borderLeft:`3px solid ${sc}`,background:`linear-gradient(120deg,${tint(sc,0.05)},rgba(255,255,255,0.02) 55%)`,opacity:expired?0.7:1}}>
            <div style={{width:34,height:34,borderRadius:10,background:tint(accent,0.13),border:`1px solid ${tint(accent,0.25)}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><BadgeCheck size={15} color={accent}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{e.name}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{e.issuing_body}{e.expiry_date?` · expires ${new Date(e.expiry_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:''}</div>
              {e.certificate_url && <a href={e.certificate_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:accent,marginTop:4,display:'inline-flex',alignItems:'center',gap:4}}>View certificate<ExternalLink size={10}/></a>}
            </div>
            <div style={{...R({gap:6}),flexShrink:0}}>
              {expired && <span style={pill(C.roseDim,C.rose,{fontSize:10})}><AlertTriangle size={10} style={{marginRight:4}}/>Expired</span>}
              {soon && <span style={pill(C.amberDim,C.amberL,{fontSize:10})}><CalendarClock size={10} style={{marginRight:4}}/>Renew soon</span>}
              {!expired && !soon && <span style={pill(C.greenDim,C.greenL,{fontSize:10})}><ShieldCheck size={10} style={{marginRight:4}}/>Active</span>}
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeEntry(e.id)}><Trash2 size={12}/></button>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

function SL({ children }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14}}>{children}</div>; }
