#!/usr/bin/env node
/**
 * Sends one real OTP-style email through the configured Brevo/SMTP account(s) and prints exactly
 * what the relay said back.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * scripts/verifyParentClaimFlow.mjs proves the app code calls the mailer correctly; it does that
 * against a fake SMTP socket, so it cannot catch a real-world Brevo problem — an unverified
 * sender, an exhausted quota, a wrong host/port. Those only show up when mail actually goes out
 * through the real relay, and a 250 OK from Brevo is not proof the recipient's mailbox got
 * anything (see api/_lib/mailer.js): DMARC/sender-alignment failures and spam-foldering happen
 * silently, after Brevo has already told this script "queued."
 *
 * This is a manual diagnostic, not part of `npm run build` — it sends real mail and costs one
 * send against the account's monthly quota, so it only runs when asked for.
 *
 * Usage:
 *   BREVO_SMTP_USER_1=... BREVO_SMTP_PASS_1=... BREVO_SMTP_FROM_1=... \
 *     node scripts/checkMailerConfig.mjs you@example.com
 */
import { sendOtpEmail } from '../api/_lib/mailer.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/checkMailerConfig.mjs <recipient-email>');
  process.exit(1);
}

const code = '123456';
console.log(`Sending a test OTP email to ${to}...`);
try {
  await sendOtpEmail(to, code, 'signin');
  console.log('\nSMTP accepted the message — check the mailer: sent log line above for which');
  console.log('account/from address was used and what the relay responded.');
  console.log('\nThis only proves Brevo accepted the message for delivery, not that it reached the');
  console.log('inbox. Also check:');
  console.log('  - The Brevo dashboard (Transactional → Logs) for this send\'s actual delivery status');
  console.log('    (delivered / soft bounce / hard bounce / blocked).');
  console.log('  - That BREVO_SMTP_FROM_N is a sender verified in Brevo, ideally on the');
  console.log('    medschoolprep.cloud domain with SPF/DKIM configured there, so it survives DMARC');
  console.log('    checks at large receivers like Gmail instead of being silently dropped or');
  console.log('    spam-foldered.');
  console.log(`  - The recipient's spam/promotions folder for the actual test message (code: ${code}).`);
} catch (err) {
  console.error('\nSMTP send failed:', err.message);
  console.error('\nThis is the loud failure this script exists to surface — fix the reported issue');
  console.error('(missing/invalid env var, auth rejected, host unreachable) and re-run.');
  process.exit(1);
}
