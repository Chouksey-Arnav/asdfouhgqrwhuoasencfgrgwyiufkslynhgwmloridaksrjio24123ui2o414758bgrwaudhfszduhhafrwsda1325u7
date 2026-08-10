z# Complete Legal & Policy Compliance Risk Audit: Possible Lawsuits & Policy Violations

This document compiles a comprehensive, itemized legal, trademark, privacy, and regulatory audit of the **MedSchoolPrep** platform. It covers everything from trademark infringement risks and privacy compliance gaps to professional liability, biometric/voice data privacy, and backend security issues. Actionable mitigations are provided for each identified vulnerability.

---

## Executive Summary of Risk Exposure

As an online learning and college preparation platform targeting minors (aged 13–18) that integrates third-party tools, utilizes browser-based sensory APIs, integrates Google AdSense, and delivers automated AI coaching, this application is exposed to seven major vectors of legal liability and possible lawsuits:

1. **Intellectual Property & Trademark Infringement (High Risk)**: Unlicensed usage of protected test brand names (College Board®, SAT®, ACT®, Bluebook™, Khan Academy®), simulation of adaptive exam scoring models without clear legal disclaimers, and commercial usage of Desmos® API's proprietary developer demo key in production.
2. **Children's & Students' Privacy Compliance - COPPA, FERPA & GDPR/CCPA (High Risk)**: Collecting personally identifiable information (PII) such as grades, test scores, essays, and recommender details from minors, requiring rigorous age-gating, parental consent models, and compliant data export/deletion mechanisms.
3. **Professional & Medical Advice Liability (Medium Risk)**: Branding the platform with "Med" prefixes (e.g., `MedSchoolPrep`, `Medabrain`) and delivering clinical pathway lessons, pharmacology tutorials, and college admissions counseling through large language models without comprehensive disclaimers and professional liability waivers.
4. **Biometric, Voice, and Sensor Privacy - BIPA, CCPA & COPPA (Medium-High Risk)**: Utilizing browser-native microphones, Web Speech recognition, and voice synthesis APIs for simulated admissions interviews, which can trigger biometric consent violations (e.g., Illinois BIPA) if not carefully sandboxed, disclosed, and decoupled from server-side storage.
5. **API Security, Key Leakage, and Financial Abuse (Medium Risk)**: Potential database-wide security breaches if high-privilege keys (like the Supabase Service Role Key) are ever leaked, coupled with a lack of robust rate-limiting on costly transactional SMTP email and third-party AI APIs.
6. **Accessibility Compliance - ADA Title III (Low-Medium Risk)**: Maintaining equal access for students with visual, motor, or cognitive disabilities, particularly when using third-party embeds (e.g., the Desmos calculator) or complex custom responsive grids and charts.
7. **Deceptive Trade Practices - FTC Act § 5 (Medium Risk)**: Risk of publishing defective or incomplete legal notices (such as placeholder physical addresses in privacy policies or terms of service) which can be construed as deceptive under federal and state consumer protection laws.

---

## 1. Intellectual Property & Trademark Infringement

### Issue 1.1: Unlicensed Use and Potential Trademark Confusion with Test Brands
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Lanham Act (U.S. Trademark Law), 15 U.S.C. § 1114 & § 1125 (Trademark Infringement and False Designation of Origin).
* **Specific Code / Data Paths:**
  - `src/components/sat/` (e.g., `SatTab.jsx`, `SatBaselinePanel.jsx`, `SatFullTestPanel.jsx`)
  - `src/data/sat/` (e.g., `forms.js`, `taxonomy.js`, `resources.js`, `scoring.js`)
  - `src/lib/sat/` (e.g., `aiPractice.js`, `aiStudyPlan.js`)
* **Legal Analysis:**
  The codebase extensively references "SAT," "ACT," "College Board," "Bluebook," and "Khan Academy." While no copyrighted questions have been scraped (as verified by audits), the user interface directly models "College Board Practice Tests 1–6" and labels them with brand names. Under the Lanham Act, trademark owners can sue for trademark infringement or false association if consumers are likely to believe the platform is endorsed by, affiliated with, or sponsored by the official test-makers.
* **Actionable Mitigations:**
  - **Inject Comprehensive Trademark Disclaimers:** Ensure the `TRADEMARK_NOTICE` array in `src/legal/legalConfig.js` is rendered clearly on every screen containing a score projection, practice test, or diagnostic baseline report.
  - **Clarify Practice Resource Origins:** Explicitly label links to College Board linear tests or Bluebook as external, official resources (e.g., "Official External Resource provided free by College Board").

### Issue 1.2: Violations of Desmos API Terms of Service & Unlicensed Demo Key Usage
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Breach of Contract, Unfair Competition, Trademark Infringement, Desmos API Terms of Service.
* **Specific Code / Data Paths:**
  - `src/lib/sat/desmos.js` (Lines 18–34, 38)
  - `src/components/sat/DesmosCalculator.jsx`
  - `src/components/sat/DesmosSurface.jsx`
* **Legal Analysis:**
  The codebase contains a hardcoded API key (`DEMO_API_KEY = 'dcb31709b452b1cf9dc26972add0fda6'`) which is Desmos's own public demo key.
  Using Desmos's proprietary API and loading their commercial script directly from their CDN using their public documentation key in a production/commercial application is a direct violation of Desmos's developer terms. Desmos can revoke access immediately (breaking the SAT Math features), or sue for breach of contract and intellectual property theft if the platform is deployed commercially.
* **Actionable Mitigations:**
  - **Enforce Environment Variable Requirement:** Force the application to gracefully disable the embedded calculator with a friendly error if `VITE_DESMOS_API_KEY` is not configured in the production environment. Do not fall back to the demo key.
  - **Acquire a Developer Key:** Apply for a legitimate developer API key at [desmos.com/api](https://www.desmos.com/api) and register the production domains.
  - **Provide a External Link Fallback:** If the API key is not configured or fails to load, render a clean link to Desmos's official public web calculator as an external resource.

### Issue 1.3: Reverse-Engineering Score Conversion & Diagnostic Recommendations
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Misleading Advertising / Unfair Trade Practices (FTC Act, 15 U.S.C. § 45), Negligent Misrepresentation.
* **Specific Code / Data Paths:**
  - `src/data/sat/scoring.js`
  - `src/lib/sat/projection.js`
  - `src/components/sat/SatScoreReport.jsx`
* **Legal Analysis:**
  The platform estimates SAT scores using a custom conversion algorithm. While `src/data/sat/scoring.js` contains the warning `Estimated using our own conversion, not College Board’s official table. Treat it as a range, not a guarantee.`, students and parents could argue they were misled if they purchase or use the platform, receive an estimated high score, and subsequently score significantly lower on the official test. If score estimations are presented as scientific or guaranteed, this exposes the platform to class-action lawsuits for misleading advertising or negligent misrepresentation.
* **Actionable Mitigations:**
  - **Standardize Estimated Score Disclaimers:** Ensure the existing `SCORE_DISCLAIMER` is rendered clearly on every screen containing a score projection or diagnostic baseline report.
  - **Explicitly State Score Volatility:** Add text explaining that SAT scores fluctuate due to exam conditions, test-day anxiety, and scaling differences, and that the platform's diagnostic tools are for educational practice only.

---

## 2. Children's & Students' Privacy Compliance (COPPA, FERPA & GDPR/CCPA)

### Issue 2.1: Lack of Parental Consent and COPPA Violations for Users Under 13
* **Risk Level:** Critical (High Risk)
* **Relevant Legal / Policy Frameworks:** Children's Online Privacy Protection Act (COPPA), 15 U.S.C. §§ 6501–6506; FTC COPPA Rule, 16 C.F.R. Part 312.
* **Specific Code / Data Paths:**
  - `src/lib/ageGate.js` (Core age gating logic and `msp_ageBlocked` persistence)
  - `src/components/onboarding/steps/BirthdateStep.jsx`
  - `src/components/auth/SignupView.jsx`
  - `api/auth/complete-signup.js`
* **Legal Analysis:**
  COPPA strictly prohibits the collection, use, or disclosure of personal information (such as name, email, or precise academic indicators) from children under the age of 13 without verifiable parental consent. Although MedSchoolPrep targets high schoolers (typically 14–18), there must be a neutral and robust age-gating mechanism. The birthdate verification in `src/lib/ageGate.js` enforces a minimum age of 13 and stores a local storage indicator `msp_ageBlocked` to prevent students from trying another birthday to bypass the age gate (addressing the FTC's age-screen bypass guidance).
* **Actionable Mitigations:**
  - **Maintain Neutral Age Gate:** Do not pre-fill or encourage a specific birth year on the selection wheel.
  - **Enforce Local Storage Block:** Consistently consult the `isAgeBlocked()` helper in `ageGate.js` during the sign-up and onboarding steps to prevent immediate retry attempts.
  - **Ensure Policy Compliance:** Link to the verified Privacy Policy (`privacy.js`) directly on the sign-up screen.

### Issue 2.2: FERPA Exposure and Unprotected School/District Deployments
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g; 34 CFR Part 99.
* **Specific Code / Data Paths:**
  - `src/legal/privacy.js` (Section 14: Student records and schools)
  - `src/legal/terms.js` (Section 19: Use by schools, districts, and educators)
  - `api/progress-sync.js`
* **Legal Analysis:**
  If MedSchoolPrep is marketed to, sold to, or integrated into school districts, high schools, or charter organizations where teachers use it to track or review student progress, it falls under FERPA jurisdiction. Currently, the platform has no teacher/administrator dashboard or roster imports, and data belongs to students. Storing academic grades (GPAs), standardized test scores (SAT/ACT tracks), and student counseling profiles on a cloud database (Supabase) without formal school contracts or strict data-sharing agreements violates federal educational privacy standards.
* **Actionable Mitigations:**
  - **Explicit Policy Boundaries:** Maintain the strong disclaimer in Section 19 of the Terms of Service and Section 14 of the Privacy Policy stating that the Service is direct-to-student and not authorized for school district deployments without a separate written data-privacy agreement.
  - **Disable Classroom Sharing:** Do not build administrative dashboards that allow teachers to view student records without a formal educational data agreement in place.

### Issue 2.3: GDPR and CCPA/CPRA Compliance for Minors (Ages 13–18)
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** General Data Protection Regulation (GDPR) Article 8, California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA).
* **Specific Code / Data Paths:**
  - `src/App.jsx` (Settings Panel → Account Deletion / Data Export buttons)
  - `api/auth/complete-signup.js`
  - Client-side IndexedDB usage (`src/lib/db.js`)
* **Legal Analysis:**
  Under CCPA/CPRA, businesses must obtain affirmative opt-in consent ("opt-in right") to sell or share the personal information of consumers under 16 years of age. Under GDPR, minors require parental consent for data processing. The platform must offer robust mechanisms for users to request data deletion ("Right to Be Forgotten") and data portability. The platform implements an explicit data exporter (`Download my data` calling `AuthAPI.exportMyData()`) and account deletion (`Delete my account` calling `AuthAPI.deleteMyAccount(account.email)`) in `src/App.jsx`.
* **Actionable Mitigations:**
  - **Verify Deletion Completeness:** Ensure that deleting an account completely purges their record from the Supabase `app_users`, `sessions`, `progress_sync`, and other tracking tables, and clears client-side IndexedDB and LocalStorage.
  - **Strict "Do Not Sell" Adherence:** Explicitly state in the Terms and Privacy Policy that the platform does not sell, lease, or share student data with third-party advertisers.

### Issue 2.4: Google AdSense Cookie Profiling & Tracking Risks for Minors
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** COPPA, CCPA/CPRA (Minor Sharing), Connecticut Data Privacy Act (CTDPA - bans targeted ads to under-18s).
* **Specific Code / Data Paths:**
  - `index.html` (Google AdSense script tag and initial configuration script block)
  - `src/legal/privacy.js` (Section 8: Advertising)
* **Legal Analysis:**
  The platform is free and supported by Google AdSense (client `ca-pub-4110886931308197`). Since our audience consists of high-school students (minors, many under 16), serving personalized, behavioral ads represents a direct regulatory violation under COPPA, CCPA, and CTDPA. While the configuration script block sets `requestNonPersonalizedAds = 1`, `tagForChildDirectedTreatment = 1`, `tagForUnderAgeOfConsent = 1`, and `restrictDataProcessing = 1` *before* loading the AdSense script, any script reordering or vendor network failure that allows behavioral tracking cookies to load on a minor's browser poses an immediate risk of an FTC investigation or state Attorney General lawsuit.
* **Actionable Mitigations:**
  - **Do Not Reorder AdSense Scripts:** Keep the configuration script tag *strictly before* the Google AdSense script tag to ensure all ad requests are marked as child-directed.
  - **Enforce verification scripts:** Rely on `scripts/verifyLegal.mjs` to mechanically verify that our actual HTML matches our stated legal policies and does not load third-party trackers without tagging.

---

## 3. Professional & Medical Advice Liability

### Issue 3.1: MedSchoolPrep Branding & Clinical Scenario Counseling
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Unauthorized Practice of Medicine, Professional Malpractice, FTC Act § 5 (Misleading Representations).
* **Specific Code / Data Paths:**
  - `package.json` (Description: *"A personalized path into medicine for high schoolers..."*)
  - `src/data/lessonContent/` (e.g., `physician.js`, `nursing.js`, `publicHealth.js`, `pharmacy.js` containing cellular biochemistry and pharmacology discussions)
* **Legal Analysis:**
  The platform is branded as "MedSchoolPrep," which could imply graduate-level medical education, clinical training, or pathways to a medical license. Lessons on cellular biology, pharmacology (enzymes as drug targets), and anatomy are presented. If a user relies on this educational content to make clinical decisions or self-diagnose, the platform could face professional liability claims or accusations of practicing medicine without a license.
* **Actionable Mitigations:**
  - **In-App Disclaimers:** Embed prominent educational disclaimers inside the Settings → Legal panel, the landing page, and inside the lesson dashboards stating that the content is for high-school/career exploration purposes only and does not constitute medical advice or training.
  - **Honor Terms of Service:** Maintain explicit language in `src/legal/terms.js` § 4 explaining that "MedSchoolPrep is not a medical school and provides no medical education, advice, or credential."

### Issue 3.2: AI Coach ("Medabrain") Liability for Admissions & Academic Advice
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Negligent Advising, Breach of Contract, Misleading Advertising.
* **Specific Code / Data Paths:**
  - `src/lib/studentProfile.js` (Conversational coach prompts)
  - `src/lib/essayCritique.js` (Essay feedback and resume comments)
  - `api/groq.js`
* **Legal Analysis:**
  The AI Coach, **Medabrain**, provides recommendations on college admissions, resumes, essays, and college tracking lists. If the AI coach gives definitive or misleading guarantees (e.g. guaranteeing admission to BS/MD programs, or reporting incorrect deadlines), a student's family could sue the platform for negligent advising or breach of contract if the student misses deadlines or is rejected.
* **Actionable Mitigations:**
  - **Inject Guardrails in System Prompts:** Maintain explicit instructions in the AI prompts instructing the model never to guarantee admissions, financial aid, or scholarship outcomes, and to explicitly state that all deadlines should be verified with official portals.
  - **Explicit UI Warnings:** Display clear, readable notices above chat inputs stating: *"Medabrain is an AI career assistant. Always verify deadlines and requirements directly with your counselor or admissions office."*

### Issue 3.3: Plagiarism and Academic Integrity Violations
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Academic Integrity/Plagiarism Policies, Fraud, Misleading Advertising.
* **Specific Code / Data Paths:**
  - `src/lib/essayCritique.js`
  - `src/legal/terms.js` (Section 5: The AI coach and other AI features)
* **Legal Analysis:**
  If the AI tools draft or write essays for students, and the students submit these to college admissions or high schools, they could be disqualified or suspended for academic dishonesty. If parents/students claim they were led to believe the AI tool was an acceptable "admissions writing helper" without understanding authorship policies, they might sue the platform for damages.
* **Actionable Mitigations:**
  - **Strict Integrity Boundaries:** Maintain system prompt rules that prevent the AI from rewriting essays or drafting paragraphs from scratch. The tool must act only as a critique partner (suggesting improvements, catching grammar/structure errors).
  - **Explicit Terms Warning:** Section 5 of the Terms of Service must state that the student is solely responsible for ensuring compliance with academic-integrity and authorship rules, and that the platform does not warrant that AI-assisted text is acceptable under any institution's policies.

---

## 4. Biometric, Voice, and Sensor Privacy (Speech API & Audio Sensors)

### Issue 4.1: Live Mock Voice Interview Speech Processing & Biometric Risk
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Illinois Biometric Information Privacy Act (BIPA), 740 ILCS 14/1 et seq.; CCPA/CPRA Biometric Data Rules; COPPA.
* **Specific Code / Data Paths:**
  - `src/components/LiveVoiceInterview.jsx` (Renders mic interaction and orchestrates speech-to-text / text-to-speech)
  - `src/lib/speech.js` (Initializes webkitSpeechRecognition and speechSynthesis)
* **Legal Analysis:**
  The platform offers a **Live Voice Interview** feature where students can speak their answers into their microphones, which are transcribed in real-time, and listen to the AI interviewer speak back.
  Under the **Illinois Biometric Information Privacy Act (BIPA)** and similar state laws (Texas, Washington, and California under CCPA), "voiceprints" or vocal recordings are classified as biometric identifiers. If a platform records, processes, or transmits biometric identifiers from minors without explicit, written parental consent, it is subject to severe statutory damages ($1,000 for negligent violations, $5,000 for intentional violations).
  *While the Web Speech API is browser-native and processes audio locally (or relies on the browser vendor's existing operating system integrations),* integrating sensory tools on a platform for minors creates a high-profile target for predatory class-action lawsuits accusing the site of capturing voiceprints or audio recordings without explicit biometric disclosures.
* **Actionable Mitigations:**
  - **Explicit Voice Privacy Disclaimer:** Add a prominent note inside the Voice Interview's landing view or onboarding screen clarifying that *all audio processing is executed locally in the browser via native Web Speech APIs, no audio recordings or voiceprints are ever transmitted to or stored on our servers, and no biometric data is collected.*
  - **Document in Privacy Policy:** Section 4 of the Privacy Policy (`privacy.js`) must clearly declare: *"We do not access your camera, microphone, contacts, or files, except that the interview simulator uses your browser's speech features locally on your device when you start it, and we do not record or transmit that audio."*
  - **Verify Local Execution:** Ensure the mic data stream is fed directly into the browser's `SpeechRecognition` constructor and never sent to a backend audio storage bucket (such as Supabase Storage) or a third-party audio transcribing service.

---

## 5. API Security, Transactional Limits, and Key Exposure

### Issue 5.1: Excessive Privilege and Key Leakage in Serverless Backend
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Cybersecurity Liability, Negligence (Data Breach Liability), FTC Act § 5 (Securing Personal Data).
* **Specific Code / Data Paths:**
  - `api/_lib/supabaseAdmin.js`
  - `server.js`
* **Legal Analysis:**
  The backend connects to Supabase using the high-privilege `SUPABASE_SERVICE_ROLE_KEY` to sync data. This key bypasses Row-Level Security (RLS) entirely. If this key is ever compiled into client-side bundles (e.g., via a misconfigured environment variable prefix like `VITE_`), committed to a public git branch, or leaked via server logs, an attacker could read, modify, or delete the entire database. Under state data breach laws and the FTC's data security guidelines, this would represent a major failure of reasonable security, resulting in severe negligence and class-action lawsuits.
* **Actionable Mitigations:**
  - **Isolate Environment Keys:** Ensure that the service role key is stored *only* as a backend server environment variable and is never exposed to Vite's bundler.
  - **Apply Row-Level Security (RLS):** Ensure RLS is active on all Supabase tables so that even if the public anonymous key is used, user-scoped data remains strictly isolated.

### Issue 5.2: Lack of Rate-Limiting on Costly / Abuse-Prone Endpoints
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Financial / Operating Loss Liability, Unfair Trade Practices.
* **Specific Code / Data Paths:**
  - `api/send-email.js`
  - `api/groq.js`
* **Legal Analysis:**
  Endpoints that send transactional emails (via SMTP / Brevo) or query paid LLMs (via Groq) lack robust rate-limiting controls. Malicious actors could script requests to these endpoints, causing massive financial bills on transactional email accounts or LLM providers, or rendering the system unavailable (Denial of Service), which would hurt active students trying to prepare for imminent exams.
* **Actionable Mitigations:**
  - **Implement Server-Side Rate Limiting:** Apply rate limiters (such as `express-rate-limit` or Vercel edge middleware) on `/api/send-email` and `/api/groq` to restrict users/IPs to a reasonable number of requests per hour.
  - **Configure Spend Caps:** Enable usage alerts and strict daily spend caps on Brevo, Groq, and Supabase dashboards to contain financial liability.

---

## 6. Accessibility Compliance (ADA Title III)

### Issue 6.1: Non-Compliance with ADA Title III and Web Content Accessibility Guidelines (WCAG)
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Americans with Disabilities Act (ADA) Title III (Public Accommodations), WCAG 2.1 AA Standards.
* **Specific Code / Data Paths:**
  - `src/lib/a11y.js`
  - `src/components/sat/DesmosSurface.jsx`
  - Complex custom responsive visual grids, tables, and charts without proper screen reader labels.
* **Legal Analysis:**
  Under Title III of the ADA, websites and web-based applications are held to be places of public accommodation. If a student with visual, motor, or cognitive disabilities cannot navigate the platform, practice SAT questions, or use the calculators due to lack of keyboard navigation, low contrast, or missing screen reader labels, the platform is vulnerable to ADA lawsuits (which are frequently filed as predatory class actions).
* **Actionable Mitigations:**
  - **Implement Complete Aria Labels:** Ensure every interactive element (buttons, tabs, custom inputs, progress bars) possesses descriptive `aria-label`, `aria-expanded`, and keyboard accessibility (`tabIndex={0}`, handling Enter/Space key presses).
  - **Verify Palette Contrast:** Regularly run `npm run verify:contrast` to guarantee colors satisfy the 4.5:1 ratio for normal text.
  - **Audit Keyboard Trap Risks:** Ensure complex widgets like the embedded Desmos graphing calculator or slide-out modals do not create keyboard traps where a keyboard-only user cannot exit or focus back on the main content.

---

## 7. Deceptive Trade Practices (FTC Act § 5)

### Issue 7.1: Legal Notice Incompleteness & Placeholder Contact Information
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Federal Trade Commission (FTC) Act Section 5, 15 U.S.C. § 45 (Unfair or Deceptive Acts or Practices); COPPA Direct Notice Requirements.
* **Specific Code / Data Paths:**
  - `src/legal/legalConfig.js` (Uses `postalAddress: ADDRESS_PLACEHOLDER`)
* **Legal Analysis:**
  In `src/legal/legalConfig.js`, the physical address of the operator is configured as a placeholder: `'ADDRESS PENDING — SET BEFORE PRODUCTION'`.
  COPPA (16 C.F.R. § 312.4(d)) requires the operator's actual physical address to be clearly disclosed in the direct notice and the online privacy policy. GDPR Article 13(1)(a) similarly requires the controller's identity and physical address. Publishing legally binding documents with obvious placeholder values is a deceptive trade practice under Section 5 of the FTC Act, as it overstates compliance, conceals the operator's physical identity, and violates statutory disclosure mandates, making the agreements voidable and exposing the operator to direct regulatory fines.
* **Actionable Mitigations:**
  - **Resolve Address Placeholder Before Release:** Replace `ADDRESS_PLACEHOLDER` with a real, physical, receivable postal address in `src/legal/legalConfig.js` before deploying to production.
  - **Enforce Build-time Blocking:** Ensure the verification script (`scripts/verifyLegal.mjs`) automatically throws a build error or warnings to block releases if placeholder strings exist in the legal config.

---

## Summary Table of Critical Mitigations

| Risk / Violation Area | Severity | Primary Mitigation | Target File / Area |
| :--- | :---: | :--- | :--- |
| **COPPA Compliance Gap** | **Critical** | Enforce DOB age-gating, implement local storage age block, link verified Privacy Policy on signup. | `SignupView.jsx`, `ageGate.js`, `complete-signup.js` |
| **Google AdSense Minor Tracking** | **High** | Strictly configure and pre-set child-directed TFCD tags *before* loading AdSense scripts. | `index.html` |
| **Desmos Demo Key Abuse** | **High** | Gracefully disable calculator if `VITE_DESMOS_API_KEY` is not set; remove demo key fallback. | `src/lib/sat/desmos.js` |
| **Biometric Voice Privacy** | **Medium-High** | Add explicit voice disclaimers; process Web Speech locally in-browser; do not store audio. | `LiveVoiceInterview.jsx`, `speech.js` |
| **Trademark Infringement** | **High** | Add trademark disclaimers and clearly label College Board / external test assets. | All SAT/ACT panels and landing pages |
| **Deceptive Legal Notices** | **Medium-High** | Resolve `ADDRESS_PLACEHOLDER` with a real physical address to prevent COPPA/FTC violations. | `src/legal/legalConfig.js` |
| **Professional/Medical Liability** | **Medium** | Embed medical and advising disclaimers across all lessons, chat windows, and Settings panel. | `studentProfile.js`, `terms.js`, `App.jsx` footer |
| **Academic Integrity Breach** | **Medium** | Limit AI tools to feedback/critique, prohibiting essay generation; clearly outline student authorship in Terms. | `essayCritique.js`, `terms.js` § 5 |
| **ADA Accessibility Gap** | **Medium** | Ensure complete keyboard navigation, contrast, and proper ARIA role labeling. | Custom grid panels, calculator views |
