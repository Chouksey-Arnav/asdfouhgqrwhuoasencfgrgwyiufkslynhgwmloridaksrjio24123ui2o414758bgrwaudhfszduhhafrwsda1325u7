FROM node:22-alpine AS build
WORKDIR /app

# `npm run build` chains verify:viewport-fit, which lays the real stylesheet out
# in a headless browser. Playwright publishes no musl browser build, so its own
# download is useless here (and skipped outright, so `npm ci` doesn't try) —
# Alpine's Chromium is what this stage uses instead.
#
# Best-effort on purpose: if the mirror is down, the package moves, or the
# builder is out of disk, the deploy must still ship. The check notices the
# missing browser and skips with a warning, and CI runs the same assertions with
# a known-good Chromium on every push and pull request (.github/workflows/verify.yml).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
 && { [ -x /usr/bin/chromium-browser ] || ln -sf /usr/bin/chromium /usr/bin/chromium-browser; } \
 || echo "chromium unavailable — verify:viewport-fit will skip; CI still runs it"

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
