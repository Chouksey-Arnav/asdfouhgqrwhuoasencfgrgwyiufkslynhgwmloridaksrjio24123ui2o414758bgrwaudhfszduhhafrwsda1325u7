// The Terms of Service, as structured content rather than a wall of HTML.
//
// Format: each section is { id, title, body }, where `body` is an array of
// blocks. A block is either a plain string (a paragraph), or one of:
//   { heading }  — a sub-heading inside the section
//   { list }     — a bulleted list of strings
//   { note }     — a call-out box, for the things a court would ask whether the
//                  user could reasonably have missed
//   { emphasis } — a paragraph rendered in the conspicuous style reserved for
//                  disclaimers and the arbitration notice
//
// The `id`s are stable and are what /legal/terms#section-id links to. Do not
// renumber or rename them casually — they are cited from the Privacy Policy,
// from in-app disclaimers, and potentially from correspondence.
//
// ── A note on why this document is shaped the way it is ────────────────────
//
// Nearly every user of this product is a minor. In every US state, a contract
// with a minor is voidable by the minor — so a Terms of Service that treats the
// student as the counterparty is, as to its most valuable clauses (liability
// caps, arbitration, class waiver), worth very little. This document therefore
// makes the parent or legal guardian the contracting party for any user under
// 18, and requires the student to have obtained that permission. That is the
// single structural decision that gives the rest of the document force.

import { LEGAL, TRADEMARK_NOTICE } from './legalConfig.js';

export const TERMS_SECTIONS = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'agreement',
    title: '1. The agreement you are making',
    body: [
      `These Terms of Service (the "Terms") are a legal agreement between you and ${LEGAL.operatorName} ("${LEGAL.serviceName}", "we", "us", or "our"), ${LEGAL.operatorDescription}. They govern your access to and use of ${LEGAL.siteUrl} and every feature, page, and tool offered there (together, the "Service").`,
      'By creating an account, or by using the Service without one, you agree to these Terms. If you do not agree to them, do not use the Service.',
      {
        note: 'These Terms include a limitation of our liability (Section 15), a disclaimer of warranties (Section 14), and an agreement to resolve disputes by individual arbitration rather than in court or by class action (Section 17). Section 17 includes a 30-day opt-out. Please read those sections carefully — they affect your legal rights.',
      },
      {
        heading: 'If the student using the Service is under 18',
        emphasis:
          'If you are under 18, you may not agree to these Terms on your own behalf. A parent or legal guardian must read and agree to them, and by allowing a student under 18 to use the Service, that parent or guardian agrees to these Terms on the student\'s behalf and accepts responsibility for the student\'s use of the Service.',
      },
      `Where these Terms say "you", they mean the student using the Service and — for any student under ${LEGAL.minorAge} — the parent or legal guardian who agreed to these Terms on that student's behalf, together.`,
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'eligibility',
    title: '2. Who may use the Service',
    body: [
      `You must be at least ${LEGAL.minAge} years old to create an account or use the Service. The Service is not directed to, and we do not knowingly permit its use by, children under ${LEGAL.minAge}.`,
      'We ask for a date of birth during sign-up and use it to enforce this. If we learn that an account belongs to a child under 13, we will close it and delete the associated personal information. See the Privacy Policy for how to tell us about such an account.',
      {
        list: [
          `If you are between ${LEGAL.minAge} and 17, you may use the Service only with the permission and supervision of a parent or legal guardian who has agreed to these Terms.`,
          'If you are 18 or older, you may use the Service on your own behalf.',
          'You may not use the Service if we have previously closed your account for a violation of these Terms, or if doing so would be unlawful where you are.',
        ],
      },
      'You are responsible for the accuracy of the information you give us, including your date of birth. Providing a false date of birth to get around the age requirement is a violation of these Terms.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'accounts',
    title: '3. Your account',
    body: [
      'You are responsible for everything that happens under your account, and for keeping your password and sign-in codes confidential. Do not share them. Tell us promptly at ' +
        LEGAL.contactEmail +
        ' if you believe someone else has gained access to your account.',
      'You may not create an account for anyone else, sell or transfer your account, or use another person\'s account without their permission.',
      'You may close your account at any time from the app\'s settings, or by emailing us. Closing your account deletes the data associated with it as described in the Privacy Policy.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'what-the-service-is',
    title: '4. What the Service is — and what it is not',
    body: [
      'The Service is a study and planning tool. It offers practice questions and adaptive practice tests modelled on publicly described exam formats, lessons and quizzes about health-care and science career pathways, spaced-repetition flashcards, an AI study coach, and a set of trackers for the college application process — activities, essays, deadlines, colleges, scholarships, test scores, and similar records.',
      {
        heading: 'It is not educational, medical, legal, or financial advice',
      },
      {
        emphasis:
          'All content on the Service — lessons, quizzes, career-pathway material, clinical and ethical scenarios, and anything the AI coach produces — is provided for general educational and career-exploration purposes only. It is not medical advice, medical education, clinical training, professional licensure preparation, legal advice, financial advice, or individualised counselling of any kind. Nothing on the Service creates a doctor-patient, attorney-client, advisor-client, or counsellor-student relationship. Do not make any clinical, medical, health, legal, or financial decision on the basis of anything you read here. Consult a qualified professional.',
      },
      {
        heading: 'It is not affiliated with any testing organisation or school',
      },
      `${LEGAL.serviceName} is an independent product. We are not affiliated with, endorsed by, sponsored by, or approved by the College Board, ACT, Inc., the Common Application, Khan Academy, Desmos Studio, any university or college, any hospital or health system, or any accrediting or licensing body. Despite its name, ${LEGAL.serviceName} is not a medical school, is not a pathway to a medical licence, and does not confer academic credit, certification, or any credential.`,
      'Practice questions on the Service are written by us or generated for the Service. We do not reproduce copyrighted exam questions. Where we link to official practice material, that material is provided by the testing organisation on its own terms, and those terms — not ours — govern your use of it.',
      {
        heading: 'Score estimates are estimates',
      },
      {
        emphasis:
          'Any score, score range, projection, percentile, readiness indicator, or admissions-likelihood figure the Service displays is an estimate produced by our own models. It is not an official score, it is not produced or validated by any testing organisation, and it is not a prediction or guarantee of your actual result. Real exam scores vary with test form, scaling, test-day conditions, and many other factors. Treat every number the Service shows you as a rough range for study planning, and nothing more.',
      },
      {
        heading: 'We do not guarantee outcomes',
      },
      {
        emphasis:
          'We do not guarantee any score improvement, admission or acceptance to any school or programme, scholarship, financial aid award, interview, placement, or any other outcome. No feature of the Service, and no statement by the AI coach, should be read as such a guarantee. Your results depend on your own work and on decisions made by third parties entirely outside our control.',
      },
      {
        heading: 'Deadlines and requirements are yours to verify',
      },
      'The Service stores deadlines, requirements, and checklists that you or we enter. These can be wrong, incomplete, or out of date — application requirements change, and colleges change them without telling us. You are solely responsible for confirming every deadline, requirement, fee, form, and policy directly with the college, scholarship provider, testing organisation, or school counsellor concerned. We are not responsible for a missed deadline or an unmet requirement.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ai',
    title: '5. The AI coach and other AI features',
    body: [
      'Parts of the Service — including the coach ("Medabrain"), essay feedback, résumé and activity feedback, study-plan generation, practice-question generation, and the interview simulator — are powered by large language models operated by a third-party provider (currently Groq). These features are automated. There is no human reviewing their output before you see it.',
      {
        emphasis:
          'AI output can be wrong, incomplete, outdated, biased, or entirely fabricated, and it can state a wrong answer confidently. It is not reviewed by a teacher, counsellor, admissions officer, physician, or other professional. Verify anything that matters — especially deadlines, requirements, scores, factual claims, and anything you plan to submit to a college — with an authoritative source before you rely on it.',
      },
      'When you use these features, the text you enter and the relevant part of your profile are sent to our AI provider to generate a response. What that means for your data is described in the Privacy Policy. Do not enter information into the coach that you would not want processed this way — in particular, do not enter health information, government identifiers, financial account numbers, or another person\'s personal information.',
      {
        heading: 'Voice answers in the interview simulator',
      },
      'The interview simulator can speak its questions aloud using your device\'s own built-in speech synthesis, which never involves your microphone or any network transmission of audio. It can also let you answer out loud instead of typing, and that half of the feature is different: your browser, not us, sends the audio it captures from your microphone to its own speech-recognition service to produce a transcript. We are never a party to that transmission and never receive, see, or store the audio itself. The Privacy Policy, Sections 4, 6, and 7, describes this in full, including which browsers are affected and how it is disclosed to you.',
      {
        emphasis:
          'Voice answers are off until you turn them on, we ask before your microphone is ever opened, and declining or later turning them off costs you nothing — the interview simulator works fully by typing, with no feature gated behind speaking aloud. If you are under 18, a parent or guardian should be comfortable with this before you turn it on.',
      },
      {
        heading: 'Essay feedback and academic integrity',
      },
      'The essay tools are for feedback and revision on work you wrote. You are responsible for making sure your use of them complies with the academic-integrity and authorship rules of your school and of every college, scholarship, and programme you apply to. Many application platforms require that submitted work be substantially your own. We do not warrant that any AI-assisted text is acceptable under any particular institution\'s rules, and we are not responsible for the consequences if it is not.',
      'Content generated by AI features is provided to you as-is for your own use. We make no claim of ownership over it, and we cannot promise it is original or that it does not resemble output shown to another user.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'acceptable-use',
    title: '6. Acceptable use',
    body: [
      'You agree not to:',
      {
        list: [
          'Use the Service for any unlawful purpose, or in violation of any applicable law or regulation.',
          'Upload, generate, or transmit content that is unlawful, harassing, defamatory, hateful, sexually explicit, or that exploits or endangers a minor.',
          'Impersonate any person, or misrepresent your affiliation with any person or organisation.',
          'Enter another person\'s personal information into the Service without that person\'s permission — including, for recommender and verifier records, the name and email of a teacher, mentor, or supervisor who has not agreed to be listed.',
          'Attempt to gain unauthorised access to the Service, other users\' accounts, or any system or network connected to the Service.',
          'Probe, scan, or test the vulnerability of the Service, or breach or circumvent any security or authentication measure, except under a written authorisation from us.',
          'Use any robot, scraper, or automated means to access, extract, or index the Service or its content, or to bulk-download practice questions, lessons, or the resource library.',
          'Reverse engineer, decompile, or attempt to derive the source of any part of the Service not distributed to you in source form, except where that restriction is prohibited by law.',
          'Use the Service, or its AI features, to build, train, or improve a competing product or a machine-learning model.',
          'Circumvent rate limits, quotas, or usage caps, or make automated requests to our AI or email endpoints in a way that imposes an unreasonable load or cost.',
          'Resell, sublicense, or commercially redistribute access to the Service or its content.',
          'Interfere with any other user\'s use of the Service.',
        ],
      },
      'We may investigate and take action on any suspected violation, including removing content, limiting features, suspending or closing accounts, and reporting to law enforcement where appropriate.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'your-content',
    title: '7. Your content',
    body: [
      '"Your Content" means everything you put into the Service: essays and their drafts, activity and award descriptions, notes, research and clinical entries, recommender records, goals, and anything you type into the AI coach.',
      {
        emphasis:
          'Your Content is yours. We do not claim ownership of it. We do not sell it. We do not use it for advertising, and we do not use it to train AI models.',
      },
      'You grant us a limited, worldwide, non-exclusive, royalty-free licence to host, store, copy, transmit, display, and process Your Content strictly for the purpose of operating and providing the Service to you — for example, saving an essay draft to your account so it is there on your next device, or sending the text of an essay to our AI provider because you asked for feedback on it. This licence exists only so we can run the features you are using. It ends when you delete the content or close your account, except for backup copies that age out on our ordinary backup cycle.',
      'You represent that you have the right to submit Your Content, and that it does not infringe anyone\'s rights or violate any law.',
      'You are responsible for keeping your own copies of anything that matters to you. The Service is not a backup service. Export features are provided as a convenience, and we do not guarantee that any particular content will remain retrievable.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'our-content',
    title: '8. Our content and licence to you',
    body: [
      'The Service, and everything in it that is not Your Content or a third party\'s — the software, design, text, lessons, quiz and practice questions, curated resource library, scoring and diagnostic models, and the ' +
        LEGAL.serviceName +
        ' name and logo — is owned by us or our licensors and is protected by copyright, trademark, and other laws.',
      'Subject to these Terms, we grant you a personal, limited, non-exclusive, non-transferable, revocable licence to access and use the Service and its content for your own, non-commercial study and application-planning purposes. Every right not expressly granted is reserved.',
      'You may print or download material from the Service for your own study. You may not republish it, share it publicly, sell it, or incorporate it into any other product or service.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'third-parties',
    title: '9. Third-party services, links, and embedded content',
    body: [
      'The Service embeds and links to material operated by third parties — YouTube videos, the Desmos graphing calculator, official testing-organisation pages, college and scholarship websites, and the resources in our library.',
      'We do not control that material and are not responsible for it. Its availability, accuracy, and content are the third party\'s, and your use of it is governed by that third party\'s own terms and privacy policy, not ours. A link is not an endorsement. Links can break and third-party content can change or disappear without notice to us.',
      'Some third-party components require their provider\'s continued permission to work. If a provider withdraws or changes access, the affected feature may stop working, and that is not a breach of these Terms.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'advertising',
    title: '10. Advertising',
    body: [
      'The Service is supported in part by advertising served through Google AdSense.',
      {
        emphasis:
          'Because our audience includes minors, we tag every ad request from this Service for child-directed treatment. That turns off personalised advertising, interest-based advertising, and remarketing for all visitors, whatever their age. We do not sell or share your personal information for cross-context behavioural advertising, and we do not use anything you put into the Service — your essays, scores, activities, GPA, colleges, or coach conversations — to target ads.',
      },
      'Ads are labelled and are not endorsements. We do not control which specific advertisers appear, and an advertiser\'s presence on the Service does not mean we vouch for it. Any dealing you have with an advertiser is between you and that advertiser.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'fees',
    title: '11. Fees',
    body: [
      'The Service is currently offered free of charge and supported by advertising. We do not currently charge for any feature and do not collect payment card information.',
      'If we introduce paid features in future, we will present the price and the terms before you are charged, and we will not charge you for anything you have not affirmatively agreed to buy. Any paid feature will be governed by additional terms presented at that time.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'availability',
    title: '12. Availability and changes to the Service',
    body: [
      'We are a small operation. The Service is provided on an as-available basis, and we do not promise any level of uptime, availability, or support responsiveness.',
      'We may add, change, suspend, or discontinue any part of the Service at any time. Where a change would remove a feature you rely on or delete data, we will make a reasonable effort to give notice in the app or by email first, but we cannot always do so — for example where a third-party provider withdraws access on short notice.',
      'Features may be offered as previews or in beta. Those may be incomplete, may change, and may be withdrawn.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'termination',
    title: '13. Suspension and termination',
    body: [
      'You may stop using the Service and close your account at any time.',
      'We may suspend or close your account, or restrict your access, if we reasonably believe you have violated these Terms, if your use creates risk or legal exposure for us or another user, if your account has been inactive for an extended period, or if we discontinue the Service. Where the reason and the circumstances allow it, we will tell you why and give you an opportunity to retrieve your data.',
      'Sections 7 (as to the licence for backups), 8, 14, 15, 16, 17, 18, and 23 survive the end of this agreement.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'disclaimer',
    title: '14. Disclaimer of warranties',
    body: [
      {
        emphasis:
          'THE SERVICE AND ALL CONTENT IN IT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT, AND ANY WARRANTY ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.',
      },
      {
        emphasis:
          'WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; THAT ANY CONTENT, SCORE ESTIMATE, DEADLINE, REQUIREMENT, OR AI-GENERATED STATEMENT IS ACCURATE, COMPLETE, CURRENT, OR RELIABLE; OR THAT USING THE SERVICE WILL PRODUCE ANY PARTICULAR SCORE, ADMISSION, AWARD, OR OTHER RESULT.',
      },
      'Some jurisdictions do not allow the exclusion of certain warranties. Where that is the case, the exclusions above apply to you only to the extent permitted, and you may have additional rights.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'liability',
    title: '15. Limitation of liability',
    body: [
      {
        emphasis:
          'TO THE FULLEST EXTENT PERMITTED BY LAW, NEITHER WE NOR ANYONE INVOLVED IN CREATING OR OPERATING THE SERVICE WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, GOODWILL, EDUCATIONAL OR CAREER OPPORTUNITY, ADMISSION, SCHOLARSHIP, FINANCIAL AID, OR ANTICIPATED SAVINGS, ARISING OUT OF OR RELATING TO THE SERVICE — WHETHER IN CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER THEORY, AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY.',
      },
      {
        emphasis:
          'OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE TOTAL AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (US$100). BECAUSE THE SERVICE IS CURRENTLY FREE, THIS WILL ORDINARILY BE US$100.',
      },
      'These limits are a fundamental part of the agreement between us and reflect a reasonable allocation of risk for a free service. They apply even if a limited remedy fails of its essential purpose.',
      'Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited — including liability for fraud or fraudulent misrepresentation, for death or personal injury caused by negligence, and any liability that applicable consumer-protection law makes non-excludable. Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages; where that is so, the above applies to you only to the extent permitted.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'indemnity',
    title: '16. Indemnification',
    body: [
      `To the extent permitted by law, you agree to indemnify and hold harmless ${LEGAL.operatorName} from any claim, demand, loss, or expense (including reasonable legal fees) brought by a third party and arising out of Your Content, your use of the Service, your violation of these Terms, or your violation of any law or of any third party's rights.`,
      `If the student is under ${LEGAL.minorAge}, this obligation is the agreeing parent's or legal guardian's, not the student's.`,
      'We will notify you of any such claim and may, at our option, take over its defence at our own expense; you agree to cooperate reasonably in either case.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'disputes',
    title: '17. Resolving disputes',
    body: [
      {
        note: 'This section affects how legal claims between us are resolved. It requires most disputes to go to individual arbitration instead of court, and gives up the right to a jury and to participate in a class action. You can opt out within 30 days — see "How to opt out" below — and opting out does not affect your use of the Service in any way.',
      },
      {
        heading: 'Talk to us first',
      },
      `Before starting any formal proceeding, please email us at ${LEGAL.contactEmail} with a short description of the problem and what you would like us to do. We will try to resolve it informally. Give us 60 days from the date we receive your notice. Most problems can be sorted out this way, and this step is a condition of starting arbitration.`,
      {
        heading: 'Individual arbitration',
      },
      'If we cannot resolve a dispute informally, you and we agree that any dispute arising out of or relating to these Terms or the Service will be resolved by binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, rather than in court. The arbitration will be held in the county where you live, or by telephone or video, or on the documents alone, at your choice. The arbitrator may award the same individual relief a court could.',
      {
        emphasis:
          'YOU AND WE EACH WAIVE THE RIGHT TO A TRIAL BY JURY AND THE RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR ANY OTHER REPRESENTATIVE PROCEEDING. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON\'S CLAIMS.',
      },
      {
        heading: 'What is carved out',
      },
      {
        list: [
          'Either of us may bring an individual claim in small-claims court instead, if it qualifies.',
          'Either of us may ask a court for an injunction to stop infringement or misuse of intellectual property.',
          'Any claim that applicable law does not permit to be arbitrated, and any right to a public injunction that cannot be waived, may be brought in court.',
          'Nothing here prevents you from reporting a concern to the Federal Trade Commission, a state attorney general, a data protection authority, or any other government agency.',
        ],
      },
      {
        heading: 'How to opt out',
      },
      `You may opt out of this arbitration agreement by emailing ${LEGAL.contactEmail} with the subject line "Arbitration Opt-Out" within 30 days of first accepting these Terms, stating your name and the email address on your account. Opting out costs you nothing and changes nothing else about your use of the Service.`,
      {
        heading: 'Minors',
      },
      `We recognise that a person under ${LEGAL.minorAge} may not be bound by an arbitration agreement. This section binds the parent or legal guardian who agreed to these Terms, and binds a student only to the extent the law permits. If a court decides this section cannot be enforced as to a particular person or claim, it will not be enforced as to that person or claim, and the rest of this section continues to apply to everyone else.`,
      'If the class-action waiver above is found unenforceable as to a particular claim, that claim — and only that claim — will be resolved in court under Section 18, and the remainder of this section will still apply.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'governing-law',
    title: '18. Governing law and venue',
    body: [
      `These Terms are governed by ${LEGAL.governingLaw}.`,
      `For any dispute not subject to arbitration under Section 17, you and we agree to the exclusive jurisdiction and venue of ${LEGAL.venue}.`,
      'If you are a consumer resident in the European Union, the United Kingdom, or another jurisdiction whose law gives you the benefit of mandatory local consumer protections, nothing in this section deprives you of those protections or of the right to bring proceedings in your country of residence.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'schools',
    title: '19. Use by schools, districts, and educators',
    body: [
      `The Service is designed and offered as a direct-to-student and direct-to-family product. It is not currently offered as a school-official service under the Family Educational Rights and Privacy Act ("FERPA"), and it provides no administrative dashboard, roster import, or teacher-facing view of another person's records.`,
      'A student\'s account belongs to that student and their family. A teacher, counsellor, tutor, or administrator may not create accounts on students\' behalf, direct students to enter data on the school\'s behalf, require use of the Service as part of coursework in a way that makes the data an education record, or ask students for their sign-in credentials.',
      `If your school or district wishes to adopt the Service in a way that would involve education records, student directory information, or FERPA's school-official exception, contact us at ${LEGAL.contactEmail} first. That use requires a separate written data-privacy agreement, and without one it is not authorised under these Terms.`,
      'Educators are of course welcome to recommend the Service to students and families, who can then sign up on their own.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'copyright',
    title: '20. Copyright complaints',
    body: [
      `If you believe material on the Service infringes your copyright, email ${LEGAL.contactEmail} with: your contact details; identification of the copyrighted work; identification of the material you say is infringing and where it is on the Service; a statement that you believe in good faith that the use is not authorised by the copyright owner, its agent, or the law; a statement that the information in your notice is accurate and, under penalty of perjury, that you are authorised to act for the owner; and your physical or electronic signature.`,
      'We will respond to valid notices, remove or disable access to infringing material, and terminate the accounts of repeat infringers where appropriate. If you believe material was removed in error, you may send a counter-notice to the same address.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'trademarks',
    title: '21. Trademarks',
    body: [
      ...TRADEMARK_NOTICE,
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'changes',
    title: '22. Changes to these Terms',
    body: [
      'We may update these Terms. When we do, we will change the "last updated" date at the top and, if the change is material, give you notice in the app or by email before it takes effect.',
      'Material changes take effect no less than 30 days after we give notice, except where a change must take effect sooner to comply with law. Continuing to use the Service after a change takes effect means you accept the updated Terms. If you do not accept them, stop using the Service and close your account.',
      'We will not apply a change to the arbitration section retroactively to a dispute of which we already have notice.',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'general',
    title: '23. General',
    body: [
      {
        list: [
          'Entire agreement. These Terms and the Privacy Policy are the entire agreement between you and us about the Service, and replace any earlier understanding about it.',
          'Severability. If any provision is held unenforceable, it will be limited or removed to the minimum extent necessary and the rest of these Terms will remain in effect.',
          'No waiver. If we do not enforce a provision, that is not a waiver of our right to enforce it later.',
          'Assignment. You may not assign these Terms without our written consent. We may assign them to a successor in connection with a merger, acquisition, or sale of assets, on notice to you.',
          'No third-party beneficiaries. These Terms do not give rights to anyone other than you and us.',
          'Force majeure. Neither of us is liable for a failure to perform caused by something outside our reasonable control.',
          'Notices. We may give you notice by email to the address on your account or by a notice in the app. You may give us notice at ' + LEGAL.contactEmail + '.',
          'Headings. Section headings are for convenience and do not affect interpretation.',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'contact',
    title: '24. How to reach us',
    body: [
      'Questions about these Terms, or anything else:',
      {
        list: [
          `Email: ${LEGAL.contactEmail}`,
          `Post: ${LEGAL.operatorName}, ${LEGAL.postalAddress}, ${LEGAL.postalState}, ${LEGAL.postalCountry}`,
        ],
      },
    ],
  },
];

export const TERMS_DOC = {
  slug: 'terms',
  path: '/legal/terms',
  title: 'Terms of Service',
  intro: `These Terms govern your use of ${LEGAL.serviceName}. They are written to be read — the plain-language summaries are part of the document, not marketing around it. If you are under ${LEGAL.minorAge}, a parent or legal guardian needs to read and agree to them with you.`,
  sections: TERMS_SECTIONS,
};
