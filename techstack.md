# MedSchoolPrep Full Technology Stack Reference

This document provides a comprehensive and detailed breakdown of the complete technology stack, core systems, offline algorithms, and API routing architecture utilized across the **MedSchoolPrep** platform.

---

## 💻 1. Frontend Architecture & Frameworks

The client-side application is engineered as a modern, high-performance Single Page Application (SPA) designed to load rapidly and operate seamlessly across desktop and mobile devices.

*   **Core Library & Framework:** React (v18.2.0)
*   **Build Tool & Dev Server:** Vite (v5.0.8)
    *   Provides extremely fast Hot Module Replacement (HMR).
    *   Configures build outputs and asset optimization for production.
*   **Styling & Design System:** Tailwind CSS
    *   Utilizes a utility-first utility class framework.
    *   Features a responsive system supporting dynamic theme adaptations (dark/light mode, custom high-contrast palettes, glassmorphism panels, and interactive elements).
    *   Configured with custom spacing, responsive grids, and flexible containers (`G` and `RG` layout helpers).
*   **Animations & Motion Design:** Framer Motion (v11.3.31)
    *   Handles platform-wide animations, page transitions, and interactive components.
    *   Includes accessibility overrides supporting the `reducedMotion` preference forwarded down to children (e.g., plans workspace, weekly study roadmaps).
*   **Data Visualization:** Chart.js (v4.4.4) & react-chartjs-2 (v5.2.0)
    *   Powers the interactive score tracking dashboard (`ScoreTrackerPanel.jsx`).
    *   Calculates and charts SAT/ACT composite and section-by-section score trend lines over time.
*   **Typography & Formatting Engine:**
    *   **Katex (v0.16.11):** Renders high-fidelity LaTeX equations, formulas, and math operators safely and beautifully inside the SAT Hub (`MathText.jsx`).
    *   **Marked (v14.1.2):** High-speed Markdown compiler used to render lesson content, AI insights, study guide notes, and coaching feedback (`renderMarkdown.js`).
*   **UI Components & Utilities:**
    *   **Lucide React (v1.23.0):** Rich library of crisp, pre-rendered vector icons.
    *   **Canvas Confetti (v1.9.3):** Triggers fullscreen confetti showers to celebrate major milestones, streak updates, and verified quizzes.
    *   **DOMPurify (v3.1.6):** Sanitizes compiled Markdown and dynamic HTML outputs to protect against Cross-Site Scripting (XSS) injection.
    *   **Fuse.js (v7.0.0):** Client-side lightweight fuzzy search engine used to query across the E-Library catalog and personal study notes.
    *   **jsPDF (v2.5.2):** Compiles and exports student portfolios, activities, clinical hour logs, and achievements directly into print-ready PDF files (`exportPDF.js`).

---

## ⚙️ 2. Backend Environment & Route Architecture

MedSchoolPrep is deployed on a self-hosted Ubuntu Linux VPS environment managed via Coolify, with the official domain `medschoolprep.cloud`. (Vercel was previously used during the beta testing stage, but we are completely off the Vercel stage now; Vercel CI and monitoring are deprecated and useless).

*   **Node.js & Express (Production/VPS via Coolify):**
    *   **Runtime:** Node.js (>= v22.0.0) on Ubuntu Linux
    *   **Server Framework:** Express (v4.22.2)
    *   **Production Dispatcher (`server.js`):** Acts as the primary backend API dispatcher for self-hosted VPS environments (Coolify). It manually imports, wraps, and mounts all API handlers under `api/` to ensure flawless routing and identical runtime performance.
    *   **Single Page Application (SPA) Fallback:** Integrates robust static routing that serves compiled assets from `dist/` and redirects extensionless application paths to `index.html` while correctly returning a `404 Not Found` for missing files (preventing crawler index corruption).

---

## 💾 3. Database Layer & Client-Side Offline Persistence

To ensure flawless offline performance, resilience on unstable networks, and instant page loads, MedSchoolPrep implements a dual-database architecture.

### Remote Server Database
*   **Supabase (PostgreSQL):**
    *   Houses the core user schemas, session tables, and synced academic records.
    *   Database structures are maintained via structured SQL migration scripts (`supabase/migrations/`):
        *   `0000_base_schema.sql` — Core users, credentials, profile metadata, and activity registers.
        *   `0001_portfolio_credibility_expansion.sql` — Expanded college lists, extracurricular logs, and essay workspaces.
        *   `0002_password_auth.sql` — Password hash registers and security salts.
        *   `0003_progress_sync.sql` — Progress trackers, unit verifications, and flashcards.
        *   `0004_reward_and_counter_sync.sql` — Streak trackers, claim registries, and gamification counters.

### Client-Side Database & Queue Synchronization
*   **Dexie.js (v4.0.8) & IndexedDB:**
    *   Configures a persistent, high-speed on-device database wrapper.
    *   Stores personal study notes, flashcard learning cards, local event logs, and user profile adjustments offline.
*   **Durable Offline Track Outbox (`trackQueue`):**
    *   A client-side transactional outbox mechanism (`db.trackQueue`) that buffers activities, scholarship logs, and portfolio tracking actions when offline.
    *   Saves actions losslessly, de-duplicates redundant updates, and automatically flushes queued items once internet connectivity is restored.
*   **Progress Synchronization Engine (`progress-sync.js`):**
    *   Keeps local IndexedDB records perfectly aligned with remote Supabase databases through a secure delta-sync protocol.

---

## 🔐 4. Authentication, Security & Compliance

MedSchoolPrep is built with deep adherence to data privacy, biometric security, and regulatory frameworks (including COPPA, CCPA, GDPR, and FERPA).

*   **Custom Credentials Provider:**
    *   **Password Hashing:** Employs secure, server-side PBKDF2 cryptography with a high iteration count and unique salts.
    *   **One-Time Passcodes (OTP):** Generates and dispatches secure, short-lived verification codes to emails for account creation, login, and recovery.
*   **OAuth Integration:**
    *   **Google Sign-In:** Leverages the client-side `@supabase/supabase-js` OAuth flow to securely authenticate users.
*   **Regulatory Compliance Protections:**
    *   **Age-Gating Check (`src/lib/ageGate.js`):** Restricts access to users under 13 years old. Failed checks delete any pre-existing database registration rows securely.
    *   **Privacy-Friendly Embeds:** Uses `youtube-nocookie.com` domains across all lesson and SAT video embeds to prevent premature viewer tracking.
    *   **Local Web Speech Simulators:** Spoken mock interview modules are executed entirely on-device via Web Speech APIs, without storing or transmitting biometric audio data to cloud servers.
    *   **Data Portability & Deletion:** Surfaced under settings, enabling direct data export and permanent cascade row deletion.

---

## 🤖 5. Intelligent AI Subsystem & Model Routing

The platform integrates advanced generative intelligence powered by the **Groq Cloud API** and optimized for rate-limit safety and high context-handling capabilities.

*   **Subsystem Router (`api/groq.js`):**
    *   Distributes AI requests dynamically depending on the active feature's cognitive complexity.
    *   Features a purpose-scoped rotation of API keys (`GROQ_API_KEY_PREP`, `GROQ_API_KEY_SAT`, `GROQ_API_KEY_PORTFOLIO`, etc.) to maximize rate-limiting headroom.
*   **AI Model Tiering Matrix:**
    *   **Scout Tier (`llama-3.1-8b-instant`):** Ultralight, blisteringly fast for lightweight interactive prompts and chat widgets.
    *   **Guide Tier (`openai/gpt-oss-20b`):** Balanced default model tier, powering lesson explanations and pathway guidance.
    *   **Sage Tier (`llama-3.3-70b-versatile`):** Highly capable model for complex reasoning, detailed essay critiques, and deep SAT tutor guidance.
    *   **Oracle Tier (`openai/gpt-oss-120b`):** Super-scale server-side model with a massive context window and high reasoning effort. Powers the generation of customized, day-by-day academic study master plans.
*   **Academic Integrity Boundary:**
    *   AI prompt instructions strictly prevent the AI from drafting, writing, or completing graded essays or homework assignments, focusing instead on coaching, advising, and structural critiquing.

---

## 📚 6. Spaced-Repetition & NLP Extraction Algorithms

MedSchoolPrep features a completely self-hosted, offline-capable learning loop that leverages cognitive psychology algorithms.

*   **FSRS (Free Spaced-Repetition Scheduler) Algorithm:**
    *   **Library:** `ts-fsrs` (v4.4.2)
    *   Anki-grade cognitive retention algorithm that calculates optimal card review intervals based on difficulty scores, stability, and historical user responses.
*   **Local NLP Paragraph Fact Extractor:**
    *   **Library:** `compromise` (v14.15.1)
    *   Parses student-saved study notes on-device to isolate proper nouns, acronyms, definitions, comparative concepts, numerical statistics, and misconceptions.
    *   Extracts flashcards cleanly without sending notes to external servers, protecting user privacy and eliminating AI hallucinations.

---

## 🔌 7. Third-Party Integrations & External APIs

*   **Desmos Graphing Calculator API:**
    *   Integrates a fully interactive, production-licensed Desmos Graphing Calculator directly into the SAT prep workspace (`DesmosSurface.jsx`).
*   **Google AdSense Integration:**
    *   Embedded asynchronously in `index.html` to serve non-personalized, family-safe advertisements.
    *   Automatically tags ad requests for child-directed treatment (`tagForChildDirectedTreatment`) before scripts resolve, adhering strictly to COPPA guidelines.
*   **YouTube oEmbed API:**
    *   Validates video link statuses and metadata during testing and prep lesson loads.

---

## 📧 8. Transactional Mailing System

*   **Transporter:** Nodemailer (v9.0.3)
*   **Mailing Relay Host:** Brevo SMTP (formerly Sendinblue)
*   **Single Account Config:**
    *   The mailer sends all OTP/transactional email through one verified Brevo account (`BREVO_SMTP_USER` / `BREVO_SMTP_PASS` / `BREVO_SMTP_FROM`), capped at that account's daily send quota (300/day on the free plan).

---

## 🧪 9. Verification, Quality Control & Auditing Suite

MedSchoolPrep maintains a zero-regression, zero-bias deployment policy validated on every automated code build.

*   **End-to-End Browser Testing:**
    *   **Framework:** Playwright (v1.62.0)
    *   Automates headless browser flows (`verifyRoutingE2E.mjs` and SAT tabs) to test responsive views, navigation paths, sitemap listings, and state transitions.
*   **Verification Scripts:**
    *   `verify:sat-scoring` — Verifies scaled SAT scorecard conversions.
    *   `verify:sat-forms` — Asserts that forms A-E contain exactly 147 unique, non-overlapping questions.
    *   `verify:legal` — Validates compliance, tracking SDKs, age-gate logic, and AdSense timing.
    *   `verify:contrast` — Computes WCAG compliance for text-to-background contrast metrics.
    *   `audit:lessons` & `audit:videos` — Audits formatting, lesson structures, and parses YouTube API status for dead embeds.
