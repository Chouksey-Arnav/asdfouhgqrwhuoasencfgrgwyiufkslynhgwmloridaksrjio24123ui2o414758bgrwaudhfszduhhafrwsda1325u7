// Shared Nodemailer transport for serverless functions, configured for Brevo's
// SMTP relay (smtp-relay.brevo.com). Any standard SMTP provider works too —
// only the SMTP_* env vars need to change.
import nodemailer from 'nodemailer';

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Brevo SMTP credentials).');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = getTransporter();
  await transport.sendMail({ from: `MedSchoolPrep <${from}>`, to, subject, html, text });
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
