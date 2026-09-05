# Email: Brevo, DNS, and how to tell what is broken

Every email this app sends — signup codes, sign-in codes, password resets, parent
invitations — goes through one Brevo SMTP account via `api/_lib/mailer.js`. There
is no second provider and no fallback: if this is misconfigured, nobody can
create an account.

This document exists because email fails **quietly**. A wrong API key produces a
clean error you cannot miss. Everything else — an unverified sender, missing SPF,
a typo'd from-address — produces a relay that says "queued", an app that logs
success, and a student who never receives a code.

## The three things that must all be true

1. **The credentials authenticate.** `BREVO_SMTP_USER` / `BREVO_SMTP_PASS`.
2. **Brevo accepts the from-address.** `BREVO_SMTP_FROM` must be a sender Brevo
   has verified, or an address at a domain Brevo has fully authenticated.
3. **The receiving world believes it.** SPF, DKIM and DMARC on the sending
   domain. Nothing in this codebase can see this, and getting it wrong costs
   inbox placement rather than producing an error.

Two commands cover all three.

## `npm run check:mailer-dns`

Checks SPF, DKIM, DMARC and Brevo's domain code for whatever
`BREVO_SMTP_FROM` points at. Sends nothing, costs no quota, needs no `dig` — it
resolves over DNS-over-HTTPS, so it runs inside the release container, which is
the machine whose answer actually matters.

```bash
npm run check:mailer-dns                      # uses BREVO_SMTP_FROM
npm run check:mailer-dns -- a@example.com     # or a specific address
```

Exit 0 clean, 1 something missing, 2 could not resolve (a fact about the network,
not about your records — it deliberately refuses to report "missing" in that case).

## `npm run check:mailer -- you@example.com`

Sends one real message and prints what the relay said. Costs one send against the
monthly quota, which is why it is manual and not part of `npm run build`. Use it
after `check:mailer-dns` is clean.

## Reading a failure

`api/_lib/mailer.js` classifies SMTP errors rather than logging the relay's raw
wording. A failed send now prints three lines:

```
mailer: send failed (sender_not_allowed) — Brevo refused "noreply@example.com" as a sender.
mailer:   fix — Add noreply@example.com under Brevo → Senders … no-reply@ and noreply@ are different addresses.
mailer:   raw — { from: …, code: …, response: …, error: … }
```

The causes are `auth_rejected`, `sender_not_allowed`, `quota_exhausted`,
`unreachable`, and `unknown`. Each carries the specific next step, because
"535 5.7.8" and "553 5.7.1" are entirely different jobs — regenerate a key versus
fix an address — and both used to reach the logs as an undifferentiated string.

The first send a process makes also logs the resolved configuration:

```
mailer: configured { host, port, user, from, note: 'from MUST be verified in Brevo → Senders …' }
```

The password is never printed. This line exists so that comparing a deployment
against Brevo's Senders page is reading a log line rather than guessing at an
environment variable — the near-miss (`noreply@` where Brevo has `no-reply@`) is
syntactically perfect, so the validator cannot catch it, and it is the single most
likely reason a correctly-keyed deployment cannot send.

## DNS records Brevo needs

Add these at your registrar for the sending domain. Values come from Brevo →
Senders, Domains & Dedicated IPs → Domains; the shapes are:

| Host | Type | Value |
| --- | --- | --- |
| `@` (apex) | TXT | `v=spf1 include:spf.brevo.com mx ~all` |
| `@` (apex) | TXT | `brevo-code:…` (from Brevo) |
| `brevo1._domainkey` | CNAME | `b1.<domain-with-hyphens>.dkim.brevo.com` |
| `brevo2._domainkey` | CNAME | `b2.<domain-with-hyphens>.dkim.brevo.com` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

**Exactly one SPF record.** Two `v=spf1` records is a permanent error at the
receiver and scores worse than having none — if the domain already has SPF for
another sender, add `include:spf.brevo.com` to the existing record rather than
creating a second one.

`p=none` is monitor-only and the right place to start. Move to `p=quarantine`
once SPF and DKIM have both been passing for a few weeks.

## Environment variables

Runtime only — none of these are build variables, so changing one needs a
container **restart**, not a rebuild.

| Variable | Notes |
| --- | --- |
| `BREVO_SMTP_USER` | The **login** from Brevo → SMTP & API, normally `…@smtp-brevo.com`. Not your Brevo account email. |
| `BREVO_SMTP_PASS` | The **SMTP key** from that page (`xsmtpsib-…`). Not a v3 REST API key, not your password. |
| `BREVO_SMTP_FROM` | A **verified sender**. Required — a missing or malformed value is a loud startup error, deliberately. |
| `BREVO_SMTP_HOST` | Optional, defaults to `smtp-relay.brevo.com`. |
| `BREVO_SMTP_PORT` | Optional, defaults to `587` (STARTTLS). Only `465` turns on implicit TLS. |

`SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` are a legacy
fallback, consulted only when `BREVO_SMTP_USER` is unset. Do not set both families.

### Rotating the SMTP key

`loadAccount()` caches the credentials and the transport in module scope, read
once on the first send the process makes and held for the life of the container.
So changing the variable is not enough on its own:

1. Create the new key in Brevo. Do **not** delete the old one yet.
2. Update `BREVO_SMTP_PASS`.
3. **Restart the container.** Without this the process keeps using the old key.
4. `npm run check:mailer -- you@example.com` to confirm.
5. Now delete the old key.

`BREVO_SMTP_USER` normally does not change — the login is per-account, not
per-key.
