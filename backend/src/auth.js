/* Passwords (scrypt) and session tokens (HMAC-signed, no extra packages). */
import crypto from 'node:crypto';
import { HttpError } from './util.js';

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return salt + ':' + hash;
}

export function verifyPassword(plain, stored) {
  if (!stored || stored.indexOf(':') === -1) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(plain), salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

const TOKEN_TTL_MS = 12 * 3600 * 1000;
let secret = null;
export function setSecret(s) { secret = s; }

const b64 = (buf) => Buffer.from(buf).toString('base64url');

export function signToken(user) {
  const payload = b64(JSON.stringify({ id: user.id, role: user.role, name: user.name, exp: Date.now() + TOKEN_TTL_MS }));
  const sig = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  return payload + '.' + sig;
}

export function readToken(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [payload, sig] = token.split('.');
  const want = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch (e) { return null; }
}

/* Attaches req.user when a valid Bearer token is present; never rejects */
export function attachUser(req, res, next) {
  const h = req.headers.authorization || '';
  req.user = h.indexOf('Bearer ') === 0 ? readToken(h.slice(7)) : null;
  next();
}

/* requireRole('operator') lets operators AND the owner in; requireRole('owner') is owner only */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Please sign in'));
    if (role === 'owner' && req.user.role !== 'owner') return next(new HttpError(403, 'Owner access only'));
    if (role === 'operator' && req.user.role !== 'operator' && req.user.role !== 'owner') return next(new HttpError(403, 'Staff access only'));
    next();
  };
}

/* Naive per-IP throttle for the login endpoint: 10 tries / 5 minutes */
const attempts = new Map();
export function loginThrottle(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const rec = (attempts.get(key) || []).filter((t) => now - t < 5 * 60000);
  if (rec.length >= 10) return next(new HttpError(429, 'Too many attempts — wait a few minutes'));
  rec.push(now);
  attempts.set(key, rec);
  next();
}
export function clearThrottle(req) { attempts.delete(req.ip); }
