// /api/send-email.js — Server function (formerly Vercel serverless, now self-hosted on Coolify / VPS)
// Sends email via the shared Brevo SMTP transporter (see api/_lib/mailer.js).
import { sendMail } from './_lib/mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const { to, subject, html } = body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html.' });
  }

  try {
    await sendMail({
      to: String(to).slice(0, 200),
      subject: String(subject).slice(0, 200),
      html: String(html).slice(0, 50000),
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: 'Could not send email.' });
  }
}
