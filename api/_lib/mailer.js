// Shared Nodemailer transport for serverless functions, configured for Brevo's
// SMTP relay (smtp-relay.brevo.com). Any standard SMTP provider works too —
// only the SMTP_* / BREVO_SMTP_* env vars need to change.
//
// Supports rotating across multiple Brevo accounts to multiply the combined
// monthly send quota (each free Brevo account currently caps at 300
// emails/month). Configure account N via:
//   BREVO_SMTP_USER_N, BREVO_SMTP_PASS_N, BREVO_SMTP_FROM_N (optional)
// for N = 1, 2, 3, ... (any number of accounts, scanned until one is missing).
// Host/port are shared across accounts via BREVO_SMTP_HOST / BREVO_SMTP_PORT
// (defaulting to Brevo's relay), since only the login differs per account.
//
// If no BREVO_SMTP_USER_1 is set, falls back to the legacy single-account
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM vars.
import nodemailer from 'nodemailer';

let accounts = null;
let nextIndex = 0;

function loadAccounts() {
  if (accounts) return accounts;

  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);

  const numbered = [];
  for (let n = 1; ; n++) {
    const user = process.env[`BREVO_SMTP_USER_${n}`];
    const pass = process.env[`BREVO_SMTP_PASS_${n}`];
    if (!user || !pass) break;
    numbered.push({
      user,
      pass,
      from: process.env[`BREVO_SMTP_FROM_${n}`] || user,
      transporter: null,
    });
  }

  if (numbered.length > 0) {
    accounts = { host, port, list: numbered };
    return accounts;
  }

  // Legacy single-account fallback.
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP not configured. Set BREVO_SMTP_USER_1/BREVO_SMTP_PASS_1 (rotating accounts) ' +
      'or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (single account, Brevo SMTP credentials).'
    );
  }
  accounts = {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    list: [{ user: SMTP_USER, pass: SMTP_PASS, from: SMTP_FROM || SMTP_USER, transporter: null }],
  };
  return accounts;
}

function getTransporterFor(account, host, port) {
  if (!account.transporter) {
    account.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: account.user, pass: account.pass },
    });
  }
  return account.transporter;
}

// Exposed for backward compatibility with any existing callers/tests.
export function getTransporter() {
  const { host, port, list } = loadAccounts();
  return getTransporterFor(list[0], host, port);
}

export async function sendMail({ to, subject, html, text }) {
  const { host, port, list } = loadAccounts();

  // Round-robin starting point: 1st send uses account 1, 2nd uses account 2,
  // etc., wrapping back to account 1 after the last one.
  const startIndex = nextIndex % list.length;
  nextIndex = (nextIndex + 1) % list.length;

  let lastError;
  for (let attempt = 0; attempt < list.length; attempt++) {
    const account = list[(startIndex + attempt) % list.length];
    const transport = getTransporterFor(account, host, port);
    try {
      await transport.sendMail({ from: `MedSchoolPrep <${account.from}>`, to, subject, html, text });
      return;
    } catch (err) {
      lastError = err;
      // Try the next account in rotation (e.g. this one's monthly quota is exhausted).
    }
  }
  throw lastError;
}

const OTP_COPY = {
  signup: {
    subject: (code) => `${code} is your MedSchoolPrep signup code`,
    heading: 'Verify your email',
    body: "Enter this code to finish creating your MedSchoolPrep account. It expires in 10 minutes.",
  },
  password_reset: {
    subject: (code) => `${code} is your MedSchoolPrep password reset code`,
    heading: 'Reset your password',
    body: "Enter this code to reset your MedSchoolPrep password. It expires in 10 minutes. If you didn't request this, your password is still safe — just ignore this email.",
  },
  signin: {
    subject: (code) => `${code} is your MedSchoolPrep verification code`,
    heading: 'Verify your email',
    body: 'Enter this code to sign in to MedSchoolPrep. It expires in 10 minutes.',
  },
};

export async function sendOtpEmail(to, code, purpose = 'signin') {
  const copy = OTP_COPY[purpose] || OTP_COPY.signin;
  await sendMail({
    to,
    subject: copy.subject(code),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">${copy.heading}</h2>
        <p style="color:#555;margin:0 0 20px">${copy.body}</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:8px">${code}</div>
        <p style="color:#999;font-size:12px;margin-top:20px">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
    text: `${copy.heading}: your MedSchoolPrep code is ${code}. It expires in 10 minutes.`,
  });
}
