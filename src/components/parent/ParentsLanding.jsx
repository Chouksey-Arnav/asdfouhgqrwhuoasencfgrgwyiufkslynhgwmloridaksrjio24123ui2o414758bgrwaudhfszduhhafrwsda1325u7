// /parents — the public page for parents.
//
// ── Why this page exists ────────────────────────────────────────────────────
// The parent dashboard was, until now, undiscoverable. It was real, it worked, and the only ways
// to reach it were: be sent an invitation by a student who already knew the feature existed, or
// notice a second option inside a role picker on the sign-up form. A parent who typed the site
// into their phone and looked for "how do I see how my daughter is doing" found a marketing page
// about the SAT and no answer.
//
// So there is a page now, at a URL a person can be told over the phone, and it is public in
// exactly the sense the legal documents are: it renders for someone signed out, someone signed
// in as a student, and a crawler. A parent deciding whether to make an account has to be able to
// read what the account does — including everything it deliberately cannot do — before making
// one, and a page you have to sign up to read cannot answer the question that decides whether to
// sign up.
//
// It states the limits as prominently as the features on purpose. "You will not see their essays
// or their coach conversations" is not fine print here; it is the product, and it is also the
// sentence that gets a sceptical sixteen-year-old to accept the request.
import React from 'react';
import {
  ShieldCheck, Eye, EyeOff, ArrowRight, Users, LineChart, Brain, CalendarDays, Mail, Lock, LogIn,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, CC, R, tint, onTint } from '../../lib/theme';
import { AUTH_VIEWS, LEGAL_VIEWS } from '../../lib/routes';
import { isPlainLeftClick } from '../../lib/useAppRouter';
import AnimatedLogo from '../AnimatedLogo';
import ThemeToggle from '../ThemeToggle';

const SHOWS = [
  { icon: CalendarDays, hue: () => C.green, title: 'Whether they are actually showing up', body: 'Study days across the last eight weeks, this week against the last four, and the current streak — the shape of the gaps, not just a number.' },
  { icon: LineChart, hue: () => C.blue, title: 'Whether it is working', body: 'Lessons passed, quiz averages and how the recent ones compare with the earlier ones, plus every practice-test score and the change since the last.' },
  { icon: Brain, hue: () => C.violet, title: 'What that means, in words', body: 'A plain-language read on the week — including when the honest version is "not much happened", which we say as a fact and never as a verdict about your child.' },
];

const NEVER = [
  'Their conversations with the AI coach',
  'Lesson notes and anything they highlighted',
  'Essay drafts and application writing',
  'Individual quiz answers or what they got wrong',
];

const STEPS = [
  { n: '1', title: 'Create a parent account', body: 'Your own account with your own email — never your student’s login. It takes a minute and asks who you are, how you are related, and a number we can reach you on.' },
  { n: '2', title: 'Send a request to your student', body: 'Addressed to the email they use to sign in. It names you and states exactly what would be shared and what would not.' },
  { n: '3', title: 'They accept — or they don’t', body: 'Nothing about them reaches you until they say yes from their own inbox. Either of you can end it afterwards, in one tap, and it takes effect immediately.' },
];

/** Cards that reflow by available width rather than by a breakpoint guess. */
const autoGrid = (min = 240, gap = 14) => ({
  display: 'grid', gap, gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`,
});

function Section({ children, style }) {
  return <section style={{ maxWidth: 880, margin: '0 auto', padding: '0 20px', ...style }}>{children}</section>;
}

/**
 * @param {object}   props
 * @param {Function} props.onSignUp    open the parent sign-up screen
 * @param {Function} props.onLogin     open the parent sign-in screen
 * @param {Function} props.onHome      back to the main landing page
 * @param {Function} props.onOpenLegal in-app navigation to a legal document
 * @param {string}   props.themeMode
 * @param {Function} props.onThemeChange
 */
export default function ParentsLanding({ onSignUp, onLogin, onHome, onOpenLegal, themeMode, onThemeChange }) {
  const legalLink = (path) => (e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenLegal?.(path); };
  const nav = (fn) => (e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); fn?.(); };

  return (
    // flex:1 + its own scroller, because #root is a flex row with overflow:hidden (see
    // src/index.css): a plain block child sizes to its content — leaving the page pinned to a
    // 900px column with the rest of the window painted in the app's background — and anything
    // taller than the viewport simply cannot be scrolled to.
    <div style={{ flex: 1, minWidth: 0, height: 'var(--msp-vh)', overflowY: 'auto', background: C.bg }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: C.surf, borderBottom: `1px solid ${C.b1}`,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '12px 20px', ...R({ gap: 12 }) }}>
          <a href="/" onClick={nav(onHome)} style={{ ...R({ gap: 10 }), textDecoration: 'none', marginRight: 'auto' }}>
            <AnimatedLogo size={28} variant="pop" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>MedSchoolPrep</div>
              <div style={{ fontSize: 10, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>For parents</div>
            </div>
          </a>
          <ThemeToggle mode={themeMode} onChange={onThemeChange} align="right" />
          <a href={AUTH_VIEWS.parentLogin} onClick={nav(onLogin)} style={{ ...btnG({ fontSize: 12.5, padding: '8px 14px' }), textDecoration: 'none' }}>
            <LogIn size={13} /> Parent sign-in
          </a>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <Section style={{ paddingTop: 48, paddingBottom: 36 }}>
        <div style={CC({ gap: 18 })}>
          <span style={{
            ...R({ gap: 7 }), width: 'fit-content', padding: '6px 13px', borderRadius: 999,
            background: tint(C.violet, 0.11), border: `1px solid ${tint(C.violet, 0.3)}`,
            fontSize: 12, fontWeight: 700, color: C.violetL,
          }}>
            <Users size={13} /> Parent dashboard
          </span>
          <h1 style={{
            fontSize: 'clamp(30px,5.2vw,46px)', lineHeight: 1.08, letterSpacing: '-.03em',
            fontFamily: C.FD, fontWeight: 800, color: C.t1, margin: 0,
          }}>
            See how they're doing.<br />
            <span style={{
              backgroundImage: `linear-gradient(120deg,${C.violetL} 0%,${C.blueL} 60%,${C.cyanL} 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>Without reading over their shoulder.</span>
          </h1>
          <p style={{ fontSize: 16, color: C.t2, lineHeight: 1.65, maxWidth: 620, margin: 0 }}>
            A parent account of your own, showing effort and results for the student who invites
            you — study days, lessons passed, quiz averages, practice-test scores, and a plain
            read on the week. Their notes, essays and coach conversations stay theirs.
          </p>
          <div style={R({ gap: 10, flexWrap: 'wrap', marginTop: 4 })}>
            <a href={AUTH_VIEWS.parentSignup} onClick={nav(onSignUp)} style={{ ...btn(C.blueGrad, { fontSize: 14, padding: '12px 22px' }), textDecoration: 'none' }}>
              Create a parent account <ArrowRight size={15} />
            </a>
            <a href={AUTH_VIEWS.parentLogin} onClick={nav(onLogin)} style={{ ...btnG({ fontSize: 14, padding: '12px 22px' }), textDecoration: 'none' }}>
              I already have one
            </a>
          </div>
          <div style={{ ...R({ gap: 7 }), fontSize: 12.5, color: C.t3 }}>
            <Lock size={13} /> Free. You never sign in as your student, and you never see their password.
          </div>
        </div>
      </Section>

      {/* ── What you see ───────────────────────────────────────────────────── */}
      <Section style={{ paddingTop: 8, paddingBottom: 36 }}>
        <h2 style={{ fontSize: 22, fontFamily: C.FD, fontWeight: 800, color: C.t1, margin: '0 0 16px' }}>
          What the dashboard shows you
        </h2>
        <div style={autoGrid(250)}>
          {SHOWS.map(({ icon: Icon, hue, title, body }) => {
            const c = hue();
            return (
              <div key={title} style={glass({ padding: 20, ...CC({ gap: 10 }) })}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: tint(c, 0.13), border: `1px solid ${tint(c, 0.3)}`,
                }}>
                  <Icon size={16} color={c} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.3 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{body}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── What you don't ─────────────────────────────────────────────────── */}
      <Section style={{ paddingBottom: 36 }}>
        <div style={glass({ padding: 24, ...CC({ gap: 14 }) })}>
          <div style={R({ gap: 9 })}>
            <EyeOff size={16} color={C.t3} />
            <h2 style={{ fontSize: 19, fontFamily: C.FD, fontWeight: 800, color: C.t1, margin: 0 }}>
              What you will never see
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.65, margin: 0 }}>
            Not a setting, and not something we ask you to promise — the parent view is built from
            an allowlist of progress fields, so these are not sent to your browser at all. That
            boundary is why students agree to share the rest of it, and why the app stays somewhere
            they will think out loud.
          </p>
          <div style={autoGrid(260, 10)}>
            {NEVER.map((item) => (
              <div key={item} style={glass2({ ...R({ gap: 9, alignItems: 'flex-start' }) })}>
                <EyeOff size={14} color={C.t3} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <Section style={{ paddingBottom: 36 }}>
        <h2 style={{ fontSize: 22, fontFamily: C.FD, fontWeight: 800, color: C.t1, margin: '0 0 16px' }}>
          How you get connected
        </h2>
        <div style={CC({ gap: 12 })}>
          {STEPS.map(({ n, title, body }) => (
            <div key={n} style={glass({ padding: 18, ...R({ gap: 14, alignItems: 'flex-start' }) })}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: C.FD, fontWeight: 800, fontSize: 14,
                background: tint(C.blue, 0.14), border: `1px solid ${tint(C.blue, 0.32)}`, color: onTint(C.blue),
              }}>{n}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginTop: 4 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={glass2({ ...R({ gap: 10, alignItems: 'flex-start' }), marginTop: 12 })}>
          <ShieldCheck size={15} color={C.greenL} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
            Because access depends on the student accepting from their own mailbox, knowing a
            student's name or email is never enough to see anything about them — and the details
            you give us are shown to them, so a request from someone they don't know is obvious at
            a glance.
          </div>
        </div>
      </Section>

      {/* ── Already invited ────────────────────────────────────────────────── */}
      <Section style={{ paddingBottom: 44 }}>
        <div style={glass({ padding: 24, ...CC({ gap: 12 }), background: `linear-gradient(135deg,${tint(C.blue, 0.08)},transparent 65%)`, borderColor: tint(C.blue, 0.26) })}>
          <div style={R({ gap: 9 })}>
            <Mail size={16} color={C.blueL} />
            <h2 style={{ fontSize: 18, fontFamily: C.FD, fontWeight: 800, color: C.t1, margin: 0 }}>
              Your student already sent you a link?
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.65, margin: 0 }}>
            Open the link in that email — it takes you straight to the request, and it will walk
            you through creating the account it needs. If you cannot find the email, ask them to
            resend it from Settings ▸ Family Access, or create your account here and send the
            request from your side instead.
          </p>
          <div style={R({ gap: 10, flexWrap: 'wrap' })}>
            <a href={AUTH_VIEWS.parentSignup} onClick={nav(onSignUp)} style={{ ...btn(C.blueGrad), textDecoration: 'none' }}>
              Create a parent account <ArrowRight size={14} />
            </a>
            <a href={AUTH_VIEWS.parentLogin} onClick={nav(onLogin)} style={{ ...btnG(), textDecoration: 'none' }}>
              <Eye size={13} /> Sign in to your dashboard
            </a>
          </div>
        </div>
      </Section>

      <footer style={{ borderTop: `1px solid ${C.b1}`, padding: '20px 0 40px' }}>
        <Section>
          <div style={R({ gap: 16, flexWrap: 'wrap' })}>
            <a href="/" onClick={nav(onHome)} style={{ fontSize: 12.5, color: C.t3, textDecoration: 'none' }}>MedSchoolPrep home</a>
            <a href={LEGAL_VIEWS.privacy} onClick={legalLink(LEGAL_VIEWS.privacy)} style={{ fontSize: 12.5, color: C.blueL, fontWeight: 600 }}>Privacy Policy</a>
            <a href={LEGAL_VIEWS.terms} onClick={legalLink(LEGAL_VIEWS.terms)} style={{ fontSize: 12.5, color: C.blueL, fontWeight: 600 }}>Terms of Service</a>
          </div>
        </Section>
      </footer>
    </div>
  );
}
