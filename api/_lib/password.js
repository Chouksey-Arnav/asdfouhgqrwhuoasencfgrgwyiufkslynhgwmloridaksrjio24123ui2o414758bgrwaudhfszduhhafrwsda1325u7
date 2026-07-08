// Password hashing via Node's built-in scrypt (no extra dependency).
import crypto from 'crypto';

const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidate = crypto.scryptSync(password, salt, KEYLEN);
  return candidate.length === hashBuffer.length && crypto.timingSafeEqual(candidate, hashBuffer);
}
