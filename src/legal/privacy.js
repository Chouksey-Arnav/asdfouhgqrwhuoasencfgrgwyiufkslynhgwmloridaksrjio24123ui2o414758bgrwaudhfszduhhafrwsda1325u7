// The Privacy Policy. Same block format as terms.js, plus a { table } block for
// the sub-processor and data-category grids.
//
// This document is deliberately specific. A privacy policy that says "we may
// collect certain information from you and share it with service providers"
// satisfies nobody: not COPPA's direct-notice requirement, not GDPR Art. 13,
// not the CPRA's notice-at-collection, and not a regulator reading it next to
// the actual database schema. So every category below maps to real columns in
// supabase/migrations/*.sql, real keys in src/lib/db.js, or a real network call
// the app makes — and the sub-processor list is generated from
// legalConfig.js#SUBPROCESSORS, which is the same list the code is reviewed
// against.
//
// If you add a table, a field, or a vendor, this document is part of that
// change. scripts/verifyLegal.mjs enforces the vendor half of that mechanically.

import { LEGAL, SUBPROCESSORS } from './legalConfig.js';

const subprocessorTable = {
  table: {
    caption: 'Every third party that receives data through the Service',
    columns: ['Provider', 'What they do for us', 'What they receive', 'Where'],
    rows: SUBPROCESSORS.map((s) => [s.name, s.role, s.data, s.location]),
    links: SUBPROCESSORS.map((s) => s.link),
  },
};

export const PRIVACY_SECTIONS = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'summary',
    title: '1. The short version',
    body: [
      'This summary is here so you actually know what happens to your data. It is not a substitute for the rest of the document, but nothing below contradicts it.',
      {
        list: [
          'We collect what we need to run a study app: your email, a display name, your grade and test track, your date of birth (to check your age), and whatever you save into the app — practice results, essays, activities, GPA, colleges, deadlines.',
          'We do not sell your personal information. We do not share it for cross-context behavioural advertising. We never have.',
          'Ads on this site are non-personalised for everyone, because our audience includes minors. Nothing you put into the app is used to target ads.',
          'We do not use your essays, coach conversations, scores, or any other content to train AI models — ours or anyone else\'s.',
          `You must be at least ${LEGAL.minAge} to use the Service. We do not knowingly collect anything from children under ${LEGAL.minAge}.`,
          'You can see, correct, export, or delete your data at any time, from the app or by emailing us. Deleting your account deletes your data.',
        ],
      },
      `This policy applies to ${LEGAL.siteUrl} and the ${LEGAL.serviceName} application. It does not apply to third-party sites we link to, which have their own policies.`,
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'who-we-are',
    title: '2. Who we are',
    body: [
      `${LEGAL.serviceName} is operated by ${LEGAL.operatorName}, ${LEGAL.operatorDescription}. For the purposes of the EU and UK General Data Protection Regulation, we are the "controller" of the personal data described here.`,
      {
        list: [
          `Email: ${LEGAL.privacyEmail}`,
          `Post: ${LEGAL.operatorName}, ${LEGAL.postalAddress}, ${LEGAL.postalState}, ${LEGAL.postalCountry}`,
        ],
      },
      'We are small enough that the person who reads privacy email is the person who runs the service. Write to us and you will reach someone who can actually do the thing you are asking for.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'children',
    title: '3. Children and teenagers',
    body: [
      {
        note: `The Service is built for students aged ${LEGAL.minAge} and up. It is not directed to children under ${LEGAL.minAge}, and we do not knowingly collect personal information from them.`,
      },
      {
        heading: `Children under ${LEGAL.minAge}`,
      },
      `We ask for a date of birth during onboarding and use it to enforce a minimum age of ${LEGAL.minAge}. A visitor who tells us they are under ${LEGAL.minAge} is not permitted to create an account, and we do not retain the date of birth they entered beyond what is needed to remember that the check was not passed.`,
      `If we learn that we have collected personal information from a child under ${LEGAL.minAge}, we will delete it promptly. If you are a parent or guardian and believe your child under ${LEGAL.minAge} has given us information, email ${LEGAL.privacyEmail} and we will locate and delete the account and its data, and confirm to you when it is done. You do not need an account to make that request.`,
      {
        heading: 'Teenagers, and the protections that apply to everyone',
      },
      'Most of our users are minors, so rather than treating minors as an exception, we apply the strongest of these protections to every user of the Service, at every age:',
      {
        list: [
          'We do not sell personal information, and we do not share it for targeted or cross-context behavioural advertising — regardless of age or consent. Several state laws, including Connecticut\'s, prohibit this outright for anyone under 18; we simply do not do it for anyone.',
          'We do not use personal data to build advertising profiles or to profile users for advertising purposes.',
          'We do not use design features intended to extend engagement time beyond what the study features themselves require, such as autoplaying feeds or infinite scroll.',
          'We collect only what the features you use actually need, and we delete it when you ask.',
        ],
      },
      `A parent or legal guardian of a user under ${LEGAL.minorAge} may request access to, correction of, or deletion of their child's information, and may direct us to stop further collection, by emailing ${LEGAL.privacyEmail}. We will verify the relationship proportionately to the sensitivity of what is being asked, and we will not require more information than is necessary to do that.`,
      'Under the EU GDPR, where processing is based on consent and the user is below the age of digital consent in their country (between 13 and 16, depending on the member state), that consent must be given or authorised by a parent or guardian. In the United Kingdom the age is 13. We rely on the parent or guardian who agreed to our Terms of Service for that authorisation.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'what-we-collect',
    title: '4. What we collect',
    body: [
      {
        heading: 'Information you give us',
      },
      {
        list: [
          'Account details: your email address, and — if you set them — a display name, your grade level, and your test track (SAT or ACT). If you sign in with Google, we receive your Google account email address and whether it is verified; we never receive your Google password.',
          'Date of birth: collected during onboarding to verify you meet the minimum age.',
          'Authentication data: a hashed form of your password (we never store the password itself), and short-lived one-time sign-in codes together with the IP address that requested them, which we use to rate-limit abuse of the code-sending endpoint.',
          'Study data you create: practice and quiz results, flashcard review history, lesson completion, study sessions, streaks, and achievements.',
          'Portfolio data you create: colleges you are tracking and their deadlines and checklists; essays and every saved version of them; test scores you record; scholarships; activities and awards, with descriptions, hours, and any evidence links; GPA entries; research, skills and certification records; clinical or volunteer hours; and recommender records.',
          'Information about other people that you choose to enter — most commonly the name, email, and relationship of a teacher, mentor, or supervisor you list as a recommender or verifier. Only enter these with that person\'s permission.',
          'Anything you type into the AI coach, including essays or drafts you ask it to review.',
          'Anything you send us by email.',
        ],
      },
      {
        heading: 'Information collected automatically',
      },
      {
        list: [
          'Server logs from our host, which record IP address, user agent, requested URL, and timestamp for each request. These are ordinary web-server logs, kept short-term for security and debugging.',
          'A session token stored in your browser so you stay signed in.',
          'Local application data stored on your own device (see Section 9), which stays on your device unless a feature syncs it to your account.',
          'Ad requests to Google AdSense, which necessarily disclose your IP address and the page being viewed. These requests are tagged as child-directed, which disables personalised advertising and remarketing.',
        ],
      },
      {
        heading: 'What we do not collect',
      },
      {
        list: [
          'We do not collect payment card or financial account information — the Service is free and we take no payments.',
          'We do not collect government identifiers such as Social Security numbers.',
          'We do not ask for health or medical information, and you should not enter any. Despite the name, this is a study product, not a health product.',
          'We do not collect precise geolocation.',
          'We do not use analytics, tracking pixels, session recording, or advertising cookies of our own.',
          'We do not access your camera, microphone, contacts, or files, except that the interview simulator uses your browser\'s speech features locally on your device when you start it, and we do not record or transmit that audio.',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'how-we-use',
    title: '5. Why we use it, and our legal basis',
    body: [
      'We use personal data only for the purposes below. For users in the EU, UK, and other jurisdictions requiring a lawful basis, the basis for each purpose is given alongside it.',
      {
        table: {
          caption: 'Purpose and legal basis',
          columns: ['What we do', 'Why', 'Legal basis (EU/UK)'],
          rows: [
            ['Create and maintain your account, sign you in, keep you signed in', 'You cannot use the Service without an account', 'Performance of a contract'],
            ['Save and sync your study and Portfolio data across your devices', 'It is the core of what the product does', 'Performance of a contract'],
            ['Generate practice, score estimates, study plans, and coach responses', 'The features you asked for', 'Performance of a contract'],
            ['Send sign-in codes, verification, and password-reset emails', 'Account security', 'Performance of a contract'],
            ['Verify your age at sign-up', 'Legal obligation to keep under-13s off the Service', 'Legal obligation; legitimate interests'],
            ['Rate-limit and detect abuse of our email and AI endpoints', 'To keep the Service running and affordable', 'Legitimate interests in security and service integrity'],
            ['Diagnose errors and fix bugs from server logs', 'To keep the Service working', 'Legitimate interests in maintaining the Service'],
            ['Serve non-personalised ads', 'To fund a free service', 'Legitimate interests; no personal profiling is involved'],
            ['Respond to your emails and rights requests', 'To help you, and because the law requires it', 'Legal obligation; legitimate interests'],
            ['Comply with law and respond to lawful requests', 'Because we must', 'Legal obligation'],
          ],
        },
      },
      'Where we rely on legitimate interests, we have considered whether those interests are overridden by your rights — and given that most of our users are minors, we have resolved that question in favour of the user wherever it was close. That is why there is no analytics package, no advertising profiling, and no model training on your content.',
      {
        emphasis:
          'We do not use your personal information for automated decision-making that produces legal or similarly significant effects about you. Score estimates, study plans, and coach feedback are study aids; they do not decide anything about you, and no admission, award, or eligibility decision is made by us on the basis of them.',
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ai',
    title: '6. AI features and what happens to what you type',
    body: [
      'The coach, essay feedback, résumé feedback, study-plan generation, practice generation, and interview simulator send text to a third-party AI provider (currently Groq) to produce a response.',
      {
        heading: 'What gets sent',
      },
      'The message you wrote, plus the profile context that specific feature needs — for example, your grade, test track, and target score for a study plan, or the text of the essay for essay feedback. Nothing is sent to the AI provider until you use one of these features.',
      {
        heading: 'What we do with it',
      },
      {
        list: [
          'We do not use your prompts or the AI\'s responses to train any model, and our agreement with our AI provider does not permit them to either.',
          'We keep a short-lived cache of AI responses (currently ten minutes) so that identical requests do not need to be re-sent. It is keyed to the content of the request, holds no account identifier, and is discarded on that timer.',
          'Coach conversations are held in your browser for the session. We do not maintain a server-side archive of your conversations.',
        ],
      },
      {
        emphasis:
          'Do not enter health information, government identifiers, financial account details, passwords, or another person\'s personal information into the AI features. They are not designed to hold that kind of data, and once text is sent to the AI provider we cannot pull it back.',
      },
      'AI output can be wrong. Section 5 of the Terms of Service explains what that means for how you should use it.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'sharing',
    title: '7. Who we share data with',
    body: [
      {
        emphasis:
          'We do not sell personal information. We do not share personal information for cross-context behavioural advertising. We do not disclose personal information to data brokers, list brokers, or advertisers. We have never done any of these things and have no plans to.',
      },
      'We share data only with the service providers that make the Service work, and only what each one needs. Every one of them is listed here — this is the complete list, not examples:',
      subprocessorTable,
      'Each provider is bound to use the data only to provide its service to us. We do not permit any of them to use it for their own advertising or model training.',
      {
        heading: 'Other limited disclosures',
      },
      {
        list: [
          'Legal requirements: we may disclose information if we are required to by law, subpoena, or court order, or where we believe in good faith that it is necessary to protect someone\'s safety or to investigate fraud or a security incident. Where we are permitted to tell you about such a request, we will.',
          'Business transfer: if the Service is ever acquired or merged, personal data may transfer as part of that transaction. We will give you notice before your data becomes subject to a different privacy policy, and you will be able to delete your account first.',
          'With your direction: if you ask us to share something — for example, by exporting a résumé you then send somewhere — we do what you asked.',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'advertising',
    title: '8. Advertising',
    body: [
      'The Service is free and supported by ads served through Google AdSense.',
      {
        emphasis:
          'Because our audience includes minors, we tag every ad request from this Service for child-directed treatment. This turns off personalised and interest-based advertising, and remarketing, for every visitor regardless of age. You will see contextual ads — chosen by the topic of the page — not ads chosen by a profile of you.',
      },
      {
        list: [
          'Nothing you enter into the Service — essays, scores, GPA, activities, colleges, coach conversations — is used for advertising, shared with advertisers, or used to build an advertising profile.',
          'We do not place advertising cookies of our own, and we do not run any advertising or analytics pixel of our own.',
          'Google still receives the IP address and page context that serving any ad requires. Google\'s handling of that is described in its own policy, linked in the table above.',
        ],
      },
      'Under the CCPA and CPRA, and under state laws that use similar definitions, none of this is a "sale" or a "share" of personal information, and there is accordingly no "Do Not Sell or Share My Personal Information" mechanism to offer — there is nothing to opt out of.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'cookies',
    title: '9. Cookies and data stored on your device',
    body: [
      'We do not use tracking or advertising cookies. What we store on your device is functional:',
      {
        list: [
          'A session token, so you stay signed in between visits. Clearing it signs you out.',
          'An IndexedDB database in your browser holding your offline study data — lesson progress, quiz scores, flashcards and their scheduling state, study days, streaks, and achievements — so the app works without a connection.',
          'A few small preference values in local storage: sound and confetti settings, your streak counters, and your preferred coach model tier.',
        ],
      },
      'You can clear all of this from your browser\'s settings at any time. Doing so removes locally-stored progress that has not been synced to your account.',
      'Third-party embeds set their own storage when you interact with them: YouTube videos are embedded through youtube-nocookie.com, which avoids setting viewing-tracking cookies unless you actually play a video, and the Desmos calculator loads its own script when you open the SAT toolkit.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'retention',
    title: '10. How long we keep things',
    body: [
      'We keep personal data only as long as it is needed for the purpose it was collected for — a requirement the amended COPPA Rule makes explicit, and one we apply to every user rather than only to children.',
      {
        table: {
          caption: 'Retention periods',
          columns: ['Data', 'How long'],
          rows: [
            ['Account record and all study and Portfolio data', 'Until you delete it or close your account'],
            ['Inactive accounts', 'Deleted after 24 months with no sign-in, after we email a warning to the address on the account'],
            ['One-time sign-in codes', 'Minutes — they expire on use or shortly after, and expired rows are cleared'],
            ['Session tokens', 'Up to 30 days, or until you sign out'],
            ['Server logs', 'Short-term, as retained by our hosting provider for security and debugging'],
            ['AI response cache', 'Ten minutes'],
            ['Backups', 'Deleted data ages out of backups on our provider\'s ordinary backup cycle'],
            ['Email correspondence with us', 'As long as needed to resolve the matter, and to show we handled a rights request'],
          ],
        },
      },
      {
        emphasis:
          'We do not retain personal information indefinitely, and we do not keep data after an account is deleted in order to build a profile, a mailing list, or a model.',
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'security',
    title: '11. How we protect it',
    body: [
      {
        list: [
          'All traffic is encrypted in transit with HTTPS/TLS. Data is encrypted at rest by our database provider.',
          'Passwords are stored only as salted hashes. We cannot read your password, and nobody at ' + LEGAL.serviceName + ' can tell you what it is.',
          'Sign-in codes are stored hashed, expire quickly, are single-use, and are rate-limited by both email address and IP address.',
          'Every database query is scoped to the signed-in user\'s own records, and our database tables have row-level security enabled so they cannot be reached with a public key even if one were exposed.',
          'The high-privilege database key is held only by server-side functions and is never included in anything sent to your browser.',
          'Our AI and email endpoints are rate-limited to limit both abuse and cost.',
        ],
      },
      'No system is perfectly secure, and we cannot guarantee absolute security. If we become aware of a breach affecting your personal data, we will notify you and the relevant authorities as required by law — under the GDPR, without undue delay and within 72 hours of becoming aware where the breach is notifiable, and under North Carolina\'s Identity Theft Protection Act and other applicable state breach-notification laws on the timelines those set.',
      `If you believe you have found a security vulnerability, please tell us at ${LEGAL.contactEmail} before disclosing it publicly. We will not pursue legal action against anyone who reports a vulnerability in good faith, tests only against their own account, and gives us reasonable time to fix it.`,
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'your-rights',
    title: '12. Your rights and choices',
    body: [
      'Wherever you live, you can do all of the following, and we will honour the request:',
      {
        list: [
          'Access — get a copy of the personal data we hold about you.',
          'Correct — fix anything inaccurate, either in the app or by asking us.',
          'Delete — delete individual records from the app, or close your account to delete everything.',
          'Export — get your data in a portable, machine-readable format.',
          'Object or restrict — ask us to stop or limit a particular use.',
          'Withdraw consent — where we rely on consent, withdraw it at any time, without affecting what we did before you withdrew it.',
          'Complain — raise a concern with us, and with a regulator.',
        ],
      },
      {
        heading: 'How to exercise them',
      },
      `Most of this you can do yourself in the app's settings, including account deletion. For anything else, email ${LEGAL.privacyEmail} from the address on your account, or tell us the address on the account if you are writing from somewhere else. We will respond within 30 days, and within 45 days where a US state law sets that period, and we will tell you if we need a permitted extension. Using your rights costs nothing and we will not treat you differently for it.`,
      'We will ask for enough information to be confident you are who you say you are, and no more. A parent or guardian may make a request on behalf of a user under 18, and an authorised agent may make a request where state law allows it.',
      {
        heading: 'If you are in California',
      },
      'The CCPA, as amended by the CPRA, gives you the rights to know, delete, correct, and opt out of sale or sharing, to limit the use of sensitive personal information, and not to be discriminated against for exercising them. In the twelve months before the date of this policy we collected the categories of personal information described in Section 4 — identifiers, education information, and internet activity limited to the server logs described there — for the purposes in Section 5, from the sources in Section 4, and disclosed them for a business purpose only to the providers in Section 7.',
      {
        emphasis:
          'We did not sell or share personal information, and we did not sell or share the personal information of minors under 16. We do not use or disclose sensitive personal information for any purpose beyond those permitted without a right to limit.',
      },
      {
        heading: 'If you are in the EEA, UK, or Switzerland',
      },
      'You have the rights of access, rectification, erasure, restriction, portability, and objection under Articles 15 to 22 of the GDPR, and the right to withdraw consent. You also have the right to lodge a complaint with your national supervisory authority — in the UK, the Information Commissioner\'s Office. We would rather you came to us first, but you do not have to.',
      {
        heading: 'If you are in another US state',
      },
      'Colorado, Connecticut, Virginia, Utah, Texas, Oregon, Montana, and a growing number of other states give residents rights to access, correct, delete, and port their data, and to opt out of targeted advertising, sale, and profiling. We honour all of these for every user regardless of state — and because we do not conduct targeted advertising, sale, or profiling at all, the opt-outs have nothing to act on. Some of these states provide a right to appeal a refused request; if we ever refuse one of yours, we will tell you how to appeal and, if the appeal fails, how to contact your attorney general.',
      'North Carolina, where we are based, does not currently have a comprehensive consumer privacy statute. We apply the protections in this policy to North Carolina residents on the same terms as everyone else.',
      {
        heading: 'Global Privacy Control',
      },
      'We honour the Global Privacy Control and similar browser opt-out signals. Because we do not sell or share personal information or serve targeted advertising, such a signal does not change our processing — but it will never be ignored.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'transfers',
    title: '13. International data transfers',
    body: [
      'We operate from the United States, and our providers store and process data in the United States. If you use the Service from outside the United States, your personal data is transferred there.',
      'For transfers of personal data out of the EEA or the UK, we rely on the European Commission\'s Standard Contractual Clauses (and the UK International Data Transfer Addendum where applicable) in our agreements with providers, together with the supplementary measures described in Section 11 — encryption in transit and at rest, minimisation of what is transferred, and no onward transfer for the providers\' own purposes.',
      `You may request a copy of the relevant transfer safeguards by writing to ${LEGAL.privacyEmail}.`,
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ferpa',
    title: '14. Student records and schools',
    body: [
      'We provide the Service directly to students and families, not to schools. Data you enter is yours, not a school\'s: we do not receive rosters from schools, we do not provide a teacher or administrator dashboard, and no educator can view another person\'s records through the Service.',
      'Because of that, the data we hold is not an "education record" under FERPA, and we do not act as a school official under FERPA\'s school-official exception.',
      `If a school or district wants to adopt the Service in a way that would change this, contact ${LEGAL.contactEmail}. That requires a separate written agreement covering FERPA, the Protection of Pupil Rights Amendment, and applicable state student-privacy laws before any such use begins.`,
      'We do not engage in targeted advertising to students, do not sell student data, and do not create a profile of a student for any purpose other than providing the study and planning features they are using — commitments that also track the substance of the state student-data-privacy laws modelled on California\'s Student Online Personal Information Protection Act.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'changes',
    title: '15. Changes to this policy',
    body: [
      'We will update this policy when what we do changes. The "last updated" date at the top always reflects the current version.',
      'If a change is material — a new category of data, a new purpose, a new recipient, or anything that would materially expand how your data is used — we will tell you in the app or by email before it takes effect, and where the law requires consent for that change, we will ask for it rather than assume it.',
      'We will not apply a materially different use to data we already hold without giving you notice and, where required, obtaining consent.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'contact',
    title: '16. How to reach us',
    body: [
      'For any privacy question, rights request, or complaint — including a parent or guardian request about a child\'s account:',
      {
        list: [
          `Email: ${LEGAL.privacyEmail}`,
          `Post: ${LEGAL.operatorName}, ${LEGAL.postalAddress}, ${LEGAL.postalState}, ${LEGAL.postalCountry}`,
        ],
      },
      'We aim to reply within a few days, and in every case within the deadlines set out in Section 12.',
    ],
  },
];

export const PRIVACY_DOC = {
  slug: 'privacy',
  path: '/legal/privacy',
  title: 'Privacy Policy',
  intro:
    'This policy explains what data we collect, why, who else sees it, and what you can do about it. It is specific on purpose: every category below corresponds to something the app actually stores, and the list of third parties is the complete list.',
  sections: PRIVACY_SECTIONS,
};
