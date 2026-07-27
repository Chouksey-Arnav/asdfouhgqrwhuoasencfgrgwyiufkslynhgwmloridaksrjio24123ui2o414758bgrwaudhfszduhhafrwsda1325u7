// Node/Express entrypoint for self-hosted deployment (Coolify/VPS).
//
// Vercel auto-wires the handler(req, res) modules under /api/** into
// serverless functions based on file-system routing — that convention only
// works on Vercel's own build system. This server recreates that routing by
// hand so the exact same handler modules run under plain Node, since their
// (req, res) shape (res.status().json(), req.body, req.headers) is already
// Express-compatible.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import sendOtp from './api/auth/send-otp.js';
import verifyOtp from './api/auth/verify-otp.js';
import completeSignup from './api/auth/complete-signup.js';
import login from './api/auth/login.js';
import resetPassword from './api/auth/reset-password.js';
import me from './api/auth/me.js';
import logout from './api/auth/logout.js';
import dataResource from './api/data/[resource].js';
import progressSync from './api/progress-sync.js';
import groq from './api/groq.js';
import sendEmail from './api/send-email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '1mb' }));

app.all('/api/auth/send-otp', sendOtp);
app.all('/api/auth/verify-otp', verifyOtp);
app.all('/api/auth/complete-signup', completeSignup);
app.all('/api/auth/login', login);
app.all('/api/auth/reset-password', resetPassword);
app.all('/api/auth/me', me);
app.all('/api/auth/logout', logout);
app.all('/api/send-email', sendEmail);
app.all('/api/groq', groq);
app.all('/api/progress-sync', progressSync);

// The Vercel handler reads the resource name off req.query.resource (from
// its [resource].js filename); Express puts route params on req.params, so
// bridge the two before delegating.
app.all('/api/data/:resource', (req, res) => {
  req.query.resource = req.params.resource;
  return dataResource(req, res);
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback — but only for app routes.
//
// The old catch-all answered EVERYTHING with index.html, which meant a missing
// file didn't 404, it 200'd with the landing page in it. For /sitemap.xml that
// is the worst possible failure: a browser shows the app instead of the XML,
// and Google fetches the sitemap, gets HTML, and quietly refuses to register it
// — with no error anywhere, because as far as the server was concerned it was a
// success. If the file isn't in dist/ (a build that skipped `npm run sitemap`),
// we want to hear about it.
//
// Anything with a file extension is a file request, and files are express.static's
// job; if it didn't have one, it doesn't exist. Every real app route
// (/sat/practice, /prep/pathway/lesson/ex1/ex1l1, /login) is extension-free —
// see src/lib/routes.js.
const FILE_REQUEST = /\.[a-zA-Z0-9]+$/;
app.get('*', (req, res) => {
  if (FILE_REQUEST.test(req.path)) return res.status(404).type('text/plain').send('Not found');
  return res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MedSchoolPrep listening on :${port}`));
