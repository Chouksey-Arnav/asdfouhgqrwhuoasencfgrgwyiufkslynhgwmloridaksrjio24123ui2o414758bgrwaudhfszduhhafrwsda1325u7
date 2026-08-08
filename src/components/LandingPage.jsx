import React, { useEffect, useRef, useState } from 'react';
import AnimatedLogo from './AnimatedLogo';
import {
  ArrowRight, Check, ShieldCheck, Home, Compass, Building2, LineChart, Search,
  Flame, Settings, BookOpen, Layers, MessageCircle, Route, GraduationCap,
  Calendar, FileText, Menu, X, TrendingUp, Sparkles, Zap, ClipboardList,
} from 'lucide-react';
import { LEGAL_VIEWS } from '../lib/routes';
import { LEGAL, TRADEMARK_NOTICE } from '../legal/legalConfig';

// ── Design tokens — mirrors the app's `C` palette in App.jsx so every mockup on
//    this page is pixel-honest with what users actually get after signing up. ──
const C = {
  bg: '#04060b', s0: '#060a15', s1: '#0a1020', s2: '#0f1828', s3: '#162032', s4: '#1d2a40',
  b1: 'rgba(255,255,255,0.07)', b2: 'rgba(255,255,255,0.11)', b3: 'rgba(255,255,255,0.18)',
  t1: '#eef2ff', t2: '#94a3c0', t3: '#506080',
  blue: '#2d7fff', blueL: '#5da0ff', blueGrad: 'linear-gradient(135deg,#2d7fff 0%,#1d5fd9 100%)',
  green: '#10b981', greenL: '#34d399',
  amber: '#f59e0b', amberL: '#fbbf24',
  rose: '#f43f5e', roseL: '#fb7185',
  violet: '#8b5cf6', violetL: '#a78bfa',
  cyan: '#06b6d4', cyanL: '#22d3ee',
  indigo: '#6366f1', indigoL: '#818cf8',
  sky: '#0ea5e9', skyL: '#38bdf8',
  pink: '#ec4899', pinkL: '#f472b6',
  FD: "'Bricolage Grotesque',-apple-system,sans-serif",
  FB: "'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM: "'JetBrains Mono','SF Mono',monospace",
};

const glass = (x = {}) => ({
  background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)', ...x,
});

const pill = (bg, color, x = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 11px', borderRadius: 20,
  fontSize: 11, fontWeight: 600, letterSpacing: '.04em', background: bg, color, ...x,
});

// ── Small shared bits ─────────────────────────────────────────────────────

function Eyebrow({ color, glow, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: glow, boxShadow: `0 0 12px ${glow}` }} />
      {children}
    </span>
  );
}

function FeaturePill({ bg, color, icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '7px 14px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', background: bg, color, border: `1px solid ${color}30` }}>
      {icon}{children}
    </span>
  );
}

function CheckLi({ color, children }) {
  return (
    <li style={{ display: 'flex', gap: 11, fontSize: 15, lineHeight: 1.55, color: 'rgba(238,242,255,0.92)' }}>
      <span style={{ width: 20, height: 20, borderRadius: 7, background: `${color}1c`, border: `1px solid ${color}35`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Check size={12} color={color} strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

// Progress arc — same geometry as the app's <Arc/> so the pathway-match ring
// in the hero replica moves exactly like the real dashboard's.
function Arc({ pct, size = 74, stroke = 7, color = C.blue, label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.s4} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: C.FM, fontWeight: 700, fontSize: size / 4.6, color: C.t1 }}>{label}</span>
      </div>
    </div>
  );
}

function Bar({ pct, color = C.blue, h = 4 }) {
  return (
    <div style={{ height: h, borderRadius: h, background: C.s3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: h, background: color, boxShadow: `0 0 8px ${color}70` }} />
    </div>
  );
}

// ── THE HERO REPLICA — a live, clickable miniature of the real app shell ───
// Browser chrome → 236px-style sidebar (brand, ⌘K, user card, labelled nav)
// → dashboard main, which actually switches between Home/Prep/Portfolio
// content when you click the sidebar — not a static screenshot.

function MockSideItem({ icon: Ic, label, active, color = C.blue, badge, onClick }) {
  const interactive = typeof onClick === 'function';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, width: '100%',
        background: active ? `${color}18` : 'transparent', color: active ? '#fff' : C.t2,
        fontWeight: active ? 700 : 500, fontSize: 12, borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
        border: 'none', borderLeftWidth: 2, textAlign: 'left', fontFamily: 'inherit',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      <Ic size={14} color={active ? color : undefined} style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={pill('rgba(245,158,11,0.12)', C.amberL, { fontSize: 8.5, padding: '1px 6px' })}>{badge}</span>}
    </button>
  );
}

function MockStat({ icon: Ic, color, value, label }) {
  return (
    <div style={glass({ borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: `${color}16`, border: `1px solid ${color}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic size={13} color={color} />
        </span>
        <span style={{ fontFamily: C.FM, fontWeight: 700, fontSize: 17, color: C.t1 }}>{value}</span>
      </div>
      <div style={{ fontSize: 10, color: C.t2, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

const HERO_COPY = {
  home: { eyebrow: 'Welcome back', title: 'Good evening, Maya.' },
  prep: { eyebrow: 'Prep', title: "Today's study queue" },
  portfolio: { eyebrow: 'Portfolio', title: 'Your application' },
};

function AppReplica() {
  const [tab, setTab] = useState('home');

  return (
    <div className="lp-replica-frame" style={{ borderRadius: 20, border: `1px solid ${C.b2}`, background: `linear-gradient(180deg,${C.s1},${C.bg})`, overflow: 'hidden', boxShadow: `0 0 0 1px rgba(45,127,255,0.08), 0 50px 140px -40px rgba(45,127,255,0.4), 0 30px 70px -35px rgba(0,0,0,0.9)` }}>
      {/* Browser chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${C.b1}`, background: 'rgba(4,6,11,0.6)' }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
        </div>
        <div style={{ margin: '0 auto', maxWidth: 250, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 7, border: `1px solid ${C.b1}`, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', fontFamily: C.FM, fontSize: 11, color: C.t3 }}>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          medschoolprep.cloud
        </div>
        <div style={{ width: 44, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Sidebar — mirrors the real 236px desktop sidebar */}
        <aside className="lp-replica-side" style={{ width: 172, flexShrink: 0, borderRight: `1px solid ${C.b1}`, background: `linear-gradient(180deg,${C.s0} 0%,${C.bg} 100%)`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '13px 12px 11px', borderBottom: `1px solid ${C.b1}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AnimatedLogo size={26} variant="hover" glow={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, whiteSpace: 'nowrap' }}>MedSchoolPrep</div>
              <div style={{ fontSize: 6.5, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Your path into medicine</div>
            </div>
          </div>
          <div style={{ margin: '9px 10px 0', padding: '6px 9px', borderRadius: 8, background: C.s2, border: `1px solid ${C.b1}`, color: C.t3, fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={10} /><span style={{ flex: 1 }}>Jump to…</span>
            <span style={{ ...pill(C.s3, C.t3, { fontSize: 7.5, fontFamily: C.FM, padding: '1px 5px' }) }}>⌘K</span>
          </div>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.b1}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg,${C.blue}55,${C.blue}28)`, border: `1.5px solid ${C.blue}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10.5, color: '#fff', flexShrink: 0 }}>M</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, whiteSpace: 'nowrap' }}>Maya R.</div>
                <div style={{ fontSize: 8, color: C.t3, whiteSpace: 'nowrap' }}>Lv.9 Scholar · Physician</div>
              </div>
            </div>
            <Bar pct={68} color={C.blue} h={3} />
            <div style={{ marginTop: 6 }}>
              <span style={pill('rgba(245,158,11,0.12)', C.amberL, { fontSize: 8, padding: '2px 7px' })}><Flame size={8} />12d streak</span>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '7px 7px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <MockSideItem icon={Home} label="Home" active={tab === 'home'} color={C.blue} onClick={() => setTab('home')} />
            <MockSideItem icon={Compass} label="Prep" badge="14" active={tab === 'prep'} color={C.violet} onClick={() => setTab('prep')} />
            <MockSideItem icon={Building2} label="Portfolio" active={tab === 'portfolio'} color={C.sky} onClick={() => setTab('portfolio')} />
            <MockSideItem icon={LineChart} label="Progress" />
            <MockSideItem icon={Settings} label="Settings" />
          </nav>
        </aside>

        {/* Main — the real dashboard, in miniature, live-switching by tab */}
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ height: 1, background: `linear-gradient(90deg,${C.blue}60,transparent)` }} />
          <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>

            {/* Welcome card — radial glow, accent tile, pathway pill */}
            <div style={glass({ padding: 15, background: 'linear-gradient(135deg,rgba(45,127,255,0.08),rgba(6,182,212,0.04))', border: `1px solid ${C.blue}26`, position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', right: -50, top: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${C.blue}20,transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: `${C.blue}1c`, border: `1.5px solid ${C.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 18px ${C.blue}30` }}>
                  <Home size={17} color={C.blueL} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: C.blueL, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>{HERO_COPY[tab].eyebrow}</div>
                  <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 15.5, color: C.t1, letterSpacing: '-0.01em' }}>{HERO_COPY[tab].title}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={pill(`${C.blue}22`, C.blueL, { fontSize: 8.5 })}>Physician (MD/DO)</span>
                    <span style={pill('rgba(16,185,129,0.14)', C.greenL, { fontSize: 8.5 })}><ShieldCheck size={8} />3 verified this week</span>
                  </div>
                </div>
              </div>
            </div>

            {tab === 'home' && (
              <>
                {/* Pathway match — the diagnostic result card with its live arc */}
                <div style={glass({ padding: 13, display: 'flex', alignItems: 'center', gap: 13 })}>
                  <Arc pct={63} size={56} stroke={5.5} color={C.blue} label="63%" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.blueL }}>Your pathway match</div>
                    <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 13.5, color: C.t1, marginTop: 2 }}>Physician (MD/DO)</div>
                    <div style={{ fontSize: 9.5, color: C.t2, marginTop: 2, lineHeight: 1.45 }}>Scored across all 10 pathways — this one fits you best.</div>
                  </div>
                  <span className="lp-hide-narrow" style={pill(`${C.blue}18`, C.blueL, { fontSize: 8.5, flexShrink: 0 })}>Retake ↻</span>
                </div>

                {/* Next lesson */}
                <div style={glass({ padding: 13 })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.t3 }}>Next lesson · Unit 3</div>
                    <span style={pill('rgba(16,185,129,0.12)', C.greenL, { fontSize: 8 })}><ShieldCheck size={8} />Verified quiz</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.green}16`, border: `1px solid ${C.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={14} color={C.greenL} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Organic Chemistry: Functional Groups</div>
                      <div style={{ fontSize: 9, color: C.t2, marginTop: 1 }}>12 min read · 6 min video · pass at 70% to verify</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, background: C.blueGrad, color: '#fff', fontSize: 9.5, fontWeight: 700, flexShrink: 0, boxShadow: `0 4px 14px ${C.blue}35` }}>Start<ArrowRight size={10} /></span>
                  </div>
                </div>

                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
                  <MockStat icon={TrendingUp} color={C.blue} value="63%" label="Pathway mastery" />
                  <MockStat icon={Calendar} color={C.rose} value="3" label="Deadlines this month" />
                  <MockStat icon={Zap} color={C.amber} value="86" label="Clinical hours logged" />
                </div>
              </>
            )}

            {tab === 'prep' && (
              <>
                <div style={glass({ padding: 13, background: `${C.violet}0f`, border: `1px solid ${C.violet}40`, display: 'flex', alignItems: 'center', gap: 12 })}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.violet}22`, border: `1px solid ${C.violet}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={18} color={C.violetL} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>3 decks due today</div>
                    <div style={{ fontSize: 9.5, color: C.t2, marginTop: 2 }}>Cell Biology · Organic Chemistry · SAT Math</div>
                  </div>
                  <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8, flexShrink: 0 }}>Review</span>
                </div>
                <div style={glass({ padding: 13, display: 'flex', alignItems: 'center', gap: 10 })}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.blue}1c`, border: `1px solid ${C.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={14} color={C.blueL} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>Resume: Functional Groups</div>
                    <div style={{ fontSize: 9, color: C.t2, marginTop: 1 }}>Unit 3 · 40% through the article</div>
                  </div>
                  <span style={{ background: C.blueGrad, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '6px 11px', borderRadius: 8, flexShrink: 0 }}>Resume</span>
                </div>
                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
                  <MockStat icon={Layers} color={C.violet} value="3" label="Decks due" />
                  <MockStat icon={BookOpen} color={C.green} value="27" label="Lessons verified" />
                  <MockStat icon={Flame} color={C.amber} value="12d" label="Study streak" />
                </div>
              </>
            )}

            {tab === 'portfolio' && (
              <>
                <div style={glass({ padding: 13 })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>My College List</div>
                    <span style={pill(`${C.sky}22`, C.skyL, { fontSize: 8.5 })}>Scored to your stats</span>
                  </div>
                  {[
                    ['University of Cincinnati', C.green, C.greenL, 'Likely'],
                    ['Ohio State University', C.blue, C.blueL, 'Target'],
                    ['Johns Hopkins University', C.rose, C.roseL, 'Stretch'],
                  ].map(([name, base, lite, tier], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.b1}`, marginBottom: i < 2 ? 6 : 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: base, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: C.t1 }}>{name}</span>
                      <span style={pill(`${base}1f`, lite, { fontSize: 8.5 })}>{tier}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
                  <MockStat icon={GraduationCap} color={C.sky} value="8" label="Schools tracked" />
                  <MockStat icon={FileText} color={C.violet} value="3" label="Essays drafting" />
                  <MockStat icon={Zap} color={C.green} value="86" label="Clinical hours" />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Feature mockups — each one is a small live demo, not a screenshot ─────

const QUIZ_QUESTIONS = [
  { q: 'Which functional group is a carbonyl (C=O) bonded to a hydroxyl (–OH)?', opts: ['Ketone', 'Carboxylic acid', 'Ether', 'Amine'], correct: 1 },
  { q: 'An –OH group attached to a saturated carbon chain defines a(n):', opts: ['Alcohol', 'Aldehyde', 'Ester', 'Amide'], correct: 0 },
  { q: 'A terminal carbonyl written as –CHO is characteristic of a(n):', opts: ['Ketone', 'Aldehyde', 'Ether', 'Carboxylic acid'], correct: 1 },
  { q: 'Which group features nitrogen bonded to carbon(s) and hydrogens?', opts: ['Ester', 'Amine', 'Ketone', 'Alcohol'], correct: 1 },
];

function LessonMock() {
  const [phase, setPhase] = useState('intro'); // intro | active | done
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const startQuiz = () => { setPhase('active'); setQi(0); setPick(null); setScore(0); };

  const choose = (idx) => {
    if (pick !== null) return;
    const cur = QUIZ_QUESTIONS[qi];
    const correct = idx === cur.correct;
    setPick(idx);
    if (correct) setScore((s) => s + 1);
    timerRef.current = setTimeout(() => {
      setQi((prev) => {
        if (prev + 1 < QUIZ_QUESTIONS.length) { setPick(null); return prev + 1; }
        setPhase('done');
        return prev;
      });
    }, 1050);
  };

  const cur = QUIZ_QUESTIONS[qi];
  const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
  const passed = pct >= 70;
  const active = phase === 'active';

  return (
    <div style={glass({ padding: 20, borderRadius: 20 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ height: 7, width: 20, borderRadius: 4, background: C.green }} />
          <span style={{ height: 7, width: 20, borderRadius: 4, background: C.green }} />
          <span style={{ height: 7, width: 20, borderRadius: 4, background: phase === 'intro' ? C.blue : C.s4, boxShadow: phase === 'intro' ? `0 0 8px ${C.blue}80` : 'none' }} />
        </div>
        <span style={pill(`${C.blue}18`, C.blueL, { fontSize: 9.5 })}>
          {active ? `Question ${qi + 1} of ${QUIZ_QUESTIONS.length}` : phase === 'done' ? 'Results' : 'Step 3 of 3 · Quiz'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${C.blue}18`, border: `1px solid ${C.blue}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={21} color={C.blueL} />
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>Unit 3 · Physician pathway</div>
          <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 18, color: C.t1, marginTop: 3, letterSpacing: '-0.01em' }}>Organic Chemistry: Functional Groups</div>
        </div>
      </div>

      {phase === 'intro' && (
        <>
          <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={pill(C.s3, C.t2, { fontSize: 10.5 })}>12 min read</span>
            <span style={pill(C.s3, C.t2, { fontSize: 10.5 })}>6 min video</span>
            <span style={pill('rgba(16,185,129,0.12)', C.greenL, { fontSize: 10.5 })}><ShieldCheck size={10} />70% to verify</span>
          </div>
          <div style={{ marginTop: 16, borderRadius: 13, background: `${C.blue}0a`, border: `1px solid ${C.blue}25`, padding: 14 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.blueL, marginBottom: 10 }}>Key takeaways</div>
            {['Identify the major functional groups in organic molecules', "Predict reactivity from a group's structure", 'Connect functional groups to real biochemical pathways'].map((t) => (
              <div key={t} style={{ fontSize: 12, color: C.t2, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.55, marginBottom: 6 }}>
                <Check size={13} color={C.blueL} style={{ flexShrink: 0, marginTop: 2 }} />{t}
              </div>
            ))}
          </div>
          <button onClick={startQuiz} className="lp-btn-primary" style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 8px 24px -8px rgba(16,185,129,0.6)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Start verification quiz
            <ArrowRight size={14} />
          </button>
        </>
      )}

      {active && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, fontFamily: C.FM }}>Question {qi + 1} / {QUIZ_QUESTIONS.length}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.greenL, fontFamily: C.FM }}>{score} correct</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, lineHeight: 1.5, marginBottom: 14 }}>{cur.q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cur.opts.map((label, idx) => {
              let bg = 'rgba(255,255,255,0.03)', bd = C.b2, col = C.t1, mark = '';
              if (pick !== null) {
                if (idx === cur.correct) { bg = 'rgba(16,185,129,0.14)'; bd = 'rgba(16,185,129,0.5)'; col = C.greenL; mark = '✓'; }
                else if (idx === pick) { bg = 'rgba(244,63,94,0.14)'; bd = 'rgba(244,63,94,0.5)'; col = C.roseL; mark = '✗'; }
                else col = C.t3;
              }
              return (
                <button key={label} onClick={() => choose(idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 11, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: pick === null ? 'pointer' : 'default', transition: 'all .18s', background: bg, border: `1px solid ${bd}`, color: col }}>
                  <span>{label}</span><span style={{ fontWeight: 800 }}>{mark}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 16, textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: passed ? 'rgba(16,185,129,0.14)' : 'rgba(244,63,94,0.14)', border: `1px solid ${passed ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)'}`, color: passed ? C.greenL : C.roseL }}>
            <Check size={26} strokeWidth={2.6} />
          </div>
          <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 22, color: C.t1 }}>{passed ? 'Verified!' : 'Not quite yet'}</div>
          <div style={{ fontFamily: C.FM, fontSize: 15, color: passed ? C.greenL : C.roseL, marginTop: 4, fontWeight: 700 }}>{score} / {QUIZ_QUESTIONS.length} · {pct}%</div>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 8, lineHeight: 1.5, maxWidth: '34ch', margin: '8px auto 0' }}>
            {passed ? 'You cleared the 70% bar — this lesson now counts as verified toward your pathway.' : 'You need 70% to verify. Review the article and give it another shot.'}
          </div>
          <button onClick={startQuiz} className="lp-btn-secondary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b2}`, color: C.t1, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Retake quiz
          </button>
        </div>
      )}
    </div>
  );
}

const FLASHCARDS = [
  { q: 'What organelle is responsible for ATP production in a eukaryotic cell?', a: 'The mitochondrion — its inner-membrane electron transport chain drives ATP synthase.' },
  { q: 'Which organelle packages and ships proteins for secretion?', a: 'The Golgi apparatus — it modifies, sorts, and packages proteins into vesicles.' },
  { q: 'Where does protein synthesis actually occur in the cell?', a: 'On ribosomes — free in the cytosol or bound to the rough endoplasmic reticulum.' },
  { q: 'What controls what enters and leaves the cell?', a: 'The plasma membrane — a selectively permeable phospholipid bilayer.' },
  { q: "Which organelle holds the cell's genetic material?", a: 'The nucleus — it houses the DNA and directs gene expression.' },
  { q: 'Where does photosynthesis take place in a plant cell?', a: 'The chloroplast — it captures light energy to build glucose.' },
];

function FlashcardsMock() {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [due, setDue] = useState(14);
  const [note, setNote] = useState('FSRS-scheduled · next review in 4 days if "Good"');

  const rate = (label, interval) => {
    setI((n) => (n + 1) % FLASHCARDS.length);
    setFlip(false);
    setDue((d) => Math.max(0, d - 1));
    setNote(`Rated "${label}" · next review in ${interval}`);
  };

  return (
    <div style={glass({ padding: 20, borderRadius: 20 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.amber}16`, border: `1px solid ${C.amber}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} color={C.amberL} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>Cell Biology Deck</div>
        </div>
        <span style={pill('rgba(139,92,246,0.14)', C.violetL, { fontSize: 10 })}>{due} due today</span>
      </div>
      <button
        onClick={() => setFlip((f) => !f)}
        style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 15, background: `linear-gradient(135deg,${C.violet}18,rgba(15,24,40,0.5))`, borderWidth: 1, borderStyle: 'solid', borderColor: `${C.violet}30`, padding: '26px 20px', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${C.violet}22,transparent 70%)` }} />
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.violetL, marginBottom: 12, position: 'relative' }}>{flip ? 'Back' : 'Front'} · Card {i + 1} of {FLASHCARDS.length}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.t1, lineHeight: 1.5, position: 'relative', minHeight: 48 }}>{flip ? FLASHCARDS[i].a : FLASHCARDS[i].q}</div>
        <div style={{ marginTop: 14, fontSize: 10.5, color: C.t3, position: 'relative' }}>{flip ? 'Tap to flip back' : 'Tap to reveal the answer'}</div>
      </button>
      <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
        {[['Again', C.rose, C.roseL, '< 10 min'], ['Hard', C.amber, C.amberL, '2 days'], ['Good', C.green, C.greenL, '4 days'], ['Easy', C.blue, C.blueL, '9 days']].map(([label, base, lite, interval]) => (
          <button key={label} onClick={() => rate(label, interval)} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, border: `1px solid ${base}30`, background: `${base}10`, color: lite, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <div style={{ marginTop: 13, fontSize: 10.5, color: C.t3, textAlign: 'center', fontFamily: C.FM }}>{note}</div>
    </div>
  );
}

// ── Medabrain live chat demo — autoplays a script, then hands control to
//    whatever the visitor actually types (matched against a small keyword bank).
const AUTO_SCRIPT = [
  { q: "What's high-yield for SAT Math I'm probably missing?", a: 'Start with systems of equations and linear functions — they show up on nearly every test and are the fastest points to lock in. Want a 2-week plan built around that?' },
  { q: 'Build my ACT Science plan', a: 'ACT Science is really a reading-speed test. Two weeks: days 1–4 drill data representation for pace, 5–8 conflicting viewpoints, 9–12 timed full sections, last two review your misses. I can drop this onto your calendar.' },
  { q: 'Explain photosynthesis simply', a: 'Picture the plant as a solar-powered kitchen: chloroplasts catch light, split water for electrons, then the Calvin cycle spends that energy turning CO₂ into glucose. Light makes the fuel; the cycle builds the sugar.' },
];
const COACH_PRESETS = ['Explain photosynthesis simply', 'Build my ACT Science plan', 'What should I study tonight?', 'How do I log clinical hours?'];
const ANSWER_BANK = [
  { kw: ['photosynth'], a: 'Picture the plant as a solar-powered kitchen: chloroplasts catch light, split water for electrons, then the Calvin cycle spends that energy turning CO₂ into glucose. Light makes the fuel; the cycle builds the sugar.' },
  { kw: ['act science', 'act'], a: 'ACT Science is really a reading-speed test. Two weeks: days 1–4 drill data representation for pace, 5–8 conflicting viewpoints, 9–12 timed full sections, last two review your misses. I can add this to your schedule.' },
  { kw: ['sat math', 'math', 'sat'], a: 'Start with systems of equations and linear functions — they show up on nearly every test and are the fastest points to lock in. Want a 2-week plan built around that?' },
  { kw: ['clinical', 'hours', 'shadow'], a: "Open Portfolio → Activities & Résumé and pick Clinical Hours, tap Log Hours, and add the date, site, and a one-line reflection. Add a supervisor's contact and the entry can be marked verified instead of self-reported." },
  { kw: ['tonight', 'study', 'today'], a: "With your 12-day streak going, I'd do 15 minutes of due flashcards first, then one Organic Chemistry lesson and its verification quiz. That keeps your pathway mastery climbing without burning you out." },
  { kw: ['plan', 'schedule', 'week'], a: "Here's a simple frame: pick the one section that's costing you the most points, block 30 minutes a day on it for two weeks, and end each week with a timed check. Want me to build it around a specific test?" },
  { kw: ['nursing', 'pathway', 'career', 'fit'], a: 'Take the pathway diagnostic first — it scores you across all ten health careers in about six minutes. Nursing, PA, and pharmacy are common strong matches for students who love patient contact but want a faster route than MD.' },
];
function answerFor(text) {
  const q = text.toLowerCase();
  const hit = ANSWER_BANK.find((b) => b.kw.some((k) => q.includes(k)));
  return hit ? hit.a : "Good question. Here's the short version: break it into the smallest next step, do that one thing today, and I'll keep track of the rest. Want me to turn it into a 2-week plan?";
}
const STREAM_MS = 42;

function CoachMock() {
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [showSug, setShowSug] = useState(false);
  const autoOnRef = useRef(true);
  const timersRef = useRef([]);
  const streamRef = useRef(null);

  const after = (ms, fn) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  const stopStream = () => { if (streamRef.current) { clearInterval(streamRef.current); streamRef.current = null; } };

  const stream = (full, done) => {
    const words = full.split(' ');
    let n = 0;
    stopStream();
    streamRef.current = setInterval(() => {
      n++;
      const text = words.slice(0, n).join(' ');
      setMsgs((m) => { const copy = m.slice(); if (copy.length) copy[copy.length - 1] = { role: 'ai', text }; return copy; });
      if (n >= words.length) { stopStream(); if (done) done(); }
    }, STREAM_MS);
  };

  const autoStep = (i) => {
    if (!autoOnRef.current) return;
    const ex = AUTO_SCRIPT[i % AUTO_SCRIPT.length];
    stopStream();
    setMsgs([{ role: 'user', text: ex.q }]);
    setTyping(true);
    setShowSug(false);
    after(1000, () => {
      if (!autoOnRef.current) return;
      setTyping(false);
      setMsgs((m) => [...m, { role: 'ai', text: '' }]);
      stream(ex.a, () => {
        setShowSug(true);
        after(4400, () => { if (autoOnRef.current) autoStep(i + 1); });
      });
    });
  };

  useEffect(() => {
    after(700, () => autoStep(0));
    return () => { autoOnRef.current = false; timersRef.current.forEach(clearTimeout); timersRef.current = []; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (text) => {
    text = (text || '').trim();
    if (!text) return;
    autoOnRef.current = false;
    stopStream();
    setInput('');
    setShowSug(false);
    setTyping(true);
    setMsgs((m) => [...m, { role: 'user', text }]);
    const a = answerFor(text);
    after(820, () => {
      setTyping(false);
      setMsgs((m) => [...m, { role: 'ai', text: '' }]);
      stream(a, () => setShowSug(true));
    });
  };

  return (
    <div style={glass({ padding: 20, borderRadius: 20 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.violet}18`, border: `1px solid ${C.violet}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={14} color={C.violetL} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>Medabrain</div>
          <div style={{ fontSize: 9, color: C.t3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
            Online · free, unlimited
          </div>
        </div>
      </div>
      <div style={{ minHeight: 148, display: 'flex', flexDirection: 'column', gap: 11, justifyContent: 'flex-end' }}>
        {msgs.map((m, idx) => {
          const user = m.role === 'user';
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start' }}>
              <div style={user
                ? { maxWidth: '82%', borderRadius: '13px 13px 3px 13px', background: C.s3, padding: '10px 14px', fontSize: 12.5, color: C.t1, lineHeight: 1.55 }
                : { maxWidth: '88%', borderRadius: '13px 13px 13px 3px', background: `${C.violet}10`, border: `1px solid ${C.violet}25`, padding: '10px 14px', fontSize: 12.5, color: C.t1, lineHeight: 1.6 }}>
                {m.text}
              </div>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ borderRadius: '13px 13px 13px 3px', background: `${C.violet}10`, border: `1px solid ${C.violet}25`, padding: '12px 15px', display: 'flex', gap: 4 }}>
              <span className="lp-typing-dot" style={{ animationDelay: '0s' }} />
              <span className="lp-typing-dot" style={{ animationDelay: '.2s' }} />
              <span className="lp-typing-dot" style={{ animationDelay: '.4s' }} />
            </div>
          </div>
        )}
      </div>
      {showSug && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
          {COACH_PRESETS.map((label) => (
            <button key={label} onClick={() => send(label)} className="lp-btn-secondary" style={{ borderRadius: 999, border: `1px solid ${C.b2}`, background: 'rgba(255,255,255,0.02)', color: C.t2, padding: '7px 13px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, borderRadius: 14, border: `1px solid ${C.b2}`, background: 'rgba(255,255,255,0.02)', padding: '6px 6px 6px 14px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
          placeholder="Ask Medabrain anything…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.t1, fontSize: 13, fontFamily: 'inherit', minWidth: 0 }}
        />
        <button onClick={() => send(input)} aria-label="Send" style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={15} style={{ transform: 'rotate(-45deg)' }} />
        </button>
      </div>
    </div>
  );
}

// ── College-list scorer — live re-tiering as you drag GPA/SAT ─────────────
const SCHOOLS = [
  { name: 'Johns Hopkins University', g: 3.96, s: 1520 },
  { name: 'Case Western Reserve', g: 3.86, s: 1450 },
  { name: 'Ohio State University', g: 3.7, s: 1350 },
  { name: 'University of Cincinnati', g: 3.4, s: 1250 },
];
function tierOf(fit) {
  if (fit >= 80) return ['Likely', C.green, C.greenL];
  if (fit >= 60) return ['Target', C.blue, C.blueL];
  if (fit >= 38) return ['Reach', C.amber, C.amberL];
  return ['Stretch', C.rose, C.roseL];
}

function CollegeListMock() {
  const [gpa, setGpa] = useState(3.8);
  const [sat, setSat] = useState(1380);

  const rows = SCHOOLS.map((sc) => {
    let fit = 50 + (gpa - sc.g) * 42 + (sat - sc.s) / 8;
    fit = Math.max(4, Math.min(99, Math.round(fit)));
    const [tier, base, lite] = tierOf(fit);
    return { ...sc, fit, tier, base, lite };
  });

  return (
    <div style={glass({ padding: 20, borderRadius: 20 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.sky}16`, border: `1px solid ${C.sky}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={15} color={C.skyL} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>My College List</div>
        </div>
        <span style={pill(`${C.sky}16`, C.skyL, { fontSize: 10 })}>Scored to your stats</span>
      </div>
      {rows.map(({ name, fit, tier, base, lite }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.b1}`, marginBottom: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: base, boxShadow: `0 0 8px ${base}90`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ marginTop: 5, maxWidth: 150 }}><Bar pct={fit} color={base} h={3} /></div>
          </div>
          <span style={pill(`${base}1f`, lite, { fontSize: 9.5, flexShrink: 0 })}>{tier}</span>
          <span className="lp-hide-narrow" style={{ fontFamily: C.FM, fontSize: 11, fontWeight: 700, color: lite, flexShrink: 0 }}>{fit}%</span>
        </div>
      ))}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 6 }}><span>GPA</span><span style={{ fontFamily: C.FM, color: C.blueL }}>{gpa.toFixed(2)}</span></div>
          <input type="range" min="2.5" max="4" step="0.01" value={gpa} onChange={(e) => setGpa(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 6 }}><span>SAT</span><span style={{ fontFamily: C.FM, color: C.blueL }}>{sat}</span></div>
          <input type="range" min="1000" max="1600" step="10" value={sat} onChange={(e) => setSat(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: C.t3, textAlign: 'center', marginTop: 12 }}>Drag the sliders — tiers recompute against your stats.</div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────

const PATHWAYS = [
  { color: C.blue, lite: C.blueL, tag: 'MD', title: 'Physician', desc: 'Direct patient care, years of rigorous science.' },
  { color: C.green, lite: C.greenL, tag: 'RN', title: 'Nursing', desc: 'Hands-on care, a faster path, huge range of specialties.' },
  { color: C.violet, lite: C.violetL, tag: 'PA', title: 'Physician Assistant', desc: 'Broad clinical practice with more flexibility.' },
  { color: C.cyan, lite: C.cyanL, tag: 'Rx', title: 'Pharmacy', desc: 'Medication expertise at the center of every plan.' },
  { color: C.amber, lite: C.amberL, tag: 'DDS', title: 'Dentistry', desc: 'Surgical precision and your own practice, sooner.' },
  { color: C.rose, lite: C.roseL, tag: 'PhD', title: 'Biomedical Research', desc: 'Push the science forward, not just apply it.' },
  { color: C.sky, lite: C.skyL, tag: 'PT', title: 'Physical & Occupational Therapy', desc: 'Rebuild movement and independence, patient by patient.' },
  { color: C.indigo, lite: C.indigoL, tag: 'MPH', title: 'Public Health', desc: 'Prevent disease at population scale.' },
  { color: C.pink, lite: C.pinkL, tag: 'MHA', title: 'Health Administration', desc: 'Run the systems that make medicine work.' },
  { color: '#94a3c0', lite: '#cbd5e1', tag: '?', title: 'Exploring', desc: 'Not sure yet? Start here — no pathway required.' },
];

const PORTFOLIO_TOOLS = [
  { color: C.sky, lite: C.skyL, icon: GraduationCap, title: 'College List', desc: 'Schools tiered Likely / Target / Reach / Stretch against your GPA, scores, and hours.' },
  { color: C.violet, lite: C.violetL, icon: FileText, title: 'Essays', desc: 'A dedicated workspace for every supplement, from first draft to final.' },
  { color: C.rose, lite: C.roseL, icon: Calendar, title: 'Milestones', desc: "Your deadlines and your whole class-year calendar in one countdown, so nothing slips past you." },
  { color: C.green, lite: C.greenL, icon: ShieldCheck, title: 'Financial Aid', desc: 'Track aid, scholarships, and what each school will really cost.' },
  { color: C.amber, lite: C.amberL, icon: ClipboardList, title: 'Activities & Resume', desc: 'Four years of activities, turned into an application-ready resume.' },
  { color: C.cyan, lite: C.cyanL, icon: Search, title: 'Research', desc: 'Log research experience the way admissions committees actually read it.' },
  { color: C.blue, lite: C.blueL, icon: Layers, title: 'Skills & Certifications', desc: 'Certifications and skills, tracked and ready to cite on any application.' },
  { color: C.green, lite: C.greenL, icon: Zap, title: 'Clinical Hours', desc: 'Log shadowing and clinical hours the moment you earn them.' },
  { color: C.indigo, lite: C.indigoL, icon: MessageCircle, title: 'Recommenders', desc: "Manage who's writing for you, and when each letter is due." },
  { color: C.pink, lite: C.pinkL, icon: Sparkles, title: 'Interview Prep', desc: 'Real MMI and CASPer-style scenarios — not generic interview questions.' },
  { color: C.amber, lite: C.amberL, icon: TrendingUp, title: 'Test Scores', desc: 'Track every SAT/ACT attempt and watch your trajectory over time.' },
  { color: C.cyan, lite: C.cyanL, icon: LineChart, title: 'Admissions Calculator', desc: 'A real-time estimate of where you stand for each school on your list.' },
];

const FAQS = [
  { q: 'What is MedSchoolPrep?', a: 'A free platform for high schoolers exploring a career in medicine. It combines a pathway diagnostic, verified lessons, spaced-repetition flashcards, an AI study coach, and a full college-application portfolio — everything from "which path fits me" to "what\'s due this week."' },
  { q: 'How does the pathway diagnostic work?', a: "A short, scored quiz ranks how well you fit all 10 health-career pathways — Physician, Nursing, PA, Pharmacy, Dentistry, and more — instead of assuming you've already decided. You get a top match plus a full breakdown, and you can always explore any of the other nine." },
  { q: 'Is it really free?', a: 'Yes — no paywall, no premium tier, nothing locked behind a subscription. Every pathway, lesson, flashcard deck, portfolio tool, and AI coach response is free to use, for good. Ads are what pay for it, and because our users are students, they are never personalised: we do not build advertising profiles and nothing you put into the app is used to target them.' },
  { q: 'What do you do with my data?', a: "We don't sell it and we don't share it for advertising. Your essays, scores, activities, and coach conversations are used to run the features you're using and nothing else — they are never used to train AI models. You can export or delete everything at any time. The Privacy Policy spells all of this out, including every third party that touches your data." },
  { q: 'What does "verified" mean for a lesson?', a: "Every lesson ends with a real quiz. You need to score 70% or higher for it to count as verified — watching the article or video alone doesn't mark a lesson complete. It's the same bar used for pathway certificates." },
  { q: 'Do I need to already know I want to be a doctor?', a: 'No — that\'s exactly what the "Exploring" pathway and the diagnostic are for. Plenty of students start here undecided and get matched to nursing, PA, pharmacy, or something they hadn\'t considered.' },
  { q: 'Does it only cover becoming a physician?', a: 'No. Alongside Physician, there are full lesson tracks, quizzes, and application guidance for Nursing, Physician Assistant, Pharmacy, Dentistry, Biomedical & Clinical Research, Physical & Occupational Therapy, Public Health, and Health Administration.' },
];

const MARQUEE_ITEMS = ['10 career pathways', '90+ verified lessons', 'Spaced-repetition flashcards', 'Medabrain AI coach', 'College list scored to your stats', 'MMI & CASPer interview prep', 'Free — nothing paywalled'];

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted, onLogin, onOpenLegal }) {
  const handleSignIn = onLogin || onGetStarted;
  // The footer links have to work whether or not AuthGate handed us a client-side
  // navigator — a legal link that does nothing when clicked is worse than no link.
  const goLegal = (path) => (e) => {
    if (!onOpenLegal) return; // let the href do a normal navigation
    e.preventDefault();
    onOpenLegal(path);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('msp-landing-active');
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.body.classList.remove('msp-landing-active');
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    };
  }, []);

  // Scroll-reveal: every `.lp-reveal` slides/fades in the first time it enters
  // the viewport. Falls back to visible-immediately when IO is unavailable.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.lp-reveal');
    if (!els?.length) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('lp-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('lp-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const navLinks = [['#pathways', 'Pathways'], ['#learn', 'Prep'], ['#portfolio', 'Portfolio'], ['#faq', 'FAQ']];

  return (
    <div ref={rootRef} style={{ position: 'relative', minHeight: 'var(--msp-vh)', overflowX: 'hidden', color: C.t1, fontFamily: C.FB }}>
      <style>{`
        .lp * { box-sizing: border-box; }
        .lp a { color: inherit; text-decoration: none; }

        /* ── Layout primitives ─────────────────────────────────────────── */
        .lp-sec { width: 100%; max-width: 1560px; margin: 0 auto; padding-left: clamp(20px, 4.5vw, 64px); padding-right: clamp(20px, 4.5vw, 64px); }

        /* ── Hero: immersive two-column on desktop, stacked on mobile ──── */
        .lp-hero-grid { display: grid; grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.12fr); gap: clamp(36px, 4vw, 72px); align-items: center; min-height: calc(var(--msp-vh) - 66px); padding-top: clamp(28px, 4vh, 56px); padding-bottom: clamp(40px, 6vh, 72px); }
        .lp-hero-copy { text-align: left; }
        .lp-hero-visual { position: relative; }
        .lp-replica-frame { transform: perspective(1600px) rotateY(-5deg) rotateX(1.5deg); transition: transform .6s cubic-bezier(.16,1,.3,1); }
        .lp-hero-visual:hover .lp-replica-frame { transform: perspective(1600px) rotateY(0deg) rotateX(0deg); }
        @media (max-width: 1080px) {
          .lp-hero-grid { grid-template-columns: 1fr; min-height: 0; gap: 44px; padding-top: clamp(40px, 8vw, 64px); }
          .lp-hero-copy { text-align: center; }
          .lp-hero-copy .lp-hero-ctas, .lp-hero-copy .lp-hero-badge { justify-content: center; }
          .lp-hero-copy .lp-hero-sub { margin-left: auto; margin-right: auto; }
          .lp-replica-frame { transform: none; max-width: 760px; margin: 0 auto; }
        }
        @media (max-width: 720px) { .lp-replica-side { display: none !important; } }
        @media (max-width: 480px) {
          .lp-replica-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-hide-narrow { display: none !important; }
        }

        /* ── Nav ───────────────────────────────────────────────────────── */
        .lp-nav-links { display: flex; align-items: center; gap: clamp(18px, 2.4vw, 34px); }
        .lp-nav-burger { display: none; align-items: center; justify-content: center; }
        @media (max-width: 860px) {
          .lp-nav-links, .lp-nav-login { display: none; }
          .lp-nav-burger { display: inline-flex; }
        }
        .lp-nav-link { position: relative; color: ${C.t2}; font-size: 13.5px; font-weight: 600; transition: color .15s; }
        .lp-nav-link::after { content: ""; position: absolute; left: 0; bottom: -5px; width: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg,${C.blue},${C.cyan}); transition: width .25s ease; }
        .lp-nav-link:hover { color: ${C.t1}; }
        .lp-nav-link:hover::after { width: 100%; }

        /* ── Feature rows ──────────────────────────────────────────────── */
        .lp-feature { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(36px, 5vw, 88px); align-items: center; }
        .lp-feature > .lp-feat-visual { min-width: 0; }
        @media (max-width: 920px) {
          .lp-feature { grid-template-columns: 1fr; gap: 32px; }
          .lp-feature > .lp-feat-visual { order: 2; }
          .lp-feature > .lp-feat-copy { order: 1; }
        }

        /* ── Grids ─────────────────────────────────────────────────────── */
        .lp-pathway-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        @media (max-width: 1280px) { .lp-pathway-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 1000px) { .lp-pathway-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px) { .lp-pathway-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px) { .lp-pathway-grid { grid-template-columns: 1fr; } }
        .lp-tools-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 1180px) { .lp-tools-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 820px) { .lp-tools-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .lp-tools-grid { grid-template-columns: 1fr; } }
        .lp-manifesto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 920px) { .lp-manifesto-grid { grid-template-columns: 1fr; } }
        .lp-foot-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 40px; }
        @media (max-width: 720px) { .lp-foot-grid { grid-template-columns: 1fr; gap: 28px; } }

        /* ── Cards & hovers ────────────────────────────────────────────── */
        .lp-card-hover { transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .3s, box-shadow .3s, background .3s; }
        .lp-card-hover:hover { transform: translateY(-5px); border-color: ${C.b3}; background: rgba(255,255,255,0.045); box-shadow: 0 22px 50px -26px rgba(45,127,255,0.55), 0 2px 12px rgba(0,0,0,0.4); }
        .lp-btn-primary { position: relative; overflow: hidden; transition: transform .2s cubic-bezier(.16,1,.3,1), filter .2s, box-shadow .2s; }
        .lp-btn-primary::after { content: ""; position: absolute; top: 0; left: -120%; width: 60%; height: 100%; background: linear-gradient(100deg,transparent,rgba(255,255,255,0.28),transparent); transform: skewX(-18deg); transition: left .6s ease; pointer-events: none; }
        .lp-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .lp-btn-primary:hover::after { left: 130%; }
        .lp-btn-primary:active { transform: translateY(0); }
        .lp-btn-secondary { transition: background .2s, border-color .2s; }
        .lp-btn-secondary:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.2) !important; }

        /* ── Scroll reveal ─────────────────────────────────────────────── */
        .lp-reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .lp-reveal.lp-in { opacity: 1; transform: none; }
        .lp-d1 { transition-delay: .08s; } .lp-d2 { transition-delay: .16s; } .lp-d3 { transition-delay: .24s; }

        /* ── Hero entrance ─────────────────────────────────────────────── */
        @keyframes lp-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes lp-visual-in { from { opacity: 0; transform: perspective(1600px) rotateY(-5deg) rotateX(1.5deg) translateY(36px) scale(.97); } to { opacity: 1; } }
        .lp-hero-anim { opacity: 0; animation: lp-rise .8s cubic-bezier(.16,1,.3,1) forwards; }
        .lp-ha1 { animation-delay: .05s; } .lp-ha2 { animation-delay: .15s; } .lp-ha3 { animation-delay: .25s; } .lp-ha4 { animation-delay: .35s; } .lp-ha5 { animation-delay: .45s; }
        .lp-hero-visual { opacity: 0; animation: lp-rise .9s cubic-bezier(.16,1,.3,1) .3s forwards; }

        /* ── Atmosphere ────────────────────────────────────────────────── */
        @keyframes lp-orb-drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px, 24px) scale(1.08); } }
        .lp-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; animation: lp-orb-drift 14s ease-in-out infinite; }
        @keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lp-typing-dot { 0%,80%,100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-4px); opacity: 1; } }
        .lp-typing-dot { width: 6px; height: 6px; border-radius: 50%; background: ${C.violetL}; animation: lp-typing-dot 1.2s infinite; display: inline-block; }
        @media (prefers-reduced-motion: reduce) {
          .lp-reveal, .lp-hero-anim, .lp-hero-visual { opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }
          .lp-orb { animation: none !important; }
        }

        /* ── FAQ ───────────────────────────────────────────────────────── */
        .lp-faq { border-radius: 14px; border: 1px solid ${C.b1}; background: rgba(255,255,255,0.025); transition: border-color .2s, background .2s; }
        .lp-faq[open] { border-color: rgba(45,127,255,0.3); background: rgba(45,127,255,0.04); }
        .lp-faq summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 20px; font-weight: 700; font-size: 15.5px; color: ${C.t1}; }
        .lp-faq summary::-webkit-details-marker { display: none; }
        .lp-faq .lp-faq-x { flex-shrink: 0; width: 24px; height: 24px; border-radius: 8px; border: 1px solid ${C.b2}; display: inline-flex; align-items: center; justify-content: center; color: ${C.t2}; font-size: 14px; transition: transform .25s, color .2s, border-color .2s; }
        .lp-faq[open] .lp-faq-x { transform: rotate(45deg); color: ${C.blueL}; border-color: rgba(45,127,255,0.4); }

        /* ── Mobile menu ───────────────────────────────────────────────── */
        .lp-mobile-menu { position: fixed; inset: 66px 0 auto 0; z-index: 49; background: rgba(4,6,11,0.97); backdrop-filter: blur(20px); border-bottom: 1px solid ${C.b2}; padding: 10px 20px 22px; display: flex; flex-direction: column; gap: 2px; animation: lp-rise .25s ease forwards; }
        .lp-mobile-menu a, .lp-mobile-menu button { display: block; width: 100%; text-align: left; padding: 13px 10px; border-radius: 10px; font-size: 15px; font-weight: 600; color: ${C.t2}; background: none; border: none; cursor: pointer; font-family: inherit; }
        .lp-mobile-menu a:active, .lp-mobile-menu a:hover { background: rgba(255,255,255,0.05); color: ${C.t1}; }

        /* ── Range sliders (college-list scorer) — scoped to this page ──── */
        .lp input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; border-radius: 5px; background: ${C.s3}; outline: none; }
        .lp input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${C.blueL}; box-shadow: 0 0 10px rgba(45,127,255,0.7); cursor: pointer; border: 2px solid ${C.bg}; }
        .lp input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${C.blueL}; box-shadow: 0 0 10px rgba(45,127,255,0.7); cursor: pointer; border: 2px solid ${C.bg}; }
      `}</style>

      {/* Atmosphere — layered aurora glows so the page breathes edge-to-edge
          instead of floating content on a flat black slab. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="lp-orb" style={{ top: '-12%', right: '-8%', width: 'min(760px,70vw)', height: 'min(760px,70vw)', background: 'radial-gradient(circle,rgba(45,127,255,0.16),transparent 65%)' }} />
        <div className="lp-orb" style={{ top: '4%', left: '-14%', width: 'min(560px,60vw)', height: 'min(560px,60vw)', background: 'radial-gradient(circle,rgba(139,92,246,0.11),transparent 65%)', animationDelay: '-5s' }} />
        <div className="lp-orb" style={{ top: '46%', right: '-12%', width: 'min(620px,60vw)', height: 'min(620px,60vw)', background: 'radial-gradient(circle,rgba(6,182,212,0.09),transparent 65%)', animationDelay: '-9s' }} />
        <div className="lp-orb" style={{ bottom: '-8%', left: '-8%', width: 'min(600px,60vw)', height: 'min(600px,60vw)', background: 'radial-gradient(circle,rgba(45,127,255,0.1),transparent 65%)', animationDelay: '-3s' }} />
      </div>

      <div className="lp" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.b1}`, background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
          <div className="lp-sec" style={{ height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} onClick={() => setMenuOpen(false)}>
              <AnimatedLogo size={34} variant="hover" glow={false} />
              <span style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 16.5, letterSpacing: '-0.01em', color: C.t1 }}>MedSchoolPrep</span>
            </a>
            <div className="lp-nav-links">
              {navLinks.map(([href, label]) => <a key={href} className="lp-nav-link" href={href}>{label}</a>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button className="lp-nav-login" onClick={handleSignIn} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: C.t2, fontFamily: 'inherit' }}>Log in</button>
              <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: C.blueGrad, color: '#fff', fontSize: 13.5, fontWeight: 700, boxShadow: '0 0 0 1px rgba(45,127,255,0.3),0 10px 26px -12px rgba(45,127,255,0.8)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free
                <ArrowRight size={14} />
              </button>
              <button className="lp-nav-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(v => !v)} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.b2}`, background: 'rgba(255,255,255,0.03)', color: C.t1, cursor: 'pointer' }}>
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </nav>
        {menuOpen && (
          <div className="lp-mobile-menu">
            {navLinks.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <button onClick={() => { setMenuOpen(false); handleSignIn(); }}>Log in</button>
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <header id="top" className="lp-sec">
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-hero-anim lp-ha1 lp-hero-badge" style={{ display: 'flex' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, borderRadius: 999, border: `1px solid ${C.b2}`, background: 'rgba(255,255,255,0.03)', padding: '7px 16px 7px 8px', fontSize: 12.5, fontWeight: 600, color: C.t2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, background: 'rgba(45,127,255,0.15)', color: C.blueL, padding: '4px 10px', fontSize: 11, letterSpacing: '0.02em', fontWeight: 700 }}>
                    <ShieldCheck size={11} />
                    100% free
                  </span>
                  No paywall · No personalised ads · Built for high schoolers
                </span>
              </div>

              <h1 className="lp-hero-anim lp-ha2" style={{ margin: '24px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, fontSize: 'clamp(40px,4.8vw,74px)', color: C.t1, textWrap: 'balance' }}>
                Find your path into medicine.
                <br />
                <span style={{ backgroundImage: 'linear-gradient(120deg,#5da0ff 0%,#22d3ee 55%,#a78bfa 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Then actually walk it.</span>
              </h1>

              <p className="lp-hero-anim lp-ha3 lp-hero-sub" style={{ margin: '22px 0 0', maxWidth: '54ch', fontSize: 'clamp(16px,1.35vw,18.5px)', lineHeight: 1.65, color: C.t2 }}>
                MedSchoolPrep figures out which health career actually fits you — Physician, Nursing, PA, and seven more — then hands you verified lessons, spaced-repetition flashcards, an AI study coach, and the entire application portfolio to get there.
              </p>

              <div className="lp-hero-anim lp-ha4 lp-hero-ctas" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 14, background: C.blueGrad, color: '#fff', fontSize: 15.5, fontWeight: 700, boxShadow: '0 0 0 1px rgba(45,127,255,0.3),0 18px 44px -16px rgba(45,127,255,0.9)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Get started free
                  <ArrowRight size={16} />
                </button>
                <a className="lp-btn-secondary" href="#pathways" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 14, border: `1px solid ${C.b2}`, background: 'rgba(255,255,255,0.03)', color: C.t1, fontSize: 15.5, fontWeight: 700, cursor: 'pointer' }}>
                  See the 10 pathways
                </a>
              </div>
              <p className="lp-hero-anim lp-ha5" style={{ marginTop: 16, fontSize: 13, color: C.t3 }}>Free forever. Sign up in under a minute — just an email code and a password.</p>
            </div>

            <div className="lp-hero-visual">
              <div aria-hidden style={{ position: 'absolute', inset: '-12% -10%', background: 'radial-gradient(ellipse 60% 55% at 55% 45%,rgba(45,127,255,0.14),transparent 70%)', pointerEvents: 'none' }} />
              <AppReplica />
            </div>
          </div>
        </header>

        {/* ── MARQUEE ─────────────────────────────────────────────────── */}
        <div style={{ overflow: 'hidden', borderTop: `1px solid ${C.b1}`, borderBottom: `1px solid ${C.b1}`, padding: '18px 0', background: 'rgba(255,255,255,0.012)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)' }}>
          <div style={{ display: 'flex', width: 'max-content', gap: 44, whiteSpace: 'nowrap', fontSize: 14.5, fontWeight: 600, color: 'rgba(148,163,192,0.85)', animation: 'lp-marquee 38s linear infinite' }}>
            {[0, 1].map((i) => (
              <span key={i} aria-hidden={i === 1} style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
                {MARQUEE_ITEMS.map((t) => (
                  <React.Fragment key={t}>
                    <span>{t}</span>
                    <span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── PATHWAYS ────────────────────────────────────────────────── */}
        <section id="pathways" style={{ borderTop: `1px solid ${C.b1}`, borderBottom: `1px solid ${C.b1}`, background: 'linear-gradient(180deg,rgba(45,127,255,0.05),transparent 60%)' }}>
          <div className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
            <div className="lp-reveal" style={{ maxWidth: 720 }}>
              <Eyebrow color={C.blueL} glow={C.blue}>10 pathways</Eyebrow>
              <h2 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.07, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Not sure which health career fits? Find out first.</h2>
              <p style={{ marginTop: 16, fontSize: 16.5, lineHeight: 1.6, color: C.t2 }}>A short, scored diagnostic ranks how well you fit all ten health careers — instead of assuming you've already decided. Get a top match, a full breakdown, and the freedom to explore any of the other nine.</p>
            </div>

            <div className="lp-pathway-grid lp-reveal" style={{ marginTop: 48 }}>
              {PATHWAYS.map((p) => (
                <div key={p.title} className="lp-card-hover" style={{ borderRadius: 16, border: `1px solid ${C.b1}`, background: 'rgba(255,255,255,0.03)', padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, padding: '0 9px', borderRadius: 8, background: `${p.color}1c`, border: `1px solid ${p.color}45`, fontFamily: C.FM, fontWeight: 700, fontSize: 11 }}>
                    <span style={{ color: p.lite }}>{p.tag}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: C.FD, fontSize: 16, color: C.t1, marginTop: 12, letterSpacing: '-0.01em' }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: C.t2, marginTop: 6, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE: Learning pathway ───────────────────────────────── */}
        <section id="learn" className="lp-sec" style={{ paddingTop: 'clamp(72px,8vw,130px)', paddingBottom: 'clamp(48px,5vw,80px)' }}>
          <div className="lp-feature">
            <div className="lp-feat-copy lp-reveal">
              <FeaturePill bg="rgba(45,127,255,0.12)" color={C.blueL} icon={<Route size={13} />}>Learning pathway</FeaturePill>
              <h3 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Lessons that actually have to prove themselves.</h3>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: C.t2 }}>Every lesson pairs a written article with a topic-matched video, then locks the "done" checkmark behind a real verification quiz. Rewatching a video never counts as progress — passing at 70% does. <strong style={{ color: '#cbd7f0' }}>Try the quiz on the right.</strong></p>
              <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CheckLi color={C.blueL}>Article + video for every lesson, across all 10 pathways</CheckLi>
                <CheckLi color={C.blueL}>Pass a quiz at 70%+ to mark it verified, not just viewed</CheckLi>
                <CheckLi color={C.blueL}>Earn a certificate the moment you clear an entire pathway</CheckLi>
              </ul>
            </div>
            <div className="lp-feat-visual lp-reveal lp-d1"><LessonMock /></div>
          </div>
        </section>

        {/* ── FEATURE: Flashcards ─────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(48px,5vw,80px)', paddingBottom: 'clamp(48px,5vw,80px)' }}>
          <div className="lp-feature">
            <div className="lp-feat-visual lp-reveal lp-d1"><FlashcardsMock /></div>
            <div className="lp-feat-copy lp-reveal">
              <FeaturePill bg="rgba(139,92,246,0.12)" color={C.violetL} icon={<Layers size={13} />}>Flashcards</FeaturePill>
              <h3 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Turn your own notes into a study system.</h3>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: C.t2 }}>Paste your class notes and the engine extracts flashcards straight from what's actually in them — nothing invented, nothing hallucinated. Then spaced repetition takes over and schedules every review for you. <strong style={{ color: '#cbd7f0' }}>Flip the card and rate it.</strong></p>
              <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CheckLi color={C.violetL}>Cards are extracted from your notes, not generated from nowhere</CheckLi>
                <CheckLi color={C.violetL}>FSRS spaced repetition — the same engine behind Anki</CheckLi>
                <CheckLi color={C.violetL}>Runs fully offline, right in your browser — no upload, no wait</CheckLi>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FEATURE: AI coach ───────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(48px,5vw,80px)', paddingBottom: 'clamp(48px,5vw,80px)' }}>
          <div className="lp-feature">
            <div className="lp-feat-copy lp-reveal">
              <FeaturePill bg="rgba(139,92,246,0.12)" color={C.violetL} icon={<MessageCircle size={13} />}>Medabrain · AI coach</FeaturePill>
              <h3 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Stuck on a concept at 11pm? Ask Medabrain.</h3>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: C.t2 }}>Medabrain explains whatever's blocking you — a systems-of-equations problem, a shaky grasp of photosynthesis, an SAT section you keep missing — and builds you a study plan around it. Free, unlimited, no upsell. <strong style={{ color: '#cbd7f0' }}>Watch it work — or ask it something yourself.</strong></p>
              <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CheckLi color={C.violetL}>Explains any concept, at whatever level you're actually at</CheckLi>
                <CheckLi color={C.violetL}>Builds a study schedule for the section you're behind on</CheckLi>
                <CheckLi color={C.violetL}>Free with every response — no limits, no premium tier</CheckLi>
              </ul>
            </div>
            <div className="lp-feat-visual lp-reveal lp-d1"><CoachMock /></div>
          </div>
        </section>

        {/* ── FEATURE: College-list scorer ─────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(48px,5vw,80px)', paddingBottom: 'clamp(72px,8vw,130px)' }}>
          <div className="lp-feature">
            <div className="lp-feat-visual lp-reveal lp-d1"><CollegeListMock /></div>
            <div className="lp-feat-copy lp-reveal">
              <FeaturePill bg="rgba(14,165,233,0.12)" color={C.skyL} icon={<GraduationCap size={13} />}>Portfolio</FeaturePill>
              <h3 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>A college list scored to your actual stats.</h3>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: C.t2 }}>Add schools and MedSchoolPrep tiers each one Likely / Target / Reach / Stretch against your GPA, test scores, and hours — and re-scores the moment any of them change. <strong style={{ color: '#cbd7f0' }}>Move the sliders and watch it re-tier.</strong></p>
              <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CheckLi color={C.skyL}>Every school tiered against your real numbers</CheckLi>
                <CheckLi color={C.skyL}>Tiers recompute as your GPA and scores grow</CheckLi>
                <CheckLi color={C.skyL}>Part of a full portfolio — essays, deadlines, aid, and more</CheckLi>
              </ul>
            </div>
          </div>
        </section>

        {/* ── PORTFOLIO ───────────────────────────────────────────────── */}
        <section id="portfolio" style={{ borderTop: `1px solid ${C.b1}`, background: 'rgba(255,255,255,0.015)' }}>
          <div className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
            <div className="lp-reveal" style={{ maxWidth: 720 }}>
              <Eyebrow color={C.skyL} glow={C.sky}>The portfolio</Eyebrow>
              <h2 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Everything your application needs, in one place.</h2>
              <p style={{ marginTop: 16, fontSize: 16.5, lineHeight: 1.6, color: C.t2 }}>From your college list to your final essays — the entire application, tracked and scored as you go. Twelve tools that talk to each other, so nothing slips through the cracks.</p>
            </div>

            <div className="lp-tools-grid lp-reveal" style={{ marginTop: 44 }}>
              {PORTFOLIO_TOOLS.map((t) => (
                <div key={t.title} className="lp-card-hover" style={glass({ padding: 20, borderRadius: 16 })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}16`, border: `1px solid ${t.color}30`, color: t.lite, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <t.icon size={16} />
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: C.t1 }}>{t.title}</span>
                  </div>
                  <p style={{ marginTop: 11, fontSize: 12.5, lineHeight: 1.6, color: C.t2 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY FREE ────────────────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
          <div className="lp-reveal" style={{ maxWidth: 720 }}>
            <Eyebrow color={C.greenL} glow={C.green}>Why free</Eyebrow>
            <h2 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Built for students, not for a paywall.</h2>
          </div>
          <div className="lp-manifesto-grid lp-reveal lp-d1" style={{ marginTop: 44 }}>
            {[
              [C.greenL, '100%', 'Free, always', 'Every pathway, lesson, flashcard, portfolio tool, and coach response — no paywall, no premium tier, ever.'],
              [C.blueL, '0', 'Trackers, and profiles built on you', "We don't sell your data, run analytics on you, or personalise ads. Ads keep the app free; they're chosen by the page, never by a profile of you. Flashcards even run entirely on your own device."],
              [C.violetL, '9–12', 'Built for high schoolers', 'Designed for the years that actually shape an application — not repackaged college-prep material.'],
            ].map(([color, stat, title, body]) => (
              <div key={title} className="lp-card-hover" style={glass({ padding: 26, borderRadius: 18 })}>
                <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 34, color, letterSpacing: '-0.02em' }}>{stat}</div>
                <div style={{ fontFamily: C.FD, fontWeight: 700, fontSize: 17, color: C.t1, marginTop: 8 }}>{title}</div>
                <div style={{ fontSize: 13.5, color: C.t2, marginTop: 8, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section id="faq" style={{ borderTop: `1px solid ${C.b1}` }}>
          <div className="lp-sec" style={{ maxWidth: 900, paddingTop: 'clamp(64px,7vw,100px)', paddingBottom: 'clamp(64px,7vw,100px)' }}>
            <div className="lp-reveal" style={{ textAlign: 'center' }}>
              <Eyebrow color={C.blueL} glow={C.blue}>FAQ</Eyebrow>
              <h2 style={{ margin: '18px 0 0', fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, fontSize: 'clamp(26px,3.4vw,40px)', color: C.t1 }}>Questions, answered.</h2>
            </div>
            <div className="lp-reveal lp-d1" style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FAQS.map((f) => (
                <details key={f.q} className="lp-faq">
                  <summary>{f.q}<span className="lp-faq-x">+</span></summary>
                  <p style={{ margin: 0, padding: '0 20px 18px', fontSize: 14.5, lineHeight: 1.7, color: C.t2 }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(40px,5vw,64px)', paddingBottom: 'clamp(64px,8vw,110px)' }}>
          <div className="lp-reveal" style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(45,127,255,0.25)', background: 'linear-gradient(135deg,rgba(45,127,255,0.14),rgba(139,92,246,0.08))', padding: 'clamp(40px,6vw,72px)', textAlign: 'center' }}>
            <div aria-hidden style={{ position: 'absolute', right: '-10%', top: '-40%', width: '60%', height: '180%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,127,255,0.18),transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ position: 'relative', margin: 0, fontFamily: C.FD, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, fontSize: 'clamp(30px,4vw,54px)', color: C.t1, textWrap: 'balance' }}>Ready to find your path?</h2>
            <p style={{ position: 'relative', margin: '18px auto 0', maxWidth: '52ch', fontSize: 'clamp(15px,1.3vw,18px)', lineHeight: 1.6, color: '#c3cfe8' }}>Take the diagnostic, get your top match, and start walking the path today — free, forever.</p>
            <div className="lp-cta-row" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 30, position: 'relative' }}>
              <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 30px', borderRadius: 12, background: C.blueGrad, color: '#fff', fontSize: 16, fontWeight: 700, boxShadow: '0 16px 40px -14px rgba(45,127,255,0.9)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free
                <ArrowRight size={16} />
              </button>
              <a className="lp-btn-secondary" href="#pathways" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 26px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', color: C.t1, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                Explore the pathways
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${C.b1}` }}>
          <div className="lp-sec" style={{ paddingTop: 48, paddingBottom: 40 }}>
            <div className="lp-foot-grid">
              <div>
                <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AnimatedLogo size={32} variant="hover" glow={false} />
                  <span style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 16, color: C.t1 }}>MedSchoolPrep</span>
                </a>
                <p style={{ margin: '14px 0 0', maxWidth: '38ch', fontSize: 13.5, lineHeight: 1.6, color: C.t2 }}>A free path into medicine for high schoolers — diagnostic, verified lessons, flashcards, an AI coach, and a full application portfolio.</p>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 14 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="#pathways" style={{ color: C.t2, fontSize: 13.5 }}>Pathways</a>
                  <a href="#learn" style={{ color: C.t2, fontSize: 13.5 }}>Prep &amp; lessons</a>
                  <a href="#portfolio" style={{ color: C.t2, fontSize: 13.5 }}>Portfolio</a>
                  <a href="#learn" style={{ color: C.t2, fontSize: 13.5 }}>Medabrain AI coach</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 14 }}>More</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="#faq" style={{ color: C.t2, fontSize: 13.5 }}>FAQ</a>
                  <button onClick={handleSignIn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t2, fontSize: 13.5, fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>Log in</button>
                  <button onClick={onGetStarted} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t2, fontSize: 13.5, fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>Get started</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 14 }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href={LEGAL_VIEWS.terms} onClick={goLegal(LEGAL_VIEWS.terms)} style={{ color: C.t2, fontSize: 13.5 }}>Terms of Service</a>
                  <a href={LEGAL_VIEWS.privacy} onClick={goLegal(LEGAL_VIEWS.privacy)} style={{ color: C.t2, fontSize: 13.5 }}>Privacy Policy</a>
                  <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: C.t2, fontSize: 13.5 }}>Contact</a>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.b1}`, fontSize: 11.5, lineHeight: 1.65, color: C.t4 || C.t3 }}>
              <p style={{ margin: '0 0 8px' }}>
                MedSchoolPrep is an independent study tool. It is not a medical school, is not affiliated with or endorsed by any testing organisation, university, or health system, and does not confer academic credit or any credential. All lessons, quizzes, and career material — including anything the AI coach produces — are for general educational and career-exploration purposes only and are not medical, legal, financial, or professional advice. Score estimates are our own approximations, not official scores, and are not a prediction or guarantee of any result.
              </p>
              <p style={{ margin: 0 }}>{TRADEMARK_NOTICE[0]} {TRADEMARK_NOTICE[1]} {TRADEMARK_NOTICE[TRADEMARK_NOTICE.length - 1]}</p>
            </div>
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${C.b1}`, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: C.t3 }}>
              <span>© 2026 MedSchoolPrep. Free forever.</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
                No paywall · No personalised ads · Built for high schoolers
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
