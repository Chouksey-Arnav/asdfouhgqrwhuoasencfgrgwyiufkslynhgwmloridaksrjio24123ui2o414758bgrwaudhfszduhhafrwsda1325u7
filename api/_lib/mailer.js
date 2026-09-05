// Shared Nodemailer transport for serverless functions, configured for Brevo's
// SMTP relay (smtp-relay.brevo.com). Any standard SMTP provider works too —
// only the SMTP_* / BREVO_SMTP_* env vars need to change.
//
// Single Brevo account only (300 emails/day on the free plan). Configure via:
//   BREVO_SMTP_USER, BREVO_SMTP_PASS, BREVO_SMTP_FROM
// Host/port default to Brevo's relay via BREVO_SMTP_HOST / BREVO_SMTP_PORT.
//
// If BREVO_SMTP_USER is not set, falls back to the legacy SMTP_HOST / SMTP_PORT /
// SMTP_USER / SMTP_PASS / SMTP_FROM vars.
import nodemailer from 'nodemailer';

let account = null;
let transporter = null;

// ── Why BREVO_SMTP_FROM is required, not optional ──────────────────────────
// It used to fall back to the account's SMTP *login* when unset. Brevo SMTP logins are commonly a
// per-account address that has nothing to do with medschoolprep.cloud (a personal inbox, a
// generic relay identity picked when the account was created). Sending `MedSchoolPrep
// <that-login>` then puts a display name from one domain on an envelope from another, which is
// exactly what DMARC alignment checks exist to catch — Gmail and most large receivers accept the
// message at the SMTP handshake (so Nodemailer's `sendMail()` resolves and the app logs success)
// and then silently drop or spam-foliate it after the fact, invisibly to everything upstream of
// the receiving mailbox. That is indistinguishable, from inside this app, from "it worked" — the
// exact symptom of a code that is never delivered despite every log line saying it was sent. A
// missing FROM is now a loud config error instead of a silent delivery failure.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Say out loud which sender is actually configured ────────────────────────
// A near-miss in BREVO_SMTP_FROM — `noreply@` where Brevo has `no-reply@`, a
// stray space, the wrong domain — is syntactically perfect and therefore
// invisible to the check above. It is also the single most likely reason a
// correctly-keyed deployment cannot send: Brevo authenticates the connection
// happily and then refuses, or silently reclassifies, mail from an address that
// is not one of its verified senders.
//
// Nothing in this process can know which senders the Brevo account has
// verified, so it cannot be validated here. What it can do is stop the value
// being invisible. This prints the resolved sender once, on the first send the
// process makes, so comparing a deployment against Brevo's Senders page is
// reading one log line rather than guessing at an environment variable.
//
// The password is never printed. The login is, because it is `…@smtp-brevo.com`
// on current accounts and getting it wrong is another silent failure worth
// being able to see.
function announce(acc) {
  console.log('mailer: configured', {
    host: acc.host,
    port: acc.port,
    user: acc.user,
    from: acc.from,
    note: 'from MUST be verified in Brevo → Senders, Domains & Dedicated IPs',
  });
}

// ── Turning an SMTP error into something a human can act on ─────────────────
// Nodemailer surfaces the relay's raw reply, which is accurate and unhelpful:
// "535 5.7.8 Authentication failed" and "553 5.7.1 Sender not allowed" are
// entirely different jobs — regenerate a key versus fix an address — and both
// used to reach the logs as an undifferentiated `error:` string, behind an API
// response that says only "Could not send verification code."
//
// This does not change what fails. It changes whether the person reading the
// deployment's logs at 1am can tell WHICH thing failed without a bisect.
const FAILURES = [
  {
    id: 'auth_rejected',
    match: (c, m) => c === 'EAUTH' || /535|authentication (failed|credentials)|invalid login/i.test(m),
    say: () => 'The SMTP login/key was rejected by the relay.',
    fix: () => 'Regenerate the SMTP key in Brevo → SMTP & API and update BREVO_SMTP_PASS. '
      + 'BREVO_SMTP_USER must be the "login" from that same page, not your Brevo account email.',
  },
  {
    id: 'sender_not_allowed',
    match: (c, m) => /sender|from address|not allowed|unverified|553|501 5\.1\.7/i.test(m),
    say: (from) => `Brevo refused "${from}" as a sender.`,
    fix: (from) => `Add ${from} under Brevo → Senders, Domains & Dedicated IPs → Senders and verify `
      + 'it, or set BREVO_SMTP_FROM to an address that is already verified there. '
      + 'Watch for near-misses: no-reply@ and noreply@ are different addresses.',
  },
  {
    id: 'quota_exhausted',
    match: (c, m) => /quota|limit exceeded|too many messages|450 4\.7/i.test(m),
    say: () => 'The Brevo account is out of send quota.',
    fix: () => 'Check Brevo → Usage and plan. The free tier is 300 emails/day.',
  },
  {
    id: 'unreachable',
    match: (c) => ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS', 'ENOTFOUND'].includes(c),
    say: () => 'Could not reach the SMTP host at all.',
    fix: (from, acc) => `Check BREVO_SMTP_HOST/PORT (currently ${acc.host}:${acc.port}) and that the `
      + 'host allows outbound SMTP. Port 587 is STARTTLS; only 465 turns on implicit TLS here.',
  },
];

/**
 * Best-effort classification. An unrecognised error still returns a shape, so a
 * caller never has to branch on whether classification worked.
 */
export function describeFailure(err, acc) {
  const code = String(err?.code || '');
  const message = String(err?.message || err || '');
  const hit = FAILURES.find((f) => {
    try { return f.match(code, message); } catch { return false; }
  });
  if (!hit) return { cause: 'unknown', say: 'The relay rejected the message.', fix: 'See the raw error below.' };
  return { cause: hit.id, say: hit.say(acc.from, acc), fix: hit.fix(acc.from, acc) };
}

function loadAccount() {
  if (account) return account;

  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);

  const { BREVO_SMTP_USER, BREVO_SMTP_PASS, BREVO_SMTP_FROM } = process.env;
  if (BREVO_SMTP_USER && BREVO_SMTP_PASS) {
    if (!BREVO_SMTP_FROM || !EMAIL_RE.test(BREVO_SMTP_FROM)) {
      throw new Error(
        'BREVO_SMTP_FROM is missing or not a valid email address. It must be a sender verified ' +
        'in Brevo (Senders, Domains & Dedicated IPs → Senders) so outgoing mail passes ' +
        'SPF/DKIM/DMARC alignment instead of being silently dropped or spam-foldered by the ' +
        'recipient after Brevo accepts it.'
      );
    }
    account = { host, port, user: BREVO_SMTP_USER, pass: BREVO_SMTP_PASS, from: BREVO_SMTP_FROM };
    announce(account);
    return account;
  }

  // Legacy fallback.
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP not configured. Set BREVO_SMTP_USER/BREVO_SMTP_PASS/BREVO_SMTP_FROM or ' +
      'SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM (Brevo SMTP credentials).'
    );
  }
  if (!SMTP_FROM || !EMAIL_RE.test(SMTP_FROM)) {
    throw new Error(
      'SMTP_FROM is missing or not a valid email address. It must be a sender verified in Brevo ' +
      'so outgoing mail passes SPF/DKIM/DMARC alignment instead of being silently dropped or ' +
      'spam-foldered by the recipient after Brevo accepts it.'
    );
  }
  account = { host: SMTP_HOST, port: Number(SMTP_PORT), user: SMTP_USER, pass: SMTP_PASS, from: SMTP_FROM };
  announce(account);
  return account;
}

function getTransporter() {
  if (!transporter) {
    const { host, port, user, pass } = loadAccount();
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export { getTransporter };

export async function sendMail({ to, subject, html, text }) {
  const { from } = loadAccount();
  const transport = getTransporter();
  try {
    const info = await transport.sendMail({ from: `MedSchoolPrep <${from}>`, to, subject, html, text });
    // The SMTP handshake succeeding is not the same fact as the mailbox receiving the message —
    // Brevo can accept-then-drop asynchronously (quota, sender hold, recipient-side bounce),
    // none of which comes back through this call. Logging the relay's own accept response (not
    // just "no error was thrown") at least lets a deployment's logs distinguish "we handed Brevo
    // a message" from a request that never got this far, which the previous silent-on-success
    // code could not do.
    console.log('mailer: sent', { from, accepted: info?.accepted, response: info?.response, messageId: info?.messageId });
  } catch (err) {
    const { cause, say, fix } = describeFailure(err, loadAccount());
    // Three lines rather than one object, because this is the thing somebody is
    // scrolling a Coolify log looking for and it should be readable at a glance.
    console.error(`mailer: send failed (${cause}) — ${say}`);
    console.error(`mailer:   fix — ${fix}`);
    console.error('mailer:   raw —', { from, code: err?.code, response: err?.response, error: err?.message });
    // Carried on the error so a handler can log or branch without re-parsing the
    // relay's wording. Nothing puts this in an HTTP response: it names internal
    // configuration, and the client is told only that sending failed.
    err.mailerCause = cause;
    throw err;
  }
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
