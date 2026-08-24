import React, { useEffect, useRef, useState } from 'react';
import AnimatedLogo from './AnimatedLogo';
import {
  ArrowRight, Check, ShieldCheck, Home, Compass, Building2, LineChart, Search,
  Flame, Settings, BookOpen, Layers, MessageCircle, Route, GraduationCap,
  Calendar, FileText, Menu, X, TrendingUp, Sparkles, Zap, ClipboardList, Users, EyeOff,
} from 'lucide-react';
import { LEGAL_VIEWS, PARENT_HUB_PATH } from '../lib/routes';
import { LEGAL, TRADEMARK_NOTICE } from '../legal/legalConfig';
import { FAQS } from '../lib/seoRoutes';
import { C, tint, accentGrad, onTint, CONTROL_TRANSITION } from '../lib/theme';
import ThemeToggle from './ThemeToggle';

// ── Why this page reads the app's live tokens ────────────────────────────────
// It used to carry its own frozen copy of the dark palette, and AuthGate pinned
// every signed-out surface to Dark so the copy stayed accurate. The cost landed
// on the student: sign up, and the entire product changed color in the same
// frame the account was created. Reading `C` — the same mutable token object
// every other screen renders from — is what makes the marketing page, the auth
// screens and the app one continuous surface in whichever theme is chosen.
//
// Two rules follow from that, and both bit during the conversion:
//   1. Nothing here may capture a token into a module-level object literal.
//      `C` is mutated in place on a theme change (see the header of
//      lib/theme.js), so a literal snapshots the palette at import time and
//      never updates. Anything that needs a map builds it inside a function.
//   2. No raw `rgba(255,255,255,…)` washes or `rgba(0,0,0,…)` shadows. Those
//      encode "the page behind me is dark". C.surf / C.shadow / tint() carry
//      the same intent and flip with the family.
const glass = (x = {}) => ({
  background: C.surf, border: `1px solid ${C.b1}`, borderRadius: 16,
  boxShadow: C.shadow, ...x,
});

const pill = (bg, color, x = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 16,
  fontSize: 11, fontWeight: 600, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', background: bg, color, ...x,
});

// ── Small shared bits ─────────────────────────────────────────────────────

function Eyebrow({ color, glow, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: glow, boxShadow: `0 0 12px ${glow}` }} />
      {children}
    </span>
  );
}

function FeaturePill({ bg, color, icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', background: bg, color, border: `1px solid ${color}30` }}>
      {icon}{children}
    </span>
  );
}

function CheckLi({ color, children }) {
  return (
    <li style={{ display: 'flex', gap: 12, fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', lineHeight: 1.53, color: C.t2 }}>
      <span style={{ width: 20, height: 20, borderRadius: 8, background: tint(color, 0.12), border: `1px solid ${tint(color, 0.25)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
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
// Browser chrome → 236px-style sidebar (brand, ⌘K, user card, labeled nav)
// → dashboard main, which actually switches between Home/Prep/Portfolio
// content when you click the sidebar — not a static screenshot.

function MockSideItem({ icon: Ic, label, active, color = C.blue, badge, onClick }) {
  const interactive = typeof onClick === 'function';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 8, width: '100%',
        background: active ? tint(color, 0.14) : 'transparent', color: active ? onTint(color) : C.t2,
        fontWeight: active ? 700 : 500, fontSize: 12, borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
        border: 'none', borderLeftWidth: 2, textAlign: 'left', fontFamily: 'inherit',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      <Ic size={14} color={active ? color : undefined} style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={pill(tint(C.amber, 0.12), C.amberL, { fontSize: 8.5, padding: '4px 4px' })}>{badge}</span>}
    </button>
  );
}

function MockStat({ icon: Ic, color, value, label }) {
  return (
    <div style={glass({ borderRadius: 12, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: `${color}16`, border: `1px solid ${color}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic size={13} color={color} />
        </span>
        <span style={{ fontFamily: C.FM, fontWeight: 700, fontSize: 17, letterSpacing: 'calc(-0.11px + var(--msp-letter-spacing))', color: C.t1 }}>{value}</span>
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
    <div className="lp-replica-frame" style={{ borderRadius: 16, border: `1px solid ${C.b2}`, background: `linear-gradient(180deg,${C.s1},${C.bg})`, overflow: 'hidden', boxShadow: `0 0 0 1px ${tint(C.blue, 0.1)}, 0 50px 140px -40px ${tint(C.blue, 0.32)}, ${C.shadow}` }}>
      {/* Browser chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.b1}`, background: tint(C.bg, 0.6) }}>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.rose }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.amber }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.green }} />
        </div>
        <div style={{ margin: '0 auto', maxWidth: 250, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, border: `1px solid ${C.b1}`, background: C.surf, padding: '4px 12px', fontFamily: C.FM, fontSize: 11, color: C.t3 }}>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          medschoolprep.cloud
        </div>
        <div style={{ width: 44, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Sidebar — mirrors the real 236px desktop sidebar */}
        <aside className="lp-replica-side" style={{ width: 172, flexShrink: 0, borderRight: `1px solid ${C.b1}`, background: `linear-gradient(180deg,${C.s0} 0%,${C.bg} 100%)`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 12px 12px', borderBottom: `1px solid ${C.b1}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AnimatedLogo size={26} variant="hover" glow={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, whiteSpace: 'nowrap' }}>MedSchoolPrep</div>
              <div style={{ fontSize: 6.5, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', whiteSpace: 'nowrap' }}>Your path into medicine</div>
            </div>
          </div>
          <div style={{ margin: '8px 8px 0px', padding: '4px 8px', borderRadius: 8, background: C.s2, border: `1px solid ${C.b1}`, color: C.t3, fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Search size={10} /><span style={{ flex: 1 }}>Jump to…</span>
            <span style={{ ...pill(C.s3, C.t3, { fontSize: 7.5, fontFamily: C.FM, padding: '4px 4px' }) }}>⌘K</span>
          </div>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.b1}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg,${C.blue}55,${C.blue}28)`, border: `1.5px solid ${C.blue}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10.5, color: C.onAccent, flexShrink: 0 }}>M</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, whiteSpace: 'nowrap' }}>Maya R.</div>
                <div style={{ fontSize: 8, color: C.t3, whiteSpace: 'nowrap' }}>Lv.9 Scholar · Physician</div>
              </div>
            </div>
            <Bar pct={68} color={C.blue} h={3} />
            <div style={{ marginTop: 4 }}>
              <span style={pill(tint(C.amber, 0.12), C.amberL, { fontSize: 8, padding: '4px 8px' })}><Flame size={8} />12d streak</span>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          <div style={{ padding: '16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Welcome card — radial glow, accent tile, pathway pill */}
            <div style={glass({ padding: 16, background: `linear-gradient(135deg,${tint(C.blue, 0.08)},${tint(C.cyan, 0.04)})`, border: `1px solid ${C.blue}26`, position: 'relative', overflow: 'hidden' })}>
              <div style={{ position: 'absolute', right: -50, top: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${C.blue}20,transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `${C.blue}1c`, border: `1.5px solid ${C.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 18px ${C.blue}30` }}>
                  <Home size={17} color={C.blueL} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: C.blueL, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>{HERO_COPY[tab].eyebrow}</div>
                  <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 15.5, color: C.t1, letterSpacing: 'calc(-0.04px + var(--msp-letter-spacing))' }}>{HERO_COPY[tab].title}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={pill(`${C.blue}22`, C.blueL, { fontSize: 8.5 })}>Physician (MD/DO)</span>
                    <span style={pill(tint(C.green, 0.14), C.greenL, { fontSize: 8.5 })}><ShieldCheck size={8} />3 verified this week</span>
                  </div>
                </div>
              </div>
            </div>

            {tab === 'home' && (
              <>
                {/* Pathway match — the diagnostic result card with its live arc */}
                <div style={glass({ padding: 12, display: 'flex', alignItems: 'center', gap: 12 })}>
                  <Arc pct={63} size={56} stroke={5.5} color={C.blue} label="63%" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.blueL }}>Your pathway match</div>
                    <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 13.5, color: C.t1, marginTop: 4 }}>Physician (MD/DO)</div>
                    <div style={{ fontSize: 9.5, color: C.t2, marginTop: 4, lineHeight: 1.45 }}>Scored across all 10 pathways — this one fits you best.</div>
                  </div>
                  <span className="lp-hide-narrow" style={pill(`${C.blue}18`, C.blueL, { fontSize: 8.5, flexShrink: 0 })}>Retake ↻</span>
                </div>

                {/* Next lesson */}
                <div style={glass({ padding: 12 })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Next lesson · Unit 3</div>
                    <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 8 })}><ShieldCheck size={8} />Verified quiz</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.green}16`, border: `1px solid ${C.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={14} color={C.greenL} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Organic Chemistry: Functional Groups</div>
                      <div style={{ fontSize: 9, color: C.t2, marginTop: 4 }}>12 min read · 6 min video · pass at 70% to verify</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, background: C.blueGrad, color: C.onAccent, fontSize: 9.5, fontWeight: 700, flexShrink: 0, boxShadow: `0 4px 14px ${C.blue}35` }}>Start<ArrowRight size={10} /></span>
                  </div>
                </div>

                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  <MockStat icon={TrendingUp} color={C.blue} value="63%" label="Pathway mastery" />
                  <MockStat icon={Calendar} color={C.rose} value="3" label="Deadlines this month" />
                  <MockStat icon={Zap} color={C.amber} value="86" label="Clinical hours logged" />
                </div>
              </>
            )}

            {tab === 'prep' && (
              <>
                <div style={glass({ padding: 12, background: `${C.violet}0f`, border: `1px solid ${C.violet}40`, display: 'flex', alignItems: 'center', gap: 12 })}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `${C.violet}22`, border: `1px solid ${C.violet}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={18} color={C.violetL} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>3 decks due today</div>
                    <div style={{ fontSize: 9.5, color: C.t2, marginTop: 4 }}>Cell Biology · Organic Chemistry · Anatomy</div>
                  </div>
                  <span style={{ background: accentGrad(C.violet), color: C.onAccent, fontSize: 9.5, fontWeight: 700, padding: '4px 12px', borderRadius: 8, flexShrink: 0 }}>Review</span>
                </div>
                <div style={glass({ padding: 12, display: 'flex', alignItems: 'center', gap: 8 })}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.blue}1c`, border: `1px solid ${C.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={14} color={C.blueL} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>Resume: Functional Groups</div>
                    <div style={{ fontSize: 9, color: C.t2, marginTop: 4 }}>Unit 3 · 40% through the article</div>
                  </div>
                  <span style={{ background: C.blueGrad, color: C.onAccent, fontSize: 9.5, fontWeight: 700, padding: '4px 12px', borderRadius: 8, flexShrink: 0 }}>Resume</span>
                </div>
                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  <MockStat icon={Layers} color={C.violet} value="3" label="Decks due" />
                  <MockStat icon={BookOpen} color={C.green} value="27" label="Lessons verified" />
                  <MockStat icon={Flame} color={C.amber} value="12d" label="Study streak" />
                </div>
              </>
            )}

            {tab === 'portfolio' && (
              <>
                <div style={glass({ padding: 12 })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>My College List</div>
                    <span style={pill(`${C.sky}22`, C.skyL, { fontSize: 8.5 })}>Scored to your stats</span>
                  </div>
                  {[
                    ['University of Cincinnati', C.green, C.greenL, 'Likely'],
                    ['Ohio State University', C.blue, C.blueL, 'Target'],
                    ['Johns Hopkins University', C.rose, C.roseL, 'Stretch'],
                  ].map(([name, base, lite, tier], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 8, background: C.surf2, border: `1px solid ${C.b1}`, marginBottom: i < 2 ? 6 : 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: base, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: C.t1 }}>{name}</span>
                      <span style={pill(`${base}1f`, lite, { fontSize: 8.5 })}>{tier}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-replica-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
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
    <div style={glass({ padding: 20, borderRadius: 16 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ height: 7, width: 20, borderRadius: 4, background: C.green }} />
          <span style={{ height: 7, width: 20, borderRadius: 4, background: C.green }} />
          <span style={{ height: 7, width: 20, borderRadius: 4, background: phase === 'intro' ? C.blue : C.s4, boxShadow: phase === 'intro' ? `0 0 8px ${C.blue}80` : 'none' }} />
        </div>
        <span style={pill(`${C.blue}18`, C.blueL, { fontSize: 9.5 })}>
          {active ? `Question ${qi + 1} of ${QUIZ_QUESTIONS.length}` : phase === 'done' ? 'Results' : 'Step 3 of 3 · Quiz'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `${C.blue}18`, border: `1px solid ${C.blue}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={21} color={C.blueL} />
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Unit 3 · Physician pathway</div>
          <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 18, color: C.t1, marginTop: 4, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))' }}>Organic Chemistry: Functional Groups</div>
        </div>
      </div>

      {phase === 'intro' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={pill(C.s3, C.t2, { fontSize: 10.5 })}>12 min read</span>
            <span style={pill(C.s3, C.t2, { fontSize: 10.5 })}>6 min video</span>
            <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 10.5 })}><ShieldCheck size={10} />70% to verify</span>
          </div>
          <div style={{ marginTop: 16, borderRadius: 12, background: `${C.blue}0a`, border: `1px solid ${C.blue}25`, padding: 12 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.blueL, marginBottom: 8 }}>Key takeaways</div>
            {['Identify the major functional groups in organic molecules', "Predict reactivity from a group's structure", 'Connect functional groups to real biochemical pathways'].map((t) => (
              <div key={t} style={{ fontSize: 12, color: C.t2, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.55, marginBottom: 4 }}>
                <Check size={13} color={C.blueL} style={{ flexShrink: 0, marginTop: 4 }} />{t}
              </div>
            ))}
          </div>
          <button onClick={startQuiz} className="lp-btn-primary" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 12, borderRadius: 12, background: accentGrad(C.green), color: C.onAccent, fontWeight: 700, fontSize: 13, boxShadow: `0 8px 24px -8px ${tint(C.green, 0.45)}`, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
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
          <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 600, color: C.t1, lineHeight: 1.5, marginBottom: 12 }}>{cur.q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cur.opts.map((label, idx) => {
              let bg = C.surf, bd = C.b2, col = C.t1, mark = '';
              if (pick !== null) {
                if (idx === cur.correct) { bg = tint(C.green, 0.14); bd = tint(C.green, 0.5); col = C.greenL; mark = '✓'; }
                else if (idx === pick) { bg = tint(C.rose, 0.14); bd = tint(C.rose, 0.5); col = C.roseL; mark = '✗'; }
                else col = C.t3;
              }
              return (
                <button key={label} onClick={() => choose(idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '12px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: pick === null ? 'pointer' : 'default', transition: CONTROL_TRANSITION, background: bg, border: `1px solid ${bd}`, color: col }}>
                  <span>{label}</span><span style={{ fontWeight: 800 }}>{mark}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 16, textAlign: 'center', padding: '8px 0px 4px' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: passed ? tint(C.green, 0.14) : tint(C.rose, 0.14), border: `1px solid ${passed ? tint(C.green, 0.4) : tint(C.rose, 0.4)}`, color: passed ? C.greenL : C.roseL }}>
            <Check size={26} strokeWidth={2.6} />
          </div>
          <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', color: C.t1 }}>{passed ? 'Verified!' : 'Not quite yet'}</div>
          <div style={{ fontFamily: C.FM, fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', color: passed ? C.greenL : C.roseL, marginTop: 4, fontWeight: 700 }}>{score} / {QUIZ_QUESTIONS.length} · {pct}%</div>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 8, lineHeight: 1.5, maxWidth: '34ch', margin: '8px auto 0' }}>
            {passed ? 'You cleared the 70% bar — this lesson now counts as verified toward your pathway.' : 'You need 70% to verify. Review the article and give it another shot.'}
          </div>
          <button onClick={startQuiz} className="lp-btn-secondary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: C.surf, border: `1px solid ${C.b2}`, color: C.t1, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
    <div style={glass({ padding: 20, borderRadius: 16 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.amber}16`, border: `1px solid ${C.amber}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} color={C.amberL} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>Cell Biology Deck</div>
        </div>
        <span style={pill(tint(C.violet, 0.14), C.violetL, { fontSize: 10 })}>{due} due today</span>
      </div>
      <button
        onClick={() => setFlip((f) => !f)}
        style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 16, background: `linear-gradient(135deg,${C.violet}18,${tint(C.bg, 0.5)})`, borderWidth: 1, borderStyle: 'solid', borderColor: `${C.violet}30`, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${C.violet}22,transparent 70%)` }} />
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.violetL, marginBottom: 12, position: 'relative' }}>{flip ? 'Back' : 'Front'} · Card {i + 1} of {FLASHCARDS.length}</div>
        <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 600, color: C.t1, lineHeight: 1.5, position: 'relative', minHeight: 48 }}>{flip ? FLASHCARDS[i].a : FLASHCARDS[i].q}</div>
        <div style={{ marginTop: 12, fontSize: 10.5, color: C.t3, position: 'relative' }}>{flip ? 'Tap to flip back' : 'Tap to reveal the answer'}</div>
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {[['Again', C.rose, C.roseL, '< 10 min'], ['Hard', C.amber, C.amberL, '2 days'], ['Good', C.green, C.greenL, '4 days'], ['Easy', C.blue, C.blueL, '9 days']].map(([label, base, lite, interval]) => (
          <button key={label} onClick={() => rate(label, interval)} style={{ flex: 1, textAlign: 'center', padding: 8, borderRadius: 8, border: `1px solid ${base}30`, background: `${base}10`, color: lite, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 10.5, color: C.t3, textAlign: 'center', fontFamily: C.FM }}>{note}</div>
    </div>
  );
}

// ── Medabrain live chat demo — autoplays a script, then hands control to
//    whatever the visitor actually types (matched against a small keyword bank).
const AUTO_SCRIPT = [
  { q: "I want to shadow a doctor — where do I even start?", a: 'Start with people already one step from you: your own physician, a parent\u2019s colleague, a hospital volunteer office. Ask for four hours, not a summer. Want me to draft the email and put the follow-up on your plan?' },
  { q: 'Build my biology study plan', a: 'Two weeks: days 1\u20134 cell structure and transport, 5\u20138 genetics, 9\u201312 metabolism, last two on whatever your quiz scores say you actually missed. I can drop this onto your calendar.' },
  { q: 'Explain photosynthesis simply', a: 'Picture the plant as a solar-powered kitchen: chloroplasts catch light, split water for electrons, then the Calvin cycle spends that energy turning CO₂ into glucose. Light makes the fuel; the cycle builds the sugar.' },
];
const COACH_PRESETS = ['Explain photosynthesis simply', 'Build my biology study plan', 'What should I study tonight?', 'How do I log clinical hours?'];
const ANSWER_BANK = [
  { kw: ['photosynth'], a: 'Picture the plant as a solar-powered kitchen: chloroplasts catch light, split water for electrons, then the Calvin cycle spends that energy turning CO₂ into glucose. Light makes the fuel; the cycle builds the sugar.' },
  { kw: ['biology', 'bio', 'cell'], a: 'Two weeks: days 1\u20134 cell structure and transport, 5\u20138 genetics, 9\u201312 metabolism, last two on whatever your quiz scores say you actually missed. I can add this to your schedule.' },
  { kw: ['shadow', 'shadowing'], a: 'Start with people already one step from you: your own physician, a parent\u2019s colleague, a hospital volunteer office. Ask for four hours, not a summer. Want me to draft the email?' },
  { kw: ['clinical', 'hours', 'shadow'], a: "Open Portfolio → Activities & résumé and pick Clinical Hours, tap Log Hours, and add the date, site, and a one-line reflection. Add a supervisor's contact and the entry can be marked verified instead of self-reported." },
  { kw: ['tonight', 'study', 'today'], a: "With your 12-day streak going, I'd do 15 minutes of due flashcards first, then one Organic Chemistry lesson and its verification quiz. That keeps your pathway mastery climbing without burning you out." },
  { kw: ['plan', 'schedule', 'week'], a: "Here's a simple frame: pick the one subject that's costing you the most points, block 30 minutes a day on it for two weeks, and end each week with a quiz to check. Want me to build it around a specific class?" },
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
    <div style={glass({ padding: 20, borderRadius: 16 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.violet}18`, border: `1px solid ${C.violet}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <div style={{ minHeight: 148, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end' }}>
        {msgs.map((m, idx) => {
          const user = m.role === 'user';
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start' }}>
              <div style={user
                ? { maxWidth: '82%', borderRadius: '13px 13px 3px 13px', background: C.s3, padding: '8px 12px', fontSize: 12.5, color: C.t1, lineHeight: 1.55 }
                : { maxWidth: '88%', borderRadius: '13px 13px 13px 3px', background: `${C.violet}10`, border: `1px solid ${C.violet}25`, padding: '8px 12px', fontSize: 12.5, color: C.t1, lineHeight: 1.55 }}>
                {m.text}
              </div>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ borderRadius: '13px 13px 13px 3px', background: `${C.violet}10`, border: `1px solid ${C.violet}25`, padding: '12px 16px', display: 'flex', gap: 4 }}>
              <span className="lp-typing-dot" style={{ animationDelay: '0s' }} />
              <span className="lp-typing-dot" style={{ animationDelay: '.2s' }} />
              <span className="lp-typing-dot" style={{ animationDelay: '.4s' }} />
            </div>
          </div>
        )}
      </div>
      {showSug && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {COACH_PRESETS.map((label) => (
            <button key={label} onClick={() => send(label)} className="lp-btn-secondary" style={{ borderRadius: 999, border: `1px solid ${C.b2}`, background: C.surf2, color: C.t2, padding: '8px 12px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, borderRadius: 12, border: `1px solid ${C.b2}`, background: C.surf2, padding: '4px 4px 4px 12px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
          placeholder="Ask Medabrain anything…"
          style={{ flex: 1, background: 'none', border: 'none', color: C.t1, fontSize: 13, fontFamily: 'inherit', minWidth: 0 }}
        />
        <button onClick={() => send(input)} aria-label="Send" style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, background: accentGrad(C.violet), color: C.onAccent, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
    <div style={glass({ padding: 20, borderRadius: 16 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.sky}16`, border: `1px solid ${C.sky}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={15} color={C.skyL} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>My College List</div>
        </div>
        <span style={pill(`${C.sky}16`, C.skyL, { fontSize: 10 })}>Scored to your stats</span>
      </div>
      {rows.map(({ name, fit, tier, base, lite }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 12, background: C.surf2, border: `1px solid ${C.b1}`, marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: base, boxShadow: `0 0 8px ${base}90`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ marginTop: 4, maxWidth: 150 }}><Bar pct={fit} color={base} h={3} /></div>
          </div>
          <span style={pill(`${base}1f`, lite, { fontSize: 9.5, flexShrink: 0 })}>{tier}</span>
          <span className="lp-hide-narrow" style={{ fontFamily: C.FM, fontSize: 11, fontWeight: 700, color: lite, flexShrink: 0 }}>{fit}%</span>
        </div>
      ))}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 4 }}><span>GPA</span><span style={{ fontFamily: C.FM, color: C.blueL }}>{gpa.toFixed(2)}</span></div>
          <input type="range" min="2.5" max="4" step="0.01" value={gpa} onChange={(e) => setGpa(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 4 }}><span>SAT</span><span style={{ fontFamily: C.FM, color: C.blueL }}>{sat}</span></div>
          <input type="range" min="1000" max="1600" step="10" value={sat} onChange={(e) => setSat(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: C.t3, textAlign: 'center', marginTop: 12 }}>Drag the sliders — tiers recompute against your stats.</div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────

// Functions, not arrays: a module-level literal captures `C` at import time and
// then paints the old palette forever. See the note at the top of this file.
//
// The one-line descriptions here used to be full sentences — twenty-two cards
// each carrying twenty-odd words, which is a page of prose disguised as a grid.
// The icon and the title do the work; the line underneath only has to say what
// the title can't.
const pathways = () => [
  { color: C.blue,   lite: C.blueL,   tag: 'MD',  title: 'Physician',            desc: 'Direct patient care.' },
  { color: C.green,  lite: C.greenL,  tag: 'RN',  title: 'Nursing',              desc: 'Hands-on, faster route in.' },
  { color: C.violet, lite: C.violetL, tag: 'PA',  title: 'Physician assistant',  desc: 'Broad practice, more flexibility.' },
  { color: C.cyan,   lite: C.cyanL,   tag: 'Rx',  title: 'Pharmacy',             desc: 'Medication at the center.' },
  { color: C.amber,  lite: C.amberL,  tag: 'DDS', title: 'Dentistry',            desc: 'Your own practice, sooner.' },
  { color: C.rose,   lite: C.roseL,   tag: 'PhD', title: 'Biomedical research',  desc: 'Push the science forward.' },
  { color: C.sky,    lite: C.skyL,    tag: 'PT',  title: 'Physical & occupational therapy', desc: 'Rebuild movement.' },
  { color: C.indigo, lite: C.indigoL, tag: 'MPH', title: 'Public health',        desc: 'Prevention at scale.' },
  { color: C.pink,   lite: C.pinkL,   tag: 'MHA', title: 'Health administration', desc: 'Run the systems.' },
  { color: C.t3,     lite: C.t2,      tag: '?',   title: 'Exploring',            desc: 'No pathway required.' },
];

const portfolioTools = () => [
  { color: C.sky,    lite: C.skyL,    icon: GraduationCap, title: 'College list',   desc: 'Tiered against your stats' },
  { color: C.violet, lite: C.violetL, icon: FileText,      title: 'Essays',         desc: 'Draft to final, per school' },
  { color: C.rose,   lite: C.roseL,   icon: Calendar,      title: 'Milestones',     desc: 'Every deadline, counted down' },
  { color: C.green,  lite: C.greenL,  icon: ShieldCheck,   title: 'Financial aid',  desc: 'What each school really costs' },
  { color: C.amber,  lite: C.amberL,  icon: ClipboardList, title: 'Activities & resume', desc: 'Four years, application-ready' },
  { color: C.cyan,   lite: C.cyanL,   icon: Search,        title: 'Research',       desc: 'Logged the way they read it' },
  { color: C.blue,   lite: C.blueL,   icon: Layers,        title: 'Skills & certifications', desc: 'Tracked and ready to cite' },
  { color: C.green,  lite: C.greenL,  icon: Zap,           title: 'Clinical hours', desc: 'Shadowing, logged as you go' },
  { color: C.indigo, lite: C.indigoL, icon: MessageCircle, title: 'Recommenders',   desc: "Who's writing, and when it's due" },
  { color: C.pink,   lite: C.pinkL,   icon: Sparkles,      title: 'Interview prep', desc: 'Real MMI and CASPer scenarios' },
  { color: C.amber,  lite: C.amberL,  icon: TrendingUp,    title: 'Test scores',    desc: 'Every attempt, plotted' },
  { color: C.cyan,   lite: C.cyanL,   icon: LineChart,     title: 'Admissions calculator', desc: 'Where you stand, live' },
];

// FAQS moved to src/lib/seoRoutes.js (imported above).
//
// Not for tidiness: these same questions are emitted as FAQPage JSON-LD on this
// URL by scripts/prerenderSeo.mjs, and Google's structured-data policy requires
// FAQ markup to match content the visitor can actually see. Two copies of the
// list is exactly the shape that requirement fails in — one gets edited, the
// other keeps being served as markup for questions that are no longer on the
// page. So there is one list, and both renderers read it.

const MARQUEE_ITEMS = ['10 career pathways', '90+ verified lessons', 'Spaced-repetition flashcards', 'Medabrain AI coach', 'College list scored to your stats', 'MMI & CASPer interview prep', 'Free — nothing paywalled'];

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted, onLogin, onOpenParents, onOpenLegal, themeMode, onThemeChange }) {
  const handleSignIn = onLogin || onGetStarted;
  // "For parents" is a real page (/parents), not an anchor on this one — a parent needs a URL
  // they can be sent, bookmark, and come back to. Client-side when AuthGate gave us a navigator,
  // a plain href otherwise, same arrangement as the legal links below.
  const goParents = (e) => {
    if (!onOpenParents) return;
    e.preventDefault();
    onOpenParents();
  };
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

  // 'For parents' points at a route rather than an anchor, and sits last so the product story
  // still reads left-to-right — but it is IN the nav, because the single most common way this
  // feature went unfound was a parent looking at this bar and seeing nothing addressed to them.
  const navLinks = [['#pathways', 'Pathways'], ['#learn', 'Prep'], ['#portfolio', 'Portfolio'], ['#faq', 'FAQ'], [PARENT_HUB_PATH, 'For parents']];

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
        .lp-nav-link::after { content: ""; position: absolute; left: 0; bottom: -5px; width: 100%; height: 2px; border-radius: 2px; background: linear-gradient(90deg,${C.blue},${C.cyan}); transform: scaleX(0); transform-origin: left; transition: transform .25s ease; }
        .lp-nav-link:hover { color: ${C.t1}; }
        .lp-nav-link:hover::after { transform: scaleX(1); }

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
        .lp-card-hover:hover { transform: translateY(-5px); border-color: ${C.b3}; background: ${C.surfHi}; box-shadow: 0 22px 50px -26px ${tint(C.blue, 0.45)}, ${C.shadowSm}; }
        .lp-btn-primary { position: relative; overflow: hidden; transition: transform .2s cubic-bezier(.16,1,.3,1), filter .2s, box-shadow .2s; }
        .lp-btn-primary::after { content: ""; position: absolute; top: 0; left: -120%; width: 60%; height: 100%; background: linear-gradient(100deg,transparent,rgba(255,255,255,0.28),transparent); transform: translateX(0) skewX(-18deg); transition: transform .6s ease; pointer-events: none; }
        .lp-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .lp-btn-primary:hover::after { transform: translateX(416%) skewX(-18deg); }
        .lp-btn-primary:active { transform: translateY(0); }
        .lp-btn-secondary { transition: background .2s, border-color .2s; }
        .lp-btn-secondary:hover { background: ${C.surfHi} !important; border-color: ${C.b3} !important; }

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
        .lp-faq { border-radius: 14px; border: 1px solid ${C.b1}; background: ${C.surf2}; transition: border-color .2s, background .2s; }
        .lp-faq[open] { border-color: ${tint(C.blue, 0.3)}; background: ${tint(C.blue, 0.05)}; }
        .lp-faq summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 20px; font-weight: 700; font-size: 15.5px; color: ${C.t1}; }
        .lp-faq summary::-webkit-details-marker { display: none; }
        .lp-faq .lp-faq-x { flex-shrink: 0; width: 24px; height: 24px; border-radius: 8px; border: 1px solid ${C.b2}; display: inline-flex; align-items: center; justify-content: center; color: ${C.t2}; font-size: 14px; transition: transform .25s, color .2s, border-color .2s; }
        .lp-faq[open] .lp-faq-x { transform: rotate(45deg); color: ${C.blueL}; border-color: ${tint(C.blue, 0.4)}; }

        /* ── Mobile menu ───────────────────────────────────────────────── */
        .lp-mobile-menu { position: fixed; inset: 66px 0 auto 0; z-index: 49; background: ${tint(C.bg, 0.97)}; backdrop-filter: blur(20px); border-bottom: 1px solid ${C.b2}; padding: 10px 20px 22px; display: flex; flex-direction: column; gap: 2px; animation: lp-rise .25s ease forwards; }
        .lp-mobile-menu a, .lp-mobile-menu button { display: block; width: 100%; text-align: left; padding: 13px 10px; border-radius: 10px; font-size: 15px; font-weight: 600; color: ${C.t2}; background: none; border: none; cursor: pointer; font-family: inherit; }
        .lp-mobile-menu a:active, .lp-mobile-menu a:hover { background: ${C.surfHi}; color: ${C.t1}; }

        /* ── Range sliders (college-list scorer) — scoped to this page ──── */
        .lp input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; border-radius: 5px; background: ${C.s3}; }
        .lp input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${C.blueL}; box-shadow: 0 0 10px ${tint(C.blue, 0.5)}; cursor: pointer; border: 2px solid ${C.bg}; }
        .lp input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${C.blueL}; box-shadow: 0 0 10px ${tint(C.blue, 0.5)}; cursor: pointer; border: 2px solid ${C.bg}; }
      `}</style>

      {/* Atmosphere — layered aurora glows so the page breathes edge-to-edge
          instead of floating content on a flat black slab. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="lp-orb" style={{ top: '-12%', right: '-8%', width: 'min(760px,70vw)', height: 'min(760px,70vw)', background: `radial-gradient(circle,${tint(C.blue, 0.16)},transparent 65%)` }} />
        <div className="lp-orb" style={{ top: '4%', left: '-14%', width: 'min(560px,60vw)', height: 'min(560px,60vw)', background: `radial-gradient(circle,${tint(C.violet, 0.11)},transparent 65%)`, animationDelay: '-5s' }} />
        <div className="lp-orb" style={{ top: '46%', right: '-12%', width: 'min(620px,60vw)', height: 'min(620px,60vw)', background: `radial-gradient(circle,${tint(C.cyan, 0.09)},transparent 65%)`, animationDelay: '-9s' }} />
        <div className="lp-orb" style={{ bottom: '-8%', left: '-8%', width: 'min(600px,60vw)', height: 'min(600px,60vw)', background: `radial-gradient(circle,${tint(C.blue, 0.1)},transparent 65%)`, animationDelay: '-3s' }} />
      </div>

      <div className="lp" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.b1}`, background: tint(C.bg, 0.85), backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
          <div className="lp-sec" style={{ height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={() => setMenuOpen(false)}>
              <AnimatedLogo size={34} variant="hover" glow={false} />
              <span style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 16.5, letterSpacing: 'calc(-0.08px + var(--msp-letter-spacing))', color: C.t1 }}>MedSchoolPrep</span>
            </a>
            <div className="lp-nav-links">
              {navLinks.map(([href, label]) => (
                <a key={href} className="lp-nav-link" href={href} onClick={href === PARENT_HUB_PATH ? goParents : undefined}>{label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {/* Before an account exists, not after. A visitor who picks Light
                  here signs up into Light — the choice is stored under the same
                  key the app reads, so nothing flips on them at sign-up. */}
              {onThemeChange && <ThemeToggle mode={themeMode} onChange={onThemeChange} size={38} align="right" />}
              <button className="lp-nav-login" onClick={handleSignIn} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: C.t2, fontFamily: 'inherit' }}>Log in</button>
              <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: C.blueGrad, color: C.onAccent, fontSize: 13.5, fontWeight: 700, boxShadow: `0 0 0 1px ${tint(C.blue, 0.3)},0 10px 26px -12px ${tint(C.blue, 0.6)}`, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free
                <ArrowRight size={14} />
              </button>
              <button className="lp-nav-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(v => !v)} style={{ width: 38, height: 38, borderRadius: 8, border: `1px solid ${C.b2}`, background: C.surf, color: C.t1, cursor: 'pointer' }}>
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </nav>
        {menuOpen && (
          <div className="lp-mobile-menu">
            {navLinks.map(([href, label]) => (
              <a
                key={href} href={href}
                onClick={(e) => { setMenuOpen(false); if (href === PARENT_HUB_PATH) goParents(e); }}
              >{label}</a>
            ))}
            <button onClick={() => { setMenuOpen(false); handleSignIn(); }}>Log in</button>
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <header id="top" className="lp-sec">
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-hero-anim lp-ha1 lp-hero-badge" style={{ display: 'flex' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: `1px solid ${C.b2}`, background: C.surf, padding: '8px 16px 8px 8px', fontSize: 12.5, fontWeight: 600, color: C.t2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: tint(C.blue, 0.15), color: C.blueL, padding: '4px 8px', fontSize: 11, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', fontWeight: 700 }}>
                    <ShieldCheck size={11} />
                    100% free
                  </span>
                  No paywall · No personalized ads · Built for high schoolers
                </span>
              </div>

              <h1 className="lp-hero-anim lp-ha2" style={{ margin: '24px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.035em + var(--msp-letter-spacing))', lineHeight: 1.02, fontSize: 'clamp(40px,4.8vw,74px)', color: C.t1, textWrap: 'balance' }}>
                Find your path into medicine.
                <br />
                <span style={{ backgroundImage: `linear-gradient(120deg,${C.blueL} 0%,${C.cyanL} 55%,${C.violetL} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Then actually walk it.</span>
              </h1>

              <p className="lp-hero-anim lp-ha3 lp-hero-sub" style={{ margin: '20px 0px 0px', maxWidth: '54ch', fontSize: 'clamp(16px,1.35vw,18.5px)', lineHeight: 1.55, color: C.t2 }}>
                Find the health career that fits you. Then get the lessons, the coach, and the whole application in one place.
              </p>

              <div className="lp-hero-anim lp-ha4 lp-hero-ctas" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 12, background: C.blueGrad, color: C.onAccent, fontSize: 15.5, letterSpacing: 'calc(-0.04px + var(--msp-letter-spacing))', fontWeight: 700, boxShadow: `0 0 0 1px ${tint(C.blue, 0.3)},0 18px 44px -16px ${tint(C.blue, 0.65)}`, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Get started free
                  <ArrowRight size={16} />
                </button>
                <a className="lp-btn-secondary" href="#pathways" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 12, border: `1px solid ${C.b2}`, background: C.surf, color: C.t1, fontSize: 15.5, letterSpacing: 'calc(-0.04px + var(--msp-letter-spacing))', fontWeight: 700, cursor: 'pointer' }}>
                  See the 10 pathways
                </a>
              </div>
              <p className="lp-hero-anim lp-ha5" style={{ marginTop: 16, fontSize: 13, color: C.t3 }}>Free forever · under a minute to join</p>
            </div>

            <div className="lp-hero-visual">
              <div aria-hidden style={{ position: 'absolute', inset: '-12% -10%', background: `radial-gradient(ellipse 60% 55% at 55% 45%,${tint(C.blue, 0.14)},transparent 70%)`, pointerEvents: 'none' }} />
              <AppReplica />
            </div>
          </div>
        </header>

        {/* ── MARQUEE ─────────────────────────────────────────────────── */}
        <div style={{ overflow: 'hidden', borderTop: `1px solid ${C.b1}`, borderBottom: `1px solid ${C.b1}`, padding: '16px 0px', background: C.surf2, WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)' }}>
          <div style={{ display: 'flex', width: 'max-content', gap: 44, whiteSpace: 'nowrap', fontSize: 14.5, fontWeight: 600, color: C.t2, animation: 'lp-marquee 38s linear infinite' }}>
            {[0, 1].map((i) => (
              <span key={i} aria-hidden={i === 1} style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
                {MARQUEE_ITEMS.map((t) => (
                  <React.Fragment key={t}>
                    <span>{t}</span>
                    <span style={{ color: tint(C.blue, 0.55) }}>◆</span>
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── PATHWAYS ────────────────────────────────────────────────── */}
        <section id="pathways" style={{ borderTop: `1px solid ${C.b1}`, borderBottom: `1px solid ${C.b1}`, background: `linear-gradient(180deg,${tint(C.blue, 0.05)},transparent 60%)` }}>
          <div className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
            <div className="lp-reveal" style={{ maxWidth: 720 }}>
              <Eyebrow color={C.blueL} glow={C.blue}>10 pathways</Eyebrow>
              <h2 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.07, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Not sure which health career fits? Find out first.</h2>
              <p style={{ marginTop: 16, fontSize: 16.5, letterSpacing: 'calc(-0.08px + var(--msp-letter-spacing))', lineHeight: 1.49, color: C.t2 }}>A short diagnostic scores you against all ten — then you explore any of them.</p>
            </div>

            <div className="lp-pathway-grid lp-reveal" style={{ marginTop: 48 }}>
              {pathways().map((p) => (
                <div key={p.title} className="lp-card-hover" style={{ borderRadius: 16, border: `1px solid ${C.b1}`, background: C.surf, padding: 16, boxShadow: C.shadow }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, padding: '0px 8px', borderRadius: 8, background: `${p.color}1c`, border: `1px solid ${p.color}45`, fontFamily: C.FM, fontWeight: 700, fontSize: 11 }}>
                    <span style={{ color: p.lite }}>{p.tag}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: C.FD, fontSize: 16, color: C.t1, marginTop: 12, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))' }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE: Learning pathway ───────────────────────────────── */}
        <section id="learn" className="lp-sec" style={{ paddingTop: 'clamp(72px,8vw,130px)', paddingBottom: 'clamp(48px,5vw,80px)' }}>
          <div className="lp-feature">
            <div className="lp-feat-copy lp-reveal">
              <FeaturePill bg={tint(C.blue, 0.12)} color={C.blueL} icon={<Route size={13} />}>Learning pathway</FeaturePill>
              <h3 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Lessons that actually have to prove themselves.</h3>
              <p style={{ marginTop: 16, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', lineHeight: 1.5, color: C.t2 }}>Article, video, then a quiz you have to pass at 70%. Watching something never counts as progress. <strong style={{ color: C.t1 }}>Try the quiz on the right.</strong></p>
              <ul style={{ margin: '24px 0px 0px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <FeaturePill bg={tint(C.violet, 0.12)} color={C.violetL} icon={<Layers size={13} />}>Flashcards</FeaturePill>
              <h3 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Turn your own notes into a study system.</h3>
              <p style={{ marginTop: 16, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', lineHeight: 1.5, color: C.t2 }}>Paste your notes; cards come out of what's actually in them. Spaced repetition schedules every review. <strong style={{ color: C.t1 }}>Flip the card and rate it.</strong></p>
              <ul style={{ margin: '24px 0px 0px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <FeaturePill bg={tint(C.violet, 0.12)} color={C.violetL} icon={<MessageCircle size={13} />}>Medabrain · AI coach</FeaturePill>
              <h3 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>Stuck on a concept at 11pm? Ask Medabrain.</h3>
              <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: C.t2 }}>Medabrain explains whatever's blocking you, then builds a plan around it. Free and unlimited. <strong style={{ color: C.t1 }}>Watch it work — or ask it something yourself.</strong></p>
              <ul style={{ margin: '24px 0px 0px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <FeaturePill bg={tint(C.sky, 0.12)} color={C.skyL} icon={<GraduationCap size={13} />}>Portfolio</FeaturePill>
              <h3 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', lineHeight: 1.1, fontSize: 'clamp(26px,3vw,40px)', color: C.t1 }}>A college list scored to your actual stats.</h3>
              <p style={{ marginTop: 16, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', lineHeight: 1.5, color: C.t2 }}>Every school tiered against your real GPA, scores and hours — and re-scored the moment they change. <strong style={{ color: C.t1 }}>Move the sliders and watch it re-tier.</strong></p>
              <ul style={{ margin: '24px 0px 0px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CheckLi color={C.skyL}>Every school tiered against your real numbers</CheckLi>
                <CheckLi color={C.skyL}>Tiers recompute as your GPA and scores grow</CheckLi>
                <CheckLi color={C.skyL}>Part of a full portfolio — essays, deadlines, aid, and more</CheckLi>
              </ul>
            </div>
          </div>
        </section>

        {/* ── PORTFOLIO ───────────────────────────────────────────────── */}
        <section id="portfolio" style={{ borderTop: `1px solid ${C.b1}`, background: C.surf2 }}>
          <div className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
            <div className="lp-reveal" style={{ maxWidth: 720 }}>
              <Eyebrow color={C.skyL} glow={C.sky}>The portfolio</Eyebrow>
              <h2 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.05, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Everything your application needs, in one place.</h2>
              <p style={{ marginTop: 16, fontSize: 16.5, letterSpacing: 'calc(-0.08px + var(--msp-letter-spacing))', lineHeight: 1.49, color: C.t2 }}>Twelve tools that talk to each other, so nothing slips.</p>
            </div>

            <div className="lp-tools-grid lp-reveal" style={{ marginTop: 44 }}>
              {portfolioTools().map((t) => (
                <div key={t.title} className="lp-card-hover" style={glass({ padding: 20, borderRadius: 16 })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: `${t.color}16`, border: `1px solid ${t.color}30`, color: t.lite, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <t.icon size={16} />
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: C.t1 }}>{t.title}</span>
                  </div>
                  <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.55, color: C.t2 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY FREE ────────────────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(64px,7vw,110px)', paddingBottom: 'clamp(64px,7vw,110px)' }}>
          <div className="lp-reveal" style={{ maxWidth: 720 }}>
            <Eyebrow color={C.greenL} glow={C.green}>Why free</Eyebrow>
            <h2 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.05, fontSize: 'clamp(30px,3.6vw,50px)', color: C.t1, textWrap: 'balance' }}>Built for students, not for a paywall.</h2>
          </div>
          <div className="lp-manifesto-grid lp-reveal lp-d1" style={{ marginTop: 44 }}>
            {[
              [C.greenL, '100%', 'Free, always', 'Every lesson, tool and coach response. No premium tier, ever.'],
              [C.blueL, '0', 'Trackers, and profiles built on you', "No data sold, no profile built on you. Ads are chosen by the page, never by you."],
              [C.violetL, '9–12', 'Built for high schoolers', 'Built for the years that shape an application.'],
            ].map(([color, stat, title, body]) => (
              <div key={title} className="lp-card-hover" style={glass({ padding: 24, borderRadius: 16 })}>
                <div style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 34, lineHeight: 'calc(1.14 * var(--msp-line-scale))', color, letterSpacing: 'calc(-0.8px + var(--msp-letter-spacing))' }}>{stat}</div>
                <div style={{ fontFamily: C.FD, fontWeight: 700, fontSize: 17, letterSpacing: 'calc(-0.11px + var(--msp-letter-spacing))', color: C.t1, marginTop: 8 }}>{title}</div>
                <div style={{ fontSize: 13.5, color: C.t2, marginTop: 8, lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section id="faq" style={{ borderTop: `1px solid ${C.b1}` }}>
          <div className="lp-sec" style={{ maxWidth: 900, paddingTop: 'clamp(64px,7vw,100px)', paddingBottom: 'clamp(64px,7vw,100px)' }}>
            <div className="lp-reveal" style={{ textAlign: 'center' }}>
              <Eyebrow color={C.blueL} glow={C.blue}>FAQ</Eyebrow>
              <h2 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.1, fontSize: 'clamp(26px,3.4vw,40px)', color: C.t1 }}>Questions, answered.</h2>
            </div>
            <div className="lp-reveal lp-d1" style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FAQS.map((f) => (
                <details key={f.q} className="lp-faq">
                  <summary>{f.q}<span className="lp-faq-x">+</span></summary>
                  <p style={{ margin: 0, padding: '0px 20px 16px', fontSize: 14.5, lineHeight: 1.54, color: C.t2 }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOR PARENTS ─────────────────────────────────────────────── */}
        {/* The parent dashboard shipped with no presence on this page at all, which meant the only
            people who ever found it were students who happened to scroll their own Settings to the
            bottom. A parent reading this page is deciding two things at once — whether their child
            should use this, and whether they get any visibility — and answering the second one
            here is what makes the first one an easy yes. */}
        <section id="parents" className="lp-sec" style={{ paddingTop: 'clamp(32px,4vw,56px)', paddingBottom: 'clamp(32px,4vw,56px)' }}>
          <div className="lp-reveal" style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, border: `1px solid ${tint(C.violet, 0.26)}`, background: `linear-gradient(135deg,${tint(C.violet, 0.1)},transparent 62%)`, padding: 'clamp(28px,4vw,52px)' }}>
            <div aria-hidden style={{ position: 'absolute', left: '-8%', bottom: '-60%', width: '46%', height: '180%', borderRadius: '50%', background: `radial-gradient(circle,${tint(C.violet, 0.16)},transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', gap: 'clamp(24px,4vw,56px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 999, background: tint(C.violet, 0.12), border: `1px solid ${tint(C.violet, 0.3)}`, fontSize: 12, fontWeight: 700, color: C.violetL }}>
                  <Users size={13} /> For parents
                </span>
                <h2 style={{ margin: '16px 0px 0px', fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.08, fontSize: 'clamp(26px,3.2vw,40px)', color: C.t1, textWrap: 'balance' }}>
                  Parents get their own dashboard.
                </h2>
                <p style={{ margin: '16px 0px 0px', maxWidth: '46ch', fontSize: 'clamp(14.5px,1.2vw,16.5px)', lineHeight: 1.55, color: C.t2 }}>
                  Your own account, your own login, and a clear view of whether your student is
                  showing up and whether it is working — study days, lessons passed, quiz averages
                  and practice-test scores, with a plain read on the week.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                  <a className="lp-btn-primary" href={PARENT_HUB_PATH} onClick={goParents} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: C.blueGrad, color: C.onAccent, fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 700, boxShadow: `0 14px 34px -14px ${tint(C.blue, 0.6)}`, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
                    See the parent dashboard <ArrowRight size={15} />
                  </a>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { ic: ShieldCheck, hue: C.green, t: 'Only with their say-so', b: 'Your student approves the request from their own inbox, and can end it in one tap. Knowing their name or email is never enough.' },
                  { ic: EyeOff, hue: C.t3, t: 'Never their private work', b: 'Coach conversations, lesson notes and essay drafts are not shown to parents — not as a setting, but by construction.' },
                  { ic: TrendingUp, hue: C.blue, t: 'The numbers that matter', b: 'Eight weeks of study days, quiz trend, and every practice-test score with the change since the last one.' },
                ].map(({ ic: Ic, hue, t, b }) => (
                  <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 12, background: C.surf, border: `1px solid ${C.b1}` }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(hue, 0.13), border: `1px solid ${tint(hue, 0.28)}` }}>
                      <Ic size={15} color={hue} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{t}</div>
                      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────── */}
        <section className="lp-sec" style={{ paddingTop: 'clamp(40px,5vw,64px)', paddingBottom: 'clamp(64px,8vw,110px)' }}>
          <div className="lp-reveal" style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, border: `1px solid ${tint(C.blue, 0.28)}`, background: `linear-gradient(135deg,${tint(C.blue, 0.14)},${tint(C.violet, 0.08)})`, padding: 'clamp(40px,6vw,72px)', textAlign: 'center' }}>
            <div aria-hidden style={{ position: 'absolute', right: '-10%', top: '-40%', width: '60%', height: '180%', borderRadius: '50%', background: `radial-gradient(circle,${tint(C.blue, 0.18)},transparent 70%)`, pointerEvents: 'none' }} />
            <h2 style={{ position: 'relative', margin: 0, fontFamily: C.FD, fontWeight: 800, letterSpacing: 'calc(-0.03em + var(--msp-letter-spacing))', lineHeight: 1.05, fontSize: 'clamp(30px,4vw,54px)', color: C.t1, textWrap: 'balance' }}>Ready to find your path?</h2>
            <p style={{ position: 'relative', margin: '18px auto 0', maxWidth: '52ch', fontSize: 'clamp(15px,1.3vw,18px)', lineHeight: 1.55, color: C.t2 }}>Take the diagnostic. Get your match. Start today.</p>
            <div className="lp-cta-row" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28, position: 'relative' }}>
              <button className="lp-btn-primary" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 12, background: C.blueGrad, color: C.onAccent, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 700, boxShadow: `0 16px 40px -14px ${tint(C.blue, 0.65)}`, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free
                <ArrowRight size={16} />
              </button>
              <a className="lp-btn-secondary" href="#pathways" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 24px', borderRadius: 12, background: C.surfHi, border: `1px solid ${C.b2}`, color: C.t1, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 600, cursor: 'pointer' }}>
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
                <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AnimatedLogo size={32} variant="hover" glow={false} />
                  <span style={{ fontFamily: C.FD, fontWeight: 800, fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', color: C.t1 }}>MedSchoolPrep</span>
                </a>
                <p style={{ margin: '12px 0px 0px', maxWidth: '38ch', fontSize: 13.5, lineHeight: 1.55, color: C.t2 }}>A free path into medicine for high schoolers.</p>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 12 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href="#pathways" style={{ color: C.t2, fontSize: 13.5 }}>Pathways</a>
                  <a href="#learn" style={{ color: C.t2, fontSize: 13.5 }}>Prep &amp; lessons</a>
                  <a href="#portfolio" style={{ color: C.t2, fontSize: 13.5 }}>Portfolio</a>
                  <a href="#learn" style={{ color: C.t2, fontSize: 13.5 }}>Medabrain AI coach</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 12 }}>More</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href="#faq" style={{ color: C.t2, fontSize: 13.5 }}>FAQ</a>
                  <a href={PARENT_HUB_PATH} onClick={goParents} style={{ color: C.t2, fontSize: 13.5 }}>For parents</a>
                  <button onClick={handleSignIn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t2, fontSize: 13.5, fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>Log in</button>
                  <button onClick={onGetStarted} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t2, fontSize: 13.5, fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>Get started</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3, marginBottom: 12 }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={LEGAL_VIEWS.terms} onClick={goLegal(LEGAL_VIEWS.terms)} style={{ color: C.t2, fontSize: 13.5 }}>Terms of Service</a>
                  <a href={LEGAL_VIEWS.privacy} onClick={goLegal(LEGAL_VIEWS.privacy)} style={{ color: C.t2, fontSize: 13.5 }}>Privacy Policy</a>
                  <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: C.t2, fontSize: 13.5 }}>Contact</a>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.b1}`, fontSize: 11.5, lineHeight: 1.55, color: C.t4 || C.t3 }}>
              <p style={{ margin: '0px 0px 8px' }}>
                MedSchoolPrep is an independent study tool. It is not a medical school, is not affiliated with or endorsed by any testing organization, university, or health system, and does not confer academic credit or any credential. All lessons, quizzes, and career material — including anything the AI coach produces — are for general educational and career-exploration purposes only and are not medical, legal, financial, or professional advice. Score estimates are our own approximations, not official scores, and are not a prediction or guarantee of any result.
              </p>
              <p style={{ margin: 0 }}>{TRADEMARK_NOTICE[0]} {TRADEMARK_NOTICE[1]} {TRADEMARK_NOTICE[TRADEMARK_NOTICE.length - 1]}</p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.b1}`, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: C.t3 }}>
              <span>© 2026 MedSchoolPrep. Free forever.</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
                No paywall · No personalized ads · Built for high schoolers
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
