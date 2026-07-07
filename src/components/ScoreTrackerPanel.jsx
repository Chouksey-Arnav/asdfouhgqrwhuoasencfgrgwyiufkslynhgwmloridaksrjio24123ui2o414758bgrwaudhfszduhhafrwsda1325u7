import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Line } from 'react-chartjs-2';
import { Plus, Trash2, Target } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';

const SAT_SECTIONS = [{ key: 'rw', label: 'Reading & Writing', max: 800 }, { key: 'math', label: 'Math', max: 800 }];
const ACT_SECTIONS = [{ key: 'english', label: 'English', max: 36 }, { key: 'math', label: 'Math', max: 36 }, { key: 'reading', label: 'Reading', max: 36 }, { key: 'science', label: 'Science', max: 36 }];

export default function ScoreTrackerPanel({ accent = C.blue }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testType, setTestType] = useState('SAT');
  const [testDate, setTestDate] = useState('');
  const [composite, setComposite] = useState('');
  const [sections, setSections] = useState({});
  const [isTarget, setIsTarget] = useState(false);

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
    if (!testDate || !composite) return;
    try {
      const row = await createItem('test_scores', {
        test_type: testType, test_date: testDate, composite: Number(composite),
        section_scores: sections, is_target: isTarget,
      });
      setScores(prev => [...prev, row]);
      setTestDate(''); setComposite(''); setSections({}); setIsTarget(false);
      toast.success(isTarget ? 'Target score saved' : 'Score added');
    } catch (err) { toast.error(err.message); }
  }

  async function removeScore(id) {
    setScores(prev => prev.filter(s => s.id !== id));
    try { await deleteItem('test_scores', id); } catch (err) { toast.error(err.message); }
  }

  const actual = scores.filter(s => !s.is_target).sort((a,b)=>a.test_date.localeCompare(b.test_date));
  const target = scores.find(s => s.is_target);
  const latest = actual[actual.length - 1];

  const chartData = useMemo(() => ({
    labels: actual.map(s => new Date(s.test_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})),
    datasets: [{
      label: 'Composite',
      data: actual.map(s => s.composite),
      borderColor: accent, backgroundColor: `${accent}22`, tension: 0.3, fill: true, pointRadius: 4,
    }],
  }), [actual, accent]);

  return (
    <div style={CC({gap:22})}>
      <div>
        <div style={lbl()}>Test Prep</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>SAT / ACT Score Tracker</h2>
      </div>

      {(latest || target) && (
        <div style={glass({padding:22})}>
          <div style={R({gap:24,flexWrap:'wrap'})}>
            {latest && (
              <div>
                <div style={lbl()}>Current</div>
                <div style={{fontSize:32,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{latest.composite}</div>
                <div style={{fontSize:11,color:C.t3}}>{latest.test_type} · {new Date(latest.test_date+'T00:00:00').toLocaleDateString()}</div>
              </div>
            )}
            {target && (
              <div>
                <div style={lbl()}>Target</div>
                <div style={{fontSize:32,fontWeight:800,color:accent,fontFamily:C.FD}}>{target.composite}</div>
                <div style={{fontSize:11,color:C.t3}}>{target.test_type}</div>
              </div>
            )}
            {latest && target && (
              <div>
                <div style={lbl()}>Gap</div>
                <div style={{fontSize:32,fontWeight:800,color:target.composite>latest.composite?C.amberL:C.greenL,fontFamily:C.FD}}>{Math.abs(target.composite-latest.composite)}</div>
                <div style={{fontSize:11,color:C.t3}}>points to go</div>
              </div>
            )}
          </div>
          {latest?.section_scores && Object.keys(latest.section_scores).length > 0 && (
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.b1}`}}>
              <div style={lbl()}>Latest section breakdown</div>
              <div style={R({gap:20,flexWrap:'wrap'})}>
                {Object.entries(latest.section_scores).map(([k,v]) => (
                  <div key={k}><span style={{fontSize:11,color:C.t3,textTransform:'capitalize'}}>{k}</span><div style={{fontSize:15,fontWeight:700,color:C.t1}}>{v}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {actual.length >= 2 && (
        <div style={glass({padding:18,height:240})}>
          <div style={lbl()}>Score Trend</div>
          <div style={{height:180}}>
            <Line data={chartData} options={{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:C.t3}},x:{ticks:{color:C.t3}}}}} />
          </div>
        </div>
      )}

      <div style={glass({padding:18})}>
        <div style={lbl()}>Log a score</div>
        <form onSubmit={addScore}>
          <div style={G(3,10,{},true)}>
            <div>
              <label style={lbl()}>Test</label>
              <select style={inp()} value={testType} onChange={e=>{setTestType(e.target.value);setSections({});}}>
                <option value="SAT">SAT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>
            <div>
              <label style={lbl()}>Date</label>
              <input type="date" style={inp()} value={testDate} onChange={e=>setTestDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl()}>Composite</label>
              <input type="number" style={inp()} value={composite} onChange={e=>setComposite(e.target.value)} placeholder={testType==='SAT'?'1420':'32'} />
            </div>
          </div>
          <div style={{marginTop:12}}>
            <label style={lbl()}>Section scores (optional)</label>
            <div style={G(sectionDefs.length,10,{},true)}>
              {sectionDefs.map(s => (
                <input key={s.key} type="number" style={inp()} placeholder={s.label} value={sections[s.key]||''} onChange={e=>setSections(prev=>({...prev,[s.key]:Number(e.target.value)}))} />
              ))}
            </div>
          </div>
          <div style={{...R({gap:14,marginTop:14})}}>
            <label style={{...R({gap:6}),fontSize:12,color:C.t2,cursor:'pointer'}}>
              <input type="checkbox" checked={isTarget} onChange={e=>setIsTarget(e.target.checked)} />
              This is my target score, not a real result
            </label>
          </div>
          <button type="submit" style={{...btn(accent!==C.blue?accent:C.blueGrad),marginTop:14}}><Plus size={14}/>{isTarget?'Save target':'Add score'}</button>
        </form>
      </div>

      {!loading && scores.length > 0 && (
        <div style={CC({gap:8})}>
          {scores.slice().reverse().map(s => (
            <div key={s.id} style={{...glass2({padding:12}),display:'flex',alignItems:'center',gap:12}}>
              {s.is_target ? <Target size={14} color={accent}/> : <span style={pill(C.blueDim,C.blueL,{fontSize:9})}>{s.test_type}</span>}
              <div style={{flex:1}}>
                <span style={{fontSize:14,fontWeight:700,color:C.t1}}>{s.composite}</span>
                <span style={{fontSize:11,color:C.t3,marginLeft:8}}>{s.is_target ? 'target' : new Date(s.test_date+'T00:00:00').toLocaleDateString()}</span>
              </div>
              <button style={btnSm(C.roseDim,{color:C.rose})} onClick={()=>removeScore(s.id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
