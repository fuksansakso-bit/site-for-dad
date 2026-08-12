import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { cookies } from 'next/headers';

const GUEST_COOKIE = 'project_ai_guest';
const GUEST_TOKEN_PATTERN = /^[0-9a-f]{64}$/u;
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type AiGuestSession = { hash: string };

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashAiIdempotencyKey(guestSessionHash: string, key: string): string {
  return hash(`${guestSessionHash}\u0000${key}`);
}

export async function getAiGuestSession(): Promise<AiGuestSession | null> {
  const store = await cookies();
  const token = store.get(GUEST_COOKIE)?.value;
  return token && GUEST_TOKEN_PATTERN.test(token) ? { hash: hash(token) } : null;
}

export async function getOrCreateAiGuestSession(): Promise<AiGuestSession> {
  const existing = await getAiGuestSession();
  if (existing) return existing;
  const token = randomBytes(32).toString('hex');
  const store = await cookies();
  store.set(GUEST_COOKIE, token, {
    httpOnly: true,
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
  return { hash: hash(token) };
}

function forwardedAddress(request: Request): string | null {
  const candidate =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    null;
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

export function getDailyIpHash(request: Request, guestSessionHash: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const address = forwardedAddress(request) ?? `unknown:${guestSessionHash}`;
  const serverSalt =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['POLZA_AI_API_KEY'] || 'disabled';
  return hash(`${date}\u0000${address}\u0000${serverSalt}`);
}
