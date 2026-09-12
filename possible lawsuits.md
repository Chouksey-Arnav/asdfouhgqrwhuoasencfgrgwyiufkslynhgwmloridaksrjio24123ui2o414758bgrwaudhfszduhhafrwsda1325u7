# Complete Legal, Regulatory & Risk Compliance Audit: Possible Lawsuits & Vulnerabilities

This document presents an exhaustive, itemized legal, regulatory, trademark, data privacy, and security risk audit for the **MedSchoolPrep** platform (accessible at `medschoolprep.cloud`). It evaluates platform compliance across federal statutes (COPPA, FERPA, FTC Act § 5, Lanham Act, ADA Title III), state privacy laws (BIPA, CCPA/CPRA, CTDPA, VCDPA, CPA), international data frameworks (GDPR Article 8 & 13), and third-party vendor terms (Desmos, Google AdSense, Groq, Brevo, Supabase).

---

## Executive Summary of Risk Exposure

**MedSchoolPrep** is an offline-first high-school-to-undergraduate preparation and pre-health exploration platform targeting students aged 13–18. Powered by a React 18 single-page application (SPA), Node/Express VPS production dispatcher (`server.js`), Supabase PostgreSQL backend, and Groq LLM inference (`/api/groq`), the platform integrates third-party tools, browser-native sensory APIs, and Google AdSense monetization.

A rigorous audit of the codebase, backend API endpoints, client-side persistence schemas, system prompts, and automated build verification scripts reveals **seven core risk vectors** that expose the operator and platform to potential lawsuits, regulatory enforcement actions, or operational disruption:

1. **Intellectual Property & Trademark Infringement (High Risk)**: Nominative fair use versus trademark confusion regarding standardized exam brands (College Board®, SAT®, PSAT/NMSQT®, AP®, Bluebook™, ACT®, Khan Academy®, Common App®), simulation of adaptive exam scoring algorithms without mandatory legal disclaimers, and risks surrounding Desmos® API commercial developer key licensing (`VITE_DESMOS_API_KEY`).
2. **Children's & Students' Data Privacy Compliance (COPPA, FERPA, GDPR & CCPA/CPRA/CTDPA) (Critical Risk)**: Processing personally identifiable information (PII) — including GPAs, standardized test scores, high school transcripts, recommender names, personal essays, and parent sync records — from minors (ages 13–18). Requires strict age-gating (`src/lib/ageGate.js`), local storage persistence (`msp_ageBlocked`), parent-student sync controls (`0029_parent_channel_sync.sql`), data export/deletion mechanisms (`AuthAPI.exportMyData()`, `AuthAPI.deleteMyAccount()`), and strict CTDPA/CCPA bans on targeted advertising for under-18s.
3. **Professional & Medical Advice Liability (Medium Risk)**: Utilizing "Med" branding (`MedSchoolPrep`, `Medabrain`) and delivering pre-health pathway exploration, pharmacology tutorials, and AI-driven college counseling without explicit non-clinical disclaimers, coupled with strict academic integrity rules (preventing AI ghostwriting) and adaptive Month Plan outcome claim scrubbing (`FORBIDDEN_CLAIM_PATTERNS` / `scrubClaims()`).
4. **Biometric, Voice & Sensor Privacy (BIPA, CCPA & COPPA) (Medium-High Risk)**: Utilizing browser-native microphones, Web Speech recognition (`webkitSpeechRecognition`), and speech synthesis (`speechSynthesis`) for simulated admissions interviews (`LiveVoiceInterview.jsx`). Poses BIPA (Illinois 740 ILCS 14/) and CCPA biometric liabilities if not locally executed and explicitly disclosed (as updated in Privacy Policy v1.1.0 regarding Chromium browser vendor audio handling).
5. **API Security, Key Isolation, Daily AI Budgets & Database Integrity (Medium-High Risk)**: Exposing high-privilege `SUPABASE_SERVICE_ROLE_KEY` to backend-only scripts, enforcing Row-Level Security (RLS) on user tables, applying strict daily AI usage budgets (20 calls/student/day via `aiBudget.js` and `medabrainRequest.js`) while maintaining an unbudgeted safety classifier invariant, rate-limiting transactional SMTP email (`api/send-email.js`), and maintaining byte-for-byte Supabase database migration parity (`verifyMigrations.mjs`).
6. **Accessibility Compliance (ADA Title III & WCAG 2.1 AA) (Medium Risk)**: Maintaining equal access for students with visual, motor, or cognitive disabilities, enforcing palette contrast standards (`npm run verify:contrast`), supporting `reducedMotion` accessibility overrides across Framer Motion layouts, and preventing keyboard traps in embedded tools like the Desmos calculator.
7. **Deceptive Trade Practices & Consumer Protection (FTC Act § 5) (Medium-High Risk)**: Preventing deceptive trade practice claims by resolving placeholder physical addresses (`ADDRESS_PLACEHOLDER` in `legalConfig.js` under COPPA 16 CFR § 312.4(d) and GDPR Art. 13(1)(a)), ensuring landing page claims align with AdSense reality, and prohibiting dark patterns in retention exit prompts (`streakRetention.js`).

---

## 1. Intellectual Property & Trademark Infringement

### Issue 1.1: Unlicensed Use and Potential Trademark Confusion with Test Brands
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Lanham Act (U.S. Trademark Law), 15 U.S.C. § 1114 & § 1125 (Trademark Infringement, False Designation of Origin, and Trademark Dilution).
* **Specific Code / Data Paths:**
  - `src/legal/legalConfig.js` (`TRADEMARK_NOTICE` array)
  - `src/components/sat/` (`SatTab.jsx`, `SatBaselinePanel.jsx`, `SatFullTestPanel.jsx`, `SatLibraryPanel.jsx`)
  - `src/data/sat/` (`forms.js`, `taxonomy.js`, `resources.js`, `scoring.js`, `questions/`)
  - `src/lib/sat/` (`aiPractice.js`, `aiStudyPlan.js`, `adaptive.js`)
* **Legal Analysis:**
  The platform extensively references proprietary, trademarked brands such as "SAT," "PSAT/NMSQT," "AP," "Bluebook," "College Board," "ACT," "Khan Academy," and "Common App." While nominative fair use allows educational applications to reference test names to accurately inform users of test preparation context, displaying official test names or modeling "College Board Practice Tests 1–6" without clear, prominent disclaimers could create consumer confusion under 15 U.S.C. § 1125(a). Consumers might falsely believe the platform is sponsored by, affiliated with, or officially endorsed by the College Board or ACT, Inc.
* **Actionable Mitigations & Code Invariants:**
  - **Mandatory Nominative Fair Use Notice:** Render the central `TRADEMARK_NOTICE` array defined in `src/legal/legalConfig.js` in the universal app footer, the Settings Legal modal, and on every test prep workspace panel.
  - **Explicit Attribution of External Official Links:** Explicitly designate external links to official College Board linear practice tests or Bluebook software as free, external official resources owned by the respective trademark holder.
  - **Verification Script:** Enforce `npm run verify:legal` and `npm run verify:copy` during automated builds to verify trademark attributions.

### Issue 1.2: Violations of Desmos API Terms of Service & Unlicensed Key Usage
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Desmos API Terms of Service, Breach of Contract, Unfair Competition, Lanham Act.
* **Specific Code / Data Paths:**
  - `src/lib/sat/desmos.js`
  - `src/components/sat/DesmosCalculator.jsx`
  - `src/components/sat/DesmosSurface.jsx`
  - `scripts/verifySatDesmos.mjs`
* **Legal Analysis:**
  The platform embeds the Desmos Graphing Calculator into the SAT toolkit (`DesmosSurface.jsx`). Using a public demo key or an unauthenticated Desmos script in a commercial environment violates Desmos Studio PBC's API Terms of Service. If Desmos revokes script loading or issues a cease-and-desist, the SAT Math prep experience will break instantly, exposing the operator to breach of contract and intellectual property litigation.
* **Actionable Mitigations & Code Invariants:**
  - **Environment-Gated Key Loading:** `src/lib/sat/desmos.js` must require `import.meta.env.VITE_DESMOS_API_KEY`. If the environment variable is absent or invalid, the module must gracefully suppress API script injection.
  - **User-Facing Fallback Component:** Render a helpful fallback notification giving students a direct outbound link to Desmos's official free web calculator (`https://www.desmos.com/calculator`) whenever the embedded API key is unconfigured.
  - **Automated Verification:** Run `npm run verify:sat-tools` (`scripts/verifySatDesmos.mjs`) to verify Desmos script loader resilience and fallback state handling.

### Issue 1.3: Reverse-Engineered Score Projections & Diagnostic Guarantees
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** FTC Act § 5 (Unfair or Deceptive Acts or Practices), Negligent Misrepresentation, Breach of Implied Warranty.
* **Specific Code / Data Paths:**
  - `src/data/sat/scoring.js`
  - `src/lib/sat/projection.js`
  - `src/components/sat/SatScoreReport.jsx`
  - `scripts/verifySatScoring.mjs`
* **Legal Analysis:**
  The platform calculates estimated SAT scores and composite section breakdowns using internal conversion curves in `src/data/sat/scoring.js`. If students or parents rely on these score projections as guaranteed predictors of official College Board exam performance, a significant score discrepancy on test day could trigger claims of deceptive advertising or negligent misrepresentation under state consumer protection statutes.
* **Actionable Mitigations & Code Invariants:**
  - **Prominent Score Disclaimer Invariant:** Ensure every score report and diagnostic projection displays the explicit disclaimer: *"Estimated using our own conversion algorithm, not College Board’s official scoring table. Treat this score as an educational practice range, not a guaranteed exam result."*
  - **Automated Scoring Audit:** Run `npm run verify:sat-scoring` on every build to verify that scaled score bounds remain within 200–800 section limits and contain mandatory disclaimer metadata.

---

## 2. Children's & Students' Data Privacy Compliance (COPPA, FERPA, GDPR & CCPA/CPRA/CTDPA)

### Issue 2.1: COPPA Non-Compliance & Under-13 Data Collection
* **Risk Level:** Critical (High Risk)
* **Relevant Legal / Policy Frameworks:** Children's Online Privacy Protection Act (COPPA), 15 U.S.C. §§ 6501–6506; FTC COPPA Rule, 16 C.F.R. Part 312.
* **Specific Code / Data Paths:**
  - `src/lib/ageGate.js` (`isUnderMinAge`, `ageFromBirthdate`, `recordAgeBlocked`, `isAgeBlocked`)
  - `src/components/onboarding/steps/BirthdateStep.jsx`
  - `src/components/onboarding/steps/AgeBlockedStep.jsx`
  - `src/components/auth/SignupView.jsx`
  - `api/auth/complete-signup.js`
  - `scripts/verifyLegal.mjs`
* **Legal Analysis:**
  COPPA strictly prohibits collecting, using, or storing personal information (names, emails, academic records, IP addresses) from children under the age of 13 without verifiable parental consent (VPC). Because high school prep tools attract middle and high school students, a defective age gate exposes the operator to statutory civil penalties exceeding $50,000 per violation under FTC enforcement.
* **Actionable Mitigations & Code Invariants:**
  - **Neutral Age-Screening Implementation:** `BirthdateStep.jsx` renders a neutral date selection interface. If a user enters a birthdate indicating an age under 13 (`LEGAL.minAge = 13`), the system immediately triggers `recordAgeBlocked()`, setting `msp_ageBlocked` in LocalStorage, purging any incomplete session data, and redirecting to `AgeBlockedStep.jsx`.
  - **Age-Block Persistence:** `isAgeBlocked()` is consulted during sign-up and onboarding to prevent minors from immediately retrying with a false birthdate.
  - **Wheel Minimum Invariant:** `MIN_WHEEL_AGE` in `ageGate.js` reaches below 13 (e.g., age 10) so disqualifying birthdates can be selected and screened.
  - **Automated Verification:** `scripts/verifyLegal.mjs` evaluates age-gate edge cases (leap years, exact birthday boundary checks) during `npm run verify:legal`.

### Issue 2.2: FERPA Exposure in School & District Deployments
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g; 34 C.F.R. Part 99.
* **Specific Code / Data Paths:**
  - `src/legal/terms.js` (Section 19: Use by schools, districts, and educators)
  - `src/legal/privacy.js` (Section 14: Student records and schools)
  - `supabase/migrations/0006_parent_dashboard.sql`
  - `supabase/migrations/0029_parent_channel_sync.sql`
* **Legal Analysis:**
  If educational institutions, school districts, or teachers mandate MedSchoolPrep in classrooms to track student grades, test scores, or college applications, student data falls under FERPA jurisdiction. Storing educational records on cloud databases without executed Institutional Service Agreements or Student Data Privacy Agreements (SDPAs) violates federal privacy laws.
* **Actionable Mitigations & Code Invariants:**
  - **Direct-to-Student Policy Boundary:** Terms § 19 and Privacy Policy § 14 explicitly state that MedSchoolPrep is a direct-to-consumer service for individual students and parents. School or district-wide usage is strictly prohibited without a separate executed SDPA.
  - **Parent-Student Sync Authorization:** Parent dashboard linking (`0006_parent_dashboard.sql` and `0029_parent_channel_sync.sql`) requires explicit student claim codes and mutual invitation confirmation before parent read-only access is granted.

### Issue 2.3: GDPR, CCPA/CPRA, and CTDPA Minor Privacy Compliance
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** General Data Protection Regulation (GDPR) Art. 8 & 13, California Consumer Privacy Act (CCPA) / CPRA (Cal. Civ. Code § 1798.100 et seq.), Connecticut Data Privacy Act (CTDPA).
* **Specific Code / Data Paths:**
  - `src/legal/legalConfig.js` (`SUBPROCESSORS` list)
  - `src/App.jsx` (Settings Panel → Data Export & Account Deletion handlers)
  - `src/lib/authApi.js` (`exportMyData()`, `deleteMyAccount()`)
  - `api/auth/account.js` (`GET`, `DELETE` methods)
  - `scripts/verifyLegal.mjs`
* **Legal Analysis:**
  Under CCPA/CPRA and CTDPA, businesses are strictly prohibited from selling or sharing personal data of consumers under 16 without explicit opt-in consent. CTDPA flatly prohibits targeted advertising to minors under 18. Furthermore, GDPR and CCPA require accessible mechanisms for data portability ("Right to Data Access") and complete account erasure ("Right to Be Forgotten").
* **Actionable Mitigations & Code Invariants:**
  - **In-App Self-Service Export & Deletion:** The Settings modal provides direct controls: "Download my data" (calling `AuthAPI.exportMyData()`) and "Delete my account" (calling `AuthAPI.deleteMyAccount()`).
  - **Cascade Database Purge:** `api/auth/account.js` executes multi-table cascade deletions across Supabase `app_users`, `sessions`, `progress_sync`, `parent_student_links`, and cleans client-side IndexedDB databases (`Dexie.delete()`).
  - **Sub-Processor Transparencies:** `SUBPROCESSORS` in `src/legal/legalConfig.js` explicitly catalogues all third-party data processors (Supabase, Vercel, Groq, Brevo, Desmos, Google AdSense).

### Issue 2.4: Google AdSense Cookie Profiling & Minor Tracking Risks
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** COPPA (16 C.F.R. § 312.5), CCPA/CPRA Minor Sharing Rules, CTDPA Targeted Ad Ban.
* **Specific Code / Data Paths:**
  - `index.html` (Google AdSense script tag & pre-initialization script block)
  - `src/legal/privacy.js` (Section 8: Advertising)
  - `scripts/verifyLegal.mjs`
* **Legal Analysis:**
  Serving personalized or behavioral ads to high school students triggers immediate regulatory liability under COPPA and state privacy statutes. If third-party ad tags load before child-directed flags are initialized, tracking cookies could be set on minors' devices.
* **Actionable Mitigations & Code Invariants:**
  - **Pre-Script Tag Initializations:** `index.html` executes child-directed configuration flags *strictly before* fetching the Google AdSense script (`adsbygoogle.js`):
    ```html
    <script>
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 1;
      window.adsbygoogle.tagForChildDirectedTreatment = 1;
      window.adsbygoogle.tagForUnderAgeOfConsent = 1;
      window.adsbygoogle.restrictDataProcessing = 1;
    </script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4110886931308197" crossorigin="anonymous"></script>
    ```
  - **Automated Tag-Order Guard:** `scripts/verifyLegal.mjs` asserts that `tagForChildDirectedTreatment` appears prior to `adsbygoogle.js` in `index.html`.

---

## 3. Professional, Medical & Advising Liability

### Issue 3.1: "MedSchoolPrep" Branding & Educational Scope Boundaries
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Unauthorized Practice of Medicine, Professional Malpractice, FTC Act § 5.
* **Specific Code / Data Paths:**
  - `package.json` (Description: *"A personalized path into medicine for high schoolers..."*)
  - `src/data/lessonContent/` (`physician.js`, `nursing.js`, `publicHealth.js`, `pharmacy.js`)
  - `src/legal/terms.js` (Section 4: Educational content disclaimer)
* **Legal Analysis:**
  The platform name "MedSchoolPrep" could inadvertently suggest to users or parents that the application provides graduate medical school instruction, clinical diagnostic training, or professional medical advice. If a student relies on biochemistry or pharmacology lesson content to make medical or diagnostic decisions, the operator could face personal injury or professional liability claims.
* **Actionable Mitigations & Code Invariants:**
  - **Explicit Non-Clinical Disclaimer:** Terms § 4 explicitly states: *"MedSchoolPrep is an educational preparation and pre-health exploration tool for high school and undergraduate students. MedSchoolPrep is not a medical school, does not provide clinical training, and does not offer medical advice, diagnosis, or treatment."*
  - **Curriculum Guardrails:** Lesson modules are strictly limited to foundational high school biology, chemistry, and career path overview context.

### Issue 3.2: AI Coach ("Medabrain") Advising & Admissions Guarantees
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Negligent Advising, Misleading Advertising, Breach of Contract.
* **Specific Code / Data Paths:**
  - `src/lib/studentProfile.js` (System prompts)
  - `src/lib/essayCritique.js` (Feedback logic)
  - `src/lib/medabrainRequest.js`
  - `api/groq.js`
  - `scripts/verifySafety.mjs`
* **Legal Analysis:**
  The AI Coach (**Medabrain**) assists students with college search, admissions strategies, essay critiques, and score tracking. If Medabrain promises guaranteed college admission (e.g., promising entry into Ivy League or BS/MD programs), families could sue for breach of contract or deceptive trade practices if the student is rejected.
* **Actionable Mitigations & Code Invariants:**
  - **System Prompt Guardrails:** System prompts in `studentProfile.js` and `medabrainRequest.js` instruct the AI never to guarantee admissions, scholarships, or financial aid outcomes, and to remind students to verify all deadlines directly with university portals.
  - **UI Disclaimer Notices:** Render non-intrusive warnings near chat interfaces stating: *"Medabrain is an AI exploration coach. Always verify official deadlines and requirements with your school counselor or target university."*

### Issue 3.3: Plagiarism & Academic Integrity Boundaries
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Institutional Academic Integrity Policies, Copyright, Fraud.
* **Specific Code / Data Paths:**
  - `src/lib/essayCritique.js`
  - `src/lib/safety/classifier.js`
  - `src/legal/terms.js` (Section 5: AI features and academic integrity)
  - `scripts/verifyEssayIntegrity.mjs`
* **Legal Analysis:**
  If AI features draft complete college application essays or high school assignments for students, students risk academic disqualification or expulsion for submission of ghostwritten work.
* **Actionable Mitigations & Code Invariants:**
  - **No-Ghostwriting Invariant:** System prompts and `essayCritique.js` restrict Medabrain to structural feedback, grammar checking, tone evaluation, and brainstorming prompts. **Medabrain is strictly prohibited from drafting, generating, or rewriting full essay paragraphs.**
  - **Terms Disclosure:** Section 5 of the Terms of Service specifies that students retain sole responsibility for compliance with institutional academic integrity policies.
  - **Automated Verification:** `scripts/verifyEssayIntegrity.mjs` evaluates prompt rules during `npm run verify:essay-integrity`.

### Issue 3.4: Adaptive Month Plan Outcome Claims & Scrubbing Rules
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** FTC Act § 5, Consumer Protection.
* **Specific Code / Data Paths:**
  - `src/lib/monthPlan/model.js` (`FORBIDDEN_CLAIM_PATTERNS`, `scrubClaims()`)
  - `src/lib/monthPlan/rules.js`
  - `scripts/verifyMonthPlan.mjs`
* **Legal Analysis:**
  Adaptive four-week study roadmaps (`src/lib/monthPlan/`) dynamically generate action plans for students. If an automated rule promises entry into top-tier universities or claims a specific score gain, the platform faces deceptive advertising liability.
* **Actionable Mitigations & Code Invariants:**
  - **Automated Claim Scrubbing:** `src/lib/monthPlan/model.js` passes all generated plan text through `scrubClaims()`, matching against `FORBIDDEN_CLAIM_PATTERNS` to strip any sentence guaranteeing admission or score increases before rendering.
  - **Rule Attribution:** Every generated plan row must trace to an explicit internal rule ID (`source: 'rule:<id>'`).
  - **Automated Verification:** `npm run verify:month-plan` greps generated output strings to enforce claim scrubbing.

---

## 4. Biometric, Voice & Sensor Privacy (BIPA, CCPA & Speech APIs)

### Issue 4.1: Live Voice Interview Simulator & Biometric Privacy Risks
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Illinois Biometric Information Privacy Act (BIPA), 740 ILCS 14/1 et seq.; Texas Bus. & Com. Code § 507.001; Washington Rev. Code § 19.375; CCPA/CPRA Biometric Rules; COPPA.
* **Specific Code / Data Paths:**
  - `src/components/LiveVoiceInterview.jsx`
  - `src/lib/speech.js` (`webkitSpeechRecognition`, `speechSynthesis`)
  - `src/legal/privacy.js` (Section 4, 6, 7 & 15)
  - `src/legal/legalConfig.js` (`SUBPROCESSORS` entry for speech recognition)
  - `scripts/verifyInterviewRealism.mjs`
* **Legal Analysis:**
  The platform provides an interactive voice interview simulator where students speak answers into their microphone. Under BIPA (740 ILCS 14/15), capturing, storing, or transmitting biometric identifiers (including voiceprints or vocal recordings) without prior written release triggers statutory damages of $1,000 for negligent violations and $5,000 for intentional violations.
  *Technical Architecture:* Audio is captured via browser-native Web Speech APIs. On Chromium browsers (Chrome, Edge), the browser engine transmits microphone audio directly to Google's cloud speech service for transcription. MedSchoolPrep servers never receive, process, or store raw audio files or voiceprints.
* **Actionable Mitigations & Code Invariants:**
  - **In-App Sensory Disclaimer:** Display a clear notice before enabling microphone access: *"Voice transcription is processed through your browser's native Web Speech engine. MedSchoolPrep does not record, transmit, or store your voice audio or biometric data."*
  - **Privacy Policy Disclosures (v1.1.0 Amendment):** Privacy Policy § 4, § 6, and `SUBPROCESSORS` explicitly disclose that on Chromium browsers, speech transcription sends audio directly to the browser vendor's speech service, while text fallback typing remains available with zero functional penalty.
  - **Local Processing Verification:** `src/lib/speech.js` handles transcription strictly through the browser event callback `onresult`, storing only the text string in component state.

---

## 5. API Security, Key Isolation, Daily AI Budgets & Database Integrity

### Issue 5.1: High-Privilege Supabase Key Exposure & Row-Level Security
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** FTC Act § 5 (Reasonable Data Security Guidelines), State Data Breach Notification Laws.
* **Specific Code / Data Paths:**
  - `api/_lib/supabaseAdmin.js`
  - `server.js`
  - `supabase/migrations/`
* **Legal Analysis:**
  The backend connects to Supabase using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row-Level Security (RLS). If this key is exposed in client-side bundles (e.g., via a `VITE_` prefix) or public Git repositories, an attacker could extract or delete all user records.
* **Actionable Mitigations & Code Invariants:**
  - **Strict Server-Side Key Isolation:** `SUPABASE_SERVICE_ROLE_KEY` is loaded exclusively inside backend API endpoints (`api/`) and is never prefixed with `VITE_`.
  - **Row-Level Security (RLS) Enforcements:** Enable RLS across all Supabase tables (`app_users`, `progress_sync`, `parent_student_links`) to enforce user-scoped access policies even if public keys are queried directly.

### Issue 5.2: Daily AI Usage Budgets & Safety Classifier Invariants
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Operating Loss Protection, Safety Compliance.
* **Specific Code / Data Paths:**
  - `src/lib/aiBudget.js`
  - `src/lib/medabrainRequest.js` (`postMedabrain()`)
  - `api/groq.js`
  - `scripts/verifyAiBudget.mjs`
* **Legal Analysis:**
  Unchecked AI queries expose the operator to massive API bills on Groq Cloud and denial-of-service risks. However, capping safety classification queries could allow harmful or abusive prompts to bypass safety filters when a student reaches their daily limit.
* **Actionable Mitigations & Code Invariants:**
  - **Single Entry Point (`postMedabrain()`):** All student AI requests route through `postMedabrain()`, which checks the daily budget (target: 20 calls/student/day) before dispatching to `/api/groq`.
  - **Unbudgeted Safety Classifier Invariant:** Safety classification checks (`src/lib/safety/classifier.js`) are **exempt from AI budget limits**. Safety evaluation runs regardless of user quota state.
  - **Automated Verification:** `npm run verify:ai-budget` validates budget counters and safety classifier persistence.

### Issue 5.3: Transactional Mailer Rate-Limiting
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Controlling the Assault of Non-Solicited Pornography And Marketing (CAN-SPAM Act), 15 U.S.C. § 7701 et seq.; Brevo Terms of Service.
* **Specific Code / Data Paths:**
  - `api/send-email.js`
  - `api/_lib/mailer.js`
  - `scripts/checkMailerConfig.mjs`
* **Legal Analysis:**
  Endpoints sending sign-in OTPs or verification emails via Brevo SMTP (`api/send-email.js`) must enforce rate limits to prevent email flooding attacks or SMTP account suspension.
* **Actionable Mitigations & Code Invariants:**
  - **IP & User Rate-Limiting:** Implement IP-based rate limiting on `/api/send-email` to cap verification code requests to a maximum of 5 attempts per hour per recipient email address.

### Issue 5.4: Supabase Database Migration Parity & Schema Integrity
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Data Integrity, System Reliability.
* **Specific Code / Data Paths:**
  - `supabase/migrations/` (`0000_base_schema.sql` through `0029_parent_channel_sync.sql`)
  - `scripts/verifyMigrations.mjs`
* **Legal Analysis:**
  Discrepancies between local development migration scripts and live production database schemas can cause data corruption, permission denied errors on parent/student channels, or missing security triggers (`0027` and `0029` parent-student shared tables).
* **Actionable Mitigations & Code Invariants:**
  - **Automated Postgres Schema Verification:** `npm run verify:migrations` spins up a clean Postgres container, applies the complete migration chain from `0000` to `0029`, and asserts byte-for-byte schema parity against live production table structures.

---

## 6. Accessibility Compliance (ADA Title III & WCAG 2.1 AA)

### Issue 6.1: Web Content Accessibility & Screen Reader Compliance
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Americans with Disabilities Act (ADA) Title III (Public Accommodations), Section 508 of the Rehabilitation Act, WCAG 2.1 AA Standards.
* **Specific Code / Data Paths:**
  - `src/lib/a11y.js`
  - `src/components/` (Interactive UI panels, modals, score charts, custom buttons)
  - `scripts/verifyPaletteContrast.mjs`
  - `scripts/verifyA11y.mjs`
* **Legal Analysis:**
  Under ADA Title III, educational web applications are classified as places of public accommodation. Failing to provide full keyboard navigation, sufficient visual color contrast, or proper screen reader labels exposes the platform to accessibility lawsuits.
* **Actionable Mitigations & Code Invariants:**
  - **Comprehensive ARIA & Keyboard Accessibility:** Interactive elements feature explicit `aria-label`, `aria-expanded`, and keyboard handlers (`onKeyDown` supporting Enter/Space).
  - **Palette Contrast Auditing:** `scripts/verifyPaletteContrast.mjs` validates that body text and interactive controls maintain a minimum contrast ratio of 4.5:1 against panel backgrounds.
  - **Accessibility Audits:** Run `npm run verify:a11y` and `npm run verify:contrast` on every release.

### Issue 6.2: Reduced Motion & Sensory Accessibility
* **Risk Level:** Low-Medium
* **Relevant Legal / Policy Frameworks:** WCAG 2.1 AA Guideline 2.3.3 (Animation from Interactions).
* **Specific Code / Data Paths:**
  - `src/App.jsx`
  - `src/components/PlansTab.jsx` (`reducedMotion` prop forwarding to `WeekView`, `DayCard`, `TaskRow`)
  - `scripts/verifyMotion.mjs`
* **Legal Analysis:**
  Triggering high-motion animations for users with vestibular disorders without respecting system-level `prefers-reduced-motion` settings violates WCAG accessibility guidelines.
* **Actionable Mitigations & Code Invariants:**
  - **Reduced Motion Forwarding:** The top-level `reducedMotion` state in `App.jsx` is forwarded cleanly down component trees to disable framer-motion layout shifts for users requesting reduced motion.

---

## 7. Deceptive Trade Practices & Consumer Protection (FTC Act § 5)

### Issue 7.1: Physical Notice Address Placeholder Resolution
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** FTC Act Section 5 (15 U.S.C. § 45), COPPA Direct Notice Requirements (16 C.F.R. § 312.4(d)(1)), GDPR Art. 13(1)(a).
* **Specific Code / Data Paths:**
  - `src/legal/legalConfig.js` (`ADDRESS_PLACEHOLDER`, `LEGAL.postalAddress`)
  - `scripts/verifyLegal.mjs`
* **Legal Analysis:**
  In `src/legal/legalConfig.js`, `LEGAL.postalAddress` is defined using `ADDRESS_PLACEHOLDER = 'ADDRESS PENDING — SET BEFORE PRODUCTION'`.
  COPPA and GDPR explicitly require the operator's physical postal address in online notices. Deploying to production with a placeholder address makes legal notices defective on their face, exposing the operator to regulatory fines for deceptive trade practices.
* **Actionable Mitigations & Code Invariants:**
  - **Pre-Production Address Resolution:** Populate `LEGAL.postalAddress` with a real, receivable postal address prior to production deployment.
  - **Build Gate Verification:** `scripts/verifyLegal.mjs` throws a build warning during development and a **hard build failure** when `NODE_ENV=production` or `VERCEL_ENV=production` if `ADDRESS_PLACEHOLDER` remains set.

### Issue 7.2: Non-Dark-Pattern Exit Prompts & Streak Retention
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** FTC Dark Patterns Enforcement Guidance, Restore Online Shoppers' Confidence Act (ROSCA).
* **Specific Code / Data Paths:**
  - `src/lib/streakRetention.js`
  - `src/components/streak/StayForStreakModal.jsx`
  - `scripts/verifyRetention.mjs`
* **Legal Analysis:**
  Manipulative user interfaces ("dark patterns") that trap users, confuse navigation, or employ coercive shame tactics when users attempt to leave the application violate FTC consumer protection directives.
* **Actionable Mitigations & Code Invariants:**
  - **Non-Coercive Retention Modal:** `StayForStreakModal.jsx` may never ask a user to stay arbitrarily. It highlights one specific uncompleted task, surfaces at most once per day, contains a single-tap dismiss button, and avoids `beforeunload` browser traps or shame-inducing button labels.
  - **Automated Verification:** `npm run verify:retention` asserts retention modal compliance.

---

## Summary Table of Critical Mitigations

| Risk / Violation Area | Severity Level | Primary Legal Standard | Actionable Mitigation & Code Invariant | Target File / Verification Script |
| :--- | :---: | :--- | :--- | :--- |
| **COPPA Minimum Age & Age-Gate** | **Critical** | COPPA 16 C.F.R. § 312 | Neutral DOB screen; under-13 sets `msp_ageBlocked` in LocalStorage and purges session; wheel reaches below 13. | `ageGate.js`, `BirthdateStep.jsx`, `verifyLegal.mjs` |
| **AdSense Minor Tracking** | **High** | COPPA, CCPA, CTDPA | Configure `tagForChildDirectedTreatment = 1` and `requestNonPersonalizedAds = 1` *strictly before* `adsbygoogle.js`. | `index.html`, `verifyLegal.mjs` |
| **Desmos API Licensing** | **High** | Contract / Lanham Act | Gracefully suppress embedded calculator if `VITE_DESMOS_API_KEY` is missing; render fallback link. | `desmos.js`, `DesmosSurface.jsx`, `verifySatDesmos.mjs` |
| **Biometric Voice Privacy** | **Medium-High** | Illinois BIPA, CCPA | Process Web Speech locally in-browser; disclose Chromium vendor speech transmission in Privacy Policy v1.1.0. | `LiveVoiceInterview.jsx`, `privacy.js`, `legalConfig.js` |
| **Trademark Attributions** | **High** | Lanham Act 15 U.S.C. § 1125 | Render `TRADEMARK_NOTICE` on test prep panels and footers; label external official links clearly. | `legalConfig.js`, `SatTab.jsx`, `verifyLegal.mjs` |
| **Physical Address Disclosure** | **Medium-High** | COPPA § 312.4, GDPR Art. 13 | Replace `ADDRESS_PLACEHOLDER` with a real physical postal address before production deploy; fail build if unset. | `legalConfig.js`, `verifyLegal.mjs` |
| **Medical / Professional Advice** | **Medium** | Unauthorized Practice of Medicine | Include explicit educational/non-clinical disclaimers; restrict content to high school pre-health exploration. | `terms.js` § 4, `App.jsx`, `studentProfile.js` |
| **Academic Integrity & Ghostwriting** | **Medium** | Academic Dishonesty | Prohibit AI from generating or rewriting complete essays; restrict Medabrain to structural feedback and critique. | `essayCritique.js`, `terms.js` § 5, `verifyEssayIntegrity.mjs` |
| **AI Outcome Claim Scrubbing** | **Medium** | FTC Act § 5 | Run generated study plans through `scrubClaims()` (`FORBIDDEN_CLAIM_PATTERNS`) to strip admissions/score guarantees. | `monthPlan/model.js`, `verifyMonthPlan.mjs` |
| **API Key Isolation & Daily AI Budget** | **High** | FTC Reasonable Data Security | Keep `SUPABASE_SERVICE_ROLE_KEY` server-side; route AI through `postMedabrain()` with unbudgeted safety classifier. | `supabaseAdmin.js`, `aiBudget.js`, `verifyAiBudget.mjs` |
| **Database Migration Schema Parity** | **High** | Data Security / Integrity | Enforce byte-for-byte Supabase migration chain testing against fresh Postgres instances. | `supabase/migrations/`, `verifyMigrations.mjs` |
| **ADA Title III Accessibility** | **Medium** | ADA Title III, WCAG 2.1 AA | Enforce complete ARIA labels, 4.5:1 palette contrast ratio, keyboard navigation, and reduced motion support. | `a11y.js`, `PlansTab.jsx`, `verifyPaletteContrast.mjs` |
| **Retention Modal Dark Patterns** | **Medium** | FTC Dark Patterns Guidance | Ensure retention exit prompts are single-tap dismissible, non-shaming, and capped at once per day. | `streakRetention.js`, `verifyRetention.mjs` |
