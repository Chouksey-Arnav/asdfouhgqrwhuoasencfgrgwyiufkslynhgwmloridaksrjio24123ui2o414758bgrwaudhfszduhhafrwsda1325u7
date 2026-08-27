import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import { Trash2, DollarSign, CalendarPlus, Handshake, Landmark, Trophy, Send, Search as SearchIcon, CalendarX, ChevronDown, ChevronUp, Building2, Users, FileText, Scale, Calculator, Shield, Stethoscope, Route } from 'lucide-react';
import { C, glass, glass2, btnSm, inp, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, updateItem, deleteItem } from '../lib/dataApi';
import { trackItem, cancelQueuedTrack } from '../lib/trackQueue';
import { usePendingTrackKeys, useTrackQueueDrain } from '../lib/useTrackQueue';
import { trackedKeySet, rowDedupeKey, needsDeadlineDate, normalizeKey, scholarshipRowFromResearch, formatScholarshipNotes } from '../lib/trackingCatalog';
import { parseScholarshipNotes } from '../lib/scholarshipNotes';
import TrackQueueNotice from './ui/TrackQueueNotice';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import Disclosure from './ui/Disclosure';
import ScholarshipDatabase from './ScholarshipDatabase';
import ScholarshipResearchAdd from './ScholarshipResearchAdd';
import DebtTrajectoryTable from './finance/DebtTrajectoryTable';
import PathwayCostCalculator from './finance/PathwayCostCalculator';
import ServiceCommitmentPrograms from './finance/ServiceCommitmentPrograms';
import HealthCareerScholarships from './finance/HealthCareerScholarships';
// Lazily loaded, unlike its three siblings above. The pipeline carries the
// medicine-specific database (src/data/medicalScholarships.js), which is the
// largest single content file this panel touches, and scripts/verifyPayload.mjs
// is right that it has no business in the first-load bundle: it is four screens
// deep inside Portfolio, and a student on a mid-range Android should not pay for
// it to reach a lesson. The dynamic import moves it out of the entry graph into
// its own chunk, fetched when this panel actually renders.
const MedicalScholarshipPipeline = lazy(() => import('./finance/MedicalScholarshipPipeline'));
import { FINANCE_BY_PATHWAY } from '../data/pathwayFinance';
import { showMedabrainToast } from '../lib/medabrainComments';

const STATUSES = [
  { id: 'researching', label: 'Researching', color: C.t3 },
  { id: 'applying', label: 'Applying', color: C.blueL },
  { id: 'submitted', label: 'Submitted', color: C.amberL },
  { id: 'awarded', label: 'Awarded', color: C.greenL },
  { id: 'denied', label: 'Denied', color: C.roseL },
];

// ─────────────────────────────────────────────────────────────────────────────
// ── Why this panel is no longer about FAFSA ─────────────────────────────────
// It used to open with FAFSA and the CSS Profile. Both are real and both stayed
// — at the bottom, behind a disclosure — but neither is written for the person
// looking at this screen. FAFSA is a form a PARENT fills in with a tax return.
// A seventeen-year-old cannot act on any of it.
//
// What they can act on, and what nobody has ever put in front of them, is the
// shape of the decision they are currently making: nursing versus medicine is a
// financial decision as much as a clinical one, and they have never once seen
// it framed that way. So the panel now opens with the debt trajectory across
// five pathways, then their own numbers, then the service-commitment routes
// that get decided before or during undergrad — several of which change which
// colleges they should be applying to at all, and almost none of which they
// have heard of.
//
// Order is the argument here:
//   1. What each path costs and how long it takes      (the framing they lack)
//   2. What it would cost YOU                          (their own numbers)
//   3. Routes that pay for it in exchange for service  (deadline-critical)
//   4. Health-career scholarships, senior-filtered     (what they can win now)
//   5. The medicine pipeline, high school to residency (where the money is)
//   6. The general scholarship database + tracker      (unchanged)
//   7. FAFSA and CSS Profile                           (demoted, not removed)
//
// 4 before 5 is deliberate and was the one ordering decision worth arguing
// about. 5 is where the large numbers are — medical school scholarships,
// funded MD-PhDs, tuition-free schools — and putting it first would open this
// screen on a wall of money a sixteen-year-old cannot apply for, which is the
// exact "there is nothing for me" feeling the panel exists to prevent. What
// they can act on this month comes first; the road comes after.
// ─────────────────────────────────────────────────────────────────────────────
// This page holds THREE scholarship databases with three different jobs (see the
// section comments below), so the app-wide search addresses them separately:
// `focusScholarship`, `focusHealthScholarship` and `focusMedScholarship` are each
// non-null only when a ⌘K result opened the one they belong to. See the header of
// src/lib/contentSearch.js.
export default function FinancialAidPanel({
  accent = C.blue, askMedabrain, pathwayKey = null,
  focusScholarship = null, focusHealthScholarship = null, focusMedScholarship = null,
}) {
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

  // The student's own pathway, mapped onto the finance catalog, so the
  // comparison highlights their row and the calculator opens on it. Null for
  // 'exploring' and the pathways with no finance profile — the comparison then
  // simply highlights nothing, which is the honest state for a student who has
  // not picked.
  const financeProfile = pathwayKey ? FINANCE_BY_PATHWAY[pathwayKey] : null;

  return (
    <div style={CC({gap:20})}>
      <PanelHero tourTag="portfolio-deep-aid" icon={Handshake} color={accent} color2={C.teal}
        eyebrow="Paying for it" title="Financial aid"
        sub="What each health pathway costs, who pays for it in exchange for service, and every scholarship you're tracking."
        stats={scholarships.length > 0 ? [{ value: scholarships.length, label: 'tracked' }] : []}/>

      <TrackQueueNotice entries={pendingEntries.filter(e => e.resource === 'scholarships' || e.resource === 'deadlines')} status={trackStatus} onRetried={load}/>

      {/* ── 1. The framing nobody gives them ───────────────────────────────── */}
      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.blue,0.07)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.blue,0.22)}`}}>
        <SectionTitle icon={Scale} color={C.blueL}>Debt Trajectory by Pathway</SectionTitle>
        <DebtTrajectoryTable audience="student" highlightPathwayKey={pathwayKey}
          defaultExpandedId={financeProfile?.id || null}/>
      </div>

      {/* ── 2. Their own numbers ───────────────────────────────────────────── */}
      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.green,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.green,0.2)}`}}>
        <SectionTitle icon={Calculator} color={C.greenL}>What It Would Cost You, Start to Finish</SectionTitle>
        <PathwayCostCalculator accent={C.green} defaultPathwayId={financeProfile?.id || 'md'}/>
      </div>

      {/* ── 3. The routes with a deadline in high school ───────────────────── */}
      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.teal,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.teal,0.2)}`}}>
        <SectionTitle icon={Shield} color={C.tealL}>Service Commitments & Loan Forgiveness</SectionTitle>
        <ServiceCommitmentPrograms accent={C.teal} pathwayFinanceId={financeProfile?.id || null}/>
      </div>

      {/* ── 4. What they can actually win now ──────────────────────────────── */}
      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.fuchsia,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.fuchsia,0.2)}`}}>
        <SectionTitle icon={Stethoscope} color={C.fuchsia}>Health-Career Scholarships</SectionTitle>
        <HealthCareerScholarships accent={C.fuchsia} pathwayFinanceId={financeProfile?.id || null} focus={focusHealthScholarship}/>
      </div>

      {/* ── 5. The rest of the road ────────────────────────────────────────
          Section 4 above answers "what can I win now?", which is the right
          question and has a short answer. This one answers the question that
          has the money in it: where does the $300,000 for an MD actually come
          from, and what does a fifteen-year-old do about it today. Placed
          after the senior-eligible list on purpose — a student should meet what
          they can act on this month before they meet what they can act on in
          2032. See src/data/medicalScholarships.js. */}
      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.violet,0.06)},${tint(C.t1,0.02)} 55%)`,border:`1px solid ${tint(C.violet,0.2)}`}}>
        <SectionTitle icon={Route} color={C.violetL}>Paying for Medical School — The Whole Road</SectionTitle>
        <Suspense fallback={<div style={{fontSize:12,color:C.t3,padding:'12px 0'}}>Loading the pipeline…</div>}>
          <MedicalScholarshipPipeline accent={C.violet} pathwayFinanceId={financeProfile?.id || null}
            onTrack={trackScholarship} trackedKeys={trackedScholarshipKeys} pendingKeys={pendingScholarshipKeys}
            focus={focusMedScholarship}/>
        </Suspense>
      </div>

      {/* Every curated scholarship arrives without a usable deadline date — the database records
          deadlines as prose seasons ("opens late summer, due mid-fall") because the real dates
          move every year, and inventing one would put a fake countdown in front of the student
          (see src/lib/trackingCatalog.js). That honesty has a cost: with `deadline` null, the
          scholarship silently never reaches the Deadlines tab or its auto-suggestions. This
          closes that loop by naming the gap and putting the date field right here. */}
      {missingDeadlines.length > 0 && (
        <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.amber,0.07)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.amber,0.24)}`}}>
          <SectionTitle icon={CalendarX} color={C.amberL}>
            {missingDeadlines.length} tracked scholarship{missingDeadlines.length === 1 ? '' : 's'} without a deadline
          </SectionTitle>
          <p style={{fontSize:12,color:C.t2,lineHeight: 1.55,marginBottom:12}}>
            These are tracked, but they can't count down or show up on your Deadlines tab until they have a real date. Look the current deadline up on the program's official site and add it here — we deliberately don't guess it for you.
          </p>
          <div style={CC({gap:8})}>
            {missingDeadlines.map(s => (
              <div key={s.id} style={{...glass2({padding:'8px 12px'}),display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{flex:1,minWidth:140,fontSize:12.5,fontWeight:600,color:C.t1}}>{s.name}</span>
                <input type="date" style={inp({width:'auto',fontSize:12,padding:'4px 8px'})}
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

      <div style={{...glass({padding:16}),background:`linear-gradient(120deg,${tint(C.violet,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.2)}`}}>
        <SectionTitle icon={SearchIcon} color={C.violetL}>Scholarship Database</SectionTitle>
        <ScholarshipDatabase accent={C.violet} onTrack={trackScholarship} trackedKeys={trackedScholarshipKeys} pendingKeys={pendingScholarshipKeys} askMedabrain={askMedabrain} focus={focusScholarship}/>
      </div>

      <ScholarshipResearchAdd accent={accent} onTrack={addResearchedScholarship}/>

      {!loading && scholarships.length === 0 ? (
        <div style={glass({padding:28,textAlign:'center'})}>
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
                <div style={{display:'flex',alignItems:'center',gap:12,padding:12,cursor:details?'pointer':'default'}} onClick={()=>details&&setExpandedId(isOpen?null:s.id)}>
                  <div style={{width:34,height:34,borderRadius:8,background:tint(st.color,0.13),border:`1px solid ${tint(st.color,0.25)}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {s.status==='awarded'?<Trophy size={15} color={st.color}/>:<DollarSign size={15} color={st.color}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{s.name}</div>
                    <div style={R({gap:8,marginTop:4,flexWrap:'wrap'})}>
                      {s.amount && <span style={{fontSize:11,color:s.status==='awarded'?C.greenL:C.t3,fontWeight:s.status==='awarded'?700:400,fontFamily:C.FM}}>${s.amount.toLocaleString()}</span>}
                      {s.deadline ? <span style={{fontSize:11,color:C.t3}}>Due {new Date(s.deadline+'T00:00:00').toLocaleDateString()}</span>
                        : details?.deadlineText && <span style={{fontSize:11,color:C.t4}}>{details.deadlineText}</span>}
                      {details?.org && <span style={{fontSize:11,color:C.t4}}>· {details.org}</span>}
                      <span style={pill(tint(st.color,0.13),st.color,{fontSize:9})}>{st.label}</span>
                    </div>
                  </div>
                  <select style={inp({width:'auto',fontSize:12,padding:'4px 8px'})} value={s.status} onClick={e=>e.stopPropagation()} onChange={e=>updateRow(s.id,{status:e.target.value})}>
                    {STATUSES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                  <button style={btnSm(C.roseDim,{color:C.rose})} onClick={e=>{e.stopPropagation();removeRow(s.id);}}><Trash2 size={12}/></button>
                  {details && (isOpen ? <ChevronUp size={15} color={C.t3}/> : <ChevronDown size={15} color={C.t3}/>)}
                </div>
                {isOpen && details && (
                  <div style={{padding:'0px 12px 12px',borderTop:`1px solid ${C.b1}`,marginTop:4,paddingTop:12}}>
                    <div style={CC({gap:8})}>
                      {details.org && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><Building2 size={12} color={C.t3}/><span><b style={{color:C.t1}}>Organization:</b> {details.org}</span></div>}
                      {details.eligibility && <div style={{...R({gap:8,alignItems:'flex-start'}),fontSize:12,color:C.t2}}><Users size={12} color={C.t3} style={{marginTop:4}}/><span><b style={{color:C.t1}}>Eligibility:</b> {details.eligibility}</span></div>}
                      {(details.amountText || details.deadlineText) && (
                        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                          {details.amountText && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><DollarSign size={12} color={C.t3}/><span><b style={{color:C.t1}}>Typical amount:</b> {details.amountText}</span></div>}
                          {details.deadlineText && <div style={{...R({gap:8}),fontSize:12,color:C.t2}}><CalendarPlus size={12} color={C.t3}/><span><b style={{color:C.t1}}>Typical deadline:</b> {details.deadlineText}</span></div>}
                        </div>
                      )}
                      {details.description && <div style={{...R({gap:8,alignItems:'flex-start'}),fontSize:12,color:C.t2,lineHeight:1.6}}><FileText size={12} color={C.t3} style={{marginTop:4,flexShrink:0}}/><span>{details.description}</span></div>}
                      {details.sourceLabel && <div style={{fontSize:10,color:C.t4,marginTop:4}}>{details.sourceLabel==='ai'?'Researched by Medabrain — confirm details on the official site before applying.':'From the MedSchoolPrep scholarship database — confirm details on the official site before applying.'}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 6. FAFSA and CSS Profile — kept, demoted ────────────────────────
          Still the paperwork that decides how much of any of the above you
          actually pay, and still worth a countdown on the Deadlines tab. But it
          is a form filled in with a parent's tax return, and it is the wrong
          thing to open this screen with for a sixteen-year-old deciding between
          nursing and medicine. Closed by default; the student opens it in the
          autumn of senior year, which is the only month it matters. */}
      <Disclosure id="aid-fafsa" icon={Landmark} color={C.tealL} title="FAFSA & CSS Profile — the forms"
        sub="The paperwork that decides how much of the above you actually pay. Mostly filled in with a parent, and only urgent in the autumn of senior year.">
        <div style={CC({gap:12})}>
          <p style={{fontSize:12,color:C.t2,lineHeight: 1.55,margin:0}}>
            FAFSA typically opens October 1 of your senior year — add it to your Deadlines tab so it
            counts down alongside your application deadlines. It is what qualifies you for federal
            loans, work-study and most institutional need-based aid, so skipping it because "we won't
            qualify" is the most common expensive mistake in this whole area: several federal loan
            programs and many college scholarships require it regardless of income.
          </p>
          <p style={{fontSize:12,color:C.t2,lineHeight: 1.55,margin:0}}>
            The CSS Profile is a separate, more detailed form used mainly by private colleges to
            award their own money. Mark which of your schools require it, and their financial aid
            deadlines, on the College List tab — they show up here.
          </p>
          {aidSchools.length > 0 ? (
            <div style={CC({gap:8})}>
              {aidSchools.map(c => (
                <div key={c.id} style={{...glass2({padding:'8px 12px'}),display:'flex',alignItems:'center',gap:8}}>
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
          ) : (
            <div style={{fontSize:11.5,color:C.t3}}>
              No schools on your College List are marked as needing the CSS Profile or carrying a
              financial aid deadline yet. Add them there and they'll appear here.
            </div>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
