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
//
// The two-column "they'd see / they'd never see" block is the design load here: this is a privacy
// decision made by a fifteen-year-old, and the honest way to present it is as a ledger with both
// sides visible at once, not as a paragraph they have to parse.
import React, { useState } from 'react';
import { StepHeader, ContinueButton, TextLink, Icon, useViewport, flowHue, C } from '../primitives';
import { hue, R, meta, body, focusRing, panel } from '../design';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SHARED = 'Study days, XP, lessons passed, quiz averages and practice-test scores.';
const PRIVATE = 'Never your Medabrain chats, your notes, or your essay drafts.';

export function FamilyStep({ value, onChange, onNext, h }) {
  const g = h || flowHue();
  const { isMobile } = useViewport();
  const [touched, setTouched] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const email = value.parentInviteEmail || '';
  const invalid = touched && email.trim() && !EMAIL_RE.test(email.trim());

  const yes = hue(['emerald', 'teal']);
  const no = hue(['indigo', 'violet']);

  return (
    <>
      <StepHeader
        eyebrow="Your people" icon="family" h={g}
        title="Want a parent to be able to see how it's going?"
        subtitle="Completely optional, and you can turn it on or off later in Settings. Plenty of students skip this."
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* The ledger. Both sides, same weight, side by side where there's room. */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
          {[
            { g: yes, icon: 'shield-check', t: "They'd see", b: SHARED },
            { g: no, icon: 'eye-off', t: "They'd never see", b: PRIVATE },
          ].map(({ g: cg, icon, t, b }) => (
            <div key={t} style={{
              padding: '16px 16px', borderRadius: R.md,
              background: `linear-gradient(150deg, ${cg.softer}, transparent 70%), ${C.surf}`,
              border: `1px solid ${cg.edgeSoft}`, boxShadow: C.shadowSm,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cg.soft, border: `1px solid ${cg.edgeSoft}`, color: cg.ink,
                }}><Icon name={icon} size={15} /></span>
                <span style={meta(9.5, { color: cg.ink })}>{t}</span>
              </div>
              <p style={body(12.5, { margin: 0, color: C.t2 })}>{b}</p>
            </div>
          ))}
        </div>

        <div>
          <label style={{ ...meta(9.5, { color: C.t3 }), display: 'block', marginBottom: 8 }}>
            Their email address
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', color: focusField === 'email' ? g.ink : C.t3, pointerEvents: 'none', transition: 'color .18s',
            }}><Icon name="mail" size={16} /></span>
            <input
              type="email" inputMode="email" autoComplete="off" value={email}
              onChange={(e) => onChange({ parentInviteEmail: e.target.value })}
              onFocus={() => setFocusField('email')}
              onBlur={() => { setFocusField(null); setTouched(true); }}
              placeholder="parent@example.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 12px 12px 40px', borderRadius: R.md, fontSize: 14,
                background: C.inputBg, color: C.t1, fontFamily: C.FB, outline: 'none',
                border: `1px solid ${invalid ? C.rose : focusField === 'email' ? g.edge : C.inputBorder}`,
                transition: 'border-color .18s',
                ...(focusField === 'email' && !invalid ? focusRing(g) : null),
              }}
            />
          </div>
          {invalid && <div style={{ fontSize: 12, color: C.roseL, marginTop: 8 }}>That doesn't look like an email address.</div>}
          <p style={body(12, { marginTop: 8, marginBottom: 0, color: C.t3 })}>
            We'll send them one request after your account is created. They have to make their own
            parent account and say who they are — they never sign in as you, and nothing is shared
            until you both agree.
          </p>
        </div>

        <div>
          <label style={{ ...meta(9.5, { color: C.t3 }), display: 'block', marginBottom: 8 }}>
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
                    padding: '8px 16px', borderRadius: R.pill, cursor: 'pointer', fontSize: 13,
                    fontFamily: C.FB, fontWeight: on ? 700 : 500,
                    background: on ? `linear-gradient(135deg, ${g.soft}, ${g.softer})` : C.surf,
                    border: `1px solid ${on ? g.edge : C.b1}`,
                    color: on ? C.t1 : C.t2,
                    transition: 'background .18s, border-color .18s',
                  }}
                >{rel}</button>
              );
            })}
          </div>
        </div>
      </div>

      <ContinueButton onClick={() => { setTouched(true); if (!invalid) onNext(); }} h={g}>
        {email.trim() ? 'Send them a request' : 'Continue'}
      </ContinueButton>
      {/* An explicit, equally-weighted way out. A skip link that looks like an afterthought is a
          dark pattern with better manners. */}
      <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
        <TextLink onClick={() => { onChange({ parentInviteEmail: '', parentRelationship: '' }); onNext(); }}>
          Not right now
        </TextLink>
      </div>
    </>
  );
}

export default FamilyStep;
