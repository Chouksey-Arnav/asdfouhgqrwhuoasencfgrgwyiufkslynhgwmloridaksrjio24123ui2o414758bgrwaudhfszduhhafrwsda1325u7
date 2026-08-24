// The single source of truth for every fact the legal documents assert about
// *us* — who operates the service, how to reach us, what law governs, and when
// each document last changed.
//
// Why this is a module and not prose baked into terms.js/privacy.js: the same
// handful of facts (our name, our notice address, our contact email) appear
// dozens of times across two long documents, and a privacy policy that gives
// two different answers to "who is the controller" is worse than one that gives
// none. Change a value here and both documents, the in-app footer, and the
// structured-data blob all move together.
//
// ⚠️  BEFORE PRODUCTION: `postalAddress` below is a placeholder. It is not
// optional decoration — COPPA's notice provision (16 C.F.R. § 312.4(d)(1))
// requires the operator's *physical* address in the direct notice and online
// notice, and GDPR Art. 13(1)(a) requires controller identity and contact
// details. Ship with the placeholder and the notice is defective on its face.
// scripts/verifyLegal.mjs fails the build while it is still unset.

/** Set to a real, receivable postal address before the first production deploy. */
export const ADDRESS_PLACEHOLDER = 'ADDRESS PENDING — SET BEFORE PRODUCTION';

export const LEGAL = {
  // ── Identity ────────────────────────────────────────────────────────────
  serviceName: 'MedSchoolPrep',
  siteUrl: 'https://medschoolprep.cloud',

  // The operator is currently an unincorporated sole operator based in North
  // Carolina. If and when this becomes an LLC or corporation, change these two
  // lines and the documents follow — but note that incorporating is a
  // materially larger liability protection than anything the Terms below can
  // do, because a sole operator's personal assets are not shielded by a
  // limitation-of-liability clause the way an entity's owners are.
  operatorName: 'MedSchoolPrep',
  operatorDescription: 'a sole-operator educational technology service based in North Carolina, United States',

  // ── Contact ─────────────────────────────────────────────────────────────
  contactEmail: 'meetsagecompanion@gmail.com',
  privacyEmail: 'meetsagecompanion@gmail.com',
  // COPPA / GDPR both require a physical address in the notice. See above.
  postalAddress: ADDRESS_PLACEHOLDER,
  postalState: 'North Carolina',
  postalCountry: 'United States',

  // ── Governing law ───────────────────────────────────────────────────────
  governingLaw: 'the laws of the State of North Carolina, United States, without regard to its conflict-of-laws rules',
  venue: 'the state and federal courts located in North Carolina',
  venueShort: 'North Carolina',

  // ── Age policy ──────────────────────────────────────────────────────────
  // These three numbers are load-bearing: src/lib/ageGate.js enforces
  // MIN_AGE, and the Privacy Policy's children's section describes it. If they
  // ever disagree, the policy is describing a protection the product does not
  // have — which is itself an FTC Act § 5 deception problem, independent of
  // COPPA. verifyLegal.mjs asserts they match.
  minAge: 13,
  minorAge: 18,
  gdprChildConsentAge: 16,

  // ── Document versions ───────────────────────────────────────────────────
  // Bumped whenever a change is material enough that users should be told.
  // `effectiveDate` is what renders at the top of each document.
  //
  // 1.1.0 (2026-08-20): the interview simulator's voice-answer feature sends
  // microphone audio to the browser vendor's own speech-recognition service on
  // Chromium browsers — a fact this policy previously stated incorrectly (it
  // said no audio was transmitted). That is a new disclosed recipient under
  // Section 7 and a corrected description under Section 4/6, both of which
  // Section 15 calls material on their own. It does not change what the
  // feature already did — it corrects the document to describe it accurately
  // — so it takes effect immediately rather than after the 30-day delay
  // Section 22 of the Terms reserves for changes that alter the deal. The
  // Terms gained the matching cross-reference in Section 5.
  termsVersion: '1.1.0',
  privacyVersion: '1.1.0',
  effectiveDate: '2026-08-20',
  lastUpdated: '2026-08-20',
};

/** "August 8, 2026" from "2026-08-08", without dragging in a date library. */
export function formatLegalDate(iso) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * The sub-processors and embedded third parties the Privacy Policy must name.
 *
 * GDPR Art. 13(1)(e) and the CPRA's notice-at-collection both want categories
 * of recipients, and every serious state student-privacy law wants the actual
 * list. Keeping it here rather than in prose means adding a vendor to the app
 * and forgetting to disclose it is a one-line diff away from being visible in
 * review, instead of buried in a paragraph nobody re-reads.
 *
 * Every entry here corresponds to something the code actually loads or calls.
 * Do not add aspirational entries, and do not remove an entry while the
 * integration is still live.
 */
export const SUBPROCESSORS = [
  {
    name: 'Supabase',
    role: 'Database and account storage',
    data: 'Account record (email, display name, grade level, test track), and all Portfolio data you save: colleges, deadlines, essays and their version history, test scores, scholarships, activities, awards, GPA entries, research, skills and certifications, clinical hours, and recommender records.',
    location: 'United States',
    link: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel',
    role: 'Application hosting and serverless functions',
    data: 'Standard server logs, including IP address, user agent, and requested URL. Every request to the service passes through Vercel.',
    location: 'United States',
    link: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Groq',
    role: 'AI inference for the Medabrain coach',
    data: 'The text of what you send the coach, plus the profile context the feature attaches to it — which, for essay review and résumé review, means the content of the essay or activity description you asked it to look at.',
    location: 'United States',
    link: 'https://groq.com/privacy-policy/',
  },
  {
    name: 'Your browser\'s built-in speech-recognition service',
    role: 'Transcribing spoken answers in the interview simulator — only if you turn voice answers on. On Chrome, Edge, and most Chromium browsers this is Google\'s speech service; other browsers use their own vendor\'s.',
    data: 'Audio captured from your microphone while you are answering an interview question out loud. Your browser sends it directly to its own speech service — we are not in that path and never receive, see, or store the audio. We receive only the text transcript your browser returns, and only once, when you send your answer. Voice answers are off by default; declining or turning them off costs you nothing, since the simulator works fully by typing.',
    location: 'United States for Chrome and Edge (Google). Recent Safari transcribes on your device and sends nothing anywhere.',
    link: 'https://policies.google.com/privacy',
  },
  {
    name: 'Brevo',
    role: 'Transactional email delivery',
    data: 'Your email address and the contents of the sign-in code, verification, or password-reset message being sent to you.',
    location: 'European Union and United States',
    link: 'https://www.brevo.com/legal/privacypolicy/',
  },
  {
    name: 'Google (Sign-in with Google)',
    role: 'Optional authentication',
    data: 'Only if you choose to sign in with Google: your Google account email address and its verification status. We do not receive your Google password.',
    location: 'United States',
    link: 'https://policies.google.com/privacy',
  },
  {
    name: 'Google AdSense',
    role: 'Advertising',
    data: 'Ad requests from this site are tagged as child-directed, which turns off personalized and interest-based advertising and remarketing for every visitor. Google still receives the IP address and page context inherent in serving any ad.',
    location: 'United States',
    link: 'https://policies.google.com/technologies/partner-sites',
  },
  {
    name: 'YouTube (privacy-enhanced mode)',
    role: 'Embedded lesson and strategy videos',
    data: 'Videos are embedded through youtube-nocookie.com, which does not set viewing-tracking cookies unless you play the video. Playing a video sends your IP address and the video identifier to YouTube.',
    location: 'United States',
    link: 'https://policies.google.com/privacy',
  },
  {
    name: 'Desmos',
    role: 'Embedded graphing calculator in the SAT toolkit',
    data: 'The calculator script is loaded from Desmos when you open the toolkit. Expressions you type into it are handled in your browser and are not sent to us.',
    location: 'United States',
    link: 'https://www.desmos.com/privacy',
  },
  {
    name: 'Google Fonts',
    role: 'Typefaces',
    data: 'Font files are requested from Google servers when the page loads, which discloses your IP address to Google.',
    location: 'United States',
    link: 'https://policies.google.com/privacy',
  },
];

/**
 * Trademark attributions. Rendered as a block in the Terms and in the app
 * footer. Every mark named here is one the product's copy actually uses.
 */
export const TRADEMARK_NOTICE = [
  'SAT®, PSAT/NMSQT®, AP®, CSS Profile™, BigFuture®, and Bluebook™ are trademarks registered and/or owned by the College Board, which was not involved in the production of, does not endorse, and is not affiliated with this service.',
  'ACT® is a registered trademark of ACT, Inc., which was not involved in the production of, does not endorse, and is not affiliated with this service.',
  'Khan Academy® is a registered trademark of Khan Academy, Inc.',
  'Common App® is a registered trademark of The Common Application, Inc.',
  'Desmos® is a registered trademark of Desmos Studio PBC.',
  'YouTube™ and Google® are trademarks of Google LLC.',
  'All other trademarks, service marks, and trade names referenced in this service are the property of their respective owners. Reference to them is nominative — it identifies the exam, organization, or tool being discussed — and does not imply any affiliation, sponsorship, or endorsement.',
];
