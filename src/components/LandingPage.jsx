import React, { useEffect } from 'react';

// ── Reusable bits ─────────────────────────────────────────────────────────

function Logo({ size = 34, idPrefix = 'nav' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${idPrefix}bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#274873" /><stop offset="1" stopColor="#13233b" /></linearGradient>
        <linearGradient id={`${idPrefix}gold`} x1="50" y1="18" x2="50" y2="90" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#e3c47c" /><stop offset="1" stopColor="#b3894a" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill={`url(#${idPrefix}bg)`} />
      <path d="M50 21 L75 30.5 V54 C75 71 64.5 82 50 87 C35.5 82 25 71 25 54 V30.5 Z" fill="#ffffff" fillOpacity="0.06" stroke={`url(#${idPrefix}gold)`} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M50 47 V71 C46 67.5 41 65.5 34.5 65.5 V44 C41 44 46 45.5 50 47 Z" fill="#f4ecd8" fillOpacity="0.92" />
      <path d="M50 47 V71 C54 67.5 59 65.5 65.5 65.5 V44 C59 44 54 45.5 50 47 Z" fill="#f4ecd8" fillOpacity="0.75" />
      <path d="M50 47 V71" stroke="#13233b" strokeWidth="1.1" />
      <rect x="46.6" y="27" width="6.8" height="17" rx="1.2" fill={`url(#${idPrefix}gold)`} />
      <rect x="41.5" y="32.1" width="17" height="6.8" rx="1.2" fill={`url(#${idPrefix}gold)`} />
    </svg>
  );
}

function ArrowRight({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg>
  );
}

function Check({ size = 18, color = '#5da0ff' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0, marginTop: 1 }} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 13 9 18 20 6"></polyline></svg>
  );
}

function ShieldIcon({ size = 11 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L20 5.5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5.5 Z"></path><polyline points="8.5 12 11 14.5 15.5 9.5"></polyline></svg>
  );
}

const btnPrimary = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 26px', borderRadius: 14,
  background: 'linear-gradient(135deg,#2d7fff,#1d5fd9)', color: '#fff', fontSize: '15.5px', fontWeight: 700,
  boxShadow: '0 0 0 1px rgba(45,127,255,0.3),0 18px 44px -16px rgba(45,127,255,0.9)', border: 'none', cursor: 'pointer',
  fontFamily: "'Onest',-apple-system,BlinkMacSystemFont,sans-serif", ...extra,
});

const btnSecondary = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 26px', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.11)', background: 'rgba(255,255,255,0.03)', color: '#eef2ff',
  fontSize: '15.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Onest',-apple-system,BlinkMacSystemFont,sans-serif", ...extra,
});

const eyebrow = (color, dotColor, text) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
    {text}
  </span>
);

const pillTag = (bg, color, text, icon) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '6px 13px', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: bg, color }}>
    {icon}{text}
  </span>
);

const cardBase = { borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', padding: 22 };

// ── Data ─────────────────────────────────────────────────────────────────

const PATHWAYS = [
  { border: 'rgba(45,127,255,0.22)', bg: 'rgba(45,127,255,0.06)', tagBg: 'rgba(45,127,255,0.16)', tagColor: '#5da0ff', tag: 'MD', title: 'Physician', desc: 'Direct patient care, years of rigorous science.' },
  { border: 'rgba(16,185,129,0.22)', bg: 'rgba(16,185,129,0.06)', tagBg: 'rgba(16,185,129,0.16)', tagColor: '#34d399', tag: 'RN', title: 'Nursing', desc: 'Hands-on care, faster path, huge range of specialties.' },
  { border: 'rgba(139,92,246,0.22)', bg: 'rgba(139,92,246,0.06)', tagBg: 'rgba(139,92,246,0.16)', tagColor: '#a78bfa', tag: 'PA', title: 'Physician Assistant', desc: 'Broad clinical practice with more flexibility.' },
  { border: 'rgba(6,182,212,0.22)', bg: 'rgba(6,182,212,0.06)', tagBg: 'rgba(6,182,212,0.16)', tagColor: '#22d3ee', tag: 'Rx', title: 'Pharmacy', desc: 'Medication expertise at the center of every plan.' },
  { border: 'rgba(245,158,11,0.22)', bg: 'rgba(245,158,11,0.06)', tagBg: 'rgba(245,158,11,0.16)', tagColor: '#fbbf24', tag: 'DDS', title: 'Dentistry', desc: 'Surgical precision and your own practice, sooner.' },
  { border: 'rgba(244,63,94,0.22)', bg: 'rgba(244,63,94,0.06)', tagBg: 'rgba(244,63,94,0.16)', tagColor: '#fb7185', tag: 'PhD', title: 'Biomedical & Clinical Research', desc: 'Push the science forward, not just apply it.' },
  { border: 'rgba(45,127,255,0.22)', bg: 'rgba(45,127,255,0.06)', tagBg: 'rgba(45,127,255,0.16)', tagColor: '#5da0ff', tag: 'PT', title: 'Physical & Occupational Therapy', desc: 'Rebuild movement and independence, patient by patient.' },
  { border: 'rgba(16,185,129,0.22)', bg: 'rgba(16,185,129,0.06)', tagBg: 'rgba(16,185,129,0.16)', tagColor: '#34d399', tag: 'MPH', title: 'Public Health', desc: 'Prevent disease at population scale.' },
  { border: 'rgba(139,92,246,0.22)', bg: 'rgba(139,92,246,0.06)', tagBg: 'rgba(139,92,246,0.16)', tagColor: '#a78bfa', tag: 'MHA', title: 'Health Administration', desc: 'Run the systems that make medicine work.' },
  { border: 'rgba(255,255,255,0.11)', bg: 'rgba(255,255,255,0.03)', tagBg: 'rgba(255,255,255,0.06)', tagColor: '#94a3c0', tag: '?', title: 'Exploring', desc: 'Not sure yet? Start here — no pathway required.', bigTag: true },
];

const PORTFOLIO_TOOLS = [
  { bg: 'rgba(45,127,255,0.15)', color: '#5da0ff', letter: 'C', title: 'College List', desc: 'Schools tiered Likely / Target / Reach / Stretch against your GPA, scores, and hours.' },
  { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', letter: 'E', title: 'Essays', desc: 'A dedicated workspace for every supplement, from first draft to final.' },
  { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', letter: 'D', title: 'Deadlines', desc: "Every school's dates in one calendar, so nothing slips past you." },
  { bg: 'rgba(16,185,129,0.15)', color: '#34d399', letter: 'F', title: 'Financial Aid', desc: 'Track aid, scholarships, and what each school will really cost.' },
  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', letter: 'A', title: 'Activities & Resume', desc: 'Four years of activities, turned into an application-ready resume.' },
  { bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', letter: 'R', title: 'Research', desc: 'Log research experience the way admissions committees actually read it.' },
  { bg: 'rgba(45,127,255,0.15)', color: '#5da0ff', letter: 'S', title: 'Skills & Certifications', desc: 'Certifications and skills, tracked and ready to cite on any application.' },
  { bg: 'rgba(16,185,129,0.15)', color: '#34d399', letter: 'H', title: 'Clinical Hours', desc: 'Log shadowing and clinical hours the moment you earn them.' },
  { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', letter: 'U', title: 'Recommenders', desc: "Manage who's writing for you, and when each letter is due." },
  { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', letter: 'I', title: 'Interview Prep', desc: 'Real MMI and CASPer-style scenarios — not generic interview questions.' },
  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', letter: 'T', title: 'Test Scores', desc: 'Track every SAT/ACT attempt and watch your trajectory over time.' },
  { bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', letter: '%', title: 'Admissions Calculator', desc: 'A real-time estimate of where you stand for each school on your list.' },
];

const FAQS = [
  { q: 'What is MedSchoolPrep?', a: 'A free platform for high schoolers exploring a career in medicine. It combines a pathway diagnostic, verified lessons, spaced-repetition flashcards, an AI study coach, and a full college-application portfolio — everything from "which path fits me" to "what\'s due this week."' },
  { q: 'How does the pathway diagnostic work?', a: 'A short, scored quiz ranks how well you fit all 10 health career pathways — Physician, Nursing, PA, Pharmacy, Dentistry, and more — instead of assuming you\'ve already decided. You get a top match plus a full breakdown, and you can always explore any of the other nine.' },
  { q: 'Is it really free?', a: 'Yes — no paywall, no premium tier, no ads. Every pathway, lesson, flashcard deck, portfolio tool, and AI coach response is free to use, for good.' },
  { q: 'What does "verified" mean for a lesson?', a: "Every lesson ends with a real quiz. You need to score 70% or higher for it to count as verified — watching the article or video alone doesn't mark a lesson complete. It's the same bar used for pathway certificates." },
  { q: 'Do I need to already know I want to be a doctor?', a: 'No — that\'s exactly what the "Exploring" pathway and the diagnostic are for. Plenty of students start here undecided and get matched to nursing, PA, pharmacy, or something they hadn\'t considered.' },
  { q: 'Does it only cover becoming a physician?', a: 'No. Alongside Physician, there are full lesson tracks, quizzes, and application guidance for Nursing, Physician Assistant, Pharmacy, Dentistry, Biomedical & Clinical Research, Physical & Occupational Therapy, Public Health, and Health Administration.' },
];

// ── Page ─────────────────────────────────────────────────────────────────

export default function LandingPage({ onGetStarted }) {
  useEffect(() => {
    document.body.classList.add('msp-landing-active');
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.body.classList.remove('msp-landing-active');
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    };
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', background: '#04060b', color: '#eef2ff', fontFamily: "'Onest',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <style>{`
        @keyframes msp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .msp-landing a { color: #5da0ff; text-decoration: none; }
        .msp-landing a:hover { color: #93c5fd; }
        .msp-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .msp-btn-secondary:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); }
        .msp-nav-cta:hover { filter: brightness(1.1); }
        .msp-nav-link:hover { color: #eef2ff !important; }
      `}</style>

      <div className="msp-landing" style={{ position: 'relative' }}>

        {/* NAV */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,6,11,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Logo size={34} idPrefix="msplNav" />
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '16.5px', letterSpacing: '-0.01em', color: '#eef2ff' }}>MedSchoolPrep</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: '13.5px', fontWeight: 600, color: '#94a3c0', flexWrap: 'wrap' }}>
              <a className="msp-nav-link" href="#pathways" style={{ color: '#94a3c0' }}>Pathways</a>
              <a className="msp-nav-link" href="#learn" style={{ color: '#94a3c0' }}>Prep</a>
              <a className="msp-nav-link" href="#portfolio" style={{ color: '#94a3c0' }}>Portfolio</a>
              <a className="msp-nav-link" href="#faq" style={{ color: '#94a3c0' }}>FAQ</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={onGetStarted} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#94a3c0', fontFamily: 'inherit' }}>Sign in</button>
              <button className="msp-nav-cta" onClick={onGetStarted} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#2d7fff,#1d5fd9)', color: '#fff', fontSize: '13.5px', fontWeight: 700, boxShadow: '0 0 0 1px rgba(45,127,255,0.3),0 10px 26px -12px rgba(45,127,255,0.8)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header id="top" style={{ maxWidth: 840, margin: '0 auto', padding: 'clamp(48px,9vw,104px) 24px clamp(32px,6vw,56px)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, borderRadius: 999, border: '1px solid rgba(255,255,255,0.11)', background: 'rgba(255,255,255,0.03)', padding: '7px 16px 7px 8px', fontSize: '12.5px', fontWeight: 600, color: '#94a3c0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, background: 'rgba(45,127,255,0.15)', color: '#5da0ff', padding: '4px 10px', fontSize: 11, letterSpacing: '0.02em', fontWeight: 700 }}>
              <ShieldIcon size={11} />
              100% free
            </span>
            No paywall · No ads · Built for high schoolers
          </div>

          <h1 style={{ margin: '22px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.03, fontSize: 'clamp(36px,6.2vw,68px)', color: '#eef2ff' }}>
            Find your path into medicine.<br /><span style={{ backgroundImage: 'linear-gradient(135deg,#5da0ff,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Then actually walk it.</span>
          </h1>

          <p style={{ margin: '20px auto 0', maxWidth: '56ch', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.65, color: '#94a3c0' }}>
            MedSchoolPrep is the free platform that figures out which health career actually fits you — Physician, Nursing, PA, and seven more — then hands you verified lessons, spaced-repetition flashcards, an AI study coach, and the entire application portfolio to get there.
          </p>

          <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="msp-btn-primary" onClick={onGetStarted} style={btnPrimary()}>
              Get started free
              <ArrowRight size={16} />
            </button>
            <a className="msp-btn-secondary" href="#pathways" style={btnSecondary()}>
              See the 10 pathways
            </a>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: '#506080' }}>Sign in with just your email — a 6-digit code, no password to forget.</p>
        </header>

        {/* APP PREVIEW */}
        <div style={{ maxWidth: 1080, margin: '8px auto 0', padding: '0 24px' }}>
          <div style={{ borderRadius: 22, border: '1px solid rgba(255,255,255,0.11)', background: 'linear-gradient(180deg,#0a1020,#04060b)', boxShadow: '0 40px 120px -40px rgba(45,127,255,0.35),0 20px 60px -30px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,6,11,0.5)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <div style={{ margin: '0 auto', maxWidth: 260, flex: 1, textAlign: 'center', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', padding: '5px 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: '11.5px', color: '#506080' }}>medschoolprep.app/home</div>
              <div style={{ width: 50, flexShrink: 0 }} />
            </div>

            <div style={{ display: 'flex', minHeight: 460 }}>
              <aside style={{ width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0', borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(4,6,11,0.3)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2d7fff,#06b6d4)', marginBottom: 12 }} />
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(45,127,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5da0ff' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11 L12 4 L20 11 V20 H4 Z"></path></svg>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#506080' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><polygon points="15 9 13 13 9 15 11 11"></polygon></svg>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#506080' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5"></rect><line x1="9" y1="8" x2="9" y2="8.01"></line><line x1="15" y1="8" x2="15" y2="8.01"></line><line x1="9" y1="13" x2="9" y2="13.01"></line><line x1="15" y1="13" x2="15" y2="13.01"></line></svg>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#506080' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 L9 10 L13 14 L21 5"></path><polyline points="15 5 21 5 21 11"></polyline></svg>
                </div>
              </aside>

              <main style={{ flex: 1, minWidth: 0, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#eef2ff' }}>Good evening, Maya.</div>
                    <div style={{ fontSize: '12.5px', color: '#94a3c0', marginTop: 3 }}>Day 41 · Physician pathway · 3 verified lessons this week</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '5px 11px', fontSize: 11, fontWeight: 700 }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" stroke="none"><path d="M12 2c1 4-3 5-3 9a5 5 0 0 0 10 0c0-1.5-.5-2.5-1-3.3c0 2-1 2.8-2 2.8c1-3-1-6-4-8.5Z"></path></svg>
                      12-day streak
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, background: 'rgba(45,127,255,0.12)', border: '1px solid rgba(45,127,255,0.3)', color: '#5da0ff', padding: '5px 11px', fontSize: 11, fontWeight: 700 }}>Level 9</span>
                  </div>
                </div>

                <div style={{ borderRadius: 16, border: '1px solid rgba(45,127,255,0.25)', background: 'linear-gradient(120deg,rgba(45,127,255,0.14),rgba(15,24,40,0.4) 70%)', padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
                    <svg viewBox="0 0 96 96" width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#1d2a40" strokeWidth="8"></circle>
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#2d7fff" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="94"></circle>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: '#eef2ff' }}>63%</span>
                    </div>
                  </div>
                  <div style={{ minWidth: 180, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5da0ff' }}>Your pathway match</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#eef2ff', marginTop: 4 }}>Physician (MD/DO)</div>
                    <div style={{ fontSize: 12, color: '#94a3c0', marginTop: 5 }}>Diagnostic scored you across all 10 pathways — this one fits best.</div>
                  </div>
                </div>

                <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#506080' }}>Next lesson</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#34d399', padding: '3px 9px', fontSize: 10, fontWeight: 700 }}>
                      <ShieldIcon size={9} />
                      Verified quiz
                    </span>
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#eef2ff', marginTop: 8 }}>Organic Chemistry: Functional Groups</div>
                  <div style={{ fontSize: 12, color: '#94a3c0', marginTop: 3 }}>12 min article · 6 min video · pass at 70% to verify</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
                  <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 19, color: '#eef2ff' }}>3</div>
                    <div style={{ fontSize: '10.5px', color: '#94a3c0', marginTop: 2 }}>Deadlines this month</div>
                  </div>
                  <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 19, color: '#eef2ff' }}>2</div>
                    <div style={{ fontSize: '10.5px', color: '#94a3c0', marginTop: 2 }}>Essay drafts in progress</div>
                  </div>
                  <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 19, color: '#eef2ff' }}>86</div>
                    <div style={{ fontSize: '10.5px', color: '#94a3c0', marginTop: 2 }}>Clinical hours logged</div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>

        {/* MARQUEE */}
        <div style={{ marginTop: 56, overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '18px 0', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
          <div style={{ display: 'flex', width: 'max-content', gap: 44, whiteSpace: 'nowrap', fontSize: '14.5px', fontWeight: 600, color: 'rgba(148,163,192,0.85)', animation: 'msp-marquee 38s linear infinite' }}>
            {[0, 1].map((i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
                <span>10 career pathways</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>90+ verified lessons</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>Spaced-repetition flashcards</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>Metabrain AI coach</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>College list scored to your stats</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>MMI &amp; CASPer interview prep</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
                <span>100% free, always</span><span style={{ color: 'rgba(93,160,255,0.6)' }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* MANIFESTO */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px,8vw,96px) 24px' }}>
          <div style={{ maxWidth: 760 }}>
            {eyebrow('#5da0ff', '#2d7fff', 'Why it exists')}
            <h2 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, fontSize: 'clamp(28px,4.6vw,44px)', color: '#eef2ff' }}>Nobody tells high schoolers there are ten ways into medicine.</h2>
            <p style={{ marginTop: 18, fontSize: 17, lineHeight: 1.7, color: '#94a3c0' }}>Most students default to "pre-med" because it's the only path anyone mentioned — never hearing about PA, pharmacy, nursing, or public health until it's almost too late to pivot. And most prep tools reward watching a video, not knowing the material. MedSchoolPrep is built around a different idea:</p>
            <p style={{ marginTop: 18, fontSize: 23, fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.01em', color: '#eef2ff' }}>Find the right path first. Then prove you've actually learned it — <span style={{ backgroundImage: 'linear-gradient(135deg,#5da0ff,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>not just watched it.</span></p>
          </div>

          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <div style={cardBase}>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '15.5px', color: '#5da0ff' }}>Built for indecision</div>
              <p style={{ marginTop: 10, fontSize: '14.5px', lineHeight: 1.65, color: '#94a3c0' }}>The diagnostic scores you across all 10 pathways instead of assuming you've already picked one. You don't need to know yet — that's the point.</p>
            </div>
            <div style={cardBase}>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '15.5px', color: '#34d399' }}>Verified, not watched</div>
              <p style={{ marginTop: 10, fontSize: '14.5px', lineHeight: 1.65, color: '#94a3c0' }}>Every lesson ends in a real quiz at a 70% bar. Passive progress doesn't count here — mastery does.</p>
            </div>
            <div style={cardBase}>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '15.5px', color: '#fbbf24' }}>The whole application</div>
              <p style={{ marginTop: 10, fontSize: '14.5px', lineHeight: 1.65, color: '#94a3c0' }}>Essays, deadlines, recommenders, interviews — the parts of applying nobody actually walks you through, all in one place.</p>
            </div>
          </div>
        </section>

        {/* PATHWAYS */}
        <section id="pathways" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(45,127,255,0.05),transparent)' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px,8vw,96px) 24px' }}>
            <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
              {eyebrow('#5da0ff', '#2d7fff', 'The diagnostic')}
              <h2 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, fontSize: 'clamp(28px,4.6vw,44px)', color: '#eef2ff' }}>Take the quiz. Get matched to your pathway.</h2>
              <p style={{ marginTop: 16, fontSize: '16.5px', lineHeight: 1.7, color: '#94a3c0' }}>One diagnostic, scored against all ten routes into a health career — then a full lesson map, quiz library, and application checklist built specifically for that path.</p>
            </div>

            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
              {PATHWAYS.map((p) => (
                <div key={p.title} style={{ borderRadius: 16, border: `1px solid ${p.border}`, background: p.bg, padding: 20 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: p.tagBg, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: p.bigTag ? 15 : 13, color: p.tagColor }}>{p.tag}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#eef2ff', marginTop: 12 }}>{p.title}</div>
                  <div style={{ fontSize: '12.5px', color: '#94a3c0', marginTop: 5, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE: Learning Pathway */}
        <section id="learn" style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(64px,8vw,100px) 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px', minWidth: 300 }}>
              {pillTag('rgba(45,127,255,0.14)', '#5da0ff', 'Learning Pathway', (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6c3-1.4 6-1.4 8 0c2-1.4 5-1.4 8 0v12c-3-1.4-6-1.4-8 0c-2-1.4-5-1.4-8 0z"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
              ))}
              <h3 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, fontSize: 'clamp(24px,3.4vw,36px)', color: '#eef2ff' }}>Lessons that actually have to prove themselves.</h3>
              <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.7, color: '#94a3c0' }}>Every lesson pairs a written article with a topic-matched video, then locks the "done" checkmark behind a real verification quiz. Rewatching a video never counts as progress — passing at 70% does.</p>
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#5da0ff" />Article + video for every lesson, across all 10 pathways</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#5da0ff" />Pass a quiz at 70%+ to mark it verified, not just viewed</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#5da0ff" />Earn a certificate the moment you clear an entire pathway</li>
              </ul>
            </div>
            <div style={{ flex: '1 1 380px', minWidth: 300 }}>
              <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)', padding: 22 }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
                  <span style={{ height: 7, width: 18, borderRadius: 4, background: '#2d7fff' }} />
                  <span style={{ height: 7, width: 7, borderRadius: 4, background: '#1d2a40' }} />
                  <span style={{ height: 7, width: 7, borderRadius: 4, background: '#1d2a40' }} />
                  <span style={{ height: 7, width: 7, borderRadius: 4, background: '#1d2a40' }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#506080' }}>Unit 3 · Physician pathway</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#eef2ff', marginTop: 8 }}>Organic Chemistry: Functional Groups</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <span style={{ borderRadius: 999, background: '#162032', color: '#94a3c0', padding: '5px 11px', fontSize: 11 }}>12 min read</span>
                  <span style={{ borderRadius: 999, background: '#162032', color: '#94a3c0', padding: '5px 11px', fontSize: 11 }}>6 min video</span>
                  <span style={{ borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#34d399', padding: '5px 11px', fontSize: 11 }}>Verified quiz</span>
                </div>
                <div style={{ marginTop: 18, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: 14 }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#506080', marginBottom: 8 }}>What you'll learn</div>
                  <div style={{ fontSize: '12.5px', color: '#94a3c0', lineHeight: 1.6 }}>
                    – Identify the major functional groups in organic molecules<br />
                    – Predict reactivity from a group's structure<br />
                    – Connect functional groups to real biochemical pathways
                  </div>
                </div>
                <button style={{ marginTop: 16, width: '100%', padding: 13, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default' }}>
                  Start verification quiz
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE: Flashcards */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px clamp(64px,8vw,100px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap-reverse' }}>
            <div style={{ flex: '1 1 380px', minWidth: 300 }}>
              <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#eef2ff' }}>Cell Biology Deck</div>
                  <span style={{ borderRadius: 999, background: 'rgba(139,92,246,0.14)', color: '#a78bfa', padding: '4px 10px', fontSize: '10.5px', fontWeight: 700 }}>14 due today</span>
                </div>
                <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,rgba(139,92,246,0.16),rgba(15,24,40,0.5))', border: '1px solid rgba(139,92,246,0.28)', padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 12 }}>Front</div>
                  <div style={{ fontSize: '16.5px', fontWeight: 600, color: '#eef2ff', lineHeight: 1.5 }}>What organelle is responsible for ATP production in a eukaryotic cell?</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)', color: '#fb7185', fontSize: '12.5px', fontWeight: 700, cursor: 'default' }}>Again</button>
                  <button style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontSize: '12.5px', fontWeight: 700, cursor: 'default' }}>Hard</button>
                  <button style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#34d399', fontSize: '12.5px', fontWeight: 700, cursor: 'default' }}>Good</button>
                  <button style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(45,127,255,0.3)', background: 'rgba(45,127,255,0.1)', color: '#5da0ff', fontSize: '12.5px', fontWeight: 700, cursor: 'default' }}>Easy</button>
                </div>
                <div style={{ marginTop: 14, fontSize: 11, color: '#506080', textAlign: 'center' }}>Scheduled by FSRS — the same algorithm behind Anki.</div>
              </div>
            </div>
            <div style={{ flex: '1 1 420px', minWidth: 300 }}>
              {pillTag('rgba(139,92,246,0.14)', '#a78bfa', 'Flashcards', (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 3 21 8 12 13 3 8"></polygon><polyline points="3 13 12 18 21 13"></polyline></svg>
              ))}
              <h3 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, fontSize: 'clamp(24px,3.4vw,36px)', color: '#eef2ff' }}>Turn your own notes into a study system.</h3>
              <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.7, color: '#94a3c0' }}>Paste your class notes and the engine extracts flashcards straight from what's actually in them — nothing invented, nothing hallucinated. Then spaced repetition takes over and schedules every review for you.</p>
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#a78bfa" />Cards are extracted from your notes, not generated from nowhere</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#a78bfa" />FSRS spaced repetition — the same engine behind Anki</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#a78bfa" />Runs fully offline, right in your browser — no upload, no wait</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FEATURE: AI Coach */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px clamp(64px,8vw,100px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px', minWidth: 300 }}>
              {pillTag('rgba(6,182,212,0.14)', '#22d3ee', 'AI coach', (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8s-3.6 8-8 8c-1.3 0-2.5-.3-3.6-.9L4 20l1-4.6C4.4 14.3 4 13.2 4 12z"></path></svg>
              ))}
              <h3 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, fontSize: 'clamp(24px,3.4vw,36px)', color: '#eef2ff' }}>Stuck on a concept at 11pm? Ask Metabrain.</h3>
              <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.7, color: '#94a3c0' }}>Metabrain explains whatever's blocking you — a systems-of-equations problem, a shaky grasp of photosynthesis, an SAT section you keep missing — and builds you a study plan around it. Free, unlimited, no upsell.</p>
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#22d3ee" />Explains any concept, at whatever level you're actually at</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#22d3ee" />Builds a study schedule for the section you're behind on</li>
                <li style={{ display: 'flex', gap: 10, fontSize: '14.5px', color: 'rgba(238,242,255,0.9)' }}><Check color="#22d3ee" />Free with every response — no limits, no premium tier</li>
              </ul>
            </div>
            <div style={{ flex: '1 1 380px', minWidth: 300 }}>
              <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)', padding: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#506080', marginBottom: 14 }}>Metabrain 2.0</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '78%', borderRadius: '14px 14px 3px 14px', background: '#162032', padding: '11px 14px', fontSize: 13, color: '#eef2ff', lineHeight: 1.5 }}>What's high-yield for SAT Math I'm probably missing?</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
                  <div style={{ maxWidth: '82%', borderRadius: '14px 14px 14px 3px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.22)', padding: '11px 14px', fontSize: 13, color: '#eef2ff', lineHeight: 1.6 }}>Start with systems of equations and linear functions — they show up constantly and are the fastest points to lock in. Want a 2-week plan built around that?</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  <span style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#94a3c0', padding: '7px 13px', fontSize: 12 }}>Explain photosynthesis simply</span>
                  <span style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#94a3c0', padding: '7px 13px', fontSize: 12 }}>Build my ACT Science plan</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px,8vw,96px) 24px' }}>
            <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
              {pillTag('rgba(245,158,11,0.14)', '#fbbf24', 'Application portfolio', (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5"></rect><line x1="9" y1="8" x2="9" y2="8.01"></line><line x1="15" y1="8" x2="15" y2="8.01"></line><line x1="9" y1="13" x2="9" y2="13.01"></line><line x1="15" y1="13" x2="15" y2="13.01"></line></svg>
              ))}
              <h2 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, fontSize: 'clamp(28px,4.6vw,44px)', color: '#eef2ff' }}>Your entire application, actually organized.</h2>
              <p style={{ marginTop: 16, fontSize: '16.5px', lineHeight: 1.7, color: '#94a3c0' }}>Twelve tools, one place — from a college list scored against your real numbers to interview prep with real MMI and CASPer-style scenarios.</p>
            </div>

            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
              {PORTFOLIO_TOOLS.map((t) => (
                <div key={t.title} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{t.letter}</span>
                    <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#eef2ff' }}>{t.title}</span>
                  </div>
                  <p style={{ marginTop: 10, fontSize: '12.5px', lineHeight: 1.6, color: '#94a3c0' }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST / FREE */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(64px,8vw,100px) 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              {eyebrow('#34d399', '#10b981', 'Free, honestly')}
              <h2 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, fontSize: 'clamp(28px,4.6vw,44px)', color: '#eef2ff' }}>Completely free. No catch.</h2>
              <p style={{ marginTop: 16, fontSize: '16.5px', lineHeight: 1.7, color: '#94a3c0' }}>Every pathway, every lesson, every portfolio tool — unlocked from the day you sign in. No trial, no upgrade prompt waiting three lessons in.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              <div style={cardBase}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#eef2ff' }}>No paywall</div>
                <p style={{ marginTop: 8, fontSize: '12.5px', lineHeight: 1.6, color: '#94a3c0' }}>Every pathway, lesson, and tool, unlocked from day one.</p>
              </div>
              <div style={cardBase}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#eef2ff' }}>No ads</div>
                <p style={{ marginTop: 8, fontSize: '12.5px', lineHeight: 1.6, color: '#94a3c0' }}>Nothing competing for your attention while you study.</p>
              </div>
              <div style={cardBase}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#eef2ff' }}>Sign in with email</div>
                <p style={{ marginTop: 8, fontSize: '12.5px', lineHeight: 1.6, color: '#94a3c0' }}>A 6-digit code sent to your inbox — no password to forget.</p>
              </div>
              <div style={cardBase}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#eef2ff' }}>Your notes stay yours</div>
                <p style={{ marginTop: 8, fontSize: '12.5px', lineHeight: 1.6, color: '#94a3c0' }}>Flashcards are generated locally, right in your browser.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(56px,8vw,96px) 24px' }}>
            <div style={{ textAlign: 'center' }}>
              {eyebrow('#5da0ff', '#2d7fff', 'FAQ')}
              <h2 style={{ margin: '16px 0 0', fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, fontSize: 'clamp(26px,4vw,38px)', color: '#eef2ff' }}>Frequently asked questions</h2>
            </div>

            <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FAQS.map((f) => (
                <details key={f.q} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', padding: '18px 20px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '15.5px', color: '#eef2ff' }}>{f.q}</summary>
                  <p style={{ margin: '12px 0 0', fontSize: '14.5px', lineHeight: 1.7, color: '#94a3c0' }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(24px,4vw,40px) 24px clamp(72px,9vw,112px)', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, fontSize: 'clamp(30px,5.4vw,56px)', color: '#eef2ff' }}>Stop wondering if you're "pre-med enough."</h2>
          <p style={{ margin: '18px auto 0', maxWidth: '46ch', fontSize: 17, lineHeight: 1.7, color: '#94a3c0' }}>Take the diagnostic, get matched to your pathway, and start building the application that actually gets you in.</p>
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="msp-btn-primary" onClick={onGetStarted} style={btnPrimary({ padding: '16px 30px', fontSize: 16 })}>
              Get started free
              <ArrowRight size={16} />
            </button>
          </div>
          <p style={{ marginTop: 14, fontSize: '12.5px', color: '#506080' }}>No paywall. No credit card. No ads. Just a plan.</p>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Logo size={30} idPrefix="msplFt" />
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '14.5px', color: '#eef2ff' }}>MedSchoolPrep</div>
                <div style={{ fontSize: '11.5px', color: '#506080' }}>Your path into medicine.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13, color: '#94a3c0', flexWrap: 'wrap' }}>
              <a href="#pathways" style={{ color: '#94a3c0' }}>Pathways</a>
              <a href="#learn" style={{ color: '#94a3c0' }}>Prep</a>
              <a href="#portfolio" style={{ color: '#94a3c0' }}>Portfolio</a>
              <a href="#faq" style={{ color: '#94a3c0' }}>FAQ</a>
              <button onClick={onGetStarted} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3c0', fontSize: 13, fontFamily: 'inherit', padding: 0 }}>Sign in</button>
            </div>
            <p style={{ fontSize: '11.5px', color: '#506080', margin: 0 }}>Free forever · Built for high schoolers</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
