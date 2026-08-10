// "Do you want a parent to see this?" — asked once, during onboarding, and never nagged again.
//
// ── Why it belongs in the flow rather than only in Settings ─────────────────
// The parent dashboard existed for months and was, in practice, invisible: it could only be
// discovered by a student who scrolled to the bottom of their own Settings, or by a parent who
// guessed that a "parent account" was a thing. The people it was built for never met it.
//
// Onboarding is the one moment we have a student's full attention on the question of how this is
// going to work, so the offer goes here — stated as an option with an obvious "no", because a
// student who feels pushed into sharing their scores has been given a reason to distrust the
// whole app, and their honest use of the coach is worth more than a connected parent.
//
// The email is not sent from this screen. It becomes an invitation only after the account exists
// (see completeOnboarding in App.jsx), and the parent still has to create their own account and
// declare who they are before anything is shared — so a mistyped address costs nothing.
import React, { useState } from 'react';
import { Users, ShieldCheck, EyeOff, Mail } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C, tint } from '../primitives';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SHARED = 'Study days, XP, lessons passed, quiz averages and practice-test scores.';
const PRIVATE = 'Never your Medabrain chats, your notes, or your essay drafts.';

export function FamilyStep({ value, onChange, onNext, accent = C.violet }) {
  const [touched, setTouched] = useState(false);
  const email = value.parentInviteEmail || '';
  const invalid = touched && email.trim() && !EMAIL_RE.test(email.trim());

  return (
    <>
      <StepHeader
        eyebrow="Your people" emoji="👪" accent={accent}
        title="Want a parent to be able to see how it's going?"
        subtitle="Completely optional, and you can turn it on or off later in Settings. Plenty of students skip this."
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderRadius: 15, background: C.surf, border: `1px solid ${C.b1}` }}>
          {[
            { ic: ShieldCheck, hue: C.green, t: "They'd see", b: SHARED },
            { ic: EyeOff, hue: C.t3, t: "They'd never see", b: PRIVATE },
          ].map(({ ic: Ic, hue, t, b }) => (
            <div key={t} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(hue, 0.13), border: `1px solid ${tint(hue, 0.28)}` }}>
                <Ic size={13} color={hue} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1 }}>{t}</div>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginTop: 2 }}>{b}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Their email address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={15} color={C.t3} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email" inputMode="email" autoComplete="off" value={email}
              onChange={(e) => onChange({ parentInviteEmail: e.target.value })}
              onBlur={() => setTouched(true)}
              placeholder="parent@example.com"
              style={{
                width: '100%', padding: '13px 14px 13px 38px', borderRadius: 12, fontSize: 14,
                background: C.inputBg, color: C.t1, fontFamily: 'inherit', outline: 'none',
                border: `1px solid ${invalid ? C.rose : C.inputBorder}`,
              }}
            />
          </div>
          {invalid && <div style={{ fontSize: 12, color: C.roseL, marginTop: 7 }}>That doesn't look like an email address.</div>}
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55, marginTop: 8 }}>
            We'll send them one request after your account is created. They have to make their own
            parent account and say who they are — they never sign in as you, and nothing is shared
            until you both agree.
          </div>
        </div>

        <div>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            They're your…
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Mum', 'Dad', 'Guardian', 'Grandparent'].map((rel) => {
              const on = value.parentRelationship === rel;
              return (
                <button
                  key={rel} type="button" aria-pressed={on}
                  onClick={() => onChange({ parentRelationship: on ? '' : rel })}
                  style={{
                    padding: '8px 15px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                    fontFamily: 'inherit', fontWeight: on ? 700 : 500,
                    background: on ? tint(accent, 0.14) : C.surf,
                    border: `1px solid ${on ? tint(accent, 0.45) : C.b1}`,
                    color: on ? C.t1 : C.t2,
                  }}
                >{rel}</button>
              );
            })}
          </div>
        </div>
      </div>

      <ContinueButton
        onClick={() => { setTouched(true); if (!invalid) onNext(); }}
        icon={Users} accent={accent}
      >
        {email.trim() ? 'Send them a request' : 'Continue'}
      </ContinueButton>
      {/* An explicit, equally-weighted way out. A skip link that looks like an afterthought is a
          dark pattern with better manners. */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <TextLink onClick={() => { onChange({ parentInviteEmail: '', parentRelationship: '' }); onNext(); }}>
          Not right now
        </TextLink>
      </div>
    </>
  );
}

export default FamilyStep;
