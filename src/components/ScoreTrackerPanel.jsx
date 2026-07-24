import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Line } from 'react-chartjs-2';
import { Plus, Trash2, Target, Sparkles, Brain, Trophy, Zap, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, R, CC, G, pill, tint } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import PanelHero from './ui/PanelHero';

const SAT_SECTIONS = [
  { key: 'rw', label: 'Reading & Writing', max: 800, placeholder: 'e.g. 680' },
  { key: 'math', label: 'Math', max: 800, placeholder: 'e.g. 740' }
];

const ACT_SECTIONS = [
  { key: 'english', label: 'English', max: 36, placeholder: 'e.g. 32' },
  { key: 'math', label: 'Math', max: 36, placeholder: 'e.g. 29' },
  { key: 'reading', label: 'Reading', max: 36, placeholder: 'e.g. 34' },
  { key: 'science', label: 'Science', max: 36, placeholder: 'e.g. 31' }
];

function SL({ children, extra = {} }) { return <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:14,...extra}}>{children}</div>; }

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const l = (e) => setMatches(e.matches);
    m.addEventListener('change', l);
    return () => m.removeEventListener('change', l);
  }, [query]);
  return matches;
}

export default function ScoreTrackerPanel({ accent = C.blue }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testType, setTestType] = useState('SAT');
  const [testDate, setTestDate] = useState('');
  const [composite, setComposite] = useState('');
  const [sections, setSections] = useState({});
  const [isTarget, setIsTarget] = useState(false);
  const [chartView, setChartView] = useState('composite'); // 'composite' | 'subscores'

  const load = useCallback(async () => {
    setLoading(true);
    try { setScores(await listItems('test_scores')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sectionDefs = testType === 'SAT' ? SAT_SECTIONS : ACT_SECTIONS;

  async function addScore(e) {
    e.preventDefault();
    if (!testDate || !composite) {
      toast.error("Please fill in the date and composite score.");
      return;
    }

    // Validate score limits
    const compNum = Number(composite);
    if (testType === 'SAT' && (compNum < 400 || compNum > 1600)) {
      toast.error("SAT Composite must be between 400 and 1600.");
      return;
    }
    if (testType === 'ACT' && (compNum < 1 || compNum > 36)) {
      toast.error("ACT Composite must be between 1 and 36.");
      return;
    }

    try {
      const row = await createItem('test_scores', {
        test_type: testType, test_date: testDate, composite: compNum,
        section_scores: sections, is_target: isTarget,
      });
      setScores(prev => [...prev, row]);
      setTestDate(''); setComposite(''); setSections({}); setIsTarget(false);
      toast.success(isTarget ? 'Target score saved!' : 'Test score logged successfully!');
    } catch (err) { toast.error(err.message); }
  }

  async function removeScore(id) {
    if (!window.confirm('Delete this test score entry?')) return;
    setScores(prev => prev.filter(s => s.id !== id));
    try {
      await deleteItem('test_scores', id);
      toast.success("Score entry removed");
    } catch (err) { toast.error(err.message); }
  }

  const actual = useMemo(() => scores.filter(s => !s.is_target).sort((a,b)=>a.test_date.localeCompare(b.test_date)), [scores]);
  const target = useMemo(() => scores.find(s => s.is_target && s.test_type === testType), [scores, testType]);
  const latest = useMemo(() => actual.filter(s => s.test_type === testType).slice(-1)[0], [actual, testType]);

  // Superscore Calculations
  const satSuperscore = useMemo(() => {
    const satActual = scores.filter(s => !s.is_target && s.test_type === 'SAT');
    if (satActual.length === 0) return null;
    let maxRW = 0, maxMath = 0;
    satActual.forEach(s => {
      const rw = Number(s.section_scores?.rw) || 0;
      const math = Number(s.section_scores?.math) || 0;
      if (rw > maxRW) maxRW = rw;
      if (math > maxMath) maxMath = math;
    });
    if (maxRW === 0 && maxMath === 0) {
      return Math.max(...satActual.map(s => s.composite));
    }
    return maxRW + maxMath;
  }, [scores]);

  const actSuperscore = useMemo(() => {
    const actActual = scores.filter(s => !s.is_target && s.test_type === 'ACT');
    if (actActual.length === 0) return null;
    let maxE = 0, maxM = 0, maxR = 0, maxS = 0;
    actActual.forEach(s => {
      const e = Number(s.section_scores?.english) || 0;
      const m = Number(s.section_scores?.math) || 0;
      const r = Number(s.section_scores?.reading) || 0;
      const sc = Number(s.section_scores?.science) || 0;
      if (e > maxE) maxE = e;
      if (m > maxM) maxM = m;
      if (r > maxR) maxR = r;
      if (sc > maxS) maxS = sc;
    });
    if (maxE === 0 && maxM === 0 && maxR === 0 && maxS === 0) {
      return Math.max(...actActual.map(s => s.composite));
    }
    return Math.round((maxE + maxM + maxR + maxS) / 4);
  }, [scores]);

  // Weak Section Analysis & Study Tips
  const weakSectionAnalysis = useMemo(() => {
    const satActual = scores.filter(s => !s.is_target && s.test_type === 'SAT');
    const actActual = scores.filter(s => !s.is_target && s.test_type === 'ACT');

    if (testType === 'SAT' && satActual.length > 0) {
      let sumRW = 0, sumM = 0, count = 0;
      satActual.forEach(s => {
        if (s.section_scores?.rw && s.section_scores?.math) {
          sumRW += Number(s.section_scores.rw);
          sumM += Number(s.section_scores.math);
          count++;
        }
      });
      if (count > 0) {
        const avgRW = sumRW / count;
        const avgM = sumM / count;
        if (avgRW < avgM) {
          return {
            section: 'Reading & Writing',
            score: Math.round(avgRW),
            tip: 'Focus on writing mechanics and active reading. Study the "SAT Reading & Writing: Grammar Rules" and "Reading Comprehension Tactics" decks.',
            prompts: [
              'Give me high-yield punctuation rules for SAT Reading & Writing',
              'Explain how to approach standard english conventions on the SAT',
              'Generate a 10-day reading and vocabulary plan for SAT RW'
            ]
          };
        } else {
          return {
            section: 'Math',
            score: Math.round(avgM),
            tip: 'Strengthen core algebra and problem-solving skills. Drill the "SAT Math Strategies" and "Algebra II Essentials" flashcard decks.',
            prompts: [
              'Explain standard algebraic systems of equations for SAT Math',
              'What are the most common geometry formulas on the SAT?',
              'Explain the plug-in strategy for hard SAT math questions'
            ]
          };
        }
      }
    } else if (testType === 'ACT' && actActual.length > 0) {
      let sumE = 0, sumM = 0, sumR = 0, sumS = 0, count = 0;
      actActual.forEach(s => {
        if (s.section_scores?.english && s.section_scores?.math) {
          sumE += Number(s.section_scores.english);
          sumM += Number(s.section_scores.math);
          sumR += Number(s.section_scores.reading || 0);
          sumS += Number(s.section_scores.science || 0);
          count++;
        }
      });
      if (count > 0) {
        const avgs = [
          { name: 'English', val: sumE / count },
          { name: 'Math', val: sumM / count },
          { name: 'Reading', val: sumR / count },
          { name: 'Science', val: sumS / count }
        ];
        avgs.sort((a,b) => a.val - b.val);
        const weak = avgs[0];
        const tips = {
          'English': 'Focus on sentence structure, punctuation, and rhetoric. Review "Vocabulary Builder" and "Essay Writing Toolkit" decks.',
          'Math': 'Focus on algebra, geometry, and trig. Drill "Algebra II Essentials" and "SAT Math Strategies" decks.',
          'Reading': 'Master speed-reading and main-idea identification. Drill "Reading Comprehension Tactics" deck.',
          'Science': 'Practice rapid chart analysis and experiment reading. Drill "Statistics & Data Basics" and "Environmental Science Basics" decks.'
        };
        return {
          section: weak.name,
          score: Math.round(weak.val),
          tip: tips[weak.name] || 'Practice consistent timing and review all incorrect questions.',
          prompts: [
            `What are the best strategies to improve my ACT ${weak.name} score?`,
            `Explain high-yield topic concepts for the ACT ${weak.name} section`,
            `Give me a 2-week study plan focusing on ACT ${weak.name}`
          ]
        };
      }
    }
    return null;
  }, [scores, testType]);

  // Prep Milestones & Goals Tracker
  const milestones = useMemo(() => {
    const testScoresFiltered = actual.filter(s => s.test_type === testType);
    return [
      { label: 'Set your Target Score', done: !!target, desc: 'Establish a clear benchmark to aim for' },
      { label: 'Log initial baseline score', done: testScoresFiltered.length >= 1, desc: 'Record a starting score to track progress' },
      { label: 'Input detailed section scores', done: testScoresFiltered.some(s => s.section_scores && Object.keys(s.section_scores).length > 0), desc: 'Enable section-level weakness analysis' },
      { label: 'Achieve score improvement', done: testScoresFiltered.length >= 2 && testScoresFiltered[testScoresFiltered.length - 1].composite > testScoresFiltered[0].composite, desc: 'Your scores show a positive upward trend!' }
    ];
  }, [actual, target, testType]);

  // Chart Rendering config supporting toggling trends
  const filteredActual = useMemo(() => actual.filter(s => s.test_type === testType), [actual, testType]);

  const chartData = useMemo(() => {
    const labels = filteredActual.map(s => new Date(s.test_date+'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

    if (chartView === 'composite') {
      return {
        labels,
        datasets: [{
          label: 'Composite Score',
          data: filteredActual.map(s => s.composite),
          borderColor: accent,
          backgroundColor: `${accent}16`,
          tension: 0.3,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      };
    } else {
      // Subscores trend
      if (testType === 'SAT') {
        return {
          labels,
          datasets: [
            {
              label: 'Reading & Writing',
              data: filteredActual.map(s => s.section_scores?.rw || null),
              borderColor: C.blue,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 5
            },
            {
              label: 'Math',
              data: filteredActual.map(s => s.section_scores?.math || null),
              borderColor: C.amber,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 5
            }
          ]
        };
      } else {
        // ACT Subscores
        return {
          labels,
          datasets: [
            {
              label: 'English',
              data: filteredActual.map(s => s.section_scores?.english || null),
              borderColor: C.blue,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 4
            },
            {
              label: 'Math',
              data: filteredActual.map(s => s.section_scores?.math || null),
              borderColor: C.amber,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 4
            },
            {
              label: 'Reading',
              data: filteredActual.map(s => s.section_scores?.reading || null),
              borderColor: C.violetL,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 4
            },
            {
              label: 'Science',
              data: filteredActual.map(s => s.section_scores?.science || null),
              borderColor: C.green,
              backgroundColor: 'transparent',
              tension: 0.3,
              pointRadius: 4
            }
          ]
        };
      }
    }
  }, [filteredActual, chartView, testType, accent]);

  const currentSuperscore = testType === 'SAT' ? satSuperscore : actSuperscore;

  return (
    <div style={CC({gap:22})}>
      <PanelHero tourTag="portfolio-deep-scores" icon={TrendingUp} color={accent} color2={C.green} m={isMobile}
        eyebrow="Test Prep" title="SAT / ACT Score Tracker"
        sub="Log every attempt and set a target — your scores here drive the countdown gap on Home and feed straight into the Admissions Calculator."
        right={
          <div style={R({ gap: 6 })}>
            {['SAT', 'ACT'].map(type => (
              <button key={type} style={btnSm(testType===type ? `linear-gradient(135deg,${accent},${C.green})` : C.s4, { fontSize: 12, boxShadow: testType===type?`0 4px 12px ${tint(accent,0.3)}`:'none' })} onClick={()=>{setTestType(type); setSections({});}}>{type} Dashboard</button>
            ))}
          </div>
        }/>

      {/* Dynamic Header Metrics Grid */}
      {(latest || target || currentSuperscore) && (
        <div style={glass({padding:22})}>
          <div style={G(isMobile ? 2 : 4, 14, {}, false)}>
            {latest && (
              <div style={glass2({ background: 'rgba(255,255,255,0.015)' })}>
                <div style={lbl()}>Latest Score</div>
                <div style={{fontSize:32,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{latest.composite}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:2}}>{latest.test_type} · {new Date(latest.test_date+'T00:00:00').toLocaleDateString()}</div>
              </div>
            )}
            {currentSuperscore && (
              <div style={glass2({ background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.violet}30` })}>
                <div style={lbl({ color: C.violetL })}>Superscore 🔥</div>
                <div style={{fontSize:32,fontWeight:800,color:C.violetL,fontFamily:C.FD}}>{currentSuperscore}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:2}}>Best subscores combined</div>
              </div>
            )}
            {target && (
              <div style={glass2({ background: 'rgba(255,255,255,0.015)', border: `1px solid ${accent}30` })}>
                <div style={lbl({ color: accent })}>Target Goal</div>
                <div style={{fontSize:32,fontWeight:800,color:accent,fontFamily:C.FD}}>{target.composite}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:2}}>{target.test_type} Goal</div>
              </div>
            )}
            {latest && target && (
              <div style={glass2({ background: 'rgba(255,255,255,0.015)' })}>
                <div style={lbl()}>Remaining Gap</div>
                <div style={{fontSize:32,fontWeight:800,color:target.composite > latest.composite ? C.amberL : C.greenL,fontFamily:C.FD}}>
                  {target.composite > latest.composite ? `-${target.composite - latest.composite}` : 'Goal Met! 🎉'}
                </div>
                <div style={{fontSize:11,color:C.t3,marginTop:2}}>{target.composite > latest.composite ? 'points to go' : 'Superb!'}</div>
              </div>
            )}
          </div>

          {/* Subscores breakdown list */}
          {latest?.section_scores && Object.keys(latest.section_scores).length > 0 && (
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.b1}`}}>
              <div style={lbl()}>Latest Section Breakdown</div>
              <div style={G(isMobile ? 2 : 4, 10, {}, false)}>
                {Object.entries(latest.section_scores).map(([k,v]) => {
                  const maxVal = testType === 'SAT' ? 800 : 36;
                  const pct = Math.round((v / maxVal) * 100);
                  return (
                    <div key={k} style={glass2({ padding: 10 })}>
                      <span style={{fontSize:11,color:C.t3,textTransform:'uppercase',fontWeight:700}}>{k}</span>
                      <div style={{fontSize:18,fontWeight:800,color:C.t1,fontFamily:C.FM,margin:'2px 0 6px'}}>{v}<span style={{fontSize:11,color:C.t4}}> / {maxVal}</span></div>
                      <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:accent}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weak Section Analysis & Action Plan */}
      {weakSectionAnalysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={glass({ padding: 20, border: `1px solid ${C.amber}25`, background: `linear-gradient(135deg, ${C.s1}, ${C.amberDim})` })}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <Brain size={16} color={C.amberL}/>
            <SL extra={{ margin: 0, color: C.amberL }}>Weak Section Analysis & Action Plan</SL>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6 }}>
            Lowest relative section: <span style={{ color: C.amberL }}>{weakSectionAnalysis.section}</span> (Avg: ~{weakSectionAnalysis.score})
          </div>
          <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, margin: '0 0 14px' }}>
            {weakSectionAnalysis.tip}
          </p>
          <div>
            <div style={lbl({ color: C.t3, marginBottom: 6 })}>Recommended AI Coach Prompts to copy:</div>
            <div style={CC({ gap: 6 })}>
              {weakSectionAnalysis.prompts.map((p, idx) => (
                <div key={idx} style={{ ...glass2({ padding: '8px 12px', background: 'rgba(0,0,0,0.2)' }), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.t2, fontFamily: C.FB }}>"{p}"</span>
                  <button style={btnSm(C.s4, { fontSize: 11 })} onClick={() => {
                    navigator.clipboard.writeText(p);
                    toast.success('Prompt copied to clipboard! Paste it in the AI Coach.');
                  }}>Copy Prompt</button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Trend Line Chart with Toggles */}
      {filteredActual.length >= 1 && (
        <div style={glass({padding:18})}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 12 })}>
            <SL extra={{ marginBottom: 0 }}>Score Trend History</SL>
            <div style={R({ gap: 6 })}>
              <button style={btnSm(chartView === 'composite' ? C.blueGrad : C.s4, { fontSize: 11 })} onClick={() => setChartView('composite')}>Composite</button>
              <button style={btnSm(chartView === 'subscores' ? C.blueGrad : C.s4, { fontSize: 11 })} onClick={() => setChartView('subscores')}>Section Subscores</button>
            </div>
          </div>
          <div style={{height:220}}>
            <Line
              data={chartData}
              options={{
                maintainAspectRatio:false,
                plugins:{legend:{display: chartView === 'subscores', labels: {color: C.t2, font: {size: 11}}}},
                scales:{
                  y:{grid: {color: 'rgba(255,255,255,0.05)'}, ticks:{color:C.t3, font:{family: C.FM}}},
                  x:{grid: {display: false}, ticks:{color:C.t3}}
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Prep Milestones Checklist */}
      <div style={glass({ padding: 18 })}>
        <SL>Prep Milestones & Goal Tracker</SL>
        <div style={G(isMobile ? 1 : 2, 10, {}, false)}>
          {milestones.map((m, idx) => (
            <div key={idx} style={glass2({ display: 'flex', alignItems: 'flex-start', gap: 12, background: m.done ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.015)', borderColor: m.done ? `${C.green}25` : undefined })}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${m.done ? C.green : C.t4}`, background: m.done ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifySelf: 'center', color: '#fff', flexShrink: 0 }}>
                {m.done && <span style={{ fontSize: 11, fontWeight: 900, width: '100%', textAlign: 'center' }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: m.done ? C.t1 : C.t2, fontFamily: C.FD }}>{m.label}</div>
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Score Form */}
      <div style={glass({padding:18})}>
        <SL>Log a test / practice score</SL>
        <form onSubmit={addScore}>
          <div style={G(3,10,{},true)}>
            <div>
              <label style={lbl()}>Test Platform</label>
              <select style={inp()} value={testType} onChange={e=>{setTestType(e.target.value);setSections({});}}>
                <option value="SAT">SAT (400–1600)</option>
                <option value="ACT">ACT (1–36)</option>
              </select>
            </div>
            <div>
              <label style={lbl()}>Test Date</label>
              <input type="date" style={inp()} value={testDate} onChange={e=>setTestDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl()}>Composite Score</label>
              <input type="number" style={inp()} value={composite} onChange={e=>setComposite(e.target.value)} placeholder={testType==='SAT'?'1420':'32'} />
            </div>
          </div>

          <div style={{marginTop:16, borderTop: `1px solid ${C.b1}`, paddingTop: 14}}>
            <label style={lbl()}>Section scores (Highly Recommended for analysis)</label>
            <div style={G(isMobile ? 2 : sectionDefs.length, 10, {}, false)}>
              {sectionDefs.map(s => (
                <div key={s.key}>
                  <label style={lbl({ fontSize: 9, color: C.t3 })}>{s.label}</label>
                  <input type="number" style={inp()} placeholder={s.placeholder} value={sections[s.key]||''} onChange={e=>setSections(prev=>({...prev,[s.key]:Number(e.target.value)}))} />
                </div>
              ))}
            </div>
          </div>

          <div style={{...R({gap:14,marginTop:16})}}>
            <label style={{...R({gap:8}),fontSize:12.5,color:C.t2,cursor:'pointer'}}>
              <input type="checkbox" checked={isTarget} onChange={e=>setIsTarget(e.target.checked)} />
              This is a target score goal, not a real result
            </label>
          </div>
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:14}}><Plus size={14}/>{isTarget?'Save Target Goal':'Log Score'}</button>
        </form>
      </div>

      {/* History Log list */}
      {!loading && scores.length > 0 && (
        <div style={CC({gap:10})}>
          <SL>Log History ({scores.length} entries)</SL>
          {scores.slice().reverse().map(s => (
            <div key={s.id} style={{...glass2({padding:14}),display:'flex',alignItems:'center',gap:12, borderLeft: s.is_target ? `3px solid ${accent}` : 'none'}}>
              {s.is_target ? (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={14} color={accent}/>
                </div>
              ) : (
                <span style={pill(C.blueDim,C.blueL,{fontSize:9.5, fontFamily: C.FM})}>{s.test_type}</span>
              )}
              <div style={{flex:1, minWidth:0}}>
                <div style={R({gap:8})}>
                  <span style={{fontSize:16,fontWeight:800,color:C.t1, fontFamily: C.FM}}>{s.composite}</span>
                  {s.is_target && <span style={pill(`${accent}12`, accent, { fontSize: 9 })}>Goal Target</span>}
                </div>
                <div style={{fontSize:11.5,color:C.t3,marginTop:2}}>
                  {s.is_target ? `${s.test_type} target baseline` : `Taken on ${new Date(s.test_date+'T00:00:00').toLocaleDateString()}`}
                  {s.section_scores && Object.keys(s.section_scores).length > 0 && (
                    <span> · ({Object.entries(s.section_scores).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(', ')})</span>
                  )}
                </div>
              </div>
              <button style={btnSm(C.roseDim,{color:C.rose, border: `1px solid ${C.rose}15`})} onClick={()=>removeScore(s.id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
