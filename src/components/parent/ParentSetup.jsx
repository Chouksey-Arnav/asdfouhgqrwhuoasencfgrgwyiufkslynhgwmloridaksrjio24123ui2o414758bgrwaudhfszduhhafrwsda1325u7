// /family/setup — the intake a parent account has to finish before it can do anything.
//
// ── Why a parent account has homework ───────────────────────────────────────
// Because "I know this student's name" was never enough to see their progress, and it must not
// look like it might be. The authorization boundary is, and remains, the student: an invitation
// goes to their own mailbox, nothing crosses until they click it, and either side can end it in
// one tap (see supabase/migrations/0006_parent_dashboard.sql).
//
// What this form adds is the thing that boundary could not provide on its own — an answer to
// "who is asking?". Until now an invitation arrived saying "a parent would like to follow your
// progress" over an unfamiliar email address, and a student had to make a privacy decision with
// nothing to judge. Now the request carries a name, a stated relationship, a reachable phone
// number, and the student's own name as the requester typed it, all under an explicit
// attestation. A request from someone a student does not know becomes visibly wrong at a glance,
// which is the only check in this system capable of catching impersonation, because it is the
// only one performed by someone who actually knows the family.
//
// ── Why three steps rather than one long form ───────────────────────────────
// Six fields and a legal attestation on one screen reads as a wall and gets filled in carelessly,
// which defeats the point: a name typed without thinking is not a claim anyone can check. Three
// short beats — you, your student, what you are signing — each with a reason stated above it,
// gets more accurate answers out of the same six inputs.
import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '../BrandJourney';
import toast from 'react-hot-toast';
import {
  Loader2, ShieldCheck, ArrowRight, ArrowLeft, UserCog, GraduationCap, Check, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, inp, lbl, CC, R, tint, onTint, CONTROL_TRANSITION } from '../../lib/theme';
import * as ParentAPI from '../../lib/parentApi';

const RELATIONSHIPS = ['Mother', 'Father', 'Stepmother', 'Stepfather', 'Grandparent', 'Legal guardian', 'Other'];
const GRADES = ['8th grade or below', '9th grade', '10th grade', '11th grade', '12th grade', 'Gap year'];

const STEPS = [
  { key: 'you', label: 'About you', icon: UserCog },
  { key: 'student', label: 'Your student', icon: GraduationCap },
  { key: 'confirm', label: 'Confirm', icon: ShieldCheck },
];

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label style={lbl({ marginBottom: 4 })}>{label}</label>
      {children}
      {hint && !error && <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: C.roseL, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

/** A row of tap targets for the short, closed-ish lists. Faster than a select, and legible. */
function Choices({ options, value, onChange, allowOther = true }) {
  const known = options.includes(value);
  const [other, setOther] = useState(!!value && !known);
  return (
    <div style={CC({ gap: 8 })}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const on = !other && value === opt;
          return (
            <button
              key={opt} type="button" aria-pressed={on}
              onClick={() => { setOther(false); onChange(opt); }}
              style={{
                padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5,
                fontFamily: C.FB, fontWeight: on ? 700 : 500,
                background: on ? tint(C.violet, 0.14) : C.surf2,
                border: `1px solid ${on ? tint(C.violet, 0.45) : C.b1}`,
                color: on ? C.t1 : C.t2,
              }}
            >{opt}</button>
          );
        })}
        {allowOther && (
          <button
            type="button" aria-pressed={other}
            onClick={() => { setOther(true); onChange(''); }}
            style={{
              padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5,
              fontFamily: C.FB, fontWeight: other ? 700 : 500,
              background: other ? tint(C.violet, 0.14) : C.surf2,
              border: `1px solid ${other ? tint(C.violet, 0.45) : C.b1}`,
              color: other ? C.t1 : C.t2,
            }}
          >Something else</button>
        )}
      </div>
      {other && (
        <input
          autoFocus value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="In your own words" maxLength={40} style={inp()}
        />
      )}
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object}   props.user       the signed-in parent account
 * @param {Function} props.onDone     called with the saved profile once it is complete
 * @param {Function} [props.onSkip]   shown only when a profile already exists (i.e. this is an edit)
 */
export default function ParentSetup({ user, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [attestation, setAttestation] = useState('');
  const [form, setForm] = useState({
    fullName: user?.name || '',
    relationship: '',
    phone: '',
    postalCode: '',
    studentFullName: '',
    studentGrade: '',
    attested: false,
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const load = useCallback(async () => {
    try {
      const { profile, attestation } = await ParentAPI.fetchProfile();
      if (attestation) setAttestation(attestation);
      // Editing rather than creating: prefill everything except the attestation, which has to be
      // given again for the details as they now stand. Carrying a tick across an edit would mean
      // the record says someone attested to a claim they never saw.
      if (profile) {
        setForm((f) => ({
          ...f,
          fullName: profile.fullName || f.fullName,
          relationship: profile.relationship || '',
          phone: profile.phone || '',
          postalCode: profile.postalCode || '',
          studentFullName: profile.studentFullName || '',
          studentGrade: profile.studentGrade || '',
          attested: false,
        }));
      }
    } catch {
      // The form still works — the server validates everything on save anyway, and refusing to
      // render an intake form because a prefill failed strands the account permanently.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side checks mirror the server's (api/_lib/parentProfile.js) purely so a mistake is
  // caught before a round trip; the server's copy is the one that decides.
  function localErrors(which) {
    const e = {};
    if (which === 'you' || which === 'all') {
      if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
      if (form.relationship.trim().length < 2) e.relationship = 'Tell us how you are related.';
      if (form.phone.trim().length < 7) e.phone = 'Enter a phone number we can reach you on.';
    }
    if (which === 'student' || which === 'all') {
      if (form.studentFullName.trim().length < 2) e.studentFullName = "Enter your student's full name.";
    }
    return e;
  }

  function advance() {
    const e = localErrors(STEPS[step].key);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    const e = localErrors('all');
    if (!form.attested) e.attested = 'You have to confirm this before we can set up your dashboard.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const { profile } = await ParentAPI.saveProfile(form);
      toast.success('Your parent account is set up.');
      onDone?.(profile);
    } catch (err) {
      // Field-level errors come back keyed, so they land on the input that is actually wrong
      // rather than as one banner over six untouched-looking fields.
      if (err.errors) {
        setErrors(err.errors);
        // Jump back to whichever step owns the first failure, or the message is invisible.
        if (err.errors.fullName || err.errors.relationship || err.errors.phone) setStep(0);
        else if (err.errors.studentFullName) setStep(1);
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48 }}>
        <BrandLoader size={150} caption="Setting up your family account…" />
      </div>
    );
  }

  const Icon = STEPS[step].icon;

  return (
    <div style={CC({ gap: 16 })}>
      <div style={glass({ ...CC({ gap: 4 }) })}>
        <div style={R({ gap: 12 })}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: tint(C.violet, 0.13), border: `1px solid ${tint(C.violet, 0.28)}`,
          }}>
            <Icon size={18} color={C.violet} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
              Step {step + 1} of {STEPS.length}
            </div>
            <div style={{ fontSize: 19, letterSpacing: 'calc(-0.23px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
              {step === 0 && 'Who you are'}
              {step === 1 && 'Who you are here for'}
              {step === 2 && 'Confirm and finish'}
            </div>
          </div>
        </div>

        {/* Segmented progress rather than a percentage: three named beats, and you can see which
            one you are in. Same reasoning as the student onboarding's chapter bar. */}
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: i <= step ? C.violet : C.b1,
              transition: 'background .25s',
            }} />
          ))}
        </div>
      </div>

      <div style={glass({ ...CC({ gap: 16 }) })}>
        {step === 0 && (
          <>
            <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
              Your student sees these details when your request reaches them. That is the whole
              point of asking: it is how they know the request is from you and not from a stranger
              who happened to learn their email address.
            </p>
            <Field label="Your full name" error={errors.fullName}
              hint="The name your student would recognise — this is what appears on the request.">
              <input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })}
                placeholder="e.g. Priya Shah" autoComplete="name" maxLength={120} style={inp()} />
            </Field>
            <Field label="Your relationship to them" error={errors.relationship}>
              <Choices options={RELATIONSHIPS} value={form.relationship} onChange={(v) => set({ relationship: v })} />
            </Field>
            <Field label="Phone number" error={errors.phone}
              hint="Used only if we ever need to reach you about this account or a dispute over it. It is never shown to your student and never used for marketing.">
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })}
                placeholder="+1 555 000 1234" autoComplete="tel" inputMode="tel" maxLength={24} style={inp()} />
            </Field>
            <Field label="Postal code" hint="Optional. Helps us match you to the right regional deadlines and scholarships.">
              <input value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })}
                placeholder="Optional" autoComplete="postal-code" maxLength={16} style={inp({ maxWidth: 220 })} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
              This does not connect you to them — only they can do that, by accepting a request
              sent to their own email address. What you type here is shown to them when it
              arrives, so they can see the request is meant for them.
            </p>
            <Field label="Your student's full name" error={errors.studentFullName}
              hint="As they would write it themselves.">
              <input value={form.studentFullName} onChange={(e) => set({ studentFullName: e.target.value })}
                placeholder="e.g. Alex Shah" maxLength={120} style={inp()} />
            </Field>
            <Field label="What year are they in?" hint="Optional — it helps us frame the dashboard around the right deadlines.">
              <Choices options={GRADES} value={form.studentGrade} onChange={(v) => set({ studentGrade: v })} allowOther={false} />
            </Field>
            <div style={glass2({ ...R({ gap: 8, alignItems: 'flex-start' }) })}>
              <Info size={15} color={C.blueL} style={{ flexShrink: 0, marginTop: 4 }} />
              <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
                You will invite them by email on the next screen. Nothing about them — not a
                streak, not a score, not whether they have an account at all — reaches you before
                they accept.
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={glass2({ ...CC({ gap: 8 }) })}>
              {[
                ['You', form.fullName],
                ['Relationship', form.relationship],
                ['Phone', form.phone],
                ['Student', form.studentFullName],
                ['Year', form.studentGrade || '—'],
                ['Account email', user?.email],
              ].map(([k, v]) => (
                <div key={k} style={R({ gap: 12, alignItems: 'baseline' })}>
                  <span style={{ fontSize: 11, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', width: 110, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13.5, color: C.t1, fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{v || '—'}</span>
                </div>
              ))}
            </div>

            {/* The attestation is a real control with real words above a real button, not a
                pre-ticked box in a footer. It is the difference between a form and an agreement,
                and it is the thing this whole flow exists to obtain. */}
            <button
              type="button" role="checkbox" aria-checked={form.attested}
              onClick={() => set({ attested: !form.attested })}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', width: '100%',
                padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: C.FB,
                background: form.attested ? tint(C.green, 0.09) : C.surf2,
                border: `1px solid ${form.attested ? tint(C.green, 0.45) : C.b1}`,
                transition: CONTROL_TRANSITION,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 4, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: form.attested ? C.green : 'transparent',
                border: `1.5px solid ${form.attested ? C.green : C.b2}`,
              }}>
                {form.attested && <Check size={13} color={onTint(C.green)} />}
              </div>
              <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.55 }}>
                {attestation || `I confirm I am the parent or legal guardian of ${form.studentFullName || 'the student named above'}, that the details I have given are accurate, and I understand this student must approve my request before I can see anything, and can end my access at any time.`}
              </span>
            </button>
            {errors.attested && <div style={{ fontSize: 12, color: C.roseL }}>{errors.attested}</div>}
          </>
        )}

        <div style={R({ gap: 8, flexWrap: 'wrap', marginTop: 4 })}>
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} style={btnG()}>
              <ArrowLeft size={13} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={advance} style={btn(C.blueGrad)}>
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={saving} style={btn(C.blueGrad, { opacity: saving ? 0.7 : 1 })}>
              {saving ? <Loader2 className="spin" size={13} /> : <ShieldCheck size={14} />} Finish setup
            </button>
          )}
          {onSkip && (
            <button type="button" onClick={onSkip} style={{ ...btnG(), marginLeft: 'auto' }}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
