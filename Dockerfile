FROM node:22-alpine AS build
WORKDIR /app

# No browser in this stage, on purpose.
#
# Three of the checks `npm run build` chains drive a real headless Chromium
# (verify:viewport-fit, verify:memory, verify:boot-recovery). This image used to
# `apk add chromium` so they could run here too. That cost a deploy: verifyMemory
# opens all forty-two routes and then laps the whole app six more times watching
# the heap, which on a small VPS is enough to bring the OOM killer down on node
# mid-run. A process cannot catch its own kill, so the scripts' careful
# skip-on-missing-browser paths never got a chance to fire — the build just
# stopped, exit non-zero, with the log ending mid-route and no error anywhere.
#
# Those three assert facts about the source, and the source is the same whatever
# machine packages it. CI already runs the full build with a known-good Chromium
# and REQUIRE_BROWSER_CHECKS=1 on every push and pull request
# (.github/workflows/verify.yml), so running them again here bought no signal —
# only a RAM floor on whatever host happens to be deploying. See
# scripts/browserGate.mjs for the whole argument.
#
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD stops `npm ci` reaching for a browser that
# would not run on musl anyway; SKIP_BROWSER_CHECKS tells those three to bow out
# before they launch anything.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    SKIP_BROWSER_CHECKS=1

COPY package*.json ./
RUN npm ci
COPY . .

# Vite inlines import.meta.env at build time, so these have to exist in THIS
# stage — a runtime env var set on the container comes too late, the bundle is
# already written. Both are public values (the anon key is meant to ship to the
# browser); the service-role key is a runtime-only secret and must never be an
# ARG. Unset is a supported state: GOOGLE_OAUTH_CONFIGURED goes false and the
# Google button shows a friendly error instead of crashing (src/lib/supabaseClient.js).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY api ./api
COPY server.js ./

EXPOSE 3000
CMD ["node", "server.js"]
