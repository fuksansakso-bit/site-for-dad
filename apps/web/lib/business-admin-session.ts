import { IdentityError } from '@project-name/identity';

import { requestAdminRole, requireRequestAdminPrincipal } from './request-admin-session';

export async function requireBusinessAdminPrincipal() {
  const principal = await requireRequestAdminPrincipal();
  const role = requestAdminRole(principal);
  if (role === 'MANAGER') throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  return { principal, role } as const;
}
