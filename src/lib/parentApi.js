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

/**
 * What an invitation says, without redeeming it. This is what makes the accept screen a consent
 * moment instead of a fait accompli — see the header of api/parent/accept.js.
 */
export const previewInvite = (token) =>
  req('/accept', { method: 'POST', body: JSON.stringify({ token, preview: 1 }) });

export const acceptInvite = (token) =>
  req('/accept', { method: 'POST', body: JSON.stringify({ token }) });

/** Progress for every connected student, or for one of them. Parent sessions only. */
export const fetchSummaries = () => req('/summary', { method: 'GET' });
export const fetchSummary = (studentId) =>
  req(`/summary?studentId=${encodeURIComponent(studentId)}`, { method: 'GET' });

/** The invite token in the current URL, if this page load came from an invitation email. */
export function inviteTokenFromUrl(search = window.location.search) {
  const token = new URLSearchParams(search).get('token');
  return token && /^[0-9a-f]{64}$/i.test(token) ? token : null;
}
