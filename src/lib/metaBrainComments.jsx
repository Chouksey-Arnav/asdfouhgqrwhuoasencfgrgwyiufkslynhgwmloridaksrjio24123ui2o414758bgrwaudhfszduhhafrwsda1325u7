// ─────────────────────────────────────────────────────────────────────────────
// Meta Brain micro-commentary — the small, instant reaction that fires right
// after a student updates something in Portfolio, so the AI feels like it's
// actually paying attention to the tracker rather than only showing up when
// summoned. Deliberately template-based and instant (zero network calls): a
// real Groq call on every keystroke/save would be slow, rate-limited, and
// mostly wasted on one-liners nobody needed AI reasoning for. The deeper,
// grounded reasoning lives in the Ask Meta Brain sidebar (PortfolioMetaBrain.jsx)
// and the Deadlines priority summary, both of which DO call purpose:'portfolio'.
import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { C, tint } from './theme';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Each entry is a function of `payload` so lines can reference what was just
// added (a school name, an hour count, etc.) without a template-string engine.
const BANK = {
  college_added: (p) => pick([
    `${p.name} is on the list. Reach, target, or safety — either way, get its EA/ED deadline into the checklist while it's top of mind.`,
    `Added ${p.name}. One more data point for "which colleges fit me" — ask any time from the Meta Brain tab.`,
    `${p.name} tracked. Once it has a category, I can weigh in on whether your list is balanced across reach/target/safety.`,
  ]),
  deadline_added: (p) => pick([
    `"${p.title}" is now counting down. I'll factor it into what I flag as urgent.`,
    `Got it — "${p.title}" locked in. Nice to see this filling out instead of living in your head.`,
  ]),
  deadline_auto_suggested_added: (p) => pick([
    `Pulled "${p.title}" straight from your college list — one less date to remember by hand.`,
    `Auto-added "${p.title}" from what you've already tracked. This is what "the app knows my portfolio" actually looks like.`,
  ]),
  essay_started: (p) => pick([
    `New essay draft started${p.title ? `: "${p.title}"` : ''}. First drafts are supposed to be rough — just get words down.`,
    `Essay workspace opened${p.title ? ` for "${p.title}"` : ''}. Ping the Meta Brain tab if you want a second pair of eyes once there's a draft.`,
  ]),
  essay_completed: (p) => pick([
    `"${p.title}" marked final. Worth a last read-aloud pass before it ships — typos hide from silent reading.`,
    `"${p.title}" is done. One more essay off the list — nice work seeing it through.`,
  ]),
  scholarship_added: (p) => pick([
    `${p.name} added to your tracker. Free money is still money — worth the application time.`,
    `Tracking ${p.name} now. If it has a real deadline, add it to Deadlines too so it doesn't slip.`,
  ]),
  scholarship_awarded: (p) => pick([
    `${p.name} — awarded. That's real money for real work. Genuinely nice going.`,
    `Won: ${p.name}. Log the amount if you haven't — your total is worth seeing add up.`,
  ]),
  activity_added: (p) => pick([
    `${p.position || 'Activity'} logged. Depth (what you actually did) reads stronger than a long list — the description field is worth filling in.`,
    `Added to your activities. If it involved leadership or measurable impact, that's exactly what belongs in the impact field.`,
  ]),
  research_added: (p) => pick([
    `${p.title} logged. Research is one of the strongest differentiators an application like yours can show — even one project counts.`,
    `Research entry saved. If this leads to a publication or poster, come back and drop the link in — it upgrades the entry a lot.`,
  ]),
  clinical_hours_logged: (p) => pick([
    `${p.hours}h at ${p.site} logged. Every hour here builds a track record admissions committees actually look for.`,
    `Hours added — running total is climbing. Consistency over time matters more than any single big day.`,
  ]),
  skill_added: (p) => pick([
    `${p.name} added. A dated, verifiable credential like this is worth more than a self-described skill — good instinct tracking it here.`,
  ]),
  recommender_added: (p) => pick([
    `${p.name} added to your recommenders. Ask early — a rushed letter is rarely a strong one.`,
  ]),
  award_added: (p) => pick([
    `${p.title} logged. Recognition like this is worth citing directly in essays and interviews — keep the details handy.`,
  ]),
  gpa_added: () => pick([
    `GPA entry saved. Watching this trend over terms tells a better story than any single number.`,
  ]),
  resume_exported: () => pick([
    `Resume exported. Worth a re-export any time you add something new — keep the copy on hand current.`,
  ]),
};

export function localComment(eventType, payload = {}) {
  const fn = BANK[eventType];
  if (!fn) return null;
  try { return fn(payload); } catch { return null; }
}

// A distinct visual identity from both the plain react-hot-toast success/error
// toasts and the amber achievement toast in App.jsx — violet/indigo, a Brain
// icon, and an explicit "Meta Brain" label, so a student learns to recognize
// "the AI just reacted to what I did" at a glance.
export function showMetaBrainToast(eventType, payload = {}) {
  const line = localComment(eventType, payload);
  if (!line) return;
  toast.custom((t) => (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, x: 20 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0.85, opacity: 0 }}
      style={{
        background: C.s1, border: `1px solid ${tint(C.violet, 0.35)}`, borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12, boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 0 1px ${tint(C.violet, 0.15)}`,
        maxWidth: 320, fontFamily: C.FB, cursor: 'pointer',
      }}
      onClick={() => toast.dismiss(t.id)}
    >
      <div style={{ width: 28, height: 28, borderRadius: 9, background: tint(C.violet, 0.2), border: `1px solid ${tint(C.violet, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Brain size={14} color={C.violetL} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: C.violetL, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 3 }}>Meta Brain</div>
        <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.5 }}>{line}</div>
      </div>
    </motion.div>
  ), { duration: 4200 });
}
