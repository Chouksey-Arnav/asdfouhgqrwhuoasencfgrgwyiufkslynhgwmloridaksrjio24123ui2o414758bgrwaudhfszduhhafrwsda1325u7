// Client for /api/parent/* — the parent↔student link and the read-only progress summary.
//
// Kept separate from authApi.js on purpose: this is the only module in the app that both roles
// import, and having it in one file makes "what can a parent's session actually ask for" a
// question you answer by reading forty lines rather than by grepping.
import { getToken } from './authApi';

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

/** Invite the other side. `relationship` is a free-text label ("Mum", "Dad", "Guardian"). */
export const invite = (email, relationship) =>
  req('/links', { method: 'POST', body: JSON.stringify({ email, relationship }) });

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

/** Four and four, which is how anybody reads eight characters. */
export const formatInviteCode = (code) => {
  const c = String(code || '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
};

/** Kept for the pre-0010 shape of the invitation link. */
export function inviteTokenFromUrl(search = window.location.search) {
  return inviteFromUrl(search).token;
}
