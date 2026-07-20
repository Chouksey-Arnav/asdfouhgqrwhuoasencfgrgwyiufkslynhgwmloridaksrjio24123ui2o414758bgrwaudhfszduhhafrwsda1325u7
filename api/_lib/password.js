// Password hashing for the custom email/password auth model. Uses Node's built-in
// scrypt (no native/npm dependency needed — safe for Vercel serverless) rather than
// bcrypt. Stored format: scrypt$N$r$p$<saltHex>$<hashHex>.
import crypto from 'crypto';

const KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const MAX_SCRYPT_MEM = 64 * 1024 * 1024; // N*r*128*2 for N=16384,r=8 ≈ 33.5MB; headroom for the default 32MB cap

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, KEYLEN, { ...SCRYPT_PARAMS, maxmem: MAX_SCRYPT_MEM }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
    const [, N, r, p, saltHex, hashHex] = parts;
    let salt, expected;
    try {
      salt = Buffer.from(saltHex, 'hex');
      expected = Buffer.from(hashHex, 'hex');
    } catch {
      return resolve(false);
    }
    crypto.scrypt(password, salt, expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: MAX_SCRYPT_MEM }, (err, derivedKey) => {
      if (err) return resolve(false);
      resolve(derivedKey.length === expected.length && crypto.timingSafeEqual(derivedKey, expected));
    });
  });
}

// Mirrors the client-side check in src/components/auth/ui.jsx (passwordIssues) so
// server and UI never disagree about what counts as a valid password.
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Password must be under ${PASSWORD_MAX} characters.`;
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}
