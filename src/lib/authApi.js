// Email + OTP auth client. Talks to /api/auth/* (backed by Supabase + Nodemailer).
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
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const sendOtp = (email) => req('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
export const verifyOtp = (email, code) => req('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) });
export const fetchMe = () => req('/auth/me', { method: 'GET' });
export const updateMe = (patch) => req('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
export const logout = () => req('/auth/logout', { method: 'POST' }).finally(clearToken);
