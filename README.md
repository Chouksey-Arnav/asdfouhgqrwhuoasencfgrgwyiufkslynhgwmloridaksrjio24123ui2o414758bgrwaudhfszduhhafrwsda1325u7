# medschoolprep-dev

## Deployments

This app runs in two separate places — a Vercel test deployment and a
self-hosted production deployment — that need **separate configuration**.
Setting env vars in one has no effect on the other.

| | Vercel (test) | Coolify/VPS (production) |
|---|---|---|
| Domain | `medschoolprep-dev.vercel.app` | `medschoolprep.cloud` |
| How `/api` is served | Vercel auto-detects each `api/**/*.js` file (each exports `handler(req, res)`) and wires it up as a serverless function — this is Vercel-specific file-system routing. | `server.js` (Express) imports those same handler modules and mounts them by hand, then serves the built `dist/` for everything else. `Dockerfile` builds and runs it — Coolify builds straight from the Dockerfile. |
| Env vars configured in | Vercel dashboard → Project Settings → Environment Variables | Coolify → this app's Environment Variables tab |

**If you add a new file under `api/`**, it's picked up automatically on
Vercel, but on Coolify you also need to import and mount it in `server.js`
(see the existing routes there for the pattern) or it will silently 404 in
production while still working fine on the Vercel test deployment.

### Required environment variables (both deployments)

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key, never the anon key>

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your Brevo account email>
SMTP_PASS=<Brevo SMTP key, from Brevo → Settings → SMTP & API>
SMTP_FROM=<verified sender address in Brevo; falls back to SMTP_USER if unset>
```

Email is sent via Nodemailer over Brevo's SMTP relay (`api/_lib/mailer.js`).
`SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key — the app never
uses Supabase Auth or RLS-scoped client access; every `/api` route uses the
service role server-side and enforces per-user ownership itself.

### Optional environment variables

```
GROQ_API_KEY=...    # Medabrain AI tutoring/coaching (api/groq.js)
GROQ_API_KEY_2=...  # optional 2nd Groq account — see GROQ_SETUP.md "Multiple accounts, maximized usage"
GROQ_API_KEY_3=...  # optional 3rd Groq account — same pooling/failover as above
GROQ_API_KEY_SAT=...      # optional dedicated key for the SAT tab (drills, hints, explanations, SAT coach)

VITE_DESMOS_API_KEY=...   # Desmos calculator API key — see docs/SAT_TOOLS.md
```

`VITE_DESMOS_API_KEY` is a **build-time** variable (the `VITE_` prefix means
Vite inlines it into the client bundle), so it must be set wherever the build
runs, not just at runtime. Without it the SAT tab falls back to the public demo
key Desmos publishes in its own docs — which works, but is rate-limited and
unsupported. Get a free key at <https://www.desmos.com/api>.

### Running the production server locally

```
npm run build   # builds dist/
npm run start   # node server.js — serves dist/ + mounts /api routes
```

## URLs and the back button

Every tab, sub-tab and full-screen surface has its own URL (`/sat/practice`,
`/portfolio/deadlines`, `/prep/pathway/lesson/<unit>/<lesson>`), so the browser's
back and forward buttons walk through the app the way a student actually moved
through it, deep links work, and the sitemap/robots files stay in step with the
real routes. See **docs/ROUTING.md** — including what to check first if
`/sitemap.xml` ever renders the app instead of the XML.

```
npm run verify:routing       # static checks; also runs as part of npm run build
npm run verify:routing-e2e   # drives a real browser against dist/ (build first)
```
