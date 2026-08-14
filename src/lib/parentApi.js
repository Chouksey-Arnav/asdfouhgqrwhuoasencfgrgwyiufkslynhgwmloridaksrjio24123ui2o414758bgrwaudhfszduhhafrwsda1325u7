// Client for /api/parent/* — the parent↔student link and the read-only progress summary.
//
// Kept separate from authApi.js on purpose: this is the only module in the app that both roles
// import, and having it in one file makes "what can a parent's session actually ask for" a
// question you answer by reading forty lines rather than by grepping.
// Explicit extension so this module is loadable by plain Node as well as by Vite — scripts/
// verifyParentDashboard.mjs imports parseInviteInput from here and exercises it for real, and
// Node's ESM resolver does not guess extensions the way the bundler does.
import { getToken } from './authApi.js';

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api/parent${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed.');
    err.reason = data.reason;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Every connection on this account — active links and invitations in both directions. */
export const listLinks = () => req('/links', { method: 'GET' });

/**
 * Invite the other side. `relationship` is a free-text label ("Mum", "Dad", "Guardian").
 *
 * `notify: false` creates the invitation without mailing anything — for the very common case of
 * a student who is going to text their parent the link, or hand them the phone. The invitation is
 * identical either way; the only difference is whether we spend a send from a metered quota on a
 * message that was never going to be read. See api/parent/links.js.
 */
export const invite = (email, relationship, { notify = true } = {}) =>
  req('/links', { method: 'POST', body: JSON.stringify({ email, relationship, notify }) });

/** Ends a link, cancels an invitation you sent, or declines one sent to you — see the endpoint. */
export const revokeLink = (linkId) =>
  req('/links', { method: 'DELETE', body: JSON.stringify({ linkId }) });

/** Sends the invitation email again, without changing the code or the link already shared. */
export const resendInvite = (linkId) =>
  req('/links', { method: 'PATCH', body: JSON.stringify({ linkId }) });

/**
 * What an invitation says, without redeeming it. This is what makes the accept screen a consent
 * moment instead of a fait accompli — see the header of api/parent/accept.js.
 */
export const previewInvite = ({ token, code }) =>
  req('/accept', { method: 'POST', body: JSON.stringify({ token, code, preview: 1 }) });

export const acceptInvite = ({ token, code }) =>
  req('/accept', { method: 'POST', body: JSON.stringify({ token, code }) });

/**
 * The parent's own declaration — name, relationship, phone, the student they say they are here
 * for, and the attestation. Parent sessions only, and about the caller's own row exclusively.
 *
 * `complete` is the server's verdict, not a field the client derives: the same value gates
 * /api/parent/summary, and two implementations of one rule is how a client ends up showing a
 * dashboard the server will refuse to fill.
 */
export const fetchProfile = () => req('/profile', { method: 'GET' });
export const saveProfile = (profile) =>
  req('/profile', { method: 'PUT', body: JSON.stringify(profile) });

/** Progress for every connected student, or for one of them. Parent sessions only. */
export const fetchSummaries = () => req('/summary', { method: 'GET' });
export const fetchSummary = (studentId) =>
  req(`/summary?studentId=${encodeURIComponent(studentId)}`, { method: 'GET' });

// ── Family messages ─────────────────────────────────────────────────────────
//
// The one part of this feature that runs both ways, so every call here is served to both roles
// and the server decides what each of them may do with it. See api/parent/messages.js.

/** Every message on every active connection, or on one of them. */
export const fetchMessages = (linkId) =>
  req(`/messages${linkId ? `?linkId=${encodeURIComponent(linkId)}` : ''}`, { method: 'GET' });

/**
 * Say something on a connection.
 *
 * @param {string} linkId
 * @param {{kind?: 'note'|'question'|'quiz_request', body: string, topic?: string}} message
 */
export const sendMessage = (linkId, { kind = 'note', body, topic = null }) =>
  req('/messages', { method: 'POST', body: JSON.stringify({ linkId, kind, body, topic }) });

/** Answer one of the other side's messages: mark it done or declined, and/or reply in a line. */
export const answerMessage = (messageId, { status = null, reply = null } = {}) =>
  req('/messages', { method: 'PATCH', body: JSON.stringify({ messageId, status, reply }) });

/** Everything the other side has said on this connection is now read. */
export const markThreadRead = (linkId) =>
  req('/messages', { method: 'PATCH', body: JSON.stringify({ linkId, read: true }) });

/**
 * The quiz topics a parent may ask for.
 *
 * A copy of the allowlist in api/parent/messages.js, which is the authoritative one — anything
 * not on the server's list is silently replaced with its first entry rather than stored. Copied
 * rather than imported because /api is a serverless bundle the browser never loads, and the two
 * are kept honest by scripts/verifyFamilyMessages.mjs.
 */
export const QUIZ_TOPICS = [
  'Anything — you pick',
  'Math & Data',
  'Reading & Writing',
  'Biology & Biochemistry',
  'Chemistry & Physics',
  'Psychology & Sociology',
  'Their current pathway lessons',
];

// ── The passwordless parent claim ───────────────────────────────────────────
//
// Three calls to one endpoint, in order, and they are the entire "getting a parent in" story:
// what does this invitation say → send a code to the address it was addressed to → here are the
// six digits, sign me in and connect me. See api/parent/claim.js for why the address is read off
// the invitation and never sent from here.
//
// Deliberately NOT routed through `req()`: that helper attaches the current session token, and
// every one of these runs for someone who has no session and quite possibly no account. Attaching
// a stale token from whoever last used this browser would be, at best, confusing.
async function claimReq(body) {
  const res = await fetch('/api/parent/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed.');
    err.reason = data.reason;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** What the invitation says. No state changes, nothing sent, nobody signed in. */
export const previewClaim = ({ code, token }) => claimReq({ code, token });

/** Emails a 6-digit code to the address the invitation was addressed to. */
export const sendClaimCode = ({ code, token }) => claimReq({ code, token, step: 'send' });

/** Spends the code: creates or finds the parent account, signs in, and accepts the invitation. */
export const verifyClaim = ({ code, token, otp }) => claimReq({ code, token, step: 'verify', otp });

/**
 * The same finish, straight off the emailed link, with no second email in the middle.
 *
 * Only valid for a `token` — the 32-byte handle that exists nowhere but the message delivered to
 * the invited address. A shared 8-character code is refused server-side with `code_needs_otp`
 * and the screen falls back to emailing a code. See the header of api/parent/claim.js.
 */
export const confirmClaimFromLink = ({ token }) => claimReq({ token, step: 'link' });

/**
 * The invitation this page load came from, if any.
 *
 * Two shapes, because there are two ways to arrive: `?token=` is the link in the invitation email
 * (and every link already sitting in an inbox from before this shipped), `?code=` is the link a
 * student texted. Both name the same invitation and both are handled identically from here on.
 */
export function inviteFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const token = params.get('token');
  const code = params.get('code');
  return {
    token: token && /^[0-9a-f]{64}$/i.test(token) ? token : null,
    // Normalised the same way the server does, so a link with a lowercase or hyphenated code in
    // it resolves rather than looking like a typo the visitor made.
    code: normalizeInviteCode(code),
  };
}

/** The client-side twin of normalizeInviteCode in api/_lib/parentLinks.js. */
export function normalizeInviteCode(input) {
  const cleaned = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/.test(cleaned) ? cleaned : '';
}

const TOKEN_RE = /^[0-9a-f]{64}$/i;

// The five glyphs the code alphabet deliberately does not contain (see mintInviteCode in
// api/_lib/parentLinks.js). Typing one of them is not a code that does not exist — it is almost
// always an O read as a 0, or an l read as a 1, and saying which character is the problem turns a
// dead end into a one-character fix.
const AMBIGUOUS = /[ILOU01]/;

/**
 * Whatever a parent actually pasted into the box → an invitation reference.
 *
 * ── Why this is not just normalizeInviteCode ────────────────────────────────
 * The box used to accept exactly one thing: eight characters, no more, no less. But the thing a
 * parent is holding is almost never eight characters — it is the whole line their child forwarded
 * them, which is a URL. Pasting it produced "That should be 8 characters", which is both true and
 * completely unhelpful: they had the right invitation in their clipboard and were told they had
 * typed something wrong.
 *
 * So every form the invitation is ever handed over in resolves here — the emailed link, the link
 * a student texted, the eight characters read out over the phone, a raw token, and any of those
 * with the surrounding "Review this request: " text still attached — and the failures are named
 * individually, because "that is a link to a different site" and "you are one character short"
 * need different things from the person reading them.
 *
 * @param {string} input
 * @returns {{ok: true, token: string|null, code: string|null, kind: 'token'|'code'}
 *          | {ok: false, reason: string, error: string}}
 */
export function parseInviteInput(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return { ok: false, reason: 'empty', error: 'Paste the link your student sent you, or type the 8-character code.' };
  }

  // A link anywhere in what was pasted. Mail clients wrap long URLs, chat apps append a full
  // stop, and a forwarded invitation usually arrives with "Review this request:" in front of it —
  // so the URL is extracted from the text rather than the text being required to BE a URL.
  const urlMatch = raw.match(/https?:\/\/[^\s<>"')\]]+/i);
  const looksLikeUrl = !!urlMatch || /^[\w.-]+\.[a-z]{2,}\//i.test(raw);
  if (looksLikeUrl) {
    let url;
    try {
      url = new URL(urlMatch ? urlMatch[0].replace(/[.,;]+$/, '') : `https://${raw}`);
    } catch {
      return { ok: false, reason: 'bad_url', error: "We couldn't read that as a link. Try copying it again, or type the 8-character code instead." };
    }

    const token = url.searchParams.get('token');
    const code = url.searchParams.get('code');

    if (token) {
      if (!TOKEN_RE.test(token.trim())) {
        return { ok: false, reason: 'bad_token', error: 'That link is missing part of its invitation — links get cut in half by some email apps. Ask your student for the 8-character code instead.' };
      }
      return { ok: true, token: token.trim(), code: null, kind: 'token' };
    }

    if (code) {
      const normalized = normalizeInviteCode(code);
      if (!normalized) {
        return { ok: false, reason: 'bad_code_in_url', error: "That link's invitation code isn't valid. Ask your student to send the invitation again." };
      }
      return { ok: true, token: null, code: normalized, kind: 'code' };
    }

    // A real URL with no invitation in it. Overwhelmingly this is the marketing page, our own
    // /parents page, or a sign-in link — i.e. the person pasted the wrong line out of the email.
    return { ok: false, reason: 'no_invite_in_url', error: "That link doesn't contain an invitation. Look for the 'Review this request' button in the email, or use the 8-character code." };
  }

  // A bare token, pasted without its URL. Rare but free to support.
  if (TOKEN_RE.test(raw)) return { ok: true, token: raw, code: null, kind: 'token' };

  const code = normalizeInviteCode(raw);
  if (code) return { ok: true, token: null, code, kind: 'code' };

  const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!cleaned) {
    return { ok: false, reason: 'malformed', error: 'Paste the link your student sent you, or type the 8-character code.' };
  }
  if (cleaned.length !== 8) {
    return {
      ok: false,
      reason: cleaned.length < 8 ? 'too_short' : 'too_long',
      error: `An invitation code is 8 characters — you have ${cleaned.length}. You can also just paste the whole link from the email.`,
    };
  }
  if (AMBIGUOUS.test(cleaned)) {
    return {
      ok: false,
      reason: 'ambiguous',
      error: 'Invitation codes never contain I, L, O, U, 0 or 1. Check for a 0 that should be an O — or paste the whole link instead.',
    };
  }
  return { ok: false, reason: 'malformed', error: "That doesn't look like an invitation code. Paste the whole link from the email instead." };
}

/** Four and four, which is how anybody reads eight characters. */
export const formatInviteCode = (code) => {
  const c = String(code || '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
};

/** Kept for the pre-0010 shape of the invitation link. */
export function inviteTokenFromUrl(search = window.location.search) {
  return inviteFromUrl(search).token;
}
