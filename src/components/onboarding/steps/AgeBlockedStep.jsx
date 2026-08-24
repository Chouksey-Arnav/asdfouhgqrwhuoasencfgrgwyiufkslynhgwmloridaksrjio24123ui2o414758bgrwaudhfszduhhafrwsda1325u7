import React, { useState } from 'react';
import { ShieldAlert, Mail, Loader2 } from 'lucide-react';
import { C } from '../primitives';
import { LEGAL } from '../../../legal/legalConfig';
import { LEGAL_VIEWS } from '../../../lib/routes';
import * as AuthAPI from '../../../lib/authApi';
import { clearAgeBlocked } from '../../../lib/ageGate';

// The terminal screen for a visitor who told us they are under 13.
//
// Three things this screen must do, and one it must not:
//
//   • It must not offer a way back to the birthdate wheel. The whole point of
//     an age screen is defeated if failing it is a prompt to guess again, and
//     the FTC says so directly in its age-screening guidance.
//
//   • It must actually delete the account, not just stop the flow. By the time
//     onboarding runs, api/auth/complete-signup.js has already written an
//     app_users row holding this child's email — so at the moment we learn they
//     are under 13 we have collected personal information from a child without
//     verifiable parental consent, and COPPA's remedy is deletion, promptly.
//     Leaving the row in place and merely hiding the app is the violation.
//
//   • It must be kind about it. This is a twelve-year-old who wanted to study
//     medicine, being told no by a computer. The copy is written for them, not
//     for a compliance auditor, and it tells them the one useful true thing:
//     come back on your birthday.
//
// What it must not do is imply the rule is negotiable, or invite the parent to
// consent on the child's behalf — we do not operate a verifiable parental
// consent mechanism, so there is nothing for a parent to consent to.

export default function AgeBlockedStep({ account, onSignedOut }) {
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);

  // Fire once on mount: no button, no confirmation. The user does not get to
  // decide whether the under-13 record is deleted, because that decision is
  // not theirs or ours to make.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (account?.email) await AuthAPI.deleteMyAccount(account.email);
        clearAgeBlocked(); // the account is gone; the device is usable by someone else
      } catch {
        // Deletion failed (offline, server error). Say so honestly and give the
        // parent an address that reaches a human — silently pretending it
        // worked would be the one genuinely bad outcome here.
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) {
          setBusy(false);
          AuthAPI.clearToken();
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '32px 24px', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldAlert size={26} color={C.amberL} />
      </div>

      <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, fontFamily: C.FD, color: C.t1, letterSpacing: 'calc(-0.43px + var(--msp-letter-spacing))', lineHeight: 1.25 }}>
        Come back in a few years — we'll be here.
      </h2>

      <p style={{ margin: 0, maxWidth: 380, fontSize: 14.5, lineHeight: 1.7, color: C.t2 }}>
        MedSchoolPrep is built for students {LEGAL.minAge} and older, and the law that
        protects kids' privacy online means we can't make an exception. That's
        genuinely it — it isn't about you, and it isn't something you did wrong.
      </p>

      <p style={{ margin: 0, maxWidth: 380, fontSize: 14.5, lineHeight: 1.54, color: C.t2 }}>
        On your {LEGAL.minAge}th birthday, sign up again and everything here is yours. In the
        meantime, Khan Academy and your school library are excellent, free, and
        very happy to have you.
      </p>

      <p style={{ margin: 0, maxWidth: 380, fontSize: 14.5, lineHeight: 1.54, color: C.t2 }}>
        And we're not done building. We're already working on a version of
        MedSchoolPrep made for middle schoolers — and, someday, maybe one for
        elementary schoolers too, for kids who already know medicine is the
        thing. If that's you, you're not too early. You're just early enough
        to be worth waiting for.
      </p>

      <div
        style={{
          maxWidth: 400, width: '100%', padding: '12px 16px', borderRadius: 12,
          background: failed ? C.roseDim : C.surf,
          border: `1px solid ${failed ? 'rgba(244,63,94,0.3)' : C.b1}`,
          fontSize: 13, lineHeight: 1.65, color: C.t2,
          display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left',
        }}
      >
        {busy ? <Loader2 className="spin" size={15} color={C.t3} style={{ flexShrink: 0, marginTop: 4 }} />
              : <Mail size={15} color={failed ? C.roseL : C.t3} style={{ flexShrink: 0, marginTop: 4 }} />}
        <span>
          {busy && 'Deleting the account and everything in it…'}
          {!busy && !failed && (
            <>
              We've deleted the account and everything in it. Nothing is kept.
              Questions from a parent or guardian are welcome at{' '}
              <a href={`mailto:${LEGAL.privacyEmail}`} style={{ color: C.blueL, fontWeight: 600 }}>{LEGAL.privacyEmail}</a>.
            </>
          )}
          {!busy && failed && (
            <>
              We couldn't finish deleting the account automatically. Please ask a
              parent or guardian to email{' '}
              <a href={`mailto:${LEGAL.privacyEmail}`} style={{ color: C.blueL, fontWeight: 600 }}>{LEGAL.privacyEmail}</a>{' '}
              and we'll delete it by hand and confirm when it's done.
            </>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={() => { AuthAPI.clearToken(); if (onSignedOut) onSignedOut(); else window.location.assign('/'); }}
        disabled={busy}
        style={{
          marginTop: 4, padding: '12px 24px', borderRadius: 12, border: `1px solid ${C.b2}`,
          background: C.surfHi, color: C.t1, fontSize: 14, fontWeight: 600,
          fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        Close
      </button>

      <a href={LEGAL_VIEWS.privacy} style={{ fontSize: 12, color: C.t3 }}>
        How we handle children's privacy
      </a>
    </div>
  );
}
