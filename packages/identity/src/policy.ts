import { IdentityError } from './errors.js';
import {
  foundationCapabilities,
  foundationRoles,
  type FoundationRole,
  type IdentityPrincipal,
  type PermissionDecision,
  type PermissionRequest,
} from './types.js';

const capabilityRoles = {
  'foundation.audit.read': ['ADMIN', 'OWNER'],
  'foundation.identity.self_read': ['CUSTOMER', 'MANAGER', 'ADMIN', 'OWNER'],
  'foundation.public.read': [...foundationRoles],
  'foundation.role.manage': ['ADMIN', 'OWNER'],
  'foundation.system.execute': ['SYSTEM_WORKER'],
} as const satisfies Record<(typeof foundationCapabilities)[number], readonly FoundationRole[]>;

export const guestPrincipal: IdentityPrincipal = Object.freeze({
  actorId: null,
  kind: 'ANONYMOUS',
  roles: ['GUEST'] as const,
  sessionId: null,
});

function isPrincipalShapeValid(principal: IdentityPrincipal): boolean {
  const roles = new Set(principal.roles);
  if (
    roles.size !== principal.roles.length ||
    principal.roles.some((role) => !foundationRoles.includes(role))
  ) {
    return false;
  }
  if (principal.kind === 'ANONYMOUS') {
    return (
      principal.actorId === null &&
      principal.sessionId === null &&
      roles.size === 1 &&
      roles.has('GUEST')
    );
  }
  if (principal.actorId === null || principal.sessionId === null || roles.size === 0) return false;
  if (principal.kind === 'WORKLOAD') {
    return roles.size === 1 && roles.has('SYSTEM_WORKER');
  }
  return !roles.has('GUEST') && !roles.has('SYSTEM_WORKER');
}

export function authorizePermission(request: PermissionRequest): PermissionDecision {
  if (!isPrincipalShapeValid(request.principal)) {
    return { outcome: 'DENY', reasonCode: 'INVALID_PRINCIPAL' };
  }
  if (
    !foundationCapabilities.includes(request.capability as (typeof foundationCapabilities)[number])
  ) {
    return { outcome: 'DENY', reasonCode: 'CAPABILITY_UNKNOWN' };
  }
  const capability = request.capability as (typeof foundationCapabilities)[number];
  if (!capabilityRoles[capability].some((role) => request.principal.roles.includes(role))) {
    return { outcome: 'DENY', reasonCode: 'ROLE_DENIED' };
  }
  if (
    capability === 'foundation.identity.self_read' &&
    request.resource?.ownerActorId !== request.principal.actorId
  ) {
    return { outcome: 'DENY', reasonCode: 'OBJECT_SCOPE_DENIED' };
  }
  return { outcome: 'ALLOW', reasonCode: 'CAPABILITY_ALLOWED' };
}

export function requirePermission(request: PermissionRequest): void {
  if (authorizePermission(request).outcome !== 'ALLOW') {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
}
