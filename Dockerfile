FROM node:22-alpine AS build
WORKDIR /app

# The build runs `verify:viewport-fit`, which lays the real stylesheet out in a
# headless browser. Playwright's own browser download has no musl build, so use
# Alpine's Chromium and tell both Playwright and the check where it lives.
RUN apk add --no-cache chromium nss freetype harfbuzz ttf-freefont \
 && if [ ! -x /usr/bin/chromium-browser ]; then ln -s /usr/bin/chromium /usr/bin/chromium-browser; fi
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci
COPY . .
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
