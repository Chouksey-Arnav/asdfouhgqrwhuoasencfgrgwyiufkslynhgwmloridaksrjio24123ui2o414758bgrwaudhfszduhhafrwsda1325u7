// Shared Nodemailer transport for serverless functions.
import nodemailer from 'nodemailer';

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendOtpEmail(to, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = getTransporter();
  await transport.sendMail({
    from: `AscendPrep <${from}>`,
    to,
    subject: `${code} is your AscendPrep verification code`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="color:#555;margin:0 0 20px">Enter this code to sign in to AscendPrep. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:8px">${code}</div>
        <p style="color:#999;font-size:12px;margin-top:20px">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
    text: `Your AscendPrep verification code is ${code}. It expires in 10 minutes.`,
  });
}
