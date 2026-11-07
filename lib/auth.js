const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const store = require('./store');
const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'mb_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
function send(res, status, payload) { return res.status(status).json(payload); }
function cookie(req) {
  const pair = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`));
  try { return pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : ''; }
  catch { return ''; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return req.headers['sec-fetch-site'] !== 'cross-site';
  try {
    const parsed = new URL(origin);
    return /^https?:$/.test(parsed.protocol) && parsed.host.toLowerCase() === String(req.headers.host || '').toLowerCase();
  } catch { return false; }
}
function setCookie(res, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || (process.env.NETLIFY === 'true' && process.env.NETLIFY_DEV !== 'true');
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, avatar: user.avatar, background: user.background, createdAt: user.createdAt });
async function rateLimit(req, action, maximum = 12) {
  const ip = req.clientIp || req.socket?.remoteAddress || 'unknown';
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  return store.incrementRateLimit(`${action}:${ipHash}:${bucket}`, new Date((bucket + 2) * 15 * 60 * 1000), maximum);
}
async function createSession(req, res, user) {
  const token = randomBytes(32).toString('base64url');
  await store.createSession({tokenHash: createHash('sha256').update(token).digest('hex'), userId: user._id, expiresAt: new Date(Date.now() + SESSION_TTL_MS)});
  setCookie(res, token, Math.floor(SESSION_TTL_MS / 1000));
}
async function currentUser(req) {
  const token = cookie(req);
  if (!token) return null;
  return store.userBySession(createHash('sha256').update(token).digest('hex'));
}
async function requireUser(req, res) {
  const user = await currentUser(req);
  if (!user) { send(res, 401, {ok:false, error:'Please sign in to continue.'}); return null; }
  return user;
}
async function hashPassword(password, salt = randomBytes(16)) {
  const key = await scrypt(password, salt, 64, {N:1 << 15, r:8, p:1, maxmem:64 * 1024 * 1024});
  return {passwordSalt:salt.toString('base64url'), passwordHash:key.toString('base64url')};
}
async function checkPassword(password, user) {
  const salt = Buffer.from(user.passwordSalt, 'base64url');
  const expected = Buffer.from(user.passwordHash, 'base64url');
  const actual = await scrypt(password, salt, expected.length, {N:1 << 15, r:8, p:1, maxmem:64 * 1024 * 1024});
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
module.exports = {cookie, send, sameOrigin, rateLimit, createSession, currentUser, hashPassword, checkPassword, publicUser, setCookie, SESSION_COOKIE, requireUser};
