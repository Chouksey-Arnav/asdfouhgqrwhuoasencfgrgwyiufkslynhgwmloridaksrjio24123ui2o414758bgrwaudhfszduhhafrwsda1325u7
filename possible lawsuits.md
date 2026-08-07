# Complete Legal & Policy Compliance Risk Audit: Possible Lawsuits & Policy Violations

This document compiles a comprehensive, itemized legal, trademark, privacy, and regulatory audit of the **AscendPrep / Medschoolprep** platform. It covers everything from trademark infringement risks and privacy compliance gaps to professional liability and backend security issues. Actionable mitigations are provided for each identified vulnerability.

---

## Executive Summary of Risk Exposure

As an online learning and test preparation platform targeting high school students (minors aged 14–18) that integrates third-party tools, utilizes artificial intelligence, and models official testing structures, this application is exposed to five major vectors of legal liability:

1. **Intellectual Property & Trademark Infringement (High Risk)**: Unlicensed usage of protected test brand names (College Board®, SAT®, ACT®, Bluebook™), simulation of adaptive exam scoring models without clear legal disclaimers, and commercial/scale usage of Desmos® API's proprietary developer demo key in production.
2. **Children's & Students' Privacy Compliance - COPPA & FERPA (High Risk)**: Collecting personally identifiable information (PII) such as full names, emails, grade levels, and academic performance from high school students, without age-gating, parental consent, or a legally compliant Privacy Policy.
3. **Professional & Medical Advice Liability (Medium Risk)**: Branding the platform with "Med" prefixes (e.g., `medschoolprep`, `Medabrain`) and delivering deep career, clinical, and pre-medical pathway coaching through large language models without a comprehensive Terms of Service (ToS) or a solid professional liability waiver.
4. **Data Protection & Secure Key Handling (Medium Risk)**: Potential security breaches if high-privilege keys (like the Supabase Service Role Key) are ever leaked, coupled with a lack of robust rate-limiting on costly transactional SMTP email and third-party AI APIs.
5. **Accessibility Compliance - ADA Title III (Low-Medium Risk)**: Maintaining equal access for students with visual, motor, or cognitive disabilities, particularly when using third-party embeds (e.g., the Desmos calculator) or dynamic drag-and-drop user interfaces.

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
  The codebase extensively references "SAT," "ACT," "College Board," "Bluebook," and "Khan Academy." While the developers have added comments noting that no copyrighted questions have been scraped (e.g., inside `src/data/sat/taxonomy.js` and `src/lib/sat/aiPractice.js`), the user interface directly models "College Board Practice Tests 1–6" and labels them with brand names. Under the Lanham Act, a trademark owner (like College Board) can sue for trademark infringement or false association if consumers are likely to believe the platform is endorsed by, affiliated with, or sponsored by the official test-makers.
* **Actionable Mitigations:**
  - **Add Prominent Trademark Disclaimers:** Insert a footer or landing page disclaimer stating:
    > *"SAT® and AP® are registered trademarks of the College Board, which is not affiliated with, and does not endorse, this product. ACT® is a registered trademark of ACT, Inc. Bluebook™ is a trademark of the College Board. Khan Academy® is a registered trademark of Khan Academy, Inc. All other trademarks are the property of their respective owners."*
  - **Clarify Practice Resource Origins:** Explicitly label links to College Board linear tests or Bluebook as external, official resources (e.g., "Official External Resource provided free by College Board").

---

### Issue 1.2: Violations of Desmos API Terms of Service & Unlicensed Demo Key Usage
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** Breach of Contract, Unfair Competition, Trademark Infringement, Desmos API Terms of Service.
* **Specific Code / Data Paths:**
  - `src/lib/sat/desmos.js` (Lines 18–34, 38)
  - `src/components/sat/DesmosCalculator.jsx`
  - `src/components/sat/DesmosSurface.jsx`
* **Legal Analysis:**
  The codebase contains a hardcoded API key (`DEMO_API_KEY = 'dcb31709b452b1cf9dc26972add0fda6'`) which is Desmos's own public demo key. The code comments note: *"The demo key works but is rate-limited and unsupported — ship a real one before this sees real traffic."*
  Using Desmos's proprietary API and loading their commercial script directly from their CDN using their public documentation key in a production/commercial application is a direct violation of Desmos's developer terms. Desmos can revoke access immediately (breaking the SAT Math features), or sue for breach of contract and intellectual property theft if the platform is deployed commercially.
* **Actionable Mitigations:**
  - **Enforce Environment Variable Requirement:** Force the application to throw a descriptive error or gracefully disable the embedded calculator with a friendly error if `VITE_DESMOS_API_KEY` is not configured in the production environment. Do not fall back to the demo key.
  - **Acquire a Developer Key:** Apply for a legitimate developer API key at [desmos.com/api](https://www.desmos.com/api) and register the production domains.
  - **Provide a External Link Fallback:** If the API key is not configured or fails to load, render a clean link to Desmos's official public web calculator as an external resource.

---

### Issue 1.3: Reverse-Engineering Score Conversion & Diagnostic Recommendations
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Misleading Advertising / Unfair Trade Practices (FTC Act, 15 U.S.C. § 45), Negligent Misrepresentation.
* **Specific Code / Data Paths:**
  - `src/data/sat/scoring.js` (Lines 5–24)
  - `src/lib/sat/projection.js`
  - `src/components/sat/SatScoreReport.jsx`
* **Legal Analysis:**
  The platform estimates SAT scores using a custom conversion algorithm. While `src/data/sat/scoring.js` contains the warning `Estimated using our own conversion, not College Board’s official table. Treat it as a range, not a guarantee.`, students and parents could argue they were misled if they purchase or use the platform, receive an estimated high score, and subsequently score significantly lower on the official test. If score estimations are presented as scientific or guaranteed, this exposes the platform to class-action lawsuits for misleading advertising or negligent misrepresentation.
* **Actionable Mitigations:**
  - **Standardize Estimated Score Disclaimers:** Ensure the existing `SCORE_DISCLAIMER` is rendered clearly on every screen containing a score projection or diagnostic baseline report.
  - **Explicitly State Score Volatility:** Add text explaining that SAT scores fluctuate due to exam conditions, test-day anxiety, and scaling differences, and that the platform's diagnostic tools are for educational practice only.

---

## 2. Children's & Students' Privacy Compliance (COPPA, FERPA & GDPR)

### Issue 2.1: Lack of Parental Consent and COPPA Violations for Users Under 13
* **Risk Level:** Critical
* **Relevant Legal / Policy Frameworks:** Children's Online Privacy Protection Act (COPPA), 15 U.S.C. §§ 6501–6506; FTC COPPA Rule, 16 C.F.R. Part 312.
* **Specific Code / Data Paths:**
  - `src/components/auth/SignupView.jsx`
  - `src/components/onboarding/Onboarding.jsx`
  - `api/auth/complete-signup.js`
  - Supabase table: `app_users`
* **Legal Analysis:**
  COPPA strictly prohibits the collection, use, or disclosure of personal information (such as name, email, or precise academic indicators) from children under the age of 13 without verifiable parental consent. Although AscendPrep targets high schoolers (typically 14–18), there is no age-gating mechanism, date-of-birth collection, or parental consent workflow during signup. If a student under 13 registers (such as an advanced middle schooler practicing for high school or early tests), the app will collect their name, email, and academic performance, and sync it to the backend server. This represents a direct, critical COPPA violation, carrying potential FTC fines of up to $51,744 per violation.
* **Actionable Mitigations:**
  - **Implement an Age-Gate:** Add an age/date-of-birth validation step during the registration flow. If the user is under 13, block registration or redirect to a parental consent flow.
  - **Require Parental Consent for Under-13s:** If children under 13 are allowed to use the platform, implement a standard "double opt-in" parental consent process via email.
  - **Write and Link a Clear Privacy Policy:** Host a legally compliant Privacy Policy detailing exactly what information is collected, how it is stored, and how parents can request its deletion, and link it on the signup page.

---

### Issue 2.2: FERPA Exposure and Unprotected School/District Deployments
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g; 34 CFR Part 99.
* **Specific Code / Data Paths:**
  - `supabase/migrations/` (Schemas storing GPAs, scores, student milestones)
  - `api/progress-sync.js`
* **Legal Analysis:**
  If AscendPrep is marketed to, sold to, or integrated into school districts, high schools, or charter organizations where teachers use it to track or review student progress, it falls under FERPA jurisdiction. FERPA protects the privacy of student education records. Storing academic grades (GPAs), standardized test scores (SAT/ACT tracks), and student counseling profiles on a cloud database (Supabase) without formal school contracts, strict data-sharing agreements, or parent/student FERPA consent waivers violates federal educational privacy standards.
* **Actionable Mitigations:**
  - **Publish Terms of Service for Institutional Use:** Draft a dedicated legal agreement for school districts, detailing compliance under the "School Official" exception of FERPA.
  - **Disable Institutional Tracking by Default:** Ensure there are no administrative dashboards that allow teachers to view student records without a formal educational data agreement in place.

---

### Issue 2.3: GDPR and CCPA Compliance for Minors (Ages 13–18)
* **Risk Level:** High
* **Relevant Legal / Policy Frameworks:** General Data Protection Regulation (GDPR) Article 8, California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA).
* **Specific Code / Data Paths:**
  - `api/auth/complete-signup.js`
  - `api/auth/logout.js`
  - Client-side IndexedDB usage (`src/lib/db.js`)
* **Legal Analysis:**
  Under GDPR, minors aged 13–16 (depending on the EU member state) require parental consent for data processing. Under CCPA/CPRA, businesses must obtain affirmative opt-in consent ("opt-in right") to sell or share the personal information of consumers under 16 years of age. Currently, AscendPrep does not offer a mechanism for users to request data deletion ("Right to Be Forgotten"), export their data, or opt-out of processing, which violates California and European data privacy laws.
* **Actionable Mitigations:**
  - **Add a "Delete My Account" Feature:** Create a button in the Settings panel (`src/components/AppearanceSettings.jsx` or general settings) that makes a DELETE request to an API endpoint, completely purging their record from the Supabase `app_users`, `sessions`, `progress_sync`, and other tracking tables.
  - **Do Not Sell or Share Minor Data:** Explicitly state in the Terms and Privacy Policy that the platform does not sell, lease, or share student data with third-party advertisers.

---

## 3. Professional & Medical Advice Liability

### Issue 3.1: MedSchoolPrep Branding & Clinical Scenario Counseling
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Unauthorized Practice of Medicine, Professional Malpractice, FTC Act § 5 (Misleading Representations).
* **Specific Code / Data Paths:**
  - `package.json` (Description: *"A personalized path into medicine for high schoolers..."*)
  - `src/data/mmiCasperQuestions.js`
  - `src/data/interviewQuestions.js`
  - `src/data/lessonContent/` (e.g., `physician.js`, `nursing.js`, `publicHealth.js`)
* **Legal Analysis:**
  Although the codebase was reframed to focus on high-school-to-undergraduate pathways, the platform is internally called **"medschoolprep"** or **"MedSchoolPrep,"** and features lessons on pharmacology (ADME, first-pass metabolism, liver/kidney dosing adjustments) and ethical clinical decision-making. If the AI assistant or learning materials provide recommendations on specific clinical issues, health situations, or career steps, a student or parent could sue if they rely on this advice to their detriment (e.g., performing unsafe clinical shadowing behavior, or claiming the app taught them incorrect medical facts that led to academic failure or personal liability).
* **Actionable Mitigations:**
  - **Include a Clear Educational Disclaimer:** Embed a persistent disclosure in the application footer and inside lesson dashboards:
    > *"All content, lessons, quizzes, and clinical scenarios provided on this platform are for educational and career-exploration purposes only. They do not constitute formal medical education, professional clinical training, medical advice, or legal guidance. Users should not make clinical decisions based on this material."*
  - **De-emphasize Graduate/Medical Branding:** Transition fully away from the "MedSchoolPrep" branding in all user-facing settings, solidifying the "AscendPrep" brand name.

---

### Issue 3.2: AI Coach ("Medabrain") Liability for Admissions & Academic Advice
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Negligent Advising, Breach of Contract, Misleading Advertising.
* **Specific Code / Data Paths:**
  - `src/lib/studentProfile.js` (Lines 281–310, 419–435)
  - `api/groq.js`
* **Legal Analysis:**
  The conversational coach, **Medabrain**, is tasked with evaluating student resumes, essays (`src/lib/essayCritique.js`), and college tracking lists (`src/lib/studentProfile.js`), as well as offering college admissions recommendations. If Medabrain gives definitive advice (e.g., telling a student they are "guaranteed" admission to a BS/MD program or ranking their admissions deadlines erroneously), and the student fails to get admitted or misses a critical college application deadline, the student's family may seek damages for negligent advising or breach of contract.
* **Actionable Mitigations:**
  - **Inject Legal Guardrails into AI System Prompts:** Add explicit instructions in all system prompts inside `studentProfile.js` and `essayCritique.js`:
    > *"Never guarantee admissions, financial aid, or scholarship outcomes. State that you are an AI assistant and your advice is for planning purposes only. Instruct the student to verify all deadlines, college requirements, and essay guidelines directly with official university admissions portals."*
  - **Add an AI Disclaimer to Chat Windows:** Display a notice above the chat text field: *"Medabrain is an AI career assistant. Always double-check critical deadlines and requirements directly with your school counselor or admissions office."*

---

## 4. API Security, Transactional Limits, and Key Exposure

### Issue 4.1: Excessive Privilege and Key Leakage in Serverless Backend
* **Risk Level:** Medium-High
* **Relevant Legal / Policy Frameworks:** Cybersecurity Liability, Negligence (Data Breach Liability).
* **Specific Code / Data Paths:**
  - `api/_lib/supabaseAdmin.js`
  - `server.js`
* **Legal Analysis:**
  The backend connects to Supabase using the `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses Row-Level Security (RLS) entirely. If this key is ever exposed in client-side bundles (e.g., via a misconfigured environment variable prefix like `VITE_`), committed to a public git branch, or leaked via server logs, an attacker could read, modify, or delete the entire database. This would constitute gross negligence in data security, leading to severe GDPR, CCPA, and general cybersecurity lawsuits.
* **Actionable Mitigations:**
  - **Enforce Build-time Environment Key Isolation:** Implement strict build checks to guarantee that no variable starting with `SUPABASE_` is bundled into the client build.
  - **Restrict RLS and DB Roles:** Move from the service role key to user-specific tokens (`supabase.auth`) for client-driven transactions wherever possible, utilizing RLS on all tables.
  - **Monitor Key Leaks:** Regularly run automated secret scanners (e.g., GitGuardian) on the repository.

---

### Issue 4.2: Lack of Rate-Limiting on Costly / Abuse-Prone Endpoints
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Cybersecurity Abuse, Financial / Operating Loss Liability.
* **Specific Code / Data Paths:**
  - `api/send-email.js`
  - `api/auth/send-otp.js`
  - `api/groq.js`
* **Legal Analysis:**
  Endpoints that send transactional emails (via SMTP) or query paid LLMs (via Groq) lack robust rate-limiting controls. Malicious actors could script requests to these endpoints, causing massive financial bills on transactional email accounts (Brevo) or LLM providers (Groq), or rendering the system unavailable (Denial of Service).
* **Actionable Mitigations:**
  - **Implement IP-based and User-based Rate Limiting:** Apply rate limiters (such as `express-rate-limit` or Vercel edge middleware) on `/api/auth/send-otp`, `/api/send-email`, and `/api/groq` to restrict users to a reasonable number of requests per hour.
  - **Monitor Usage Spikes:** Enable usage alerts and spend caps on Brevo, Groq, and Supabase dashboards.

---

## 5. Accessibility Compliance (ADA Title III)

### Issue 5.1: Non-Compliance with ADA Title III and Web Content Accessibility Guidelines (WCAG)
* **Risk Level:** Medium
* **Relevant Legal / Policy Frameworks:** Americans with Disabilities Act (ADA) Title III (Public Accommodations), WCAG 2.1 AA Standards.
* **Specific Code / Data Paths:**
  - `src/lib/a11y.js`
  - `src/components/sat/DesmosSurface.jsx`
  - Complex custom visual grids and charts without proper screen reader labels.
* **Legal Analysis:**
  Under Title III of the ADA, websites and web-based applications are increasingly held to be places of public accommodation. If a student with a visual, hearing, or physical disability cannot navigate the platform, practice SAT questions, or use the calculators because of lack of keyboard navigation, low contrast, or missing screen reader labels, the platform is vulnerable to ADA lawsuits (which are frequently filed as predatory class actions).
* **Actionable Mitigations:**
  - **Implement Complete Aria Labels:** Ensure every interactive element (buttons, tabs, custom inputs, progress bars) possesses descriptive `aria-label`, `aria-expanded`, and keyboard accessibility (`tabIndex={0}`, handling Enter/Space key presses).
  - **Verify Palette Contrast:** Regularly run `npm run verify:contrast` to guarantee colors satisfy the 4.5:1 ratio for normal text.
  - **Audit Keyboard Trap Risks:** Ensure complex widgets like the embedded Desmos graphing calculator or slide-out modals do not create keyboard traps where a keyboard-only user cannot exit or focus back on the main content.

---

## Summary Table of Critical Mitigations

| Risk / Violation Area | Severity | Primary Mitigation | Target File / Area |
| :--- | :---: | :--- | :--- |
| **COPPA Compliance Gap** | **Critical** | Add an age-gate on registration, implement parental consent, publish a privacy policy. | `SignupView.jsx`, `complete-signup.js` |
| **Desmos Demo Key Abuse** | **High** | Block initialization of the calculator if `VITE_DESMOS_API_KEY` is not set; remove demo key fallback. | `src/lib/sat/desmos.js` |
| **Trademark Infringement** | **High** | Add trademark disclaimers and clearly label College Board / external test assets. | All SAT/ACT panels and landing pages |
| **Professional Liability** | **Medium** | Embed medical, legal, and academic advising disclaimers across all lessons and the chat window. | `studentProfile.js`, `App.jsx` footer |
| **ADA Accessibility Gap** | **Medium** | Ensure complete keyboard navigation, contrast, and proper ARIA role labeling. | Custom grid panels, calculator views |
