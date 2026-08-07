import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, School, Check, GraduationCap, Send, Sparkles, Loader2, Flag, Target, Lightbulb, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';
import { SCHOOL_DATA, US_ONLY_NOTE } from '../data/constants';
import { resolveStudentScores, recommendColleges, collegeListInsights, categorizeSchool, actToSat } from '../lib/collegeRecommend';
import { trackItem, cancelQueuedTrack } from '../lib/trackQueue';
import { usePendingTrackKeys, useTrackQueueDrain } from '../lib/useTrackQueue';
import { normalizeKey, rowDedupeKey } from '../lib/trackingCatalog';
import TrackQueueNotice from './ui/TrackQueueNotice';
import CollegeAutocomplete from './CollegeAutocomplete';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import { showMedabrainToast } from '../lib/medabrainComments';
import { getCached, setCached, dailyKey } from '../lib/aiCache';
import { renderMarkdown } from '../lib/renderMarkdown';

const CATEGORIES = [
  { id: 'reach', label: 'Reach', color: C.rose },
  { id: 'target', label: 'Target', color: C.blue },
  { id: 'safety', label: 'Safety', color: C.green },
];
const STATUSES = [
  { id: 'researching', label: 'Researching' },
  { id: 'application_started', label: 'Application Started' },
  { id: 'essays_in_progress', label: 'Essays In Progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'decision_received', label: 'Decision Received' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'declined', label: 'Declined' },
];
const DEFAULT_CHECKLIST = [
  'Application fee / waiver',
  'Transcripts sent',
  'Letters of recommendation',
  'Test scores sent',
  'Supplemental essays',
  'Interview (if applicable)',
];

// Seeds the default application checklist for any college that has none. Fire-and-forget: a
// failure here just means the next load tries again, which is strictly better than the school
// permanently having no checklist. See the call site in load() for when this happens.
async function ensureChecklists(colleges, grouped, setChecklists) {
  const missing = (colleges || []).filter(c => !(grouped[c.id] || []).length);
  for (const college of missing) {
    try {
      const items = await Promise.all(DEFAULT_CHECKLIST.map((label, i) =>
        createItem('college_checklist_items', { college_id: college.id, label, sort_order: i })
      ));
      setChecklists(prev => ({ ...prev, [college.id]: items }));
    } catch { /* retried on the next load */ }
  }
}

export default function CollegeListPanel({ accent = C.blue, user = null, studentSAT = null, askMedabrain = null, onAdded = null }) {
  const { entries: pendingEntries, status: trackStatus } = usePendingTrackKeys();
  const [colleges, setColleges] = useState([]);
  const [checklists, setChecklists] = useState({}); // collegeId -> items[]
  const [testScores, setTestScores] = useState([]); // the student's real logged SAT/ACT sittings
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('target');
  const [categoryTouched, setCategoryTouched] = useState(false); // true once the student picks a category manually, so an autocomplete pick afterward doesn't overwrite their choice
  const [brainTake, setBrainTake] = useState(null); // { loading, content, error }
  const [recBrain, setRecBrain] = useState(null); // Meta Brain's read on the recommendations, { loading, content, error }
  const [dismissedRecs, setDismissedRecs] = useState([]); // names the student passed on this session
  const [addingRec, setAddingRec] = useState(null); // name of the recommendation mid-add

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, items] = await Promise.all([listItems('colleges'), listItems('college_checklist_items')]);
      setColleges(cols);
      // Scores drive the recommendations below. A failure here must not take the college list down
      // with it — the tracker still works fine with no scores, it just can't recommend.
      listItems('test_scores').then(setTestScores).catch(() => setTestScores([]));
      const grouped = {};
      items.forEach(i => { (grouped[i.college_id] ||= []).push(i); });
      setChecklists(grouped);
      // A college whose row exists but whose checklist doesn't is a half-finished add — either
      // the checklist request failed after the college itself succeeded, or the college arrived
      // via a queued Track that flushed in the background (where there was no college_id yet to
      // attach a checklist to). Either way the student ends up looking at a school with no
      // application checklist and no way to get one back; seeding here makes that self-repairing.
      ensureChecklists(cols, grouped, setChecklists);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A school added while offline lands here once the outbox flushes — reload so it appears
  // (and so ensureChecklists() gives it the checklist it couldn't have been given while queued).
  useTrackQueueDrain(load);

  // Shared by the manual "Add a school" form and by the one-tap Add on each recommendation, so a
  // recommended school lands in exactly the same state (queueing, dedupe, default checklist,
  // Medabrain toast) as one typed in by hand. Returns true once the school is on the list.
  async function addSchool(rawName, category) {
    const name = String(rawName || '').trim();
    if (!name) return false;
    // The college row and its checklist are created in two separate steps below on purpose: if
    // the college create fails, nothing happened and it's safe to just show the error. But if
    // the college succeeds and only the checklist fails, the college already exists server-side
    // — reflecting that in the UI immediately (instead of only after the checklist too) stops a
    // retry from creating a second, duplicate row for the same school.
    //
    // The college row itself goes through the Track outbox (src/lib/trackQueue.js): adding a
    // school on a dropped connection now queues it (and flushes automatically later) instead of
    // showing an error and forgetting the student ever asked. The checklist deliberately does NOT
    // — its rows are keyed to a college_id that doesn't exist yet when the college is queued, so
    // there's nothing valid to enqueue; it's seeded on the next load instead (see ensureChecklists).
    const res = await trackItem('colleges', { name, category, status: 'researching' },
      { dedupeKey: normalizeKey(name), label: name, existing: colleges });

    if (res.status === 'duplicate') {
      toast(`${res.row.name} is already on your college list`, { icon: '✓' });
      return true;
    }
    if (res.status === 'queued') {
      toast(res.reason === 'auth'
        ? `${name} is saved on this device — sign in to finish adding it to your list.`
        : `${name} is saved on this device and will be added to your list once you're back online.`,
      { icon: '📥', duration: 6000 });
      return true;
    }

    const college = res.row;
    setColleges(prev => [...prev, college]);
    showMedabrainToast('college_added', { name: college.name });
    onAdded?.();
    try {
      const items = await Promise.all(DEFAULT_CHECKLIST.map((label, i) =>
        createItem('college_checklist_items', { college_id: college.id, label, sort_order: i })
      ));
      setChecklists(prev => ({ ...prev, [college.id]: items }));
    } catch (err) {
      toast.error(`Added ${college.name}, but its default checklist failed to load: ${err.message}`);
    }
    return true;
  }

  async function addCollege() {
    if (!newName.trim()) return;
    const added = await addSchool(newName, newCategory);
    if (added) { setNewName(''); setCategoryTouched(false); }
  }

  // One-tap add from a recommendation card. The category comes from the recommender's own
  // reach/target/safety verdict, which is derived from the student's real SAT/ACT — so the school
  // lands correctly filed without them having to re-decide what they just read.
  async function addRecommendation(rec) {
    setAddingRec(rec.name);
    try {
      await addSchool(rec.name, rec.category);
      setDismissedRecs(prev => prev.includes(rec.name) ? prev : [...prev, rec.name]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingRec(null);
    }
  }

  async function updateCollege(id, patch) {
    setColleges(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try { await updateItem('colleges', id, patch); } catch (err) { toast.error(err.message); }
  }

  async function removeCollege(id) {
    if (!window.confirm('Remove this school from your list? This also deletes its checklist.')) return;
    const row = colleges.find(c => c.id === id);
    setColleges(prev => prev.filter(c => c.id !== id));
    // Without this, a still-queued track for the same school would flush later and put it back.
    if (row) await cancelQueuedTrack('colleges', rowDedupeKey('colleges', row));
    try { await deleteItem('colleges', id); } catch (err) { toast.error(err.message); }
  }

  async function toggleChecklistItem(collegeId, item) {
    const done = !item.done;
    setChecklists(prev => ({ ...prev, [collegeId]: prev[collegeId].map(i => i.id === item.id ? { ...i, done } : i) }));
    try { await updateItem('college_checklist_items', item.id, { done }); } catch (err) { toast.error(err.message); }
  }

  const submitted = colleges.filter(c => ['submitted', 'decision_received', 'enrolled'].includes(c.status)).length;
  const inProgress = colleges.filter(c => ['application_started', 'essays_in_progress'].includes(c.status)).length;
  const notStarted = colleges.filter(c => c.status === 'researching').length;

  const catCount = (id) => colleges.filter(c => c.category === id).length;

  // ── Score-driven recommendations ────────────────────────────────────────────
  // Everything below runs off the scores the student has actually given MedSchoolPrep: their
  // logged SAT/ACT sittings from the Score Tracker first, their onboarding self-report as a
  // fallback. No score on file means no recommendations — we say so rather than guessing.
  const scores = useMemo(() => resolveStudentScores(testScores, user), [testScores, user]);
  const recommendations = useMemo(
    () => recommendColleges({ scores, existing: colleges }).filter(r => !dismissedRecs.includes(r.name)),
    [scores, colleges, dismissedRecs]
  );
  const insights = useMemo(() => collegeListInsights({ scores, existing: colleges }), [scores, colleges]);

  // The SAT the add-form's Reach/Target/Safety hint compares against. Prefer the resolved score
  // (real logged sittings, ACT included via concordance) over the raw onboarding prop.
  const hintSat = scores.effectiveSat ?? studentSAT ?? null;

  // ── Meta Brain's take — an ambient, unasked-for read on list balance and which schools it
  // recommends leaning on, grounded in the real list embedded directly in the question (same
  // pattern as DeadlinesPanel's priority summary) and cached per-day/per-list-shape so it only
  // re-calls Groq when the day rolls over or the list itself actually changes. Deliberately an
  // inline card, not a toast — this should read as a standing observation, not a notification.
  //
  // The question now carries the student's REAL SAT/ACT alongside the list, plus the SAT/ACT
  // midpoint of every school on it, so Meta Brain reasons from the same numbers the panel shows
  // instead of from its own guess at how selective a school "sounds".
  const brainCacheKey = useMemo(
    () => dailyKey('collegeListTake', `${scores.effectiveSat ?? 'nosat'}|${colleges.map(c => `${c.name}:${c.category}:${c.status}`).join('|')}`),
    [colleges, scores.effectiveSat]
  );
  const brainFetchedKeyRef = useRef(null);
  useEffect(() => {
    if (!askMedabrain || colleges.length === 0) { setBrainTake(null); return; }
    const cached = getCached(brainCacheKey);
    if (cached) { setBrainTake({ loading: false, content: cached, error: null }); brainFetchedKeyRef.current = brainCacheKey; return; }
    if (brainFetchedKeyRef.current === brainCacheKey) return;
    brainFetchedKeyRef.current = brainCacheKey;
    let cancelled = false;
    setBrainTake({ loading: true, content: null, error: null });
    const list = colleges.map(c => {
      const s = SCHOOL_DATA.find(x => x.name.toLowerCase() === String(c.name || '').trim().toLowerCase());
      const stats = s ? `, admitted-student SAT mid ${s.sat} / ACT mid ${s.act}, ${s.accept}% admit rate` : '';
      return `${c.name} (${c.category || 'uncategorized'}, status: ${c.status || 'researching'}${stats})`;
    }).join('; ');
    const scoreLine = scores.hasScore
      ? `The student's own scores: ${scores.sat != null ? `SAT ${scores.sat}` : 'no SAT logged'}${scores.act != null ? `, ACT ${scores.act}` : ''} (use SAT ${scores.effectiveSat} as their effective level).`
      : 'The student has not logged an SAT or ACT yet.';
    askMedabrain(`Here is this student's real college list: ${list}. ${scoreLine} These are all U.S. schools; the platform only covers U.S. institutions. In 2-3 concise sentences: comment on whether the reach/target/safety balance looks healthy given their score, flag any school whose category is wrong compared to the SAT/ACT midpoints given above, and name which 1-2 schools on THIS list they should prioritize finishing an application for next. Only reference schools from this exact list — never invent or suggest a school that isn't on it. Never cite a score other than the ones given above.`)
      .then(content => { if (!cancelled) { setCached(brainCacheKey, content); setBrainTake({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) { brainFetchedKeyRef.current = null; setBrainTake({ loading: false, content: null, error: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, it's a fresh closure every render (see DeadlinesPanel.jsx for the same pattern)
  }, [brainCacheKey]);

  // ── Meta Brain on the recommendations — a second, separate read that explains WHY this slate
  // fits the student's scores and which one to apply to first. Kept apart from the list take
  // above so each card answers one question, and cached on the same day/shape key pattern so a
  // student re-opening the panel doesn't burn a fresh Groq call. Deliberately grounded: the
  // prompt hands over the exact recommended schools with their SAT/ACT midpoints and forbids
  // naming anything outside that set, so it can't hallucinate a school the panel isn't showing.
  const recBrainCacheKey = useMemo(
    () => dailyKey('collegeRecTake', `${scores.effectiveSat ?? 'nosat'}|${recommendations.map(r => `${r.name}:${r.category}`).join('|')}`),
    [recommendations, scores.effectiveSat]
  );
  const recBrainFetchedKeyRef = useRef(null);
  useEffect(() => {
    if (!askMedabrain || !scores.hasScore || recommendations.length === 0) { setRecBrain(null); return; }
    const cached = getCached(recBrainCacheKey);
    if (cached) { setRecBrain({ loading: false, content: cached, error: null }); recBrainFetchedKeyRef.current = recBrainCacheKey; return; }
    if (recBrainFetchedKeyRef.current === recBrainCacheKey) return;
    recBrainFetchedKeyRef.current = recBrainCacheKey;
    let cancelled = false;
    setRecBrain({ loading: true, content: null, error: null });
    const recList = recommendations.map(r => `${r.name} (${r.category}, SAT mid ${r.school.sat} / ACT mid ${r.school.act}, ${r.school.accept}% admit, ${r.school.state}${r.school.bsmd ? ', has BS/MD' : ''}, pre-health rank ${r.school.preHealthRank}/5)`).join('; ');
    const scoreLine = `${scores.sat != null ? `SAT ${scores.sat}` : 'no SAT logged'}${scores.act != null ? `, ACT ${scores.act}` : ''} (effective SAT level ${scores.effectiveSat})`;
    askMedabrain(`This student's own test scores are: ${scoreLine}. MedSchoolPrep matched them to these U.S. colleges: ${recList}. In 3-4 concise sentences aimed at a high school student heading toward a health career: explain what their score realistically opens up, pick the 1-2 schools from THIS slate you'd add first and why (reference the actual SAT/ACT midpoints), and give one concrete thing they could do to move up a tier — a score gain target, or a strength that offsets a score gap. Only name schools from the slate above. Never invent a school or a score.`)
      .then(content => { if (!cancelled) { setCached(recBrainCacheKey, content); setRecBrain({ loading: false, content, error: null }); } })
      .catch(err => { if (!cancelled) { recBrainFetchedKeyRef.current = null; setRecBrain({ loading: false, content: null, error: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain intentionally excluded, it's a fresh closure every render (same pattern as the list take above)
  }, [recBrainCacheKey]);

  return (
    <div style={CC({gap: 22})}>
      <PanelHero tourTag="portfolio-deep-colleges" icon={GraduationCap} color={accent} color2={C.blue}
        eyebrow="Applications" title="College List & Application Tracker"
        sub="Build a balanced list of reach, target, and safety schools — with per-school deadlines and a checklist so every application actually gets finished."
        stats={colleges.length > 0 ? [{ value: colleges.length, label: colleges.length === 1 ? 'school' : 'schools' }] : []}/>

      {/* Scope note — stated up front so nobody hunts for a school abroad and assumes the search
          is broken. Single source of truth lives in constants.js (US_ONLY_NOTE). */}
      <div style={{...R({gap:10,padding:'11px 14px',alignItems:'flex-start'}),borderRadius:12,background:tint(C.blue,0.06),border:`1px solid ${tint(C.blue,0.18)}`}}>
        <span style={{fontSize:15,lineHeight:1.2,flexShrink:0}} role="img" aria-label="United States">🇺🇸</span>
        <span style={{fontSize:11.5,color:C.t3,lineHeight:1.55}}>{US_ONLY_NOTE}</span>
      </div>

      <TrackQueueNotice entries={pendingEntries.filter(e => e.resource === 'colleges')} status={trackStatus} onRetried={load}/>

      {colleges.length > 0 && (
        <div style={G(4,12,{},true)}>
          <StatTile icon={School} value={catCount('reach')} label="Reach" color={C.rose}/>
          <StatTile icon={School} value={catCount('target')} label="Target" color={C.blue}/>
          <StatTile icon={School} value={catCount('safety')} label="Safety" color={C.green}/>
          <StatTile icon={Send} value={submitted} label="Submitted" sub={`${inProgress} in progress · ${notStarted} researching`} color={C.violet}/>
        </div>
      )}

      {brainTake && (
        <div style={{...glass2({padding:16}),background:`linear-gradient(120deg,${tint(C.violet,0.08)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.25)}`}}>
          <div style={R({gap:8,marginBottom:brainTake.loading?0:8})}>
            <Sparkles size={13} color={C.violetL}/>
            <span style={{fontSize:11,fontWeight:700,color:C.violetL,textTransform:'uppercase',letterSpacing:'.06em'}}>Meta Brain's take</span>
          </div>
          {brainTake.loading && <div style={R({gap:8,color:C.t3,fontSize:12})}><Loader2 size={13} className="spin"/>Weighing your list balance…</div>}
          {brainTake.error && <div style={{fontSize:12,color:C.t3}}>Couldn't reach Meta Brain right now — your list below is still accurate.</div>}
          {brainTake.content && !brainTake.loading && <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:renderMarkdown(brainTake.content)}}/>}
        </div>
      )}

      {/* ── Matched to your scores ──────────────────────────────────────────────
          U.S. schools picked from the same database the tracker uses, categorized against the
          SAT/ACT the student actually logged. Every card shows the school's real SAT and ACT
          midpoints next to the student's own, so the reach/target/safety call is auditable
          rather than a black box, and adds in one tap already correctly filed. */}
      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(C.violet,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.2)}`}}>
        <SectionTitle icon={Target} color={C.violetL}>Matched to your scores</SectionTitle>

        {!scores.hasScore ? (
          <div style={{fontSize:12.5,color:C.t3,lineHeight:1.6}}>
            No SAT or ACT on file yet. Log a real score in the Score Tracker (or finish onboarding) and
            MedSchoolPrep will match you against all {SCHOOL_DATA.length} U.S. schools it tracks and
            recommend a reach/target/safety slate here.
          </div>
        ) : (
          <>
            <div style={{...R({gap:8,flexWrap:'wrap',marginBottom:14})}}>
              {scores.sat != null && (
                <span style={pill(`${C.blue}18`, C.blue)}>Your SAT {scores.sat}{scores.satSource === 'onboarding' ? ' (onboarding)' : ''}</span>
              )}
              {scores.act != null && (
                <span style={pill(`${C.green}18`, C.green)}>Your ACT {scores.act}{scores.actSource === 'onboarding' ? ' (onboarding)' : ''}</span>
              )}
              {scores.act != null && scores.sat == null && (
                <span style={pill(`${C.violet}18`, C.violetL)}>≈ SAT {actToSat(scores.act)}</span>
              )}
              <span style={{fontSize:11,color:C.t4,alignSelf:'center'}}>
                Matching on SAT {scores.effectiveSat} · your stronger of the two
              </span>
            </div>

            {/* Insights — plain, computed statements about what the score means and what the
                list is missing. These are derived from the data, not from the model, so they
                stay correct even when Meta Brain is unreachable. */}
            {insights.length > 0 && (
              <div style={{...CC({gap:7}),marginBottom:16}}>
                {insights.map((ins, i) => {
                  const col = ins.tone === 'good' ? C.green : ins.tone === 'warn' ? C.amber : C.blue;
                  const Icon = ins.tone === 'good' ? CheckCircle2 : ins.tone === 'warn' ? AlertTriangle : Lightbulb;
                  return (
                    <div key={i} style={{...R({gap:9,alignItems:'flex-start',padding:'9px 12px'}),borderRadius:10,background:tint(col,0.06),border:`1px solid ${tint(col,0.16)}`}}>
                      <Icon size={13} color={col} style={{flexShrink:0,marginTop:2}}/>
                      <span style={{fontSize:12,color:C.t2,lineHeight:1.55}}>{ins.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {recBrain && (
              <div style={{...glass2({padding:14}),marginBottom:16,background:`linear-gradient(120deg,${tint(C.violet,0.08)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(C.violet,0.25)}`}}>
                <div style={R({gap:8,marginBottom:recBrain.loading?0:8})}>
                  <Sparkles size={13} color={C.violetL}/>
                  <span style={{fontSize:11,fontWeight:700,color:C.violetL,textTransform:'uppercase',letterSpacing:'.06em'}}>Meta Brain on your matches</span>
                </div>
                {recBrain.loading && <div style={R({gap:8,color:C.t3,fontSize:12})}><Loader2 size={13} className="spin"/>Reading your scores against these schools…</div>}
                {recBrain.error && <div style={{fontSize:12,color:C.t3}}>Couldn't reach Meta Brain right now — the matches below are still scored from your real SAT/ACT.</div>}
                {recBrain.content && !recBrain.loading && <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:renderMarkdown(recBrain.content)}}/>}
              </div>
            )}

            {recommendations.length === 0 ? (
              <div style={R({gap:8,fontSize:12.5,color:C.t3})}>
                <Info size={13}/>You've already added every school we'd match to your score right now.
                {dismissedRecs.length > 0 && (
                  <button style={btnSm(C.s4,{marginLeft:2})} onClick={()=>setDismissedRecs([])}><RefreshCw size={11}/>Show passed-on schools</button>
                )}
              </div>
            ) : (
              <div style={CC({gap:9})}>
                {recommendations.map(rec => {
                  const cat = CATEGORIES.find(c => c.id === rec.category) || CATEGORIES[1];
                  const busy = addingRec === rec.name;
                  return (
                    <div key={rec.name} style={{...glass2({padding:13}),borderLeft:`3px solid ${cat.color}`,background:`linear-gradient(120deg,${tint(cat.color,0.05)},rgba(255,255,255,0.02) 50%)`}}>
                      <div style={R({gap:10,flexWrap:'wrap',alignItems:'flex-start'})}>
                        <div style={{flex:1,minWidth:180}}>
                          <div style={R({gap:8,flexWrap:'wrap'})}>
                            <span style={{fontSize:13.5,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{rec.name}</span>
                            <span style={pill(`${cat.color}18`, cat.color)}>{cat.label}</span>
                            <span style={pill(`${C.violet}14`, C.violetL)}>{rec.fit}% fit</span>
                            {rec.school.bsmd && <span style={pill(`${C.green}14`, C.green)}>BS/MD</span>}
                          </div>
                          <div style={{fontSize:11,color:C.t3,marginTop:5,fontFamily:C.FM}}>
                            {rec.school.state} · {rec.school.type} · SAT {rec.school.sat} · ACT {rec.school.act} · {rec.school.accept}% admit
                          </div>
                          <div style={{fontSize:11.5,color:C.t3,marginTop:6,lineHeight:1.55}}>{rec.reason}</div>
                        </div>
                        <div style={R({gap:6,flexShrink:0})}>
                          <button style={btn(accent!==C.blue?accent:C.blueGrad,{fontSize:12,padding:'7px 12px'})} disabled={busy} onClick={()=>addRecommendation(rec)}>
                            {busy ? <Loader2 size={13} className="spin"/> : <Plus size={13}/>}Add
                          </button>
                          <button style={btnSm(C.s4)} title="Not interested" onClick={()=>setDismissedRecs(prev=>[...prev, rec.name])}>Pass</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Add a school</SectionTitle>
        <div style={R({gap:10,flexWrap:'wrap'})}>
          <CollegeAutocomplete
            value={newName}
            onChange={setNewName}
            onSelectSchool={(school)=>{
              // Suggest Reach/Target/Safety using the same rules as the recommender above, so a
              // school added by hand is filed the same way the same school would be if it had been
              // recommended. A helpful default, not a hard override — skipped once the student has
              // picked a category by hand this round.
              if(categoryTouched || !hintSat || school.sat==null) return;
              const cat=categorizeSchool(school, hintSat);
              if(cat) setNewCategory(cat);
            }}
            onKeyDown={e=>e.key==='Enter'&&addCollege()}
          />
          <select style={inp({width:'auto'})} value={newCategory} onChange={e=>{setNewCategory(e.target.value);setCategoryTouched(true);}}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button style={btn(accent!==C.blue?accent:C.blueGrad)} onClick={addCollege}><Plus size={14}/>Add</button>
        </div>
        {hintSat && <p style={{fontSize:11,color:C.t3,marginTop:10,lineHeight:1.5}}>Pick a U.S. school from the dropdown and we'll suggest Reach/Target/Safety by comparing its SAT/ACT midpoints against your {scores.primaryTest === 'ACT' && scores.act != null ? `ACT ${scores.act} (≈ SAT ${hintSat})` : `SAT ${hintSat}`} — you can always change it.</p>}
      </div>

      {loading ? (
        <div style={{fontSize:13,color:C.t3}}>Loading…</div>
      ) : colleges.length === 0 ? (
        <div style={glass({padding:30,textAlign:'center'})}>
          <div style={{width:48,height:48,borderRadius:14,background:tint(accent,0.12),border:`1px solid ${tint(accent,0.28)}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
            <School size={22} color={accent}/>
          </div>
          <div style={{fontSize:14,color:C.t2}}>No schools yet — add your first one above.</div>
        </div>
      ) : (
        <div style={CC({gap:10})}>
          {colleges.map(college => {
            const cat = CATEGORIES.find(c => c.id === college.category) || CATEGORIES[1];
            const items = checklists[college.id] || [];
            const doneCount = items.filter(i => i.done).length;
            const checklistPct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
            const isOpen = expanded === college.id;
            // Admissions stats for a school we recognize, so the student can see the SAT/ACT they
            // are actually up against without leaving the tracker. `suggested` is what our data
            // says the category should be — surfaced only when it disagrees with how they filed it.
            const stats = SCHOOL_DATA.find(s => s.name.toLowerCase() === String(college.name || '').trim().toLowerCase());
            const suggested = stats && scores.hasScore ? categorizeSchool(stats, scores.effectiveSat) : null;
            return (
              <div key={college.id} style={{...glass2({padding:0,overflow:'hidden'}),borderLeft:`3px solid ${cat.color}`,background:`linear-gradient(120deg,${tint(cat.color,0.05)},rgba(255,255,255,0.02) 50%)`}}>
                <div style={{...R({gap:12,padding:14,cursor:'pointer'})}} onClick={()=>setExpanded(isOpen?null:college.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={R({gap:8})}>
                      <span style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{college.name}</span>
                      <span style={pill(`${cat.color}18`, cat.color)}>{cat.label}</span>
                      {suggested && suggested !== college.category && (
                        <span
                          style={{...pill(`${C.amber}18`, C.amber),cursor:'pointer'}}
                          title={`Their SAT mid is ${stats.sat} (ACT ${stats.act}) against your ${scores.effectiveSat} — click to refile as ${suggested}.`}
                          onClick={e=>{e.stopPropagation();updateCollege(college.id,{category:suggested});}}
                        ><Flag size={9}/> looks like a {suggested}</span>
                      )}
                    </div>
                    {stats && (
                      <div style={{fontSize:10.5,color:C.t4,marginTop:4,fontFamily:C.FM}}>
                        {stats.state} · SAT {stats.sat} · ACT {stats.act} · {stats.accept}% admit
                        {scores.hasScore && ` · you: ${scores.sat != null ? `SAT ${scores.sat}` : ''}${scores.sat != null && scores.act != null ? ' / ' : ''}${scores.act != null ? `ACT ${scores.act}` : ''}`}
                      </div>
                    )}
                    <div style={{fontSize:11,color:C.t3,marginTop:4,display:'flex',alignItems:'center',gap:8}}>
                      {items.length ? `${doneCount}/${items.length} checklist items` : 'No checklist yet'}
                      {items.length > 0 && (
                        <span style={{flex:'0 1 90px',height:4,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',display:'inline-block'}}>
                          <span style={{display:'block',height:'100%',width:`${checklistPct}%`,background:checklistPct===100?C.green:cat.color,borderRadius:3}}/>
                        </span>
                      )}
                      {college.css_profile_required && <span style={{color:C.violetL}}>· CSS Profile required</span>}
                    </div>
                  </div>
                  <select style={inp({width:'auto',fontSize:12,padding:'6px 10px'})} value={college.status} onClick={e=>e.stopPropagation()} onChange={e=>updateCollege(college.id, { status: e.target.value })}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button style={btnSm(C.roseDim,{color:C.rose})} onClick={e=>{e.stopPropagation();removeCollege(college.id);}}><Trash2 size={12}/></button>
                  {isOpen ? <ChevronUp size={16} color={C.t3}/> : <ChevronDown size={16} color={C.t3}/>}
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
                      <div style={{padding:'0 14px 16px',borderTop:`1px solid ${C.b1}`,marginTop:2,paddingTop:14}}>
                        <div style={G(2,10,{},true)}>
                          <div>
                            <label style={lbl()}>EA/ED Deadline</label>
                            <input type="date" style={inp()} value={college.ea_ed_deadline||''} onChange={e=>updateCollege(college.id,{ea_ed_deadline:e.target.value})} />
                          </div>
                          <div>
                            <label style={lbl()}>RD Deadline</label>
                            <input type="date" style={inp()} value={college.rd_deadline||''} onChange={e=>updateCollege(college.id,{rd_deadline:e.target.value})} />
                          </div>
                        </div>
                        <div style={G(2,10,{marginTop:10},true)}>
                          <div>
                            <label style={lbl()}>Financial Aid Deadline</label>
                            <input type="date" style={inp()} value={college.financial_aid_deadline||''} onChange={e=>updateCollege(college.id,{financial_aid_deadline:e.target.value})} />
                          </div>
                          <div>
                            <label style={lbl()}>Requires CSS Profile?</label>
                            <div onClick={()=>updateCollege(college.id,{css_profile_required:!college.css_profile_required})} style={{...R({gap:8,cursor:'pointer',height:38})}}>
                              <div style={{width:36,height:20,borderRadius:10,background:college.css_profile_required?accent:C.s4,position:'relative',transition:'background .2s',flexShrink:0,border:`1px solid ${college.css_profile_required?accent:C.b2}`}}>
                                <div style={{width:14,height:14,borderRadius:'50%',background:college.css_profile_required?'#fff':C.s1,border:college.css_profile_required?'none':`1px solid ${C.b2}`,position:'absolute',top:2,left:college.css_profile_required?18:2,transition:'left .2s'}}/>
                              </div>
                              <span style={{fontSize:12,color:C.t2}}>{college.css_profile_required?'Yes':'No'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{marginTop:14}}>
                          <label style={lbl()}>Checklist</label>
                          <div style={CC({gap:6})}>
                            {items.map(item => (
                              <div key={item.id} style={{...R({gap:8,cursor:'pointer'})}} onClick={()=>toggleChecklistItem(college.id, item)}>
                                <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${item.done?accent:C.b2}`,background:item.done?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  {item.done && <Check size={11} color="#fff"/>}
                                </div>
                                <span style={{fontSize:12,color:item.done?C.t3:C.t2,textDecoration:item.done?'line-through':'none'}}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{marginTop:14}}>
                          <label style={lbl()}>Notes</label>
                          <textarea style={{...inp(),minHeight:60,resize:'vertical'}} value={college.notes||''}
                            onChange={e=>setColleges(prev=>prev.map(c=>c.id===college.id?{...c,notes:e.target.value}:c))}
                            onBlur={e=>updateItem('colleges', college.id, { notes: e.target.value }).catch(err=>toast.error(err.message))}
                            placeholder="Anything you want to remember about this school…" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
