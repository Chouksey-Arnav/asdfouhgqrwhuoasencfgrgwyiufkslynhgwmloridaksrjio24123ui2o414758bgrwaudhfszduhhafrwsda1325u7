import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Trash2, DollarSign, CalendarPlus, Handshake, Landmark, Trophy, Send, Search as SearchIcon, CalendarX, ChevronDown, ChevronUp, Building2, Users, FileText } from 'lucide-react';
import { C, glass, glass2, btnSm, inp, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, updateItem, deleteItem } from '../lib/dataApi';
import { trackItem, cancelQueuedTrack } from '../lib/trackQueue';
import { usePendingTrackKeys, useTrackQueueDrain } from '../lib/useTrackQueue';
import { trackedKeySet, rowDedupeKey, needsDeadlineDate, normalizeKey, scholarshipRowFromResearch, formatScholarshipNotes } from '../lib/trackingCatalog';
import { parseScholarshipNotes } from '../lib/scholarshipNotes';
import TrackQueueNotice from './ui/TrackQueueNotice';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import ScholarshipDatabase from './ScholarshipDatabase';
import ScholarshipResearchAdd from './ScholarshipResearchAdd';
import { showMedabrainToast } from '../lib/medabrainComments';

const STATUSES = [
  { id: 'researching', label: 'Researching', color: C.t3 },
  { id: 'applying', label: 'Applying', color: C.blueL },
  { id: 'submitted', label: 'Submitted', color: C.amberL },
  { id: 'awarded', label: 'Awarded', color: C.greenL },
  { id: 'denied', label: 'Denied', color: C.roseL },
];

export default function FinancialAidPanel({ accent = C.blue, askMedabrain }) {
  const [scholarships, setScholarships] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [deadlineCollegeIds, setDeadlineCollegeIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const { byResource: pendingByResource, entries: pendingEntries, status: trackStatus, refresh: refreshPending } = usePendingTrackKeys();

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

  // A queued track that flushes in the background has to become visible without a reload —
  // otherwise the student is staring at a scholarship list that doesn't contain the thing they
  // just tracked.
  useTrackQueueDrain(load);

  const trackedScholarshipKeys = useMemo(() => trackedKeySet('scholarships', scholarships), [scholarships]);
  const pendingScholarshipKeys = pendingByResource.scholarships || new Set();
  const missingDeadlines = useMemo(() => needsDeadlineDate(scholarships), [scholarships]);

  async function addAidDeadline(college) {
    const title = `${college.name} — Financial Aid Deadline`;
    const row = { college_id: college.id, title, due_date: college.financial_aid_deadline, kind: 'css_profile' };
    const res = await trackItem('deadlines', row, { dedupeKey: rowDedupeKey('deadlines', row), label: title });
    setDeadlineCollegeIds(prev => new Set([...prev, college.id]));
    if (res.status === 'queued') toast('Saved on this device — it\'ll reach your Deadlines tab once you reconnect.', { icon: '📥', duration: 6000 });
    else if (res.status === 'duplicate') toast('Already on your Deadlines tab', { icon: '✓' });
    else toast.success('Added to Deadlines');
  }

  const aidSchools = colleges.filter(c => c.css_profile_required || c.financial_aid_deadline);

  // Used by ScholarshipResearchAdd (the "Add New Scholarship" flow below) — `fields` is whatever
  // Medabrain researched (or the student's own manual entry if they skipped research), already
  // reviewed/edited by the student before this fires. `researched` tells us which builder to use:
  // a skipped-research row must NOT carry the "Researched by Medabrain" provenance marker, since
  // Medabrain never actually looked at it — that would misrepresent the student's own free text as
  // a model lookup. Throws on failure so the component's own error state can surface it.
  async function addResearchedScholarship(name, fields, researched) {
    const draft = researched
      ? scholarshipRowFromResearch(name, fields)
      : { name, notes: formatScholarshipNotes({ ...fields, sourceNote: null }) || null, status: 'researching', amount: null, deadline: null };
    const res = await trackItem('scholarships', draft, { dedupeKey: normalizeKey(name), label: name, existing: scholarships });
    if (res.status === 'duplicate') { toast(`${name} is already in your tracker`, { icon: '✓' }); return res; }
    if (res.status === 'created') {
      setScholarships(prev => [...prev, res.row]);
      showMedabrainToast('scholarship_added', { name: res.row.name });
    } else {
      toast(`${name} is saved on this device and will finish saving to your account shortly.`, { icon: '📥', duration: 6000 });
    }
    return res;
  }

  // Used by the ScholarshipDatabase search below. The row itself is built by
  // src/lib/trackingCatalog.js (shared with the opportunities database) and saved through the
  // durable Track outbox, so a dropped connection queues it instead of losing it.
  async function trackScholarship(row, opts) {
    const res = await trackItem('scholarships', row, { ...opts, existing: scholarships });
    if (res.status === 'created') {
      setScholarships(prev => [...prev, res.row]);
      showMedabrainToast('scholarship_added', { name: res.row.name });
    } else {
      refreshPending();
    }
    return res;
  }

  async function updateRow(id, patch) {
    const prevRow = scholarships.find(s => s.id === id);
    setScholarships(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    try {
      await updateItem('scholarships', id, patch);
      if (patch.status === 'awarded' && prevRow && prevRow.status !== 'awarded') {
        showMedabrainToast('scholarship_awarded', { name: prevRow.name });
      }
    } catch (err) { toast.error(err.message); }
  }

  async function removeRow(id) {
    if (!window.confirm('Remove this scholarship?')) return;
    const row = scholarships.find(s => s.id === id);
    setScholarships(prev => prev.filter(s => s.id !== id));
    // A queued track for the same scholarship would otherwise flush later and resurrect the row
    // the student just deleted.
    if (row) await cancelQueuedTrack('scholarships', rowDedupeKey('scholarships', row));
    try { await deleteItem('scholarships', id); } catch (err) { toast.error(err.message); }
  }

  const totalAwarded = scholarships.filter(s => s.status === 'awarded').reduce((sum, s) => sum + (s.amount || 0), 0);
  const submittedCount = scholarships.filter(s => ['submitted','awarded','denied'].includes(s.status)).length;
  const awardedCount = scholarships.filter(s => s.status === 'awarded').length;

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-aid" icon={Handshake} color={accent} color2={C.teal}
        eyebrow="Applications" title="Financial Aid & Scholarships"
        sub="Track FAFSA, CSS Profile, and every scholarship you apply for — so when decisions come in, comparing real costs is easy."
        stats={scholarships.length > 0 ? [{ value: scholarships.length, label: 'tracked' }] : []}/>

      <TrackQueueNotice entries={pendingEntries.filter(e => e.resource === 'scholarships' || e.resource === 'deadlines')} status={trackStatus} onRetried={load}/>

      {/* Every curated scholarship arrives without a usable deadline date — the database records
          deadlines as prose seasons ("opens late summer, due mid-fall") because the real dates
          move every year, and inventing one would put a fake countdown in front of the student
          (see src/lib/trackingCatalog.js). That honesty has a cost: with `deadline` null, the
          scholarship silently never reaches the Deadlines tab or its auto-suggestions. This
          closes that loop by naming the gap and putting the date field right here. */}
      {missingDeadlines.length > 0 && (
        <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(C.amber,0.07)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.amber,0.24)}`}}>
          <SectionTitle icon={CalendarX} color={C.amberL}>
            {missingDeadlines.length} tracked scholarship{missingDeadlines.length === 1 ? '' : 's'} without a deadline
          </SectionTitle>
          <p style={{fontSize:12,color:C.t2,lineHeight:1.6,marginBottom:12}}>
            These are tracked, but they can't count down or show up on your Deadlines tab until they have a real date. Look the current deadline up on the program's official site and add it here — we deliberately don't guess it for you.
          </p>
          <div style={CC({gap:8})}>
            {missingDeadlines.map(s => (
              <div key={s.id} style={{...glass2({padding:'10px 12px'}),display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span style={{flex:1,minWidth:140,fontSize:12.5,fontWeight:600,color:C.t1}}>{s.name}</span>
                <input type="date" style={inp({width:'auto',fontSize:12,padding:'6px 10px'})}
                  onChange={e => { if (e.target.value) updateRow(s.id, { deadline: e.target.value }); }}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {scholarships.length > 0 && (
        <div style={G(3,12,{},true)}>
          <StatTile icon={Send} value={submittedCount} label="Applications submitted" color={C.amber}/>
          <StatTile icon={Trophy} value={awardedCount} label="Awarded" color={C.gold}/>
          <StatTile icon={DollarSign} value={`$${totalAwarded.toLocaleString()}`} label="Total money won" color={C.green}/>
        </div>
      )}

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(C.teal,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.teal,0.2)}`}}>
        <SectionTitle icon={Landmark} color={C.tealL}>FAFSA & CSS Profile</SectionTitle>
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

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(C.violet,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.2)}`}}>
        <SectionTitle icon={SearchIcon} color={C.violetL}>Scholarship Database</SectionTitle>
        <ScholarshipDatabase accent={C.violet} onTrack={trackScholarship} trackedKeys={trackedScholarshipKeys} pendingKeys={pendingScholarshipKeys} askMedabrain={askMedabrain}/>
      </div>

      <ScholarshipResearchAdd accent={accent} onTrack={addResearchedScholarship}/>

      {!loading && scholarships.length === 0 ? (
        <div style={glass({padding:30,textAlign:'center'})}>
          <div style={{fontSize:14,color:C.t2}}>No scholarships tracked yet.</div>
        </div>
      ) : (
        <div style={CC({gap:8})}>
          {scholarships.map(s => {
            const st = STATUSES.find(x => x.id === s.status) || STATUSES[0];
            const details = parseScholarshipNotes(s.notes);
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} style={{...glass2({padding:0,overflow:'hidden'}),borderLeft:`3px solid ${st.color}`,background:`linear-gradient(120deg,${tint(st.color,0.05)},rgba(255,255,255,0.02) 55%)`}}>
                <div style={{display:'flex',alignItems:'center',gap:14,padding:14,cursor:details?'pointer':'default'}} onClick={()=>details&&setExpandedId(isOpen?null:s.id)}>
                  <div style={{width:34,height:34,borderRadius:10,background:tint(st.color,0.13),border:`1px solid ${tint(st.color,0.25)}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {s.status==='awarded'?<Trophy size={15} color={st.color}/>:<DollarSign size={15} color={st.color}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{s.name}</div>
                    <div style={R({gap:8,marginTop:3,flexWrap:'wrap'})}>
                      {s.amount && <span style={{fontSize:11,color:s.status==='awarded'?C.greenL:C.t3,fontWeight:s.status==='awarded'?700:400,fontFamily:C.FM}}>${s.amount.toLocaleString()}</span>}
                      {s.deadline ? <span style={{fontSize:11,color:C.t3}}>Due {new Date(s.deadline+'T00:00:00').toLocaleDateString()}</span>
                        : details?.deadlineText && <span style={{fontSize:11,color:C.t4}}>{details.deadlineText}</span>}
                      {details?.org && <span style={{fontSize:11,color:C.t4}}>· {details.org}</span>}
                      <span style={pill(tint(st.color,0.13),st.color,{fontSize:9})}>{st.label}</span>
                    </div>
                  </div>
                  <select style={inp({width:'auto',fontSize:12,padding:'6px 10px'})} value={s.status} onClick={e=>e.stopPropagation()} onChange={e=>updateRow(s.id,{status:e.target.value})}>
                    {STATUSES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                  <button style={btnSm(C.roseDim,{color:C.rose})} onClick={e=>{e.stopPropagation();removeRow(s.id);}}><Trash2 size={12}/></button>
                  {details && (isOpen ? <ChevronUp size={15} color={C.t3}/> : <ChevronDown size={15} color={C.t3}/>)}
                </div>
                {isOpen && details && (
                  <div style={{padding:'0 14px 14px',borderTop:`1px solid ${C.b1}`,marginTop:2,paddingTop:12}}>
                    <div style={CC({gap:8})}>
                      {details.org && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><Building2 size={12} color={C.t3}/><span><b style={{color:C.t1}}>Organization:</b> {details.org}</span></div>}
                      {details.eligibility && <div style={{...R({gap:8,alignItems:'flex-start'}),fontSize:12,color:C.t2}}><Users size={12} color={C.t3} style={{marginTop:2}}/><span><b style={{color:C.t1}}>Eligibility:</b> {details.eligibility}</span></div>}
                      {(details.amountText || details.deadlineText) && (
                        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                          {details.amountText && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><DollarSign size={12} color={C.t3}/><span><b style={{color:C.t1}}>Typical amount:</b> {details.amountText}</span></div>}
                          {details.deadlineText && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><CalendarPlus size={12} color={C.t3}/><span><b style={{color:C.t1}}>Typical deadline:</b> {details.deadlineText}</span></div>}
                        </div>
                      )}
                      {details.description && <div style={{...R({gap:8,alignItems:'flex-start'}),fontSize:12,color:C.t2,lineHeight:1.6}}><FileText size={12} color={C.t3} style={{marginTop:2,flexShrink:0}}/><span>{details.description}</span></div>}
                      {details.sourceLabel && <div style={{fontSize:10,color:C.t4,marginTop:2}}>{details.sourceLabel==='ai'?'Researched by Medabrain — confirm details on the official site before applying.':'From the MedSchoolPrep scholarship database — confirm details on the official site before applying.'}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
