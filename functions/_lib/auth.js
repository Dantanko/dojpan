import { hmacSha512Hex, timingSafeEqual } from './util.js';

const COOKIE = 'dojadm', TTL = 12 * 3600;

// Admin is closed unless ADMIN_PASSWORD is set to a long passphrase (12+ characters).
export const adminConfigured = (env) => typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 12;

export async function passwordOk(env, given) {
  if (!adminConfigured(env)) return false;
  const [a, b] = await Promise.all([hmacSha512Hex('dojpw', String(given || '')), hmacSha512Hex('dojpw', env.ADMIN_PASSWORD)]);
  return timingSafeEqual(a, b);
}
export async function makeCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const sig = await hmacSha512Hex(env.ADMIN_PASSWORD, 'adm.' + exp);
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(request, env) {
  if (!adminConfigured(env)) return false;
  const m = (request.headers.get('cookie') || '').match(new RegExp(COOKIE + '=(\\d+)\\.([0-9a-f]+)'));
  if (!m || +m[1] < Date.now() / 1000) return false;
  return timingSafeEqual(m[2], await hmacSha512Hex(env.ADMIN_PASSWORD, 'adm.' + m[1]));
}
// Browsers always send Origin on POST. Require it to match this site (blocks cross-site requests).
export const sameOrigin = (request) => request.headers.get('origin') === new URL(request.url).origin;
