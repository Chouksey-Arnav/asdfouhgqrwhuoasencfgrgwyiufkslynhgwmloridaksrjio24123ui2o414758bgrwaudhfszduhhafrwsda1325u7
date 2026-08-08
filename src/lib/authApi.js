// Auth client. Talks to /api/auth/* (backed by Supabase + Nodemailer).
//
// Two ways in:
//   - Sign up:  sendSignupCode(email) -> verifySignupCode(email, code) -> completeSignup(email, verificationToken, password)
//   - Log in:   login(email, password)
// Password recovery (also used by legacy passwordless accounts to set their first password):
//   - sendResetCode(email) -> verifyResetCode(email, code) -> resetPassword(email, verificationToken, password)
const TOKEN_KEY = 'msp_session_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
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
    err.data = data;
    throw err;
  }
  return data;
}

const sendOtp = (email, purpose) => req('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) });
const verifyOtp = (email, code, purpose) => req('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code, purpose }) });

export const sendSignupCode = (email) => sendOtp(email, 'signup');
export const verifySignupCode = (email, code) => verifyOtp(email, code, 'signup');
export const completeSignup = (email, verificationToken, password) =>
  req('/auth/complete-signup', { method: 'POST', body: JSON.stringify({ email, verificationToken, password }) });

export const sendResetCode = (email) => sendOtp(email, 'password_reset');
export const verifyResetCode = (email, code) => verifyOtp(email, code, 'password_reset');
export const resetPassword = (email, verificationToken, password) =>
  req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, verificationToken, password }) });

export const login = (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

// Exchanges a Supabase Auth access token (minted by supabase.auth.signInWithOAuth in
// the browser, see src/lib/supabaseClient.js) for this app's own session token.
export const googleAuth = (accessToken) => req('/auth/google', { method: 'POST', body: JSON.stringify({ accessToken }) });

export const fetchMe = () => req('/auth/me', { method: 'GET' });
export const updateMe = (patch) => req('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
export const logout = () => req('/auth/logout', { method: 'POST' }).finally(clearToken);

// ── Data rights (see src/legal/privacy.js § 12) ──────────────────────────────
// The Privacy Policy tells users they can export and delete their data from the
// app. These are what make that true rather than aspirational.

/**
 * Everything the server holds for this account, as a JSON file the browser
 * saves. Deliberately not routed through `req()`: that helper parses the body
 * as JSON to surface API errors, and here the body IS the deliverable — we want
 * the bytes, not a parsed object, so a large export never gets materialised
 * twice just to be re-serialised.
 */
export async function exportMyData() {
  const token = getToken();
  const res = await fetch('/api/auth/account', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not export your data.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medschoolprep-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Irreversibly deletes the account and everything attached to it. The server
 * requires `confirmEmail` to match the session's email — see api/auth/account.js
 * for why. Clears the local token either way: if the account is gone, holding a
 * token for it only produces confusing 401s.
 */
export const deleteMyAccount = (confirmEmail) =>
  req('/auth/account', { method: 'DELETE', body: JSON.stringify({ confirmEmail }) }).finally(clearToken);
