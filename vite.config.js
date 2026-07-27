import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.png'],
      manifest: {
        name: 'MedSchoolPrep',
        short_name: 'MedPrep',
        description: 'AI-powered SAT/ACT prep and a personalized path into medicine, for high schoolers heading toward a health career',
        theme_color: '#04060b',
        background_color: '#04060b',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // A service worker turns every navigation into "serve index.html from
        // cache", which is exactly right for /sat/practice and exactly wrong for
        // /sitemap.xml — anyone with the PWA installed (or who has simply
        // visited before) gets the landing page instead of the XML, which is the
        // single most common way a sitemap looks "unregistered" while the server
        // is serving it perfectly. Crawlers never run a service worker, so this
        // only ever affected humans checking the file — but that includes us.
        //
        // Denied by shape rather than by name: anything with a file extension is
        // a FILE, never an app route (app routes are /sat/practice, /login — no
        // dots anywhere), so this also covers whatever static file lands next.
        navigateFallbackDenylist: [/\/[^/?]+\.[^/?]+$/, /^\/api\//],
        // An outdated precache is the other half of the same failure: without
        // this, a browser that cached index.html under an old revision can keep
        // serving it after a deploy.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Quiz library data is precached offline-first, so it easily exceeds
        // Workbox's 2 MiB default as the library grows — raise the ceiling
        // rather than excluding it from the offline cache.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gfonts-webfonts', expiration: { maxEntries: 30, maxAgeSeconds: 60*60*24*365 } }
          },
          {
            urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'yt-thumbnails', expiration: { maxEntries: 100, maxAgeSeconds: 60*60*24*30 } }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'jsdelivr-cdn', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react','react-dom'],
          'motion':        ['framer-motion'],
          'charts':        ['chart.js','react-chartjs-2'],
          'ai-tools':      ['marked','dompurify','katex'],
          'db-search':     ['dexie','fuse.js','ts-fsrs'],
          'utils':         ['canvas-confetti','react-hot-toast','jspdf'],
          'quiz-data':     ['./src/data/quizzes/index.js'],
          'app-data':      ['./src/data/elib.js','./src/data/constants.js'],
        }
      }
    }
  },
  server: { port: 5173, open: true }
});
