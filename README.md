# AscendPrep (medschoolprep-dev)

Welcome to **AscendPrep** (internally configured as `medschoolprep`), a React-based preparation platform built using Vite and Framer Motion. This workspace is specifically designed for high school and undergraduate students preparing for college, exams, and future admissions paths. All legacy graduate-level/medical depth has been removed or reframed, keeping focus on secondary-to-undergraduate pathways (e.g. SAT/ACT prep, application portfolios, and undergraduate pre-professional tracking).

---

## Deployments

The application is deployed in two distinct environments that require **separate configuration**. Setting environment variables in one deployment does not affect the other.

| Feature | Vercel (Test Environment) | Coolify / VPS (Production Environment) |
| :--- | :--- | :--- |
| **Domain** | `medschoolprep-dev.vercel.app` | `medschoolprep.cloud` |
| **How `/api` is served** | Vercel auto-detects each `api/**/*.js` file and wires it up as a serverless function using Vercel-specific file-system routing. Each module exports a standard serverless `handler(req, res)`. | `server.js` (Express) imports those same handler modules and mounts them manually. It serves the pre-built `dist/` directory for client routes and SPA fallback. Build is handled via a `Dockerfile`. |
| **Configuration Path** | Vercel Dashboard → Project Settings → Environment Variables | Coolify Dashboard → Application → Environment Variables tab |

> ⚠️ **Important Developer Note on Routing Alignment:**
> If you add a new file under the `api/` directory, it is automatically picked up by Vercel's file-system routing. However, on Coolify/VPS, you **must manually import and mount it in `server.js`**. Failing to do so will cause the endpoint to silently return `404 Not Found` in production, even if it runs perfectly on Vercel.

---

## Complete Environment Variables Reference

To ensure fully functional operations across database operations, email dispatch, AI-powered features, and advanced test suites, configure the following environment variables.

### 1. Database Configuration (Supabase)
This application utilizes Supabase solely as a server-side storage and synchronization engine. The client application never accesses Supabase directly or runs client-side SDK code; instead, all transactions and sync events are brokered through our custom `/api` endpoints using the **Supabase Service Role Key**. This enables per-user ownership to be validated and enforced programmatically at the API layer.

| Variable Name | Type | Description / Value |
| :--- | :--- | :--- |
| `SUPABASE_URL` | String | The full URL of your Supabase project (e.g., `https://<project-ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | String | The high-privilege `service_role` API key (never use the `anon` key). |

---

### 2. SMTP / Email Configuration (Brevo)
Transactional emails (such as OTP registration and reset codes) are dispatched server-side using Nodemailer over an SMTP relay. The default configuration uses Brevo's SMTP service.

| Variable Name | Type | Description / Value |
| :--- | :--- | :--- |
| `SMTP_HOST` | String | SMTP Relay host. Typically `smtp-relay.brevo.com`. |
| `SMTP_PORT` | Number | SMTP Port. Recommended `587` (TLS/STARTTLS) or `465` (SSL). |
| `SMTP_USER` | String | The verified account email address or credential registered with Brevo. |
| `SMTP_PASS` | String | The SMTP secret key generated inside your Brevo Settings panel. |
| `SMTP_FROM` | String | *(Optional)* The verified sender address. Falls back to `SMTP_USER` if not specified. |

---

### 3. Medabrain AI Coaching & Intelligence (Groq API keys)
**Medabrain** is the contextual AI coaching and tutoring workspace. To maximize rate-limit headroom on the free tier and enable precise cost/performance attribution, Medabrain uses a **purpose-scoped key pool** architecture.

When a request is sent to `/api/groq.js`, it specifies a `purpose`. If a dedicated API key for that purpose is configured, the server uses it. Otherwise, it transparently falls back to the shared Medabrain key pool (`GROQ_API_KEY`, `GROQ_API_KEY_2`, and `GROQ_API_KEY_3`).

#### Purpose-Scoped Routing Table
| `purpose` | Subsystem Powered | Default Model Tier Used | Dedicated Key Variable |
| :--- | :--- | :--- | :--- |
| `coach` | Primary conversational coach | Guide (Balanced) / Auto | *(Uses shared pool)* |
| `interview` | Conversational mock-interview simulator | Guide (Balanced) | `GROQ_API_KEY_INTERVIEW` |
| `portfolio` | Rich resume, activities, essay, and college tracking advice | Sage (Deep) | `GROQ_API_KEY_PORTFOLIO` |
| `prep` | In-context tutoring help (e.g. lesson, quiz, or video questions) | Guide (Balanced) | `GROQ_API_KEY_PREP` |
| `plan` | Onboarding diagnostic "max-out plan" generator | Sage (Deep) | `GROQ_API_KEY_PLAN` |
| `masterplan` | Plans tab: detailed day-by-day roadmap generator | Oracle (Max Completion / Reasoning) | `GROQ_API_KEY_MASTERPLAN` |
| `sat` | SAT drills, hints, step-by-step explanations, and coach | Sage (Deep) | `GROQ_API_KEY_SAT` |

#### Key Configuration Variable Names
| Variable Name | Type | Description / Value |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | String | **Required.** Primary Groq API key (starts with `gsk_...`). |
| `GROQ_API_KEY_2` | String | *(Optional)* Failover / pooling key from a second Groq account. |
| `GROQ_API_KEY_3` | String | *(Optional)* Failover / pooling key from a third Groq account. |
| `GROQ_API_KEY_INTERVIEW` | String | *(Optional)* Dedicated key for conversational interview simulation. |
| `GROQ_API_KEY_PORTFOLIO` | String | *(Optional)* Dedicated key for Portfolio Meta Brain advice. |
| `GROQ_API_KEY_PREP` | String | *(Optional)* Dedicated key for inline homework/prep help. |
| `GROQ_API_KEY_PLAN` | String | *(Optional)* Dedicated key for first-day summary diagnostics. |
| `GROQ_API_KEY_MASTERPLAN`| String | *(Optional)* Dedicated key for the Plans tab master roadmap. |
| `GROQ_API_KEY_SAT` | String | *(Optional)* Dedicated key for SAT tutor queries. |

#### Model Tiers Overview
Students never select a model or tier manually. The application automatically determines the optimal model dynamically using `classifyCoachTier()` based on message complexity and length:

- **Scout** (`llama-3.1-8b-instant`): Ultralight, blisteringly fast. Perfect for quick conversational turns and short explanations.
- **Guide** (`openai/gpt-oss-20b`): Our balanced default option, delivering structured reasoning and rich formatting without heavy overhead.
- **Sage** (`llama-3.3-70b-versatile`): Highly capable model reserved for complex questions, deep strategic advice, and essay review feedback.
- **Oracle** (`openai/gpt-oss-120b`): Server-side only model reserved for `purpose: 'masterplan'`. It leverages a 131K context window, a 32,768-token max completion window, and `reasoning_effort: 'high'` to craft reliable, extensive, day-by-day JSON plans.

---

### 4. Client & Third-Party Keys
These parameters are resolved or bundled at build-time or are client-facing.

| Variable Name | Type | Description / Value |
| :--- | :--- | :--- |
| `VITE_DESMOS_API_KEY` | String | **Build-time variable.** Prefix `VITE_` forces Vite to bundle this key directly into the production JS assets. It powers the integrated SAT graphing calculator. Without it, the calculator will gracefully fall back to the public demo key, which has lower rate-limits. Get yours at [desmos.com/api](https://www.desmos.com/api). |

---

### 5. Build, E2E Testing, and Script Variables
These flags configure tests, automated script targets, port bindings, and sitemap generation parameters.

| Variable Name | Type | Default Value | Description / Value |
| :--- | :--- | :--- | :--- |
| `SITE_ORIGIN` | String | `https://medschoolprep.cloud` | Used by `scripts/generateSitemap.mjs` to prepend the correct domain onto canonical URLs. |
| `PORT` | Number | `3000` | The port binding used by the Express production server (`server.js`). |
| `SAT_CHECK_URL` | String | `http://localhost:5173` | The target base URL examined by the SAT verification scripts (`verifySatTab.mjs`, `verifySatDesmos.mjs`, etc.). |
| `SAT_DESMOS_LIVE` | Number/String | `0` (or unset) | Set to `1` during test execution to force the SAT Desmos script to run assertions against the live, genuine external Desmos API. |
| `E2E_PORT` | Number | `4319` | The port on which the temporary Express server is launched during `verifyRoutingE2E.mjs` execution. |
| `E2E_DEBUG` | Number/String | Unset | Set to `1` or `true` to enable verbose standard-error and stack-trace logs during end-to-end routing validation. |

---

## URLs, Routing, and SEO

AscendPrep utilizes a synchronized, state-preserving routing architecture designed to keep URLs in perfect harmony with the UI state. When a student navigates through the application, the URL is automatically mapped using HTML5 History API updates without causing unnecessary page re-renders.

### Key Route Maps
- **Home:** `/`
- **General Tabs (No sub-navigation):** `/plans`, `/settings`
- **Tabs with subviews:** `/sat/practice`, `/prep/flashcards`, `/portfolio/deadlines`, `/progress/achievements`
- **Interactive Player Routes:**
  - Pathway Lesson: `/prep/pathway/lesson/<unitId>/<lessonId>`
  - Practice Quiz: `/prep/quizzes/quiz/<quizId>`
- **Unauthenticated Pages:** `/login`, `/signup`, `/forgot-password`

### Sitemap & Search Engine Optimization
To maximize SEO health while maintaining strict user privacy, only public landing, login, and registration routes are indexed.
- `scripts/generateSitemap.mjs` automatically updates both `public/sitemap.xml` and `public/robots.txt` upon running `npm run build`.
- Authentication-locked pages are deliberately omitted from the sitemap and utilize client-side `noindex` directives to prevent search engine indexing of duplicated landing content.

### File Request and SPA Routing Alignment
To prevent server configurations from treating standard file requests (such as `.xml`, `.png`, or `.css`) as routing fallback requests, our servers utilize extension matching rules:
- Any requested URL ending in a visible extension (e.g., `/sitemap.xml`) is handled strictly as a static file. If the file doesn't exist, the server returns a proper `404 Not Found` response instead of serving the SPA default layout.
- This behavior is tested automatically via `npm run verify:routing-e2e` to prevent crawl failures.

---

## Offline Features (No API Keys / No Network Needed)

To maximize reliability and ensure complete functionality without internet access, several core components of AscendPrep run entirely client-side:

### Spaced-Repetition Flashcards
- **Local Generation Engine:** Built using an in-browser parsing pipeline via `compromise` (MIT-Licensed). This allows students to paste rich notes and immediately compile a review deck locally. The system only extracts facts directly present in the pasted notes to avoid AI hallucinations.
- **Scheduling Algorithm:** Downstream scheduling is powered natively in the browser by FSRS (`ts-fsrs`), matching Anki's gold-standard spaced-repetition logic. State is saved immediately to IndexedDB.

---

## Audits & Verification Suites

The repository is equipped with a comprehensive suite of automated testing, structural audits, and quality control checks. Running these ensures that lesson pathways, video links, test parameters, and tracking metrics remain perfectly valid.

| Command | Subsystem Scanned | Details / Operations Checked |
| :--- | :--- | :--- |
| `npm run audit:lessons` | Learning Pathways | Scans 141 lessons across 10 pathways. Verifies every lesson possesses objectives, proper Markdown structures, and either a validated YouTube ID or an explicit video-omitted developer comment. |
| `npm run audit:videos` | Pathway Video Embeds | Resolves every lesson YouTube ID against Youtube's oEmbed endpoint to guarantee no dead URLs or title mismatches occur. |
| `npm run audit:sat` | SAT Practice Bank | Validates the 466 SAT practice questions across 28 distinct academic skills. Audits character boundaries, option balances, and grid-in formatting. |
| `npm run audit:sat-videos` | SAT Video Library | Checks the 130 videos assigned to the SAT skill database to confirm all IDs are live and resolve properly. |
| `npm run audit:sat-resources`| SAT Resource Catalog | Cross-checks references between SAT skills, practice sets, and embedded resource links. |
| `npm run verify:sat-scoring` | SAT Score Calculation | Unit tests the scaled-score calculation matrices for Reading/Writing and Math. |
| `npm run verify:sat-forms` | SAT Interactive Inputs | Asserts that input controls, multiple-choice clicks, and Student-Produced Response text inputs handle all edge cases. |
| `npm run verify:sat-baseline` | SAT Diagnostic Baseline| Asserts diagnostic scoring curves and diagnostic baseline recommendation profiles. |
| `npm run verify:tracking` | Event Tracking & Logging | Audits user event emission schemas, milestone completions, and gamification rewards. |
| `npm run verify:routing` | Route & SPA Static Map | Validates the route tables against physical `App.jsx` subview options and checks the static sitemap.xml. |
| `npm run verify:routing-e2e`| End-To-End Browser Route | Uses Playwright to drive a headless browser against a compiled build. Simulates back/forward navigation, deep links, page reloads, and scroll preservation. |
| `npm run audit:all` | **Complete Health Check** | Executes every individual structural, video, data, and score test script sequentially. Returns zero on full success; exits with non-zero on any sub-test failure. |

---

## Local Development Setup & Execution

Setting up your workspace locally is simple and requires only Node.js (>= 22.0.0).

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Environment
Create a `.env.local` file at the project root directory and add your keys:
```env
# Database & Backend Sync
SUPABASE_URL=https://your-supabase-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret

# SMTP Email Relay
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-verified-brevo-email@domain.com
SMTP_PASS=your_brevo_smtp_password_key

# AI Medabrain API Keys
GROQ_API_KEY=gsk_your_primary_shared_groq_key
# Optional pools:
# GROQ_API_KEY_2=gsk_your_second_pool_key
# GROQ_API_KEY_SAT=gsk_your_sat_tutor_key

# Frontend Calculator Integration
VITE_DESMOS_API_KEY=your_desmos_client_key
```

### 3. Run Development Server
Spins up Vite's local development server with hot-module reloading:
```bash
npm run dev
```

### 4. Build and Run Production Locally
To mimic a production VPS environment locally, build the client assets first and then start the production Node server:
```bash
# 1. Generate sitemap, run routing checks, and compile frontend assets to dist/
npm run build

# 2. Start Express server (runs server.js) on port 3000
npm run start
```

---

## Branding & Legal Guidelines

- **Product Name:** The consumer-facing coaching suite is branded as **"Medabrain"** or **"AscendPrep AI Coaching."**
- **LLM Disclosures:** To remain fully compliant with consumer protection and advertising guidelines, avoid claiming that you own, trained, or built the underlying foundational models. A standard footer disclosure (such as *"Medabrain is powered by secure, large language model technology provided by leading vendors"*) is integrated into Settings and About panels.
- **Offline Integrity:** Features that run entirely in the client browser (such as flashcard generation and FSRS scheduling) must be described as *"local client-side extraction technology"* rather than AI or cloud-generated, ensuring student transparency regarding data privacy and network-free operations.
