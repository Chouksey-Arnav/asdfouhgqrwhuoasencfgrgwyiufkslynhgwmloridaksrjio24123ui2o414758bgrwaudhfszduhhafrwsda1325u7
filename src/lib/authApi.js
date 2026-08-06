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
