// Shared design tokens for standalone components (auth gate, new feature panels).
// Mirrors the palette defined inline in App.jsx so new UI matches the existing app.
export const C = {
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
  // ── Extended palette — a broader, brighter set so every surface can carry
  // its own identity instead of defaulting to blue-on-navy everywhere. ──
  cyanL:'#22d3ee', orangeL:'#fb923c', orangeDim:'rgba(249,115,22,0.10)',
  teal:'#14b8a6', tealL:'#2dd4bf', tealDim:'rgba(20,184,166,0.10)',
  indigo:'#6366f1', indigoL:'#818cf8', indigoDim:'rgba(99,102,241,0.10)',
  pink:'#ec4899', pinkL:'#f472b6', pinkDim:'rgba(236,72,153,0.10)',
  fuchsia:'#d946ef', fuchsiaL:'#e879f9', fuchsiaDim:'rgba(217,70,239,0.10)',
  lime:'#84cc16', limeL:'#a3e635', limeDim:'rgba(132,204,22,0.10)',
  sky:'#0ea5e9', skyL:'#38bdf8', skyDim:'rgba(14,165,233,0.10)',
  emerald:'#059669', emeraldL:'#34d399', emeraldDim:'rgba(5,150,105,0.10)',
  red:'#ef4444', redL:'#f87171', redDim:'rgba(239,68,68,0.10)',
  gold:'#eab308', goldL:'#facc15', goldDim:'rgba(234,179,8,0.10)',
  // Signature multi-stop gradients used for hero surfaces and headline accents.
  auroraGrad:'linear-gradient(120deg,#2d7fff 0%,#8b5cf6 45%,#ec4899 100%)',
  oceanGrad:'linear-gradient(135deg,#06b6d4 0%,#2d7fff 60%,#6366f1 100%)',
  sunsetGrad:'linear-gradient(135deg,#f59e0b 0%,#f43f5e 55%,#d946ef 100%)',
  forestGrad:'linear-gradient(135deg,#10b981 0%,#14b8a6 55%,#0ea5e9 100%)',
  violetGrad:'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)',
  FD:"'Bricolage Grotesque',-apple-system,sans-serif",
  FB:"'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  FM:"'JetBrains Mono','SF Mono',monospace",
};

// ── Category identity map ──────────────────────────────────────────────────
// Each E-Library / study category gets its own colour, soft tint, and gradient
// so cards, badges and section headers are instantly recognisable at a glance
// instead of every chip being the same blue. `emoji` gives a quick visual key
// where an icon component isn't wired in.
export const CAT_META = {
  'Life Sciences':                 { color:C.green,   light:C.greenL,   dim:C.greenDim,   grad:C.forestGrad, emoji:'🧬' },
  'Physical Sciences':             { color:C.cyan,    light:C.cyanL,    dim:C.cyanDim,    grad:C.oceanGrad,  emoji:'⚗️' },
  'Behavioral & Social Sciences':  { color:C.pink,    light:C.pinkL,    dim:C.pinkDim,    grad:C.sunsetGrad, emoji:'🧠' },
  'Research Methods':              { color:C.violet,  light:C.violetL,  dim:C.violetDim,  grad:C.violetGrad, emoji:'🔬' },
  'Test Prep':                     { color:C.amber,   light:C.amberL,   dim:C.amberDim,   grad:C.sunsetGrad, emoji:'📝' },
  'Admissions & Planning':         { color:C.blue,    light:C.blueL,    dim:C.blueDim,    grad:C.blueGrad,   emoji:'🎯' },
  'Clinical Exposure':             { color:C.rose,    light:C.roseL,    dim:C.roseDim,    grad:C.sunsetGrad, emoji:'🩺' },
  'Wellness & Balance':            { color:C.teal,    light:C.tealL,    dim:C.tealDim,    grad:C.forestGrad, emoji:'🌱' },
  'Math & Data':                   { color:C.indigo,  light:C.indigoL,  dim:C.indigoDim,  grad:C.oceanGrad,  emoji:'📊' },
};

// Safe accessor — unknown categories fall back to a neutral blue identity.
export const catMeta = (cat) => CAT_META[cat] || { color:C.blue, light:C.blueL, dim:C.blueDim, grad:C.blueGrad, emoji:'📚' };

// Turn any hex colour into a translucent rgba() tint at the given alpha.
// Handy for one-off "colour this to match its category" backgrounds/borders.
export const tint = (hex, a=0.12) => {
  const h = String(hex).replace('#','');
  if (h.length !== 6) return hex;
  const n = parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};

export const glass  = (x={}) => ({ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.b1}`, borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', ...x });
export const glass2 = (x={}) => ({ background:'rgba(255,255,255,0.025)', border:`1px solid ${C.b1}`, borderRadius:10, padding:14, ...x });
export const btn    = (bg=C.blueGrad,x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', borderRadius:9, border:'none', background:bg, color:'#fff', fontWeight:600, fontSize:13, fontFamily:C.FB, cursor:'pointer', letterSpacing:'.01em', boxShadow:bg===C.blueGrad?'0 4px 16px rgba(45,127,255,0.35),inset 0 1px 0 rgba(255,255,255,0.12)':'0 2px 8px rgba(0,0,0,0.3)', transition:'all .18s cubic-bezier(.16,1,.3,1)', ...x });
export const btnSm  = (bg='rgba(255,255,255,0.08)',x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 14px', borderRadius:7, border:`1px solid ${C.b1}`, background:bg, color:'#fff', fontWeight:600, fontSize:12, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const btnG   = (x={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:9, border:`1px solid rgba(255,255,255,0.1)`, background:'transparent', color:C.t2, fontWeight:500, fontSize:13, fontFamily:C.FB, cursor:'pointer', transition:'all .15s', ...x });
export const inp    = (x={}) => ({ background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.1)`, borderRadius:10, padding:'10px 14px', color:C.t1, fontSize:13, fontFamily:C.FB, outline:'none', width:'100%', transition:'border-color .15s,box-shadow .15s', ...x });
export const lbl    = (x={}) => ({ fontSize:10, fontWeight:700, color:C.t3, letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:7, ...x });
export const R      = (x={}) => ({ display:'flex', alignItems:'center', gap:12, ...x });
export const CC     = (x={}) => ({ display:'flex', flexDirection:'column', gap:12, ...x });
export const G      = (cols=2,gap=14,x={},m=false) => ({ display:'grid', gridTemplateColumns:m?(cols<=2?'1fr':'repeat(2,1fr)'):`repeat(${cols},1fr)`, gap, ...x });
export const pill   = (bg,color,x={}) => ({ display:'inline-flex', alignItems:'center', padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'.04em', background:bg, color, ...x });
