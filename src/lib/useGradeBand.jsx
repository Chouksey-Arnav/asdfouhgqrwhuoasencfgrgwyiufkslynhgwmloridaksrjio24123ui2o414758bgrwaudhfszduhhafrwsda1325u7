// ─────────────────────────────────────────────────────────────────────────────
// useGradeBand — the one hook any component calls to branch on grade band.
//
// The point of putting this behind a hook rather than reading `user.graduationYear`
// in forty places: a component that needs to know "is this student a senior"
// should not also need to know how a graduation year turns into a grade, that
// the answer changes on August 1, or that some accounts predate the attribute
// entirely. It asks for the band and gets it.
//
// And, just as importantly, the hook does not hand out anything a component
// could use to hide a feature. It gives you `state(bands)` → 'active' |
// 'preview' and nothing else — see the rule at the top of gradeBand.js. If you
// find yourself wanting a third value, the answer is a preview banner.
//
// Usage:
//   const { band, isApply, state } = useGradeBand();
//   const s = state(['build', 'apply']);           // 'active' | 'preview'
//   <BandPreview bands={['build','apply']}> … </BandPreview>
//
// The provider is mounted once in App.jsx around the whole signed-in tree; the
// hook falls back to a null-band ("we don't know their year, so everything is
// active") when it is called outside one, which is exactly the right default
// for a component rendered in a test, a preview, or the onboarding flow.
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useMemo } from 'react';
import {
  BAND_BY_ID, bandFor, gradeStageFor, graduationYearFor_user,
  bandStateFor, destinationBandState, previewBannerText,
  needsGradYearConfirmation,
} from './gradeBand';

const GradeBandContext = createContext(null);

/** Everything derived from one user record, computed once per user change. */
export function gradeBandValue(user, now = new Date()) {
  const band = bandFor(user, now);
  const gradeStage = gradeStageFor(user, now);
  const graduationYear = graduationYearFor_user(user, now);
  return {
    band,
    meta: band ? BAND_BY_ID[band] : null,
    gradeStage,
    graduationYear,
    isExplore: band === 'explore',
    isBuild: band === 'build',
    isApply: band === 'apply',
    /** 'active' | 'preview' for a band tag (array, single id, or nothing). */
    state: (bands) => bandStateFor(bands, band),
    isActive: (bands) => bandStateFor(bands, band) === 'active',
    /** Same, for a router destination id ('portfolio/applying:colleges'). */
    destinationState: (id) => destinationBandState(id, band),
    /** The banner sentence for something out of band. */
    previewText: previewBannerText,
    /** First login of a new academic year — see gradeBand.js. */
    needsConfirmation: needsGradYearConfirmation(user, now),
  };
}

export function GradeBandProvider({ user, children }) {
  // Keyed on the two fields that can move it, plus the calendar day, so the
  // August 1 rollover lands without a reload for a session left open overnight.
  const value = useMemo(
    () => gradeBandValue(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.graduationYear, user?.gradeStage, user?.gradeStageYear, user?.onboardingCompletedAt, user?.gradYearConfirmedFor],
  );
  return <GradeBandContext.Provider value={value}>{children}</GradeBandContext.Provider>;
}

export function useGradeBand() {
  const ctx = useContext(GradeBandContext);
  // No provider (tests, onboarding, the landing page) → null band, which every
  // consumer reads as "everything is active". Never as "hide everything".
  // Computed unconditionally so the hook count never depends on the context.
  const fallback = useMemo(() => gradeBandValue(null), []);
  return ctx || fallback;
}

export default useGradeBand;
