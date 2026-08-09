import { IdentityError } from '@project-name/identity';
import type {
  PasswordlessSessionPrincipal,
  PasswordlessVerificationResult,
} from '@project-name/identity/passwordless';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

import { getWebPasswordlessIdentity } from './catalog-runtime';

export const staffSessionCookieName = 'project_name_staff';

export function authClientBucket(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'loopback';
  const agent = request.headers.get('user-agent')?.slice(0, 160) ?? 'unknown';
  return createHash('sha256').update(`${forwarded}\0${agent}`).digest('hex');
}

export function assertSameOriginAuthRequest(request: NextRequest): void {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol =
    request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.slice(0, -1);
  const expectedOrigin = host === null ? null : `${protocol}://${host}`;
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  const lengthHeader = request.headers.get('content-length');
  const length = lengthHeader === null ? null : Number(lengthHeader);
  if (
    origin !== expectedOrigin ||
    contentType !== 'application/json' ||
    (length !== null && (!Number.isSafeInteger(length) || length < 2 || length > 8_192))
  ) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
}

export function setPasswordlessSession(
  response: NextResponse,
  result: PasswordlessVerificationResult,
): void {
  response.cookies.set(staffSessionCookieName, result.credential.token, {
    httpOnly: true,
    maxAge: 12 * 60 * 60,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
}

export function clearPasswordlessSession(response: NextResponse): void {
  response.cookies.set(staffSessionCookieName, '', {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
}

export async function readStaffPrincipal(): Promise<PasswordlessSessionPrincipal | null> {
  const token = (await cookies()).get(staffSessionCookieName)?.value;
  if (token === undefined) return null;
  try {
    return await getWebPasswordlessIdentity().authenticateSession({ kind: 'STAFF', token });
  } catch (error) {
    if (
      error instanceof IdentityError &&
      ['IDENTITY_AUTHENTICATION_REQUIRED', 'IDENTITY_PERMISSION_DENIED'].includes(error.code)
    ) {
      return null;
    }
    throw error;
  }
}

export async function requireStaffPrincipal(): Promise<PasswordlessSessionPrincipal> {
  const principal = await readStaffPrincipal();
  if (principal === null) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
  return principal;
}

export async function readRequestCredential(
  request: NextRequest,
): Promise<{ kind: 'STAFF'; token: string } | null> {
  const token = request.cookies.get(staffSessionCookieName)?.value;
  return token === undefined ? null : { kind: 'STAFF', token };
}
