import { IdentityError, type FoundationRole, type IdentityPrincipal } from '@project-name/identity';
import { cookies } from 'next/headers';

import { getWebIdentity } from './catalog-runtime';

const requestAdminCookieName = 'project_name_catalog_admin';

export interface RequestAdminPrincipal extends IdentityPrincipal {
  readonly actorId: string;
  readonly kind: 'HUMAN';
  readonly roles: readonly FoundationRole[];
  readonly sessionId: string;
}

function isRequestAdminPrincipal(principal: IdentityPrincipal): principal is RequestAdminPrincipal {
  return (
    principal.actorId !== null &&
    principal.sessionId !== null &&
    principal.kind === 'HUMAN' &&
    principal.roles.some((role) => ['MANAGER', 'ADMIN', 'OWNER'].includes(role))
  );
}

export function requestAdminRole(principal: RequestAdminPrincipal): 'MANAGER' | 'ADMIN' | 'OWNER' {
  if (principal.roles.includes('OWNER')) return 'OWNER';
  if (principal.roles.includes('ADMIN')) return 'ADMIN';
  return 'MANAGER';
}

export async function readRequestAdminPrincipal(): Promise<RequestAdminPrincipal | null> {
  const token = (await cookies()).get(requestAdminCookieName)?.value;
  if (token === undefined) return null;
  try {
    const principal = await getWebIdentity().authenticate({ kind: 'synthetic-session', token });
    return isRequestAdminPrincipal(principal) ? principal : null;
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

export async function requireRequestAdminPrincipal(): Promise<RequestAdminPrincipal> {
  const principal = await readRequestAdminPrincipal();
  if (principal === null) throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  return principal;
}

export async function setRequestAdminSession(token: string): Promise<RequestAdminPrincipal> {
  const principal = await getWebIdentity().authenticate({ kind: 'synthetic-session', token });
  if (!isRequestAdminPrincipal(principal)) throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  (await cookies()).set(requestAdminCookieName, token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
  return principal;
}

export async function clearRequestAdminSession(): Promise<void> {
  (await cookies()).delete(requestAdminCookieName);
}
