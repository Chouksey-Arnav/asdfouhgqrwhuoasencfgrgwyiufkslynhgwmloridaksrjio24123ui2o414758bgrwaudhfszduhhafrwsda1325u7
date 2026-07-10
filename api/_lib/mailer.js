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

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function otpEmailHtml(code) {
  const digits = code.split('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Your AscendPrep verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#04060b;font-family:${FONT_STACK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${code} is your AscendPrep verification code — it expires in 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#04060b;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#2d7fff 0%,#1d5fd9 100%);"></div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:17px;font-weight:800;color:#eef2ff;letter-spacing:-0.01em;">AscendPrep</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#0a1020;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:40px 32px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5da0ff;">Secure sign-in</p>
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#eef2ff;letter-spacing:-0.01em;">Your verification code</h1>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#94a3c0;">
              Enter this code to sign in to your AscendPrep account. It's valid for the next
              <strong style="color:#eef2ff;">10 minutes</strong>.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 28px;">
              <tr>
                ${digits.map((d) => `<td style="width:44px;height:56px;text-align:center;vertical-align:middle;background-color:#141c30;border:1px solid rgba(93,160,255,0.35);border-radius:10px;font-family:'SF Mono',Consolas,Menlo,monospace;font-size:26px;font-weight:700;color:#ffffff;padding:0 3px;">${d}</td><td style="width:6px;"></td>`).join('')}
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
              <tr>
                <td style="padding:14px 16px;font-size:12.5px;line-height:1.6;color:#7688a8;">
                  🔒 For your security, never share this code with anyone — not even someone claiming to be from AscendPrep. We will never ask for it.
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12.5px;line-height:1.6;color:#506080;">
              Didn't request this code? You can safely ignore this email — your account is still secure.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#506080;">AscendPrep</p>
            <p style="margin:0;font-size:11px;color:#3a4a68;">SAT/ACT prep &amp; college admissions, built for students.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendOtpEmail(to, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = getTransporter();
  await transport.sendMail({
    from: `AscendPrep <${from}>`,
    to,
    subject: `${code} is your AscendPrep verification code`,
    html: otpEmailHtml(code),
    text: `Your AscendPrep verification code is ${code}. It expires in 10 minutes. Never share this code with anyone.`,
  });
}
