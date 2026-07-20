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
import me from './api/auth/me.js';
import logout from './api/auth/logout.js';
import dataResource from './api/data/[resource].js';
import groq from './api/groq.js';
import sendEmail from './api/send-email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '1mb' }));

app.all('/api/auth/send-otp', sendOtp);
app.all('/api/auth/verify-otp', verifyOtp);
app.all('/api/auth/me', me);
app.all('/api/auth/logout', logout);
app.all('/api/send-email', sendEmail);
app.all('/api/groq', groq);

// The Vercel handler reads the resource name off req.query.resource (from
// its [resource].js filename); Express puts route params on req.params, so
// bridge the two before delegating.
app.all('/api/data/:resource', (req, res) => {
  req.query.resource = req.params.resource;
  return dataResource(req, res);
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MedSchoolPrep listening on :${port}`));
