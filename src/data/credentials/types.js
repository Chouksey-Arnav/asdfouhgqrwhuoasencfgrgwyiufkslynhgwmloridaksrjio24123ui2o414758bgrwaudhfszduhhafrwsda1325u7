// ─────────────────────────────────────────────────────────────────────────────
// The three legally distinct things students all call "certifications" — plus
// the fourth thing that is honestly just a skill.
//
// ── Why this file exists ────────────────────────────────────────────────────
// The old catalog had one field, `kind`, with two values: 'certification' and
// 'skill'. Under that model, AHA BLS, an Ohio STNA, and NHA's CCMA were all
// "certifications", which is wrong three different ways at once:
//
//   • A CNA is not certified by a private body at all. A state health
//     department or nurse aide registry issues it, the title changes at the
//     state line (an Ohio CNA is an STNA), and it is a legal occupational
//     credential that authorises paid work.
//   • A CCMA is a private, national, voluntary certification from NHA. Nobody
//     licenses it. A high schooler frequently cannot hold it outright until
//     they graduate — they test as a student and the credential is issued on
//     proof of a diploma.
//   • AHA BLS is not a certification and the AHA says so in its own materials:
//     it issues COURSE COMPLETION CARDS and states that it does not certify
//     individuals. OSHA 10 is a Department of Labor training card. Stop the
//     Bleed is an ACS course. Writing "Certification: BLS" on a college
//     application is a small error, and small errors of exactly this kind read
//     badly to the readers who know the field.
//
// So the type is stored on every record and shown in the UI. It is not
// cosmetic: it decides how the credential is worded on an exported résumé,
// whether an expiry date makes sense, and whether we warn the student before
// they file it under the wrong heading.
//
// ── The honesty rules this database is written under ────────────────────────
// Borrowed wholesale from src/data/admissions/programProfiles.js, for the same
// reason: a catalog that quietly guesses is worse than a smaller one that
// doesn't.
//
//   1. Every number (age, hours, cost) carries a `basis`:
//        'issuer-published' — the issuing body states it, and `sources` has
//                             the URL it was read from.
//        'state-varies'     — there is no national answer; the number shown is
//                             a range across states and is labeled as one.
//        'typical'          — our estimate from the common case. Shown with
//                             "typically", never as a fact.
//   2. `registry.ctid` is the Credential Engine Credential Registry identifier
//      and it is null unless it has actually been looked up and confirmed. A
//      fabricated CTID is worse than no CTID, because it resolves to nothing
//      and makes every other mapping suspect. Null means unmapped, and
//      credentialFinderUrl() below gives the student (and us) a real search
//      link into the Registry instead.
//   3. `onetSoc` is the O*NET-SOC code of the OCCUPATION the credential is used
//      in, not of the credential — O*NET has no credential layer. It is only
//      set where the occupation is unambiguous.
// ─────────────────────────────────────────────────────────────────────────────

/** The four record types. Order matters: it is the order sections appear in the picker. */
export const CREDENTIAL_TYPES = {
  'state-occupational': {
    label: 'State occupational credential',
    short: 'State credential',
    // What the student sees on the record itself. Short enough to sit on a chip.
    badge: 'State credential',
    blurb: 'Issued by a state health department or nurse aide registry, and it authorises paid work in that state. The title and the requirements change at the state line.',
    // These genuinely are certifications, and it is correct to call them that.
    resumeHeading: 'Certifications & Licensure',
    isCertification: true,
    expires: true,
  },
  'national-certification': {
    label: 'National certification (private body)',
    short: 'National certification',
    badge: 'National cert',
    blurb: 'A voluntary certification from a private national body such as NHA, NCCT, AMCA, HSPA, PTCB or ASCP. No government issues it, and most bodies will not award it outright before you finish high school.',
    resumeHeading: 'Certifications & Licensure',
    isCertification: true,
    expires: true,
  },
  'course-completion': {
    label: 'Course completion card',
    short: 'Course completion',
    badge: 'Course card',
    blurb: 'Proof you completed a course — not a certification. The American Heart Association says this explicitly about its own cards: it issues course completion cards and does not certify people. Listing one under "Certifications" is a small error that reads badly.',
    resumeHeading: 'Training & Course Completions',
    isCertification: false,
    expires: true,
  },
  skill: {
    label: 'Skill or proficiency',
    short: 'Skill',
    badge: 'Skill',
    blurb: 'Something you can do, evidenced by where you did it rather than by a card. Belongs in a portfolio, but never under a "Certifications" heading.',
    resumeHeading: 'Skills',
    isCertification: false,
    expires: false,
  },
};

export const CREDENTIAL_TYPE_KEYS = Object.keys(CREDENTIAL_TYPES);

export function credentialType(key) {
  return CREDENTIAL_TYPES[key] || CREDENTIAL_TYPES.skill;
}

/** The three bases a number in this database is allowed to carry. There is no fourth. */
export const BASES = {
  'issuer-published': { label: 'published by the issuer', confident: true },
  'state-varies': { label: 'varies by state', confident: false },
  typical: { label: 'typical — our estimate', confident: false },
};

/**
 * A search link into the Credential Engine Credential Registry, which is the only US resource
 * purpose-built for this and is openly readable. Used wherever `registry.ctid` is null, so an
 * unmapped record still points somewhere real instead of pretending to be mapped.
 */
export function credentialFinderUrl(term) {
  return `https://credentialfinder.org/search?searchType=credential&keyword=${encodeURIComponent(term || '')}`;
}

/** The O*NET occupation page for a SOC code, used to show what the credential is actually for. */
export function onetUrl(soc) {
  return soc ? `https://www.onetonline.org/link/summary/${soc}` : null;
}

/**
 * Shorthand used by every record file, so a source is three fields rather than a repeated literal.
 * A record that claims 'issuer-published' anywhere without at least one source fails
 * scripts/verifyCredentialDatabase.mjs.
 */
export const src = (label, url) => ({ label, url });
