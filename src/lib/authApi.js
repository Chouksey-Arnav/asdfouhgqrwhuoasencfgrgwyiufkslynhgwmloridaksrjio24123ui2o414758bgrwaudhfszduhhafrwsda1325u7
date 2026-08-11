// Auth client. Talks to /api/auth/* (backed by Supabase + Nodemailer).
//
// Two ways in:
//   - Sign up:  sendSignupCode(email) -> verifySignupCode(email, code) -> completeSignup(email, verificationToken, password)
//   - Log in:   login(email, password)
// Password recovery (also used by legacy passwordless accounts to set their first password):
//   - sendResetCode(email) -> verifyResetCode(email, code) -> resetPassword(email, verificationToken, password)
const TOKEN_KEY = 'msp_session_token';
// Where the account-type choice waits out the Google redirect. sessionStorage, not localStorage:
// the choice is scoped to this one signup attempt, and a stale 'parent' left behind by an
// abandoned flow must never silently apply to a signup someone starts a week later. Cleared the
// moment it is read (see takePendingRole).
const SIGNUP_ROLE_KEY = 'msp_signup_role';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Remembers the account type across the Google OAuth redirect. */
export function stashPendingRole(role) {
  try { sessionStorage.setItem(SIGNUP_ROLE_KEY, role === 'parent' ? 'parent' : 'student'); } catch { /* private mode */ }
}

/** Reads and clears it. Returns 'student' when nothing was stashed — the safe default: a role is
 *  written once at account creation and never again, so guessing 'parent' would be unrecoverable
 *  while guessing 'student' is simply the ordinary signup. */
export function takePendingRole() {
  try {
    const role = sessionStorage.getItem(SIGNUP_ROLE_KEY);
    sessionStorage.removeItem(SIGNUP_ROLE_KEY);
    return role === 'parent' ? 'parent' : 'student';
  } catch { return 'student'; }
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
    // Lifted to the top level to match src/lib/parentApi.js, so a caller branching on WHY a
    // request failed never has to match on the wording of the message. It used to — LoginView
    // compared the error text against a sentence the server had long since reworded, so the one
    // piece of help on that screen had quietly stopped appearing.
    err.reason = data.reason;
    err.status = res.status;
    throw err;
  }
  return data;
}

const sendOtp = (email, purpose) => req('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) });
const verifyOtp = (email, code, purpose) => req('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code, purpose }) });

export const sendSignupCode = (email) => sendOtp(email, 'signup');
export const verifySignupCode = (email, code) => verifyOtp(email, code, 'signup');
export const completeSignup = (email, verificationToken, password, role = 'student') =>
  req('/auth/complete-signup', { method: 'POST', body: JSON.stringify({ email, verificationToken, password, role }) });

export const sendResetCode = (email) => sendOtp(email, 'password_reset');
export const verifyResetCode = (email, code) => verifyOtp(email, code, 'password_reset');
export const resetPassword = (email, verificationToken, password) =>
  req('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, verificationToken, password }) });

export const login = (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

// ── Sign in with an emailed code, no password ────────────────────────────────
//
// The way back in for a parent account created by the claim flow, which deliberately has no
// password (see api/parent/claim.js). Same three-step chain as signup and password reset — code
// out, code back, spend the proof — except the thing it buys is a session rather than a password.
//
// sendSigninCode always reports success, even for an address with no account, so it cannot be used
// to find out which emails are registered. That means a wrong address here looks exactly like a
// right one until the code never arrives, which is the correct trade: the alternative tells
// strangers who has an account.
export const sendSigninCode = (email) => sendOtp(email, 'signin');
export const verifySigninCode = (email, code) => verifyOtp(email, code, 'signin');
export const loginWithCode = (email, verificationToken) =>
  req('/auth/login', { method: 'POST', body: JSON.stringify({ email, verificationToken }) });

// Exchanges a Supabase Auth access token (minted by supabase.auth.signInWithOAuth in
// the browser, see src/lib/supabaseClient.js) for this app's own session token.
// `role` is honoured only when this sign-in CREATES the account — see api/auth/google.js. An
// existing account's role is never touched, so replaying this flow cannot escalate a student.
export const googleAuth = (accessToken, role = 'student') =>
  req('/auth/google', { method: 'POST', body: JSON.stringify({ accessToken, role }) });

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
