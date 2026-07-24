import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, School, Check, GraduationCap, Send } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';
import CollegeAutocomplete from './CollegeAutocomplete';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';

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

export default function CollegeListPanel({ accent = C.blue, studentSAT = null }) {
  const [colleges, setColleges] = useState([]);
  const [checklists, setChecklists] = useState({}); // collegeId -> items[]
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('target');
  const [categoryTouched, setCategoryTouched] = useState(false); // true once the student picks a category manually, so an autocomplete pick afterward doesn't overwrite their choice

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, items] = await Promise.all([listItems('colleges'), listItems('college_checklist_items')]);
      setColleges(cols);
      const grouped = {};
      items.forEach(i => { (grouped[i.college_id] ||= []).push(i); });
      setChecklists(grouped);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCollege() {
    if (!newName.trim()) return;
    // The college row and its checklist are created in two separate steps below on purpose: if
    // the college create fails, nothing happened and it's safe to just show the error. But if
    // the college succeeds and only the checklist fails, the college already exists server-side
    // — reflecting that in the UI immediately (instead of only after the checklist too) stops a
    // retry from creating a second, duplicate row for the same school.
    let college;
    try {
      college = await createItem('colleges', { name: newName.trim(), category: newCategory, status: 'researching' });
    } catch (err) {
      toast.error(err.message);
      return;
    }
    setColleges(prev => [...prev, college]);
    setNewName('');
    setCategoryTouched(false);
    toast.success(`${college.name} added to your list`);
    try {
      const items = await Promise.all(DEFAULT_CHECKLIST.map((label, i) =>
        createItem('college_checklist_items', { college_id: college.id, label, sort_order: i })
      ));
      setChecklists(prev => ({ ...prev, [college.id]: items }));
    } catch (err) {
      toast.error(`Added ${college.name}, but its default checklist failed to load: ${err.message}`);
    }
  }

  async function updateCollege(id, patch) {
    setColleges(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try { await updateItem('colleges', id, patch); } catch (err) { toast.error(err.message); }
  }

  async function removeCollege(id) {
    if (!window.confirm('Remove this school from your list? This also deletes its checklist.')) return;
    setColleges(prev => prev.filter(c => c.id !== id));
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

  return (
    <div style={CC({gap: 22})}>
      <PanelHero tourTag="portfolio-deep-colleges" icon={GraduationCap} color={accent} color2={C.blue}
        eyebrow="Applications" title="College List & Application Tracker"
        sub="Build a balanced list of reach, target, and safety schools — with per-school deadlines and a checklist so every application actually gets finished."
        stats={colleges.length > 0 ? [{ value: colleges.length, label: colleges.length === 1 ? 'school' : 'schools' }] : []}/>

      {colleges.length > 0 && (
        <div style={G(4,12,{},true)}>
          <StatTile icon={School} value={catCount('reach')} label="Reach" color={C.rose}/>
          <StatTile icon={School} value={catCount('target')} label="Target" color={C.blue}/>
          <StatTile icon={School} value={catCount('safety')} label="Safety" color={C.green}/>
          <StatTile icon={Send} value={submitted} label="Submitted" sub={`${inProgress} in progress · ${notStarted} researching`} color={C.violet}/>
        </div>
      )}

      <div style={{...glass({padding:18}),background:`linear-gradient(120deg,${tint(accent,0.06)},rgba(255,255,255,0.02) 55%)`,border:`1px solid ${tint(accent,0.2)}`}}>
        <SectionTitle icon={Plus} color={accent}>Add a school</SectionTitle>
        <div style={R({gap:10,flexWrap:'wrap'})}>
          <CollegeAutocomplete
            value={newName}
            onChange={setNewName}
            onSelectSchool={(school)=>{
              // Suggest Reach/Target/Safety from how this school's average SAT compares to the
              // student's own (from onboarding) — a helpful default, not a hard override, so it
              // only applies if the student hasn't already picked a category by hand this round.
              if(categoryTouched || !studentSAT || school.sat==null) return;
              const delta=school.sat-studentSAT;
              setNewCategory(delta>60?'reach':delta<-60?'safety':'target');
            }}
            onKeyDown={e=>e.key==='Enter'&&addCollege()}
          />
          <select style={inp({width:'auto'})} value={newCategory} onChange={e=>{setNewCategory(e.target.value);setCategoryTouched(true);}}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button style={btn(accent!==C.blue?accent:C.blueGrad)} onClick={addCollege}><Plus size={14}/>Add</button>
        </div>
        {studentSAT && <p style={{fontSize:11,color:C.t3,marginTop:10,lineHeight:1.5}}>Pick a school from the dropdown and we'll suggest Reach/Target/Safety based on your SAT from onboarding ({studentSAT}) — you can always change it.</p>}
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
            return (
              <div key={college.id} style={{...glass2({padding:0,overflow:'hidden'}),borderLeft:`3px solid ${cat.color}`,background:`linear-gradient(120deg,${tint(cat.color,0.05)},rgba(255,255,255,0.02) 50%)`}}>
                <div style={{...R({gap:12,padding:14,cursor:'pointer'})}} onClick={()=>setExpanded(isOpen?null:college.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={R({gap:8})}>
                      <span style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{college.name}</span>
                      <span style={pill(`${cat.color}18`, cat.color)}>{cat.label}</span>
                    </div>
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
                                <div style={{width:14,height:14,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:college.css_profile_required?18:2,transition:'left .2s'}}/>
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
