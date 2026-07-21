import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { generateAIFlashcards } from './lib/aiFlashcards';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ArcElement
} from 'chart.js';
import { Radar, Line, Doughnut } from 'react-chartjs-2';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  Home, Compass, Route, Layers, MessageCircle, Layers3, BookOpen,
  Trophy, Building2, LineChart, Settings, Flame, Zap, CheckCircle2, TrendingUp,
  Lock, Check, X, AlertTriangle, FileDown, Sparkles, Coffee, Target, PartyPopper,
  Search, Package, Handshake, FlaskConical, CalendarDays, Award, ChevronRight, ChevronLeft,
  RefreshCw, Star, Gem, Dumbbell, Milestone, Dna, Calculator, Circle, Clock, ArrowUp, ArrowRight,
  Bookmark,
  ListFilter, Timer, Trash2, GraduationCap, ScrollText, Play, ExternalLink, Plus,
  Mic, Hammer, Sun, ShieldCheck, Crown, Lightbulb, Brain, Wand2, Snowflake,
  Stethoscope, HeartPulse, ClipboardList, Pill, Smile, Microscope, Globe, Landmark, UserCheck,
  Copy, RotateCcw, BadgeCheck, Pencil, Menu,
} from 'lucide-react';

const ACH_ICONS = { Target, Star, Trophy, Sparkles, Gem, Flame, Dumbbell, Layers3, BookOpen, Milestone, MessageCircle, Building2, CalendarDays, ScrollText, Award, Mic, GraduationCap, Stethoscope, UserCheck, ShieldCheck };
const TIER_ICONS = { Sparkles, Hammer, Compass, Trophy, Sun, ShieldCheck, Crown };

import { ALL_QUIZZES } from './data/quizzes/index';
import { ELIB } from './data/elib';
import { PATHS, FLASH_DECKS, SCHOOL_DATA, COMPETITIONS, DIAG_QS, PATH_COACH_NOTES, US_STATES, COURSE_CAT_MAP, GRADE_STAGES, CLASS_YEAR_ROADMAP } from './data/constants';
import { LESSON_CONTENT } from './data/lessonContent';
import { rankQuizzes, getIatraPickPrompt } from './lib/recommend';
import { scorePathways } from './lib/diagnosticEngine';
import QuizRecommendationsPanel from './components/QuizRecommendationsPanel';
import { getLevelInfo, getWeeklyQuests, getIsoWeekKey, getStartOfWeek, getClaimedQuests, claimQuest, bumpWeeklyCoachCount, getWeeklyCoachCount, dueCardsBadge, dueCardsSub } from './lib/gamification';
import InterviewPrepPanel from './components/InterviewPrepPanel';

import * as DB from './lib/db';
import * as ProgressSync from './lib/progressSync';
import { loadViewState, saveViewState, clearViewState } from './lib/viewState';
import * as AuthAPI from './lib/authApi';
import { listItems, createItem, migrateLocalPortfolioLogs } from './lib/dataApi';
import { scheduleCard, getDueCards, sortForStudy, nextReviewLabel, getRetainability, STATE_LABELS } from './lib/fsrs';
import { buildQuizSearch, buildLibrarySearch, buildDeckSearch, searchDecks, fuseSearch } from './lib/search';
import { play, setSFX } from './lib/sounds';
import { celebrateXP, celebrateLevelUp, celebratePerfect, celebrateAchievement, celebrateMastery, celebrateStreak, celebrateBonusXP, celebrateJackpot } from './lib/celebrate';
import { awardXP, BONUS_COPY } from './lib/rewards';
import { getCached, setCached, dailyKey } from './lib/aiCache';
import { logEvent } from './lib/eventLog';
import { pickNudge } from './lib/nudges';
import { getTodayCheckinStatus, getNextCheckinDay, claimCheckin, getCheckinReward } from './lib/dailyCheckin';
import { rollCosmetic } from './lib/cosmetics';
import { renderMarkdown } from './lib/renderMarkdown';
import { exportQuizResult, exportSchoolList, exportFlashDeck, exportPathwayCertificate } from './lib/exportPDF';
import { ACHIEVEMENTS, checkAchievements } from './lib/achievements';
import DeadlinesPanel, { useDeadlines, NextDeadlineCard } from './components/DeadlinesPanel';
import CollegeListPanel from './components/CollegeListPanel';
import EssayWorkspacePanel from './components/EssayWorkspacePanel';
import ScoreTrackerPanel from './components/ScoreTrackerPanel';
import FinancialAidPanel from './components/FinancialAidPanel';
import StreakHeatmap from './components/StreakHeatmap';
import ActivitiesResumePanel from './components/ActivitiesResumePanel';
import RewardChest from './components/RewardChest';
import ClinicalHoursPanel from './components/ClinicalHoursPanel';
import RecommendersPanel from './components/RecommendersPanel';
import ResearchExperiencePanel from './components/ResearchExperiencePanel';
import SkillsCertificationsPanel from './components/SkillsCertificationsPanel';
import PortfolioTimeline from './components/PortfolioTimeline';
import SubNav from './components/ui/SubNav';
import EmptyState from './components/ui/EmptyState';
import AppTour from './components/AppTour';
import Onboarding, { GOAL_OPTIONS, OBSTACLE_OPTIONS, STUDY_METHOD_OPTIONS, ACCOMPLISH_OPTIONS } from './components/onboarding/Onboarding';
import { computeApplicationStrength } from './lib/applicationStrength';
import { buildInsights } from './lib/insights';
import { buildCoachSystemPrompt, buildOnboardingRecap, computeOnboardingCompleteness } from './lib/studentProfile';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ArcElement);

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:'#04060b', s0:'#060a15', s1:'#0a1020', s2:'#0f1828', s3:'#162032', s4:'#1d2a40', s5:'#253350',
  b0:'rgba(255,255,255,0.04)', b1:'rgba(255,255,255,0.07)', b2:'rgba(255,255,255,0.11)', b3:'rgba(255,255,255,0.18)',
  t1:'#eef2ff', t2:'#94a3c0', t3:'#506080', t4:'#2d3f58',
  blue:'#2d7fff', blueL:'#5da0ff', blueLL:'#93c5fd', blueD:'#1d5fd9',
  blueDim:'rgba(45,127,255,0.10)', blueGlow:'rgba(45,127,255,0.28)',
  blueGrad:'linear-gradient(135deg,#2d7fff 0%,#1d5fd9 100%)',
  green:'#10b981', greenL:'#34d399', greenDim:'rgba(16,185,129,0.10)',
  amber:'#f59e0b', amberL:'#fbbf24', amberDim:'rgba(245,158,11,0.10)',
  rose:'#f43f5e', roseL:'#fb7185', roseDim:'rgba(244,63,94,0.10)',
  violet:'#8b5cf6', violetL:'#a78bfa', violetDim:'rgba(139,92,246,0.10)',
  cyan:'#06b6d4', cyanDim:'rgba(6,182,212,0.10)', orange:'#f97316',
  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const glass  = (x={}) => ({ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.b1}`, borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...x });
const glass2 = (x={}) => ({ background:'rgba(255,255,255,0.025)', border:`1px solid ${C.b1}`, borderRadius:10, padding:14, ...x });
const btn    = (bg=C.blueGrad,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'none', background:bg, color:'#fff', fontWeight:600, fontSize:13, fontFamily:C.FB, cursor:'pointer', letterSpacing:'.01em', boxShadow:bg===C.blueGrad?'0 4px 16px rgba(45,127,255,0.35),inset 0 1px 0 rgba(255,255,255,0.12)':'0 2px 8px rgba(0,0,0,0.3)', transition:'all .18s cubic-bezier(.16,1,.3,1)', ...x });
const btnSm  = (bg='rgba(255,255,255,0.08)',x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 14px', borderRadius:7, border:`1px solid ${C.b1}`, background:bg, color:'#fff', fontWeight:600, fontSize:12, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
const btnG   = (x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:9, border:`1px solid rgba(255,255,255,0.1)`, background:'transparent', color:C.t2, fontWeight:500, fontSize:13, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
const inp    = (x={}) => ({ background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.1)`, borderRadius:10, padding:'10px 14px', color:C.t1, fontSize:13, fontFamily:C.FB, outline:'none', width:'100%', transition:'border-color .15s,box-shadow .15s', ...x });
const lbl    = (x={}) => ({ fontSize:10, fontWeight:700, color:C.t3, letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:7, ...x });
const R      = (x={}) => ({ display:'flex', alignItems:'center', gap:12, ...x });
const CC     = (x={}) => ({ display:'flex', flexDirection:'column', gap:12, ...x });
const G      = (cols=2,gap=14,x={},m=false) => ({ display:'grid', gridTemplateColumns:m?(cols<=2?'1fr':'repeat(2,1fr)'):`repeat(${cols},1fr)`, gap, ...x });
const pill   = (bg,color,x={}) => ({ display:'inline-flex', alignItems:'center', padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'.04em', background:bg, color, ...x });

// ── Quiz scrambling ───────────────────────────────────────────────────────────
function shuffleArr(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const TOTAL_QUESTIONS = ALL_QUIZZES.reduce((n,q)=>n+q.qs.length,0);
function scrambleQuiz(quiz){
  const qs = quiz.qs;
  const shuffled = shuffleArr(qs);
  if (quiz.sameChoices) {
    const numChoices = shuffled[0].ch.length;
    const idx = shuffleArr([...Array(numChoices).keys()]);
    return shuffled.map(q => ({
      ...q,
      ch: idx.map(i => q.ch[i]),
      ans: idx.indexOf(q.ans)
    }));
  }
  return shuffled.map(q=>{
    const idx=shuffleArr([...Array(q.ch.length).keys()]);
    return{...q,ch:idx.map(i=>q.ch[i]),ans:idx.indexOf(q.ans)};
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtT   = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const scCol  = p => p>=80?C.green:p>=60?C.blue:C.amber;
const tierC  = t => ({Likely:C.green,Target:C.blue,Reach:C.amber,Stretch:C.rose}[t]||C.t2);
const AI_MSG = 'AI features require an OpenAI API key. Set OPENAI_KEY in your Vercel environment variables.';

// Quiz performance % → predicted SAT score (400–1600)
const scoreToSection = p => Math.round(400+(Math.max(0,Math.min(100,p))/100)*1200);

function scoreSchool(s, gpa, sat, lead, ec, vol, st, specialty = 'exploring', rigor = '2', clinicalHours = 0) {
  let sc = 100;
  const gN = parseFloat(gpa) || 0;
  const sN = parseInt(sat) || 0;
  const gd = gN - (s.gpa || 3.5);
  const sd = sN - (s.sat || 1200);

  // GPA Weighting
  if (gd >= 0) sc += 15;
  else if (gd >= -0.1) sc -= 5;
  else if (gd >= -0.2) sc -= 15;
  else if (gd >= -0.3) sc -= 25;
  else sc -= 40;

  // SAT Weighting
  if (sd >= 0) sc += 15;
  else if (sd >= -40) sc -= 5;
  else if (sd >= -80) sc -= 15;
  else if (sd >= -120) sc -= 25;
  else sc -= 40;

  // Rigor Weighting (Science Course Rigor)
  const rN = parseInt(rigor) || 0;
  if (rN >= 8) sc += 10;
  else if (rN >= 5) sc += 6;
  else if (rN >= 3) sc += 3;

  // Leadership Experience Score
  sc += Math.min((parseInt(lead) || 0) * 4, 12);

  // Extracurricular Hours Score
  const cHours = parseInt(ec) || 0;
  sc += cHours >= 400 ? 10 : cHours >= 200 ? 6 : cHours >= 100 ? 3 : 0;

  // Volunteer Hours Score
  const v = parseInt(vol) || 0;
  sc += v >= 200 ? 8 : v >= 100 ? 5 : v >= 50 ? 2 : 0;

  // Clinical Hours Score (Highly valued in pre-health pathways)
  const clin = parseInt(clinicalHours) || 0;
  if (clin >= 150) sc += 12;
  else if (clin >= 80) sc += 8;
  else if (clin >= 40) sc += 4;
  else if (clin >= 20) sc += 2;

  // In-state Public Tuition Advantage & Admissions Preference
  if (s.type === 'Public' && st && s.state === st) sc += 15;

  // Pre-Med Committee Boost
  if (s.hasPreMedCommittee) sc += 5;

  // BS/MD Direct Medical Track Interest
  if (s.bsmd) sc += 5;

  // Specialty Match Bonuses
  if (s.specialtyStrong === 'Pre-Med' && (specialty === 'physician' || specialty === 'physicianAssistant')) {
    sc += 10;
  } else if (s.specialtyStrong === 'Nursing' && specialty === 'nursing') {
    sc += 10;
  } else if (s.specialtyStrong === 'Pharmacy' && specialty === 'pharmacy') {
    sc += 10;
  } else if (s.specialtyStrong === 'Dentistry' && specialty === 'dentistry') {
    sc += 10;
  } else if (s.specialtyStrong === 'Research' && specialty === 'biomedResearch') {
    sc += 10;
  }

  // Determine Tier
  const tier = sc >= 115 ? 'Likely' : sc >= 95 ? 'Target' : sc >= 75 ? 'Reach' : 'Stretch';

  // Customized reasons for why this fits the student
  let reasons = [];
  if (gN >= s.gpa) {
    reasons.push(`Your GPA is above the average admitted GPA of ${s.gpa}.`);
  }
  if (sN >= s.sat) {
    reasons.push(`Your test score meets or exceeds their mid-50% SAT threshold.`);
  }
  if (s.type === 'Public' && st === s.state) {
    reasons.push(`You have the in-state tuition and admission rate advantage.`);
  }
  if (s.bsmd) {
    reasons.push(`Offers an exceptional direct BS/MD or BS/DO pathway for high schoolers.`);
  }
  if (s.hasPreMedCommittee) {
    reasons.push(`An active Pre-Med Committee is available to write composite LORs.`);
  }
  if (s.specialtyStrong === 'Pre-Med' && (specialty === 'physician' || specialty === 'physicianAssistant')) {
    reasons.push(`Renowned for world-class pre-med advising and med school placements.`);
  }
  if (s.specialtyStrong && s.specialtyStrong.toLowerCase() === specialty.toLowerCase()) {
    reasons.push(`Provides elite, top-tier clinical and professional training specifically in ${specialty}.`);
  }
  if (s.clinicalProximity === 'Excellent') {
    reasons.push(`Excellent proximity to medical centers, offering superior shadowing/volunteer access.`);
  }
  if (clin >= 80) {
    reasons.push(`Your extensive clinical exposure (${clin} hrs) stands out strongly.`);
  }
  if (rN >= 5) {
    reasons.push(`Your rigorous curriculum (${rN} advanced classes) demonstrates academic strength.`);
  }

  const whyMatch = reasons.length > 0 ? reasons.slice(0, 3).join(' ') : `A solid choice with a pre-health program rank of ${s.preHealthRank || 3}/5.`;

  return {
    ...s,
    tier,
    score: sc,
    whyMatch,
    academicIndex: Math.min(100, Math.round(((gN / 4.0) * 50) + ((sN / 1600) * 40) + ((rN / 10) * 10))),
    experienceIndex: Math.min(100, Math.round((Math.min(100, clin) * 0.4) + (Math.min(200, v) / 200 * 30) + (Math.min(500, cHours) / 500 * 20) + (Math.min(5, parseInt(lead) || 0) / 5 * 10)))
  };
}

// Boiled down from 17 flat destinations to 4: Home + three pillars. Prep and
// Portfolio each absorb several formerly-top-level tabs via their own SubNav
// (see prepView/portfolioView state + PREP_SUBNAV/PORTFOLIO_SUBNAV below).
// Settings lives in the account menu (avatar click), not the main nav.
const NAV = [
  {id:'home',ic:Home,label:'Home'},
  {id:'prep',ic:Compass,label:'Prep'},
  {id:'portfolio',ic:Building2,label:'Portfolio'},
  {id:'progress',ic:LineChart,label:'Progress'},
  {id:'settings',ic:Settings,label:'Settings'},
];
const PREP_SUBNAV = [
  {id:'diagnostic',ic:Compass,label:'Diagnostic'},
  {id:'pathway',ic:Route,label:'Pathway'},
  {id:'quizzes',ic:Layers,label:'Quiz Library'},
  {id:'flashcards',ic:Layers3,label:'Flashcards'},
  {id:'coach',ic:MessageCircle,label:'AI Coach'},
  {id:'library',ic:BookOpen,label:'E-Library'},
];
const PORTFOLIO_SUBNAV = [
  {id:'overview',ic:Building2,label:'Overview'},
  {id:'timeline',ic:Milestone,label:'Timeline'},
  {id:'colleges',ic:GraduationCap,label:'College List'},
  {id:'essays',ic:ScrollText,label:'Essays'},
  {id:'deadlines',ic:CalendarDays,label:'Deadlines'},
  {id:'aid',ic:Handshake,label:'Financial Aid'},
  {id:'resume',ic:Award,label:'Activities & Resume'},
  {id:'research',ic:FlaskConical,label:'Research'},
  {id:'skills',ic:BadgeCheck,label:'Skills & Certs'},
  {id:'clinical',ic:Stethoscope,label:'Clinical Hours'},
  {id:'recommenders',ic:UserCheck,label:'Recommenders'},
  {id:'interview',ic:Mic,label:'Interview Prep'},
  {id:'scores',ic:TrendingUp,label:'Test Scores'},
  {id:'calc',ic:Calculator,label:'Admissions Calc'},
];
const PROGRESS_SUBNAV = [
  {id:'overview',ic:LineChart,label:'Overview'},
  {id:'verified',ic:ShieldCheck,label:'Verified Progress'},
  {id:'performance',ic:TrendingUp,label:'Performance'},
  {id:'achievements',ic:Trophy,label:'Achievements'},
];
const QUICK_P_GROUPS = [
  { label:'Content Help', icon:'FlaskConical', prompts:[
    'Explain how to solve a system of equations simply',
    'What is photosynthesis and why does it matter?',
    'Explain supply and demand with an example',
  ]},
  { label:'Study Strategy', icon:'Compass', prompts:[
    'How do I approach SAT Reading passages on test day?',
    'Most high-yield topics for SAT Math?',
    'Give me a 2-week study schedule for the ACT Science section',
  ]},
];
const LIB_CATS  = ['All','Life Sciences','Physical Sciences','Behavioral & Social Sciences','Research Methods','Test Prep','Admissions & Planning'];
const COURSE_GROUPS = [
  { group:'Math', items:['Algebra II','Precalculus','Calculus AB','Calculus BC','Statistics'] },
  { group:'Science', items:['Biology','Chemistry','Physics','Environmental Science'] },
  { group:'English', items:['English','AP English Language','AP English Literature'] },
  { group:'History & Social Studies', items:['US History','World History','AP US History','AP World History','AP Government','AP Psychology'] },
  { group:'World Language', items:['Spanish','French','Mandarin','Other Language'] },
];
// ── Responsive hook ───────────────────────────────────────────────────────────
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

// ── KaTeX math renderer ───────────────────────────────────────────────────────
function MathText({ text, style }) {
  if (!text) return null;
  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return (
    <span style={style}>
      {parts.map((p, i) => {
        try {
          if (p.startsWith('$$') && p.endsWith('$$')) {
            return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(p.slice(2,-2), { displayMode:true, throwOnError:false }) }} />;
          }
          if (p.startsWith('$') && p.endsWith('$') && p.length > 2) {
            return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(p.slice(1,-1), { displayMode:false, throwOnError:false }) }} />;
          }
        } catch { /* fallback to plain */ }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:false,msg:''};}
  static getDerivedStateFromError(e){return{err:true,msg:e?.message||'Unexpected error'};}
  componentDidCatch(e,i){console.error('MSP:',e,i);}
  render(){
    if(this.state.err) return(
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,fontFamily:C.FB,flexDirection:'column',gap:20,padding:40}}>
        <div style={{width:60,height:60,borderRadius:'50%',background:C.roseDim,border:`1px solid ${C.rose}40`,display:'flex',alignItems:'center',justifyContent:'center'}}><AlertTriangle size={26} color={C.rose}/></div>
        <h2 style={{fontSize:20,fontWeight:700,color:C.t1,fontFamily:C.FD}}>Something went wrong</h2>
        <p style={{color:C.t2,textAlign:'center',maxWidth:400,lineHeight:1.7,fontSize:14}}>{this.state.msg}</p>
        <button style={btn()} onClick={()=>this.setState({err:false})}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
}

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:C.bg,fontFamily:C.FB,gap:20}}>
      <div style={{width:56,height:56,borderRadius:16,background:C.blueDim,border:`1px solid ${C.blue}30`,display:'flex',alignItems:'center',justifyContent:'center',animation:'spin 1.1s linear infinite'}}><RefreshCw size={26} color={C.blue}/></div>
      <div style={{fontSize:14,color:C.t3,letterSpacing:'.05em'}}>Loading MedSchoolPrep…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Arc (circular progress) ───────────────────────────────────────────────────
function Arc({pct=0,size=52,stroke=4,color=C.blue,label='',sub=''}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r,off=circ-(Math.min(100,Math.max(0,pct))/100)*circ;
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.s4} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)',filter:`drop-shadow(0 0 4px ${color}80)`}}/>
      </svg>
      {label&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:size>60?14:10,fontWeight:700,color,fontFamily:C.FM,lineHeight:1}}>{label}</span>
        {sub&&<span style={{fontSize:9,color:C.t3,lineHeight:1,marginTop:1}}>{sub}</span>}
      </div>}
    </div>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────
function Bar({pct=0,color=C.blue,h=4,glow=false}){
  return(
    <div style={{height:h,background:'rgba(255,255,255,0.06)',borderRadius:h,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${Math.min(100,Math.max(0,pct))}%`,background:color,borderRadius:h,transition:'width .6s cubic-bezier(.16,1,.3,1)',boxShadow:glow?`0 0 12px ${color}70`:undefined}}/>
    </div>
  );
}

// ── Dot (mastery status) ──────────────────────────────────────────────────────
function Dot({state='locked'}){
  const cfg={
    verified:{bg:C.green,Ic:ShieldCheck,c:'#fff',sz:12},
    done:{bg:C.green,Ic:Check,c:'#fff',sz:12},
    studying:{bg:'transparent',Ic:BookOpen,c:C.amberL,brd:C.amberL,sz:10},
    available:{bg:'transparent',Ic:Circle,c:C.blueL,brd:C.blueL,sz:8},
    locked:{bg:'transparent',Ic:Lock,c:C.t4,brd:C.t4,sz:10},
  };
  const d=cfg[state]||cfg.locked;
  return<span style={{width:22,height:22,borderRadius:'50%',background:d.bg,border:`1.5px solid ${d.brd||C.green}`,display:'inline-flex',alignItems:'center',justifyContent:'center',color:d.c,flexShrink:0,boxShadow:(state==='done'||state==='verified')?`0 0 8px ${C.green}60`:undefined}}><d.Ic size={d.sz} strokeWidth={state==='available'||state==='studying'?0:2.5} fill={state==='available'||state==='studying'?d.c:'none'}/></span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({label,value,icon,color=C.blue,sub,onClick,m=false}){
  return(
    <div onClick={onClick} style={{...glass({padding:m?16:20}),position:'relative',overflow:'hidden',cursor:onClick?'pointer':undefined,transition:'all .2s'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${color},transparent)`}}/>
      <div style={R({gap:m?10:12,alignItems:'flex-start'})}>
        <div style={{width:m?32:36,height:m?32:36,borderRadius:10,background:`${color}18`,border:`1px solid ${color}25`,display:'flex',alignItems:'center',justifyContent:'center',color,flexShrink:0,boxShadow:`0 4px 12px ${color}20`}}>{icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:m?20:26,fontWeight:800,fontFamily:C.FM,lineHeight:1,marginBottom:4,background:`linear-gradient(135deg,${color},${color}aa)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{value}</div>
          <div style={{fontSize:m?11:12,color:C.t2,fontWeight:600}}>{label}</div>
          {sub&&<div style={{fontSize:10,color:C.t3,marginTop:2}}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Page header (colored icon badge + eyebrow/title/sub) ─────────────────────
// A single reusable header pattern applied across Progress/Portfolio/Flashcards
// so the top of every section reads as one consistent, colorful design system
// instead of each tab inventing its own title treatment.
function PageHeader({icon,color=C.blue,eyebrow,title,sub,right,m=false}){
  const Ic=icon;
  return(
    <div style={{...glass({padding:m?16:20,background:`linear-gradient(120deg,${color}14,transparent 70%)`,border:`1px solid ${color}25`}),display:'flex',alignItems:'center',gap:m?12:16,flexWrap:'wrap'}}>
      {Ic&&<div style={{width:m?38:46,height:m?38:46,borderRadius:14,background:`linear-gradient(135deg,${color}40,${color}18)`,border:`1.5px solid ${color}45`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 6px 18px ${color}25`}}><Ic size={m?18:22} color={color}/></div>}
      <div style={{flex:1,minWidth:160}}>
        {eyebrow&&<div style={{fontSize:10,fontWeight:700,color:color,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:3}}>{eyebrow}</div>}
        <h2 style={{fontSize:m?19:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>{title}</h2>
        {sub&&<div style={{fontSize:m?11.5:12.5,color:C.t2,marginTop:4,lineHeight:1.5,maxWidth:520}}>{sub}</div>}
      </div>
      {right&&<div style={{flexShrink:0}}>{right}</div>}
    </div>
  );
}

// ── Video Modal ───────────────────────────────────────────────────────────────
// YouTube's postMessage-based IFrame Player API is the only client-side way to know
// whether a given ytId actually loaded (vs. removed/private/embedding-disabled) —
// a plain <iframe> never fires a DOM error for that. We load the API once, attach a
// player to our iframe, and surface real onError codes as a graceful fallback UI
// instead of a silently broken embed.
function extractYouTubeId(url){
  if(!url)return null;
  const m=String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  return m?m[1]:null;
}
let ytApiPromise=null;
function loadYouTubeIframeAPI(){
  if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
  if(ytApiPromise)return ytApiPromise;
  ytApiPromise=new Promise(resolve=>{
    const prev=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{prev&&prev();resolve(window.YT);};
    if(!document.getElementById('yt-iframe-api')){
      const tag=document.createElement('script');
      tag.id='yt-iframe-api';
      tag.src='https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}
const YT_ERROR_MESSAGES={
  2:'This video link looks malformed.',
  5:"This video can't be played in the current browser.",
  100:'This video was removed or made private.',
  101:'The video owner disabled embedded playback.',
  150:'The video owner disabled embedded playback.',
};
function VideoModal({ytId,title,url,onClose,m=false}){
  const frameId=useRef(`ytp-${ytId}-${Math.random().toString(36).slice(2)}`).current;
  const playerRef=useRef(null);
  const [status,setStatus]=useState('loading'); // loading | ready | error | timeout
  const [errMsg,setErrMsg]=useState('');
  const watchUrl=url||`https://www.youtube.com/watch?v=${ytId}`;

  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[onClose]);

  useEffect(()=>{
    let cancelled=false;
    const timeout=setTimeout(()=>setStatus(s=>s==='loading'?'timeout':s),9000);
    loadYouTubeIframeAPI().then(YT=>{
      if(cancelled)return;
      playerRef.current=new YT.Player(frameId,{
        events:{
          onReady:()=>{if(!cancelled)setStatus('ready');},
          onError:(e)=>{
            if(cancelled)return;
            setErrMsg(YT_ERROR_MESSAGES[e?.data]||'This video failed to load.');
            setStatus('error');
          },
        },
      });
    });
    return ()=>{cancelled=true;clearTimeout(timeout);try{playerRef.current?.destroy?.();}catch{}};
  },[frameId]);

  const broken=status==='error'||status==='timeout';
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.93)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:m?12:24,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{scale:.95,y:10}} animate={{scale:1,y:0}} exit={{scale:.95,y:10}} style={{width:'100%',maxWidth:920,...glass({padding:0,overflow:'hidden',borderRadius:m?12:20,border:`1px solid ${C.b2}`,boxShadow:'0 40px 100px rgba(0,0,0,0.9)'})}}>
        <div style={{...R({justifyContent:'space-between'}),padding:'14px 20px',borderBottom:`1px solid ${C.b1}`,background:C.s1}}>
          <div style={R({gap:10})}>
            <span style={{...pill('rgba(239,68,68,0.2)','#f87171',{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}><Play size={9} fill="currentColor"/>YouTube</span>
            <span style={{fontSize:14,fontWeight:600,color:C.t1,fontFamily:C.FB}}>{title}</span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.t3,cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.color=C.t1} onMouseLeave={e=>e.currentTarget.style.color=C.t3}><X size={16}/></button>
        </div>
        <div style={{position:'relative',paddingBottom:'56.25%',height:0}}>
          <iframe id={frameId} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none',visibility:broken?'hidden':'visible'}} src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
          {status==='loading'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:C.s1,pointerEvents:'none'}}>
            <div style={{width:32,height:32,borderRadius:'50%',border:`3px solid ${C.b2}`,borderTopColor:C.blue,animation:'spin .8s linear infinite'}}/>
          </div>}
          {broken&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:C.s1,padding:24,textAlign:'center'}}>
            <AlertTriangle size={28} color="#f87171"/>
            <div style={{fontSize:13,color:C.t2,maxWidth:380,lineHeight:1.6}}>{status==='timeout'?"This video is taking too long to respond — it may be region-locked or temporarily unavailable.":errMsg}</div>
            <a href={watchUrl} target="_blank" rel="noreferrer" style={{...btnSm(C.blueDim,{color:C.blueL,border:`1px solid ${C.blue}30`,textDecoration:'none',fontSize:12}),display:'inline-flex',alignItems:'center',gap:6}}>Watch on YouTube<ExternalLink size={12}/></a>
          </div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
// ── Lesson Video (inline, non-modal — embedded as one step of LessonPlayer) ──
// Same YouTube IFrame Player API technique as VideoModal (real embed + error
// detection), but rendered inline in a wizard step instead of a popup, and
// tracking watch progress so the quiz step can gate on it actually finishing.
function LessonVideoInline({ytId,title,onWatched,watched=false}){
  const frameId=useRef(`ytlp-${ytId}-${Math.random().toString(36).slice(2)}`).current;
  const playerRef=useRef(null);
  const watchedRef=useRef(watched);
  const [status,setStatus]=useState('loading'); // loading | ready | error | timeout

  useEffect(()=>{
    let cancelled=false;
    let poll=null;
    const timeout=setTimeout(()=>setStatus(s=>s==='loading'?'timeout':s),9000);
    loadYouTubeIframeAPI().then(YT=>{
      if(cancelled)return;
      playerRef.current=new YT.Player(frameId,{
        events:{
          onReady:()=>{if(!cancelled)setStatus('ready');},
          onStateChange:(e)=>{
            if(cancelled)return;
            if(e.data===YT.PlayerState.ENDED&&!watchedRef.current){watchedRef.current=true;onWatched();}
            if(e.data===YT.PlayerState.PLAYING&&!poll){
              poll=setInterval(()=>{
                try{
                  const p=playerRef.current;
                  const dur=p?.getDuration?.();
                  const cur=p?.getCurrentTime?.();
                  if(dur>0&&cur/dur>=0.9&&!watchedRef.current){watchedRef.current=true;onWatched();}
                }catch{/* player not ready yet */}
              },2000);
            }
          },
          onError:(e)=>{
            if(cancelled)return;
            setStatus('error');
            playerRef.current={...playerRef.current,_errMsg:YT_ERROR_MESSAGES[e?.data]||'This video failed to load.'};
          },
        },
      });
    });
    return ()=>{cancelled=true;clearTimeout(timeout);if(poll)clearInterval(poll);try{playerRef.current?.destroy?.();}catch{}};
  },[frameId]);

  const broken=status==='error'||status==='timeout';
  return(
    <div>
      <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:14,overflow:'hidden',border:`1px solid ${C.b1}`,background:C.s1}}>
        <iframe id={frameId} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none',visibility:broken?'hidden':'visible'}} src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`} title={title} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
        {status==='loading'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:`3px solid ${C.b2}`,borderTopColor:C.blue,animation:'spin .8s linear infinite'}}/>
        </div>}
        {broken&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20,textAlign:'center'}}>
          <AlertTriangle size={24} color="#f87171"/>
          <div style={{fontSize:12.5,color:C.t2,maxWidth:320,lineHeight:1.6}}>{status==='timeout'?"This video is taking too long to respond — it may be temporarily unavailable.":(playerRef.current?._errMsg||'This video failed to load.')}</div>
          <div style={R({gap:8})}>
            <a href={`https://www.youtube.com/watch?v=${ytId}`} target="_blank" rel="noreferrer" style={{...btnSm(C.blueDim,{color:C.blueL,border:`1px solid ${C.blue}30`,textDecoration:'none',fontSize:11.5}),display:'inline-flex',alignItems:'center',gap:5}}>Watch on YouTube<ExternalLink size={11}/></a>
            {!watched&&<button style={btnSm(C.s3,{color:C.t2,fontSize:11.5})} onClick={()=>{watchedRef.current=true;onWatched();}}>Continue anyway</button>}
          </div>
        </div>}
      </div>
      {!broken&&<div style={{fontSize:11,color:C.t3,marginTop:8,textAlign:'center'}}>{watched?'Watched — you can continue.':'Watch to the end to unlock the verification quiz.'}</div>}
    </div>
  );
}

// ── Lesson Player (immersive, mobile-first, full-app-takeover lesson flow) ──
// Overview -> Article -> Video -> Quiz -> Complete. Replaces the old
// "Study opens an external tab / modal, Verify is a separate button" flow —
// every step happens inside one continuous, swipeable-feeling wizard so a
// pathway lesson never bounces the student out of the app. The Quiz step
// hands off to the app's existing aQuiz/QuizEngine fullscreen gate (reusing
// openVerifyQuiz/finishQuiz as-is) rather than duplicating quiz logic here.
function LessonPlayer({lesson,unit,pathwayLabel,pathwayEntry,step,onStep,articleRead,onArticleRead,videoWatched,onVideoWatched,onClose,onStartQuiz,onNextLesson,hasNextLesson,accent=C.blue,m=false}){
  const content = LESSON_CONTENT[lesson.id];
  const videoId = content?.video?.ytId || extractYouTubeId(lesson.url);
  const hasArticle = !!content?.article;
  const hasVideo = !!videoId;
  const isVerified = !!pathwayEntry?.verified;
  const stepOrder = ['overview', hasArticle&&'article', hasVideo&&'video', 'quiz', 'complete'].filter(Boolean);
  const curIdx = Math.max(0,stepOrder.indexOf(step));
  const articleScrollRef = useRef(null);

  function goNext(){
    const idx=stepOrder.indexOf(step);
    if(idx<stepOrder.length-1)onStep(stepOrder[idx+1]);
  }
  function goBack(){
    const idx=stepOrder.indexOf(step);
    if(idx>0)onStep(stepOrder[idx-1]);
  }
  function handleArticleScroll(e){
    const el=e.target;
    if(!articleRead&&el.scrollHeight-el.scrollTop-el.clientHeight<48)onArticleRead();
  }

  const canContinueArticle = !hasArticle || articleRead;
  const canContinueVideo = !hasVideo || videoWatched;

  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{minHeight:'100vh',background:C.bg,color:C.t1,fontFamily:C.FB,display:'flex',flexDirection:'column'}}>
      {/* Header — progress dots + close */}
      <div style={{position:'sticky',top:0,zIndex:20,background:`${C.bg}f2`,backdropFilter:'blur(12px)',borderBottom:`1px solid ${C.b1}`,padding:m?'12px 14px':'16px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:720,margin:'0 auto',width:'100%'}}>
          <button onClick={onClose} aria-label="Close lesson" style={{background:'none',border:'none',color:C.t3,cursor:'pointer',width:40,height:40,minWidth:40,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:10,flexShrink:0}}><X size={18}/></button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:m?12:13,fontWeight:700,color:C.t1,fontFamily:C.FD,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{lesson.title}</div>
            <div style={{fontSize:10,color:C.t3,marginTop:1}}>{unit.title}{pathwayLabel?` · ${pathwayLabel}`:''}</div>
          </div>
          <div style={{display:'flex',gap:5,flexShrink:0}}>
            {stepOrder.map((s,i)=>(
              <span key={s} style={{width:i===curIdx?18:7,height:7,borderRadius:4,background:i<curIdx||isVerified?C.green:i===curIdx?accent:C.s4,transition:'all .25s'}}/>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:step==='article'?undefined:'auto'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:m?'20px 16px 100px':'32px 24px 110px',width:'100%',boxSizing:'border-box'}}>

          {step==='overview'&&(
            <div style={CC({gap:18})}>
              <div style={{width:56,height:56,borderRadius:16,background:`${accent}18`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center'}}><BookOpen size={24} color={accent}/></div>
              <h2 style={{fontSize:m?21:26,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>{lesson.title}</h2>
              <div style={R({gap:14,flexWrap:'wrap'})}>
                {hasArticle&&<span style={{...pill(C.s3,C.t2,{fontSize:10.5}),display:'inline-flex',alignItems:'center',gap:5}}><ScrollText size={11}/>{content.readMins||5} min read</span>}
                {hasVideo&&<span style={{...pill(C.s3,C.t2,{fontSize:10.5}),display:'inline-flex',alignItems:'center',gap:5}}><Play size={10}/>Video</span>}
                <span style={{...pill(C.greenDim,C.greenL,{fontSize:10.5}),display:'inline-flex',alignItems:'center',gap:5}}><ShieldCheck size={11}/>Verified quiz</span>
              </div>
              {lesson.objectives?.length>0&&(
                <div style={glass2({padding:16})}>
                  <div style={{fontSize:9.5,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>What you'll learn</div>
                  <div style={CC({gap:8})}>
                    {lesson.objectives.map((o,i)=>(
                      <div key={i} style={{fontSize:13,color:C.t2,display:'flex',gap:8,alignItems:'flex-start',lineHeight:1.5}}><span style={{color:accent,flexShrink:0,marginTop:1}}>–</span>{o}</div>
                    ))}
                  </div>
                </div>
              )}
              {!hasArticle&&lesson.url&&(
                <div style={{...glass2({padding:14,background:C.amberDim,border:`1px solid ${C.amber}25`})}}>
                  <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>This lesson's full in-house article hasn't been migrated off its original source yet — you'll see the reference material and a dedicated verification quiz below.</div>
                </div>
              )}
              {isVerified&&<div style={{...pill(C.greenDim,C.greenL,{fontSize:11}),display:'inline-flex',alignItems:'center',gap:6,alignSelf:'flex-start'}}><ShieldCheck size={12}/>Already verified{pathwayEntry?.quizScore!=null?` · ${pathwayEntry.quizScore}%`:''}</div>}
            </div>
          )}

          {step==='article'&&hasArticle&&(
            <div ref={articleScrollRef} onScroll={handleArticleScroll} style={{maxHeight:m?'calc(100vh - 210px)':'calc(100vh - 230px)',overflowY:'auto',paddingRight:4}}>
              <div style={CC({gap:22})}>
                {content.article.sections.map((sec,i)=>(
                  <div key={i}>
                    <h3 style={{fontSize:m?15:17,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:8}}>{sec.heading}</h3>
                    <p style={{fontSize:m?13.5:14.5,color:C.t2,lineHeight:1.75,margin:0}}>{sec.body}</p>
                  </div>
                ))}
                {content.article.keyTakeaways?.length>0&&(
                  <div style={{...glass2({padding:16,background:`${accent}0a`,border:`1px solid ${accent}25`})}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:accent,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Key takeaways</div>
                    <div style={CC({gap:8})}>
                      {content.article.keyTakeaways.map((t,i)=>(
                        <div key={i} style={{fontSize:12.5,color:C.t2,display:'flex',gap:8,alignItems:'flex-start',lineHeight:1.55}}><Check size={13} color={accent} style={{flexShrink:0,marginTop:2}}/>{t}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{height:1}}/>
                {!articleRead&&<div style={{fontSize:11,color:C.t3,textAlign:'center',padding:'8px 0'}}>Scroll to the end to continue</div>}
              </div>
            </div>
          )}

          {step==='video'&&hasVideo&&(
            <div style={CC({gap:14})}>
              <LessonVideoInline ytId={videoId} title={content?.video?.title||lesson.title} watched={videoWatched} onWatched={onVideoWatched}/>
              {content?.video?.channel&&<div style={{fontSize:11,color:C.t3,textAlign:'center'}}>via {content.video.channel}</div>}
            </div>
          )}

          {step==='quiz'&&(
            <div style={CC({gap:16,alignItems:'center',textAlign:'center',paddingTop:20})}>
              <div style={{width:64,height:64,borderRadius:18,background:`${C.green}18`,border:`1px solid ${C.green}35`,display:'flex',alignItems:'center',justifyContent:'center'}}><ShieldCheck size={28} color={C.green}/></div>
              <h3 style={{fontSize:m?18:21,fontWeight:800,color:C.t1,fontFamily:C.FD,margin:0}}>Ready to verify this lesson?</h3>
              <p style={{fontSize:13,color:C.t2,lineHeight:1.7,maxWidth:420,margin:0}}>Pass the quiz at 70% or higher to mark "{lesson.title}" verified — this is the only thing that actually counts toward unit and pathway mastery.</p>
              {pathwayEntry?.quizScore!=null&&!isVerified&&<div style={{...pill(C.roseDim,C.rose,{fontSize:11})}}>Last attempt: {pathwayEntry.quizScore}% — try again below</div>}
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} style={{...btn(`linear-gradient(135deg,${C.green},#059669)`,{padding:'13px 28px',fontSize:14}),display:'inline-flex',alignItems:'center',gap:8}} onClick={onStartQuiz}>{pathwayEntry?.quizScore!=null?'Try Again':'Start Verification Quiz'}<ArrowRight size={15}/></motion.button>
            </div>
          )}

          {step==='complete'&&(
            <div style={CC({gap:16,alignItems:'center',textAlign:'center',paddingTop:24})}>
              <div style={{width:72,height:72,borderRadius:20,background:`${C.green}18`,border:`1px solid ${C.green}35`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 30px ${C.green}30`}}><ShieldCheck size={32} color={C.green}/></div>
              <h3 style={{fontSize:m?20:24,fontWeight:800,color:C.t1,fontFamily:C.FD,margin:0}}>Lesson verified{pathwayEntry?.quizScore!=null?` — ${pathwayEntry.quizScore}%`:''}</h3>
              <p style={{fontSize:13,color:C.t2,lineHeight:1.7,maxWidth:420,margin:0}}>"{lesson.title}" is locked in for good. {hasNextLesson?'Keep the momentum going with the next one.':'That was the last lesson in this unit — nice work.'}</p>
              <div style={R({gap:10,justifyContent:'center',flexWrap:'wrap'})}>
                {hasNextLesson&&<motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} style={{...btn(accent===C.blue?C.blueGrad:`linear-gradient(135deg,${accent},${accent}cc)`,{padding:'12px 24px',fontSize:13}),display:'inline-flex',alignItems:'center',gap:8}} onClick={onNextLesson}>Next Lesson<ArrowRight size={14}/></motion.button>}
                <button style={{...btnG({padding:'12px 20px',fontSize:13}),display:'inline-flex',alignItems:'center',gap:6}} onClick={onClose}>Back to Pathway</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer nav — big, thumb-reachable tap targets */}
      {step!=='quiz'&&step!=='complete'&&(
        <div style={{position:'sticky',bottom:0,background:`${C.bg}f5`,backdropFilter:'blur(12px)',borderTop:`1px solid ${C.b1}`,padding:m?'12px 14px':'16px 24px',paddingBottom:m?'calc(12px + env(safe-area-inset-bottom))':16}}>
          <div style={{display:'flex',gap:10,maxWidth:720,margin:'0 auto'}}>
            <button onClick={goBack} disabled={curIdx===0} style={{...btnG({flex:'0 0 auto',padding:'14px 18px',fontSize:13,opacity:curIdx===0?.4:1,minHeight:48}),display:'inline-flex',alignItems:'center',gap:6}}><ChevronLeft size={16}/>Back</button>
            <motion.button whileHover={{scale:1.01}} whileTap={{scale:.98}} onClick={goNext}
              disabled={(step==='article'&&!canContinueArticle)||(step==='video'&&!canContinueVideo)}
              style={{...btn(accent===C.blue?C.blueGrad:`linear-gradient(135deg,${accent},${accent}cc)`,{flex:1,padding:'14px 18px',fontSize:14,minHeight:48,opacity:((step==='article'&&!canContinueArticle)||(step==='video'&&!canContinueVideo))?.45:1,cursor:((step==='article'&&!canContinueArticle)||(step==='video'&&!canContinueVideo))?'not-allowed':'pointer'}),display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {step==='overview'?'Begin':'Continue'}<ChevronRight size={16}/>
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Quiz Engine ───────────────────────────────────────────────────────────────
function QuizEngine({quiz,onFinish,onClose,accent=C.blue,readonly=false,m=false}){
  const scoreRef=useRef(0);
  const [qi,setQi]=useState(0);const [sel,setSel]=useState(null);const [conf,setConf]=useState(false);
  const [answers,setAnswers]=useState([]);const [phase,setPhase]=useState('quiz');const [ri,setRi]=useState(0);
  const [scrambledQs]=useState(()=>readonly?quiz.qs:scrambleQuiz(quiz));
  const [elapsed,setElapsed]=useState(0);
  const tot=scrambledQs.length,q=scrambledQs[qi],prog=Math.round(((qi+(conf?1:0))/tot)*100);

  useEffect(()=>{
    if(readonly||phase!=='quiz')return;
    const id=setInterval(()=>setElapsed(t=>t+1),1000);
    return()=>clearInterval(id);
  },[readonly,phase]);

  function confirm(){
    if(sel===null||conf)return;
    const ok=sel===q.ans;
    if(ok){scoreRef.current++;play('correct');}else play('wrong');
    setAnswers(a=>[...a,{q:q.q,choices:q.ch,sel,correct:q.ans,exp:q.exp,ok}]);
    setConf(true);
  }
  function next(){if(qi<tot-1){setQi(i=>i+1);setSel(null);setConf(false);}else setPhase('review');}

  if(phase==='review'){
    const pct=tot>0?Math.round((scoreRef.current/tot)*100):0;
    const sc=scCol(pct);const a=answers[ri];
    if(pct===100)setTimeout(()=>celebratePerfect(),100);
    return(
      <div style={{padding:m?16:28}}>
        <div style={{...glass({padding:32,background:`${sc}08`,border:`1px solid ${sc}20`,marginBottom:24,textAlign:'center'})}}>
          <Arc pct={pct} size={96} stroke={7} color={sc} label={`${pct}%`} sub="SCORE"/>
          <div style={{fontSize:22,fontWeight:800,fontFamily:C.FM,marginBottom:4,color:sc,marginTop:12}}>{scoreRef.current}/{tot} correct</div>
          <div style={{fontSize:13,color:C.t2}}>{quiz.title}</div>
          {!readonly&&<div style={{fontSize:11,color:C.t3,marginTop:4,fontFamily:C.FM,display:'inline-flex',alignItems:'center',gap:5}}><Timer size={11}/>{fmtT(elapsed)} elapsed</div>}
          <div style={R({justifyContent:'center',gap:10,marginTop:20})}>
            <button style={{...btn(`linear-gradient(135deg,${sc},${sc}cc)`),display:'inline-flex',alignItems:'center',gap:8}} onClick={()=>onFinish(scoreRef.current,tot)}>Save & Exit<ArrowRight size={15}/></button>
            <button style={{...btnG(),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>exportQuizResult(quiz,answers,scoreRef.current,tot)}><FileDown size={14}/>Export PDF</button>
          </div>
        </div>
        <div style={R({justifyContent:'space-between',marginBottom:16})}>
          <span style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase'}}>Review · Q {ri+1} / {tot}</span>
          <div style={R({gap:8})}>
            <button style={{...btnSm(C.s3,{color:C.t2}),display:'inline-flex',alignItems:'center',gap:4}} onClick={()=>setRi(i=>Math.max(0,i-1))} disabled={ri===0}><ChevronLeft size={13}/>Prev</button>
            <button style={{...btnSm(C.s3,{color:C.t2}),display:'inline-flex',alignItems:'center',gap:4}} onClick={()=>setRi(i=>Math.min(tot-1,i+1))} disabled={ri===tot-1}>Next<ChevronRight size={13}/></button>
          </div>
        </div>
        {a&&<div style={glass()}>
          <MathText text={a.q} style={{fontSize:15,fontWeight:600,lineHeight:1.7,color:C.t1,fontFamily:C.FB,display:'block',marginBottom:18}}/>
          <div style={CC({gap:8})}>
            {a.choices.map((ch,ci)=>{const ok=ci===a.correct,bad=ci===a.sel&&!a.ok;return(
              <div key={ci} style={{...glass2({background:ok?C.greenDim:bad?C.roseDim:'rgba(255,255,255,0.02)',border:`1px solid ${ok?`${C.green}40`:bad?`${C.rose}40`:C.b1}`,padding:'12px 16px'}),display:'flex',gap:12,alignItems:'center'}}>
                <span style={{width:26,height:26,borderRadius:8,background:ok?`${C.green}20`:bad?`${C.rose}20`:C.s3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:ok?C.green:bad?C.rose:C.t3,flexShrink:0,fontFamily:C.FM,border:`1px solid ${ok?`${C.green}40`:bad?`${C.rose}40`:C.b1}`}}>{ok?<Check size={13}/>:bad?<X size={13}/>:String.fromCharCode(65+ci)}</span>
                <span style={{fontSize:13,color:ok?C.green:bad?C.rose:C.t2,lineHeight:1.5}}>{ch}</span>
              </div>
            );})}
          </div>
          <div style={{marginTop:16,background:C.blueDim,border:`1px solid rgba(45,127,255,0.2)`,borderRadius:10,padding:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.blueL,letterSpacing:'.1em',marginBottom:8}}>EXPLANATION</div>
            <MathText text={a.exp} style={{fontSize:13,color:C.t1,lineHeight:1.75,display:'block'}}/>
          </div>
        </div>}
        <div style={R({flexWrap:'wrap',gap:5,marginTop:16})}>
          {answers.map((ans,i)=><button key={i} onClick={()=>setRi(i)} style={{width:28,height:28,borderRadius:6,background:ans.ok?C.green:C.rose,border:'none',cursor:'pointer',fontSize:10,color:'#fff',fontWeight:700,fontFamily:C.FM,outline:ri===i?'2px solid white':undefined,outlineOffset:2,opacity:ri===i?1:.55,transition:'opacity .15s'}}>{i+1}</button>)}
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:m?16:28}}>
      <div style={R({marginBottom:m?18:26})}>
        <div style={{flex:1}}>
          <div style={R({gap:8,marginBottom:10})}>
            <span style={{fontSize:11,color:C.t3,fontFamily:C.FM}}>{readonly?'Reviewing':'Question'} {qi+1} / {tot}</span>
            {!readonly&&<span style={{fontSize:11,color:C.t3,fontFamily:C.FM,display:'inline-flex',alignItems:'center',gap:4,marginLeft:'auto',marginRight:12}}><Timer size={11}/>{fmtT(elapsed)}</span>}
          </div>
          <Bar pct={prog} color={accent} h={3} glow/>
        </div>
        <button onClick={onClose} title="Exit quiz" style={{...btnG({padding:'8px',marginLeft:16,width:32,height:32}),display:'inline-flex',alignItems:'center',justifyContent:'center'}}><X size={15}/></button>
      </div>
      <MathText text={q.q} style={{fontSize:m?15:17,fontWeight:600,lineHeight:1.75,marginBottom:m?18:24,color:C.t1,fontFamily:C.FB,display:'block'}}/>
      <div style={CC({gap:m?8:10})}>
        {q.ch.map((ch,ci)=>{
          let bg='rgba(255,255,255,0.025)',brd=C.b1,tc=C.t2;
          if(sel===ci&&!conf){bg=C.blueDim;brd=`${C.blue}60`;tc=C.t1;}
          if(conf){if(ci===q.ans){bg=C.greenDim;brd=`${C.green}50`;tc=C.green;}else if(ci===sel){bg=C.roseDim;brd=`${C.rose}50`;tc=C.rose;}}
          return(
            <motion.div key={ci} whileHover={!conf?{scale:1.01}:{}} whileTap={!conf?{scale:.99}:{}} onClick={()=>{if(!conf){setSel(ci);play('select');}}}
              style={{...glass2({background:bg,border:`1px solid ${brd}30`,padding:m?'12px 14px':'14px 18px'}),cursor:conf?'default':'pointer',display:'flex',alignItems:'center',gap:m?10:14,transition:'background .15s,border-color .15s'}}>
              <span style={{width:m?24:28,height:m?24:28,borderRadius:8,background:conf&&ci===q.ans?`${C.green}20`:conf&&ci===sel?`${C.rose}20`:sel===ci?C.blueDim:C.s4,border:`1px solid ${conf&&ci===q.ans?`${C.green}40`:conf&&ci===sel?`${C.rose}40`:sel===ci?`${C.blue}50`:C.b1}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:tc,flexShrink:0,fontFamily:C.FM}}>{String.fromCharCode(65+ci)}</span>
              <span style={{fontSize:m?13:14,lineHeight:1.6,color:conf?tc:sel===ci?C.t1:C.t2,fontFamily:C.FB}}>{ch}</span>
              {conf&&ci===q.ans&&<motion.span initial={{scale:0}} animate={{scale:1}} style={{marginLeft:'auto',color:C.green,display:'flex'}}><Check size={18}/></motion.span>}
              {conf&&ci===sel&&ci!==q.ans&&<motion.span initial={{scale:0}} animate={{scale:1}} style={{marginLeft:'auto',color:C.rose,display:'flex'}}><X size={18}/></motion.span>}
            </motion.div>
          );
        })}
      </div>
      {conf&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:18,background:C.blueDim,border:`1px solid rgba(45,127,255,0.2)`,borderRadius:10,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:C.blueL,letterSpacing:'.1em',marginBottom:8}}>EXPLANATION</div>
        <MathText text={q.exp} style={{fontSize:13,color:C.t1,lineHeight:1.75,display:'block'}}/>
      </motion.div>}
      <div style={{marginTop:22,...R({justifyContent:'flex-end',gap:10})}}>
        {!conf&&sel!==null&&<button style={{...btn(),display:'inline-flex',alignItems:'center',gap:8}} onClick={confirm}>Confirm Answer<ArrowRight size={15}/></button>}
        {conf&&<button style={{...btn(),display:'inline-flex',alignItems:'center',gap:8}} onClick={next}>{qi<tot-1?'Next Question':'View Results'}<ArrowRight size={15}/></button>}
      </div>
    </div>
  );
}

// ── Flip Card ─────────────────────────────────────────────────────────────────
const DIFF_COLOR = { easy:C.green, medium:C.amber, hard:C.rose };
function FlipCard({card,flipped,onClick,m=false,streak=0}){
  const [showHint,setShowHint]=useState(false);
  const ret=getRetainability(card);const nxt=card.due?nextReviewLabel(card):null;
  const dCol=DIFF_COLOR[card.difficulty]||C.blueL;
  const heat=Math.min(streak,10)/10; // 0→1, brightens the glow as the streak climbs
  const glowShadow=streak>=3
    ? `0 8px 40px rgba(245,158,11,${0.10+heat*0.28}),0 0 0 1px rgba(245,158,11,${0.14+heat*0.22}),inset 0 1px 0 rgba(255,255,255,0.05)`
    : '0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)';
  return(
    <div style={{perspective:1200,width:'100%',minHeight:m?320:260}}>
      <motion.div key={card.front} initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1,rotateY:flipped?180:0}} transition={{rotateY:{duration:.55,ease:[.16,1,.3,1]},opacity:{duration:.25},scale:{duration:.25}}} style={{position:'relative',width:'100%',minHeight:m?320:260,transformStyle:'preserve-3d'}}>
        {/* Front */}
        <div onClick={()=>{onClick();play('flip');setShowHint(false);}} style={{position:'absolute',inset:0,cursor:'pointer',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',...glass({display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',flexDirection:'column',gap:16,padding:m?24:36,boxShadow:glowShadow,transition:'box-shadow .4s ease',overflowY:'auto'})}}>
          <div style={{position:'absolute',top:16,left:16,...R({gap:6,flexWrap:'wrap',maxWidth:'60%'})}}>
            {card.category&&<span style={pill(C.s4,C.t2,{fontSize:9.5})}>{card.category}</span>}
            {card.difficulty&&<span style={pill(`${dCol}18`,dCol,{fontSize:9.5})}>{card.difficulty}</span>}
            {card.type==='cloze'&&<span style={pill(C.violetDim,C.violetL,{fontSize:9.5})}>Fill in the blank</span>}
          </div>
          {nxt&&<div style={{...pill(C.blueDim,C.blueL,{fontSize:10,position:'absolute',top:16,right:16})}}>{`Next: ${nxt}`}</div>}
          <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.14em',textTransform:'uppercase',marginTop:card.category||card.difficulty||card.type==='cloze'?14:0}}>QUESTION · Tap to reveal</div>
          <MathText text={card.front} style={{fontSize:m?16:18,fontWeight:600,lineHeight:1.65,color:C.t1,fontFamily:C.FD,display:'block'}}/>
          {card.hint&&(
            <div onClick={e=>e.stopPropagation()}>
              {showHint?(
                <div style={{...pill(C.amberDim,C.amberL,{fontSize:11,gap:6,maxWidth:360,whiteSpace:'normal',textAlign:'left'})}}><Lightbulb size={12} style={{flexShrink:0}}/>{card.hint}</div>
              ):(
                <button onClick={()=>setShowHint(true)} style={{...btnSm(C.s4,{color:C.t2,fontSize:11}),display:'inline-flex',alignItems:'center',gap:5}}><Lightbulb size={12}/>Show hint</button>
              )}
            </div>
          )}
          <div style={R({gap:5,justifyContent:'center',marginTop:4})}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:C.s5}}/>)}</div>
        </div>
        {/* Back */}
        <div onClick={()=>{onClick();play('flip');}} style={{position:'absolute',inset:0,cursor:'pointer',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',transform:'rotateY(180deg)',background:`linear-gradient(135deg,${C.blueDim},rgba(6,182,212,0.08))`,border:`1px solid rgba(45,127,255,0.2)`,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',flexDirection:'column',gap:16,padding:m?24:36,boxShadow:glowShadow,transition:'box-shadow .4s ease',overflowY:'auto'}}>
          <div style={{position:'absolute',top:16,left:16,...R({gap:6})}}>
            {card.category&&<span style={pill(C.s4,C.t2,{fontSize:9.5})}>{card.category}</span>}
          </div>
          <div style={{fontSize:10,fontWeight:700,color:C.blueL,letterSpacing:'.14em',textTransform:'uppercase'}}>ANSWER</div>
          <MathText text={card.back} style={{fontSize:m?14:16,lineHeight:1.8,color:C.t1,fontFamily:C.FB,display:'block'}}/>
          <div style={R({gap:6,justifyContent:'center'})}>
            {ret!==null&&<div style={{...pill(C.greenDim,C.greenL,{fontSize:10})}}>Retention: {ret}%</div>}
            {streak>=3&&<div style={{...pill(C.amberDim,C.amberL,{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}><Flame size={11}/>{streak} streak</div>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Card Manager Modal (add/edit/delete cards in a custom deck) ──────────────
function CardManagerModal({deckName,cards,onAdd,onUpdate,onDelete,onClose,m=false}){
  const [editIdx,setEditIdx]=useState(null);
  const [editFront,setEditFront]=useState('');
  const [editBack,setEditBack]=useState('');
  const [newFront,setNewFront]=useState('');
  const [newBack,setNewBack]=useState('');

  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[onClose]);

  function startEdit(i){setEditIdx(i);setEditFront(cards[i].front);setEditBack(cards[i].back);}
  function saveEdit(){if(editFront.trim()&&editBack.trim())onUpdate(editIdx,editFront.trim(),editBack.trim());setEditIdx(null);}
  function addCard(){if(!newFront.trim()||!newBack.trim())return;onAdd(newFront.trim(),newBack.trim());setNewFront('');setNewBack('');}

  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:m?12:24,backdropFilter:'blur(6px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{scale:.96,y:10}} animate={{scale:1,y:0}} exit={{scale:.96,y:10}} style={{width:'100%',maxWidth:640,maxHeight:'85vh',display:'flex',flexDirection:'column',...glass({padding:0,overflow:'hidden',borderRadius:m?12:18,border:`1px solid ${C.b2}`,boxShadow:'0 40px 100px rgba(0,0,0,0.9)'})}}>
        <div style={{...R({justifyContent:'space-between'}),padding:'16px 20px',borderBottom:`1px solid ${C.b1}`,background:C.s1,flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.t1,fontFamily:C.FD}}>Manage Cards</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{deckName} · {cards.length} card{cards.length===1?'':'s'}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.t3,cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.color=C.t1} onMouseLeave={e=>e.currentTarget.style.color=C.t3}><X size={16}/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:20}}>
          <div style={CC({gap:10,marginBottom:18})}>
            {cards.map((c,i)=>(
              <div key={i} style={glass2({padding:14})}>
                {editIdx===i?(
                  <div style={CC({gap:8})}>
                    <textarea style={inp({minHeight:50,resize:'vertical',fontSize:12.5})} value={editFront} onChange={e=>setEditFront(e.target.value)} placeholder="Front (question)"/>
                    <textarea style={inp({minHeight:50,resize:'vertical',fontSize:12.5})} value={editBack} onChange={e=>setEditBack(e.target.value)} placeholder="Back (answer)"/>
                    <div style={R({gap:8})}>
                      <button style={btnSm(C.blueGrad,{color:'#fff',fontSize:11})} onClick={saveEdit}>Save</button>
                      <button style={btnG({fontSize:11,padding:'6px 14px'})} onClick={()=>setEditIdx(null)}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <div style={R({alignItems:'flex-start',gap:10})}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,color:C.t1,fontWeight:600,lineHeight:1.5,marginBottom:5}}>{c.front}</div>
                      <div style={{fontSize:12,color:C.t3,lineHeight:1.5}}>{c.back}</div>
                    </div>
                    <div style={R({gap:4,flexShrink:0})}>
                      <button style={{background:'none',border:'none',color:C.t3,cursor:'pointer',padding:6,borderRadius:6}} onClick={()=>startEdit(i)} title="Edit"><ScrollText size={13}/></button>
                      <button style={{background:'none',border:'none',color:C.rose,cursor:'pointer',padding:6,borderRadius:6}} onClick={()=>onDelete(i)} title="Delete"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {cards.length===0&&<div style={{textAlign:'center',color:C.t3,padding:'20px 0',fontSize:12.5}}>No cards yet — add your first one below.</div>}
          </div>
        </div>
        <div style={{padding:18,borderTop:`1px solid ${C.b1}`,background:C.s1,flexShrink:0}}>
          <div style={lbl()}>Add a card</div>
          <div style={CC({gap:8})}>
            <textarea style={inp({minHeight:44,resize:'vertical',fontSize:12.5})} value={newFront} onChange={e=>setNewFront(e.target.value)} placeholder="Front (question)"/>
            <textarea style={inp({minHeight:44,resize:'vertical',fontSize:12.5})} value={newBack} onChange={e=>setNewBack(e.target.value)} placeholder="Back (answer)"/>
            <button style={{...btn(C.blueGrad,{fontSize:12,alignSelf:'flex-start'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={addCard} disabled={!newFront.trim()||!newBack.trim()}><Plus size={14}/>Add Card</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── New Deck Modal ────────────────────────────────────────────────────────────
function NewDeckModal({onCreate,onClose,m=false}){
  const [name,setName]=useState('');
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);},[onClose]);
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:m?12:24,backdropFilter:'blur(6px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{scale:.96,y:10}} animate={{scale:1,y:0}} exit={{scale:.96,y:10}} style={{width:'100%',maxWidth:420,...glass({borderRadius:m?12:18,border:`1px solid ${C.b2}`,boxShadow:'0 40px 100px rgba(0,0,0,0.9)'})}}>
        <div style={{fontSize:15,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:14}}>New Deck</div>
        <input autoFocus style={{...inp(),marginBottom:14}} placeholder="Deck name (e.g. Cell Biology Vocab)" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&name.trim())onCreate(name.trim());}}/>
        <div style={R({gap:8})}>
          <button style={btn(C.blueGrad,{fontSize:12.5})} onClick={()=>name.trim()&&onCreate(name.trim())} disabled={!name.trim()}>Create Deck</button>
          <button style={btnG({fontSize:12.5})} onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pathway Overview Card ────────────────────────────────────────────────────
const PATH_ICONS = {
  exploring:Compass, physician:Stethoscope, nursing:HeartPulse, physicianAssistant:ClipboardList,
  pharmacy:Pill, dentistry:Smile, biomedResearch:Microscope, physicalOccupTherapy:Dumbbell,
  publicHealth:Globe, healthAdmin:Landmark,
};
// Roadmap item key → icon + accent, used by the Portfolio Class Year Roadmap.
const ROADMAP_ICONS = {
  diagnostic:{Ic:Compass,color:C.blue}, flashcards:{Ic:Layers3,color:C.violet}, quiz:{Ic:Layers,color:C.green},
  activity:{Ic:Award,color:C.orange}, clinical:{Ic:Stethoscope,color:C.cyan}, colleges:{Ic:GraduationCap,color:C.amber},
  recommenders:{Ic:UserCheck,color:C.violetL}, essays:{Ic:ScrollText,color:C.rose}, deadlines:{Ic:CalendarDays,color:C.roseL},
  interview:{Ic:Mic,color:C.blueL}, resume:{Ic:Award,color:C.violet}, aid:{Ic:Handshake,color:C.green}, mastery:{Ic:Route,color:C.blue},
};
function PathwayCard({ pathKey, p, current, onSelect, m=false }){
  const Ic = PATH_ICONS[pathKey]||Compass;
  const lessonCount = (p.units||[]).reduce((s,u)=>s+(u.lessons?.length||0),0);
  return(
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} whileHover={{y:-2,borderColor:`${p.accent}45`,boxShadow:`0 10px 32px rgba(0,0,0,0.5),0 0 0 1px ${p.accent}25`}}
      style={{...glass({padding:m?18:24,transition:'box-shadow .2s,border-color .2s'}),border:current?`1px solid ${p.accent}55`:`1px solid ${C.b1}`}}>
      <div style={R({alignItems:'flex-start',marginBottom:14})}>
        <div style={{width:44,height:44,borderRadius:12,background:`${p.accent}18`,border:`1px solid ${p.accent}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic size={20} color={p.accent}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={R({gap:8})}>
            <div style={{fontSize:16,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.01em'}}>{p.label}</div>
            {current&&<span style={{...pill(`${p.accent}20`,p.accent,{fontSize:9}),display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}><Check size={9}/>Current</span>}
          </div>
          {p.tagline&&<div style={{fontSize:12,color:p.accent,marginTop:2,fontWeight:600,lineHeight:1.4}}>{p.tagline}</div>}
        </div>
      </div>
      {p.overview&&<p style={{fontSize:12.5,color:C.t2,lineHeight:1.75,margin:'0 0 16px'}}>{p.overview}</p>}
      {p.highlights&&<div style={{marginBottom:16}}>
        <div style={{fontSize:9,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>What this pathway builds</div>
        <div style={CC({gap:7})}>
          {p.highlights.map((h,i)=>(
            <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
              <Check size={12} color={p.accent} style={{flexShrink:0,marginTop:2}}/>
              <span style={{fontSize:12,color:C.t2,lineHeight:1.6}}>{h}</span>
            </div>
          ))}
        </div>
      </div>}
      {p.outcomes&&<div style={{marginBottom:16}}>
        <div style={{fontSize:9,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Leads toward majors like</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {p.outcomes.map(o=><span key={o} style={pill(C.s3,C.t2,{fontSize:10,border:`1px solid ${C.b1}`})}>{o}</span>)}
        </div>
      </div>}
      {p.bestFor&&<div style={{marginBottom:18,background:'rgba(255,255,255,0.02)',border:`1px solid ${C.b1}`,borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:9,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>This might be for you if</div>
        <div style={CC({gap:5})}>
          {p.bestFor.map((b,i)=><div key={i} style={{fontSize:11.5,color:C.t2,lineHeight:1.6}}>· {b}</div>)}
        </div>
      </div>}
      <div style={R({justifyContent:'space-between'})}>
        <span style={{fontSize:10,color:C.t3,fontFamily:C.FM}}>{(p.units||[]).length} units · {lessonCount} lessons</span>
        <motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} disabled={current}
          style={{...btn(current?C.s3:`linear-gradient(135deg,${p.accent},${p.accent}cc)`,{fontSize:11.5,padding:'8px 16px',opacity:current?.6:1,cursor:current?'default':'pointer',boxShadow:current?'none':`0 4px 14px ${p.accent}35`}),display:'inline-flex',alignItems:'center',gap:6}}
          onClick={()=>!current&&onSelect(pathKey)}>
          {current?<>Currently Active<Check size={13}/></>:<>Select This Pathway<ChevronRight size={13}/></>}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Achievement Toast ─────────────────────────────────────────────────────────
function showAchievementToast(achievement) {
  play('achieve');
  celebrateAchievement();
  const AIc=ACH_ICONS[achievement.icon]||Award;
  toast.custom((t) => (
    <motion.div initial={{scale:.8,opacity:0,y:-20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.8,opacity:0}} style={{background:C.s1,border:`1px solid ${C.amber}40`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:`0 8px 32px rgba(0,0,0,0.6),0 0 0 1px ${C.amber}20`,maxWidth:320,fontFamily:C.FB,cursor:'pointer'}} onClick={()=>toast.dismiss(t.id)}>
      <div style={{width:40,height:40,borderRadius:10,background:`${C.amber}18`,border:`1px solid ${C.amber}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AIc size={19} color={C.amberL}/></div>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.amberL,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:2}}>Achievement Unlocked!</div>
        <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{achievement.name}</div>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{achievement.desc}</div>
        <div style={{...pill(C.amberDim,C.amberL,{fontSize:10,marginTop:6})}}>+{achievement.xp} XP</div>
      </div>
    </motion.div>
  ), { duration:5000 });
}
// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App({ account, onAccountChange }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ── DB loading ──────────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [user,     setUser_]    = useState(null);
  const [pathway,  setPathway_] = useState({});
  const [qScores,  setQScores_] = useState({});
  const [qHistory, setQHistory] = useState([]);
  const [cDecks,   setCDecks_]  = useState({});
  const [deckCreatedAt, setDeckCreatedAt] = useState({});
  const [portActivities, setPortActivities] = useState([]);
  const [portAwards,     setPortAwards]     = useState([]);
  const [portGpa,        setPortGpa]        = useState([]);
  const [portLoaded,     setPortLoaded]     = useState(false);
  const [catPerf,  setCatPerf_] = useState({});
  const [achiev,   setAchiev_]  = useState(new Set());
  const [streak,   setStreak]   = useState(0);
  const [comebackGap, setComebackGap] = useState(null); // days since last study day (returning-user nudge), null = n/a
  const [streakFreezes, setStreakFreezes] = useState(0);
  const [cosmetics, setCosmetics] = useState(new Set());
  const [chest, setChest] = useState(null); // { title, eyebrow, xp, cosmetic }
  const upcomingDeadlines = useDeadlines();
  const [totalReviews, setTotalReviews] = useState(0);
  const [aiChatCount, setAiChatCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [coachRequestsRemaining, setCoachRequestsRemaining] = useState(300);
  const [coachRequestsUsedToday, setCoachRequestsUsedToday] = useState(0);
  // Kept in sync with api/groq.js's DAILY_LIMIT (returned as `dailyLimit` on every response)
  // instead of hardcoded, so the usage bar/label below never drifts out of sync with the
  // server's actual cap the way a hardcoded number silently did before.
  const [coachDailyLimit, setCoachDailyLimit] = useState(300);
  const [appCounts, setAppCounts] = useState({colleges:0,essays:0,resume:false});
  const [clinicalHoursTotal, setClinicalHoursTotal] = useState(0);
  const [clinicalHoursEntries, setClinicalHoursEntries] = useState([]);
  const [recommendersCount, setRecommendersCount] = useState(0);
  const [mmiCasperCount, setMmiCasperCount] = useState(0);
  const [weekCardReviews, setWeekCardReviews] = useState(0);
  const [questTick, setQuestTick] = useState(0);
  const [pathwayGoal, setPathwayGoalState] = useState(null); // { pathwayKey, startedAt, targetWeeks } | null

  // ── UI state ────────────────────────────────────────────────────────────────
  // Tab/sub-view start from whatever was last persisted (src/lib/viewState.js) so a reload
  // resumes on the same screen instead of dropping back to Home — see the restore/persist
  // effects near the flashcards state below for the deeper "resume mid-deck" case.
  const [tab,   setTab]   = useState(()=>loadViewState().tab||'home');
  const [vidM,  setVM]    = useState(null);
  // ── Lesson Player state (immersive Overview->Article->Video->Quiz->Complete) ─
  const [activeLesson, setActiveLesson] = useState(null); // { lesson, unit } while the player is open
  const [lessonStep, setLessonStep] = useState('overview');
  const [articleRead, setArticleRead] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false); // Cmd/Ctrl+K quick switcher
  const [cmdQ,    setCmdQ]    = useState('');

  // True for the rest of this session once completeOnboarding() runs — lets Home greet a
  // genuinely first-time user with "Welcome" instead of the default "Welcome back".
  const [justOnboarded, setJustOnboarded] = useState(false);
  const [sGrade, setSGrade] = useState(''); // settings: grade-stage editor
  // Dev-only: lets Settings re-open the ~30-screen onboarding wizard to preview it without
  // touching the signed-in account's saved profile. Remove once onboarding is stable.
  const [previewOnboarding, setPreviewOnboarding] = useState(false);

  // ── Prep / Portfolio sub-navigation ──────────────────────────────────────────
  // Prep and Portfolio each absorb several formerly-top-level tabs; these track
  // which absorbed view is active, switched via the SubNav pill bar.
  const [prepView, setPrepView] = useState(()=>loadViewState().prepView||'pathway'); // diagnostic|pathway|quizzes|flashcards|coach|library
  const [portfolioView, setPortfolioView] = useState(()=>loadViewState().portfolioView||'overview'); // overview|colleges|essays|deadlines|aid|resume|interview|scores|calc
  const [progressView, setProgressView] = useState(()=>loadViewState().progressView||'overview'); // overview|verified|performance|achievements
  const goPrep = useCallback((view)=>{ setTab('prep'); if(view) setPrepView(view); }, []);
  const goPortfolio = useCallback((view)=>{ setTab('portfolio'); if(view) setPortfolioView(view); }, []);
  const goProgress = useCallback((view)=>{ setTab('progress'); if(view) setProgressView(view); }, []);

  // Persist the current tab/sub-view on every change so a reload (a stuck PWA, the phone
  // locking, a flaky connection) resumes on the same screen instead of resetting to Home.
  useEffect(()=>{ saveViewState({ tab, prepView, portfolioView, progressView }); },[tab, prepView, portfolioView, progressView]);

  // ── Post-onboarding product tour — a full-depth spotlight walkthrough covering ──
  // every pillar (Home/Prep/Portfolio/Progress/Settings), every absorbed sub-view
  // inside Prep/Portfolio/Progress, and the ⌘K quick-switcher — offered right
  // after a new account is created (see completeOnboarding()).
  const [tourActive, setTourActive] = useState(false);
  const startTour = useCallback(()=>setTourActive(true), []);
  const finishTour = useCallback(()=>{
    setTourActive(false);
    setUser_(u=>{ if(!u) return u; const next={...u,tourCompletedAt:Date.now()}; DB.saveUser(next).catch(console.error); return next; });
  }, []);
  // completeOnboarding() routes brand-new users straight into the Pathway Diagnostic — the
  // tour's first step forces tab back to Home, so auto-starting it on a blind timer would yank
  // the user out of the diagnostic they just launched into. Defer it with this flag instead,
  // and only actually start the tour once they naturally land on Home themselves.
  const tourPendingRef = useRef(false);
  useEffect(()=>{
    if(!tourPendingRef.current||tourActive||tab!=='home')return;
    tourPendingRef.current=false;
    startTour();
  },[tab,tourActive,startTour]);
  // Full-depth product tour — every pillar, every absorbed sub-view inside Prep/Portfolio/
  // Progress, and every Settings section, so a brand-new student sees the entire app (not
  // just the top-level tabs) before they're left to explore on their own. Each sub-view gets
  // TWO steps back to back: one on its nav pill, one on the actual content anchor inside that
  // page (data-tour="…-deep-…") — the second step is what exercises AppTour's scroll-into-view
  // behavior, since those anchors can sit well below the fold on a long page. `section`/`color`
  // drive the section pill + spotlight ring color so a 60+ step tour still reads as five
  // distinct chapters instead of one undifferentiated scroll.
  const TOUR_STEPS = useMemo(()=>[
    // ── Home ──────────────────────────────────────────────────────────────────
    { target:'nav-home', section:'Home', color:C.blue, title:'Home — your daily dashboard', body:"Streak, XP, level, today's next lesson, and a live snapshot of your current pathway all land here first — this is where every study session should start.", onEnter:()=>setTab('home') },

    // ── Prep ──────────────────────────────────────────────────────────────────
    { target:'nav-prep', section:'Prep', color:C.violet, title:'Prep — everything academic', body:"SAT/ACT diagnostic, your personalized pathway, the quiz library, flashcards, the AI Coach, and the E-Library all live under this one tab, switched with the pill bar just below it.", onEnter:()=>setTab('prep') },
    { target:'prep-sub-diagnostic', section:'Prep', color:C.violet, title:'Diagnostic', body:"A short adaptive diagnostic figures out your strengths and gaps by category, then recommends the pathway that matches where you're actually starting from.", onEnter:()=>goPrep('diagnostic') },
    { target:'prep-deep-diagnostic', section:'Prep', color:C.violet, title:'Take it, or pick manually', body:"Hit \"Start Diagnostic\" for a personalized recommendation, or skip straight to a pathway yourself in the grid below — you can always retake the diagnostic or switch pathways later from Settings.", onEnter:()=>goPrep('diagnostic') },
    { target:'prep-sub-pathway', section:'Prep', color:C.violet, title:'Pathway', body:"Your structured, unit-by-unit curriculum. Each lesson has an overview, article, video, and a verification quiz — complete them in order to level up and unlock the next unit.", onEnter:()=>goPrep('pathway') },
    { target:'prep-deep-pathway', section:'Prep', color:C.violet, title:'Track mastery unit by unit', body:"The mastery ring and lesson counter here update live as you complete lessons — scroll down and each unit expands into its individual lessons, with a lock icon until the unit before it is done.", onEnter:()=>goPrep('pathway') },
    { target:'prep-sub-quizzes', section:'Prep', color:C.violet, title:'Quiz Library', body:"Hundreds of practice questions you can filter by category, difficulty, and topic — use it for free practice outside the structured pathway, any time.", onEnter:()=>goPrep('quizzes') },
    { target:'prep-deep-quizzes', section:'Prep', color:C.violet, title:'Filter by category and difficulty', body:"These stat tiles show your total quizzes and questions at a glance — scroll down to the search bar and filters to narrow by category, difficulty, or the courses you added in Settings.", onEnter:()=>goPrep('quizzes') },
    { target:'prep-sub-flashcards', section:'Prep', color:C.violet, title:'Flashcards', body:"Spaced-repetition decks scheduled with FSRS (the same algorithm behind Anki). Generate your own cards straight from your notes, or study the built-in decks when cards come due.", onEnter:()=>goPrep('flashcards') },
    { target:'prep-deep-flashcards', section:'Prep', color:C.violet, title:'Generate a deck from your notes', body:"Tap \"New Deck\" to turn your own notes into flashcards offline — no account or API call needed — or scroll down to study any built-in deck with cards due today.", onEnter:()=>goPrep('flashcards') },
    { target:'prep-sub-coach', section:'Prep', color:C.violet, title:'AI Coach', body:"Iatra — an AI tutor that knows your goals, obstacles, and study method from onboarding. Ask it to explain a concept, quiz you, or help you plan your week. You can run multiple chat threads in parallel.", onEnter:()=>goPrep('coach') },
    { target:'prep-deep-coach', section:'Prep', color:C.violet, title:'Multiple chats, just like a real chat app', body:"Open the sidebar (or the menu icon on mobile) to start a new thread or switch between old ones — nothing you've asked Iatra disappears on reload.", onEnter:()=>goPrep('coach') },
    { target:'prep-deep-coach-tier', section:'Prep', color:C.violet, title:'Pick Iatra\'s model', body:"Scout answers fast for everyday questions, Guide is the balanced default, and Sage reasons the deepest — worth switching to for something like a full essay critique. Your choice is remembered.", onEnter:()=>goPrep('coach') },
    { target:'prep-sub-library', section:'Prep', color:C.violet, title:'E-Library', body:"A searchable shelf of articles, videos, and reference material by subject and difficulty — save items for later or mark them completed as you go.", onEnter:()=>goPrep('library') },
    { target:'prep-deep-library', section:'Prep', color:C.violet, title:'Bookmark, take notes, export', body:"This card tracks your reading progress across the whole library. Bookmark resources for later, jot notes as you go, then export everything you've written as one study document.", onEnter:()=>goPrep('library') },

    // ── Portfolio ─────────────────────────────────────────────────────────────
    { target:'nav-portfolio', section:'Portfolio', color:C.green, title:'Portfolio — building your application', body:"Everything that goes into an actual med-school-track application lives here: your college list, essays, deadlines, activities, and more — all in one place so nothing falls through the cracks.", onEnter:()=>setTab('portfolio') },
    { target:'portfolio-sub-overview', section:'Portfolio', color:C.green, title:'Overview', body:"A single glance at where your application stands — what's done, what's next, and which deadlines are approaching.", onEnter:()=>goPortfolio('overview') },
    { target:'portfolio-deep-overview', section:'Portfolio', color:C.green, title:'One score for your whole application', body:"This readiness gauge blends academics, clinical exposure, application progress, and activities into a single number — scroll down for the category breakdown behind it and your logged activities.", onEnter:()=>goPortfolio('overview') },
    { target:'portfolio-sub-timeline', section:'Portfolio', color:C.green, title:'Timeline', body:"A chronological view of every milestone across your whole application journey, from freshman year prep through submission.", onEnter:()=>goPortfolio('timeline') },
    { target:'portfolio-deep-timeline', section:'Portfolio', color:C.green, title:'Upcoming and past, in one feed', body:"Deadlines, test dates, clinical hours, and recommender due dates are merged into one chronological feed here, split into Upcoming and Past.", onEnter:()=>goPortfolio('timeline') },
    { target:'portfolio-sub-colleges', section:'Portfolio', color:C.green, title:'College List', body:"Build and organize your target schools — reach, match, and safety — with the stats you need to compare them side by side.", onEnter:()=>goPortfolio('colleges') },
    { target:'portfolio-deep-colleges', section:'Portfolio', color:C.green, title:'Add schools, track every deadline', body:"Scroll down to add a school with its GPA/SAT requirements and acceptance rate, then set its EA/ED, RD, and financial-aid deadlines right on the same card.", onEnter:()=>goPortfolio('colleges') },
    { target:'portfolio-sub-essays', section:'Portfolio', color:C.green, title:'Essays', body:"Draft, revise, and track every supplemental and personal statement essay in one workspace, with version history so you never lose a rewrite.", onEnter:()=>goPortfolio('essays') },
    { target:'portfolio-deep-essays', section:'Portfolio', color:C.green, title:'Draft, link to a school, track word count', body:"Scroll down to start a new essay draft — link it to a school from your college list and set a word limit so you know exactly how much room you have left.", onEnter:()=>goPortfolio('essays') },
    { target:'portfolio-sub-deadlines', section:'Portfolio', color:C.green, title:'Deadlines', body:"Every application, scholarship, and testing deadline in one calendar — including AP/IB exam dates if you've flagged yourself as an AP/IB student in Settings.", onEnter:()=>goPortfolio('deadlines') },
    { target:'portfolio-deep-deadlines', section:'Portfolio', color:C.green, title:'Never miss a due date', body:"Scroll down to add any deadline — application, scholarship, or exam — and it surfaces automatically on your Home dashboard as it approaches.", onEnter:()=>goPortfolio('deadlines') },
    { target:'portfolio-sub-aid', section:'Portfolio', color:C.green, title:'Financial Aid', body:"Track FAFSA, CSS Profile, and scholarship applications alongside the aid packages you receive, so cost comparisons are easy when decisions come in.", onEnter:()=>goPortfolio('aid') },
    { target:'portfolio-deep-aid', section:'Portfolio', color:C.green, title:'FAFSA, CSS Profile, and scholarships', body:"Track your FAFSA and CSS Profile status up top, then scroll down to log every scholarship you apply for and the aid packages that come back.", onEnter:()=>goPortfolio('aid') },
    { target:'portfolio-sub-resume', section:'Portfolio', color:C.green, title:'Activities & Resume', body:"Log every extracurricular, job, and leadership role with hours and impact, then export a polished resume/activities list with one click.", onEnter:()=>goPortfolio('resume') },
    { target:'portfolio-deep-resume', section:'Portfolio', color:C.green, title:'Log activities, export a resume', body:"Scroll down to log GPA history and every activity with hours per week — once you've added a few, the export button here turns them into a polished, ready-to-submit resume.", onEnter:()=>goPortfolio('resume') },
    { target:'portfolio-sub-research', section:'Portfolio', color:C.green, title:'Research', body:"Track research experience — labs, projects, publications, and presentations — the kind of depth admissions committees and future pre-med programs look for.", onEnter:()=>goPortfolio('research') },
    { target:'portfolio-deep-research', section:'Portfolio', color:C.green, title:'Labs, projects, publications', body:"Scroll down to log a research project with the lab, PI, and your role — publications and presentations get their own fields so they stand out separately.", onEnter:()=>goPortfolio('research') },
    { target:'portfolio-sub-skills', section:'Portfolio', color:C.green, title:'Skills & Certs', body:"Certifications and skills worth listing — CPR/BLS, shadowing competencies, language proficiency, and more — organized so they're ready to cite in essays and interviews.", onEnter:()=>goPortfolio('skills') },
    { target:'portfolio-deep-skills', section:'Portfolio', color:C.green, title:'CPR/BLS, languages, and more', body:"Scroll down to log any certification with its issue and expiration date — handy for tracking renewals like CPR/BLS before they lapse.", onEnter:()=>goPortfolio('skills') },
    { target:'portfolio-sub-clinical', section:'Portfolio', color:C.green, title:'Clinical Hours', body:"Log shadowing and patient-care hours as you accumulate them — a running total that matters for almost every med-school-track pathway.", onEnter:()=>goPortfolio('clinical') },
    { target:'portfolio-deep-clinical', section:'Portfolio', color:C.green, title:'Log every shadowing shift', body:"Scroll down to log a site, supervisor, and hours for each shadowing day or patient-care shift — supervisor contact lets an entry eventually be marked verified instead of self-reported.", onEnter:()=>goPortfolio('clinical') },
    { target:'portfolio-sub-recommenders', section:'Portfolio', color:C.green, title:'Recommenders', body:"Keep track of who you're asking for letters of recommendation, what you've given them, and the status of each request.", onEnter:()=>goPortfolio('recommenders') },
    { target:'portfolio-deep-recommenders', section:'Portfolio', color:C.green, title:'Track every letter request', body:"Scroll down to add a recommender with their due date and request status, so nothing slips through as deadlines get close.", onEnter:()=>goPortfolio('recommenders') },
    { target:'portfolio-sub-interview', section:'Portfolio', color:C.green, title:'Interview Prep', body:"Practice with realistic interview formats — including MMI and CASPer-style scenarios — and get feedback on how you'd respond.", onEnter:()=>goPortfolio('interview') },
    { target:'portfolio-deep-interview', section:'Portfolio', color:C.green, title:'Practice real interview formats', body:"Scroll down to pick a format — traditional, MMI, or CASPer-style — and start a mock session with feedback on your answers.", onEnter:()=>goPortfolio('interview') },
    { target:'portfolio-sub-scores', section:'Portfolio', color:C.green, title:'Test Scores', body:"Log every SAT/ACT attempt and set a target score — this feeds straight into the Admissions Calculator and your Home dashboard's countdown.", onEnter:()=>goPortfolio('scores') },
    { target:'portfolio-deep-scores', section:'Portfolio', color:C.green, title:'Log scores, set a target', body:"Scroll down for the section-by-section breakdown of your latest score and to log a new attempt — your target score here drives the countdown gap shown on Home.", onEnter:()=>goPortfolio('scores') },
    { target:'portfolio-sub-calc', section:'Portfolio', color:C.green, title:'Admissions Calculator', body:"Estimate your competitiveness at specific schools using your GPA, test scores, rigor, and activities — sync it straight from your Portfolio with one button.", onEnter:()=>goPortfolio('calc') },
    { target:'portfolio-deep-calc', section:'Portfolio', color:C.green, title:'Sync your real data, one click', body:"Hit \"Sync with Portfolio\" to pull your latest GPA, test scores, and activity hours in automatically instead of retyping them here.", onEnter:()=>goPortfolio('calc') },

    // ── Progress ──────────────────────────────────────────────────────────────
    { target:'nav-progress', section:'Progress', color:C.cyan, title:'Progress — proof of the work', body:"A full picture of everything you've actually verified, mastered, and unlocked — separate from Home's daily snapshot, this is the long-run record.", onEnter:()=>setTab('progress') },
    { target:'progress-sub-overview', section:'Progress', color:C.cyan, title:'Overview', body:"Your big-picture stats: total XP, level, streak history, and how your onboarding goals are tracking over time.", onEnter:()=>goProgress('overview') },
    { target:'progress-deep-overview', section:'Progress', color:C.cyan, title:'The same readiness gauge, tracked over time', body:"This is the same application-strength gauge from your Portfolio overview — watch it here as a running measure of how ready you are, updated every time you log something new.", onEnter:()=>goProgress('overview') },
    { target:'progress-sub-verified', section:'Progress', color:C.cyan, title:'Verified Progress', body:"Lesson completion only counts here once you've passed its verification quiz — this is the trustworthy record of what you actually know, not just clicked through.", onEnter:()=>goProgress('verified') },
    { target:'progress-deep-verified', section:'Progress', color:C.cyan, title:'A credibility score, not just a checklist', body:"Scroll down and every unit lists each lesson's verification state individually — a lesson only counts as verified once its quiz is actually passed.", onEnter:()=>goProgress('verified') },
    { target:'progress-sub-performance', section:'Progress', color:C.cyan, title:'Performance', body:"Your accuracy broken down by category and topic, so you can see exactly where to focus your next study session.", onEnter:()=>goProgress('performance') },
    { target:'progress-deep-performance', section:'Progress', color:C.cyan, title:'Radar chart + course mastery', body:"The radar chart maps your accuracy by section, and the donut chart next to it shows overall course mastery — both update as you complete more quizzes.", onEnter:()=>goProgress('performance') },
    { target:'progress-sub-achievements', section:'Progress', color:C.cyan, title:'Achievements', body:"Badges and milestones you unlock for streaks, mastery, and consistency — a running record of what you've earned along the way.", onEnter:()=>goProgress('achievements') },
    { target:'progress-deep-achievements', section:'Progress', color:C.cyan, title:'Every badge, and how close you are', body:"Locked badges here still show your live progress toward unlocking them — hover or tap any badge to see exactly what it takes.", onEnter:()=>goProgress('achievements') },

    // ── Settings ──────────────────────────────────────────────────────────────
    { target:'nav-settings', section:'Settings', color:C.amber, title:'Settings — your account, your rules', body:"Your profile, goals, test date, sound preferences, study track, course load, data export, and account controls all live here now — its own tab, not buried in a menu.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-profile', section:'Settings', color:C.amber, title:'Profile', body:"Your display name, level, current pathway, and streak — update your name here any time.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-goals', section:'Settings', color:C.amber, title:'Your Goals', body:"What you told us at signup — your top goal, obstacles, and study method — feeds Iatra's coaching directly. Edit it any time your goals change; you're not locked into your first answer forever.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-examdate', section:'Settings', color:C.amber, title:'Test Day', body:"Set your test date here to see a live countdown and pacing guidance on Home.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-preferences', section:'Settings', color:C.amber, title:'Preferences', body:"Toggle sound effects for correct answers, level-ups, and achievements on or off.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-studytrack', section:'Settings', color:C.amber, title:'Study Track', body:"Switch your pathway here at any time — see full details on any track before committing, without retaking the diagnostic.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-courseload', section:'Settings', color:C.amber, title:'Current Course Load', body:"Tell us what you're taking so the AI Coach and Quiz Library can point you to material that's actually relevant to your classes.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-backup', section:'Settings', color:C.amber, title:'Data & Backup', body:"Export everything you've logged as a JSON file — useful for backup, or for moving to a new device.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-account', section:'Settings', color:C.amber, title:'Account', body:"See which email you're signed in with — your Portfolio data syncs to this account across devices.", onEnter:()=>setTab('settings') },
    { target:'settings-deep-danger', section:'Settings', color:C.amber, title:'Danger Zone', body:"Resetting progress or clearing local data is permanent — these controls exist, but use them deliberately.", onEnter:()=>setTab('settings') },

    // ── Quick Jump ────────────────────────────────────────────────────────────
    { target:'cmdk', section:'Everywhere', color:C.blueL, title:'Quick Jump (⌘K)', body:"Press ⌘K (or Ctrl+K) anytime, from anywhere in the app, to jump straight to any tab or sub-view — no clicking through menus. That's the whole tour — go explore.", onEnter:()=>{setTab('home');setCmdOpen(false);} },
  ],[goPrep,goPortfolio,goProgress]);

  // ── Quick-switch command palette — one searchable jump point across every ────
  // pillar/subview so the whole product (Prep, Portfolio, Progress, and every
  // absorbed sub-app inside them) reads as one thing you can move around in fast.
  const COMMANDS = useMemo(()=>[
    ...NAV.map(n=>({ id:`nav-${n.id}`, label:n.label, group:'Jump to', ic:n.ic, action:()=>setTab(n.id) })),
    ...PREP_SUBNAV.map(n=>({ id:`prep-${n.id}`, label:n.label, group:'Prep', ic:n.ic, action:()=>goPrep(n.id) })),
    ...PORTFOLIO_SUBNAV.map(n=>({ id:`port-${n.id}`, label:n.label, group:'Portfolio', ic:n.ic, action:()=>goPortfolio(n.id) })),
  ],[goPrep,goPortfolio]);
  const filteredCmds = useMemo(()=>{
    const q=cmdQ.trim().toLowerCase();
    if(!q) return COMMANDS;
    return COMMANDS.filter(c=>c.label.toLowerCase().includes(q)||c.group.toLowerCase().includes(q));
  },[COMMANDS,cmdQ]);
  useEffect(()=>{
    function onKey(e){
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); setCmdOpen(o=>!o); }
      else if(e.key==='Escape'){ setCmdOpen(false); }
    }
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[]);
  useEffect(()=>{ if(!cmdOpen) setCmdQ(''); },[cmdOpen]);
  const runCommand=useCallback((cmd)=>{ cmd.action(); setCmdOpen(false); play('click'); },[]);

  // ── Diagnostic ──────────────────────────────────────────────────────────────
  const [dStep,setDS]=useState(0);const [dAns,setDA]=useState([]);const [dDone,setDD]=useState(false);const [dRes,setDR]=useState(null);const [dCats,setDCats]=useState(null);
  const [dIntro,setDIntro]=useState(true); // show pathway overview + manual selection before the diagnostic quiz starts

  // ── Quiz ────────────────────────────────────────────────────────────────────
  const [aQuiz,setAQ]=useState(null);const [qSrch,setQSrch]=useState('');const [qCat,setQC]=useState('All');const [qDiff,setQD]=useState('All');const [qSort,setQSort]=useState('default');
  // Set when a quiz is launched from a pathway lesson's "Verify" button (rather than the Quiz
  // Library) so finishQuiz() knows to grade it as a verification attempt instead of a plain quiz.
  const [verifyCtx,setVerifyCtx]=useState(null); // { lesson, unit }

  // ── AI Coach (Iatra — multi-chat) ────────────────────────────────────
  const [msgs,setMsgs]=useState([]);const [ci,setCi]=useState('');const [cLoad,setCLoad]=useState(false);const chatEnd=useRef(null);
  const [copiedIdx,setCopiedIdx]=useState(null);
  // Every conversation is a row in DB.coachThreads (see src/lib/db.js v10) so a student can run
  // as many parallel Iatra chats as they want, and none of them disappear on reload the way
  // the old single in-memory `msgs` array did.
  const [coachThreads,setCoachThreads]=useState([]);
  const [activeThreadId,setActiveThreadId]=useState(null);
  const [threadsLoading,setThreadsLoading]=useState(true);
  const [coachSidebarOpen,setCoachSidebarOpen]=useState(false); // mobile-only slide-over
  const [renamingThreadId,setRenamingThreadId]=useState(null);
  const [renameDraft,setRenameDraft]=useState('');
  // Which of Iatra's three model tiers answers new messages — same idea as picking a Claude
  // model (Haiku/Sonnet/Opus). Persisted locally (a model preference, not study progress, so it
  // isn't part of cross-device sync) so the choice sticks across reloads.
  const [coachTier,setCoachTier]=useState(()=>{try{return localStorage.getItem('iatraTier')||'guide';}catch{return'guide';}});
  useEffect(()=>{try{localStorage.setItem('iatraTier',coachTier);}catch{/* ignore */}},[coachTier]);
  const COACH_TIERS=[
    {id:'scout',label:'Scout',desc:'Fastest — quick answers and everyday questions'},
    {id:'guide',label:'Guide',desc:'Balanced — the default for most coaching'},
    {id:'sage',label:'Sage',desc:'Deepest reasoning — essay feedback, complex strategy'},
  ];

  // ── Flashcards ──────────────────────────────────────────────────────────────
  const [activeDeck,setAD]=useState(null);const [cIdx,setCIdx]=useState(0);const [flip,setFlip]=useState(false);const [notes,setNotes]=useState('');const [gLoad,setGL]=useState(false);const [gStage,setGStage]=useState(0);const [gShake,setGShake]=useState(false);const [dSrch,setDS2]=useState('');const [studyMode,setStudyMode]=useState('all'); // 'all' | 'due'
  const [deckFilter,setDeckFilter]=useState('all'); // 'all' | 'due' | 'custom' | 'builtin'
  const [manageDeck,setManageDeck]=useState(null); // deck name currently being edited in the card manager modal
  const [newDeckOpen,setNewDeckOpen]=useState(false);
  const [newDeckName,setNewDeckName]=useState('');
  const [sessionStats,setSessionStats]=useState({reviewed:0,again:0,hard:0,good:0,easy:0,startedAt:Date.now(),streak:0,bestStreak:0,xp:0});
  const [genCount,setGenCount]=useState(20);
  const [genCountInput,setGenCountInput]=useState('20'); // raw text of the count field, so typing isn't clobbered mid-edit

  // ── Library ─────────────────────────────────────────────────────────────────
  const [lSrch,setLS]=useState('');
  const [lCat,setLC]=useState('All');
  const [lType,setLType]=useState('All');
  const [lDiff,setLDiff]=useState('All'); // All | Introductory | AP / Intermediate | Undergrad / Advanced
  const [lFreeOnly,setLFreeOnly]=useState(false);
  const [lSort,setLSort]=useState('default');
  const [lSubTab,setLSubTab]=useState('all'); // all | saved | completed
  const [openNotes,setOpenNotes]=useState({});

  // ── Portfolio ───────────────────────────────────────────────────────────────
  const [cF,setCF]=useState('All');


  // ── Calc ────────────────────────────────────────────────────────────────────
  const [cGPA,setCGPA]=useState('');const [cSAT,setCSAT]=useState('');const [cLead,setCLead]=useState('0');const [cEC,setCEC]=useState('0');const [cVol,setCV]=useState('0');const [cSt,setCST]=useState('');const [sType,setST]=useState('All');
  const [cRigor,setCRigor]=useState('2'); // Rigor state: count of AP/IB science & math classes
  const [selRegion,setSelRegion]=useState('All');
  const [selBsmd,setSelBsmd]=useState('All');
  const [selCommittee,setSelCommittee]=useState('All');
  const [selClinicalProx,setSelClinicalProx]=useState('All');
  const [selStateFilter,setSelStateFilter]=useState('All');
  const [calcSort,setCalcSort]=useState('score'); // 'score' | 'accept' | 'name'

  const [customSchools,setCustomSchools]=useState([]);
  const [showAddSchool,setShowAddSchool]=useState(false);
  const [csName,setCsName]=useState('');const [csGPA,setCsGPA]=useState('');const [csSAT,setCsSAT]=useState('');const [csAccept,setCsAccept]=useState('');const [csState,setCsState]=useState('');const [csType,setCsType]=useState('Public');

  // ACT to SAT Conversion
  const actToSat = (act) => {
    const map = {
      36: 1600, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370,
      29: 1340, 28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140,
      22: 1110, 21: 1080, 20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890,
      15: 850, 14: 810, 13: 770, 12: 710, 11: 630, 10: 560, 9: 480
    };
    return map[act] || (act < 9 ? 400 : 1000);
  };

  const syncWithPortfolio = async () => {
    try {
      const tid = toast.loading('Syncing with your Portfolio...');
      // Fetch latest test scores
      const scores = await listItems('test_scores');
      const actualScores = (scores || []).filter(s => !s.is_target);
      if (actualScores.length > 0) {
        const sorted = actualScores.sort((a,b) => b.test_date.localeCompare(a.test_date));
        const latestScore = sorted[0];
        if (latestScore.test_type === 'SAT') {
          setCSAT(String(latestScore.composite));
        } else if (latestScore.test_type === 'ACT') {
          const satEquiv = actToSat(latestScore.composite);
          setCSAT(String(satEquiv));
          toast.success(`Converted ACT composite ${latestScore.composite} to SAT equivalent ${satEquiv}!`);
        }
      }

      // Sync cumulative GPA
      if (portGpa && portGpa.length > 0) {
        const sortedGpas = [...portGpa].sort((a,b) => new Date(b.created_at || b.addedAt || 0) - new Date(a.created_at || a.addedAt || 0));
        setCGPA(String(sortedGpas[0].gpa));
      }

      // Sync hours from activities
      const volH = Math.round(portActivities.filter(a => a.activity_type === 'Volunteering').reduce((s, a) => s + (parseFloat(a.hours_per_week) || 0) * (parseFloat(a.weeks_per_year) || 0), 0));
      setCV(String(volH));

      // EC hours (excluding Volunteering, Leadership, Clinical)
      const ecH = Math.round(portActivities.filter(a => !['Volunteering', 'Clinical/Shadowing', 'Patient Care (paid)', 'Leadership'].includes(a.activity_type)).reduce((s, a) => s + (parseFloat(a.hours_per_week) || 0) * (parseFloat(a.weeks_per_year) || 0), 0));
      setCEC(String(ecH));

      // Leadership positions count
      const leadCount = portActivities.filter(a => a.activity_type === 'Leadership').length;
      setCLead(String(leadCount));

      // Rigor (count AP/IB courses selected in settings)
      const apCount = (user?.courses || []).filter(c => c.toLowerCase().includes('ap') || c.toLowerCase().includes('ib')).length;
      setCRigor(String(Math.max(apCount, 2)));

      toast.dismiss(tid);
      toast.success('Successfully synced profile from your Portfolio!');
    } catch (err) {
      console.error(err);
      toast.error('Sync failed: ' + err.message);
    }
  };

  // ── Settings ────────────────────────────────────────────────────────────────
  const [sName,setSN]=useState('');const [sSpec,setSS]=useState('');const [sfxOn,setSfxOn]=useState(true);const [sExamDate,setSExamDate]=useState('');
  // Settings > "Your Goals" — lets a student revisit/update what onboarding collected (goal,
  // obstacles, study method, things they want to accomplish) instead of it being locked in at
  // signup forever. Buffers are only seeded from `user` when the Edit button is clicked (tSettings()).
  const [sGoalsEditing,setSGoalsEditing]=useState(false);
  const [sGoal,setSGoal]=useState(null);
  const [sObstacles,setSObstacles]=useState([]);
  const [sStudyMethod,setSStudyMethod]=useState(null);
  const [sAccomplish,setSAccomplish]=useState([]);

  // ── Pomodoro ────────────────────────────────────────────────────────────────
  const [pomT,setPT]=useState(25*60);const [pomR,setPR]=useState(false);const [pomM,setPomM]=useState('focus');const [pomSessions,setPomSessions]=useState(0);

  // ── DB Init ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function loadFromDb(){
      // If this device's local profile belongs to a different signed-in account (shared
      // family/school computer, or someone else's earlier session), wipe it before loading —
      // otherwise the newly signed-in account would silently inherit a stranger's name, XP,
      // streak, and pathway progress instead of its own clean slate or account-backed rebuild.
      const priorLocalUser = await DB.getUser();
      if(priorLocalUser?.email && account?.email && priorLocalUser.email!==account.email){
        // Sync must stay off across this wipe — it belongs to whichever account is signed
        // in when the debounced push actually fires, and that's about to become this
        // (different) account, so pushing here would overwrite that account's real cloud
        // progress with a stranger's leftover local cache.
        DB.setSyncEnabled(false);
        await DB.clearAllData();
        clearViewState();
      }
      // Pull this account's cloud snapshot (XP, streak, quiz scores, flashcards, pathway
      // progress, achievements, Iatra threads, etc.) and merge it into whatever's already
      // in this browser's IndexedDB — the common case right after the reset above is an empty
      // local DB, so this is effectively "restore," but a genuine merge runs too in case this
      // device has progress of its own (e.g. it was used before ever syncing). Sync stays
      // disabled for the duration so this write-back never triggers a push of its own
      // intermediate state. Best-effort: offline or a fresh (never-synced) account both just
      // fall through to whatever's already local.
      if(account?.email){
        try{
          const remoteSnapshot = await ProgressSync.pullSnapshot();
          if(remoteSnapshot) await DB.applyRemoteSnapshot(remoteSnapshot);
        }catch(err){ console.error('Progress sync pull failed (continuing offline):', err); }
      }
      // Must run before getStreak() so a bridged (freeze-covered) gap is
      // already reflected in the streak calculation below.
      await DB.checkAndApplyStreakFreeze();
      const [u,pw,qs,qh,decks,deckMeta,cp,ach,str,rev,freezes,cos] = await Promise.all([
        DB.getUser(), DB.getPathway(), DB.getQuizScores(), DB.getQuizHistory(),
        DB.getFlashDecks(), DB.getDeckCreatedAtMap(), DB.getCatPerf(),
        DB.getAchievements(), DB.getStreak(), DB.getTotalCardReviews(),
        DB.getStreakFreezeCount(), DB.getCosmetics(),
      ]);
      // Backfill the account email onto older local profiles that predate this device/account
      // binding, so a mismatch on this device can actually be detected on a future sign-in.
      if(u&&!u.email&&account?.email){ u.email=account.email; DB.saveUser(u).catch(()=>{}); }
      if(u){setUser_(u);setAiChatCount(u.aiChatCount||0);setInterviewCount(u.interviewCount||0);}
      setPathway_(pw||{});
      setQScores_(qs||{});
      setQHistory(qh||[]);
      // Merge built-in decks with custom decks from DB
      const allDecks={};
      // Custom decks override built-in if same name
      Object.entries(decks||{}).forEach(([name,cards])=>{allDecks[name]=cards;});
      setCDecks_(allDecks);
      setDeckCreatedAt(deckMeta||{});
      setCatPerf_(cp||{});
      setAchiev_(ach||new Set());
      setStreak(str||0);
      setTotalReviews(rev||0);
      setStreakFreezes(freezes||0);
      setCosmetics(cos||new Set());
      // Load Iatra's persisted chat threads and resume the most recently
      // active one (if any) — mirrors how a normal chat app reopens where you left
      // off, instead of dropping a returning student back into an empty composer.
      try{
        const threads=await DB.getCoachThreads();
        setCoachThreads(threads||[]);
        if(threads?.length){
          setActiveThreadId(threads[0].id);
          const rows=await DB.getCoachMessages(threads[0].id);
          setMsgs((rows||[]).map(r=>({role:r.role,content:r.content})));
        }
      }catch(err){console.error('Failed to load Iatra chat threads',err);}
      setThreadsLoading(false);
      // Compute the gap since the last study day BEFORE recordStudyToday() stamps
      // today, so a returning user's actual absence is visible (once today is
      // recorded, "days since last study day" would trivially read as 0).
      if(u){
        const priorDays=(await DB.getStudyDays()).slice().sort();
        if(priorDays.length){
          const todayStr=new Date().toISOString().split('T')[0];
          const lastDay=priorDays[priorDays.length-1];
          if(lastDay!==todayStr){
            const gapDays=Math.round((new Date(todayStr)-new Date(lastDay))/86400000);
            if(gapDays>=2)setComebackGap(gapDays);
          }
        }
      }
      await DB.recordStudyToday();
    }
    async function init(){
      try{
        // Guard against IndexedDB/Dexie hanging forever (e.g. a blocked schema
        // upgrade because another tab still has the DB open at an older
        // version). Without this timeout, a hung promise here never resolves
        // or rejects, so setDbReady(true) is never reached and the app is
        // stuck on the loading screen indefinitely.
        await Promise.race([
          loadFromDb(),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('DB init timed out')),8000)),
        ]);
      }catch(e){console.error('DB init error:',e);}
      // Only start pushing local changes to the cloud once the initial load (including the
      // remote-merge write-back above) has fully settled, so nothing here races with it.
      DB.setSyncDirtyListener(ProgressSync.scheduleSyncPush);
      DB.setSyncEnabled(true);
      ProgressSync.installLifecycleFlush();
      setDbReady(true);
    }
    init();
    // Deliberately mount-only: `account` is read for its value at the moment this device's
    // local profile is loaded (to detect a different account signing in on this device), not
    // watched for changes — AuthGate remounts App fresh on every sign-in, so this always sees
    // the right account regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Portfolio (Supabase-backed: activities, awards, GPA history) ─────────────
  useEffect(()=>{
    if(tab!=='portfolio'||portLoaded)return;
    (async()=>{
      try{
        await migrateLocalPortfolioLogs();
        const [a,w,g]=await Promise.all([listItems('activities'),listItems('awards'),listItems('gpa_entries')]);
        setPortActivities(a||[]);
        setPortAwards(w||[]);
        setPortGpa(g||[]);
      }catch(e){console.error('Portfolio load error:',e);}
      setPortLoaded(true);
    })();
  },[tab,portLoaded]);

  // ── Pathway pacing goal (loaded per active pathway) ───────────────────────────
  useEffect(()=>{
    if(!user)return;
    const key=user.specialty||'exploring';
    DB.getPathwayGoal(key).then(g=>setPathwayGoalState(g||null)).catch(()=>setPathwayGoalState(null));
  },[user?.specialty]);
  async function setPathwayPaceGoal(weeks){
    const key=user?.specialty||'exploring';
    await DB.setPathwayGoal(key,weeks);
    setPathwayGoalState(await DB.getPathwayGoal(key));
    toast.success(`Pace goal set — ${weeks} week${weeks===1?'':'s'} to finish ${PATHS[key]?.label||'this pathway'}.`,{icon:<Target size={16}/>});
  }
  const [goalPromptDismissed,setGoalPromptDismissed]=useState(false);
  useEffect(()=>{
    const key=user?.specialty||'exploring';
    setGoalPromptDismissed(!!localStorage.getItem(`pathwayGoalDismissed:${key}`));
  },[user?.specialty]);
  function dismissPathwayPaceGoal(){
    const key=user?.specialty||'exploring';
    localStorage.setItem(`pathwayGoalDismissed:${key}`,'1');
    setGoalPromptDismissed(true);
  }

  // ── Lightweight Applications-side counts, for the achievement/reward loop ────
  useEffect(()=>{
    if(!user||!['portfolio','progress'].includes(tab))return;
    (async()=>{
      try{
        const [cols,ess]=await Promise.all([listItems('colleges'),listItems('essays')]);
        setAppCounts(c=>({...c,colleges:cols?.length||0,essays:ess?.length||0}));
      }catch(e){/* non-critical — achievement counts, fail silently */}
      try{
        const [hours,recs,sessions]=await Promise.all([listItems('clinical_hours'),listItems('recommenders'),DB.getInterviewSessions()]);
        setClinicalHoursEntries(hours||[]);
        setClinicalHoursTotal((hours||[]).reduce((s,h)=>s+(h.hours||0),0));
        setRecommendersCount((recs||[]).length);
        setMmiCasperCount((sessions||[]).filter(s=>s.mode==='mmi'||s.mode==='casper').length);
      }catch(e){/* non-critical */}
    })();
  },[tab,user]);

  useEffect(()=>{
    if(!user)return;
    checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount);
  },[appCounts,portActivities.length,(upcomingDeadlines||[]).length,clinicalHoursTotal,recommendersCount,mmiCasperCount]);

  // ── Weekly quest progress (cards reviewed since Monday) ──────────────────────
  useEffect(()=>{
    if(!['home','progress'].includes(tab))return;
    DB.getCardReviewsSince(getStartOfWeek().getTime()).then(setWeekCardReviews).catch(()=>{});
  },[tab,totalReviews]);

  const addPortActivity = useCallback(async(fields)=>{
    const row=await createItem('activities',{activity_type:fields.type,position:fields.name,description:fields.desc||'',status:'ongoing',hours_per_week:0,weeks_per_year:0,grade_levels:[],sort_order:portActivities.length,...fields.overrides});
    setPortActivities(p=>[...p,row]);
    return row;
  },[portActivities.length]);

  // ── Reward chest (unwrap/reveal ceremony for quest claims + daily check-in) ──
  const openChest = useCallback((opts)=>{ setChest(opts); },[]);
  const closeChest = useCallback(()=>{ setChest(null); },[]);

  // ── Optimistic save helpers ──────────────────────────────────────────────────
  const saveUser = useCallback((u)=>{ setUser_(u); DB.saveUser(u).catch(console.error); },[]);
  // Runs once the full ~30-screen onboarding flow (src/components/onboarding/Onboarding.jsx)
  // finishes. Creates the local (per-device) profile immediately so the app feels instant, and
  // separately pushes name/grade/testTrack/onboardingComplete to the Supabase-backed account —
  // fire-and-forget, since local state is already the source of truth for this render. Also
  // seeds a target test score row so the Portfolio score tracker picks up the goal the user
  // just set. Which pillar a brand-new user lands in depends on the goal they chose during
  // onboarding — "explore" sends them to the pathway diagnostic, "application" to Portfolio,
  // and "boost score" (the default) straight into practice quizzes.
  const completeOnboarding = useCallback((profile)=>{
    const name=(profile.name||'').trim();
    if(!name)return;
    const gradeStage = GRADE_STAGES[profile.gradeIdx]?.key || null;
    // Every one of these used to be computed for routing purposes only and
    // then discarded — Iatra, the dashboard, and Portfolio never saw
    // them again. Persisting them onto the user record is what lets
    // buildCoachSystemPrompt() (src/lib/studentProfile.js) and the
    // onboarding recap card actually use what the student told us.
    saveUser({
      name, specialty:'exploring', gradeStage, xp:0, streak:1, lastActive:Date.now(), email:account?.email,
      goal:profile.goal||null, obstacles:profile.obstacles||[], studyMethod:profile.studyMethod||null,
      accomplish:profile.accomplish||[], studyHours:profile.studyHours||null, testTrack:profile.testTrack||'SAT',
      onboardingCurrentScore:profile.currentScore||null, onboardingTargetScore:profile.targetScore||null,
      onboardingCompletedAt:Date.now(),
    });
    AuthAPI.updateMe({ name, gradeLevel:gradeStage, testTrack:profile.testTrack, onboardingComplete:true }).then(({user:updated})=>onAccountChange?.(updated)).catch(()=>{});
    if(profile.targetScore){
      createItem('test_scores',{ test_type:profile.testTrack==='ACT'?'ACT':'SAT', test_date:new Date().toISOString().slice(0,10), composite:profile.targetScore, section_scores:{}, is_target:true }).catch(()=>{});
    }
    if(profile.goal==='explore_pathway') goPrep('diagnostic');
    else if(profile.goal==='build_application') goPortfolio('overview');
    else goPrep('quizzes');
    toast.success(pickNudge('welcome_new_user',{name}));
    tourPendingRef.current=true;
    setJustOnboarded(true);
  },[saveUser,goPrep,goPortfolio,onAccountChange,account]);
  // Cross-device: if this device has no local profile yet but the signed-in account already
  // finished onboarding elsewhere, rebuild the local profile from the account instead of asking
  // for their name again.
  useEffect(()=>{
    if(!dbReady||user||!account?.onboardingComplete||!account?.name)return;
    saveUser({ name:account.name, specialty:'exploring', gradeStage:account.gradeLevel||null, xp:0, streak:1, lastActive:Date.now(), email:account.email });
  },[dbReady,user,account,saveUser]);
  // A lesson only counts toward mastery/unlock-gating once it's actually verified (curated quiz
  // passed) — for lessons with no quizIds yet (pathways not migrated to the new model this pass),
  // presence in `pathway` is still enough, matching the original self-report behavior.
  const isLessonComplete = useCallback((lesson,entry)=>{
    if(!entry)return false;
    if(lesson.quizIds?.length)return !!entry.verified;
    return true;
  },[]);
  const saveQuizScore = useCallback(async(quizId,score)=>{ setQScores_(q=>({...q,[quizId]:score})); await DB.saveQuizScore(quizId,score); const h=await DB.getQuizHistory(); setQHistory(h); },[]);
  const saveDeck = useCallback(async(name,cards)=>{
    setCDecks_(d=>({...d,[name]:cards}));
    setDeckCreatedAt(m=>m[name]?m:{...m,[name]:Date.now()});
    await DB.saveDeck(name,cards);
  },[]);
  const deleteDeck_ = useCallback(async(name)=>{
    setCDecks_(d=>{const nd={...d};delete nd[name];return nd;});
    setDeckCreatedAt(m=>{const nm={...m};delete nm[name];return nm;});
    await DB.deleteDeck(name);
  },[]);
  const createDeck = useCallback(async(name)=>{ await saveDeck(name,[]); },[saveDeck]);
  const addCardToDeck = useCallback(async(name,front,back)=>{
    const cards=[...(cDecks[name]||[]),{front,back}];
    await saveDeck(name,cards);
  },[cDecks,saveDeck]);
  const updateCardInDeck = useCallback(async(name,idx,front,back)=>{
    const cards=[...(cDecks[name]||[])];
    if(cards[idx])cards[idx]={...cards[idx],front,back};
    await saveDeck(name,cards);
  },[cDecks,saveDeck]);
  const deleteCardFromDeck = useCallback(async(name,idx)=>{
    const cards=(cDecks[name]||[]).filter((_,i)=>i!==idx);
    await saveDeck(name,cards);
  },[cDecks,saveDeck]);
  const saveCatPerf = useCallback((cat,score)=>{ setCatPerf_(cp=>({...cp,[cat]:{ total:(cp[cat]?.total||0)+score, count:(cp[cat]?.count||0)+1 }})); DB.updateCatPerf(cat,score).catch(console.error); },[]);

  // ── Timers ───────────────────────────────────────────────────────────────────
  useEffect(()=>{if(!pomR)return;const id=setInterval(()=>setPT(t=>t>0?t-1:0),1000);return()=>clearInterval(id);},[pomR]);
  useEffect(()=>{if(pomT===0&&pomR){setPR(false);play('bell');const n=pomM==='focus'?'break':'focus';setPomM(n);setPT(n==='focus'?25*60:5*60);if(pomM==='focus')setPomSessions(s=>s+1);toast.success(pomM==='focus'?'Focus session complete — take a short break.':"Break's over — back to studying.");}},[ pomT,pomR,pomM]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth'});},[msgs]);

  // ── Flashcard study keyboard shortcuts (Space/Enter flip, 1-4 rate) ──────────
  useEffect(()=>{
    if(tab!=='prep'||prepView!=='flashcards'||!activeDeck)return;
    function onKey(e){
      if(e.target&&['TEXTAREA','INPUT'].includes(e.target.tagName))return;
      if(e.key===' '||e.key==='Enter'){e.preventDefault();setFlip(f=>!f);return;}
      if(flip&&['1','2','3','4'].includes(e.key)){
        const label=['Again','Hard','Good','Easy'][parseInt(e.key,10)-1];
        rateCard(label);
      }
    }
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[tab,prepView,activeDeck,flip,cIdx]);

  // ── Computed values ──────────────────────────────────────────────────────────
  const eSpec   = user?.specialty||'exploring';
  const curPath = PATHS[eSpec]||PATHS['exploring'];
  const accent  = curPath?.accent||C.blue;
  // What onboarding collected, turned back into human-readable copy — shown on both the
  // Progress overview (read-only recap) and Settings ("Your Goals," editable). See
  // src/lib/studentProfile.js for why this exists: onboarding answers used to be discarded
  // after routing the student to their first pillar and never seen again.
  const onboardingRecap = useMemo(()=>buildOnboardingRecap(user),[user]);
  const onboardingCompleteness = useMemo(()=>computeOnboardingCompleteness(user),[user]);
  const allL    = Object.values(PATHS).flatMap(p=>(p.units||[]).flatMap(u=>u.lessons||[]));
  const doneL   = allL.filter(l=>isLessonComplete(l,pathway[l.id])).length;
  const mastery = allL.length>0?Math.round((doneL/allL.length)*100):0;
  // Current-pathway-only lesson count (distinct from the cross-pathway `allL`/`doneL`/`mastery`
  // above), for the pacing goal indicator — a goal is "3 of 9 lessons in Nursing," not a share
  // of all 90 lessons across every pathway.
  const curPathAllL  = (curPath?.units||[]).flatMap(u=>u.lessons||[]);
  const curPathDoneL = curPathAllL.filter(l=>isLessonComplete(l,pathway[l.id])).length;
  const levelInfo = getLevelInfo(user?.xp||0);
  const lvl     = levelInfo.level;
  const xpIn    = levelInfo.xpIntoLevel;
  const xpForNext = levelInfo.xpForNext;
  const nearLevelUp = (xpForNext-xpIn) > 0 && (xpForNext-xpIn) <= 25;
  const qTaken  = Object.keys(qScores).length;
  const avgSc   = qTaken>0?Math.round(Object.values(qScores).reduce((a,b)=>a+b,0)/qTaken):0;
  const pomPct  = pomM==='focus'?(pomT/(25*60))*100:(pomT/(5*60))*100;
  const daysToExam = user?.examDate ? Math.ceil((new Date(user.examDate+'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;

  // Predicted SAT score
  const cats3   = ['Life Sciences','Physical Sciences','Behavioral & Social Sciences'];
  const secAvgs = cats3.map(cat=>{const cQ=ALL_QUIZZES.filter(q=>q.cat===cat);const tk=cQ.filter(q=>qScores[q.id]!==undefined);return tk.length?Math.round(tk.reduce((s,q)=>s+qScores[q.id],0)/tk.length):null;});
  const predSAT = secAvgs.every(v=>v!==null) ? Math.round(secAvgs.reduce((s,v)=>s+scoreToSection(v),0)/secAvgs.length) : null;

  // FSRS due count (across built-in and custom decks)
  const allCards = useMemo(()=>[...Object.values(FLASH_DECKS).flat(),...Object.values(cDecks).flat()],[cDecks]);
  const dueCards = useMemo(()=>getDueCards(allCards).length,[allCards]);
  const avgRetention = useMemo(()=>{
    const rets = allCards.map(c=>getRetainability(c)).filter(r=>r!==null);
    return rets.length?Math.round(rets.reduce((s,r)=>s+r,0)/rets.length):null;
  },[allCards]);

  // Next lesson to resume (first not-done lesson in current pathway, in order)
  const nextLesson = useMemo(()=>{
    for(const u of (curPath?.units||[])){ for(const l of (u.lessons||[])){ if(!isLessonComplete(l,pathway[l.id])) return {...l,unitTitle:u.title}; } }
    return null;
  },[curPath,pathway,isLessonComplete]);

  // Iatra Quiz Recommendations — ranked #1..#N picks driven by real performance
  // data (weak categories, enrolled courses, pathway). See lib/recommend.js.
  const catAverages = useMemo(()=>Object.fromEntries(cats3.map((c,i)=>[c,secAvgs[i]])),[secAvgs]);
  const courseCats  = useMemo(()=>new Set((user?.courses||[]).map(c=>COURSE_CAT_MAP[c]).filter(Boolean)),[user?.courses]);
  const rankedQuizzes = useMemo(()=>rankQuizzes({
    quizzes: ALL_QUIZZES, qScores, catAverages, courseCats,
    pathwayCats: curPath?.quizCats||[], pathwayLabel: curPath?.label||'', count:6,
  }),[qScores,catAverages,courseCats,curPath]);
  const topPick = rankedQuizzes[0];

  // Optional one-line Iatra (Groq) narration of the #1 pick — the ranking
  // above is fully deterministic and never depends on this; it's cosmetic.
  const askIatraAboutPick = useCallback(async(pick)=>{
    // Cached per quiz per day — this narration is cosmetic and identical for a given pick
    // within a day, so repeat views/clicks shouldn't re-hit Groq.
    const cacheKey = dailyKey('pickNarration', pick?.quiz?.id||'');
    const cached = getCached(cacheKey);
    if(cached) return cached;
    const prompt = getIatraPickPrompt({ pick, studentName: user?.name, pathwayLabel: curPath?.label });
    if(!prompt) return null;
    const text = await callGroqAI('You are Iatra, an encouraging AI study coach for a high schooler. Respond with exactly one short sentence, no markdown.', prompt, 60, null, 'scout');
    setCached(cacheKey, text);
    return text;
  },[user?.name,curPath]);

  // ── Pathway helpers ──────────────────────────────────────────────────────────
  const unitM = (unit)=>unit?.lessons?.length?Math.round(unit.lessons.filter(l=>isLessonComplete(l,pathway[l.id])).length/unit.lessons.length*100):0;
  // States: 'verified' (quiz passed), 'done' (legacy self-report, no curated quiz on this lesson),
  // 'studying' (opened but not yet verified — does NOT unlock the next unit), 'available', 'locked'.
  const lessonState = (lesson,ui,units)=>{
    const entry=pathway[lesson.id];
    if(entry){
      if(lesson.quizIds?.length)return entry.verified?'verified':'studying';
      return'done';
    }
    if(ui===0)return'available';
    const prev=units[ui-1];
    if(!prev)return'available';
    return prev.lessons.every(l=>isLessonComplete(l,pathway[l.id]))?'available':'locked';
  };

  function switchPath(sp){if(!PATHS[sp]||!user)return;saveUser({...user,specialty:sp});toast(`Switched to ${PATHS[sp]?.label} pathway`,{icon:<RefreshCw size={16}/>});}

  async function signOut(){
    // Flush any progress still sitting behind the debounce window before wiping this device's
    // local copy, so a burst of XP/reviews right before signing out isn't lost from the cloud
    // snapshot the next device pulls. Best-effort — an offline sign-out still clears locally.
    try{ await ProgressSync.flushNow(); }catch(err){ console.error('Pre-signout sync flush failed:',err); }
    DB.setSyncEnabled(false);
    await DB.clearAllData();
    clearViewState();
    setUser_(null);setPathway_({});setQScores_({});setCDecks_({});setPortActivities([]);setPortAwards([]);setPortGpa([]);setPortLoaded(false);setCatPerf_({});setAchiev_(new Set());setStreak(0);setTab('home');
    toast('Signed out. See you next time!');
  }

  // ── Achievement checker ──────────────────────────────────────────────────────
  const checkAndUnlockAchievements = useCallback(async(u,qCount,perfect,str,reviews,mast,aiC,extra={})=>{
    const unlocked = await DB.getAchievements();
    const toUnlock = checkAchievements({
      level:u?getLevelInfo(u.xp||0).level:1, quizCount:qCount, perfectScores:perfect, streak:str, cardReviews:reviews, mastery:mast, aiChats:aiC,
      interviewSessions: extra.interviewSessions??interviewCount, colleges: extra.colleges??appCounts.colleges, essays: extra.essays??appCounts.essays,
      activities: extra.activities??portActivities.length, deadlines: extra.deadlines??(upcomingDeadlines||[]).length, resumeBuilt: extra.resumeBuilt??appCounts.resume,
      clinicalHours: extra.clinicalHours??clinicalHoursTotal, recommenders: extra.recommenders??recommendersCount, mmiCasperSessions: extra.mmiCasperSessions??mmiCasperCount,
      pathwayCompletions: extra.pathwayCompletions??new Set(),
      unlocked,
    });
    for(const achievement of toUnlock){
      const isNew = await DB.unlockAchievement(achievement.key);
      if(isNew){
        setAchiev_(prev=>new Set([...prev,achievement.key]));
        const bonusXP=achievement.xp||0;
        if(u&&bonusXP>0){const nu={...u,xp:(u.xp||0)+bonusXP};saveUser(nu);}
        if(achievement.key==='streak_7'||achievement.key==='streak_30'){
          const granted=await DB.grantStreakFreeze();
          if(granted){
            setStreakFreezes(await DB.getStreakFreezeCount());
            toast(pickNudge('streak_freeze_earned'),{icon:<Snowflake size={14} color={C.blueL}/>,duration:4500});
          }
        }
        showAchievementToast(achievement);
      }
    }
  },[saveUser,interviewCount,appCounts,upcomingDeadlines,portActivities,clinicalHoursTotal,recommendersCount,mmiCasperCount]);

  // ── Level-up checker ─────────────────────────────────────────────────────────
  const prevLvlRef = useRef(1);
  useEffect(()=>{
    if(!user)return;
    const curLvl=getLevelInfo(user.xp||0).level;
    if(curLvl>prevLvlRef.current){
      celebrateLevelUp();
      play('levelUp');
      toast.success(pickNudge('level_up',{level:curLvl,tier:getLevelInfo(user.xp||0).tier}),{duration:4000,icon:<Trophy size={16}/>});
    }
    prevLvlRef.current=curLvl;
  },[user?.xp]);

  // ── Daily check-in (rewards opening the app, before any studying) ───────────
  const checkinTriggeredRef = useRef(false);
  useEffect(()=>{
    if(!dbReady||!user||checkinTriggeredRef.current)return;
    checkinTriggeredRef.current=true;
    (async()=>{
      const already = await getTodayCheckinStatus();
      if(already)return;
      const [day,everChecked] = await Promise.all([getNextCheckinDay(),DB.hasAnyCheckin()]);
      const reward = getCheckinReward(day);
      const cosmetic = reward.chest ? rollCosmetic(cosmetics) : null;
      openChest({
        title: `Day ${day} Check-in`,
        eyebrow: everChecked ? 'Welcome back' : 'Welcome',
        xp: reward.xp,
        cosmetic,
        onOpen: async ()=>{
          const claimed = await claimCheckin(day);
          if(!claimed)return; // today's check-in was already recorded (e.g. reload race) — don't double-grant
          saveUser({ ...user, xp: (user.xp||0) + reward.xp });
          play('xp');
          if(cosmetic){ await DB.unlockCosmetic(cosmetic.key); setCosmetics(prev=>new Set([...prev,cosmetic.key])); }
        },
      });
    })();
  },[dbReady,user]);

  // ── Streak-at-risk nudge — opportunity-framed, once per day, dismissible ────
  const streakNudgeRef = useRef(false);
  useEffect(()=>{
    if(!dbReady||!user||streakNudgeRef.current||streak<=2)return;
    if(new Date().getHours()<18)return; // evening only
    (async()=>{
      const todayKey = new Date().toISOString().split('T')[0];
      const nudgeKey = `streakNudge:${todayKey}`;
      if(localStorage.getItem(nudgeKey))return;
      const days = await DB.getStudyDays();
      if(days.includes(todayKey))return; // already studied today
      localStorage.setItem(nudgeKey,'1');
      streakNudgeRef.current=true;
      toast(pickNudge('streak_at_risk',{streak}),{icon:<Flame size={14} color={C.amberL}/>,duration:5000});
    })();
  },[dbReady,user,streak]);

  // ── Streak milestone / personal-best nudges — fires once per session, compares
  // against a cross-session localStorage baseline so it only celebrates a genuine
  // new milestone/record rather than re-firing every time the app is reopened at
  // an already-reached streak length (see level-up checker above for the pattern
  // this avoids: comparing only against an in-session ref default).
  const streakCheckedRef = useRef(false);
  useEffect(()=>{
    if(!dbReady||streakCheckedRef.current)return;
    streakCheckedRef.current=true;
    const lastKnown=parseInt(localStorage.getItem('lastKnownStreak')||'0',10);
    const best=parseInt(localStorage.getItem('bestStreakEver')||'0',10);
    if(streak>lastKnown&&streak>0){
      const milestones=[3,7,14,30,50,100];
      if(milestones.includes(streak)){
        toast.success(pickNudge(`streak_day_${streak}`,{streak}),{icon:<Flame size={16} color={C.amberL}/>,duration:4000});
      } else if(streak>best&&streak>2){
        toast.success(pickNudge('personal_best_streak',{streak}),{icon:<Trophy size={16}/>,duration:3500});
      }
    }
    if(streak>best)localStorage.setItem('bestStreakEver',String(streak));
    localStorage.setItem('lastKnownStreak',String(streak));
  },[dbReady,streak]);

  // ── Comeback nudge — fires once per session for a returning user who had a
  // multi-day gap since their last study day (computed in loadFromDb before
  // recordStudyToday() runs, so it reflects the gap, not "0 days" post-record).
  const comebackCheckedRef = useRef(false);
  useEffect(()=>{
    if(!dbReady||comebackCheckedRef.current||comebackGap==null)return;
    comebackCheckedRef.current=true;
    if(comebackGap===2)toast(pickNudge('comeback_short'),{icon:<Coffee size={14}/>,duration:4500});
    else if(comebackGap>=3&&comebackGap<=6)toast(pickNudge('comeback_medium'),{icon:<Coffee size={14}/>,duration:4500});
    else if(comebackGap>=7)toast(pickNudge('comeback_long'),{icon:<Coffee size={14}/>,duration:5000});
  },[dbReady,comebackGap]);

  // ── AI (Iatra, powered by Groq) ────────────────────────────────────────────
  async function callGroqAI(sys, msg, toks = 700, hist = null, tier = 'guide') {
    let r, d;
    try {
      r = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: sys, message: msg, messages: hist, maxTokens: toks, tier }),
      });
    } catch {
      throw new Error("Couldn't reach Iatra — check your connection and try again.");
    }
    try {
      d = await r.json();
    } catch {
      throw new Error('Iatra sent back an unreadable response. Please try again.');
    }
    if (typeof d.requestsRemaining === 'number') setCoachRequestsRemaining(d.requestsRemaining);
    if (typeof d.requestsUsedToday === 'number') setCoachRequestsUsedToday(d.requestsUsedToday);
    if (typeof d.dailyLimit === 'number') setCoachDailyLimit(d.dailyLimit);
    if (!r.ok) {
      const m = d?.error || '';
      if (r.status === 429) throw new Error(m || 'Rate limit reached. Please wait a moment.');
      if (r.status === 500 && m.includes('not configured')) throw new Error('Add GROQ_API_KEY to Vercel environment variables.');
      if (r.status === 504) throw new Error(m || 'Iatra took too long to respond. Please try again.');
      throw new Error(m || `Error ${r.status}`);
    }
    if (typeof d.content !== 'string' || !d.content.trim()) {
      throw new Error("Iatra didn't return a usable answer. Please try again.");
    }
    return d.content;
  }

  // Moves a touched thread to the top of the local sidebar list and stamps its
  // updatedAt, mirroring what DB.addCoachMessage() already did in IndexedDB —
  // avoids a full re-fetch of the thread list on every message.
  function bumpThreadLocally(id){
    setCoachThreads(list=>{
      const now=Date.now();
      const idx=list.findIndex(t=>t.id===id);
      if(idx===-1)return list;
      const touched={...list[idx],updatedAt:now};
      return [touched,...list.slice(0,idx),...list.slice(idx+1)];
    });
  }

  async function requestAIResponse(history,threadId,chatCountForAchievements=aiChatCount){
    setCLoad(true);
    try{
      const weakIdx=secAvgs.map((v,i)=>({v,i})).filter(o=>o.v!==null).sort((a,b)=>a.v-b.v)[0];
      const nextDeadline=(upcomingDeadlines||[]).map(d=>({...d,days:Math.ceil((new Date(d.due_date)-new Date())/86400000)})).filter(d=>d.days>=0).sort((a,b)=>a.days-b.days)[0];
      const sysPrompt=buildCoachSystemPrompt({
        pathwayLabel:curPath?.label||'college prep',
        pathCoachNote:PATH_COACH_NOTES[eSpec]||PATH_COACH_NOTES.exploring,
        gradeLabel:GRADE_STAGES.find(g=>g.key===user?.gradeStage)?.label||null,
        user,
        courses:user?.courses||[],
        apIb:!!user?.apIb,
        weakestCategory:weakIdx?cats3[weakIdx.i]:null,
        weakestScore:weakIdx?weakIdx.v:null,
        dueCards,
        nextDeadlineTitle:nextDeadline?.title||null,
        nextDeadlineDays:nextDeadline?.days??null,
        portfolioActivityCount:portActivities.length,
        clinicalHours:clinicalHoursTotal,
        recommendersCount,
        collegeCount:appCounts.colleges,
        essayCount:appCounts.essays,
        streak,
      });
      const lastUser=[...history].reverse().find(m=>m.role==='user');
      const r=await callGroqAI(sysPrompt,lastUser?.content||'',700,history.filter(m=>m.role!=='error'),coachTier);
      setMsgs(m=>[...m,{role:'assistant',content:r}]);
      if(threadId){ DB.addCoachMessage(threadId,'assistant',r).catch(console.error); bumpThreadLocally(threadId); }
      checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,chatCountForAchievements);
    }catch(e){setMsgs(m=>[...m,{role:'error',content:e.message}]);toast.error(e.message.slice(0,80));}
    setCLoad(false);
  }

  const lastSendAtRef = useRef(0);
  async function sendChat(message){
    if(!message.trim()||cLoad)return;
    if(coachRequestsRemaining<=0){toast.error(`Your daily Iatra quota has been reached. Try again tomorrow.`);return;}
    // Small cooldown (independent of cLoad, which only covers the in-flight request) so a fast
    // double-tap on send can't fire two nearly-identical Groq calls back to back.
    const now=Date.now();
    if(now-lastSendAtRef.current<3000){toast('Give Iatra a moment before sending again.',{icon:'⏳'});return;}
    lastSendAtRef.current=now;
    let threadId=activeThreadId;
    if(!threadId){
      // First message in a fresh compose view — lazily create the thread now
      // (rather than on "New chat" click) so browsing away without typing
      // anything never leaves an empty chat cluttering the sidebar.
      const title=message.trim().slice(0,48)||'New chat';
      try{
        const thread=await DB.createCoachThread(title);
        threadId=thread.id;
        setActiveThreadId(threadId);
        setCoachThreads(list=>[thread,...list]);
      }catch(err){console.error('Failed to create chat thread',err);toast.error('Could not start a new chat — try again.');return;}
    }
    const um={role:'user',content:message};const next=[...msgs,um];
    setMsgs(next);setCi('');
    DB.addCoachMessage(threadId,'user',message).catch(console.error);
    bumpThreadLocally(threadId);
    const newCount=aiChatCount+1;setAiChatCount(newCount);saveUser({...user,aiChatCount:newCount});bumpWeeklyCoachCount(getIsoWeekKey());
    await requestAIResponse(next,threadId,newCount);
  }

  function retryChat(){
    if(cLoad)return;
    const trimmed=msgs[msgs.length-1]?.role==='error'?msgs.slice(0,-1):msgs;
    setMsgs(trimmed);
    requestAIResponse(trimmed,activeThreadId);
  }

  // ── Chat thread management ───────────────────────────────────────────────────
  function startNewChat(){
    setActiveThreadId(null);
    setMsgs([]);
    setCoachSidebarOpen(false);
  }
  async function switchChatThread(id){
    if(id===activeThreadId){ setCoachSidebarOpen(false); return; }
    setActiveThreadId(id);
    setCoachSidebarOpen(false);
    try{
      const rows=await DB.getCoachMessages(id);
      setMsgs((rows||[]).map(r=>({role:r.role,content:r.content})));
    }catch(err){console.error('Failed to load chat thread',err);toast.error('Could not load that chat.');}
  }
  function beginRenameThread(thread){
    setRenamingThreadId(thread.id);
    setRenameDraft(thread.title);
  }
  async function commitRenameThread(){
    const title=renameDraft.trim();
    const id=renamingThreadId;
    setRenamingThreadId(null);
    if(!title||!id)return;
    setCoachThreads(list=>list.map(t=>t.id===id?{...t,title}:t));
    try{ await DB.renameCoachThread(id,title); }catch(err){console.error('Failed to rename chat thread',err);}
  }
  async function deleteChatThread(id){
    if(!window.confirm('Delete this chat? This cannot be undone.'))return;
    setCoachThreads(list=>list.filter(t=>t.id!==id));
    if(id===activeThreadId){ setActiveThreadId(null); setMsgs([]); }
    try{ await DB.deleteCoachThread(id); }catch(err){console.error('Failed to delete chat thread',err);toast.error('Could not delete that chat.');}
  }

  function copyMsg(text,i){
    navigator.clipboard?.writeText(text).then(()=>{
      setCopiedIdx(i);
      setTimeout(()=>setCopiedIdx(c=>c===i?null:c),1600);
    });
  }

  const GEN_STAGES = ['Reading your notes…', 'Extracting key concepts…', 'Selecting the best cards…', 'Polishing answers…'];
  const GEN_COUNT_MIN = 5, GEN_COUNT_MAX = 150;

  function commitGenCount(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) { setGenCountInput(String(genCount)); return; }
    const clamped = Math.min(GEN_COUNT_MAX, Math.max(GEN_COUNT_MIN, n));
    if (clamped !== n) toast(`Card count clamped to ${clamped} (range is ${GEN_COUNT_MIN}–${GEN_COUNT_MAX}).`, { icon: <Wand2 size={14}/> });
    setGenCount(clamped);
    setGenCountInput(String(clamped));
  }

  async function genDeck() {
    const sourceOk = notes.trim().length >= 40;
    if (!sourceOk || gLoad) {
      if (!sourceOk) {
        toast.error('Paste at least a few sentences of notes (minimum ~5 sentences).');
        setGShake(true); setTimeout(()=>setGShake(false), 420);
      }
      return;
    }
    setGL(true); setGStage(0);
    const stageTimer = setInterval(()=>setGStage(s=>Math.min(s+1, GEN_STAGES.length-1)), 750);
    const startedAt = Date.now();
    try {
      const { cards, requested, generated, coverage } = generateAIFlashcards({ text: notes, count: genCount });
      // Guarantee the stage narrative has time to actually play out, so
      // generation never feels like an instant flicker even though the local
      // engine resolves in a few milliseconds.
      const minFloor = GEN_STAGES.length * 550;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minFloor) await new Promise(r => setTimeout(r, minFloor - elapsed));
      const deckName = `Notes Deck — ${new Date().toLocaleDateString()}`;
      await saveDeck(deckName, cards);
      setNotes('');
      setAD({ name: deckName, cards, builtin: false });
      setCIdx(0);
      setFlip(false);
      if (coverage === 'full') {
        toast.success(`Generated all ${generated} flashcards you asked for.`, { icon: <Brain size={16}/> });
      } else {
        toast(`Generated ${generated} of the ${requested} you asked for — that's every distinct fact we could find in your notes. Add more detail for more cards.`, { icon: <Wand2 size={16}/>, duration: 5000 });
      }
    } catch (e) {
      toast.error(e.message.slice(0, 160));
    }
    clearInterval(stageTimer);
    setGL(false);
  }

  async function rateCard(label){
    if(!currentCard||!activeDeck)return;
    const updated=scheduleCard(currentCard,label);
    const deckName=activeDeck.name;
    const allDeckCards=activeDeck.builtin?[...(FLASH_DECKS[deckName]||[])]:[...(cDecks[deckName]||[])];
    const idx=allDeckCards.findIndex(c=>c.front===currentCard.front&&c.back===currentCard.back);
    if(idx>=0)allDeckCards[idx]=updated;
    if(!activeDeck.builtin)await saveDeck(deckName,allDeckCards);
    await DB.recordCardReview(currentCard.id||cIdx);
    const newTotal=totalReviews+1;setTotalReviews(newTotal);
    checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,newTotal,mastery,aiChatCount);

    // ── Combo streak + XP: the dopamine loop for card review ──────────────────
    const correct = label !== 'Again';
    const xpMap = { Again: 0, Hard: 2, Good: 4, Easy: 6 };
    const nextCombo = correct ? sessionStats.streak + 1 : 0;
    const bonus = correct && nextCombo >= 3 ? Math.min(5, Math.floor(nextCombo / 3)) : 0;
    const baseGain = xpMap[label] + bonus;
    const nextBest = Math.max(sessionStats.bestStreak, nextCombo);
    let xpGain = 0, cardTier = 'none';
    if (baseGain > 0) {
      ({ finalXP: xpGain, tier: cardTier } = awardXP(baseGain));
      saveUser({ ...user, xp: (user?.xp || 0) + xpGain });
      play('xp');
      if (cardTier === 'jackpot') { celebrateJackpot(); play('jackpot'); }
      else if (cardTier === 'big' || cardTier === 'bonus') { celebrateBonusXP(); }
      if (cardTier !== 'none') toast.success(BONUS_COPY[cardTier](xpGain), { duration: cardTier==='jackpot'?3500:1800 });
    }
    if (correct && [5, 10, 15, 20, 25].includes(nextCombo)) {
      play('achieve');
      celebrateStreak();
      toast.success(`${nextCombo} in a row — you're on fire!`, { icon: <Flame size={16} color={C.amberL}/>, duration: 2600 });
    } else if (!correct && sessionStats.streak >= 5) {
      toast(`Streak broken at ${sessionStats.streak} — back at it.`, { icon: <RefreshCw size={14}/>, duration: 1800 });
    }
    setSessionStats(s => ({ ...s, reviewed: s.reviewed + 1, [label.toLowerCase()]: s[label.toLowerCase()] + 1, streak: nextCombo, bestStreak: nextBest, xp: s.xp + xpGain }));
    if(cIdx===deckCards.length-1)setTimeout(()=>toast.success(pickNudge('flashcard_session_complete'),{icon:<Layers3 size={16}/>,duration:3200}),300);
    setCIdx(i=>Math.min(deckCards.length-1,i+1));
    setFlip(false);
  }

  // ── Lesson Player (Overview → Article → Video → Quiz → Complete) ────────────
  const VERIFY_PASS_PCT=70;
  function getNextLesson(lesson){
    const flat=(curPath?.units||[]).flatMap(u=>u.lessons.map(l=>({lesson:l,unit:u})));
    const idx=flat.findIndex(x=>x.lesson.id===lesson.id);
    return (idx===-1||idx===flat.length-1)?null:flat[idx+1];
  }
  function openLesson(lesson,unit){
    const already=pathway[lesson.id];
    const isResuming=!!already?.studying&&!already?.verified;
    DB.startLessonStudy(lesson.id).catch(console.error);
    logEvent('lesson_video_watched',lesson.id);
    if(!already?.verified)setPathway_(pw=>({...pw,[lesson.id]:{...(pw[lesson.id]||{}),studying:true,studyStartedAt:Date.now()}}));
    setActiveLesson({lesson,unit});
    setArticleRead(!!already?.verified);
    setVideoWatched(!!already?.verified);
    setLessonStep(already?.verified?'complete':'overview');
    if(!already?.verified){
      const hour=new Date().getHours(),day=new Date().getDay();
      const scenario=isResuming?'session_resume':(day===0||day===6)?'weekend_session':hour<10?'morning_session':hour>=20?'evening_session':'lesson_started';
      toast(pickNudge(scenario,{lesson:lesson.title}),{icon:<BookOpen size={16}/>,duration:2600});
    }
  }
  function closeLesson(){ setActiveLesson(null); setLessonStep('overview'); setArticleRead(false); setVideoWatched(false); }
  // Once the active lesson's quiz is passed (verified flips true in `pathway`), jump the
  // player to the Complete step — this is what lets the Quiz step hand off to the app-level
  // aQuiz/QuizEngine fullscreen gate and have control cleanly return to LessonPlayer afterward
  // instead of duplicating quiz-scoring logic inside the player itself.
  useEffect(()=>{
    if(!activeLesson)return;
    if(pathway[activeLesson.lesson.id]?.verified&&lessonStep!=='complete')setLessonStep('complete');
  },[pathway,activeLesson,lessonStep]);
  function openVerifyQuiz(lesson,unit){
    const quiz=ALL_QUIZZES.find(q=>lesson.quizIds?.includes(q.id));
    if(!quiz){toast.error('No verification quiz found for this lesson yet.');return;}
    logEvent('quiz_attempt',lesson.id);
    setVerifyCtx({lesson,unit});
    setAQ(quiz);
    play('click');
  }

  // ── Quiz finish ───────────────────────────────────────────────────────────────
  async function finishQuiz(score,total){
    const pct=total>0?Math.round((score/total)*100):0;
    if(verifyCtx){
      const {lesson,unit}=verifyCtx;
      const passed=pct>=VERIFY_PASS_PCT;
      if(passed){
        await DB.verifyLesson(lesson.id,pct);
        logEvent('unit_lesson_verified',lesson.id);
        setPathway_(pw=>({...pw,[lesson.id]:{completedAt:Date.now(),verified:true,quizScore:pct,studying:false}}));
        const { finalXP, tier } = awardXP(15); // 10 XP already awarded on Study — verifying tops the lesson up to the usual 25 XP baseline
        const newUser={...user,xp:(user?.xp||0)+finalXP};
        saveUser(newUser);
        play('xp');
        if(tier==='jackpot'){celebrateJackpot();play('jackpot');}
        else if(tier==='big'||tier==='bonus'){celebrateBonusXP();}
        else celebrateXP();
        toast.success(pickNudge(pct>=90?'lesson_verified_high':'lesson_verified',{lesson:lesson.title,pct}),{icon:<ShieldCheck size={16}/>,duration:3000});
        const allVerified=unit.lessons.every(l=>l.id===lesson.id?true:pathway[l.id]?.verified);
        if(allVerified){
          await DB.verifyUnit(eSpec,unit.id,aQuiz.id,pct);
          logEvent('unit_verified',unit.id);
          setTimeout(()=>celebrateMastery(),400);
          toast.success(pickNudge('unit_verified',{unit:unit.title}),{duration:4000});
        }
        // Pathway-wide milestone nudge (25/50/75/100%) — computed off this
        // pathway's own lessons (not the global cross-pathway `mastery`), and
        // fired at most once per threshold per pathway via a localStorage flag.
        const pathLessons=(curPath?.units||[]).flatMap(u=>u.lessons);
        const pathDoneCount=pathLessons.filter(l=>l.id===lesson.id?true:isLessonComplete(l,pathway[l.id])).length;
        const pathPct=pathLessons.length?Math.round((pathDoneCount/pathLessons.length)*100):0;
        const milestone=[100,75,50,25].find(m=>pathPct>=m);
        if(milestone){
          const flagKey=`pathwayMilestone:${eSpec}:${milestone}`;
          if(!localStorage.getItem(flagKey)){
            localStorage.setItem(flagKey,'1');
            toast.success(pickNudge(`pathway_${milestone}`,{pathway:curPath?.label}),{duration:4500,icon:<Milestone size={16}/>});
          }
          // Pathway-completion badge — checkAndUnlockAchievements/DB.unlockAchievement are
          // both idempotent (already-unlocked keys are skipped), so it's safe to call this
          // every time 100% is reached rather than gating it behind the nudge's one-time flag.
          if(milestone===100){
            checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount,{pathwayCompletions:new Set([eSpec])});
          }
        }
      } else {
        toast(pickNudge(pct>=65?'quiz_close_miss':'quiz_fail',{lesson:lesson.title,pct}),{icon:<RefreshCw size={14}/>,duration:4000});
      }
      setVerifyCtx(null);
      setAQ(null);
      return;
    }
    if(qScores[aQuiz.id]!==undefined){setAQ(null);return;}
    await saveQuizScore(aQuiz.id,pct);
    saveCatPerf(aQuiz.cat,pct);
    const { finalXP:xpGain, tier:quizTier } = awardXP(Math.round(pct*0.5));
    const newUser={...user,xp:(user?.xp||0)+xpGain};
    saveUser(newUser);
    if(quizTier==='jackpot'){celebrateJackpot();play('jackpot');}
    else if(quizTier==='big'||quizTier==='bonus'){celebrateBonusXP();}
    toast.success(`${pct}% · ${BONUS_COPY[quizTier](xpGain)}`,{icon:pct>=80?<Star size={16}/>:pct>=60?<LineChart size={16}/>:<Dumbbell size={16}/>,duration:quizTier==='jackpot'?4000:3000});
    if(pct===100)setTimeout(()=>toast.success(pickNudge('perfect_quiz',{lesson:aQuiz.title}),{icon:<Star size={16}/>,duration:3500}),350);
    const newQCount=qTaken+1;
    checkAndUnlockAchievements(newUser,newQCount,qHistory.filter(q=>q.score===100).length+(pct===100?1:0),streak,totalReviews,mastery,aiChatCount);
    if(pct===100)setTimeout(()=>celebratePerfect(),300);
    setAQ(null);
  }

  // ── Diagnostic ────────────────────────────────────────────────────────────────
  function finalizeDiag(answers){
    const { top, ranked } = scorePathways(answers);
    setDR(top);
    setDCats(ranked.filter(k=>k!==top).slice(0,2)); // top 2 alternates, shown as "you might also fit"
    setDD(true);
    saveUser({...user,diagnosticResult:top});
  }

  // ── Search indexes (memoized) ─────────────────────────────────────────────────
  const quizFuse = useMemo(()=>buildQuizSearch(ALL_QUIZZES),[]);
  const libFuse  = useMemo(()=>buildLibrarySearch(ELIB),[]);

  // ── Filtered data ─────────────────────────────────────────────────────────────
  const DIFF_RANK = {Easy:0,Medium:1,Hard:2,Expert:3};
  const fQuiz   = useMemo(()=>{
    const s=fuseSearch(quizFuse,qSrch)||ALL_QUIZZES;
    const filtered=s.filter(q=>(qCat==='All'||q.cat===qCat)&&(qDiff==='All'||q.diff===qDiff));
    if(qSort==='default')return filtered;
    const arr=[...filtered];
    if(qSort==='difficulty')arr.sort((a,b)=>DIFF_RANK[a.diff]-DIFF_RANK[b.diff]);
    if(qSort==='unattempted')arr.sort((a,b)=>(qScores[a.id]!==undefined?1:0)-(qScores[b.id]!==undefined?1:0));
    if(qSort==='score')arr.sort((a,b)=>{const av=qScores[a.id],bv=qScores[b.id];if(av===undefined&&bv===undefined)return 0;if(av===undefined)return 1;if(bv===undefined)return -1;return av-bv;});
    return arr;
  },[qSrch,qCat,qDiff,qSort,qScores]);
  const fLib = useMemo(() => {
    let result = fuseSearch(libFuse, lSrch) || ELIB;
    if (lSrch && lSrch.trim()) {
      const q = lSrch.toLowerCase();
      // Collect any items that have matching personal notes but weren't returned by fuzzy search
      const noteMatches = ELIB.filter(r => {
        const note = user?.resourceNotes?.[r.title];
        return note && note.toLowerCase().includes(q);
      });
      // Merge and preserve order/uniqueness
      const seen = new Set(result.map(r => r.title));
      noteMatches.forEach(r => {
        if (!seen.has(r.title)) {
          result.push(r);
        }
      });
    }

    // Category filter
    if (lCat !== 'All') {
      result = result.filter(r => r.cat === lCat);
    }

    // Type filter
    if (lType !== 'All') {
      result = result.filter(r => r.type === lType);
    }

    // Difficulty filter
    if (lDiff !== 'All') {
      result = result.filter(r => r.difficulty === lDiff);
    }

    // Cost/Access filter
    if (lFreeOnly) {
      result = result.filter(r => r.free);
    }

    // Sub-tab filter (All, Saved, Completed, Notes)
    if (user) {
      if (lSubTab === 'saved') {
        const bms = user.bookmarks || [];
        result = result.filter(r => bms.includes(r.title));
      } else if (lSubTab === 'completed') {
        const studied = user.studied || [];
        result = result.filter(r => studied.includes(r.title));
      } else if (lSubTab === 'notes') {
        const notesObj = user.resourceNotes || {};
        result = result.filter(r => notesObj[r.title] && notesObj[r.title].trim());
      }
    }

    // Sorting logic
    if (lSort === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (lSort === 'alpha-desc') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [libFuse, lSrch, lCat, lType, lDiff, lFreeOnly, lSubTab, lSort, user]);
  const fComp   = useMemo(()=>cF==='All'?COMPETITIONS:COMPETITIONS.filter(c=>c.type===cF||c.level===cF),[cF]);
  const hasCalc = cGPA&&cSAT;
  const calcR   = useMemo(()=>{
    if (!hasCalc) return [];

    // 1. Get raw schools and map scoreSchool with all personalized parameters
    let processed = [...SCHOOL_DATA, ...customSchools]
      .map(s => scoreSchool(s, cGPA, cSAT, cLead, cEC, cVol, cSt, eSpec, cRigor, clinicalHoursTotal));

    // 2. Filter
    processed = processed.filter(s => {
      const matchType = sType === 'All' || s.type === sType;
      const matchRegion = selRegion === 'All' || s.region === selRegion;
      const matchBsmd = selBsmd === 'All' || (selBsmd === 'Yes' && s.bsmd) || (selBsmd === 'No' && !s.bsmd);
      const matchCommittee = selCommittee === 'All' || (selCommittee === 'Yes' && s.hasPreMedCommittee) || (selCommittee === 'No' && !s.hasPreMedCommittee);
      const matchClinicalProx = selClinicalProx === 'All' || s.clinicalProximity === selClinicalProx;
      const matchState = selStateFilter === 'All' || s.state === selStateFilter;
      return matchType && matchRegion && matchBsmd && matchCommittee && matchClinicalProx && matchState;
    });

    // 3. Sort
    if (calcSort === 'score') {
      processed.sort((a, b) => b.score - a.score);
    } else if (calcSort === 'accept') {
      processed.sort((a, b) => (a.accept || 100) - (b.accept || 100));
    } else if (calcSort === 'name') {
      processed.sort((a, b) => a.name.localeCompare(b.name));
    }

    return processed;
  }, [cGPA, cSAT, cLead, cEC, cVol, cSt, sType, hasCalc, customSchools, eSpec, cRigor, clinicalHoursTotal, selRegion, selBsmd, selCommittee, selClinicalProx, selStateFilter, calcSort]);

  // Compute overall summary stats for matches
  const calculatedStats = useMemo(() => {
    if (calcR.length === 0) return null;
    let sumAcademic = 0, sumExperience = 0;
    calcR.forEach(s => {
      sumAcademic += s.academicIndex || 0;
      sumExperience += s.experienceIndex || 0;
    });
    const avgAcademic = Math.round(sumAcademic / calcR.length);
    const avgExperience = Math.round(sumExperience / calcR.length);

    let pathwayAdvice = '';
    if (curPath?.label) {
      pathwayAdvice = `Focused on your ${curPath.label} track. `;
    }
    if (parseInt(cVol) || 0 < 60) {
      pathwayAdvice += "Consider taking on more volunteer hours to strengthen your experience index. ";
    }
    if (clinicalHoursTotal < 40) {
      pathwayAdvice += "Adding hospital/clinical shadowing hours will heavily boost your chancing at selective health programs. ";
    }
    if (parseFloat(cGPA) < 3.7) {
      pathwayAdvice += "Aim to take more advanced math & science classes (AP/IB) to show curriculum rigor and offset a lower GPA. ";
    } else {
      pathwayAdvice += "Your outstanding academic parameters align excellently with premium target schools! ";
    }

    return { avgAcademic, avgExperience, pathwayAdvice };
  }, [calcR, cVol, clinicalHoursTotal, cGPA, curPath]);

  // Unique states found in SCHOOL_DATA for filtering
  const distinctStates = useMemo(() => {
    const states = new Set(SCHOOL_DATA.map(s => s.state).filter(Boolean));
    return Array.from(states).sort();
  }, []);

  function addCustomSchool(){
    if(!csName.trim())return;
    setCustomSchools(prev=>[...prev,{name:csName.trim(),gpa:parseFloat(csGPA)||0,sat:parseInt(csSAT)||0,accept:parseFloat(csAccept)||0,state:csState,type:csType,custom:true}]);
    setCsName('');setCsGPA('');setCsSAT('');setCsAccept('');setCsState('');setCsType('Public');setShowAddSchool(false);
    toast.success('School added to your list');
  }

  // All decks: custom decks first (newest created on top), then built-in decks —
  // so a deck you just generated or created is always the first thing you see.
  const allDecksList = useMemo(()=>{
    const customSorted = Object.entries(cDecks)
      .map(([n,c])=>({name:n,cards:c,builtin:false}))
      .sort((a,b)=>(deckCreatedAt[b.name]||0)-(deckCreatedAt[a.name]||0));
    return [
      ...customSorted,
      ...Object.entries(FLASH_DECKS).map(([n,c])=>({name:n,cards:c,builtin:true})),
    ];
  },[cDecks,deckCreatedAt]);
  const deckFuse = useMemo(()=>buildDeckSearch(allDecksList),[allDecksList]);
  const newestDeckName = useMemo(()=>{
    const entries = Object.entries(deckCreatedAt);
    if(!entries.length) return null;
    return entries.reduce((a,b)=>b[1]>a[1]?b:a)[0];
  },[deckCreatedAt]);
  const [dSrchLive,setDSrchLive] = useState('');
  useEffect(()=>{ const t=setTimeout(()=>setDS2(dSrchLive),120); return()=>clearTimeout(t); },[dSrchLive]);

  // Active deck cards (sorted for study)
  const deckCards = useMemo(()=>{
    if(!activeDeck)return[];
    const cards=activeDeck.builtin?FLASH_DECKS[activeDeck.name]||(cDecks[activeDeck.name]||[]):cDecks[activeDeck.name]||[];
    return studyMode==='due'?sortForStudy(getDueCards(cards)):cards;
  },[activeDeck,cDecks,studyMode]);

  const currentCard = deckCards[cIdx];

  // Resume a flashcard session that was mid-review when the page reloaded. Deferred until the
  // DB (and its custom decks) has finished loading, since telling a builtin deck apart from a
  // custom one needs both FLASH_DECKS and cDecks. Only restores if the persisted tab/sub-view
  // was actually the flashcards screen — otherwise the tab/prepView restore above already put
  // the student back on whatever screen they were really on, and jumping into a card view here
  // would fight that.
  useEffect(()=>{
    if(!dbReady)return;
    const persisted=loadViewState();
    const fc=persisted.flashcards;
    if(!fc?.deckName||persisted.prepView!=='flashcards')return;
    const isBuiltin=!!FLASH_DECKS[fc.deckName];
    const isCustom=!isBuiltin&&Array.isArray(cDecks[fc.deckName]);
    if(!isBuiltin&&!isCustom)return; // deck was deleted/renamed since the last session
    setAD({name:fc.deckName,builtin:isBuiltin});
    setStudyMode(fc.studyMode==='due'?'due':'all');
    setCIdx(fc.cIdx||0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[dbReady]);

  // ...and keep that session's position saved as it progresses, so the very next reload picks
  // up from wherever the student actually is, not just where the deck was opened.
  useEffect(()=>{
    if(activeDeck)saveViewState({flashcards:{deckName:activeDeck.name,cIdx,studyMode}});
    else saveViewState({flashcards:null});
  },[activeDeck,cIdx,studyMode]);

  // ── Perfect-session celebration (fires once when a completed session was 100% remembered) ──
  const celebratedSessionRef=useRef(null);
  useEffect(()=>{
    if(!activeDeck||currentCard)return;
    const total=sessionStats.reviewed;
    if(total<3||sessionStats.again>0)return;
    const key=`${activeDeck.name}:${sessionStats.startedAt}`;
    if(celebratedSessionRef.current===key)return;
    celebratedSessionRef.current=key;
    celebratePerfect();
  },[activeDeck,currentCard,sessionStats]);
  // ═══ TAB RENDERS ══════════════════════════════════════════════════════════════

  const SL = ({children,extra={}}) => <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:16,...extra}}>{children}</div>;

  // ── HOME ─────────────────────────────────────────────────────────────────────
  function tHome(){
    const units=curPath?.units||[];
    const recentQuiz=qHistory.slice(-1)[0];
    const HomeIcon=PATH_ICONS[eSpec]||Compass;
    return(
      <div style={CC({gap:22})}>
        {/* Hero — tinted with the active pathway's own gradient/glow so identity shifts per pathway */}
        <div style={{...glass({padding:28}),background:curPath?.gradient?`linear-gradient(135deg,${curPath.accent}14,${(curPath.accent2||curPath.accent)}08)`:'linear-gradient(135deg,rgba(45,127,255,0.08),rgba(6,182,212,0.04))',border:`1px solid ${accent}26`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-60,top:-60,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${curPath?.glow||`${accent}18`},transparent 70%)`,pointerEvents:'none'}}/>
          <div style={{position:'relative',...R({gap:18,alignItems:'flex-start'})}}>
            <div style={{width:52,height:52,borderRadius:15,background:`${accent}1c`,border:`1.5px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 0 24px ${curPath?.glow||`${accent}25`}`}}><HomeIcon size={24} color={accent}/></div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:10}}>{justOnboarded?'Welcome':'Welcome back'}</div>
              <h1 style={{fontSize:30,fontWeight:800,color:C.t1,margin:'0 0 12px',letterSpacing:'-.03em',fontFamily:C.FD,lineHeight:1.15}}>{user.name}</h1>
              <div style={R({gap:8,flexWrap:'wrap'})}>
                <span style={pill(`${accent}22`,accent)}>{curPath?.label}</span>
                <span style={pill(C.s3,C.t2,{fontFamily:C.FM})}>Level {lvl}</span>
                {streak>0&&<span style={{...pill(C.amberDim,C.amberL),display:'inline-flex',alignItems:'center',gap:5}}><Flame size={11}/>{streak} day streak</span>}
                {streakFreezes>0&&<span style={{...pill(C.blueDim,C.blueL),display:'inline-flex',alignItems:'center',gap:5}}><Snowflake size={11}/>{streakFreezes} freeze{streakFreezes>1?'s':''}</span>}
                {dueCards>0&&<span style={{...pill(C.violetDim,C.violetL),display:'inline-flex',alignItems:'center',gap:5}}><Layers3 size={11}/>{dueCardsBadge(dueCards)}</span>}
                {daysToExam!==null&&<span style={{...pill(daysToExam<=30?C.roseDim:C.s3,daysToExam<=30?C.roseL:C.t2,{fontFamily:C.FM}),display:'inline-flex',alignItems:'center',gap:5}}><CalendarDays size={11}/>{daysToExam>0?`${daysToExam}d to test day`:'Test day is here'}</span>}
                {predSAT&&<span style={pill(C.greenDim,C.greenL,{fontFamily:C.FM})}>~{predSAT} predicted</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Continue where you left off */}
        {(nextLesson||topPick)&&<div style={{...glass({padding:20}),display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Continue</div>
            {nextLesson?(
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${accent}15`,border:`1px solid ${accent}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Route size={16} color={accent}/></div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{nextLesson.title}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:1}}>{nextLesson.unitTitle}</div>
                </div>
              </div>
            ):<div style={{fontSize:13,color:C.t2}}>Your pathway is fully complete — nice work.</div>}
            {nextLesson&&<button onClick={()=>goPrep('pathway')} style={btn(C.blueGrad,{marginTop:14,fontSize:12,padding:'8px 18px'})}>Resume Lesson</button>}
          </div>
          {topPick&&<div style={{flex:1,minWidth:220,borderLeft:`1px solid ${C.b1}`,paddingLeft:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8,display:'flex',alignItems:'center',gap:6}}><Brain size={11} color={C.violetL}/>Iatra's #1 Pick</div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.amber}15`,border:`1px solid ${C.amber}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Layers size={16} color={C.amberL}/></div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{topPick.quiz.title}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:1}}>{topPick.reason}</div>
              </div>
            </div>
            <button onClick={()=>goPrep('quizzes')} style={btnG({marginTop:14,fontSize:12,padding:'8px 18px'})}>See All Recommendations</button>
          </div>}
        </div>}

        {/* Iatra ranked quiz recommendations — top 3 on the dashboard */}
        {rankedQuizzes.length>0&&<QuizRecommendationsPanel ranked={rankedQuizzes.slice(0,3)} onStart={(quiz)=>{setAQ(quiz);play('click');}} onAskIatra={askIatraAboutPick} compact/>}

        {/* Deadline countdown */}
        {upcomingDeadlines&&upcomingDeadlines.length>0&&<NextDeadlineCard deadlines={upcomingDeadlines} accent={accent}/>}
        {upcomingDeadlines&&upcomingDeadlines.length===0&&(
          <div style={{...glass({padding:16}),display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div style={{fontSize:13,color:C.t2}}>You haven't added any application deadlines yet.</div>
            <button style={btnG({fontSize:12,padding:'8px 16px'})} onClick={()=>goPortfolio('deadlines')}>Add Deadlines</button>
          </div>
        )}

        {/* Stats */}
        <div style={G(4,14,{},isMobile)}>
          <Stat label="Total XP" value={(user.xp||0).toLocaleString()} icon={<Zap size={16}/>} color={C.amber} sub={`${xpForNext-xpIn} to Level ${lvl+1}`} m={isMobile}/>
          <Stat label="Level" value={`${lvl} · ${levelInfo.tier}`} icon={<Trophy size={16}/>} color={C.violet} sub={`${levelInfo.pct}% to next`} m={isMobile}/>
          <Stat label="Quizzes Done" value={qTaken} icon={<CheckCircle2 size={16}/>} color={C.green} sub={`${ALL_QUIZZES.length-qTaken} remaining`} m={isMobile}/>
          <Stat label="Mastery" value={`${mastery}%`} icon={<TrendingUp size={16}/>} color={accent} sub={`${doneL}/${allL.length} lessons`} m={isMobile}/>
        </div>

        {/* XP Progress */}
        <motion.div
          animate={nearLevelUp?{boxShadow:[`0 0 0px ${accent}00`,`0 0 26px ${accent}55`,`0 0 0px ${accent}00`]}:{boxShadow:'0 0 0px transparent'}}
          transition={nearLevelUp?{duration:1.6,repeat:Infinity,ease:'easeInOut'}:{}}
          style={glass({padding:18})}
        >
          <div style={R({justifyContent:'space-between',marginBottom:10})}>
            <div><span style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>Level {lvl} · {levelInfo.tier}</span><span style={{fontSize:12,color:C.t3,marginLeft:8,display:'inline-flex',alignItems:'center',gap:4}}><ArrowRight size={11}/>Level {lvl+1}</span></div>
            <span style={{fontSize:12,fontFamily:C.FM,color:nearLevelUp?C.amberL:C.blueL,fontWeight:700}}>{nearLevelUp?`Only ${xpForNext-xpIn} XP to go!`:`${xpIn} / ${xpForNext} XP`}</span>
          </div>
          <Bar pct={levelInfo.pct} color={nearLevelUp?C.amber:accent} h={8} glow/>
        </motion.div>

        {/* Quick Actions */}
        <div>
          <SL>Quick Actions</SL>
          <div style={G(3,14,{},isMobile)}>
            {[
              {Ic:Compass,lbl:'Diagnostic',sub:'Find your track',pillar:'prep',view:'diagnostic',col:C.violet},
              {Ic:Route,lbl:'Pathway',sub:`${doneL}/${allL.length} lessons`,pillar:'prep',view:'pathway',col:accent},
              {Ic:Layers,lbl:'Quiz Library',sub:`${qTaken}/${ALL_QUIZZES.length} taken`,pillar:'prep',view:'quizzes',col:C.green},
              {Ic:MessageCircle,lbl:'AI Coach',sub:'Iatra tutor',pillar:'prep',view:'coach',col:C.cyan},
              {Ic:Layers3,lbl:'Flashcards',sub:`${dueCards>0?dueCardsSub(dueCards):`${Object.keys(FLASH_DECKS).length+Object.keys(cDecks).length} decks`}`,pillar:'prep',view:'flashcards',col:dueCards>0?C.violet:C.orange},
              {Ic:Building2,lbl:'Admissions',sub:'School list builder',pillar:'portfolio',view:'calc',col:C.rose},
            ].map((a,i)=>(
              <motion.div key={i} whileHover={{y:-3,boxShadow:`0 12px 40px rgba(0,0,0,0.5),0 0 0 1px ${a.col}30`}} whileTap={{scale:.98}}
                onClick={()=>{if(a.pillar==='prep')goPrep(a.view);else if(a.pillar==='portfolio')goPortfolio(a.view);play('click');}}
                style={{...glass({padding:20}),cursor:'pointer',transition:'border-color .2s',position:'relative',overflow:'hidden'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=`${a.col}35`}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.b1}>
                <div style={{position:'absolute',top:-20,right:-20,width:60,height:60,borderRadius:'50%',background:`${a.col}08`,pointerEvents:'none'}}/>
                <div style={{width:40,height:40,borderRadius:10,background:`${a.col}15`,border:`1px solid ${a.col}20`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,boxShadow:`0 4px 12px ${a.col}20`}}><a.Ic size={19} color={a.col}/></div>
                <div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:3}}>{a.lbl}</div>
                <div style={{fontSize:11,color:C.t3}}>{a.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Achievements strip */}
        {achiev.size>0&&<div style={glass({padding:18})}>
          <SL extra={{marginBottom:12}}>Achievements Unlocked ({achiev.size}/{Object.keys(ACHIEVEMENTS).length})</SL>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {Object.values(ACHIEVEMENTS).map(a=>{
              const has=achiev.has(a.key);
              const AIc=ACH_ICONS[a.icon]||Award;
              return<div key={a.key} title={`${a.name}: ${a.desc}`} style={{width:40,height:40,borderRadius:10,background:has?`${C.amber}18`:'rgba(255,255,255,0.04)',border:`1px solid ${has?`${C.amber}30`:C.b1}`,display:'flex',alignItems:'center',justifyContent:'center',opacity:has?1:.3,cursor:'default',transition:'all .2s'}}>
                <AIc size={18} color={has?C.amberL:C.t3}/>
              </div>;
            })}
          </div>
        </div>}

        {/* Predicted score */}
        {predSAT&&<div style={{...glass({padding:20}),background:`linear-gradient(135deg,${C.greenDim},${C.blueDim})`,border:`1px solid ${C.green}20`}}>
          <div style={R({gap:14})}>
            <div style={{width:52,height:52,borderRadius:12,background:`${C.green}15`,border:`1px solid ${C.green}25`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.green,lineHeight:1}}>{predSAT}</div>
              <div style={{fontSize:9,color:C.greenL,letterSpacing:'.05em'}}>SAT</div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:3}}>Predicted SAT Score</div>
              <div style={{fontSize:12,color:C.t2,lineHeight:1.5}}>Based on your quiz performance across all 3 subject areas. Keep practicing to improve this estimate.</div>
              <div style={{...R({gap:8,marginTop:8})}}>
                {cats3.map((cat,i)=>secAvgs[i]!==null&&<span key={cat} style={pill(`${scCol(secAvgs[i])}18`,scCol(secAvgs[i]),{fontSize:10})}>{cat.split('/')[0]}: {scoreToSection(secAvgs[i])}</span>)}
              </div>
            </div>
          </div>
        </div>}

        {/* Pathway preview */}
        <div style={glass()}>
          <div style={R({justifyContent:'space-between',marginBottom:18})}>
            <div><SL extra={{marginBottom:4}}>Current Pathway</SL><div style={{fontSize:17,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{curPath?.label}</div></div>
            <Arc pct={mastery} size={60} stroke={5} color={accent} label={`${mastery}%`}/>
          </div>
          <div style={CC({gap:10})}>
            {units.map((u)=>{const p=unitM(u);return(
              <div key={u.id} style={R({gap:12})}>
                <div style={{width:8,height:8,borderRadius:'50%',background:p===100?C.green:p>0?accent:C.s4,flexShrink:0,boxShadow:p>0?`0 0 6px ${p===100?C.green:accent}`:undefined}}/>
                <div style={{flex:1}}>
                  <div style={R({justifyContent:'space-between',marginBottom:5})}>
                    <span style={{fontSize:12,color:p===100?C.green:C.t2,fontWeight:p===100?700:400}}>{u.title}</span>
                    <span style={{fontSize:11,fontFamily:C.FM,color:C.t3}}>{p}%</span>
                  </div>
                  <Bar pct={p} color={p===100?C.green:accent} h={3} glow={p>40}/>
                </div>
              </div>
            );})}
          </div>
          <button onClick={()=>goPrep('pathway')} style={{...btnG({marginTop:18,width:'100%',justifyContent:'center'}),display:'inline-flex',alignItems:'center',gap:8}}>View Full Pathway<ArrowRight size={14}/></button>
        </div>
      </div>
    );
  }

  // ── DIAGNOSTIC ────────────────────────────────────────────────────────────────
  function tDiag(){
    if(dDone&&dRes){const path=PATHS[dRes];
      const ResIcon=PATH_ICONS[dRes]||Compass;
      const alternates=(dCats||[]).map(k=>PATHS[k]).filter(Boolean);
      const totalLessons=(path?.units||[]).reduce((s,u)=>s+u.lessons.length,0);
      return(
      <div style={CC({gap:22})}>
        <div><div style={lbl()}>Pathway Diagnostic</div><h2 style={{fontSize:26,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Your Match</h2></div>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} style={{...glass({padding:40,textAlign:'center',background:path?.gradient?`linear-gradient(135deg,${path.accent}14,${path.accent2||path.accent}08)`:`linear-gradient(135deg,${C.blueDim},rgba(6,182,212,0.05))`,border:`1px solid ${path?.accent||C.blue}30`})}}>
          <div style={{width:80,height:80,borderRadius:'50%',background:`${path?.accent||accent}18`,border:`2px solid ${path?.accent||accent}40`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:`0 0 30px ${path?.glow||`${accent}30`}`}}><ResIcon size={34} color={path?.accent||accent}/></div>
          <h2 style={{fontSize:30,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:'0 0 14px'}}>{path?.label}</h2>
          <p style={{color:C.t2,maxWidth:480,margin:'0 auto 12px',lineHeight:1.75,fontSize:14}}>Based on your answers — how you think, what pulls you in, and what you already know about these careers — <strong style={{color:C.t1}}>{path?.label}</strong> is your closest match.</p>
          <p style={{color:C.t3,maxWidth:480,margin:'0 auto 28px',lineHeight:1.6,fontSize:12}}>Starting this pathway loads {totalLessons} lessons across {(path?.units||[]).length} units, sequenced around the content most relevant to {path?.label}.</p>
          <div style={R({justifyContent:'center',gap:12})}>
            <button style={{...btn(path?.gradient||C.blueGrad,{padding:'12px 32px',fontSize:14}),display:'inline-flex',alignItems:'center',gap:8}} onClick={()=>{saveUser({...user,specialty:dRes});setDD(false);setDS(0);setDA([]);setTab('prep');setPrepView('pathway');toast.success(`${path?.label} pathway activated`);}}>Accept & Start Pathway<ChevronRight size={16}/></button>
            <button style={{...btnG({padding:'12px 24px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDD(false);setDS(0);setDA([]);}}><RefreshCw size={13}/>Retake</button>
          </div>
        </motion.div>
        <div style={{...glass({padding:14}),display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.02)'}}>
          <Milestone size={14} color={C.t3}/>
          <span style={{fontSize:12,color:C.t3}}>Interests shift as you learn more — it's worth retaking this diagnostic every few months to confirm your pathway still fits.</span>
        </div>
        {alternates.length>0&&<div style={glass({padding:18})}>
          <SL>You Might Also Fit</SL>
          <div style={G(2,10,{},isMobile)}>
            {alternates.map(p=>{const key=Object.entries(PATHS).find(([,v])=>v===p)?.[0];const AltIcon=PATH_ICONS[key]||Compass;return(
              <motion.div key={key} whileHover={{borderColor:`${p.accent}40`,background:`${p.accent}08`}} onClick={()=>{saveUser({...user,specialty:key});setDD(false);setDS(0);setDA([]);setTab('prep');setPrepView('pathway');}} style={{...glass2({cursor:'pointer',padding:14,transition:'background .15s'}),display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${p.accent}18`,border:`1px solid ${p.accent}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AltIcon size={16} color={p.accent}/></div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:p.accent,fontFamily:C.FD}}>{p.label}</div>
                  {p.tagline&&<div style={{fontSize:11,color:C.t3,marginTop:2,lineHeight:1.4}}>{p.tagline}</div>}
                </div>
              </motion.div>
            );})}
          </div>
        </div>}
        <div style={glass({padding:18})}>
          <SL>All Pathways</SL>
          <div style={G(3,10,{},isMobile)}>
            {Object.entries(PATHS).filter(([k])=>k!==dRes).map(([key,p])=>(
              <motion.div key={key} whileHover={{borderColor:`${p.accent}40`,background:`${p.accent}08`}} onClick={()=>{saveUser({...user,specialty:key});setDD(false);setDS(0);setDA([]);setTab('prep');setPrepView('pathway');}} style={{...glass2({cursor:'pointer',padding:14,transition:'background .15s'})}}>
                <div style={{fontSize:13,fontWeight:700,color:p.accent,fontFamily:C.FD}}>{p.label}</div>
                {p.tagline&&<div style={{fontSize:11,color:C.t3,marginTop:4,lineHeight:1.5}}>{p.tagline}</div>}
                <div style={{fontSize:10,color:C.t4,marginTop:6,fontFamily:C.FM}}>{p.units.length} units</div>
              </motion.div>
            ))}
          </div>
        </div>
        <button style={{...btnG({alignSelf:'flex-start'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDD(false);setDS(0);setDA([]);setDIntro(true);}}><Compass size={13}/>Back to Pathway Overview</button>
      </div>
    );}

    // ── Intro / manual-selection landing ────────────────────────────────────
    if(dIntro){
      return(
        <div style={CC({gap:22})}>
          <div><div style={lbl()}>Pathway Diagnostic</div><h2 style={{fontSize:26,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Find Your Pathway</h2>
            <p style={{fontSize:13,color:C.t2,marginTop:8,maxWidth:640,lineHeight:1.7}}>Every pathway below sequences the same core SAT/ACT prep — math, reading/writing, and science — around the units and quizzes most relevant to a specific health career, so studying also builds toward the path you're most likely to pursue. Take the diagnostic — real questions about how you think and what pulls you in, not just "pick your favorite subject" — for a recommendation, or read through the pathways yourself and pick one directly. You can always switch later.</p>
          </div>
          <motion.div data-tour="prep-deep-diagnostic" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{...glass({padding:28,background:`linear-gradient(135deg,${C.blueDim},rgba(6,182,212,0.05))`,border:`1px solid rgba(45,127,255,0.2)`}),display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
            <div style={{width:56,height:56,borderRadius:14,background:`${accent}18`,border:`2px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Compass size={26} color={accent}/></div>
            <div style={{flex:1,minWidth:220}}>
              <div style={{fontSize:15,fontWeight:800,color:C.t1,fontFamily:C.FD}}>Not sure which fits? Take the diagnostic.</div>
              <div style={{fontSize:12,color:C.t2,marginTop:3}}>{DIAG_QS.length} questions about how you think, what actually interests you, and what these careers look like day to day — takes about 6 minutes.</div>
            </div>
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} style={{...btn(C.blueGrad,{fontSize:13,padding:'12px 24px'}),display:'inline-flex',alignItems:'center',gap:8,flexShrink:0}} onClick={()=>setDIntro(false)}>Start Diagnostic<ChevronRight size={15}/></motion.button>
          </motion.div>
          <div>
            <SL>All Pathways — Choose Manually</SL>
            <div style={G(isMobile?1:2,16,{},false)}>
              {Object.entries(PATHS).map(([key,p])=>(
                <PathwayCard key={key} pathKey={key} p={p} current={eSpec===key} m={isMobile}
                  onSelect={(k)=>{saveUser({...user,specialty:k});goPrep('pathway');toast.success(`${p.label} pathway activated`);}}/>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const q=DIAG_QS[dStep];if(!q)return null;
    return(
      <div style={CC({gap:22})}>
        <div style={R()}>
          <div><div style={lbl()}>Pathway Diagnostic</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Q{dStep+1} <span style={{color:C.t3,fontWeight:400}}>/ {DIAG_QS.length}</span></h2></div>
          <div style={{marginLeft:'auto'}}><Arc pct={(dStep/DIAG_QS.length)*100} size={52} stroke={4} color={accent} label={`${dStep+1}/${DIAG_QS.length}`}/></div>
        </div>
        <Bar pct={(dStep/DIAG_QS.length)*100} color={accent} h={3}/>
        <motion.div key={dStep} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} style={glass({padding:28})}>
          <p style={{fontSize:16,fontWeight:600,lineHeight:1.75,marginBottom:22,color:C.t1,fontFamily:C.FB}}>{q.q}</p>
          <div style={CC({gap:10})}>
            {q.ch.map((ch,ci)=>(
              <motion.div key={ci} whileHover={{background:C.blueDim,borderColor:`${C.blue}40`}} whileTap={{scale:.98}}
                onClick={()=>{const next=[...dAns,ci];setDA(next);play('select');if(dStep<DIAG_QS.length-1)setDS(s=>s+1);else finalizeDiag(next);}}
                style={{...glass2({padding:'15px 18px',cursor:'pointer',transition:'all .15s'}),display:'flex',alignItems:'center',gap:14}}>
                <span style={{width:28,height:28,borderRadius:8,background:C.s4,border:`1px solid ${C.b2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.t3,flexShrink:0,fontFamily:C.FM}}>{String.fromCharCode(65+ci)}</span>
                <span style={{fontSize:14,color:C.t1,fontFamily:C.FB}}>{ch.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <div style={R({gap:10})}>
          {dStep>0&&<button style={{...btnG(),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDS(s=>s-1);setDA(a=>a.slice(0,-1));}}><ChevronLeft size={14}/>Back</button>}
          <button style={{...btnG(),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDIntro(true);setDS(0);setDA([]);}}><Compass size={13}/>Back to Pathway Overview</button>
        </div>
      </div>
    );
  }
  // ── PATHWAY ───────────────────────────────────────────────────────────────────
  function tPath(){
    const units=curPath?.units||[];
    return(
      <div style={CC({gap:22})}>
        <div data-tour="prep-deep-pathway" style={R()}>
          <div><div style={lbl()}>Learning Pathway</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>{curPath?.label}</h2>
            {curPath?.tagline&&<div style={{fontSize:12,color:accent,fontWeight:600,marginTop:4}}>{curPath.tagline}</div>}
          </div>
          <div style={{marginLeft:'auto',...R({gap:12})}}>
            <div style={{textAlign:'right'}}><div style={{fontSize:12,color:C.t2,fontFamily:C.FM}}>{doneL}/{allL.length}</div><div style={{fontSize:10,color:C.t3}}>lessons</div></div>
            <Arc pct={mastery} size={60} stroke={5} color={accent} label={`${mastery}%`}/>
          </div>
        </div>
        {curPath?.overview&&<div style={{...glass2({padding:'14px 18px',background:`${accent}08`,border:`1px solid ${accent}20`})}}>
          <p style={{fontSize:12.5,color:C.t2,lineHeight:1.75,margin:0}}>{curPath.overview}</p>
        </div>}
        <Bar pct={mastery} color={accent} h={5} glow/>
        {(()=>{
          const totalLessons=curPathAllL.length;
          const pathComplete=totalLessons>0&&curPathDoneL>=totalLessons;
          if(pathComplete){
            const scores=curPathAllL.map(l=>pathway[l.id]?.quizScore).filter(s=>s!=null);
            const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
            const completedTimes=curPathAllL.map(l=>pathway[l.id]?.completedAt).filter(Boolean);
            const lastCompletedAt=completedTimes.length?Math.max(...completedTimes):Date.now();
            return(
              <div style={{...glass2({padding:'14px 18px',background:C.greenDim,border:`1px solid ${C.green}40`})}}>
                <div style={R({gap:10})}>
                  <ShieldCheck size={16} color={C.green}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:C.t1}}>Pathway complete!</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2}}>Every lesson in {curPath?.label} is verified.</div>
                  </div>
                  <button style={{...btnSm(`${C.green}22`,{color:C.greenL,border:`1px solid ${C.green}40`}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>exportPathwayCertificate(curPath?.label||'Pathway',{studentName:user?.name||'Student',totalLessons,completedLessons:curPathDoneL,avgScore,completedAt:lastCompletedAt})}><FileDown size={13}/>Download Certificate</button>
                </div>
              </div>
            );
          }
          const hasRealGoal=!!(pathwayGoal&&pathwayGoal.targetWeeks);
          if(!hasRealGoal){
            if(goalPromptDismissed)return null;
            return(
              <div style={{...glass2({padding:'14px 18px',background:'rgba(255,255,255,0.03)'})}}>
                <div style={R({gap:10,marginBottom:10})}>
                  <Target size={15} color={accent}/>
                  <div style={{fontSize:12.5,fontWeight:700,color:C.t1}}>Set a pace goal for {curPath?.label}?</div>
                </div>
                <p style={{fontSize:11.5,color:C.t3,lineHeight:1.6,margin:'0 0 12px'}}>Pick a target so you can see whether you're on track to finish — {totalLessons} lessons total.</p>
                <div style={R({gap:8,flexWrap:'wrap'})}>
                  <button style={btnSm(`${accent}22`,{color:accent,border:`1px solid ${accent}40`})} onClick={()=>setPathwayPaceGoal(2)}>2 weeks</button>
                  <button style={btnSm(`${accent}22`,{color:accent,border:`1px solid ${accent}40`})} onClick={()=>setPathwayPaceGoal(4)}>4 weeks</button>
                  <button style={btnSm(`${accent}22`,{color:accent,border:`1px solid ${accent}40`})} onClick={()=>setPathwayPaceGoal(8)}>8 weeks</button>
                  <button style={btnSm('transparent',{color:C.t3})} onClick={dismissPathwayPaceGoal}>No goal</button>
                </div>
              </div>
            );
          }
          const elapsedWeeks=Math.max(0,(Date.now()-pathwayGoal.startedAt)/(7*24*60*60*1000));
          const expectedByNow=Math.min(totalLessons,Math.round((elapsedWeeks/pathwayGoal.targetWeeks)*totalLessons));
          const diff=curPathDoneL-expectedByNow;
          const status=diff>0?{label:'Ahead of pace',color:C.green,colorL:C.greenL,dim:C.greenDim}
                      :diff===0?{label:'On pace',color:C.green,colorL:C.greenL,dim:C.greenDim}
                      :{label:`${Math.abs(diff)} lesson${Math.abs(diff)===1?'':'s'} behind — catch up this week`,color:C.amber,colorL:C.amberL,dim:C.amberDim};
          return(
            <div style={{...glass2({padding:'14px 18px',background:'rgba(255,255,255,0.03)'})}}>
              <div style={R({gap:10})}>
                <CalendarDays size={15} color={status.color}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:C.t1}}>{pathwayGoal.targetWeeks}-week pace goal</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>{curPathDoneL}/{totalLessons} lessons verified · week {Math.min(pathwayGoal.targetWeeks,Math.ceil(elapsedWeeks)||1)} of {pathwayGoal.targetWeeks}</div>
                </div>
                <span style={pill(status.dim,status.colorL,{fontSize:10.5,fontWeight:700})}>{status.label}</span>
              </div>
            </div>
          );
        })()}
        {units.map((unit,ui)=>{
          const p=unitM(unit);const done=p===100;
          return(
            <motion.div key={unit.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:ui*.05}} style={glass()}>
              <div style={R({marginBottom:20})}>
                <Arc pct={p} size={50} stroke={4} color={done?C.green:accent} label={`${p}%`}/>
                <div style={{flex:1}}>
                  <div style={R({gap:8,marginBottom:3})}>
                    <span style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:C.FM,letterSpacing:'.08em'}}>UNIT {ui+1}</span>
                    {done&&<span style={{...pill(C.greenDim,C.greenL,{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}><Check size={10}/>Mastered</span>}
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{unit.title}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>{unit.lessons.length} lessons · {unit.quizCat}</div>
                </div>
              </div>
              <div style={CC({gap:8})}>
                {unit.lessons.map((lesson)=>{
                  const state=lessonState(lesson,ui,units);
                  const isDone=state==='done';const isVerified=state==='verified';const isStudying=state==='studying';
                  const avail=state==='available';
                  return(
                    <div key={lesson.id} style={{...glass2({padding:'12px 16px',opacity:state==='locked'?.4:1}),display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <Dot state={state}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:(isDone||isVerified)?700:400,color:isVerified?C.green:isDone?C.green:C.t1,fontFamily:C.FB}}>{lesson.title}</div>
                          <div style={R({gap:6,marginTop:1})}>
                            <span style={{fontSize:11,color:C.t3}}>{lesson.src}</span>
                            {isVerified&&<span style={pill(C.greenDim,C.greenL,{fontSize:9})}><ShieldCheck size={9} style={{marginRight:3}}/>Verified{pathway[lesson.id]?.quizScore!=null?` (${pathway[lesson.id].quizScore}%)`:''}</span>}
                            {isStudying&&<span style={pill(C.amberDim,C.amberL,{fontSize:9})}>In progress — continue when ready</span>}
                          </div>
                        </div>
                        {(avail||isStudying)&&<motion.button whileHover={{scale:1.04}} whileTap={{scale:.96}} style={{...btnSm(`linear-gradient(135deg,${accent},${accent}cc)`,{fontSize:11,boxShadow:`0 2px 8px ${accent}30`}),display:'inline-flex',alignItems:'center',gap:5}} onClick={()=>openLesson(lesson,unit)}>{isStudying?<RefreshCw size={11}/>:<Play size={11}/>}{isStudying?'Continue':'Start Lesson'}</motion.button>}
                        {isVerified&&<button onClick={()=>openLesson(lesson,unit)} style={{...btnSm(C.s4,{color:C.t2,fontSize:11}),display:'inline-flex',alignItems:'center',gap:5}}><ScrollText size={11}/>Review</button>}
                        {(isDone||isVerified)&&<Check size={14} color={C.green} strokeWidth={3}/>}
                        {state==='locked'&&<Lock size={12} color={C.t4}/>}
                      </div>
                      {lesson.objectives?.length>0&&(avail||isStudying)&&(
                        <div style={{marginLeft:34,display:'flex',flexDirection:'column',gap:3}}>
                          <div style={{fontSize:9.5,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:2}}>What to actually do</div>
                          {lesson.objectives.map((o,oi)=>(
                            <div key={oi} style={{fontSize:11.5,color:C.t2,display:'flex',gap:6,alignItems:'flex-start'}}><span style={{color:accent,flexShrink:0}}>–</span>{o}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
        <div style={glass({padding:18})}>
          <div style={R({justifyContent:'space-between',marginBottom:14})}>
            <SL extra={{marginBottom:0}}>Switch Study Track</SL>
            <button style={{...btnG({fontSize:11,padding:'6px 14px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDIntro(true);goPrep('diagnostic');}}>Full pathway details<ChevronRight size={12}/></button>
          </div>
          <div style={G(3,10,{},isMobile)}>
            {Object.entries(PATHS).map(([key,p])=>(
              <motion.div key={key} whileHover={{borderColor:`${p.accent}40`,background:`${p.accent}08`}} onClick={()=>switchPath(key)} style={{...glass2({padding:14,cursor:'pointer',border:eSpec===key?`1px solid ${p.accent}50`:undefined,transition:'all .15s'})}} >
                <div style={{fontSize:12,fontWeight:700,color:eSpec===key?p.accent:C.t2,fontFamily:C.FD}}>{p.label}</div>
                {p.tagline&&<div style={{fontSize:10.5,color:C.t3,marginTop:4,lineHeight:1.5}}>{p.tagline}</div>}
                {eSpec===key&&<div style={{fontSize:10,color:p.accent,marginTop:6,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}><Check size={10}/>Current</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ LIBRARY ──────────────────────────────────────────────────────────────
  function tQuizzes(){
    const dColors={Easy:C.green,Medium:C.cyan,Hard:C.amber,Expert:C.rose};
    const diffLevels=['Easy','Medium','Hard','Expert'];
    const COURSE_CAT_MAP={Biology:'Life Sciences','Environmental Science':'Life Sciences',Chemistry:'Physical Sciences',Physics:'Physical Sciences','AP Psychology':'Behavioral & Social Sciences','US History':'Behavioral & Social Sciences','World History':'Behavioral & Social Sciences','AP US History':'Behavioral & Social Sciences','AP World History':'Behavioral & Social Sciences'};
    const myCourseCats=new Set((user.courses||[]).map(c=>COURSE_CAT_MAP[c]).filter(Boolean));
    const filtersActive = qSrch.trim()!==''||qCat!=='All'||qDiff!=='All'||qSort!=='default';
    const clearFilters = ()=>{setQSrch('');setQC('All');setQD('All');setQSort('default');};
    return(
      <div style={CC({gap:22})}>
        <div data-tour="prep-deep-quizzes" style={R()}>
          <div><div style={lbl()}>Quiz Library</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Practice Quizzes</h2></div>
        </div>
        {/* Stat tiles */}
        <div style={G(3,12,{},isMobile)}>
          <div style={{...glass2({padding:'16px 18px'}),display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.blueDim,border:`1px solid ${C.blue}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Layers size={16} color={C.blueL}/></div>
            <div><div style={{fontSize:19,fontWeight:800,color:C.t1,fontFamily:C.FM,lineHeight:1}}>{ALL_QUIZZES.length}</div><div style={{fontSize:10,color:C.t3,marginTop:3}}>quizzes · {TOTAL_QUESTIONS} questions</div></div>
          </div>
          <div style={{...glass2({padding:'16px 18px'}),display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.greenDim,border:`1px solid ${C.green}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><CheckCircle2 size={16} color={C.greenL}/></div>
            <div><div style={{fontSize:19,fontWeight:800,color:C.t1,fontFamily:C.FM,lineHeight:1}}>{qTaken}/{ALL_QUIZZES.length}</div><div style={{fontSize:10,color:C.t3,marginTop:3}}>completed</div></div>
          </div>
          <div style={{...glass2({padding:'16px 18px'}),display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:avgSc>0?`${scCol(avgSc)}18`:C.s3,border:`1px solid ${avgSc>0?scCol(avgSc)+'30':C.b1}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Target size={16} color={avgSc>0?scCol(avgSc):C.t3}/></div>
            <div><div style={{fontSize:19,fontWeight:800,color:avgSc>0?scCol(avgSc):C.t3,fontFamily:C.FM,lineHeight:1}}>{avgSc>0?`${avgSc}%`:'—'}</div><div style={{fontSize:10,color:C.t3,marginTop:3}}>average score</div></div>
          </div>
        </div>
        {/* Filter toolbar */}
        <div style={glass({padding:16})}>
          <div style={R({justifyContent:'space-between',marginBottom:12})}>
            <SL extra={{marginBottom:0}}>Filter & Sort</SL>
            {filtersActive&&<button style={{...btnG({fontSize:10.5,padding:'4px 12px'}),display:'inline-flex',alignItems:'center',gap:5}} onClick={clearFilters}><RefreshCw size={10}/>Reset filters</button>}
          </div>
          <div style={R({gap:8,flexWrap:'wrap',marginBottom:14})}>
            {diffLevels.map(d=>{const cnt=ALL_QUIZZES.filter(q=>q.diff===d).length;const dc=dColors[d];return cnt>0&&(
              <div key={d} onClick={()=>setQD(qDiff===d?'All':d)} style={{background:qDiff===d?`${dc}18`:'rgba(255,255,255,0.02)',border:`1px solid ${qDiff===d?dc+'55':C.b1}`,padding:'7px 14px',display:'flex',gap:7,alignItems:'center',cursor:'pointer',borderRadius:9,transition:'all .15s'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:dc,flexShrink:0}}/>
                <span style={{fontSize:11,color:qDiff===d?dc:C.t2,fontWeight:700}}>{d}</span>
                <span style={{fontSize:11,color:C.t3,fontFamily:C.FM}}>{cnt}</span>
              </div>
            );})}
          </div>
          <div style={R({flexWrap:'wrap',gap:10})}>
            <div style={{flex:1,minWidth:180,position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.t3,display:'flex',pointerEvents:'none'}}><Search size={14}/></span>
              <input style={inp({paddingLeft:36})} placeholder="Search quizzes…" value={qSrch} onChange={e=>setQSrch(e.target.value)}/>
            </div>
            <select style={inp({width:'auto'})} value={qCat} onChange={e=>setQC(e.target.value)}>{['All','Life Sciences','Physical Sciences','Behavioral & Social Sciences'].map(c=><option key={c}>{c}</option>)}</select>
            <select style={inp({width:'auto'})} value={qDiff} onChange={e=>setQD(e.target.value)}>{['All','Easy','Medium','Hard','Expert'].map(d=><option key={d}>{d}</option>)}</select>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.t3,display:'flex',pointerEvents:'none'}}><ListFilter size={13}/></span>
              <select style={inp({width:'auto',paddingLeft:30})} value={qSort} onChange={e=>setQSort(e.target.value)}>
                <option value="default">Sort: Default</option>
                <option value="unattempted">Sort: Unattempted first</option>
                <option value="difficulty">Sort: Easiest first</option>
                <option value="score">Sort: Lowest score first</option>
              </select>
            </div>
          </div>
        </div>
        {/* Iatra ranked quiz recommendations — full top-6 list */}
        {rankedQuizzes.length>0&&<QuizRecommendationsPanel ranked={rankedQuizzes} onStart={(quiz)=>{setAQ(quiz);play('click');}} onAskIatra={askIatraAboutPick}/>}
        <div style={R({justifyContent:'space-between'})}>
          <SL extra={{marginBottom:0}}>{fQuiz.length} {fQuiz.length===1?'Quiz':'Quizzes'}</SL>
        </div>
        <div style={G(2,14,{},isMobile)}>
          {fQuiz.map((q,qi)=>{
            const sc=qScores[q.id];const taken=sc!==undefined;const dc=dColors[q.diff]||C.t2;const scc=taken?scCol(sc):null;
            return(
              <motion.div key={q.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(qi,10)*.03}} whileHover={{y:-2,boxShadow:`0 12px 40px rgba(0,0,0,0.6),0 0 0 1px ${dc}20`}} style={{...glass({padding:0,overflow:'hidden'}),transition:'box-shadow .2s'}}>
                {taken&&<div style={{height:3,background:`linear-gradient(90deg,${scc},${scc}88)`}}/>}
                <div style={{padding:22}}>
                  <div style={R({marginBottom:14,flexWrap:'wrap'})}>
                    <span style={pill(`${dc}18`,dc,{fontSize:10})}>{q.diff}</span>
                    {myCourseCats.has(q.cat)&&<span style={pill(C.greenDim,C.greenL,{fontSize:9})}>Matches your courses</span>}
                    <span style={{marginLeft:'auto',fontSize:11,color:C.t3}}>{q.cat}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:4,lineHeight:1.4,fontFamily:C.FD}}>{q.title}</div>
                  <div style={{fontSize:11,color:C.t3,marginBottom:18,fontFamily:C.FM,display:'flex',alignItems:'center',gap:5}}><ScrollText size={11}/>{q.qs.length} questions</div>
                  <div style={R()}>
                    {taken?(
                      <>
                        <motion.button whileHover={{scale:1.02}} whileTap={{scale:.98}} style={{...btn(C.s3,{flex:1,fontSize:12,border:`1px solid ${C.b2}`,color:C.t2}),display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={()=>{setAQ({...q,readonly:true});play('click');}}>
                          <ScrollText size={13}/>Review
                        </motion.button>
                        <div style={{fontSize:18,fontWeight:800,color:scc,fontFamily:C.FM,minWidth:52,textAlign:'right'}}>{sc}%</div>
                      </>
                    ):(
                      <motion.button whileHover={{scale:1.02}} whileTap={{scale:.98}} style={{...btn(C.blueGrad,{flex:1,fontSize:12}),display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={()=>{setAQ(q);play('click');}}>
                        Start Quiz<ChevronRight size={14}/>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {fQuiz.length===0&&<EmptyState icon={Layers} accent={accent} title="No quizzes match" body="Try a different search term or clear your filters." actionLabel="Clear Filters" onAction={()=>{setQSrch('');setQC('All');setQD('All');}}/>}
      </div>
    );
  }

  // ── AI COACH ─────────────────────────────────────────────────────────────────
  const COACH_ICONS = { FlaskConical, Compass };
  function TypingDots(){
    return(
      <div style={{display:'flex',alignItems:'center',gap:4,padding:'4px 2px'}}>
        {[0,1,2].map(i=>(
          <motion.span key={i} animate={{opacity:[.3,1,.3],y:[0,-3,0]}} transition={{duration:1.1,repeat:Infinity,delay:i*0.15,ease:'easeInOut'}} style={{width:6,height:6,borderRadius:'50%',background:accent,display:'inline-block'}}/>
        ))}
      </div>
    );
  }
  function relTime(ts){
    if(!ts)return '';
    const diffMs=Date.now()-ts, m=Math.floor(diffMs/60000), h=Math.floor(m/60), d=Math.floor(h/24);
    if(m<1)return 'just now';
    if(m<60)return `${m}m ago`;
    if(h<24)return `${h}h ago`;
    if(d<7)return `${d}d ago`;
    return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  }
  function ChatThreadList(){
    return(
      <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div style={{paddingBottom:14,flexShrink:0}}>
          <motion.button whileHover={{scale:1.02,filter:'brightness(1.08)'}} whileTap={{scale:.97}} onClick={startNewChat}
            style={{...btn(`linear-gradient(135deg,${accent},${C.cyan})`,{width:'100%',justifyContent:'flex-start',padding:'10px 14px',fontSize:12.5}),boxShadow:`0 4px 14px ${accent}30`}}>
            <Plus size={14}/>New chat
          </motion.button>
        </div>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:3,paddingRight:2}}>
          {threadsLoading&&<div style={{fontSize:11.5,color:C.t4,padding:'8px 6px'}}>Loading chats…</div>}
          {!threadsLoading&&coachThreads.length===0&&<div style={{fontSize:11.5,color:C.t4,padding:'8px 6px',lineHeight:1.5}}>No chats yet — ask Iatra something below to start your first one.</div>}
          {coachThreads.map(t=>{
            const active=t.id===activeThreadId;
            return(
              <div key={t.id} className="mb-thread-row" onClick={()=>renamingThreadId!==t.id&&switchChatThread(t.id)}
                style={{position:'relative',borderRadius:10,padding:'9px 10px',cursor:'pointer',background:active?`${accent}18`:'transparent',border:active?`1px solid ${accent}35`:'1px solid transparent',display:'flex',alignItems:'center',gap:8,transition:'background .15s'}}>
                <MessageCircle size={13} color={active?accent:C.t4} style={{flexShrink:0}}/>
                {renamingThreadId===t.id?(
                  <input autoFocus value={renameDraft} onChange={e=>setRenameDraft(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')commitRenameThread();if(e.key==='Escape')setRenamingThreadId(null);}}
                    onBlur={commitRenameThread} onClick={e=>e.stopPropagation()}
                    style={{...inp({padding:'4px 8px',fontSize:12}),flex:1}}/>
                ):(
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:active?700:500,color:active?C.t1:C.t2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                    <div style={{fontSize:10,color:C.t4,marginTop:1}}>{relTime(t.updatedAt)}</div>
                  </div>
                )}
                {renamingThreadId!==t.id&&(
                  <div className="mb-thread-actions" style={{display:'flex',gap:2,flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();beginRenameThread(t);}} title="Rename chat" style={{width:22,height:22,borderRadius:6,border:'none',background:'transparent',color:C.t4,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Pencil size={11}/></button>
                    <button onClick={e=>{e.stopPropagation();deleteChatThread(t.id);}} title="Delete chat" style={{width:22,height:22,borderRadius:6,border:'none',background:'transparent',color:C.t4,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Trash2 size={11}/></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  function tCoach(){
    const usagePct=Math.round(((coachDailyLimit-coachRequestsRemaining)/coachDailyLimit)*100);
    const usageColor=usagePct>=100?C.rose:usagePct>=80?C.amber:C.violet;
    return(
      <div style={{display:'flex',height:'calc(100vh - 64px)',position:'relative'}}>
        {/* ── Chat sidebar (desktop: fixed column · mobile: slide-over) ────── */}
        {!isMobile&&(
          <div style={{width:216,flexShrink:0,marginRight:18,borderRight:`1px solid ${C.b1}`,paddingRight:16}}>
            <ChatThreadList/>
          </div>
        )}
        <AnimatePresence>
          {isMobile&&coachSidebarOpen&&(
            <React.Fragment key="mb-sidebar">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setCoachSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:40}}/>
              <motion.div initial={{x:-280}} animate={{x:0}} exit={{x:-280}} transition={{type:'spring',damping:30,stiffness:300}}
                style={{position:'fixed',top:0,left:0,bottom:0,width:260,background:C.s1,borderRight:`1px solid ${C.b1}`,padding:'16px 12px',zIndex:41,overflowY:'auto'}}>
                <ChatThreadList/>
              </motion.div>
            </React.Fragment>
          )}
        </AnimatePresence>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div data-tour="prep-deep-coach" style={{paddingBottom:18,borderBottom:`1px solid ${C.b1}`,marginBottom:18,flexShrink:0}}>
          <div style={{display:'flex',flexDirection:isMobile?'column':'row',justifyContent:'space-between',alignItems:isMobile?'flex-start':'flex-start',gap:isMobile?10:12}}>
            <div style={R({gap:isMobile?10:12,alignItems:'flex-start'})}>
              {isMobile&&(
                <button onClick={()=>setCoachSidebarOpen(true)} title="Your chats" style={{width:34,height:34,borderRadius:10,flexShrink:0,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.b1}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.t2,cursor:'pointer'}}>
                  <Menu size={16}/>
                </button>
              )}
              <div style={{width:isMobile?34:40,height:isMobile?34:40,borderRadius:12,flexShrink:0,background:`linear-gradient(135deg,${accent}35,${C.cyan}22)`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 14px ${accent}20`}}>
                <Brain size={isMobile?16:19} color={accent}/>
              </div>
              <div>
                <div style={R({gap:7,marginBottom:1})}>
                  <h2 style={{fontSize:isMobile?18:22,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0,whiteSpace:'nowrap'}}>Iatra</h2>
                  <Sparkles size={13} color={C.amberL}/>
                </div>
                <div style={{fontSize:isMobile?11:12,color:C.t3}}>Your SAT/ACT content and study-strategy assistant</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:isMobile?'row':'column',alignItems:isMobile?'center':'flex-end',flexWrap:'wrap',gap:isMobile?6:6,flexShrink:0}}>
              <div style={R({gap:8})}>
                {aiChatCount>0&&<span style={pill(C.violetDim,C.violetL,{fontSize:10,fontFamily:C.FM})}>{aiChatCount} messages</span>}
                <span style={pill(`${accent}22`,accent)}>{curPath?.label} focus</span>
              </div>
              <div style={{display:'flex',gap:3,padding:3,borderRadius:9,background:C.s2,border:`1px solid ${C.b1}`}} data-tour="prep-deep-coach-tier">
                {COACH_TIERS.map(t=>(
                  <button key={t.id} title={t.desc} onClick={()=>setCoachTier(t.id)}
                    style={{padding:'4px 10px',borderRadius:6,border:'none',background:coachTier===t.id?accent:'transparent',color:coachTier===t.id?'#fff':C.t3,fontSize:10.5,fontWeight:700,fontFamily:C.FB,cursor:'pointer',transition:'background .15s,color .15s'}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{marginTop:8,fontSize:10.5,color:C.t4,textAlign:isMobile?'left':'right'}}>{COACH_TIERS.find(t=>t.id===coachTier)?.desc}</div>
          <div style={{marginTop:16,maxWidth:320}}>
            <div style={R({justifyContent:'space-between',marginBottom:5})}>
              <div style={R({gap:5})}>
                <Zap size={11} color={C.t3}/>
                <span style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase'}}>Daily coaching usage</span>
              </div>
              <span style={{fontSize:10,color:C.t3,fontFamily:C.FM}}>{coachRequestsUsedToday}<span style={{color:C.t4}}> / {coachDailyLimit}</span></span>
            </div>
            <Bar pct={usagePct} color={usageColor} h={4}/>
          </div>
        </div>

        {coachRequestsRemaining<=0&&(
          <div style={{...R({gap:10}),flexShrink:0,marginBottom:14,padding:'12px 16px',borderRadius:12,background:C.roseDim,border:`1px solid ${C.rose}30`}}>
            <AlertTriangle size={15} color={C.roseL} style={{flexShrink:0}}/>
            <span style={{fontSize:13,color:C.t1}}>You've reached today's coaching limit. It resets tomorrow.</span>
          </div>
        )}

        {/* ── Empty state / suggestions ──────────────────────────────────── */}
        {msgs.length===0&&(
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
            <div style={{...glass2({padding:isMobile?16:20}),marginBottom:20,display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${accent}35,${C.cyan}22)`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MessageCircle size={16} color={accent}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:3}}>Hey — I'm Iatra.</div>
                <div style={{fontSize:13,color:C.t3,lineHeight:1.6}}>Ask me to explain a concept, build a study plan, or work through a tough problem. I know where you stand in {curPath?.label||'your pathway'} and can tailor answers to it. Pick a prompt below or just start typing.</div>
              </div>
            </div>
            {QUICK_P_GROUPS.map(group=>{const GIc=COACH_ICONS[group.icon];return(
              <div key={group.label} style={{marginBottom:18}}>
                <div style={{...R({gap:6}),marginBottom:10}}><GIc size={12} color={C.t3}/><span style={lbl({marginBottom:0})}>{group.label}</span></div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
                  {group.prompts.map((p,i)=>(
                    <motion.button key={i} whileHover={{y:-2,borderColor:`${accent}50`,background:'rgba(255,255,255,0.045)'}} whileTap={{scale:.98}} onClick={()=>sendChat(p)}
                      style={{textAlign:'left',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.b1}`,background:'rgba(255,255,255,0.025)',color:C.t2,fontSize:12.5,lineHeight:1.5,fontFamily:C.FB,cursor:'pointer',transition:'background .15s,border-color .15s'}}>
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>
            );})}
          </div>
        )}

        {/* ── Message thread ─────────────────────────────────────────────── */}
        {msgs.length>0&&(
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,paddingRight:2}}>
          <AnimatePresence initial={false}>
            {msgs.map((m,i)=>(
              <motion.div key={i} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:isMobile?6:10}}>
                {m.role!=='user'&&<div style={{width:isMobile?24:30,height:isMobile?24:30,borderRadius:'50%',background:m.role==='error'?C.roseDim:`linear-gradient(135deg,${accent}30,${C.cyan}20)`,border:`1px solid ${m.role==='error'?C.rose+'40':accent+'30'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {m.role==='error'?<AlertTriangle size={isMobile?12:14} color={C.roseL}/>:<Brain size={isMobile?12:14} color={accent}/>}
                </div>}
                <div className="mb-group" style={{maxWidth:isMobile?'85%':'78%',position:'relative'}}>
                  <div style={{padding:isMobile?'10px 14px':'13px 18px',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.role==='user'?`linear-gradient(135deg,${accent},${C.blueD})`:m.role==='error'?C.roseDim:C.s2,border:m.role==='user'?'none':m.role==='error'?`1px solid ${C.rose}30`:`1px solid ${C.b1}`,fontSize:isMobile?13:14,lineHeight:1.75,color:C.t1,fontFamily:C.FB,boxShadow:m.role==='user'?`0 4px 16px ${accent}30`:'0 2px 8px rgba(0,0,0,0.3)'}}>
                    {m.role==='assistant'?<div dangerouslySetInnerHTML={{__html:renderMarkdown(m.content)}}/>:m.content}
                    {m.role==='error'&&(
                      <motion.button whileHover={{borderColor:`${C.rose}50`}} whileTap={{scale:.96}} onClick={retryChat} style={{...btnG({fontSize:11,padding:'5px 12px',marginTop:8,borderRadius:8,color:C.roseL}),border:`1px solid ${C.rose}30`}}>
                        <RotateCcw size={11}/> Try again
                      </motion.button>
                    )}
                  </div>
                  {m.role==='assistant'&&(
                    <button className="mb-copy" onClick={()=>copyMsg(m.content,i)} title="Copy response"
                      style={{position:'absolute',top:-10,right:-8,width:24,height:24,borderRadius:'50%',border:`1px solid ${C.b2}`,background:C.s3,color:C.t3,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'opacity .15s'}}>
                      {copiedIdx===i?<Check size={11} color={C.greenL}/>:<Copy size={11}/>}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cLoad&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{display:'flex',alignItems:'flex-end',gap:10}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,${accent}30,${C.cyan}20)`,border:`1px solid ${accent}30`,display:'flex',alignItems:'center',justifyContent:'center'}}><Brain size={14} color={accent}/></div>
            <div style={{padding:'11px 18px',background:C.s2,border:`1px solid ${C.b1}`,borderRadius:'18px 18px 18px 4px'}}><TypingDots/></div>
          </motion.div>}
          <div ref={chatEnd}/>
        </div>
        )}

        {/* ── Composer ────────────────────────────────────────────────────── */}
        <div style={{flexShrink:0,marginTop:14}}>
          <div style={R({gap:isMobile?6:10})}>
            <textarea style={{...inp({resize:'none',minHeight:isMobile?44:52,maxHeight:120,lineHeight:1.6,fontFamily:C.FB,borderRadius:14,padding:isMobile?'10px 14px':'10px 14px'}),flex:1,opacity:coachRequestsRemaining<=0?.5:1}} placeholder={isMobile?"Ask Iatra…":"Ask Iatra about SAT/ACT content, admissions, or study strategies…"} value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat(ci);}}} disabled={coachRequestsRemaining<=0}/>
            <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} style={{...btn(C.blueGrad,{padding:isMobile?'0 16px':'0 22px',alignSelf:'flex-end',height:isMobile?44:52,flexShrink:0,borderRadius:14,boxShadow:`0 4px 16px ${accent}35`,opacity:cLoad||coachRequestsRemaining<=0?.6:1}),display:'inline-flex',alignItems:'center',justifyContent:'center'}} onClick={()=>sendChat(ci)} disabled={cLoad||coachRequestsRemaining<=0}>
              {cLoad?<RefreshCw size={isMobile?16:19} className="spin"/>:<ArrowUp size={isMobile?16:19}/>}
            </motion.button>
          </div>
          <div style={R({justifyContent:'space-between',marginTop:8})}>
            {activeThreadId?<button style={btnG({fontSize:11,padding:'5px 14px',borderRadius:20,color:C.roseL})} onClick={()=>deleteChatThread(activeThreadId)}><Trash2 size={11}/>Delete this chat</button>:<span/>}
            {!isMobile&&<span style={{fontSize:10.5,color:C.t4}}>Iatra can make mistakes — double-check anything important.</span>}
          </div>
        </div>
        </div>
      </div>
    );
  }
  // ── FLASHCARDS ────────────────────────────────────────────────────────────────
  function tFlash(){
    if(activeDeck){
      const sessionTotal=sessionStats.reviewed;
      const sessionAcc=sessionTotal>0?Math.round(((sessionStats.good+sessionStats.easy)/sessionTotal)*100):null;
      if(!currentCard){
        return(
        <div style={CC({gap:16})}>
          <button style={{...btnG({alignSelf:'flex-start'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setAD(null);setCIdx(0);setFlip(false);}}><ChevronLeft size={14}/>All Decks</button>
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{...glass({padding:40,textAlign:'center'})}}>
            <motion.div initial={{scale:.6,rotate:-10}} animate={{scale:1,rotate:0}} transition={{type:'spring',stiffness:260,damping:14}} style={{marginBottom:16,display:'flex',justifyContent:'center'}}><PartyPopper size={44} color={C.green}/></motion.div>
            <div style={{fontSize:18,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:8}}>{studyMode==='due'?'All due cards reviewed!':'Deck complete!'}</div>
            <div style={{fontSize:14,color:C.t2,marginBottom:sessionTotal>0?20:24}}>{studyMode==='due'?'Check back later for more cards to review.':'You have reviewed all cards in this deck.'}</div>
            {sessionTotal>0&&(<>
              <div style={{...G(4,10,{},isMobile),marginBottom:14,maxWidth:460,marginLeft:'auto',marginRight:'auto'}}>
                <div style={glass2({textAlign:'center',padding:12})}><div style={{fontSize:18,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{sessionTotal}</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Reviewed</div></div>
                <div style={glass2({textAlign:'center',padding:12})}><div style={{fontSize:18,fontWeight:800,color:C.green,fontFamily:C.FD}}>{sessionAcc}%</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Remembered</div></div>
                <div style={glass2({textAlign:'center',padding:12})}><div style={{fontSize:18,fontWeight:800,color:C.rose,fontFamily:C.FD}}>{sessionStats.again}</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Again</div></div>
                <div style={glass2({textAlign:'center',padding:12})}><div style={{fontSize:18,fontWeight:800,color:C.blue,fontFamily:C.FD}}>{fmtT(Math.round((Date.now()-sessionStats.startedAt)/1000))}</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Time</div></div>
              </div>
              <div style={{...G(2,10,{},isMobile),marginBottom:24,maxWidth:240,marginLeft:'auto',marginRight:'auto'}}>
                <div style={{...glass2({textAlign:'center',padding:12,background:C.amberDim,border:`1px solid ${C.amber}25`})}}><div style={{fontSize:16,fontWeight:800,color:C.amberL,fontFamily:C.FD,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Flame size={14}/>{sessionStats.bestStreak}</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Best streak</div></div>
                <div style={{...glass2({textAlign:'center',padding:12,background:C.violetDim,border:`1px solid ${C.violet}25`})}}><div style={{fontSize:16,fontWeight:800,color:C.violetL,fontFamily:C.FD,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Zap size={14}/>{sessionStats.xp}</div><div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>XP earned</div></div>
              </div>
            </>)}
            <div style={R({justifyContent:'center',gap:10})}>
              {studyMode==='due'&&<button style={btn()} onClick={()=>setStudyMode('all')}>Browse All Cards</button>}
              <button style={btnG()} onClick={()=>{setCIdx(0);setFlip(false);setSessionStats({reviewed:0,again:0,hard:0,good:0,easy:0,startedAt:Date.now(),streak:0,bestStreak:0,xp:0});}}>Study Again</button>
            </div>
          </motion.div>
        </div>
      );}
      const dueCount=getDueCards(activeDeck.builtin?(FLASH_DECKS[activeDeck.name]||[]):(cDecks[activeDeck.name]||[])).length;
      return(
        <div style={CC({gap:16})}>
          <div style={R()}>
            <button style={{...btnG({padding:'7px 16px',fontSize:12}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setAD(null);setCIdx(0);setFlip(false);}}><ChevronLeft size={14}/>All Decks</button>
            <div style={{flex:1,textAlign:'center'}}>
              <div style={R({justifyContent:'center',gap:8})}>
                <div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{activeDeck.name}</div>
                <AnimatePresence>
                  {sessionStats.streak>=3&&(
                    <motion.div key={sessionStats.streak} initial={{scale:.4,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.4,opacity:0}} transition={{type:'spring',stiffness:400,damping:12}}
                      style={{...pill(C.amberDim,C.amberL,{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}>
                      <Flame size={11}/>{sessionStats.streak}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div style={{fontSize:11,color:C.t3,fontFamily:C.FM,marginTop:2}}>{cIdx+1} / {deckCards.length} · {dueCount} due{sessionTotal>0?` · ${sessionTotal} reviewed · +${sessionStats.xp} XP`:''}</div>
            </div>
            <div style={R({gap:6})}>
              <button style={btnSm(studyMode==='due'?C.blueGrad:C.s4,{fontSize:11,color:studyMode==='due'?'#fff':C.t2,border:`1px solid ${studyMode==='due'?'transparent':C.b1}`})} onClick={()=>{setStudyMode('due');setCIdx(0);setFlip(false);}}>Due ({dueCount})</button>
              <button style={btnSm(studyMode==='all'?C.blueGrad:C.s4,{fontSize:11,color:studyMode==='all'?'#fff':C.t2,border:`1px solid ${studyMode==='all'?'transparent':C.b1}`})} onClick={()=>{setStudyMode('all');setCIdx(0);setFlip(false);}}>All</button>
              {!activeDeck.builtin&&<button style={btnSm(C.s4,{color:C.t2,fontSize:11})} onClick={()=>setManageDeck(activeDeck.name)}>Manage</button>}
              {!activeDeck.builtin&&<button style={btnSm(C.roseDim,{color:C.rose,border:`1px solid ${C.rose}30`,fontSize:11})} onClick={()=>{deleteDeck_(activeDeck.name);setAD(null);toast('Deck deleted');}}>Delete</button>}
            </div>
          </div>
          <Bar pct={((cIdx+1)/deckCards.length)*100} color={accent} h={3} glow/>
          <FlipCard card={currentCard} flipped={flip} onClick={()=>setFlip(f=>!f)} m={isMobile} streak={sessionStats.streak}/>
          <div style={{textAlign:'center',fontSize:10.5,color:C.t4,fontFamily:C.FM}}>{!isMobile&&(flip?'Press 1–4 to rate · ':'Press Space to flip · ')}Click card to flip</div>
          <div style={R({justifyContent:'space-between'})}>
            <motion.button whileHover={{scale:1.04}} style={{...btnG({padding:'9px 20px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setCIdx(i=>Math.max(0,i-1));setFlip(false);}} disabled={cIdx===0}><ChevronLeft size={14}/>Prev</motion.button>
            {flip&&(
              <div style={R({gap:8})}>
                {[['Again',0,C.rose],['Hard',1,C.amber],['Good',2,C.blue],['Easy',3,C.green]].map(([label,q,col])=>(
                  <motion.button key={label} whileHover={{scale:1.06}} whileTap={{scale:.94}}
                    style={{...btnSm(`${col}20`,{color:col,border:`1px solid ${col}30`,fontSize:11}),display:'inline-flex',alignItems:'center',gap:6}}
                    onClick={()=>rateCard(label)}>
                    {label}<span style={{fontSize:9,color:`${col}99`,fontFamily:C.FM}}>{q+1}</span>
                  </motion.button>
                ))}
              </div>
            )}
            <motion.button whileHover={{scale:1.04}} style={{...btnG({padding:'9px 20px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setCIdx(i=>Math.min(deckCards.length-1,i+1));setFlip(false);}} disabled={cIdx===deckCards.length-1}>Next<ChevronRight size={14}/></motion.button>
          </div>
          {/* Export deck */}
          <button style={{...btnG({alignSelf:'flex-start',fontSize:11,padding:'6px 14px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>exportFlashDeck(activeDeck.name,deckCards)}><FileDown size={13}/>Export Deck PDF</button>
          <AnimatePresence>
            {manageDeck&&<CardManagerModal
              deckName={manageDeck}
              cards={cDecks[manageDeck]||[]}
              onAdd={(f,b)=>addCardToDeck(manageDeck,f,b)}
              onUpdate={(idx,f,b)=>updateCardInDeck(manageDeck,idx,f,b)}
              onDelete={idx=>deleteCardFromDeck(manageDeck,idx)}
              onClose={()=>setManageDeck(null)}
              m={isMobile}
            />}
          </AnimatePresence>
        </div>
      );
    }

    const builtinCount=Object.keys(FLASH_DECKS).length, customCount=Object.keys(cDecks).length;
    const searched=searchDecks(deckFuse,allDecksList,dSrch)||allDecksList;
    const filteredDecks=searched.filter(deck=>{
      if(deckFilter==='all')return true;
      const deckCardsAll=deck.builtin?(FLASH_DECKS[deck.name]||[]):(cDecks[deck.name]||[]);
      if(deckFilter==='due')return getDueCards(deckCardsAll).length>0;
      if(deckFilter==='custom')return !deck.builtin;
      if(deckFilter==='builtin')return deck.builtin;
      return true;
    });

    return(
      <div style={CC({gap:22})}>
        <div data-tour="prep-deep-flashcards" style={R()}>
          <div><div style={lbl()}>Flashcards</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Study Decks</h2></div>
          <div style={{marginLeft:'auto',...R({gap:8})}}>
            <button style={{...btn(C.blueGrad,{fontSize:12,padding:'8px 16px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>setNewDeckOpen(true)}><Plus size={14}/>New Deck</button>
          </div>
        </div>

        {/* Overview stats */}
        <div style={G(4,12,{},isMobile)}>
          <div style={glass2({padding:14})}><div style={{fontSize:20,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{builtinCount+customCount}</div><div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Total Decks</div></div>
          <div style={glass2({padding:14})}><div style={{fontSize:20,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{allCards.length}</div><div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Total Cards</div></div>
          <div style={glass2({padding:14})}><div style={{fontSize:20,fontWeight:800,color:dueCards>0?C.amberL:C.greenL,fontFamily:C.FD}}>{dueCards}</div><div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Due Now</div></div>
          <div style={glass2({padding:14})}><div style={{fontSize:20,fontWeight:800,color:C.violetL,fontFamily:C.FD}}>{avgRetention!==null?`${avgRetention}%`:'—'}</div><div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2}}>Avg. Retention</div></div>
        </div>

        <div style={R({flexWrap:'wrap',gap:10})}>
          <div style={{flex:1,minWidth:200,position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.t3,display:'flex',pointerEvents:'none',transition:'color .2s'}}><Search size={14}/></span>
            <input
              style={inp({paddingLeft:36,paddingRight:dSrchLive?32:14,transition:'box-shadow .2s, border-color .2s'})}
              placeholder="Search decks or cards…"
              value={dSrchLive}
              onChange={e=>setDSrchLive(e.target.value)}
            />
            <AnimatePresence>
              {dSrchLive&&(
                <motion.button
                  initial={{opacity:0,scale:.6}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.6}} transition={{duration:.12}}
                  style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.t3,cursor:'pointer',padding:4,borderRadius:6,display:'flex'}}
                  onClick={()=>{setDSrchLive('');setDS2('');}}
                  aria-label="Clear search"
                ><X size={14}/></motion.button>
              )}
            </AnimatePresence>
          </div>
          <div style={R({gap:6})}>
            {[['all','All'],['due','Due'],['builtin','Built-in'],['custom','My Decks']].map(([key,label])=>(
              <button key={key} style={btnSm(deckFilter===key?C.blueGrad:C.s4,{fontSize:11,color:deckFilter===key?'#fff':C.t2,border:`1px solid ${deckFilter===key?'transparent':C.b1}`})} onClick={()=>setDeckFilter(key)}>{label}</button>
            ))}
          </div>
        </div>

        {/* AI Generator */}
        <motion.div animate={gShake?{x:[0,-7,7,-5,5,-2,2,0]}:{x:0}} transition={{duration:.42}}
          style={{...glass({background:`${C.violetDim}`,border:`1px solid rgba(139,92,246,0.2)`,position:'relative',overflow:'hidden'})}}>
          <div style={R({marginBottom:14})}>
            <motion.div animate={gLoad?{rotate:360}:{rotate:0}} transition={gLoad?{duration:1.6,repeat:Infinity,ease:'linear'}:{duration:.3}}
              style={{width:36,height:36,borderRadius:10,background:C.violetDim,border:`1px solid ${C.violet}30`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 12px ${C.violet}20`}}><Brain size={17} color={C.violetL}/></motion.div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD}}>Generate Deck From Notes</div>
              <div style={{fontSize:11,color:C.t2,marginTop:1}}>Turns your notes into flashcards — runs entirely on your device, no account or API needed</div>
            </div>
          </div>
          <div style={R({gap:6,marginBottom:12,justifyContent:'flex-end'})}>
            <span style={{fontSize:10,color:C.t3}}>Cards</span>
            <input
              type="number" min={GEN_COUNT_MIN} max={GEN_COUNT_MAX} step={1}
              disabled={gLoad}
              style={inp({width:70,padding:'5px 10px',fontSize:11,opacity:gLoad?.6:1})}
              value={genCountInput}
              onChange={e=>setGenCountInput(e.target.value)}
              onBlur={e=>commitGenCount(e.target.value)}
            />
          </div>
          <div style={{position:'relative',marginBottom:12}}>
            <textarea disabled={gLoad} style={{...inp({minHeight:80,resize:'vertical',fontFamily:C.FB,lineHeight:1.6,opacity:gLoad?.6:1})}} placeholder="Paste your class notes, study guides, or any text here…" value={notes} onChange={e=>setNotes(e.target.value)}/>
            <div style={{position:'absolute',right:10,bottom:8,fontSize:9.5,color:C.t4,fontFamily:C.FM,pointerEvents:'none'}}>{notes.length>0?`${notes.trim().split(/\s+/).filter(Boolean).length} words`:''}</div>
          </div>
          <motion.button whileHover={gLoad?{}:{scale:1.02}} whileTap={gLoad?{}:{scale:.98}} style={{...btn(`linear-gradient(135deg,${C.violet},#7c3aed)`,{fontSize:12,boxShadow:`0 4px 16px ${C.violet}30`,minWidth:220,justifyContent:'center'}),display:'inline-flex',alignItems:'center',gap:8,cursor:gLoad?'wait':'pointer'}} onClick={genDeck} disabled={gLoad||!notes.trim()}>
            {gLoad?(
              <>
                <motion.span animate={{rotate:360}} transition={{duration:.9,repeat:Infinity,ease:'linear'}} style={{display:'flex'}}><RefreshCw size={14}/></motion.span>
                <AnimatePresence mode="wait">
                  <motion.span key={gStage} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.18}}>
                    {GEN_STAGES[gStage]}
                  </motion.span>
                </AnimatePresence>
              </>
            ):(<><Sparkles size={14}/>{`Generate ${genCount} Flashcards`}</>)}
          </motion.button>
          <AnimatePresence>
            {gLoad&&(
              <motion.div initial={{scaleX:0}} animate={{scaleX:1}} exit={{opacity:0}} transition={{duration:GEN_STAGES.length*0.55,ease:'linear'}}
                style={{position:'absolute',left:0,bottom:0,height:2,width:'100%',transformOrigin:'left',background:`linear-gradient(90deg,${C.violet},#7c3aed)`}}/>
            )}
          </AnimatePresence>
        </motion.div>

        <div style={G(3,12,{},isMobile)}>
          {filteredDecks.map((deck,i)=>{
            const deckCardsAll=deck.builtin?(FLASH_DECKS[deck.name]||[]):(cDecks[deck.name]||[]);
            const dc=getDueCards(deckCardsAll).length;
            const deckRet=(()=>{const rets=deckCardsAll.map(c=>getRetainability(c)).filter(r=>r!==null);return rets.length?Math.round(rets.reduce((s,r)=>s+r,0)/rets.length):null;})();
            const isNewest=!deck.builtin&&deck.name===newestDeckName;
            return(
              <motion.div key={deck.name} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.22,delay:Math.min(i,10)*0.025}}
                whileHover={{y:-2,borderColor:`${accent}35`,boxShadow:`0 8px 32px rgba(0,0,0,0.5),0 0 0 1px ${accent}20`}} style={{...glass({padding:20,cursor:'pointer',transition:'border-color .2s',position:'relative'})}}>
                <div onClick={()=>{setAD(deck);setCIdx(0);setFlip(false);setStudyMode(dc>0?'due':'all');setSessionStats({reviewed:0,again:0,hard:0,good:0,easy:0,startedAt:Date.now(),streak:0,bestStreak:0,xp:0});}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${accent}15`,border:`1px solid ${accent}25`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}><Layers3 size={17} color={accent}/></div>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:4,lineHeight:1.35,fontFamily:C.FD}}>{deck.name}</div>
                  <div style={{fontSize:11,color:C.t3,fontFamily:C.FM}}>{deckCardsAll.length} cards{deckRet!==null?` · ${deckRet}% retention`:''}</div>
                  <div style={R({gap:6,marginTop:8,flexWrap:'wrap'})}>
                    {isNewest&&<div style={{...pill(C.greenDim,C.greenL,{fontSize:10,fontWeight:700})}}>New</div>}
                    {dc>0&&<div style={{...pill(C.violetDim,C.violetL,{fontSize:10,fontFamily:C.FM})}}>{dc} due now</div>}
                    {!deck.builtin&&<div style={{...pill(C.violetDim,C.violetL,{fontSize:10})}}>My deck</div>}
                  </div>
                </div>
                {!deck.builtin&&(
                  <button style={{position:'absolute',top:14,right:14,background:'none',border:'none',color:C.t3,cursor:'pointer',padding:6,borderRadius:6}} onClick={e=>{e.stopPropagation();setManageDeck(deck.name);}} title="Manage cards"><ScrollText size={13}/></button>
                )}
              </motion.div>
            );
          })}
        </div>
        {filteredDecks.length===0&&<div style={{textAlign:'center',color:C.t3,padding:60}}>No decks match this filter.</div>}

        <AnimatePresence>
          {manageDeck&&<CardManagerModal
            deckName={manageDeck}
            cards={cDecks[manageDeck]||[]}
            onAdd={(f,b)=>addCardToDeck(manageDeck,f,b)}
            onUpdate={(idx,f,b)=>updateCardInDeck(manageDeck,idx,f,b)}
            onDelete={idx=>deleteCardFromDeck(manageDeck,idx)}
            onClose={()=>setManageDeck(null)}
            m={isMobile}
          />}
          {newDeckOpen&&<NewDeckModal
            onCreate={async(name)=>{await createDeck(name);setNewDeckOpen(false);setManageDeck(name);toast.success(`"${name}" created — add your first cards`);}}
            onClose={()=>setNewDeckOpen(false)}
            m={isMobile}
          />}
        </AnimatePresence>
      </div>
    );
  }

  // ── E-LIBRARY ─────────────────────────────────────────────────────────────────
  function tLib(){
    const yt=fLib.filter(r=>r.type==='YouTube');const reg=fLib.filter(r=>r.type!=='YouTube');
    const tc={Article:C.blue,Book:C.amber,Course:C.violet,App:C.green,Community:'#ec4899',Podcast:C.cyan};

    // Tracking actions
    function toggleBookmark(title) {
      if (!user) return;
      const bms = user.bookmarks || [];
      const updated = bms.includes(title) ? bms.filter(t => t !== title) : [...bms, title];
      saveUser({ ...user, bookmarks: updated });
      if (bms.includes(title)) {
        toast.success(`Removed "${title}" from saved resources`);
      } else {
        toast.success(`Saved "${title}" to library`, { icon: '⭐' });
      }
    }

    function toggleStudied(title) {
      if (!user) return;
      const studied = user.studied || [];
      const isDone = studied.includes(title);
      let updated;
      if (isDone) {
        updated = studied.filter(t => t !== title);
        saveUser({ ...user, studied: updated });
        toast.success(`Marked "${title}" as in progress`);
      } else {
        updated = [...studied, title];
        const xpGain = 15;
        const newXp = (user.xp || 0) + xpGain;
        saveUser({ ...user, xp: newXp, studied: updated });
        toast.success(`Completed! +15 XP earned`, { icon: '🎉' });
      }
    }

    function exportAllNotes() {
      if (!user?.resourceNotes) {
        toast.error("No study notes found to export.");
        return;
      }
      const noteKeys = Object.keys(user.resourceNotes).filter(k => user.resourceNotes[k]?.trim());
      if (noteKeys.length === 0) {
        toast.error("No study notes found to export.");
        return;
      }

      let md = `# MedSchoolPrep — My Study Notes Library\n`;
      md += `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
      md += `Pre-Med Student: ${user.name || 'Aspiring Physician'}\n`;
      md += `Active Pathway: ${curPath?.label || 'General Pre-Health'}\n`;
      md += `Total Notes Logged: ${noteKeys.length} resources\n`;
      md += `========================================================================\n\n`;

      // Group by category
      const notesByCat = {};
      ELIB.forEach(r => {
        const note = user.resourceNotes[r.title];
        if (note && note.trim()) {
          if (!notesByCat[r.cat]) notesByCat[r.cat] = [];
          notesByCat[r.cat].push({ r, note });
        }
      });

      Object.keys(notesByCat).sort().forEach(cat => {
        md += `📂 CATEGORY: ${cat.toUpperCase()}\n`;
        md += `------------------------------------------------------------------------\n\n`;
        notesByCat[cat].forEach(({ r, note }) => {
          md += `### 📄 ${r.title}\n`;
          md += `- **Type**: ${r.type} (${r.difficulty})\n`;
          md += `- **Resource Link**: ${r.url}\n`;
          md += `- **Quick Description**: ${r.desc}\n\n`;
          md += `📝 **My Study Notes & Key Takeaways**:\n`;
          md += `${note.trim()}\n\n`;
          md += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        });
      });

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(user.name || 'my').toLowerCase().replace(/\s+/g, '-')}-study-notes.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Successfully exported study notes to Markdown file!", { icon: '📝' });
    }

    const savedCount = (user?.bookmarks || []).length;
    const completedCount = (user?.studied || []).length;
    const notesCount = Object.keys(user?.resourceNotes || {}).filter(k => user.resourceNotes[k]?.trim()).length;
    const pct = Math.round((completedCount / ELIB.length) * 100) || 0;

    return(
      <div style={CC({gap:22})}>
        {/* Progress Tracker Card Header */}
        <div data-tour="prep-deep-library" style={{...glass({padding:20, background: `linear-gradient(135deg, ${C.blueDim}, transparent)`, border: `1px solid rgba(45, 127, 255, 0.15)`}), display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'}}>
          <div style={{position: 'relative', width: 64, height: 64, borderRadius: '50%', background: C.s2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.b1}`}}>
            <BookOpen size={24} color={pct > 0 ? C.blueL : C.t3} />
            {pct > 0 && <span style={{position: 'absolute', bottom: -4, right: -4, ...pill(C.green, '#fff', {fontSize: 9, padding: '2px 6px', borderRadius: 4})}}>{pct}%</span>}
          </div>
          <div style={{flex: 1, minWidth: 200}}>
            <div style={{fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.08em', textTransform: 'uppercase'}}>My Study Journey</div>
            <div style={{fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginTop: 2}}>E-Library Workspace</div>
            {/* Progress Bar */}
            <div style={{marginTop: 10, width: '100%', height: 6, borderRadius: 3, background: C.s4, overflow: 'hidden', position: 'relative'}}>
              <motion.div initial={{width: 0}} animate={{width: `${pct}%`}} transition={{duration: 0.6}} style={{position: 'absolute', left: 0, top: 0, height: '100%', background: C.blueGrad}} />
            </div>
          </div>
          <div style={{display: 'flex', gap: 16, flexWrap: 'wrap'}}>
            <div style={{textAlign: 'center', minWidth: 70}}>
              <div style={{fontSize: 18, fontWeight: 800, fontFamily: C.FM, color: C.t1}}>{ELIB.length}</div>
              <div style={{fontSize: 9, color: C.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2}}>Total</div>
            </div>
            <div style={{textAlign: 'center', minWidth: 70}}>
              <div style={{fontSize: 18, fontWeight: 800, fontFamily: C.FM, color: C.amberL}}>{savedCount}</div>
              <div style={{fontSize: 9, color: C.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2}}>Saved</div>
            </div>
            <div style={{textAlign: 'center', minWidth: 70}}>
              <div style={{fontSize: 18, fontWeight: 800, fontFamily: C.FM, color: C.greenL}}>{completedCount}</div>
              <div style={{fontSize: 9, color: C.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2}}>Studied</div>
            </div>
          </div>
        </div>

        {/* E-Library Inner Sub-Tabs */}
        <div style={R({borderBottom: `1px solid ${C.b1}`, paddingBottom: 10, gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center'})}>
          <div style={R({gap: 10, flexWrap: 'wrap'})}>
            {[
              { id: 'all', label: 'All Resources', icon: BookOpen },
              { id: 'saved', label: `My Saved (${savedCount})`, icon: Bookmark },
              { id: 'completed', label: `Completed (${completedCount})`, icon: BadgeCheck },
              { id: 'notes', label: `My Notes (${notesCount})`, icon: ScrollText }
            ].map(tab => {
              const Icon = tab.icon;
              const active = lSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLSubTab(tab.id)}
                  style={{
                    ...btnSm(active ? C.blueDim : 'transparent', {
                      color: active ? C.blueL : C.t2,
                      border: active ? `1px solid ${C.blue}30` : '1px solid transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8
                    })
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {notesCount > 0 && (
            <button
              onClick={exportAllNotes}
              style={{
                ...btnSm(C.violetDim, {
                  color: C.violetL,
                  borderColor: `${C.violet}40`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8
                })
              }}
              title="Download all your custom notes as a beautifully formatted Markdown file"
            >
              <FileDown size={14} />
              Export Notes (.md)
            </button>
          )}
        </div>

        {/* Row 1 Filter: Search and Category */}
        <div style={R({flexWrap:'wrap',gap:10})}>
          <div style={{flex:1,minWidth:200,position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.t3,display:'flex',pointerEvents:'none'}}><Search size={14}/></span>
            <input style={inp({paddingLeft:36})} placeholder="Search videos, books, courses…" value={lSrch} onChange={e=>setLS(e.target.value)}/>
          </div>
          <select style={inp({width:'auto'})} value={lCat} onChange={e=>setLC(e.target.value)}>{LIB_CATS.map(c=><option key={c}>{c}</option>)}</select>
        </div>

        {/* Row 2 Filter: Resource Type, Cost, Sort Order */}
        <div style={R({flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', borderTop: `1px solid ${C.b0}`, paddingTop: 10})}>
          <div style={R({flexWrap: 'wrap', gap: 8})}>
            {/* Type filter */}
            <select style={inp({width: 'auto', padding: '6px 12px', fontSize: 11})} value={lType} onChange={e => setLType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="YouTube">YouTube Videos</option>
              <option value="Article">Articles & Guides</option>
              <option value="Book">Books</option>
              <option value="Course">Courses</option>
              <option value="App">Apps & Tools</option>
              <option value="Podcast">Podcasts</option>
              <option value="Community">Communities</option>
            </select>

            {/* Prep Level / Difficulty filter */}
            <select style={inp({width: 'auto', padding: '6px 12px', fontSize: 11})} value={lDiff} onChange={e => setLDiff(e.target.value)}>
              <option value="All">All Prep Levels</option>
              <option value="Introductory">Introductory</option>
              <option value="AP / Intermediate">AP / Intermediate</option>
              <option value="Undergrad / Advanced">Undergrad / Advanced</option>
            </select>

            {/* Cost filter */}
            <select style={inp({width: 'auto', padding: '6px 12px', fontSize: 11})} value={lFreeOnly ? 'free' : 'all'} onChange={e => setLFreeOnly(e.target.value === 'free')}>
              <option value="all">All Budgets</option>
              <option value="free">Free Resources Only</option>
            </select>

            {/* Sort order */}
            <select style={inp({width: 'auto', padding: '6px 12px', fontSize: 11})} value={lSort} onChange={e => setLSort(e.target.value)}>
              <option value="default">Sort: Recommended</option>
              <option value="alpha">Sort: Alphabetical (A-Z)</option>
              <option value="alpha-desc">Sort: Alphabetical (Z-A)</option>
            </select>
          </div>

          {(lSrch || lCat !== 'All' || lType !== 'All' || lDiff !== 'All' || lFreeOnly || lSort !== 'default' || lSubTab !== 'all') && (
            <button
              onClick={() => {
                setLS('');
                setLC('All');
                setLType('All');
                setLDiff('All');
                setLFreeOnly(false);
                setLSort('default');
                setLSubTab('all');
              }}
              style={btnSm('transparent', {color: C.roseL, borderColor: `${C.rose}40`, fontSize: 11})}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Dynamic Coaching Tip Banner */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          key={lCat}
          style={{
            ...glass({
              padding: '14px 18px',
              background: `linear-gradient(135deg, ${C.blueDim}80, rgba(147, 51, 234, 0.04))`,
              border: `1px dashed rgba(45, 127, 255, 0.25)`
            }),
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `${C.blueDim}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1.5px solid rgba(45, 127, 255, 0.2)`
          }}>
            <Lightbulb size={16} color={C.blueL} />
          </div>
          <div>
            <div style={{fontSize: 10, fontWeight: 700, color: C.blueL, letterSpacing: '.06em', textTransform: 'uppercase'}}>Iatra Coaching Insight</div>
            <div style={{fontSize: 12, color: C.t2, lineHeight: 1.5, marginTop: 2}}>
              {
                lCat === 'Life Sciences' ? "In Life Sciences, focus on active recall. Rather than re-reading chapters, use our Flashcards workspace or sketch pathways from memory. Use BioMan Biology or HHMI for interactive visual reinforcement." :
                lCat === 'Physical Sciences' ? "In Physical Sciences, problem-solving is king. After reading about laws or formulas, work through practice problems from MIT OCW or watch walkthroughs by The Organic Chemistry Tutor." :
                lCat === 'Behavioral & Social Sciences' ? "Behavioral sciences connect biology to society. Many medical colleges seek candidates with deep cultural competence. Yale's Science of Well-Being is a fantastic, stress-busting primer." :
                lCat === 'Research Methods' ? "Clinical and basic science research is a major pre-med differentiator. Explore Science Journal for Kids or the NIH archive to learn how real scientific hypotheses are formulated and tested." :
                lCat === 'Test Prep' ? "Consistency beats cramming. Use Anki for spaced repetition and take advantage of official, free Khan Academy Digital SAT/ACT materials. Tackling 10-15 questions daily yields huge score gains!" :
                lCat === 'Admissions & Planning' ? "Medical school admissions committee members look for holistic preparation. Study the AAMC Core Competencies to see how your extracurriculars, clinical hours, and volunteering align with entering student expectations." :
                "Welcome to your resource library! High-achieving pre-health students build strong habits early. Try bookmarking 3-4 key resources and setting a personal weekly goal to study at least one."
              }
            </div>
          </div>
        </motion.div>

        {/* Video Resources Section */}
        {yt.length>0&&<div>
          <SL>Video Resources ({yt.length})</SL>
          <div style={G(2,14,{},isMobile)}>
            {yt.map((r,i)=>{
              const hasNotes = !!user?.resourceNotes?.[r.title];
              return (
              <motion.div key={i} whileHover={{y:-2,boxShadow:'0 12px 40px rgba(0,0,0,0.6)'}} style={glass({padding:0,overflow:'hidden',position:'relative'})}>
                {/* Floating Bookmark Star Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(r.title); }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 10,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(4,6,11,0.7)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: user?.bookmarks?.includes(r.title) ? C.amberL : '#fff',
                    transition: 'all 0.15s'
                  }}
                  title={user?.bookmarks?.includes(r.title) ? "Unsave resource" : "Save resource"}
                >
                  <Star size={14} fill={user?.bookmarks?.includes(r.title) ? "currentColor" : "none"} />
                </button>

                <div style={{position:'relative',paddingBottom:'52%',background:C.s2,overflow:'hidden',cursor:'pointer'}} onClick={()=>setVM({ytId:r.ytId,title:r.title,url:r.url})}>
                  <img src={`https://img.youtube.com/vi/${r.ytId}/mqdefault.jpg`} alt={r.title} loading="lazy" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover',transition:'transform .4s'}} onError={e=>{e.target.style.display='none';}} onMouseEnter={e=>e.target.style.transform='scale(1.05)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(4,6,11,0.85) 0%,transparent 55%)'}}/>
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <motion.div whileHover={{scale:1.12,background:'rgba(255,255,255,0.22)'}} style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid rgba(255,255,255,0.25)'}}><Play size={20} color="white" fill="white"/></motion.div>
                  </div>
                  <span style={pill('rgba(239,68,68,0.85)','white',{position:'absolute',top:10,right:10,fontSize:10,borderRadius:5})}>YouTube</span>
                </div>
                <div style={{padding:'14px 18px'}}>
                  <div style={R({gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5})}>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1,lineHeight:1.4,fontFamily:C.FD}}>{r.title}</div>
                    {hasNotes && <span style={pill(C.violetDim, C.violetL, {fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3})}><ScrollText size={10}/>Has Notes</span>}
                  </div>
                  <div style={{fontSize:11,color:C.t3,lineHeight:1.55,marginBottom:12}}>{r.desc}</div>
                  <div style={R({justifyContent:'space-between', flexWrap: 'wrap', gap: 8})}>
                    <div style={R({gap:6})}>
                      <span style={pill(C.blueDim,C.blueL,{fontSize:10})}>{r.cat}</span>
                      <span style={pill('rgba(255,255,255,0.06)',C.t3,{fontSize:10})}>{r.difficulty}</span>
                    </div>
                    <div style={R({gap:8})}>
                      {/* Studied checkbox / check pill */}
                      <button
                        onClick={() => toggleStudied(r.title)}
                        style={{
                          ...btnSm(user?.studied?.includes(r.title) ? `${C.green}18` : 'transparent', {
                            color: user?.studied?.includes(r.title) ? C.greenL : C.t3,
                            borderColor: user?.studied?.includes(r.title) ? `${C.green}40` : `${C.b2}`,
                            fontSize: 10,
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          })
                        }}
                      >
                        <BadgeCheck size={11} fill={user?.studied?.includes(r.title) ? "currentColor" : "none"} />
                        {user?.studied?.includes(r.title) ? 'Studied' : 'Mark Studied'}
                      </button>

                      {/* Notes Toggle Button */}
                      <button
                        onClick={() => setOpenNotes(prev => ({ ...prev, [r.title]: !prev[r.title] }))}
                        style={{
                          ...btnSm(openNotes[r.title] ? C.violetDim : 'transparent', {
                            color: openNotes[r.title] ? C.violetL : C.t3,
                            borderColor: openNotes[r.title] ? `${C.violet}40` : `${C.b2}`,
                            fontSize: 10,
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          })
                        }}
                      >
                        <ScrollText size={11} />
                        {openNotes[r.title] ? 'Hide Notes' : 'Notes'}
                      </button>

                      <button style={{...btnSm('rgba(239,68,68,0.15)',{color:'#f87171',border:'1px solid rgba(239,68,68,0.3)',fontSize:11}),display:'inline-flex',alignItems:'center',gap:5}} onClick={()=>setVM({ytId:r.ytId,title:r.title,url:r.url})}><Play size={11} fill="currentColor"/>Watch</button>
                    </div>
                  </div>
                  {openNotes[r.title] && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px dashed ${C.b1}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={lbl({marginBottom:0})}>My Personal Study Notes</div>
                      <textarea
                        style={inp({
                          minHeight: 80,
                          resize: 'vertical',
                          fontSize: 12,
                          lineHeight: 1.5,
                          background: 'rgba(255,255,255,0.02)',
                          fontFamily: C.FB
                        })}
                        placeholder="Write your key takeaways, formulas, or concepts from this resource here..."
                        value={user?.resourceNotes?.[r.title] || ''}
                        onChange={e => {
                          const notesVal = e.target.value;
                          const nextNotes = { ...(user.resourceNotes || {}), [r.title]: notesVal };
                          saveUser({ ...user, resourceNotes: nextNotes });
                        }}
                      />
                      <div style={{fontSize: 10, color: C.t3, textAlign: 'right'}}>Auto-saved to your study profile</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )})}
          </div>
        </div>}

        {/* Text/Interactive Resources Section */}
        {reg.length>0&&<div>
          {yt.length>0&&<SL>Articles, Books & Courses ({reg.length})</SL>}
          <div style={G(2,12,{},isMobile)}>
            {reg.map((r,i)=>{
              const col=tc[r.type]||C.t2;
              const isSaved = user?.bookmarks?.includes(r.title);
              const isStudied = user?.studied?.includes(r.title);
              const hasNotes = !!user?.resourceNotes?.[r.title];
              return(
                <motion.div key={i} whileHover={{y:-1,borderColor:`${col}30`}} style={glass({padding:18,transition:'border-color .15s',position:'relative'})}>
                  <div style={R({justifyContent:'space-between',marginBottom:12})}>
                    <span style={pill(`${col}18`,col,{fontSize:10})}>{r.type}</span>
                    <div style={R({gap:6})}>
                      {r.free?<span style={pill(C.greenDim,C.greenL,{fontSize:10})}>FREE</span>:<span style={pill(C.amberDim,C.amberL,{fontSize:10})}>Paid</span>}
                      <span style={{fontSize:10,color:C.t3}}>{r.cat}</span>
                      <span style={pill('rgba(255,255,255,0.06)',C.t3,{fontSize:10})}>{r.difficulty}</span>

                      {/* Floating save bookmark */}
                      <button
                        onClick={() => toggleBookmark(r.title)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 2,
                          cursor: 'pointer',
                          color: isSaved ? C.amberL : C.t3,
                          transition: 'color 0.15s',
                          marginLeft: 4,
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={isSaved ? "Unsave resource" : "Save resource"}
                      >
                        <Star size={14} fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                  <div style={R({gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6})}>
                    <div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{r.title}</div>
                    {hasNotes && <span style={pill(C.violetDim, C.violetL, {fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3})}><ScrollText size={10}/>Has Notes</span>}
                  </div>
                  <div style={{fontSize:12,color:C.t2,lineHeight:1.65,marginBottom:14}}>{r.desc}</div>
                  <div style={R({justifyContent:'space-between', flexWrap: 'wrap', gap: 8})}>
                    <a href={r.url} target="_blank" rel="noreferrer" style={{...btnSm(C.blueDim,{color:C.blueL,border:`1px solid ${C.blue}30`,textDecoration:'none',fontSize:11}),display:'inline-flex',alignItems:'center',gap:5}}>Open<ExternalLink size={11}/></a>

                    <div style={R({gap:8})}>
                      {/* Studied checkbox / check pill */}
                      <button
                        onClick={() => toggleStudied(r.title)}
                        style={{
                          ...btnSm(isStudied ? `${C.green}18` : 'transparent', {
                            color: isStudied ? C.greenL : C.t3,
                            borderColor: isStudied ? `${C.green}40` : `${C.b2}`,
                            fontSize: 10,
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          })
                        }}
                      >
                        <BadgeCheck size={11} fill={isStudied ? "currentColor" : "none"} />
                        {isStudied ? 'Studied' : 'Mark Studied'}
                      </button>

                      {/* Notes Toggle Button */}
                      <button
                        onClick={() => setOpenNotes(prev => ({ ...prev, [r.title]: !prev[r.title] }))}
                        style={{
                          ...btnSm(openNotes[r.title] ? C.violetDim : 'transparent', {
                            color: openNotes[r.title] ? C.violetL : C.t3,
                            borderColor: openNotes[r.title] ? `${C.violet}40` : `${C.b2}`,
                            fontSize: 10,
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          })
                        }}
                      >
                        <ScrollText size={11} />
                        {openNotes[r.title] ? 'Hide Notes' : 'Notes'}
                      </button>
                    </div>
                  </div>
                  {openNotes[r.title] && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px dashed ${C.b1}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={lbl({marginBottom:0})}>My Personal Study Notes</div>
                      <textarea
                        style={inp({
                          minHeight: 80,
                          resize: 'vertical',
                          fontSize: 12,
                          lineHeight: 1.5,
                          background: 'rgba(255,255,255,0.02)',
                          fontFamily: C.FB
                        })}
                        placeholder="Write your key takeaways, formulas, or concepts from this resource here..."
                        value={user?.resourceNotes?.[r.title] || ''}
                        onChange={e => {
                          const notesVal = e.target.value;
                          const nextNotes = { ...(user.resourceNotes || {}), [r.title]: notesVal };
                          saveUser({ ...user, resourceNotes: nextNotes });
                        }}
                      />
                      <div style={{fontSize: 10, color: C.t3, textAlign: 'right'}}>Auto-saved to your study profile</div>
                    </div>
                  )}
                </motion.div>
              );})}
          </div>
        </div>}
        {fLib.length===0&& (
          lSubTab === 'notes' ? (
            <EmptyState
              icon={ScrollText}
              accent={C.violet}
              title="No Study Notes Yet"
              body="You haven't written any custom study notes. Click 'Notes' on any resource card to write key formulas, concepts, or takeaways!"
              actionLabel="Browse All Resources"
              onAction={() => setLSubTab('all')}
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              accent={accent}
              title="No resources match"
              body="Try a different search term or category filter."
              actionLabel="Clear Filters"
              onAction={()=>{setLS('');setLC('All');setLType('All');setLDiff('All');setLFreeOnly(false);setLSort('default');setLSubTab('all');}}
            />
          )
        )}
      </div>
    );
  }
  // ── PORTFOLIO ─────────────────────────────────────────────────────────────────
  function tPort(){
    const annualH=a=>(parseFloat(a.hours_per_week)||0)*(parseFloat(a.weeks_per_year)||0);
    const totH=Math.round(portActivities.reduce((s,a)=>s+annualH(a),0));
    const leadH=Math.round(portActivities.filter(a=>a.activity_type==='Leadership').reduce((s,a)=>s+annualH(a),0));
    const resH=Math.round(portActivities.filter(a=>a.activity_type==='Research').reduce((s,a)=>s+annualH(a),0));
    const volH=Math.round(portActivities.filter(a=>a.activity_type==='Volunteering').reduce((s,a)=>s+annualH(a),0));
    const actColors={'Clinical/Shadowing':accent,'Patient Care (paid)':C.rose,'Health Club/HOSA':C.cyan,Leadership:C.blue,Volunteering:C.violet,Research:C.amber,Athletics:C.green,'Arts & Performance':C.cyan,'Work Experience':C.rose,'Clubs & Organizations':C.orange,Other:C.t3};
    const latestGpa=portGpa.length?portGpa[portGpa.length-1].gpa:null;
    const ongoingCount=portActivities.filter(a=>a.status==='ongoing').length;
    const PIcon=PATH_ICONS[eSpec]||Compass;
    const benchmarks=curPath?.benchmarks||{};
    const strength=computeApplicationStrength({
      mastery, avgQuizScore:avgSc, clinicalHours:clinicalHoursTotal, volunteerHours:volH, leadershipHours:leadH,
      recommendersConfirmed:recommendersCount, collegeCount:appCounts.colleges, essayCount:appCounts.essays, benchmarks,
    });
    const strengthColor=strength.score>=80?C.green:strength.score>=60?C.blue:strength.score>=35?C.amber:C.rose;

    return(
      <div style={CC({gap:22})}>
        <div data-tour="portfolio-deep-overview" style={R()}>
          <div><div style={lbl()}>Portfolio</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Application Overview</h2></div>
          <div style={{marginLeft:'auto',...R({gap:8})}}>
            <span style={pill(C.blueDim,C.blueL)}>{portActivities.length} activities</span>
            <span style={pill(C.amberDim,C.amberL)}>{portAwards.length} awards</span>
          </div>
        </div>

        {/* Application-strength readiness gauge — one score synthesizing academics, clinical exposure, application progress, and activities */}
        <div style={{...glass({padding:20}),display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',background:`linear-gradient(135deg,${strengthColor}12,transparent)`,border:`1px solid ${strengthColor}30`}}>
          <Arc pct={strength.score} size={72} stroke={6} color={strengthColor} label={`${strength.score}`} sub="/100"/>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase'}}>Application Strength</div>
            <div style={{fontSize:18,fontWeight:800,color:strengthColor,fontFamily:C.FD,marginTop:2}}>{strength.label}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:4}}>Blends pathway mastery, clinical exposure, recommenders/essays/colleges, and activity hours — updates as you fill in Portfolio.</div>
          </div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {Object.entries(strength.subscores).map(([k,v])=>(
              <div key={k} style={{textAlign:'center',minWidth:64}}>
                <div style={{fontSize:16,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{v}%</div>
                <div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.04em',marginTop:2}}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-app snapshot — pulls every feature area into one view so Portfolio reads as the hub, not just a resume tracker */}
        <div style={glass({padding:18})}>
          <SL extra={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><PIcon size={12}/>{curPath.label} · Level {lvl} {levelInfo.tier}</SL>
          <div style={G(4,10,{},isMobile)}>
            <div onClick={()=>goPrep('quizzes')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Layers size={13} color={C.green}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Quizzes</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{qTaken}<span style={{fontSize:11,color:C.t3,fontWeight:600}}>/{ALL_QUIZZES.length}</span></div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{mastery}% pathway mastery</div>
            </div>
            <div onClick={()=>goPrep('flashcards')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Layers3 size={13} color={C.violet}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Flashcards</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{totalReviews}<span style={{fontSize:11,color:C.t3,fontWeight:600}}> reviews</span></div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{dueCardsSub(dueCards)}</div>
            </div>
            <div onClick={()=>goPortfolio('interview')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Mic size={13} color={C.cyan}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Interview Prep</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{interviewCount}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>mock sessions practiced</div>
            </div>
            <div onClick={()=>goPrep('coach')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><MessageCircle size={13} color={C.blue}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>AI Coach</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{aiChatCount}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>chats with Iatra</div>
            </div>
            <div onClick={()=>goPortfolio('colleges')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Building2 size={13} color={C.amber}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>College List</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{appCounts.colleges}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>schools tracked</div>
            </div>
            <div onClick={()=>goPortfolio('essays')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><ScrollText size={13} color={C.orange}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Essays</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{appCounts.essays}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>drafts in progress</div>
            </div>
            <div onClick={()=>goPortfolio('deadlines')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><CalendarDays size={13} color={C.rose}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Deadlines</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{(upcomingDeadlines||[]).length}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>upcoming</div>
            </div>
            <div onClick={()=>goPortfolio('clinical')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Stethoscope size={13} color={accent}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Clinical Hours</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{clinicalHoursTotal}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>hours logged</div>
            </div>
            <div onClick={()=>goPortfolio('recommenders')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><UserCheck size={13} color={C.violetL}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Recommenders</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{recommendersCount}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>tracked</div>
            </div>
            <div onClick={()=>setTab('progress')} style={{...glass2({padding:14,cursor:'pointer'})}}>
              <div style={R({gap:6,marginBottom:6})}><Trophy size={13} color={C.amberL}/><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Achievements</span></div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:C.FM,color:C.t1}}>{achiev.size}<span style={{fontSize:11,color:C.t3,fontWeight:600}}>/{Object.keys(ACHIEVEMENTS).length}</span></div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{streak}-day streak</div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div style={G(5,14,{},isMobile)}>
          <Stat label="Est. Annual Hours" value={totH} icon={<Clock size={16}/>} color={accent} m={isMobile}/>
          <Stat label="Leadership" value={leadH} icon={<Building2 size={16}/>} color={C.blue} sub={`Rec: ${benchmarks.leadershipHours||100}+`} m={isMobile}/>
          <Stat label="Research" value={resH} icon={<FlaskConical size={16}/>} color={C.amber} sub="Rec: 100+" m={isMobile}/>
          <Stat label="Volunteer" value={volH} icon={<Handshake size={16}/>} color={C.violet} sub={`Rec: ${benchmarks.volunteerHours||150}+`} m={isMobile}/>
          <Stat label="Current GPA" value={latestGpa!==null?latestGpa:'—'} icon={<TrendingUp size={16}/>} color={C.green} sub={ongoingCount?`${ongoingCount} ongoing activities`:'No GPA logged yet'} m={isMobile}/>
        </div>

        {/* Progress bars toward recommended hours — parameterized off the active pathway's benchmarks */}
        <div style={glass({padding:18})}>
          <SL>Progress Toward {curPath?.label} Benchmarks</SL>
          {[
            {l:'Clinical / Shadowing Hours',val:clinicalHoursTotal,target:(benchmarks.clinicalHours||60)+(benchmarks.shadowingHours||20),col:accent},
            {l:'Leadership Hours',val:leadH,target:benchmarks.leadershipHours||100,col:C.blue},
            {l:'Research / Independent Project Hours',val:resH,target:100,col:C.amber},
            {l:'Volunteer Hours',val:volH,target:benchmarks.volunteerHours||150,col:C.violet},
          ].map(({l,val,target,col})=>(
            <div key={l} style={{marginBottom:14}}>
              <div style={R({justifyContent:'space-between',marginBottom:6})}>
                <span style={{fontSize:12,color:C.t2,fontFamily:C.FB}}>{l}</span>
                <span style={{fontSize:11,fontFamily:C.FM,color:val>=target?C.green:C.t3,display:'inline-flex',alignItems:'center',gap:4}}>{val} / {target}{val>=target&&<Check size={11}/>}</span>
              </div>
              <Bar pct={Math.min((val/target)*100,100)} color={val>=target?C.green:col} h={6} glow={val>=target}/>
            </div>
          ))}
        </div>

        {/* Quick links to the rest of the application system */}
        <div style={G(4,10,{},isMobile)}>
          {[
            {label:'Resume Builder',sub:'Full activity, awards & GPA editor',pillar:'portfolio',view:'resume',icon:Award,col:C.violet},
            {label:'Clinical Hours',sub:'Log shadowing & clinical time',pillar:'portfolio',view:'clinical',icon:Stethoscope,col:accent},
            {label:'Recommenders',sub:'Track letters of recommendation',pillar:'portfolio',view:'recommenders',icon:UserCheck,col:C.violetL},
            {label:'Timeline',sub:'Everything, chronologically',pillar:'portfolio',view:'timeline',icon:Milestone,col:C.roseL},
            {label:'Test Scores',sub:'SAT/ACT history & trend',pillar:'portfolio',view:'scores',icon:TrendingUp,col:C.green},
            {label:'Financial Aid',sub:'Scholarships & FAFSA/CSS tracking',pillar:'portfolio',view:'aid',icon:Handshake,col:C.cyan},
            {label:'Study Pathway',sub:'Your track, units & lessons',pillar:'prep',view:'pathway',icon:Route,col:C.blue},
            {label:'E-Library',sub:'Curated readings & videos',pillar:'prep',view:'library',icon:BookOpen,col:C.orange},
          ].map(l=>(
            <motion.div key={l.view} whileHover={{y:-2,borderColor:`${l.col}35`}} onClick={()=>l.pillar==='prep'?goPrep(l.view):goPortfolio(l.view)} style={{...glass2({padding:16,cursor:'pointer',transition:'border-color .15s'})}}>
              <l.icon size={16} color={l.col}/>
              <div style={{fontSize:12.5,fontWeight:700,color:C.t1,fontFamily:C.FD,marginTop:8}}>{l.label}</div>
              <div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{l.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Activity list */}
        {portActivities.length>0&&<div style={CC({gap:8})}>
          <SL>My Activities ({portActivities.length})</SL>
          <AnimatePresence>
            {portActivities.map((act)=>{const col=actColors[act.activity_type]||C.blue;return(
              <motion.div key={act.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} style={{...glass2({display:'flex',alignItems:'center',gap:14,padding:'14px 18px'})}}>
                <div style={{width:4,height:44,borderRadius:2,background:`linear-gradient(180deg,${col},${col}60)`,flexShrink:0,boxShadow:`0 0 8px ${col}40`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{act.position}{act.organization?` · ${act.organization}`:''}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2,fontFamily:C.FM}}>{act.activity_type} · {Math.round(annualH(act))}h/yr · {act.status}</div>
                </div>
              </motion.div>
            );})}
          </AnimatePresence>
          <div style={{fontSize:11,color:C.t4}}>Edit or remove individual activities in the Resume Builder.</div>
        </div>}

        {/* Opportunities */}
        <div>
          <div style={R({marginBottom:16})}>
            <SL extra={{margin:0}}>Opportunities & Competitions</SL>
            <select style={{...inp({width:'auto',marginLeft:'auto'})}} value={cF} onChange={e=>setCF(e.target.value)}>
              {['All','Competition','Research','Scholarship','Volunteering','Organization','Academic','National','State'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={G(2,12,{},isMobile)}>
            {fComp.map((c,i)=>{const ec={Elite:C.rose,Competitive:C.amber,Open:C.green}[c.effort]||C.t2;return(
              <motion.div key={i} whileHover={{borderColor:`${ec}30`,y:-1}} style={glass({padding:18,transition:'border-color .15s'})}>
                <div style={R({marginBottom:10})}>
                  <span style={pill(`${ec}18`,ec,{fontSize:10})}>{c.effort}</span>
                  <span style={{marginLeft:'auto',fontSize:10,color:C.t3}}>{c.type} · {c.level}</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD,marginBottom:5}}>{c.name}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.6,marginBottom:12}}>{c.desc}</div>
                <button style={{...btnSm(C.blueDim,{color:C.blueL,border:`1px solid ${C.blue}25`,fontSize:11}),display:'inline-flex',alignItems:'center',gap:5}} onClick={async()=>{await addPortActivity({type:c.type,name:c.name,desc:c.desc});toast.success(`Added: ${c.name.slice(0,30)}`);}}><Plus size={12}/>Add to Portfolio</button>
              </motion.div>
            );})}
          </div>
        </div>
      </div>
    );
  }

  // ── ADMISSIONS CALC ───────────────────────────────────────────────────────────
  function tCalc(){
    return(
      <div style={CC({gap:22})}>
        <div data-tour="portfolio-deep-calc" style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 })}>
          <div>
            <div style={lbl()}>Admissions Calculator</div>
            <h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Personalized College List & Match Index</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={syncWithPortfolio}
            style={{ ...btn(`linear-gradient(135deg, ${C.amber}, ${C.orange})`, { fontSize: 12.5 }), display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 14px ${C.orange}35` }}
          >
            <Sparkles size={14}/> Sync with Portfolio
          </motion.button>
        </div>

        {/* Profile Card */}
        <div style={glass()}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 16 })}>
            <SL extra={{ margin: 0 }}>Your Academic & Pre-Health Profile</SL>
            <span style={pill(C.blueDim, C.blueL, { fontSize: 10 })}>Calculates dynamic admission index</span>
          </div>
          <div style={G(2,14,{},isMobile)}>
            {[
              {l:'Cumulative GPA',p:'3.75',t:'number',step:'0.01',min:'2',max:'4',v:cGPA,s:setCGPA},
              {l:'SAT Score (or ACT converted)',p:'1350',t:'number',min:'400',max:'1600',v:cSAT,s:setCSAT},
              {l:'Science Course Rigor (AP/IB)',p:'2',t:'number',min:'0',v:cRigor,s:setCRigor},
              {l:'Leadership Experience (years)',p:'1',t:'number',min:'0',v:cLead,s:setCLead},
              {l:'Extracurricular Hours',p:'200',t:'number',min:'0',v:cEC,s:setCEC},
              {l:'Volunteer Hours',p:'100',t:'number',min:'0',v:cVol,s:setCV},
            ].map(f=>(
              <div key={f.l} style={CC({gap:4})}>
                <span style={lbl()}>{f.l}</span>
                <input type={f.t} step={f.step} min={f.min} max={f.max} maxLength={f.maxLength} style={inp()} placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)}/>
              </div>
            ))}
            <div style={CC({gap:4})}>
              <span style={lbl()}>Home State (optional)</span>
              <select style={inp()} value={cSt} onChange={e=>setCST(e.target.value)}>
                <option value="">— Not sure / prefer not to say —</option>
                {US_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div style={CC({gap:4})}>
              <span style={lbl()}>Logged Clinical Hours (View Only)</span>
              <div style={inp({ background: 'rgba(255,255,255,0.02)', color: C.t3, border: `1px dashed ${C.b1}`, display: 'flex', alignItems: 'center' })}>
                {clinicalHoursTotal} hrs total
              </div>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        {calculatedStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={glass({ background: `linear-gradient(135deg, ${C.s1}, ${C.s0})`, border: `1px solid ${C.b2}`, padding: 22 })}>
            <SL>Personalized Admissions Insights</SL>
            <div style={G(3, 14, { marginBottom: 14 }, isMobile)}>
              <div style={glass2({ textAlign: 'center', background: 'rgba(255,255,255,0.015)' })}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.blueL, fontFamily: C.FM }}>{calculatedStats.avgAcademic}%</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Academic Match Index</div>
              </div>
              <div style={glass2({ textAlign: 'center', background: 'rgba(255,255,255,0.015)' })}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.greenL, fontFamily: C.FM }}>{calculatedStats.avgExperience}%</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Experience Fit Index</div>
              </div>
              <div style={glass2({ textAlign: 'center', background: 'rgba(255,255,255,0.015)' })}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.amberL, fontFamily: C.FM }}>{curPath?.label ? curPath.label.split(' ')[0] : 'Pre-Health'}</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Matching Pathway</div>
              </div>
            </div>
            <div style={R({ gap: 10, alignItems: 'flex-start' })}>
              <Brain size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }}/>
              <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{calculatedStats.pathwayAdvice}</span>
            </div>
          </motion.div>
        )}

        {/* Filters and Sorting Panel */}
        {hasCalc && (
          <div style={glass({ padding: 18 })}>
            <SL>Advanced Matching Filters & Sorting</SL>
            <div style={G(isMobile ? 2 : 3, 12, { marginBottom: 14 }, false)}>
              <div>
                <span style={lbl()}>Geographic Region</span>
                <select style={inp()} value={selRegion} onChange={e=>setSelRegion(e.target.value)}>
                  <option value="All">All Regions</option>
                  <option value="Northeast">Northeast</option>
                  <option value="South">South</option>
                  <option value="Midwest">Midwest</option>
                  <option value="West">West</option>
                </select>
              </div>
              <div>
                <span style={lbl()}>Direct BS/MD Path</span>
                <select style={inp()} value={selBsmd} onChange={e=>setSelBsmd(e.target.value)}>
                  <option value="All">Show All Schools</option>
                  <option value="Yes">Offers BS/MD Direct</option>
                  <option value="No">No BS/MD Direct</option>
                </select>
              </div>
              <div>
                <span style={lbl()}>Pre-Med Committee Advisory</span>
                <select style={inp()} value={selCommittee} onChange={e=>setSelCommittee(e.target.value)}>
                  <option value="All">Show All Schools</option>
                  <option value="Yes">Has Pre-Med Committee</option>
                  <option value="No">No Pre-Med Committee</option>
                </select>
              </div>
              <div>
                <span style={lbl()}>Clinical Proximity</span>
                <select style={inp()} value={selClinicalProx} onChange={e=>setSelClinicalProx(e.target.value)}>
                  <option value="All">Show All Proximities</option>
                  <option value="Excellent">Excellent Access</option>
                  <option value="Good">Good Access</option>
                  <option value="Fair">Fair Access</option>
                </select>
              </div>
              <div>
                <span style={lbl()}>State Location</span>
                <select style={inp()} value={selStateFilter} onChange={e=>setSelStateFilter(e.target.value)}>
                  <option value="All">All States</option>
                  {distinctStates.map(stCode => (
                    <option key={stCode} value={stCode}>{stCode}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={lbl()}>School Type</span>
                <select style={inp()} value={sType} onChange={e=>setST(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="Public">Public Universities</option>
                  <option value="Private">Private Universities</option>
                </select>
              </div>
            </div>
            <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 })}>
              <div style={R({ gap: 6 })}>
                <span style={{ fontSize: 11, color: C.t3 }}>Sort by:</span>
                {[['score', 'Match Score'], ['accept', 'Acceptance Rate'], ['name', 'Alphabetical']].map(([key, label]) => (
                  <button key={key} style={btnSm(calcSort===key ? C.blueGrad : C.s4, { fontSize: 11 })} onClick={()=>setCalcSort(key)}>{label}</button>
                ))}
              </div>
              <button style={btnG({ fontSize: 11, padding: '5px 12px' })} onClick={()=>{setST('All');setSelRegion('All');setSelBsmd('All');setSelCommittee('All');setSelClinicalProx('All');setSelStateFilter('All');setCalcSort('score');}}>Reset Filters</button>
            </div>
          </div>
        )}

        {/* Add a custom school not in the built-in list */}
        <div style={glass({padding:18})}>
          <div style={R({justifyContent:'space-between'})}>
            <SL extra={{marginBottom:showAddSchool?14:0}}>Don't see a school you're considering?</SL>
            <button style={{...btnG({fontSize:12,padding:'7px 14px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>setShowAddSchool(v=>!v)}><Plus size={13}/>{showAddSchool?'Cancel':'Add a school not listed'}</button>
          </div>
          {showAddSchool&&<div style={CC({gap:12})}>
            <div style={G(2,12,{},isMobile)}>
              <div style={CC({gap:4})}><span style={lbl()}>School Name</span><input style={inp()} placeholder="e.g. My State University" value={csName} onChange={e=>setCsName(e.target.value)}/></div>
              <div style={CC({gap:4})}><span style={lbl()}>Type</span>
                <select style={inp()} value={csType} onChange={e=>setCsType(e.target.value)}><option>Public</option><option>Private</option></select>
              </div>
              <div style={CC({gap:4})}><span style={lbl()}>Avg. Admitted GPA (optional)</span><input type="number" step="0.01" style={inp()} placeholder="3.5" value={csGPA} onChange={e=>setCsGPA(e.target.value)}/></div>
              <div style={CC({gap:4})}><span style={lbl()}>Avg. Admitted SAT (optional)</span><input type="number" style={inp()} placeholder="1200" value={csSAT} onChange={e=>setCsSAT(e.target.value)}/></div>
              <div style={CC({gap:4})}><span style={lbl()}>Acceptance Rate % (optional)</span><input type="number" style={inp()} placeholder="50" value={csAccept} onChange={e=>setCsAccept(e.target.value)}/></div>
              <div style={CC({gap:4})}><span style={lbl()}>State (optional)</span>
                <select style={inp()} value={csState} onChange={e=>setCsState(e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <button style={{...btn(C.blueGrad,{fontSize:12,alignSelf:'flex-start'})}} onClick={addCustomSchool}>Add to My List</button>
          </div>}
          {customSchools.length>0&&<div style={{marginTop:14,...R({gap:6,flexWrap:'wrap'})}}>
            {customSchools.map((s,i)=><span key={i} style={pill(C.violetDim,C.violetL,{fontSize:11})}>{s.name}</span>)}
          </div>}
        </div>

        {!hasCalc&&<div style={{textAlign:'center',color:C.t3,padding:60,fontSize:14}}>Enter your GPA and SAT score above to see your personalized college list.</div>}

        {/* Summary strip */}
        {calcR.length>0&&<div style={G(4,10,{},isMobile)}>
          {['Likely','Target','Reach','Stretch'].map(tier=>{const n=calcR.filter(s=>s.tier===tier).length;const col=tierC(tier);return<div key={tier} style={{...glass2({textAlign:'center',padding:14})}}>
            <div style={{fontSize:22,fontWeight:800,fontFamily:C.FM,color:col,marginBottom:3}}>{n}</div>
            <div style={{fontSize:11,color:C.t3,fontWeight:600}}>{tier}</div>
          </div>;})}
        </div>}

        {/* Export button */}
        {calcR.length>0&&<div style={R({gap:10})}>
          <button style={{...btnG({fontSize:12,padding:'9px 18px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>exportSchoolList(calcR,{gpa:cGPA,sat:cSAT})}><FileDown size={14}/>Export College List PDF</button>
        </div>}

        {/* School tiers */}
        {calcR.length>0&&['Likely','Target','Reach','Stretch'].map(tier=>{
          const schools=calcR.filter(s=>s.tier===tier);if(!schools.length)return null;
          const col=tierC(tier);
          return(
            <div key={tier}>
              <div style={R({marginBottom:12})}>
                <div style={{width:10,height:10,borderRadius:'50%',background:col,boxShadow:`0 0 8px ${col}70`}}/>
                <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:C.FD}}>{tier}</span>
                <span style={{fontSize:12,color:C.t3}}>({schools.length} schools matched)</span>
              </div>
              <div style={CC({gap:10})}>
                {schools.map((s,i)=>(
                  <motion.div key={i} initial={{opacity:0,x:-5}} animate={{opacity:1,x:0}} transition={{delay:i*.015}} whileHover={{ y: -2, borderColor: `${col}40` }} style={{...glass({padding:18, transition: 'all .15s'}), borderLeft:`4px solid ${col}`}}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={R({gap:8, flexWrap: 'wrap'})}>
                          <div style={{fontSize:15,fontWeight:800,color:C.t1,fontFamily:C.FD}}>{s.name}</div>
                          {s.bsmd && <span style={pill(C.violetDim, C.violetL, { fontSize: 9 })}>Direct BS/MD</span>}
                          {s.hasPreMedCommittee && <span style={pill(C.cyanDim, C.cyan, { fontSize: 9 })}>Pre-Med Comm.</span>}
                          <span style={pill(`${col}18`,col,{fontSize:10})}>{s.tier}</span>
                        </div>
                        <div style={{fontSize:11.5,color:C.t2,marginTop:6,fontFamily:C.FB}}>
                          GPA req: <strong style={{color:C.t1}}>{s.gpa}</strong> &nbsp;·&nbsp; SAT req: <strong style={{color:C.t1}}>{s.sat}</strong> &nbsp;·&nbsp; Acceptance: <strong style={{color:C.t1}}>{s.accept}%</strong> &nbsp;·&nbsp; {s.type} ({s.state}) &nbsp;·&nbsp; Region: <strong style={{color:C.t1}}>{s.region || 'N/A'}</strong>
                        </div>
                        {s.whyMatch && (
                          <div style={{...R({gap:6, alignItems: 'flex-start'}), marginTop:10, background: 'rgba(255,255,255,0.015)', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.b1}` }}>
                            <Brain size={12} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }}/>
                            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{s.whyMatch}</span>
                          </div>
                        )}
                        <div style={{...R({gap: 6, flexWrap: 'wrap'}), marginTop: 8}}>
                          <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>Pre-Health Advising: {s.preHealthRank || 3}/5</span>
                          <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>Clinical Proximity: {s.clinicalProximity || 'Good'}</span>
                          {s.specialtyStrong && <span style={pill(`${C.blue}12`, C.blueL, { fontSize: 9.5 })}>Strongest in: {s.specialtyStrong}</span>}
                        </div>
                      </div>
                      <div style={{ ...R({gap:12}), alignSelf: isMobile ? 'flex-end' : 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.blueL, fontFamily: C.FM }}>{s.academicIndex}%</div>
                          <div style={{ fontSize: 8, color: C.t3, textTransform: 'uppercase' }}>Academic</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.greenL, fontFamily: C.FM }}>{s.experienceIndex}%</div>
                          <div style={{ fontSize: 8, color: C.t3, textTransform: 'uppercase' }}>Experience</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  // ── ANALYTICS ─────────────────────────────────────────────────────────────────
  function tAnalytics(){
    void questTick; // re-render after claiming a quest (claim state lives in localStorage)
    const recentScores=qHistory.slice(-12);
    const weekKey=getIsoWeekKey();
    const weekStart=getStartOfWeek().getTime();
    const quizzesThisWeek=qHistory.filter(q=>q.completedAt>=weekStart).length;
    const quests=getWeeklyQuests({quizzesThisWeek,cardsThisWeek:weekCardReviews,coachOrInterviewThisWeek:getWeeklyCoachCount(weekKey)});
    const claimedQuests=getClaimedQuests(weekKey);
    function claimQuestReward(q){
      if(!q.done||claimedQuests.has(q.id))return;
      claimQuest(weekKey,q.id);
      // Quest XP stays deterministic and is granted immediately — only the
      // *reveal* is a variable, anticipation-building chest-open moment.
      const nu={...user,xp:(user?.xp||0)+q.xp};
      saveUser(nu);
      setQuestTick(t=>t+1);
      const wonCosmetic = Math.random()<0.25 ? rollCosmetic(cosmetics) : null;
      openChest({
        title: 'Quest Complete',
        eyebrow: q.label,
        xp: q.xp,
        cosmetic: wonCosmetic,
        onOpen: async ()=>{
          if(wonCosmetic){ await DB.unlockCosmetic(wonCosmetic.key); setCosmetics(prev=>new Set([...prev,wonCosmetic.key])); }
        },
      });
    }
    const catStats=cats3.map((cat,i)=>{
      const cQ=ALL_QUIZZES.filter(q=>q.cat===cat);
      const taken=cQ.filter(q=>qScores[q.id]!==undefined);
      const avg=taken.length?Math.round(taken.reduce((s,q)=>s+qScores[q.id],0)/taken.length):null;
      return{cat,avg,taken:taken.length,total:cQ.length,predicted:avg!==null?scoreToSection(avg):null};
    });

    // Chart configs
    const radarData={
      labels:cats3.map(c=>c.split('/')[0]),
      datasets:[{
        label:'Performance %',
        data:catStats.map(c=>c.avg||0),
        backgroundColor:'rgba(45,127,255,0.15)',
        borderColor:'rgba(45,127,255,0.8)',
        borderWidth:2,
        pointBackgroundColor:catStats.map(c=>scCol(c.avg||0)),
        pointBorderColor:'transparent',
        pointRadius:6,
      }]
    };
    const radarOpts={
      responsive:true,maintainAspectRatio:false,
      scales:{r:{min:0,max:100,ticks:{color:'rgba(255,255,255,0.3)',backdropColor:'transparent',stepSize:20},grid:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:C.t2,font:{size:12,family:C.FB}}}},
      plugins:{legend:{display:false},tooltip:{backgroundColor:C.s2,titleColor:C.t1,bodyColor:C.t2,borderColor:C.b2,borderWidth:1}},
    };

    const lineData={
      labels:recentScores.map((_,i)=>`Q${i+1}`),
      datasets:[{
        label:'Score %',
        data:recentScores.map(r=>r.score),
        borderColor:'rgba(45,127,255,0.9)',
        backgroundColor:'rgba(45,127,255,0.08)',
        borderWidth:2.5,
        pointBackgroundColor:recentScores.map(r=>scCol(r.score)),
        pointRadius:5,
        tension:0.4,fill:true,
      }]
    };
    const lineOpts={
      responsive:true,maintainAspectRatio:false,
      scales:{
        y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:C.t3,font:{size:11}}},
        x:{grid:{display:false},ticks:{color:C.t3,font:{size:11}}},
      },
      plugins:{legend:{display:false},tooltip:{backgroundColor:C.s2,titleColor:C.t1,bodyColor:C.t2,borderColor:C.b2,borderWidth:1}},
    };

    const doughnutData={
      labels:['Completed','Remaining'],
      datasets:[{data:[doneL,allL.length-doneL],backgroundColor:[accent,C.s4],borderWidth:0,hoverOffset:4}]
    };
    const doughnutOpts={responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{backgroundColor:C.s2,titleColor:C.t1,bodyColor:C.t2,borderColor:C.b2,borderWidth:1}}};

    const TierIcon=TIER_ICONS[levelInfo.tierIcon]||Sparkles;
    const annualH=a=>(parseFloat(a.hours_per_week)||0)*(parseFloat(a.weeks_per_year)||0);
    const leadH=Math.round(portActivities.filter(a=>a.activity_type==='Leadership').reduce((s,a)=>s+annualH(a),0));
    const volH=Math.round(portActivities.filter(a=>a.activity_type==='Volunteering').reduce((s,a)=>s+annualH(a),0));
    const benchmarks=curPath?.benchmarks||{};
    const strength=computeApplicationStrength({
      mastery, avgQuizScore:avgSc, clinicalHours:clinicalHoursTotal, volunteerHours:volH, leadershipHours:leadH,
      recommendersConfirmed:recommendersCount, collegeCount:appCounts.colleges, essayCount:appCounts.essays, benchmarks,
    });
    const strengthColor=strength.score>=80?C.green:strength.score>=60?C.blue:strength.score>=35?C.amber:C.rose;
    const insights=buildInsights({
      catStats, pathwayLabel:curPath?.label, mastery, clinicalHours:clinicalHoursTotal, benchmarks,
      recommendersCount, collegeCount:appCounts.colleges, essayCount:appCounts.essays, streak, dueCards,
    });
    const diagPath=user?.diagnosticResult?PATHS[user.diagnosticResult]:null;
    // Clinical hour trend — cumulative by month
    const hoursByMonth={};
    [...clinicalHoursEntries].sort((a,b)=>a.entryDate.localeCompare(b.entryDate)).forEach(e=>{
      const m=e.entryDate.slice(0,7);
      hoursByMonth[m]=(hoursByMonth[m]||0)+(e.hours||0);
    });
    const monthKeys=Object.keys(hoursByMonth).sort();
    let running=0;
    const clinicalTrendData={
      labels:monthKeys.map(m=>new Date(m+'-01').toLocaleDateString(undefined,{month:'short',year:'2-digit'})),
      datasets:[{
        label:'Cumulative Hours', data:monthKeys.map(m=>{running+=hoursByMonth[m];return running;}),
        borderColor:`${accent}e6`, backgroundColor:`${accent}14`, borderWidth:2.5, pointRadius:4, tension:0.3, fill:true,
      }],
    };

    // ── Verified Progress data (credibility view) ─────────────────────────────
    const unitMasteryList=(curPath?.units||[]).map(unit=>{
      const lessonStates=unit.lessons.map(l=>{
        const entry=pathway[l.id];
        const hasQuiz=l.quizIds?.length>0;
        let status='not_started';
        if(entry){
          if(hasQuiz) status=entry.verified?'verified':'studying';
          else status='legacy_done';
        }
        return{lesson:l,status,hasQuiz};
      });
      const anyQuizGated=lessonStates.some(l=>l.hasQuiz);
      const allVerified=lessonStates.every(l=>l.status==='verified'||l.status==='legacy_done');
      return{unit,lessonStates,anyQuizGated,allVerified};
    });
    const verifiedUnitCount=unitMasteryList.filter(u=>u.anyQuizGated&&u.allVerified).length;
    const quizGatedUnitCount=unitMasteryList.filter(u=>u.anyQuizGated).length;

    return(
      <div>
        <PageHeader icon={LineChart} color={accent} eyebrow="Progress" title="Your Progress"
          sub="Readiness, credibility, and performance across your pathway." m={isMobile}/>
        <div style={{marginTop:18}}>
          <SubNav items={PROGRESS_SUBNAV} active={progressView} onChange={setProgressView} accent={accent} m={isMobile} tourPrefix="progress-sub"/>
        </div>
        <div style={{...CC({gap:22}),marginTop:18}}>
        {progressView==='overview'&&<>
        {/* Application-strength readiness gauge */}
        <div data-tour="progress-deep-overview" style={{...glass({padding:20}),display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',background:`linear-gradient(135deg,${strengthColor}12,transparent)`,border:`1px solid ${strengthColor}30`}}>
          <Arc pct={strength.score} size={72} stroke={6} color={strengthColor} label={`${strength.score}`} sub="/100"/>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase'}}>Application Strength</div>
            <div style={{fontSize:18,fontWeight:800,color:strengthColor,fontFamily:C.FD,marginTop:2}}>{strength.label}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:4}}>Academic {strength.subscores.academic}% · Clinical {strength.subscores.clinical}% · Application {strength.subscores.application}% · Activities {strength.subscores.activities}%</div>
          </div>
          <button style={btnG({fontSize:12})} onClick={()=>goPortfolio('overview')}>View Portfolio<ChevronRight size={13}/></button>
        </div>

        {/* Onboarding recap — surfaces what the ~30-screen onboarding flow actually collected
            (goal, obstacles, study method, what they want to accomplish) so it's visibly tying
            into the rest of the app instead of vanishing after the paywall screen. Same data
            feeds Iatra's system prompt — see src/lib/studentProfile.js. */}
        <div style={{...glass2({padding:16}),display:'flex',alignItems:'flex-start',gap:14}}>
          <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:C.violetDim,border:`1px solid ${C.violet}30`,display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={15} color={C.violetL}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={R({justifyContent:'space-between',marginBottom:6})}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase'}}>From your onboarding</div>
              {onboardingCompleteness.pct<100&&<span style={pill(C.amberDim,C.amberL,{fontSize:9.5})}>{onboardingCompleteness.pct}% complete</span>}
            </div>
            {onboardingRecap.length>0?(
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {onboardingRecap.map(item=>(
                  <span key={item.label} style={pill(C.violetDim,C.violetL,{fontSize:11})}>{item.label}: {item.value}</span>
                ))}
              </div>
            ):(
              <div style={{fontSize:12.5,color:C.t3,lineHeight:1.5}}>You haven't set a goal yet — Iatra coaches better when it knows what you're working toward.</div>
            )}
          </div>
          <button style={btnSm('rgba(255,255,255,0.06)',{fontSize:10.5,flexShrink:0})} onClick={()=>setTab('settings')}>Edit</button>
        </div>

        {/* Insight callouts */}
        {insights.length>0&&<div style={CC({gap:8})}>
          {insights.map((ins,i)=>{
            const sevColor={high:C.rose,medium:C.amber,low:C.t3,positive:C.green}[ins.severity];
            return(
              <div key={i} style={{...glass2({padding:14,display:'flex',alignItems:'center',gap:12}),borderLeft:`3px solid ${sevColor}`}}>
                <Lightbulb size={15} color={sevColor} style={{flexShrink:0}}/>
                <span style={{flex:1,fontSize:12.5,color:C.t2,lineHeight:1.5}}>{ins.text}</span>
                {ins.ctaLabel&&<button style={btnSm(`${sevColor}18`,{color:sevColor,border:`1px solid ${sevColor}30`,fontSize:11,flexShrink:0})} onClick={()=>ins.ctaTab==='prep'?goPrep(ins.ctaView):goPortfolio(ins.ctaView)}>{ins.ctaLabel}</button>}
              </div>
            );
          })}
        </div>}

        {/* Diagnostic result */}
        {diagPath&&<div style={{...glass2({padding:16,display:'flex',alignItems:'center',gap:14})}}>
          {(()=>{const DIc=PATH_ICONS[user.diagnosticResult]||Compass;return <div style={{width:38,height:38,borderRadius:11,background:`${diagPath.accent}18`,border:`1px solid ${diagPath.accent}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><DIc size={17} color={diagPath.accent}/></div>;})()}
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Your Diagnostic Result</div>
            <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:C.FD,marginTop:2}}>{diagPath.label}{eSpec!==user.diagnosticResult?` — currently on ${curPath?.label}`:''}</div>
          </div>
          <button style={btnG({fontSize:11,padding:'6px 14px'})} onClick={()=>{setDIntro(false);setDD(false);setDS(0);setDA([]);goPrep('diagnostic');}}>Retake<RefreshCw size={12} style={{marginLeft:4}}/></button>
        </div>}

        {/* Identity / Level card */}
        <div style={{...glass({padding:22}),background:`linear-gradient(135deg,${levelInfo.tierColor}22,${accent}10)`,border:`1px solid ${levelInfo.tierColor}35`}}>
          <div style={R({gap:16,flexWrap:'wrap',justifyContent:'space-between'})}>
            <div style={R({gap:14})}>
              <div style={{width:52,height:52,borderRadius:16,background:`${levelInfo.tierColor}25`,border:`1.5px solid ${levelInfo.tierColor}55`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <TierIcon size={24} color={levelInfo.tierColor}/>
              </div>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:C.t1,fontFamily:C.FD}}>Level {lvl} · {levelInfo.tier}</div>
                <div style={{fontSize:12,color:C.t3,marginTop:2,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span>{(user.xp||0).toLocaleString()} XP total{streak>0?` · ${streak}-day streak`:''}</span>
                  {streakFreezes>0&&<span style={{...pill(C.blueDim,C.blueL,{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}><Snowflake size={10}/>{streakFreezes} freeze{streakFreezes>1?'s':''}</span>}
                </div>
              </div>
            </div>
            <div style={{textAlign:'right',minWidth:120}}>
              <div style={{fontSize:12,color:nearLevelUp?C.amberL:C.t2,fontFamily:C.FM,fontWeight:600}}>{nearLevelUp?`Almost there!`:`${xpIn} / ${xpForNext} XP`}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{xpForNext-xpIn} XP to Level {lvl+1}</div>
            </div>
          </div>
          <div style={{marginTop:16}}><Bar pct={levelInfo.pct} color={nearLevelUp?C.amber:levelInfo.tierColor} h={8} glow/></div>
        </div>

        {/* Weekly Quests */}
        <div style={glass({padding:18})}>
          <SL extra={{marginBottom:14}}>This Week's Quests</SL>
          <div style={CC({gap:10})}>
            {quests.map(q=>{const claimed=claimedQuests.has(q.id);const almostDone=!q.done&&q.pct>=80;return(
              <motion.div
                key={q.id}
                animate={almostDone?{scale:[1,1.015,1]}:{scale:1}}
                transition={almostDone?{duration:1.4,repeat:Infinity,ease:'easeInOut'}:{}}
                style={{...glass2({padding:14}),border:almostDone?`1px solid ${C.amber}45`:undefined,boxShadow:almostDone?`0 0 16px ${C.amber}22`:undefined}}
              >
                <div style={R({justifyContent:'space-between',marginBottom:8})}>
                  <span style={{fontSize:12,fontWeight:600,color:q.done?C.t1:C.t2}}>{q.label}</span>
                  <div style={R({gap:8})}>
                    <span style={{fontSize:11,fontFamily:C.FM,color:almostDone?C.amberL:C.t3}}>{q.progress}/{q.target}</span>
                    {claimed
                      ?<span style={pill(C.greenDim,C.greenL,{fontSize:10})}><Check size={10}/>+{q.xp}xp</span>
                      :q.done
                        ?<motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} style={{...pill(C.amberDim,C.amberL,{fontSize:10,cursor:'pointer',border:'none'})}} onClick={()=>claimQuestReward(q)}>Claim +{q.xp}xp</motion.button>
                        :<span style={pill(C.s3,C.t3,{fontSize:10})}>+{q.xp}xp</span>}
                  </div>
                </div>
                <Bar pct={q.pct} color={q.done?C.green:almostDone?C.amber:accent} h={5} glow={q.done||almostDone}/>
              </motion.div>
            );})}
          </div>
        </div>

        {/* Top stats */}
        <div style={G(4,14,{},isMobile)}>
          <Stat label="Total XP" value={(user.xp||0).toLocaleString()} icon={<Zap size={16}/>} color={C.amber} m={isMobile}/>
          <Stat label="Level" value={`${lvl} · ${levelInfo.tier}`} icon={<Trophy size={16}/>} color={C.violet} m={isMobile}/>
          <Stat label="Avg Score" value={`${avgSc}%`} icon={<LineChart size={16}/>} color={scCol(avgSc)} m={isMobile}/>
          <Stat label="Study Streak" value={`${streak}d`} icon={<Flame size={16}/>} color={C.orange} m={isMobile}/>
        </div>

        {/* Profiling roadmap — transparent about what's NOT tracked yet */}
        <details style={{...glass2({padding:14}),cursor:'pointer'}}>
          <summary style={{fontSize:12,fontWeight:700,color:C.t2,display:'flex',alignItems:'center',gap:8,listStyle:'none'}}>
            <Brain size={13} color={C.t3}/>Deeper profiling — coming soon
          </summary>
          <p style={{fontSize:11.5,color:C.t3,lineHeight:1.6,marginTop:10,marginBottom:0}}>
            Right now, Progress only reflects what's stored on this device or account — quiz scores, verified lessons, and Portfolio entries. No behavioral tracking or analytics pipeline runs today. A phased profiling system is planned: first, richer local study-pattern insights (already seeding data via lesson study/verify events); later, optional opt-in sync for cross-device history; eventually, anonymized cohort benchmarking. See <code>docs/PROFILING_PLAN.md</code> in the repo for the full design.
          </p>
        </details>
        </>}

        {progressView==='verified'&&<>
        {/* Verified Progress — credibility view */}
        <div data-tour="progress-deep-verified" style={{...glass({padding:20}),background:`linear-gradient(135deg,${C.greenDim},transparent)`,border:`1px solid ${C.green}25`}}>
          <div style={R({gap:16,flexWrap:'wrap'})}>
            <div style={{width:52,height:52,borderRadius:16,background:C.greenDim,border:`1px solid ${C.green}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ShieldCheck size={24} color={C.greenL}/></div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase'}}>Credibility Score</div>
              <div style={{fontSize:20,fontWeight:800,color:C.t1,fontFamily:C.FD,marginTop:2}}>{verifiedUnitCount} of {quizGatedUnitCount||unitMasteryList.length} units verified</div>
              <div style={{fontSize:11.5,color:C.t2,marginTop:4,lineHeight:1.5}}>{quizGatedUnitCount>0?'Verified units required passing a curated quiz for every lesson — not just opening a link.':'This pathway hasn\'t been migrated to quiz-verified lessons yet — progress below is self-reported.'}</div>
            </div>
          </div>
        </div>
        {unitMasteryList.map(({unit,lessonStates,anyQuizGated,allVerified})=>(
          <div key={unit.id} style={glass({padding:18})}>
            <div style={R({justifyContent:'space-between',marginBottom:14})}>
              <div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{unit.title}</div>
              {anyQuizGated
                ?(allVerified?<span style={pill(C.greenDim,C.greenL,{fontSize:10})}><ShieldCheck size={10} style={{marginRight:4}}/>Verified</span>:<span style={pill(C.amberDim,C.amberL,{fontSize:10})}>In progress</span>)
                :<span style={pill('rgba(255,255,255,0.06)',C.t3,{fontSize:10})}>Legacy self-reported</span>}
            </div>
            <div style={CC({gap:8})}>
              {lessonStates.map(({lesson,status,hasQuiz})=>(
                <div key={lesson.id} style={{...glass2({padding:'10px 14px'}),display:'flex',alignItems:'center',gap:10}}>
                  {status==='verified'&&<ShieldCheck size={14} color={C.green}/>}
                  {status==='legacy_done'&&<Check size={14} color={C.green}/>}
                  {status==='studying'&&<BookOpen size={14} color={C.amberL}/>}
                  {status==='not_started'&&<Circle size={10} color={C.t4}/>}
                  <span style={{flex:1,fontSize:12.5,color:C.t2}}>{lesson.title}</span>
                  {hasQuiz
                    ?<span style={pill(status==='verified'?C.greenDim:'rgba(255,255,255,0.06)',status==='verified'?C.greenL:C.t3,{fontSize:9})}>{status==='verified'?'Quiz passed':'Not yet verified'}</span>
                    :<span style={pill('rgba(255,255,255,0.06)',C.t3,{fontSize:9})}>Self-reported</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        </>}

        {progressView==='performance'&&<>
        {/* Predicted SAT */}
        {predSAT&&<div style={{...glass({padding:20}),background:`linear-gradient(135deg,${C.greenDim},${C.blueDim})`,border:`1px solid ${C.green}20`}}>
          <SL extra={{marginBottom:12}}>Predicted SAT Score</SL>
          <div style={R({gap:20,flexWrap:'wrap'})}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:48,fontWeight:800,fontFamily:C.FM,color:C.green,lineHeight:1}}>{predSAT}</div>
              <div style={{fontSize:12,color:C.t3,marginTop:4}}>Total Score</div>
            </div>
            <div style={{flex:1,minWidth:200}}>
              {catStats.map(({cat,predicted,avg})=>predicted&&(
                <div key={cat} style={{marginBottom:10}}>
                  <div style={R({justifyContent:'space-between',marginBottom:5})}>
                    <span style={{fontSize:12,color:C.t2}}>{cat}</span>
                    <span style={{fontSize:13,fontFamily:C.FM,fontWeight:700,color:scCol(avg||0)}}>{predicted}</span>
                  </div>
                  <Bar pct={((predicted-118)/14)*100} color={scCol(avg||0)} h={5} glow/>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* Charts row */}
        <div data-tour="progress-deep-performance" style={G(2,14,{},isMobile)}>
          {/* Radar chart */}
          <div style={glass({padding:20})}>
            <SL>Section Performance</SL>
            <div style={{height:220,position:'relative'}}>
              <Radar data={radarData} options={radarOpts}/>
            </div>
            <div style={{marginTop:14,...CC({gap:8})}}>
              {catStats.map(({cat,avg,taken,total})=>(
                <div key={cat} style={R({gap:10})}>
                  <span style={{fontSize:11,color:C.t2,flex:1,fontFamily:C.FB}}>{cat.split('/')[0]}</span>
                  <span style={{fontSize:11,fontFamily:C.FM,color:C.t3}}>{taken}/{total}</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:C.FM,color:avg!==null?scCol(avg):C.t3,minWidth:36,textAlign:'right'}}>{avg!==null?`${avg}%`:'—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doughnut + course mastery */}
          <div style={glass({padding:20})}>
            <SL>Course Mastery</SL>
            <div style={{position:'relative',height:160,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Doughnut data={doughnutData} options={doughnutOpts}/>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                <span style={{fontSize:26,fontWeight:800,fontFamily:C.FM,color:accent}}>{mastery}%</span>
                <span style={{fontSize:10,color:C.t3}}>complete</span>
              </div>
            </div>
            <div style={{marginTop:16,...CC({gap:8})}}>
              {(curPath?.units||[]).map(unit=>{const p=unitM(unit);return(
                <div key={unit.id} style={{marginBottom:2}}>
                  <div style={R({justifyContent:'space-between',marginBottom:5})}>
                    <span style={{fontSize:11,color:C.t2,fontFamily:C.FB}}>{unit.title}</span>
                    <span style={{fontSize:11,fontFamily:C.FM,color:p===100?C.green:accent}}>{p}%</span>
                  </div>
                  <Bar pct={p} color={p===100?C.green:accent} h={4} glow={p===100}/>
                </div>
              );})}
            </div>
          </div>
        </div>

        {/* Score trend line chart */}
        {recentScores.length>=2&&<div style={glass({padding:20})}>
          <SL>Score Trend (last {recentScores.length} quizzes)</SL>
          <div style={{height:180,position:'relative'}}>
            <Line data={lineData} options={lineOpts}/>
          </div>
        </div>}

        {/* Clinical/shadowing hour trend */}
        {monthKeys.length>=2&&<div style={glass({padding:20})}>
          <SL>Clinical & Shadowing Hours — Cumulative</SL>
          <div style={{height:180,position:'relative'}}>
            <Line data={clinicalTrendData} options={lineOpts}/>
          </div>
        </div>}

        {/* Benchmark bars vs. active pathway targets */}
        <div style={glass({padding:18})}>
          <SL>Progress Toward {curPath?.label} Benchmarks</SL>
          {[
            {l:'Clinical / Shadowing Hours',val:clinicalHoursTotal,target:(benchmarks.clinicalHours||60)+(benchmarks.shadowingHours||20),col:accent},
            {l:'Leadership Hours',val:leadH,target:benchmarks.leadershipHours||100,col:C.blue},
            {l:'Volunteer Hours',val:volH,target:benchmarks.volunteerHours||150,col:C.violet},
          ].map(({l,val,target,col})=>(
            <div key={l} style={{marginBottom:14}}>
              <div style={R({justifyContent:'space-between',marginBottom:6})}>
                <span style={{fontSize:12,color:C.t2,fontFamily:C.FB}}>{l}</span>
                <span style={{fontSize:11,fontFamily:C.FM,color:val>=target?C.green:C.t3,display:'inline-flex',alignItems:'center',gap:4}}>{val} / {target}{val>=target&&<Check size={11}/>}</span>
              </div>
              <Bar pct={Math.min((val/target)*100,100)} color={val>=target?C.green:col} h={6} glow={val>=target}/>
            </div>
          ))}
        </div>

        {/* Recent quiz scores table */}
        {recentScores.length>0&&<div style={glass()}>
          <SL>Recent Quiz Scores</SL>
          <div style={CC({gap:8})}>
            {recentScores.slice().reverse().map((record,i)=>{
              const quiz=ALL_QUIZZES.find(q=>q.id===record.quizId);const sc=scCol(record.score);
              return(
                <div key={i} style={{...glass2({padding:'12px 16px'}),...R()}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.t1,fontFamily:C.FD,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{quiz?.title||record.quizId}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:1}}>{quiz?.cat} · {new Date(record.completedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={R({gap:12})}>
                    <div style={{width:90,height:5,background:C.s4,borderRadius:3,overflow:'hidden',alignSelf:'center'}}>
                      <div style={{height:'100%',width:`${record.score}%`,background:sc,borderRadius:3,boxShadow:`0 0 6px ${sc}60`}}/>
                    </div>
                    <span style={{fontSize:15,fontWeight:800,fontFamily:C.FM,color:sc,minWidth:44,textAlign:'right'}}>{record.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Study activity heatmap — proof-of-the-work belongs here, not on Home's daily snapshot */}
        <div style={glass({padding:18,overflowX:'auto'})}>
          <StreakHeatmap accent={accent}/>
        </div>

        {/* Card review stats */}
        <div style={G(3,14,{},isMobile)}>
          <Stat label="Cards Reviewed" value={totalReviews} icon={<Layers3 size={16}/>} color={C.violet} sub="Total all-time" m={isMobile}/>
          <Stat label="Due Now" value={dueCards} icon={<CalendarDays size={16}/>} color={dueCards>0?C.amber:C.green} sub={dueCards>0?'Review these today':'All caught up!'} m={isMobile}/>
          <Stat label="Coach Messages" value={aiChatCount} icon={<MessageCircle size={16}/>} color={C.cyan} sub="Iatra conversations" m={isMobile}/>
        </div>
        </>}

        {progressView==='achievements'&&<>
        {/* Achievements */}
        {(()=>{
          const progressFor={
            first_quiz:[qTaken,1], perfect_score:[qHistory.filter(q=>q.score===100).length,1], quiz_10:[qTaken,10],
            level_5:[lvl,5], level_10:[lvl,10], streak_7:[streak,7], streak_30:[streak,30], cards_100:[totalReviews,100],
            unit_master:[mastery,33], course_half:[mastery,50], ai_user:[aiChatCount,5],
            college_added:[appCounts.colleges,1], deadline_set:[(upcomingDeadlines||[]).length,1], essay_started:[appCounts.essays,1],
            activity_logged:[portActivities.length,1], interview_first:[interviewCount,1], interview_5:[interviewCount,5],
            clinical_hours_50:[clinicalHoursTotal,50], recommender_added:[recommendersCount,1], mmi_practiced:[mmiCasperCount,1],
          };
          return(
        <div data-tour="progress-deep-achievements" style={glass({padding:18})}>
          <SL>Achievements ({achiev.size}/{Object.keys(ACHIEVEMENTS).length})</SL>
          <div style={G(4,10,{},isMobile)}>
            {Object.values(ACHIEVEMENTS).map(a=>{
              const has=achiev.has(a.key);const AIc=ACH_ICONS[a.icon]||Award;
              const prog=progressFor[a.key];const pct=prog?Math.min(100,Math.round((prog[0]/prog[1])*100)):null;
              return(
              <div key={a.key} title={`${a.name}: ${a.desc}${has?` (+${a.xp} XP)`:''}`} style={{...glass2({padding:12,textAlign:'center',opacity:has?1:.55,border:has?`1px solid ${C.amber}30`:undefined,transition:'opacity .2s'})}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:6}}><AIc size={20} color={has?C.amberL:C.t3}/></div>
                <div style={{fontSize:10,fontWeight:600,color:has?C.amberL:C.t3,lineHeight:1.3,fontFamily:C.FD}}>{a.name}</div>
                {has&&<div style={{...pill(C.amberDim,C.amberL,{fontSize:9,marginTop:6,fontFamily:C.FM})}}>+{a.xp}xp</div>}
                {!has&&pct!==null&&<div style={{marginTop:8}}>
                  <Bar pct={pct} color={accent} h={3}/>
                  <div style={{fontSize:9,color:C.t3,marginTop:4,fontFamily:C.FM}}>{prog[0]}/{prog[1]}</div>
                </div>}
              </div>
            );})}
          </div>
        </div>
          );
        })()}
        </>}
        </div>
      </div>
    );
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────────────
  function tSettings(){
    return(
      <div style={CC({gap:22})}>
        <div><div style={lbl()}>Settings</div><h2 style={{fontSize:24,fontWeight:800,color:C.t1,fontFamily:C.FD,letterSpacing:'-.03em',margin:0}}>Account & Preferences</h2></div>

        {/* Profile */}
        <div data-tour="settings-deep-profile" style={glass()}>
          <SL>Profile</SL>
          <div style={{...R({gap:14,marginBottom:18})}}>
            <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${accent}50,${accent}25)`,border:`2px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22,color:'#fff',boxShadow:`0 6px 20px ${accent}30`}}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.t1,fontFamily:C.FD}}>{user.name}</div>
              <div style={{fontSize:12,color:C.t3,marginTop:2}}>Level {lvl} · {curPath?.label} · {(user.xp||0).toLocaleString()} XP total</div>
              <div style={R({gap:8,marginTop:6})}>
                {streak>0&&<span style={{...pill(C.amberDim,C.amberL,{fontSize:10}),display:'inline-flex',alignItems:'center',gap:4}}><Flame size={10}/>{streak} day streak</span>}
                <span style={pill(C.greenDim,C.greenL,{fontSize:10})}>{achiev.size} achievements</span>
              </div>
            </div>
          </div>
          <div style={CC({gap:4,marginBottom:14})}><span style={lbl()}>Display Name</span><input style={inp()} placeholder={user.name} value={sName} onChange={e=>setSN(e.target.value)}/></div>
          <button style={btn()} onClick={()=>{if(!sName.trim())return;const nextName=sName.trim();saveUser({...user,name:nextName});AuthAPI.updateMe({name:nextName}).then(({user:updated})=>onAccountChange?.(updated)).catch(()=>{});setSN('');toast.success('Name updated');}}>Save Name</button>
        </div>

        {/* Your Goals — onboarding answers, editable after the fact so they don't stay locked in
            forever. Feeds Iatra's system prompt (src/lib/studentProfile.js) and the Progress
            overview recap card, so updating this here actually changes those. */}
        <div data-tour="settings-deep-goals" style={glass()}>
          <div style={R({justifyContent:'space-between',marginBottom:8})}>
            <SL extra={{marginBottom:0}}>Your Goals</SL>
            {!sGoalsEditing&&<button style={{...btnG({fontSize:11,padding:'6px 14px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setSGoal(user.goal||null);setSObstacles(user.obstacles||[]);setSStudyMethod(user.studyMethod||null);setSAccomplish(user.accomplish||[]);setSGoalsEditing(true);}}><Pencil size={12}/>Edit</button>}
          </div>
          {!sGoalsEditing?(
            onboardingRecap.length>0?(
              <div style={CC({gap:10})}>
                {onboardingRecap.map(item=>(
                  <div key={item.label}>
                    <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.06em',textTransform:'uppercase'}}>{item.label}</div>
                    <div style={{fontSize:13,color:C.t1,marginTop:2}}>{item.value}</div>
                  </div>
                ))}
              </div>
            ):(
              <p style={{fontSize:13,color:C.t3,lineHeight:1.6}}>You haven't set a goal yet — click Edit to tell Iatra what you're working toward, what's slowing you down, and what you want to accomplish.</p>
            )
          ):(
            <div style={CC({gap:18})}>
              <div>
                <SL>Top goal</SL>
                <div style={CC({gap:6})}>
                  {GOAL_OPTIONS.map(o=>(
                    <div key={o.value} onClick={()=>setSGoal(o.value)} style={{...glass2({padding:'10px 14px',cursor:'pointer',border:sGoal===o.value?`1px solid ${accent}60`:undefined}),display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${sGoal===o.value?accent:C.b2}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{sGoal===o.value&&<div style={{width:8,height:8,borderRadius:'50%',background:accent}}/>}</div>
                      <span style={{fontSize:12.5,color:C.t2}}>{o.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SL>What's in your way (select all that apply)</SL>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:6}}>
                  {OBSTACLE_OPTIONS.map(o=>{const checked=sObstacles.includes(o.value);return(
                    <div key={o.value} onClick={()=>setSObstacles(list=>checked?list.filter(v=>v!==o.value):[...list,o.value])} style={{...glass2({padding:'10px 12px',cursor:'pointer',border:checked?`1px solid ${accent}60`:undefined}),display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:15,height:15,borderRadius:4,border:`2px solid ${checked?accent:C.b2}`,background:checked?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{checked&&<Check size={10} color="#fff"/>}</div>
                      <span style={{fontSize:12,color:C.t2}}>{o.label}</span>
                    </div>
                  );})}
                </div>
              </div>
              <div>
                <SL>What you want to accomplish (select all that apply)</SL>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:6}}>
                  {ACCOMPLISH_OPTIONS.map(o=>{const checked=sAccomplish.includes(o.value);return(
                    <div key={o.value} onClick={()=>setSAccomplish(list=>checked?list.filter(v=>v!==o.value):[...list,o.value])} style={{...glass2({padding:'10px 12px',cursor:'pointer',border:checked?`1px solid ${accent}60`:undefined}),display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:15,height:15,borderRadius:4,border:`2px solid ${checked?accent:C.b2}`,background:checked?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{checked&&<Check size={10} color="#fff"/>}</div>
                      <span style={{fontSize:12,color:C.t2}}>{o.label}</span>
                    </div>
                  );})}
                </div>
              </div>
              <div>
                <SL>Current study method</SL>
                <div style={CC({gap:6})}>
                  {STUDY_METHOD_OPTIONS.map(o=>(
                    <div key={o.value} onClick={()=>setSStudyMethod(o.value)} style={{...glass2({padding:'10px 14px',cursor:'pointer',border:sStudyMethod===o.value?`1px solid ${accent}60`:undefined}),display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${sStudyMethod===o.value?accent:C.b2}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{sStudyMethod===o.value&&<div style={{width:8,height:8,borderRadius:'50%',background:accent}}/>}</div>
                      <span style={{fontSize:12.5,color:C.t2}}>{o.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={R({gap:10})}>
                <button style={btn()} onClick={()=>{saveUser({...user,goal:sGoal,obstacles:sObstacles,studyMethod:sStudyMethod,accomplish:sAccomplish});setSGoalsEditing(false);toast.success('Goals updated — Iatra will use this right away.');}}>Save Goals</button>
                <button style={btnG()} onClick={()=>setSGoalsEditing(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Exam date */}
        <div data-tour="settings-deep-examdate" style={glass({padding:18})}>
          <SL>Test Day</SL>
          <p style={{fontSize:12,color:C.t2,marginBottom:14,lineHeight:1.6}}>Set your test date to see a countdown and pacing guidance on your Home page.</p>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <input type="date" style={inp({width:'auto'})} value={sExamDate||user?.examDate||''} onChange={e=>setSExamDate(e.target.value)}/>
            <button style={btn()} onClick={()=>{if(!sExamDate)return;saveUser({...user,examDate:sExamDate});toast.success('Test date saved');}}>Save Date</button>
            {user?.examDate&&<button style={btnG()} onClick={()=>{saveUser({...user,examDate:null});setSExamDate('');toast('Test date cleared');}}>Clear</button>}
          </div>
        </div>

        {/* Sound toggle */}
        <div data-tour="settings-deep-preferences" style={glass({padding:18})}>
          <SL>Preferences</SL>
          <div style={R({justifyContent:'space-between'})}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t1,fontFamily:C.FD}}>Sound Effects</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>Audio feedback for correct answers, level-ups, and achievements</div>
            </div>
            <div onClick={()=>{const v=!sfxOn;setSfxOn(v);setSFX(v);}} style={{width:44,height:24,borderRadius:12,background:sfxOn?accent:C.s4,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0,border:`1px solid ${sfxOn?accent:C.b2}`}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:sfxOn?22:2,transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.4)'}}/>
            </div>
          </div>
        </div>

        {/* Help */}
        <div style={glass({padding:18})}>
          <SL>Help</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:14,lineHeight:1.65}}>Not sure where everything lives? Replay the full guided tour — every tab, every sub-view inside Prep, Portfolio, and Progress, Settings, and the ⌘K quick-switcher.</p>
          <button style={{...btnG({fontSize:12,padding:'9px 18px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={startTour}><Compass size={14}/>Replay App Tour</button>
        </div>

        {/* Dev-only: preview the first-run onboarding wizard without touching this account's
            saved profile. Remove this card once onboarding is stable. */}
        <div style={glass({padding:18})}>
          <SL>Developer</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:14,lineHeight:1.65}}>Temporary, dev-only: preview the first-run onboarding wizard again. Won't change your saved profile — closing or finishing it just returns you here.</p>
          <button style={{...btnG({fontSize:12,padding:'9px 18px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>setPreviewOnboarding(true)}><RotateCcw size={14}/>Replay Onboarding</button>
        </div>

        {/* Specialty path */}
        <div data-tour="settings-deep-studytrack" style={glass()}>
          <div style={R({justifyContent:'space-between',marginBottom:8})}>
            <SL extra={{marginBottom:0}}>Study Track</SL>
            <button style={{...btnG({fontSize:11,padding:'6px 14px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{setDIntro(true);goPrep('diagnostic');}}>Full pathway details<ChevronRight size={12}/></button>
          </div>
          <p style={{fontSize:13,color:C.t2,marginBottom:16}}>Current: <span style={{color:accent,fontWeight:700,fontFamily:C.FD}}>{curPath?.label}</span></p>
          <div style={G(2,10,{},isMobile)}>
            {Object.entries(PATHS).map(([key,p])=>(
              <motion.div key={key} whileHover={{borderColor:`${p.accent}40`}} onClick={()=>setSS(sSpec===key?'':key)} style={{...glass2({padding:16,cursor:'pointer',border:sSpec===key?`1px solid ${p.accent}60`:eSpec===key?`1px solid ${p.accent}30`:undefined,transition:'border-color .15s'})}}>
                <div style={{fontSize:13,fontWeight:700,color:sSpec===key?p.accent:eSpec===key?p.accent:C.t2,fontFamily:C.FD}}>{p.label}</div>
                {p.tagline&&<div style={{fontSize:10.5,color:C.t3,marginTop:4,lineHeight:1.5}}>{p.tagline}</div>}
                <div style={{fontSize:11,color:C.t4,marginTop:6,fontFamily:C.FM}}>{p.units.length} units · {p.units.reduce((s,u)=>s+u.lessons.length,0)} lessons</div>
                {eSpec===key&&<div style={{fontSize:10,color:p.accent,marginTop:4,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}><Check size={10}/>Current</div>}
              </motion.div>
            ))}
          </div>
          {sSpec&&sSpec!==eSpec&&<motion.button whileHover={{scale:1.02}} whileTap={{scale:.98}} style={{...btn(),marginTop:16}} onClick={()=>{switchPath(sSpec);setSS('');}}>Switch to {PATHS[sSpec]?.label}</motion.button>}
        </div>

        {/* Course load */}
        <div data-tour="settings-deep-courseload" style={glass()}>
          <SL>Current Course Load</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:16}}>Tell us what you're taking so the AI Coach and Quiz Library can point you to relevant material.</p>
          {COURSE_GROUPS.map(g=>(
            <div key={g.group} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>{g.group}</div>
              <div style={R({gap:6,flexWrap:'wrap'})}>
                {g.items.map(course=>{
                  const active=(user.courses||[]).includes(course);
                  return(
                    <button key={course} type="button" onClick={()=>{
                      const next=active?(user.courses||[]).filter(c=>c!==course):[...(user.courses||[]),course];
                      saveUser({...user,courses:next});
                    }} style={btnSm(active?accent:'rgba(255,255,255,0.06)',{color:'#fff'})}>{course}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{...R({gap:10,marginTop:6,paddingTop:14,borderTop:`1px solid ${C.b1}`})}}>
            <div onClick={()=>saveUser({...user,apIb:!user.apIb})} style={{width:40,height:22,borderRadius:11,background:user.apIb?accent:C.s4,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0,border:`1px solid ${user.apIb?accent:C.b2}`}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:user.apIb?20:2,transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.4)'}}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t1}}>I'm an AP/IB student</div>
              <div style={{fontSize:11,color:C.t3,marginTop:1}}>Unlocks AP/IB exam deadline types on the Deadlines tab</div>
            </div>
          </div>
        </div>

        {/* Export / Backup */}
        <div data-tour="settings-deep-backup" style={glass({padding:18})}>
          <SL>Data & Backup</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:14,lineHeight:1.65}}>Export all your progress data as a JSON file. Useful for backup or transferring to a new device.</p>
          <button style={{...btnG({fontSize:12,padding:'9px 18px'}),display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>{DB.exportAllData();toast.success('Export started — check your Downloads folder');}}><Package size={14}/>Export All Data</button>
        </div>

        {/* Account */}
        <div data-tour="settings-deep-account" style={glass({padding:18})}>
          <SL>Account</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:14,lineHeight:1.65}}>Signed in as <strong style={{color:C.t1}}>{account?.email}</strong>. Your whole profile — XP, streak, quiz scores, flashcards, pathway progress, achievements, Iatra chats, and your Portfolio — syncs to this account, so signing in anywhere else picks up right where you left off.</p>
          <button style={{...btnG({fontSize:12,padding:'9px 18px'})}} onClick={async()=>{try{await ProgressSync.flushNow();}catch(err){console.error('Pre-signout sync flush failed:',err);}await AuthAPI.logout();window.location.reload();}}>Sign Out</button>
        </div>

        {/* Danger zone */}
        <div data-tour="settings-deep-danger" style={{...glass({border:`1px solid rgba(244,63,94,0.2)`})}}>
          <SL extra={{color:C.rose}}>Danger Zone</SL>
          <p style={{fontSize:13,color:C.t2,marginBottom:16,lineHeight:1.65}}>These actions are permanent and cannot be undone.</p>
          <div style={R({gap:10,flexWrap:'wrap'})}>
            <button style={btnSm(C.roseDim,{color:C.rose,border:`1px solid ${C.rose}30`,fontSize:12})} onClick={()=>{if(window.confirm('Reset all quiz scores and lesson progress?')){DB.resetPathway();DB.resetQuizScores();DB.resetCatPerf();setPathway_({});setQScores_({});setQHistory([]);setCatPerf_({});toast.success('Progress reset successfully.');}}} >Reset Progress</button>
            <button style={btnSm(C.roseDim,{color:C.rose,border:`1px solid ${C.rose}30`,fontSize:12})} onClick={async()=>{if(window.confirm('Sign out and permanently delete all local device data? This cannot be undone.')){try{await ProgressSync.flushNow();}catch(err){console.error('Pre-signout sync flush failed:',err);}await AuthAPI.logout();await signOut();window.location.reload();}}}>Sign Out & Clear Local Data</button>
          </div>
        </div>

        {/* About */}
        <div style={glass({padding:18})}>
          <div style={{fontSize:11,color:C.t3,lineHeight:1.9,fontFamily:C.FM}}>
            MedSchoolPrep v3.0 &nbsp;·&nbsp; {TOTAL_QUESTIONS} questions &nbsp;·&nbsp; {ELIB.length} resources &nbsp;·&nbsp; {Object.keys(FLASH_DECKS).length} decks<br/>
            Powered by: ts-fsrs (FSRS-4.5 spaced repetition) · compromise (offline NLP) · Iatra on Groq · Fuse.js · Dexie.js · KaTeX · Chart.js · Framer Motion · react-hot-toast · canvas-confetti · jsPDF · marked<br/>
            Flashcard scheduling runs on FSRS, the open-source algorithm Anki uses by default · Flashcard generation runs fully offline on your device, extracting cards directly from your notes — no account, API key, or network call required · Iatra is powered by large language model technology · Your progress is cached on this device via IndexedDB and synced to your account so it follows you to any browser you sign into
          </div>
        </div>
      </div>
    );
  }

  // ═══ ONBOARDING ════════════════════════════════════════════════════════════════
  if(!dbReady) return <LoadingScreen/>;

  if(previewOnboarding){
    return(
      <ErrorBoundary>
        <Toaster position="bottom-right"/>
        <Onboarding account={account} onComplete={()=>setPreviewOnboarding(false)}/>
      </ErrorBoundary>
    );
  }

  if(!user){
    return(
      <ErrorBoundary>
        <Toaster position="bottom-right"/>
        <Onboarding account={account} onComplete={completeOnboarding}/>
      </ErrorBoundary>
    );
  }

  // ═══ ACTIVE QUIZ FULLSCREEN ════════════════════════════════════════════════════
  if(aQuiz){
    return(
      <ErrorBoundary>
        <div style={{minHeight:'100vh',background:C.bg,color:C.t1,fontFamily:C.FB}}>
          <Toaster position="top-right"/>
          <div style={{maxWidth:780,margin:'0 auto',padding:'24px 24px 60px'}}>
            <div style={{...glass({padding:'14px 22px',marginBottom:18}),...R()}}>
              <span style={pill(C.blueDim,C.blueL,{fontSize:11})}>{aQuiz.cat}</span>
              <span style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:C.FD,marginLeft:4}}>{aQuiz.title}</span>
              <span style={{marginLeft:'auto',...pill(C.s3,C.t3,{fontSize:10})}}>{aQuiz.diff}</span>
            </div>
            <div style={glass({padding:isMobile?0:24})}>
              <QuizEngine quiz={aQuiz} onFinish={finishQuiz} onClose={()=>setAQ(null)} accent={accent} readonly={!!aQuiz.readonly} m={isMobile}/>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ═══ ACTIVE LESSON FULLSCREEN (immersive Overview→Article→Video→Quiz→Complete) ═══
  if(activeLesson){
    const {lesson,unit}=activeLesson;
    const nextInfo=getNextLesson(lesson);
    return(
      <ErrorBoundary>
        <Toaster position="top-right"/>
        <LessonPlayer
          lesson={lesson} unit={unit} pathwayLabel={curPath?.label}
          pathwayEntry={pathway[lesson.id]}
          step={lessonStep} onStep={setLessonStep}
          articleRead={articleRead} onArticleRead={()=>setArticleRead(true)}
          videoWatched={videoWatched} onVideoWatched={()=>setVideoWatched(true)}
          onClose={closeLesson}
          onStartQuiz={()=>openVerifyQuiz(lesson,unit)}
          onNextLesson={()=>{ if(nextInfo)openLesson(nextInfo.lesson,nextInfo.unit); }}
          hasNextLesson={!!nextInfo}
          accent={curPath?.accent||C.blue} m={isMobile}
        />
      </ErrorBoundary>
    );
  }

  // ═══ MAIN LAYOUT ═══════════════════════════════════════════════════════════════
  // ── Prep: diagnostic/pathway/quizzes/flashcards/coach/library, switched via SubNav ──
  const prepRenders={ diagnostic:tDiag, pathway:tPath, quizzes:tQuizzes, flashcards:tFlash, coach:tCoach, library:tLib };
  function tPrep(){
    return(
      <div>
        <SubNav items={PREP_SUBNAV.map(n=>n.id==='flashcards'&&dueCards>0?{...n,badge:dueCards}:n)} active={prepView} onChange={setPrepView} accent={accent} m={isMobile} tourPrefix="prep-sub"/>
        {(prepRenders[prepView]||tPath)()}
      </div>
    );
  }
  // ── Portfolio: overview + colleges/essays/deadlines/aid/resume/interview/scores/calc ──
  const portfolioRenders={
    overview:tPort, calc:tCalc, timeline:()=><PortfolioTimeline accent={accent}/>,
    deadlines:()=><DeadlinesPanel accent={accent}/>,
    colleges:()=><CollegeListPanel accent={accent}/>,
    essays:()=><EssayWorkspacePanel accent={accent}/>,
    scores:()=><ScoreTrackerPanel accent={accent}/>,
    aid:()=><FinancialAidPanel accent={accent}/>,
    resume:()=><ActivitiesResumePanel accent={accent} onResumeExported={()=>{setAppCounts(c=>({...c,resume:true}));checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount,{resumeBuilt:true});}}/>,
    research:()=><ResearchExperiencePanel accent={accent}/>,
    skills:()=><SkillsCertificationsPanel accent={accent}/>,
    clinical:()=><ClinicalHoursPanel accent={accent} onLogged={async()=>{const hours=await listItems('clinical_hours');setClinicalHoursEntries(hours||[]);const total=(hours||[]).reduce((s,h)=>s+(h.hours||0),0);setClinicalHoursTotal(total);checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount,{clinicalHours:total});}}/>,
    recommenders:()=><RecommendersPanel accent={accent} onChange={async()=>{const recs=await listItems('recommenders');setRecommendersCount(recs.length);checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount,{recommenders:recs.length});}}/>,
    interview:()=><InterviewPrepPanel accent={accent} pathway={curPath} pathwayKey={eSpec} onSessionComplete={(mode)=>{const nc=interviewCount+1;setInterviewCount(nc);saveUser({...user,interviewCount:nc});bumpWeeklyCoachCount(getIsoWeekKey());const mmiNc=(mode==='mmi'||mode==='casper')?mmiCasperCount+1:mmiCasperCount;if(mmiNc!==mmiCasperCount)setMmiCasperCount(mmiNc);checkAndUnlockAchievements(user,qTaken,qHistory.filter(q=>q.score===100).length,streak,totalReviews,mastery,aiChatCount,{interviewSessions:nc,mmiCasperSessions:mmiNc});}}/>,
  };
  function tPortWrap(){
    return(
      <div>
        <SubNav items={PORTFOLIO_SUBNAV} active={portfolioView} onChange={setPortfolioView} accent={accent} m={isMobile} tourPrefix="portfolio-sub"/>
        {(portfolioRenders[portfolioView]||tPort)()}
      </div>
    );
  }
  const tRenders={ home:tHome, prep:tPrep, portfolio:tPortWrap, progress:tAnalytics, settings:tSettings };

  return(
    <ErrorBoundary>
      <Toaster position="bottom-right" toastOptions={{style:{background:C.s1,color:C.t1,border:`1px solid ${C.b2}`,fontFamily:C.FB,fontSize:13,boxShadow:`0 8px 32px rgba(0,0,0,0.6)`},success:{iconTheme:{primary:C.green,secondary:C.s1}},error:{iconTheme:{primary:C.rose,secondary:C.s1}}}}/>
      <AnimatePresence>
        {vidM&&<VideoModal key="vidmodal" ytId={vidM.ytId} title={vidM.title} url={vidM.url} onClose={()=>setVM(null)} m={isMobile}/>}
      </AnimatePresence>
      <RewardChest
        open={!!chest}
        title={chest?.title}
        eyebrow={chest?.eyebrow}
        xp={chest?.xp||0}
        cosmetic={chest?.cosmetic}
        onOpen={()=>{ chest?.onOpen?.(); }}
        onClose={closeChest}
      />
      <div style={{display:'flex',flexDirection:isMobile?'column':'row',height:'100dvh',overflow:'hidden',background:C.bg,color:C.t1,fontFamily:C.FB,position:'relative'}}>

        {/* ══ MOBILE HEADER ════════════════════════════════════════════════════ */}
        {isMobile && (
          <header style={{padding:'12px 16px',borderBottom:`1px solid ${C.b1}`,background:C.s0,display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
            <div style={R({gap:10})}>
              <div style={{width:30,height:30,borderRadius:8,overflow:'hidden'}}><img src="/icon.svg" width={30} height={30} alt="" style={{display:'block'}}/></div>
              <div style={{fontSize:14,fontWeight:800,color:C.t1,fontFamily:C.FD}}>MedSchoolPrep</div>
            </div>
            <div style={R({gap:10})}>
              <button data-tour="cmdk" onClick={()=>setCmdOpen(true)} aria-label="Quick switch" style={{width:32,height:32,borderRadius:10,background:C.s2,border:`1px solid ${C.b1}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.t2,cursor:'pointer'}}><Search size={14}/></button>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:C.t3,fontFamily:C.FM}}>Lv.{lvl}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.t1}}>{user.name}</div>
              </div>
              <div onClick={() => setTab('settings')} style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${accent}55,${accent}28)`,border:`1.5px solid ${accent}45`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,color:'#fff',cursor:'pointer'}}>{user.name[0].toUpperCase()}</div>
            </div>
          </header>
        )}

        {/* ══ SIDEBAR (Desktop) ════════════════════════════════════════════════ */}
        {!isMobile && (
          <aside style={{width:236,flexShrink:0,display:'flex',flexDirection:'column',overflow:'hidden',borderRight:`1px solid ${C.b1}`,background:`linear-gradient(180deg,${C.s0} 0%,${C.bg} 100%)`,position:'relative',zIndex:10}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${accent}60,transparent)`}}/>
            <div style={{padding:'20px 18px 16px',borderBottom:`1px solid ${C.b1}`}}>
              <div style={R({gap:11})}>
                <div style={{width:34,height:34,borderRadius:9,overflow:'hidden'}}><img src="/icon.svg" width={34} height={34} alt="" style={{display:'block'}}/></div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.t1,fontFamily:C.FD}}>MedSchoolPrep</div>
                  <div style={{fontSize:9,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase'}}>YOUR PATH INTO MEDICINE</div>
                </div>
              </div>
            </div>
            <button data-tour="cmdk" onClick={()=>setCmdOpen(true)} style={{margin:'12px 18px 0',padding:'8px 12px',borderRadius:9,background:C.s2,border:`1px solid ${C.b1}`,color:C.t3,fontSize:12,fontFamily:C.FB,display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <Search size={13}/><span style={{flex:1,textAlign:'left'}}>Jump to…</span><span style={{...pill(C.s3,C.t3,{fontSize:9,fontFamily:C.FM,padding:'2px 6px'})}}>⌘K</span>
            </button>
            <div onClick={()=>setTab('settings')} style={{padding:'14px 18px',borderBottom:`1px solid ${C.b1}`,cursor:'pointer',background:tab==='settings'?`${accent}12`:undefined}}>
              <div style={R({gap:11,marginBottom:12})}>
                <div style={{width:36,height:36,borderRadius:11,background:`linear-gradient(135deg,${accent}55,${accent}28)`,border:`1.5px solid ${accent}45`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#fff',flexShrink:0}}>
                  {user.name[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:C.FD}}>{user.name}</div>
                  <div style={{fontSize:11,color:C.t3}}>Lv.{lvl} {levelInfo.tier} · {curPath?.label}</div>
                </div>
                <Settings size={15} color={C.t3}/>
              </div>
              <Bar pct={levelInfo.pct} color={accent} h={3} glow/>
              {streak>0&&<div style={{...R({gap:6,marginTop:8})}}><span style={pill(C.amberDim,C.amberL,{fontSize:10})}><Flame size={10}/>{streak}d streak</span></div>}
            </div>
            <nav style={{flex:1,padding:'8px 10px',overflowY:'auto'}}>
              {NAV.map(n=>{
                const active=tab===n.id;
                const badge=n.id==='prep'&&dueCards>0?dueCards:null;
                return(
                  <motion.div key={n.id} data-tour={`nav-${n.id}`} whileHover={{background:active?`${accent}22`:'rgba(255,255,255,0.04)',x:2}} onClick={()=>{setTab(n.id);play('click');}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,cursor:'pointer',marginBottom:2,background:active?`${accent}18`:undefined,color:active?'#fff':C.t2,fontWeight:active?700:500,fontSize:14,fontFamily:C.FB,borderLeft:active?`2px solid ${accent}`:'2px solid transparent',transition:'all .2s'}}>
                    <n.ic size={17} style={{opacity:active?1:0.7}}/><span style={{flex:1}}>{n.label}</span>
                    {badge&&<span style={pill(C.amberDim,C.amberL,{fontSize:9,padding:'1px 7px'})}>{badge}</span>}
                  </motion.div>
                );
              })}
            </nav>
          </aside>
        )}

        {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
        <main style={{flex:1,overflowY:'auto',position:'relative',background:C.bg,paddingBottom:isMobile?80:0}}>
          {!isMobile && <div style={{position:'sticky',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${accent}50,${C.cyan}20,transparent)`,zIndex:5}}/>}
          {/* 1440px used to cap this well inside a typical 1920px laptop/monitor viewport (minus
              the 236px sidebar), leaving a large, unused gutter on both sides that only grew on
              bigger screens. Raised so ordinary desktop/laptop viewports use their full width;
              content that genuinely needs a narrower reading measure (lesson articles, essay
              editor, etc.) already caps itself internally rather than relying on this wrapper. */}
          <div style={{maxWidth:isMobile?'none':'min(1760px, 100%)',margin:'0 auto',padding:isMobile?'20px 16px 40px':'30px 40px 70px'}}>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.22}}>
                {(tRenders[tab]||tHome)()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* ══ BOTTOM NAV (Mobile) ══════════════════════════════════════════════ */}
        {isMobile && (
          <nav style={{position:'fixed',bottom:0,left:0,right:0,height:64,background:C.s0,borderTop:`1px solid ${C.b1}`,display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:300,paddingBottom:'env(safe-area-inset-bottom)'}}>
            {NAV.map(n=>{
              const badge=n.id==='prep'&&dueCards>0?dueCards:null;
              return(
                <div key={n.id} data-tour={`nav-${n.id}`} onClick={()=>setTab(n.id)} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:tab===n.id?accent:C.t3,cursor:'pointer',width:70}}>
                  <n.ic size={20} color={tab===n.id?accent:C.t3}/>
                  <span style={{fontSize:10,fontWeight:600}}>{n.label}</span>
                  {badge&&<span style={{position:'absolute',top:-4,right:14,...pill(C.amberDim,C.amberL,{fontSize:9,padding:'0 5px'})}}>{badge}</span>}
                </div>
              );
            })}
          </nav>
        )}

        {/* ══ QUICK-SWITCH COMMAND PALETTE (⌘K) ═══════════════════════════════════ */}
        <AnimatePresence>
          {cmdOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setCmdOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:500,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:isMobile?60:'12vh'}}>
              <motion.div initial={{opacity:0,y:-10,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10,scale:.98}} transition={{duration:.16}}
                style={{width:'min(520px,92vw)',maxHeight:'64vh',display:'flex',flexDirection:'column',background:C.s1,borderRadius:16,border:`1px solid ${C.b2}`,boxShadow:'0 24px 70px rgba(0,0,0,0.65)',overflow:'hidden'}}
                onClick={e=>e.stopPropagation()}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:`1px solid ${C.b1}`}}>
                  <Search size={16} color={C.t3}/>
                  <input autoFocus value={cmdQ} onChange={e=>setCmdQ(e.target.value)} placeholder="Jump to Prep, Portfolio, Progress…" style={{flex:1,background:'none',border:'none',outline:'none',color:C.t1,fontSize:14,fontFamily:C.FB}}/>
                  <span style={{...pill(C.s3,C.t3,{fontSize:9,fontFamily:C.FM})}}>ESC</span>
                </div>
                <div style={{overflowY:'auto',padding:8}}>
                  {filteredCmds.length===0&&<div style={{padding:'24px 12px',textAlign:'center',fontSize:12.5,color:C.t3}}>No matches — try a different word.</div>}
                  {['Jump to','Prep','Portfolio'].map(group=>{
                    const items=filteredCmds.filter(c=>c.group===group);
                    if(!items.length)return null;
                    return(
                      <div key={group} style={{marginBottom:6}}>
                        <div style={{fontSize:9.5,fontWeight:700,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase',padding:'8px 10px 4px'}}>{group}</div>
                        {items.map(cmd=>(
                          <motion.div key={cmd.id} whileHover={{background:'rgba(255,255,255,0.05)'}} onClick={()=>runCommand(cmd)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:9,cursor:'pointer',color:C.t1,fontSize:13}}>
                            <cmd.ic size={15} color={accent}/><span style={{flex:1}}>{cmd.label}</span><ChevronRight size={13} color={C.t4}/>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ POST-ONBOARDING PRODUCT TOUR ═════════════════════════════════════ */}
        {tourActive && <AppTour steps={TOUR_STEPS} onFinish={finishTour} onSkip={finishTour}/>}
      </div>
    </ErrorBoundary>
  );
}
