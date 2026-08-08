import { IdentityError, type FoundationRole, type IdentityPrincipal } from '@project-name/identity';
import { cookies } from 'next/headers';

import { getWebIdentity } from './catalog-runtime';

const catalogAdminCookieName = 'project_name_catalog_admin';

export interface CatalogAdminPrincipal extends IdentityPrincipal {
  readonly actorId: string;
  readonly kind: 'HUMAN';
  readonly roles: readonly FoundationRole[];
  readonly sessionId: string;
}

function isCatalogAdminPrincipal(principal: IdentityPrincipal): principal is CatalogAdminPrincipal {
  return (
    principal.actorId !== null &&
    principal.sessionId !== null &&
    principal.kind === 'HUMAN' &&
    principal.roles.some((role) => role === 'ADMIN' || role === 'OWNER')
  );
}

export async function readCatalogAdminPrincipal(): Promise<CatalogAdminPrincipal | null> {
  const store = await cookies();
  const token = store.get(catalogAdminCookieName)?.value;
  if (token === undefined) return null;
  try {
    const principal = await getWebIdentity().authenticate({ kind: 'synthetic-session', token });
    return isCatalogAdminPrincipal(principal) ? principal : null;
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

export async function requireCatalogAdminPrincipal(
  requiredRole?: 'ADMIN' | 'OWNER',
): Promise<CatalogAdminPrincipal> {
  const principal = await readCatalogAdminPrincipal();
  if (
    principal === null ||
    (requiredRole !== undefined && !principal.roles.includes(requiredRole))
  ) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  return principal;
}

export async function setCatalogAdminSession(token: string): Promise<CatalogAdminPrincipal> {
  const principal = await getWebIdentity().authenticate({ kind: 'synthetic-session', token });
  if (!isCatalogAdminPrincipal(principal)) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  const store = await cookies();
  store.set(catalogAdminCookieName, token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
  return principal;
}

export async function clearCatalogAdminSession(correlationId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(catalogAdminCookieName)?.value;
  store.delete(catalogAdminCookieName);
  if (token === undefined) return;
  await getWebIdentity()
    .revokeCredential({ kind: 'synthetic-session', token }, { correlationId })
    .catch(() => undefined);
}
